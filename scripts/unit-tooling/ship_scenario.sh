#!/usr/bin/env bash
# Ship one authored, generated engineering scenario once the privileged AWS
# session is valid (aws login): authorize -> publish -> install -> verify ->
# register as published -> check-engineering -> build -> check (exit gated)
# -> commit -> push -> deploy to the algonow-net Netlify site -> live verify.
# Every step gates on an exit code or an exact JSON field.
# Usage: ship_scenario.sh <slug> <listenMinutes> <YYYY-MM-DD> [broker-user-arn]
# Pass the broker ARN only when the publisher role's trust policy shows an
# orphaned AIDA... principal (a previous session deleted its broker user).
set -u
cd "$(dirname "$0")/../.." || exit 9
SLUG="$1"; LISTEN="$2"; DATE="$3"; BROKER_ARN="${4:-}"
NETLIFY_SITE_ID="${NETLIFY_SITE_ID:-3252f082-19e9-4f1c-af54-355fda8ed7cf}"   # algonow-net; never trust .netlify/state.json alone
LOGS="build/ship-logs"; mkdir -p "$LOGS"
fail() { echo "SHIP FAILED [$SLUG] at: $1"; exit 1; }

# 0. release state and session
RDIR="build/narration/releases/$SLUG"
REL=""; for d in $(ls "$RDIR" 2>/dev/null); do [ -f "$RDIR/$d/manifest-entry.json" ] && REL="$d"; done
[ -n "$REL" ] || fail "no release directory with a manifest-entry.json (generate first)"
STATUSES=$(node -e "const j=require('./$RDIR/$REL/attempt-journal.json');const a=j.attempts;const c={};for(const x of a)c[x.status]=(c[x.status]||0)+1;console.log(a.length+' attempts: '+Object.entries(c).map(([k,v])=>v+' '+k).join(', '))")
echo "$STATUSES" | grep -q ambiguous && fail "ambiguous attempt present: owner reconciliation only"
echo "release $REL; $STATUSES"
aws sts get-caller-identity --region us-east-2 >/dev/null 2>&1 || fail "privileged AWS session is not valid (run aws login in a real console)"

# 1. authorize (privileged root session; optional broker rotation)
AUTH=$(node scripts/narration/authorize-release-objects.mjs --slug "$SLUG" --execute ${BROKER_ARN:+--broker-arn "$BROKER_ARN"} 2>&1)
echo "$AUTH" | grep -q '"updated": true' || { echo "$AUTH" | tail -8; fail "authorize"; }

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

# 3. register as published (only this slug's record)
python - "$SLUG" "$LISTEN" "$DATE" <<'EOF' || fail "registry flip"
import sys, pathlib
slug, listen, date = sys.argv[1:4]
p = pathlib.Path("src/data/engineering.js"); s = p.read_text(encoding="utf-8")
i = s.index(f"slug: '{slug}'"); j = s.index("status: 'draft',", i)
s = s[:j] + f"status: 'published', added: '{date}', listenMinutes: {int(listen)}," + s[j + len("status: 'draft',"):]
p.write_text(s, encoding="utf-8"); print("registered", slug, "published", date, "listenMinutes", listen)
EOF

# 4. checks, build, check: exit gated
node scripts/check-engineering.mjs --run-python > "$LOGS/$SLUG-check-engineering.log" 2>&1 || { tail -5 "$LOGS/$SLUG-check-engineering.log"; fail "check-engineering"; }
npm run build > "$LOGS/$SLUG-build.log" 2>&1; BX=$?
[ $BX -eq 0 ] || { grep -iE "error" "$LOGS/$SLUG-build.log" | head -5; fail "build exit $BX"; }
npm run check > "$LOGS/$SLUG-check.log" 2>&1; CX=$?
[ $CX -eq 0 ] || { grep -E "FAIL|fail|exceeds|Error" "$LOGS/$SLUG-check.log" | head -8; fail "check exit $CX"; }
CHUNK=$(grep -oE "PASS chunk scenario-$SLUG-[A-Za-z0-9_-]+\.js: [0-9.]+KB gz inside 20KB" "$LOGS/$SLUG-check.log" | head -1)
[ -n "$CHUNK" ] || fail "page chunk budget line missing from check log"
grep -q "/scenarios/$SLUG/" dist/index.html || fail "prerendered home does not list the scenario"
echo "build 0; check 0; $CHUNK"

