import GaussianProcessViz from '../viz/GaussianProcessViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/gaussian_process_regression_rbf_kernel.py?raw';
import { narration } from './gaussian-process-regression-rbf-kernel.narration.js';

export const content = {
  given:
    'A few dozen noisy measurements of an unknown smooth function: sensor readings along a pipe, yields over a temperature range, a simulator that costs an hour per run. Predict the function everywhere, and say how sure you are at each point.',
  task: 'Gaussian process regression. The algorithm puts a prior over functions, conditions it on the data, and reads off a Gaussian predictive distribution at every input: a mean and a variance from one Cholesky factorization of the n × n kernel matrix plus noise. The heuristic is the choice of kernel: the squared-exponential (RBF) kernel k(x, z) = exp(−(x − z)²/2ℓ²), which says nearby inputs have nearby outputs and that the function is infinitely smooth, with the length scale ℓ learned by maximizing the marginal likelihood. The same n³ solve yields the prediction, the error bar, and the evidence for the hyperparameters.',
  constraint:
    'Pure Python, 1-D inputs, our own Cholesky. Noise-free, the posterior mean passes through all 30 training points to 1e-6 with variance 1e-10 there. With noise 0.2 the GP weights equal kernel ridge regression by an independent Gauss-Jordan inverse to 1.4e-8, and with a quadratic-feature kernel the posterior equals the weight-space Bayesian linear regression posterior in mean (3.7e-14) and variance (6.1e-16). Over 150 functions drawn from the prior, the 95% predictive interval covered 0.9501 ± 0.0057 of the latent values (0.9486 of noisy ones). The Cholesky marginal likelihood matches the direct determinant formula to 1e-8, and its maximum over an 11-point grid recovered the generating length scale with geometric mean 1.009 (29 of 30 within one grid step). Held-out RMSE 0.162 at the learned length scale against 0.266 for 3-nearest neighbors, 0.687 at ℓ = 0.1, 0.626 at ℓ = 8. Fit time 1, 4, 25, 182 ms at n = 40, 80, 160, 320 (slope 2.87). 1.2 s.',

  origins: (
    <p>
      The method is older than its name. Danie Krige (1951) estimated gold
      grades on the Witwatersrand from weighted neighbors, and Georges
      Matheron (1963) made it <strong>kriging</strong>, the best linear
      unbiased predictor under a covariance model. In statistics the same
      object is Wiener-Kolmogorov prediction (1940s) and the smoothing
      spline as a posterior mean (Kimeldorf and Wahba, 1970). Machine
      learning adopted it after Radford Neal (1996) showed that a
      one-hidden-layer network with infinitely many units and Gaussian
      priors is exactly a Gaussian process, and Williams and Rasmussen
      (1996) fit the hyperparameters by marginal likelihood. Carl
      Rasmussen and Christopher Williams&apos;s 2006 book fixed the
      modern notation. Today the method is the default surrogate in
      Bayesian optimization and the standard answer when the data are
      few, the function is smooth, and the error bar matters.
    </p>
  ),

  algoRole: (
    <p>
      Owns <strong>conditioning and its oracles</strong>. A Gaussian prior
      conditioned on Gaussian observations is Gaussian, so the posterior
      is closed-form: one Cholesky of K + σ²I, one solve for the weights
      α, one triangular solve per prediction for the variance. The file
      checks the algebra three independent ways: against kernel ridge
      regression (same weights, 1.4e-8), against the weight-space
      posterior of Bayesian linear regression with the same features
      (3.7e-14), and against the direct determinant-and-inverse marginal
      likelihood (1e-8). Then it checks the probability: functions drawn
      from the prior fell inside the 95% band 95.01% ± 0.57% of the time.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>kernel and the length scale</strong>. The RBF
      kernel encodes smoothness and one knob, ℓ, decides how far an
      observation reaches. The marginal likelihood selects it without a
      validation set: on 30 functions generated at ℓ = 1 the maximizer
      had geometric mean 1.009 and landed within one grid step 29 times.
      The wrong knob is the whole failure mode: ℓ = 0.1 interpolates the
      noise and reverts to zero between points (RMSE 0.687), ℓ = 8 draws
      a near line (0.626), the learned ℓ gives 0.162. Random Fourier
      features approximate the same kernel with a finite basis: posterior
      error 0.142 at 50 features, 0.026 at 3,200.
    </p>
  ),

  picture: (
    <p>
      A surveyor with a handful of elevation readings and a belief about
      the terrain: it is smooth, and two points a kilometer apart tell you
      little about each other, two points a hundred meters apart tell you
      almost everything. From that belief and the readings, every unmeasured
      spot gets a best guess and an honest doubt: tight near the stakes,
      wide in the gaps, back to the prior far from any stake. Learning the
      length scale is learning how rugged the terrain is from the readings
      themselves. Get it wrong and the map either wiggles through every
      error or ignores every hill.
    </p>
  ),

  steps: [
    <>
      <strong>Build:</strong> K[i][j] = k(x_i, x_j) for the n training inputs;
      add σ² (and a jitter) on the diagonal.
    </>,
    <>
      <strong>Factor and solve:</strong> L = chol(K + σ²I), α = L⁻ᵀ L⁻¹ y: n³/6
      multiply-adds once; log marginal likelihood = −½ yᵀα − Σ log L_ii − (n/2) log 2π.
    </>,
    <>
      <strong>Predict:</strong> mean(x) = k(x, X) α; var(x) = k(x, x) − ‖L⁻¹ k(x, X)‖²:
      O(n) for the mean and O(n²) for the variance per test point.
    </>,
    <>
      <strong>Learn the knobs:</strong> maximize the log marginal likelihood over ℓ,
      the signal variance, and σ² (grid here, gradients in practice); it trades
      fit against complexity with no held-out set.
    </>,
  ],

  signals: [
    <>
      <strong>Few, expensive points:</strong> tens to a few thousand; the n³
      solve is cheap next to the data.
    </>,
    <>
      <strong>The error bar is the product:</strong> active learning, Bayesian
      optimization, safety margins, any decision that needs to know where
      the model is guessing.
    </>,
    <>
      <strong>Smoothness you believe:</strong> a stationary kernel is a strong
      prior; with it the posterior is calibrated, without it (steps,
      heteroscedastic noise) it is confidently wrong.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>3-nearest-neighbor regression</strong>:
      held-out RMSE 0.266 against the GP&apos;s 0.162 on the same 30 draws,
      no error bar, no hyperparameter to learn, and no way to say which of
      the two is right at a given point.
    </>
  ),

  strength: (
    <>
      <strong>Closed-form, calibrated, and self-tuning.</strong> One Cholesky
      gives prediction, uncertainty, and evidence; the 95% band held 95.01%
      of latent values over 150 prior draws; the marginal likelihood found
      the length scale 29 times out of 30; three independent algebraic
      routes agree to 1e-8 or better.
    </>
  ),
  weakness: (
    <>
      <strong>Cubic in n, and only as good as the kernel.</strong> 182 ms at
      n = 320 with slope 2.87, so n = 10,000 extrapolates to 1.5 hours and
      an 800 MB matrix at this file&apos;s pace; a length scale off by a
      factor of ten quadruples the error (0.687 or 0.626 against 0.162);
      the RBF prior assumes one smoothness everywhere.
    </>
  ),

  problem: 'Regression',
  problemSlug: 'regression',
  rivals: [
    {
      name: 'Gaussian process regression × RBF kernel',
      isThisUnit: true,
      algoName: 'Gaussian process regression',
      cost: 'n³/6 once, n² per predictive variance',
      wins: (
        <>
          <strong>Mean, variance, and evidence from one factorization</strong>;
          coverage 0.9501 ± 0.0057 at nominal 0.95; length scale recovered
          29 of 30 times; RMSE 0.162.
        </>
      ),
      costs: (
        <>
          Cubic: 1, 4, 25, 182 ms at n = 40 to 320; the whole story depends
          on a kernel chosen by hand.
        </>
      ),
      when: 'Hundreds to a few thousand points, a smooth target, and a decision that needs the error bar.',
    },
    {
      name: 'Kernel ridge regression',
      algoName: 'Kernel ridge regression',
      cost: 'the same n³ solve',
      wins: (
        <>
          The identical mean: weights agree to 1.4e-8 when the ridge equals
          the noise variance; a loss-minimization story with no probability.
        </>
      ),
      costs: (
        <>
          No variance, no marginal likelihood: the ridge and the kernel
          width need cross-validation instead of evidence.
        </>
      ),
      when: 'You want the point prediction only and prefer tuning by held-out error.',
    },
    {
      name: 'Sparse Gaussian process (DTC, inducing points)',
      algoName: 'Sparse Gaussian process',
      cost: 'n m² for m inducing points',
      wins: (
        <>
          At n = 200, m = 20 inducing points reproduce the exact posterior mean
          to 1.7e-4 for 6% of the work; m = 40 to 5.4e-8 for 24%.
        </>
      ),
      costs: (
        <>
          m = 5 is 0.33 off and m = 10 is 0.18: too few points for the
          length scale and the approximation collapses; variances need the
          FITC or variational corrections.
        </>
      ),
      when: 'n in the tens of thousands or more, with a smooth target that a few hundred inducing points can carry.',
    },
    {
      name: 'Random Fourier features',
      algoName: 'Random Fourier features',
      cost: 'n D² for D features',
      wins: (
        <>
          The RBF kernel as an explicit D-dimensional basis, so any linear
          solver applies: posterior error 0.142, 0.146, 0.060, 0.026 at
          D = 50, 200, 800, 3,200.
        </>
      ),
      costs: (
        <>
          Convergence is slow (kernel error 0.13 to 0.011 over the same D)
          and not monotone step by step; pays off only when n is far larger
          than D.
        </>
      ),
      when: 'Huge n with a stationary kernel, where a linear model in a few thousand random features is cheaper than any n³ or n m² solve.',
    },
  ],
  neverUse: {
    name: 'A length scale set by hand without looking at the evidence',
    why: (
      <>
        Same data, same kernel, same noise. At ℓ = 0.1 the posterior mean
        threads every noisy point and falls back to zero in between: held-out
        RMSE <strong>0.687</strong>, more than four times the 0.162 the
        marginal likelihood delivers, with a band so narrow at the points
        and so wide between them that the error bar is theater. At ℓ = 8
        the mean is a near line through the data, RMSE 0.626, with a band
        that excludes the truth it should contain. Three-nearest-neighbors,
        which knows nothing about smoothness, beats both at 0.266. The
        marginal likelihood costs one more Cholesky per candidate and
        found the right scale 29 times in 30; skipping it throws away the
        part of the method that makes the error bar mean anything.
      </>
    ),
  },

  contest: {
    instance:
      '1-D targets drawn from the RBF prior at length scale 1 with noise 0.2, 30 training points and 20 held-out points per draw, 30 draws (RMSE columns); the sparse and feature approximations measured against the exact posterior mean of an n = 200 fit at 51 grid points; work as a fraction of the exact n³/6 factorization at n = 200',
    columns: ['held-out RMSE', 'gap to the exact mean', 'work vs exact', 'error bar'],
    rows: [
      {
        method: 'GP regression, RBF, ML length scale',
        isThisUnit: true,
        values: ['0.162', 'exact', '1.00', 'calibrated: 0.950 at nominal 0.95'],
        verdict: 'the reference, as long as n³ is affordable',
      },
      {
        method: 'kernel ridge regression (ridge = σ²)',
        values: ['0.162', '1.4e-8', '1.00', 'none'],
        verdict: 'the same mean without the probability',
      },
      {
        method: 'sparse GP, DTC with 20 inducing points',
        values: ['·', '1.7e-4', '0.06', 'approximate'],
        best: 2,
        verdict: 'the exact answer for 6% of the work when m suits ℓ',
      },
      {
        method: 'random Fourier features, D = 3,200',
        values: ['·', '0.026', 'n D² (wins once n ≫ D)', 'approximate'],
        verdict: 'a linear model that converges slowly',
      },
      {
        method: '3-nearest neighbors',
        values: ['0.266', '·', 'sort per query', 'none'],
        verdict: 'no model, no smoothness, no doubt',
      },
    ],
    source:
      'python solutions/gaussian_process_regression_rbf_kernel.py prints these numbers and asserts: noise-free interpolation to 1e-5; GP weights equal the Gauss-Jordan kernel ridge weights to 1e-7; the quadratic-feature GP equals weight-space Bayesian linear regression in mean and variance to 1e-7; random Fourier features cut the kernel error and the posterior error by more than three from D = 50 to 3,200; the 95% interval covers latent and noisy values within three standard errors (plus 0.01) of 0.95 over 150 draws; the Cholesky log marginal likelihood equals the direct formula to 1e-8; the maximizer has geometric mean between 0.6 and 1.6 and lands within a grid step at least 20 of 30 times; the ML length scale beats 3-NN, ℓ = 0.1, and ℓ = 8 in held-out RMSE; the fit time slope exceeds 2; and DTC with 40 inducing points is at least five times closer to the exact posterior than with 5.',
  },

  figure: (
    <Figure
      id="fig-gp-length-scale"
      aspect="16 / 7"
      caption="Left: held-out RMSE on 30 functions drawn from the prior (noise 0.2): a length scale of 0.1 (red), the marginal-likelihood choice (blue), 8 (red), and the 3-nearest-neighbor baseline (amber). Right: the sparse DTC approximation's gap to the exact n = 200 posterior mean on a log scale against the number of inducing points, with the work as a fraction of the exact factorization."
      cite={{
        text: 'C. E. Rasmussen and C. K. I. Williams, Gaussian Processes for Machine Learning, MIT Press, 2006. D. G. Krige, "A statistical approach to some basic mine valuation problems on the Witwatersrand," J. Chem. Metall. Min. Soc. S. Afr. 52, 1951. G. Matheron, "Principles of geostatistics," Economic Geology 58, 1963, DOI 10.2113/gsecongeo.58.8.1246. R. M. Neal, Bayesian Learning for Neural Networks, Springer, 1996.',
        href: 'https://gaussianprocess.org/gpml/',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="Held-out error against the length scale choice, and the sparse approximation's error against the number of inducing points">
        {(() => {
          const y0 = 230;
          const bars = [['ℓ = 0.1', 0.687, '#e2606c'], ['ℓ by evidence', 0.162, '#5da2ff'], ['ℓ = 8', 0.626, '#e2606c'], ['3-NN', 0.266, '#f0b94b']];
          const BY = (v) => y0 - (v / 0.8) * 180;
          const bx = 380;
          const dtc = [[5, 0.33, '0.004'], [10, 0.18, '0.015'], [20, 1.7e-4, '0.060'], [40, 5.4e-8, '0.240']];
          const LY = (e) => y0 - ((Math.log10(e) + 8) / 8.5) * 180;
          return (
            <g>
              <text x="40" y="22" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">held-out RMSE, same data and kernel</text>
              <line x1="40" y1={y0} x2="320" y2={y0} stroke="#9aa5bd" strokeOpacity="0.6" />
              {bars.map(([label, v, color], i) => (
                <g key={label}>
                  <rect x={60 + i * 65} y={BY(v)} width="40" height={y0 - BY(v)} fill={color} fillOpacity="0.85" />
                  <text x={60 + i * 65} y={BY(v) - 5} fill={color} fontFamily="ui-monospace, monospace" fontSize="10">{v.toFixed(3)}</text>
                  <text x={56 + i * 65} y={y0 + 14} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">{label}</text>
                </g>
              ))}
              <text x={bx} y="22" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">DTC gap to the exact mean (log scale), n = 200</text>
              <line x1={bx} y1={y0} x2={bx + 240} y2={y0} stroke="#9aa5bd" strokeOpacity="0.6" />
              {[1e-8, 1e-6, 1e-4, 1e-2, 1].map((e) => <text key={e} x={bx + 200} y={LY(e) + 3} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="8">{e.toExponential(0)}</text>)}
              {dtc.map(([m, e, w], i) => (
                <g key={m}>
                  <rect x={bx + i * 48} y={LY(e)} width="30" height={y0 - LY(e)} fill="#5da2ff" fillOpacity="0.85" />
                  <text x={bx + i * 48 - 4} y={LY(e) - 5} fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="9">{e.toExponential(1)}</text>
                  <text x={bx + i * 48} y={y0 + 14} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">m={m}</text>
                  <text x={bx + i * 48 - 4} y={y0 + 26} fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="8">work {w}</text>
                </g>
              ))}
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'gaussian_process_regression_rbf_kernel.py',
  Viz: GaussianProcessViz,
  narration,
};
