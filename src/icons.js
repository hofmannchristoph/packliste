/**
 * Einfarbige Strich-Icons, inline als SVG.
 *
 * Bewusst keine Emoji: die bringen Farbe und Plattform-Stil mit und brechen
 * das ruhige, monochrome Bild. Alle Icons erben die Textfarbe.
 */

const P = {
  bag: '<rect x="3" y="7" width="18" height="13.5" rx="2.5"/><path d="M9 7V5.2A2.2 2.2 0 0 1 11.2 3h1.6A2.2 2.2 0 0 1 15 5.2V7"/>',
  check:
    '<circle cx="12" cy="12" r="8.6"/><path d="M8.2 12.4l2.6 2.6 5-5.2"/>',
  tune:
    '<path d="M6 3.5v6M6 14.5v6M12 3.5v10.5M12 19v1.5M18 3.5v1.5M18 10v10.5"/><circle cx="6" cy="12" r="2.2"/><circle cx="12" cy="16.5" r="2.2"/><circle cx="18" cy="7.7" r="2.2"/>',
  list:
    '<path d="M9 6.5h11M9 12h11M9 17.5h11"/><circle cx="4.6" cy="6.5" r="1.1"/><circle cx="4.6" cy="12" r="1.1"/><circle cx="4.6" cy="17.5" r="1.1"/>',
  sync: '<path d="M20.5 12a8.5 8.5 0 0 0-14.8-5.7"/><path d="M3.5 12a8.5 8.5 0 0 0 14.8 5.7"/><path d="M5.7 2.4v3.9h3.9M18.3 21.6v-3.9h-3.9"/>',
  chevron: '<path d="M9.5 5.5l6.5 6.5-6.5 6.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  dots:
    '<circle cx="5" cy="12" r="1.8" fill="currentColor" stroke="none"/>' +
    '<circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none"/>' +
    '<circle cx="19" cy="12" r="1.8" fill="currentColor" stroke="none"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M16.3 16.3L21 21"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c0-4 3.4-6.2 7.5-6.2s7.5 2.2 7.5 6.2"/>',
  shirt: '<path d="M8.5 3.5L12 6l3.5-2.5 4.5 3-2.2 3.4-1.3-.9v11.5H7.5V9l-1.3.9L4 6.5z"/>',
  shoe: '<path d="M3 15.5h12.5l4.2-2.4c1.1-.6 1-2.2-.2-2.7l-5.6-2.2-1.9 2-3-1.1-2-2H3z"/><path d="M3 15.5v3.5h18v-3.5"/>',
  droplet: '<path d="M12 3.2s6.2 6.4 6.2 10.2a6.2 6.2 0 0 1-12.4 0C5.8 9.6 12 3.2 12 3.2z"/>',
  card: '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 10.5h18M6.5 14.5h4"/>',
  plug: '<path d="M9 2.5v5.5M15 2.5v5.5"/><path d="M6.8 8h10.4v2.8a5.2 5.2 0 0 1-10.4 0z"/><path d="M12 16v5.5"/>',
  bike: '<circle cx="5.8" cy="17" r="3.4"/><circle cx="18.2" cy="17" r="3.4"/><path d="M5.8 17l4.4-7.4h5.2L18.2 17M10.2 9.6h6"/>',
  backpack:
    '<path d="M7 8.5a5 5 0 0 1 10 0v10.2a2.3 2.3 0 0 1-2.3 2.3H9.3A2.3 2.3 0 0 1 7 18.7z"/><path d="M10 8.5V6.2a2 2 0 0 1 4 0v2.3M9.5 14.5h5"/>',
  toy: '<circle cx="12" cy="14.5" r="5.2"/><circle cx="6.8" cy="7" r="2.6"/><circle cx="17.2" cy="7" r="2.6"/>',
  pot: '<path d="M4.8 9.2h14.4v5.6a4.5 4.5 0 0 1-4.5 4.5H9.3a4.5 4.5 0 0 1-4.5-4.5z"/><path d="M2.5 11.4h2.3M19.2 11.4h2.3M8.5 9.2V7a3.5 3.5 0 0 1 7 0v2.2"/>',
  basket: '<path d="M3.6 9h16.8l-2 10.5H5.6z"/><path d="M9 9l1.6-5M15 9l-1.6-5"/>',
  van: '<path d="M2.8 16.2V8.3a2.3 2.3 0 0 1 2.3-2.3h8.6l5.5 5.2v5"/><circle cx="7.3" cy="17.8" r="2.1"/><circle cx="16.7" cy="17.8" r="2.1"/><path d="M2.8 16.2h2.4m4.2 0h5.2"/>',
  route: '<circle cx="6" cy="6" r="2.6"/><circle cx="18" cy="18" r="2.6"/><path d="M6 8.6v4.6a4.2 4.2 0 0 0 4.2 4.2h5.2"/>',
  lock: '<rect x="4.8" y="10.5" width="14.4" height="9.7" rx="2.4"/><path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7"/>',
  trash: '<path d="M4 7h16M9.5 7V4.8h5V7M6.2 7l.9 13.2h9.8L17.8 7"/>',
  copy: '<rect x="9" y="9" width="11.5" height="11.5" rx="2.4"/><path d="M15.2 5.5H6a2.4 2.4 0 0 0-2.4 2.4v9.2"/>',
  archive:
    '<rect x="3" y="4" width="18" height="5" rx="1.5"/><path d="M5 9v9a2.4 2.4 0 0 0 2.4 2.4h9.2A2.4 2.4 0 0 0 19 18V9M10 13.2h4"/>',
  share:
    '<circle cx="18" cy="5.2" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="18.8" r="2.5"/><path d="M8.2 10.8l7.5-4.3M8.2 13.2l7.5 4.3"/>',
  refresh: '<path d="M20.4 12a8.4 8.4 0 1 1-2.5-6"/><path d="M20.6 3.8v4.6h-4.6"/>',
  edit: '<path d="M4 20h4.2L20 8.2 15.8 4 4 15.8z"/><path d="M14.4 5.4l4.2 4.2"/>',
  doc: '<rect x="5" y="3" width="14" height="18" rx="2.4"/><path d="M8.6 8h6.8M8.6 12h6.8M8.6 16h4.4"/>',
  moon: '<path d="M20.5 14.8A8.8 8.8 0 0 1 9.2 3.5a8.8 8.8 0 1 0 11.3 11.3z"/>',
  users:
    '<circle cx="9" cy="8" r="3.6"/><path d="M2.8 20.5c0-3.6 2.9-5.6 6.2-5.6s6.2 2 6.2 5.6"/><path d="M16 5.2a3.6 3.6 0 0 1 0 6.8M17.8 15.4c2.1.6 3.4 2.4 3.4 5.1"/>',
  house:
    '<path d="M3.5 10.4L12 3.4l8.5 7V19a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/><path d="M9.5 21v-6.2h5V21"/>',
  bed: '<path d="M3 20v-9h12.5a4.5 4.5 0 0 1 4.5 4.5V20"/><path d="M3 15.5h17M3 11V6.5"/><circle cx="7.8" cy="8" r="2.1"/>',
};

/** Icons zur Auswahl, wenn ein Bereich angelegt oder umbenannt wird. */
export const ICON_NAMES = [
  'shirt', 'shoe', 'droplet', 'card', 'plug', 'bike', 'backpack', 'toy',
  'pot', 'basket', 'van', 'route', 'lock', 'bag', 'house', 'bed', 'doc',
  'user', 'users', 'check', 'moon', 'search', 'archive', 'copy', 'share',
];

export function icon(name, size = 24) {
  const d = P[name] ?? P.doc;
  return `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"
    aria-hidden="true" focusable="false">${d}</svg>`;
}

/** Icon in einer grauen Kachel, wie in den Zeilen der Liste. */
export function iconTile(name, size = 20) {
  return `<span class="icon-tile">${icon(name, size)}</span>`;
}

/** Icon einer Reiseart. */
export const ART_ICONS = { basislager: 'van', lenz: 'house', hotel: 'bed' };
