# Quickstart: Measurement Scheduling with Date Fields

**Purpose**: Validate that users can add, modify, and view measurement and deadline dates for addresses

**Prerequisites**:
- Node.js LTS installed
- Project dependencies installed (`npm install`)
- Next.js dev server running (`npm run dev`)

## Setup

```bash
# Install dependencies if not already done
npm install

# Start the development server
npm run dev

# Open browser to http://localhost:3000
```

## Test Scenarios

### Scenario 1: New Address Gets Default Dates (P1)

**Objective**: Verify that newly created addresses default measurement and deadline dates to today.

**Steps**:
1. Navigate to http://localhost:3000
2. Fill in the start address (e.g., "123 Main St, Toronto")
3. Add 2-3 stop addresses
4. Observe the form (before submission)
5. Check that measurement date and deadline date fields are visible and set to today's date

**Expected Result**: 
- Both date fields display today's date (e.g., "2026-08-27")
- Fields are editable (not disabled)
- Both dates match the current system date

**Console Check**: No errors or warnings in browser console (F12 → Console tab)

---

### Scenario 2: Modify Measurement Date (P1)

**Objective**: Verify that users can change the measurement date independently.

**Steps**:
1. Navigate to http://localhost:3000
2. Fill in the start address
3. Add 2 stop addresses
4. Click on the measurement date field for the first stop address
5. Select a different date (e.g., 5 days from now)
6. Verify the date picker closes and the new date is displayed

**Expected Result**:
- Date picker UI appears when field is clicked
- Date can be selected (past, today, or future dates all accepted)
- Selected date persists in the field after closing date picker
- Other fields (address text, deadline date) remain unchanged
- Form remains valid for submission

---

### Scenario 3: Modify Deadline Date (P1)

**Objective**: Verify that users can change the deadline date independently.

**Steps**:
1. Navigate to http://localhost:3000
2. Fill in the start address
3. Add 2 stop addresses
4. Click on the deadline date field for the first stop address
5. Select a different date (e.g., 7 days from now)
6. Verify the date picker closes and the new date is displayed

**Expected Result**:
- Date picker UI appears when field is clicked
- Date can be selected (past, today, or future dates all accepted)
- Selected date persists in the field after closing date picker
- Measurement date and other fields remain unchanged
- Form remains valid for submission

---

### Scenario 4: Dates Are Independent (P1)

**Objective**: Verify that measurement date and deadline date are independent and can be set to any combination.

**Steps**:
1. Navigate to http://localhost:3000
2. Add start and stop addresses
3. For the first stop address:
   - Set measurement date to August 30, 2026
   - Set deadline date to August 27, 2026 (before measurement date)
4. Observe: No error or warning appears
5. Verify form can still be submitted

**Expected Result**:
- Both dates accepted without validation errors
- No warning or constraint shown (deadline before measurement is allowed)
- Form submission succeeds with mismatched dates

---

### Scenario 5: Multiple Addresses Maintain Separate Dates (P1)

**Objective**: Verify that each address has independent date fields.

**Steps**:
1. Navigate to http://localhost:3000
2. Add start address
3. Add 3 stop addresses
4. Set different measurement and deadline dates for each stop:
   - Stop 1: Measurement Aug 28, Deadline Aug 30
   - Stop 2: Measurement Aug 29, Deadline Aug 31
   - Stop 3: Measurement Aug 27, Deadline Sep 02
5. Scroll through form and verify each address shows its unique dates

**Expected Result**:
- Each address maintains its own date values
- Dates for one address don't affect others
- All dates remain editable throughout the form

---

### Scenario 6: Mobile Responsiveness (Accessibility)

**Objective**: Verify that date fields are usable on mobile devices.

**Steps**:
1. Open DevTools (F12)
2. Enable device emulation (toggle device toolbar)
3. Select a mobile device preset (e.g., iPhone 12)
4. Navigate to http://localhost:3000
5. Fill in addresses
6. Tap on date fields
7. Verify date picker opens and dates can be selected with touch

**Expected Result**:
- Date input fields are visible and appropriately sized on mobile
- Date picker opens (browser-native or fallback)
- Touch selection works without issues
- No horizontal scroll required

---

### Scenario 7: Clear and Reselect Dates (Edge Case)

**Objective**: Verify that dates can be cleared and re-entered.

