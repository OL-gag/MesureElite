---

description: "Task list for feature implementation"
---

# Tasks: Interface en français canadien par défaut, avec bascule vers l'anglais

**Input**: Design documents from `/specs/004-fr-ca-localization/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/error-codes.md, quickstart.md (all present)

**Tests**: Not explicitly requested in the feature spec. A minimal set of unit/integration tests is included (dictionary completeness, context defaults, data-preservation regression guard) matching the convention already used in `specs/001-shortest-route-addresses/tasks.md` and `specs/003-bulk-address-entry/tasks.md`.

**Organization**: Tasks are grouped by user story (spec.md priorities: US1 P1, US2 P1, US3 P2) so each can be delivered and validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- File paths are exact, matching `plan.md` § Project Structure

## Path Conventions

Single Next.js project (existing, unchanged) — all paths relative to repository root:
- `app/lib/i18n/`, `app/components/`, `app/lib/nominatim.ts`, `app/api/geocode/route.ts`, `app/api/route/route.ts`, `app/page.tsx`, `app/results/page.tsx`, `app/layout.tsx`
- `__tests__/unit/`, `__tests__/integration/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization

No setup tasks required. This feature extends the existing Next.js project (specs 001-003); no new dependency, no new environment variable — see plan.md § Technical Context and research.md Décision 1. Proceed directly to Phase 2.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core i18n infrastructure that every user story depends on — the dictionary, the context, the error-code plumbing, and the Server/Client boundary rework of `layout.tsx`

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T001 Create `app/lib/i18n/translations.ts`: `Locale` type (`'fr-CA' | 'en'`), `DEFAULT_LOCALE = 'fr-CA'`, and both dictionaries (`fr-CA`, `en`) with keys covering every namespace from research.md § Inventaire (`common.*`, `home.*`, `addressForm.*`, `results.*`, `map.*`, `errorBoundary.*`, `errors.*` — including all `errorCode` values from contracts/error-codes.md § Table des codes). The `fr-CA` values MUST use Canadian French terminology/phrasing (FR-007) — not France French; if unsure of a term, prefer the Québec Government's terminology bank (GDT) usage over informal guesses.
- [X] T002 Create `app/lib/i18n/LanguageContext.tsx`: `LanguageProvider` + `useLanguage()` hook exposing `{ locale, setLocale, t }` (data-model.md § LanguageContext) — initial state `DEFAULT_LOCALE`, reads `sessionStorage['language']` on mount (client-only, ignores `navigator.language` per FR-009), `setLocale` writes back to `sessionStorage` and updates `document.documentElement.lang` via effect. `t(key)` MUST fall back to the `fr-CA` value (not the raw key or an empty string) whenever `key` is missing from the active locale's dictionary (Edge Case: traduction manquante, data-model.md § Dictionnaire).
- [X] T003 [P] Add `errorCode?: string` to the relevant response item types in `app/lib/types.ts` (`GeocodeResponse.results[]` item, and the shared API error body shape) per contracts/error-codes.md
- [X] T004 Rework `app/layout.tsx`: keep it a Server Component with `<html lang="fr-CA">` static and the existing `metadata` export; extract the inline header into `app/components/AppHeader.tsx` and the inline footer into `app/components/AppFooter.tsx` (both new Client Components using `useLanguage()`); wrap `AppHeader`, `{children}`, `AppFooter` in `LanguageProvider`

**Checkpoint**: The i18n system exists and is wired into the root layout; every component can now call `useLanguage()` / `t()`.

---

## Phase 3: User Story 1 - Afficher l'application en français canadien par défaut (Priority: P1) 🎯 MVP

**Goal**: Tout le texte généré par l'application (statique et messages d'erreur) s'affiche en français canadien par défaut, sur toutes les pages (FR-001, FR-005, FR-006, FR-007, FR-009)

**Independent Test**: Ouvrir l'application dans une session privée avec le navigateur configuré en anglais et vérifier que tout le texte de l'interface est en français canadien (quickstart.md Scénario 1)

### Implementation for User Story 1

