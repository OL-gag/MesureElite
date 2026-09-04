// POST /api/schedule/day
// Recomputes ONE day's optimized plan for a fixed stop list — used when
// moving a stop between days on /schedule: only the source and target days
// are recomputed here, every other already-built DailyPlan is left
// completely untouched (see app/schedule/page.tsx handleMoveStop).

import { NextRequest, NextResponse } from 'next/server'
import { AddressInput, ApiErrorBody } from '@/app/lib/types'
import { regenerateDayPlan, mergeConstraints } from '@/app/lib/scheduleOptimizer'
import { calculateRoute } from '@/app/lib/osrm'
import { parseCalendarDate } from '@/app/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { addresses, date, constraints } = body

    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const error: ApiErrorBody = { error: 'A date (YYYY-MM-DD) is required', errorCode: 'INVALID_ADDRESS_FORMAT' }
      return NextResponse.json(error, { status: 400 })
    }
    if (!Array.isArray(addresses) || addresses.length === 0) {
      const error: ApiErrorBody = { error: 'At least 1 stop with dates is required', errorCode: 'EMPTY_ADDRESSES' }
      return NextResponse.json(error, { status: 400 })
    }

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

    const parsedAddresses: AddressInput[] = validAddresses.map((a: any) => ({
      ...a,
      measurementDate: parseCalendarDate(a.measurementDate),
      deadlineDate: parseCalendarDate(a.deadlineDate),
    }))

    const scheduleConstraints = mergeConstraints(constraints)

    const osrmOptimizer = async (
      waypoints: Array<{ id: string; lat: number; lon: number; displayName: string }>
    ) => {
      const route = await calculateRoute(waypoints)
      if (route.status === 'failed') {
        throw new Error(route.error || 'Routing calculation failed')
      }
      return { route }
    }

    const plan = await regenerateDayPlan(date, parsedAddresses, scheduleConstraints, osrmOptimizer, startPoint)

    return NextResponse.json({ plan }, { status: 200 })
  } catch (err) {
    const error: ApiErrorBody = {
      error: err instanceof Error ? err.message : 'Day recalculation failed',
      errorCode: 'SCHEDULE_GENERATION_FAILED',
    }
    return NextResponse.json(error, { status: 500 })
  }
}
