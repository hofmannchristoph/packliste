/**
 * Ausgangsstand der Stammliste.
 *
 * Diese Datei wird nur beim ersten Start (oder über „Stammliste zurücksetzen")
 * gelesen. Danach lebt die Stammliste als Daten in der App und wird dort
 * bearbeitet – nicht mehr hier.
 *
 * Felder je Eintrag:
 *   key            eindeutig und stabil, daran hängt der Abhak-Status
 *   label          Text auf der Liste
 *   category       Bereich
 *   who            Kurzform, wird zu `wer` aufgelöst:
 *                  'gemeinsam' (leer) | 'alle' | 'erwachsene' | 'kinder' | 'p1'…'p4'
 *   wer            Liste von Person-IDs. Leer = ein gemeinsamer Eintrag.
 *   qtyMode        'fest' (Stückzahl, 1 = einfache Zeile) | 'pronacht'
 *   qty            fest: Stückzahl · pronacht: Faktor pro Nacht
 *   plus           pronacht: Zuschlag, z.B. Faktor 1 + 2 = Nächte + 2
 *   cap/capWasch   Obergrenze, capWasch gilt wenn eine Waschmaschine da ist
 *   arten          leer = bei jeder Reiseart
 *   aktivitaeten   leer = unabhängig von den Aktivitäten
 *   jahreszeiten   leer = zu jeder Jahreszeit
 *   regionen       leer = in jeder Region
 *   wennDabei      mindestens eine dieser Personen muss mitkommen
 *   minNaechte     erst ab dieser Anzahl Nächte
 *   teile          Inhalt eines Behälters, z.B. das Necessaire. Jedes Teil
 *                  wird auf der Liste einzeln abgehakt. Kurzform: einfacher
 *                  Text, oder `{ label, qty, pronacht }` für eigene Mengen.
 */

import { WER_AUS_WHO } from './model.js';

const NICHT_LENZ = ['basislager', 'hotel'];
const NUR_CAMPER = ['basislager'];
const KALT = ['herbst', 'winter'];
const WARM = ['fruehling', 'sommer'];
const KINDER = ['p3', 'p4'];
const AUSLAND = ['schengen', 'europa', 'fern'];
const BIKE = ['mtb', 'gravel'];

/** Ein Teil eines Behälters, immer als Objekt mit eigener Menge. */
export const teilObjekt = (t) =>
  typeof t === 'string'
    ? { label: t.trim(), qty: 1, pronacht: false }
    : { label: String(t.label ?? '').trim(), qty: Number(t.qty) || 1, pronacht: Boolean(t.pronacht) };

/** Kurzschreibweise. Alles nicht Angegebene ist unbeschränkt. */
const i = (key, label, o = {}) => ({
  key,
  label,
  category: o.category,
  wer: o.wer ?? (o.who ? WER_AUS_WHO[o.who] ?? [o.who] : []),
  qtyMode: o.pn ? 'pronacht' : 'fest',
  qty: o.pn ?? o.q ?? 1,
  plus: o.plus ?? 0,
  cap: o.cap ?? null,
  capWasch: o.capWasch ?? null,
  arten: o.arten ?? [],
  aktivitaeten: o.akt ?? [],
  jahreszeiten: o.jz ?? [],
  regionen: o.reg ?? [],
  wennDabei: o.dabei ?? [],
  minNaechte: o.min ?? 0,
  teile: (o.teile ?? []).map(teilObjekt),
  note: o.note ?? '',
});

/** Alle Einträge eines Bereichs auf einmal. */
const group = (category, items) => items.map((it) => ({ ...it, category }));

