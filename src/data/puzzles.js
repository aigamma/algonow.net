// The canonical registry. Every nav surface, Vite build entry, sitemap URL,
// and discovery view derives from this file; adding a pair here plus its
// entry files is the whole wiring (scripts/check.mjs verifies lockstep).

export const SITE_NAME = 'algonow';
export const SITE_HOST = 'https://algonow.net';
export const SITE_TAGLINE =
  'Classical algorithms, paired with the heuristics that steer them.';

// Live pairs, keyed by URL path. `algorithm` is always the control structure
// (blue on every surface), `heuristic` the guiding rule (amber). The split is
// the site's core idea; the colors carry it mechanically.
export const PUZZLES = {
  '/astar-manhattan/': {
    slug: 'astar-manhattan',
    problemSlug: 'single-source-shortest-paths',
    number: 1,
    category: 'graphs',
    algorithm: 'A* search',
    heuristic: 'Manhattan distance',
    domain: 'Shortest paths on grid maps',
    oneLiner:
      'Dijkstra-grade guarantees, steered by a city-block estimate of the distance still to go.',
    description:
      'A* search paired with the Manhattan-distance heuristic: optimal grid pathfinding, animated live, with a tested Python solution and a spoken lesson.',
    listenMinutes: 7,
    time: 'O(b^d)',
    space: 'O(b^d)',
    baseline: 'Dijkstra / BFS',
    vite: 'astar-manhattan',
    html: 'astar-manhattan/index.html',
  },
  '/annealing-cooling/': {
    slug: 'annealing-cooling',
    problemSlug: 'traveling-salesman',
    number: 2,
    category: 'optimization-or',
    algorithm: 'Simulated annealing',
    heuristic: 'Geometric cooling schedule',
    domain: 'Traveling-salesman tours',
    oneLiner:
      'A random walk through tour space that accepts bad trades while hot, refuses them when cold, and anneals into a near-optimal loop.',
    description:
      'Simulated annealing paired with a geometric cooling schedule on the traveling-salesman problem: watch a live tour untangle at three cooling rates, with a tested Python solution and a spoken lesson.',
    listenMinutes: 7,
    time: 'O(k · n)',
    space: 'O(n)',
    baseline: 'Held-Karp / greedy',
    vite: 'annealing-cooling',
    html: 'annealing-cooling/index.html',
  },
  '/minimax-alphabeta/': {
    slug: 'minimax-alphabeta',
    problemSlug: 'game-tree-search',
    number: 3,
    category: 'search-constraints-games',
    algorithm: 'Minimax',
    heuristic: 'Alpha-beta pruning order',
    domain: 'Adversarial game trees',
    oneLiner:
      'Perfect play by exhaustive lookahead, made affordable by refusing to read branches a rational opponent already ruled out.',
    description:
      'Minimax paired with alpha-beta pruning and the move-ordering heuristic: watch the same game tree searched under best-first, random, and worst-first orderings, with a tested Python solution and a spoken lesson.',
    listenMinutes: 7,
    time: 'O(b^(d/2))',
    space: 'O(d)',
    baseline: 'Plain minimax',
    vite: 'minimax-alphabeta',
    html: 'minimax-alphabeta/index.html',
  },
  '/backtracking-mrv/': {
    slug: 'backtracking-mrv',
    problemSlug: 'constraint-satisfaction',
    number: 4,
    category: 'search-constraints-games',
    algorithm: 'Backtracking search',
    heuristic: 'Minimum remaining values',
    domain: 'Sudoku and constraint grids',
    oneLiner:
      'Depth-first trial and error that always works the tightest cell first, so mistakes surface in one move, not twenty.',
    description:
      'Backtracking search paired with the minimum-remaining-values heuristic on Sudoku: watch the same grid solved in reading order versus tightest-cell-first, with a tested Python solution and a spoken lesson.',
    listenMinutes: 7,
    time: 'O(9^m)',
    space: 'O(m)',
    baseline: 'Reading-order backtracking',
    vite: 'backtracking-mrv',
    html: 'backtracking-mrv/index.html',
  },
  '/branchbound-fractional/': {
    slug: 'branchbound-fractional',
    problemSlug: 'knapsack',
    number: 5,
    category: 'search-constraints-games',
    algorithm: 'Branch and bound',
    heuristic: 'Fractional relaxation bound',
    domain: 'The 0/1 knapsack',
    oneLiner:
      'Exhaustive search that carries a receipt: any branch whose optimistic ceiling cannot beat the best bag in hand is discarded unopened.',
    description:
      'Branch and bound paired with the fractional-relaxation bound on the 0/1 knapsack: watch subtrees die the moment their ceiling touches the best bag, with a tested Python solution and a spoken lesson.',
    listenMinutes: 7,
    time: 'O(2^n)',
    space: 'O(n)',
    baseline: 'Full enumeration',
    vite: 'branchbound-fractional',
    html: 'branchbound-fractional/index.html',
  },
  '/mcts-ucb1/': {
    slug: 'mcts-ucb1',
    problemSlug: 'bandits',
    number: 6,
    category: 'search-constraints-games',
    algorithm: 'Monte Carlo tree search',
    heuristic: 'UCB1 exploration bonus',
    domain: 'Games too big to solve',
    oneLiner:
      'Learn the tree by playing it: random playouts grade the moves, and a bandit formula decides which branch has earned the next simulation.',
    description:
      'Monte Carlo tree search paired with the UCB1 exploration bonus: watch a search tree grow asymmetrically under three exploration constants, with a tested Python solution and a spoken lesson.',
    listenMinutes: 8,
    time: 'O(k · d)',
    space: 'O(k)',
    baseline: 'Uniform sampling',
    vite: 'mcts-ucb1',
    html: 'mcts-ucb1/index.html',
  },
  '/dijkstra-binary-heap/': {
    slug: 'dijkstra-binary-heap',
    problemSlug: 'single-source-shortest-paths',
    number: 7,
    category: 'graphs',
    algorithm: "Dijkstra's algorithm",
    heuristic: 'Binary heap priority queue',
    domain: 'Nonnegative shortest paths',
    oneLiner:
      'One proof, four data structures: which container answers "nearest unsettled vertex" decides whether the same algorithm costs seconds or hours.',
    description:
      "Dijkstra's algorithm paired with a binary heap: the same proof strategy priced by its priority queue, raced against a linear scan, Bellman-Ford, and breadth-first search on one graph, with a tested Python solution and a spoken lesson.",
    listenMinutes: 8,
    time: 'O(E log V)',
    space: 'O(V)',
    baseline: 'Linear scan, O(V^2)',
    vite: 'dijkstra-binary-heap',
    html: 'dijkstra-binary-heap/index.html',
  },
  '/unionfind-rank-compression/': {
    slug: 'unionfind-rank-compression',
    problemSlug: 'disjoint-sets',
    number: 8,
    category: 'data-structures',
    algorithm: 'Union-find',
    heuristic: 'Union by rank with path compression',
    domain: 'Components that only merge',
    oneLiner:
      'A forest of parent pointers where rank decides who hangs under whom and every lookup flattens the path it walked, until each question costs almost nothing.',
    description:
      'Union-find paired with union by rank and path compression: watch the same merge stream build a flat forest against a naive one, raced against quick-find and per-query search, with a tested Python solution and a spoken lesson.',
    listenMinutes: 8,
    time: 'O(α(n)) amortized',
    space: 'O(n)',
    baseline: 'Quick-find / naive linking',
    vite: 'unionfind-rank-compression',
    html: 'unionfind-rank-compression/index.html',
  },
  '/kmp-failure-function/': {
    slug: 'kmp-failure-function',
    problemSlug: 'substring-search',
    number: 9,
    category: 'strings',
    algorithm: 'Knuth-Morris-Pratt',
    heuristic: 'Failure-function prefixes',
    domain: 'Needles in streaming haystacks',
    oneLiner:
      'A forward-only scan whose text finger never backs up: when a match breaks, a table of the pattern’s self-overlaps says exactly how much certainty survives.',
    description:
      'Knuth-Morris-Pratt paired with the failure function: watch it race a naive scan on repetitive text without re-reading a character, with a tested Python solution and a spoken lesson.',
    listenMinutes: 8,
    time: 'O(n + m)',
    space: 'O(m)',
    baseline: 'Naive scan, O(n·m)',
    vite: 'kmp-failure-function',
    html: 'kmp-failure-function/index.html',
  },
  '/quicksort-median-of-three/': {
    slug: 'quicksort-median-of-three',
    problemSlug: 'comparison-sorting',
    number: 10,
    category: 'sorting-selection',
    algorithm: 'Quicksort',
    heuristic: 'Median-of-three pivot',
    domain: 'In-place comparison sorting',
    oneLiner:
      'Partition around a pivot and recurse; three sampled keys per split are the cheap insurance that keeps a great average case from meeting its quadratic ghost.',
    description:
      'Quicksort paired with the median-of-three pivot: one array sorted under two pivot rules, raced against mergesort, heapsort, Timsort, and introsort, with a tested Python solution and a spoken lesson.',
    listenMinutes: 8,
    time: 'O(n log n) expected',
    space: 'O(log n)',
    baseline: 'First-element pivot',
    vite: 'quicksort-median-of-three',
    html: 'quicksort-median-of-three/index.html',
  },
  '/bloom-filter-k-hashes/': {
    slug: 'bloom-filter-k-hashes',
    problemSlug: 'approximate-membership',
    number: 11,
    category: 'probabilistic',
    algorithm: 'Bloom filter',
    heuristic: 'K independent hashes',
    domain: 'Approximate set membership',
    oneLiner:
      'A bit array that never forgets a member and occasionally imagines one: k hash probes per key, tuned so half the bits stay zero and every zero is proof.',
    description:
      'A Bloom filter paired with k independent hashes: watch two filters face the same strangers at different k, raced against cuckoo and XOR filters and an exact set, with a tested Python solution.',
    listenMinutes: 8,
    time: 'O(k) per op',
    space: 'm bits, 12 per key',
    baseline: 'Exact hash set',
    vite: 'bloom-filter-k-hashes',
    html: 'bloom-filter-k-hashes/index.html',
  },
  '/hyperloglog-leading-zeros/': {
    slug: 'hyperloglog-leading-zeros',
    problemSlug: 'cardinality-estimation',
    number: 12,
    category: 'probabilistic',
    algorithm: 'HyperLogLog',
    heuristic: 'Leading-zero registers',
    domain: 'Counting distinct at scale',
    oneLiner:
      'A kilobyte of registers counts a million-item stream: the longest run of leading zeros ever seen is a witness statement about how many distinct hashes went by.',
    description:
      'HyperLogLog paired with leading-zero registers: watch a 768-byte sketch track a live stream against the true count, raced against Flajolet-Martin, KMV, linear counting, and an exact set.',
    listenMinutes: 8,
    time: 'O(1) per item',
    space: '768 B at ±3.3%',
    baseline: 'Exact hash set',
    vite: 'hyperloglog-leading-zeros',
    html: 'hyperloglog-leading-zeros/index.html',
  },
  '/kadane-running-maximum/': {
    slug: 'kadane-running-maximum',
    problemSlug: 'maximum-subarray',
    number: 13,
    category: 'dp-combinatorics',
    algorithm: "Kadane's algorithm",
    heuristic: 'Running maximum',
    domain: 'The brightest stretch of an array',
    oneLiner:
      'One pass, two numbers in hand: the best run ending here and the best run ever, because a negative prefix is dead weight no future window should carry.',
    description:
      "Kadane's algorithm paired with the running maximum: one pass finds the maximum subarray against brute force, divide and conquer, and a segment tree under churn, with a tested Python solution.",
    listenMinutes: 8,
    time: 'O(n)',
    space: 'O(1)',
    baseline: 'Brute force pairs',
    vite: 'kadane-running-maximum',
    html: 'kadane-running-maximum/index.html',
  },
  '/huffman-frequency-merges/': {
    slug: 'huffman-frequency-merges',
    problemSlug: 'prefix-codes',
    number: 14,
    category: 'compression-coding',
    algorithm: 'Huffman coding',
    heuristic: 'Frequency-sorted merges',
    domain: 'Squeezing symbols to their frequencies',
    oneLiner:
      'Merge the two rarest, again and again, until one tree remains: rare symbols sink deep, common ones float shallow, and no prefix-free code can do better.',
    description:
      'Huffman coding paired with frequency-sorted merges: watch the optimal prefix tree build itself, measured against Shannon-Fano, arithmetic coding, and rANS on prose and on skew, with a tested Python solution.',
    listenMinutes: 8,
    time: 'O(k log k) build',
    space: 'O(k)',
    baseline: 'Fixed-width code',
    vite: 'huffman-frequency-merges',
    html: 'huffman-frequency-merges/index.html',
  },
  '/dinic-level-graphs/': {
    slug: 'dinic-level-graphs',
    problemSlug: 'maximum-flow',
    number: 15,
    category: 'graphs',
    algorithm: "Dinic's algorithm",
    heuristic: 'Level-graph blocking flows',
    domain: 'Maximum flow through a network',
    oneLiner:
      'Augment only along shortest paths, in bulk: BFS layers the residual graph, a blocking flow saturates the whole layer cake, and the distance to the sink can only rise.',
    description:
      "Dinic's algorithm paired with level-graph blocking flows: watch phases saturate a network, raced against Edmonds-Karp, Ford-Fulkerson, and push-relabel, with a tested Python solution.",
    listenMinutes: 8,
    time: 'O(V²E), O(E√V) unit',
    space: 'O(V + E)',
    baseline: 'Any augmenting path',
    vite: 'dinic-level-graphs',
    html: 'dinic-level-graphs/index.html',
  },
  '/pagerank-damped-walk/': {
    slug: 'pagerank-damped-walk',
    problemSlug: 'link-analysis',
    number: 16,
    category: 'probabilistic',
    algorithm: 'PageRank',
    heuristic: 'Damped random walk',
    domain: 'Ranking linked graphs',
    oneLiner:
      'Importance as the habit of a distractible reader: follow links, jump anywhere every seventh click, and rank pages by where eternity gets spent.',
    description:
      'PageRank paired with the damped random walk: watch a swarm of surfers converge to the eigenvector, measured against HITS, SALSA, and in-degree on traps, cliques, and link farms.',
    listenMinutes: 8,
    time: 'O(E) per pass',
    space: 'O(V)',
    baseline: 'In-degree count',
    vite: 'pagerank-damped-walk',
    html: 'pagerank-damped-walk/index.html',
  },
  '/lru-recency-eviction/': {
    slug: 'lru-recency-eviction',
    problemSlug: 'page-replacement',
    number: 17,
    category: 'optimization-or',
    algorithm: 'LRU caching',
    heuristic: 'Least-recently-used eviction',
    domain: 'Page and cache replacement',
    oneLiner:
      'Serve hits, fetch misses, and when a slot must be freed, bet on temporal locality: the resident untouched longest is the one least likely to be missed.',
    description:
      "LRU caching paired with recency eviction: watch it race Belady's clairvoyant on one stream, measured against FIFO, LFU, and random on drifting and scanning traces, with a tested Python solution.",
    listenMinutes: 8,
    time: 'O(1) per request',
    space: 'O(k)',
    baseline: 'FIFO eviction',
    vite: 'lru-recency-eviction',
    html: 'lru-recency-eviction/index.html',
  },
  '/kmeans-plus-plus-seeding/': {
    slug: 'kmeans-plus-plus-seeding',
    problemSlug: 'clustering',
    number: 18,
    category: 'ml-ai',
    algorithm: 'K-means',
    heuristic: 'K-means++ seeding',
    domain: 'Clustering points into k groups',
    oneLiner:
      'Lloyd’s descent always converges; where it converges is decided before it starts, so seed each center proportional to squared distance from the rest.',
    description:
      'K-means paired with k-means++ seeding: the same blobs clustered from good and bad openings, measured against DBSCAN, Gaussian mixtures, and single linkage, with a tested Python solution.',
    listenMinutes: 8,
    time: 'O(nk) per iteration',
    space: 'O(n + k)',
    baseline: 'Uniform random seeds',
    vite: 'kmeans-plus-plus-seeding',
    html: 'kmeans-plus-plus-seeding/index.html',
  },
  '/graham-scan-polar-sort/': {
    slug: 'graham-scan-polar-sort',
    problemSlug: 'convex-hull',
    number: 19,
    category: 'geometry',
    algorithm: 'Graham scan',
    heuristic: 'Polar-angle sorting',
    domain: 'Convex hulls in the plane',
    oneLiner:
      'Sort the points by angle around the lowest one and the tour never crosses itself: one forgetful pass with a stack tightens it into the hull.',
    description:
      'Graham scan paired with polar-angle sorting: watch the string tighten into a convex hull, measured against Jarvis march, monotone chain, and Quickhull on disks and circles, with a tested Python solution.',
    listenMinutes: 8,
    time: 'O(n log n)',
    space: 'O(n)',
    baseline: 'Edge-by-edge definition',
    vite: 'graham-scan-polar-sort',
    html: 'graham-scan-polar-sort/index.html',
  },
  '/gradient-descent-momentum/': {
    slug: 'gradient-descent-momentum',
    problemSlug: 'continuous-optimization',
    number: 20,
    category: 'numerical',
    algorithm: 'Gradient descent',
    heuristic: 'Polyak momentum',
    domain: 'Smooth minimization',
    oneLiner:
      'In a narrow valley the gradient points at the opposite wall; remember a fraction of your last step and the crosswise bounces cancel while the downhill drift compounds.',
    description:
      'Gradient descent paired with Polyak momentum: two marbles descend one ill-conditioned canyon, measured against Nesterov, conjugate gradient, and Newton, with both rate theorems checked numerically.',
    listenMinutes: 8,
    time: 'O(√κ log 1/ε)',
    space: 'O(d)',
    baseline: 'Plain gradient descent',
    vite: 'gradient-descent-momentum',
    html: 'gradient-descent-momentum/index.html',
  },
  '/kahn-zero-indegree-queue/': {
    slug: 'kahn-zero-indegree-queue',
    problemSlug: 'topological-ordering',
    number: 21,
    category: 'graphs',
    algorithm: "Kahn's algorithm",
    heuristic: 'Zero in-degree queue',
    domain: 'Ordering dependencies',
    oneLiner:
      'Whatever has no unmet prerequisites is safe to do right now: keep that frontier in a queue and the whole graph orders itself in one pass, waves included.',
    description:
      "Kahn's algorithm paired with the zero in-degree queue: watch a dependency graph order itself in parallel waves, measured against DFS finish-order and the naive rescan, with a tested Python solution.",
    listenMinutes: 8,
    time: 'O(V + E), exact',
    space: 'O(V)',
    baseline: 'Source rescan, O(V²)',
    vite: 'kahn-zero-indegree-queue',
    html: 'kahn-zero-indegree-queue/index.html',
  },
  '/binary-search-halving/': {
    slug: 'binary-search-halving',
    problemSlug: 'sorted-array-search',
    number: 22,
    category: 'data-structures',
    algorithm: 'Binary search',
    heuristic: 'Halving invariant',
    domain: 'Sorted-array lookup',
    oneLiner:
      'Keep one true sentence, "the answer lies in [lo, hi)", and probe the midpoint so either answer halves it: twenty probes on a million keys, guaranteed, on any input.',
    description:
      'Binary search paired with the halving invariant: one bracket, three probe policies, measured against interpolation and galloping search, with the 1946 bug pinned spinning in a test.',
    listenMinutes: 8,
    time: '⌈log₂ n⌉ + 1 probes',
    space: 'O(1)',
    baseline: 'Linear scan, n/2',
    vite: 'binary-search-halving',
    html: 'binary-search-halving/index.html',
  },
  '/kruskal-union-find/': {
    slug: 'kruskal-union-find',
    problemSlug: 'minimum-spanning-tree',
    number: 23,
    category: 'graphs',
    algorithm: "Kruskal's algorithm",
    heuristic: 'Union-find cycle test',
    domain: 'Minimum spanning trees',
    oneLiner:
      'Scan edges cheapest-first and lay each one only if its endpoints are on different grids: one question asked E times, answered in under one parent-jump by the flat forest.',
    description:
      "Kruskal's algorithm paired with the union-find cycle test: watch villages wire themselves cheapest-first, measured against Prim, Borůvka, and the BFS test, with the MST certified by the cycle property.",
    listenMinutes: 8,
    time: 'O(E log E)',
    space: 'O(V)',
    baseline: 'BFS cycle test',
    vite: 'kruskal-union-find',
    html: 'kruskal-union-find/index.html',
  },
  '/reservoir-algorithm-r/': {
    slug: 'reservoir-algorithm-r',
    problemSlug: 'stream-sampling',
    number: 24,
    category: 'probabilistic',
    algorithm: 'Reservoir sampling',
    heuristic: 'Algorithm R',
    domain: 'Sampling unbounded streams',
    oneLiner:
      'A k-seat lifeboat beside an endless line: item n boards with probability k/n, evicting a random resident, and everyone who ever passed holds exactly the same claim.',
    description:
      'Reservoir sampling paired with Algorithm R: uniformity proven in exact fractions, the draw ledger against Algorithm L and bottom-k keys, and the contracts Bernoulli and systematic sampling break.',
    listenMinutes: 8,
    time: 'O(1) per item',
    space: 'O(k)',
    baseline: 'Store all, pick at end',
    vite: 'reservoir-algorithm-r',
    html: 'reservoir-algorithm-r/index.html',
  },
  '/wagner-fischer-table/': {
    slug: 'wagner-fischer-table',
    problemSlug: 'edit-distance',
    number: 25,
    category: 'strings',
    algorithm: 'Wagner-Fischer',
    heuristic: 'Prefix-to-prefix table',
    domain: 'Edit distance, witnessed',
    oneLiner:
      'D[i][j] = the distance between prefixes: three neighbors answer every cell, the corner holds the cost, and walking the argmins home is the edit script itself.',
    description:
      'Wagner-Fischer paired with the prefix-to-prefix table: watch the edit-distance grid fill and trace its script, measured against Hirschberg, Ukkonen’s band, and Myers diff, every script applied and verified.',
    listenMinutes: 8,
    time: 'Θ(nm) cells',
    space: 'O(nm), O(m) two-row',
    baseline: 'Naive recursion, 3ⁿ',
    vite: 'wagner-fischer-table',
    html: 'wagner-fischer-table/index.html',
  },
  '/fenwick-lowbit-ladders/': {
    slug: 'fenwick-lowbit-ladders',
    problemSlug: 'array-range-queries',
    number: 26,
    category: 'data-structures',
    algorithm: 'Fenwick tree',
    heuristic: 'Low-bit ladders',
    domain: 'Prefix sums under change',
    oneLiner:
      'A tree that was never built: each index owns a block of length i & (−i), queries descend the ladder, updates climb it, and the routing table is binary itself.',
    description:
      'The Fenwick tree paired with low-bit ladders: watch queries descend and updates climb the phantom tree, measured against cumulative sums, segment trees, and sqrt blocks on mixed and static workloads.',
    listenMinutes: 8,
    time: 'O(log n) per op',
    space: 'n cells',
    baseline: 'Rebuild cumulative sums',
    vite: 'fenwick-lowbit-ladders',
    html: 'fenwick-lowbit-ladders/index.html',
  },
};

