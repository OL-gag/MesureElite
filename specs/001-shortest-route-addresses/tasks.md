# Tasks: Itinéraire le plus court entre une liste d'adresses

**Input**: Design documents from `/specs/001-shortest-route-addresses/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Technology Stack**: Next.js 14+, TypeScript, React, Leaflet, OSRM, Nominatim, Jest, React Testing Library

**Testing Approach**: Unit tests for utilities, integration tests for API routes & components, E2E happy path

**Organization**: Tasks grouped by user story (US1, US2, US3) for independent implementation and testing

---

## Format: `[ID] [P?] [Story] Description (file path)`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (US1, US2, US3) - only for user story phase tasks
- Tasks MUST include exact file paths for clarity

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Initialize Next.js 14+ project with TypeScript and dependencies in `package.json`
- [ ] T002 [P] Create directory structure: `app/`, `__tests__/`, `public/`, per plan.md
- [ ] T003 [P] Setup ESLint, Prettier, and TypeScript configuration (`tsconfig.json`, `.eslintrc.json`)
- [ ] T004 Configure environment variables framework (`.env.example`, `.env.local` gitignored)
- [ ] T005 [P] Setup Jest testing framework with `jest.config.ts` and React Testing Library
- [ ] T006 [P] Configure Vercel deployment with `vercel.json` and GitHub auto-deployment
- [ ] T007 Create base layout and styling in `app/layout.tsx` with TailwindCSS
- [ ] T008 Setup shared TypeScript types in `app/lib/types.ts` (Address, Route, Segment interfaces)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before user story work begins

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T009 [P] Create Nominatim geocoding client in `app/lib/nominatim.ts` (per research.md + data-model.md)
  - Handles address → lat/lon conversion
  - Implements retry logic (2-3 exponential backoff)
  - Caches results in localStorage
  
- [ ] T010 [P] Create OSRM routing client in `app/lib/osrm.ts` (per research.md)
  - Calculates optimal route for waypoints
  - Returns distance, duration, polyline
  - Implements retry logic + error handling
  
- [ ] T011 [P] Create utility functions in `app/lib/utils.ts`
  - Distance/duration formatting
  - Coordinate validation
  - Optimization gain calculation
  
- [ ] T012 [P] Implement API route for geocoding in `app/api/geocode/route.ts` (per contracts/api-geocode.md)
  - Request validation
  - Nominatim integration with retry
  - Response formatting per contract
  - Error handling: 400, 429, 500
  
- [ ] T013 [P] Implement API route for routing in `app/api/route/route.ts` (per contracts/api-route.md)
  - Request validation (2-25 waypoints)
  - OSRM integration with retry
  - Response formatting per contract
  - Error handling: 400, 429, 500
  
- [ ] T014 [P] Create shared error handling utilities in `app/lib/errors.ts`
  - Retry logic with exponential backoff
  - User-facing error messages
  - Logging framework

- [ ] T015 Setup environment variable templates for Nominatim/OSRM in `.env.example`

**Checkpoint**: All APIs functional and tested. Ready for user story implementation.

---

## Phase 3: User Story 1 - Optimiser un itinéraire multi-adresses (Priority: P1) 🎯 MVP

**Goal**: User can input 2-25 addresses, submit, and get optimized route with distance/duration

**Independent Test**: Manually enter 3 known addresses (Portland, OR addresses recommended per quickstart.md), verify optimized order differs from input order, validate distance/duration calculated

### Implementation for User Story 1

- [ ] T016 [P] [US1] Create AddressForm component in `app/components/AddressForm.tsx`
  - Multi-line address input field
  - Add/remove address rows
  - Form validation (2-25 addresses, not empty)
  - Real-time geocoding on blur
  - Display validation status per address (✓, ✗, ⚠️ ambiguous)
  
- [ ] T017 [P] [US1] Create AddressInput state/types in `app/lib/types.ts`
  - Address, Route, Waypoint, Segment interfaces
  - State management for address list
  
- [ ] T018 [US1] Create home page (`app/page.tsx`)
  - Render AddressForm component
  - Handle form submission
  - Call `POST /api/geocode` to validate addresses
  - Display geocoding results
  - Show "Calculate Route" button (enabled if ≥ 2 valid addresses)
  
- [ ] T019 [US1] Implement route calculation workflow in `app/page.tsx`
  - After geocoding succeeds, call `POST /api/route` with valid addresses
  - Display loading state during calculation
  - Handle OSRM errors (unreachable waypoints, timeout)
  - Navigate to results page on success

- [ ] T020 [US1] Create results page (`app/results/page.tsx`)
  - Display optimized waypoint order
  - Display total distance (km or miles, user choice)
  - Display total duration (hours:minutes format)
  - Display optimization gain percentage (vs original order)
  - "Back to Input" button
  
- [ ] T021 [P] [US1] Create integration tests in `__tests__/integration/test_geocode_route.ts`
  - Test happy path: 3 addresses → geocoded → routed → results displayed
  - Test error: invalid address → marked as invalid, other addresses processed
  - Test validation: 1 address → error message, ≥2 valid → route button enabled

- [ ] T022 [P] [US1] Create unit tests for utilities in `__tests__/unit/test_utils.ts`
  - Distance/duration formatting functions
  - Optimization gain calculation
  
- [ ] T023 [US1] Add error boundary in `app/components/ErrorBoundary.tsx`
  - Catch and display errors gracefully
  - Show retry option for API failures

**Checkpoint**: User Story 1 COMPLETE and TESTABLE independently
- User can input addresses → geocode → calculate route → see results
- Test via: `npm test` (unit + integration) + manual E2E per quickstart.md Scenario 1
- Ready to deploy this increment as MVP

---

## Phase 4: User Story 2 - Visualiser le détail de l'itinéraire (Priority: P2)

**Goal**: User can see route on interactive map, segment details, and full itinerary

**Independent Test**: After route calculation (from US1), verify map displays all waypoints + polyline, click marker shows segment details

### Implementation for User Story 2

- [ ] T024 [P] [US2] Create RouteMap component in `app/components/RouteMap.tsx` (per plan.md, research.md)
  - Initialize Leaflet map (React-Leaflet)
  - Render markers for each waypoint
  - Render polyline for optimized route
  - Color markers: red (start), blue (intermediate), green (end) or use numbered markers
  - Zoom to fit all waypoints on load
  - Support zoom/pan interactions
  - Touch gestures for mobile
  
- [ ] T025 [P] [US2] Create RouteDetails component in `app/components/RouteDetails.tsx`
  - Display step-by-step itinerary
  - Each row: "Step N: [Address] → [Next Address]"
  - Display segment distance + duration
  - Display cumulative distance/duration at end of each row
  - Format: friendly units (km or miles, H:MM)
  
- [ ] T026 [US2] Update results page (`app/results/page.tsx`)
  - Import and render RouteMap component
  - Import and render RouteDetails component
  - Layout: map on left, itinerary on right (responsive: stacked on mobile)
  - Pass route data (from state/props) to both components

- [ ] T027 [P] [US2] Create marker click handler in RouteMap
  - On click, show popup/modal with:
    - Full address name
    - Distance to next waypoint
    - Duration to next waypoint
    - Remove option (TODO: ties to US3)
  
- [ ] T028 [P] [US2] Create integration tests in `__tests__/integration/test_map_display.ts`
  - After route calculation, map displays all waypoints
  - All markers clickable and show correct details
  - Polyline exists and connects waypoints in order
  
- [ ] T029 [US2] Manual E2E test per quickstart.md Scenario 1
  - Run `npm run dev`
  - Input 3 addresses → geocode → route
  - Verify map displays markers + polyline
  - Click markers, verify popups

**Checkpoint**: User Story 2 COMPLETE and TESTABLE independently
- Users can see full route on map with interactive details
- Both US1 and US2 work together
- Ready to deploy this increment

---

## Phase 5: User Story 3 - Recalculer après modification de la liste (Priority: P3)

**Goal**: User can edit address list and recalculate without resubmitting form

**Independent Test**: Calculate route for 3 addresses, modify address 2, recalculate, verify new route calculated

### Implementation for User Story 3

- [ ] T030 [P] [US3] Add edit mode to AddressForm in `app/components/AddressForm.tsx`
  - "Edit Route" button on results page
  - Re-populate form with current addresses
  - Keep previously geocoded coords (prepopulate)
  
- [ ] T031 [US3] Update results page (`app/results/page.tsx`)
  - Add "Edit Addresses" button
  - On click, show address form overlay or navigate to edit mode
  - Support modify/add/remove operations
  
- [ ] T032 [P] [US3] Create RouteModify state management in `app/lib/types.ts`
  - Track which addresses changed
  - Support add/remove address from itinerary
  
- [ ] T033 [US3] Implement modify-and-recalculate workflow
  - User edits address → re-geocode only changed addresses
  - Call `/api/geocode` for new/modified addresses
  - Call `/api/route` with updated waypoints
  - Display updated results
  
- [ ] T034 [P] [US3] Create integration tests in `__tests__/integration/test_modify_route.ts`
  - Initial route for 3 addresses
  - Modify address 2 → new route calculated
  - Remove address → recalculate with remaining 2
  - Add address → recalculate with 4

- [ ] T035 [US3] Update RouteMap to support remove marker action (per T027)
  - Clicking marker → popup with "Remove from route" button
  - Remove → re-geocode + recalculate
  - Update map and itinerary immediately

**Checkpoint**: User Story 3 COMPLETE and TESTABLE independently
- All 3 user stories working together
- Full feature complete per spec.md

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Refinements, performance, and final quality checks

- [ ] T036 [P] Create comprehensive unit tests in `__tests__/unit/`
  - nominatim.ts: geocoding logic, retry, caching
  - osrm.ts: routing logic, retry, error handling
  - utils.ts: distance/duration formatting, optimization gain
  
- [ ] T037 [P] Create contract tests in `__tests__/contract/`
  - POST /api/geocode: Request/response per contracts/api-geocode.md
  - POST /api/route: Request/response per contracts/api-route.md
  - Error scenarios (400, 429, 500)
  
- [ ] T038 [P] Performance optimization
  - Verify LCP < 2.5s via Lighthouse audit (`npm run build && vercel dev`)
  - Optimize image loading (if any via next/image)
  - Minimize bundle size (check via `npm run build`)
  - Implement API response caching where appropriate
  
- [ ] T039 [P] Error handling & UX polish
  - Test all error scenarios per quickstart.md (ambiguous, not found, timeout, inaccessible, >25 addresses)
  - Verify error messages are clear and actionable
  - Implement proper loading states (spinners, progress indicators)
  
- [ ] T040 Mobile responsiveness testing
  - Test on 320px width (mobile per plan.md)
  - Test on 768px width (tablet)
  - Test on 1280px width (desktop)
  - Verify touch gestures (zoom, pan)
  - Test on real devices (iOS Safari, Android Chrome) if possible
  
- [ ] T041 [P] Documentation & code cleanup
  - Update README.md with setup instructions per plan.md
  - Document API contracts in code comments
  - Add JSDoc comments to exported functions
  - Clean up unused dependencies
  
- [ ] T042 [P] Verify environment variable setup
  - `.env.example` complete with all required vars
  - Vercel project secrets configured
  - No hardcoded API keys in code
  
- [ ] T043 Run full quickstart.md validation (manual)
  - Complete all 8 test scenarios in quickstart.md
  - Verify happiness path works end-to-end
  - Test error scenarios
  - Performance validation (< 5s for 10 addresses)
  
- [ ] T044 [P] Security review
  - No XSS vulnerabilities (sanitize user input)
  - No CSRF issues (verify API routes)
  - API rate-limiting handled (Nominatim 1 req/sec, OSRM limits)
  - No secrets in logs or error messages
  
- [ ] T045 Final pre-deployment checklist
  - All tests passing: `npm test`
  - Build succeeds: `npm run build`
  - No TypeScript errors: `npm run type-check`
  - No console warnings in production build
  - README.md updated with feature description

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup) → MUST COMPLETE
       ↓
Phase 2 (Foundational APIs) → MUST COMPLETE (BLOCKS all user stories)
       ↓
Phase 3 (US1) ─┐
Phase 4 (US2) ─┼─ Can run in parallel (if staffed)
Phase 5 (US3) ─┘
       ↓
Phase 6 (Polish) → Final QA & deployment
```

