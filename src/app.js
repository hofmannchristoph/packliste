import {
  ARTEN,
  ARTEN_MIT_REGION,
  ART_MIT_WASCHMASCHINE,
  JAHRESZEITEN,
  REGIONEN,
  PERSONEN,
  SHARED,
  byId,
  labelOf,
  personName,
} from './model.js';
import { icon, iconTile, ICON_NAMES, ART_ICONS } from './icons.js';
import {
  regenerate,
  resolveParams,
  progress,
  amount,
  matches,
  kinderVon,
  containerStand,
  teileVon,
  werVon,
} from './generator.js';
import * as store from './store.js';
import { beschriftung } from './store.js';
import * as sync from './sync.js';
import { alsTabelle, leseTabelle } from './tabelle.js';
import {
  visibleItems as listeVisibleItems,
  sichtbareTeile as listeSichtbareTeile,
  groupItems as listeGroupItems,
  nachName,
} from './liste.js';

const $ = (sel) => document.querySelector(sel);
const view = $('#view');
const sheetBackdrop = $('#sheetBackdrop');
const sheet = $('#sheet');

let tab = 'reisen';
let filter = { mode: 'offen', who: 'alle', group: 'person' };
let stammFilter = { bereich: 'alle', suche: '' };
/**
 * Zugeklappte Behälter. Standardmässig ist alles offen – beim Packen will man
 * sehen, was drin ist. Nur für die Ansicht, wird nicht gespeichert.
 */
const zugeklappt = new Set();
/** Welches Schnell-Eingabefeld unter einem Abschnitt offen ist (`Bereich|Person`). */
let addFeld = null;

/** Bereiche und Aktivitäten kommen aus dem Zustand – sie sind bearbeitbar. */
const BEREICHE = () => store.bereiche();
const AKTIVITAETEN = () => store.aktivitaeten();

const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );

const TAB_ICONS = { reisen: 'bag', liste: 'check', reise: 'tune', stamm: 'list' };
const TAB_TITEL = {
  reisen: ['Reisen', 'Familie Hofmann'],
  stamm: ['Stammliste', 'Vorlage für neue Reisen'],
  sync: ['Sync', 'Geräte abgleichen'],
};

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

store.load();
if (store.state.data.activeTripId && !store.activeTrip()) store.state.data.activeTripId = null;

store.subscribe(() => {
  render();
  sync.pushAll();
});

/*
 * Statuswechsel zeichnen nur neu.
 *
 * Hier lag die Rückkopplung: Ein gescheiterter Upload meldete den Status, der
 * Status galt als Datenänderung, und die löste den nächsten Upload aus. Ohne
 * Verbindung lief das endlos.
 */
store.subscribeStatus(() => render());

document.querySelectorAll('.tab').forEach((btn) => {
  const name = TAB_ICONS[btn.dataset.tab];
  btn.querySelector('.tab-ico').innerHTML = icon(name, 24);
  btn.addEventListener('click', () => setTab(btn.dataset.tab));
});

$('#btnSync').innerHTML = `${icon('sync', 20)}<span class="sync-dot" id="syncDot"></span>`;
$('#tripSwitch').addEventListener('click', () => setTab('reisen'));
$('#btnSync').addEventListener('click', () => setTab('sync'));

sheetBackdrop.addEventListener('click', (e) => {
  if (e.target === sheetBackdrop) closeSheet();
});

function setTab(next) {
  tab = next;
  document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('is-active', b.dataset.tab === next));
  window.scrollTo({ top: 0 });
  render();
}

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

/**
 * Kurze Rückmeldung unten. `aktion` hängt einen Knopf an, etwa zum
 * Widerrufen eines Löschvorgangs.
 */
function toast(msg, aktion = null, ms = aktion ? 5000 : 2400) {
  const el = $('#toast');
  el.innerHTML = `<span>${esc(msg)}</span>${
    aktion ? `<button class="toast-aktion" type="button">${esc(aktion.text)}</button>` : ''
  }`;
  el.hidden = false;
  el.querySelector('.toast-aktion')?.addEventListener('click', () => {
    el.hidden = true;
    aktion.fn();
  });
  clearTimeout(toast._t);
  /*
   * Ein Widerrufen, das nach fester Frist verschwindet, ist für jemanden mit
   * Sprachausgabe schwer zu erreichen: bis der Text vorgelesen ist, kann der
   * Knopf schon weg sein. Deshalb ist der Balken eine Live-Region, und ein
   * Widerrufen bekommt spürbar mehr Zeit.
   */
  toast._t = setTimeout(() => (el.hidden = true), aktion ? Math.max(ms, 10000) : ms);
}

/**
 * Ein Speicherproblem gehört auf den Bildschirm, nicht in die Konsole.
 *
 * Vorher wirkte die App weiter, als sei alles gesichert – und beim nächsten
 * Start war die Packsitzung weg.
 */
function zeigeSpeicherFehler() {
  const f = store.state.speicherFehler;
  let el = $('#speicherWarnung');
  if (!f) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('div');
    el.id = 'speicherWarnung';
    el.className = 'speicher-warnung';
    el.setAttribute('role', 'alert');
    document.querySelector('.topbar').after(el);
  }
  el.textContent = f.text;
}

/**
 * Zum Löschen über eine Zeile wischen.
 *
 * Waagrecht ziehen gehört uns, senkrecht bleibt beim Browser (`touch-action`),
 * damit das Scrollen unbeeinträchtigt bleibt. Erst jenseits der Schwelle wird
 * gelöscht – und auch dann nur mit einem Widerrufen-Knopf.
 */
function wischbar(el, onDelete, { bestaetigen = false } = {}) {
  const SCHWELLE = bestaetigen ? 56 : 88;
  const OFFEN = 108;
  let x0 = 0;
  let y0 = 0;
  let dx = 0;
  let ziehen = false;
  let entschieden = false;
  let geloescht = false;
  let offen = false;

  const knopf = () => el.parentElement?.querySelector('.wisch-loeschen');

  const zuruecksetzen = () => {
    el.style.transition = 'transform .18s ease, opacity .18s ease';
    el.style.transform = '';
    el.style.opacity = '';
    el.classList.remove('wischt', 'loescht', 'ist-offen');
    offen = false;
    const k = knopf();
    if (k) {
      k.style.transition = 'width .18s ease';
      k.style.width = '0px';
      setTimeout(() => {
        if (!offen) k.hidden = true;
        k.style.transition = '';
      }, 200);
    }
    setTimeout(() => (el.style.transition = ''), 200);
  };

  /**
   * Bei Reisen wächst stattdessen ein Löschen-Knopf von rechts herein und die
   * Karte wird schmaler. Sie wegzuschieben würde Symbol und Name aus dem Bild
   * tragen – ausgerechnet das, was man vor dem Bestätigen sehen will.
   */
  const aufschieben = () => {
    offen = true;
    el.classList.add('ist-offen');
    el.classList.remove('loescht');
    const k = knopf();
    if (!k) return;
    k.hidden = false;
    k.style.transition = 'width .18s ease';
    k.style.width = `${OFFEN}px`;
    setTimeout(() => (k.style.transition = ''), 200);
    k.onclick = (e) => {
      e.stopPropagation();
      onDelete();
    };
  };

  el.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    // Kästchen, Stift und Eingabefelder behalten ihre eigene Bedienung.
    if (e.target.closest('.box-btn, .item-more, input, textarea, select')) return;
    // Steht der Löschen-Knopf offen, schliesst die nächste Berührung ihn wieder.
    if (offen) {
      entschieden = true;
      zuruecksetzen();
      return;
    }
    x0 = e.clientX;
    y0 = e.clientY;
    dx = 0;
    ziehen = true;
    entschieden = false;
    geloescht = false;
  });

  el.addEventListener('pointermove', (e) => {
    if (!ziehen) return;
    const ax = e.clientX - x0;
    const ay = e.clientY - y0;
    if (!entschieden) {
      if (Math.abs(ax) < 10 && Math.abs(ay) < 10) return;
      // Senkrechte Absicht: Finger dem Scrollen überlassen.
      if (Math.abs(ay) >= Math.abs(ax)) {
        ziehen = false;
        return;
      }
      /*
       * Nur nach links, wie bei den Apple-Apps. Nach rechts zu wischen ist beim
       * Blättern und beim Zurück-Geste-Rand zu leicht ausgelöst – und wer nach
       * rechts zieht, meint fast nie „löschen".
       */
      if (ax > 0) {
        ziehen = false;
        return;
      }
      entschieden = true;
      el.classList.add('wischt');
      // Wirft, wenn kein aktiver Zeiger zur ID gehört – die Geste läuft ohne.
      try {
        el.setPointerCapture?.(e.pointerId);
      } catch {
        /* kein Zeiger zum Einfangen */
      }
    }
    // Nie über den Ausgangspunkt hinaus nach rechts.
    dx = Math.min(0, ax);
    if (bestaetigen) {
      const k = knopf();
      if (k) {
        k.hidden = false;
        k.style.width = `${Math.min(-dx, OFFEN)}px`;
      }
    } else {
      el.classList.toggle('loescht', -dx >= SCHWELLE);
      el.style.opacity = String(Math.max(0.35, 1 + dx / 320));
      el.style.transform = `translateX(${dx}px)`;
    }
    e.preventDefault();
  });

  const ende = () => {
    if (!ziehen) return;
    ziehen = false;
    if (!entschieden) return;
    if (-dx < SCHWELLE) {
      zuruecksetzen();
    } else if (bestaetigen) {
      aufschieben();
    } else {
      geloescht = true;
      el.style.transition = 'transform .16s ease, opacity .16s ease';
      el.style.transform = 'translateX(-400px)';
      el.style.opacity = '0';
      setTimeout(onDelete, 130);
    }
  };
  el.addEventListener('pointerup', ende);
  el.addEventListener('pointercancel', ende);

  // Nach einem Wischen keinen Klick auslösen (die Stammlisten-Zeile öffnet sonst).
  el.addEventListener(
    'click',
    (e) => {
      if (entschieden || geloescht) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true
  );
}

/**
 * Bottom Sheet mit fixiertem Aktionsbereich unten – der Hauptknopf bleibt
 * beim Scrollen immer erreichbar.
 */
/** Woher das Sheet geöffnet wurde – dorthin geht der Fokus zurück. */
let fokusVorSheet = null;

function openSheet({ body, foot }, wire) {
  fokusVorSheet = document.activeElement;
  sheet.innerHTML = `<div class="sheet-griff" id="sheetGriff">
      <span class="sheet-grip"></span>
      <button class="sheet-schliessen" id="sheetSchliessen" type="button" aria-label="Schliessen">
        ${icon('close', 18)}
      </button>
    </div>
    <div class="sheet-scroll">${body}</div>
    ${foot ? `<div class="sheet-foot">${foot}</div>` : ''}`;
  sheetBackdrop.hidden = false;
  document.body.style.overflow = 'hidden';
  sheet.querySelector('.sheet-scroll').scrollTop = 0;
  sheet.style.transform = '';
  griffZiehen();
  wire?.(sheet);

  /*
   * Ein Sheet ohne Ausweg ist eine Falle. Vorher führte aus vier von zwölf
   * Sheets nur eine Zeigergeste heraus – Hintergrundklick oder Ziehen am
   * Griff. Jetzt gibt es überall einen Knopf, Escape schliesst, und der Fokus
   * bleibt drin, statt hinter dem Sheet weiterzuwandern.
   */
  sheet.querySelector('#sheetSchliessen').addEventListener('click', closeSheet);
  // Die Überschrift benennt den Dialog, damit die Sprachausgabe weiss, wo sie ist.
  const titel = sheet.querySelector('h3');
  if (titel) {
    titel.id = titel.id || 'sheetTitel';
    sheet.setAttribute('aria-labelledby', titel.id);
  } else sheet.removeAttribute('aria-labelledby');

  /*
   * Den Fokus auf das Sheet selbst setzen, nicht auf sein erstes Bedienelement.
   *
   * Sonst scrollt das Sheet beim Öffnen an seiner eigenen Überschrift vorbei,
   * und die Sprachausgabe beginnt mitten im Inhalt statt beim Namen des
   * Dialogs. Sheets, die bewusst ein Feld anspringen – etwa der Reisename –,
   * haben das in ihrem eigenen Code schon getan; das wird nicht überschrieben.
   */
  if (!sheet.contains(document.activeElement)) {
    sheet.tabIndex = -1;
    sheet.focus({ preventScroll: true });
  }
}

