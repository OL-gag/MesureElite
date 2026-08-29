# Tâches: Planification des Mesures avec Champs de Dates & Optimisation d'Itinéraire

**Entrée**: Documents de conception de `/specs/001-measurement-deadline-dates/`

**Prérequis**: plan.md, spec.md, data-model.md, data-model-schedule.md

**Organisation**: Les tâches sont groupées par user story pour permettre l'implémentation et les tests indépendants de chaque histoire.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Peut s'exécuter en parallèle (fichiers différents, pas de dépendances)
- **[Story]**: À quelle user story appartient cette tâche (ex: US1, US2, US3)
- Inclure les chemins de fichiers exacts dans les descriptions

---

## Phase 1: Configuration (Infrastructure Partagée)

**Objectif**: Initialisation du projet et structure de base

- [ ] T001 Installer les dépendances du projet avec `npm install`
- [ ] T002 Vérifier que le serveur de développement démarre avec `npm run dev`
- [ ] T003 [P] Vérifier que `npm run type-check` compile sans erreurs

**Checkpoint**: Environnement de développement prêt

---

## Phase 2: Fondations (Prérequis Bloquants)

**Objectif**: Infrastructure cœur que TOUS les user stories doivent utiliser

**⚠️ CRITIQUE**: Aucun user story ne peut commencer avant la fin de cette phase

- [ ] T004 Étendre l'interface `AddressInput` dans `app/lib/types.ts` avec les champs `measurementDate?: Date` et `deadlineDate?: Date`
- [ ] T005 Ajouter les étiquettes de champs de date aux traductions i18n dans `app/lib/i18n/translations.ts` (labels et placeholders en FR et EN)
- [ ] T006 Créer des fonctions utilitaires de formatage de dates dans `app/lib/utils.ts` (formatage YYYY-MM-DD, parsing, calcul de jours jusqu'à deadline)
- [ ] T007 Créer les types pour le planificateur d'horaire dans `app/lib/types.ts` (MeasurementSchedule, DailyPlan, DailyStop, ScheduleConstraints)

**Checkpoint**: Structure de données et utilitaires prêts - les user stories peuvent commencer

---

## Phase 3: User Story 1 - Ajouter Date de Mesure à l'Adresse (Priorité: P1) 🎯 MVP

**Objectif**: Les utilisateurs peuvent ajouter et modifier une date de mesure pour chaque adresse, avec un défaut à la date du jour.

**Test Indépendant**: Accéder au formulaire d'adresse, ajouter une date de mesure, vérifier qu'elle s'affiche et que le formulaire peut être soumis.

### Implémentation pour User Story 1

- [ ] T008 [P] [US1] Ajouter un champ de date de mesure dans le composant `AddressForm.tsx` avec `<input type="date">` pour chaque adresse
- [ ] T009 [US1] Implémenter l'état React pour gérer les dates de mesure dans `AddressForm.tsx` (utiliser `useState` pour tableau de dates)
- [ ] T010 [US1] Initialiser la date de mesure à la date du jour lors de la création d'une nouvelle adresse dans `AddressForm.tsx`
- [ ] T011 [US1] Mapper la date de mesure du formulaire à l'objet `AddressInput` au moment de la soumission dans `AddressForm.tsx`
- [ ] T012 [US1] Ajouter le rendu de la date de mesure dans le résumé des adresses au résultat dans `app/results/page.tsx`
- [ ] T013 [US1] Ajouter la validation que la date de mesure n'est pas dans le passé lointain dans `app/lib/utils.ts`
- [ ] T014 [US1] Tester les scénarios 1-2 du quickstart.md pour US1

**Checkpoint**: User Story 1 fonctionnelle - les dates de mesure peuvent être ajoutées, modifiées et affichées indépendamment

---

## Phase 4: User Story 2 - Ajouter Date Limite à l'Adresse (Priorité: P1)

**Objectif**: Les utilisateurs peuvent ajouter et modifier une date limite pour chaque adresse, avec un défaut à la date du jour.

**Test Indépendant**: Accéder au formulaire d'adresse, ajouter une date limite, vérifier qu'elle s'affiche indépendamment de la date de mesure.

### Implémentation pour User Story 2

- [ ] T015 [P] [US2] Ajouter un champ de date limite dans le composant `AddressForm.tsx` avec `<input type="date">` pour chaque adresse
- [ ] T016 [US2] Implémenter l'état React pour gérer les dates limites dans `AddressForm.tsx` (utiliser `useState` pour tableau de dates)
- [ ] T017 [US2] Initialiser la date limite à la date du jour lors de la création d'une nouvelle adresse dans `AddressForm.tsx`
- [ ] T018 [US2] Mapper la date limite du formulaire à l'objet `AddressInput` au moment de la soumission dans `AddressForm.tsx`
- [ ] T019 [US2] Ajouter le rendu de la date limite dans le résumé des adresses au résultat dans `app/results/page.tsx`
- [ ] T020 [US2] Ajouter la validation que la date limite n'est pas dans le passé lointain dans `app/lib/utils.ts`
- [ ] T021 [US2] Tester les scénarios 3-4 du quickstart.md pour US2

**Checkpoint**: User Stories 1 ET 2 fonctionnelles - les dates de mesure et limite peuvent être gérées indépendamment

---

## Phase 5: User Story 3 - Générer Horaire Optimal par Jour (Priorité: P2)

**Objectif**: Le système génère automatiquement un horaire de mesure optimisé groupant les adresses par jour, respectant les contraintes de deadlines et minimisant la distance.

**Test Indépendant**: Soumettre 8+ adresses avec différentes dates de mesure et deadlines, recevoir un horaire optimisé par jour où (1) aucune adresse n'est après sa deadline, (2) chaque jour a un itinéraire géographique optimisé par OSRM.

### Implémentation pour User Story 3

- [ ] T022 [P] [US3] Créer le service d'algorithme de groupage dans `app/lib/scheduleOptimizer.ts` (fonction `groupAddressesByDay`)
- [ ] T023 [P] [US3] Créer l'intégration OSRM pour chaque jour dans `app/lib/scheduleOptimizer.ts` (fonction `optimizeRouteForDay`)
- [ ] T024 [P] [US3] Créer des fonctions utilitaires de calcul de priorité dans `app/lib/utils.ts` (getPriority, calculateDaysUntilDeadline)
- [ ] T025 [P] [US3] Créer un composant d'affichage du plan quotidien dans `app/components/DailyPlanCard.tsx` (affiche les stops, distance, durée, badges de priorité)
- [ ] T026 [P] [US3] Créer un composant d'affichage du badge de priorité dans `app/components/PriorityBadge.tsx` (🔴 urgent, 🟡 normal, 🟢 flexible)
- [ ] T027 [US3] Créer une nouvelle page de visualisation d'horaire dans `app/schedule/page.tsx` (affiche l'horaire complet multi-jour)
- [ ] T028 [US3] Créer une API endpoint POST `/api/schedule/generate` dans `app/api/schedule/route.ts` pour générer l'horaire
- [ ] T029 [US3] Intégrer l'appel de génération d'horaire dans le flux de soumission du formulaire (AddressForm → POST /api/schedule/generate → résultats)
- [ ] T030 [US3] Ajouter le rendu des adresses en retard avec indicateurs visuels (daysUntilDeadline < 0 = OVERDUE)
- [ ] T031 [US3] Ajouter la validation que l'horaire respecte toutes les contraintes de deadlines dans `app/lib/scheduleOptimizer.ts`
- [ ] T032 [US3] Tester les scénarios 8-10 du quickstart.md pour US3

