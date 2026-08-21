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
  polyline?: string
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
  }[]
  validCount: number
  invalidCount: number
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
  }
}
