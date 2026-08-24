# Data Model: Interface en français canadien par défaut, avec bascule vers l'anglais

**Scope**: Aucune donnée persistée côté serveur. Un seul état côté client (préférence de langue) et une extension additive des types d'erreur existants.

## Locale (nouveau)

```typescript
// app/lib/i18n/translations.ts
export type Locale = 'fr-CA' | 'en'
export const DEFAULT_LOCALE: Locale = 'fr-CA'
```

## Dictionnaire de traduction (nouveau)

```typescript
// app/lib/i18n/translations.ts
export const translations: Record<Locale, Record<string, string>> = {
  'fr-CA': { /* ~100 clés, ex: 'home.title': 'Trouvez le trajet le plus court', ... */ },
  en: { /* mêmes clés, en anglais */ },
}
```

- Clés organisées par préfixe de domaine : `common.*`, `home.*`, `addressForm.*`, `results.*`, `map.*`, `errorBoundary.*`, `errors.*` (voir Décision 2 de research.md pour `errors.*`).
- Chaque clé DOIT exister dans les deux dictionnaires. Une clé manquante dans la langue active retombe sur la valeur `fr-CA` (repli, Edge Case du spec) plutôt que d'afficher la clé brute ou une chaîne vide.

## LanguageContext (nouveau)

```typescript
// app/lib/i18n/LanguageContext.tsx
interface LanguageContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string) => string
}
```

Règles (FR-001, FR-002, FR-003, FR-008, FR-009) :
- Valeur initiale : `DEFAULT_LOCALE` ('fr-CA'), avant lecture de `sessionStorage` (évite un flash de contenu incorrect en repli sûr).
- Au montage (client uniquement) : lit `sessionStorage.getItem('language')` ; si `'fr-CA'` ou `'en'`, l'applique ; sinon garde `DEFAULT_LOCALE` (ignore `navigator.language`, FR-009).
- `setLocale(next)` : met à jour l'état React (re-rend immédiatement tous les composants abonnés, FR-003) et écrit `sessionStorage.setItem('language', next)`.
- N'affecte aucun état de formulaire existant (`AddressForm`, etc.) — le changement de langue ne remonte/démonte aucun composant contenant des données saisies (FR-004).

## Extension des types d'erreur existants (modifié, additif)

```typescript
// app/lib/types.ts — GeocodeResponse.results[] gagne un champ optionnel
interface GeocodeResultItem {
  // ... champs existants (status, lat, lon, displayName, alternatives, error) inchangés
  errorCode?: 'ADDRESS_NOT_FOUND' | 'AMBIGUOUS' | 'GEOCODING_FAILED'
}

// RouteResponse — même principe pour les réponses d'erreur des routes API
interface ApiErrorBody {
  error: string       // texte anglais existant, conservé (repli/logging)
  errorCode?: string  // nouveau — voir table des codes ci-dessous
  retryAfter?: number // existant, inchangé
}
```

### Table des codes d'erreur (nouveau)

| `errorCode` | Origine | Clé de traduction |
|---|---|---|
| `ADDRESS_NOT_FOUND` | `nominatim.ts` | `errors.ADDRESS_NOT_FOUND` |
| `AMBIGUOUS` | `nominatim.ts` | `errors.AMBIGUOUS` |
| `GEOCODING_FAILED` | `nominatim.ts` (exception réseau) | `errors.GEOCODING_FAILED` |
| `MISSING_ADDRESSES` / `EMPTY_ADDRESSES` / `TOO_MANY_ADDRESSES` / `INVALID_ADDRESS_FORMAT` | `api/geocode/route.ts` | `errors.<CODE>` |
| `RATE_LIMITED` | `api/geocode/route.ts`, `api/route/route.ts` | `errors.RATE_LIMITED` |
| `SERVICE_UNAVAILABLE` | `api/geocode/route.ts`, `api/route/route.ts` | `errors.SERVICE_UNAVAILABLE` |
| `MISSING_WAYPOINTS` / `TOO_FEW_WAYPOINTS` / `TOO_MANY_WAYPOINTS` / `INVALID_WAYPOINT` / `INVALID_COORDINATES` | `api/route/route.ts` | `errors.<CODE>` |
| `ROUTING_FAILED` / `TIMEOUT` | `api/route/route.ts` | `errors.<CODE>` |

Règle côté client (FR-005, Edge Case "traduction manquante") : afficher `t('errors.' + errorCode)` si `errorCode` est présent et connu du dictionnaire ; sinon afficher le champ `error` brut (anglais) tel quel plutôt qu'un message vide.

## Pas de nouvelle entité persistée

Aucune base de données, aucun cookie. Tout est en mémoire (React Context) + `sessionStorage`, cohérent avec la Constitution (Storage: N/A) et les specs précédentes.
