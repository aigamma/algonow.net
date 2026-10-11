import LptSchedulingViz from '../viz/LptSchedulingViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/job_scheduling_approximation_longest_processing_time.py?raw';
import { narration } from './job-scheduling-approximation-longest-processing-time.narration.js';

export const content = {
  given:
    'n jobs with known processing times and m identical machines: build steps across a CI fleet, renders across a farm, batch queries across database workers. Any job may run on any machine, nothing is preempted, and the cost is the makespan, the moment the last machine falls idle. Minimizing it is NP-hard even for two machines (it is partition), so past a couple of dozen jobs the exact answer is out of reach and the question becomes how far a cheap rule can be from it.',
  task: 'Job scheduling approximation. The algorithm is Graham’s list scheduling: take the jobs in some order and hand each to the machine that is least loaded so far. In arrival order it is online and never worse than 2 − 1/m times the optimum. The heuristic is the order: longest processing time first. Sort the jobs descending, then list-schedule, and the guarantee tightens to 4/3 − 1/(3m), a bound Graham proved tight in 1969. The long jobs get placed while the machines are empty and the short ones fill the gaps, which is the whole idea, and the file prices it against exact optima rather than taking the theorem on faith.',
  constraint:
    'Measured against exact optima by branch and bound (checked against brute force on 60 small instances): on 300 random instances of 10 to 14 jobs on 2 to 4 machines, LPT averaged 1.0212 × OPT, hit 1.1739 at worst (on 4 machines, where the bound is 1.25), and was optimal on 75 of 300; the same jobs in arrival order averaged 1.1221 with worst 1.4688. The tight families return exactly 7/6, 11/9, 15/12, 19/15 for m = 2 to 5 and exactly 2 − 1/m for arrival order. MULTIFIT averaged 1.0099 (wins 148, ties 100, losses 52 against LPT) and a move-or-swap local search from the LPT schedule averaged 1.0045. On 20 instances of 1,000 jobs across 10 machines LPT met the lower bound max(p, ⌈Σp/m⌉) every time, arrival order sat 0.87 percent above it on average. Exact search took 988 nodes at n = 12 and 27,022 at n = 24 with sizes to 1,000. 0.2 s.',

  origins: (
    <p>
      Ron Graham wrote the two papers that founded approximation analysis
      while scheduling tasks at Bell Labs. <strong>1966</strong>: list
      scheduling in any order is never worse than 2 − 1/m times optimal, and
      the famous anomalies appear (adding a machine or shortening a job can
      lengthen the schedule). <strong>1969</strong>: sort longest first and the
      bound drops to 4/3 − 1/(3m), with an instance that meets it exactly.
      Coffman, Garey, and Johnson (1978) turned bin packing around into
      MULTIFIT, searching for the smallest capacity that first fit decreasing
      packs into m bins, and Yue (1990) settled its ratio at 13/11. Hochbaum
      and Shmoys (1987) gave the polynomial-time approximation scheme: any
      precision you like, at a cost exponential in 1/ε. The problem is
      P||C<sub>max</sub> in the Graham, Lawler, Lenstra, Rinnooy Kan notation,
      and LPT remains the rule people actually run.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>placement</strong>: whatever the order, the next job
      goes to the machine that finishes earliest, so no machine idles while a
      job waits, and the last job to start begins no later than the average
      load. That one fact is the whole 2 − 1/m proof. The file runs it in
      arrival order on every instance (mean <strong>1.1221 × OPT</strong>,
      worst 1.4688) and on the adversarial family of ninety unit jobs followed
      by one job of length ten, where it returns 19 against an optimum of 10.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>order</strong>. Longest first means the job that ends
      the schedule is one of the short ones, so the overhang past the average
      is small; Graham’s case analysis turns that into 4/3 − 1/(3m). Measured:{' '}
      <strong>1.0212 × OPT</strong> on average, optimal on a quarter of the
      instances, worst 1.0526, 1.1111, 1.1739 on 2, 3, 4 machines against the
      bounds 1.1667, 1.2222, 1.25, and the lower bound max(p, ⌈Σp/m⌉) met on
      all twenty instances of a thousand jobs. The price is the sort, and the
      need to know every job before the first one starts.
    </p>
  ),

  picture: (
    <p>
      Picture packing a moving van with m helpers carrying boxes to m stacks.
      Hand out boxes in whatever order they come and the last box, if it is a
      wardrobe, makes one stack tower over the rest. Sort the boxes first,
      wardrobes before shoeboxes, and the big things settle while the stacks
      are all empty; the shoeboxes level everything off at the end. The tallest
      stack can still beat the best possible stacking, but only by a third at
      the very most, and usually by a shoebox.
    </p>
  ),

  steps: [
    <>
      <strong>Sort the jobs</strong> by processing time, longest first.
    </>,
    <>
      <strong>Keep the machine loads</strong> in a min-heap, or scan them when
      m is small.
    </>,
    <>
      <strong>Place the next job</strong> on the least loaded machine and add
      its time to that load.
    </>,
    <>
      <strong>Report the makespan</strong>, the largest load, with the lower
      bound max(p, ⌈Σp/m⌉) beside it as a receipt.
    </>,
    <>
      <strong>Spend spare time</strong> on MULTIFIT or a move-or-swap local
      search from the LPT schedule when the gap to the bound matters.
    </>,
  ],

  signals: [
    <>
      <strong>Identical machines, independent jobs, no preemption:</strong> the
      plain P||C<sub>max</sub> setting the theorem covers.
    </>,
    <>
      <strong>All jobs known up front:</strong> the sort needs the whole list;
      if jobs arrive over time, you are back to arrival order and 2 − 1/m.
    </>,
    <>
      <strong>Many jobs, none dominant:</strong> LPT then lands on the lower
      bound itself, as it did on all twenty thousand-job instances.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>list scheduling in arrival order</strong>:
      the same placement rule without the sort, 1.1221 × OPT on average and
      1.9 × OPT on the adversarial order at m = 10.
    </>
  ),

  strength: (
    <>
      <strong>A proven 4/3 − 1/(3m) in one sort and one pass.</strong> Measured
      1.0212 on average, worst 1.1739 inside the 1.25 bound, and dead on the
      lower bound when the jobs are many and small.
    </>
  ),
  weakness: (
    <>
      <strong>Offline, and beaten by a little extra work.</strong> It must see
      every job before placing the first; MULTIFIT won 148 of 300 head-to-heads
      and a local search from LPT’s own schedule averaged 1.0045.
    </>
  ),

  problem: 'Makespan approximation',
  problemSlug: 'shop-scheduling',
  rivals: [
    {
      name: 'Job scheduling approximation × Longest processing time',
      isThisUnit: true,
      algoName: 'Job scheduling approximation',
      cost: 'O(n log n) for the sort plus O(n log m) placements',
      wins: (
        <>
          <strong>4/3 − 1/(3m), tight and proven</strong>; measured 1.0212 mean,
          1.1739 worst, lower bound met on 20 of 20 large instances.
        </>
      ),
      costs: (
        <>
          Needs every job before it starts; optimal on only 75 of 300 small
          instances; the tight family really does lose a third.
        </>
      ),
      when: 'Batch workloads you can sort: render farms, CI fleets, partitioning data across identical workers.',
    },
    {
      name: 'Graham list scheduling × Arrival order (online)',
      algoName: 'Graham list scheduling',
      cost: 'O(n log m): no sort, one heap pop per job',
      wins: (
        <>
          Works online, one job at a time, and still guarantees 2 − 1/m; 0.87
          percent above the lower bound on the thousand-job instances.
        </>
      ),
      costs: (
        <>
          1.1221 × OPT on average, 1.4688 at worst, and exactly 1.9 × OPT when
          ninety unit jobs precede one long one on ten machines.
        </>
      ),
      when: 'Jobs arrive over time and nothing may wait for a sort: load balancers, thread pools, work queues.',
    },
    {
      name: 'MULTIFIT: first fit decreasing with a capacity search',
      algoName: 'First fit decreasing',
      cost: 'O(n log n) per packing, about log of the gap packings',
      wins: (
        <>
          <strong>1.0099 × OPT mean</strong>, worst 1.0833; beat LPT on 148 of
          300 instances and tied 100; ratio 13/11 proven.
        </>
      ),
      costs: (
        <>
          Several full packings instead of one pass, lost to LPT on 52
          instances, and a harder proof to hold in your head.
        </>
      ),
      when: 'Offline, the schedule runs for hours, and a few extra passes over the job list are free.',
    },
    {
      name: 'Branch and bound (exact)',
      algoName: 'Branch and bound',
      cost: 'exponential; LPT as the upper bound, ⌈Σp/m⌉ as the lower',
      wins: (
        <>
          The optimum itself: 310 nodes on average at n ≤ 14, because the lower
          bound equals OPT on 240 of 300 instances and prunes everything.
        </>
      ),
      costs: (
        <>
          988, 4,795, 54,121, 27,022 nodes at n = 12 to 24 with sizes to 1,000:
          erratic and exponential; nothing at a thousand jobs.
        </>
      ),
      when: 'Small instances, or as the referee that prices every heuristic on this page.',
    },
  ],
  neverUse: {
    name: 'Arrival-order list scheduling when the long jobs may come last',
    why: (
      <>
        The placement rule is the same; only the order differs, and the order
        can be chosen against you. Put ninety unit jobs in front of one job of
        length ten on ten machines. Arrival order spreads the units evenly,
        nine per machine, then the long job lands on a machine already at nine:
        makespan <strong>19</strong>. The optimum is <strong>10</strong>: the
        long job alone on one machine, ten units on each of the other nine.
        That is 2 − 1/m exactly, and it grows toward 2 with the fleet. LPT
        sorts the long job to the front and returns 10. On random inputs the
        gap is smaller (1.1221 against 1.0212 mean) but it never closes, and
        the sort costs one pass. When the jobs are in hand, sort them.
      </>
    ),
  },

  contest: {
    instance:
      '300 random instances (10 to 14 jobs, 2 to 4 machines, sizes 1 to 50) with the exact optimum by branch and bound; the tight families for each rule; 20 instances of 1,000 jobs on 10 machines against the lower bound max(p, ⌈Σp/m⌉); one referee: makespan over the optimum',
    columns: ['mean ratio, 300 instances', 'worst ratio', 'n = 1,000, m = 10', 'guarantee'],
    rows: [
      {
        method: 'LPT (longest first, least loaded)',
        isThisUnit: true,
        values: ['1.0212', '1.1739', 'met the lower bound, 20 of 20', '4/3 − 1/(3m), tight'],
        best: 3,
        verdict: 'one sort, one pass, a proven third',
      },
      {
        method: 'list scheduling in arrival order',
        values: ['1.1221', '1.4688', '0.87% above (1.11% max)', '2 − 1/m, tight; online'],
        verdict: 'the online fallback',
      },
      {
        method: 'MULTIFIT',
        values: ['1.0099', '1.0833', 'met the lower bound', '13/11 (Yue 1990)'],
        verdict: 'wins 148, ties 100, loses 52 against LPT',
      },
      {
        method: 'move-or-swap local search from LPT',
        values: ['1.0045', '1.0566', 'not run', 'none beyond LPT’s start'],
        verdict: 'cheap polish, no new proof',
      },
      {
        method: 'branch and bound (exact)',
        values: ['1.000', '1.000', 'hopeless', 'exponential: 988 to 54,121 nodes at n = 12 to 24'],
        verdict: 'the referee',
      },
    ],
    source:
      'python solutions/job_scheduling_approximation_longest_processing_time.py prints these tables and asserts: the exact solver equals brute force on 60 instances; on every random instance LB ≤ OPT ≤ LPT ≤ (4/3 − 1/(3m)) OPT and OPT ≤ list ≤ (2 − 1/m) OPT, with MULTIFIT and the local search never below OPT and the local search never above LPT; the tight family returns 4m − 1 against 3m for m = 2 to 5 and the list family 2m − 1 against m; LPT and MULTIFIT never fall below the lower bound on the thousand-job instances and LPT stays within 0.5 percent of it; the adversarial order returns 19 at m = 10; exact-search nodes grow more than tenfold from n = 12 to 24.',
  },

  figure: (
    <Figure
      id="fig-lpt-ratios"
      aspect="16 / 7"
      caption="Left: makespan over the exact optimum on 300 random instances, mean (solid) and worst (outline), for LPT, arrival order, MULTIFIT, and the local search started from LPT. Right: Graham’s tight family for three machines, jobs 5, 5, 4, 4, 3, 3, 3. LPT places the fives and fours while the machines are empty, then the three threes raise one machine to 11; the optimum pairs 5 with 4 twice and stacks the threes for 9. 11/9 is 4/3 − 1/9 exactly."
      cite={{
        text: 'R. L. Graham, "Bounds for certain multiprocessing anomalies," Bell System Technical Journal 45(9), 1966. R. L. Graham, "Bounds on multiprocessing timing anomalies," SIAM Journal on Applied Mathematics 17(2), 1969. E. G. Coffman, M. R. Garey, and D. S. Johnson, "An application of bin-packing to multiprocessor scheduling," SIAM Journal on Computing 7(1), 1978. D. S. Hochbaum and D. B. Shmoys, 1987.',
        href: 'https://doi.org/10.1137/0117039',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="Bar chart of mean and worst makespan ratios for four methods, beside Gantt charts of the LPT schedule and the optimal schedule on Graham's tight instance for three machines">
        {(() => {
          const bars = [['LPT', 1.0212, 1.1739, '#5da2ff'], ['arrival order', 1.1221, 1.4688, '#9aa5bd'], ['MULTIFIT', 1.0099, 1.0833, '#f0b94b'], ['local search', 1.0045, 1.0566, '#62d98a']];
          const y = (r) => 230 - (r - 1) * 380;
          const sx = (t) => 350 + t * 24;
          const lptRows = [[5, 3], [5, 3], [4, 4, 3]];
          const optRows = [[5, 4], [5, 4], [3, 3, 3]];
          const gantt = (rows, y0, color) => rows.map((row, i) => {
            let t = 0;
            return row.map((p, j) => {
              const x = sx(t);
              t += p;
              return <rect key={`${i}-${j}`} x={x + 1} y={y0 + i * 22} width={p * 24 - 2} height="18" fill={color} fillOpacity={0.35 + 0.12 * j} stroke={color} />;
            });
          });
          return (
            <g fontFamily="ui-monospace, monospace">
              <text x="20" y="22" fill="#9aa5bd" fontSize="10">makespan / OPT on 300 random instances: mean (solid) and worst (outline)</text>
              <line x1="30" y1={y(1.25)} x2="310" y2={y(1.25)} stroke="#e2606c" strokeDasharray="4 3" />
              <text x="232" y={y(1.25) - 4} fill="#e2606c" fontSize="9">LPT bound at m = 4: 1.25</text>
              {bars.map(([name, m, w, c], i) => (
                <g key={name}>
                  <rect x={36 + i * 70} y={y(w)} width="50" height={230 - y(w)} fill="none" stroke={c} strokeOpacity="0.8" />
                  <rect x={41 + i * 70} y={y(m)} width="40" height={230 - y(m)} fill={c} fillOpacity="0.85" />
                  <text x={34 + i * 70} y={y(w) - 5} fill={c} fontSize="9">{m.toFixed(3)}/{w.toFixed(3)}</text>
                  <text x={34 + i * 70} y="246" fill="#9aa5bd" fontSize="9">{name}</text>
                </g>
              ))}
              <text x="20" y="268" fill="#62d98a" fontSize="10">the sort cuts the mean gap from 12 percent to 2; MULTIFIT and polishing shave the rest</text>
              <text x="340" y="22" fill="#9aa5bd" fontSize="10">tight family, m = 3: jobs 5 5 4 4 3 3 3</text>
              <text x="340" y="44" fill="#5da2ff" fontSize="10">LPT: makespan 11</text>
              {gantt(lptRows, 52, '#5da2ff')}
              <line x1={sx(11)} y1="48" x2={sx(11)} y2="120" stroke="#e2606c" strokeDasharray="3 3" />
              <text x="340" y="150" fill="#62d98a" fontSize="10">optimum: makespan 9</text>
              {gantt(optRows, 158, '#62d98a')}
              <line x1={sx(9)} y1="154" x2={sx(9)} y2="226" stroke="#62d98a" strokeDasharray="3 3" />
              {[0, 3, 6, 9, 11].map((t) => (
                <text key={t} x={sx(t) - 3} y="242" fill="#9aa5bd" fontSize="9">{t}</text>
              ))}
              <text x="340" y="268" fill="#f0b94b" fontSize="10">11 / 9 = 1.222 = 4/3 − 1/(3 x 3), the bound met exactly</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'job_scheduling_approximation_longest_processing_time.py',
  Viz: LptSchedulingViz,
  narration,
};
