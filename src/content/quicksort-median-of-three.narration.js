// The spoken lesson for puzzle ten, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle ten: quicksort, paired with the median of three pivot rule, for sorting an array in place. Here is the puzzle. You are given an array of n keys, and the only thing you may do with two keys is ask which one is smaller. No digits, no buckets, no arithmetic on the keys, just less than. Your task is to rearrange the array into nondecreasing order, in place. In place is the constraint that gives the problem its teeth: you get the array itself plus a logarithmic sliver of bookkeeping. There is no second array to copy into. The memory you were handed is the memory you get.',
  },
  {
    section: 'origins',
    text:
      'Tony Hoare invented quicksort in nineteen sixty, at age twenty six, while an exchange student at Moscow State University. He was working on machine translation, and he needed to sort the words of a Russian sentence before looking each one up on a dictionary tape. He worked out the partition idea, and then found he could not express the recursion in any language he had; the algorithm waited until ALGOL sixty existed to hold it, and he published it in nineteen sixty one and sixty two. The pivot rule then spent decades in refinement. Robert Singleton proposed sampling the first, middle, and last keys in nineteen sixty nine. Robert Sedgewick’s analysis in nineteen seventy eight made median of three the standard recipe. David Musser bolted on the worst case escape hatch called introsort in nineteen ninety seven. And in nineteen ninety nine, Doug McIlroy published a beautiful adversary program that explains, by construction, why the escape hatch earns its keep. Every one of those characters appears in this unit’s measurements.',
  },
  {
    section: 'pair',
    text:
      'The control structure owns the scheme. Pick a pivot. Sweep the range once, moving everything smaller than the pivot to its left and everything larger to its right. The pivot lands in its final sorted position and never moves again. Recurse on the left part, recurse on the right part, done. Correctness never depends on which pivot you picked. Any pivot sorts. The heuristic decides something different: the shape of the recursion. Pivot near the median and the range halves each time: log n levels, n work per level, n log n total. Pivot near the minimum and each expensive sweep retires exactly one element: n levels, n squared over two total. Median of three samples the first, middle, and last keys of the range and pivots on their median. That costs two or three comparisons per partition, and it buys two things. The cliffs vanish: sorted input, reverse sorted input, organ pipe input, all of the natural killers hand the middle sample a decent pivot. And the average improves a little, because a sampled pivot splits closer to the middle than a blind one.',
  },
  {
    section: 'picture',
    text:
      'Picture a moving crew sorting boxes by weight. The method is to pick one reference box, then walk the row once: lighter boxes go to its left, heavier boxes to its right, and when the walk ends, the reference box is sitting exactly where it belongs in the finished row. The whole game is which box you grab as the reference. Suppose the truck arrived nearly ordered, and you always grab the first box. That is the lightest box in the row. You walk the entire row, everything ends up on one side, and your reward for the full walk is that a single box is placed. Now instead, weigh three boxes: the one at the front, the one in the middle, the one at the back. Take the middle weight as your reference. The row now splits nearly in half, every time, including on the truck that arrived in order. Three cheap weighings buy a balanced day.',
  },
  {
    section: 'run',
    text:
      'Here is the loop. First, sample the first, middle, and last keys of the current range, and let the pivot be the median of the three. Park the pivot at the end of the range. Second, sweep an index j across the range, holding a boundary index i. Every time the key at j is smaller than the pivot, swap it down to the boundary and advance the boundary. Third, when the sweep ends, swap the pivot into the boundary position. It is now in its final place, and it will never move again. Fourth, recurse on the range to its left and the range to its right; an explicit stack does the same job as recursion and does not care how lopsided the splits get. Fifth, stop when ranges reach size one. Every key either served as a pivot or ended as a singleton, so the array is sorted, in place.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, memory is the constraint: you must sort inside the array you were handed, not beside it. Second, average speed matters more than a worst case guarantee: no adversary is choosing your input, and no hard latency promise rides on this one sort. Third, the keys live in contiguous memory, because the partition sweep is a single forward pass, and that streaming access pattern is where quicksort’s wall clock reputation actually comes from. If stability is promised, if an adversary is real, or if the data is already mostly ordered and you want to exploit that, the trade offs section names the right rival for each.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: in place and cache straight. The sweep touches memory forward and sequentially, the pivot retires into its final home on every pass, and there is no second array anywhere. That is why quicksort is the fastest practical sort on real hardware at equal, or even slightly worse, comparison counts, and why it is the skeleton inside most standard libraries. The weakness: the ghost is defended, not exorcised. Median of three kills the natural cliffs, but a true adversary walks around the defense, and equal keys come out reordered: quicksort is unstable, and the tested solution pins that with a concrete case rather than an adjective.',
  },
  {
    section: 'tradeoffs',
    text:
      'Here are the measured numbers, on two thousand forty eight distinct keys, counting comparisons, because comparisons are the one currency every method on the bench spends. On a seeded shuffle: quicksort with median of three, twenty four thousand three hundred three. Quicksort with the naive first element pivot, twenty three thousand nine hundred thirty seven, essentially identical, and that matters: on chaotic input the naive rule is fine. Mergesort, nineteen thousand nine hundred fifty five, the fewest on the board. Heapsort, thirty eight thousand seven hundred fourteen, roughly double. Timsort, nineteen thousand eight hundred forty one. Now hand every method the already sorted array. Median of three: twenty thousand four hundred ninety three, a touch cheaper than the shuffle. The first element pivot: two million ninety six thousand one hundred twenty eight. That is n squared over two, exactly, the staircase shape, on the most ordinary structured input production ever serves: data that is already mostly in order. Timsort reads the sorted array in two thousand forty seven comparisons, one look per adjacent pair, because its whole design is to find the order already present. And mergesort drops to eleven thousand two hundred sixty four, since every merge finds one side exhausted early.',
  },
  {
    section: 'tradeoffs',
    text:
      'Now the adversary column, because sorted input is not the worst case, it is only the most common one. McIlroy’s killer answers each comparison lazily, as unhelpfully as consistency allows, so whatever key the sort pivots on turns out to be nearly the smallest of its range. Against it, median of three collapses to one million fifty thousand six hundred twenty four comparisons: quadratic, forty three times its shuffled cost. The defense was against nature, not against malice. Introsort is the engineered answer. It runs exactly this unit’s quicksort, and its shuffled and sorted numbers are identical to ours, but it carries a depth budget of twice log n, and when the recursion spends it, the offending range is handed to heapsort. Against the same killer: eighty one thousand six hundred eighty five, a thirteen fold rescue, with the worst case signed and bounded. Mergesort, heapsort, and Timsort do not care about the adversary at all, and the reason is worth saying precisely: the killer hunts pivot choices, and they have none to hunt. Their comparison counts are bounded by their structure, not by the answers they receive.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never bring to this problem is radix sort, and the reason is a contract, not a speed. Radix sort does not compare keys; it spreads them into buckets digit by digit. This puzzle hands you opaque keys and a less than test, and nothing else. Radix sort cannot take its first step under that contract, because there are no digits to spread by. But hold the lesson from the other side too: the moment your keys are millions of fixed width integers, the contract changes, the digits exist, and radix sort beats every method on this bench by refusing to play the comparison game at all. Wrong contract, wrong tool. Right contract, unbeatable. Knowing which contract you are actually under is the whole skill.',
  },
  {
    section: 'code',
    text:
      'The Python solution carries all six methods: quicksort under both pivot rules, written iteratively so the degenerate recursions this page demonstrates cannot overflow a stack, mergesort, heapsort, introsort with its depth budget, and Timsort itself, which is Python’s own list sort, wrapped so its comparisons pay into the same counter as everyone else. McIlroy’s adversary is fifteen lines: keys start as gas, and whenever two gas keys are compared, the current pivot candidate freezes to the next solid value, so the sort’s own choices become the worst input. The self test asserts six things. Every method agrees with Python’s sorted on two hundred six cases, duplicates and edge cases included. Mergesort and Timsort keep equal keys in their original order, and quicksort provably does not, pinned on a concrete case. On sorted input the naive pivot pays at least n squared over four while median of three stays under two n log n. The killer drives both quicksorts quadratic. The depth cutoff holds introsort under six n log n against the same killer. And Timsort reads sorted input in exactly n minus one comparisons. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
