# The atlas: algonow's build map

`src/data/atlas/*.json` is the master catalog of units this site can teach:
every entry is either a standalone algorithm or an algorithm × heuristic
pair. It is the strategy document Eric asked for, kept as data so the check
script can hold it to account.

**Current size: 2,047 unique entries across 34 families** (run `npm run check`
for the live count; it prints per-file totals and the grand total). The map is
deliberately wide, spanning far past interview and exam canon into exotic and
creative problem-solving: unconventional computing (DNA, membrane, slime mold,
reservoir, memristor, optical, chemical), quantum, the full nature-inspired
metaheuristic zoo, and recreational puzzle solvers, alongside the classical
core. The 34 families:

sorting · search-structures · graphs-paths · graphs-structure · metaheuristics
· game-search · backtracking-cp · strings · computational-geometry · numerical
· machine-learning · probabilistic-streaming · dynamic-programming ·
cryptography-number-theory · compression-coding · distributed-concurrent ·
quantum · unconventional-computing · online-competitive · scheduling-operations
· computational-biology · signal-image · graphics-rendering · databases-query ·
automata-languages · networking · robotics-planning · combinatorial-enumeration
· game-theory-social-choice · stochastic-simulation · information-retrieval-nlp
· approximation · fault-tolerance-storage · puzzles-recreational.

Growing it further is a matter of adding entries to existing files or new
family files; the check enforces the invariants on every commit.

## Entry schema

One JSON object per line inside a per-family array:

```json
{"a": "A* search", "h": "Manhattan distance", "d": "Grid pathfinding", "t": 1}
{"a": "Heapsort", "h": null, "d": "In-place comparison sorting", "t": 1}
```

- `a` : the algorithm (the control structure; blue on every site surface)
- `h` : the heuristic (the guiding rule; amber), or `null` for standalone
  algorithms with no canonical pairing
- `d` : terse domain phrase (what problem this attacks), 2–6 words
- `t` : build tier. 1 = canon, teach early. 2 = solid standard. 3 =
  specialist or recreational.

The family is the filename. `npm run check` enforces schema, global
uniqueness of the normalized (a, h) pair across all files, and that every
live pair in `src/data/puzzles.js` appears in the atlas.

## Rules of the catalog

1. **Real names only.** Every entry is an established, named method. When a
   pairing is uncertain, the entry goes in standalone or not at all; the
   atlas never coins algorithms.
2. **Pairs are distinct units.** A* × Manhattan and A* × landmarks are
   different lessons; both belong. A bare algorithm is not listed separately
   once its pairs are (the pair pages subsume it).
3. **Uniqueness is mechanical.** The checker normalizes case, possessives,
   and punctuation; synonym discipline (no "Dijkstra" vs "Dijkstra's
   algorithm" twins) is editorial.

## The three tiers

The hierarchy is three tiers, each a distinct scale, kept ~5x apart so no tier
reads as a near-duplicate of the one above:

```
CATEGORY  (~20)   broad, legible field of algorithms       <- the nav spine
  TOPIC   (~100)  a specific subtopic (one JSON file)       <- the fine filter
    ENTRY (thousands) one algorithm or algorithm x heuristic pair
```

- **Category** (`src/data/atlas-categories.js`): the 20 legible top-level
  fields (Sorting & Selection, Graph Algorithms, Machine Learning & AI, Quantum
  & Unconventional Computing, ...). Grows slowly and deliberately; only a
  genuinely new top-level field earns one. The nav spine: objective and
  recognizable, never an artificial split.
- **Topic**: one JSON file in `src/data/atlas/` (e.g. `deep-learning.json`).
  A specific subtopic. Topics proliferate as the catalog scales: when a topic
  file grows past ~60 entries, split it into finer topics (e.g. `machine-
  learning` -> supervised / clustering / dimensionality reduction) so the middle
  tier stays populous and each topic is a useful narrow filter. Target ~100
  topics at 4,000-5,000 entries.
- **Entry**: one `{a, h, d, t}` record. Where the bulk of growth lives.

`atlas-categories.js` is the single source of the taxonomy: each category lists
the topic files it owns. `npm run check` fails if a topic file is orphaned,
double-placed, or references a missing file. The /atlas page presents all three
tiers with category and tier filters, a random button, and alias-aware search.
Earlier drafts called topics "families"; the term was retired because 20
categories and ~45 same-scale families read as two competing hierarchies
rather than a pyramid.

## Collisions: canonical names, aliases, and redirects

The hard problem at this scale is that one algorithm travels under several
names (Union-Find / DSU / Disjoint Set Union; Dijkstra / uniform-cost search).
Two mechanisms manage it, both enforced by `npm run check`:

1. **`src/data/atlas/aliases.json`** is the canonical-name to synonyms map, and
   it is the **redirect table**. Each key is a canonical name that must match a
   real entry's `a` (or carry `redirectOnly: true` for a pure redirect target
   that is not itself a catalog entry). Each value is `{ aka: [...], note?,
   redirectOnly? }`. The atlas search resolves aliases live.

