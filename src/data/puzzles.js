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
    number: 1,
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
    number: 2,
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
    number: 3,
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
    number: 4,
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
    number: 5,
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
    number: 6,
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
};

// Planned pairs. Shown dimmed on the homepage bench; no HTML entry yet.
export const ROADMAP = [
  { algorithm: 'Greedy best-first search', heuristic: 'Straight-line distance', domain: 'Fast, non-optimal routing' },
  { algorithm: 'Beam search', heuristic: 'Top-k frontier pruning', domain: 'Sequence decoding' },
  { algorithm: 'First-fit decreasing', heuristic: 'Descending size order', domain: 'Bin packing' },
  { algorithm: 'Hill climbing', heuristic: 'Random restarts', domain: 'Local optimization' },
  { algorithm: 'IDA*', heuristic: 'Manhattan distance', domain: 'Memory-bound puzzles' },
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
