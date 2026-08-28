'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import ErrorBoundary from '@/app/components/ErrorBoundary'
import DailyPlanCard from '@/app/components/DailyPlanCard'
import { MeasurementSchedule } from '@/app/lib/types'
import { useLanguage } from '@/app/lib/i18n/LanguageContext'
import { formatDateToISO } from '@/app/lib/utils'

const RouteMap = dynamic(() => import('@/app/components/RouteMap'), { ssr: false })

export default function Schedule() {
  const router = useRouter()
  const { t } = useLanguage()
  const [schedule, setSchedule] = useState<MeasurementSchedule | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [selectedDateIndex, setSelectedDateIndex] = useState(0)
  const [startPoint, setStartPoint] = useState<{ lat: number; lon: number; displayName: string } | null>(null)

  useEffect(() => {
    const loadSchedule = async () => {
      try {
        // Load start point from addresses
        const storedAddresses = sessionStorage.getItem('addresses')
        if (storedAddresses) {
          const addresses = JSON.parse(storedAddresses)
          const startAddr = addresses[0]
          if (startAddr?.geocodedCoords) {
            setStartPoint({
              lat: startAddr.geocodedCoords.lat,
              lon: startAddr.geocodedCoords.lon,
              displayName: startAddr.geocodedCoords.displayName,
            })
          }
        }

        // Load schedule from sessionStorage
        const storedSchedule = sessionStorage.getItem('schedule')
        if (storedSchedule) {
          const parsed = JSON.parse(storedSchedule)
          // Parse dates back to Date objects
          const withDates = {
            ...parsed,
            dailyPlans: parsed.dailyPlans.map((plan: any) => ({
              ...plan,
              date: new Date(plan.date),
              stops: plan.stops.map((stop: any) => ({
                ...stop,
                measurements: {
                  ...stop.measurements,
                  measurementDate: new Date(stop.measurements.measurementDate),
                  deadlineDate: new Date(stop.measurements.deadlineDate),
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
              {Math.round(schedule.metadata.totalDuration / 3600)}h {Math.round((schedule.metadata.totalDuration % 3600) / 60)}m
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{t('schedule.daysScheduled')}</p>
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {schedule.dailyPlans.length}
            </p>
          </div>
        </section>

        {/* Daily Plans with Map */}
        <section className="space-y-4">
          {/* Date Tabs */}
          <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-700">
            {schedule.dailyPlans.map((plan, idx) => (
              <button
                key={plan.id}
                onClick={() => setSelectedDateIndex(idx)}
                className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                  selectedDateIndex === idx
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                📅 {formatDateToISO(plan.date)}
              </button>
            ))}
          </div>

          {/* Map and Plan */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Map */}
            <div className="lg:col-span-2 card bg-slate-100 dark:bg-slate-800 flex items-center justify-center min-h-[400px]">
              {startPoint ? (() => {
                const plan = schedule.dailyPlans[selectedDateIndex]

                // Create complete round-trip route: start → stops → start
                const allWaypoints = [
                  {
                    id: 'start',
                    routeId: plan.id,
                    originalAddressId: 'start',
                    sequence: 0,
                    lat: startPoint.lat,
                    lon: startPoint.lon,
                    displayName: startPoint.displayName,
                    isStartPoint: true,
                    isEndPoint: false,
                  },
                  ...plan.stops.map((stop, idx) => ({
                    id: stop.id,
                    routeId: plan.id,
                    originalAddressId: stop.addressId,
                    sequence: idx + 1,
                    lat: stop.address.lat,
                    lon: stop.address.lon,
                    displayName: stop.address.displayName,
                    isStartPoint: false,
                    isEndPoint: false,
                  })),
                  {
                    id: 'end',
                    routeId: plan.id,
                    originalAddressId: 'end',
                    sequence: plan.stops.length + 1,
                    lat: startPoint.lat,
                    lon: startPoint.lon,
                    displayName: startPoint.displayName,
                    isStartPoint: false,
                    isEndPoint: true,
                  },
                ]

                // Create segments between consecutive waypoints
                const segments = []
                for (let i = 0; i < allWaypoints.length - 1; i++) {
                  segments.push({
                    id: `seg-${i}`,
                    routeId: plan.id,
                    fromWaypoint: allWaypoints[i].id,
                    toWaypoint: allWaypoints[i + 1].id,
                    sequence: i + 1,
                    distance: 5000, // Mock distance per segment
                    duration: 600, // Mock 10min per segment
                  })
                }

                const route = {
                  id: plan.id,
                  addressListId: 'schedule',
                  calculatedAt: new Date(),
                  waypoints: allWaypoints as any,
                  segments: segments as any,
                  totalDistance: plan.metrics.totalDistance,
                  totalDuration: plan.metrics.totalDuration,
                  optimizationGain: 0,
                  status: 'success' as const,
                }
                return <RouteMap route={route} />
              })() : (
                <div className="text-center text-slate-500 dark:text-slate-400">
                  📍 Loading map...
                </div>
              )}
            </div>

            {/* Daily Plan Card */}
            <div className="lg:col-span-1">
              <DailyPlanCard plan={schedule.dailyPlans[selectedDateIndex]} />
            </div>
          </div>
        </section>

        {/* Constraints Info */}
        <section className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
            {t('schedule.constraints')}
          </h3>
          <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
            <li>• {t('schedule.maxStopsPerDay')}: {schedule.constraints.maxStopsPerDay}</li>
            <li>• {t('schedule.workingDays')}: Monday - Friday</li>
            <li>• {t('schedule.priority')}: {t('schedule.deadlineFirstGrouping')}</li>
            <li>• {t('schedule.routeOptimization')}: {t('schedule.viaOSRM')}</li>
          </ul>
        </section>

        {/* Action Buttons */}
        <section className="flex gap-3 justify-center">
          <button
            onClick={() => {
              sessionStorage.removeItem('schedule')
              sessionStorage.removeItem('addresses')
              router.push('/')
            }}
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
