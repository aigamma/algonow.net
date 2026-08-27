// The spoken lesson for puzzle thirty seven, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle thirty seven: the fast Fourier transform, paired with the Cooley Tukey radix two split, for signal transforms. Here is the puzzle. You hold n samples of a signal, or the coefficients of two polynomials you would like to multiply. Produce all n frequency amplitudes: the discrete Fourier transform: in n log n time. The constraint is the definition itself. Taken literally, the transform is a matrix vector product costing n squared complex multiplications: four point three billion at sixty five thousand samples, where the fast version measured on this page spends five hundred twenty four thousand. Real time audio, medical imaging, and every wireless radio live inside that gap.',
  },
  {
    section: 'origins',
    text:
      'Carl Friedrich Gauss had the trick in eighteen oh five, interpolating asteroid orbits, two years before Fourier presented his own memoir on heat. It sat unpublished, in neo Latin, in his collected works. The world rediscovered it in nineteen sixty five, in a five page paper by James Cooley and John Tukey, and the rediscovery had a Cold War engine: Tukey sat on a panel weighing whether seismometers could detect Soviet nuclear tests, a question that needs spectra of long seismograms, and Richard Garwin carried the idea to IBM where Cooley worked out the program. It has been called the most important numerical algorithm of the twentieth century, and the resume supports the title: JPEG’s cosine transform is its cousin, WiFi and five G modulate with it, magnetic resonance imaging reconstructs through it, and every audio spectrum display you have ever watched was drawn by it.',
  },
  {
    section: 'pair',
    text:
      'The control structure owns the transform itself: the k th amplitude is the sum over samples of x of j, times the j k power of the primitive root of unity. A change of basis into pure oscillations. Taken literally, that is a dense matrix vector product: n squared multiplications by definition, measured here at one million forty eight thousand five hundred seventy six for a thousand samples, and verified correct: on this page the naive transform is the referee, not a strawman. The heuristic supplies the radix two split. The roots of unity at size n contain the roots at size n over two, so the transform of n samples is two transforms of the even indexed and odd indexed halves, stitched together with n over two twiddle factor multiplications: the butterflies. The recurrence, two subproblems at half size plus n over two stitching, solves to exactly n over two times log two of n multiplications. Not approximately: exactly, and the page asserts the counter to the integer at five different sizes. At a thousand samples: five thousand one hundred twenty, against the definition’s million: two hundred five times less, and the ratio grows without bound.',
  },
  {
    section: 'picture',
    text:
      'Picture a choir audition, run badly and then well. The bad way: for each of n possible pitches, have all n singers hum against a tuning fork, one pairing at a time: n squared pairings. The split: divide the choir into evens and odds, and audition each half choir separately, recursively. Now notice the miracle: a half choir’s results at half the resolution can be stitched into full choir results with a single twist of phase per pitch: that twist is the twiddle factor. Keep halving until every choir is a soloist, and the stitching does all the work: log rounds, n over two twists per round, and the n squared pairings simply never happen.',
  },
  {
    section: 'run',
    text:
      'Here is the loop, in its iterative form. First, bit reverse the sample order: writing each index in binary and reversing the bits lands every sample exactly where the recursive even odd shuffling would have put it. Second, butterfly at length two: combine adjacent pairs into their sum and difference. Third, double the span: at each stage, combine half transforms with twiddle factors: the odd half’s value is twisted by the k th root of unity, then added and subtracted. Fourth, repeat for log two of n stages, each of n over two butterflies: that product is the entire multiplication count. And fifth, for products: transform both inputs, multiply pointwise, transform back, and round: convolution in n log n, checked coefficient exact against the schoolbook referee on this page.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, you need the whole spectrum, or a whole convolution: filtering, spectral peaks, correlations, polynomial and big integer products. If you need a single frequency bin, Goertzel’s little filter does that one column efficiently. Second, the length is large and friendly: powers of two are ideal, and padding or the mixed radix sibling, which is its own atlas entry, handles the rest. Third, floating point error around ten to the minus nine is acceptable or checkable. The convolution here rounds to exact integers with a measured error of five times ten to the minus eleven: at million digit scale, exactness wants the number theoretic transform, and that is Schönhage Strassen’s card on the bench.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: the count is exact, the referee agrees, and the uses are a civilization. The butterfly counter equals n over two log n to the integer, five sizes asserted. Three tones planted in noise surface as exactly the top three spectrum bins, with the amplitude recovered to point nine nine nine. The polynomial product agrees with schoolbook to the coefficient. Parseval’s theorem and fifty round trips hold. The weakness: a power of two appetite, a floating point residue, and honest constants. Radix two wants padded lengths; mixed radix and Bluestein exist for the rest. Results carry about ten to the minus nine of float error: nothing for audio, fatal for cryptographic exactness at scale, which is why the number theoretic rebuild exists. And the Karatsuba ladder keeps the constants honest: at one thousand twenty four coefficients, the F F T’s thirty five thousand multiplications only narrowly beat Karatsuba’s fifty nine thousand. The asymptotic gap is real: four point four times at eight thousand coefficients, and widening forever: but it takes size to open.',
  },
  {
    section: 'tradeoffs',
    text:
      'Here are the measured numbers. The spectrum ledger: at one thousand twenty four samples, the naive transform spent one million, forty eight thousand, five hundred seventy six complex multiplications, and the fast transform five thousand one hundred twenty: two hundred five to one, with agreement verified to ten to the minus seven. At sixty five thousand five hundred thirty six samples, the fast transform’s counter read five hundred twenty four thousand, two hundred eighty eight: the naive count at that size, four point two nine billion, is stated from the definition and was not run, and the page says so plainly. The polynomial ladder, at one thousand twenty four coefficients, all three methods agreeing exactly: schoolbook one million, Karatsuba fifty nine thousand and forty nine, which is exactly three to the tenth power, and F F T convolution thirty five thousand eight hundred forty. At eight thousand one hundred ninety two coefficients, with Karatsuba and the F F T refereeing each other coefficient by coefficient: one point five nine million against three hundred sixty thousand. The float error before rounding: five times ten to the minus eleven at the small size, three times ten to the minus nine at the large: rounded to exact integers both times, and checked.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is the definition, at scale, and it is the least forgivable never use on this site. The naive transform at sixty five thousand samples would spend four billion, two hundred ninety four million, nine hundred sixty seven thousand, two hundred ninety six complex multiplications to produce the spectrum the fast transform delivered in five hundred twenty four thousand: five orders of magnitude, and n squared adds two orders for every one that n log n adds. What makes it unforgivable is availability: the fast version is not a research artifact you would need to implement: it ships in every language’s standard toolkit, drop in, exact to ten decimal places. There are never uses on this site that represent honest trade offs taken too far. This one is not that. Running quadratic spectra in production is a bill paid for nothing.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements the iterative radix two transform with bit reversal and a butterfly counter, the naive definition, schoolbook and Karatsuba polynomial multiplication, and F F T convolution with measured rounding error. The self test asserts, in order: agreement with the naive definition at five sizes, with the butterfly counter equal to n over two log n to the integer each time. Fifty random round trips through the forward and inverse transforms, and Parseval’s theorem, energy in time equal to energy in frequency. The headline ledger at one thousand twenty four, where both methods actually ran. The exact counter at sixty five thousand. The three planted tones surfacing as exactly the top three spectrum bins, with amplitude recovered through the normalization. And the polynomial ladder: all three methods coefficient exact at the small size, Karatsuba and the F F T refereeing each other at the large, with float errors measured before the exact rounding. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
