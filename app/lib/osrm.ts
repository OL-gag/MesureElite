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
      steps: Array<{
        geometry: { type: 'LineString'; coordinates: [number, number][] }
      }>
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

      // Return even non-ok responses (e.g. OSRM answers 400 with a structured
      // { code: 'NoRoute', ... } body for unreachable waypoints) so the
      // caller can inspect the JSON payload instead of only a generic HTTP
      // status — retrying wouldn't help for a deterministic routing error.
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
    // OSRM answers routing errors (e.g. NoRoute) with a structured JSON body
    // even on a non-2xx status, so parse it before deciding how to fail —
    // relying on response.ok alone would discard that detail.
    const osrmData = (await response.json().catch(() => null)) as OSRMRouteResponse | null

    if (osrmData?.code === 'NoRoute') {
      // Usually means a waypoint was geocoded to a location OSRM's road
      // network can't reach by car from the others (e.g. a wrong, far-away
      // match from an under-specified address) — a distinct, actionable
      // error rather than a generic routing failure.
      return {
        id: '',
        waypoints: [],
        segments: [],
        totalDistance: 0,
        totalDuration: 0,
        optimizationGain: 0,
        status: 'failed',
        error: 'One or more waypoints are not reachable by car. Please check the addresses.',
        errorCode: 'WAYPOINTS_UNREACHABLE',
      }
    }

    if (!response.ok) {
      throw new Error(`OSRM HTTP ${response.status}: Bad coordinates or unreachable waypoints.`)
    }

    if (!osrmData || osrmData.code !== 'Ok') {
      throw new Error(`OSRM error: ${osrmData?.code ?? 'unknown'}`)
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

    // Create segments from route legs, concatenating each leg's step
    // geometries into a single road-following path per segment (OSRM's
    // top-level route.geometry is one combined line for the whole trip and
    // doesn't expose per-leg boundaries, so this is built from the steps
    // instead — needed to color each segment individually on the map).
    const segments = route.legs.map((leg, index) => ({
      id: `seg-${index}`,
      routeId,
      fromWaypoint: waypoints[index].id,
      toWaypoint: waypoints[(index + 1) % waypoints.length].id,
      sequence: index + 1,
      distance: leg.distance,
      duration: leg.duration,
      geometry: leg.steps.flatMap((step) => step.geometry.coordinates),
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
        isStartPoint: false,
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
      errorCode: 'ROUTING_FAILED',
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
