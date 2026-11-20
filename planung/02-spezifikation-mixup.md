# Mixup – überarbeitete Spezifikation und Meilensteinplan

Stand: 20.11.2026 · Grundlage: `00-spezifikation-vorlage.md` + Entscheidungen 1–23 in `01-entscheidungen.md`.
Mixup funktioniert im Prinzip wie die iOS-App „Team Shake“, ist aber eine eigene Umsetzung mit eigenem Namen, eigenem Design und eigenem Algorithmus. Keine Inhalte, Grafiken oder Texte des Originals werden übernommen.

---

## 1. Kurzbeschreibung

Die Lehrkraft wählt auf **iPad oder PC** eine Klasse, hakt ab, wer fehlt, stellt Teamanzahl oder -größe ein und tippt **„Losen“**. Nach einer kurzen Animation stehen die Teams groß und gut lesbar an Tafel oder Beamer. Alles auf Deutsch, alles offline, alle Daten bleiben auf dem Gerät.

## 2. Was gegenüber der Vorlage wegfällt (und warum)

| Vorlage | In Mixup | Grund |
|---|---|---|
| Schütteln (DeviceMotion, iOS-Berechtigung) | entfällt | Gerät liegt am Beamer/PC; Berechtigungsdialog und Sensorfehler ohne Mehrwert (E3) |
| „Stärke“ | **„Niveau“ 1–5** | neutraler Begriff; nie in Beamer-/Ergebnisansicht (E4) |
| Getrennte Jungen-/Mädchenteams | entfällt | Nische, verkompliziert Bedienung und Algorithmus (E5) |
| 1–64 Teams | **1–20 Teams** | reicht für reale Klassen, kompaktere Bedienung (E11) |
| Teilen, Kopieren, CSV-Export | entfällt | am Beamer/PC kaum genutzt (E13) |
| Teamnamen/-farben einzeln pflegen | **„Team 1…n“, automatische Farben**, eigene Namen optional | weniger Pflegeaufwand (E10) |
| Eine einzelne HTML-Datei | **mehrere Dateien, ES-Module, ohne Build** | wartbar und testbar, trotzdem ohne Bibliotheken (E9) |
| Hut-/Schüttel-Animation | **ruhige Misch- und Gleit-Animation (~1,5 s)** | passt zum hellen, ruhigen Look (E14) |

## 3. Was neu dazukommt

- **Wiederholungen vermeiden**: letzte 3 Einteilungen je Klasse, neuere zählen stärker, abschaltbar (E15)
- **Person verschieben/tauschen** im Ergebnis per Antippen (iPad) bzw. Klick oder Ziehen (PC) (E6)
- **Reihenfolge auslosen**: Reihenfolge der Teams (z. B. Präsentation) und „alle der Reihe nach“ für die Klasse (E6)
- **Verlauf**: letzte 10 Einteilungen je Klasse, erneut anzeigen oder als neue Grundlage übernehmen (E21)
- **Schnellstart** „Wie letztes Mal losen“ (E20)
- **Zufallsperson** mit Umschalter „ohne Zurücklegen“ / „immer aus allen“, Teams bleiben erhalten (E12)
- **Live-Vorschau** der Teamgrößen schon beim Einstellen (E11)
- **Backup-Erinnerung** (E17)

---

## 4. Ablauf und Bildschirme

### Start (Klassenübersicht)
- Karten der gespeicherten Klassen (Name, Anzahl Personen, zuletzt gelost).
- Je Karte: **„Wie letztes Mal losen“** (springt direkt zu ③ mit den zuletzt genutzten Einstellungen und heutiger Anwesenheit = alle aktiv, außer sie wurde schon geändert).
- „Neue Klasse“, Menü je Klasse: umbenennen, duplizieren, löschen (mit Rückgängig).
- Kopf: Einstellungen, Backup-Hinweis falls fällig.

