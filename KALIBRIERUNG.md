# Kalibrierung der Stammliste

Diese Datei erklärt, **wie** die Zahlen der Stammliste entstehen und welche
Erfahrungen aus dem Aufbau weiter gelten. Die Zahlen selbst werden nicht mehr hier
begründet, sondern in [`ANNAHMEN.md`](ANNAHMEN.md) **gerechnet**.

Wer die Strategie überarbeitet, sollte beide Dateien lesen. Das Regelmodell steht in
`README.md`, die Spaltenbedeutung im Register *Legende* der Tabellenausleitung, der
Ausgangsstand in `src/seed.js`.

---

## Woraus die Mengen kommen

Aus drei Grössen, die in `ANNAHMEN.md` je Kleidergruppe festgehalten sind:

    Tragedauer t      Nächte, die ein Stück deckt        →  Faktor   = 1 / t
    Waschrhythmus w   Nächte bis zur nächsten Wäsche     →  Max      = aufrunden(w / t) + R
    Reserve R         Stück über die Rechnung hinaus     →  Zuschlag = R, nur wenn t ≤ 2

**Die Obergrenze ist der Waschrhythmus.** Das ist der Satz, um den es geht. Der
Faktor beschreibt den Verbrauch, die Obergrenze das Gepäckstück — und sie beantwortet
die Frage, wie lange man ohne Waschgelegenheit auskommen muss.

Eine leere Zelle in *Max* heisst „keine Grenze". Eine ausdrücklich eingetragene `0`
ist eine echte Grenze (nie mehr als null). Vor Fassung 1.26 wurde sie als „keine
Grenze" gelesen; nicht verwechseln.

---

## Was hier früher stand, und warum es ersetzt ist

Bis August 2026 begründete diese Datei die Zahlen anders: geprüft wurde, ob eine
Regel die **gewachsenen Papierlisten** an zwei Extremen reproduziert — Scuol mit
3 Nächten im Hotel und Campingferien mit 14 Nächten. Das ist kein Modell, sondern
Nachbau. Der Nachweis, dass es nicht trug, lässt sich an der Datei selbst führen:

Fünf Kleidungsstücke, die **alle täglich** gewechselt werden, trugen fünf
verschiedene Waschannahmen — zurückgerechnet aus ihrer Obergrenze:

| Gegenstand | Faktor | Max alt | unterstellte Wäsche | 14 N alt |
| --- | --- | ---: | --- | ---: |
| Unterhosen | 1 pro Nacht | 16 | alle 15 Nächte — also nie | 15 |
| Socken lang | 1 pro Nacht | 12 | alle 12 Nächte | 12 |
| T-Shirt | 1 pro Nacht | 10 | alle 10 Nächte | 10 |
| Hose lang | 1 pro 5 Nächte | 3 | alle 6 Nächte | 3 |
| Trainerhose | 1 pro 5 Nächte | 2 | alle 1 Nacht | 2 |

Es gibt keine Annahme, aus der diese fünf Zahlen gemeinsam folgen. Sie waren einzeln
an alte Listen angepasst. Dasselbe bei Lenz: dort steht eine Waschmaschine, jeden Tag
benutzbar — die Grenzen unterstellten trotzdem wöchentliches Waschen.

Die Papierlisten bleiben als **Herkunft der Gegenstände** gültig. Als Quelle der
Mengen sind sie ersetzt.

### Was das gekostet hat

Gemessen über `wantedItems()`, Kleidung, alle vier Personen:

| | alt | neu |
| --- | ---: | ---: |
| Hotel 3 Nächte | 157 | 146 |
| Basislager 14 Nächte | 292 | 250 |
| Lenz 14 Nächte | 216 | 251 |

Pro Erwachsenem bei zwei Wochen Camper: 74 → 58 Stück. Lenz wird bei langen
Aufenthalten schwerer, weil dort vorher 19 Kleidungseinträge auf einer festen
Stückzahl standen und mit der Dauer überhaupt nicht wuchsen.

---

## Die Bedingungen

### Reiseart — der stärkste Filter

Von 215 Einträgen hängen 37 an einer Reiseart, die meisten an `basislager`. Das ist
kein Zufall: **Basislager 4.0 ist das Wohnmobil**, und ein Wohnmobil bringt eine
ganze Klasse von Dingen mit, die sonst niemand braucht — Stromkabel und CEE-Adapter,
Auffahrkeile, Toilettenchemie, Frischwasserschlauch, Gasflasche, Abwasserkassette.

Umgekehrt ist **Lenz die Wohnung**: dort steht schon alles. Der Rasierer ist das
Musterbeispiel — er hängt an `Reiseart = Basislager, Hotel`, weil in Lenz einer liegt.
Dasselbe Muster gilt inzwischen für Duschmittel und die Duschtüechli der Kinder, die
auch das Hotel stellt.

