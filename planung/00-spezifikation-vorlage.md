# TeamShake-PWA – Spezifikation für eine eigenständige HTML-Datei

Ziel: Eine einzelne HTML-Datei (plus kleines Manifest und Service Worker), die als PWA auf iPhone, iPad und Android läuft, offline funktioniert und das Prinzip der iOS-App „Team Shake" (Rhine-o Enterprises LLC) nachbaut: Namen eingeben, Gerät schütteln, Teams erhalten.

Hinweis zur Quellenlage: Funktionen stammen aus App-Store-Beschreibung und Herstellerseite. Der Original-Algorithmus ist nicht veröffentlicht. Abschnitt 5 ist ein **eigener Entwurf**, keine Kopie.

---

## 1. Prinzip

Die Lehrkraft oder Spielleitung pflegt eine Namensliste, wählt Teamanzahl oder Teamgröße und schüttelt das Gerät (oder tippt einen Button). Es erscheinen farbcodierte Teams, entweder rein zufällig oder ausgeglichen nach Stärke und Geschlecht, unter Beachtung von Regeln „immer zusammen" und „nie zusammen".

## 2. Funktionsumfang

### 2.1 Teambildung
- 1 bis 64 Teams
- Auswahl nach **Teamanzahl** oder nach **Teamgröße**
- Modus **Zufällig** oder **Ausgeglichen**
- Auslösen per **Schütteln** (Bewegungssensor) oder **Button**, animierter Hut/Schüttel-Animation
- **Zufallsperson ziehen**: eine einzelne Person aus den aktiven Spielern, ohne die aktuellen Teams zu löschen (häufige Nutzerkritik am Original)

### 2.2 Teilnehmerverwaltung
- Namen per Tastatur eingeben
- Import per **Einfügen** (ein Name pro Zeile) und **CSV/Textdatei** (Kontaktimport entfällt in der PWA)
- Personen **vorübergehend deaktivieren** (abwesend)
- Anzeige „aktive / alle Spieler" auf dem Hauptbildschirm
- Mehrere **gespeicherte Listen** (Klassen/Kurse) anlegen, laden, umbenennen, löschen (im Original eine Schwäche, hier bewusst einfach lösen)
- Aktuelle Liste wird automatisch gespeichert

### 2.3 Eigenschaften pro Person
- **Stärke** 1–5 (Anzeige auf dem Hauptbildschirm abschaltbar)
- **Geschlecht** (m / w / d / unbekannt) für Geschlechter-Balance
- **Gruppen** (siehe 2.4)