/** Fokus im Sheet halten und mit Escape hinaus. */
function sheetTasten(e) {
  if (sheetBackdrop.hidden) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    closeSheet();
    return;
  }
  if (e.key !== 'Tab') return;
  const ziele = [...sheet.querySelectorAll('a[href], button, input, textarea, select, [tabindex]')].filter(
    (el) => !el.disabled && el.tabIndex !== -1 && el.offsetParent !== null
  );
  if (!ziele.length) return;
  const [erstes, letztes] = [ziele[0], ziele[ziele.length - 1]];
  if (e.shiftKey && document.activeElement === erstes) {
    e.preventDefault();
    letztes.focus();
  } else if (!e.shiftKey && document.activeElement === letztes) {
    e.preventDefault();
    erstes.focus();
  }
}
document.addEventListener('keydown', sheetTasten);

/**
 * Am Griff nach unten ziehen schliesst das Sheet. Der Griff sieht wie ein
 * Ziehen aus, also soll er sich auch so verhalten – sonst führt aus einem
 * Formular nur der Speichern-Knopf heraus.
 */
function griffZiehen() {
  const griff = sheet.querySelector('#sheetGriff');
  if (!griff) return;
  const SCHWELLE = 110;
  let y0 = 0;
  let dy = 0;
  let ziehen = false;

  griff.addEventListener('pointerdown', (e) => {
    y0 = e.clientY;
    dy = 0;
    ziehen = true;
    try {
      griff.setPointerCapture?.(e.pointerId);
    } catch {
      /* kein Zeiger zum Einfangen */
    }
    sheet.style.transition = '';
  });
  griff.addEventListener('pointermove', (e) => {
    if (!ziehen) return;
    dy = Math.max(0, e.clientY - y0);
    sheet.style.transform = `translateY(${dy}px)`;
    e.preventDefault();
  });
  const ende = () => {
    if (!ziehen) return;
    ziehen = false;
    sheet.style.transition = 'transform .2s ease';
    if (dy >= SCHWELLE) {
      sheet.style.transform = 'translateY(100%)';
      setTimeout(closeSheet, 180);
    } else {
      sheet.style.transform = '';
    }
    setTimeout(() => (sheet.style.transition = ''), 220);
  };
  griff.addEventListener('pointerup', ende);
  griff.addEventListener('pointercancel', ende);
}

function closeSheet() {
  sheetBackdrop.hidden = true;
  sheet.innerHTML = '';
  sheet.style.transform = '';
  document.body.style.overflow = '';
  // Zurück, woher man kam – sonst beginnt die Tastaturbedienung wieder von vorn.
  if (fokusVorSheet?.isConnected) fokusVorSheet.focus?.();
  fokusVorSheet = null;
}

function confirmSheet({ titel, text, knopf, gefahr = true }, onJa) {
  openSheet(
    {
      body: `<h3>${esc(titel)}</h3><p class="hint">${esc(text)}</p>`,
      foot: `<button class="btn ${gefahr ? 'danger' : 'primary'}" id="cYes">${esc(knopf)}</button>
             <button class="btn" id="cNo">Abbrechen</button>`,
    },
    (root) => {
      root.querySelector('#cYes').addEventListener('click', onJa);
      root.querySelector('#cNo').addEventListener('click', closeSheet);
    }
  );
}

/** Angaben ändern und die Liste sofort neu ableiten. */
function applyParams(trip, patch) {
  store.setParams(trip.id, patch);
  const fresh = store.state.data.trips[trip.id];
  const { items, added, removed } = regenerate(fresh);
  fresh.items = items;
  store.persist();
  store.emit();
  if (added || removed) toast(`${added} dazu, ${removed} entfernt`);
}

function regenerateActive(trip, stille = false) {
  const { items, added, removed } = regenerate(trip);
  trip.items = items;
  store.persist();
  store.emit();
  if (!stille) toast(added || removed ? `${added} dazu, ${removed} entfernt` : 'Liste ist aktuell');
  return { added, removed };
}

function naechteText(n) {
  return `${n} ${n === 1 ? 'Nacht' : 'Nächte'}`;
}

function tripSummary(trip) {
  const p = resolveParams(trip);
  return [byId(ARTEN, p.art)?.label, naechteText(p.naechte), labelOf(JAHRESZEITEN, p.jahreszeit)]
    .filter(Boolean)
    .join(' · ');
}

/** Die Personen, die auf dieser Reise dabei sind – als Chip-Vorlage. */
function trippersonen(trip) {
  return resolveParams(trip)
    .mit.map((id) => byId(PERSONEN, id))
    .filter(Boolean)
    .map((p) => ({ id: p.id, label: p.name }));
}

function chipsSingle(list, current, attr) {
  return list
    .map(
      (o) =>
        `<button class="chip ${o.id === current ? 'is-active' : ''}" data-${attr}="${o.id}">${esc(o.label)}</button>`
    )
    .join('');
}

function chipsMulti(list, selected, attr) {
  const set = new Set(selected ?? []);
  return list
    .map(
      (o) =>
        `<button class="chip ${set.has(o.id) ? 'is-active' : ''}" data-${attr}="${o.id}">${esc(o.label)}</button>`
    )
    .join('');
}

/** Einfachauswahl über Chips: einer ist immer aktiv. */
function bindSingle(root, sel, attr, onPick) {
  const chips = [...root.querySelectorAll(`${sel} [data-${attr}]`)];
  chips.forEach((el) =>
    el.addEventListener('click', () => {
      chips.forEach((x) => x.classList.toggle('is-active', x === el));
      onPick(el.dataset[attr]);
    })
  );
}

