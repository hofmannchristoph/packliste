# Packliste

Packliste für die Familie Hofmann. Eine Reise wird angelegt mit **Art, Anzahl Nächten, Jahreszeit, Aktivitäten und wer mitkommt** – die Liste entsteht daraus automatisch aus der Stammliste.

- Kein Build-Schritt, kein Framework: HTML, CSS und JavaScript als ES-Module
- PWA – auf dem iPhone über *Teilen → Zum Home-Bildschirm* wie eine echte App
- Funktioniert offline, Änderungen werden nachgetragen
- Live-Sync zwischen mehreren Geräten
- Mengen rechnen sich aus den Nächten: 1 Nacht → 2 Unterhosen, 10 Nächte → 11, in Lenz mit Waschmaschine → 8
- Zwei Gliederungsebenen: **nach Person** mit Bereichen darunter (Christoph › Velo › Trikot kurz), oder **nach Bereich** mit Personen darunter
- Text-Export zum Weiterschicken

## Aufbau

### Reisen

Startbildschirm ist die Liste der Reisen mit Packstand. Es gibt keine automatisch angelegte Reise – man legt sie an, sie bleibt in der Liste und lässt sich später duplizieren oder archivieren.

Ein Tipp auf die Karte öffnet die Packliste. Alles Weitere – Angaben ändern, duplizieren, archivieren, löschen – steckt hinter dem **⋯** in der Ecke der Karte. Nach links über eine Karte wischen legt einen roten **Löschen** frei, der noch angetippt werden muss – eine Reise mit Dutzenden Häkchen soll nicht an einer einzigen Handbewegung hängen. Danach bleiben acht Sekunden zum *Widerrufen*. Einzelne Zeilen in der Packliste und der Stammliste löschen weiterhin direkt beim Wischen; auch sie reagieren nur nach links.

Löschen hinterlässt einen **Grabstein**, der selbst synchronisiert wird: Ohne ihn könnte das andere Gerät nicht unterscheiden zwischen „gelöscht" und „kenne ich noch nicht" – und würde die Reise beim nächsten Abgleich wieder eintragen. Der Grabstein trägt einen Zeitstempel und den Zustand gelöscht oder wiederhergestellt, damit auch das Widerrufen auf dem anderen Gerät ankommt.

Eine Reise hat: Name, **Art**, **Anzahl Nächte**, **Jahreszeit**, **Aktivitäten**, **wer mitkommt**. Kein Datum, kein Ziel.

### Die drei Reisearten

| Art | Was daraus folgt |
| --- | --- |
| **Basislager 4.0** (Wohnmobil) | Camper-Bereich, eigene Küche muss bestückt werden, Handtücher und Bettzeug mit, Region wählbar |
| **Lenz** | Bettwäsche, Handtücher, Küche, Waschmaschine und Kinderspielzeug sind vor Ort – all das fällt weg. Keine Region |
| **Hotel** | Keine Küche, Handtücher vor Ort, Region wählbar |

Die Region (Schweiz / Schengen / Europa / Fernreise) erscheint nur bei Basislager und Hotel und steuert Reisepass, Fremdwährung, Reiseadapter und Roaming.

### Personen

Christoph, Debora, Laurin und Noemi sind fest angelegt. Pro Reise wird angekreuzt, wer mitkommt – wer nicht mitkommt, dessen Sachen fallen weg, und auch Gemeinsames wie der Molton oder die Bikes verschwinden, wenn niemand dabei ist, der es braucht.

### Stammliste

Die Vorlage, aus der jede Reise entsteht – vollständig in der App bearbeitbar, kein Umweg über den Code. Beim Anlegen einer Reise wird der aktuelle Stand hineinkopiert. Änderst du die Stammliste später, bleibt eine laufende Reise unberührt; in ihr erscheint ein Hinweis mit *Übernehmen*.

Pro Eintrag lässt sich festlegen:

