# The atlas: algonow's build map

`src/data/atlas/*.json` is the master catalog of units this site can teach:
every entry is either a standalone algorithm or an algorithm × heuristic
pair. It is the strategy document Eric asked for, kept as data so the check
script can hold it to account.

**Live size: whatever `src/data/atlas-summary.json` says** (3,113 entries /
64 topics / 20 categories as of 2026-07-22; `npm run check` prints
per-topic totals and the grand total, and fails if the summary drifts). The target
shape is roughly 5,000 entries across ~100 topics. The map is deliberately
wide, spanning far past interview and exam canon into exotic and creative
problem-solving: unconventional computing (DNA, membrane, slime mold,
reservoir, memristor, optical, chemical), quantum, the full nature-inspired
metaheuristic zoo, and recreational puzzle solvers, alongside the classical
core. The topic list lives in one place, `src/data/atlas-categories.js`;
this doc does not duplicate it.

Growing the atlas is a matter of adding entries to existing topic files or
new topic files; the check enforces the invariants on every commit.

## Entry schema

One JSON object per line inside a per-topic array:

```json
{"a": "A* search", "h": "Manhattan distance", "d": "Grid pathfinding", "t": 1}
{"a": "Heapsort", "h": null, "d": "In-place comparison sorting", "t": 1}
```

- `a` : the algorithm (the control structure; blue on every site surface)
- `h` : the heuristic (the guiding rule; amber), or `null` for standalone
  algorithms with no canonical pairing
- `d` : terse domain phrase (what problem this attacks), 2-6 words
- `t` : build tier. 1 = canon, teach early. 2 = solid standard. 3 =
  specialist or recreational.