**Steps**:
1. Navigate to http://localhost:3000
2. Add addresses with default dates
3. Click on measurement date field
4. Clear the field (select all and delete, or use browser's clear button)
5. Verify the field is now empty
6. Click the field again and select a new date
7. Verify the new date appears

**Expected Result**:
- Date field can be cleared (becomes empty)
- New date can be selected after clearing
- Field behavior is consistent with browser's default date input

---

## Code Locations for Testing

**Component Under Test**: [app/components/AddressForm.tsx](../../app/components/AddressForm.tsx)

**Type Definition**: [app/lib/types.ts](../../app/lib/types.ts)

**Data Model Reference**: [data-model.md](data-model.md)

**Unit Tests Location**: `__tests__/components/AddressForm.test.tsx` (to be created in implementation phase)

## Browser Compatibility

- Chrome/Edge: Full support (native `<input type="date">`)
- Firefox: Full support (native `<input type="date">`)
- Safari: Full support (native `<input type="date">`)
- Mobile browsers: Full support with native date picker

## Scenario 8: Generate Optimal Schedule (P2) 🎯

**Objective**: Verify that the system generates an optimal daily schedule respecting deadline constraints.

**Steps**:
1. Navigate to http://localhost:3000
2. Add 8-10 addresses with various measurement dates and deadlines:
   - Some with deadline today
   - Some with deadline tomorrow
   - Some with deadline 3-5 days out
3. Submit the form to trigger schedule generation
4. Observe the generated schedule page

**Expected Result**:
- Schedule displays multiple days of planned routes
- Each day shows: ordered stops, total distance, total duration
- No address is scheduled after its deadline
- Routes are geographically optimized (nearby addresses grouped)
- Addresses with urgent deadlines appear first in their assigned day

**Sample Input**:
```
Start: 100 First Ave, Toronto
Stop 1: 200 Oak St - Measurement: Today, Deadline: Today
Stop 2: 300 Elm Ave - Measurement: Tomorrow, Deadline: Tomorrow
Stop 3: 400 Pine Rd - Measurement: 3 days, Deadline: 3 days
Stop 4: 500 Maple Dr - Measurement: Today, Deadline: Tomorrow
...
```

**Expected Output**:
```
DAY 1 - Aujourd'hui (5 stops)
├─ Stop 1: 200 Oak St (Deadline: Today - URGENT ⚠️)
├─ Stop 2: 500 Maple Dr (Deadline: Tomorrow)
├─ Stop 3: 100 First Ave (Start point)
├─ Total: 35 km, 2h15min

DAY 2 - Demain (3 stops)
├─ Stop 1: 300 Elm Ave (Deadline: Tomorrow)
├─ ...
```

---

### Scenario 9: Manually Reassign Address to Different Day (P2)

**Objective**: Verify that users can manually move addresses between days and routes re-optimize.

**Steps**:
1. From the generated schedule (Scenario 8)
2. Select an address from Day 1
3. Drag it to Day 2 (or click "Move to different day")
4. Observe the route recalculation

**Expected Result**:
- Address moves to the new day
- Source day's route re-optimizes (fewer stops, possibly shorter)
- Target day's route re-optimizes (more stops, addresses reordered geographically)
- Total distance/duration update for both days
- Reassignment completes in < 1 second

---

### Scenario 10: Handle Overdue Addresses (P2)

**Objective**: Verify that addresses with passed deadlines are still scheduled and prioritized.

**Steps**:
1. Navigate to http://localhost:3000
2. Add addresses where some have deadlines in the past (e.g., 2 days ago)
3. Submit to generate schedule

**Expected Result**:
- Overdue addresses are included in the schedule
- They are marked as "OVERDUE" with urgent visual indicator (🔴)
- They are scheduled to the earliest available slot
- No error is thrown; system handles gracefully

---

## Known Limitations (Out of Scope for This Phase)

- Timezone-aware date handling (dates use local browser timezone)
- Date persistence to backend (in-memory only for P1)
- Time-of-day constraints (schedule is day-level only)
- Driver/technician availability constraints (not considered in optimization)
- Weather or road condition impacts
- Multi-day route continuity (route can start/end anywhere each day)

## Validation Checklist

After testing, verify all items:

- [ ] Scenario 1: New addresses default to today's date
- [ ] Scenario 2: Measurement date can be modified independently
- [ ] Scenario 3: Deadline date can be modified independently
- [ ] Scenario 4: Dates are independent (no validation between them)
- [ ] Scenario 5: Multiple addresses maintain separate dates
- [ ] Scenario 6: Mobile responsiveness works correctly
- [ ] Scenario 7: Dates can be cleared and re-entered
- [ ] No console errors or warnings
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] Linting passes (`npm run lint`)
- [ ] Form submission still works (routes are calculated correctly)

## Troubleshooting

**Date Picker Not Appearing**: 
- Check browser console for JavaScript errors
- Verify date input elements are rendered (inspect HTML)
- Some older browsers may show text input instead of date picker

**Dates Not Persisting**:
- Dates are in-memory only; page refresh will reset to defaults
- This is expected behavior for P1 (no backend persistence)

**Type Errors**:
- Run `npm run type-check` to verify TypeScript compilation
- Ensure AddressInput type is correctly extended with date fields