### ① Klasse & „Wer fehlt heute?“
- Namensliste, große Zeilen (≥ 44 px), Antippen = anwesend/abwesend; Zähler „22 von 25 da“.
- **Namen erfassen** (E16): Einzeln tippen (Enter = nächster) · Liste einfügen (ein Name pro Zeile, Doppelte werden gemeldet) · CSV-/Textdatei (optionale Spalten Niveau, Geschlecht; Trennzeichen `;` oder `,` automatisch).
- **Bearbeiten-Modus**: Name, Niveau (1–5), Geschlecht (m/w/d/–) je Person. Niveau/Geschlecht sind standardmäßig ausgeblendet.
- **Regeln** (E19): Mehrere Personen markieren → „Zusammen“ oder „Getrennt“. Regeln erscheinen als kleine farbige Chips am Namen; Antippen eines Chips zeigt Mitglieder, Umbenennen, Löschen.
- Abwesenheit gilt nur für heute: Beim nächsten Öffnen an einem anderen Tag sind wieder alle anwesend.

### ② Teams einstellen
- Umschalter **Anzahl / Größe**, Stepper 1–20 bzw. 2–n.
- **Live-Vorschau**: „6 Teams · 4 × 4 und 2 × 3 Personen“.
- **Modus** (E5): Zufällig · Ausgeglichen nach Niveau · Gleiches Niveau pro Team. Zusätzlich Schalter „Geschlechter mischen“ (nur aktiv, wenn Geschlechter gepflegt sind).
- Schalter: „Regeln beachten“, „Wiederholungen vermeiden“.
- Hinweise vor dem Losen, z. B. „Zusammen-Gruppe ‚Lea, Tom, Ali, Ben, Mia‘ ist größer als ein Team (4) – Regel wird ignoriert.“
- Großer Knopf **„Losen“**.

### ③ Ergebnis
- Raster farbiger Teamkarten (iPad quer/PC 2–4 Spalten, Hochformat 1–2), Namen alphabetisch oder in Losreihenfolge (Einstellung).
- Leiste: **Neu losen** · **Reihenfolge** · **Zufallsperson** · **Beamer** · **Drucken** · Zurück zu ②.
- **Verschieben/Tauschen**: Person antippen → Ziel-Team oder andere Person antippen; am PC auch Ziehen. Regelverstöße danach als Hinweis.
- **Hinweisleiste** für nicht erfüllte Regeln („Ben und Mia sind beide in Team 3“).
- Niveau und Geschlecht werden hier **nie** angezeigt.

### Beamer-Ansicht
- Vollbild (Fullscreen-API, wo verfügbar), nur Teamkarten, Schriftgröße passt sich automatisch an die Teamanzahl an, keine Bedienelemente außer dezenter „Schließen“-Taste.

### Zufallsperson / Reihenfolge
- Großes Overlay mit dem gezogenen Namen und kurzer Animation.
- Umschalter „ohne Zurücklegen“ (Zähler „noch 17 übrig“, „Zurücksetzen“) / „immer aus allen“; Quelle: alle Anwesenden oder ein bestimmtes Team.
- „Alle der Reihe nach“: nummerierte Liste der Klasse; „Teams der Reihe nach“: nummerierte Teamliste.

### Einstellungen
- Backup sichern/laden, Erinnerung an/aus · Teamnamen optional überschreiben · Namensreihenfolge im Ergebnis · Niveau/Geschlecht in Liste anzeigen · Animation an/aus · Datenschutzhinweis · Version, Lizenzen (Inter).

### Tastenkürzel (PC)
`Leertaste` neu losen · `B` Beamer · `Z` Zufallsperson · `R` Reihenfolge · `Strg+P` Drucken · `Esc` schließen · `1/2/3` Schritte.

---

## 5. Teambildung – überarbeiteter Algorithmus

### 5.1 Kritik am Entwurf der Vorlage
1. **Tausch nur gleich großer Blöcke** bleibt hängen, wenn fast alle Blöcke Einzelpersonen sind und die Zusammen-Blöcke verschieden groß sind → zusätzlich **Verschieben** einzelner Personen zwischen Teams zulassen, sofern Zielgrößen eingehalten bleiben.
2. **Abnahme „Unterschied der Stärkesummen ≤ höchste Einzelstärke“** ist bei ungleich großen Teams (z. B. 4 und 5) strukturell nicht erreichbar → Vergleich über den **Durchschnitt je Team**.
3. **Geschlechter „geringster Anteil“** führt bei kleinen Teams zu Sprüngen → **Zielquoten** je Team (proportional zur Teamgröße) und Abweichung davon zählen.
4. **„Gleiches Niveau pro Team“ per Sortieren und Schneiden** bricht Zusammen-Regeln → stattdessen eigene Kostenfunktion (Streuung **innerhalb** der Teams minimieren).
5. **Größe-Modus**: k = aufrunden(n / Größe) erzeugt bei n = 25, Größe 4 sieben Teams (4,4,4,4,3,3,3). Entschieden (E25): **abrunden** → sechs Teams (4,4,4,4,4,5).

