/**
 * Zustandsverwaltung.
 *
 * Aufbau:
 *   master      die gepflegte Stammliste (global, eine pro Haushalt)
 *   trips       die Reisen; jede trägt eine Kopie der Stammliste in sich
 *   householdId Code, unter dem Stammliste und Reiseverzeichnis synchronisiert
 *               werden
 *
 * Jeder Eintrag trägt `updatedAt`. Damit lassen sich zwei Geräte pro Eintrag
 * zusammenführen, statt dass einer den anderen komplett überschreibt.
 */

import {
  PERSONEN,
  DEFAULT_BEREICHE,
  DEFAULT_AKTIVITAETEN,
  WER_AUS_WHO,
} from './model.js';
import { seedMaster, teilObjekt } from './seed.js';

const LS_KEY = 'packliste.state.v3';
const LS_ALT = 'packliste.state.v2';
const LS_CONFIG = 'packliste.sync.v1';
/*
 * Die Haushalts-ID liegt zusätzlich für sich allein.
 *
 * Sie ist der einzige Wert, ohne den sich das Gerät nicht wieder anbinden lässt.
 * Steckte sie nur im grossen Zustand, würde ein einziger unlesbarer Datensatz
 * still einen neuen, leeren Haushalt erzeugen – die Daten auf dem Server wären
 * noch da, aber unerreichbar.
 */
const LS_HAUSHALT = 'packliste.haushalt.v1';
/** Ein unlesbarer Zustand wird hierhin beiseitegelegt, statt überschrieben zu werden. */
const LS_DEFEKT = 'packliste.state.v3.defekt';

/**
 * Zeitquelle für alle Zeitstempel.
 *
 * Sämtliche Konfliktentscheide beruhen auf der Uhr des Geräts. Geht eine davon
 * nach – oder springt sie beim Zeitzonenwechsel zurück –, verliert das Gerät
 * jeden Vergleich, dauerhaft und unbemerkt. Der Versatz gegenüber der zuletzt
 * gesehenen fremden Zeit wird deshalb mitgeführt, und die eigene Zeit läuft
 * nie rückwärts.
 */
let versatz = 0;
export function jetzt() {
  return Date.now() + versatz;
}

/** Einen fremden Zeitstempel als Hinweis auf die tatsächliche Zeit nehmen. */
export function beachteFremdeZeit(ts) {
  if (typeof ts !== 'number' || !Number.isFinite(ts)) return;
  const abstand = ts - jetzt();
  // Nur vorwärts nachziehen, und nur bei deutlicher Abweichung.
  if (abstand > 5000) versatz += abstand;
}

export function randomId(len = 20) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

export const DEFAULT_PARAMS = () => ({
  art: 'basislager',
  naechte: 3,
  jahreszeit: 'sommer',
  region: 'inland',
  aktivitaeten: [],
  mit: PERSONEN.map((p) => p.id),
  waschmaschine: false,
});

/** Liste mit Reihenfolge in eine Sammlung mit Zeitstempeln überführen. */
function alsSammlung(list, now) {
  const out = {};
  list.forEach((e, idx) => {
    out[e.id] = { ...e, order: idx, deleted: false, updatedAt: now };
  });
  return out;
}

function emptyState() {
  const now = jetzt();
  return {
    version: 3,
    householdId: randomId(),
    bereiche: alsSammlung(DEFAULT_BEREICHE, now),
    bereicheUpdatedAt: now,
    aktivitaeten: alsSammlung(DEFAULT_AKTIVITAETEN, now),
    aktivitaetenUpdatedAt: now,
    master: seedMaster(now),
    masterUpdatedAt: now,
    trips: {},
    // Gelöschte Reisen als Grabstein, damit sie nirgends wieder auftauchen.
    geloescht: {},
    geloeschtUpdatedAt: now,
    activeTripId: null,
  };
}

export const state = {
  data: emptyState(),
  config: { url: '', key: '' },
  listeners: new Set(),
  statusListeners: new Set(),
  syncStatus: { mode: 'local', text: 'Nur auf diesem Gerät', error: null },
  /** Gesetzt, wenn Lesen oder Schreiben scheitert – die Oberfläche zeigt es an. */
  speicherFehler: null,
};

export function subscribe(fn) {
  state.listeners.add(fn);
  return () => state.listeners.delete(fn);
}

export function emit() {
  for (const fn of state.listeners) fn();
}

/*
 * Statusmeldungen haben einen eigenen Kanal.
 *
 * Vorher lief der Sync-Status über `emit()` wie eine Datenänderung. Der einzige
 * Zuhörer zeichnete daraufhin nicht nur neu, sondern stiess auch einen Upload
 * an – der ohne Verbindung scheiterte, wieder den Status setzte und damit die
 * nächste Runde auslöste. Offline lief die App so dauerhaft im Kreis.
 */
export function subscribeStatus(fn) {
  state.statusListeners.add(fn);
  return () => state.statusListeners.delete(fn);
}

export function emitStatus() {
  for (const fn of state.statusListeners) fn();
}

