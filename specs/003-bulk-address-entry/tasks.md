---

description: "Task list for feature implementation"
---

# Tasks: Saisie facile et validation de multiples adresses

**Input**: Design documents from `/specs/003-bulk-address-entry/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md (all present; no `contracts/` — feature reuses the existing `/api/geocode` and `/api/route` contracts from spec 001 unchanged, see research.md Décision 2)

**Tests**: Not explicitly requested in the feature spec. A minimal set of unit/integration tests is still included (Polish phase + inline with stories) because the Constitution ("V. Production Quality") requires tests for critical paths, matching the convention already used in `specs/001-shortest-route-addresses/tasks.md`.

**Organization**: Tasks are grouped by user story (spec.md priorities: US1 P1, US2 P1, US3 P2) so each can be delivered and validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- File paths are exact, matching `plan.md` § Project Structure

## Path Conventions

Single Next.js project (existing, unchanged) — all paths relative to repository root:
- `app/components/AddressForm.tsx`, `app/lib/nominatim.ts`, `app/lib/utils.ts`, `app/page.tsx`
- `__tests__/unit/`, `__tests__/integration/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization

No setup tasks required. This feature extends the existing Next.js project delivered in spec 001 (Jest, TypeScript, Tailwind, ESLint already configured; no new dependency, no new environment variable — see plan.md § Technical Context and research.md Décision 2). Proceed directly to Phase 2.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Structural change to `AddressForm.tsx` that every user story builds on — isolating the start/return address per FR-001a (clarified 2026-08-23)

**⚠️ CRITICAL**: No user story work can begin until this phase is complete (US1, US2, US3 all touch the isolated-field structure)

- [X] T001 Refactor `app/components/AddressForm.tsx`: extract the départ/retour address (currently `addresses[0]` rendered inline with a "(Start Point)" badge) into its own isolated section/fieldset, visually and structurally separate from the stops list. This field has no "✕" remove button and is always rendered (per data-model.md § BulkEntryFormState, FR-001a).
- [X] T002 In `app/components/AddressForm.tsx`, wire the isolated start field's value back into the combined array (`[start, ...stops]`) sent to `/api/geocode` and onward to `/api/route`, preserving the existing `isStartPoint`/index-0 contract used by spec 001 (data-model.md Décision 1) — no changes to `app/lib/types.ts` or the API routes.
- [X] T003 Update the addresses counter/label in `app/components/AddressForm.tsx` and the intro copy in `app/page.tsx` (currently "Enter 2-25 addresses") to reflect the new model: 1 départ/retour (isolated) + 2-20 arrêts.

**Checkpoint**: `AddressForm.tsx` has a structurally isolated start field; all three user stories can now be implemented on top of it.

---

## Phase 3: User Story 1 - Saisir rapidement une liste d'adresses (Priority: P1) 🎯 MVP

**Goal**: Permettre de saisir/coller jusqu'à 20 adresses d'arrêt rapidement, sans friction (FR-001, FR-007, Edge Cases)

**Independent Test**: Saisir 10 adresses différentes (une par champ ou collées en bloc) et valider qu'elles sont toutes acceptées sans erreur d'interface (quickstart.md Scénario 2)

### Implementation for User Story 1

- [X] T004 [P] [US1] Add `parseBulkAddressText(text: string): string[]` to `app/lib/utils.ts` — split on newlines, trim each line, filter out empty/whitespace-only lines (FR-007)
- [X] T005 [US1] Add an `onPaste` handler to the stop-address inputs in `app/components/AddressForm.tsx`: when pasted content contains newlines, call `parseBulkAddressText` and distribute the resulting lines across existing/new stop rows instead of pasting raw text into one field (Edge Case: bloc de texte collé)
- [X] T006 [US1] Enforce the 20-stop cap in `app/components/AddressForm.tsx` (independent from the isolated start field, FR-001a): disable "+ Add Address" and truncate paste overflow at 20, with a clear warning message when the limit is hit (Edge Case: > 20 adresses)
- [X] T007 [US1] Confirm empty/whitespace-only stop rows are excluded from the payload sent to `/api/geocode` on submit (FR-007) — adjust the existing `filledAddresses` filter in `app/components/AddressForm.tsx` to operate on the new stops-only array
- [X] T008 [P] [US1] Unit test `parseBulkAddressText` in `__tests__/unit/utils.test.ts` (multiline input, blank lines, trailing/leading whitespace, no-newline input)
- [X] T009 [US1] Manual validation per `quickstart.md` Scénarios 2 (saisie de 15 adresses) et 7 (plafond 20+1)

