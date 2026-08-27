# Implementation Plan: Measurement Scheduling with Date Fields

**Branch**: `001-measurement-deadline-dates` | **Date**: 2026-08-27 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-measurement-deadline-dates/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Enable field technicians to plan optimal measurement routes by date. Users add measurement date and deadline date to each address, and the system automatically generates multi-day itineraries that respect deadline constraints while minimizing geographic distance. Both dates default to today when a new address is created. The core value is transforming a list of addresses into an actionable, day-by-day work plan.

## Technical Context

**Language/Version**: TypeScript 5.3 (Next.js 14, React 18)

**Primary Dependencies**: Next.js 14, React 18, React Leaflet 4, Tailwind CSS 3, Jest 29

**Storage**: Client-side state management (React hooks) for form data; persistence handled by address objects passed to parent components

**Testing**: Jest + React Testing Library for component and integration testing

**Target Platform**: Web application (browser-based, responsive design required per constitution)

**Project Type**: Web application (Next.js with React frontend)

**Performance Goals**: Form interactions < 100ms, date picker opens instantly, no network round trips for date operations

**Constraints**: Per constitution: Deploy-Ready (Vercel), Self-Contained, Shareable, Performance-First, Production Quality. Mobile-responsive required.

**Scale/Scope**: Extend existing AddressInput type with two optional date fields; modify AddressForm component to display date inputs; support up to 20 addresses with dates (per existing MAX_STOPS limit)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

✅ **Deploy-Ready**: Feature adds client-side UI only; no backend changes required. Vercel deployment unaffected.

✅ **Self-Contained**: All date handling uses browser-native date inputs (no external libraries). Existing dependencies sufficient.

✅ **Shareable & Accessible**: Date fields must be responsive and accessible (WCAG 2.1). Date picker UI must work on touch devices.

✅ **Performance-First**: Date storage is in-memory (AddressInput objects); no external data fetches. Client-side only, minimal bundle impact.

✅ **Production Quality**: Feature includes error handling for invalid dates, responsive design testing, and no console warnings/errors.

## Project Structure

### Documentation (this feature)

```text
specs/001-measurement-deadline-dates/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (empty for this feature; no unknowns)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (no external contracts for this feature)
└── checklists/
    └── requirements.md  # Quality validation checklist
```

### Source Code (repository root)

```text
# Next.js 14 web application
app/
├── components/
│   ├── AddressForm.tsx           # MODIFIED: Add date fields to form
│   ├── AppHeader.tsx
│   ├── AppFooter.tsx
│   ├── ErrorBoundary.tsx
│   └── RouteMap.tsx
├── lib/
│   ├── types.ts                  # MODIFIED: Extend AddressInput with date fields
│   ├── i18n/
│   │   ├── LanguageContext.tsx
│   │   └── translations.ts       # MODIFIED: Add date field labels
│   ├── geocode.ts
│   ├── osrm.ts
│   ├── nominatim.ts
│   └── utils.ts
├── api/
│   ├── geocode/
│   │   └── route.ts
│   └── route/
│       └── route.ts
├── results/
│   └── page.tsx
├── layout.tsx
└── page.tsx

__tests__/
├── components/
│   └── AddressForm.test.tsx      # NEW: Test date field interactions
└── lib/
    └── types.test.ts             # NEW: Test AddressInput with dates
```

**Structure Decision**: Single Next.js project with embedded component and type extensions. No new top-level modules required. All changes are within existing component structure.

## Phase 0: Research

**Status**: ✅ Complete (no unknowns in technical context)

No [NEEDS CLARIFICATION] markers identified. All technical decisions are straightforward:
- Date field type: HTML5 `<input type="date">` (browser-native, no library needed)
- Data storage: In-memory (AddressInput objects), no persistence layer required
- Date format: YYYY-MM-DD (HTML5 standard)
- Localization: Use existing i18n system for labels and placeholders

## Phase 1: Design & Contracts

### 1. Data Model Design

See: [data-model.md](data-model.md) (created below)

### 2. Interface Contracts

No public API contracts required. This is a UI-only feature extending internal address data structures. No external interfaces exposed.

### 3. Quickstart Validation Guide

See: [quickstart.md](quickstart.md) (created below)
