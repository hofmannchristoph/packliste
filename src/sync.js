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
  istGeloescht,
  tripRevision,
  haushaltRevision,
  persist,
  schreibe,
  emit,
  emitStatus,
  raeumeVerweise,
} from './store.js';

const TABLE = 'packlists';
/**
 * Obergrenze der Nutzlast, wie sie die RLS-Policy setzt.
 *
 * Der Client kannte sie nicht: eine zu grosse Zeile wurde vom Server
 * abgelehnt, und der Abgleich fiel von da an dauerhaft aus – mit derselben
 * allgemeinen Meldung wie ein Netzausfall. Bei 90 Prozent wird gewarnt,
 * darüber gar nicht erst gesendet.
 */
const MAX_NUTZLAST = 400000;
const WARNSCHWELLE = 0.9;
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
/**
 * Solange der erste Abruf läuft, wird nicht hochgeladen.
 *
 * `connect()` setzte den Client, bevor `pullAll()` durch war – ein Upload
 * konnte damit die ganze Zeile überschreiben, ohne den fremden Stand je
 * gesehen zu haben.
 */
let erstabrufOffen = false;
/** Läuft gerade ein Upload für diese Zeile? Schützt vor überholenden Schreibern. */
const inFlight = new Map();

const tripSignatur = () => Object.keys(state.data.trips).sort().join(',');

/**
 * Aus einem Anbieterfehler etwas machen, das weiterhilft.
 *
 * Vorher wurde jede Störung zur selben Zeile „Hochladen fehlgeschlagen" –
 * Netz weg, Zeile zu gross und Schlüssel abgelaufen sahen gleich aus, obwohl
 * die Antworten darauf völlig verschieden sind.
 */
export function fehlerText(err) {
  const roh = String(err?.message ?? err ?? '');
  const code = err?.code ?? err?.status ?? '';
  if (/Zeitüberschreitung|dauerte zu lange/i.test(roh)) return 'Das Netz antwortet nicht – wird nachgeholt.';
  if (/Failed to fetch|NetworkError|Load failed/i.test(roh)) return 'Keine Verbindung – wird nachgeholt.';
  if (String(code) === '413' || /too large|payload/i.test(roh))
    return 'Die Liste ist zu gross für den Server. Archivierte Reisen löschen schafft Platz.';
  if (['401', '403'].includes(String(code)) || /JWT|apikey|Invalid API key/i.test(roh))
    return 'Der Zugang wurde abgelehnt. Stimmt der Schlüssel unter Sync noch?';
  if (['429'].includes(String(code)) || /rate limit/i.test(roh))
    return 'Zu viele Anfragen – der Abgleich wartet kurz.';
  if (/violates row-level security|new row violates/i.test(roh))
    return 'Der Server hat die Änderung abgelehnt (Zugriffsregel).';
  return roh || 'Unbekannter Fehler';
}

/**
 * Sync-Zustand melden.
 *
 * Zwei Dinge sind hier wichtig: Es wird nur gemeldet, wenn sich wirklich etwas
 * geändert hat, und die Meldung läuft über den Statuskanal statt über `emit()`.
 * Sonst galt jeder Verbindungsversuch als Datenänderung und stiess den nächsten
 * Upload an – offline eine Endlosschleife.
 */
function setStatus(mode, text, error = null) {
  const a = state.syncStatus;
  if (a.mode === mode && a.text === text && a.error === error) return;
  state.syncStatus = { mode, text, error };
  emitStatus();
}

/**
 * Ein Versprechen mit Zeitgrenze.
 *
 * Ohne sie hängt ein Aufruf an einem halb erreichbaren Netz beliebig lange und
 * die App weiss nie, woran sie ist.
 */
const MIT_FRIST = 12000;
function mitFrist(versprechen, ms = MIT_FRIST, was = 'Zeitüberschreitung') {
  return Promise.race([
    versprechen,
    new Promise((_, ab) => setTimeout(() => ab(new Error(was)), ms)),
  ]);
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
  // Vor dem ersten Abruf darf nichts hochgeladen werden, sonst überschreibt ein
  // veralteter lokaler Stand die Zeile, bevor er den fremden je gesehen hat.
  erstabrufOffen = true;
  try {
    // Liegt unter vendor/ – siehe vendor/README.md. Kein Fremd-CDN zur Laufzeit.
    const { createClient } = await import('../vendor/supabase-js-2.110.2.mjs');
    client = createClient(state.config.url.replace(/\/+$/, ''), state.config.key, {
      auth: { persistSession: false },
      realtime: { params: { eventsPerSecond: 5 } },
    });
  } catch (err) {
    setStatus('error', 'Sync-Bibliothek nicht ladbar', String(err));
    return false;
  }
  try {
    await mitFrist(pullAll(), MIT_FRIST, 'Abrufen dauerte zu lange');
  } catch (err) {
    erstabrufOffen = false;
    setStatus('error', 'Abrufen fehlgeschlagen', fehlerText(err));
    return false;
  }
  erstabrufOffen = false;
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
  letzterAbruf = null;
  clearTimeout(kanalTimer);
  neuversuche = 0;
  setStatus('local', 'Nur auf diesem Gerät');
}

