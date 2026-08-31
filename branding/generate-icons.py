"""Generate the Paicart Android launcher icon set from the trimmed brand mark.

Sizing rationale (this is what makes the icon survive every OEM mask):
  * Adaptive icons are a 108dp canvas. Launchers may crop to any shape, but the
    centre 72dp is always visible and the centre 66dp circle is guaranteed safe.
    A *square* logo centred in that canvas has its corners at s*sqrt(2)/2 from
    the centre, so surviving a circular 72dp mask needs s <= 50.9dp (47%).
    The Paicart mark has empty corners, so 52% clears every mask with margin.
  * Legacy (API < 26) icons are never masked, so the launcher shows exactly what
    we ship. Those get their own shape drawn in - a rounded square and a circle -
    with the mark at 70%, chosen so it reads at the same visual weight as the adaptive
    icon does inside its 72dp window (83% vs 89% of the visible tile).
"""
import os
from PIL import Image, ImageDraw

SP = os.path.dirname(os.path.abspath(__file__))
RES = os.path.join(SP, "generated")   # branding/generated - copy into android/app/src/main/res
MARK = Image.open(os.path.join(SP, "paicart-mark.png")).convert("RGBA")

WHITE = (255, 255, 255, 255)
ORANGE = (255, 106, 0, 255)

SS = 4  # supersample factor - composite big, downsample once with LANCZOS

LEGACY = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
ADAPTIVE = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}

ADAPTIVE_FILL = 0.50   # tuned so the mark ink fits inside the 66dp guaranteed-safe circle
LEGACY_FILL = 0.70     # matches the adaptive icon's visual weight - see README


def placed(canvas_px, fill, mark=MARK, bg=None, shape=None):
    """Composite the mark centred on a canvas, optionally over a drawn shape."""
    n = canvas_px * SS
    img = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    if bg is not None:
        layer = Image.new("RGBA", (n, n), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        if shape == "circle":
            d.ellipse([0, 0, n - 1, n - 1], fill=bg)
        elif shape == "rounded":
            d.rounded_rectangle([0, 0, n - 1, n - 1], radius=int(n * 0.22), fill=bg)
        else:
            d.rectangle([0, 0, n - 1, n - 1], fill=bg)
        img = Image.alpha_composite(img, layer)
    m = int(n * fill)
    r = mark.resize((m, m), Image.LANCZOS)
    img.paste(r, ((n - m) // 2, (n - m) // 2), r)
    return img.resize((canvas_px, canvas_px), Image.LANCZOS)


def save(img, folder, name):
    d = os.path.join(RES, folder)
    os.makedirs(d, exist_ok=True)
    img.save(os.path.join(d, name))


# Monochrome (Android 13 themed icons): solid silhouette, system supplies colour.
mono_src = Image.new("RGBA", MARK.size, (0, 0, 0, 255))
mono_src.putalpha(MARK.split()[3])

for dens, px in LEGACY.items():
    save(placed(px, LEGACY_FILL, bg=WHITE, shape="rounded"), f"mipmap-{dens}", "ic_launcher.png")
    save(placed(px, LEGACY_FILL, bg=WHITE, shape="circle"), f"mipmap-{dens}", "ic_launcher_round.png")

for dens, px in ADAPTIVE.items():
    save(placed(px, ADAPTIVE_FILL), f"drawable-{dens}", "ic_launcher_foreground.png")
    save(placed(px, ADAPTIVE_FILL, mark=mono_src), f"drawable-{dens}", "ic_launcher_monochrome.png")

# Play Store listing icon: 512x512, no transparency allowed.
store = placed(512, LEGACY_FILL, bg=WHITE, shape=None)
save(store.convert("RGB"), "..", "play-store-icon.png")   # lands in branding/

print("wrote icon set to", RES)
for root, _, files in sorted(os.walk(RES)):
    for f in sorted(files):
        p = os.path.join(root, f)
        print(" ", os.path.relpath(p, RES), Image.open(p).size)