// Planned pairs. Shown dimmed on the homepage bench; no HTML entry yet.
// The bench mirrors the committed build queue (docs/OVERNIGHT-PLAN.md,
// F21 onward, in order), so the public promise and the plan tell one story.
export const ROADMAP = [
  { algorithm: 'Aho-Corasick', heuristic: 'Failure-link automaton', domain: 'Matching many patterns at once' },
  { algorithm: 'Simplex method', heuristic: 'Dantzig pivot rule', domain: 'Linear programming' },
  { algorithm: 'Viterbi algorithm', heuristic: 'Max-product trellis', domain: 'Decoding hidden sequences' },
  { algorithm: 'Skip list', heuristic: 'Coin-flip level promotion', domain: 'Ordered maps by lottery' },
  { algorithm: "Strassen's algorithm", heuristic: 'Seven-product block split', domain: 'Fast matrix multiplication' },
];

export const LIVE_PUZZLES = Object.values(PUZZLES).sort((a, b) => a.number - b.number);

export const VITE_ENTRIES = {
  main: 'index.html',
  atlas: 'atlas/index.html',
  ...Object.fromEntries(LIVE_PUZZLES.map((p) => [p.vite, p.html])),
};

// Non-puzzle pages that still belong in the sitemap.
export const EXTRA_PAGES = ['/atlas/'];

export function pairTitle(p) {
  return `${p.algorithm} × ${p.heuristic}`;
}

export function puzzlePath(p) {
  return `/${p.slug}/`;
}

export function nextPuzzle(p) {
  const i = LIVE_PUZZLES.findIndex((q) => q.slug === p.slug);
  return LIVE_PUZZLES[(i + 1) % LIVE_PUZZLES.length];
}
