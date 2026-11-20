# Prüfung nach Web Interface Guidelines – Version 1.2

Quelle der Regeln: vercel-labs/web-interface-guidelines (`command.md`), abgerufen am 20.11.2026.
Geprüft: `index.html`, `css/*.css`, `js/ui/*.js`. Format: `datei:zeile – Befund → Stand`.

## css/components.css
css/components.css:344 – `transition: all` an `.toast.is-leaving` → **behoben** (nur `opacity`, `transform`)
css/components.css:94 – `select`/`.input` ohne explizite Textfarbe (Windows-Kontrastmodus) → **behoben** (`color: var(--ink)`)
css/components.css – Dialoginhalt ohne `overscroll-behavior: contain` → **behoben** (`.modal-body`)

## css/base.css
css/base.css – kein `touch-action: manipulation` (Doppeltipp-Verzögerung auf dem iPad) → **behoben** (alle Bedienelemente)
css/base.css – klebende Kopfzeile/Losen-Leiste können fokussierte Elemente verdecken → **behoben** (`scroll-padding-top/-bottom`)

## css/screens.css
css/screens.css – Namensspalte scrollt die ganze Seite mit → **behoben** (`overscroll-behavior: contain` an `.col-names`)
css/screens.css:15/178/338 – `outline: none` an `h1:focus` → **belassen**: Überschriften sind nur programmatisch fokussierbar (`tabindex="-1"`), keine Bedienelemente

## js/ui/names-panel.js
js/ui/names-panel.js – Eingabefelder ohne `name`, Rechtschreibprüfung an Namen → **behoben** (`name`, `autocomplete="off"`, `spellcheck="false"`)
js/ui/names-panel.js – Platzhalter „Name“ ohne Beispiel und „…“ → **behoben** („z. B. Aylin Demir …“)

## js/ui/group-style.js
js/ui/group-style.js:25 – Platzhalter ohne „…“, Feld ohne `name` → **behoben**

## js/ui/dialogs.js
js/ui/dialogs.js:74 – Eingabe ohne `name`, Rechtschreibprüfung → **behoben**
js/ui/dialogs.js – `autofocus` im Eingabedialog → **belassen**: einziges Feld des Dialogs, Nutzer hat ihn gerade selbst geöffnet

## js/ui/start.js
js/ui/start.js – „Öffnen“ war eine Taste, die navigiert → **behoben** (jetzt Link auf `#/klasse`)

## index.html
index.html:44 – Markenname ohne `translate="no"` → **behoben**
index.html – Zoom nicht gesperrt, Sprunglink vorhanden, `theme-color` folgt dem Design ✓ pass

## Bewusst abweichend
- Farbübergänge (`background`, `border-color`, 180 ms) an Tasten und Kacheln: kurz, nicht bewegend, verbessern das Antipp-Feedback; Bewegung selbst nutzt nur `transform`/`opacity`.
- Misch-Animation färbt die fliegenden Namen um (`background`, `color`) – einmalige Animation von 1,2 s, abschaltbar und bei „Bewegung reduzieren“ aus.
- `fitGrid` misst die Größe in einer Schleife (Lesen/Schreiben abwechselnd) – nur beim Öffnen der Klassenansicht und bei Größenänderung, in `requestAnimationFrame`.
- „Title Case“ (englische Regel) gilt nicht für deutsche Oberflächen.

## Ohne Befund
Icon-Tasten mit `aria-label` ✓ · dekorative Symbole `aria-hidden` ✓ · Meldungen `aria-live` ✓ · sichtbarer Fokus in allen vier Designs ✓ · Schalter/Radios mit gemeinsamer Trefferfläche ✓ · `prefers-reduced-motion` ✓ · Löschen mit Bestätigung oder Rückgängig ✓ · Datum über `Intl` (`toLocale…`) ✓ · Zahlen `tabular-nums` ✓ · Überschriften `text-wrap: balance` ✓ · Safe-Area-Abstände ✓ · keine Bilder ohne Maße ✓
