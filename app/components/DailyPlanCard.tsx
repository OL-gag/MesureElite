'use client'

import { DailyPlan } from '@/app/lib/types'
import { formatDistance, formatDuration, formatDateToISO } from '@/app/lib/utils'
import PriorityBadge from './PriorityBadge'

interface DailyPlanCardProps {
  plan: DailyPlan
}

export default function DailyPlanCard({ plan }: DailyPlanCardProps) {
  const dateStr = formatDateToISO(plan.date)
  const urgentCount = plan.stops.filter((s) => s.priority === 'urgent').length

  return (
    <div className="card space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            📅 {plan.dayOfWeek.toUpperCase()} {dateStr}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {plan.stops.length} stop{plan.stops.length !== 1 ? 's' : ''} •{' '}
            {formatDistance(plan.metrics.totalDistance)} • {formatDuration(plan.metrics.totalDuration)}
          </p>
        </div>
        {urgentCount > 0 && (
          <div className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-xs font-medium">
            ⚠️ {urgentCount} urgent
          </div>
        )}
      </div>

      <div className="space-y-2">
        {plan.stops.map((stop, idx) => (
          <div key={stop.id} className="p-3 bg-slate-50 dark:bg-slate-700/30 rounded border border-slate-200 dark:border-slate-600">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-sm font-bold text-blue-600 dark:text-blue-200">
                {stop.sequenceNumber}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{stop.address.displayName}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{stop.address.text}</p>
                  </div>
                  <PriorityBadge priority={stop.priority} daysUntilDeadline={stop.measurements.daysUntilDeadline} />
                </div>

                <div className="flex items-center gap-4 mt-2 text-sm text-slate-600 dark:text-slate-400">
                  <span>📍 ({stop.address.lat.toFixed(4)}, {stop.address.lon.toFixed(4)})</span>
                  {idx < plan.stops.length - 1 && stop.distanceFromPrevious !== undefined && (
                    <>
                      <span>→ {formatDistance(stop.distanceFromPrevious)}</span>
                      <span>{formatDuration(stop.durationFromPrevious || 0)}</span>
                    </>
                  )}
                </div>

                <div className="flex gap-2 mt-2 text-xs text-slate-600 dark:text-slate-400">
                  <span>📅 Measurement: {formatDateToISO(stop.measurements.measurementDate)}</span>
                  <span>⏰ Deadline: {formatDateToISO(stop.measurements.deadlineDate)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!plan.metrics.feasible && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded text-sm text-yellow-800 dark:text-yellow-300">
          ⚠️ This day exceeds the maximum {plan.constraints.maxStops} stops
        </div>
      )}
    </div>
  )
}
