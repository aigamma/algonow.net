import KruskalViz from '../viz/KruskalViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/kruskal_union_find.py?raw';
import { narration } from './kruskal-union-find.narration.js';

export const content = {
  given:
    'A weighted graph: vertices, edges, and a cost on every edge.',
  task: 'Choose edges of minimum total weight that connect everything: the minimum spanning tree, exactly, with a certificate.',
  constraint:
    'The question "are these two endpoints already connected?" will be asked once per edge. Its price is the whole game: answered well it is nearly free, answered naively it is a graph search per edge, measured 34× below.',

  origins: (
    <p>
      The problem is older than computer science and started as
      infrastructure: Otakar Borůvka published the first MST algorithm in{' '}
      <strong>1926</strong>, in Czech, to design the electrification of
      Moravia. Joseph Kruskal, a 25-year-old at Princeton, found
      Borůvka&apos;s paper &quot;obscure&quot; and answered it in{' '}
      <strong>1956</strong> with the lightest-edge-first greedy; Robert Prim
      (Bell Labs, 1957) gave the grow-one-tree alternative, unaware Vojtěch
      Jarník had it in 1930. The missing half of Kruskal&apos;s pairing
      arrived decades later: union-find with rank and path compression, whose
      near-constant amortized bound Tarjan proved in 1975, and which this
      site teaches live as <a href="/unionfind-rank-compression/">puzzle
      08</a>.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>greedy and its proof</strong>. Scan edges lightest
      first; take any edge whose endpoints are in different components. The{' '}
      <strong>cut property</strong> makes every such take safe: the lightest
      edge crossing any cut belongs to the MST, because swapping it into a
      tree that omits it strictly improves the tree. With distinct weights
      the answer is unique, which is why the tested solution can demand all
      four rivals return the <strong>identical edge set</strong>, not merely
      an equal total.
    </p>
  ),
  heurRole: (
    <p>
      Answers the E-times question: <strong>already connected?</strong>{' '}
      Union-find with rank and path compression (the exact structure of{' '}
      <a href="/unionfind-rank-compression/">puzzle 08</a>) merges and
      queries components in amortized near-constant time: measured here at{' '}
      <strong>0.93 parent-jumps per find</strong> across all 8,000 edges,
      the flat forest keeping its promise. Answer the same question by
      searching the forest instead and the greedy drowns:{' '}
      <strong>3,998,220</strong> operations against 115,881, a 34× penalty
      that grows with n.
    </p>
  ),

  picture: (
    <p>
      Wiring villages for power on a budget. Sort every possible cable by
      cost, cheapest first, and walk the list with one rule: lay the cable
      only if its two villages are not already on the same grid. The rule
      needs an instant answer to &quot;same grid?&quot;, and that is the
      heuristic&apos;s whole job: each village holds a deed pointing toward
      its grid&apos;s headquarters, and the deed-chase flattens itself with
      every query. Lay n − 1 cables and stop: no cheaper network can exist,
      because any cable you skipped was the most expensive one on the loop
      it would have closed.
    </p>
  ),

  steps: [
    <>
      <strong>Sort</strong> the edges by weight, cheapest first. This is
      the dominant cost (charged honestly at E log₂ E in the contest).
    </>,
    <>
      <strong>Scan:</strong> for each edge (u, v), ask union-find whether u
      and v share a root.
    </>,
    <>
      <strong>Take or skip:</strong> different roots: take the edge, union
      the components. Same root: the edge closes a cycle, and by scan order
      it is the heaviest thing on it: skip forever.
    </>,
    <>
      <strong>Stop at n − 1 edges</strong>, or at list&apos;s end: a
      disconnected graph simply yields its minimum spanning forest, no
      special case.
    </>,
    <>
      <strong>Certify:</strong> the cycle property (every non-tree edge is
      the strict maximum on the cycle it closes) is checked for 500 sampled
      edges in the tested solution.
    </>,
  ],

  signals: [
    <>
      Edges come as a <strong>list</strong>, or already sorted: with the
      sort pre-paid, Kruskal&apos;s remaining work here is ~11,900
      operations, the cheapest on the bench.
    </>,
    <>
      The graph may be <strong>disconnected</strong>: the forest falls out
      free, no special casing.
    </>,
    <>
      You are already carrying <strong>union-find</strong> (incremental
      connectivity, clustering): Kruskal is that structure&apos;s home
      game. Cutting the sorted-edge process early also makes it
      single-linkage clustering, exactly.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the same greedy with the heuristic removed:
      answer &quot;already connected?&quot; by breadth-first search over
      the forest built so far. Identical tree, <strong>3,998,220</strong>{' '}
      operations against <strong>115,881</strong>, and the multiple grows
      with n. The greedy was never the cost. The question was.
    </>
  ),

  strength: (
    <>
      <strong>Simple, certified, and edge-list-native.</strong> One sort,
      one scan, amortized-constant connectivity (0.93 jumps per find,
      measured), a free forest on disconnected input, uniqueness under
      distinct weights, and the cycle-property certificate checkable after
      the fact. Pre-sorted edges make it near-linear outright.
    </>
  ),
  weakness: (
    <>
      <strong>The sort is the bill, and adjacency has a better buyer.</strong>{' '}
      On the dense instance the E log E charge is 2.0M of Kruskal&apos;s
      2.04M total, while Prim&apos;s heap, growing one tree over an
      adjacency structure, posts <strong>480,001</strong>: four times less.
      When the graph arrives as adjacency and is dense, grow a tree; when
      it arrives as an edge list, sort one.
    </>
  ),

  problem: 'Minimum spanning tree',
  problemSlug: 'minimum-spanning-tree',
  rivals: [
    {
      name: 'Kruskal × union-find',
      isThisUnit: true,
      algoName: "Kruskal's algorithm",
      cost: 'O(E log E) sort + E·α',
      wins: (
        <>
          The connectivity question at <strong>0.93 jumps per find</strong>;
          with edges pre-sorted, ~11,900 operations beats the whole bench.
          Forest on disconnection, free.
        </>
      ),
      costs: (
        <>
          The sort dominates everything: 2.0M of its 2.04M dense-column
          total is E log E.
        </>
      ),
      when: 'Edge lists, pre-sorted or offline edges, disconnected graphs, and anywhere union-find already lives.',
    },
    {
      name: "Prim's algorithm",
      cost: 'O(E log V) with a heap',
      wins: (
        <>
          The smallest raw numbers on both columns here (<strong>32,001 /
          480,001</strong>): growing one tree over adjacency never pays a
          global sort.
        </>
      ),
      costs: (
        <>
          Needs adjacency and a connected start; no forest semantics; the
          heap carries the same lazy-deletion machinery as Dijkstra&apos;s.
        </>
      ),
      when: 'Dense graphs held as adjacency: the default in that shape, and Dijkstra’s twin to implement.',
    },
    {
      name: "Borůvka's algorithm",
      cost: 'O(E log V), in rounds',
      wins: (
        <>
          Every component grabs its lightest exit <strong>simultaneously</strong>:
          components at least halve per round (11 rounds here), which is
          why parallel and GPU MST codes are Borůvka-shaped a century on.
        </>
      ),
      costs: (
        <>
          Full edge sweeps per round (102,487 / 1,126,476 measured), and
          the bookkeeping is the fiddliest of the three classics.
        </>
      ),
      when: 'Parallel settings, and as the outer loop of the fancy linear-expected-time MST algorithms.',
    },
    {
      name: 'Reverse-delete algorithm',
      cost: 'O(E log V · checks)',
      wins: (
        <>
          The greedy&apos;s mirror: delete heaviest edges whose removal
          keeps the graph connected. Same tree, by the cycle property run
          backward: conceptually completing.
        </>
      ),
      costs: (
        <>
          Every deletion needs a connectivity check, and dynamic
          connectivity under deletions is a famously harder problem than
          under unions.
        </>
      ),
      when: 'Almost never in practice; on this bench as the proof that the two MST properties are one coin.',
    },
  ],
  neverUse: {
    name: 'The MST, as a routing table',
    why: (
      <>
        The tree that connects cheapest does not route shortest: over 100
        random pairs on this very instance, the MST path is up to{' '}
        <strong>15.2× longer</strong> than the true shortest path. Total
        edge cost and pairwise distance are different objectives, and one
        tree cannot serve both (that tension has its own research field,
        spanners). Connect with this unit; route with{' '}
        <a href="/dijkstra-binary-heap/">puzzle 07</a>.
      </>
    ),
  },

  contest: {
    instance:
      'n = 1,200 vertices with distinct edge weights (so the MST is unique and all methods must return the identical edge set); work = element touches, with Kruskal rows charged E log₂ E for their sort; two densities',
    columns: ['sparse, E = 8,000', 'dense, E = 120,000'],
    rows: [
      {
        method: 'Kruskal × union-find',
        isThisUnit: true,
        values: ['115,881', '2,040,086'],
        verdict: 'the sort is 90% of the bill; the connectivity answers are nearly free',
      },
      {
        method: 'Kruskal × BFS cycle test',
        values: ['3,998,220', 'not run'],
        verdict: 'the heuristic removed: 34×, and growing with n',
      },
      {
        method: 'Prim × binary heap',
        values: ['32,001', '480,001'],
        best: 1,
        verdict: 'adjacency in hand, no global sort: the raw-number winner',
      },
      {
        method: 'Borůvka rounds',
        values: ['102,487', '1,126,476'],
        verdict: 'eleven halving rounds: the shape that parallelizes',
      },
    ],
    source:
      'python solutions/kruskal_union_find.py prints this table and asserts all four methods return the identical unique MST edge set, the tree spans acyclically, the cycle property holds on 500 sampled non-tree edges (the certificate of minimality), union-find averages 0.93 parent-jumps per find, a disconnected graph yields the correct two-component forest, and the worst MST detour over 100 pairs is 15.2× the true shortest path.',
  },

  figure: (
    <Figure
      id="fig-kruskal-cut"
      aspect="16 / 7"
      caption="The cut property, the one-sentence proof behind the greedy. Slice the vertices into two sides any way you like: the lightest edge crossing the slice belongs to every minimum spanning tree, because a tree omitting it must cross the slice somewhere heavier, and swapping the two strictly improves it. Kruskal's scan order makes every accepted edge the lightest crossing of the cut between the components it joins, so every acceptance is this argument, applied."
      cite={{
        text: 'Kruskal, "On the Shortest Spanning Subtree of a Graph and the Traveling Salesman Problem", Proceedings of the AMS 7, 1956, written in answer to Borůvka’s 1926 electrification paper. The union-find analysis is Tarjan, 1975.',
        href: 'https://doi.org/10.1090/S0002-9939-1956-0078686-7',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="A graph sliced by a dashed cut; the lightest crossing edge is highlighted as forced, a heavier crossing edge marked as the swap victim">
        <path d="M 320 20 C 280 100, 360 190, 310 274" fill="none" stroke="#f0b94b" strokeWidth="2" strokeDasharray="7 5" />
        {[[110, 70], [170, 160], [90, 226], [232, 96]].map(([x, y], i) => (
          <circle key={`l${i}`} cx={x} cy={y} r={9} fill="#232c40" stroke="#5da2ff" strokeWidth="1.4" />
        ))}
        {[[470, 60], [420, 150], [520, 200], [560, 110]].map(([x, y], i) => (
          <circle key={`r${i}`} cx={x} cy={y} r={9} fill="#232c40" stroke="#5da2ff" strokeWidth="1.4" />
        ))}
        {[[110, 70, 170, 160], [170, 160, 90, 226], [110, 70, 232, 96], [470, 60, 560, 110], [420, 150, 520, 200], [470, 60, 420, 150]].map(([a, b, c, d], i) => (
          <line key={`e${i}`} x1={a} y1={b} x2={c} y2={d} stroke="rgba(255,255,255,0.25)" strokeWidth="1.3" />
        ))}
        <line x1="232" y1="96" x2="420" y2="150" stroke="#62d98a" strokeWidth="2.6" />
        <text x="290" y="112" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="12">7 · lightest crossing: forced</text>
        <line x1="170" y1="160" x2="520" y2="200" stroke="#e06767" strokeWidth="1.6" strokeDasharray="3 3" />
        <text x="300" y="196" fill="#e06767" fontFamily="ui-monospace, monospace" fontSize="12">31 · any tree using this instead: swap and improve</text>
        <text x="30" y="272" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="12">every Kruskal acceptance is this picture, at the cut between the two components it joins</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'kruskal_union_find.py',
  Viz: KruskalViz,
  narration,
};
