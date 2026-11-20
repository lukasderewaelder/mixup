// Zufall für die Teambildung. Im Betrieb: kryptografischer Zufall (keine erkennbaren Muster).
// In Tests: reproduzierbarer Zufall mit Startwert.

/** Zufallszahl in [0, 1) aus crypto.getRandomValues. */
export function cryptoRandom() {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / 4294967296;
}

/** Reproduzierbarer Zufall (mulberry32) – nur für Tests und Fehlersuche. */
export function seededRandom(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Ganze Zufallszahl in [0, n). */
export function randInt(n, rng = cryptoRandom) {
  return Math.floor(rng() * n);
}

/** Mischt das Feld an Ort und Stelle (Fisher-Yates) und gibt es zurück. */
export function shuffle(arr, rng = cryptoRandom) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(i + 1, rng);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