### 5.2 Ablauf
1. Anwesende sammeln, k und Zielgrößen bestimmen (Größen unterscheiden sich max. um 1; welche Teams größer sind, entscheidet der Zufall).
2. Zusammen-Regeln per Union-Find zu **Blöcken** verschmelzen; zu große Blöcke auflösen und melden.
3. Blöcke mischen (Fisher-Yates mit `crypto.getRandomValues`).
4. **Gierige Startverteilung**: je Block das Team mit den niedrigsten Zusatzkosten (Gleichstand → Zufall).
5. **Verbessern** (außer Modus „Zufällig“ ohne Regeln): bis ca. 2000 Versuche Tauschen/Verschieben, angenommen nur bei sinkenden Kosten; Abbruch nach 300 Versuchen ohne Verbesserung.
6. Alle Regeln prüfen, Verstöße als Hinweise zurückgeben.

### 5.3 Kostenfunktion (Gewichte im Test justierbar)
```
Kosten = 1000 · Getrennt-Verstöße
       +   50 · Wiederholungen (Paare aus letzter Einteilung ×3, vorletzter ×2, drittletzter ×1)
       +   10 · Abweichung von Geschlechter-Zielquoten
       +    1 · Varianz der Niveau-Durchschnitte zwischen Teams      (Modus „ausgeglichen“)
       +    1 · Summe der Niveau-Varianzen innerhalb der Teams        (Modus „gleiches Niveau“)
```
Größen sind keine Kosten, sondern feste Nebenbedingung. Im Modus „Zufällig“ zählen nur Getrennt-Regeln und Wiederholungen.

---

## 6. Daten

- Ein `localStorage`-Schlüssel `mixup:v1` (Datenmenge klein; IndexedDB unnötig), Schema mit `version` und Migrationsfunktion.
- Struktur wie Vorlage Abschnitt 3, ergänzt um: `history[]` je Klasse (max. 10, je Eintrag Datum, Einstellungen, Teams als ID-Listen), `draw` (Zufallsperson-Zustand), `absentToday` mit Datum, `lastBackupAt`, `options.avoidRepeats`.
- **Backup**: eine `.json`-Datei „Mixup-Sicherung JJJJ-MM-TT.json“; Import prüft Version und fragt „ersetzen oder zusammenführen“.
- Erinnerung: nach Änderungen an Listen/Regeln, wenn das letzte Backup > 28 Tage alt ist, dezentes Banner auf dem Start.

## 7. Design

- **Hell, ruhig, viel Weißraum** (E7), Produktivitäts-App-Anmutung; Schrift **Inter** (lokal, woff2, OFL) (E22).
- Design-Tokens als CSS-Variablen: neutrale Grautöne, **eine** Akzentfarbe für Bedienung, 20 Teamfarben (zart getönte Kartenflächen + kräftiger Rand/Kopf), Kontrast nach WCAG AA automatisch geprüft.
- Weiche Schatten, Radius 12–16 px, Touch-Ziele ≥ 44 px, sichtbarer Tastaturfokus.
- Dunkelmodus vorerst **nicht** (E7: hell gesetzt) – Tokens so anlegen, dass er später ergänzbar ist.
- `prefers-reduced-motion` schaltet Animationen ab.
- Druck: A4, eine Seite, Teamkarten in Graustufen-tauglichen Rahmen, Datum + Klassenname im Kopf.

## 8. Technik und Struktur

