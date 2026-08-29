# Data Model: Schedule Planning & Route Optimization

**Created**: 2026-08-27  
**Scope**: Schedule generation, daily route plans, and constraints

## Entity: MeasurementSchedule (New)

Represents a generated measurement schedule for a set of addresses.

```typescript
export interface MeasurementSchedule {
  id: string
  addressListId: string
  dailyPlans: DailyPlan[]
  generatedAt: Date
  constraints: ScheduleConstraints
  metadata: {
    totalDistance: number        // Sum of all days' distances
    totalDuration: number        // Sum of all days' durations
    totalAddresses: number       // Count of addresses scheduled
    addressesOnDeadline: number  // Count of addresses at risk (deadline < 24h)
  }
}
```

## Entity: DailyPlan (New)

Represents a single day's measurement itinerary.

```typescript
export interface DailyPlan {
  id: string
  scheduleId: string
  date: Date                     // The date this plan covers
  dayOfWeek: string              // "Monday", "Tuesday", etc.
  stops: DailyStop[]             // Ordered list of stops for this day
  routeGeometry?: [number, number][]  // GeoJSON coordinates of the optimized route
  metrics: {
    totalDistance: number        // km
    totalDuration: number        // seconds
    stopCount: number
    feasible: boolean            // true if fits workload constraints
  }
  constraints: {
    maxStops: number             // Max stops this day (default 15)
    maxDuration?: number         // Max travel time (optional)
    maxDistance?: number         // Max travel distance (optional)
  }
}
```

## Entity: DailyStop (New)

Represents a single stop within a daily plan.

```typescript
export interface DailyStop {
  id: string
  dailyPlanId: string
  addressId: string              // Reference to original AddressInput
  sequenceNumber: number         // Order in the day's route (1, 2, 3...)
  address: {
    text: string                 // Original address text
    lat: number
    lon: number
    displayName: string
  }
  measurements: {
    measurementDate: Date        // Preferred measurement date
    deadlineDate: Date           // Hard deadline
    isOverdue: boolean           // true if deadline has passed
    daysUntilDeadline: number    // Negative if overdue
  }
  priority: 'urgent' | 'normal' | 'flexible'  // Based on deadline proximity
  distanceFromPrevious?: number  // km from previous stop
  durationFromPrevious?: number  // seconds from previous stop
}
```

## Entity: ScheduleConstraints (New)

Constraints used when generating the schedule.

```typescript
export interface ScheduleConstraints {
  maxStopsPerDay: number         // Default: 6 (MesureMG standard)
  maxDurationPerDay?: number     // Optional: max travel time per day
  maxDistancePerDay?: number     // Optional: max distance per day
  workingDays: number[]          // Days of week (1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri) - default [1,2,3,4,5]
  // Note: 0=Sunday, 6=Saturday are excluded by default (rest days)
  prioritizeDeadlines: boolean   // true = respect deadlines first, minimize distance second
  balanceLoadAndDistance: boolean // true = balance between workload per day and travel distance
  allowOverdueAddresses: boolean // true = include addresses past deadline
}
```

## Algorithm: Schedule Generation

### Input
- `addressInputs`: Array of AddressInput objects with measurementDate and deadlineDate
- `constraints`: ScheduleConstraints object
- `routeOptimizer`: Function to call OSRM API

### Process (Intelligent Grouping Algorithm)

1. **Validate & Sort**
   - Remove/flag addresses with missing dates
   - Sort by deadline urgency (earliest deadline first)
   - Separate: overdue, due today, due this week, due later

2. **Intelligent Daily Assignment** (Main Algorithm)
   ```
   For each address (sorted by deadline urgency):
     preferredDay = address.measurementDate
     latestDay = address.deadlineDate - 1 day (must complete by deadline)
     
     If preferredDay is between preferredDay and latestDay (inclusive):
       - Try to assign to preferredDay first (respects user preference)
       - If preferredDay already has 6 stops: try day before
       - If day before has 6 stops: try next day before
       - Continue until finding a day with capacity OR reaching deadline
     Else if preferredDay is AFTER deadline:
       - Assign to earliest available day that respects deadline
     Else if preferredDay is BEFORE today:
       - Assign to today or earliest available day
     
     Constraint: Skip working days (ignore Sat/Sun)
   ```

