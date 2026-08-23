# Quickstart: Validation & Testing Guide — Saisie facile et validation de multiples adresses

**Purpose**: Scénarios manuels pour valider la feature de bout en bout après implémentation.

**Prerequisites**:
- `npm install` puis `npm run dev` (voir `specs/001-shortest-route-addresses/quickstart.md` pour la config `.env.local` — inchangée, réutilisée telle quelle)
- Application accessible sur `http://localhost:3000`

---

## Scénario 1 — Champ isolé départ/retour (FR-001a, clarifications session 2026-08-23)

1. Ouvrir la page d'accueil.
2. Vérifier qu'un champ "Adresse de départ / retour" est affiché **séparément** de la liste des arrêts (section propre, sans bouton "✕" de suppression).
3. Saisir une adresse valide dans ce champ, la quitter (blur).

**Expected**: Validation déclenchée automatiquement, ✓ affiché sous le champ en moins de 1s (SC-004). Le compteur d'arrêts (0/20) n'inclut pas ce champ.

---

## Scénario 2 — Saisie de 15 arrêts en < 2 minutes (US1, SC-001)

1. Dans la zone "arrêts", saisir ou coller 15 adresses différentes (une par ligne si collées).

**Expected**: Les 15 adresses apparaissent en 15 lignes distinctes (collage multiligne auto-parsé, Edge Case résolu), lignes vides ignorées (FR-007), compteur affiche "15/20".

---

## Scénario 3 — Erreurs signalées sans bloquer les autres (US2, FR-003)

1. Départ : adresse valide.
2. Arrêts : 8 adresses valides + 2 invalides (ex: "XYZ Nonexistent Street, ZZ").

**Expected**: Chaque ligne invalide affiche inline "Adresse non trouvée : [adresse]" (pas d'`alert()` bloquant), les 8 valides restent utilisables, compteur "8 valides / 2 invalides" (FR-008) mis à jour en temps réel. Chronométrer l'apparition du statut après le blur : doit être **< 1 seconde** (SC-004).

---

## Scénario 4 — Adresse ambiguë (US2, FR-004)

1. Ajouter un arrêt "Boulevard Paris" (sans ville).

**Expected**: Ligne marquée ⚠ ambiguë, message invite à préciser la ville, alternatives proposées (ex: "Boulevard Paris, Lyon" / "Boulevard Paris, Paris") — voir research.md Décision 5.

---

## Scénario 5 — Correction sans tout ressaisir (US2 #3, US3)

1. Depuis le scénario 3, corriger la 2e adresse invalide.

**Expected**: Seule cette ligne revalidée (blur), les autres lignes/statuts restent inchangés.

---

## Scénario 6 — Modifier/supprimer un arrêt (US3)

1. Liste de 10 arrêts valides. Supprimer le 5e.

**Expected**: Liste se réorganise, les 9 autres restent intacts (aucun re-géocodage inutile des lignes non modifiées). La mise à jour de l'UI doit apparaître en **< 100ms, sans rechargement de page** (SC-006).

2. Modifier le texte du champ départ/retour.

**Expected**: Revalidation de ce champ uniquement ; pas de bouton supprimer disponible dessus (clarification session 2026-08-23).

---

## Scénario 7 — Limite 20 arrêts + 1 départ (FR-001a, Edge Case)

1. Remplir 20 arrêts valides, tenter d'en ajouter un 21e (ou coller un bloc de 21 lignes).

**Expected**: Le 21e est refusé avec avertissement clair ; le départ reste séparé et ne compte pas dans ce plafond (total réel possible : 21 adresses).

---

## Scénario 8 — Minimum pour lancer le calcul (FR-005, FR-009)

1. Départ valide + 1 seul arrêt valide → bouton "Calculer" désactivé.
2. Ajouter un 2e arrêt valide → bouton activé (minimum 3 adresses valides au total : 1 départ + 2 arrêts).

---

## Definition of Done

✅ Les 8 scénarios ci-dessus passent manuellement en local
✅ Aucun `alert()` utilisé pour signaler une erreur de géocodage (remplacé par affichage inline)
✅ Aucune régression sur le flux spec 001 (route calculée normalement une fois les adresses valides)
✅ Aucun changement requis côté `/api/geocode` ou `/api/route` (contrats spec 001 intacts)
