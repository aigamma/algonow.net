import SecretaryViz from '../viz/SecretaryViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/secretary_one_over_e.py?raw';
import { narration } from './secretary-one-over-e.narration.js';

export const content = {
  given:
    'Fifty candidates in random order, one interview each, hire on the spot or lose them forever, and only hiring the single best counts. You see only relative ranks: is this one better than everyone so far?',
  task: 'Spend the first n/e interviews hiring nobody: they calibrate the bar. Then hire the first candidate who beats everyone seen. That balance point between learning and opportunity is the whole heuristic.',
  constraint:
    'The referee is exact rational arithmetic: P(success) computed as a Fraction for every cutoff at n = 20 and 50, the peak found at r* = 19 with P = 0.3743, and only then is Monte Carlo allowed to agree (within 4σ at every gridpoint, 100,000 trials). The race lands at 2.0% / 35.4% / 37.1% / 100%; the 37% holds at n = 5,000; and the rule’s own limits are measured: a value objective loses 0.793 to 0.964, and cardinal information beats the rank-only wall 45.5% to 37.1%.',

  origins: (
    <p>
      The problem arrived as a puzzle and left as a field. Martin
      Gardner&apos;s February <strong>1960</strong> Scientific
      American column posed the &quot;game of googol&quot;;
      Lindley gave the first rigorous solution in 1961, Dynkin
      another in 1963, and the definitive detective story is
      Ferguson&apos;s 1989 &quot;Who Solved the Secretary
      Problem?&quot;: which traces the folklore back through
      Cayley (1875) to Kepler&apos;s methodical 1613 search for
      a second wife (eleven candidates, two years, real
      no-recall regret). The answer&apos;s strange beauty:
      observe n/e, then take the first record: succeeds with
      probability 1/e no matter how large n grows, and it seeded
      optimal-stopping theory: Gilbert and Mosteller&apos;s
      full-information variant (1966), prophet inequalities for
      auctions, Bruss&apos;s odds algorithm: and one famous 37%
      rule in the popular imagination.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>observe-then-leap scan</strong>: a single
      pass, no recall, remembering one number (the best seen).
      Positions 1..r-1 set the bar; from r onward the first
      candidate above the bar is hired, and if none appears the
      search fails (the risk is real and priced into the exact
      curve). The referee is unusual for this site: no
      simulation needed to know the truth: P(r) = ((r-1)/n) ·
      Σ 1/(i-1) evaluated in exact rational arithmetic for every
      cutoff, peak at r* = 19 for n = 50 with P = 3743/10000
      (to four places): Monte Carlo&apos;s 100,000 trials then
      matched that curve within 4σ everywhere they were compared.
    </p>
  ),
  heurRole: (
    <p>
      Supplies <strong>where to stop looking</strong>: the
      cutoff. Too early (hire the first): no information, 2.0%.
      Too late (observe half): the bar is superb but half the
      field: often the best candidate: was spent calibrating it,
      35.4%. The balance point sits at n/e ≈ 37% of the field:
      37.1% measured, 0.3743 exact: and the curve is{' '}
      <strong>flat-topped and forgiving</strong>: overshooting
      to n/2 costs only two points. Strangest of all, the
      optimum is scale-invariant: 37.1% at n = 50 and 37.2% at
      n = 5,000, measured on fresh streams. More candidates make
      the best harder to find and the calibration better at
      exactly compensating rates.
    </p>
  ),

  picture: (
    <p>
      Apartment hunting in a hot market. Every viewing is
      take-it-now-or-lose-it, you cannot revisit, and you will
      kick yourself unless you get <em>the</em> best one. The
      doomed strategies are the two obvious ones. Grab the first
      decent place: you had no idea what decent meant yet.
      Keep looking &quot;to be sure&quot;: by the time you are
      sure, the best place is behind you: rented. The rule
      splits the search into two jobs. The first 37% of viewings
      are <em>reconnaissance</em>: you are not shopping, you are
      learning the market, and walking away is the point. Then
      the criterion flips to a hair trigger: the very next place
      better than everything in the reconnaissance, sign
      immediately. You will still miss sometimes: the best
      apartment may sit in your reconnaissance window: but no
      rank-only strategy does better, and the mathematics says
      37% of the time you walk away with the best place in the
      city, whether the city has fifty listings or five thousand.
    </p>
  ),

  steps: [
    <>
      <strong>Observe n/e, hire nobody:</strong> the calibration
      sample: its maximum becomes the bar.
    </>,
    <>
      <strong>Leap at the first record:</strong> from position r
      onward, the first candidate above the bar is hired on the
      spot.
    </>,
    <>
      <strong>Accept the miss:</strong> if the best sat in the
      sample, no one clears the bar: the failure mode is priced
      into the exact 0.3743.
    </>,
    <>
      <strong>Trust the invariance:</strong> 37.1% at fifty
      candidates, 37.2% at five thousand: the rule never asks
      what n is beyond placing the cutoff.
    </>,
    <>
      <strong>Check the objective first:</strong> best-or-bust
      with rank-only information is the contract: this
      page measures what happens outside it.
    </>,
  ],

  signals: [
    <>
      <strong>No recall, one shot:</strong> offers expire the
      moment you pass: hiring with exploding offers, hot housing,
      sequential auctions with departing bidders.
    </>,
    <>
      <strong>Only comparisons are trustworthy:</strong> you can
      rank candidates against each other but have no calibrated
      score or known distribution: the rank-only model is the
      honest one.
    </>,
    <>
      <strong>Only the best will do:</strong> the payoff is
      best-or-bust (a record, a flagship hire, a proof), not
      &quot;pretty good&quot;: the objective the 1/e rule is
      actually optimal for.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>hire-the-first</strong> (or
      any fixed position): 2.0% measured, exactly the 1/n of
      picking blind: information-free search. The clairvoyant
      bound is 100%. Between them, every rank-only strategy is a
      cutoff curve, and the exact rationals locate its peak:
      37.4% is all the information in relative ranks will ever
      buy: the rest of the gap to 100% is not cleverness, it is
      information you do not have.
    </>
  ),

  strength: (
    <>
      <strong>Provably optimal for its game, and the proof is on
      the page.</strong> The success curve is computed in exact
      rational arithmetic for every cutoff: no sampling error in
      the referee: peaking at r* = 19, P = 0.3743, with Monte
      Carlo agreeing within 4σ at every compared gridpoint. The
      strategy race on identical streams lands 2.0% / 35.4% /
      37.1% / 100%, the scale invariance holds from n = 50 to n
      = 5,000, and the curve&apos;s flat top makes the rule
      robust to a misplaced cutoff: a rare luxury in optimal
      anything.
    </>
  ),
  weakness: (
    <>
      <strong>Optimal inside a narrow contract, and this page
      measured every wall of it.</strong> Change the objective to
      expected value and backward-induction thresholds earn
      0.964 to the rule&apos;s 0.793: chasing only the best
      forfeits every excellent-but-second option. Change the
      information to observable scores from a known distribution
      and even that value-optimizing rule catches the best 45.5%
      of the time: the 37% is an <em>information</em> bound, not
      a cleverness bound (the full-information optimum is ~58%,
      Gilbert-Mosteller). Real searches also bend the model:
      candidates refuse offers, arrival order is not uniform,
      and interviews cost money. The rule is a beautiful exact
      answer: to precisely the question it asks.
    </>
  ),

  problem: 'Optimal stopping',
  problemSlug: 'optimal-stopping',
  rivals: [
    {
      name: 'Secretary × 1/e rule',
      isThisUnit: true,
      algoName: 'Secretary problem',
      cost: 'one pass, one number',
      wins: (
        <>
          <strong>Optimal for best-or-bust on ranks</strong>:
          0.3743 exact at n = 50, scale-invariant, flat-topped:
          the cleanest result in online decision-making.
        </>
      ),
      costs: (
        <>
          Fails 63% of the time by design, and steps outside its
          rank-only, best-only contract at measured cost.
        </>
      ),
      when: 'One irreversible choice, comparisons only, and only the best counts.',
    },
    {
      name: 'Prophet inequality',
      cost: 'one threshold, known F',
      wins: (
        <>
          When value distributions are known: a single threshold
          (half the prophet&apos;s expected max) guarantees ≥ 50%
          of clairvoyant value: the workhorse bound behind
          posted-price auctions.
        </>
      ),
      costs: (
        <>
          Needs the distributions; guarantees expectation, not
          P(best); loose when arrivals are few.
        </>
      ),
      when: 'Pricing and ad allocation with distributional knowledge: value, not trophies.',
    },
    {
      name: 'Ski rental',
      cost: 'competitive ratio 2',
      wins: (
        <>
          The other online classic: rent until the rentals equal
          the buy price, then buy: never pay more than twice
          the offline optimum, whatever the future does.
        </>
      ),
      costs: (
        <>
          A worst-case guarantee only: no distribution used, no
          optimality when you do know the odds.
        </>
      ),
      when: 'Rent-or-buy shapes: caching, spinning down disks, lease-or-purchase.',
    },
    {
      name: 'Backward induction',
      cost: 'O(n) thresholds',
      wins: (
        <>
          The value-objective winner on this page: thresholds
          from E = (1 + E²)/2 earned 0.964 of a possible ~0.980:
          dynamic programming pricing every continuation.
        </>
      ),
      costs: (
        <>
          Needs the distribution and the horizon; solves
          expected value, not best-or-bust glory.
        </>
      ),
      when: 'Observable scores, known odds, and "excellent" beats "the best or nothing."',
    },
  ],
  neverUse: {
    name: 'The 37% rule outside its own game',
    why: (
      <>
        The rule is famous enough to be misapplied, and this page
        priced the two classic misapplications. Using it when the
        payoff is <em>value</em> (a salary negotiated, a price
        obtained): 0.793 expected value against backward
        induction&apos;s 0.964: seventeen points of value
        forfeited to chase a trophy the objective never asked
        for. Using it when scores are <em>observable</em> with a
        known distribution: the rank-only wall of 37.1% sits far
        below what the extra information buys (45.5% for a rule
        not even optimizing P(best); ~58% at the
        full-information optimum). The first draft of this
        page&apos;s own solution asserted that wall backwards,
        and the measurement corrected the author: which is
        the lesson itself. Before reaching for the elegant
        famous rule, ask two questions: what is the payoff, and
        what can I actually observe? The 37% rule is the exact
        answer to one precise pair: and only that pair.
      </>
    ),
  },

  contest: {
    instance:
      'hire once, no recall, n = 50 candidates in random order; success = hiring THE best; 50,000 identical streams per strategy; exact-rational curve as the referee',
    columns: ['P(hired the best)'],
    rows: [
      {
        method: 'Hire the first',
        values: ['2.0%'],
        verdict: 'no information used: exactly 1/n',
      },
      {
        method: 'Observe n/2, then first record',
        values: ['35.4%'],
        verdict: 'over-observing: half the field spent calibrating: yet only 2 points off (the curve is flat-topped)',
      },
      {
        method: 'Observe n/e, then first record',
        isThisUnit: true,
        values: ['37.1%'],
        best: 0,
        verdict: 'the 1/e rule: the exact optimum P(r* = 19) = 0.3743, and it never moves with n',
      },
      {
        method: 'Clairvoyant',
        values: ['100.0%'],
        verdict: 'the bound: the remaining gap is information, not cleverness',
      },
    ],
    source:
      'python solutions/secretary_one_over_e.py prints this table and asserts: the full cutoff curve computed in exact rational arithmetic at n = 20 and 50, unimodal, peaking at r* = 19 with P = 0.3743 > 1/e; Monte Carlo within 4σ of the exact value at every compared cutoff over 100,000 trials; scale invariance (37.1% at n = 50, 37.2% at n = 5,000); the race ordering first < half < 1/e < clairvoyant; the value objective won by backward-induction thresholds 0.964 to 0.793; and the information wall measured: cardinal values catch the best 45.5% of the time against the rank-only optimum’s 37.1%.',
  },

  figure: (
    <Figure
      id="fig-secretary-curve"
      aspect="16 / 7"
      caption="Learning versus opportunity, solved exactly. Observe the first n/e candidates to calibrate a bar, then hire the first to clear it: the success curve (computed here in exact rational arithmetic, no sampling) peaks at r* = 19 of 50 with P = 0.3743, stays flat enough to forgive a misplaced cutoff, and holds its 37% from n = 50 to n = 5,000. The walls are measured too: value objectives want backward induction (0.964 vs 0.793), and observable scores pierce the rank-only bound (45.5% vs 37.1%): the famous number is an information bound."
      cite={{
        text: 'T. S. Ferguson, "Who Solved the Secretary Problem?", Statistical Science 4(3), 1989. DOI 10.1214/ss/1177012493. Gardner 1960; Lindley 1961; Dynkin 1963; full-information variant: Gilbert-Mosteller 1966.',
        href: 'https://doi.org/10.1214/ss/1177012493',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="The exact success-probability curve over cutoff positions, peaking at n over e, with the strategy race and the information wall">
        <line x1="60" y1="220" x2="600" y2="220" stroke="rgba(154,165,189,0.5)" strokeWidth="1.2" />
        <line x1="60" y1="220" x2="60" y2="40" stroke="rgba(154,165,189,0.5)" strokeWidth="1.2" />
        <path d="M 60 216 C 120 130, 160 84, 230 76 C 270 72, 300 76, 340 86 C 420 108, 520 170, 600 214" fill="none" stroke="#5da2ff" strokeWidth="2" />
        <line x1="230" y1="220" x2="230" y2="76" stroke="#f0b94b" strokeWidth="1.4" strokeDasharray="4 3" />
        <text x="205" y="238" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">r* ≈ n/e</text>
        <circle cx="230" cy="76" r="4" fill="#f0b94b" />
        <text x="244" y="70" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="11">P = 0.3743 (exact rationals)</text>
        <line x1="60" y1="106" x2="600" y2="106" stroke="rgba(98,217,138,0.55)" strokeWidth="1.2" strokeDasharray="6 4" />
        <text x="380" y="100" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="10">45.5%: cardinal values pierce the rank-only wall</text>
        <text x="66" y="56" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">P(success)</text>
        <text x="560" y="238" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">cutoff r</text>
        <text x="60" y="262" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">race on identical streams: first 2.0% · half 35.4% · n/e 37.1% · clairvoyant 100% · flat top: n/2 costs only 2 points</text>
        <text x="60" y="282" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">scale-invariant: 37.1% at n = 50, 37.2% at n = 5,000 · value objective: backward induction 0.964 vs 0.793</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'secretary_one_over_e.py',
  Viz: SecretaryViz,
  narration,
};
