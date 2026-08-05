/**
 * Feste Begriffe und Ausgangswerte.
 *
 * Bereiche und Aktivitäten sind nur hier voreingestellt – gepflegt werden sie
 * in der App und leben im Zustand (siehe store.js). Reisearten, Jahreszeiten,
 * Regionen und Personen sind fest, weil daran Logik hängt.
 */

/** Bereiche im Ausgangsstand. `ico` ist ein Name aus icons.js. */
export const DEFAULT_BEREICHE = [
  { id: 'kleidung', label: 'Kleidung', ico: 'shirt' },
  { id: 'schuhe', label: 'Schuhe', ico: 'shoe' },
  { id: 'bad', label: 'Bad & Apotheke', ico: 'droplet' },
  { id: 'dokumente', label: 'Dokumente & Geld', ico: 'card' },
  { id: 'technik', label: 'Technik', ico: 'plug' },
  { id: 'velo', label: 'Velo', ico: 'bike' },
  { id: 'ausruestung', label: 'Ausrüstung & Sport', ico: 'backpack' },
  { id: 'kinder', label: 'Kinder & Spielzeug', ico: 'toy' },
  { id: 'kueche', label: 'Küche & Verpflegung', ico: 'pot' },
  { id: 'haushalt', label: 'Haushalt & Wäsche', ico: 'basket' },
  { id: 'camper', label: 'Camper', ico: 'van' },
  { id: 'reisetag', label: 'Reisetag', ico: 'route' },
  { id: 'kontrolle', label: 'Kontrolle vor Abfahrt', ico: 'lock' },
];

/** Aktivitäten im Ausgangsstand. */
export const DEFAULT_AKTIVITAETEN = [
  { id: 'mtb', label: 'MTB' },
  { id: 'gravel', label: 'Gravel' },
  { id: 'wandern', label: 'Wandern' },
  { id: 'badi', label: 'Badi / Bogn' },
  { id: 'ski', label: 'Ski / Schlitteln' },
  { id: 'klettern', label: 'Klettern' },
  { id: 'sport', label: 'Laufen / Fitness' },
  { id: 'spielplatz', label: 'Spielplatz & Sändele' },
  { id: 'fest', label: 'Fest / 1. August' },
  { id: 'ausgehen', label: 'Auswärts essen' },
  { id: 'sightseeing', label: 'Sightseeing' },
  { id: 'fotografie', label: 'Fotografieren' },
  { id: 'arbeiten', label: 'Arbeiten' },
  { id: 'wellness', label: 'Wellness & Spa' },
];

/** Art der Reise. Fest, weil Region und Waschmaschine daran hängen. */
export const ARTEN = [
  { id: 'basislager', label: 'Basislager 4.0', sub: 'Wohnmobil', icon: '🚐' },
  { id: 'lenz', label: 'Lenz', sub: 'Wohnung', icon: '🏔️' },
  { id: 'hotel', label: 'Hotel', sub: 'auswärts', icon: '🏨' },
];

/** In Lenz ist alles Wichtige vor Ort – deshalb entfällt einiges. */
export const ARTEN_MIT_REGION = ['basislager', 'hotel'];
export const ART_MIT_WASCHMASCHINE = ['lenz'];

export const JAHRESZEITEN = [
  { id: 'fruehling', label: 'Frühling' },
  { id: 'sommer', label: 'Sommer' },
  { id: 'herbst', label: 'Herbst' },
  { id: 'winter', label: 'Winter' },
];

export const REGIONEN = [
  { id: 'inland', label: 'Schweiz' },
  { id: 'schengen', label: 'Schengen' },
  { id: 'europa', label: 'Europa, ohne Schengen' },
  { id: 'fern', label: 'Fernreise' },
];

/** Feste Besetzung. */
export const PERSONEN = [
  { id: 'p1', name: 'Christoph', role: 'erwachsen' },
  { id: 'p2', name: 'Debora', role: 'erwachsen' },
  { id: 'p3', name: 'Laurin', role: 'kind' },
  { id: 'p4', name: 'Noemi', role: 'baby' },
];

export const ALLE_PERSONEN = PERSONEN.map((p) => p.id);
export const ERWACHSENE = PERSONEN.filter((p) => p.role === 'erwachsen').map((p) => p.id);
export const KINDER = PERSONEN.filter((p) => p.role !== 'erwachsen').map((p) => p.id);

/** Kein Eintrag in `wer` heisst: ein gemeinsamer Eintrag für alle. */
export const SHARED = 'gemeinsam';

/** Übersetzung der früheren Sammelbegriffe auf konkrete Personen. */
export const WER_AUS_WHO = {
  gemeinsam: [],
  alle: ALLE_PERSONEN,
  erwachsene: ERWACHSENE,
  kinder: KINDER,
};

export const byId = (list, id) => list.find((o) => o.id === id);
export const labelOf = (list, id) => byId(list, id)?.label ?? id;
export const personName = (id) => (id === SHARED ? 'Gemeinsam' : byId(PERSONEN, id)?.name ?? id);
