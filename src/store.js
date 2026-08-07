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
  const now = Date.now();
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
  syncStatus: { mode: 'local', text: 'Nur auf diesem Gerät', error: null },
};

export function subscribe(fn) {
  state.listeners.add(fn);
  return () => state.listeners.delete(fn);
}

export function emit() {
  for (const fn of state.listeners) fn();
}

/**
 * Alten Stand auf die aktuelle Form bringen:
 * `who` wird zu `wer`, Teile werden zu Objekten mit Menge, und Bereiche und
 * Aktivitäten bekommen ihre eigene Sammlung.
 */
function migriere(daten) {
  const now = Date.now();
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
    Object.entries(d.trips ?? {}).map(([id, t]) => [id, { ...t, master: stamm(t.master) }])
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
  try {
    const raw = localStorage.getItem(LS_KEY) ?? localStorage.getItem(LS_ALT);
    if (raw) {
      state.data = migriere({ ...emptyState(), ...JSON.parse(raw) });
      // Eine leere Stammliste wäre eine Sackgasse – dann neu aussäen.
      if (!Object.keys(state.data.master).length) {
        state.data.master = seedMaster();
        state.data.masterUpdatedAt = Date.now();
      }
    }
  } catch (err) {
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
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state.data));
    } catch (err) {
      console.warn('Speichern fehlgeschlagen', err);
    }
  }, 120);
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
  const now = Date.now();
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
  const now = Date.now();
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
  const now = Date.now();
  state.data.trips[kopie.id] = JSON.parse(JSON.stringify(kopie));
  state.data.geloescht[kopie.id] = { weg: false, ts: now };
  state.data.geloeschtUpdatedAt = now;
  persist();
  emit();
}

/** Wurde diese Reise gelöscht? */
export const istGeloescht = (id) => state.data.geloescht?.[id]?.weg === true;

/** Reisen entfernen, für die ein gültiger Grabstein vorliegt. */
function grabsteineAnwenden() {
  for (const [id, eintrag] of Object.entries(state.data.geloescht ?? {})) {
    if (!eintrag?.weg) continue;
    if (state.data.trips[id]) delete state.data.trips[id];
    if (state.data.activeTripId === id) state.data.activeTripId = null;
  }
}

export function setTripMeta(tripId, patch) {
  const trip = state.data.trips[tripId];
  if (!trip) return;
  Object.assign(trip, patch);
  trip.paramsUpdatedAt = Date.now();
  persist();
  emit();
}

export function setParams(tripId, patch) {
  const trip = state.data.trips[tripId];
  if (!trip) return;
  trip.params = { ...trip.params, ...patch };
  trip.paramsUpdatedAt = Date.now();
  persist();
  emit();
}

/** Stammlisten-Stand der Reise auf den aktuellen Stand bringen. */
export function refreshTripMaster(tripId) {
  const trip = state.data.trips[tripId];
  if (!trip) return;
  trip.master = JSON.parse(JSON.stringify(state.data.master));
  trip.masterCopiedAt = state.data.masterUpdatedAt;
  trip.paramsUpdatedAt = Date.now();
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
  trip.items[itemId] = { ...trip.items[itemId], ...patch, updatedAt: Date.now() };
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
    updatedAt: Date.now(),
  };
  persist();
  emit();
  return id;
}

export function removeItem(tripId, itemId) {
  const trip = state.data.trips[tripId];
  const item = trip?.items[itemId];
  if (!item) return;
  trip.items[itemId] = { ...item, deleted: true, updatedAt: Date.now() };
  if (item.source === 'auto') trip.dismissed[itemId] = Date.now();
  persist();
  emit();
}

/** Löschen einer Reisezeile zurücknehmen – für „Widerrufen" nach dem Wischen. */
export function undoRemoveItem(tripId, itemIds) {
  const trip = state.data.trips[tripId];
  if (!trip) return;
  const now = Date.now();
  for (const id of [].concat(itemIds)) {
    const item = trip.items[id];
    if (!item) continue;
    trip.items[id] = { ...item, deleted: false, updatedAt: now };
    delete trip.dismissed[id];
  }
  persist();
  emit();
}

export function restoreDismissed(tripId) {
  const trip = state.data.trips[tripId];
  if (!trip) return;
  trip.dismissed = {};
  persist();
}

