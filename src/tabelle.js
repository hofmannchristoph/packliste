/**
 * Stammliste als Tabelle aus- und einlesen.
 *
 * Die Struktur der Liste – was gehört wem, unter welchen Bedingungen, in
 * welcher Menge – lässt sich in einer Tabelle in Minuten umbauen und in der
 * App nur Zeile für Zeile. Darum dieser Weg: exportieren, in Excel oder
 * Numbers überarbeiten, zurückspielen.
 *
 * Bereiche und Aktivitäten entstehen aus dem Blatt selbst. Ein Bereich ohne
 * Einträge und eine Aktivität, an der nichts hängt, bewirken sowieso nichts –
 * es gibt also nichts doppelt zu pflegen. Reisearten, Jahreszeiten, Regionen
 * und Personen sind dagegen fest: an ihnen hängt Logik, ein Tippfehler soll
 * dort auffallen statt still eine vierte Reiseart anzulegen.
 *
 * Eingelesen wird sowohl das, was Excel beim Kopieren in die Zwischenablage
 * legt (Tabulatoren), als auch eine gespeicherte CSV-Datei (Semikolon oder
 * Komma). Der Trenner wird an der Kopfzeile erkannt.
 */

import {
  ARTEN,
  JAHRESZEITEN,
  REGIONEN,
  PERSONEN,
  ALLE_PERSONEN,
  ERWACHSENE,
  KINDER,
} from './model.js';

/** Reihenfolge der Spalten beim Export. Beim Import zählt die Kopfzeile. */
export const SPALTEN = [
  'Schlüssel',
  'Bereich',
  'Gegenstand',
  'Teil von',
  'Für wen',
  'Anzahl',
  'Pro Nacht',
  'Zuschlag',
  'Max',
  'Max mit Waschmaschine',
  'Reiseart',
  'Aktivität',
  'Jahreszeit',
  'Region',
  'Nur wenn dabei',
  'Ab Nächten',
  'Notiz',
];

/**
 * Vergleichsform: ohne Umlaute, Zwischenräume und Satzzeichen.
 *
 * „Für wen", „für wen" und „Fuer Wen" sollen dieselbe Spalte treffen, und
 * „Basislager 4.0" soll auch als „basislager" erkannt werden.
 */
const norm = (s) =>
  String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '');

