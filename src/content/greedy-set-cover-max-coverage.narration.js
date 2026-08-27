// The spoken lesson for puzzle eighty nine, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle eighty nine: greedy set cover, paired with maximum coverage selection, for the set cover problem. Here is the puzzle. A universe of needs, and a catalog of sets that each cover some of them: test cases covering code branches, sensors covering rooms, crews covering routes. Cover everything with the fewest sets. This problem is N P hard exactly: and yet one greedy rule: always take the set that covers the most still uncovered elements: carries a guarantee proven in nineteen seventy nine and, by a hardness theorem from nineteen ninety eight, essentially unbeatable by any polynomial algorithm at all. This page runs both sides of that story. Three hundred instances against brute force optima, found by subset search and certified: the guarantee checked instance by instance: and the famous trap family where greedy genuinely pays the logarithm, run rather than cited, for k equals two through nine.',
  },
  {
    section: 'origins',
    text:
      'Set cover sits at the origin point of approximation algorithms. David Johnson in nineteen seventy four and Laszlo Lovasz in nineteen seventy five analyzed the greedy rule for the unweighted problem: Vasek Chvatal, nineteen seventy nine, settled the weighted case in three pages: greedy lands within H of d of the optimum, where H of d is the harmonic sum one plus a half plus a third, up to one over d, and d is the largest set’s size. Two decades later, Uriel Feige closed the story from the other side: unless P equals N P, no polynomial time algorithm beats roughly the natural log of n. The humble argmax is essentially the best anyone can do. And the same marginal gain rule, analyzed through submodularity by Nemhauser, Wolsey, and Fisher, gives the one minus one over e coverage guarantee that runs sensor placement and influence maximization today.',
  },
  {
    section: 'pair',
    text:
      'The algorithm owns the loop and the ledger. Keep a covered mask. Each round, rescore every set by how many still uncovered elements it would add: a bitmask and, then a popcount: take the argmax, mark its elements covered, repeat until the universe is gone. The client’s entire run cost two hundred fifty three gain evaluations. The heuristic is the selection rule itself: maximum marginal coverage: buy the set that helps most right now. Its power, measured: against certified optima on three hundred instances, greedy was exactly optimal on eighty five percent of them, with a mean ratio of one point zero three nine and a worst of one point five: always inside Chvatal’s bound, checked instance by instance. Its blindness, also measured: a family of instances baits the argmax k times in a row while two sets sit in plain sight covering everything.',
  },
  {
    section: 'picture',
    text:
      'Stocking a toolbox for a long job list. The greedy foreman repeatedly grabs whichever tool knocks out the most remaining jobs: the multitool first, obviously. Usually this ends brilliantly: eighty five percent of the time on this page, it ends literally optimally. But watch the trap. Two specialist kits would finish the entire list between them. Yet at every visit to the store, some flashy gadget clears just over half of what is left: one more job than either kit’s remaining share: so the foreman buys gadget after gadget after gadget. Five purchases where two sufficed. The rule sees only the current shelf against the current list. It cannot see that two purchases together would end everything, because together is not a word the argmax knows. That myopia, priced exactly, is the logarithm.',
  },
  {
    section: 'run',
    text:
      'Here is the run, on the trap family so you can feel the swindle. The universe is a grid: two rows, thirty one columns. The two row sets cover everything: the optimum is two. The bait: column blocks of doubling width: sixteen columns, then eight, then four, two, one: each block covering both rows of its span. Round one: the widest block covers thirty two elements: each row, only thirty one. The argmax takes the block. Round two: each row now has fifteen uncovered: the next block has sixteen. Bait taken again. And again, all the way down: greedy spends five picks: k picks in general: where two sufficed. Measured on this page for k two through nine: at a universe of one thousand twenty two elements, greedy pays nine picks against the optimum’s two: four and a half times: and the assertion checks that greedy never once touched a row. The logarithm is not an inequality on a slide. It is a place, and this page walks there.',
  },
  {
    section: 'signals',
    text:
      'The signals that this pair fits. First: coverage shaped demands: test suite minimization, sensor and facility placement, crew and route assignment, feature selection: a universe, a catalog, pay per set. Second: diminishing returns hold: a set helps less as other sets get chosen: that submodularity is exactly what the argmax exploits, and it is the hypothesis behind the one minus one over e budget guarantee, which this page verified against every brute force budget optimum on two hundred instances: worst case eighty eight point nine percent, mean ninety nine point two, floor sixty three point two. Third: a guarantee beats a gamble. When exactness is off the table: and past a couple dozen sets, it is: a proven ceiling you can check in milliseconds beats an unbounded metaheuristic wander every time the answer matters.',
  },
  {
    section: 'tradeoffs',
    text:
      'Now the rivals. L P rounding is the other road to the same logarithm: relax set cover to its fractional version, where sets can be bought in slices: solve the linear program: the live simplex unit’s trade: then round the fractions to real picks, randomly. It matches greedy’s guarantee, and it absorbs what greedy cannot express: weights, capacities, fairness constraints, side conditions: the L P swallows them all and the rounding survives. The price is an L P solve per instance and probabilistic guarantees. Reach for it when the covering problem grows structure: reach for greedy when it is coverage, plain, at speed. Branch and bound: the live unit: is the exact road: certified optima, worst case exponential, alive only while instances stay small or prune hard: it refereed this very page wearing its simplest costume.',
  },
  {
    section: 'tradeoffs',
    text:
      'The most instructive rival is greedy vertex cover, with maximal matching: because it shows the approximation factor lives in the problem, not in the greed. Vertex cover: hit every edge with the fewest vertices: take any maximal matching and keep both endpoints of every matched edge: factor two, guaranteed, no logarithm anywhere. Same greedy spirit, kinder problem structure, constant factor. Set cover’s structure is crueler, and Feige proved the cruelty is intrinsic. The strategic lesson is to ask, before reaching for any approximation: what factor does this problem’s structure permit? Sometimes the answer is two. Sometimes it is the log. Sometimes: as with the live Christofides discussion for metric T S P: it is three halves. The greed is the same everywhere: the geometry of the problem sets the price.',
  },
  {
    section: 'tradeoffs',
    text:
      'And the negative example: greedy coverage where exact cover was asked. Exact cover: Sudoku, pentomino packing, Knuth’s Algorithm X territory: demands sets that partition the universe: every element covered exactly once, overlaps forbidden. Greedy set cover’s entire engine is overlap tolerant maximization: it will cheerfully return overlapping sets, and no cleanup pass turns a pile of overlaps into a partition: the constraint is combinatorial, not cosmetic. The two problems share a noun, a universe, and a catalog, and they differ in one word: at most once, versus exactly once. That single word moves the problem from greedy approximable to needs backtracking. Read the constraint before reaching for the argmax: the cheapest mistake in this catalog is solving a different problem well.',
  },
  {
    section: 'code',
    text:
      'The code on this page is small and fully refereed. Greedy cover over bitmasks: gains by popcount, an evaluation counter, validity rechecked. The brute referee: subset search in size order, certified optima. The tight family generator, built so the widest block always out bids a half covered row. The budgeted variant against brute best b subsets. The self test asserts: three hundred valid covers inside Chvatal’s bound, instance by instance, worst one point five, optimal on eighty five percent: the trap family taking exactly k baits for k two through nine, rows never touched: the one minus one over e floor holding on all two hundred budget instances: and the test suite client priced against its certified optimum, eleven picks versus ten. When it prints O K, both theorems: the guarantee and the trap: have run to completion in front of you.',
  },
];
