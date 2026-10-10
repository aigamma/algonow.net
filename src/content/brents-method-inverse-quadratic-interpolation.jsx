import BrentViz from '../viz/BrentViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/brents_method_inverse_quadratic_interpolation.py?raw';
import { narration } from './brents-method-inverse-quadratic-interpolation.narration.js';

export const content = {
  given:
    'A continuous function f and a bracket [a, b] with f(a) and f(b) of opposite signs. Find the root to a tolerance with as few evaluations of f as possible, and with a guarantee that holds for every continuous f, not only the smooth ones.',
  task: 'Brent’s method. The algorithm is bracketing: keep an interval that provably contains a root and shrink it, bisection’s invariant. The heuristic is inverse quadratic interpolation (Brent 1973, on Dekker 1969): fit the sideways parabola x = P(y) through the last three points, read it at y = 0, and take that as the next guess; fall back to the secant line when two points coincide, and to a bisection step whenever the interpolated step would leave the bracket, fails to shrink fast enough (it must be less than half the step before last), or is smaller than the tolerance. Superlinear convergence (order about 1.84) on smooth functions, and never more than about the square of bisection’s count on any continuous function.',
  constraint:
    'Measured on nine bracketed problems at tolerance 10⁻¹², every answer checked against a bisection run to the last bit and the published digits: on six smooth functions (cos x = x, Wallis’s cubic, √2, e, the omega constant, sin x = x/2) Brent needs 7 to 9 evaluations, 49 in total, against 253 for bisection, 62 for Illinois regula falsi, 54 for Dekker’s method, and 144 for Ridders’ method; the measured order of its interpolation steps reaches 1.88 and 2.08. On a signed cube root, where Newton’s method doubles its distance every step and the secant method diverges, Brent takes 33 evaluations (31 secant steps, bisection fallbacks) against 43 for bisection. On e^x − 1 over [−40, 60] it takes 18 (6 bisection fallbacks) against 109 for Illinois and a false convergence for the plain secant method, which stops after 3 evaluations at x = 60. On the triple root (x − 0.3)³ it loses: 102 against 42 for bisection and 68 for Ridders, inside its guarantee of 1,670.',

  origins: (
    <p>
      Theodorus Dekker (<strong>1969</strong>) combined the secant step with
      bisection so that a root finder could be both fast and safe, and
      Richard Brent (<strong>1973</strong>, Algorithms for Minimization
      without Derivatives, chapter 4) found the case where Dekker&apos;s
      method crawls, added inverse quadratic interpolation and the rule
      that a step must at least halve the step before last, and proved the
      bound of about the square of bisection&apos;s count. His zeroin became
      the root finder of Forsythe, Malcolm, and Moler&apos;s textbook (1977),
      of MATLAB&apos;s fzero, of Netlib, of SciPy&apos;s brentq, and of
      Boost; Alefeld, Potra, and Shi (1995) refined the interpolation into
      TOMS algorithm 748. Ridders (1979) offered the rival exponential
      rescaling, and the Illinois modification of regula falsi (Dowell and
      Jarratt 1971) is the older safe method it is usually compared with.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>bracket</strong>: three points a, b, c with b the
      best estimate and c always on the other side of the root from b,
      so the interval [b, c] contains a root at every iteration whatever
      the function does. The referee is a bisection run to the last
      floating-point bit on every function, and the published digits of
      the six known roots: every Brent answer lands within 10⁻¹⁰ of
      both, and the bracket at the end always contains the root. The
      bound is a theorem: at most about (log₂((b − a)/tol))² evaluations
      for any continuous f, 1,670 to 2,257 on these problems,{' '}
      <strong>never exceeded</strong>.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>speed</strong>: the sideways parabola through the
      last three points, read at y = 0, converges with order about 1.84
      on a smooth function, measured here at 1.88 and 2.08 on cos x = x,
      so the six smooth roots cost{' '}
      <strong>7 to 9 evaluations against 42 for bisection</strong>. The
      safeguards decide when not to trust it: on the cube root every
      parabola is rejected (0 inverse quadratic steps, 31 secant steps
      with bisection fallbacks, 33 evaluations), and on the wide e^x − 1
      bracket 6 bisection steps rescue the 8 secant and 2 parabola
      steps, 18 in all where Illinois needs 109.
    </p>
  ),

  picture: (
    <p>
      A surveyor looking for where a buried pipe crosses a line, with one
      stake on each side of it. With three soundings she fits a curve and
      walks straight to where it predicts the crossing, which usually
      lands within inches. But every step is checked against two rules
      before she takes it: it must stay between the stakes, and it must
      be at least twice as short as the step before last. The moment a
      prediction fails either rule she ignores the curve and walks to the
      midpoint instead. The stakes never stop closing in; the curve only
      decides how fast.
    </p>
  ),

  steps: [
    <>
      <strong>Arrange:</strong> b is the point with the smaller |f|, c
      the contrapoint (opposite sign), a the previous b; if the bracket
      [b, c] is narrower than the tolerance, return b.
    </>,
    <>
      <strong>Propose:</strong> if a, b, c are distinct, inverse quadratic
      interpolation through the three points; if two coincide, the secant
      through (a, b).
    </>,
    <>
      <strong>Guard:</strong> accept the proposal only if it lies inside the
      bracket (short of 3/4 of the way to c) and is less than half the
      step before last; otherwise take the midpoint of [b, c].
    </>,
    <>
      <strong>Step:</strong> evaluate f at the new point (at least a
      tolerance away from b, so no step is wasted); update a, b, c and
      the sign of the contrapoint.
    </>,
    <>
      <strong>Repeat:</strong> every rejected proposal halves the bracket,
      so the count is bounded by roughly bisection&apos;s count squared
      whatever f does.
    </>,
  ],

  signals: [
    <>
      <strong>A bracket and no derivative:</strong> any continuous f you
      can evaluate, from a black box or a simulation; sign change known.
    </>,
    <>
      <strong>Evaluations are the cost:</strong> each f is a simulation or
      a solve, so 8 evaluations against 42 is the whole budget.
    </>,
    <>
      <strong>It must never fail:</strong> library code, a solver inside a
      loop, no human watching: the guarantee is the reason it is the
      default.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>bisection</strong>: halve the bracket,
      keep the half with the sign change. 42 evaluations for 10⁻¹² on
      a unit interval, on every function alike, and it wins on the triple
      root (42 against 102).
    </>
  ),

  strength: (
    <>
      <strong>Superlinear when it can be, safe when it cannot.</strong> 49
      evaluations for six smooth roots against 253 for bisection; 33 on
      the cube root that breaks Newton and the secant; 18 on the wide
      bracket where Illinois needs 109; a theorem bounding the count for
      every continuous f, never exceeded.
    </>
  ),
  weakness: (
    <>
      <strong>Multiple roots and no derivative information.</strong> On
      (x − 0.3)³ every interpolation is nearly useless: 102 evaluations
      against 42 for bisection and 68 for Ridders. It needs a bracket, so a
      root the sign change does not reveal (a touching root) is invisible
      to it, and it finds one root, not all of them. Newton with a known
      derivative is faster per iteration where it converges.
    </>
  ),

  problem: 'Root finding',
  problemSlug: 'root-finding',
  rivals: [
    {
      name: 'Brent’s method × Inverse quadratic interpolation',
      isThisUnit: true,
      algoName: "Brent's method",
      cost: 'one evaluation per step; no derivative',
      wins: (
        <>
          <strong>7 to 9 evaluations on smooth roots</strong>, 33 on the
          cube root, 18 on the wide bracket; a bound for every continuous f.
        </>
      ),
      costs: (
        <>
          102 on a triple root against 42 for bisection.
        </>
      ),
      when: 'A bracket, a black-box f, and a need for both speed and a guarantee: the default.',
    },
    {
      name: 'Bisection method',
      algoName: 'Bisection method',
      cost: 'one evaluation per halving',
      wins: (
        <>
          42 evaluations for 10⁻¹² on any function alike; the simplest
          guarantee; the best on the triple root.
        </>
      ),
      costs: (
        <>
          253 against 49 on the six smooth roots.
        </>
      ),
      when: 'The function is cheap, or ugly enough that interpolation never pays.',
    },
    {
      name: 'Ridders’ method',
      algoName: "Ridders' method",
      cost: 'two evaluations per step',
      wins: (
        <>
          Exponential rescaling gives order √2 per evaluation; 68 on the
          triple root against Brent&apos;s 102.
        </>
      ),
      costs: (
        <>
          144 against 49 on the smooth six under the bracket criterion
          (82 on Wallis&apos;s cubic, the bracket shrinking slowly).
        </>
      ),
      when: 'A compact bracketing method with a clean convergence story; rarely faster in practice.',
    },
    {
      name: 'Newton’s method',
      algoName: "Newton's method",
      cost: 'f and f′ per step',
      wins: (
        <>
          Quadratic convergence: 10 to 12 evaluations on the smooth six
          counting the derivative; the fewest iterations.
        </>
      ),
      costs: (
        <>
          No bracket: doubles its error every step on the cube root (fails
          at 44 evaluations); 126 on the triple root.
        </>
      ),
      when: 'The derivative is cheap and the start is inside the basin.',
    },
  ],
  neverUse: {
    name: 'An unbracketed method stopped by the size of its step',
    why: (
      <>
        The secant method on e^x − 1 over [−40, 60] stops after{' '}
        <strong>3 evaluations at x = 60, an error of 40</strong>: its first
        step is tiny because f(60) is astronomically large, not because
        the root is near, and &quot;step below tolerance&quot; is the only
        test it has. Told to stop the same way, the Illinois and Dekker
        methods do the same thing (4 and 3 evaluations, error 40), and
        Newton on the signed cube root goes 0.4, 0.1, 0.7, −0.5, 1.9,
        doubling its distance from the root at 0.3 on every step until it
        fails. Brent stops only when the bracket is narrower than the
        tolerance, a test the function cannot fool, and the safeguards
        make sure the bracket gets there.
      </>
    ),
  },

  contest: {
    instance:
      'nine bracketed root problems at tolerance 10⁻¹² (six smooth functions with published roots, a signed cube root, e^x − 1 over [−40, 60], and the triple root (x − 0.3)³); one currency: function evaluations, a derivative counting as one; bracketing methods stop on the bracket width, the secant and Newton on their step; referee: bisection to the last bit and the published digits',
    columns: ['smooth six (total)', 'cube root', 'e^x − 1, wide', 'triple root'],
    rows: [
      {
        method: 'Brent (inverse quadratic + safeguards)',
        isThisUnit: true,
        values: ['49', '33', '18', '102'],
        best: 0,
        verdict: 'bound 1,670 to 2,257, never exceeded',
      },
      {
        method: 'bisection',
        values: ['253', '43', '49', '42'],
        best: 3,
        verdict: 'the baseline; wins the triple root',
      },
      {
        method: 'regula falsi (Illinois)',
        values: ['62', '34', '109', '111'],
        verdict: 'safe, slow on the wide bracket',
      },
      {
        method: 'Dekker (no safeguards)',
        values: ['54', '34', '16', '168'],
        verdict: 'the predecessor',
      },
      {
        method: 'Ridders',
        values: ['144', '40', '20', '68'],
        verdict: 'two evaluations a step',
      },
      {
        method: 'secant (unbracketed)',
        values: ['48', 'diverges', '3, stops at x = 60 (error 40)', '92'],
        verdict: 'fast or wrong',
      },
      {
        method: 'Newton (with f′)',
        values: ['64', 'diverges (×2 per step)', '32', '126'],
        verdict: 'needs the basin',
      },
    ],
    source:
      'python solutions/brents_method_inverse_quadratic_interpolation.py prints this table and asserts: every bracketing method within 10⁻⁹ of the bisection referee on all nine functions and Brent within 10⁻¹⁰; Brent under the (log2((b − a)/tol) + 1)² guarantee on every function and under three times bisection on the hard three; under a third of bisection on each smooth function; interpolation order above 1.6 on cos x = x and bisection at exactly order 1 with ratio 1/2; Newton and the secant failing on the cube root; Newton doubling its distance to the root on every step; Illinois and Dekker stopping with error above 1 under the step criterion on the wide bracket while Ridders does not; the triple root costing Brent more than a simple root; and Brent at or under Dekker, Ridders, Illinois, and bisection in total over the smooth six.',
  },

  figure: (
    <Figure
      id="fig-brent-steps"
      aspect="16 / 7"
      caption="Left: the three step kinds on three functions, one square per evaluation, in order: blue is an inverse quadratic step, amber a secant step, red a bisection fallback. On cos x = x the parabola is trusted from the third point and the root is found in 8 evaluations; on the signed cube root every parabola fails the half-step rule and the method alternates secant steps with bisection; on the wide e^x − 1 bracket six bisections carry the method from the flat far end into the region where interpolation works. Right: total evaluations on the six smooth problems."
      cite={{
        text: 'R. P. Brent, Algorithms for Minimization without Derivatives, Prentice-Hall, 1973, chapter 4 (zeroin). T. J. Dekker, "Finding a zero by means of successive linear interpolation," in Constructive Aspects of the Fundamental Theorem of Algebra, 1969. G. E. Forsythe, M. A. Malcolm, and C. B. Moler, Computer Methods for Mathematical Computations, 1977. G. E. Alefeld, F. A. Potra, and Y. Shi, "Algorithm 748," ACM TOMS 21(3), 1995, DOI 10.1145/210089.210111.',
        href: 'https://doi.org/10.1145/210089.210111',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="Rows of colored squares showing the kind of each Brent step on three functions, beside bars of total evaluations for five methods on six smooth problems">
        {(() => {
          const color = { i: '#5da2ff', s: '#f0b94b', b: '#e2606c' };
          const rows = [
            ['cos x = x (8)', 'ssissis'],
            ['cbrt(x − 0.3) (33)', 'sbsbsbsbsbsbsbsbsbsbsbsbsbsbsbss'],
            ['e^x − 1 on [−40, 60] (18)', 'sbbbbbbssssssiis'],
          ];
          const bars = [['Brent', 49, '#5da2ff'], ['Dekker', 54, '#f0b94b'], ['Illinois', 62, '#f0b94b'], ['Ridders', 144, '#9aa5bd'], ['bisection', 253, '#e2606c']];
          const bx = 420;
          const by = 236;
          const hgt = (v) => (v / 260) * 180;
          return (
            <g>
              <text x="20" y="22" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">one square per step after the two bracket ends: blue parabola, amber secant, red bisection</text>
              {rows.map(([label, kinds], r) => (
                <g key={label}>
                  <text x="20" y={60 + r * 60} fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="10">{label}</text>
                  {kinds.split('').map((k, i) => (
                    <rect key={i} x={20 + i * 11} y={68 + r * 60} width="9" height="14" fill={color[k]} fillOpacity="0.9" />
                  ))}
                </g>
              ))}
              <text x="20" y="250" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">the half-step rule rejects every parabola on the cube root;</text>
              <text x="20" y="264" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">on the wide bracket bisection does the long walk first</text>
              <text x={bx} y="22" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">evaluations, six smooth roots, total</text>
              {bars.map(([name, v, c], i) => (
                <g key={name}>
                  <rect x={bx + i * 42} y={by - hgt(v)} width="30" height={hgt(v)} fill={c} fillOpacity="0.85" />
                  <text x={bx + i * 42} y={by - hgt(v) - 4} fill={c} fontFamily="ui-monospace, monospace" fontSize="9">{v}</text>
                  <text x={bx + i * 42} y={by + 12} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="8">{name}</text>
                </g>
              ))}
              <text x={bx} y="262" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">secant 48 and Newton 64 where they converge</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'brents_method_inverse_quadratic_interpolation.py',
  Viz: BrentViz,
  narration,
};