Bei **Hotel** stellt das Haus Handtücher, Duschmittel, Föhn und Bettwäsche und hat
keine Küche. Was dort eigens steht, sind Dinge wie `Adresse & Anfahrt notiert` und
`Buchungen offline gespeichert`.

**Region entfällt bei Lenz** — das ist im Modell so festgelegt, nicht in den
Einträgen. Nach Lenz fährt man nicht ins Ausland. Achtung: ein Eintrag mit einer
Region fällt bei Lenz deshalb ganz durch.

### Der Prüfstein für jede Bedingung

> Ist der Gegenstand unter dieser Bedingung **nachweislich entbehrlich** — weil er am
> Ort vorhanden ist, weil er physisch nicht benutzbar ist, oder weil er ausschliesslich
> zu einer Sache gehört, die nicht stattfindet?

„Braucht man wahrscheinlich nicht" genügt nicht. Alles, was auf einer Vermutung über
Gewohnheiten beruht, gehört in [`OFFEN.md`](OFFEN.md) und nicht in eine Bedingung.
53 Einträge stehen deshalb unverändert.

### Was Bedingungen nicht können

Gemessen: eine Reise mit 3 Nächten Hotel erzeugt **329 Zeilen** zum Abhaken, eine mit
14 Nächten Camper 373. Legt man testweise *jeden* denkbaren Bedingungskandidaten
obendrauf, einschliesslich aller Vermutungen, landet man bei 297. **Mehr als etwa
30 von 329 Zeilen sind über Bedingungen nicht zu holen** — Kleidung 85, Velo 62 und
Schuhe 16 sind 163 Zeilen, in denen nichts nachweislich entbehrlich ist.

Der grössere Hebel liegt woanders: von 329 Zeilen (alle 14 Aktivitäten angehakt) auf
225 (keine) fallen 104 Zeilen, ohne dass eine Bedingung sich ändert. Wer die Liste
kürzer will, hakt weniger Aktivitäten an — oder bündelt Zeilen in Behälter.

### Jahreszeit

Zwei Sätze statt vier Einzelwerte, und sie überlappen sich absichtlich:

- **KUEHL** = Frühling, Herbst, Winter — Wintermantel, Winterjacke, Winterzubehör,
  Winterschuhe, Handschuhe, Finken
- **MILD** = Frühling, Sommer, Herbst — alles „kurz", Sandalen, Sonnenhut
- **WINTER** = nur Winter — Skianzug, Skisocken, Skiunterwäsche, Thermounterwäsche

Ein warmer Maiabend braucht kurze Hosen, ein kalter eine Jacke; darum liegen Frühling
und Herbst in beiden Sätzen. `Skianzug` und die übrigen Skisachen hängen ausdrücklich
an der Jahreszeit und **nicht** an der Aktivität *Ski / Schlitteln* — im Winter wird
sowieso geschlittelt.

**Parallele Einträge dürfen sich nicht addieren** (A5 in `ANNAHMEN.md`). `Socken kurz`
und `Socken lang` teilen die Jahreszeiten unter sich auf, statt beide zu erscheinen;
dasselbe bei `Pyjama` und `Pischi`. Noch nicht gelöst: Deboras sechs feste
Beinkleider stehen neben `Hose lang` und `Hose kurz`.

### Ab Nächten — sparsam eingesetzt

Nur `Mehrfachstecker` ab 3, `Abwesenheitsnotiz im Mail` ab 4, `Packwürfel` ab 6, dazu
Rasierer und Trimmer ab 5 auf Teil-Ebene. Die Schwelle lohnt sich nur, wenn ein
Gegenstand für eine kurze Reise **wirklich lästig** ist. Für zwei Nächte lohnt sich
das Auspacken des Trimmers nicht — für den Kulturbeutel selbst schon.

### Nur wenn dabei, und Für wen

Alles rund um Kinder verschwindet, wenn sie nicht mitkommen — Toilettenfeuchttücher,
Kinderbesteck, Snacks, Spielzeug für die Fahrt, Molton, der Schmerzsirup in der
Apotheke.

Personengebundene Ausrüstung steht bei ihrem Menschen: `Crafty Christoph` bei
Christoph, `Trampivelo Laurin` bei Laurin. Früher waren das gemeinsame Einträge mit
`Nur wenn dabei` — sie erschienen unter „Gemeinsam" statt bei der Person. Die Wirkung
auf *ob* etwas erscheint ist dieselbe; die Einordnung in der Liste ist besser.

