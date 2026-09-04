import { NextRequest, NextResponse } from 'next/server'
import { AddressInput, ScheduleConstraints, ApiErrorBody } from '@/app/lib/types'
import { generateMeasurementSchedule, DEFAULT_CONSTRAINTS } from '@/app/lib/scheduleOptimizer'
import { calculateRoute } from '@/app/lib/osrm'

// Date-only strings ('YYYY-MM-DD', the user's calendar day) are anchored at
// the server's local midnight so all schedule math shares one anchor; full ISO
// instants (older clients) pass through unchanged.
function parseDateInput(value: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(value + 'T00:00:00') : new Date(value)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { addresses, constraints, clientToday } = body

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
        a.geocodedCoords.lat != null &&
        a.geocodedCoords.lon != null
    )

    if (validAddresses.length === 0) {
      const error: ApiErrorBody = {
        error: 'No measurement stops with valid dates and coordinates',
        errorCode: 'MISSING_DATES',
      }
      return NextResponse.json(error, { status: 400 })
    }

    // Parse dates (calendar-day strings from the client, or ISO instants)
    const parsedAddresses: AddressInput[] = validAddresses.map((a: any) => ({
      ...a,
      measurementDate: parseDateInput(a.measurementDate),
      deadlineDate: parseDateInput(a.deadlineDate),
    }))

    // "Today" from the client's calendar when provided — the server clock runs
    // in UTC and would otherwise schedule evening submissions a day late.
    const today =
      typeof clientToday === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(clientToday)
        ? parseDateInput(clientToday)
        : undefined

    // Merge (not replace) so the client only needs to send the fields it
    // actually wants to override — currently just the daily stop capacity.
    const scheduleConstraints: ScheduleConstraints = { ...DEFAULT_CONSTRAINTS, ...constraints }

    // Sanity-clamp a client-supplied capacity: must be a positive integer,
    // and the absolute ceiling must be at least the soft target.
    if (
      typeof scheduleConstraints.maxStopsPerDay !== 'number' ||
      !Number.isInteger(scheduleConstraints.maxStopsPerDay) ||
      scheduleConstraints.maxStopsPerDay < 1
    ) {
      scheduleConstraints.maxStopsPerDay = DEFAULT_CONSTRAINTS.maxStopsPerDay
    }
    if (
      typeof scheduleConstraints.absoluteMaxStopsPerDay !== 'number' ||
      !Number.isInteger(scheduleConstraints.absoluteMaxStopsPerDay) ||
      scheduleConstraints.absoluteMaxStopsPerDay < scheduleConstraints.maxStopsPerDay
    ) {
      scheduleConstraints.absoluteMaxStopsPerDay = scheduleConstraints.maxStopsPerDay + 1
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

    // Generate schedule with the start point for round-trip routes
    const schedule = await generateMeasurementSchedule(
      parsedAddresses,
      scheduleConstraints,
      osrmOptimizer,
      startPoint,
      today
    )

    return NextResponse.json(schedule, { status: 200 })
  } catch (err) {
    const error: ApiErrorBody = {
      error: err instanceof Error ? err.message : 'Schedule generation failed',
      errorCode: 'SCHEDULE_GENERATION_FAILED',
    }
    return NextResponse.json(error, { status: 500 })
  }
}