// ---------------------------------------------------------------------------
// Bereiche und Aktivitäten
// ---------------------------------------------------------------------------

const sortiert = (sammlung) =>
  Object.values(sammlung ?? {})
    .filter((e) => !e.deleted)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.label.localeCompare(b.label, 'de'));

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
    updatedAt: Date.now(),
  };
  state.data.bereicheUpdatedAt = Date.now();
  persist();
  emit();
  return id;
}

export function patchBereich(id, patch) {
  const cur = state.data.bereiche[id];
  if (!cur) return;
  state.data.bereiche[id] = { ...cur, ...patch, updatedAt: Date.now() };
  state.data.bereicheUpdatedAt = Date.now();
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
  const now = Date.now();
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
    updatedAt: Date.now(),
  };
  state.data.aktivitaetenUpdatedAt = Date.now();
  persist();
  emit();
  return id;
}

export function patchAktivitaet(id, patch) {
  const cur = state.data.aktivitaeten[id];
  if (!cur) return;
  state.data.aktivitaeten[id] = { ...cur, ...patch, updatedAt: Date.now() };
  state.data.aktivitaetenUpdatedAt = Date.now();
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
  const now = Date.now();
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

export function addMasterItem(patch) {
  const id = `m:eigen.${randomId(8)}`;
  state.data.master[id] = {
    ...LEERER_STAMM_EINTRAG(),
    ...patch,
    id,
    deleted: false,
    updatedAt: Date.now(),
  };
  state.data.masterUpdatedAt = Date.now();
  persist();
  emit();
  return id;
}

export function patchMasterItem(id, patch) {
  const cur = state.data.master[id];
  if (!cur) return;
  state.data.master[id] = { ...cur, ...patch, updatedAt: Date.now() };
  state.data.masterUpdatedAt = Date.now();
  persist();
  emit();
}

export function removeMasterItem(id) {
  const cur = state.data.master[id];
  if (!cur) return;
  state.data.master[id] = { ...cur, deleted: true, updatedAt: Date.now() };
  state.data.masterUpdatedAt = Date.now();
  persist();
  emit();
}

/** Löschen eines Stammlisten-Eintrags zurücknehmen. */
export function undoRemoveMasterItem(id) {
  const cur = state.data.master[id];
  if (!cur) return;
  state.data.master[id] = { ...cur, deleted: false, updatedAt: Date.now() };
  state.data.masterUpdatedAt = Date.now();
  persist();
  emit();
}

export function resetMaster() {
  state.data.master = seedMaster();
  state.data.masterUpdatedAt = Date.now();
  persist();
  emit();
}

// ---------------------------------------------------------------------------
// Zusammenführen für den Sync
// ---------------------------------------------------------------------------

/** Zwei Sammlungen von Einträgen verschmelzen, jüngster Zeitstempel gewinnt. */
function mergeById(a = {}, b = {}) {
  const out = {};
  for (const id of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[id];
    const y = b[id];
    if (!x) out[id] = y;
    else if (!y) out[id] = x;
    else out[id] = (y.updatedAt ?? 0) > (x.updatedAt ?? 0) ? y : x;
  }
  return out;
}

export function mergeTrips(local, remote) {
  if (!remote) return local;
  if (!local) return remote;
  const neuer = (remote.paramsUpdatedAt ?? 0) > (local.paramsUpdatedAt ?? 0) ? remote : local;
  const dismissed = { ...(local.dismissed ?? {}) };
  for (const [k, v] of Object.entries(remote.dismissed ?? {})) {
    dismissed[k] = Math.max(dismissed[k] ?? 0, v);
  }
  return {
    ...neuer,
    id: local.id,
    createdAt: Math.min(local.createdAt ?? Date.now(), remote.createdAt ?? Date.now()),
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
    state.data.masterUpdatedAt = row.masterUpdatedAt ?? Date.now();
  }
  if (row.bereiche) {
    state.data.bereiche = JSON.parse(JSON.stringify(row.bereiche));
    state.data.bereicheUpdatedAt = row.bereicheUpdatedAt ?? Date.now();
  }
  if (row.aktivitaeten) {
    state.data.aktivitaeten = JSON.parse(JSON.stringify(row.aktivitaeten));
    state.data.aktivitaetenUpdatedAt = row.aktivitaetenUpdatedAt ?? Date.now();
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
