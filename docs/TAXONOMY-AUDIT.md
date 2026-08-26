# The problem-taxonomy consolidation (2026-08-26)

One-line summary: the rivals registry went from 661 problem labels to **648
rigorously distinct computational contracts** by retiring 30 labels that were
aliases, surface duplicates, method families standing as problems, or
domain restatements of one contract, while registering 17 genuinely distinct
problems the old queue floor had hidden. Every retired slug redirects; no
phrase, method, or page was lost. The machine-readable manifest with
per-merge rationale and method-overlap evidence is
`src/data/atlas/merges.json`; this file is the human-readable audit.

Governing standard, stated before the work began: defensibility. Not the
largest problem count, and not the largest reduction either; the smallest
taxonomy that preserves every materially distinct computational contract. A
merge required that a technically precise evaluator would regard the two
labels as alternative names or alternative solution families for
substantially the same problem definition (inputs, outputs, objective,
constraints, oracle access), never mere adjacency, reducibility, or shared
technique.

## Verified statistics, before and after

Every number below was computed from the source data (topic files,
problems.json, aliases.json), never transcribed from prior claims. The
"before" column was computed at 7095533, the tree this work started from,
and matched the previously advertised figures exactly (the five commits
between f7c6122 and 7095533 changed tooling and page code, never the
registry or the entries).

| Statistic | Before | After |
| --- | --- | --- |
| Solution entries | 3,253 | 3,249 (4 true duplicates removed, documented) |
| Distinct algorithm names | 3,022 | 3,020 |
| Distinct heuristic names | 2,309 | 2,305 |
| Names on both lists (do not add the two columns) | 28 | 28 |
| Distinct problem phrasings | 2,174 | 2,171 |
| Canonical problems | 661 | 648 |
| Phrasings registered to a problem | 2,122 | 2,155 |
| Entries resolving to a registered problem | 3,163 | 3,231 (99.4%) |
| Rival methods per problem, mean | 4.79 | 4.99 |
| Rival methods per problem, median | 3 | 4 |
| Rival methods per problem, min / max | 1 / 41 | 1 / 55 |
| Topics | 69 | 69 |
| Categories | 20 | 20 |
| Alias registry | 885 canonical / 1,126 synonyms | 887 / 1,128 |
| Problem redirects | 0 | 30 |

The multiplication sign in "algorithm x heuristic" is pairing notation, not
arithmetic: 3,020 algorithm names and 2,305 heuristic names overlap in 28
names and describe 3,249 entries, not a product.

## What was executed

All rationale lives per-row in `merges.json`; headline structure:

- **30 problems retired into survivors.** By class: 1 exact alias (random
  graph models into random graph generation), 12 surface duplicates (SAT
  solving + Boolean satisfiability; waiting-time analysis + queueing;
  node embeddings + graph representation learning; distributed locking +
  distributed mutual exclusion; semantic retrieval + document ranking;
  cross-validation and comparison criteria + generalization estimation;
  replica repair + replication; fuzzing + test generation; derivative-free +
  continuous optimization; pairwise alignment + edit distance), 9
  parent-child inflations (constraint propagation; gradient-based
  optimization; k-center/k-median clustering guarantees; transient and
  structured Markov analysis; quantization into model compression; spelling
  into text correction; constrained generation into decoding; parser
  construction into context-free parsing; atomic commitment into
  distributed transactions; ruin-and-recreate into local search), 5
  method-as-problem dissolutions (tour improvement into traveling salesman;
  Monte Carlo tree search into game-tree search with its single-player
  members rehomed to puzzle-state search; learning dynamics for equilibria
  split by game class into extensive-form solving and normal-form
  equilibrium computation; CRDTs into replication; resampling inference
  split into hypothesis testing and interval estimation), and 2 domain
  restatements of one contract (free energy estimation + normalizing
  constants, where the phrase collision across the two problems proved the
  contract identical; raster primitive drawing + rasterization, following
  the in-repo precedent of Clipping).
- **3 phrase moves between survivors**: branch and price joined integer
  programming beside branch and cut; ACS tour construction and GA tour
  evolution joined traveling salesman, which already owned TSP construction.
- **18 attachments** of formerly unregistered phrases to existing problems
  (Order statistics to Selection, Few-shot learning to its own problem,
  Neural and Probabilistic retrieval to document ranking, and so on).
- **17 new problems** where the queue held genuinely distinct contracts
  with two or more real methods: facility location (split out of the
  clustering merge), closest pair of points, polyline simplification,
  polynomial GCD, real root isolation, variant detection, persistence
  comparison and vectorization, edge bundling, many-light rendering,
  all-pairs minimum cuts, transitive closure and reduction, graph
  comparison, influence maximization, contagion modeling, coverage path
  planning, shape analysis.
