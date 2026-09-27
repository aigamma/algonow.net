// The spoken lesson for puzzle one hundred thirty three, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle one hundred thirty three: Gaussian elimination, paired with partial pivoting, for linear systems. Here is the puzzle. A dense square matrix and a right hand side, in floating point. Solve the system to the precision of the arithmetic, in about a third of n cubed multiply adds. The method: subtract multiples of each row from the rows below it until the matrix is upper triangular, then solve from the bottom up. The heuristic: before eliminating each column, swap up the row with the largest entry in that column at or below the diagonal, so that every multiplier has size at most one. On this page the pivoted solution is held against exact rational arithmetic, its residual is measured on random systems, the classic two by two that breaks the unpivoted method is solved both ways, and the one matrix that defeats partial pivoting is built and measured too.',
  },
  {
    section: 'origins',
    text:
      'The method is older than Gauss. The Nine Chapters on the Mathematical Art, in China by the second century before the common era, solves systems by exactly this row reduction. Gauss used it in eighteen ten for the normal equations of least squares, and Jordan added the back elimination in eighteen eighty eight. The floating point story begins in nineteen forty seven, when von Neumann and Goldstine analyzed the rounding errors and feared exponential growth. Turing framed the factorization as L U in nineteen forty eight and introduced the condition number. And James Wilkinson, in nineteen sixty one, gave the backward error analysis that settled it: with partial pivoting, the computed solution is exact for a nearby matrix, with the perturbation bounded by the growth factor, which is at most two to the n minus one, a bound his own matrix attains. Trefethen and Schreiber explained in nineteen ninety why that bound is a curiosity: random matrices grow like n to the two thirds. LINPACK in nineteen seventy nine, and LAPACK after it, made partial pivoting the world’s default.',
  },
  {
    section: 'pair',
    text:
      'The algorithm owns the elimination and its cost. For each column, subtract the right multiple of the pivot row from each row below it, then back substitute. Counted: twenty one thousand three hundred twenty, one hundred seventy thousand six hundred forty, and one million three hundred sixty five thousand two hundred eighty multiply adds at sizes forty, eighty, and one hundred sixty, eight times per doubling, the n cubed over three law. Against exact rational elimination on thirty integer systems, the floating point solution agrees to one part in ten to the fourteenth. On random eighty by eighty systems the relative residual is about one part in ten to the sixteenth, the precision of the arithmetic itself. The heuristic supplies the choice of pivot: the largest entry of the column, so that no multiplier exceeds one and no error is amplified row by row. Remove it, and the same code returns zero and one for the two by two whose answer is one and one, dies on a zero pivot, and lets multipliers reach ten thousand on a planted tiny entry, with the residual a thousand times worse. The search costs a quadratic number of comparisons in total: twelve thousand eight hundred eighty at size one hundred sixty, against complete pivoting’s cubic one million three hundred seventy eight thousand. Its known weakness is measured too. Wilkinson’s matrix of order twenty four grows the entries by two to the twenty third, eight million three hundred eighty eight thousand six hundred eight, under partial pivoting, while complete pivoting holds the growth at two. Random eighty by eighty matrices never grew past eight.',
  },
  {
    section: 'picture',
    text:
      'Balancing a ledger by cancelling accounts against each other. Each step picks one account as the reference and uses it to cancel that column from every account below. If the reference account is tiny, cancelling a normal sized entry against it means multiplying the reference by a huge number, and every rounding error in the reference is multiplied by the same huge number before it lands in the accounts below. Do that twenty times and the ledger is noise. Partial pivoting is the bookkeeper’s habit: before each step, swap up the account with the largest entry in the column, so every multiplier is a fraction and no error is ever amplified. It is not perfect. Wilkinson found a ledger where the entries still double at every step, habit or no habit. Nobody has met that ledger by accident.',
  },
  {
    section: 'run',
    text:
      'Here is the run. In column k, find the row at or below the diagonal with the largest entry, and swap it into row k, swapping the right hand side too. For each row below, compute the multiplier, which is now at most one in size, and subtract that multiple of the pivot row. Repeat for every column; the matrix is upper triangular after a third of n cubed multiply adds. Back substitute: the last unknown first, each earlier one from the rows below it. On this page: the two by two with epsilon of ten to the minus seventeen, one and one with pivoting, zero and one without. A system with a zero in the first pivot: solved with pivoting, impossible without. Thirty integer systems: agreement with exact arithmetic to ten to the minus fourteen. Ten random eighty by eighty systems: residual ten to the minus sixteen with pivoting, ten to the minus fourteen without. Wilkinson’s matrix of order twenty four: growth of two to the twenty third under partial pivoting, two under complete pivoting. And the count: eight times more work per doubling of the size.',
  },
  {
    section: 'signals',
    text:
      'The signals that this pair fits. First: a dense square system of moderate size, thousands of unknowns that fit in memory, with one or a few right hand sides. Second: no special structure. Not symmetric positive definite, where Cholesky halves the work and needs no pivoting; not sparse, where an iterative method wins. Third: backward stability is the requirement. The answer must be exact for a matrix within rounding of the one given, which is what Wilkinson’s theorem promises and the residual confirms.',
  },
  {
    section: 'tradeoffs',
    text:
      'Now the rivals. L U decomposition: the same elimination, kept as a product of a permutation, a lower triangular factor, and an upper triangular factor, so that every further right hand side costs n squared instead of n cubed. Identical numerics, identical growth; reach for it when one matrix serves many right hand sides. Cholesky decomposition: half the work and no pivoting at all, provably stable, for symmetric positive definite matrices only. It fails loudly on anything else, and it is the choice for normal equations, covariance matrices, and stiffness matrices. And conjugate gradient: never form the elimination. For large sparse symmetric positive definite systems, a few hundred matrix vector products beat n cubed over three by orders of magnitude. It is iterative, it needs a preconditioner, and its rate is set by the condition number; reach for it when the system is too large to eliminate.',
  },
  {
    section: 'tradeoffs',
    text:
      'The honest weaknesses of the hero. The growth bound is exponential, and the matrix that attains it exists: Wilkinson’s order twenty four matrix grows entries by two to the twenty third under partial pivoting, where complete pivoting holds it at two for a cubic number of comparisons. In practice growth stays small, at most eight on random eighty by eighty matrices here, but an adversary can build the bad case. And a third of n cubed is the whole cost. At ten thousand unknowns that is three hundred billion multiply adds, where sparse and iterative methods take over.',
  },
  {
    section: 'tradeoffs',
    text:
      'And the negative example: Cramer’s rule. The formula every student meets first: each unknown is a ratio of two determinants. By cofactor expansion, a determinant of order n has n factorial terms, so at order twenty four one determinant is twenty four factorial, about six times ten to the twenty third products, and the rule needs twenty five of them, while elimination with partial pivoting finishes in about four thousand six hundred multiply adds with a backward error guarantee. Computing the determinants by elimination instead is possible, and then the rule is just elimination done n plus one times with worse rounding. There is no size at which Cramer’s rule is the right way to solve a system.',
  },
  {
    section: 'code',
    text:
      'The code on this page is one elimination routine with three pivoting strategies, and its referees. The routine takes none, partial, or complete pivoting, counts multiply adds and pivot comparisons, tracks the growth factor, and raises on a zero pivot. An exact solver over rational numbers. A residual function. Wilkinson’s matrix. The self test asserts: agreement with exact arithmetic under one part in ten to the twelfth; residuals under ten to the minus thirteen for partial and complete pivoting; no pivoting failing on a zero pivot and missing the two by two by nearly its whole first component, where pivoting is within ten to the minus fifteen; Wilkinson growth equal to two to the twenty third under partial pivoting and at most two under complete; random growth under fifty; the multiply add count growing between six and a half and eight and a half times per doubling; and complete pivoting’s searches more than twenty times partial’s. When it prints O K, the world’s default linear solver has been checked against exact arithmetic, against its own theorem, and against the one matrix built to break it. The file would fail before it would lie to you.',
  },
];
