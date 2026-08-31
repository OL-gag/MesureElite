'use client'

import { DailyPlan } from '@/app/lib/types'
import { formatDistance, formatDuration, formatDateToISO } from '@/app/lib/utils'
import { useLanguage } from '@/app/lib/i18n/LanguageContext'

interface DailyPlanCardProps {
  plan: DailyPlan
  // When provided, the card header is clickable and selects this day on the
  // schedule map (kept in sync with the day filter — FR-025).
  selected?: boolean
  onSelect?: () => void
}

export default function DailyPlanCard({ plan, selected = false, onSelect }: DailyPlanCardProps) {
  const { t, locale } = useLanguage()
  const dateStr = formatDateToISO(plan.date)
  const dayOfWeek = plan.date.toLocaleDateString(locale, { weekday: 'long' })

  // The day's route is a round trip: surface the start address at the top and
  // the return leg at the bottom of the itinerary.
  const startWaypoint = plan.route?.waypoints.find((wp) => wp.isStartPoint)
  const returnSegment = plan.route?.segments[plan.route.segments.length - 1]

  return (
    <div className={`card space-y-4 ${selected ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''}`}>
      <div
        onClick={onSelect}
        role={onSelect ? 'button' : undefined}
        tabIndex={onSelect ? 0 : undefined}
        onKeyDown={onSelect ? (e) => (e.key === 'Enter' || e.key === ' ') && onSelect() : undefined}
        className={onSelect ? 'cursor-pointer select-none' : undefined}
      >
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
          📅 {dayOfWeek.toUpperCase()} {dateStr}
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          {t('schedule.stopsCount', { count: plan.stops.length })} •{' '}
          {formatDistance(plan.metrics.totalDistance)} • {formatDuration(plan.metrics.totalDuration)}
        </p>
      </div>

      <div className="space-y-2">
        {startWaypoint && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-700">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-sm">
                ⭐
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 dark:text-white">{t('schedule.startLabel')}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{startWaypoint.displayName}</p>
              </div>
            </div>
          </div>
        )}

        {plan.stops.map((stop) => (
          <div key={stop.id} className="p-3 bg-slate-50 dark:bg-slate-700/30 rounded border border-slate-200 dark:border-slate-600">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-sm font-bold text-blue-600 dark:text-blue-200">
                {stop.sequenceNumber}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 dark:text-white">{stop.address.displayName}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{stop.address.text}</p>

                <div className="flex items-center gap-4 mt-2 text-sm text-slate-600 dark:text-slate-400">
                  <span>📍 ({stop.address.lat.toFixed(4)}, {stop.address.lon.toFixed(4)})</span>
                  {stop.distanceFromPrevious !== undefined && (
                    <>
                      <span>→ {formatDistance(stop.distanceFromPrevious)}</span>
                      <span>{formatDuration(stop.durationFromPrevious || 0)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {startWaypoint && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-700">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-sm">
                🏠
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 dark:text-white">{t('schedule.returnLabel')}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{startWaypoint.displayName}</p>
                {returnSegment && (
                  <div className="flex items-center gap-4 mt-2 text-sm text-slate-600 dark:text-slate-400">
                    <span>→ {formatDistance(returnSegment.distance)}</span>
                    <span>{formatDuration(returnSegment.duration)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {!plan.metrics.feasible && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded text-sm text-yellow-800 dark:text-yellow-300">
          ⚠️ {t('schedule.exceedsMaxStops', { max: plan.constraints.maxStops })}
        </div>
      )}
    </div>
  )
}
