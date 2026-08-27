import PushRelabelViz from '../viz/PushRelabelViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/push_relabel_fifo_selection.py?raw';
import { narration } from './push-relabel-fifo-selection.narration.js';

export const content = {
  given:
    'A capacitated network, a source, a sink: the same contract as the live Edmonds-Karp unit, one shelf over.',
  task: 'The maximum flow: without ever finding an augmenting path.',
  constraint:
    'Every operation must be LOCAL: a vertex may look only at its own excess, its height, and its neighbors. No BFS, no global view: the property that lets the method parallelize and rule vision pipelines. Referees: value equality with Edmonds-Karp on 200 graphs, the duality certificate on every instance, and internal excess asserted zero at termination.',

  origins: (
    <p>
      Goldberg and Tarjan, JACM <strong>1988</strong>: built on
      Karzanov&apos;s 1974 <em>preflow</em>: the deliberately illegal
      state where vertices hold more inflow than outflow: and turned
      it into the field&apos;s workhorse. The mental model is
      theirs: water on terraces. Flood the source&apos;s edges, let
      excess puddle, push puddles downhill one terrace at a time,
      and raise a stuck terrace just enough to drain. The
      path-seeking dynasty (Ford-Fulkerson, the live Edmonds-Karp,
      the live Dinic) computes routes; this method abolishes them:
      which is why graph-cut vision code and parallel solvers ship
      it.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>preflow with height labels</strong>: saturate
      the source&apos;s edges (source starts at height n), then only
      two moves exist. <em>Push</em>: send excess along a residual
      edge exactly one level downhill. <em>Relabel</em>: a stuck
      vertex rises to one above its lowest residual neighbor.
      Heights only climb, so the machine terminates: and at the end,
      internal excess is asserted <strong>exactly zero</strong>,
      the sink&apos;s excess is the flow, and the residual cut
      certifies it (cut = flow on all 200 instances).
    </p>
  ),
  heurRole: (
    <p>
      Supplies <strong>FIFO vertex selection</strong>: keep active
      vertices in a queue, work them in arrival order, requeue on
      relabel. That one discipline tightens the generic O(V²E) bound
      to <strong>O(V³)</strong>. Measured honestly: on 30 friendly
      layered graphs FIFO&apos;s 14,023 ops edged random&apos;s
      14,882 and even bare highest-label&apos;s 14,829: the queue is
      a tune-up there, not a rescue: FIFO&apos;s real earnings are
      the worst-case bound, and the page says so.
    </p>
  ),

  picture: (
    <p>
      Water on terraces. The source is a tank raised to height n;
      opening it floods every outgoing pipe, and water puddles on
      the terraces below. A puddle drains only to a terrace{' '}
      <em>exactly one step lower</em>: and when nothing lower has
      pipe capacity left, the stuck terrace itself is jacked up one
      notch past its lowest pipeworthy neighbor, and drains. Water
      that can reach the sink runs there; water that cannot keeps
      rising on its terrace until it climbs over the source&apos;s
      height and drains home. Nobody plans a route. Nobody sees the
      map. The flood finds the maximum flow because gravity plus
      bookkeeping <em>is</em> the proof.
    </p>
  ),

  steps: [
    <>
      <strong>Initialize:</strong> source at height n; saturate its
      edges; excess puddles on its neighbors.
    </>,
    <>
      <strong>Push:</strong> from an active vertex, move excess along
      a residual edge one level downhill.
    </>,
    <>
      <strong>Relabel:</strong> stuck: rise to one above the lowest
      residual neighbor: heights only climb.
    </>,
    <>
      <strong>Select by queue:</strong> FIFO order over active
      vertices: the discipline worth O(V³).
    </>,
    <>
      <strong>Read the answer:</strong> sink&apos;s excess is the
      flow; the residual cut is its certificate: checked on all 200
      graphs.
    </>,
  ],

  signals: [
    <>
      <strong>Locality is the requirement:</strong> parallel and
      distributed maxflow, GPU implementations: no global BFS to
      serialize around.
    </>,
    <>
      <strong>Graph cuts on grids:</strong> vision&apos;s
      segmentation networks: this page&apos;s 8×8 client recovered
      the planted blob exactly, certified by its own cut.
    </>,
    <>
      <strong>Dense or adversarial instances:</strong> the O(V³)
      insurance where path counts explode: the family the live
      Dinic&apos;s bound also serves, by the other philosophy.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the <strong>path-seeking dynasty</strong>:
      the live Edmonds-Karp, whose zigzag gadget this page re-races:
      pathological path choice pays 200,000 augmentations, BFS pays
      2, and push-relabel pays <strong>4 local ops</strong>: not
      because it chooses paths well, but because no paths exist to
      be chosen badly. Same answers on all 200 random graphs: the
      two philosophies are referee-equal and temperament-opposite.
    </>
  ),

  strength: (
    <>
      <strong>Local moves, global optimum, certificates
      everywhere.</strong> Value equal to Edmonds-Karp on all 200
      graphs; internal excess asserted zero at every termination;
      the residual cut equal to the flow on every instance; the
      zigzag gadget in 4 local operations; and the vision client&apos;s
      cut recovering the planted 4×4 blob exactly, certified. The
      machinery parallelizes because nothing in it ever needs the
      whole graph at once.
    </>
  ),
  weakness: (
    <>
      <strong>Constants, tuning lore, and an honest mid-pack
      surprise.</strong> Bare push-relabel is not fast: production
      solvers lean on the gap and global-relabel heuristics (this
      page&apos;s rival cards), and the folklore champion
      highest-label, run <em>bare</em> here, landed mid-pack
      (14,829 vs FIFO&apos;s 14,023): its reputation was earned
      alongside the entourage. And for one-shot sparse instances,
      the path dynasty&apos;s simplicity (18 lines of BFS) is hard
      to argue with.
    </>
  ),

  problem: 'Maximum flow',
  problemSlug: 'maximum-flow',
  rivals: [
    {
      name: 'Push-relabel × FIFO',
      isThisUnit: true,
      algoName: 'Push-relabel',
      cost: 'O(V³)',
      wins: (
        <>
          <strong>No paths at all:</strong> 4 local ops on the gadget,
          parallelizable locality, and the vision client certified:
          the modern dense-graph workhorse.
        </>
      ),
      costs: (
        <>
          Bare, it needs tuning lore (gap, global relabel) to hit its
          reputation: measured mid-pack without them.
        </>
      ),
      when: 'Dense graphs, grids, parallel settings: wherever locality or worst-case insurance pays.',
    },
    {
      name: 'Edmonds-Karp × BFS paths',
      algoName: 'Edmonds-Karp',
      cost: 'O(V·E²)',
      wins: (
        <>
          The live unit: 18 transparent lines, capacity-free bound,
          and this page&apos;s referee: equal answers on every one of
          200 graphs.
        </>
      ),
      costs: (
        <>
          Global BFS per augmentation: serial by nature, and path
          counts can grow where preflows shrug.
        </>
      ),
      when: 'Sparse one-shot instances and any setting where readable code wins arguments.',
    },
    {
      name: 'Dinic × level graphs',
      algoName: "Dinic's algorithm",
      cost: 'O(V²E), O(E√V) unit',
      wins: (
        <>
          The live unit between the philosophies: BFS levels plus
          blocking flows: the competitive-programming default, superb
          on unit capacities.
        </>
      ),
      costs: (
        <>
          Still path-based at heart: level rebuilds are global
          operations preflows never perform.
        </>
      ),
      when: 'Bipartite matching and unit-capacity families: its bound there is unmatched.',
    },
    {
      name: 'Push-relabel × highest label',
      algoName: 'Push-relabel',
      cost: 'O(V²√E)',
      wins: (
        <>
          The sibling selection rule with the better bound: and, with
          its usual gap-heuristic entourage, the practical champion
          in solver bake-offs.
        </>
      ),
      costs: (
        <>
          Measured <em>bare</em> on this page: mid-pack (14,829 ops vs
          FIFO&apos;s 14,023): the reputation lives with the
          entourage.
        </>
      ),
      when: 'Production maxflow libraries: always alongside gap and global relabeling.',
    },
  ],
  neverUse: {
    name: 'Reading the preflow mid-run',
    why: (
      <>
        Halfway through, the state is deliberately illegal: vertices
        hold excess that conservation forbids, some of it destined
        for the sink, some destined to climb back home to the
        source. A dashboard that reads flow off the wire mid-run: or
        an engineer who stops the solver early because &quot;most of
        the flow has arrived&quot;: is reporting a <em>preflow</em>,
        which is not a flow at all: edges can carry amounts no
        feasible routing justifies. This page&apos;s referee is the
        discipline: internal excess asserted exactly zero at
        termination, and only then is the sink&apos;s excess called
        the answer. Path-based methods degrade gracefully (every
        augmentation is a valid partial flow): preflow methods are
        all-or-nothing: the intermediate state is scaffolding, and
        shipping scaffolding as a bridge is how dashboards lie.
      </>
    ),
  },

  contest: {
    instance:
      'the live EK page’s zigzag gadget (C = 100,000) plus 200 random graphs; referee: value equality with Edmonds-Karp and the duality certificate (cut = flow, t unreachable, internal excess zero) on every instance',
    columns: ['work on the gadget', 'nature'],
    rows: [
      {
        method: 'Pathological FF',
        values: ['200,000 augmentations', 'path trap'],
        verdict: 'one barrel per round trip: the EK page’s measured disaster',
      },
      {
        method: 'Edmonds-Karp (live)',
        values: ['2 augmentations', 'BFS immunity'],
        verdict: 'the fix that keeps paths: shortest ones cannot zigzag',
      },
      {
        method: 'Push-relabel FIFO',
        isThisUnit: true,
        values: ['4 local ops', 'no paths exist'],
        best: 0,
        verdict: 'the trap needs a path chooser to catch: there is none',
      },
    ],
    source:
      "python solutions/push_relabel_fifo_selection.py prints this table and asserts: flow equal to Edmonds-Karp on 200 random graphs with the residual-cut certificate and zero internal excess on every one; the gadget at 4 local ops; the selection dial (FIFO 14,023 / bare highest-label 14,829 / random 14,882 on 30 layered graphs: the folklore champion needs its gap-heuristic entourage); and the 8×8 graph-cut client recovering the planted 4×4 blob exactly at cut = flow = 96.",
  },

  figure: (
    <Figure
      id="fig-push-relabel-terraces"
      aspect="16 / 7"
      caption="Water on terraces. The source tank starts at height n and floods its pipes; excess puddles below. A puddle may drain only one terrace downhill; a stuck terrace is jacked up one notch past its lowest pipeworthy neighbor and drains. Water that can reach the sink runs there; the rest climbs until it drains home over the source. No routes are ever planned: the flood finds the maximum flow because heights only rise, pushes only descend, and the final puddle-free state carries its own min-cut certificate."
      cite={{
        text: 'Goldberg & Tarjan, "A New Approach to the Maximum-Flow Problem", JACM 35(4), 1988: preflows (Karzanov 1974) plus height labels; FIFO selection gives O(V³). The path-free philosophy behind parallel and vision-pipeline maxflow.',
        href: 'https://doi.org/10.1145/48014.61051',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="Terraced heights with a source tank, puddles of excess pushing downhill, and one terrace being raised">
        <rect x="60" y="40" width="70" height="26" fill="#33507a" />
        <text x="66" y="58" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="11">source h=n</text>
        <rect x="170" y="100" width="70" height="16" fill="#2a3450" />
        <rect x="170" y="84" width="70" height="14" fill="#5da2ff" opacity="0.7" />
        <text x="176" y="132" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">excess puddle</text>
        <rect x="290" y="150" width="70" height="16" fill="#2a3450" />
        <rect x="410" y="200" width="70" height="16" fill="#2a3450" />
        <rect x="530" y="240" width="70" height="26" fill="#1f4633" />
        <text x="540" y="258" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">sink</text>
        <path d="M 132 60 L 168 92" stroke="#f0b94b" strokeWidth="2" markerEnd="url(#prArrow)" fill="none" />
        <path d="M 242 104 L 288 148" stroke="#f0b94b" strokeWidth="2" markerEnd="url(#prArrow)" fill="none" />
        <path d="M 362 158 L 408 198" stroke="#f0b94b" strokeWidth="2" markerEnd="url(#prArrow)" fill="none" />
        <path d="M 482 210 L 528 244" stroke="#f0b94b" strokeWidth="2" markerEnd="url(#prArrow)" fill="none" />
        <defs>
          <marker id="prArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#f0b94b" />
          </marker>
        </defs>
        <rect x="290" y="112" width="70" height="10" fill="none" stroke="#e2606c" strokeDasharray="4 3" />
        <text x="252" y="106" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="10">relabel: jack the stuck terrace one notch</text>
        <text x="60" y="284" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">push: one level downhill only · relabel: heights only climb · end state: no puddles, cut = flow (asserted)</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'push_relabel_fifo_selection.py',
  Viz: PushRelabelViz,
  narration,
};
