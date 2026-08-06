/**
 * Ausgangsstand der Stammliste.
 *
 * Grundlage sind die gewachsenen Packlisten der Familie: Scuol im Camper,
 * Campingferien, Lenz im Winter und Lenzerheide. Diese Datei wird nur beim
 * ersten Start gelesen (oder über „Stammliste zurücksetzen"). Danach lebt die
 * Stammliste als Daten in der App und wird dort bearbeitet.
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
 *   teile          Inhalt eines Behälters. Text für eine einfache Zeile, oder
 *                  `tq('Bidon', 2)` bzw. `tn('Velosocken', 1)` für Mengen.
 */

import { WER_AUS_WHO } from './model.js';

const NICHT_LENZ = ['basislager', 'hotel'];
const NUR_CAMPER = ['basislager'];
const KALT = ['herbst', 'winter'];
const WINTER = ['winter'];
const WARM = ['fruehling', 'sommer'];
const KINDER = ['p3', 'p4'];
const BIKE = ['mtb', 'gravel'];

/** Ein Teil mit fester Stückzahl. */
export const tq = (label, qty = 1) => ({ label, qty, pronacht: false, plus: 0, cap: null });
/** Ein Teil, dessen Menge sich aus den Nächten rechnet: Faktor, Zuschlag, Maximum. */
export const tn = (label, faktor = 1, plus = 0, cap = null) => ({
  label,
  qty: faktor,
  pronacht: true,
  plus,
  cap,
});

/** Ein Teil eines Behälters, immer als Objekt mit eigener Menge. */
export const teilObjekt = (t) =>
  typeof t === 'string'
    ? { label: t.trim(), qty: 1, pronacht: false, plus: 0, cap: null }
    : {
        label: String(t.label ?? '').trim(),
        qty: Number(t.qty) || 1,
        pronacht: Boolean(t.pronacht),
        plus: Number(t.plus) || 0,
        cap: Number(t.cap) || null,
      };

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

const group = (category, items) => items.map((it) => ({ ...it, category }));