/** Mehrwertige Zellen: „MTB, Gravel" oder „MTB; Gravel" oder „MTB / Gravel". */
const teileAuf = (zelle) =>
  String(zelle ?? '')
    .split(/[,;/·|\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);

/**
 * Eine mehrwertige Zelle zerlegen, ohne Bezeichnungen zu zerreissen.
 *
 * „Europa, ohne Schengen" enthält ein Komma und „Badi / Bogn" einen
 * Schrägstrich – beides Zeichen, an denen sonst getrennt wird. Darum werden
 * benachbarte Bruchstücke wieder zusammengesetzt, sobald sie gemeinsam eine
 * bekannte Bezeichnung ergeben. Verglichen wird in der Normalform, in der die
 * Trennzeichen ohnehin wegfallen.
 */
function zerlegeWerte(zelle, kandidaten) {
  const stuecke = teileAuf(zelle);
  const bekannt = new Map();
  for (const k of kandidaten) {
    bekannt.set(norm(k.label), k);
    if (k.id) bekannt.set(norm(k.id), k);
  }
  const out = [];
  for (let i = 0; i < stuecke.length; ) {
    let genommen = false;
    for (let j = Math.min(i + 4, stuecke.length); j > i; j--) {
      const treffer = bekannt.get(norm(stuecke.slice(i, j).join('')));
      if (treffer) {
        out.push({ roh: stuecke.slice(i, j).join(', '), treffer });
        i = j;
        genommen = true;
        break;
      }
    }
    if (!genommen) {
      out.push({ roh: stuecke[i], treffer: null });
      i++;
    }
  }
  return out;
}

/**
 * Zahl aus einer Zelle, mit Wertebereich.
 *
 * Vorher wurde alles genommen, was `Number` verdaute: eine negative Obergrenze,
 * ein Faktor von 900 oder ein Tippfehler wanderten unbemerkt in die Regeln und
 * fielen erst auf, wenn die Liste absurde Mengen zeigte.
 */
const zahl = (zelle, standard = 0, { min = null, max = null, feld = null, fehler = null, zeilenNr = 0 } = {}) => {
  const roh = String(zelle ?? '').trim().replace(',', '.');
  if (!roh) return standard;
  const n = Number(roh);
  if (!Number.isFinite(n)) {
    fehler?.push(`Zeile ${zeilenNr}: ${feld ?? 'Zahl'} »${roh}« ist keine Zahl.`);
    return standard;
  }
  if ((min !== null && n < min) || (max !== null && n > max)) {
    fehler?.push(
      `Zeile ${zeilenNr}: ${feld ?? 'Zahl'} ${n} liegt ausserhalb des Erlaubten (${min ?? '−∞'} bis ${max ?? '∞'}).`
    );
    return standard;
  }
  return n;
};

const JA = ['x', 'ja', 'j', 'yes', 'y', '1', 'wahr', 'true', 'X'];
const istJa = (zelle) => JA.includes(String(zelle ?? '').trim().toLowerCase());

// ---------------------------------------------------------------------------
// Lesen und Schreiben des Rohformats
// ---------------------------------------------------------------------------

/**
 * Eine Tabelle in Zeilen und Zellen zerlegen.
 *
 * Anführungszeichen werden beachtet, weil eine Notiz durchaus ein Semikolon
 * oder einen Zeilenumbruch enthalten darf – Excel schreibt sie dann in
 * Anführungszeichen, doppelte Anführungszeichen stehen für ein einzelnes.
 */
export function zerlege(text, trenner) {
  const zeilen = [];
  let zeile = [];
  let feld = '';
  let inQuote = false;
  const roh = String(text ?? '').replace(/^﻿/, '');

  for (let i = 0; i < roh.length; i++) {
    const c = roh[i];
    if (inQuote) {
      if (c === '"') {
        if (roh[i + 1] === '"') {
          feld += '"';
          i++;
        } else inQuote = false;
      } else feld += c;
      continue;
    }
    if (c === '"' && feld === '') inQuote = true;
    else if (c === trenner) {
      zeile.push(feld);
      feld = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && roh[i + 1] === '\n') i++;
      zeile.push(feld);
      zeilen.push(zeile);
      zeile = [];
      feld = '';
    } else feld += c;
  }
  if (feld !== '' || zeile.length) {
    zeile.push(feld);
    zeilen.push(zeile);
  }
  return zeilen;
}

/** Trenner an der Zeile mit den meisten Treffern erkennen. */
export function trennerVon(text) {
  const kopf = String(text ?? '').split(/\r?\n/).slice(0, 5).join('\n');
  const zaehle = (c) => kopf.split(c).length - 1;
  const kandidaten = [
    ['\t', zaehle('\t')],
    [';', zaehle(';')],
    [',', zaehle(',')],
  ];
  kandidaten.sort((a, b) => b[1] - a[1]);
  return kandidaten[0][1] > 0 ? kandidaten[0][0] : '\t';
}

const zelleRaus = (wert, trenner) => {
  const s = String(wert ?? '');
  return new RegExp(`["\\n\\r${trenner === '\t' ? '\\t' : trenner}]`).test(s)
    ? `"${s.replace(/"/g, '""')}"`
    : s;
};

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

const labelListe = (ids, liste) =>
  (ids ?? []).map((id) => liste.find((o) => o.id === id)?.label ?? id).join(', ');

/**
 * `wer` wieder zu etwas Lesbarem machen.
 *
 * Steht genau die Gruppe drin, wird sie auch als Gruppe geschrieben – sonst
 * wächst das Blatt bei jedem Eintrag um vier Namen und wird unlesbar.
 */
function werText(wer = []) {
  if (!wer.length) return '';
  const gleich = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
  if (gleich(wer, ALLE_PERSONEN)) return 'Alle';
  if (gleich(wer, ERWACHSENE)) return 'Erwachsene';
  if (gleich(wer, KINDER)) return 'Kinder';
  return wer.map((id) => PERSONEN.find((p) => p.id === id)?.name ?? id).join(', ');
}

/**
 * Die Stammliste als Tabelle.
 *
 * Behälter stehen vor ihren Teilen, die Teile tragen den Schlüssel des
 * Behälters – so übersteht die Zuordnung auch ein Sortieren in Excel.
 */
