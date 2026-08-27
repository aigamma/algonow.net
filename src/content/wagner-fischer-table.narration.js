// The spoken lesson for puzzle twenty-five, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle twenty five: the Wagner Fischer algorithm, paired with the prefix to prefix table, for edit distance. Here is the puzzle. You are given two strings. Your task is the minimum number of single character edits, insertions, deletions, and substitutions, that turns one into the other, together with the edit script that witnesses the number. The constraint is about honesty: the script is not optional. A distance you cannot verify is a rumor, so on this page every script produced, by every method, is applied character by character, and it must transform the first string into the second in exactly d operations, or the tests fail.',
  },
  {
    section: 'origins',
    text:
      'This is the most independently discovered algorithm on the site, and the roll call is worth hearing. Vladimir Levenshtein defined the distance in nineteen sixty five, in Soviet coding theory, without an algorithm. Taras Vintsyuk built the dynamic program in nineteen sixty eight, for speech recognition, in Kyiv. Saul Needleman and Christian Wunsch reinvented it in nineteen seventy, for aligning proteins, in a biology journal. And Robert Wagner and Michael Fischer’s nineteen seventy four paper in the Journal of the ACM gave computer science its canonical form and its name. Four fields, four notations, one identical table, and essentially none of them reading the others. The refinements then split by need: Hirschberg squeezed the space to linear in seventy five, Ukkonen banded the work for small distances in eighty five, and Eugene Myers’ nineteen eighty six diff algorithm, the engine inside git diff to this day, races the no substitution variant in time proportional to the distance.',
  },
  {
    section: 'pair',
    text:
      'The control structure owns the lattice. Once a state is chosen, dynamic programming is almost clerical: sweep the table in any order that respects dependencies, fill each cell from its finished neighbors, count the cells. The heuristic chose the state, and the state is everything: D of i and j is the edit distance between the first i characters of s and the first j characters of t. Why prefixes against prefixes? Because any optimal alignment’s last move is one of exactly three things: substitute or match the two final characters, delete the last character of s, or insert the last character of t, and stripping that move lands on a strictly smaller prefix pair. Three moves, three neighbors, diagonal, above, left, take the minimum. That exhaustiveness is the entire correctness proof. Remember Kadane’s lesson from puzzle thirteen: the art of dynamic programming is state design. There, the right state collapsed to a single number. Here the state provably cannot shrink, quadratic is the honest size of the question space, and the mature response is to shrink something else: space, with two rows; work, with the band; or the metric itself, with Myers. Each of those trades is priced in the measurements.',
  },
  {
    section: 'picture',
    text:
      'Picture a proofreader turning one word into another, a finger on each word, working left to right. At every moment the two fingers frame one question: having reconciled this much of my word with that much of yours, what is the cheapest editing history that could have gotten me here? And every answer needs only three earlier answers. The same question one letter back on both fingers, if I keep or swap this character. One letter back on mine only, if I deleted it. One letter back on yours only, if I inserted it. Fill in the whole grid of questions, corner to corner, and the bottom right cell holds the cost of the cheapest full history. Then walk the choices backward, and the history itself replays in front of you: that walk is the edit script.',
  },
  {
    section: 'run',
    text:
      'Here is the loop. First, frame the table: n plus one rows, m plus one columns; row zero and column zero are the trivial histories, all insertions or all deletions, costing their length. Second, fill: each cell is the minimum of the diagonal neighbor plus zero or one, depending on whether the two characters match, the neighbor above plus one for a deletion, and the neighbor to the left plus one for an insertion. Third, read the corner: on this page’s two thousand character pair, distance thirty seven, in exactly three million nine hundred ninety three thousand nine hundred ninety six cell updates, a number the tests assert to the integer, because n m is not approximately the cost, it is the cost. Fourth, backtrace: walk the argmins from the corner to the origin and collect the operations; the tests then apply that script and demand it reconstruct t exactly. Fifth, shrink what your problem allows: keep two rows if only the number matters; use Hirschberg’s halving recursion if the script must survive in linear space; fill only the diagonal band if the distance is known to be small.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, you need the exact distance and the receipt: spell check suggestions, DNA alignments, diff views, fuzzy joins that must justify their matches. Second, the lengths are moderate: n times m is four million cells at two thousand characters, entirely affordable, and ten to the tenth at a hundred thousand, entirely not. Third, listen for the small distance signal: if most pairs you compare are near duplicates, the band does the same exact job in a twenty second of the work here, and Myers’ diff, in its own metric, in a thousandth.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: total, exact, and witnessed. Any two strings whatsoever, the true minimum, the script attached and machine verified, in a cell count you can write on the whiteboard before running anything. No pathological inputs, no lucky ones: the table does not care what the strings look like. And the state design is a template: reweight the three arrows and you have Needleman Wunsch for biology; add gap penalties, affine costs, probabilities, and the whole alignment family unfolds from this one cell. The weakness: the quadratic wall, and it is probably a law of nature. Backurs and Indyk proved in twenty fifteen that a strongly subquadratic edit distance algorithm would break the strong exponential time hypothesis, the standing bedrock assumption of fine grained complexity. So the four million cells here scale to ten billion at a hundred thousand characters by mathematical necessity, not by anyone’s laziness. Every escape trades something real: two rows surrender the script, Hirschberg pays double work, the band demands a small answer, Myers changes what is being counted.',
  },
  {
    section: 'tradeoffs',
    text:
      'Here are the measured numbers, on two strings of two thousand and one thousand nine hundred ninety five characters, forty planted edits, true distance thirty seven. Wagner Fischer, full table: three million nine hundred ninety three thousand nine hundred ninety six cell updates, the same number of cells held, distance and verified script delivered. The two row variant: identical work, three thousand nine hundred ninety two cells held, a thousandth of the memory, and the script is gone, because the rows you would trace back through no longer exist. Hirschberg: eight million forty five thousand nine hundred seventy nine updates, twice the work, and the script comes back at linear space; its script is applied and verified too. The Ukkonen band at k forty five: one hundred seventy nine thousand seven hundred eighty one cells, twenty two times less, exact same answer, because when the distance is small, nothing far from the diagonal can matter. Myers’ diff: three thousand six hundred twenty six steps. Read that again: three orders of magnitude under the table, by racing snakes down matching diagonals: with the honest caveat that it plays a different game, no substitutions, where this pair scores fifty three rather than thirty seven. And the naive recursion, the recurrence without the table: seven hundred ninety seven thousand one hundred sixty one calls, at twelve characters. Three to the n. It is not run at two thousand.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is exactly that last one, and it earns its paragraph because it teaches the deepest idea on the page. The three way recursion is perfectly correct. Its crime is amnesia: it asks the same prefix versus prefix questions over and over, exponentially over, seven hundred ninety seven thousand times at length twelve, where only one hundred sixty nine distinct questions exist. That ratio, four thousand seven hundred to one at length twelve and three to the n forever after, is what the phrase overlapping subproblems actually means. The table is not a cache bolted onto a slow function. The table is the discovery that the question space was tiny all along, and the recursion simply could not see it.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements the whole ledger: the full table with backtrace, the two row variant, Hirschberg’s divide and conquer with offset tracked scripts, the Ukkonen band that honestly answers more than k when the band overflows, Myers’ furthest reaching diff, a separate longest common subsequence program, and the naive recursion with a call counter. The self test asserts, in order: every script transforms s into t in exactly d operations, on three hundred random pairs and the big planted pair, for both the full table and Hirschberg; the distance is a genuine metric, identity, symmetry, and the triangle inequality over two hundred random triples; the indel identity, distance without substitutions equals n plus m minus twice the longest common subsequence, confirmed by three independent programs, the substitution free table, the separate LCS, and Myers; the band agrees with the full table whenever the distance is within k and says so when it is not; the cell count equals n plus one times m plus one, exactly; and the naive recursion agrees where it can breathe while its counter records the exponential price. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
