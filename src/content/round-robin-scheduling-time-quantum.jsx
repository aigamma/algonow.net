import RoundRobinViz from '../viz/RoundRobinViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/round_robin_scheduling_time_quantum.py?raw';
import { narration } from './round-robin-scheduling-time-quantum.narration.js';

export const content = {
  given:
    'One processor and sixty jobs arriving over time: most are interactive bursts of one to six units, some are batch bursts of twenty to eighty, and the scheduler never knows a burst’s length in advance. Every switch between jobs costs one unit. Keep the interactive jobs responsive without handing the processor to the switching.',
  task: 'Round-robin scheduling. The algorithm is a FIFO ready queue: the job at the head runs; when it finishes or its turn expires it goes to the back and the next one runs. The heuristic is the time quantum, the fixed length of a turn. A small quantum gives every ready job a share of the processor within one lap of the queue, so a one-unit job stuck behind an eighty-unit job waits one quantum instead of eighty units; a quantum below the switch cost gives the processor to the switching; a quantum above every burst turns the policy back into first-come first-served. The rule of thumb since the 1960s is to size the quantum so that most bursts finish inside one turn.',
  constraint:
    'Measured on 60 jobs (1,047 units of demand over 1,381 time units, about 76% load, switch cost 1) with every schedule checked for legality and conservation: at q = 4 round-robin answers interactive jobs in 11.8 units on average against 38.0 for FCFS, at utilization 0.809 against 0.947, with mean turnaround 82.0 against 55.1 and maximum wait 428 against 147. The sweep: q = 1 gives response 10.7 but utilization 0.523 and turnaround 233.6 (956 switches); q = 16 gives turnaround 55.6, response 20.1; q = 64 is nearly FCFS (35.8). Between two turns of a job, every other job ran at most once on every one of 1,000-odd gaps. Shortest-job-first matched the best of 5,040 orders on 200 of 200 instances and shortest-remaining-time the preemptive optimum on 100 of 100, but both need the burst lengths; the multilevel feedback queue reaches response 5.4 at turnaround 56.8 without them. A convoy of eight two-unit jobs behind an eighty-unit job waits 90.5 on average under FCFS and 14.5 under q = 4; a quantum below the switch cost (q = 1, c = 2) runs at utilization 0.338.',

  origins: (
    <p>
      Round-robin time slicing arrived with time-sharing itself: Corbató,
      Merwin-Daggett, and Daley&apos;s Compatible Time-Sharing System at MIT
      (<strong>1962</strong>) gave each user a quantum in turn so that a
      dozen typists shared one IBM 7094, and the quantum was tuned by
      hand against the swap time. Leonard Kleinrock analyzed the idea as
      processor sharing (<strong>1964</strong>, &quot;Analysis of a
      time-shared processor&quot;; Queueing Systems, 1976), the limit of a
      vanishing quantum, where a job&apos;s expected time in system is
      proportional to its own length and short jobs are never held hostage
      by long ones. Schrage (1968) proved shortest-remaining-time optimal
      for mean waiting when bursts are known, which they never are; the
      multilevel feedback queue (CTSS again, then Multics and BSD) learns
      them by demotion. Every general-purpose kernel since UNIX has run
      some round-robin with a quantum: 10 to 100 milliseconds in classic
      UNIX, 4 to 12 in Linux&apos;s CFS, which keeps the fairness and drops
      the fixed quantum (puzzle 162 on this site colors the registers;
      this page shares the processor).
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>queue</strong>: arrivals and preempted jobs join the
      back, the head runs, nothing is reordered. That discipline is what
      makes the fairness bound a theorem: between two consecutive turns of
      any job, every other job runs at most once, so the gap is at most
      k (q + c) + c for the k jobs that ran. The referee checks it on
      every gap of every run, along with legality (one job at a time,
      nothing before its arrival, each job&apos;s segments summing to its
      burst) and conservation (1,047 busy units under every policy, the
      makespan equal to busy plus idle plus switches). Against FCFS the
      queue alone changes nothing: with an infinite quantum the two
      policies produced <strong>identical numbers</strong>.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>trade</strong>: the quantum decides how much
      responsiveness costs. Measured across q = 1 to 64 and FCFS:
      interactive response 10.7, 10.3, 11.8, 15.5, 20.1, 27.0, 35.8, 38.0;
      utilization 0.523, 0.690, 0.809, 0.882, 0.914, 0.931, 0.942, 0.947;
      mean turnaround 233.6, 127.8, 82.0, 60.6, 55.6, 56.8, 57.8, 55.1.
      At <strong>q = 4</strong>, the scale of an interactive burst, response
      falls to under a third of FCFS for a 0.14 utilization cost; the
      textbook rule of 80% of bursts inside a quantum says 36 on this
      bimodal mix, which measures almost like FCFS. The quantum is a dial
      between the typist and the batch queue, and the dial has no free
      setting.
    </p>
  ),

  picture: (
    <p>
      A barber with one chair and a line of customers, some wanting a trim,
      some a full styling. First come, first served: the trims wait an hour
      behind one styling. Round-robin: everyone gets a fixed few minutes in
      the chair, then back to the end of the line. Trims finish in one or
      two turns and leave happy; the styling takes many turns and finishes
      last, which it would have anyway. Make the turns too short and the
      barber spends the day changing capes; make them too long and it is
      first-come first-served with a timer nobody hears.
    </p>
  ),

  steps: [
    <>
      <strong>Admit:</strong> every arriving job joins the back of the ready
      queue, ahead of the job just preempted (they arrived while it ran).
    </>,
    <>
      <strong>Dispatch:</strong> take the head; if it differs from the last
      job that ran, pay the switch cost c.
    </>,
    <>
      <strong>Run:</strong> for min(remaining, q) units; record the first
      dispatch (response) and the segment.
    </>,
    <>
      <strong>Requeue or retire:</strong> an unfinished job goes to the back;
      a finished job records turnaround = finish − arrival and waiting =
      turnaround − burst.
    </>,
    <>
      <strong>Choose q:</strong> the fairness bound k (q + c) + c and the
      utilization b / (b + switches × c) pull opposite ways; the sweep
      measures both.
    </>,
  ],

  signals: [
    <>
      <strong>Interactive and batch work share one processor:</strong>{' '}
      shells, editors, and servers next to compiles and backups.
    </>,
    <>
      <strong>Burst lengths are unknown:</strong> the optimal policies need
      them; round-robin needs only a clock.
    </>,
    <>
      <strong>Fairness is a requirement, not a hope:</strong> no job can be
      starved, and the bound on the wait for a turn is a theorem.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>first-come first-served</strong>: run
      the head to completion. Fewest switches (59), highest utilization
      (0.947), and the best mean turnaround here (55.1), but interactive
      response 38.0 against 11.8, and 90.5 against 14.5 behind a convoy.
    </>
  ),

  strength: (
    <>
      <strong>Responsiveness with no knowledge of the jobs.</strong>{' '}
      Interactive response 11.8 against 38.0 for FCFS at q = 4; a convoy
      cut from 90.5 to 14.5; a fairness bound that held on every turn; a
      queue and a clock, nothing else.
    </>
  ),
  weakness: (
    <>
      <strong>It buys response with turnaround and switches.</strong> Mean
      turnaround 82.0 against 55.1 for FCFS at q = 4, 247 switches
      against 59, utilization 0.809 against 0.947, maximum wait 428
      against 147: the batch jobs pay. The quantum is a guess (the 80%
      rule says 36 here, which responds like FCFS), and a multilevel
      feedback queue beats plain round-robin on both response (5.4) and
      turnaround (56.8) by learning which jobs are short.
    </>
  ),

  problem: 'CPU and resource scheduling',
  problemSlug: 'cpu-scheduling',
  rivals: [
    {
      name: 'Round-robin scheduling × Time quantum',
      isThisUnit: true,
      algoName: 'Round-robin scheduling',
      cost: 'a FIFO queue and a timer',
      wins: (
        <>
          <strong>Response 11.8 against 38.0</strong> for FCFS; a proven
          bound on the wait for a turn; no burst knowledge.
        </>
      ),
      costs: (
        <>
          Turnaround 82.0 against 55.1; 247 switches; a quantum to choose.
        </>
      ),
      when: 'Unknown bursts, mixed interactive and batch work, and fairness as a requirement.',
    },
    {
      name: 'Shortest processing time',
      algoName: 'Shortest processing time',
      cost: 'needs every burst length in advance',
      wins: (
        <>
          The proven optimum for mean waiting: 22.7 against 64.6, equal to
          the best of 5,040 orders on 200 of 200 instances; its preemptive
          form (SRTF) reaches 14.2 and response 1.4.
        </>
      ),
      costs: (
        <>
          The scheduler never has the bursts; long jobs can starve.
        </>
      ),
      when: 'Batch systems where job lengths are declared or predicted well.',
    },
    {
      name: 'Multilevel feedback queue',
      algoName: 'Multilevel feedback queue',
      cost: 'several round-robin queues with growing quanta',
      wins: (
        <>
          Response 5.4 and turnaround 56.8 on the same workload: short jobs
          stay on top, long jobs sink to long quanta; no burst knowledge.
        </>
      ),
      costs: (
        <>
          More parameters (levels, quanta, demotion, boosts); maximum wait
          284 against 147.
        </>
      ),
      when: 'General-purpose operating systems; the historical successor to plain round-robin.',
    },
    {
      name: 'Completely fair scheduler',
      algoName: 'Completely fair scheduler',
      cost: 'a red-black tree ordered by virtual runtime',
      wins: (
        <>
          Round-robin&apos;s fairness without a fixed quantum: the job with
          the least virtual runtime runs next, weights for priorities.
        </>
      ),
      costs: (
        <>
          O(log n) per pick; a latency target to tune instead of a quantum.
        </>
      ),
      when: 'Linux since 2007: many processes, weighted shares, and the fairness invariant made exact.',
    },
  ],
  neverUse: {
    name: 'A quantum shorter than the context switch',
    why: (
      <>
        Set q = 1 with a switch cost of 2 on the same sixty jobs: the
        processor spends two units switching for every unit of work,{' '}
        <strong>utilization 0.338</strong>, and mean turnaround rises to
        486.8 from 82.0 at q = 4 and 55.1 under FCFS. Every job still gets
        its fair turn, which is exactly the problem: fairness is being
        delivered at six times the cost of the work. Even q = 1 with a
        switch cost of 1 runs at 0.523 utilization with 956 switches. The
        quantum must be several times the switch cost before round-robin
        is a scheduler rather than a cape-changing exercise.
      </>
    ),
  },

  contest: {
    instance:
      'one processor, 60 jobs arriving over 1,381 time units (interactive bursts of 1 to 6, batch bursts of 20 to 80; 1,047 units of demand, about 76% load), context switch cost 1; every schedule checked for legality and conservation; shortest-job-first and shortest-remaining-time checked against exhaustive optima on small instances; the round-robin fairness bound checked on every gap',
    columns: ['mean response (interactive)', 'mean turnaround', 'mean waiting', 'max wait', 'switches', 'utilization'],
    rows: [
      {
        method: 'round-robin, q = 4',
        isThisUnit: true,
        values: ['11.8', '82.0', '64.6', '428', '247', '0.809'],
        best: 0,
        verdict: 'response bought with turnaround',
      },
      {
        method: 'round-robin, q = 1',
        values: ['10.7', '233.6', '216.2', '1,171', '956', '0.523'],
        verdict: 'the switching eats the processor',
      },
      {
        method: 'round-robin, q = 16',
        values: ['20.1', '55.6', '38.2', '179', '99', '0.914'],
        verdict: 'the best turnaround of the sweep',
      },
      {
        method: 'FCFS (q = infinity)',
        values: ['38.0', '55.1', '37.7', '147', '59', '0.947'],
        verdict: 'the baseline; convoys',
      },
      {
        method: 'shortest-job-first (needs bursts)',
        values: ['17.7', '40.1', '22.7', '113', '59', '0.947'],
        verdict: 'the non-preemptive optimum, proven',
      },
      {
        method: 'shortest-remaining-time (needs bursts)',
        values: ['1.4', '31.7', '14.2', '127', '85', '0.925'],
        verdict: 'the preemptive optimum, proven',
      },
      {
        method: 'multilevel feedback queue 4 / 8 / 16',
        values: ['5.4', '56.8', '39.4', '284', '122', '0.896'],
        verdict: 'the rival that learns the bursts',
      },
    ],
    source:
      'python solutions/round_robin_scheduling_time_quantum.py prints this table and asserts: every schedule legal (one job at a time, nothing before arrival, segments summing to bursts) and conserving (identical busy time, makespan = busy + idle + switches); SJF equal to the minimum over all 5,040 orders on 200 instances of 7 jobs and SRTF equal to the preemptive optimum from a dynamic program on 100 staggered instances; the fairness bound k (q + c) + c on every gap with every other job running at most once; FCFS identical to q = infinity; q = 1 utilization 0.2 below FCFS and more than five times the switches of q = 64; at q = 4 interactive response under a third of FCFS, utilization within 0.15, turnaround under half of q = 1; SJF waiting at most round-robin’s and SRTF at most SJF’s; MLFQ response below round-robin’s; the convoy response ratio above 5; and the q = 1, c = 2 run below q = 1, c = 1 in utilization by 0.1 with turnaround above 1.5 times q = 4.',
  },

  figure: (
    <Figure
      id="fig-round-robin-quantum"
      aspect="16 / 7"
      caption="The quantum dial, measured. Left: mean interactive response (amber) and mean turnaround (blue) against the quantum on a log axis, with FCFS at the right edge: response climbs steadily toward FCFS as the quantum grows, turnaround collapses from 233.6 at q = 1 to about 55 from q = 16 on. Right: utilization against the quantum, the cost of the switching, from 0.523 at q = 1 to 0.947 under FCFS; the recommended q = 4 sits where response is still a third of FCFS and utilization has recovered to 0.81."
      cite={{
        text: 'F. J. Corbató, M. Merwin-Daggett, and R. C. Daley, "An experimental time-sharing system," AFIPS Spring Joint Computer Conference, 1962, DOI 10.1145/1460833.1460871. L. Kleinrock, "Analysis of a time-shared processor," Naval Research Logistics Quarterly 11(1), 1964; Queueing Systems, vol. 2, 1976. A. Silberschatz, P. B. Galvin, and G. Gagne, Operating System Concepts, chapter 5.',
        href: 'https://doi.org/10.1145/1460833.1460871',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="Mean interactive response and mean turnaround against the quantum on a log axis with FCFS at the right, and utilization against the quantum">
        {(() => {
          const qs = [1, 2, 4, 8, 16, 32, 64, 128];
          const labels = ['1', '2', '4', '8', '16', '32', '64', 'FCFS'];
          const resp = [10.7, 10.3, 11.8, 15.5, 20.1, 27.0, 35.8, 38.0];
          const turn = [233.6, 127.8, 82.0, 60.6, 55.6, 56.8, 57.8, 55.1];
          const util = [0.523, 0.690, 0.809, 0.882, 0.914, 0.931, 0.942, 0.947];
          const x0 = 44;
          const y0 = 230;
          const pw = 280;
          const ph = 180;
          const X = (q) => x0 + (Math.log2(q) / 7) * pw;
          const YR = (v) => y0 - (v / 40) * ph;
          const YT = (v) => y0 - (v / 240) * ph;
          const bx = 400;
          const bw = 210;
          const XB = (q) => bx + (Math.log2(q) / 7) * bw;
          const YU = (u) => y0 - ((u - 0.4) / 0.6) * ph;
          return (
            <g>
              <line x1={x0} y1={y0} x2={x0 + pw} y2={y0} stroke="#9aa5bd" strokeOpacity="0.6" />
              <polyline points={qs.map((q, i) => `${X(q)},${YT(turn[i])}`).join(' ')} fill="none" stroke="#5da2ff" strokeWidth="2" />
              <polyline points={qs.map((q, i) => `${X(q)},${YR(resp[i])}`).join(' ')} fill="none" stroke="#f0b94b" strokeWidth="2" />
              {qs.map((q, i) => (
                <g key={q}>
                  <circle cx={X(q)} cy={YT(turn[i])} r="3" fill="#5da2ff" />
                  <circle cx={X(q)} cy={YR(resp[i])} r="3" fill="#f0b94b" />
                  <text x={X(q) - 8} y={y0 + 14} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">{labels[i]}</text>
                </g>
              ))}
              <line x1={X(4)} y1={y0 - ph} x2={X(4)} y2={y0} stroke="#62d98a" strokeDasharray="3 3" />
              <text x={X(4) + 4} y={y0 - ph + 10} fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="9">q = 4</text>
              <text x={x0} y="22" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">amber: interactive response (0 to 40); blue: mean turnaround (0 to 240)</text>
              <text x={x0} y={y0 + 30} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">quantum, log scale; response 11.8 and turnaround 82.0 at q = 4</text>
              <line x1={bx} y1={y0} x2={bx + bw} y2={y0} stroke="#9aa5bd" strokeOpacity="0.6" />
              <polyline points={qs.map((q, i) => `${XB(q)},${YU(util[i])}`).join(' ')} fill="none" stroke="#e2606c" strokeWidth="2" />
              {qs.map((q, i) => (
                <g key={q}>
                  <circle cx={XB(q)} cy={YU(util[i])} r="3" fill="#e2606c" />
                  <text x={XB(q) - 6} y={y0 + 14} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="8">{labels[i]}</text>
                </g>
              ))}
              {[0.5, 0.7, 0.9].map((u) => <text key={u} x={bx - 26} y={YU(u) + 3} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">{u.toFixed(1)}</text>)}
              <text x={bx} y="22" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">utilization = work / (work + switches)</text>
              <text x={bx} y={y0 + 30} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">0.523 at q = 1, 0.809 at q = 4, 0.947 FCFS</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'round_robin_scheduling_time_quantum.py',
  Viz: RoundRobinViz,
  narration,
};
