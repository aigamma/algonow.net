import OptionPricingViz from '../viz/OptionPricingViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/monte_carlo_option_pricing_antithetic_variates.py?raw';
import { narration } from './monte-carlo-option-pricing-antithetic-variates.narration.js';

export const content = {
  given:
    'An option whose payoff depends on a random future price, or on a whole price path: a European call, an Asian call on the average price, a barrier call that dies if the price touches 85. Under the risk-neutral model the price is a discounted expectation, S₀ = 100, r = 5%, σ = 20%, one year. Closed forms exist for a few of these and for none of the rest.',
  task: 'Monte Carlo pricing. The algorithm is the expectation made literal: simulate the risk-neutral price (or path) many times, average the discounted payoff, read the standard error off the sample. The heuristic is the antithetic pair: every normal draw z is used twice, once as z and once as −z, so a payoff that rises with z is paired with one that falls, the pair mean has less variance than two independent draws, and the estimate stays exactly unbiased because −z is as likely as z.',
  constraint:
    'Measured against the Black-Scholes closed form 10.4506: 200 runs of 2,000 paths put the plain, antithetic, and control estimates within 0.6, 0.3, and 0.2 standard errors of the truth; the spread shrinks by 2.01 and 1.91 per fourfold n (slope −0.485). At equal path counts the antithetic pair cuts the at-the-money variance 1.99× (paired payoffs correlate at −0.50) and the in-the-money variance 8.76× (−0.89); the terminal-price control cuts it 6.79× and 65.96×; both together 29.4× and 515×. The geometric Asian matches Kemna-Vorst within 0.6 standard errors and, as a control, cuts the arithmetic Asian variance 557×. 1.5 s.',

  origins: (
    <p>
      Phelim Boyle published &quot;Options: A Monte Carlo Approach&quot; in{' '}
      <strong>1977</strong> (Journal of Financial Economics 4), four years
      after Black, Scholes, and Merton, pricing a dividend-paying call by
      simulation and already using antithetic variates and control variates
      to tame the noise. The antithetic idea is older: J. M. Hammersley and
      K. W. Morton proposed it in 1956 for Monte Carlo integration in
      general. Angelien Kemna and Ton Vorst (1990, Journal of Banking and
      Finance) priced the Asian option by simulation and found the control
      variate that still defines the method: the geometric-average option
      has a closed form and tracks the arithmetic one almost perfectly. Mark
      Broadie, Paul Glasserman, and Steven Kou (1997) showed that a barrier
      checked m times behaves like a continuous barrier shifted by 0.5826
      σ√(T/m); Glasserman&apos;s Monte Carlo Methods in Financial Engineering
      (2003) is the standard reference for everything on this page.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>estimator and the referee</strong>. The discounted
      average of simulated payoffs is unbiased for any payoff you can compute
      on a path, which is why it prices what the lattice and the PDE cannot
      reach. The referees are closed forms: Black-Scholes 10.4506 for the
      call, Kemna-Vorst 5.9402 for the geometric Asian, Reiner-Rubinstein
      9.9493 for the continuous down-and-out call. Measured: 200 runs of
      2,000 paths land within <strong>0.6 standard errors</strong> of the
      truth and the run-to-run spread halves every time n quadruples.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>variance</strong>. Pairing z with −z costs nothing in
      bias and buys whatever negative correlation the payoff allows: −0.50
      between the two call payoffs at the money, so the variance falls{' '}
      <strong>1.99×</strong> at equal path counts; −0.89 in the money, where
      the payoff is nearly linear in the draw, so 8.76×. The same spirit
      picks the control variate: the discounted terminal price, whose mean
      is exactly S₀, cuts the variance 6.79×, and the geometric Asian, whose
      mean is exact, cuts the arithmetic Asian&apos;s 557×.
    </p>
  ),

  picture: (
    <p>
      A surveyor must find the average height of a hillside by dropping
      stakes at random. Every stake she drops at a spot, she also drops one
      at its mirror image across the center: when one lands on the high
      side the other lands low, and the pair&apos;s average is already close
      to the answer. Her honest error bar shrinks twice as fast. The trick
      fails on a valley shaped like a V: the mirror stake lands on the other
      slope at the same height, the pair agrees instead of cancelling, and
      she has spent two stakes to learn what one would have told her.
    </p>
  ),

  steps: [
    <>
      <strong>Simulate under the risk-neutral drift:</strong> S_T = S₀
      exp((r − σ²/2)T + σ√T z), one lognormal step for a European payoff,
      m steps for a path.
    </>,
    <>
      <strong>Pair the draws:</strong> compute the payoff at z and at −z,
      average the two, discount, and treat each pair mean as one sample.
    </>,
    <>
      <strong>Add a control when one exists:</strong> subtract β times (the
      control minus its known mean); the discounted terminal price has mean
      S₀, the geometric Asian has Kemna-Vorst.
    </>,
    <>
      <strong>Report the standard error from the samples</strong> and check
      a closed form whenever one exists; the barrier case shows the
      discretization bias the error bar cannot see.
    </>,
  ],

  signals: [
    <>
      <strong>A payoff monotone in the driving noise:</strong> calls, puts,
      averages, anything that only rises as z rises.
    </>,
    <>
      <strong>A path or a basket with no closed form</strong> but a cheap
      simulator: Asian, barrier, lookback, multi-asset payoffs.
    </>,
    <>
      <strong>A correlated quantity with an exact mean:</strong> the stock
      itself, or a sibling option with a formula, waiting to be a control.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>plain Monte Carlo at the same path
      count</strong>: variance ratio 1 by definition, spread 0.3345 over 200
      runs of 2,000 paths against 0.2491 antithetic and 0.1265 with the
      control.
    </>
  ),

  strength: (
    <>
      <strong>Unbiased for any payoff you can simulate, with error bars
      that come free and closed forms matched to a fraction of one.</strong>{' '}
      1.99× at the money and 8.76× in the money from pairing alone; 29.4×
      and 515× with the control added; 557× for the Asian control.
    </>
  ),
  weakness: (
    <>
      <strong>The error bar shrinks like 1/√n and knows nothing about
      bias.</strong> Four times the paths buy half the error. A barrier
      checked twelve times prices at 10.25 against the continuous 9.95, a
      bias of 0.30 that the ±0.15 standard error cannot see; the shift of
      Broadie, Glasserman, and Kou predicts 10.24. And a non-monotone
      payoff turns the pair against you: the straddle&apos;s mirrored
      payoffs correlate at +0.64 and the variance ratio is 0.60.
    </>
  ),

  problem: 'Option pricing',
  problemSlug: 'option-pricing',
  rivals: [
    {
      name: 'Monte Carlo option pricing × Antithetic variates',
      isThisUnit: true,
      algoName: 'Monte Carlo option pricing',
      cost: 'n paths (m steps each), two payoffs per draw',
      wins: (
        <>
          <strong>Any payoff a simulator can evaluate</strong>, unbiased, with
          a standard error from the sample; 1.99× to 8.76× less variance from
          pairing, 557× with the Kemna-Vorst control.
        </>
      ),
      costs: (
        <>
          1/√n convergence; discretization bias the error bar cannot see;
          pairing hurts a V-shaped payoff (0.60×).
        </>
      ),
      when: 'Path-dependent or multi-asset payoffs with no formula and no low-dimensional lattice.',
    },
    {
      name: 'Black-Scholes × Closed-form European pricing',
      algoName: 'Black-Scholes',
      cost: 'two normal CDFs',
      wins: (
        <>
          The exact answer in microseconds, 10.4506 here; the referee every
          simulation on this page is held to.
        </>
      ),
      costs: (
        <>
          European payoffs under lognormal dynamics only; no averages, no
          barriers, no early exercise.
        </>
      ),
      when: 'A vanilla European option, or a control variate for one that is not.',
    },
    {
      name: 'Binomial options pricing × Cox-Ross-Rubinstein lattice',
      algoName: 'Binomial options pricing',
      cost: 'O(m²) nodes for m steps',
      wins: (
        <>
          Early exercise falls out of the backward sweep; converges to
          Black-Scholes as m grows with no sampling noise at all.
        </>
      ),
      costs: (
        <>
          Path-dependent payoffs need a state per path (the lattice stops
          recombining); several assets multiply the dimension.
        </>
      ),
      when: 'American or Bermudan options on one or two assets.',
    },
    {
      name: 'Longstaff-Schwartz × Least-squares continuation',
      algoName: 'Longstaff-Schwartz',
      cost: 'simulation plus a regression per exercise date',
      wins: (
        <>
          Early exercise inside a simulation: regress the continuation value
          on the state, exercise when the payoff beats it.
        </>
      ),
      costs: (
        <>
          A biased-low estimate from the fitted policy; basis functions to
          choose; the regression adds its own noise.
        </>
      ),
      when: 'American-style payoffs on paths too rich for a lattice.',
    },
  ],
  neverUse: {
    name: 'Plain Monte Carlo for a deep out-of-the-money option',
    why: (
      <>
        Price the call struck at 180 by brute simulation: the exact value is
        0.02864, and only 28 of 10,000 paths finished above the strike. The
        plain estimate came out at <strong>0.0202 ± 0.0052</strong>, a
        relative error bar of 18% that is itself built from 28 numbers. The
        draft used a strike of 200, where one path hit and the error bar
        meant nothing at all. Shift the draw to the strike and weight it,
        the importance-sampling tilt of puzzle 201, and the same 10,000
        paths give 0.02863 ± 0.00036, a relative error of 1.2%; or use the
        closed form, which this payoff has. Simulation pays by the hit, and
        a rare payoff starves it.
      </>
    ),
  },

  contest: {
    instance:
      'S₀ = 100, r = 5%, σ = 20%, T = 1; variance ratio against plain Monte Carlo at the same number of simulated paths (40,000 for the calls, 20,000 antithetic pairs for the Asians); the correlation is between the two payoffs of a pair, or the control coefficient β',
    columns: ['payoff', 'variance ratio', 'pair corr / β'],
    rows: [
      {
        method: 'plain Monte Carlo',
        values: ['call K = 100', '1.00', '·'],
        verdict: 'the baseline; spread 0.3345 over 200 runs of 2,000 paths',
      },
      {
        method: 'antithetic pairs',
        isThisUnit: true,
        values: ['call K = 100', '1.99', '−0.50'],
        verdict: 'monotone payoff, mirrored draws cancel',
      },
      {
        method: 'antithetic pairs',
        values: ['call K = 80', '8.76', '−0.89'],
        verdict: 'nearly linear in z, nearly perfect cancellation',
      },
      {
        method: 'terminal-price control',
        values: ['call K = 100', '6.79', 'β 0.68'],
        verdict: 'the stock has mean S₀ exactly',
      },
      {
        method: 'pairs plus control',
        values: ['call K = 100', '29.4', '·'],
        verdict: '515× in the money',
      },
      {
        method: 'geometric Asian control',
        values: ['arithmetic Asian', '557', 'β 1.03'],
        best: 1,
        verdict: 'Kemna-Vorst: 6.1543 ± 0.0017 against 6.128 ± 0.041 plain',
      },
      {
        method: 'antithetic pairs',
        values: ['straddle |S − 100|', '0.60', '+0.64'],
        verdict: 'the V: mirrored draws agree instead of cancelling',
      },
    ],
    source:
      'python solutions/monte_carlo_option_pricing_antithetic_variates.py prints these rows and asserts: Black-Scholes 10.4506 to 1e-3; plain, antithetic, and control means within 3.5 standard errors of the closed form over 200 runs; the spread ratio between 1.65 and 2.35 per fourfold n with slope within 0.08 of −0.5; pair correlations below −0.2 and variance ratios above 1.3 (antithetic) and 2 (control), larger in the money, and the combination beating the control alone; the geometric Asian within 3 standard errors of Kemna-Vorst and the control ratio above 20; every discretely monitored barrier price within 3 standard errors of the shifted-barrier closed form and ordered toward the continuous price; 5 to 60 hits for the deep strike with plain relative error above 0.12 and tilted below 0.05; the straddle ratio below 1.1 with positive pair correlation.',
  },

  figure: (
    <Figure
      id="fig-antithetic-pairs"
      aspect="16 / 7"
      caption="Left: the discounted call payoff as a function of the normal draw z (blue), with an antithetic pair (z, −z) marked in amber: one payoff high, the other zero, so the pair mean (dashed) sits near the price and the two correlate at −0.50. Right: variance ratios against plain Monte Carlo at equal path counts, log scale; the straddle bar (red) is below one because its mirrored payoffs agree."
      cite={{
        text: 'P. P. Boyle, "Options: A Monte Carlo Approach," Journal of Financial Economics 4(3), 1977, DOI 10.1016/0304-405X(77)90005-8. J. M. Hammersley and K. W. Morton, "A New Monte Carlo Technique: Antithetic Variates," Mathematical Proceedings of the Cambridge Philosophical Society 52(3), 1956. A. G. Z. Kemna and A. C. F. Vorst, "A Pricing Method for Options Based on Average Asset Values," Journal of Banking and Finance 14(1), 1990, DOI 10.1016/0378-4266(90)90039-5. P. Glasserman, Monte Carlo Methods in Financial Engineering, Springer, 2003.',
        href: 'https://doi.org/10.1016/0304-405X(77)90005-8',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="Call payoff against the normal draw with an antithetic pair marked, beside a log-scale bar chart of variance ratios for six estimators">
        {(() => {
          const x0 = 36;
          const y0 = 222;
          const pw = 280;
          const X = (z) => x0 + ((z + 3) / 6) * pw;
          const pay = (z) => Math.max(100 * Math.exp(0.03 + 0.2 * z) - 100, 0) * Math.exp(-0.05);
          const Y = (v) => y0 - (v / 90) * 180;
          const pts = Array.from({ length: 121 }, (_, k) => -3 + (6 * k) / 120).map((z) => `${X(z).toFixed(1)},${Y(pay(z)).toFixed(1)}`).join(' ');
          const z1 = 1.4;
          const mid = (pay(z1) + pay(-z1)) / 2;
          const bx = 372;
          const by = 222;
          const rows = [['AT pairs', 1.99, '#f0b94b'], ['IT pairs', 8.76, '#f0b94b'], ['control', 6.79, '#5da2ff'], ['both', 29.4, '#5da2ff'], ['Asian ctl', 557, '#5da2ff'], ['straddle', 0.6, '#e2606c']];
          const BY = (v) => by - ((Math.log10(v) + 0.5) / 3.5) * 170;
          return (
            <g>
              <line x1={x0} y1={y0} x2={x0 + pw} y2={y0} stroke="#9aa5bd" strokeOpacity="0.6" />
              <polyline points={pts} fill="none" stroke="#5da2ff" strokeWidth="2" />
              <line x1={X(-z1)} y1={Y(pay(-z1))} x2={X(z1)} y2={Y(pay(z1))} stroke="#f0b94b" strokeWidth="1.5" />
              <circle cx={X(z1)} cy={Y(pay(z1))} r="5" fill="#f0b94b" />
              <circle cx={X(-z1)} cy={Y(pay(-z1))} r="5" fill="#f0b94b" />
              <line x1={x0} y1={Y(mid)} x2={x0 + pw} y2={Y(mid)} stroke="#f0b94b" strokeWidth="1" strokeDasharray="4 3" />
              <line x1={x0} y1={Y(10.45)} x2={x0 + pw} y2={Y(10.45)} stroke="#62d98a" strokeWidth="1" strokeDasharray="2 3" />
              {[-3, -2, -1, 0, 1, 2, 3].map((z) => <text key={z} x={X(z) - 6} y={y0 + 14} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">{z}</text>)}
              <text x={x0} y="22" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="10">blue: discounted call payoff against the draw z (K = 100)</text>
              <text x={x0} y="36" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="10">amber: a pair z = 1.4 and z = -1.4; dashed: the pair mean</text>
              <text x={x0} y="50" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="10">green dashes: the Black-Scholes price 10.45</text>
              <text x={bx} y="22" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">variance ratio against plain, log scale (0.3 to 1000)</text>
              <line x1={bx} y1={by} x2={bx + 250} y2={by} stroke="#9aa5bd" strokeOpacity="0.6" />
              <line x1={bx} y1={BY(1)} x2={bx + 250} y2={BY(1)} stroke="#9aa5bd" strokeOpacity="0.5" strokeDasharray="3 3" />
              {rows.map(([label, v, color], i) => (
                <g key={label}>
                  <rect x={bx + i * 42} y={Math.min(BY(v), BY(1))} width="30" height={Math.abs(BY(1) - BY(v))} fill={color} fillOpacity="0.85" />
                  <text x={bx + i * 42} y={BY(v) + (v < 1 ? 12 : -4)} fill={color} fontFamily="ui-monospace, monospace" fontSize="9">{v}</text>
                  <text x={bx + i * 42 - 2} y={by + 12} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="8">{label}</text>
                </g>
              ))}
              <text x={bx} y={by + 28} fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="10">red: the straddle, pairing makes it worse</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'monte_carlo_option_pricing_antithetic_variates.py',
  Viz: OptionPricingViz,
  narration,
};
