import { AddressInput, ScheduleConstraints, MeasurementSchedule, DailyPlan, DailyStop, RouteResponse } from './types'
import { daysUntilDate, isOverdue, getPriority, formatDateToISO } from './utils'

const DEFAULT_CONSTRAINTS: ScheduleConstraints = {
  maxStopsPerDay: 6,
  workingDays: [1, 2, 3, 4, 5], // Mon-Fri
  prioritizeDeadlines: true,
  balanceLoadAndDistance: true,
  allowOverdueAddresses: true,
}

// Main: Generate optimized schedule
export async function generateMeasurementSchedule(
  addresses: AddressInput[],
  constraints: ScheduleConstraints = DEFAULT_CONSTRAINTS,
  osrmOptimizer: (waypoints: Array<{ lat: number; lon: number }>) => Promise<RouteResponse>,
  startPoint?: AddressInput
): Promise<MeasurementSchedule> {
  // Validate addresses have dates
  const validAddresses = addresses.filter((a) => a.measurementDate && a.deadlineDate && a.geocodedCoords)
  if (validAddresses.length === 0) {
    throw new Error('No addresses with valid dates and coordinates')
  }

  // Sort by deadline urgency
  const sorted = validAddresses.sort(
    (a, b) => a.deadlineDate!.getTime() - b.deadlineDate!.getTime()
  )

  // Group addresses into days (intelligent deadline-aware grouping)
  const dailyGroups = groupAddressesByDay(sorted, constraints)

  // Optimize routes for each day via OSRM
  const dailyPlans: DailyPlan[] = []
  for (const [dayDate, addrsForDay] of dailyGroups) {
    // Create round-trip route: start → stops → start
    const waypoints = []
    if (startPoint?.geocodedCoords) {
      waypoints.push({
        lat: startPoint.geocodedCoords.lat,
        lon: startPoint.geocodedCoords.lon,
      })
    }
    waypoints.push(
      ...addrsForDay.map((a) => ({
        lat: a.geocodedCoords!.lat,
        lon: a.geocodedCoords!.lon,
      }))
    )
    if (startPoint?.geocodedCoords) {
      waypoints.push({
        lat: startPoint.geocodedCoords.lat,
        lon: startPoint.geocodedCoords.lon,
      })
    }

    try {
      const route = await osrmOptimizer(waypoints)
      const plan = createDailyPlan(dayDate, addrsForDay, route, constraints)
      dailyPlans.push(plan)
    } catch (err) {
      console.error(`Failed to optimize route for ${dayDate}:`, err)
      // Create plan without optimization
      const plan = createDailyPlanWithoutOptimization(dayDate, addrsForDay, constraints)
      dailyPlans.push(plan)
    }
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

// Intelligent grouping: deadline-first + prefer measurement date
function groupAddressesByDay(
  addresses: AddressInput[],
  constraints: ScheduleConstraints
): Map<string, AddressInput[]> {
  const groups = new Map<string, AddressInput[]>()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (const addr of addresses) {
    const preferredDay = new Date(addr.measurementDate!)
    preferredDay.setHours(0, 0, 0, 0)
    const latestDay = new Date(addr.deadlineDate!)
    latestDay.setHours(0, 0, 0, 0)

    // Find best working day respecting capacity and deadline
    let assignedDay = findBestWorkingDay(preferredDay, latestDay, groups, constraints, today)

    const dayKey = formatDateToISO(assignedDay)
    if (!groups.has(dayKey)) groups.set(dayKey, [])
    groups.get(dayKey)!.push(addr)
  }

  // Sort groups by date
  return new Map([...groups.entries()].sort())
}

function findBestWorkingDay(
  preferredDay: Date,
  latestDay: Date,
  groups: Map<string, AddressInput[]>,
  constraints: ScheduleConstraints,
  today: Date
): Date {
  // IMPORTANT: preferredDay is the measurement date — must not be scheduled BEFORE it
  // Start from preferred day (or today if preferred is in past, since we can't measure in past)
  let candidate = new Date(Math.max(preferredDay.getTime(), today.getTime()))
  candidate.setHours(0, 0, 0, 0)
  const maxDays = 365

  for (let i = 0; i < maxDays; i++) {
    const dayKey = formatDateToISO(candidate)

    // Check if working day and has capacity
    if (isWorkingDay(candidate, constraints)) {
      const capacity = groups.get(dayKey)?.length ?? 0
      if (capacity < constraints.maxStopsPerDay) {
        // Validate deadline not exceeded
        if (candidate <= latestDay) {
          return candidate
        }
      }
    }

    candidate.setDate(candidate.getDate() + 1)
  }

  // Fallback: return latest allowed day (even if full)
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
  constraints: ScheduleConstraints
): DailyPlan {
  const date = new Date(dayDate + 'T00:00:00')
  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' })

  // Filter waypoints: skip the synthetic start/end points added for round-trip
  // Keep only the actual address stops (middle waypoints)
  const stopsWaypoints = route.route.waypoints.slice(1, -1)

  const stops: DailyStop[] = stopsWaypoints.map((wp, idx) => {
    // Find matching address by coordinates
    const wpLat = typeof wp.lat === 'string' ? parseFloat(wp.lat) : wp.lat
    const wpLon = typeof wp.lon === 'string' ? parseFloat(wp.lon) : wp.lon
    const originalAddr = addresses.find(
      (a) => Math.abs(a.geocodedCoords!.lat - wpLat) < 0.0001 &&
             Math.abs(a.geocodedCoords!.lon - wpLon) < 0.0001
    ) || addresses[0]
    const daysLeft = daysUntilDate(originalAddr.deadlineDate!, date)

    return {
      id: `stop-${date.getTime()}-${idx}`,
      dailyPlanId: 'temp',
      addressId: originalAddr.id,
      sequenceNumber: idx + 1,
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
      priority: getPriority(originalAddr.deadlineDate!),
      distanceFromPrevious: idx === 0 ? undefined : route.route.segments[idx]?.distance,
      durationFromPrevious: idx === 0 ? undefined : route.route.segments[idx]?.duration,
    }
  })

  return {
    id: `plan-${date.getTime()}`,
    scheduleId: 'temp',
    date,
    dayOfWeek,
    stops,
    routeGeometry: route.route.segments[0]?.geometry,
    metrics: {
      totalDistance: route.route.totalDistance,
      totalDuration: route.route.totalDuration,
      stopCount: stops.length,
      feasible: stops.length <= constraints.maxStopsPerDay,
    },
    constraints: {
      maxStops: constraints.maxStopsPerDay,
    },
  }
}

// Create DailyPlan without route optimization (fallback)
function createDailyPlanWithoutOptimization(
  dayDate: string,
  addresses: AddressInput[],
  constraints: ScheduleConstraints
): DailyPlan {
  const date = new Date(dayDate + 'T00:00:00')
  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' })

  const stops: DailyStop[] = addresses.map((addr, idx) => {
    const daysLeft = daysUntilDate(addr.deadlineDate!, date)
    return {
      id: `stop-${date.getTime()}-${idx}`,
      dailyPlanId: 'temp',
      addressId: addr.id,
      sequenceNumber: idx + 1,
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
      priority: getPriority(addr.deadlineDate!),
    }
  })

  return {
    id: `plan-${date.getTime()}`,
    scheduleId: 'temp',
    date,
    dayOfWeek,
    stops,
    metrics: {
      totalDistance: 0,
      totalDuration: 0,
      stopCount: stops.length,
      feasible: stops.length <= constraints.maxStopsPerDay,
    },
    constraints: {
      maxStops: constraints.maxStopsPerDay,
    },
  }
}

// TODO: Implement load balancing across days in future enhancement
// Simple load balancing would move addresses from full days to under-capacity days
