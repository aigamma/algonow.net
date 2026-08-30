import DormandPrinceViz from '../viz/DormandPrinceViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/dormand_prince_embedded_error.py?raw';
import { narration } from './dormand-prince-embedded-error.narration.js';

export const content = {
  given:
    'An ordinary differential equation whose solution is flat for ages, then erupts (the ignition problem y′ = y² − y³), and a step size that must be chosen: tiny enough for the eruption, which bankrupts the flats; or comfortable for the flats, which shreds the eruption.',
  task: 'Compute two Runge-Kutta answers of orders five and four from the same six function evaluations (the Dormand-Prince tableau). Their difference is a free per-step error estimate: accept or reject the step, and set the next h by the fifth-root law. The equation sizes its own steps.',
  constraint:
    'Exact solutions referee the accuracy (e⁻ᵗ to 1.8e-9, the oscillator to 2.5e-8); an independent 400,000-step RK4 run referees the flame. The claims become experiments: halving h cut the fixed-step error 32.0× (order five, measured); the tolerance dial multiplied cost 15.4× against the fifth-root law’s predicted 15.8×; the estimator was honest on 40/40 audited steps; and the stiffness wall is measured at 117×, stated as the method’s boundary.',

  origins: (
    <p>
      Runge (1895) and Kutta (1901) built the stage machinery;
      the self-driving part came from the space program: Erwin
      Fehlberg at NASA (1969) discovered that two answers of
      different orders could share their expensive stages, making
      the error estimate free. Dormand and Prince&apos;s{' '}
      <strong>1980</strong> pair improved the coefficients:
      minimizing the fifth-order error, first-same-as-last so
      stage seven becomes the next step&apos;s stage one: and
      Shampine built MATLAB&apos;s ode45 around it, which made
      this exact tableau the world&apos;s default answer to
      &quot;solve my ODE&quot;: SciPy&apos;s RK45 ships the same
      coefficients this page hardcodes. Fifty years of
      simulations: orbits, circuits, epidemics, robot arms: have
      mostly been this pair, breathing.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>tableau</strong>: seven stages whose
      carefully tuned weights produce a fifth-order answer and a
      fourth-order answer from the <em>same</em> evaluations,
      with stage seven reusable as the next step&apos;s stage
      one (FSAL: six new evaluations per step). The order is not
      recited here but measured: fixed-step runs at h and h/2 cut
      the global error by <strong>32.0×, against 2⁵ = 32</strong>.
      Accuracy is refereed by exact solutions where they exist
      and by an independent 400,000-step RK4 run where they do
      not.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>controller</strong>: est = |y₅ − y₄|
      per step, accept if under tolerance, and set h_next = 0.9 ·
      h · (tol/est)^(1/5): the fifth-root law, clamped. The
      estimator itself is audited: within 10× of the true
      fourth-order local error on 40 of 40 steps, and a
      conservative bound on the advanced answer&apos;s error on
      40 of 40 (a subtlety the first draft got backwards: the
      estimate prices y₄ while the solver advances with y₅).
      The result on the flame: steps breathing 69× from 0.38 to
      26.4, 488 evaluations total: and the cost dial obeying its
      law, 15.4× measured against 15.8× predicted.
    </p>
  ),

  picture: (
    <p>
      Driving a mountain road at night with a co-pilot who grades
      every stretch. On the long straightaways you cruise; into
      the hairpins you crawl; and you know which is which because
      the co-pilot continuously compares two views of the road:
      a sharp one and a slightly blurrier one, both computed from
      the same glance. When the two views agree, the road is
      gentle: lengthen your stride. When they diverge, curvature
      is sneaking in under your wheels: shorten it, or re-take
      the stretch entirely. Nobody chose a speed in advance, and
      that is the entire point: any fixed speed is wrong twice:
      reckless in the hairpins or wasteful on the straights. The
      measured version of this drive: the flame problem&apos;s
      flats taken at h = 26.4, its front at h = 0.38, one
      answer, 488 evaluations: where the fixed-speed driver
      matching that accuracy paid 4,000.
    </p>
  ),

  steps: [
    <>
      <strong>Seven stages, two answers:</strong> the tableau
      yields order-5 and order-4 results from one set of
      evaluations: FSAL makes it six new ones per step.
    </>,
    <>
      <strong>Estimate free:</strong> est = |y₅ − y₄|: audited
      within 10× of the true local error, 40/40.
    </>,
    <>
      <strong>Accept or reject:</strong> under tolerance the step
      lands; over it, the work is discarded and retried smaller
      (4 rejects on the stiff run, counted).
    </>,
    <>
      <strong>Resize by the fifth root:</strong> h ← 0.9 h
      (tol/est)^(1/5), clamped to [0.2×, 5×]: the law whose cost
      prediction this page hit at 15.4× vs 15.8×.
    </>,
    <>
      <strong>Advance with the better answer:</strong> local
      extrapolation: ride y₅, having priced y₄.
    </>,
  ],

  signals: [
    <>
      <strong>Dynamics with moods:</strong> flat-then-eruptive
      solutions (ignitions, orbits with close approaches,
      switching circuits): the 69× step-breathing regime where
      fixed steps are wrong twice.
    </>,
    <>
      <strong>Accuracy as a dial, not a prayer:</strong> the
      tolerance knob converts straight into cost by the
      fifth-root law: budget compute for accuracy predictably.
    </>,
    <>
      <strong>Non-stiff territory:</strong> the boundary this
      page measures rather than mumbles: smooth dynamics without
      fast decaying modes: where explicit stages are cheap and
      stability never binds.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>fixed-step RK4</strong>: the
      classic fourth-order workhorse, four evaluations per step,
      no machinery: and this page&apos;s referee at 400,000
      steps. Its structural problem on moody dynamics: one step
      size must serve the whole journey, so the flame front sets
      the bill for the flats: 4,000 evaluations to match the
      adaptive answer&apos;s accuracy, 8× the breathing
      pair&apos;s 488.
    </>
  ),

  strength: (
    <>
      <strong>Self-driving accuracy, with every claim run as an
      experiment.</strong> Order five measured at 32.0× on a
      halving; the free estimator honest on 40/40 audited steps
      (both as tracker and as conservative bound); the flame
      solved in 488 evaluations with steps spanning 69×, agreeing
      with an independent 400,000-step referee; and the
      cost-accuracy dial obeying its theoretical law to within
      three percent (15.4× vs 15.8×). This is why ode45 is the
      default: not fashion: measurable self-government.
    </>
  ),
  weakness: (
    <>
      <strong>Explicit, and stiffness is its wall:
      measured.</strong> On y′ = −2000(y − cos t): a solution
      that is <em>smooth</em> after a millisecond&apos;s
      transient: the pair spent 5,717 evaluations against 49 on
      the equally smooth non-stiff twin: <strong>117×</strong>,
      because stability, not accuracy, pins the step of every
      explicit method on stiff problems, and no step
      controller can fix a stability limit. That is implicit
      territory (BDF, the rival card). Smaller honest notes:
      rejected steps discard work; the controller&apos;s clamps
      are tuning (this page&apos;s 5× growth cap limited the
      flame&apos;s step span); and for long Hamiltonian runs,
      symplectic integrators preserve energy structure this
      pair slowly leaks.
    </>
  ),

  problem: 'ODE integration',
  problemSlug: 'ode-integration',
  rivals: [
    {
      name: 'Dormand-Prince × embedded control',
      isThisUnit: true,
      algoName: 'Dormand-Prince',
      cost: '6 evals/step, self-sizing',
      wins: (
        <>
          <strong>The world default</strong>: order 5 measured,
          free error estimates, steps breathing 69×: 8× under
          fixed-step on moody dynamics.
        </>
      ),
      costs: (
        <>
          Explicit: the 117× stiffness wall: rejected steps
          discard work; energy structure slowly leaks.
        </>
      ),
      when: 'General-purpose non-stiff ODEs: the sensible first solver, every time.',
    },
    {
      name: 'Runge-Kutta 4',
      cost: '4 evals/step, fixed h',
      wins: (
        <>
          The teaching classic and this page&apos;s referee:
          dead simple, sturdy, and unbeatable when the dynamics
          are uniformly gentle and h is known.
        </>
      ),
      costs: (
        <>
          One step size for the whole journey: the front set the
          flats&apos; bill at 4,000 evaluations, 8× the adaptive
          pair.
        </>
      ),
      when: 'Uniform dynamics, hard real-time loops, or as an independent referee.',
    },
    {
      name: 'Velocity Verlet',
      cost: '1 force eval/step',
      wins: (
        <>
          The live unit: symplectic: energy errors oscillate
          instead of drifting, which is why molecular dynamics
          and orbital mechanics run on it for billions of steps.
        </>
      ),
      costs: (
        <>
          Order 2 only, fixed step, and its magic is specific to
          Hamiltonian structure: no error estimate, no dial.
        </>
      ),
      when: 'Long-horizon physics where conservation beats per-step accuracy.',
    },
    {
      name: 'Backward differentiation formula',
      cost: 'implicit: a solve per step',
      wins: (
        <>
          The stiff-country answer: implicit steps are stable at
          any h, so the 117× wall this page measured simply is
          not there: ode15s, CVODE, and chemistry run on it.
        </>
      ),
      costs: (
        <>
          Each step solves a nonlinear system (Jacobians,
          Newton iterations): far heavier machinery per step.
        </>
      ),
      when: 'Stiff systems: fast decaying modes, chemical kinetics, tight circuits.',
    },
  ],
  neverUse: {
    name: 'Adaptive explicit steps on a stiff problem',
    why: (
      <>
        The trap is that adaptivity <em>looks</em> like the cure:
        the solver keeps shrinking its steps, so surely it is
        handling the difficulty. Measured here: y′ = −2000(y −
        cos t), whose solution after a millisecond is as smooth
        as a cosine, cost <strong>5,717 evaluations against 49
        for its non-stiff twin: 117×</strong>: with the estimator
        dutifully reporting instability-flavored error and the
        controller dutifully pinning h at the stability limit,
        forever. The step controller is doing its job perfectly:
        the job is unwinnable, because for explicit methods
        stability, not accuracy, bounds the step on stiff
        problems: and no amount of step control changes a
        stability region. The tell in practice: thousands of
        tiny steps on a solution that looks utterly smooth. The
        fix is a different method class (implicit: BDF), not a
        smaller tolerance: which only makes it worse.
      </>
    ),
  },

  contest: {
    instance:
      'the ignition problem y′ = y² − y³ over [0, 200] (flat, flame front, flat); one currency: function evaluations; referee: an independent 400,000-step RK4 run',
    columns: ['f-evals'],
    rows: [
      {
        method: 'Fixed-step RK4 (front-limited)',
        values: ['4,000'],
        verdict: 'one step size for the whole journey: the front sets the bill for the flats',
      },
      {
        method: 'Dormand-Prince adaptive',
        isThisUnit: true,
        values: ['488'],
        best: 0,
        verdict: 'steps breathe 69× (h = 0.38 → 26.4): 8× fewer evaluations, same refereed answer',
      },
    ],
    source:
      'python solutions/dormand_prince_embedded_error.py prints this table and asserts: exact-solution global errors 1.8e-9 (e⁻ᵗ) and 2.5e-8 (oscillator) at tol 1e-8; order five measured at 32.0× on an h-halving (bounds 24-44); the embedded estimator within 10× of the true order-4 local error AND a conservative bound on the advanced order-5 error, 40/40 each (a first draft audited the wrong order and the run corrected it); the flame answer within 1e-5 of the 400,000-step referee with step span > 50× (measured 69×) and the fixed-step match costing > 3× (measured 8×); the fifth-root cost law at 15.4× against 15.8× predicted, measured on the error-limited oscillator after the flame’s clamp-limited flats honestly refused to show it; and the stiffness blowup at 117× on the smooth stiff twin.',
  },

  figure: (
    <Figure
      id="fig-dp-breathing"
      aspect="16 / 7"
      caption="Two answers from one set of stages, and the difference drives the wheel. The Dormand-Prince tableau's order-5 and order-4 results share six evaluations; |y₅ − y₄| prices each step (audited within 10× of truth, 40/40), the fifth-root law resizes h, and the steps breathe: 0.38 through the flame front, 26.4 on the flats, 488 evaluations against fixed-step RK4's 4,000 for the same refereed answer. Order five is an experiment here (32.0× per halving), the cost dial obeys its law (15.4× vs 15.8×), and the method's wall is measured too: 117× on a smooth stiff problem, where stability, not accuracy, pins every explicit step."
      cite={{
        text: 'J. R. Dormand, P. J. Prince, "A family of embedded Runge-Kutta formulae," J. Comp. Appl. Math. 6(1), 1980. DOI 10.1016/0771-050X(80)90013-3. Embedded pairs: Fehlberg 1969 (NASA); ode45: Shampine-Reichelt 1997.',
        href: 'https://doi.org/10.1016/0771-050X(80)90013-3',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="The ignition curve with step sizes breathing beneath it, and the measured laws alongside">
        <path d="M 40 200 L 240 198 C 280 196, 300 60, 340 56 L 600 54" fill="none" stroke="#5da2ff" strokeWidth="2" />
        <text x="44" y="188" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="10">y(t): flat · ignition · flat</text>
        {[[60, 30], [130, 30], [200, 26], [258, 14], [286, 6], [300, 4], [312, 4], [326, 6], [348, 12], [390, 22], [460, 30], [540, 30]].map(([x, w], i) => (
          <rect key={i} x={x} y={216} width={w} height={12} fill="rgba(240,185,75,0.35)" stroke="#f0b94b" strokeWidth="1" />
        ))}
        <text x="44" y="246" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="10">the steps beneath: h breathing 69× (0.38 at the front, 26.4 on the flats): nobody chose them</text>
        <text x="360" y="110" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">est = |y₅ − y₄| from shared stages</text>
        <text x="360" y="124" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">h ← 0.9 h (tol/est)^(1/5)</text>
        <text x="40" y="268" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">measured laws: order 32.0× per halving (2⁵) · cost dial 15.4× vs 15.8× predicted · dividend 8× vs fixed RK4</text>
        <text x="40" y="284" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">the wall: stiff twin 117× dearer: stability pins explicit steps: adaptivity cannot fix stiffness</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'dormand_prince_embedded_error.py',
  Viz: DormandPrinceViz,
  narration,
};