function bindMulti(root, sel, attr, obj, key) {
  root.querySelectorAll(`${sel} [data-${attr}]`).forEach((el) =>
    el.addEventListener('click', () => {
      const s = new Set(obj[key]);
      s.has(el.dataset[attr]) ? s.delete(el.dataset[attr]) : s.add(el.dataset[attr]);
      obj[key] = [...s];
      el.classList.toggle('is-active');
    })
  );
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

function render() {
  zeigeSpeicherFehler();
  try {
    renderInner();
  } catch (err) {
    console.error(err);
    view.innerHTML = `<div class="empty"><span class="big">${icon('close', 26)}</span>
      Die Ansicht konnte nicht aufgebaut werden.<br /><code class="code">${esc(err?.message ?? err)}</code></div>`;
  }
}

function renderInner() {
  const trip = store.activeTrip();
  renderTopbar(trip);
  if (tab === 'reisen') return renderReisen();
  if (tab === 'stamm') return renderStammliste();
  if (tab === 'sync') return renderSync();
  if (!trip) {
    view.innerHTML = `<div class="empty"><span class="big">${icon('bag', 26)}</span>Keine Reise geöffnet.</div>
      <button class="btn primary" id="zuReisen">Zu den Reisen</button>`;
    $('#zuReisen').addEventListener('click', () => setTab('reisen'));
    return;
  }
  if (tab === 'liste') return renderListe(trip);
  if (tab === 'reise') return renderReise(trip);
}

function renderTopbar(trip) {
  $('#syncDot').dataset.mode = store.state.syncStatus.mode;
  $('#btnSync').title = store.state.syncStatus.text;

  const zeigeReise = trip && (tab === 'liste' || tab === 'reise');
  if (!zeigeReise) {
    const [t, s] = TAB_TITEL[tab] ?? TAB_TITEL.reisen;
    $('#topTripName').textContent = t;
    $('#topTripSub').textContent = s;
    $('#progressWrap').style.display = 'none';
    return;
  }
  const pr = progress(trip, filter.who === 'alle' ? null : filter.who);
  $('#topTripName').textContent = trip.name;
  $('#topTripSub').textContent = tripSummary(trip);
  $('#progressWrap').style.display = '';
  $('#progressFill').style.width = `${pr.pct}%`;
  $('#progressText').textContent = `${pr.done} / ${pr.total}`;
}

// ===========================================================================
// Reisen
// ===========================================================================

function renderReisen() {
  const alle = Object.values(store.state.data.trips).sort((a, b) => b.createdAt - a.createdAt);
  const offen = alle.filter((t) => !t.archived);
  const archiv = alle.filter((t) => t.archived);

  const karte = (t) => {
    const pr = progress(t);
    return `<div class="wisch-huelle">
      <div class="reise-karte ${t.id === store.state.data.activeTripId ? 'is-aktiv' : ''}">
      <button class="reise-open" data-open="${esc(t.id)}">
        ${iconTile(ART_ICONS[t.params.art] ?? 'bag')}
        <span class="reise-text">
          <span class="reise-name">${esc(t.name)}</span>
          <span class="reise-sub">${esc(tripSummary(t))}</span>
        </span>
      </button>
      <button class="reise-more" data-more="${esc(t.id)}" aria-label="Aktionen für ${esc(t.name)}">
        ${icon('dots', 20)}
      </button>
      <div class="reise-foot">
        <span class="progress-bar"><span class="progress-fill" style="width:${pr.pct}%"></span></span>
        <span class="reise-sub">${pr.done}/${pr.total}</span>
      </div>
      </div>
      <button class="wisch-loeschen" hidden>
        <span>${icon('trash', 18)} Löschen</span>
      </button>
    </div>`;
  };

  view.innerHTML = `
    <button class="btn primary" id="neueReise">${icon('plus', 20)} Neue Reise anlegen</button>
    ${
      offen.length
        ? `<h2 class="section">Aktuell</h2>${offen.map(karte).join('')}`
        : `<div class="empty"><span class="big">${icon('bag', 26)}</span>
             Noch keine Reise angelegt.<br />Leg eine an – die Liste entsteht aus der Stammliste.</div>`
    }
    ${archiv.length ? `<h2 class="section">Archiv</h2>${archiv.map(karte).join('')}` : ''}
  `;

  $('#neueReise').addEventListener('click', openNeueReise);
  // Antippen öffnet die Liste – das ist, was man fast immer will.
  view.querySelectorAll('[data-open]').forEach((b) =>
    b.addEventListener('click', () => {
      store.setActiveTrip(b.dataset.open);
      setTab('liste');
    })
  );
  // Alles Weitere steckt hinter dem Menü.
  view.querySelectorAll('[data-more]').forEach((b) =>
    b.addEventListener('click', () => openReiseSheet(b.dataset.more))
  );

  /*
   * Nach links wischen legt einen Löschen-Knopf frei, der noch angetippt werden
   * muss. Eine Reise mit Dutzenden Häkchen soll nicht an einer einzigen
   * Handbewegung hängen – anders als eine einzelne Zeile in der Liste.
   */
  view.querySelectorAll('.reise-karte').forEach((karte) =>
    wischbar(
      karte,
      () => {
        const id = karte.querySelector('[data-open]')?.dataset.open;
        const trip = store.state.data.trips[id];
        if (!trip) return;
        const kopie = JSON.parse(JSON.stringify(trip));
        const pr = progress(trip);
        store.deleteTrip(id);
        toast(
          `„${kopie.name}" gelöscht${pr.done ? ` · ${pr.done} Häkchen` : ''}`,
          { text: 'Widerrufen', fn: () => store.undoDeleteTrip(kopie) },
          8000
        );
      },
      { bestaetigen: true }
    )
  );
}

function openReiseSheet(id) {
  const trip = store.state.data.trips[id];
  if (!trip) return;
  const veraltet = store.tripMasterVeraltet(trip);
  const pr = progress(trip);
  const zeile = (ico, label, actionId, sub = '') =>
    `<button class="list-row" id="${actionId}">${iconTile(ico)}
      <span class="grow"><span>${esc(label)}</span>${sub ? `<br /><span class="sub">${esc(sub)}</span>` : ''}</span>
      ${icon('chevron', 18)}</button>`;

  openSheet(
    {
      body: `<h3>${esc(trip.name)}</h3>
        <p class="hint">${esc(tripSummary(trip))} · ${pr.done} von ${pr.total} gepackt</p>
        <div style="height:8px"></div>
        ${zeile('check', 'Liste öffnen', 'rOpen')}
        ${zeile('tune', 'Angaben ändern', 'rEdit')}
        ${
          veraltet
            ? zeile('refresh', 'Stammliste-Änderungen übernehmen', 'rRefresh', 'Die Vorlage hat sich seither geändert')
            : ''
        }
        ${zeile('copy', 'Als neue Reise duplizieren', 'rDup')}
        ${zeile('archive', trip.archived ? 'Aus dem Archiv holen' : 'Ins Archiv legen', 'rArch')}
        ${zeile('trash', 'Reise löschen', 'rDel')}`,
      foot: `<button class="btn" id="rClose">Schliessen</button>`,
    },
    (root) => {
      const oeffne = (ziel) => {
        store.setActiveTrip(trip.id);
        closeSheet();
        setTab(ziel);
      };
      root.querySelector('#rOpen').addEventListener('click', () => oeffne('liste'));
      root.querySelector('#rEdit').addEventListener('click', () => oeffne('reise'));
      root.querySelector('#rClose').addEventListener('click', closeSheet);
      root.querySelector('#rRefresh')?.addEventListener('click', () => {
        store.refreshTripMaster(trip.id);
        const { added, removed } = regenerateActive(store.state.data.trips[trip.id], true);
        closeSheet();
        toast(`Übernommen: ${added} dazu, ${removed} entfernt`);
      });
      root.querySelector('#rDup').addEventListener('click', () => {
        const neu = store.createTrip({ name: `${trip.name} (neu)`, params: { ...trip.params } });
        regenerateActive(neu, true);
        store.setActiveTrip(neu.id);
        closeSheet();
        setTab('reise');
        toast('Reise dupliziert');
      });
      root.querySelector('#rArch').addEventListener('click', () => {
        store.setTripMeta(trip.id, { archived: !trip.archived });
        closeSheet();
      });
      root.querySelector('#rDel').addEventListener('click', () =>
        confirmSheet(
          {
            titel: 'Reise löschen?',
            text: `„${trip.name}" wird entfernt. Das lässt sich nicht rückgängig machen.`,
            knopf: 'Ja, löschen',
          },
          () => {
            store.deleteTrip(trip.id);
            closeSheet();
            setTab('reisen');
          }
        )
      );
    }
  );
}

/** Neue Reise anlegen. */
function openNeueReise() {
  const entwurf = { name: '', ...store.DEFAULT_PARAMS() };

  const zeichne = (root) => {
    const zeigtRegion = ARTEN_MIT_REGION.includes(entwurf.art);
    root.querySelector('#nrBody').innerHTML = `
      <label class="field"><span>Name der Reise</span>
        <input type="text" id="nrName" value="${esc(entwurf.name)}" placeholder="z.B. Scuol im Sommer" />
      </label>

      <div class="field"><span>Art der Reise</span>
        <div class="options" id="nrArt">${ARTEN.map(
          (a) => `<button class="chip ${a.id === entwurf.art ? 'is-active' : ''}" data-art="${a.id}">${esc(a.label)}</button>`
        ).join('')}</div>
      </div>

      <div class="field"><span>Anzahl Nächte</span>
        <div class="stepper">
          <button class="step" data-n="-1" type="button" aria-label="weniger">${icon('minus', 20)}</button>
          <span class="step-val" id="nrN">${entwurf.naechte}</span>
          <button class="step" data-n="1" type="button" aria-label="mehr">${icon('plus', 20)}</button>
        </div>
      </div>

      <div class="field"><span>Jahreszeit</span>
        <div class="options" id="nrJz">${chipsSingle(JAHRESZEITEN, entwurf.jahreszeit, 'jz')}</div>
      </div>

      ${
        zeigtRegion
          ? `<div class="field"><span>Region</span>
               <div class="options" id="nrReg">${chipsSingle(REGIONEN, entwurf.region, 'reg')}</div></div>`
          : ''
      }

      <div class="field"><span>Aktivitäten</span>
        <div class="options" id="nrAkt">${chipsMulti(AKTIVITAETEN(), entwurf.aktivitaeten, 'akt')}</div>
      </div>

      <div class="field"><span>Wer kommt mit</span>
        <div class="options" id="nrMit">${chipsMulti(
          PERSONEN.map((p) => ({ id: p.id, label: p.name })),
          entwurf.mit,
          'mit'
        )}</div>
      </div>

      ${
        ART_MIT_WASCHMASCHINE.includes(entwurf.art)
          ? `<p class="hint">In Lenz ist eine Waschmaschine vorhanden – bei längeren Reisen werden die Kleidermengen begrenzt.</p>`
          : `<label class="toggle"><input type="checkbox" id="nrWasch" ${entwurf.waschmaschine ? 'checked' : ''} />
               <span>Waschmaschine vorhanden</span></label>`
      }
      <div style="height:4px"></div>
    `;

    const b = root.querySelector('#nrBody');
    b.querySelector('#nrName').addEventListener('input', (e) => (entwurf.name = e.target.value));
    b.querySelectorAll('#nrArt [data-art]').forEach((el) =>
      el.addEventListener('click', () => {
        entwurf.art = el.dataset.art;
        zeichne(root);
      })
    );
    b.querySelectorAll('.stepper .step').forEach((el) =>
      el.addEventListener('click', () => {
        entwurf.naechte = Math.max(1, Math.min(60, entwurf.naechte + Number(el.dataset.n)));
        b.querySelector('#nrN').textContent = entwurf.naechte;
      })
    );
    b.querySelectorAll('#nrJz [data-jz]').forEach((el) =>
      el.addEventListener('click', () => {
        entwurf.jahreszeit = el.dataset.jz;
        zeichne(root);
      })
    );
    b.querySelectorAll('#nrReg [data-reg]').forEach((el) =>
      el.addEventListener('click', () => {
        entwurf.region = el.dataset.reg;
        zeichne(root);
      })
    );
    bindMulti(b, '#nrAkt', 'akt', entwurf, 'aktivitaeten');
    b.querySelectorAll('#nrMit [data-mit]').forEach((el) =>
      el.addEventListener('click', () => {
        const s = new Set(entwurf.mit);
        s.has(el.dataset.mit) ? s.delete(el.dataset.mit) : s.add(el.dataset.mit);
        if (!s.size) return toast('Mindestens eine Person muss mitkommen');
        entwurf.mit = [...s];
        el.classList.toggle('is-active');
      })
    );
    b.querySelector('#nrWasch')?.addEventListener('change', (e) => (entwurf.waschmaschine = e.target.checked));
  };

  openSheet(
    {
      body: `<h3>Neue Reise</h3><div id="nrBody"></div>`,
      foot: `<button class="btn primary" id="nrSave">Reise anlegen</button>`,
    },
    (root) => {
      zeichne(root);
      root.querySelector('#nrSave').addEventListener('click', () => {
        const { name, ...params } = entwurf;
        const trip = store.createTrip({ name: name.trim() || byId(ARTEN, params.art)?.label, params });
        regenerateActive(trip, true);
        store.setActiveTrip(trip.id);
        closeSheet();
        setTab('liste');
        toast(`${progress(trip).total} Einträge erzeugt`);
      });
    }
  );
}

// ===========================================================================
// Liste
// ===========================================================================

/** Gilt ein Eintrag als erledigt? Bei Behältern zählt der Stand der Teile. */
function istErledigt(trip, it) {
  return it.isContainer ? containerStand(trip, it).packed : it.packed;
}

/*
 * Sichtbarkeit und Gruppierung liegen in src/liste.js – dort ohne DOM prüfbar.
 * Hier nur die Anbindung an den Filterzustand und die Bereiche dieser Sitzung.
 */
const visibleItems = (trip) => listeVisibleItems(trip, filter, istErledigt);
const sichtbareTeile = (trip, container) => listeSichtbareTeile(trip, container, filter);
const groupItems = (trip, items) => listeGroupItems(trip, items, filter, BEREICHE);

function renderListe(trip) {
  const items = visibleItems(trip);
  const groups = groupItems(trip, items);
  const mit = resolveParams(trip).mit;

  const whoChips = [
    { id: 'alle', label: 'Alle' },
    ...mit.map((id) => ({ id, label: personName(id) })),
    { id: SHARED, label: 'Gemeinsam' },
  ];

  view.innerHTML = `
    ${
      store.tripMasterVeraltet(trip)
        ? `<div class="banner"><span>Die Stammliste hat sich geändert.</span>
             <button class="link" id="uebernehmen">Übernehmen</button></div>`
        : ''
    }
    <div class="filters">
      ${whoChips
        .map(
          (w) =>
            `<button class="chip ${filter.who === w.id ? 'is-active' : ''}" data-who="${w.id}">${esc(w.label)}</button>`
        )
        .join('')}
    </div>
    <div class="filters">
      <button class="chip ${filter.mode === 'offen' ? 'is-active' : ''}" id="fMode">Nur offen</button>
      <button class="chip" id="fGroup">${filter.group === 'person' ? 'Nach Person' : 'Nach Bereich'}</button>
    </div>
    ${
      groups
        .map(
          (g) => `<section class="card">
        <div class="card-head">${iconTile(g.ico)} ${esc(g.label)}
          <span class="count">${g.items.filter((x) => !istErledigt(trip, x)).length} offen</span>
        </div>
        ${g.abschnitte
          .map((a) => {
            const schluessel = `${a.category}|${a.assignee}`;
            return `${a.label ? `<div class="unter-kopf">${esc(a.label)}</div>` : ''}
               ${a.items.map((it) => zeileMitTeilen(trip, it, false)).join('')}
               ${
                 addFeld === schluessel
                   ? `<div class="add-zeile is-offen">
                        <input type="text" class="add-eingabe" data-add-feld="${esc(schluessel)}"
                          placeholder="Was noch? Enter zum Hinzufügen" />
                      </div>`
                   : `<button class="add-zeile" data-add="${esc(schluessel)}" type="button">
                        ${icon('plus', 15)} hinzufügen
                      </button>`
               }`;
          })
          .join('')}
      </section>`
        )
        .join('') ||
      `<div class="empty"><span class="big">${icon('check', 26)}</span>${
        filter.mode === 'offen' ? 'Alles gepackt.' : 'Keine Einträge für diesen Filter.'
      }</div>`
    }
    <button class="btn" id="addItem">${icon('plus', 20)} Eintrag hinzufügen</button>
    <button class="btn" id="exportBtn">${icon('doc', 20)} Als Text</button>
  `;

  view.querySelector('#uebernehmen')?.addEventListener('click', () => {
    store.refreshTripMaster(trip.id);
    regenerateActive(store.state.data.trips[trip.id]);
  });
  view.querySelectorAll('[data-who]').forEach((b) =>
    b.addEventListener('click', () => {
      filter.who = b.dataset.who;
      render();
    })
  );
  view.querySelector('#fMode').addEventListener('click', () => {
    filter.mode = filter.mode === 'offen' ? 'alle' : 'offen';
    render();
  });
  view.querySelector('#fGroup').addEventListener('click', () => {
    filter.group = filter.group === 'person' ? 'kategorie' : 'person';
    render();
  });

  // Abhaken nur über das Kästchen – sonst verhakt man sich beim Scrollen
  // ständig aus Versehen etwas. Der Rest der Zeile reagiert nicht.
  view.querySelectorAll('.item .box-btn').forEach((btn) =>
    btn.addEventListener('click', () => {
      const id = btn.closest('.item').dataset.id;
      const it = trip.items[id];
      if (it.isContainer) {
        // Behälter-Kästchen hakt alle Teile auf einmal ab oder wieder auf.
        const ziel = !containerStand(trip, it).packed;
        for (const k of kinderVon(trip, id)) {
          if (k.packed !== ziel) store.patchItem(trip.id, k.id, { packed: ziel });
        }
        return;
      }
      store.patchItem(trip.id, id, { packed: !it.packed });
    })
  );
  view.querySelectorAll('.behaelter-toggle').forEach((btn) =>
    btn.addEventListener('click', () => {
      const id = btn.closest('.item').dataset.id;
      zugeklappt.has(id) ? zugeklappt.delete(id) : zugeklappt.add(id);
      render();
    })
  );
  view.querySelectorAll('.item .item-more').forEach((btn) =>
    btn.addEventListener('click', () => openItemSheet(trip, btn.closest('.item').dataset.id))
  );

  // Wischen löscht den Eintrag – nur für diese Reise, und widerrufbar.
  view.querySelectorAll('.item').forEach((row) =>
    wischbar(row, () => {
      const id = row.dataset.id;
      const it = trip.items[id];
      if (!it) return;
      // Bei einem Behälter gehen die Teile mit.
      const ids = it.isContainer ? [id, ...kinderVon(trip, id).map((k) => k.id)] : [id];
      for (const x of ids) store.removeItem(trip.id, x);
      toast(`„${it.label}" entfernt`, {
        text: 'Widerrufen',
        fn: () => store.undoRemoveItem(trip.id, ids),
      });
    })
  );

  // Schnell etwas ergänzen, direkt im richtigen Abschnitt.
  view.querySelectorAll('[data-add]').forEach((btn) =>
    btn.addEventListener('click', () => {
      addFeld = btn.dataset.add;
      render();
    })
  );
  const feld = view.querySelector('[data-add-feld]');
  if (feld) {
    feld.focus();
    const [category, assignee] = feld.dataset.addFeld.split('|');
    const schliessen = () => {
      addFeld = null;
      render();
    };
    feld.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') return schliessen();
      if (e.key !== 'Enter') return;
      const label = feld.value.trim();
      if (!label) return schliessen();
      store.addManualItem(trip.id, { label, category, assignee });
      // Feld bleibt offen, damit mehrere Sachen hintereinander gehen.
      toast(`„${label}" hinzugefügt`, {
        text: 'In die Stammliste',
        fn: () => openStammSheet(null, { label, category, wer: assignee === SHARED ? [] : [assignee] }),
      });
    });
    feld.addEventListener('blur', () => {
      if (!feld.value.trim()) schliessen();
    });
  }

  $('#addItem').addEventListener('click', () => openAddItemSheet(trip));
  $('#exportBtn').addEventListener('click', () => openExportSheet(trip));
}

