/**
 * Live-Sync über Supabase.
 *
 * Zwei Arten von Zeilen in derselben Tabelle:
 *   householdId  → { kind: 'household', master, masterUpdatedAt, tripIds }
 *   tripId       → { kind: 'trip', ...Reise }
 *
 * So bleibt jede einzelne Übertragung klein, statt bei jedem Häkchen den
 * ganzen Datenbestand hochzuladen.
 *
 * Ohne Zugangsdaten läuft die App rein lokal weiter; der Supabase-Client wird
 * erst dann geladen, wenn Sync eingeschaltet ist.
 */

import {
  state,
  mergeTrips,
  mergeHaushalt,
  uebernehmeHaushalt,
  tripRevision,
  haushaltRevision,
  persist,
  emit,
} from './store.js';

const TABLE = 'packlists';
let client = null;
let channel = null;
const pushTimers = new Map();
const pushedRev = new Map();
/**
 * Fingerabdruck des zuletzt hochgeladenen Reiseverzeichnisses.
 *
 * Eine neue Reise ändert die Revision des Haushalts nicht – die zählt nur
 * Stammliste, Bereiche und Aktivitäten. Ohne diesen Vergleich bliebe die
 * Liste der Reise-IDs veraltet, und das andere Gerät erführe nie, dass es die
 * Reisen überhaupt gibt.
 */
let letzteTripSignatur = null;

const tripSignatur = () => Object.keys(state.data.trips).sort().join(',');

function setStatus(mode, text, error = null) {
  state.syncStatus = { mode, text, error };
  emit();
}

export function isConfigured() {
  return Boolean(state.config.url && state.config.key);
}

export async function connect() {
  if (!isConfigured()) {
    setStatus('local', 'Nur auf diesem Gerät');
    return false;
  }
  if (!navigator.onLine) {
    setStatus('offline', 'Offline – wird nachgetragen');
    return false;
  }
  setStatus('connecting', 'Verbinde …');
  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.110.2');
    client = createClient(state.config.url.replace(/\/+$/, ''), state.config.key, {
      auth: { persistSession: false },
      realtime: { params: { eventsPerSecond: 5 } },
    });
  } catch (err) {
    setStatus('error', 'Sync-Bibliothek nicht ladbar', String(err));
    return false;
  }
  try {
    await pullAll();
  } catch (err) {
    setStatus('error', 'Abrufen fehlgeschlagen', String(err?.message ?? err));
    return false;
  }
  subscribeRealtime();
  setStatus('live', 'Live verbunden');
  return true;
}

export function disconnect() {
  if (channel) {
    client?.removeChannel(channel);
    channel = null;
  }
  client = null;
  pushedRev.clear();
  letzteTripSignatur = null;
  setStatus('local', 'Nur auf diesem Gerät');
}

function subscribeRealtime() {
  if (!client) return;
  if (channel) client.removeChannel(channel);
  channel = client
    .channel('packlists-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, (payload) => {
      if (payload.new?.data) applyRemote(payload.new.data);
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') setStatus('live', 'Live verbunden');
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        setStatus('error', 'Verbindung unterbrochen');
      }
    });
}

function applyRemote(row) {
  if (!row) return;
  if (row.kind === 'household') {
    mergeHaushalt(row);
    // Reisen, die das andere Gerät kennt, nachladen.
    const fehlend = (row.tripIds ?? []).filter((id) => !state.data.trips[id]);
    persist();
    emit();
    if (fehlend.length) pullTrips(fehlend).catch(() => {});
    // Kennt die Gegenseite Reisen von uns noch nicht, Verzeichnis nachtragen.
    const bekannt = new Set(row.tripIds ?? []);
    const unbekannt = Object.keys(state.data.trips).some((id) => !bekannt.has(id));
    if (unbekannt || haushaltRevision() > (row.rev ?? row.masterUpdatedAt ?? 0)) pushHousehold();
    return;
  }
  if (!row.id) return;
  const merged = mergeTrips(state.data.trips[row.id], row);
  state.data.trips[merged.id] = merged;
  pushedRev.set(merged.id, Math.max(pushedRev.get(merged.id) ?? 0, tripRevision(row)));
  persist();
  emit();
  if (tripRevision(merged) > tripRevision(row)) push(merged.id);
}

async function pullTrips(ids) {
  if (!client || !ids.length) return;
  const { data, error } = await client.from(TABLE).select('id,data').in('id', ids);
  if (error) throw error;
  for (const r of data ?? []) applyRemote(r.data);
}