### Réassignation Manuelle (Optionnel pour MVP)

- [ ] T033 [US3] Créer une API endpoint POST `/api/schedule/{scheduleId}/reassign` pour réassigner une adresse à un autre jour
- [ ] T034 [US3] Ajouter l'interface drag-and-drop ou bouton de réassignation dans `DailyPlanCard.tsx`
- [ ] T035 [US3] Implémenter la re-optimisation d'itinéraire pour les deux jours affectés après réassignation

**Checkpoint**: Toutes les user stories fonctionnelles - horaire optimisé multi-jour généré automatiquement

---

## Phase 6: Polissage & Améliorations Transversales

**Objectif**: Améliorations affectant plusieurs user stories

- [ ] T036 [P] Exécuter les tests de validation du quickstart.md (tous les scénarios 1-10)
- [ ] T037 [P] Vérifier que `npm run type-check` compile sans erreurs avec tous les nouveaux types
- [ ] T038 [P] Vérifier que `npm run lint` passe sans avertissements
- [ ] T039 Tester la responsabilité mobile des champs de date sur un appareil ou avec DevTools
- [ ] T040 Tester que les champs de date fonctionnent avec les entrées tactiles
- [ ] T041 Tester que l'affichage de l'horaire multi-jour est responsive sur mobile
- [ ] T042 Vérifier que la console du navigateur n'affiche aucune erreur ou avertissement
- [ ] T043 [P] Mettre à jour la documentation du projet si nécessaire (README.md, explications du nouveau flux)
- [ ] T044 Nettoyer le code et supprimer les logs de débogage
- [ ] T045 Tester les performances: génération d'horaire pour 50+ adresses doit être < 2 secondes
- [ ] T046 Valider que les itinéraires générés sont cohérents avec les résultats OSRM

**Checkpoint**: Fonctionnalité complète et prête pour la production

---

## Dépendances et Ordre d'Exécution

### Dépendances des Phases

