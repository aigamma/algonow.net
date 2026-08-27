import PrimViz from '../viz/PrimViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/prims_cheapest_crossing.py?raw';
import { narration } from './prims-cheapest-crossing.narration.js';

export const content = {
  given:
    'Sites to wire together: vertices, weighted edges, one connected network required.',
  task: 'The spanning tree of minimum total weight: grown as one tree, from a seed.',
  constraint:
    'The license for every greedy step must be audited, not cited: for the finished tree, each edge is removed in turn, the two components recovered, and the edge asserted no heavier than every crossing edge: the cut property checked n−1 times on every one of 300 graphs.',

  origins: (
    <p>
      Named for Robert Prim, Bell Labs <strong>1957</strong>: wiring
      terminals with the least copper: with Dijkstra publishing the
      same procedure independently in 1959. The true origin is
      earlier and quieter: <strong>Vojtěch Jarník</strong>, 1930, in
      a Czech journal, answering Borůvka&apos;s electrification-of-
      Moravia problem: the algorithm predates its name by 27 years
      (this site&apos;s recurring pattern: Jacobi beat the
      Hungarian method by a century). The MST trio: Borůvka 1926,
      Jarník 1930, Kruskal 1956: is the oldest complete shelf in
      combinatorial optimization.
    </p>
  ),

  algoRole: (
    <p>
      Owns <strong>single-tree growth</strong>: start at a seed, keep
      a frontier of edges leaving the tree in a heap (lazy deletion:
      pop, discard if stale), and absorb one vertex per round:
      O(E log V), measured at 10,257 heap operations on the dense
      graph where Kruskal&apos;s global sort bills 159,232
      comparisons. One tree the whole way: no forest bookkeeping,
      no union-find: the frontier <em>is</em> the state.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>cheapest crossing edge</strong>, licensed
      by the cut property: for any cut, the lightest crossing edge
      belongs to some MST: swap it into any tree missing it, a cycle
      forms, some other crossing edge leaves, the total never rises.
      This page <em>audits</em> the license: every tree edge, on
      every one of 300 graphs, verified minimal across the cut its
      removal defines: the exchange argument checked, not quoted:
      plus 50 graphs against enumeration of <em>all</em> spanning
      trees.
    </p>
  ),

  picture: (
    <p>
      An island electrifying itself from one power station. At every
      moment there is a lit region and a dark region, and exactly one
      economic question: of all the wires that could cross from
      light to dark, which is cheapest? Buy it, light one more
      village, ask again. The cut property is the reason no
      committee is needed: whatever the future holds, the cheapest
      crossing wire is never a mistake: any plan that omits it can
      be improved by swapping it in. And the one-keystroke trap
      lives here too: ask instead &quot;which village is cheapest to
      reach <em>from the station</em>&quot; and you are building
      commuter routes, not cheap wiring: measured below at 8.2× the
      copper.
    </p>
  ),

  steps: [
    <>
      <strong>Seed:</strong> any vertex: the lit region of one.
    </>,
    <>
      <strong>Offer:</strong> push every edge leaving the lit region
      into the heap.
    </>,
    <>
      <strong>Absorb:</strong> pop the cheapest; discard if both ends
      already lit (lazy deletion); else buy it and light the new
      vertex.
    </>,
    <>
      <strong>Repeat to n−1 edges:</strong> the cut property licenses
      every purchase: audited here edge by edge.
    </>,
    <>
      <strong>Mind the keystroke:</strong> key = w, never d + w: the
      latter is Dijkstra, a different question (8.2× measured on the
      hub gadget).
    </>,
  ],

  signals: [
    <>
      <strong>One component, total cost:</strong> cabling, pipelines,
      cluster merges: connectivity is the requirement, sum of wire
      the objective.
    </>,
    <>
      <strong>Adjacency in hand, dense graphs:</strong> the frontier
      heap touches only edges it meets: dense graphs bill 10K heap
      ops where the global sort pays 159K.
    </>,
    <>
      <strong>The tree must grow from somewhere:</strong> online
      absorption from a seed (a data center, a root site) is
      Prim&apos;s natural shape: Kruskal&apos;s forest has no center.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the live <strong>Kruskal</strong> unit:
      globally sort edges, union-find the forest: equal answers on
      all 300 graphs here (identical edge <em>sets</em> under
      distinct weights). The abstract meter favors Prim both ways
      (10K vs 159K dense, 11K vs 94K sparse: the global sort is the
      bill): and the honest asterisk: in wall-clock, Python&apos;s
      C-speed sort makes Kruskal effectively free at these sizes:
      the op meter and the stopwatch disagree, and the page says
      which is which: the Toom unit&apos;s model-vs-hardware lesson,
      again.
    </>
  ),

  strength: (
    <>
      <strong>The license audited, the referees stacked.</strong>{' '}
      Weight-equal to Kruskal on 300 graphs; equal to enumeration of
      all spanning trees on 50; identical edge sets under distinct
      weights (the unique-MST theorem exercised); the cut property
      verified for every tree edge everywhere: the exchange argument
      as a running assertion: and the cabling client ordered
      cleanly: MST 9.32 &lt; nearest-neighbor chain 11.97 &lt; best
      hub star 76.65.
    </>
  ),
  weakness: (
    <>
      <strong>Needs adjacency, sits still, and one keystroke from a
      different algorithm.</strong> Prim wants neighbor lists (an
      edge stream favors Kruskal&apos;s sort); the MST is static
      (edge updates want dynamic-MST machinery); and the deepest
      hazard is pedagogical: key by d + w instead of w and the loop
      silently computes Dijkstra&apos;s shortest-path tree: same
      structure, same heap, different question: 400 vs 49 on the
      hub gadget: correct-looking code, 8.2× the copper.
    </>
  ),

  problem: 'Minimum spanning tree',
  problemSlug: 'minimum-spanning-tree',
  rivals: [
    {
      name: 'Prim × cheapest crossing',
      isThisUnit: true,
      algoName: "Prim's algorithm",
      cost: 'O(E log V)',
      wins: (
        <>
          <strong>One tree, no forest bookkeeping</strong>: 10,257
          heap ops where the sort bills 159,232: and the cut license
          audited edge by edge.
        </>
      ),
      costs: (
        <>
          Wants adjacency lists and a seed: edge streams and
          parallelism belong to the rivals.
        </>
      ),
      when: 'Dense graphs in adjacency form, or growth from a designated root.',
    },
    {
      name: 'Kruskal × union-find',
      algoName: "Kruskal's algorithm",
      cost: 'O(E log E)',
      wins: (
        <>
          The live unit: sort once, sweep once: forest merging with
          near-free finds: simplest to prove, and C-speed sorts make
          it fast in practice.
        </>
      ),
      costs: (
        <>
          Must sort ALL edges before buying one: the global bill this
          page&apos;s meter shows at 159K on the dense graph.
        </>
      ),
      when: 'Edge lists and sparse graphs: and whenever union-find is already on the table.',
    },
    {
      name: 'Borůvka × component hooks',
      algoName: "Borůvka's algorithm",
      cost: 'O(E log V), parallel',
      wins: (
        <>
          The 1926 original: every component grabs its cheapest
          outgoing edge <em>simultaneously</em>: rounds halve the
          components: the parallel and distributed MST.
        </>
      ),
      costs: (
        <>
          Round bookkeeping and tie discipline: sequentially it buys
          nothing over its two children.
        </>
      ),
      when: 'GPU and distributed MST: and inside the fancy linear-time hybrids.',
    },
    {
      name: 'Dijkstra × frontier keys',
      algoName: "Dijkstra's algorithm",
      cost: 'O(E log V)',
      wins: (
        <>
          The live unit one keystroke away: keys d + w instead of w:
          cheapest <em>routes from the root</em>: the right answer
          to the other question.
        </>
      ),
      costs: (
        <>
          As an MST substitute: 400 vs 49 on the hub gadget: nearly
          every spoke bought at full price.
        </>
      ),
      when: 'Latency from a source: never total copper: read the objective twice.',
    },
  ],
  neverUse: {
    name: 'Dijkstra keys in a Prim loop',
    why: (
      <>
        The two algorithms share everything: the heap, the frontier,
        the visited set, the loop: except one expression: Prim keys
        an edge by its own weight w; Dijkstra keys by d + w, the
        accumulated distance. Type the second in the first&apos;s
        loop and nothing crashes: a spanning tree still emerges,
        connected, plausible, <em>reviewable</em>: and on the hub
        gadget it costs <strong>400 against the MST&apos;s 49</strong>:
        a shortest-path tree buys nearly every spoke at full price
        because every village wants its own fast line to the
        station. Both trees are correct answers: to different
        questions: minimum total copper versus minimum travel time
        from the root. The defense is not care: it is the audit this
        page runs: check a tree edge against its cut, and the
        impostor fails on the first ring edge it skipped.
      </>
    ),
  },

  contest: {
    instance:
      'minimum spanning tree; referee: Kruskal equal on 300 graphs, ALL spanning trees enumerated on 50, the cut property audited edge by edge everywhere',
    columns: ['Prim heap ops', 'Kruskal ops'],
    rows: [
      {
        method: 'Dense: n=200, m=9,950',
        isThisUnit: true,
        values: ['10,257', '159,232'],
        best: 0,
        verdict: 'the frontier touches what it meets: the sort must touch all of m',
      },
      {
        method: 'Sparse: n=2,000, m=6,000',
        values: ['10,923', '94,080'],
        verdict: 'the abstract meter: with C-speed sorts the stopwatch tells it differently',
      },
      {
        method: 'Hub gadget: Dijkstra keys',
        values: ['tree cost 400', 'MST 49'],
        verdict: 'one keystroke, 8.2×: a different question answered perfectly',
      },
    ],
    source:
      "python solutions/prims_cheapest_crossing.py prints this table and asserts: Prim == Kruskal on 300 graphs; == enumeration of all spanning trees on 50; identical edge SETS under distinct weights on 100; the cut property audited for every tree edge on every graph (edge minimal across the cut its removal defines); the dense/sparse meters; the hub gadget (MST exactly 49 = one spoke + the ring, SPT ≥ 320, measured 400, 8.2×); and the cabling client ordered MST 9.32 < NN chain 11.97 < best star 76.65. Build note: the graph generator's uncapped m spun forever on small n (caught at 11 minutes, capped at n(n−1)/2).",
  },

  figure: (
    <Figure
      id="fig-prim-cut"
      aspect="16 / 7"
      caption="The lit region and the dark. At every step one question: the cheapest wire crossing from light to dark: and the cut property is why no foresight is needed: any plan omitting that wire improves by swapping it in. This page audits the license on every finished tree: each edge removed, the cut recovered, minimality asserted. The one-keystroke trap: key by accumulated distance instead of edge weight, and the same loop grows a shortest-path tree: 400 vs 49 on the hub gadget: commuter routes, not cheap wiring."
      cite={{
        text: 'Prim, "Shortest Connection Networks and Some Generalizations", Bell System Technical Journal 36(6), 1957: anticipated by Jarník (1930) answering Borůvka\'s electrification problem: the algorithm predates its name by 27 years.',
        href: 'https://doi.org/10.1002/j.1538-7305.1957.tb01515.x',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="A lit tree region and dark vertices with crossing edges, the cheapest highlighted">
        <circle cx="150" cy="140" r="95" fill="rgba(240,185,75,0.08)" stroke="#f0b94b" strokeDasharray="6 5" />
        {[[120, 100], [180, 130], [130, 180]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={9} fill="#f0b94b" />
        ))}
        <line x1="120" y1="100" x2="180" y2="130" stroke="#f0b94b" strokeWidth="2" />
        <line x1="180" y1="130" x2="130" y2="180" stroke="#f0b94b" strokeWidth="2" />
        {[[420, 70], [480, 150], [410, 220], [560, 100]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={9} fill="none" stroke="#5a647d" strokeWidth="2" />
        ))}
        <line x1="180" y1="130" x2="420" y2="70" stroke="#62d98a" strokeWidth="2.4" />
        <text x="270" y="85" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">3 · the cheapest crossing: buy it</text>
        <line x1="180" y1="130" x2="480" y2="150" stroke="#2a3450" strokeWidth="1.4" />
        <text x="320" y="158" fill="#5a647d" fontFamily="ui-monospace, monospace" fontSize="10">7</text>
        <line x1="130" y1="180" x2="410" y2="220" stroke="#2a3450" strokeWidth="1.4" />
        <text x="260" y="214" fill="#5a647d" fontFamily="ui-monospace, monospace" fontSize="10">9</text>
        <text x="60" y="40" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">the lit region</text>
        <text x="470" y="40" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">the dark</text>
        <text x="40" y="262" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">audited: every tree edge minimal across its cut, 300 graphs · the keystroke trap measured at 8.2×</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'prims_cheapest_crossing.py',
  Viz: PrimViz,
  narration,
};
