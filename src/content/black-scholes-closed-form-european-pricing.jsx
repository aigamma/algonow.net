import BlackScholesViz from '../viz/BlackScholesViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/black_scholes_closed_form_european_pricing.py?raw';
import { narration } from './black-scholes-closed-form-european-pricing.narration.js';

export const content = {
  given:
    'A European call or put: the right to buy or sell a stock at strike K on one future date T. Today’s price S, the risk-free rate r, and the volatility σ are known. What is the option worth now, and how does that value move?',
  task: 'Black-Scholes. The algorithm is risk-neutral valuation (Black and Scholes 1973, Merton 1973): a continuously hedged option obeys a partial differential equation with no risk appetite in it, so its value is the discounted expected payoff under a measure where the stock drifts at r. The heuristic is the model: geometric Brownian motion with constant volatility, which makes the terminal price lognormal and the expectation a closed form, C = S N(d₁) − K e^{−rT} N(d₂), with d₁ = [ln(S/K) + (r + σ²/2) T] / (σ√T) and d₂ = d₁ − σ√T. Two evaluations of the normal distribution function price what a lattice needs thousands of steps and a Monte Carlo run a hundred thousand paths to approximate, and every sensitivity is a formula too.',
  constraint:
    'On S = 100, K = 100, r = 5%, σ = 20%, T = 1: call 10.450584, put 5.573526, parity C − P = S − Ke^{−rT} to 10⁻¹², the PDE residual at most 4 × 10⁻⁶ over twenty (S, T) points, the five Greeks matching central differences to five places (delta 0.63683, gamma 0.01876, vega 37.524, theta −6.414, rho 53.232). The rivals converge to it: the CRR lattice is 0.020 off at 100 steps, 0.0020 at 1,000, 0.0005 at 4,000 (8,006,001 nodes); Crank-Nicolson 0.0099 off at 200 × 200 and 0.0006 at 800 × 800; Monte Carlo 10.435 ± 0.146 at 10⁴ paths and 10.500 ± 0.047 at 10⁵. Implied volatility inverts to 20.0% at every strike from the model’s own prices, but prices from a Heston stochastic-volatility simulation invert to 24.7% at K = 80 and 13.9% at K = 120: the smile the constant-volatility model cannot make. The vanilla formula applied to an up-and-out barrier call (barrier 120) gives 10.451 against the contract’s 1.320 ± 0.017, 7.9× too high.',

  origins: (
    <p>
      Fischer Black and Myron Scholes (<strong>1973</strong>, &quot;The pricing
      of options and corporate liabilities,&quot; Journal of Political
      Economy) and Robert Merton (1973, &quot;Theory of rational option
      pricing&quot;) derived the equation from a hedging argument: a
      portfolio of the option and −Δ shares is riskless over an instant,
      so it must earn the risk-free rate, and the stock&apos;s expected
      return drops out. Louis Bachelier had priced options with a normal
      model in 1900; Samuelson&apos;s lognormal stock (1965) supplied the
      distribution; Cox, Ross, and Rubinstein (1979) showed the binomial
      lattice converging to the same formula (puzzle 135 on this site).
      Scholes and Merton received the 1997 Nobel memorial prize. Since the
      1987 crash the market has quoted options in Black-Scholes implied
      volatility rather than price, with a smile across strikes that the
      model itself cannot produce, and the formula is the unit of account
      for a vocabulary (delta, gamma, vega) that every desk speaks.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>valuation principle</strong>: price = discounted
      expected payoff under the risk-neutral measure, equivalently the
      solution of V_t + ½σ²S²V_SS + rSV_S − rV = 0 with the payoff as its
      terminal condition. The referee is that equation and its boundary
      conditions, checked numerically: the formula&apos;s residual is at most{' '}
      <strong>4 × 10⁻⁶</strong> over twenty points, it equals the payoff
      at expiry and the forward intrinsic value at zero volatility, and
      put-call parity holds to 10⁻¹². Three independent numerical methods
      (a lattice, a finite-difference scheme, Monte Carlo) converge to the
      same 10.4506 from three different directions.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>closed form</strong>: constant volatility makes the
      terminal price lognormal, the expectation integrates in two normal
      distribution functions, and so do the Greeks (delta 0.63683, gamma
      0.01876, vega 37.524, theta −6.414, rho 53.232, each matching a
      central difference to five places). The lattice spends{' '}
      <strong>8,006,001 nodes</strong> to get within 0.0005 of two function
      calls, and Monte Carlo spends 10⁵ paths to get within 0.05. The same
      assumption is the model&apos;s weakness: inverting market-like prices
      from a stochastic-volatility world gives 24.7% at K = 80 and 13.9% at
      K = 120, a smile the formula can read but never write.
    </p>
  ),

  picture: (
    <p>
      An insurer pricing a one-year policy that pays the amount by which a
      stock ends above 100. Instead of guessing where the stock is going,
      she notices that she can hedge the policy day by day with the stock
      itself, so the only thing that matters is how much the stock
      wobbles, not which way it drifts. If the wobble is steady, the
      distribution of the final price is a known bell on a logarithmic
      scale, and the fair premium is one integral she can write down in
      closed form. The moment the wobble itself wobbles, her formula is a
      yardstick, not an answer.
    </p>
  ),

  steps: [
    <>
      <strong>Inputs:</strong> S, K, r, σ, T; compute σ√T and the discount
      factor e^{'{−rT}'}.
    </>,
    <>
      <strong>d₁, d₂:</strong> d₁ = [ln(S/K) + (r + σ²/2) T] / (σ√T), d₂ =
      d₁ − σ√T: the standardized log-moneyness under the two measures.
    </>,
    <>
      <strong>Price:</strong> C = S N(d₁) − Ke^{'{−rT}'} N(d₂); P = Ke^{'{−rT}'}{' '}
      N(−d₂) − S N(−d₁); check C − P = S − Ke^{'{−rT}'}.
    </>,
    <>
      <strong>Greeks:</strong> Δ = N(d₁), Γ = φ(d₁)/(Sσ√T), vega = Sφ(d₁)√T,
      θ and ρ likewise: closed forms of the same two numbers.
    </>,
    <>
      <strong>Invert when needed:</strong> given a market price, solve for σ
      by Brent&apos;s method (round trip 3 × 10⁻¹⁴ here); the result across
      strikes is the implied volatility surface.
    </>,
  ],

  signals: [
    <>
      <strong>A European payoff on a tradable underlying:</strong> no early
      exercise, no path dependence, a liquid hedge.
    </>,
    <>
      <strong>You need the price and its sensitivities now:</strong>{' '}
      thousands of quotes a second, risk reports, hedging ratios.
    </>,
    <>
      <strong>A common language more than a model:</strong> quoting,
      comparing, and calibrating in implied volatility, even where the
      assumptions fail.
    </>
  ],
  baseline: (
    <>
      The honest baseline is <strong>Monte Carlo with exact lognormal
      draws</strong>: simulate, average, discount. 10.435 ± 0.146 at 10⁴
      paths and 10.500 ± 0.047 at 10⁵, within its own error bars but a
      hundred thousand draws for two decimals.
    </>
  ),

  strength: (
    <>
      <strong>Exact, instant, and differentiable.</strong> Two normal CDF
      evaluations where the lattice needs 8,006,001 nodes for the fourth
      decimal; every Greek a formula matching finite differences to five
      places; the PDE satisfied to 4 × 10⁻⁶; the inversion to implied
      volatility stable to 10⁻¹³.
    </>
  ),
  weakness: (
    <>
      <strong>Constant volatility and a European payoff.</strong> Prices
      from a stochastic-volatility world invert to 24.7% at K = 80 and
      13.9% at K = 120 under the formula, which can only hold one number;
      an American put, a barrier, or an average needs a lattice, a PDE
      solver, or a simulation, and the vanilla formula on a barrier call
      is 7.9× wrong.
    </>
  ),

  problem: 'Option pricing',
  problemSlug: 'option-pricing',
  rivals: [
    {
      name: 'Black-Scholes × Closed-form European pricing',
      isThisUnit: true,
      algoName: 'Black-Scholes',
      cost: 'two normal CDF evaluations',
      wins: (
        <>
          <strong>10.450584 exactly</strong>, every Greek in closed form, the
          PDE satisfied to 4 × 10⁻⁶; the unit the market quotes in.
        </>
      ),
      costs: (
        <>
          European payoffs only; one volatility for all strikes.
        </>
      ),
      when: 'Vanilla European options, hedging ratios, and implied volatility: the yardstick.',
    },
    {
      name: 'Binomial options pricing',
      algoName: 'Binomial options pricing',
      cost: 'O(N²) nodes',
      wins: (
        <>
          Early exercise at every node (American options); converges to the
          formula: 0.0005 off at 4,000 steps.
        </>
      ),
      costs: (
        <>
          8,006,001 nodes for the fourth decimal; O(1/N) error.
        </>
      ),
      when: 'American and Bermudan exercise, or discrete dividends.',
    },
    {
      name: 'Monte Carlo option pricing',
      algoName: 'Monte Carlo option pricing',
      cost: 'O(paths × steps); error ~ 1/√paths',
      wins: (
        <>
          Any payoff on any path (the barrier call here: 1.320 ± 0.017),
          any model (the Heston smile), many underlyings.
        </>
      ),
      costs: (
        <>
          10⁵ paths for ± 0.05; variance reduction to earn more.
        </>
      ),
      when: 'Path dependence, many assets, or a model with no closed form.',
    },
    {
      name: 'Crank-Nicolson',
      algoName: 'Crank-Nicolson',
      cost: 'a tridiagonal solve per time step',
      wins: (
        <>
          Second-order in time and space; a whole price surface in one
          solve; early exercise as a constraint.
        </>
      ),
      costs: (
        <>
          0.0099 off at 200 × 200 (the kink at the strike), 0.0006 at 800 ×
          800; grids per dimension.
        </>
      ),
      when: 'One or two underlyings, American exercise, and the full surface of prices and Greeks.',
    },
  ],
  neverUse: {
    name: 'The vanilla formula for a contract whose payoff depends on the path',
    why: (
      <>
        An up-and-out call pays like a call unless the stock ever touches
        120, in which case it pays nothing. Same S, K, r, σ, T. The vanilla
        formula says 10.451; a Monte Carlo of the actual contract with
        daily monitoring says <strong>1.320 ± 0.017</strong>: the formula is
        7.9× too high, because most of a vanilla call&apos;s value comes from
        paths that end far above the strike, and those are exactly the
        paths the barrier kills. The closed form knows the terminal
        distribution and nothing about the road to it; a payoff that reads
        the road needs a lattice, a PDE with the barrier as a boundary, or
        a simulation.
      </>
    ),
  },

  contest: {
    instance:
      'a European call with S = 100, K = 100, r = 5%, σ = 20%, T = 1 year; referee: the closed form, itself checked against the PDE, put-call parity, and finite-difference Greeks; one currency: work, counted in lattice nodes, grid points, or paths',
    columns: ['price', 'error', 'std err', 'work'],
    rows: [
      {
        method: 'Black-Scholes closed form',
        isThisUnit: true,
        values: ['10.45058', '0', '·', '2 normal CDF evaluations'],
        best: 1,
        verdict: 'exact, and every Greek with it',
      },
      {
        method: 'CRR lattice, N = 100',
        values: ['10.43061', '0.01997', '·', '5,151 nodes'],
        verdict: 'O(1/N)',
      },
      {
        method: 'CRR lattice, N = 4,000',
        values: ['10.45008', '0.00050', '·', '8,006,001 nodes'],
        verdict: 'the fourth decimal, dearly',
      },
      {
        method: 'Crank-Nicolson, 200 × 200',
        values: ['10.44069', '0.00989', '·', '40,401 grid points'],
        verdict: 'the kink at the strike shows',
      },
      {
        method: 'Crank-Nicolson, 800 × 800',
        values: ['10.44997', '0.00062', '·', '641,601 grid points'],
        verdict: 'second order, once the grid is fine',
      },
      {
        method: 'Monte Carlo, 10⁴ paths',
        values: ['10.43508', '0.01550', '0.1461', '10,000 paths'],
        verdict: 'inside one standard error',
      },
      {
        method: 'Monte Carlo, 10⁵ paths',
        values: ['10.50005', '0.04947', '0.0467', '100,000 paths'],
        verdict: 'the baseline; a one-sigma miss, honestly',
      },
    ],
    source:
      'python solutions/black_scholes_closed_form_european_pricing.py prints this table and asserts: the call and put to 1e-9 of their reference values; the PDE residual below 5e-5 at twenty points; the expiry, zero-volatility, and extreme-price limits; parity to 1e-12; five Greeks within 1e-4 relative of central differences; CRR at 4,000 steps under a twentieth of its 100-step error and under 0.001; Crank-Nicolson improving with the grid and under 0.001 at 800 x 800; both Monte Carlo prices within three standard errors with the error bar shrinking by more than 2.5x; implied volatility round trips within 1e-8; the Heston skew at K = 80 above the K = 120 value beyond two standard errors on both ends while the model’s own prices invert flat; and the vanilla formula more than five times the barrier contract’s Monte Carlo price.',
  },

  figure: (
    <Figure
      id="fig-black-scholes-smile"
      aspect="16 / 7"
      caption="Left: the call's value against the stock price with one year to expiry (blue) above its payoff at expiry (gray): the gap is time value, largest at the money, where gamma (the curvature) is 0.01876. Right: implied volatility by strike. The model's own prices invert to a flat 20% (gray); prices simulated under Heston stochastic volatility with correlation −0.7 invert to a skew from 24.7% to 13.9% (amber, with two-standard-error bars), a shape a constant volatility cannot produce."
      cite={{
        text: 'F. Black and M. Scholes, "The pricing of options and corporate liabilities," Journal of Political Economy 81(3), 1973, pp. 637-654, DOI 10.1086/260062. R. C. Merton, "Theory of rational option pricing," Bell Journal of Economics 4(1), 1973. S. L. Heston, "A closed-form solution for options with stochastic volatility," Review of Financial Studies 6(2), 1993.',
        href: 'https://doi.org/10.1086/260062',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="The Black-Scholes call price curve above its payoff, and implied volatility by strike: flat for the model's own prices, skewed for stochastic-volatility prices">
        {(() => {
          const ncdf = (x) => {
            const t = 1 / (1 + 0.2316419 * Math.abs(x));
            const d = 0.3989423 * Math.exp(-x * x / 2);
            const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
            return x > 0 ? 1 - p : p;
          };
          const call = (S) => {
            const d1 = (Math.log(S / 100) + (0.05 + 0.02) * 1) / 0.2;
            return S * ncdf(d1) - 100 * Math.exp(-0.05) * ncdf(d1 - 0.2);
          };
          const x0 = 40;
          const y0 = 230;
          const pw = 260;
          const ph = 180;
          const X = (S) => x0 + ((S - 50) / 100) * pw;
          const Y = (v) => y0 - (v / 55) * ph;
          const curve = [];
          const pay = [];
          for (let S = 50; S <= 150; S += 2) {
            curve.push(`${X(S)},${Y(call(S))}`);
            pay.push(`${X(S)},${Y(Math.max(S - 100, 0))}`);
          }
          const smile = [[80, 24.7, 23.5, 25.7], [90, 21.6, 21.0, 22.2], [100, 18.6, 18.2, 19.0], [110, 15.7, 15.5, 16.0], [120, 13.9, 13.6, 14.1]];
          const bx = 370;
          const by = 230;
          const bw = 240;
          const bh = 180;
          const XK = (k) => bx + ((k - 75) / 50) * bw;
          const YV = (v) => by - ((v - 10) / 20) * bh;
          return (
            <g>
              <line x1={x0} y1={y0} x2={x0 + pw} y2={y0} stroke="#9aa5bd" strokeOpacity="0.6" />
              <polyline points={pay.join(' ')} fill="none" stroke="#9aa5bd" strokeWidth="1.5" />
              <polyline points={curve.join(' ')} fill="none" stroke="#5da2ff" strokeWidth="2" />
              <line x1={X(100)} y1={Y(0)} x2={X(100)} y2={Y(call(100))} stroke="#62d98a" strokeDasharray="3 3" />
              <text x={X(100) + 4} y={Y(call(100)) - 6} fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="9">10.45 at S = 100</text>
              {[50, 100, 150].map((S) => <text key={S} x={X(S) - 8} y={y0 + 14} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">{S}</text>)}
              <text x={x0} y="22" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">call blue; payoff gray; T = 1</text>
              <text x={x0} y={y0 + 30} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">delta 0.637, gamma 0.0188 at the money</text>
              <line x1={bx} y1={by} x2={bx + bw} y2={by} stroke="#9aa5bd" strokeOpacity="0.6" />
              <line x1={XK(80)} y1={YV(20)} x2={XK(120)} y2={YV(20)} stroke="#9aa5bd" strokeWidth="1.5" strokeDasharray="4 3" />
              <text x={XK(100) - 30} y={YV(20) - 6} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">model prices: flat 20%</text>
              <polyline points={smile.map(([k, v]) => `${XK(k)},${YV(v)}`).join(' ')} fill="none" stroke="#f0b94b" strokeWidth="2" />
              {smile.map(([k, v, lo, hi]) => (
                <g key={k}>
                  <line x1={XK(k)} y1={YV(lo)} x2={XK(k)} y2={YV(hi)} stroke="#f0b94b" />
                  <circle cx={XK(k)} cy={YV(v)} r="3" fill="#f0b94b" />
                  <text x={XK(k) - 10} y={by + 14} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">{k}</text>
                </g>
              ))}
              {[12, 16, 20, 24].map((v) => <text key={v} x={bx - 26} y={YV(v) + 3} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">{v}%</text>)}
              <text x={bx} y="22" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">implied volatility: Heston (amber)</text>
              <text x={bx} y={by + 30} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">24.7% at K = 80 to 13.9% at K = 120</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'black_scholes_closed_form_european_pricing.py',
  Viz: BlackScholesViz,
  narration,
};