/** Ein Problem, das der Nutzer sehen muss, statt es nur in der Konsole zu haben. */
export function setzeSpeicherFehler(art, text) {
  state.speicherFehler = art ? { art, text } : null;
  emitStatus();
}

/**
 * Alten Stand auf die aktuelle Form bringen:
 * `who` wird zu `wer`, Teile werden zu Objekten mit Menge, und Bereiche und
 * Aktivitäten bekommen ihre eigene Sammlung.
 */
function migriere(daten) {
  const now = jetzt();
  const eintrag = (m) => ({
    ...m,
    wer: Array.isArray(m.wer) ? m.wer : m.who ? WER_AUS_WHO[m.who] ?? [m.who] : [],
    teile: (m.teile ?? []).map(teilObjekt),
  });
  const stamm = (sammlung) =>
    Object.fromEntries(Object.entries(sammlung ?? {}).map(([id, m]) => [id, eintrag(m)]));

  const d = { ...daten };
  if (!d.bereiche || !Object.keys(d.bereiche).length) {
    d.bereiche = alsSammlung(DEFAULT_BEREICHE, now);
    d.bereicheUpdatedAt = now;
  }
  if (!d.aktivitaeten || !Object.keys(d.aktivitaeten).length) {
    d.aktivitaeten = alsSammlung(DEFAULT_AKTIVITAETEN, now);
    d.aktivitaetenUpdatedAt = now;
  }
  d.master = stamm(d.master);
  d.trips = Object.fromEntries(
    Object.entries(d.trips ?? {}).map(([id, t]) => [
      id,
      {
        ...t,
        master: stamm(t.master),
        // Frühere Grabsteine verworfener Einträge waren blosse Zeitstempel.
        dismissed: Object.fromEntries(
          Object.entries(t.dismissed ?? {}).map(([k, v]) => [
            k,
            typeof v === 'number' ? { weg: true, ts: v } : v,
          ])
        ),
      },
    ])
  );
  if (!d.geloescht) {
    d.geloescht = {};
    d.geloeschtUpdatedAt = now;
  } else {
    // Frühere Grabsteine waren blosse Zeitstempel; jetzt tragen sie zusätzlich,
    // ob gelöscht oder wiederhergestellt.
    d.geloescht = Object.fromEntries(
      Object.entries(d.geloescht).map(([id, e]) => [
        id,
        typeof e === 'number' ? { weg: true, ts: e } : e,
      ])
    );
  }
  d.version = 3;
  return d;
}

export function load() {
  // Zuerst die Haushalts-ID: sie muss auch einen unlesbaren Zustand überleben.
  let haushalt = null;
  try {
    haushalt = localStorage.getItem(LS_HAUSHALT);
  } catch {
    /* Ablage nicht lesbar – dann eben ohne */
  }
  if (haushalt) state.data.householdId = haushalt;

  let raw = null;
  try {
    raw = localStorage.getItem(LS_KEY) ?? localStorage.getItem(LS_ALT);
    if (raw) {
      state.data = migriere({ ...emptyState(), ...JSON.parse(raw) });
      if (haushalt) state.data.householdId = haushalt;
      // Eine leere Stammliste wäre eine Sackgasse – dann neu aussäen.
      if (!Object.keys(state.data.master).length) {
        state.data.master = seedMaster();
        state.data.masterUpdatedAt = jetzt();
      }
    }
  } catch (err) {
    /*
     * Den unlesbaren Text beiseitelegen, bevor irgendetwas ihn überschreibt –
     * er ist womöglich das Einzige, was von den Daten noch übrig ist.
     */
    try {
      if (raw && !localStorage.getItem(LS_DEFEKT)) localStorage.setItem(LS_DEFEKT, raw);
    } catch {
      /* kein Platz für die Sicherung – dann wenigstens melden */
    }
    state.speicherFehler = {
      art: 'lesen',
      text: 'Der gespeicherte Stand war unlesbar und wurde beiseitegelegt.',
    };
    console.warn('Gespeicherter Zustand konnte nicht gelesen werden', err);
  }
  try {
    const raw = localStorage.getItem(LS_CONFIG);
    if (raw) state.config = { ...state.config, ...JSON.parse(raw) };
  } catch (err) {
    console.warn('Sync-Konfiguration konnte nicht gelesen werden', err);
  }
  return state.data;
}

let saveTimer = null;
export function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(schreibe, 120);
}

/**
 * Tatsächlich schreiben – und ein Scheitern nach aussen melden.
 *
 * Vorher blieb ein volles Speicherkontingent eine Konsolenwarnung: die App
 * wirkte weiter, als sei alles gesichert, und beim nächsten Start war die
 * ganze Packsitzung weg. Nach einem Fehlschlag wird ausserdem der alte
 * Zustandsschlüssel `.v2` freigegeben, der seit der Migration nur Platz belegt.
 */
