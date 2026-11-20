"""Erzeugt die App-Icons von Mixup (PNG) aus derselben Geometrie wie icons/icon.svg.

Aufruf: python tools/icons.py
Vier Punkte in Teamfarben 1–4; der vierte ist aus dem Raster gerutscht („gemischt“).
"""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "icons"
COLORS = ["#3f71d3", "#c44f23", "#008467", "#9d58bb"]
# Kreise im 32er-Raster (cx, cy, r) – identisch zu icons/icon.svg
DOTS = [(9, 9, 6), (23, 9, 6), (9, 23, 6), (25, 25, 6)]


def render(size: int, safe: float) -> Image.Image:
    """safe = Anteil der Kantenlänge, den das Motiv einnimmt (maskable: ≤ 0,8)."""
    scale = 4  # Supersampling für glatte Kanten
    big = size * scale
    img = Image.new("RGB", (big, big), "#ffffff")
    draw = ImageDraw.Draw(img)
    motif = big * safe
    offset = (big - motif) / 2
    unit = motif / 32
    for (cx, cy, r), color in zip(DOTS, COLORS):
        x, y, rr = offset + cx * unit, offset + cy * unit, r * unit
        draw.ellipse([x - rr, y - rr, x + rr, y + rr], fill=color)
    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    OUT.mkdir(exist_ok=True)
    render(192, 0.62).save(OUT / "icon-192.png", optimize=True)
    render(512, 0.62).save(OUT / "icon-512.png", optimize=True)
    render(512, 0.55).save(OUT / "icon-maskable-512.png", optimize=True)
    render(180, 0.62).save(OUT / "apple-touch-icon-180.png", optimize=True)
    print("Icons geschrieben:", ", ".join(p.name for p in sorted(OUT.glob("*.png"))))


if __name__ == "__main__":
    main()