**Checkpoint**: User Story 1 is fully functional and independently testable — bulk paste and 20-stop cap work without any validation/error-display changes from US2.

---

## Phase 4: User Story 2 - Valider les adresses et signaler les erreurs clairement (Priority: P1)

**Goal**: Valider chaque adresse (départ + arrêts) et signaler clairement les erreurs/ambiguïtés sans bloquer les autres (FR-002, FR-003, FR-004, FR-005, FR-008, FR-009)

**Independent Test**: Saisir un mélange d'adresses valides et invalides, soumettre, et vérifier que le système signale précisément les adresses invalides avec un message explicite (quickstart.md Scénario 3)

### Implementation for User Story 2

- [X] T010 [P] [US2] Extend `geocodeAddress`/`geocodeMultiple` in `app/lib/nominatim.ts` to set `status: 'ambiguous'` when Nominatim returns ≥2 results whose `display_name` differ on city/region, populating `alternatives` (research.md Décision 5, FR-004) — `GeocodeResponse.status` already supports `'ambiguous'` in `app/lib/types.ts`, no type change needed
- [X] T011 [US2] Trigger per-field validation on blur (not on every keystroke) in `app/components/AddressForm.tsx` for both the isolated start field and each stop field, calling `/api/geocode` (research.md Décision 4, SC-004)
- [X] T012 [US2] Render inline per-field status in `app/components/AddressForm.tsx` — ✓ valid, ✗ invalid with the returned `error` message, ⚠ ambiguous with `alternatives` suggestions — replacing the current `console.warn`-only handling (FR-003, FR-004)
- [X] T013 [US2] Add a real-time valid/invalid counter in `app/components/AddressForm.tsx`, counting the isolated start field and the stop rows together (FR-008)
- [X] T014 [US2] Remove the `alert()`-based geocoding error handling in `app/page.tsx` (`handleFormSubmit`), since per-field errors are now shown inline by `AddressForm.tsx` (FR-003, Constitution V — no cryptic/blocking failures)
- [X] T015 [US2] Enforce the submission guard in `app/components/AddressForm.tsx`: disable "Calculer" unless the start field is valid AND at least 2 stop addresses are valid (FR-005, FR-009, data-model.md § Règles de soumission — minimum 3 addresses total)
- [X] T016 [P] [US2] Unit test the `'ambiguous'` classification in `__tests__/unit/nominatim.test.ts` (mock Nominatim response with multiple differing-city results)
- [X] T017 [US2] Manual validation per `quickstart.md` Scénarios 3 (erreurs inline), 4 (adresse ambiguë), 5 (correction ciblée), 8 (minimum 3 adresses pour activer le calcul) — chronométrer l'affichage du statut après blur pour confirmer SC-004 (< 1s)

**Checkpoint**: User Stories 1 AND 2 both work independently — bulk entry plus clear, non-blocking inline validation.

---

## Phase 5: User Story 3 - Modifier la liste facilement (Priority: P2)

**Goal**: Ajouter, supprimer ou modifier une adresse sans ressaisir les autres (FR-006), avec un comportement spécifique pour le champ isolé (pas de suppression, clarifié le 2026-08-23)

**Independent Test**: Supprimer la 5e adresse d'une liste de 10 arrêts et vérifier que les autres restent intactes (quickstart.md Scénario 6)

### Implementation for User Story 3