```
index.html, manifest.webmanifest, sw.js
css/      tokens.css, base.css, components.css, screens.css, print.css
js/       app.js (Router der Schritte), state.js, storage.js, backup.js,
          teams/ (algorithm.js, cost.js, sizes.js, unionfind.js, random.js),
          ui/   (start.js, step1-klasse.js, step2-einstellen.js, step3-ergebnis.js,
                 beamer.js, draw.js, settings.js, dialogs.js, toast.js)
fonts/    Inter (woff2) + OFL.txt
icons/    192, 512 (maskable), 180 (apple-touch)
tests/    *.test.mjs (node --test, Algorithmus + Speicher + Import)
.claude/launch.json  (statischer Server, Port 4250)
```
- Keine Bibliotheken, kein CDN, kein Build. Service Worker cacht die App-Shell, Versionsnummer für Updates, „Neue Version verfügbar – neu laden“-Hinweis.
- Auslieferung über **GitHub Pages** aus `main` (E8). iOS-Installationshinweis („Teilen → Zum Home-Bildschirm“).

## 9. Meilensteine

| M | Inhalt | Fertig, wenn … |
|---|---|---|
| **M0** | Gerüst: Ordnerstruktur, Design-Tokens, Inter, leere Schritte mit Router, Manifest, Icons, Pages aktiv, launch.json | Seite über Pages erreichbar, Schritte navigierbar |
| **M1** | Algorithmus als reines Modul + Tests (Größen, Union-Find, Kosten, Verbesserung, Hinweise) | Node-Tests grün, Abnahmekriterien 3–5 als Tests |
| **M2** | Daten + Start + ① (Klassen, drei Erfassungswege, Anwesenheit, Niveau/Geschlecht, Regeln markieren) | Klasse anlegen/füllen/regeln, bleibt nach Neustart erhalten |
| **M3** | ② + ③ (Einstellungen, Vorschau, Losen-Animation, Ergebnis, Verschieben/Tauschen, Hinweise) | Kompletter Ablauf am PC und iPad bedienbar |
| **M4** | Beamer-Ansicht, Drucken, Zufallsperson, Reihenfolge, Tastenkürzel | Unterrichtstauglich am Beamer |
| **M5** | Verlauf, Wiederholungen vermeiden, Schnellstart, Backup + Erinnerung | Zweite Einteilung meidet erkennbar alte Paare; Backup verlustfrei |
| **M6** | PWA-Feinschliff: Service Worker, Offline, Update-Hinweis, Barrierefreiheit-Prüfung, iPad-Echttest | Abnahmekriterien 1–8 erfüllt |

Nach jedem Meilenstein: Tests, Browser-Prüfung, Commit und Push auf `main`.

## 10. Abnahmekriterien (überarbeitet)

1. Läuft nach Installation offline auf iPad und PC (Chrome, Edge, Safari).
2. „Losen“ funktioniert per Knopf und Leertaste; Ergebnis < 300 ms Rechenzeit bei 35 Personen.
3. Teamgrößen unterscheiden sich um max. 1 (Ausnahme: aufgelöste Zusammen-Blöcke, mit Hinweis).
4. Zusammen-Regeln immer erfüllt; Getrennt-Regeln erfüllt oder Verstoß namentlich gemeldet.
5. Ausgeglichen: Niveau-Durchschnitte der Teams weichen im Test (24 Personen, 4 Teams, Zufallsniveaus) um höchstens 0,5 voneinander ab.
6. Wiederholungen vermeiden: bei 24 Personen / 6 Teams im Mittel deutlich weniger alte Paare als rein zufällig (Test über 200 Läufe).
7. Klassen, Regeln, Einstellungen, Verlauf bleiben nach Neustart erhalten; Backup-Export/-Import verlustfrei.
8. Niveau und Geschlecht erscheinen nie in Ergebnis, Beamer-Ansicht oder Druck.

## 11. Offene Fragen zur Freigabe

- ~~**O1 Größe-Modus**~~ → entschieden (E25): lieber eine Person mehr, k = abrunden(n / Größe), mindestens 1.
- ~~**O2 Repo-Name**~~ → entschieden (E26): `mixup`, Adresse `https://lukasderewaelder.github.io/mixup/`.
- **O3 Markenprüfung:** „Mixup“ ist ein verbreitetes Wort; für eine nicht kommerzielle Schul-App unkritisch, vor einer Veröffentlichung im App Store aber prüfen.
