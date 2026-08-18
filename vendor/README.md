# Fremde Bibliothek, hier abgelegt statt zur Laufzeit geholt

`supabase-js-2.110.2.mjs` ist das gebündelte `@supabase/supabase-js@2.110.2`,
geholt von esm.sh und unverändert abgelegt.

Vorher lud die App die Bibliothek bei jedem Verbindungsaufbau von `esm.sh` —
fremder Code mit vollem Zugriff auf den Zustand der Seite, ohne Prüfung, und
eine Abhängigkeit, die den Sync ausfallen lässt, sobald der Dienst nicht
erreichbar ist. Der Service Worker durfte Fremd-Hosts bewusst nicht cachen,
also traf das auch die installierte App.

- Bezogen von: `https://esm.sh/@supabase/supabase-js@2.110.2/es2022/supabase-js.bundle.mjs`
- SHA-256: `49f96b6965473c2b728c3aab7469830d6fd6a0b27bb564e377f1892ab076df7a`
- Grösse:   215289 Bytes
- Lizenz: MIT (Supabase)

## Aktualisieren

```bash
curl -L "https://esm.sh/@supabase/supabase-js@<version>/es2022/supabase-js.bundle.mjs" \
  -o vendor/supabase-js-<version>.mjs
shasum -a 256 vendor/supabase-js-<version>.mjs
```

Danach den Pfad in `src/sync.js` und den Eintrag in `sw.js` (SHELL) anpassen,
die Prüfsumme hier festhalten und die Fassung hochzählen.
