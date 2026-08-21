# Feature Specification: Saisie facile et validation de multiples adresses

**Feature Branch**: `003-bulk-address-entry`

**Created**: 2026-08-21

**Status**: Draft

**Input**: User description: "Prévoir la possibilité d'entrer facile 20 adresses et indiquer à l'utilisateur si l'adresse n'est pas valide"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Saisir rapidement une liste d'adresses (Priority: P1)

En tant qu'utilisateur, je peux saisir jusqu'à 20 adresses via une interface qui me permet d'entrer plusieurs adresses rapidement, sans friction — soit via un formulaire à champs multiples, soit via un champ texte où je liste les adresses ligne par ligne.

**Why this priority**: C'est le cœur de la fonctionnalité — sans une saisie facile et rapide, l'utilisateur abandonnera la tâche. Le confort de saisie est critique pour l'adoption.

**Independent Test**: Peut être testé en saisissant 10 adresses dans l'interface et en validant que le système les accepte toutes sans erreur d'interface.

**Acceptance Scenarios**:

1. **Given** l'interface de saisie vide, **When** l'utilisateur entre 10 adresses différentes (une par champ ou ligne), **Then** toutes les adresses sont enregistrées et prêtes pour le calcul de l'itinéraire.
2. **Given** l'interface de saisie, **When** l'utilisateur appuie sur Tab/Entrée, **Then** un nouveau champ ou une nouvelle ligne s'ajoute automatiquement (jusqu'à 20 adresses max).
3. **Given** une liste partiellement remplie, **When** l'utilisateur soumet le formulaire, **Then** les champs vides ou les lignes vides ne sont pas inclus dans le traitement.

---

### User Story 2 - Valider les adresses et signaler les erreurs clairement (Priority: P1)

En tant qu'utilisateur, si une ou plusieurs de mes adresses sont invalides (ne peuvent pas être géolocalisées), le système m'indique clairement laquelle est en erreur et pourquoi, sans bloquer le traitement des autres adresses valides.

**Why this priority**: La validation rapide et transparente réduit la frustration et permet à l'utilisateur de corriger rapidement ses erreurs et relancer le calcul.

**Independent Test**: Peut être testé en saisissant un mélange d'adresses valides et invalides, et en vérifiant que le système signale précisément les adresses invalides avec un message explicite.

**Acceptance Scenarios**:

1. **Given** une liste contenant 8 adresses valides et 2 invalides, **When** l'utilisateur soumet le formulaire, **Then** le système signale clairement lesquelles des 2 adresses ne peuvent pas être géolocalisées et propose des suggestions ou demande une correction.
2. **Given** une adresse ambiguë (ex: "Boulevard Paris" — plusieurs rues de ce nom), **When** le système la détecte, **Then** l'utilisateur est invité à préciser (ex: "Boulevard Paris, Lyon" ou "Boulevard Paris, Paris") plutôt que de bloquer automatiquement.
3. **Given** une adresse invalide signalée, **When** l'utilisateur la corrige et revalide, **Then** le système accepte la nouvelle version sans nécessiter de ressaisir toutes les autres adresses.

---

### User Story 3 - Modifier la liste facilement (Priority: P2)

En tant qu'utilisateur, je peux ajouter, supprimer ou modifier une adresse dans la liste sans ressaisir l'ensemble, facilitant les corrections et les ajustements.

**Why this priority**: Améliore l'expérience utilisateur lors des itérations et corrections, mais secondaire par rapport à la validation de base.

**Independent Test**: Peut être testé en supprimant une adresse de la liste et en vérifiant que les autres adresses demeurent intactes.

**Acceptance Scenarios**:

1. **Given** une liste de 10 adresses, **When** l'utilisateur supprime la 5e adresse, **Then** la liste se réorganise (indices remis à jour) et les autres adresses sont intactes.
2. **Given** une liste existante, **When** l'utilisateur ajoute une nouvelle adresse, **Then** elle s'intègre à la liste sans réinitialiser les autres champs.

