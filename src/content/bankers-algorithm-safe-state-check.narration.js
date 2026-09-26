// The spoken lesson for puzzle one hundred thirty two, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle one hundred thirty two: the banker’s algorithm, paired with the safe-state check, for deadlock avoidance. Here is the puzzle. Several processes share a few kinds of resource, and each process has declared in advance the most of each kind it will ever hold. They request units one at a time and release everything when they finish. Each request must be granted or made to wait. A circular wait, where every process holds what another needs, is a deadlock that nobody recovers from. The method, the banker’s rule: grant a request only if the state after the grant is safe, meaning that some order exists in which every process could be given its full remaining declared need out of what is free plus what earlier finishers release. The heuristic is how safety is decided: not by trying every order, but greedily. Finish any process whose remaining need fits the free pool, add what it held back to the pool, and repeat. If everyone finishes, the state is safe. On this page the greedy check is held to exhaustion on four hundred random states, the textbook example is decided verdict for verdict, and two hundred workloads are run under the banker and under a granter with no rule at all.',
  },
  {
    section: 'origins',
    text:
      'Edsger Dijkstra designed the banker’s algorithm for the THE multiprogramming system at Eindhoven and described it in nineteen sixty five, in Cooperating Sequential Processes: a banker with limited cash who never makes a loan unless, afterward, every customer could still be paid their full credit line in some order. Habermann generalized it to several resource types in nineteen sixty nine and gave the matrix form taught ever since. Holt framed deadlock through resource allocation graphs in nineteen seventy two and separated prevention, avoidance, and detection. The safe-state check in its greedy form, quadratic in the processes and linear in the resource types, is the one in Silberschatz, Galvin, and Gagne’s Operating System Concepts, whose five process example this page reproduces verdict for verdict. Real kernels mostly chose detection or lock ordering instead, because the banker needs every maximum declared up front. The algorithm survives in schedulers, admission control, and any allocator that can ask for a reservation.',
  },
  {
    section: 'pair',
    text:
      'The algorithm owns the rule: a request is granted only if the resulting state is safe. Tentatively apply the grant, free pool minus the request, allocation plus, need minus, run the check, and undo the grant if it fails. The guarantee is exact. From a safe state, whatever the processes do within their declarations, a completion order always exists, so deadlock cannot occur. Measured: two hundred of two hundred simulated workloads finished every process; the textbook requests were decided exactly, granted, wait, unsafe; and the greedy check’s verdict equaled exhaustion’s on four hundred of four hundred random states, its own finishing order replayed and verified each time. The heuristic supplies the check that makes the rule affordable. Safety asks whether any of n factorial completion orders works. The greedy scan finishes any process whose remaining need fits the pool, adds its holdings back, and repeats, because finishing a process can only enlarge the pool, so a process that fits now fits later and no order ever needs to be retried. Two thousand four hundred twenty nine need checks against exhaustion’s four hundred fifty eight thousand eight hundred eighty on the same four hundred states: about half a percent, with identical verdicts. The check’s caution is also its bill. It plans for declared maxima that processes rarely use, so it refused fourteen requests per workload that the process would in fact have survived receiving, and one hundred twenty eight of the two hundred eighty six unsafe states it would forbid still finished under a naive granter.',
  },
  {
    section: 'picture',
    text:
      'A small town banker with a fixed vault. Each customer has an approved credit line, draws on it in pieces, and repays everything at the end of the season. Before handing over a draw, the banker asks one question: if I make this loan, is there still some order in which every customer could be lent the rest of their line and pay it back, each repayment funding the next? If yes, the loan is safe. The banker answers it the easy way: pay off whoever can be fully funded from the vault now, count their repayment into the vault, and look again. Never guess an order, because a customer who can be funded now can be funded later too. The bank cannot fail. It can, however, refuse loans that would have been fine, because a customer who draws only half their line still had the whole line reserved.',
  },
  {
    section: 'run',
    text:
      'Here is the run. A process asks for units within its declared need; if the request exceeds the free pool, it waits. Pretend to grant: subtract from the pool, add to the allocation, subtract from the need. Check: set the working pool to the free pool, and repeatedly finish any unfinished process whose need fits it, adding that process’s allocation to the working pool. Decide: if everyone finished, grant; otherwise undo the pretend and make the process wait. On this page, the textbook state: five processes, three resource types with ten, five, and seven units, free pool three, three, two. The check finishes P one first, because its need of one, two, two fits three, three, two; then P three, P four, P zero, and P two. Safe. P one asks for one, zero, two: the state after is safe, granted. P four asks for three, three, zero: more than the pool, wait. P zero asks for zero, two, zero: it fits the pool, but no finishing order remains, refused. Then the two hundred workloads: the banker finished all of them, refusing fourteen requests per workload along the way; the granter with no rule finished ninety nine and deadlocked in one hundred one.',
  },
  {
    section: 'signals',
    text:
      'The signals that this pair fits. First: the maxima are declared up front. Reservations, admission control, a job that states its peak: without a declaration the check has nothing to plan for. Second: deadlock is unrecoverable, when killing a process or rolling back is worse than making it wait. Third: few processes and few resource types. The check runs on every request, quadratic in the processes; cheap at five by three, a burden at five thousand by three hundred.',
  },
  {
    section: 'tradeoffs',
    text:
      'Now the rivals. Wait-die deadlock prevention: no declarations needed. On a conflict, an older transaction waits and a younger one is rolled back, so no cycle can ever form. It costs rollbacks and restarts of the young, some of them needless, and it earns its keep in databases where a transaction can be restarted cheaply. Distributed deadlock detection: let deadlocks happen and find them, with edge chasing probes sent around the wait-for graph, then kill a victim. The deadlock has already happened by then and recovery aborts work; reach for it when deadlocks are rare and a victim can be aborted and retried. And the ostrich algorithm: ignore the problem. No checks, no declarations, no refusals, the choice of most desktop kernels; the deadlock, when it comes, is the user’s reboot. Reach for it, honestly, when deadlocks are rarer than the cost of preventing them and a restart is acceptable.',
  },
  {
    section: 'tradeoffs',
    text:
      'The honest weaknesses of the hero. It reserves what is declared, not what is used. Fourteen refusals per workload for requests that would have been fine, and one hundred twenty eight of two hundred eighty six unsafe states that a naive granter escaped: the guarantee is bought with waiting. It needs the maxima declared in advance, a fixed set of processes, and resources that come back when a process finishes, which is why kernels chose detection and lock ordering instead. And the check runs on every single request.',
  },
  {
    section: 'tradeoffs',
    text:
      'And the negative example: granting whatever is free. The default allocator, measured. On two hundred request streams with five processes and three resource types, it deadlocked in one hundred one of them, a state with pending requests and no process able to move, while the banker finished all two hundred from the same streams. Half the time it is fine, and that half is the trap: a system that deadlocks on every second workload looks healthy in any single test. Where the declarations exist, the check costs half a percent of exhaustion, and the only price is a wait.',
  },
  {
    section: 'code',
    text:
      'The code on this page is the banker, the check, and its referee in one file. The greedy safe-state check, returning the finishing order it found. An exhaustive check that tries every completion order, as the referee. A replay that verifies any claimed order. The request decision, with the pretend and the undo. A generator of random states, and a simulator in which each process declares a maximum but actually needs a random part of it, so the banker plans for more than will be used. The self test asserts: the greedy verdict equals exhaustion’s on all four hundred states, with the greedy order replayed valid, at under a twentieth of the work; the textbook state is safe with order P one, P three, P four, P zero, P two, and its three requests decide granted, wait, and unsafe; the banker finishes all two hundred workloads while the naive granter finishes some but not all; and some but not all unsafe states finish under the naive granter. When it prints O K, Dijkstra’s banker has been shown to be both airtight and cautious, and the cost of each has a number. The file would fail before it would lie to you.',
  },
];
