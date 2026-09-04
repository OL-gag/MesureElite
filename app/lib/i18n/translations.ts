// Dictionnaires de traduction — fr-CA (défaut) et en.
// Voir specs/004-fr-ca-localization/research.md pour les décisions de conception
// et specs/004-fr-ca-localization/data-model.md pour le contrat du dictionnaire.

export type Locale = 'fr-CA' | 'en'

export const DEFAULT_LOCALE: Locale = 'fr-CA'

export function hasTranslationKey(key: string): boolean {
  return key in translations['fr-CA']
}

// Translates an errorCode when it's present and known; otherwise falls back to
// the raw (English) error text — see spec Edge Case "traduction manquante" and
// data-model.md § Table des codes d'erreur.
export function translateError(
  t: (key: string, params?: Record<string, string | number>) => string,
  errorCode: string | undefined,
  fallback: string | undefined,
  params?: Record<string, string | number>
): string | undefined {
  const key = errorCode ? `errors.${errorCode}` : undefined
  if (key && hasTranslationKey(key)) {
    return t(key, params)
  }
  return fallback
}

export const translations: Record<Locale, Record<string, string>> = {
  'fr-CA': {
    // common
    'common.appName': 'MesureMG',
    'common.tagline': 'Optimisation de trajet',
    'common.footer': '© 2026 MesureMG. Réalisé avec Next.js, Leaflet et OpenStreetMap.',
    'common.languageSwitcher.french': 'Français',
    'common.languageSwitcher.english': 'English',
    'common.languageSwitcher.label': 'Langue',

    // home (app/page.tsx)
    'home.title': 'Trouvez le trajet le plus court',
    'home.subtitle':
      "Entrez une adresse de départ/retour et 2 à 30 arrêts pour obtenir le trajet optimisé. Parfait pour des mesures d'exceptions!",
    'home.cardTitle': '🗺️ Optimisez votre trajet',
    'home.cardIntro': 'Entrez vos adresses ci-dessous pour calculer le trajet le plus court possible.',

    // addressForm (app/components/AddressForm.tsx)
    'addressForm.startLabel': 'Adresse de départ / retour',
    'addressForm.startRequired': '(obligatoire)',
    'addressForm.startPlaceholder': "Entrez l'adresse de départ et de retour...",
    'addressForm.stopsLabel': "Adresses d'arrêt",
    'addressForm.stopPlaceholder': 'Arrêt {index} (ou collez plusieurs adresses, une par ligne)...',
    'addressForm.counter': '{filled}/{max} · {valid} valide(s)',
    'addressForm.counterAmbiguous': ' · {count} ambiguë(s)',
    'addressForm.counterInvalid': ' · {count} invalide(s)',
    'addressForm.addStopButton': '+ Ajouter un arrêt',
    'addressForm.removeStopTitle': "Supprimer l'arrêt",
    'addressForm.maxStopsWarning': 'Maximum {max} adresses d\'arrêt atteint.',
    'addressForm.pasteOverflowWarning':
      'Seules les {max} premières adresses d\'arrêt ont été conservées (la liste collée était plus longue).',
    'addressForm.outlierWarning':
      "⚠ Adresse(s) très éloignée(s) des autres — vérifiez qu'elles sont correctes : {addresses}",
    'addressForm.statusChecking': "🔄 Vérification de l'adresse...",
    'addressForm.statusValid': '✓ Valide',
    'addressForm.statusAmbiguousDefault':
      'Adresse ambiguë — plusieurs correspondances trouvées. Utilisation de la correspondance la plus proche.',
    'addressForm.statusDidYouMean': 'Vouliez-vous dire : {alternatives}?',
    'addressForm.streetTypeCorrected': 'Type de voie corrigé automatiquement — adresse utilisée : {corrected}',
    'addressForm.submitGeocoding': '🔄 Géocodage des adresses...',
    'addressForm.submitCalculating': "⏳ Calcul de l'itinéraire...",
    'addressForm.submitDefault': "🚀 Optimiser l'itinéraire",
    'addressForm.footerHint':
      "Entrez 1 adresse de départ/retour et 2 à 30 adresses d'arrêt. Le système trouvera la boucle la plus courte visitant toutes les adresses.",
    'addressForm.errorStartRequired': "Veuillez entrer l'adresse de départ/retour",
    'addressForm.errorMinStops': 'Veuillez entrer au moins {min} adresses d\'arrêt',
    'addressForm.errorGeocodingFailedGeneric': 'Échec du géocodage',
    'addressForm.errorValidationFailed': 'Échec de la validation',
    'addressForm.errorSubmitFailed': "Échec du géocodage des adresses",

    // measurement dates (US1 & US2)
    'addressForm.measurementDateLabel': 'Date de mesure',
    'addressForm.deadlineDateLabel': 'Date limite',

    // weekly planning JSON import (see app/lib/weeklyImport.ts)
    'addressForm.importToggle': 'Importer une liste (JSON)',
    'addressForm.importHelp':
      "Colle le courriel de planning dans ChatGPT ou Claude avec le prompt ci-dessous, puis colle le résultat JSON ici. Ça remplace la liste d'arrêts actuelle.",
    'addressForm.importCopyPrompt': "📋 Copier le prompt d'extraction",
    'addressForm.importPromptCopied': '✓ Prompt copié!',
    'addressForm.importPromptFallbackHint':
      "Le bouton n'a pas copié automatiquement (fréquent sur mobile)? Touche le texte ci-dessous pour le sélectionner en entier, puis copie-le manuellement.",
    'addressForm.importPlaceholder': "Colle ici le JSON généré par l'assistant IA...",
    'addressForm.importButton': 'Importer',
    'addressForm.importSuccess': '{count} arrêt(s) importé(s).',
    'addressForm.importSkipped': '{count} entrée(s) ignorée(s) (adresse ou date manquante).',
    'addressForm.importInvalidJson':
      'JSON invalide — vérifie que tu as bien collé uniquement le JSON généré par l\'assistant.',
    'addressForm.importEmpty': 'Aucun arrêt trouvé dans ce JSON.',

    // results (app/results/page.tsx)
    'results.loading': 'Chargement...',
    'results.heading': '✅ Itinéraire optimisé',
    'results.editAddressesButton': '← Modifier les adresses',
    'results.totalDistance': 'Distance totale',
    'results.totalDuration': 'Durée totale',
    'results.optimizationGain': 'Gain d\'optimisation',
    'results.optimizationGainSuffix': 'plus court',
    'results.mapHeading': "🗺️ Carte de l'itinéraire",
    'results.itineraryHeading': '🛣️ Itinéraire optimisé',
    'results.startEndBadge': 'Point de départ / retour',
    'results.validatedHeading': '✓ Adresses validées',
    'results.validLabel': 'Valide(s)',
    'results.invalidLabel': 'Invalide(s)',
    'results.calculateNewButton': '🔄 Calculer un nouvel itinéraire',
    'results.printButton': '🖨️ Imprimer les résultats',
    'results.footerInfo':
      "Itinéraire optimisé avec OSRM (Open Source Routing Machine) • Distances calculées par trajet routier",

    // schedule (app/schedule/page.tsx)
    'schedule.title': '📅 Plan de mesure optimisé',
    'schedule.generatedAt': 'Généré à',
    'schedule.totalAddresses': 'Total adresses',
    'schedule.totalDistance': 'Distance totale',
    'schedule.totalDuration': 'Durée totale',
    'schedule.daysScheduled': 'Jours planifiés',
    'schedule.constraints': '📋 Contraintes du plan',
    'schedule.maxStopsPerDay': 'Arrêts max par jour',
    'schedule.upToIfNeeded': '(jusqu\'à {max} si nécessaire)',
    'schedule.workingDays': 'Jours de travail',
    'schedule.priority': 'Priorité',
    'schedule.routeOptimization': 'Optimisation d\'itinéraire',
    'schedule.deadlineFirstGrouping': 'Groupage par date limite',
    'schedule.viaOSRM': 'Via OSRM',
    'schedule.startLabel': 'Départ',
    'schedule.returnLabel': 'Retour au point de départ',
    'schedule.stopsCount': '{count} arrêt(s)',
    'schedule.hideMap': 'Masquer la carte',
    'schedule.showMap': 'Afficher la carte',
    'schedule.daysFilter': 'Journées',
    'schedule.openInGoogleMaps': 'Ouvrir dans Google Maps',
    'schedule.openInAppleMaps': 'Ouvrir dans Apple Plans',
    'schedule.invalidAddressesWarning':
      '{count} adresse(s) introuvable(s) — exclue(s) du plan de mesure. Corrigez-les via « Modifier les adresses » :',
    'schedule.noStops': 'Aucun arrêt pour cette journée',
    'schedule.exceedsMaxStops': 'Cette journée dépasse le maximum de {max} arrêts',

    // map (app/components/RouteMap.tsx)
    'map.startPopupPrefix': '🏁 Départ : ',
    'map.stopPopupPrefix': '📍 Arrêt {sequence} : ',

    // errorBoundary (app/components/ErrorBoundary.tsx)
    'errorBoundary.heading': "Quelque chose s'est mal passé",
    'errorBoundary.genericMessage': 'Une erreur inattendue est survenue',
    'errorBoundary.tryAgain': 'Réessayer ou actualiser la page',

    // errors (errorCode → message, voir contracts/error-codes.md)
    'errors.ADDRESS_NOT_FOUND': 'Adresse introuvable : « {address} ». Veuillez vérifier l\'orthographe.',
    'errors.AMBIGUOUS':
      'Adresse ambiguë : « {address} » correspond à plusieurs lieux distincts. Veuillez préciser la ville.',
    'errors.GEOCODING_FAILED': 'La demande de géocodage a échoué',
    'errors.MISSING_ADDRESSES': 'Tableau d\'adresses manquant ou invalide',
    'errors.EMPTY_ADDRESSES': 'Au moins 1 adresse est requise',
    'errors.TOO_MANY_ADDRESSES': 'Maximum 31 adresses autorisées',
    'errors.INVALID_ADDRESS_FORMAT': 'Chaque adresse doit comporter un identifiant, un texte et un ordre',
    'errors.RATE_LIMITED': 'Service temporairement limité. Veuillez réessayer dans un instant.',
    'errors.SERVICE_UNAVAILABLE': 'Service temporairement indisponible. Veuillez réessayer dans un instant.',
    'errors.MISSING_WAYPOINTS': "Tableau de points de passage manquant ou invalide",
    'errors.TOO_FEW_WAYPOINTS': 'Au moins 2 points de passage sont requis',
    'errors.TOO_MANY_WAYPOINTS': 'Maximum 31 points de passage autorisés',
    'errors.INVALID_WAYPOINT': 'Chaque point de passage doit avoir un identifiant, une latitude et une longitude',
    'errors.INVALID_COORDINATES': 'Coordonnées invalides pour le point de passage : {id}',
    'errors.ROUTING_FAILED': "Le calcul de l'itinéraire a échoué",
    'errors.WAYPOINTS_UNREACHABLE':
      "Une ou plusieurs adresses semblent injoignables en voiture. Vérifiez qu'elles sont bien situées au bon endroit (précisez la ville).",
    'errors.TIMEOUT': "Le calcul de l'itinéraire a expiré. Veuillez réessayer.",
  },
  en: {
    // common
    'common.appName': 'MesureMG',
    'common.tagline': 'Route Optimization',
    'common.footer': '© 2026 MesureMG. Built with Next.js, Leaflet, and OpenStreetMap.',
    'common.languageSwitcher.french': 'Français',
    'common.languageSwitcher.english': 'English',
    'common.languageSwitcher.label': 'Language',

    // home (app/page.tsx)
    'home.title': 'Find the Shortest Route',
    'home.subtitle':
      'Enter a start/return address plus 2-30 stops and get the optimized route. Perfect for deliveries, road trips, or any multi-stop journey.',
    'home.cardTitle': '🗺️ Optimize Your Route',
    'home.cardIntro': 'Enter your addresses below to calculate the shortest possible route.',

    // addressForm (app/components/AddressForm.tsx)
    'addressForm.startLabel': 'Start / Return Address',
    'addressForm.startRequired': '(required)',
    'addressForm.startPlaceholder': "Enter the address you'll start and return to...",
    'addressForm.stopsLabel': 'Stop Addresses',
    'addressForm.stopPlaceholder': 'Stop {index} (or paste multiple addresses, one per line)...',
    'addressForm.counter': '{filled}/{max} · {valid} valid',
    'addressForm.counterAmbiguous': ' · {count} ambiguous',
    'addressForm.counterInvalid': ' · {count} invalid',
    'addressForm.addStopButton': '+ Add Stop',
    'addressForm.removeStopTitle': 'Remove stop',
    'addressForm.maxStopsWarning': 'Maximum {max} stop addresses reached.',
    'addressForm.pasteOverflowWarning': 'Only the first {max} stop addresses were kept (pasted list was longer).',
    'addressForm.outlierWarning': '⚠ Address(es) far from the others — please double-check: {addresses}',
    'addressForm.statusChecking': '🔄 Checking address...',
    'addressForm.statusValid': '✓ Valid',
    'addressForm.statusAmbiguousDefault':
      'Ambiguous address — multiple matches found. Using the closest match.',
    'addressForm.statusDidYouMean': 'Did you mean: {alternatives}?',
    'addressForm.streetTypeCorrected': 'Street type auto-corrected — address used: {corrected}',
    'addressForm.submitGeocoding': '🔄 Geocoding Addresses...',
    'addressForm.submitCalculating': '⏳ Calculating Route...',
    'addressForm.submitDefault': '🚀 Optimize Route',
    'addressForm.footerHint':
      'Enter 1 start/return address and 2-30 stop addresses. The system will find the shortest loop visiting all of them.',
    'addressForm.errorStartRequired': 'Please enter the start/return address',
    'addressForm.errorMinStops': 'Please enter at least {min} stop addresses',
    'addressForm.errorGeocodingFailedGeneric': 'Geocoding failed',
    'addressForm.errorValidationFailed': 'Validation failed',
    'addressForm.errorSubmitFailed': 'Failed to geocode addresses',

    // measurement dates (US1 & US2)
    'addressForm.measurementDateLabel': 'Measurement Date',
    'addressForm.deadlineDateLabel': 'Deadline Date',

    // weekly planning JSON import (see app/lib/weeklyImport.ts)
    'addressForm.importToggle': 'Import a list (JSON)',
    'addressForm.importHelp':
      'Paste the planning email into ChatGPT or Claude along with the prompt below, then paste the resulting JSON here. This replaces the current stop list.',
    'addressForm.importCopyPrompt': '📋 Copy extraction prompt',
    'addressForm.importPromptCopied': '✓ Prompt copied!',
    'addressForm.importPromptFallbackHint':
      "Button didn't copy automatically (common on mobile)? Tap the text below to select it all, then copy it manually.",
    'addressForm.importPlaceholder': 'Paste the JSON generated by the AI assistant here...',
    'addressForm.importButton': 'Import',
    'addressForm.importSuccess': '{count} stop(s) imported.',
    'addressForm.importSkipped': '{count} entries skipped (missing address or date).',
    'addressForm.importInvalidJson': "Invalid JSON — make sure you pasted only the assistant's generated JSON.",
    'addressForm.importEmpty': 'No stops found in this JSON.',

    // results (app/results/page.tsx)
    'results.loading': 'Loading...',
    'results.heading': '✅ Route Optimized',
    'results.editAddressesButton': '← Edit Addresses',
    'results.totalDistance': 'Total Distance',
    'results.totalDuration': 'Total Duration',
    'results.optimizationGain': 'Optimization Gain',
    'results.optimizationGainSuffix': 'shorter',
    'results.mapHeading': '🗺️ Route Map',
    'results.itineraryHeading': '🛣️ Optimized Route',
    'results.startEndBadge': 'Start / End Point',
    'results.validatedHeading': '✓ Addresses Validated',
    'results.validLabel': 'Valid',
    'results.invalidLabel': 'Invalid',
    'results.calculateNewButton': '🔄 Calculate New Route',
    'results.printButton': '🖨️ Print Results',
    'results.footerInfo':
      'Route optimized using OSRM (Open Source Routing Machine) • Distances calculated via car routes',

    // schedule (app/schedule/page.tsx)
    'schedule.title': '📅 Optimized Measurement Schedule',
    'schedule.generatedAt': 'Generated at',
    'schedule.totalAddresses': 'Total Addresses',
    'schedule.totalDistance': 'Total Distance',
    'schedule.totalDuration': 'Total Time',
    'schedule.daysScheduled': 'Days Scheduled',
    'schedule.constraints': '📋 Schedule Constraints',
    'schedule.maxStopsPerDay': 'Max stops per day',
    'schedule.upToIfNeeded': '(up to {max} if needed)',
    'schedule.workingDays': 'Working days',
    'schedule.priority': 'Priority',
    'schedule.routeOptimization': 'Route optimization',
    'schedule.deadlineFirstGrouping': 'Deadline-first grouping',
    'schedule.viaOSRM': 'Via OSRM',
    'schedule.startLabel': 'Start',
    'schedule.returnLabel': 'Return to start',
    'schedule.stopsCount': '{count} stop(s)',
    'schedule.hideMap': 'Hide map',
    'schedule.showMap': 'Show map',
    'schedule.daysFilter': 'Days',
    'schedule.openInGoogleMaps': 'Open in Google Maps',
    'schedule.openInAppleMaps': 'Open in Apple Maps',
    'schedule.invalidAddressesWarning':
      '{count} address(es) not found — excluded from the measurement plan. Fix them via "Edit Addresses":',
    'schedule.noStops': 'No stops for this day',
    'schedule.exceedsMaxStops': 'This day exceeds the maximum of {max} stops',

    // map (app/components/RouteMap.tsx)
    'map.startPopupPrefix': '🏁 Start: ',
    'map.stopPopupPrefix': '📍 Stop {sequence}: ',

    // errorBoundary (app/components/ErrorBoundary.tsx)
    'errorBoundary.heading': 'Something went wrong',
    'errorBoundary.genericMessage': 'An unexpected error occurred',
    'errorBoundary.tryAgain': 'Try again or refresh the page',

    // errors (errorCode → message, see contracts/error-codes.md)
    'errors.ADDRESS_NOT_FOUND': 'Address not found: "{address}". Please check spelling.',
    'errors.AMBIGUOUS': 'Ambiguous address: "{address}" matched multiple distinct places. Please specify the city.',
    'errors.GEOCODING_FAILED': 'Geocoding request failed',
    'errors.MISSING_ADDRESSES': 'Missing or invalid addresses array',
    'errors.EMPTY_ADDRESSES': 'At least 1 address required',
    'errors.TOO_MANY_ADDRESSES': 'Maximum 31 addresses allowed',
    'errors.INVALID_ADDRESS_FORMAT': 'Each address must have id, text, and order',
    'errors.RATE_LIMITED': 'Service temporarily rate-limited. Please try again in a moment.',
    'errors.SERVICE_UNAVAILABLE': 'Service temporarily unavailable. Please try again in a moment.',
    'errors.MISSING_WAYPOINTS': 'Missing or invalid waypoints array',
    'errors.TOO_FEW_WAYPOINTS': 'At least 2 waypoints required',
    'errors.TOO_MANY_WAYPOINTS': 'Maximum 31 waypoints allowed',
    'errors.INVALID_WAYPOINT': 'Each waypoint must have id, lat, and lon',
    'errors.INVALID_COORDINATES': 'Invalid coordinates for waypoint: {id}',
    'errors.ROUTING_FAILED': 'Routing calculation failed',
    'errors.WAYPOINTS_UNREACHABLE':
      'One or more addresses seem unreachable by car. Please check they are in the right place (add the city).',
    'errors.TIMEOUT': 'Routing calculation timed out. Please try again.',
  },
}
