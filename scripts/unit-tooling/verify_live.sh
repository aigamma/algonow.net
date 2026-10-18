#!/usr/bin/env bash
# Independent live probe of published lessons: Home card, title, page chunk,
# manifest chunk, and HEAD 200 audio/mpeg for both narration objects.
# Usage: bash scripts/unit-tooling/verify_live.sh <slug> [<slug> ...]
HOME_HTML=$(curl -s -H 'Cache-Control: no-cache' "https://algonow.net/")
for SLUG in "$@"; do
  echo "$HOME_HTML" | grep -q "/scenarios/$SLUG/" && HOMECARD=yes || HOMECARD=NO
  PAGE=$(curl -s -H 'Cache-Control: no-cache' "https://algonow.net/scenarios/$SLUG/")
  T=$(echo "$PAGE" | grep -o '<title>[^<]*</title>' | sed 's/<[^>]*>//g')
  C=$(echo "$PAGE" | grep -o "assets/scenario-$SLUG-[A-Za-z0-9_-]*\.js" | head -1)
  NARR=$(curl -s "https://algonow.net/$C" | grep -oE "narration-$SLUG-[A-Za-z0-9_-]+\.js" | head -1)
  CODES=""
  for key in $(curl -s "https://algonow.net/assets/$NARR" | grep -oE "narration/v1/puzzles/$SLUG/[0-9a-f]+/(aoede|algieba)-[0-9a-f]+\.mp3" | sort -u); do
    CODES="$CODES $(curl -s -o /dev/null -w '%{http_code}/%{content_type}' -I "https://d1odatz89tx6pl.cloudfront.net/$key")"
  done
  echo "$SLUG | home card $HOMECARD | $T | chunk ${C:+yes} | manifest ${NARR:+yes} | audio$CODES"
done
