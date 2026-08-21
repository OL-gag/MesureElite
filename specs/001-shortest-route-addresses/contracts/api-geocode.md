# API Contract: POST /api/geocode

**Purpose**: Geocode user-entered addresses (convert text → lat/lon) using Nominatim

**Transport**: HTTP POST (REST)

**Base URL**: https://measuremg.vercel.app/api/geocode (production)

---

## Request

### Method & Path
```
POST /api/geocode
```

### Headers
```
Content-Type: application/json
```

### Body Schema

```json
{
  "addresses": [
    {
      "id": "string (UUID)",
      "text": "string (max 200 chars)",
      "order": "integer (>= 1)"
    }
  ]
}
```

### Example Request

```bash
curl -X POST https://measuremg.vercel.app/api/geocode \
  -H "Content-Type: application/json" \
  -d '{
    "addresses": [
      { "id": "addr-1", "text": "123 Main St, Portland OR", "order": 1 },
      { "id": "addr-2", "text": "456 Oak Ave, Portland OR", "order": 2 }
    ]
  }'
```

---

## Response

### Success (200 OK)

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
      "status": "valid",
      "lat": 45.5240,
      "lon": -122.6750,
      "displayName": "456 Oak Avenue, Portland, Oregon, USA"
    }
  ],
  "validCount": 2,
  "invalidCount": 0
}
```

### Address Not Found (Included in 200 Response)

```json
{
  "results": [
    {
      "id": "addr-3",
      "status": "invalid",
      "error": "Address not found: '123 Main St, NowhereVille XX'. Please check spelling."
    }
  ],
  "validCount": 2,
  "invalidCount": 1
}
```

### Ambiguous Address (Included in 200 Response)

```json
{
  "results": [
    {
      "id": "addr-4",
      "status": "ambiguous",
      "alternatives": [
        { "lat": 45.524, "lon": -122.675, "displayName": "Oak Avenue, Portland, OR" },
        { "lat": 45.620, "lon": -122.300, "displayName": "Oak Avenue, Vancouver, WA" }
      ],
      "error": "Multiple matches found. Using top match: 'Oak Avenue, Portland, OR'. Modify address if needed."
    }
  ]
}
```

### Error Response (500 Internal Server Error)

```json
{
  "error": "Geocoding service temporarily unavailable. Please try again in a moment.",
  "retryAfter": 5
}
```

---

## Status Codes

| Code | Meaning | Cause |
|------|---------|-------|
| 200 | OK | Geocoding completed (see `results[].status` for individual results) |
| 400 | Bad Request | Invalid input (missing fields, malformed JSON) |
| 429 | Too Many Requests | Rate limit exceeded (Nominatim limit) |
| 500 | Internal Server Error | Service failure or timeout |

---

## Retry Behavior

- **Client**: If 500 or 429, retry up to 2 times with exponential backoff (1s, 2s)
- **Server**: Nominatim timeouts handled internally with retry (2-3x before returning error)

---

## Performance SLAs

| Metric | Target |
|--------|--------|
| p50 latency | 500ms (2 addresses) |
| p95 latency | 2000ms (2-5 addresses) |
| Availability | 95% uptime (dependent on Nominatim) |

---

## Notes

- Addresses are geocoded in parallel (all at once, not sequentially)
- Results order matches input order (by `id`)
- Caching: Results cached in localStorage on client for 24 hours
- The `displayName` is the canonical address from Nominatim; client should display this back to user for confirmation
