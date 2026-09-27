import LmViz from '../viz/LmViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/levenberg_marquardt_trust_region_damping.py?raw';
import { narration } from './levenberg-marquardt-trust-region-damping.narration.js';

export const content = {
  given:
    'Fit a model with a few parameters to noisy data by minimizing the sum of squared residuals, when the model is nonlinear in its parameters so no closed form exists. The model here is a sum of two exponentials, y = a e^(−bt) + c e^(−dt), the classic ill-conditioned fit: 60 points on t ∈ [0, 3], noise 0.02, truth (3, 1, 2, 5), so the residual floor at the truth is known, 0.0208, and any fit can be judged against it.',
  task: 'Levenberg-Marquardt. At each iterate, linearize the residuals with the Jacobian J and solve the damped normal equations (JᵀJ + λ·diag(JᵀJ)) δ = −Jᵀr. The heuristic is the damping: a large λ makes δ a short step down the gradient, a λ near zero makes it the full Gauss-Newton step, and λ is multiplied by ten after a rejected step and divided by ten after an accepted one, so the method behaves like a trust region that grows while the linear model keeps its promises.',
  constraint:
    'Measured from 100 random starts in [0.2, 8]⁴: Levenberg-Marquardt reaches within 1% of the floor on 98, in 9.2 iterations on average; undamped Gauss-Newton on 29, diverging on 71; gradient descent with backtracking on 81, in 2,936 iterations on average with a cap of 5,000. On one far start, (6, 0.3, 0.5, 2): 8 accepted steps in 8 iterations, λ falling from 1e-2 to 1e-6 at its most Gauss-Newton-like, 3 rejected steps raising it tenfold each, final cost 0.02027. Near the solution the parameter error shrinks by factors of 2.3e-2, 3.5e-2, 7.0e-3 per accepted step; gradient descent’s successive ratios are 0.9999 after 3,000 steps. The condition number of JᵀJ at the far start is 3.6e5, and the damping caps it: 1.0e5 at λ = 0.01, 1.5e4 at 1, 1.1e4 at 100.',

  origins: (
    <p>
      Kenneth Levenberg (<strong>1944</strong>, Quarterly of Applied
      Mathematics, &quot;A method for the solution of certain non-linear
      problems in least squares&quot;) added λI to the Gauss-Newton
      normal equations to keep the steps from overshooting, and Donald
      Marquardt (1963, SIAM Journal on Applied Mathematics) made the
      damping scale with the diagonal of JᵀJ and gave the rule for
      raising and lowering it, turning the fix into the method that
      curve-fitting software has shipped ever since. Moré (1978)
      reinterpreted it as a trust-region method, choosing λ to hold the
      step inside a radius, and wrote the MINPACK implementation that
      SciPy&apos;s least_squares still descends from; Nocedal and Wright
      (2006) present it that way. Ceres Solver, g2o, and every
      bundle-adjustment pipeline in photogrammetry and robotics run a
      sparse Levenberg-Marquardt on millions of residuals, and it is the
      default when a model is smooth, the residuals are many, and the
      start is only roughly right.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>linearization</strong>: replace the nonlinear
      residuals by their tangent plane, r(p + δ) ≈ r + Jδ, and the
      least-squares step for the linear model is the solution of the
      normal equations, exact and cheap for a handful of parameters.
      The referee is the residual floor at the true parameters, 0.0208
      (0.0203 after local refinement), and the method reaches within 1%
      of it from <strong>98 of 100 far starts</strong> in 9 iterations on
      average. The algorithm also owns the rate: once the linear model
      is faithful, each accepted step shrinks the parameter error by
      factors of 2.3e-2, 3.5e-2, 7.0e-3, the superlinear finish of
      Gauss-Newton, where gradient descent&apos;s successive ratios sit at
      0.9999 after three thousand steps.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>step size the linear model cannot supply
      for itself</strong>. Undamped Gauss-Newton takes the full step
      wherever the tangent plane points, and from far starts it
      overshoots into nonsense: <strong>71 of 100 runs diverge</strong>,
      29 succeed. Add λ times the diagonal and the same equations
      interpolate between a gradient step (λ large) and the Newton
      step (λ small); raise λ when a step fails to lower the cost,
      lower it when a step succeeds, and the far starts are recovered,
      98 of 100. On the traced run λ falls from 1e-2 to 1e-6 as eight
      steps are accepted and three are rejected, which is the trust
      region widening as the model earns it. The damping also
      conditions the solve: JᵀJ at the far start has condition number
      3.6e5, the double exponential&apos;s near-degeneracy, and λ = 1
      brings it to 1.5e4.
    </p>
  ),

  picture: (
    <p>
      Walking down a foggy mountainside with a surveyor&apos;s map that
      is only accurate for the ground right around you. Newton&apos;s
      way is to trust the map completely, compute where the valley
      floor would be if the slope kept up, and leap there; on a real
      mountain that leap often lands on a ridge higher than where you
      stood. The cautious way is to take one small step downhill and
      look again, which takes all day. Marquardt&apos;s walker carries a
      dial. Turned up, the dial shortens the leap toward a careful
      downhill step; turned down, it lengthens it toward the full
      Newton leap. Every leap that lands lower turns the dial down a
      notch; every leap that lands higher is cancelled and turns it up.
      The dial ends near zero on the valley floor, where the map was
      right all along.
    </p>
  ),

  steps: [
    <>
      <strong>Linearize:</strong> at p, compute r and J; form JᵀJ and
      Jᵀr.
    </>,
    <>
      <strong>Damp and solve:</strong> (JᵀJ + λ·diag(JᵀJ)) δ = −Jᵀr.
    </>,
    <>
      <strong>Try:</strong> if S(p + δ) &lt; S(p), accept, λ ← λ/10;
      else reject, λ ← 10λ, and solve again.
    </>,
    <>
      <strong>Stop</strong> when an accepted step improves S by less than
      a relative 1e-10, or λ passes 1e8 without a step the model can
      justify.
    </>,
    <>
      <strong>Check:</strong> the cost against a known floor or a
      multi-start, and the ratio of actual to predicted reduction at
      each step.
    </>,
  ],

  signals: [
    <>
      <strong>A sum of squared residuals with a smooth model:</strong>
      curve fitting, calibration, bundle adjustment; the structure JᵀJ
      is the whole point.
    </>,
    <>
      <strong>A start that is only roughly right:</strong> far enough
      that Gauss-Newton diverges (71 of 100 here), close enough that a
      local minimum is the right answer.
    </>,
    <>
      <strong>Many more residuals than parameters:</strong> J is tall
      and thin, and the normal equations are small.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>undamped Gauss-Newton</strong>: the
      same linearization with the full step, superlinear near the
      solution and 29 of 100 from far starts, because nothing stops the
      step when the tangent plane lies.
    </>
  ),

  strength: (
    <>
      <strong>Newton’s finish with a gradient method’s safety.</strong>{' '}
      98 of 100 far starts in 9 iterations, error factors of 1e-2 per
      step at the end, and a damping that both bounds the step and
      conditions the solve, from 3.6e5 to 1.5e4.
    </>
  ),
  weakness: (
    <>
      <strong>Local, quadratic in the parameters, and blind to the
      sign of the step.</strong> It finds the nearest minimum, and the
      double exponential has a swapped twin and a valley of near-ties;
      each iteration forms and solves JᵀJ, which is n³ in the
      parameter count and rules out large dense problems; the
      factor-of-ten schedule is a convention that can waste iterations
      on rejected steps (3 of 11 here); and a residual that is not
      small at the solution makes the Gauss-Newton model wrong and the
      finish merely linear.
    </>
  ),

  problem: 'Nonlinear least squares',
  problemSlug: 'nonlinear-least-squares',
  rivals: [
    {
      name: 'Levenberg-Marquardt × Trust-region damping',
      isThisUnit: true,
      algoName: 'Levenberg-Marquardt',
      cost: 'one n × n solve per trial step',
      wins: (
        <>
          <strong>98 of 100 far starts in 9 iterations</strong>; superlinear
          finish; a conditioned solve.
        </>
      ),
      costs: (
        <>
          Local; n³ per iteration; a schedule to tune.
        </>
      ),
      when: 'Smooth least-squares models with tens to thousands of parameters and a rough start.',
    },
    {
      name: 'Gauss-Newton',
      algoName: 'Gauss-Newton',
      cost: 'one n × n solve per step',
      wins: (
        <>
          The same superlinear finish with no damping bookkeeping when
          the start is close.
        </>
      ),
      costs: (
        <>
          71 of 100 far starts diverged here; nothing bounds the step.
        </>
      ),
      when: 'Warm starts, as in tracking a slowly moving solution.',
    },
    {
      name: 'Trust-region method',
      algoName: 'Trust-region method',
      cost: 'a constrained subproblem per step',
      wins: (
        <>
          The general form: a radius instead of a λ, with the dogleg or
          Steihaug step and a convergence theory that covers any smooth
          objective, not only least squares.
        </>
      ),
      costs: (
        <>
          Needs a Hessian or an approximation; the subproblem is more
          work than one damped solve.
        </>
      ),
      when: 'General nonlinear objectives, or constraints, where the least-squares structure is absent.',
    },
    {
      name: 'BFGS',
      algoName: 'BFGS',
      cost: 'gradients only; a rank-two update per step',
      wins: (
        <>
          No Jacobian and no solve: a quasi-Newton curvature estimate
          built from gradients, superlinear in the end.
        </>
      ),
      costs: (
        <>
          Ignores the JᵀJ structure that least squares hands over for
          free; slower start on residual problems.
        </>
      ),
      when: 'Smooth objectives that are not sums of squares, or when only gradients are available.',
    },
  ],
  neverUse: {
    name: 'Gradient descent on a least-squares valley',
    why: (
      <>
        The gradient is available, so descend it. Measured with a
        backtracking line search from the same 100 starts: 81 reach the
        floor, at <strong>2,936 iterations on average against 9</strong>,
        and near the solution the parameter error shrinks by a factor of
        0.9999 per step where Levenberg-Marquardt shrinks it by 0.02.
        The double exponential&apos;s cost surface is a long curved
        valley with a condition number of 3.6e5, and the gradient points
        across the valley, not along it, so every step is short and
        most of it is wasted. The normal equations know the valley&apos;s
        shape from JᵀJ; the damping keeps that knowledge from being
        trusted too far. Descending the raw gradient throws the shape
        away.
      </>
    ),
  },

  contest: {
    instance:
      'y = a e^(−bt) + c e^(−dt) on 60 points, noise 0.02, truth (3, 1, 2, 5); 100 random starts in [0.2, 8]⁴; referee: the residual floor at the truth, 0.0208 (0.0203 refined)',
    columns: ['starts reaching within 1% of the floor', 'iterations (mean)', 'note'],
    rows: [
      {
        method: 'Levenberg-Marquardt',
        isThisUnit: true,
        values: ['98 of 100', '9.2', 'λ from 1e-2 to 1e-6 on the traced run'],
        best: 0,
        verdict: 'damped Newton',
      },
      {
        method: 'Gauss-Newton, undamped',
        values: ['29 of 100', '·', '71 diverged'],
        verdict: 'the full step overshoots',
      },
      {
        method: 'gradient descent with backtracking',
        values: ['81 of 100', '2,936 (cap 5,000)', 'error ratio 0.9999 per step near the end'],
        verdict: 'a crawl across the valley',
      },
      {
        method: 'rate near the solution',
        values: ['·', '·', 'LM error ratios 2.3e-2, 3.5e-2, 7.0e-3'],
        verdict: 'superlinear',
      },
      {
        method: 'conditioning at the far start',
        values: ['·', '·', 'cond(JᵀJ) 3.6e5; with λ 0.01 / 1 / 100: 1.0e5 / 1.5e4 / 1.1e4'],
        verdict: 'the damping conditions the solve',
      },
    ],
    source:
      'python solutions/levenberg_marquardt_trust_region_damping.py prints this table and asserts: Levenberg-Marquardt within 1% of the floor on at least 90 of 100 starts; Gauss-Newton diverging on at least 20 with fewer successes than the hero; gradient descent either fewer successes or more than twenty times the iterations; the traced run’s smallest λ at least a thousand times below its first and its final cost within 1% of the floor; the last error ratios under 0.2 for the hero and above 0.9 for gradient descent; and λ = 100 cutting the condition number of JᵀJ by more than ten.',
  },

  figure: (
    <Figure
      id="fig-lm-damping"
      aspect="16 / 7"
      caption="The damping dial on the traced run from (6, 0.3, 0.5, 2). Each accepted step (blue) divides λ by ten; each rejected trial (red) multiplies it by ten and is thrown away. The cost falls from 74 to the floor of 0.0203 in eight accepted steps, and λ ends four orders of magnitude below where it started: the last steps are pure Gauss-Newton, taken only once the model had earned the trust. Right: what each method made of the same hundred starts."
      cite={{
        text: 'K. Levenberg, "A method for the solution of certain non-linear problems in least squares," Quarterly of Applied Mathematics 2(2), 1944. DOI 10.1090/qam/10666. D. W. Marquardt, "An algorithm for least-squares estimation of nonlinear parameters," SIAM Journal on Applied Mathematics 11(2), 1963. J. J. Moré, "The Levenberg-Marquardt algorithm: implementation and theory," Lecture Notes in Mathematics 630, 1978.',
        href: 'https://doi.org/10.1090/qam/10666',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="A schematic trace of the damping parameter over eleven trial steps, falling on acceptances and jumping on rejections, beside a bar chart of successes from a hundred starts for three methods">
        {(() => {
          // schematic: 8 accepted, 3 rejected, in the measured proportions
          const events = ['a', 'a', 'r', 'a', 'a', 'r', 'a', 'r', 'a', 'a', 'a'];
          let lam = -2;
          const pts = [[0, lam]];
          events.forEach((e, i) => {
            lam += e === 'a' ? -1 : 1;
            pts.push([i + 1, lam]);
          });
          const x0 = 40;
          const y0 = 220;
          const w = 300;
          const h = 180;
          const X = (i) => x0 + (i / 11) * w;
          const Y = (l) => y0 - ((l + 7) / 8) * h;
          return (
            <g>
              <line x1={x0} y1={y0} x2={x0 + w} y2={y0} stroke="#9aa5bd" strokeOpacity="0.5" />
              <line x1={x0} y1={y0} x2={x0} y2={y0 - h} stroke="#9aa5bd" strokeOpacity="0.5" />
              {[-6, -4, -2, 0].map((l) => (
                <text key={l} x={x0 - 34} y={Y(l) + 4} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">{`1e${l}`}</text>
              ))}
              <polyline points={pts.map(([i, l]) => `${X(i)},${Y(l)}`).join(' ')} fill="none" stroke="#9aa5bd" strokeOpacity="0.6" />
              {pts.slice(1).map(([i, l], k) => (
                <circle key={k} cx={X(i)} cy={Y(l)} r="4" fill={events[k] === 'a' ? '#5da2ff' : '#e2606c'} />
              ))}
              <text x={x0} y="22" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">λ over the trial steps (schematic, measured counts): blue accepted ÷10, red rejected ×10</text>
              <text x={x0} y={y0 + 14} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">cost 74 → 0.0203 in 8 accepted steps; λ 1e-2 → 1e-6</text>
              <g>
                {[['Levenberg-Marquardt', 98, '#5da2ff'], ['gradient descent', 81, '#f0b94b'], ['Gauss-Newton', 29, '#e2606c']].map(([name, n, color], i) => (
                  <g key={name}>
                    <rect x="380" y={60 + i * 44} width={n * 2.3} height="22" fill={color} fillOpacity="0.75" />
                    <text x="380" y={60 + i * 44 - 5} fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="10">{`${name}: ${n} of 100`}</text>
                  </g>
                ))}
                <text x="380" y="200" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">starts reaching within 1% of the floor</text>
                <text x="380" y="216" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">iterations: 9 / 2,936 / (71 diverged)</text>
                <text x="380" y="244" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">cond(JᵀJ) 3.6e5 → 1.5e4 at λ = 1</text>
              </g>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'levenberg_marquardt_trust_region_damping.py',
  Viz: LmViz,
  narration,
};
