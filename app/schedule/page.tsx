'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ErrorBoundary from '@/app/components/ErrorBoundary'
import DailyPlanCard from '@/app/components/DailyPlanCard'
import { MeasurementSchedule, GeocodeResponse, DistanceOutlier, DailyPlan, DailyStop } from '@/app/lib/types'
import { useLanguage } from '@/app/lib/i18n/LanguageContext'
import { translateError } from '@/app/lib/i18n/translations'
import { formatDateToISO, formatDuration } from '@/app/lib/utils'

// Dates come back from the API anchored at the server's midnight (UTC on
// Vercel): re-anchor every calendar day at LOCAL midnight instead, so an
// evening-vs-UTC offset can't shift the day shown. Shared by the initial
// load and by handleMoveStop's per-day recompute.
function parsePlanDates(plan: any): DailyPlan {
  return {
    ...plan,
    date: new Date(String(plan.date).slice(0, 10) + 'T00:00:00'),
    stops: plan.stops.map((stop: any) => ({
      ...stop,
      measurements: {
        ...stop.measurements,
        measurementDate: new Date(String(stop.measurements.measurementDate).slice(0, 10) + 'T00:00:00'),
        deadlineDate: new Date(String(stop.measurements.deadlineDate).slice(0, 10) + 'T00:00:00'),
      },
    })),
  }
}

function parseScheduleResponse(parsed: any): MeasurementSchedule {
  return {
    ...parsed,
    dailyPlans: parsed.dailyPlans.map(parsePlanDates),
    generatedAt: new Date(parsed.generatedAt),
  }
}

function recomputeMetadata(dailyPlans: DailyPlan[]): MeasurementSchedule['metadata'] {
  return {
    totalDistance: dailyPlans.reduce((sum, p) => sum + p.metrics.totalDistance, 0),
    totalDuration: dailyPlans.reduce((sum, p) => sum + p.metrics.totalDuration, 0),
    totalAddresses: dailyPlans.reduce((sum, p) => sum + p.stops.length, 0),
    addressesOnDeadline: dailyPlans.reduce(
      (sum, p) => sum + p.stops.filter((s) => s.measurements.daysUntilDeadline <= 1).length,
      0
    ),
  }
}