/** Ein Behälter samt seiner Teile, oder eine gewöhnliche Zeile. */
function zeileMitTeilen(trip, it, withWho) {
  if (!it.isContainer) return itemRow(trip, it, withWho);

  const stand = containerStand(trip, it);
  const offen = !zugeklappt.has(it.id);
  const teile = offen ? sichtbareTeile(trip, it) : [];
  const showWho = withWho && (it.assignee !== SHARED || resolveParams(trip).mit.length > 1);

  return `<div class="item item-behaelter ${stand.packed ? 'is-packed' : ''}" data-id="${esc(it.id)}">
      <button class="box-btn" type="button" role="checkbox" aria-checked="${stand.packed}"
        aria-label="${esc(it.label)} komplett abhaken"><span class="box">✓</span></button>
      <button class="behaelter-toggle" type="button" aria-expanded="${offen}"
        aria-label="${esc(it.label)} ${offen ? 'zuklappen' : 'aufklappen'}">
        <span class="item-main">
          <span class="item-label-zeile">
            <span class="item-label">${esc(it.label)}</span>
            <span class="behaelter-chev ${offen ? 'is-open' : ''}">${icon('chevron', 16)}</span>
          </span>
          <span class="item-meta">
            <span class="qty">${stand.done}/${stand.total}</span>
            ${showWho ? `<span class="who">${esc(personName(it.assignee))}</span>` : ''}
            ${it.note ? `<span class="item-note">${esc(it.note)}</span>` : ''}
          </span>
        </span>
      </button>
      <button class="item-more" type="button" aria-label="${esc(it.label)} bearbeiten">${icon('edit', 18)}</button>
    </div>
    ${teile.map((k) => itemRow(trip, k, false, true)).join('')}`;
}

function itemRow(trip, it, withWho = true, istTeil = false) {
  const showWho = withWho && (it.assignee !== SHARED || resolveParams(trip).mit.length > 1);
  const meta = [
    it.qty > 1 ? `<span class="qty">${it.qty}×</span>` : '',
    showWho ? `<span class="who">${esc(personName(it.assignee))}</span>` : '',
    it.note ? `<span class="item-note">${esc(it.note)}</span>` : '',
  ]
    .filter(Boolean)
    .join('');
  return `<div class="item ${istTeil ? 'item-teil' : ''} ${it.packed ? 'is-packed' : ''}" data-id="${esc(it.id)}">
    <button class="box-btn" type="button" role="checkbox" aria-checked="${it.packed}"
      aria-label="${esc(it.label)} abhaken"><span class="box">✓</span></button>
    <div class="item-main">
      <span class="item-label">${esc(it.label)}</span>
      ${meta ? `<span class="item-meta">${meta}</span>` : ''}
    </div>
    ${
      istTeil
        ? ''
        : `<button class="item-more" type="button" aria-label="Bearbeiten">${icon('edit', 18)}</button>`
    }
  </div>`;
}

function openItemSheet(trip, itemId) {
  const it = trip.items[itemId];
  if (!it) return;
  if (it.isContainer) return openBehaelterSheet(trip, it);
  const catOptions = BEREICHE()
    .map((c) => `<option value="${c.id}" ${c.id === it.category ? 'selected' : ''}>${esc(c.label)}</option>`)
    .join('');
  const personen = [{ id: SHARED, label: 'Gemeinsam' }, ...trippersonen(trip)];
  let gewaehltWho = it.assignee;

  openSheet(
    {
      body: `<h3>${esc(it.label)}</h3>
        <p class="hint">${it.source === 'auto' ? 'Kommt aus der Stammliste' : 'Eigener Eintrag'}</p>
        <label class="field"><span>Bezeichnung</span><input type="text" id="iLabel" value="${esc(it.label)}" /></label>
        <div class="field"><span>Für wen</span>
          <div class="options" id="iWho">${chipsSingle(personen, it.assignee, 'who')}</div>
        </div>
        <label class="field"><span>Menge</span><input type="number" id="iQty" min="1" max="199" value="${it.qty}" /></label>
        <label class="field"><span>Bereich</span><select id="iCat">${catOptions}</select></label>
        <label class="field"><span>Notiz</span><input type="text" id="iNote" value="${esc(it.note ?? '')}" /></label>
        <div style="height:14px"></div>
        ${
          it.source === 'auto'
            ? `<button class="btn" id="iStamm">${icon('list', 20)} In der Stammliste bearbeiten</button>`
            : `<button class="btn" id="iStammNeu">${icon('list', 20)} In die Stammliste aufnehmen</button>`
        }
        <button class="btn danger" id="iDel">${icon('trash', 20)} Nur bei dieser Reise entfernen</button>`,
      foot: `<button class="btn primary" id="iSave">Speichern</button>`,
    },
    (root) => {
      bindSingle(root, '#iWho', 'who', (v) => (gewaehltWho = v));
      root.querySelector('#iSave').addEventListener('click', () => {
        const qty = Math.max(1, Number(root.querySelector('#iQty').value) || 1);
        const label = root.querySelector('#iLabel').value.trim() || it.label;
        const who = gewaehltWho;
        const note = root.querySelector('#iNote').value.trim();
        store.patchItem(trip.id, itemId, {
          label,
          labelOverride: label !== it.label || it.labelOverride ? true : undefined,
          qty,
          qtyOverride: qty !== it.qty || it.qtyOverride ? true : undefined,
          assignee: who,
          assigneeOverride: who !== it.assignee || it.assigneeOverride ? true : undefined,
          category: root.querySelector('#iCat').value,
          note,
          noteOverride: note !== (it.note ?? '') || it.noteOverride ? true : undefined,
        });
        closeSheet();
      });
      root.querySelector('#iStamm')?.addEventListener('click', () => {
        closeSheet();
        setTab('stamm');
        openStammSheet(it.masterId);
      });
      root.querySelector('#iStammNeu')?.addEventListener('click', () => {
        closeSheet();
        setTab('stamm');
        openStammSheet(null, {
          label: it.label,
          category: it.category,
          qty: it.qty,
          wer: it.assignee === SHARED ? [] : [it.assignee],
        });
      });
      root.querySelector('#iDel').addEventListener('click', () => {
        store.removeItem(trip.id, itemId);
        closeSheet();
        toast('Entfernt – kommt beim Neuberechnen nicht zurück');
      });
    }
  );
}

/**
 * Behälter bearbeiten. Menge und Stückzahl ergeben hier keinen Sinn – dafür
 * steht der Inhalt da, mit dem Weg in die Stammliste, wo er gepflegt wird.
 */
function openBehaelterSheet(trip, it) {
  const kinder = kinderVon(trip, it.id).sort((a, b) => beschriftung(a).localeCompare(beschriftung(b), 'de'));
  const stand = containerStand(trip, it);
  openSheet(
    {
      body: `<h3>${esc(it.label)}</h3>
        <p class="hint">Behälter mit ${stand.total} Teilen · ${stand.done} abgehakt</p>
        <div style="height:6px"></div>
        <section class="card">
          ${kinder
            .map(
              (k) => `<div class="item item-teil ${k.packed ? 'is-packed' : ''}" data-id="${esc(k.id)}">
                <button class="box-btn" type="button" role="checkbox" aria-checked="${k.packed}"
                  aria-label="${esc(k.label)} abhaken"><span class="box">✓</span></button>
                <div class="item-main"><span class="item-label">${esc(k.label)}</span></div>
              </div>`
            )
            .join('')}
        </section>
        <div style="height:14px"></div>
        ${
          it.source === 'auto'
            ? `<button class="btn" id="bStamm">${icon('list', 20)} Inhalt in der Stammliste ändern</button>`
            : ''
        }
        <button class="btn" id="bAlle">${icon('check', 20)} ${stand.packed ? 'Alle Haken entfernen' : 'Alle abhaken'}</button>
        <button class="btn danger" id="bDel">${icon('trash', 20)} Nur bei dieser Reise entfernen</button>`,
      foot: `<button class="btn primary" id="bClose">Fertig</button>`,
    },
    (root) => {
      root.querySelectorAll('.box-btn').forEach((btn) =>
        btn.addEventListener('click', () => {
          const id = btn.closest('.item').dataset.id;
          store.patchItem(trip.id, id, { packed: !trip.items[id].packed });
          openBehaelterSheet(store.state.data.trips[trip.id], store.state.data.trips[trip.id].items[it.id]);
        })
      );
      root.querySelector('#bAlle').addEventListener('click', () => {
        const ziel = !stand.packed;
        for (const k of kinder) if (k.packed !== ziel) store.patchItem(trip.id, k.id, { packed: ziel });
        closeSheet();
      });
      root.querySelector('#bStamm')?.addEventListener('click', () => {
        closeSheet();
        setTab('stamm');
        openStammSheet(it.masterId);
      });
      root.querySelector('#bDel').addEventListener('click', () => {
        for (const k of kinder) store.removeItem(trip.id, k.id);
        store.removeItem(trip.id, it.id);
        closeSheet();
        toast('Entfernt – kommt beim Neuberechnen nicht zurück');
      });
      root.querySelector('#bClose').addEventListener('click', closeSheet);
    }
  );
}

function openAddItemSheet(trip) {
  const catOptions = BEREICHE().map((c) => `<option value="${c.id}">${esc(c.label)}</option>`).join('');
  const personen = [{ id: SHARED, label: 'Gemeinsam' }, ...trippersonen(trip)];
  let gewaehltWho = SHARED;
  openSheet(
    {
      body: `<h3>Eintrag hinzufügen</h3>
        <label class="field"><span>Was?</span><input type="text" id="aLabel" placeholder="z.B. Wanderkarte Engadin" /></label>
        <div class="field"><span>Für wen</span>
          <div class="options" id="aWho">${chipsSingle(personen, SHARED, 'who')}</div>
        </div>
        <label class="field"><span>Menge</span><input type="number" id="aQty" min="1" max="199" value="1" /></label>
        <label class="field"><span>Bereich</span><select id="aCat">${catOptions}</select></label>
        <label class="toggle"><input type="checkbox" id="aStamm" />
          <span>Auch in die Stammliste<br /><span class="hint">Dann ist es bei der nächsten Reise wieder dabei.</span></span>
        </label>`,
      foot: `<button class="btn primary" id="aSave">Hinzufügen</button>`,
    },
    (root) => {
      bindSingle(root, '#aWho', 'who', (v) => (gewaehltWho = v));
      const input = root.querySelector('#aLabel');
      input.focus();
      const save = () => {
        const label = input.value.trim();
        if (!label) return;
        const category = root.querySelector('#aCat').value;
        const assignee = gewaehltWho;
        const qty = Math.max(1, Number(root.querySelector('#aQty').value) || 1);
        store.addManualItem(trip.id, { label, category, qty, assignee });
        if (root.querySelector('#aStamm').checked) {
          store.addMasterItem({ label, category, qty, who: assignee });
          toast('Hinzugefügt und in der Stammliste gespeichert');
        } else {
          toast('Hinzugefügt');
        }
        closeSheet();
      };
      root.querySelector('#aSave').addEventListener('click', save);
      input.addEventListener('keydown', (e) => e.key === 'Enter' && save());
    }
  );
}

function exportText(trip) {
  const items = Object.values(trip.items).filter((it) => !it.deleted && !it.parentId);
  const lines = [`${trip.name} · ${tripSummary(trip)}`, ''];
  const zeile = (it, tief = false) =>
    `${tief ? '    ' : ''}[${it.packed ? 'x' : ' '}] ${it.qty > 1 ? it.qty + ' ' : ''}${it.label}`;
  for (const g of groupItems(trip, items)) {
    lines.push(g.label.toUpperCase());
    for (const a of g.abschnitte) {
      if (a.label) lines.push(`— ${a.label}`);
      for (const it of a.items) {
        if (it.isContainer) {
          const stand = containerStand(trip, it);
          lines.push(`[${stand.packed ? 'x' : ' '}] ${it.label} (${stand.done}/${stand.total})`);
          for (const k of kinderVon(trip, it.id).sort(nachName)) lines.push(zeile(k, true));
        } else {
          lines.push(zeile(it));
        }
      }
    }
    lines.push('');
  }
  return lines.join('\n');
}

