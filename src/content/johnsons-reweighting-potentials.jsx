import JohnsonViz from '../viz/JohnsonViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/johnsons_reweighting_potentials.py?raw';
import { narration } from './johnsons-reweighting-potentials.narration.js';

export const content = {
  given:
    'A sparse directed graph with negative edges (rebates, discounts, exchange margins) and a question about every pair: the graph plain Dijkstra silently gets wrong and Floyd-Warshall answers at a flat n³.',
  task: 'Learn one potential per vertex with a single Bellman-Ford, lift every edge to w + h(u) - h(v): provably nonnegative: then run one cheap Dijkstra per source and subtract the potentials back out.',
  constraint:
    'The referee is Floyd-Warshall, exact: on 60 randomized negative-edge graphs and both contest instances, Johnson’s matrix equals it integer-for-integer, and so does a third method (n independent Bellman-Fords). The lift is audited on every edge; the sparse dividend is 48×; the dense gap honestly closes to 3.8×; and plain Dijkstra’s wrongness is counted: 31% of pairs.',

  origins: (
    <p>
      Donald B. Johnson, <strong>1977</strong>, in the Journal of
      the ACM: &quot;Efficient algorithms for shortest paths in
      sparse networks.&quot; The potential trick is older and
      deeper: Edmonds and Karp had used vertex potentials in 1972
      to keep min-cost flow&apos;s reduced costs nonnegative, and
      the mathematics is gravity&apos;s: measure effort relative
      to altitude and every loop nets to zero. Johnson&apos;s
      contribution was the orchestration: one Bellman-Ford from a
      virtual source turns out to compute the exact potential
      that makes <em>every</em> edge nonnegative whenever no
      negative cycle exists, unlocking a Dijkstra per source on a
      graph Dijkstra could never touch raw. The same reweighting
      idea runs through A*&apos;s consistent heuristics (a
      feasible potential by another name) and the landmark
      methods inside modern routing engines.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>three-movement orchestration</strong>: add
      a virtual source with a free edge to every vertex and run
      one Bellman-Ford to get h(v); lift every edge; run a
      textbook Dijkstra from each of the n sources on the lifted
      graph; then un-telescope: d(u,v) = d&apos;(u,v) - h(u) +
      h(v), exactly. The Bellman-Ford stage doubles as the
      tripwire: a planted negative 4-cycle was detected there
      (and independently on Floyd-Warshall&apos;s own diagonal).
      Referee&apos;d three ways: Johnson = Floyd-Warshall = n
      Bellman-Fords, integer-exact, unreachable pairs included.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>potential</strong>: one number per
      vertex that tilts the whole landscape. Along any path from
      u to v the interior potentials cancel in pairs, so every
      path&apos;s weight shifts by the same h(u) - h(v): the
      ranking of paths is untouched, only the zero level moves.
      Bellman-Ford&apos;s distances are precisely a feasible
      tilt: h(v) &le; h(u) + w forces w + h(u) - h(v) &ge; 0,{' '}
      <strong>audited here on every one of 10,800 contest edges
      and all 60 referee graphs</strong>. After the lift,
      Dijkstra&apos;s one assumption holds and its greed becomes
      safe.
    </p>
  ),

  picture: (
    <p>
      Hiking with an altimeter. Trail effort is misleading:
      downhill stretches feel like being paid to walk, and a
      route full of descents can look &quot;cheaper&quot; than it
      is. But net climb between two huts is fixed no matter which
      trail you take: altitude is a potential. So subtract
      altitude change from every stretch&apos;s effort and what
      remains is pure friction: never negative, honest about
      which trail is actually shorter, and safe for a greedy
      planner that always extends the cheapest frontier. That is
      the lift: Bellman-Ford surveys the terrain once and writes
      the altitude on every signpost; Dijkstra then plans n hikes
      on friction alone; and at the end you add the altitude
      difference back to report true effort. No path changed.
      Only the bookkeeping did.
    </p>
  ),

  steps: [
    <>
      <strong>Survey once:</strong> a virtual source with free
      edges to all, one Bellman-Ford: h(v) = its distance: the
      negative-cycle tripwire included.
    </>,
    <>
      <strong>Lift every edge:</strong> w&apos; = w + h(u) -
      h(v): proven and audited &ge; 0 on every edge of every
      graph this page touched.
    </>,
    <>
      <strong>Run Dijkstra n times:</strong> on the lifted graph
      its pop-and-finalize greed is valid: 165,430 relaxations
      total on the sparse instance.
    </>,
    <>
      <strong>Un-telescope:</strong> d(u,v) = d&apos;(u,v) - h(u)
      + h(v): recovered integer-exact against the referee.
    </>,
    <>
      <strong>Know when not to:</strong> on dense graphs the
      dividend shrinks to 3.8×: Floyd-Warshall&apos;s three bare
      loops earn their keep.
    </>,
  ],

  signals: [
    <>
      <strong>Negative edges, no negative cycles:</strong>{' '}
      rebates, arbitrage margins, energy recovered braking
      downhill: the domain where Dijkstra is wrong (31% of pairs
      here) rather than slow.
    </>,
    <>
      <strong>Sparse, and you need every pair:</strong> m near n:
      route matrices, distance oracles, betweenness
      preprocessing: 48× under the flat n³ at n = 200, and the
      gap widens with n.
    </>,
    <>
      <strong>One survey, many queries:</strong> the potentials
      are computed once and reused by all n Dijkstras: the same
      shape as A* heuristics and min-cost-flow reduced costs.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>Floyd-Warshall</strong>:
      three nested loops, no heap, no cleverness, n³ = 8,000,000
      relaxations at n = 200 regardless of density: and it is
      also this page&apos;s referee, agreeing with Johnson
      integer-for-integer everywhere. Sparse (m = 4n), Johnson
      pays 165,430: 48× less. Dense (m = n²/4), 2,112,200: only
      3.8× less, and the flat loops&apos; tiny constant makes the
      race closer than the count suggests.
    </>
  ),

  strength: (
    <>
      <strong>Negative edges at Dijkstra prices, exactly.</strong>{' '}
      The full matrix on the sparse instance for 165,430
      relaxations against the referee&apos;s 8,000,000 (48×) and
      n Bellman-Fords&apos; 1,356,800 (8×): every distance
      integer-identical to both rivals across 60 randomized
      graphs and two contest instances, unreachable pairs
      included. The lift is not hoped for: w + h(u) - h(v) &ge; 0
      was asserted on every edge, and the planted negative cycle
      tripped the Bellman-Ford stage exactly as the theory says.
    </>
  ),
  weakness: (
    <>
      <strong>An orchestration, priced by its parts.</strong> It
      needs the full Bellman-Ford up front (worth it only when
      amortized over n Dijkstras); its dividend is a sparsity
      story: at m = n²/4 the gap closed to 3.8×, and
      Floyd-Warshall&apos;s three bare loops, with no heap
      traffic and no tuple unpacking, close much of that in wall
      time: for dense graphs or small n, the referee is the
      right tool. A negative cycle anywhere poisons every answer,
      so the tripwire aborts the whole computation rather than
      returning a matrix. And if you only need one source, this
      whole page is overkill: that is Bellman-Ford&apos;s own
      live unit.
    </>
  ),

  problem: 'All-pairs shortest paths',
  problemSlug: 'all-pairs-shortest-paths',
  rivals: [
    {
      name: "Johnson's × potentials",
      isThisUnit: true,
      algoName: "Johnson's algorithm",
      cost: 'O(nm + n·m log n)',
      wins: (
        <>
          <strong>Sparse APSP with negative edges</strong>: 48×
          under the flat n³ here, exact to the integer, tripwire
          included.
        </>
      ),
      costs: (
        <>
          Three algorithms in a trench coat: Bellman-Ford, a
          lift, n Dijkstras: and the dividend fades with density.
        </>
      ),
      when: 'Sparse graphs, every pair wanted, negative weights present.',
    },
    {
      name: 'Floyd-Warshall',
      cost: 'O(n³), any density',
      wins: (
        <>
          The live unit and this page&apos;s referee: three bare
          loops, no heap, negative edges native, negative cycles
          on its own diagonal: unbeatable code-to-power ratio.
        </>
      ),
      costs: (
        <>
          n³ regardless: 8,000,000 relaxations here whether the
          graph has 800 edges or 10,000.
        </>
      ),
      when: 'Dense graphs, small n, or when 15 lines beating 60 matters.',
    },
    {
      name: 'Bellman-Ford (× n)',
      algoName: 'Bellman-Ford',
      cost: 'O(n²m)',
      wins: (
        <>
          The live unit run once per source: simple, negative
          edges native, and the early exit kept it to 1,356,800
          relaxations sparse: closer to Johnson than the worst
          case threatens.
        </>
      ),
      costs: (
        <>
          Dense it collapsed: 20,180,000 relaxations, 10× the
          referee: re-learning the same terrain n times.
        </>
      ),
      when: 'A few sources, not all: or as the one-source answer it was born to be.',
    },
    {
      name: "Dijkstra's algorithm",
      cost: 'O(m log n) per source',
      wins: (
        <>
          The live unit and the engine this page unlocks: after
          the lift its pop-and-finalize greed is valid and does
          almost all of Johnson&apos;s work.
        </>
      ),
      costs: (
        <>
          Raw on negative edges it is not slow but <em>wrong</em>:
          456 of 1,485 pairs (31%) on this page&apos;s measured
          instance.
        </>
      ),
      when: 'Nonnegative weights from the start: then skip the lift and just run it.',
    },
  ],
  neverUse: {
    name: 'Plain Dijkstra straight onto negative edges',
    why: (
      <>
        The tempting shortcut, and the one failure on this page
        that is not a cost blowup: it is <strong>silent
        wrongness</strong>. Dijkstra&apos;s entire validity rests
        on pop-means-final: once a vertex leaves the heap its
        distance never improves: and one negative edge breaks
        that contract. Run raw on this page&apos;s measured
        instance it returned wrong distances for{' '}
        <strong>456 of 1,485 reachable pairs: 31%</strong>: no
        crash, no warning, plausible-looking numbers. A cost
        disaster announces itself in the profiler; a correctness
        disaster ships to production and prices routes wrong for
        a quarter. If the weights can go negative, the choice is
        Bellman-Ford, Floyd-Warshall, or this page&apos;s lift:
        never the raw greedy.
      </>
    ),
  },

  contest: {
    instance:
      'all-pairs shortest paths, n = 200, negative edges throughout; one currency: edge relaxations examined; referee: Floyd-Warshall, exact on every pair',
    columns: ['floyd-warshall', 'johnson', 'n × bellman-ford'],
    rows: [
      {
        method: 'Sparse (m = 4n)',
        isThisUnit: true,
        values: ['8,000,000', '165,430', '1,356,800'],
        best: 1,
        verdict: 'Johnson country: 48× under the flat n³, 8× under repeated Bellman-Ford',
      },
      {
        method: 'Dense (m = n²/4)',
        values: ['8,000,000', '2,112,200', '20,180,000'],
        best: 1,
        verdict: 'the honest row: the gap closes to 3.8× and the referee’s tiny constant makes it closer',
      },
    ],
    source:
      'python solutions/johnsons_reweighting_potentials.py prints this table and asserts: Johnson = Floyd-Warshall = n × Bellman-Ford integer-exact (unreachable pairs included) on 60 randomized negative-edge graphs and both contest instances; w + h(u) - h(v) ≥ 0 on every edge everywhere; the planted negative 4-cycle detected by the Bellman-Ford stage and by Floyd-Warshall’s diagonal; plain Dijkstra on raw weights wrong on 456 of 1,485 reachable pairs (31%), counted against the referee; and both dividend orderings above.',
  },

  figure: (
    <Figure
      id="fig-johnson-lift"
      aspect="16 / 7"
      caption="The lift. Bellman-Ford from a virtual source assigns each vertex a potential h (its altitude). Every edge is reweighted to w + h(u) - h(v): along any path the interior potentials cancel in pairs, so path ranking is untouched while every edge becomes nonnegative (audited on all 10,800 contest edges). Dijkstra then runs safely from each source, and subtracting the potentials back recovers the true distances integer-exact: 165,430 relaxations against the flat n³'s 8,000,000 on the sparse instance."
      cite={{
        text: 'D. B. Johnson, "Efficient algorithms for shortest paths in sparse networks," Journal of the ACM 24(1), 1977. DOI 10.1145/321992.321993. Potentials after Edmonds-Karp 1972.',
        href: 'https://doi.org/10.1145/321992.321993',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="A three-node path with a negative edge, shown before and after potential reweighting, with the telescoping identity">
        <text x="30" y="26" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">raw: one edge negative, dijkstra invalid</text>
        {[['u', 60, 70], ['x', 200, 70], ['v', 340, 70]].map(([l, x, y]) => (
          <g key={l}>
            <circle cx={x} cy={y} r="16" fill="none" stroke="#5da2ff" strokeWidth="1.6" />
            <text x={x} y={y + 4} fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="12" textAnchor="middle">{l}</text>
          </g>
        ))}
        <line x1="76" y1="70" x2="184" y2="70" stroke="#9aa5bd" strokeWidth="1.4" />
        <text x="122" y="60" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="11">+7</text>
        <line x1="216" y1="70" x2="324" y2="70" stroke="#e2606c" strokeWidth="1.8" />
        <text x="258" y="60" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">-5</text>
        <text x="400" y="52" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">h(u)=0  h(x)=0  h(v)=-5</text>
        <text x="400" y="70" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">(bellman-ford distances from a</text>
        <text x="400" y="84" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">virtual source wired to all three)</text>
        <text x="30" y="136" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">lifted: w + h(u) - h(v), every edge nonnegative, ranking unchanged</text>
        {[['u', 60, 180], ['x', 200, 180], ['v', 340, 180]].map(([l, x, y]) => (
          <g key={l}>
            <circle cx={x} cy={y} r="16" fill="none" stroke="#5da2ff" strokeWidth="1.6" />
            <text x={x} y={y + 4} fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="12" textAnchor="middle">{l}</text>
          </g>
        ))}
        <line x1="76" y1="180" x2="184" y2="180" stroke="#62d98a" strokeWidth="1.6" />
        <text x="112" y="170" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">7+0-0=7</text>
        <line x1="216" y1="180" x2="324" y2="180" stroke="#62d98a" strokeWidth="1.6" />
        <text x="240" y="170" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">-5+0-(-5)=0</text>
        <text x="400" y="168" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">d(u,v) = d&apos;(u,v) - h(u) + h(v)</text>
        <text x="400" y="186" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">interior potentials cancel in pairs:</text>
        <text x="400" y="200" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">every u→v path shifts by h(u)-h(v)</text>
        <text x="30" y="240" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">measured at n=200: sparse 165,430 vs 8,000,000 (48×) · dense 2,112,200 (3.8×, said plainly)</text>
        <text x="30" y="262" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">raw dijkstra on the same weights: wrong on 456 of 1,485 pairs (31%): the lift is correctness, not speed</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'johnsons_reweighting_potentials.py',
  Viz: JohnsonViz,
  narration,
};
