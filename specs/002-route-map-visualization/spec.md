# Feature Specification: Visualiser l'itinéraire le plus court sur une carte interactive

**Feature Branch**: `002-route-map-visualization`

**Created**: 2026-08-21

**Status**: Draft

**Input**: User description: "Une carte doit être afficher avec l'itinéraire le plus court"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Afficher la carte avec l'itinéraire tracé (Priority: P1)

En tant qu'utilisateur, après avoir optimisé une liste d'adresses, je vois immédiatement sur une carte interactive l'itinéraire complet avec tous les points de passage tracés, afin de visualiser le trajet avant de le suivre.

**Why this priority**: C'est le cœur de la valeur apportée — voir le trajet géographiquement renforce la confiance et l'utilisabilité par rapport au texte seul. Sans la carte, l'optimisation reste abstraite.

**Independent Test**: Peut être testé en chargeant un itinéraire calculé et en vérifiant que chaque adresse s'affiche sur la carte dans l'ordre correct, reliée par une ligne représentant le trajet.

**Acceptance Scenarios**:

1. **Given** un itinéraire calculé avec 3 adresses, **When** l'utilisateur consulte le résultat, **Then** la carte affiche les 3 points de passage et un tracé continu reliant chaque étape en order.
2. **Given** une carte affichée, **When** l'utilisateur zoomte ou se déplace, **Then** les points de passage et le tracé restent visibles et alignés correctement.
3. **Given** une itinéraire avec points de passage proches les uns des autres, **When** l'utilisateur consulte la carte, **Then** les points demeurent distinctement visibles et identifiables (pas de superposition confuse).

---

### User Story 2 - Interagir avec la carte (Priority: P2)

En tant qu'utilisateur, je peux zoomer, faire un panoramique et cliquer sur chaque point de passage pour voir les détails du segment (adresse, distance, durée), afin de mieux comprendre chaque étape.

**Why this priority**: Améliore l'expérience utilisateur et permet une vérification rapide des détails sans revenir à la liste textuelle. Secondaire par rapport à la visualisation de base.

**Independent Test**: Peut être testé en cliquant sur un point de passage et en vérifiant que les détails du segment (adresse exacte, distance et durée du segment) s'affichent correctement.

**Acceptance Scenarios**:

1. **Given** une carte affichée, **When** l'utilisateur clique sur un point de passage, **Then** une infobulle ou un panneau latéral affiche l'adresse complète et la distance/durée du segment jusqu'au prochain point.
2. **Given** une carte affichée, **When** l'utilisateur utilise les gestes ou les contrôles de zoom, **Then** la carte reste réactive et les points de passage demeurent visibles et alignés.

---

### User Story 3 - Afficher le point de départ distinctement (Priority: P2)

En tant qu'utilisateur, je dois clairement identifier le point de départ/retour sur la carte (marqueur différent), car c'est le point d'ancrage du trajet.

**Why this priority**: Réduit la confusion — l'utilisateur doit comprendre rapidement d'où commence et où finit le trajet. Améliore la clarté sans être critique pour la fonctionnalité de base.

**Independent Test**: Peut être testé en affichant une itinéraire et en vérifiant que le point de départ est visuellement distingué des autres points (couleur, icône, ou label différent).

**Acceptance Scenarios**:

1. **Given** une itinéraire affichée, **When** l'utilisateur regarde la carte, **Then** le point de départ/retour est clairement marqué différemment (ex: couleur rouge, icône "départ").

---

### Edge Cases

- Que se passe-t-il si une itinéraire comporte seulement 2 adresses ? La carte doit afficher un simple segment.
- Quel est le comportement si la carte n'arrive pas à charger (pas de connexion API géographique) ? Message d'erreur clair.
- Comment s'affiche une itinéraire très géographiquement dispersée (adresses sur plusieurs continents) ? [NEEDS CLARIFICATION: scope limitée à une région ou mondiale ?]
- Comment gère-t-on une itinéraire très concentrée (adresses très proches) pour éviter la superposition visuelle ?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La carte DOIT afficher tous les points de passage de l'itinéraire dans l'ordre exact.
- **FR-002**: La carte DOIT tracer un chemin continu reliant chaque adresse dans l'ordre de passage.
- **FR-003**: Le point de départ/retour DOIT être visuellement distingué des autres points (couleur ou icône différente).
- **FR-004**: La carte DOIT supporter le zoom (au minimum 2 niveaux: vue d'ensemble et détail) et le panoramique.
- **FR-005**: L'utilisateur DOIT pouvoir cliquer sur un point pour afficher les détails du segment (adresse, distance, durée jusqu'au point suivant).
- **FR-006**: La carte DOIT charger en moins de 3 secondes pour une itinéraire de 10 adresses (y compris le rendu initial).
- **FR-007**: La carte DOIT être responsive et fonctionnelle sur mobile (tactile, gestes de zoom et panoramique).
- **FR-008**: En cas d'erreur de chargement (API géographique indisponible), le système DOIT afficher un message d'erreur clair et proposer une solution.

### Key Entities

- **Adresse**: Représentée sur la carte comme un point géographique avec coordonnées (latitude/longitude), numéro d'ordre, et métadonnées (distance/durée du segment).
- **Itinéraire**: Ensemble de points ordonnés et du tracé qui les relie; conserve le point de départ comme référence distincte.
- **Segment**: Connexion entre deux adresses consécutives; affiche distance et durée estimées.
- **Marker (Point)**: Élément visuel sur la carte représentant une adresse; type différent pour le point de départ.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Une carte avec 10 adresses affiche et charge en moins de 3 secondes sur une connexion 4G standard.
- **SC-002**: 100% des points de passage sont correctement positionnés sur la carte (pas de décalage géographique notable).
- **SC-003**: L'utilisateur peut zoomer et faire un panoramique sans latence perceptible (< 200ms de délai).
- **SC-004**: 95% des clics sur un point affichent correctement les détails du segment dans une infobulle ou un panneau.
- **SC-005**: La carte s'affiche correctement sur écrans de 320px de largeur (mobile) jusqu'à 1920px (desktop).
- **SC-006**: Le point de départ est identifié correctement par 95% des utilisateurs testés au premier coup d'œil.

## Assumptions

- La carte utilise une API de cartographie standard (ex: OpenStreetMap, Google Maps, Mapbox) existante ou intégrée via un service tiers.
- Les coordonnées géographiques des adresses sont fournies par la fonctionnalité de géocodage décrite en FR-002 de la spec 001-shortest-route-addresses.
- La portée géographique initiale est supposée être en Europe ou dans une région spécifique; la gestion de trajet multinational sera revue en v2.
- Le zoom par défaut affiche l'ensemble du trajet (vue d'ensemble automatique).
- Les couleurs et icônes des points de passage suivent une palette définie dans le guide de conception du projet.
- La performance du rendu de la carte dépend du nombre de points (max 25, conforme à la limite de 001) et du niveau de détail du tracé.
- Les gestes tactiles (zoom, pan) sont pris en charge nativement par la librairie cartographique.
- Aucune authentification ne requise pour afficher une carte partagée publiquement.
