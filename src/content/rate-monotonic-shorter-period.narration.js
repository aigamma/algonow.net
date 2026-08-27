// The spoken lesson for puzzle sixty seven, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle sixty seven: rate monotonic scheduling, paired with the shorter period wins rule, for real time task scheduling. Here is the puzzle. Periodic tasks with hard deadlines share one processor: a five millisecond sensor loop, a twenty millisecond control law, a hundred millisecond telemetry pass: and the dispatcher must be trivially simple: fixed priorities, decided once, offline, burned into the interrupt table. No runtime priority arithmetic: the live earliest deadline first unit re sorts by deadline at every instant; here the interrupt controller compares two integers, and the whole intelligence must live in the numbers you chose before boot. The referees: exact response time analysis against a cycle accurate simulator, agreeing task by task in both directions: and the famous utilization bound, tested with three hundred random task sets and zero counterexamples beneath it.',
  },
  {
    section: 'origins',
    text:
      'Liu and Layland, Journal of the ACM, nineteen seventy three: the founding paper of real time scheduling theory, and a rare paper that settled its field’s two headline questions in one go. Among fixed priority orderings, rate order: shorter period wins: is optimal: if any fixed assignment meets every deadline, rate order does too. And no fixed assignment can promise more than n times two to the one over n minus one of the processor: a bound that falls toward the natural log of two: about sixty nine point three percent: as tasks multiply. Their other invention in the same paper, dynamic deadline order, is the live EDF unit on this site, and it reaches one hundred percent. Every real time operating system priority table since: VxWorks, FreeRTOS, flight software: is a footnote to those fourteen pages.',
  },
  {
    section: 'pair',
    text:
      'The algorithm owns fixed priority preemption. The highest priority ready task always holds the CPU, releases preempt instantly, and priorities never change at runtime. The rigidity is the feature: the dispatcher is one integer comparison in an interrupt handler: analyzable, certifiable, and immune to the re sorting that dynamic schemes perform at every release. The heuristic supplies the rate rule: shorter period, higher priority: plus the optimality theorem that makes it more than a heuristic: among fixed assignments, if anything works, this works. Measured on this page: three hundred random sets under the utilization bound with zero misses. The response time fixpoints agreeing with the simulator, task by task: one hundred eighty five schedulable sets exact, and all fifteen sets the analysis rejected confirmed missing in simulation. And the classic importance ordered assignment made to starve a sensor loop that rate order runs clean.',
  },
  {
    section: 'picture',
    text:
      'Picture a newsroom with one editor. The wire updates every five minutes, the market column every twenty, the weekend feature every hundred. The rate rule says the wire always interrupts the column, and the column always interrupts the feature: not because the wire is more important, but because it has the least room to spare: its deadline is always the nearest, as a class. Now rank by importance instead: crown the feature: and the wire misses every single cycle while the editor polishes prose. This page measures exactly that. And notice the quiet half of the story: under rate order, the feature still ships. Its hundred minute window was roomy enough to absorb every interruption. That is the theorem in one sentence: urgency is a property of the period, not of the prestige.',
  },
  {
    section: 'run',
    text:
      'Here is the run. Assign once: sort tasks by period, shortest first: that ordering is the entire runtime policy. Dispatch: highest priority ready task runs. Screen with the bound: utilization at or below n times two to the one over n minus one guarantees schedulability outright. Then decide exactly with response time analysis: a task’s worst response equals its own compute time plus, for every higher priority task, the ceiling of the response over that task’s period, times its compute: iterated to a fixpoint, because the growing window admits more preemptions, which grow the window. On the embedded client the fixpoints came out one, eight, and fifty four: and the fifty four is the lesson: the naive first pass says less, and the iteration climbs. The simulator confirmed all three numbers exactly.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, the dispatcher must be trivial: interrupt tables, certified kernels, flight code: a static integer priority is the entire mechanism, and auditors can read it. Second, analyzability is contractual: response time analysis hands you exact worst case response times offline: the numbers you sign in a safety case, not estimates. Third, the utilization is moderate, or the periods are harmonic: below sixty nine percent you are unconditionally safe by the bound: and when periods divide each other cleanly: ten, twenty, forty: this page measured a perfect run at exactly one hundred percent utilization. The bound is sufficient. It was never necessary.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: optimal among fixed priorities, exactly testable, and cheap as an interrupt. Zero misses across three hundred sets under the Liu Layland bound. The response time fixpoints equal to the cycle accurate simulator, task by task, in both directions: every set the analysis blessed ran clean with the predicted worst responses, and every set it rejected actually missed. The embedded client predicted and confirmed at one, eight, fifty four. And the harmonic set clean at exactly full utilization. The weakness is the gap, and this page measures it rather than reciting it: above the bound: about zero point seven eight for three tasks: up to ninety five percent utilization, rate order missed deadlines on ten percent of random sets. Every one of those sets, the live EDF dispatcher ran spotless. Fixed priority pays up to thirty one points of utilization for its simplicity on unlucky period mixes. And under overload the two schedulers fail differently: the EDF page measured that flip from the other side: EDF sprays misses across everyone while rate order shields the fast task and sacrifices the slow: two pages, one experiment, opposite lessons.',
  },
  {
    section: 'tradeoffs',
    text:
      'The rivals, honestly placed. Earliest deadline first, the live unit: dynamic deadline priority, schedulable to one hundred percent, re raced on this page and spotless on every set rate order dropped: at the price of a priority queue at every release, and the overload behavior its own page prices. Least laxity first: priority by slack: deadline minus remaining work: also optimal on one processor and a sharper signal on multiprocessors: but ties in laxity make two tasks preempt each other endlessly: context switch storms that deadline order never suffers. And round robin with a time quantum: fairness without analysis: every task progresses every cycle: which is exactly the wrong currency for a hard deadline: fair progress toward a missed brake application is not a consolation. The decision tree is short: hard deadlines and certification, rate monotonic; hard deadlines and high utilization, EDF; soft deadlines, round robin and sleep well.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is priorities by importance, and it is the most natural assignment in embedded engineering. The telemetry uplink is mission critical: give it top priority. This page runs that logic at seventy five percent utilization and watches the five millisecond sensor loop starve underneath a twenty five millisecond telemetry burst: missed deadlines from the very first cycle: while rate order runs the identical three tasks with worst responses one, eight, and fifty four, room to spare everywhere. The confusion is between two different questions. Importance says which task must never be dropped. The period says which task must run next. Conflate them, and the processor goes to the task with the most slack in the room. Under rate order the telemetry still met every deadline: a hundred milliseconds absorbs any number of one millisecond interruptions. Encode importance in the deadlines you assign. Never in the priority order that serves them.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements the fixed priority simulator with synchronous release at the critical instant, the earliest deadline first simulator for the re race, and the response time analysis fixpoint. The self test asserts, in order: analysis versus machine in both directions on two hundred random sets: one hundred eighty five schedulable, worst responses equal task by task; fifteen rejected, every one confirmed missing. Three hundred sets under the Liu Layland bound, zero misses. Three hundred sets above the bound up to ninety five percent: rate order missing on ten percent, EDF missing on none. The harmonic set at exactly full utilization, clean. And the embedded client: importance priorities miss, rate order meets, fixpoints one, eight, fifty four confirmed. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
