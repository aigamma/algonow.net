import KaratsubaViz from '../viz/KaratsubaViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/karatsuba_three_products.py?raw';
import { narration } from './karatsuba-three-products.narration.js';

export const content = {
  given:
    'Two n-digit integers: n in the hundreds, thousands, millions.',
  task: 'Their exact product, below the schoolbook’s n² digit multiplications.',
  constraint:
    'Exactness is non-negotiable (this is the arithmetic under cryptography), so the referee is absolute: Python’s own integer product: which, pleasingly, runs Karatsuba internally above 70 digits: the defendant’s grown-up self sits as judge.',

  origins: (
    <p>
      In 1960, Kolmogorov <strong>conjectured in a seminar</strong> that
      n² was optimal for multiplication: and a 23-year-old student,
      Anatoly Karatsuba, returned within a week with the three-product
      split. Kolmogorov announced the result himself, wrote it up under
      the student&apos;s name, and killed his own conjecture: the paper
      that opened fast arithmetic. The ladder it started: Toom-Cook
      (5 products for 9), then Schönhage-Strassen&apos;s FFT rebuild:
      is the one this site climbed in the FFT unit: and eight years
      later Strassen pulled the identical trick on matrices. Your
      Python interpreter runs this identity every time two big ints
      meet.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>split-and-recurse skeleton</strong>: write
      x = a·B + b and y = c·B + d with B = 10^(n/2), and the product
      needs ac, ad, bc, bd: four half-size multiplications, which the
      recursion turns straight back into n². Exactly Strassen&apos;s
      situation, one unit and one domain away: the skeleton is an
      amplifier waiting for a saving.
    </p>
  ),
  heurRole: (
    <p>
      Supplies <strong>Gauss&apos;s trick</strong>: (a+b)(c+d) − ac −
      bd <em>is</em> ad + bc: the entire cross term for one extra
      multiplication instead of two. Three products, and the exponent
      falls to log₂3 ≈ 1.585: measured at 1,024 digits as{' '}
      <strong>59,049 digit-multiplications: exactly 3¹⁰, asserted:
      against the schoolbook&apos;s 1,048,576</strong>: 17.8×, and the
      ratio grows as n^0.415 forever. The identity itself is verified
      on 500 scalar cases before any big number trusts it.
    </p>
  ),

  picture: (
    <p>
      The courier trick from the Strassen unit, one domain earlier and
      eight years younger. Shipping a big consignment costs four
      standard sub-shipments; a clever clerk notices that one combined
      shipment, minus two you already paid for, contains exactly the
      two middle ones: three trucks where four seemed forced. Once is
      bookkeeping: recursively, every truck is itself packed the same
      way, and the fleet thins by (3/4) per level: 64 packages become
      48, 36, 27: the exponent is the compounding.
    </p>
  ),

  steps: [
    <>
      <strong>Split</strong> both numbers at the middle digit:
      x = a·B + b, y = c·B + d.
    </>,
    <>
      <strong>Three recursive products:</strong> ac, bd, and
      (a+b)(c+d).
    </>,
    <>
      <strong>Reassemble:</strong> ac·B² + [(a+b)(c+d) − ac − bd]·B +
      bd: the subtraction is the cross term, exactly (500 cases
      verified).
    </>,
    <>
      <strong>Carry once at the end:</strong> work on raw coefficient
      lists; normalize after: the standard implementation discipline.
    </>,
    <>
      <strong>Cut over honestly:</strong> below the measured crossover
      (128 digits here in op-counts; CPython hardcodes 70), the add tax
      outweighs the saved product: recurse to the threshold, not to 1.
    </>,
  ],

  signals: [
    <>
      <strong>Exact big-number arithmetic:</strong> cryptographic
      moduli, rationals, computer algebra: where floats are
      disqualified and n² hurts.
    </>,
    <>
      <strong>Mid-scale sizes:</strong> from the ~70-digit crossover to
      tens of thousands of digits: the band where Karatsuba is the
      reigning tool before FFT methods take over.
    </>,
    <>
      <strong>The recursion lesson itself:</strong> this identity is
      the cleanest instance of save-one-product-and-amplify: the shape
      Strassen exported to matrices.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the <strong>schoolbook grid</strong>:
      1,048,576 digit products at 1,024 digits: exactly n², asserted:
      and below the crossover it is genuinely better: the measured
      sweep shows Karatsuba&apos;s total ops (mults + adds) losing at
      every size up to 64 digits (4,719 vs 4,096) and first winning at
      128. CPython&apos;s hardcoded cutoff of 70 is this measurement,
      shipped.
    </>
  ),

  strength: (
    <>
      <strong>The exponent falls and the counts are exact.</strong>{' '}
      3^log₂n multiplications to the integer (asserted at four sizes);
      17.8× at a thousand digits, 1,000× at a million; the identity
      verified term-by-term; and agreement with the grown-up referee at
      every size tried, pure and cutoff variants both.
    </>
  ),
  weakness: (
    <>
      <strong>The add tax below the crossover, and a ladder
      above.</strong> Three products cost ~4n extra additions per
      level: measured losing until 128 digits: so production code
      recurses only to a threshold. And Karatsuba is a rung, not a
      summit: Toom-Cook&apos;s 5-for-9 wins next, and the FFT methods
      (measured against Karatsuba in the FFT unit: 4.4× at 8,192
      coefficients) own the astronomical sizes.
    </>
  ),

  problem: 'Big-integer multiplication',
  problemSlug: 'integer-multiplication',
  rivals: [
    {
      name: 'Karatsuba × three products',
      isThisUnit: true,
      algoName: 'Karatsuba multiplication',
      cost: 'O(n^1.585)',
      wins: (
        <>
          <strong>59,049 vs 1,048,576</strong> at 1,024 digits (both
          asserted exact); the reigning tool from ~70 digits to tens of
          thousands: what CPython actually runs.
        </>
      ),
      costs: (
        <>
          The add tax loses below the measured 128-digit crossover, and
          bigger rungs win above ~10⁴ digits.
        </>
      ),
      when: 'Exact mid-scale multiplication: crypto arithmetic, bignum libraries: the default rung.',
    },
    {
      name: 'Toom-Cook multiplication',
      cost: 'O(n^1.465)',
      wins: (
        <>
          The generalization: split in 3 (or k), evaluate-interpolate,
          5 products where 9 seemed forced: GMP&apos;s middle gears.
        </>
      ),
      costs: (
        <>
          Interpolation constants grow fast with k: each rung pays more
          overhead for a smaller exponent.
        </>
      ),
      when: 'The band between Karatsuba and FFT: roughly 10⁴ to 10⁵ digits in real libraries.',
    },
    {
      name: "Strassen's algorithm",
      cost: 'O(n^2.807) matrices',
      wins: (
        <>
          The same trick, exported: seven block products where eight
          seemed forced: a live unit here, and the clearest evidence
          that save-one-and-amplify is a <em>shape</em>, not a one-off.
        </>
      ),
      costs: (
        <>
          A different domain: its own page prices its own adds, caches,
          and stability.
        </>
      ),
      when: 'When the objects are matrices: and when teaching what this identity generalizes into.',
    },
    {
      name: 'Schönhage-Strassen × FFT rings',
      algoName: 'Schönhage-Strassen',
      cost: 'O(n log n · log log n)',
      wins: (
        <>
          The summit rung: exact convolution over modular rings: what
          GMP runs for million-digit operands: measured against
          Karatsuba at the polynomial level in the FFT unit.
        </>
      ),
      costs: (
        <>
          Heavy machinery profitable only past tens of thousands of
          words.
        </>
      ),
      when: 'Astronomical exact arithmetic: number theory records, cryptographic research scales.',
    },
  ],
  neverUse: {
    name: 'The grid at cryptographic scale',
    why: (
      <>
        A 4,096-bit modulus is ~1,233 decimal digits: the schoolbook
        grid pays ~1.5 million digit products <em>per
        multiplication</em>, and modular exponentiation performs
        thousands of them per handshake: against Karatsuba&apos;s ~78,000
        (3^log₂1233). The inverse trap is real too: recursing Karatsuba
        to single digits <em>below</em> the crossover loses to the grid
        (measured: 4,719 vs 4,096 at 64 digits): which is why every
        serious bignum library carries a threshold, and why
        CPython&apos;s says 70. The ladder has rungs in both
        directions: stand on the right one.
      </>
    ),
  },

  contest: {
    instance:
      'two random 1,024-digit integers; referee: Python’s own int product (which itself runs Karatsuba above 70 digits); counts asserted exact, not sampled',
    columns: ['digit mults', 'exactness'],
    rows: [
      {
        method: 'Schoolbook grid',
        values: ['1,048,576', '= n², asserted'],
        verdict: 'the honest floor, and the winner below the crossover',
      },
      {
        method: 'Karatsuba × 3 products',
        isThisUnit: true,
        values: ['59,049', '= 3¹⁰, asserted'],
        best: 0,
        verdict: '17.8× here, growing as n^0.415 forever',
      },
    ],
    source:
      "python solutions/karatsuba_three_products.py prints this table and asserts: Gauss's identity ((a+b)(c+d) − ac − bd = ad + bc) on 500 scalar cases; agreement with Python's int product at 200 random sizes for pure and cutoff-8 variants; both counters exact at four power-of-two sizes (n² and 3^log₂n to the integer); and the crossover measured by total primitive ops: the grid wins through 64 digits (4,096 vs 4,719) and Karatsuba first wins at 128: the measurement CPython ships as its cutoff of 70.",
  },

  figure: (
    <Figure
      id="fig-karatsuba-grid"
      aspect="16 / 7"
      caption="The grid, thinned by compounding. Schoolbook multiplication is the full n×n digit grid. Karatsuba covers the same product with three half-size grids: (3/4) of the area: and each of those thins the same way: 64 cells become 48, 36, 27: the exponent log₂3 is the compounding written as a power. Gauss's identity is what makes the middle grid legal: one combined product minus two already-paid ones is exactly the cross term."
      cite={{
        text: 'Karatsuba & Ofman, "Multiplication of multidigit numbers on automata", Doklady Akad. Nauk SSSR 145, 1962 (the 1960 seminar result Kolmogorov announced); the ladder above: Toom 1963/Cook 1966, Schönhage-Strassen 1971.',
        href: 'https://doi.org/10.1070/SM1963v001n01ABEH001003',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="An n by n digit grid beside its Karatsuba covering of three half-size grids, thinning each level">
        <g>
          {Array.from({ length: 8 }, (_, r) =>
            Array.from({ length: 8 }, (_, c) => (
              <rect key={`${r}-${c}`} x={40 + c * 17} y={60 + r * 17} width="15" height="15" fill="rgba(226,96,108,0.18)" stroke="#e2606c" strokeWidth="0.6" />
            )),
          )}
          <text x="40" y="48" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">schoolbook: 64 cells (n²)</text>
        </g>
        <g>
          {[[260, 60], [260, 129], [329, 60]].map(([x0, y0], g) =>
            Array.from({ length: 4 }, (_, r) =>
              Array.from({ length: 4 }, (_, c) => (
                <rect key={`${g}-${r}-${c}`} x={x0 + c * 17} y={y0 + r * 17} width="15" height="15" fill="rgba(240,185,75,0.2)" stroke="#f0b94b" strokeWidth="0.6" />
              )),
            ),
          )}
          <text x="260" y="48" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">3 half-grids: 48</text>
        </g>
        <g>
          {[[470, 60], [470, 95], [505, 60], [470, 130], [470, 165], [505, 130], [540, 60], [540, 95], [575, 60]].map(([x0, y0], g) =>
            Array.from({ length: 2 }, (_, r) =>
              Array.from({ length: 2 }, (_, c) => (
                <rect key={`${g}-${r}-${c}`} x={x0 + c * 16} y={y0 + r * 16} width="14" height="14" fill="rgba(98,217,138,0.22)" stroke="#62d98a" strokeWidth="0.6" />
              )),
            ),
          )}
          <text x="470" y="48" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">recurse: 36 → 27…</text>
        </g>
        <text x="40" y="232" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="12">(a+b)(c+d) − ac − bd = ad + bc: the middle grid, paid once</text>
        <text x="40" y="256" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">measured at 1,024 digits: 59,049 = 3¹⁰ exactly, vs 1,048,576 = n² exactly</text>
        <text x="40" y="276" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">crossover measured at 128 digits (op-count model) · CPython ships 70</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'karatsuba_three_products.py',
  Viz: KaratsubaViz,
  narration,
};
