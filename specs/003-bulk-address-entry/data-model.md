# Data Model: Saisie facile et validation de multiples adresses

**Scope**: Cette feature ne modifie pas la forme des types partagés (`app/lib/types.ts`) — voir research.md, Décision 1. Elle ajoute un état de formulaire côté UI et étend la classification de statut de géocodage.

## Entités réutilisées (inchangées)

### AddressInput (`app/lib/types.ts`)

```typescript
interface AddressInput {
  id: string
  text: string
  order: number
  isStartPoint: boolean   // true uniquement pour l'adresse départ/retour (index 0)
  status: 'pending' | 'geocoding' | 'valid' | 'invalid' | 'ambiguous'
  geocodedCoords?: { lat: number; lon: number; displayName: string }
  error?: string
  alternatives?: { lat: number; lon: number; displayName: string }[]
  createdAt: Date
  updatedAt: Date
}
```

Règles de validation (via FR de spec 003) :
- `text` : 1-200 caractères après trim (déjà appliqué par `/api/geocode`) ; vide → ignoré (FR-007), jamais envoyé au géocodage.
- L'élément avec `isStartPoint: true` est toujours l'index 0 de la liste, toujours présent et obligatoire (FR-001a) ; ne peut pas être supprimé (US3, scénario 3), seulement modifié.
- Les éléments avec `isStartPoint: false` ("arrêts") : 2 à 20 après filtrage des vides (FR-001, FR-005).

### GeocodeResponse.results[].status

Extension de comportement (pas de changement de type — `'ambiguous'` existe déjà) :
- `'valid'` : un résultat net, coordonnées utilisables.
- `'invalid'` : aucun résultat Nominatim.
- `'ambiguous'` (nouveau comportement, voir research.md Décision 5) : ≥ 2 résultats avec `display_name` différents sur ville/région → `alternatives` peuplé, message du type "Adresse ambiguë : précisez la ville".

## Nouvel état UI (interne à `AddressForm.tsx`, pas persisté, pas exposé à l'API)

```typescript
// État de formulaire, local au composant — ne remplace pas AddressInput/AddressList
interface BulkEntryFormState {
  startAddressText: string          // champ isolé — toujours 1 élément, jamais un tableau
  stopAddressTexts: string[]        // 2 à 20 lignes après filtrage des vides
  fieldStatus: Record<number, {     // clé = index dans la liste combinée [start, ...stops]
    status: AddressInput['status']
    error?: string
    alternatives?: AddressInput['alternatives']
  }>
}
```

- `startAddressText` et `stopAddressTexts` sont combinés en un seul tableau ordonné (`[start, ...stops]`) au moment de l'appel à `/api/geocode` et `/api/route`, pour rester 100% compatible avec le contrat existant (`GeocodeRequest.addresses[]`, `RouteRequest.waypoints[]` — voir `specs/001-shortest-route-addresses/contracts/`).

## Règles de soumission (FR-005, FR-009, clarifications session 2026-08-23)

| Condition | Résultat |
|---|---|
| `startAddressText` vide ou non géocodable | Soumission bloquée, bouton désactivé, message sous le champ isolé |
| Moins de 2 `stopAddressTexts` valides | Soumission bloquée (FR-005) |
| ≥ 20 lignes déjà remplies et tentative d'ajout | Nouvelle ligne refusée, avertissement affiché (Edge Case) |
| Départ valide + ≥ 2 arrêts valides | Bouton "Calculer" activé (total minimum 3 adresses) |

## Pas de nouvelle entité persistée

Aucune base de données n'est introduite (cohérent avec la Constitution — Storage: N/A). Tout l'état ci-dessus est en mémoire (React state), le temps de la session de saisie, avant transmission à `/api/geocode` puis `/api/route` (spec 001).