export function schreibe() {
  try {
    localStorage.setItem(LS_HAUSHALT, state.data.householdId);
    localStorage.setItem(LS_KEY, JSON.stringify(state.data));
    if (state.speicherFehler?.art === 'schreiben') setzeSpeicherFehler(null);
    return true;
  } catch (err) {
    try {
      if (localStorage.getItem(LS_ALT)) {
        localStorage.removeItem(LS_ALT);
        localStorage.setItem(LS_KEY, JSON.stringify(state.data));
        setzeSpeicherFehler(null);
        return true;
      }
    } catch {
      /* auch der zweite Versuch scheitert – unten melden */
    }
    setzeSpeicherFehler(
      'schreiben',
      'Der Speicher ist voll. Änderungen werden gerade nicht gesichert – archivierte Reisen löschen schafft Platz.'
    );
    console.warn('Speichern fehlgeschlagen', err);
    return false;
  }
}

export function saveConfig(config) {
  state.config = { ...state.config, ...config };
  localStorage.setItem(LS_CONFIG, JSON.stringify(state.config));
}

// ---------------------------------------------------------------------------
// Reisen
// ---------------------------------------------------------------------------

export function activeTrip() {
  return state.data.trips[state.data.activeTripId] ?? null;
}

export function setActiveTrip(id) {
  state.data.activeTripId = id;
  persist();
  emit();
}

/** Neue Reise mit einer Kopie des aktuellen Stammlisten-Stands. */
export function createTrip({ name, params }) {
  const now = jetzt();
  const trip = {
    id: randomId(),
    name: name || 'Reise',
    params: { ...DEFAULT_PARAMS(), ...params },
    paramsUpdatedAt: now,
    master: JSON.parse(JSON.stringify(state.data.master)),
    masterCopiedAt: state.data.masterUpdatedAt,
    items: {},
    dismissed: {},
    archived: false,
    createdAt: now,
  };
  state.data.trips[trip.id] = trip;
  return trip;
}

/**
 * Reise löschen.
 *
 * Es genügt nicht, sie lokal zu entfernen: das andere Gerät hätte sie noch
 * und würde sie beim nächsten Abgleich wieder eintragen. Darum bleibt ein
 * Grabstein zurück, der selbst synchronisiert wird.
 */
export function deleteTrip(id) {
  const now = jetzt();
  delete state.data.trips[id];
  state.data.geloescht[id] = { weg: true, ts: now };
  state.data.geloeschtUpdatedAt = now;
  if (state.data.activeTripId === id) state.data.activeTripId = null;
  persist();
  emit();
}

/**
 * Löschen zurücknehmen.
 *
 * Der Grabstein wird nicht entfernt, sondern mit jüngerem Zeitstempel auf
 * „doch nicht gelöscht" gesetzt. Nur so erfährt das andere Gerät davon – ein
 * verschwundener Grabstein wäre für die Gegenseite nicht von einem
 * unbekannten zu unterscheiden.
 */
export function undoDeleteTrip(kopie) {
  if (!kopie?.id) return;
  const now = jetzt();
  state.data.trips[kopie.id] = JSON.parse(JSON.stringify(kopie));
  state.data.geloescht[kopie.id] = { weg: false, ts: now };
  state.data.geloeschtUpdatedAt = now;
  persist();
  emit();
}

/** Wurde diese Reise gelöscht? */
export const istGeloescht = (id) => state.data.geloescht?.[id]?.weg === true;

/** Reisen entfernen, für die ein gültiger Grabstein vorliegt. */
/**
 * Was der Grabstein sagt, wird angewandt – aber nicht blind.
 *
 * Hat das andere Gerät die Reise gelöscht, während hier noch abgehakt wurde,
 * verschwand sie vorher ohne ein Wort, und die geöffnete Ansicht fiel auf
 * „Keine Reise geöffnet." zurück. Ist die eigene Arbeit jünger als die
 * Löschung, bleibt die Reise stehen und die Löschung wird zurückgenommen –
 * eine wiederhergestellte Reise ist leichter erneut zu löschen als eine
 * verlorene wiederherzustellen.
 */
function grabsteineAnwenden() {
  const zurueck = [];
  for (const [id, eintrag] of Object.entries(state.data.geloescht ?? {})) {
    if (!eintrag?.weg) continue;
    const trip = state.data.trips[id];
    if (!trip) continue;
    if (juengsteAenderung(trip) > (eintrag.ts ?? 0)) {
      zurueck.push(id);
      continue;
    }
    delete state.data.trips[id];
    if (state.data.activeTripId === id) state.data.activeTripId = null;
  }
  if (zurueck.length) {
    const now = jetzt();
    for (const id of zurueck) state.data.geloescht[id] = { weg: false, ts: now };
    state.data.geloeschtUpdatedAt = now;
  }
  return zurueck;
}

/** Wann wurde an dieser Reise zuletzt etwas getan? */
function juengsteAenderung(trip) {
  let max = Math.max(trip.paramsUpdatedAt ?? 0, trip.nameUpdatedAt ?? 0, trip.archivedUpdatedAt ?? 0);
  for (const it of Object.values(trip.items ?? {})) max = Math.max(max, it.updatedAt ?? 0);
  return max;
}

