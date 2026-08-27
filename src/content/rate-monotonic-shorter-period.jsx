import RateMonotonicViz from '../viz/RateMonotonicViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/rate_monotonic_shorter_period.py?raw';
import { narration } from './rate-monotonic-shorter-period.narration.js';

export const content = {
  given:
    'Periodic tasks with hard deadlines on one processor: a 5ms sensor loop, a 20ms control law, a 100ms telemetry pass: and a dispatcher that must be trivially simple.',
  task: 'Fixed priorities: decided once, offline, burned into the interrupt table: that provably meet every deadline.',
  constraint:
    'No runtime priority arithmetic: the live EDF unit re-sorts by deadline every instant; here the interrupt controller compares two integers. The referees: response-time analysis against a cycle-accurate simulator, task by task, both directions: and the Liu-Layland bound with zero counterexamples beneath it.',

  origins: (
    <p>
      Liu and Layland, JACM <strong>1973</strong>: the founding paper
      of real-time scheduling theory, and a rare paper that resolved
      its field&apos;s two headline questions at once: among{' '}
      <em>fixed</em> priorities, rate order (shorter period wins) is
      optimal: and no fixed assignment can promise more than
      n(2^1/n − 1) utilization: falling to <strong>ln 2 ≈ 69.3%</strong>:
      while their other invention, dynamic deadline order (the live
      EDF unit), reaches 100%. Every RTOS priority table since:
      VxWorks, FreeRTOS, flight software: is a footnote to those
      fourteen pages.
    </p>
  ),

  algoRole: (
    <p>
      Owns <strong>fixed-priority preemption</strong>: the
      highest-priority ready task always holds the CPU, and
      priorities never change at runtime. That rigidity is the
      feature: the dispatcher is an integer compare in an interrupt
      handler, analyzable, certifiable, and immune to the re-sorting
      the live EDF unit performs at every release. The cost of the
      rigidity is exactly what this page measures: a utilization gap
      that dynamic priorities do not pay.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>rate rule</strong>: shorter period, higher
      priority: and Liu &amp; Layland&apos;s optimality theorem: if{' '}
      <em>any</em> fixed assignment meets all deadlines, rate order
      does. Measured here: 300 random sets under the n(2^1/n − 1)
      bound with <strong>zero misses</strong>; the exact
      response-time fixpoints agreeing with the simulator task by
      task (185 schedulable sets, and all 15 RTA-rejected sets
      confirmed missing); and the classic importance-ordered
      assignment made to starve a sensor loop that rate order runs
      clean.
    </p>
  ),

  picture: (
    <p>
      A newsroom with one editor. The wire updates every 5 minutes,
      the market column every 20, the weekend feature every 100. The
      rate rule says: the wire always interrupts the column, the
      column always interrupts the feature: not because the wire is
      more important, but because it has the least slack to spare:
      its deadline is always nearest <em>as a class</em>. Rank by
      importance instead: crown the feature: and the wire misses
      every cycle while the editor polishes prose (measured below).
      The feature still ships: its deadline was roomy enough to
      absorb every interruption: which is the theorem in one
      sentence: urgency is a property of the <em>period</em>, not
      the prestige.
    </p>
  ),

  steps: [
    <>
      <strong>Assign once:</strong> sort by period; shorter period =
      higher priority: the whole runtime policy.
    </>,
    <>
      <strong>Dispatch:</strong> highest-priority ready task runs;
      releases preempt instantly.
    </>,
    <>
      <strong>Screen with the bound:</strong> U ≤ n(2^1/n − 1) →
      schedulable, guaranteed (300 sets, zero misses).
    </>,
    <>
      <strong>Decide exactly with RTA:</strong> R = C + Σ ⌈R/Tⱼ⌉·Cⱼ
      iterated to a fixpoint: the growing window admits more
      preemptions, which grow the window: measured equal to the
      simulator everywhere.
    </>,
    <>
      <strong>Know the gap:</strong> above the bound RM missed 10% of
      sets while the live EDF missed none: and harmonic periods ran
      clean at U = 1.0.
    </>,
  ],

  signals: [
    <>
      <strong>The dispatcher must be trivial:</strong> interrupt
      tables, certified RTOSes, flight code: a static integer
      priority is the whole mechanism.
    </>,
    <>
      <strong>Analyzability is contractual:</strong> RTA gives exact
      worst-case response times offline: the numbers you sign in a
      safety case.
    </>,
    <>
      <strong>Utilization is moderate or harmonic:</strong> below
      69.3% you are unconditionally safe; with periods that divide,
      safe to 100%.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>importance-ordered
      priorities</strong>: the assignment every intuition writes
      first, measured missing deadlines at U = 0.75 while rate order
      runs the same set clean: and the honest ceiling is the live{' '}
      <strong>EDF unit</strong>: dynamic deadline order, schedulable
      to U = 1, re-raced on this page and spotless on every set RM
      dropped. The choice between them is the choice between a
      compare instruction and a priority queue.
    </>
  ),

  strength: (
    <>
      <strong>Optimal among fixed, exactly testable, and cheap as an
      interrupt.</strong> Zero misses across 300 sets under the
      Liu-Layland bound; RTA fixpoints equal to the cycle-accurate
      simulator task by task, both directions (185 + 15 sets); the
      embedded client&apos;s worst responses [1, 8, 54] predicted and
      confirmed; and the harmonic set (10, 20, 40) clean at exactly
      U = 1.0: the bound is sufficient, never necessary.
    </>
  ),
  weakness: (
    <>
      <strong>The utilization gap is real and measured.</strong>{' '}
      Above the bound (0.780 for three tasks) up to U = 0.95, rate
      order missed deadlines on <strong>10%</strong> of random sets:
      every one of which the live EDF dispatcher ran clean. Fixed
      priority pays up to ~31 points of utilization for its
      simplicity on unlucky period mixes: and under overload the two
      fail differently (the EDF page measured that flip from the
      other side). Implicit deadlines assumed here; D &lt; T wants
      deadline-monotonic order and the same RTA.
    </>
  ),

  problem: 'Real-time scheduling',
  problemSlug: 'realtime-scheduling',
  rivals: [
    {
      name: 'Rate-monotonic × rate rule',
      isThisUnit: true,
      algoName: 'Rate-monotonic scheduling',
      cost: 'O(1) dispatch, static',
      wins: (
        <>
          <strong>Optimal among fixed priorities</strong> (Liu &amp;
          Layland), exact offline RTA, and a dispatcher that is one
          integer compare: the certifiable choice.
        </>
      ),
      costs: (
        <>
          The measured gap: 10% of above-bound sets missed that EDF
          ran clean: rigidity priced in utilization.
        </>
      ),
      when: 'Certified embedded systems: RTOS priority tables, flight code, anything auditors read.',
    },
    {
      name: 'EDF × deadline priority',
      algoName: 'Earliest deadline first',
      cost: 'O(log n) dispatch',
      wins: (
        <>
          The live unit: schedulable to <strong>U = 1</strong>:
          spotless here on all 300 sets RM sometimes dropped: the
          full processor, no gap.
        </>
      ),
      costs: (
        <>
          A priority queue at every release, and overload sprays
          misses where RM shields the fast task (its page measured
          both).
        </>
      ),
      when: 'When utilization must climb past the bound and the kernel can afford a heap.',
    },
    {
      name: 'Least laxity first',
      algoName: 'Least laxity first',
      cost: 'O(log n), churny',
      wins: (
        <>
          Priority by slack (deadline minus remaining work): also
          optimal on one CPU, and the sharper signal on
          multiprocessors.
        </>
      ),
      costs: (
        <>
          Laxity ties thrash: two tasks with equal slack preempt each
          other endlessly: context-switch storms EDF avoids.
        </>
      ),
      when: 'Multiprocessor real-time research: rarely the single-core production pick.',
    },
    {
      name: 'Round-robin × time quantum',
      algoName: 'Round-robin scheduling',
      cost: 'O(1), fair',
      wins: (
        <>
          Fairness without analysis: every task progresses every
          quantum: the right default where deadlines are soft
          wishes.
        </>
      ),
      costs: (
        <>
          No deadline guarantee at any utilization: fairness is
          exactly the wrong currency for a hard deadline.
        </>
      ),
      when: 'Time-sharing and soft real-time: never where a missed cycle is a failed brake.',
    },
  ],
  neverUse: {
    name: 'Priorities by importance',
    why: (
      <>
        The most natural assignment in embedded engineering: the
        telemetry uplink is mission-critical, so it gets top
        priority: and the measured result on this page&apos;s client
        (U = 0.75) is the 5ms sensor loop <strong>starving under a
        25ms telemetry burst</strong> while rate order runs the same
        three tasks with worst responses [1, 8, 54] and room to
        spare. Importance says which task must <em>never be
        dropped</em>; the period says which must <em>run next</em>:
        conflating them hands the CPU to the task with the most
        slack. The telemetry still met its deadline under rate order:
        100ms absorbs every interruption: which is the whole theorem
        felt in the hands: urgency lives in the period. Encode
        importance in the deadlines you assign: never in the
        priority order that serves them.
      </>
    ),
  },

  contest: {
    instance:
      'periodic hard-deadline task sets, one CPU; referee: response-time analysis agreeing with a cycle-accurate simulator, task by task, both directions (185 schedulable + 15 rejected sets)',
    columns: ['guarantee', 'measured'],
    rows: [
      {
        method: 'Importance priorities',
        values: ['none', 'missed at U = 0.75'],
        verdict: 'the sensor starved under the crowned telemetry burst',
      },
      {
        method: 'Rate-monotonic',
        isThisUnit: true,
        values: ['U ≤ n(2^1/n−1)', '0 misses under bound'],
        verdict: 'optimal among fixed: 300 sets clean, harmonic clean at U = 1.0',
      },
      {
        method: 'EDF (live unit)',
        values: ['U ≤ 1', '0 misses, all 300'],
        best: 1,
        verdict: 'spotless on every above-bound set RM dropped: the dynamic ceiling',
      },
    ],
    source:
      "python solutions/rate_monotonic_shorter_period.py prints this table and asserts: RTA fixpoints equal to the simulator task-by-task on 185 schedulable sets AND all 15 RTA-rejected sets confirmed missing; 300 sets under the Liu-Layland bound with zero misses; the gap measured (10% of sets between the bound and U = 0.95 missed under RM, none under EDF); the harmonic set (10, 20, 40) clean at exactly U = 1.0; and the importance-ordered client missing at U = 0.75 with rate order clean at responses [1, 8, 54].",
  },

  figure: (
    <Figure
      id="fig-rm-timeline"
      aspect="16 / 7"
      caption="Two priority tables, one task set, U = 0.75. Importance order crowns the 100ms telemetry: its 25ms burst walls off the CPU and the 5ms sensor misses four deadlines before its first instruction. Rate order gives the sensor the crown: it steals 1ms slices whenever it needs them, the control law weaves between, and the telemetry still finishes at 54ms against its 100ms deadline: roomy periods absorb interruptions. Urgency is a property of the period, not the prestige."
      cite={{
        text: 'Liu & Layland, "Scheduling Algorithms for Multiprogramming in a Hard-Real-Time Environment", JACM 20(1), 1973: rate order optimal among fixed priorities; the n(2^1/n − 1) bound; and EDF reaching U = 1: the founding fourteen pages of the field.',
        href: 'https://doi.org/10.1145/321738.321743',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="Two scheduling timelines comparing importance order, where the sensor misses, with rate order, where all tasks meet deadlines">
        <text x="40" y="24" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">importance order: telemetry crowned · sensor (5ms period) starves</text>
        <rect x="40" y="34" width="500" height="18" fill="#3e6f8e" />
        <text x="548" y="47" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">telemetry 25ms</text>
        {[0, 1, 2, 3].map((i) => (
          <g key={i}>
            <line x1={40 + i * 100} y1={60} x2={40 + i * 100} y2={74} stroke="#e2606c" strokeWidth="1.6" />
            <text x={44 + i * 100} y={72} fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="10">miss</text>
          </g>
        ))}
        <text x="40" y="118" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">rate order: sensor crowned · every deadline met · telemetry done at 54 of 100</text>
        {Array.from({ length: 11 }, (_, i) => (
          <rect key={i} x={40 + i * 50} y={128} width={10} height={16} fill="#f0b94b" />
        ))}
        {[0, 1, 2].map((i) => (
          <rect key={i} x={54 + i * 200} y={128} width={54} height={16} fill="#5da2ff" opacity="0.85" />
        ))}
        <rect x="118" y="128" width="30" height="16" fill="#3e6f8e" />
        <rect x="168" y="128" width="26" height="16" fill="#3e6f8e" />
        <rect x="262" y="128" width="34" height="16" fill="#3e6f8e" />
        <text x="40" y="166" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">amber: 5ms sensor slices · blue: 20ms control · slate: telemetry filling the gaps</text>
        <text x="40" y="204" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">measured: importance order misses at U = 0.75 · rate order responses [1, 8, 54], confirmed by RTA</text>
        <text x="40" y="228" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">the bound: 300 sets under n(2^1/n − 1) with zero misses · above it, RM dropped 10%, EDF none</text>
        <text x="40" y="252" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">harmonic periods (10, 20, 40): clean at exactly U = 1.0: the bound is sufficient, never necessary</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'rate_monotonic_shorter_period.py',
  Viz: RateMonotonicViz,
  narration,
};
