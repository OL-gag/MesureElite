# Phase 0 Research: Itinéraire le plus court entre une liste d'adresses

**Date**: 2026-08-21 | **Purpose**: Resolve technical unknowns and finalize architectural decisions before Phase 1 design

---

## 1. TSP (Traveling Salesman Problem) Algorithm Implementation

**Decision**: Use OSRM Public API's Matrix & Route services (not implement TSP locally)

**Rationale**:
- OSRM Public API provides `/route/v1/car/{coordinates}` endpoint that already calculates optimal routing for multiple waypoints
- For small batches (≤ 25 addresses), OSRM's heuristic is sufficiently fast (< 5s per spec SC-001)
- Eliminates complexity of implementing TSP locally (NP-hard problem; significant CPU cost)
- Verified that OSRM respects fixed departure point (first coordinate in list)

**Alternatives considered**:
- Implement local TSP solver (e.g., simulated annealing, genetic algorithm) — rejected: adds development complexity, slower for small batches, harder to test correctness
- Google Maps Directions API — rejected: higher cost (pay per request), dependency on paid service contradicts "self-contained" principle
- Nearest-neighbor heuristic — partially viable but less optimal; OSRM is better

**Implementation Notes**:
- Call OSRM `/route/v1/car/{lon1,lat1};{lon2,lat2};...` with waypoints in order
- Extract distance and duration from response
- Validate OSRM response includes all waypoints in returned order

---

## 2. Geocoding (Address → Coordinates) Integration

**Decision**: Use Nominatim / OpenStreetMap Geocoding API (free, lightweight)

