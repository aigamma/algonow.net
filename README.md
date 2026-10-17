# algonow.net

Python scenarios for **AI architecture and engineering**: retrieval and RAG,
data pipelines, fine-tuning, distillation, evaluation, and serving. The homepage
and all new puzzles follow this direction. Fable authors the scenario content;
see [the authoring contract](docs/FABLE_AI_ENGINEERING.md).

The original 205 algorithm and heuristic lessons are preserved at `/legacy/`,
with their existing lesson URLs, visuals, Python solutions, and recordings.
The algorithm atlas and its reference pages belong to that legacy collection.

## The two forms

Every unit is written twice.

- **Written form**: an engineering brief, a system view, starter files,
  validation, reference solution, and alternatives. Legacy lessons retain
  their original algorithm/heuristic layout.
- **Spoken form** (the narration): a longer script written for the ear, with
  numbers spelled out and symbols read as words. New and converted pages use
  two preserved Chirp 3 HD tracks over that same complete script: Aoede female
  and Algieba male, with Aoede as the default. Legacy pages remain on browser
  speech only while the reviewed backfill is pending.

The mandatory policy for Fable-authored units is hard rule 4 in `CLAUDE.md`.
The production Kalman reference and guarded release procedure live in
`infra/narration/README.md`.

## Stack

Vite + React multi-page site (one HTML entry per lesson, no client router),
deployed on Netlify. `src/data/engineering.js` owns new scenarios;
`src/data/puzzles.js` preserves the legacy catalog. Build entries, the sitemap,
and discovery surfaces consume those registries. Both collection pages are
prerendered. No web fonts;
preserved media is fetched from the private-origin CloudFront distribution
only after the reader opens its player. Solutions render from the same tested
files in `scenarios/<slug>/python/` or the legacy `solutions/` directory.

## Commands

- `npm run dev` : Vite dev server
- `npm run build` : production build (emits sitemap.xml)
- `npm run check` : registry/entry lockstep + style bans + gzip budgets
- `npm run check:engineering` : validate scenario packages, including drafts, and run their Python tests
- `node scripts/scaffold-engineering.mjs --slug <slug>` : create route plumbing for a registered draft
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

- `algonow.net` : primary
- `algohome.net` : soft 301 alias (redirects configured in `netlify.toml`)
