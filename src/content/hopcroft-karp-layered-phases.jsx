import HopcroftKarpViz from '../viz/HopcroftKarpViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/hopcroft_karp_layered_phases.py?raw';
import { narration } from './hopcroft-karp-layered-phases.narration.js';

export const content = {
  given:
    'A bipartite graph: workers and jobs, students and slots, servers and requests.',
  task: 'A maximum matching, in O(E·√V).',
  constraint:
    'Not just a big matching: a certified one. This page proves every answer optimal with the other side of a duality: a vertex cover of exactly the matching’s size, constructed from the final search and checked against every single edge.',

  origins: (
    <p>
      Hopcroft and Karp published the √V phase bound in{' '}
      <strong>1973</strong> (Karzanov independently the same year), and
      it stood as the matching speed record for decades. The deeper
      spine is older: Berge&apos;s lemma (1957: no augmenting path ⇒
      maximum), and <strong>König&apos;s theorem</strong> (1931: in
      bipartite graphs, max matching = min vertex cover), which this
      page uses as its referee. The algorithm is also a family
      reunion: run Dinic&apos;s blocking-flow method (a live unit here)
      on the unit-capacity bipartite network and Hopcroft-Karp is what
      falls out.
    </p>
  ),

  algoRole: (
    <p>
      Owns <strong>augmentation</strong>. An alternating path from a
      free left vertex to a free right one (unmatched, matched,
      unmatched, …) can be <em>flipped</em>, growing the matching by
      one; Berge&apos;s lemma says a matching with no such path is
      maximum. Augmenting one path per search is Kuhn&apos;s O(V·E)
      baseline: measured here at 1,776,030 edge touches, correct and
      6.3× the price.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>phase batch</strong>. One BFS layers the
      whole graph by shortest alternating distance; one DFS then
      harvests a <em>maximal set of vertex-disjoint shortest</em>{' '}
      augmenting paths and flips them all at once. Between phases the
      shortest augmenting length strictly grows, and after √V phases
      fewer than √V augmentations can remain: at most ~2√V phases,
      asserted. The measured graph needed <strong>4</strong> against a
      bound of 200: 279,886 edge touches, with the answer certified by
      König rather than by trust.
    </p>
  ),

  picture: (
    <p>
      A job fair at closing time. Matching one candidate at a time
      means re-walking the entire hall for each: Kuhn&apos;s patient
      shuttle. The phase trick runs the hall like a tide: announce
      &quot;everyone unplaced, one step forward&quot; and let a whole{' '}
      <em>wave</em> of non-interfering shortest reassignment chains
      resolve simultaneously: this candidate takes that job, whose
      previous holder slides to the next, ending at someone unfilled.
      Each wave is longer-reaching than the last, and the theorem says
      the fair ends after about √V waves, not V.
    </p>
  ),

  steps: [
    <>
      <strong>BFS from all free left vertices at once:</strong> layer
      the graph by alternating distance (unmatched edges rightward,
      matched edges leftward).
    </>,
    <>
      <strong>Stop at the first free right layer:</strong> that depth
      is this phase&apos;s shortest augmenting length.
    </>,
    <>
      <strong>DFS harvest:</strong> extract vertex-disjoint shortest
      augmenting paths greedily until none remain in the layering.
    </>,
    <>
      <strong>Flip the batch:</strong> every harvested path augments:
      the matching grows by the batch size.
    </>,
    <>
      <strong>Repeat until BFS finds no free right vertex</strong>: then
      construct the König cover from the final layering: the
      certificate is free.
    </>,
  ],

  signals: [
    <>
      <strong>Assignment without weights:</strong> can everyone be
      placed? Server-request affinities, course slots, crew rostering:
      cardinality is the question.
    </>,
    <>
      <strong>Scale where V·E hurts:</strong> the √V phase bound is the
      difference between seconds and hours on million-edge graphs.
    </>,
    <>
      <strong>You need the certificate:</strong> the König cover (or
      Hall violator set) is the <em>explanation</em>: which bottleneck
      blocks a perfect matching.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>Kuhn&apos;s algorithm</strong>: one
      augmenting DFS per vertex, 30 lines, and the same 4,999 matching
      here at 6.3× the edge touches. On random graphs it is genuinely
      fine (its worst cases are structured); it remains the contest
      default below 10⁵ edges. The phase batch is insurance that costs
      nothing: the same DFS, scheduled better.
    </>
  ),

  strength: (
    <>
      <strong>A √V theorem, and answers that carry their own
      proof.</strong> 4 phases where 200 were permitted; every matching
      on this page (300 small trials and the 50,000-edge instance)
      certified by a constructed König cover touching every edge; the
      Hall-violation gadget diagnosed exactly (10 lefts sharing 3
      rights: matching 5, cover says why). Berge, König, and Hall in
      one working file.
    </>
  ),
  weakness: (
    <>
      <strong>Bipartite only, cardinality only.</strong> General graphs
      need Edmonds&apos; blossom machinery (odd cycles break the
      layering); weighted assignment needs the Hungarian algorithm or
      auctions: the moment jobs have values, this page&apos;s tool
      answers the wrong question. And on benign random graphs the
      measured gap over Kuhn is 6.3×, not the worst-case V/√V: the
      batch pays off most exactly where inputs are structured against
      you.
    </>
  ),

  problem: 'Bipartite matching',
  problemSlug: 'bipartite-matching',
  rivals: [
    {
      name: 'Hopcroft-Karp × layered phases',
      isThisUnit: true,
      algoName: 'Hopcroft-Karp',
      cost: 'O(E·√V)',
      wins: (
        <>
          <strong>4 phases, 279,886 edge touches</strong>, the √V bound
          asserted, and König certificates constructed for every answer.
        </>
      ),
      costs: (
        <>
          Bipartite, unweighted, and the batch machinery over
          Kuhn&apos;s 30 lines.
        </>
      ),
      when: 'Large unweighted bipartite matching, and anywhere the answer must ship with its certificate.',
    },
    {
      name: "Kuhn's algorithm × augmenting DFS",
      algoName: "Kuhn's algorithm",
      cost: 'O(V·E)',
      wins: (
        <>
          Thirty lines, same answer (asserted), and honestly competitive
          on random graphs: <strong>6.3×</strong> the touches here, not
          the worst-case gap.
        </>
      ),
      costs: (
        <>
          Structured instances drive it to its V·E worst case: one path
          per search, every search from scratch.
        </>
      ),
      when: 'Contests and mid-size graphs: the default that fits in your head.',
    },
    {
      name: 'Hungarian algorithm',
      cost: 'O(V³)',
      wins: (
        <>
          The <em>weighted</em> assignment: minimum-cost perfect
          matching via potentials: when jobs have prices, this is the
          question&apos;s true form.
        </>
      ),
      costs: (
        <>
          Cubic, denser machinery, and overkill when every edge weighs
          the same.
        </>
      ),
      when: 'Assignment with values: costs, affinities, tracking associations (SORT runs it every frame).',
    },
    {
      name: "Dinic's algorithm × blocking flows",
      algoName: "Dinic's algorithm",
      cost: 'O(E·√V) on unit graphs',
      wins: (
        <>
          The generalization: Hopcroft-Karp <em>is</em> Dinic on the
          unit-capacity bipartite network: and Dinic keeps working when
          capacities stop being one.
        </>
      ),
      costs: (
        <>
          The flow scaffolding (residual graphs, level rebuilds) is
          heavier than the specialized matcher.
        </>
      ),
      when: 'The moment the problem grows capacities, multiple copies, or source/sink structure.',
    },
  ],
  neverUse: {
    name: 'Greedy matching as the final answer',
    why: (
      <>
        Take-any-available-edge is a fine <em>heuristic</em> (maximal ⇒
        at least half of maximum, and it scored 93.2% on the random
        instance): but the P3 gadget pins it to <strong>exactly
        50%</strong>, constructed: 500 chains where first-edge greed
        blocks both completions, scoring 500 where 1,000 existed. The
        failure mode is silent: greedy returns a plausible number with
        no signal that augmenting paths were left on the table. If the
        answer matters, augment: and if you must know it is right,
        demand the cover.
      </>
    ),
  },

  contest: {
    instance:
      'bipartite 5,000 + 5,000, 50,000 random edges; referee: König’s theorem: a constructed vertex cover of exactly the matching’s size, verified against every edge',
    columns: ['edge touches', 'matching'],
    rows: [
      {
        method: 'Hopcroft-Karp × phases',
        isThisUnit: true,
        values: ['279,886', '4,999'],
        best: 0,
        verdict: '4 phases against a permitted 200: the √V bound at work',
      },
      {
        method: 'Kuhn, one path at a time',
        values: ['1,776,030', '4,999'],
        verdict: 'same answer (asserted), 6.3× the touches on friendly ground',
      },
      {
        method: 'Greedy (no augmenting)',
        values: ['~50,000', '4,659'],
        verdict: '93.2% here, exactly 50% on its gadget: cheap and uncertifiable',
      },
    ],
    source:
      'python solutions/hopcroft_karp_layered_phases.py prints this table and asserts: 300 small trials where Hopcroft-Karp equals Kuhn equals exhaustive brute force AND each answer is König-certified (cover size equal, every edge covered); the Hall-violation gadget matched at exactly 5 = 3+1+1; the phase count within 2√V at scale with the 4,999-vertex cover checked against all 50,000 edges; greedy’s maximal-matching half-bound holding, and its P3 gadget pinning it to exactly 500 of 1,000.',
  },

  figure: (
    <Figure
      id="fig-hk-phases"
      aspect="16 / 7"
      caption="One phase. BFS from every free left vertex layers the graph by alternating distance: forward on unmatched edges, backward on matched ones: stopping at the first layer containing a free right vertex. A DFS then harvests vertex-disjoint shortest augmenting paths and flips the whole batch. The shortest length strictly grows each phase, so ~2√V phases suffice: the measured graph needed 4. The final failed BFS is not waste: its reachable set IS König's minimum vertex cover, the certificate."
      cite={{
        text: 'Hopcroft & Karp, "An n^{5/2} Algorithm for Maximum Matchings in Bipartite Graphs", SIAM J. Computing 2, 1973; the referee is König 1931; the augmenting principle is Berge 1957.',
        href: 'https://doi.org/10.1137/0202019',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="Bipartite layers with two disjoint augmenting paths flipping in one phase">
        {[0, 1, 2, 3].map((i) => (
          <circle key={`l${i}`} cx="120" cy={50 + i * 60} r="9" fill={i < 2 ? 'rgba(240,185,75,0.25)' : 'rgba(93,162,255,0.2)'} stroke={i < 2 ? '#f0b94b' : '#5da2ff'} strokeWidth="1.5" />
        ))}
        {[0, 1, 2, 3].map((i) => (
          <circle key={`r${i}`} cx="420" cy={50 + i * 60} r="9" fill={i > 1 ? 'rgba(240,185,75,0.25)' : 'rgba(93,162,255,0.2)'} stroke={i > 1 ? '#f0b94b' : '#5da2ff'} strokeWidth="1.5" />
        ))}
        <line x1="129" y1="50" x2="411" y2="170" stroke="#62d98a" strokeWidth="2.2" />
        <line x1="129" y1="110" x2="411" y2="230" stroke="#62d98a" strokeWidth="2.2" />
        <line x1="129" y1="170" x2="411" y2="50" stroke="#9aa5bd" strokeWidth="1.2" strokeDasharray="5 4" />
        <line x1="129" y1="230" x2="411" y2="110" stroke="#9aa5bd" strokeWidth="1.2" strokeDasharray="5 4" />
        <text x="480" y="54" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">amber = free</text>
        <text x="480" y="74" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">green = augmenting</text>
        <text x="480" y="94" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">dashed = matched</text>
        <text x="60" y="270" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="12">two disjoint shortest paths flip in ONE phase · lengths strictly grow · ~2√V phases total (measured: 4)</text>
        <text x="130" y="26" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">L</text>
        <text x="412" y="26" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">R</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'hopcroft_karp_layered_phases.py',
  Viz: HopcroftKarpViz,
  narration,
};