- **Setup (Phase 1)**: Pas de dépendances - peut commencer immédiatement
- **Fondations (Phase 2)**: Dépend de la complétion de Setup - **BLOQUE tous les user stories**
- **User Stories (Phase 3+)**: Tous dépendent de la complétion de Foundational
  - **US1 et US2** (P1): Peuvent procéder en parallèle après Foundational
  - **US3** (P2): Peut commencer après US1 ET US2 complétées (dépend de AddressInput étendus)
- **Polissage (Phase Finale)**: Dépend de la complétion des user stories désirées

### Dépendances des User Stories

- **User Story 1 (P1)**: Phase 2 → US1 (indépendant)
- **User Story 2 (P1)**: Phase 2 → US2 (indépendant, parallèle à US1)
- **User Story 3 (P2)**: Phase 2 + US1 + US2 → US3 (dépend de AddressInput avec les deux date fields)

### Au sein de Chaque User Story

- Composants avant logique
- Logique avant API endpoints
- L'implémentation cœur avant l'intégration
- Story complète avant de passer à la prochaine priorité

### Opportunités de Parallélisation

**Phase Setup**: 1 tâche parallèle possible (T003)

**Phase Fondations**: T004-T007 doivent être séquentielles

**Après Fondations**:
- **Dev A**: US1 complète (T008-T014) → peut s'arrêter si MVP
- **Dev B**: US2 complète (T015-T021) → parallèle avec Dev A
- **Dev C**: Attend fin US1+US2, puis US3 (T022-T046)

---

## Exemple Parallèle: Équipe Multi-Dev

```bash
# Temps 0-30min: Setup + Fondations (tous ensemble)
Tâche: T001-T007

# Temps 30min-2h: US1 & US2 EN PARALLÈLE
Dev A:
  Tâche: T008-T014 (US1 - Date de Mesure)
Dev B:
  Tâche: T015-T021 (US2 - Date Limite)

# Temps 2h-4h: US3 (après US1+US2)
Dev C:
  Tâche: T022-T035 (US3 - Horaire Optimisé)

# Temps 4h+: Polissage (tous)
Tâche: T036-T046
```

---

## Stratégie d'Implémentation

### MVP D'Abord (User Stories 1 + 2)

1. Compléter Phase 1: Setup
2. Compléter Phase 2: Fondational (CRITIQUE - bloque toutes les stories)
3. Compléter Phase 3: User Story 1
4. Compléter Phase 4: User Story 2
5. **ARRÊTER et VALIDER**: Tester US1+US2 indépendamment (quickstart.md Scénarios 1-7)
6. Déployer/démo: Les utilisateurs peuvent maintenant ajouter des dates de mesure et de deadline
7. **✅ MVP livré**: Fonctionnalité complète de planification manuelle par dates

### Livraison Incrémentale

1. Setup + Foundational → Fondation prête
2. Ajouter US1 → Tester indépendamment → Déployer (MVP Phase 1!)
3. Ajouter US2 → Tester indépendamment → Déployer (MVP Phase 2 - Complet)
4. Ajouter US3 → Tester indépendamment → Déployer (Version 1.1 - Optimisation d'Horaire)
5. Ajouter Réassignation Manuelle → Tester → Déployer (Version 1.2 - Flexibilité)

### Version MVP Recommandée

**Version 1.0 = US1 + US2** (assez pour 80% du cas d'usage)
- ✅ Utilisateurs ajoutent dates de mesure et deadline
- ✅ Utilisateurs voient les dates affichées
- ⏳ US3 (Horaire optimal) peut venir en v1.1

**Version 1.1 = MVP + US3** (horaire automatique)
- ✅ Génération d'horaire optimisé
- ✅ Visualisation multi-jour
- ⏳ Réassignation manuelle optionnelle v1.2

---

## Références

- **Scénarios de Test**: Voir `quickstart.md` pour 10 scénarios de test détaillés (Scénarios 1-7 pour US1+US2, Scénarios 8-10 pour US3)
- **Modèle de Données**: Voir `data-model.md` pour les définitions AddressInput et `data-model-schedule.md` pour les structures d'horaire
- **Algorithme d'Optimisation**: Voir `data-model-schedule.md` section "Algorithm: Schedule Generation"
- **Décisions Techniques**: Voir `research.md` pour les justifications des approches

---

## Notes

- Les tâches [P] = fichiers différents, pas de dépendances
- Les tâches [Story] = traçabilité de la user story
- Chaque user story doit être complètement indépendante et testable
- Valider les tests du quickstart.md à chaque checkpoint
- Commiter après chaque tâche ou groupe logique
- Arrêter à n'importe quel checkpoint pour valider l'histoire indépendamment
- Éviter: tâches vagues, conflits de fichiers, dépendances qui cassent l'indépendance
- **Important**: US3 dépend des champs de date d'US1+US2, donc impossible de commencer avant qu'ils soient complétés
