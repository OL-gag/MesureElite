# Feature Specification: Measurement Scheduling with Date Fields

**Feature Branch**: `001-measurement-deadline-dates`

**Created**: 2026-08-27

**Status**: Draft

**Input**: User description: "The user must be able to add a desired date to take the measurement and a deadline date. So for each address add two date fields. By default the current date."

## Clarifications

### Session 2026-08-31

- Q: Quand aucune journée n'est sélectionnée dans le filtre, la carte générale doit-elle afficher les itinéraires de tous les jours en même temps, ou une seule journée à la fois? → A: Une seule journée à la fois; le filtre latéral choisit laquelle (défaut: la première journée)
- Q: Sous la carte, la liste des journées doit-elle rester complète en tout temps, ou suivre le filtre de journée sélectionné? → A: Tous les jours toujours entièrement dépliés, peu importe le filtre; cliquer l'entête d'un jour met à jour la carte (sync avec le filtre latéral)
- Q: Sur mobile (écran étroit), où le filtre de journées doit-il se placer? → A: Rangée horizontale de pastilles (dates) au-dessus de la carte, défilable au besoin

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Add Measurement Date to Address (Priority: P1)

A user managing property measurements wants to schedule when each address will be measured. They need to assign a measurement date to each address so they can plan their measurement activities.

**Why this priority**: This is the core functionality enabling measurement scheduling. Without it, users cannot organize their workflow.

**Independent Test**: Can be fully tested by accessing an address record, adding/modifying a measurement date field, and verifying the date is saved and displayed correctly.

**Acceptance Scenarios**:

1. **Given** a user is viewing an address record, **When** they click to add/edit the measurement date, **Then** a date picker appears with today's date pre-selected
2. **Given** a user has selected a measurement date, **When** they save the address, **Then** the measurement date is persisted and displayed on the address record
3. **Given** an address already has a measurement date, **When** the user edits it, **Then** the date picker shows the previously selected date
4. **Given** a user is adding a new address, **When** they fill in the address details, **Then** the measurement date defaults to today's date

---

### User Story 2 - Add Deadline Date to Address (Priority: P1)

A user needs to track when measurements must be completed by, independent of the measurement date. They need a deadline date field to distinguish between the target measurement date and the hard deadline.

**Why this priority**: The deadline date is equally critical for managing measurement deadlines and ensuring work is completed on time. It's a separate concern from the measurement date.

**Independent Test**: Can be fully tested by accessing an address record, adding/modifying a deadline date field, and verifying the date is saved and displayed correctly.

**Acceptance Scenarios**:

1. **Given** a user is viewing an address record, **When** they click to add/edit the deadline date, **Then** a date picker appears with today's date pre-selected
2. **Given** a user has selected a deadline date, **When** they save the address, **Then** the deadline date is persisted and displayed on the address record
3. **Given** an address already has a deadline date, **When** the user edits it, **Then** the date picker shows the previously selected date
4. **Given** a user is adding a new address, **When** they fill in the address details, **Then** the deadline date defaults to today's date

---

### User Story 3 - Generate Optimal Measurement Schedule by Day (Priority: P2)

A field technician has multiple addresses to measure with different measurement dates and deadlines. They need the system to automatically group these addresses into optimal daily routes that respect deadline constraints and minimize travel distance.

**Why this priority**: This is the core value proposition. Simply entering dates isn't enough—users need actionable itineraries optimized by day that ensure all deadlines are met while minimizing travel time and distance.

**Independent Test**: Can be fully tested by submitting multiple addresses with various measurement dates and deadlines, receiving an optimized daily schedule where: (1) each address's deadline is respected, (2) addresses are grouped into daily routes, (3) each day's route is geographically optimized.

**Acceptance Scenarios**:

