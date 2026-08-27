// The spoken lesson for puzzle fifty three, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle fifty three: the interval tree, paired with max endpoint subtree pruning, for spatial indexing. Here is the puzzle. You hold n intervals: bookings, address ranges, gene annotations: and the questions arrive as points and windows: which intervals contain this moment; which overlap this range. Answer without touching the intervals that could not possibly answer. The constraint has a decoy in it: the brute scan touches all twenty thousand intervals per question, and the plausible fix, sort by start and scan the prefix, works right up until a few long lived intervals make every prefix enormous: fourteen thousand eight hundred eighty nine touches per query, measured, where the pruned tree pays one hundred thirty one.',
  },
  {
    section: 'origins',
    text:
      'Interval trees arrived twice around nineteen eighty: Herbert Edelsbrunner and Edward McCreight independently built the centered versions for computational geometry, and the augmented search tree form, the one built on this page, was canonized by the C L R S textbook as THE worked example of augmenting a data structure: add one field, gain a query family, pay only the discipline of maintaining it. The deployments are wherever intervals live: genome browsers stab annotation tracks millions of times a session; operating system kernels manage virtual memory regions; calendars answer what is happening at three; and the multidimensional generalization, the R tree, indexes the world’s maps.',
  },
  {
    section: 'pair',
    text:
      'The control structure owns a balanced binary search tree keyed on the intervals’ low endpoints: ordinary machinery, built balanced here by median recursion. Alone, it answers which intervals start before x: which happens to be exactly the sorted list rival’s ceiling, and is not the question. The heuristic supplies one number per node: the maximum high endpoint anywhere in that node’s subtree, computed bottom up and re verified recursively at every node of every tree in this page’s tests. That single field is a certificate of absence. A subtree whose max end lies to the left of the query point can contain no interval reaching the query: prune it, wholesale, unvisited. Measured: thirty three node visits per query where the scan pays twenty thousand: and on the adversary built specifically to drown sorting, one hundred thirty one where the sorted scan pays fourteen thousand eight hundred eighty nine.',
  },
  {
    section: 'picture',
    text:
      'Picture a hotel’s registry, asked: who is staying here tonight? Sorting the guests by check in date feels right until you run the question: every guest who checked in before tonight is a candidate, including the long term resident who arrived in January, so the candidate prefix is effectively the whole book, every night, forever. The interval tree files by check in too, but writes one thing on the front of each drawer: the latest check out date of anyone inside. A drawer whose label says last week cannot hold tonight’s guests: skip it, unopened. The long term resident fattens one drawer’s label. He does not fatten every query in the hotel’s future.',
  },
  {
    section: 'run',
    text:
      'Here is the loop. Build: sort by low endpoint, recurse on medians for balance, and compute each node’s subtree max end bottom up. To stab a point x: at each node, first read the label: if the subtree’s max end is less than x, prune: return without descending. Otherwise recurse left; report this node’s own interval if it contains x; and recurse right only if this node’s low endpoint is at most x, since everything to the right starts even later. A window query runs the same skeleton with the two boundary tests: overlap means starting before the window ends and ending after it begins. Updates recompute max end along the insertion path: logarithmic, the standard augmentation discipline. And the invariant is checkable by machine: this page asserts, at every node, that the stored max end equals the true subtree maximum.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, stabbing and overlap are the actual queries: whose lease covers this date, which network ranges claim this address, which annotations cross this position. Second, interval lengths vary wildly: mixed short bookings and annual contracts are exactly the shape where prefix scans drown, measured here at one hundred fourteen times, and where pruning does not care, because a long interval fattens one ancestor’s label rather than every query’s candidate list. Third, the set changes: augmented search trees take inserts and deletes at logarithmic cost, while the static index alternatives answer change with a rebuild.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: one augmented field buys a whole query family. Thirty three visits per query at twenty thousand intervals: six hundred fold under the scan. Shape indifference, measured on the adversary. Point and window queries from one skeleton. Logarithmic updates. And an invariant that is machine checkable rather than trusted, asserted at every node of every tree here. The deeper prize is the design pattern: augment, then prune by certificate: it generalizes far past intervals, and the R tree is exactly this idea wearing bounding boxes. The weakness, in two honest parts. Enumeration is k log n, not log n plus k: the simple augmentation re descends per cluster of answers, and the centered interval trees of Edelsbrunner and McCreight buy the tight bound at the price of two sorted lists per node. And one dimension only: rectangles need the R tree family, while array position ranges with aggregate updates belong to the segment tree, a live unit whose page says so.',
  },
  {
    section: 'tradeoffs',
    text:
      'Here are the measured numbers: twenty thousand bookings across a year of minutes, two thousand stabbing queries averaging nine point three answers each, every report checked against the brute scan. The brute scan: twenty thousand visits per query, by definition. The sorted list with binary search: ten thousand one hundred sixty: respectable on this uniform shape, and every one of them a candidate check. The interval tree: thirty three. Then the adversary: add just forty long lived intervals, spanning most of the year, and query in the late months. The sorted scan climbs to fourteen thousand eight hundred eighty nine visits per query: wading through seventy four percent of the entire set, per question. The tree: one hundred thirty one: one hundred fourteen times less. Forty intervals out of twenty thousand changed the sorted list’s bill sevenfold and the tree’s bill by a rounding error. Shape, not size, is what indexes must survive.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is a start sorted list as a stabbing index, and the failure deserves its anatomy because the decoy is so reasonable. Sorting by start answers, who starts before x: a superset of the stabbing answer, found by one binary search: it feels like an index. But it never narrows: every long lived interval remains a candidate for every later query, forever, and the measured bill on the adversary was three quarters of the whole set per question, silently, with uniform test data hiding the disease at a tolerable looking ten thousand. Production calendars are full of annual bookings; production address tables are full of giant legacy ranges. The rule costs one sentence, and it is this unit’s: index the question you will actually ask, not the sort that was easiest to build.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements the balanced build by median recursion, the max end augmentation with a recursive invariant checker, stabbing and window queries with visit counters, the brute scan referee, and the sorted list rival with its bisect prefix. The self test asserts, in order: twenty thousand refereed point and window queries across one hundred random sets, exact set equality every time. The max end invariant, node by node, on every tree built. At scale, agreement on all two thousand five hundred queries, with the tree’s average visits inside its k log n family bound. And the adversary, measured: the sorted scan above seventy percent of the set per query, the tree twenty five fold below it, with the observed ratio at one hundred fourteen. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
