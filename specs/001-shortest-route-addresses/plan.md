# Implementation Plan: Itinéraire le plus court entre une liste d'adresses

**Branch**: `001-shortest-route-addresses` | **Date**: 2026-08-21 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-shortest-route-addresses/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Implémenter un système de calcul et visualisation d'itinéraires optimisés (TSP — Traveling Salesman Problem) pour une liste de 2-25 adresses en automobile. L'approche technique : web application responsive (Next.js/React) déployée sur Vercel, utilisant Leaflet + OpenStreetMap pour la cartographie, Nominatim pour le géocodage, et OSRM Public API pour le calcul d'itinéraire optimal. Dépendances externes gratuites et self-contained pour faciliter le déploiement et le partage.

## Technical Context

**Language/Version**: TypeScript/JavaScript (Next.js 14+, Node.js 18+ LTS)

**Primary Dependencies**: 
- Frontend: React, Leaflet, React-Leaflet, TailwindCSS
- Geocoding: Nominatim API (OpenStreetMap) 
- Routing: OSRM Public API
- Testing: Jest + React Testing Library

**Storage**: None for V1 (stateless web app; itinéraires non persistés entre sessions)

**Testing**: Jest + React Testing Library (unit & integration tests for critical paths)

**Target Platform**: Web browser (desktop 1280px+ width, tablet 768px+, mobile 320px+) via Vercel deployment

**Project Type**: Single-page web application (SPA) with serverless functions (Vercel Functions) for API integration

**Performance Goals**: 
- Route calculation: < 5 seconds for 10 addresses (SC-001)
- Geocoding: < 1 second per address with retry logic
- Page load: LCP < 2.5s, CLS < 0.1 (Core Web Vitals target per Constitution)
- API calls: < 200ms p95 latency (cached when possible)

**Constraints**:
- Dependency on external APIs (Nominatim, OSRM) with rate-limiting and retry strategy
- Vercel deployment limits: max 50 concurrent functions, max 10MB function size
- No authentication required (public, anonymous usage)
- Maximum 25 addresses per calculation

**Scale/Scope**: MVP for single feature (route optimization); supports 2-25 addresses; estimated 3-4 pages (input, results, map view)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### MesureMG Constitution Alignment

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Deploy-Ready** | ✅ PASS | Vercel deployment configured with auto CI/CD from GitHub; build time < 3 min target; HTTPS/SSL automatic; environment variables documented (.env.example); each commit to main deployable |
| **II. Self-Contained** | ✅ PASS | All deps in package.json; no local setup required; .env.example covers Nominatim/OSRM URLs; free APIs (Nominatim, OSRM) require no credentials; README with setup instructions planned |
| **III. Shareable & Accessible** | ✅ PASS | Web app public at https://measuremg.vercel.app (zero-friction access, no login); Leaflet + OSM are free/lightweight; HTTPS included; fast initial load (LCP < 2.5s target) |
| **IV. Performance-First** | ✅ PASS | Vercel serverless functions optimize latency; LCP < 2.5s target (Leaflet lightweight); OSRM/Nominatim cached; Vercel global CDN; image optimization via next/image; function timeout 60s sufficient (typical calc 2-5s) |
| **V. Production Quality** | ✅ PASS | TypeScript enforced; Jest testing required pre-merge; Vercel auto-builds catch syntax errors; error handling explicit; linting configured; automatic preview deployments on PRs for validation before production |

**Deployment Validation**:
- ✅ Vercel free tier sufficient for MVP (no cost)
- ✅ Automatic GitHub → Vercel CI/CD (no manual deployment steps)
- ✅ HTTPS/SSL automatic (Vercel-managed)
- ✅ Instant rollback available (one-click via Vercel dashboard)
- ✅ Preview deployments on PRs (test before merge)
- ✅ Zero infrastructure management (serverless)

**GATE RESULT**: ✅ **PASS** — All constitution principles satisfied + deployment strategy validated. Plan ready for Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/001-shortest-route-addresses/
├── spec.md              # Feature specification (requirement & acceptance scenarios)
├── plan.md              # This file (Phase 0-1 planning)
├── research.md          # Phase 0: Technical research & architectural decisions
├── data-model.md        # Phase 1: Entity definitions & data contracts
├── quickstart.md        # Phase 1: Validation & testing guide
├── contracts/           # Phase 1: API interface contracts
│   ├── api-geocode.md   # POST /api/geocode contract
│   └── api-route.md     # POST /api/route contract
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code (repository root)

**Selected Structure**: Single Next.js Project (Web Application)

```text
.
├── app/
│   ├── page.tsx                    # Home page (address input form)
│   ├── results/
│   │   └── page.tsx                # Results page (route details + map)
│   ├── api/
│   │   ├── geocode/route.ts         # POST /api/geocode (Nominatim integration)
│   │   └── route/route.ts           # POST /api/route (OSRM integration)
│   ├── components/
│   │   ├── AddressForm.tsx          # Multi-address input component
│   │   ├── RouteMap.tsx             # Leaflet map component (React-Leaflet)
│   │   ├── RouteDetails.tsx         # Itinerary display (segments, totals)
│   │   └── ErrorBoundary.tsx        # Error handling wrapper
│   ├── lib/
│   │   ├── nominatim.ts             # Nominatim client (geocoding utility)
│   │   ├── osrm.ts                  # OSRM client (routing utility)
│   │   ├── types.ts                 # Shared TypeScript interfaces
│   │   └── utils.ts                 # Helper functions
│   └── layout.tsx                  # Root layout (head, providers, etc.)
│
├── __tests__/
│   ├── unit/
│   │   ├── nominatim.test.ts        # Geocoding utility tests
│   │   ├── osrm.test.ts             # Routing utility tests
│   │   └── utils.test.ts            # Helper function tests
│   ├── integration/
│   │   ├── api-geocode.test.ts      # POST /api/geocode tests
│   │   ├── api-route.test.ts        # POST /api/route tests
│   │   └── AddressForm.test.tsx     # Component integration tests
│   └── e2e/
│       └── smoke.test.ts             # Happy path E2E test
│
├── public/
│   └── (OpenStreetMap tiles cached locally if needed)
│
├── .env.example                     # Environment variables template
├── .env.local                       # Local secrets (gitignored)
├── package.json                     # Dependencies (Next.js, React, Leaflet, etc.)
├── tsconfig.json                    # TypeScript configuration
├── jest.config.ts                   # Jest testing configuration
└── vercel.json                      # Vercel deployment configuration

specs/001-shortest-route-addresses/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Technical decisions
├── data-model.md        # Entity models
├── quickstart.md        # Testing guide
└── contracts/
    ├── api-geocode.md
    └── api-route.md
```

