"""Capture a lesson figure at given seconds: a headless Edge screenshot of the
?viz-t= deep link, cropped to the canvas (its background is #0d1119) plus the
caption and controls below it, with Pillow.
Usage: python scripts/unit-tooling/capture_viz.py <out_dir> <page_url> <seconds...>
Example: python scripts/unit-tooling/capture_viz.py build/shots/x https://algonow.net/scenarios/x/ 10 25"""
import pathlib
import subprocess
import sys
import time

from PIL import Image

EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if not pathlib.Path(EDGE).exists():
    EDGE = r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"
BG = (13, 17, 25)
out = pathlib.Path(sys.argv[1]).resolve()   # Edge writes a relative screenshot path relative to its own directory
out.mkdir(parents=True, exist_ok=True)
base = sys.argv[2]
for t in sys.argv[3:]:
    shot = out / f"full-{t}.png"
    url = f"{base}?viz-t={t}&nocache={int(time.time())}#visual"
    subprocess.run([EDGE, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--window-size=1280,4200",
                    "--virtual-time-budget=6000", f"--screenshot={shot}", url], check=True, capture_output=True, timeout=120)
    im = Image.open(shot).convert("RGB")
    px = im.load()
    w, h = im.size
    rows = [y for y in range(0, h, 2) if sum(1 for x in range(0, w, 8) if px[x, y] == BG) > 40]
    if not rows:
        print("no canvas found at", t)
        continue
    y0 = rows[0]
    cols = [x for x in range(0, w, 2) if px[x, y0 + 8] == BG]
    x0, x1 = cols[0], cols[-1]
    height = round((x1 - x0) * 486 / 900)
    box = (max(0, x0 - 4), max(0, y0 - 4), min(w, x1 + 6), min(h, y0 + height + 150))
    crop = out / f"viz-{t}.png"
    im.crop(box).save(crop)
    print("frame", t, "canvas box", box, "->", crop)
