// The spoken lesson for puzzle eighty one, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle eighty one: Held Karp, paired with bitmask subset states, for the exact traveling salesman. Here is the puzzle. n cities, all pairwise distances, one van: find the minimum tour that visits every city and returns home: and not approximately: proven minimal, with the proof being the algorithm itself. Orderings explode: at twenty cities there are over sixty quadrillion tours. The referees on this page: all tours enumerated by brute force on one hundred instances up to nine cities, with every reconstructed tour revalidated city by city: the transition counter equal to its combinatorial closed form, to the unit: and the certification dividend: the popular heuristics priced against optima that are actually known.',
  },
  {
    section: 'origins',
    text:
      'Michael Held and Richard Karp, in the journal of SIAM, nineteen sixty two: with Richard Bellman publishing the same recursion independently in the same year: the Bellman Held Karp dynamic program. Here is the fact that gives this unit its weight: sixty three years later, order two to the n times n squared is still the best exact bound known for the general traveling salesman problem. Nothing provably beats the subset dynamic program. Nothing. The same Held and Karp returned in nineteen seventy with the one tree lower bound that powers branch and bound solvers like Concorde: the two Held Karps bracket exact TSP from both sides: this page teaches the first.',
  },
  {
    section: 'pair',
    text:
      'The algorithm owns the dynamic program over partial tours, and its one observation does all the work: the cheapest path that starts at city zero, visits exactly the set S, and currently stands at city j depends only on the pair S and j: not on the order in which S was walked. Two routes arriving at the same predicament have identical futures: so only the cheaper arrival survives, and the factorial of orderings collapses onto two to the n minus one times n minus one states. At twenty cities: forty four million eight hundred thousand transitions, against sixty quadrillion tours. The heuristic supplies the bitmask: a subset simply is an integer: membership is a bit shift, removal is an exclusive or, and the state table becomes a flat array indexed by the subset itself, swept in increasing integer order: which conveniently visits every set before its supersets. The accounting is exact enough to audit: at thirteen cities the transition counter landed on the closed form: the sum over sizes of choose twelve s, times s, times twelve minus s: one hundred thirty five thousand one hundred sixty eight: to the unit.',
  },
  {
    section: 'picture',
    text:
      'Picture a van driver’s ledger, kept the clever way. The naive ledger has a page per route: astronomically many pages. The clever ledger has a page per predicament: which cities are already done, and where the van currently stands: because any two routes that arrive at the same predicament face exactly the same future, and only the cheaper arrival deserves the page. Predicaments still number two to the n: an astronomy: but a tamed one: forty four million pages at twenty cities instead of sixty quadrillion. Both numbers are exponential in spirit: and the difference between exponentials is the entire difference between impossible and done by lunch.',
  },
  {
    section: 'run',
    text:
      'Here is the run. Seed: for each city j, the one city predicament: the set containing only j, standing at j: costs the direct hop from home. Sweep subsets in ascending integer order: every set precedes its supersets, so when S is settled, push each of its endpoints outward: for every city k not yet in S, offer the arrival into S plus k standing at k, and keep it only if cheaper than what the page already holds. Forget the order S was walked: that forgetting is the collapse. Close the loop: the answer is the cheapest full set page plus the hop home, and backpointers replay the proven tour, which this page re costs and revalidates. And know the wall: two to the n is tamed, not slain: around twenty cities in Python, thirty with tuned bitsets: past it, branch and bound and the heuristics this page prices.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, the answer must be certified: benchmark baselines for heuristics, disputed routes, one shot expensive tours: proven minimal is the deliverable, and only exactness delivers it. Second, n fits under the wall: twenty cities or fewer: which is exactly the size of a daily delivery run, a drill head’s tour of a circuit board cluster, and the interview escalation after the greedy answer. Third, you are learning the pattern, not just the problem: the bitmask over subsets dynamic program solves assignment variants, set cover style problems, and half of the hard division of every programming contest: the traveling salesman is its teaching instance, not its only customer.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: proven optima, with the accounting itself audited. Equal to full enumeration on all one hundred instances, tours revalidated. The transition count matched to its closed form, to the unit: the algorithm’s bill derived, predicted, and paid exactly. The twenty city collapse stated in exact arithmetic. And the certification dividend, which is the quiet star of the page: with true optima in hand, the heuristics were priced: nearest neighbor plus ten percent on average, plus thirty five in the worst case: two opt plus zero point four: and on the thirteen city client, two opt landed on the optimum exactly: a fact that is unknowable without an exact referee. The weakness: the exponent is tamed, not slain. The states cost memory as well as time: twenty five cities want nearly a gigabyte: and past roughly thirty, no tuning saves the subset table: Concorde style branch and bound, powered by the other Held Karp bound, owns exact TSP from there. And the dynamic program asks nothing of the distances: no triangle inequality: which also means it exploits nothing about them.',
  },
  {
    section: 'tradeoffs',
    text:
      'The rivals, honestly placed. Two opt, the edge uncrossing repair: measured at plus zero point four percent average against certified optima, and outright optimal on the client: local search punching far above its proof weight: with the caveat that without a referee, plus zero and plus five look identical from inside. Christofides: the approximation shelf’s crown jewel: at most one point five times optimal, proven, on metric instances: the guarantee without the exactness, at the price of a matching solver and up to fifty percent slack. And simulated annealing, live on this site since the beginning: past every wall, tours for thousands of cities, quality purchased with patience and a cooling schedule: and no certificate at any price. The shelf’s honest structure: exactness to twenty, guarantees to the metric horizon, metaheuristics beyond: and the exact method is what calibrates the other two.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is shipping a heuristic tour unpriced. Nearest neighbor measured plus ten percent average and plus thirty five percent worst against certified optima: and without an exact referee those numbers are unknowable, because a heuristic tour carries no evidence about itself. The operational failure is perfectly silent: routes ten percent too long, every day, forever: thirty five on the unlucky ones: a cost that appears in no log, because nothing in the system knows the baseline exists. The discipline this page enables is the fix: run the exact dynamic program on small or subsampled instances of your own data, and measure your heuristic’s actual gap: here it certified two opt at plus zero point four, and outright optimal on the client. That pricing exercise converts we use a heuristic from a hope into a quantified engineering decision. Exactness at small n was never a toy: it is the instrument that calibrates everything larger.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements the subset dynamic program with the bitmask state table, forward transitions with an exact counter, backpointer reconstruction, the full permutation brute force, nearest neighbor, and two opt. The self test asserts, in order: equality with full enumeration on one hundred instances of five to nine cities, with every reconstructed tour revalidated to visit each city once and re cost to the reported optimum. The transition counter equal to the closed form: the sum of choose m s times s times m minus s: to the unit, at thirteen cities. The heuristic ordering: optimum at most two opt at most nearest neighbor on every instance, with the averages measured. And the twenty city wall stated in exact arithmetic: forty four million against sixty quadrillion. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
