import MarkowitzViz from '../viz/MarkowitzViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/mean_variance_optimization_markowitz_frontier.py?raw';
import { narration } from './mean-variance-optimization-markowitz-frontier.narration.js';

export const content = {
  given:
    'n assets with expected monthly returns μ and a covariance matrix Σ, and one portfolio to build: weights w summing to one, shorts allowed or not. Return is linear in w, risk is the quadratic w′Σw. Which weights give the least variance for a chosen return, and how do the answers look as the target moves?',
  task: 'Mean-variance optimization. The algorithm is Markowitz’s (1952): fix the target return, minimize variance subject to the budget and the target, a quadratic program with two linear constraints. The heuristic is the frontier that falls out of it: every minimizer combines two fixed vectors, Σ⁻¹1 and Σ⁻¹μ, so the efficient set is one hyperbola in (σ, μ), any two frontier portfolios span the rest, and with a risk-free rate the best Sharpe ratio sits where the line from that rate touches the curve.',
  constraint:
    'Five assets: the KKT solve equals the closed-form weights to 2 × 10⁻¹⁵ on 81 targets, the variance equals (A m² − 2Bm + C) / D to 2 × 10⁻¹⁷, two-fund separation holds to 9 × 10⁻¹³ on 50 random covariances, and the tangency Sharpe 0.2116 matches √(C − 2Brf + Arf²) and a dense grid. The exact long-only frontier lies under all 440 sampled portfolios of a 23,426-point simplex grid, inside the short-sale frontier on 3 of 11 targets. Over 300 simulated windows the plug-in tangency portfolio earns a true Sharpe of 0.091, 0.124, 0.150 at 24, 60, 120 months against 0.205 for equal weights and 0.212 for the truth, with maximum weights of 2.4, 2.2, 1.7; the covariance-only GMV earns 0.185 at 60 months and shrinking Σ halfway to the identity lifts it to 0.210. A solve takes 20 µs; 0.5 s.',

  origins: (
    <p>
      Harry Markowitz&apos;s <strong>Portfolio Selection</strong> (Journal of
      Finance, 1952) replaced &quot;which stock?&quot; with a pair of numbers
      for a whole portfolio, mean and variance, and the rule that only the
      upper edge of the feasible cloud is worth holding; his 1959 book gave
      the critical-line algorithm for the constrained case. Tobin (1958)
      added the risk-free asset: every investor holds the same risky mix,
      scaled. Sharpe (1964) made that mix the market portfolio and the CAPM.
      Merton (1972) wrote the frontier in closed form with the constants A,
      B, C, D checked here. Markowitz, Miller, and Sharpe shared the 1990
      Nobel. The coda: Michaud (1989) called optimizers &quot;error
      maximizers,&quot; Ledoit and Wolf (2004) shrank the covariance, and
      DeMiguel, Garlappi, and Uppal (2009) showed naive 1/N beating fourteen
      optimized strategies out of sample on most datasets.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>minimization</strong>: for a target m, the KKT system
      [2Σ, 1, μ; 1′, 0, 0; μ′, 0, 0] times [w, λ₁, λ₂] equals [0, 1, m], one
      linear solve. The referee is the closed form: on 81 targets the weights
      match Merton&apos;s formula to <strong>2 × 10⁻¹⁵</strong> and the
      variance the hyperbola to 2 × 10⁻¹⁷, at 20 µs a solve. The long-only
      version has no closed form, so the file enumerates every support and
      checks the result against a simplex grid.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>shape</strong>, which is what you reason with.
      A = 1′Σ⁻¹1, B = 1′Σ⁻¹μ, C = μ′Σ⁻¹μ, D = AC − B²: the vertex is the GMV
      portfolio at return B / A (0.821% a month, sd 3.240%), every frontier
      point is g Σ⁻¹1 + h Σ⁻¹μ, and any two frontier portfolios reproduce the
      rest (gap 9 × 10⁻¹³ over 200 random checks). With a risk-free 0.2% the
      tangency portfolio Σ⁻¹(μ − rf1), normalized, has Sharpe{' '}
      <strong>0.2116</strong>, equal to √(C − 2Brf + Arf²) and to the best of
      3,000 frontier points.
    </p>
  ),

  picture: (
    <p>
      Picture a cloud of every portfolio you could hold, plotted by risk and
      return. The cloud has a hard left edge: for each level of return there
      is a least-risk mix, and those edges trace one hyperbola opening to the
      right. Nobody rational sits inside the cloud. Add a bank account, draw
      a line from its rate to the curve, and tilt it up until it just
      touches: everyone holds that one tangency mix and only decides how much
      to borrow or lend. The catch is that the curve is drawn from estimates,
      and estimated means are noisy enough that the drawn curve bends toward
      whatever looked good in the sample.
    </p>
  ),

  steps: [
    <>
      <strong>Estimate μ and Σ</strong> (or take them as given) and form
      Σ⁻¹1 and Σ⁻¹μ with one factorization.
    </>,
    <>
      <strong>Compute A, B, C, D:</strong> the GMV portfolio is Σ⁻¹1 / A with
      variance 1 / A.
    </>,
    <>
      <strong>For a target m,</strong> weights (C − Bm) / D · Σ⁻¹1 +
      (Am − B) / D · Σ⁻¹μ; variance (Am² − 2Bm + C) / D.
    </>,
    <>
      <strong>With a risk-free rf,</strong> the tangency portfolio is
      Σ⁻¹(μ − rf 1) scaled to sum one; its Sharpe is √(C − 2Brf + Arf²).
    </>,
    <>
      <strong>With no shorts,</strong> solve the QP (active set, or enumerate
      supports when n is small) and expect a frontier inside the first.
    </>,
    <>
      <strong>Before trusting it,</strong> test the weights out of sample and
      against 1/N; shrink Σ, or drop μ and hold the GMV.
    </>,
  ],

  signals: [
    <>
      <strong>Risk is a quadratic and return is linear:</strong> any
      allocation with a covariance (assets, projects, bets, machines).
    </>,
    <>
      <strong>You want the whole trade-off, not one answer:</strong> the
      frontier is a curve to read, and two funds span it.
    </>,
    <>
      <strong>The parameters are good or the stakes are small:</strong>
      estimation error in μ is the whole danger, measured below.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>equal weights, 1/N</strong>: a true
      Sharpe of 0.2054 here against 0.2116 for the exact optimum, and ahead
      of every plug-in tangency portfolio the simulations built.
    </>
  ),

  strength: (
    <>
      <strong>A closed-form frontier with a two-line proof and a certificate.</strong>{' '}
      Weights to 2 × 10⁻¹⁵, the hyperbola, two-fund separation, and the
      tangency Sharpe all checked; 20 µs per solve; the long-only version
      exact by enumeration.
    </>
  ),
  weakness: (
    <>
      <strong>Error maximization.</strong> Sample means from 60 months gave a
      plug-in Sharpe of 0.124 against 0.205 for 1/N, with weights of 2.2
      times the budget; even 120 months left it at 0.150.
    </>
  ),

  problem: 'Portfolio construction',
  problemSlug: 'portfolio-construction',
  rivals: [
    {
      name: 'Mean-variance optimization × Markowitz frontier',
      isThisUnit: true,
      algoName: 'Mean-variance optimization',
      cost: 'one n × n factorization, then O(n) per frontier point',
      wins: (
        <>
          <strong>The exact trade-off</strong>: closed-form weights to
          2 × 10⁻¹⁵, the hyperbola to 2 × 10⁻¹⁷, the best Sharpe 0.2116 by
          formula and by grid, 20 µs a solve.
        </>
      ),
      costs: (
        <>
          Needs μ: from 60 sample months the plug-in portfolio earned 0.124
          against 0.212 for the truth, with weights up to 2.2× the budget.
        </>
      ),
      when: 'Parameters are known or well estimated, or you want the frontier as a map before you choose.',
    },
    {
      name: 'Minimum-variance portfolio',
      algoName: 'Minimum-variance portfolio',
      cost: 'one solve of Σ w = 1, scaled',
      wins: (
        <>
          <strong>Ignores μ entirely</strong>, the noisiest input: true Sharpe
          0.174, 0.185, 0.188 at 24, 60, 120 months against the plug-in&apos;s
          0.091, 0.124, 0.150.
        </>
      ),
      costs: (
        <>
          Gives up expected return by design (0.821% a month here against
          0.957% for the tangency mix); still leans on Σ.
        </>
      ),
      when: 'Means are unknowable but covariances are stable: the usual case for liquid assets.',
    },
    {
      name: 'Risk parity × Equal risk contribution',
      algoName: 'Risk parity',
      cost: 'a small fixed-point iteration on Σ',
      wins: (
        <>
          Each asset contributes the same share of variance, so no position
          dominates; no μ needed.
        </>
      ),
      costs: (
        <>
          Not on the frontier for any target; needs leverage to reach a
          return goal; inherits Σ&apos;s errors.
        </>
      ),
      when: 'Diversification by risk budget is the mandate and the return targets are set elsewhere.',
    },
    {
      name: 'Black-Litterman × Bayesian view blending',
      algoName: 'Black-Litterman',
      cost: 'one extra n × n solve to blend the prior with the views',
      wins: (
        <>
          Starts μ at the market-implied prior and lets views move it with
          stated confidence, so the weights stay near the benchmark instead
          of chasing sample noise.
        </>
      ),
      costs: (
        <>
          You must supply the views and their covariance; with no views it
          returns the market portfolio.
        </>
      ),
      when: 'An investor has opinions to express and wants the frontier machinery without the error maximization.',
    },
  ],
  neverUse: {
    name: 'Plugging short-window sample means into the optimizer',
    why: (
      <>
        Estimate μ and Σ from 24 months, hand them to the tangency formula,
        and hold the answer. Over 300 simulated windows that portfolio earned
        a true Sharpe of <strong>0.091 ± 0.004</strong> against 0.205 for
        equal weights and 0.212 for the true optimum, with a mean maximum
        weight of 2.4 times the budget: the optimizer finds the asset whose
        sample mean was luckiest and bets the book on it. Sixty months gave
        0.124 and 120 gave 0.150, still under 1/N. The sample GMV, which
        drops μ, earned 0.185 at 60 months, and shrinking Σ halfway to the
        identity lifted that to 0.210. The frontier is exact; the inputs are
        the problem.
      </>
    ),
  },

  contest: {
    instance:
      'five assets with monthly means 0.7% to 1.4% and a fixed covariance; Merton’s closed form as the frontier referee; 300 simulated windows of 24, 60, and 120 months, each portfolio scored by its true Sharpe at a 0.2% risk-free rate',
    columns: ['frontier accuracy', 'true Sharpe, 60 months', 'max |weight|, 60 months', 'needs'],
    rows: [
      {
        method: 'closed-form frontier (true μ, Σ)',
        isThisUnit: true,
        values: ['2 × 10⁻¹⁵ vs KKT', '0.2116 (the optimum)', '0.33', 'true parameters'],
        best: 1,
        verdict: 'the map, when the inputs are right',
      },
      {
        method: 'plug-in tangency (sample μ, Σ)',
        values: ['exact for its inputs', '0.124 ± 0.004', '2.16 ± 0.39', 'faith in sample means'],
        verdict: 'the error maximizer',
      },
      {
        method: 'sample GMV (ignore μ)',
        values: ['vertex only', '0.185 ± 0.001', '0.5', 'a decent Σ'],
        verdict: 'drops the noisiest input',
      },
      {
        method: 'shrunk GMV (Σ halfway to I)',
        values: ['vertex only', '0.210 ± 0.000', '0.4', 'a shrinkage weight'],
        verdict: 'within 0.002 of the truth',
      },
      {
        method: 'equal weights 1/N',
        values: ['none', '0.2054', '0.20', 'nothing'],
        verdict: 'the baseline that keeps winning',
      },
    ],
    source:
      'python solutions/mean_variance_optimization_markowitz_frontier.py prints these tables and asserts: KKT weights equal the closed form and variances the hyperbola on 81 targets; the GMV is the vertex; two-fund separation on 50 random covariances; the tangency Sharpe equals the formula and beats a 3,000-point grid; the exact long-only frontier lies under every sampled grid portfolio and inside the short-sale frontier; the plug-in Sharpe rises with the window yet stays below 1/N and the truth; the sample GMV beats the plug-in; the plug-in’s maximum weight exceeds 1.5 at 24 and 60 months.',
  },

  figure: (
    <Figure
      id="fig-markowitz-frontier"
      aspect="16 / 7"
      caption="The five-asset frontier from Merton’s closed form with the GMV vertex (blue), the tangency portfolio (amber) where the capital line from the 0.2% rate touches the curve, and equal weights (grey) just inside; the red marks are the true positions of the plug-in tangency portfolios built from 24, 60, and 120 simulated months, inside the frontier and below 1/N at every window."
      cite={{
        text: 'H. Markowitz, "Portfolio Selection," Journal of Finance 7(1), 1952. R. C. Merton, "An analytic derivation of the efficient portfolio frontier," Journal of Financial and Quantitative Analysis 7(4), 1972. V. DeMiguel, L. Garlappi, and R. Uppal, "Optimal versus naive diversification: how inefficient is the 1/N portfolio strategy?" Review of Financial Studies 22(5), 2009. J. Tobin, "Liquidity preference as behavior towards risk," Review of Economic Studies 25(2), 1958.',
        href: 'https://doi.org/10.1111/j.1540-6261.1952.tb01525.x',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="A mean-variance frontier with its vertex, tangency portfolio, capital line, equal weights, and the plug-in portfolios from three estimation windows sitting inside the curve">
        {(() => {
          const A = 952.8, B = 7.82, C = 0.0723, D = 7.65, rf = 0.002;
          const sx = (sd) => 60 + sd * 7000;
          const sy = (m) => 250 - (m - 0.001) * 15000;
          const pts = [];
          for (let k = 0; k <= 60; k += 1) {
            const m = 0.0035 + (0.0115 * k) / 60;
            pts.push(`${sx(Math.sqrt((A * m * m - 2 * B * m + C) / D)).toFixed(1)},${sy(m).toFixed(1)}`);
          }
          const tanM = 0.00957, tanSd = 0.03576;
          const slope = (tanM - rf) / tanSd;
          const plug = [['24 mo', 0.0913], ['60 mo', 0.1237], ['120 mo', 0.1502]];
          return (
            <g fontFamily="ui-monospace, monospace">
              <text x="20" y="22" fill="#9aa5bd" fontSize="10">sd on the x axis, monthly mean on the y axis; the curve is the closed form, equal to the KKT solve to 2e-15</text>
              <line x1="60" y1="250" x2="620" y2="250" stroke="#9aa5bd" strokeOpacity="0.5" />
              <line x1="60" y1="40" x2="60" y2="250" stroke="#9aa5bd" strokeOpacity="0.5" />
              <polyline points={pts.join(' ')} fill="none" stroke="#5da2ff" strokeWidth="2" />
              <line x1={sx(0)} y1={sy(rf)} x2={sx(0.075)} y2={sy(rf + slope * 0.075)} stroke="#f0b94b" strokeDasharray="4 3" />
              <circle cx={sx(Math.sqrt(1 / A))} cy={sy(B / A)} r="5" fill="#5da2ff" />
              <text x={sx(Math.sqrt(1 / A)) - 60} y={sy(B / A) + 18} fill="#5da2ff" fontSize="9">GMV 0.821% at sd 3.240%</text>
              <circle cx={sx(tanSd)} cy={sy(tanM)} r="5" fill="#f0b94b" />
              <text x={sx(tanSd) + 8} y={sy(tanM) - 6} fill="#f0b94b" fontSize="9">tangency 0.957% at 3.576%, Sharpe 0.2116</text>
              <circle cx={sx(0.0352)} cy={sy(0.0104)} r="4" fill="#9aa5bd" />
              <text x={sx(0.0352) + 8} y={sy(0.0104) + 12} fill="#9aa5bd" fontSize="9">1/N, Sharpe 0.2054</text>
              {plug.map(([name, s], i) => (
                <g key={name}>
                  <rect x={sx(0.06 + i * 0.006) - 3} y={sy(rf + s * (0.06 + i * 0.006)) - 3} width="6" height="6" fill="#e2606c" />
                  <text x={sx(0.06 + i * 0.006) + 6} y={sy(rf + s * (0.06 + i * 0.006)) + 4} fill="#e2606c" fontSize="9">plug-in {name}: {s.toFixed(3)}</text>
                </g>
              ))}
              <text x="62" y={sy(rf) - 4} fill="#f0b94b" fontSize="9">rf 0.2%</text>
              <text x="20" y="268" fill="#e2606c" fontSize="10">the plug-in portfolios sit on lines of slope 0.091 to 0.150, under 1/N at 0.205 and the tangency line at 0.212</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'mean_variance_optimization_markowitz_frontier.py',
  Viz: MarkowitzViz,
  narration,
};