2. **The automatic duplicate scan** (in `check.mjs`) clusters entries whose
   high-precision *core name* coincides (generic suffixes like `algorithm`,
   `DP`, `decoding` stripped) and prints the cross-entry clusters as a
   non-failing **planning warning**. It proposes; a human disposes. A cluster
   is either a true duplicate to merge into one canonical entry (+ an alias),
   or two genuinely distinct lessons that happen to share a stem (Kernighan-Lin
   the graph-partitioner vs Lin-Kernighan the TSP heuristic).

**The redirect doctrine for the eventual per-algorithm pages.** Each live unit
will own a stable slug derived deterministically from its canonical name
(lowercase, non-alphanumerics to hyphens: `Union-Find` -> `/algo/union-find/`).
Every alias in the registry becomes a **301 redirect** to that canonical slug,
and the canonical page carries a **top-of-page provenance note** naming the
alternate names it answers to ("Also known as DSU, Disjoint Set Union. This is
the canonical page; those names redirect here."). Netlify `_redirects` or
`netlify.toml` [[redirects]] are generated from `aliases.json` at build, so the
redirect table has one source of truth. A merged duplicate (two former entries
collapsed to one canonical) leaves its retired name behind as an alias, so old
links and both names keep resolving.

**Resolution workflow (deliberate, not automatic).** Run `npm run check`, read
the duplicate-scan clusters, and for each: either (a) merge, deleting the
redundant entry and adding its name to the survivor's `aka`, or (b) confirm
distinct and leave it (the scan re-flags it each run, which is acceptable, or
add both to a small allowlist later). Never let a merge silently drop a name;
the retired name always becomes an alias so nothing 404s.

## Token doctrine (subscription first, overflow only when unavoidable)

Building the atlas, deduping it, categorizing it, writing unit content and
narration, and authoring code are all done on the **Claude Max subscription**
(the reasoning and agent work), never a metered API. Metered / overflow spend
is reserved for the **deployed runtime** only: the open-ended learner chatbot
and any scheduled cron agent that summarizes recent activity. Embedding the
catalog for semantic search is a one-time near-trivial metered cost (see
`docs/RETRIEVAL.md`) and still requires an explicit go-ahead before any run.

## How the site gets filled in

A pair graduates from the atlas to a live page through the 6-file unit
pipeline in CLAUDE.md (registry entry, Vite entry, tight content, narration,
canvas viz, tested Python solution), one pair per unit of work, committed and
pushed each. Build order: rotate across families taking tier 1 first, so
breadth arrives before depth; within a family, prefer the pair whose measured
contrast makes the best evidence (the 482-vs-2,000,000 style numbers).
The homepage bench stays a curated hand-picked slice of the atlas, not a dump
of it; the atlas itself is data, deliberately not rendered at this size.
