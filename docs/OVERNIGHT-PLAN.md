# The overnight program (owner directive, 2026-07-22)

> **PROVENANCE HOLD (2026-07-22): read `docs/PROVENANCE-ALERT.md` first.**
> The session that marked E1-E5, F2, G1, G2 `[x]` ran as Opus 4.8, not
> Fable, and authored those catalog entries under a false Fable trailer.
> Those `[x]` items are committed and building green, but their entry
> content needs genuine Fable re-authoring before the provenance claim
> holds. Do not treat the `[x]` topics as provenance-clean.
>
> **UPDATE 2026-08-25: catalog growth is NO LONGER blocked.** The atlas
> chunk went 119.8 KB -> 94.7 KB gzipped in `5e01aa1` (dead weight, not
> catalog size: `problems.json` was being globbed into the page bundle for
> a function no page calls). There is now 25.3 KB of headroom, about a
> thousand entries. Author new topics normally; see
> `docs/PROVENANCE-ALERT.md` for the detail and the measured next step.

This file is the work queue. It exists on disk, not in a chat log, because a
session can die at any time and the next one must resume without asking.
**Rule: finish a unit, run `npm run build` + `npm run check`, commit, push,
then start the next one. Do not stop because a unit is done.**

Owner's framing: this is weeks of work, not one task. The site has no DNS
yet. There are thousands of backend data pages to populate, classify, and
navigate; then the site to actually roll them out; then Qdrant; and every
page wants figures with citations, machine-drawn if necessary.

## Queue-keeping protocol (owner directive, 2026-07-22 evening)

The catalog target is and remains **roughly 5,000 entries across ~100
topics**. The stall near 3,000 was crash damage, not a revised target; do
not treat the current size as a ceiling.

Three sessions crashed in two days. The two causes worth engineering
against: work batches too large to survive a dying session, and finished
work sitting uncommitted. Countermeasures, mandatory:

1. Small units. One topic file, one unit page, or one hygiene sweep per
   commit. Push immediately, verify HEAD equals origin, then continue IN
   THE SAME SESSION with the next unit. Do not stop after one unit.
2. This file is the task list. Mark `[~]` when starting a unit, `[x]` with
   the commit hash when it lands, in the same commit as the work.
3. **Panel rule (owner, 2026-07-22): if the count of open `[ ]` tasks in
   this file ever drops to three or fewer, convene a task panel before
   continuing: four agents, run strictly ONE AT A TIME (never
   concurrently; concurrency is what killed the crashed sessions). Three
   proposers argue for new tasks from three angles (learner value, site
   surface, data quality); the fourth is the judge, who votes each
   proposal in or out against CLAUDE.md and this file. Judge-approved
   proposals land here as new `[ ]` tasks in one commit. The panel
   proposes tasks only; it never authors catalog entries (rule 10).**

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

- [x] **C1. Prerender pipeline.** `scripts/prerender.mjs` emits static HTML
      into `dist/` after the Vite build. Not Vite entries: 3,000 Rollup
      inputs would be unbuildable. One small shared CSS, no JS on data pages,
      so the perf budget holds.
- [x] **C2. `/problem/<slug>/`** for all 606 problems: the label, every
      method that attacks it, grouped by topic, with tier badges. This is the
      rivals doctrine made browsable.
- [x] **C3. `/algo/<slug>/`** for every canonical algorithm name: what it is,
      the problems it attacks, its rivals, its aliases, its topic and
      category. Alias slugs 301 to the canonical page per the redirect
      doctrine in ATLAS.md.
- [x] **C4. `/topic/<slug>/` and `/category/<slug>/`** index pages.
- [x] **C5. Navigation.** A real nav spine: category rail, topic lists,
      problem cross-links, and search that reaches the new pages.
- [x] **C6. Sitemap + robots** covering every generated page, chunked if it
      exceeds the 50,000-URL limit.

## Phase D. Qdrant and retrieval

Costs money only at the embedding step. **Build everything, run nothing
paid without an explicit in-session go-ahead** (CLAUDE.md rule 9).

- [x] **D1. `infra/qdrant/`**: fly.toml, Dockerfile, volume config, and the
      collection schema with payload indexes for category, topic, tier,
      problem, aliases.
- [x] **D2. `scripts/embed-atlas.mjs`**: builds the staged record from
      docs/RETRIEVAL.md, hashes for idempotency, batches, and **refuses to
      run without `--i-am-paying`**. Dry-run mode prints the record count and
      token estimate.
- [x] **D3. `netlify/functions/search.js`**: embed query, Qdrant top-K with
      filters, Voyage rerank, fail open to the client-side filter.
- [ ] **D4. Wire the atlas search box** to fall back to `/api/search` for
      natural-language queries.

## Phase E. Keep growing the catalog (the long tail, runs forever)

New topic files, one per commit. Each needs full rival coverage before it
lands; the check's worst-topics line will name it if not. E1 also
relocates the five ANN entries (LSH, HNSW, IVF-PQ, Product quantization,
Annoy) out of computational-geometry into the new topic.

- [x] E1. vector-search: 29 entries (24 net new after relocating LSH,
      HNSW, IVF-PQ, PQ, Annoy from computational-geometry), 3 new
      problems + 1 phrase registered, 13 alias keys. Atlas 3,116 -> 3,140.
- [x] E2. automated-reasoning: 30 entries under search-constraints-games,
      11 new problems registered, 20 alias keys. Saturation calculi,
      rewriting, unification (syntactic to higher-order), SMT internals
      above the SAT core, premise selection, induction, model finding,
      logic programming. Atlas 3,140 -> 3,170. IC3/CEGAR deliberately
      left for a program-analysis densify unit (they are model checking).
- [x] E3. queueing-performance: 25 entries under probabilistic, 5 new
      problems + 2 phrases registered, 15 alias keys. Relocated and
      upgraded Jackson and MVA from stochastic-simulation; retired the
      umbrella entry "Queueing analysis x M/M/1 formulas" into an alias
      of the precise M/M/1 analysis entry. Atlas 3,180 -> 3,202.
- [x] E4. geospatial: 19 entries under geometry, 8 new problems, 11 alias
      keys. Cell indexing (Geohash, S2, H3), tiling, HMM and ST map
      matching, isochrones vs network Voronoi, hydrology (D8,
      priority-flood), viewsheds, spatial joins, geodesics (haversine,
      Vincenty, Karney). Visvalingam-Whyatt and ALT found already present
      and not duplicated. Atlas 3,204 -> 3,223.
- [x] E5. computational-chemistry: 30 entries under comp-bio (category
      relabeled Computational Biology & Chemistry), 11 new problems, 15
      alias keys. Electronic structure (HF, Kohn-Sham DFT, MP2, CCSD(T),
      CASSCF, DMRG), integrals, Ewald/PME/FMM electrostatics, MD
      integration and constraints (Verlet, SHAKE, RATTLE), thermostats,
      enhanced sampling (replica exchange, metadynamics), free energy
      (FEP, TI, umbrella), conformer search, reaction paths (NEB, dimer).
      The check caught two collisions: DFT left with the Fourier
      transform, and Replica exchange kept distinct from the existing
      Parallel tempering entry. Atlas 3,223 -> 3,253.
- [ ] E6. weather-climate (data assimilation, ensemble Kalman, spectral
      dynamical cores, semi-Lagrangian advection)
- [ ] E7+ split oversized topics into finer ones toward the ~100-topic
      target. Twelve exceed the ~60-entry threshold as of 2026-08-26
      (recomputed from the topic files): search-structures 102,
      machine-learning 99, numerical 98, graphs-structure 91,
      distributed-concurrent 82, cryptography-number-theory 78,
      signal-image 72, sorting 72, graphs-paths 71, metaheuristics 70,
      computational-geometry 61, graphics-rendering 61. One split per
      commit; machine-learning shrinks by seven more when H5 rehomes the
      RL canon.

## Phase F. New unit pages (the daily lessons themselves)

Rotate across categories, tier 1 first, one pair per commit, each to the
Phase A standard. Candidates chosen for measurable contrast:

- [x] F1. Dijkstra × binary heap (vs linear scan, Bellman-Ford, BFS)
- [x] F2. Union-find × union by rank with path compression, live as puzzle
      08. Raced against quick-union, quick-find, and BFS-per-query on one
      1,500-element stream (25,825 vs 189,204 vs 2,031,171 vs 1,507,712
      touches); chain demo pins the 1,500-vs-1 worst case. Quick-find and
      Quick-union added to the atlas as real rival entries.
- [x] F3. KMP × failure function, live as puzzle 09 (2026-08-27, Fable).
      Raced against naive, full Boyer-Moore (strong good suffix), and
      Rabin-Karp on two instances: a 120,000-char CA-microsatellite
      (120,611 vs 1,850,895 vs 1,781,638 vs 1,901,580 chars examined,
      59,386 overlapping matches) and 120,000 chars of prose where the
      board flips (Boyer-Moore 13,334 vs KMP 122,329). Viz: two-panel
      re-read heat map, KMP vs naive on one strand. Solution oracles:
      brute-force border check, 4-way + str.find agreement on 305 cases,
      the 2n+m bound checked numerically, naive backup counter.
- [x] F4. Quicksort × median-of-three, live as puzzle 10 (2026-08-27,
      Fable). Six methods raced in comparisons on 2,048 keys across three
      inputs (shuffled / sorted / McIlroy killer adversary): mo3 24,303 /
      20,493 / 1,050,624; first-element pivot 23,937 / 2,096,128 /
      2,096,128; mergesort 19,955 / 11,264 / 20,481; heapsort 38,714 /
      40,204 / 38,071; Timsort 19,841 / 2,047 / 2,047; introsort 24,303 /
      20,493 / 81,685. Viz: two-panel bar race, same almost-sorted array,
      mo3 vs first-element. Oracles: sorted() agreement on 206 cases,
      stability pinned (merge/Timsort stable, quicksort provably not),
      the sorted-input cliff, the adversary, the introsort rescue, and
      Timsort's exact n-1 on sorted input.
- [x] F5. Bloom filter × k independent hashes, live as puzzle 11
      (2026-08-27, Fable). One budget (10,000 keys in 120,000 bits),
      200,000 absent queries: Bloom k=8 653 lies / k=1 16,082 / k=20
      3,049 (the U-curve measured at both ends), cuckoo 1,245 with clean
      deletion proven, XOR 372 at 11.1 bits/key, exact set 0 at 64+.
      Saturation cliff pinned: 74.6% lies at 5x design load. Atlas h
      renamed "Multiple independent hashes" -> "K independent hashes"
      (the standard parameterized name; bench promised it). Viz: two
      panels, same bits, same keys, same strangers, k=8 vs k=1, lies
      flash red. Oracles: zero false negatives everywhere, theory-range
      FP, U-curve, cuckoo delete vs pinned Bloom bit-clearing casualty,
      saturation.
- [x] F6. HyperLogLog × leading-zero registers, live as puzzle 12
      (2026-08-27, Fable). One budget (~1 KB per sketch), a 1,000,000-item
      stream with exactly 200,000 distinct: HLL 204,358 (+2.2%) at 768 B;
      Flajolet-Martin 203,707 (+1.9%) at 1 KB; KMV 170,006 (-15%, its
      8.8% band shown honestly); linear counting SATURATED at 1 KB (and
      sharp below its ceiling, verified at n=1,000); exact set 200,000 at
      3.2 MB. The tempting 1%-sample-x100 shortcut measured at 5.0x truth.
      New atlas entry: Linear counting (Whang-Vander-Zanden-Taylor 1990),
      t2, joins the cardinality-estimation rivals cluster; summary 3,249
      -> 3,250. Viz: 32x32 register grid + live estimate-over-truth trace
      inside the ±3.3% band. Oracles: 2^-r witness tail, 3-sigma landing,
      EXACT register-for-register merge, 1/sqrt(m) error scaling,
      saturation both ways, the sampling trap.
- [x] F7. Kadane × running maximum, live as puzzle 13 (2026-08-27,
      Fable). Work = reads + node merges: one-shot n=4,000 Kadane 4,000
      (exactly n, asserted) vs D&C 51,904 vs brute 8,002,000 vs segment
      tree 7,999; one-shot n=300,000 Kadane 300,000 vs D&C 5,775,712;
      2,000 updates: Kadane rescans 8,000,000 vs segment tree 33,936
      (236x). Atlas: bare Kadane entry gains its pair (h: Running
      maximum, rule 2), new rival entry Divide-and-conquer maximum
      subarray (Shamos), summary 3,250 -> 3,251. First dp-combinatorics
      homepage group. Viz: Kadane's amber run with red restarts vs the
      brute crawl, same array, same pace. Oracles: 407-case agreement
      with the definition, witnesses re-summed, all-negative convention,
      counter == n exactly, 300-update tree-vs-rescan equality.
- [x] F8. Huffman × frequency-sorted merges, live as puzzle 14
      (2026-08-27, Fable). Bits on two 200,000-symbol instances (entropy
      floors 805,141 / 31,557): ASCII 1,600,032/1,600,000; fixed width
      1,000,020/400,000; Shannon-Fano 810,761/203,999 (ties Huffman on
      both these alphabets; the 200-alphabet sweep pins it never winning
      and sometimes losing); Huffman 810,761 (0.7% off the floor) /
      203,999 (the 1-bit floor: 6.5x entropy on skew); arithmetic
      805,142/31,558 (one bit above the floor, both); rANS 805,168/
      31,584. Naive RLE measured EXPANDING prose to 3,136,672 bits.
      Real coders: 32-bit arithmetic with E1/E2/E3, byte-renormalized
      rANS, both round-tripped. Oracles: Huffman optimal vs exhaustive
      Kraft-feasible search on 200 alphabets, prefix-freedom + Kraft
      sums exactly 1, the Shannon floor as an inequality, the skew
      cliff. Viz: the tree builds itself, two lightest flash amber,
      leaf depths become code lengths.
