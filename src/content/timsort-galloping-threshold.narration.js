// The spoken lesson for puzzle one hundred, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle one hundred: Timsort, paired with the galloping merge threshold, for real-world stable sorting. Here is the puzzle. When you type sorted in Python, or sort a list of objects in Java, or sort an array in JavaScript, a specific algorithm runs: and it is not quicksort, and not textbook mergesort. It is Timsort, and it is built on a heresy: real-world data is not random. Logs arrive nearly ordered by time. Tables get re-sorted by a second column. Batches get appended to sorted files. So a real-world sort should HUNT for the order already present, keep every bit of it, and: when one side of a merge keeps winning: stop comparing one element at a time and GALLOP: leap ahead in doubling strides. The referee for the hundredth puzzle is the referee it deserves: sorted itself: five hundred arrays across seven data shapes, exact equality, with stability verified on four thousand tagged records. And every dividend on this page is a counted comparison, not an adjective.',
  },
  {
    section: 'origins',
    text:
      'Tim Peters, two thousand two, writing the new list sort for C Python: and documenting it not in a journal but in a file called listsort dot t x t that ships inside Python to this day: part benchmark suite, part design argument, part love letter to careful measurement. The galloping idea he credits to McIlroy’s nineteen ninety three paper, Optimistic Sorting and Information Theoretic Complexity. Java adopted Timsort for object arrays in two thousand nine: Android followed: V8 sorts JavaScript with it. The hundredth puzzle on this site is the sort that probably ran while your browser loaded this page. And the epilogue teaches as much as the origin: in twenty fifteen, formal verification researchers proved the original merge-stack invariant INSUFFICIENT: real crashes in the Java Development Kit: and in twenty eighteen, Powersort replaced the merge policy inside C Python. Even the most deployed algorithm on earth was still being corrected a decade in.',
  },
  {
    section: 'pair',
    text:
      'The algorithm owns the run machinery. Scan the array for natural runs: an ascending stretch is kept as is: a STRICTLY descending stretch is reversed in place: strictly matters, because reversing a run with equal elements would swap them and break stability. Runs shorter than minrun: a size computed from n, near thirty two to sixty four: are grown by binary insertion. Each run is pushed onto a merge stack governed by invariants: each run on the stack must be longer than the next two combined: audited on this page at every one of sixty four pushes: which keeps the eventual merge tree balanced, so the worst case stays n log n no matter how strange the run lengths. The heuristic is the gallop: during a merge, once one run has supplied seven elements in a row: MIN GALLOP equals seven: the merge stops asking which element is next, and starts asking WHERE the other run’s head belongs: exponential probes at offsets one, three, seven, fifteen: then a binary search inside the last stride: then the entire winning block copies at once.',
  },
  {
    section: 'picture',
    text:
      'Merging two sorted piles of exam papers by hand. The plodding clerk compares the two top papers, moves one, compares again: perfectly sensible when the piles interleave: absurd when one pile holds all the students from A through M, because the clerk pays five hundred comparisons to move five hundred papers that were never going to lose a single one. The galloping clerk notices seven wins in a row and changes the question. Not: which paper is next: but: where does the OTHER pile’s top paper belong in this one? Check one position ahead: three: seven: fifteen: overshoot: binary search the gap: and move the whole wad of winners in one motion. Thirty comparisons where the plodder paid five hundred. And when the piles begin interleaving again, the streak counter resets and the clerk returns to plodding: because leaping costs a little extra when streaks are short: seven wins is the evidence demanded before betting on an eighth. That bet, and its odds, are measured on this page.',
  },
  {
    section: 'run',
    text:
      'Here is the run, in counted comparisons at fifty thousand elements. Nearly sorted data: twenty random swaps in an otherwise ordered array: run-blind bottom-up mergesort pays five hundred fourteen thousand comparisons: Timsort pays fifty two thousand: nine point seven times fewer, because the array was already almost one run. Random data: seven hundred twenty two thousand versus seven hundred thirty three thousand: parity, ratio zero point nine nine: hunting for order that is not there costs nothing measurable, which is why the hunt is always on. The gallop, isolated: same code, gallop switched off versus on, on block-interleaved data built of long winning streaks: one hundred eighty four thousand versus forty one thousand: four point four times. And the threshold’s own dial: with the hysteresis at seven, the random-data tax is plus one point two percent: with an eager threshold of one, plus seventy seven point nine percent. Seven is not folklore. Seven is a measured balance point between leaping too late and leaping too often.',
  },
  {
    section: 'signals',
    text:
      'The signals that this pair fits. First: data with history. Logs nearly ordered by timestamp, tables re-sorted by a second key, sorted batches concatenated: runs are everywhere production data lives, and an adaptive sort collects rent on all of them. Second: stability is load-bearing. Sort employees by department, and within each department they keep their existing name order: that is the multi-key idiom every user of ORDER BY and every spreadsheet sorter silently relies on: verified here on four thousand tagged records, order of equal keys exactly preserved. Third, and this is the posture more than a signal: adaptive beats worst-case thinking. Pay O of n when the data is kind, n log n when it is not, and essentially nothing for having checked. Engineering for the data you actually have, while keeping the guarantee for the data you might: that is the entire Timsort ethos, and it generalizes far beyond sorting.',
  },
  {
    section: 'tradeoffs',
    text:
      'Now the rivals. Quicksort: the live unit: is the in-place speed king on primitive arrays: cache-friendly partitioning, no merge buffer, unbeatable constants when a comparison is one machine instruction: which is why C sorts numbers with it. Its two structural gaps are exactly Timsort’s two additions: it is unstable: equal keys shuffle: and it is blind to preexisting runs. Introsort: C plus plus’s standard sort: is quicksort with an escape hatch: recursion too deep switches to heapsort, tiny ranges to insertion sort: taming the adversarial worst case while keeping the speed. Still unstable, still run-blind. The split is clean: primitives with cheap comparisons and no stability contract: quicksort family. Objects, expensive comparisons, duplicate keys, real-world order: Timsort. Python ships Timsort precisely because Python comparisons are expensive method calls: the design follows the cost model, and knowing YOUR cost model is the choosing skill.',
  },
  {
    section: 'tradeoffs',
    text:
      'Natural mergesort is Timsort’s honest ancestor and the best way to see what the machinery buys: detect runs, merge them pairwise, done: adaptivity in ten teachable lines. Its gaps: skewed run lengths build unbalanced merge trees: fixed by Timsort’s stack invariants: and streaky merges pay per element: fixed by the gallop. And the honest limits of the hero: Timsort is a SYSTEM, and its subtlety has a paper trail: the twenty fifteen formal verification that found the shipped invariant insufficient, the twenty eighteen Powersort refinement that replaced the merge policy in C Python because the invariant rule can build measurably suboptimal trees. It buys nothing on truly random data: parity, measured: it needs an n over two merge buffer where quicksort needs none: and on plain integer arrays, radix sorts and vectorized quicksorts win on constants. No sort wins everywhere. This one wins where production data lives.',
  },
  {
    section: 'tradeoffs',
    text:
      'And the negative example, which the hundredth puzzle points at itself: reimplementing the library sort for production. This page rebuilt Timsort to MEASURE it: and the exercise is the argument against deploying such a rebuild. The stack invariant shipped subtly wrong in the J D K for a decade before formal methods caught it. Stability is one careless comparison away from silently broken: this page’s galloping path needed a strict-inequality variant purely to keep ties honest, and the referee caught the draft that got it wrong. The library version carries twenty years of fixes, fuzzing, and verification that yours will not. The rule: reimplement to understand: never to deploy. Sorted is free, correct, and faster than your version: and the energy belongs one layer up: choosing sort keys, exploiting stability for multi-key pipelines, recognizing when your data’s shape makes the sort effectively linear. That layer: knowing the tools well enough to choose and compose them: is what one hundred of these puzzles have been for.',
  },
  {
    section: 'code',
    text:
      'The code on this page is a faithful teaching Timsort: run detection with in-place reversal of strictly descending runs: minrun sizing and binary-insertion extension: the merge stack with its invariants asserted at every push: and the galloping merge with exponential probes, binary search, block copies, and the hysteresis. Plus the run-blind bottom-up mergesort as the counted rival. The self test asserts: five hundred arrays across seven shapes equal to sorted: stability exact on four thousand tagged records: the run dividend above eight times on nearly sorted data, measured nine point seven: random parity inside one percent: the gallop dividend above two and a half times, measured four point four: the hysteresis tax under five percent, measured one point two: the eager dial measurably worse: and the stack invariants holding throughout. When it prints O K, the hundredth puzzle closes the way the site began: a real algorithm, a real heuristic, and every claim between them cashed out against a referee that cannot be argued with.',
  },
];
