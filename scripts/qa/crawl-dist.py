"""Site-wide internal link check over the built dist.

Every href, src, and modulepreload in every dist HTML file must resolve to a
file in dist (a directory resolves to its index.html). A page's <base href>
is honoured: the by-rivals page links relative to it. External targets are
listed in <out dir>/external-links.txt for an optional HEAD pass; nothing
here touches the network. Prints the broken targets and exits 1 when there
are any.

Run with: python -I scripts/qa/crawl-dist.py <repo root> [<out dir>]
"""
import glob
import os
import re
import sys
from urllib.parse import unquote

ROOT = sys.argv[1] if len(sys.argv) > 1 else "."
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, "build", "qa")
DIST = os.path.join(ROOT, "dist")
ATTR = re.compile(r"""(?:href|src)=["']([^"']+)["']""")
BASE = re.compile(r"""<base\s+href=["']([^"']+)["']""")
EXTERNAL = ("http://", "https://", "mailto:", "data:", "javascript:", "tel:")


def main():
    if not os.path.isfile(os.path.join(DIST, "index.html")):
        print("dist/index.html is missing: run `npm run build` first")
        return 2
    broken = {}
    external = set()
    pages = sorted(glob.glob(os.path.join(DIST, "**", "*.html"), recursive=True))
    for page in pages:
        with open(page, encoding="utf-8", errors="replace") as handle:
            text = handle.read()
        rel = os.path.relpath(page, DIST).replace("\\", "/")
        base_dir = os.path.dirname(page)
        base_tag = BASE.search(text)
        if base_tag:
            base_dir = os.path.join(DIST, base_tag.group(1).strip("/"))
        for target in ATTR.findall(text):
            if target.startswith(EXTERNAL):
                external.add(target)
                continue
            if target.startswith("#"):
                continue
            clean = unquote(target.split("#")[0].split("?")[0])
            if not clean:
                continue
            if clean.startswith("/"):
                candidate = os.path.join(DIST, clean.lstrip("/"))
            else:
                candidate = os.path.normpath(os.path.join(base_dir, clean))
            if os.path.isdir(candidate):
                candidate = os.path.join(candidate, "index.html")
            if not os.path.isfile(candidate):
                broken.setdefault(target, []).append(rel)

    print(f"{len(pages)} pages scanned; {len(external)} distinct external targets")
    for target, where in sorted(broken.items()):
        more = f" (+{len(where) - 1} more)" if len(where) > 1 else ""
        print(f"BROKEN {target}  <- {where[0]}{more}")
    print(f"{len(broken)} broken internal targets")
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, "external-links.txt"), "w", encoding="utf-8") as handle:
        handle.write("\n".join(sorted(external)) + "\n")
    return 1 if broken else 0


if __name__ == "__main__":
    sys.exit(main())
