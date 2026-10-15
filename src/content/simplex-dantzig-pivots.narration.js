// The spoken lesson for puzzle twenty-eight, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle twenty eight: the simplex method, paired with Dantzig’s pivot rule, for linear programming. Here is the puzzle. You are given a linear objective and a set of linear inequality constraints; the feasible points form a polytope, a gem cut by flat faces, and somewhere on it the objective is largest. Your task is to find the optimal vertex, exactly, and to hand over a certificate: a dual solution proving that nothing better exists anywhere. And the constraint has teeth in two places. Correctness includes termination: degenerate corners can trap careless pivot rules in eternal cycles, demonstrated below in exact arithmetic, and adversarial polytopes can stretch a greedy walk exponentially, measured below at four thousand ninety five pivots on a twelve dimensional cube.',
  },
  {
    section: 'origins',
    text:
      'George Dantzig built the simplex method in nineteen forty seven, for Air Force planning problems, and for two decades it looked untouchable: a few dozen pivots on everything anyone fed it. The reckoning came in three acts. Beale, nineteen fifty five: a small degenerate program on which the natural rule cycles forever. Klee and Minty, nineteen seventy two, asking in their title, how good is the simplex algorithm: a squashed cube on which the largest reduced cost gain rule visits every one of the two to the n vertices. Bland, nineteen seventy seven: the humble smallest index rule provably cannot cycle. Spielman and Teng’s smoothed analysis in two thousand four proved a bound for a particular two phase shadow vertex simplex method. Under their Gaussian coefficient perturbation model, its expected time is polynomial in the dimensions and the inverse perturbation scale. The bound depends on how large the perturbations are. It does not establish that guarantee for Dantzig’s rule. The traps are real, and this page measures both.',
  },
  {
    section: 'pair',
    text:
      'The control structure owns the walk and the certificate. A linear objective over a polytope attains its optimum at a vertex, so simplex walks from vertex to adjacent vertex, always along an edge that improves the objective, and stops when no improving edge remains. And here is the part that elevates it: at that stopping vertex, the final tableau’s reduced costs are, read directly, a solution to the dual program, and the tests verify that on five larger instances: the dual is feasible, and its objective equals the primal’s, gap zero. The answer arrives holding its own proof. The heuristic chooses which improving edge to take. Dantzig’s rule takes the largest gain per unit of the entering variable, the most negative reduced cost in this tableau. On real ground that greed is superb: a median of nine pivots on random thirty by sixty programs, about three point seven times fewer than the cautious alternative. Its two failure modes are the story of this page: on the Klee Minty cube it takes exactly two to the n minus one pivots, and at Beale’s degenerate corner, with an innocent tie break, it cycles forever.',
  },
  {
    section: 'picture',
    text:
      'Picture a climber on a cut gemstone in dense fog, seeking the highest corner. The only sense available is local: standing at a corner, the climber can feel which edges lead upward, and what gain each offers per unit of its entering variable. Dantzig’s climber takes the largest such gain. This is different from gain per unit of geometric distance. On honest gems, brilliant: nine corners, median, and done. The Klee Minty stone is cut by an adversary so that, at every corner, the edge with the largest gain per unit of its entering variable is the one belonging to the scenic route: the climber crosses all four thousand ninety six corners of the twelve dimensional stone, and every single step is locally irreproachable. And one corner of Beale’s stone is polished so flat that several edges tie at exactly zero initial gain: a climber who breaks such ties carelessly circles that corner forever, feeling progress at every turn and making none.',
  },
  {
    section: 'run',
    text:
      'Here is the loop. First, stand at a vertex: algebraically, a basis of constraints holding tight; with all slacks basic, the origin serves as the starting corner here. Second, price the edges: the reduced costs say, for each nonbasic variable, how the objective would respond per unit of entering. Third, choose by your rule: Dantzig takes the largest gain per unit of the entering variable, Bland takes the smallest index, the randomized rule flips among all improving candidates; this choice is the entire heuristic, and the contest prices all three. Fourth, the ratio test: increase the entering variable to the minimum nonnegative ratio, where a basic variable reaches zero and leaves. Bland breaks ties by the smallest basic variable index. The tests assert feasibility is preserved at every single pivot. If no constraint ever goes tight, the program is unbounded, and the method says so rather than wandering. Fifth, stop with proof: when no reduced cost improves, the slack columns of the objective row spell out the dual solution, verified feasible with zero gap.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, you need exact vertex answers and dual values: shadow prices, sensitivity ranges, and above all the LP relaxations inside every integer programming solver, which is where most simplex pivots on earth are spent. Second, warm starts matter: after adding one constraint or bound, simplex resumes from the previous vertex in a handful of pivots, the property interior point methods famously lack, and the entire reason branch and bound is simplex country. Third, typical performance matters, so measure your instances. The shadow vertex method’s smoothed bound does not give Dantzig’s rule a polynomial guarantee.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: fast in the world, and self certifying. Nine median pivots on random ground; the dual certificate free in the final tableau, checked rather than trusted; and warm starts. These measurements do not give Dantzig’s rule a polynomial guarantee under coefficient perturbations. The weakness: the traps exist, and this page refuses to wave at them: it runs them. The cube costs exactly two to the n minus one pivots: sixty three, two hundred fifty five, one thousand twenty three, four thousand ninety five, as n climbs from six to twelve, a doubling ladder the tests assert. Beale’s corner cycles under Dantzig with a plain tie break, caught by basis tracking in exact rational arithmetic, no floating point escape hatch. And each dense tableau pivot costs m times n work, which is why production solvers run the revised simplex over sparse factorizations, with interior point methods alongside for the guarantee.',
  },
  {
    section: 'tradeoffs',
    text:
      'Here are the measured numbers. Random ground first: thirty programs, thirty constraints, sixty variables, median pivots to the proven optimum. Dantzig: nine. Bland: thirty three point five. Random improving edge: twenty eight point five. The cautious rule takes about three point seven times as many pivots on this sample. Now the adversary’s cube at n twelve. Dantzig: four thousand ninety five pivots, and not approximately: two to the twelfth minus one, exactly, with the whole ladder measured at every even n below it. Bland: four hundred sixty five. And the randomized rule: thirty nine. Read that one again: the cube is a machine built against one specific deterministic rule, and the randomized rule on this seed walks through it in a hundred five times fewer pivots than Dantzig’s rule. That tests a different pivot rule on fixed coefficients. Smoothed analysis instead perturbs the program’s coefficients. Then Beale’s corner, in exact fractions: Dantzig with the standard tie break revisits a basis and would loop forever; Bland’s smallest index rule, on the identical instance, terminates at the true optimum, one twentieth, in six pivots. Every claim in this paragraph is an assertion in the test file, not a sentence in a textbook.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is the one the vertex theorem seems to invite: enumerate the vertices and keep the best. It is this page’s own referee at toy size, four constraints and eight variables, four hundred ninety five bases, each solved exactly, and it is how the tests know all three pivot rules land on the true optimum. At the contest’s entirely modest scale, thirty constraints and sixty variables, the same enumeration is ninety choose thirty: about six times ten to the twenty third bases. A mole of linear systems. The vertex theorem tells you where the answer lives; it does not say you can afford the neighborhood. Simplex is precisely the discipline of visiting almost none of it: nine corners, median, out of more vertices than there are stars.',
  },
  {
    section: 'code',
    text:
      'The Python solution is one tableau simplex with the pivot rule injected: Dantzig, Bland, or randomized, with a flag that switches every number to exact fractions, which is what makes the cycling demonstration honest: no rounding can rescue or fake a loop when the arithmetic is rational. Beside it, the exhaustive basis enumerator, the Klee Minty generator, and Beale’s classic data. The self test asserts, in order: all three rules match exhaustive enumeration on twenty five exact instances; on five larger instances, the primal answer satisfies every constraint, the dual read from the tableau is feasible, and the duality gap is zero, strong duality serving as a unit test; feasibility holds at every pivot; the cube ladder equals two to the n minus one at every measured n; and Beale’s corner cycles under Dantzig while Bland terminates at one twentieth in six pivots. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