**Structure Rationale**:
- Single Next.js project (not separate backend/frontend) aligns with "self-contained" principle
- App Router (latest Next.js pattern) for scalability
- API routes as serverless functions (Vercel-native, no extra infrastructure)
- Shared types in `lib/types.ts` for consistency
- Tests colocated with source in `__tests__/` for easy maintenance
- Public assets minimal (Leaflet CDN-based, OpenStreetMap tiles public)

## Deployment & CI/CD Strategy

### Hosting Platform: Vercel (Free Tier)

**Decision**: Deploy on Vercel Free tier with automatic GitHub integration

**Configuration**:
- **Platform**: Vercel.com (free tier)
- **GitHub Repository**: Connected for automatic CI/CD
- **Deployment Trigger**: Automatic deployment on every push to `main` branch
- **Production URL**: https://measuremg.vercel.app (or custom domain if configured)
- **SSL/HTTPS**: Automatic (Vercel-managed certificate, included in free tier)
- **Build Process**: Vercel auto-detects Next.js; build runs `npm run build` (< 3 min per Constitution requirement)
- **Preview Deployments**: Automatic preview URLs for pull requests (for testing before merge)

**Environment Variables** (configured in Vercel dashboard):
```
NEXT_PUBLIC_NOMINATIM_BASE_URL=https://nominatim.openstreetmap.org
NEXT_PUBLIC_OSRM_BASE_URL=https://router.project-osrm.org
```

Note: Environment variables prefixed with `NEXT_PUBLIC_` are accessible in client-side code (Nominatim/OSRM base URLs do not require secrets).

### CI/CD Workflow

```
Developer Workflow:
  1. Create feature branch from main
  2. Make changes + local testing
  3. Push to GitHub
  4. Vercel automatically builds preview deployment (linked in PR)
  5. Test on preview URL
  6. Merge PR to main (via GitHub)
  7. Vercel automatically builds + deploys to production
  8. Monitor at https://measuremg.vercel.app
```

### Rollback Strategy

- **Instant**: Vercel dashboard allows one-click rollback to previous deployment
- **Manual**: Can redeploy a specific Git commit via Vercel UI
- **Automatic**: No automatic rollback; monitor production and manually trigger if needed

### Performance & Limits (Free Tier)

| Aspect | Limit | Impact |
|--------|-------|--------|
| Serverless Functions | Up to 12 concurrent executions | Fine for MVP; 25 addresses ≤ 5s calc fits within limits |
| Function Timeout | 60 seconds | More than enough for Nominatim + OSRM calls (typical: 2-5s) |
| Bandwidth | Unlimited | Public API, no paid tiers needed |
| Build Time | < 3 minutes | Vercel optimizes Next.js builds; typically 1-2 minutes |
| Deployments | Unlimited | No deployment count limits on free tier |

### Monitoring & Alerting

- **Build Failures**: GitHub notifications on build/deploy failure
- **Uptime Monitoring**: Manual checks or integrate Uptime Robot (free tier) for periodic health checks
- **Error Tracking**: Browser console errors visible locally; consider Sentry (free tier) for production error logging (future enhancement)

### Database & Persistence (Not Applicable for V1)

V1 is stateless (no user accounts, no persistent route storage). If V2 adds persistence:
- Consider Supabase PostgreSQL (free tier: 500 MB storage, suitable for MVP)
- Environment variable: `DATABASE_URL` configured in Vercel

### Vercel Configuration File (`vercel.json`)

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "env": {
    "NEXT_PUBLIC_NOMINATIM_BASE_URL": "@nominatim_url",
    "NEXT_PUBLIC_OSRM_BASE_URL": "@osrm_url"
  }
}
```

(Environment secret values defined in Vercel dashboard UI, referenced via `@variable_name`)

### Cost Analysis

| Component | Cost (Monthly) | Notes |
|-----------|---|---|
| Vercel Hosting | $0 | Free tier sufficient for MVP |
| Domain (optional) | $0-15 | Use Vercel subdomain for free; custom domain optional |
| Nominatim API | $0 | Free public API (rate-limited 1 req/sec; sufficient for MVP) |
| OSRM Public API | $0 | Free public API (self-hosted option available if needed) |
| SSL Certificate | $0 | Included (Vercel-managed) |
| **Total** | **$0** | Zero cost deployment (self-contained, free APIs, free hosting) |

**Future Scaling** (if needed):
- Vercel Pro ($20/month): increased function concurrency, higher build limits
- Self-hosted OSRM instance: if rate-limiting becomes issue (estimated $50+/month for VPS)
- Nominatim mirror: for guaranteed availability (self-hosted or third-party)

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
