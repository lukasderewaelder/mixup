// Teamfarben 1–20 (gleiche Werte wie css/tokens.css).
// strong: Teamkopf, Nummer, Rand · tint: Kartenfläche · ink: Text auf der Fläche
export const TEAM_COLORS = [
  { strong: '#3f71d3', tint: '#e9f4ff', ink: '#1c263a' },
  { strong: '#c44f23', tint: '#ffeee6', ink: '#371f17' },
  { strong: '#008467', tint: '#e1faf3', ink: '#0c2d26' },
  { strong: '#9d58bb', tint: '#fbeeff', ink: '#2e2034' },
  { strong: '#966e00', tint: '#faf3df', ink: '#2d260e' },
  { strong: '#007ab6', tint: '#e1f8ff', ink: '#0e2a36' },
  { strong: '#c4486a', tint: '#ffecf0', ink: '#371e23' },
  { strong: '#1c872a', tint: '#e9f9e8', ink: '#1a2c1a' },
  { strong: '#6b66d2', tint: '#f0f2ff', ink: '#23243a' },
  { strong: '#b95900', tint: '#fff0e1', ink: '#352211' },
  { strong: '#008288', tint: '#dffafa', ink: '#082c2d' },
  { strong: '#b14fa0', tint: '#ffedfb', ink: '#321f2e' },
  { strong: '#757900', tint: '#f3f6e1', ink: '#272810' },
  { strong: '#0077cd', tint: '#e6f6ff', ink: '#172839' },
  { strong: '#c74b43', tint: '#ffede9', ink: '#381f1c' },
  { strong: '#008551', tint: '#e3faef', ink: '#112d21' },
  { strong: '#8b5dc6', tint: '#f7efff', ink: '#2a2237' },
  { strong: '#a66700', tint: '#fef2df', ink: '#31240e' },
  { strong: '#007ea7', tint: '#e0f9ff', ink: '#0a2b33' },
  { strong: '#bf4a80', tint: '#ffecf4', ink: '#361e27' },
];

export const MAX_TEAMS = TEAM_COLORS.length;

/** WCAG-Kontrastverhältnis zweier Hex-Farben (#rrggbb). */
export function contrast(a, b) {
  const lum = (hex) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
