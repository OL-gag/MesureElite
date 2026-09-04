import { AddressInput, ScheduleConstraints, MeasurementSchedule, DailyPlan, DailyStop, RouteResponse } from './types'
import { daysUntilDate, isOverdue, getPriority, formatDateToISO, haversineDistanceKm } from './utils'

export const DEFAULT_CONSTRAINTS: ScheduleConstraints = {
  maxStopsPerDay: 5,
  absoluteMaxStopsPerDay: 6,
  workingDays: [1, 2, 3, 4, 5], // Mon-Fri
  prioritizeDeadlines: true,
  balanceLoadAndDistance: true,
  allowOverdueAddresses: true,
}

// When choosing among several dates that all satisfy an address's own
// measurement-date/deadline window, a day already visiting within this
// radius is preferred over an emptier, more distant day — avoids sending
// the technician back to the same far sector a couple of days apart just
// because the earliest open slot happened to fall elsewhere. Deadlines are
// still the hard constraint; this only breaks ties among otherwise-valid
// days (see findBestWorkingDay).
const SAME_SECTOR_KM = 20

// The schedule only needs the start address's coordinates, so accept anything
// that carries them (the API hands us the raw request start point).
export interface ScheduleStartPoint {
  geocodedCoords?: { lat: number; lon: number; displayName: string }
}

// Merges a client-supplied (partial, possibly malformed) constraints object
// onto DEFAULT_CONSTRAINTS — callers only need to send the fields they're
// actually overriding — with a sanity clamp on the two capacity fields
// (positive integers, ceiling >= target) falling back to defaults otherwise.
export function mergeConstraints(partial?: Partial<ScheduleConstraints> | null): ScheduleConstraints {
  const merged: ScheduleConstraints = { ...DEFAULT_CONSTRAINTS, ...partial }

  if (
    typeof merged.maxStopsPerDay !== 'number' ||
    !Number.isInteger(merged.maxStopsPerDay) ||
    merged.maxStopsPerDay < 1
  ) {
    merged.maxStopsPerDay = DEFAULT_CONSTRAINTS.maxStopsPerDay
  }
  if (
    typeof merged.absoluteMaxStopsPerDay !== 'number' ||
    !Number.isInteger(merged.absoluteMaxStopsPerDay) ||
    merged.absoluteMaxStopsPerDay < merged.maxStopsPerDay
  ) {
    merged.absoluteMaxStopsPerDay = merged.maxStopsPerDay + 1
  }

  return merged
}

// Main: Generate optimized schedule. `today` is the client's calendar day —
// the server clock may be in a different timezone than the user.
export async function generateMeasurementSchedule(
  addresses: AddressInput[],
  constraints: ScheduleConstraints = DEFAULT_CONSTRAINTS,
  osrmOptimizer: (
    waypoints: Array<{ id: string; lat: number; lon: number; displayName: string }>
  ) => Promise<RouteResponse>,
  startPoint?: ScheduleStartPoint,
  today?: Date
): Promise<MeasurementSchedule> {
  // Validate addresses have dates
  const validAddresses = addresses.filter((a) => a.measurementDate && a.deadlineDate && a.geocodedCoords)
  if (validAddresses.length === 0) {
    throw new Error('No addresses with valid dates and coordinates')
  }

  // Sort by deadline urgency, then — for stops sharing a deadline — by how
  // little flexibility each one has (narrowest measurementDate→deadlineDate
  // window first). Without this, a flexible stop processed before a rigid,
  // forced-to-one-day stop in the same sector picks an arbitrary empty day
  // (nothing yet anchors it there), and the forced stop then lands alone on
  // its own day later — two separate trips to the same area instead of one.
  // Processing the rigid stop first gives the flexible one something to
  // cluster onto (copy: don't reorder the caller's array).
  const sorted = [...validAddresses].sort((a, b) => {
    const deadlineDiff = a.deadlineDate!.getTime() - b.deadlineDate!.getTime()
    if (deadlineDiff !== 0) return deadlineDiff
    const windowA = a.deadlineDate!.getTime() - a.measurementDate!.getTime()
    const windowB = b.deadlineDate!.getTime() - b.measurementDate!.getTime()
    return windowA - windowB
  })

  // Group addresses into days (intelligent deadline-aware grouping)
  const dailyGroups = groupAddressesByDay(sorted, constraints, today)

  // Optimize routes for each day via OSRM
  const dailyPlans: DailyPlan[] = []
  for (const [dayDate, addrsForDay] of dailyGroups) {
    dailyPlans.push(await regenerateDayPlan(dayDate, addrsForDay, constraints, osrmOptimizer, startPoint))
  }

  // Optional: Load balancing (future enhancement)
  // if (constraints.balanceLoadAndDistance) {
  //   _balanceScheduleLoad(dailyPlans, constraints)
  // }

  // Validate all deadlines respected (basic check, not critical for metadata)
  dailyPlans.forEach((plan) =>
    plan.stops.forEach((stop) => {
      if (new Date(plan.date) > stop.measurements.deadlineDate) {
        console.warn(`Address ${stop.addressId} scheduled after deadline`)
      }
    })
  )

  return {
    id: `schedule-${Date.now()}`,
    addressListId: 'temp', // Will be set by caller
    dailyPlans,
    generatedAt: new Date(),
    constraints,
    metadata: {
      totalDistance: dailyPlans.reduce((sum, p) => sum + p.metrics.totalDistance, 0),
      totalDuration: dailyPlans.reduce((sum, p) => sum + p.metrics.totalDuration, 0),
      totalAddresses: dailyPlans.reduce((sum, p) => sum + p.stops.length, 0),
      addressesOnDeadline: dailyPlans.reduce(
        (sum, p) => sum + p.stops.filter((s) => s.measurements.daysUntilDeadline <= 1).length,
        0
      ),
    },
  }
}