---

### Edge Cases

- Que se passe-t-il si l'utilisateur tente de saisir plus de 20 adresses ? Le système doit bloquer ou afficher un avertissement clair.
- Comment gère-t-on les adresses en double dans la liste saisie ? Faut-il les détecter et les signaler ?
- Que se passe-t-il si l'utilisateur colle un bloc de texte (ex: adresses séparées par des sauts de ligne) ? Le système doit-il les parser automatiquement ?
- Comment gérer les adresses partielles (ex: "Paris" sans rue) ? Accepter ou rejeter ?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Le système DOIT permettre la saisie de 1 à 20 adresses via une interface conviviale (champs multiples ou texte multiligne au choix du produit).
- **FR-002**: Le système DOIT valider chaque adresse saisie en temps réel ou à la soumission (géocodage).
- **FR-003**: Le système DOIT signaler chaque adresse invalide ou non géolocalisable avec un message clair (ex: "Adresse non trouvée : [adresse]") sans bloquer le traitement des autres adresses.
- **FR-004**: Pour les adresses ambiguës, le système DOIT proposer des suggestions ou demander une clarification (ex: "Ville manquante").
- **FR-005**: Le système DOIT interdire la soumission si le nombre d'adresses valides est inférieur à 2.
- **FR-006**: Le système DOIT permettre à l'utilisateur de modifier ou supprimer une adresse dans la liste sans ressaisir les autres.
- **FR-007**: Le système DOIT ignorer les champs vides ou les lignes vides lors du traitement.
- **FR-008**: Le système DOIT afficher le nombre total d'adresses valides vs invalides en temps réel.
- **FR-009**: Le système DOIT proposer à l'utilisateur de lancer le calcul d'itinéraire seulement si au moins 2 adresses valides sont détectées.

### Key Entities

- **Adresse (input)**: Entrée saisie par l'utilisateur, texte libre, peut être incomplète ou invalide avant validation.
- **Adresse (valide)**: Adresse validée et géolocalisée, avec coordonnées (latitude/longitude) résolues.
- **Erreur de validation**: Message d'erreur signalant une adresse invalide (non trouvée, ambiguë, etc.) avec suggestions de correction si applicable.
- **Liste d'adresses**: Collection ordonnée d'adresses (saisies), avec statut de validation pour chacune.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un utilisateur saisit 15 adresses en moins de 2 minutes (incluant corrections si nécessaire).
- **SC-002**: 95 % des adresses valides saisies sont correctement validées dès la première tentative.
- **SC-003**: Les messages d'erreur sont compris par 90 % des utilisateurs sans aide externe (clarté du message).
- **SC-004**: Le système affiche les erreurs de validation en moins de 1 seconde après saisie d'une adresse.
- **SC-005**: L'utilisateur corrige et révalide une adresse invalide en moins de 30 secondes en moyenne.
- **SC-006**: Le système supporte la suppression/modification d'une adresse sans rechargement de page (réactivité > 100ms).

## Assumptions

- L'interface de saisie supporte au minimum le mode texte multiligne (simplifiant l'implémentation initiale) ; les champs multiples peuvent être une amélioration future.
- La validation est effectuée via le même service de géocodage que celui de la spec 001-shortest-route-addresses.
- Les messages d'erreur utilisent un langage non technique et incluent des suggestions de correction.
- Les adresses vides ou contenant uniquement des espaces sont traitées comme des champs vides et ignorées.
- Pas de limite de temps pour la saisie ; l'utilisateur peut prendre tout le temps nécessaire.
- Les doublons dans la liste ne sont pas automatiquement supprimés mais peuvent être détectés et signalés (feature future si nécessaire).
- L'interface de saisie est responsable de la validation uniquement ; le calcul d'itinéraire est du ressort de la spec 001-shortest-route-addresses.
