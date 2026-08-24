# Implementation Plan: Interface en français canadien par défaut, avec bascule vers l'anglais

**Branch**: `004-fr-ca-localization` | **Date**: 2026-08-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/004-fr-ca-localization/spec.md`

## Summary

Ajouter un système de traduction léger (Context React + dictionnaires `fr-CA`/`en` faits maison, sans nouvelle dépendance) pour afficher l'application en français canadien par défaut, avec bascule instantanée vers l'anglais via un contrôle visible sur chaque page. Les données déjà saisies (adresses) ne sont jamais perdues lors du changement de langue. Les messages d'erreur générés par les routes API (`/api/geocode`, `/api/route`) deviennent traduisibles via un champ `errorCode` additif, sans coupler les API à la langue de l'utilisateur (pas de paramètre de locale transmis, cache HTTP existant préservé).

## Technical Context

**Language/Version**: TypeScript/JavaScript (Next.js 14, React, Node.js 18+ LTS) — stack existante, aucun ajout

**Primary Dependencies**:
- Réutilisées (aucune nouvelle dépendance) : React Context API (natif), `sessionStorage` (déjà utilisé par les specs 001/003)
- Rejeté : `next-intl` / `react-intl` (voir research.md Décision 1 — complexité de routage non nécessaire, volume de texte trivial)

**Storage**: Aucune (préférence de langue en `sessionStorage`, comme le reste de l'app)

**Testing**: Jest + React Testing Library — test de complétude des dictionnaires (aucune clé manquante entre `fr-CA`/`en`), test du composant `LanguageSwitcher`, test de non-perte de données au changement de langue dans `AddressForm`

**Target Platform**: Web browser via Vercel (inchangé)

**Project Type**: Application web Next.js unique (inchangé)

**Performance Goals**:
- Changement de langue visible en < 1s, sans rechargement de page (SC-002) — re-rendu React local, aucun appel réseau requis pour la bascule elle-même
- Aucun impact sur les performances de géocodage/routage existantes (le champ `errorCode` est additif, calculé en même temps que `error`)

**Constraints**:
- Pas de routage par langue (pas d'URL `/en/...`) — décision du spec, simplifie l'implémentation (pas de middleware Next.js i18n)
- Les routes API restent agnostiques de la langue (pas de paramètre `locale`, cache `Cache-Control: public, max-age=300` existant préservé sans `Vary`)
- Le contenu externe (noms d'adresses Nominatim) n'est jamais traduit (FR-006)
- `<html lang>` doit rester cohérent avec l'export `metadata` de `layout.tsx` (Server Component) — voir research.md Décision 4

**Scale/Scope**: ~100 chaînes de texte réparties sur 9 fichiers existants (voir research.md § Inventaire) + 3 nouveaux fichiers (`translations.ts`, `LanguageContext.tsx`, `LanguageSwitcher.tsx`) + 2 fichiers extraits (`AppHeader.tsx`, `AppFooter.tsx`)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Deploy-Ready** | ✅ PASS | Aucun nouvel env var, aucune nouvelle dépendance ; build Next.js inchangé |
| **II. Self-Contained** | ✅ PASS | Dictionnaires statiques inclus dans le bundle, aucun service de traduction externe |
| **III. Shareable & Accessible** | ✅ PASS | Répond directement au principe d'accessibilité linguistique pour le public cible (français canadien) tout en gardant l'anglais accessible |
| **IV. Performance-First** | ✅ PASS | Pas de nouvelle dépendance (bundle size non affecté au-delà des dictionnaires eux-mêmes, ~quelques Ko) ; bascule 100% client-side, aucun appel réseau |
| **V. Production Quality** | ✅ PASS | Repli explicite si clé de traduction manquante (pas d'échec silencieux) ; tests de complétude des dictionnaires |

**GATE RESULT**: ✅ **PASS** — Aucune violation ; `Complexity Tracking` non applicable.

## Project Structure

### Documentation (this feature)

```text
specs/004-fr-ca-localization/
├── plan.md              # This file
├── research.md          # Phase 0 — décisions techniques (dictionnaire maison, errorCode, sessionStorage, Server/Client boundary)
├── data-model.md         # Phase 1 — Locale, dictionnaire, LanguageContext, table des codes d'erreur
├── contracts/
│   └── error-codes.md    # Phase 1 — extension additive de /api/geocode et /api/route
├── quickstart.md         # Phase 1 — 5 scénarios de validation manuelle
├── checklists/requirements.md  # Déjà existant (16/16 items conformes)
└── tasks.md              # Phase 2 (généré par /speckit-tasks)
```

### Source Code (repository root)

```text
app/
├── lib/
│   ├── i18n/
│   │   ├── translations.ts      # NOUVEAU : dictionnaires fr-CA / en, type Locale
│   │   └── LanguageContext.tsx  # NOUVEAU : LanguageProvider, useLanguage()
│   ├── nominatim.ts              # MODIFIÉ : + errorCode par résultat
│   └── types.ts                   # MODIFIÉ : + errorCode? sur les types d'erreur
├── components/
│   ├── LanguageSwitcher.tsx       # NOUVEAU : contrôle de bascule FR/EN
│   ├── AppHeader.tsx               # NOUVEAU : en-tête extrait de layout.tsx, traduit
│   ├── AppFooter.tsx                # NOUVEAU : pied de page extrait de layout.tsx, traduit
│   ├── AddressForm.tsx               # MODIFIÉ : texte → t(), erreurs → errorCode
│   ├── RouteMap.tsx                   # MODIFIÉ : popups → t()
│   └── ErrorBoundary.tsx               # MODIFIÉ : texte → t()
├── api/
│   ├── geocode/route.ts                 # MODIFIÉ : + errorCode
│   └── route/route.ts                    # MODIFIÉ : + errorCode
├── page.tsx                                # MODIFIÉ : texte → t()
├── results/page.tsx                         # MODIFIÉ : texte → t()
└── layout.tsx                                # MODIFIÉ : <html lang="fr-CA"> statique, enveloppe LanguageProvider + AppHeader/AppFooter

__tests__/
└── unit/
    ├── translations.test.ts                   # NOUVEAU : complétude des clés fr-CA ↔ en
    └── LanguageContext.test.tsx                # NOUVEAU : défaut fr-CA, bascule, sessionStorage
```

**Structure Rationale**: Isolation de la logique i18n dans `app/lib/i18n/` (aucune dépendance croisée avec le reste de `lib/`) ; extraction minimale de `layout.tsx` en composants clients pour respecter la frontière Server/Client imposée par `metadata` (research.md Décision 4) ; aucune nouvelle route API, aucun nouveau endpoint — extension additive des contrats existants uniquement.

## Complexity Tracking

*Aucune violation de la Constitution — section non applicable.*
