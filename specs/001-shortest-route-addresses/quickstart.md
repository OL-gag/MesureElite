# Quickstart: Validation & Testing Guide

**Purpose**: Provide runnable validation scenarios to prove the feature works end-to-end

**Prerequisites**:
- Node.js 18+ installed
- npm or yarn available
- Local Vercel dev environment running (`vercel dev` or `npm run dev`)
- Nominatim & OSRM Public APIs accessible (no local setup required)

---

## Setup & Environment

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create `.env.local` with (or use defaults):

```env
# Nominatim (Public API, no key required)
NEXT_PUBLIC_NOMINATIM_BASE_URL=https://nominatim.openstreetmap.org

# OSRM (Public API, no key required)
NEXT_PUBLIC_OSRM_BASE_URL=https://router.project-osrm.org
```

### 3. Start Local Development Server

```bash
npm run dev
# Server runs at http://localhost:3000
```

---

## Test Scenario 1: Happy Path (2 Addresses)

**Goal**: User enters 2 addresses, sees optimized route with map

### Step 1: Open Application

Navigate to `http://localhost:3000`

Expected: Address input form loads (no errors in console)

### Step 2: Enter Addresses

In the address form, enter:
1. "123 Main St, Portland OR"
2. "456 Oak Ave, Portland OR"

Expected: 
- Input accepts multi-line or multi-field format
- Both addresses appear in the list
- "Start" button is enabled (≥ 2 addresses)

### Step 3: Submit & Geocode

Click "Start" (or equivalent submit button)

Expected:
- Status shows "Geocoding..." temporarily
- Both addresses geocoded and shown with canonical names (e.g., "123 Main Street, Portland, Oregon, USA")
- Green checkmarks appear next to each address

### Step 4: Calculate Route

Application automatically triggers route calculation

Expected:
- Status shows "Calculating..." temporarily
- Results page appears with:
  - Optimized waypoint order (may differ from input order)
  - Total distance (in km or miles)
  - Total duration (in minutes)
  - Optimization gain % (e.g., "+15% shorter")
  - Map displays both addresses as markers + polyline connecting them

### Step 5: Interact with Map

- Zoom in/out using mouse wheel or zoom controls
- Pan by dragging
- Click on a marker

Expected:
- Map is responsive and fluid
- Clicking marker shows popup with address + segment details (distance, duration to next point)

### Expected Output (Sample)

```
Route Results:
================
Optimized Order: [Main St] → [Oak Ave] → [Main St]
Total Distance: 2.4 km
Total Duration: 4 min 30 sec
Optimization Gain: +12.5%

Map: [Leaflet map showing route]
```

---

## Test Scenario 2: Error Handling (Address Not Found)

**Goal**: User enters an invalid address; system handles gracefully

### Step 1: Enter Mixed Valid/Invalid Addresses

1. "123 Main St, Portland OR" (valid)
2. "XYZ Nonexistent Street, ZZ" (invalid)
3. "456 Oak Ave, Portland OR" (valid)

### Step 2: Submit

Click "Start"

Expected:
- Address 1 & 3 geocoded successfully (✓ checkmarks)
- Address 2 shows red ✗ with error: "Address not found: 'XYZ Nonexistent Street, ZZ'. Please check spelling."
- System offers option: "Continue with 2 addresses?" or "Try another"

### Step 3: Continue with Valid Addresses

Click "Continue with Valid Addresses"

Expected:
- Route calculated using addresses 1 & 3 only
- Results page shows 2-stop route
- No failures or blank map

---

## Test Scenario 3: Ambiguous Address

**Goal**: Nominatim returns multiple matches

### Step 1: Enter Ambiguous Address

1. "123 Main St, Portland OR"
2. "Oak Ave" (ambiguous; exists in multiple cities)

### Step 2: Submit

Click "Start"

Expected:
- Address 1 geocoded successfully
- Address 2 shows warning: "Multiple matches found. Using: 'Oak Avenue, Portland, OR'. Modify address if different city needed."
- Top match selected automatically (Portland, OR)
- User can click "Edit" to see alternatives

### Step 3: Accept & Route

Click "Continue"

Expected:
- Route calculated using the selected disambiguation
- Map shows route with resolved coordinates

---

## Test Scenario 4: Performance (10 Addresses)

**Goal**: Verify performance meets SC-001 (< 5 seconds for 10 addresses)

### Step 1: Prepare Test Data

Create a file `test-addresses.json`:

```json
[
  "123 Main St, Portland OR",
  "456 Oak Ave, Portland OR",
  "789 Elm St, Portland OR",
  "321 Maple Rd, Portland OR",
  "654 Pine Ln, Portland OR",
  "987 Birch Way, Portland OR",
  "147 Cedar Dr, Portland OR",
  "258 Walnut Pl, Portland OR",
  "369 Spruce Ave, Portland OR",
  "741 Ash Blvd, Portland OR"
]
```

