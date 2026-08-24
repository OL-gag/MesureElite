// OSRM Routing Client (Open Source Routing Machine)
// Calculates optimal route for TSP (Traveling Salesman Problem)

import { RouteResponse } from './types'

const OSRM_BASE_URL = process.env.NEXT_PUBLIC_OSRM_BASE_URL || 'https://router.project-osrm.org'

interface OSRMRouteResponse {
  code: string
  routes: Array<{
    distance: number
    duration: number
    geometry: { type: 'LineString'; coordinates: [number, number][] }
    legs: Array<{
      distance: number
      duration: number
      summary: string
    }>
  }>
  waypoints?: Array<{
    distance: number
    name: string
    location: [number, number]
  }>
}

async function fetchWithRetry(url: string, maxRetries = 3): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url)

      if (response.status === 503) {
        // Service unavailable - wait and retry
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

  throw lastError || new Error('Routing failed after retries')
}

export async function calculateRoute(
  waypoints: Array<{ id: string; lat: number; lon: number; displayName: string }>
): Promise<RouteResponse['route']> {
  if (waypoints.length < 2) {
    throw new Error('At least 2 waypoints required')
  }

  if (waypoints.length > 25) {
    throw new Error('Maximum 25 waypoints allowed')
  }

  try {
    // Format coordinates for OSRM: lon1,lat1;lon2,lat2;...
    // The trip is a closed loop (FR-005): append the start coordinate again at
    // the end so OSRM also computes the final "last stop → start" leg, instead
    // of stopping after the last waypoint.
    const closedLoopWaypoints = [...waypoints, waypoints[0]]
    const coordinates = closedLoopWaypoints.map((wp) => `${wp.lon},${wp.lat}`).join(';')

    // Calculate original distance (baseline for optimization gain)
    const originalDistances = calculateOriginalDistance(waypoints)

    // Call OSRM API
    const url = `${OSRM_BASE_URL}/route/v1/car/${coordinates}?overview=full&geometries=geojson&steps=true`

    const response = await fetchWithRetry(url)

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`OSRM HTTP ${response.status}: Bad coordinates or unreachable waypoints. Response: ${text.substring(0, 200)}`)
    }

    const osrmData = (await response.json()) as OSRMRouteResponse

    if (osrmData.code !== 'Ok') {
      if (osrmData.code === 'NoRoute') {
        throw new Error(
          'One or more waypoints are not reachable by car. Please check the addresses.'
        )
      }
      throw new Error(`OSRM error: ${osrmData.code}`)
    }

    if (!osrmData.routes || osrmData.routes.length === 0) {
      throw new Error('No route found')
    }

    const route = osrmData.routes[0]
    const totalDistance = route.distance
    const totalDuration = route.duration
    const optimizationGain = originalDistances.total > 0
      ? ((originalDistances.total - totalDistance) / originalDistances.total) * 100
      : 0

    const routeId = `route-${Date.now()}`

    // Create segments from route legs
    const segments = route.legs.map((leg, index) => ({
      id: `seg-${index}`,
      routeId,
      fromWaypoint: waypoints[index].id,
      toWaypoint: waypoints[(index + 1) % waypoints.length].id,
      sequence: index + 1,
      distance: leg.distance,
      duration: leg.duration,
    }))

    // Create waypoints array with returned order
    const resultWaypoints = waypoints.map((wp, index) => ({
      id: wp.id,
      routeId,
      originalAddressId: wp.id,
      sequence: index + 1,
      lat: wp.lat,
      lon: wp.lon,
      displayName: wp.displayName,
      isStartPoint: index === 0,
      isEndPoint: false,
    }))

    // Mark return to start
    if (resultWaypoints.length > 0) {
      resultWaypoints.push({
        ...resultWaypoints[0],
        sequence: resultWaypoints.length + 1,
        isEndPoint: true,
      })
    }

    return {
      id: routeId,
      waypoints: resultWaypoints,
      segments,
      totalDistance,
      totalDuration,
      optimizationGain,
      status: 'success',
      geometry: route.geometry?.coordinates ?? [],
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      id: '',
      waypoints: [],
      segments: [],
      totalDistance: 0,
      totalDuration: 0,
      optimizationGain: 0,
      status: 'failed',
      error: `OSRM routing failed: ${message}`,
    }
  }
}

function calculateOriginalDistance(
  waypoints: Array<{ id: string; lat: number; lon: number; displayName: string }>
): { total: number; distances: number[] } {
  // Simple Haversine distance estimation (not actual routing)
  const R = 6371 // Earth radius in km

  function haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const dLat = toRad(lat2 - lat1)
    const dLon = toRad(lon2 - lon1)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c * 1000 // Convert to meters
  }

  function toRad(deg: number): number {
    return (deg * Math.PI) / 180
  }

  const distances: number[] = []
  let total = 0

  for (let i = 0; i < waypoints.length; i++) {
    const from = waypoints[i]
    const to = waypoints[(i + 1) % waypoints.length]
    const distance = haversineDistance(from.lat, from.lon, to.lat, to.lon)
    distances.push(distance)
    total += distance
  }

  return { total, distances }
}
