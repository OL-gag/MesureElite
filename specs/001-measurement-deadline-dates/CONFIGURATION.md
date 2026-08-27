# Configuration: Planificateur d'Horaire MesureMG

**Date**: 2026-08-27  
**Version**: Final (après clarifications utilisateur)

## Paramètres de Planification Confirmés

### Groupage des Adresses par Jour

```typescript
Algorithm: Intelligent Deadline-Aware Grouping

Pour chaque adresse (triées par urgence de deadline):
  1. Jour préféré = measurementDate (ce que l'utilisateur préfère)
  2. Jour limite = deadlineDate - 1 jour (doit être fini avant la deadline)
  
  3. Assignation intelligente:
     - Si la deadline < date de mesure préférée:
       → Déplacer plus tôt (respecter la deadline)
     - Sinon:
       → Essayer d'assigner au jour préféré
       → Si plein (6 stops): essayer le jour d'avant
       → Continuer jusqu'à trouver une place avec capacité OU atteindre la limite
  
  4. Respecter les contraintes:
     - Max 6 stops par jour (FIXE)
     - Sauter samedi & dimanche
     - Aucune adresse après sa deadline
```

### Contraintes de Travail

| Paramètre | Valeur | Notes |
|-----------|--------|-------|
| **Max stops/jour** | 6 | Standard MesureMG (travail de mesure) |
| **Jours de travail** | Lun-Ven | Samedi & dimanche = repos |
| **Horaire de travail** | Aucun (v1) | Future: créneau 9-17 si besoin |
| **Priorité algo** | Deadline d'abord | Respecter les deadlines > minimiser distance |
| **Optimisation** | Multi-critères | Balance: deadlines + distance géographique |

### Optimisation d'Itinéraire

```
Pour CHAQUE jour:
  1. Récupérer les 6 adresses assignées
  2. Appeler OSRM (existing API)
  3. Obtenir l'ordre optimal minimisant la distance
  4. Afficher: route ordonnée + km total + durée estimée
```

### Cas Spéciaux Gérés

| Scénario | Comportement |
|----------|--------------|
| **Deadline aujourd'hui** | Scheduled today if space, else next available |
| **Deadline demain** | Scheduled today or demain (prioritaire) |
| **Adresse en retard** | Assigned to earliest available slot, marked 🔴 URGENT |
| **Capacité dépassée** | Split across multiple days intelligemment |
| **Samedi/Dimanche** | Skipped automatiquement |
| **Même jour + même deadline** | Grouped together dans l'itinéraire optimisé |

## Réassignation Manuelle

**Status**: Deferred to v1.2 (not in v1)

Quand implémenté:
- Permettre drag-and-drop ou bouton "Move to day X"
- Re-optimiser automatiquement les routes des 2 jours affectés
- Validation: pas de dépassement de deadline après move

## Exemple: Génération d'Horaire

### Input
```
Jour actuel: 27 août 2026 (mercredi)

Adresses (triées par deadline):
1. 100 Main St - Mesure: 28 août, Deadline: 28 août (demain ⚠️)
2. 200 Oak Ave - Mesure: 30 août, Deadline: 31 août
3. 300 Elm St - Mesure: 27 août, Deadline: 29 août (aujourd'hui ✓)
4. 400 Pine Rd - Mesure: 27 août, Deadline: 27 août (aujourd'hui ✓ URGENT)
5. 500 Maple Dr - Mesure: 29 août, Deadline: 30 août
6. 600 Cedar Ln - Mesure: 27 août, Deadline: 28 août
7. 700 Birch Way - Mesure: 3 septembre, Deadline: 5 septembre
8. 800 Spruce Ct - Mesure: 2 septembre, Deadline: 4 septembre
```

### Allocation

```
MERCREDI 27 AOÛT (aujourd'hui)
├─ Stop 1: 400 Pine Rd (Deadline: 27 août - URGENT 🔴)
├─ Stop 2: 300 Elm St (Deadline: 29 août)
├─ Stop 3: 100 Main St (Deadline: 28 août - moved earlier!)
├─ Stop 4: 600 Cedar Ln (Deadline: 28 août - moved earlier!)
├─ Stop 5: 200 Oak Ave (peut attendre, deadline 31 août)
├─ Stop 6: 500 Maple Dr (peut attendre, deadline 30 août)
   Route OSRM: 35 km | 2h30 de trajet

VENDREDI 29 AOÛT
├─ Stop 1: 800 Spruce Ct (Deadline: 4 septembre)
├─ Stop 2: 700 Birch Way (Deadline: 5 septembre)
├─ Stop 3: ... (autres adresses si présentes)
   Route OSRM: 22 km | 1h45 de trajet
```

### Logique Appliquée

✅ Aucune adresse après sa deadline  
✅ Max 6 stops/jour respecté  
✅ Samedis & dimanches skippés  
✅ Deadlines urgentes (28 août) priorisées → amenées au 27 août  
✅ Adresses sans urgence → repoussées pour remplir les trous  
✅ Chaque jour: itinéraire géo-optimisé (OSRM)

## Visualisation pour l'Utilisateur

Pour chaque jour planifié, afficher:

```
📅 MERCREDI 27 AOÛT (Aujourd'hui)

🔴 URGENT - 2 adresses critiques!
├─ 🏁 Stop 1: 400 Pine Rd (Deadline: AUJOURD'HUI! - 2.1 km du départ)
├─ 🟡 Stop 2: 300 Elm St (Deadline demain - 1.8 km)
├─ 🟡 Stop 3: 100 Main St (Deadline demain - 0.9 km)

🟡 À VENIR - 3 adresses flexibles
├─ Stop 4: 600 Cedar Ln (Deadline demain - 3.2 km)
├─ Stop 5: 200 Oak Ave (Deadline 31 août - 2.4 km)
├─ Stop 6: 500 Maple Dr (Deadline 30 août - 1.1 km)

📊 RÉSUMÉ JOURNÉE
  Total: 35.5 km | 2h30 de trajet | 6 arrêts
  🟢 Réalisable ✓
  ⚠️ 2 deadlines urgentes (faites aujourd'hui!)
```

## Implémentation Priorité

1. **V1.0 MVP** = US1 + US2 (champs de dates)
2. **V1.1** = + US3 Phase 1 (génération d'horaire)
   - Algorithme de groupage intelligent
   - Optimisation OSRM par jour
   - Affichage multi-jour
3. **V1.2** = + Réassignation manuelle
   - Drag-and-drop entre jours
   - Re-optimisation automatique

## Notes d'Implémentation

- **ScheduleConstraints** hardcodés: maxStopsPerDay = 6, workingDays = [1,2,3,4,5]
- **Future enhancement**: Permettre à l'utilisateur d'ajuster maxStopsPerDay (8? 10?)
- **Future enhancement**: Ajouter préférences d'horaire (9-17? Flexible?)
- **Pas de géolocalisation en temps réel** (v1)
- **Pas de persistance backend** (dates + horaire en mémoire)
- **Pas de notifications** (v1)

---

**Status**: ✅ Configuration finalisée et approuvée  
**Ready to**: Commencer implémentation Phase 1 (Setup) ou Phase 3 (US1)
