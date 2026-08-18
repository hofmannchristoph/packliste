/**
 * Welche Zeilen einer Reise sichtbar sind und wie sie gruppiert werden.
 *
 * Eigenes Modul, weil hier eine Zusicherung hängt, die sich beweisen lassen
 * muss: **jede gezählte Zeile wird auch gezeigt**. Vorher entstanden die
 * Gruppen nur aus den aktiven Bereichen und den mitreisenden Personen, während
 * der Fortschritt alles zählte – wer einen Bereich umbenannte oder eine Person
 * abwählte, sah danach „18 von 20" und suchte zwei Sachen, die auf keinem
 * Bildschirm standen.
 *
 * Ohne DOM lauffähig, damit genau das im Test nachweisbar bleibt.
 */

import { SHARED, personName } from './model.js';
import { beschriftung } from './store.js';
import { kinderVon, resolveParams } from './generator.js';

/**
 * Sichtbare Einträge ohne die Teile von Behältern – die hängen an ihrem
 * Behälter und werden beim Zeichnen darunter eingerückt.
 */
export function visibleItems(trip, filter, istErledigt) {
  /*
   * Ein Teil, dessen Behälter nicht mehr da ist, wird selbst zur obersten
   * Ebene. Sonst hinge es an einem Elternteil, das nirgends gezeichnet wird –
   * es zählte im Fortschritt mit und wäre doch auf keinem Bildschirm zu sehen.
   */
  const vorhanden = (id) => Boolean(trip.items[id]) && !trip.items[id].deleted;
  return Object.values(trip.items)
    .filter((it) => !it.deleted && (!it.parentId || !vorhanden(it.parentId)))
    .filter((it) => (filter.mode === 'offen' ? !istErledigt(trip, it) : true))
    .filter((it) => (filter.who === 'alle' ? true : it.assignee === filter.who));
}

/** Teile eines Behälters, gefiltert wie die Liste selbst. */
export function sichtbareTeile(trip, container, filter) {
  return kinderVon(trip, container.id)
    .filter((k) => (filter.mode === 'offen' ? !k.packed : true))
    .sort((a, b) => beschriftung(a).localeCompare(beschriftung(b), 'de'));
}

export const nachName = (a, b) => beschriftung(a).localeCompare(beschriftung(b), 'de');

/**
 * Zwei Ebenen: aussen die Karte, innen Zwischenüberschriften.
 *
 *   nach Person   → Person   › Bereich   (Christoph › Velo › Trikot kurz)
 *   nach Bereich  → Bereich  › Person
 *
 * Gibt es nur eine Unterebene, entfällt deren Überschrift – sie wäre nur Lärm.
 */
export function groupItems(trip, items, filter, BEREICHE) {
  const groups = [];
  const push = (id, label, ico, abschnitte) => {
    const gefuellt = abschnitte.filter((a) => a.items.length);
    if (!gefuellt.length) return;
    if (gefuellt.length === 1) gefuellt[0] = { ...gefuellt[0], label: null };
    groups.push({ id, label, ico, abschnitte: gefuellt, items: gefuellt.flatMap((a) => a.items) });
  };

  if (filter.group === 'person') {
    for (const id of resolveParams(trip).mit) {
      const eigene = items.filter((it) => it.assignee === id);
      push(
        id,
        personName(id),
        'user',
        BEREICHE().map((cat) => ({
          label: cat.label,
          category: cat.id,
          assignee: id,
          items: eigene.filter((it) => it.category === cat.id).sort(nachName),
        }))
      );
    }
    const shared = items.filter((it) => it.assignee === SHARED);
    for (const cat of BEREICHE()) {
      push(`s-${cat.id}`, cat.label, cat.ico, [
        {
          label: null,
          category: cat.id,
          assignee: SHARED,
          items: shared.filter((it) => it.category === cat.id).sort(nachName),
        },
      ]);
    }
    return mitAuffang(groups, items);
  }

  const reihenfolge = [...resolveParams(trip).mit, SHARED];
  for (const cat of BEREICHE()) {
    const drin = items.filter((it) => it.category === cat.id);
    push(
      cat.id,
      cat.label,
      cat.ico,
      reihenfolge.map((wer) => ({
        label: personName(wer),
        category: cat.id,
        assignee: wer,
        items: drin.filter((it) => it.assignee === wer).sort(nachName),
      }))
    );
  }
  return mitAuffang(groups, items);
}

/**
 * Was in keiner Gruppe gelandet ist, kommt in eine eigene.
 *
 * Die Gruppen entstehen aus den aktiven Bereichen und den mitreisenden
 * Personen. Zeilen, deren Bereich umbenannt oder gelöscht wurde, oder die
 * einer nachträglich abgewählten Person gehören, fielen dadurch aus jeder
 * Gruppe – wurden aber im Fortschritt weitergezählt. „18 von 20" und zwei
 * Sachen, die auf keinem Bildschirm stehen.
 */
function mitAuffang(groups, items) {
  const platziert = new Set(groups.flatMap((g) => g.items.map((it) => it.id)));
  const uebrig = items.filter((it) => !platziert.has(it.id)).sort(nachName);
  if (!uebrig.length) return groups;
  groups.push({
    id: 'auffang',
    label: 'Ohne Zuordnung',
    ico: 'doc',
    abschnitte: [{ label: null, category: null, assignee: null, items: uebrig }],
    items: uebrig,
  });
  return groups;
}
