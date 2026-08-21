# Phase 1 Data Model: Itinéraire le plus court entre une liste d'adresses

**Date**: 2026-08-21 | **Purpose**: Define data structures and entity relationships

---

## Core Entities

### 1. Address (Input)

Represents a user-entered address before geocoding.

```typescript
interface AddressInput {
  id: string;                    // Unique identifier (UUID)
  text: string;                  // Raw address text as entered by user
  order: number;                 // Position in the list (1, 2, 3, ...)
  isStartPoint: boolean;         // true if this is the departure point (always the first)
  status: 'pending' | 'geocoding' | 'valid' | 'invalid' | 'ambiguous';
  geocodedCoords?: {
    lat: number;                 // Latitude from Nominatim
    lon: number;                 // Longitude from Nominatim
    displayName: string;         // Canonicalized address from Nominatim
  };
  error?: string;                // Error message if status === 'invalid' or 'ambiguous'
  alternatives?: {               // Alternative geocoding results (if ambiguous)
    lat: number;
    lon: number;
    displayName: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}
```

**Validation Rules**:
- `text` must not be empty or whitespace-only
- `text` max length: 200 characters
- `order` must be >= 1
- Only one `isStartPoint` per list
- `lat`/`lon` must be valid WGS84 coordinates (±90 for lat, ±180 for lon)

---

### 2. AddressList (Container)

Represents the user's batch of addresses submitted for routing.

```typescript
interface AddressList {
  id: string;                    // Unique identifier (UUID)
  addresses: AddressInput[];     // Array of addresses (2-25)
  status: 'entering' | 'validating' | 'valid' | 'partial_invalid' | 'all_invalid';
  validCount: number;            // Count of addresses with status === 'valid'
  invalidCount: number;          // Count of addresses with status !== 'valid'
  route?: Route;                 // Populated after routing calculation
  createdAt: Date;
  updatedAt: Date;
}
```

**Validation Rules**:
- `addresses.length` must be 2-25
- At least 2 addresses must have status === 'valid' before routing is allowed
- `validCount` = sum of addresses where status === 'valid'
- `invalidCount` = addresses.length - validCount

---

### 3. Route (Output)

Represents the optimized route calculated by OSRM.

```typescript
interface Route {
  id: string;                    // Unique identifier (UUID)
  addressListId: string;         // Foreign key to AddressList
  waypoints: Waypoint[];         // Ordered array of waypoints (optimized order)
  segments: Segment[];           // Array of connections between consecutive waypoints
  totalDistance: number;         // Total distance in meters
  totalDuration: number;         // Total duration in seconds
  optimizationGain: number;      // % reduction vs. original address order (e.g., 15.0 for 15%)
  status: 'pending' | 'calculating' | 'success' | 'failed';
  error?: string;                // Error message if status === 'failed'
  calculatedAt: Date;
}
```

**Calculation Rules** (from OSRM):
- `waypoints` order determined by OSRM's routing algorithm (respects departure point as first)
- `totalDistance` = sum of all segment distances
- `totalDuration` = sum of all segment durations
- `optimizationGain` = ((original_distance - calculated_distance) / original_distance) * 100
  - original_distance = simple sum of distances from addresses in original user order (non-optimized baseline)

---

### 4. Waypoint (in Route)

Represents a single stop in the optimized route.

```typescript
interface Waypoint {
  id: string;                    // Unique identifier (UUID)
  routeId: string;               // Foreign key to Route
  originalAddressId: string;     // Reference to original AddressInput
  sequence: number;              // Order in the route (1, 2, 3, ...)
  lat: number;                   // Latitude (from geocoded coordinates)
  lon: number;                   // Longitude (from geocoded coordinates)
  displayName: string;           // Canonical address name
  isStartPoint: boolean;         // true if departure point
  isEndPoint: boolean;           // true if return point (always same as start)
}
```

---

### 5. Segment (in Route)

Represents a single connection between two consecutive waypoints.

