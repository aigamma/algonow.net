"""Move one unit from docs/pending-registry.json into the live registry.

usage: python apply_registry.py <slug> <added YYYY-MM-DD> [next-bench-slug|none]

Edits: src/data/puzzles.js (new PUZZLES record appended, ROADMAP set to the
next pending unit or the given pair), src/data/atlas-summary.json
(livePuzzles + 1), docs/OVERNIGHT-PLAN.md (the F row inserted after the last
F row), docs/pending-registry.json (the unit removed; file deleted when empty).
"""
import json
import re
import sys
import textwrap

slug, added = sys.argv[1], sys.argv[2]
bench_override = sys.argv[3] if len(sys.argv) > 3 else None

pending_path = 'docs/pending-registry.json'
pending = json.load(open(pending_path, encoding='utf8'))
unit = next(u for u in pending['units'] if u['slug'] == slug)
rest = [u for u in pending['units'] if u['slug'] != slug]


def js_str(value):
    return "'" + value.replace("\\", "\\\\").replace("'", "\\'") + "'"


record = (
    f"  '/{slug}/': {{\n"
    f"    slug: {js_str(slug)},\n"
    f"    added: {js_str(added)},\n"
    f"    problemSlug: {js_str(unit['problemSlug'])},\n"
    f"    number: {unit['number']},\n"
    f"    category: {js_str(unit['category'])},\n"
    f"    algorithm: {js_str(unit['algorithm'])},\n"
    f"    heuristic: {js_str(unit['heuristic'])},\n"
    f"    domain: {js_str(unit['domain'])},\n"
    f"    oneLiner:\n      {js_str(unit['oneLiner'])},\n"
    f"    listenMinutes: {unit['listenMinutes']},\n"
    f"    time: {js_str(unit['time'])},\n"
    f"    space: {js_str(unit['space'])},\n"
    f"    baseline: {js_str(unit['baseline'])},\n"
    f"    vite: {js_str(slug)},\n"
    f"    html: {js_str(slug + '/index.html')},\n"
    f"  }},\n"
)

p = 'src/data/puzzles.js'
s = open(p, encoding='utf8').read()
anchor = "\n};\n\n// Planned pairs."
assert s.count(anchor) == 1, 'PUZZLES closing anchor not found'
s = s.replace(anchor, "\n" + record.rstrip("\n") + "\n};\n\n// Planned pairs.")
# the record above starts with two spaces; the previous entry ends with "  },"; ensure no blank line issues
s = s.replace("  },\n\n  '/" + slug + "/'", "  },\n  '/" + slug + "/'")

# bench
m = re.search(r"export const ROADMAP = \[\n(.*?)\n\];", s, re.S)
assert m, 'ROADMAP not found'
if bench_override and bench_override != 'none':
    alg, heur, dom = bench_override.split('|')
    bench_line = f"  {{ algorithm: {js_str(alg)}, heuristic: {js_str(heur)}, domain: {js_str(dom)} }},"
elif rest:
    nxt = rest[0]
    bench_line = f"  {{ algorithm: {js_str(nxt['algorithm'])}, heuristic: {js_str(nxt['heuristic'])}, domain: {js_str(nxt['domain'])} }},"
else:
    bench_line = m.group(1)
s = s[:m.start(1)] + bench_line + s[m.end(1):]
open(p, 'w', encoding='utf8', newline='\n').write(s)

# the measured description lives outside the client registry
dp = 'docs/puzzle-descriptions.json'
dd = json.load(open(dp, encoding='utf8'))
dd['descriptions'][slug] = unit['description']
open(dp, 'w', encoding='utf8', newline='\n').write(json.dumps(dd, indent=1, ensure_ascii=False) + '\n')

p = 'src/data/atlas-summary.json'
t = open(p, encoding='utf8').read()
cur = int(re.search(r'"livePuzzles":(\d+)', t).group(1))
# livePuzzles must equal the registry's record count (npm run check enforces
# it); derive it from puzzles.js rather than incrementing, since puzzle
# numbers are no longer monotone with the live count (172 is blocked and
# later units ship out of numeric order).
live_count = len(re.findall(r"^  '/[a-z0-9-]+/': \{", s, flags=re.M))
assert live_count > cur, (live_count, cur)
t = t.replace(f'"livePuzzles":{cur}', f'"livePuzzles":{live_count}')
open(p, 'w', encoding='utf8', newline='\n').write(t)

p = 'docs/OVERNIGHT-PLAN.md'
d = open(p, encoding='utf8').read()
row_text = f"{unit['plan_row_id']}. {unit['plan_row']} Added {added}."
wrapped = textwrap.fill(row_text, width=72, initial_indent='- [x] ', subsequent_indent='      ', break_long_words=False, break_on_hyphens=False)
anchor = "\n\n- [x] HONESTY PASS"
assert d.count(anchor) == 1, 'HONESTY PASS anchor not found'
d = d.replace(anchor, "\n\n" + wrapped + anchor)
open(p, 'w', encoding='utf8', newline='\n').write(d)

pending['units'] = rest
if rest:
    open(pending_path, 'w', encoding='utf8', newline='\n').write(json.dumps(pending, indent=1, ensure_ascii=False) + '\n')
else:
    import os
    os.remove(pending_path)
print(f"registered {slug} as puzzle {unit['number']} ({unit['plan_row_id']}); pending left: {len(rest)}; bench: {bench_line.strip()}")