### User Story Dependencies

- **US1 (P1)**: No dependencies on other stories - can start after Foundational
- **US2 (P2)**: Integrates with US1 (uses route data), but independently testable
- **US3 (P3)**: Integrates with US1 & US2, but independently testable

### Within Each User Story

1. Components/Models before services
2. Services before endpoints
3. Endpoints before integration tests
4. Integration tests before moving to next story
5. Each story independently testable before proceeding

### Parallel Opportunities

**Setup (Phase 1)**:
- T002, T003, T004, T005, T006, T007 can run in parallel

**Foundational (Phase 2)**:
- T009, T010, T011, T012, T013, T014 can run in parallel
- T015 must wait on environment setup

**User Story 1 (Phase 3)**:
- T016, T017 (components) can run in parallel
- T021, T022 (tests) can run in parallel once T016, T017 done

**User Stories 2 & 3 (Phases 4 & 5)**:
- Once Phase 2 complete, US2 and US3 can be worked on in parallel by different developers

**Polish (Phase 6)**:
- T036, T037, T038, T039, T040, T041, T042, T044 can run in parallel

---

## Parallel Example: Complete US1 in Parallel

```bash
Developer A: T016 (AddressForm component)
Developer B: T017 (Address types & state)
Developer C: T012 (Geocoding API route) [from Foundational]

Once Foundational complete (T009-T015):
Developer A: T018 (home page) → waits on T016
Developer B: T019 (routing workflow) → waits on T012, T013
Developer C: T020 (results page)

Tests run in parallel:
Developer A: T021 (integration tests)
Developer B: T022 (unit tests)

Result: US1 complete in parallel, faster than sequential
```

