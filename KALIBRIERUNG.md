# Kalibrierung der Stammliste

Diese Datei erklärt **warum** die Zahlen und Bedingungen so stehen, wie sie
stehen. Das Regelmodell selbst steht in `README.md`, die Spaltenbedeutung im
Register *Legende* der Tabellenausleitung, der Ausgangsstand in `src/seed.js`.

Wer die Strategie überarbeitet, sollte diese Datei zuerst lesen. Ohne sie sehen
die Zahlen willkürlich aus, und die naheliegende Verbesserung macht sie
schlechter.

---

## Woran kalibriert wurde

Grundlage waren die gewachsenen Papierlisten der Familie, nicht eine
theoretische Überlegung. Geprüft wurde jede Mengenregel gegen **zwei Extreme**:

- **Scuol, 3 Nächte, Hotel** — die kurze Reise
- **Campingferien, 14 Nächte, Basislager** — die lange Reise

Eine Regel gilt als brauchbar, wenn sie an *beiden* Enden ungefähr das ergibt,
was tatsächlich eingepackt wurde. Eine Regel, die bei 14 Nächten stimmt und bei
3 Nächten absurd ist, wurde verworfen — auch wenn sie „logischer" aussah.

Ergebnis an ein paar Beispielen (Faktor 1 + 1, Maximum 16):

| Gegenstand | 3 Nächte | 14 Nächte | auf der Papierliste stand |
| --- | ---: | ---: | --- |
| Unterhosen | 4 | 15 | 3 / 16 |
| T-Shirt | 3 | 10 (gedeckelt) | 3 / 10 |

Die Abweichung bei drei Nächten ist Absicht: eine zu viel wiegt nichts, eine zu
wenig ärgert.

---

## Die Mengenlogik

Vier Werte spielen zusammen. Wer nur einen davon ändert, verschiebt meist das
falsche Ende:

- **Faktor** — Stück pro Nacht. `1` heisst täglich frisch, `0.25` heisst eines
  pro vier Nächte.
- **Zuschlag** — kommt oben drauf, unabhängig von der Dauer. Das ist die
  Reserve. Faktor 1 + Zuschlag 1 heisst „für jede Nacht eines, plus eines".
- **Max** — die Obergrenze für lange Reisen. Ohne sie packt man bei 14 Nächten
  vierzehn Hosen ein.
- **Max mit Waschmaschine** — die tiefere Grenze, wenn vor Ort gewaschen werden
  kann. Gilt heute nur bei der Reiseart **Lenz**.

Die Obergrenze ist der eigentliche Verstand der Regel. Der Faktor beschreibt
den Verbrauch, die Obergrenze das Gepäckstück.

**Achtung:** Seit Fassung 1.26 ist eine ausdrücklich eingetragene `0` in *Max*
eine echte Grenze (also: nie mehr als null). Vorher wurde sie als „keine
Grenze" gelesen. Eine leere Zelle heisst „keine Grenze" — nicht die Null.

### Warum Velokleidung anders skaliert

`Gravel-Trikots & Gravelhelm` steht auf Faktor 0.6 + 1 mit Maximum 4 — flacher
als T-Shirts, obwohl beim Biken mehr Wäsche anfällt. Grund: **unterwegs wird
gewaschen.** Trikots sind schnell trocken, und vier Sätze sind der Punkt, an dem
zusätzliche eher Platz kosten als Nutzen bringen. Wer hier auf Faktor 1 geht,
packt bei zwei Wochen einen halben Koffer Velokleidung.

### Wo die Waschmaschinen-Grenze gesetzt ist

Nur dort, wo es beim Waschen wirklich um Menge geht — Unterhosen, Socken,
T-Shirts. Bei Hosen und Pullovern gibt es sie nicht: die wäscht man auch mit
Maschine nicht täglich, die Regel wäre nur Zierrat.

---

## Die Bedingungen

### Reiseart — der stärkste Filter

Von 214 Einträgen hängen 43 an einer Reiseart, und fast alle davon an
`basislager`. Das ist kein Zufall: **Basislager 4.0 ist das Wohnmobil**, und
ein Wohnmobil bringt eine ganze Klasse von Dingen mit, die sonst niemand
braucht — Stromkabel und CEE-Adapter, Auffahrkeile, Toilettenchemie,
Frischwasserschlauch, Gasflasche, Abwasserkassette.

Umgekehrt ist **Lenz die Wohnung**: dort steht schon alles. Deshalb ist Lenz
bei fast allem *ausgeschlossen*, nicht eingeschlossen. Der Rasierer ist das
Musterbeispiel — er hängt an `Reiseart = Basislager, Hotel`, weil in Lenz einer
liegt.

Bei **Hotel** ist die Liste bewusst kurz. Ein Hotel stellt Handtücher,
Duschmittel und Föhn; was dort steht, sind Dinge wie `Adresse & Anfahrt
notiert` und `Buchungen offline gespeichert`.

**Region entfällt bei Lenz** — das ist im Modell so festgelegt, nicht in den
Einträgen. Nach Lenz fährt man nicht ins Ausland.

