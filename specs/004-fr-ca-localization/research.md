# Research: Interface en français canadien par défaut, avec bascule vers l'anglais

**Purpose**: Résoudre les décisions techniques nécessaires avant le design (Phase 1), en s'appuyant sur l'inventaire réel du texte codé en dur dans l'application.

## Inventaire du texte à traduire (constat de code)

Recherche de texte codé en dur dans `app/` : 9 fichiers concernés.

| Fichier | Type de contenu |
|---|---|
| `app/layout.tsx` | Titre/metadata, en-tête, pied de page (Server Component) |
| `app/page.tsx` | Titres, texte d'intro (Client Component) |
| `app/components/AddressForm.tsx` | Labels, placeholders, boutons, messages de statut (✓/✗/⚠), avertissements |
| `app/components/RouteMap.tsx` | Texte des popups de marqueurs |
| `app/components/ErrorBoundary.tsx` | Message d'erreur générique, bouton "Try again" |
| `app/results/page.tsx` | Titres, labels, boutons |
| `app/lib/nominatim.ts` | Messages d'erreur générés par le géocodage ("Address not found...", ambiguïté) |
| `app/api/geocode/route.ts` | Messages de validation de requête (ex: "Maximum 25 addresses allowed") |
| `app/api/route/route.ts` | Messages de validation de requête + erreurs OSRM |

