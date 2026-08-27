// The spoken lesson for puzzle sixty five, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle sixty five: Toom Cook multiplication, paired with five point interpolation, for big integer multiplication. Here is the puzzle. Two n digit integers must be multiplied exactly, one rung above the live Karatsuba unit on this site’s fast arithmetic ladder. Split each number into three limbs and it becomes a degree two polynomial in the base, so the product is a degree four polynomial: which, naively, costs all nine limb by limb products: and nine recursive calls on third size pieces lands you right back at n squared. The way out is a fact about polynomials rather than arithmetic: five points pin a quartic. The referees on this page: Python’s own product on three hundred mixed pairs, the interpolation identity recovered on five hundred random quartics, and operation counts asserted to the exact integer: five to the k, precisely.',
  },
  {
    section: 'origins',
    text:
      'Andrei Toom, Moscow, nineteen sixty three: a direct escalation of Karatsuba’s result from three years earlier, out of the same Kolmogorov seminar orbit that had just watched the n squared conjecture fall. Stephen Cook, in his nineteen sixty six Harvard thesis, systematized the idea into the general evaluate, multiply, interpolate family that now carries both names: split into k limbs, pay two k minus one products, exponent log base k of two k minus one, sliding toward one as k grows. The modern form is Bodrato’s two thousand seven operation sequences: the ones GMP actually ships. On this site’s ladder, Toom three stands between the live Karatsuba unit and the live FFT unit: the last rung where everything stays exact integers all the way down.',
  },
  {
    section: 'pair',
    text:
      'The algorithm owns split and recurse. Write each factor as a degree two polynomial in the base: three limbs: so the product is a degree four polynomial whose five coefficients naively need nine limb products. The count that must fall is the number of sub multiplications: additions, doublings, and exact divisions are bookkeeping the recursion forgives. The heuristic supplies evaluation and interpolation. A degree four polynomial is completely determined by five values. So evaluate both factors at five points: zero, one, minus one, two, and infinity: multiply pointwise: five recursive products of third size numbers, not nine: and solve the fixed five by five linear system back to coefficients. The divisions by two and three inside that unwinding are exact, and this page asserts every single remainder is zero. Measured: five to the sixth, fifteen thousand six hundred twenty five multiplications, exactly, at seven hundred twenty nine digits: against Karatsuba’s fifty nine thousand and the grid’s five hundred thirty one thousand.',
  },
  {
    section: 'picture',
    text:
      'Picture two curves you cannot see whole, but can measure anywhere. Multiplying polynomials coefficient by coefficient is a tangle of cross terms: nine of them here. But multiplying their values at a single point is one number times one number: trivial. So carry the tangle to the place where the work is easy. Plant five posts along the axis. Measure both curves at every post. Multiply the heights, post by post. You now hold five points that lie on the product curve: and the product curve is a quartic, so those five points pin it completely. Thread the unique quartic through them and read off its coefficients: those are your limbs. The live FFT unit is this exact picture pushed to its limit: n posts, placed at roots of unity, with the transform as the post placer. Toom three is the hand held version: five posts, one small linear system, and integers from start to finish.',
  },
  {
    section: 'run',
    text:
      'Here is the run. Split each factor into three limbs: a degree two polynomial in the base. Evaluate both at zero, one, minus one, two, and infinity: infinity just means the leading limb: all of this is additions and small doublings. Multiply pointwise: five recursive products of third size numbers: this is the entire spend, and the recursion takes the same five point road down. Interpolate: the sum of the one and minus one values, halved, gives the even part; their difference, halved, the odd; one more combination and a division by three finishes it: every division asserted exact. Recompose with shifts and adds: c zero, plus c one times the base, up through c four times the base to the fourth: and propagate carries once, at the very end.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, the operands live past Karatsuba but before the FFT: hundreds to thousands of machine words: GMP’s own Toom three window, where exponent one point four six five beats one point five eight five and the constants have not yet handed the crown to n log n. Second, exactness is non negotiable: every step is integer arithmetic with asserted exact divisions: no floating point error analysis, nothing probabilistic. Third, you want the pattern itself: evaluate where the operation is cheap, interpolate back: the same identity behind secret sharing, Reed Solomon coding, and the FFT: and worth owning in the five point form you can rederive at a whiteboard.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: an exact thirty four fold saving at seven hundred twenty nine digits, with a referee on every step. The counts landed on five to the k, to the integer, for four ladder rungs. The five point identity recovered five hundred random quartics coefficient exact. Every division by two and three came out remainder zero. Three hundred mixed products matched Python’s own integers. And even with additions counted, the honest total favors it: two hundred thirty nine thousand coefficient operations against Karatsuba’s four hundred seven thousand at the same size. The weakness: overhead constants, and a ceiling. The five by five unwind is real bookkeeping: in this page’s abstract operation meter Toom wins from nine digits, but in GMP’s word level reality the threshold sits near a hundred machine words: the gap between operation count models and hardware is itself the lesson, the same one the live Karatsuba page measured as its one twenty eight versus CPython’s seventy. And the ladder keeps climbing: Toom k’s exponent slides toward one but never arrives: past tens of thousands of digits, the FFT’s n log n takes the crown.',
  },
  {
    section: 'tradeoffs',
    text:
      'The rivals, in ladder order. Karatsuba, the live rung below: the same evaluate and interpolate idea at two limbs and three points: zero, one, infinity: with a simpler unwind that needs no divisions at all: smaller constants, the right tool from about seventy digits, and the base case this unit’s recursion bottoms out into. The fast Fourier transform, the live rung above: all n points at once, placed at roots of unity: unbeatable past tens of thousands of digits, at the price of floating point error analysis or number theoretic machinery. And Schönhage Strassen: the exact arithmetic FFT, transforms modulo Fermat numbers: GMP’s choice for truly huge operands, n log n log log n, and machinery nobody rederives at a whiteboard. The through line is one idea at three scales: three points, five points, n points: this site’s ladder climbed with the same rope.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is nine limb products out of pride. Split into three limbs and multiply every pair: it feels like progress: the numbers got smaller: and the recursion, nine calls on third size pieces, solves to exactly n squared. The schoolbook grid wearing a recursion costume, plus splitting overhead, for nothing. This page’s counter makes it concrete: nine way recursion at seven hundred twenty nine digits would pay the full five hundred thirty one thousand, against five way’s fifteen thousand six hundred twenty five. The count that must fall is sub multiplications: additions are forgiven by the master theorem, products are not: and a splitting scheme that does not cut the product count below k squared is decoration. It is the same lesson the live Karatsuba page teaches at two limbs, and it generalizes: the split is nothing; the identity that deletes products is everything.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements the raw coefficient list recursion: split, the five evaluations, five recursive products, the exact interpolation with remainder asserts, and recomposition with one carry pass at the end: alongside the live Karatsuba unit’s recursion, re run under the same counters for the race. The self test asserts, in order: the five point identity on five hundred random scalar quartics, recovered coefficient exact with every division checked. Three hundred mixed products equal to Python’s own integer arithmetic, including asymmetric sizes and single digits. Counts of exactly five to the k for k three through six. The seven hundred twenty nine digit three way race: five hundred thirty one thousand, fifty nine thousand, fifteen thousand six hundred twenty five, each asserted to the integer. And the add inclusive crossover measured, with the model versus hardware gap stated plainly. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