- [X] T018 [US3] Verify/adjust the existing add/remove logic for stop rows in `app/components/AddressForm.tsx` (post-T001 refactor) so removing or editing one stop does not reset or re-trigger validation on unrelated rows (FR-006)
- [X] T019 [US3] Confirm the isolated start field (from T001) supports editing with re-validation on blur but exposes no delete control, and remains always displayed/required (FR-001a, US3 Acceptance Scenario 3)
- [X] T020 [US3] Manual validation per `quickstart.md` Scénario 6 (suppression d'un arrêt + modification du champ départ/retour) — confirmer que l'ajout/suppression/édition se reflète en < 100ms sans rechargement de page (SC-006)

**Checkpoint**: All user stories (US1, US2, US3) are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Coverage and regression safety across all three stories

- [X] T021 [P] Integration test `__tests__/integration/AddressForm.test.tsx` covering: isolated start field rendering, 20-stop cap, inline valid/invalid/ambiguous display, submission guard
- [X] T022 Run the full `quickstart.md` validation (all 8 scenarios) manually against `npm run dev`
- [X] T023 [P] Remove the now-unused `console.warn`-based invalid-results handling left over in `app/components/AddressForm.tsx` after T012
- [X] T024 Regression check: confirm the spec 001 end-to-end flow (address entry → geocode → route → results page) still works unchanged, since `/api/geocode` and `/api/route` contracts are untouched

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: None — no tasks
- **Foundational (Phase 2)**: T001-T003, BLOCKS all user stories (shared `AddressForm.tsx` structural change)
- **User Stories (Phase 3-5)**: All depend on Foundational completion; US1, US2, US3 can then proceed in parallel or in priority order (P1 → P1 → P2)
- **Polish (Phase 6)**: Depends on US1 + US2 + US3 being complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends only on Foundational — no dependency on US2/US3
- **User Story 2 (P1)**: Depends only on Foundational — independently testable from US1 (uses the same isolated-field structure but different code paths: validation/display vs. entry/paste)
- **User Story 3 (P2)**: Depends only on Foundational — mostly verification of pre-existing add/remove behavior plus the isolated-field edit rule from T001

### Parallel Opportunities

- T004 [P] (utils.ts) and T010 [P] (nominatim.ts) touch different files and can run in parallel once Foundational is done
- T008 [P] and T016 [P] (unit tests) can run in parallel with each other and with implementation tasks in the other story
- US1 and US2 implementation can proceed in parallel by different developers once T001-T003 are merged (both build on the same `AddressForm.tsx` but in largely separate concerns: entry/paste vs. validation/display) — coordinate on shared file to avoid conflicts if done by the same person

---

## Parallel Example: Post-Foundational

```bash
# Once T001-T003 are done, these can run in parallel:
Task: "Add parseBulkAddressText(text) in app/lib/utils.ts"              # T004 [US1]
Task: "Extend geocodeAddress/geocodeMultiple for 'ambiguous' in app/lib/nominatim.ts"  # T010 [US2]
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: Foundational (T001-T003 — isolated start field)
2. Complete Phase 3: User Story 1 (T004-T009 — bulk paste, 20-stop cap)
3. **STOP and VALIDATE**: run quickstart.md Scénarios 2 and 7
4. At this point the app accepts bulk entry correctly, even though error messages are still the old `alert()`-based ones from spec 001 (US2 not yet done)

### Incremental Delivery

1. Foundational → isolated field ready
2. Add US1 → bulk paste works → validate independently
3. Add US2 → inline validation/errors work → validate independently
4. Add US3 → edit/delete refinements confirmed → validate independently
5. Polish → full regression + quickstart pass

---

## Notes

- [P] tasks touch different files: `app/lib/utils.ts` (T004), `app/lib/nominatim.ts` (T010), test files (T008, T016, T021, T023)
- Most story tasks (T005, T006, T011-T015, T018, T019) touch `app/components/AddressForm.tsx` — sequential within that file even across stories if worked on by one person
- No new API routes, no new environment variables, no new npm dependencies for this feature (see plan.md § Technical Context)
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently before moving to the next
