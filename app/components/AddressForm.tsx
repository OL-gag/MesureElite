'use client'

import { useState, useCallback } from 'react'
import { AddressInput, GeocodeResponse } from '@/app/lib/types'
import { generateId } from '@/app/lib/utils'

interface AddressFormProps {
  onSubmit: (addresses: AddressInput[], geocodeResults: GeocodeResponse) => void
  loading?: boolean
}

export default function AddressForm({ onSubmit, loading = false }: AddressFormProps) {
  const [addresses, setAddresses] = useState<string[]>(['', ''])
  const [geocoding, setGeocoding] = useState(false)
  const [error, setError] = useState<string>('')

  const addAddress = useCallback(() => {
    if (addresses.length < 25) {
      setAddresses([...addresses, ''])
    }
  }, [addresses])

  const removeAddress = useCallback((index: number) => {
    if (addresses.length > 2) {
      setAddresses(addresses.filter((_, i) => i !== index))
    }
  }, [addresses])

  const updateAddress = useCallback((index: number, value: string) => {
    const newAddresses = [...addresses]
    newAddresses[index] = value
    setAddresses(newAddresses)
    setError('')
  }, [addresses])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError('')

      // Validate
      const filledAddresses = addresses.filter((a) => a.trim())
      if (filledAddresses.length < 2) {
        setError('Please enter at least 2 addresses')
        return
      }

      if (filledAddresses.length > 25) {
        setError('Maximum 25 addresses allowed')
        return
      }

      setGeocoding(true)

      try {
        // Call geocode API
        const response = await fetch('/api/geocode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            addresses: filledAddresses.map((text, i) => ({
              id: generateId(),
              text,
              order: i + 1,
            })),
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          setError(errorData.error || 'Geocoding failed')
          setGeocoding(false)
          return
        }

        const geocodeResults: GeocodeResponse = await response.json()

        // Show any geocoding errors
        const invalidResults = geocodeResults.results.filter((r: any) => r.status !== 'valid')
        if (invalidResults.length > 0) {
          const errorMessages = invalidResults.map((r: any) => r.error).join('\n')
          console.warn('Geocoding issues:', errorMessages)
        }

        // Create AddressInput objects (status will be set based on geocode results)
        const addressInputs: AddressInput[] = filledAddresses.map((text, i) => ({
          id: generateId(),
          text,
          order: i + 1,
          isStartPoint: i === 0,
          status: geocodeResults.results[i]?.status === 'valid' ? 'valid' : 'invalid',
          geocodedCoords: geocodeResults.results[i]?.status === 'valid' ? {
            lat: geocodeResults.results[i].lat,
            lon: geocodeResults.results[i].lon,
            displayName: geocodeResults.results[i].displayName,
          } : undefined,
          error: geocodeResults.results[i]?.error,
          createdAt: new Date(),
          updatedAt: new Date(),
        }))

        // Pass to parent
        onSubmit(addressInputs, geocodeResults)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to geocode addresses')
      } finally {
        setGeocoding(false)
      }
    },
    [addresses, onSubmit]
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-3">
        {addresses.map((address, index) => (
          <div key={index} className="flex gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Address {index + 1}
                {index === 0 && <span className="text-blue-500 ml-1">(Start Point)</span>}
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => updateAddress(index, e.target.value)}
                placeholder={`Enter address ${index + 1}...`}
                className="input-field"
                disabled={geocoding || loading}
              />
            </div>
            {addresses.length > 2 && (
              <button
                type="button"
                onClick={() => removeAddress(index)}
                className="mt-7 px-3 py-2 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md hover:bg-red-200 dark:hover:bg-red-900/40 disabled:opacity-50"
                disabled={geocoding || loading}
                title="Remove address"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={addAddress}
          disabled={addresses.length >= 25 || geocoding || loading}
          className="button-secondary flex-1"
        >
          + Add Address
        </button>
        <span className="text-sm text-slate-600 dark:text-slate-400 py-2 px-3">
          {addresses.filter((a) => a.trim()).length} of 25
        </span>
      </div>

      {error && <div className="error-message bg-red-50 dark:bg-red-900/20 p-3 rounded">{error}</div>}

      <button
        type="submit"
        disabled={addresses.filter((a) => a.trim()).length < 2 || geocoding || loading}
        className="button-primary w-full"
      >
        {geocoding ? '🔄 Geocoding Addresses...' : loading ? '⏳ Calculating Route...' : '🚀 Optimize Route'}
      </button>

      <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
        Enter 2-25 addresses. The system will find the shortest route visiting all of them.
      </p>
    </form>
  )
}