function openExportSheet(trip) {
  const text = exportText(trip);
  openSheet(
    {
      body: `<h3>Liste als Text</h3>
        <p class="hint">Antippen markiert alles, dann kopieren.</p>
        <label class="field"><textarea id="exp" rows="14" readonly>${esc(text)}</textarea></label>`,
      foot: `<button class="btn primary" id="expCopy">In die Ablage kopieren</button>`,
    },
    (root) => {
      const ta = root.querySelector('#exp');
      ta.addEventListener('focus', () => ta.select());
      root.querySelector('#expCopy').addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(text);
          toast('Kopiert');
        } catch {
          ta.select();
          toast('Text ist markiert – jetzt kopieren');
        }
      });
    }
  );
}

// ===========================================================================
// Angaben zur Reise
// ===========================================================================

function renderReise(trip) {
  const p = resolveParams(trip);
  const zeigtRegion = ARTEN_MIT_REGION.includes(p.art);

  view.innerHTML = `
    <section class="card"><div class="card-body">
      <label class="field"><span>Name der Reise</span><input type="text" id="rName" value="${esc(trip.name)}" /></label>
      <div class="field"><span>Anzahl Nächte</span>
        <div class="stepper">
          <button class="step" data-n="-1" type="button" aria-label="weniger">${icon('minus', 20)}</button>
          <span class="step-val" id="rN">${p.naechte}</span>
          <button class="step" data-n="1" type="button" aria-label="mehr">${icon('plus', 20)}</button>
        </div>
      </div>
    </div></section>

    <h2 class="section">Art der Reise</h2>
    <div class="filters" id="rArt">${chipsSingle(ARTEN, p.art, 'art')}</div>

    <h2 class="section">Jahreszeit</h2>
    <div class="filters" id="rJz">${chipsSingle(JAHRESZEITEN, p.jahreszeit, 'jz')}</div>

    ${
      zeigtRegion
        ? `<h2 class="section">Region</h2>
           <div class="filters" id="rReg">${chipsSingle(REGIONEN, p.region, 'reg')}</div>`
        : ''
    }

    <h2 class="section">Aktivitäten</h2>
    <div class="card"><div class="card-body"><div class="field" style="margin-top:12px">
      <div class="options" id="rAkt">${chipsMulti(AKTIVITAETEN(), p.aktivitaeten, 'akt')}</div>
    </div></div></div>

    <h2 class="section">Wer kommt mit</h2>
    <div class="card"><div class="card-body"><div class="field" style="margin-top:12px">
      <div class="options" id="rMit">${chipsMulti(
        PERSONEN.map((x) => ({ id: x.id, label: x.name })),
        p.mit,
        'mit'
      )}</div>
    </div></div></div>

    <section class="card"><div class="card-body">
      ${
        ART_MIT_WASCHMASCHINE.includes(p.art)
          ? `<p class="hint" style="padding:12px 0">In Lenz ist eine Waschmaschine vorhanden. Wäscheständer und
               Chlüppli bleiben daheim, und ab etwa einer Woche werden die Kleidermengen begrenzt.</p>`
          : `<label class="toggle"><input type="checkbox" id="rWasch" ${p.waschmaschine ? 'checked' : ''} />
               <span>Waschmaschine vorhanden<br /><span class="hint">Begrenzt die Kleidermengen bei längeren Reisen.</span></span></label>`
      }
    </div></section>

    <button class="btn primary" id="rRegen">${icon('refresh', 20)} Liste neu berechnen</button>
    <div class="btn-row">
      <button class="btn" id="rReset">Häkchen löschen</button>
      <button class="btn" id="rRestore">Gelöschte zurück</button>
    </div>
  `;

  const on = (sel, ev, fn) => view.querySelector(sel)?.addEventListener(ev, fn);

  on('#rName', 'change', (e) => store.setTripMeta(trip.id, { name: e.target.value.trim() || trip.name }));
  view.querySelectorAll('.stepper .step').forEach((el) =>
    el.addEventListener('click', () =>
      applyParams(trip, { naechte: Math.max(1, Math.min(60, p.naechte + Number(el.dataset.n))) })
    )
  );
  const pick = (sel, attr, key) =>
    view.querySelectorAll(`${sel} [data-${attr}]`).forEach((b) =>
      b.addEventListener('click', () => applyParams(trip, { [key]: b.dataset[attr] }))
    );
  pick('#rArt', 'art', 'art');
  pick('#rJz', 'jz', 'jahreszeit');
  pick('#rReg', 'reg', 'region');

  view.querySelectorAll('#rAkt [data-akt]').forEach((b) =>
    b.addEventListener('click', () => {
      const s = new Set(p.aktivitaeten);
      s.has(b.dataset.akt) ? s.delete(b.dataset.akt) : s.add(b.dataset.akt);
      applyParams(trip, { aktivitaeten: [...s] });
    })
  );
  view.querySelectorAll('#rMit [data-mit]').forEach((b) =>
    b.addEventListener('click', () => {
      const s = new Set(p.mit);
      s.has(b.dataset.mit) ? s.delete(b.dataset.mit) : s.add(b.dataset.mit);
      if (!s.size) return toast('Mindestens eine Person muss mitkommen');
      if (filter.who !== 'alle' && !s.has(filter.who)) filter.who = 'alle';
      applyParams(trip, { mit: [...s] });
    })
  );
  on('#rWasch', 'change', (e) => applyParams(trip, { waschmaschine: e.target.checked }));

  on('#rRegen', 'click', () => regenerateActive(trip));
  on('#rReset', 'click', () => {
    for (const it of Object.values(trip.items)) {
      if (it.packed) store.patchItem(trip.id, it.id, { packed: false });
    }
    toast('Alles wieder auf offen');
  });
  on('#rRestore', 'click', () => {
    store.restoreDismissed(trip.id);
    const { added } = regenerateActive(store.state.data.trips[trip.id], true);
    toast(`${added} Einträge zurückgeholt`);
  });
}

// ===========================================================================
// Stammliste
// ===========================================================================

/** Bedingungen eines Teils in einem Satz. */
function bedingungText(t) {
  const teile = [];
  if (t.arten?.length) teile.push(t.arten.map((a) => labelOf(ARTEN, a)).join(' / '));
  if (t.aktivitaeten?.length) teile.push(t.aktivitaeten.map((a) => labelOf(AKTIVITAETEN(), a)).join(' / '));
  if (t.jahreszeiten?.length) teile.push(t.jahreszeiten.map((a) => labelOf(JAHRESZEITEN, a)).join(' / '));
  if (t.wennDabei?.length) teile.push('wenn ' + t.wennDabei.map(personName).join(' oder ') + ' mit');
  if (t.minNaechte) teile.push(`ab ${t.minNaechte} Nächten`);
  return teile.length ? teile.join(' · ') : 'immer dabei';
}

const bedVon = (t) => ({
  arten: t.arten ?? [],
  aktivitaeten: t.aktivitaeten ?? [],
  jahreszeiten: t.jahreszeiten ?? [],
  wennDabei: t.wennDabei ?? [],
  minNaechte: t.minNaechte ?? 0,
});

/** Der aufklappbare Block mit den Bedingungen eines Teils. */
function teilBedingungen(b) {
  return `<div class="teil-bed-block">
    <div class="teil-bed-feld"><span>Nur bei diesen Reisearten</span>
      <div class="options" data-bedgruppe="arten">${chipsMulti(ARTEN, b.arten, 'w')}</div></div>
    <div class="teil-bed-feld"><span>Nur bei diesen Aktivitäten</span>
      <div class="options" data-bedgruppe="aktivitaeten">${chipsMulti(AKTIVITAETEN(), b.aktivitaeten, 'w')}</div></div>
    <div class="teil-bed-feld"><span>Nur in diesen Jahreszeiten</span>
      <div class="options" data-bedgruppe="jahreszeiten">${chipsMulti(JAHRESZEITEN, b.jahreszeiten, 'w')}</div></div>
    <div class="teil-bed-feld"><span>Nur wenn mit dabei</span>
      <div class="options" data-bedgruppe="wennDabei">${chipsMulti(
        PERSONEN.map((p) => ({ id: p.id, label: p.name })),
        b.wennDabei,
        'w'
      )}</div></div>
    <label class="teil-bed-feld"><span>Erst ab Anzahl Nächten</span>
      <input class="teil-min" type="number" min="0" max="60" value="${b.minNaechte ?? 0}" /></label>
  </div>`;
}

/**
 * Eine Zeile im Inhalt eines Behälters: Text, Menge, fix oder pro Nacht.
 * Zuschlag und Maximum erscheinen erst bei „pro Nacht", die Bedingungen erst
 * beim Aufklappen – sonst wäre die Zeile auf dem Handy überladen.
 */
function teilZeile(t, offen = false) {
  const pn = Boolean(t.pronacht);
  const b = bedVon(t);
  const eingeschraenkt =
    b.arten.length || b.aktivitaeten.length || b.jahreszeiten.length || b.wennDabei.length || b.minNaechte;
  return `<div class="teil-block" data-bed="${encodeURIComponent(JSON.stringify(b))}" data-offen="${offen ? 1 : 0}">
    <div class="teil-zeile">
      <input class="teil-label" type="text" value="${esc(t.label)}" placeholder="z.B. Pantoprazol" />
      <input class="teil-qty" type="number" min="0.1" step="0.1" value="${t.qty ?? 1}" aria-label="Menge" />
      <button class="chip teil-pn ${pn ? 'is-active' : ''}" type="button"
        title="Menge aus den Nächten rechnen">/Nacht</button>
      <button class="teil-del" type="button" aria-label="Teil entfernen">${icon('close', 18)}</button>
    </div>
    ${
      pn
        ? `<div class="teil-zeile teil-fein">
             <label class="teil-fein-feld"><span>Zuschlag</span>
               <input class="teil-plus" type="number" min="0" max="20" value="${t.plus ?? 0}" /></label>
             <label class="teil-fein-feld"><span>Maximum</span>
               <input class="teil-cap" type="number" min="1" max="99" value="${t.cap ?? ''}" placeholder="ohne" /></label>
           </div>`
        : ''
    }
    <button class="teil-bed-knopf ${eingeschraenkt ? 'is-gesetzt' : ''}" type="button">
      <span class="teil-bed-text">${esc(bedingungText(b))}</span>
      <span class="teil-bed-chev ${offen ? 'is-open' : ''}">${icon('chevron', 14)}</span>
    </button>
    ${offen ? teilBedingungen(b) : ''}
  </div>`;
}

/** Was bedeutet die aktuelle Personenauswahl? */
function werHinweis(wer) {
  if (!wer?.length) return 'Niemand ausgewählt: ein gemeinsamer Eintrag für alle.';
  const namen = wer.map(personName).join(', ');
  return wer.length === 1
    ? `Ein Eintrag für ${namen}.`
    : `Ein eigener Eintrag pro Person: ${namen}.`;
}

function stammMeta(m) {
  const teile = [];
  const wer = werVon(m);
  if (wer.length) teile.push(wer.map(personName).join(' & '));
  const inhalt = teileVon(m);
  if (inhalt.length) {
    teile.push(`${inhalt.length} Teile`);
  } else if (m.qtyMode === 'pronacht') {
    teile.push(`${m.qty}/Nacht${m.plus ? ` +${m.plus}` : ''}${m.cap ? `, max ${m.cap}` : ''}`);
  } else if (m.qty > 1) {
    teile.push(`${m.qty}×`);
  }
  if (m.arten?.length) teile.push(m.arten.map((a) => labelOf(ARTEN, a)).join(' / '));
  if (m.aktivitaeten?.length) teile.push(m.aktivitaeten.map((a) => labelOf(AKTIVITAETEN(), a)).join(' / '));
  if (m.jahreszeiten?.length) teile.push(m.jahreszeiten.map((a) => labelOf(JAHRESZEITEN, a)).join(' / '));
  if (m.regionen?.length) teile.push(m.regionen.map((a) => labelOf(REGIONEN, a)).join(' / '));
  if (m.wennDabei?.length) teile.push('wenn ' + m.wennDabei.map(personName).join(' oder ') + ' mit');
  if (m.minNaechte) teile.push(`ab ${m.minNaechte} Nächten`);
  return teile.join(' · ');
}