// Builds one day's optimized plan (try OSRM, fall back to an unoptimized
// straight-line plan on failure) — shared by generateMeasurementSchedule's
// per-day loop and by a standalone single-day recompute (e.g. moving one
// stop to another day: only the two affected days need to call this, every
// other day's already-built DailyPlan is left completely untouched).
export async function regenerateDayPlan(
  dayDate: string,
  addrsForDay: AddressInput[],
  constraints: ScheduleConstraints,
  osrmOptimizer: (
    waypoints: Array<{ id: string; lat: number; lon: number; displayName: string }>
  ) => Promise<RouteResponse>,
  startPoint?: ScheduleStartPoint
): Promise<DailyPlan> {
  // Send start + stops only: calculateRoute closes the loop back to the
  // first waypoint itself (and appends a synthetic isEndPoint waypoint),
  // so adding the start again here would double the return leg.
  const hasStart = !!startPoint?.geocodedCoords
  const waypoints: Array<{ id: string; lat: number; lon: number; displayName: string }> = []
  if (startPoint?.geocodedCoords) {
    waypoints.push({
      id: 'start',
      lat: startPoint.geocodedCoords.lat,
      lon: startPoint.geocodedCoords.lon,
      displayName: startPoint.geocodedCoords.displayName,
    })
  }
  waypoints.push(
    ...addrsForDay.map((a) => ({
      id: a.id,
      lat: a.geocodedCoords!.lat,
      lon: a.geocodedCoords!.lon,
      displayName: a.geocodedCoords!.displayName,
    }))
  )

  try {
    const route = await osrmOptimizer(waypoints)
    return createDailyPlan(dayDate, addrsForDay, route, constraints, hasStart)
  } catch (err) {
    console.error(`Failed to optimize route for ${dayDate}:`, err)
    return createDailyPlanWithoutOptimization(dayDate, addrsForDay, constraints, startPoint)
  }
}

// Intelligent grouping: deadline-first + prefer measurement date
function groupAddressesByDay(
  addresses: AddressInput[],
  constraints: ScheduleConstraints,
  clientToday?: Date
): Map<string, AddressInput[]> {
  const groups = new Map<string, AddressInput[]>()
  const today = clientToday ? new Date(clientToday) : new Date()
  today.setHours(0, 0, 0, 0)

  for (const addr of addresses) {
    const preferredDay = new Date(addr.measurementDate!)
    preferredDay.setHours(0, 0, 0, 0)
    const latestDay = new Date(addr.deadlineDate!)
    latestDay.setHours(0, 0, 0, 0)

    // Find best working day respecting capacity and deadline
    let assignedDay = findBestWorkingDay(addr, preferredDay, latestDay, groups, constraints, today)

    const dayKey = formatDateToISO(assignedDay)
    if (!groups.has(dayKey)) groups.set(dayKey, [])
    groups.get(dayKey)!.push(addr)
  }

  // Sort groups by date
  return new Map([...groups.entries()].sort())
}