/**
 * Name oder Archivstatus ändern.
 *
 * Jedes Feld bekommt seinen eigenen Zeitstempel, damit der Abgleich es einzeln
 * entscheiden kann – ein gemeinsamer Stempel liess Umbenennen und Archivieren
 * einander überschreiben.
 */
export function setTripMeta(tripId, patch) {
  const trip = state.data.trips[tripId];
  if (!trip) return;
  const now = jetzt();
  Object.assign(trip, patch);
  if ('name' in patch) trip.nameUpdatedAt = now;
  if ('archived' in patch) trip.archivedUpdatedAt = now;
  trip.paramsUpdatedAt = now;
  persist();
  emit();
}

export function setParams(tripId, patch) {
  const trip = state.data.trips[tripId];
  if (!trip) return;
  trip.params = { ...trip.params, ...patch };
  trip.paramsUpdatedAt = jetzt();
  persist();
  emit();
}

/** Stammlisten-Stand der Reise auf den aktuellen Stand bringen. */
export function refreshTripMaster(tripId) {
  const trip = state.data.trips[tripId];
  if (!trip) return;
  trip.master = JSON.parse(JSON.stringify(state.data.master));
  trip.masterCopiedAt = state.data.masterUpdatedAt;
  trip.paramsUpdatedAt = jetzt();
  persist();
}

export function tripMasterVeraltet(trip) {
  return (trip?.masterCopiedAt ?? 0) < (state.data.masterUpdatedAt ?? 0);
}

// ---------------------------------------------------------------------------
// Einträge einer Reise
// ---------------------------------------------------------------------------

export function patchItem(tripId, itemId, patch) {
  const trip = state.data.trips[tripId];
  if (!trip?.items[itemId]) return;
  trip.items[itemId] = { ...trip.items[itemId], ...patch, updatedAt: jetzt() };
  persist();
  emit();
}

export function addManualItem(tripId, { label, category, qty = 1, assignee = 'gemeinsam' }) {
  const trip = state.data.trips[tripId];
  if (!trip) return null;
  const id = `man:${randomId(10)}`;
  trip.items[id] = {
    id,
    label,
    category,
    qty,
    assignee,
    packed: false,
    deleted: false,
    note: '',
    source: 'manual',
    updatedAt: jetzt(),
  };
  persist();
  emit();
  return id;
}

export function removeItem(tripId, itemId) {
  const trip = state.data.trips[tripId];
  const item = trip?.items[itemId];
  if (!item) return;
  const now = jetzt();
  trip.items[itemId] = { ...item, deleted: true, updatedAt: now };
  if (item.source === 'auto') trip.dismissed[itemId] = { weg: true, ts: now };
  persist();
  emit();
}

/** Löschen einer Reisezeile zurücknehmen – für „Widerrufen" nach dem Wischen. */
export function undoRemoveItem(tripId, itemIds) {
  const trip = state.data.trips[tripId];
  if (!trip) return;
  const now = jetzt();
  for (const id of [].concat(itemIds)) {
    const item = trip.items[id];
    if (!item) continue;
    trip.items[id] = { ...item, deleted: false, updatedAt: now };
    /*
     * Nicht löschen, sondern zurücknehmen.
     *
     * Ein entfernter Eintrag hinterliess bisher nur einen Zeitstempel, und
     * beim Zusammenführen gewann immer der grössere. Ein Widerruf verschwand
     * damit beim nächsten Abgleich wieder, und der Eintrag blieb zwar sichtbar,
     * wurde aber von jeder Neuberechnung übersprungen – Menge und Name froren
     * ein. Der Grabstein trägt jetzt, wie bei den Reisen, auch die Richtung.
     */
    trip.dismissed[id] = { weg: false, ts: now };
  }
  persist();
  emit();
}

export function restoreDismissed(tripId) {
  const trip = state.data.trips[tripId];
  if (!trip) return;
  const now = jetzt();
  for (const id of Object.keys(trip.dismissed ?? {})) trip.dismissed[id] = { weg: false, ts: now };
  persist();
}

/** Ist dieser Eintrag aus der Reise geworfen worden? */
export const istVerworfen = (dismissed, id) => dismissed?.[id]?.weg === true;

// ---------------------------------------------------------------------------
// Bereiche und Aktivitäten
// ---------------------------------------------------------------------------

/*
 * `label` wird notfalls aus der ID abgeleitet.
 *
 * Ein einziger Eintrag ohne Bezeichnung hat vorher `bereiche()` geworfen – und
 * damit sowohl die Ansicht als auch den Tabellen-Export, also ausgerechnet den
 * Weg, über den man die Daten hätte retten können.
 */
export const beschriftung = (e) => (typeof e?.label === 'string' && e.label ? e.label : String(e?.id ?? ''));

const sortiert = (sammlung) =>
  Object.values(sammlung ?? {})
    .filter((e) => e && !e.deleted)
    .sort(
      (a, b) =>
        (a.order ?? 0) - (b.order ?? 0) ||
        beschriftung(a).localeCompare(beschriftung(b), 'de')
    );

