import { NextRequest, NextResponse } from 'next/server'
import { AddressInput, ScheduleConstraints, ApiErrorBody } from '@/app/lib/types'
import { generateMeasurementSchedule } from '@/app/lib/scheduleOptimizer'
import { calculateRoute } from '@/app/lib/osrm'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { addresses, constraints } = body

    // Validate input
    if (!Array.isArray(addresses) || addresses.length === 0) {
      const error: ApiErrorBody = {
        error: 'At least 1 address with dates is required',
        errorCode: 'EMPTY_ADDRESSES',
      }
      return NextResponse.json(error, { status: 400 })
    }

    // Extract start point and stops with valid dates/coordinates
    const startPoint = addresses.find((a: any) => a.isStartPoint)
    const validAddresses = addresses.filter(
      (a: any) =>
        !a.isStartPoint &&
        a.measurementDate &&
        a.deadlineDate &&
        a.geocodedCoords &&
        a.geocodedCoords.lat &&
        a.geocodedCoords.lon
    )

    if (validAddresses.length === 0) {
      const error: ApiErrorBody = {
        error: 'No measurement stops with valid dates and coordinates',
        errorCode: 'MISSING_DATES',
      }
      return NextResponse.json(error, { status: 400 })
    }

    // Parse dates (they come as ISO strings)
    const parsedAddresses: AddressInput[] = validAddresses.map((a: any) => ({
      ...a,
      measurementDate: new Date(a.measurementDate),
      deadlineDate: new Date(a.deadlineDate),
    }))

    // Use provided constraints or defaults
    const scheduleConstraints: ScheduleConstraints = constraints || {
      maxStopsPerDay: 6,
      workingDays: [1, 2, 3, 4, 5],
      prioritizeDeadlines: true,
      balanceLoadAndDistance: true,
      allowOverdueAddresses: true,
    }

    // Call OSRM for route optimization directly
    const osrmOptimizer = async (waypoints: Array<{ lat: number; lon: number }>) => {
      if (waypoints.length < 2) {
        return {
          route: {
            id: 'mock-route',
            waypoints: waypoints.map((wp, idx) => ({
              id: `wp-${idx}`,
              routeId: 'mock-route',
              originalAddressId: 'mock',
              sequence: idx + 1,
              lat: wp.lat,
              lon: wp.lon,
              displayName: `Waypoint ${idx + 1}`,
              isStartPoint: idx === 0,
              isEndPoint: idx === waypoints.length - 1,
            })),
            segments: waypoints.slice(0, -1).map((_, idx) => ({
              id: `seg-${idx}`,
              routeId: 'mock-route',
              fromWaypoint: `wp-${idx}`,
              toWaypoint: `wp-${idx + 1}`,
              sequence: idx + 1,
              distance: 5000,
              duration: 600,
            })),
            totalDistance: (waypoints.length - 1) * 5000,
            totalDuration: (waypoints.length - 1) * 600,
            optimizationGain: 0,
            status: 'success' as const,
          },
        }
      }

      try {
        // Call OSRM directly instead of via /api/route
        const validatedWaypoints = waypoints.map((wp, i) => ({
          id: `wp-${i}`,
          lat: wp.lat,
          lon: wp.lon,
          displayName: `Stop ${i + 1}`,
        }))

        const route = await calculateRoute(validatedWaypoints)
        return { route }
      } catch (err) {
        console.error('OSRM optimization failed, using mock data:', err instanceof Error ? err.message : String(err))
        // Fallback: return mock route
        return {
          route: {
            id: 'fallback-route',
            waypoints: waypoints.map((wp, idx) => ({
              id: `wp-${idx}`,
              routeId: 'fallback-route',
              originalAddressId: 'mock',
              sequence: idx + 1,
              lat: wp.lat,
              lon: wp.lon,
              displayName: `Stop ${idx + 1}`,
              isStartPoint: idx === 0,
              isEndPoint: idx === waypoints.length - 1,
            })),
            segments: waypoints.slice(0, -1).map((_, idx) => ({
              id: `seg-${idx}`,
              routeId: 'fallback-route',
              fromWaypoint: `wp-${idx}`,
              toWaypoint: `wp-${idx + 1}`,
              sequence: idx + 1,
              distance: 5000,
              duration: 600,
            })),
            totalDistance: (waypoints.length - 1) * 5000,
            totalDuration: (waypoints.length - 1) * 600,
            optimizationGain: 0,
            status: 'success' as const,
          },
        }
      }
    }

    // Generate schedule with start point for round-trip routes
    const parsedStartPoint = startPoint ? {
      ...startPoint,
      measurementDate: new Date(),
      deadlineDate: new Date(),
    } : null

    const schedule = await generateMeasurementSchedule(parsedAddresses, scheduleConstraints, osrmOptimizer, parsedStartPoint as any)

    return NextResponse.json(schedule, { status: 200 })
  } catch (err) {
    const error: ApiErrorBody = {
      error: err instanceof Error ? err.message : 'Schedule generation failed',
      errorCode: 'SCHEDULE_GENERATION_FAILED',
    }
    return NextResponse.json(error, { status: 500 })
  }
}
