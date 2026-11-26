"""Build the News On Africa brand kit: outlined SVG lockups from Archivo.

Text is converted to outlines so the files render the same everywhere (no
font install needed). Glyph path data is read from components/africa-glyph.tsx.

  pip install fonttools brotli uharfbuzz
  python3 scripts/brand/build-brand-kit.py app/fonts/archivo-latin-variable.woff2 \
      components/africa-glyph.tsx docs/brand/news-on-africa-logo/svg

PNG exports in docs/brand/news-on-africa-logo/png were rendered from these SVGs
with sharp (2000 px wide lockups, 1024 px glyphs and app icon, 1080 px avatar).
The wordmark path data for lib/brand/wordmark.ts is written to wordmark.json
next to the output folder.
"""
import json, re, sys, os
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
import uharfbuzz as hb

FONT, GLYPH_TSX, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(OUT, exist_ok=True)

GREEN, GREEN_BRIGHT, INK, WHITE = "#15994a", "#1bb257", "#161412", "#ffffff"

src = open(GLYPH_TSX).read()
OUTLINE = re.search(r'AFRICA_OUTLINE_PATH =\s*"([^"]+)"', src).group(1)
MADA = re.search(r'MADAGASCAR_PATH =\s*"([^"]+)"', src).group(1)

_fonts = {}
def font_at(wght):
    if wght not in _fonts:
        f = TTFont(FONT)
        f = instantiateVariableFont(f, {"wght": wght})
        f.flavor = None
        path = f"/tmp/archivo-{wght}.ttf"
        f.save(path)
        blob = hb.Blob(open(path, "rb").read())
        _fonts[wght] = (TTFont(path), hb.Font(hb.Face(blob)))
    return _fonts[wght]

def text_path(text, wght, size, tracking=0.0):
    """Outline `text` at `size` px; returns (svg path d, (xmin, ymin, xmax, ymax), advance).
    Origin at baseline-left, y down."""
    tt, hbf = font_at(wght)
    upem = tt["head"].unitsPerEm
    buf = hb.Buffer(); buf.add_str(text); buf.guess_segment_properties()
    hb.shape(hbf, buf, {"kern": True, "liga": True})
    gs = tt.getGlyphSet()
    order = tt.getGlyphOrder()
    s = size / upem
    pen = SVGPathPen(gs, lambda v: f"{v:.2f}".rstrip("0").rstrip("."))
    bpen = BoundsPen(gs)
    x = 0.0
    n = len(buf.glyph_infos)
    for i, (info, pos) in enumerate(zip(buf.glyph_infos, buf.glyph_positions)):
        name = order[info.codepoint]
        t = (s, 0, 0, -s, x + pos.x_offset * s, -pos.y_offset * s)
        gs[name].draw(TransformPen(pen, t))
        gs[name].draw(TransformPen(bpen, t))
        x += pos.x_advance * s + (tracking * size if i < n - 1 else 0)
    return pen.getCommands(), bpen.bounds, x

def wordmark(size=100):
    """Stacked 'news on' / 'Africa'. Returns parts positioned with ink top-left at 0,0."""
    d1, b1, _ = text_path("news on", 700, size, -0.02)
    big = size * 1.305
    d2, b2, _ = text_path("Africa", 700, big)
    gap = 0.08 * size + 0.1 * size  # visual gap between x-height line and cap line
    # line 1: shift so ink top = 0, ink left = 0
    t1 = (-b1[0], -b1[1])
    h1 = b1[3] - b1[1]
    t2 = (-b2[0], h1 + gap - b2[1])
    h2 = b2[3] - b2[1]
    w = max(b1[2] - b1[0], b2[2] - b2[0])
    return {"l1": (d1, t1), "l2": (d2, t2), "w": w, "h": h1 + gap + h2,
            "w1": b1[2] - b1[0], "w2": b2[2] - b2[0]}

def glyph_svg(x, y, size, color, stroke=4.8):
    k = size / 100
    return (f'<g transform="translate({x:.2f} {y:.2f}) scale({k:.4f})">'
            f'<path d="{OUTLINE}" fill="none" stroke="{color}" stroke-width="{stroke}" '
            f'stroke-linecap="round" stroke-linejoin="round"/>'
            f'<circle cx="9.9" cy="35" r="{stroke*0.7:.2f}" fill="{color}"/>'
            f'<path d="{MADA}" fill="{color}"/></g>')