export const SEED = [
  // =========================================================================
  ...group('kleidung', [
    i('kl.unterhosen', 'Unterhosen', { who: 'erwachsene', pn: 1, plus: 1, cap: 12, capWasch: 8 }),
    i('kl.socken', 'Socken', { who: 'erwachsene', pn: 1, plus: 1, cap: 12, capWasch: 8 }),
    i('kl.tshirt', 'T-Shirt', { who: 'erwachsene', pn: 1, cap: 10, capWasch: 7 }),
    i('kl.bh', 'BHs', { who: 'p2' }),
    i('kl.unterliibli', 'Unterliibli', { who: 'erwachsene', q: 2, jz: KALT }),
    i('kl.hoodie', 'Hoodie / Pullover', { who: 'erwachsene', q: 2 }),
    i('kl.faserpelz', 'Faserpelz', { who: 'erwachsene' }),
    i('kl.midlayer', 'Midlayer', { who: 'erwachsene' }),
    i('kl.hose_lang', 'Hose lang', { who: 'erwachsene' }),
    i('kl.hose_kurz', 'Hose kurz', { who: 'erwachsene', jz: WARM }),
    i('kl.jeans', 'Jeans lang', { who: 'p2' }),
    i('kl.stoffhose', 'Stoffhose kurz', { who: 'p2', jz: WARM }),
    i('kl.leggings', 'Leggings kurz', { who: 'p2', jz: WARM }),
    i('kl.roeckli', 'Röckli', { who: 'p2' }),
    i('kl.wanderhose', 'Wanderhose', { who: 'erwachsene', akt: ['wandern'] }),
    i('kl.trainerhose', 'Trainerhose', { who: 'erwachsene' }),
    i('kl.pyjama', 'Pyjama', { who: 'erwachsene' }),
    i('kl.badehose', 'Badehose', { who: 'erwachsene', akt: ['badi', 'wellness'] }),
    i('kl.regenjacke', 'Regenjacke', { who: 'erwachsene' }),
    i('kl.rotauf', 'Rotauf Jacke', { who: 'p1', note: 'Abende auf 1250 m' }),
    i('kl.winterjacke', 'Winterjacke', { who: 'erwachsene', jz: ['winter'] }),
    i('kl.muetze', 'Mütze & Handschuhe', { who: 'erwachsene', jz: KALT }),
    i('kl.thermo', 'Thermounterwäsche', { who: 'erwachsene', q: 2, akt: ['ski'] }),
    i('kl.schick', 'Etwas Schickes für auswärts', { who: 'erwachsene', akt: ['ausgehen'] }),
    i('kl.sonnenzeug', 'Sonnenzeug', { who: 'erwachsene', teile: ['Sonnenbrille', 'Sonnenhut', 'Halstuch', 'Stirnband'] }),

    i('ki.unterhosen', 'Unterhosen', { who: 'kinder', pn: 1, plus: 2, cap: 14, capWasch: 9 }),
    i('ki.unterliibli', 'Unterliibli', { who: 'kinder', q: 2 }),
    i('ki.socken', 'Socken', { who: 'kinder', pn: 1, plus: 2, cap: 14, capWasch: 9 }),
    i('ki.tshirt', 'T-Shirt kurz und lang', { who: 'kinder', pn: 1, plus: 1, cap: 12, capWasch: 8 }),
    i('ki.hose_lang', 'Hose lang', { who: 'p3', q: 2 }),
    i('ki.hose_kurz', 'Hose kurz', { who: 'p3', q: 2, jz: WARM }),
    i('ki.leggings_lang', 'Hosen / Leggings lang', { who: 'p4', q: 2 }),
    i('ki.leggings_kurz', 'Hosen / Leggings kurz', { who: 'p4', q: 2, jz: WARM }),
    i('ki.pullover', 'Pullover', { who: 'kinder', q: 2 }),
    i('ki.faserpelz', 'Faserpelz', { who: 'kinder' }),
    i('ki.jacke', 'Jacke', { who: 'kinder' }),
    i('ki.regenzeug', 'Regenhose und Regenjacke', { who: 'kinder' }),
    i('ki.pischi', 'Pischi', { who: 'kinder', q: 2 }),
    i('ki.gesichtslumpen', 'Gesichtslumpen', { who: 'kinder', q: 3 }),
    i('ki.badehose', 'Badehose + UV-Shirt', { who: 'kinder', akt: ['badi'] }),
    i('ki.latz', 'Latz', { who: 'p4', q: 3 }),
    i('ki.sonnenzeug', 'Sonnenzeug', { who: 'kinder', teile: ['Sonnenbrille', 'Sonnenhut', 'Kappe', 'Halstuch'] }),
  ]),

  // =========================================================================
  ...group('schuhe', [
    i('sch.sneaker', 'Sneaker', { who: 'alle' }),
    i('sch.sandalen', 'Sandalen', { who: 'alle', jz: WARM }),
    i('sch.birkenstock', 'Birkenstock', { who: 'erwachsene' }),
    i('sch.trekking', 'Trekkingschuhe', { who: 'erwachsene', akt: ['wandern', 'klettern'] }),
    i('sch.wanderschuhe_kind', 'Wanderschuhe', { who: 'kinder', akt: ['wandern'] }),
    i('sch.gummistiefel', 'Gummistiefel', { who: 'kinder' }),
    i('sch.winterstiefel', 'Winterstiefel', { who: 'alle', jz: ['winter'] }),
    i('sch.laufschuhe', 'Laufschuhe', { who: 'erwachsene', akt: ['sport'] }),
    i('sch.badeschlappen', 'Badeschlappen', { who: 'alle', akt: ['badi', 'wellness'] }),
  ]),

  // =========================================================================
  ...group('bad', [
    i('bad.necessaire_p1', 'Necessaire', { who: 'p1', teile: ['Zahnbürste & Zahnpasta', 'Deo', 'Haargel', 'Kamm', 'Rasierer', 'Trimmer'] }),
    i('bad.medis_p1', 'Medis', { who: 'p1', teile: ['Pantoprazol', 'Symbicort', 'Nasenspray'] }),
    i('bad.necessaire_p2', 'Necessaire', { who: 'p2', teile: ['Zahnbürste & Zahnpasta', 'Bürste', 'Cremen', 'Deo', 'Rasierer', 'Duschmittel', 'Shampoo'] }),
    i('bad.kleinzeug_p2', 'Kleinzeug', { who: 'p2', teile: ['Nagelschere', 'Pinzette', 'Ohrenstäbli'] }),
    i('bad.obs', 'OBs und Binden', { who: 'p2' }),
    i('bad.medis_p2', 'Medikamente', { who: 'p2' }),
    i('bad.zahnbuersten_kinder', 'Zahnbürsten und Zahnpasta Kinder', { dabei: KINDER }),
    i('bad.buersten_kinder', 'Bürsten Kinder', { dabei: KINDER }),
    i('bad.shampoo_kinder', 'Shampoo Kinder', { dabei: KINDER }),
    i('bad.toilettentuecher', 'Toilettenfeuchttücher', { dabei: KINDER }),
    i('bad.duschtuechli', 'Duschtüechli alle', { arten: NUR_CAMPER }),
    i('bad.badetuecher', 'Grosse Badetücher extra', { q: 2, akt: ['badi'], arten: NICHT_LENZ }),
    i('bad.sonnencreme', 'Sonnencreme', { note: 'Höhensonne' }),
    i('bad.aftersun', 'Aftersun', { jz: WARM }),
    i('bad.insektenspray', 'Insektenspray', { jz: ['fruehling', 'sommer', 'herbst'] }),
    i('bad.nastuechli', 'Nastüechli' ),
    i('bad.pflaster', 'Pflaster + Steristrip'),
    i('bad.schmerzsirup', 'Schmerzsirup Kinder + Itinerolzäpfli', { dabei: KINDER }),
    i('bad.schmerztabletten', 'Schmerztabletten'),
    i('bad.fiebermesser', 'Fiebermesser'),
    i('bad.arnica', 'Salben', { teile: ['Arnica', 'Fenistil', 'Perskindol'] }),
    i('bad.imodium', 'Imodium'),
    i('bad.augentropfen', 'Augentropfen + Nasenspray'),
    i('bad.blasenpflaster', 'Blasenpflaster', { akt: ['wandern'] }),
    i('bad.erstehilfe', 'Erste-Hilfe-Set', { akt: [...BIKE, 'wandern', 'klettern'] }),
  ]),

  // =========================================================================
  ...group('dokumente', [
    i('do.id', 'Identitätskarte', { who: 'erwachsene' }),
    i('do.ausweise_kinder', 'Ausweise Kinder', { dabei: KINDER }),
    i('do.krankenkasse', 'Krankenkassenkarten'),
    i('do.pass', 'Reisepass', { who: 'alle', reg: ['europa', 'fern'] }),
    i('do.fuehrerschein', 'Führerausweis', { who: 'erwachsene', arten: NUR_CAMPER }),
    i('do.fahrzeugpapiere', 'Fahrzeugpapiere & Vignette', { arten: NUR_CAMPER }),
    i('do.karten', 'Kredit-/Debitkarte', { who: 'erwachsene' }),
    i('do.bargeld', 'Bargeld', { akt: ['fest'] }),
    i('do.fremdwaehrung', 'Fremdwährung besorgen', { reg: ['europa', 'fern'] }),
    i('do.buchungen', 'Buchungen offline gespeichert', { arten: ['hotel'] }),
    i('do.reservation', 'Reservation Camping auf dem Handy', { arten: NUR_CAMPER }),
    i('do.skipass', 'Skipass / Voucher', { akt: ['ski'] }),
  ]),

  // =========================================================================
  ...group('technik', [
    i('te.taeschli_p1', 'Täschli', { who: 'p1', teile: ['Airpods', 'Portemonnaie', 'Sonnenbrille', 'Sonnenhut'] }),
    i('te.rucksack_p1', 'Rucksack', { who: 'p1', teile: ['iPad', 'Ladetäschli'] }),
    i('te.kamera_p1', 'Kameratasche', { who: 'p1', akt: ['fotografie'] }),
    i('te.ipad_p2', 'iPad + Ladekabel aus Küche', { who: 'p2' }),
    i('te.buch_p2', 'Buch', { who: 'p2' }),
    i('te.handy', 'Handy & Ladekabel', { who: 'erwachsene' }),
    i('te.powerbank', 'Powerbank'),
    i('te.mehrfachstecker', 'Mehrfachstecker', { min: 3 }),
    i('te.laptop', 'Laptop & Netzteil', { akt: ['arbeiten'] }),
    i('te.adapter', 'Reiseadapter', { reg: ['europa', 'fern'] }),
    i('te.halter', 'Handyhalterung & Autoladekabel', { arten: NUR_CAMPER }),
    i('te.stirnlampe', 'Taschenlampe / Stirnlampe', { arten: NICHT_LENZ }),
    i('te.ueboom', 'UE Boom'),
    i('te.foehn', 'Föhn', { arten: NUR_CAMPER }),
    i('te.offline', 'Offline-Karten & Musik geladen'),
    i('te.roaming', 'Roaming / Reisepaket aktivieren', { reg: AUSLAND }),
  ]),

  // =========================================================================
  ...group('velo', [
    i('ve.crafty', 'Crafty Christoph', { akt: ['mtb'], dabei: ['p1'] }),
    i('ve.wild', 'Wild Debora', { akt: ['mtb'], dabei: ['p2'] }),
    i('ve.terra', 'Terra Christoph', { akt: ['gravel'], dabei: ['p1'] }),
    i('ve.trampivelo_laurin', 'Trampivelo Laurin', { dabei: ['p3'] }),
    i('ve.laufvelo_noemi', 'Laufvelo Noemi', { dabei: ['p4'] }),
    i('ve.trampivelo_noemi', 'Trampivelo Noemi', { dabei: ['p4'] }),
    i('ve.helm_erw', 'Bikehelm', { who: 'erwachsene', akt: BIKE }),
    i('ve.gravelhelm', 'Gravelhelm + Gravel-Trikots', { who: 'erwachsene', akt: ['gravel'] }),
    i('ve.fullface_p3', 'Fullfacehelm', { who: 'p3', akt: ['mtb'] }),
    i('ve.helm_p4', 'Helm', { who: 'p4' }),
    i('ve.velohandschuhe_kinder', 'Velohandschuhe Kinder', { dabei: KINDER }),
    i('ve.klickschuhe', 'Klickschuhe + Flatschuhe', { who: 'erwachsene', akt: BIKE }),
    i('ve.knieschoner', 'Knieschoner', { who: 'erwachsene', akt: ['mtb'] }),
    i('ve.bikerucksack', 'Bikerucksack + Brille', { who: 'erwachsene', akt: BIKE }),
    i('ve.trikot_kurz', 'Trikot kurz', { who: 'erwachsene', akt: BIKE, pn: 0.6, plus: 1, cap: 6, capWasch: 4 }),
    i('ve.trikot_lang', 'Trikot lang', { who: 'erwachsene', akt: BIKE }),
    i('ve.velohosen', 'Velohosen kurz', { who: 'erwachsene', akt: BIKE, pn: 0.8, plus: 1, cap: 6, capWasch: 4 }),
    i('ve.velounterliibli', 'Velounterliibli', { who: 'erwachsene', akt: BIKE, pn: 0.8, plus: 1, cap: 6, capWasch: 4 }),
    i('ve.velosocken', 'Velosocken', { who: 'erwachsene', akt: BIKE, pn: 0.8, plus: 1, cap: 6, capWasch: 4 }),
    i('ve.veste', 'Veste', { who: 'erwachsene', akt: BIKE }),
    i('ve.bidon', 'Bidon', { who: 'erwachsene', q: 2, akt: BIKE }),
    i('ve.getraenkepulver', 'Getränkepulver', { akt: BIKE }),
    i('ve.garmin', 'Garmin gross + Pulsgurt', { akt: BIKE, dabei: ['p1'] }),
    i('ve.anhaenger', 'Kinderanhänger', { akt: BIKE, dabei: KINDER }),
    i('ve.shotgun', 'KidsRideShotgun Sitz', { akt: BIKE, dabei: KINDER }),
    i('ve.ladegeraete', 'Ladegeräte E-Bike', { q: 2, akt: ['mtb'] }),
    i('ve.batterie', 'Batterie + Ladegerät Schaltung', { akt: BIKE }),
    i('ve.pumpe', 'Pumpe', { akt: BIKE }),
    i('ve.werkzeug', 'Velowerkzeug', { akt: BIKE, teile: ['Werkzeug', 'Multitool', 'Ersatz-Schaltauge', 'Kettenöl'] }),
    i('ve.schlaeuche', 'Ersatzschläuche', { q: 2, akt: BIKE }),
    i('ve.reiniger', 'Putzzeug Velo', { akt: BIKE, teile: ['Reiniger', 'Bürste', 'Reinigungslumpen'] }),
    i('ve.abschleppseil', 'Abschleppseil', { akt: ['mtb'] }),
    i('ve.bergbahn', 'Bergbahn-Info Motta Naluns', { akt: ['mtb'] }),
  ]),

  // =========================================================================
  ...group('ausruestung', [
    i('au.tagesrucksack', 'Tagesrucksack'),
    i('au.trinkflasche', 'Trinkflasche', { who: 'alle' }),
    i('au.wanderrucksack', 'Wanderrucksack', { who: 'erwachsene', akt: ['wandern'] }),
    i('au.wanderstoecke', 'Wanderstöcke', { who: 'erwachsene', akt: ['wandern'] }),
    i('au.wanderkarte', 'Wanderkarte / App Unterengadin', { akt: ['wandern'] }),
    i('au.kindertrage', 'Trage', { dabei: ['p4'] }),
    i('au.fluegeli', 'Flügeli + Schwimmbrettli', { akt: ['badi'], dabei: KINDER }),
    i('au.badeponcho', 'Badeponcho + Microfasertüechli', { who: 'kinder', akt: ['badi'] }),
    i('au.picknickdecke', 'Picknickdecke'),
    i('au.kuehltasche', 'Kühltasche', { arten: NUR_CAMPER }),
    i('au.skiausruestung', 'Skiausrüstung', { who: 'alle', akt: ['ski'], teile: ['Ski / Schlitten', 'Helm', 'Handschuhe', 'Skibrille'] }),
    i('au.klettern', 'Kletterausrüstung', { who: 'erwachsene', akt: ['klettern'], teile: ['Klettergurt', 'Kletterschuhe', 'Magnesia'] }),
    i('au.bademantel', 'Bademantel', { who: 'erwachsene', akt: ['wellness'] }),
    i('au.laufzeug', 'Laufkleidung & Uhr', { who: 'erwachsene', akt: ['sport'] }),
    i('au.drachen', 'Lenkdrachen', { jz: WARM, note: 'nur bei Motta Naluns' }),
  ]),

  // =========================================================================
  ...group('kinder', [
    i('kd.pluesch_p3', 'Bett-Plüschtiere', { who: 'p3' }),
    i('kd.pinguin_p3', 'Pinguin + Ladestation', { who: 'p3' }),
    i('kd.bettflasche_p3', 'Bettflasche', { who: 'p3' }),
    i('kd.buecher_p3', 'Bücher und Autöli', { who: 'p3', arten: NICHT_LENZ }),
    i('kd.toniebox_p4', 'Toniebox + Figuren', { who: 'p4' }),
    i('kd.raeupli_p4', 'Räupli / Nuschi', { who: 'p4' }),
    i('kd.haargummeli_p4', 'Haargümmeli und Spängeli', { who: 'p4' }),
    i('kd.windeln', 'Windeln', { who: 'p4', pn: 5, plus: 5 }),
    i('kd.badewindeln', 'Badewindeln', { who: 'p4', akt: ['badi'] }),
    i('kd.windelcreme', 'Windelcreme + Feuchttücher', { who: 'p4' }),
    i('kd.schoppen', 'Schoppen', { who: 'p4', q: 2 }),
    i('kd.vitamin', 'Vitamin D3', { who: 'p4' }),
    i('kd.molton', 'Molton 140×200', { dabei: KINDER, arten: NICHT_LENZ }),
    i('kd.malzeug', 'Malzeug', { dabei: KINDER, arten: NICHT_LENZ, teile: ['Maltablet', 'Rätselhefter', 'Kleberlibuch'] }),
    i('kd.spiele', 'UNO und Schleichtiere', { dabei: KINDER, arten: NICHT_LENZ }),
    i('kd.ball', 'Draussen-Spielzeug', { dabei: KINDER, arten: NICHT_LENZ, teile: ['Ball', 'Strassenkreide', 'Seifenbläterli'] }),
    i('kd.saendeli', 'Sändelisachen', { dabei: KINDER, akt: ['spielplatz', 'badi'], arten: NICHT_LENZ }),
    i('kd.snacks', 'Snack-Sack + Snacks Kinder', { dabei: KINDER }),
  ]),

  // =========================================================================
  ...group('kueche', [
    i('ku.kaffee', 'Kaffee + Milchschäumer', { arten: NUR_CAMPER }),
    i('ku.kuehlschrank', 'Essen aus Kühlschrank', { arten: ['basislager', 'lenz'] }),
    i('ku.keller', 'Essen aus Keller', { arten: ['basislager', 'lenz'] }),
    i('ku.hoernli', 'Hörnli', { arten: ['basislager', 'lenz'] }),
    i('ku.gewuerzkiste', 'Gewürzkiste', { arten: NUR_CAMPER, teile: ['Öl', 'Essig', 'Salz', 'Paprika', 'Bouillon', 'Balsamico', 'Härdöpfelgwürz'] }),
    i('ku.ruestmesser', 'Rüstmesser', { q: 2, arten: NUR_CAMPER }),
    i('ku.kinderbesteck', 'Kinderbesteck', { dabei: KINDER, arten: NUR_CAMPER }),
    i('ku.schwingbesen', 'Schwingbesen', { arten: NUR_CAMPER }),
    i('ku.haushaltspapier', 'Haushaltspapier', { arten: NUR_CAMPER }),
    i('ku.lumpen', 'Blaue Lumpen + Abtrocknungstücher', { arten: NUR_CAMPER }),
    i('ku.handtuecher', 'Handtücher', { arten: NUR_CAMPER }),
    i('ku.tupperware', 'Tupperware für Znüni', { arten: NUR_CAMPER }),
    i('ku.thermomix', 'Thermomix', { arten: NUR_CAMPER, note: 'nur wenn richtig gekocht wird' }),
    i('ku.wasser', 'Wasserflaschen für die Fahrt'),
  ]),

  // =========================================================================
  ...group('haushalt', [
    i('ha.waeschesack', 'Wäschesack'),
    i('ha.waeschestaender', 'Wäscheständer + Chlüppli', { arten: NUR_CAMPER }),
    i('ha.kleiderbuegel', 'Kleiderbügel', { arten: NUR_CAMPER, min: 4 }),
    i('ha.packwuerfel', 'Packwürfel', { min: 6 }),
    i('ha.faltbeutel', 'Faltbare Zusatztasche'),
    i('ha.muellbeutel', 'Müllbeutel', { arten: NUR_CAMPER }),
    i('ha.zweitschluessel', 'Zweitschlüssel'),
  ]),

  // =========================================================================
  ...group('camper', [
    i('ca.stromkabel', 'Stromkabel + CEE-Adapter', { arten: NUR_CAMPER }),
    i('ca.keile', 'Auffahrkeile + Wasserwaage', { arten: NUR_CAMPER }),
    i('ca.tisch', 'Campingtisch + Stühle', { q: 4, arten: NUR_CAMPER }),
    i('ca.sonnensegel', 'Sonnensegel / Vorzelt + Fussmatte', { arten: NUR_CAMPER }),
    i('ca.toilettenchemie', 'Toilettenchemie', { arten: NUR_CAMPER }),
    i('ca.gasflasche', 'Reserve-Gasflasche geprüft', { arten: NUR_CAMPER }),
    i('ca.wasserschlauch', 'Frischwasserschlauch & Kanister', { arten: NUR_CAMPER }),
    i('ca.campinglampe', 'Campinglampe', { arten: NUR_CAMPER }),
    i('ca.wc', 'Toilettenpapier', { arten: NUR_CAMPER }),
  ]),

  // =========================================================================
  ...group('reisetag', [
    i('rt.warnweste', 'Warnweste & Pannendreieck', { arten: NUR_CAMPER }),
    i('rt.schneeketten', 'Schneeketten', { arten: NUR_CAMPER, jz: ['winter'] }),
    i('rt.tanken', 'Tanken & Reifendruck prüfen', { arten: NUR_CAMPER }),
    i('rt.unterhaltung', 'Unterhaltung für die Fahrt bereit', { dabei: KINDER }),
    i('rt.adresse', 'Adresse & Anfahrt notiert', { arten: ['hotel'] }),
  ]),

  // =========================================================================
  ...group('kontrolle', [
    i('ko.geschirrspueler', 'Geschirrspüler an'),
    i('ko.kuebel', 'Kübel geleert'),
    i('ko.kuehlschrank', 'Kühlschrank geleert'),
    i('ko.kapselbehaelter', 'Kapselbehälter geleert'),
    i('ko.saugroboter', 'Saugroboter'),
    i('ko.bewaesserung', 'Bewässerung eingestellt'),
    i('ko.kompost', 'Kompost hochgestellt'),
    i('ko.gartenruemli', 'Gartenrüümli abgeschlossen'),
    i('ko.fenster', 'Fenster & Türen geschlossen'),
    i('ko.heizung', 'Heizung runtergedreht', { jz: KALT }),
    i('ko.abwesenheit', 'Abwesenheitsnotiz im Mail', { min: 4 }),
    i('ko.frischwasser', 'Frischwasser voll', { arten: NUR_CAMPER }),
    i('ko.abwasser', 'Abwasser und Kassette leer', { arten: NUR_CAMPER }),
    i('ko.camper_kuehlschrank', 'Kühlschrank Camper vorgekühlt', { arten: NUR_CAMPER }),
    i('ko.bikes', 'Bikes auf Träger, Atera abgeschlossen', { akt: BIKE }),
    i('ko.ladegeraete', 'Ladegeräte E-Bike im Camper', { akt: ['mtb'], arten: NUR_CAMPER }),
    i('ko.gewicht', 'Gesamtgewicht und Stützlast ok', { arten: NUR_CAMPER }),
  ]),
];

/** Stammlisten-Einträge mit IDs, wie sie im Zustand liegen. */
export function seedMaster(now = Date.now()) {
  const items = {};
  for (const s of SEED) {
    const id = `m:${s.key}`;
    items[id] = { ...s, id, deleted: false, updatedAt: now };
  }
  return items;
}