let neuversuche = 0;
let kanalTimer = null;

function subscribeRealtime() {
  if (!client) return;
  clearTimeout(kanalTimer);
  if (channel) client.removeChannel(channel);
  channel = client
    .channel('packlists-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, (payload) => {
      if (payload.new?.data) applyRemote(payload.new.data, payload.new.id);
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        neuversuche = 0;
        setStatus('live', 'Live verbunden');
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        setStatus('error', 'Verbindung unterbrochen');
        // Von allein kommt der Kanal nicht zurück – mit wachsendem Abstand erneut.
        if (neuversuche < 5) {
          const wartezeit = Math.min(30000, 1000 * 2 ** neuversuche);
          neuversuche++;
          clearTimeout(kanalTimer);
          kanalTimer = setTimeout(() => {
            if (client && navigator.onLine) subscribeRealtime();
          }, wartezeit);
        }
      }
    });
}

/**
 * Gehört diese Zeile überhaupt zu uns?
 *
 * Der Realtime-Kanal hört auf die ganze Tabelle, nicht auf unseren Haushalt.
 * Ohne diese Prüfung wanderte die Stammliste eines fremden Haushalts direkt in
 * den lokalen Zustand – heute gibt es nur einen, aber die Annahme steht
 * nirgends und trägt nicht.
 */
function gehoertUns(row, id) {
  const hid = state.data.householdId;
  if (row.kind === 'household') return (id ?? hid) === hid;
  if (row.kind === 'trip') {
    const bekannt = Object.prototype.hasOwnProperty.call(state.data.trips, row.id);
    // Neue Reisen kommen nur über das Verzeichnis unseres Haushalts herein.
    return bekannt || erwarteteTrips.has(row.id);
  }
  return false;
}

/** Reise-IDs, die das Verzeichnis unseres Haushalts nennt. */
const erwarteteTrips = new Set();

function applyRemote(row, id = null) {
  if (!row || typeof row !== 'object') return;
  if (!gehoertUns(row, id)) return;
  if (row.kind === 'household') {
    mergeHaushalt(row);
    // Ein Eintrag vom anderen Gerät kann Verweise mitbringen, die es hier
    // nicht mehr gibt – die dürfen nicht liegenbleiben.
    raeumeVerweise();
    for (const t of row.tripIds ?? []) erwarteteTrips.add(t);
    // Reisen, die das andere Gerät kennt, nachladen.
    const fehlend = (row.tripIds ?? []).filter((id) => !state.data.trips[id] && !istGeloescht(id));
    persist();
    emit();
    if (fehlend.length) {
      // Vorher verschluckt: fehlten Reisen dauerhaft, erfuhr das niemand.
      pullTrips(fehlend).catch((err) =>
        setStatus('error', 'Reisen konnten nicht geladen werden', fehlerText(err))
      );
    }
    // Kennt die Gegenseite Reisen von uns noch nicht, Verzeichnis nachtragen.
    // Gelöschte zählen nicht mit, sonst holt man sie sich gegenseitig zurück.
    const bekannt = new Set(row.tripIds ?? []);
    const unbekannt = Object.keys(state.data.trips).some(
      (id) => !bekannt.has(id) && !istGeloescht(id)
    );
    if (unbekannt || haushaltRevision() > (row.rev ?? row.masterUpdatedAt ?? 0)) pushHousehold();
    return;
  }
  if (!row.id || istGeloescht(row.id)) return;
  const merged = mergeTrips(state.data.trips[row.id], row);
  state.data.trips[merged.id] = merged;
  pushedRev.set(merged.id, Math.max(pushedRev.get(merged.id) ?? 0, tripRevision(row)));
  persist();
  emit();
  if (tripRevision(merged) > tripRevision(row)) push(merged.id);
}

async function pullTrips(ids) {
  const offen = ids.filter((id) => !istGeloescht(id));
  if (!client || !offen.length) return;
  const { data, error } = await client.from(TABLE).select('id,data').in('id', offen);
  if (error) throw error;
  for (const r of data ?? []) applyRemote(r.data, r.id);
}

/** Zeitpunkt des letzten vollständigen Abrufs – für den knappen Abruf danach. */
let letzterAbruf = null;

/**
 * Haushalt-Zeile und alle bekannten Reisen holen.
 *
 * Beim ersten Mal vollständig. Danach reicht, was sich seither geändert hat:
 * jeder Wechsel in den Vordergrund lud vorher alles neu – bei drei Reisen rund
 * 700 KB, obwohl `updated_at` in der Tabelle steht und genau dafür da ist.
 */