```typescript
interface Segment {
  id: string;                    // Unique identifier (UUID)
  routeId: string;               // Foreign key to Route
  fromWaypoint: string;          // Waypoint ID (source)
  toWaypoint: string;            // Waypoint ID (destination)
  sequence: number;              // Segment order in route (1, 2, 3, ..., n-1)
  distance: number;              // Distance in meters
  duration: number;              // Estimated duration in seconds
  polyline?: string;             // Encoded polyline (optional; for detailed map display)
}
```

**Calculation Rules**:
- Distance and duration extracted from OSRM response for each leg
- Polyline (Google Encoded Polyline format) optional for detailed map rendering

---

## State Transitions

### AddressInput State Machine

```
[pending] --geocoding--> [geocoding] --success--> [valid]
                                     --not-found--> [invalid]
                                     --ambiguous--> [ambiguous]
                                     --timeout--> [invalid]
```

### AddressList State Machine

```
[entering] --user-submits--> [validating] --geocoding-all--> [valid|partial_invalid|all_invalid]
```

### Route State Machine

```
[pending] --osrm-request--> [calculating] --success--> [success]
                                         --error--> [failed]
```

---

## Relationships

```
AddressList (1) ──→ (N) AddressInput
AddressList (1) ──→ (1) Route
Route (1) ──→ (N) Waypoint
Route (1) ──→ (N) Segment
Waypoint ──→ (M) AddressInput (cross-reference)
Segment (many-to-many) → Waypoint
```

---

## Data Persistence

**For V1**: All data is ephemeral (client-side session state via React Context or Zustand)
- No backend database (stateless Vercel deployment)
- localStorage can optionally cache geocoding results (optimized repeat usage)
- No user accounts or persistent storage

**Future enhancement (V2)**:
- Database for saving user's routes (e.g., Supabase PostgreSQL)
- User accounts and authentication
- History tracking and favorites

---

## API Request/Response Models (Serialization)

### Geocoding Request (POST /api/geocode)

```json
{
  "addresses": [
    { "id": "addr-1", "text": "123 Main St, Portland OR", "order": 1 },
    { "id": "addr-2", "text": "456 Oak Ave, Portland OR", "order": 2 },
    ...
  ]
}
```

### Geocoding Response

```json
{
  "results": [
    {
      "id": "addr-1",
      "status": "valid",
      "lat": 45.5231,
      "lon": -122.6765,
      "displayName": "123 Main Street, Portland, Oregon, USA"
    },
    {
      "id": "addr-2",
      "status": "ambiguous",
      "alternatives": [
        { "lat": 45.524, "lon": -122.675, "displayName": "456 Oak Avenue, Portland, OR" },
        { "lat": 45.620, "lon": -122.300, "displayName": "456 Oak Avenue, Vancouver, WA" }
      ],
      "error": "Multiple matches found. Please clarify."
    }
  ]
}
```

### Routing Request (POST /api/route)

```json
{
  "waypoints": [
    { "id": "wp-1", "lat": 45.5231, "lon": -122.6765, "displayName": "123 Main St" },
    { "id": "wp-2", "lat": 45.5240, "lon": -122.6750, "displayName": "456 Oak Ave" },
    ...
  ]
}
```

### Routing Response

```json
{
  "route": {
    "id": "route-xyz",
    "waypoints": [
      { "id": "wp-1", "sequence": 1, "displayName": "123 Main St", "isStartPoint": true },
      { "id": "wp-2", "sequence": 2, "displayName": "456 Oak Ave" },
      { "id": "wp-1", "sequence": 3, "displayName": "123 Main St", "isEndPoint": true }
    ],
    "segments": [
      { "fromId": "wp-1", "toId": "wp-2", "distance": 1200, "duration": 120 },
      { "fromId": "wp-2", "toId": "wp-1", "distance": 1200, "duration": 120 }
    ],
    "totalDistance": 2400,
    "totalDuration": 240,
    "optimizationGain": 15.0
  }
}
```

---

## Next Steps

→ Define interface contracts in `/contracts/`
→ Create quickstart.md validation guide