The `d` phrase is load-bearing metadata, not decoration: entries that share
a `d` phrase are each other's **rivals**, the alternative methods that
attack the same problem, and unit pages plus future navigation surface them
as such. When a new entry attacks a problem the atlas already names, reuse
the existing `d` phrase verbatim ("Graph layout", "Multiple testing", "MCMC
sampling"); coin a new phrase only for a genuinely new problem.

The topic is the filename. `npm run check` enforces schema, global
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

## Rivals: trade-off fluency is the product

The learner's goal (stated 2026-07-21) is not to memorize thousands of
methods. It is strong daily exposure by reading and listening, and the
strategic strength to pick and combine methods under pressure: stringing
the right algorithms and heuristics together in a coding interview, or
steering a long autonomous session. So every unit page places its method
among its rivals: two or three other atlas methods that could viably attack
the same problem, each with a when-to-prefer line (what it wins, what it
costs). The shared-`d` convention above is what makes rivals mechanically
findable; the tradeoffs section and its narration are where the comparison
is taught.

Extreme negative examples are part of the doctrine (owner, 2026-07-21): when
a plausible-looking method is a disaster for the problem, say so by name and
give the reason (the cost blowup, the structure it cannot exploit). "You
would never use this one here, because" teaches the same instinct as a
when-to-prefer line, from the other side.

**The rivals backfill (owner directive 2026-07-21; COMPLETE, 51.9 -> 99.4
percent in fifty sweeps).** Roughly the first 1,600 entries were authored
before this doctrine existed, so their `d` phrases were coined one-off and
clustered with nothing. Every topic file has now been swept. The method,
kept here because it is how any future topic gets folded in: sweep one
topic file at a time (worst coverage first; `npm run check` prints the
worst topics) and make four moves per topic:

1. Register the topic's multi-entry phrases in `problems.json`.
2. Join singleton phrases to existing problems by ADDING the phrase to the
   problem's list (the phrase keeps its specific wording; never flatten).
   Rewrite a `d` only when it was genuinely miscoined.
3. Where the atlas holds no alternative for an entry's problem, AUTHOR the
   missing real rivals as new entries. Alternatives must exist, not merely
   be linked; this is atlas growth toward 5,000, Fable-authored per the
   provenance rule.
4. Densify `aliases.json` for the topic's entries while there; the RAG and
   redirect layers both need "five names, one algorithm" to resolve.

One topic per commit, check green, push before the next. A new topic file
is not finished until its phrases are registered the same way; the check's
worst-topics line will name it immediately.

**The seventeen honest holds.** Seventeen entries have no rival and are
left that way on purpose, because inventing a competitor would break the
real-names rule: digit DP, probability DP, egg drop DP, Instant Insanity,
tangram solving, chain codes, Puiseux series, skip scan,
self-stabilization, retrograde analysis, kernel pre-image reconstruction,
hyper-heuristic search, network tomography, fractional cascading, text
chunking, complex event processing, power analysis. Each is a candidate
for a future authored rival, not a defect.

`src/data/atlas/problems.json` is the rivals registry: a problem slug maps to
a label plus the exact `d` phrases that mean that problem, so Dijkstra
("Nonnegative shortest paths") and Bellman-Ford ("Negative-edge shortest
paths") resolve to one problem without either losing the phrase that explains
when you would reach for it. `rivalsOf(entry)` in `src/data/atlas.js` is the
lookup; it falls back to an exact phrase match for unregistered phrases.
`npm run check` fails on a phrase that matches no live entry (so the registry
cannot rot), reports rival coverage, and prints the largest unregistered
phrases as a queue.

## Where the atlas stands, and what is queued

At 3,113 entries / 64 topics / 20 categories against a target of roughly
5,000 entries across ~100 topics. **Rival coverage is 99.4 percent**, held
across five new topics, up from 51.9 percent when the backfill started on
2026-07-21: fifty sweeps registered the problem taxonomy (now 606
problems), densified the alias registry (now 810 canonical names / 1,028
synonyms), authored about 90 real missing rival entries, and merged 20 true
duplicates the sweeps exposed. Run `npm run check` for all live numbers;
the standing queues, in rough priority order:

1. **Grow the catalog toward 5,000.** With the rivals layer complete, new
   entries are the work again, and a new topic file is the highest-yield
   unit: five landed on 2026-07-22 (llm-inference, llm-training-alignment,
   computer-architecture, post-quantum-cryptography, vlsi-eda) for +199
   entries at full rival coverage. Every new entry needs a `d` phrase that
   either reuses a registered problem or names a new one (see the four-move
   method above); the check's worst-topics line polices this automatically.
   Fields still absent or thin, each checked for overlap before authoring:
   vector search as its own topic (HNSW and IVF-PQ currently live in
   computational geometry, DiskANN and ScaNN are missing), automated
   theorem proving (resolution, superposition, congruence closure,
   Knuth-Bendix), queueing and performance modeling as its own topic,
   geospatial algorithms (map matching, isochrones, tiling, spatial joins),
   computational chemistry beyond molecular dynamics, and numerical
   weather and climate methods.
2. **Topic splits.** A dozen topic files exceed the ~60-entry split
   threshold (search-structures is fattest at ~100 after the backfill's
   authored rivals). Splitting them, plus new topics, is the distance to
   the ~100-topic target; 64 of ~100 are in place.
3. **Retrieval staging is ready.** aliases.json and problems.json are now
   dense enough for the Qdrant record in docs/RETRIEVAL.md to be built
   whenever the owner green-lights the one-time embedding run.
4. **Duplicate scan.** Three clusters remain and all three are intentional
   (Viterbi across DP/coding/NLP, Beam search vs Beam search decoding,
   Kernighan-Lin vs Lin-Kernighan). Anything new that appears is real; the
   backfill sweeps caught and merged twenty others on sight.
5. **Unregistered-phrase queue.** Nineteen phrases with three or more
   entries each still stand as their own exact-match clusters (word
   embeddings, node embeddings, link prediction, metric learning, AutoML,
   and friends). They are covered, so this is polish: folding them into
   named problems would give them stable /problem/ slugs.

Candidate NEW topics, each to be checked for overlap before authoring rather
than assumed missing: SAT/SMT and formal verification (CDCL, DPLL(T), IC3,
CEGAR, model checking), LLM systems (attention variants, KV cache,
speculative decoding, quantization, preference optimization), vector search
(HNSW, IVF-PQ, DiskANN), compiler backends (register allocation, instruction
scheduling, polyhedral loop transforms), VLSI and EDA (placement, routing,
logic synthesis, ATPG), queueing and performance modeling, post-quantum
cryptography, zero-knowledge proofs and secure multiparty computation, and
fuzzing and test generation.

## How the site gets filled in

A pair graduates from the atlas to a live page through the 6-file unit
pipeline in CLAUDE.md (registry entry, Vite entry, tight content, narration,
canvas viz, tested Python solution), one pair per unit of work, committed and
pushed each. Build order: rotate across categories taking tier 1 first, so
breadth arrives before depth; within a topic, prefer the pair whose measured
contrast makes the best evidence (the 482-vs-2,000,000 style numbers).
The homepage bench stays a curated hand-picked slice of the atlas, not a dump
of it; the atlas itself is data, deliberately not rendered at this size.