export async function pullAll({ knapp = false } = {}) {
  if (!client) return;
  const hid = state.data.householdId;
  if (knapp && letzterAbruf) {
    const { data, error } = await client
      .from(TABLE)
      .select('id,data')
      .gt('updated_at', letzterAbruf);
    if (error) throw error;
    for (const r of data ?? []) applyRemote(r.data, r.id);
    letzterAbruf = new Date().toISOString();
    return;
  }
  const { data: hh, error: hhErr } = await client.from(TABLE).select('id,data').eq('id', hid).maybeSingle();
  if (hhErr) throw hhErr;
  if (hh?.data) applyRemote(hh.data, hh.id);
  else pushHousehold(0);

  const ids = Object.keys(state.data.trips);
  if (ids.length) {
    const { data, error } = await client.from(TABLE).select('id,data').in('id', ids);
    if (error) throw error;
    const bekannt = new Set((data ?? []).map((r) => r.id));
    for (const r of data ?? []) applyRemote(r.data, r.id);
    /*
     * Was das Verzeichnis nennt, aber als Zeile fehlt, wird nachgetragen.
     * Umgekehrt bleibt eine Reise, die es nur hier gibt, nicht liegen – beides
     * konnte vorher dauerhaft auseinanderlaufen.
     */
    for (const id of ids) if (!bekannt.has(id)) push(id, 0);
  }
  letzterAbruf = new Date().toISOString();
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

/**
 * Eine Zeile hochladen – aber nie zwei Uploads derselben Zeile gleichzeitig.
 *
 * Ohne diese Sperre konnten zwei Aufrufe in falscher Reihenfolge ankommen und
 * ein älterer Stand den neueren in der Datenbank überschreiben.
 */
async function upsert(id, payload) {
  const laufend = inFlight.get(id);
  if (laufend) await laufend.catch(() => {});
  const versprechen = upsertJetzt(id, payload);
  inFlight.set(id, versprechen);
  try {
    return await versprechen;
  } finally {
    if (inFlight.get(id) === versprechen) inFlight.delete(id);
  }
}

function nutzlastPruefen(id, payload) {
  const groesse = new TextEncoder().encode(JSON.stringify(payload)).length;
  if (groesse > MAX_NUTZLAST) {
    setStatus(
      'error',
      'Zu gross für den Server',
      `Diese Liste ist ${Math.round(groesse / 1024)} KB gross, erlaubt sind ${Math.round(
        MAX_NUTZLAST / 1024
      )} KB. Archivierte Reisen löschen schafft Platz.`
    );
    return false;
  }
  if (groesse > MAX_NUTZLAST * WARNSCHWELLE) {
    console.warn(`Nutzlast für ${id} bei ${Math.round((groesse / MAX_NUTZLAST) * 100)} % der Grenze`);
  }
  return true;
}

async function upsertJetzt(id, payload) {
  if (!nutzlastPruefen(id, payload)) return;
  const { error } = await mitFrist(
    client.from(TABLE).upsert({ id, data: payload, updated_at: new Date().toISOString() }),
    MIT_FRIST,
    'Hochladen dauerte zu lange'
  );
  if (error) throw error;
}

/** Stammliste und Reiseverzeichnis hochladen. */
export function pushHousehold(delay = 600) {
  if (!isConfigured() || !navigator.onLine || erstabrufOffen) return;
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
          geloescht: state.data.geloescht,
          geloeschtUpdatedAt: state.data.geloeschtUpdatedAt,
          tripIds: Object.keys(state.data.trips),
        });
        pushedRev.set(id, rev);
        letzteTripSignatur = signatur;
      } catch (err) {
        setStatus('error', 'Hochladen fehlgeschlagen', fehlerText(err));
      }
    }, delay)
  );
}

/** Eine Reise hochladen, gebündelt gegen schnelles Abhaken. */
export function push(tripId, delay = 500) {
  if (!isConfigured() || !tripId || !navigator.onLine || erstabrufOffen) return;
  clearTimeout(pushTimers.get(tripId));
  pushTimers.set(
    tripId,
    setTimeout(async () => {
      const trip = state.data.trips[tripId];
      if (!trip || istGeloescht(tripId)) return;
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
        setStatus('error', 'Hochladen fehlgeschlagen', fehlerText(err));
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
  /*
   * Beim Verlassen zählt jede Millisekunde: lokal lagen Änderungen bis zu
   * 120 ms und der Upload bis zu 600 ms in der Warteschlange. Wer die App
   * wegwischt, verlor genau die.
   */
  const abschliessen = () => {
    schreibe();
    for (const [, t] of pushTimers) clearTimeout(t);
    pushTimers.clear();
    if (!isConfigured() || !navigator.onLine || erstabrufOffen) return;
    pushHousehold(0);
    for (const id of Object.keys(state.data.trips)) push(id, 0);
  };
  window.addEventListener('pagehide', abschliessen);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') abschliessen();
  });

  window.addEventListener('online', () => connect());
  window.addEventListener('offline', () => setStatus('offline', 'Offline – wird nachgetragen'));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && isConfigured()) {
      if (client) {
        // Nach der Rückkehr kann der Kanal stillschweigend tot sein.
        pullAll({ knapp: true })
          .then(() => {
            neuversuche = 0;
            subscribeRealtime();
          })
          .catch(() => connect());
      } else connect();
    }
  });
  if (isConfigured()) connect();
}
