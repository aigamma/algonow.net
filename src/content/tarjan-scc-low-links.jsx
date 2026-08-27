import TarjanViz from '../viz/TarjanViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/tarjan_scc_low_links.py?raw';
import { narration } from './tarjan-scc-low-links.narration.js';

export const content = {
  given:
    'A directed graph: dependencies, implications, links, call sites.',
  task: 'Its strongly connected components: the maximal mutually-reachable sets: in one DFS pass, emitted in reverse topological order.',
  constraint:
    'Mutual reachability asked naively is n BFS runs: ~1.6 billion touches at this page’s 20,000-vertex instance: the one-pass answer touches every edge exactly once: 59,995, counted to the edge.',

  origins: (
    <p>
      Tarjan&apos;s <strong>1972</strong> paper (&quot;Depth-first
      search and linear graph algorithms&quot;) is the founding text of
      DFS-as-instrument: SCCs, bridges, articulation points all fall
      out of one traversal with the right bookkeeping. Kosaraju&apos;s
      unpublished two-pass method (1978, via Sharir) is the elegant
      sibling; Gabow&apos;s two-stack variant closes the trio. The
      application that keeps the theorem employed is{' '}
      <strong>2-SAT</strong> (Aspvall-Plass-Tarjan 1979): boolean
      constraints become an implication graph, and satisfiability
      becomes a question about which literals share a component:
      solved and certified on this page 250 times.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>depth-first skeleton</strong> with discovery
      indices: every vertex stamped with when the search first touched
      it. That much is every graph walker&apos;s common property: the
      componentry, the certificates, and the ordering all come from
      what the pairing adds on top. (The implementation here is
      iterative: the explicit-stack form that survives 20,000-vertex
      recursions Python would refuse.)
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>low-link discipline</strong>: each vertex
      tracks the smallest discovery index reachable through its subtree
      plus at most one back edge, and vertices wait on an auxiliary
      stack until an ancestor <em>proves</em> the component closed: the
      proof being lowlink(v) = index(v), at which point everything
      above v pops as one finished SCC. Two integers and a stack turn
      a walk into a partition: 59,995 edge touches, exactly m, asserted:
      and the components emerge already reverse-topologically sorted,
      asserted on every cross edge.
    </p>
  ),

  picture: (
    <p>
      Exploring a cave system with a rope and chalk. Chalk each chamber
      with the order visited; the rope pays out behind you. The
      low-link is a note in each chamber: the earliest-chalked chamber
      anyone below here has found a passage back to. Surface that note
      at a chamber pointing to <em>itself</em>, and you have proof:
      nothing beneath escapes above this point: everything still
      roped below is one sealed cavern system: coil it off as a unit.
      One spelunk, all caverns, and they come off the rope
      deepest-first.
    </p>
  ),

  steps: [
    <>
      <strong>DFS with stamps:</strong> index(v) = arrival order;
      lowlink(v) starts equal; v goes on the side stack.
    </>,
    <>
      <strong>Propagate low-links:</strong> tree children return theirs;
      back edges to on-stack vertices offer their index; keep the
      minimum.
    </>,
    <>
      <strong>Close on proof:</strong> lowlink(v) = index(v) ⟹ pop the
      stack down to v: that is one whole SCC, certified.
    </>,
    <>
      <strong>Read the order:</strong> components emerge
      reverse-topologically: downstream first (asserted on every cross
      edge): feed them straight to Kahn or a DP.
    </>,
    <>
      <strong>For 2-SAT:</strong> build implications, run this, and a
      variable sharing a component with its negation is the whole
      unsatisfiability proof.
    </>,
  ],

  signals: [
    <>
      <strong>Cycles are the structure:</strong> deadlock detection,
      circular dependencies, mutually recursive call groups: the
      condensation is the map you actually wanted.
    </>,
    <>
      <strong>A DAG pipeline follows:</strong> SCC-then-toposort is the
      standard preprocessing for DPs on graphs with cycles: and
      Tarjan&apos;s emission order does the second step for free.
    </>,
    <>
      <strong>Constraint problems in disguise:</strong> 2-SAT, and its
      many costumes (implication chains, either-or scheduling): decided
      here 250 times with certificates.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>Kosaraju&apos;s method</strong>:
      DFS the graph recording finish order, then sweep the{' '}
      <em>reverse</em> graph in that order: two passes of transparent
      elegance, agreeing with Tarjan exactly at 20,000 vertices, at
      exactly <strong>2m = 119,990</strong> touches to Tarjan&apos;s m.
      It is the version you can rederive at a whiteboard under stress:
      worth knowing for precisely that reason.
    </>
  ),

  strength: (
    <>
      <strong>One pass, every edge once, order included,
      certificates native.</strong> 59,995 touches for 60,000 edges
      (asserted equal to m); the 2,303-component partition agreeing
      with both referees; reverse-topo emission asserted edge-by-edge;
      and the closure test (lowlink = index) is itself a proof object,
      which is why 2-SAT&apos;s yes/no both come with witnesses.
    </>
  ),
  weakness: (
    <>
      <strong>Bookkeeping density, recursion depth, and a
      harder-to-teach invariant.</strong> Two arrays, a stack, and an
      on-stack flag whose interplay is famously easy to half-remember
      (the on-stack check is the classic omission); plain recursion
      dies at this page&apos;s scale (the iterative form is the price);
      and when only reachability-from-one-source is needed, all of it
      is overkill: BFS exists.
    </>
  ),

  problem: 'Strongly connected components',
  problemSlug: 'strongly-connected-components',
  rivals: [
    {
      name: "Tarjan × low-link discipline",
      isThisUnit: true,
      algoName: "Tarjan's SCC algorithm",
      cost: 'O(n + m), one pass',
      wins: (
        <>
          <strong>Exactly m edge touches</strong> (asserted), reverse
          topo order free, and the closure proof built in: the
          production SCC.
        </>
      ),
      costs: (
        <>
          The densest bookkeeping on this page, and an invariant that
          punishes half-memory.
        </>
      ),
      when: 'The default: compilers, deadlock detectors, condensation pipelines: one walk, whole answer.',
    },
    {
      name: "Kosaraju's algorithm",
      cost: 'O(n + m), two passes',
      wins: (
        <>
          Transparent: finish order, then the reverse graph:{' '}
          <strong>rederivable from first principles</strong>, and this
          page&apos;s independent referee at scale. (Gabow&apos;s
          two-stack variant is the third sibling.)
        </>
      ),
      costs: (
        <>
          Exactly 2m touches (asserted) and the reverse graph&apos;s
          extra memory: elegance, priced.
        </>
      ),
      when: 'Teaching, whiteboards, and anywhere clarity outbids one pass.',
    },
    {
      name: '2-SAT via implication SCC',
      algoName: '2-SAT via implication SCC',
      cost: 'O(n + m) end to end',
      wins: (
        <>
          The payload: either-or constraints become components:{' '}
          <strong>250 instances decided here</strong>, verdicts matching
          exhaustive truth tables, assignments re-verified clause by
          clause.
        </>
      ),
      costs: (
        <>
          Exactly two literals per clause: at three the problem is
          NP-complete and this door closes.
        </>
      ),
      when: 'Binary either-or constraint systems: scheduling pairs, radio frequencies, seat assignments.',
    },
    {
      name: "Kahn's algorithm × zero in-degree",
      algoName: "Kahn's algorithm",
      cost: 'O(n + m) on the DAG',
      wins: (
        <>
          The condensation&apos;s consumer (a live unit): SCC-then-Kahn
          is the standard cycle-taming pipeline: though Tarjan&apos;s
          emission order often makes the second step redundant.
        </>
      ),
      costs: (
        <>
          Needs the DAG first: on a cyclic graph it stalls: which is
          exactly the signal this unit exists to process.
        </>
      ),
      when: 'Ordering the condensed graph, or any born-acyclic dependency set.',
    },
  ],
  neverUse: {
    name: 'Per-pair reachability at scale',
    why: (
      <>
        Answering &quot;mutually reachable?&quot; by running BFS from
        every vertex costs n(n+m): <strong>~1.6 billion touches</strong>{' '}
        on this page&apos;s instance, against Tarjan&apos;s 59,995: four
        orders of magnitude for the same partition: and it is this
        page&apos;s own referee at small n, which is the recurring
        pattern worth naming: quadratic honesty referees linear
        cleverness, and production ships the cleverness. The subtler
        trap is partial laziness: answering component queries on demand
        with cached BFS runs: the giant component (17,698 vertices
        here) makes each miss nearly a full scan.
      </>
    ),
  },

  contest: {
    instance:
      'n = 20,000, m = 60,000 random digraph (2,303 components, giant of 17,698); referees: brute mutual reachability on 300 small trials, Kosaraju agreeing exactly at scale, reverse-topo emission asserted on every cross edge',
    columns: ['graph touches', 'passes'],
    rows: [
      {
        method: 'Brute mutual reach',
        values: ['~1.6B (stated)', 'n BFS runs'],
        verdict: 'the small-n referee; the at-scale never-use',
      },
      {
        method: "Kosaraju",
        values: ['119,990', '2'],
        verdict: 'exactly 2m, asserted: elegance with a visible price tag',
      },
      {
        method: 'Tarjan × low-links',
        isThisUnit: true,
        values: ['59,995', '1'],
        best: 0,
        verdict: 'exactly m: every edge once, order and proofs included',
      },
    ],
    source:
      "python solutions/tarjan_scc_low_links.py prints this table and asserts: 300 brute-refereed trials; the structure gadgets exact (one ring = one SCC, a DAG = all singletons, two chained cycles = two components emitted downstream-first); Kosaraju's partition equal to Tarjan's at 20,000 vertices with touch counts exactly m and 2m; reverse-topological emission on every condensation edge; and the 2-SAT payload: 250 instances (134 SAT / 116 UNSAT) matching exhaustive truth tables, every satisfying assignment re-verified clause by clause.",
  },

  figure: (
    <Figure
      id="fig-tarjan-lowlink"
      aspect="16 / 7"
      caption="The proof that closes a component. Indices stamp discovery order; low-links carry the earliest index reachable through the subtree plus one back edge. When lowlink(v) equals index(v), nothing below v escapes above it: everything still on the auxiliary stack down to v is one sealed component, popped as a unit: and because sinks seal first, the components emerge in reverse topological order, asserted here on every cross edge."
      cite={{
        text: 'Tarjan, "Depth-First Search and Linear Graph Algorithms", SIAM J. Computing 1(2), 1972. The 2-SAT application is Aspvall, Plass & Tarjan 1979; Kosaraju\'s two-pass method is via Sharir 1981.',
        href: 'https://doi.org/10.1137/0201010',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="A DFS tree with index and low-link labels and a back edge sealing a component">
        {[[120, 60, '0/0'], [220, 120, '1/1'], [320, 180, '2/1'], [420, 120, '3/3'], [520, 180, '4/3']].map(([x, y, lbl], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="15" fill={i < 3 ? 'rgba(240,185,75,0.18)' : 'rgba(93,162,255,0.15)'} stroke={i < 3 && i > 0 ? '#f0b94b' : '#5da2ff'} strokeWidth="1.6" />
            <text x={x} y={y + 4} fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="10" textAnchor="middle">{lbl}</text>
          </g>
        ))}
        <line x1="133" y1="68" x2="207" y2="112" stroke="#5da2ff" strokeWidth="1.4" />
        <line x1="233" y1="128" x2="307" y2="172" stroke="#5da2ff" strokeWidth="1.4" />
        <line x1="433" y1="128" x2="507" y2="172" stroke="#5da2ff" strokeWidth="1.4" />
        <line x1="235" y1="112" x2="407" y2="122" stroke="#5da2ff" strokeWidth="1.4" />
        <path d="M 310 165 C 270 120, 245 125, 235 132" fill="none" stroke="#62d98a" strokeWidth="2" strokeDasharray="5 4" />
        <text x="238" y="158" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="10">back edge: lowlink ← 1</text>
        <text x="180" y="228" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">at vertex 1: lowlink = index = 1 ⇒ pop {'{1, 2}'} as one SCC</text>
        <text x="180" y="250" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">labels are index/lowlink · sinks seal first ⇒ reverse topological emission</text>
        <text x="180" y="276" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">measured: 59,995 touches = m exactly · Kosaraju 2m · brute ~1.6B</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'tarjan_scc_low_links.py',
  Viz: TarjanViz,
  narration,
};
