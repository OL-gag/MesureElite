# Implementation Plan: Visualiser l'itinéraire sur une carte interactive

**Feature**: Route Map Visualization (Spec 002)
**Branch**: `002-route-map-visualization`
**Status**: Planning Phase

---

## Technical Context

### Tech Stack
- **Map Library**: Leaflet 4.x (already in package.json)
- **React Binding**: react-leaflet 4.x (already in package.json)
- **Tile Provider**: OpenStreetMap (free, no API key needed)
- **Marker Management**: Leaflet markers with custom icons
- **Route Display**: Polyline from OSRM response

### Architecture Pattern
- **Component**: RouteMap.tsx (new, renders Leaflet map)
- **Data Flow**: 
  1. Results page loads route from sessionStorage
  2. RouteMap component renders Leaflet container
  3. Markers placed at each waypoint
  4. Polyline drawn from OSRM geometry
  5. Map auto-zooms to fit all markers

### Dependencies
- ✅ Leaflet already installed
- ✅ react-leaflet already installed
- ✅ Route data already available (from spec 001)
- ✅ OSRM route includes `geometry` field with polyline

### Known Issues
- OSRM geometry is GeoJSON format, needs conversion to LatLng for Leaflet
- Marker icons need styling for start/waypoint distinction
- Map container needs explicit height (CSS requirement)

---

## Constitution Check

From `.specify/memory/constitution.md`:

- **Deploy-Ready**: ✅ No new API integrations, only client-side rendering
- **Self-Contained**: ✅ Leaflet + react-leaflet are self-contained
- **Shareable**: ✅ Map embedded in results page, works in all browsers
- **Performance-First**: ✅ Client-side only, no server work
- **Production Quality**: ⚠️ Needs: responsive map sizing, error handling for missing geometry

**Gate Status**: ✅ PASS - No conflicts with constitution

---

## Design Outputs (Phase 1)

### 1. Data Model (map-specific extensions)

**RouteMapProps**:
```typescript
interface RouteMapProps {
  route: Route
  waypoints: Waypoint[]
  geometry: any  // GeoJSON from OSRM
}
```

**MapMarker**:
```typescript
interface MapMarker {
  id: string
  lat: number
  lon: number
  displayName: string
  sequence: number
  isStartPoint: boolean
}
```

### 2. Component Contract

**RouteMap.tsx**:
- Input: `route` (Route object), `waypoints` (Waypoint array)
- Output: Rendered Leaflet map with markers and polyline
- Side Effects: Auto-zoom to bounds, center map
- Responsibilities:
  - Parse OSRM geometry (GeoJSON → LatLng array)
  - Create markers with custom icons
  - Draw polyline connecting waypoints
  - Handle zoom/pan interactions

### 3. UI/UX Details

**Markers**:
- **Start Point**: Green marker with "START" label
- **Waypoints**: Blue circular markers with sequence number
- **Info on Click**: Tooltip showing address + distance to next

**Polyline**:
- Color: Blue (#3b82f6)
- Weight: 3px
- Opacity: 0.7
- Dashed for visual distinction

**Map Controls**:
- Zoom in/out buttons (Leaflet default)
- Pan with mouse drag
- Double-click to zoom

---

## Validation Plan

### Test Scenarios (from spec)

**US1 - Basic Map Display**:
- [ ] Route with 3 addresses → 3 markers + polyline visible
- [ ] Markers ordered correctly by sequence
- [ ] Polyline connects all points smoothly

**US2 - Interaction**:
- [ ] Zoom in/out: markers and polyline scale correctly
- [ ] Pan: markers stay aligned
- [ ] Click marker: details tooltip appears

**US3 - Start Point Distinction**:
- [ ] Start point has different color/icon than waypoints
- [ ] Clearly identifiable even with many waypoints

**Edge Cases**:
- [ ] 2-address route: simple line segment
- [ ] Very close waypoints: all visible (no overlap)
- [ ] Very far waypoints: map auto-zooms to fit

---

## Implementation Strategy

### Phase 0: Research (None needed - Leaflet/react-leaflet are well-known)

### Phase 1: Setup & Components
- T001: Create RouteMap.tsx component
- T002: Add map container CSS (height, borders)
- T003: Parse OSRM geometry (GeoJSON → coordinates)

### Phase 2: Markers & Interactivity
- T004: Create marker components with custom icons
- T005: Add click handlers for info tooltips
- T006: Implement start-point distinction styling

### Phase 3: Polyline & Display
- T007: Draw polyline from route geometry
- T008: Implement auto-zoom to fit all markers
- T009: Add error handling for missing geometry

### Phase 4: Integration
- T010: Wire RouteMap into results page
- T011: Test all three user stories
- T012: Verify responsive design

---

## Success Criteria

✅ **Completion Signals**:
1. Results page shows interactive Leaflet map below itinerary
2. All waypoints visible as markers, correctly ordered
3. Route polyline visible and traces correct path
4. Start point visually distinct (different color/icon)
5. Map responds to zoom/pan interactions
6. Tooltips show on marker click
7. Responsive on mobile (map shrinks, stays usable)

⚠️ **Non-Blocking Issues** (for future):
- Map tile loading performance on slow networks
- Custom marker clustering for >50 waypoints
- Offline tile caching

---

## Related Specs & Dependencies

- **Depends on**: Spec 001 (route calculation, OSRM integration)
- **Blocks**: Spec 003 (bulk entry) - no dependency
- **Documentation**: /contracts/map-component.md (TBD)

---

**Created**: 2026-08-22
**Last Updated**: 2026-08-22
**Next**: Create data-model.md, contracts/, tasks.md
