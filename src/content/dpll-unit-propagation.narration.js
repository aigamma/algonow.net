// The spoken lesson for puzzle eighty four, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle eighty four: D P L L, paired with unit propagation, for Boolean satisfiability. Here is the puzzle. A formula in clauses: each clause a small demand, satisfy at least one of these literals: and one question: is there any assignment of true and false that satisfies every clause at once? This is the first problem ever proven N P complete, and the one industry decided to solve anyway. The method is backtracking search with a discipline: between every guess, deduce everything that is free. The referee is exhaustion: all two to the n assignments on two hundred fifty instances: one hundred ninety seven satisfiable, fifty three not: verdicts required to match exactly, and every claimed model re-checked, clause by clause. And the experiment is controlled: two arms, identical branching, one propagates and one only guesses: so the measured gap belongs to the heuristic alone.',
  },
  {
    section: 'origins',
    text:
      'Martin Davis and Hilary Putnam, nineteen sixty: a procedure that eliminated variables by resolution, and drowned in the clauses it generated. Two years later, Davis, George Logemann, and Donald Loveland, in the Communications of the A C M: replace elimination with backtracking search: guess, simplify, undo: and keep one deduction rule as the engine: the unit clause. That nineteen sixty two program is the trunk of the entire SAT family tree. In the nineteen nineties, conflict driven clause learning grafted memory onto it, and modern solvers took industrial verification by storm. The nineties also discovered its physics: random three SAT flips from almost surely satisfiable to almost surely not, near four point two six clauses per variable: and search difficulty spikes exactly at that boundary. This page measures the whole curve rather than reciting it.',
  },
  {
    section: 'pair',
    text:
      'The algorithm owns the complete search. Pick an unassigned variable: on this page, the most frequent literal among the shortest live clauses, and the rule is identical in both experiment arms. Try a value. Recurse. On conflict, undo the trail and try the opposite value. Completeness is the point: when the tree is exhausted, that exhaustion is a proof that no model exists: which is why this machinery answers questions local search cannot touch. The heuristic is the deduction between guesses. When a clause has every literal false but one, the survivor is forced: assign it: and that assignment may reduce other clauses to units: a cascade. Each forced literal is a free inference: an entire subtree that will never be searched. The measurement: same thirty instances, same branching, propagation off: two thousand three hundred six nodes. Propagation on: three hundred forty three. Seven times, from one deduction rule. And every forced literal is audited at the moment of forcing: all other literals in its clause false: asserted.',
  },
  {
    section: 'picture',
    text:
      'Sudoku players know this loop in their bones. You guess one cell: the decision. Suddenly some row needs its missing digit in exactly one place: write it in: the forced move. And that entry forces another, and another: a cascade of certainties rippling out from one guess. Only when the cascade dries up do you guess again. Now imagine playing the same puzzle while refusing to write forced moves: guessing every cell, noticing contradictions late, erasing mountains of work. Same rules, same puzzle, several times the labor. D P L L is exactly that discipline, applied to logic. Guess rarely. Deduce greedily. And let every contradiction cancel a whole subtree of futures at once.',
  },
  {
    section: 'run',
    text:
      'Here is the run. Propagate: while any clause has exactly one live literal, that literal is forced: assign it and keep chasing the cascade. Check: a clause with every literal false is a conflict: undo the trail, flip the last decision. Decide: when all is quiet and clauses remain, branch and recurse. Terminate honestly: all clauses satisfied is SAT, with a model anyone can check in linear time: an exhausted tree is UNSAT, proven. And know the landscape: this page measures the famous phase transition at n equals ninety. At two clauses per variable, everything is satisfiable and easy: fifty six decisions on average. At six, nothing is satisfiable, and refutations come fast: one hundred fifty four. At four point two six, the boundary itself: satisfiability collapsing through sixty percent, and five hundred twenty four decisions: the easy hard easy signature. Hardness is not about size. These instances are all the same size. Hardness lives at the boundary between yes and no.',
  },
  {
    section: 'signals',
    text:
      'The signals that this pair fits. First: the answer must be trusted in both directions. Verification, planning, dependency resolution: these need impossibility proven, not just models found: and only complete search can say never. Second: your problem encodes to clauses. Coloring, scheduling, circuit equivalence: this page encodes three coloring of the Petersen graph in eighty five clauses, solves it in twelve decisions, decodes the model back into colors, and verifies all fifteen edges: then proves two colors impossible with the same code. Third: constraint cascades exist in your domain. Wherever one commitment forces others: Sudoku, type inference, arc consistency: propagation converts guessing into deduction, and the conversion rate is the whole game.',
  },
  {
    section: 'tradeoffs',
    text:
      'Now the rivals. C D C L with V S I D S branching is the descendant that ate industry. Each conflict becomes a learned clause: a permanent theorem the search can never violate again: activity scores steer branching toward the current fight, and restarts escape bad prefixes. The result handles millions of variables in practice. The cost is engineering mass: watched literals, clause databases, decay schedules: this page’s transparency traded for three orders of magnitude. For any SAT instance you did not write by hand: verification, scheduling, package resolution: C D C L is the answer, and this page is its skeleton.',
  },
  {
    section: 'tradeoffs',
    text:
      'WalkSAT is the incomplete rival: start from a random assignment, and repeatedly flip one variable inside some unsatisfied clause: greedily when it helps, randomly to escape. On huge satisfiable instances: planning, configuration: it often finds models where tree search stalls, and when a model is the only deliverable, it earns its place. And the special case trapdoor: two SAT. When every clause has exactly two literals, a or b is two implications: not a implies b, not b implies a. Build the implication graph, run strongly connected components: satisfiable exactly when no variable shares a component with its own negation. Linear time, fully exact. Three literals anywhere and the trapdoor slams shut: but checking for the structure before paying the general price is strategic fluency in one move.',
  },
  {
    section: 'tradeoffs',
    text:
      'And the negative example: WalkSAT asked to prove UNSAT. An incomplete solver on a completeness question. Run it on this page’s pigeonhole formula: six pigeons, five holes, obviously impossible: and it flips forever, learning nothing, proving nothing. No amount of silence is evidence of impossibility, because the algorithm has no notion of an exhausted search space. Shipping probably unsatisfiable, we looked hard, where a proof was required, is the same sin as reading one Karger run as the minimum cut: mistaking the absence of a witness for a certificate. Note that D P L L pays honestly for its proofs: pigeonhole cost seven hundred forty eight decisions of grinding, because search without clause learning rediscovers the same dead ends: that measured pain is precisely the gap C D C L was born to close.',
  },
  {
    section: 'code',
    text:
      'The code on this page is the real solver. Unit propagation with a built in audit: a literal is forced only when every other literal in its clause is verifiably false, asserted at force time. The branching rule: most frequent literal among the shortest clauses: shared by both experiment arms. The self test runs five oracles: two hundred fifty verdicts against full exhaustion, every model re-checked: the controlled ablation, seven times: the phase transition at n equals ninety, six ratios, with the difficulty spike at four point two six asserted to tower over both easy edges: pigeonhole six into five proven impossible, with the satisfiable five into five control passing: and the Petersen graph three colored, decoded, and verified edge by edge. When the last line prints O K, every number you have heard was asserted by a running program, not remembered from a textbook.',
  },
];