Winterzubehör gibt es **zweimal**, für Christoph und Debora getrennt, weil die Teile
verschieden sind (Kappe/Schal gegen Stirnband/Halstuch). Das ist Absicht, keine
Dublette.

---

## Behälter

25 Behälter mit zusammen 140 Teilen. Ein Behälter ist ein Ding, das man als Ganzes
greift — Necessaire, Velotasche, Apotheke. Seine Teile sind das, was drin sein muss.

**Ein Behälter zählt selbst nicht im Fortschritt** — er ist eine Überschrift, kein
Gegenstand. Gezählt werden seine Teile.

Teile können eigene Bedingungen tragen; heute nutzen das sieben Teile in vier
Behältern (Rasierer und Trimmer, Duschmittel, Duschtüechli Kinder, Schmerzsirup).
Das ist bewusst sparsam: Bedingungen auf Teil-Ebene sind schwer zu überblicken. Wenn
ein halber Behälter je nach Reise entfällt, sind es meist besser **zwei Behälter**.

Fällt jedes Teil eines Behälters durch die Bedingungen, verschwindet der Behälter mit.
Deshalb muss ein Behälter, der immer mitmuss, mindestens ein Teil ohne Bedingung
haben — geprüft, alle 25 erfüllen das.

Beachte: eine Teilzeile in der Tabelle kennt **keine Region und kein Max mit
Waschmaschine**. Alles andere lässt sich am Teil setzen.

---

## Was bewusst nicht drinsteht

Diese Auslassungen sind Entscheidungen, keine Lücken. Wer sie „vervollständigt", macht
die Liste falsch:

- **Alles zu Ciara.** Der Hund lebt nicht mehr. Auf den Papierlisten von 2024 stand
  noch einiges dazu — Futter, Napf, Leine, Decke. Nichts davon ist übernommen.
- **Babyausstattung für Laurin.** Er ist aus dem Alter heraus. Windeln, Nuggis, Bodys,
  Babyphone und Kinderwagen standen auf den alten Listen und sind absichtlich weg.
  `Windeln` gibt es noch, aber an Noemi gebunden.
- **Der Latz.** Seit August 2026 weg — Noemi ist herausgewachsen. Derselbe Fall wie
  Laurins Babyausstattung.
- **Wetter als Bedingung.** Es gab die Überlegung, Regensachen an eine Wettervorhersage
  zu hängen. Verworfen: beim Packen steht die Vorhersage für Tag 9 noch nicht fest,
  und eine Regenjacke wiegt wenig.
- **Zielort als Bedingung.** Ebenfalls verworfen. Die Reiseart trägt die Information
  bereits — Lenz *ist* ein Ort, und für alles andere reicht die Region. Deshalb tragen
  `Bergbahn-Info Motta Naluns` und der `Lenkdrachen` keine Ortsbedingung.

---

## Wenn du die Strategie überarbeitest

Ein paar Erfahrungen, die den Umbau überlebt haben:

1. **Ändere die Annahme, nicht die Zahl.** Die Zahlen stehen in `src/seed.js`, aber
   sie *gelten* nur, solange sie aus `ANNAHMEN.md` folgen. Eine Zahl von Hand zu
   ändern, ohne die Annahme nachzuziehen, führt genau in den Zustand zurück, der
   diese Datei einmal nötig gemacht hat.
2. **Prüfe jede Änderung an beiden Extremen.** Drei Nächte Hotel und vierzehn Nächte
   Camping. Eine Regel, die nur in der Mitte stimmt, stimmt nicht.
3. **Eine Bedingung weniger ist meist besser.** Jede Bedingung ist eine Stelle, an der
   später etwas fehlt, ohne dass jemand merkt warum. Im Zweifel lieber einpacken.
   Kein Eintrag trägt heute mehr als zwei Bedingungen; wenn du eine dritte brauchst,
   ist der Eintrag falsch geschnitten.
4. **Bedingungen gehören auf den Eintrag, nicht auf das Teil** — ausser der Fall ist
   so klar wie der Rasierer.
5. **Personengebundenes wirklich binden.** Das ist die Bedingung, die am meisten spart,
   wenn jemand nicht mitkommt.
6. **Rechne, statt zu schätzen.** Jede Zahl in dieser Datei und in `ANNAHMEN.md` ist
   über `wantedItems()` gemessen. Wer eine Wirkung behauptet, ohne sie zu messen,
   irrt sich in der Richtung — beim Umbau ging der erste Bedingungsvorschlag um zwei
   Zeilen in die falsche Richtung, und niemand hätte es gemerkt.

Und nach jeder grösseren Überarbeitung: die Liste einmal für eine echte bevorstehende
Reise erzeugen und durchlesen. Fehler in den Regeln sieht man in der fertigen Liste
sofort und in der Tabelle fast nie.
