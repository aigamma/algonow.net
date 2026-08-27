// The spoken lesson for puzzle thirty five, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle thirty five: the segment tree, paired with lazy propagation, for array range queries. Here is the puzzle. An array of n numbers receives a stream of interleaved operations: add a value to every element in a range, and report the sum over a range, both in logarithmic time. The mix is the hard part. Reads alone have a cheap classical answer in prefix sums. Writes alone have one too, in difference arrays. A workload that interleaves them breaks each half solution, and the naive array pays the full bill: two thousand four hundred eighty one element touches per operation, measured on this page.',
  },
  {
    section: 'origins',
    text:
      'Segment trees entered the literature sideways, through computational geometry: Jon Bentley built them in nineteen seventy seven to answer which rectangles cover a query point, and the textbook treatment still lives in the geometry canon. Competitive programming then adopted the structure as its universal workhorse, and in the two thousands the community folklore engineered the piece that geometry never needed: lazy propagation, the debt trick that makes range writes as cheap as range reads. The pattern itself is older than the name. Write back caches park dirty lines until eviction. Databases buffer writes and flush on read. A landlord posts one notice in the lobby instead of knocking on every door. Park the work where it falls; pay it on the next visit.',
  },
  {
    section: 'pair',
    text:
      'The control structure owns the canonical decomposition. Build a binary tree over the array, each node holding the sum of its interval. Any range from l to r then splits into at most two log n cover nodes: nodes whose interval lies wholly inside the range. A range read collects the covers and is done: forty seven node visits per operation, measured, against the naive array’s two thousand four hundred eighty one. But the tree alone only reads fast. A range write would still walk down to every leaf underneath. The heuristic supplies the debt. A range write stops at the very same cover nodes and stamps the update there as a lazy tag, meaning: this much is owed to everything below. The node’s own sum adjusts immediately, and the write goes home. The tag descends one level only when a later operation actually walks through. Nobody below ever learns of an update nobody asked about. The eager tree that refuses this debt pays eighty one times more, measured. And the trick is algebra generic: this same page runs it over minimum instead of sum, checked against a referee, which is the door the leaner Fenwick identity cannot walk through.',
  },
  {
    section: 'picture',
    text:
      'Picture a landlord raising rent on a whole tower. The landlord does not knock on every door. One notice goes up in the lobby, and the building’s master ledger updates on the spot. The tenant on the fourteenth floor learns the new number only when they next walk through the lobby, and the notice follows them upward, floor by floor, exactly as far as anyone actually walks, and no further. The lobby notice is the lazy tag. Carrying it one floor up on your way through is propagation. And the eager landlord who really does knock on every one of a thousand doors, personally, through the stairwell, is the measured eighty one times on this page.',
  },
  {
    section: 'run',
    text:
      'Here is the loop. Build once: a complete binary tree over the array, each node storing its interval’s sum. To write, descend from the root: a node wholly inside the target range is a cover: adjust its sum by the value times its width, stamp the lazy tag, and stop descending there. A node partially overlapping is a corridor: before walking through it, push: hand its tag to both children, applying to their sums and merging into their tags, then clear it. To read, descend exactly the same way, summing the cover nodes you meet. And when the question changes, change the algebra, not the structure: minimum, maximum, assignment, affine updates: any monoid with composable tags. The minimum variant runs on this page against a brute force referee, as evidence that the generality is real rather than advertised.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, reads and writes both span ranges: interval bookings, brightness adjustments across image rows, add a bonus to this whole team then audit that department. The mixed workload is exactly the one with no half price shortcut. Second, the question may change under you: today a sum, tomorrow a minimum or an overwrite. Lazy tags compose across monoids; the Fenwick identity is welded to sums. Third, the workload is online: answers needed now, in arrival order. The offline tricks that reorder queries, like Mo’s algorithm, are off the table when the stream will not wait.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: both directions logarithmic, any monoid, online. Forty seven visits per operation against two thousand four hundred eighty one naive, a fifty three fold saving. The minimum algebra variant referee checked. Full range operations touching literally one node: the root. This is the structure competitive programmers reach for by reflex, because it bends to the problem rather than demanding the problem bend to it. The weakness: constants, memory, and code weight, each measured or counted honestly. On its home algebra, the Fenwick two tree identity is leaner: twenty seven visits to forty seven, in a third of the code. The tree spends about four n nodes plus a tag array. The recursion is real. Lazy composition rules for richer updates, assignment mixed with addition, are a classic source of subtle bugs. And below the crossover, around a hundred elements, the naive array simply wins: every clever structure pays constants the flat loop does not.',
  },
  {
    section: 'tradeoffs',
    text:
      'Here are the measured numbers: ten thousand elements, two thousand interleaved operations averaging a span of two thousand four hundred eighty, every query answer identical across all structures, and the naive bill checked to the element against the summed spans. The naive array: four million, nine hundred sixty one thousand, five hundred fifty four visits: one per element touched, by definition. Square root decomposition: two hundred forty four thousand visits, one hundred twenty two per operation: twenty times better, from twenty lines with no recursion. The segment tree with lazy propagation: ninety four thousand four hundred visits, forty seven per operation: fifty three times better, and the only row that also serves minimum, maximum, and assignment. And the Fenwick two tree identity: fifty three thousand two hundred twenty visits, twenty seven per operation: ninety three times better, the leanest correct run on this workload. Read the last two rows together, because they are this site’s favorite kind of honesty: the specialist beats the generalist on the specialist’s home ground, by almost a factor of two. You choose the generalist for the day the question changes.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is the eager tree: the same segment tree, refusing the debt. A range write becomes one point update per element, each walking a full root to leaf path, so a span of a thousand costs about ten thousand node visits, through the very structure that was supposed to save work. Measured: one million, two hundred ninety seven thousand, seventy five visits, where the lazy tree spent fifteen thousand nine hundred eighty four. Eighty one times worse, and notice: worse than owning no tree at all, since the naive flat loop would have touched each element once instead of log n times. The lesson generalizes into a sentence worth keeping: a structure’s asymptotics apply only to the operations it was designed for. Wrap the right structure around the wrong access pattern, and your logarithmic tool quietly goes quadratic in production, while the dashboards insist you did everything right.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements five structures behind one operation interface: the lazy segment tree with visit counters, the eager tree that refuses the debt, the minimum monoid lazy tree, the Fenwick two tree identity, square root decomposition with per block pending adds, and the naive array as referee. The self test asserts, in order: all structures agree with the brute force referee on every query across two thousand mixed operations with deliberate edge cases, full range, single element, both boundaries. The minimum tree agrees with an element wise shadow over a thousand operations. On the big ledger, every structure reproduces the naive answers exactly, the naive bill equals the summed spans to the element, the lazy tree stays inside its four log n plus two per operation bound, and the square root blocks stay inside theirs. And the eager tree is certified to pay at least twenty times the lazy bill, measured at eighty one. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