function renderStammliste() {
  const alle = Object.values(store.state.data.master).filter((m) => !m.deleted);
  const suche = stammFilter.suche.trim().toLowerCase();
  const gefiltert = alle
    .filter((m) => stammFilter.bereich === 'alle' || m.category === stammFilter.bereich)
    .filter((m) => !suche || m.label.toLowerCase().includes(suche));
  const belegteBereiche = BEREICHE().filter((c) => alle.some((m) => m.category === c.id));

  const karten = BEREICHE().map((cat) => {
    const list = gefiltert
      .filter((m) => m.category === cat.id)
      .sort((a, b) => beschriftung(a).localeCompare(beschriftung(b), 'de'));
    if (!list.length) return '';
    return `<section class="card">
      <div class="card-head">${iconTile(cat.ico)} ${esc(cat.label)}
        <span class="count">${list.length}</span></div>
      ${list
        .map(
          (m) => `<button class="item stamm-row" data-stamm="${esc(m.id)}">
            <span class="item-main">
              <span class="item-label">${esc(m.label)}</span>
              ${stammMeta(m) ? `<span class="item-meta"><span class="item-note">${esc(stammMeta(m))}</span></span>` : ''}
            </span>
            <span class="item-more">${icon('chevron', 18)}</span>
          </button>`
        )
        .join('')}
    </section>`;
  }).join('');

  view.innerHTML = `
    <p class="hint">Änderungen hier wirken auf neue Reisen. Laufende bleiben unberührt,
      bis du sie in der Reise übernimmst.</p>
    <section class="card">
      <button class="list-row" id="stBereiche" style="padding:15px 16px">
        ${iconTile('basket')}
        <span class="grow"><span>Bereiche verwalten</span><br />
          <span class="sub">${BEREICHE().length} Bereiche</span></span>
        ${icon('chevron', 18)}
      </button>
      <button class="list-row" id="stAktivitaeten" style="padding:15px 16px">
        ${iconTile('bike')}
        <span class="grow"><span>Aktivitäten verwalten</span><br />
          <span class="sub">${AKTIVITAETEN().length} Aktivitäten</span></span>
        ${icon('chevron', 18)}
      </button>
      <button class="list-row" id="stTabelle" style="padding:15px 16px">
        ${iconTile('doc')}
        <span class="grow"><span>Als Tabelle bearbeiten</span><br />
          <span class="sub">In Excel umbauen und zurückspielen</span></span>
        ${icon('chevron', 18)}
      </button>
    </section>
    <div class="search-wrap">${icon('search', 20)}
      <input type="text" id="stSuche" value="${esc(stammFilter.suche)}" placeholder="Eintrag suchen" />
    </div>
    <div class="filters">
      <button class="chip ${stammFilter.bereich === 'alle' ? 'is-active' : ''}" data-bereich="alle">Alle</button>
      ${belegteBereiche
        .map(
          (c) =>
            `<button class="chip ${stammFilter.bereich === c.id ? 'is-active' : ''}" data-bereich="${c.id}">${esc(c.label)}</button>`
        )
        .join('')}
    </div>
    <p class="hint">${gefiltert.length} von ${alle.length} Einträgen</p>
    ${karten || `<div class="empty"><span class="big">${icon('search', 26)}</span>Keine Einträge gefunden.</div>`}
    <button class="btn primary" id="stNeu">${icon('plus', 20)} Eintrag hinzufügen</button>
    <button class="btn danger" id="stReset">Stammliste zurücksetzen</button>
  `;

  view.querySelector('#stBereiche').addEventListener('click', openBereicheSheet);
  view.querySelector('#stAktivitaeten').addEventListener('click', openAktivitaetenSheet);
  view.querySelector('#stTabelle').addEventListener('click', openTabelleSheet);

  const suchfeld = view.querySelector('#stSuche');
  suchfeld.addEventListener('input', () => {
    stammFilter.suche = suchfeld.value;
    render();
    const neu = view.querySelector('#stSuche');
    neu.focus();
    neu.setSelectionRange(neu.value.length, neu.value.length);
  });
  view.querySelectorAll('[data-bereich]').forEach((b) =>
    b.addEventListener('click', () => {
      stammFilter.bereich = b.dataset.bereich;
      render();
    })
  );
  view.querySelectorAll('[data-stamm]').forEach((b) => {
    b.addEventListener('click', () => openStammSheet(b.dataset.stamm));
    // Wischen löscht aus der Stammliste – ebenfalls widerrufbar.
    wischbar(b, () => {
      const id = b.dataset.stamm;
      const m = store.state.data.master[id];
      if (!m) return;
      store.removeMasterItem(id);
      toast(`„${m.label}" aus der Stammliste entfernt`, {
        text: 'Widerrufen',
        fn: () => store.undoRemoveMasterItem(id),
      });
    });
  });
  view.querySelector('#stNeu').addEventListener('click', () => openStammSheet(null));
  view.querySelector('#stReset').addEventListener('click', () =>
    confirmSheet(
      {
        titel: 'Stammliste zurücksetzen?',
        text: 'Alle eigenen Änderungen an der Vorlage gehen verloren. Bestehende Reisen bleiben, wie sie sind.',
        knopf: 'Ja, zurücksetzen',
      },
      () => {
        // Widerrufen wie beim Tabellen-Import – der Nachbarweg konnte es längst.
        const vorher = store.stammlisteSichern();
        store.resetMaster();
        closeSheet();
        toast(
          'Stammliste zurückgesetzt',
          { text: 'Widerrufen', fn: () => store.stelleStammlisteWiederHer(vorher) },
          12000
        );
      }
    )
  );
}

// ---------------------------------------------------------------------------
// Stammliste als Tabelle
// ---------------------------------------------------------------------------

/** Was gerade in der App steht, im Format von `alsTabelle`. */
const tabellenStand = () => ({
  master: store.state.data.master,
  bereiche: BEREICHE(),
  aktivitaeten: AKTIVITAETEN(),
});

/**
 * Die Stammliste als Tabelle heraus- und wieder hineingeben.
 *
 * Zwei Wege hinein, weil beide ihre Momente haben: Aus Excel kopieren und hier
 * einfügen ist am Handy und am Rechner gleich schnell und verliert nie ein
 * Sonderzeichen. Eine Datei zu wählen ist bequemer, wenn das Blatt schon
 * gespeichert ist.
 */
function openTabelleSheet() {
  const anzahl = Object.values(store.state.data.master).filter((m) => !m.deleted).length;

  openSheet(
    {
      body: `<h3>Als Tabelle bearbeiten</h3>
        <p class="hint">Die ganze Stammliste als Tabelle – zum Umbauen in Excel oder Numbers.
          Bereiche und Aktivitäten entstehen dabei aus dem Blatt selbst: Was du in die Spalte
          schreibst und noch nicht gibt, wird angelegt.</p>

        <h4 class="section" style="margin-top:18px">Heraus</h4>
        <section class="card">
          <button class="list-row" id="tbKopieren" style="padding:15px 16px">
            ${iconTile('doc')}
            <span class="grow"><span>Kopieren</span><br />
              <span class="sub">${anzahl} Einträge – in Excel einfügen</span></span>
          </button>
          <button class="list-row" id="tbDatei" style="padding:15px 16px">
            ${iconTile('basket')}
            <span class="grow"><span>Als Datei sichern</span><br />
              <span class="sub">CSV, öffnet sich in Excel</span></span>
          </button>
        </section>

        <h4 class="section" style="margin-top:18px">Zurück</h4>
        <p class="hint">In Excel alles markieren (auch die Kopfzeile), kopieren, hier einfügen.
          Oder eine gespeicherte Datei wählen.</p>
        <textarea id="tbEingabe" rows="5" placeholder="Tabelle hier einfügen"
          style="width:100%;font-family:ui-monospace,Menlo,monospace;font-size:12px"></textarea>
        <div style="height:10px"></div>
        <button class="btn" id="tbWaehlen">${icon('plus', 20)} Datei wählen</button>
        <input type="file" id="tbFile" accept=".csv,.tsv,.txt,text/csv,text/plain" hidden />
        <div id="tbBefund"></div>`,
      foot: `<button class="btn primary" id="tbPruefen">Prüfen</button>
        <button class="btn" id="tbFertig">Schliessen</button>`,
    },
    (root) => {
      const eingabe = root.querySelector('#tbEingabe');
      const befund = root.querySelector('#tbBefund');

      root.querySelector('#tbKopieren').addEventListener('click', async () => {
        const text = alsTabelle(tabellenStand(), '\t');
        try {
          await navigator.clipboard.writeText(text);
          toast(`${anzahl} Einträge kopiert – in Excel einfügen`);
        } catch {
          // Ohne Zwischenablage-Recht bleibt der Weg über das Feld.
          eingabe.value = text;
          eingabe.select();
          toast('Kopieren ging nicht – Text steht unten, von Hand kopieren');
        }
      });

      root.querySelector('#tbDatei').addEventListener('click', () => {
        // Semikolon und BOM, damit Excel die Datei ohne Nachfragen richtig öffnet.
        const csv = '﻿' + alsTabelle(tabellenStand(), ';');
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = 'stammliste.csv';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      });

      const datei = root.querySelector('#tbFile');
      root.querySelector('#tbWaehlen').addEventListener('click', () => datei.click());
      datei.addEventListener('change', async () => {
        const f = datei.files?.[0];
        if (!f) return;
        eingabe.value = await f.text();
        pruefen();
      });

      function pruefen() {
        const text = eingabe.value.trim();
        if (!text) {
          befund.innerHTML = `<p class="hint">Erst eine Tabelle einfügen oder eine Datei wählen.</p>`;
          return;
        }
        const ergebnis = leseTabelle(text, {
          bereiche: BEREICHE(),
          aktivitaeten: AKTIVITAETEN(),
        });
        zeigeBefund(befund, ergebnis);
      }

      root.querySelector('#tbPruefen').addEventListener('click', pruefen);
      root.querySelector('#tbFertig').addEventListener('click', closeSheet);
    }
  );
}

/** Ergebnis des Einlesens zeigen – Fehler zuerst, Übernehmen erst wenn sauber. */
function zeigeBefund(ziel, ergebnis) {
  const { fehler, hinweise, anzahl } = ergebnis;
  const alt = Object.values(store.state.data.master).filter((m) => !m.deleted).length;
  // Der Befund steht unterhalb des Eingabefeldes – ohne Nachfassen sieht man ihn nicht.
  const hinschauen = () => ziel.scrollIntoView({ behavior: 'smooth', block: 'end' });

  if (fehler.length) {
    ziel.innerHTML = `<div style="height:14px"></div>
      <section class="card befund is-fehler">
        <div class="card-head">${fehler.length} ${fehler.length === 1 ? 'Fehler' : 'Fehler'}</div>
        <ul>${fehler.slice(0, 25).map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
        ${fehler.length > 25 ? `<p class="hint">… und ${fehler.length - 25} weitere.</p>` : ''}
      </section>
      <p class="hint">Nichts wurde übernommen. Korrigier die Zeilen im Blatt und füg es nochmals ein –
        eine halb eingelesene Stammliste wäre schlimmer als gar keine.</p>`;
    hinschauen();
    return;
  }

  ziel.innerHTML = `<div style="height:14px"></div>
    <section class="card befund">
      <div class="card-head">Bereit</div>
      <ul>
        <li><b>${anzahl.eintraege}</b> Einträge (bisher ${alt})</li>
        <li><b>${anzahl.teile}</b> Teile in Behältern</li>
        <li><b>${anzahl.bereiche}</b> Bereiche · <b>${anzahl.aktivitaeten}</b> Aktivitäten</li>
      </ul>
      ${hinweise.length ? `<ul class="sub">${hinweise.slice(0, 12).map((h) => `<li>${esc(h)}</li>`).join('')}</ul>` : ''}
    </section>
    <p class="hint">Die alte Stammliste wird ersetzt. Laufende Reisen bleiben, wie sie sind.</p>
    <div style="height:10px"></div>
    <button class="btn primary" id="tbUebernehmen">Stammliste ersetzen</button>`;

  ziel.querySelector('#tbUebernehmen').addEventListener('click', () => {
    const vorher = store.ersetzeStammliste(ergebnis);
    closeSheet();
    stammFilter.bereich = 'alle';
    render();
    toast(
      `Stammliste ersetzt · ${anzahl.eintraege} Einträge`,
      { text: 'Widerrufen', fn: () => store.stelleStammlisteWiederHer(vorher) },
      12000
    );
  });
  hinschauen();
}

// ---------------------------------------------------------------------------
// Bereiche verwalten
// ---------------------------------------------------------------------------

function openBereicheSheet() {
  const liste = BEREICHE();
  openSheet(
    {
      body: `<h3>Bereiche</h3>
        <p class="hint">Die Gliederung der Liste. Beim Löschen wandern die Einträge in einen
          anderen Bereich – heimatlos wird keiner.</p>
        <div style="height:8px"></div>
        <section class="card">
          ${liste
            .map(
              (b) => `<button class="list-row" data-bereich="${esc(b.id)}" style="padding:14px 16px">
                ${iconTile(b.ico)}
                <span class="grow"><span>${esc(b.label)}</span><br />
                  <span class="sub">${store.bereichBelegung(b.id)} Einträge</span></span>
                ${icon('chevron', 18)}
              </button>`
            )
            .join('')}
        </section>
        <div style="height:14px"></div>
        <button class="btn" id="bNeu">${icon('plus', 20)} Bereich hinzufügen</button>`,
      foot: `<button class="btn primary" id="bFertig">Fertig</button>`,
    },
    (root) => {
      root.querySelectorAll('[data-bereich]').forEach((el) =>
        el.addEventListener('click', () => openBereichSheet(el.dataset.bereich))
      );
      root.querySelector('#bNeu').addEventListener('click', () => openBereichSheet(null));
      root.querySelector('#bFertig').addEventListener('click', closeSheet);
    }
  );
}

