"""Prose and metadata defect scan over the lessons and every narration.

Reads the lesson pages, every narration source (legacy and lessons), the
engineering registry, and the lesson Python packages, and prints each
candidate defect with file:line and a context window. Nothing here edits a
file. Exit 1 when any candidate remains, so the scan can gate a release; the
spoken forms below are the reviewed false positives (2026-10-21) and are
skipped by exact phrase.

Checks: em and en dashes and the forbidden word (BAD_WORDS), a doubled word,
"a" before a vowel sound, "an" before a consonant, a double space inside a
narration string, a lesson page link to a page that does not exist, and a
registry listenMinutes more than a minute and a half from the Aoede track's
length at the default rate.

Run with: python -I scripts/qa/scan-prose.py <repo root>
"""
import glob
import json
import os
import re
import sys

ROOT = sys.argv[1] if len(sys.argv) > 1 else "."
os.chdir(ROOT)
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

NUMBER_WORDS = {
    "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
    "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen",
    "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety", "hundred", "thousand", "million",
    "point", "log", "that", "had", "is", "in", "on", "it", "the", "very", "many", "half",
}
DOUBLED = re.compile(r"\b([A-Za-z]+) \1\b")
A_VOWEL = re.compile(r"\ba ([aeio][a-z]*)\b")
A_STOP = {
    "and", "are", "its", "into", "onto", "over", "also", "else", "even", "ever", "only", "own", "all", "any",
    "until", "upon", "under", "after", "about", "above", "again", "along", "among", "around", "other", "often",
    "already", "always", "either", "every", "exactly", "or", "at", "as", "if", "is", "of", "in", "on", "out", "up",
    "one", "once", "onetime", "user", "users", "use", "used", "uses", "url", "urls", "euro", "eu", "ui", "unique",
    "unit", "units", "union", "unified", "uniform", "universal", "usual", "usable", "utility", "useful", "useless",
    "i", "a", "e", "o", "equals", "equal", "em", "en", "id", "ids", "ok", "io", "etc", "eg", "ie",
}
AN_CONS = re.compile(r"\ban ([bcdfgjklmnpqrstvwxyz][a-z]*)\b")
AN_OK = {
    "hour", "hours", "hourly", "honest", "honour", "honor", "heir", "http", "https", "html", "lru", "mrr", "ndcg",
    "sft", "nan", "mp", "xml", "f1", "llm", "sha", "n", "s", "m", "l", "r", "x", "f", "h", "lr", "ssd", "sql",
    "svg", "rrt", "rsa", "mst", "lsh", "ml", "nlp", "md", "mb", "fp", "fn", "rc", "ssl", "sdk", "sgd",
    "nth", "xor", "mcp", "ltl", "lz", "rgb", "rl", "sat", "scc", "xs", "ms", "mdp",
}
BAD_WORDS = ("heart" + "beat", "—", "–")

# Spoken forms that read as defects to the regexes but are right for the ear:
# symbols read as words ("k-means plus plus", "C plus plus", "or and and",
# "dot dot dot"), named conflicts ("first first"), a pair of booleans, a hash
# that "keeps neighbors neighbors", and a single-letter variable after "a"
# ("a exclusive or b", "not a implies b", "the all a adversary").
SPOKEN_FORMS = {
    "plus plus", "first first", "and and", "dot dot", "true true", "false false", "neighbors neighbors",
    "a exclusive", "a implies", "a adversary",
}


def lines_of(path):
    with open(path, encoding="utf-8") as handle:
        return handle.read().split("\n")


def window(line, start, end, radius=38):
    return line[max(0, start - radius):end + radius].strip()


