'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import ErrorBoundary from '@/app/components/ErrorBoundary'
import DailyPlanCard from '@/app/components/DailyPlanCard'
import { MeasurementSchedule, GeocodeResponse, DistanceOutlier } from '@/app/lib/types'
import { useLanguage } from '@/app/lib/i18n/LanguageContext'
import { translateError } from '@/app/lib/i18n/translations'
import { formatDateToISO, formatDuration } from '@/app/lib/utils'

const RouteMap = dynamic(() => import('@/app/components/RouteMap'), { ssr: false })

export default function Schedule() {
  const router = useRouter()
  const { t, locale } = useLanguage()
  const [schedule, setSchedule] = useState<MeasurementSchedule | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [selectedDateIndex, setSelectedDateIndex] = useState(0)
  const [mapVisible, setMapVisible] = useState(true)
  const [geocodeResults, setGeocodeResults] = useState<GeocodeResponse | null>(null)
  const [outliers, setOutliers] = useState<DistanceOutlier[]>([])

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
          const parsed = JSON.parse(storedSchedule)
          // Parse dates back to Date objects. Plan dates were anchored at the
          // server's midnight (UTC on Vercel): re-anchor the calendar day at
          // LOCAL midnight so evening-vs-UTC offsets can't shift the day shown.
          const withDates = {
            ...parsed,
            dailyPlans: parsed.dailyPlans.map((plan: any) => ({
              ...plan,
              date: new Date(String(plan.date).slice(0, 10) + 'T00:00:00'),
              stops: plan.stops.map((stop: any) => ({
                ...stop,
                measurements: {
                  ...stop.measurements,
                  // Same local re-anchoring as plan.date: these are calendar
                  // days serialized from the server's midnight.
                  measurementDate: new Date(String(stop.measurements.measurementDate).slice(0, 10) + 'T00:00:00'),
                  deadlineDate: new Date(String(stop.measurements.deadlineDate).slice(0, 10) + 'T00:00:00'),
                },
              })),
            })),
            generatedAt: new Date(parsed.generatedAt),
          }
          setSchedule(withDates)
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

        {/* General map with day filter (US4: one day at a time, FR-020/021/022/024) */}
        <section className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              {t('results.mapHeading')}
            </h3>
            <button onClick={() => setMapVisible((v) => !v)} className="button-secondary text-sm">
              {mapVisible ? t('schedule.hideMap') : t('schedule.showMap')}
            </button>
          </div>

          {mapVisible && (
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Day filter: horizontal scrollable chips on mobile, side panel on desktop */}
              <div className="lg:w-56 shrink-0">
                <p className="hidden lg:block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                  {t('schedule.daysFilter')}
                </p>
                <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
                  {schedule.dailyPlans.map((plan, idx) => (
                    <button
                      key={plan.id}
                      onClick={() => setSelectedDateIndex(idx)}
                      className={`px-3 py-2 rounded-lg border text-sm font-medium whitespace-nowrap text-left transition-colors ${
                        selectedDateIndex === idx
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400'
                      }`}
                    >
                      📅 {plan.date.toLocaleDateString(locale, { weekday: 'short' })}{' '}
                      {formatDateToISO(plan.date)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Map: shows only the selected day's round-trip route */}
              <div className="flex-1 card bg-slate-100 dark:bg-slate-800 flex items-center justify-center min-h-[400px] relative">
                {(() => {
                  const plan = schedule.dailyPlans[selectedDateIndex]
                  // Every plan (optimized or fallback) carries its round-trip
                  // route — render it exactly like the results page does.
                  if (!plan?.route || plan.route.waypoints.length === 0) {
                    return (
                      <div className="text-center text-slate-500 dark:text-slate-400">
                        ⚠️ {t('schedule.noStops')}
                      </div>
                    )
                  }
                  return (
                    <RouteMap
                      // Remount per day so the map re-fits its bounds to the
                      // newly selected day's full route (FR-024).
                      key={plan.id}
                      route={{
                        ...plan.route,
                        addressListId: 'schedule',
                        calculatedAt: new Date(),
                      }}
                    />
                  )
                })()}
              </div>
            </div>
          )}
        </section>

        {/* All days, always fully expanded (FR-023); clicking a day's header
            selects it on the map and in the filter (FR-025) */}
        <section className="space-y-4">
          {schedule.dailyPlans.map((plan, idx) => (
            <DailyPlanCard
              key={plan.id}
              plan={plan}
              selected={selectedDateIndex === idx}
              onSelect={() => setSelectedDateIndex(idx)}
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
