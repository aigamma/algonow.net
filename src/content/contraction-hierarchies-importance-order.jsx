import ContractionViz from '../viz/ContractionViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/contraction_hierarchies_importance_order.py?raw';
import { narration } from './contraction-hierarchies-importance-order.narration.js';

export const content = {
  given:
    'A road network with thousands of nodes and a stream of point-to-point queries from a navigation app. Dijkstra settles most of the map every time; the map never changes; preprocessing is allowed once.',
  task: 'Contract the nodes one by one: to remove a node, add a shortcut between any two of its neighbors whose only shortest path ran through it. Rank nodes by contraction time. Answer a query by climbing the ranks from both ends and meeting at the top.',
  constraint:
    'Every one of 200 random queries returns the exact Dijkstra distance under all three contraction orders, and every unpacked path walks only original edges and re-sums to that distance. The heuristic is priced: importance order needs 2,883 shortcuts for 2,857 edges and settles 76 nodes per query; random order needs 10,427 shortcuts and settles 210; importance order without the witness search needs 29,135. Dijkstra settles 837, bidirectional Dijkstra 528.',

  origins: (
    <p>
      Robert Geisberger, Peter Sanders, Dominik Schultes, and Daniel
      Delling, <strong>2008</strong>, at Karlsruhe (Contraction
      Hierarchies: Faster and Simpler Hierarchical Routing in Road
      Networks, WEA 2008): the distillation of a decade of
      speedup-technique research (highway hierarchies, reach, transit
      nodes) into one idea simple enough to implement in a weekend
      and fast enough to answer continental queries in
      microseconds. The insight is that a road network has a
      natural hierarchy (driveways below streets below highways),
      that a good contraction order recovers it automatically, and
      that once every node has a rank, a shortest path climbs and
      then descends, so a bidirectional search that only ever climbs
      explores almost nothing. OSRM, GraphHopper, and most routing
      engines you have used since run a descendant of it.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>contraction and the climbing query</strong>.
      Contracting node v: for each pair of remaining neighbors u, w,
      run a small witness search for a u-w path avoiding v no longer
      than d(u,v) + d(v,w); if none exists, add the shortcut u-w
      with that length and remember v for unpacking. Every node gets
      a rank; the upward graph keeps only edges to higher-ranked
      nodes. A query runs Dijkstra upward from the source and upward
      from the target and takes the best meeting node, then unpacks
      shortcuts recursively. Refereed on 200 random queries against
      plain Dijkstra: <strong>200/200 exact distances</strong> under
      all three orders, and every unpacked path walks original edges
      and re-sums to the distance.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>order</strong>. Contract cheap nodes
      first, where cheap is estimated by the edge difference
      (shortcuts a contraction would add minus edges it removes) plus
      the number of already-contracted neighbors, recomputed lazily
      when a node reaches the top of the queue. The order decides
      everything measured here: importance order added{' '}
      <strong>2,883 shortcuts</strong> for 2,857 edges (1.01×) and
      settles 76 nodes per query; a random order added 10,427 (3.6×)
      and settles 210. The witness search is the order&apos;s
      partner: importance order without it adds 29,135 shortcuts
      (10.1×), a hierarchy buried under edges that were never
      needed.
    </p>
  ),

  picture: (
    <p>
      Folding a paper map so that only the highways stay on top. Each
      fold hides one town: before hiding it, the cartographer checks
      every pair of roads that met there and, if that town was the
      only quick way between two of its neighbors, draws a direct
      line between them with the town&apos;s travel time written on
      it. Hide the dead-end hamlets first, because folding them
      costs almost nothing and reveals nothing; hide the interstate
      interchanges last, because everything routes through them. A
      traveler asking for a route climbs: from the origin, take
      roads only toward more important places; from the destination,
      the same, backwards; where the two climbs meet is on the
      highway, and the route is read off by unfolding the shortcut
      lines back into the towns they hid. The whole map is never
      unfolded again.
    </p>
  ),

  steps: [
    <>
      <strong>Priority:</strong> edge difference + contracted
      neighbors for every node, in a heap, updated lazily.
    </>,
    <>
      <strong>Contract the cheapest:</strong> for each neighbor pair,
      a bounded witness search; shortcut only where the node was the
      only way through.
    </>,
    <>
      <strong>Rank and keep the upward edges:</strong> the node
      leaves the working graph; its edges to survivors point up.
    </>,
    <>
      <strong>Query:</strong> Dijkstra upward from the source and
      from the target; the best meeting node gives the distance.
    </>,
    <>
      <strong>Unpack:</strong> replace each shortcut by its two
      halves, recursively: 200/200 paths on original edges.
    </>,
  ],

  signals: [
    <>
      <strong>Many queries, one static graph:</strong> maps, transit,
      any network where the 352,120 witness settles of preprocessing
      are paid once and 76 per query is paid forever.
    </>,
    <>
      <strong>A natural hierarchy:</strong> road networks route
      through few important nodes, so shortcuts stay near the edge
      count (1.01×); random graphs do not.
    </>,
    <>
      <strong>Exactness required:</strong> unlike landmark A* with
      loose bounds or heuristics that trade accuracy, every answer
      here is the true distance.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>bidirectional Dijkstra</strong>:
      search from both ends and stop when the frontiers cross. No
      preprocessing, exact, and it halved the work here (528 settled
      against 837), which is the whole win without a hierarchy. The
      hierarchy settles 76: 14.4% of that, because climbing only
      toward higher ranks discards the neighborhoods both plain
      searches must wade through.
    </>
  ),

  strength: (
    <>
      <strong>Exact answers at a small fraction of the work, from an
      order the graph reveals itself.</strong> 200/200 exact
      distances and valid unpacked paths; 76 settled nodes per query
      against 837 (9.1%); shortcuts within 1% of the edge count;
      preprocessing that is itself just small Dijkstra runs, with no
      geometry, no landmarks, and no parameter beyond the priority
      weights.
    </>
  ),
  weakness: (
    <>
      <strong>Static, order-sensitive, and only as good as its
      witness searches.</strong> A changed edge weight (traffic)
      invalidates shortcuts above it; customizable variants exist
      for exactly that reason. The order is a heuristic with real
      teeth: random order tripled the shortcuts and query work, and
      skipping the witness search made the hierarchy ten times
      heavier. Graphs without a hierarchy (grids with uniform
      weights, dense social graphs) contract badly, and the
      preprocessing cost (352,120 witness settles here for 1,600
      nodes) is paid before the first query is answered.
    </>
  ),

  problem: 'Road-network routing',
  problemSlug: 'road-routing',
  rivals: [
    {
      name: 'Contraction hierarchies × importance order',
      isThisUnit: true,
      algoName: 'Contraction hierarchies',
      cost: 'preprocess once, climb per query',
      wins: (
        <>
          <strong>76 settled per query</strong> against 837, exact
          200/200, shortcuts at 1.01× the edges: the order does the
          work.
        </>
      ),
      costs: (
        <>
          Static graph, preprocessing paid up front, and a heuristic
          order whose failure modes are measured (3.6× and 10.1×).
        </>
      ),
      when: 'Navigation-scale routing on a fixed network with many queries.',
    },
    {
      name: 'Bidirectional Dijkstra',
      cost: 'no preprocessing',
      wins: (
        <>
          Exact, zero setup, and it halves the plain search: 528
          settled against 837 here, with weights that can change
          between queries.
        </>
      ),
      costs: (
        <>
          Still explores both neighborhoods in full: 7× the
          hierarchy&apos;s query work.
        </>
      ),
      when: 'Graphs that change often, or too few queries to amortize a preprocessing pass.',
    },
    {
      name: 'A* search',
      cost: 'landmark bounds',
      wins: (
        <>
          The ALT variant: precompute distances to a few landmarks
          and use triangle-inequality lower bounds to steer; exact,
          goal-directed, and tolerant of some weight changes.
        </>
      ),
      costs: (
        <>
          Bounds are loose on road networks compared to a hierarchy,
          and landmark selection is its own art.
        </>
      ),
      when: 'Dynamic weights with a static topology, or as the goal-directed half of a combined technique.',
    },
    {
      name: 'Hub labeling',
      cost: 'labels per node',
      wins: (
        <>
          Precompute, for every node, a label of hub distances such
          that any two labels share a hub on the shortest path: a
          query is a merge of two sorted lists, microseconds
          without a graph search.
        </>
      ),
      costs: (
        <>
          Labels cost gigabytes on continental graphs and are built
          from a contraction hierarchy in the first place.
        </>
      ),
      when: 'Distance-only queries at extreme rates, when memory is cheap and the graph is fixed.',
    },
  ],
  neverUse: {
    name: 'All-pairs distances by Floyd-Warshall for a road network',
    why: (
      <>
        The tempting shortcut: precompute every distance once, then
        every query is a lookup. Floyd-Warshall is a live unit here
        and it runs in n³: for this page&apos;s 1,600-node grid that
        is 4.1 billion relaxations for a 2.56-million-entry table,
        already a hundred times the hierarchy&apos;s 352,120 witness
        settles. A continental network has about 20 million nodes:{' '}
        <strong>8 × 10²¹ relaxations and a 400-trillion-entry
        table</strong>. The hierarchy stores 1.01× the edge count and
        answers in 76 settles because it precomputes structure, not
        answers. When the graph is large and the queries are sparse
        in the space of all pairs, the table is not slow, it is
        unbuildable.
      </>
    ),
  },

  contest: {
    instance:
      'point-to-point shortest paths on a 40 × 40 grid road network (1,600 nodes, 2,857 edges, random weights 1 to 20, 18% of edges removed), 200 random queries; currency: nodes settled per query; every answer checked against plain Dijkstra and every path unpacked and re-summed',
    columns: ['settled per query', 'shortcuts', 'witness settles'],
    rows: [
      {
        method: 'Dijkstra',
        values: ['837', '-', '-'],
        verdict: 'the reference: exact, and most of the map every time',
      },
      {
        method: 'Bidirectional Dijkstra',
        values: ['528', '-', '-'],
        verdict: 'meet in the middle: the win without a hierarchy',
      },
      {
        method: 'Contraction hierarchy, importance order',
        isThisUnit: true,
        values: ['76', '2,883', '352,120'],
        best: 0,
        verdict: '9.1% of Dijkstra’s work, shortcuts at 1.01× the edges',
      },
      {
        method: 'Contraction hierarchy, random order',
        values: ['210', '10,427', '2,717,075'],
        verdict: 'the order removed: 3.6× the shortcuts, 2.8× the query work',
      },
      {
        method: 'Importance order, no witness search',
        values: ['127', '29,135', '0'],
        verdict: 'every neighbor pair shortcut: 10.1× the edges, a hierarchy buried in itself',
      },
    ],
    source:
      'python solutions/contraction_hierarchies_importance_order.py prints this table and asserts: 200/200 hierarchy distances equal to Dijkstra under all three orders; every unpacked path walks original edges and sums to the distance; importance order settles under 5% of the graph and under a quarter of bidirectional Dijkstra; shortcuts under 1.5× the edges; and both ablations needing more than 1.6× the shortcuts.',
  },

  figure: (
    <Figure
      id="fig-contraction-hierarchy"
      aspect="16 / 7"
      caption="Contract a node, keep a shortcut only where it was the only way through, and rank nodes by contraction time; then a query climbs from both ends. Cheap nodes (few neighbors, dead ends) go first and reveal nothing; interchanges go last and carry the shortcuts. Measured on 1,600 nodes and 200 queries: importance order settles 76 nodes per query against Dijkstra’s 837 with 2,883 shortcuts for 2,857 edges; random order 210 settled and 10,427 shortcuts; no witness search 29,135 shortcuts. Every answer exact, every path unpacked onto original edges."
      cite={{
        text: 'R. Geisberger, P. Sanders, D. Schultes, D. Delling, "Contraction Hierarchies: Faster and Simpler Hierarchical Routing in Road Networks," WEA 2008, LNCS 5038. DOI 10.1007/978-3-540-68552-4_24.',
        href: 'https://doi.org/10.1007/978-3-540-68552-4_24',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="A node being contracted with a shortcut added between two neighbors, and a bidirectional query climbing ranks from both ends to meet at the top">
        <text x="30" y="26" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">contracting v: u–v–w was the only shortest u–w route, so a shortcut u–w (weight 5 + 4) survives v</text>
        {[[60, 110, 'u'], [150, 70, 'v'], [240, 110, 'w'], [150, 160, 'x']].map(([x, y, l], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="11" fill={l === 'v' ? 'rgba(154,165,189,0.2)' : 'rgba(93,162,255,0.15)'} stroke={l === 'v' ? '#9aa5bd' : '#5da2ff'} strokeWidth="1.5" strokeDasharray={l === 'v' ? '3 3' : ''} />
            <text x={x - 4} y={y + 4} fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="11">{l}</text>
          </g>
        ))}
        <line x1="60" y1="110" x2="150" y2="70" stroke="#9aa5bd" strokeWidth="1.3" strokeDasharray="3 3" />
        <line x1="150" y1="70" x2="240" y2="110" stroke="#9aa5bd" strokeWidth="1.3" strokeDasharray="3 3" />
        <line x1="60" y1="110" x2="150" y2="160" stroke="#5da2ff" strokeWidth="1.3" />
        <line x1="150" y1="160" x2="240" y2="110" stroke="#5da2ff" strokeWidth="1.3" />
        <path d="M 60 110 Q 150 40 240 110" fill="none" stroke="#f0b94b" strokeWidth="2" strokeDasharray="6 4" />
        <text x="100" y="50" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="10">shortcut 9 (via v)</text>
        <text x="60" y="186" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">u–x–w costs 6 + 6 = 12 &gt; 9: no witness, so the shortcut is needed</text>
        <text x="330" y="60" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">query: climb ranks from s (blue) and from t (amber), meet at the top</text>
        {[[350, 190, '#5da2ff'], [390, 160, '#5da2ff'], [430, 120, '#5da2ff'], [470, 90, '#62d98a'], [510, 120, '#f0b94b'], [550, 160, '#f0b94b'], [590, 190, '#f0b94b']].map(([x, y, c], i) => (
          <circle key={i} cx={x} cy={y} r="6" fill={c} />
        ))}
        <path d="M 350 190 L 390 160 L 430 120 L 470 90 L 510 120 L 550 160 L 590 190" fill="none" stroke="#62d98a" strokeWidth="1.6" />
        <text x="340" y="215" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">s → up → up → meet ← up ← up ← t   (then unpack every shortcut)</text>
        <text x="30" y="246" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">measured: 76 settled per query vs Dijkstra 837 and bidirectional 528 · 2,883 shortcuts for 2,857 edges · 200/200 exact</text>
        <text x="30" y="268" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">random order: 210 settled, 10,427 shortcuts · no witness search: 29,135 shortcuts</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'contraction_hierarchies_importance_order.py',
  Viz: ContractionViz,
  narration,
};
