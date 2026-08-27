// The spoken lesson for puzzle thirty nine, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle thirty nine: activity selection, paired with the earliest finish first greedy, for interval scheduling. Here is the puzzle. You hold n requests, each with a start time and a finish time, and one room. Choose the largest possible set of requests that do not overlap. The constraint is psychological as much as mathematical: plausible greedy compasses abound, and almost all of them are wrong. This page runs four of them against a dynamic programming referee, itself verified by brute force, and measures the entire gradient of wrongness: catastrophic, close, and almost right: which are all, in the end, wrong.',
  },
  {
    section: 'origins',
    text:
      'Activity selection is the poster child of greedy algorithms: the example nearly every textbook uses to teach the exchange argument, because the problem looks like it should require search and provably does not. The deeper theory arrived in nineteen seventy one with Jack Edmonds’ matroid theorem, which characterizes exactly when greedy choices are safe: greed is exact precisely when the feasible sets carry a matroid like structure, and the earliest finish rule is the cleanest scalar instance of that principle. The applications are simply the calendar: meeting rooms, satellite ground station passes, runway slots, advertising breaks: anywhere a single resource takes rigid, non overlapping bookings, this five line loop is the whole answer.',
  },
  {
    section: 'pair',
    text:
      'The control structure owns the one pass skeleton: sort by something, sweep once, take whatever fits, and never look back. Every compass on this page shares that skeleton: the same code with one sort key swapped, which is the honest way to demonstrate that the skeleton is not where the intelligence lives. The heuristic supplies the compass: earliest finish first. The exchange argument makes it exact. Among the compatible requests, the one that finishes first can be swapped into any optimal solution without loss: it ends no later than whatever the optimal solution chose first, so it blocks nothing more, and induction marches down the timeline. This page does not cite the theorem: it verifies greedy equals the D P optimum on all two thousand random trials, plus both constructed gadgets, while the three plausible rivals fail one thousand four hundred twenty eight times, three hundred eleven times, and once, respectively.',
  },
  {
    section: 'picture',
    text:
      'Picture booking a single conference room from a pile of requests. The intuition that maximizing bookings means favoring short meetings is a compass borrowed from a domain where it genuinely works: C P U scheduling, where shortest job first really does minimize average waiting time: and imported, unexamined, into a place where it fails. The right question is not, which meeting is cheapest. The right question is, which meeting releases the room soonest. The room’s freedom is the only currency there is. A thirty minute meeting that ends at five is worth less than a three hour meeting that ends at four, and the compass that sees this is the one that sorts by the clock on the wall at the end.',
  },
  {
    section: 'run',
    text:
      'Here is the loop. Sort the requests by finish time: this is the compass, and the only step where the intelligence lives. Sweep once: take the next request whose start is at or after the finish of the last one you took. Skip conflicts without regret: the exchange argument is precisely the proof that regret is impossible. Stop at the end of the list: one pass, n log n total, no backtracking, no memory beyond a single timestamp. And know the boundary before you need it: the moment requests carry different values, every cardinality greedy dies, and the weighted interval scheduling dynamic program takes over. That boundary is measured on this page: greed keeps eighty two percent of the achievable value on average, and forty two and a half percent in its worst trial.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, one resource and a counting objective: most bookings, most satellite passes, most interviews in the day: count, not value. Second, the intervals are rigid: fixed start, fixed finish, no pausing. If jobs can be preempted, you are in the real time schedulers’ world, where earliest deadline first plays a different game with a rhyming compass. Third, you need the proof and not just the answer: in an interview, the code is five lines and the actual question is the exchange argument: can you say, out loud, why swapping the first finishing request into any optimal solution costs nothing.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: exact, five lines, n log n, and proven live rather than cited. Equal to the dynamic programming optimum on every one of two thousand random trials and on both adversarial gadgets, with the referee itself verified against exhaustive subset enumeration on three hundred small instances. When the cardinality objective holds, nothing does better and nothing simpler does as well. The weakness: the compass is welded to the objective. Change most requests to most valuable requests, and earliest finish keeps eighty two point one percent of the optimum on average, forty two and a half in the worst measured trial: the exchange argument breaks the moment a swap can cost value. Multiple rooms change the question to interval partitioning. Preemption changes it to real time scheduling. Greedy exactness is always a theorem about one objective. It is never a property of the code.',
  },
  {
    section: 'tradeoffs',
    text:
      'Here are the measured numbers: ten thousand random requests, one room, against a verified referee whose optimum is two hundred twenty nine. Earliest finish: two hundred twenty nine: optimal here, and on all two thousand trials. Shortest first: two hundred twenty seven: two short here, and wrong in three hundred eleven of two thousand trials; its gadget is a short bridge that spoils two long compatible requests, fifty picks where a hundred existed. Fewest conflicts, run at its own size of four hundred: forty one picks, actually optimal on that instance, and right in four hundred ninety nine of five hundred trials: the nearest miss on the page, killed by a twenty nine interval counterexample the tests discovered and kept. And earliest start, which is first come first served: thirteen. Thirteen, against two hundred twenty nine: six percent of optimal, because one early starting marathon blocks the entire day and first come first served takes it proudly. The gradient is the lesson: catastrophic, close, and almost right are three different distances from wrong, and none of them is right.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is first come first served as an optimizer, and the distinction it teaches is worth the whole page: the difference between a policy and an objective. First come first served is a genuine fairness policy. Queues use it because it treats arrival order as a right, and there are places, ticket lines, kernel run queues under fairness constraints, where that is exactly what you want. But imported into an optimization problem as if fairness and cardinality were interchangeable, it selected thirteen requests where two hundred twenty nine were possible: measured, seventeen fold off. The gadget makes it exact: one marathon request starting at time zero, fifty disjoint short ones after it: first come first served picks the marathon, and the day is gone. Know which thing you are running. A fair rule can be a terrible optimizer, and the room does not care that the marathon asked first.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements the shared greedy skeleton with pluggable sort keys, the four compasses, the weighted interval scheduling dynamic program with predecessor binary search, and the exhaustive subset referee. The self test asserts, in order: the D P equals brute force on three hundred small instances, so the referee itself is verified before it referees anything. Earliest finish equals the optimum on every one of two thousand random trials. Each wrong compass is caught failing: earliest start fourteen hundred twenty eight times, shortest first three hundred eleven, fewest conflicts once in five hundred, with the discovered counterexample retained. Both deterministic gadgets execute as constructed: one versus fifty for first come first served, fifty versus one hundred for shortest first. And the weighted boundary is priced: cardinality greed keeps eighty two percent of optimal value on average across three hundred weighted trials, forty two and a half in the worst. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
