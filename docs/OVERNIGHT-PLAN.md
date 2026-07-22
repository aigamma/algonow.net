# The overnight program (owner directive, 2026-07-22)

This file is the work queue. It exists on disk, not in a chat log, because a
session can die at any time and the next one must resume without asking.
**Rule: finish a unit, run `npm run build` + `npm run check`, commit, push,
then start the next one. Do not stop because a unit is done.**

Owner's framing: this is weeks of work, not one task. The site has no DNS
yet. There are thousands of backend data pages to populate, classify, and
navigate; then the site to actually roll them out; then Qdrant; and every
page wants figures with citations, machine-drawn if necessary.

## Status legend

`[ ]` not started · `[~]` in flight (name the file) · `[x]` landed (commit)

---

## Phase A. Template: make every page argue with itself

The doctrine in CLAUDE.md says rivals are mandatory, but `PuzzlePage.jsx`
never rendered a rivals section. That is the root defect behind "robust
formatting which tests out several different algos on each problem".

- [x] **A1. Rivals bench component.** `src/components/RivalsBench.jsx`: a
      table of two to four real methods for the same problem, each with what
      it wins, what it costs, and when to reach for it instead. Plus an
      optional `neverUse` callout for the extreme negative example.
- [x] **A2. Figure component.** `src/components/Figure.jsx`: inline SVG,
      machine-drawn, deterministic, with `<figcaption>` and a citation line
      naming the source (author, year, venue). No external image files: they
      would break the CSP, the perf budget, and the no-runtime-fetch rule.
- [x] **A3. Measured contest.** `src/components/ContestTable.jsx`: the
      numbers the page's own Python solution prints when it races the rivals
      on one shared instance. Evidence, not adjectives.
- [x] **A4. Check enforcement.** `scripts/check.mjs` fails a live unit that
      lacks rivals (>= 2), a figure with a citation, or a contest table.

## Phase B. Bring the six live pages up to the new standard

One page per commit. Each gets rivals, a machine-drawn figure with citation,
a measured contest in its Python solution, and narration for the new
sections.

- [x] B1. astar-manhattan
- [x] B2. annealing-cooling
- [x] B3. minimax-alphabeta
- [x] B4. backtracking-mrv
- [x] B5. branchbound-fractional
- [x] B6. mcts-ucb1

## Phase C. The data surface: thousands of pages, navigable

The atlas is 3,113 entries / 606 problems / 64 topics and renders as exactly
one page today. This phase turns the data into the site.

- [ ] **C1. Prerender pipeline.** `scripts/prerender.mjs` emits static HTML
      into `dist/` after the Vite build. Not Vite entries: 3,000 Rollup
      inputs would be unbuildable. One small shared CSS, no JS on data pages,
      so the perf budget holds.
- [ ] **C2. `/problem/<slug>/`** for all 606 problems: the label, every
      method that attacks it, grouped by topic, with tier badges. This is the
      rivals doctrine made browsable.
- [ ] **C3. `/algo/<slug>/`** for every canonical algorithm name: what it is,
      the problems it attacks, its rivals, its aliases, its topic and
      category. Alias slugs 301 to the canonical page per the redirect
      doctrine in ATLAS.md.
- [ ] **C4. `/topic/<slug>/` and `/category/<slug>/`** index pages.
- [ ] **C5. Navigation.** A real nav spine: category rail, topic lists,
      problem cross-links, and search that reaches the new pages.
- [ ] **C6. Sitemap + robots** covering every generated page, chunked if it
      exceeds the 50,000-URL limit.

## Phase D. Qdrant and retrieval

Costs money only at the embedding step. **Build everything, run nothing
paid without an explicit in-session go-ahead** (CLAUDE.md rule 9).

- [ ] **D1. `infra/qdrant/`**: fly.toml, Dockerfile, volume config, and the
      collection schema with payload indexes for category, topic, tier,
      problem, aliases.
- [ ] **D2. `scripts/embed-atlas.mjs`**: builds the staged record from
      docs/RETRIEVAL.md, hashes for idempotency, batches, and **refuses to
      run without `--i-am-paying`**. Dry-run mode prints the record count and
      token estimate.
- [ ] **D3. `netlify/functions/search.js`**: embed query, Qdrant top-K with
      filters, Voyage rerank, fail open to the client-side filter.
- [ ] **D4. Wire the atlas search box** to fall back to `/api/search` for
      natural-language queries.

## Phase E. Keep growing the catalog (the long tail, runs forever)

New topic files, one per commit. Each needs full rival coverage before it
lands; the check's worst-topics line will name it if not.

- [ ] E1. vector-search (DiskANN, ScaNN, SPANN, RaBitQ, filtered ANN)
- [ ] E2. automated-reasoning (resolution, superposition, congruence closure,
      Knuth-Bendix, tableaux, E-matching)
- [ ] E3. queueing-performance (Little's law, Erlang B and C, PASTA,
      operational analysis, USL, bottleneck analysis)
- [ ] E4. geospatial (map matching, isochrones, geohash, S2, tile pyramids,
      spatial joins, GPS smoothing)
- [ ] E5. computational-chemistry (DFT, Hartree-Fock, force fields, free
      energy perturbation, conformer search)
- [ ] E6. weather-climate (data assimilation, ensemble Kalman, spectral
      dynamical cores, semi-Lagrangian advection)
- [ ] E7+ split oversized topics (search-structures ~100, machine-learning
      ~97, numerical ~98) into finer topics toward the ~100-topic target.

## Phase F. New unit pages (the daily lessons themselves)

Rotate across categories, tier 1 first, one pair per commit, each to the
Phase A standard. Candidates chosen for measurable contrast:

- [ ] F1. Dijkstra × binary heap (vs Bellman-Ford, 0-1 BFS, Floyd-Warshall)
- [ ] F2. Union-Find × union by rank with path compression (vs naive, quick-find)
- [ ] F3. KMP × failure function (vs naive, Boyer-Moore, Rabin-Karp)
- [ ] F4. Quicksort × median-of-three (vs merge, heap, introsort, Timsort)
- [ ] F5. Bloom filter × k independent hashes (vs cuckoo, XOR, exact set)
- [ ] F6. HyperLogLog × leading-zero registers (vs exact, Flajolet-Martin)
- [ ] F7. Kadane × running maximum (vs divide and conquer, brute force)
- [ ] F8. Huffman × frequency-sorted merges (vs Shannon-Fano, arithmetic, ANS)
- [ ] F9. Dinic × level graphs (vs Ford-Fulkerson, Edmonds-Karp, push-relabel)
- [ ] F10. PageRank × damped random walk (vs HITS, SALSA, degree centrality)

---

## Resume pointer

**Next action: C1, the prerender pipeline.** Phases A and B are complete:
the template now renders rivals, machine-drawn figures with citations, and a
measured contest, the check enforces all three, and all six live pages meet
the standard.

Working rules for whoever picks this up (from CLAUDE.md, restated because
they are the ones most easily lost mid-run):

1. One unit per commit. Build, check, commit, push. Verify HEAD equals
   origin before moving on.
2. Fable authors catalog entries and page content in the main thread. No
   subagents for entries, no generation from project code.
3. No paid API calls during interactive building. Qdrant embedding waits for
   an explicit go-ahead.
4. No em dashes anywhere. Never the word "h*artbeat"; say keepalive or
   liveness check.
5. Every claim in a commit message must be cashed out against build exit
   code, check output, or a printed test result.