| Feld | Bedeutung |
| --- | --- |
| Was | Bezeichnung |
| Bereich | Kleidung, Velo, Küche … – frei anlegbar, siehe unten |
| Für wen | Personen ankreuzen. Keine ausgewählt = ein gemeinsamer Eintrag, mehrere = ein eigener Eintrag pro Person |
| Menge | Feste Stückzahl, oder pro Nacht mit Zuschlag und Obergrenze (auch eine eigene Grenze, wenn eine Waschmaschine da ist) |
| Nur bei diesen Reisearten | leer = bei allen |
| Nur bei diesen Aktivitäten | leer = immer |
| Nur in diesen Jahreszeiten | leer = immer |
| Nur in diesen Regionen | leer = überall |
| Nur wenn mit dabei | z.B. „Crafty Christoph" nur wenn Christoph mitkommt |
| Erst ab Anzahl Nächten | z.B. Packwürfel ab 6 Nächten |
| Inhalt | Macht den Eintrag zum **Behälter**: eine Zeile pro Teil, jede mit eigener Menge und eigenen Bedingungen |
| Notiz | Kleingedrucktes, z.B. „nur wenn richtig gekocht wird" |

### Bereiche und Aktivitäten

Beides ist in der Stammliste über *Bereiche verwalten* und *Aktivitäten verwalten* bearbeitbar – anlegen, umbenennen, löschen. Ein Bereich hat zusätzlich ein Symbol, wählbar aus dem Icon-Satz.

Beim Löschen wird nichts stillschweigend mitgerissen: Ein Bereich mit Einträgen fragt, wohin sie sollen, und verschiebt sie. Eine Aktivität wird aus allen Stammlisten-Einträgen und allen Reisen herausgenommen; die Einträge selbst bleiben und gelten dann unabhängig von Aktivitäten. Die Anzahl daran hängender Einträge steht jeweils daneben.

### Behälter

Ein Necessaire ist kein Ding, sondern sechs. Trägt ein Eintrag einen **Inhalt**, wird er zum Behälter: Er erscheint als fette Zeile mit Zähler (`2/6`), darunter eingerückt seine Teile – jedes einzeln abhakbar. Das Kästchen am Behälter hakt alles auf einmal ab oder wieder auf, ein Tipp auf den Namen klappt zu und auf.

Der Pfeil zum Auf- und Zuklappen steht beim Namen, damit rechts die gewohnte Stift-Spalte frei bleibt: Behälter lassen sich genauso bearbeiten wie alles andere. Der Stift öffnet dabei einen eigenen Dialog mit dem Inhalt zum Abhaken, statt der Mengenfelder, die für einen Behälter keinen Sinn ergeben.

Jedes Teil hat seine eigene Menge, entweder fest oder **pro Nacht**. Damit lässt sich „Pantoprazol 1 pro Nacht" abbilden: bei 5 Nächten stehen 5 auf der Liste, bei 12 Nächten 12. Der Behälter selbst hat keine Menge mehr, sobald er Inhalt hat – die Felder verschwinden dann.

**Teile haben eigene Bedingungen.** Reisearten, Aktivitäten, Jahreszeiten, „nur wenn X mit" und „ab N Nächten" – dieselben wie beim ganzen Eintrag, und sie gelten zusätzlich zu dessen Bedingungen. So bleibt das Necessaire eine Tasche, aber Rasierer und Trimmer tauchen in Lenz nicht auf (liegen dort schon) und bei zwei Nächten auch nicht. Fällt dadurch jedes Teil weg, verschwindet der Behälter mit.

Im Editor bleibt die Zeile kompakt: unter jedem Teil steht eine graue Kurzfassung („immer dabei" bzw. „Basislager 4.0 / Hotel · ab 5 Nächten"), die den Bedingungsblock aufklappt.

Gezählt werden die Teile, nicht der Behälter. Die IDs der Teile hängen am Text, nicht an der Position: Trägst du in der Stammliste ein Teil nach, bleibt in laufenden Reisen abgehakt, was schon abgehakt war.