export const bereiche = () => sortiert(state.data.bereiche);
export const aktivitaeten = () => sortiert(state.data.aktivitaeten);
export const bereichVon = (id) =>
  state.data.bereiche?.[id] ?? { id, label: id, ico: 'doc' };

function naechsteOrder(sammlung) {
  return Object.values(sammlung ?? {}).reduce((m, e) => Math.max(m, (e.order ?? 0) + 1), 0);
}

export function addBereich({ label, ico = 'doc' }) {
  const id = `b:${randomId(8)}`;
  state.data.bereiche[id] = {
    id,
    label,
    ico,
    order: naechsteOrder(state.data.bereiche),
    deleted: false,
    updatedAt: jetzt(),
  };
  state.data.bereicheUpdatedAt = jetzt();
  persist();
  emit();
  return id;
}

export function patchBereich(id, patch) {
  const cur = state.data.bereiche[id];
  if (!cur) return;
  state.data.bereiche[id] = { ...cur, ...patch, updatedAt: jetzt() };
  state.data.bereicheUpdatedAt = jetzt();
  persist();
  emit();
}

/** Wie viele Stammlisten-Einträge hängen an diesem Bereich? */
export function bereichBelegung(id) {
  return Object.values(state.data.master).filter((m) => !m.deleted && m.category === id).length;
}

/**
 * Bereich löschen. Einträge dürfen nicht heimatlos werden, darum wandern sie
 * in einen anderen Bereich.
 */
export function removeBereich(id, zielId) {
  const cur = state.data.bereiche[id];
  if (!cur) return;
  const now = jetzt();
  if (zielId) {
    for (const m of Object.values(state.data.master)) {
      if (m.category === id) state.data.master[m.id] = { ...m, category: zielId, updatedAt: now };
    }
    state.data.masterUpdatedAt = now;
  }
  state.data.bereiche[id] = { ...cur, deleted: true, updatedAt: now };
  state.data.bereicheUpdatedAt = now;
  persist();
  emit();
}

export function addAktivitaet(label) {
  const id = `a:${randomId(8)}`;
  state.data.aktivitaeten[id] = {
    id,
    label,
    order: naechsteOrder(state.data.aktivitaeten),
    deleted: false,
    updatedAt: jetzt(),
  };
  state.data.aktivitaetenUpdatedAt = jetzt();
  persist();
  emit();
  return id;
}

export function patchAktivitaet(id, patch) {
  const cur = state.data.aktivitaeten[id];
  if (!cur) return;
  state.data.aktivitaeten[id] = { ...cur, ...patch, updatedAt: jetzt() };
  state.data.aktivitaetenUpdatedAt = jetzt();
  persist();
  emit();
}

export function aktivitaetBelegung(id) {
  return Object.values(state.data.master).filter(
    (m) => !m.deleted && (m.aktivitaeten ?? []).includes(id)
  ).length;
}

/** Aktivität löschen und überall herausnehmen, wo sie erwähnt wird. */
export function removeAktivitaet(id) {
  const cur = state.data.aktivitaeten[id];
  if (!cur) return;
  const now = jetzt();
  for (const m of Object.values(state.data.master)) {
    if ((m.aktivitaeten ?? []).includes(id)) {
      state.data.master[m.id] = {
        ...m,
        aktivitaeten: m.aktivitaeten.filter((a) => a !== id),
        updatedAt: now,
      };
    }
  }
  state.data.masterUpdatedAt = now;
  for (const t of Object.values(state.data.trips)) {
    if ((t.params.aktivitaeten ?? []).includes(id)) {
      t.params = { ...t.params, aktivitaeten: t.params.aktivitaeten.filter((a) => a !== id) };
      t.paramsUpdatedAt = now;
    }
  }
  state.data.aktivitaeten[id] = { ...cur, deleted: true, updatedAt: now };
  state.data.aktivitaetenUpdatedAt = now;
  persist();
  emit();
}

// ---------------------------------------------------------------------------
// Stammliste
// ---------------------------------------------------------------------------

export const LEERER_STAMM_EINTRAG = () => ({
  label: '',
  category: bereiche()[0]?.id ?? 'kleidung',
  wer: [],
  qtyMode: 'fest',
  qty: 1,
  plus: 0,
  cap: null,
  capWasch: null,
  arten: [],
  aktivitaeten: [],
  jahreszeiten: [],
  regionen: [],
  wennDabei: [],
  minNaechte: 0,
  teile: [],
  note: '',
});

/**
 * Die alte Kurzform `who` auf `wer` bringen.
 *
 * Drei Stellen legen Stammlisten-Einträge an, und eine reichte die Person im
 * längst abgelösten Feld `who` herein. Da `LEERER_STAMM_EINTRAG()` bereits ein
 * leeres `wer` setzt, fiel das nirgends auf – der Eintrag wurde still zum
 * gemeinsamen. Die Übersetzung gehört deshalb hierher, an den Schreibrand,
 * statt an jede Aufrufstelle.
 */
function mitWer(patch = {}) {
  if (Array.isArray(patch.wer) || patch.who === undefined) return patch;
  const { who, ...rest } = patch;
  return { ...rest, wer: WER_AUS_WHO[who] ?? (who ? [who] : []) };
}

