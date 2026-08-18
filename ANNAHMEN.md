# Annahmen der Packliste

Dieses Dokument ist die Grundlage. **Die Mengenregeln in der Tabelle sind daraus
gerechnet, nicht gewählt.** Wer eine Menge ändern will, ändert hier eine Annahme;
die Regel folgt. Alle Annahmen sind von Christoph bestätigt, erhoben am 18.08.2026.

## Die Rechnung

    Tragedauer t      Nächte, die ein Stück deckt        →  Faktor   = 1 / t
    Waschrhythmus w   Nächte bis zur nächsten Wäsche     →  Max      = aufrunden(w / t) + R
    Reserve R         Stück über die Rechnung hinaus     →  Zuschlag = R, nur wenn t ≤ 2

    Menge(n) = min( aufrunden(Faktor × n) + Zuschlag , Max ),  mindestens 1

Die Obergrenze ist **der Waschrhythmus**, nicht ein Bauchgefühl fürs lange Ende.
Vorher trugen fünf täglich gewechselte Kleidungsstücke fünf verschiedene
Waschannahmen — von »nie« bis »jede Nacht« —, ohne dass eine davon irgendwo stand.

## A1 · Waschen unterwegs — **einmal, etwa Tag 7**

Bei zwei Wochen Basislager wird ungefähr in der Mitte gewaschen, Waschsalon oder
Campingplatz-Maschine. → **w = 7**

## A2 · Waschen in Lenz — **wöchentlich**

Die Waschmaschine steht vor Ort, wird aber nicht öfter benutzt als daheim. → **w = 7**

*Folge:* A1 = A2, also enthält die Spalte **»Max mit Waschmaschine« überall
denselben Wert wie »Max«** und bleibt deshalb leer. Wird der Rhythmus in Lenz
später kürzer angesetzt, füllt sie sich wieder. Gemessen kostet die Wahl: bei
14 Nächten Lenz 251 Kleidungsstücke, gegenüber 176 bei einem Rhythmus von 3 Nächten.

## A3 · Reserve — **1 Stück, bei den Kindern 2 — nur bei Haut-nahem**

Die Reserve steckt **immer** in der Obergrenze. In den **Zuschlag** kommt sie nur
bei Sachen, die täglich oder jeden zweiten Tag gewechselt werden (t ≤ 2). Grund:
bei einem Stück, das eine Woche hält, verdoppelt eine Reserve von 1 die Menge —
zwei Pyjamas für ein Hotel-Wochenende.

## A4 · Tragedauer je Gruppe

| Gruppe | t | Faktor | Zuschlag Erw. / Kind | Max Erw. / Kind | 3 N | 14 N |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| täglich frisch — Unterhosen, Socken, T-Shirt, BHs | 1 | 1 | 1 / 2 | 8 / 9 | 4 / 5 | 8 / 9 |
| jeden zweiten Tag — Unterliibli | 2 | 0.5 | 1 / 2 | 5 / 6 | 3 / 4 | 5 / 6 |
| Oberteil — Hoodie, Jäggli, Trainerhose, Thermo, Pullover Kinder | 4 | 0.25 | 0 / 0 | 3 / 4 | 1 | 3 / 4 |
| Beinkleid Erwachsene — Hose lang/kurz, Sportshorts | 5 | 0.2 | 0 | 3 | 1 | 3 |
| Beinkleid Kinder — Hose, Leggings | 3 | 0.35 | 0 | 5 | 2 | 5 |
| eine Woche — Pyjama, Pischi | 7 | 0.15 | 0 / 0 | 2 / 3 | 1 | 2 / 3 |
| Einzelstück — was nicht schmutzig wird | — | fest 1 | — | — | 1 | 1 |

Zum **Beinkleid Kinder**: mit der Erwachsenen-Tragedauer von 5 Nächten ergäbe die
Rechnung *eine* Hose für drei Nächte. Christoph wollte 2 behalten. Kinderhosen
werden schneller dreckig — mit t = 3 kommt genau 2 / 5 heraus. Das ist die einzige
Zahl in A4, die als Vorschlag von Claude stammt und nicht ausdrücklich bestätigt ist.

## A5 · Parallele Einträge dürfen sich nicht addieren

Zwei Einträge, die dasselbe Bedürfnis decken, teilen die Jahreszeiten unter sich
auf, statt beide zu erscheinen. Umgesetzt bei `Socken kurz` / `Socken lang`,
`Pyjama kurz` / `Pyjama lang`, `Pischi kurz` / `Pischi lang`.

*Noch nicht umgesetzt:* Deboras sechs feste Beinkleider (Jeans lang/kurz,
Stoffhose lang/kurz, Leggings, Röckli) stehen neben `Hose lang` und `Hose kurz`
und addieren sich weiterhin.

## Was gemessen herauskommt

Über `wantedItems()` der App gerechnet, nur Kleidung, alle vier Personen:

| Szenario | heute | neu |
| --- | ---: | ---: |
| Hotel 3 Nächte Sommer | 157 | **146** |
| Hotel 3 Nächte Winter | 161 | **155** |
| Basislager 7 Nächte | 218 | 226 |
| Basislager 14 Nächte | 292 | **250** |
| Lenz 3 Nächte | 161 | **155** |
| Lenz 14 Nächte | 216 | 251 |
| Hotel 14 Nächte Fernreise | 292 | **250** |

Pro Erwachsenem bei 14 Nächten Camper: 74 → 58 Stück. Die längeren Aufenthalte in
Lenz und bei 7 Nächten werden schwerer, weil heute 19 Kleidungseinträge auf einer
festen Stückzahl stehen und mit der Dauer überhaupt nicht wachsen.

## Offen, weil Gewohnheitsfrage

- `Skisocken` (fest 2), `Strumpfhose / Thermoleggings` (fest 2),
  `Gesichtslumpen` (fest 2, von Christoph gesetzt) — bleiben unverändert.
- Deboras sechs Einzel-Beinkleider, siehe A5.

## Noch nicht erhoben

- Waschrhythmus für **Velokleidung** — trocknet über Nacht, eigener Rhythmus
- **Verbrauchsmaterial**: Windeln (heute 5 pro Nacht, ohne Obergrenze → 75 bei
  14 Nächten), Feuchttücher, Toilettenpapier
- Was am Ort **schon vorhanden** ist, je Reiseart — Grundlage der Bedingungen
