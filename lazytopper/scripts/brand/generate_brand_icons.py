"""LOGO-1 -- derive every small brand icon from the owner's fingerprint art.

The fingerprint is LazyTopper's logo (owner ruling, 2026-10-19). This script makes the
favicon / touch-icon / header-tile sizes from ONE source file the owner supplied:

    public/brand/lazytopper-fingerprint-mark.png   (555x768, the fingerprint alone)

No redraw, no new colours: the mark is cropped to its own pixels, centred on a square,
flattened onto white, and resampled (LANCZOS). At <=48px it is the fingerprint alone --
no wordmark, no tagline -- because text is unreadable at that size.

Outputs (all under lazytopper/public/):
    favicon.ico                        16 + 32 + 48 in one file
    favicon-16x16.png / -32x32 / -48x48
    apple-touch-icon.png               180x180, opaque white (iOS fills transparency black)
    favicon.svg                        the 64px PNG wrapped in SVG, so the long-standing
                                       /favicon.svg URL now serves the fingerprint too
    brand/lazytopper-fingerprint-icon-128.png   the in-app header / print-doc tile

Re-run (repo root):  python lazytopper/scripts/brand/generate_brand_icons.py
Deterministic: same source in, same bytes out.
"""

from __future__ import annotations

import base64
import io
from pathlib import Path

from PIL import Image

PUBLIC = Path(__file__).resolve().parents[2] / "public"
SOURCE = PUBLIC / "brand" / "lazytopper-fingerprint-mark.png"
WHITE = (255, 255, 255, 255)
# Breathing room around the mark, as a fraction of the square's side. None at 16px so
# the smallest icon spends every pixel on the fingerprint.
PAD = {16: 0.0, 32: 0.03, 48: 0.04}
DEFAULT_PAD = 0.06
# Alpha re-weighting per output size (see square_mark). 128 is the in-app tile, which is
# DISPLAYED at 26-42 CSS px, so it gets the same treatment as the favicons.
ALPHA_GAMMA = {16: 0.35, 32: 0.5, 48: 0.6, 64: 0.6, 128: 0.6}


def square_mark(size: int) -> Image.Image:
    src = Image.open(SOURCE).convert("RGBA")
    src = src.crop(src.getchannel("A").getbbox())
    if size in ALPHA_GAMMA:
        # The art's ink is semi-transparent (alpha peaks at ~223/255) and its ridges sit
        # on white gaps, so a plain downsample averages it to pastel at favicon sizes.
        # Re-weight the EXISTING alpha only (stretch to full + gamma), which makes the
        # owner's own colours denser -- no colour is added or changed.
        peak = src.getchannel("A").getextrema()[1] or 255
        alpha = src.getchannel("A").point(
            lambda a: min(255, round(255 * (a / peak) ** ALPHA_GAMMA[size]))
        )
        src.putalpha(alpha)
    pad = PAD.get(size, DEFAULT_PAD)
    inner = size * (1 - 2 * pad)
    scale = inner / max(src.size)
    w, h = max(1, round(src.width * scale)), max(1, round(src.height * scale))
    mark = src.resize((w, h), Image.LANCZOS)
    tile = Image.new("RGBA", (size, size), WHITE)
    tile.alpha_composite(mark, ((size - w) // 2, (size - h) // 2))
    return tile.convert("RGB")


def png_bytes(img: Image.Image) -> bytes:
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def main() -> None:
    sizes = {s: square_mark(s) for s in (16, 32, 48, 64, 128, 180)}

    for s in (16, 32, 48):
        (PUBLIC / f"favicon-{s}x{s}.png").write_bytes(png_bytes(sizes[s]))

    sizes[48].save(
        PUBLIC / "favicon.ico",
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48)],
        append_images=[sizes[16], sizes[32]],
    )

    (PUBLIC / "apple-touch-icon.png").write_bytes(png_bytes(sizes[180]))
    (PUBLIC / "brand" / "lazytopper-fingerprint-icon-128.png").write_bytes(png_bytes(sizes[128]))

    b64 = base64.b64encode(png_bytes(sizes[64])).decode("ascii")
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">\n'
        "  <title>LazyTopper</title>\n"
        f'  <image width="64" height="64" href="data:image/png;base64,{b64}"/>\n'
        "</svg>\n"
    )
    (PUBLIC / "favicon.svg").write_text(svg, encoding="ascii", newline="\n")

    # HYGIENE-2 (owner, 2026-10-19): the old share-card source public/og-image.svg was
    # DELETED -- it printed an invented "4.8 from 2,340+ reviews" rating. The live share
    # card is the owner's public/og-image.png (index.html og:image); this script does not
    # generate or patch it, so there is no share-card step here any more.

    for name in (
        "favicon.ico",
        "favicon-16x16.png",
        "favicon-32x32.png",
        "favicon-48x48.png",
        "apple-touch-icon.png",
        "favicon.svg",
        "brand/lazytopper-fingerprint-icon-128.png",
    ):
        print(f"{name}: {(PUBLIC / name).stat().st_size} bytes")


if __name__ == "__main__":
    main()