---

## Implementation Strategy

### MVP First (User Story 1 Only) ⭐ RECOMMENDED

**Estimated Timeline**: 3-4 days (1 developer)

1. **Days 1-1.5**: Complete Phase 1 (Setup) + Phase 2 (Foundational APIs)
   - Initialize project, setup tooling, implement API clients
   - Run `npm test` to verify API routes work
   
2. **Days 1.5-3**: Complete Phase 3 (User Story 1)
   - AddressForm → home page → results page
   - Integrate geocoding + routing
   - Test via quickstart.md Scenario 1
   
3. **Day 3.5-4**: Polish Phase 3
   - Error handling, mobile responsiveness, performance optimization
   - Full test suite for US1
   
4. **Deploy & Validate**:
   - Push to main → Vercel auto-deploys
   - Test live at https://measuremg.vercel.app
   - Celebrate MVP! 🎉

### Then Incremental: Add US2 & US3

- **After MVP approved**: Day 5-6 = Add US2 (map + details)
- **After US2 approved**: Day 7-8 = Add US3 (modify & recalculate)
- **Final Polish**: Day 8-9 = Performance, security, full test coverage

### Parallel Team Strategy (If 3+ Developers)

- **Developer A**: Phase 1 + Phase 2 (Setup + APIs) — 2 days
- **Developer B + C**: Wait for A to complete Phase 2
- **Then split**:
  - Developer A: US1 (input form, geocoding, routing)
  - Developer B: US2 (map component, itinerary display)
  - Developer C: US3 (modify/recalculate) + Tests