Behälter im Ausgangsstand: beide Necessaires, Medis, Täschli, Rucksack, Velokleider, Velozubehör, Velokiste, Crafty, Wild, Gewürze, Apotheke, Bad Kinder, Winterzubehör, Kappe & Halstuch, Badesachen, Skiausrüstung, Kletterausrüstung, Spielsachen, Spielzeug für die Fahrt und Draussen-Spielzeug.

Zwischen den Bedingungen gilt UND, innerhalb einer genügt eines: *Arten: Basislager + Lenz, Aktivitäten: MTB* heisst „bei Basislager oder Lenz, aber nur wenn MTB angehakt ist".

Abgehakt wird nur über das Kästchen, nie über den Text – beim Scrollen verhakt man sich sonst laufend etwas aus Versehen.

**Zum Löschen über die Zeile wischen.** Waagrecht ziehen gehört der Wisch-Geste, senkrecht bleibt beim Scrollen. Erst jenseits von rund 90 Pixeln wird gelöscht, und auch dann erscheint unten ein *Widerrufen*. Bei einem Behälter gehen die Teile mit. In der Stammliste geht dasselbe.

**Schnell etwas ergänzen:** am Ende jedes Abschnitts steht eine dezente Zeile *＋ hinzufügen*. Antippen, tippen, Enter – der Eintrag landet im richtigen Bereich bei der richtigen Person, und das Feld bleibt offen für den nächsten. Danach fragt der Hinweis unten, ob es auch in die Stammliste soll; erst dann kommen Menge, Bedingungen und der Rest zur Sprache. Nachträglich geht es über den Stift → *In die Stammliste aufnehmen*.

Beim Hinzufügen eines Eintrags in einer laufenden Reise gibt es ein Häkchen *Auch in die Stammliste* – so wächst die Vorlage mit.

Beim Neuberechnen bleibt Handarbeit erhalten: Abgehaktes bleibt abgehakt, geänderte Mengen werden nicht überschrieben, gelöschte Einträge kommen nicht zurück (*Gelöschte zurück* macht das rückgängig).

Der Ausgangsstand steht in [`src/seed.js`](src/seed.js) und wird nur beim ersten Start gelesen – oder über *Stammliste zurücksetzen*.

### Woher die Zahlen kommen

Die Mengen sind an den bisherigen Papierlisten kalibriert, an den beiden Extremen gleichzeitig:

| | Scuol, 3 Nächte | Campingferien, 14 Nächte |
| --- | --- | --- |
| Unterhosen | 4 (Liste: 3) | 15 (Liste: 16) |
| T-Shirt | 3 (Liste: 3) | 10 (Liste: 10) |
| Socken lang | 3 (Liste: 3) | 12 (Liste: 12) |
| Velohosen kurz | 2 (Liste: 2) | 4 (Liste: 4) |
| Velosocken | 3 (Liste: 3) | 5 (Liste: 6) |

Velokleider skalieren bewusst flach mit Deckel – unterwegs wird gewaschen, darum braucht es bei vierzehn Nächten nicht das Fünffache von drei Nächten.

### Gliederung der Liste

Zwei Ebenen, je nach Ansicht:

| Ansicht | Aussen | Innen |
| --- | --- | --- |
| Nach Person | Christoph, Debora, Laurin, Noemi, dann Gemeinsames nach Bereich | Bereich, z.B. Velo |
| Nach Bereich | Kleidung, Velo, Küche … | Person |

Gibt es nur eine Unterebene, entfällt deren Überschrift – Küche und Camper enthalten nur Gemeinsames und bleiben deshalb flach.

## Gestaltung

Bottom Sheets lassen sich am Griff nach unten wegziehen – aus einem Formular führt also nicht nur der Speichern-Knopf heraus.

Angelehnt an die Bedienlogik grosser Mobility-Apps: monochrom schwarz/weiss, grosse linksbündige Titel, Zeilen mit Icon-Kachel, Bottom Sheets mit fixiertem Hauptknopf unten, Chips statt Auswahlfelder, grosse Flächen zum Antippen. Hell und dunkel folgen dem Systemthema. Eigene Strich-Icons in [`src/icons.js`](src/icons.js), keine Emoji.

