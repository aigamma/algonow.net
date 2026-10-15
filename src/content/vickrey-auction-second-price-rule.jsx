import VickreyViz from '../viz/VickreyViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/vickrey_auction_second_price_rule.py?raw';
import { narration } from './vickrey-auction-second-price-rule.narration.js';

export const content = {
  given:
    'One item and n bidders who each privately know their value for it. Sell it so the bidder who values it most takes it, so nobody gains by lying about their value, and so the seller can write the expected revenue down in advance.',
  task: 'Vickrey auction. The algorithm: a sealed-bid auction, one bid per bidder, the highest bid wins. The heuristic is the second-price rule (Vickrey 1961): the winner pays the second-highest bid, not their own. The bid then decides only whether you win, never what you pay, so bidding your true value is a dominant strategy: no other bid does better against any bids the others might submit. The ascending (English) auction reaches the same outcome one increment at a time, eBay’s proxy bidding is this rule with a clock, and the VCG mechanism generalizes “pay the harm you cause others” to combinatorial sales.',
  constraint:
    'Measured: on a 21-value grid against 21 rival bids and 21 deviations, plus 20,000 random profiles against 201 deviations each, 4,029,261 comparisons and 0 profitable deviations from the truth; under a first-price rule 210 of the 441 grid cells reward shading. Against rivals bidding the symmetric equilibrium (n − 1)v/n, a first-price bidder’s best reply lands within 0.0007 of the same shading and bidding v earns exactly 0. Revenue over 60,000 draws per cell, i.i.d. uniform values: Vickrey 0.3351 ± 0.0010, 0.4997 ± 0.0009, 0.6665 ± 0.0007 at n = 2, 3, 5 against first-price 0.3340, 0.4994, 0.6668 and theory (n − 1)/(n + 1) = 0.3333, 0.5, 0.6667; the highest value won 60,000 of 60,000 every time. An ascending clock at increment 0.001 matched the Vickrey winner on 3,000 of 3,000 draws and the price within 0.001, in 500 rounds per auction. Myerson’s reserve for uniform values is 0.5: two-bidder revenue 0.3330 (r = 0), 0.3859 (0.3), 0.4181 (0.5), 0.3674 (0.7), each within three standard errors of 1/3 + r² − 4r³/3, which peaks at 0.500; the item goes unsold 24.7% of the time at r = 0.5. A first-price auction between a bidder who shades by half and one who shades by a fifth misallocates 18.7% of draws and loses 3.5% of welfare; Vickrey misallocates none. A seller who reads the bids and shills just under the winner extracts 0.2496 ± 0.0008 per sale, the whole gap E[v₁ − v₂] = 1/(n + 1). 0.76 s.',

  origins: (
    <p>
      William Vickrey, &quot;Counterspeculation, Auctions, and Competitive
      Sealed Tenders&quot; (<strong>Journal of Finance, 1961</strong>): the
      sealed second-price auction makes truthful bidding dominant, allocates
      efficiently, and earns the same expected revenue as the first-price and
      English auctions under symmetric bidders, the first revenue-equivalence
      result. Stamp dealers had run the rule since the 1890s and the English
      auction had always stopped near the second value, so the mechanism
      predates its analysis. Clarke (1971) and Groves (1973) generalized it to
      many items and public decisions (charge each winner the harm their
      presence does to the others: VCG). Myerson (1981) characterized every
      truthful single-item auction and showed the revenue-optimal one is
      second-price with a reserve where the virtual value crosses zero.
      Vickrey shared the 1996 Nobel prize, Myerson the 2007 one. The rule runs
      inside eBay&apos;s proxy bidding and, modified, inside the generalized
      second-price auctions that sell search ads; its matching cousin is the
      deferred-acceptance lesson in puzzle 73.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>collection and the allocation</strong>: one sealed
      bid each, highest bid wins, a sort or two running maxima. Efficient by
      construction if the bids are honest, and the referee for honesty is
      exhaustive: <strong>4,029,261 deviations</strong> compared with
      bidding the truth on a value grid and on 20,000 random profiles, none
      profitable; the highest value took the item on 60,000 of 60,000 draws
      at each of n = 2, 3, 5; an ascending clock at increment 0.001 stopped
      at the same winner on 3,000 of 3,000 draws and the same price within
      one increment.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>price</strong>. Charging the second bid cuts the link
      between what you say and what you pay: raising your bid above your value
      only risks winning at a loss, lowering it only risks losing a bargain.
      The same measurement under a first-price rule finds{' '}
      <strong>210 of 441 grid cells where shading pays</strong>; against
      equilibrium rivals the best reply is (n − 1)v/n to within 0.0007, and
      bidding v earns 0. Both rules earn (n − 1)/(n + 1): 0.4997 ± 0.0009
      against 0.4994 ± 0.0005 at n = 3. The second-price rule gets that
      revenue without asking anyone to compute an equilibrium.
    </p>
  ),

  picture: (
    <p>
      A silent room where each bidder writes one number on a card and seals
      it. Under the first-price rule you are writing a check, and you want the
      smallest check that still wins, so you study the others and guess.
      Under the second-price rule you are setting a thermostat: the highest
      temperature at which you are still willing to be in the room. The price
      is set by the next person&apos;s thermostat, not yours. Set yours above
      your comfort and you may be left in a room that is too hot at a price
      you never wanted; set it below and you may be sent out while the room
      was still fine. The honest setting is your actual comfort, whoever else
      is in the room.
    </p>
  ),

  steps: [
    <>
      <strong>Collect:</strong> one sealed bid b<sub>i</sub> from each of n
      bidders, with an optional reserve price r published in advance.
    </>,
    <>
      <strong>Rank:</strong> sort the bids from highest to lowest; break ties
      by a fixed rule (lowest index, or a coin).
    </>,
    <>
      <strong>Allocate:</strong> if the top bid is below r the item goes
      unsold; otherwise the highest bidder wins.
    </>,
    <>
      <strong>Price:</strong> the winner pays max(second-highest bid, r),
      never their own bid.
    </>,
    <>
      <strong>Verify:</strong> for a probed bidder, try every alternative bid
      on a grid against the others as they stand and confirm none beats the
      truth; run the ascending clock on the same values and confirm the same
      winner and price within one increment.
    </>,
  ],

  signals: [
    <>
      <strong>One indivisible item and private values:</strong> each bidder
      knows their own worth and you want the item where it is worth most.
    </>,
    <>
      <strong>Bidders you cannot trust to compute equilibria:</strong>{' '}
      newcomers, bots, people who would shade badly under first-price and
      misallocate the item.
    </>,
    <>
      <strong>A seller who can commit:</strong> the bids are sealed from the
      seller and no bid can be inserted after the envelopes open; eBay works
      because the platform holds the bids.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the <strong>first-price sealed bid</strong>:
      pay what you bid. The same expected revenue at equilibrium, 0.4994
      against 0.4997 at n = 3, but only after every bidder has correctly
      shaded to (n − 1)v/n; bidding your value there earns exactly nothing.
    </>
  ),

  strength: (
    <>
      <strong>Truthful, efficient, and revenue-equivalent, with nothing to
      compute.</strong> 0 profitable deviations in 4,029,261 checks; the
      highest value wins 60,000 of 60,000; revenue (n − 1)/(n + 1) within
      three standard errors at n = 2, 3, 5; the ascending clock agrees to one
      increment.
    </>
  ),
  weakness: (
    <>
      <strong>One assumption carries everything.</strong> Private values
      only (common values bring back the winner&apos;s curse); revenue is not
      maximal without a reserve, and the reserve needs the distribution;
      winners paying far less than they bid looks odd to sellers; and if the
      seller can read the bids or the bidders can talk, the shill takes
      0.2496 per sale, the entire first-to-second gap.
    </>
  ),

  problem: 'Truthful single-item auction',
  problemSlug: 'auction-design',
  rivals: [
    {
      name: 'Vickrey auction × Second-price rule',
      isThisUnit: true,
      algoName: 'Vickrey auction',
      cost: 'O(n log n) to sort the bids, O(n) with two running maxima',
      wins: (
        <>
          <strong>0 of 4,029,261 deviations pay</strong>; the highest value
          wins every draw; revenue (n − 1)/(n + 1) matched at n = 2, 3, 5.
        </>
      ),
      costs: (
        <>
          Needs a seller who cannot see the bids and bidders who do not
          collude: the shill takes 0.2496 per sale.
        </>
      ),
      when: 'One item, private values, bidders you cannot trust to compute equilibria: the default.',
    },
    {
      name: 'VCG mechanism',
      algoName: 'VCG mechanism',
      cost: 'n + 1 welfare maximizations (NP-hard over bundles)',
      wins: (
        <>
          The same &quot;pay the harm you cause&quot; rule for many items
          and packages; truthful in dominant strategies and efficient.
        </>
      ),
      costs: (
        <>
          Each winner determination is a combinatorial optimization; revenue
          can collapse to zero; not collusion-proof.
        </>
      ),
      when: 'Several heterogeneous items with complementarities, where efficiency matters more than revenue.',
    },
    {
      name: 'Myerson optimal auction',
      algoName: 'Myerson optimal auction',
      cost: 'O(n) virtual values plus a reserve',
      wins: (
        <>
          Reserve 0.5 where the virtual value 2v − 1 crosses zero:{' '}
          <strong>0.4181 against 0.3330</strong> at n = 2, a quarter more
          revenue, matching 1/3 + r² − 4r³/3.
        </>
      ),
      costs: (
        <>
          Needs the value distribution; the item goes unsold 24.7% of the
          time; asymmetric bidders make it inefficient.
        </>
      ),
      when: 'The seller knows the distribution and wants revenue, not welfare.',
    },
    {
      name: 'Ascending clock auction',
      algoName: 'Ascending clock auction',
      cost: 'O(v_max / increment) rounds',
      wins: (
        <>
          The same winner on 3,000 of 3,000 draws and the same price within
          one increment; nobody writes a value down; prices are public.
        </>
      ),
      costs: (
        <>
          500 rounds per auction at increment 0.001; open bidding invites
          jump bids and collusive signalling.
        </>
      ),
      when: 'Live settings where bidders discover their values as the price rises, or where sealed envelopes are mistrusted.',
    },
  ],
  neverUse: {
    name: 'The second-price rule with a seller who can read the bids',
    why: (
      <>
        Let the seller open the envelopes first and slip a shill bid just
        under the winner. The winner still wins, but pays their own value
        minus a hair instead of the second bid. Measured over 60,000 sales
        with three bidders: <strong>0.2496 ± 0.0008 extracted per sale</strong>,
        the entire expected gap E[v₁ − v₂] = 1/(n + 1). The auction has
        silently become a first-price auction run by a liar, and once bidders
        suspect it they shade, which kills the dominance proof and the
        efficiency with it: measured, a first-price auction between a bidder
        shading by half and one shading by a fifth misallocates 18.7% of
        draws and loses 3.5% of welfare. Collusion does the same from the
        other side: the top two agree the runner-up bids zero, and the winner
        pays the third price. The rule is a promise about who holds the
        envelopes; never run it where the promise cannot be kept.
      </>
    ),
  },

  contest: {
    instance:
      'One item, n bidders with i.i.d. uniform [0, 1] values, 60,000 draws per cell; referees: exhaustive deviation checks on a grid and 20,000 random profiles, a best-response computation for the first-price equilibrium, and the closed forms (n − 1)/(n + 1) and 1/3 + r² − 4r³/3',
    columns: ['truthful bidding dominant?', 'revenue at n = 3 (theory 0.500)', 'item to the highest value', 'needs'],
    rows: [
      {
        method: 'Vickrey: sealed bids, second-price rule',
        isThisUnit: true,
        values: ['yes: 0 of 4,029,261 deviations pay', '0.4997 ± 0.0009', '60,000 of 60,000', 'a seller who cannot see the bids'],
        best: 0,
        verdict: 'truthful and efficient, first-price revenue for free',
      },
      {
        method: 'first-price sealed bid, equilibrium shading',
        values: ['no: shade to (n − 1)v/n; bidding v earns 0', '0.4994 ± 0.0005', '100% only if all shade alike; 81.3% with mixed habits', 'common knowledge of the value distribution'],
        verdict: 'the same revenue, paid for in strategy',
      },
      {
        method: 'ascending clock, increment 0.001',
        values: ['yes: stay in up to your value', 'Vickrey’s price within 0.001 on 3,000 draws', '3,000 of 3,000', '500 rounds per auction'],
        verdict: 'Vickrey one increment at a time',
      },
      {
        method: 'Vickrey with Myerson reserve 0.5 (n = 2)',
        values: ['yes', '0.4181 ± 0.0010 against 0.3330 unreserved', 'unsold 24.7% of the time', 'the value distribution'],
        verdict: 'a quarter more revenue, bought with efficiency',
      },
      {
        method: 'second-price with a seller shill',
        values: ['the seller lies instead', '+0.2496 ± 0.0008 per sale over the honest price', '60,000 of 60,000, overcharged', 'a dishonest seller and bidders who never learn'],
        verdict: 'the whole first-to-second gap, stolen',
      },
    ],
    source:
      'python solutions/vickrey_auction_second_price_rule.py prints this table and asserts: no deviation on the 21 × 21 × 21 grid or on 20,000 random profiles × 201 bids beats the truth under the second-price rule, while 210 grid cells reward shading under first-price; first-price best replies within 0.002 of (n − 1)v/n at n = 2, 3, 5 and bidding v earns 0; Vickrey and equilibrium first-price revenues within three standard errors of (n − 1)/(n + 1) and of each other; the highest value wins every Vickrey draw; the clock auction matches winner and price within one increment on 3,000 draws; the closed-form reserve revenue peaks at 0.500 and the simulated revenue at r = 0, 0.3, 0.5, 0.7 matches it within three standard errors with 0.5 best; mixed first-price shading misallocates; and the shill’s gain equals 1/(n + 1) within three standard errors.',
  },

  figure: (
    <Figure
      id="fig-second-price-payoff"
      aspect="16 / 7"
      caption="Left: a bidder with value 0.8 facing a highest rival bid of 0.5. Under the second-price rule (amber) the payoff is a step: zero below 0.5, then flat at 0.3 for every winning bid, so the truthful bid (green) is as good as any other and the bid only decides win or lose. Under the first-price rule (dashed blue) the payoff is 0.8 − b above 0.5, so the best bid hugs the rival and the truthful bid earns nothing. Right: two-bidder revenue against the reserve, 1/3 + r² − 4r³/3, with the four measured points (60,000 draws each); the peak is Myerson’s reserve 0.5, where the virtual value 2v − 1 crosses zero."
      cite={{
        text: 'W. Vickrey, "Counterspeculation, Auctions, and Competitive Sealed Tenders," Journal of Finance 16(1), 1961, 8–37. R. B. Myerson, "Optimal Auction Design," Mathematics of Operations Research 6(1), 1981, 58–73. E. H. Clarke, Public Choice 11, 1971. T. Groves, Econometrica 41(4), 1973.',
        href: 'https://doi.org/10.1111/j.1540-6261.1961.tb02789.x',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="Payoff against bid under the second-price and first-price rules for a bidder with value point eight facing a rival bid of point five, beside the two-bidder revenue curve against the reserve price peaking at one half">
        {(() => {
          const v = 0.8;
          const m = 0.5;
          const lx = (b) => 30 + b * 270;
          const ly = (u) => 236 - (u / 0.4) * 176;
          const rx = (r) => 360 + r * 260;
          const ry = (rev) => 236 - (rev / 0.45) * 176;
          const revenue = (r) => 1 / 3 + r * r - (4 * r * r * r) / 3;
          const curve = Array.from({ length: 41 }, (_, i) => i / 40).map((r) => `${rx(r).toFixed(1)},${ry(revenue(r)).toFixed(1)}`).join(' ');
          const measured = [[0, 0.333], [0.3, 0.3859], [0.5, 0.4181], [0.7, 0.3674]];
          return (
            <g fontFamily="ui-monospace, monospace">
              <text x="30" y="20" fill="#9aa5bd" fontSize="10">value 0.8; highest rival bid 0.5</text>
              <line x1="30" y1="236.5" x2="300" y2="236.5" stroke="#9aa5bd" strokeOpacity="0.5" />
              <line x1="30" y1="60" x2="30" y2="236" stroke="#9aa5bd" strokeOpacity="0.5" />
              <line x1={lx(m)} y1="60" x2={lx(m)} y2="236" stroke="#9aa5bd" strokeOpacity="0.4" strokeDasharray="3 3" />
              <text x={lx(m) - 24} y="250" fill="#9aa5bd" fontSize="9">rival 0.5</text>
              <text x={lx(v) - 24} y="250" fill="#62d98a" fontSize="9">truth 0.8</text>
              <text x="300" y="250" fill="#9aa5bd" fontSize="9" textAnchor="end">bid</text>
              <text x="34" y={ly(0.3) - 6} fill="#9aa5bd" fontSize="9">0.3 = 0.8 − 0.5</text>
              <polyline points={`${lx(0)},${ly(0)} ${lx(m)},${ly(0)} ${lx(m)},${ly(v - m)} ${lx(1)},${ly(v - m)}`} fill="none" stroke="#f0b94b" strokeWidth="2.5" />
              <polyline points={`${lx(m)},${ly(v - m)} ${lx(v)},${ly(0)} ${lx(1)},${ly(0)}`} fill="none" stroke="#5da2ff" strokeWidth="2" strokeDasharray="5 4" />
              <circle cx={lx(v)} cy={ly(v - m)} r="4.5" fill="#62d98a" />
              <circle cx={lx(v)} cy={ly(0)} r="3.5" fill="#5da2ff" />
              <text x="30" y="266" fill="#f0b94b" fontSize="9">second price: flat above the rival, the truth is optimal</text>
              <text x="30" y="277" fill="#5da2ff" fontSize="9">first price: 0.8 − b, best just above 0.5, the truth earns 0</text>
              <text x="360" y="20" fill="#9aa5bd" fontSize="10">two-bidder revenue against the reserve r</text>
              <line x1="360" y1="236.5" x2="620" y2="236.5" stroke="#9aa5bd" strokeOpacity="0.5" />
              <line x1="360" y1="60" x2="360" y2="236" stroke="#9aa5bd" strokeOpacity="0.5" />
              <line x1={rx(0.5)} y1="60" x2={rx(0.5)} y2="236" stroke="#9aa5bd" strokeOpacity="0.4" strokeDasharray="3 3" />
              <polyline points={curve} fill="none" stroke="#f0b94b" strokeWidth="2.5" />
              {measured.map(([r, rev]) => (
                <circle key={r} cx={rx(r)} cy={ry(rev)} r="4" fill="#5da2ff" />
              ))}
              <circle cx={rx(0.5)} cy={ry(revenue(0.5))} r="5" fill="none" stroke="#62d98a" strokeWidth="2" />
              <text x={rx(0.5) - 16} y="250" fill="#62d98a" fontSize="9">r = 0.5</text>
              <text x="620" y="250" fill="#9aa5bd" fontSize="9" textAnchor="end">reserve</text>
              <text x="364" y={ry(1 / 3) + 12} fill="#9aa5bd" fontSize="9">1/3 at r = 0</text>
              <text x={rx(0.5) + 10} y={ry(revenue(0.5)) - 2} fill="#62d98a" fontSize="9">5/12 = 0.4167</text>
              <text x="360" y="266" fill="#f0b94b" fontSize="9">curve 1/3 + r² − 4r³/3; blue dots measured, 60,000 draws</text>
              <text x="360" y="277" fill="#9aa5bd" fontSize="9">unsold 24.7% at r = 0.5: revenue bought with efficiency</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'vickrey_auction_second_price_rule.py',
  Viz: VickreyViz,
  narration,
};
