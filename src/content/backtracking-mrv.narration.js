// The spoken lesson for puzzle four, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle four: backtracking search, paired with the minimum remaining values heuristic, for Sudoku and constraint grids. Here is the puzzle. You are given a nine by nine Sudoku grid, partly filled. Your task is to complete it so that every row, every column, and every three by three box contains the digits one through nine exactly once, or to prove that no completion exists. The constraint is combinatorial. An open grid offers around fifty empty cells with up to nine choices each, and the naive product of those choices is astronomical. Yet the rules interlock so tightly that most choices are illegal the moment you look closely. The craft is looking closely in the right place.',
  },
  {
    section: 'origins',
    text:
      'Backtracking is one of the oldest ideas in computing. The word was coined by Derrick Lehmer in the nineteen fifties, and the method appears wherever exhaustive search meets structure: the eight queens puzzle, graph coloring, circuit layout. The refinement that concerns us grew up inside constraint satisfaction research in the nineteen sixties and seventies, where researchers noticed that the order in which variables are attempted changes the size of the search tree by orders of magnitude. The rule that emerged, choose the variable with the fewest legal values left, is sometimes called the fail first principle, and it remains the default in industrial constraint solvers to this day.',
  },
  {
    section: 'pair',
    text:
      'The control structure is backtracking, which is depth first trial and error with an undo. Find an empty cell, place a legal digit, and move deeper. When some cell ends up with no legal digit at all, the branch is dead: erase the most recent placement and try its next alternative. The search is complete, meaning it will find a solution if one exists and prove absence if none does. The guiding rule is minimum remaining values: among all empty cells, always work on the one with the fewest legal digits remaining. The logic sounds backwards at first, aim at the hardest cell first, but a cell with one candidate is free, forced progress, and a cell with zero candidates is a dead branch you want to discover now, not after placing twenty more digits on top of the mistake. Fail first, so the undo is one move, not twenty.',
  },
  {
    section: 'picture',
    text:
      'Picture assembling flat pack furniture with a bag of nearly identical screws. The reading order strategy starts at panel one, hole one, and inserts whatever fits, discovering only at panel nine that an early screw sat in the wrong hole, and unscrewing everything back to it. The experienced builder scans the whole project for the hole that accepts exactly one screw type, fastens that one, and rescans. Each forced fastening shrinks the options elsewhere, exposing the next forced hole. When the builder does have to guess, it is a choice between two screws, not nine, and a wrong guess announces itself within a fastening or two. Same screws, same holes, a fraction of the unscrewing.',
  },
  {
    section: 'run',
    text:
      'Here is the loop. First, scan the empty cells and, for each, count its legal digits given the current row, column, and box. Second, select the cell with the minimum remaining values. If any cell counts zero, the branch is already dead: backtrack immediately. Third, place one of the chosen cell’s candidates and push the alternatives onto the undo stack. Fourth, recurse. The placement tightened its row, column, and box, so counts elsewhere drop, often to one, and forced moves cascade. Fifth, on failure, pop the stack: erase the placement, try the next candidate, and when a cell exhausts its candidates, keep unwinding. Sixth, when no empty cell remains, the grid stands complete and verified.',
  },
  {
    section: 'signals',
    text:
      'The signals for this pair. Your problem assigns values to variables under hard interlocking rules, and wants a complete assignment or a proof of impossibility. Legal values per variable are cheap to count. And placements propagate, so each decision tightens its neighbors. Sudoku, timetables, seating charts, register allocation: the same shape. The baseline is the same backtracking in plain reading order, and the gap is not subtle. On the hard grid tested in the solution below, reading order was still unfinished at twenty thousand recursive calls, which is the budget the test actually enforces, while minimum remaining values completed the same grid in four hundred eighty two. On a gentle grid the gap was two hundred one calls against fifty. Worst case both are exponential, order nine to the number of empty cells; the heuristic does not change the ceiling, it changes whether you ever meet it.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength is completeness with early failure. The search misses nothing, proves impossibility when asked, and the fail first rule converts most wrong guesses into shallow, one move detours while forced cascades do the bulk of the grid for free. The weakness is cost per node and the surviving worst case. Recounting candidates at every step is real work per placement, an adversarial grid can still force exponential thrashing, and plain minimum remaining values alone is weaker than the full industrial recipe, which adds constraint propagation, least constraining value ordering, and learned no goods. The heuristic picks where to work; it does not, by itself, shrink what work can exist.',
  },
  {
    section: 'tradeoffs',
    text:
      'Four ways to run the same search sit on the bench, and the numbers separate them harder than intuition would. On one gentle Sudoku with fifty one blanks, every method capped at twenty thousand recursive calls: plain backtracking in reading order solved it in two hundred one calls. Backtracking with minimum remaining values, which is this unit, solved it in fifty. And minimum remaining values combined with constraint propagation solved it in a single call, because once you assign every cell that has only one possible digit, and repeat that to a fixed point, the grid simply falls out with no search at all. That last row is worth sitting with. The puzzle was never actually hard. It only looked hard to a method that refused to look before it leapt.',
  },
  {
    section: 'tradeoffs',
    text:
      'The fourth row is the surprising one, and it is the reason this bench exists. Backtracking that picks a random empty cell instead of the tightest one did not finish inside twenty thousand calls, on the same puzzle that reading order finished in two hundred one. That is at least a hundred times worse than having no heuristic whatsoever. The lesson is sharper than the usual advice to add a heuristic. Reading order is not neutral: consecutive cells share a row and a box, so a contradiction tends to surface within a few placements. Random order destroys that accidental locality and keeps re-deciding loose cells with seven or eight candidates each, opening an astronomically wider tree. A bad ordering is not a small loss against a good one. It is far worse than no ordering at all.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never bring to this problem is generate and test: fill every blank with digits, then check whether the finished grid is legal. With fifty one blanks that is nine raised to the fifty first power, roughly ten to the forty eighth candidate grids, to answer a question that fifty placements settle. And the reason it fails is more instructive than its size. Generate and test checks the constraints only at the very end, which throws away the single most valuable fact about this problem: a contradiction is visible the instant it is created. Every method on this bench, including the worst of them, beats generate and test purely by looking sooner.',
  },
  {
    section: 'code',
    text:
      'The Python solution keeps the board as a flat list of eighty one digits, zero meaning empty. The candidates function collects the digits already used in a cell’s row, column, and box, and returns what survives. The solver gathers the empty cells, selects with min by candidate count when the heuristic is on and the first empty cell when it is off, then tries each candidate: place, recurse, and erase on failure. Completeness lives in that erase line. The file checks itself four ways: the famously anti brute force hard grid must come back solved, every row, column, and box must hold one through nine exactly, the original givens must survive untouched, a contradictory grid must be refused, and the call counters must show the heuristic visiting strictly fewer nodes than reading order. That is the pair. Backtracking guarantees the answer exists in the tree. Minimum remaining values decides which corner of the tree ever needs to exist.',
  },
];
