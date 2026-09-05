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

// The public Nominatim server appears to serialize concurrent requests from
// the same source rather than truly running them in parallel: a batch of N
// street-type variants (see geocodeAddress) fired concurrently was observed
// taking roughly N * 700ms end to end, not the ~700ms a real parallel
// dispatch would take. Left unbounded, a single slow-to-be-served request
// can push the whole call past Vercel's ~10s serverless function timeout,
// which is what was surfacing as a generic "geocoding failed" error for real
// addresses. A hard per-request timeout keeps that bounded — occasionally at
// the cost of missing a street-type correction that happened to be served
// last in Nominatim's queue, which is a far better trade than an opaque
// crash (the user just sees "address not found" and can fix the typo).
const REQUEST_TIMEOUT_MS = 4000

async function fetchWithRetry(url: string, maxRetries = 1): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'MesureMG/1.0',
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
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

type GeocodeMatchResult = {
  lat: number
  lon: number
  displayName: string
  address?: NominatimAddressDetails
  importance?: number
  alternatives?: (GeocodeMatch & { displayName: string })[]
}

// Single Nominatim lookup for the exact text given, with caching. No street-
// type fallback here — see geocodeAddress for that.
async function geocodeAddressOnce(address: string): Promise<GeocodeMatchResult | null> {
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

// Common Québec French street-type designators. Nominatim treats these as
// distinct exact tokens (no fuzzy/synonym matching between them), so a
// dispatcher writing "rue" for what's actually an "avenue" or "route" makes
// the whole query fail even though the rest of the address is correct —
// this was observed twice in the same real weekly-planning email.
const STREET_TYPES = [
  'rue',
  'avenue',
  'boulevard',
  'route',
  'chemin',
  'place',
  'promenade',
  'allée',
  'allee',
  'montée',
  'montee',
  'rang',
  'impasse',
]

function findStreetTypeToken(address: string): { type: string; start: number; end: number } | null {
  const re = new RegExp(`\\b(${STREET_TYPES.join('|')})\\b`, 'i')
  const match = re.exec(address)
  if (!match) return null
  return { type: match[1], start: match.index, end: match.index + match[1].length }
}

// Substitutes the detected street-type word with every other known
// designator, keeping the rest of the address untouched.
function buildStreetTypeVariants(address: string): string[] {
  const found = findStreetTypeToken(address)
  if (!found) return []
  const lowerType = found.type.toLowerCase()
  return STREET_TYPES.filter((t) => t !== lowerType).map(
    (t) => address.slice(0, found.start) + t + address.slice(found.end)
  )
}

export async function geocodeAddress(address: string): Promise<
  (GeocodeMatchResult & {
    // Set when the address as typed matched nothing, but substituting the
    // street-type word found a real place — lets the caller flag the
    // correction instead of silently hiding the typo.
    matchedQuery?: string
  })
  | null
> {
  const direct = await geocodeAddressOnce(address)
  if (direct) return direct

  // Try every street-type substitution (rue/avenue/boulevard/...) in
  // parallel rather than one at a time: with up to 12 variants, a
  // sequential loop can take 10+ seconds against the public Nominatim
  // server when the address genuinely doesn't match anything — enough to
  // hit Vercel's serverless function timeout and surface as a generic
  // "geocoding failed" error. Racing them keeps the worst case bounded by
  // the slowest single request instead of their sum.
  const variants = buildStreetTypeVariants(address)
  const attempts = await Promise.allSettled(
    variants.map(async (variant) => {
      const result = await geocodeAddressOnce(variant)
      if (!result) throw new Error('no match')
      return { ...result, matchedQuery: variant }
    })
  )
  // Preserve variants' order (first street-type substitution wins) even
  // though the requests themselves ran concurrently.
  for (const attempt of attempts) {
    if (attempt.status === 'fulfilled') return attempt.value
  }

  return null
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
// unrelated town with far lower importance — a false positive. Note: for
// heritage street names in dense old-town cores (e.g. Vieux-Québec), Nominatim
// often assigns comparably tiny importance scores to every match regardless
// of relevance to the query, so this alone isn't always enough — see the FSA
// check below.
const MIN_RELATIVE_IMPORTANCE = 0.5

// Extracts a Canadian postal code's Forward Sortation Area (first 3
// characters, e.g. "G1R" from "G1R 3Z2") — reliably identifies the postal
// district/region and is far more precise than city-name text matching,
// since province names ("Québec") are ambiguous between the city and the
// province and don't help Nominatim's free-text search disambiguate.
function extractFSA(text: string): string | null {
  const match = text.match(/([A-Za-z]\d[A-Za-z])\s*\d[A-Za-z]\d/)
  return match ? match[1].toUpperCase() : null
}

function isAmbiguousMatch(
  query: string,
  top: { displayName: string; importance?: number },
  alternatives: { displayName: string; importance?: number; address?: NominatimAddressDetails }[]
): boolean {
  if (alternatives.length === 0) return false
  const topKey = extractLocalityKey(top.displayName)
  const queryFSA = extractFSA(query)

  return alternatives.some((alt) => {
    if (extractLocalityKey(alt.displayName) === topKey) return false

    // If the user typed a Canadian postal code and this alternate's own
    // postcode is in a clearly different postal district, it's almost
    // certainly not what they meant — just a same-named street elsewhere.
    if (queryFSA && alt.address?.postcode) {
      const altFSA = extractFSA(alt.address.postcode)
      if (altFSA && altFSA !== queryFSA) return false
    }

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
          const ambiguous = isAmbiguousMatch(address, result, alternatives)
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
            correctedAddress: result.matchedQuery,
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
