# Mixup

Teams per Zufall für den Unterricht: Klasse wählen, abhaken wer fehlt, „Losen“ tippen – faire Teams groß an Tafel oder Beamer.
Läuft als PWA auf iPad und PC, komplett offline, komplett auf Deutsch, ohne Konten und ohne Cloud. Alle Namen bleiben auf dem Gerät.

**App:** https://lukasderewaelder.github.io/mixup/
**Stand:** M0 (Grundgerüst) und M1 (Teambildungs-Algorithmus, `js/teams/`, 37 Tests) fertig. Weiter mit M2 (Klassen, Namen, Anwesenheit, Regeln).

## Entwicklung

```bash
node tools/serve.mjs 4250     # Entwicklungsserver ohne Cache: http://localhost:4250/
npm test                      # Tests (node --test)
node tools/precache.mjs       # Dateiliste im Service Worker aktualisieren – vor jedem Commit
python tools/icons.py         # App-Icons neu erzeugen (braucht Pillow)
```

Keine Abhängigkeiten, kein Build. Der Service Worker wird auf `localhost` nicht registriert.

## Planung

- [`planung/02-spezifikation-mixup.md`](planung/02-spezifikation-mixup.md) – Spezifikation, Algorithmus, Meilensteine M0–M6
- [`planung/01-entscheidungen.md`](planung/01-entscheidungen.md) – alle Entscheidungen
- [`planung/00-spezifikation-vorlage.md`](planung/00-spezifikation-vorlage.md) – Ausgangs-Spezifikation (Vorlage)

## Lizenzen

Schrift Inter © The Inter Project Authors, SIL Open Font License 1.1 (`fonts/OFL.txt`).
Funktionsprinzip angelehnt an die iOS-App „Team Shake“; Name, Design, Texte und Algorithmus sind eigenständig.
