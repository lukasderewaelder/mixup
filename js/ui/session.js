// Flüchtiger Bedienzustand (nicht gespeichert): was gerade an ist, solange die App offen ist.
export const session = {
  playAnimation: false,   // nach „Losen“: Ergebnis mit Misch-Animation zeigen
  step1Mode: 'present',   // 'present' | 'select' | 'edit'
  selected: new Set(),    // ausgewählte Personen für Regeln
  pickedPlayer: null,     // Ergebnis: angetippte Person zum Verschieben
};

export function resetStep1() {
  session.step1Mode = 'present';
  session.selected.clear();
}
