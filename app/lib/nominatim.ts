// Nominatim Geocoding Client (OpenStreetMap)
// Converts address text → lat/lon coordinates

import { GeocodeResponse } from './types'

const NOMINATIM_BASE_URL = process.env.NEXT_PUBLIC_NOMINATIM_BASE_URL || 'https://nominatim.openstreetmap.org'
const CACHE_KEY = 'nominatim_cache'
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

interface CacheEntry {
  result: {
    lat: number
    lon: number
    display_name: string
    address?: Record<string, string>
    importance?: number
  }[]
  timestamp: number
}

function getCache(): Record<string, CacheEntry> {
  if (typeof window === 'undefined') return {}
  try {
    const cache = localStorage.getItem(CACHE_KEY)
    return cache ? JSON.parse(cache) : {}
  } catch {
    return {}
  }
}

function setCache(address: string, result: CacheEntry): void {
  if (typeof window === 'undefined') return
  try {
    const cache = getCache()
    cache[address] = result
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    // Silently fail if localStorage is not available
  }
}

function isCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_TTL
}

async function fetchWithRetry(url: string, maxRetries = 3): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'MesureMG/1.0',
        },
      })

      if (response.status === 429) {
        // Rate limited - wait and retry
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
          continue
        }
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      return response
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
      }
    }
  }

  throw lastError || new Error('Geocoding failed after retries')
}

// Structured components Nominatim returns when queried with addressdetails=1 —
// used to build a short, readable display string instead of the full
// comma-heavy display_name (which can include neighbourhood, borough,
// agglomeration, region, and country all at once).
interface NominatimAddressDetails {
  house_number?: string
  road?: string
  neighbourhood?: string
  suburb?: string
  city_district?: string
  city?: string
  town?: string
  village?: string
  municipality?: string
  state?: string
  postcode?: string
}

interface GeocodeMatch {
  lat: number
  lon: number
  displayName: string
  address?: NominatimAddressDetails
  importance?: number
}

// Builds a short, human-readable address (e.g. "501, Rue des Eaux-Fraîches,
// Lac-Saint-Charles, Québec, G2G 2Z4") from Nominatim's structured address
// components, falling back to the full display_name when those components
// are unavailable. Only affects presentation — geocoding accuracy and the
// ambiguity check (see isAmbiguousMatch) always use the raw display_name.
function formatShortAddress(address: NominatimAddressDetails | undefined, fallback: string): string {
  if (!address) return fallback

  const street = [address.house_number, address.road].filter(Boolean).join(', ')
  // Keep both the fine-grained locality (neighbourhood/suburb/borough) and the
  // city proper — a suburb like "South of Market" alone would otherwise hide
  // that the address is in San Francisco.
  const localityFine = address.suburb || address.city_district || address.neighbourhood
  const localityCity = address.city || address.town || address.village || address.municipality
  const parts = [street, localityFine, localityCity, address.state, address.postcode].filter(
    (p): p is string => Boolean(p && p.trim())
  )
  const deduped = parts.filter((p, i) => i === 0 || p !== parts[i - 1])

  return deduped.length > 0 ? deduped.join(', ') : fallback
}

