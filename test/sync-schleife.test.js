/**
 * Die Rückkopplung zwischen Statusmeldung und Upload darf nicht wiederkehren.
 *
 * Vorher galt jeder Verbindungsversuch als Datenänderung: Der Zuhörer zeichnete
 * neu und stiess den nächsten Upload an, der offline scheiterte und wieder den
 * Status setzte. Ein einziger Anstoss ergab so ~2 Neuaufbauten pro Sekunde,
 * dauerhaft.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stelleUmgebung, frisch } from './umgebung.js';

const warte = (ms) => new Promise((r) => setTimeout(r, ms));

test('offline läuft die App nicht im Kreis', async () => {
  stelleUmgebung({ online: false });
  const store = await frisch('../src/store.js');
  const sync = await frisch('../src/sync.js');

  store.load();
  store.saveConfig({ url: 'https://beispiel.supabase.co', key: 'sb_publishable_test' });
  store.createTrip({ name: 'Probe', params: { naechte: 2 } });

  let zeichnungen = 0;
  store.subscribe(() => {
    zeichnungen++;
    sync.pushAll();
  });
  store.subscribeStatus(() => zeichnungen++);

  store.emit();
  const nachAnstoss = zeichnungen;
  await warte(3000);

  assert.ok(
    zeichnungen - nachAnstoss <= 2,
    `nach einem Anstoss dürfen höchstens zwei weitere Zeichnungen folgen, waren ${zeichnungen - nachAnstoss}`
  );
});

test('ein unveränderter Status löst nichts aus', async () => {
  stelleUmgebung({ online: false });
  const store = await frisch('../src/store.js');
  const sync = await frisch('../src/sync.js');
  store.load();

  let meldungen = 0;
  store.subscribeStatus(() => meldungen++);
  await sync.connect();
  const nachErstem = meldungen;
  await sync.connect();

  assert.equal(meldungen, nachErstem, 'derselbe Status darf nicht erneut gemeldet werden');
});

test('ohne Verbindung wird kein Upload geplant', async () => {
  stelleUmgebung({ online: false });
  const store = await frisch('../src/store.js');
  const sync = await frisch('../src/sync.js');
  store.load();
  store.saveConfig({ url: 'https://beispiel.supabase.co', key: 'sb_publishable_test' });
  const trip = store.createTrip({ name: 'Probe', params: {} });

  let status = 0;
  store.subscribeStatus(() => status++);
  sync.push(trip.id, 0);
  sync.pushHousehold(0);
  await warte(300);

  assert.equal(status, 0, 'offline darf ein Push weder laufen noch einen Status melden');
});
