import WorkStealViz from '../viz/WorkStealViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/work_stealing_random_victims.py?raw';
import { narration } from './work-stealing-random-victims.narration.js';

export const content = {
  given:
    'Sixteen workers, one skewed fork-join computation (11,688 work units, 1,461 tasks, critical path 136), and the question every parallel runtime must answer: when a worker runs dry, where does its next task come from?',
  task: 'Give every worker its own deque: it pushes and pops its own forks at the bottom (hot, cached, uncontended), and an idle worker steals from the top of a random victim’s deque: the oldest, biggest subtree: one theft buying the most work.',
  constraint:
    'Every scheduler must execute every task exactly once with total work conserved (asserted). The measured makespan of 774 sits inside a two-sided squeeze computed from the DAG itself: above the law’s floor max(W/P, T∞) = 730, below the Blumofe-Leiserson shape W/P + 3T∞ = 1,138. The central queue pays 1,507; migration stays at 7.5% of tasks; and the coarse-grain parity row is stated plainly: with fat tasks the lock is idle and central’s perfect balance edges stealing 13.5× to 12.8×.',

  origins: (
    <p>
      The idea has 1980s roots (Burton and Sleep&apos;s virtual
      trees, Halstead&apos;s Multilisp), but it became a theorem
      and then an industry at MIT: Blumofe and
      Leiserson&apos;s <strong>1994</strong> analysis proved
      that randomized work stealing finishes in expected time
      W/P + O(T∞): work shared perfectly, coordination
      proportional only to the critical path: and the Cilk-5
      runtime (Frigo, Leiserson, Randall, 1998) turned the proof
      into the deque discipline this page simulates: owners at
      the bottom, thieves at the top, victims at random. The
      descendants run the parallel world: Intel TBB, Java&apos;s
      ForkJoinPool, .NET&apos;s task scheduler, Rust&apos;s
      rayon and Tokio, and the Go runtime&apos;s goroutine
      scheduler are all work-stealing deques with random
      victims.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>deque discipline</strong>: fork pushes
      the child on the owner&apos;s bottom; the owner pops from
      the bottom (depth-first, cache-hot, and uncontended:
      no lock on the common path); a thief takes from the{' '}
      <em>top</em>: the oldest fork, hence the biggest unstarted
      subtree, so one migration buys the most work. The
      referee is conservation: on every scheduler raced here,
      every one of the 1,461 tasks executed exactly once and
      the 11,688 units of work summed exactly: then the clock
      is compared. Random stealing: 774 steps. The fixed-order
      convoy: 793. The central lock: 1,507.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>victim lottery</strong>: an idle
      worker robs a deque chosen uniformly at random. Randomness
      spreads thieves apart (deterministic orders send every
      thief to the same victim, where only one per step can
      win), keeps the choice stateless and contention-free, and
      is precisely the assumption that makes the
      Blumofe-Leiserson bound provable. The bound is not quoted
      here but <em>squeezed</em>: the measured 774 sits between
      the law&apos;s floor of 730 and the theorem&apos;s shape
      of 1,138, computed from the DAG&apos;s own W and T∞. The
      communication bill lands where the theory says: 109
      steals for 1,461 tasks: 7.5%: migration scaling with the
      critical path, not the work.
    </p>
  ),

  picture: (
    <p>
      A kitchen of sixteen cooks working one huge recursive
      recipe. Each cook keeps a personal spike of tickets and
      works it top-of-spike first: the dish just started, pans
      already hot (that is the owner&apos;s bottom-pop:
      depth-first and cache-warm). A cook who runs out does not
      queue at a head chef&apos;s window: that window is the
      central queue, and sixteen cooks sharing one window spend
      the shift in line (measured: 1,507 steps against 774).
      Instead the idle cook wanders to a <em>random</em> station
      and lifts the ticket from the <em>bottom</em> of that
      spike: the oldest order, the one whose whole sub-recipe is
      still unstarted: a single theft that buys minutes of
      independent work. Why random? Because if every idle cook
      checked station one first, they would arrive as a mob
      (the convoy, measured), and one mob-sized theft per step
      is all a spike allows. Sixteen dice spread the thieves
      thin: and the kitchen hums.
    </p>
  ),

  steps: [
    <>
      <strong>Fork to your own bottom:</strong> spawned tasks
      land on the owner&apos;s deque: no lock, no contention,
      depth-first locality.
    </>,
    <>
      <strong>Pop your own bottom:</strong> the common path
      never coordinates: work-first, in Cilk&apos;s phrase.
    </>,
    <>
      <strong>Steal from a random top:</strong> idle workers rob
      the oldest fork of a lottery-chosen victim: the biggest
      subtree per theft.
    </>,
    <>
      <strong>One thief per victim per step:</strong> the
      lock&apos;s truth, modeled: collisions waste the step:
      randomness keeps them rare.
    </>,
    <>
      <strong>Trust the squeeze:</strong> 730 ≤ 774 ≤ 1,138:
      the run sits exactly where forty years of theory says it
      must.
    </>,
  ],

  signals: [
    <>
      <strong>Recursive, irregular parallelism:</strong>{' '}
      divide-and-conquer with unpredictable subtree sizes: the
      skew this page plants is the norm, and stealing absorbs
      it with 7.5% migration.
    </>,
    <>
      <strong>Fine task grain:</strong> millions of tiny tasks
      are where the central lock collapses (3.9× speedup vs
      stealing&apos;s 11.8×, measured): and where runtimes live.
    </>,
    <>
      <strong>Locality worth money:</strong> the owner&apos;s
      LIFO bottom keeps the working set in cache; thieves take
      the coldest, biggest work: the discipline is a cache
      policy too.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the <strong>central shared
      queue</strong>: one list, one lock, perfect global
      balance: and the parity row gives it its due: with
      64-unit tasks the lock is nearly idle and central&apos;s
      flawless balance <em>edges</em> stealing 13.5× to 12.8×.
      Its collapse is granularity: at 4-unit tasks every
      hand-off queues behind the lock and speedup falls to
      3.9× while stealing holds 11.8×.
    </>
  ),

  strength: (
    <>
      <strong>Provable balance with critical-path-priced
      coordination.</strong> The measured makespan sat inside
      the two-sided squeeze computed from the DAG itself (730 ≤
      774 ≤ 1,138); migration stayed at 109 steals for 1,461
      tasks; the common path (own-deque push/pop) never
      contends at all; and the same discipline held its 11.8×
      speedup at fine grain where the central lock fell to
      3.9×. This is why every major parallel runtime: TBB,
      ForkJoinPool, Go, rayon: ships exactly this design.
    </>
  ),
  weakness: (
    <>
      <strong>Randomized, skew-dependent, and honest about
      coarse grain.</strong> The guarantees are expectations:
      an unlucky steal sequence runs long, and failed probes
      (86% of attempts here: idle workers dice-rolling into
      empty deques) are the price of statelessness: real
      runtimes add backoff and sleep states. When tasks are
      fat and few, the parity row applies: a central
      queue&apos;s perfect balance won this page&apos;s coarse
      instance outright, and offline scheduling (Graham&apos;s
      list rule, one card over) does better still when times
      are known. And the deque discipline assumes fork-join
      structure: unstructured task graphs with dependencies
      need a real DAG scheduler on top.
    </>
  ),

  problem: 'Task-parallel scheduling',
  problemSlug: 'task-parallel-scheduling',
  rivals: [
    {
      name: 'Work stealing × random victims',
      isThisUnit: true,
      algoName: 'Work stealing',
      cost: 'W/P + O(T∞) expected',
      wins: (
        <>
          <strong>The runtime canon</strong>: uncontended common
          path, migration at 7.5% of tasks, the squeeze 730 ≤
          774 ≤ 1,138 held on camera.
        </>
      ),
      costs: (
        <>
          Expected-case only, wasted probes when idle, and the
          coarse-grain row conceded to the simple lock.
        </>
      ),
      when: 'Fine-grained recursive parallelism: the fork-join runtimes of every major platform.',
    },
    {
      name: 'Central shared queue',
      algoName: 'Fork-join',
      cost: 'one lock, perfect balance',
      wins: (
        <>
          Dead simple and globally fair: and the honest winner
          of this page&apos;s coarse row (13.5× vs 12.8×): when
          tasks are fat, the lock is idle and balance is king.
        </>
      ),
      costs: (
        <>
          Every hand-off serializes: at 4-unit grain its
          speedup collapsed to 3.9× while stealing held 11.8×.
        </>
      ),
      when: 'Few, fat, independent tasks: job queues, build farms, batch pools.',
    },
    {
      name: 'Graham list scheduling',
      cost: 'offline, 4/3-competitive',
      wins: (
        <>
          The 1969 classic: with known task times, sort longest
          first and greedily assign: provably within 4/3 of
          optimal makespan: the offline gold standard.
        </>
      ),
      costs: (
        <>
          Needs the times in advance and a static task list:
          recursive spawning and unknown durations are exactly
          what it cannot see.
        </>
      ),
      when: 'Offline batches with duration estimates: render farms, CI shards, exam rooms.',
    },
  ],
  neverUse: {
    name: 'The single lock under fine-grained fork-join',
    why: (
      <>
        The default architecture everyone builds first: one
        global task queue, one mutex, workers pull. It is
        correct, it passes every unit test, and this page
        measured its production behavior: at 4-unit task grain,
        speedup on 16 workers fell to <strong>3.9× against
        stealing&apos;s 11.8×</strong>: the lock serializes
        every hand-off, so the finer you cut your tasks: the
        very thing parallelism wants: the more your scheduler
        becomes a queue for the queue. The trap is that coarse
        benchmarks hide it (this page&apos;s 64-unit row shows
        the central queue <em>winning</em>), so the design
        survives review and dies under scale. The fix is
        structural, not tuning: per-worker deques with an
        uncontended owner path: the fork-join runtimes of
        every platform made this move decades ago, for exactly
        this measured reason.
      </>
    ),
  },

  contest: {
    instance:
      'a skewed fork-join DAG on 16 workers: W = 11,688 units, T∞ = 136, 1,461 tasks; discrete-step model (one unit/worker/step, one steal attempt when idle, one thief per victim per step, central queue serialized); referee: exact work conservation on every scheduler',
    columns: ['makespan (steps)'],
    rows: [
      {
        method: 'Central shared queue',
        values: ['1,507'],
        verdict: 'every hand-off through one lock: double the clock',
      },
      {
        method: 'Stealing, fixed victim order',
        values: ['793'],
        verdict: 'thieves convoy onto the same stations: one theft per victim per step is all a deque allows',
      },
      {
        method: 'Stealing, random victims',
        isThisUnit: true,
        values: ['774'],
        best: 0,
        verdict: 'the lottery spreads thieves: inside the squeeze 730 ≤ 774 ≤ 1,138, with 7.5% migration',
      },
    ],
    source:
      'python solutions/work_stealing_random_victims.py prints this table and asserts: every scheduler executes every task exactly once with total work exactly conserved; the two-sided squeeze max(W/P, T∞) ≤ makespan ≤ W/P + 3T∞ + P from the DAG’s analytically computed W and critical path; random ≤ fixed-victim makespan; successful steals under 25% of tasks (measured 7.5%); the fine-grain sweep (stealing 11.8× vs central 3.9× speedup); and the coarse-grain parity row held within 15% (central honestly edging stealing 13.5× to 12.8×: the first draft assumed stealing wins everywhere and the run corrected it).',
  },

  figure: (
    <Figure
      id="fig-worksteal-deques"
      aspect="16 / 7"
      caption="Owners at the bottom, thieves at the top, victims by lottery. Forks land on the owner's deque bottom and are popped from it: depth-first, cache-hot, and never contended. An idle worker steals from the TOP of a random victim's deque: the oldest fork, the biggest unstarted subtree: so 109 thefts moved all the imbalance of 1,461 tasks (7.5%). The measured clock sits inside the theory's squeeze: max(W/P, T∞) = 730 ≤ 774 ≤ W/P + 3T∞ = 1,138: while the central lock paid 1,507 and, at fine grain, collapsed to 3.9× speedup against stealing's 11.8×. The coarse-grain row is conceded in print: fat tasks forgive the lock."
      cite={{
        text: 'R. D. Blumofe, C. E. Leiserson, "Scheduling multithreaded computations by work stealing," JACM 46(5), 1999 (FOCS 1994). DOI 10.1145/324133.324234. Cilk-5: Frigo-Leiserson-Randall, PLDI 1998.',
        href: 'https://doi.org/10.1145/324133.324234',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="Per-worker deques with owner popping the bottom and a thief stealing the top of a random victim">
        {[0, 1, 2, 3].map((i) => (
          <g key={i}>
            <rect x={50 + i * 150} y={60} width={44} height={110} fill="rgba(93,162,255,0.10)" stroke="#5da2ff" strokeWidth="1.4" rx="6" />
            {[0, 1, 2].map((j) => (
              <rect key={j} x={56 + i * 150} y={68 + j * 26} width={32} height={18} fill={j === 0 ? 'rgba(240,185,75,0.4)' : 'rgba(93,162,255,0.3)'} stroke={j === 0 ? '#f0b94b' : '#5da2ff'} strokeWidth="1" rx="3" />
            ))}
            <text x={54 + i * 150} y={190} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">worker {i}</text>
          </g>
        ))}
        <path d="M 72 178 v -6" stroke="#62d98a" strokeWidth="2" />
        <text x="40" y="212" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="10">owner pops the BOTTOM: hot, uncontended</text>
        <path d="M 520 74 C 480 30, 260 26, 210 66" fill="none" stroke="#e2606c" strokeWidth="1.8" strokeDasharray="5 4" />
        <text x="330" y="24" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="10">idle worker 3 robs a RANDOM victim&apos;s TOP: the oldest, biggest subtree</text>
        <text x="40" y="238" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">measured: random 774 · fixed-order convoy 793 · central lock 1,507 · squeeze 730 ≤ 774 ≤ 1,138 · steals 7.5% of tasks</text>
        <text x="40" y="262" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">fine grain: central collapses to 3.9× vs stealing’s 11.8× · coarse grain: the lock is idle and central edges it (said plainly)</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'work_stealing_random_victims.py',
  Viz: WorkStealViz,
  narration,
};