export function addMasterItem(patch) {
  const id = `m:eigen.${randomId(8)}`;
  state.data.master[id] = {
    ...LEERER_STAMM_EINTRAG(),
    ...mitWer(patch),
    id,
    deleted: false,
    updatedAt: jetzt(),
  };
  state.data.masterUpdatedAt = jetzt();
  persist();
  emit();
  return id;
}

export function patchMasterItem(id, patch) {
  const cur = state.data.master[id];
  if (!cur) return;
  state.data.master[id] = { ...cur, ...mitWer(patch), updatedAt: jetzt() };
  state.data.masterUpdatedAt = jetzt();
  persist();
  emit();
}

export function removeMasterItem(id) {
  const cur = state.data.master[id];
  if (!cur) return;
  state.data.master[id] = { ...cur, deleted: true, updatedAt: jetzt() };
  state.data.masterUpdatedAt = jetzt();
  persist();
  emit();
}

/** Löschen eines Stammlisten-Eintrags zurücknehmen. */
export function undoRemoveMasterItem(id) {
  const cur = state.data.master[id];
  if (!cur) return;
  state.data.master[id] = { ...cur, deleted: false, updatedAt: jetzt() };
  state.data.masterUpdatedAt = jetzt();
  persist();
  emit();
}

/**
 * Stammliste, Bereiche und Aktivitäten aus einer Tabelle übernehmen.
 *
 * Was im Blatt fehlt, wird als gelöscht markiert statt weggeworfen: Ein
 * einfaches Überschreiben würde das andere Gerät beim nächsten Abgleich alle
 * alten Einträge zurückschicken lassen – dort sind sie ja noch da und tragen
 * einen Zeitstempel.
 *
 * Gibt den vorherigen Stand zurück, damit ein Fehlgriff widerrufbar bleibt.
 */
export function ersetzeStammliste({ master, bereiche: neueBereiche, aktivitaeten: neueAkt }) {
  const now = jetzt();
  const vorher = { ...stammlisteSichern(), importZeit: now };

  const master2 = {};
  for (const [id, alt] of Object.entries(state.data.master)) {
    master2[id] = alt.deleted ? alt : { ...alt, deleted: true, updatedAt: now };
  }
  for (const [id, neu] of Object.entries(master)) {
    master2[id] = { ...LEERER_STAMM_EINTRAG(), ...neu, id, deleted: false, updatedAt: now };
  }

  const sammlung = (altSammlung, neuListe) => {
    const out = {};
    for (const [id, alt] of Object.entries(altSammlung)) {
      out[id] = alt.deleted ? alt : { ...alt, deleted: true, updatedAt: now };
    }
    neuListe.forEach((e, idx) => {
      out[e.id] = { ...(altSammlung[e.id] ?? {}), ...e, order: idx, deleted: false, updatedAt: now };
    });
    return out;
  };

  state.data.master = master2;
  state.data.masterUpdatedAt = now;
  state.data.bereiche = sammlung(state.data.bereiche, neueBereiche);
  state.data.bereicheUpdatedAt = now;
  state.data.aktivitaeten = sammlung(state.data.aktivitaeten, neueAkt);
  state.data.aktivitaetenUpdatedAt = now;
  persist();
  emit();
  return vorher;
}

/**
 * Einen mit `ersetzeStammliste` erhaltenen Stand wieder herstellen.
 *
 * Was der Import angelegt hat, wird dabei als gelöscht markiert – aus dem
 * gleichen Grund, aus dem der Import nichts wegwirft.
 */
export function stelleStammlisteWiederHer(vorher) {
  if (!vorher) return;
  const now = jetzt();
  /*
   * Nur zurücknehmen, was der Import angefasst hat.
   *
   * Vorher wurde jeder heutige Eintrag als gelöscht markiert und dann der alte
   * Stand darübergelegt – was das zweite Gerät in der Zwischenzeit angelegt
   * hatte, verschwand dabei mit. Jetzt bleibt unberührt, was in keinem der
   * beiden Stände des Imports vorkam.
   */
  const zurueck = (heute, alt) => {
    const out = { ...heute };
    for (const [id, e] of Object.entries(heute)) {
      const warVorher = Object.prototype.hasOwnProperty.call(alt, id);
      const kamVomImport = (e.updatedAt ?? 0) >= (importZeit ?? 0);
      if (!warVorher && kamVomImport) out[id] = { ...e, deleted: true, updatedAt: now };
    }
    for (const [id, e] of Object.entries(alt)) out[id] = { ...e, updatedAt: now };
    return out;
  };
  const importZeit = vorher.importZeit ?? 0;
  state.data.master = zurueck(state.data.master, vorher.master);
  state.data.masterUpdatedAt = now;
  state.data.bereiche = zurueck(state.data.bereiche, vorher.bereiche);
  state.data.bereicheUpdatedAt = now;
  state.data.aktivitaeten = zurueck(state.data.aktivitaeten, vorher.aktivitaeten);
  state.data.aktivitaetenUpdatedAt = now;
  persist();
  emit();
}

