import ReservoirViz from '../viz/ReservoirViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/reservoir_algorithm_r.py?raw';
import { narration } from './reservoir-algorithm-r.narration.js';

export const content = {
  given:
    'A stream of items, seen once each, whose length nobody knows and which may end at any moment.',
  task: 'Hold, at every instant, a uniform random sample of exactly k of the items seen so far.',
  constraint:
    'One pass, k memory, and the guarantee must hold at every prefix, not just at the end, because "the end" is not a concept the stream has promised you.',

  origins: (
    <p>
      Algorithm R is folklore made canon: Knuth&apos;s Art of Computer
      Programming (1969) presents it crediting <strong>Alan Waterman</strong>,
      and Jeffrey Vitter&apos;s 1985 paper &quot;Random Sampling with a
      Reservoir&quot; named the family and pushed it further; Kim-Hung
      Li&apos;s 1994 <strong>Algorithm L</strong> closed the story by drawing
      skip lengths directly, collapsing a million random draws to 3,879
      (measured below). The reservoir now sits wherever data outruns memory:
      stream processors, telemetry pipelines, database samplers, and the
      shuffle step of half the machine-learning world.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>contract</strong>: exactly k items in hand at all
      times, each newcomer&apos;s fate decided the moment it arrives, no
      revisiting, no lookahead. That discipline is what makes the sample{' '}
      <strong>anytime-valid</strong>: whenever the stream stops, what you
      hold is already a perfect uniform sample of everything that passed.
      The tested solution asserts the exact-k invariant at every step, and
      the wrong-contract rival below shows what its absence costs.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>admission rule</strong>: item number n enters
      with probability k/n, evicting a uniformly random resident. The proof
      is a two-line induction: the newcomer&apos;s chance is k/n by
      construction, and a resident&apos;s chance was k/(n−1), times
      surviving eviction (n−1)/n, which is k/n again. Everyone, always,
      exactly k/n. The tested solution does not sample-and-hope this: it
      walks Algorithm R&apos;s entire decision tree with{' '}
      <strong>exact rational arithmetic</strong> for every n ≤ 8 and
      confirms each inclusion probability equals k/n as a Fraction.
    </p>
  ),

  picture: (
    <p>
      A twelve-seat lifeboat beside an endless line of boarders. The rule
      when person number n arrives: roll an n-sided die; if it shows twelve
      or less, they board and a random seated passenger goes back in the
      water. Early boarders get on easily and are easily displaced; late
      arrivals barely ever board, but when they do, they displace someone
      who has been comfortable for ages. The arithmetic balances these
      forces so perfectly that at every single moment, every person who has
      ever walked past holds exactly the same claim on a seat: twelve over
      n. Nobody needs to know how long the line is. The line does not know
      either.
    </p>
  ),

  steps: [
    <>
      <strong>Fill:</strong> the first k items board unconditionally.
    </>,
    <>
      <strong>Roll:</strong> for item n &gt; k, draw a uniform j from
      0..n−1. One draw decides everything.
    </>,
    <>
      <strong>Admit or refuse:</strong> if j &lt; k, the newcomer replaces
      resident j (the draw doubles as the eviction choice); otherwise it is
      gone forever.
    </>,
    <>
      <strong>Answer anytime:</strong> at every prefix the k residents are
      an exactly uniform sample of everything seen. The stream may end
      whenever it likes.
    </>,
    <>
      <strong>Scale the draws away:</strong> Algorithm L draws the gap to
      the next admission directly: same distribution, 3,879 draws instead
      of 999,900 on a million items.
    </>,
  ],

  signals: [
    <>
      The length is <strong>unknown or unbounded</strong>: logs, sockets,
      table scans, anything you cannot ask for its size.
    </>,
    <>
      <strong>Exactly k</strong> matters: dashboards, evaluation sets,
      memory budgets: a Binomial &quot;about k&quot; is a different
      contract (72 to 124, measured).
    </>,
    <>
      The answer must be valid <strong>whenever asked</strong>: the anytime
      property is the product, not a bonus.
    </>,
  ],
  baseline: (
    <>
      The honest baseline stores everything and picks k winners at the
      end: 100 random draws, perfect uniformity, and{' '}
      <strong>one million items of memory</strong>, ten thousand times the
      reservoir&apos;s hundred, plus no answer at all until an end that may
      never come. The reservoir is what remains of it when memory and
      patience are both finite.
    </>
  ),

  strength: (
    <>
      <strong>Exactness three ways, in k memory.</strong> Exactly uniform
      (proven by rational enumeration, not simulation), exactly k at every
      step (asserted structurally), valid at every prefix, O(1) per item.
      And the family scales: Algorithm L keeps the distribution and drops
      the draws 258-fold.
    </>
  ),
  weakness: (
    <>
      <strong>Sequential, solitary, and unweighted.</strong> Plain R burns
      a draw per item (L exists for exactly this); a reservoir cannot
      merge with another reservoir, so sharded pipelines want bottom-k
      keys instead (the merge is proven exact below); and weighted or
      priority sampling needs different machinery (A-Res and friends).
    </>
  ),

  problem: 'Stream sampling',
  problemSlug: 'stream-sampling',
  rivals: [
    {
      name: 'Reservoir × Algorithm R',
      isThisUnit: true,
      algoName: 'Reservoir sampling',
      cost: 'O(1) per item · k memory',
      wins: (
        <>
          The full contract: exact k, exact uniformity (proven in
          Fractions), anytime validity, one decision per item.
        </>
      ),
      costs: (
        <>
          999,900 random draws on a million items, one per arrival, and no
          way to merge two reservoirs after the fact.
        </>
      ),
      when: 'The default streaming sample: unknown length, hard memory cap, answer on demand.',
    },
    {
      name: 'Reservoir × Algorithm L',
      algoName: 'Reservoir sampling',
      cost: 'O(k log(n/k)) draws',
      wins: (
        <>
          The same distribution from <strong>3,879</strong> draws instead
          of 999,900: it draws the skip to the next admission directly and
          fast-forwards.
        </>
      ),
      costs: (
        <>
          Logarithms and a touch of algebra per admission, and the skip
          arithmetic is easy to fumble: same family, sharper tool.
        </>
      ),
      when: 'High-throughput streams where the per-item random draw is the actual bottleneck.',
    },
    {
      name: 'Bottom-k sampling',
      cost: 'O(1) per item · k memory',
      wins: (
        <>
          Key every item with a uniform random number, keep the k smallest:
          same uniformity, and shard samples <strong>merge exactly</strong>{' '}
          (union, re-take the k smallest: proven byte-for-byte below). SQL
          spells it ORDER BY RANDOM() LIMIT k.
        </>
      ),
      costs: (
        <>
          A draw and a heap check per item, keys stored beside items, and
          coordinated key-hashing needed if shards must agree.
        </>
      ),
      when: 'Distributed pipelines: sample every shard independently, merge losslessly at the top.',
    },
  ],
  neverUse: {
    name: 'Systematic sampling: take every (n/k)-th item',
    why: (
      <>
        It feels random and costs nothing, and it is a phase-lock waiting
        for a period: on a stream with an 8-cycle pattern and a stride of
        10,000 (divisible by 8), every sampled item lands on the{' '}
        <strong>same phase</strong>: the sample&apos;s mean misses truth by
        3.50 while the reservoir misses by 0.14, measured. Real streams
        arrange divisibility constantly: hourly patterns sampled daily,
        batch cycles sampled per batch. Stride sampling is a fine
        <em> deterministic</em> tool; as a stand-in for randomness it is a
        resonance accident on a schedule.
      </>
    ),
  },

  contest: {
    instance:
      'one stream of n = 1,000,000 items, k = 100; the ledger per method: random draws consumed, peak memory in items, and whether the sample size is exactly k',
    columns: ['random draws', 'memory', 'exact k?'],
    rows: [
      {
        method: 'Reservoir × Algorithm R',
        isThisUnit: true,
        values: ['999,900', '100', 'yes'],
        verdict: 'one draw per arrival buys the whole anytime contract',
      },
      {
        method: 'Reservoir × Algorithm L',
        values: ['3,879', '100', 'yes'],
        best: 0,
        verdict: 'the same distribution, 258× fewer draws: skip, don’t flip',
      },
      {
        method: 'Bottom-k random keys',
        values: ['1,000,000', '100', 'yes'],
        verdict: 'a key per item, and the only one whose shards merge exactly',
      },
      {
        method: 'Store all, pick at end',
        values: ['100', '1,000,000', 'yes'],
        verdict: 'perfect and 10,000× the memory, with no answer until an end',
      },
      {
        method: 'Bernoulli, p = k/n',
        values: ['1,000,000', '~k', 'NO'],
        verdict: 'needs n in advance and delivers 72-to-124, not 100',
      },
    ],
    source:
      'python solutions/reservoir_algorithm_r.py prints this table and asserts uniformity EXACTLY (Algorithm R’s full decision tree walked with rational arithmetic for all n ≤ 8, k ≤ 3; bottom-k by complete permutation enumeration), 4σ statistical agreement for R and L at n = 100 over 30,000 trials, the draw ledger and Algorithm L’s bound, Bernoulli’s size spread over 400 runs, the exact shard merge for bottom-k, and the systematic phase-lock.',
  },

  figure: (
    <Figure
      id="fig-reservoir-induction"
      aspect="16 / 7"
      caption="The two-line induction, drawn. When item n arrives, it boards with probability k/n by construction. Any current resident held its seat with probability k/(n−1), and survives this round unless the newcomer boards AND the die names its seat: probability (k/n)·(1/k) = 1/n. So it keeps k/(n−1) · (n−1)/n = k/n. New and old land on the same number, at every n, forever: uniformity is not approached, it is maintained."
      cite={{
        text: 'Vitter, "Random Sampling with a Reservoir", ACM Transactions on Mathematical Software 11(1), 1985. Algorithm R is credited to Alan Waterman via Knuth, TAOCP volume 2, §3.4.2; the skip-ahead Algorithm L is Li, 1994.',
        href: 'https://doi.org/10.1145/3147.3165',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="A newcomer boards a k-seat reservoir with probability k over n while each resident survives with probability n minus one over n, both landing at k over n">
        <rect x="40" y="52" width="250" height="70" rx="10" fill="rgba(93,162,255,0.1)" stroke="#5da2ff" strokeWidth="1.4" />
        <text x="60" y="80" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="13">newcomer, item n</text>
        <text x="60" y="104" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="14">boards with  k / n</text>
        <rect x="350" y="52" width="250" height="70" rx="10" fill="rgba(240,185,75,0.1)" stroke="#f0b94b" strokeWidth="1.4" />
        <text x="370" y="76" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="13">any resident</text>
        <text x="370" y="96" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="13">held seat: k/(n−1)</text>
        <text x="370" y="114" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="13">survives: (n−1)/n</text>
        <line x1="165" y1="130" x2="285" y2="196" stroke="#62d98a" strokeWidth="1.6" />
        <line x1="475" y1="130" x2="355" y2="196" stroke="#62d98a" strokeWidth="1.6" />
        <rect x="235" y="196" width="170" height="52" rx="10" fill="rgba(98,217,138,0.12)" stroke="#62d98a" strokeWidth="1.8" />
        <text x="320" y="218" textAnchor="middle" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="15">both equal  k / n</text>
        <text x="320" y="238" textAnchor="middle" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">verified in exact Fractions for every n ≤ 8</text>
        <text x="40" y="276" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="12">the stream never needed a length, and the guarantee never needed an end</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'reservoir_algorithm_r.py',
  Viz: ReservoirViz,
  narration,
};
