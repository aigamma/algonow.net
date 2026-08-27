// The spoken lesson for puzzle twenty-one, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle twenty one: Kahn’s algorithm, paired with the zero in-degree queue, for topological ordering. Here is the puzzle. You are given a set of tasks and one way dependencies: an arrow from u to v means u must happen before v. Your task is to produce an order that performs every task after all of its prerequisites, or, if no such order exists, to prove it and say exactly what is stuck. Two constraints give the problem its edge. Cost: every dependency may be examined a constant number of times, because at real scale the lazy alternative is measured at one hundred sixty seven times over budget. And diagnosis: when the graph is broken, the answer must be a report, not a shrug.',
  },
  {
    section: 'origins',
    text:
      'Westinghouse, nineteen sixty two. Arthur Kahn publishes the method in the Communications of the ACM under the title Topological Sorting of Large Networks, and the large networks in question are PERT charts: the project scheduling diagrams of the aerospace era, in which thousands of engineering tasks wait on one another and somebody must find an order to run them in. Robert Tarjan’s nineteen seventy six depth first formulation gave the problem its second dialect. Between the two of them they now run the dependency machinery of the software world: make and every build system since, package installers, spreadsheet recalculation, database migration runners, task schedulers. Sixty years on, nearly every ordered execution you touch is either source removal or reverse finishing order.',
  },
  {
    section: 'pair',
    text:
      'The control structure owns one lemma and one loop. The lemma: a task with no unmet prerequisites is safe to perform right now, and every non empty acyclic graph has at least one such task, because if you walk arrows backward and never revisit, a finite graph must run out of road. The loop: perform a source, delete it from the graph, and notice that its departure may free others; repeat until nothing remains. If tasks remain when no source does, that leftover set is itself the proof that no valid order ever existed. Correctness never depends on which ready task you take first. The heuristic decides how the ready tasks are FOUND, and that decision is the entire cost model. Maintain a queue of tasks whose unmet prerequisite count is zero. When a task completes, decrement the count of exactly its dependents, and any count that reaches zero joins the queue. Each edge in the graph is touched exactly once, ever. The tested solution asserts the total work equals two V plus E, to the integer, not to the big O. And one more gift: the queue is a genuine policy slot. First in first out gives you parallel waves. A min heap gives the alphabetically smallest legal order, proven below by brute force. A priority queue gives scheduling. The frontier is the algorithm; the order within the frontier is policy.',
  },
  {
    section: 'picture',
    text:
      'Picture registering for courses against a prerequisite catalog. Each term, you ask exactly one question: which courses am I eligible for right now? That eligibility list is the frontier. Notice how cheap it is to keep current: finishing a course changes the eligibility of only the courses that listed it as a prerequisite, and no others. So you take the eligible courses, term after term, and the entire catalog orders itself. The terms are the waves: everything in a term could be taken simultaneously. The number of terms is forced: it equals the longest prerequisite chain in the catalog, because each term shortens every surviving chain by exactly one course. And if some morning the eligibility list is empty while courses remain, no schedule was ever possible: somewhere in the catalog, courses require each other in a circle.',
  },
  {
    section: 'run',
    text:
      'Here is the loop. First, count: one pass over the edges computes every task’s in degree, its number of unmet prerequisites, and every task at zero enters the ready queue. Second, take a task from the queue and append it to the order. Third, release: decrement the count of each dependent, and any dependent reaching zero joins the queue; this is the only place edges are touched, and each is touched once. Fourth, finish or diagnose: if the queue empties with every task processed, the order is complete and valid; if tasks remain, they are precisely the ones that can never start, and the count that never reached zero is the accusation. Fifth, choose the queue to choose the product: first in first out for generation by generation waves, a min heap when you need the canonical smallest order, priorities when the order should respect deadlines or costs.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, you are executing a dependency graph, not merely admiring it: builds, migrations, spreadsheet cells, pipeline stages, course plans. The order is the deliverable. Second, you want the waves: everything ready now can run in parallel, and the number of waves is the critical path depth, which came out to twenty on the measured instance and was verified against an independent longest chain computation. Third, cycles are expected user error, and the stuck set falls out of the arithmetic for free: whatever never reached zero was never startable, hand the user the list.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: exactly V plus E, and the frontier is a product in itself. The work is asserted to the integer: twelve thousand touches for two thousand tasks and eight thousand edges, two per vertex and one per edge. The waves come free. The queue is a dial. The cycle detector is a subtraction. The weakness comes in two honest clauses. Whole graph first: Kahn needs every vertex and every in degree before it can take step one, whereas the depth first rival explores lazily from any requested target, which is exactly why demand driven build systems, give me just this target and its ancestors, are DFS shaped. And the autopsy is coarse: when a cycle exists, Kahn reports the blast radius, every task that can never start, four hundred forty six of them on the measured instance, while the depth first search hands back the actual five task circle that caused it all. Blast radius tells you how much is broken; the cycle tells you what to fix.',
  },
  {
    section: 'tradeoffs',
    text:
      'Here are the measured numbers, on two thousand tasks and eight thousand dependencies, arranged as a shuffled random DAG so that vertex numbering carries no hint of the answer. Kahn with the ready queue: twelve thousand touches, which the test asserts equals two V plus E exactly. Kahn with the heuristic removed, rescanning every task for readiness after each completion: two million nine thousand touches, one hundred sixty seven times more, for character for character the same output; and that multiple grows linearly with the task count, so at a hundred thousand tasks it would be ten thousand fold. The depth first rival: eight thousand four hundred twenty four touches, slightly the cheapest pass on the board, with no frontier and no waves in its vocabulary. Then the planted five cycle: Kahn’s report names all four hundred forty six tasks that can never start; the depth first search returns the exact five task cycle, and the test walks that cycle edge by edge to confirm it is real. The wave count: twenty, equal to the longest prerequisite chain plus one, verified by an independent dynamic program. And the min heap variant’s claim to produce the lexicographically smallest legal order is not taken on faith: on forty small random DAGs, the test enumerates every topological order by brute force and confirms the heap’s answer is the minimum, every time.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never bring to this problem is the one the word sorting invites: invent a per task score and sort by it. Fewest prerequisites first sounds so reasonable. Measured, on this graph, sorting by in degree violates one thousand forty nine of the eight thousand dependencies. The failure is not a bad choice of key; it is that no scalar key can exist. A partial order is relational information, u before v, and any single number per task throws the relation away: two tasks can each precede things the other follows, and no pair of numbers can say both. The frontier is not a clever optimization of the sorting reflex. It is the replacement for it, and the day you feel the reflex, this measurement is the antidote.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements Kahn with the ready queue and an exact work counter, the same lemma with the rescan instead of the queue, and the depth first dialect iteratively, with an explicit stack, because a two thousand task chain would overflow Python’s recursion limit, plus cycle recovery from the back edge via parent pointers. The self test asserts, in order: every produced order is valid against all eight thousand edges by the definition, position of source before position of target; the queue’s work equals two V plus E exactly; on the planted ring, Kahn’s stuck set contains the ring and the depth first search’s returned cycle is a genuine cycle, checked edge by edge; the min heap variant matches brute force enumeration of all orders on forty small DAGs; the wave count equals the longest chain plus one by independent dynamic programming; and the in degree sort violates over a thousand dependencies. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
