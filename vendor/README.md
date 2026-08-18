# Fremde Bibliothek, hier abgelegt statt zur Laufzeit geholt

`supabase-js-2.110.2.mjs` ist das gebündelte `@supabase/supabase-js@2.110.2`,
geholt von esm.sh. Dazu die Node-Polyfills, die der Bündel voraussetzt.

Vorher lud die App die Bibliothek bei jedem Verbindungsaufbau von `esm.sh` —
fremder Code mit vollem Zugriff auf den Zustand der Seite, ohne Prüfung, und
eine Abhängigkeit, die den Sync ausfallen lässt, sobald der Dienst nicht
erreichbar ist. Der Service Worker durfte Fremd-Hosts bewusst nicht cachen,
also traf das auch die installierte App.

## Eine Änderung am fremden Code

Die Dateien sind **nicht** unverändert: esm.sh schreibt seine Verweise als
absolute Pfade (`"/node/buffer.mjs"`). Die suchen am Wurzelverzeichnis der
Domain — unter GitHub Pages liegt die App aber unter `/packliste/`, und lokal
unter `/`. Beide Male ergäbe das einen 404. Darum sind alle `"/node/…"` zu
relativen Pfaden umgeschrieben. Sonst ist nichts angefasst.

## Bestand

| Datei | Bytes | SHA-256 (nach der Umschreibung) |
| --- | ---: | --- |
| `supabase-js-2.110.2.mjs` | 215291 | `379411c05bf69c0a7d21356515ee7d24d999ee4584b361e109c9470eaf2e9134` |
| `node/async_hooks.mjs` | 2938 | `b7862dbfba8bbbca956f19e4e08280b529e4b27468779775a9093aef8c92dc1d` |
| `node/buffer.mjs` | 28845 | `64fb61aa5f48644d685f9ceabedba60ea6b5d6ce03dac1943e863d00d9e574f3` |
| `node/events.mjs` | 12118 | `1283706bbf95f2c545f1623df66cfcc309ae2902ad266c7f96bd55dfce019e18` |
| `node/process.mjs` | 7853 | `981e47d1d8121380c2db5704163f22aa03804b4d147dd44a99a6582dfeddd548` |
| `node/tty.mjs` | 685 | `c66ff4b406bad449bfb2ced355f15badf16f4d9e035d2d300e33b5aeee64e3be` |

## Aktualisieren

```bash
curl -L "https://esm.sh/@supabase/supabase-js@<version>/es2022/supabase-js.bundle.mjs" \
  -o vendor/supabase-js-<version>.mjs
grep -oh '"/node/[^"]*"' vendor/supabase-js-<version>.mjs   # welche Polyfills fehlen?
```

Polyfills nach `vendor/node/` holen, in allen Dateien `"/node/` durch `"./node/`
(im Hauptbündel) beziehungsweise `"./` (innerhalb von `vendor/node/`) ersetzen,
danach den Pfad in `src/sync.js`, die Einträge in `sw.js` und die Prüfsummen
hier anpassen und die Fassung hochzählen.

Lizenz: MIT (Supabase).
