# Implementation Notes & Bug Fixes

**Purpose**: Track bugs found during implementation, their root causes, and solutions. Prevents regression on future re-implementations.

---

## Bug #1: Geocoded Coordinates Not Passed to Routing API

**Date Found**: 2026-08-21 (During Phase 3 implementation)

**Severity**: 🔴 Critical (Feature broken)

**Symptom**: 
- User enters addresses
- Addresses geocoded successfully (✅)
- Routing API call fails with "missing lat/lon" error
- Results page never loads

**Root Cause**:
- `AddressForm.tsx` was creating `AddressInput` objects with `geocodedCoords: undefined`
- Data flow: Form → Geocode Results → AddressInput (coordinates lost!)
- Home page couldn't extract lat/lon from AddressInput, only from geocodeResults
- Mismatch between what Form passed and what Router expected

**Files Affected**:
- `app/components/AddressForm.tsx` (line ~90)
- `app/page.tsx` (line ~20)

**The Fix** (Applied 2026-08-21):

### In `AddressForm.tsx`:
```typescript
// BEFORE (❌ Bug):
const addressInputs: AddressInput[] = filledAddresses.map((text, i) => ({
  id: generateId(),
  text,
  order: i + 1,
  isStartPoint: i === 0,
  status: 'valid',
  geocodedCoords: undefined,  // ← LOST COORDINATES!
  createdAt: new Date(),
  updatedAt: new Date(),
}))

// AFTER (✅ Fixed):
const addressInputs: AddressInput[] = filledAddresses.map((text, i) => ({
  id: generateId(),
  text,
  order: i + 1,
  isStartPoint: i === 0,
  status: geocodeResults.results[i]?.status === 'valid' ? 'valid' : 'invalid',
  geocodedCoords: geocodeResults.results[i]?.status === 'valid' ? {
    lat: geocodeResults.results[i].lat,
    lon: geocodeResults.results[i].lon,
    displayName: geocodeResults.results[i].displayName,
  } : undefined,  // ← COORDINATES NOW PRESERVED!
  error: geocodeResults.results[i]?.error,
  createdAt: new Date(),
  updatedAt: new Date(),
}))
```

### In `app/page.tsx`:
```typescript
// BEFORE (❌ Bug):
const waypoints = validResults.map((r: any) => ({
  id: r.id,
  lat: r.lat,        // ← Assumes geocodeResults has coords
  lon: r.lon,
  displayName: r.displayName,
}))

// AFTER (✅ Fixed):
const waypoints = validResults.map((r: any, index: number) => {
  if (!r.lat || !r.lon) {
    throw new Error(`Address ${index + 1} missing coordinates`)
  }
  return {
    id: `wp-${index}`,
    lat: parseFloat(r.lat),      // ← Explicit validation
    lon: parseFloat(r.lon),
    displayName: r.displayName || `Address ${index + 1}`,
  }
})
```

**Test Case** (to verify fix):
1. Enter: "Pioneer Courthouse Square, Portland OR"
2. Enter: "Oregon Museum of Science and Industry, Portland OR"
3. Click "Optimize Route"
4. ✅ Should reach results page (not error)
5. ✅ Should show distance, duration, optimization gain

**Prevention for Future**:
- ✅ Test full flow: Input → Geocode → Route → Results (not just individual APIs)
- ✅ Verify data is passed between components correctly
- ✅ Add console.log at each step to trace data flow
- ✅ Never lose data through intermediate state transformations

---

## Lessons Learned

1. **Data Flow Tracing**: 
   - Track data through: Form → geocodeResults → AddressInput → Route API
   - Each transformation point is a potential bug site
   - Test the FULL pipeline, not isolated APIs

2. **Type Safety**:
   - TypeScript helped catch `geocodedCoords: undefined` 
   - But didn't prevent passing wrong shape to API
   - Add runtime validation (checks for lat/lon existence)

3. **Error Messages**:
   - Generic "missing lat/lon" wasn't helpful
   - Added which address # was problematic
   - Better for users to debug

4. **Testing Order**:
   - Should test full user flow BEFORE assuming isolated APIs work
   - Geocoding API works ≠ Route API works ≠ End-to-end flow works

---

## How to Use This Document

**When re-implementing**: Read this FIRST before writing code
**When refactoring**: Check if any changes affect the data flow above
**When debugging**: If coordinates are lost, check the patterns documented here
**When adding features**: Follow the same data-flow-first approach

---

## Related Files
- `tasks.md` → T018-T020 (data flow through pages)
- `data-model.md` → AddressInput, Route, Waypoint definitions
- `contracts/api-geocode.md` → What geocode API returns
- `contracts/api-route.md` → What route API expects

---

**Last Updated**: 2026-08-21
**Status**: Bug fixed ✅, documented for future reference
