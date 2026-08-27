// The spoken lesson for puzzle twenty-two, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle twenty two: binary search, paired with the halving invariant, for lookup in a sorted array. Here is the puzzle. You are given a sorted array of n keys and a target. Return the target’s position, or, if it is absent, the exact place it would go, in logarithmic time. The constraints carry the sting. The array is all you have: no index, no hash table, no promise about how the keys are distributed. And correctness must survive the edges: empty arrays, duplicate keys, absent targets, and one particular two element case that has been trapping professional programmers, in print, since nineteen forty six.',
  },
  {
    section: 'origins',
    text:
      'Binary search was first described in print by John Mauchly in the nineteen forty six Moore School Lectures, the founding course of electronic computing itself. Then comes the indictment, delivered by Donald Knuth’s history of the subject: the first published version that worked correctly for every array size, not just convenient ones, appeared only in nineteen sixty two. Sixteen years, for a loop of five lines. It gets worse. Jon Bentley, in Programming Pearls, gave the problem to professional programmers with unlimited time, and about ninety percent produced a broken version. And in two thousand six, Joshua Bloch reported that the binary search in Java’s own standard library had carried an integer overflow bug for nine years, in code adapted from a book about writing correct programs. This unit treats that history as data. The invariant is the algorithm, and everything famous that ever broke, broke by leaving it.',
  },
  {
    section: 'pair',
    text:
      'The control structure owns the bracket: a half open interval, lo inclusive, hi exclusive, together with one claim that must never stop being true: the answer’s position lies inside the bracket. The loop does nothing except shrink the bracket while keeping the claim, until the bracket closes to a single point, which is the answer, present or absent. Every famous failure is a violated clause of that sentence. Setting lo equal to mid, without the plus one, stops the bracket from shrinking, and on a two element array the loop spins forever; the tested solution keeps that exact museum piece and demonstrates the spin. The heuristic decides where inside the bracket to probe, and the midpoint is a minimax argument: whichever way the comparison answers, half the bracket disappears. That single sentence buys the guarantee: ceiling of log two of n, plus one, probes on any input whatsoever, and the tested solution asserts that as a maximum over ten thousand lookups, not as an average. But notice the probe position is genuinely a slot. Probe where the value should be, proportionally, and you get interpolation search. Probe by doubling out from a cursor, and you get exponential search. One invariant, three theories of where to point: the entire family in one loop.',
  },
  {
    section: 'picture',
    text:
      'Picture the number guessing game, played by three players. The midpoint player asks, is it above five hundred thousand, and no matter how the numbers were chosen or how the opponent squirms, twenty questions always suffice: that flat promise is the whole personality of the method. The interpolation player reasons like a human: you said it starts with a seven, so I will guess near seven hundred thousand; five questions when the numbers are spread evenly, and brutal punishment when they bunch, because the estimate keeps pointing at the wrong neighborhood. The galloping player has heard the answer is near the previous one, and probes one step out, then two, then four, then eight, paying for the size of the hop rather than the size of the haystack. Same game, same referee, three bets about where to point the flashlight.',
  },
  {
    section: 'run',
    text:
      'Here is the loop. First, the bracket: lo is zero, hi is n, and the claim is stated: the answer lies in the half open interval from lo to hi. Second, probe the midpoint, lo plus hi over two, rounded down; in languages with fixed width integers, write it as lo plus half the difference, because the naive sum is exactly the overflow that lived in Java for nine years. Third, shrink while keeping the claim: if the probed key is less than the target, the answer lies strictly beyond it, so lo becomes mid plus one; otherwise mid itself is still a candidate, so hi becomes mid. The plus one is what makes progress provable. Fourth, stop when lo meets hi: the bracket has closed, and that position is the answer, or the insertion point if the target is absent; both callers are served by the same index. Fifth, generalize: nothing in the argument used the array except monotonicity, so the same loop answers any question of the form, what is the first point where this monotone predicate flips: capacities, thresholds, feasibility, half of competitive programming.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, sorted data with random access and no distribution promise: the contest’s binary row reads twenty, twenty, twenty across three wildly different workloads, and that flat line is what the word guarantee looks like in a table. Second, your question is monotone even when there is no array anywhere: the smallest capacity that works, the largest rate that fits: bisection on the answer is this unit wearing different clothes. Third, lookups are cold and scattered. When they are hot and local, the doubling variant takes over, and when they are range scans over disk pages, the same idea reorganizes into a B tree.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: a guarantee with no fine print. Ceiling log two n plus one probes, maximum, on adversarial keys, absent targets, duplicates: twenty point zero on uniform keys, nineteen point nine on skewed keys, twenty point zero on local workloads. The row does not move, and every rival’s row swings. Add to that the generalization to arbitrary monotone predicates, and the simplicity that lets standard libraries make it a one liner. The weakness: it ignores everything except order. The values themselves are information, and interpolation reads them: four point nine probes on uniform keys, four times better. Locality is information, and the galloper reads it: nine and a half probes near the cursor, twice as good. And the scattered memory jumps grow cache hostile at scale, which is why databases fold the same logic into wide B tree nodes. Plus the famous fragility: this is simultaneously the easiest algorithm on the site and its most reliable source of production bugs.',
  },
  {
    section: 'tradeoffs',
    text:
      'Here are the measured numbers: one million sorted keys, ten thousand lookups per cell, average probes. Column one, uniform random keys. Binary: twenty point zero. Interpolation: four point nine, log log n in the flesh. Exponential search from a cold start: thirty seven point nine, double binary, the price of doubling all the way up from zero. Column two, the same size with cubic skew, so that value no longer tracks position. Binary: nineteen point nine: it never noticed. Interpolation: two hundred fifty point zero, twelve times worse than the method it meant to beat, because its whole theory of where to point is a bet on uniformity. Column three, targets landing within fifty positions of the previous answer. Binary: twenty point zero, again oblivious. The galloper: nine point five, paying log of the hop. And the linear scan from the cursor: twenty five point four, genuinely competitive at this hop size, with perfect cache behavior; anywhere else it is the n over two baseline, measured at four thousand eight hundred sixty seven average probes on a mere ten thousand keys. One table, one lesson: the midpoint buys indifference to the input, and every rival buys speed on some inputs by accepting a bad row somewhere else.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never ship is this unit’s own loop, composed casually from memory. The record deserves to be read slowly. Sixteen years from first publication to the first generally correct published version. Ninety percent of professional programmers, given unlimited time in Bentley’s exercise, produced broken code. Nine years of an overflow bug in the binary search of Java’s standard library, in code adapted from a chapter about writing correct programs. The tested solution preserves the classic wound as a museum piece: lo equals mid, without the plus one. On the two element array one comma three, searching for three, the midpoint is index zero, the key is less than the target, lo is assigned mid, which is zero, and the loop is exactly where it started, forever; a step cap converts eternity into a failing test. The cure costs one line: state the bracket invariant before writing the loop, or call the library function, which exists precisely because of everything in this paragraph.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements the whole probe family against one contract, lower bound: the first index where the target could be inserted. Binary with the half open bracket. Interpolation with the proportional estimate, guarded for flat stretches and out of range targets. Exponential search that gallops out from a hint and finishes with binary inside the bracket. The linear scan from a cursor. And the museum piece, capped so its infinite loop becomes evidence. The self test asserts, in order: one hundred thousand case agreement with Python’s own bisect module, an independent implementation, across duplicates, absences, empty arrays, and random hints; the minimax bound as a maximum, every one of ten thousand binary lookups within ceiling log two n plus one probes; interpolation at least three times under binary on uniform keys and at least two times over it on skewed keys, both faces measured; the galloper within its log of the hop bound and beating binary near the cursor; and the broken variant spinning past its step cap on the pinned two element instance while the correct loop answers in two probes. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
