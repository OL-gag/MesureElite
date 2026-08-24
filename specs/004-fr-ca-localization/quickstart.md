# Quickstart: Validation & Testing Guide — Interface en français canadien par défaut

**Purpose**: Scénarios manuels pour valider la feature de bout en bout après implémentation.

**Prerequisites**: `npm install` puis `npm run dev`, application sur `http://localhost:3000`.

---

## Scénario 1 — Français canadien par défaut (US1, FR-001, FR-009)

1. Ouvrir l'application dans une fenêtre de navigation privée (aucune préférence enregistrée).
2. Configurer le navigateur en anglais avant d'ouvrir la page (pour vérifier FR-009).

**Expected**: Toute l'interface (en-tête, formulaire, boutons, texte d'intro) s'affiche en français canadien, malgré la langue du navigateur.

---

## Scénario 2 — Bascule vers l'anglais sans perte de données (US2, FR-002, FR-003, FR-004)

1. Commencer à saisir une adresse de départ et 2 adresses d'arrêt (sans soumettre).
2. Cliquer sur le sélecteur de langue → "English".

**Expected**: Tout le texte d'interface passe en anglais immédiatement (< 1s, pas de rechargement de page), et les 3 adresses saisies sont toujours présentes dans les champs.

3. Cliquer à nouveau sur le sélecteur → "Français".

**Expected**: L'interface repasse en français canadien, adresses toujours intactes.

---

## Scénario 3 — Persistance durant la session (US3, FR-008)

1. Sélectionner l'anglais.
2. Soumettre un itinéraire valide et naviguer vers la page de résultats.

**Expected**: La page de résultats s'affiche en anglais (titres, boutons "Edit Addresses", "Calculate New Route", etc.), sans devoir rebasculer.

3. Revenir à l'accueil via "← Edit Addresses".

**Expected**: L'accueil reste en anglais.

---

## Scénario 4 — Messages d'erreur traduits (FR-005, FR-006)

1. En français, saisir une adresse invalide (ex: "XYZ Nonexistent Street 999999") comme arrêt et la quitter (blur).

**Expected**: Le message d'erreur inline s'affiche en français canadien (ex: "Adresse introuvable : ...").

2. Basculer vers l'anglais.

**Expected**: Le même message repasse en anglais sans nouvel appel réseau nécessaire (le code d'erreur est déjà connu du client).

3. Saisir une adresse valide géolocalisée par Nominatim (ex: une adresse réelle).

**Expected**: Le nom d'adresse canonique retourné par Nominatim (`displayName`) reste dans sa langue/format d'origine, non traduit — même en anglais (FR-006).

---

## Scénario 5 — Repli si traduction manquante (Edge Case)

1. (Vérification de code) Confirmer qu'aucune clé du dictionnaire `en` ou `fr-CA` n'est absente de l'autre (test automatisé recommandé — voir tasks.md).

**Expected**: En cas de clé manquante malgré tout, l'interface affiche la valeur `fr-CA` de repli plutôt qu'une chaîne vide ou la clé brute.

---

## Scénario 6 — Changement de langue pendant un calcul en cours (Edge Case)

1. Soumettre un itinéraire valide (départ + 2 arrêts) pour déclencher le calcul (état `loading` actif sur `app/page.tsx`, bouton "🔄 Geocoding..." ou "⏳ Calculating...").
2. Pendant que le calcul est en cours, cliquer sur le sélecteur de langue pour basculer vers l'anglais.

**Expected**: Le calcul en cours n'est ni interrompu ni relancé ; l'interface bascule en anglais immédiatement (y compris le texte du bouton de chargement) et la navigation vers la page de résultats se produit normalement à la fin du calcul.

---

## Definition of Done

✅ Les 5 scénarios ci-dessus passent manuellement en local
✅ Aucune régression sur les flux des specs 001/002/003 (calcul d'itinéraire, carte, saisie en masse) dans les deux langues
✅ Aucun changement de comportement pour les consommateurs existants des contrats `/api/geocode` et `/api/route` (champ `errorCode` additif uniquement)
