# Implementation Plan: Saisie facile et validation de multiples adresses

**Branch**: `003-bulk-address-entry` | **Date**: 2026-08-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-bulk-address-entry/spec.md`

## Summary

Améliorer le formulaire de saisie d'adresses existant (`app/components/AddressForm.tsx`, livré avec la spec 001) pour permettre une saisie facile de jusqu'à 20 adresses d'arrêt (avec collage multiligne auto-parsé), isoler l'adresse de départ/retour dans son propre champ (obligatoire, non supprimable — clarifiée le 2026-08-23), et remplacer les erreurs de géocodage actuellement affichées via `alert()` par un affichage inline par adresse (valide / invalide / ambiguë avec alternatives). Aucun changement de backend : les endpoints `/api/geocode` et `/api/route` de la spec 001 sont réutilisés tels quels.

## Technical Context

**Language/Version**: TypeScript/JavaScript (Next.js 14, React, Node.js 18+ LTS) — stack existante, aucun ajout

**Primary Dependencies**:
- Réutilisées (aucune nouvelle dépendance) : Next.js App Router, Tailwind CSS, `app/lib/nominatim.ts` (client Nominatim), `/api/geocode` (endpoint spec 001)
- Testing : Jest + React Testing Library (déjà configurés, `__tests__/` actuellement vide)

**Storage**: Aucune (état en mémoire côté React, comme spec 001 — voir data-model.md)

**Testing**: Jest + React Testing Library pour le parsing multiligne (`parseBulkAddressText`) et la classification `'ambiguous'` (`geocodeMultiple`)

**Target Platform**: Web browser via Vercel (inchangé)

**Project Type**: Application web Next.js unique (inchangé, pas de nouveau projet)

**Performance Goals**:
- Affichage d'une erreur de validation < 1s après saisie (SC-004) — validation déclenchée au blur, pas à chaque frappe (voir research.md Décision 4)
- Réactivité modifier/supprimer une adresse > 100ms, sans rechargement de page (SC-006)
- Saisie de 15 adresses en < 2 minutes (SC-001)

**Constraints**:
- API Nominatim publique limitée (~1 req/s, retry déjà géré dans `nominatim.ts`) → validation au blur, pas de géocodage à chaque frappe
- Limite UI : 20 adresses d'arrêt + 1 adresse départ/retour isolée = 21 max (FR-001a), strictement inférieure à la limite backend existante de 25 (aucune modif backend nécessaire)
- Minimum pour activer le calcul : départ valide + 2 arrêts valides = 3 adresses (FR-005/FR-009)

**Scale/Scope**: Amélioration ciblée d'un composant existant (`AddressForm.tsx`) + petite extension de `nominatim.ts`/`utils.ts` ; pas de nouvelle page, pas de nouvelle route API

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Deploy-Ready** | ✅ PASS | Aucun nouvel env var, aucune nouvelle dépendance ; build Next.js inchangé |
| **II. Self-Contained** | ✅ PASS | Réutilise `/api/geocode` existant (déjà self-contained, API publique gratuite) |
| **III. Shareable & Accessible** | ✅ PASS | Améliore l'accessibilité (erreurs inline au lieu d'`alert()` bloquant, plus clair pour l'utilisateur) |
| **IV. Performance-First** | ✅ PASS | Validation au blur (pas à chaque frappe) limite les appels réseau ; pas de nouvelle dépendance bundle |
| **V. Production Quality** | ✅ PASS | Remplace un pattern `alert()` fragile par une gestion d'erreur explicite inline ; TypeScript strict conservé |

**GATE RESULT**: ✅ **PASS** — Aucune violation ; aucun `Complexity Tracking` requis (feature = extension d'un composant existant, pas de nouvelle architecture).

## Project Structure

### Documentation (this feature)

```text
specs/003-bulk-address-entry/
├── plan.md              # This file
├── research.md          # Phase 0 — décisions techniques (isolation du champ départ, limites, validation au blur, ambiguïté)
├── data-model.md         # Phase 1 — état UI + extension de classification de statut
├── quickstart.md         # Phase 1 — 8 scénarios de validation manuelle
├── checklists/requirements.md  # Déjà existant (16/16 items conformes)
└── tasks.md              # Phase 2 (généré par /speckit-tasks)
```

### Source Code (repository root)

**Structure existante réutilisée** — aucun nouveau dossier :

```text
app/
├── components/
│   └── AddressForm.tsx      # MODIFIÉ : champ isolé départ/retour, plafond 20 arrêts,
│                             #   onPaste multiligne, statuts/erreurs inline, validation au blur
├── lib/
│   ├── nominatim.ts          # MODIFIÉ : geocodeAddress/geocodeMultiple classifient 'ambiguous'
│   ├── utils.ts               # MODIFIÉ : + parseBulkAddressText(text): string[]
│   └── types.ts                # INCHANGÉ (voir data-model.md, Décision 1)
├── api/
│   ├── geocode/route.ts        # INCHANGÉ (contrat spec 001 réutilisé tel quel)
│   └── route/route.ts           # INCHANGÉ
└── page.tsx                      # MODIFIÉ : retrait des alert() de géocodage
                                   #   (gérés désormais par AddressForm)

__tests__/
├── unit/
│   ├── nominatim.test.ts        # NOUVEAU : cas 'ambiguous'
│   └── utils.test.ts             # NOUVEAU : parseBulkAddressText
└── integration/
    └── AddressForm.test.tsx      # NOUVEAU : isolation champ départ, plafond 20, affichage inline
```

**Structure Rationale**: Aucune nouvelle route, aucun nouveau composant top-level — la feature est une amélioration ciblée du formulaire de saisie déjà livré avec la spec 001, en respectant les contrats API existants (voir research.md pour la justification de chaque décision).

## Complexity Tracking

*Aucune violation de la Constitution — section non applicable.*