3. **Optimize Routes Per Day**
   - For each daily group, call OSRM to get optimal route
   - OSRM input: array of {lat, lon} for each address in day
   - OSRM output: ordered sequence + distance + duration
   - Multi-criteria: minimize distance while respecting deadline constraints

4. **Load Balancing** (Optional Post-Processing)
   - If balanceLoadAndDistance = true:
     - Analyze if days are uneven (e.g., Day 1 has 6, Day 2 has 2)
     - Try limited swaps between days to balance workload
     - Only swap if doesn't increase total distance significantly
     - Respect deadline constraints always

5. **Validate Feasibility**
   - Verify no address is scheduled after its deadline
   - Verify each day ≤ 6 stops
   - Flag days that may exceed reasonable duration
   - Mark feasible: true/false for each day

6. **Return**
   - MeasurementSchedule with daily plans
   - Include metadata: addresses_on_deadline, urgent_count, overdue_count

### Pseudocode

```typescript
function generateSchedule(
  addresses: AddressInput[],
  constraints: ScheduleConstraints,
  osrmOptimize: (waypoints) => Promise<Route>
): Promise<MeasurementSchedule> {
  
  // Step 1: Validate & sort by deadline urgency
  const valid = addresses.filter(a => a.measurementDate && a.deadlineDate)
  const sorted = valid.sort((a, b) => a.deadlineDate.getTime() - b.deadlineDate.getTime())
  
  // Step 2: Intelligent daily assignment
  const dailyGroups = new Map<string, AddressInput[]>()  // key = "YYYY-MM-DD"
  
  for (const addr of sorted) {
    const preferredDay = formatDate(addr.measurementDate)
    const latestDay = formatDate(new Date(addr.deadlineDate.getTime() - 86400000)) // deadline - 1 day
    
    let assignedDay = findBestWorkingDay(
      addr,
      preferredDay,
      latestDay,
      dailyGroups,
      constraints
    )
    
    if (!dailyGroups.has(assignedDay)) {
      dailyGroups.set(assignedDay, [])
    }
    dailyGroups.get(assignedDay).push(addr)
  }
  
  // Optional: Load balancing if enabled
  if (constraints.balanceLoadAndDistance) {
    balanceSchedule(dailyGroups, constraints, addresses)
  }
  
  // Step 3: Optimize routes for each day via OSRM
  const dailyPlans: DailyPlan[] = []
  for (const [dayDate, addrs] of dailyGroups) {
    const waypoints = addrs.map(a => ({
      lat: a.geocodedCoords!.lat,
      lon: a.geocodedCoords!.lon
    }))
    
    const route = await osrmOptimize(waypoints)  // Call existing OSRM API
    
    const stops: DailyStop[] = route.waypoints.map((wp, idx) => {
      const originalAddr = addrs[route.sequence[idx]]
      return {
        addressId: originalAddr.id,
        sequenceNumber: idx + 1,
        address: {
          text: originalAddr.text,
          lat: originalAddr.geocodedCoords!.lat,
          lon: originalAddr.geocodedCoords!.lon,
          displayName: originalAddr.geocodedCoords!.displayName
        },
        measurements: {
          measurementDate: originalAddr.measurementDate!,
          deadlineDate: originalAddr.deadlineDate!,
          isOverdue: isOverdue(originalAddr.deadlineDate),
          daysUntilDeadline: daysDiff(originalAddr.deadlineDate, today())
        },
        priority: calculatePriority(originalAddr),
        distanceFromPrevious: route.segments[idx]?.distance,
        durationFromPrevious: route.segments[idx]?.duration
      }
    })
    
    dailyPlans.push({
      date: new Date(dayDate),
      stops: stops,
      routeGeometry: route.geometry,
      metrics: {
        totalDistance: route.totalDistance,
        totalDuration: route.totalDuration,
        stopCount: stops.length,
        feasible: stops.length <= constraints.maxStopsPerDay
      }
    })
  }
  
  // Step 4: Validate all deadlines respected
  const allFeasible = dailyPlans.every(plan => 
    plan.stops.every(stop => 
      new Date(plan.date) <= stop.measurements.deadlineDate
    )
  )
  
  return {
    addressListId: addressList.id,
    dailyPlans: dailyPlans,
    constraints: constraints,
    metadata: {
      totalDistance: dailyPlans.reduce((sum, p) => sum + p.metrics.totalDistance, 0),
      totalDuration: dailyPlans.reduce((sum, p) => sum + p.metrics.totalDuration, 0),
      totalAddresses: dailyPlans.reduce((sum, p) => sum + p.stops.length, 0),
      addressesOnDeadline: dailyPlans.reduce((sum, p) => 
        sum + p.stops.filter(s => s.measurements.daysUntilDeadline <= 1).length, 0
      ),
      feasible: allFeasible
    }
  }
}

// Helper: Find best working day respecting deadline
function findBestWorkingDay(
  addr: AddressInput,
  preferredDay: string,
  latestDay: string,
  dailyGroups: Map<string, AddressInput[]>,
  constraints: ScheduleConstraints
): string {
  const today = formatDate(new Date())
  let candidate = preferredDay
  
  // If preferred day is before today, start from today
  if (candidate < today) {
    candidate = today
  }
  
  // Try to find a working day with capacity between preferred and deadline
  while (candidate <= latestDay) {
    if (isWorkingDay(candidate, constraints) && getDayCapacity(candidate, dailyGroups) < constraints.maxStopsPerDay) {
      return candidate
    }
    candidate = addDay(candidate, 1)
  }
  
  // No capacity before deadline - return latest possible day (may overflow)
  return candidate <= latestDay ? latestDay : candidate
}

function isWorkingDay(dateStr: string, constraints: ScheduleConstraints): boolean {
  const date = new Date(dateStr + 'T00:00:00')
  const dayOfWeek = (date.getDay() + 6) % 7  // Convert to ISO (1=Mon, 7=Sun)
  return constraints.workingDays.includes(dayOfWeek)
}

function getDayCapacity(dayStr: string, dailyGroups: Map<string, AddressInput[]>): number {
  return dailyGroups.get(dayStr)?.length ?? 0
}
```

