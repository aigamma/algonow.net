# algonow.net: the operating contract

Read this in full at session start. Skim `git log --oneline -15` before
interpreting any build prompt; recent commits are the canonical disambiguator.

## New learning direction, October 17, 2026

All NEW puzzles are Python AI architecture or AI engineering scenarios:
retrieval and RAG, data pipelines, fine-tuning, distillation, evaluation, and
serving. A learner frames an engineering request, works with actual files,
writes or repairs Python, validates behavior, and explains tradeoffs.

The entire existing 205-lesson algorithm catalog is legacy reference material.
It remains available but is not the template or backlog for new learning
content. Unregistered algorithm WIP is also legacy material. Do not publish a
new standalone algorithm/heuristic pair or rename one as an engineering
scenario without authoring the actual engineering work.

Use `src/data/engineering.js`, `/scenarios/<slug>/`, and the shared
`ScenarioPage` contract in `docs/FABLE_AI_ENGINEERING.md`. `LIVE_SCENARIOS`
drives discovery; it stays empty until a real Fable-authored scenario passes
all checks. Do not manufacture completed examples to populate the homepage.
Fable authors exercises, fixtures, Python solutions/tests, explanations,
visuals, and narration. Metadata, validation, and delivery infrastructure may
be maintained separately. This prospective policy takes precedence over the
legacy pair template below.

Owner refinement, October 17, 2026: the learner is an expert systems engineer
and a novice at independently writing Python syntax. Teach reusable Python
patterns through small, complete worked examples for AI engineering tasks.
The purpose includes thinking and strategizing directly in Python, alongside
weekly proctored exams. Lead with the worked solution and explain its Python;
offer a small practice variation afterward. No guessing prerequisite.
Follow the teaching master prompt in `docs/FABLE_AI_ENGINEERING.md`.
One self-contained solution, tiny inline inputs, visible expected output,
and one optional self-contained practice file form the learning path. Both
files run alone without setup or other files. Do not show a working-file
inventory, fixtures, test modules, or project navigation on the lesson page.
Supporting verification may remain in the repository and a separate optional
download. Fable remains the author of examples, code, explanations, tests,
visuals, and narration.

## Hard rules

1. **One linear history on `main`. No branches, no PRs, no worktrees.**
   Commit after every completed, verified unit and PUSH IMMEDIATELY; verify
   HEAD==origin. Verbose commit messages: what, where, why, how verified.
2. **One authored scenario per unit of work, strictly sequential.** Build a
   scenario, verify it, commit and push it, then start the next. Never fan out parallel agents
   over the catalog.
3. **Evidence over assurance.** A unit is done when `npm run build` exits 0,
   `npm run check` passes, and `python solutions/<slug>.py` prints OK. Say
   what was verified and how. `npm run check` runs `npm test` last, which
   SSR-loads the real page data modules: a green build does NOT prove a page
   renders, since Vite never executes client code at build time. New scenarios
   also require `node scripts/check-engineering.mjs --run-python` against the
   complete authored package; the single-file command above is for legacy units.
