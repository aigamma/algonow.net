import SkiRentalViz from '../viz/SkiRentalViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/ski_rental_break_even_deterministic_rule.py?raw';
import { narration } from './ski-rental-break-even-deterministic-rule.narration.js';

export const content = {
  given:
    'A recurring cost against a one-time cost with the horizon unknown: rent skis for 1 a day or buy them for B, when the season may end any day. The same shape as on-demand against reserved servers, spinning a disk down against keeping it up, delaying an acknowledgment against sending it now.',
  task: 'Ski rental. The algorithm: the online rent-or-buy framework (Karlin, Manasse, Rudolph, Sleator 1988), which judges a rule by its competitive ratio, the worst case over every season length T of the rule’s cost divided by the clairvoyant’s min(T, B). The heuristic is the break-even rule: rent until the rent paid would equal the price, then buy, which means rent B − 1 days and buy on day B. Whatever day the season ends, the rule pays at most 2 − 1/B times the clairvoyant, and no deterministic rule does better: every threshold k has a season that ends the day it buys.',
  constraint:
    'Measured in exact rational arithmetic: for B = 2, 3, 5, 10, 20, 50, 100, every buy-day threshold k from 1 to 3B scored against every season length to 3B. The break-even threshold k = B has worst-case ratio exactly 2 − 1/B (1.9 at B = 10) and every other threshold is strictly worse: 1 + (B − 1)/k below B, (k − 1 + B)/B above it, exactly 2 at both neighbours k = B ± 1, B at k = 1, 3 − 1/B at k = 2B. The randomized rule that draws its buy day from the Karlin-Manasse-McGeoch-Owicki distribution has worst-case expected ratio exactly 1/(1 − (1 − 1/B)ᴮ): 1.3333, 1.4874, 1.5353, 1.5774 at B = 2, 5, 10, 100 against the limit e/(e − 1) = 1.5820, with every season length equally bad (equalized) and a 20,000-trial Monte Carlo at B = 10 within standard error (1.538 ± 0.015). With a known season distribution the Bayes threshold beats both: memoryless seasons of mean 20 at B = 10 buy on day one for 10.00 against break-even 13.70 and randomized 12.32; mean 5 never buys for 5.00 against 5.67 and 6.85, where break-even beats the randomized rule (the author correction); half 3-day and half 40-day seasons buy on day 4 for 8.00 against 11.00 and 9.98. Negative examples at B = 10: buy on day one has ratio 10 on a one-day season; never buy has ratio 3 on a 30-day season and no bound at all.',

  origins: (
    <p>
      The rent-or-buy question was named ski rental in the folklore around
      Karlin, Manasse, Rudolph, and Sleator&apos;s &quot;Competitive snoopy
      caching&quot; (<strong>1988</strong>), where it is the heart of the
      analysis (a shared cache line that another processor keeps writing is
      &quot;rented&quot; per write until dropping it is cheaper) and the
      2 − 1/B guarantee is proved; Sleator and Tarjan (1985) had introduced
      the worst-case comparison against a clairvoyant for list update and
      paging, and the 1988 paper coined &quot;competitive&quot; for it. Karlin,
      Manasse, McGeoch, and Owicki (1990, Algorithmica 1994) showed a coin
      helps: a buy day drawn from the right distribution reaches an expected
      ratio of e/(e − 1) ≈ 1.582, optimal among randomized rules. The same
      constant governs dynamic TCP acknowledgment (Karlin, Kenyon, Randall
      2001), power-down of disks and processors (Irani, Shukla, Gupta 2003),
      and reserved-against-on-demand cloud purchasing; Lotker, Patt-Shamir,
      and Rawitz extended it to many slopes (&quot;rent, lease, or buy,&quot;
      2008), and Purohit, Svitkina, and Kumar (2018) made ski rental the
      first worked example of learning-augmented online algorithms, where a
      forecast buys a better ratio when right and a bounded loss when wrong.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>yardstick</strong>: the clairvoyant who pays min(T, B),
      and the score, the worst case over every season length of your cost
      over the clairvoyant&apos;s. The referee is exact rational enumeration:
      for seven prices from 2 to 100, every threshold to 3B against every
      season length to 3B. The break-even threshold is the{' '}
      <strong>unique best at every price</strong>, exactly 2 − 1/B, and every
      other threshold obeys a measured formula: 1 + (B − 1)/k below B,
      (k − 1 + B)/B above, 2 at both neighbours, B at day one, 3 − 1/B at
      2B. The randomized rule&apos;s 1/(1 − (1 − 1/B)ᴮ) is confirmed exactly,
      equalized across every season length, and by a 20,000-trial Monte Carlo.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>threshold</strong>: one counter (rent paid so far) and
      one comparison each morning; when another day&apos;s rent would reach
      the price, buy. The worst season ends the day you buy: 2B − 1 against
      B, <strong>ratio 2 − 1/B, 1.9 at B = 10</strong>; every shorter season
      costs exactly what the clairvoyant pays and every longer one costs that
      same 2B − 1. The honest numbers: a coin cuts the worst case to 1.5353
      (expected), a trusted forecast cuts the average further (10.00 against
      13.70 when the mean season is 20 days), and the forecast rule, when the
      forecast is wrong, pays the whole price on a one-day season, a ratio of
      B, the disaster the break-even rule exists to avoid.
    </p>
  ),

  picture: (
    <p>
      A skier at the start of a trip with no return date; rentals cost one
      coin a day and skis cost ten. Each morning the trip may be over by
      evening. Buy at once and a one-day trip has cost ten coins for one day
      on the slopes. Never buy and a long trip bleeds a coin a day with no
      end. The break-even skier rents for nine days and buys on the tenth, so
      the worst trip, the one that ends the day the skis are bought, costs
      nineteen coins where ten would have done, and every other trip costs
      exactly what the clairvoyant pays or that same nineteen. One counter,
      one comparison, no forecast.
    </p>
  ),

  steps: [
    <>
      <strong>Set the currency:</strong> rent 1 per day, buy B once; the
      clairvoyant who knows the season length T pays min(T, B).
    </>,
    <>
      <strong>Count:</strong> keep one number, the rent paid so far; each
      morning, if the season continues and it is below B − 1, rent and add
      one.
    </>,
    <>
      <strong>Break even:</strong> on day B, when another day&apos;s rent
      would make the rent paid equal the price, buy instead; the total paid is
      2B − 1.
    </>,
    <>
      <strong>Certify:</strong> the worst season ends the day you buy, 2B − 1
      against B, ratio 2 − 1/B; every other threshold k scores 1 + (B − 1)/k
      below B or (k − 1 + B)/B above it.
    </>,
    <>
      <strong>If you may toss a coin:</strong> draw the buy day once from the
      KMMO distribution over 1..B (day k weighted ((B − 1)/B)ᴮ⁻ᵏ); expected
      ratio 1/(1 − (1 − 1/B)ᴮ) on every season length, tending to e/(e − 1).
      If you trust a season distribution, enumerate thresholds for expected
      cost instead and write down the worst case you are leaving unguarded.
    </>,
  ],

  signals: [
    <>
      <strong>A recurring cost against a one-time cost, horizon unknown:</strong>{' '}
      rent against buy, on-demand against reserved, spin down against keep
      spinning, delay an acknowledgment against send it.
    </>,
    <>
      <strong>An adversary, or a forecast you do not trust:</strong> you want
      a guarantee for every future, not an average over futures you assumed.
    </>,
    <>
      <strong>One shot:</strong> no repeated rounds to learn from, so regret
      has nothing to average over and the competitive ratio is the yardstick.
    </>,
  ],
  baseline: (
    <>
      The honest baselines are the two unhedged forecasts: <strong>buy on
      day one</strong> (ratio B, 10 at B = 10, on a one-day season) and{' '}
      <strong>never buy</strong> (ratio T/B: 3 on a 30-day season, no bound).
      Each is the Bayes optimum for some season distribution and a disaster
      for another.
    </>
  ),

  strength: (
    <>
      <strong>The best deterministic guarantee, exactly, with one counter.</strong>{' '}
      2 − 1/B at every price, the unique minimum over every threshold by
      enumeration; no model, no randomness, no forecast; shorter seasons cost
      exactly the clairvoyant&apos;s price.
    </>
  ),
  weakness: (
    <>
      <strong>Nearly double in the worst case, and beaten by anyone who
      knows more.</strong> A coin reaches 1.5353 against 1.9 at B = 10; a
      trusted distribution reaches 10.00 against 13.70 at a mean season of
      20 days; the rule knows one cost pair only, so several commitment
      levels, changing prices, or a time value of money need the multislope
      or learning-augmented extensions.
    </>
  ),

  problem: 'Rent-or-buy decisions',
  problemSlug: 'optimal-stopping',
  rivals: [
    {
      name: 'Ski rental × Break-even deterministic rule',
      isThisUnit: true,
      algoName: 'Ski rental',
      cost: 'O(1) per day: one counter against B',
      wins: (
        <>
          <strong>Exactly 2 − 1/B</strong>, the best any deterministic rule
          can do; no model, no coin, explainable in one sentence.
        </>
      ),
      costs: (
        <>
          Pays 2B − 1 against B when the season ends the day you buy.
        </>
      ),
      when: 'The horizon is unknown or adversarial and you need a guarantee you can state: the default.',
    },
    {
      name: 'Ski rental × Randomized exponential threshold',
      algoName: 'Ski rental',
      cost: 'O(1) per day plus one random draw',
      wins: (
        <>
          Expected ratio 1/(1 − (1 − 1/B)ᴮ): <strong>1.5353 against 1.9</strong>{' '}
          at B = 10, e/(e − 1) ≈ 1.582 in the limit, equalized over every T.
        </>
      ),
      costs: (
        <>
          In expectation only: one unlucky draw buys on day one and pays B
          against 1; loses to break-even on short-mean seasons (6.85 against
          5.67).
        </>
      ),
      when: 'Many independent instances where the average is what you pay, against an adversary who cannot see your coin.',
    },
    {
      name: 'Secretary problem × 1/e stopping rule',
      algoName: 'Secretary problem',
      cost: 'O(n), one pass',
      wins: (
        <>
          Optimal stopping when the horizon n is known and the unknown is
          quality: 37% of the field as calibration, then the first record.
        </>
      ),
      costs: (
        <>
          Needs n in advance and a random arrival order; the skier&apos;s
          unknown is the horizon itself.
        </>
      ),
      when: 'You know how many offers will come and cannot foresee how good they are; puzzle 108 is the lesson.',
    },
    {
      name: 'Multiplicative weights update',
      algoName: 'Multiplicative weights update',
      cost: 'O(experts) per round',
      wins: (
        <>
          Regret O(√(T log n)) against the best fixed action in hindsight when
          the same decision repeats.
        </>
      ),
      costs: (
        <>
          Regret is measured against the best fixed action, not the
          clairvoyant; a single season offers no rounds to learn from.
        </>
      ),
      when: 'The decision repeats many times and the past predicts the future.',
    },
  ],
  neverUse: {
    name: 'Tuning the threshold to a forecast when the future is adversarial',
    why: (
      <>
        A forecast of a long season says buy on day one: the enumeration gives
        that rule <strong>ratio B, 10 at B = 10</strong>, on a one-day season
        where the break-even rule paid 1. A forecast of a short season says
        never buy: that rule pays T against B, ratio 3 on a 30-day season and
        no bound at all. Both are the Bayes optimum for some distribution
        (memoryless seasons of mean 20 and mean 5, measured), so both feel
        reasonable in the moment, and both are exactly what 2 − 1/B protects
        you from. When the forecast can be wrong and the loss is unbounded,
        keep the one counter that ignores it; when the forecast comes with a
        measured reliability, the learning-augmented version spends a little
        of the guarantee to buy a better average.
      </>
    ),
  },

  contest: {
    instance:
      'Rent 1 a day or buy for B = 10, season length unknown. Worst case over every season length by exact enumeration (ratio = online cost / min(T, B)), then expected cost over three season distributions: memoryless with mean 5, memoryless with mean 20, and half 3-day, half 40-day seasons',
    columns: ['worst case, B = 10', 'worst case, any B', 'memoryless, mean 5', 'memoryless, mean 20', 'half 3-day, half 40-day'],
    rows: [
      {
        method: 'break-even: rent 9 days, buy on day 10',
        isThisUnit: true,
        values: ['1.90', '2 − 1/B (best deterministic)', '5.67', '13.70', '11.00'],
        best: 1,
        verdict: 'the guarantee, with one counter',
      },
      {
        method: 'randomized KMMO threshold',
        values: ['1.5353 expected', '1/(1 − (1 − 1/B)ᴮ), limit e/(e − 1) = 1.582', '6.85', '12.32', '9.98'],
        best: 0,
        verdict: 'a coin takes a fifth off the worst case',
      },
      {
        method: 'Bayes threshold (knows the distribution)',
        values: ['unbounded', 'unbounded', '5.00 (never buys)', '10.00 (buys day 1)', '8.00 (buys day 4)'],
        best: 2,
        verdict: 'wins the average, forfeits the guarantee',
      },
      {
        method: 'buy on day one',
        values: ['10 (a 1-day season)', 'B', '10.00', '10.00', '10.00'],
        verdict: 'the long-season forecast, unhedged',
      },
      {
        method: 'never buy',
        values: ['3 at 30 days, unbounded', 'T/B', '5.00', '20.00', '21.50'],
        verdict: 'the short-season forecast, unhedged',
      },
      {
        method: 'clairvoyant min(T, B)',
        values: ['1', '1', '4.46', '8.03', '6.50'],
        verdict: 'the referee, not a rule',
      },
    ],
    source:
      'python solutions/ski_rental_break_even_deterministic_rule.py prints this table and asserts: for B = 2, 3, 5, 10, 20, 50, 100 the break-even threshold is the unique best with worst-case ratio exactly 2 − 1/B, thresholds below B score 1 + (B − 1)/k, thresholds above score (k − 1 + B)/B, both neighbours score 2, day one scores B, and 2B scores 3 − 1/B; the randomized rule’s worst expected ratio equals 1/(1 − (1 − 1/B)ᴮ) exactly with every season length equalized, within 0.006 of e/(e − 1) at B = 100, and a 20,000-trial Monte Carlo within four standard errors; the Bayes rule never buys at mean 5 and buys at once at mean 20, break-even beats randomized at mean 5 and loses at mean 20, and the 3-or-40 mixture is solved by day 4 at 8.00 against 11.00; buy-day-one scores B, never-buy scores 3 at 30 days, and threshold 2B scores 3 − 1/B.',
  },

  figure: (
    <Figure
      id="fig-ski-rental"
      aspect="16 / 7"
      caption="Left: worst-case competitive ratio of the rule 'rent until day k, then buy' at B = 10, by enumeration: 10 at k = 1 and 5.5 at k = 2 (off the chart), falling to exactly 2 at k = 9, the unique minimum 2 − 1/B = 1.9 at the break-even day, 2 again at k = 11, then (k − 1 + B)/B up to 2.9 at k = 20. Right: cost against season length at B = 10: the clairvoyant pays min(T, 10); the break-even rule pays T through day 9 and 19 from day 10 on; the randomized rule pays 1.5353 × min(T, 10) in expectation on every T; buy-on-day-one pays 10 and never-buy pays T."
      cite={{
        text: 'A. R. Karlin, M. S. Manasse, L. Rudolph, D. D. Sleator, "Competitive snoopy caching," Algorithmica 3 (1988). A. R. Karlin, M. S. Manasse, L. A. McGeoch, S. Owicki, "Competitive randomized algorithms for nonuniform problems," Algorithmica 11 (1994).',
        href: 'https://doi.org/10.1007/BF01762111',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="Worst-case competitive ratio against the buy-day threshold at price ten, with the unique minimum at the break-even day, beside cost against season length for the clairvoyant, the break-even rule, the randomized rule, buy on day one, and never buy">
        {(() => {
          const B = 10;
          const ratio = (k) => (k < B ? 1 + (B - 1) / k : (k - 1 + B) / B);
          const px = (k) => 30 + (k - 1) * 14;
          const py = (v) => 230 - (Math.min(v, 4.2) - 1) * (190 / 3.2);
          const ks = Array.from({ length: 20 }, (_, i) => i + 1);
          const rr = 1 / (1 - ((B - 1) / B) ** B);
          const qx = (t) => 350 + (t - 1) * 14;
          const qy = (c) => 230 - c * (190 / 21);
          const ts = ks;
          const poly = (f) => ts.map((t) => `${qx(t)},${qy(f(t))}`).join(' ');
          const mono = 'ui-monospace, monospace';
          return (
            <g>
              <text x="30" y="22" fill="#9aa5bd" fontFamily={mono} fontSize="10">worst-case ratio of &quot;buy on day k&quot; at B = 10</text>
              <line x1="30" y1={py(2)} x2="300" y2={py(2)} stroke="#9aa5bd" strokeOpacity="0.5" strokeDasharray="3 3" />
              <text x="246" y={py(2) - 4} fill="#9aa5bd" fontFamily={mono} fontSize="9">ratio 2</text>
              <line x1="30" y1={py(rr)} x2="300" y2={py(rr)} stroke="#f0b94b" strokeOpacity="0.7" strokeDasharray="3 3" />
              <text x="180" y={py(rr) + 12} fill="#f0b94b" fontFamily={mono} fontSize="9">randomized 1.5353</text>
              <line x1="30" y1={py(1)} x2="300" y2={py(1)} stroke="#62d98a" strokeOpacity="0.7" />
              <text x="232" y={py(1) - 4} fill="#62d98a" fontFamily={mono} fontSize="9">clairvoyant 1</text>
              {ks.map((k) => (
                <g key={k}>
                  <circle cx={px(k)} cy={py(ratio(k))} r={k === B ? 4 : 2.5} fill={k === B ? '#5da2ff' : ratio(k) > 4.2 ? '#e2606c' : '#9aa5bd'} />
                  {k % 5 === 0 || k === 1 ? (
                    <text x={px(k) - 3} y="246" fill="#9aa5bd" fontFamily={mono} fontSize="9">{k}</text>
                  ) : null}
                </g>
              ))}
              <text x={px(1) - 4} y="40" fill="#e2606c" fontFamily={mono} fontSize="9">10, 5.5 off the chart</text>
              <text x={px(B) - 30} y={py(1.9) + 20} fill="#5da2ff" fontFamily={mono} fontSize="9">k = B: 2 − 1/B = 1.9</text>
              <text x="30" y="262" fill="#9aa5bd" fontFamily={mono} fontSize="10">buy day k; red: 1 + (B − 1)/k, right of B: (k − 1 + B)/B</text>
              <text x="350" y="22" fill="#9aa5bd" fontFamily={mono} fontSize="10">cost against season length T at B = 10</text>
              <polyline points={poly((t) => t)} fill="none" stroke="#9aa5bd" strokeOpacity="0.6" strokeWidth="1.5" />
              <polyline points={poly(() => B)} fill="none" stroke="#9aa5bd" strokeOpacity="0.6" strokeWidth="1.5" strokeDasharray="2 3" />
              <polyline points={poly((t) => rr * Math.min(t, B))} fill="none" stroke="#f0b94b" strokeWidth="1.5" strokeDasharray="4 3" />
              <polyline points={poly((t) => (t < B ? t : 2 * B - 1))} fill="none" stroke="#5da2ff" strokeWidth="2" />
              <polyline points={poly((t) => Math.min(t, B))} fill="none" stroke="#62d98a" strokeWidth="2" />
              <text x="520" y={qy(20) + 4} fill="#9aa5bd" fontFamily={mono} fontSize="9">never buy: T</text>
              <text x="540" y={qy(19) - 6} fill="#5da2ff" fontFamily={mono} fontSize="9">break-even: 19</text>
              <text x="540" y={qy(rr * B) - 4} fill="#f0b94b" fontFamily={mono} fontSize="9">randomized: 15.35</text>
              <text x="540" y={qy(B) + 12} fill="#62d98a" fontFamily={mono} fontSize="9">clairvoyant: 10</text>
              <text x="470" y={qy(B) - 4} fill="#9aa5bd" fontFamily={mono} fontSize="9">buy day one: 10</text>
              {[1, 5, 10, 15, 20].map((t) => (
                <text key={t} x={qx(t) - 3} y="246" fill="#9aa5bd" fontFamily={mono} fontSize="9">{t}</text>
              ))}
              <text x="350" y="262" fill="#9aa5bd" fontFamily={mono} fontSize="10">season length T; the worst case is T = 10, the day the skis are bought</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'ski_rental_break_even_deterministic_rule.py',
  Viz: SkiRentalViz,
  narration,
};
