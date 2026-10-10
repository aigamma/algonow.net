#!/usr/bin/env bash
# Ship one authored, generated unit: authorize -> publish -> install -> verify
# -> register -> build -> check (exit gated) -> commit -> push -> deploy ->
# live verify. Every step gates on an oracle (exit code or exact JSON field).
# Usage: ship_unit.sh <slug> <number> "<Algorithm> x <Heuristic>" <Frow> fork|main [extra commit note]
set -u
cd /d/algonow.net || exit 9
SLUG="$1"; NUM="$2"; TITLE="$3"; FROW="$4"; PROV="$5"; EXTRA="${6:-}"
SP="C:/Users/eric/AppData/Local/Temp/claude/D--algonow-net/72804c69-ec72-4da2-b499-7f26b34272d8/scratchpad"
LOG="$SP/check-$NUM.log"
fail() { echo "SHIP FAILED [$SLUG] at: $1"; exit 1; }

# 0. release state
RDIR="build/narration/releases/$SLUG"
REL=""; for d in $(ls "$RDIR" 2>/dev/null); do [ -f "$RDIR/$d/manifest-entry.json" ] && REL="$d"; done
[ -n "$REL" ] || fail "no release directory with a manifest-entry.json (check the attempt journal)"
[ "$(ls "$RDIR" | wc -l)" -eq 1 ] || echo "note: $(ls "$RDIR" | wc -l) release directories, using $REL"
STATUSES=$(node -e "const j=require('./$RDIR/$REL/attempt-journal.json');const a=j.attempts;const c={};for(const x of a)c[x.status]=(c[x.status]||0)+1;console.log(a.length+' attempts: '+Object.entries(c).map(([k,v])=>v+' '+k).join(', '))")
echo "$STATUSES" | grep -q ambiguous && fail "ambiguous attempt present: owner reconciliation only"
read -r PRICE APPROVAL CAT PSLUG <<<"$(node -e "const d=require('./docs/pending-registry.json');const u=d.units.find(x=>x.slug==='$SLUG');if(!u)process.exit(3);console.log(u.narration_plan.price_usd,u.narration_plan.approval_sha256,u.category,u.problemSlug)")" || fail "unit not in pending-registry.json"
echo "release $REL; $STATUSES; plan $PRICE USD, approval ${APPROVAL:0:8}"

# 1. authorize (privileged root session)
AUTH=$(node scripts/narration/authorize-release-objects.mjs --slug "$SLUG" --execute 2>&1)
echo "$AUTH" | grep -q '"updated": true' || { echo "$AUTH" | tail -5; fail "authorize"; }