/** Den aktuellen Stand von Stammliste, Bereichen und Aktivitäten festhalten. */
export function stammlisteSichern() {
  return JSON.parse(
    JSON.stringify({
      master: state.data.master,
      bereiche: state.data.bereiche,
      aktivitaeten: state.data.aktivitaeten,
    })
  );
}

export function resetMaster() {
  state.data.master = seedMaster();
  state.data.masterUpdatedAt = jetzt();
  persist();
  emit();
}

// ---------------------------------------------------------------------------
// Zusammenführen für den Sync
// ---------------------------------------------------------------------------

/** Zwei Sammlungen von Einträgen verschmelzen, jüngster Zeitstempel gewinnt. */
/**
 * Sieht ein Eintrag aus einer fremden Zeile brauchbar aus?
 *
 * Was hier durchfällt, wird verworfen statt übernommen. Vorher wanderte eine
 * unbrauchbare Zeile ungeprüft in den dauerhaften Zustand und liess sich von
 * innerhalb der App nicht mehr entfernen.
 */
export function brauchbar(e) {
  return Boolean(
    e &&
      typeof e === 'object' &&
      !Array.isArray(e) &&
      (e.updatedAt === undefined || typeof e.updatedAt === 'number')
  );
}

let verworfen = 0;
/** Wie viele fremde Einträge zuletzt aussortiert wurden (für die Meldung). */
export const verworfeneEintraege = () => verworfen;

function mergeById(a = {}, b = {}) {
  const out = {};
  const eigen = a ?? {};
  const fremd = b ?? {};
  // Fremde Zeitstempel verraten, ob die eigene Uhr nachgeht.
  for (const e of Object.values(fremd)) beachteFremdeZeit(e?.updatedAt);
  for (const id of new Set([...Object.keys(eigen), ...Object.keys(fremd)])) {
    const x = eigen[id];
    const y = brauchbar(fremd[id]) ? fremd[id] : null;
    if (fremd[id] && !y) verworfen++;
    if (!x) {
      if (y) out[id] = y;
      continue;
    }
    if (!y) {
      out[id] = x;
      continue;
    }
    out[id] = (y.updatedAt ?? 0) > (x.updatedAt ?? 0) ? y : x;
  }
  return out;
}

/** Frühere Grabsteine waren blosse Zeitstempel; jetzt tragen sie die Richtung mit. */
const grabstein = (e) => (typeof e === 'number' ? { weg: true, ts: e } : e ?? null);

export function mergeTrips(local, remote) {
  if (!remote) return local;
  if (!local) return remote;
  /*
   * Kopfdaten feldweise, nicht als Block.
   *
   * Vorher entschied ein einziger Zeitstempel über Name, Angaben und Archiv
   * gemeinsam: wer auf einem Gerät die Nächte änderte, während der andere die
   * Reise umbenannte, verlor eine der beiden Änderungen vollständig.
   */
  const feld = (name, stempel) =>
    (remote[stempel] ?? 0) > (local[stempel] ?? 0) ? remote[name] : local[name];
  const neuer = (remote.paramsUpdatedAt ?? 0) > (local.paramsUpdatedAt ?? 0) ? remote : local;
  const dismissed = { ...(local.dismissed ?? {}) };
  for (const [k, v] of Object.entries(remote.dismissed ?? {})) {
    const a = grabstein(dismissed[k]);
    const b = grabstein(v);
    dismissed[k] = (b?.ts ?? 0) > (a?.ts ?? 0) ? b : a ?? b;
  }
  return {
    ...neuer,
    id: local.id,
    name: feld('name', 'nameUpdatedAt') ?? neuer.name,
    nameUpdatedAt: Math.max(local.nameUpdatedAt ?? 0, remote.nameUpdatedAt ?? 0) || undefined,
    archived: feld('archived', 'archivedUpdatedAt') ?? neuer.archived,
    archivedUpdatedAt: Math.max(local.archivedUpdatedAt ?? 0, remote.archivedUpdatedAt ?? 0) || undefined,
    createdAt: Math.min(local.createdAt ?? jetzt(), remote.createdAt ?? jetzt()),
    master: mergeById(local.master, remote.master),
    items: mergeById(local.items, remote.items),
    dismissed,
  };
}

/**
 * Beim Beitreten den Haushalt vollständig übernehmen statt zusammenzuführen.
 *
 * Zusammenführen wäre hier falsch: Das beitretende Gerät hat beim ersten Start
 * seine eigene Stammliste ausgesät, deren Zeitstempel jünger sind als alles,
 * was auf dem anderen Gerät gepflegt wurde. Pro Eintrag würde also die
 * unberührte Vorlage gewinnen und die echten Anpassungen überschreiben.
 * Eigene Reisen bleiben erhalten, die sind ja gewollt.
 */