/** Einen Bereich anlegen oder ändern. */
function openBereichSheet(id) {
  const vorhanden = id ? store.state.data.bereiche[id] : null;
  const e = vorhanden ? { ...vorhanden } : { label: '', ico: 'doc' };
  const belegung = id ? store.bereichBelegung(id) : 0;
  const andere = BEREICHE().filter((b) => b.id !== id);

  openSheet(
    {
      body: `<h3>${vorhanden ? 'Bereich ändern' : 'Neuer Bereich'}</h3>
        <label class="field"><span>Name</span>
          <input type="text" id="beLabel" value="${esc(e.label)}" placeholder="z.B. Velosachen" /></label>
        <div class="field"><span>Symbol</span>
          <div class="options ico-wahl" id="beIco">${ICON_NAMES.map(
            (n) =>
              `<button class="ico-knopf ${n === e.ico ? 'is-active' : ''}" data-ico="${n}"
                 type="button" aria-label="${n}">${icon(n, 20)}</button>`
          ).join('')}</div>
        </div>
        ${
          vorhanden && andere.length
            ? `<div style="height:14px"></div>
               <button class="btn danger" id="beDel">${icon('trash', 20)} Bereich löschen</button>
               ${belegung ? `<p class="hint" style="margin-top:8px">${belegung} Einträge wandern dann in einen anderen Bereich.</p>` : ''}`
            : ''
        }`,
      foot: `<button class="btn primary" id="beSave">Speichern</button>
             <button class="btn" id="beAbbruch">Abbrechen</button>`,
    },
    (root) => {
      root.querySelector('#beLabel').addEventListener('input', (ev) => (e.label = ev.target.value));
      bindSingle(root, '#beIco', 'ico', (v) => (e.ico = v));
      root.querySelector('#beAbbruch').addEventListener('click', openBereicheSheet);
      root.querySelector('#beSave').addEventListener('click', () => {
        if (!e.label.trim()) return toast('Name fehlt');
        if (vorhanden) store.patchBereich(id, { label: e.label.trim(), ico: e.ico });
        else store.addBereich({ label: e.label.trim(), ico: e.ico });
        openBereicheSheet();
        toast('Gespeichert');
      });
      root.querySelector('#beDel')?.addEventListener('click', () => {
        let ziel = andere[0].id;
        openSheet(
          {
            body: `<h3>„${esc(e.label)}" löschen?</h3>
              ${
                belegung
                  ? `<p class="hint">${belegung} Einträge hängen daran. Wohin sollen sie?</p>
                     <div class="field"><div class="options" id="beZiel">${chipsSingle(andere, ziel, 'ziel')}</div></div>`
                  : `<p class="hint">Der Bereich ist leer und wird einfach entfernt.</p>`
              }`,
            foot: `<button class="btn danger" id="beJa">Ja, löschen</button>
                   <button class="btn" id="beNein">Abbrechen</button>`,
          },
          (r2) => {
            bindSingle(r2, '#beZiel', 'ziel', (v) => (ziel = v));
            r2.querySelector('#beJa').addEventListener('click', () => {
              store.removeBereich(id, belegung ? ziel : null);
              openBereicheSheet();
              toast(belegung ? `Gelöscht, ${belegung} Einträge verschoben` : 'Gelöscht');
            });
            r2.querySelector('#beNein').addEventListener('click', () => openBereichSheet(id));
          }
        );
      });
    }
  );
}

// ---------------------------------------------------------------------------
// Aktivitäten verwalten
// ---------------------------------------------------------------------------

function openAktivitaetenSheet() {
  const zeile = (a) => `<div class="teil-zeile" data-akt="${esc(a.id)}">
      <input class="akt-label" type="text" value="${esc(a.label)}" />
      <span class="akt-anzahl">${store.aktivitaetBelegung(a.id)}×</span>
      <button class="teil-del" type="button" aria-label="${esc(a.label)} löschen">${icon('trash', 18)}</button>
    </div>`;

  openSheet(
    {
      body: `<h3>Aktivitäten</h3>
        <p class="hint">Steuern, was auf die Liste kommt. Die Zahl zeigt, wie viele
          Stammlisten-Einträge daran hängen.</p>
        <div class="field"><div id="aktListe">${AKTIVITAETEN().map(zeile).join('')}</div></div>
        <button class="btn" id="aktNeu">${icon('plus', 20)} Aktivität hinzufügen</button>`,
      foot: `<button class="btn primary" id="aktFertig">Fertig</button>`,
    },
    (root) => {
      const wire = (z) => {
        const id = z.dataset.akt;
        z.querySelector('.akt-label').addEventListener('change', (ev) => {
          const label = ev.target.value.trim();
          if (label) store.patchAktivitaet(id, { label });
          else ev.target.value = store.state.data.aktivitaeten[id].label;
        });
        z.querySelector('.teil-del').addEventListener('click', () => {
          const anzahl = store.aktivitaetBelegung(id);
          const name = store.state.data.aktivitaeten[id].label;
          confirmSheet(
            {
              titel: `„${name}" löschen?`,
              text: anzahl
                ? `Die Aktivität wird bei ${anzahl} Stammlisten-Einträgen und in allen Reisen entfernt. Die Einträge selbst bleiben – sie gelten dann unabhängig von Aktivitäten.`
                : 'Die Aktivität wird nirgends verwendet.',
              knopf: 'Ja, löschen',
            },
            () => {
              store.removeAktivitaet(id);
              openAktivitaetenSheet();
              toast('Gelöscht');
            }
          );
        });
      };
      root.querySelectorAll('[data-akt]').forEach(wire);
      root.querySelector('#aktNeu').addEventListener('click', () => {
        const id = store.addAktivitaet('Neue Aktivität');
        openAktivitaetenSheet();
        const feld = sheet.querySelector(`[data-akt="${id}"] .akt-label`);
        feld?.focus();
        feld?.select();
      });
      root.querySelector('#aktFertig').addEventListener('click', closeSheet);
    }
  );
}

