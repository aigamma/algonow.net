import BinomialViz from '../viz/BinomialViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/binomial_options_pricing_cox_ross_rubinstein_lattice.py?raw';
import { narration } from './binomial-options-pricing-cox-ross-rubinstein-lattice.narration.js';

export const content = {
  given:
    'A stock at 100 with volatility 20% a year, cash earning 5%, and a contract paying max(S − 100, 0) (a call) or max(100 − S, 0) (a put) in one year. What is the contract worth today, and, for the American version, when should it be exercised early?',
  task: 'Cut the year into N steps. Each step the stock goes up by u = e^{σ√Δt} or down by d = 1/u, with risk-neutral probability p = (e^{rΔt} − d)/(u − d). Price the option at every maturity node, then roll back one step at a time: each node is the discounted risk-neutral average of its two children, or the exercise value if that is larger. The Cox-Ross-Rubinstein choice matches the volatility and, because u d = 1, puts every node of the whole tree on one grid of 2N + 1 prices.',
  constraint:
    'Against the Black-Scholes closed form (10.4506 for the call), the lattice gives 10.2534 at 10 steps, 10.4306 at 100, 10.4486 at 1,000: within a fifth of a cent, with delta 0.6368 matching to four places. Put-call parity holds inside the tree to 2 × 10⁻¹², the discounted expected stock price equals 100 to the same precision, and the tree’s variance of log returns is 0.04000 = σ²T. The American put prices at 6.0896 against the European 5.5715, an early-exercise premium of 0.52, matching a 4,000-step reference to 0.0006; the American call equals the European exactly. Counted at 16 steps: 17 maturity prices and 33 in the whole tree for CRR; 17 and 153 for Jarrow-Rudd; 65,536 for factors refitted at every step.',

  origins: (
    <p>
      Black and Scholes (1973) and Merton (1973) priced European
      options in continuous time; the binomial model was the
      discrete-time route that made the theory teachable and American
      options tractable. William Sharpe sketched a one-period tree in
      his 1978 textbook; Cox, Ross, and Rubinstein published the full
      lattice in <strong>1979</strong> (&quot;Option pricing: a
      simplified approach,&quot; Journal of Financial Economics),
      choosing u = e<sup>σ√Δt</sup> and d = 1/u so that the tree
      converges to Black-Scholes and every node lands on one price
      grid; Rendleman and Bartter found an equivalent tree the same
      year. Jarrow and Rudd (1983) gave the equal-probability
      variant, Leisen and Reimer (1996) a tree that converges without
      the zigzag, and Hull&apos;s textbook made the CRR lattice the
      first pricing model every student codes. It is still what
      exchanges and desks use for American equity options.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>rollback</strong>: V = e<sup>−rΔt</sup>(p V<sub>up</sub> +
      (1 − p) V<sub>down</sub>) at every node, with V = max(V, exercise)
      for American contracts, O(N²) for N steps. Measured against
      Black-Scholes: error <strong>0.1972 → 0.0399 → 0.0200 → 0.0040 →
      0.0020</strong> at N = 10, 50, 100, 500, 1,000, delta 0.6368 at
      N = 1,000 against 0.6368. The tree is arbitrage-free by
      construction: put-call parity holds inside it to 2 × 10⁻¹² and
      the discounted expected stock price is 100 to 2 × 10⁻¹². The
      American put: 6.0896, a 0.52 premium over the European 5.5715,
      matching a 4,000-step reference to 0.0006, with the exercise
      boundary read off the tree rising from 81.16 toward 99.37 at
      maturity; the American call equals the European exactly, as
      theory says without dividends.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>factors</strong>. u = e<sup>σ√Δt</sup>{' '}
      matches the volatility: the tree&apos;s variance of log returns
      is 0.04000 = σ²T. d = 1/u centers the lattice, so every node in
      the whole tree sits on one grid: <strong>33 distinct prices</strong>{' '}
      at 16 steps against 153 for Jarrow-Rudd&apos;s constant factors
      with u d ≠ 1, which converge just as well (10.4522) but give
      every node its own price. What the factors do not do is make the
      tree recombine: any constant pair recombines (17 maturity nodes
      for both), and the draft of this page claimed otherwise until
      the count refused it. Refit the factors at every step and the
      tree stops recombining: 65,536 maturity prices at 16 steps, one
      per path. And p must stay a probability: at r = 40% the CRR
      tree is invalid below 5 steps.
    </p>
  ),

  picture: (
    <p>
      A ladder of prices instead of a cloud of them. Each rung is a
      price the stock can reach, and time runs left to right; from any
      rung the stock climbs one or drops one per step. Because a climb
      then a drop returns to the same rung, the paths braid instead of
      branching: after N steps there are N + 1 rungs in play, not 2<sup>N</sup>
      histories. Pricing runs backwards up the braid: at the last
      column write down what the contract pays on each rung; one column
      earlier, each rung is worth the discounted average of the two
      rungs it leads to, weighted by the probability that makes the
      stock itself a fair bet; and if the contract can be exercised
      now for more than that, it is worth the exercise. The CRR
      spacing of the rungs is chosen so the braid&apos;s spread grows
      exactly like the stock&apos;s volatility, and so the rungs at every
      column are the same rungs.
    </p>
  ),

  steps: [
    <>
      <strong>Factors:</strong> Δt = T/N, u = e<sup>σ√Δt</sup>,
      d = 1/u, p = (e<sup>rΔt</sup> − d)/(u − d).
    </>,
    <>
      <strong>Maturity:</strong> S<sub>j</sub> = S u<sup>j</sup> d<sup>N−j</sup>,
      V<sub>j</sub> = payoff(S<sub>j</sub>) for j = 0 … N.
    </>,
    <>
      <strong>Roll back:</strong> V<sub>j</sub> ← e<sup>−rΔt</sup>(p V<sub>j+1</sub> +
      (1 − p) V<sub>j</sub>) for each earlier step.
    </>,
    <>
      <strong>Exercise:</strong> American: V<sub>j</sub> ← max(V<sub>j</sub>,
      payoff(S<sub>j</sub>)) at every node.
    </>,
    <>
      <strong>Check:</strong> the root vs Black-Scholes (0.0020 at
      N = 1,000), parity to 10⁻¹², the American premium 0.52.
    </>,
  ],

  signals: [
    <>
      <strong>Early exercise matters:</strong> American puts, calls on
      dividend-paying stocks, anything with a decision at each step.
    </>,
    <>
      <strong>One underlying, low dimension:</strong> N² nodes for one
      stock; two correlated stocks need N³, five need a different
      method.
    </>,
    <>
      <strong>A cent is enough:</strong> 1,000 steps in a millisecond
      of arithmetic where the closed form does not exist.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>Black-Scholes</strong>: the
      closed form the lattice converges to (10.4506, matched to 0.0020
      at 1,000 steps), instant and exact for European contracts, and
      silent on the American put, which it underprices by 0.52 out
      of 6.09.
    </>
  ),

  strength: (
    <>
      <strong>Exact where the formula is silent, and checkable where it
      speaks.</strong> The American put at 6.0896 to a 4,000-step
      reference within 0.0006, with its exercise boundary read
      straight off the tree; parity and the martingale property to
      10⁻¹²; convergence to Black-Scholes to a fifth of a cent; and
      N² arithmetic on one shared price grid.
    </>
  ),
  weakness: (
    <>
      <strong>Zigzag convergence and one dimension.</strong> The error
      falls like 1/N with an even/odd oscillation (Leisen-Reimer trees
      fix that), a coarse tree with a high rate has p outside (0, 1)
      (below 5 steps at r = 40%), and the lattice is for one
      underlying: path-dependent payoffs and several assets break the
      recombination that makes it N², which is where Monte Carlo and
      Longstaff-Schwartz take over.
    </>
  ),

  problem: 'Option pricing',
  problemSlug: 'option-pricing',
  rivals: [
    {
      name: 'Binomial options pricing × CRR lattice',
      isThisUnit: true,
      algoName: 'Binomial options pricing',
      cost: 'O(N²) nodes',
      wins: (
        <>
          <strong>American contracts priced exactly</strong> (6.0896
          to 0.0006), Black-Scholes matched to 0.0020, parity to
          10⁻¹².
        </>
      ),
      costs: (
        <>
          Zigzag convergence, one underlying, no path dependence.
        </>
      ),
      when: 'Early exercise on one underlying, and a cent of accuracy is enough.',
    },
    {
      name: 'Black-Scholes',
      cost: 'one formula',
      wins: (
        <>
          Instant and exact for European options: 10.4506, the number
          the lattice spends 1,000 steps approaching.
        </>
      ),
      costs: (
        <>
          European only: the American put is 6.0896 and the formula
          says 5.5735.
        </>
      ),
      when: 'European payoffs under constant volatility, and for the Greeks.',
    },
    {
      name: 'Monte Carlo option pricing',
      cost: 'O(paths × steps)',
      wins: (
        <>
          Any payoff on any number of underlyings: Asian, barrier,
          basket; the error falls as 1/√paths regardless of
          dimension.
        </>
      ),
      costs: (
        <>
          Slow to a cent (tens of thousands of paths) and blind to
          early exercise on its own.
        </>
      ),
      when: 'Path-dependent or multi-asset payoffs without early exercise.',
    },
    {
      name: 'Longstaff-Schwartz',
      cost: 'paths plus a regression per step',
      wins: (
        <>
          American exercise on simulated paths: regress the
          continuation value on the state and exercise when the payoff
          beats it.
        </>
      ),
      costs: (
        <>
          A biased-low estimate that depends on the basis functions;
          far more work than a lattice for one underlying.
        </>
      ),
      when: 'Early exercise on several underlyings, where the lattice is Nᵈ.',
    },
  ],
  neverUse: {
    name: 'Black-Scholes for an American put',
    why: (
      <>
        The formula is exact, fast, and for the wrong contract. On
        this page the European put is 5.5735 by Black-Scholes and the
        American put is <strong>6.0896</strong> on a 1,000-step lattice
        (6.0902 on 4,000): the closed form underprices the right to
        exercise early by 0.52, eight and a half percent of the
        contract, and a desk that sells at the formula&apos;s price
        gives that away on every trade. The lattice exists because the
        American put has no closed form; it is not an approximation to
        one.
      </>
    ),
  },

  contest: {
    instance:
      'S = 100, K = 100, r = 5%, σ = 20%, T = 1 year; referee: Black-Scholes for the European contracts (call 10.4506, put 5.5735), a 4,000-step lattice for the American put',
    columns: ['price', 'error vs referee', 'work'],
    rows: [
      {
        method: 'CRR lattice, European call, N = 10',
        values: ['10.2534', '0.1972', '66 nodes'],
        verdict: 'converging',
      },
      {
        method: 'CRR lattice, European call, N = 100',
        values: ['10.4306', '0.0200', '5,151 nodes'],
        verdict: 'two cents',
      },
      {
        method: 'CRR lattice, European call, N = 1,000',
        isThisUnit: true,
        values: ['10.4486', '0.0020', '501,501 nodes'],
        best: 1,
        verdict: 'a fifth of a cent; delta 0.6368 exact to four places',
      },
      {
        method: 'CRR lattice, American put, N = 1,000',
        values: ['6.0896', '0.0006', '501,501 nodes'],
        verdict: 'early-exercise premium 0.52 over the European 5.5715',
      },
      {
        method: 'Black-Scholes as the American put',
        values: ['5.5735', '0.5161 under', 'one formula'],
        verdict: 'the wrong contract: no early exercise',
      },
      {
        method: 'Factors refitted every step, N = 16',
        values: ['-', '-', '65,536 leaves'],
        verdict: 'no recombination: one node per path',
      },
    ],
    source:
      'python solutions/binomial_options_pricing_cox_ross_rubinstein_lattice.py prints these numbers and asserts: the call within 0.01 of Black-Scholes at N = 1,000 with delta within 0.01, and Jarrow-Rudd within 0.01 too; parity and the martingale identity to 10⁻¹⁰; the variance of log returns within 10⁻³ of σ²T; at N = 16, 17 maturity prices for CRR and Jarrow-Rudd, 2¹⁶ for refitted factors, 33 and 153 distinct prices in the whole tree; the American put above the European by more than 0.5, within 0.01 of the 4,000-step reference, with a boundary rising across the horizon; the American call equal to the European; and p leaving (0, 1) below 5 steps at r = 40%.',
  },

  figure: (
    <Figure
      id="fig-crr-lattice"
      aspect="16 / 7"
      caption="Four steps of the CRR lattice for a stock at 100 with u = e^{0.2√0.25} = 1.1052, d = 1/u. Because u d = 1 an up then a down returns to 100 exactly, so the nodes braid onto one grid of nine prices (2N + 1) instead of sixteen histories. Rolling back from the maturity payoffs (amber, here the put), each node takes the discounted risk-neutral average of its children with p = 0.5378, or the exercise value if larger (red). The root is the price. Right: the measured convergence of the call to Black-Scholes and the American put’s premium."
      cite={{
        text: 'J. C. Cox, S. A. Ross, M. Rubinstein, "Option pricing: a simplified approach," Journal of Financial Economics 7(3), 1979. DOI 10.1016/0304-405X(79)90015-1. F. Black, M. Scholes, "The pricing of options and corporate liabilities," J. Political Economy 81(3), 1973.',
        href: 'https://doi.org/10.1016/0304-405X(79)90015-1',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="A four-step recombining binomial lattice of stock prices with the put payoffs at maturity, and a table of convergence numbers">
        {(() => {
          const u = Math.exp(0.2 * Math.sqrt(0.25));
          const nodes = [];
          const lines = [];
          for (let step = 0; step <= 4; step++) {
            for (let j = 0; j <= step; j++) {
              const x = 40 + step * 70;
              const y = 140 - (2 * j - step) * 28;
              const s = 100 * u ** (2 * j - step);
              nodes.push({ x, y, s, step });
              if (step < 4) {
                lines.push([x, y, x + 70, y - 28]);
                lines.push([x, y, x + 70, y + 28]);
              }
            }
          }
          return (
            <>
              {lines.map(([a, b, c, d], i) => <line key={i} x1={a} y1={b} x2={c} y2={d} stroke="rgba(154,165,189,0.35)" />)}
              {nodes.map((n, i) => (
                <g key={i}>
                  <circle cx={n.x} cy={n.y} r="11" fill={n.step === 4 ? '#f0b94b' : n.step === 0 ? '#62d98a' : '#5da2ff'} opacity="0.85" />
                  <text x={n.x - 12} y={n.y + 22} fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="9">{n.s.toFixed(1)}</text>
                  {n.step === 4 && <text x={n.x + 16} y={n.y + 4} fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="9">{Math.max(100 - n.s, 0).toFixed(1)}</text>}
                </g>
              ))}
            </>
          );
        })()}
        <text x="40" y="262" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">nine prices on the grid for four steps: 2N + 1, not 2ᴺ paths</text>
        <text x="400" y="60" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="11">European call vs Black-Scholes 10.4506</text>
        <text x="400" y="80" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">N = 10: 10.2534 (0.1972 off)</text>
        <text x="400" y="96" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">N = 100: 10.4306 (0.0200 off)</text>
        <text x="400" y="112" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="10">N = 1,000: 10.4486 (0.0020 off)</text>
        <text x="400" y="144" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="11">American put, N = 1,000</text>
        <text x="400" y="164" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="10">6.0896 (reference 6.0902)</text>
        <text x="400" y="180" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">European put 5.5715; premium 0.52</text>
        <text x="400" y="196" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="10">Black-Scholes for it: 5.5735, wrong contract</text>
        <text x="400" y="228" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">N = 16 maturity prices: CRR 17, JR 17,</text>
        <text x="400" y="244" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">refitted factors 65,536</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'binomial_options_pricing_cox_ross_rubinstein_lattice.py',
  Viz: BinomialViz,
  narration,
};
