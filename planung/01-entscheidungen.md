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
| 24 | Plan-Freigabe | Plan freigegeben (20.11.2026), Umsetzung ab M0 | 7 |
| 25 | O1 Größe-Modus | **Lieber eine Person mehr**: k = abrunden(n / Größe), z. B. 25 Personen à 4 → 6 Teams (eins mit 5) | 7 |
| 26 | O2 Name | Repo, Ordner und Pages-Adresse heißen **mixup** | 7 |
| 27 | Niveau-Skala | **−5 bis +5**, Standard 0, Begriff bleibt „Niveau“; Eingabe per **Schieberegler**; alte Werte 1–5 → −4 … +4 (ersetzt E4 teilweise) | 8 |
| 28 | Arten | Vier Arten: **Zufällig**, **Gleich stark** (gleiche Summe – Wettkampf), **Gemischt** (gleicher Durchschnitt – Gruppenarbeit, bisher „Ausgeglichen“), **Gleiches Niveau** (ersetzt E5) | 8 |
| 29 | Gruppen-Gestaltung gilt | **je Klasse** (ersetzt E10) | 8 |
| 30 | Vorlagen | **Wort** (Team, Gruppe, Tisch, Station, Mannschaft, eigenes) + **Zählung** (1 2 3 / A B C / **Farbname**) im Dialog **„Gruppen gestalten“** | 8 |
| 31 | Einzelne Anpassung | **Direkt auf der Teamkarte**: Name antippen → umbenennen, Zeichen antippen → Farbe aus 20 geprüften Farben | 8 |
| 32 | Beschriftung | **Großes Zeichen + eigener Name** („A Füchse“); bei Farbnamen großer Farbpunkt | 8 |
| 33 | Aufbau | **Ein Hauptbildschirm wie im Original** statt drei Schritten; Beamer-Vollbild entfällt (ersetzt E13, E18, E20) | 8 |
| 34 | Klassenansicht | Nach dem Losen **automatisch**; sichtbar: Klassenname, Neu losen, Zufallsperson, Reihenfolge, Tauschen per Antippen; Schrift passt sich an | 8 |
| 35 | Schmale Bildschirme | Umschalter **„Namen | Teams“**, nach dem Losen automatisch „Teams“ | 8 |
| 36 | Weitere Optionen | Geschlechter, Regeln, Wiederholungen **eingeklappt** unter „Weitere Optionen“ mit Kurzzeile | 8 |
| 37 | Neu losen | Innerhalb von 10 Minuten nach einem unveränderten Ergebnis ersetzt „Neu losen“ den letzten Versuch (mit Rückgängig), sonst neuer Verlaufseintrag | 8 |
| 38 | Designs | **Klar** (bisher, Standard) + umschaltbar **Poster**, **Heft**, **Akzent**; gilt für das ganze Gerät | 9 |
| 39 | Schrift je Design | Klar: Inter · Poster: Bricolage Grotesque · Heft: Schibsted Grotesk + Caveat (nur Gruppenzeichen/-titel) · Akzent: Familjen Grotesk | 9 |
| 40 | Asymmetrie | In Tasten, Feldern, Karten: Poster harter versetzter Schatten, Heft diagonale Rundung, Akzent eine große Ecke + dicke Unterkante | 9 |
| 41 | Teamkarten je Design | Poster: weiß, Tintenrand, Schatten in Teamfarbe, schräger Sticker · Heft: Klebezettel, leicht gedreht · Akzent: vollfarbiger Kopf | 9 |
| 42 | Rest-Regel | Bei „Personen pro Team“: Automatisch · eine Person mehr · Rest als eigenes Team · eine Person weniger | 9 |
| 43 | Rest-Regel Ort | Unter „Weitere Optionen“, je Klasse gemerkt; nur bei „Personen pro Team“ | 9 |
| 44 | Klassenansicht | Gruppentitel brechen um statt abgeschnitten zu werden; Zeilen nie kleiner als ihr Inhalt | 9 |
| 45 | Prüfung | Web Interface Guidelines angewendet, Ergebnis in `04-pruefung-1.2.md` | 9 |
| 46 | Personen-Einstellungen | Versteckt wie im Original: **›** je Name öffnet ein Blatt mit Name, „Fehlt heute“, Niveau-Regler, Geschlecht, Regeln der Person, Entfernen; im Blatt zur vorherigen/nächsten Person blättern (ersetzt „Bearbeiten“-Liste) | 10 |
| 47 | Namensliste | **Einspaltig**, nur der Name; Abwesende durchgestrichen; eigener Schalter ⊘ rechts neben dem Namen; Niveau/Geschlecht/Regel-Chips nie in der Liste (Einstellungen „Niveau/Geschlecht zeigen“ entfallen) | 10 |
| 48 | Lage der Bedienelemente | **Alles oben** in einer Leiste unter dem Klassennamen (klebt beim Scrollen); untere Losen-Leiste entfällt | 10 |
| 49 | Reihenfolge der Leiste | Links → rechts wie der Ablauf: **Namen + · Regeln** │ **− Zahl + · Optionen** │ **Zufallsperson · Mehr** │ **Losen** (ganz rechts) | 10 |
| 50 | Optionen | Blatt **„Optionen“**: Aufteilen nach, Rest-Regel, Art der Teams, Gruppen gestalten, Geschlechter/Regeln/Wiederholungen; Zusammenfassung als Statuszeile unter der Leiste | 10 |
| 51 | Mehr | Menü mit Klassenansicht (K), Reihenfolge (R), Verlauf (V), Drucken | 10 |
| 52 | Regeln anlegen | Taste **„Regeln“** öffnet die Regelliste; „Neue Regel“ (oder „Neue Regel mit …“ im Personenblatt) schaltet die Namensliste in den Auswahlmodus, die Leiste zeigt dann Abbrechen · Anzahl · Getrennt · **Zusammen** | 10 |
| 53 | Tastenregeln | Jede Taste Symbol + Wort; genau **eine Haupttaste je Ansicht, immer rechts**; Zurück/Abbrechen immer links; iPad quer: Zufallsperson/Mehr nur Symbol, iPad hochkant/Telefon: alle Nebentasten nur Symbol (Wort als Tooltip/Screenreader-Text); Telefon: zwei Zeilen | 10 |
| 54 | Klassenansicht-Leiste | **Bearbeiten** (links) · Klassenname · Zufallsperson · Reihenfolge · **Neu losen** (rechts) | 10 |
| 55 | Pop-up-Fenster | Größer (normal 640 px, breit 940 px, bis 94 % der Höhe); Fehler behoben, durch den Safari das „Mehr“-Fenster auf Kopfhöhe zusammenschob | 11 |
| 56 | Nie scrollen (iPad) | Ab 700 × 600 px passt der Hauptbildschirm auf einen Bildschirm: Namensliste in so vielen Spalten wie nötig (Zeilen ≥ 48 px), Teamkarten mit automatisch passender Schrift; iPad hochkant über die Reiter „Namen | Teams“; Telefone scrollen weiter | 11 |
| 57 | Regeln | Keine eigene Taste mehr: Blatt „Optionen“ hat die Reiter **Teams | Regeln**; Neue Regel unten im Reiter Regeln | 11 |
| 58 | Reihenfolge | Entfällt komplett (Taste, Menü, Kürzel R) | 11 |
| 59 | Teams / pro Team | Antippen von Zahl + Einheit in der Leiste schaltet um (Symbol ⇄ an der Einheit); „Aufteilen nach“ fällt aus dem Optionen-Blatt | 11 |
| 60 | Animation | „Mischen und Austeilen“: Namen sammeln sich als Stapel, der Stapel wird gemischt, die Namen werden reihum wie Karten an die Teams ausgeteilt; Karte hüpft beim Landen; ca. 2 s, Antippen/Taste überspringt; bei „Bewegung reduzieren“ aus | 11 |
| 61 | Drag-and-Drop | Namen in Ergebnis und Klassenansicht ziehen: der Name hebt sich in Teamfarbe ab und wandert mit, sein Platz bleibt gestrichelt; auf einen Namen = tauschen, auf eine Karte = verschieben (mit Rückgängig); Antippen bleibt zusätzlich; iPad/PC sofort, Telefon nach kurzem Halten | 11 |

## Folgen

- Spec-Abschnitt 7 (Schütteln) und Teil von 2.1 fallen weg; Abschnitt 8 braucht HTTPS nur noch für Service Worker/Installation.
- PC-Bedienung wird gleichrangig zu iPad: Tastatur, Maus, Tastenkürzel zusätzlich zu Touch (44-px-Ziele).
