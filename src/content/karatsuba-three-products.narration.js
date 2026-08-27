// The spoken lesson for puzzle fifty five, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle fifty five: Karatsuba multiplication, paired with three product splitting, for big integer multiplication. Here is the puzzle. Two n digit integers, with n in the hundreds, thousands, or millions. Compute their exact product using fewer than the schoolbook’s n squared digit multiplications. Exactness is non negotiable: this is the arithmetic underneath cryptography: so the referee on this page is absolute: Python’s own integer product. Which, pleasingly, runs Karatsuba internally for anything above seventy digits: the defendant’s grown up self sits as the judge, and they agree at every size tried.',
  },
  {
    section: 'origins',
    text:
      'The origin story is the best in the subject. In nineteen sixty, Andrei Kolmogorov conjectured in his Moscow seminar that n squared was optimal: multiplication simply cost that much. In the audience sat a twenty three year old student, Anatoly Karatsuba, who returned within about a week holding the three product split. Kolmogorov announced the result himself, wrote the paper under the student’s name, and thereby executed his own conjecture. The door it opened became a ladder: Toom and Cook generalized the split; Schönhage and Strassen rebuilt it on the fast Fourier transform, a rung this site climbed two weeks of puzzles ago; and eight years after Karatsuba, Strassen pulled the identical maneuver on matrices, a live unit here. Every time your interpreter multiplies two big integers, this identity runs.',
  },
  {
    section: 'pair',
    text:
      'The control structure owns the split and recurse skeleton. Write x as a times B plus b, and y as c times B plus d, where B is ten to the half length. The product needs a c, a d, b c, and b d: four half size multiplications: and the recursion on four turns straight back into n squared, no progress. This is exactly Strassen’s predicament one domain over: the skeleton is an amplifier waiting for a saving. The heuristic supplies the saving, and it is Gauss’s trick: the quantity a plus b, times c plus d, minus a c, minus b d, IS a d plus b c. The entire cross term, for one extra multiplication instead of two. Three products total, and the exponent falls to log base two of three: one point five eight five. Measured at one thousand twenty four digits: fifty nine thousand and forty nine digit multiplications: exactly three to the tenth, asserted to the integer: against the schoolbook’s one million, forty eight thousand, five hundred seventy six: seventeen point eight times, and the ratio grows as n to the point four one five, forever. The identity itself is verified on five hundred scalar cases before any big number is asked to trust it.',
  },
  {
    section: 'picture',
    text:
      'Picture the courier trick from the Strassen unit, one domain earlier and eight years younger. Shipping one big consignment costs four standard sub shipments. A clever clerk notices that one combined shipment, minus two you have already paid for, contains exactly the two middle packages: three trucks where four seemed forced. Done once, it is bookkeeping. Done recursively, every truck is itself packed the same way, and the fleet thins by three quarters per level: sixty four packages become forty eight, then thirty six, then twenty seven. The exponent is not a formula on this page: it is that compounding, drawn as shrinking grids.',
  },
  {
    section: 'run',
    text:
      'Here is the loop. Split both numbers at the middle digit: high half and low half. Make three recursive products: high times high, low times low, and the sum of halves times the sum of halves. Reassemble: the high product shifted two half widths, plus the middle product minus the other two, shifted one half width: that subtraction is the cross term, exactly, and the tests verify it term by term: plus the low product. Work on raw coefficient lists and propagate carries once at the very end: the standard implementation discipline that keeps the middle subtraction honest. And cut over honestly: below the crossover, the extra additions outweigh the saved multiplication, so production code recurses down to a threshold and hands the small cases to the plain grid. This page measured its crossover at one hundred twenty eight digits in its op count model; CPython ships the same idea as a hardcoded seventy.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, exact big number arithmetic: cryptographic moduli, exact rationals, computer algebra: the places where floating point is disqualified and n squared genuinely hurts. Second, mid scale sizes: from the seventy digit crossover up to tens of thousands of digits: the band where Karatsuba is the reigning tool, before Toom Cook and the FFT methods take the higher rungs. Third, the lesson itself: this is the cleanest instance in all of computing of save one product and let the recursion amplify: the shape Strassen exported to matrices, and the shape worth carrying into any divide and conquer you ever design.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: the exponent falls, and every count on the page is exact. Three to the log two of n multiplications, asserted to the integer at four sizes. Seventeen point eight times at a thousand digits; a thousand times at a million. The identity verified term by term on five hundred cases, and agreement with the grown up referee at two hundred random sizes, for both the pure recursion and the cutoff variant. The weakness, in two honest halves. Below the crossover, the add tax wins: three products cost about four n extra additions per level, and the measured sweep shows the grid winning at every size through sixty four digits: four thousand ninety six total operations to Karatsuba’s four thousand seven hundred nineteen: with the first win arriving at one hundred twenty eight. That is why real libraries carry thresholds. And above, Karatsuba is a rung, not a summit: Toom Cook’s five products for nine take the next band, and the FFT methods, measured against Karatsuba in this site’s FFT unit at four point four times by eight thousand coefficients, own the astronomical sizes.',
  },
  {
    section: 'tradeoffs',
    text:
      'Here are the measured numbers. The headline, at one thousand twenty four digits, both counts asserted as equalities: the schoolbook grid: one million, forty eight thousand, five hundred seventy six digit multiplications: n squared to the digit. Karatsuba: fifty nine thousand and forty nine: three to the tenth to the digit: seventeen point eight fold. The crossover sweep, counting total primitive operations, multiplications plus additions: at two digits, four versus nine: the grid wins. At sixteen: two hundred fifty six versus four hundred seventy one: the grid still wins. At sixty four: four thousand ninety six versus four thousand seven hundred nineteen: the grid, still. At one hundred twenty eight: Karatsuba wins for the first time, and never loses again. CPython’s source code carries this exact measurement as a constant: KARATSUBA CUTOFF equals seventy: the crossover, shipped as an engineering decision, running on your machine right now.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is the grid at cryptographic scale, with the inverse trap noted in the same breath. A four thousand ninety six bit modulus is about twelve hundred decimal digits: the schoolbook grid pays roughly one and a half million digit products per multiplication, and a single handshake’s modular exponentiation performs thousands of multiplications: against Karatsuba’s roughly seventy eight thousand per product, the grid turns milliseconds into seconds at scale. But the trap runs both ways, and this page measured the other direction too: recursing Karatsuba down to single digits BELOW the crossover loses to the grid it was meant to replace. The ladder of multiplication algorithms has rungs in both directions, and the entire craft is standing on the right one for your n: which is why every serious bignum library is, at heart, a list of thresholds with algorithms attached.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements schoolbook multiplication on digit lists with exact counters, Karatsuba on raw coefficient lists with a single final carry propagation, a configurable cutoff, and the crossover sweep. The self test asserts, in order: Gauss’s identity on five hundred scalar cases, term by term. Agreement with Python’s own integer product at two hundred random sizes, for the pure and the cutoff eight variants. Both counters exact at four power of two sizes: n squared to the digit for the grid, three to the k to the digit for Karatsuba. And the crossover located by measurement between eight and one hundred twenty eight digits, landing at one hundred twenty eight in this op count model, beside CPython’s shipped seventy. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
