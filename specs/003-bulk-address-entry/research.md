# Research: Saisie facile et validation de multiples adresses

**Purpose**: Résoudre les décisions techniques nécessaires avant le design (Phase 1), en s'appuyant sur le code déjà livré pour la spec 001 (`AddressForm.tsx`, `/api/geocode`, `nominatim.ts`, `types.ts`).

## Contexte existant (constat de code, pas d'hypothèse)

- `app/components/AddressForm.tsx` gère déjà une liste dynamique d'adresses (2-25), avec bouton "+ Add Address" / "✕" par ligne, et traite l'index 0 comme point de départ (`isStartPoint: i === 0`) — mais visuellement, ce champ reste **dans la même liste** que les autres (juste un badge "(Start Point)"), pas isolé.
- `app/lib/types.ts` déclare déjà `AddressInput.isStartPoint: boolean` et `GeocodeResponse.results[].status: 'valid' | 'invalid' | 'ambiguous'` — le champ `'ambiguous'` existe dans le type mais n'est **jamais produit** par `geocodeMultiple()` (voir ci-dessous).
- `app/lib/nominatim.ts` → `geocodeAddress()` retourne `alternatives` (résultats 2 et 3 de Nominatim) mais `geocodeMultiple()` ne classe que `'valid'` / `'invalid'`, jamais `'ambiguous'`. FR-004 (spec 003) n'est donc pas encore satisfait.
- `app/api/geocode/route.ts` accepte 1 à 25 adresses ; c'est un endpoint générique déjà partagé par la spec 001. Aucune notion de "champ isolé" côté API.
- `app/page.tsx` affiche les erreurs de géocodage via `alert()` (bloquant, pas inline) — ne satisfait pas FR-003 ("signaler...sans bloquer").
- Aucun test n'existe encore sous `__tests__/` (dossiers vides) : aucun risque de régression à gérer pour le refactor.

## Décision 1 — Où vit le "champ isolé" dans le modèle de données ?

**Decision**: Ne pas changer la forme des données. `AddressList.addresses` reste un tableau ordonné unique, index 0 = adresse départ/retour (`isStartPoint: true`), comme c'est déjà le cas dans `AddressForm.tsx` et comme l'exige spec 001 FR-005 (boucle fermée démarrant à la première adresse saisie). Seule la **présentation UI** isole visuellement l'index 0 dans sa propre section, hors de la liste des arrêts.

**Rationale**: Évite de toucher `/api/geocode`, `/api/route`, `types.ts` (structures), et la logique de boucle de la spec 001. Le clarify de la spec 003 (FR-001a) est une contrainte d'UI/validation, pas de modèle de données.

**Alternatives rejetées**:
- Séparer en deux propriétés `startAddress` / `stops` dans `AddressList` → oblige à adapter `/api/route` et le calcul de boucle (spec 001) ; complexité inutile pour un besoin purement UI.

## Décision 2 — Limite 20 arrêts + 1 départ vs limite existante de 25

**Decision**: La limite UI de la spec 003 (20 arrêts + 1 départ = 21 max, FR-001/FR-001a) est **appliquée côté formulaire uniquement** (`AddressForm.tsx`). Le backend (`/api/geocode`, `/api/route`) garde sa limite existante de 25 (héritée de spec 001) — 21 ≤ 25, donc aucun changement backend requis.

**Rationale**: Le backend est un contrat partagé avec spec 001 (2-25) ; le resserrer à 21 casserait potentiellement d'autres flux. La contrainte 20+1 est spécifique à l'expérience de saisie en masse.

**Alternatives rejetées**: Modifier le max backend à 21 → couplage inutile entre les deux specs.

## Décision 3 — Mécanisme de saisie en masse

**Decision**: Conserver le mécanisme de liste dynamique déjà implémenté (un champ par arrêt, add/remove) comme base, et ajouter un **gestionnaire de collage (`onPaste`)** sur les champs d'arrêt : si le texte collé contient des sauts de ligne, il est automatiquement découpé (`split('\n')`, `trim()`, filtre des lignes vides) et distribué sur des lignes existantes/nouvelles jusqu'à la limite de 20, plutôt que collé tel quel dans un seul champ.

