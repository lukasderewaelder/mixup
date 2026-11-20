# Mixup

Teams per Zufall für den Unterricht: Klasse wählen, abhaken wer fehlt, „Teams losen“ tippen – faire Teams groß an Tafel oder Beamer.
Läuft als PWA auf iPad und PC, komplett offline, komplett auf Deutsch, ohne Konten und ohne Cloud. Alle Namen bleiben auf dem Gerät.

**App:** https://lukasderewaelder.github.io/mixup/
**Stand:** Version 1.0.0 – alle Meilensteine M0–M6 umgesetzt, 58 Tests. Offen: Test auf einem echten iPad.

## Was Mixup kann

- **Klassen** anlegen, umbenennen, duplizieren, löschen (mit Rückgängig); Beispielklasse zum Ausprobieren
- **Namen** eintippen, als Liste einfügen (Nummern/Aufzählungszeichen werden entfernt) oder aus CSV/Text laden (Vorname/Nachname, Niveau, Geschlecht werden erkannt); doppelte Namen werden gemeldet
- **Wer fehlt heute?** – Antippen setzt abwesend, gilt nur für den Tag
- **Regeln**: Personen markieren → „Zusammen“ (immer im selben Team) oder „Getrennt“ (möglichst verschiedene Teams); einzeln oder gesamt abschaltbar
- **Teams einstellen**: Anzahl (1–20) oder Personen pro Team, Live-Vorschau; Art zufällig, ausgeglichen nach Niveau oder gleiches Niveau; Geschlechter mischen; Wiederholungen vermeiden (letzte 3 Einteilungen)
- **Ergebnis** mit kurzer Misch-Animation, Person antippen zum Tauschen/Verschieben, Regel-Hinweise mit Namen, Neu losen (mit Rückgängig), Verlauf der letzten 10 Einteilungen
- **Beamer-Ansicht** im Vollbild mit automatisch größter Schrift, **Drucken/PDF**, **Zufallsperson** (jede Person einmal oder immer aus allen), **Reihenfolge** auslosen
- **Schnellstart** „Wie letztes Mal losen“ auf der Klassenkarte
- **Sicherung** als JSON-Datei (ersetzen oder zusammenführen) mit dezenter Erinnerung
- Niveau und Geschlecht erscheinen **nie** in Ergebnis, Beamer oder Druck
- Tastenkürzel: `1/2/3` Schritte, `Leertaste` losen, `B` Beamer, `Z` Zufallsperson, `R` Reihenfolge, `V` Verlauf, `Esc`

Getestet in Chromium (Desktop- und Handybreite). Benötigt einen aktuellen Browser (Safari/iPadOS ab 16.4, Chrome/Edge ab 111).

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
js/ui/      Bildschirme (start, step1-klasse, step2-einstellen, step3-ergebnis, settings),
            beamer, draw (Zufallsperson/Reihenfolge), team-card, dialogs, banners, dom, icons
css/        tokens (Farben, Teamfarben, Schrift), base, components, screens, print
```

## Planung

- [`planung/02-spezifikation-mixup.md`](planung/02-spezifikation-mixup.md) – Spezifikation, Algorithmus, Meilensteine, Umsetzungsstand
- [`planung/01-entscheidungen.md`](planung/01-entscheidungen.md) – alle Entscheidungen
- [`planung/00-spezifikation-vorlage.md`](planung/00-spezifikation-vorlage.md) – Ausgangs-Spezifikation (Vorlage)

## Lizenzen

Schrift Inter © The Inter Project Authors, SIL Open Font License 1.1 (`fonts/OFL.txt`).
Funktionsprinzip angelehnt an die iOS-App „Team Shake“; Name, Design, Texte und Algorithmus sind eigenständig.