**Rationale**:
- Nominatim is free and open-source (aligned with "self-contained" principle)
- Lightweight library needed for Vercel Functions (Nominatim client-side JS is ~10KB gzipped)
- Rate limiting: 1 req/sec per Nominatim policy (acceptable for MVP; users won't geocode > 25 addresses at 1 req/sec)
- Direct HTTP calls possible without additional dependency

**Integration details**:
- Nominatim endpoint: `https://nominatim.openstreetmap.org/search?q={address}&format=json`
- Required parameters: q (address), format=json
- Response includes `lat`, `lon`, `display_name`
- Handle ambiguous results: if > 1 result, return top match; log warning to user
- Caching: store geocoded addresses in localStorage to reduce API calls on re-runs

**Alternatives considered**:
- Google Geocoding API — rejected: cost + commercial dependency
- Mapbox Geocoding — rejected: cost + commercial dependency
- Local/offline database — rejected: maintenance burden, stale data, bloats bundle

---

## 3. Retry Strategy & Error Handling

**Decision**: Implement exponential backoff retry (2-3 attempts) for API failures

**Rationale**:
- Nominatim & OSRM may timeout or rate-limit; retry improves reliability
- User-facing message distinguishes: "Temporarily unavailable, retrying..." (transient) vs. "Address not found" (permanent)
- Exponential backoff (1s, 2s, 4s) reduces thundering herd if APIs are briefly down

**Implementation**:
- Retry logic in serverless function (Vercel Function) not client-side
- Max 3 attempts per address; if final attempt fails, mark as "invalid" and exclude from routing
- Nominatim 429 (rate-limit) → wait 2-3 seconds and retry
- OSRM 503 (unavailable) → wait and retry once more
- Client receives clear error: "Address '{address}' could not be geocoded. Please check spelling or try another."

---

## 4. Architecture: Pages, API Routes, Components

**Decision**: Next.js App Router (pages directory) with Vercel Functions for API integration

**Rationale**:
- Next.js App Router is current best practice for Vercel deployments
- Serverless functions isolate API key security (Nominatim/OSRM keys stored in Vercel env vars)
- Client-side React components for UI; server-side functions for geocoding/routing (security + caching)

**Planned structure**:
```
app/
├── page.tsx                    # Input form (address list)
├── results/page.tsx            # Results view (itinerary + map)
├── api/
│   ├── geocode.ts              # POST /api/geocode (call Nominatim)
│   └── route.ts                # POST /api/route (call OSRM)
├── components/
│   ├── AddressForm.tsx          # Address input with multi-line/multi-field
│   ├── RouteMap.tsx             # Leaflet map component
│   ├── RouteDetails.tsx         # Itinerary display (segments, totals)
│   └── ErrorBoundary.tsx        # Error handling wrapper
└── lib/
    ├── nominatim.ts             # Geocoding client
    ├── osrm.ts                  # Routing client
    └── types.ts                 # Shared types (Address, Route, etc.)
```

**Testing approach**:
- Unit tests: geocoding & routing utilities (Jest)
- Integration tests: API routes + component interaction (React Testing Library)
- E2E smoke tests: manual validation of happy path (form → results → map)

---

## 5. Map Library: Leaflet + OpenStreetMap

**Decision**: Leaflet + React-Leaflet + OpenStreetMap tiles

**Rationale**:
- Leaflet is lightweight (~40KB gzipped), performant for small # of markers
- React-Leaflet provides React integration (cleaner than direct Leaflet DOM manipulation)
- OpenStreetMap tiles are free and open-source (no API key required)
- Industry standard; large community support

**Implementation**:
- Initialize map centered on first address (auto-zoom to fit all waypoints)
- Markers: circle (different colors: red=start, blue=intermediate, green=end or similar)
- Polyline connecting waypoints in calculated order
- Popup on marker click → show address + distance/duration to next point
- Interaction: zoom, pan, touch gestures (Leaflet handles by default)

---

## 6. Performance & Caching Strategy

**Decision**: Client-side localStorage cache for geocoding; server-side edge caching (Vercel) for OSRM calls

**Rationale**:
- Geocoding results are stable (address → coords doesn't change); localStorage cache avoids re-geocoding
- OSRM is deterministic (same coords → same route); cached responses reduce API calls
- Vercel's edge cache (Cache-Control headers) automatically handles short-lived caching of API responses

**Implementation**:
- Geocoding cache: store `{ address: "123 Main", lat: 45.5, lon: -122.6 }` in localStorage; check before API call
- Cache invalidation: manual clear button in UI ("Start Fresh") or localStorage cleared on browser clear
- OSRM response cache: 5-minute TTL on server (Cache-Control: max-age=300)

---

## 7. Handling Edge Cases

**Decision**: Documented in error scenarios; implementation via validation & user feedback

### Duplicate Addresses
- **Handling**: Nominatim will geocode both to same (or nearly same) coords; OSRM route will include both
- **User feedback**: Detect coordinates within 50m; warn user "Two addresses are very close (X and Y); continue anyway?"

### Ambiguous Geocoding Results
- **Handling**: Nominatim returns multiple results; take top match; if address has multiple cities, user must disambiguate
- **User feedback**: "Found multiple matches for '{address}'. Using: {best_match}. Change if needed."

### Inaccessible Address
- **Handling**: OSRM will return error for unreachable address (e.g., island, blocked road)
- **User feedback**: "Address '{address}' is not reachable by car. Please check or try another."
- **Routing behavior**: Exclude unreachable address from calculation; recalculate route for remaining addresses

### > 25 Addresses
- **Handling**: Form validation; prevent submission if > 25 addresses
- **User feedback**: "Maximum 25 addresses per calculation. Please split and try again."

---

## Decision Log

| Decision | Date | Owner | Status |
|----------|------|-------|--------|
| OSRM for TSP (not local solver) | 2026-08-21 | Architecture Review | ✅ APPROVED |
| Nominatim for geocoding (free) | 2026-08-21 | Architecture Review | ✅ APPROVED |
| Exponential backoff retry (2-3x) | 2026-08-21 | Architecture Review | ✅ APPROVED |
| Next.js App Router + Vercel Functions | 2026-08-21 | Architecture Review | ✅ APPROVED |
| Leaflet + React-Leaflet for map | 2026-08-21 | Architecture Review | ✅ APPROVED |
| Client-side + server-side caching | 2026-08-21 | Architecture Review | ✅ APPROVED |

---

## Next Steps

→ Proceed to **Phase 1: Design & Contracts** (data-model.md, quickstart.md, contracts/)
