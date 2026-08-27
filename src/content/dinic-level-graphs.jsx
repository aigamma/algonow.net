import DinicViz from '../viz/DinicViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/dinic_level_graphs.py?raw';
import { narration } from './dinic-level-graphs.narration.js';

export const content = {
  given:
    'A directed network whose edges carry capacities, one source s, one sink t.',
  task: 'Route as much flow from s to t as the pipes allow, and report the flow on every edge.',
  constraint:
    'Conservation at every vertex except s and t, no edge above its capacity, and the answer must carry its certificate: a cut whose capacity equals the flow, so optimality is checkable, not asserted.',

  origins: (
    <p>
      Moscow, 1969. Yefim Dinitz, a student in Georgy Adelson-Velsky&apos;s
      algorithms seminar (of AVL-tree fame), answered a homework exercise
      about Ford and Fulkerson&apos;s method with the phase idea, and
      published it in <strong>1970</strong> in two pages. The West could not
      quite read the Russian: Shimon Even and Alon Itai reconstructed the
      algorithm from a partial understanding in 1975, and their version, BFS
      levels plus a DFS with the current-arc trick, is what every textbook
      now teaches as <strong>&quot;Dinic&apos;s algorithm&quot;</strong>,
      spelling included. Dinitz&apos;s own 2006 retrospective cheerfully
      documents the mistranslation that made his homework famous.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>phase machine</strong>. Each phase: label every vertex
      with its BFS distance from s in the residual graph, keep only edges
      that step exactly one level down, and push a{' '}
      <strong>blocking flow</strong> through that level graph: a flow after
      which every level-respecting s-t path contains a saturated edge. Add
      it to the total, rebuild levels, repeat until t is unreachable. The
      current-arc pointer makes each phase cheap: an edge that fails is
      abandoned for the rest of the phase, never re-examined.
    </p>
  ),
  heurRole: (
    <p>
      Chooses <strong>which paths are allowed to exist</strong>: only
      shortest ones. That single restriction buys the two guarantees Ford
      and Fulkerson lack. Zigzag augmentations cannot happen, because a
      zigzag is never level-respecting. And progress is forced: a blocked
      level graph means every shortest path is saturated, so the s-t
      distance <strong>strictly rises</strong> each phase, giving at most V
      phases on any input whatsoever.
    </p>
  ),

  picture: (
    <p>
      Flood a building floor by floor. First survey how far every room is
      from the pump: that survey is the level graph, and water is only
      allowed through doors that lead strictly one floor closer to the
      drain. Pour until every route through the surveyed floors is choked
      somewhere: that is the blocking flow. Then survey again. The drain is
      now strictly further away, always, so the surveys cannot repeat, and
      after at most one survey per room the building holds all the water it
      ever will. The zigzag corridors that trap a naive plumber were never
      on the survey at all.
    </p>
  ),

  steps: [
    <>
      <strong>Survey:</strong> BFS from s over edges with remaining
      capacity; level[v] = distance. If t got no level, stop: the flow is
      maximum and the unreachable set is the min cut.
    </>,
    <>
      <strong>Restrict:</strong> keep only edges going from level d to
      level d + 1. This is the level graph.
    </>,
    <>
      <strong>Block it:</strong> DFS from s along the level graph, pushing
      bottleneck flow on every path found; the current-arc pointer skips
      each failed edge for the rest of the phase.
    </>,
    <>
      <strong>Account:</strong> pushed flow lowers forward capacity and
      raises the partner edge, so later phases may undo earlier routing.
    </>,
    <>
      <strong>Repeat.</strong> Each phase raises the s-t distance, so
      phases number at most V; on this page&apos;s big instance, two.
    </>,
  ],

  signals: [
    <>
      The graph is <strong>sparse with bounded capacities</strong>, where
      the phase structure runs far below its worst case (two phases on the
      instance below).
    </>,
    <>
      <strong>Unit-ish capacities</strong>: on unit networks Dinic is
      O(E√V), which is why bipartite matching (Hopcroft-Karp is exactly
      this specialization) belongs to it.
    </>,
    <>
      You need the <strong>certificate</strong>: the final residual graph
      hands you the min cut for free.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is Ford-Fulkerson itself: <strong>any</strong>{' '}
      augmenting path, repeat. Its correctness is untouchable and its
      freedom is the wound: on the layered instance below plain DFS pathing
      costs <strong>8,998,320</strong> edge examinations across 3,289
      augmentations where the level discipline pays{' '}
      <strong>50,608 in two phases</strong>, and on Zwick&apos;s diamond an
      adversarial path order spends <strong>1,500,000</strong> operations
      shuttling one unit at a time through a cross edge that shortest paths
      never touch.
    </>
  ),

  strength: (
    <>
      <strong>Guaranteed phases, practical speed.</strong> At most V phases
      on anything (two here, measured), O(E√V) on unit capacities, the min
      cut certificate free at the end, and the whole thing fits in sixty
      lines with one subtle pointer.
    </>
  ),
  weakness: (
    <>
      <strong>The worst case is real, and rivals with better heuristics
      exist.</strong> O(V²E) can bite on dense adversarial networks, and
      the push-relabel family, once armed with its own pairing (gap and
      global relabeling), is the practical champion on hard dense
      instances; plain FIFO push-relabel below shows how much those
      heuristics matter: 18,476,847 without them.
    </>
  ),

  problem: 'Maximum flow',
  problemSlug: 'maximum-flow',
  rivals: [
    {
      name: 'Dinic × level graphs',
      isThisUnit: true,
      algoName: "Dinic's algorithm",
      cost: 'O(V²E), O(E√V) unit',
      wins: (
        <>
          <strong>50,608</strong> edge examinations and{' '}
          <strong>2 phases</strong> on the layered network, 131× less than
          Edmonds-Karp, with the phase bound guaranteed in advance.
        </>
      ),
      costs: (
        <>
          A recursive blocking flow with the current-arc subtlety; dense
          adversarial instances can still reach the V²E ceiling.
        </>
      ),
      when: 'The default max-flow: sparse networks, unit capacities, matchings, and whenever you want a guarantee with your speed.',
    },
    {
      name: 'Edmonds-Karp',
      cost: 'O(VE²)',
      wins: (
        <>
          One BFS, one path, provably polynomial: the simplest correct
          bound, and immune to the trap (<strong>12</strong> operations on
          the diamond, 2 augmentations).
        </>
      ),
      costs: (
        <>
          One path per BFS is the waste: <strong>6,661,398</strong>{' '}
          examinations across 823 augmentations here, re-discovering the
          same levels Dinic reuses for a whole phase.
        </>
      ),
      when: 'Teaching, and small graphs where sixty simple lines beat sixty subtle ones.',
    },
    {
      name: 'Push-relabel',
      cost: 'O(V³) FIFO',
      wins: (
        <>
          No global paths at all: local pushes under height labels, the
          formulation that parallelizes, and with gap plus global
          relabeling it is the practical champion on hard dense networks.
        </>
      ),
      costs: (
        <>
          Naked FIFO shows why those heuristics are famous:{' '}
          <strong>18,476,847</strong> examinations here, 365× Dinic. The
          algorithm is only half the method.
        </>
      ),
      when: 'Dense or adversarial instances with the full heuristic kit, or when the workload wants locality and parallelism.',
    },
  ],
  neverUse: {
    name: 'Ford-Fulkerson with arbitrary paths, on capacities you do not control',
    why: (
      <>
        Its spec permits any augmenting path, so an adversary (or plain bad
        adjacency order) picks the diamond&apos;s zigzags:{' '}
        <strong>500,000 one-unit augmentations, 1,500,000 operations</strong>,
        measured below, for a flow Edmonds-Karp finds in two augmentations.
        With irrational capacities it can fail to terminate at all, and
        converge to the wrong value while doing so (Zwick&apos;s
        counterexamples). The idea is the foundation of everything on this
        bench; unconstrained path choice is the part every successor
        exists to remove.
      </>
    ),
  },

  contest: {
    instance:
      'work = edge examinations, two instances: a layered network (V = 1,202, E = 4,500, max flow 3,583) and Zwick’s diamond trap (four vertices, a one-unit cross edge, C = 250,000)',
    columns: ['layered network', 'diamond trap'],
    rows: [
      {
        method: 'Dinic × level graphs',
        isThisUnit: true,
        values: ['50,608', '20'],
        best: 0,
        verdict: 'two phases settle the network; the trap is invisible to levels',
      },
      {
        method: 'Edmonds-Karp',
        values: ['6,661,398', '12'],
        verdict: 'trap-proof, but one path per BFS costs 131× the work here',
      },
      {
        method: 'Ford-Fulkerson, DFS paths',
        values: ['8,998,320', '1,500,000'],
        verdict: 'correct always, bounded never: the trap is its spec, exercised',
      },
      {
        method: 'Push-relabel, plain FIFO',
        values: ['18,476,847', '18'],
        verdict: 'without its gap and global-relabel pairing, locality wanders',
      },
    ],
    source:
      'python solutions/dinic_level_graphs.py prints this table and asserts all four methods agree on 200 random networks plus both instances, every flow satisfies capacity and conservation exactly, each Dinic run’s min-cut certificate equals its flow value (max-flow = min-cut as a unit test), the trap costs the adversarial order exactly 2C augmentations while Edmonds-Karp needs 2 and Dinic one phase, and the phase bound holds.',
  },

  figure: (
    <Figure
      id="fig-dinic-levels"
      aspect="16 / 7"
      caption="Why phases must end. BFS levels slice the residual graph into distance bands, and augmentation is confined to edges stepping exactly one band forward, so a zigzag through the famous cross edge is simply not in the searched graph. When the blocking flow chokes every such path, any surviving route to the sink must waste a step somewhere: the s-t distance has strictly risen. Distances only climb, and they cannot exceed V, so the phase count is bounded before the first edge is examined."
      cite={{
        text: 'Dinitz, "Algorithm for Solution of a Problem of Maximum Flow in Networks with Power Estimation", Soviet Mathematics Doklady 11, 1970. The version taught everywhere is Even and Itai’s 1975 reconstruction; Dinitz’s 2006 retrospective records the mistranslation.',
        href: 'https://doi.org/10.1007/11685654_10',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="A network sliced into BFS level bands with flow allowed only one band forward; after blocking, the sink's band index rises">
        {[0, 1, 2, 3, 4].map((l) => (
          <g key={l}>
            <rect x={40 + l * 120} y={34} width={92} height={168} rx={8} fill={`rgba(93,162,255,${0.05 + l * 0.02})`} stroke="#2b5fa8" strokeWidth="1" />
            <text x={86 + l * 120} y={26} textAnchor="middle" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="11">level {l}</text>
          </g>
        ))}
        <circle cx="86" cy="118" r="13" fill="rgba(98,217,138,0.2)" stroke="#62d98a" strokeWidth="1.6" />
        <text x="86" y="123" textAnchor="middle" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="12">s</text>
        {[[206, 70], [206, 166], [326, 70], [326, 166], [446, 118]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="10" fill="#232c40" stroke="#5da2ff" strokeWidth="1.3" />
        ))}
        <circle cx="566" cy="118" r="13" fill="rgba(240,185,75,0.16)" stroke="#f0b94b" strokeWidth="1.6" />
        <text x="566" y="123" textAnchor="middle" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="12">t</text>
        {[[99, 112, 196, 74], [99, 124, 196, 162], [216, 70, 316, 70], [216, 166, 316, 166], [336, 74, 436, 112], [336, 162, 436, 124], [459, 118, 553, 118]].map(([x1, y1, x2, y2], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#62d98a" strokeWidth="2.2" opacity="0.8" />
        ))}
        <line x1="206" y1="84" x2="206" y2="152" stroke="#e06767" strokeWidth="2" strokeDasharray="5 4" />
        <text x="216" y="122" fill="#e06767" fontFamily="ui-monospace, monospace" fontSize="11">same level:</text>
        <text x="216" y="136" fill="#e06767" fontFamily="ui-monospace, monospace" fontSize="11">not searched</text>
        <text x="40" y="238" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="12">flow may only step one band forward · the zigzag edge is not in the graph</text>
        <text x="40" y="258" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="12">blocked at distance d → next survey finds distance &gt; d → at most V phases</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'dinic_level_graphs.py',
  Viz: DinicViz,
  narration,
};
