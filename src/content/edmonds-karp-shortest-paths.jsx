import EdmondsKarpViz from '../viz/EdmondsKarpViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/edmonds_karp_shortest_paths.py?raw';
import { narration } from './edmonds-karp-shortest-paths.narration.js';

export const content = {
  given:
    'A capacitated network, a source, a sink.',
  task: 'The maximum flow, with a termination bound independent of the capacities: and the min-cut certificate proving it.',
  constraint:
    'Correctness was never the problem: Ford-Fulkerson is right whenever it stops. The problem is when: the zigzag gadget measured here takes 200,000 augmentations with a bad path chooser and 2 with the right one. The heuristic is one word.',

  origins: (
    <p>
      Ford and Fulkerson gave the augmenting-path scheme and the
      max-flow/min-cut theorem in <strong>1956</strong>: correct, and
      silent about which path: with irrational capacities it can run{' '}
      <em>forever</em>, and with big integers, for ages (measured
      below). Edmonds and Karp&apos;s <strong>1972</strong> fix is one
      word: BFS: and the accompanying theorem: residual distances only
      ever grow: caps augmentations at VE/2 with no capacity in the
      bound. Dinic reached the same idea independently in 1970 and
      pushed further (a live unit here); push-relabel later abandoned
      paths entirely. The certificate side: every flow on this page
      ships with its cut.
    </p>
  ),

  algoRole: (
    <p>
      Owns <strong>augment-and-repeat</strong>: find a source-to-sink
      path with residual room, push its bottleneck, update the
      residual graph (including the reverse edges that let later paths
      undo earlier greed), stop when no path remains. When it stops,
      the unreachable half of the residual graph <em>is</em> a min cut:
      the duality this page certifies edge-by-edge on every instance,
      and confirms against exhaustive enumeration of all 2ⁿ⁻² cuts on
      200 small graphs.
    </p>
  ),
  heurRole: (
    <p>
      Supplies one word: <strong>BFS</strong>. Always augment along a{' '}
      <em>shortest</em> residual path. The Edmonds-Karp theorem does
      the rest: shortest-path distances are monotone under such
      augmentations, each edge can be the bottleneck only O(V) times,
      and the total is ≤ VE/2 augmentations: <em>no capacity appears
      in the bound</em>. Measured: the gadget falls in{' '}
      <strong>2</strong> (the pathological chooser needed 200,000), and
      the 500-node network needed 22.
    </p>
  ),

  picture: (
    <p>
      Two wide pipelines from source to sink, crossed by one thin
      transfer hose. A naive dispatcher keeps routing single barrels{' '}
      <em>through the hose</em>: each trip moves one barrel and flips
      which pipeline has room, so the next trip uses the hose again,
      backwards: two hundred thousand trips for water that two direct
      runs would move. The BFS dispatcher asks one question first:
      what is the <em>shortest</em> route with room? The hose route is
      longer: it never gets used: two runs, done. The hose was never
      needed; only bad routing made it busy.
    </p>
  ),

  steps: [
    <>
      <strong>BFS the residual graph</strong> from s: first arrival at
      t is a shortest augmenting path.
    </>,
    <>
      <strong>Push the bottleneck</strong> along it; add reverse
      residual edges: the undo mechanism that makes greed safe.
    </>,
    <>
      <strong>Repeat until BFS fails:</strong> ≤ VE/2 rounds by the
      monotone-distance theorem: 22 here.
    </>,
    <>
      <strong>Read the certificate:</strong> the BFS-reachable set of
      the final residual graph is a min cut: capacity == flow, every
      cut edge saturated (asserted everywhere).
    </>,
    <>
      <strong>Spend the cut:</strong> project selection, image
      segmentation, bipartite matching: min-cut is the answer wearing
      a flow costume (one solved and brute-verified here).
    </>,
  ],

  signals: [
    <>
      <strong>Capacities are big or unknown:</strong> the bound must
      not depend on them: E-K&apos;s whole reason (the gadget is the
      demonstration).
    </>,
    <>
      <strong>The cut is the product:</strong> segmentation,
      closure/selection problems, vertex covers via König: the
      certificate side pays the bills.
    </>,
    <>
      <strong>Simplicity with a proof:</strong> E-K is 40 lines and a
      theorem: the flow algorithm you can write and defend in an
      interview.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>Ford-Fulkerson with an
      unspecified chooser</strong>: the same code minus one word, and
      the measured gadget bill is 200,000 augmentations for a flow of
      200,000: one barrel per trip. It is not a strawman: DFS is the
      natural first implementation, and the gadget is two triangles.
      The entire unit is the distance between &quot;a path&quot; and
      &quot;a shortest path&quot;.
    </>
  ),

  strength: (
    <>
      <strong>Capacity-free termination, certificates native, and
      honest simplicity.</strong> The gadget at 2 where the bad chooser
      pays 200,000; 22 augmentations at n = 500 against a VE/2 bound
      of 750,000; duality certified edge-by-edge on every instance and
      confirmed against all 2ⁿ⁻² cuts on 200 small ones; and the
      project-selection application solved by min-cut, matching
      exhaustive search.
    </>
  ),
  weakness: (
    <>
      <strong>O(VE²) is real at scale, and paths are not the only
      way.</strong> Dense adversarial instances drive E-K to its bound:
      Dinic&apos;s level graphs (a live unit) batch shortest paths into
      phases for O(V²E), and push-relabel abandons paths entirely for
      the practical crown on hard instances. Capacity scaling is the
      other classical fix. E-K is the theorem-bearing baseline they
      all improve on.
    </>
  ),

  problem: 'Maximum flow',
  problemSlug: 'maximum-flow',
  rivals: [
    {
      name: 'Edmonds-Karp × BFS paths',
      isThisUnit: true,
      algoName: 'Edmonds-Karp',
      cost: 'O(VE²)',
      wins: (
        <>
          <strong>2 vs 200,000</strong> on the gadget; 22 augmentations
          at scale; the capacity-free bound; 40 defensible lines with
          certificates attached.
        </>
      ),
      costs: (
        <>
          The VE² worst case is reachable on dense hard instances: the
          faster paradigms below exist for a reason.
        </>
      ),
      when: 'The default exact max-flow: interviews, mid-size networks, and anywhere the cut certificate is the point.',
    },
    {
      name: "Dinic's algorithm × blocking flows",
      algoName: "Dinic's algorithm",
      cost: 'O(V²E), O(E√V) unit',
      wins: (
        <>
          The same shortest-path insight, batched: one BFS layering
          feeds many augmentations per phase: a live unit here, and
          Hopcroft-Karp&apos;s parent.
        </>
      ),
      costs: (
        <>
          The level-graph machinery over E-K&apos;s one-BFS-one-path
          simplicity.
        </>
      ),
      when: 'Larger networks and unit-capacity structures: the practical default when E-K starts to crawl.',
    },
    {
      name: 'Push-relabel × FIFO selection',
      algoName: 'Push-relabel',
      cost: 'O(V³) / O(V²√E)',
      wins: (
        <>
          Abandons paths entirely: local pushes and height labels: the
          empirical champion on hard dense instances and the engine of
          serious solvers.
        </>
      ),
      costs: (
        <>
          Preflows violate conservation mid-run: the invariants are
          subtler, and the intuition is nobody&apos;s first.
        </>
      ),
      when: 'Production max-flow at scale: vision segmentation, large assignment: where E-K and Dinic both crawl.',
    },
    {
      name: 'Capacity-scaling max flow',
      algoName: 'Capacity-scaling max flow',
      cost: 'O(E² log C)',
      wins: (
        <>
          The other fix to the same disease: augment only along paths
          with room ≥ Δ, halving Δ: big pipes first, log C rounds.
        </>
      ),
      costs: (
        <>
          The bound re-admits the capacities (log C): elegant, but the
          capacity-free crown stays with BFS.
        </>
      ),
      when: 'When capacities are huge but structured: and as the scaling idea’s cleanest classroom instance.',
    },
  ],
  neverUse: {
    name: 'Unspecified-path augmentation on big capacities',
    why: (
      <>
        The gadget is two triangles and one crossing edge, and the
        measurement is the whole argument: <strong>200,000
        augmentations</strong> moving one barrel each, against 2: on
        capacities of just 10⁵ (make it 10⁹ and the bad chooser runs
        for days; make the capacities irrational and Ford-Fulkerson
        provably never terminates). The disease is invisible in
        correctness testing: every intermediate flow is valid: and
        appears only as mysterious slowness in production. One word:
        BFS: is the vaccine, and the theorem behind it is why the word
        works.
      </>
    ),
  },

  contest: {
    instance:
      'the zigzag gadget at C = 100,000, then a 500-node, 3,000-edge network with capacities to 10⁶; referee: the min-cut certificate on every flow (cut == flow, cut edges saturated, conservation everywhere), plus exhaustive enumeration of all 2ⁿ⁻² cuts on 200 small graphs',
    columns: ['gadget augmentations', 'at scale'],
    rows: [
      {
        method: 'Pathological chooser (FF)',
        values: ['200,000', 'capacity-dependent'],
        verdict: 'one barrel per trip through the hose: 2C, measured',
      },
      {
        method: 'Edmonds-Karp × BFS',
        isThisUnit: true,
        values: ['2', '22 augmentations'],
        best: 0,
        verdict: 'the shortest route never needs the hose: capacity-free',
      },
    ],
    source:
      'python solutions/edmonds_karp_shortest_paths.py prints this table and asserts: duality in both directions on 200 small graphs (flow == min over ALL enumerated cuts, certificate suite passing); the gadget measured at ≥ 2C for the bad chooser and exactly 2 for BFS; the 500-node run at 22 augmentations (bound: 750,000) with its certificate; and the project-selection application (net profit 11 = 35 − 24) matching brute force over all 16 project sets.',
  },

  figure: (
    <Figure
      id="fig-ek-gadget"
      aspect="16 / 7"
      caption="The gadget and the word. Two wide pipes, one thin crossing hose. A path chooser that routes through the hose moves one unit per augmentation and flips the imbalance, re-electing the hose forever: 2C augmentations, measured at 200,000. BFS asks for the shortest residual path: the hose route is longer, is never chosen, and the flow completes in 2. Edmonds and Karp's theorem (residual distances only grow) turns the word into the capacity-free bound VE/2."
      cite={{
        text: 'Edmonds & Karp, "Theoretical Improvements in Algorithmic Efficiency for Network Flow Problems", JACM 19(2), 1972; the scheme and duality: Ford & Fulkerson 1956; the independent sibling: Dinic 1970.',
        href: 'https://doi.org/10.1145/321694.321699',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="The zigzag gadget: source, two wide pipes, a unit crossing edge, sink">
        <circle cx="80" cy="145" r="16" fill="rgba(240,185,75,0.2)" stroke="#f0b94b" strokeWidth="2" />
        <text x="75" y="150" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="12">s</text>
        <circle cx="320" cy="60" r="14" fill="rgba(93,162,255,0.15)" stroke="#5da2ff" strokeWidth="1.5" />
        <text x="315" y="65" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="12">a</text>
        <circle cx="320" cy="230" r="14" fill="rgba(93,162,255,0.15)" stroke="#5da2ff" strokeWidth="1.5" />
        <text x="315" y="235" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="12">b</text>
        <circle cx="560" cy="145" r="16" fill="rgba(98,217,138,0.2)" stroke="#62d98a" strokeWidth="2" />
        <text x="555" y="150" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="12">t</text>
        <line x1="94" y1="136" x2="306" y2="66" stroke="#5da2ff" strokeWidth="5" opacity="0.7" />
        <line x1="94" y1="154" x2="306" y2="224" stroke="#5da2ff" strokeWidth="5" opacity="0.7" />
        <line x1="334" y1="66" x2="546" y2="136" stroke="#5da2ff" strokeWidth="5" opacity="0.7" />
        <line x1="334" y1="224" x2="546" y2="154" stroke="#5da2ff" strokeWidth="5" opacity="0.7" />
        <line x1="320" y1="74" x2="320" y2="216" stroke="#e2606c" strokeWidth="1.5" strokeDasharray="5 4" />
        <text x="330" y="150" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">cap 1: the hose</text>
        <text x="150" y="80" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">C = 100,000</text>
        <text x="60" y="272" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">via the hose: 200,000 augmentations, measured</text>
        <text x="360" y="272" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">BFS shortest: 2 · the hose never chosen</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'edmonds_karp_shortest_paths.py',
  Viz: EdmondsKarpViz,
  narration,
};