export function uebernehmeHaushalt(row) {
  if (row.geloescht) {
    state.data.geloescht = { ...state.data.geloescht, ...row.geloescht };
    state.data.geloeschtUpdatedAt = Math.max(
      state.data.geloeschtUpdatedAt ?? 0,
      row.geloeschtUpdatedAt ?? 0
    );
    grabsteineAnwenden();
  }
  if (row.master) {
    state.data.master = JSON.parse(JSON.stringify(row.master));
    state.data.masterUpdatedAt = row.masterUpdatedAt ?? jetzt();
  }
  if (row.bereiche) {
    state.data.bereiche = JSON.parse(JSON.stringify(row.bereiche));
    state.data.bereicheUpdatedAt = row.bereicheUpdatedAt ?? jetzt();
  }
  if (row.aktivitaeten) {
    state.data.aktivitaeten = JSON.parse(JSON.stringify(row.aktivitaeten));
    state.data.aktivitaetenUpdatedAt = row.aktivitaetenUpdatedAt ?? jetzt();
  }
}

/** Stammliste, Bereiche, Aktivitäten und Grabsteine zusammenführen. */
export function mergeHaushalt(row) {
  if (row.geloescht) {
    for (const [id, fremd] of Object.entries(row.geloescht)) {
      const eigen = state.data.geloescht[id];
      if (!eigen || (fremd?.ts ?? 0) > (eigen.ts ?? 0)) state.data.geloescht[id] = fremd;
    }
    state.data.geloeschtUpdatedAt = Math.max(
      state.data.geloeschtUpdatedAt ?? 0,
      row.geloeschtUpdatedAt ?? 0
    );
    grabsteineAnwenden();
  }
  state.data.master = mergeById(state.data.master, row.master);
  state.data.masterUpdatedAt = Math.max(state.data.masterUpdatedAt ?? 0, row.masterUpdatedAt ?? 0);
  if (row.bereiche) {
    state.data.bereiche = mergeById(state.data.bereiche, row.bereiche);
    state.data.bereicheUpdatedAt = Math.max(
      state.data.bereicheUpdatedAt ?? 0,
      row.bereicheUpdatedAt ?? 0
    );
  }
  if (row.aktivitaeten) {
    state.data.aktivitaeten = mergeById(state.data.aktivitaeten, row.aktivitaeten);
    state.data.aktivitaetenUpdatedAt = Math.max(
      state.data.aktivitaetenUpdatedAt ?? 0,
      row.aktivitaetenUpdatedAt ?? 0
    );
  }
}

/** Jüngster Zeitstempel einer Reise – für „muss ich hochladen?". */
export function tripRevision(trip) {
  let max = trip.paramsUpdatedAt ?? 0;
  for (const it of Object.values(trip.items ?? {})) if ((it.updatedAt ?? 0) > max) max = it.updatedAt;
  for (const it of Object.values(trip.master ?? {})) if ((it.updatedAt ?? 0) > max) max = it.updatedAt;
  for (const v of Object.values(trip.dismissed ?? {})) if (v > max) max = v;
  return max;
}

/** Jüngster Zeitstempel des Haushalts: Stammliste, Bereiche, Aktivitäten. */
/**
 * Grabsteine ausdünnen.
 *
 * Sie wachsen monoton: jede gelöschte Reise und jeder aus einer Reise
 * geworfene Eintrag hinterlässt einen, und entfernt wurde nie etwas. Nach
 * einem halben Jahr trägt jeder Upload Einträge mit, an die sich niemand mehr
 * erinnert. Ein Grabstein, der älter als die Frist ist, hat seinen Zweck
 * erfüllt – beide Geräte haben ihn längst gesehen.
 */
const GRABSTEIN_FRIST_MS = 180 * 24 * 60 * 60 * 1000;

export function verdichteGrabsteine(frist = GRABSTEIN_FRIST_MS) {
  const grenze = jetzt() - frist;
  let weg = 0;
  for (const [id, e] of Object.entries(state.data.geloescht ?? {})) {
    if ((e?.ts ?? 0) < grenze) {
      delete state.data.geloescht[id];
      weg++;
    }
  }
  for (const trip of Object.values(state.data.trips)) {
    for (const [id, e] of Object.entries(trip.dismissed ?? {})) {
      // Nur zurückgenommene ausdünnen – ein aktives „weg" muss bleiben,
      // sonst kommt der Eintrag bei der nächsten Berechnung zurück.
      if (e?.weg === false && (e?.ts ?? 0) < grenze) {
        delete trip.dismissed[id];
        weg++;
      }
    }
  }
  if (weg) {
    state.data.geloeschtUpdatedAt = jetzt();
    persist();
  }
  return weg;
}

export function haushaltRevision() {
  let max = Math.max(
    state.data.masterUpdatedAt ?? 0,
    state.data.bereicheUpdatedAt ?? 0,
    state.data.aktivitaetenUpdatedAt ?? 0,
    state.data.geloeschtUpdatedAt ?? 0
  );
  for (const sammlung of [state.data.master, state.data.bereiche, state.data.aktivitaeten]) {
    for (const it of Object.values(sammlung ?? {})) {
      if ((it.updatedAt ?? 0) > max) max = it.updatedAt;
    }
  }
  return max;
}
