# API Contract: POST /api/route

**Purpose**: Calculate optimized route (TSP) for geocoded waypoints using OSRM

**Transport**: HTTP POST (REST)

**Base URL**: https://measuremg.vercel.app/api/route (production)

---

## Request

### Method & Path
```
POST /api/route
```

### Headers
```
Content-Type: application/json
```

### Body Schema

```json
{
  "waypoints": [
    {
      "id": "string (UUID or address reference)",
      "lat": "number (WGS84, -90 to +90)",
      "lon": "number (WGS84, -180 to +180)",
      "displayName": "string (user-friendly label, optional)"
    }
  ]
}
```

### Example Request

```bash
curl -X POST https://measuremg.vercel.app/api/route \
  -H "Content-Type: application/json" \
  -d '{
    "waypoints": [
      { "id": "wp-1", "lat": 45.5231, "lon": -122.6765, "displayName": "123 Main St" },
      { "id": "wp-2", "lat": 45.5240, "lon": -122.6750, "displayName": "456 Oak Ave" }
    ]
  }'
```

---

## Response

### Success (200 OK)

```json
{
  "route": {
    "id": "route-xyz",
    "waypoints": [
      {
        "id": "wp-1",
        "sequence": 1,
        "lat": 45.5231,
        "lon": -122.6765,
        "displayName": "123 Main St",
        "isStartPoint": true,
        "isEndPoint": false
      },
      {
        "id": "wp-2",
        "sequence": 2,
        "lat": 45.5240,
        "lon": -122.6750,
        "displayName": "456 Oak Ave",
        "isStartPoint": false,
        "isEndPoint": false
      },
      {
        "id": "wp-1",
        "sequence": 3,
        "lat": 45.5231,
        "lon": -122.6765,
        "displayName": "123 Main St",
        "isStartPoint": false,
        "isEndPoint": true
      }
    ],
    "segments": [
      {
        "id": "seg-1",
        "fromId": "wp-1",
        "toId": "wp-2",
        "sequence": 1,
        "distance": 1200,
        "duration": 120,
        "polyline": "encoded_polyline_string_here"
      },
      {
        "id": "seg-2",
        "fromId": "wp-2",
        "toId": "wp-1",
        "sequence": 2,
        "distance": 1200,
        "duration": 120,
        "polyline": "encoded_polyline_string_here"
      }
    ],
    "totalDistance": 2400,
    "totalDuration": 240,
    "optimizationGain": 15.0,
    "status": "success"
  }
}
```

### Unreachable Waypoint (400 Bad Request)

```json
{
  "error": "Waypoint 'wp-3' (lat: 55.555, lon: -122.666) is not reachable by car (e.g., island, blocked road). Please verify coordinates or remove waypoint.",
  "unreachableWaypoint": "wp-3"
}
```

### Error Response (5xx Internal Server Error)

```json
{
  "error": "Routing service temporarily unavailable. Please try again in a moment.",
  "retryAfter": 5
}
```

---

## Status Codes

| Code | Meaning | Cause |
|------|---------|-------|
| 200 | OK | Route calculated successfully |
| 400 | Bad Request | Invalid waypoints, malformed JSON, or unreachable location |
| 429 | Too Many Requests | Rate limit exceeded (OSRM limit) |
| 500 | Internal Server Error | OSRM service failure or timeout |

---

## Retry Behavior

- **Client**: If 500 or 429, retry up to 2 times with exponential backoff (2s, 4s)
- **Server**: OSRM timeouts handled internally with 1 retry before returning error

---

## Performance SLAs

| Metric | Target | Notes |
|--------|--------|-------|
| p50 latency | 800ms (2 waypoints) | OSRM calculates optimal order |
| p95 latency | 3000ms (10 waypoints) | Aligns with SC-001 (< 5s for 10 addresses) |
| Max waypoints | 25 | Hard limit per spec |
| Availability | 95% uptime | Dependent on OSRM Public API |

---

## Field Definitions

### Waypoint (in Route)

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Reference to input waypoint (preserved from request) |
| `sequence` | integer | Order in the optimized route (1, 2, 3, ..., n) |
| `lat`, `lon` | number | Geographic coordinates |
| `displayName` | string | User-friendly label (echoed from request) |
| `isStartPoint` | boolean | true if departure point (always first and last in closed loop) |
| `isEndPoint` | boolean | true if return point (always same as start in closed loop) |

### Segment (in Route)

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique segment identifier |
| `fromId`, `toId` | string | Waypoint IDs (references input) |
| `sequence` | integer | Segment order in route (1, 2, ..., n-1) |
| `distance` | number | Distance in meters |
| `duration` | number | Estimated time in seconds |
| `polyline` | string | Encoded polyline (Google format) for map rendering |

### Route

| Field | Type | Description |
|-------|------|-------------|
| `totalDistance` | number | Sum of all segment distances (meters) |
| `totalDuration` | number | Sum of all segment durations (seconds) |
| `optimizationGain` | number | Percentage reduction vs. original order (e.g., 15.0 = 15%) |

---

## Example: Detailed Route Calculation

**Input**: 3 waypoints (user-entered order)
- wp-1: 45.52, -122.67 (start: "Main St")
- wp-2: 45.53, -122.66 (destination: "Oak Ave")
- wp-3: 45.52, -122.65 (destination: "Elm St")

**Expected Output**: Optimized order (e.g., 1 → 3 → 2 → 1)
- Segment 1 → 3: 1000m, 100s
- Segment 3 → 2: 800m, 80s
- Segment 2 → 1: 1200m, 120s
- **Total**: 3000m, 300s
- **Gain**: If user order (1 → 2 → 3 → 1) was 3500m, gain = (3500 - 3000) / 3500 = 14.3%

---

## Notes

- The response always includes a return to the starting waypoint (closed loop)
- Polylines are optional but recommended for map rendering (avoid recalculating on client)
- OSRM respects the first waypoint as mandatory departure point
- Caching: OSRM response cached server-side for 5 minutes (same coordinates = same route)