function findBestWorkingDay(
  address: AddressInput,
  preferredDay: Date,
  latestDay: Date,
  groups: Map<string, AddressInput[]>,
  constraints: ScheduleConstraints,
  today: Date
): Date {
  // IMPORTANT: preferredDay is the measurement date — must not be scheduled BEFORE it
  // Start from preferred day (or today if preferred is in past, since we can't measure in past)
  const windowStart = new Date(Math.max(preferredDay.getTime(), today.getTime()))
  windowStart.setHours(0, 0, 0, 0)

  // Every working day inside [windowStart, latestDay] whose current load is
  // under capacityLimit — geography then picks among them below instead of
  // just taking the earliest.
  const collectValidDays = (capacityLimit: number): Date[] => {
    const days: Date[] = []
    const candidate = new Date(windowStart)
    const maxDays = 365
    for (let i = 0; i < maxDays && candidate <= latestDay; i++) {
      const dayKey = formatDateToISO(candidate)
      if (isWorkingDay(candidate, constraints)) {
        const capacity = groups.get(dayKey)?.length ?? 0
        if (capacity < capacityLimit) {
          days.push(new Date(candidate))
        }
      }
      candidate.setDate(candidate.getDate() + 1)
    }
    return days
  }

  // Prefer whichever candidate day already has a stop within SAME_SECTOR_KM;
  // ties (including "no day is close enough") keep the earliest day, since
  // `days` is in ascending date order and `<` only replaces on a strict
  // improvement.
  const pickBest = (days: Date[]): Date => {
    if (!address.geocodedCoords) return days[0]
    let best = days[0]
    let bestScore = Infinity
    for (const day of days) {
      const dayAddresses = groups.get(formatDateToISO(day)) ?? []
      const nearestKm = dayAddresses.reduce((min, other) => {
        if (!other.geocodedCoords) return min
        return Math.min(
          min,
          haversineDistanceKm(
            address.geocodedCoords!.lat,
            address.geocodedCoords!.lon,
            other.geocodedCoords.lat,
            other.geocodedCoords.lon
          )
        )
      }, Infinity)
      const score = nearestKm <= SAME_SECTOR_KM ? nearestKm : Infinity
      if (score < bestScore) {
        bestScore = score
        best = day
      }
    }
    return best
  }

  // Pass 1: keep the day at or under the soft target (5 by default).
  const softDays = collectValidDays(constraints.maxStopsPerDay)
  if (softDays.length > 0) return pickBest(softDays)

  // Pass 2: the soft target leaves no valid day in the window — allow up to
  // the absolute ceiling (6) instead, since the deadline still has to be met.
  const hardDays = collectValidDays(constraints.absoluteMaxStopsPerDay)
  if (hardDays.length > 0) return pickBest(hardDays)

  // Last resort: no capacity anywhere in the window even at the ceiling —
  // return latest allowed day (even if it ends up further overloaded), since
  // the deadline must still be respected above all else.
  return new Date(latestDay)
}

function isWorkingDay(date: Date, constraints: ScheduleConstraints): boolean {
  const dayOfWeek = date.getDay()
  const isoDay = dayOfWeek === 0 ? 7 : dayOfWeek // Convert to ISO (1=Mon, 7=Sun)
  return constraints.workingDays.includes(isoDay)
}

// Create DailyPlan from OSRM route
function createDailyPlan(
  dayDate: string,
  addresses: AddressInput[],
  route: RouteResponse,
  constraints: ScheduleConstraints,
  hasStart: boolean
): DailyPlan {
  const date = new Date(dayDate + 'T00:00:00')
  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' })

  // calculateRoute returns [start?, ...stops, synthetic return-to-start]:
  // keep only the actual address stops for the itinerary list.
  const stopsWaypoints = route.route.waypoints.filter(
    (wp) => !wp.isEndPoint && !(hasStart && wp.isStartPoint)
  )

  const stops: DailyStop[] = stopsWaypoints.map((wp, idx) => {
    // calculateRoute echoes each input waypoint's id as originalAddressId, and
    // we set those ids to the address ids — an exact join, no coordinate fuzz.
    const originalAddr = addresses.find((a) => a.id === wp.originalAddressId) || addresses[0]
    const daysLeft = daysUntilDate(originalAddr.deadlineDate!, date)

    return {
      id: `stop-${date.getTime()}-${idx}`,
      dailyPlanId: 'temp',
      addressId: originalAddr.id,
      // Use the route waypoint's sequence so list numbering matches the
      // numbered markers on the map (start is 1, first stop is 2, ...).
      sequenceNumber: wp.sequence,
      address: {
        text: originalAddr.text,
        lat: originalAddr.geocodedCoords!.lat,
        lon: originalAddr.geocodedCoords!.lon,
        displayName: originalAddr.geocodedCoords!.displayName,
      },
      measurements: {
        measurementDate: originalAddr.measurementDate!,
        deadlineDate: originalAddr.deadlineDate!,
        isOverdue: isOverdue(originalAddr.deadlineDate!, date),
        daysUntilDeadline: daysLeft,
      },
      priority: getPriority(originalAddr.deadlineDate!, date),
      reference: originalAddr.reference,
      // With a start point, leg idx arrives at stop idx (leg 0 = start → first
      // stop, so the first stop's distance from home is real data, not blank).
      distanceFromPrevious: hasStart
        ? route.route.segments[idx]?.distance
        : idx === 0
          ? undefined
          : route.route.segments[idx - 1]?.distance,
      durationFromPrevious: hasStart
        ? route.route.segments[idx]?.duration
        : idx === 0
          ? undefined
          : route.route.segments[idx - 1]?.duration,
    }
  })

  return {
    id: `plan-${date.getTime()}`,
    scheduleId: 'temp',
    date,
    dayOfWeek,
    stops,
    routeGeometry: route.route.segments[0]?.geometry,
    // Keep the full OSRM round-trip route so the schedule map renders the
    // real road geometry with the start point, like the results page does.
    route: route.route,
    metrics: {
      totalDistance: route.route.totalDistance,
      totalDuration: route.route.totalDuration,
      stopCount: stops.length,
      // The scheduler itself is allowed to go past maxStopsPerDay up to the
      // absolute ceiling when a deadline forces it (see findBestWorkingDay),
      // so that's the bar for genuinely "infeasible", not the soft target.
      feasible: stops.length <= constraints.absoluteMaxStopsPerDay,
    },
    constraints: {
      maxStops: constraints.absoluteMaxStopsPerDay,
    },
  }
}

