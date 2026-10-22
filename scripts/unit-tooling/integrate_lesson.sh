#!/usr/bin/env bash
# Main-thread integration of ONE authored draft lesson, every step gated:
# per-slug structural + Python check, the figure's node test, the generic SSR
# contract, a real chunk measurement, then commit + push of the lesson files
# (the registry record stays a draft). Narration generation and publication
# follow with ship_lesson.sh. Never run two of these, or one beside a ship,
# at the same time: both write dist/ and git.
# Usage: bash scripts/unit-tooling/integrate_lesson.sh <slug> "<commit title>"
set -u
TOOLS="$(cd "$(dirname "$0")" && pwd)"
cd "$TOOLS/../.." || exit 9
SLUG="$1"; TITLE="$2"
mkdir -p build
LOG="build/integrate-$SLUG.log"; : > "$LOG"
fail() { echo "INTEGRATE FAILED [$SLUG] at: $1"; exit 1; }

node --input-type=module -e "
import { checkEngineering } from './scripts/check-engineering.mjs';
import { SCENARIOS } from './src/data/engineering.js';
const r = await checkEngineering({ scenarios: SCENARIOS.filter(s => s.slug === '$SLUG'), includeDrafts: true, runPython: true });
console.log(JSON.stringify(r));
process.exitCode = r.errors.length ? 1 : 0;" >> "$LOG" 2>&1 || { tail -c 1500 "$LOG"; fail "check-engineering (per slug, with python)"; }
echo "check-engineering: PASS"

node --test "tests/$SLUG-viz.test.mjs" >> "$LOG" 2>&1 || { grep -E "^not ok|Error|expected" "$LOG" | head -8; fail "viz test"; }
echo "viz test: PASS ($(grep -E '^# pass' "$LOG" | tail -1))"

node "$TOOLS/ssr_generic.mjs" "$SLUG" > "build/ssr-$SLUG.json" 2>&1 || { head -40 "build/ssr-$SLUG.json"; fail "ssr contract"; }
echo "ssr contract: PASS"

python "$TOOLS/measure_chunk_for.py" "$SLUG" > "build/chunk-$SLUG.log" 2>&1
grep -E "vite build exit|scenario-|LessonTimelineViz|OVER|restored" "build/chunk-$SLUG.log"
grep -q "vite build exit 0" "build/chunk-$SLUG.log" || fail "vite build"
grep -q "OVER 20KB" "build/chunk-$SLUG.log" && fail "page chunk over 20KB"
git diff --quiet -- src/data/engineering.js || fail "registry was not restored after measurement"
[ -f "src/data/narration/$SLUG.json" ] && fail "stub manifest left behind"

grep -rl $'\xe2\x80\x94' "scenarios/$SLUG" "src/content/$SLUG.narration.js" "tests/$SLUG-viz.test.mjs" 2>/dev/null | grep -v __pycache__ && fail "em dash present"
grep -rli "heart""beat" "scenarios/$SLUG" "src/content/$SLUG.narration.js" "tests/$SLUG-viz.test.mjs" 2>/dev/null | grep -v __pycache__ && fail "forbidden word present"

git add "scenarios/$SLUG" "src/content/$SLUG.narration.js" "tests/$SLUG-viz.test.mjs" || fail "git add"
if git diff --cached --quiet; then
  echo "INTEGRATED $SLUG (already committed, nothing new to stage) HEAD $(git rev-parse --short HEAD)"
  exit 0
fi
git commit -q -F - <<EOF || fail "git commit"
$TITLE

Authored by Claude Fable 5.1 and integrated by the main thread. The lesson
follows the worked-lesson master prompt: a tiny inline input, the complete
runnable solution first, its exact output, a construct-by-construct Python
walkthrough with a variable trace, a figure that replays the real run on the
lesson's own data, three alternatives, and one practice variation that
changes one behavior. The registry record stays a draft until the narration
release in the publication commit that follows.

Verified in the main thread: per-slug check-engineering with the Python
suite (run alone with python -I -S, byte-exact outputs) PASS; node --test on
the figure's model (trace equals the fixture the Python tests derive from the
real solution) PASS; the server-rendered page meets the worked-lesson contract
(section order, open solution, closed practice, no inventory); a real vite
build with a stub manifest keeps the page chunk under 20 KB gzipped (see the
publication commit for the measured size).

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
git push -q origin main 2>&1 | grep -v "^warning" | tail -1
H=$(git rev-parse --short HEAD); O=$(git rev-parse --short origin/main)
[ "$H" = "$O" ] || fail "push: HEAD $H != origin $O"
echo "INTEGRATED $SLUG $H == origin/main"
