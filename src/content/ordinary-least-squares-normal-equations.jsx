import LeastSquaresViz from '../viz/LeastSquaresViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/ordinary_least_squares_normal_equations.py?raw';
import { narration } from './ordinary-least-squares-normal-equations.narration.js';

export const content = {
  given:
    'n observations of an outcome y and p explanatory columns X (an intercept among them), with noise in y. Find the coefficients β that minimize ‖y − Xβ‖², with standard errors, in work proportional to n and not to n².',
  task: 'Ordinary least squares. The algorithm is the projection: β̂ is the point of the column space nearest y, so the residual is orthogonal to every column and, by Gauss-Markov, β̂ has the smallest variance of any linear unbiased estimate. The heuristic is the normal equations: multiply through by Xᵀ so the n × p problem becomes the p × p system (XᵀX) β = Xᵀy, symmetric positive definite, solved by Cholesky after one pass over the rows. The price is a condition number squared.',
  constraint:
    'Measured against Householder QR, the Gauss-Markov formulas, and Jacobi singular values: on 200 × 4 Cholesky and QR agree to 1.8e-15; over 400 noise draws the coefficient means sit within 0.88 standard errors of the truth, variances match σ²(XᵀX)⁻¹ within 10%, and the 95% intervals cover 0.9506 ± 0.0054. On a 50-point Vandermonde design κ(XᵀX) = κ(X)² on eight degrees; the normal-equation error runs 1.9e-11 to 1.4e-3 at degrees 4 to 10 against QR’s 2.7e-15 to 2.8e-10, and Cholesky dies at degree 12 where QR errs 6.4e-9. 108,108 flops against 263,870 at n = 4,000, p = 6. 0.4 s.',

  origins: (
    <p>
      Adrien-Marie Legendre published least squares in <strong>1805</strong>{' '}
      (&quot;Nouvelles méthodes pour la détermination des orbites des
      comètes&quot;) and wrote the normal equations as the condition for the
      minimum; Carl Friedrich Gauss claimed priority from 1795 and gave the
      probabilistic reading in <em>Theoria motus</em> (1809), where the
      elimination that solves them also appears (puzzle 133 is its live
      lesson). Andrey Markov (1900) proved the minimum-variance property
      that carries both names. The numerics came later: Peter Läuchli (1961)
      exhibited a matrix whose XᵀX rounds to singular while X is fine;
      Alston Householder (1958) and Gene Golub (1965) made QR the safe
      route.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>geometry and the guarantees</strong>. Projection
      makes the residual orthogonal to every column (largest inner product
      2.2e-13 here). Gauss-Markov is measured, not quoted: across 400 noise
      draws on a fixed 200 × 4 design the coefficient means sit within{' '}
      <strong>0.88 standard errors</strong> of the truth, the empirical
      variances match σ²(XᵀX)⁻¹ to within 10%, and intervals built from
      that inverse cover <strong>95.06%</strong> of the time, ±0.54%.
      The same inverse is every standard error and every test.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>arithmetic and the flaw</strong>. One pass over the
      rows builds XᵀX and Xᵀy, Cholesky factors the small matrix, two
      triangular solves finish: <strong>108,108 flops</strong> at n = 4,000,
      p = 6 against Householder QR&apos;s 263,870, answers equal to 8e-17.
      The flaw is κ(XᵀX) = κ(X)², measured two independent ways (Jacobi
      singular values of X, Jacobi eigenvalues of XᵀX) to within 5% on
      eight polynomial degrees, until the square passes 1e16 and the
      smallest eigenvalue comes back negative: Cholesky stops at degree 12
      on a pivot of −5.1e-13 while QR still errs 6.4e-9.
    </p>
  ),

  picture: (
    <p>
      A surveyor with two hundred sightings of a plot wants the one map that
      disagrees least with all of them. Reconciling every sighting on the
      table is the QR route, careful and twice as long. Totaling them first
      into a small ledger, one line per unknown, is the normal equations:
      fast and, for ordinary plots, exact. But totaling rounds. Two vantage
      points that nearly coincide enter the ledger as a tiny difference
      squared, which can round to nothing, and the map has a hole exactly
      where the data knew the answer.
    </p>
  ),

  steps: [
    <>
      <strong>Accumulate:</strong> one pass adds each row&apos;s outer product
      into XᵀX (half of it, by symmetry) and each row times yᵢ into Xᵀy:
      about n p²/2 + n p flops, no rows kept.
    </>,
    <>
      <strong>Factor:</strong> Cholesky XᵀX = LLᵀ in p³/6 flops; a pivot
      ≤ 0 means the columns are dependent to working precision: stop and
      switch to QR.
    </>,
    <>
      <strong>Solve:</strong> forward substitution with L, backward with Lᵀ,
      2p² flops; β̂ in hand.
    </>,
    <>
      <strong>Diagnose:</strong> s² = RSS/(n − p); (XᵀX)⁻¹ by p more
      solves gives every standard error and interval; and check κ(X) before
      trusting the digits: κ² near 1e16 means the ledger has rounded the
      answer away.
    </>,
  ],

  signals: [
    <>
      <strong>n ≫ p:</strong> the pass over the data dominates and the
      normal equations make it once, in 0.41× the flops of QR.
    </>,
    <>
      <strong>Scaled, non-collinear columns:</strong> κ(X) in the thousands
      squares to millions, which double precision carries without a flinch.
    </>,
    <>
      <strong>You need the covariance:</strong> (XᵀX)⁻¹ is the standard
      errors, and the normal equations have already built the matrix.
    </>,
    <>
      <strong>Streaming rows:</strong> the ledger updates one row at a time
      with nothing stored.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>gradient descent</strong> (puzzle 20)
      on the same objective: on the degree-6 monomial design, κ(XᵀX) =
      3.9e8, 5,000 steps at the largest stable step leave the coefficients
      1.19 off and the fit 1.9e-2 off, where the direct solve is exact to
      4.5e-14. Standardizing the columns only brings κ to 9.8e7.
    </>
  ),

  strength: (
    <>
      <strong>One pass, p × p work, and the covariance for free.</strong>{' '}
      108,108 flops against 263,870 at n = 4,000, p = 6; unbiased, variances
      on the Gauss-Markov formula to 10%, intervals covering 95.06%; a
      non-positive pivot as the honest failure signal.
    </>
  ),
  weakness: (
    <>
      <strong>It squares the condition number.</strong> 1.9e-11 against QR&apos;s
      2.7e-15 on a harmless quartic; 1.4e-3 against 2.8e-10 at degree 10;
      failure at degree 12 where QR still has eight digits. Läuchli&apos;s
      three columns differing by 1e-8 round XᵀX to a matrix of ones. And
      like any least squares, one outlier moves the slope 0.361 where
      Theil-Sen moves 0.005.
    </>
  ),

  problem: 'Regression',
  problemSlug: 'regression',
  rivals: [
    {
      name: 'Ordinary least squares × Normal equations',
      isThisUnit: true,
      algoName: 'Ordinary least squares',
      cost: 'n p²/2 + p³/6 flops, one pass over the rows',
      wins: (
        <>
          <strong>0.41× the flops of QR</strong> with the same answer to
          8e-17 when κ(X) is modest; (XᵀX)⁻¹ comes with it; rows can stream.
        </>
      ),
      costs: (
        <>
          Sees κ(X)²: four to six digits lost against QR on the Vandermonde
          design, a dead pivot at degree 12.
        </>
      ),
      when: 'Many rows, few well-scaled columns, standard errors wanted, κ(X) below about 1e7.',
    },
    {
      name: 'Householder QR',
      algoName: 'QR decomposition',
      cost: '2 n p² − 2p³/3 flops, the rows in memory',
      wins: (
        <>
          Error grows like κ, not κ²: 2.7e-15, 4.5e-14, 4.2e-12, 2.8e-10,
          6.4e-9 at degrees 4 to 12; solves Läuchli to 1.8e-15 where
          Cholesky dies.
        </>
      ),
      costs: (
        <>
          2.44× the flops here, a second pass for (XᵀX)⁻¹ if you want the
          covariance, no one-row streaming.
        </>
      ),
      when: 'Any design you have not conditioned-checked, polynomial or collinear columns, κ(X) above 1e7.',
    },
    {
      name: 'Ridge regression',
      algoName: 'Ridge regression',
      cost: 'the normal equations plus λ on the diagonal',
      wins: (
        <>
          On columns correlated at 0.9999 the coefficient RMSE falls from
          11.60 to 2.11 at λ = 1; the small matrix is always positive
          definite.
        </>
      ),
      costs: (
        <>
          Bias of 1.49 on each of the two collinear coefficients, pulled
          toward their average; λ to choose.
        </>
      ),
      when: 'Collinear or many columns where prediction matters more than any one coefficient.',
    },
    {
      name: 'Theil-Sen estimator',
      algoName: 'Theil-Sen estimator',
      cost: 'O(n²) pairwise slopes, a median',
      wins: (
        <>
          One outlier 40 units off in 60 points moves its slope 0.005
          against least squares&apos; 0.361; Huber&apos;s reweighting (an
          IRLS of normal equations) also lands at 0.005.
        </>
      ),
      costs: (
        <>
          Quadratic in n for one regressor, no closed-form standard errors,
          less efficient than least squares on clean Gaussian data.
        </>
      ),
      when: 'Heavy-tailed errors or data with mistakes in it; puzzle 145 (RANSAC) is the gross-outlier cousin.',
    },
  ],
  neverUse: {
    name: 'The normal equations, or gradient descent, on a raw monomial design past degree ten',
    why: (
      <>
        Fifty points on [0, 1] with exact polynomial data. At degree 10,
        κ(X) = 2.0e7 and the normal equations return coefficients{' '}
        <strong>1.4e-3 off</strong> where QR is 2.8e-10 off; at degree 12
        Cholesky meets a pivot of −5.1e-13 and stops while QR still has
        eight digits. Iterating does not help: on the degree-6 design 5,000
        steps of gradient descent leave the coefficients 1.19 off against
        the direct solve&apos;s 4.5e-14, and standardizing the columns only
        moves κ(XᵀX) from 3.9e8 to 9.8e7. The fix is a basis or a
        factorization that keeps the columns orthogonal: Chebyshev or
        Legendre polynomials, or QR.
      </>
    ),
  },

  contest: {
    instance:
      'Vandermonde design, 50 points on [0, 1], exact data with coefficients ±1: max coefficient error by degree; last column: flops on an n = 4,000, p = 6 Gaussian design',
    columns: ['d = 6 (κ 2.0e4)', 'd = 8 (κ 6.3e5)', 'd = 10 (κ 2.0e7)', 'd = 12 (κ 6.8e8)', 'flops, n = 4,000, p = 6'],
    rows: [
      {
        method: 'normal equations (Cholesky)',
        isThisUnit: true,
        values: ['1.3e-9', '3.3e-6', '1.4e-3', 'pivot −5.1e-13, fails', '108,108'],
        best: 4,
        verdict: 'fastest, and κ² digits short',
      },
      {
        method: 'Householder QR',
        values: ['4.5e-14', '4.2e-12', '2.8e-10', '6.4e-9', '263,870'],
        best: 0,
        verdict: 'κ digits, every degree',
      },
      {
        method: 'gradient descent, 5,000 steps at 1/λmax',
        values: ['1.19', '·', '·', '·', '5,000 × 2 n p'],
        verdict: 'slow and confident at once',
      },
      {
        method: 'ridge (λ = 1) on two columns at ρ = 0.9999',
        values: ['RMSE 2.11 vs 11.60', 'bias 1.49', '·', '·', 'as normal equations'],
        verdict: 'variance for bias',
      },
    ],
    source:
      'python solutions/ordinary_least_squares_normal_equations.py prints this table and asserts: Cholesky equals QR within 1e-10 with residuals orthogonal within 1e-9; over 400 seeds max z < 3, variances within 25% of σ²(XᵀX)⁻¹, coverage in [0.925, 0.975]; κ(XᵀX) = κ(X)² within 5% wherever κ² < 1e14; Cholesky errs more than QR at degrees 6 and 8 and fails where QR still errs below 1e-3; Läuchli fails Cholesky only; ridge cuts the RMSE by more than 5× with a visible bias; QR costs 1.8× to 3.5× the flops; gradient descent stays off by more than 0.1; one outlier moves least squares more than 5× as far as Theil-Sen or Huber. 22 checks.',
  },

  figure: (
    <Figure
      id="fig-ols-normal-equations"
      aspect="16 / 7"
      caption="Max coefficient error against κ(X) on the 50-point Vandermonde design (log-log): the normal equations (amber) climb like κ², Householder QR (blue) like κ; the red line is degree 12, where Cholesky meets a negative pivot while QR still errs 6.4e-9."
      cite={{
        text: 'A.-M. Legendre, Nouvelles méthodes pour la détermination des orbites des comètes, 1805. C. F. Gauss, Theoria motus corporum coelestium, 1809. P. Läuchli, "Jordan-Elimination und Ausgleichung nach kleinsten Quadraten," Numerische Mathematik 3, 1961, DOI 10.1007/BF01386022. G. H. Golub and C. F. Van Loan, Matrix Computations, 4th ed., chapter 5.',
        href: 'https://doi.org/10.1007/BF01386022',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="Coefficient error of the normal equations and of QR against the condition number of the design">
        {(() => {
          const x0 = 70;
          const y0 = 232;
          const pw = 540;
          const ph = 190;
          const degs = [4, 6, 8, 10, 12, 14];
          const kap = [6.4e2, 2.0e4, 6.3e5, 2.0e7, 6.8e8, 2.3e10];
          const chol = [1.9e-11, 1.3e-9, 3.3e-6, 1.4e-3, null, null];
          const qr = [2.7e-15, 4.5e-14, 4.2e-12, 2.8e-10, 6.4e-9, 8.8e-8];
          const X = (k) => x0 + ((Math.log10(k) - 2) / 9) * pw;
          const Y = (e) => y0 - ((Math.log10(e) + 16) / 16) * ph;
          const poly = (vals, color) => (
            <polyline points={vals.map((e, i) => (e === null ? null : `${X(kap[i])},${Y(e)}`)).filter(Boolean).join(' ')} fill="none" stroke={color} strokeWidth="2" />
          );
          return (
            <g>
              <line x1={x0} y1={y0} x2={x0 + pw} y2={y0} stroke="#9aa5bd" strokeOpacity="0.6" />
              <line x1={x0} y1={y0 - ph} x2={x0} y2={y0} stroke="#9aa5bd" strokeOpacity="0.6" />
              {poly(chol, '#f0b94b')}
              {poly(qr, '#5da2ff')}
              {degs.map((d, i) => <text key={d} x={X(kap[i]) - 8} y={y0 + 14} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">d={d}</text>)}
              {[1e-15, 1e-12, 1e-9, 1e-6, 1e-3, 1].map((e) => <text key={e} x={x0 - 46} y={Y(e) + 3} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">{e.toExponential(0)}</text>)}
              <line x1={X(6.8e8)} y1={y0 - ph} x2={X(6.8e8)} y2={y0} stroke="#e2606c" strokeDasharray="3 3" />
              <text x={X(6.8e8) + 4} y={y0 - ph + 12} fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="9">pivot &lt; 0</text>
              <text x={x0} y="22" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">max coefficient error vs kappa(X), Vandermonde 50 pts</text>
              <text x={x0} y="36" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="10">amber: normal equations (slope 2)</text>
              <text x={x0} y="50" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="10">blue: Householder QR (slope 1)</text>
              <text x={x0 + 300} y={y0 + 14} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">kappa(X) from 1e2 to 1e11</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'ordinary_least_squares_normal_equations.py',
  Viz: LeastSquaresViz,
  narration,
};