- **18 relabels**, mostly merge-driven; the standalone ones take the method
  name out of the problem label (Branch and bound is now Combinatorial
  optimization; Interior-point is now Conic and semidefinite optimization;
  Least squares is now Linear least squares; regex is spelled out).
- **4 true-duplicate entries removed** with full provenance in
  `merges.json` entryRemovals (Fictitious play twice, quorum intersection
  twice, Merkle anti-entropy three ways collapsing to one), and one
  heuristic display normalization (Straight-line distance is now Euclidean
  distance, matching the A* entry; the roadmap pair followed).

Redirects: every retired slug keeps its URL as a static redirect page
(meta refresh, canonical on the survivor, noindex), emitted by the
prerender from the manifest and enforced by the check. Retired display
names from entry dedup live on as aliases, so search keeps resolving them.

## Reviewed and deliberately kept separate

Each of these was a named consolidation hypothesis or an obvious adjacency;
inspection of the actual members said no.

- **Sensitivity computation (Greeks) vs automatic differentiation.** The
  members are pathwise and likelihood-ratio estimators: they estimate
  derivatives of expectations under a simulation measure. AD computes exact
  derivatives of programs. The output contracts differ (stochastic
  estimator vs exact derivative); AD is a tool inside pathwise Greeks, not
  the same problem.
- **Text diffing vs edit distance.** Myers is an edit-distance algorithm,
  but the diffing contract deliverable is a readable line-level patch, and
  patience/histogram diff exist only for that objective.
- **Approximate string matching vs edit distance / spelling.** Search for
  matches within a threshold, not comparison of a given pair.
- **The sorting family** (comparison, integer/distribution, external,
  parallel, string, networks): distinct machine models and key contracts,
  per the standing non-merge doctrine.
- **Priority queues vs integer/monotone vs double-ended**: the ADT
  operation sets and key models differ.
- **Maze solving vs grid pathfinding**: online agent-embedded navigation
  (wall follower, Tremaux) vs offline shortest paths on a known map;
  different information structures. Maze generation is output-side and
  separate again.
- **Search with chance nodes, multiplayer search, imperfect-information
  search vs game-tree search**: stochastic transitions, n>2 solution
  concepts, and hidden information each change the contract; only the
  perfect-information MCTS variants merged.
- **Extensive-form vs normal-form equilibrium computation**: kept as two
  problems (the game formalism is the input contract); the dissolved
  learning-dynamics label was split between them.
- **Nearest neighbor search vs MIPS vs filtered search vs index
  maintenance**: non-metric objective, added predicates, and update
  operations are three materially different contracts around one index
  family.
- **Regression vs linear least squares vs nonlinear least squares**:
  statistical prediction, a numerical solve, and a structured nonconvex
  optimization; three contracts, now labeled precisely.
- **Hardware test generation and distributed-system testing vs software
  test generation**: circuit fault models and linearizability oracles are
  different execution environments and success criteria; only fuzzing
  merged (same programs, same bugs, benchmarked against concolic).
- **Tree drawing vs hierarchy visualization (treemaps)**: node-link versus
  space-filling output spaces; layered layout keeps its DAG input class;
  general graph layout keeps force-directed generality; edge bundling is
  post-layout and became its own problem.
- **Unification vs type inference**: unification is a general symbolic
  problem here (syntactic, equational, higher-order members), not merely
  Hindley-Milner's subroutine.
- **The theorem-proving fragment family** (model checking, program proof,
  first-order, equational, inductive, finite model finding): distinct proof
  objects and logic fragments throughout.
- **Nonsmooth convex optimization vs the merged continuous optimization**:
  the subgradient oracle and its complexity theory are a standard boundary;
  noted as the closest judgment call in the optimization cluster.
- **SAT vs SMT**: strengthened rather than blurred; the SMT-solving entry
  that had been filed under SAT moved to the SMT problem (now labeled SMT
  solving and theory combination).
- **Ant colony and evolutionary computation as family problems**: retained
  where no existing canonical problem owns their meta-contract, per the
  method-as-problem rule; their TSP-specific phrases moved out because
  traveling salesman does own that contract.
