# algonow.net

Classical algorithms, taught as **pairs**: the control structure (the
algorithm, blue on every surface) and the guiding rule (the heuristic, amber).
Each puzzle page is one polished unit: a live canvas of the algorithm actually
running, a streamlined written lesson, a tested Python solution, and a spoken
lesson behind the ▶ Listen button.

## The two forms

Every unit is written twice.

- **Tight form** (the page): puzzle card, the pair, street-level picture, the
  loop, signals, trade-offs, the code.
- **Spoken form** (the narration): a longer script written for the ear, with
  numbers spelled out and symbols read as words. New and converted pages use
  two preserved Chirp 3 HD tracks over that same complete script: Aoede female
  and Algieba male, with Aoede as the default. Legacy pages remain on browser
  speech only while the reviewed backfill is pending.

The mandatory policy for Fable-authored units is hard rule 4 in `CLAUDE.md`.
The production Kalman reference and guarded release procedure live in
`infra/narration/README.md`.

## Stack

Vite + React multi-page site (one HTML entry per pair, no client router),
deployed on Netlify. `src/data/puzzles.js` is the canonical registry; build
entries, the sitemap, and every catalog surface derive from it. No web fonts;
preserved media is fetched from the private-origin CloudFront distribution
only after the reader opens its player. Solutions render from the same tested
files in `solutions/`.

## Commands

- `npm run dev` : Vite dev server
- `npm run build` : production build (emits sitemap.xml)
- `npm run check` : registry/entry lockstep + style bans + gzip budgets
- `npm run verify:solutions` : run every Python solution's self-test

## Telemetry

`/api/tel` (Netlify function) receives anonymous TTS usage beacons: play,
progress (characters spoken), complete, stop. No cookies, no user ids, DNT and
GPC respected. Batches append to the site's own Netlify Blobs store, and
`/api/desk` re-serves them in the exact dialect the mathlimit desk's
`supabase` source kind polls (`POST …/rest/v1/rpc/algonow_cost_bins` with
`{"p_days": N}`), so this domain can join the fleet view with one
`sources.json` entry and zero mathlimit changes. Legacy browser speech and
preserved MP3 playback both report zero runtime tokens; generation cost stays
in the reviewed release provenance. See `docs/TTS-TELEMETRY.md`.

## Domains

- `algonow.net` : primary (DNS pending)
- `algohome.net` : soft 301 alias (redirects configured in `netlify.toml`)
