// The spoken lesson for puzzle forty six, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle forty six: the Fisher Yates shuffle, paired with backward uniform swaps, for shuffling and permutation. Here is the puzzle. You hold an array of n items and a source of random numbers. Produce a uniformly random permutation: every one of the n factorial orderings equally likely: in place, in a single pass. Uniformity is a testable claim, and this page tests it exactly: all twenty four permutations of four items, counted over two hundred forty thousand shuffles. And with the same instrument, it convicts the most famous shuffle bug in software: matching the bug, cell by cell, to its own exactly enumerated theory.',
  },
  {
    section: 'origins',
    text:
      'Ronald Fisher and Frank Yates published the procedure in nineteen thirty eight, for statisticians randomizing experiments by hand with printed tables of random digits. Richard Durstenfeld’s nineteen sixty four algorithm in the Communications of the ACM turned it into the in place, linear time sweep, and Knuth’s Algorithm P made that form canonical. Its most instructive moment came in nineteen ninety nine, when an online poker site published its shuffling code as a gesture of transparency, and security researchers pointed out that its thirty two bit seed could reach only a vanishing sliver of the fifty two factorial possible decks: real money, lost to arithmetic that this page runs directly. The modern clients are everywhere: machine learning data loaders shuffling epochs, randomized trials assigning treatments, and music players, whose users famously rejected true uniformity as not feeling random enough, forcing the shuffle to be deliberately biased toward human expectations.',
  },
  {
    section: 'pair',
    text:
      'The control structure owns the in place sweep: walk the index i from the last position down to one, swap position i with a randomly chosen position, lock position i forever, and continue. One pass, no extra memory, n minus one swaps. The shape is so simple that every wrong shuffle in the wild is this same loop with one detail changed. The heuristic supplies the detail: the range. Draw j uniformly from zero to i: the unlocked prefix, including i itself. That single bound is the entire theorem. Position i receives each remaining item with equal probability and then never moves again, so the decision tree has exactly n factorial equally likely leaves, one per permutation: uniform, by counting. Measured: chi squared of thirty five point three on twenty three degrees of freedom, every cell within noise of its expected ten thousand. Widen the range to the whole array, and n to the n paths must land on n factorial outcomes, which do not divide: bias up to forty one percent, measured, and predicted exactly by enumeration.',
  },
  {
    section: 'picture',
    text:
      'Picture dealing seats at a table, last seat first. The correct dealer says: this seat is open to everyone still standing: pick one person at random, seat them, and never revisit that chair. Every standing person had an equal claim to it, so every final seating chart is equally likely. The buggy dealer lets each pick disturb people who are already seated: it feels more thorough, more shuffled, more random. But re seating the seated is exactly what breaks the count. There are two hundred fifty six ways to run the buggy deal for four seats, and only twenty four seating charts, and two hundred fifty six does not divide by twenty four. Some charts must receive extra ways. More stirring, less uniform: the intuition and the arithmetic point in opposite directions, and the arithmetic is right.',
  },
  {
    section: 'run',
    text:
      'Here is the loop. Set i to the last index. Draw j uniformly between zero and i, inclusive: the unlocked range, including i itself, so that standing pat is one of the equally likely outcomes. Swap the items at i and j. Position i is now final. Decrement i and repeat down to one: n minus one draws, n minus one swaps, done. Two disciplines travel with the loop. Mind the entropy: the permutation space must fit inside the seed space, and this page measured the ceiling directly: sixteen bit seeds reached sixty four thousand nine hundred forty of the three point six million orderings of ten items. And test, do not vibe: count permutation cells against their expectation. The chi squared that certified this page’s shuffle is the same one that convicted both impostors.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, the ordering itself is the product: card deals, prize draws, treatment assignment, the epoch order a model trains on: anywhere bias becomes unfairness, or leakage, or an exploit. Second, in place and linear matter: shuffling millions of rows wants n swaps, not n log n comparisons plus a random key stored per row. Third, you want auditability: uniformity is an exactly testable claim, rare among randomized code, and this page’s cell counts are what the audit looks like.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: exactly uniform, provably and testably, at the machine minimum. n minus one swaps, zero allocation, and a proof that fits in one sentence: each seat is filled uniformly from those still standing. The certificate on this page: twenty four cells within four and a half sigma of ten thousand, chi squared thirty five point three. The weakness: uniform only as far as the entropy goes, and only over full orderings. The seed space ceiling is real and measured: sixteen bits of seed reached under two percent of ten factorial, and thirty two bits is dust against fifty two factorial: a perfect algorithm driven by a weak generator is a weak shuffle. Sampling k of n instead of ordering all n wants the reservoir cousin, a live unit on this site. Elections and mixnets, where the shuffler itself is distrusted, want verifiable shuffles with zero knowledge proofs. And human listeners will tell you a true uniform shuffle repeats artists too often: that complaint is about their model of randomness, not about your code, and the honest fix is a deliberate, documented bias.',
  },
  {
    section: 'tradeoffs',
    text:
      'Here are the measured numbers: four items, twenty four permutation cells, two hundred forty thousand shuffles per method, ten thousand expected per cell. Fisher Yates, drawing from the shrinking range: chi squared thirty five point three against twenty three degrees of freedom: uniform to the test’s teeth. Swap anywhere, the one character mutation: chi squared seven thousand one hundred sixty six, worst cell forty one percent off uniform: and every one of its twenty four cells was predicted within five sigma by enumerating its two hundred fifty six equally likely paths. The bug is not noisy. It is exact. Sort by a random float key: chi squared thirty seven point three: genuinely uniform, at the price of a sort and a key per row. And sort by a four valued key: chi squared one hundred eight thousand: the stable sort leaks the input order through collisions, and the identity permutation arrived two hundred twenty eight percent overrepresented, again matching its own enumerated theory. One instrument, four verdicts, no vibes.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is swap anywhere, the off by one impostor, and its anatomy deserves care because it has shipped in real card games and real lotteries. The mutation is one character: draw the partner from the whole array instead of the unlocked prefix. No eyeball catches it: the output looks shuffled, the code looks symmetric, and symmetric even feels fairer. The conviction is counting: n to the n equally likely execution paths cannot land evenly on n factorial outcomes, because twenty four does not divide two hundred fifty six. This page enumerated all two hundred fifty six paths, predicted the exact bias of every cell, and confirmed the prediction at five sigma over a quarter million trials. The defense costs one test: count permutation cells on a small n in continuous integration, and the impostor can never ship again. Randomized code is exactly as trustworthy as the tests you run against its distribution.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements the shuffle, the swap anywhere impostor, and sort by random key with a configurable key space, plus the counting machinery. The self test asserts, in order: every Fisher Yates cell within four and a half sigma of its expected ten thousand, and the chi squared statistic under sixty against its expectation of twenty three. The impostor matched, cell by cell at five sigma, to the exact theory obtained by enumerating all two hundred fifty six of its equally likely paths, with worst relative bias above ten percent, measured at forty one. The float key sort passing the same gate the shuffle passed. The tiny key sort matching its own enumerated leak, identity overrepresented by two hundred twenty eight percent. The seed ceiling measured directly: sixty five thousand five hundred thirty six seeds reaching sixty four thousand nine hundred forty distinct orderings of ten items, under two percent of the possible. And the closing arithmetic: two to the thirty two is smaller than fifty two factorial: asserted, as the poker site learned. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
