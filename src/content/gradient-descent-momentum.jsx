import MomentumViz from '../viz/MomentumViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/gradient_descent_momentum.py?raw';
import { narration } from './gradient-descent-momentum.narration.js';

export const content = {
  given:
    'A smooth convex bowl f, its gradient on demand, and curvature bounded between μ and L: condition number κ = L/μ.',
  task: 'Find the minimizer to eight digits.',
  constraint:
    'You pay per gradient evaluation, and κ = 100: the valley is a hundred times longer than it is wide, which is exactly the terrain that makes naive descent zigzag.',

  origins: (
    <p>
      Gradient descent is the oldest algorithm on this site: Cauchy proposed
      it in <strong>1847</strong>, for orbital least-squares. The pairing is
      Soviet: Boris Polyak&apos;s 1964 paper added the{' '}
      <strong>heavy ball</strong> term, one extra line reusing the previous
      step, and proved the rate improves from κ to <strong>√κ</strong>. Yuri
      Nesterov closed the theory in 1983 with the accelerated variant that
      is provably optimal for first-order methods. Then history folded back:
      the 1986 backpropagation paper already carried momentum, and the
      workhorse of modern deep learning (SGD with momentum, and Adam
      descending from it) is Polyak&apos;s line, executed trillions of times
      a day.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>descent contract</strong>: step against the gradient,
      x ← x − η∇f, at a step size the curvature licenses (η ≤ 2/L, and the
      tested solution shows the cliff just past it). Under that contract
      each step provably lowers f and the error contracts by
      (κ−1)/(κ+1) per step: convergence is a theorem, but on an
      ill-conditioned bowl it is a theorem about <strong>zigzag</strong>:
      the gradient points across the narrow valley, not along it, and 823
      measured iterations are spent mostly cancelling themselves.
    </p>
  ),
  heurRole: (
    <p>
      Adds <strong>memory</strong>: keep a fraction β of the previous step,
      x ← x − η∇f + β(x − x_prev). Along the valley floor consecutive
      gradients agree, so the reused steps <strong>accumulate</strong> into
      velocity; across the walls they alternate sign, so the reused steps{' '}
      <strong>cancel</strong>. The same one line is thus both an
      accelerator and a damper, and at the tuned β the contraction becomes
      (√κ−1)/(√κ+1): the square root of the condition number. Measured: 108
      iterations where plain descent needs 823.
    </p>
  ),

  picture: (
    <p>
      A marble dropped into a long, narrow canyon. A massless marble (plain
      descent) obeys only the local slope, which points at the opposite
      wall, so it ping-pongs wall to wall, creeping down the canyon a
      sliver per bounce. Give the marble <strong>mass</strong> and
      everything changes: the wall-to-wall components of its motion cancel
      on each bounce while the down-canyon components add, and after a few
      oscillations it is coasting along the floor. Same canyon, same slope
      information, one new property: it remembers which way it was already
      going.
    </p>
  ),

  steps: [
    <>
      <strong>Tune from curvature:</strong> η = 4/(√L+√μ)², β =
      ((√κ−1)/(√κ+1))². For κ = 100: β ≈ 0.67.
    </>,
    <>
      <strong>Step:</strong> x_next = x − η∇f(x) + β(x − x_prev). The last
      term is the entire heuristic.
    </>,
    <>
      <strong>Slide the window:</strong> x_prev ← x, x ← x_next. Two
      vectors of state, one gradient per iteration.
    </>,
    <>
      <strong>Stop</strong> when the gradient norm falls below tolerance:
      108 iterations here, against a √κ-rate prediction of 92.
    </>,
    <>
      <strong>Respect the regime:</strong> β too high goes underdamped (f
      visibly climbs mid-flight, measured), and any η past 2/L diverges
      geometrically, momentum or not.
    </>,
  ],

  signals: [
    <>
      The problem is <strong>ill-conditioned</strong>: long valleys, κ in
      the hundreds or worse: exactly where plain descent drowns in zigzag.
    </>,
    <>
      Gradients are affordable, <strong>Hessians are not</strong>: the
      dimension rules out forming or factoring a d×d matrix.
    </>,
    <>
      A cheap, stateful iteration suits the system (streams of minibatches,
      distributed workers): two vectors of memory, one gradient a step.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is plain gradient descent at its own optimal
      fixed step: <strong>823 iterations</strong>, within its
      (κ−1)/(κ+1)-rate prediction of ~921, every one of them monotone and
      most of them wasted crosswise. Momentum&apos;s one extra line cuts it
      to <strong>108</strong>: a 7.6× measured speedup that the √κ theorem
      predicted before the code ran.
    </>
  ),

  strength: (
    <>
      <strong>The square-root theorem, for one line of code.</strong> Rate
      (√κ−1)/(√κ+1) at tuned parameters (108 measured vs 92 predicted), one
      gradient and two stored vectors per step, indifferent to dimension,
      and robust enough that its stochastic descendant trains essentially
      every neural network in production.
    </>
  ),
  weakness: (
    <>
      <strong>Dials, and no descent guarantee.</strong> η and β want
      curvature knowledge (or schedules and trial runs); momentum is not a
      descent method: pushed underdamped it visibly climbs mid-flight
      (measured, while still converging). And on a pure quadratic the
      specialists win outright: conjugate gradient finished in exactly d =
      60 iterations with no dials at all, and a direct solve in one.
    </>
  ),

  problem: 'Continuous optimization',
  problemSlug: 'continuous-optimization',
  rivals: [
    {
      name: 'GD × Polyak momentum',
      isThisUnit: true,
      algoName: 'Gradient descent',
      cost: 'O(√κ log 1/ε) steps',
      wins: (
        <>
          <strong>108 iterations</strong> where plain descent needs 823,
          from one extra line and one extra vector. The workhorse shape of
          large-scale and stochastic optimization.
        </>
      ),
      costs: (
        <>
          Two dials tied to curvature you may not know, and no
          monotonicity: the underdamped ball climbs mid-flight.
        </>
      ),
      when: 'Large, ill-conditioned, or stochastic problems where Hessians are unthinkable: most of machine learning.',
    },
    {
      name: 'Nesterov acceleration',
      algoName: 'Nesterov accelerated gradient',
      cost: 'O(√κ log 1/ε), optimal',
      wins: (
        <>
          The same √κ rate with a <strong>proof of optimality</strong>: no
          first-order method beats it in the worst case. Evaluates the
          gradient at a lookahead point: correction before the mistake.
        </>
      ),
      costs: (
        <>
          177 iterations here, no better than the heavy ball on this
          friendly quadratic; its edge is the guarantee and the general
          convex case, not this instance.
        </>
      ),
      when: 'When the worst case must be certified, and in the proximal/composite settings built on it.',
    },
    {
      name: 'Conjugate gradient',
      cost: '≤ d iterations, no dials',
      wins: (
        <>
          Finished in <strong>exactly d = 60</strong> iterations: finite
          termination, visible through floating point. No η, no β: every
          step size falls out of orthogonality.
        </>
      ),
      costs: (
        <>
          The magic is quadratic-shaped: on general f it needs restarts and
          line searches (Fletcher-Reeves, Polak-Ribière), and it wants
          well-behaved arithmetic.
        </>
      ),
      when: 'Linear systems and quadratics, especially sparse ones: the standard before all else there.',
    },
    {
      name: "Newton's method",
      algoName: "Newton's method optimization",
      cost: '1 step here; O(d³) per step',
      wins: (
        <>
          On a quadratic, <strong>one step, exactly</strong>: the Hessian
          solve lands on the minimizer, for the price of about d/6
          gradients at this size (11 gradient-equivalents measured).
        </>
      ),
      costs: (
        <>
          The d³ solve and the d² memory grow three and two orders per 10×
          of dimension: at a million parameters the Hessian cannot even be
          stored. Quasi-Newton (BFGS, L-BFGS) exists to fake it.
        </>
      ),
      when: 'Moderate dimension with cheap Hessians, or via its L-BFGS approximation when memory allows.',
    },
  ],
  neverUse: {
    name: 'Gradient descent with a step size past 2/L',
    why: (
      <>
        The ceiling is not advice, it is arithmetic: each step multiplies
        the stiffest error mode by |1 − ηL|, and at η = 2.05/L that factor
        is 1.05: geometric growth, measured to blow past the starting error
        within 300 steps while every softer mode still shrinks. Divergence
        from an overlong step does not look like failure at first, which is
        what makes it the most common way descent is broken in practice.
        Every step-size schedule, line search, and warmup in the field is a
        negotiation with this one constant.
      </>
    ),
  },

  contest: {
    instance:
      'one randomly rotated quadratic bowl, d = 60, κ = 100, eigenvalues log-spaced; stop when the gradient norm falls below 10⁻⁸; work in gradient-equivalents (a Hessian solve priced at d/6 gradients)',
    columns: ['iterations', 'work'],
    rows: [
      {
        method: 'Gradient descent',
        values: ['823', '824'],
        verdict: 'monotone, provable, and mostly spent zigzagging: rate predicted ~921',
      },
      {
        method: 'GD × Polyak momentum',
        isThisUnit: true,
        values: ['108', '109'],
        best: 0,
        verdict: 'the √κ theorem in the flesh: predicted ~92, one extra line',
      },
      {
        method: 'Nesterov acceleration',
        values: ['177', '356'],
        verdict: 'same rate class, plus the optimality certificate',
      },
      {
        method: 'Conjugate gradient',
        values: ['60', '60'],
        verdict: 'exactly d: finite termination, and not a dial in sight',
      },
      {
        method: 'Newton (direct solve)',
        values: ['1', '11'],
        best: 1,
        verdict: 'one shot on a quadratic; d³ makes it unthinkable at scale',
      },
    ],
    source:
      'python solutions/gradient_descent_momentum.py prints this table and asserts all five methods land on the Gaussian-elimination answer, both rate theorems bracket the measured counts, conjugate gradient terminates within d, Newton takes exactly one step, the 2/L step-size cliff diverges, plain descent is monotone while the underdamped ball measurably climbs mid-flight and still converges.',
  },

  figure: (
    <Figure
      id="fig-momentum-vectors"
      aspect="16 / 7"
      caption="Why one remembered step straightens the path. In a narrow valley the gradient points mostly at the opposite wall. Across steps, the wall-to-wall components alternate sign, so the inherited velocity cancels them; the down-valley components agree, so velocity accumulates. The resultant step turns away from the wall and along the floor: the same cancellation argument, done in eigen-coordinates, is the (√κ−1)/(√κ+1) proof."
      cite={{
        text: 'Polyak, "Some Methods of Speeding up the Convergence of Iteration Methods", USSR Computational Mathematics and Mathematical Physics 4(5), 1964. The optimal-rate variant is Nesterov, 1983; gradient descent itself is Cauchy, 1847.',
        href: 'https://doi.org/10.1016/0041-5553(64)90137-5',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="Elliptical valley contours with a gradient arrow pointing across the valley, an inherited velocity arrow along it, and their resultant turning down-valley">
        {[1, 0.72, 0.47, 0.26].map((s, i) => (
          <ellipse
            key={i}
            cx="320"
            cy="150"
            rx={290 * s}
            ry={62 * s}
            fill="none"
            stroke="#2b5fa8"
            strokeWidth="1.1"
            opacity={0.65}
            transform="rotate(-8 320 150)"
          />
        ))}
        <circle cx="252" cy="106" r="5" fill="#e9edf6" />
        <line x1="252" y1="106" x2="288" y2="196" stroke="#e06767" strokeWidth="2" />
        <polygon points="288,196 279,188 292,184" fill="#e06767" />
        <text x="180" y="226" fill="#e06767" fontFamily="ui-monospace, monospace" fontSize="12">−η∇f: at the far wall</text>
        <line x1="252" y1="106" x2="356" y2="122" stroke="#f0b94b" strokeWidth="2" />
        <polygon points="356,122 346,116 348,129" fill="#f0b94b" />
        <text x="300" y="96" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="12">β·(previous step): down-valley</text>
        <line x1="252" y1="106" x2="386" y2="188" stroke="#62d98a" strokeWidth="2.4" />
        <polygon points="386,188 374,184 380,173" fill="#62d98a" />
        <text x="396" y="200" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="12">the step taken</text>
        <text x="30" y="272" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="12">cross-valley parts alternate and cancel · down-valley parts agree and accumulate</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'gradient_descent_momentum.py',
  Viz: MomentumViz,
  narration,
};
