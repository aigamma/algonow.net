import KahnViz from '../viz/KahnViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/kahn_zero_indegree_queue.py?raw';
import { narration } from './kahn-zero-indegree-queue.narration.js';

export const content = {
  given:
    'A set of tasks and one-way dependencies: an arrow u → v means u must happen before v.',
  task: 'Produce an order that does every task after all of its prerequisites, or prove that none exists and say exactly what is stuck.',
  constraint:
    'Every edge may be examined O(1) times (the naive rescan is measured 167× over budget), and failure must come with a diagnosis, not a shrug.',

  origins: (
    <p>
      Westinghouse, 1962. Arthur Kahn published the method in CACM under the
      title &quot;Topological sorting of <strong>large networks</strong>&quot;,
      and the networks were PERT charts: the project-scheduling diagrams of
      the aerospace era, where thousands of tasks waited on one another and
      someone had to find an order. Tarjan&apos;s 1976 depth-first
      formulation gave the problem its second dialect. Between them they now
      run the dependency machinery of the software world: make and its
      descendants, package managers, spreadsheet recalculation, migration
      runners, and every DAG scheduler, all of it source removal or reverse
      finishing order, sixty years on.
    </p>
  ),

  algoRole: (
    <p>
      Owns one lemma and one loop. The lemma: a task with{' '}
      <strong>no unmet prerequisites</strong> is safe to do right now, and
      every non-empty DAG has at least one such source (follow arrows
      backward; with no cycles you must fall off an edge). The loop: do a
      source, delete it, and its departure may free others; repeat until
      nothing remains, and anything left over is a proof that no order
      existed. Correctness never depends on which ready task goes first.
    </p>
  ),
  heurRole: (
    <p>
      Decides <strong>how the ready tasks are found</strong>, and it is the
      whole cost model: maintain a queue of zero in-degree vertices, and
      each removal decrements only its own neighbors, promoting any that hit
      zero. Every edge is touched exactly once: the tested solution asserts{' '}
      <strong>work = 2V + E to the integer</strong>. And the queue is a
      genuine policy slot: FIFO yields parallel waves, a min-heap yields the
      lexicographically smallest order (proven by exhaustive enumeration),
      a priority yields scheduling. The frontier is the algorithm; order
      within the frontier is policy.
    </p>
  ),

  picture: (
    <p>
      Registering for courses with a prerequisite catalog. Each term you ask
      one question: <strong>which courses am I eligible for right now?</strong>{' '}
      That eligibility list is the frontier, and finishing a course only
      changes the eligibility of the courses that listed it, no others, so
      keeping the list current is cheap. Take the eligible courses term by
      term and the whole catalog orders itself: the terms are the waves, and
      the number of terms is exactly the longest prerequisite chain. And if
      one day the eligibility list is empty while courses remain, the
      catalog itself is broken: somewhere, courses require each other.
    </p>
  ),

  steps: [
    <>
      <strong>Count:</strong> one pass computes every task&apos;s in-degree
      (unmet prerequisites); every zero enters the ready queue.
    </>,
    <>
      <strong>Take</strong> a task from the queue and append it to the
      order.
    </>,
    <>
      <strong>Release:</strong> decrement each neighbor&apos;s count; any
      that reach zero join the queue. This touches each edge once, ever.
    </>,
    <>
      <strong>Finish or diagnose:</strong> queue empty with tasks left over
      means a cycle; the leftovers are precisely the tasks that can never
      start.
    </>,
    <>
      <strong>Choose the queue to choose the order:</strong> FIFO for
      waves, min-heap for lexicographic, priorities for schedules. Same
      proof, different products.
    </>,
  ],

  signals: [
    <>
      Dependency <strong>execution</strong>: builds, migrations, spreadsheet
      cells, pipeline stages: the order is the deliverable.
    </>,
    <>
      You want the <strong>waves</strong>: everything ready now can run in
      parallel, and the wave count is the critical-path depth (20 here,
      verified against a longest-chain DP).
    </>,
    <>
      Cycles are <strong>user error</strong> to be reported: the stuck set
      falls out of the bookkeeping for free.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the same lemma without the bookkeeping: rescan
      every task for readiness after each completion. Identical output,{' '}
      <strong>2,009,000</strong> touches against the queue&apos;s{' '}
      <strong>12,000</strong> on 2,000 tasks: 167×, and growing linearly
      with V. The lemma was never the cost; finding the frontier was.
    </>
  ),

  strength: (
    <>
      <strong>Exactly V + E, and the frontier is a product.</strong> Work
      asserted to the integer (2V + E = 12,000), parallel waves for free
      (20 waves = longest chain + 1, independently verified), the queue as
      a policy slot, and cycle detection by arithmetic: whatever never hits
      zero was never startable.
    </>
  ),
  weakness: (
    <>
      <strong>Whole-graph, and a coarse autopsy.</strong> It needs all
      vertices and in-degrees up front, where DFS explores lazily from a
      requested target (which is why demand-driven builds are DFS-shaped).
      And its cycle report is the blast radius, not the wound: on the
      planted 5-ring it names all <strong>446</strong> tasks that cannot
      start, while DFS hands back the exact 5-cycle.
    </>
  ),

  problem: 'Topological ordering',
  problemSlug: 'topological-ordering',
  rivals: [
    {
      name: 'Kahn × ready queue',
      isThisUnit: true,
      algoName: "Kahn's algorithm",
      cost: 'O(V + E), exact',
      wins: (
        <>
          <strong>12,000</strong> touches, asserted equal to 2V + E; waves,
          schedules, and lexicographic order all fall out of the queue
          choice.
        </>
      ),
      costs: (
        <>
          Needs the whole graph and its in-degrees before step one, and
          diagnoses cycles by blast radius (446 stuck tasks), not root
          cause.
        </>
      ),
      when: 'Executing dependency graphs: schedulers, migrations, build waves, prerequisite planning.',
    },
    {
      name: 'DFS finish-order',
      algoName: 'DFS topological sort',
      cost: 'O(V + E)',
      wins: (
        <>
          Slightly cheaper here (<strong>8,424</strong>), explores lazily
          from any requested target (demand-driven builds), and its cycle
          report is surgical: the exact 5-cycle, verified edge by edge.
        </>
      ),
      costs: (
        <>
          No frontier semantics: waves and ready-sets are simply not in its
          vocabulary, and the recursive form needs an explicit stack at
          depth (a 2,000-long chain overflows Python&apos;s default).
        </>
      ),
      when: 'Demand-driven evaluation, cycle hunting, and as the substrate of SCC algorithms.',
    },
    {
      name: 'Kahn × source rescan',
      algoName: "Kahn's algorithm",
      cost: 'O(V²+E)',
      wins: (
        <>
          The same lemma, the same output, no queue to maintain: eight
          honest lines.
        </>
      ),
      costs: (
        <>
          <strong>2,009,000</strong> touches: 167× on 2,000 tasks, a
          multiple that grows with V. The frontier was the entire cost
          model.
        </>
      ),
      when: 'Never past a whiteboard; it exists on this bench to price the heuristic.',
    },
  ],
  neverUse: {
    name: 'Sorting by a per-task score (fewest prerequisites first)',
    why: (
      <>
        It feels like a sort, so the reflex is to invent a key. No scalar
        key can encode a partial order: sorted by in-degree, this
        graph&apos;s order violates <strong>1,049 of its 8,000</strong>{' '}
        dependencies, measured. A partial order is relational information
        (u before v), and any per-task number discards the relation. The
        frontier is not an optimization of the sort reflex; it is the
        replacement for it.
      </>
    ),
  },

  contest: {
    instance:
      '2,000 tasks, 8,000 dependencies (a shuffled random DAG, so vertex ids carry no hint); work = vertex and edge touches; the cycle column plants a 5-ring and reads each method’s report',
    columns: ['work', 'cycle diagnosis', 'parallel waves'],
    rows: [
      {
        method: 'Kahn × ready queue',
        isThisUnit: true,
        values: ['12,000', 'names all 446 stuck tasks', '20 = chain + 1'],
        best: 2,
        verdict: 'exactly 2V + E, and the frontier doubles as the schedule',
      },
      {
        method: 'Kahn × source rescan',
        values: ['2,009,000', 'same report', 'same'],
        verdict: 'the lemma without the ledger: 167× for identical output',
      },
      {
        method: 'DFS finish-order',
        values: ['8,424', 'the exact 5-cycle', 'not available'],
        best: 1,
        verdict: 'cheapest pass and the surgical autopsy; no frontier to offer',
      },
    ],
    source:
      'python solutions/kahn_zero_indegree_queue.py prints this table and asserts every produced order valid against all 8,000 edges, the queue’s work equal to 2V + E exactly, both cycle dialects verified (the ring inside Kahn’s stuck set; DFS’s returned cycle a real cycle edge by edge), the min-heap variant lexicographically smallest against exhaustive enumeration on 40 small DAGs, the wave count equal to the longest chain plus one by independent DP, and the in-degree sort violating 1,049 dependencies.',
  },

  figure: (
    <Figure
      id="fig-kahn-frontier"
      aspect="16 / 7"
      caption="The frontier is the algorithm. At any moment the tasks with no unmet arrows (amber) are exactly the ones safe to start, and finishing a task changes the eligibility of only the tasks that listed it. Taking the frontier generation by generation produces the waves; the number of waves is forced to equal the longest prerequisite chain, because each wave shortens every surviving chain by exactly one."
      cite={{
        text: 'Kahn, "Topological Sorting of Large Networks", Communications of the ACM 5(11), 1962, written for the PERT project-scheduling networks of the aerospace era. The depth-first dialect is Tarjan, 1976.',
        href: 'https://doi.org/10.1145/368996.369025',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="A small dependency graph in three waves; the current frontier of zero in-degree tasks is highlighted, with arrows releasing later tasks">
        {[
          [90, 60, 'done'], [90, 145, 'done'], [90, 230, 'done'],
          [280, 60, 'ready'], [280, 145, 'ready'], [280, 230, 'blocked'],
          [470, 100, 'blocked'], [470, 190, 'blocked'],
        ].map(([x, y, st], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r={17}
              fill={st === 'done' ? 'rgba(98,217,138,0.18)' : st === 'ready' ? 'rgba(240,185,75,0.22)' : 'rgba(255,255,255,0.04)'}
              stroke={st === 'done' ? '#62d98a' : st === 'ready' ? '#f0b94b' : '#6b7690'} strokeWidth="1.6" />
            <text x={x} y={y + 4} textAnchor="middle" fill={st === 'done' ? '#62d98a' : st === 'ready' ? '#f0b94b' : '#9aa5bd'} fontFamily="ui-monospace, monospace" fontSize="11">
              {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'][i]}
            </text>
          </g>
        ))}
        {[
          [90, 60, 280, 60, 1], [90, 145, 280, 60, 1], [90, 145, 280, 145, 1], [90, 230, 280, 145, 1],
          [90, 230, 280, 230, 0], [470, 100, 280, 230, 0, true],
          [280, 60, 470, 100, 0], [280, 145, 470, 100, 0], [280, 145, 470, 190, 0], [280, 230, 470, 190, 0],
        ].map(([x1, y1, x2, y2, sat, rev], i) => (
          <line key={`e${i}`} x1={x1 + 17} y1={y1} x2={x2 - 17} y2={y2}
            stroke={sat ? '#62d98a' : rev ? '#e06767' : '#6b7690'} strokeWidth={sat ? 1.8 : 1.2}
            strokeDasharray={rev ? '4 4' : undefined} opacity={sat ? 0.9 : 0.7} />
        ))}
        <text x="60" y="272" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">wave 1 · done</text>
        <text x="236" y="272" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">frontier: startable NOW</text>
        <text x="428" y="272" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">still blocked</text>
        <text x="330" y="248" fill="#e06767" fontFamily="ui-monospace, monospace" fontSize="10">a back edge would freeze F forever</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'kahn_zero_indegree_queue.py',
  Viz: KahnViz,
  narration,
};
