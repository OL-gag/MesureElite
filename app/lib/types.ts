// Core data types per data-model.md

export interface AddressInput {
  id: string
  text: string
  order: number
  isStartPoint: boolean
  status: 'pending' | 'geocoding' | 'valid' | 'invalid' | 'ambiguous'
  geocodedCoords?: {
    lat: number
    lon: number
    displayName: string
  }
  error?: string
  errorCode?: string
  alternatives?: {
    lat: number
    lon: number
    displayName: string
  }[]
  createdAt: Date
  updatedAt: Date
  // Measurement scheduling fields (US1 & US2)
  measurementDate?: Date
  deadlineDate?: Date
  // Free-text job details (room, material, phone, notes...) carried through
  // to the itinerary — mainly populated by the weekly-planning JSON import.
  reference?: string
}

export interface AddressList {
  id: string
  addresses: AddressInput[]
  status: 'entering' | 'validating' | 'valid' | 'partial_invalid' | 'all_invalid'
  validCount: number
  invalidCount: number
  route?: Route
  createdAt: Date
  updatedAt: Date
}

export interface Route {
  id: string
  addressListId: string
  waypoints: Waypoint[]
  segments: Segment[]
  totalDistance: number
  totalDuration: number
  optimizationGain: number
  status: 'pending' | 'calculating' | 'success' | 'failed'
  error?: string
  calculatedAt: Date
}

export interface Waypoint {
  id: string
  routeId: string
  originalAddressId: string
  sequence: number
  lat: number
  lon: number
  displayName: string
  isStartPoint: boolean
  isEndPoint: boolean
}

export interface Segment {
  id: string
  routeId: string
  fromWaypoint: string
  toWaypoint: string
  sequence: number
  distance: number
  duration: number
  // Road-following geometry for this segment only, as [lon, lat] pairs
  // (GeoJSON coordinate order). Used to color each leg of the route
  // individually on the map. Optional for backward compatibility with
  // routes calculated/cached before this field existed.
  geometry?: [number, number][]
}

// API Request/Response types

export interface GeocodeRequest {
  addresses: {
    id: string
    text: string
    order: number
  }[]
}

// A geocoded address far from the others in the same submission (see
// findDistanceOutliers in utils.ts) — likely matched to the wrong place.
export interface DistanceOutlier {
  label: string
  nearestKm: number
}

export interface GeocodeResponse {
  results: {
    id: string
    status: 'valid' | 'invalid' | 'ambiguous'
    lat?: number
    lon?: number
    displayName?: string
    alternatives?: {
      lat: number
      lon: number
      displayName: string
    }[]
    error?: string
    errorCode?: string
    // Set when the address text as typed matched nothing, but retrying with
    // a different street-type word (rue/avenue/route/...) found a real
    // place — see app/lib/nominatim.ts buildStreetTypeVariants.
    correctedAddress?: string
  }[]
  validCount: number
  invalidCount: number
}

// Shared shape for error bodies returned by /api/geocode and /api/route on
// non-2xx responses. `errorCode` is additive — see
// specs/004-fr-ca-localization/contracts/error-codes.md for the full table.
export interface ApiErrorBody {
  error: string
  errorCode?: string
  retryAfter?: number
  debug?: string
}

export interface RouteRequest {
  waypoints: {
    id: string
    lat: number
    lon: number
    displayName?: string
  }[]
}

export interface RouteResponse {
  route: {
    id: string
    waypoints: Waypoint[]
    segments: Segment[]
    totalDistance: number
    totalDuration: number
    optimizationGain: number
    status: 'success' | 'failed'
    error?: string
    errorCode?: string
  }
}

// Measurement Schedule Types (US3)

export interface ScheduleConstraints {
  maxStopsPerDay: number
  workingDays: number[]
  prioritizeDeadlines: boolean
  balanceLoadAndDistance: boolean
  allowOverdueAddresses: boolean
}

export interface DailyStop {
  id: string
  dailyPlanId: string
  addressId: string
  sequenceNumber: number
  address: {
    text: string
    lat: number
    lon: number
    displayName: string
  }
  measurements: {
    measurementDate: Date
    deadlineDate: Date
    isOverdue: boolean
    daysUntilDeadline: number
  }
  priority: 'urgent' | 'normal' | 'flexible'
  distanceFromPrevious?: number
  durationFromPrevious?: number
  // See AddressInput.reference.
  reference?: string
}

export interface DailyPlan {
  id: string
  scheduleId: string
  date: Date
  dayOfWeek: string
  stops: DailyStop[]
  routeGeometry?: [number, number][]
  // Full OSRM round-trip route for this day (start → stops → back to start),
  // in the same shape the results page feeds to RouteMap. Absent when route
  // optimization failed and the plan was built without OSRM.
  route?: RouteResponse['route']
  metrics: {
    totalDistance: number
    totalDuration: number
    stopCount: number
    feasible: boolean
  }
  constraints: {
    maxStops: number
    maxDuration?: number
    maxDistance?: number
  }
}

export interface MeasurementSchedule {
  id: string
  addressListId: string
  dailyPlans: DailyPlan[]
  generatedAt: Date
  constraints: ScheduleConstraints
  metadata: {
    totalDistance: number
    totalDuration: number
    totalAddresses: number
    addressesOnDeadline: number
  }
}