export async function geocodeAddress(address: string): Promise<{
  lat: number
  lon: number
  displayName: string
  address?: NominatimAddressDetails
  importance?: number
  alternatives?: (GeocodeMatch & { displayName: string })[]
} | null> {
  // Check cache first
  const cache = getCache()
  if (cache[address] && isCacheValid(cache[address].timestamp)) {
    const cachedResults = cache[address].result
    const cachedTop = cachedResults[0]
    if (cachedTop) {
      return {
        lat: parseFloat(cachedTop.lat.toString()),
        lon: parseFloat(cachedTop.lon.toString()),
        displayName: cachedTop.display_name,
        address: cachedTop.address,
        importance: cachedTop.importance,
        alternatives: cachedResults.slice(1).map((r) => ({
          lat: parseFloat(r.lat.toString()),
          lon: parseFloat(r.lon.toString()),
          displayName: r.display_name,
          address: r.address,
          importance: r.importance,
        })),
      }
    }
  }

  try {
    const query = encodeURIComponent(address)
    const url = `${NOMINATIM_BASE_URL}/search?q=${query}&format=json&limit=3&addressdetails=1`

    const response = await fetchWithRetry(url)
    const results = (await response.json()) as any[]

    if (!results || results.length === 0) {
      return null
    }

    // Cache the result
    setCache(address, {
      result: results,
      timestamp: Date.now(),
    })

    // Return top match + alternatives
    const topMatch = results[0]
    return {
      lat: parseFloat(topMatch.lat),
      lon: parseFloat(topMatch.lon),
      displayName: topMatch.display_name,
      address: topMatch.address,
      importance: topMatch.importance,
      alternatives: results.slice(1).map((r) => ({
        lat: parseFloat(r.lat),
        lon: parseFloat(r.lon),
        displayName: r.display_name,
        address: r.address,
        importance: r.importance,
      })),
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Nominatim geocoding failed: ${message}`)
  }
}

// Extracts a rough "city/region" key from a Nominatim display_name — skips
// the street/neighborhood-level prefix (which can legitimately differ for
// the same city, e.g. two districts of Laval) and the trailing postcode/
// country, keeping a small window of components (city, county, state) so
// two results can be compared to detect ambiguity between distinct places.
function extractLocalityKey(displayName: string): string {
  const parts = displayName.split(',').map((p) => p.trim())
  const end = Math.max(1, parts.length - 2)
  const start = Math.max(1, end - 3)
  return parts.slice(start, end).join(',').toLowerCase()
}

// An alternative only counts as a genuine competing candidate if it's
// reasonably close in relevance to the top match. Without this, a precise,
// unique address (e.g. with a postal code) could get flagged ambiguous just
// because Nominatim's top-3 happened to include a same-named street in an
// unrelated town with far lower importance — a false positive.
const MIN_RELATIVE_IMPORTANCE = 0.5

function isAmbiguousMatch(
  top: { displayName: string; importance?: number },
  alternatives: { displayName: string; importance?: number }[]
): boolean {
  if (alternatives.length === 0) return false
  const topKey = extractLocalityKey(top.displayName)

  return alternatives.some((alt) => {
    if (extractLocalityKey(alt.displayName) === topKey) return false
    // If importance is missing on either side, fall back to locality-only
    // comparison (can't judge relative confidence).
    if (top.importance === undefined || alt.importance === undefined) return true
    return alt.importance >= top.importance * MIN_RELATIVE_IMPORTANCE
  })
}

export async function geocodeMultiple(addresses: string[]): Promise<GeocodeResponse> {
  const results = await Promise.allSettled(
    addresses.map(async (address) => {
      try {
        const result = await geocodeAddress(address)
        if (result) {
          const alternatives = result.alternatives || []
          // Ambiguity is judged on the raw display_name (see extractLocalityKey);
          // only the outward-facing displayName is shortened for readability.
          const ambiguous = isAmbiguousMatch(result, alternatives)
          const status: 'valid' | 'ambiguous' = ambiguous ? 'ambiguous' : 'valid'
          return {
            address,
            status,
            lat: result.lat,
            lon: result.lon,
            displayName: formatShortAddress(result.address, result.displayName),
            alternatives: alternatives.map((alt) => ({
              lat: alt.lat,
              lon: alt.lon,
              displayName: formatShortAddress(alt.address, alt.displayName),
            })),
            error: ambiguous
              ? `Ambiguous address: "${address}" matched multiple distinct places. Please specify the city.`
              : undefined,
            errorCode: ambiguous ? ('AMBIGUOUS' as const) : undefined,
          }
        } else {
          return {
            address,
            status: 'invalid' as const,
            error: `Address not found: "${address}". Please check spelling.`,
            errorCode: 'ADDRESS_NOT_FOUND' as const,
          }
        }
      } catch (error) {
        return {
          address,
          status: 'invalid' as const,
          error: error instanceof Error ? error.message : 'Geocoding failed',
          errorCode: 'GEOCODING_FAILED' as const,
        }
      }
    })
  )

  const processedResults = results.map((r) => {
    if (r.status === 'fulfilled') return r.value
    return {
      address: '',
      status: 'invalid' as const,
      error: 'Geocoding request failed',
      errorCode: 'GEOCODING_FAILED' as const,
    }
  })

  return {
    results: processedResults as any,
    validCount: processedResults.filter((r) => r.status === 'valid' || r.status === 'ambiguous').length,
    invalidCount: processedResults.filter((r) => r.status === 'invalid').length,
  }
}