# 5. commit + push
git add src/data/engineering.js "infra/narration/receipts/$SLUG.json" "src/data/narration/$SLUG.json" || fail "git add"
git commit -q -F - <<EOF || fail "git commit"
Scenario published: $SLUG

Registers $SLUG as published in src/data/engineering.js (added $DATE,
listenMinutes $LISTEN), which puts its card on Home through LIVE_SCENARIOS,
and installs the receipt-bound public narration manifest.

Preserved narration: both Chirp 3 HD tracks (Aoede default, Algieba) were
generated under the standing consent bound to the reviewed narration array
($STATUSES); release $REL authorized, published as the assumed publisher
role, installed, and live-verified (publication receipt validated, CDN
verified, direct-origin denial verified).

Verified: check-engineering --run-python PASS; npm run build exit 0;
npm run check exit 0 ($CHUNK); the prerendered Home lists /scenarios/$SLUG/.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
git push -q origin main 2>&1 | grep -v "^warning" | tail -2
HEADSHA=$(git rev-parse --short HEAD); OSHA=$(git rev-parse --short origin/main)
[ "$HEADSHA" = "$OSHA" ] || fail "push: HEAD $HEADSHA != origin $OSHA"
echo "committed $HEADSHA == origin/main"

# 6. deploy to the algonow-net site explicitly, then live verify with retries
DEP=$(netlify deploy --prod --dir=dist --site "$NETLIFY_SITE_ID" 2>&1); DX=$?
[ $DX -eq 0 ] || { echo "$DEP" | tail -6; fail "netlify deploy exit $DX"; }
echo "$DEP" | grep -q "Deploy complete" || { echo "$DEP" | tail -6; fail "netlify deploy did not report completion"; }
HOME_OK=""; for i in 1 2 3 4 5 6 7 8 9; do
  curl -s -H 'Cache-Control: no-cache' "https://algonow.net/" | grep -q "/scenarios/$SLUG/" && { HOME_OK=1; break; }; sleep 10; done
[ -n "$HOME_OK" ] || fail "live home does not list the scenario after 90 seconds"
PAGE=$(curl -s -H 'Cache-Control: no-cache' "https://algonow.net/scenarios/$SLUG/")
T=$(echo "$PAGE" | grep -o '<title>[^<]*</title>'); [ -n "$T" ] || fail "live page has no title"
C=$(echo "$PAGE" | grep -o "assets/scenario-$SLUG-[A-Za-z0-9_-]*\.js" | head -1); [ -n "$C" ] || fail "live page has no chunk reference"
NARR=$(curl -s "https://algonow.net/$C" | grep -oE "narration-$SLUG-[A-Za-z0-9_-]+\.js" | head -1)
[ -n "$NARR" ] || fail "page chunk does not reference its narration manifest chunk"
MP3=$(curl -s "https://algonow.net/assets/$NARR" | grep -oE "narration/v1/puzzles/$SLUG/[0-9a-f]+/(aoede|algieba)-[0-9a-f]+\.mp3" | sort -u)
N=$(echo "$MP3" | grep -c mp3)
[ "$N" -eq 2 ] || fail "live manifest chunk has $N narration object paths, expected 2"
for key in $MP3; do code=$(curl -s -o /dev/null -w '%{http_code}' -I "https://d1odatz89tx6pl.cloudfront.net/$key"); [ "$code" = "200" ] || fail "CDN HEAD $code for $key"; done
echo "LIVE $T; home lists the card; page chunk $C; manifest chunk $NARR; objects:"; echo "$MP3"
echo "SHIPPED $SLUG $HEADSHA"
