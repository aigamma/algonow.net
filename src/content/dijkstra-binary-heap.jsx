import DijkstraViz from '../viz/DijkstraViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/dijkstra_binary_heap.py?raw';
import { narration } from './dijkstra-binary-heap.narration.js';

export const content = {
  given:
    'A directed graph whose edges carry nonnegative weights, and one source vertex.',
  task: 'Return the shortest distance from the source to every reachable vertex.',
  constraint:
    'Every weight is at least zero. That single assumption is what licenses the whole method, and dropping it breaks the answer rather than slowing it.',

  origins: (
    <p>
      Edsger Dijkstra designed it in 1956, in about twenty minutes, at a cafe
      terrace in Amsterdam while shopping with his fiancee. He published it in
      1959 in a three-page paper, without a priority queue: the original scans
      every unsettled vertex each round, which costs{' '}
      <strong>O(V²)</strong>. The heap arrived later, and the pairing is the
      reason the same 1959 proof still runs continental road networks today.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>proof</strong>. Settle the nearest unsettled vertex and
      its distance can never improve, because every other route to it would
      have to leave through a vertex that is already further away, and no edge
      can subtract distance. Relax that vertex&apos;s outgoing edges, repeat.
      The invariant is the algorithm; everything else is bookkeeping.
    </p>
  ),
  heurRole: (
    <p>
      Answers one question fast: <strong>which unsettled vertex is
      nearest?</strong> A binary heap does it in O(log V) instead of O(V), so
      total cost falls from O(V²) to <strong>O(E log V)</strong>. It never
      changes the answer, only the price. The implementation uses{' '}
      <strong>lazy deletion</strong>: push an improved key rather than
      decreasing one in place, and skip stale entries on pop.
    </p>
  ),

  picture: (
    <p>
      Water poured into a model of the road network at one town, flowing at
      equal speed down every road. The instant water reaches a town, the route
      it arrived by is the shortest one, because water takes every path at
      once and this was the first to arrive. Dijkstra&apos;s method is that
      flood. The priority queue is simply the clipboard that tells you which
      town the water reaches next, without walking the whole map to check.
    </p>
  ),

  steps: [
    <>
      <strong>Seed:</strong> distance 0 at the source, unknown everywhere
      else, and push the source onto the heap.
    </>,
    <>
      <strong>Pop</strong> the smallest key. If that vertex is already
      settled, or the key is stale, discard it and pop again.
    </>,
    <>
      <strong>Settle it.</strong> Its distance is now final and will never be
      revised, which is exactly the claim nonnegativity buys.
    </>,
    <>
      <strong>Relax</strong> each outgoing edge: if going through this vertex
      is cheaper than the best known route to the neighbour, record the
      shorter distance and push the neighbour at its new key.
    </>,
    <>
      <strong>Repeat</strong> until the heap empties. Anything never pushed
      was never reachable.
    </>,
  ],

  signals: [
    <>
      Edge weights are <strong>nonnegative</strong>, so a settled vertex can
      never be improved later.
    </>,
    <>
      You want distances from <strong>one source to many targets</strong>, not
      one specific pair.
    </>,
    <>
      The graph is <strong>sparse</strong>: far fewer edges than V², which is
      where the heap pays for itself.
    </>,
  ],
  baseline: (
    <>
      The 1959 scan is the honest baseline and it is not a straw man: it wins
      on dense graphs. On the 900-vertex sparse grid below the heap does{' '}
      <strong>5,687</strong> units of work against the scan&apos;s{' '}
      <strong>814,380</strong>, a 143× gap. On a dense 250-vertex graph the
      same comparison narrows to <strong>63,497 against 125,000</strong>, and
      once constant factors are counted the flat array is genuinely
      competitive there.
    </>
  ),

  strength: (
    <>
      <strong>One proof, many prices.</strong> The correctness argument is
      independent of the container, so the same twenty lines scale from a
      teaching example to a road network by swapping the queue, and the answer
      is provably identical at every size.
    </>
  ),
  weakness: (
    <>
      <strong>Nonnegativity is load-bearing.</strong> One negative edge and
      the settle-once invariant collapses: the algorithm does not slow down,
      it returns a wrong number without any warning. The tested solution below
      pins an instance where it reports 2 and the true distance is -4.
    </>
  ),

  problem: 'Nonnegative shortest paths',
  problemSlug: 'single-source-shortest-paths',
  rivals: [
    {
      name: 'Dijkstra × binary heap',
      isThisUnit: true,
      algoName: "Dijkstra's algorithm",
      cost: 'O(E log V)',
      wins: (
        <>
          <strong>5,687 units</strong> where the scan needs 814,380 on a
          sparse graph: a <strong>143× saving</strong> for the identical
          distances.
        </>
      ),
      costs: (
        <>
          A heap and its stale entries. On dense graphs the log factor buys
          almost nothing, and the constant factor can make it lose.
        </>
      ),
      when: 'Sparse graphs, which is most real ones: roads, dependencies, social links.',
    },
    {
      name: 'Dijkstra × linear scan',
      algoName: "Dijkstra's algorithm",
      cost: 'O(V²)',
      wins: (
        <>
          No priority queue at all, ten lines, and on a{' '}
          <strong>dense</strong> graph it is genuinely competitive: 125,000
          against the heap&apos;s 63,497 with a far smaller constant.
        </>
      ),
      costs: (
        <>
          The scan cost is paid <strong>whether or not edges exist</strong>:
          814,380 units on a graph with only 3,480 edges.
        </>
      ),
      when: 'E approaches V², or V is small enough that the constant dominates.',
    },
    {
      name: 'Bellman-Ford',
      cost: 'O(V · E)',
      wins: (
        <>
          Survives <strong>negative weights</strong>, and detects negative
          cycles. On the trap instance it returns the true -4 where Dijkstra
          reports 2.
        </>
      ),
      costs: (
        <>
          <strong>17,400 units against 5,687</strong> on the same graph:
          roughly three times the work when the weights are nonnegative
          anyway.
        </>
      ),
      when: 'Any weight might be negative: currency arbitrage, profit-and-loss edges, potentials.',
    },
    {
      name: 'Breadth-first search',
      cost: 'O(V + E)',
      wins: (
        <>
          The cheapest row by far, <strong>900 units</strong>, and the
          simplest code on the page.
        </>
      ),
      costs: (
        <>
          <strong>Wrong here.</strong> It counts edges, not weight, so it is
          correct only when every edge costs the same. A queue is a heap for a
          graph where all keys are equal.
        </>
      ),
      when: 'Genuinely unweighted graphs, where paying for a priority queue buys nothing.',
    },
  ],
  neverUse: {
    name: 'Floyd-Warshall, when you have one source',
    why: (
      <>
        It computes <strong>every pair</strong> of distances in{' '}
        <strong>O(V³)</strong>. On the 900-vertex graph below that is roughly{' '}
        <strong>729 million</strong> operations and an 810,000-entry matrix,
        to answer a question the heap answers in 5,687 units of work: about{' '}
        <strong>128,000 times more work</strong> for 899 answers nobody asked
        for. It becomes the right tool the moment you genuinely want all
        pairs on a dense graph, and never before.
      </>
    ),
  },

  contest: {
    instance:
      'a 900-vertex grid graph with 3,480 weighted edges, all distances from vertex 0; work is queue operations plus edges examined, the same unit for every method',
    columns: ['work', 'answer'],
    rows: [
      {
        method: 'Dijkstra × binary heap',
        isThisUnit: true,
        values: ['5,687', 'correct'],
        best: 0,
        verdict: 'the same proof, priced by a better container',
      },
      {
        method: 'Dijkstra × linear scan',
        values: ['814,380', 'correct'],
        verdict: 'identical distances, 143× the work on a sparse graph',
      },
      {
        method: 'Bellman-Ford',
        values: ['17,400', 'correct'],
        verdict: 'three times the cost, and the only one that survives negative edges',
      },
      {
        method: 'Breadth-first search',
        values: ['900', 'wrong'],
        verdict: 'cheapest and incorrect: it counts hops, not weight',
      },
    ],
    source:
      'python solutions/dijkstra_binary_heap.py prints this table and asserts the three exact methods agree. On a dense 250-vertex graph the gap narrows to 63,497 against 125,000, which is the crossover the choice of container turns on.',
  },

  figure: (
    <Figure
      id="fig-dijkstra-crossover"
      aspect="16 / 8"
      caption="Where the container stops mattering. The scan pays V² whether or not edges exist, so its cost is a flat wall. The heap pays E log V, which grows with the edges actually present. On sparse graphs that is a 143-fold difference; as the graph fills in toward V² edges the two converge, and with constant factors counted the simple array wins the dense end outright."
      cite={{
        text: 'Dijkstra, "A Note on Two Problems in Connexion with Graphs", Numerische Mathematik 1, 1959. The binary-heap formulation is Johnson, 1977; Fredman and Tarjan reached O(E + V log V) with Fibonacci heaps in 1984.',
        href: 'https://doi.org/10.1007/BF01386390',
      }}
    >
      <svg viewBox="0 0 640 320" role="img" aria-label="Cost of the scan flat against edge count while the heap grows with it, converging on dense graphs">
        <line x1="64" y1="262" x2="612" y2="262" stroke="#232c40" strokeWidth="1.5" />
        <line x1="64" y1="34" x2="64" y2="262" stroke="#232c40" strokeWidth="1.5" />
        <text x="64" y="24" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="12">work</text>
        <text x="404" y="296" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="12">edges present  →</text>
        <text x="70" y="284" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">sparse</text>
        <text x="556" y="284" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">dense</text>
        <line x1="64" y1="72" x2="612" y2="64" stroke="#9aa5bd" strokeWidth="2.5" strokeDasharray="6 5" />
        <text x="380" y="56" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="12">linear scan · V²</text>
        <path d="M64 250 C 220 232, 400 150, 612 78" fill="none" stroke="#5da2ff" strokeWidth="2.5" />
        <text x="380" y="150" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="12">binary heap · E log V</text>
        <line x1="120" y1="72" x2="120" y2="244" stroke="#62d98a" strokeWidth="1.4" strokeDasharray="4 4" />
        <text x="128" y="164" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="12">143× here</text>
        <circle cx="590" cy="72" r="5" fill="#f0b94b" />
        <text x="470" y="106" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="12">they converge</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'dijkstra_binary_heap.py',
  Viz: DijkstraViz,
  narration,
};
