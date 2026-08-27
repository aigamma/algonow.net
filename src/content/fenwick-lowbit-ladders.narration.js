// The spoken lesson for puzzle twenty-six, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle twenty six: the Fenwick tree, paired with low bit ladders, for prefix sums under change. Here is the puzzle. You hold an array of n numbers that keeps changing, and a stream of questions arrives interleaved with the changes: what is the sum of the first i elements; now add delta to element j; now another sum. Your task is to answer every query and absorb every update, both in logarithmic time. And notice why the word both carries the problem: pure reads have a perfect answer, cumulative sums, one touch per query forever; pure writes have a trivial one, the raw array. The mixed stream is where each of those detonates, and the measurements will show exactly how.',
  },
  {
    section: 'origins',
    text:
      'Peter Fenwick published the structure in nineteen ninety four, in Auckland, and his motivating application closes a loop on this very site: he needed cumulative frequency tables for arithmetic coding, the fractional bit entropy coder of puzzle fourteen, whose statistical model must bump one symbol’s count and query cumulative counts on every single symbol it codes. A structure that does both in logarithmic time is that coder’s engine room. Boris Ryabko had described an equivalent structure in nineteen eighty nine, in Russian, so the idea carries the familiar pattern of this site’s history sections: found independently, then canonized under one name. Competitive programmers adopted the twelve line implementation as a signature move, and it works today inside coder models, inversion counting, and order statistic tricks everywhere.',
  },
  {
    section: 'pair',
    text:
      'The control structure owns a tree that does not exist. There are no nodes and no pointers: just one array, one indexed, where cell i is responsible for a block of the input, queries descend from responsible cell to responsible cell summing disjoint blocks, and updates climb to every cell whose block contains the changed position. The tested solution asserts the ownership invariant, cell i holds exactly the sum of its block, for every single cell, after hundreds of random updates. The heuristic is what makes the phantom tree navigable: low bit of i, computed as i AND minus i, the lowest set bit of the index, a gift of two’s complement arithmetic. Cell i owns the block of length low bit of i ending at i. A prefix query runs i minus equals low bit of i: that walk peels the index’s binary expansion into blocks, thirteen is eight plus four plus one, so prefix of thirteen is exactly three touches, and the blocks are disjoint and tile the prefix perfectly. An update runs i plus equals low bit of i, climbing through every owner. One bit trick is the entire routing table, and the worst walk measured on one hundred thousand cells is fifteen touches.',
  },
  {
    section: 'picture',
    text:
      'Picture a relay of tally clerks. The clerk at desk eight keeps the running total of desks one through eight. The clerk at desk twelve keeps nine through twelve. The clerk at desk thirteen keeps only desk thirteen. When someone asks for the total of the first thirteen desks, you visit exactly the clerks whose districts tile that range: eight, twelve, thirteen. Three visits, three numbers, done. When desk thirteen’s figure changes, you notify only the clerks whose districts contain it: a short climb through ever larger districts. And here is the beautiful part: nobody ever wrote down which clerk covers what. The coverage map is encoded in the desk numbers themselves, in binary, and the low bit operation reads it off.',
  },
  {
    section: 'run',
    text:
      'Here is the loop. First, the storage rule: tree at i equals the sum of the block of length low bit of i ending at position i, one indexed, because the bit tricks genuinely require it. Second, to query the prefix up to i: while i is positive, add tree of i, then subtract low bit of i from i. The cells visited correspond to the set bits of i, so the touch count is the popcount, at most log n. Third, to update position i by delta: while i is at most n, add delta to tree of i, then add low bit of i to i, correcting every block that contains the position and no others. Fourth, range sums come from two prefixes: sum from l to r equals prefix of r minus prefix of l, and notice that subtraction is doing real work in that sentence; hold the thought for the trade offs. Fifth, the bound: both walks touch at most ceiling log two of n plus one cells, and the tested solution asserts that as a maximum over thousands of operations, not an average: worst observed, fifteen.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, the workload is genuinely mixed: point updates and prefix or range sums, interleaved, with neither side ignorable. Second, your aggregate has an inverse: sums, counts, exclusive ors. The range from prefixes trick runs on subtraction, and the never here section proves what happens when the operation has none. Third, memory and constants matter: one array of n cells, no pointers, sequential-ish strides, half the segment tree’s footprint and, measured here, half its touches. When any signal fails, the bench has the right neighbor: the segment tree for generality, square root blocks for write heavy streams, and plain cumulative sums for data that never changes.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: twelve lines, n cells, fifteen touches. On the mixed workload it is the outright winner at thirty four thousand nine hundred six touches, half the segment tree’s count, a hundred twenty eighth of the rebuild strategy’s. The logarithmic promise is asserted as a maximum. Updates are perfectly reversible, and the tests apply five hundred edits, revert them, and demand every prefix return to its baseline, exactly. The weakness: it needs subtraction, and it shows its bits. Non invertible aggregates, minimum, maximum, are structurally out of reach, not awkwardly but provably, as the never here demonstrates. Lazy range updates belong to the segment tree, though a classic dual tree trick buys range add point query. And the one indexed bit gymnastics sit one desk away from the off by one museum of puzzle twenty two: the same care applies.',
  },
  {
    section: 'tradeoffs',
    text:
      'Here are the measured numbers, at n three thousand, counting cells touched. Workload one, the mixed stream: three thousand point updates interleaved with three thousand prefix queries. Fenwick: thirty four thousand nine hundred six. The cumulative sum array: four million four hundred seventy three thousand three hundred sixty three, because every update rebuilds the tail behind it: one hundred twenty eight times worse. The segment tree: sixty eight thousand four hundred forty four, roughly double Fenwick on account of touching a parent chain plus siblings. Square root decomposition: one hundred sixty seven thousand six hundred sixty three, cheap writes, expensive reads. Workload two, the static stream: build once, then one hundred thousand queries and not a single update. The cumulative array: one hundred thousand touches, one per query, unbeatable and unbothered. Fenwick: five hundred sixty thousand nine hundred eighteen, five point six times more, because even a lovely logarithm loses to a constant. The strategy sentence writes itself, and it echoes half the units on this site: if it never changes, precompute; if it churns, build the ladder; and the crossover between those regimes is a measurement, not an opinion.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is prefix trickery for range minimum, and the reason deserves its precision: it is not hard, it is impossible, and the tests prove impossibility the honest way, with two witnesses. The arrays one, five, nine and one, seven, nine have identical prefix minimum sequences: one, one, one. Yet the minimum of just the middle element is five in the first and seven in the second. Two inputs, same prefix data, different answers: therefore no function of prefix minima, however clever, can answer range minimum. Nothing was lost by bad engineering; the information was never there, because min has no subtraction. The lesson generalizes into a reflex worth keeping: when your aggregate loses its inverse, change data structures, not code. Segment trees hold that territory, and for static data, sparse tables answer range minimum in constant time. Knowing which algebra your operation lives in is the whole decision.',
  },
  {
    section: 'code',
    text:
      'The Python solution is small enough to read in one sitting, which is much of the point: the Fenwick tree is genuinely twelve lines, beside a cumulative sum array, an iterative segment tree, and square root blocks, all instrumented with the same touch counter. The self test asserts, in order: the low bit identity itself, i AND minus i equals the lowest set bit, across four thousand ninety six integers; the ownership invariant for every cell after random updates, which is the meaning of the ladder checked rather than assumed; agreement of all four structures with a brute force referee across three thousand interleaved operations, range sums included; the logarithmic bound as a maximum, worst walk fifteen touches at one hundred thousand cells; perfect reversibility, five hundred edits applied and undone with every prefix restored; and the two witness impossibility proof for range minimum from prefixes. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
