// The spoken lesson for puzzle forty eight, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle forty eight: earliest deadline first, paired with dynamic deadline priority, for real time scheduling. Here is the puzzle. Periodic tasks: each needs C ticks of processor every T ticks, deadline equal to period: on one preemptive CPU. Meet every deadline whenever the total utilization, the sum of C over T, is at most one hundred percent: which is the best any scheduler could possibly promise, since you cannot run a CPU past full. The constraint is what fixed priorities cannot do: they are safe only to the natural log of two, about sixty nine point three percent, and this page measures the gap above that bound as a falling curve: at ninety seven to one hundred percent utilization, rate monotonic drops sixty two of one hundred twenty real task sets, while earliest deadline first schedules all of them.',
  },
  {
    section: 'origins',
    text:
      'Liu and Layland’s nineteen seventy three paper in the Journal of the ACM is one of the most cited documents in computer science, and it analyzed both contenders at once. Rate monotonic: fixed priorities, shorter period outranks forever: safe up to n times the quantity two to the one over n minus one, which falls to the natural log of two. And earliest deadline first: dynamic priorities: with the clean theorem that utilization at most one is exactly equivalent to schedulability. Industry split on the result and has stayed split for fifty years: avionics standards favor fixed priorities for their analyzable worst cases and certifiable failure ordering, while Linux mainlined SCHED DEADLINE, an earliest deadline first scheduler, in twenty fourteen. Giorgio Buttazzo’s paper, Rate Monotonic versus EDF: Judgment Day, is the definitive honest comparison. This page is that argument, run rather than recited.',
  },
  {
    section: 'pair',
    text:
      'The control structure owns preemptive priority scheduling: at every instant, run the highest priority ready job, and take the processor away the moment a higher priority job arrives. Every policy on this page shares that skeleton: the entire difference between meeting every deadline at ninety seven percent load and deterministically dropping jobs is what the priority IS. The heuristic supplies it: the absolute deadline of the current job, recomputed at every release: dynamic, not fixed. Liu and Layland’s theorem makes this single rule optimal on one processor: utilization at most one implies zero misses, full stop. This page hammers the theorem rather than citing it: seven hundred eighty task sets with utilization at most one, simulated to their complete hyperperiods from the synchronous critical instant, and the miss count came back zero, every single time, including one hundred twenty sets packed between ninety seven and one hundred percent.',
  },
  {
    section: 'picture',
    text:
      'Picture an emergency room with one doctor. Rate monotonic is triage by patient type, fixed forever: chest pain cases always outrank sprained ankles, even a sprain that has waited nine hours and has a discharge form due in five minutes. Earliest deadline first is triage by whose clock runs out next: the ranks reshuffle as clocks tick down, and the doctor is never occupied with a patient who could safely have waited while another patient’s deadline quietly lapsed. The fixed board is easier to certify, easier to audit, and fails in a known order when the night goes wrong. The dynamic board treats strictly more patients on time. Both statements are true at once, and hospitals, like industries, have chosen differently depending on which failure they fear more.',
  },
  {
    section: 'run',
    text:
      'Here is the loop. On each release, every T ticks, a task’s new job gets priority equal to its absolute deadline: now plus T. At every instant, run the ready job with the earliest deadline, preempting the current job if a nearer deadline has arrived. Admission control is one line: sum C over T, and if the total is at most one, every deadline will be met: check the sum before accepting a task and the theorem does the rest. Never run past one hundred percent: overload voids the contract, and the misses spray unpredictably: measured on this page: shed load explicitly instead. And know the fixed priority alternative’s fine print: above sixty nine point three percent, rate monotonic is neither safe nor doomed: it is conditional, and the exact per set check is called response time analysis: a real tool, at per set cost, where EDF’s test stays one line.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, hard periodic deadlines on one core: control loops, audio callbacks, sensor fusion pipelines: where a miss is a failure, not a delay, and where the utilization you paid for must be usable all the way to one hundred percent. Second, the task set changes at runtime: admission is a single sum, so adding a task is check and go: no re analysis of everything already running. Third, preemption is cheap and available: both policies lean on it hard, and cooperative or non preemptive systems are a different game with different theorems.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: optimal on one processor, with a one line admission test, and the full hundred percent usable. Seven hundred eighty hyperperiod simulations at utilization at most one: zero misses: the theorem, hammered bin by bin. The classic pair, two of five and four of seven, at ninety seven point one percent: scheduled clean where rate monotonic demonstrably drops a job. The weakness: overload is chaos, and analyzability has a real constituency. Push the same pair of tasks to one hundred seventeen percent and EDF’s misses spray across both tasks, two and two, measured: while rate monotonic shields its favorite absolutely, zero and four. In certifiable systems, that predictable failure ordering outbids optimality, which is why airplanes fly fixed priorities and will keep flying them. And an honest measurement note, kept because the first gadget refuted the folklore: with well separated periods, EDF also shields the fast task, since its deadlines are simply always earliest: the spray requires near equal, non harmonic periods, and the page’s gadget has exactly those.',
  },
  {
    section: 'tradeoffs',
    text:
      'Here are the measured numbers. Below the natural log of two, both policies are perfect: one hundred fifty rate monotonic sets, zero misses. Above it, the Liu Layland gap, drawn as a survival curve over one hundred twenty sets per bin: seventy to eighty percent utilization: one hundred twenty of one hundred twenty survive. Eighty to ninety: one hundred nineteen. Ninety to ninety seven: ninety eight. Ninety seven to one hundred: fifty eight: fewer than half. Earliest deadline first, across the same four hundred eighty sets: four hundred eighty. The deterministic casualty: tasks needing two of every five and four of every seven ticks, utilization ninety seven point one percent: EDF meets every deadline across the thirty five tick hyperperiod; rate monotonic drops a job, every hyperperiod, forever. And past one hundred percent, the styles of failure invert: EDF two and two, rate monotonic zero and four. Choose which failure you can live with before the night you meet it.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is fixed priorities past the bound without analysis, and the wording matters, because rate monotonic above sixty nine percent is not forbidden: it is conditional. Exact response time analysis can bless a specific task set at ninety five percent, and certified systems do exactly that. The sin is shipping the priorities without the analysis, on the evidence that the demo ran clean: the demo was one point on a curve, and this page drew the whole curve: twenty two of one hundred twenty sets fail in the ninety to ninety seven bin, sixty two of one hundred twenty in the last three points before full load. A set that fails, fails deterministically: the same job, every hyperperiod, forever: which makes it both the easiest bug to reproduce and the worst one to discover in the field. One sum, or one analysis: pick one before the hardware picks for you.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements a discrete time preemptive simulator with synchronous release, pluggable priority policies, and per task miss counters, plus a generator of integer utilization task sets and exact hyperperiod computation via least common multiples. The self test asserts, in order: earliest deadline first at zero misses on three hundred broad sets and four hundred eighty binned sets, every one with utilization at most one, simulated to the full hyperperiod. Rate monotonic clean on one hundred fifty sets below the natural log of two. The survival curve falling, with the last bin under eighty five percent. The classic casualty exact: EDF clean, rate monotonic missing, on the two of five, four of seven pair. And the overload flip on the same periods with one extra tick of work: EDF paying on both tasks, rate monotonic protecting its favorite completely while the slow task absorbs everything. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