4. **Preserved narration is part of every new puzzle.** The production Kalman
   pilot is the reference implementation. Every new engineering scenario,
   and (since the 2026-10-22 backfill) every legacy puzzle, is incomplete until it
   has two validated, published
   Chirp 3 HD tracks over the same complete canonical narration array: female
   Aoede and male Algieba. Aoede is the fresh-reader default. Selecting either
   voice, including returning to Aoede, resets playback to `1.25x`. The only
   controls are `1.00x`, `1.25x`, `1.50x`, and `1.75x`. Include every authored
   spoken-prose entry in order, including code-walkthrough prose; exclude
   actual executable code and interface chrome. Missing, pending, or invalid
   preserved audio is a ship blocker and must never fall back to browser Web
   Speech. Initial dual-track generation for newly completed owner-requested
   pages has standing owner consent within the $1,200 cross-domain fleet
   budget when it remains bound to reviewed text, exact selection and hash,
   current price, an explicit `--max-usd` ceiling, an exclusive lock, and
   fail-closed outcome rules. Sitewide backfill, post-publication regeneration,
   and any retry after an ambiguous outcome still require human review. See
   `infra/narration/README.md` and `docs/TTS-TELEMETRY.md`.
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
8. **The legacy atlas is a reference map, three tiers deep.** CATEGORY (~20, broad, in
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
   categorization, unit content, narration prose, and code are subscription
   work (reasoning/agents), never a metered authoring API. Synthesis does not
   author the prose. The initial dual-track generation required by rule 4 is
   the sole metered authoring-time exception and uses its standing consent and
   exact spend gates. Metered/overflow spend otherwise remains limited to the
   deployed runtime, the one-time catalog embedding, and explicitly approved
   operations. Always start with the best models (Voyage 4, latest Claude);
   cost is not the constraint, but do not spend unrelated metered credits
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

## The legacy unit template

Use this only when maintaining existing algorithm lessons. New scenarios
follow `docs/FABLE_AI_ENGINEERING.md` and do not use algorithm/heuristic
registry fields.

Every pair page renders through `src/components/PuzzlePage.jsx`. A new pair
includes these authored files (`scripts/check.mjs` enforces lockstep):

1. `src/data/puzzles.js` : registry entry (moves off ROADMAP if present)
2. `<slug>/index.html` + `<slug>/main.jsx` : the Vite entry
3. `src/content/<slug>.jsx` : the tight form (given/task/constraint, origins,
   roles, picture, steps, signals, baseline, strength, weakness, rivals)
4. `src/content/<slug>.narration.js` : the complete canonical spoken form,
   sections keyed to page section ids (puzzle, origins, pair, picture, run,
   signals, tradeoffs, code)
5. `src/viz/<Name>Viz.jsx` : the live canvas (deterministic seed, pauses
   offscreen, static final frame under prefers-reduced-motion)
6. `solutions/<slug>.py` : the solution with a self-test `__main__` that
   asserts correctness against an independent oracle and prints OK

Every unit also installs its receipt-bound public narration manifest and
wires the preserved player; the browser-speech player was removed on
2026-10-22, after the legacy backfill. The unit is not complete
until both tracks and the no-fallback behavior pass live verification.

**Rivals are mandatory.** Every unit's tradeoffs section names two or three
other real methods (atlas entries where possible) that could viably attack
the same problem, each with a when-to-prefer line: what it wins, what it
costs, when you would reach for it instead. The narration speaks that
comparison in full sentences for the ear. The site's purpose is daily
reading-and-listening exposure and the strategic fluency to string
algorithms and heuristics together under pressure (a coding interview, a
long autonomous steering session), not memorization; the rivals discussion
is where that strength gets built. When the mismatch is extreme, include a
negative example: name the method a learner might plausibly reach for and
state plainly why it would be a disaster here (the cost blowup, the
structure it cannot exploit). "Never this method for this job, because" is
a trade-off instinct too. In the atlas, entries sharing a `d`
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

Deploys are explicit: `npm run build`, `npm run check`, then
`netlify deploy --prod` (a CLI upload of the local `dist`, zero build
minutes). Pushes to `main` do NOT build or publish anything: the Netlify
site has no repository linkage, verified 2026-08-26 when production sat
ten commits stale behind origin. Do not link the repo for CI builds
without the owner's explicit go-ahead (CI builds spend build minutes;
CLI uploads never do). A session that lands units ends with a verified
production deploy, or its work is stranded off the site. Domains:
algonow.net primary (live); algohome.net still on registrar parking
until its records are flipped (see docs/DNS.md); its 301 alias redirects
in netlify.toml take effect once DNS points it at the site. Functions: `/api/tel` (ingest, no env needed) and `/api/desk`
(reads; requires `ALGONOW_DESK_KEY` in Netlify env, shared with the
mathlimit sources.json entry).
