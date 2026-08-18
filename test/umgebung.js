/**
 * Browser-Attrappen für die Tests.
 *
 * Die Module sind bewusst umgebungsfrei geschrieben, brauchen aber
 * `localStorage`, `crypto` und ein paar Ereignisziele. Mehr wird hier nicht
 * nachgebaut: Was ohne echten Browser nicht ehrlich prüfbar ist – Layout,
 * Fokus, Zeichendauer – gehört nicht in diese Tests.
 */
import { webcrypto } from 'node:crypto';

export function stelleUmgebung({ online = true, quota = Infinity } = {}) {
  const ablage = new Map();
  globalThis.localStorage = {
    getItem: (k) => (ablage.has(k) ? ablage.get(k) : null),
    setItem(k, v) {
      const s = String(v);
      let belegt = s.length;
      for (const [kk, vv] of ablage) if (kk !== k) belegt += vv.length;
      if (belegt > quota) {
        const err = new Error('QuotaExceededError');
        err.name = 'QuotaExceededError';
        throw err;
      }
      ablage.set(k, s);
    },
    removeItem: (k) => ablage.delete(k),
    clear: () => ablage.clear(),
  };
  globalThis.crypto ??= webcrypto;
  Object.defineProperty(globalThis, 'navigator', {
    value: { onLine: online },
    configurable: true,
    writable: true,
  });
  globalThis.window = { addEventListener() {} };
  globalThis.document = { addEventListener() {}, visibilityState: 'visible' };
  return ablage;
}

/** Module frisch laden, damit Tests sich nicht gegenseitig beeinflussen. */
export async function frisch(pfad) {
  return import(`${pfad}?t=${Math.random()}`);
}
