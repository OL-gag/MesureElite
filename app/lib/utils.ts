// Utility functions

export function formatDistance(meters: number, unit: 'km' | 'mi' = 'km'): string {
  if (unit === 'mi') {
    const miles = meters / 1609.34
    return `${miles.toFixed(2)} mi`
  }
  const km = meters / 1000
  return `${km.toFixed(2)} km`
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`
  }
  return `${secs}s`
}

export function validateCoordinates(lat: number, lon: number): boolean {
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180
}

export function calculateOptimizationGain(
  originalDistance: number,
  optimizedDistance: number
): number {
  if (originalDistance <= 0) return 0
  return ((originalDistance - optimizedDistance) / originalDistance) * 100
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function formatPercentage(value: number): string {
  return `${Math.abs(value) >= 0.01 ? value.toFixed(2) : '0.00'}%`
}

export async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Splits pasted multiline text into individual address lines, trimming
// whitespace and dropping empty lines (FR-001, FR-007).
export function parseBulkAddressText(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

// Great-circle distance between two coordinates, in kilometers.
export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth radius in km
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

const DISTANCE_OUTLIER_THRESHOLD_KM = 300

// Flags points whose nearest neighbor in the list is farther than the
// threshold — a strong signal that an address was geocoded to the wrong
// place entirely (e.g. a same-named street matched in another country),
// rather than the trip genuinely spanning that distance.
export function findDistanceOutliers<T extends { lat: number; lon: number }>(
  points: T[]
): (T & { nearestKm: number })[] {
  if (points.length < 2) return []

  return points
    .map((point, index) => {
      const nearestKm = Math.min(
        ...points
          .filter((_, otherIndex) => otherIndex !== index)
          .map((other) => haversineDistanceKm(point.lat, point.lon, other.lat, other.lon))
      )
      return { ...point, nearestKm }
    })
    .filter((point) => point.nearestKm > DISTANCE_OUTLIER_THRESHOLD_KM)
}

// External navigation app deep links, built from a round-trip route: the
// first point is the start address (used as both origin and final
// destination), the rest are the day's stops in visiting order.
//
// Uses the geocoded address TEXT rather than lat/lon: Nominatim (our
// geocoder) is imprecise on some rural Québec addresses, and passing raw
// coordinates makes Google/Apple reverse-geocode that (possibly off) point
// to whatever address THEY have nearby — sometimes a different house number
// or street entirely. Passing the address text lets each app geocode it
// with its own (generally more complete) data, landing on the address the
// user actually sees in the app instead of a coordinate-drift mismatch.
export interface MapLinkPoint {
  label: string
}

export function buildGoogleMapsUrl(orderedPoints: MapLinkPoint[]): string {
  const [start, ...stops] = orderedPoints
  const place = (p: MapLinkPoint) => encodeURIComponent(p.label)
  const params = [`api=1`, `origin=${place(start)}`, `destination=${place(start)}`, `travelmode=driving`]
  if (stops.length > 0) params.push(`waypoints=${stops.map(place).join('|')}`)
  return `https://www.google.com/maps/dir/?${params.join('&')}`
}

export function buildAppleMapsUrl(orderedPoints: MapLinkPoint[]): string {
  const [start, ...stops] = orderedPoints
  const place = (p: MapLinkPoint) => encodeURIComponent(p.label)
  const daddr = [...stops.map(place), place(start)].join('+to:')
  return `https://maps.apple.com/?saddr=${place(start)}&daddr=${daddr}&dirflg=d`
}

// Date formatting utilities (US1 & US2)

// Formats the LOCAL calendar day (not UTC): with toISOString() a user in a
// UTC-negative timezone (e.g. Québec) gets tomorrow's date every evening.
export function formatDateToISO(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function daysUntilDate(targetDate: Date, fromDate: Date = new Date()): number {
  const target = new Date(targetDate)
  target.setHours(0, 0, 0, 0)
  const from = new Date(fromDate)
  from.setHours(0, 0, 0, 0)
  const diffTime = target.getTime() - from.getTime()
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

export function isOverdue(deadlineDate: Date, asOfDate: Date = new Date()): boolean {
  return daysUntilDate(deadlineDate, asOfDate) < 0
}

// asOf lets callers classify urgency relative to the day the stop is actually
// scheduled for, not just "now".
export function getPriority(deadlineDate: Date, asOf: Date = new Date()): 'urgent' | 'normal' | 'flexible' {
  const daysUntilDeadline = daysUntilDate(deadlineDate, asOf)
  if (daysUntilDeadline <= 1) return 'urgent'
  if (daysUntilDeadline <= 7) return 'normal'
  return 'flexible'
}
