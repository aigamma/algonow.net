// The atlas hierarchy is three tiers, each a distinct scale:
//
//   CATEGORY  (~20)   broad, legible field of algorithms      <- the nav spine
//     TOPIC   (~100)  a specific subtopic (one JSON shard)    <- the fine filter
//       ENTRY (~thousands) one algorithm or algorithm x heuristic pair
//
// A category is a bucket of topics; a topic is one file in src/data/atlas/. The
// tiers are meant to stay ~5x apart (20 : ~100 : ~4000), so each is genuinely
// its own level, not a near-duplicate of the one above. Categories grow slowly
// and deliberately; topics proliferate as the catalog scales (split an oversized
// topic file into finer ones); entries are where the bulk of growth lives.
//
// This file is the single source of the taxonomy: each category lists the topic
// files it owns. The check verifies every topic file is placed in exactly one
// category (total coverage, no orphans, no double-placement).

export const CATEGORIES = [
  {
    key: 'sorting-selection',
    label: 'Sorting & Selection',
    blurb: 'Ordering data and finding order statistics.',
    topics: ['sorting'],
  },
  {
    key: 'data-structures',
    label: 'Data Structures',
    blurb: 'The containers: trees, heaps, hash tables, tries, range structures.',
    topics: ['search-structures'],
  },
  {
    key: 'graphs',
    label: 'Graph Algorithms',
    blurb: 'Traversal, shortest paths, flows, matchings, connectivity, coloring, network science.',
    topics: ['graphs-paths', 'graphs-structure', 'network-science', 'graph-drawing'],
  },
  {
    key: 'dp-combinatorics',
    label: 'Dynamic Programming & Combinatorics',
    blurb: 'Optimal substructure, and generating or counting combinatorial objects.',
    topics: ['dynamic-programming', 'combinatorial-enumeration'],
  },
  {
    key: 'optimization-or',
    label: 'Optimization & Operations Research',
    blurb: 'Metaheuristics, approximation, scheduling, online decisions, mechanism design, quantitative finance.',
    topics: ['metaheuristics', 'approximation', 'convex-optimization', 'scheduling-operations', 'online-competitive', 'game-theory-social-choice', 'quantitative-finance'],
  },
  {
    key: 'search-constraints-games',
    label: 'Search, Constraints & Games',
    blurb: 'State-space and adversarial search, constraint satisfaction, automated reasoning, puzzles.',
    topics: ['game-search', 'backtracking-cp', 'automated-reasoning', 'puzzles-recreational'],
  },
  {
    key: 'strings',
    label: 'Strings & Text',
    blurb: 'Pattern matching, suffix structures, alignment, similarity.',
    topics: ['strings'],
  },
  {
    key: 'geometry',
    label: 'Computational Geometry & Topology',
    blurb: 'Hulls, triangulation, spatial indexing, intersection, nearest neighbors, geospatial computing, topological data analysis.',
    topics: ['computational-geometry', 'computational-topology', 'geospatial'],
  },
  {
    key: 'numerical',
    label: 'Numerical & Scientific Computing',
    blurb: 'Root finding, linear algebra, integration, transforms, PDE solvers, computer algebra.',
    topics: ['numerical', 'numerical-pde', 'computational-algebra'],
  },
  {
    key: 'signal-graphics',
    label: 'Signal, Image & Graphics',
    blurb: 'Filtering, feature extraction, computer vision, audio and speech, rendering, the geometry of pictures.',
    topics: ['signal-image', 'graphics-rendering', 'computer-vision', 'audio-speech'],
  },
  {
    key: 'ml-ai',
    label: 'Machine Learning & AI',
    blurb: 'Classical learning, deep networks, large language model systems, reinforcement learning, forecasting, recommendation, causal inference.',
    topics: ['machine-learning', 'deep-learning', 'llm-inference', 'llm-training-alignment', 'reinforcement-learning', 'kernel-methods', 'gaussian-processes', 'model-selection', 'semi-supervised-meta', 'time-series', 'recommender-causal'],
  },
  {
    key: 'probabilistic',
    label: 'Probabilistic, Randomized & Simulation',
    blurb: 'Sketches, sampling, Monte Carlo, Markov chains, stochastic simulation, queueing.',
    topics: ['probabilistic-streaming', 'stochastic-simulation', 'statistics-inference', 'queueing-performance'],
  },
  {
    key: 'crypto-number-theory',
    label: 'Cryptography & Number Theory',
    blurb: 'Modular arithmetic, primality, factorization, ciphers, protocols, privacy and security, and the post-quantum migration.',
    topics: ['cryptography-number-theory', 'privacy-security', 'post-quantum-cryptography'],
  },
  {
    key: 'compression-coding',
    label: 'Information Theory & Coding',
    blurb: 'Entropy coding, dictionary compression, error-correcting codes, information measures.',
    topics: ['compression-coding', 'information-theory'],
  },
  {
    key: 'distributed-systems',
    label: 'Systems & Networking',
    blurb: 'Consensus, replication, concurrency, fault tolerance, operating systems, routing, transport.',
    topics: ['distributed-concurrent', 'fault-tolerance-storage', 'operating-systems', 'stream-processing', 'networking'],
  },
  {
    key: 'data-retrieval',
    label: 'Databases & Information Retrieval',
    blurb: 'Joins, query optimization, transactions, ranking, indexing, vector search, NLP retrieval.',
    topics: ['databases-query', 'distributed-databases', 'information-retrieval-nlp', 'nlp-tasks', 'vector-search'],
  },
  {
    key: 'languages-compilers',
    label: 'Formal Languages & Compilers',
    blurb: 'Automata, parsing, compiler-backend algorithms, program analysis, the processor those compilers target, and the tools that lay out the chip itself.',
    topics: ['automata-languages', 'program-analysis', 'computer-architecture', 'vlsi-eda'],
  },
  {
    key: 'quantum-unconventional',
    label: 'Quantum & Unconventional Computing',
    blurb: 'Quantum algorithms and the DNA, membrane, reservoir, and nature-inspired frontier.',
    topics: ['quantum', 'unconventional-computing'],
  },
  {
    key: 'comp-bio',
    label: 'Computational Biology',
    blurb: 'Sequence search and alignment, phylogenetics, assembly, structure.',
    topics: ['computational-biology'],
  },
  {
    key: 'robotics-control',
    label: 'Robotics, Control & Planning',
    blurb: 'Motion planning, SLAM, localization, feedback and optimal control.',
    topics: ['robotics-planning'],
  },
];

// topic file key -> category key, derived once.
export const CATEGORY_OF_TOPIC = (() => {
  const map = {};
  for (const cat of CATEGORIES) {
    for (const topic of cat.topics) map[topic] = cat.key;
  }
  return map;
})();

export const CATEGORY_BY_KEY = Object.fromEntries(CATEGORIES.map((c) => [c.key, c]));
