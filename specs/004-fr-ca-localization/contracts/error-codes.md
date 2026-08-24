# Contract Extension: `errorCode` on `/api/geocode` and `/api/route`

**Base contracts**: `specs/001-shortest-route-addresses/contracts/api-geocode.md`, `specs/001-shortest-route-addresses/contracts/api-route.md` (unchanged, extended additively — no breaking change).

## Change

Every error-shaped response object (top-level API error body, and each item in `GeocodeResponse.results[]` with `status !== 'valid'`) gains an **optional** `errorCode: string` field alongside the existing `error: string` field.

- `error` (existing): English human-readable text. Kept for backward compatibility, logging, and as the client-side fallback when `errorCode` is missing or unrecognized.
- `errorCode` (new): a stable, machine-readable identifier from the table below. The client maps it to a localized string; it never changes based on the request's locale (the API itself stays locale-agnostic, per research.md Décision 2).

## Response shape (unchanged envelope, additive field)

```jsonc
// POST /api/geocode — one item of GeocodeResponse.results[]
{
  "id": "a1",
  "status": "invalid",
  "error": "Address not found: \"XYZ\". Please check spelling.",
  "errorCode": "ADDRESS_NOT_FOUND" // NEW, optional
}

// POST /api/geocode or /api/route — top-level error body (4xx/5xx)
{
  "error": "Maximum 25 addresses allowed",
  "errorCode": "TOO_MANY_ADDRESSES", // NEW, optional
  "retryAfter": 5 // unchanged, only present on 429/503
}
```

## Codes

| Code | Endpoint | HTTP status | Existing `error` text it replaces (for reference) |
|---|---|---|---|
| `ADDRESS_NOT_FOUND` | `/api/geocode` (per-result) | 200 | `Address not found: "{address}". Please check spelling.` |
| `AMBIGUOUS` | `/api/geocode` (per-result) | 200 | `Ambiguous address: "{address}" matched multiple distinct places. Please specify the city.` |
| `GEOCODING_FAILED` | `/api/geocode` (per-result) | 200 | `Geocoding request failed` / Nominatim exception message |
| `MISSING_ADDRESSES` | `/api/geocode` | 400 | `Missing or invalid addresses array` |
| `EMPTY_ADDRESSES` | `/api/geocode` | 400 | `At least 1 address required` |
| `TOO_MANY_ADDRESSES` | `/api/geocode` | 400 | `Maximum 25 addresses allowed` |
| `INVALID_ADDRESS_FORMAT` | `/api/geocode` | 400 | `Each address must have id, text, and order` / `Each address must be 1-200 characters` |
| `RATE_LIMITED` | `/api/geocode`, `/api/route` | 429 | `Geocoding service temporarily rate-limited...` / `Routing service temporarily rate-limited...` |
| `SERVICE_UNAVAILABLE` | `/api/geocode`, `/api/route` | 500/503 | `Geocoding service temporarily unavailable...` / `Routing service temporarily unavailable...` |
| `MISSING_WAYPOINTS` | `/api/route` | 400 | `Missing or invalid waypoints array` |
| `TOO_FEW_WAYPOINTS` | `/api/route` | 400 | `At least 2 waypoints required` |
| `TOO_MANY_WAYPOINTS` | `/api/route` | 400 | `Maximum 25 waypoints allowed` |
| `INVALID_WAYPOINT` | `/api/route` | 400 | `Each waypoint must have id, lat, and lon` |
| `INVALID_COORDINATES` | `/api/route` | 400 | `Invalid coordinates for waypoint: {id}` |
| `ROUTING_FAILED` | `/api/route` | 400 | `Routing calculation failed` / OSRM error |
| `TIMEOUT` | `/api/route` | 503 | `Routing calculation timed out. Please try again.` |

## Compatibility

- Additive only — no field removed, renamed, or made required. Existing consumers reading only `error` continue to work unchanged.
- `Cache-Control` headers on both endpoints are unaffected (responses still cache-agnostic of locale — see research.md Décision 2).
