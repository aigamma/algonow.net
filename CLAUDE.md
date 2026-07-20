# algonow.net: the operating contract

Read this in full at session start. Skim `git log --oneline -15` before
interpreting any build prompt; recent commits are the canonical disambiguator.

## Hard rules

1. **One linear history on `main`. No branches, no PRs, no worktrees.**
   Commit after every completed, verified unit and PUSH IMMEDIATELY; verify
   HEAD==origin. Verbose commit messages: what, where, why, how verified.
2. **One pair per unit of work, strictly sequential.** Build a puzzle, verify
   it, commit and push it, then start the next. Never fan out parallel agents
   over the catalog.
3. **Evidence over assurance.** A unit is done when `npm run build` exits 0,
   `npm run check` passes, and `python solutions/<slug>.py` prints OK. Say
   what was verified and how.
4. **Zero-cost audio by default.** The Listen feature uses the browser's Web
   Speech API only. Never wire a paid TTS provider (OpenAI, ElevenLabs,
   Google, Amazon) without the owner's explicit go-ahead in the moment; see
   `docs/TTS-TELEMETRY.md` for the costed upgrade paths.
5. **Telemetry is truthful or absent.** Usage events carry characters spoken
   and the engine name; dollars are derived desk-side. Never invent a price,
   never log synthetic events to production, never add user identifiers.
   The Supabase store is isolated from mathlimit's production telemetry;
   integration into the mathlimit fleet view is the OWNER's one-line
   `sources.json` change, made when they choose (the mathlimit repo is a
   conference exhibit; do not touch it from here).
6. **No em dashes in prose, code comments, or commit messages.** Use commas,
   colons, parentheses, periods. Never the word "h*artbeat" in any output:
   say keepalive, liveness check, or scheduled check.
7. **Narration is written for the ear.** Spelled-out numbers ("nineteen
   sixty eight"), symbols read as words ("big O of b to the d"), one idea per
   sentence. Visible page text stays tight and may use symbols freely.

## The unit template

Every pair page renders through `src/components/PuzzlePage.jsx`. A new pair
touches exactly these files (scripts/check.mjs enforces lockstep):

1. `src/data/puzzles.js` — registry entry (moves off ROADMAP if present)
2. `<slug>/index.html` + `<slug>/main.jsx` — the Vite entry
3. `src/content/<slug>.jsx` — the tight form (given/task/constraint, origins,
   roles, picture, steps, signals, baseline, strength, weakness)
4. `src/content/<slug>.narration.js` — the spoken form, sections keyed to
   page section ids (puzzle, origins, pair, picture, run, signals,
   tradeoffs, code)
5. `src/viz/<Name>Viz.jsx` — the live canvas (deterministic seed, pauses
   offscreen, static final frame under prefers-reduced-motion)
6. `solutions/<slug>.py` — the solution with a self-test `__main__` that
   asserts correctness against an independent oracle and prints OK

## Color is semantic

Algorithm = blue (`--algo`), heuristic = amber (`--heur`), solved/accepted =
green (`--path`), pruned/backtrack = red (`--warn`). Never decorate with
these; they carry the site's core idea. Vizzes use the same mapping.

## Performance budgets (gzipped)

vendor chunk < 70 KB · per-page chunk < 20 KB · theme.css < 14 KB · HTML
< 2 KB. No web fonts, no runtime data fetches on any page, no layout shift
(canvases carry explicit aspect-ratio). `npm run check` measures dist.

## Deploy

Netlify site `algonow` publishes `dist` on push to `main` (or via
`netlify deploy --prod`). Domains: algonow.net primary, algohome.net 301
alias (redirects in netlify.toml take effect once DNS points both at the
site). `/api/tel` is the only function; its env vars are set in Netlify
(`SUPABASE_URL`, `SUPABASE_INSERT_KEY`).
