# MesureMG - Route Optimization MVP

🎯 **Feature**: Calculate and visualize the shortest route between 2-25 addresses

🚀 **Status**: MVP Implementation in Progress (Phase 1: Setup)

---

## Quick Start

### Prerequisites

- **Node.js 18+** (LTS) — [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Git** (for version control)

### Installation

```bash
# 1. Navigate to project directory
cd D:\01.Dev\MGSpeedyTrip\MesureMG

# 2. Install dependencies
npm install

# 3. Create local environment file
cp .env.example .env.local

# 4. Start development server
npm run dev

# 5. Open in browser
# Navigate to: http://localhost:3000
```

### Development Scripts

```bash
npm run dev        # Start dev server (http://localhost:3000)
npm run build      # Build for production
npm start          # Run production build
npm run lint       # Run ESLint
npm run type-check # TypeScript type checking
npm test           # Run Jest tests
npm test:watch     # Run tests in watch mode
```

---

## Project Structure

```
app/
├── layout.tsx              # Root layout
├── page.tsx                # Home page (address input form)
├── results/
│   └── page.tsx            # Results page (route details)
├── api/
│   ├── geocode/route.ts     # POST /api/geocode (Nominatim)
│   └── route/route.ts       # POST /api/route (OSRM)
├── components/
│   ├── AddressForm.tsx      # Address input component
│   ├── RouteMap.tsx         # Map display (future: Phase 4)
│   └── ErrorBoundary.tsx    # Error handling
└── lib/
    ├── types.ts             # Shared TypeScript types
    ├── nominatim.ts         # Geocoding client (Phase 2)
    ├── osrm.ts              # Routing client (Phase 2)
    └── utils.ts             # Utility functions (Phase 2)

__tests__/
├── unit/                   # Unit tests
├── integration/            # Integration tests
└── contract/               # API contract tests

specs/001-shortest-route-addresses/
├── spec.md                 # Feature specification
├── plan.md                 # Implementation plan
├── research.md             # Technical decisions
├── data-model.md           # Data structures
├── tasks.md                # Task breakdown (45 tasks)
├── quickstart.md           # Validation scenarios
└── contracts/              # API contracts
```

---

## MVP Scope (Phase 1 + 2 + 3)

### Phase 1: Setup ✅ (IN PROGRESS)

- [x] Project structure created
- [x] TypeScript, ESLint, Prettier configured
- [x] Jest testing setup
- [x] Tailwind CSS configured
- [ ] Base layout component
- [ ] Environment configuration

**Tasks**: T001-T008

### Phase 2: Foundational APIs (Next)

- [ ] Nominatim geocoding client
- [ ] OSRM routing client
- [ ] API routes: POST /api/geocode, POST /api/route
- [ ] Error handling & retry logic

**Tasks**: T009-T015

### Phase 3: User Story 1 (P1) - MVP Feature

- [ ] Address input form component
- [ ] Home page with form
- [ ] Results page with route details
- [ ] Integration tests
- [ ] Error handling

**Tasks**: T016-T023

---

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | React | 18+ |
| **Framework** | Next.js | 14+ |
| **Language** | TypeScript | 5.3+ |
| **Styling** | Tailwind CSS | 3.3+ |
| **Mapping** | Leaflet | 1.9+ |
| **Testing** | Jest + RTL | 29+ |
| **Linting** | ESLint | 8.5+ |
| **Runtime** | Node.js | 18+ LTS |
| **Deployment** | Vercel | Free Tier |

---

## APIs Used (Free & Public)

| Service | Purpose | Endpoint | Rate Limit | Cost |
|---------|---------|----------|-----------|------|
| **Nominatim** | Geocoding (address → coords) | `nominatim.openstreetmap.org` | 1 req/sec | Free |
| **OSRM** | Routing (TSP optimization) | `router.project-osrm.org` | Public | Free |
| **OpenStreetMap** | Map tiles | Built-in | Public | Free |

**Note**: All APIs are public, no authentication required. Perfect for MVP!

---

## Next Steps

### Right Now (Phase 1 Setup - T001-T008)

1. Install Node.js 18+ if not already installed
2. Run `npm install` to install dependencies
3. Create base layout in `app/layout.tsx`
4. Setup global CSS with Tailwind
5. Create next.config.js for Next.js

### Then (Phase 2 Foundational - T009-T015)

6. Implement Nominatim client in `app/lib/nominatim.ts`
7. Implement OSRM client in `app/lib/osrm.ts`
8. Create API routes for geocoding & routing

### Then (Phase 3 MVP Feature - T016-T023)

9. Build AddressForm component
10. Create home page with form + submit flow
11. Create results page with route details
12. Add error handling and validation

---

## Testing

### Running Tests

```bash
# All tests
npm test

# Watch mode (auto-rerun on changes)
npm test:watch

# Specific test file
npm test -- test/path/file.test.ts

# Coverage report
npm test -- --coverage
```

### Test Structure

- **Unit tests**: `__tests__/unit/` — Test individual functions (utils, clients)
- **Integration tests**: `__tests__/integration/` — Test API routes & components
- **Contract tests**: `__tests__/contract/` — Test API contracts (request/response)

---

## Deployment

### Deploy to Vercel (Free Tier)

```bash
# 1. Push to GitHub
git add .
git commit -m "MVP Phase 1-3 complete"
git push origin main

# 2. Vercel auto-deploys from GitHub
# Production URL: https://measuremg.vercel.app
```

### Environment Variables (Vercel Dashboard)

1. Go to Vercel project settings
2. Add these environment variables:
   ```
   NEXT_PUBLIC_NOMINATIM_BASE_URL=https://nominatim.openstreetmap.org
   NEXT_PUBLIC_OSRM_BASE_URL=https://router.project-osrm.org
   ```
3. Re-deploy

---

## Performance Targets (from Constitution & Spec)

| Metric | Target | Status |
|--------|--------|--------|
| LCP (Largest Contentful Paint) | < 2.5s | ⏳ To validate |
| CLS (Cumulative Layout Shift) | < 0.1 | ⏳ To validate |
| Route calculation | < 5s for 10 addresses | ⏳ To validate |
| Geocoding | < 1s per address | ⏳ To validate |
| Build time | < 3 minutes | ⏳ To validate |

---

## MVP Success Criteria

✅ User can input 2-25 addresses
✅ Addresses geocoded (Nominatim) with error handling
✅ Route calculated (OSRM) with optimization
✅ Results displayed: order, distance, duration, optimization gain
✅ All tests passing
✅ Deployed to Vercel with HTTPS
✅ Quickstart scenarios validated

---

## Documentation

- **Specification**: [spec.md](specs/001-shortest-route-addresses/spec.md)
- **Implementation Plan**: [plan.md](specs/001-shortest-route-addresses/plan.md)
- **Technical Decisions**: [research.md](specs/001-shortest-route-addresses/research.md)
- **Data Model**: [data-model.md](specs/001-shortest-route-addresses/data-model.md)
- **Tasks**: [tasks.md](specs/001-shortest-route-addresses/tasks.md) (45 tasks, organized by phase)
- **Quickstart**: [quickstart.md](specs/001-shortest-route-addresses/quickstart.md) (8 test scenarios)
- **API Contracts**: [contracts/](specs/001-shortest-route-addresses/contracts/)

---

## Getting Help

### Common Issues

**"npm: not found"**
→ Install Node.js from https://nodejs.org/

**"npm install fails"**
→ Try: `npm cache clean --force` then `npm install` again

**"Port 3000 in use"**
→ Run on different port: `npm run dev -- -p 3001`

**"TypeScript errors"**
→ Run: `npm run type-check` to see all errors

---

## License

Private project for MesureMG

---

## Quick Reference

```bash
# Full setup from scratch
npm install
npm run type-check
npm run lint
npm test
npm run dev          # Now at http://localhost:3000

# Deploy checklist
npm run type-check   # ✓ No errors
npm run lint         # ✓ No warnings
npm test             # ✓ All pass
npm run build        # ✓ Build succeeds
git push origin main # ✓ Auto-deploys to Vercel
```

---

**Status**: 🟡 In Progress — Phase 1 Setup (T001-T008)

**Next Milestone**: Complete Phase 2 Foundational APIs (T009-T015)

**MVP Target**: End of Phase 3 (T016-T023) = Feature complete!

🚀 **Let's go!**
