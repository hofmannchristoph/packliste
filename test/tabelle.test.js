/**
 * Der Weg Tabelle → App muss verlustfrei sein und darf nichts still verlieren.
 *
 * Drei Fehler, die der Review gefunden hat: zwei Bereiche fielen wegen eines
 * gekürzten Schlüssels zusammen, ein Teil vor seinem Behälter liess den Import
 * abbrechen (obwohl der Export Sortierfestigkeit zusagt), und eine Zeile mit
 * Schlüssel, aber ohne Gegenstand verschwand kommentarlos.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_BEREICHE, DEFAULT_AKTIVITAETEN } from '../src/model.js';
import { leseTabelle, alsTabelle } from '../src/tabelle.js';
import { seedMaster } from '../src/seed.js';

const OPT = { bereiche: DEFAULT_BEREICHE, aktivitaeten: DEFAULT_AKTIVITAETEN };
const T = (reihen) => reihen.map((r) => r.join('\t')).join('\n');

test('lange, ähnliche Bereichsnamen bekommen verschiedene Schlüssel', () => {
  const r = leseTabelle(
    T([
      ['Bereich', 'Gegenstand'],
      ['Ausrüstung für die Kinder im Sommer', 'Schwimmflügel'],
      ['Ausrüstung für die Kinder im Winter', 'Schlitten'],
    ]),
    OPT
  );
  const ids = r.bereiche.map((b) => b.id);
  assert.equal(new Set(ids).size, ids.length, `Schlüssel fielen zusammen: ${ids}`);
  assert.equal(r.fehler.length, 0);
});

test('ein Teil darf vor seinem Behälter stehen', () => {
  const r = leseTabelle(
    T([
      ['Schlüssel', 'Bereich', 'Gegenstand', 'Teil von'],
      ['', 'Velo', 'Bidon', 'm:behaelter'],
      ['m:behaelter', 'Velo', 'Velotasche', ''],
    ]),
    OPT
  );
  assert.deepEqual(r.fehler, []);
  assert.deepEqual(
    r.master['m:behaelter'].teile.map((t) => t.label),
    ['Bidon']
  );
});

test('eine Zeile mit Schlüssel, aber ohne Gegenstand wird bemängelt', () => {
  const r = leseTabelle(
    T([
      ['Schlüssel', 'Bereich', 'Gegenstand'],
      ['m:kl.hose', 'Kleidung', ''],
      ['', 'Kleidung', 'Jacke'],
    ]),
    OPT
  );
  assert.equal(r.fehler.length, 1, 'der stille Verlust muss auffallen');
  assert.match(r.fehler[0], /Zeile 2/);
});

test('eine wirklich leere Zeile stört nicht', () => {
  const r = leseTabelle(T([['Bereich', 'Gegenstand'], ['', ''], ['Kleidung', 'Jacke']]), OPT);
  assert.deepEqual(r.fehler, []);
});

test('der Rundlauf über die ganze Stammliste bleibt verlustfrei', () => {
  const master = seedMaster(1);
  const stand = { master, bereiche: DEFAULT_BEREICHE, aktivitaeten: DEFAULT_AKTIVITAETEN };
  for (const trenner of ['\t', ';', ',']) {
    const r = leseTabelle(alsTabelle(stand, trenner), OPT);
    assert.deepEqual(r.fehler, [], `Trenner ${JSON.stringify(trenner)}`);
    assert.equal(Object.keys(r.master).length, Object.keys(master).length);
    const felder = ['label', 'category', 'qtyMode', 'qty', 'plus', 'cap', 'capWasch',
      'arten', 'aktivitaeten', 'jahreszeiten', 'regionen', 'wennDabei', 'minNaechte', 'note'];
    for (const [id, a] of Object.entries(master)) {
      const b = r.master[id];
      assert.ok(b, `${id} fehlt`);
      for (const f of felder) assert.deepEqual(b[f] ?? null, a[f] ?? null, `${id}.${f}`);
      assert.equal((b.teile ?? []).length, (a.teile ?? []).length, `${id}.teile`);
    }
  }
});

test('die alte Kurzform who landet in wer statt ins Leere', async () => {
  const { stelleUmgebung, frisch } = await import('./umgebung.js');
  stelleUmgebung();
  const store = await frisch('../src/store.js');
  store.load();
  const id = store.addMasterItem({ label: 'Sonnenhut', category: 'kleidung', who: 'p2' });
  assert.deepEqual(store.state.data.master[id].wer, ['p2']);

  const id2 = store.addMasterItem({ label: 'Zelt', category: 'ausruestung', who: 'erwachsene' });
  assert.deepEqual(store.state.data.master[id2].wer, ['p1', 'p2']);

  const id3 = store.addMasterItem({ label: 'Karte', category: 'ausruestung' });
  assert.deepEqual(store.state.data.master[id3].wer, [], 'ohne Angabe bleibt es gemeinsam');
});