def edition_bar(x, y, w, label, bg, fg, size=100):
    """Bar under the wordmark with the edition label justified across it."""
    h = 0.40 * size
    cap = 0.2 * size  # label font size
    d, b, adv = text_path(label.upper(), 800, cap)
    ink_w = b[2] - b[0]
    pad = 0.16 * w
    n = len(label) - 1
    track = max(0.0, (w - 2 * pad - ink_w) / n) / cap if n else 0
    d, b, adv = text_path(label.upper(), 800, cap, track)
    tw = b[2] - b[0]
    tx = x + (w - tw) / 2 - b[0]
    ty = y + h / 2 - (b[1] + b[3]) / 2
    return (f'<rect x="{x:.2f}" y="{y:.2f}" width="{w:.2f}" height="{h:.2f}" fill="{bg}"/>'
            f'<path transform="translate({tx:.2f} {ty:.2f})" d="{d}" fill="{fg}"/>'), h

def lockup(name, ink, green, edition=None, bar_bg=INK, bar_fg=WHITE, bg=None, with_glyph=True, glyph_color=None):
    S = 100
    wm = wordmark(S)
    pad = 24
    gsize = 2.3 * S
    gap = 0.3 * S
    bar = ""
    block_h = wm["h"]
    if edition:
        bar_y_rel = wm["h"] + 0.14 * S
        bar_frag, bh = None, 0.40 * S
        block_h = bar_y_rel + bh
    gx = pad
    tx = pad + (gsize + gap if with_glyph else 0)
    height = max(gsize if with_glyph else 0, block_h) + 2 * pad
    ty = (height - block_h) / 2
    gy = (height - gsize) / 2
    width = tx + wm["w"] + pad
    parts = []
    if bg:
        parts.append(f'<rect width="100%" height="100%" fill="{bg}"/>')
    if with_glyph:
        parts.append(glyph_svg(gx, gy, gsize, glyph_color or green))
    d1, t1 = wm["l1"]; d2, t2 = wm["l2"]
    parts.append(f'<path transform="translate({tx + t1[0]:.2f} {ty + t1[1]:.2f})" d="{d1}" fill="{ink}"/>')
    parts.append(f'<path transform="translate({tx + t2[0]:.2f} {ty + t2[1]:.2f})" d="{d2}" fill="{green}"/>')
    if edition:
        frag, _ = edition_bar(tx, ty + wm["h"] + 0.14 * S, wm["w"], f"{edition} Edition", bar_bg, bar_fg, S)
        parts.append(frag)
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width:.0f} {height:.0f}" '
           f'width="{width:.0f}" height="{height:.0f}" role="img" aria-label="News On Africa">'
           f'<title>News On Africa</title>' + "".join(parts) + "</svg>\n")
    open(os.path.join(OUT, name), "w").write(svg)
    return name

def simple(name, body, w, h):
    open(os.path.join(OUT, name), "w").write(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">{body}</svg>\n')

made = []
# Primary + reversed + mono
made.append(lockup("logo-primary.svg", INK, GREEN))
made.append(lockup("logo-reversed.svg", WHITE, GREEN_BRIGHT))
made.append(lockup("logo-reversed-on-ink.svg", WHITE, GREEN_BRIGHT, bg=INK))
made.append(lockup("logo-mono-black.svg", INK, INK))
made.append(lockup("logo-mono-white.svg", WHITE, WHITE))
made.append(lockup("wordmark-primary.svg", INK, GREEN, with_glyph=False))
made.append(lockup("wordmark-reversed.svg", WHITE, GREEN_BRIGHT, with_glyph=False))
# Editions
for ed in ["Global", "Eswatini", "South Africa", "Nigeria"]:
    slug = ed.lower().replace(" ", "-")
    made.append(lockup(f"edition-{slug}.svg", INK, GREEN, edition=ed))
    made.append(lockup(f"edition-{slug}-reversed.svg", WHITE, GREEN_BRIGHT, edition=ed, bar_bg=WHITE, bar_fg=INK))
# Glyph
simple("glyph-green.svg", glyph_svg(0, 0, 100, GREEN), 100, 100)
simple("glyph-white.svg", glyph_svg(0, 0, 100, WHITE), 100, 100)
simple("glyph-ink.svg", glyph_svg(0, 0, 100, INK), 100, 100)
# App icon + social avatar (square, green; avatar glyph sized for a circle crop)
simple("app-icon.svg", f'<rect width="1024" height="1024" rx="224" fill="{GREEN}"/>' + glyph_svg(152, 152, 720, WHITE, 6.5), 1024, 1024)
simple("social-avatar.svg", f'<rect width="1080" height="1080" fill="{GREEN}"/>' + glyph_svg(270, 270, 540, WHITE, 6.5), 1080, 1080)

# Wordmark path data for the OG card (lib/brand/wordmark.ts)
wm = wordmark(100)
json.dump({"l1": wm["l1"], "l2": wm["l2"], "w": round(wm["w"], 2), "h": round(wm["h"], 2)},
          open(os.path.join(OUT, "..", "wordmark.json"), "w"))
print("\n".join(made)); print("wordmark", wm["w"], wm["h"], wm["w1"], wm["w2"])
