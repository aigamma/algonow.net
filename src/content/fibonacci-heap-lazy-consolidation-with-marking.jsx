import FibHeapViz from '../viz/FibHeapViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/fibonacci_heap_lazy_consolidation_with_marking.py?raw';
import { narration } from './fibonacci-heap-lazy-consolidation-with-marking.narration.js';

export const content = {
  given:
    'A priority queue with insert, find-min, delete-min, and decrease-key, where decrease-key must be cheap: Dijkstra performs one for every edge that improves a distance, and with a binary heap each costs O(log n), so Dijkstra is O(m log n) instead of the O(m + n log n) that constant-time decrease-key allows.',
  task: 'The Fibonacci heap (Fredman and Tarjan). A forest of heap-ordered trees in a circular root list with a pointer to the minimum. The heuristic is laziness plus marking: insert adds a one-node tree; decrease-key cuts the node from its parent into the root list; delete-min is the only tidying operation, consolidating the root list by linking trees of equal degree until every degree is unique. A node that loses a second child is cut from its own parent (a cascading cut), which guarantees that a node of degree k has at least F(k + 2) descendants, so the maximum degree is at most log_φ n.',
  constraint:
    'Measured on a random workload of 60,000 operations (26,916 inserts, 21,041 decrease-keys, 12,043 delete-mins): 0 mismatches against a sorted reference for the Fibonacci heap, a binary heap with a position map, and a pairing heap; the final heap of 14,873 nodes satisfies the Fibonacci property at every node with maximum degree 13 against the bound 19. Amortized accounting: 0.274 cuts per decrease-key (the potential argument allows 2; 933 cascading cuts, 4,678 marks), 5.3 links per delete-min against log₂ n = 14.7, actual work 212,721 against an amortized total of 1,026,348. An adversary that strips grandchildren over 30 rounds on 8,192 nodes: with marks 0 violations and max degree 13; without marks 16 violations and max degree 17. Dijkstra, distances checked against an array-based oracle: complete graph n = 1,000 (499,500 edges): Fibonacci 24,692 primitive steps in 0.13 s, binary 11,359 in 0.12 s, pairing 26,368 in 0.13 s, lazy heapq 11,925 in 0.11 s; sparse n = 3,000, m = 11,994: 82,208 / 33,524 / 57,375 / 10,721 steps; the cascade graph with a decrease-key on every one of 499,500 edges: Fibonacci 6,914 steps in 0.09 s, binary 7,317 in 0.11 s, pairing 998,002 in 0.19 s, lazy 999,001 in 0.43 s.',

  origins: (
    <p>
      Michael Fredman and Robert Tarjan (<strong>1987</strong>, Journal
      of the ACM, &quot;Fibonacci heaps and their uses in improved
      network optimization algorithms,&quot; first presented in 1984)
      designed the structure to cut the cost of decrease-key, bringing
      Dijkstra to O(m + n log n) and Prim with it. The trees relax
      Vuillemin&apos;s binomial heaps (1978), which keep one tree per
      degree at all times; the Fibonacci heap lets the root list grow
      lazily and consolidates only at delete-min, with a potential
      function (trees plus twice the marked nodes) that charges each cut
      to an earlier operation. Fredman, Sedgewick, Sleator, and Tarjan
      proposed the pairing heap (1986) as the practical alternative, and
      Fredman (1999) proved it cannot match constant-time decrease-key.
      Thin heaps, rank-pairing heaps, Brodal queues, and strict Fibonacci
      heaps (2012) all descend from it. In practice binary and pairing
      heaps run most shortest-path code: this is the structure every
      algorithms course proves bounds for and almost no production
      compiler ships.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>invariants and the bounds</strong>: heap order on
      every edge, the minimum at a root, distinct degrees after
      consolidation. On 60,000 random operations every delete-min
      returned the reference minimum (<strong>0 mismatches</strong>, as
      for the binary and pairing heaps), and the final heap of 14,873
      nodes satisfied the Fibonacci property at every node, F(k + 2)
      descendants for degree k, with maximum degree 13 against the bound
      19.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>cost</strong>. Laziness makes insert a splice and
      decrease-key a cut: 0.274 cuts per decrease-key where the potential
      argument allows 2 (933 cascading cuts, 4,678 marks); consolidation
      pays for the mess in one go, <strong>5.3 links per delete-min</strong>{' '}
      against log₂ n = 14.7; total actual work 212,721 against the
      amortized total 1,026,348 with the textbook constants. The marks
      are load-bearing: the adversary that strips grandchildren left the
      marked heap with 0 violations and max degree 13, and the unmarked
      one with 16 nodes too thin for their degree and max degree 17.
    </p>
  ),

  picture: (
    <p>
      A library where returned books are dumped on a cart instead of
      shelved: every return costs nothing. When someone asks for the
      lowest call number, the librarian, who always knows which book that
      is, hands it over and only then tidies the cart, merging piles of
      equal size into bigger piles until no two piles match, which keeps
      the number of piles logarithmic. A book may be pulled from the
      middle of a pile at any time, but a pile that has lost two books is
      broken up and its top goes back on the cart, so no pile becomes a
      tall thin stack pretending to be a big one. The tidying is paid for
      by the returns that made the mess.
    </p>
  ),

  steps: [
    <>
      <strong>Insert:</strong> a one-node tree spliced beside the
      minimum; update the min pointer if smaller.
    </>,
    <>
      <strong>Delete-min:</strong> move the minimum&apos;s children to
      the root list, remove it, then consolidate: a table by degree;
      while two roots share a degree, link the larger under the smaller.
    </>,
    <>
      <strong>Decrease-key:</strong> lower the key; if it drops below
      the parent&apos;s, cut the node into the root list and clear its
      mark.
    </>,
    <>
      <strong>Cascade:</strong> walk up; an unmarked parent is marked
      and the walk stops; a marked parent is cut too and the walk goes
      on.
    </>,
    <>
      <strong>Check:</strong> heap order on every edge, subtree ≥ F(k +
      2) at every node of degree k, the min pointer on the smallest root.
    </>,
  ],

  signals: [
    <>
      <strong>Decrease-key dominates:</strong> Dijkstra on dense graphs,
      Prim, anything that lowers keys far more often than it removes.
    </>,
    <>
      <strong>The bound must be proven:</strong> asymptotic optimality is
      the deliverable, as in a paper or a course.
    </>,
    <>
      <strong>Large n and tolerable constants:</strong> rarer in practice
      than the theory suggests.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the <strong>binary heap with a position
      map</strong>: O(log n) decrease-key, an array, and on the complete
      graph 11,359 primitive steps in 0.12 s against the hero&apos;s
      24,692 in 0.13 s.
    </>
  ),

  strength: (
    <>
      <strong>Constant amortized decrease-key, measured.</strong> 0.27
      cuts per decrease-key; on the cascade graph with a decrease-key per
      edge, 6,914 primitive steps against 998,002 for the pairing heap and
      999,001 for the lazy heap.
    </>
  ),
  weakness: (
    <>
      <strong>Constants, amortization, and complexity.</strong> Four
      pointers, a degree, and a mark per node with pointer chasing no
      cache likes (82,208 steps against 33,524 on the sparse graph); one
      delete-min can take linear time after a long root list; cascading
      cuts and the consolidation table are where bugs live; and the gain
      appears only when decrease-keys outnumber n log n.
    </>
  ),

  problem: 'Priority queue',
  problemSlug: 'priority-queue',
  rivals: [
    {
      name: 'Fibonacci heap × Lazy consolidation with marking',
      isThisUnit: true,
      algoName: 'Fibonacci heap',
      cost: 'O(1) insert and decrease-key, O(log n) delete-min, amortized',
      wins: (
        <>
          <strong>6,914 steps for 499,500 decrease-keys</strong>; the
          proven O(m + n log n) Dijkstra.
        </>
      ),
      costs: (
        <>
          Pointer-heavy; amortized only; 0.13 s against 0.12 s.
        </>
      ),
      when: 'When the asymptotic bound is the deliverable, or decrease-keys truly dominate.',
    },
    {
      name: 'Binary heap',
      algoName: 'Binary heap',
      cost: 'O(log n) everything, in an array',
      wins: (
        <>
          Cache-friendly and tiny: 0.12 s on the complete graph, 11,359
          steps against 24,692.
        </>
      ),
      costs: (
        <>
          A logarithm on every decrease-key, which adds up in the worst
          case.
        </>
      ),
      when: 'The default.',
    },
    {
      name: 'Pairing heap',
      algoName: 'Pairing heap',
      cost: 'O(log n) amortized delete-min; decrease-key not O(1)',
      wins: (
        <>
          A page of code, fast in practice, decrease-key by cutting a
          subtree.
        </>
      ),
      costs: (
        <>
          998,002 links on the cascade graph against 6,914; Fredman proved
          its decrease-key cannot be constant amortized.
        </>
      ),
      when: 'When decrease-key matters and simplicity matters more than the proof.',
    },
    {
      name: 'Binomial heap',
      algoName: 'Binomial heap',
      cost: 'O(log n) everything, worst case',
      wins: (
        <>
          One tree per degree at all times, clean worst-case bounds,
          cheap meld.
        </>
      ),
      costs: (
        <>
          Eager consolidation on every insert.
        </>
      ),
      when: 'When melding queues is common and a worst-case bound is wanted.',
    },
  ],
  neverUse: {
    name: 'The lazy binary heap when keys are lowered on every edge',
    why: (
      <>
        Push a duplicate entry whenever a distance improves and skip stale
        entries as they surface: it is what most Dijkstra code does, and
        on the random graphs it was the fastest structure on the page. On
        the cascade graph, where every one of 499,500 edges lowers a key,
        it is the disaster:{' '}
        <strong>999,001 heap operations against 6,914</strong>, 0.43 s
        against 0.09 s, with half a million stale entries in the queue
        at once. A structure that can lower a key in place is not a
        luxury there. Measured honestly, the binary heap with decrease-key
        was also within a fifth of the hero on that graph, because a
        small decrease rarely sifts far.
      </>
    ),
  },

  contest: {
    instance:
      'A random workload of 60,000 operations against a sorted reference; the Fibonacci property checked node by node with marks on and off under a grandchild-stripping adversary (30 rounds, 8,192 nodes); Dijkstra on a complete graph (n = 1,000), a sparse graph (n = 3,000, m = 11,994), and the cascade graph (a decrease-key on every one of 499,500 edges), distances checked against an array Dijkstra',
    columns: ['complete: steps / s', 'sparse: steps / s', 'cascade: steps / s', 'note'],
    rows: [
      {
        method: 'Fibonacci heap',
        isThisUnit: true,
        values: ['24,692 / 0.13', '82,208 / 0.02', '6,914 / 0.09', '0.274 cuts per decrease-key; 5.3 links per delete-min; property holds on every node'],
        best: 2,
        verdict: 'constant decrease-key, measured',
      },
      {
        method: 'binary heap, decrease-key',
        values: ['11,359 / 0.12', '33,524 / 0.01', '7,317 / 0.11', 'a small decrease rarely sifts far'],
        verdict: 'the default',
      },
      {
        method: 'pairing heap',
        values: ['26,368 / 0.13', '57,375 / 0.01', '998,002 / 0.19', 'a link per decrease-key'],
        verdict: 'simple, not O(1)',
      },
      {
        method: 'lazy binary heap (heapq)',
        values: ['11,925 / 0.11', '10,721 / 0.00', '999,001 / 0.43', 'a push and a pop per improvement'],
        verdict: 'fastest on random graphs, worst on the cascade',
      },
      {
        method: 'the marks, under the adversary',
        values: ['·', '·', '·', 'with marks: 0 violations, max degree 13; without: 16 violations, max degree 17'],
        verdict: 'the property is load-bearing',
      },
      {
        method: 'amortized accounting',
        values: ['·', '·', '·', 'actual work 212,721 against the amortized total 1,026,348; max degree 13 against the bound 19'],
        verdict: 'paid with room to spare',
      },
    ],
    source:
      'python solutions/fibonacci_heap_lazy_consolidation_with_marking.py prints this table and asserts: 0 mismatches against the sorted reference on 60,000 operations; the Fibonacci property at every node and a maximum degree within log_φ n; cuts at most twice the decrease-keys; the adversary breaking the property without marks and not with them, with a larger maximum degree; identical distances to the array Dijkstra on all three graphs; exactly one decrease-key per edge on the cascade graph; and fewer primitive steps there than the lazy heap’s pushes and pops.',
  },

  figure: (
    <Figure
      id="fig-fib-heap-cascade"
      aspect="16 / 7"
      caption="Left: a cascading cut. Node 9 is decreased to 2, below its parent 7, so it is cut into the root list. Its parent 7 was already marked (it had lost a child before), so 7 is cut too and unmarked; 7’s parent 4 was unmarked, so 4 is marked and the walk stops. Two cuts, one mark, no tree left thinner than its degree allows. Right: the measured shape of the workload, per operation: cuts per decrease-key against the bound of 2, and links per delete-min against log₂ n."
      cite={{
        text: 'M. L. Fredman and R. E. Tarjan, "Fibonacci heaps and their uses in improved network optimization algorithms," Journal of the ACM 34(3), 1987, pp. 596-615. DOI 10.1145/28869.28874. M. L. Fredman, R. Sedgewick, D. D. Sleator, and R. E. Tarjan, "The pairing heap: a new form of self-adjusting heap," Algorithmica 1, 1986. J. Vuillemin, "A data structure for manipulating priority queues," Communications of the ACM 21(4), 1978.',
        href: 'https://doi.org/10.1145/28869.28874',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="A small heap-ordered tree before and after a cascading cut, beside two bars comparing measured cuts per decrease-key and links per delete-min with their bounds">
        {(() => {
          const node = (x, y, label, fill, ring) => (
            <g key={`${x}-${y}-${label}`}>
              <circle cx={x} cy={y} r="12" fill={fill} stroke={ring || 'none'} strokeWidth="2" />
              <text x={x} y={y + 4} textAnchor="middle" fill="#0d1017" fontFamily="ui-monospace, monospace" fontSize="10" fontWeight="700">{label}</text>
            </g>
          );
          const edge = (x1, y1, x2, y2, dashed) => (
            <line key={`${x1}-${y1}-${x2}-${y2}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#9aa5bd" strokeOpacity="0.7" strokeDasharray={dashed ? '3 3' : undefined} />
          );
          return (
            <g>
              <text x="20" y="22" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">before: decrease 9 to 2 (amber = marked)</text>
              {edge(80, 60, 80, 110)}
              {edge(80, 110, 50, 160)}
              {edge(80, 110, 110, 160)}
              {edge(80, 60, 140, 110)}
              {edge(110, 160, 110, 210)}
              {node(80, 60, '1', '#5da2ff')}
              {node(80, 110, '4', '#5da2ff')}
              {node(140, 110, '6', '#5da2ff')}
              {node(50, 160, '5', '#5da2ff')}
              {node(110, 160, '7', '#f0b94b')}
              {node(110, 210, '9', '#5da2ff', '#e2606c')}
              <text x="20" y="252" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">9 &lt; 7: cut 9; 7 marked: cut 7; 4 unmarked: mark 4</text>
              <text x="200" y="22" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">after: three roots, one new mark</text>
              {edge(240, 60, 240, 110)}
              {edge(240, 110, 240, 160)}
              {edge(240, 60, 300, 110)}
              {node(240, 60, '1', '#5da2ff')}
              {node(240, 110, '4', '#f0b94b')}
              {node(300, 110, '6', '#5da2ff')}
              {node(240, 160, '5', '#5da2ff')}
              {node(350, 60, '7', '#5da2ff')}
              {node(400, 60, '2', '#5da2ff', '#62d98a')}
              <text x="200" y="200" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">root list: 1, 7, 2 (2 is the new minimum)</text>
              <text x="200" y="216" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">every node still has F(degree + 2) descendants</text>
              <text x="440" y="22" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">measured per operation (60,000 ops)</text>
              <rect x="450" y={200 - 0.274 * 80} width="34" height={0.274 * 80} fill="#f0b94b" fillOpacity="0.85" />
              <rect x="490" y={200 - 2 * 80} width="34" height={2 * 80} fill="#f0b94b" fillOpacity="0.25" />
              <text x="446" y="216" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="9">cuts/dk 0.27</text>
              <text x="490" y="216" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">bound 2</text>
              <rect x="550" y={200 - 5.3 * 10} width="34" height={5.3 * 10} fill="#5da2ff" fillOpacity="0.85" />
              <rect x="590" y={200 - 14.7 * 10} width="34" height={14.7 * 10} fill="#5da2ff" fillOpacity="0.25" />
              <text x="544" y="216" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="9">links/dm 5.3</text>
              <text x="588" y="216" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">log2 n 14.7</text>
              <text x="440" y="252" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">max degree 13, bound log_phi n = 19</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'fibonacci_heap_lazy_consolidation_with_marking.py',
  Viz: FibHeapViz,
  narration,
};