1. **Given** 10 addresses with measurement dates and deadlines (some today, some tomorrow, some next week), **When** the user submits the addresses, **Then** the system generates an optimal schedule grouping addresses into daily routes
2. **Given** generated daily routes, **When** the user views each day's plan, **Then** they see: (a) the ordered list of stops for that day, (b) total distance and duration, (c) an optimized geographical route respecting each address's deadline
3. **Given** an address with deadline in 2 days, **When** generating the schedule, **Then** the system assigns it to either today or tomorrow (respecting the deadline), preferring today if the workload allows
4. **Given** more addresses than can fit in one day's schedule (10+ stops), **When** generating the schedule, **Then** the system intelligently distributes them across multiple days while respecting all deadlines
5. **Given** a generated schedule, **When** the user wants to reschedule an address to a different day, **Then** they can drag-and-drop or reassign it, and the day's route re-optimizes automatically

---

### User Story 4 - Consulter les itinéraires optimisés par jour (Priority: P2)

L'usager doit voir le résultat des itinéraires optimisés, jour par jour. En haut, une carte affichant l'itinéraire d'une seule journée à la fois, avec un filtre de journées placé sur le côté (défaut: la première journée). La carte peut être masquée. Sous la carte, chaque jour est listé avec son itinéraire complet (incluant toujours le point de départ et le retour). Quand l'usager change de journée, le zoom de la carte se réajuste automatiquement pour englober tous les points du parcours de cette journée.

**Why this priority**: C'est la vue de consommation du plan généré (US3); sans une présentation claire par jour, le plan optimisé n'est pas actionnable sur le terrain.

**Independent Test**: Générer un horaire multi-jours, puis vérifier: (1) la carte montre uniquement la journée sélectionnée, (2) le filtre latéral change la journée affichée et le zoom se réajuste pour couvrir tout le parcours, (3) la carte peut être masquée/réaffichée, (4) chaque journée est listée sous la carte avec départ et retour.

**Acceptance Scenarios**:

1. **Given** un horaire généré de 3 jours, **When** l'usager arrive sur la page, **Then** la carte affiche l'itinéraire de la première journée et le filtre latéral indique la journée active
2. **Given** la carte affiche le jour 1, **When** l'usager sélectionne le jour 2 dans le filtre latéral, **Then** la carte affiche uniquement l'itinéraire du jour 2 et le zoom se réajuste pour montrer tous les points du parcours (départ, arrêts, retour)
3. **Given** la carte est visible, **When** l'usager clique sur « Masquer la carte », **Then** la carte est masquée et la liste des jours reste accessible; un clic inverse la réaffiche
4. **Given** un horaire généré, **When** l'usager fait défiler sous la carte, **Then** chaque journée y est présentée avec son itinéraire ordonné, commençant par le point de départ et se terminant par le retour au point de départ

---

### Edge Cases

- What happens when a user sets a deadline date before the measurement date? (Should be allowed but could display a warning)
- How does the system handle timezone differences when storing dates?
- What happens when a user clears the measurement or deadline date after it's been set?
- Should historical measurement dates be preserved or updated?
- What if all addresses have deadlines today but there are 15+ stops? (Prioritize by deadline urgency, then geographic proximity)
- What if an address's deadline has already passed? (System should still schedule it, mark as overdue, and prioritize it)
- What if a single address is geographically isolated and adds 30+ km to a day's route? (System should still include it, respect deadline)
- What if the user has no addresses to schedule? (Show empty state, allow adding more)

## Requirements *(mandatory)*

### Functional Requirements

#### P1 - Date Field Management

- **FR-001**: System MUST display a "Measurement Date" field on each address record
- **FR-002**: System MUST display a "Deadline Date" field on each address record
- **FR-003**: Users MUST be able to set or edit the measurement date for any address
- **FR-004**: Users MUST be able to set or edit the deadline date for any address
- **FR-005**: System MUST default both date fields to today's date when creating a new address
- **FR-006**: System MUST persist measurement date and deadline date when an address is saved
- **FR-007**: System MUST retrieve and display saved measurement and deadline dates when loading an address
- **FR-008**: Users MUST be able to clear/remove a measurement date or deadline date if needed
- **FR-009**: System MUST validate that dates are in a valid format and within a reasonable range (e.g., not in far distant past)

