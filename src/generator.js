/**
 * Aus Stammliste + Reise-Angaben wird die Packliste.
 */

import {
  PERSONEN,
  ARTEN_MIT_REGION,
  ART_MIT_WASCHMASCHINE,
  SHARED,
  WER_AUS_WHO,
  byId,
} from './model.js';

/** Kommen die Angaben der Reise mit den Bedingungen des Eintrags zusammen? */
export function matches(item, p) {
  const ok = (list, value) => !list?.length || list.includes(value);
  if (!ok(item.arten, p.art)) return false;
  if (!ok(item.jahreszeiten, p.jahreszeit)) return false;
  if (item.regionen?.length) {
    // Region gilt nur bei Reisearten, die überhaupt eine haben.
    if (!ARTEN_MIT_REGION.includes(p.art)) return false;
    if (!item.regionen.includes(p.region)) return false;
  }
  if (item.aktivitaeten?.length && !item.aktivitaeten.some((a) => p.aktivitaeten.includes(a))) return false;
  if (item.wennDabei?.length && !item.wennDabei.some((id) => p.mit.includes(id))) return false;
  if (item.minNaechte && p.naechte < item.minNaechte) return false;
  return true;
}

/** Menge für eine Reise: feste Stückzahl oder aus den Nächten gerechnet. */
/**
 * Menge eines Eintrags für diese Reise.
 *
 * Zwei Feinheiten, die vorher falsch waren: Eine ausdrücklich eingetragene 0
 * als Obergrenze wurde als „keine Grenze" gelesen, weil `0` unwahr ist – aus
 * `cap: 0` wurden bei neun Nächten neun Stück. Und das Aufrunden traf bei
 * Bruchfaktoren die Gleitkomma-Ungenauigkeit: 0.14 × 50 ergibt 7.000000000001
 * und damit acht statt sieben.
 */
const gesetzt = (w) => typeof w === 'number' && Number.isFinite(w);
/** Aufrunden mit etwas Toleranz gegen Gleitkomma-Reste. */
const aufrunden = (x) => Math.ceil(Number(x.toFixed(6)));

export function amount(item, p) {
  if (item.qtyMode !== 'pronacht') return Math.max(1, Math.round(item.qty || 1));
  const roh = aufrunden((item.qty || 1) * p.naechte) + (item.plus || 0);
  const grenze = p.waschmaschine && gesetzt(item.capWasch) ? item.capWasch : item.cap;
  return Math.max(1, gesetzt(grenze) ? Math.min(roh, grenze) : roh);
}

/**
 * Die Personen, für die der Eintrag gilt.
 * Alte Einträge tragen noch `who` – die werden hier mit übersetzt.
 */
export function werVon(item) {
  if (Array.isArray(item.wer)) return item.wer;
  if (item.who) return WER_AUS_WHO[item.who] ?? [item.who];
  return [];
}

/**
 * Wer bekommt den Eintrag? Leeres `wer` heisst ein gemeinsamer Eintrag.
 * Sind Personen genannt, gibt es eine Zeile pro mitreisender Person.
 * Leeres Ergebnis = Eintrag entfällt.
 */
export function targetsFor(item, p) {
  const wer = werVon(item);
  if (!wer.length) return [{ id: SHARED, name: 'Gemeinsam' }];
  return wer
    .filter((id) => p.mit.includes(id))
    .map((id) => byId(PERSONEN, id))
    .filter(Boolean);
}

/** Angaben der Reise, ergänzt um das, was sich daraus ergibt. */
export function resolveParams(trip) {
  const p = trip.params;
  return {
    ...p,
    naechte: Math.max(1, p.naechte || 1),
    aktivitaeten: p.aktivitaeten ?? [],
    mit: p.mit?.length ? p.mit : PERSONEN.map((x) => x.id),
    region: ARTEN_MIT_REGION.includes(p.art) ? p.region ?? 'inland' : 'inland',
    waschmaschine: ART_MIT_WASCHMASCHINE.includes(p.art) ? true : Boolean(p.waschmaschine),
  };
}

/** Teile eines Behälters, bereinigt und immer als Objekt. */
export const teileVon = (m) =>
  (m.teile ?? [])
    .map((t) => {
      const o = typeof t === 'string' ? { label: t } : t;
      return {
        label: String(o.label ?? '').trim(),
        qty: Number(o.qty) || 1,
        pronacht: Boolean(o.pronacht),
        plus: Number(o.plus) || 0,
        cap: Number(o.cap) || null,
        arten: o.arten ?? [],
        aktivitaeten: o.aktivitaeten ?? [],
        jahreszeiten: o.jahreszeiten ?? [],
        regionen: o.regionen ?? [],
        wennDabei: o.wennDabei ?? [],
        minNaechte: Number(o.minNaechte) || 0,
      };
    })
    .filter((t) => t.label);

/**
 * Menge eines einzelnen Teils. Pro Nacht rechnet wie beim ganzen Eintrag:
 * Faktor mal Nächte, plus Zuschlag, gedeckelt durch das Maximum.
 */
export function teilMenge(teil, p) {
  const n = Number(teil.qty) || 1;
  if (!teil.pronacht) return Math.max(1, Math.round(n));
  const roh = aufrunden(n * p.naechte) + (Number(teil.plus) || 0);
  // Wie bei amount(): eine eingetragene 0 ist eine Grenze, kein fehlender Wert.
  const grenze = gesetzt(Number(teil.cap)) ? Number(teil.cap) : null;
  return Math.max(1, gesetzt(grenze) ? Math.min(roh, grenze) : roh);
}

