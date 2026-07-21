// The 16-20 major categories above the fine-grained families. These are the
// legible, textbook-recognizable top-level buckets a reader (or a hiring
// manager) would name themselves: sorting, graphs, DP, optimization, and so
// on. Each of the 34 atlas family files maps to exactly one category; the
// check verifies the mapping is total (every family placed, no orphans).
//
// The rule for this layer: objective and recognizable, never an artificial
// split. When two small families share a genuine textbook home (signal +
// graphics both being transform/geometry heavy) they share a category rather
// than inventing two thin ones.

export const CATEGORIES = [
  {
    key: 'sorting-selection',
    label: 'Sorting & Selection',
    blurb: 'Ordering data and finding order statistics.',
    families: ['sorting'],
  },
  {
    key: 'data-structures',
    label: 'Data Structures',
    blurb: 'The containers: trees, heaps, hash tables, tries, range structures.',
    families: ['search-structures'],
  },
  {
    key: 'graphs',
    label: 'Graph Algorithms',
    blurb: 'Traversal, shortest paths, flows, matchings, connectivity, coloring, network science.',
    families: ['graphs-paths', 'graphs-structure', 'network-science'],
  },
  {
    key: 'dp-combinatorics',
    label: 'Dynamic Programming & Combinatorics',
    blurb: 'Optimal substructure, and generating or counting combinatorial objects.',
    families: ['dynamic-programming', 'combinatorial-enumeration'],
  },
  {
    key: 'optimization-or',
    label: 'Optimization & Operations Research',
    blurb: 'Metaheuristics, approximation, scheduling, online decisions, mechanism design, quantitative finance.',
    families: ['metaheuristics', 'approximation', 'scheduling-operations', 'online-competitive', 'game-theory-social-choice', 'quantitative-finance'],
  },
  {
    key: 'search-constraints-games',
    label: 'Search, Constraints & Games',
    blurb: 'State-space and adversarial search, constraint satisfaction, puzzles.',
    families: ['game-search', 'backtracking-cp', 'puzzles-recreational'],
  },
  {
    key: 'strings',
    label: 'Strings & Text',
    blurb: 'Pattern matching, suffix structures, alignment, similarity.',
    families: ['strings'],
  },
  {
    key: 'geometry',
    label: 'Computational Geometry',
    blurb: 'Hulls, triangulation, spatial indexing, intersection, nearest neighbors.',
    families: ['computational-geometry'],
  },
  {
    key: 'numerical',
    label: 'Numerical & Scientific Computing',
    blurb: 'Root finding, linear algebra, optimization, integration, transforms, PDE solvers.',
    families: ['numerical', 'numerical-pde'],
  },
  {
    key: 'signal-graphics',
    label: 'Signal, Image & Graphics',
    blurb: 'Filtering, feature extraction, audio and speech, rendering, the geometry of pictures.',
    families: ['signal-image', 'graphics-rendering', 'audio-speech'],
  },
  {
    key: 'ml-ai',
    label: 'Machine Learning & AI',
    blurb: 'Classical learning, deep networks, reinforcement learning, forecasting, recommendation, causal inference.',
    families: ['machine-learning', 'deep-learning', 'reinforcement-learning', 'time-series', 'recommender-causal'],
  },
  {
    key: 'probabilistic',
    label: 'Probabilistic, Randomized & Simulation',
    blurb: 'Sketches, sampling, Monte Carlo, Markov chains, stochastic simulation.',
    families: ['probabilistic-streaming', 'stochastic-simulation'],
  },
  {
    key: 'crypto-number-theory',
    label: 'Cryptography & Number Theory',
    blurb: 'Modular arithmetic, primality, factorization, ciphers, protocols, privacy and security.',
    families: ['cryptography-number-theory', 'privacy-security'],
  },
  {
    key: 'compression-coding',
    label: 'Compression & Coding Theory',
    blurb: 'Entropy coding, dictionary compression, error-correcting codes.',
    families: ['compression-coding'],
  },
  {
    key: 'distributed-systems',
    label: 'Systems & Networking',
    blurb: 'Consensus, replication, concurrency, fault tolerance, operating systems, routing, transport.',
    families: ['distributed-concurrent', 'fault-tolerance-storage', 'operating-systems', 'networking'],
  },
  {
    key: 'data-retrieval',
    label: 'Databases & Information Retrieval',
    blurb: 'Joins, query optimization, transactions, ranking, indexing, NLP retrieval.',
    families: ['databases-query', 'information-retrieval-nlp'],
  },
  {
    key: 'languages-compilers',
    label: 'Formal Languages & Compilers',
    blurb: 'Automata, parsing, compiler-backend algorithms, and program analysis.',
    families: ['automata-languages', 'program-analysis'],
  },
  {
    key: 'quantum-unconventional',
    label: 'Quantum & Unconventional Computing',
    blurb: 'Quantum algorithms and the DNA, membrane, reservoir, and nature-inspired frontier.',
    families: ['quantum', 'unconventional-computing'],
  },
  {
    key: 'comp-bio',
    label: 'Computational Biology',
    blurb: 'Sequence search and alignment, phylogenetics, assembly, structure.',
    families: ['computational-biology'],
  },
  {
    key: 'robotics-control',
    label: 'Robotics, Control & Planning',
    blurb: 'Motion planning, SLAM, localization, feedback and optimal control.',
    families: ['robotics-planning'],
  },
];

// family key -> category, derived once.
export const CATEGORY_OF_FAMILY = (() => {
  const map = {};
  for (const cat of CATEGORIES) {
    for (const fam of cat.families) map[fam] = cat.key;
  }
  return map;
})();

export const CATEGORY_BY_KEY = Object.fromEntries(CATEGORIES.map((c) => [c.key, c]));