Les deux derniers groupes (`nominatim.ts`, `api/geocode`, `api/route`) posent un problème d'architecture : ces messages sont générés **côté serveur** (routes API), alors que la langue active n'existe que côté client (choix de l'utilisateur, FR-008). Il faut donc découpler le message de son texte affiché.

## Décision 1 — Solution technique : dictionnaire maison vs librairie i18n

**Decision**: Implémenter un Context React léger fait maison (`app/lib/i18n/`) avec deux dictionnaires statiques (`fr-CA`, `en`) plutôt qu'une librairie comme `next-intl` ou `react-intl`.

**Rationale**: L'application compte ~2 pages et ~100 chaînes de texte au total (voir inventaire ci-dessus) — un volume trivial à gérer à la main. La spec exclut explicitement le routage par langue (Assumptions du spec), ce qui élimine le principal avantage de `next-intl` (routage/middleware par locale). Une solution maison évite une nouvelle dépendance, ce qui respecte la Constitution (IV. Performance-First : "Bundle size monitored; new dependencies justified in pull requests" ; II. Self-Contained).

**Alternatives rejetées**:
- `next-intl` : conçu autour du routage par locale (middleware, segments `[locale]`) — complexité inutile puisque le spec exclut les URL par langue.
- `react-intl` (FormatJS) : robuste mais lourd (ICU message format, pluralisation avancée) pour un besoin de bascule simple entre deux langues sans formats de date/nombre complexes.

## Décision 2 — Découpler les messages d'erreur serveur de leur traduction

**Decision**: Les routes API (`/api/geocode`, `/api/route`) et `app/lib/nominatim.ts` retournent un champ additif `errorCode` (ex: `'ADDRESS_NOT_FOUND'`, `'TOO_MANY_ADDRESSES'`) en plus du champ `error` existant (texte anglais, conservé comme repli/logging). Le client traduit `errorCode` via le même dictionnaire que le reste de l'interface (`t('errors.' + errorCode)`), avec repli sur le texte anglais brut si le code est absent ou inconnu (voir Edge Case spec : "traduction manquante → texte de repli").

**Rationale**: Garde les routes API sans état de langue (pas de paramètre `locale` à faire transiter, pas de `Vary` header à gérer sur le cache existant `Cache-Control: public, max-age=300` de `/api/geocode` et `/api/route`). Change minimal, additif, rétrocompatible avec les contrats de la spec 001 (`contracts/api-geocode.md`, `contracts/api-route.md`).

**Alternatives rejetées**:
- Passer la locale au serveur (query param ou header) et retourner un message déjà traduit : casserait le cache HTTP existant (nécessiterait `Vary: Accept-Language` ou une clé de cache par langue) et coupleraient les routes API à la couche de traduction UI.

## Décision 3 — Persistance et langue par défaut

**Decision**: Stocker la préférence de langue dans `sessionStorage['language']` (valeurs `'fr-CA'` ou `'en'`). Au montage du `LanguageProvider`, lire cette clé ; si absente, utiliser `'fr-CA'` par défaut, sans lire `navigator.language` (FR-009 — toujours français canadien par défaut, indépendamment du navigateur).

**Rationale**: Réutilise le pattern déjà en place dans le code (spec 001/003 utilisent `sessionStorage` pour `route`, `geocodeResults`, `addressTexts`) — aucune nouvelle technique de stockage introduite. `sessionStorage` correspond exactement à la portée demandée par FR-008 ("pour la durée de sa session de navigateur").

## Décision 4 — `<html lang>` et Server/Client boundary

**Decision**: `app/layout.tsx` reste un Server Component (nécessaire pour l'export `metadata`), avec `<html lang="fr-CA">` statique par défaut. L'en-tête et le pied de page (actuellement inline dans `layout.tsx`) sont extraits en deux petits Client Components (`AppHeader.tsx`, `AppFooter.tsx`) qui consomment `useLanguage()`. Le `LanguageProvider` (Client Component) met à jour `document.documentElement.lang` via `useEffect` à chaque changement de langue (amélioration progressive, ne bloque pas le rendu serveur).

**Rationale**: `metadata` (titre de l'onglet, description) exige un Server Component ; on ne peut pas rendre tout `layout.tsx` client. L'extraction de l'en-tête/pied de page en composants clients isolés est le changement minimal pour les rendre traduisibles sans perdre `metadata`.

**Alternatives rejetées**: Convertir tout `layout.tsx` en Client Component et abandonner `metadata` — dégraderait le SEO/titre d'onglet sans bénéfice, hors de la portée du spec (qui n'exige pas de traduire le titre d'onglet dynamiquement).

## Décision 5 — Couverture de traduction (FR-005 / FR-006)

**Decision**: Tout texte listé dans l'inventaire ci-dessus est traduit, à l'exception de :
- Les noms d'adresses retournés par Nominatim (`displayName`, `alternatives[].displayName`) — contenu externe, FR-006.
- Le `title`/`description` de `metadata` dans `layout.tsx` (fixés en français canadien, non basculables dynamiquement — limitation technique de Décision 4, impact mineur car invisible dans le corps de la page).

**Rationale**: Couvre 100 % du texte visible généré par l'application (SC-001), conforme à FR-005, sans franchir la frontière Server/Client de `metadata`.

## Récapitulatif des impacts fichiers

| Fichier | Changement | Nouveau/Modifié |
|---|---|---|
| `app/lib/i18n/translations.ts` | Dictionnaires `fr-CA` / `en`, type `Locale`, type `TranslationKey` | Nouveau |
| `app/lib/i18n/LanguageContext.tsx` | `LanguageProvider`, `useLanguage()` (locale, setLocale, t) | Nouveau |
| `app/components/LanguageSwitcher.tsx` | Contrôle de bascule (FR-002) | Nouveau |
| `app/components/AppHeader.tsx` | En-tête extrait de `layout.tsx`, traduit, inclut le sélecteur | Nouveau |
| `app/components/AppFooter.tsx` | Pied de page extrait de `layout.tsx`, traduit | Nouveau |
| `app/layout.tsx` | `<html lang="fr-CA">` statique, enveloppe `LanguageProvider` + `AppHeader`/`AppFooter` | Modifié |
| `app/page.tsx` | Texte → `t()` | Modifié |
| `app/components/AddressForm.tsx` | Texte statique → `t()` ; `error` → `t('errors.' + errorCode)` avec repli | Modifié |
| `app/components/RouteMap.tsx` | Texte des popups → `t()` | Modifié |
| `app/components/ErrorBoundary.tsx` | Texte → `t()` | Modifié |
| `app/results/page.tsx` | Texte → `t()` | Modifié |
| `app/lib/nominatim.ts` | Ajout `errorCode` sur chaque résultat | Modifié |
| `app/api/geocode/route.ts` | Ajout `errorCode` sur les erreurs de validation | Modifié |
| `app/api/route/route.ts` | Ajout `errorCode` sur les erreurs de validation/OSRM | Modifié |
| `app/lib/types.ts` | `errorCode?: string` sur les types de réponse d'erreur | Modifié |
