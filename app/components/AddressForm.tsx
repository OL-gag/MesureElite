'use client'

import { useCallback, useState } from 'react'
import { AddressInput, GeocodeResponse } from '@/app/lib/types'
import { generateId, parseBulkAddressText, findDistanceOutliers, formatDateToISO } from '@/app/lib/utils'
import { useLanguage } from '@/app/lib/i18n/LanguageContext'
import { translateError } from '@/app/lib/i18n/translations'

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
  errorCode?: string
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
      return { status: 'invalid', error: errorData.error, errorCode: errorData.errorCode }
    }

    const data: GeocodeResponse = await response.json()
    const result = data.results[0]
    if (!result) return { status: 'invalid' }

    return {
      status: result.status,
      error: result.error,
      errorCode: result.errorCode,
      alternatives: result.alternatives,
    }
  } catch (err) {
    return { status: 'invalid', error: err instanceof Error ? err.message : undefined }
  }
}

function FieldStatusMessage({ status, addressText }: { status: FieldStatus; addressText: string }) {
  const { t } = useLanguage()

  if (status.status === 'geocoding') {
    return <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('addressForm.statusChecking')}</p>
  }
  if (status.status === 'valid') {
    return <p className="success-message">{t('addressForm.statusValid')}</p>
  }
  if (status.status === 'invalid') {
    const message = translateError(t, status.errorCode, status.error, { address: addressText })
    return message ? <p className="error-message">✗ {message}</p> : null
  }
  if (status.status === 'ambiguous') {
    const message =
      translateError(t, status.errorCode, status.error, { address: addressText }) ||
      t('addressForm.statusAmbiguousDefault')
    return (
      <div className="warning-message">
        <p>⚠ {message}</p>
        {status.alternatives && status.alternatives.length > 0 && (
          <p className="mt-0.5">
            {t('addressForm.statusDidYouMean', {
              alternatives: status.alternatives.map((a) => a.displayName).slice(0, 3).join(' · '),
            })}
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
  const { t } = useLanguage()
  const todayISO = formatDateToISO(new Date())

  const [startAddress, setStartAddress] = useState(initialStartAddress)
  const [startStatus, setStartStatus] = useState<FieldStatus>(PENDING_STATUS)

  const initialStops = initialStopAddresses && initialStopAddresses.length > 0 ? initialStopAddresses : ['', '']
  const [stopAddresses, setStopAddresses] = useState<string[]>(initialStops)
  const [stopStatuses, setStopStatuses] = useState<FieldStatus[]>(initialStops.map(() => PENDING_STATUS))
  const [stopMeasurementDates, setStopMeasurementDates] = useState<string[]>(initialStops.map(() => todayISO))
  const [stopDeadlineDates, setStopDeadlineDates] = useState<string[]>(initialStops.map(() => todayISO))

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
      setFormWarning(next.length >= MAX_STOPS ? t('addressForm.maxStopsWarning', { max: MAX_STOPS }) : '')
      return next
    })
    setStopStatuses((prev) => (prev.length >= MAX_STOPS ? prev : [...prev, PENDING_STATUS]))
    setStopMeasurementDates((prev) => (prev.length >= MAX_STOPS ? prev : [...prev, todayISO]))
    setStopDeadlineDates((prev) => (prev.length >= MAX_STOPS ? prev : [...prev, todayISO]))
  }, [t, todayISO])

  const removeStopAddress = useCallback((index: number) => {
    setStopAddresses((prev) => (prev.length > 2 ? prev.filter((_, i) => i !== index) : prev))
    setStopStatuses((prev) => (prev.length > 2 ? prev.filter((_, i) => i !== index) : prev))
    setStopMeasurementDates((prev) => (prev.length > 2 ? prev.filter((_, i) => i !== index) : prev))
    setStopDeadlineDates((prev) => (prev.length > 2 ? prev.filter((_, i) => i !== index) : prev))
  }, [])

  const updateStopMeasurementDate = useCallback((index: number, dateStr: string) => {
    setStopMeasurementDates((prev) => prev.map((d, i) => (i === index ? dateStr : d)))
  }, [])

  const updateStopDeadlineDate = useCallback((index: number, dateStr: string) => {
    setStopDeadlineDates((prev) => prev.map((d, i) => (i === index ? dateStr : d)))
  }, [])

  const handleStopPaste = useCallback(
    (index: number, e: React.ClipboardEvent<HTMLInputElement>) => {
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
          setFormWarning(t('addressForm.pasteOverflowWarning', { max: MAX_STOPS }))
        } else {
          setFormWarning('')
        }

        setStopStatuses((prevStatuses) => {
          const nextStatuses = [...prevStatuses]
          nextStatuses[index] = { status: 'geocoding' }
          nextStatuses.splice(index + 1, 0, ...linesToInsert.map(() => ({ status: 'geocoding' as const })))
          return nextStatuses
        })

        setStopMeasurementDates((prevDates) => {
          const nextDates = [...prevDates]
          nextDates.splice(index + 1, 0, ...linesToInsert.map(() => todayISO))
          return nextDates
        })

        setStopDeadlineDates((prevDates) => {
          const nextDates = [...prevDates]
          nextDates.splice(index + 1, 0, ...linesToInsert.map(() => todayISO))
          return nextDates
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
    },
    [t]
  )

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
        setFormError(t('addressForm.errorStartRequired'))
        return
      }

      const filledStops = stopAddresses.filter((a) => a.trim())
      if (filledStops.length < MIN_VALID_STOPS) {
        setFormError(t('addressForm.errorMinStops', { min: MIN_VALID_STOPS }))
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
          setFormError(
            translateError(t, errorData.errorCode, errorData.error, {}) ||
              t('addressForm.errorGeocodingFailedGeneric')
          )
          setGeocoding(false)
          return
        }

        const geocodeResults: GeocodeResponse = await response.json()

        // Non-blocking sanity check: an address geocoded to a wildly distant
        // place (e.g. a same-named street matched in another country because
        // no city was specified) still passes per-field validation, but
        // would otherwise only surface as a confusing route-calculation
        // failure. Warn without preventing submission, since a genuinely
        // long trip is still a valid use case.
        const geocodedPoints = geocodeResults.results
          .map((r, i) =>
            r.lat !== undefined && r.lon !== undefined ? { lat: r.lat, lon: r.lon, label: combinedTexts[i] } : null
          )
          .filter((p): p is { lat: number; lon: number; label: string } => p !== null)
        const outliers = findDistanceOutliers(geocodedPoints)
        setFormWarning(
          outliers.length > 0
            ? t('addressForm.outlierWarning', {
                addresses: outliers.map((o) => `${o.label} (${Math.round(o.nearestKm)} km)`).join(' · '),
              })
            : ''
        )

        const addressInputs: AddressInput[] = combinedTexts.map((text, i) => {
          const result = geocodeResults.results[i]
          const hasCoords =
            (result?.status === 'valid' || result?.status === 'ambiguous') &&
            result.lat !== undefined &&
            result.lon !== undefined &&
            result.displayName !== undefined
          const isStartPoint = i === 0
          const measurementDateStr = isStartPoint ? undefined : stopMeasurementDates[i - 1]
          const deadlineDateStr = isStartPoint ? undefined : stopDeadlineDates[i - 1]
          const measurementDate = measurementDateStr ? new Date(measurementDateStr + 'T00:00:00') : undefined
          const deadlineDate = deadlineDateStr ? new Date(deadlineDateStr + 'T00:00:00') : undefined
          return {
            id: generateId(),
            text,
            order: i + 1,
            isStartPoint,
            status: result?.status ?? 'invalid',
            geocodedCoords: hasCoords
              ? { lat: result!.lat!, lon: result!.lon!, displayName: result!.displayName! }
              : undefined,
            error: result?.error,
            errorCode: result?.errorCode,
            alternatives: result?.alternatives,
            createdAt: new Date(),
            updatedAt: new Date(),
            measurementDate,
            deadlineDate,
          }
        })

        onSubmit(addressInputs, geocodeResults)
      } catch (err) {
        setFormError(t('addressForm.errorSubmitFailed'))
      } finally {
        setGeocoding(false)
      }
    },
    [startAddress, stopAddresses, stopMeasurementDates, stopDeadlineDates, onSubmit, t]
  )

  const isBusy = geocoding || loading

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Isolated start/return address field — FR-001a. No delete control; always present and required. */}
      <div className="p-3 border-2 border-blue-200 dark:border-blue-900 rounded-md bg-blue-50/50 dark:bg-blue-950/20">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          {t('addressForm.startLabel')} <span className="text-blue-500">{t('addressForm.startRequired')}</span>
        </label>
        <input
          type="text"
          value={startAddress}
          onChange={(e) => handleStartChange(e.target.value)}
          onBlur={handleStartBlur}
          placeholder={t('addressForm.startPlaceholder')}
          className="input-field"
          disabled={isBusy}
        />
        <FieldStatusMessage status={startStatus} addressText={startAddress} />
      </div>

      {/* Stop addresses — FR-001, up to 20, separate from the start/return field */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            {t('addressForm.stopsLabel')}
          </label>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {t('addressForm.counter', { filled: filledStopCount, max: MAX_STOPS, valid: validStopCount })}
            {ambiguousStopCount > 0 && t('addressForm.counterAmbiguous', { count: ambiguousStopCount })}
            {invalidStopCount > 0 && t('addressForm.counterInvalid', { count: invalidStopCount })}
          </span>
        </div>

        {stopAddresses.map((address, index) => (
          <div key={index} className="border rounded-md p-3 space-y-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  type="text"
                  value={address}
                  onChange={(e) => updateStopAddress(index, e.target.value)}
                  onBlur={() => handleStopBlur(index)}
                  onPaste={(e) => handleStopPaste(index, e)}
                  placeholder={t('addressForm.stopPlaceholder', { index: index + 1 })}
                  className="input-field"
                  disabled={isBusy}
                />
                <FieldStatusMessage status={stopStatuses[index] ?? PENDING_STATUS} addressText={address} />
              </div>
              {stopAddresses.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeStopAddress(index)}
                  className="mt-0 h-fit px-3 py-2 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md hover:bg-red-200 dark:hover:bg-red-900/40 disabled:opacity-50"
                  disabled={isBusy}
                  title={t('addressForm.removeStopTitle')}
                >
                  ✕
                </button>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t('addressForm.measurementDateLabel')}
              </label>
              <input
                type="date"
                value={stopMeasurementDates[index] ?? todayISO}
                onChange={(e) => updateStopMeasurementDate(index, e.target.value)}
                className="input-field"
                disabled={isBusy}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t('addressForm.deadlineDateLabel')}
              </label>
              <input
                type="date"
                value={stopDeadlineDates[index] ?? todayISO}
                onChange={(e) => updateStopDeadlineDate(index, e.target.value)}
                className="input-field"
                disabled={isBusy}
              />
            </div>
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
          {t('addressForm.addStopButton')}
        </button>
      </div>

      {formWarning && <p className="warning-message">{formWarning}</p>}
      {formError && <div className="error-message bg-red-50 dark:bg-red-900/20 p-3 rounded">{formError}</div>}

      <button type="submit" disabled={!canSubmit || isBusy} className="button-primary w-full">
        {geocoding
          ? t('addressForm.submitGeocoding')
          : loading
            ? t('addressForm.submitCalculating')
            : t('addressForm.submitDefault')}
      </button>

      <p className="text-xs text-slate-500 dark:text-slate-400 text-center">{t('addressForm.footerHint')}</p>
    </form>
  )
}