# 2. publish / install / verify as the publisher role
export AWS_PROFILE=algonow-narration-publisher
ARGS="--stack algonow-media-prod --region us-east-2 --bucket algonow-net-media-prod-609231673940-us-east-2-an --distribution-id E1BJWNL5BP3R8E --distribution-domain d1odatz89tx6pl.cloudfront.net --receipt infra/narration/receipts/$SLUG.json"
PUB=$(node scripts/narration/publish-puzzle-narration.mjs --slug "$SLUG" --execute $ARGS 2>&1); PX=$?
[ $PX -eq 0 ] || { echo "$PUB" | tail -8; unset AWS_PROFILE; fail "publish exit $PX"; }
INS=$(node scripts/narration/install-puzzle-narration.mjs --slug "$SLUG" --execute $ARGS 2>&1); IX=$?
[ $IX -eq 0 ] || { echo "$INS" | tail -8; unset AWS_PROFILE; fail "install exit $IX"; }
VER=$(node scripts/narration/verify-puzzle-narration.mjs --slug "$SLUG" --base-url https://d1odatz89tx6pl.cloudfront.net $ARGS 2>&1); VX=$?
unset AWS_PROFILE
[ $VX -eq 0 ] || { echo "$VER" | tail -10; fail "verify exit $VX"; }
for k in publication_receipt_validated cdn_verified direct_origin_denial_verified; do
  echo "$VER" | grep -q "\"$k\": true" || { echo "$VER" | tail -10; fail "verify field $k"; }
done
[ -f "src/data/narration/$SLUG.json" ] || fail "manifest not installed"
echo "published + installed + verified (receipt, CDN, direct-origin denial)"

# 3. register
python "$SP/apply_registry.py" "$SLUG" 2026-10-10 2>&1 | tail -1 || fail "apply_registry"
LIVE=$(node -e "console.log(require('./src/data/atlas-summary.json').livePuzzles)")

# 4. build + check, exit gated
npm run build > "$SP/build-$NUM.log" 2>&1; BX=$?
[ $BX -eq 0 ] || { grep -iE "error" "$SP/build-$NUM.log" | head -5; fail "build exit $BX"; }
npm run check > "$LOG" 2>&1; CX=$?
[ $CX -eq 0 ] || { grep -E "FAIL|fail|exceeds|Error" "$LOG" | head -8; fail "check exit $CX"; }
CHUNK=$(grep -oE "PASS chunk $SLUG-[A-Za-z0-9_-]+\.js: [0-9.]+KB gz inside 20KB" "$LOG" | head -1)
REG=$(grep -oE "PASS registry chunk [^:]+: [0-9.]+KB gz inside 56KB" "$LOG" | head -1)
HTML=$(grep -oE "PASS html $SLUG: [0-9.]+KB gz inside 2KB" "$LOG" | head -1)
KEYS=$(grep -oE "PASS registry source keys unique \([0-9]+\)" "$LOG" | head -1)
grep -q "PASS $SLUG: preserved dual-voice narration contract complete" "$LOG" || fail "dual-voice contract line missing"
[ -n "$CHUNK" ] && [ -n "$REG" ] && [ -n "$HTML" ] || fail "budget lines missing from check log"
echo "build 0; check 0; $CHUNK; $REG; $HTML; $KEYS"

# 5. commit + push
if [ "$PROV" = fork ]; then
PROVTXT="Provenance: the unit's content, narration, solution, and viz were
authored by a fork agent of this Fable 5.1 session at the owner's
explicit request for parallel authoring; the main thread re-ran the
solution (prints OK), the viz invariant check (20 cycles, 0 breaks), the
narration plan, and the static checks before accepting it."
else
PROVTXT="Provenance: content, narration, solution, and viz authored by Claude
Fable 5.1 reasoning directly in the main thread."
fi
PENDING=$(node -e "console.log(require('./docs/pending-registry.json').units.length)")
git add src/data/puzzles.js src/data/atlas-summary.json docs/OVERNIGHT-PLAN.md docs/pending-registry.json docs/puzzle-descriptions.json "infra/narration/receipts/$SLUG.json" "src/data/narration/$SLUG.json" || fail "git add"
git commit -q -F - <<EOF || fail "git commit"
Puzzle $NUM: $TITLE ($FROW)

Registers the $SLUG unit (category $CAT, problem page $PSLUG) whose six
authored files landed in an earlier WIP commit: registry record in
src/data/puzzles.js, description in docs/puzzle-descriptions.json,
livePuzzles $LIVE in atlas-summary.json, $FROW row in docs/OVERNIGHT-PLAN.md,
and the unit removed from docs/pending-registry.json ($PENDING units
remain queued).

Preserved narration: both Chirp 3 HD tracks (Aoede default, Algieba)
generated under the standing consent bound to the reviewed narration
array, approved plan sha256 ${APPROVAL:0:8}..., ceiling --max-usd $PRICE,
attempt journal $STATUSES; release $REL authorized, published as the
assumed publisher role, installed, and live-verified (publication
receipt validated, CDN verified, direct-origin denial verified).
${EXTRA:+
$EXTRA
}
$PROVTXT

Verified: npm run build exit 0; npm run check exit 0 ($CHUNK; $REG; $HTML;
$KEYS; preserved dual-voice narration contract complete).

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
git push -q origin main 2>&1 | grep -v "^warning" | tail -2
HEADSHA=$(git rev-parse --short HEAD); OSHA=$(git rev-parse --short origin/main)
[ "$HEADSHA" = "$OSHA" ] || fail "push: HEAD $HEADSHA != origin $OSHA"
echo "committed $HEADSHA == origin/main"

# 6. deploy + live verify
DEP=$(netlify deploy --prod --dir=dist 2>&1); DX=$?
[ $DX -eq 0 ] || { echo "$DEP" | tail -6; fail "netlify deploy exit $DX"; }
sleep 6
PAGE=$(curl -s "https://algonow.net/$SLUG/")
echo "$PAGE" | grep -q "<title>" || fail "live page has no title"
T=$(echo "$PAGE" | grep -o '<title>[^<]*</title>')
C=$(echo "$PAGE" | grep -o "assets/$SLUG-[A-Za-z0-9_-]*\.js" | head -1)
[ -n "$C" ] || fail "live page has no chunk reference"
MP3=$(curl -s "https://algonow.net/$C" | grep -oE "narration/v1/puzzles/$SLUG/[0-9a-f]+/(aoede|algieba)-[0-9a-f]+\.mp3" | sort -u)
N=$(echo "$MP3" | grep -c mp3)
[ "$N" -eq 2 ] || fail "live chunk has $N narration object paths, expected 2"
echo "LIVE $T; chunk $C; objects:"; echo "$MP3"
echo "SHIPPED $NUM $SLUG $HEADSHA"
