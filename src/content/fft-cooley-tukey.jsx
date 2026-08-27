import FFTViz from '../viz/FFTViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/fft_cooley_tukey.py?raw';
import { narration } from './fft-cooley-tukey.narration.js';

export const content = {
  given:
    'n samples of a signal (or the coefficients of two polynomials).',
  task: 'All n frequency amplitudes: the discrete Fourier transform, in O(n log n).',
  constraint:
    'The definition is a matrix-vector product costing n² complex multiplications: 4.29 billion at n = 65,536, where the fast version measured here spends 524,288. Real-time audio, imaging, and radio live inside that gap.',

  origins: (
    <p>
      Gauss had the trick in <strong>1805</strong>, interpolating
      asteroid orbits, two years before Fourier read his memoir: it sat
      unpublished in his collected works in neo-Latin. The world
      rediscovered it in <strong>1965</strong>: Cooley and Tukey&apos;s
      five-page paper, born of a Cold War need (Tukey was on a panel
      weighing seismic detection of Soviet nuclear tests, which needs
      spectra of long seismograms; Garwin carried the idea to IBM).
      It has been called the most important numerical algorithm of the
      twentieth century: JPEG&apos;s DCT cousin, OFDM radio (WiFi, 5G),
      MRI reconstruction, and every audio spectrum you have ever seen
      run through it.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>transform</strong>: X[k] = Σ x[j]·W^jk with W the
      n-th root of unity: a change of basis into pure oscillations.
      Taken literally it is a dense matrix-vector product:{' '}
      <strong>n² multiplications by definition</strong>, measured here at
      1,048,576 for n = 1,024, and verified correct: the naive DFT is
      this page&apos;s referee, not a strawman.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>radix-2 split</strong>. The roots of unity at
      size n contain the roots at size n/2, so a DFT of n samples is two
      DFTs of the even-indexed and odd-indexed halves, stitched with n/2
      twiddle-factor multiplications (the butterflies). T(n) = 2T(n/2) +
      n/2 solves to <strong>exactly (n/2)·log₂ n</strong> butterfly
      multiplications: asserted to the integer at five sizes: 5,120 at
      n = 1,024, a 205× saving that grows without bound.
    </p>
  ),

  picture: (
    <p>
      A choir audition, run badly and then well. The naive way: for each
      of n possible pitches, have all n singers hum against a tuning
      fork: n² pairings. The split: divide the choir into evens and
      odds, audition each half (recursively!), and notice that a
      half-choir&apos;s results at half the resolution can be{' '}
      <em>stitched</em> into full-choir results with one twist of phase
      per pitch: the twiddle. Halving until soloists, the stitching does
      all the work: log rounds of n/2 twists, and the n² pairings never
      happen.
    </p>
  ),

  steps: [
    <>
      <strong>Bit-reverse</strong> the sample order: this is where the
      recursive even/odd shuffling lands everyone in advance.
    </>,
    <>
      <strong>Butterfly, length 2:</strong> combine adjacent pairs:
      (u, v) → (u+v, u−v).
    </>,
    <>
      <strong>Double the span:</strong> at each stage, combine
      half-transforms with twiddle factors: v·W^k twists the odd
      half&apos;s phase before the add/subtract.
    </>,
    <>
      <strong>log₂ n stages</strong> of n/2 butterflies each: the whole
      count, asserted exactly.
    </>,
    <>
      <strong>For products:</strong> transform both inputs, multiply
      pointwise, invert, round: convolution becomes O(n log n), checked
      coefficient-exact against schoolbook.
    </>,
  ],

  signals: [
    <>
      <strong>You need the whole spectrum</strong> (or the whole
      convolution): filtering, spectral peaks, correlation, polynomial
      and big-integer products. One bin only? Goertzel exists.
    </>,
    <>
      <strong>n is large and composite-friendly:</strong> powers of two
      ideal (pad or use mixed-radix otherwise: that sibling is its own
      atlas entry).
    </>,
    <>
      <strong>Float error ~1e-9 is acceptable</strong> or checkable: the
      convolution here rounds to exact integers with measured error
      5×10⁻¹¹: at million-digit scale, exactness wants NTT/Schönhage-Strassen.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the <strong>naive DFT</strong>, which is
      also the referee: 1,048,576 multiplications at n = 1,024, verified
      to agree with the fast version to 10⁻⁷ at five sizes. It is not a
      strawman: below n ≈ 32 its simplicity wins, and for a{' '}
      <em>single</em> frequency bin its column-at-a-time structure
      (Goertzel&apos;s filter) is exactly right. The crime is only
      running it at scale: the 65,536 row would cost 4.29 billion.
    </>
  ),

  strength: (
    <>
      <strong>The count is exact, the uses are everywhere, and the
      referee agrees.</strong> (n/2)·log₂ n butterflies asserted to the
      integer; three planted tones found as the top three spectrum bins
      with amplitude recovered to 0.999; convolution coefficient-exact
      against schoolbook; Parseval and 50 round-trips hold. The same
      transform underlies JPEG, WiFi, and MRI: one idea, a civilization
      of uses.
    </>
  ),
  weakness: (
    <>
      <strong>Power-of-two appetite, float residue, and a
      memory-bandwidth soul.</strong> Radix-2 wants padded lengths
      (mixed-radix and Bluestein exist for the rest); results carry
      ~10⁻⁹ float error, fine until exactness at scale demands
      NTT/Schönhage-Strassen; and the Karatsuba ladder shows honest
      overhead: at 1,024 coefficients FFT&apos;s 35,840 barely beats
      Karatsuba&apos;s 59,049: the asymptotic gap (4.4× at 8,192) takes
      size to open.
    </>
  ),

  problem: 'Signal transforms',
  problemSlug: 'signal-transforms',
  rivals: [
    {
      name: 'FFT × Cooley-Tukey radix-2',
      isThisUnit: true,
      algoName: 'Fast Fourier transform',
      cost: 'O(n log n)',
      wins: (
        <>
          <strong>5,120 mults where the definition spends 1,048,576</strong>{' '}
          (n = 1,024, both measured); the count exact by recurrence; the
          whole spectrum and fast convolution in one tool.
        </>
      ),
      costs: (
        <>
          Power-of-two lengths (pad, or the mixed-radix sibling), float
          residue ~1e-9, and constants that let Karatsuba stay close at
          small sizes.
        </>
      ),
      when: 'Any full spectrum or long convolution: the default transform of signal processing.',
    },
    {
      name: 'Discrete Fourier transform (naive)',
      algoName: 'Discrete Fourier transform',
      cost: 'O(n²)',
      wins: (
        <>
          Twelve lines, any length n, trivially correct: the referee
          every fast claim on this page answers to. One-bin queries
          (Goertzel&apos;s filter) inherit its shape efficiently.
        </>
      ),
      costs: (
        <>
          4.29 billion multiplications at n = 65,536 (stated, not run):
          five orders past the measured 524,288.
        </>
      ),
      when: 'Tiny n, odd lengths without library support, or a single frequency bin.',
    },
    {
      name: 'Karatsuba multiplication',
      cost: 'O(n^1.585)',
      wins: (
        <>
          <strong>59,049 mults at 1,024 coefficients</strong> (exactly
          3¹⁰), integer-exact with no floats, no padding, 30 lines: at
          this size it nearly ties FFT&apos;s 35,840.
        </>
      ),
      costs: (
        <>
          The exponent loses eventually: 1,594,323 vs 360,448 at 8,192
          (4.4×), and the gap widens forever.
        </>
      ),
      when: 'Mid-size exact integer or polynomial products: the standard bignum workhorse below FFT’s crossover.',
    },
    {
      name: 'Schönhage-Strassen × FFT over integer rings',
      algoName: 'Schönhage-Strassen',
      cost: 'O(n log n log log n)',
      wins: (
        <>
          The FFT idea rebuilt over modular rings: <em>exact</em> at any
          size, no float residue: what GMP actually runs for
          million-digit multiplications.
        </>
      ),
      costs: (
        <>
          Heavy machinery with a large constant: profitable only past
          tens of thousands of words.
        </>
      ),
      when: 'Exact arithmetic at astronomical scale: cryptographic and number-theoretic bignums.',
    },
  ],
  neverUse: {
    name: 'The definition, at scale',
    why: (
      <>
        The naive DFT at n = 65,536 would spend{' '}
        <strong>4,294,967,296</strong> complex multiplications for the
        spectrum the FFT delivered in <strong>524,288</strong>, measured:
        five orders of magnitude, and n² grows two orders for every one
        of n log n&apos;s. This is the least forgivable never-use on the
        site because the fast version is not merely known: it is in
        every language&apos;s standard toolkit, drop-in, exact to 10⁻⁹.
        Running O(n²) spectra in production is not a trade-off; it is a
        bill for nothing.
      </>
    ),
  },

  contest: {
    instance:
      'the full spectrum; complex multiplications counted exactly, agreement with the naive-DFT referee to 10⁻⁷, butterfly counts asserted equal to (n/2)·log₂ n',
    columns: ['complex mults', 'note'],
    rows: [
      {
        method: 'Naive DFT, n = 1,024',
        values: ['1,048,576', 'ran, verified'],
        verdict: 'the definition and the referee: honest, and doomed at scale',
      },
      {
        method: 'FFT, n = 1,024',
        isThisUnit: true,
        values: ['5,120', '205×'],
        best: 0,
        verdict: 'exactly (n/2)·log₂ n, asserted to the integer',
      },
      {
        method: 'FFT, n = 65,536',
        values: ['524,288', 'naive: 4.29B, not run'],
        verdict: 'five orders of magnitude, and still growing apart',
      },
    ],
    source:
      'python solutions/fft_cooley_tukey.py prints this table plus the polynomial ladder (1,024 coefficients: schoolbook 1,048,576, Karatsuba 59,049, FFT 35,840, all coefficient-exact; 8,192: Karatsuba 1,594,323 vs FFT 360,448, refereeing each other) and asserts: agreement with the naive DFT at five sizes with butterfly counts exact; 50 round-trips and Parseval’s theorem; the three planted tones surfacing as the top three bins with amplitude 0.999 recovered; and convolution float error 5×10⁻¹¹ before exact rounding.',
  },

  figure: (
    <Figure
      id="fig-fft-butterfly"
      aspect="16 / 7"
      caption="The radix-2 split. The DFT of n samples is two half-size DFTs (evens, odds) stitched by n/2 butterflies: the odd result twisted by a twiddle factor W^k, then added and subtracted. The recurrence T(n) = 2T(n/2) + n/2 telescopes to exactly (n/2)·log₂ n multiplications, which this page asserts to the integer. Gauss had it in 1805; the world needed it in 1965."
      cite={{
        text: 'Cooley & Tukey, "An Algorithm for the Machine Calculation of Complex Fourier Series", Mathematics of Computation 19, 1965. The 1805 anticipation is Gauss, published posthumously; the polynomial-product reading is the convolution theorem.',
        href: 'https://doi.org/10.1090/S0025-5718-1965-0178586-1',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="The butterfly diagram: two half-size DFTs stitched with twiddle factors">
        <rect x="40" y="40" width="150" height="70" fill="rgba(93,162,255,0.10)" stroke="#5da2ff" rx="6" />
        <text x="115" y="70" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="12" textAnchor="middle">DFT of evens</text>
        <text x="115" y="90" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11" textAnchor="middle">size n/2</text>
        <rect x="40" y="160" width="150" height="70" fill="rgba(93,162,255,0.10)" stroke="#5da2ff" rx="6" />
        <text x="115" y="190" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="12" textAnchor="middle">DFT of odds</text>
        <text x="115" y="210" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11" textAnchor="middle">size n/2</text>
        <line x1="190" y1="75" x2="430" y2="75" stroke="#62d98a" strokeWidth="1.6" />
        <line x1="190" y1="195" x2="300" y2="195" stroke="#f0b94b" strokeWidth="1.6" />
        <circle cx="320" cy="195" r="14" fill="none" stroke="#f0b94b" strokeWidth="1.6" />
        <text x="320" y="200" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11" textAnchor="middle">×W^k</text>
        <line x1="334" y1="195" x2="430" y2="195" stroke="#f0b94b" strokeWidth="1.6" />
        <line x1="430" y1="75" x2="500" y2="120" stroke="#62d98a" strokeWidth="1.6" />
        <line x1="430" y1="195" x2="500" y2="120" stroke="#f0b94b" strokeWidth="1.6" />
        <line x1="430" y1="75" x2="500" y2="170" stroke="#62d98a" strokeWidth="1.2" strokeDasharray="4 3" />
        <line x1="430" y1="195" x2="500" y2="170" stroke="#f0b94b" strokeWidth="1.2" strokeDasharray="4 3" />
        <text x="512" y="124" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="12">X[k] = E+W·O</text>
        <text x="512" y="174" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="12">X[k+n/2] = E−W·O</text>
        <text x="40" y="262" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">T(n) = 2·T(n/2) + n/2 multiplications  ⇒  exactly (n/2)·log₂ n · at n=1,024: 5,120 vs the definition’s 1,048,576</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'fft_cooley_tukey.py',
  Viz: FFTViz,
  narration,
};
