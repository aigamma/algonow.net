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
- [ ] F34. Consistent hashing × virtual nodes (distributed-concurrent
      t1, NEW site category). Oracle: exact key-movement fractions on
      node join/leave vs mod-N rehash; vnode variance smoothing
      measured; cards Rendezvous hashing (check atlas), mod-N.
- [ ] F35. Closest pair divide and conquer × midline strip merge
      (computational-geometry t2). Oracle: brute force O(n^2) on many
      trials; strip 7-point bound counted; cards: closest pair sweep
      (t1), brute force, KD-tree (check atlas).
- [ ] F36. MinHash × bottom-k signatures (probabilistic-streaming t1).
      Oracle: exact Jaccard vs estimate, error ~1/sqrt(k) measured;
      cards Shingling×MinHash-LSH (t2), SimHash (check), exact sets.
- [ ] F37. Hopcroft-Karp × layered augmenting phases (graphs-structure
      t1, h null: author per rule 2 as 'Layered augmenting phases').
      Oracle: matching size == max-flow referee (Dinic on unit graph)
      or Konig/vertex-cover certificate; phases <= 2*sqrt(V) asserted;
      cards Kuhn's DFS augmenting (check atlas), Dinic (live badge).

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

**Next action: F34 Consistent hashing × virtual nodes, then F35-F37
(fifth extension, listed above), sequentially until morning.** Owner's overnight directive
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
