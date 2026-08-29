# Data Model: Measurement Scheduling with Date Fields

**Created**: 2026-08-27  
**Scope**: Address entities extended with measurement and deadline dates

## Entity: AddressInput (Extended)

**Existing Definition** (from `app/lib/types.ts`):
```typescript
export interface AddressInput {
  id: string
  text: string
  order: number
  isStartPoint: boolean
  status: 'pending' | 'geocoding' | 'valid' | 'invalid' | 'ambiguous'
  geocodedCoords?: { lat: number; lon: number; displayName: string }
  error?: string
  errorCode?: string
  alternatives?: { lat: number; lon: number; displayName: string }[]
  createdAt: Date
  updatedAt: Date
}
```

**Extended Definition** (new fields added):
```typescript
export interface AddressInput {
  id: string
  text: string
  order: number
  isStartPoint: boolean
  status: 'pending' | 'geocoding' | 'valid' | 'invalid' | 'ambiguous'
  geocodedCoords?: { lat: number; lon: number; displayName: string }
  error?: string
  errorCode?: string
  alternatives?: { lat: number; lon: number; displayName: string }[]
  createdAt: Date
  updatedAt: Date
  
  // NEW: Measurement scheduling fields
  measurementDate?: Date           // Optional; date when measurement should be taken
  deadlineDate?: Date              // Optional; deadline for completing measurement
}
```

**New Fields**:

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `measurementDate` | `Date \| undefined` | Optional | Today's date on creation | The date when the user plans to take the measurement at this address |
| `deadlineDate` | `Date \| undefined` | Optional | Today's date on creation | The hard deadline by which the measurement must be completed |

**Validation Rules**:
- Both dates must be valid Date objects (no "Invalid Date")
- Dates can be in the past or future (no restriction on temporal direction)
- No implicit constraint between measurement date and deadline date (either can be before/after the other)
- Clearing a date is allowed (setting to `undefined`)
- Dates are timezone-naive (stored as YYYY-MM-DD conceptually; actual Date objects use user's local timezone)

**State Transitions**:
- New addresses: both dates default to today's date
- Editing addresses: dates can be modified independently
- No side effects on other address fields when dates change
- Date changes do not affect address geocoding status or validation

## Storage & Serialization

**In-Memory Storage**: AddressInput objects are stored as React component state within AddressForm

**JSON Serialization**: When AddressInput objects need to be transmitted (e.g., to API or parent component):
```typescript
// Date objects serialize to ISO string format
JSON.stringify({
  ...address,
  measurementDate: address.measurementDate?.toISOString(),  // "2026-08-27T00:00:00.000Z"
  deadlineDate: address.deadlineDate?.toISOString()
})
```

**Deserialization**: When reading AddressInput from JSON:
```typescript
const deserialized = {
  ...jsonData,
  measurementDate: jsonData.measurementDate ? new Date(jsonData.measurementDate) : undefined,
  deadlineDate: jsonData.deadlineDate ? new Date(jsonData.deadlineDate) : undefined
}
```

## UI Form Binding

**Form Fields**:
- Measurement Date: `<input type="date" name="measurementDate" />`
- Deadline Date: `<input type="date" name="deadlineDate" />`

**Default Value Rendering**:
- HTML5 date inputs expect YYYY-MM-DD format in the `value` attribute
- Convert Date object to YYYY-MM-DD: `date.toISOString().split('T')[0]`
- Parse YYYY-MM-DD back to Date: `new Date(dateString + 'T00:00:00')`

**Locale Handling**: 
- HTML5 `<input type="date">` uses browser locale for display
- Actual data transmitted is always ISO format (YYYY-MM-DD)
- No additional localization needed for date fields themselves

## Change History

No change history tracking for dates (they are simple scheduling fields, not audit-logged data).

## Related Entities

**AddressList** (unchanged):
- Contains array of `AddressInput` objects (now extended with date fields)
- No changes to AddressList structure or behavior

**Route** (unchanged):
- Routes are calculated based on geocoded coordinates
- Measurement/deadline dates do not affect routing logic
- Dates are display-only information for user planning

## Assumptions & Constraints

1. **No Time Component**: Dates are day-level only (no time-of-day tracking for now)
2. **No Persistence**: Dates are stored in memory only; not persisted to backend/database
3. **No Business Logic**: Dates have no effect on geocoding, routing, or validation
4. **No Warnings**: Dates are independent; no warning if deadline < measurement date
5. **No Filtering**: Dates are stored but not used for filtering/sorting in this phase (P2 feature)
