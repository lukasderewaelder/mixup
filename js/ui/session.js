// Flüchtiger Bedienzustand (nicht gespeichert): was gerade an ist, solange die App offen ist.
export const session = {
  playAnimation: false,   // nach „Losen“: Ergebnis mit Misch-Animation zeigen
  namesMode: 'present',   // Namensliste: 'present' | 'select' (Personen für eine Regel auswählen)
  selected: new Set(),    // ausgewählte Personen für Regeln
  pickedPlayer: null,     // Ergebnis: angetippte Person zum Verschieben
  view: 'edit',           // Hauptbildschirm: 'edit' (alles sichtbar) | 'class' (nur Teams)
  tab: 'names',           // schmale Bildschirme: 'names' | 'teams'
  openAddNames: false,    // nach „Neue Klasse“: Dialog „Namen hinzufügen“ öffnen
};

export function resetNames() {
  session.namesMode = 'present';
  session.selected.clear();
}

/** Beim Öffnen einer Klasse: Bearbeiten-Ansicht, passender Reiter. */
export function enterClass(hasResult) {
  resetNames();
  session.pickedPlayer = null;
  session.view = 'edit';
  session.tab = hasResult ? 'teams' : 'names';
}
