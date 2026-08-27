// The spoken lesson for puzzle seventy four, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle seventy four: the longest increasing subsequence, paired with patience piles and binary search. Here is the puzzle. A sequence of values arrives in a fixed order: software versions, envelope heights, benchmark scores: and the order is not negotiable. Find the longest strictly increasing subsequence: keep the order, skip freely: reporting both its length and one actual witness. The quadratic dynamic program is the obvious answer, and at ten thousand values its price is forty nine million nine hundred ninety five thousand comparisons. The referees on this page: that same DP on four hundred arrays with every witness verified card by card; full two to the n enumeration on fifty small arrays: the absolute referee: and a duality theorem asserted on every single trial.',
  },
  {
    section: 'origins',
    text:
      'The solitaire is folklore: patience, dealt by bored card players for over a century. Its mathematics is a royal line. Stanislaw Ulam posed the random permutation question in the nineteen sixties: how long is the longest increasing subsequence of a shuffled deck? Hammersley cracked the scaling; Vershik and Kerov, and independently Logan and Shepp, pinned the constant: two root n. And in nineteen ninety nine, Baik, Deift, and Johansson identified the fluctuations around that ceiling as Tracy Widom: the same law that governs the largest eigenvalue of a random matrix. Aldous and Diaconis wrote the survey that walks the whole arc through this very card game: this page measures its first chapter, and its famous constant: ninety three point seven, against the ceiling of one hundred.',
  },
  {
    section: 'pair',
    text:
      'The algorithm owns the one pass deal with binary search. Keep the piles’ top cards: they stay sorted, which is the quiet miracle: so each new value finds its pile by bisection: the leftmost pile whose top is greater than or equal to it: or founds a new pile at the right. One bisect per card: seventy three thousand steps at ten thousand cards, against the DP’s fifty million: six hundred seventy seven times fewer, measured. The heuristic supplies the invariant that turns the pile count into the answer. Every pile is decreasing, top to bottom: you only ever place onto bigger tops: so an increasing subsequence can take at most one card from each pile: LIS at most piles. And every card records a backpointer to the top of the pile on its left: chase those pointers from the last pile and an increasing chain emerges with exactly one card per pile: piles at most LIS. Equality, squeezed from both sides, constructive: asserted on all four hundred arrays with the reconstructed witness checked card by card.',
  },
  {
    section: 'picture',
    text:
      'Picture dealing the array into solitaire. Each card goes onto the leftmost pile whose visible top beats it. A card too big for every top starts a new pile on the right. Now stand back and look at the table. Two facts are visible at once. Each pile only ever decreases: so any climbing subsequence touches each pile at most once: the pile count is a ceiling. And every new pile was forced into existence by a card bigger than all the tops before it: chase that card’s memory leftward, top by top, and it drags a full climbing chain behind it, one card per pile: the pile count is also a floor. Ceiling equals floor. The count is the answer, and the chase is the witness. Deal the cards, and the theorem plays itself.',
  },
  {
    section: 'run',
    text:
      'Here is the run. Deal: bisect the pile tops for the leftmost that fits; land there or found a new pile. Backpoint: the landing card records the current top of the pile to its left: that is the future witness thread, written at deal time for free. Count: the number of piles is the length. Reconstruct: chase backpointers from the last pile’s top: read forward, it is strictly climbing with one card per pile: this page verifies every link. And mind strictness, because it is a production footgun: bisect left gives strictly increasing; bisect right gives non decreasing: on data with ties the two silently disagree, which is why the heavy tie arrays are in the referee set.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, the order is fixed but selection is free: versions that must move forward, envelopes that must nest, builds that must improve: keep the sequence, skip the rest: that shape is this problem wearing work clothes. Second, n is past a few thousand: the quadratic table dies around ten to the fifth, where n log n strolls: six hundred seventy seven to one at ten thousand, measured here. Third, two dimensional dominance in disguise: sort one axis, break ties descending, and run LIS on the other axis: the envelope client on this page, and half of the hard interview questions ever asked.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: six hundred seventy seven times measured, the witness free, and theorems living in the machinery. DP matched on four hundred arrays with every witness verified strictly increasing and index ordered. The absolute referee: full enumeration: on fifty arrays. The pile duality asserted every trial, and with it Erdos Szekeres: LIS times LDS is at least n, because the piles themselves are decreasing subsequences covering the array. And Ulam’s constant measured: the mean longest increasing subsequence of a random twenty five hundred permutation came out at ninety three point seven against the two root n ceiling of one hundred: the shave below the ceiling is Tracy Widom sized, and a card game computed it. The weakness: subsequence only, strictness is a footgun, and the piles forget everything else. Contiguous runs belong to the live Kadane unit. The bisect left versus bisect right choice flips answers on tied data. And the tops array keeps only what one witness needs: counting all optimal subsequences, or weighting elements, sends you back to the DP or to the Fenwick indexed variant.',
  },
  {
    section: 'tradeoffs',
    text:
      'The rivals, honestly placed. The quadratic DP: best at i equals one plus the best over smaller valued predecessors: transparent, endlessly adaptable: counting, weights, printing all optima: and this page’s referee at scale: its only sin is the fifty million comparisons. The Fenwick indexed variant: the live Fenwick tree unit’s machinery pointed at this problem: compress the values, take prefix maxima over the tree: the same n log n bound, and the richer questions: weighted LIS, number of LIS, updates: come naturally: the piles’ big sibling, worth the machinery exactly when the question mutates. And Kadane, live one shelf over: the contiguous cousin: when gaps are forbidden, one pass and two variables end the conversation: and the two problems are the classic confusion: read the statement twice: chains skip, runs do not.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is the quadratic DP past ten thousand, and the trap is that it is correct. It is the first solution every candidate writes, it passes every test, and at ten thousand values it spends forty nine million nine hundred ninety five thousand comparisons where the piles spend seventy three thousand. The failure mode is sneakier than slowness: this problem hides inside production systems wearing other names: the longest chain of nested boxes, the longest run of improving builds, the deepest schedulable upgrade path: where n is the row count of a database table, not the length of an interview array. A correct quadratic quietly becomes the pipeline’s dominant cost, and nobody suspects the six line classic. The tell is the shape: order fixed, selection free. The fix is a deck of cards and a bisect: same answer, same witness, six hundred seventy seven times faster, measured. Keep the DP for what it is on this page: the referee, and the flexible form for when the question grows.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements the patience deal with binary search, backpointers, and witness reconstruction: plus the quadratic DP referee, the full enumeration referee, the actual piles for the duality assertions, and the envelope client. The self test asserts, in order: four hundred arrays equal to the DP, heavy tie cases included, with every witness verified strictly increasing and index ordered. Fifty arrays equal to full enumeration. On every trial: pile count equal to the length, every pile decreasing, and LIS times LDS at least n. The op meter at ten thousand: seventy three thousand eight hundred ninety seven against forty nine million nine hundred ninety five thousand. Ulam’s constant: mean ninety three point seven over two hundred random permutations, inside its known window below one hundred. And the envelope client: two hundred envelopes, a nesting chain of twenty three, verified pair by pair and matched against the two dimensional DP. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