### Step 2: Measure Time

- Open browser DevTools → Network tab → Performance tab
- Note timestamp before clicking "Start"

### Step 3: Submit All Addresses

Paste or enter all 10 addresses, click "Start"

Expected:
- Geocoding completes within 3-4 seconds
- Route calculation completes within 1-2 seconds
- **Total time < 5 seconds** ✓

### Step 4: Verify Results

Expected:
- 10 waypoints on map
- Optimized order differs from input order
- All segments calculated with distances/durations
- Map responsive and smooth

---

## Test Scenario 5: Max Addresses (25)

**Goal**: Verify system handles maximum address limit

### Step 1: Prepare 25 Addresses

Use a test file or form with 25 distinct Portland-area addresses

### Step 2: Submit

Click "Start"

Expected:
- All 25 geocoded and routed
- Performance remains acceptable (may approach 5-10s upper limit)
- Map zooms to fit all waypoints
- No errors or blank sections

### Step 3: Try 26 Addresses

Attempt to submit 26 addresses

Expected:
- Form validation prevents submission
- Error message: "Maximum 25 addresses. Please split into smaller batches."

---

## Test Scenario 6: Edge Case - Duplicate Addresses

**Goal**: System handles duplicate or very close addresses

### Step 1: Enter Duplicate Address

1. "123 Main St, Portland OR"
2. "123 Main St, Portland OR" (exact duplicate)

### Step 2: Submit

Click "Start"

Expected:
- Both geocoded to same coordinates
- Route displays both as distinct waypoints
- No error (duplicates are allowed, though redundant)
- Distance between them shown as 0 meters

---

## Test Scenario 7: Modify & Recalculate

**Goal**: User can change addresses and recalculate without reloading

### Step 1: Complete Route for 3 Addresses

Follow Scenario 1 or 2

### Step 2: Modify Address

Click "Edit" on the address list, change address 2 from "Oak Ave" to "Elm St"

Expected:
- Address list updates
- Geocoding triggered for new address
- Route automatically recalculated

### Step 3: Verify New Route

Expected:
- Map updates with new waypoints
- Total distance/duration changed
- Optimization gain recalculated

---

## Test Scenario 8: Retry & Failure Handling

**Goal**: API failure (simulated) is handled with retry and user feedback

### (Simulation required; skip if no test environment)

If using a mock server or test harness:

1. Simulate Nominatim timeout (500 error)
2. Verify retry behavior: "Geocoding... (retry 1/3)"
3. After 3 retries, show error: "Geocoding service temporarily unavailable. Try again?"

Expected behavior per research.md: Retry 2-3x with exponential backoff

---

## Automated Testing (Unit & Integration)

### Run Test Suite

```bash
npm run test
```

### Expected Coverage

- **Unit Tests**: 
  - Geocoding utility (mock Nominatim)
  - Routing utility (mock OSRM)
  - Distance/duration calculations
  - State machine transitions (AddressInput status)

- **Integration Tests**:
  - API route `/api/geocode` (request/response)
  - API route `/api/route` (request/response)
  - End-to-end form → results flow (React Testing Library)

### Sample Test Command

```bash
npm run test -- --coverage
```

Expected: ≥ 80% code coverage for critical paths

---

## Browser Compatibility

Test in:
- ✓ Chrome/Edge (latest)
- ✓ Firefox (latest)
- ✓ Safari (latest)
- ✓ Mobile Chrome (Android)
- ✓ Mobile Safari (iOS)

Expected: All scenarios pass on all browsers

---

## Troubleshooting

### "Cannot geocode address" error

**Cause**: Nominatim API unavailable or rate-limited
**Fix**: Wait 1-2 minutes, try again (rate limit is 1 req/sec)

### "Routing service unavailable" error

**Cause**: OSRM Public API down or overloaded
**Fix**: Try a smaller batch of addresses; retry after 30 seconds

### Map not displaying

**Cause**: Leaflet library not loaded or missing OpenStreetMap tiles
**Fix**: Check network tab for failed requests; verify CDN/API connectivity

---

## Performance Profiling (Optional)

Use browser DevTools → Performance tab:

1. Record geocoding + routing steps
2. Identify bottlenecks (API calls, re-renders)
3. Verify LCP < 2.5s (Lighthouse audit)

---

## Definition of Done

✅ All 8 test scenarios pass locally
✅ No console errors (browser DevTools)
✅ Performance < 5s for 10 addresses
✅ Map responsive on mobile & desktop
✅ Error messages clear and actionable
✅ Automated tests pass (≥ 80% coverage)
✅ Ready for deployment to Vercel