- Standing non-merges re-verified untouched: SSSP vs APSP vs k-shortest,
  max-flow vs min-cost flow vs min-cut, bipartite vs general vs stable
  matching, TSP vs vehicle routing vs Hamiltonian paths, ODE vs SDE vs PDE,
  the cryptographic primitive family, classification vs image
  classification, query optimization vs execution vs joins, the four cache
  problems, primality vs factorization, RL vs known-model MDP solving vs
  offline RL, multi-agent vs single-agent pathfinding, motion planning vs
  reactive avoidance, quantization vs approximate arithmetic, differential
  privacy vs anonymization, anonymous communication vs access-pattern
  privacy.

Synonym-pass notes: "linear distance" appears nowhere in the catalog;
Manhattan, Chebyshev, and Haversine are each used consistently with no
L1/L2/L-infinity twins to normalize; "Nearest-neighbor search" (hyphen) and
"Context-free parsing" were already single-owner phrasings, preserved
verbatim because phrases are exact entry text.

## Data-quality observations left for future sessions (no action taken)

- Ten problems have two or more entries but only one distinct method
  (maze-solving, maze-generation, code-breaking, point-in-polygon,
  keyword-extraction, race-detection, continual-learning, greeks,
  text-editing before its merge partner arrived, least-squares): rivalsOf
  excludes same-algorithm variants, so these pages list heuristic variants,
  not rivals. Real rival authoring is Fable catalog work, out of scope for
  a consolidation.
- Entries of the form "Maze solving x Wall follower" put the problem in the
  algorithm slot and the real named method in the heuristic slot; a future
  authoring pass could invert them.
- Two near-duplicates were reviewed and left standing with reasons:
  "Fuzzing x Coverage-guided mutation" vs "Fuzz-driven vulnerability
  discovery x Sanitizer-guided coverage" (different emphases, both
  defensible), and "Linear regression x OLS" vs "OLS x Normal equations"
  (the model and its estimator, pedagogically distinct, both tier 1).
- The three duplicate-name planning clusters (Viterbi, Beam search,
  Kernighan-Lin vs Lin-Kernighan) remain intentional, as documented in
  ATLAS.md.

## Concurrency note and a correction to 28d23fa's message

While this consolidation was being prepared, a concurrent session (Claude
Opus 5, tooling work, permitted by rule 10) landed five commits on main:
`5e01aa1` (moved the rivals registry out of the atlas page bundle,
119.8 KB to 94.7 KB gzipped), `021bfb8` (docs retiring the bundle
blocker), `c81e080` and `6f51289` (algorithm/heuristic/phrasing/problem
counts added to the summary and checks), and `7095533` (alphabetical
problem index). None touched problems.json or the topic entries, so every
statistic in this audit is unaffected; the consolidation was built and
committed cleanly on top of them.

The correction: commit `28d23fa`'s message presents the atlas-bundle
defect as this session's incidental discovery and implies its changes
produced the 94.8 KB chunk. In fact this session's baseline readings
predated `5e01aa1` by minutes and went stale unnoticed; the chunk fix is
`5e01aa1`'s, made hours earlier by the concurrent session. What this
session actually contributed on the bundle front: independently
re-deriving the same defect from a stale baseline; fetching the deployed
production chunk (`atlas-Co3eChdu.js`, still pre-fix at fetch time) and
confirming problems.json content inside it, which is direct byte-level
evidence for `5e01aa1`'s premise; excluding the new merges.json registry
from the same glob so the manifest never enters the bundle; and adding an
emitted-bytes guard to check.mjs that fails the build if registry markers
ever appear in the atlas chunk, the oracle class that source-level tests
lack and the reason the original leak lived so long.

## Summary for the career corpus (facts only, verified this session)

Consolidated the AlgoNow problem taxonomy from 661 labels to 648 rigorously
distinct canonical problems across 69 topics and 20 categories, auditing
all 3,253 solution entries (3,249 after removing four documented true
duplicates) and every one of 2,171 problem phrasings. Executed 30
classified merges with per-merge rationale and method-overlap evidence in
a machine-readable manifest, registered 17 newly distinct problems, created
30 permanent redirects so no URL broke, and raised rival coverage to 99.4%
of entries with a mean of 5.0 rival methods per problem. Hardened the
validation suite (label uniqueness, redirect integrity, alphabetical and
depth-sorted navigation, a bundle-content guard) and shipped a
zero-JavaScript navigation layer (A-to-Z jump index, depth-sorted view,
per-category problem filters) inside a 12 KB per-page gzip budget.
Independently confirmed, against the live production bundle, a defect that
had been shipping the full 26 KB rivals registry to every atlas visitor
(fixed hours earlier by a concurrent session), and added the emitted-bytes
build guard that keeps any registry from leaking into the page bundle
again. All statistics derived from source data by committed scripts;
nothing hand-maintained.