/**
 * Alle Einträge, die sich aus dem aktuellen Stand ergeben.
 *
 * Ein Eintrag mit `teile` wird zum Behälter: er selbst erscheint als
 * Überschrift, und jedes Teil bekommt eine eigene Zeile zum Abhaken. Die IDs
 * der Teile hängen am Text, nicht an der Position – so bleibt Abgehaktes
 * erhalten, wenn in der Stammliste ein Teil davor eingefügt wird.
 */
export function wantedItems(trip) {
  const p = resolveParams(trip);
  const wanted = new Map();
  for (const m of Object.values(trip.master ?? {})) {
    if (m.deleted || !matches(m, p)) continue;
    const alleTeile = teileVon(m);
    /*
     * Teile tragen eigene Bedingungen und werden einzeln geprüft – der
     * Rasierer liegt in Lenz schon dort und lohnt sich bei zwei Nächten nicht.
     * Bleibt davon nichts übrig, entfällt der Behälter mit.
     */
    const teile = alleTeile.filter((t) => matches(t, p));
    if (alleTeile.length && !teile.length) continue;
    const qty = amount(m, p);
    for (const target of targetsFor(m, p)) {
      const id = `${m.id}#${target.id}`;
      wanted.set(id, {
        id,
        masterId: m.id,
        label: m.label,
        category: m.category,
        qty: teile.length ? 1 : qty,
        assignee: target.id,
        note: m.note ?? '',
        source: 'auto',
        isContainer: teile.length > 0,
      });
      /*
       * Die ID eines Teils hängt an seiner Stelle im Behälter, nicht an seiner
       * Bezeichnung. Zwei gleichnamige Teile fielen sonst still zu einer Zeile
       * zusammen, und ein umbenanntes Teil verlor sein Häkchen.
       */
      teile.forEach((teil, idx) => {
        const tid = `${id}#t${idx}`;
        wanted.set(tid, {
          id: tid,
          masterId: m.id,
          parentId: id,
          label: teil.label,
          category: m.category,
          qty: teilMenge(teil, p),
          assignee: target.id,
          note: '',
          source: 'auto',
          isContainer: false,
        });
      });
    }
  }
  return wanted;
}

/**
 * Liste neu berechnen und mit dem bestehenden Stand zusammenführen.
 *
 *  - Abgehaktes bleibt abgehakt.
 *  - Von Hand geänderte Mengen und Notizen bleiben.
 *  - Gelöschtes (`dismissed`) kommt nicht zurück.
 *  - Was nicht mehr passt, verschwindet – ausser es ist abgehakt oder
 *    angepasst, dann bleibt es als eigener Eintrag stehen.
 */
export function regenerate(trip, now = Date.now()) {
  const wanted = wantedItems(trip);
  const items = { ...trip.items };
  const dismissed = trip.dismissed ?? {};
  let added = 0;
  let removed = 0;

  for (const [id, w] of wanted) {
    if (dismissed[id]?.weg === true || dismissed[id] === true) continue;
    const cur = items[id];
    if (!cur) {
      items[id] = { ...w, packed: false, deleted: false, updatedAt: now };
      added++;
      continue;
    }
    const qty = cur.qtyOverride ? cur.qty : w.qty;
    const changed = cur.deleted || cur.qty !== qty || cur.label !== w.label || cur.category !== w.category;
    if (cur.deleted) added++;
    items[id] = {
      ...cur,
      label: cur.labelOverride ? cur.label : w.label,
      category: w.category,
      note: cur.noteOverride ? cur.note : w.note,
      qty,
      assignee: cur.assigneeOverride ? cur.assignee : w.assignee,
      masterId: w.masterId,
      parentId: w.parentId,
      isContainer: w.isContainer,
      source: 'auto',
      deleted: false,
      updatedAt: changed ? now : cur.updatedAt,
    };
  }

  for (const it of Object.values(items)) {
    if (it.source !== 'auto' || wanted.has(it.id) || it.deleted) continue;
    if (it.packed || it.qtyOverride || it.noteOverride || it.labelOverride) {
      items[it.id] = { ...it, source: 'manual', updatedAt: now };
    } else {
      items[it.id] = { ...it, deleted: true, updatedAt: now };
      removed++;
    }
  }

  return { items, added, removed };
}

/** Kinder eines Behälters. */
export function kinderVon(trip, containerId) {
  return Object.values(trip.items ?? {}).filter((it) => it.parentId === containerId && !it.deleted);
}

/** Stand eines Behälters – abgeleitet aus seinen Teilen. */
export function containerStand(trip, container) {
  const kinder = kinderVon(trip, container.id);
  const done = kinder.filter((k) => k.packed).length;
  return { total: kinder.length, done, packed: kinder.length > 0 && done === kinder.length };
}

/**
 * Fortschritt, optional für eine Person.
 * Behälter zählen nicht mit – gezählt wird, was man einzeln abhakt.
 */
export function progress(trip, assignee = null) {
  let total = 0;
  let done = 0;
  for (const it of Object.values(trip.items ?? {})) {
    if (it.deleted || it.isContainer) continue;
    if (assignee && it.assignee !== assignee) continue;
    total++;
    if (it.packed) done++;
  }
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
}