## Lokal ausprobieren

ES-Module brauchen einen echten HTTP-Server, `file://` genügt nicht:

```bash
python3 dev-server.py
```

Dann `http://localhost:4173` öffnen. Der Port lässt sich mitgeben: `python3 dev-server.py 8000`.

Zum Testen auf dem Handy im gleichen WLAN:

```bash
python3 dev-server.py 4173 --lan
```

Der Server nennt beim Start die Adresse, die du auf dem Handy eingibst. Ohne HTTPS registriert iOS allerdings keinen Service Worker – der Offline-Betrieb und die Installation als App gehen erst über GitHub Pages.

`python3 -m http.server` täte es normalerweise auch, scheitert aber, sobald der Prozess kein Leserecht auf das Arbeitsverzeichnis hat – das Modul ruft `os.getcwd()` schon beim Laden auf. `dev-server.py` nimmt stattdessen sein eigenes Verzeichnis und schickt zusätzlich `Cache-Control: no-store`, damit Änderungen an den Modulen sofort sichtbar sind.

## Auf GitHub Pages veröffentlichen

1. Repository auf GitHub anlegen, z.B. `packliste`.
2. Hochladen:

```bash
git init && git add -A && git commit -m "Packliste" && git branch -M main
```

```bash
git remote add origin https://github.com/DEIN-NAME/packliste.git && git push -u origin main
```

3. **Settings → Pages**: *Source* auf `Deploy from a branch`, Branch `main`, Ordner `/ (root)`.
4. Nach ein bis zwei Minuten läuft die App unter `https://DEIN-NAME.github.io/packliste/`.

GitHub Pages ist bei **öffentlichen** Repositories gratis, bei privaten braucht es GitHub Pro. Öffentlich heisst: der Code ist sichtbar – die Liste selbst nicht, die liegt im Browser bzw. in deiner Supabase-Datenbank.

Was dabei einsehbar wäre: der Ausgangsstand in `src/seed.js`, inklusive Namen und Einträgen wie *Rotauf Jacke* oder *Medis: Pantoprazol*. Wenn das nicht sein soll: privates Repo mit GitHub Pro, oder die persönlichen Zeilen aus `seed.js` entfernen und stattdessen in der App über den Stammlisten-Editor anlegen – die landen nur in der Datenbank.

## Live-Sync einrichten (einmalig, ca. 5 Minuten)