- **Merge**: All complete, then Phase 6 (Polish) together

---

## Checkpoint Validation

After each phase/story, verify:

1. **Build succeeds**: `npm run build` (no errors)
2. **Tests pass**: `npm test` (100% of phase tests)
3. **Type checking**: `npm run type-check` (no TypeScript errors)
4. **Manual validation**: Run feature per quickstart.md scenario
5. **Performance**: Check Lighthouse score (LCP < 2.5s)

---

## Success Criteria (Definition of Done)

✅ All tasks completed and checked off
✅ All tests passing (unit + integration)
✅ No TypeScript errors, no console warnings
✅ Performance validated: < 5s for 10 addresses (per SC-001)
✅ Mobile responsive (320px, 768px, 1280px widths tested)
✅ All 8 quickstart.md scenarios pass
✅ Error handling tested (all edge cases per spec.md)
✅ Code reviewed (if applicable)
✅ Deployed to Vercel and live at https://measuremg.vercel.app
✅ README.md updated with feature description

---

## Notes

- **[P] tasks** = parallelizable (different files, no blocking dependencies)
- **[US#] tasks** = belong to specific user story for traceability
- **Dependencies**: Read the "Dependencies & Execution Order" section carefully
- **Stop & validate**: After each story is complete, validate independently per quickstart.md
- **Avoid merge conflicts**: Assign different files to different developers when parallel
- **Commit frequently**: After each task or logical group (not after entire phase)
- **Test locally before push**: `npm test && npm run type-check`

---

## Task Summary

| Phase | Tasks | Focus | Time Estimate |
|-------|-------|-------|---|
| **Setup** | T001-T008 | Project init, tooling, layout | 1 day |
| **Foundational** | T009-T015 | API clients, geocoding, routing | 2 days |
| **US1 (P1)** | T016-T023 | Input form, geocoding, routing, results | 3 days |
| **US2 (P2)** | T024-T029 | Map display, itinerary, details | 2 days |
| **US3 (P3)** | T030-T035 | Modify & recalculate | 1.5 days |
| **Polish** | T036-T045 | Tests, performance, security, docs | 1.5 days |
| **TOTAL** | **45 tasks** | Full feature complete | **~11 days (1 dev)** or **~6 days (3 devs parallel)** |

---

**Ready to implement!** Start with Phase 1 (Setup) and follow the dependencies. First MVP checkpoint: End of Phase 3 (User Story 1). Happy coding! 🚀