export const SEED = [
  // =========================================================================
  // KLEIDUNG
  // =========================================================================
  ...group('kleidung', [
    // --- Erwachsene ---
    i('kl.unterhosen', 'Unterhosen', { who: 'erwachsene', pn: 1, plus: 1, cap: 16, capWasch: 8 }),
    i('kl.socken_lang', 'Socken lang', { who: 'erwachsene', pn: 1, cap: 12, capWasch: 8 }),
    i('kl.socken_kurz', 'Socken kurz', { who: 'erwachsene', pn: 0.5, cap: 6, capWasch: 4, jz: WARM }),
    i('kl.tshirt', 'T-Shirt', { who: 'erwachsene', pn: 1, cap: 10, capWasch: 7 }),
    i('kl.bh', 'BHs', { who: 'p2' }),
    i('kl.unterliibli', 'Unterliibli', { who: 'erwachsene', q: 3 }),
    i('kl.hoodie', 'Hoodie / Pullover', { who: 'erwachsene', pn: 0.25, plus: 1, cap: 3 }),
    i('kl.jaeggli', 'Jäggli', { who: 'p1', pn: 0.25, plus: 1, cap: 3 }),
    i('kl.faserpelz', 'Faserpelz', { who: 'erwachsene' }),
    i('kl.midlayer', 'Midlayer', { who: 'erwachsene' }),
    i('kl.strickjacke', 'Strickjacke', { who: 'p2' }),
    i('kl.hose_lang', 'Hose lang', { who: 'erwachsene', pn: 0.2, plus: 1, cap: 3 }),
    i('kl.hose_kurz', 'Hose kurz', { who: 'erwachsene', pn: 0.2, plus: 1, cap: 3, jz: WARM }),
    i('kl.jeans_lang', 'Jeans lang', { who: 'p2' }),
    i('kl.jeans_kurz', 'Jeans kurz', { who: 'p2', jz: WARM }),
    i('kl.stoffhose_lang', 'Stoffhose lang', { who: 'p2' }),
    i('kl.stoffhose_kurz', 'Stoffhose kurz', { who: 'p2', jz: WARM }),
    i('kl.leggings_kurz', 'Leggings kurz', { who: 'p2', jz: WARM }),
    i('kl.roeckli', 'Röckli', { who: 'p2' }),
    i('kl.wanderhose', 'Wanderhose', { who: 'erwachsene', akt: ['wandern'] }),
    i('kl.trainerhose', 'Trainerhose', { who: 'erwachsene', pn: 0.2, plus: 1, cap: 2 }),
    i('kl.sportshorts', 'Sportshorts', { who: 'p1', pn: 0.3, plus: 1, cap: 4, jz: WARM }),
    i('kl.pyjama', 'Pyjama', { who: 'erwachsene' }),
    i('kl.badehose', 'Badehose', { who: 'erwachsene', akt: ['badi', 'wellness'] }),
    i('kl.regenjacke', 'Regenjacke', { who: 'erwachsene' }),
    i('kl.rotauf', 'Rotauf Jacke', { who: 'p1', note: 'Abende auf 1250 m' }),
    i('kl.wintermantel', 'Wintermantel', { who: 'p1', jz: WINTER }),
    i('kl.winterjacke', 'Winterjacke', { who: 'p2', jz: KALT }),
    i('kl.thermo', 'Thermounterwäsche', { who: 'erwachsene', q: 2, jz: WINTER }),
    i('kl.winter_p1', 'Winterzubehör', { who: 'p1', jz: KALT, teile: ['Kappe', 'Schal', 'Handschuhe'] }),
    i('kl.winter_p2', 'Winterzubehör', { who: 'p2', jz: KALT, teile: ['Stirnband', 'Halstuch', 'Handschuhe'] }),
    i('kl.sonnenbrille', 'Sonnenbrille', { who: 'alle' }),
    i('kl.sonnenhut', 'Sonnenhut', { who: 'alle', jz: WARM }),
    i('kl.schick', 'Etwas Schickes für auswärts', { who: 'erwachsene', akt: ['ausgehen'] }),

    // --- Kinder ---
    i('ki.unterhosen', 'Unterhosen', { who: 'kinder', pn: 1, plus: 2, cap: 16, capWasch: 9 }),
    i('ki.unterliibli', 'Unterliibli', { who: 'kinder', q: 3 }),
    i('ki.socken', 'Socken', { who: 'kinder', pn: 1, plus: 2, cap: 16, capWasch: 9 }),
    i('ki.tshirt', 'T-Shirt kurz und lang', { who: 'kinder', pn: 1, plus: 1, cap: 14, capWasch: 8 }),
    i('ki.hose_lang', 'Hose lang', { who: 'p3', q: 2 }),
    i('ki.hose_kurz', 'Hose kurz', { who: 'p3', q: 2, jz: WARM }),
    i('ki.leggings_lang', 'Hosen / Leggings lang', { who: 'p4', q: 2 }),
    i('ki.leggings_kurz', 'Hosen / Leggings kurz', { who: 'p4', q: 2, jz: WARM }),
    i('ki.pullover', 'Pullover', { who: 'kinder', q: 2 }),
    i('ki.faserpelz', 'Faserpelz', { who: 'kinder' }),
    i('ki.jacke', 'Jacke', { who: 'kinder' }),
    i('ki.regenzeug', 'Regenhose und Regenjacke', { who: 'kinder' }),
    i('ki.pischi', 'Pischi kurz und lang', { who: 'kinder', q: 2 }),
    i('ki.gesichtslumpen', 'Gesichtslumpen', { who: 'kinder', q: 3 }),
    i('ki.kopfzeug', 'Kappe & Halstuch', { who: 'kinder', teile: ['Kappe', 'Halstuch'] }),
    i('ki.handschuhe', 'Handschuhe', { who: 'kinder', jz: KALT }),
    i('ki.rutschsocken', 'Rutschsocken / Finken', { who: 'kinder', jz: KALT }),
    i('ki.skianzug', 'Skianzug', { who: 'kinder', jz: WINTER }),
    i('ki.skisocken', 'Skisocken', { who: 'kinder', q: 2, jz: WINTER }),
    i('ki.skiunterwaesche', 'Skiunterwäsche', { who: 'p3', jz: WINTER }),
    i('ki.thermoleggings', 'Strumpfhose / Thermoleggings', { who: 'p4', q: 2, jz: WINTER }),
    i('ki.badesachen', 'Badesachen', { who: 'kinder', akt: ['badi'], teile: ['Badehose', 'UV-Shirt', 'Badeponcho', 'Microfasertüechli'] }),
    i('ki.latz', 'Latz', { who: 'p4', q: 2 }),
  ]),

  // =========================================================================
  // SCHUHE
  // =========================================================================
  ...group('schuhe', [
    i('sch.sneaker', 'Sneaker', { who: 'alle' }),
    i('sch.sandalen', 'Sandalen', { who: 'alle', jz: WARM }),
    i('sch.birkenstock_p1', 'Birkenstock schwarz', { who: 'p1' }),
    i('sch.birkenstock_p2', 'Birkenstock türkis', { who: 'p2' }),
    i('sch.trekking', 'Trekkingschuhe', { who: 'erwachsene' }),
    i('sch.wanderschuhe_kind', 'Wanderschuhe', { who: 'kinder' }),
    i('sch.gummistiefel', 'Gummistiefel', { who: 'kinder' }),
    i('sch.winterschuhe', 'Winterschuhe', { who: 'alle', jz: KALT }),
  ]),

  // =========================================================================
  // BAD & APOTHEKE
  // =========================================================================
  ...group('bad', [
    i('bad.necessaire_p1', 'Necessaire', {
      who: 'p1',
      teile: ['Zahnbürste', 'Zahnpasta', 'Duschmittel', 'Deo', 'Haargel', 'Haarspray', 'Kamm', 'Bürste', 'Rasierer', 'Trimmer', 'Ladegerät'],
    }),
    i('bad.medis_p1', 'Medis', { who: 'p1', teile: ['Pantoprazol', 'Symbicort', 'Incruse', 'Nasenspray'] }),
    i('bad.necessaire_p2', 'Necessaire', {
      who: 'p2',
      teile: ['Zahnbürste', 'Zahnpasta', 'Bürste', 'Gesichtscreme', 'Handcreme', 'Deo', 'Rasierer', 'Duschmittel', 'Shampoo und Conditioner', 'Nagelschere', 'Pinzette', 'Ohrenstäbli', 'OBs, Säckli und Binden'],
    }),
    i('bad.medis_p2', 'Medikamente', { who: 'p2' }),
    i('bad.epilierer', 'Epilierer', { who: 'p2' }),
    i('bad.kinder', 'Bad Kinder', {
      dabei: KINDER,
      teile: ['Duschtüechli Kinder', 'Bürsten Kinder', 'Shampoo Kinder', 'Zahnbürsten und Zahnpasta'],
    }),
    i('bad.ersatztuechli', 'Ersatztüechli', { arten: NICHT_LENZ }),
    i('bad.duschtuechli', 'Duschtüechli alle', { arten: NUR_CAMPER }),
    i('bad.badetuecher', 'Grosse Badetücher extra', { q: 2, akt: ['badi'], arten: NICHT_LENZ }),
    i('bad.sonnencreme', 'Sonnencreme', { note: 'Höhensonne' }),
    i('bad.nastuechli', 'Nastüechli'),
    i('bad.toilettentuecher', 'Toilettenfeuchttücher', { dabei: KINDER }),
    i('bad.apotheke', 'Apotheke', {
      teile: [
        'Pflaster', 'Steristrip', 'Schmerztabletten', 'Schmerzsirup Kinder', 'Itinerolzäpfli',
        'Fiebermesser', 'Arnicachügeli / Salbe', 'Perskindol', 'Pulmex', 'Fenistil',
        'Insektenspray', 'Imodium', 'Augentropfen', 'Nasenspray', 'Aftersun',
      ],
    }),
  ]),

  // =========================================================================
  // DOKUMENTE & GELD
  // =========================================================================
  ...group('dokumente', [
    i('do.id', 'Identitätskarte', { who: 'erwachsene' }),
    i('do.fahrausweis', 'Führerausweis', { who: 'erwachsene', arten: NUR_CAMPER }),
    i('do.ausweise_kinder', 'Ausweise Kinder', { dabei: KINDER }),
    i('do.krankenkasse', 'Krankenkassenkarten'),
    i('do.karten', 'Kredit-/Debitkarte', { who: 'erwachsene' }),
    i('do.fahrzeugpapiere', 'Fahrzeugpapiere & Vignette', { arten: NUR_CAMPER }),
    i('do.reservation', 'Reservation Camping auf dem Handy', { arten: NUR_CAMPER }),
    i('do.skipass', 'Skipass / Voucher', { akt: ['ski'] }),
    i('do.bargeld', 'Bargeld', { akt: ['fest'] }),
    i('do.pass', 'Reisepass', { who: 'alle', reg: ['europa', 'fern'] }),
    i('do.fremdwaehrung', 'Fremdwährung besorgen', { reg: ['europa', 'fern'] }),
    i('do.buchungen', 'Buchungen offline gespeichert', { arten: ['hotel'] }),
  ]),

  // =========================================================================
  // TECHNIK
  // =========================================================================
  ...group('technik', [
    i('te.taeschli_p1', 'Täschli', { who: 'p1', teile: ['Airpods', 'Portemonnaie'] }),
    i('te.rucksack_p1', 'Rucksack', { who: 'p1', teile: ['MacBook', 'iPad', 'Ladetäschli', 'E-Reader'] }),
    i('te.kamera_p1', 'Kameratasche', { who: 'p1' }),
    i('te.ipad_p2', 'iPad + Ladekabel aus Küche', { who: 'p2' }),
    i('te.laptop_p2', 'Laptop inkl. Ladegerät', { who: 'p2', akt: ['arbeiten'] }),
    i('te.buch_p2', 'Buch', { who: 'p2' }),
    i('te.handy', 'Handy & Ladekabel', { who: 'erwachsene' }),
    i('te.powerbank', 'Powerbank'),
    i('te.mehrfachstecker', 'Mehrfachstecker', { min: 3 }),
    i('te.halter', 'Handyhalterung & Autoladekabel', { arten: NUR_CAMPER }),
    i('te.foehn', 'Föhn', { arten: NUR_CAMPER }),
    i('te.offline', 'Offline-Karten & Musik geladen'),
    i('te.adapter', 'Reiseadapter', { reg: ['europa', 'fern'] }),
    i('te.roaming', 'Roaming / Reisepaket aktivieren', { reg: ['schengen', 'europa', 'fern'] }),
  ]),

  // =========================================================================
  // VELO
  // =========================================================================
  ...group('velo', [
    i('ve.velokleider_p1', 'Velokleider', {
      who: 'p1',
      akt: BIKE,
      teile: [
        tq('Trikot Bike kurz', 2), tq('Trikot Bike lang', 2), tq('Bikehose lang'),
        tn('Velohosen kurz', 0.15, 1, 4), tn('Velounterliibli', 0.2, 2, 5),
        tn('Velosocken', 0.2, 2, 6), tn('Pampers', 0.2, 2, 5),
        tn('Handschuhe', 0.25, 0, 4), tq('Veste'), tq('Dirtsuit kurz'),
      ],
    }),
    i('ve.velokleider_p2', 'Velokleider', {
      who: 'p2',
      akt: BIKE,
      teile: [tn('Velohosen', 0.15, 1, 4), tq('Trikot', 2), tn('Velounterliibli', 0.2, 2, 5), tn('Velosocken', 0.2, 2, 6)],
    }),
    i('ve.gravel_p1', 'Gravel-Trikots & Gravelhelm', { who: 'p1', akt: ['gravel'], pn: 0.6, plus: 1, cap: 4 }),
    i('ve.velozubehoer_p1', 'Velozubehör', {
      who: 'p1',
      akt: BIKE,
      teile: [
        'Endurohelm', 'Bikehelm', 'Velobrille', 'Knieschoner', 'Rückenpanzer', 'Hipbag',
        'Bikerucksack', 'Klickschuhe', 'Flatschuhe', 'Garmin gross', 'Garmin klein',
        'Pulsgurt', tq('Bidon', 2), 'Getränkepulver',
      ],
    }),
    i('ve.velozubehoer_p2', 'Velozubehör', {
      who: 'p2',
      akt: BIKE,
      teile: ['Helm', 'Bikebrille', 'Schoner & Panzer', 'Bikerucksack', 'Bikeschuhe'],
    }),
    i('ve.crafty', 'Crafty Christoph', {
      akt: ['mtb'],
      dabei: ['p1'],
      teile: ['Ladegerät', 'AXS Ladegerät', 'AXS Akkus'],
    }),
    i('ve.wild', 'Wild Debora', { akt: ['mtb'], dabei: ['p2'], teile: ['Ladegerät'] }),
    i('ve.terra', 'Terra Christoph', { akt: ['gravel'], dabei: ['p1'] }),
    i('ve.velokiste', 'Velokiste', {
      akt: BIKE,
      teile: ['Pumpe', 'Werkzeug', 'Ersatzteile', 'Ersatz-Schaltauge', 'Kettenöl', 'Reiniger', 'Bürste', 'Reinigungslumpen'],
    }),
    i('ve.ladegeraete', 'Ladegerät E-Bike', { q: 2, akt: BIKE }),
    i('ve.batterie', 'Batterie + Ladegerät Schaltung', { akt: BIKE }),
    i('ve.abschleppseil', 'Abschleppseil', { q: 2, akt: ['mtb'] }),
    i('ve.trampivelo_p3', 'Trampivelo Laurin', { dabei: ['p3'] }),
    i('ve.schaltvelo_p3', 'Schaltvelo Laurin', { dabei: ['p3'], akt: BIKE }),
    i('ve.laufvelo_p4', 'Laufvelo Noemi', { dabei: ['p4'] }),
    i('ve.trampivelo_p4', 'Trampivelo Noemi', { dabei: ['p4'] }),
    i('ve.helm_p3', 'Helm & Fullfacehelm', { who: 'p3' }),
    i('ve.schoner_p3', 'Schoner', { who: 'p3', akt: BIKE }),
    i('ve.bikebrille_p3', 'Bikebrille', { who: 'p3', akt: BIKE }),
    i('ve.helm_p4', 'Helm', { who: 'p4' }),
    i('ve.velohandschuhe_kinder', 'Velohandschuhe Kinder', { dabei: KINDER }),
    i('ve.anhaenger', 'Kinderanhänger', { akt: BIKE, dabei: KINDER }),
    i('ve.shotgun', 'KidsRideShotgun Sitz', { akt: BIKE, dabei: KINDER }),
    i('ve.bergbahn', 'Bergbahn-Info Motta Naluns', { akt: ['mtb'] }),
  ]),

  // =========================================================================
  // AUSRÜSTUNG & SPORT
  // =========================================================================
  ...group('ausruestung', [
    i('au.trinkflasche', 'Trinkflasche', { who: 'alle' }),
    i('au.wanderrucksack', 'Wanderrucksack', { who: 'erwachsene', akt: ['wandern'] }),
    i('au.wanderstoecke', 'Wanderstöcke', { who: 'erwachsene', akt: ['wandern'] }),
    i('au.wanderkarte', 'Wanderkarte / App Region', { akt: ['wandern'] }),
    i('au.trage', 'Trage', { dabei: ['p4'] }),
    i('au.tragerucksack', 'Tragerucksack', { dabei: KINDER, akt: ['wandern'] }),
    i('au.fluegeli', 'Flügeli + Schwimmbrettli', { akt: ['badi'], dabei: KINDER }),
    i('au.picknickdecke', 'Picknickdecke'),
    i('au.kuehltasche', 'Kühltasche', { arten: NUR_CAMPER }),
    i('au.ski', 'Skiausrüstung', {
      who: 'alle',
      akt: ['ski'],
      teile: ['Ski & Stöcke', 'Skihelm', 'Skibrille', 'Skihandschuhe'],
    }),
    i('au.klettern', 'Kletterausrüstung', {
      who: 'erwachsene',
      akt: ['klettern'],
      teile: ['Klettergurt', 'Kletterschuhe', 'Magnesia'],
    }),
  ]),

  // =========================================================================
  // KINDER & SPIELZEUG
  // =========================================================================
  ...group('kinder', [
    i('kd.pluesch_p3', 'Bett-Plüschtiere', { who: 'p3' }),
    i('kd.pinguin_p3', 'Pinguin + Ladestation', { who: 'p3' }),
    i('kd.bettflasche_p3', 'Bettflasche', { who: 'p3' }),
    i('kd.spielsachen_p3', 'Spielsachen', { who: 'p3', teile: ['Bücher', 'Autöli'] }),
    i('kd.spielsachen_p4', 'Spielsachen', { who: 'p4', teile: ['Bücher'] }),
    i('kd.toniebox_p4', 'Toniebox + Figuren', { who: 'p4' }),
    i('kd.raeupli_p4', 'Räupli / Nuschi', { who: 'p4' }),
    i('kd.haargummeli_p4', 'Haargümmeli und Spängeli', { who: 'p4' }),
    i('kd.schoppen_p4', 'Schoppen', { who: 'p4', q: 2 }),
    i('kd.vitamin_p4', 'Vitamin D3', { who: 'p4' }),
    i('kd.windeln_p4', 'Windeln', { who: 'p4', pn: 5, plus: 5 }),
    i('kd.windelcreme_p4', 'Windelcreme + Feuchttücher', { who: 'p4' }),
    i('kd.badewindeln_p4', 'Badewindeln', { who: 'p4', akt: ['badi'] }),
    i('kd.fahrt', 'Spielzeug für die Fahrt', {
      dabei: KINDER,
      teile: ['Maltablet', 'Rätselhefter', 'Zeichnungsmappe', 'Kleberlibuch', 'UNO Spiel', 'Schleichtiere', 'Autöli'],
    }),
    i('kd.draussen', 'Draussen-Spielzeug', {
      dabei: KINDER,
      arten: NICHT_LENZ,
      teile: ['Ball', 'Strassenkreide', 'Seifenbläterli', 'Sändelisachen'],
    }),
    i('kd.drachen', 'Lenkdrachen', { dabei: ['p3'], jz: WARM, note: 'nur bei Motta Naluns' }),
    i('kd.molton', 'Molton 140×200', { dabei: KINDER, arten: NICHT_LENZ }),
  ]),

  // =========================================================================
  // KÜCHE & VERPFLEGUNG
  // =========================================================================
  ...group('kueche', [
    i('ku.kaffee', 'Kaffee + Milchschäumer', { arten: NUR_CAMPER }),
    i('ku.kuehlschrank', 'Essen aus Kühlschrank'),
    i('ku.gefrierer', 'Essen aus Gefrierer', { arten: ['basislager', 'lenz'] }),
    i('ku.keller', 'Essen aus Keller', { arten: ['basislager', 'lenz'] }),
    i('ku.kueche', 'Essen aus Küche'),
    i('ku.hoernli', 'Hörnli', { arten: ['basislager', 'lenz'] }),
    i('ku.gewuerze', 'Gewürze', {
      arten: NUR_CAMPER,
      teile: ['Öl', 'Essig', 'Salz', 'Paprika', 'Zwiebel', 'Frühlingskräuter', 'Balsamico', 'Bouillon', 'Härdöpfelgwürz'],
    }),
    i('ku.ruestmesser', 'Rüstmesser', { q: 2, arten: NUR_CAMPER }),
    i('ku.kinderbesteck', 'Kinderbesteck', { dabei: KINDER, arten: NUR_CAMPER }),
    i('ku.schwingbesen', 'Schwingbesen', { arten: NUR_CAMPER }),
    i('ku.haushaltspapier', 'Haushaltspapier', { arten: NUR_CAMPER }),
    i('ku.lumpen', 'Lumpen blau + Abtrocknungstücher blau', { arten: NUR_CAMPER }),
    i('ku.handtuecher', 'Handtücher', { arten: NUR_CAMPER }),
    i('ku.tupperware', 'Tupperware für Znüni'),
    i('ku.thermomix', 'Thermomix mit Zubehör', { arten: NUR_CAMPER, note: 'nur wenn richtig gekocht wird' }),
    i('ku.trinkflaschen', 'Trinkflaschen'),
    i('ku.snacksack', 'Snack-Sack'),
    i('ku.snacks_kinder', 'Snacks Kinder', { dabei: KINDER }),
  ]),

  // =========================================================================
  // HAUSHALT & WÄSCHE
  // =========================================================================
  ...group('haushalt', [
    i('ha.waeschesack', 'Wäschesack'),
    i('ha.frische_waesche', 'Frische Wäsche aus Waschküche'),
    i('ha.waeschestaender', 'Wäscheständer + Chlüppli', { arten: NUR_CAMPER }),
    i('ha.kleiderbuegel', 'Kleiderbügel'),
    i('ha.zweitschluessel', 'Zweitschlüssel'),
    i('ha.taschenlampe', 'Taschenlampe / Stirnlampe'),
    i('ha.lautsprecher', 'UE Boom / Sonos Roam'),
    i('ha.muellbeutel', 'Müllbeutel', { arten: NUR_CAMPER }),
    i('ha.packwuerfel', 'Packwürfel', { min: 6 }),
  ]),

  // =========================================================================
  // CAMPER
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
  // REISETAG
  // =========================================================================
  ...group('reisetag', [
    i('rt.warnweste', 'Warnweste & Pannendreieck', { arten: NUR_CAMPER }),
    i('rt.schneeketten', 'Schneeketten', { arten: NUR_CAMPER, jz: WINTER }),
    i('rt.tanken', 'Tanken & Reifendruck prüfen', { arten: NUR_CAMPER }),
    i('rt.unterhaltung', 'Unterhaltung für die Fahrt bereit', { dabei: KINDER }),
    i('rt.adresse', 'Adresse & Anfahrt notiert', { arten: ['hotel'] }),
  ]),

  // =========================================================================
  // KONTROLLE VOR ABFAHRT
  // =========================================================================
  ...group('kontrolle', [
    i('ko.geschirrspueler', 'Geschirrspüler an'),
    i('ko.kuebel', 'Kübel geleert'),
    i('ko.windelkuebel', 'Windelkübel geleert', { dabei: ['p4'] }),
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
    i('ko.gewicht', 'Gesamtgewicht und Stützlast ok', { arten: NUR_CAMPER }),
  ]),
];

export const RULE_BY_KEY = new Map(SEED.map((r) => [r.key, r]));

/** Stammlisten-Einträge mit IDs, wie sie im Zustand liegen. */
export function seedMaster(now = Date.now()) {
  const items = {};
  for (const s of SEED) {
    const id = `m:${s.key}`;
    items[id] = { ...s, id, deleted: false, updatedAt: now };
  }
  return items;
}