- [x] F9. Dinic × level graphs, live as puzzle 15 (2026-08-27, Fable).
      Work = edge examinations, two instances: layered network (V=1,202,
      E=4,500, max flow 3,583): Dinic 50,608 in 2 phases; Edmonds-Karp
      6,661,398 (823 augmentations, 131x); FF-DFS 8,998,320; plain FIFO
      push-relabel 18,476,847 (pricing its missing gap/global-relabel
      heuristics by their absence). Zwick diamond trap (C=250,000):
      adversarial FF 1,500,000 ops (exactly 2C one-unit augmentations,
      pinned at C=1,000) vs EK 12, Dinic 20, PR 18. Oracles: 4-way
      agreement on 200 random nets + both instances, capacity and
      conservation checked edge-by-edge, max-flow = min-cut certificate
      asserted on every Dinic run, phase bound, PR height bound. Viz:
      real Dinic replayed event-by-event (levels stamp, blocking flows
      fill pipes green, augments flash amber, distance only rises).
- [x] F10. PageRank × damped random walk, live as puzzle 16
      (2026-08-27, Fable). A 2,000-page web with three planted attacks:
      PageRank d=0.85 converges in 82 passes, trap mass 2.7%, clique
      capture 5%, and survives all three; undamped walk >500 passes with
      the 10-page trap hoarding 84.7% (the dangling patch's faint
      teleport is why not 100%, noted honestly); HITS 19 passes and 100%
      clique capture (TKC at full strength); SALSA 131 passes, capture
      5% (the normalization repair, measured); in-degree 1 pass and
      farm-fatal. Farm experiment: 100 socks -> target in-degree rank 1,
      PageRank rank 9 (from 1,690): dilution not immunity, stated as
      such. Oracles: exact Gaussian solve match to 1e-10, ring symmetry,
      unit-mass fixed point, monotone damping price, trap, TKC, farm.
      New atlas entry: Degree centrality (t1, Node importance), summary
      3,251 -> 3,252. Viz: 200 surfers converge onto eigenvector rings.
      The queued Phase F is complete: F1-F10 all live.

The F-queue continues (2026-08-27, owner overnight directive: keep
populating units; chosen from tier-1 atlas canon for category breadth
and measurable contrast; each pair verified or authored per rule 2 at
build time):

- [x] F11. LRU × recency eviction, live as puzzle 17 (2026-08-27,
      Fable). 64 slots, 100,000 requests, hit rates on three traces:
      stationary zipf: LRU 39.6 / FIFO 34.7 / Random 34.8 / LFU 49.3 /
      OPT 62.3; drifting zipf (ranks reshuffled per 20K): LRU 39.6
      (identical: recency forgets at the speed of change) / LFU
      COLLAPSES to 17.0 (stale counts pin dead celebrities) / OPT 62.2;
      looping scan (80 items through 64 slots): LRU, FIFO, LFU all
      exactly 0.0 while blind Random gets 62.5 and OPT 79.7. Oracles:
      Belady verified optimal by exhaustive DP over cache states on 50
      small instances; the LRU stack property (32-cache subset of
      33-cache) asserted at every step of 30K requests; Belady's
      anomaly pinned on his 1969 string (FIFO: 9 faults at 3 frames,
      10 at 4); residency and hit-truth audits per policy. Viz: one
      stream, two coat checks: LRU vs the clairvoyant, conga-line scans
      flushing the hooks. Category optimization-or (online-competitive).
- [x] F12. K-means × k-means++ seeding, live as puzzle 18 (2026-08-27,
      Fable). 15 blobs / 750 points / k=15 / 30 restarts per row: ++
      median 1.00x best with the optimum in 21/30 runs at 2 iterations;
      random median 7.63x with 1/30 (SSE quantized by defect count:
      each doubled seed is a ~4x level); best-of-10-random still 4.26x
      median at 38x the work (the folk remedy priced). Seed spread 15
      vs 10 of 15 blobs. Shape boundary: two rings, k-means 0.50 Rand
      at ANY seeding vs DBSCAN and single-linkage 1.00; chaining
      boundary: a 15-point bridge drags single-linkage (= MST with
      longest edges cut) to 0.76 while ++ holds 0.95. New atlas entry:
      Agglomerative clustering x Single linkage (the canonical chaining
      variant was missing), summary 3,252 -> 3,253. Oracles: Lloyd
      descent asserted per iteration per run, coverage medians, outcome
      gaps, both boundaries. Viz: same blobs, two openings, defects
      visible. First ml-ai homepage group.
- [x] F13. Graham scan × polar-angle sorting, live as puzzle 19
      (2026-08-27, Fable). Work = orientation tests + sort comparisons:
      disk (n=50,000, h=136): Graham 725,693 / monotone chain 980,336 /
      Jarvis 6,799,728 (EXACTLY h*n, output sensitivity as poetry) /
      Quickhull 325,961 (the disk winner). Circle (n=2,000, all on
      hull): Graham 11,931 / Jarvis 3,996,000 (the n^2 detonation).
      Brute-force edge definition priced at 41,433 vs 809 on 120
      points. Three real degenerate-case bugs caught by the oracles and
      fixed during authoring (all-collinear input, final-ray survivor,
      Quickhull collinear far-point ties), all candidly recorded on the
      page: the tests as teachers. Oracles: 4-way agreement on 300
      cases incl. grids and duplicates, definition-level verification
      of every hull, Jarvis ~h*n and >=n^2/2 pins, scan budget. Viz:
      the string tightening, pops flashing red. First geometry group.
- [x] F14. Gradient descent × Polyak momentum, live as puzzle 20
      (2026-08-27, Fable). One rotated quadratic, d=60, kappa=100, stop
      at gradient 1e-8: plain GD 823 iterations (theorem predicts ~921),
      +momentum 108 (theorem ~92: the sqrt-kappa speedup measured at
      7.6x), Nesterov 177 (same class + the optimality certificate),
      conjugate gradient EXACTLY d=60 (finite termination through
      float), Newton 1 step at ~11 gradient-equivalents (wins the
      quadratic outright: the honest d^3 boundary lesson). The 2/L
      step cliff diverged on schedule (1.05^k), and the underdamped
      ball measurably climbs mid-flight while converging (momentum is
      not a descent method). New atlas pair entry {Gradient descent,
      Polyak momentum, t1}, summary 3,253 -> 3,254. Oracles: all five
      match Gaussian elimination, BOTH rate theorems bracket measured
      counts, CG <= d, Newton == 1, cliff, monotonicity/overshoot.
      Viz: two marbles, one canyon. First numerical homepage group.
- [x] F15. Kahn × zero in-degree queue, live as puzzle 21 (2026-08-27,
      Fable). 2,000 tasks / 8,000 deps: ready queue 12,000 touches
      (asserted == 2V+E exactly) vs source rescan 2,009,000 (167x) vs
      DFS finish-order 8,424. Cycle dialects measured on a planted
      5-ring: Kahn names the full 446-task blast radius, DFS returns
      the exact 5-cycle (verified edge by edge). Waves: 20 == longest
      chain + 1 by independent DP. Min-heap variant proven lex-smallest
      against exhaustive enumeration on 40 small DAGs. Never-here:
      sorting by in-degree violates 1,049 of 8,000 deps (no scalar key
      can encode a partial order). Atlas: Kahn h null -> Zero in-degree
      queue (rule 2), heuristics 2,308 -> 2,309. Viz: the amber
      frontier sweeping a wave-layouted graph.

The F-queue extends again (2026-08-27, same owner directive; names
atlas-verified, pairs authored per rule 2 at build where h is null):

- [x] F16. Binary search × halving invariant, live as puzzle 22
      (2026-08-27, Fable). 1M keys, 10K lookups/cell, average probes:
      binary 20.0 / 19.9 / 20.0 (the flat row: minimax means no bad
      inputs; the max over all 10,000 lookups asserted <= ceil(log2
      n)+1); interpolation 4.9 / 250.0 / 4.9 (log log n at home, 12x
      worse under cubic skew); exponential-from-cursor 37.9 / 37.8 /
      9.5 (log of the hop); linear-from-cursor 25.4 near-cursor, ~n/2
      elsewhere (4,867 measured at n=10^4). The museum piece (lo=mid
      without +1) pinned spinning forever on [1,3] seeking 3, with the
      1946/1962/90-percent/Java-2006 record cited on the page. Oracles:
      100K-case bisect agreement incl. duplicates/absences/hints, both
      interpolation faces, the gallop bound. Atlas: Binary search h
      null -> Halving invariant (rule 2), heuristics 2,310. Viz: two
      probe policies racing the same lookups on one strip.
