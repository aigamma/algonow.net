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
   what was verified and how. `npm run check` runs `npm test` last, which
   SSR-loads the real page data modules: a green build does NOT prove a page
   renders, since Vite never executes client code at build time.
4. **Zero-cost audio by default.** The Listen feature uses the browser's Web
   Speech API only. Never wire a paid TTS provider (OpenAI, ElevenLabs,
   Google, Amazon) without the owner's explicit go-ahead in the moment; see
   `docs/TTS-TELEMETRY.md` for the costed upgrade paths.
5. **Telemetry is truthful or absent.** Usage events carry characters spoken
   and the engine name; dollars are derived desk-side from token counts
   (zero for browser speech). Never invent a price, never log synthetic
   events to production, never add user identifiers. Storage is this site's
   own Netlify Blobs (`tts-events`); `/api/desk` re-serves the bins in the
   mathlimit `supabase`-source dialect. Joining the mathlimit fleet view is
   the OWNER's one-line `sources.json` change, made when they choose. The
   mathlimit repo and its Supabase project (aigamma-dev) are a conference
   exhibit: never write to either from here.
6. **No em dashes in prose, code comments, or commit messages.** Use commas,
   colons, parentheses, periods. Never the word "h*artbeat" in any output:
   say keepalive, liveness check, or scheduled check.
7. **Narration is written for the ear.** Spelled-out numbers ("nineteen
   sixty eight"), symbols read as words ("big O of b to the d"), one idea per
   sentence. Visible page text stays tight and may use symbols freely.
8. **The atlas is the build map, three tiers deep.** CATEGORY (~20, broad, in
   `atlas-categories.js`) -> TOPIC (one JSON file in `src/data/atlas/`, a
   specific subtopic, target ~100) -> ENTRY (`{a,h,d,t}`, thousands). Keep the
   tiers ~5x apart; grow entries freely, split a topic file past ~60 entries
   into finer topics, add a category only for a genuinely new top-level field.
   `atlas/aliases.json` is the canonical-name to synonyms redirect table. Every
   entry is a REAL named method (never invent one); every topic file maps to
   exactly one category; the normalized (algorithm, heuristic) pair is globally
   unique; live pairs appear in the atlas; atlas-summary.json {total, topics,
   categories} stays in sync. `npm run check` enforces all of this and prints
   non-failing duplicate-scan planning warnings. See docs/ATLAS.md (three-tier
   map + redirect doctrine) and docs/RETRIEVAL.md (Voyage 4 + Qdrant). When a
   name odd-symbols (+, *, non-ASCII), watch the uniqueness normalizer. Never
   say "family"; the middle tier is a TOPIC.
9. **Token doctrine: subscription first.** Authoring the atlas, dedup,
   categorization, unit content, narration, and code are subscription work
   (reasoning/agents), never a metered API. Metered/overflow spend is for the
   deployed runtime ONLY: the learner chatbot and any cron summarizer, plus the
   one-time catalog embedding, and even those need an explicit in-session
   go-ahead before a paid run. Always start with the best models (Voyage 4,
   latest Claude); cost is not the constraint, but do not spend metered credits
   during interactive building.

10. **Fable authors the catalog itself, in the main thread, attributed.**
   Every atlas entry (algorithm, heuristic, problem phrase, tier) and every
   unit's content, narration, and solution is authored by Claude Fable 5
   reasoning directly in the main thread. Never delegate entry authoring to a
   subagent, a Workflow, or another model, and never generate entries from
   project code that calls an API. Correctness is only half the reason: the
   site's claim is that a frontier model taught these techniques, so the
   provenance has to be real. If the running model is NOT Fable, stop
   authoring entries and say so plainly; metadata, tooling, docs, dedup, and
   verification are still fine to continue. Any commit that adds or changes
   entries names the authoring model in its trailer, which makes `git log`
   and `git blame` the provenance record. Owner-run fact-checking passes by
   other engines are expected and welcome: they audit, they do not author.
   Take as long as this needs. Slow and correct beats fast and padded.

## The unit template

Every pair page renders through `src/components/PuzzlePage.jsx`. A new pair
touches exactly these files (scripts/check.mjs enforces lockstep):

1. `src/data/puzzles.js` : registry entry (moves off ROADMAP if present)
2. `<slug>/index.html` + `<slug>/main.jsx` : the Vite entry
3. `src/content/<slug>.jsx` : the tight form (given/task/constraint, origins,
   roles, picture, steps, signals, baseline, strength, weakness, rivals)
4. `src/content/<slug>.narration.js` : the spoken form, sections keyed to
   page section ids (puzzle, origins, pair, picture, run, signals,
   tradeoffs, code)
5. `src/viz/<Name>Viz.jsx` : the live canvas (deterministic seed, pauses
   offscreen, static final frame under prefers-reduced-motion)
6. `solutions/<slug>.py` : the solution with a self-test `__main__` that
   asserts correctness against an independent oracle and prints OK

**Rivals are mandatory.** Every unit's tradeoffs section names two or three
other real methods (atlas entries where possible) that could viably attack
the same problem, each with a when-to-prefer line: what it wins, what it
costs, when you would reach for it instead. The narration speaks that
comparison in full sentences for the ear. The site's purpose is daily
reading-and-listening exposure and the strategic fluency to string
algorithms and heuristics together under pressure (a coding interview, a
long autonomous steering session), not memorization; the rivals discussion
is where that strength gets built. In the atlas, entries sharing a `d`
phrase are each other's rivals; see docs/ATLAS.md.

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
site). Functions: `/api/tel` (ingest, no env needed) and `/api/desk`
(reads; requires `ALGONOW_DESK_KEY` in Netlify env, shared with the
mathlimit sources.json entry).
