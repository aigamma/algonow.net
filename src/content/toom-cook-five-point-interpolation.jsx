import ToomViz from '../viz/ToomViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/toom_cook_five_point_interpolation.py?raw';
import { narration } from './toom-cook-five-point-interpolation.narration.js';

export const content = {
  given:
    'Two n-digit integers to multiply exactly: one rung above the live Karatsuba unit on the fast-arithmetic ladder.',
  task: 'The exact product, in asymptotically fewer digit multiplications than Karatsuba’s n^1.585.',
  constraint:
    'Split into three limbs and the product is a degree-4 polynomial: nine limb products, naively. The way out is a fact about polynomials, not arithmetic: five points pin a quartic. The referees: Python’s own product on 300 pairs, the interpolation identity on 500 scalar quartics, and counts asserted to the integer: 5^k exactly.',

  origins: (
    <p>
      Andrei <strong>Toom</strong>, 1963, Moscow: a direct escalation
      of Karatsuba&apos;s 1960 result from the same Kolmogorov
      seminar orbit: and Stephen <strong>Cook</strong>, whose 1966
      Harvard thesis systematized it into the evaluate-multiply-
      interpolate family that bears both names. The scheme
      generalizes: Toom-k splits into k limbs for 2k−1 products:
      exponent log_k(2k−1), sliding toward 1: and its modern form is
      Bodrato&apos;s 2007 optimal operation sequences, the ones GMP
      ships. On this site&apos;s ladder it stands between the live
      Karatsuba unit and the live FFT: the last rung where the
      arithmetic stays exact integers all the way down.
    </p>
  ),

  algoRole: (
    <p>
      Owns <strong>split-and-recurse</strong>: write each factor as a
      degree-2 polynomial in the base, x = a₀ + a₁B + a₂B², so the
      product is a degree-4 polynomial in B: whose coefficients,
      naively, cost all <strong>nine</strong> limb products a₀b₀
      through a₂b₂. Recursion at nine would land right back on n²:
      the count that must fall is the number of sub-multiplications,
      and everything else: additions, small scalings, exact
      divisions: is bookkeeping the recursion forgives.
    </p>
  ),
  heurRole: (
    <p>
      Supplies <strong>evaluation-interpolation</strong>: a degree-4
      polynomial is pinned by five points, so evaluate both factors
      at 0, 1, −1, 2, ∞, multiply <em>pointwise</em>: five recursive
      calls, not nine: and solve the fixed 5×5 system back to
      coefficients. The divisions by 2 and 3 in that unwinding are
      exact, and this page asserts every remainder is zero. Measured:{' '}
      <strong>5^k exactly</strong> at n = 3^k (15,625 at 729 digits,
      against Karatsuba&apos;s 59,049 and the grid&apos;s 531,441):
      exponent log₃5 = 1.465.
    </p>
  ),

  picture: (
    <p>
      Two curves you cannot see whole: but can measure anywhere.
      Multiplying polynomials coefficient-by-coefficient is a tangle
      of cross terms: nine of them: but multiplying their{' '}
      <em>values</em> at one point is a single number times a single
      number. So take the tangle to a place where multiplication is
      trivial: sample both curves at five posts, multiply heights
      post by post, and you hold five points of the product curve:
      which, being a quartic, is <em>completely determined</em> by
      them. Thread the unique quartic back through and read off its
      coefficients. The live FFT unit is this same picture taken to
      its limit: n points, roots of unity, the transform as the
      post-placer. Toom-3 is the hand-held version: five posts, one
      little linear system, integers all the way.
    </p>
  ),

  steps: [
    <>
      <strong>Split:</strong> each factor into three limbs: a
      degree-2 polynomial in the base B.
    </>,
    <>
      <strong>Evaluate</strong> both at 0, 1, −1, 2, ∞: five numbers
      each: adds and small doublings only.
    </>,
    <>
      <strong>Multiply pointwise:</strong> five recursive products of
      third-size numbers: this is the whole spend.
    </>,
    <>
      <strong>Interpolate:</strong> the fixed 5×5 unwind: divisions
      by 2 and 3, every remainder asserted zero.
    </>,
    <>
      <strong>Recompose</strong> with shifts and adds: c₀ + c₁B +
      c₂B² + c₃B³ + c₄B⁴: carries propagate once at the end.
    </>,
  ],

  signals: [
    <>
      <strong>Past Karatsuba, before FFT:</strong> operands of
      hundreds to thousands of words: GMP&apos;s own Toom-3 window:
      where 1.465 beats 1.585 and float rounding is unwelcome.
    </>,
    <>
      <strong>Exactness is non-negotiable:</strong> integer-only
      steps with asserted-exact divisions: no FFT precision analysis,
      no probabilistic anything.
    </>,
    <>
      <strong>The pattern itself:</strong> evaluate where the
      operation is cheap, interpolate back: the identity behind
      secret sharing, Reed-Solomon, and the FFT: worth owning in its
      five-point form.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the <strong>schoolbook grid</strong>:
      531,441 digit products at n = 729, no questions asked: and the
      honest sibling is the live <strong>Karatsuba</strong> unit:
      59,049 at the same task (padded to 1024): whose three-product
      trick is exactly this unit&apos;s machinery at two limbs and
      three points (0, 1, ∞). Toom-3 is not a different idea: it is
      the same idea, told at degree 2, one rung higher.
    </>
  ),

  strength: (
    <>
      <strong>An exact 34× at 729 digits, with every step
      refereed.</strong> Counts landed on 5^k to the integer for k =
      3..6; the five-point identity recovered 500 random quartics
      coefficient-exact; every division by 2 and 3 asserted
      remainder-zero; 300 mixed products matched Python&apos;s own
      int. And the add-inclusive accounting still favors it: 239,065
      total coefficient ops against Karatsuba&apos;s 407,199 at n =
      729.
    </>
  ),
  weakness: (
    <>
      <strong>Overhead constants, and a ceiling the FFT removes.</strong>{' '}
      The interpolation unwind is real bookkeeping: in our
      coefficient-op meter Toom wins from n = 9, but in GMP&apos;s
      word-level reality the threshold sits near a hundred machine
      words: the gap between op-count models and hardware is itself
      the lesson (the live Karatsuba page measured the same gap as
      128 vs CPython&apos;s 70). And the ladder keeps climbing:
      Toom-k&apos;s exponent slides toward 1 but never reaches it:
      past tens of thousands of digits, the live FFT unit&apos;s
      n log n takes the crown.
    </>
  ),

  problem: 'Integer multiplication',
  problemSlug: 'integer-multiplication',
  rivals: [
    {
      name: 'Toom-3 × five points',
      isThisUnit: true,
      algoName: 'Toom-Cook multiplication',
      cost: 'n^1.465',
      wins: (
        <>
          <strong>15,625 digit mults at 729 digits</strong>: 5^6
          exactly: 3.8× under Karatsuba, 34× under the grid, integers
          and asserted-exact divisions all the way.
        </>
      ),
      costs: (
        <>
          The 5×5 unwind&apos;s bookkeeping: real-world thresholds sit
          near 100 machine words, far above our op-meter&apos;s n = 9.
        </>
      ),
      when: 'The GMP middle window: hundreds to thousands of words, exactness required.',
    },
    {
      name: 'Karatsuba × three products',
      algoName: 'Karatsuba multiplication',
      cost: 'n^1.585',
      wins: (
        <>
          The live rung below: simpler unwind (no divisions at all),
          smaller constants, the right tool from ~70 digits
          (CPython&apos;s own shipped cutoff).
        </>
      ),
      costs: (
        <>
          3.78× more sub-multiplications at 729 digits, measured by
          the same counter: the exponent gap compounds.
        </>
      ),
      when: 'Small-to-medium operands, and as the base case Toom recursions bottom out into.',
    },
    {
      name: 'FFT × roots of unity',
      algoName: 'Fast Fourier transform',
      cost: 'n log n',
      wins: (
        <>
          The live unit at the top of the ladder: evaluation-
          interpolation at <em>all n points at once</em>: unbeatable
          past tens of thousands of digits.
        </>
      ),
      costs: (
        <>
          Floating-point error analysis or number-theoretic transforms:
          machinery Toom&apos;s exact integers never need.
        </>
      ),
      when: 'Huge operands: the same idea this unit teaches, taken to its limit.',
    },
    {
      name: 'Schönhage-Strassen',
      algoName: 'Schönhage-Strassen',
      cost: 'n log n log log n',
      wins: (
        <>
          The exact-arithmetic FFT: number-theoretic transforms mod
          Fermat numbers: GMP&apos;s choice when operands hit tens of
          thousands of words.
        </>
      ),
      costs: (
        <>
          Heavy machinery with real constants: nobody rederives it at
          a whiteboard.
        </>
      ),
      when: 'Million-digit exact products: cryptographic and mathematical computing at scale.',
    },
  ],
  neverUse: {
    name: 'Nine limb products out of pride',
    why: (
      <>
        Split into three limbs and multiply every pair: it feels like
        progress: the numbers got smaller!: and the recursion
        T(n) = 9T(n/3) solves to <strong>exactly n²</strong>: the
        schoolbook grid wearing a recursion costume, plus splitting
        overhead for nothing. This page&apos;s counter makes it
        concrete: nine-way recursion at 729 digits would pay the full
        531,441, against five-way&apos;s 15,625. The count that must
        fall is <em>sub-multiplications</em>: additions are forgiven,
        products are not: and any splitting scheme that does not cut
        the product count below the naive k² is decoration. It is
        the same lesson the live Karatsuba page teaches at two limbs:
        the split is nothing; the identity that deletes products is
        everything.
      </>
    ),
  },

  contest: {
    instance:
      'two 729-digit integers, multiplied exactly; referee: Python’s own product, plus the five-point identity on 500 scalar quartics, plus remainder-zero asserts on every division',
    columns: ['digit mults', 'exponent'],
    rows: [
      {
        method: 'Schoolbook grid',
        values: ['531,441', 'n²'],
        verdict: 'every limb pair, no questions asked: 729² exactly',
      },
      {
        method: 'Karatsuba (live unit)',
        values: ['59,049', 'n^1.585'],
        verdict: '3^10 exactly, padded to 1024: the rung below',
      },
      {
        method: 'Toom-3 (this unit)',
        isThisUnit: true,
        values: ['15,625', 'n^1.465'],
        best: 0,
        verdict: '5^6 exactly at 729 = 3^6: five points pin the quartic',
      },
    ],
    source:
      "python solutions/toom_cook_five_point_interpolation.py prints this table and asserts: the interpolation identity recovering 500 random quartics coefficient-exact; 300 mixed products equal to Python's own int; counts of 5^k exactly for k = 3..6; the 729-digit three-way race (531,441 / 59,049 / 15,625, all asserted to the integer); every division by 2 and 3 remainder-zero; and the add-inclusive accounting (Toom 239,065 vs Karatsuba 407,199 at n = 729, crossover in our op meter at n = 9: real GMP thresholds near 100 words, the model-vs-hardware gap stated honestly).",
  },

  figure: (
    <Figure
      id="fig-toom-five-points"
      aspect="16 / 7"
      caption="Five posts pin a quartic. Multiplying polynomials coefficient-wise is nine cross products; multiplying their values at a point is one number times one number. Evaluate both factors at 0, 1, −1, 2, ∞, multiply heights post by post, and the five product points determine the degree-4 product polynomial completely: interpolate back with a fixed 5×5 unwind whose divisions by 2 and 3 are exact (asserted). Five recursive multiplications instead of nine: the exponent falls from log₂3 = 1.585 to log₃5 = 1.465."
      cite={{
        text: 'Toom 1963 (Moscow) and Cook 1966 (Harvard thesis) built the family; Bodrato, "Towards Optimal Toom-Cook Multiplication", WAIFI 2007, gives the operation sequences GMP ships. The rung between the live Karatsuba and FFT units.',
        href: 'https://doi.org/10.1007/978-3-540-73074-3_10',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="Two quadratic curves sampled at five posts with the product quartic threaded through the five product points">
        <line x1="40" y1="150" x2="600" y2="150" stroke="#2a3450" />
        <path d="M 60 120 Q 200 40, 380 95 T 600 60" fill="none" stroke="#5da2ff" strokeWidth="2" />
        <path d="M 60 135 Q 240 100, 420 125 T 600 105" fill="none" stroke="#8b95ad" strokeWidth="1.8" />
        {[120, 230, 340, 450].map((x, i) => (
          <g key={i}>
            <line x1={x} y1={40} x2={x} y2={150} stroke="#f0b94b" strokeWidth="1.6" strokeDasharray="5 4" />
            <text x={x - 8} y={168} fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">{['0', '1', '−1', '2'][i]}</text>
          </g>
        ))}
        <rect x="530" y="46" width="58" height="20" rx="4" fill="none" stroke="#f0b94b" />
        <text x="538" y="60" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">x = ∞</text>
        <path d="M 60 240 Q 180 190, 300 225 T 600 200" fill="none" stroke="#62d98a" strokeWidth="2" />
        {[120, 230, 340, 450, 560].map((x, i) => (
          <circle key={i} cx={x} cy={[228, 205, 222, 212, 203][i]} r="4" fill="#62d98a" />
        ))}
        <text x="60" y="262" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">the product quartic: five points, completely pinned: interpolate and read the limbs</text>
        <text x="60" y="30" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">A(x), B(x): heights multiply post by post · 5 recursive products, not 9</text>
        <text x="60" y="284" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">measured at 729 digits: grid 531,441 · Karatsuba 59,049 · Toom-3 15,625 (5⁶, exact)</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'toom_cook_five_point_interpolation.py',
  Viz: ToomViz,
  narration,
};
