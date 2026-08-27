'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ErrorBoundary from '@/app/components/ErrorBoundary'
import DailyPlanCard from '@/app/components/DailyPlanCard'
import { MeasurementSchedule } from '@/app/lib/types'
import { useLanguage } from '@/app/lib/i18n/LanguageContext'

export default function Schedule() {
  const router = useRouter()
  const { t } = useLanguage()
  const [schedule, setSchedule] = useState<MeasurementSchedule | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    const loadSchedule = async () => {
      try {
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
              📅 Optimized Measurement Schedule
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Generated at {new Date(schedule.generatedAt).toLocaleString()}
            </p>
          </div>
          <button onClick={() => router.push('/')} className="button-secondary">
            {t('results.editAddressesButton')}
          </button>
        </section>

        {/* Summary Metrics */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total Addresses</p>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {schedule.metadata.totalAddresses}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total Distance</p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {(schedule.metadata.totalDistance / 1000).toFixed(1)} km
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total Time</p>
            <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
              {Math.round(schedule.metadata.totalDuration / 3600)}h {Math.round((schedule.metadata.totalDuration % 3600) / 60)}m
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Days Scheduled</p>
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {schedule.dailyPlans.length}
            </p>
          </div>
        </section>

        {/* Urgent Warning */}
        {schedule.metadata.addressesOnDeadline > 0 && (
          <section className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-red-800 dark:text-red-300 font-semibold">
              ⚠️ {schedule.metadata.addressesOnDeadline} address{schedule.metadata.addressesOnDeadline !== 1 ? 'es' : ''} with
              urgent deadlines (next 24 hours)
            </p>
          </section>
        )}

        {/* Daily Plans */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            📋 Daily Routes
          </h2>
          {schedule.dailyPlans.map((plan) => (
            <DailyPlanCard key={plan.id} plan={plan} />
          ))}
        </section>

        {/* Constraints Info */}
        <section className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
            📋 Schedule Constraints
          </h3>
          <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
            <li>• Max stops per day: {schedule.constraints.maxStopsPerDay}</li>
            <li>• Working days: Monday - Friday</li>
            <li>• Priority: Deadline-first grouping</li>
            <li>• Route optimization: Via OSRM</li>
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
