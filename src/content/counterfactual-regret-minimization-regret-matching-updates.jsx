import CfrViz from '../viz/CfrViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/counterfactual_regret_minimization_regret_matching_updates.py?raw';
import { narration } from './counterfactual-regret-minimization-regret-matching-updates.narration.js';

export const content = {
  given:
    'A two-player zero-sum game with hidden information: each player holds a private card, bets and bluffs follow, and a decision is made knowing your own card and the betting so far, never the opponent’s card. Find a strategy that cannot be exploited.',
  task: 'Counterfactual regret minimization. The algorithm is self-play over the whole game tree: both players follow their current strategies, and every information set (a card plus a betting history) accumulates, for each action, how much better that action would have done than the strategy actually played, weighted by the probability that the opponent and chance brought the game there (the counterfactual reach). The heuristic is regret matching (Hart and Mas-Colell 2000): the next strategy plays each action in proportion to its positive cumulative regret, uniformly when none is positive. Zinkevich, Johanson, Bowling, and Piccione (2007) proved the average overall regret falls as Δ|I|√|A|/√T, so the time-averaged strategy profile is a 2R/T-Nash equilibrium.',
  constraint:
    'Measured on Kuhn poker (three cards, one bet: 12 information sets, 58 histories), whose exact value is −1/18 = −0.0556 for the first player and whose equilibrium family is known in closed form: after 10,000 iterations (580,000 nodes touched) the average strategy has value −0.0555 and exploitability 0.0015 chips per hand, inside the measured regret bound 0.0059; it bets a jack with probability α = 0.216 and a king with 0.668 (3α = 0.648), calls a bet with a queen 0.337 of the time (1/3), bets a jack after a check 0.336 (1/3), and calls a check-bet with a queen 0.554 (α + 1/3 = 0.549). Exploitability by iteration: 0.0911 at 10, 0.0233 at 100, 0.0065 at 1,000, 0.0015 at 10,000. Rock-paper-scissors converges to (0.333, 0.329, 0.338) and biased pennies to heads 0.405 (2/5) with value 0.200 (1/5). At 1,000 iterations: CFR+ 0.0049, fictitious play 0.0068, outcome-sampling MCCFR 0.0450 at an equal budget of 58,000 nodes; determinized minimax is exploitable for 0.167 per hand.',

  origins: (
    <p>
      Harold Kuhn introduced his three-card poker in <strong>1950</strong>{' '}
      as the smallest game with bluffing worth solving, and solved it by
      hand. Sergiu Hart and Andreu Mas-Colell (2000, Econometrica) proved
      that regret matching, playing each action in proportion to its
      positive regret, has vanishing regret and converges to correlated
      equilibrium. Martin Zinkevich, Michael Johanson, Michael Bowling, and Carmelo
      Piccione (<strong>2007</strong>, NeurIPS) showed that regret decomposes
      across information sets weighted by counterfactual reach, which made
      CFR an algorithm for sequential games; it solved heads-up limit
      hold&apos;em, 10<sup>12</sup> information sets (Bowling, Burch,
      Johanson, and Tammelin, Science 2015, with CFR+). Marc Lanctot&apos;s
      Monte Carlo variants (2009) sample the tree; Noam Brown and Tuomas
      Sandholm&apos;s Libratus (2017) and Pluribus (2019) beat professional
      players at no-limit poker with CFR at the core; DeepStack (2017)
      used it with learned value networks.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>traversal</strong>: every iteration walks the whole
      tree with both players following their current strategies, passes
      each player&apos;s reach probability down, and returns the expected
      value of each action up. At every information set the regret of an
      action is the counterfactual reach (opponent times chance) times
      the gain the action would have had over the strategy played, so a
      decision reached rarely by the opponent weighs little. The referee
      is an exact best-response traversal: after 10,000 iterations the
      average strategy is exploitable for{' '}
      <strong>0.0015 chips per hand</strong> and its value is −0.0555
      against the exact −0.0556.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>update</strong>: the next strategy at each
      information set plays each action in proportion to its positive
      cumulative regret. No learning rate, no gradient, no projection.
      The theorem it earns: regret falls as 1/√T, and the measurement
      follows it, 0.0911 to 0.0233 to 0.0065 to 0.0015 across four decades
      of iterations. The average strategy, not the current one, is the
      equilibrium: it lands on Kuhn&apos;s closed-form family with α =
      0.216, a king bet 0.668 (3α = 0.648), a queen call 0.337 (1/3).
    </p>
  ),

  picture: (
    <p>
      Twelve card players each sit at one table they will see again and
      again: &quot;I hold a queen and the other player bet.&quot; After every
      hand each player writes down, for every move they could have made,
      how much better it would have gone than what they did, but scaled
      by how likely the other player was to have brought the hand to this
      table at all. Next hand, each player picks moves in proportion to
      the positive regrets on the page. Nobody ever plays the page itself;
      the strategy worth keeping is the average of everything they ever
      played, and that average stops being beatable.
    </p>
  ),

  steps: [
    <>
      <strong>Traverse:</strong> walk the tree from the root with reach
      probabilities (p<sub>0</sub>, p<sub>1</sub>, p<sub>chance</sub>);
      at a terminal return the payoff.
    </>,
    <>
      <strong>Strategy now:</strong> at information set I with regrets
      R(I, a), play σ(a) = R⁺(a) / Σ R⁺, uniform if the sum is zero.
    </>,
    <>
      <strong>Values:</strong> v(a) = value of the subtree after a; v =
      Σ σ(a) v(a).
    </>,
    <>
      <strong>Regret:</strong> R(I, a) += (opponent reach × chance reach)
      × (v(a) − v); average strategy: S(I, a) += own reach × σ(a).
    </>,
    <>
      <strong>Answer:</strong> after T iterations, the normalized S is the
      strategy; its exploitability is at most (R<sub>0</sub> +
      R<sub>1</sub>) / T (measured: 0.0015 ≤ 0.0059).
    </>,
  ],

  signals: [
    <>
      <strong>Hidden information:</strong> cards, sealed bids, fog of war;
      the opponent&apos;s choice depends on what you cannot see.
    </>,
    <>
      <strong>A tree you can walk, or sample:</strong> the full-width
      walk suits thousands of information sets; sampled variants reach
      billions.
    </>,
    <>
      <strong>Unexploitable beats clever:</strong> the goal is a strategy
      a best responder gains nothing against, not a win against one
      opponent.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>fictitious play</strong>: best-respond
      to the opponent&apos;s average, average that in. 0.0068 against
      0.0065 at 1,000 iterations on Kuhn poker, but each iteration needs
      a full best-response solve, twice.
    </>
  ),

  strength: (
    <>
      <strong>A theorem that the measurement follows.</strong>{' '}
      Exploitability 0.0015 after 10,000 iterations, inside the regret
      bound 0.0059; the closed-form family recovered to within 0.02; no
      learning rate, no linear program, and a tree of 10<sup>12</sup>{' '}
      information sets within reach of the sampled and floored variants.
    </>
  ),
  weakness: (
    <>
      <strong>Slow at the end and blind to the opponent.</strong> 1/√T
      means the last decimal costs a hundred times the first; the current
      strategy is never the answer, only the average; and an equilibrium
      strategy wins nothing extra against a weak opponent it could have
      exploited. On Kuhn poker CFR+ gains only 0.0049 against 0.0065 at
      equal iterations: the dramatic speedups are a large-game story.
    </>
  ),

  problem: 'Extensive-form game solving',
  problemSlug: 'extensive-form-solving',
  rivals: [
    {
      name: 'Counterfactual regret minimization × Regret-matching updates',
      isThisUnit: true,
      algoName: 'Counterfactual regret minimization',
      cost: 'one full tree walk per iteration; two numbers per action',
      wins: (
        <>
          <strong>0.0015 exploitability at 10,000 iterations</strong>, value
          −0.0555 against −0.0556; the regret theorem holds on every run.
        </>
      ),
      costs: (
        <>
          1/√T convergence; the whole tree every iteration.
        </>
      ),
      when: 'Hidden information and a tree small enough to walk; the reference implementation.',
    },
    {
      name: 'CFR+',
      algoName: 'CFR+',
      cost: 'two passes per iteration; the same memory',
      wins: (
        <>
          Regrets floored at zero, alternating updates, linear averaging:
          0.0049 at 1,000 iterations; solved limit hold&apos;em.
        </>
      ),
      costs: (
        <>
          Twice the nodes per iteration (116,000 against 58,000 here); the
          proven bound is no better, only the practice.
        </>
      ),
      when: 'Any full-width solve at scale; the default since 2014.',
    },
    {
      name: 'Monte Carlo CFR',
      algoName: 'Monte Carlo CFR',
      cost: 'one sampled path per iteration',
      wins: (
        <>
          Nodes per iteration in the tens, not thousands; reaches games no
          walk can cover; unbiased regrets.
        </>
      ),
      costs: (
        <>
          Variance: 0.0450 at an equal budget of 58,000 nodes against
          0.0065 for the full walk.
        </>
      ),
      when: 'The tree is too large to walk and you can afford many cheap, noisy iterations.',
    },
    {
      name: 'Fictitious play',
      algoName: 'Fictitious play',
      cost: 'a best-response solve per player per iteration',
      wins: (
        <>
          The simplest idea: respond to the average, average the response;
          0.0068 at 1,000 iterations.
        </>
      ),
      costs: (
        <>
          A full best-response solve each step (116,000 nodes); slower in
          theory and exploitable mid-run.
        </>
      ),
      when: 'Teaching, or when a best-response oracle is the thing you already have.',
    },
  ],
  neverUse: {
    name: 'Determinized minimax (perfect-information Monte Carlo) on a bluffing game',
    why: (
      <>
        It looks sensible: for each deal consistent with your card, solve
        the game as if both cards were face up, average the action values,
        and play the best one. Measured on Kuhn poker, the resulting
        strategy is <strong>exploitable for 0.167 chips per hand</strong>,
        a hundred times the 0.0015 of the equilibrium, and it loses that
        much to an opponent who simply folds a queen to every bet and bets
        a king into every check. The flaw is strategy fusion: averaging
        over deals assumes you will know which deal you are in when you
        act, so the plan never bluffs and never calls thin. A method that
        reasons about hidden information as if it were visible cannot
        represent the mixed strategy the game demands.
      </>
    ),
  },

  contest: {
    instance:
      'Kuhn poker (12 information sets, 58 histories), exact value −1/18 for the first player; one currency: nodes touched; referee: an exact best-response traversal (exploitability in chips per hand) and the closed-form equilibrium family',
    columns: ['iterations', 'nodes touched', 'exploitability', 'note'],
    rows: [
      {
        method: 'CFR with regret matching',
        isThisUnit: true,
        values: ['1,000', '58,000', '0.0065', '0.0015 at 10,000 iterations; regret bound 0.0059 holds'],
        best: 2,
        verdict: 'the theorem, measured',
      },
      {
        method: 'CFR+',
        values: ['1,000', '116,000', '0.0049', 'two passes per iteration; 0.0148 at 100'],
        verdict: 'faster per iteration, even per node',
      },
      {
        method: 'fictitious play (XFP)',
        values: ['1,000', '116,000', '0.0068', 'a best response per player per iteration'],
        verdict: 'the baseline',
      },
      {
        method: 'outcome-sampling MCCFR',
        values: ['5,368', '58,000', '0.0450', 'equal node budget to CFR at 1,000; 0.1058 at 1,000 sampled iterations'],
        verdict: 'cheap iterations, paid in variance',
      },
      {
        method: 'determinized minimax (PIMC)',
        values: ['·', '·', '0.1667', 'deterministic at every information set; never bluffs'],
        verdict: 'strategy fusion',
      },
    ],
    source:
      'python solutions/counterfactual_regret_minimization_regret_matching_updates.py prints this table and asserts: value within 0.01 of -1/18; exploitability below 0.01 and at most (R0 + R1) / T; regret under the Zinkevich bound; the five closed-form relations within 0.05; exploitability falling across 10, 100, 1,000, 10,000 iterations; rock-paper-scissors uniform and pennies at 2/5 and 1/5 within 0.01; CFR+ below CFR at 100 and 1,000; fictitious play above CFR at 1,000; MCCFR above CFR at an equal node budget; determinized minimax exploitable above 0.1 and ten times CFR.',
  },

  figure: (
    <Figure
      id="fig-cfr-kuhn"
      aspect="16 / 7"
      caption="Left: exploitability of the average strategy on Kuhn poker against iterations, both axes logarithmic, for CFR, CFR+, fictitious play, and outcome-sampling MCCFR, with the 1/√T slope for reference. Right: the first player's bet probability by card at the first decision, on Kuhn's family constraint P(bet | K) = 3 P(bet | J)."
      cite={{
        text: 'M. Zinkevich, M. Johanson, M. Bowling, and C. Piccione, "Regret minimization in games with incomplete information," NeurIPS 2007. S. Hart and A. Mas-Colell, "A simple adaptive procedure leading to correlated equilibrium," Econometrica 68(5), 2000, DOI 10.1111/1468-0262.00153. H. W. Kuhn, "A simplified two-person poker," Contributions to the Theory of Games 1, 1950.',
        href: 'https://doi.org/10.1111/1468-0262.00153',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="Exploitability against iterations on log axes for four methods, and the first player's bet probabilities on Kuhn's equilibrium family">
        {(() => {
          const x0 = 50;
          const y0 = 230;
          const pw = 300;
          const ph = 180;
          const X = (t) => x0 + ((Math.log10(t) - 1) / 3) * pw;
          const Y = (e) => y0 - ((Math.log10(e) + 3) / 2.2) * ph;
          const series = [
            ['#5da2ff', [[10, 0.0911], [100, 0.0233], [1000, 0.0065], [10000, 0.0015]]],
            ['#62d98a', [[10, 0.0573], [100, 0.0148], [1000, 0.0049]]],
            ['#f0b94b', [[10, 0.0750], [100, 0.0225], [1000, 0.0068]]],
            ['#9aa5bd', [[1000, 0.1058], [5000, 0.0442]]],
          ];
          const alpha = 0.216;
          const bx = 420;
          const by = 230;
          const cards = [['J', alpha, 'α'], ['Q', 0.0, '0'], ['K', 0.668, '3α']];
          return (
            <g>
              <line x1={x0} y1={y0} x2={x0 + pw} y2={y0} stroke="#9aa5bd" strokeOpacity="0.6" />
              <line x1={x0} y1={y0 - ph} x2={x0} y2={y0} stroke="#9aa5bd" strokeOpacity="0.6" />
              {[10, 100, 1000, 10000].map((t) => (
                <text key={t} x={X(t) - 10} y={y0 + 14} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">{t.toLocaleString()}</text>
              ))}
              {[0.1, 0.01, 0.001].map((e) => (
                <text key={e} x={x0 - 44} y={Y(e) + 3} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">{e}</text>
              ))}
              {series.map(([color, pts]) => (
                <g key={color}>
                  <polyline points={pts.map(([t, e]) => `${X(t)},${Y(e)}`).join(' ')} fill="none" stroke={color} strokeWidth="2" />
                  {pts.map(([t, e]) => <circle key={t} cx={X(t)} cy={Y(e)} r="3" fill={color} />)}
                </g>
              ))}
              <text x={x0} y="22" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">exploitability vs iterations, Kuhn poker (log-log)</text>
              <text x={x0} y="36" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">blue CFR, green CFR+, amber fictitious play, gray MCCFR</text>
              <text x={bx} y="22" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">player one, first decision: P(bet)</text>
              {cards.map(([card, p, label], i) => (
                <g key={card}>
                  <rect x={bx + i * 60} y={by - p * 160} width="34" height={p * 160} fill="#5da2ff" fillOpacity="0.85" />
                  <text x={bx + i * 60} y={by - p * 160 - 5} fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="10">{p.toFixed(3)}</text>
                  <text x={bx + i * 60 + 10} y={by + 14} fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="11">{card}</text>
                  <text x={bx + i * 60 + 6} y={by + 28} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">{label}</text>
                </g>
              ))}
              <line x1={bx} y1={by - 3 * alpha * 160} x2={bx + 180} y2={by - 3 * alpha * 160} stroke="#62d98a" strokeDasharray="3 3" />
              <text x={bx} y={by - 3 * alpha * 160 - 6} fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="9">3α = 0.648 (measured 0.668)</text>
              <text x={bx} y="262" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">the family: α in [0, 1/3]; CFR settled at α = 0.216</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'counterfactual_regret_minimization_regret_matching_updates.py',
  Viz: CfrViz,
  narration,
};
