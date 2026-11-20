# Entscheidungen

Wird nach jeder Fragenrunde fortgeschrieben.

| # | Thema | Entscheidung | Runde |
|---|-------|--------------|-------|
| 1 | App-Name | **Mixup** (Arbeitsname „teamlos“ nur noch für Ordner/Repo, Umbenennung später) | 2 |
| 2 | Einsatz | Lehrkraft bedient auf **iPad oder PC**, Ergebnis an Tafel/Beamer. Kein Schüler-Gerät, kein Netzwerk | 1 |
| 3 | Schütteln | **Entfällt komplett** (kein Bewegungssensor, keine iOS-Berechtigung). Auslösen nur per Taste/Animation | 1 |
| 4 | Personenmerkmale | „Stärke“ wird neutral **„Niveau“ 1–5**; Geschlecht bleibt optional; beides ausblendbar, **nie** in Beamer-/Ergebnisansicht sichtbar, nur lokal gespeichert | 1 |
| 5 | Modi | Bleiben: **Zufällig**, **Ausgeglichen nach Niveau**, **Geschlechter gleichmäßig mischen**, **Gleiches Niveau pro Team** (Differenzierung). **Entfällt:** getrennte Jungen-/Mädchenteams | 2 |
| 6 | Extras | Rein: **Wiederholungen vermeiden**, **Person per Antippen verschieben/tauschen**, **Reihenfolge auslosen**, **Verlauf der letzten Ergebnisse** | 2 |
| 7 | Look | **Hell, ruhig, viel Weißraum**; Produktivitäts-App-Anmutung; deutlich moderner und eingängiger als das Original | 2 |
| 8 | Hosting | Repo **öffentlich**, Auslieferung über **GitHub Pages** (HTTPS, installierbar). Keine Schülerdaten im Repo | 3 |
| 9 | Technik | **Mehrere Dateien, reines JavaScript (ES-Module) + CSS, ohne Build**, ohne Framework/Bibliotheken/CDN; Algorithmus mit Node-Tests | 3 |
| 10 | Teamnamen/-farben | Standard **„Team 1…n“ mit automatischen Farben** (Kontrast geprüft); eigene Namen nur optional | 3 |
| 11 | Regeln & Teamanzahl | **Zusammen = fest**, **Getrennt = bestmöglich**, Verstöße namentlich als Hinweis; **1–20 Teams**, Wahl nach Anzahl oder Größe mit **Live-Vorschau** („5 Teams à 5–6“) | 3 |
| 12 | Zufallsperson | **Umschaltbar**: „ohne Zurücklegen“ (Zähler „noch x übrig“, Zurücksetzen) oder „immer aus allen“; aktuelle Teams bleiben erhalten | 4 |
| 13 | Ausgabe | Nur **Vollbild-/Beamer-Ansicht** und **Drucken/PDF** (nach Teams sortiert). **Entfällt:** Text kopieren, CSV, Teilen-Menü | 4 |
| 14 | Losen-Animation | **Kurz und elegant (~1,5 s)**: Namen mischen sich und gleiten in Teamkarten; „Reduzierte Bewegung“ wird respektiert | 4 |
| 15 | Wiederholungen vermeiden | **Letzte 3 Einteilungen je Liste**, neuere zählen stärker, abschaltbar; Zusammen-Regeln haben Vorrang | 4 |
| 16 | Namen erfassen | Alle drei Wege: **Liste einfügen** (ein Name pro Zeile, Doppelte erkennen), **einzeln tippen** (Enter = nächster), **CSV-/Textdatei laden** (optional Spalten Niveau/Geschlecht) | 5 |
| 17 | Sicherung | **Backup-Datei** (alle Listen, Regeln, Verlauf) sichern/laden + **dezente Erinnerung** nach Änderungen, spätestens alle 4 Wochen | 5 |
| 18 | Layout | **Schritt für Schritt** (eigene Bildschirme statt Zwei-Spalten-Ansicht) | 5 |
| 19 | Regeln anlegen | **Personen markieren → „Zusammen“/„Getrennt“**; Regeln als farbige Chips am Namen, Gesamtübersicht in den Einstellungen | 5 |
| 20 | Schritte | **3 Schritte + Schnellstart**: ① Klasse & „Wer fehlt heute?“ → ② Teams einstellen → ③ Ergebnis; „Wie letztes Mal losen“ springt direkt zu ③ | 6 |
| 21 | Verlauf | **Letzte 10 Einteilungen je Klasse** (davon zählen 3 für „Wiederholungen vermeiden“) | 6 |
| 22 | Schrift | **Klar & sachlich**: moderne Grotesk (Inter, mitgeliefert, OFL-Lizenz), dezente Rundungen | 6 |
| 23 | Weiteres Vorgehen | Fragenrunden beendet → überarbeitete Spezifikation + Meilensteinplan in `02-spezifikation-mixup.md` | 6 |

## Folgen

- Spec-Abschnitt 7 (Schütteln) und Teil von 2.1 fallen weg; Abschnitt 8 braucht HTTPS nur noch für Service Worker/Installation.
- PC-Bedienung wird gleichrangig zu iPad: Tastatur, Maus, Tastenkürzel zusätzlich zu Touch (44-px-Ziele).
