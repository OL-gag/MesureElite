'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ErrorBoundary from '../components/ErrorBoundary'
import { Route, GeocodeResponse } from '../lib/types'
import { formatDistance, formatDuration, formatPercentage } from '../lib/utils'

const RouteMap = dynamic(() => import('../components/RouteMap'), { ssr: false })

export default function Results() {
  const router = useRouter()
  const [route, setRoute] = useState<Route | null>(null)
  const [geocodeResults, setGeocodeResults] = useState<GeocodeResponse | null>(null)

  useEffect(() => {
    // Load from sessionStorage
    const storedRoute = sessionStorage.getItem('route')
    const storedResults = sessionStorage.getItem('geocodeResults')

    if (!storedRoute || !storedResults) {
      router.push('/')
      return
    }

    setRoute(JSON.parse(storedRoute))
    setGeocodeResults(JSON.parse(storedResults))
  }, [router])

  if (!route || !geocodeResults) {
    return <div className="text-center py-12">Loading...</div>
  }

  return (
    <ErrorBoundary>
      <div className="space-y-8">
        {/* Header */}
        <section className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            ✅ Route Optimized
          </h1>
          <button
            onClick={() => router.push('/')}
            className="button-secondary"
          >
            ← Edit Addresses
          </button>
        </section>

        {/* Key Metrics */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total Distance</p>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {formatDistance(route.totalDistance)}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total Duration</p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {formatDuration(route.totalDuration)}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Optimization Gain</p>
            <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
              {formatPercentage(route.optimizationGain)} shorter
            </p>
          </div>
        </section>

        {/* Interactive Map */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            🗺️ Route Map
          </h2>
          <RouteMap route={route} />
        </section>

        {/* Itinerary */}
        <section className="card">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
            🛣️ Optimized Route
          </h2>
          <div className="space-y-3">
            {route.waypoints.map((waypoint) => {
              const segment = route.segments.find((s) => s.sequence === waypoint.sequence)
              return (
                <div
                  key={waypoint.id}
                  className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-sm font-bold text-blue-600 dark:text-blue-200">
                      {waypoint.sequence}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {waypoint.displayName}
                      </p>
                      {waypoint.isStartPoint && (
                        <span className="badge-success text-xs">Start / End Point</span>
                      )}
                      {segment && !waypoint.isEndPoint && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                          → {formatDistance(segment.distance)} • {formatDuration(segment.duration)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Validation Info */}
        <section className="card bg-slate-50 dark:bg-slate-700/50">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-3">
            ✓ Addresses Validated
          </h3>
          <div className="space-y-2 text-sm">
            <p>
              <span className="badge-success">{geocodeResults.validCount} Valid</span>
              {geocodeResults.invalidCount > 0 && (
                <span className="badge-error ml-2">{geocodeResults.invalidCount} Invalid</span>
              )}
            </p>
            {geocodeResults.invalidCount > 0 && (
              <ul className="text-slate-600 dark:text-slate-400">
                {geocodeResults.results
                  .filter((r: any) => r.status !== 'valid')
                  .map((r: any) => (
                    <li key={r.id} className="text-xs text-red-600 dark:text-red-400">
                      ✗ {r.error}
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </section>

        {/* Action Buttons */}
        <section className="flex gap-3 justify-center">
          <button
            onClick={() => {
              sessionStorage.removeItem('route')
              sessionStorage.removeItem('geocodeResults')
              router.push('/')
            }}
            className="button-secondary"
          >
            🔄 Calculate New Route
          </button>
          <button
            onClick={() => window.print()}
            className="button-secondary"
          >
            🖨️ Print Results
          </button>
        </section>

        {/* Info */}
        <section className="text-center text-xs text-slate-500 dark:text-slate-400">
          <p>
            Route optimized using{' '}
            <strong>OSRM (Open Source Routing Machine)</strong> • Distances calculated via car routes
          </p>
        </section>
      </div>
    </ErrorBoundary>
  )
}
