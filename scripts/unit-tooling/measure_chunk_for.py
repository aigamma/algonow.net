"""Measure the real Vite chunk for ONE draft scenario by slug: temporarily mark
that record published with a stub manifest (never committed), run `vite build`
only (no prerender), report gzipped sizes, and restore everything in a finally
block. Main thread only, one at a time (it writes dist/).
Usage: python scripts/unit-tooling/measure_chunk_for.py <slug>"""
import gzip
import pathlib
import re
import shutil
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
SLUG = sys.argv[1]
registry = ROOT / "src/data/engineering.js"
manifest = ROOT / f"src/data/narration/{SLUG}.json"
stub_source = ROOT / "src/data/narration/kalman-covariance-correction.json"
original = registry.read_text(encoding="utf-8")
created_stub = False
try:
    i = original.index(f"slug: '{SLUG}'")
    end = original.index("},", i)
    record = original[i:end]
    assert "status: 'draft'," in record, "record is not a draft"
    flipped = original[:i] + record.replace("status: 'draft',", "status: 'published', added: '2026-10-17', listenMinutes: 10,", 1) + original[end:]
    registry.write_text(flipped, encoding="utf-8")
    if not manifest.exists():
        shutil.copy(stub_source, manifest)
        created_stub = True
    npx = "npx.cmd" if sys.platform == "win32" else "npx"
    result = subprocess.run([npx, "vite", "build"], cwd=ROOT, capture_output=True, text=True, timeout=600)
    print("vite build exit", result.returncode)
    if result.returncode != 0:
        print(result.stdout[-3000:], result.stderr[-3000:])
    assets = ROOT / "dist/assets"
    for path in sorted(assets.glob("*.js")):
        if SLUG in path.name or path.name.startswith("ScenarioPage") or path.name.startswith("LessonTimelineViz"):
            data = path.read_bytes()
            gz = len(gzip.compress(data, 9))
            verdict = ("OK" if gz <= 20 * 1024 else "OVER 20KB") if path.name.startswith("scenario-") else ""
            print(f"{path.name}: raw {len(data)/1024:.1f} KB, gz {gz/1024:.2f} KB {verdict}")
    html = ROOT / f"dist/scenarios/{SLUG}/index.html"
    if html.exists():
        print("html gz KB", round(len(gzip.compress(html.read_bytes(), 9)) / 1024, 2))
        print("scripts in html:", re.findall(r'src="([^"]+)"', html.read_text(encoding="utf-8")))
finally:
    registry.write_text(original, encoding="utf-8")
    if created_stub and manifest.exists():
        manifest.unlink()
    print("restored registry; stub manifest removed:", created_stub)
