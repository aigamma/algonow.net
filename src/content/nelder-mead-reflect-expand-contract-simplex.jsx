import NelderMeadViz from '../viz/NelderMeadViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/nelder_mead_reflect_expand_contract_simplex.py?raw';
import { narration } from './nelder-mead-reflect-expand-contract-simplex.narration.js';

export const content = {
  given:
    'Minimize a function of a few variables when no gradient is available: the function is a black box, a simulation, or a noisy measurement, and each evaluation is all you get. Three referees with known answers: Rosenbrock’s banana f(x, y) = 100 (y − x²)² + (1 − x)² with its minimum at (1, 1); McKinnon’s function with its minimum at (0, −1/2) and value −1/4; and a quadratic with a known center whose every evaluation carries Gaussian noise of 1e-3.',
  task: 'Nelder-Mead. Keep n + 1 points (a simplex) sorted by value and replace the worst each iteration. The heuristic is the move set: reflect the worst point through the centroid of the others; if the reflection is the new best, try expanding twice as far; if it is still the worst, contract halfway toward the centroid (outside or inside); if even that fails, shrink every point halfway toward the best. Nothing but comparisons of function values.',
  constraint:
    'Measured on Rosenbrock from 50 random starts in [−2, 2]², target value below 1e-8: Nelder-Mead 50 of 50 at 208 evaluations on average; BFGS with the analytic gradient 50 of 50 at 111 function-plus-gradient calls; coordinate descent with golden-section line searches 0 of 50 in 200 sweeps. Moves over the 50 runs: 1,139 reflections, 374 expansions, 3,869 contractions, 9 shrinks. On the noisy quadratic from (3, 3, 3): Nelder-Mead ends 0.016 from the center (3,000 evaluations, the cap); BFGS on finite-difference gradients with h = 1e-6 ends 2.34 away; exact BFGS on the clean function 2.8e-16. McKinnon’s function from his prescribed simplex: 135 inside contractions, 0 reflections, a stall at the origin with value 0; a restart reaches (0, −0.5), value −0.25. An ill-conditioned quadratic (condition number 100) to 1e-6: n = 2 / 4 / 8 / 16 / 32 costs 146 / 407 / 1,297 / 5,718 / 81,689 evaluations against BFGS 29 / 38 / 68 / 117 / 216.',

  origins: (
    <p>
      John Nelder and Roger Mead (<strong>1965</strong>, The Computer
      Journal, &quot;A simplex method for function minimization&quot;),
      at the Rothamsted agricultural research station, took the simplex
      of Spendley, Hext, and Himsworth (1962, Technometrics), which only
      reflected and kept its shape, and let it stretch along valleys and
      contract at the bottom. The paper became one of the most cited in
      numerical computing and the method became the amoeba of Numerical
      Recipes, fminsearch in MATLAB, and the Nelder-Mead option of
      SciPy&apos;s minimize. Its theory came thirty years late: McKinnon
      (1998, SIAM Journal on Optimization) built a strictly convex
      function of two variables on which the method, from a particular
      starting simplex, contracts forever toward a point that is not the
      minimum, and in the same issue Lagarias, Reeds, Wright, and Wright
      proved what could be proved (convergence to the minimizer in one
      dimension; shrinking diameters for strictly convex functions in
      two). It remains the default derivative-free method in nearly
      every scientific library, reached for when a simulation must be
      tuned, a model calibrated to noisy data, or a legacy code
      optimized through its inputs alone.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>simplex and its invariant</strong>: n + 1 points
      that span the space, kept sorted by value, one replaced per
      iteration, and a termination test on the spread of values and the
      diameter. The referee is Rosenbrock&apos;s banana from 50 random
      starts, and the method reaches a value below 1e-8 on{' '}
      <strong>50 of 50</strong>, at 208 evaluations on average, where
      BFGS with the analytic gradient needs 111 function-plus-gradient
      calls and coordinate descent along the axes reaches it on 0 of 50.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>moves</strong>, and the counts say how the
      simplex actually lives: over the 50 runs, 1,139 reflections, 374
      expansions, <strong>3,869 contractions</strong>, 9 shrinks. Most of
      its life is spent contracting, feeling its way along the
      banana&apos;s curved floor; the expansions are the sprints along
      the valley; a shrink is the move of last resort. The moves use
      comparisons only, and that is what survives noise: on a quadratic
      with noise 1e-3 on every evaluation the simplex ends 0.016 from
      the center, while BFGS on finite-difference gradients (h = 1e-6)
      ends 2.34 away, because a difference of two noisy values over a
      step of 1e-6 is a gradient error of order 1e3.
    </p>
  ),

  picture: (
    <p>
      A blind party of three hikers roped together on a foggy hillside,
      wanting the lowest point. They cannot see the slope; they can only
      call out and compare how low each one stands. The highest hiker
      steps across the line between the other two, to the mirror-image
      spot. If that landed them lowest of all, they take a second,
      bolder step in the same direction. If it left them still highest,
      they step back halfway. If nothing helps, everyone shuffles toward
      the lowest hiker and the triangle tightens. The triangle stretches
      along valleys, turns at corners, and shrinks onto the bottom, with
      no one ever measuring a slope.
    </p>
  ),

  steps: [
    <>
      <strong>Order:</strong> sort the n + 1 vertices by value; c is the
      centroid of all but the worst x<sub>w</sub>.
    </>,
    <>
      <strong>Reflect:</strong> x<sub>r</sub> = c + (c − x<sub>w</sub>);
      if f(best) ≤ f(x<sub>r</sub>) &lt; f(second worst), replace x
      <sub>w</sub>.
    </>,
    <>
      <strong>Expand:</strong> if f(x<sub>r</sub>) &lt; f(best), try x
      <sub>e</sub> = c + 2(c − x<sub>w</sub>) and keep the better of x
      <sub>e</sub>, x<sub>r</sub>.
    </>,
    <>
      <strong>Contract:</strong> otherwise, outside (halfway from c to x
      <sub>r</sub>) when f(x<sub>r</sub>) &lt; f(x<sub>w</sub>), inside
      (halfway from c to x<sub>w</sub>) when not; keep it if it beats
      the worse of the two, else <strong>shrink</strong> every vertex
      halfway toward the best.
    </>,
    <>
      <strong>Stop</strong> when the value spread &lt; ftol and the
      diameter &lt; xtol; <strong>check</strong> by restarting from a
      fresh simplex at the answer (on McKinnon&apos;s function, it
      moves).
    </>,
  ],

  signals: [
    <>
      <strong>No gradient:</strong> a black box, a simulation, legacy
      code, a measurement with noise.
    </>,
    <>
      <strong>Few variables:</strong> two to perhaps ten; evaluations
      grew 39× from n = 2 to 16 here, against 4× for BFGS.
    </>,
    <>
      <strong>Evaluations you can afford by the hundreds or
      thousands</strong>, or a rough answer that is good enough.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>coordinate descent</strong> with a
      golden-section line search along each axis: 0 of 50 on the banana
      in 200 sweeps, because the valley runs diagonally and every
      axis-parallel line search ends on its wall.
    </>
  ),

  strength: (
    <>
      <strong>Zero derivatives, robust to noise and kinks, twenty lines
      of code.</strong> 50 of 50 on the banana, 0.016 from the center
      under noise where finite differences drift 2.34, and a simplex
      that stretches along valleys on its own.
    </>
  ),
  weakness: (
    <>
      <strong>No guarantee, and a cost that climbs with dimension.</strong>{' '}
      On McKinnon&apos;s function it takes 135 inside contractions in a
      row, never accepts a reflection, and stalls at the origin (value 0)
      with the minimum (−1/4) half a unit away; evaluations go 146,
      5,718, 81,689 for n = 2, 16, 32 against BFGS 29, 117, 216; one
      point moves per iteration; and it ignores a gradient when one
      exists (111 calls against 208).
    </>
  ),

  problem: 'Continuous optimization',
  problemSlug: 'continuous-optimization',
  rivals: [
    {
      name: 'Nelder-Mead × Reflect-expand-contract simplex',
      isThisUnit: true,
      algoName: 'Nelder-Mead',
      cost: 'one to n + 1 evaluations per iteration',
      wins: (
        <>
          <strong>50 of 50 with no gradient</strong>; comparisons only,
          so noise of 1e-3 costs 0.016 in position.
        </>
      ),
      costs: (
        <>
          No convergence guarantee; 39× growth in cost from n = 2 to 16.
        </>
      ),
      when: 'Black-box or noisy objectives in a handful of variables.',
    },
    {
      name: 'Powell’s method',
      algoName: "Powell's method",
      cost: 'a line search per direction per sweep',
      wins: (
        <>
          Derivative-free with conjugate directions, so a quadratic is
          finished in finitely many sweeps and high precision is
          reachable.
        </>
      ),
      costs: (
        <>
          Line searches need a smooth function; the direction set can
          degenerate and needs a reset.
        </>
      ),
      when: 'Smooth objectives without derivatives where the answer is wanted to many digits.',
    },
    {
      name: 'CMA-ES',
      algoName: 'CMA-ES',
      cost: 'a population of evaluations per generation',
      wins: (
        <>
          A Gaussian whose covariance learns the valley; robust to noise
          and to many local minima; scales past ten dimensions.
        </>
      ),
      costs: (
        <>
          Tens of evaluations per generation; slower than the simplex on
          a smooth unimodal function.
        </>
      ),
      when: 'Rugged landscapes, or a dimension where the simplex’s cost has run away.',
    },
    {
      name: 'BFGS',
      algoName: 'BFGS',
      cost: 'gradients only; a rank-two update per step',
      wins: (
        <>
          111 calls against 208 on the banana and 117 against 5,718 at
          n = 16; superlinear at the end.
        </>
      ),
      costs: (
        <>
          Needs a gradient, analytic or automatic; finite differences
          fail on noise (2.34 away).
        </>
      ),
      when: 'Whenever the gradient is available and exact.',
    },
  ],
  neverUse: {
    name: 'Finite-difference gradients on a noisy objective',
    why: (
      <>
        The instinct is reasonable: no analytic gradient, so estimate one
        by differences and hand it to BFGS. Measured on the noisy
        quadratic from (3, 3, 3): finite-difference BFGS ends{' '}
        <strong>2.34 from the center; the simplex ends 0.016</strong>.
        Every difference divides a noise of 1e-3 by a step of 1e-6, so
        each gradient component carries an error of order 1e3 and the
        quasi-Newton update learns curvature from garbage; widening h
        trades that error for bias. Nelder-Mead never divides by a step.
        It only asks which of two points is lower, and noise of 1e-3
        changes that answer only when the two are already nearly tied.
      </>
    ),
  },

  contest: {
    instance:
      'Rosenbrock in two dimensions from 50 random starts in [−2, 2]² (target value < 1e-8); a three-dimensional quadratic with evaluation noise 1e-3 from (3, 3, 3); McKinnon’s function (θ = 6, τ = 2, φ = 60) from his prescribed simplex; a quadratic with condition number 100 in n = 2 to 32, to 1e-6',
    columns: ['Rosenbrock, 50 starts', 'evaluations (mean)', 'note'],
    rows: [
      {
        method: 'Nelder-Mead',
        isThisUnit: true,
        values: ['50 of 50', '208', '1,139 reflections, 374 expansions, 3,869 contractions, 9 shrinks'],
        best: 0,
        verdict: 'comparisons only',
      },
      {
        method: 'BFGS, analytic gradient',
        values: ['50 of 50', '111 (function + gradient calls)', 'needs the gradient'],
        verdict: 'faster when the gradient exists',
      },
      {
        method: 'coordinate descent, golden-section lines',
        values: ['0 of 50', '·', '200 sweeps; the axes are the wrong directions'],
        verdict: 'the baseline',
      },
      {
        method: 'noise 1e-3 on a quadratic',
        values: ['·', '·', 'Nelder-Mead 0.016 from the center (3,000 evaluations, the cap); finite-difference BFGS 2.34; exact BFGS on the clean function 2.8e-16'],
        verdict: 'comparisons survive noise',
      },
      {
        method: 'McKinnon’s counterexample',
        values: ['·', '273', 'stall at the origin (value 0) after 135 contractions and 0 reflections; restart reaches (0, −0.5), value −0.25'],
        verdict: 'no guarantee; restart',
      },
      {
        method: 'dimension n = 2 / 4 / 8 / 16 / 32',
        values: ['·', '146 / 407 / 1,297 / 5,718 / 81,689', 'BFGS 29 / 38 / 68 / 117 / 216; growth 39× vs 4× from n = 2 to 16'],
        verdict: 'the cost climbs',
      },
    ],
    source:
      'python solutions/nelder_mead_reflect_expand_contract_simplex.py prints this table and asserts: Nelder-Mead at least 45 of 50 on the banana; BFGS at least 45 with fewer evaluations; coordinate descent with fewer successes than the hero; the simplex within 0.05 of the noisy center and finite differences at least ten times farther; McKinnon’s stall within 1e-3 of the origin and the restart reaching −1/4; and on the scaled quadratic, the simplex reaching 1e-6 through n = 16 and BFGS through n = 32, the simplex costing more than twenty times BFGS at n = 16, and its growth more than three times BFGS’s.',
  },

  figure: (
    <Figure
      id="fig-nelder-mead-moves"
      aspect="16 / 7"
      caption="Left: the move set on one triangle. The worst vertex W is reflected through the centroid c of the other two to R; if R is the new best the expansion E is tried; if R is poor the outside contraction Co or the inside contraction Ci is tried; if nothing helps, the dashed triangle is the shrink toward the best vertex B. Right: evaluations to reach 1e-6 on a quadratic with condition number 100 as the dimension grows, on a log scale: the simplex (amber) against BFGS with gradients (blue), 146 against 29 at n = 2 and 81,689 against 216 at n = 32."
      cite={{
        text: 'J. A. Nelder and R. Mead, "A simplex method for function minimization," The Computer Journal 7(4), 1965, pp. 308-313. DOI 10.1093/comjnl/7.4.308. K. I. M. McKinnon, "Convergence of the Nelder-Mead simplex method to a nonstationary point," SIAM Journal on Optimization 9(1), 1998. J. C. Lagarias, J. A. Reeds, M. H. Wright, and P. E. Wright, "Convergence properties of the Nelder-Mead simplex method in low dimensions," SIAM Journal on Optimization 9(1), 1998.',
        href: 'https://doi.org/10.1093/comjnl/7.4.308',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="A triangle with its reflection, expansion, and contraction points marked along the line from the worst vertex through the centroid, beside a bar chart of evaluations against dimension for Nelder-Mead and BFGS on a log scale">
        {(() => {
          const B = [70, 90];
          const S = [120, 220];
          const W = [230, 170];
          const c = [(B[0] + S[0]) / 2, (B[1] + S[1]) / 2];
          const along = (t) => [c[0] + t * (c[0] - W[0]), c[1] + t * (c[1] - W[1])];
          const R = along(1);
          const E = along(2);
          const Co = along(0.5);
          const Ci = along(-0.5);
          const mid = (P) => [(B[0] + P[0]) / 2, (B[1] + P[1]) / 2];
          const S2 = mid(S);
          const W2 = mid(W);
          const dot = (P, label, color, dx = 8, dy = 4) => (
            <g key={label}>
              <circle cx={P[0]} cy={P[1]} r="4.5" fill={color} />
              <text x={P[0] + dx} y={P[1] + dy} fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="10">{label}</text>
            </g>
          );
          const dims = [2, 4, 8, 16, 32];
          const nm = [146, 407, 1297, 5718, 81689];
          const bf = [29, 38, 68, 117, 216];
          const x0 = 380;
          const y0 = 232;
          const hgt = (v) => ((Math.log10(v) - 1) / 4) * 160;
          return (
            <g>
              <polygon points={`${B[0]},${B[1]} ${S[0]},${S[1]} ${W[0]},${W[1]}`} fill="#f0b94b" fillOpacity="0.12" stroke="#f0b94b" strokeWidth="2" />
              <polygon points={`${B[0]},${B[1]} ${S2[0]},${S2[1]} ${W2[0]},${W2[1]}`} fill="none" stroke="#e2606c" strokeWidth="1.5" strokeDasharray="4 3" />
              <line x1={W[0]} y1={W[1]} x2={E[0]} y2={E[1]} stroke="#9aa5bd" strokeOpacity="0.6" strokeDasharray="2 3" />
              {dot(B, 'B best', '#62d98a', -46, -8)}
              {dot(S, 'S', '#5da2ff', -14, 14)}
              {dot(W, 'W worst', '#f0b94b', 8, 14)}
              {dot(c, 'c', '#9aa5bd', -14, -6)}
              {dot(R, 'R reflect', '#5da2ff', 8, -6)}
              {dot(E, 'E expand', '#62d98a', 8, -6)}
              {dot(Co, 'Co', '#f0b94b', 6, -8)}
              {dot(Ci, 'Ci', '#e2606c', 6, 14)}
              <text x="40" y="30" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">the four moves: W through c to R; E twice as far; Co, Ci halfway; dashed: shrink toward B</text>
              <text x="40" y="262" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">measured over 50 runs: 1,139 reflect, 374 expand, 3,869 contract, 9 shrink</text>
              <line x1={x0} y1={y0} x2={x0 + 240} y2={y0} stroke="#9aa5bd" strokeOpacity="0.5" />
              {dims.map((n, i) => (
                <g key={n}>
                  <rect x={x0 + 10 + i * 46} y={y0 - hgt(nm[i])} width="16" height={hgt(nm[i])} fill="#f0b94b" fillOpacity="0.8" />
                  <rect x={x0 + 28 + i * 46} y={y0 - hgt(bf[i])} width="16" height={hgt(bf[i])} fill="#5da2ff" fillOpacity="0.8" />
                  <text x={x0 + 14 + i * 46} y={y0 + 14} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">{`n=${n}`}</text>
                  <text x={x0 + 6 + i * 46} y={y0 - hgt(nm[i]) - 4} fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="9">{nm[i].toLocaleString()}</text>
                </g>
              ))}
              <text x={x0} y="30" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">evaluations to 1e-6, log scale: simplex (amber) vs BFGS (blue)</text>
              <text x={x0} y="46" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">BFGS: 29 / 38 / 68 / 117 / 216</text>
              <text x={x0} y="262" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">growth n = 2 to 16: simplex 39x, BFGS 4x</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'nelder_mead_reflect_expand_contract_simplex.py',
  Viz: NelderMeadViz,
  narration,
};
