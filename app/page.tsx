'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AddressForm from './components/AddressForm'
import ErrorBoundary from './components/ErrorBoundary'
import { AddressInput, GeocodeResponse } from './lib/types'

export default function Home() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleFormSubmit = async (_addresses: AddressInput[], geocodeResults: GeocodeResponse) => {
    setLoading(true)

    try {
      // Get valid addresses from geocode results
      const validResults = (geocodeResults.results || []).filter((r: any) => r.status === 'valid')

      if (validResults.length < 2) {
        const invalidAddrs = (geocodeResults.results || []).filter((r: any) => r.status !== 'valid')
        if (invalidAddrs.length > 0) {
          alert(`❌ Error: ${invalidAddrs.map((r: any) => r.error || 'Unknown error').join('\n')}`)
        } else {
          alert('Need at least 2 valid addresses to calculate route')
        }
        setLoading(false)
        return
      }

      // Create waypoints for routing (MUST have lat/lon from geocoding)
      const waypoints = validResults.map((r: any, index: number) => {
        if (!r.lat || !r.lon) {
          throw new Error(`Address ${index + 1} missing coordinates`)
        }
        return {
          id: `wp-${index}`,
          lat: parseFloat(r.lat),
          lon: parseFloat(r.lon),
          displayName: String(r.displayName || `Address ${index + 1}`),
        }
      })

      // Call route API
      const routeResponse = await fetch('/api/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ waypoints }),
      })

      if (!routeResponse.ok) {
        const error = await routeResponse.json()
        alert(`Route calculation failed: ${error.error}`)
        setLoading(false)
        return
      }

      const routeData = await routeResponse.json()

      // Store in sessionStorage and navigate
      sessionStorage.setItem('route', JSON.stringify(routeData.route))
      sessionStorage.setItem('geocodeResults', JSON.stringify(geocodeResults))
      router.push('/results')
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
      setLoading(false)
    }
  }

  return (
    <ErrorBoundary>
      <div className="space-y-8">
        <section className="text-center py-12">
          <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Find the Shortest Route
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Enter 2-25 addresses and get the optimized route. Perfect for deliveries, road trips, or any multi-stop journey.
          </p>
        </section>

        <section className="card max-w-2xl mx-auto">
          <div className="space-y-6">
            <div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                🗺️ Optimize Your Route
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Enter your addresses below to calculate the shortest possible route.
              </p>
            </div>

            <AddressForm onSubmit={handleFormSubmit} loading={loading} />
          </div>
        </section>
      </div>
    </ErrorBoundary>
  )
}
