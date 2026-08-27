import ActivityViz from '../viz/ActivityViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/activity_selection_earliest_finish.py?raw';
import { narration } from './activity-selection-earliest-finish.narration.js';

export const content = {
  given:
    'n requests, each with a start and finish time, and one room.',
  task: 'The largest possible set of non-overlapping requests.',
  constraint:
    'Plausible greedy compasses abound and almost all are wrong: this page runs four of them against a DP referee (itself verified by subset brute force) and measures the wrongness gradient: catastrophic, close, and almost-right are all still wrong.',

  origins: (
    <p>
      Activity selection is the <strong>poster child of greedy
      algorithms</strong>: the example every textbook (CLRS chapter 16,
      Kleinberg-Tardos chapter 4) uses to teach the exchange argument,
      precisely because the problem looks like it should need search and
      provably does not. The deeper theory is Edmonds&apos; 1971 matroid
      result: greed is <em>exact</em> exactly when the feasible sets form
      a matroid-like structure, and the earliest-finish rule is the
      clean scalar case. The applications are the calendar itself:
      meeting rooms, satellite passes, runway slots, ad breaks: anywhere
      one resource takes non-overlapping bookings.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>one-pass skeleton</strong>: sort by{' '}
      <em>something</em>, sweep once, take whatever fits, never look
      back. The skeleton is shared by every compass on this page: same
      code, one sort key swapped: which is the honest way to show that
      the skeleton is not the intelligence. O(n log n), no state beyond
      the last chosen finish time.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>compass: earliest finish first</strong>. The
      exchange argument makes it exact: among compatible requests, the
      one finishing first can be swapped into <em>any</em> optimal
      solution without loss (it ends no later, so it blocks no more), and
      induction does the rest. This page does not cite that: it verifies
      greedy == DP-optimal on <strong>all 2,000 random trials</strong>{' '}
      plus both constructed gadgets, while the three plausible rivals
      fail 1,428, 311, and 1 time respectively.
    </p>
  ),

  picture: (
    <p>
      Booking a single conference room from a pile of requests. The
      intuition that maximizing bookings means favoring <em>short</em>{' '}
      meetings is a compass borrowed from somewhere it works (CPU
      scheduling, where shortest-job-first really does minimize waiting)
      and imported into a place it fails. The right question is not
      &quot;which meeting is cheapest?&quot; but &quot;which meeting{' '}
      <em>releases the room soonest</em>?&quot;: the room&apos;s freedom
      is the only currency. A 30-minute meeting ending at 5pm is worth
      less than a 3-hour meeting ending at 4pm.
    </p>
  ),

  steps: [
    <>
      <strong>Sort by finish time</strong>: the compass, and the only
      step where the intelligence lives.
    </>,
    <>
      <strong>Sweep:</strong> take the next request whose start is at or
      after the last chosen finish.
    </>,
    <>
      <strong>Skip conflicts</strong> without regret: the exchange
      argument says regret is impossible.
    </>,
    <>
      <strong>Stop at the end:</strong> one pass, O(n log n) total, no
      backtracking, no memory.
    </>,
    <>
      <strong>Know the boundary:</strong> the moment requests carry
      different <em>values</em>, all cardinality greed dies: weighted
      interval scheduling DP takes over (measured below: greed keeps
      82% of the value on average, 42.5% in the worst trial).
    </>,
  ],

  signals: [
    <>
      <strong>One resource, cardinality objective:</strong> most
      bookings, most satellite passes, most stories in the sprint: count,
      not value.
    </>,
    <>
      <strong>Intervals are rigid:</strong> fixed start and finish, no
      preemption: if jobs can be paused, the real-time schedulers
      (earliest deadline first) play a different game.
    </>,
    <>
      <strong>You need the proof, not just the answer:</strong> the
      exchange argument is the interview&apos;s actual question; the
      code is five lines.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>the same skeleton with the wrong
      compass</strong>, and the page runs three. Earliest start (first
      come, first served): 13 of an optimal 229 on the measured
      instance: catastrophic, because one early-starting marathon blocks
      the day. Shortest first: 227 of 229: close, and still wrong 311
      times in 2,000 trials. Fewest conflicts: right 499 times in 500,
      and the discovered 29-interval counterexample still kills it.
      Plausibility is not a proof.
    </>
  ),

  strength: (
    <>
      <strong>Exact, five lines, O(n log n), and proven live.</strong>{' '}
      Equal to the DP optimum on every one of 2,000 random trials and
      both adversarial gadgets; the referee itself verified against
      exhaustive subset enumeration on 300 instances. When the
      cardinality objective holds, no algorithm on Earth does better,
      and nothing simpler does as well.
    </>
  ),
  weakness: (
    <>
      <strong>The compass is welded to the objective.</strong> Change
      &quot;most requests&quot; to &quot;most valuable requests&quot; and
      earliest-finish keeps 82.1% of the optimum on average (42.5% in
      the worst measured trial): the exchange argument breaks the moment
      a swap can cost value. Multiple rooms change the question
      (interval partitioning); preemption changes it again (EDF). Greedy
      exactness is always a theorem about one objective, never a
      property of the code.
    </>
  ),

  problem: 'Interval scheduling',
  problemSlug: 'interval-scheduling',
  rivals: [
    {
      name: 'Activity selection × earliest finish',
      isThisUnit: true,
      algoName: 'Activity selection',
      cost: 'O(n log n)',
      wins: (
        <>
          <strong>229 of 229</strong> on the measured instance, optimal
          on all 2,000 trials: exactness for the price of a sort.
        </>
      ),
      costs: (
        <>
          Cardinality only: values, rooms, or preemption each void the
          exchange argument.
        </>
      ),
      when: 'One resource, count-the-bookings objective: and as the interview’s cleanest proof-by-exchange.',
    },
    {
      name: 'Weighted interval scheduling × predecessor search',
      algoName: 'Weighted interval scheduling',
      cost: 'O(n log n) DP',
      wins: (
        <>
          Exact when requests carry <em>values</em>: this page&apos;s
          referee, and the tool that recovers the 17.9% of value the
          greedy leaks on average (57.5% in its worst trial).
        </>
      ),
      costs: (
        <>
          A DP table and a predecessor binary search where greedy needed
          one comparison: modest, but no longer five lines.
        </>
      ),
      when: 'The moment bookings are not equal: ad slots, priced reservations, weighted jobs.',
    },
    {
      name: 'Earliest deadline first',
      cost: 'O(log n) per decision',
      wins: (
        <>
          The <em>preemptive real-time</em> cousin: with pausable jobs
          and deadlines, EDF is optimal for schedulability (Liu-Layland):
          the OS kernel&apos;s version of this page.
        </>
      ),
      costs: (
        <>
          Needs preemption; under overload it degrades badly (the domino
          effect), where fixed-priority schemes fail more gracefully.
        </>
      ),
      when: 'Real-time systems with pausable tasks and hard deadlines: a different game with a rhyming compass.',
    },
  ],
  neverUse: {
    name: 'First-come-first-served as an optimizer',
    why: (
      <>
        Earliest-start selected <strong>13 requests where 229 were
        possible</strong>: 6% of optimal, measured, because one
        early-starting marathon blocks everything and FCFS takes it
        proudly. The gadget makes it exact: one interval [0, 1000]
        against fifty disjoint shorts: FCFS picks 1. The trap is that
        FCFS is a genuine <em>fairness policy</em>: queues use it for
        good reasons: imported into an <em>optimization</em> as if
        policies and objectives were interchangeable. Know which one you
        are running: a fair rule can be a terrible optimizer, and this
        one is off by 17× on real densities.
      </>
    ),
  },

  contest: {
    instance:
      'n = 10,000 random requests, one room, cardinality objective; referee: weighted-interval DP, itself verified against subset brute force on 300 small instances',
    columns: ['selected', 'vs optimal 229'],
    rows: [
      {
        method: 'Earliest finish (this unit)',
        isThisUnit: true,
        values: ['229', 'optimal'],
        best: 0,
        verdict: 'equal to DP here and on all 2,000 trials: the theorem, live',
      },
      {
        method: 'Shortest first',
        values: ['227', '−2'],
        verdict: 'close, and wrong 311/2,000 times; gadget: 50 vs 100',
      },
      {
        method: 'Fewest conflicts',
        values: ['41 (n=400)', '−0 there'],
        verdict: 'the nearest miss: right 499/500, killed by a found 29-interval case',
      },
      {
        method: 'Earliest start (FCFS)',
        values: ['13', '−216'],
        verdict: 'one early marathon blocks the day: 6% of optimal',
      },
    ],
    source:
      'python solutions/activity_selection_earliest_finish.py prints this table and asserts: DP == brute force on 300 small instances; earliest-finish == optimal on all 2,000 random trials AND both constructed gadgets (FCFS 1 vs 50; shortest-first 50 vs 100); every rival compass caught failing at least once (FCFS 1,428/2,000, shortest 311/2,000, fewest-conflicts 1/500 with the counterexample recovered); and the weighted boundary priced: cardinality greed keeps 82.1% of optimal value on average, 42.5% in the worst trial.',
  },

  figure: (
    <Figure
      id="fig-exchange-argument"
      aspect="16 / 7"
      caption="The exchange argument, the whole proof. Let OPT be any optimal solution and g the first-finishing compatible request. Swap g for OPT's first pick: g ends no later, so everything after still fits: the swap is free, and induction marches down the timeline. One true compass and three plausible ones: the page measures all four, because plausibility is not a proof."
      cite={{
        text: 'The greedy-exactness theory is Edmonds, "Matroids and the greedy algorithm", Mathematical Programming 1, 1971; the textbook treatment is CLRS §16.1 and Kleinberg-Tardos ch. 4.',
        href: 'https://doi.org/10.1007/BF01584082',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="The exchange argument: greedy's first pick swaps into any optimal solution">
        <text x="24" y="28" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="12">any optimal solution OPT:</text>
        <rect x="24" y="40" width="120" height="22" fill="rgba(93,162,255,0.15)" stroke="#5da2ff" rx="4" />
        <rect x="170" y="40" width="100" height="22" fill="rgba(93,162,255,0.15)" stroke="#5da2ff" rx="4" />
        <rect x="296" y="40" width="120" height="22" fill="rgba(93,162,255,0.15)" stroke="#5da2ff" rx="4" />
        <text x="60" y="55" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="11">first</text>
        <text x="24" y="106" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="12">greedy&apos;s g: finishes no later:</text>
        <rect x="24" y="118" width="88" height="22" fill="rgba(98,217,138,0.2)" stroke="#62d98a" rx="4" />
        <text x="46" y="133" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">g</text>
        <path d="M 70 118 C 80 92, 60 78, 70 64" fill="none" stroke="#f0b94b" strokeWidth="1.8" markerEnd="none" />
        <text x="86" y="92" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">swap: free (g blocks no more)</text>
        <text x="24" y="182" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="12">⇒ some optimal solution starts with g ⇒ recurse on the rest</text>
        <text x="24" y="222" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">the four compasses, measured: finish ✓ 2,000/2,000 · conflicts 499/500 · short 1,689/2,000 · start 572/2,000</text>
        <text x="24" y="244" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">three of them look reasonable in a meeting: one of them is a theorem</text>
        <text x="24" y="272" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">boundary: add values and ALL cardinality greed dies: DP keeps the other 17.9%</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'activity_selection_earliest_finish.py',
  Viz: ActivityViz,
  narration,
};
