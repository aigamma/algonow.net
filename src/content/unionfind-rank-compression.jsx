import UnionFindViz from '../viz/UnionFindViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/unionfind_rank_compression.py?raw';
import { narration } from './unionfind-rank-compression.narration.js';

export const content = {
  given:
    'A universe of n elements, each starting in its own set, and a stream of two operations: union(a, b) merges the sets holding a and b; connected(a, b) asks whether they are in the same set.',
  task: 'Answer every connected query correctly, online, as the merges keep arriving.',
  constraint:
    'Sets only merge. Nothing ever splits, and no union is ever undone. That one-way street is what the whole structure is built on.',

  origins: (
    <p>
      Bernard Galler and Michael Fischer published the parent-pointer forest
      in 1964, built for Fortran compilers deciding which variables the
      EQUIVALENCE statement had glued together. The balancing and
      path-shortening tricks circulated as folklore until Robert Tarjan proved
      the strange truth in 1975: with both heuristics the amortized cost per
      operation is <strong>inverse Ackermann</strong>, a function whose value
      is at most 4 for any input that fits in the physical universe. Fredman
      and Saks closed the book in 1989: no structure can do better.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>representation</strong>. Every element carries one
      parent pointer; follow pointers up and the root you reach is the
      set&apos;s name. Two elements are connected exactly when their roots
      coincide, and merging two sets is one pointer write: hang one root under
      the other. Correct with no further cleverness; the only question is how
      long the walks to the root get.
    </p>
  ),
  heurRole: (
    <p>
      Controls the <strong>shape of the forest</strong>, which is the entire
      cost. <strong>Union by rank</strong> hangs the shallower tree under the
      deeper one, capping height at log n. <strong>Path compression</strong>{' '}
      rewires every node a find walks past to point straight at the root, so
      each query flattens the trail it used. Either alone gives O(log n);
      together they give amortized <strong>O(α(n))</strong>, effectively
      constant. Neither ever changes an answer, only the price.
    </p>
  ),

  picture: (
    <p>
      Clubs, each with a president. Every member knows one person senior to
      them; ask up the chain and you eventually reach the president, which is
      the club&apos;s name. When two clubs merge, the president of the smaller
      one starts reporting to the president of the larger: one introduction,
      done. And path compression is what a sensible member does after climbing
      the chain once: write down who the president actually is, and next time
      ask them directly. The org chart flattens itself through use.
    </p>
  ),

  steps: [
    <>
      <strong>Start:</strong> parent[x] = x for every element. Each element is
      its own root, rank 0.
    </>,
    <>
      <strong>Find(x):</strong> follow parents until a node points at itself.
      That node is the root, the set&apos;s name.
    </>,
    <>
      <strong>Compress:</strong> walk the same path a second time and point
      every node on it directly at the root. The next find on this trail costs
      one hop.
    </>,
    <>
      <strong>Union(a, b):</strong> find both roots. If they differ, hang the
      lower-rank root under the higher; on a tie, either way, and the
      winner&apos;s rank rises by one.
    </>,
    <>
      <strong>Query(a, b):</strong> two finds and a comparison. The forest is
      flatter after every question you ask it.
    </>,
  ],

  signals: [
    <>
      Merges and membership questions arrive <strong>interleaved</strong> and
      must be answered online, not after the fact.
    </>,
    <>
      Connectivity is <strong>monotone</strong>: things join and never
      separate. No undo, no deletions.
    </>,
    <>
      The operation stream is long, so <strong>amortized near-constant</strong>{' '}
      cost per operation is the difference between instant and infeasible:
      Kruskal&apos;s MST, percolation, image labeling, type unification.
    </>,
  ],
  baseline: (
    <>
      Two honest baselines, both real named methods. <strong>Quick-find</strong>{' '}
      stores each element&apos;s set id directly: queries cost two reads,
      unions relabel the whole array. <strong>Quick-union</strong> is the same
      forest with no balancing at all. On the shared 1,500-element stream
      below they cost <strong>2,031,171</strong> and <strong>189,204</strong>{' '}
      touches against the pairing&apos;s <strong>25,825</strong>.
    </>
  ),

  strength: (
    <>
      <strong>Effectively constant, provably.</strong> Amortized inverse
      Ackermann per operation: α(n) is 3 at n = 1,500 and still 4 at the atom
      count of the universe. The structure also flattens itself through use,
      so the busiest workloads are exactly the ones it serves fastest.
    </>
  ),
  weakness: (
    <>
      <strong>It only ever says yes-together or not-yet.</strong> No splits,
      no undo, no path recovery: it knows two elements share a component but
      not the route between them. Deletions or edge removals demand different
      machinery entirely (link-cut or Euler-tour trees), and the amortized
      guarantee says nothing about any single find, which can still be slow
      once.
    </>
  ),

  problem: 'Disjoint-set connectivity',
  problemSlug: 'disjoint-sets',
  rivals: [
    {
      name: 'Union-find × rank + compression',
      isThisUnit: true,
      algoName: 'Union-find',
      cost: 'O(α(n)) amortized',
      wins: (
        <>
          <strong>25,825</strong> touches for 1,500 unions and 3,000 queries:
          every rival on the page costs between <strong>7× and 79×</strong>{' '}
          more for identical answers.
        </>
      ),
      costs: (
        <>
          Merges only: no split, no undo, no path recovery. The guarantee is
          amortized, not per-operation.
        </>
      ),
      when: 'A long online stream of merges and membership queries: Kruskal, components, percolation.',
    },
    {
      name: 'Quick-union (naive linking)',
      algoName: 'Quick-union',
      cost: 'O(n) per op worst case',
      wins: (
        <>
          The simplest possible code, and on random merge orders it stays
          within sight: <strong>189,204</strong> touches, about 7× the
          pairing.
        </>
      ),
      costs: (
        <>
          Adversarial order is fatal: chain the unions in sorted order and a
          single find costs <strong>1,500</strong> touches where the pairing
          pays <strong>1</strong>.
        </>
      ),
      when: 'Throwaway scripts on tiny universes where you control the merge order.',
    },
    {
      name: 'Quick-find (eager relabeling)',
      algoName: 'Quick-find',
      cost: 'O(1) find, O(n) union',
      wins: (
        <>
          Queries are two array reads, unbeatable, and the state is trivially
          readable: element i&apos;s set id is just id[i].
        </>
      ),
      costs: (
        <>
          Every effective union relabels the whole array:{' '}
          <strong>2,031,171</strong> touches on the shared stream, 79× the
          pairing and the worst row on the board.
        </>
      ),
      when: 'Almost never merges, queries dominate by orders of magnitude, and n is small.',
    },
    {
      name: 'BFS per query',
      algoName: 'Breadth-first search',
      cost: 'O(V + E) per query',
      wins: (
        <>
          No structure to maintain at all, and it is the only row that can
          hand back the <strong>actual path</strong>, not just yes or no.
        </>
      ),
      costs: (
        <>
          Pays for the whole neighborhood on every question:{' '}
          <strong>1,507,712</strong> touches here, 58× the pairing, and it
          grows with every edge added.
        </>
      ),
      when: 'A handful of queries on a static graph, or when you need the route itself.',
    },
  ],
  neverUse: {
    name: 'A transitive-closure matrix, maintained per union',
    why: (
      <>
        Keeping an n × n reachability matrix current means touching up to{' '}
        <strong>2.25 million</strong> cells after each of 1,500 unions:
        roughly <strong>3.4 billion</strong> touches by arithmetic, against
        the forest&apos;s measured 25,825, about{' '}
        <strong>130,000 times more work</strong>, plus memory that grows with
        n² while the forest carries one integer per element. Closure matrices
        earn their keep answering reachability in <em>directed</em> graphs,
        where union-find cannot go; for undirected merges they are pure
        overkill.
      </>
    ),
  },

  contest: {
    instance:
      'a 1,500-element universe; 1,500 random unions, each followed by two connectivity queries; work is array touches (parent reads and writes, id reads and relabels, edges examined), the same unit for every method',
    columns: ['work', 'answer'],
    rows: [
      {
        method: 'Union-find × rank + compression',
        isThisUnit: true,
        values: ['25,825', 'correct'],
        best: 0,
        verdict: 'the forest that flattens itself through use',
      },
      {
        method: 'Quick-union (naive linking)',
        values: ['189,204', 'correct'],
        verdict: '7× on random merges, 1,500-touch finds on sorted ones',
      },
      {
        method: 'Quick-find (eager relabeling)',
        values: ['2,031,171', 'correct'],
        verdict: 'constant-time queries bought with whole-array unions: 79×',
      },
      {
        method: 'BFS per query',
        values: ['1,507,712', 'correct'],
        verdict: 'no structure, 58× the work, but it knows the actual path',
      },
    ],
    source:
      'python solutions/unionfind_rank_compression.py prints this table and asserts all four methods agree on every query. The chain demo it also prints: after 1,499 sorted unions, one find costs 1,500 touches naive against 1 with rank and compression.',
  },

  figure: (
    <Figure
      id="fig-unionfind-flatten"
      aspect="16 / 8"
      caption="What each heuristic is for. Quick-find pays the full array on every effective union, a flat wall at n. Naive linking is cheap until merge order turns the forest into a chain, where one find walks all 1,500 parents. Rank caps the height at log n, and compression flattens every path a query walks, so the pairing's cost sits on the floor: amortized inverse Ackermann, at most 3 hops at this size."
      cite={{
        text: 'Galler and Fischer, "An Improved Equivalence Algorithm", CACM 7, 1964. The inverse-Ackermann bound is Tarjan, JACM 22, 1975; Fredman and Saks proved it optimal in 1989.',
        href: 'https://doi.org/10.1145/321879.321884',
      }}
    >
      <svg viewBox="0 0 640 320" role="img" aria-label="Touches per operation: quick-find flat at n, naive linking rising to n under sorted merges, rank plus compression flat near zero">
        <line x1="64" y1="262" x2="612" y2="262" stroke="#232c40" strokeWidth="1.5" />
        <line x1="64" y1="34" x2="64" y2="262" stroke="#232c40" strokeWidth="1.5" />
        <text x="64" y="24" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="12">touches per operation</text>
        <text x="392" y="296" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="12">operations on 1,500 elements  →</text>
        <line x1="64" y1="66" x2="612" y2="66" stroke="#9aa5bd" strokeWidth="2.5" strokeDasharray="6 5" />
        <text x="72" y="56" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="12">quick-find union · n touches, every time</text>
        <path d="M64 252 C 250 236, 430 160, 612 84" fill="none" stroke="#f0b94b" strokeWidth="2.5" />
        <text x="330" y="176" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="12">naive linking · sorted merges</text>
        <text x="330" y="192" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">one find walks 1,500 parents</text>
        <path d="M64 250 C 200 246, 420 247, 612 248" fill="none" stroke="#5da2ff" strokeWidth="2.5" />
        <text x="380" y="236" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="12">rank + compression</text>
        <line x1="560" y1="248" x2="560" y2="216" stroke="#62d98a" strokeWidth="1.4" strokeDasharray="4 4" />
        <text x="452" y="210" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="12">α(1,500) = 3 hops</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'unionfind_rank_compression.py',
  Viz: UnionFindViz,
  narration,
};
