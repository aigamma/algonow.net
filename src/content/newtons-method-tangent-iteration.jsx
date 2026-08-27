import NewtonViz from '../viz/NewtonViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/newtons_method_tangent_iteration.py?raw';
import { narration } from './newtons-method-tangent-iteration.narration.js';

export const content = {
  given:
    'A differentiable function f and a starting guess.',
  task: 'A root of f, to machine precision and beyond, in a handful of steps.',
  constraint:
    'The promise is quadratic convergence: correct digits DOUBLE per iteration: and this page measures it as a literal digit ladder in 60-digit arithmetic: 1, 2, 5, 11, 24, 48. The catch is the basin: outside it the same formula cycles forever or runs away at an exact factor of −2 per step, both measured.',

  origins: (
    <p>
      Newton described the idea around <strong>1669</strong> (on
      polynomials, without the calculus notation); Raphson simplified it
      to the modern iterate in 1690, and Simpson generalized to
      arbitrary f with derivatives in 1740: the name &quot;Newton&apos;s
      method&quot; compresses three people. Its first great client was{' '}
      <strong>Kepler&apos;s equation</strong> (solved here at
      comet-grade eccentricity in 6 steps): astronomy ran on this
      iterate for two centuries. Today it is inside every square root
      your hardware computes, every implied volatility a trading desk
      backs out, and (as Newton&apos;s method on f′) the second-order
      core of optimization. Cayley asked in 1879 which starting points
      lead where: the answer, in the complex plane, is the Newton
      fractal.
    </p>
  ),

  algoRole: (
    <p>
      Owns <strong>iterate-and-refine</strong>: replace the guess with a
      better one until the residual dies. The frame is broader than any
      one update rule: bisection, secant, and fixed-point iteration all
      live in it: and the frame&apos;s honest question is always the
      same: <em>how much better per step, at what cost per step, and
      from which starting points?</em> This page answers all three with
      counters.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>tangent line</strong>. Pretend f <em>is</em>{' '}
      its tangent at the current guess and jump to where that line
      crosses zero: x ← x − f(x)/f′(x). Near a simple root the pretense
      is nearly true, and the error is <em>squared</em> each step:
      the measured ladder runs 1, 2, 5, 11, 24, 48 correct digits.
      Six steps of arithmetic buy what bisection needs forty for: the
      linearization is the entire engine.
    </p>
  ),

  picture: (
    <p>
      Descending a foggy hillside to find the shoreline. Bisection is a
      surveyor with a rope: guaranteed, and one digit of shoreline per
      three-and-a-bit halvings. Newton looks at the slope under his
      feet, assumes the hill continues as a perfect ramp, and{' '}
      <em>strides</em> to where that ramp meets the water: near the
      shore the hill really is ramp-like, so each stride lands almost
      exactly, and the miss squares away. But stand on a ledge where
      the slope points wrong: the same confident stride hurls you{' '}
      <em>up</em> the mountain: twice as far out, every time,
      measured.
    </p>
  ),

  steps: [
    <>
      <strong>Evaluate</strong> f(x) and f′(x) at the current guess.
    </>,
    <>
      <strong>Jump along the tangent:</strong> x ← x − f(x)/f′(x).
    </>,
    <>
      <strong>Stop on residual:</strong> |f(x)| below tolerance: five
      iterations for √2 at 10⁻¹².
    </>,
    <>
      <strong>Guard the pathologies:</strong> f′ ≈ 0 catapults, cycles
      repeat states, runaways grow: detect all three (the gadgets here
      do, exactly).
    </>,
    <>
      <strong>In production, bracket:</strong> Brent&apos;s hybrid keeps
      bisection&apos;s guarantee and grabs superlinear steps when safe:
      the shipping default.
    </>,
  ],

  signals: [
    <>
      <strong>Derivatives are cheap and honest:</strong> closed forms,
      autodiff: the tangent is half the price of the step, so it had
      better be real.
    </>,
    <>
      <strong>A good starting point exists:</strong> warm starts,
      physical priors, yesterday&apos;s answer: quadratic convergence
      is a local promise.
    </>,
    <>
      <strong>Precision is the product:</strong> machine-epsilon roots
      in single-digit iterations: Kepler solvers, volatility
      extraction, hardware sqrt.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>bisection</strong>: 40 iterations
      and 41 evaluations for the same root, utterly indifferent to the
      function&apos;s mood: it needs only a sign change and delivers a
      guaranteed digit per ~3.3 halvings. Everything Newton wins, it
      wins by <em>assuming more</em> (a derivative, a decent start), and
      everything it risks, it risks for the same reason.
    </>
  ),

  strength: (
    <>
      <strong>Digits double, measured beyond floats.</strong> The
      60-digit ladder 1 → 2 → 5 → 11 → 24 → 48 is the quadratic law as
      raw data; √2 to 10⁻¹² in five iterations; Kepler at e = 0.9 in
      six; an IRR in five, cross-checked by bisection to 10⁻⁹. When the
      basin holds, nothing classical is faster per iteration.
    </>
  ),
  weakness: (
    <>
      <strong>The basin is the fine print, and the secant wins
      per-eval.</strong> x³−2x+2 from 0 cycles 0 → 1 → 0 literally
      forever (asserted); ∛x from anywhere obeys x ← −2x exactly:
      doubling its miss each step (asserted to the factor). Each
      iteration costs two evaluations, so the derivative-free secant
      (order 1.618) beat Newton on total evals here, 8 to 11: the
      classic footnote, kept. And a flat f′ near the guess catapults.
    </>
  ),

  problem: 'Root finding',
  problemSlug: 'root-finding',
  rivals: [
    {
      name: "Newton's method × tangent iteration",
      isThisUnit: true,
      algoName: "Newton's method",
      cost: 'order 2, two evals/step',
      wins: (
        <>
          <strong>5 iterations</strong> to 10⁻¹², the digit-doubling
          ladder measured to 48 digits, and the generalization that
          powers optimization (on f′) and hardware sqrt.
        </>
      ),
      costs: (
        <>
          Needs f′, needs a basin, and pays two evals per step: the
          secant undercut it 8 to 11 here.
        </>
      ),
      when: 'Cheap honest derivatives and warm starts: solvers, calibration loops, anything run repeatedly near its answer.',
    },
    {
      name: 'Bisection method',
      cost: 'order 1 (linear)',
      wins: (
        <>
          <strong>Unconditional</strong>: a sign change is its only
          demand, and the 40-iteration bill is exactly predictable to
          any tolerance.
        </>
      ),
      costs: (
        <>
          One bit per step, forever: 41 evaluations where Newton spent
          11: and it cannot find roots that do not cross.
        </>
      ),
      when: 'Hostile or unknown functions, guaranteed-progress requirements, and as the safety net inside hybrids.',
    },
    {
      name: 'Secant method',
      cost: 'order 1.618, one eval/step',
      wins: (
        <>
          Derivative-free, and <strong>the per-evaluation winner
          here: 8 evals to Newton&apos;s 11</strong>: order 1.618 with
          single evals beats order 2 with doubles (1.618 &gt; √2).
        </>
      ),
      costs: (
        <>
          Slightly more iterations, no guarantee, and the same basin
          fragility as its tangent-drawing parent.
        </>
      ),
      when: 'Derivatives unavailable or expensive: the quiet default for black-box scalar roots.',
    },
    {
      name: "Brent's method × inverse quadratic",
      algoName: "Brent's method",
      cost: 'superlinear, bracketed',
      wins: (
        <>
          The production answer: keeps bisection&apos;s bracket
          guarantee, steals secant/inverse-quadratic speed when safe:
          what scipy&apos;s brentq ships.
        </>
      ),
      costs: (
        <>
          Needs an initial bracket, and its bookkeeping is nobody&apos;s
          idea of five lines. (Halley&apos;s cubic-order variant exists
          for the derivative-rich.)
        </>
      ),
      when: 'Production scalar root-finding, full stop: unguarded Newton is for basins you own.',
    },
  ],
  neverUse: {
    name: 'Unguarded Newton on a function you have not met',
    why: (
      <>
        The failure gadgets are three lines each and all measured:
        x³−2x+2 from 0 cycles 0 → 1 → 0 <em>literally forever</em>{' '}
        (asserted as state repetition); ∛x from any start obeys
        x ← −2x exactly, doubling its distance each step; a
        near-zero f′ catapults the iterate across the landscape. None
        raise errors: the iterate just never converges, silently
        burning your iteration budget. Brent&apos;s bracketed hybrid
        costs one extra requirement (a sign change) and removes the
        entire failure class: in production, own the basin or rent the
        bracket.
      </>
    ),
  },

  contest: {
    instance:
      'x² − 2 = 0 to 10⁻¹² (plus the 60-digit decimal ladder); iterations and function evaluations counted; referees: math.sqrt, Decimal.sqrt, and cross-method agreement',
    columns: ['iterations', 'f-evals'],
    rows: [
      {
        method: 'Bisection [1, 2]',
        values: ['40', '41'],
        verdict: 'a digit per ~3.3 halvings, guaranteed and indifferent',
      },
      {
        method: 'Secant',
        values: ['6', '8'],
        best: 1,
        verdict: 'order 1.618 on single evals: the per-eval winner, kept honestly',
      },
      {
        method: 'Newton (tangent)',
        isThisUnit: true,
        values: ['5', '11'],
        best: 0,
        verdict: 'order 2: fewest iterations, paying double per step',
      },
    ],
    source:
      "python solutions/newtons_method_tangent_iteration.py prints this table and asserts: the digit ladder 1, 2, 5, 11, 24, 48 in 60-digit decimal with digits ≥ 2k−1 per step until saturation; all three methods agreeing with math.sqrt; the secant's eval win (8 ≤ 11); the 2-cycle gadget repeating [0, 1, 0, 1, 0, 1] literally; the cbrt runaway obeying x ← −2x to 10⁻⁹ relative; Kepler's equation at e = 0.9 in 6 iterations with residual < 10⁻¹³; and the cash-flow IRR (21.62%) agreeing with a bisection cross-check to 10⁻⁹.",
  },

  figure: (
    <Figure
      id="fig-newton-tangent"
      aspect="16 / 7"
      caption="The tangent jump, and why digits double. Near a simple root, f differs from its tangent by a term of order (error)²: so jumping to the tangent's zero leaves exactly that quadratic remainder as the new error. The measured ladder (1, 2, 5, 11, 24, 48 correct digits in 60-digit arithmetic) is the theorem as raw data. Outside the basin the same jump has no such contract: the cubic's 2-cycle and the cube root's exact ×(−2) runaway are the measured dark side."
      cite={{
        text: 'Newton c. 1669 / Raphson 1690 / Simpson 1740; the convergence theory is standard (Kantorovich gives the rigorous basin); Cayley 1879 asked the basin question whose answer is the Newton fractal.',
        href: 'https://doi.org/10.2307/2369492',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="A curve with a tangent line jump toward the root, and the digit ladder">
        <path d="M 40 250 Q 240 240, 380 120 T 600 30" fill="none" stroke="#5da2ff" strokeWidth="2" />
        <line x1="40" y1="218" x2="600" y2="218" stroke="#2a3450" strokeWidth="1" />
        <circle cx="470" cy="74" r="4.5" fill="#f0b94b" />
        <line x1="330" y1="218" x2="520" y2="40" stroke="#f0b94b" strokeWidth="1.6" strokeDasharray="6 4" />
        <circle cx="330" cy="218" r="4" fill="#62d98a" />
        <text x="316" y="240" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">x₁</text>
        <circle cx="255" cy="218" r="4" fill="#9aa5bd" />
        <text x="243" y="240" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">x₀</text>
        <text x="486" y="66" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">tangent at x₀</text>
        <text x="360" y="196" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="12">x₁ = x₀ − f(x₀)/f′(x₀)</text>
        <text x="40" y="40" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="12">correct digits, measured:</text>
        <text x="40" y="62" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="13">1 → 2 → 5 → 11 → 24 → 48</text>
        <text x="40" y="86" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">error² per step: the tangent’s remainder</text>
        <text x="40" y="276" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">outside the basin: 0 → 1 → 0 → 1 (cycle) · ∛x: x ← −2x (runaway) · both asserted</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'newtons_method_tangent_iteration.py',
  Viz: NewtonViz,
  narration,
};
