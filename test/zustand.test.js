/**
 * Der lokale Zustand muss Fehler überleben, statt sie zu verschlucken.
 *
 * Drei Fälle, die vorher still schiefgingen: ein unlesbarer Datensatz erzeugte
 * einen neuen, leeren Haushalt; ein volles Speicherkontingent hörte auf zu
 * speichern, ohne dass es jemand erfuhr; und eine unbrauchbare Fremdzeile
 * legte Ansicht und Export gemeinsam lahm.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stelleUmgebung, frisch } from './umgebung.js';

test('ein unlesbarer Zustand behält die Haushalts-ID und legt den Rohtext beiseite', async () => {
  const ablage = stelleUmgebung();
  const store = await frisch('../src/store.js');
  store.load();
  const id = store.state.data.householdId;
  store.schreibe();

  // Datensatz beschädigen, wie es ein abgebrochener Schreibvorgang täte.
  ablage.set('packliste.state.v3', '{"trips":{"a":');

  const store2 = await frisch('../src/store.js');
  store2.load();

  assert.equal(store2.state.data.householdId, id, 'die Anbindung an den Haushalt muss bleiben');
  assert.equal(store2.state.speicherFehler?.art, 'lesen', 'der Fehler muss sichtbar sein');
  assert.equal(ablage.get('packliste.state.v3.defekt'), '{"trips":{"a":', 'der Rohtext muss gesichert sein');
});

test('ein volles Speicherkontingent wird gemeldet statt geschluckt', async () => {
  stelleUmgebung({ quota: 200 });
  const store = await frisch('../src/store.js');
  store.load();

  let gemeldet = 0;
  store.subscribeStatus(() => gemeldet++);
  const ok = store.schreibe();

  assert.equal(ok, false, 'schreibe() muss das Scheitern zurückgeben');
  assert.equal(store.state.speicherFehler?.art, 'schreiben');
  assert.ok(gemeldet > 0, 'die Oberfläche muss davon erfahren');
});

test('eine unbrauchbare Fremdzeile bringt weder Ansicht noch Export zu Fall', async () => {
  stelleUmgebung();
  const store = await frisch('../src/store.js');
  const { alsTabelle } = await frisch('../src/tabelle.js');
  store.load();

  store.mergeHaushalt({
    kind: 'household',
    bereiche: { 'b:kaputt': { id: 'b:kaputt', updatedAt: Date.now() + 10000 } },
    bereicheUpdatedAt: Date.now() + 10000,
    master: { 'm:kaputt': { id: 'm:kaputt', updatedAt: Date.now() + 10000 } },
    masterUpdatedAt: Date.now() + 10000,
  });

  assert.doesNotThrow(() => store.bereiche(), 'bereiche() darf nicht werfen');
  assert.doesNotThrow(
    () => alsTabelle({ master: store.state.data.master, bereiche: store.bereiche(), aktivitaeten: store.aktivitaeten() }),
    'der Export ist der Rettungsweg und muss immer gehen'
  );
});

test('offensichtlicher Unsinn aus der Ferne wird gar nicht erst übernommen', async () => {
  stelleUmgebung();
  const store = await frisch('../src/store.js');
  store.load();
  const vorher = Object.keys(store.state.data.bereiche).length;

  store.mergeHaushalt({
    kind: 'household',
    bereiche: { 'b:unsinn': 'kein Objekt', 'b:auchunsinn': [1, 2, 3] },
    bereicheUpdatedAt: Date.now() + 10000,
  });

  assert.equal(Object.keys(store.state.data.bereiche).length, vorher, 'nichts davon darf hängenbleiben');
});

test('Verweise auf gelöschte Aktivitäten werden abgestreift', async () => {
  stelleUmgebung();
  const store = await frisch('../src/store.js');
  store.load();

  const badehose = store.state.data.master['m:kl.badehose'];
  assert.ok(badehose.aktivitaeten.includes('wellness'), 'Ausgangslage: der Verweis ist da');

  // Aktivität von aussen entfernen, ohne removeAktivitaet – wie es der Abgleich täte.
  store.state.data.aktivitaeten['wellness'] = {
    ...store.state.data.aktivitaeten['wellness'],
    deleted: true,
  };
  const geaendert = store.raeumeVerweise();

  assert.ok(geaendert > 0, 'es muss etwas aufgeräumt worden sein');
  assert.deepEqual(store.state.data.master['m:kl.badehose'].aktivitaeten, ['badi']);
});

test('auch die Bedingungen eines Behälterteils werden mitgeräumt', async () => {
  stelleUmgebung();
  const store = await frisch('../src/store.js');
  store.load();

  const id = store.addMasterItem({
    label: 'Wellnesstasche',
    category: 'bad',
    teile: [{ label: 'Bademantel', qty: 1, aktivitaeten: ['wellness'] }],
  });
  store.removeAktivitaet('wellness');

  assert.deepEqual(store.state.data.master[id].teile[0].aktivitaeten, [],
    'ein Teil darf nicht an eine Aktivität gebunden bleiben, die es nicht gibt');
});

test('ein Eintrag ohne gültigen Bereich verschwindet nicht', async () => {
  stelleUmgebung();
  const store = await frisch('../src/store.js');
  store.load();
  const id = store.addMasterItem({ label: 'Waise', category: 'gibtesnicht' });
  store.raeumeVerweise();
  const bereiche = store.bereiche().map((b) => b.id);
  assert.ok(bereiche.includes(store.state.data.master[id].category),
    'der Eintrag muss in einem vorhandenen Bereich landen');
});
