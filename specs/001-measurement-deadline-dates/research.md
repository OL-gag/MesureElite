# Research Summary: Measurement Scheduling with Date Fields

**Status**: ✅ Complete (no external research needed)

**Date**: 2026-08-27

## Findings

All technical decisions for this feature are straightforward and require no external research:

### Decision 1: Date Input Implementation

**Question**: How should date fields be implemented in the React form?

**Decision**: Use HTML5 `<input type="date">` element

**Rationale**:
- Browser-native date input provides date picker UI automatically
- No additional dependencies required
- Works across all modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers provide native date pickers optimized for touch
- Follows project's performance-first principle (minimal bundle impact)

**Alternatives Considered**:
- External date picker library (e.g., react-datepicker): Adds ~40KB to bundle, unnecessary overhead
- Custom date picker component: Requires accessibility work, testing, maintenance
- Text input with validation: Poor UX, no visual date picker

**Selected**: HTML5 native date input (best UX with minimal overhead)

---

### Decision 2: Date Format & Storage

**Question**: How should dates be stored in the AddressInput type?

**Decision**: Use JavaScript `Date` objects in memory; serialize to ISO string (YYYY-MM-DD) for transmission

**Rationale**:
- Date objects are native to JavaScript, allowing native date operations
- HTML5 date inputs work seamlessly with Date objects
- ISO format (YYYY-MM-DD) is language-agnostic and JSON-serializable
- Timezone-aware: Uses browser's local timezone for user-facing display

**Alternatives Considered**:
- Store as string (YYYY-MM-DD): Requires parsing for any date operations
- Use date library (date-fns, dayjs): Adds dependency for basic operations
- Unix timestamp: Less human-readable during debugging

**Selected**: Date objects in-memory with ISO string serialization

---

### Decision 3: Default Date Value

**Question**: What should be the default value for measurement and deadline dates?

**Decision**: Default to today's date when addresses are first created

**Rationale**:
- User expectation: When adding a new task/address, default to "start working on it today"
- Reduces data entry friction (users don't need to set a date if they plan to work today)
- Per spec: "by default the current date"
- Can be changed immediately by user if different date is needed

**Alternatives Considered**:
- No default (empty/undefined): Forces all users to enter dates, adds friction
- Default to tomorrow: Less intuitive for scheduling
- Allow configuration: Overcomplicated for this feature

**Selected**: Default to today's date

---

### Decision 4: Date Validation

**Question**: What validation rules should apply to dates?

**Decision**: No cross-field validation; dates are independent

**Rationale**:
- Flexibility: Users may plan to take measurement after deadline (e.g., if deadline is to schedule, measurement is the actual day)
- Simplicity: Reduces form complexity and error handling
- Follows spec: No requirement for deadline > measurement date
- HTML5 date input handles basic validation (invalid dates rejected)

**Alternatives Considered**:
- Require deadline >= measurement date: Restrictive, may not match real workflows
- Warn if deadline < measurement date: Adds cognitive load without blocking submission

**Selected**: No cross-field validation; allow any date combination

---

### Decision 5: Localization

**Question**: How should date labels be localized?

**Decision**: Use existing i18n system for labels; HTML5 date input uses browser locale

**Rationale**:
- Project already has i18n infrastructure (LanguageContext, translations.ts)
- HTML5 `<input type="date">` automatically uses browser's locale for display
- Users can translate field labels and placeholders through existing system
- No additional configuration needed for internationalization

**Alternatives Considered**:
- Custom date picker with explicit locale support: Unnecessary complexity
- Hardcoded English labels: Doesn't match project's multilingual approach

**Selected**: Existing i18n system for UI text; browser handles date display locale

---

### Decision 6: Schedule Generation Algorithm (US3)

**Question**: How should the system group addresses into daily schedules that respect deadlines?

**Decision**: Greedy algorithm with deadline-first prioritization, followed by OSRM route optimization per day

**Rationale**:
- Deadline constraints are non-negotiable; respecting them is critical
- A simple greedy approach (sort by deadline, pack into days) is fast (< 2 seconds for 50+ addresses)
- OSRM already handles route optimization, leverage existing integration
- Avoids over-engineering complex combinatorial optimization (overkill for typical workload)

**Alternatives Considered**:
- Machine learning / genetic algorithms: Overkill, slower, harder to debug
- Linear programming (constraint solver): Complex to maintain, slower for real-time
- Pure random distribution: Doesn't respect deadlines or distance

**Selected**: Greedy deadline-first + OSRM per-day optimization

---

### Decision 7: Schedule Constraints (US3)

**Question**: What limits should define a "reasonable day" of work?

**Decision**: Max 6 stops per day, skip Saturday/Sunday, no time-of-day constraints for v1

**Rationale**:
- **Max 6 stops**: MesureMG field technician standard (realistic for property measurement work, not package delivery)
- **Working days**: Mon-Fri only (Sat/Sun are rest days, skip automatically)
- **No time-of-day constraints** keeps v1 simple; can add later if business hours needed
- **Multi-criteria optimization**: Balance deadline urgency with geographic distance
- Allows intelligent scheduling: if deadline is tomorrow but preferred date is in 3 days, system moves it earlier

**Alternatives Considered**:
- Max duration (e.g., 8 hours): Requires travel time accuracy, adds complexity
- Max distance (e.g., 100 km): Varies by region, harder to set universally
- User-adjustable max stops: Future enhancement; hardcode to 6 for v1

**Selected**: Max 6 stops/day, Mon-Fri only, intelligent deadline-aware grouping

---

### Decision 8: Manual Reassignment (US3)

**Question**: Should users be able to manually move addresses to different days?

**Decision**: Yes, with drag-and-drop or button to reassign, with automatic route re-optimization

**Rationale**:
- Automatic schedules often need tweaks (technician knows local constraints)
- Drag-and-drop is intuitive for power users
- Re-optimizing after reassignment ensures consistency
- Falls into Phase 6 (Polish) for MVP; can defer if needed

**Alternatives Considered**:
- Locked schedules (no manual changes): Too rigid, reduces user control
- No re-optimization (manual drag only): Leaves suboptimal routes, confusing

**Selected**: Optional drag-and-drop with re-optimization (v1.2+)

---

### Decision 9: Overdue Address Handling (US3)

**Question**: What happens if a deadline has already passed?

**Decision**: Include overdue addresses in the schedule, mark as urgent, assign to earliest available slot

**Rationale**:
- Overdue addresses still need to be measured (business value)
- Marking as urgent signals priority to the technician
- Earliest slot ensures they're handled ASAP
- No error/rejection; graceful handling improves UX

**Alternatives Considered**:
- Reject overdue addresses: Loses important work
- Hide overdue addresses: Causes oversight

**Selected**: Include with urgent priority

---

## No New External Dependencies

This feature requires no new npm packages for core logic:
- Schedule generation uses pure JavaScript/TypeScript
- OSRM integration already exists (reuse `app/api/route/route.ts`)
- UI uses React + HTML5 native components
- No date library needed (browser native Date sufficient)

Optional future additions (not for v1):
- `react-beautiful-dnd` for better drag-and-drop UX
- Date picker library if more complex date interactions needed

## Implementation Readiness

✅ All technical decisions finalized (Decisions 1-9)  
✅ No external research needed  
✅ Ready to proceed to Phase 1 design completion and Phase 2 implementation  
✅ Schedule generation algorithm documented and ready to implement  
✅ API contract defined (POST /api/schedule/generate, POST /api/schedule/{id}/reassign)
