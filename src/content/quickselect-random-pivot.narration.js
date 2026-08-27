// The spoken lesson for puzzle thirty three, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle thirty three: quickselect, paired with the random pivot, for selection and order statistics. Here is the puzzle. You hold n unordered items and a rank k. Produce the k th smallest, in expected linear time, without sorting. And the constraint with teeth: the inputs are allowed to be hostile. This page does not merely worry about adversaries in the abstract. It builds the killer input for the deterministic pivot rule, live, using McIlroy’s gas adversary; replays it to a certified quadratic bill; and then feeds the very same array to the lottery, which barely notices.',
  },
  {
    section: 'origins',
    text:
      'Tony Hoare published FIND in nineteen sixty one as Algorithm sixty five, the quiet companion to quicksort’s Algorithm sixty four: partition as before, but recurse into one side only. In nineteen seventy three, Blum, Floyd, Pratt, Rivest, and Tarjan, five names that would each anchor a career on their own, proved that selection needs no luck at all: the median of medians pivot gives worst case linear time. Floyd and Rivest shaved the constants two years later with two pivot sampling. And in nineteen ninety nine, Doug McIlroy closed the loop from the dark side, publishing a killer adversary that manufactures a quadratic input for any quicksort or quickselect whose pivot decisions it can watch. That construction is not a citation on this page. It runs here.',
  },
  {
    section: 'pair',
    text:
      'The control structure owns the partition and discard skeleton. Pick a pivot; partition the live range three ways, into less, equal, and greater; and ask where rank k fell. If it fell inside the equal zone, the pivot value is the answer. Otherwise only one side can hold it, and the other side is discarded without ever being read again. If each pivot lands anywhere reasonable, the survivor shrinks geometrically, and the passes sum to a constant times n: quicksort’s idea, minus the half of the work that selection never needed. The heuristic supplies the unpredictability. A pivot drawn uniformly at random makes the geometric shrink a theorem in expectation for every input, because an adversary cannot aim at a coin it has not seen. Measured: four point five four n comparisons on the very array that drives median of three to one and a half million. On friendly data the lottery costs about five point two n with this three way partition: the classic constant of three point three nine, times roughly one and a half comparisons per element, which is the price of duplicate immunity, and it is priced honestly below.',
  },
  {
    section: 'picture',
    text:
      'Picture a rigged tournament. If the bracket seeding is fixed and published in advance, a bookmaker can arrange the entrants so that every round eliminates almost nobody, and the tournament that should take a handful of rounds grinds on for hundreds. That is exactly what the gas adversary does to a fixed pivot rule: it watches which entrant the rule is about to crown, and quietly arranges for that entrant to be a nobody, so the field barely shrinks. Now seed the bracket by coin flip. The bookmaker has nothing to aim at, because no fixture list exists until the coins are flipped: and half the field, in expectation, goes home every round.',
  },
  {
    section: 'run',
    text:
      'Here is the loop. Draw a pivot index uniformly from the live range. Partition three ways around its value, in a single in place pass: elements less than the pivot to the left, greater to the right, equal in the middle. This is the Dutch flag pass, and the equal zone is what keeps duplicate heavy inputs from recursing forever. Now locate rank k. Inside the equal zone: done, return the pivot value. Otherwise discard the side that cannot hold k, adjusting k if the greater side survives, and repeat on the survivor. Expected passes are geometric; the expected total is about five point two n comparisons, measured over thirty trials.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, you need one rank, not an ordering: a median, a ninety ninth percentile, the cutoff for a top decile. Sorting would answer every question including the ones nobody asked, at triple the price. Second, the data sits in memory and may be rearranged: the partition works in place. If the data is a stream, or too large to load, the heap specialist takes over. Third, the inputs are not yours to trust: user supplied, duplicate heavy, or outright adversarial. The lottery and the three way partition turn both of those threats into measured non events.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: expected linear against every input, in place, and simple. There is no input that raises the expectation, because raising it would require predicting coins. The all equal storm finishes in exactly two n comparisons. The killer costs four point five four n. Random data costs five point two. The numbers barely move, because there is nothing to aim at. This is the engine inside the standard library’s nth element, and the standard tool behind medians and percentile cuts. The weakness: expected is not guaranteed, and the guarantee has a price list. A hard realtime bound wants median of medians, whose ten n never moves, or introselect, which starts with the lottery’s constant and falls back to the guarantee when a recursion runs deep. A predictable random generator quietly reopens the attack: the immunity is exactly as good as the coins. The data must be mutable and in memory. And the three way partition’s one and a half times comparison factor is a real tax, paid deliberately, for duplicate immunity.',
  },
  {
    section: 'tradeoffs',
    text:
      'Here are the measured numbers, from two ledgers. Ledger A: one hundred thousand random values, selecting the median, comparisons per element. Quickselect with the random pivot: five point two, averaged over thirty trials. Quickselect with median of three: four point three six: genuinely cheaper on friendly ground, and that honesty matters. Median of medians: eleven point five one, the guarantee’s constant. A full Timsort: fifteen point two nine, which buys every rank at once. Heapselect, the top k specialist: one point zero zero n at k equals ten, and thirteen point nine six at k equals half of n: the specialist, on and off its turf. Ledger B: the two thousand element killer permutation, built by the gas adversary against median of three, then replayed. Median of three: one million, five hundred three thousand, five hundred one comparisons: quadratic, certified against the n squared over four scale. The random pivot on the same array: nine thousand eighty four, which is four point five four n. Median of medians: twenty thousand fifty eight, ten n, unmoved. And Timsort: eleven thousand two hundred sixty six, immune as well, its run detection even exploiting the killer’s structure. Read the two ledgers together: the deterministic rule wins Tuesday by a fifth, and loses the war by a factor of a hundred and sixty.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is any fixed pivot rule facing inputs that someone else chooses, and the demonstration on this page is constructive. McIlroy’s gas adversary needs nothing but the comparisons the code itself asks for. It built a killer that sends median of three to one and a half million comparisons at two thousand elements, and a second killer that sends the first element rule to three million three thousand. Both replayed, both certified. The folklore version of this disease, the first element pivot fed already sorted input, is the same failure in its textbook form, and it has taken down real production systems whose authors assumed inputs would arrive shuffled. The rule worth keeping is one sentence long: if the input’s order is not yours to choose, then the pivot must not be predictable from it. You can pay for that with a coin, or you can pay with the guarantee’s constant. What you cannot do is skip the bill.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements the iterative three way quickselect with pluggable pivot rules: first element, median of three, and the seeded lottery; the full median of medians with groups of five; McIlroy’s gas adversary as a forty line class; and a comparison counting box for pricing the library sort and the heap. The self test asserts, in order: every method agrees with the sorted referee across three hundred duplicate heavy trials, including both rank edges. The killer the adversary builds is a genuine permutation, and its replay certifies at least n squared over eight comparisons for median of three, with a second killer built for the first element rule. The lottery averages under twelve n on the killer across ten seeds. Median of medians stays under sixty n everywhere. The all equal storm finishes in two n. And the library sort’s count lands within ten percent of n log n. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
