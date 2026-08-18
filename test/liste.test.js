/**
 * Die tragende Zusicherung der Packliste:
 * `progress().total` ist gleich der Zahl der tatsächlich gezeigten Zeilen.
 *
 * Vorher liefen beide auseinander, sobald ein Behälter aus der Regel fiel,
 * eine Person nachträglich abgewählt oder ein Bereich umbenannt wurde. Der
 * Zähler stand auf 20, sichtbar waren 18, und die zwei fehlenden liessen sich
 * über keinen Weg mehr erreichen.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stelleUmgebung, frisch } from './umgebung.js';

const FILTER = { mode: 'alle', who: 'alle', group: 'bereich' };
const istErledigt = (trip, it) => it.packed;

async function aufbau() {
  stelleUmgebung();
  const store = await frisch('../src/store.js');
  const liste = await frisch('../src/liste.js');
  const gen = await frisch('../src/generator.js');
  store.load();
  return { store, liste, gen };
}

/**
 * Alles, was in irgendeiner Gruppe erreichbar ist – Teile eingeschlossen.
 *
 * Behälter selbst zählen nicht, genau wie in `progress()`: sie sind eine
 * Überschrift, kein Gegenstand, den man einpackt.
 */
function gezeigt(liste, gen, trip, bereiche) {
  const oben = liste.visibleItems(trip, FILTER, istErledigt);
  const gruppen = liste.groupItems(trip, oben, FILTER, () => bereiche);
  const ids = new Set();
  for (const g of gruppen)
    for (const it of g.items) {
      if (!it.isContainer) ids.add(it.id);
      for (const k of gen.kinderVon(trip, it.id)) if (!k.isContainer) ids.add(k.id);
    }
  return ids;
}

test('Fortschritt und Anzeige stimmen überein, wenn ein Bereich wegfällt', async () => {
  const { store, liste, gen } = await aufbau();
  const trip = store.createTrip({ name: 'Probe', params: { naechte: 5 } });
  Object.assign(trip, gen.regenerate(trip));

  const alle = store.bereiche();
  const ohneVelo = alle.filter((b) => b.id !== 'velo');
  const pr = gen.progress(trip);
  const sichtbar = gezeigt(liste, gen, trip, ohneVelo);

  assert.equal(sichtbar.size, pr.total, `gezählt ${pr.total}, gezeigt ${sichtbar.size}`);
});

test('Fortschritt und Anzeige stimmen überein, wenn eine Person abgewählt wird', async () => {
  const { store, liste, gen } = await aufbau();
  const trip = store.createTrip({ name: 'Probe', params: { naechte: 4, mit: ['p1', 'p2', 'p3'] } });
  Object.assign(trip, gen.regenerate(trip));
  for (const it of Object.values(trip.items)) it.packed = true;

  // Nach dem Abhaken jemanden abwählen – abgehakte Zeilen bleiben im Bestand.
  trip.params = { ...trip.params, mit: ['p1', 'p2'] };
  Object.assign(trip, gen.regenerate(trip));

  const pr = gen.progress(trip);
  const sichtbar = gezeigt(liste, gen, trip, store.bereiche());
  assert.equal(sichtbar.size, pr.total, `gezählt ${pr.total}, gezeigt ${sichtbar.size}`);
});

test('ein Teil ohne Behälter verschwindet nicht, sondern rückt nach oben', async () => {
  const { store, liste, gen } = await aufbau();
  const trip = store.createTrip({ name: 'Probe', params: { naechte: 5 } });
  Object.assign(trip, gen.regenerate(trip));

  const teil = Object.values(trip.items).find((it) => it.parentId);
  assert.ok(teil, 'die Ausgangsliste muss einen Behälter mit Teilen haben');
  trip.items[teil.parentId] = { ...trip.items[teil.parentId], deleted: true };

  const sichtbar = gezeigt(liste, gen, trip, store.bereiche());
  assert.ok(sichtbar.has(teil.id), 'das verwaiste Teil muss weiter erreichbar sein');
});

test('Fortschritt und Anzeige stimmen überein, wenn ein Behälter aus der Regel fällt', async () => {
  const { store, liste, gen } = await aufbau();
  const trip = store.createTrip({ name: 'Probe', params: { naechte: 6 } });
  Object.assign(trip, gen.regenerate(trip));
  for (const it of Object.values(trip.items)) it.packed = true;

  trip.params = { ...trip.params, naechte: 1 };
  Object.assign(trip, gen.regenerate(trip));

  const pr = gen.progress(trip);
  const sichtbar = gezeigt(liste, gen, trip, store.bereiche());
  assert.equal(sichtbar.size, pr.total, `gezählt ${pr.total}, gezeigt ${sichtbar.size}`);
});

test('eine eingetragene 0 als Obergrenze gilt als Grenze', async () => {
  const { amount, teilMenge } = await import('../src/generator.js');
  const p = { naechte: 9, waschmaschine: false };
  assert.equal(amount({ qtyMode: 'pronacht', qty: 1, cap: 0 }, p), 1, 'cap 0 darf nicht "keine Grenze" heissen');
  assert.equal(amount({ qtyMode: 'pronacht', qty: 1, cap: 3 }, p), 3);
  assert.equal(amount({ qtyMode: 'pronacht', qty: 1 }, p), 9, 'ohne Grenze bleibt es bei der Rechnung');
  assert.equal(teilMenge({ qty: 1, pronacht: true, cap: 0 }, p), 1);
});

test('Bruchfaktoren runden ohne Gleitkomma-Rest auf', async () => {
  const { amount } = await import('../src/generator.js');
  assert.equal(amount({ qtyMode: 'pronacht', qty: 0.14 }, { naechte: 50 }), 7, '0.14 x 50 ist genau 7');
  assert.equal(amount({ qtyMode: 'pronacht', qty: 0.25 }, { naechte: 4 }), 1);
  assert.equal(amount({ qtyMode: 'pronacht', qty: 0.25 }, { naechte: 5 }), 2);
});

test('gleichnamige Teile eines Behälters bleiben getrennt', async () => {
  const { wantedItems } = await import('../src/generator.js');
  const trip = {
    params: { art: 'hotel', naechte: 2, jahreszeit: 'sommer', region: 'inland', aktivitaeten: [], mit: ['p1'], waschmaschine: false },
    master: {
      'm:x': { id: 'm:x', label: 'Tasche', category: 'velo', wer: ['p1'], qtyMode: 'fest', qty: 1,
        arten: [], aktivitaeten: [], jahreszeiten: [], regionen: [], wennDabei: [], minNaechte: 0,
        teile: [{ label: 'Bidon', qty: 1 }, { label: 'Bidon', qty: 1 }] },
    },
  };
  const teile = [...wantedItems(trip).values()].filter((it) => it.parentId);
  assert.equal(teile.length, 2, 'zwei gleichnamige Teile dürfen nicht zu einem werden');
});
