import EDFViz from '../viz/EDFViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/earliest_deadline_first.py?raw';
import { narration } from './earliest-deadline-first.narration.js';

export const content = {
  given:
    'Periodic tasks: each needs C ticks of CPU every T ticks: on one preemptive processor.',
  task: 'Meet every deadline whenever ΣC/T ≤ 100%: which is the best any scheduler can promise.',
  constraint:
    'Fixed priorities cannot make that promise: they are safe only to ln 2 ≈ 69.3%, and the gap is measured here as a falling curve: at 97-100% utilization, rate-monotonic drops 62 of 120 real task sets while EDF schedules all of them.',

  origins: (
    <p>
      Liu and Layland&apos;s <strong>1973</strong> JACM paper is one of
      the most cited in computer science: it analyzed both policies at
      once: rate-monotonic (fixed: shorter period outranks, forever)
      with its n(2^{'{1/n}'}−1) → 69.3% bound, and EDF (dynamic) with
      the clean theorem <em>U ≤ 1 ⟺ schedulable</em>. Industry split
      on the result and stayed split: avionics standards favor fixed
      priorities for their analyzable worst cases; Linux mainlined{' '}
      <strong>SCHED_DEADLINE</strong> (EDF) in 2014. Buttazzo&apos;s
      &quot;Rate Monotonic vs. EDF: Judgment Day&quot; is the
      definitive honest referee: this page is that argument, run.
    </p>
  ),

  algoRole: (
    <p>
      Owns <strong>preemptive priority scheduling</strong>: at every
      instant, run the highest-priority ready job, and take the CPU away
      the moment a higher one arrives. The frame is shared by every
      policy on this page: the entire difference between meeting all
      deadlines at 97% load and dropping jobs is <em>what the priority
      is</em>: the skeleton, once again, is not the intelligence.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the priority: <strong>the absolute deadline, per job,
      recomputed at every release</strong>: dynamic, not fixed. Liu and
      Layland&apos;s theorem makes this one rule optimal on one CPU:
      utilization ≤ 100% implies zero misses. This page hammers the
      theorem rather than citing it: <strong>780 task sets</strong>{' '}
      with U ≤ 1, simulated to their full hyperperiods from the
      synchronous critical instant: zero misses, every time, including
      120 sets packed between 97% and 100%.
    </p>
  ),

  picture: (
    <p>
      An emergency room with one doctor. Rate-monotonic is triage by{' '}
      <em>patient type</em>, fixed forever: chest-pain cases always
      outrank sprains, even a sprain that has been waiting nine hours
      with a form due in five minutes. EDF is triage by{' '}
      <em>whose clock runs out next</em>: ranks change as clocks tick,
      and the doctor is never busy with a patient who could have waited
      while another&apos;s deadline lapses. The fixed board is easier to
      certify and audit: the dynamic board treats more patients on time:
      both statements are true, and hospitals (and industries) have
      chosen differently for fifty years.
    </p>
  ),

  steps: [
    <>
      <strong>On release</strong> (every T ticks): the job&apos;s
      priority is its absolute deadline, now + T.
    </>,
    <>
      <strong>At every instant:</strong> run the ready job with the
      earliest deadline; preempt whoever holds the CPU if a nearer
      deadline arrives.
    </>,
    <>
      <strong>Admission control is one line:</strong> ΣC/T ≤ 1 ⟺ all
      deadlines met: check it before accepting a task, and the theorem
      does the rest.
    </>,
    <>
      <strong>Never run past 100%:</strong> overload voids the
      contract: the misses spray unpredictably (measured below): shed
      load explicitly instead.
    </>,
    <>
      <strong>Fixed-priority alternative:</strong> above 69.3%, RM needs
      a per-set response-time analysis: exact, but per-set: the
      one-line test is EDF&apos;s luxury.
    </>,
  ],

  signals: [
    <>
      <strong>Hard periodic deadlines on one core:</strong> control
      loops, audio callbacks, sensor fusion: miss = failure, and
      utilization must stretch toward 100%.
    </>,
    <>
      <strong>Task sets change at runtime:</strong> EDF&apos;s
      admission test is a single sum: add a task, check ≤ 1, done: no
      re-analysis of the whole set.
    </>,
    <>
      <strong>Preemption is cheap and available:</strong> both policies
      lean on it: cooperative or nonpreemptive worlds change the game
      entirely.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>rate-monotonic</strong>, and below
      69.3% utilization it is <em>equally perfect</em> (150 sets, zero
      misses, asserted) with a priceless extra: priorities are static,
      so worst-case response times are analyzable per task and the
      highest rank is untouchable even in overload. The gap only opens
      above ln 2: and there it is real: 58 of 120 sets survive RM in
      the 97-100% bin, versus all 120 under EDF.
    </>
  ),

  strength: (
    <>
      <strong>Optimal on one CPU, with a one-line admission test.</strong>{' '}
      780 hyperperiod simulations at U ≤ 1: zero misses (the theorem,
      hammered); the classic (2,5)/(4,7) set at 97.1% scheduled where
      RM demonstrably drops a job; and full 100% utilization reachable:
      no other priority rule on this page can claim any of the three.
    </>
  ),
  weakness: (
    <>
      <strong>Overload is chaos, and analyzability has a
      constituency.</strong> Push the same pair to U = 1.171 and
      EDF&apos;s misses spray across <em>both</em> tasks ([2, 2]
      measured) while RM shields its favorite absolutely ([0, 4]): in
      certifiable systems that predictability outbids optimality, which
      is why planes fly fixed priorities. Honest measurement note: with
      well-separated periods EDF also shields the fast task (its
      deadlines are simply earliest): the spray needs near-equal
      non-harmonic periods, and the page&apos;s gadget has them.
    </>
  ),

  problem: 'Real-time scheduling',
  problemSlug: 'realtime-scheduling',
  rivals: [
    {
      name: 'EDF × dynamic deadline priority',
      isThisUnit: true,
      algoName: 'Earliest deadline first',
      cost: 'O(log n) per decision',
      wins: (
        <>
          <strong>780/780 task sets at U ≤ 1</strong>, the one-line
          admission test, and every point of utilization up to 100%
          usable: the optimality theorem, running.
        </>
      ),
      costs: (
        <>
          Dynamic priorities resist static certification, and overload
          misses spray unpredictably (measured).
        </>
      ),
      when: 'Hard periodic deadlines with utilization worth harvesting: Linux SCHED_DEADLINE’s policy.',
    },
    {
      name: 'Rate-monotonic scheduling',
      algoName: 'Rate-monotonic scheduling',
      cost: 'O(1) priority, static',
      wins: (
        <>
          Static ranks: analyzable response times, overload that
          degrades in a <em>chosen</em> order ([0, 4] measured: the
          fast task untouchable), and hardware-friendly fixed
          priorities.
        </>
      ),
      costs: (
        <>
          Safe only to 69.3% by the bound: above it, 62 of 120 sets
          dropped in the hottest bin: unless you pay for per-set
          response-time analysis.
        </>
      ),
      when: 'Certified and safety-critical systems where predictable degradation outbids throughput: avionics’ fifty-year answer.',
    },
    {
      name: 'Activity selection × earliest finish',
      algoName: 'Activity selection',
      cost: 'O(n log n), offline',
      wins: (
        <>
          The offline, non-preemptive cousin (a live unit here): when
          jobs are rigid intervals and the goal is <em>count</em>, its
          exchange argument is exact.
        </>
      ),
      costs: (
        <>
          No preemption, no periods, no deadlines-vs-finish distinction:
          a different question wearing similar clothes.
        </>
      ),
      when: 'Batch interval selection: the contrast that teaches what “real-time” actually adds.',
    },
  ],
  neverUse: {
    name: 'Fixed priorities past the bound, unanalyzed',
    why: (
      <>
        Between 69.3% and 100% utilization there is no blanket safety:
        rate-monotonic dropped <strong>22 of 120</strong> sets in the
        90-97% bin and <strong>62 of 120</strong> at 97-100%, measured:
        and a dropped set fails deterministically, every hyperperiod,
        forever. RM above the bound is not forbidden: it is{' '}
        <em>conditional</em>: exact response-time analysis can bless a
        specific set. The sin is shipping the priorities without the
        analysis, on the strength of &quot;it worked in the demo&quot;:
        the demo was one point on a curve this page drew in full.
      </>
    ),
  },

  contest: {
    instance:
      'periodic task sets on one preemptive CPU, simulated to full hyperperiods from the synchronous critical instant; 120 random sets per utilization bin plus 300 broad-range sets',
    columns: ['sets scheduled, U ≤ 1', 'overload (U = 1.171)'],
    rows: [
      {
        method: 'EDF × deadline priority',
        isThisUnit: true,
        values: ['780 / 780', 'spray: [2, 2]'],
        best: 0,
        verdict: 'the optimality theorem, hammered bin by bin',
      },
      {
        method: 'Rate-monotonic',
        values: ['safe to 69.3%; then the curve', 'shield: [0, 4]'],
        verdict: 'bins: 120/120 · 119/120 · 98/120 · 58/120 as U climbs to 1',
      },
    ],
    source:
      'python solutions/earliest_deadline_first.py prints this table and asserts: EDF at zero misses on all 780 sets with U ≤ 1 (300 broad + 480 binned); RM clean on 150 sets below ln 2; the measured Liu-Layland curve falling 120/120 → 119/120 → 98/120 → 58/120; the classic (2,5)/(4,7) casualty deterministic (EDF clean, RM drops a job at 97.1%); and the overload flip on (3,5)/(4,7) at U = 1.171: EDF misses [2, 2] across both tasks, RM [0, 4] with its favorite untouched.',
  },

  figure: (
    <Figure
      id="fig-edf-gap"
      aspect="16 / 7"
      caption="The gap, drawn. Below ln 2 ≈ 69.3%, both policies are perfect (measured). Above it, fixed priorities enter the conditional zone: the measured survival curve falls to 48% by full load, while EDF holds 100% all the way to U = 1: Liu and Layland's two theorems as one picture. Past U = 1 nobody is safe, and the two policies fail in opposite styles: EDF sprays, RM shields its favorites."
      cite={{
        text: 'Liu & Layland, "Scheduling Algorithms for Multiprogramming in a Hard-Real-Time Environment", JACM 20(1), 1973. The honest modern comparison is Buttazzo, "Rate Monotonic vs. EDF: Judgment Day", Real-Time Systems 29, 2005.',
        href: 'https://doi.org/10.1145/321738.321743',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="Schedulability versus utilization: EDF flat at one hundred percent until U equals one; rate-monotonic falling past the Liu-Layland bound">
        <line x1="60" y1="230" x2="600" y2="230" stroke="#2a3450" />
        <line x1="60" y1="230" x2="60" y2="40" stroke="#2a3450" />
        <text x="300" y="256" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">utilization ΣC/T →</text>
        <text x="26" y="60" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">100%</text>
        <line x1="60" y1="52" x2="512" y2="52" stroke="#62d98a" strokeWidth="2.4" />
        <line x1="512" y1="52" x2="512" y2="230" stroke="#62d98a" strokeWidth="2.4" />
        <text x="380" y="44" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">EDF: perfect to U = 1</text>
        <path d="M 60 52 L 372 52 C 420 52, 430 90, 452 120 C 474 152, 490 170, 512 148" fill="none" stroke="#f0b94b" strokeWidth="2.2" />
        <text x="140" y="80" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">rate-monotonic</text>
        <line x1="372" y1="44" x2="372" y2="230" stroke="#e2606c" strokeDasharray="5 4" />
        <text x="322" y="246" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="10">ln 2 = 69.3%</text>
        <line x1="512" y1="44" x2="512" y2="230" stroke="#2a3450" strokeDasharray="4 4" />
        <text x="500" y="246" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">U = 1</text>
        <text x="410" y="188" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="10">measured: 98/120 · 58/120</text>
        <text x="60" y="278" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">beyond U = 1: EDF misses spray [2, 2] · RM shields its favorite [0, 4] · both measured</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'earliest_deadline_first.py',
  Viz: EDFViz,
  narration,
};
