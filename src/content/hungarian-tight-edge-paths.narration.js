// The spoken lesson for puzzle seventy two, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle seventy two: the Hungarian algorithm, paired with tight edge alternating paths, for the assignment problem. Here is the puzzle. n workers, n jobs, and an n by n table of costs: every worker could do every job, at a price. Choose the one to one assignment of minimum total cost: exactly, and with a proof of optimality attached, because a schedule this consequential gets audited. The space is n factorial assignments: at one hundred fifty workers, a number with two hundred sixty three digits: and yet the referees on this page are absolute: exhaustive permutation search on one hundred fifty small instances, and then, at every size, the linear programming duality certificate: potentials feasible on all twenty two thousand five hundred pairs, matched edges exactly tight, and the dual total equal to the primal cost, to the unit.',
  },
  {
    section: 'origins',
    text:
      'Harold Kuhn, nineteen fifty five, in the Naval Research Logistics Quarterly: and the name is an act of citation. Kuhn called it the Hungarian method for the two Hungarian mathematicians whose theorems power it: Dénes Kőnig, whose matching duality already anchors the live Hopcroft Karp unit on this site, and Jenő Egerváry, whose weighted extension is the potentials trick itself. James Munkres tightened the analysis two years later: hence Kuhn Munkres. And the field’s best footnote arrived in two thousand six, when scholars reading Carl Jacobi’s posthumous papers found the method essentially complete: written before eighteen fifty one. The Hungarian algorithm predates its own name by a full century.',
  },
  {
    section: 'pair',
    text:
      'The algorithm owns the primal dual frame. Maintain a potential u for every worker and v for every job, constrained so that u plus v never exceeds the cost of any cell: dual feasibility: and permit matching only along tight edges, where u plus v equals the cost exactly. The frame carries its proof in its pockets: any perfect assignment must cost at least the sum of all potentials: so the moment a complete assignment of tight edges exists, its cost equals that bound, and optimality is proven rather than argued. The heuristic supplies the motion: from each unmatched worker, grow an alternating tree using tight edges only. When the tree is stuck, raise the tree’s worker potentials and lower its job potentials by the minimum slack: no feasible edge breaks, at least one new edge snaps tight, and the tree grows: until an augmenting path completes. One worker at a time, n times. Measured on this page: eight hundred eighty six dual updates for one hundred fifty workers, against the theoretical bound of twenty two thousand five hundred.',
  },
  {
    section: 'picture',
    text:
      'Picture a subsidy negotiation. Give every worker a stipend and every job a discount, with one rule: no cell’s price may ever be beaten below zero. Call a pairing fair where stipend plus discount hits the price exactly, to the cent. Now try to marry everyone off using only fair cells. When a group gets stuck: several workers chasing too few fair jobs: the negotiator nudges the books: raises the stuck workers’ stipends, lowers their candidate jobs’ discounts, by the smallest amount that makes exactly one new cell fair. Nothing already fair breaks. The options only grow. And when the last worker marries, the ledger balances perfectly: total subsidies equal total cost paid: and that equality is the proof. No other wedding could have cost less, because every wedding costs at least the subsidies.',
  },
  {
    section: 'run',
    text:
      'Here is the run. Start feasible: all potentials zero, every edge slack. Grow the tree: from an unmatched worker, alternate: tight edge out, matched edge back: collecting rows and columns. Stuck: compute the minimum slack from tree rows to non tree columns: add it to the tree’s row potentials, subtract it from the tree’s column potentials: one new edge snaps tight, and the scan continues from there. Augment: when the tree reaches an unmatched column, the alternating path flips: one more worker matched. Repeat n times. Read the proof off the books: the sum of all potentials equals the total cost, and u plus v stays at or below every cell: this page asserts both, on every instance, including all twenty two thousand five hundred pairs at scale.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, both sides are scarce and the pairing is one to one: workers and jobs, servers and shards, radar tracks and detections: everyone must be assigned, and the total is the objective. Second, the answer must be defensible: the duality certificate is an audit artifact: this schedule is optimal, and here is arithmetic anyone can check without rerunning anything. Third, n is thousands or less: n cubed with tiny constants: everything on this page ran in a tenth of a second, and computer vision runs this algorithm per video frame to match object tracks to detections.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: exact, certified, and fast enough to forget about. Equal to exhaustive permutation search on all one hundred fifty small instances. The full duality certificate at every size: feasibility everywhere, matched edges tight, dual equal to primal. The greedy trap dispatched at its optimal twelve where greedy paid four thousand four. And eight hundred eighty six dual updates at n one hundred fifty: far inside the n squared bound, a tenth of a second on the clock. The weakness: square, dense, and centralized. The classic form wants the complete n by n matrix: unbalanced problems get padded, sparse ones waste the density, and at n in the millions, n cubed is over budget: the auction algorithm’s decentralized bidding and the min cost flow formulations take over there. And the contract is strictly one to one: capacities, multiple jobs per worker, precedence constraints: each steps outside the assignment polytope, and this machinery stays behind.',
  },
  {
    section: 'tradeoffs',
    text:
      'The rivals, honestly placed. Hopcroft Karp, live on this site: when costs are zero or one: can or cannot: maximum cardinality matching in batches of shortest augmenting paths is far faster than carrying prices nobody set: the unweighted special case, solved by its specialist, on Kőnig’s own duality. Successive shortest paths: assignment reformulated as minimum cost flow: the same potentials wearing Johnson’s name: more scaffolding for a matrix problem, but the generalization natively handles capacities, unbalance, and sparsity: when assignment is one corner of a larger flow, start there. And the auction algorithm: Bertsekas’s decentralized answer: workers bid for jobs, prices rise, epsilon scaling drives it exact: embarrassingly parallel, the choice for robot fleets and GPU batches: at the price of a tuning dial the Hungarian frame never needs.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is greedy assignment on shared scarcity, and it is the assignment everyone writes in the first five minutes: each worker takes the cheapest job still open. On this page’s trap it paid four thousand four against the optimal twelve: three hundred thirty four times worse: and the mechanism deserves naming. In each block, the first worker takes the shared cheap column: worth one to them, worth everything to their neighbor, whose only alternative costs a thousand. Greedy prices what a column is worth to me: never what taking it costs everyone else. On honest random costs, no adversary at all, that blindness still measured one hundred sixty percent over optimal. Opportunity cost is the entire content of the assignment problem: the potentials u and v are precisely its bookkeeping: and the greedy loop is the decision to skip the bookkeeping and hope.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements the potentials form of the Hungarian algorithm: the alternating tree grown column by column, the minimum slack maintained incrementally, the dual update applied to the whole tree at once, and the path unrolled to augment: with a counter on the dual updates: plus the greedy baseline and the full certificate checker. The self test asserts, in order: equality with exhaustive permutation search on one hundred fifty instances, n two through seven. The certificate on every instance: u plus v at or below cost on every pair, matched edges tight, dual total equal to primal, the match a true permutation. The trap, exact: four blocks, greedy four thousand four, optimal twelve. The random cost greedy gap above five percent: measured at one hundred sixty. And the dual update count inside its n squared bound. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