export default function Schedule() {
  const router = useRouter()
  const { t, locale } = useLanguage()
  const [schedule, setSchedule] = useState<MeasurementSchedule | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [mapVisible, setMapVisible] = useState(true)
  const [geocodeResults, setGeocodeResults] = useState<GeocodeResponse | null>(null)
  const [outliers, setOutliers] = useState<DistanceOutlier[]>([])
  const [moving, setMoving] = useState(false)
  const [moveError, setMoveError] = useState('')

  useEffect(() => {
    const loadSchedule = async () => {
      try {
        // Load geocode results to warn about addresses excluded from the plan
        const storedResults = sessionStorage.getItem('geocodeResults')
        if (storedResults) {
          try {
            setGeocodeResults(JSON.parse(storedResults))
          } catch {
            // Ignore: the warning banner is best-effort
          }
        }

        // Load the distance-outlier warning computed at submission time (the
        // form showed it briefly before navigating away) so it survives here.
        const storedOutliers = sessionStorage.getItem('addressOutliers')
        if (storedOutliers) {
          try {
            setOutliers(JSON.parse(storedOutliers))
          } catch {
            // Ignore: the warning banner is best-effort
          }
        }

        // Load schedule from sessionStorage
        const storedSchedule = sessionStorage.getItem('schedule')
        if (storedSchedule) {
          setSchedule(parseScheduleResponse(JSON.parse(storedSchedule)))
          setLoading(false)
          return
        }

        // No schedule in sessionStorage - redirect to home
        router.push('/')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load schedule')
        setLoading(false)
      }
    }

    loadSchedule()
  }, [router])

  // Moves one stop to a different (already-validated) day — surgically:
  // only the source day (recomputed, or dropped entirely if the moved stop
  // was its last one) and the target day are recalculated via OSRM. Every
  // other day's DailyPlan is left completely untouched, so a move never
  // reshuffles stops the user didn't ask to move. The stop's own
  // measurementDate/deadlineDate are unchanged (the target was already
  // inside that window — that's why it was offered).
  const handleMoveStop = async (addressId: string, targetDateISO: string) => {
    if (!schedule) return
    const sourcePlan = schedule.dailyPlans.find((p) => p.stops.some((s) => s.addressId === addressId))
    const movedStop = sourcePlan?.stops.find((s) => s.addressId === addressId)
    if (!sourcePlan || !movedStop) return

    setMoving(true)
    setMoveError('')

    try {
      const startWaypoint = schedule.dailyPlans
        .flatMap((p) => p.route?.waypoints ?? [])
        .find((wp) => wp.isStartPoint)
      const startEntry = startWaypoint
        ? {
            id: 'start',
            isStartPoint: true,
            geocodedCoords: { lat: startWaypoint.lat, lon: startWaypoint.lon, displayName: startWaypoint.displayName },
          }
        : undefined

      const toAddressEntry = (stop: DailyStop) => ({
        id: stop.addressId,
        isStartPoint: false,
        text: stop.address.text,
        geocodedCoords: { lat: stop.address.lat, lon: stop.address.lon, displayName: stop.address.displayName },
        reference: stop.reference,
        measurementDate: formatDateToISO(stop.measurements.measurementDate),
        deadlineDate: formatDateToISO(stop.measurements.deadlineDate),
      })

      const fetchDayPlan = async (dateISO: string, stops: DailyStop[]): Promise<DailyPlan> => {
        const response = await fetch('/api/schedule/day', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: dateISO,
            addresses: [...(startEntry ? [startEntry] : []), ...stops.map(toAddressEntry)],
            constraints: schedule.constraints,
          }),
        })
        if (!response.ok) throw new Error('day recompute failed')
        const { plan } = await response.json()
        return parsePlanDates(plan)
      }

      const sourceDateISO = formatDateToISO(sourcePlan.date)
      const remainingSourceStops = sourcePlan.stops.filter((s) => s.addressId !== addressId)
      const targetPlanExisting = schedule.dailyPlans.find((p) => formatDateToISO(p.date) === targetDateISO)
      const targetStops = [...(targetPlanExisting?.stops ?? []), movedStop]

      // Source day is dropped entirely (not recomputed) once it has no
      // stops left — nothing to route, nothing to show.
      const newSourcePlan =
        remainingSourceStops.length > 0 ? await fetchDayPlan(sourceDateISO, remainingSourceStops) : null
      const newTargetPlan = await fetchDayPlan(targetDateISO, targetStops)

      const untouchedPlans = schedule.dailyPlans.filter(
        (p) => formatDateToISO(p.date) !== sourceDateISO && formatDateToISO(p.date) !== targetDateISO
      )
      const nextDailyPlans = [...untouchedPlans, ...(newSourcePlan ? [newSourcePlan] : []), newTargetPlan].sort(
        (a, b) => a.date.getTime() - b.date.getTime()
      )

      const updated: MeasurementSchedule = {
        ...schedule,
        dailyPlans: nextDailyPlans,
        metadata: recomputeMetadata(nextDailyPlans),
      }

      setSchedule(updated)
      sessionStorage.setItem('schedule', JSON.stringify(updated))
    } catch {
      setMoveError(t('schedule.moveError'))
    } finally {
      setMoving(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12">{t('results.loading')}</div>
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <button onClick={() => router.push('/')} className="button-secondary mt-4">
          {t('results.editAddressesButton')}
        </button>
      </div>
    )
  }

  if (!schedule) {
    return <div className="text-center py-12">{t('results.loading')}</div>
  }

  return (
    <ErrorBoundary>
      <div className="space-y-8">
        {/* Header */}
        <section className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              {t('schedule.title')}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              {t('schedule.generatedAt')} {new Date(schedule.generatedAt).toLocaleString()}
            </p>
          </div>
          <button onClick={() => router.push('/')} className="button-secondary">
            {t('results.editAddressesButton')}
          </button>
        </section>

        {/* Summary Metrics */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{t('schedule.totalAddresses')}</p>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {schedule.metadata.totalAddresses}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{t('schedule.totalDistance')}</p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {(schedule.metadata.totalDistance / 1000).toFixed(1)} km
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{t('schedule.totalDuration')}</p>
            <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
              {formatDuration(schedule.metadata.totalDuration)}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{t('schedule.daysScheduled')}</p>
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {schedule.dailyPlans.length}
            </p>
          </div>
        </section>

        {/* Warnings — shown only when there is at least one */}
        {((geocodeResults?.invalidCount ?? 0) > 0 || outliers.length > 0) && (
          <section className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg space-y-3">
            {geocodeResults && geocodeResults.invalidCount > 0 && (
              <div>
                <p className="font-semibold text-yellow-800 dark:text-yellow-300">
                  ⚠️ {t('schedule.invalidAddressesWarning', { count: geocodeResults.invalidCount })}
                </p>
                <ul className="mt-2 space-y-1">
                  {geocodeResults.results
                    .filter((r) => r.status === 'invalid')
                    .map((r) => (
                      <li key={r.id} className="text-sm text-yellow-700 dark:text-yellow-400">
                        ✗ {translateError(t, r.errorCode, r.error)}
                      </li>
                    ))}
                </ul>
              </div>
            )}

            {outliers.length > 0 && (
              <div>
                <p className="font-semibold text-yellow-800 dark:text-yellow-300">
                  {t('addressForm.outlierWarning', {
                    addresses: outliers.map((o) => `${o.label} (${Math.round(o.nearestKm)} km)`).join(' · '),
                  })}
                </p>
              </div>
            )}
          </section>
        )}

        {/* Day filter: anchor links that jump straight to each day's own
            section below (each day keeps its own map + itinerary) */}
        <section className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              {t('schedule.daysFilter')}
            </p>
            <button onClick={() => setMapVisible((v) => !v)} className="button-secondary text-sm">
              {mapVisible ? t('schedule.hideMap') : t('schedule.showMap')}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {schedule.dailyPlans.map((plan) => (
              <a
                key={plan.id}
                href={`#day-${formatDateToISO(plan.date)}`}
                className="px-3 py-2 rounded-lg border text-sm font-medium whitespace-nowrap border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                📅 {plan.date.toLocaleDateString(locale, { weekday: 'short' })}{' '}
                {formatDateToISO(plan.date)}
              </a>
            ))}
          </div>
        </section>

        {moveError && <p className="error-message">{moveError}</p>}

        {/* All days, always fully expanded (FR-023); each keeps its own map
            (when mapVisible) directly above its itinerary */}
        <section className="space-y-4">
          {schedule.dailyPlans.map((plan) => (
            <DailyPlanCard
              key={plan.id}
              plan={plan}
              mapVisible={mapVisible}
              workingDays={schedule.constraints.workingDays}
              onMoveStop={handleMoveStop}
              moving={moving}
            />
          ))}
        </section>

        {/* Constraints Info */}
        <section className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
            {t('schedule.constraints')}
          </h3>
          <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
            <li>
              • {t('schedule.maxStopsPerDay')}: {schedule.constraints.maxStopsPerDay}
              {schedule.constraints.absoluteMaxStopsPerDay > schedule.constraints.maxStopsPerDay &&
                ` ${t('schedule.upToIfNeeded', { max: schedule.constraints.absoluteMaxStopsPerDay })}`}
            </li>
            <li>
              • {t('schedule.workingDays')}:{' '}
              {schedule.constraints.workingDays
                // 2024-01-01 is a Monday, so UTC day d of Jan 2024 = ISO weekday d
                .map((d) =>
                  new Date(Date.UTC(2024, 0, d)).toLocaleDateString(locale, {
                    weekday: 'long',
                    timeZone: 'UTC',
                  })
                )
                .join(', ')}
            </li>
            <li>• {t('schedule.priority')}: {t('schedule.deadlineFirstGrouping')}</li>
            <li>• {t('schedule.routeOptimization')}: {t('schedule.viaOSRM')}</li>
          </ul>
        </section>

        {/* Action Buttons */}
        <section className="flex gap-3 justify-center">
          <button
            // Keep 'addresses'/'addressTexts' in sessionStorage: the form uses
            // them to restore the entered addresses AND their dates (FR-006).
            onClick={() => router.push('/')}
            className="button-secondary"
          >
            {t('results.editAddressesButton')}
          </button>
          <button onClick={() => window.print()} className="button-secondary">
            {t('results.printButton')}
          </button>
        </section>
      </div>
    </ErrorBoundary>
  )
}
