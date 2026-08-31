# The unit pipeline (session recipe, written 2026-08-27)

The exact sequence a live unit follows, as executed nineteen times on
2026-08-27 (puzzles 09-27). Written down so a fresh or consolidated
session continues without drift. CLAUDE.md rules still govern; this is
the operational detail layer.

## Per-unit sequence (strictly in this order)

1. **Atlas ground truth first.** Grep the topic file for the pair and
   rivals; find the problem slug owning the pair's `d` phrase in
   `problems.json`; `ls dist/algo` to confirm every rival card's link
   target page exists. If the pair's `h` is null, the unit AUTHORS it
   (rule 2: the pair subsumes the standalone) and the commit says so.
   If a real rival is missing from the atlas, add it (real names only)
   and bump `atlas-summary.json` (total/algorithms/heuristics as
   applicable; check prints actuals on mismatch).
2. **Solution py first** (`solutions/<slug_underscored>.py`), because
   its measured numbers feed every other file. Race real rivals on 1-3
   instances with ONE work currency; oracles must include an
   independent referee (brute force, exhaustive enumeration, exact
   rationals, a stdlib implementation, or a theorem asserted
   numerically). Every published number regenerates and its ordering
   is asserted. File ends `print("OK: ...")`. Run it; fix until OK.
   When an oracle refuses a designed claim, the MEASUREMENT wins:
   rebuild the claim honestly (this happened repeatedly and the pages
   say so; it is a feature).
3. **Content jsx** (`src/content/<slug>.jsx`): given/task/constraint,
   origins (real history, verified names/dates/DOI), algoRole,
   heurRole, picture, steps[], signals[] (3), baseline, strength,
   weakness, problem + problemSlug, rivals[] (2-5 cards; the `{` of
   each rival object at exactly 4-space indent; `algoName` override
   when display name != atlas canonical name; measured numbers in
   wins/costs), neverUse (measured or proven, not rhetorical),
   contest {instance, columns, rows (values.length == columns.length,
   optional best index), source naming the py file}, figure
   (`<Figure id aspect caption cite={{text, href}}>` with inline SVG,
   no em dashes anywhere).
4. **Narration** (`src/content/<slug>.narration.js`): ~10 sections
   from {puzzle, origins, pair, picture, run, signals, tradeoffs (x4),
   code}; numbers spelled out for the ear; the code section describes
   the oracles and ends with the would-fail-before-lying line. This complete
   array is the sole spoken source. Include its code-walkthrough prose, but
   exclude actual executable source and interface chrome. Starting with puzzle
   115, plan, generate, validate, publish, and install both preserved tracks:
   Aoede female and Algieba male over identical text. Aoede is the default,
   selecting either voice resets to `1.25x`, and the only rates are `1.00x`,
   `1.25x`, `1.50x`, and `1.75x`. Browser Web Speech is not a fallback.
5. **Viz** (`src/viz/<Name>Viz.jsx`): useCanvasLoop with `stepMs:` and
   `holdTicks(s)` (the motion test regex requires both), deterministic
   seed + cycle bump, `stopAtRest: isStill()` returning false when
   done, restart button, honest counters matching the solution's
   currency, total ticks < 20000 for still-mode.
6. **Entry files** `<slug>/index.html` (title `A × h · algonow`, meta
   description UNDER 200 chars: this failed twice at 201-202) +
   `<slug>/main.jsx` (copy pattern, swap slug).
7. **Registry** `src/data/puzzles.js`: full record incl. `category:`
   (check-enforced == the atlas topic's category; compute via
   CATEGORY_OF_TOPIC of the pair's topic file) and `problemSlug`
   (must match the content's and have a /problem/ page). ROADMAP
   rotates: remove the landed pair, append the next queue item with
   ATLAS-EXACT names (verify by grep before promising; wrong h names
   were caught twice).
8. **Plan** `docs/OVERNIGHT-PLAN.md`: mark the F item `[x]` with the
   measured numbers, update the resume pointer. Queue extensions: add
   new `[ ]` F rows only with atlas-verified names.
9. **Verify + ship**: for puzzle 115 onward, complete the credential-free
   narration plan, use the standing fresh-page consent to generate both
   tracks under the exact spend gates, publish immutable objects, install the
   receipt-bound manifest, and run the narration tests. Then run `npm run
   build` (exit 0), `npm run check` (ALL CHECKS PASS; watch: banned-word scan
   caught a narration aside once, em dashes never allowed), and `npm test`
   (21/21; the rest sweep covers every viz with stepMs). Commit (verbose:
   claim -> numbers -> files -> oracles -> verification; trailer
   `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` + Claude-Session
   line). Push, assert HEAD==origin, `netlify deploy --prod`, then live-verify
   both voices, their defaults, media origin, and no-fallback behavior. A
   missing or pending manifest fails the unit. THEN start the next unit.

## Standing facts that keep mattering

- Deploys are explicit CLI uploads; pushes never publish.
- The check's rival-count regex counts `^\s*\{\s*name:` blocks; the
  contest rows use `method:` so they don't collide.
- Colors: --algo/-heur/-path/-warn are 6-digit hex; `${color}AA`
  alpha-suffixing works in canvas.
- atlas-summary fields: {total, algorithms, heuristics, phrasings,
  problems, topics, categories}; check prints actuals when wrong.
- Category keys live in src/data/atlas-categories.js; homepage groups
  derive from registry `category` (G7).
- No em dashes; never the banned h-word; narration numbers spelled.
- One unit per commit+push+deploy, strictly sequential, no subagents
  for authoring (rule 10; this session verified it runs as Fable 5).
