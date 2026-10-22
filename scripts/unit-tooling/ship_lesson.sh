#!/usr/bin/env bash
# Main thread only, one lesson at a time: credential-free narration plan, paid
# generation under the standing consent (exact pending price and approval hash
# taken from that plan; the generator holds the exclusive lock), then
# ship_scenario.sh (publish, install, verify, registry flip, checks, build,
# commit, push, deploy, live probes), then live frame captures at the given
# seconds into build/shots/<slug>/. Requires a valid privileged AWS session.
# Usage: bash scripts/unit-tooling/ship_lesson.sh <slug> <listenMinutes> [<seconds>...]
# GENERATE_ONLY=1 stops after the narration is generated (no AWS needed yet).
set -u
TOOLS="$(cd "$(dirname "$0")" && pwd)"
cd "$TOOLS/../.." || exit 9
SLUG="$1"; LISTEN="$2"; shift 2; SECONDS_LIST="$*"
DATE="${SHIP_DATE:-$(date +%Y-%m-%d)}"
mkdir -p build
fail() { echo "SHIP-LESSON FAILED [$SLUG] at: $1"; exit 1; }

node scripts/narration/generate-puzzle-narration.mjs --slug "$SLUG" > "build/narration-plan-$SLUG.log" 2>&1 || { tail -20 "build/narration-plan-$SLUG.log"; fail "narration plan"; }
read -r PRICE HASH CHARS < <(python - "build/narration-plan-$SLUG.log" <<'EOF'
import json, sys, pathlib
raw = pathlib.Path(sys.argv[1]).read_text(encoding="utf-8")
doc = json.loads(raw[raw.index("{"):raw.rindex("}") + 1])
print(doc["pending_list_price_usd_exact"], doc["approval_sha256"], doc["source_characters"])
EOF
)
[ -n "$PRICE" ] && [ -n "$HASH" ] || fail "plan fields"
echo "plan: $CHARS characters, pending \$$PRICE, approval $HASH"

REL=$(node --input-type=module -e "
import { buildPuzzleNarrationPlan } from './scripts/narration/puzzle-narration-pipeline.mjs';
const { narration } = await import('./src/content/$SLUG.narration.js');
console.log(buildPuzzleNarrationPlan({ slug: '$SLUG', narration, sourcePath: 'src/content/$SLUG.narration.js' }).releasePrefix);" 2>/dev/null)
[ -n "$REL" ] || fail "release prefix"
# A release that is already complete on disk (both tracks, every attempt
# persisted) is not generated again: the ship can be retried without spending.
COMPLETE=$(node -e "const fs=require('fs');const d='build/narration/releases/$SLUG/$REL';try{const j=require('./'+d+'/attempt-journal.json');const mp3=fs.readdirSync(d).filter(f=>f.endsWith('.mp3')).length;console.log(mp3===2&&j.attempts.length>0&&j.attempts.every(a=>a.status==='persisted')?'yes':'no')}catch(e){console.log('no')}")
if [ "$COMPLETE" = "yes" ]; then
  echo "release $REL already generated and complete; skipping generation"
else
  node scripts/narration/generate-puzzle-narration.mjs --slug "$SLUG" --execute --project aigamma --max-usd "$PRICE" --approved-plan-sha256 "$HASH" > "build/narration-generate-$SLUG.log" 2>&1; GX=$?
  [ $GX -eq 0 ] || { tail -30 "build/narration-generate-$SLUG.log"; fail "generation exit $GX"; }
fi
SPENT=$(node -e "const j=require('./build/narration/releases/$SLUG/$REL/attempt-journal.json');let m=0,c=0;for(const x of j.attempts){m+=Number(x.cost_microdollars);c+=Number(x.characters)}console.log((m/1e6).toFixed(6)+' usd for '+c+' characters; '+j.attempts.map(x=>x.status).join(','))")
echo "generated release $REL: $SPENT"
ls "build/narration/releases/$SLUG/$REL/"*.mp3 >/dev/null 2>&1 || fail "mp3 objects missing"

if [ -n "${GENERATE_ONLY:-}" ]; then echo "GENERATE-ONLY DONE $SLUG ($SPENT)"; exit 0; fi
bash scripts/unit-tooling/ship_scenario.sh "$SLUG" "$LISTEN" "$DATE" > "build/ship-$SLUG.log" 2>&1; SX=$?
grep -v "^warning" "build/ship-$SLUG.log"
[ $SX -eq 0 ] || fail "ship exit $SX"
grep -q "^SHIPPED $SLUG" "build/ship-$SLUG.log" || fail "ship did not print SHIPPED"

if [ -n "$SECONDS_LIST" ]; then
  python "$TOOLS/capture_viz.py" "build/shots/$SLUG" "https://algonow.net/scenarios/$SLUG/" $SECONDS_LIST 2>&1 | tail -5
fi
echo "SHIP-LESSON DONE $SLUG ($SPENT)"
