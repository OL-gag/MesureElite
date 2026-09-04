'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AddressForm from './components/AddressForm'
import ErrorBoundary from './components/ErrorBoundary'
import { AddressInput, GeocodeResponse, DistanceOutlier } from './lib/types'
import { useLanguage } from './lib/i18n/LanguageContext'
import { translateError } from './lib/i18n/translations'
import { formatDateToISO } from './lib/utils'

// Pre-fills the start/return address on a fresh visit (no sessionStorage
// yet) so it doesn't need retyping every time — every measurement trip
// starts and ends here.
const DEFAULT_START_ADDRESS = '501 rue des Eaux-Fraîches, Lac-Saint-Charles, Québec, G2G 2Z4'

export default function Home() {
  const router = useRouter()
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)

  // Restore the previously submitted addresses (if any) so the "← Edit Addresses"
  // button on the results page doesn't wipe the user's input (see FR-006 / US3).
  const [initialAddressTexts] = useState<string[] | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      const raw = sessionStorage.getItem('addressTexts')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })

  // Restore the measurement/deadline dates and reference notes alongside the
  // address texts, parsing the stored payload once for all three fields.
  const [initialDates] = useState<{
    measurement: (string | undefined)[]
    deadline: (string | undefined)[]
    reference: (string | undefined)[]
  } | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      const raw = sessionStorage.getItem('addresses')
      if (!raw) return null
      const addresses = JSON.parse(raw)
      const toDateStr = (value: string | undefined) =>
        value ? formatDateToISO(new Date(value)) : undefined
      return {
        measurement: addresses.map((a: any) => toDateStr(a.measurementDate)),
        deadline: addresses.map((a: any) => toDateStr(a.deadlineDate)),
        reference: addresses.map((a: any) => a.reference as string | undefined),
      }
    } catch {
      return null
    }
  })

  // Remembers the last daily-capacity setting so it doesn't need re-entering
  // every time either.
  const [initialMaxStopsPerDay] = useState<number | undefined>(() => {
    if (typeof window === 'undefined') return undefined
    try {
      const raw = sessionStorage.getItem('maxStopsPerDay')
      const value = raw ? parseInt(raw, 10) : NaN
      return Number.isInteger(value) && value > 0 ? value : undefined
    } catch {
      return undefined
    }
  })

  const handleFormSubmit = async (
    addresses: AddressInput[],
    geocodeResults: GeocodeResponse,
    outliers: DistanceOutlier[],
    maxStopsPerDay: number
  ) => {
    setLoading(true)

    sessionStorage.setItem('addressTexts', JSON.stringify(addresses.map((a) => a.text)))
    sessionStorage.setItem('maxStopsPerDay', String(maxStopsPerDay))
    // Always overwrite (even when empty) so a warning from a previous
    // submission never lingers on the next one.
    sessionStorage.setItem('addressOutliers', JSON.stringify(outliers))
    sessionStorage.setItem('addresses', JSON.stringify(addresses.map((a) => ({
      id: a.id,
      text: a.text,
      measurementDate: a.measurementDate?.toISOString(),
      deadlineDate: a.deadlineDate?.toISOString(),
      reference: a.reference,
      order: a.order,
    }))))

    try {
      // Get valid/ambiguous (usable) addresses from geocode results — AddressForm
      // already surfaces per-field errors inline before submission is even possible.
      // Geocode results align by index with the submitted addresses, so carry
      // the address id onto each waypoint — the results page uses it to look
      // the address back up even when an invalid address was filtered out.
      const usableEntries = (geocodeResults.results || [])
        .map((r: any, index: number) => ({ r, address: addresses[index] }))
        .filter(({ r }) => r.status === 'valid' || r.status === 'ambiguous')

      if (usableEntries.length < 2) {
        setLoading(false)
        return
      }

      // Create waypoints for routing (MUST have lat/lon from geocoding)
      const waypoints = usableEntries.map(({ r, address }, index: number) => {
        const lat = parseFloat(r.lat)
        const lon = parseFloat(r.lon)

        if (!r.lat || !r.lon) {
          throw new Error(`Address ${index + 1} missing coordinates`)
        }

        if (isNaN(lat) || isNaN(lon)) {
          throw new Error(`Address ${index + 1} has invalid coordinates: lat=${r.lat}, lon=${r.lon}`)
        }

        if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
          throw new Error(`Address ${index + 1} has out-of-bounds coordinates: lat=${lat}, lon=${lon}`)
        }

        return {
          id: address?.id ?? `wp-${index}`,
          lat,
          lon,
          displayName: String(r.displayName || `Address ${index + 1}`),
        }
      })

      sessionStorage.setItem('geocodeResults', JSON.stringify(geocodeResults))

      // Try the measurement schedule first (US3): it runs its own per-day OSRM
      // optimization, so the single global route is only computed when we fall
      // back to the results page.
      try {
        const scheduleResponse = await fetch('/api/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            addresses: addresses.map((a) => ({
              ...a,
              // Send calendar dates (the user's local day), not UTC instants:
              // the server runs in UTC and an instant submitted in the evening
              // would land on the wrong day there.
              measurementDate: a.measurementDate ? formatDateToISO(a.measurementDate) : undefined,
              deadlineDate: a.deadlineDate ? formatDateToISO(a.deadlineDate) : undefined,
            })),
            clientToday: formatDateToISO(new Date()),
            // Soft target from the form; the ceiling (one more, only used
            // when a deadline leaves no other choice) is derived from it.
            constraints: {
              maxStopsPerDay,
              absoluteMaxStopsPerDay: maxStopsPerDay + 1,
            },
          }),
        })

        if (scheduleResponse.ok) {
          const schedule = await scheduleResponse.json()
          try {
            sessionStorage.setItem('schedule', JSON.stringify(schedule))
            router.push('/schedule')
            return
          } catch {
            // Quota exceeded (very long routes): fall back to the results page.
            console.warn('Schedule too large for sessionStorage, falling back to results page')
          }
        } else {
          console.warn('Schedule generation failed, falling back to results page')
        }
      } catch (err) {
        console.warn('Schedule generation error:', err)
      }

      // Fallback: compute the single optimized loop and show the results page
      const routeResponse = await fetch('/api/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ waypoints }),
      })

      if (!routeResponse.ok) {
        const error = await routeResponse.json()
        alert(translateError(t, error.errorCode, error.error) || t('addressForm.errorGeocodingFailedGeneric'))
        setLoading(false)
        return
      }

      const routeData = await routeResponse.json()
      sessionStorage.setItem('route', JSON.stringify(routeData.route))
      router.push('/results')
    } catch (err) {
      alert(err instanceof Error ? err.message : t('addressForm.errorSubmitFailed'))
      setLoading(false)
    }
  }

  return (
    <ErrorBoundary>
      <div className="space-y-8">
        <section className="text-center py-12">
          <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
            {t('home.title')}
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            {t('home.subtitle')}
          </p>
        </section>

        <section className="card max-w-2xl mx-auto">
          <div className="space-y-6">
            <div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                {t('home.cardTitle')}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                {t('home.cardIntro')}
              </p>
            </div>

            <AddressForm
              onSubmit={handleFormSubmit}
              loading={loading}
              initialStartAddress={initialAddressTexts?.[0] ?? DEFAULT_START_ADDRESS}
              initialStopAddresses={initialAddressTexts?.slice(1)}
              initialMeasurementDates={initialDates?.measurement.slice(1)}
              initialDeadlineDates={initialDates?.deadline.slice(1)}
              initialReferences={initialDates?.reference.slice(1)}
              initialMaxStopsPerDay={initialMaxStopsPerDay}
            />
          </div>
        </section>
      </div>
    </ErrorBoundary>
  )
}
