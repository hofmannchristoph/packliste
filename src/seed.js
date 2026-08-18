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
const MIT_KUECHE = ['basislager', 'lenz'];
const WINTER = ['winter'];
const SOMMER = ['sommer'];
/*
 * Zwei Jahreszeitsätze statt vier Einzelwerte. KUEHL und MILD überlappen sich
 * im Frühling und im Herbst – ein warmer Maiabend braucht beides.
 */
const KUEHL = ['fruehling', 'herbst', 'winter'];
const MILD = ['fruehling', 'sommer', 'herbst'];
const KINDER = ['p3', 'p4'];
const BIKE = ['mtb', 'gravel'];
const BADEN = ['badi', 'wellness'];
const AUSLAND = ['schengen', 'europa', 'fern'];
const FERN = ['europa', 'fern'];

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

/**
 * Bedingungen an ein Teil hängen – z.B. der Rasierer, der in Lenz schon liegt
 * und sich bei zwei Nächten sowieso nicht lohnt.
 */
export const nur = (teil, o = {}) => ({
  ...teil,
  arten: o.arten ?? [],
  aktivitaeten: o.akt ?? [],
  jahreszeiten: o.jz ?? [],
  wennDabei: o.dabei ?? [],
  minNaechte: o.min ?? 0,
});