### Ab Nächten — sparsam eingesetzt

Nur drei Einträge nutzen es: `Mehrfachstecker` ab 3, `Abwesenheitsnotiz im
Mail` ab 4, `Packwürfel` ab 6. Dazu Rasierer und Trimmer ab 5 auf Teil-Ebene.

Der Gedanke dahinter: Die Schwelle lohnt sich nur, wenn ein Gegenstand für eine
kurze Reise **wirklich lästig** ist. Für zwei Nächte lohnt sich das Auspacken
des Trimmers nicht — für den Kulturbeutel selbst schon.

### Nur wenn dabei — die Kinder und die Velos

24 Einträge hängen daran. Zwei Muster:

- **Kinder (p3 Laurin, p4 Noemi):** alles rund um Kinder verschwindet, wenn sie
  nicht mitkommen — Toilettenfeuchttücher, Kinderbesteck, Snacks, Spielzeug für
  die Fahrt, Molton.
- **Personengebundene Ausrüstung:** jedes Velo hängt an seinem Menschen.
  `Crafty Christoph` an p1, `Wild Debora` an p2, `Trampivelo Laurin` an p3.
  Das ist wichtiger als es aussieht: ohne diese Bindung erscheint Deboras Velo
  auch, wenn nur Christoph fährt.

### Jahreszeit

25 Einträge. Meist eindeutig (Wintermantel, Thermounterwäsche, Badehose), aber
zwei Feinheiten:

- `Socken kurz`, `Hose kurz`, `Jeans kurz` hängen an **Frühling und Sommer** —
  nicht nur Sommer. Ein warmer Maiabend zählt.
- Winterzubehör gibt es **zweimal**, für Christoph und Debora getrennt, weil
  die Teile verschieden sind (Kappe/Schal gegen Stirnband/Halstuch). Das ist
  Absicht, keine Dublette.

---

## Behälter

25 Einträge sind Behälter mit zusammen 140 Teilen. Ein Behälter ist ein Ding,
das man als Ganzes greift — Necessaire, Velotasche, Apotheke. Seine Teile sind
das, was drin sein muss.

**Ein Behälter zählt selbst nicht im Fortschritt** — er ist eine Überschrift,
kein Gegenstand. Gezählt werden seine Teile.

Teile können eigene Bedingungen tragen. Heute nutzen das nur Rasierer und
Trimmer im Necessaire. Das ist bewusst sparsam: Bedingungen auf Teil-Ebene sind
schwer zu überblicken. Wenn ein halber Behälter je nach Reise entfällt, sind es
meist besser **zwei Behälter**.

Fällt jedes Teil eines Behälters durch die Bedingungen, verschwindet der
Behälter mit. Deshalb muss ein Behälter, der immer mitmuss, mindestens ein Teil
ohne Bedingung haben.

---

## Was bewusst nicht drinsteht

Diese Auslassungen sind Entscheidungen, keine Lücken. Wer sie „vervollständigt",
macht die Liste falsch:

- **Alles zu Ciara.** Der Hund lebt nicht mehr. Auf den Papierlisten von 2024
  stand noch einiges dazu — Futter, Napf, Leine, Decke. Nichts davon ist
  übernommen.
- **Babyausstattung für Laurin.** Er ist aus dem Alter heraus. Windeln,
  Nuggis, Bodys, Babyphone und Kinderwagen standen auf den alten Listen und
  sind absichtlich weg. `Windeln` gibt es noch, aber an p4 gebunden.
- **Wetter als Bedingung.** Es gab die Überlegung, Regensachen an eine
  Wettervorhersage zu hängen. Verworfen: beim Packen steht die Vorhersage für
  Tag 9 noch nicht fest, und eine Regenjacke wiegt wenig.
- **Zielort als Bedingung.** Ebenfalls verworfen. Die Reiseart trägt die
  Information bereits — Lenz *ist* ein Ort, und für alles andere reicht die
  Region.

---

## Wenn du die Strategie überarbeitest

Ein paar Erfahrungen aus dem Aufbau:

1. **Ändere die Obergrenze vor dem Faktor.** Der Faktor stimmt meist; das
   Unbehagen kommt fast immer vom langen Ende.
2. **Prüfe jede Änderung an beiden Extremen.** Drei Nächte Hotel und vierzehn
   Nächte Camping. Eine Regel, die nur in der Mitte stimmt, stimmt nicht.
3. **Eine Bedingung weniger ist meist besser.** Jede Bedingung ist eine Stelle,
   an der später etwas fehlt, ohne dass jemand merkt warum. Im Zweifel lieber
   einpacken.
4. **Bedingungen gehören auf den Eintrag, nicht auf das Teil** — ausser der Fall
   ist so klar wie der Rasierer.
5. **Personengebundenes wirklich binden.** Das ist die Bedingung, die am
   meisten spart, wenn jemand nicht mitkommt.

Und nach jeder grösseren Überarbeitung: die Liste einmal für eine echte
bevorstehende Reise erzeugen und durchlesen. Fehler in den Regeln sieht man in
der fertigen Liste sofort und in der Tabelle fast nie.
