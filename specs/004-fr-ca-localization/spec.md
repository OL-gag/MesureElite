# Feature Specification: Interface en français canadien par défaut, avec bascule vers l'anglais

**Feature Branch**: `004-fr-ca-localization`

**Created**: 2026-08-23

**Status**: Draft

**Input**: User description: "L'application doit être français (canada) par défaut, et pouvoir être afficher en anglais au besoin."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Afficher l'application en français canadien par défaut (Priority: P1)

En tant que visiteur, lorsque j'ouvre l'application pour la première fois (sans préférence enregistrée), je vois toute l'interface en français canadien, sans avoir à configurer quoi que ce soit.

**Why this priority**: C'est le comportement par défaut attendu pour le public cible ; sans cela, la fonctionnalité de base n'est pas livrée.

**Independent Test**: Peut être testé en ouvrant l'application dans une session de navigation privée (sans préférence enregistrée) et en vérifiant que tout le texte de l'interface est en français canadien.

**Acceptance Scenarios**:

1. **Given** un visiteur sans préférence de langue enregistrée, **When** il charge l'application, **Then** tout le texte de l'interface (menus, boutons, messages, libellés) s'affiche en français canadien.
2. **Given** un visiteur qui navigue entre les pages de l'application (accueil, résultats), **When** aucune langue n'a été choisie explicitement, **Then** le français canadien reste affiché sur toutes les pages.

---

### User Story 2 - Basculer vers l'anglais au besoin (Priority: P1)

En tant qu'utilisateur, je peux basculer l'affichage de l'application vers l'anglais à l'aide d'un contrôle visible et accessible, puis revenir au français canadien si je le souhaite.

**Why this priority**: C'est le cœur de la demande — sans bascule fonctionnelle, l'anglais n'est pas accessible aux utilisateurs qui en ont besoin.

**Independent Test**: Peut être testé en sélectionnant "English" dans le sélecteur de langue et en vérifiant que tout le texte de l'interface passe en anglais, puis en revenant au français.

**Acceptance Scenarios**:

1. **Given** l'application affichée en français canadien, **When** l'utilisateur sélectionne "English" dans le contrôle de langue, **Then** tout le texte de l'interface passe en anglais immédiatement, sans rechargement complet de la page ni perte des données déjà saisies (ex: adresses en cours de saisie).
2. **Given** l'application affichée en anglais, **When** l'utilisateur sélectionne "Français" dans le contrôle de langue, **Then** l'interface repasse en français canadien.
3. **Given** un formulaire de saisie d'adresses partiellement rempli, **When** l'utilisateur change la langue de l'interface, **Then** toutes les adresses déjà saisies restent intactes.

---

### User Story 3 - Conserver le choix de langue durant la visite (Priority: P2)

En tant qu'utilisateur ayant choisi une langue, je n'ai pas besoin de la resélectionner à chaque page ou à chaque visite rapprochée.

**Why this priority**: Améliore l'expérience utilisateur, mais l'application reste utilisable (avec re-sélection manuelle) même sans cette persistance.

**Independent Test**: Peut être testé en sélectionnant l'anglais, en naviguant vers une autre page de l'application, et en vérifiant que l'anglais reste actif.

**Acceptance Scenarios**:

1. **Given** un utilisateur ayant sélectionné l'anglais, **When** il navigue vers une autre page de l'application (ex: page de résultats), **Then** l'interface demeure en anglais.
2. **Given** un utilisateur ayant sélectionné l'anglais, **When** il revient sur l'application plus tard durant la même session de navigateur, **Then** son choix de langue est toujours respecté.

---

### Edge Cases

- Que se passe-t-il si le navigateur de l'utilisateur est configuré dans une langue autre que le français ou l'anglais (ex: espagnol) ? Le français canadien par défaut doit s'appliquer.
- Comment le changement de langue affecte-t-il le contenu dynamique provenant de services externes (ex: noms d'adresses retournés par le service de géocodage) ? Ce contenu reste dans sa langue/format d'origine, hors du périmètre de traduction.
- Que se passe-t-il si une traduction est manquante pour un élément d'interface ? Le système doit afficher un texte de repli plutôt qu'un élément vide ou une erreur.
- Que se passe-t-il si l'utilisateur change de langue pendant que le système calcule un itinéraire (chargement en cours) ? Le calcul en cours ne doit pas être interrompu ni perdu.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Le système DOIT afficher tout le texte d'interface en français canadien par défaut pour un visiteur sans préférence de langue enregistrée.
- **FR-002**: Le système DOIT fournir un contrôle visible et accessible sur chaque page permettant de basculer l'affichage entre le français canadien et l'anglais.
- **FR-003**: Le système DOIT appliquer le changement de langue immédiatement, sans rechargement complet de la page.
- **FR-004**: Le système DOIT conserver toutes les données déjà saisies par l'utilisateur (ex: adresses en cours de saisie) lors d'un changement de langue.
- **FR-005**: Le système DOIT traduire l'ensemble des textes statiques et des messages générés par l'application elle-même (libellés, boutons, titres, messages de validation et d'erreur, contenu des pages) dans les deux langues supportées.
- **FR-006**: Le système NE DOIT PAS traduire le contenu retourné par des services externes (ex: noms d'adresses géocodées), qui reste affiché dans sa langue/format d'origine.
- **FR-007**: Le système DOIT utiliser les conventions du français canadien (terminologie, formulations) plutôt que celles du français de France, lorsque le français est affiché.
- **FR-008**: Le système DOIT mémoriser le choix de langue de l'utilisateur pour la durée de sa session de navigateur et l'appliquer automatiquement sur toutes les pages visitées durant cette session.
- **FR-009**: Le système DOIT toujours démarrer en français canadien par défaut pour une nouvelle session sans préférence enregistrée, indépendamment de la langue configurée dans le navigateur de l'utilisateur.

### Key Entities

- **Préférence de langue**: Choix de langue actif de l'utilisateur (français canadien par défaut, ou anglais), mémorisé pour la durée de la session de navigateur.
- **Texte d'interface**: Ensemble des libellés, messages et contenus statiques de l'application, disponibles dans les deux langues supportées.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100 % du texte d'interface visible est affiché en français canadien pour un nouvel utilisateur, sans action de sa part.
- **SC-002**: Un utilisateur peut basculer la langue d'affichage en un seul geste (ex: un clic ou un tap), avec un changement visible en moins de 1 seconde.
- **SC-003**: Aucune donnée saisie par l'utilisateur n'est perdue lors d'un changement de langue, dans 100 % des cas testés.
- **SC-004**: Le choix de langue de l'utilisateur est respecté sur 100 % des pages de l'application durant sa session de navigateur.
- **SC-005**: 90 % des utilisateurs testés trouvent et utilisent le sélecteur de langue sans aide externe.

## Assumptions

- L'anglais est la seule langue alternative requise pour cette itération (pas d'autres langues à ce stade).
- Le français canadien est la seule variante de français prise en charge (pas de distinction avec le français de France).
- Le choix de langue est mémorisé pour la session de navigateur en cours ; la persistance au-delà (ex: entre deux visites à des jours différents) n'est pas garantie dans cette itération.
- Le contenu retourné par les services externes (ex: géocodage) n'est pas traduit et reste hors du périmètre de cette fonctionnalité.
- Aucune adaptation d'URL par langue n'est requise dans cette itération (pas de liens distincts partageables par langue) ; la bascule est un contrôle d'interface, pas un système de routage.
