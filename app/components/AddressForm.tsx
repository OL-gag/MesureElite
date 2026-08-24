'use client'

import { useCallback, useState } from 'react'
import { AddressInput, GeocodeResponse } from '@/app/lib/types'
import { generateId, parseBulkAddressText } from '@/app/lib/utils'

interface AddressFormProps {
  onSubmit: (addresses: AddressInput[], geocodeResults: GeocodeResponse) => void
  loading?: boolean
  initialStartAddress?: string
  initialStopAddresses?: string[]
}

const MAX_STOPS = 20
const MIN_VALID_STOPS = 2

type FieldStatus = {
  status: 'pending' | 'geocoding' | 'valid' | 'invalid' | 'ambiguous'
  error?: string
  alternatives?: { lat: number; lon: number; displayName: string }[]
}

const PENDING_STATUS: FieldStatus = { status: 'pending' }

// A field with coordinates available (top match), even if ambiguous — see research.md Décision 5:
// ambiguous addresses are not blocking, the top Nominatim match is used by default.
function isUsable(status: FieldStatus): boolean {
  return status.status === 'valid' || status.status === 'ambiguous'
}

async function validateSingleAddress(text: string): Promise<FieldStatus> {
  const trimmed = text.trim()
  if (!trimmed) return { status: 'pending' }

  try {
    const response = await fetch('/api/geocode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addresses: [{ id: generateId(), text: trimmed, order: 1 }] }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { status: 'invalid', error: errorData.error || 'Validation failed' }
    }

    const data: GeocodeResponse = await response.json()
    const result = data.results[0]
    if (!result) return { status: 'invalid', error: 'Validation failed' }

    return {
      status: result.status,
      error: result.error,
      alternatives: result.alternatives,
    }
  } catch (err) {
    return { status: 'invalid', error: err instanceof Error ? err.message : 'Validation failed' }
  }
}

function FieldStatusMessage({ status }: { status: FieldStatus }) {
  if (status.status === 'geocoding') {
    return <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">🔄 Checking address...</p>
  }
  if (status.status === 'valid') {
    return <p className="success-message">✓ Valid</p>
  }
  if (status.status === 'invalid' && status.error) {
    return <p className="error-message">✗ {status.error}</p>
  }
  if (status.status === 'ambiguous') {
    return (
      <div className="warning-message">
        <p>⚠ {status.error || 'Ambiguous address — multiple matches found. Using the closest match.'}</p>
        {status.alternatives && status.alternatives.length > 0 && (
          <p className="mt-0.5">
            Did you mean: {status.alternatives.map((a) => a.displayName).slice(0, 3).join(' · ')}?
          </p>
        )}
      </div>
    )
  }
  return null
}