1. Auf [supabase.com](https://supabase.com) ein Projekt anlegen (Gratis-Tarif genügt).
2. **SQL Editor** öffnen, [`supabase/schema.sql`](supabase/schema.sql) einfügen und ausführen.
3. **Project Settings → API**: *Project URL* und *anon / publishable key* kopieren.
4. In der App oben rechts auf das Sync-Symbol, beides eintragen, *Speichern & verbinden*.
5. Den **Familien-Code** kopieren und auf dem zweiten Gerät unter *Code vom anderen Gerät* eintragen. Damit übernimmt es die Stammliste und alle Reisen.

URL und Key bleiben **lokal im Browser** (`localStorage`) und landen nicht im Repository. Jedes Gerät braucht sie einmal.

### Wie wird zusammengeführt?

Nicht „wer zuletzt speichert, gewinnt" – das würde Änderungen überschreiben. Jeder Eintrag trägt einen eigenen Zeitstempel, zusammengeführt wird pro Eintrag. Hakt eine Person die Zahnbürste ab, während die andere die Menge der Socken ändert, bleiben beide Änderungen. Gelöschte Einträge hinterlassen eine Markierung, damit das andere Gerät sie nicht wieder heraufholt.

In der Datenbank liegen zwei Arten von Zeilen: eine pro Reise, und eine für den Haushalt (Stammliste plus Verzeichnis der Reisen). So bleibt jede Übertragung klein, statt bei jedem Häkchen den ganzen Datenbestand hochzuladen.

### Wie sicher ist das?

**Der Familien-Code schützt nicht.** Das stand hier lange anders, und es war falsch. Die Policies erlauben `anon` jedes `select` und `update` ohne Bedingung (`using (true)`); den Code filtert allein der Browser, weil er freiwillig `.eq('id', …)` mitschickt. Wer den anon-Key hat, kann jede Zeile lesen und überschreiben — auch ohne den Code zu kennen.

Der tatsächliche Schutz ist also nur der Schlüssel. Er liegt im `localStorage` beider Geräte und geht bei jedem Aufruf über die Leitung. Für eine private Packliste zweier Personen ist das eine vertretbare Entscheidung — aber eine bewusste, keine technisch abgesicherte. Keine Passwörter oder Kartennummern in die Notizfelder schreiben.

Zwei Wege, es strenger zu machen:

- **Schlüssel wechseln, wenn nötig.** Im Supabase-Dashboard den anon-Key rotieren; danach greift kein altes Gerät mehr, bis der neue Schlüssel eingetragen ist. Das ist der einzige Widerruf, den es heute gibt.
- **Den Code echt durchsetzen.** `select` und `update` für `anon` auf `using (false)` setzen und den Zugriff über eine `security definer`-Funktion führen, die den Haushalts-Code als Argument nimmt und nur passende Zeilen liefert. Dann prüft der Server, was heute nur der Client verspricht.

Am strengsten geht es mit Supabase **Authentication**: die Policies von `anon` auf `authenticated` mit `user_id`-Prüfung umstellen.

## Wenn etwas schiefgeht

Drei Störungen sind absehbar. Was dann zu tun ist:

**Der Sync-Punkt bleibt rot.** Antippe ihn – darunter steht der Grund im
Klartext. „Der Zugang wurde abgelehnt" heisst Schlüssel prüfen, „Zu gross für
den Server" heisst archivierte Reisen löschen, alles andere ist meist das Netz
und holt sich von selbst wieder.

**Ein Gerät zeigt plötzlich die Ausgangsstammliste und keine Reisen.** Dann
konnte der gespeicherte Stand nicht gelesen werden; die App sagt das als roter
Balken. Die Daten liegen weiterhin in Supabase. Unter *Sync* den Familien-Code
des anderen Geräts eintragen – die Anbindung ist damit wieder da. Der unlesbare
Datensatz liegt unter dem Schlüssel `packliste.state.v3.defekt` und wird nicht
überschrieben.

**Eine Änderung soll zurück.** Innerhalb der Frist zeigt der schwarze Balken
unten *Widerrufen* – bei Reisen zehn Sekunden, beim Ersetzen der Stammliste
zwölf. Danach hilft nur der zuletzt abgelegte Tabellenexport. Deshalb: vor
jedem grösseren Umbau *Stammliste → Als Tabelle bearbeiten → Als Datei sichern*.
Das ist die einzige Sicherung, die es gibt.

**Auf eine frühere Fassung zurück.** `git revert <commit> && git push`. GitHub
Pages veröffentlicht den Stand von `main`; einen Knopf dafür gibt es nicht. Die
Einstellung, welcher Zweig veröffentlicht wird, liegt in den GitHub-Einstellungen
und nicht im Repository – wer sie ändert, ändert etwas, das hier niemand sieht.

**Den Schlüssel wechseln.** Im Supabase-Dashboard unter *API Keys* den anon-Key
rotieren. Danach greift kein Gerät mehr, bis der neue Schlüssel unter *Sync*
eingetragen ist – auf beiden. Das ist zugleich der einzige Weg, einen einmal
geteilten Familien-Code wirkungslos zu machen.

## Wo die Daten liegen

Auf beiden Geräten im `localStorage` des Browsers, und in einem Supabase-Projekt,
dessen Region beim Anlegen gewählt wurde. Beim Verbindungsaufbau geht die
Projekt-Adresse an Supabase; sonst verlässt nichts das Gerät. Die Bibliothek
liegt seit v26 im Repository (`vendor/`) statt bei einem fremden CDN, es wird
also beim Start keine dritte Stelle mehr angefragt.

Gelöschtes bleibt als Grabstein bestehen, damit es nicht vom anderen Gerät
zurückkommt; Grabsteine älter als ein halbes Jahr räumt die App beim Start weg.
Ein echtes Löschen in der Datenbank gibt es nicht – die Policies erlauben kein
`delete`. Wer wirklich alles entfernen will, löscht die Zeilen im
Supabase-Dashboard und danach die App-Daten auf beiden Geräten.

## Tests

Kein Paketmanagement nötig – Node bringt alles mit:

```bash
node --test test/*.test.js
```

Geprüft wird, was ohne Browser ehrlich prüfbar ist: die Regelauswertung, der
Rundlauf durch die Tabelle, das Zusammenführen zweier Geräte, das Verhalten bei
unlesbarem oder vollem Speicher – und die tragende Zusicherung der Packliste,
dass **jede gezählte Zeile auch gezeigt wird**. Layout, Fokusverhalten und
Zeichendauer stehen bewusst nicht darin; dafür braucht es einen echten Browser.

## Dateien

| Datei | Zweck |
| --- | --- |
| `index.html` | Grundgerüst |
| `assets/style.css` | Gestaltung, hell und dunkel |
| `src/model.js` | Feste Begriffe (Reisearten, Jahreszeiten, Regionen, Personen) und die Ausgangswerte für Bereiche und Aktivitäten |
| `src/seed.js` | Ausgangsstand der Stammliste |
| `src/icons.js` | Strich-Icons als inline SVG |
| `src/generator.js` | Stammliste + Angaben → Liste, inkl. Zusammenführen mit dem bestehenden Stand |
| `src/store.js` | Zustand, localStorage, Merge-Logik für den Sync |
| `src/liste.js` | Welche Zeilen sichtbar sind und wie sie gruppiert werden – ohne DOM, damit die Zusicherung „jede gezählte Zeile wird gezeigt" prüfbar bleibt |
| `src/tabelle.js` | Stammliste als Tabelle aus- und einlesen |
| `src/sync.js` | Supabase mit Realtime |
| `src/app.js` | Oberfläche |
| `sw.js` | Service Worker: Netzwerk zuerst, Cache als Rückfallebene |
| `supabase/schema.sql` | Tabelle und Policies |

## Lizenz

MIT

### Stammliste als Tabelle

Die Struktur der Liste – wer bekommt was, unter welchen Bedingungen, in welcher
Menge – lässt sich in einer Tabelle in Minuten umbauen und in der App nur Zeile
für Zeile. Darum führt unter *Stammliste → Als Tabelle bearbeiten* ein Weg
hinaus und wieder herein: kopieren, in Excel oder Numbers überarbeiten,
zurückspielen. Eingelesen wird sowohl das, was Excel beim Kopieren in die
Zwischenablage legt, als auch eine gespeicherte CSV-Datei.

Bereiche und Aktivitäten entstehen dabei aus dem Blatt selbst – ein Bereich ohne
Einträge bewirkt ohnehin nichts, also gibt es nichts doppelt zu pflegen.
Reisearten, Jahreszeiten, Regionen und Personen sind dagegen fest: an ihnen
hängt Logik, ein Tippfehler soll dort auffallen statt still eine vierte
Reiseart anzulegen. Solange auch nur ein Fehler im Blatt steht, wird nichts
übernommen; die Meldungen nennen die Zeilennummer aus Excel.

Behälter stehen vor ihren Teilen. Ein Teil trägt in der Spalte *Teil von* den
Schlüssel seines Behälters – oder ein `x`, dann gehört es zum Eintrag darüber.
Der Export schreibt immer den Schlüssel, damit ein Sortieren in Excel die
Zuordnung nicht zerreisst.
