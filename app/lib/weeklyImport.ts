// Weekly planning import (JSON pasted from an AI chat) — see WEEKLY_IMPORT_PROMPT.
// The colleague pastes their weekly planning email into ChatGPT/Claude along
// with this prompt, gets back JSON in this exact shape, and pastes it into
// the address form's import panel.

export interface WeeklyImportStop {
  address: string
  // Earliest allowed day (the day header in the email) — never scheduled before it.
  measurementDate: string
  // measurementDate + up to 3 calendar days, capped at that week's Friday —
  // gives the scheduler room to move the visit later in the same week
  // (e.g. to cluster it with a nearby stop) without ever slipping into the
  // following week. See WEEKLY_IMPORT_PROMPT rule 3.
  deadlineDate: string
  reference: string
}

export interface ParsedWeeklyImport {
  stops: WeeklyImportStop[]
  // Entries dropped because they had no address or no valid measurementDate.
  skipped: number
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

// Throws on malformed JSON (SyntaxError) — callers should catch and show
// addressForm.importInvalidJson.
export function parseWeeklyImportJson(raw: string): ParsedWeeklyImport {
  const data = JSON.parse(raw)
  const rawStops = Array.isArray(data?.stops) ? data.stops : []

  let skipped = 0
  const stops: WeeklyImportStop[] = []

  for (const entry of rawStops) {
    const address = typeof entry?.address === 'string' ? entry.address.trim() : ''
    const measurementDate =
      typeof entry?.measurementDate === 'string' && ISO_DATE_RE.test(entry.measurementDate)
        ? entry.measurementDate
        : ''
    if (!address || !measurementDate) {
      skipped++
      continue
    }
    const deadlineDate =
      typeof entry?.deadlineDate === 'string' && ISO_DATE_RE.test(entry.deadlineDate)
        ? entry.deadlineDate
        : measurementDate
    const reference = typeof entry?.reference === 'string' ? entry.reference.trim() : ''
    stops.push({ address, measurementDate, deadlineDate, reference })
  }

  return { stops, skipped }
}

export const WEEKLY_IMPORT_PROMPT = `Tu es un assistant qui convertit un courriel de planning hebdomadaire de prises de mesure en JSON structuré.

INSTRUCTIONS :
1. Le courriel est divisé par jour de la semaine (LUNDI, MARDI, MERCREDI, JEUDI, VENDREDI, SAMEDI, DIMANCHE). L'objet ou le début du courriel indique la plage de dates de la semaine (ex : « 7 au 11 septembre »). LUNDI correspond à la première date de cette plage, puis ajoute un jour pour chaque jour suivant (MARDI = +1 jour, MERCREDI = +2 jours, etc.).
2. Si l'année n'est pas précisée dans le courriel, utilise l'année en cours. Si la date obtenue avec l'année en cours serait déjà passée de plus de 30 jours, utilise l'année suivante à la place.
3. Pour chaque rendez-vous listé sous un jour, extrais :
   - "address" : l'adresse complète après l'icône 📍, telle quelle (avec ville et code postal si présents)
   - "measurementDate" : la date du jour sous lequel le rendez-vous apparaît, au format AAAA-MM-JJ — c'est la date la PLUS TÔT possible, jamais avant
   - "deadlineDate" : measurementDate + 3 jours calendaires, SAUF si ça dépasse le vendredi de la même semaine — dans ce cas utilise ce vendredi à la place (jamais dans la semaine suivante). Exemples pour une semaine LUNDI-VENDREDI :
     * LUNDI → deadlineDate = JEUDI (même semaine)
     * MARDI → deadlineDate = VENDREDI (même semaine)
     * MERCREDI → deadlineDate = VENDREDI (mercredi + 3 jours = samedi, donc plafonné au vendredi)
     * JEUDI → deadlineDate = VENDREDI (plafonné)
     * VENDREDI → deadlineDate = VENDREDI (déjà au maximum, aucune marge)
   - "reference" : un résumé compact sur une seule ligne, combinant ce qui est présent parmi : numéro de dossier (ex : #13481), nom du client, catégorie (🟨 Particulier / 🟥 Ébénisterie, ou le mot écrit en toutes lettres), pièce, matière, épaisseur, partenaire/entrepreneur, note spéciale, et le numéro de téléphone (précédé de 📞)
4. Ignore les lignes vides, les séparateurs, et la légende des icônes en haut du courriel.
5. Ne produis RIEN d'autre que le JSON ci-dessous — pas de texte avant ou après, pas de balises markdown (\`\`\`) :

{
  "stops": [
    {
      "address": "...",
      "measurementDate": "AAAA-MM-JJ",
      "deadlineDate": "AAAA-MM-JJ",
      "reference": "..."
    }
  ]
}

Voici le courriel à convertir :

[COLLE LE COURRIEL ICI]`