**Rationale**: Satisfait l'edge case "collage d'un bloc de texte" (FR-001, Edge Cases) et l'hypothèse "texte multiligne" du spec, sans réécrire toute l'UX existante d'édition ligne par ligne déjà utile pour US3 (modifier/supprimer une adresse individuellement).

**Alternatives rejetées**:
- Remplacer entièrement par un `<textarea>` unique multiligne → perdrait l'UX d'édition/suppression ligne par ligne déjà en place pour US3 ; nécessiterait de re-parser à chaque frappe.

## Décision 4 — Validation temps réel et affichage des erreurs

**Decision**: Déclencher la validation (`/api/geocode`) **au blur** de chaque champ individuel (pas à chaque frappe, pas seulement à la soumission globale), et afficher le résultat (✓ valide / ✗ erreur avec message / ⚠ ambiguë avec alternatives) **inline sous le champ concerné**. Remplacer les `alert()` de `app/page.tsx` par cet affichage inline (déjà porté par `AddressForm.tsx`, qui doit devenir responsable du rendu des statuts au lieu de simplement les remonter au parent).

**Rationale**: Satisfait SC-004 (< 1s après saisie) sans devoir géocoder à chaque frappe (coûteux, et l'API Nominatim publique est limitée à ~1 req/s — voir `nominatim.ts` `fetchWithRetry`). Le blur est le point naturel où l'utilisateur a fini de taper une adresse.

**Alternatives rejetées**:
- Debounce sur chaque frappe (ex: 500ms) → complique le respect du rate-limit avec jusqu'à 21 champs actifs ; le blur suffit à l'usage réel (saisie séquentielle ou collage).

## Décision 5 — Détection des adresses ambiguës (FR-004)

**Decision**: Étendre `geocodeMultiple()`/`geocodeAddress()` dans `app/lib/nominatim.ts` pour marquer `status: 'ambiguous'` quand Nominatim retourne ≥ 2 résultats dont les `display_name` diffèrent sur la ville/région (signal simple : comparer le nombre de résultats distincts retournés avec `limit=3`). Le champ `alternatives` déjà présent dans le type est utilisé pour proposer les choix à l'utilisateur.

**Rationale**: Le type `GeocodeResponse` prévoit déjà `'ambiguous'` — c'est un gap d'implémentation, pas de modèle. Répond directement à FR-004 et à l'US2 acceptance scenario #2 (ex: "Boulevard Paris").

**Alternatives rejetées**: Laisser Nominatim choisir le premier résultat silencieusement (comportement actuel) → ne satisfait pas FR-004.

## Décision 6 — Doublons

**Decision**: Hors scope pour cette itération (aucune FR ne l'exige ; les Assumptions de la spec le confirment explicitly comme "feature future"). Pas de détection de doublons dans ce plan.

## Récapitulatif des impacts fichiers

| Fichier | Changement | Nouveau/Modifié |
|---|---|---|
| `app/components/AddressForm.tsx` | Isoler le champ départ/retour (section propre, pas de bouton supprimer), plafond 20 pour les arrêts, gestion `onPaste` multiligne, affichage inline des statuts/erreurs/alternatives, validation au blur | Modifié |
| `app/lib/nominatim.ts` | `geocodeAddress`/`geocodeMultiple` : classification `'ambiguous'` | Modifié |
| `app/lib/utils.ts` | Ajout `parseBulkAddressText()` (split/trim/filter, cap 20) | Modifié |
| `app/page.tsx` | Retrait des `alert()` d'erreur de géocodage (gérées désormais par `AddressForm`) | Modifié |
| `app/lib/types.ts` | Aucun changement structurel (voir Décision 1) | Inchangé |
| `app/api/geocode/route.ts`, `app/api/route/route.ts` | Aucun changement (voir Décision 2) | Inchangé |
