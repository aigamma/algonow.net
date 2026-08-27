import BellmanFordViz from '../viz/BellmanFordViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/bellman_ford_early_exit.py?raw';
import { narration } from './bellman-ford-early-exit.narration.js';

export const content = {
  given:
    'A directed graph whose edge weights may be negative, and a source.',
  task: 'Shortest paths to every vertex, or a certified negative cycle.',
  constraint:
    'Greed is disqualified before the race starts: Dijkstra’s settled-means-final assumption fails with negative edges, measured below at 852 wrong distances out of 1,000 and certified on a three-edge gadget.',

  origins: (
    <p>
      The name records a relay team. Shimbel stated the relaxation idea
      in 1955; Lester Ford published the algorithm at RAND in{' '}
      <strong>1956</strong>; Richard Bellman gave it the dynamic
      programming frame in <strong>1958</strong> (&quot;On a routing
      problem&quot;); Moore arrived independently in 1959. The routing
      title was prophetic: distance-vector protocols like RIP are this
      algorithm running <em>distributed</em>, each router relaxing its
      neighbors&apos; announcements. And the finance reading is exact:
      write exchange rates as −log weights and an arbitrage loop{' '}
      <em>is</em> a negative cycle: the detector below finds one and
      multiplies it out to 1.0064.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>relaxation rounds</strong>. Sweep every edge and
      ask: does the path through u improve v? The induction is the whole
      proof: after round i, every shortest path using at most i edges is
      final, so n−1 rounds settle everything settleable, and a round n
      that <em>still</em> improves something has proven a negative cycle
      (which the code walks back and hands over as a certificate). No
      ordering, no priority queue, no assumptions about signs: just the
      edge list, n−1 times.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>early exit</strong>. A full pass that changes
      nothing is a fixpoint, and the fixpoint is the answer: stop. The
      guarantee n−1 is a worst case owned by pathological long chains;
      real sparse graphs converge in about their hop diameter, measured
      here as <strong>9 rounds instead of 999</strong>: 45,000 edge
      relaxations where the full schedule spends 5,000,000, identical
      distances, asserted element by element.
    </p>
  ),

  picture: (
    <p>
      A village telephone chain. Each evening, every household calls its
      neighbors with the cheapest travel route it knows so far. News that
      needs i hops to travel arrives by evening i, so n−1 evenings
      guarantee every rumor has landed. The early exit is common sense:
      an evening when nobody learns anything means nobody will ever learn
      anything: hang up. And if the phone tree is <em>still</em> buzzing
      on evening n, someone is quoting a route that undercuts itself
      every lap: a loop of profitable hops: and the village has
      discovered arbitrage, not a shortest path.
    </p>
  ),

  steps: [
    <>
      <strong>Initialize:</strong> dist[source] = 0, everything else ∞.
    </>,
    <>
      <strong>Relax every edge:</strong> for each (u, v, w), if dist[u] +
      w &lt; dist[v], improve dist[v] and record the predecessor.
    </>,
    <>
      <strong>Early exit:</strong> a sweep with no improvement is the
      fixpoint: return (measured: round 9 of a possible 999).
    </>,
    <>
      <strong>Cycle round:</strong> an improvement in round n proves a
      negative cycle; walk predecessors n steps to land inside it.
    </>,
    <>
      <strong>Certify:</strong> hand back the cycle and its weight sum
      (−120 in the planted test), never just a boolean.
    </>,
  ],

  signals: [
    <>
      <strong>Negative costs are real:</strong> rebates, arbitrage
      −log-rates, potentials in Johnson&apos;s all-pairs preprocessing,
      penalties mixed with rewards.
    </>,
    <>
      <strong>The cycle is the product:</strong> currency loops,
      constraint systems (difference constraints are exactly this), and
      anywhere &quot;no solution&quot; must arrive with a witness.
    </>,
    <>
      <strong>Edge-list-only or distributed settings:</strong> the sweep
      needs no adjacency structure or ordering, which is why routers
      could run it in 1988 and streams can run it now.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the <strong>full n−1 schedule</strong>:
      5,000,000 relaxations on the measured graph, correct and
      unconditional. The early exit takes the same worst-case insurance
      and pays real-graph prices: 45,000. And the greedy alternative is
      not a baseline at all here: Dijkstra spends the least (4,941) and
      gets <strong>852 vertices wrong</strong>, because settling early is
      exactly what negative edges punish.
    </>
  ),

  strength: (
    <>
      <strong>Unconditional correctness, certified failure, and a
      distributed soul.</strong> Signs do not matter, orderings do not
      matter, and when no answer exists the algorithm returns the
      negative cycle itself (sum −120, asserted), not a shrug. The
      Johnson referee confirms every distance through an independent
      weight space. The early exit makes the honest worst case pay
      benign-graph prices: 9 rounds, measured.
    </>
  ),
  weakness: (
    <>
      <strong>O(nm) worst case, and greed is 9× cheaper where greed is
      legal.</strong> On nonnegative graphs Dijkstra spends 4,941
      relaxations to the early exit&apos;s 45,000: never pay the
      negative-edge insurance on a graph without negative edges. SPFA
      queues away more waste (9,306 here) but dies on adversarial
      instances (its O(nm) killers are contest-setter routine). The
      distributed reading inherits counting-to-infinity, which is a slow
      rediscovery of the same worst case.
    </>
  ),

  problem: 'Single-source shortest paths',
  problemSlug: 'single-source-shortest-paths',
  rivals: [
    {
      name: 'Bellman-Ford × early exit',
      isThisUnit: true,
      algoName: 'Bellman-Ford',
      cost: 'O(n·m) worst, ~diameter rounds real',
      wins: (
        <>
          <strong>45,000 relaxations, 0 wrong</strong>, negative edges
          welcome, cycles certified with their sum: the unconditional
          tool.
        </>
      ),
      costs: (
        <>
          Pays for generality: 9× Dijkstra&apos;s price on ground where
          greed is legal, and the worst case really is n·m.
        </>
      ),
      when: 'Negative weights, needed certificates, difference constraints, or any edge-list-only and distributed setting.',
    },
    {
      name: "Dijkstra's algorithm",
      cost: 'O(m log n)',
      wins: (
        <>
          <strong>4,941 relaxations</strong> here: the cheapest race by
          far, and the right default whenever weights are provably
          nonnegative.
        </>
      ),
      costs: (
        <>
          <strong>852 of 1,000 distances wrong</strong> on this graph:
          the settled-means-final greed is refuted by a three-edge gadget
          the tests certify.
        </>
      ),
      when: 'Nonnegative weights, always: and via Johnson’s potential trick, even negative graphs after one Bellman-Ford preprocessing pass.',
    },
    {
      name: 'SPFA × small-label-first queueing',
      algoName: 'SPFA',
      cost: 'O(n·m) worst, ~2m benign',
      wins: (
        <>
          <strong>9,306 relaxations</strong>: queueing only the vertices
          whose distance moved skips the sweep&apos;s dead weight
          entirely on benign graphs.
        </>
      ),
      costs: (
        <>
          Adversarial killers restoring the full O(n·m) are standard
          contest-setter equipment; the name is a running obituary in
          competitive programming.
        </>
      ),
      when: 'Random or trusted sparse graphs with negatives, where you control the inputs and want the constant.',
    },
    {
      name: 'Distance-vector routing × Bellman-Ford exchange',
      algoName: 'Distance-vector routing',
      cost: 'O(diameter) rounds, distributed',
      wins: (
        <>
          The same relaxation run by <em>routers</em>: each node needs
          only its neighbors&apos; tables, which is why RIP could route
          the early Internet with no global view.
        </>
      ),
      costs: (
        <>
          Counting-to-infinity on link failure: the distributed rewrite
          of the same worst case, patched in practice by split horizon
          and hop limits.
        </>
      ),
      when: 'When the graph is the network itself and no node may hold it all.',
    },
  ],
  neverUse: {
    name: 'Dijkstra on unproven signs',
    why: (
      <>
        The failure is not statistical: dist[1] settles at 4 in the
        three-edge gadget while the true path costs 2, certified in the
        tests, and on the measured graph the damage is 852 wrong
        distances out of 1,000: silently, with no error raised. A
        shortest-path answer that is wrong and confident is worse than a
        slow one, because nothing downstream knows to distrust it. Prove
        the signs or pay the insurance: the one thing you may not do is
        assume.
      </>
    ),
  },

  contest: {
    instance:
      'n = 1,000, m = 5,000 directed, 2,017 negative edges, no negative cycle (proven by the potential construction); referee: Dijkstra rerun in Johnson’s shifted nonnegative weight space agrees on every distance',
    columns: ['edge relaxations', 'wrong distances'],
    rows: [
      {
        method: 'Bellman-Ford, full n−1',
        values: ['5,000,000', '0'],
        verdict: 'the unconditional schedule, paying full insurance',
      },
      {
        method: 'Bellman-Ford × early exit',
        isThisUnit: true,
        values: ['45,000', '0'],
        best: 0,
        verdict: '9 rounds instead of 999: the fixpoint is the answer',
      },
      {
        method: 'SPFA (queued)',
        values: ['9,306', '0'],
        verdict: 'cheapest here; adversarial killers cited in its card',
      },
      {
        method: 'Dijkstra, negative edges',
        values: ['4,941', '852'],
        verdict: 'fast, confident, and wrong: greed settles too early',
      },
    ],
    source:
      'python solutions/bellman_ford_early_exit.py prints this table and asserts: 200 exhaustive-referee trials on small graphs with real negative edges; early exit equals the full fixpoint exactly; the Johnson-space Dijkstra referee confirms all 1,000 distances; SPFA agrees; the gadget certifies Dijkstra’s failure deterministically; the planted negative cycle comes back as a vertex list summing to −120; and the constructed FX loop multiplies to 1.0064 > 1.',
  },

  figure: (
    <Figure
      id="fig-bf-horizons"
      aspect="16 / 7"
      caption="Rounds are hop horizons. After round i, every shortest path of at most i edges is final: the induction that is the whole proof. The guarantee says run n−1 rounds; the measured graph was done in 9, and the early exit knows it: a silent round is a fixpoint. A round n that still improves has proven a negative cycle, and the predecessor walk hands it back with its sum."
      cite={{
        text: 'Bellman, "On a routing problem", Quarterly of Applied Mathematics 16, 1958; Ford, RAND P-923, 1956. The arbitrage reading via −log weights is folklore made exact; the distributed form is RIP (RFC 1058).',
        href: 'https://doi.org/10.1090/qam/102435',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="Expanding hop horizons from the source, with the early exit and the cycle round">
        <circle cx="110" cy="130" r="8" fill="#f0b94b" />
        <text x="102" y="112" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">source</text>
        {[38, 72, 106, 140].map((r, i) => (
          <circle key={i} cx="110" cy="130" r={r} fill="none" stroke="#5da2ff" strokeWidth="1.2" strokeDasharray={i === 3 ? '4 4' : 'none'} opacity={0.85 - i * 0.15} />
        ))}
        {['≤1 edge', '≤2 edges', '≤3 edges', '…'].map((s, i) => (
          <text key={i} x={118 + (i === 3 ? 130 : 30 + i * 34)} y={i === 3 ? 130 : 128 - 0} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10" transform={`translate(0 ${-30 - i * 33})`}>{i < 3 ? s : ''}</text>
        ))}
        <text x="140" y="66" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">round i finalizes ≤ i-edge paths</text>
        <text x="330" y="60" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="12">early exit: a silent round is a fixpoint</text>
        <text x="330" y="82" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="12">measured: 9 rounds where 999 were allowed</text>
        <text x="330" y="104" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="12">45,000 relaxations instead of 5,000,000</text>
        <text x="330" y="146" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="12">round n still improving ⇒ negative cycle</text>
        <text x="330" y="168" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="12">walk predecessors n steps → inside it</text>
        <text x="330" y="190" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="12">return the loop + its sum: a certificate</text>
        <text x="330" y="232" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">−log(rates): arbitrage loop ⇒ negative cycle</text>
        <text x="330" y="252" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">found here: a loop multiplying to 1.0064</text>
        <text x="24" y="272" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">no ordering, no queue, no sign assumptions: the edge list, swept</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'bellman_ford_early_exit.py',
  Viz: BellmanFordViz,
  narration,
};