/** Haushalt-Zeile und alle bekannten Reisen holen. */
export async function pullAll() {
  if (!client) return;
  const hid = state.data.householdId;
  const { data: hh, error: hhErr } = await client.from(TABLE).select('id,data').eq('id', hid).maybeSingle();
  if (hhErr) throw hhErr;
  if (hh?.data) applyRemote(hh.data);
  else pushHousehold(0);

  const ids = Object.keys(state.data.trips);
  if (ids.length) {
    const { data, error } = await client.from(TABLE).select('id,data').in('id', ids);
    if (error) throw error;
    const bekannt = new Set((data ?? []).map((r) => r.id));
    for (const r of data ?? []) applyRemote(r.data);
    for (const id of ids) if (!bekannt.has(id)) push(id, 0);
  }
}

/** Einem Haushalt beitreten – Stammliste und alle Reisen übernehmen. */
export async function joinHousehold(code) {
  if (!client) {
    const ok = await connect();
    if (!ok) throw new Error('Kein Sync aktiv');
  }
  const { data, error } = await client.from(TABLE).select('id,data').eq('id', code).maybeSingle();
  if (error) throw error;
  if (!data?.data || data.data.kind !== 'household') {
    throw new Error('Kein Haushalt mit diesem Code gefunden');
  }
  state.data.householdId = code;
  // Übernehmen statt zusammenführen – siehe uebernehmeHaushalt().
  uebernehmeHaushalt(data.data);
  pushedRev.set(code, haushaltRevision());
  persist();
  emit();
  await pullTrips(data.data.tripIds ?? []);
  const erste = (data.data.tripIds ?? []).find((id) => state.data.trips[id]);
  if (erste && !state.data.activeTripId) state.data.activeTripId = erste;
  persist();
  emit();
  subscribeRealtime();
  return (data.data.tripIds ?? []).length;
}

async function upsert(id, payload) {
  const { error } = await client
    .from(TABLE)
    .upsert({ id, data: payload, updated_at: new Date().toISOString() });
  if (error) throw error;
}

/** Stammliste und Reiseverzeichnis hochladen. */
export function pushHousehold(delay = 600) {
  if (!isConfigured()) return;
  const id = state.data.householdId;
  clearTimeout(pushTimers.get(id));
  pushTimers.set(
    id,
    setTimeout(async () => {
      const rev = haushaltRevision();
      const signatur = tripSignatur();
      // Auch hochladen, wenn nur eine Reise dazugekommen oder weggefallen ist.
      if (pushedRev.has(id) && rev <= pushedRev.get(id) && signatur === letzteTripSignatur) return;
      if (!client) {
        const ok = await connect();
        if (!ok) return;
      }
      try {
        await upsert(id, {
          kind: 'household',
          rev,
          master: state.data.master,
          masterUpdatedAt: state.data.masterUpdatedAt,
          bereiche: state.data.bereiche,
          bereicheUpdatedAt: state.data.bereicheUpdatedAt,
          aktivitaeten: state.data.aktivitaeten,
          aktivitaetenUpdatedAt: state.data.aktivitaetenUpdatedAt,
          tripIds: Object.keys(state.data.trips),
        });
        pushedRev.set(id, rev);
        letzteTripSignatur = signatur;
      } catch (err) {
        setStatus('error', 'Hochladen fehlgeschlagen', String(err?.message ?? err));
      }
    }, delay)
  );
}

/** Eine Reise hochladen, gebündelt gegen schnelles Abhaken. */
export function push(tripId, delay = 500) {
  if (!isConfigured() || !tripId) return;
  clearTimeout(pushTimers.get(tripId));
  pushTimers.set(
    tripId,
    setTimeout(async () => {
      const trip = state.data.trips[tripId];
      if (!trip) return;
      const rev = tripRevision(trip);
      if (pushedRev.has(tripId) && rev <= pushedRev.get(tripId)) return;
      if (!client) {
        const ok = await connect();
        if (!ok) return;
      }
      try {
        await upsert(trip.id, { kind: 'trip', ...trip });
        pushedRev.set(tripId, rev);
        if (state.syncStatus.mode !== 'live') setStatus('live', 'Live verbunden');
      } catch (err) {
        setStatus('error', 'Hochladen fehlgeschlagen', String(err?.message ?? err));
      }
    }, delay)
  );
}

/** Nach jeder lokalen Änderung aufrufen. */
export function pushAll() {
  if (!isConfigured()) return;
  pushHousehold();
  for (const id of Object.keys(state.data.trips)) push(id);
}

export function initAutoSync() {
  window.addEventListener('online', () => connect());
  window.addEventListener('offline', () => setStatus('offline', 'Offline – wird nachgetragen'));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && isConfigured()) {
      if (client) pullAll().catch(() => connect());
      else connect();
    }
  });
  if (isConfigured()) connect();
}
