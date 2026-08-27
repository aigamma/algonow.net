import SetCoverViz from '../viz/SetCoverViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/greedy_set_cover_max_coverage.py?raw';
import { narration } from './greedy-set-cover-max-coverage.narration.js';

export const content = {
  given:
    'A universe of needs and a catalog of sets that each cover some of them: tests covering code branches, sensors covering rooms, crews covering routes.',
  task: 'Cover everything with the fewest sets: NP-hard exactly, and yet one greedy rule carries a provable guarantee nobody can essentially beat.',
  constraint:
    "Brute-force subset search in size order supplies certified optima on all 300 instances; Chvátal's H(d) bound is checked instance by instance (never violated, worst measured 1.50×); the classic trap family is run for k = 2..9 (greedy k picks vs OPT's 2); and the (1 − 1/e) coverage guarantee is verified against every budget-b brute optimum on 200 instances.",

  origins: (
    <p>
      Set cover sits at the origin of approximation algorithms.
      Johnson (1974) and Lovász (1975) analyzed the greedy rule for
      the unweighted problem; <strong>Chvátal (1979)</strong>{' '}
      settled the weighted case in three pages: greedy is within
      H(d) = 1 + ½ + … + 1/d of optimal, where d is the largest
      set&apos;s size. Two decades later the story closed from the
      other side: Feige (1998) proved that (1 − o(1))·ln n is the
      best any polynomial algorithm can do unless P = NP: the
      humble argmax is <em>essentially unbeatable</em>. The same
      marginal-gain rule, analyzed through submodularity
      (Nemhauser-Wolsey-Fisher 1978), gives the (1 − 1/e) coverage
      guarantee that powers sensor placement and influence
      maximization today.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>loop and the ledger</strong>: track the
      covered mask, re-score every set by how many{' '}
      <em>still-uncovered</em> elements it would add, take the
      argmax, repeat until the universe is gone. Sets are bitmasks,
      a gain is a popcount, and the client&apos;s whole run cost
      253 gain evaluations. Termination and validity are checked
      (every greedy answer re-verified as a cover), and against
      certified optima greedy was <strong>exactly optimal on 85%</strong>{' '}
      of instances, mean ratio 1.039.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>selection rule</strong>: maximum
      marginal coverage, the purest submodular instinct: buy the
      set that helps most <em>right now</em>. Its power is the
      theorem pair measured here: never worse than H(d)·OPT
      (checked on all 300 instances), and never below (1 − 1/e) of
      the best possible coverage for any fixed budget (worst
      measured 88.9% against a 63.2% floor). Its blindness is also
      measured: the doubling-block family baits the argmax k times
      in a row while two sets sat there covering everything:
      greedy 9 picks vs OPT 2 at n = 1,022: <strong>ln n is a real
      place</strong>, not an inequality.
    </p>
  ),

  picture: (
    <p>
      Stocking a toolbox for a job list. The greedy foreman
      repeatedly grabs the tool that knocks out the most remaining
      jobs: the multitool first, obviously. Usually that ends
      brilliantly: 85% of the time on this page, literally
      optimally. But watch the trap: two specialist kits would
      finish the whole list between them, yet at every visit some
      flashy gadget clears just over half of what&apos;s left:
      more than either kit&apos;s <em>remaining</em> share: so the
      foreman buys gadget after gadget, five purchases where two
      sufficed. The rule only ever sees the current shelf against
      the current list: it cannot see that two purchases{' '}
      <em>together</em> would end everything: and that myopia,
      priced exactly, is the logarithm.
    </p>
  ),

  steps: [
    <>
      <strong>Score:</strong> each set&apos;s gain = its
      still-uncovered elements (a mask AND and a popcount).
    </>,
    <>
      <strong>Take the argmax,</strong> mark its elements covered,
      and rescore: gains only ever shrink (submodularity, watched
      in the viz: 12 → 7 → 4 → 1).
    </>,
    <>
      <strong>Stop at full coverage:</strong> validity re-checked;
      the answer is a cover or the instance was uncoverable.
    </>,
    <>
      <strong>Trust the ceiling:</strong> ≤ H(d) · OPT, verified
      instance-by-instance: and Feige says no polynomial rule does
      essentially better.
    </>,
    <>
      <strong>Budgeted? Same rule:</strong> b picks of max marginal
      gain reach ≥ (1 − 1/e) of the best possible b-set coverage:
      checked against 200 brute optima.
    </>,
  ],

  signals: [
    <>
      <strong>Coverage-shaped demands:</strong> test-suite
      minimization, sensor and facility placement, crew
      scheduling, feature selection: a universe, a catalog,
      pay-per-set.
    </>,
    <>
      <strong>Diminishing returns hold:</strong> a set helps less
      as others are chosen: that submodularity is exactly what the
      argmax exploits and the (1 − 1/e) bound needs.
    </>,
    <>
      <strong>A guarantee beats a gamble:</strong> when NP-hard
      exactness is off the table, an H(d) ceiling checked in
      milliseconds beats an unbounded metaheuristic wander.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>brute-force subset search</strong>{' '}
      in size order: exact, certified, and this page&apos;s referee
      on 300 instances: at 2ⁿ forever, hopeless past a couple dozen
      sets. The live <strong>branch and bound</strong> unit is its
      disciplined descendant: same exactness, pruned tree: the
      right call when instances are small or structured and the
      answer must be optimal.
    </>
  ),

  strength: (
    <>
      <strong>Both theorems run, not cited.</strong> 300 instances
      with certified optima: worst ratio 1.50× inside H(d) every
      time, mean 1.039, exactly optimal on 85%; the log(n) trap
      family executed for k = 2..9 with greedy taking exactly k
      baits; the (1 − 1/e) floor holding on all 200 budgeted
      instances (worst 88.9%, mean 99.2%); and the test-suite
      client priced against its certified optimum (11 vs 10) in
      253 gain evaluations.
    </>
  ),
  weakness: (
    <>
      <strong>Myopia with a certificate.</strong> The argmax sees
      only the current shelf: the trap family shows it paying
      log(n) while the optimum sits in plain sight, and Feige&apos;s
      theorem says this is not greedy&apos;s flaw but the
      problem&apos;s: no polynomial method essentially beats ln n.
      Weighted costs need the gain-per-dollar variant (Chvátal&apos;s
      actual theorem); overlapping-forbidden problems (exact
      cover) break the model entirely; and when instances are
      small, running greedy instead of an exact search trades a
      certified optimum for speed nobody needed.
    </>
  ),

  problem: 'Set cover',
  problemSlug: 'set-cover',
  rivals: [
    {
      name: 'Greedy × max coverage',
      isThisUnit: true,
      algoName: 'Greedy set cover',
      cost: 'O(picks · sets)',
      wins: (
        <>
          <strong>H(d)·OPT proven and measured</strong>: optimal on
          85% of instances, 1.039 mean: and essentially unbeatable
          by Feige.
        </>
      ),
      costs: (
        <>
          Myopic by design: the doubling trap extracts the full
          logarithm on demand.
        </>
      ),
      when: 'The default for any coverage problem too big for exact search: which is nearly all of them.',
    },
    {
      name: 'LP rounding × randomization',
      algoName: 'LP rounding set cover',
      cost: 'one LP + rounding',
      wins: (
        <>
          The other O(log n) road: relax to fractional cover, solve
          the LP (the live simplex unit&apos;s job), round
          probabilistically: extends to weights, capacities, and
          side constraints greedy cannot express.
        </>
      ),
      costs: (
        <>
          An LP solve per instance and randomized guarantees:
          machinery for structure, not speed.
        </>
      ),
      when: 'When the covering problem grows side constraints: budgets, capacities, fairness: and the LP absorbs them.',
    },
    {
      name: 'Branch and bound',
      algoName: 'Branch and bound',
      cost: 'exponential, pruned',
      wins: (
        <>
          The live unit: exact optima with certificates: this
          page&apos;s referee wore its simplest costume (size-order
          subset search).
        </>
      ),
      costs: (
        <>
          Worst-case exponential: the option exists only while
          instances stay small or structure prunes hard.
        </>
      ),
      when: 'Small or structured instances where the answer must be optimal, not approximately optimal.',
    },
    {
      name: 'Greedy vertex cover × matching',
      algoName: 'Greedy vertex cover',
      cost: 'O(m), factor 2',
      wins: (
        <>
          The constant-factor cousin: take both endpoints of a
          maximal matching: factor 2, no logarithm: because vertex
          cover&apos;s structure is kinder than set cover&apos;s.
        </>
      ),
      costs: (
        <>
          Only for its own problem: the lesson is that the
          approximation factor lives in the problem, not the
          greed.
        </>
      ),
      when: 'Vertex-cover-shaped instances: recognize the special case and collect the constant factor.',
    },
  ],
  neverUse: {
    name: 'Greedy coverage where EXACT cover was asked',
    why: (
      <>
        Exact cover (Sudoku, pentominoes, the live Algorithm X
        territory) demands sets that partition the universe: every
        element covered <em>exactly once</em>, overlaps forbidden.
        Greedy set cover&apos;s entire engine is overlap-tolerant
        maximization: it will cheerfully return overlapping sets,
        and no post-processing rescues a partition from a pile of
        overlaps: the constraint is combinatorial, not a detail.
        This is the quiet cousin of the site&apos;s recurring
        mismatch lesson: the two problems share a noun and a
        universe and differ in one word: at most once vs exactly
        once: and that word moves the problem from
        greedy-approximable to needs-backtracking (dancing links,
        DPLL-style search). Read the constraint before reaching
        for the argmax.
      </>
    ),
  },

  contest: {
    instance:
      'cover the universe with the fewest sets; referee: brute-force subset search in size order, certified optima on all 300 instances',
    columns: ['picks', 'nature'],
    rows: [
      {
        method: 'Brute optimum',
        values: ['OPT', 'exact'],
        verdict: 'the referee: certified, and 2ⁿ forever',
      },
      {
        method: 'Greedy max-coverage',
        isThisUnit: true,
        values: ['≤ H(d)·OPT', 'proven'],
        best: 0,
        verdict: 'worst measured 1.50×, mean 1.039×, exactly optimal on 85%',
      },
      {
        method: 'The trap family',
        values: ['k vs 2', 'measured'],
        verdict: 'greedy 9 picks vs OPT 2 at n = 1,022: ln n is a real place',
      },
    ],
    source:
      "python solutions/greedy_set_cover_max_coverage.py prints this table and asserts: all 300 greedy answers are valid covers within Chvátal's H(d) bound instance-by-instance (worst 1.50×, mean 1.039×, exactly optimal 85%); the tight family run for k = 2..9 with greedy taking exactly k block-baits while the two rows (verified covering) sit as OPT = 2; the (1 − 1/e) maximum-coverage guarantee holding against every budget-b brute optimum on 200 instances (worst 88.9%, mean 99.2%); and the 48-branch test-suite client priced against its certified optimum (greedy 11 vs OPT 10, 1.10×) in 253 gain evaluations.",
  },

  figure: (
    <Figure
      id="fig-setcover-trap"
      aspect="16 / 7"
      caption="The trap that prices myopia. Two rows cover the whole 2×(2ᵏ−1) universe: OPT = 2. But the widest column block covers 2ᵏ elements while each row's remaining share is 2ᵏ−1: the argmax takes the bait: and after it does, the next block out-bids the rows again, all the way down. Greedy pays k picks for a 2-pick universe: measured here for k = 2..9, reaching 4.5× at n = 1,022. Feige's theorem turns the trap into a boundary: no polynomial algorithm essentially beats ln n, so the humble argmax, H(d)-certified on all 300 refereed instances, is about as good as this problem allows anyone to be."
      cite={{
        text: 'Chvátal, "A Greedy Heuristic for the Set-Covering Problem", Mathematics of Operations Research 4(3), 1979: the H(d) guarantee in three pages. Feige (1998) closed the gap from the other side.',
        href: 'https://doi.org/10.1287/moor.4.3.233',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="A two-row universe with doubling column blocks: greedy takes the blocks, the optimum is the two rows">
        {[0, 1].map((r) => (
          <rect key={r} x={40} y={50 + r * 40} width={480} height={32} fill="none" stroke="#5da2ff" strokeWidth="2" />
        ))}
        <text x="530" y="76" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="11">OPT: the</text>
        <text x="530" y="92" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="11">two rows</text>
        {[[40, 248, '1st: 32'], [292, 124, '2nd: 16'], [420, 62, '3rd: 8'], [486, 31, '4th'], [520, 16, '5th']].map(([x, w, label], i) => (
          <g key={i}>
            <rect x={x} y={48} width={w} height={76} fill="rgba(240,185,75,0.3)" stroke="#f0b94b" strokeWidth="1.6" />
            <text x={x + 3} y={144} fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="10">{label}</text>
          </g>
        ))}
        <text x="40" y="180" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">each block covers one more than either row's remainder: the argmax takes the bait, k times</text>
        <text x="40" y="212" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">measured: greedy k picks vs OPT 2 for k = 2..9 (4.5× at n = 1,022) · yet H(d)-certified on all 300 random instances</text>
        <text x="40" y="236" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">and exactly optimal on 85% of them: the trap is real, and rare</text>
        <text x="40" y="268" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">budgeted coverage: greedy ≥ (1−1/e) of every brute best-b optimum: worst 88.9%, mean 99.2% of 200</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'greedy_set_cover_max_coverage.py',
  Viz: SetCoverViz,
  narration,
};