// Create DailyPlan without route optimization (fallback). Builds a straight-line
// round-trip route (no road geometry) so the schedule map can still render the
// day the same way it renders an optimized one.
function createDailyPlanWithoutOptimization(
  dayDate: string,
  addresses: AddressInput[],
  constraints: ScheduleConstraints,
  startPoint?: ScheduleStartPoint
): DailyPlan {
  const date = new Date(dayDate + 'T00:00:00')
  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' })
  const hasStart = !!startPoint?.geocodedCoords
  const routeId = `fallback-${date.getTime()}`

  const stops: DailyStop[] = addresses.map((addr, idx) => {
    const daysLeft = daysUntilDate(addr.deadlineDate!, date)
    return {
      id: `stop-${date.getTime()}-${idx}`,
      dailyPlanId: 'temp',
      addressId: addr.id,
      // Keep numbering consistent with the map markers (start is 1)
      sequenceNumber: hasStart ? idx + 2 : idx + 1,
      address: {
        text: addr.text,
        lat: addr.geocodedCoords!.lat,
        lon: addr.geocodedCoords!.lon,
        displayName: addr.geocodedCoords!.displayName,
      },
      measurements: {
        measurementDate: addr.measurementDate!,
        deadlineDate: addr.deadlineDate!,
        isOverdue: isOverdue(addr.deadlineDate!, date),
        daysUntilDeadline: daysLeft,
      },
      priority: getPriority(addr.deadlineDate!, date),
      reference: addr.reference,
    }
  })

  // Straight-line round-trip: [start?, ...stops, synthetic return-to-start],
  // mirroring the shape calculateRoute produces (segments without geometry
  // render as straight lines on the map).
  const loopWaypoints = [
    ...(hasStart
      ? [
          {
            id: 'start',
            routeId,
            originalAddressId: 'start',
            sequence: 1,
            lat: startPoint!.geocodedCoords!.lat,
            lon: startPoint!.geocodedCoords!.lon,
            displayName: startPoint!.geocodedCoords!.displayName,
            isStartPoint: true,
            isEndPoint: false,
          },
        ]
      : []),
    ...stops.map((stop) => ({
      id: stop.id,
      routeId,
      originalAddressId: stop.addressId,
      sequence: stop.sequenceNumber,
      lat: stop.address.lat,
      lon: stop.address.lon,
      displayName: stop.address.displayName,
      isStartPoint: !hasStart && stop.sequenceNumber === 1,
      isEndPoint: false,
    })),
  ]

  const route = {
    id: routeId,
    waypoints: [
      ...loopWaypoints,
      {
        ...loopWaypoints[0],
        sequence: loopWaypoints.length + 1,
        isStartPoint: false,
        isEndPoint: true,
      },
    ],
    segments: loopWaypoints.map((wp, i) => ({
      id: `seg-${i}`,
      routeId,
      fromWaypoint: wp.id,
      toWaypoint: loopWaypoints[(i + 1) % loopWaypoints.length].id,
      sequence: i + 1,
      distance: 0,
      duration: 0,
    })),
    totalDistance: 0,
    totalDuration: 0,
    optimizationGain: 0,
    status: 'success' as const,
  }

  return {
    id: `plan-${date.getTime()}`,
    scheduleId: 'temp',
    date,
    dayOfWeek,
    stops,
    route,
    metrics: {
      totalDistance: 0,
      totalDuration: 0,
      stopCount: stops.length,
      feasible: stops.length <= constraints.absoluteMaxStopsPerDay,
    },
    constraints: {
      maxStops: constraints.absoluteMaxStopsPerDay,
    },
  }
}

// TODO: Implement load balancing across days in future enhancement
// Simple load balancing would move addresses from full days to under-capacity days