- [X] T005 [US1] Replace hardcoded strings in `app/components/AddressForm.tsx` (labels, placeholders, buttons, status text, warnings) with `t('addressForm.*')` calls
- [X] T006 [US1] In `app/components/AddressForm.tsx`, replace direct display of `result.error` with `errorCode ? t('errors.' + errorCode) : result.error` (fallback to raw English text if `errorCode` is missing/unrecognized — Edge Case "traduction manquante")
- [X] T007 [US1] Add `errorCode` to each result object returned by `geocodeAddress`/`geocodeMultiple` in `app/lib/nominatim.ts` (`ADDRESS_NOT_FOUND`, `AMBIGUOUS`, `GEOCODING_FAILED` per contracts/error-codes.md)
- [X] T008 [US1] Add `errorCode` to the validation-error responses in `app/api/geocode/route.ts` (`MISSING_ADDRESSES`, `EMPTY_ADDRESSES`, `TOO_MANY_ADDRESSES`, `INVALID_ADDRESS_FORMAT`, `RATE_LIMITED`, `SERVICE_UNAVAILABLE`)
- [X] T009 [US1] Add `errorCode` to the validation/OSRM-error responses in `app/api/route/route.ts` (`MISSING_WAYPOINTS`, `TOO_FEW_WAYPOINTS`, `TOO_MANY_WAYPOINTS`, `INVALID_WAYPOINT`, `INVALID_COORDINATES`, `ROUTING_FAILED`, `RATE_LIMITED`, `TIMEOUT`, `SERVICE_UNAVAILABLE`)
- [X] T010 [US1] Replace hardcoded strings in `app/page.tsx` (headings, intro text) with `t('home.*')` calls
- [X] T011 [US1] Replace hardcoded strings in `app/results/page.tsx` (headings, labels, buttons) with `t('results.*')` calls; translate the `alert()` route-error text via `t('errors.' + errorCode)` (fallback to raw `error` text)
- [X] T012 [US1] Replace hardcoded strings in `app/components/RouteMap.tsx` (marker popups) and `app/components/ErrorBoundary.tsx` (fallback UI) with `t('map.*')` / `t('errorBoundary.*')` calls
- [X] T013 [P] [US1] Unit test dictionary completeness in `__tests__/unit/translations.test.ts` (every key present in `fr-CA` also exists in `en` and vice versa; no empty values)
- [ ] T014 [US1] Manual validation per `quickstart.md` Scénarios 1 (défaut français malgré navigateur anglais) et 4 (messages d'erreur traduits, contenu Nominatim non traduit, repli si code inconnu)

**Checkpoint**: User Story 1 is fully functional and independently testable — the whole app defaults to French Canadian, including error messages, even without a working language switcher yet.

---

## Phase 4: User Story 2 - Basculer vers l'anglais au besoin (Priority: P1)

**Goal**: Un contrôle visible permet de basculer instantanément vers l'anglais (et retour), sans perte des données saisies (FR-002, FR-003, FR-004)

**Independent Test**: Sélectionner "English" dans le sélecteur de langue avec un formulaire d'adresses partiellement rempli et vérifier que tout le texte passe en anglais sans perte de données (quickstart.md Scénario 2)

### Implementation for User Story 2

- [X] T015 [US2] Create `app/components/LanguageSwitcher.tsx`: control exposing "Français" / "English", calling `setLocale` from `useLanguage()`
- [X] T016 [US2] Wire `LanguageSwitcher` into `app/components/AppHeader.tsx` so it's visible on every page (FR-002)
- [X] T017 [P] [US2] Unit test `LanguageContext` in `__tests__/unit/LanguageContext.test.tsx`: defaults to `'fr-CA'`, `setLocale` updates state and writes `sessionStorage['language']`, initial read ignores `navigator.language`
- [X] T018 [P] [US2] Integration test in `__tests__/integration/AddressForm.test.tsx` (extend existing suite): switching locale via `LanguageSwitcher` while stop/start address fields are filled does not clear their values (regression guard — same class of bug fixed post-spec-003)
- [ ] T019 [US2] Manual validation per `quickstart.md` Scénario 2 — chronométrer la bascule pour confirmer SC-002 (< 1s), vérifier l'absence de rechargement de page, l'absence de perte de données, et que le retour au français fonctionne — et Scénario 6 (changement de langue pendant un calcul en cours : le calcul n'est ni interrompu ni relancé)

**Checkpoint**: User Stories 1 AND 2 both work independently — French by default, and a working, non-destructive language switch.

---

## Phase 5: User Story 3 - Conserver le choix de langue durant la visite (Priority: P2)

**Goal**: Le choix de langue reste actif sur toutes les pages visitées durant la session de navigateur (FR-008)

**Independent Test**: Sélectionner l'anglais, naviguer vers la page de résultats, et vérifier que l'anglais reste actif (quickstart.md Scénario 3)

### Implementation for User Story 3

- [X] T020 [US3] Verify `LanguageProvider` (T004) sits at the root of `app/layout.tsx` so its state survives Next.js client-side navigation between `/` and `/results` without remounting or losing the selected locale
- [X] T021 [US3] Verify `app/results/page.tsx` (T011) renders using the already-active locale on mount, with no flash back to French when arriving from `/` with English already selected
- [ ] T022 [US3] Manual validation per `quickstart.md` Scénario 3 (anglais actif sur la page de résultats après navigation, et après retour à l'accueil via "← Edit Addresses")

**Checkpoint**: All user stories (US1, US2, US3) are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Coverage and regression safety across all three stories

- [ ] T023 [P] Run the full `quickstart.md` validation (all 5 scenarios, both FR→EN and EN→FR directions) manually against `npm run dev`
- [ ] T024 Regression check: confirm specs 001/002/003 flows (calcul d'itinéraire, carte interactive, saisie en masse d'adresses) still work correctly in both languages
- [X] T025 [P] `npx tsc --noEmit`, `next lint`, `next build`, and `npm test` all pass
- [X] T026 [P] Update `README.md` / `QUICKSTART.md` if they document a language assumption that no longer holds (optional, low priority) — checked, no such assumption found (only unrelated "Language: TypeScript" tech-stack entry)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: None — no tasks
- **Foundational (Phase 2)**: T001-T004, BLOCKS all user stories (dictionary, context, types, layout rework)
- **User Stories (Phase 3-5)**: All depend on Foundational completion; US1 should land before US2/US3 are meaningfully testable (US2's switcher has nothing to switch without US1's `t()` wiring; US3's persistence has nothing to persist without US2's switcher) — sequential P1 → P1 → P2 delivery is recommended over parallel here, unlike spec 003
- **Polish (Phase 6)**: Depends on US1 + US2 + US3 being complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends only on Foundational — delivers a French-only (but fully correct) app on its own
- **User Story 2 (P1)**: Depends on Foundational AND practically on US1 (needs `t()` calls already in place across components to have something to switch)
- **User Story 3 (P2)**: Depends on Foundational AND practically on US2 (needs a working switcher to verify persistence of)

### Parallel Opportunities

- T003 [P] (types.ts) can run alongside T001/T002 (i18n core files) — different files
- T013 [P], T017 [P], T018 [P] (tests) can run in parallel with each other once their respective implementation tasks land
- T023, T025, T026 [P] in Polish can run in parallel

---

## Parallel Example: Foundational

```bash
# T001 and T002 touch the same new app/lib/i18n/ directory but different files — can be done back-to-back by one person or in parallel by two:
Task: "Create app/lib/i18n/translations.ts with Locale type and both dictionaries"     # T001
Task: "Create app/lib/i18n/LanguageContext.tsx with LanguageProvider/useLanguage()"    # T002
# T003 is fully independent (different file):
Task: "Add errorCode? to app/lib/types.ts"                                             # T003 [P]
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: Foundational (T001-T004 — dictionary, context, types, layout rework)
2. Complete Phase 3: User Story 1 (T005-T014 — every component defaults to French Canadian, including error messages)
3. **STOP and VALIDATE**: run quickstart.md Scénario 1 and 4
4. At this point the app is fully French Canadian and correct, but there is no way to switch to English yet (US2 not done) — acceptable as an MVP checkpoint since US1 delivers real, testable value on its own

### Incremental Delivery

1. Foundational → i18n system ready, wired into the root layout
2. Add US1 → French Canadian by default everywhere → validate independently
3. Add US2 → working, non-destructive language switch → validate independently
4. Add US3 → persistence across navigation confirmed → validate independently
5. Polish → full regression + quickstart pass in both languages

---

## Notes

- [P] tasks touch different files: `app/lib/types.ts` (T003), test files (T013, T017, T018, T023, T025, T026)
- Most US1 tasks (T005-T012) touch different files each and could be parallelized across developers, but were left sequential here since they share the same dictionary keys being authored in T001 — coordinate on `translations.ts` if split across people
- No new API routes, no new environment variables, no new npm dependencies for this feature (see plan.md § Technical Context)
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently before moving to the next
