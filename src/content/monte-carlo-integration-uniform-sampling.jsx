import MonteCarloIntegrationViz from '../viz/MonteCarloIntegrationViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/monte_carlo_integration_uniform_sampling.py?raw';
import { narration } from './monte-carlo-integration-uniform-sampling.narration.js';

export const content = {
  given:
    'The integral of a function over a box in d dimensions, where d is large enough that m points per axis multiply into m^d evaluations, more than you can afford at any m worth having. You also want to know how wrong the answer is.',
  task: 'Monte Carlo integration. The algorithm (Metropolis and Ulam 1949) rewrites the integral as the box volume times the mean of f over the box, estimates the mean by averaging f at random points, and reads the error off the sample standard deviation divided by √N. The heuristic is uniform sampling: draw the points independently and uniformly over the box, nothing cleverer. The estimate is unbiased, the error estimate is honest whenever the variance is finite, and the error falls as 1/√N in any number of dimensions, because the dimension never enters the formula. A grid cannot say that: m points per axis is m^d evaluations, and at d = 10 even m = 3 is 59,049.',
  constraint:
    'Measured against closed forms: on a product integrand with integral exactly 1, the root-mean-square error over 40 runs fell as N^−0.47, N^−0.55, N^−0.50, N^−0.49 in 1, 2, 6, and 10 dimensions, from 0.158 at N = 100 to 0.0166 at N = 10,000 in 10-D; the 95% interval from the sample standard deviation covered the exact Gaussian-cube integral in 94.3% of 300 repetitions (realized RMS error 0.00294 against the mean claimed 0.00280). At an equal budget on the Gaussian cube: in 1-D with 10,001 evaluations Simpson’s rule errs 8.9 × 10⁻¹⁶ and the trapezoid 6.1 × 10⁻¹⁰ against Monte Carlo’s 1.7 × 10⁻⁴; in 10-D with 1,024 evaluations Monte Carlo errs 1.7 × 10⁻³ (3% of the integral) where the two-point trapezoid grid errs 3.2 × 10⁻², 58% of the integral. Halton points beat uniform sampling 11× in 2-D and 3× in 6-D and lose in 10-D; stratified sampling beat both everywhere. On x^−3/4 over (0, 1], integral 4 and infinite variance, the interval covered the truth 65% of the time and the error fell only as N^−0.42.',

  origins: (
    <p>
      Stanislaw Ulam, convalescing in 1946, wondered whether playing out
      solitaire hands could estimate the odds that patience alone could not
      compute; John von Neumann saw the same idea would follow neutrons
      through fissile material on ENIAC, and Nicholas Metropolis named the
      method after the casino where Ulam&apos;s uncle gambled. Metropolis and
      Ulam published &quot;The Monte Carlo method&quot; in the Journal of the
      American Statistical Association in <strong>1949</strong>. Buffon had
      estimated π by dropping needles in 1777 and Kelvin sampled molecules
      from a hat in 1901; the 1949 paper made random sampling a general
      tool for integrals, especially the high-dimensional ones of
      statistical physics. Niederreiter&apos;s 1992 monograph set the
      quasi-random alternative on its theoretical footing; today the method
      prices derivatives, renders light in films (path tracing), computes
      Bayesian expectations (Markov chain Monte Carlo, puzzles 16 and 107
      on this site), and sizes its own error bars.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>identity</strong>: an integral over a box is the box
      volume times the mean of f, and a mean has a textbook estimator with a
      textbook standard error, s/√N. The referee is a closed form in every
      dimension (a product integrand equal to exactly 1, a Gaussian cube
      equal to a power of (√π/2) erf(1), a ball of volume π^{'{d/2}'}/Γ(d/2 + 1))
      plus the realized error over hundreds of repetitions. The error bar
      earned its keep: <strong>94.3% coverage</strong> of a 95% interval,
      realized RMS error 0.00294 against the claimed 0.00280.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>distribution</strong>: independent uniform points,
      which make the estimator unbiased and the central limit theorem
      apply, so the error is σ/√N whatever d is. Measured slopes{' '}
      <strong>−0.47, −0.55, −0.50, −0.49</strong> in 1, 2, 6, and 10
      dimensions, and the ratio of the error at N = 100 to N = 10,000
      within 9 to 13 of the predicted 10 in every dimension. The same
      simplicity is the ceiling: cleverer point sets (Halton, stratified)
      beat uniform sampling by 3 to 11× where the dimension is low, and the
      1/√N law never speeds up.
    </p>
  ),

  picture: (
    <p>
      Estimating the area of a lake from a map by throwing darts at the
      whole page and counting the fraction that land in the water. Throw
      a hundred and the fraction is right to within a tenth; throw ten
      thousand and it is right to within a hundredth; the shape of the lake
      never matters, and neither would it matter if the map were a cube or
      a ten-dimensional box, because a dart is a dart. A surveyor pacing a
      grid would need a thousand strides per side in two dimensions and
      could not pace a ten-dimensional lake at all.
    </p>
  ),

  steps: [
    <>
      <strong>Sample:</strong> draw N points x₁ … x_N independently and
      uniformly in the box B.
    </>,
    <>
      <strong>Evaluate:</strong> f(xᵢ) for each; keep the running sum and
      sum of squares.
    </>,
    <>
      <strong>Estimate:</strong> I ≈ vol(B) × mean of the f(xᵢ).
    </>,
    <>
      <strong>Error bar:</strong> vol(B) × s/√N with s the sample standard
      deviation; a 95% interval is ±1.96 of that, an asymptotic normal approximation for independent samples with finite variance, not a finite-sample guarantee.
    </>,
    <>
      <strong>Refine:</strong> four times the samples halve the error, in
      every dimension; to do better, change the points (stratified,
      quasi-random) or the measure (importance sampling), not the law.
    </>,
  ],

  signals: [
    <>
      <strong>Many dimensions:</strong> expectations over dozens of
      variables, option payoffs over paths, light transport; any grid is
      hopeless past d ≈ 6.
    </>,
    <>
      <strong>A rough answer with an honest error bar beats a precise one
      you cannot afford:</strong> two or three digits, and knowing which.
    </>,
    <>
      <strong>f is cheap to evaluate anywhere and finite in variance:</strong>{' '}
      indicator functions, bounded payoffs, smooth densities.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the <strong>trapezoid rule on a product
      grid</strong>: exact to 6 × 10⁻¹⁰ in 1-D at the same budget, 58%
      wrong in 10-D, where 1,024 evaluations buy two points per axis.
    </>
  ),

  strength: (
    <>
      <strong>Dimension-blind convergence with a self-reported error.</strong>{' '}
      N^−0.47 to N^−0.55 in 1 to 10 dimensions; 94.3% coverage of the 95%
      interval; 3% error in 10-D at 1,024 evaluations where the grid is 58%
      wrong; the volume of a 10-ball from 200,000 darts within 1.2% of
      π⁵/120.
    </>
  ),
  weakness: (
    <>
      <strong>Slow where a grid is fast, and silent when the variance is
      infinite.</strong> In 1-D at 10,001 evaluations Simpson is 2 × 10¹¹
      times more accurate; Halton and stratified points beat uniform
      sampling 3 to 11× in 2 to 6 dimensions; and on x^−3/4 the sample
      standard deviation claimed 0.47 where the realized error was 0.79,
      the interval covered the truth 65% of the time, and the error fell as
      N^−0.42.
    </>
  ),

  problem: 'Numerical integration',
  problemSlug: 'numerical-integration',
  rivals: [
    {
      name: 'Monte Carlo integration × Uniform sampling',
      isThisUnit: true,
      algoName: 'Monte Carlo integration',
      cost: 'N evaluations; error σ/√N in any dimension',
      wins: (
        <>
          <strong>3% in 10-D at 1,024 evaluations</strong> where the grid
          is 58% wrong; an error bar that covered 94.3% of the time.
        </>
      ),
      costs: (
        <>
          1.7 × 10⁻⁴ in 1-D where Simpson has 8.9 × 10⁻¹⁶; infinite
          variance fools the bar.
        </>
      ),
      when: 'High dimension, a cheap integrand, and a tolerance of a few digits with an honest error estimate.',
    },
    {
      name: 'Quasi-Monte Carlo',
      algoName: 'Quasi-Monte Carlo',
      cost: 'N evaluations at low-discrepancy points',
      wins: (
        <>
          Halton points beat uniform sampling 11× in 2-D and 3× in 6-D at
          4,096 evaluations; error near (log N)^d/N.
        </>
      ),
      costs: (
        <>
          No built-in error bar; lost to uniform sampling in 10-D at
          1,024 points here.
        </>
      ),
      when: 'Moderate dimension, smooth integrands, and a budget you want to spend better than randomly.',
    },
    {
      name: 'Gauss-Legendre quadrature',
      algoName: 'Gauss-Legendre quadrature',
      cost: 'm evaluations per axis, m^d on a grid',
      wins: (
        <>
          Five points gave 6 × 10⁻⁹ in 1-D; exact for polynomials of degree
          2m − 1.
        </>
      ),
      costs: (
        <>
          m^d evaluations: 5¹⁰ is 9.8 million; needs smoothness.
        </>
      ),
      when: 'One to three dimensions and a smooth integrand: unbeatable there.',
    },
    {
      name: 'Stratified sampling',
      algoName: 'Stratified sampling',
      cost: 'one random point per grid cell',
      wins: (
        <>
          Beat uniform sampling at every dimension tried: 4.3× in 1-D, 57× in
          2-D, 3.6× in 6-D, 1.9× in 10-D.
        </>
      ),
      costs: (
        <>
          A cell count that is a d-th power; the gain fades as d grows.
        </>
      ),
      when: 'The budget is a round m^d and the integrand varies smoothly across cells.',
    },
  ],
  neverUse: {
    name: 'A product-rule grid in ten dimensions',
    why: (
      <>
        A grid spends its budget as points per axis to the d-th power. At
        d = 10 and 1,024 evaluations that is two points per axis, the ends
        of each interval and nothing between, and the trapezoid rule on the
        Gaussian cube came out <strong>58% wrong</strong> (3.2 × 10⁻² on an
        integral of 0.054) where 1,024 uniform points came within 3%.
        Simpson&apos;s rule needs three points per axis, 3¹⁰ = 59,049
        evaluations for its coarsest grid; Gauss-Legendre with five, 9.8
        million. The grid&apos;s accuracy is bought per axis and the axes
        multiply; the darts&apos; accuracy is bought per point and the points
        add.
      </>
    ),
  },

  contest: {
    instance:
      'the Gaussian over the unit cube, exact value a power of (√π/2) erf(1), at an equal evaluation budget per dimension: 10,001 in 1-D, 4,096 in 2-D and 6-D, 1,024 in 10-D; random methods report the root-mean-square error over 40 runs, deterministic ones a single error; one currency: function evaluations',
    columns: ['1-D (10,001)', '2-D (4,096)', '6-D (4,096)', '10-D (1,024)'],
    rows: [
      {
        method: 'Monte Carlo, uniform sampling',
        isThisUnit: true,
        values: ['1.7 × 10⁻⁴', '3.0 × 10⁻³', '1.8 × 10⁻³', '1.7 × 10⁻³ (3%)'],
        verdict: 'the same law in every column',
      },
      {
        method: 'trapezoid rule, product grid',
        values: ['6.1 × 10⁻¹⁰', '2.3 × 10⁻⁵ (64 × 64)', '9.3 × 10⁻³ (4⁶)', '3.2 × 10⁻² (2¹⁰, 58%)'],
        best: 0,
        verdict: 'the baseline: wins low, collapses high',
      },
      {
        method: 'Simpson / Gauss-Legendre (5)',
        values: ['8.9 × 10⁻¹⁶ / 6.1 × 10⁻⁹', '·', '·', 'needs 3¹⁰ = 59,049 / 5¹⁰'],
        verdict: 'exact in 1-D, unaffordable in 10-D',
      },
      {
        method: 'Halton quasi-random points',
        values: ['1.1 × 10⁻⁴', '2.6 × 10⁻⁴', '5.6 × 10⁻⁴', '2.3 × 10⁻³'],
        verdict: '11x and 3x better, then worse',
      },
      {
        method: 'stratified (one point per cell)',
        values: ['3.9 × 10⁻⁸', '5.3 × 10⁻⁵', '5.0 × 10⁻⁴', '8.9 × 10⁻⁴'],
        verdict: 'better everywhere, by less each dimension',
      },
    ],
    source:
      'python solutions/monte_carlo_integration_uniform_sampling.py prints this table and asserts: log-log error slopes between -0.62 and -0.38 in 1, 2, 6, and 10 dimensions and the 100-to-10,000 error ratio between 6 and 16; 95% interval coverage between 0.90 and 0.99 with the realized RMS error within 25% of the claimed standard error; Simpson under 1e-12, trapezoid under 1e-7, Gauss-Legendre under 1e-6, and Monte Carlo more than 100 times the trapezoid error in 1-D; Halton under a fifth of the Monte Carlo error in 2-D; Monte Carlo under the trapezoid grid in 6-D and more than ten times better in 10-D, where the grid is more than half the integral wrong; the 10-ball volume within four predicted standard errors; and on the infinite-variance integrand coverage under 0.9, realized error above 1.3 times the claimed, and a slope above -0.45.',
  },

  figure: (
    <Figure
      id="fig-mc-integration-law"
      aspect="16 / 7"
      caption="Left: root-mean-square error against sample count on log axes for the product integrand in 1, 2, 6, and 10 dimensions (measured over 40 runs), with the 1/√N slope drawn: the lines differ in height by the integrand's variance and share the slope. Right: absolute error at an equal budget on the Gaussian cube, by dimension, for uniform Monte Carlo, the trapezoid grid, and Halton points (log scale)."
      cite={{
        text: 'N. Metropolis and S. Ulam, "The Monte Carlo method," Journal of the American Statistical Association 44(247), 1949, pp. 335-341, DOI 10.1080/01621459.1949.10483310. H. Niederreiter, Random Number Generation and Quasi-Monte Carlo Methods, SIAM, 1992.',
        href: 'https://doi.org/10.1080/01621459.1949.10483310',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="Log-log error curves for four dimensions sharing a slope of minus one half, beside per-dimension error bars for three methods">
        {(() => {
          const x0 = 50;
          const y0 = 230;
          const pw = 250;
          const ph = 180;
          const X = (n) => x0 + ((Math.log10(n) - 2) / 2) * pw;
          const Y = (e) => y0 - ((Math.log10(e) + 2.6) / 2.0) * ph;
          const series = [
            ['#5da2ff', '1-D', [[100, 0.0320], [1000, 0.0125], [10000, 0.0036]]],
            ['#62d98a', '2-D', [[100, 0.0553], [1000, 0.0169], [10000, 0.0044]]],
            ['#f0b94b', '6-D', [[100, 0.1015], [1000, 0.0335], [10000, 0.0102]]],
            ['#e2606c', '10-D', [[100, 0.1580], [1000, 0.0438], [10000, 0.0166]]],
          ];
          const bx = 360;
          const by = 230;
          const groups = [
            ['1-D', [1.7e-4, 6.1e-10, 1.1e-4]],
            ['2-D', [3.0e-3, 2.3e-5, 2.6e-4]],
            ['6-D', [1.8e-3, 9.3e-3, 5.6e-4]],
            ['10-D', [1.7e-3, 3.2e-2, 2.3e-3]],
          ];
          const colors = ['#5da2ff', '#9aa5bd', '#f0b94b'];
          const BY = (e) => by - ((Math.log10(e) + 10) / 9) * 180;
          return (
            <g>
              <line x1={x0} y1={y0} x2={x0 + pw} y2={y0} stroke="#9aa5bd" strokeOpacity="0.6" />
              <line x1={X(100)} y1={Y(0.3)} x2={X(10000)} y2={Y(0.03)} stroke="#9aa5bd" strokeOpacity="0.6" strokeDasharray="4 3" />
              <text x={X(3000)} y={Y(0.07)} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">1/√N</text>
              {series.map(([c, label, pts]) => (
                <g key={label}>
                  <polyline points={pts.map(([n, e]) => `${X(n)},${Y(e)}`).join(' ')} fill="none" stroke={c} strokeWidth="2" />
                  {pts.map(([n, e]) => <circle key={n} cx={X(n)} cy={Y(e)} r="3" fill={c} />)}
                  <text x={X(10000) + 6} y={Y(pts[2][1]) + (label === '1-D' ? 8 : label === '2-D' ? -2 : 3)} fill={c} fontFamily="ui-monospace, monospace" fontSize="9">{label}</text>
                </g>
              ))}
              {[100, 1000, 10000].map((n) => <text key={n} x={X(n) - 10} y={y0 + 14} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">{n.toLocaleString()}</text>)}
              {[0.1, 0.01].map((e) => <text key={e} x={x0 - 30} y={Y(e) + 3} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">{e}</text>)}
              <text x={x0} y="22" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">RMS error vs N: slopes near −0.5</text>
              <text x={bx} y="22" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">error (log): MC blue, grid gray, Halton amber</text>
              {groups.map(([label, vals], g) => (
                <g key={label}>
                  {vals.map((v, i) => (
                    <rect key={i} x={bx + g * 68 + i * 18} y={BY(v)} width="14" height={by - BY(v)} fill={colors[i]} fillOpacity="0.85" />
                  ))}
                  <text x={bx + g * 68 + 12} y={by + 14} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">{label}</text>
                </g>
              ))}
              {[1e-2, 1e-4, 1e-6, 1e-8].map((e) => <text key={e} x={bx - 36} y={BY(e) + 3} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="8">{e.toExponential(0)}</text>)}
              <text x={bx} y="262" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">10-D: grid 3.2e-2 (58%), MC 1.7e-3, Halton 2.3e-3</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'monte_carlo_integration_uniform_sampling.py',
  Viz: MonteCarloIntegrationViz,
  narration,
};
