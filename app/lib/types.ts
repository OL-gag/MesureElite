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
  // Road-following route geometry from OSRM, as [lon, lat] pairs (GeoJSON
  // coordinate order). Used to draw the actual road path on the map instead
  // of straight lines between waypoints. Optional for backward compatibility
  // with routes calculated/cached before this field existed.
  geometry?: [number, number][]
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
}

// API Request/Response types

export interface GeocodeRequest {
  addresses: {
    id: string
    text: string
    order: number
  }[]
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
    geometry?: [number, number][]
  }
}
