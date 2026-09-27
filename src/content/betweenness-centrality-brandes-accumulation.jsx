import BrandesViz from '../viz/BrandesViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/betweenness_centrality_brandes_accumulation.py?raw';
import { narration } from './betweenness-centrality-brandes-accumulation.narration.js';

export const content = {
  given:
    'A network: 240 vertices and 720 edges at the largest, two dense communities joined by one edge at the most telling. For every vertex, the sum over all pairs of other vertices of the fraction of shortest paths between them that pass through it. The definition is cubic in the vertices if computed as written, and exponential if the paths are listed.',
  task: 'Brandes: from each source, one breadth-first search that counts the shortest paths σ to every vertex as it discovers them; then the accumulation, the vertices in reverse order of distance, each passing its dependency to its predecessors: δ(v) = Σ over successors w of (σ(v)/σ(w)) (1 + δ(w)). Every source costs O(V + E), and no path is ever listed.',
  constraint:
    'On random graphs Brandes agrees with the definition, computed independently from all-pairs distances and path counts, to 9 × 10⁻¹⁴, and exactly with the closed forms for a path, a star, a complete graph, and a cycle. Its operation count falls from 3.8× to 7.6× to 15.1× below the definition’s as n grows from 60 to 120 to 240. On a 10 × 10 grid the 48,620 shortest paths between opposite corners were enumerated one at a time to check the count that one breadth-first search produced in 360 edge visits. On two communities joined by a bridge, the bridge endpoints top betweenness by 10.7× while degree centrality ranks them third behind the community hubs.',

  origins: (
    <p>
      Linton Freeman defined betweenness centrality in{' '}
      <strong>1977</strong> (Sociometry), formalizing an idea from
      Bavelas and Anthonisse: the vertices that sit between others
      control what flows between them. For twenty-four years it was
      computed from the definition, cubic in the vertices and unusable
      past a few thousand, until Ulrik Brandes (2001, Journal of
      Mathematical Sociology) noticed that the dependencies of one
      source on all targets could be accumulated in a single pass back
      over the breadth-first search tree: O(VE) for unweighted graphs,
      O(VE + V² log V) weighted. Girvan and Newman (2002) built
      community detection on the edge version (remove the highest
      betweenness edge, repeat); Bader, Kintali, Madduri, and Mihail
      (2007) and Riondato and Kornaropoulos (2016) gave sampling
      approximations for graphs with millions of vertices. Every
      network library computes betweenness Brandes&apos;s way.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>path counting</strong>: a breadth-first search
      from s that records, for every vertex w, its distance and the
      number of shortest paths σ<sub>sw</sub> = Σ over predecessors v of
      σ<sub>sv</sub>, so that counts multiply along the search tree
      instead of being enumerated. Measured: on the 10 × 10 grid the
      corner-to-corner count is 48,620 = C(18, 9); a recursive walker
      listed every one of those paths to check it, and one search
      produced the number in <strong>360 edge visits</strong>. Against
      the definition, which needs all-pairs distances and a triple
      test for every (s, v, t), Brandes agrees to 9 × 10⁻¹⁴ on
      random graphs and exactly on the closed forms: a path (vertex i
      on i(n − 1 − i) pairs), a star, a complete graph, a cycle.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>accumulation</strong>: instead of asking, for
      each target t, which vertices lie on s-t shortest paths, walk the
      vertices back in decreasing distance and let each hand its
      dependency to its predecessors, δ(v) += (σ<sub>v</sub>/σ<sub>w</sub>)(1 + δ(w)).
      The sum over targets is never formed; it falls out of the
      recurrence. Counted against the definition&apos;s triple test:{' '}
      <strong>28,298 vs 106,200</strong> operations at n = 60, 112,988 vs
      856,800 at 120, 455,625 vs 6,883,200 at 240, the ratio doubling
      with n because one side is O(VE) and the other O(V³). The
      measure it computes is the one degree cannot see: on two
      communities joined by one edge, the bridge endpoints have 10.7×
      the betweenness of any other vertex while degree centrality
      puts them third behind the two hubs.
    </p>
  ),

  picture: (
    <p>
      Counting how much of a city&apos;s traffic passes through each
      intersection, if every driver takes a shortest route. The naive
      count follows every driver from every origin to every
      destination, one route at a time, and there are routes enough to
      outlast the city. Brandes&apos;s clerk instead stands at one origin,
      floods outward marking each intersection with its distance and
      the number of shortest routes that reach it (a number, not a
      list), and then works backward from the farthest intersections:
      each one reports how much traffic it and everything beyond it
      owe to each of the intersections that feed it, in proportion to
      the route counts. One flood out and one report back per origin,
      and every intersection has its share of every route from that
      origin without a single route having been walked.
    </p>
  ),

  steps: [
    <>
      <strong>BFS from s:</strong> dist, σ (paths), preds; push
      vertices onto a stack in discovery order.
    </>,
    <>
      <strong>σ multiplies:</strong> σ<sub>w</sub> += σ<sub>v</sub> for
      each edge (v, w) with dist<sub>w</sub> = dist<sub>v</sub> + 1.
    </>,
    <>
      <strong>Accumulate:</strong> pop w; for each predecessor v:
      δ<sub>v</sub> += (σ<sub>v</sub>/σ<sub>w</sub>)(1 + δ<sub>w</sub>).
    </>,
    <>
      <strong>Add:</strong> C<sub>B</sub>(w) += δ<sub>w</sub> for w ≠ s;
      repeat for every source; halve for undirected graphs.
    </>,
    <>
      <strong>Check:</strong> the definition to 9 × 10⁻¹⁴, four
      closed forms exactly, 48,620 grid paths counted from one search.
    </>,
  ],

  signals: [
    <>
      <strong>Brokers, bridges, and bottlenecks:</strong> who or what
      the flow depends on, as opposed to who has the most connections.
    </>,
    <>
      <strong>Exact scores on a graph you can search from every
      vertex:</strong> O(VE) is a few million edge visits at n = 240,
      and hours at a few million vertices.
    </>,
    <>
      <strong>Community structure to expose:</strong> the
      Girvan-Newman recipe removes the highest-betweenness edges first.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>the definition</strong>: all-pairs
      distances and path counts, then a triple test over (s, v, t). It
      gives the same numbers (to 9 × 10⁻¹⁴) and is the referee here;
      its cost is 6,883,200 operations at n = 240 against 455,625, and
      the gap doubles with every doubling of n.
    </>
  ),

  strength: (
    <>
      <strong>Exact betweenness at O(VE), with the paths counted, not
      listed.</strong> Agreement with the definition to 9 × 10⁻¹⁴ and
      with four closed forms exactly, 15× fewer operations than the
      definition at n = 240 and growing, and the bridge found at 10.7×
      where degree looks the other way.
    </>
  ),
  weakness: (
    <>
      <strong>O(VE) is still a search from every vertex.</strong> A
      million-vertex social graph is a million breadth-first searches;
      sampling a few hundred sources gives an approximation with error
      bars, and that is what production systems do. Betweenness assumes
      flow takes shortest paths only, which packets, rumors, and
      diseases do not; and it is fragile to one added edge, since a
      new shortcut reroutes every path it lies on.
    </>
  ),

  problem: 'Node importance',
  problemSlug: 'link-analysis',
  rivals: [
    {
      name: 'Betweenness centrality × Brandes accumulation',
      isThisUnit: true,
      algoName: 'Betweenness centrality',
      cost: 'O(VE): one BFS and one pass back per source',
      wins: (
        <>
          <strong>The bridge at 10.7×</strong>, exact to 9 × 10⁻¹⁴,
          15× cheaper than the definition at n = 240.
        </>
      ),
      costs: (
        <>
          A search from every vertex; shortest paths only; a new edge
          reroutes everything.
        </>
      ),
      when: 'Finding brokers and bottlenecks on a graph small enough to search from every vertex.',
    },
    {
      name: 'Degree centrality',
      cost: 'O(V + E)',
      wins: (
        <>
          Instant, local, and right when importance means popularity:
          the two hubs rank first.
        </>
      ),
      costs: (
        <>
          Blind to position: the bridge endpoints, with 10.7× the
          betweenness of anyone, rank third.
        </>
      ),
      when: 'Popularity or load, not brokerage; or as the first cut on a huge graph.',
    },
    {
      name: 'Closeness centrality',
      cost: 'one BFS per vertex, no accumulation',
      wins: (
        <>
          Who can reach everyone fastest: the inverse mean distance,
          from the same searches.
        </>
      ),
      costs: (
        <>
          Reach is not control: a well-connected hub scores high
          without sitting on anyone&apos;s path.
        </>
      ),
      when: 'Spreading speed, response time, or facility placement.',
    },
    {
      name: 'PageRank',
      cost: 'a power iteration over the edges',
      wins: (
        <>
          Importance by random walks rather than shortest paths, scaling
          to billions of edges by iteration.
        </>
      ),
      costs: (
        <>
          A damping parameter, a model of flow that wanders rather
          than routes, and no notion of a bridge.
        </>
      ),
      when: 'Web-scale graphs and flows that follow links rather than routes.',
    },
  ],
  neverUse: {
    name: 'Enumerating the shortest paths',
    why: (
      <>
        The definition invites it: for each pair, list the shortest
        paths and tally who is on them. Measured on a 10 × 10 grid,
        one pair of opposite corners has <strong>48,620 shortest
        paths</strong>, every one of them walked by the recursive
        enumerator to check the count; a 20 × 20 grid has 35 billion
        for one pair, and the number of pairs is quadratic on top. One
        breadth-first search produced the same 48,620 in 360 edge
        visits, because σ is a count that multiplies along the tree,
        not a list that grows with it. Betweenness is about how many
        paths, never about which.
      </>
    ),
  },

  contest: {
    instance:
      'random connected graphs with m = 3n edges; referee: the definition by all-pairs distances and path counts (a triple test per pair), plus closed forms and a path enumerator on the 10 × 10 grid',
    columns: ['Brandes operations', 'definition operations', 'ratio'],
    rows: [
      {
        method: 'n = 60, m = 180',
        values: ['28,298', '106,200', '3.8×'],
        verdict: 'agreement 9 × 10⁻¹⁴',
      },
      {
        method: 'n = 120, m = 360',
        values: ['112,988', '856,800', '7.6×'],
        verdict: 'the ratio doubles with n',
      },
      {
        method: 'n = 240, m = 720',
        isThisUnit: true,
        values: ['455,625', '6,883,200', '15.1×'],
        best: 0,
        verdict: 'O(VE) against O(V³)',
      },
      {
        method: '10 × 10 grid, one corner pair',
        values: ['360 edge visits (one BFS)', '48,620 paths enumerated', '135×'],
        verdict: 'σ counts what the enumerator lists',
      },
      {
        method: 'Two communities + one bridge',
        values: ['bridge endpoints first, 10.7×', 'degree: hubs first, bridge third', '-'],
        verdict: 'brokerage is not popularity',
      },
    ],
    source:
      'python solutions/betweenness_centrality_brandes_accumulation.py prints this table and asserts: Brandes within 10⁻⁹ of the definition on five random graphs of 40 vertices; the path, star, complete graph, and cycle closed forms exact; the definition-to-Brandes ratio growing 1.6 to 2.5× per doubling of n; the grid enumeration equal to C(18, 9) = 48,620 and to σ from one search; the bridge endpoints first by betweenness and the hubs first by degree.',
  },

  figure: (
    <Figure
      id="fig-brandes-accumulation"
      aspect="16 / 7"
      caption="One source, two passes. Left: the breadth-first search from s labels each vertex with its distance and σ, the number of shortest paths from s, which adds up along the tree (σ of a vertex is the sum of σ over its predecessors). Right: the accumulation walks the same tree backward, each vertex passing (σ(v)/σ(w))(1 + δ(w)) to each predecessor v, so δ at a vertex is its share of every shortest path from s that passes through it. Summed over sources: betweenness. Measured: 15.1× fewer operations than the definition at n = 240, and 48,620 grid paths counted from one search."
      cite={{
        text: 'U. Brandes, "A faster algorithm for betweenness centrality," Journal of Mathematical Sociology 25(2), 2001. DOI 10.1080/0022250X.2001.9990249. L. C. Freeman, "A set of measures of centrality based on betweenness," Sociometry 40(1), 1977.',
        href: 'https://doi.org/10.1080/0022250X.2001.9990249',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="A small breadth-first tree with distance and path-count labels on the left, and the same tree with dependency values flowing backward on the right">
        {[[0, 60, 140, 's', 'σ 1', 'δ 0'], [1, 160, 80, 'a', 'σ 1', 'δ 2.5'], [2, 160, 200, 'b', 'σ 1', 'δ 1.5'], [3, 260, 140, 'c', 'σ 2', 'δ 1'], [4, 260, 60, 'd', 'σ 1', 'δ 0'], [5, 360, 140, 'e', 'σ 2', 'δ 0']].map(([i, x, y, name, sig, del]) => (
          <g key={i}>
            <circle cx={x} cy={y} r="12" fill={i === 0 ? '#f0b94b' : '#5da2ff'} opacity="0.85" />
            <text x={x - 4} y={y + 4} fill="#0b1020" fontFamily="ui-monospace, monospace" fontSize="11" fontWeight="bold">{name}</text>
            <text x={x - 12} y={y - 18} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">{sig}</text>
            <text x={x - 14} y={y + 28} fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="10">{del}</text>
          </g>
        ))}
        {[[60, 140, 160, 80], [60, 140, 160, 200], [160, 80, 260, 140], [160, 200, 260, 140], [160, 80, 260, 60], [260, 140, 360, 140]].map(([a, b, c, d], i) => (
          <line key={i} x1={a} y1={b} x2={c} y2={d} stroke="rgba(154,165,189,0.6)" strokeWidth="1.5" />
        ))}
        <text x="40" y="250" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">σ(c) = σ(a) + σ(b) = 2: two shortest paths from s reach c, and both continue to e</text>
        <text x="40" y="266" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="10">δ(a) = (1/2)(1 + δ(c)) + (1/1)(1 + δ(d)) = 1 + 1 = 2.5 with δ(c) = 1: a’s share of the paths through it</text>
        <text x="420" y="60" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="11">measured</text>
        <text x="420" y="82" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="10">n = 240: 455,625 vs 6,883,200 ops (15.1×)</text>
        <text x="420" y="100" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">agreement with the definition: 9e-14</text>
        <text x="420" y="118" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">path, star, complete, cycle: exact</text>
        <text x="420" y="146" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="10">10 × 10 grid: 48,620 paths, one BFS</text>
        <text x="420" y="174" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="10">bridge endpoints: 10.7× anyone else</text>
        <text x="420" y="192" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">degree centrality ranks them third</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'betweenness_centrality_brandes_accumulation.py',
  Viz: BrandesViz,
  narration,
};
