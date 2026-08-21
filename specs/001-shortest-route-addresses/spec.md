# Feature Specification: Itinéraire le plus court entre une liste d'adresses

**Feature Branch**: `001-shortest-route-addresses`

**Created**: 2026-08-21

**Status**: Draft

**Input**: User description: "Trouver le chemin le plus court entre une liste d'adresses"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Optimiser un itinéraire multi-adresses (Priority: P1)

En tant qu'utilisateur, je saisis une liste d'adresses de destination et j'obtiens l'itinéraire qui minimise le trajet total nécessaire pour toutes les visiter.

**Why this priority**: c'est la valeur centrale de la fonctionnalité — sans ce calcul, il n'y a pas de produit.

**Independent Test**: peut être testé en saisissant 3 adresses connues et en vérifiant que le résultat proposé correspond au chemin optimal calculable manuellement.

**Acceptance Scenarios**:

1. **Given** une liste de 2 à 25 adresses valides, **When** l'utilisateur lance le calcul, **Then** le système retourne l'ordre de passage retenu, la distance totale et la durée totale estimée.
2. **Given** une liste contenant une adresse invalide ou introuvable, **When** l'utilisateur lance le calcul, **Then** le système signale clairement quelle adresse est en erreur sans bloquer le traitement des autres.
3. **Given** une seule adresse fournie, **When** l'utilisateur lance le calcul, **Then** le système indique qu'au moins deux adresses sont nécessaires.

---

### User Story 2 - Visualiser le détail de l'itinéraire (Priority: P2)

En tant qu'utilisateur, je veux voir l'ordre des étapes ainsi que la distance et la durée estimées de chaque segment, afin de comprendre le trajet proposé avant de le suivre.

**Why this priority**: renforce la confiance et l'utilisabilité, mais n'est pas indispensable pour obtenir la valeur de base (le calcul lui-même).

**Independent Test**: peut être testé en vérifiant que chaque segment affiché correspond à la distance/durée entre deux adresses consécutives de l'itinéraire calculé.

**Acceptance Scenarios**:

1. **Given** un itinéraire calculé, **When** l'utilisateur consulte le résultat, **Then** chaque étape affiche l'adresse, la distance et la durée estimée du segment, ainsi que les totaux cumulés.

---

### User Story 3 - Recalculer après modification de la liste (Priority: P3)

En tant qu'utilisateur, je veux ajouter, retirer ou modifier une adresse et relancer le calcul sans ressaisir toute la liste.

**Why this priority**: confort d'usage pour l'itération, secondaire par rapport au calcul initial.

**Independent Test**: peut être testé en modifiant une adresse dans une liste déjà calculée et en vérifiant qu'un nouvel itinéraire cohérent est produit.

**Acceptance Scenarios**:

1. **Given** un itinéraire déjà calculé, **When** l'utilisateur retire une adresse et relance le calcul, **Then** le système produit un nouvel itinéraire optimal excluant cette adresse.

---

### Edge Cases

- Que se passe-t-il si deux adresses de la liste sont identiques ou très proches (doublon) ?
- Comment le système gère-t-il une adresse ambiguë (plusieurs résultats possibles au géocodage) ?
- Que se passe-t-il si une adresse est géographiquement inaccessible par la route (île, zone sans accès routier) ?
- Comment le système réagit-il si le nombre d'adresses dépasse la limite supportée ?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Le système DOIT permettre à l'utilisateur de saisir une liste d'au moins 2 adresses et jusqu'à 25 adresses.
- **FR-002**: Le système DOIT valider chaque adresse saisie et la géolocaliser (résolution en coordonnées géographiques).
- **FR-003**: Le système DOIT calculer l'itinéraire qui minimise la distance totale parcourue pour visiter toutes les adresses (critère d'optimisation retenu par défaut ; le temps de trajet total reste un indicateur affiché mais n'est pas le critère d'optimisation en V1).
- **FR-004**: Le système DOIT rechercher automatiquement le meilleur ordre de passage parmi les adresses saisies (l'ordre de saisie de l'utilisateur n'est qu'une liste à visiter, pas une séquence imposée).
- **FR-005**: Le système DOIT traiter le trajet comme une boucle fermée : il part de la première adresse saisie (point de départ fixé par l'utilisateur), visite toutes les autres adresses, puis revient automatiquement à ce point de départ.
- **FR-006**: Le système DOIT indiquer à l'utilisateur l'ordre de passage retenu, la distance totale et la durée totale estimée du trajet.
- **FR-007**: Le système DOIT signaler toute adresse invalide ou non géolocalisable sans interrompre le traitement des autres adresses.
- **FR-008**: Le système DOIT permettre à l'utilisateur de modifier la liste d'adresses et de relancer le calcul.

### Key Entities

- **Adresse**: une entrée saisie par l'utilisateur représentant un lieu (texte libre, résolu en coordonnées géographiques).
- **Itinéraire**: la séquence ordonnée d'adresses avec, pour chaque segment, la distance et la durée estimées, ainsi que les totaux.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un utilisateur obtient un itinéraire calculé pour une liste de 10 adresses en moins de 5 secondes.
- **SC-002**: Le système traite correctement des listes allant jusqu'à 25 adresses sans dégradation perceptible du temps de réponse.
- **SC-003**: 95 % des adresses valides saisies sont correctement géolocalisées dès la première tentative.
- **SC-004**: L'itinéraire proposé réduit la distance totale d'au moins 15 % en moyenne par rapport à l'ordre de saisie initial (non optimisé), sur des listes de 5 adresses ou plus.

## Clarifications

### Session 2026-08-21

- Q: Quel est le mode de transport ? → A: Automobile (auto) exclusivement en V1.
- Q: Quelle plateforme/interface utilisateur ? → A: Application web responsive (déploiement Vercel).
- Q: Service de cartographie ? → A: Leaflet + OpenStreetMap (gratuit, léger).
- Q: Service de calcul d'itinéraire (routing) ? → A: OSRM Public API (gratuit, calcul TSP).
- Q: Service de géocodage (adresse → lat/lon) ? → A: Nominatim / OpenStreetMap (gratuit, rate-limited).
- Q: Gestion des erreurs API (timeout, indisponibilité) ? → A: Retry automatique (2-3 tentatives) + message d'erreur explicite utilisateur.

## Assumptions

**Architecture & Plateforme**:
- Interface : Application web responsive (déploiement Vercel).
- Cartographie : Leaflet + OpenStreetMap (gratuit, léger, performant).
- Géocodage : Nominatim / OpenStreetMap Geocoding (adresse → lat/lon).
- Routing : OSRM Public API (calcul d'itinéraire optimal).
- Erreurs API : Retry automatique (2-3 tentatives) + message d'erreur explicite utilisateur.

**Domaine & Métier**:
- Le mode de déplacement est l'automobile (trajet routier standard) pour V1 ; autres modes (vélo, transports en commun, etc.) déférés à versions futures.
- Une limite de 25 adresses par calcul est un plafond raisonnable pour la V1 ; au-delà, l'utilisateur devra scinder sa liste.
- Le trajet n'a pas de contrainte d'horaire (pas de fenêtres de livraison) pour cette première version.
- Le critère d'optimisation est la distance totale (et non le temps total) ; le temps est affiché à titre informatif.
- Le trajet est une boucle fermée : il démarre à la première adresse saisie et y revient automatiquement une fois toutes les autres adresses visitées.
