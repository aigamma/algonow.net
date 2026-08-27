// The spoken lesson for puzzle ninety four, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle ninety four: Tomasulo’s algorithm, paired with reservation stations and register renaming, for out of order execution. Here is the puzzle. One instruction stream. Several arithmetic units, some slow: a multiply takes ten cycles, an add takes two. Dependencies everywhere. Run the instructions in strict order and the ten cycle multiplier blocks a parade of ready adds queued behind it: not because their data is missing, but because their turn has not come. The goal: run every instruction the moment its DATA is ready: while keeping the final registers bit identical to what strict program order would produce, so the reordering is architecturally invisible. The referees on this page: a sequential interpreter: three hundred random dependency heavy programs, and the out of order machine’s final registers equal the in order machine’s, every register, every time: and the dataflow critical path: counted cycles never dip below the physics of the program, or below the machine’s own one wide issue rate.',
  },
  {
    section: 'origins',
    text:
      'Robert Tomasulo, I B M, nineteen sixty seven. The System three sixty Model ninety one’s floating point unit had multiple slow execution units and needed them busy, and Tomasulo’s paper in the I B M Journal delivered three ideas that never left: reservation stations, where issued instructions wait holding their operands or the names of their producers: register renaming by tag, so a register can promise a future value: and the common data bus, where every result is broadcast once and every waiting consumer snoops it. The design was nearly forgotten through the early RISC era: too much hardware for the transistor budgets: then returned triumphant in the nineteen nineties with the Pentium Pro and the MIPS R ten thousand, and it is the skeleton of every high performance core built since. The phone in your pocket executes a direct descendant of this page. Even the famous flaw made history: the Model ninety one’s imprecise interrupts are this unit’s negative example, and the reorder buffer was invented to fix them.',
  },
  {
    section: 'pair',
    text:
      'The algorithm owns the machine. Issue: in order, one per cycle, into a free reservation station: the instruction copies in each operand as either a value, if the register has one, or a tag: the identity of the station that will produce it. Execute: a station fires the moment both operands are present: program position is irrelevant. Broadcast: each result goes out once on the common data bus as a tag value pair: waiting stations and the register file snoop it. The heuristic is the renaming, and it deserves the word: a register entry that holds a tag has been RENAMED to point at a station: consumers wait on producers, never on register names: and the write after write and write after read hazards: which were only ever artifacts of having eight names for unboundedly many values: simply vanish. Measured: the same machine with renaming disabled pays one point six three times the cycles on name starved code: and on the client loop it finishes BEHIND plain serial execution: fifty two cycles against forty eight. The machinery without the names loses to no machinery at all.',
  },
  {
    section: 'picture',
    text:
      'A restaurant kitchen with one order wheel. The naive kitchen cooks tickets strictly in order: the forty minute souffle blocks the thirty second salad behind it, though the salad needs nothing the souffle touches. Tomasulo’s kitchen tears each incoming ticket into station slips: the souffle slip waits at the oven: the salad slip goes straight to the cold station and is plated immediately. And each slip lists not ingredient NAMES but which station’s OUTPUT it needs: the sauce station’s next batch: never, the pan. When any station finishes, it calls its result out exactly once: that is the bus: and every waiting slip that needed it starts at that instant. The renaming is the tearing. Two tickets that both scribbled the word pan never fight over the pan, because slips reference batches, not containers. The fight was only ever over a name: and names, unlike data, can be manufactured on demand.',
  },
  {
    section: 'run',
    text:
      'Here is the run, on the client: eight instructions, four multiply add pairs, three adders and two multipliers. Serial execution: the sum of the latencies: forty eight cycles. Tomasulo: twenty eight: the adds hide under the multiplies, and the machine finishes within hailing distance of the program’s critical path of twelve, paying the honest plumbing tax: issue, wakeup, and broadcast each cost a cycle per dependency hop, and this page measures that tax across three hundred programs at one point seven nine times the combined lower bound, never once dipping below it. And the twist, measured rather than asserted: the same out of order machine with renaming switched off: stalling issue on every write after write and write after read name conflict: takes fifty two cycles. Worse than serial. The bookkeeping without the names costs more than it saves: which is, in one number, why the scoreboarding era ended and the renaming era has not.',
  },
  {
    section: 'signals',
    text:
      'The signals that this pair fits. First: latency variance among units: fast operations queuing behind slow ones: adds behind multiplies, everything behind loads: precisely the Model ninety one’s problem, and precisely every memory bound loop’s problem today. Second: false dependencies born of name shortage: compilers recycling a handful of registers, an accumulator reused across loop iterations: renaming turns name reuse back into the parallelism it was hiding. Third, and the widest: dataflow thinking. The pattern: wait on producers, not on positions: is the same organizing idea as a build system that rebuilds when inputs change, an async task graph awaiting futures, a spreadsheet recomputing cells: this page is that idea in its purest, oldest hardware form: the tag is a future, the bus is its resolution, and nineteen sixty seven got there first.',
  },
  {
    section: 'tradeoffs',
    text:
      'Now the rivals. Scoreboarding is the ancestor: the C D C sixty six hundred, nineteen sixty four: one central table tracks every hazard and releases instructions when safe. Simpler hardware: no tags, no broadcast bus: but no renaming either, so write after write and write after read conflicts stall real work. This page’s renaming off arm is scoreboarding’s honest portrait, and it lost to serial execution on the client. The reorder buffer is the descendant and the completion of the idea: execute out of order, but COMMIT in order: results retire to the register file in program sequence, so exceptions are precise and branch mispredictions roll back cleanly. Every shipping out of order core is Tomasulo plus a reorder buffer: the pair is the unit, and choosing between them is not a real choice anymore: you build both or you build neither.',
  },
  {
    section: 'tradeoffs',
    text:
      'The genuinely different road is static scheduling: list scheduling in the compiler, critical path priority, arranging instructions at build time so the hardware can stay simple and in order. V L I W machines and D S Ps live entirely on it: zero runtime scheduling hardware, every transistor spent on arithmetic. Its limit is knowledge: the compiler cannot see a cache miss coming, and a schedule frozen at build time cannot flex around runtime variance: which is exactly the variance out of order hardware absorbs. In practice the roads cooperate: the compiler schedules what it can predict, the hardware reorders around what it cannot: and knowing which kinds of latency belong to which layer: predictable to the compiler, variable to the machine: is the architectural version of this site’s recurring question: what structure can you exploit, and at which stage do you exploit it.',
  },
  {
    section: 'tradeoffs',
    text:
      'And the negative example, with a date and a serial number: out of order completion without in order commit: the Model ninety one’s own shipped flaw. Pure Tomasulo retires each result the moment it finishes. So when an interrupt or a page fault arrives mid flight, the register file holds a state that never existed in program order: some later instructions complete, some earlier ones not: and the operating system is asked to resume from a snapshot of nowhere. I B M’s systems programmers fought those imprecise interrupts for years, and the industry’s verdict became unanimous: in order commit is not an optimization: it is a correctness contract with software. The general lesson is this site’s oldest, wearing silicon: an optimization that changes the observable FAILURE states of a system is not an optimization. The modular exponentiation unit said it about timing. This unit says it about exceptions. The outputs you did not think of are still outputs.',
  },
  {
    section: 'code',
    text:
      'The code on this page is a small honest machine. A sequential interpreter: the referee. The Tomasulo simulator: in order issue into typed station pools, tag based waiting, execution on readiness, one common data bus broadcast per cycle, and a renaming switch whose off position stalls issue on name conflicts. A critical path calculator over the true dataflow. The self test asserts: three hundred random programs, half name starved, bit equal to sequential execution with renaming on AND off: cycles never below the dataflow critical path or the issue bound, with the mean over the combined bound at one point seven nine, attributed to plumbing: the renaming dividend at one point six three over sixty name starved programs: the client at one point seven one over serial: and the no rename machine strictly worse than serial itself. When it prints O K, you have watched nineteen sixty seven happen: and understood why it is still happening, several billion times a second, in your pocket.',
  },
];
