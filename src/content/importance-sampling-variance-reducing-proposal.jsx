import ImportanceSamplingViz from '../viz/ImportanceSamplingViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/importance_sampling_variance_reducing_proposal.py?raw';
import { narration } from './importance-sampling-variance-reducing-proposal.narration.js';

export const content = {
  given:
    'A probability or expectation that plain simulation almost never sees: P(Z > 4) for a standard normal is 3.167 × 10⁻⁵, so 100,000 honest draws expect three hits and a 49% relative error. The target density is known pointwise; the budget is tens of thousands of draws.',
  task: 'Importance sampling. The algorithm is the identity E_p[f] = E_q[f · p/q] for any proposal q that covers the target: draw from q, weight each sample by the density ratio, and the weighted average is unbiased for free. The heuristic is the proposal: move it onto the event so the samples land where the answer lives and the weights pay the difference. Here that is the exponential tilt (Siegmund 1976), the target shifted to the threshold, N(4, 1), with weights φ(x)/φ(x − 4) = e^(8 − 4x), all below one on the event.',
  constraint:
    'Measured against the exact tail and the closed-form second moment e¹⁶ · Q̄(8): 10,000 tilted draws give a relative error of 1.75% where 100,000 plain draws give 49%; the measured second moment is within 0.2% of the formula; the per-sample variance ratio is 6,999; the effective sample size is 18% of the draws and the largest weight carries 0.11% of the sum. The best shift is 4.12, worth 1% of variance over the threshold. A proposal centered at 7 reports 0.036 of the truth with a 4% spread, one weight carrying 64% and an ESS of 3 in 10,000. 0.9 s.',

  origins: (
    <p>
      Herman Kahn and Andy Marshall published the method in{' '}
      <strong>1953</strong> (&quot;Methods of Reducing Sample Size in Monte
      Carlo Computations,&quot; Journal of the Operations Research Society of
      America 1); Kahn had been using it at RAND for neutron shielding,
      where the particle that penetrates the wall is the rare one you must
      count. David Siegmund (1976, Annals of Statistics) worked out the
      exponential tilt for sequential tests and showed that shifting the
      sampling law until the rare event is typical is asymptotically right.
      Leslie Kish&apos;s design effect (Survey Sampling, 1965) became the
      effective sample size (Σw)²/Σw² that tells a sampler when its weights
      have gone bad. Reuven Rubinstein turned the search for a proposal into
      the cross-entropy method (1997); Eric Veach and Leonidas Guibas
      brought multiple importance sampling to rendering (SIGGRAPH 1995),
      where every light path is a rare event of its own.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>identity and the referee</strong>. The weighted
      average is unbiased for any covering proposal; its variance is the
      proposal&apos;s to lower or to ruin. The referee is exact: P(Z &gt; 4)
      = ½ erfc(4/√2) and the shifted estimator&apos;s second moment is
      e^(μ²) Q̄(4 + μ). Measured: second moment within{' '}
      <strong>0.2%</strong> of e¹⁶ Q̄(8), the run-to-run variance of twenty
      estimates matching the closed form, and the best shift on a fine grid
      at 4.12, 1% better than the threshold itself.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>proposal</strong>. Shifting the mean to the threshold
      puts half the draws on the event with every weight below one, so no
      sample can dominate: largest weight 0.11% of the sum, ESS 18% of n,
      per-sample variance down by <strong>6,999×</strong>. The same recipe
      on a bump integrand with a closed form gives a 13.7× smaller spread,
      and the proposal proportional to integrand times target holds every
      weight constant to 1e-17: zero variance, the ideal the tilt
      approximates.
    </p>
  ),

  picture: (
    <p>
      A pollster must count a country&apos;s centenarians. Knocking on random
      doors she meets one in a hundred thousand visits and reports a count of
      three with a huge error bar. So she surveys nursing homes, where they
      are common, and divides each answer by how over-represented a nursing
      home resident was in her sample. The reweighted count is honest and
      tight. The failure is the pollster who surveys only a ward for people
      over 110: the bulk of the centenarians never appear, and her reweighted
      count is confidently, precisely tiny.
    </p>
  ),

  steps: [
    <>
      <strong>Name the event and the target:</strong> the standard normal
      beyond a = 4; truth from erfc for the referee.
    </>,
    <>
      <strong>Tilt the proposal:</strong> N(a, 1), so the density ratio is
      φ(x)/φ(x − a) = e^(a²/2 − a x), below one wherever x &gt; a.
    </>,
    <>
      <strong>Draw and weight:</strong> n samples from q; log-weights to avoid
      overflow; average 1{'{'}x &gt; a{'}'} · w.
    </>,
    <>
      <strong>Diagnose before trusting:</strong> standard error from the
      weighted values, ESS = (Σw)²/Σw², the largest weight&apos;s share. A
      tiny ESS or a dominant weight means the proposal is wrong, whatever
      the error bar says.
    </>,
  ],

  signals: [
    <>
      <strong>A rare event with a known direction:</strong> a tail, a failure
      region, a threshold you can push the proposal toward.
    </>,
    <>
      <strong>A pointwise density ratio:</strong> both densities known up to
      the same constant at every sample; true for a tilt, false for a black
      box.
    </>,
    <>
      <strong>An integrand concentrated away from the sampling mass:</strong>{' '}
      plain draws return near-zero values almost every time.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>plain Monte Carlo at ten times the
      draws</strong>: 100,000 samples, three expected hits, relative error
      49% against the tilt&apos;s 1.75% at 10,000; at equal n the gap is
      √6,999 ≈ 84.
    </>
  ),

  strength: (
    <>
      <strong>Thousands-fold variance reduction, verified against its own
      closed form, with built-in diagnostics.</strong> 6,999× per sample;
      second moment within 0.2% of e¹⁶ Q̄(8); ESS and top-weight share
      expose a bad proposal before the error bar can lie.
    </>
  ),
  weakness: (
    <>
      <strong>The proposal is the whole game, and a bad one fails quietly.</strong>{' '}
      Undershooting to N(2, 1): error 6.6%, ESS 2%. Overshooting to N(7, ½):
      0.036 of the truth with a 4% spread. Self-normalizing the tilt: 1.89×
      the truth. A lighter-tailed proposal has infinite variance in theory;
      measured, N(4, ½) was the steadiest row because its weights pass one
      only beyond x = 8.09, a region it visits once in 10¹⁶ draws.
    </>
  ),

  problem: 'Monte Carlo variance reduction',
  problemSlug: 'variance-reduction',
  rivals: [
    {
      name: 'Importance sampling × Variance-reducing proposal',
      isThisUnit: true,
      algoName: 'Importance sampling',
      cost: 'n density ratios; one extra pass for ESS',
      wins: (
        <>
          <strong>6,999× less variance per sample</strong> on P(Z &gt; 4);
          1.75% error at n = 10,000 against 49% for ten times the plain
          draws; second moment within 0.2% of the closed form.
        </>
      ),
      costs: (
        <>
          Needs a pointwise density ratio and a proposal that covers the
          event: N(7, ½) reports 0.036 of the truth with a 4% spread.
        </>
      ),
      when: 'A rare tail or a concentrated integrand whose direction you know, and densities you can evaluate.',
    },
    {
      name: 'Stratified sampling',
      algoName: 'Stratified sampling',
      cost: 'one inverse CDF per draw, n/K draws per stratum',
      wins: (
        <>
          Variance down <strong>12.4×</strong> on E[e^Z] with 100 strata; the
          sample cannot clump, no proposal to design.
        </>
      ),
      costs: (
        <>
          Needs a low-dimensional invertible map; cannot aim at a tail it
          does not know about.
        </>
      ),
      when: 'Variation spread across the whole range rather than hidden in one corner.',
    },
    {
      name: 'Control variates',
      algoName: 'Control variates',
      cost: 'one correlated quantity with a known mean',
      wins: (
        <>
          Variance down <strong>2.7×</strong> on E[e^Z] with Z as the control
          (β = e^½); unbiased, no change to the sampler.
        </>
      ),
      costs: (
        <>
          Needs a control you can integrate exactly and a high correlation;
          useless for an indicator that is zero almost everywhere.
        </>
      ),
      when: 'An integrand nearly linear in something with a closed-form mean.',
    },
    {
      name: 'Cross-entropy method',
      algoName: 'Cross-entropy method',
      cost: 'several sampling rounds plus a refit per round',
      wins: (
        <>
          Learns the proposal when no closed-form tilt exists: keep the elite
          samples nearest the event, refit the family, repeat.
        </>
      ),
      costs: (
        <>
          A parametric family that must contain a good proposal, and pilot
          rounds that spend budget before the estimate starts.
        </>
      ),
      when: 'The event is defined by a simulator and the right direction to push is not obvious.',
    },
  ],
  neverUse: {
    name: 'A proposal that overshoots the event',
    why: (
      <>
        Center the proposal at 7 with standard deviation ½, so nearly every
        draw lands beyond 7 where the weights are vanishing and the rare
        draw that falls back toward 4 carries an enormous one. Over twenty
        runs of 10,000 the estimate came out at{' '}
        <strong>0.036 of the truth with a 4% spread</strong>: off by a factor
        of 28, wearing a 4% error bar. One weight carried 64% of the sum and
        the effective sample size was 3 of 10,000. Plain Monte Carlo at least
        knows it saw three hits; the overshooting sampler saw nothing where
        the answer lives and reported a tidy number anyway. Read the ESS
        before the error bar.
      </>
    ),
  },

  contest: {
    instance:
      'P(Z > 4) = 3.167 × 10⁻⁵, twenty runs per row; the tilt and its variants at n = 10,000, plain Monte Carlo at n = 100,000; sd / truth is the run-to-run spread relative to the exact answer, ESS is Kish’s effective sample size over the event weights',
    columns: ['mean / truth', 'sd / truth', 'ESS / n', 'top weight share'],
    rows: [
      {
        method: 'plain Monte Carlo, n = 100,000',
        values: ['0.979', '0.490', '·', '·'],
        verdict: 'three expected hits; the honest baseline',
      },
      {
        method: 'tilt N(4, 1)',
        isThisUnit: true,
        values: ['1.001', '0.0175', '0.18', '0.11%'],
        verdict: 'the closed-form second moment, matched to 0.2%',
      },
      {
        method: 'wide N(4, 2)',
        values: ['0.994', '0.029', '0.09', '0.2%'],
        verdict: 'safe, half the draws wasted',
      },
      {
        method: 'undershot N(2, 1)',
        values: ['0.995', '0.066', '0.02', '0.8%'],
        verdict: 'most draws miss the event',
      },
      {
        method: 'narrow N(4, ½)',
        values: ['1.001', '0.015', '0.35', '0.1%'],
        best: 1,
        verdict: 'infinite variance in theory; weights pass one only past x = 8.09',
      },
      {
        method: 'overshoot N(7, ½)',
        values: ['0.036', '0.041', '0.0003', '64%'],
        verdict: 'precisely wrong: 28× off with a 4% error bar',
      },
    ],
    source:
      'python solutions/importance_sampling_variance_reducing_proposal.py prints this table and asserts: the exact tail matches to nine digits; plain and tilted means within four standard errors of the truth; the measured second moment within 15% of e¹⁶ Q̄(8) and the run-to-run variance matching the closed form; variance ratio above 5,000 and the plain spread above twenty times the tilted spread at ten times the draws; the best shift within 0.3 of the threshold and no worse than it; wide and undershot proposals worse than the tilt; the narrow proposal’s squared-weight integral divergent, crossing one near 8.09, more than 10¹⁵ draws to reach it, yet sd / truth below 0.05; the overshoot below a fifth of the truth with a top weight above 30% and ESS below 1%; the self-normalized tilt between 1.5 and 3 times the truth; zero-variance weights constant to 1e-9; the self-normalized bias on the bump shrinking with n; rival variance ratios above 1.5 (antithetic, control), 5 (stratified), and exact for the proposal proportional to the integrand.',
  },

  figure: (
    <Figure
      id="fig-importance-sampling-tilt"
      aspect="16 / 7"
      caption="Left: the target N(0, 1) (blue), the tilted proposal N(4, 1) (amber), and the event x > 4 (red line); the dashed curve is the weight φ(x)/φ(x − 4) on a log scale, below one across the whole event. Right: relative error (sd / truth, log scale) of six estimators of P(Z > 4): plain Monte Carlo at ten times the draws, then the tilt and its variants; the overshoot bar is small because it is precisely wrong, at 0.036 of the truth."
      cite={{
        text: 'H. Kahn and A. W. Marshall, "Methods of Reducing Sample Size in Monte Carlo Computations," Journal of the Operations Research Society of America 1(5), 1953, DOI 10.1287/opre.1.5.263. D. Siegmund, "Importance Sampling in the Monte Carlo Study of Sequential Tests," Annals of Statistics 4(4), 1976, DOI 10.1214/aos/1176343541. A. B. Owen, Monte Carlo theory, methods and examples, 2013, chapter 9.',
        href: 'https://doi.org/10.1287/opre.1.5.263',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="Target and tilted proposal densities with the event region and the weight curve, beside a log-scale bar chart of relative errors for six estimators">
        {(() => {
          const x0 = 30;
          const y0 = 220;
          const pw = 290;
          const X = (x) => x0 + ((x + 4) / 12) * pw;
          const phi = (x) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
          const pts = (f) => Array.from({ length: 121 }, (_, k) => -4 + (12 * k) / 120).map((x) => `${X(x).toFixed(1)},${(y0 - f(x) * 380).toFixed(1)}`).join(' ');
          const wY = (x) => y0 - ((Math.log10(Math.exp(8 - 4 * x)) + 12) / 16) * 170;
          const wpts = Array.from({ length: 41 }, (_, k) => 4 + (4 * k) / 40).map((x) => `${X(x).toFixed(1)},${wY(x).toFixed(1)}`).join(' ');
          const bx = 370;
          const by = 220;
          const rows = [['plain 10n', 0.49, '#5da2ff'], ['tilt', 0.0175, '#f0b94b'], ['wide', 0.029, '#f0b94b'], ['undershot', 0.066, '#f0b94b'], ['narrow', 0.015, '#f0b94b'], ['overshoot', 0.041, '#e2606c']];
          const BY = (v) => by - ((Math.log10(v) + 2) / 2) * 160;
          return (
            <g>
              <line x1={x0} y1={y0} x2={x0 + pw} y2={y0} stroke="#9aa5bd" strokeOpacity="0.6" />
              <polyline points={pts(phi)} fill="none" stroke="#5da2ff" strokeWidth="2" />
              <polyline points={pts((x) => phi(x - 4))} fill="none" stroke="#f0b94b" strokeWidth="2" />
              <polyline points={wpts} fill="none" stroke="#9aa5bd" strokeWidth="1.5" strokeDasharray="4 3" />
              <line x1={X(4)} y1={y0} x2={X(4)} y2={40} stroke="#e2606c" strokeWidth="1.5" />
              <text x={X(4) + 4} y="50" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="10">x &gt; 4</text>
              {[-4, -2, 0, 2, 4, 6, 8].map((x) => <text key={x} x={X(x) - 6} y={y0 + 14} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">{x}</text>)}
              <text x={x0} y="22" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="10">blue: target N(0,1); amber: proposal N(4,1)</text>
              <text x={x0} y="36" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">dashed: weight e^(8 - 4x) on the event, log scale, 1 down to 1e-12</text>
              <text x={bx} y="22" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">sd / truth, log scale (1 to 0.01)</text>
              <line x1={bx} y1={by} x2={bx + 250} y2={by} stroke="#9aa5bd" strokeOpacity="0.6" />
              {rows.map(([label, v, color], i) => (
                <g key={label}>
                  <rect x={bx + i * 42} y={BY(v)} width="30" height={by - BY(v)} fill={color} fillOpacity="0.85" />
                  <text x={bx + i * 42} y={BY(v) - 4} fill={color} fontFamily="ui-monospace, monospace" fontSize="9">{v}</text>
                  <text x={bx + i * 42 - 2} y={by + 12} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="8">{label}</text>
                </g>
              ))}
              <text x={bx} y={by + 28} fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="10">red: overshoot, mean 0.036 of the truth</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'importance_sampling_variance_reducing_proposal.py',
  Viz: ImportanceSamplingViz,
  narration,
};