/** Editor für einen Stammlisten-Eintrag. `id === null` heisst: neu anlegen. */
function openStammSheet(id, vorgabe = null) {
  const vorhanden = id ? store.state.data.master[id] : null;
  if (id && !vorhanden) return;
  const e = vorhanden
    ? JSON.parse(JSON.stringify(vorhanden))
    : { ...store.LEERER_STAMM_EINTRAG(), ...(vorgabe ?? {}) };

  const zeichne = (root) => {
    const proNacht = e.qtyMode === 'pronacht';
    const istBehaelter = (e.teile ?? []).length > 0;
    root.querySelector('#stBody').innerHTML = `
      <label class="field"><span>Was?</span>
        <input type="text" id="sLabel" value="${esc(e.label)}" placeholder="z.B. Knieschoner" /></label>

      <label class="field"><span>Bereich</span>
        <select id="sCat">${BEREICHE()
          .map((c) => `<option value="${c.id}" ${c.id === e.category ? 'selected' : ''}>${esc(c.label)}</option>`)
          .join('')}</select></label>

      <div class="field"><span>Für wen?</span>
        <div class="options" id="sWer">${chipsMulti(
          PERSONEN.map((p) => ({ id: p.id, label: p.name })),
          e.wer,
          'wer'
        )}</div>
        <p class="hint" id="sWerHint">${esc(werHinweis(e.wer))}</p>
      </div>

      <div class="field"><span>Inhalt <span class="hint">– leer = einfacher Eintrag</span></span>
        <div id="sTeile">${(e.teile ?? []).map((t) => teilZeile(t)).join('')}</div>
        <button class="btn" id="sTeilNeu" style="margin-top:10px">${icon('plus', 20)} Teil hinzufügen</button>
        ${
          istBehaelter
            ? `<p class="hint" style="margin-top:10px">Wird als Behälter angezeigt: jedes Teil einzeln abhakbar.
                 „/Nacht" rechnet die Menge aus der Reisedauer – etwa eine Tablette pro Nacht.</p>`
            : ''
        }
      </div>

      ${
        istBehaelter
          ? ''
          : `<div class="field"><span>Menge</span>
        <div class="options">
          <button class="chip ${!proNacht ? 'is-active' : ''}" data-mode="fest">Feste Menge</button>
          <button class="chip ${proNacht ? 'is-active' : ''}" data-mode="pronacht">Pro Nacht</button>
        </div>
      </div>`
      }

      ${
        istBehaelter
          ? ''
          : proNacht
          ? `<div class="grid-2">
               <label class="field"><span>Pro Nacht</span>
                 <input type="number" id="sQty" step="0.1" min="0.1" value="${e.qty}" /></label>
               <label class="field"><span>Zuschlag</span>
                 <input type="number" id="sPlus" min="0" max="20" value="${e.plus ?? 0}" /></label>
             </div>
             <div class="grid-2">
               <label class="field"><span>Maximum</span>
                 <input type="number" id="sCap" min="1" max="199" value="${e.cap ?? ''}" placeholder="ohne" /></label>
               <label class="field"><span>Max. mit Waschen</span>
                 <input type="number" id="sCapW" min="1" max="199" value="${e.capWasch ?? ''}" placeholder="ohne" /></label>
             </div>
             <p class="hint">1 pro Nacht mit Zuschlag 1 heisst „Nächte + 1".</p>`
          : `<label class="field"><span>Stückzahl</span>
               <input type="number" id="sQty" min="1" max="199" value="${Math.round(e.qty) || 1}" /></label>
             <p class="hint">1 heisst: einfache Zeile ohne Zahl.</p>`
      }

      <div class="field"><span>Nur bei diesen Reisearten <span class="hint">– leer = bei allen</span></span>
        <div class="options" id="sArten">${chipsMulti(ARTEN, e.arten, 'art')}</div></div>

      <div class="field"><span>Nur bei diesen Aktivitäten <span class="hint">– leer = immer</span></span>
        <div class="options" id="sAkt">${chipsMulti(AKTIVITAETEN(), e.aktivitaeten, 'akt')}</div></div>

      <div class="field"><span>Nur in diesen Jahreszeiten <span class="hint">– leer = immer</span></span>
        <div class="options" id="sJz">${chipsMulti(JAHRESZEITEN, e.jahreszeiten, 'jz')}</div></div>

      <div class="field"><span>Nur in diesen Regionen <span class="hint">– leer = überall</span></span>
        <div class="options" id="sReg">${chipsMulti(REGIONEN, e.regionen, 'reg')}</div></div>

      <div class="field"><span>Nur wenn mit dabei <span class="hint">– leer = egal</span></span>
        <div class="options" id="sDabei">${chipsMulti(
          PERSONEN.map((p) => ({ id: p.id, label: p.name })),
          e.wennDabei,
          'dabei'
        )}</div></div>

      <label class="field"><span>Erst ab Anzahl Nächten</span>
        <input type="number" id="sMin" min="0" max="60" value="${e.minNaechte ?? 0}" /></label>

      <label class="field"><span>Notiz</span>
        <input type="text" id="sNote" value="${esc(e.note ?? '')}" placeholder="z.B. nur wenn richtig gekocht wird" /></label>

      ${vorhanden ? `<div style="height:14px"></div><button class="btn danger" id="sDel">${icon('trash', 20)} Aus der Stammliste löschen</button>` : ''}
      <div style="height:4px"></div>
    `;

    const b = root.querySelector('#stBody');
    b.querySelector('#sLabel').addEventListener('input', (ev) => (e.label = ev.target.value));
    b.querySelector('#sCat').addEventListener('change', (ev) => (e.category = ev.target.value));
    b.querySelectorAll('#sWer [data-wer]').forEach((el) =>
      el.addEventListener('click', () => {
        const s = new Set(e.wer);
        s.has(el.dataset.wer) ? s.delete(el.dataset.wer) : s.add(el.dataset.wer);
        e.wer = PERSONEN.map((p) => p.id).filter((id) => s.has(id));
        el.classList.toggle('is-active');
        b.querySelector('#sWerHint').textContent = werHinweis(e.wer);
      })
    );
    b.querySelectorAll('[data-mode]').forEach((el) =>
      el.addEventListener('click', () => {
        e.qtyMode = el.dataset.mode;
        if (e.qtyMode === 'pronacht' && e.qty > 5) e.qty = 1;
        zeichne(root);
      })
    );
    /*
     * Der Inhalt wird direkt im DOM verwaltet statt neu gezeichnet – sonst
     * verliert man beim Tippen den Fokus. Neu gezeichnet wird nur, wenn der
     * Eintrag dadurch zum Behälter wird oder wieder ein einfacher.
     */
    const liste = b.querySelector('#sTeile');
    const bedLesen = (z) => {
      try {
        return JSON.parse(decodeURIComponent(z.dataset.bed || '')) ?? bedVon({});
      } catch {
        return bedVon({});
      }
    };
    const zeileLesen = (z) => ({
      label: z.querySelector('.teil-label').value.trim(),
      qty: Number(z.querySelector('.teil-qty').value) || 1,
      pronacht: z.querySelector('.teil-pn').classList.contains('is-active'),
      plus: Number(z.querySelector('.teil-plus')?.value) || 0,
      cap: Number(z.querySelector('.teil-cap')?.value) || null,
      ...bedLesen(z),
    });
    const teileLesen = () => [...liste.querySelectorAll('.teil-block')].map(zeileLesen);
    const uebernehmen = () => (e.teile = teileLesen().filter((t) => t.label));

    /** Zeile mit veränderten Daten neu aufbauen und wieder verdrahten. */
    const neuZeichnen = (z, daten, offen) => {
      const huelle = document.createElement('div');
      huelle.innerHTML = teilZeile(daten, offen);
      const neu = huelle.firstElementChild;
      z.replaceWith(neu);
      wireZeile(neu);
      uebernehmen();
      return neu;
    };

    function wireZeile(z) {
      z.querySelectorAll('.teil-label, .teil-qty, .teil-plus, .teil-cap').forEach((f) =>
        f.addEventListener('input', uebernehmen)
      );
      z.querySelector('.teil-pn').addEventListener('click', () => {
        // Umschalten blendet Zuschlag und Maximum ein oder aus: Zeile neu bauen.
        const daten = zeileLesen(z);
        daten.pronacht = !daten.pronacht;
        neuZeichnen(z, daten, z.dataset.offen === '1');
      });
      z.querySelector('.teil-bed-knopf').addEventListener('click', () =>
        neuZeichnen(z, zeileLesen(z), z.dataset.offen !== '1')
      );

      // Bedingungen sitzen im data-Attribut, nicht in Eingabefeldern.
      const bedAendern = (fn) => {
        const bed = bedLesen(z);
        fn(bed);
        z.dataset.bed = encodeURIComponent(JSON.stringify(bed));
        z.querySelector('.teil-bed-text').textContent = bedingungText(bed);
        z.querySelector('.teil-bed-knopf').classList.toggle(
          'is-gesetzt',
          Boolean(
            bed.arten.length || bed.aktivitaeten.length || bed.jahreszeiten.length ||
              bed.wennDabei.length || bed.minNaechte
          )
        );
        uebernehmen();
      };
      z.querySelectorAll('[data-bedgruppe]').forEach((gruppe) => {
        const feld = gruppe.dataset.bedgruppe;
        gruppe.querySelectorAll('[data-w]').forEach((chip) =>
          chip.addEventListener('click', () => {
            chip.classList.toggle('is-active');
            bedAendern((bed) => {
              const s = new Set(bed[feld]);
              s.has(chip.dataset.w) ? s.delete(chip.dataset.w) : s.add(chip.dataset.w);
              bed[feld] = [...s];
            });
          })
        );
      });
      z.querySelector('.teil-min')?.addEventListener('input', (ev) =>
        bedAendern((bed) => (bed.minNaechte = Number(ev.target.value) || 0))
      );

      z.querySelector('.teil-del').addEventListener('click', () => {
        const warBehaelter = teileLesen().filter((t) => t.label).length > 0;
        z.remove();
        uebernehmen();
        if (warBehaelter && !e.teile.length) zeichne(root);
      });
    }
    liste.querySelectorAll('.teil-block').forEach(wireZeile);

    b.querySelector('#sTeilNeu').addEventListener('click', () => {
      const vorherLeer = !e.teile.length;
      liste.insertAdjacentHTML('beforeend', teilZeile({ label: '', qty: 1, pronacht: false }));
      const neu = liste.lastElementChild;
      wireZeile(neu);
      neu.querySelector('.teil-label').focus();
      // Aus einem einfachen Eintrag wird ein Behälter: Mengenfelder ausblenden.
      if (vorherLeer) {
        neu.querySelector('.teil-label').addEventListener(
          'blur',
          () => {
            uebernehmen();
            if (e.teile.length) zeichne(root);
          },
          { once: true }
        );
      }
    });
    b.querySelector('#sQty')?.addEventListener('input', (ev) => (e.qty = Number(ev.target.value) || 1));
    b.querySelector('#sPlus')?.addEventListener('input', (ev) => (e.plus = Number(ev.target.value) || 0));
    b.querySelector('#sCap')?.addEventListener('input', (ev) => (e.cap = Number(ev.target.value) || null));
    b.querySelector('#sCapW')?.addEventListener('input', (ev) => (e.capWasch = Number(ev.target.value) || null));
    b.querySelector('#sMin').addEventListener('input', (ev) => (e.minNaechte = Number(ev.target.value) || 0));
    b.querySelector('#sNote').addEventListener('input', (ev) => (e.note = ev.target.value));
    bindMulti(b, '#sArten', 'art', e, 'arten');
    bindMulti(b, '#sAkt', 'akt', e, 'aktivitaeten');
    bindMulti(b, '#sJz', 'jz', e, 'jahreszeiten');
    bindMulti(b, '#sReg', 'reg', e, 'regionen');
    bindMulti(b, '#sDabei', 'dabei', e, 'wennDabei');
    b.querySelector('#sDel')?.addEventListener('click', () => {
      store.removeMasterItem(id);
      closeSheet();
      toast('Aus der Stammliste gelöscht');
    });
  };

  openSheet(
    {
      body: `<h3>${vorhanden ? 'Eintrag bearbeiten' : 'Neuer Eintrag'}</h3><div id="stBody"></div>`,
      foot: `<button class="btn primary" id="sSave">Speichern</button>`,
    },
    (root) => {
      zeichne(root);
      root.querySelector('#sSave').addEventListener('click', () => {
        if (!e.label.trim()) return toast('Bezeichnung fehlt');
        e.label = e.label.trim();
        if (vorhanden) store.patchMasterItem(id, e);
        else store.addMasterItem(e);
        closeSheet();
        toast('Gespeichert');
      });
    }
  );
}

// ===========================================================================
// Sync
// ===========================================================================

function renderSync() {
  const s = store.state.syncStatus;
  const cfg = store.state.config;
  view.innerHTML = `
    <section class="card">
      <div class="card-head">${iconTile('sync')} Status <span class="count">${esc(s.text)}</span></div>
      <div class="card-body">
        ${s.error ? `<p class="hint" style="color:var(--danger)">${esc(s.error)}</p>` : ''}
        <p class="hint">Ohne Sync funktioniert alles normal weiter – die Daten liegen dann nur auf diesem Gerät.</p>
      </div>
    </section>

    <section class="card">
      <div class="card-head">${iconTile('lock')} Supabase-Zugang</div>
      <div class="card-body">
        <label class="field"><span>Projekt-URL</span>
          <input type="text" id="sUrl" value="${esc(cfg.url)}" placeholder="https://xxxx.supabase.co"
                 autocapitalize="off" autocorrect="off" spellcheck="false" /></label>
        <label class="field"><span>Anon-Key</span>
          <input type="text" id="sKey" value="${esc(cfg.key)}" placeholder="eyJ… oder sb_publishable_…"
                 autocapitalize="off" autocorrect="off" spellcheck="false" /></label>
        <div style="height:16px"></div>
        <button class="btn primary" id="sSave">Speichern & verbinden</button>
        <button class="btn" id="sOff">Sync ausschalten</button>
        <p class="hint" style="margin-top:12px">Bleibt auf diesem Gerät und steht nicht im Repository.</p>
      </div>
    </section>

    <section class="card">
      <div class="card-head">${iconTile('users')} Familien-Code</div>
      <div class="card-body">
        <p class="hint">Damit übernimmt das zweite Gerät die Stammliste und alle Reisen. Einmal eingeben, danach läuft es.</p>
        <div style="height:12px"></div>
        <code class="code">${esc(store.state.data.householdId)}</code>
        <div style="height:12px"></div>
        <div class="btn-row">
          <button class="btn" id="sCopy">${icon('copy', 20)} Kopieren</button>
          <button class="btn" id="sShare">${icon('share', 20)} Teilen</button>
        </div>
      </div>
    </section>

    <section class="card">
      <div class="card-head">${iconTile('bag')} Code vom anderen Gerät</div>
      <div class="card-body">
        <label class="field"><span>Familien-Code</span>
          <input type="text" id="sJoin" placeholder="Code eintragen" autocapitalize="off" autocorrect="off" spellcheck="false" /></label>
        <div style="height:16px"></div>
        <button class="btn" id="sJoinBtn">Übernehmen</button>
        <p class="hint" style="margin-top:12px">Ersetzt den eigenen Code. Reisen, die nur auf diesem Gerät liegen,
          bleiben erhalten und werden mit hochgeladen.</p>
      </div>
    </section>

    <p class="hint">Einrichtung: Supabase-Projekt anlegen, <code class="code">supabase/schema.sql</code> im
      SQL-Editor ausführen, dann URL und Anon-Key hier eintragen. Details in der README.</p>

    <p class="hint fassung">Fassung <span id="fassung">…</span></p>
  `;

  zeigeFassung();

  view.querySelector('#sSave').addEventListener('click', async () => {
    store.saveConfig({
      url: view.querySelector('#sUrl').value.trim(),
      key: view.querySelector('#sKey').value.trim(),
    });
    const ok = await sync.connect();
    toast(ok ? 'Verbunden' : 'Verbindung fehlgeschlagen');
    render();
  });
  view.querySelector('#sOff').addEventListener('click', () => {
    store.saveConfig({ url: '', key: '' });
    sync.disconnect();
    toast('Sync aus');
    render();
  });
  view.querySelector('#sCopy').addEventListener('click', async () => {
    await navigator.clipboard?.writeText(store.state.data.householdId);
    toast('Code kopiert');
  });
  view.querySelector('#sShare').addEventListener('click', async () => {
    const code = store.state.data.householdId;
    if (navigator.share) await navigator.share({ title: 'Packliste', text: code });
    else {
      await navigator.clipboard?.writeText(code);
      toast('Code kopiert');
    }
  });
  view.querySelector('#sJoinBtn').addEventListener('click', () => {
    const code = view.querySelector('#sJoin').value.trim();
    if (!code) return;
    const eigene = Object.values(store.state.data.master).filter((m) => !m.deleted).length;
    /*
     * Beitreten ersetzt die eigene Stammliste – das ist Absicht, stand aber
     * nirgends. Der Hinweistext daneben sprach nur von Code und Reisen, und
     * einen Rückweg gab es nicht.
     */
    confirmSheet(
      {
        titel: 'Diesem Haushalt beitreten?',
        text: `Die Stammliste dieses Geräts (${eigene} Einträge) samt Bereichen und Aktivitäten wird durch die des Haushalts ersetzt. Deine Reisen bleiben.`,
        knopf: 'Beitreten',
      },
      async () => {
        const vorher = store.stammlisteSichern();
        closeSheet();
        try {
          const anzahl = await sync.joinHousehold(code);
          toast(
            `Übernommen: ${anzahl} ${anzahl === 1 ? 'Reise' : 'Reisen'}`,
            { text: 'Widerrufen', fn: () => store.stelleStammlisteWiederHer(vorher) },
            12000
          );
          setTab('reisen');
        } catch (err) {
          toast(String(err?.message ?? err));
        }
      }
    );
  });
}

/**
 * Welche Fassung läuft gerade?
 *
 * Quelle ist der Name des Service-Worker-Caches – der entspricht genau dem
 * Stand, den dieses Gerät geladen hat. Damit gibt es keine zweite Stelle, die
 * man beim Veröffentlichen zu ändern vergessen könnte.
 */
async function zeigeFassung() {
  const feld = $('#fassung');
  if (!feld) return;
  try {
    const namen = await caches.keys();
    const treffer = namen.find((n) => n.startsWith('packliste-'));
    feld.textContent = treffer ? treffer.replace('packliste-', '') : 'Entwicklung (kein Cache)';
  } catch {
    feld.textContent = 'unbekannt';
  }
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

// Für Tests im Browser erreichbar.
window.__packliste = { store, sync, regenerate, resolveParams, amount, matches, progress };

// Ganz am Schluss starten: so ist jede Funktion und Konstante dieses Moduls
// fertig ausgewertet, bevor das erste Mal gezeichnet wird.
sync.initAutoSync();
render();
registerServiceWorker();
