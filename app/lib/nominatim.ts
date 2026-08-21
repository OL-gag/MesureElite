// Nominatim Geocoding Client (OpenStreetMap)
// Converts address text → lat/lon coordinates

import { GeocodeResponse } from './types'

const NOMINATIM_BASE_URL = process.env.NEXT_PUBLIC_NOMINATIM_BASE_URL || 'https://nominatim.openstreetmap.org'
const CACHE_KEY = 'nominatim_cache'
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

interface CacheEntry {
  result: { lat: number; lon: number; display_name: string }[]
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

export async function geocodeAddress(address: string): Promise<{
  lat: number
  lon: number
  displayName: string
  alternatives?: { lat: number; lon: number; displayName: string }[]
} | null> {
  // Check cache first
  const cache = getCache()
  if (cache[address] && isCacheValid(cache[address].timestamp)) {
    const cached = cache[address].result[0]
    if (cached) {
      return {
        lat: parseFloat(cached.lat.toString()),
        lon: parseFloat(cached.lon.toString()),
        displayName: cached.display_name,
      }
    }
  }

  try {
    const query = encodeURIComponent(address)
    const url = `${NOMINATIM_BASE_URL}/search?q=${query}&format=json&limit=3`

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
      alternatives: results.slice(1).map((r) => ({
        lat: parseFloat(r.lat),
        lon: parseFloat(r.lon),
        displayName: r.display_name,
      })),
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Nominatim geocoding failed: ${message}`)
  }
}

export async function geocodeMultiple(addresses: string[]): Promise<GeocodeResponse> {
  const results = await Promise.allSettled(
    addresses.map(async (address) => {
      try {
        const result = await geocodeAddress(address)
        if (result) {
          return {
            address,
            status: 'valid' as const,
            lat: result.lat,
            lon: result.lon,
            displayName: result.displayName,
            alternatives: result.alternatives,
          }
        } else {
          return {
            address,
            status: 'invalid' as const,
            error: `Address not found: "${address}". Please check spelling.`,
          }
        }
      } catch (error) {
        return {
          address,
          status: 'invalid' as const,
          error: error instanceof Error ? error.message : 'Geocoding failed',
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
    }
  })

  return {
    results: processedResults as any,
    validCount: processedResults.filter((r) => r.status === 'valid').length,
    invalidCount: processedResults.filter((r) => r.status !== 'valid').length,
  }
}