export function alsTabelle({ master, bereiche, aktivitaeten }, trenner = '\t') {
  const reihen = [SPALTEN];
  const bOrder = new Map(bereiche.map((b, i) => [b.id, i]));

  // Auch ein beschädigter Eintrag muss noch heraus – der Export ist der Rettungsweg.
  const text = (e) => (typeof e?.label === 'string' && e.label ? e.label : String(e?.id ?? ''));
  const eintraege = Object.values(master)
    .filter((e) => e && !e.deleted)
    .sort(
      (a, b) =>
        (bOrder.get(a.category) ?? 99) - (bOrder.get(b.category) ?? 99) ||
        text(a).localeCompare(text(b), 'de')
    );

  for (const e of eintraege) {
    const bereich = bereiche.find((b) => b.id === e.category)?.label ?? e.category;
    reihen.push([
      e.id,
      bereich,
      text(e),
      '',
      werText(e.wer),
      e.qty ?? 1,
      e.qtyMode === 'pronacht' ? 'x' : '',
      e.plus || '',
      e.cap ?? '',
      e.capWasch ?? '',
      labelListe(e.arten, ARTEN),
      labelListe(e.aktivitaeten, aktivitaeten),
      labelListe(e.jahreszeiten, JAHRESZEITEN),
      labelListe(e.regionen, REGIONEN),
      (e.wennDabei ?? []).map((id) => PERSONEN.find((p) => p.id === id)?.name ?? id).join(', '),
      e.minNaechte || '',
      e.note ?? '',
    ]);
    for (const t of e.teile ?? []) {
      reihen.push([
        '',
        bereich,
        t.label,
        e.id,
        '',
        t.qty ?? 1,
        t.pronacht ? 'x' : '',
        t.plus || '',
        t.cap ?? '',
        '',
        labelListe(t.arten, ARTEN),
        labelListe(t.aktivitaeten, aktivitaeten),
        labelListe(t.jahreszeiten, JAHRESZEITEN),
        '',
        (t.wennDabei ?? []).map((id) => PERSONEN.find((p) => p.id === id)?.name ?? id).join(', '),
        t.minNaechte || '',
        '',
      ]);
    }
  }

  return reihen.map((r) => r.map((z) => zelleRaus(z, trenner)).join(trenner)).join('\n');
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

/** Erlaubte Schreibweisen je Spalte, damit die Kopfzeile nicht exakt stimmen muss. */
const SPALTEN_ALIAS = {
  schluessel: ['schlussel', 'schlussel', 'key', 'id'],
  bereich: ['bereich', 'kategorie'],
  gegenstand: ['gegenstand', 'artikel', 'sache', 'label', 'bezeichnung'],
  teilvon: ['teilvon', 'teil', 'gehortzu', 'behalter'],
  wer: ['furwen', 'wer', 'person', 'personen'],
  anzahl: ['anzahl', 'menge', 'stuck', 'faktor'],
  pronacht: ['pronacht', 'jenacht', 'pronachte'],
  plus: ['zuschlag', 'plus'],
  cap: ['max', 'maximum', 'obergrenze'],
  capwasch: ['maxmitwaschmaschine', 'maxwaschmaschine', 'maxwasch'],
  arten: ['reiseart', 'reisearten', 'art', 'arten'],
  aktivitaeten: ['aktivitat', 'aktivitaten', 'aktivitaet', 'aktivitaeten'],
  jahreszeiten: ['jahreszeit', 'jahreszeiten', 'saison'],
  regionen: ['region', 'regionen'],
  wenndabei: ['nurwenndabei', 'wenndabei', 'nurwenn'],
  minnaechte: ['abnachten', 'minnachte', 'mindestnachte', 'abnacht'],
  note: ['notiz', 'bemerkung', 'hinweis', 'kommentar'],
};

function spaltenIndex(kopf) {
  const idx = {};
  kopf.forEach((zelle, i) => {
    const n = norm(zelle);
    if (!n) return;
    for (const [feld, aliase] of Object.entries(SPALTEN_ALIAS)) {
      if (aliase.includes(n) && idx[feld] === undefined) idx[feld] = i;
    }
  });
  return idx;
}

/**
 * Werte gegen eine feste Liste auflösen; Unbekanntes wird gemeldet.
 *
 * Abkürzen ist erlaubt – „Basislager" trifft „Basislager 4.0". Aber nur, wenn
 * der Anfang eindeutig ist: „Sch" könnte Schweiz oder Schengen heissen, und da
 * ist Nachfragen besser als Raten.
 */
function feste(zelle, liste, wieHeisstDieSpalte, fehler, zeilenNr) {
  const out = [];
  for (const { roh, treffer } of zerlegeWerte(zelle, liste)) {
    if (treffer) {
      out.push(treffer.id);
      continue;
    }
    const n = norm(roh);
    const anfang = n.length >= 3 ? liste.filter((o) => norm(o.label).startsWith(n)) : [];
    if (anfang.length === 1) out.push(anfang[0].id);
    else if (anfang.length > 1) {
      fehler.push(
        `Zeile ${zeilenNr}: ${wieHeisstDieSpalte} »${roh}« ist mehrdeutig – gemeint ist ${anfang
          .map((o) => o.label)
          .join(' oder ')}?`
      );
    } else {
      fehler.push(
        `Zeile ${zeilenNr}: ${wieHeisstDieSpalte} »${roh}« gibt es nicht. Möglich: ${liste
          .map((o) => o.label)
          .join(', ')}`
      );
    }
  }
  return [...new Set(out)];
}

function personen(zelle, fehler, zeilenNr, spalte = 'Für wen') {
  const out = [];
  for (const roh of teileAuf(zelle)) {
    const n = norm(roh);
    // Namen enthalten keine Trennzeichen – hier genügt das einfache Zerlegen.
    if (n === 'alle') out.push(...ALLE_PERSONEN);
    else if (n === 'erwachsene' || n === 'erwachsen') out.push(...ERWACHSENE);
    else if (n === 'kinder' || n === 'kind') out.push(...KINDER);
    else if (n === 'gemeinsam' || n === 'alleplus') continue;
    else {
      const p = PERSONEN.find((p) => norm(p.name) === n || p.id === n);
      if (p) out.push(p.id);
      else
        fehler.push(
          `Zeile ${zeilenNr}: ${spalte} »${roh}« ist keine Person. Möglich: ${PERSONEN.map(
            (p) => p.name
          ).join(', ')}, Erwachsene, Kinder, Alle`
        );
    }
  }
  return [...new Set(out)];
}

/**
 * Schlüssel aus einer Bezeichnung.
 *
 * Gekürzt wird, damit Schlüssel lesbar bleiben – aber zwei Bereiche, die sich
 * erst nach der Kürzung unterscheiden, bekamen vorher denselben und fielen
 * beim Übernehmen still zu einem zusammen. Deshalb hängt bei längeren
 * Bezeichnungen ein kurzer Abdruck des Ganzen an.
 */
const slug = (s) => {
  const n = norm(s);
  if (!n) return 'x';
  if (n.length <= 24) return n;
  let h = 0;
  for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0;
  return `${n.slice(0, 24)}${h.toString(36)}`;
};

/**
 * Eine Tabelle in eine Stammliste verwandeln.
 *
 * Nichts wird dabei gespeichert – das Ergebnis ist ein Vorschlag samt Fehlern
 * und Hinweisen, den die App erst zeigt und dann auf Knopfdruck übernimmt.
 * Solange auch nur ein Fehler drinsteht, wird nicht übernommen: eine halb
 * eingelesene Stammliste wäre schlimmer als gar keine.
 */
export function leseTabelle(text, { bereiche = [], aktivitaeten = [] } = {}) {
  const fehler = [];
  const hinweise = [];
  const trenner = trennerVon(text);
  const zeilen = zerlege(text, trenner).filter((r) => r.some((z) => String(z).trim()));

  if (!zeilen.length) return { fehler: ['Die Tabelle ist leer.'], hinweise, master: {}, bereiche, aktivitaeten };

  // Vor der Kopfzeile darf eine Überschrift oder eine Legende stehen.
  const kopfNr = zeilen.findIndex((r) => r.some((z) => SPALTEN_ALIAS.gegenstand.includes(norm(z))));
  if (kopfNr < 0) {
    return {
      fehler: ['Keine Kopfzeile gefunden – eine Spalte muss »Gegenstand« heissen.'],
      hinweise,
      master: {},
      bereiche,
      aktivitaeten,
    };
  }
  const idx = spaltenIndex(zeilen[kopfNr]);
  for (const pflicht of ['bereich', 'gegenstand']) {
    if (idx[pflicht] === undefined) fehler.push(`Die Spalte »${pflicht}« fehlt.`);
  }
  if (fehler.length) return { fehler, hinweise, master: {}, bereiche, aktivitaeten };

  const zelle = (r, feld) => (idx[feld] === undefined ? '' : String(r[idx[feld]] ?? '').trim());

  // Bereiche und Aktivitäten wachsen beim Lesen mit.
  const neueBereiche = [];
  const neueAkt = aktivitaeten.map((a) => ({ ...a }));
  const bereichVon = (label, zeilenNr) => {
    const n = norm(label);
    if (!n) {
      fehler.push(`Zeile ${zeilenNr}: kein Bereich angegeben.`);
      return null;
    }
    const da = neueBereiche.find((b) => norm(b.label) === n);
    if (da) return da.id;
    const alt = bereiche.find((b) => norm(b.label) === n);
    const b = alt ? { ...alt } : { id: `b.${slug(label)}`, label: label.trim(), ico: 'doc' };
    if (!alt) hinweise.push(`Neuer Bereich: ${b.label}`);
    neueBereiche.push(b);
    return b.id;
  };
  const aktVon = (zellwert) => {
    const out = [];
    for (const { roh, treffer } of zerlegeWerte(zellwert, neueAkt)) {
      if (treffer) {
        out.push(treffer.id);
        continue;
      }
      const a = { id: `a.${slug(roh)}`, label: roh.trim() };
      neueAkt.push(a);
      hinweise.push(`Neue Aktivität: ${a.label}`);
      out.push(a.id);
    }
    return [...new Set(out)];
  };

  const master = Object.create(null);
  const reihenfolge = [];
  let letzterEintrag = null;
  /*
   * Teile, deren Behälter erst später kommt, werden zurückgestellt.
   *
   * Der Export schreibt bewusst den Schlüssel des Behälters in jede Teilzeile,
   * damit ein Sortieren in Excel die Zuordnung nicht zerreisst. Ohne diesen
   * zweiten Durchgang hätte das Versprechen nur rückwärts gehalten.
   */
  const nachtrag = [];

  for (let r = kopfNr + 1; r < zeilen.length; r++) {
    const zeilenNr = r + 1; // wie in Excel gezählt
    const reihe = zeilen[r];
    const label = zelle(reihe, 'gegenstand');
    if (!label) {
      /*
       * Eine ganz leere Zeile ist Absicht, eine mit Schlüssel oder Bereich aber
       * fast immer ein Versehen – in einem Blatt mit 350 Zeilen löschte ein
       * versehentlich geleerter Name den Eintrag lautlos.
       */
      if (zelle(reihe, 'schluessel') || zelle(reihe, 'bereich') || zelle(reihe, 'teilvon')) {
        fehler.push(`Zeile ${zeilenNr}: kein Gegenstand angegeben. Zeile ganz leeren, um sie zu entfernen.`);
      }
      continue;
    }

    const teilVon = zelle(reihe, 'teilvon');
    const istTeil = Boolean(teilVon);
    const category = bereichVon(zelle(reihe, 'bereich'), zeilenNr);

    const z = (feldname, standard, min, max, anzeige) =>
      zahl(zelle(reihe, feldname), standard, { min, max, feld: anzeige, fehler, zeilenNr });

    const gemeinsam = {
      label,
      qty: z('anzahl', 1, 0, 999, 'Anzahl') || 1,
      plus: z('plus', 0, 0, 99, 'Zuschlag'),
      cap: zelle(reihe, 'cap') !== '' ? z('cap', 0, 0, 999, 'Max') : null,
      arten: feste(zelle(reihe, 'arten'), ARTEN, 'Reiseart', fehler, zeilenNr),
      aktivitaeten: aktVon(zelle(reihe, 'aktivitaeten')),
      jahreszeiten: feste(zelle(reihe, 'jahreszeiten'), JAHRESZEITEN, 'Jahreszeit', fehler, zeilenNr),
      wennDabei: personen(zelle(reihe, 'wenndabei'), fehler, zeilenNr, 'Nur wenn dabei'),
      minNaechte: z('minnaechte', 0, 0, 365, 'Ab Nächten'),
    };

    if (istTeil) {
      // »x« heisst: gehört zum Eintrag darüber. Sonst steht der Schlüssel da.
      const ziel = istJa(teilVon)
        ? letzterEintrag
        : master[teilVon] ?? Object.values(master).find((e) => norm(e.label) === norm(teilVon));
      if (!ziel) {
        // »x« meint die Zeile darüber; alles andere kann noch kommen.
        if (!istJa(teilVon)) {
          nachtrag.push({ zeilenNr, label, teilVon, gemeinsam, pronacht: istJa(zelle(reihe, 'pronacht')) });
          continue;
        }
        fehler.push(`Zeile ${zeilenNr}: »${label}« soll Teil von »${teilVon}« sein – das gibt es hier nicht.`);
        continue;
      }
      if (zelle(reihe, 'capwasch') || zelle(reihe, 'regionen')) {
        hinweise.push(
          `Zeile ${zeilenNr}: Teile kennen weder Region noch Waschmaschinen-Maximum – die Spalten bleiben hier leer.`
        );
      }
      ziel.teile.push({ ...gemeinsam, pronacht: istJa(zelle(reihe, 'pronacht')) });
      continue;
    }

    /*
     * Schlüssel prüfen, bevor er zum Objektschlüssel wird.
     *
     * Erlaubt ist, was der Export selbst schreibt. Und drei Namen sind
     * ausgeschlossen, weil sie in JavaScript keine gewöhnlichen Schlüssel sind:
     * `__proto__` würde nicht einen Eintrag anlegen, sondern den Prototyp der
     * ganzen Stammliste austauschen.
     */
    const roherSchluessel = zelle(reihe, 'schluessel');
    if (roherSchluessel && !/^[A-Za-z0-9:._-]{1,80}$/.test(roherSchluessel)) {
      fehler.push(`Zeile ${zeilenNr}: der Schlüssel »${roherSchluessel}« enthält unerlaubte Zeichen.`);
      continue;
    }
    if (['__proto__', 'constructor', 'prototype'].includes(roherSchluessel)) {
      fehler.push(`Zeile ${zeilenNr}: »${roherSchluessel}« ist als Schlüssel nicht zulässig.`);
      continue;
    }
    const schluessel =
      roherSchluessel ||
      `m:${slug(zelle(reihe, 'bereich')).slice(0, 6)}.${slug(label)}${
        zelle(reihe, 'wer') ? `.${slug(zelle(reihe, 'wer')).slice(0, 6)}` : ''
      }`;
    if (master[schluessel]) {
      fehler.push(
        `Zeile ${zeilenNr}: den Schlüssel »${schluessel}« gibt es zweimal. Bei gleichem Gegenstand für verschiedene Personen bitte den Schlüssel von Hand unterscheiden.`
      );
      continue;
    }

    const eintrag = {
      ...gemeinsam,
      id: schluessel,
      category,
      wer: personen(zelle(reihe, 'wer'), fehler, zeilenNr),
      qtyMode: istJa(zelle(reihe, 'pronacht')) ? 'pronacht' : 'fest',
      capWasch: zelle(reihe, 'capwasch') !== '' ? z('capwasch', 0, 0, 999, 'Max mit Waschmaschine') : null,
      regionen: feste(zelle(reihe, 'regionen'), REGIONEN, 'Region', fehler, zeilenNr),
      note: zelle(reihe, 'note'),
      teile: [],
      deleted: false,
    };
    master[schluessel] = eintrag;
    reihenfolge.push(schluessel);
    letzterEintrag = eintrag;
  }

  // Zweiter Durchgang für Teile, deren Behälter erst weiter unten stand.
  for (const n of nachtrag) {
    const ziel =
      master[n.teilVon] ?? Object.values(master).find((e) => norm(e.label) === norm(n.teilVon));
    if (!ziel) {
      fehler.push(
        `Zeile ${n.zeilenNr}: »${n.label}« soll Teil von »${n.teilVon}« sein – das gibt es hier nicht.`
      );
      continue;
    }
    ziel.teile.push({ ...n.gemeinsam, pronacht: n.pronacht });
  }

  if (!Object.keys(master).length && !fehler.length) fehler.push('Keine einzige Zeile mit einem Gegenstand gefunden.');

  return {
    fehler,
    hinweise: [...new Set(hinweise)],
    master,
    bereiche: neueBereiche,
    aktivitaeten: neueAkt,
    anzahl: {
      eintraege: Object.keys(master).length,
      teile: Object.values(master).reduce((n, e) => n + e.teile.length, 0),
      bereiche: neueBereiche.length,
      aktivitaeten: neueAkt.length,
    },
  };
}