### 2.4 Regeln
- **Zusammen-Gruppen** („Subteams"): Personen, die immer im selben Team landen
- **Getrennt-Gruppen** („Oppose Teams"): Personen, die möglichst auf verschiedene Teams verteilt werden. Ist eine solche Gruppe größer als die Teamanzahl, wird sie so gleichmäßig wie möglich verteilt (Verhalten laut Update-Notiz des Originals)
- Gruppen mit eigenem Namen, global ein-/ausschaltbar („schnell ohne Regeln")
- Eine Person kann in mehreren Gruppen sein

### 2.5 Balance-Optionen
- **Nach Stärke ausgleichen** (Summe/Durchschnitt je Team möglichst gleich)
- **Equal Ability**: alle Personen eines Teams haben gleiche Stärke (homogene Gruppen, z. B. für Differenzierung)
- **Geschlecht gleichmäßig verteilen**
- **Getrennte Teams** für männlich/weiblich; Stärke-Balance bleibt dabei aktiv
- Teams nach Namen sortieren (Option)

### 2.6 Ausgabe
- Farbige Teamkarten mit Teamnummer, Name, Mitgliedern
- Teamnamen und Teamfarben anpassbar
- Teilen (Web Share API), Kopieren als Text, Export **CSV**, Drucken (Druck-CSS), Vollbild-/Beamer-Ansicht mit großer Schrift
- Export und Import aller Listen samt Optionen als JSON-Datei (Gerätewechsel, Backup)

---

## 3. Datenmodell (localStorage oder IndexedDB)

```json
{
  "version": 1,
  "activeListId": "l1",
  "lists": [{
    "id": "l1",
    "name": "9a Chemie",
    "players": [
      {"id":"p1","name":"Anna","strength":3,"gender":"w","active":true}
    ],
    "groups": [
      {"id":"g1","name":"Freunde","type":"together","playerIds":["p1","p2"],"enabled":true},
      {"id":"g2","name":"Streithähne","type":"apart","playerIds":["p3","p4"],"enabled":true}
    ]
  }],
  "options": {
    "mode": "random|balanced",
    "by": "count|size",
    "value": 4,
    "balanceStrength": true,
    "equalAbility": false,
    "genderMode": "ignore|even|separate",
    "sortByName": false,
    "showStrength": true,
    "rulesEnabled": true,
    "teamNames": [], "teamColors": []
  },
  "lastResult": null
}
```

---

## 4. Ablauf der Teambildung

1. Aktive Spieler sammeln, n = Anzahl.
2. k bestimmen: bei „Anzahl" k = Wert; bei „Größe" k = aufrunden(n / Wert). k auf 1…min(64, n) begrenzen.
3. Zielgrößen: jedes Team floor(n/k) oder ceil(n/k); die Rest-Plätze zufällig auf Teams verteilen.
4. Regeln anwenden (Abschnitt 5), Ergebnis anzeigen, speichern.

## 5. Algorithmus-Entwurf

**Idee:** Greedy-Verteilung mit Zufall, danach lokale Verbesserung durch Tausch.

1. **Einheiten bilden:** Alle Zusammen-Gruppen per Union-Find zu Blöcken verschmelzen. Jede Person ohne Gruppe ist ein Block der Größe 1. Ist ein Block größer als die maximale Teamgröße: Warnung anzeigen und Regel für diesen Block ignorieren.
2. **Zufall:** Blöcke mischen (Fisher-Yates mit `crypto.getRandomValues`).
3. **Reihenfolge:** Im Modus „ausgeglichen" Blöcke nach Gesamtstärke absteigend sortieren, Gleichstände bleiben zufällig (stabile Sortierung nach vorherigem Mischen). Bei „Equal Ability" stattdessen sortieren und fortlaufend in Teams schneiden (Team 1 die Stärksten usw.).
4. **Verteilen:** Für jeden Block das passende Team wählen:
   - Nur Teams, in die der Block noch passt (Zielgröße).
   - Verletzungen von „Getrennt" minimieren (Anzahl bereits enthaltener Personen derselben Getrennt-Gruppe).
   - Bei Geschlechter-Balance: das Team mit dem geringsten Anteil des jeweiligen Geschlechts bevorzugen.
   - Bei Stärke-Balance: das Team mit der niedrigsten bisherigen Stärkesumme bevorzugen.
   - Gleichstand: zufällig entscheiden.
   - Prioritäten in dieser Reihenfolge: Größe, Getrennt-Regel, Geschlecht, Stärke.
5. **Verbessern (nur ausgeglichen):** Bis zu ca. 500 Versuche: zwei zufällige Blöcke gleicher Größe aus verschiedenen Teams tauschen, wenn die Kostenfunktion sinkt. Kosten = 1000 · Getrennt-Verstöße + 10 · Geschlechter-Abweichung + Varianz der Stärkesummen. Danach abbrechen.
6. **Getrennte Geschlechterteams:** Spieler vorher in zwei Pools teilen; k proportional zur Poolgröße auf beide Pools aufteilen (mind. 1 Team je Pool); Schritte 1–5 je Pool durchführen.
7. **Sonderfälle:** n < k oder n = 0 mit verständlicher Meldung abfangen; nach dem Lauf alle Regeln prüfen und nicht erfüllbare als Hinweis zeigen („Regel X konnte nicht eingehalten werden").

Mit dem Entwurf ist keine Aussage über das Original verbunden.

---

## 6. Oberfläche

**Hauptbildschirm:** Listenwahl, Spielerliste (Name, Stärke, Geschlecht, Schalter aktiv), Zähler „aktiv/gesamt", große Optionsleiste (Anzahl/Größe, Modus), Schüttel-Hut mit Button „Teams bilden", Button „Zufallsperson".
**Ergebnis:** Kartenraster (iPad mehrspaltig, Handy einspaltig), Buttons Neu mischen, Teilen, CSV, Drucken, Beamer-Ansicht.
**Einstellungen:** Balance-Optionen, Regeln/Gruppen, Teamnamen und -farben, Import/Export, Datenschutzhinweis „alle Daten bleiben lokal auf dem Gerät".
**Design:** Touch-Ziele mindestens 44 px, Hell/Dunkel nach System, Teamfarben mit ausreichendem Kontrast (Text automatisch hell/dunkel), Schriftgrößen für Beamer, deutsche Oberfläche.

## 7. Schütteln (Wichtig für iOS)

- API: `DeviceMotionEvent`, Schwellwert auf Beschleunigungsbetrag (ca. 15–20 m/s²) mit Entprellung (ca. 1 s Sperre).
- **iOS 13+ verlangt eine Berechtigung:** `DeviceMotionEvent.requestPermission()` muss aus einer Nutzergeste (Button-Tipp) aufgerufen werden und funktioniert nur über HTTPS. Deshalb einmaliger Button „Schütteln aktivieren".
- Immer **Button als Fallback**; Schütteln bei verweigerter Berechtigung stillschweigend deaktivieren.
- Optional kurze Vibration (`navigator.vibrate`, auf iOS nicht verfügbar, nur wo vorhanden).

## 8. PWA-Anforderungen

- **HTTPS-Hosting** nötig (z. B. GitHub Pages, wie beim Jeopardy-Tool), sonst keine Bewegungsdaten und kein Service Worker.
- `manifest.webmanifest`: Name, Kurzname, `display: standalone`, `start_url`, Theme-/Hintergrundfarbe, Icons 192/512 px (maskable) plus 180 px Apple-Touch-Icon.
- iOS-Metas: `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `apple-touch-icon`, `viewport-fit=cover`, Safe-Area-Abstände (`env(safe-area-inset-*)`).
- **Service Worker**: App-Shell beim Installieren cachen, offline lauffähig, Versionsnummer für Updates.
- Installation auf iOS über „Teilen → Zum Home-Bildschirm" (Hinweis-Banner mit Anleitung einbauen, da iOS keinen Installationsdialog zeigt).
- Persistenz: localStorage/IndexedDB; Hinweis, dass iOS Websitedaten bei langer Nichtnutzung löschen kann, daher JSON-Backup-Funktion prominent anbieten.
- Keine externen Bibliotheken und keine CDN-Aufrufe, damit alles offline und datenschutzfreundlich bleibt.
- Optionale Single-File-Variante: Manifest und Service Worker als Blob erzeugen; echte PWA-Installation ist mit separaten Dateien zuverlässiger.

## 9. Abgrenzung und Verbesserungen gegenüber dem Original

Nutzerkritik am Original, die hier vermieden werden soll: unübersichtliche Listenverwaltung, Zufallsperson löscht die Teams, Export nicht nach Teams sortiert, keine Stärke-/Schwäche-Erweiterungen, seltene Updates.

Nicht im Umfang: Facebook-/Twitter-Anbindung, Kontaktimport, Video-Out (ersetzt durch Beamer-Ansicht), Konten, Cloud-Sync.

## 10. Abnahmekriterien

1. Läuft nach Installation offline auf iPhone, iPad und Android.
2. Schütteln löst nach einmaliger Freigabe zuverlässig aus, Button funktioniert immer.
3. Teams sind auch bei 64 Teams und ungeraden Zahlen in der Größe maximal um 1 verschieden (Ausnahme: nicht erfüllbare Zusammen-Blöcke, mit Hinweis).
4. Zusammen- und Getrennt-Regeln werden eingehalten oder Verstöße ausdrücklich gemeldet.
5. Stärke-Balance: Unterschied der Stärkesummen zwischen Teams im Test (z. B. 24 Personen, 4 Teams) höchstens so groß wie die höchste Einzelstärke.
6. Listen, Optionen und letztes Ergebnis bleiben nach App-Neustart erhalten; JSON-Export und -Import verlustfrei.
7. CSV-Export und Druck sind nach Teams sortiert.

## 11. Quellen

- App Store: Team Shake (id390812953), Beschreibung und Update-Notizen – https://apps.apple.com/us/app/id390812953
- Hersteller Rhine-o: Funktionsliste – https://www.rhine-o.com/iphone-apps/team-shake/
- ATD Magazine, „Cool Tool: Team Shake" – https://www.td.org/content/td-magazine/cool-tool-team-shake
- Friedrich Verlag: „Teams bilden leicht gemacht" (Sportunterricht)
