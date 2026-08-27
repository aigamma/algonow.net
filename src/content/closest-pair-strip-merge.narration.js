// The spoken lesson for puzzle forty one, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle forty one: closest pair divide and conquer, paired with the midline strip merge, for the closest pair of points. Here is the puzzle. You hold n points in the plane. Find the two that are closest together, in n log n time. The definition compares every pair: at one hundred thousand points, that is four billion, nine hundred ninety nine million, nine hundred fifty thousand distances: about an hour on this machine, stated and deliberately not run. The entire page hangs on one packing fact, and the page counts it instead of citing it: no strip point ever needed more than seven successor checks, asserted on every strip of every run.',
  },
  {
    section: 'origins',
    text:
      'Shamos and Hoey’s nineteen seventy five paper, Closest Point Problems, is the founding document of computational geometry, and the closest pair was its flagship: the first n log n bound for a problem the whole world solved quadratically. The divide and conquer with the strip argument became the textbook exhibit for a deep habit of thought: the merge step is where the theorem lives. Michael Rabin’s nineteen seventy six randomized grid version, expected linear time, was among the first randomized algorithms ever published: the same Rabin whose primality witnesses appeared five puzzles ago. And the plane sweep variant became the practical workhorse. All three run on this page, referee one another at one hundred thousand points, and split the honors in ways worth hearing carefully.',
  },
  {
    section: 'pair',
    text:
      'The control structure owns the recursion. Split the points at the median x coordinate, solve each half, and let delta be the better of the two answers. That alone misses exactly one family of pairs: the pairs that straddle the midline: and it also bounds where they can hide: both endpoints within delta of the line, a strip two delta wide. The structure is embarrassingly parallel, the halves never speak, and its worst case is a theorem about every input rather than an expectation. The heuristic supplies the packing bound that makes the strip cheap. Inside the strip, sorted by y, each point needs comparing to at most seven successors, because a delta by two delta rectangle cannot contain eight points that are pairwise delta apart, and each half’s points already are. The quadratic looking strip check is linear, the recurrence closes at n log n, and the page counts the constant live: the observed maximum was two on uniform data, one on the collinear stress, and the bound of seven is asserted on every strip point of every run.',
  },
  {
    section: 'picture',
    text:
      'Picture two search parties combing the west and east halves of a field for the closest pair of mushrooms, then meeting at the fence. They do not need to re search the field together. Any cross fence pair that beats both parties’ finds must have both mushrooms within delta of the fence: a narrow corridor. And inside the corridor, each mushroom needs checking against only a handful of corridor neighbors near its own height, because mushrooms on the same side of the fence already keep their distance from each other. The corridor check is a formality with a constant inside it. That constant, seven, is the entire difference between n squared and n log n.',
  },
  {
    section: 'run',
    text:
      'Here is the loop. Sort once by x, and carry a y sorted copy down the recursion: that carried copy is the merge in the name, and it is what keeps each level linear. Split at the median x and recurse into both halves; delta is the better of their two answers. Build the strip: the points within delta of the midline, already in y order because the carried copy was. Scan upward: compare each strip point to its successors until the y gap alone reaches delta: at most seven comparisons, asserted as the loop runs. Return the minimum of left, right, and strip. The recurrence, two subproblems at half size plus linear merge, closes at n log n: measured here as one hundred forty two thousand distances where the definition demanded five billion.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, you want a worst case guarantee: the bound holds for every input shape, no randomness, no luck: the collinear stress, where the strip is the entire point set, is the demonstration, and it held at sixteen thousand distances. Second, the structure must parallelize or generalize: the halves are independent, map reduce shaped, and the same recursion lifts to three dimensions and beyond, where sweep lines get complicated. Third, you are learning or teaching divide and conquer: this is the canonical example that the conquer step, not the split, is where the theorems live.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: a worst case theorem with a measured constant. One hundred forty two thousand, six hundred fourteen distances instead of five billion: thirty five thousand fold fewer. The packing bound asserted on every strip point, with an observed maximum of two. Deterministic for every shape, including the adversary built to flood the strip. And a structure that parallelizes today and generalizes to higher dimensions tomorrow. The weakness, said plainly because the measurements said it plainly: on friendly ground, the rivals are faster. The plane sweep finished in six hundredths of a second to the recursion’s forty one hundredths; Rabin’s grid matched the recursion’s time with only seventy distances computed. And the recursion’s own bill is real: the y sorted partition it performs at every level is most of its running time. The classroom champion pays rent in practice, and this site’s job is to say so with numbers.',
  },
  {
    section: 'tradeoffs',
    text:
      'Here are the measured numbers, at one hundred thousand uniform points, with all three fast methods agreeing to one part in a billion. Brute force: five billion distances, stated, roughly an hour, not run. Divide and conquer with the strip: one hundred forty two thousand distances, forty one hundredths of a second, strip maximum two of the lemma’s permitted seven. The plane sweep: twenty one distances, six hundredths of a second. Rabin’s randomized grid: seventy distances, forty hundredths, with twenty six grid rebuilds. And two honest surprises, kept because the site keeps what it measures. First, the metric lesson: distance counts alone would crown the sweep six thousand fold, but its true bill hides in window upkeep that the distance counter never sees: count the currency the machine actually spends. Second, the collinear adversary built to flood the recursion’s strip was expected to also punish the sweep’s window, and instead helped it: identical x coordinates arrive already sorted by y, so every window insertion is an append. The measurement corrected the prediction, and the correction is on the page.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is the double loop past its crossover, and the subtlety runs in both directions. Five billion distances at one hundred thousand points is an hour of machine time for an answer three methods delivered in under half a second, each checked against the others to nine decimal places. But below roughly a hundred points, the double loop wins outright: better constants, no bookkeeping, total clarity: and this page’s own referee IS the double loop, run five hundred times at small sizes across four hostile shapes, including clusters, collinear lines, and duplicate points at distance zero. The crime is never the tool. The crime is ignoring the crossover. Quadratic cost earns two orders of magnitude of pain for every factor of ten of growth, and the day your point set graduates from hundreds to hundreds of thousands, the double loop graduates from referee to liability.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements the recursion with the carried y sorted copy and a strip statistics hook, the plane sweep with amortized x ordered eviction and a bisected y window, Rabin’s randomized grid with rebuild counting, and the brute force referee. The self test asserts, in order: all three fast methods agree with brute force on five hundred small instances spanning uniform, clustered, collinear, and duplicate heavy shapes, the last of which includes closest distances of exactly zero. All three agree mutually at one hundred thousand points, to one part in a billion. The packing lemma’s bound of seven successor checks is asserted inline on every strip point of every recursion of every run, with the observed maxima printed. And the collinear stress holds the recursion to n log n territory while the lemma’s counter reads one. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