## Reassignment: Manual Day Change

When user drags an address to a different day:

1. Remove address from source day's stops
2. Add address to target day's stops at desired position (or end)
3. Re-optimize both affected days' routes using OSRM
4. Update metrics for both days
5. Validate constraints (both days should remain feasible)
6. Render updated schedule

## Priority Calculation

```typescript
function getPriority(stop: DailyStop): 'urgent' | 'normal' | 'flexible' {
  if (stop.measurements.isOverdue) return 'urgent'
  if (stop.measurements.daysUntilDeadline <= 1) return 'urgent'
  if (stop.measurements.daysUntilDeadline <= 7) return 'normal'
  return 'flexible'
}
```

## Display Considerations

- **Color coding**: Urgent (red), Normal (yellow), Flexible (green)
- **Icons**: ⚠️ for overdue, 🔴 for urgent, 🟡 for normal, 🟢 for flexible
- **Summary**: Show total km, total hours, and days breakdown
- **Interactivity**: Drag-drop addresses between days, click to reassign

## Integration with Existing Code

- Uses existing `AddressInput` type (extended with dates from US1/US2)
- Uses existing OSRM integration (`app/api/route/route.ts`)
- Adds new types for schedule planning
- New API endpoint: `/api/schedule/generate` (POST addresses → MeasurementSchedule)
- New endpoint: `/api/schedule/{scheduleId}/reassign` (POST to move address to different day)