- [x] F17. Kruskal × union-find cycle test, live as puzzle 23
      (2026-08-27, Fable). n=1,200, distinct weights (unique MST: all
      four methods must return the IDENTICAL edge set, and do). Work
      (sort charged at E log E): sparse E=8,000: Kruskal+UF 115,881
      (sort ~104K, connectivity nearly free at 0.93 parent-jumps/find,
      puzzle 08's promise measured) vs BFS cycle test 3,998,220 (34x)
      vs Prim 32,001 (raw winner) vs Boruvka 102,487 (11 halving
      rounds). Dense E=120,000: Kruskal 2.04M (90% sort) vs Prim 480K.
      Cycle-property certificate verified on 500 sampled non-tree
      edges; disconnected input yields the correct forest; never-here:
      the MST as a routing table, worst detour 15.2x vs Dijkstra over
      100 pairs (cross-links puzzle 07). Atlas: Kruskal h -> Union-find
      cycle test (rule 2), heuristics 2,311. Viz: villages wiring
      cheapest-first, components sharing colors as union-find merges.
- [x] F18. Reservoir sampling × Algorithm R, live as puzzle 24
      (2026-08-27, Fable). The ledger at n=1M, k=100: R 999,900 draws /
      k memory / exact-k; Algorithm L 3,879 draws (258x: skip, do not
      flip); bottom-k 1M draws + the ONLY exact shard merge (proven
      byte-for-byte); store-all 100 draws at 10,000x memory; Bernoulli
      breaks the contract (sizes 72-124 over 400 runs). Uniformity
      proven EXACTLY: Algorithm R's full decision tree walked in
      Fractions for all n<=8, k<=3 (every inclusion == k/n as a
      rational); bottom-k by complete permutation enumeration; 4-sigma
      statistics at n=100/30K trials for R and L. Never-here:
      systematic sampling phase-locks when the period divides the
      stride (period-8 stream, stride 10,000: one phase only, error
      3.50 vs 0.14; first draft used period 7 and the oracle showed
      coprimality SAVES it, so the trap was rebuilt honestly). New
      atlas entry: Bottom-k sampling (Cohen-Kaplan), summary 3,255.
      Viz: the lifeboat + a decile histogram converging to the uniform
      line across banked streams.
- [x] F19. Wagner-Fischer × prefix-to-prefix table, live as puzzle 25
      (2026-08-27, Fable). 2,000-char pair, 40 planted edits, true
      distance 37: full table 3,993,996 cells (asserted == (n+1)(m+1)
      exactly) with a verified script; two-row same work at 1/1000
      space, script gone; Hirschberg 8,045,979 (2x) with the script
      back at linear space, also verified; Ukkonen band k=45 179,781
      (22x less), honest 'more than k' on a distant pair; Myers diff
      3,626 steps in its own indel metric (d=53; snakes down
      diagonals; git diff's engine); naive recursion 797,161 calls at
      n=12 (3^n). Every script APPLIED as an executable witness; the
      metric axioms (incl. triangle) on 200 triples; the indel
      identity d = n+m-2*LCS confirmed by three independent programs;
      SETH lower bound (Backurs-Indyk 2015) cited as the honest
      quadratic wall. Atlas: W-F h -> Prefix-to-prefix table (rule 2),
      heuristics 2,313. Viz: the table filling with real values, then
      the green backtrace; five rotating word pairs. The DP-state
      lesson explicitly paired with Kadane's (state cannot shrink here;
      shrink space, work, or metric instead).
- [x] F20. Fenwick tree × low-bit ladders, live as puzzle 26
      (2026-08-27, Fable). n=3,000, cells touched: mixed 3k updates +
      3k queries: Fenwick 34,906 (winner) vs rebuild-cumulative
      4,473,363 (128x) vs segment tree 68,444 (the 2x generality tax)
      vs sqrt blocks 167,663. Static build + 100k queries: cumulative
      array 100,000 (5.6x UNDER Fenwick's 560,918: the honest
      crossover). Worst single Fenwick op at n=100,000: 15 touches
      (bound 18), asserted as a maximum. Ownership invariant
      (tree[i] == its block sum) verified for EVERY cell; lowbit
      identity over 4,096 ints; reversibility; and the never-here
      proven information-theoretically: two witness arrays with
      identical prefix minima and different range minima, so range-min
      is unrecoverable from prefixes (min has no subtraction). Atlas:
      Fenwick h -> Low-bit ladders (rule 2), heuristics 2,314. Origins
      loop closed: Fenwick 1994 built it for arithmetic-coding models
      (puzzle 14's coder). Viz: ownership arcs over 16 cells, queries
      descending green, updates climbing amber.

The F-queue extends a third time (2026-08-27, same standing
directive; names atlas-verified):

- [x] F21. Aho-Corasick × failure-link automaton, live as puzzle 27
      (2026-08-27, Fable). Text n=50,000, dictionary grows 10x: AC
      95,700 -> 96,807 steps (the flat row: +1%); KMP-per-pattern
      5,829,248 at k=100 (61x, k*n by construction; puzzle 09 unshared);
      RK multi-hash 50,040 -> 50,176 (also flat, single-length cage).
      The ushers nest pinned (she@1, he@2, hers@2 via output links);
      every failure link verified against its definition by exhaustive
      enumeration; the rolling-hash evict-before-shift bug caught by
      the agreement oracle mid-build and recorded in the narration.
      Never-here: a 1,000-way backtracking regex alternation (the
      k-pass strategy in convenient syntax; RE2/Hyperscan compile to
      exactly this automaton). Origins: Bell Labs 1975, the automaton
      that outran planned hardware and became fgrep. Viz: the he/she/
      his/hers trie with dashed failure links, text ticker, nested
      fires. Third strings unit; builds on puzzle 09 explicitly.
- [x] F22. Simplex × Dantzig pivot rule, live as puzzle 28
      (2026-08-27, Fable). Pivots to the proven optimum: random 30x60
      LPs (median of 30): Dantzig 9 / Bland 35 / random edge 29 (greed
      wins real ground 4x). Klee-Minty n=12: Dantzig 4,095 = 2^12 - 1
      EXACTLY, with the whole ladder measured (63, 255, 1,023, 4,095);
      Bland 465; random edge 39 (a coin cannot be pre-trapped: 105x
      under the rule the cube was built against, the smoothed-analysis
      story in miniature). Beale's corner in exact Fractions: Dantzig
      with the plain tie-break CYCLES (basis revisited, caught by
      tracking) while Bland terminates at 1/20 in 6 pivots (the 1977
      theorem demonstrated). Oracles: 3 rules match exhaustive basis
      enumeration on 25 exact instances (495 bases each); dual read
      off the final tableau verified feasible with ZERO gap on every
      large solve (strong duality as a unit test); per-pivot
      feasibility; the cube ladder asserted. Never-here: vertex
      enumeration (the toy referee; C(90,30) ~ 6e23 at contest scale).
      Viz: 2D polytope walk with objective contours. Second numerical
      unit.

- [x] F23. Viterbi × max-product trellis, live as puzzle 29
      (2026-08-27, Fable). Casino (2 states, 30x300): Viterbi 81.0%
      accuracy with all paths legal and 50/50 optimal in the 12-state
      arena; posterior decoding 82.5% (wins per-position, the famous
      split) but outputs the IMPOSSIBLE [B,A] story on the canonical
      three-parallel-stories instance (prob exactly 0; first two trap
      drafts failed because a single forbidden edge always gets
      bridged by the gateway state under smoothing, so the canonical
      construction replaced them); greedy chained argmax 58.7%,
      WORSE than ignoring transitions entirely (72.8%): commitment
      compounds on sticky chains; beam-3 on 12 states 4x cheaper and
      0/50 optimal, every miss certified. Linear-space Viterbi
      underflows to exactly 0.0 at n=2,000 (log-space: -3,594.4).
      Oracles: full 3^7 = 2,187-path enumeration matches Viterbi AND
      forward-backward marginals to 1e-9 on 15 models; no rival path
      ever exceeds the MAP log-prob. Atlas: Viterbi h -> Max-product
      trellis (rule 2), heuristics 2,315. The DP-state trilogy
      (Kadane, W-F, Viterbi) completed and cross-referenced. Second
      ml-ai unit. Viz: the casino trellis over truth bands, backtrace
      hugging the amber loaded stretches, misses ringed red.
- [x] F24. Skip list × coin-flip level promotion, live as puzzle 30
      (2026-08-27, Fable). n=20,000, avg visits/op under two arrival
      orders (random / sorted): skip list 41.0 / 39.8 (immunity: the
      lottery never sees arrivals, asserted within 15%); AVL 13.4 /
      13.4 (the visit-count champion, immune via 1,989 rotations and
      the machinery to perform them, invariant verified per node);
      plain BST 16.7 / 1,182 (loves chaos, dies of order: measured at
      n=2,000 because it is that bad); sorted array 2,514.9 / 14.2
      (dies of chaos, loves order: the honest 2x2 of
      order-sensitivity). The coin verified (heights >= k at rate
      2^(1-k)); p99 search 43 visits vs log2 n = 14.3; shadow-set
      agreement over 10K mixed ops incl. deletes and iteration.
      Sorted-array card cross-links puzzle 22 via algoName Binary
      search (live badge). Atlas pair already existed. Third
      data-structures unit. Viz: lanes with coin-flip towers, the
      staircase search, coins shown per insert.
- [x] F25. Strassen × seven-product block split. Puzzle 31, numerical.
      Measured at n=256 exact integers: classical 16,777,216 mults /
      16.7M adds (asserted == n^3); cutoff-16 Strassen 9,834,496 /
      12.5M (asserted == 7^4·16^3), total ops 22.3M vs 33.5M; pure
      recursion at n=64 exactly 7^6 = 117,649 mults. Cutoff sweep
      monotone: every deeper level helps (16 best of {16..256}).
      Freivalds referee: 3.9M ops vs 33.5M recompute (8x), planted
      corruption caught, identity verified on 500 scalar cases,
      padding agrees at n=31,33,100. Cards: self, Coppersmith-Winograd
      (galactic, honest), Freivalds. neverUse: a galactic exponent in
      production. Figure: the seven Ms beside the four quadrant
      assemblies, DOI 10.1007/BF02165411. Atlas: Strassen h authored
      per rule 2; Freivalds x Random vector probes ADDED (numerical,
      t2); phrase Matrix product verification joined
      matrix-multiplication; summary 3256. Viz: 2x2 scalar blocks, the
      seven products forming with signed-cell highlights, quadrants
      assembling in green, classical referee agreeing on canvas.
- Fourth F-queue extension (atlas-verified pairs, in build order):
- [x] F26. Miller-Rabin × witness rounds. Puzzle 32, first
      crypto-number-theory unit. Measured on all 49,999 odd n below
      100,000 against a sieve matching published pi(10^5)=9,592:
      Fermat base-2 wrong 78 (first 341; 561 fools all 320 coprime
      bases, verified exhaustively); MR base-2 wrong 16 (first 2047);
      MR 20-random 0 wrong at 4.31 modexps/number; deterministic
      12-witness 0 wrong at 2.41 (proven < 3.3e24, the referee).
      Rabin's quarter bound verified exhaustively on all 16 strong
      pseudoprimes: worst liar fraction 0.1857. 561 anatomy: strong
      liars collapse 320 -> 10. 63-bit hunt: 5 primes in 96
      candidates, every verdict refereed. neverUse priced: 8,388,600
      trial divisions vs 1 modexp on a 48-bit semiprime. Cards: self,
      Deterministic MR (fixed witness set), Fermat, AKS. Figure: the
      chain's two doors, DOI 10.1016/0022-314X(80)90084-0. No atlas
      edits needed (pair existed with h; summary stays 3256). Viz:
      three-act courtroom (97 acquitted, 561 the Carmichael, 2047 the
      liar), chains box by box, convictions in red.
- [x] F27. Quickselect × random pivot. Puzzle 33, sorting-selection.
      The flagship: McIlroy's gas adversary implemented and run LIVE,
      building certified killers for med-3 (replay 1,503,501 cmps at
      n=2,000, >= n^2/8 asserted) and first-element (3,003,000); the
      lottery eats the same killer at 9,084 cmps (4.54n, 10-seed avg);
      BFPRT 20,058 (10.0n, unmoved); Timsort 11,266. Friendly ledger
      at n=100K: random 5.2n avg (classic 3.39n x ~1.5 for the 3-way
      partition, theory matches), med3 4.36n (honestly cheaper on
      random), MoM 11.51n, Timsort 15.29n, heapselect 1.00n at k=10 /
      13.96n at k=n/2. All-equal storm 2.00n (3-way partition's
      purchase). 300 duplicate-heavy referee trials incl. rank edges.
      Discovery recorded: first-element on SORTED input is NOT
      quadratic under a 3-way partition (measured ~75n: the swaps
      scramble the order); folklore claim replaced by the built
      killer, honesty noted in code comment. Cards: self
      (Floyd-Rivest named), MoM (introselect named), Heapselect,
      Timsort. neverUse: any fixed rule facing chosen inputs. Figure:
      geometric collapse vs gas starvation, cite Hoare Algorithm 65 +
      BFPRT + McIlroy 1999. No atlas edits (pair existed t2); summary
      stays 3256. Viz: two acts on 48 bars, act 2's killer built by a
      JS gas adversary in-module against the same code.
- [x] F28. Bellman-Ford × early-exit relaxation. Puzzle 34, graphs.
      Measured at n=1,000 m=5,000 (2,017 negative edges, no negative
      cycle PROVEN by potential construction): full schedule 5,000,000
      relaxations, early exit 45,000 (9 rounds vs 999), SPFA 9,306,
      Dijkstra-on-negatives 4,941 relaxations and 852/1,000 WRONG
      (gadget certifies the greed failure deterministically). Referee:
      Johnson-space Dijkstra (shifted nonneg weights) confirms every
      distance: an independent algorithm in an independent currency.
      Planted 3-cycle returned as a vertex list, certified sum -120.
      Arbitrage reading: constructed FX table yields a -log loop
      multiplying to 1.0064. 200 exhaustive-referee small-graph
      trials. Cards: self, Dijkstra (live badge), SPFA
      small-label-first (obituary cited), Distance-vector routing x
      B-F exchange (the distributed sibling, cross-category).
      neverUse: Dijkstra on unproven signs. Figure: hop horizons +
      cycle round, cite Bellman 1958 DOI 10.1090/qam/102435. Atlas:
      B-F h authored per rule 2 (Early-exit relaxation); summary
      heuristics 2317 -> 2318. Viz: 12-village telephone chain, act 1
      quiet-round exit, act 2 planted red loop certified at round n.
- [x] F29. Segment tree × lazy propagation. Puzzle 35, data-structures.
      Measured at n=10,000, m=2,000 mixed range-adds/range-sums (avg
      span 2,480): naive 4,961,554 visits (2,481/op, asserted == summed
      spans exactly), sqrt decomposition 244,402 (122/op, 20x), lazy
      segtree 94,400 (47/op, 53x), Fenwick two-tree 53,220 (27/op,
      93x: the sum-specialist honestly WINS its home algebra; builds
      priced off the clock after catching the ledger distortion).
      Generality proven: min-monoid lazy tree referee-checked over
      1,000 ops. neverUse: the eager tree, 1,297,075 vs 15,984 visits
      (81x, certified >= 20x). Referees: brute-force agreement on
      every query across all structures at n=200 and n=10,000; lazy
      inside 4(log n + 2)/op bound. Cards: self, Fenwick two-tree
      (live badge), Sqrt decomposition, Mo's algorithm (offline
      regime). Figure: debt stamps on cover nodes, cite de Berg et
      al. ch. 10, DOI 10.1007/978-3-540-77974-2. No atlas edits
      (pair existed t1); summary stays 3256/2318. Viz: 16-leaf tree,
      amber debt chips, pushes under footsteps, full-range ops
      touching one node.
- [x] F30. Metropolis-Hastings × proposal acceptance ratio. Puzzle 36,
      ml-ai. Three-layer exact-chain oracle: detailed balance verified
      on all 144 pairs of a 12-state ring chain, pi recovered by power
      iteration (err 1e-10) AND a 300K-step simulation (err 0.003).
      Z-independence PROVEN bitwise (same-seed chains with/without an
      arbitrary constant identical). Bimodal moments: mean -0.036 /
      E[X^2] 9.98 / P(X>0) 0.495 vs exact 0/10/0.5. Dial at 100K
      steps: timid sigma 0.1: 96.9% acc, ESS 110, 26 crossings; tuned
      2.4: 49.3%, ESS 4,047, 5,088; reckless 50: 5.0%, ESS 2,493
      (HONEST SURPRISE kept: a landed leap teleports in 1-D, assert
      relaxed to 1.3x and the finding recorded) but 0.00% acceptance
      at d=6 (dimension is the killer, measured). Beta(8,4) coin
      posterior: mean 0.6671 vs 2/3, var to 4 decimals. neverUse:
      rejection sampling at d=6: 50/200,000 accepts (0.03% vs theory
      0.025%!) vs MH ESS 8,009 (160x). Cards: self, Gibbs, HMC,
      Rejection sampling. Figure: detailed balance flow, cite
      Metropolis et al. 1953 DOI 10.1063/1.1699114. No atlas edits
      (pair existed t1); summary stays 3256/2318. Viz: the critic on
      the bimodal curve, amber occupancy histogram, timid vs tuned
      acts.
- [x] F31. FFT × Cooley-Tukey radix-2. Puzzle 37, numerical
      (problemSlug signal-transforms). Butterfly counts asserted TO THE
      INTEGER at five sizes (== (n/2)log2 n); naive-DFT referee agreement
      to 1e-7; 50 round-trips + Parseval. Headline: n=1,024 naive
      1,048,576 vs FFT 5,120 (205x, both ran); n=65,536 FFT 524,288
      measured, naive 4.29B stated-not-run (honesty labeled). Spectral:
      3 planted tones = exactly the top 3 bins, amplitude 0.999
      recovered. Polynomial ladder at 1,024 coeffs (all exact):
      schoolbook 1,048,576 / Karatsuba 59,049 (=3^10) / FFT 35,840;
      at 8,192 (K and FFT referee each other): 1,594,323 vs 360,448
      (4.4x, crossover honesty: nearly tied at 1K). Float error
      5e-11 / 3e-9, rounded exact. Found+fixed: counter passed
      positionally into invert (empty dict falsy: transform right,
      counter silently absent). Cards: self, naive DFT (referee),
      Karatsuba (measured middle rung), Schönhage-Strassen (exact at
      scale). neverUse: the definition at scale. Figure: butterfly,
      cite Cooley-Tukey 1965 DOI 10.1090/S0025-5718-1965-0178586-1 +
      Gauss 1805 story. No atlas edits (pair existed t1); summary
      stays 3256/2318. Viz: 16-lane cascade with twiddle labels +
      the 128-sample payoff act (tones surface green).
- Fifth F-queue extension (atlas-verified, in build order):
- [x] F32. LZ77 × sliding-window matching. Puzzle 38,
      compression-coding. LZSS flag-bit framing implemented and NAMED
      honestly (the first crude 2-byte-literal format made prose
      expand at small windows: caught by measurement, upgraded).
      Living-corpus oracle: byte-exact round trips on 4 repo files +
      edges. Headline (OVERNIGHT-PLAN.md, 51,790 B): Huffman alone
      32,128 (1.61x) vs LZ77 alone 32,719 (1.58x): a measured NEAR-TIE
      from disjoint redundancy, and DEFLATE (zlib -9) 23,064 (2.25x)
      beating both by 40% (asserted strictly). Window dial monotone:
      256B -> 49,827; 4K -> 37,838; 32K -> 32,719 (asserted). Corpus:
      puzzles.js 2.04x, theme.css 2.93x, fft solution 1.80x. Edges:
      all-same 10K -> 127 B (79x); random 10K -> 11,250 B (expansion
      = the flag bits EXACTLY: pigeonhole priced). Cards: self,
      Huffman (live badge), DEFLATE, LZW (patent saga). neverUse:
      compressing the incompressible. Figure: window + back-arc, cite
      Ziv-Lempel 1977 DOI 10.1109/TIT.1977.1055714. No atlas edits
      (pair existed t1); summary stays 3256/2318. Viz: the scribe on
      the site's own tagline, amber margin notes, green = never
      stored, live byte ledger. NOTE: corpus is living: printed
      numbers drift as the repo grows; asserts are structural.
- [x] F33. Activity selection × earliest-finish-first greedy. Puzzle
      39, optimization-or (problemSlug interval-scheduling). Three-layer
      referee: DP (weighted-interval, predecessor bisect) == subset
      brute force on 300 small instances, then EF == DP on ALL 2,000
      random trials + both gadgets. The wrongness gradient measured at
      n=10,000 (optimum 229): earliest-start 13 (6% of optimal! FCFS
      as policy-vs-objective lesson; gadget 1 vs 50), shortest-first
      227 (fails 311/2,000; gadget 50 vs 100), fewest-conflicts right
      499/500 with a discovered 29-interval counterexample kept.
      Weighted boundary priced: cardinality greed keeps 82.1% avg /
      42.5% worst of optimal value over 300 weighted trials. Perf
      fixes during build: shortest-first needed bisect conflict
      checks; fewest-conflicts got right-sized loops (500 trials n<=30
      + its own n=400 row). Cards: self, Weighted interval scheduling
      DP, Earliest deadline first (the preemptive cousin). neverUse:
      FCFS as an optimizer. Figure: the exchange argument, cite
      Edmonds 1971 DOI 10.1007/BF01584082. No atlas edits (pair
      existed t1); summary stays 3256/2318. Viz: 18 requests, two
      acts (EF sweep with room-free cursor vs shortest-first), seeded
      search guarantees the shortfall every cycle.
- [x] F34. Consistent hashing × virtual nodes. Puzzle 40,
      distributed-systems (NEW site category; problemSlug
      distributed-key-placement). The movement theorem asserted as SET
      ALGEBRA (moved == owned exactly, at v=1 and v=100, and for
      rendezvous too; joins land every moved key on the newcomer,
      9.8%). Measured at 10 nodes / 100K keys / one removal: mod-N
      90.0% moved (== (N-1)/N theory) at 1.02 balance (honest: the
      modulus balances beautifully on a frozen fleet); ring v=1: 24.9%
      moved (the victim's arc was 2.49x bloated: minimal-movement of a
      bloated arc) with exactly 1 heir; ring v=100: 9.5% moved, 1.13
      balance, 9 heirs; rendezvous: 9.9%, 1.02, n hashes/lookup
      (100,000 vs 10,000 counted). Vnode dial: cv 0.716 / 0.280 /
      0.079 / 0.035 at v=1/10/100/1000. Perf fix during build: Ring()
      was being constructed inside dict comprehensions (4 minutes ->
      2.0s after hoisting). Cards: self, Rendezvous × HRW, Maglev ×
      permutation table, Bounded loads (networking). neverUse: mod-N
      where membership changes ("the failure is scheduled"). Figure:
      two rings (1 pin vs many), cite Karger et al. STOC 1997 DOI
      10.1145/258533.258660. No atlas edits (pair existed t1); summary
      stays 3256/2318. Viz: two-act ring with real arc geometry,
      departure flash, heirs counted on canvas.
- [x] F35. Closest pair divide and conquer × midline strip merge.
      Puzzle 41, geometry (problemSlug closest-pair). The packing
      lemma COUNTED live: <= 7 asserted on every strip point of every
      run; observed max 2 (uniform) and 1 (collinear). 500
      brute-refereed trials across 4 hostile shapes incl. distance-0
      duplicates; mutual 1e-9 agreement of D&C/sweep/grid at n=100K
      (0.013389). Ledger with BOTH currencies (distances AND seconds:
      the metric lesson): brute 5.0B stated ~1hr; D&C 142,614 / 0.41s;
      sweep 21 / 0.06s (distances near-free: bill is window upkeep);
      Rabin grid 70 / 0.40s, 26 rebuilds. TWO honest surprises kept:
      distance counts alone would crown the sweep 6,000x, and the
      collinear stress expected to hurt the sweep instead helps it
      (identical x arrives y-sorted: inserts append). Sweep eviction
      rewritten to amortized x-pointer during build. Atlas: Rabin's
      closest pair × Random grid rounds ADDED (computational-geometry
      t3; check.mjs caught the dangling card link, which is the
      enforcement working); summary 3256 -> 3257 (a 3026, h 2319).
      Cards: self, Closest pair sweep (t1), Rabin's closest pair,
      Bowyer-Watson (Delaunay-edge route). neverUse: the double loop
      past its crossover (with the below-100 honesty). Figure: strip
      + delta-box packing, cite Shamos-Hoey FOCS 1975 DOI
      10.1109/SFCS.1975.8. Viz: one recursion level, planted
      straddling winner (retry-searched so the caption never lies),
      strip scan with live lemma counter.
- [x] F36. MinHash × bottom-k signatures. Puzzle 42, probabilistic
      (problemSlug similarity-sketching). The collision theorem
      measured at its exact value: 668/2,000 = 0.3340 vs true 1/3.
      Composability asserted as EXACT list equality (sketch of union
      == merged sketches, 100/100). Error ladder over 200 trials/size:
      RMSE 0.0961 / 0.0500 / 0.0255 / 0.0115 at k=16/64/256/1024,
      tracking sqrt(J(1-J)/k), monotone + 4x-k => >=2.5x shrink
      asserted. Hashing bill counted: bottom-k 10,000 hashes vs
      k-wise 2,560,000 (256x). Site's own prose refereed by full set
      ops: two narrations J=0.034 (house style quantified); plan vs
      front-70% J=0.703 est 0.656. LSH banding: 200 docs, 5 planted
      near-dupes (J>0.75): ALL 5 surfaced in exactly 5 candidate
      pairs vs 19,900 all-pairs (3,980x, perfect precision+recall).
      Build fix: the ∪ glyph hard-crashed the cp1252 console print
      (not just mojibake): ASCII'd. Cards: self, Shingling ×
      MinHash-LSH, SimHash × random hyperplanes. neverUse: all-pairs
      exact at corpus scale ("pay exactness per candidate, never per
      pair"). Figure: the shared-minimum Venn, cite Broder SEQUENCES
      1997 DOI 10.1109/SEQUEN.1997.666900. No atlas edits (pair
      existed t1); summary stays 3257/2319. Viz: the lottery played
      on Venn dot clouds, winner flashes, estimate meter converging
      to the true-J line.
- [x] F37. Hopcroft-Karp × layered augmenting phases. Puzzle 43,
      graphs (problemSlug bipartite-matching). The crown oracle:
      KONIG CERTIFICATES: from the final failed BFS the code
      constructs a vertex cover of exactly the matching's size and
      checks it against EVERY edge, on all 300 brute-refereed small
      trials AND the 50K-edge instance (4,999-vertex cover verified
      edge by edge). Measured at 5,000+5,000 / 50,000 edges: HK
      279,886 edge touches, matching 4,999, 4 phases vs permitted
      ~2sqrt(V)=200; Kuhn same answer at 1,776,030 touches (6.3x,
      honest: random ground is kind to Kuhn); greedy 4,659 (93.2%
      here, pinned to EXACTLY 50% on the constructed 500-fold P3
      gadget). Hall-violation gadget: 10 lefts sharing 3 rights:
      matching exactly 5 = 3+1+1, self-certified. Atlas: HK h
      authored per rule 2 (Layered augmenting phases); summary
      heuristics 2319 -> 2320. Cards: self, Kuhn × augmenting DFS,
      Hungarian (the weighted boundary), Dinic (live badge: HK = Dinic
      on unit networks). neverUse: greedy as the final answer. Figure:
      one phase's layers + batch, cite Hopcroft-Karp SIAM JC 1973 DOI
      10.1137/0202019. Viz: the job-fair tide: BFS ripples, batches
      flipping together, then the Konig cover in red rings with the
      equality on canvas (instance seeded-searched for >=2 phases
      with a real batch). FIFTH EXTENSION COMPLETE (F32-F37).
- Sixth F-queue extension (atlas-verified, in build order):
- [x] F38. Boyer-Moore × bad-character and good-suffix rules. Puzzle
      44, strings. Sublinearity MEASURED on the site's own plan
      (60,365 chars, living corpus): 'the algorithm' found reading
      6,599 chars = 10.9%; the pattern-length dial 31.0%/16.6%/10.0%/
      6.0% at m=4/8/16/32 (monotone asserted); KMP reads exactly
      100.0% (>= n asserted); naive 107.1%. THE FINDING (prediction
      corrected by measurement, kept): on binary text Horspool alone
      reads 1.50n: MORE than the text: while the good-suffix rule
      holds full BM to 0.50n; on prose the two tie exactly (6,599 ==
      6,599). The good-suffix table's measured raison d'etre. Worst
      case measured: a^20000 vs a^20 = 399,620 inspections (> 5n),
      Galil cited as the patch. 600 str.find-refereed trials across
      four alphabets. Cards: self, KMP (live badge), Horspool
      (distinct atlas t2 entry; Sunday named in-card), Aho-Corasick
      (live badge, multi-pattern regime). neverUse: bad-character
      alone on a small alphabet. Figure: the leap, cite Boyer-Moore
      CACM 1977 DOI 10.1145/359842.359859 + grep lore. No atlas edits
      (pair existed t1); summary stays 3257/2320. Viz: the stencil on
      a real sentence, right-to-left flashes, leap arcs with
      distances, unread text dim forever, closing percentage card.
- [x] F39. Newton's method × tangent-line iteration. Puzzle 45,
      numerical (problemSlug root-finding). The quadratic law as RAW
      DATA: sqrt(2) in 60-digit Decimal, correct digits per iteration
      [1, 2, 5, 11, 24, 48, 58], each rung >= 2k-1 asserted. Contest
      to 1e-12 on x^2-2: bisection 40 its / 41 evals; secant 6 / 8;
      Newton 5 / 11: the secant's per-eval win (1.618 on singles beats
      order-2 on doubles) KEPT and asserted (c_s <= c_n). Failure
      gadgets asserted exactly: x^3-2x+2 from 0 repeats [0,1,0,1,0,1]
      literally; cbrt obeys x <- -2x to 1e-9 per step. Clients:
      Kepler at e=0.9 in 6 its (residual < 1e-13); cash-flow IRR
      21.62% in 5, bisection cross-check to 1e-9. Atlas: Newton h
      authored per rule 2 (Tangent-line iteration); summary h 2320 ->
      2321. Cards: self, Bisection, Secant, Brent × inverse quadratic
      (Halley named in-card). neverUse: unguarded Newton on an unmet
      function ("own the basin or rent the bracket"). Figure: the
      tangent jump + ladder, cite Cayley 1879 basin question DOI
      10.2307/2369492. Viz: two acts of real tangents: the stride
      home on the parabola with a live error ladder, then the cubic's
      2-cycle bouncing forever.
- [x] F40. Fisher-Yates shuffle × backward uniform swaps. Puzzle 46,
      probabilistic (problemSlug shuffling). The distribution oracle:
      all 24 cells over 240K shuffles, every cell within 4.5 sigma,
      chi2 35.3 (23 dof). The impostor convicted by ITS OWN THEORY:
      all 256 swap-anywhere paths enumerated exactly, every measured
      cell matching the enumeration at 5 sigma, worst bias 41%, chi2
      7,166. Sort-by-float uniform (37.3) at its price; sort-by-tiny-
      key leaks: identity +228% (also matched to enumeration). Seed
      ceiling MEASURED: 16-bit seeds reach 64,940 of 3,628,800
      ten-item orderings (1.79%); 2^32 < 52! asserted (the 1999
      Planet Poker lesson as arithmetic). Atlas: FY h authored per
      rule 2 (Backward uniform swaps); summary h 2321 -> 2322. Cards:
      self, Reservoir sampling (live badge), Lexicographic
      permutations × next-permutation (the enumerator), Verifiable
      shuffle × Neff proof (distrusted shufflers). neverUse: the
      off-by-one impostor ("randomized code is exactly as trustworthy
      as the tests you run against its distribution"). Figure: the
      two decision trees (n! vs n^n leaves), cite Durstenfeld CACM
      1964 DOI 10.1145/364520.364540. Viz: three acts: the sweep with
      the amber unlocked bracket, then live histograms: the true
      shuffle flat, the impostor's jagged skyline.
- [x] F41. B-tree × high-fanout node splits. Puzzle 47,
      data-structures (problemSlug disk-ordered-index). Full B-tree
      implemented (preemptive median splits, range scans, page-read
      counters) with a recursive invariant checker: sorted-in-node,
      occupancy bounds, key-range containment, and SAME-DEPTH for
      every leaf, re-verified every 1,000 ops and at every fanout.
      Shadow bisect-dict referee agreed on 20,000 mixed ops incl.
      exact range contents. Measured at 100K keys / 10K lookups:
      B-tree t=64: 2.99 pages/lookup, height 3; sorted-file binary
      search 9.53; BST pointer-per-key 21.12 (7x, asserted > 4x).
      Fanout dial: t=2/8/64/512 -> heights 13/5/3/2 (monotone
      asserted). Range scan of 500 keys: 8 pages (height + payload).
      Splits: 1,124 across 100K inserts (~n/t, < n/32 asserted).
      Atlas: B-tree h authored per rule 2 (High-fanout node splits);
      summary h 2322 -> 2323. Cards: self, B+ tree (the shipping
      leaf-linked form), LSM tree × tiered compaction (the read/write
      bargain), Skip list (live badge, the RAM tier). neverUse:
      pointer-per-key trees as disk indexes ("reads blocks, uses
      bytes: retail for wholesale"). Figure: tall 1-key pages vs the
      3-level ledger, cite Bayer-McCreight Acta Informatica 1972 DOI
      10.1007/BF00288683 + Comer 1979. Viz: a 2-3-4 tree built key by
      key with ROOT-SPLIT banners, then lookups walking root-to-leaf
      with a live page counter.
- [x] F42. Earliest deadline first × dynamic deadline priority.
      Puzzle 48, optimization-or (problemSlug realtime-scheduling).
      Discrete preemptive simulator, full hyperperiods (lcm) from the
      synchronous critical instant. The optimality theorem HAMMERED:
      780 task sets with U <= 1: zero EDF misses (300 broad + 480
      binned). RM clean on 150 sets below ln 2. The Liu-Layland gap
      as a measured curve (120 sets/bin): 120/120, 119/120, 98/120,
      58/120 across U 0.70-1.00. Classic casualty deterministic:
      (2,5)+(4,7) at U=97.1%: EDF clean, RM drops a job every
      hyperperiod. Overload flip on (3,5)+(4,7) at U=1.171: EDF
      sprays [2,2], RM shields [0,4]. HONEST FINDING kept: the first
      overload gadget ((3,5),(3,8),(9,40)) refuted the folklore: with
      well-separated periods EDF also shields the fast task (its
      deadlines are always earliest); the spray needs near-equal
      non-harmonic periods: measured, noted on the page. Atlas: EDF h
      authored per rule 2 (Dynamic deadline priority); summary h 2323
      -> 2324. Cards: self, Rate-monotonic (t2), Activity selection
      (live badge: the offline non-preemptive contrast). neverUse:
      fixed priorities past the bound, unanalyzed. Figure: the two
      curves with the ln 2 line, cite Liu-Layland JACM 1973 DOI
      10.1145/321738.321743 + Buttazzo's Judgment Day. Viz: the
      classic pair's Gantt run twice: RM's red X returning every
      hyperperiod, then EDF landing all 12 jobs.
- [x] F43. Suffix array construction × prefix-doubling ranks. Puzzle
      49, strings (problemSlug text-indexing). Layered certification:
      300 slice-refereed small builds (4 text shapes incl runs), then
      at scale (the plan, 65,995 chars, living corpus) the ENTIRE
      ordering certified adjacent-pair-by-adjacent-pair via a Kasai
      LCP array that is itself re-verified char-by-char (run holds,
      maximal, strictly ordered). Rounds 7 <= ceil(log2 n), and the 7
      CORROBORATES max(LCP) = 78 < 2^7: the same fact twice. 20
      pattern locate/counts == find-loop referee (overlaps included).
      Longest repeat: 78 chars of the plan's own boilerplate,
      find!=rfind certified. Adversary: at n=1,000, cmp-sort pays
      14,912 char compares on English vs 1,811,090 on 'ab'*500
      (121x); doubling 10 rounds on both. neverUse: materializing
      suffixes (1.8 GB for this text, stated not run). Cards: self,
      Suffix tree × Ukkonen, FM-index × backward search (the
      compressed genomics winner), Kasai's (the companion that IS
      this page's verifier). Figure: rank pairs summarizing 2^k
      chars, cite Manber-Myers SIAM JC 1993 DOI 10.1137/0222058. No
      atlas edits (pair existed t1 with h); summary stays 3257/2324.
      Viz: abracadabra$ doubling rounds with rank badges gliding into
      order, then binary-search probes landing on the green
      occurrence block. SIXTH EXTENSION COMPLETE (F38-F43).
- Seventh F-queue extension (atlas-verified):
- [x] F44. Floyd-Warshall × intermediate-vertex sweep. Puzzle 50 (a
      round number worth noting: the site opened tonight at 8), graphs
      (problemSlug all-pairs-shortest-paths). 200 trials refereed by
      per-source Bellman-Ford incl. negative edges (potential
      construction); reachability == BFS (the closure reading); 200+
      paths reconstructed via next[][] and re-priced edge by edge; the
      k-innermost LOOP-ORDER BUG measured wrong on 52/60 graphs AND
      its strange redemption confirmed: repeating the wrong loop 3
      times healed all 60; planted negative 3-cycle surfaced on the
      diagonal. Two-terrain ledger at n=200: dense: FW 7.96M ops/0.40s
      vs Johnson 8.0M/0.21s (honest clock note: heapq's C beats a
      pure-python triple loop even dense); sparse (m=800): FW 4.39M
      (blind to sparsity) vs Johnson 354,660 (12x). Johnson == FW
      exactly on both terrains (mutual referee). Atlas: FW h authored
      per rule 2 (Intermediate-vertex sweep); summary h 2324 -> 2325.
      Cards: self, Johnson × reweighting, Dijkstra (live), B-F (live:
      the referee). neverUse: the sweep past a few thousand vertices.
      Figure: the certified-interior invariant, cite Floyd Algorithm
      97 CACM 1962 DOI 10.1145/367766.368168. Viz: seven cities +
      live tariff matrix, hubs opening one per round, improved cells
      flashing, finale walking one route on the map from next[][].
      Bench reseeded: Trie × shared-prefix branching (d fixed to the
      atlas phrase Prefix-keyed dictionary after grep).

## Phase G. Plumbing and hygiene (added 2026-07-22 evening)

- [x] G1. DNS prep done to the owner-action line. Both domains ATTACHED
      to the Netlify site via API (custom_domain algonow.net + www and
      both algohome hosts, verified in the API response); both currently
      resolve to registrar parking IPs. `docs/DNS.md` holds the exact
      registrar records (apex A 75.2.60.5, www CNAME
      algonow-net.netlify.app), the auto-cert sequence, and the
      verification commands. The registrar flip is the single remaining
      owner action.
- [x] G2. All 19 unregistered 3+ entry phrases folded into problems.json:
      15 new problems, Scalable GP and Causal effect estimation joined
      existing problems, Hierarchical layout moved from graph-layout into
      a new layered-layout problem beside Layered layout. The rivals
      queue warning is gone; 643 problems registered.
- [ ] G3. Same-name variant surface. rivalsOf now excludes same-`a`
      entries (a01ae18); add a "variants of this method" list to the algo
      page prerender so Dijkstra x binary heap and Dijkstra x arc flags
      cross-link as variants instead of silently ignoring each other.
- [x] G4. Problem-taxonomy consolidation (2026-08-26): 661 -> 648 canonical
      problems via 30 classified merges (each with rationale and method
      overlap in src/data/atlas/merges.json), 17 new problems registered
      from the two-method queue, 18 phrase attachments, 4 true-duplicate
      entries removed, 30 permanent /problem/ redirects, and A-Z +
      by-rivals + per-category problem navigation. The 38-phrase
      rivals-queue warning is retired; the queue floor now counts distinct
      methods. Bundle-side: the new merges.json is excluded from the atlas
      page glob (5e01aa1's fix pattern) and check.mjs gains an
      emitted-bytes guard that fails the build if registry content ever
      reaches the atlas chunk, which source-level tests cannot see; the
      chunk fix itself was 5e01aa1, not this work, and 28d23fa's message
      wrongly implies otherwise (correction recorded in
      docs/TAXONOMY-AUDIT.md). (28d23fa, 78c81e9, c1cdc4e, + audit commit)
- [ ] G5. Alias-slug 301 phase: extend the dist/_redirects emitter beyond
      the 30 retired problem slugs to the ~1,121 /algo/ alias slugs from
      aliases.json (exact-path, force flag while the stub pages exist),
      with a check assertion on line count and a measured file-size and
      deploy verification before committing to the full set. Tooling.
- [ ] G6. Famous-alias sweep beyond the vetted ten: walk the 309 suffixed
      tier-1 names whose bare stem resolves nowhere, adding only
      established short forms; skip ambiguous stems (Seidel, Heap,
      Topological sort). A wrong synonym is worse than a missing one, and
      the atlas-chunk budget is the hard stop (aliases ship inside it).
- [x] G7. Homepage pairs organization (owner directive, 2026-08-26 late
      evening; landed 2026-08-27 at exactly 12 live units). Each registry
      record now declares its atlas category, check.mjs derives the truth
      from the pair's atlas topic file and fails on drift (so the
      homepage never imports atlas data; the 5e01aa1 lesson), and the
      pairs section renders as category groups (7 today) under a chip
      jump strip with counts. Today's pair stays anchored on top; the
      bench is unchanged. A growing catalog is navigated, not scrolled.

## Phase H. Catalog data quality (Fable main thread ONLY, rule 10)

Panel of 2026-08-26 (three proposers + judge, run strictly one at a
time). Every H unit authors or restructures catalog entries, narration,
or d phrases, so no agent may execute any of it; one topic file per
commit, Fable trailer on every commit, check green before each push.

- [ ] H1. Fix the factually wrong phrase on {Coreference resolution,
      Mention-pair scoring} in nlp-tasks.json: its d says "Entity
      linking", but coreference clusters mentions within a text while
      entity linking grounds them to a knowledge base, so the live
      information-extraction problem page lists coreference as an entity
      linking method. Give it a truthful d, walk the 15
      method-name-as-phrase suspects the panel scanned, and unify the
      "Free-energy estimation" / "Free energy estimation" hyphen twins;
      every phrase move keeps problems.json alive in the same commit.
- [ ] H2. Same-name sweep: retire the 13 standalone-beside-pair
      duplicates that violate ATLAS.md rule 2 (Minimax, Gale-Shapley,
      Segment tree, Gibbs sampling, MinHash, SimHash, Earley parser,
      LCS, Bitmap index, Ellipsoid method, Test-and-set lock, Deficit
      round robin and peers; six are sole carriers of registered
      phrases, so transfer the phrases), disambiguate the two DIFFERENT
      algorithms conflated as "Seidel's algorithm" (unweighted APSP vs
      trapezoidal decomposition) and the two "Label propagation"s
      (community detection vs semi-supervised), and merge or
      differentiate the three near-duplicate twins (HMC leapfrog, FMM
      expansion, external merge sort). The live /algo/ conflations lead.
- [ ] H3. a-slot inversion for the 12 single-method clusters where the
      problem sits in the algorithm slot (Maze generation x Wilson's,
      Data race detection x Happens-before, Influence maximization x
      CELF, Point-in-polygon x Ray casting, Continual learning x EWC,
      Mastermind x Knuth minimax, Tetris x Dellacherie, and peers):
      put the real named method in a, register the Lights Out and
      Falling-block phrases, author the genuinely missing rivals for
      least-squares and greeks; retired display names become aliases.
- [ ] H4. Staged triage of the remaining 37 problem-label-in-the-a-slot
      rows, one topic per commit: invert the clear cases (Garbage
      collection x Mark and sweep, Rubik's cube x Kociemba, Association
      rule mining x Apriori, QEC x Shor code, IK x Jacobian transpose),
      keep and document the defensible method names, and converge the
      census to a reviewed allowlist. Unlocks G3.
- [ ] H5. Rehome the seven canon RL rows (Q-learning, DQN, Double DQN,
      PPO, SARSA, REINFORCE with baseline, TD learning) from
      machine-learning.json into reinforcement-learning.json, which
      currently has one tier-1 entry while its canon sits next door;
      decide the SVM x RBF / kernel-methods placement in the same pass.
- [ ] H6. Contest narration section: add 'contest' to NARRATION_SECTIONS,
      point the contest table's listen chip at it (PuzzlePage.jsx wires
      it to 'tradeoffs' today, so the chip plays a minute of
      strength/weakness before any number), and re-key the
      measured-numbers paragraphs in all 8 narration files in the same
      unit so the chip never points at an empty section; every narration
      keeps at least 6 sections.

---

## Resume pointer

- [x] F45. Trie × shared-prefix branching. Puzzle 51, data-structures
      (problemSlug string-key-dictionary). Built on the site's OWN
      vocabulary (2,551 words from the plan). 20,000 shadow-refereed
      mixed ops (bisect ranges as prefix referee). The flat-cost
      theorem asserted EXACT: lookup visits == len(key)+1, identical
      at 300 and 2,551 words. Structural identities asserted: nodes ==
      distinct prefixes + 1 == 7,892; DFS == sorted vocabulary (radix
      order free). Chain fraction 59% measured (the radix tree's
      pitch, priced). Ledger: 2,000 lookups: trie 14,700 visits;
      bisect ~154K char-cmps; hash ~12.8K hashes. 200 prefix queries:
      trie 11,239; bisect 4,800 (the HONEST STATIC WINNER, said
      plainly); hash-scan 510,200 (45x: the neverUse). Autocomplete
      'al' -> the site's own words. Build fixes: a dfs generator
      filtered on the wrong loop variable (caught pre-run), sentinel
      chr(0x10FFFF). Atlas: Trie h authored per rule 2 (Shared-prefix
      branching); summary h 2325 -> 2326. Cards: self, Radix tree ×
      path compression, Hash table with chaining, Aho-Corasick (live
      badge: the trie that grew failure links). Figure: the shared
      a-l-g-o spine, cite Fredkin CACM 1960 DOI 10.1145/367390.367400.
      Viz: two acts: inserts riding paid paths (amber) vs founding
      nodes (green) with a reuse counter, then autocomplete lighting
      the fingertip subtree. Bench reseeded: Tarjan's SCC × low-link
      stack discipline (t1, h null: author at build; grep-verified).

- [x] F46. Tarjan's SCC × low-link stack discipline. Puzzle 52, graphs
      (problemSlug strongly-connected-components). ITERATIVE Tarjan
      (explicit work stack: survives 20K-deep walks). Referees
      layered: 300 brute mutual-reachability trials; structure gadgets
      exact (ring=1 SCC, DAG=singletons, chained cycles emitted
      downstream-first); Kosaraju agreeing at n=20,000 m=60,000 with
      touch counters asserted EXACTLY m (59,995) vs 2m (119,990); the
      condensation's reverse-topo emission asserted on every cross
      edge. THE PAYLOAD: Aspvall-Plass-Tarjan 2-SAT via implication
      SCCs: 250 instances (134 SAT / 116 UNSAT) matching exhaustive
      truth tables, every satisfying assignment re-verified clause by
      clause. Build fixes: the touch asserts were off by skipped
      self-loops (count actual edges); Aspvall's assignment rule was
      inverted (True iff the true-literal's comp is topologically
      later = LOWER Tarjan index). Atlas: Tarjan h authored per rule
      2 (Low-link stack discipline); summary h 2326 -> 2327. Cards:
      self, Kosaraju (2 elegant passes, priced), 2-SAT via
      implication SCC (t2: the payload as a card), Kahn (live badge:
      the condensation's consumer; Gabow named in-card). neverUse:
      per-pair reachability at scale ("quadratic honesty referees
      linear cleverness; production ships the cleverness"). Figure:
      index/lowlink tree with the sealing proof, cite Tarjan SIAM JC
      1972 DOI 10.1137/0201010. Viz: the cave spelunk: chalk marks,
      the rope stack column, back-edge flashes, components flooding
      color as they seal, downstream first.

- [x] F47. Interval tree × max-endpoint subtree pruning. Puzzle 53,
      data-structures (problemSlug spatial-indexing). The CLRS
      augmented-BST form, built balanced by median recursion, with the
      max-end invariant RE-VERIFIED recursively at every node of every
      tree. 20,000 refereed point+window queries across 100 sets;
      scale (20K bookings / year of minutes / 2K stabs avg k=9.3):
      brute 20,000 visits/query, sorted-list+bisect 10,160, interval
      tree 33 (600x). THE ADVERSARY: 40 long-lived intervals among
      20K, late-day queries: sorted scan 14,889/query (74% of the
      set: sorting never narrows past long survivors), tree 131
      (114x): shape, not size, breaks indexes. Honesty: enumerate is
      O(k log n) (centered Edelsbrunner/McCreight variant named for
      the tight bound). Atlas: Interval tree h authored per rule 2
      (Max-endpoint subtree pruning); summary h 2327 -> 2328. Cards:
      self, R-tree × minimal enlargement (the d-dimensional lift),
      Segment tree (live badge: array-position ranges, the different
      question). neverUse: a start-sorted list as a stabbing index
      ("index the question you will ask, not the sort that was
      easy"). Figure: drawers with max-end labels + the pruned
      subtree, cite CLRS ch.14 + Edelsbrunner/McCreight 1980 +
      Guttman R-tree DOI 10.1145/602259.602266. Viz: timeline bars +
      the labeled tree, query line drops, pruned subtrees stamp red,
      hits glow green on both panels. Bench reseeded: Count-min
      sketch × minimum over hash rows (t1 EXACT names after a first
      draft used wrong ones: grep caught it).

- [x] F48. Count-min sketch × minimum over hash rows. Puzzle 54,
      probabilistic (problemSlug frequency-estimation). 1M-item zipf
      stream, 145,527 distinct, sketch 4x2,000 = 8,000 counters (18x).
      The one-sided guarantee asserted UNIVERSALLY (never under on all
      145,527, both CM variants); mean overcount 205.8 inside Markov's
      N/w=500, p99 324. The elephants-mice gradient measured (asserts
      recalibrated after probing: 'top-100 sub-percent' was wrong):
      rank 1: 0.25%, rank 10: 1.94%, rank 100: 23.6%, count-1 median
      overcount 200 = 20,000% relative. Top-20 == exact top-20
      (20/20). Width dial: 3,085 / 207 / 10.2 at w=200/2K/20K.
      Conservative update (Estan-Varghese) implemented: 1.9x tighter,
      still never under (assert relaxed from folklore 2x to measured
      1.4x floor). Count sketch (signed) implemented: bias -1.9 with
      75,540 genuine underestimates: two-sided unbiasedness measured
      as a contract difference. No atlas edits (pair existed t1 with
      h); summary stays 3257/2328. Cards: self, Count sketch, B-M
      majority vote (the O(1) extreme), HyperLogLog (live badge: the
      sibling question). neverUse: point-querying the mice ("collision
      noise in confident typography"). Figure: the grid + minimum,
      cite Cormode-Muthukrishnan J.Alg 2005 DOI
      10.1016/j.jalgor.2003.12.001. Viz: three clerks' clipboards
      heat-mapping a parade, then elephant vs mouse queries with the
      minimum taken on canvas. Bench reseeded: Karatsuba × three-
      product splitting (numerical t1, h to author per rule 2).

- [x] F49. Karatsuba × three-product splitting. Puzzle 55, numerical
      (problemSlug integer-multiplication). The Strassen rhyme, one
      domain earlier: Gauss's identity verified on 500 scalar cases;
      correctness vs Python's own int product (which runs Karatsuba
      internally above 70 digits: the grown-up referee) at 200 random
      sizes for pure and cutoff-8 variants; counts asserted TO THE
      INTEGER at four sizes (n^2 and 3^log2 n exactly). Headline at
      1,024 digits: 1,048,576 vs 59,049 (17.8x, growing n^0.415). THE
      CROSSOVER MEASURED: total ops sweep shows the grid winning
      through 64 digits (4,096 vs 4,719) and Karatsuba first winning
      at 128: beside CPython's shipped KARATSUBA_CUTOFF=70. Atlas:
      Karatsuba h authored per rule 2 (Three-product splitting);
      summary h 2328 -> 2329. Cards: self, Toom-Cook, Strassen (live
      badge: the cross-domain rhyme), Schönhage-Strassen. neverUse:
      the grid at cryptographic scale, with the inverse trap (pure
      recursion below the crossover) measured in the same breath.
      Figure: the thinning grid 64->48->36->27, cite Karatsuba-Ofman
      1962 + the Kolmogorov seminar story. Viz: three acts: the grid
      filling, the 3/4-per-level thinning, Gauss's identity computed
      on live numbers. Bench: a nonexistent pair ('Ukkonen online
      DP') was caught by grep and replaced with Smith-Waterman ×
      zero-floored local scores (t1, h to author).

- [x] F50. Smith-Waterman × zero-floored local scores. Puzzle 56,
      strings (problemSlug edit-distance, shared with W-F as
      dijkstra/B-F share theirs). THE DEFINITIONAL ORACLE: SW == max
      over ALL substring pairs of global score, enumerated
      exhaustively on 150 trials (thousands of pairs each), with
      every traceback re-priced move by move. Island experiment:
      40-char planted island in 400-char flanks: local 70, global
      -285 (forced ends drown), floor ablated to 19 (the zero is the
      engine). Scale: 60-char island in 1,200x1,200: full SW finds it
      at BOTH offsets (124/120, 1.44M cells); banded k=50: 118,650
      cells (12x) finds near-diag (124) and MISSES shifted (21): the
      bet priced both ways. THE PHASE LESSON, learned by measurement:
      the draft's gentle 2/-1/-2 scoring measured a 172-point
      meander of pure noise over a 74-point island (Karlin-Altschul
      linear phase); fixed with BLASTN-strength 2/-3/-4 and the story
      kept in-code and on-page. Atlas: SW h authored per rule 2
      (Zero-floored local scores); summary h 2329 -> 2330. Cards:
      self, Needleman-Wunsch, Banded alignment (measured both ways),
      BLAST × seed-and-extend. neverUse: local alignment outside the
      log phase ("noise wearing a certificate"). Figure: the ridge in
      the sea, cite Smith-Waterman JMB 1981 DOI
      10.1016/0022-2836(81)90087-5. Viz: the 26x26 heatmap sea with
      the island ridge rising, peak flash, traceback walking down,
      recovered island printed beside the planted one, global corner
      shown negative. Bench reseeded: Edmonds-Karp × shortest
      augmenting paths (t1 verified; upgraded from a weaker F-F
      draft).

- [x] F51. Edmonds-Karp × shortest augmenting paths. Puzzle 57,
      graphs (problemSlug maximum-flow, shared with the live Dinic).
      Duality certified BOTH DIRECTIONS: on 200 small graphs the flow
      equals the min over ALL 2^(n-2) enumerated cuts, with the full
      certificate suite (capacity, conservation, cut==flow, crossing
      edges saturated) on every instance including scale. THE GADGET
      measured: pathological chooser 200,000 augmentations at
      C=100,000 (one barrel per hose trip) vs BFS's 2, hose never
      elected. Scale: n=500 m=3,000 caps to 1e6: 22 augmentations
      (bound 750,000: capacity-free). Application cashed: project
      selection by min-cut (net 11 = 35 - 24) matching brute force
      over all 16 portfolios. Build fix: a mangled main guard
      ('____main__' or True) caught and normalized. No atlas edits
      (pair existed t1 with h); summary stays 3257/2330. Cards: self,
      Dinic (live badge), Push-relabel × FIFO, Capacity-scaling.
      neverUse: unspecified-path FF on big capacities (invisible to
      correctness testing: the count is the disease). Figure: the
      gadget, cite Edmonds-Karp JACM 1972 DOI 10.1145/321694.321699.
      Viz: the gadget run twice with the spinning counter and the
      finale's red min-cut dash. Bench reseeded: Ternary search ×
      two-probe interval thirds (t2, h to author).

- [x] F52. Ternary search × two-probe interval thirds. Puzzle 58,
      data-structures (problemSlug unimodal-search; same category as
      the live binary search, its rival with a live badge). Referee:
      CONSTRUCTION: 300 continuous functions (parabolas, asymmetric
      powers, smooth bumps) with analytically known argmax, all to
      1e-7 by both ternary and golden, plus 300 unimodal integer
      arrays exact via ternary_int. Evaluation bills vs shrink-rate
      theory within 4: ternary 104 (2 probes/round, 2/3 shrink),
      golden-section 46 (phi spacing reuses one probe: 1 fresh
      eval/round), golden < 0.6x ternary asserted. Client: revenue
      p*1000*exp(-p/20) maximized at p = 20.000000 vs calculus 20.
      Plateau (trapezoid top) safe: returned point attains max. THE
      BETRAYAL measured: 2.0-tall spike at 0.06 vs 1.0 hill at 0.70:
      f(1/3) < f(2/3) discards the spike's third in ROUND ONE and the
      dance converges confidently to 0.700, asserted both ways (found
      the hill, missed the spike). Atlas: search-structures.json h
      authored "Two-probe interval thirds" (rule 2); summary
      heuristics 2330 -> 2331. Cards: self, Golden-section search,
      Binary search (live), Newton (live). neverUse: two probes on an
      unverified premise. Figure cites Kiefer 1953 DOI
      10.1090/S0002-9939-1953-0055639-3. Viz: two acts, unimodal
      ridge shrinking to green, then the bimodal betrayal with the
      red X on the summit it never saw. Bench reseeded: Boyer-Moore
      majority vote × pairwise cancellation (t1, h to author,
      probabilistic-streaming, d Majority element, grep-verified).

- [x] F53. Boyer-Moore majority vote × pairwise cancellation. Puzzle
      59, probabilistic (problemSlug frequency-estimation, shared with
      the live count-min). Referee: THE PAIRING THEORY ITSELF: the
      surplus bound count >= 2m-n asserted on 300 planted-majority
      streams under 4 adversarial layouts (front, back, alternating,
      shuffled), with EXACT equality on the alternating gadget
      (counter lands on 2m-n = 2, every pair destroys one majority
      copy). Dictionary-truth agreement on 500 mixed streams (316 held
      a majority). THE BETRAYAL: a,b,a,b,c crowns 'c', the RAREST
      element (asserted strict minority + verify pass catches it);
      across 1,000 no-majority streams the unverified candidate was
      not even the mode 68% of the time (assert > 0.25). Memory
      contest at n=1,000,000 (500,001 planted among 499,999 distinct):
      dict tally 500,000 keys (len asserted exactly), sort-and-middle
      full copy (middle seat == MAJ), Misra-Gries k=8 (instrumented
      high-water <= 8, majority present), BM 2 words + verify. Client:
      7-way modular redundancy, up to 3 COLLUDING faults, 200/200
      recoveries. Runtime 0.8s. Atlas: probabilistic-streaming.json h
      authored "Pairwise cancellation" (rule 2); summary heuristics
      2331 -> 2332. Cards: self, Misra-Gries, Count-min (live),
      Quickselect (live: median-is-majority). neverUse: the unverified
      single-pass vote. Figure cites Boyer-Moore MJRTY 1991 DOI
      10.1007/978-94-011-3488-0_5 (written 1980, Fortran mechanically
      proved, "efficient use of magnetic tape"). Viz: two acts, the
      brawl with red pair arcs and the verify sweep: act 2's 14/14/8
      gadget unmasked (a survivor, not a winner). Bench reseeded: LZW
      × growing phrase dictionary (t1, h to author,
      compression-coding, d Dictionary compression, grep-verified).

- [x] F54. LZW × growing phrase dictionary. Puzzle 60,
      compression-coding (problemSlug dictionary-compression, shared
      with the live LZ77). Referee: THE ROUND TRIP:
      decode(encode(x)) == x byte-exact on 300 mixed trials (full
      random, tiny alphabets, run-heavy) plus empty/single-byte
      edges, and on every contest corpus: with zlib -9 (stdlib
      DEFLATE) racing as the shipped rival. The KwKwK corner FORCED
      on the run gadget (3 hits, asserted >= 1) and counted in the
      wild: 3,898 reconstructions across the trials. Growth invariant
      EXACT: table == 256 + codes - 1. Contest (12-bit fixed codes):
      english-ish text 46,624 B at 4.36x, server log 49,781 B at
      4.65x, random bytes 20,480 B at 0.70x (a 1.42x EXPANSION,
      asserted < 0.75), zlib winning every corpus (5.57x / 5.30x /
      1.00x, asserted). Freeze-on-drift asserted BOTH directions:
      text+DNA joint 172% MORE bits than fresh dictionaries per half
      (the capped table frozen full of yesterday's phrases), same-kind
      halves 4% cheaper shared (reuse is real). Runtime 0.2s. One
      build fix: a reused stats dict shadowed the KwKwK counter in the
      print (KeyError post-assert): renamed kw_run/growth. Atlas per
      rule 2: compression-coding.json LZW h authored "Growing phrase
      dictionary"; summary heuristics 2332 -> 2333. Cards: self, LZ77
      (live), Huffman coding (live), DEFLATE. neverUse: LZW on
      incompressible bytes (the 1.42x expansion; DEFLATE stores raw
      blocks instead). Figure: encoder/decoder tables one step apart,
      cite Welch 1984 DOI 10.1109/MC.1984.1659158; origins carries
      the Unisys patent story (PNG exists because of it). Viz: two
      acts on one machine: amber phrase cursor, minted chips, blue
      code cells, bits bars: prose compresses, noise's out-bar
      overtakes raw in red. Bench reseeded: Rendezvous hashing ×
      highest-random-weight (t2, h EXISTS, distributed-concurrent,
      d Distributed key placement, grep-verified).

- [x] F55. Rendezvous hashing × highest-random-weight. Puzzle 61,
      distributed-systems (problemSlug distributed-key-placement,
      shared with the live consistent hashing). Referee: EXHAUSTIVE
      SET ARITHMETIC on 100,000 keys x 10 nodes (blake2b 8-byte
      scores). Balance: every load within 5 sigma of 10,000; HRW
      spread 1.03. THE REMOVAL THEOREM asserted key-by-key with ZERO
      exceptions: dropping node3 moved exactly its 10,077 keys and
      not one other. Addition: newcomer stole 9.1% ~ 1/11 (within
      1%), never a move between old nodes. The ring re-raced: bare
      1-vnode spread 51.16 (!), 100-vnode 1.22, both beaten by HRW's
      1.03 with no knob. The modulo disaster measured: resize 10->11
      moved 90.7% (assert > 0.85). Client framing: 95%-hit cache tier
      resize = re-earn 9.1% vs 90.7% (blip vs outage). Runtime 1.5s,
      first-run pass. No atlas h edit needed (pair existed t2 with h);
      summary stays 3257/2333. Cards: self, Consistent hashing
      (live), Jump consistent hash (end-only growth), Maglev (O(1)
      table). neverUse: modulo sharding on a live cluster. Figure:
      the one-key scoreboard with runner-up promotion, cite
      Thaler-Ravishankar ToN 1998 DOI 10.1109/90.663936 (Michigan TR
      1996: predates the ring by a year; PIM-SM standardized it).
      Viz: one continuous scene: 26 keys placed by rising score bars,
      buckets level out, the heaviest node dies red, its orphans
      promote one-by-one while every other bucket sits still. Bench
      reseeded: Mo's algorithm × sqrt block query ordering (t2, h
      EXISTS, search-structures, d Offline range queries,
      grep-verified).

- [x] F56. Mo's algorithm × sqrt block query ordering. Puzzle 62,
      data-structures (problemSlug array-range-queries, shared with
      the live segment tree and Fenwick). Referee: BRUTE-FORCE
      RECOUNT of all 900 distinct-count queries on n=6,000, with all
      SIX orderings asserted to produce identical answers through the
      SAME window machinery; meter counts every add/remove exactly.
      Measured: random order 3,060,650 moves; sorted-by-l 927,263;
      Mo sqrt blocks (b=77) 411,033 (inside the 2(n^2/b + qb + n)
      theory bound, < half of both baselines); snake 241,825; snake +
      tuned block 228,894; HILBERT 154,452 (best, 19.8x vs random).
      THE DIAL HONESTY FINDING: folklore b=sqrt(n) is calibrated for
      q~n; with q=900 << n the true balance point b=n/sqrt(q)=200 cut
      moves 44% (U-shape measured: 880K at b=10, 519K at b=2000,
      assert dial[b_true] < dial[b_folk]). Runtime 0.5s. One fix: a
      middle-dot glyph mojibake'd on cp1252 (ASCII'd). One narration
      fix: a stray non-English word caught and replaced. Origins
      honestly folklore: no paper exists (named for Mo Tao, c. 2010,
      cp-algorithms cite); the measurements are the citation. No
      atlas edit (pair existed t2 with h); summary stays 3257/2333.
      Cards: self, Segment tree (live), Sqrt decomposition,
      Persistent segment tree. neverUse: Mo's on a decomposable query
      (the tree answers online in log n with updates). Figure: the
      (l,r)-plane path comparison, chaotic vs boustrophedon. Viz: two
      acts over the same 16 query points with a live move meter and
      the actual window strip sliding below. Bench reseeded: Gibbs
      sampling × coordinate-wise conditional draws (t1, h to author,
      machine-learning, d Posterior sampling, grep-verified).

- [x] F57. Gibbs sampling × coordinate-wise conditional draws.
      Puzzle 63, ml-ai (problemSlug posterior-sampling, shared with
      the live Metropolis-Hastings). Referees: ANALYTIC + EXHAUSTIVE.
      Gaussian rho=0.6: moments within 0.02/0.03, corr err 0.0017.
      THE MIXING LAW MATCHED: the x-subchain is AR(1) with coef
      rho^2, so lag-1 autocorr and tau=(1+rho^2)/(1-rho^2) are
      predictions: measured 0.3605 vs 0.36 and 0.9900 vs 0.9900
      (fourth decimal!), tau 2.1 vs 2.1 and 199 vs 200. THE CRAWL:
      rho=0.995 accepts every draw and mixes 94x slower (assert >50).
      The race at equal budgets: Gibbs 0.0017 / MH sigma=1.2 (acc
      0.420) 0.0059 / MH sigma=12 (acc 0.010) 0.0171. ISING 4x4:
      exact enumeration of ALL 65,536 states at beta=0.4: |M|/16
      exact 0.4779 vs Gibbs 0.4803, energy -11.31 vs -11.33 (the
      Geman brothers' habitat in miniature). Runtime 0.9s, first-run
      pass. Atlas per rule 2: machine-learning.json Gibbs h authored
      "Coordinate-wise conditional draws"; summary heuristics 2333 ->
      2334. Cards: self, Metropolis-Hastings (live), Hamiltonian
      Monte Carlo, Slice sampling. neverUse: reading acceptance as
      health (acceptance is the proposal; mixing is the geometry).
      Figure: staircase vs knife ridge with both taus, cite Geman &
      Geman TPAMI 1984 DOI 10.1109/TPAMI.1984.4767596 (named for the
      physicist, 81 years dead; BUGS origin note). Viz: two acts, the
      axis-aligned staircase filling the rho=0.6 ellipse then
      shuffling along the 0.995 ridge, acceptance meter pinned at
      1.000 in both. Bench reseeded: Cuckoo filter × fingerprint
      eviction (t2, h EXISTS, probabilistic-streaming, d Deletable
      set membership, grep-verified).

- [x] F58. Cuckoo filter × fingerprint eviction. Puzzle 64,
      probabilistic (problemSlug frequency-estimation, shared with
      count-min and majority vote). Referee: ZERO FALSE NEGATIVES
      asserted on every member after every operation. 50,000 items at
      load 0.76: FPR measured 0.1535% vs the 2b*load/2^f law's
      0.1490%. Load frontier: b=4 filled 97.1% of 4,096 slots
      (longest kick chain 500) vs b=1 collapsing at 52.1%. Deletion:
      25,000 leavers out with ZERO collateral on 25,000 survivors,
      ghost rate 0.09%. Bloom naive-delete corruption measured: 96%
      of survivors false-negatived (matches the analytic ~95.5%).
      BUILD BUG CAUGHT: first Bloom drew 128 hash bits for indices
      needing ~174: later indices collapsed toward 0, faking 100%
      corruption and inflating FPR: fixed to a 32-byte digest, the
      honest 96% kept and the lesson recorded on-page. HONEST SPACE
      FINDING: at 76% fill cuckoo pays 15.7 bits/item vs Bloom 13.0:
      the space win (12.4) exists only run hot: kept in table+prose.
      Churn client: 30 rounds of 400-out/400-in at 83% load, exact
      every round. Runtime 0.9s. No atlas edit (pair existed t2 with
      h); summary stays 3257/2334. Cards: self, Bloom (live),
      Counting Bloom (the 4x tax), XOR filter (static). neverUse:
      deleting from a plain Bloom. Figure: the partial-key XOR
      involution diagram, cite Fan-Andersen-Kaminsky-Mitzenmacher
      CoNEXT 2014 DOI 10.1145/2674005.2674994. Viz: 16x4 table, kick
      chains red-flashing hop by hop, load meter past 90%, then churn
      with one-slot deletes and the zero-collateral banner. Bench
      reseeded: Toom-Cook multiplication × five-point interpolation
      (t2, h to author, numerical, d Big-integer multiplication,
      grep-verified; Karatsuba's live sibling).

- [x] F59. Toom-Cook multiplication × five-point interpolation.
      Puzzle 65, numerical (problemSlug integer-multiplication,
      shared with the live Karatsuba). Referees: the five-point
      identity on 500 random scalar quartics (coefficient-exact
      recovery, every division checked); Python's own product on 300
      mixed pairs (asymmetric, zeros, single digits); COUNTS EXACT:
      5^k asserted for k=3..6 at n=3^k (raw-coefficient-list
      recursion mirroring the live Karatsuba unit's counting
      conventions, mults counted only at 1-length base cases). The
      729-digit three-way race: grid 531,441 (= 729^2) / Karatsuba
      59,049 (= 3^10, padded to 1024) / Toom-3 15,625 (= 5^6), all
      asserted to the integer: 34x and 3.78x. Every interpolation
      division by 2 and 3 asserted remainder-zero (the classic
      correctness pitfall made a referee). Add-inclusive honesty:
      Toom 239,065 total coeff ops vs Karatsuba 407,199 at 729;
      crossover in OUR op meter at n=9, with the GMP ~100-word
      real threshold stated as the model-vs-hardware gap (same
      lesson as Karatsuba's 128-vs-70). Runtime 5.8s (schoolbook run
      dominates). Atlas per rule 2: numerical.json Toom-Cook h
      authored "Five-point interpolation"; summary heuristics 2334
      -> 2335. Cards: self, Karatsuba (live), FFT (live), Schönhage-
      Strassen. neverUse: nine limb products out of pride (9-way
      recursion = n^2 in a costume). Figure: two curves, five posts,
      the threaded product quartic; cite Bodrato WAIFI 2007 DOI
      10.1007/978-3-540-73074-3_10 with Toom 1963 / Cook 1966 in
      prose. Viz: act 1 the post-by-post machine with the quartic
      threading; act 2 the log-scale ladder bars falling 531,441 ->
      59,049 -> 15,625. Bench reseeded: Bitap × bitmask fuzzy states
      (t2, h EXISTS, strings, d Approximate string matching,
      grep-verified).

- [x] F60. Bitap × bitmask fuzzy states. Puzzle 66, strings
      (problemSlug approximate-string-matching: the atlas d's own
      problem page, NOT edit-distance: checked against
      dist/algo/bitap-algorithm's link). Referee: THE SELLERS DP
      (Wagner-Fischer's approximate form), agreeing on EVERY end
      position: 400 exhaustive small cases (alphabets 2 and 4,
      m 2..9, k=0..2) + the full client + a 96-char pattern past C's
      64-bit word cliff (a cost cliff, not a correctness cliff:
      stated). Exact mode == naive scan on 50 texts. Client: 24-base
      probe planted in 120,000 bases with ONE substitution at
      71,003: find() returns -1, k=0 agrees, k=1 pins end 71,027,
      referee concurs. THE METER: n*m = 2,880,000 DP cells vs
      n*(k+1) = 240,000 word-ops asserted exactly: 12x fewer ops,
      each 24 lanes wide. One pre-run fix: a dead conditional
      artifact in the accept test simplified to R[k]. Runtime 0.5s,
      referee agreement first try. No atlas edit (pair existed t2
      with h); summary stays 3257/2335. Cards: self, Wagner-Fischer
      (live: the referee, keeps the traceback), Smith-Waterman
      (live: weighted scoring), Boyer-Moore (live: exact, measured
      blind here): THREE live badges. neverUse: exact search on text
      that lies (clean, confident, empty: the most dangerous wrong).
      Figure: the two lamp rows with the substitution splice, cite
      Wu-Manber CACM 35(10) 1992 DOI 10.1145/135239.135244
      (back-to-back with Baeza-Yates-Gonnet shift-or in the same
      issue; Domolki 1964 in prose). Viz: one continuous scene, two
      plants (clean + one lie): R0 lamps die at the mutated base
      while R1 inherits through the splice and hits accept: blue vs
      amber markers under the strip. Bench reseeded: Rate-monotonic
      scheduling × shorter period wins (t2, h to author,
      scheduling-operations, d Real-time task scheduling,
      grep-verified: the live EDF unit's natural rival).

- [x] F61. Rate-monotonic scheduling × shorter period wins. Puzzle
      67, optimization-or (problemSlug realtime-scheduling, shared
      with the live EDF: the two pages now argue both sides of the
      same experiment). Referee: RTA vs CYCLE-ACCURATE SIMULATOR,
      BOTH DIRECTIONS: on 200 random sets, 185 schedulable with
      worst responses equal task-by-task, 15 RTA-rejected all
      confirmed missing. Liu-Layland bound: 300 sets under
      n(2^1/n-1), zero misses. THE GAP measured: 300 sets between
      the bound and U=0.95: RM missed 10%, EDF (re-simulated) missed
      ZERO (its U<=1 theorem, asserted). Harmonic (10,20,40 dividing)
      clean AT U=1.0 exactly (sufficient-not-necessary made vivid).
      The embedded classic: importance-ordered priorities (telemetry
      crowned) starve the 5ms sensor at U=0.75 while rate order runs
      clean at responses [1,8,54] (RTA == sim asserted). One
      build-time correction: hand-predicted fixpoint 50 for
      telemetry was wrong: the growing window admits more
      preemptions: measured 54, assert fixed, lesson kept in-code.
      Runtime 0.09s. Atlas per rule 2: scheduling-operations.json RM
      h authored "Shorter period wins"; summary heuristics 2335 ->
      2336. Cards: self, EDF (live), Least laxity first (tie
      thrash), Round-robin (fairness is the wrong currency).
      neverUse: priorities by importance (urgency lives in the
      period; encode importance in deadlines, never priority order).
      Figure: the two timelines at U=0.75, cite Liu-Layland JACM
      20(1) 1973 DOI 10.1145/321738.321743. Viz: two acts, one
      hyperperiod Gantt: act 1 the crowned telemetry walls off the
      CPU (red X's stack on the sensor lane); act 2 rate order:
      amber slices, blue weave, slate gaps, zero misses. Bench
      reseeded: Suffix tree × Ukkonen online construction (t1, h
      EXISTS, strings, d Full-text indexing, grep-verified).

- [x] F62. Suffix tree × Ukkonen online construction. Puzzle 68,
      strings (problemSlug text-indexing, shared with the live
      suffix array). THE HEAVYWEIGHT: full Ukkonen (active point,
      open leaves with global end, rule 3, suffix links) implemented
      and refereed. Oracles: leaf path-labels == the true suffix set
      on 200 random strings (the decisive referee: passed FIRST RUN);
      size theorem <= 2(n+1) nodes with exactly n+1 leaves on every
      build; amortized linearity at scale: 199,589 chars in 464,432
      extension steps = 2.33/char (assert < 6); membership == Python
      `in` on 500 queries with a 20-char query walking EXACTLY 20
      comparisons; longest repeated substring (deepest internal) ==
      brute force on 100 strings (client text: 47 chars); LCS via
      generalized tree == DP on 100 pairs. TWO honest findings: (1)
      the naive-build race depends on repetitiveness: english-ish
      only 3.7x worse (suffixes diverge fast) vs 358x on 17-periodic
      text (repetition is the quadratic adversary: genomes, logs):
      both corpora measured and kept; (2) the naive splitter walked
      off the string when a terminator was omitted (found the hard
      way, fixed, lesson in-code). Runtime 0.6s. The viz PORTS the
      same builder to JS and was verified in node: exact suffix sets
      on all 8 cycle seeds before shipping (tree grows char by char,
      open leaves green with ->E, splits flash amber, size theorem
      in the hold). No atlas edit (pair existed t1 with h); summary
      stays 3257/2336. Cards: self, Suffix array construction
      (live), Aho-Corasick (live: the dual), Trie (live: the
      uncompressed ancestor): three live badges. neverUse:
      rebuilding the index per query (indexes are capital; the build
      is worth ~23,000 queries). Figure: the machinery diagram with
      open leaves and a suffix link, cite Ukkonen Algorithmica 14
      1995 DOI 10.1007/BF01206331 (Weiner 1973, McCreight 1976 in
      prose). Bench reseeded: Push-relabel × FIFO vertex selection
      (t2, h EXISTS, graphs-structure, d Maximum flow,
      grep-verified: the live Edmonds-Karp's rival card come alive).

- [x] F63. Push-relabel × FIFO vertex selection. Puzzle 69, graphs
      (problemSlug maximum-flow, third resident after EK and Dinic).
      Referee: VALUE EQUALITY with a compact Edmonds-Karp on 200
      random graphs, plus the duality certificate on EVERY instance
      (residual cut == flow, t unreachable) plus a discipline
      assert: internal excess exactly ZERO at termination (a preflow
      is not a flow until then). The EK page's zigzag gadget
      (C=100,000) re-raced three ways: pathological FF 200,000
      augmentations / EK 2 / push-relabel 4 LOCAL OPS: the trap
      needs a path chooser to catch and there is none. The selection
      dial on 30 layered graphs, same answers everywhere: FIFO
      14,023 / bare highest-label 14,829 / random 14,882: TWO honest
      findings kept: the margins are small (the queue is a tune-up
      on friendly graphs: FIFO's real earnings are the O(V^3)
      bound), and the folklore champion highest-label, run BARE,
      landed mid-pack: its reputation was earned alongside the gap
      heuristic entourage. Client: 8x8 graph-cut segmentation
      (terminal affinities + smoothness edges): recovered the
      planted 4x4 blob EXACTLY, cut == flow == 96 certified. Runtime
      0.1s. Fixes during build: a mangled f-string in the table
      print rewritten; a muddled per-edge capacity check replaced by
      the stronger internal-excess-zero assert. No atlas edit (pair
      existed t2 with h); summary stays 3257/2336. Cards: self,
      Edmonds-Karp (live), Dinic's algorithm (live), Push-relabel ×
      highest label (the sibling with the entourage). neverUse:
      reading the preflow mid-run (shipping scaffolding as a
      bridge). Figure: water on terraces, cite Goldberg-Tarjan JACM
      35(4) 1988 DOI 10.1145/48014.61051 (Karzanov 1974 preflow in
      prose). Viz: the terrace machine run for real (JS port of the
      same logic): columns rise on relabel, amber excess pours
      downhill per op, the dashed min cut appears at the end. Bench
      reseeded: Space-Saving × min-counter replacement (t2, h
      EXISTS, probabilistic-streaming, d Top-k heavy hitters,
      grep-verified: completes the streaming trilogy with count-min
      and majority vote).

- [x] F64. Space-Saving × min-counter replacement. Puzzle 70,
      probabilistic (problemSlug frequency-estimation: the streaming
      shelf now complete: majority vote / Misra-Gries card /
      count-min / cuckoo / Space-Saving). Referee: EXACT Counter
      with per-item brackets at ZERO tolerance on 60 random Zipf
      streams: count - err <= true <= count both directions, every
      monitored item. The guarantee: min counter <= n/m asserted +
      every item above n/m present, every trial. The equal-budget
      race (200k-item Zipf alpha 1.2, 5,000 distinct, m=50): both
      10/10 top-10 recall, worst |est-true| = 1 for Space-Saving vs
      2,303 for Misra-Gries (tight overestimates vs decrement-
      decayed underestimates). THE NO-SKEW CONFESSION, recalibrated
      after a probe: the first assert guessed the zipf summary's
      tail wrong (39/50 slots ARE placeholders): the honest contrast
      lives at the head: Zipf top-10 worst error fraction 0.1% vs
      uniform top-10 BEST 100% (assert <0.05 vs >0.5): rank by
      count, trust by the gap. Budget dial: recall 3/6/10/10 at
      m=10/20/50/200. Runtime 0.7s. Atlas: no h edit (pair existed
      t2); summary stays 3257/2336. Cards: self, Misra-Gries,
      Count-min (live), Majority vote (live). neverUse: reading
      placeholder counters as measurements (a dashboard that drops
      the error column trends fifty strangers with conviction).
      Figure: the chart-show seats with wristbands, cite Metwally-
      Agrawal-El Abbadi ICDT 2005 DOI 10.1007/978-3-540-30570-5_27
      (ad-fraud origins). Viz: two acts on 12 live-sorted seats:
      solid witnessed span vs pale inherited wristband: Zipf's head
      goes solid while the tail churns red; uniform comes out all
      wristband, confessing. Bench reseeded: B+ tree × linked-leaf
      range scans (t1, h to author, search-structures, d Database
      range index, grep-verified: the live B-tree's sibling).

- [x] F65. B+ tree × linked-leaf range scans. Puzzle 71,
      data-structures (problemSlug disk-ordered-index, shared with
      the live B-tree). Referee: 300 range queries == sorted-list
      slices EXACTLY on both trees + 2,000 memberships; full
      invariant checker after 100,000 inserts (sorted nodes, uniform
      leaf depth, occupancy floors, strictly-ordered chain).
      UNIFORM DEPTH: 1,000 B+ lookups each touched exactly height 3
      (zero variance, assert set == {height}) vs the B-tree's 1..3
      wander. THE TWO-METER FINDING (the unit's core honesty): at
      equal node widths the touch counts nearly TIE (1,553 vs 1,507:
      1.03x: in RAM the in-order walk is fine): the chain's real
      earnings are SEQUENTIAL I/O: under natural page layouts (B+
      leaves in chain order, B-tree pages in creation order) the
      seek meter reads 180 vs 1,553 (9x, assert 4x), with 1,327
      transitions turned sequential. First meter draft showed only
      the wash: the seek meter was added to carry the true story:
      the win was never fewer touches, it is touches in a straight
      line. Copy-up vs move-up split asymmetry implemented and
      narrated. Fanout arithmetic in prose (4KB pages: ~256
      separators vs ~60 inline rows: height 4 vs 5 at 10^8). Runtime
      0.2s. Atlas per rule 2: search-structures.json B+ tree h
      authored "Linked-leaf range scans"; summary heuristics 2336 ->
      2337. Cards: self, B-tree (live), Log-structured merge tree
      (the write-side answer), Skip list (live: the in-memory cousin
      of the chain). neverUse: scattering the leaves (every
      correctness test passes while the seeks climb back: the data
      structure is the layout). Figure: separators route / leaves
      answer / chain streams, cite Comer CSUR 11(2) 1979 DOI
      10.1145/356770.356776 (Bayer-McCreight on the B-tree page).
      Viz: act 1 grows a REAL order-4 B+ tree (JS builder verified
      in node on every growth prefix: sorted leaf order exact on all
      5 cycle seeds) with the amber chain; act 2 races the seek
      strips: green sequential run vs red scatter arcs with live
      counters. Bench reseeded: Reservoir sampling × Algorithm R
      (t1, h EXISTS, probabilistic-streaming, d Uniform stream
      sampling, grep-verified).

- [!] F66 NEAR-MISS, REVERTED, LESSON INSTALLED. Reservoir sampling
      × Algorithm R was benched and fully built (solution with a
      Fraction-exact subset-distribution referee, content,
      narration, viz, entries): and the pair was ALREADY LIVE as
      puzzle 24 (reservoir-algorithm-r, one of the original eight
      units). The bench grep verified the ATLAS pair but never
      checked the REGISTRY: the atlas h existed precisely BECAUSE
      the unit was live. npm run check caught it (lesson-funnel FAIL
      on the old unit's /algo/ page) before any commit or deploy.
      Worse: the duplicate's viz reused the filename
      src/viz/ReservoirViz.jsx, OVERWRITING the live puzzle-24 viz
      in the working tree; the revert's rm then deleted it; restored
      intact from HEAD (git checkout, commit 9a4f063's version;
      production never touched: last deploy predated the overwrite).
      All duplicate files deleted; registry entry removed; check ALL
      GREEN again. THE RULE, amended: before benching a pair, grep
      BOTH the atlas AND src/data/puzzles.js for the algorithm name;
      an existing h in the atlas is a WARNING SIGN of liveness, not
      an invitation. Bench reseeded: Hungarian algorithm ×
      tight-edge alternating paths (t1, h null in atlas AND absent
      from puzzles.js: both greps clean).

- [x] F66. Hungarian algorithm × tight-edge alternating paths.
      Puzzle 72, graphs (problemSlug assignment-problem: checked
      against dist/algo/hungarian-algorithm's link). Referees:
      EXHAUSTIVE PERMUTATION SEARCH on 150 instances (n=2..7),
      equal every time: plus THE LP DUALITY CERTIFICATE at every
      size: u[i]+v[j] <= c on all 22,500 pairs at n=150, matched
      edges tight, dual total == primal cost (1,747 == 1,747), the
      match a true permutation. The greedy trap EXACT: four
      [[1,2],[1,1000]] blocks: greedy 4,004 vs optimal 12 (334x,
      the shared cheap column steals the neighbor's only exit).
      Random-cost greedy gap measured: 160% over optimal at n=150
      (assert > 5%). The machinery counted: 886 dual updates inside
      the n^2=22,500 bound. Runtime 0.1s, first-run pass. Origins
      gold: named for Konig+Egervary; Munkres 1957; Jacobi had it a
      century early (2006 rediscovery). Atlas per rule 2:
      graphs-structure.json Hungarian h authored "Tight-edge
      alternating paths"; summary heuristics 2337 -> 2338. Cards:
      self, Hopcroft-Karp (live: the unweighted specialist),
      Successive shortest paths (assignment as min-cost flow),
      Auction algorithm (decentralized bidding). neverUse: greedy
      assignment on shared scarcity (greedy prices what a column is
      worth to ME, never what taking it costs everyone else).
      Figure: the subsidy ledger with a 3x3 example, cite Kuhn NRLQ
      2 1955 DOI 10.1002/nav.3800020109. Viz: act 1 the trap's
      greedy cascade bleeding to 4,004 then the green optimal 12;
      act 2 the REAL machine on a 6x6 (JS port verified in node vs
      brute force on 8 seeds, duals feasible): tight cells green,
      matches blue, u/v bars updating, the books balancing in the
      banner. Bench reseeded DOUBLE-grep-verified (atlas + registry
      per the F66 near-miss rule): Gale-Shapley × deferred
      acceptance (t1, h exists in atlas, absent from puzzles.js).

**Next action: F67 Gale-Shapley × deferred acceptance; sequentially
until morning.** Owner's overnight directive
(2026-08-26 late evening): populate as many unit pages as possible to
the current standard; G7 (homepage organization) becomes due when the
live count passes about twelve. The prior pointer (E1-E3 + F2) is
complete and superseded.

Landed so far: Phases A, B, C complete; D1-D3 built and unpaid; F1 landed
as puzzle 07, the first unit built to the comparative standard from
scratch. `npm run build` prerenders 4,600 static data pages and a sitemap
of 3,587 indexable URLs. a01ae18 fixed the baseline test failure the last
crash left behind (an entry listed as its own rival) and retired the bare
Dijkstra entry per ATLAS.md rule 2. What remains in C-land is D4, wiring
the atlas search box to /api/search as a natural-language fallback.

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
6. Pushes do not deploy. The Netlify site has no repo linkage; a session
   that lands units ends with `netlify deploy --prod` (a free CLI upload
   of the verified local dist) and a curl against the live site proving
   the deploy took. Discovered 2026-08-26 with production ten commits
   stale; see the Deploy section of CLAUDE.md.
