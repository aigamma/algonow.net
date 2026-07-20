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
  numbers spelled out and symbols read as words, played by the browser's own
  speech engine (Web Speech API). Zero cost, zero streaming, zero accounts.

## Stack

Vite + React multi-page site (one HTML entry per pair, no client router),
deployed on Netlify. `src/data/puzzles.js` is the canonical registry; build
entries, the sitemap, and every catalog surface derive from it. No web fonts,
no external requests at runtime; solutions render from the same tested files
in `solutions/`.

## Commands

- `npm run dev` — Vite dev server
- `npm run build` — production build (emits sitemap.xml)
- `npm run check` — registry/entry lockstep + style bans + gzip budgets
- `npm run verify:solutions` — run every Python solution's self-test

## Telemetry

`/api/tel` (Netlify function) receives anonymous TTS usage beacons: play,
progress (characters spoken), complete, stop. No cookies, no user ids, DNT and
GPC respected. Events land in an isolated Supabase store that exposes
`mathlimit_cost_bins`, the exact RPC shape the mathlimit desk polls, so this
domain can join the fleet view with one `sources.json` entry. Browser speech
costs $0.00 and is recorded as zero, truthfully; see `docs/TTS-TELEMETRY.md`.

## Domains

- `algonow.net` — primary (DNS pending)
- `algohome.net` — soft 301 alias (redirects configured in `netlify.toml`)
