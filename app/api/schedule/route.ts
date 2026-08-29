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

    // Route each day via OSRM directly (calling our own /api/route over HTTP
    // fails behind Vercel preview protection). calculateRoute closes the loop
    // back to the first waypoint (the start address) by itself. On failure we
    // throw so the schedule optimizer falls back to an unoptimized plan.
    const osrmOptimizer = async (
      waypoints: Array<{ id: string; lat: number; lon: number; displayName: string }>
    ) => {
      const route = await calculateRoute(waypoints)
      if (route.status === 'failed') {
        throw new Error(route.error || 'Routing calculation failed')
      }
      return { route }
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
