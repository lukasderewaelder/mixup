# Mixup

Teams per Zufall für den Unterricht: Klasse wählen, abhaken wer fehlt, „Teams losen“ tippen – faire Teams groß an Tafel oder Beamer.
Läuft als PWA auf iPad und PC, komplett offline, komplett auf Deutsch, ohne Konten und ohne Cloud. Alle Namen bleiben auf dem Gerät.

**App:** https://lukasderewaelder.github.io/mixup/
**Stand:** Version 1.1.0 – Hauptbildschirm wie im Original, Niveau −5 bis +5, vier Arten, Gruppen je Klasse gestaltbar; 70 Tests. Offen: Test auf einem echten iPad.

## Was Mixup kann

- **Klassen** anlegen, umbenennen, duplizieren, löschen (mit Rückgängig); Beispielklasse zum Ausprobieren
- **Ein Hauptbildschirm** je Klasse: links die Namen, rechts Optionen, „Teams losen“ und die Teams (schmale Bildschirme: Umschalter „Namen | Teams“)
- **Namen** eintippen, als Liste einfügen (Nummern/Aufzählungszeichen werden entfernt) oder aus CSV/Text laden (Vorname/Nachname, Niveau, Geschlecht werden erkannt); doppelte Namen werden gemeldet
- **Niveau −5 bis +5** per Schieberegler (Standard 0); **Wer fehlt heute?** – Antippen setzt abwesend, gilt nur für den Tag
- **Regeln**: Personen markieren → „Zusammen“ (immer im selben Team) oder „Getrennt“ (möglichst verschiedene Teams); einzeln oder gesamt abschaltbar
- **Arten**: Zufällig · **Gleich stark** (gleiche Niveau-Summe – wenn Teams gegeneinander antreten) · **Gemischt** (gleicher Durchschnitt – Gruppenarbeit) · Gleiches Niveau; dazu eingeklappt: Geschlechter mischen, Regeln beachten, Wiederholungen vermeiden
- **Gruppen gestalten** je Klasse: Team, Gruppe, Tisch, Station, Mannschaft oder eigenes Wort; Zählung 1 2 3, A B C oder Farbnamen; Name und Farbe direkt auf der Karte antippen
- **Klassenansicht** nach dem Losen: nur die Teams, Schrift automatisch so groß wie möglich, Neu losen, Zufallsperson, Reihenfolge, Tauschen per Antippen – Niveau, Regeln und Optionen sind ausgeblendet
- **Verlauf** der letzten 10 Einteilungen, **Drucken/PDF**, **Zufallsperson** (jede Person einmal oder immer aus allen), **Reihenfolge** auslosen, **Schnellstart** „Wie letztes Mal losen“
- **Sicherung** als JSON-Datei (ersetzen oder zusammenführen) mit dezenter Erinnerung
- Tastenkürzel: `Leertaste` losen, `K` Klassenansicht an/aus, `Z` Zufallsperson, `R` Reihenfolge, `V` Verlauf, `Esc`

Getestet in Chromium (Desktop-, iPad-hochkant- und Handybreite). Benötigt einen aktuellen Browser (Safari/iPadOS ab 16.4, Chrome/Edge ab 111).

## Entwicklung

```bash
node tools/serve.mjs 4250     # Entwicklungsserver ohne Cache: http://localhost:4250/
npm test                      # Tests (node --test)
node tools/precache.mjs       # Dateiliste im Service Worker aktualisieren – vor jedem Commit
python tools/icons.py         # App-Icons neu erzeugen (braucht Pillow)
```

Keine Abhängigkeiten, kein Build. Der Service Worker wird auf `localhost` nicht registriert. Nach einem Deploy zeigt die installierte App „Eine neue Version von Mixup ist da – Neu laden“.

### Aufbau

```
js/teams/   Teambildung (rein, getestet): algorithm.js, cost.js, sizes.js, blocks.js, random.js, colors.js
js/model.js Datenmodell (rein, getestet) · js/import.js Namen-Import · js/store.js Speicher
js/backup.js Sicherung · js/actions.js Losen, Beispielklasse · js/app.js Router, Kürzel, Service Worker
js/labels.js Gruppen-Bezeichnung und -Farbe (rein, getestet)
js/ui/      Bildschirme: start, main (Hauptbildschirm mit names-panel, options-panel, results-panel), settings;
            group-style, fit (Schriftanpassung), draw (Zufallsperson/Reihenfolge), team-card, dialogs, banners, dom, icons
css/        tokens (Farben, Teamfarben, Schrift), base, components, screens, print
```

## Planung

- [`planung/02-spezifikation-mixup.md`](planung/02-spezifikation-mixup.md) – Spezifikation, Algorithmus, Meilensteine, Umsetzungsstand
- [`planung/01-entscheidungen.md`](planung/01-entscheidungen.md) – alle Entscheidungen
- [`planung/00-spezifikation-vorlage.md`](planung/00-spezifikation-vorlage.md) – Ausgangs-Spezifikation (Vorlage)

## Lizenzen

Schrift Inter © The Inter Project Authors, SIL Open Font License 1.1 (`fonts/OFL.txt`).
Funktionsprinzip angelehnt an die iOS-App „Team Shake“; Name, Design, Texte und Algorithmus sind eigenständig.
