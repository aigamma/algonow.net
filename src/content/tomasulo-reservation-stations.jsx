import TomasuloViz from '../viz/TomasuloViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/tomasulo_reservation_stations.py?raw';
import { narration } from './tomasulo-reservation-stations.narration.js';

export const content = {
  given:
    'One instruction stream, several slow arithmetic units, dependencies everywhere: and a 10-cycle multiplier idling while ready work queues behind a name.',
  task: 'Run instructions the moment their DATA is ready, not the moment their turn comes: while keeping the results bit-identical to program order.',
  constraint:
    "The referees: a sequential interpreter (300 random dependency-heavy programs: out-of-order finals equal in-order finals, every register, every time, with and without renaming) and the dataflow critical path (counted cycles never dip below it, or below the 1-wide issue bound: the 1.79× mean above the combined bound is the machine's honest plumbing tax).",

  origins: (
    <p>
      Robert Tomasulo, IBM, <strong>1967</strong>: the floating
      point unit of the System/360 Model 91 needed its multiple
      slow units busy, and the paper (IBM Journal 11) delivered
      the three ideas modern CPUs still run:{' '}
      <strong>reservation stations</strong> that hold waiting
      work, <strong>register renaming</strong> via tags, and the{' '}
      <strong>common data bus</strong> every station snoops. The
      design was nearly forgotten during the RISC-and-caches era,
      then returned in the 1990s (PentiumPro, MIPS R10000) as the
      skeleton of every high-performance core since: your phone
      runs a descendant of this page. The 360/91&apos;s own famous
      flaw: imprecise interrupts: is this unit&apos;s neverUse
      box, and the reorder buffer exists to fix it.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>machine</strong>: issue in order into a free
      reservation station; a station <em>executes</em> the moment
      both operands are present; every result broadcasts once on
      the common data bus, where waiting stations and the register
      file snoop it by tag. Counted here: the 8-instruction client
      finishes in <strong>28 cycles</strong> against a serial 48
      and a critical path of 12: and across 300 random programs
      the final registers equal a sequential interpreter&apos;s{' '}
      <em>exactly</em>: reordering is architecturally invisible.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>names</strong>: a register entry holds
      either a value or a <em>tag</em>: the identity of the
      station that will produce it: so consumers wait on
      producers, never on register names. WAW and WAR hazards:
      artifacts of having eight names for unbounded values:
      simply vanish. The ablation prices it: the same machine
      with renaming disabled (issue stalls on name conflicts)
      pays <strong>1.63×</strong> the cycles on name-starved code:
      and on the client loop, no-rename out-of-order finishes{' '}
      <strong>behind plain serial execution</strong> (52 vs 48):
      the machinery without the names loses to no machinery at
      all.
    </p>
  ),

  picture: (
    <p>
      A restaurant kitchen with one order wheel. The naive kitchen
      cooks tickets strictly in order: the soufflé (40 minutes)
      blocks the salad behind it. Tomasulo&apos;s kitchen tears
      each ticket into station slips: the soufflé slip waits at
      the oven, the salad slip goes straight to the cold station:
      and each slip lists not ingredient <em>names</em> but which
      station&apos;s <em>output</em> it needs: &quot;the sauce
      station&apos;s next batch,&quot; not &quot;the pan.&quot;
      When any station finishes, it calls its result out once
      (the bus) and every waiting slip that needed it starts. The
      renaming is the tearing: two tickets both scribbling
      &quot;the pan&quot; never fight over the pan, because slips
      reference batches, not containers: the fight was only ever
      over a name.
    </p>
  ),

  steps: [
    <>
      <strong>Issue in order:</strong> next instruction takes a
      free station; operands copy in as values or as tags of
      their producers.
    </>,
    <>
      <strong>Rename by tag:</strong> the destination register now
      points at this station: later readers wait on the station,
      not the name: WAW and WAR evaporate.
    </>,
    <>
      <strong>Execute on data:</strong> a station fires when both
      operands are present: program position is irrelevant.
    </>,
    <>
      <strong>Broadcast once:</strong> the common data bus carries
      (tag, value): stations and registers snoop: one producer,
      any number of consumers.
    </>,
    <>
      <strong>Respect the physics:</strong> cycles never beat the
      dataflow critical path or the issue bound (asserted, 300
      programs): the machine buys everything except the
      dependencies themselves.
    </>,
  ],

  signals: [
    <>
      <strong>Latency variance among units:</strong> fast adds
      queuing behind slow multiplies and loads: exactly the
      360/91&apos;s problem and every memory-bound loop&apos;s
      today.
    </>,
    <>
      <strong>False dependencies from name shortage:</strong>{' '}
      compilers recycling registers, accumulators reused across
      iterations: renaming turns name reuse back into
      parallelism.
    </>,
    <>
      <strong>Dataflow thinking, anywhere:</strong> the pattern:
      wait on producers, not on positions: reappears in build
      systems, async task graphs, and spreadsheet engines: this
      page is its purest hardware form.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>serial execution</strong>:
      the sum of latencies, 48 cycles on the client: beaten 1.71×.
      The instructive middle is the machine with{' '}
      <strong>renaming off</strong>: 52 cycles: worse than serial:
      out-of-order bookkeeping plus name stalls can cost more
      than they save, which is why scoreboarding&apos;s era ended.
    </>
  ),

  strength: (
    <>
      <strong>Invisible reordering, counted to the cycle.</strong>{' '}
      300 random dependency-heavy programs bit-equal to sequential
      execution (with and without renaming: correctness never
      depended on the heuristic); the combined lower bound
      (critical path vs issue width) respected on every program
      with the 1.79× mean honestly attributed to plumbing; the
      renaming dividend isolated at 1.63×; and the client&apos;s
      twist: no-rename OoO losing to plain serial: measured, not
      asserted.
    </>
  ),
  weakness: (
    <>
      <strong>Imprecise by default, and the plumbing is real.</strong>{' '}
      Pure Tomasulo completes out of order: an interrupt mid-flight
      exposes a register state that never existed in program
      order: the 360/91 shipped exactly this flaw, and the reorder
      buffer (in-order commit) exists to fix it: no modern core
      omits one. The measured 1.79× over the dataflow bound is
      per-hop issue/wakeup/broadcast latency: real designs fight
      it with speculative wakeup and bypass networks. One CDB
      serializes broadcasts (n results need n cycles: measured in
      the bound): real cores multiply the buses. And none of this
      machinery creates parallelism: a pure dependency chain runs
      at exactly its critical path, machine or no machine.
    </>
  ),

  problem: 'Out-of-order execution',
  problemSlug: 'out-of-order-execution',
  rivals: [
    {
      name: 'Tomasulo × renaming',
      isThisUnit: true,
      algoName: "Tomasulo's algorithm",
      cost: 'stations + CDB',
      wins: (
        <>
          <strong>Waits on data, never on names</strong>: 1.71×
          over serial on the client, dividend isolated at 1.63×,
          results bit-equal to program order.
        </>
      ),
      costs: (
        <>
          Imprecise exceptions without a ROB, and per-hop plumbing
          measured at 1.79× the dataflow bound.
        </>
      ),
      when: 'The skeleton of every high-performance core since the 1990s: this is what "out-of-order" means.',
    },
    {
      name: 'Scoreboarding',
      algoName: 'Scoreboarding',
      cost: 'central hazard table',
      wins: (
        <>
          The CDC 6600&apos;s road (1964): one central table
          tracks every hazard: simpler hardware, no tags, no
          broadcast bus: out-of-order execution on a budget.
        </>
      ),
      costs: (
        <>
          No renaming: WAW and WAR stall real work: this
          page&apos;s renaming-off arm is its portrait, and it
          lost to serial on the client.
        </>
      ),
      when: 'Historically instructive, and in tiny cores where a broadcast bus costs too much silicon.',
    },
    {
      name: 'Reorder buffer × commit',
      algoName: 'Reorder buffer',
      cost: 'ROB + commit port',
      wins: (
        <>
          The completion of the idea: execute out of order,{' '}
          <em>commit in order</em>: precise exceptions, easy
          branch rollback, and renaming into ROB slots: Tomasulo
          grown up.
        </>
      ),
      costs: (
        <>
          Buffer capacity bounds the instruction window, and
          commit bandwidth is one more bottleneck to size.
        </>
      ),
      when: 'Always, in practice: every shipping OoO core is Tomasulo plus a ROB: the pair is the unit.',
    },
    {
      name: 'List scheduling × compiler',
      algoName: 'List instruction scheduling',
      cost: 'compile-time',
      wins: (
        <>
          The static road: the compiler reorders by critical-path
          priority once, at build time: zero runtime hardware:
          VLIW and DSPs live on it.
        </>
      ),
      costs: (
        <>
          Blind to runtime latencies (cache misses) and frozen at
          compile time: dynamic variance is exactly what it
          cannot reschedule around.
        </>
      ),
      when: 'Predictable-latency targets (DSPs, embedded) and as the front line even on OoO cores.',
    },
  ],
  neverUse: {
    name: 'Out-of-order completion without in-order commit',
    why: (
      <>
        The 360/91&apos;s own famous flaw, shipped. Pure Tomasulo
        retires results as they finish: so when an interrupt or
        page fault arrives mid-flight, the register file holds a
        state that <em>never existed in program order</em>: some
        later instructions done, some earlier ones not: and the
        operating system must resume from a snapshot of nowhere.
        IBM&apos;s OS engineers fought the Model 91&apos;s
        imprecise interrupts for years, and the industry&apos;s
        verdict is unanimous: the reorder buffer&apos;s in-order
        commit is not an optimization but a correctness contract
        with software. The general lesson is the site&apos;s
        oldest: an optimization that changes the <em>observable
        failure states</em> of a system is not an optimization:
        exceptions, like timing and cache traffic in the modexp
        unit, are outputs too.
      </>
    ),
  },

  contest: {
    instance:
      '8 dependent multiply-add pairs on 3 adders + 2 multipliers; referee: a sequential interpreter (results equal, exactly) and the dataflow critical path (cycles never below it)',
    columns: ['cycles', 'nature'],
    rows: [
      {
        method: 'Serial (sum of latencies)',
        values: ['48', 'in order'],
        verdict: 'one instruction at a time: the 1967 status quo',
      },
      {
        method: 'OoO, renaming OFF',
        values: ['52', 'stalls on names'],
        verdict: 'WORSE than serial: machinery without names loses to no machinery',
      },
      {
        method: 'Tomasulo',
        isThisUnit: true,
        values: ['28', 'waits on data'],
        best: 0,
        verdict: '1.71× over serial: adds hide under multiplies (critical path 12)',
      },
    ],
    source:
      "python solutions/tomasulo_reservation_stations.py prints this table and asserts: 300 random dependency-heavy programs (half name-starved) with out-of-order final registers equal to the sequential interpreter's, with and without renaming; cycles never below the dataflow critical path nor the 1-wide issue bound, with the mean over the combined bound at 1.79× (the plumbing tax, attributed); the renaming ablation at 1.63× mean over 60 name-starved programs (assert > 1.25); the client at 1.71× over serial (assert > 1.5); and the no-rename machine asserted strictly worse than serial itself on the client (52 > 48).",
  },

  figure: (
    <Figure
      id="fig-tomasulo-machine"
      aspect="16 / 7"
      caption="The 1967 machine your phone still runs. Instructions issue in order into reservation stations; registers hold values or TAGS naming their future producer; stations fire on data, not position; and the common data bus broadcasts each result once to every snooper. Renaming is the load-bearing heuristic: measured here, the same machine with names disabled pays 1.63× on name-starved code and finishes behind plain serial execution on the client loop: WAW and WAR were never real dependencies, only a shortage of names. What no machinery buys back is the dataflow itself: cycles never dip below the critical path, asserted 300 times."
      cite={{
        text: 'Tomasulo, "An Efficient Algorithm for Exploiting Multiple Arithmetic Units", IBM Journal of Research and Development 11(1), 1967: reservation stations, tags, and the common data bus, on the System/360 Model 91.',
        href: 'https://doi.org/10.1147/rd.111.0025',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="Reservation stations feeding functional units over a common data bus, with tagged registers">
        <rect x="40" y="40" width="120" height="80" fill="rgba(154,165,189,0.1)" stroke="#9aa5bd" strokeWidth="1.2" />
        <text x="52" y="58" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">instructions</text>
        <text x="52" y="74" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">(in order)</text>
        {[0, 1, 2].map((i) => (
          <rect key={i} x={220} y={36 + i * 30} width={150} height={22} fill="rgba(226,96,108,0.2)" stroke="#e2606c" strokeWidth="1.4" />
        ))}
        {[0, 1].map((i) => (
          <rect key={i} x={220} y={132 + i * 30} width={150} height={22} fill="rgba(240,185,75,0.25)" stroke="#f0b94b" strokeWidth="1.4" />
        ))}
        <text x="226" y="52" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="10">add stations (wait on tags)</text>
        <text x="226" y="148" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="10">mul stations (fire on data)</text>
        <line x1="160" y1="80" x2="220" y2="80" stroke="#9aa5bd" strokeWidth="1.4" />
        <rect x="430" y="70" width="170" height="60" fill="rgba(93,162,255,0.15)" stroke="#5da2ff" strokeWidth="1.6" />
        <text x="444" y="94" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="10">registers: value OR tag</text>
        <text x="444" y="112" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="10">r4 ← S7&apos;s future</text>
        <line x1="220" y1="200" x2="600" y2="200" stroke="#62d98a" strokeWidth="2.4" />
        <text x="240" y="192" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">common data bus: one broadcast, every snooper</text>
        <text x="40" y="236" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">measured: serial 48 · renaming OFF 52 (behind serial!) · Tomasulo 28 · critical path 12</text>
        <text x="40" y="258" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">300 programs bit-equal to program order · renaming dividend 1.63× · bound never violated</text>
        <text x="40" y="280" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">the 360/91&apos;s flaw: out-of-order completion = imprecise interrupts: the reorder buffer is the fix</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'tomasulo_reservation_stations.py',
  Viz: TomasuloViz,
  narration,
};