#### P2 - Intelligent Schedule Generation

- **FR-010**: System MUST generate an optimal daily schedule grouping addresses into separate days based on deadline constraints and measurement date preferences
- **FR-011**: System MUST ensure that no address is scheduled after its deadline date
- **FR-012**: System MUST intelligently assign addresses: prefer measurement date, but move earlier if deadline urgency requires
- **FR-013**: System MUST respect working days: skip Saturday and Sunday (no measurements scheduled on weekends)
- **FR-014**: System MUST limit each day's schedule to max 6 stops per day (MesureMG standard workload)
- **FR-015**: System MUST calculate the optimal geographic route for each day using existing OSRM integration (minimize distance for ordered stops)
- **FR-016**: System MUST display the schedule as a multi-day itinerary with distance, duration, and ordered stops for each day
- **FR-017**: System MUST flag addresses with urgent deadlines (< 24 hours) and overdue addresses with visual priority indicators (🔴 urgent, 🟡 normal, 🟢 flexible)
- **FR-018**: System MUST handle overdue addresses (deadline already passed) by including them in the earliest available slot without error
- **FR-019**: System MUST support future manual reassignment of addresses between days, with automatic route re-optimization (v1.2+ feature)

#### P2 - Schedule Results View (US4)

- **FR-020**: The schedule map MUST display exactly one day's route at a time (never multiple days overlaid); the day filter selects which one, defaulting to the first scheduled day
- **FR-021**: The day filter MUST be presented as a side panel next to the map on wide screens; on narrow/mobile screens it MUST collapse into a horizontally scrollable row of date chips above the map
- **FR-022**: The map MUST be collapsible (hide/show toggle); hiding the map never hides the day itineraries
- **FR-023**: Below the map, every scheduled day MUST be listed with its full itinerary always fully expanded (no accordion, independent of the selected day filter), each itinerary starting at the start address and ending with the return to the start address
- **FR-024**: When the selected day changes, the map MUST re-fit its zoom/bounds to include every point of that day's route (start, all stops, return)
- **FR-025**: Clicking a day's header in the list below the map MUST select that day (map updates and side filter highlights it), keeping list, filter, and map in sync

### Key Entities

- **Address**: Extended to include `measurementDate` and `deadlineDate` fields (both dates, nullable or defaulting to today)

## Success Criteria *(mandatory)*

### Measurable Outcomes

#### P1 Metrics

- **SC-001**: Users can add or modify a measurement date for any address in under 10 seconds
- **SC-002**: Users can add or modify a deadline date for any address in under 10 seconds
- **SC-003**: 100% of newly created addresses have measurement and deadline dates set (default to today)
- **SC-004**: Date fields display consistently across all address views (detail, list, forms)

#### P2 Metrics

- **SC-005**: System generates an optimal schedule for 10+ addresses in under 2 seconds
- **SC-006**: 100% of generated schedules respect all deadline constraints (no address scheduled after its deadline)
- **SC-007**: Schedule respects max workload per day (no day exceeds 15 stops without explicit user override)
- **SC-008**: Users can manually reassign addresses and see route re-optimization in under 1 second
- **SC-009**: Users report 30%+ reduction in manual planning time when using automated schedule vs manual route planning
- **SC-010**: Schedule visualization is clear and actionable (users understand the day-by-day plan at a glance)

## Assumptions

- Users expect dates to be in their local timezone
- The application has an existing address management system that can be extended with two new date fields
- Dates should be stored as standard date objects (YYYY-MM-DD format or equivalent)
- No external calendar system integration is required for this phase
- Users have access to standard date picker UI controls
- The measurement date and deadline date are independent; both can be set, and deadline can be before or after measurement date
- Date validation follows standard patterns (no dates in the far past, future dates are generally acceptable)
- The map hide/show toggle does not need to persist across sessions (default: map visible on each visit)