def scan_text_files(paths, label):
    hits = 0
    for path in paths:
        for number, line in enumerate(lines_of(path), 1):
            low = line.lower()
            for word in BAD_WORDS:
                index = low.find(word)
                if index >= 0:
                    print(f"{label} BAD-WORD {path}:{number}: {word!r}: {window(line, index, index + len(word))}")
                    hits += 1
            for match in DOUBLED.finditer(line):
                word = match.group(1).lower()
                if word in NUMBER_WORDS or len(word) == 1 or match.group(0).lower() in SPOKEN_FORMS:
                    continue
                print(f"{label} DOUBLED {path}:{number}: {match.group(0)!r}: {window(line, match.start(), match.end())}")
                hits += 1
            for match in A_VOWEL.finditer(line):
                word = match.group(1).lower()
                if word in A_STOP or len(word) < 3 or match.group(0).lower() in SPOKEN_FORMS:
                    continue
                print(f"{label} A-VOWEL {path}:{number}: {match.group(0)!r}: {window(line, match.start(), match.end())}")
                hits += 1
            for match in AN_CONS.finditer(line):
                word = match.group(1).lower()
                if word in AN_OK or word.startswith(("hour", "honest", "honor")):
                    continue
                print(f"{label} AN-CONS {path}:{number}: {match.group(0)!r}: {window(line, match.start(), match.end())}")
                hits += 1
            if label == "NARR":
                for inner in re.findall(r"['\"]([^'\"]*  [^'\"]*)['\"]", line):
                    print(f"{label} DOUBLE-SPACE {path}:{number}: {inner[:90]!r}")
                    hits += 1
    return hits


def scan_links():
    hits = 0
    with open("src/data/engineering.js", encoding="utf-8") as handle:
        registry = handle.read()
    live = set(re.findall(r"slug: '([a-z0-9-]+)'", registry))
    for path in sorted(glob.glob("scenarios/*/content.jsx")):
        with open(path, encoding="utf-8") as handle:
            text = handle.read()
        for target in re.findall(r"(?:href|to)=[\"']([^\"']+)[\"']", text):
            if target.startswith("http"):
                continue
            clean = target.split("#")[0].split("?")[0]
            if not clean:
                continue
            ok = (
                os.path.exists(os.path.join(clean.strip("/"), "index.html"))
                or os.path.exists(clean.strip("/"))
                or (clean.startswith("/scenarios/") and clean.strip("/").split("/")[-1] in live)
                or clean in ("/", "/atlas/", "/scenarios/", "/puzzles/", "/legacy/")
            )
            if not ok:
                print(f"LINK MISSING {path}: {target}")
                hits += 1
    return hits


def track_minutes(slug):
    """Minutes of the Aoede track at the manifest's default rate, from its byte
    count (Chirp 3 HD MP3 is 32 kbps, measured with ffprobe)."""
    manifest_path = f"src/data/narration/{slug}.json"
    if not os.path.exists(manifest_path):
        return None
    with open(manifest_path, encoding="utf-8") as handle:
        manifest = json.load(handle)
    track = (manifest.get("tracks") or {}).get("aoede") or {}
    if not isinstance(track.get("bytes"), int):
        return None
    seconds = track["bytes"] * 8 / 32001
    return seconds / 60 / float(manifest.get("default_rate") or 1.25)


def registry_minutes(path, kind):
    """(kind, slug, listenMinutes) for every record of a registry file: each
    record has one slug line, and its listenMinutes sits between that slug and
    the next one, whatever the record delimiters look like."""
    with open(path, encoding="utf-8") as handle:
        text = handle.read()
    slugs = list(re.finditer(r"slug: '([a-z0-9-]+)'", text))
    pairs = []
    for index, match in enumerate(slugs):
        end = slugs[index + 1].start() if index + 1 < len(slugs) else len(text)
        minutes = re.search(r"listenMinutes: (\d+)", text[match.end():end])
        if minutes:
            pairs.append((kind, match.group(1), int(minutes.group(1))))
    return pairs


def scan_minutes():
    hits = 0
    pairs = registry_minutes("src/data/engineering.js", "scenario") + registry_minutes("src/data/puzzles.js", "legacy")
    checked = 0
    for kind, slug, minutes in pairs:
        actual = track_minutes(slug)
        if actual is None:
            continue
        checked += 1
        if abs(actual - minutes) > 1.5:
            print(f"MINUTES {kind} {slug}: registry says {minutes} min, aoede track is {actual:.1f} min at the default rate")
            hits += 1
    print(f"listen minutes checked for {checked} pages with manifests")
    return hits


def main():
    total = 0
    total += scan_text_files(sorted(glob.glob("scenarios/*/content.jsx")), "PAGE")
    total += scan_text_files(sorted(glob.glob("src/content/*.narration.js")), "NARR")
    total += scan_text_files(["src/data/engineering.js"], "REG")
    total += scan_text_files(sorted(glob.glob("scenarios/*/python/src/*/*.py")), "PY")
    total += scan_links()
    total += scan_minutes()
    print(f"{'FAIL' if total else 'PASS'} prose scan: {total} candidate line(s)")
    return 1 if total else 0


if __name__ == "__main__":
    sys.exit(main())