/** Ein Teil eines Behälters, immer als Objekt mit Menge und Bedingungen. */
export const teilObjekt = (t) => {
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
    wennDabei: o.wennDabei ?? [],
    minNaechte: Number(o.minNaechte) || 0,
  };
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
    i('kl.unterhosen', 'Unterhosen', { who: 'erwachsene', pn: 1, plus: 1, cap: 8 }),
    i('kl.socken_lang', 'Socken lang', { who: 'erwachsene', pn: 1, plus: 1, cap: 8, jz: KUEHL }),
    i('kl.socken_kurz', 'Socken kurz', { who: 'erwachsene', pn: 1, plus: 1, cap: 8, jz: SOMMER }),
    i('kl.tshirt', 'T-Shirt', { who: 'erwachsene', pn: 1, plus: 1, cap: 8 }),
    i('kl.bh', 'BHs', { who: 'p2', pn: 1, plus: 1, cap: 8 }),
    i('kl.unterliibli', 'Unterliibli', { who: 'erwachsene', pn: 0.5, plus: 1, cap: 5 }),
    i('kl.hoodie', 'Hoodie / Pullover', { who: 'erwachsene', pn: 0.25, cap: 3 }),
    i('kl.jaeggli', 'Jäggli', { who: 'p1', pn: 0.25, cap: 3 }),
    i('kl.faserpelz', 'Faserpelz', { who: 'erwachsene' }),
    i('kl.midlayer', 'Midlayer', { who: 'erwachsene' }),
    i('kl.strickjacke', 'Strickjacke', { who: 'p2' }),
    i('kl.hose_lang', 'Hose lang', { who: 'erwachsene', pn: 0.2, cap: 3 }),
    i('kl.hose_kurz', 'Hose kurz', { who: 'erwachsene', pn: 0.2, cap: 3, jz: MILD }),
    i('kl.jeans_lang', 'Jeans lang', { who: 'p2' }),
    i('kl.jeans_kurz', 'Jeans kurz', { who: 'p2', jz: MILD }),
    i('kl.stoffhose_lang', 'Stoffhose lang', { who: 'p2' }),
    i('kl.stoffhose_kurz', 'Stoffhose kurz', { who: 'p2', jz: MILD }),
    i('kl.leggings_kurz', 'Leggings kurz', { who: 'p2', jz: MILD }),
    i('kl.roeckli', 'Röckli', { who: 'p2' }),
    i('kl.wanderhose', 'Wanderhose', { who: 'erwachsene', akt: ['wandern'] }),
    i('kl.trainerhose', 'Trainerhose', { who: 'erwachsene', pn: 0.25, cap: 3 }),
    i('kl.sportshorts', 'Sportshorts', { who: 'p1', pn: 0.2, cap: 3, jz: MILD }),
    i('kl.badehose', 'Badehose', { who: 'erwachsene', akt: BADEN }),
    i('kl.regenjacke', 'Regenjacke', { who: 'erwachsene' }),
    i('kl.rotauf', 'Rotauf Jacke', { who: 'p1', note: 'Abende auf 1250 m' }),
    i('kl.wintermantel', 'Wintermantel', { who: 'p1', jz: KUEHL }),
    i('kl.winterjacke', 'Winterjacke', { who: 'p2', jz: KUEHL }),
    i('kl.thermo', 'Thermounterwäsche', { who: 'erwachsene', pn: 0.25, cap: 3, jz: WINTER }),
    i('kl.winter_p1', 'Winterzubehör', { who: 'p1', jz: KUEHL, teile: ['Kappe', 'Schal', 'Handschuhe'] }),
    i('kl.winter_p2', 'Winterzubehör', { who: 'p2', jz: KUEHL, teile: ['Stirnband', 'Halstuch', 'Handschuhe'] }),
    i('kl.sonnenbrille', 'Sonnenbrille', { who: 'alle' }),
    i('kl.sonnenhut', 'Sonnenhut', { who: 'alle', jz: MILD }),
    i('kl.schick', 'Etwas Schickes für auswärts', { who: 'erwachsene', akt: ['ausgehen'] }),

    i('ki.unterhosen', 'Unterhosen', { who: 'kinder', pn: 1, plus: 2, cap: 9 }),
    i('ki.unterliibli', 'Unterliibli', { who: 'kinder', pn: 0.5, plus: 2, cap: 6 }),
    i('ki.socken', 'Socken', { who: 'kinder', pn: 1, plus: 2, cap: 9 }),
    i('ki.tshirt', 'T-Shirt kurz und lang', { who: 'kinder', pn: 1, plus: 2, cap: 9 }),
    i('ki.hose_lang', 'Hose lang', { who: 'p3', pn: 0.35, cap: 5 }),
    i('ki.hose_kurz', 'Hose kurz', { who: 'p3', pn: 0.35, cap: 5, jz: MILD }),
    i('ki.leggings_lang', 'Hosen / Leggings lang', { who: 'p4', pn: 0.35, cap: 5 }),
    i('ki.leggings_kurz', 'Hosen / Leggings kurz', { who: 'p4', pn: 0.35, cap: 5, jz: MILD }),
    i('ki.pullover', 'Pullover', { who: 'kinder', pn: 0.25, cap: 4 }),
    i('ki.faserpelz', 'Faserpelz', { who: 'kinder' }),
    i('ki.jacke', 'Jacke', { who: 'kinder' }),
    i('ki.regenzeug', 'Regenhose und Regenjacke', { who: 'kinder' }),
    i('ki.gesichtslumpen', 'Gesichtslumpen', { who: 'kinder', q: 2 }),
    i('ki.kopfzeug', 'Kappe & Halstuch', { who: 'kinder', teile: ['Kappe', 'Halstuch'] }),
    i('ki.handschuhe', 'Handschuhe', { who: 'kinder', jz: KUEHL }),
    i('ki.rutschsocken', 'Rutschsocken / Finken', { who: 'kinder', jz: KUEHL }),
    i('ki.skianzug', 'Skianzug', { who: 'kinder', jz: WINTER }),
    i('ki.skisocken', 'Skisocken', { who: 'kinder', q: 2, jz: WINTER }),
    i('ki.skiunterwaesche', 'Skiunterwäsche', { who: 'p3', jz: WINTER }),
    i('ki.thermoleggings', 'Strumpfhose / Thermoleggings', { who: 'p4', q: 2, jz: WINTER }),
    i('ki.badesachen', 'Badesachen', { who: 'kinder', akt: BADEN, teile: ['Badehose', 'UV-Shirt', 'Badeponcho', 'Microfasertüechli'] }),

    i('kl.pyjama_kurz', 'Pyjama kurz', { who: 'erwachsene', pn: 0.15, cap: 2, jz: SOMMER }),
    i('kl.pyjama_lang', 'Pyjama lang', { who: 'erwachsene', pn: 0.15, cap: 2, jz: KUEHL }),

    i('ki.pischi_kurz', 'Pischi kurz', { who: 'kinder', pn: 0.15, cap: 3, jz: SOMMER }),
    i('ki.pischi_lang', 'Pischi lang', { who: 'kinder', pn: 0.15, cap: 3, jz: KUEHL }),
  ]),

  // =========================================================================
  // SCHUHE
  // =========================================================================
  ...group('schuhe', [
    i('sch.sneaker', 'Sneaker', { who: 'alle' }),
    i('sch.sandalen', 'Sandalen', { who: 'alle', jz: MILD }),
    i('sch.birkenstock_p1', 'Birkenstock schwarz', { who: 'p1' }),
    i('sch.birkenstock_p2', 'Birkenstock türkis', { who: 'p2' }),
    i('sch.trekking', 'Trekkingschuhe', { who: 'erwachsene' }),
    i('sch.wanderschuhe_kind', 'Wanderschuhe', { who: 'kinder' }),
    i('sch.gummistiefel', 'Gummistiefel', { who: 'kinder' }),
    i('sch.winterschuhe', 'Winterschuhe', { who: 'alle', jz: KUEHL }),
  ]),

  // =========================================================================
  // BAD & APOTHEKE
  // =========================================================================
  ...group('bad', [
    i('bad.necessaire_p1', 'Necessaire', { who: 'p1', teile: ['Zahnbürste', 'Zahnpasta', nur(tq('Duschmittel'), { arten: NUR_CAMPER }), 'Deo', 'Haargel', 'Haarspray', 'Kamm', 'Bürste', 'Ladegerät', nur(tq('Rasierer'), { arten: NICHT_LENZ, min: 5 }), nur(tq('Trimmer'), { arten: NICHT_LENZ, min: 5 })] }),
    i('bad.medis_p1', 'Medis', { who: 'p1', teile: ['Pantoprazol', 'Symbicort', 'Incruse', 'Nasenspray'] }),
    i('bad.necessaire_p2', 'Necessaire', { who: 'p2', teile: ['Zahnbürste', 'Zahnpasta', 'Bürste', 'Gesichtscreme', 'Handcreme', 'Deo', nur(tq('Duschmittel'), { arten: NUR_CAMPER }), 'Shampoo und Conditioner', 'Nagelschere', 'Pinzette', 'Ohrenstäbli', 'OBs, Säckli und Binden', nur(tq('Rasierer'), { arten: NICHT_LENZ, min: 5 })] }),
    i('bad.medis_p2', 'Medikamente', { who: 'p2' }),
    i('bad.epilierer', 'Epilierer', { who: 'p2' }),
    i('bad.kinder', 'Bad Kinder', { dabei: KINDER, teile: [nur(tq('Duschtüechli Kinder'), { arten: NUR_CAMPER }), 'Bürsten Kinder', 'Shampoo Kinder', 'Zahnbürsten und Zahnpasta'] }),
    i('bad.ersatztuechli', 'Ersatztüechli', { arten: NICHT_LENZ }),
    i('bad.duschtuechli', 'Duschtüechli alle', { arten: NUR_CAMPER }),
    i('bad.badetuecher', 'Grosse Badetücher extra', { q: 2, arten: NICHT_LENZ, akt: BADEN }),
    i('bad.sonnencreme', 'Sonnencreme', { note: 'Höhensonne' }),
    i('bad.nastuechli', 'Nastüechli'),
    i('bad.toilettentuecher', 'Toilettenfeuchttücher', { dabei: KINDER }),
    i('bad.apotheke', 'Apotheke', { teile: ['Pflaster', 'Steristrip', 'Schmerztabletten', nur(tq('Schmerzsirup Kinder'), { dabei: KINDER }), 'Itinerolzäpfli', 'Fiebermesser', 'Arnicachügeli / Salbe', 'Perskindol', 'Pulmex', 'Fenistil', 'Insektenspray', 'Imodium', 'Augentropfen', 'Nasenspray', 'Aftersun'] }),
  ]),

  // =========================================================================
  // DOKUMENTE & GELD
  // =========================================================================
  ...group('dokumente', [
    i('do.id', 'Identitätskarte', { who: 'erwachsene' }),
    i('do.fahrausweis', 'Führerausweis', { who: 'erwachsene' }),
    i('do.ausweise_kinder', 'Ausweise Kinder', { dabei: KINDER }),
    i('do.krankenkasse', 'Krankenkassenkarten'),
    i('do.karten', 'Kredit-/Debitkarte', { who: 'erwachsene' }),
    i('do.fahrzeugpapiere', 'Fahrzeugpapiere & Vignette'),
    i('do.reservation', 'Reservation Camping auf dem Handy', { arten: NUR_CAMPER }),
    i('do.skipass', 'Skipass / Voucher', { akt: ['ski'] }),
    i('do.bargeld', 'Bargeld'),
    i('do.pass', 'Reisepass', { who: 'alle', reg: FERN }),
    i('do.fremdwaehrung', 'Fremdwährung besorgen', { reg: AUSLAND }),
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
    i('te.halter', 'Handyhalterung & Autoladekabel'),
    i('te.foehn', 'Föhn', { arten: NUR_CAMPER }),
    i('te.offline', 'Offline-Karten & Musik geladen'),
    i('te.adapter', 'Reiseadapter', { reg: AUSLAND }),
    i('te.roaming', 'Roaming / Reisepaket aktivieren', { reg: AUSLAND }),
  ]),

  // =========================================================================
  // VELO
  // =========================================================================
  ...group('velo', [
    i('ve.velokleider_p1', 'Velokleider', { who: 'p1', akt: BIKE, teile: [tq('Trikot Bike kurz', 2), tq('Trikot Bike lang', 2), 'Bikehose lang', tn('Velohosen kurz', 0.15, 1, 4), tn('Velounterliibli', 0.2, 2, 5), tn('Velosocken', 0.2, 2, 6), tn('Pampers', 0.2, 2, 5), tn('Handschuhe', 0.25, 0, 4), 'Veste', 'Dirtsuit kurz'] }),
    i('ve.velokleider_p2', 'Velokleider', { who: 'p2', akt: BIKE, teile: [tn('Velohosen', 0.15, 1, 4), tq('Trikot', 2), tn('Velounterliibli', 0.2, 2, 5), tn('Velosocken', 0.2, 2, 6)] }),
    i('ve.gravel_p1', 'Gravel-Trikots & Gravelhelm', { who: 'p1', pn: 0.6, plus: 1, cap: 4, akt: ['gravel'] }),
    i('ve.velozubehoer_p1', 'Velozubehör', { who: 'p1', akt: BIKE, teile: ['Endurohelm', 'Bikehelm', 'Velobrille', 'Knieschoner', 'Rückenpanzer', 'Hipbag', 'Bikerucksack', 'Klickschuhe', 'Flatschuhe', 'Garmin gross', 'Garmin klein', 'Pulsgurt', tq('Bidon', 2), 'Getränkepulver'] }),
    i('ve.velozubehoer_p2', 'Velozubehör', { who: 'p2', akt: BIKE, teile: ['Helm', 'Bikebrille', 'Schoner & Panzer', 'Bikerucksack', 'Bikeschuhe'] }),
    i('ve.crafty', 'Crafty Christoph', { who: 'p1', akt: ['mtb'], teile: ['Ladegerät', 'AXS Ladegerät', 'AXS Akkus'] }),
    i('ve.wild', 'Wild Debora', { who: 'p2', akt: ['mtb'], teile: ['Ladegerät'] }),
    i('ve.terra', 'Terra Christoph', { who: 'p1', akt: ['gravel'] }),
    i('ve.velokiste', 'Velokiste', { akt: BIKE, teile: ['Pumpe', 'Werkzeug', 'Ersatzteile', 'Ersatz-Schaltauge', 'Kettenöl', 'Reiniger', 'Bürste', 'Reinigungslumpen'] }),
    i('ve.ladegeraete', 'Ladegerät E-Bike', { q: 2, akt: BIKE }),
    i('ve.batterie', 'Batterie + Ladegerät Schaltung', { akt: BIKE }),
    i('ve.abschleppseil', 'Abschleppseil', { q: 2, akt: ['mtb'] }),
    i('ve.trampivelo_p3', 'Trampivelo Laurin', { who: 'p3' }),
    i('ve.schaltvelo_p3', 'Schaltvelo Laurin', { who: 'p3', akt: BIKE }),
    i('ve.laufvelo_p4', 'Laufvelo Noemi', { who: 'p4' }),
    i('ve.trampivelo_p4', 'Trampivelo Noemi', { who: 'p4' }),
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
    i('au.tragerucksack', 'Tragerucksack', { akt: ['wandern'], dabei: KINDER }),
    i('au.fluegeli', 'Flügeli + Schwimmbrettli', { akt: BADEN, dabei: KINDER }),
    i('au.picknickdecke', 'Picknickdecke'),
    i('au.kuehltasche', 'Kühltasche'),
    i('au.ski', 'Skiausrüstung', { who: 'alle', akt: ['ski'], teile: ['Ski & Stöcke', 'Skihelm', 'Skibrille', 'Skihandschuhe'] }),
    i('au.klettern', 'Kletterausrüstung', { who: 'erwachsene', akt: ['klettern'], teile: ['Klettergurt', 'Kletterschuhe', 'Magnesia'] }),
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
    i('kd.badewindeln_p4', 'Badewindeln', { who: 'p4', akt: BADEN }),
    i('kd.fahrt', 'Spielzeug für die Fahrt', { dabei: KINDER, teile: ['Maltablet', 'Rätselhefter', 'Zeichnungsmappe', 'Kleberlibuch', 'UNO Spiel', 'Schleichtiere', 'Autöli'] }),
    i('kd.draussen', 'Draussen-Spielzeug', { arten: NICHT_LENZ, dabei: KINDER, teile: ['Ball', 'Strassenkreide', 'Seifenbläterli', 'Sändelisachen'] }),
    i('kd.drachen', 'Lenkdrachen', { jz: MILD, dabei: ['p3'], note: 'nur bei Motta Naluns' }),
    i('kd.molton', 'Molton 140×200', { arten: NICHT_LENZ, dabei: KINDER }),
  ]),

  // =========================================================================
  // KÜCHE & VERPFLEGUNG
  // =========================================================================
  ...group('kueche', [
    i('ku.kaffee', 'Kaffee + Milchschäumer', { arten: NUR_CAMPER }),
    i('ku.kuehlschrank', 'Essen aus Kühlschrank'),
    i('ku.gefrierer', 'Essen aus Gefrierer', { arten: MIT_KUECHE }),
    i('ku.keller', 'Essen aus Keller', { arten: MIT_KUECHE }),
    i('ku.kueche', 'Essen aus Küche'),
    i('ku.hoernli', 'Hörnli', { arten: MIT_KUECHE }),
    i('ku.gewuerze', 'Gewürze', { arten: NUR_CAMPER, teile: ['Öl', 'Essig', 'Salz', 'Paprika', 'Zwiebel', 'Frühlingskräuter', 'Balsamico', 'Bouillon', 'Härdöpfelgwürz'] }),
    i('ku.ruestmesser', 'Rüstmesser', { q: 2, arten: NUR_CAMPER }),
    i('ku.kinderbesteck', 'Kinderbesteck', { arten: NUR_CAMPER, dabei: KINDER }),
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
    i('ha.kleiderbuegel', 'Kleiderbügel', { arten: NICHT_LENZ }),
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
    i('rt.warnweste', 'Warnweste & Pannendreieck'),
    i('rt.schneeketten', 'Schneeketten', { jz: KUEHL }),
    i('rt.tanken', 'Tanken & Reifendruck prüfen'),
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
    i('ko.heizung', 'Heizung runtergedreht', { jz: KUEHL }),
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