export default function AddressForm({
  onSubmit,
  loading = false,
  initialStartAddress = '',
  initialStopAddresses,
}: AddressFormProps) {
  const [startAddress, setStartAddress] = useState(initialStartAddress)
  const [startStatus, setStartStatus] = useState<FieldStatus>(PENDING_STATUS)

  const initialStops = initialStopAddresses && initialStopAddresses.length > 0 ? initialStopAddresses : ['', '']
  const [stopAddresses, setStopAddresses] = useState<string[]>(initialStops)
  const [stopStatuses, setStopStatuses] = useState<FieldStatus[]>(initialStops.map(() => PENDING_STATUS))

  const [geocoding, setGeocoding] = useState(false)
  const [formWarning, setFormWarning] = useState<string>('')
  const [formError, setFormError] = useState<string>('')

  const handleStartChange = useCallback((value: string) => {
    setStartAddress(value)
    setStartStatus(PENDING_STATUS)
    setFormError('')
  }, [])

  const handleStartBlur = useCallback(async () => {
    if (!startAddress.trim()) {
      setStartStatus(PENDING_STATUS)
      return
    }
    setStartStatus({ status: 'geocoding' })
    const result = await validateSingleAddress(startAddress)
    setStartStatus(result)
  }, [startAddress])

  const updateStopAddress = useCallback((index: number, value: string) => {
    setStopAddresses((prev) => prev.map((a, i) => (i === index ? value : a)))
    setStopStatuses((prev) => prev.map((s, i) => (i === index ? PENDING_STATUS : s)))
    setFormError('')
  }, [])

  const handleStopBlur = useCallback(async (index: number) => {
    setStopAddresses((current) => {
      const text = current[index]
      if (!text || !text.trim()) {
        setStopStatuses((prev) => prev.map((s, i) => (i === index ? PENDING_STATUS : s)))
        return current
      }
      setStopStatuses((prev) => prev.map((s, i) => (i === index ? { status: 'geocoding' } : s)))
      validateSingleAddress(text).then((result) => {
        setStopStatuses((prev) => prev.map((s, i) => (i === index ? result : s)))
      })
      return current
    })
  }, [])

  const addStopAddress = useCallback(() => {
    setStopAddresses((prev) => {
      if (prev.length >= MAX_STOPS) return prev
      const next = [...prev, '']
      setFormWarning(next.length >= MAX_STOPS ? `Maximum ${MAX_STOPS} stop addresses reached.` : '')
      return next
    })
    setStopStatuses((prev) => (prev.length >= MAX_STOPS ? prev : [...prev, PENDING_STATUS]))
  }, [])

  const removeStopAddress = useCallback((index: number) => {
    setStopAddresses((prev) => (prev.length > 2 ? prev.filter((_, i) => i !== index) : prev))
    setStopStatuses((prev) => (prev.length > 2 ? prev.filter((_, i) => i !== index) : prev))
  }, [])

  const handleStopPaste = useCallback((index: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text')
    if (!pasted.includes('\n')) return // single-line paste: let the browser handle it normally

    e.preventDefault()
    const lines = parseBulkAddressText(pasted)
    if (lines.length === 0) return

    setStopAddresses((prev) => {
      const next = [...prev]
      next[index] = lines[0]

      const overflow = lines.length - 1 > MAX_STOPS - next.length
      const linesToInsert = lines.slice(1, 1 + Math.max(0, MAX_STOPS - next.length))
      next.splice(index + 1, 0, ...linesToInsert)

      if (overflow) {
        setFormWarning(`Only the first ${MAX_STOPS} stop addresses were kept (pasted list was longer).`)
      } else {
        setFormWarning('')
      }

      setStopStatuses((prevStatuses) => {
        const nextStatuses = [...prevStatuses]
        nextStatuses[index] = { status: 'geocoding' }
        nextStatuses.splice(index + 1, 0, ...linesToInsert.map(() => ({ status: 'geocoding' as const })))
        return nextStatuses
      })

      // Validate the pasted line and every newly-inserted line right away,
      // since a paste is a "finished editing" signal for each of those lines.
      const pastedEntries = [lines[0], ...linesToInsert].map((text, offset) => ({
        text,
        targetIndex: index + offset,
      }))
      pastedEntries.forEach(({ text, targetIndex }) => {
        validateSingleAddress(text).then((result) => {
          setStopStatuses((prevStatuses) => prevStatuses.map((s, i) => (i === targetIndex ? result : s)))
        })
      })

      return next
    })
  }, [])

  const filledStopCount = stopAddresses.filter((a) => a.trim()).length
  const validStopCount = stopStatuses.filter((s, i) => stopAddresses[i]?.trim() && isUsable(s)).length
  const invalidStopCount = stopStatuses.filter((s, i) => stopAddresses[i]?.trim() && s.status === 'invalid').length
  const ambiguousStopCount = stopStatuses.filter((s, i) => stopAddresses[i]?.trim() && s.status === 'ambiguous').length

  const startUsable = isUsable(startStatus)
  const canSubmit = startUsable && validStopCount >= MIN_VALID_STOPS

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setFormError('')

      if (!startAddress.trim()) {
        setFormError('Please enter the start/return address')
        return
      }

      const filledStops = stopAddresses.filter((a) => a.trim())
      if (filledStops.length < MIN_VALID_STOPS) {
        setFormError(`Please enter at least ${MIN_VALID_STOPS} stop addresses`)
        return
      }

      setGeocoding(true)

      try {
        const combinedTexts = [startAddress.trim(), ...filledStops]

        const response = await fetch('/api/geocode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            addresses: combinedTexts.map((text, i) => ({
              id: generateId(),
              text,
              order: i + 1,
            })),
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          setFormError(errorData.error || 'Geocoding failed')
          setGeocoding(false)
          return
        }

        const geocodeResults: GeocodeResponse = await response.json()

        const addressInputs: AddressInput[] = combinedTexts.map((text, i) => {
          const result = geocodeResults.results[i]
          const hasCoords =
            (result?.status === 'valid' || result?.status === 'ambiguous') &&
            result.lat !== undefined &&
            result.lon !== undefined &&
            result.displayName !== undefined
          return {
            id: generateId(),
            text,
            order: i + 1,
            isStartPoint: i === 0,
            status: result?.status ?? 'invalid',
            geocodedCoords: hasCoords
              ? { lat: result!.lat!, lon: result!.lon!, displayName: result!.displayName! }
              : undefined,
            error: result?.error,
            alternatives: result?.alternatives,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        })

        onSubmit(addressInputs, geocodeResults)
      } catch (err) {
        setFormError(err instanceof Error ? err.message : 'Failed to geocode addresses')
      } finally {
        setGeocoding(false)
      }
    },
    [startAddress, stopAddresses, onSubmit]
  )

  const isBusy = geocoding || loading

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Isolated start/return address field — FR-001a. No delete control; always present and required. */}
      <div className="p-3 border-2 border-blue-200 dark:border-blue-900 rounded-md bg-blue-50/50 dark:bg-blue-950/20">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Start / Return Address <span className="text-blue-500">(required)</span>
        </label>
        <input
          type="text"
          value={startAddress}
          onChange={(e) => handleStartChange(e.target.value)}
          onBlur={handleStartBlur}
          placeholder="Enter the address you'll start and return to..."
          className="input-field"
          disabled={isBusy}
        />
        <FieldStatusMessage status={startStatus} />
      </div>

      {/* Stop addresses — FR-001, up to 20, separate from the start/return field */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Stop Addresses</label>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {filledStopCount}/{MAX_STOPS} · {validStopCount} valid
            {ambiguousStopCount > 0 && ` · ${ambiguousStopCount} ambiguous`}
            {invalidStopCount > 0 && ` · ${invalidStopCount} invalid`}
          </span>
        </div>

        {stopAddresses.map((address, index) => (
          <div key={index} className="flex gap-2">
            <div className="flex-1">
              <input
                type="text"
                value={address}
                onChange={(e) => updateStopAddress(index, e.target.value)}
                onBlur={() => handleStopBlur(index)}
                onPaste={(e) => handleStopPaste(index, e)}
                placeholder={`Stop ${index + 1} (or paste multiple addresses, one per line)...`}
                className="input-field"
                disabled={isBusy}
              />
              <FieldStatusMessage status={stopStatuses[index] ?? PENDING_STATUS} />
            </div>
            {stopAddresses.length > 2 && (
              <button
                type="button"
                onClick={() => removeStopAddress(index)}
                className="mt-0 h-fit px-3 py-2 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md hover:bg-red-200 dark:hover:bg-red-900/40 disabled:opacity-50"
                disabled={isBusy}
                title="Remove stop"
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
          onClick={addStopAddress}
          disabled={stopAddresses.length >= MAX_STOPS || isBusy}
          className="button-secondary flex-1"
        >
          + Add Stop
        </button>
      </div>

      {formWarning && <p className="warning-message">{formWarning}</p>}
      {formError && <div className="error-message bg-red-50 dark:bg-red-900/20 p-3 rounded">{formError}</div>}

      <button type="submit" disabled={!canSubmit || isBusy} className="button-primary w-full">
        {geocoding ? '🔄 Geocoding Addresses...' : loading ? '⏳ Calculating Route...' : '🚀 Optimize Route'}
      </button>

      <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
        Enter 1 start/return address and 2-20 stop addresses. The system will find the shortest loop visiting all of them.
      </p>
    </form>
  )
}
