import FisherYatesViz from '../viz/FisherYatesViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/fisher_yates_uniform_swaps.py?raw';
import { narration } from './fisher-yates-uniform-swaps.narration.js';

export const content = {
  given:
    'An array of n items and a source of random numbers.',
  task: 'A uniformly random permutation: all n! orderings equally likely: in place, in one pass.',
  constraint:
    'Uniformity is a testable claim, and this page tests it exactly: all 24 permutations of 4 items counted over 240,000 shuffles: and convicts the most famous shuffle bug in software with the same instrument, matching the bug to its own enumerated theory cell by cell.',

  origins: (
    <p>
      Fisher and Yates published the procedure in <strong>1938</strong>{' '}
      for statisticians working <em>by hand</em> with printed tables of
      random digits; Durstenfeld&apos;s 1964 CACM algorithm made it the
      in-place O(n) sweep, and Knuth&apos;s Algorithm P made that
      canonical. Its most instructive moment came in{' '}
      <strong>1999</strong>: an online poker site published its shuffle
      for transparency, and researchers showed the 32-bit seed could
      reach only a vanishing sliver of 52! orderings: real money, lost
      to arithmetic this page runs directly. The modern clients are
      everywhere: ML data loaders, A/B assignment, music players
      (whose users famously rejected true uniformity as
      &quot;not random enough&quot;).
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>in-place sweep</strong>: walk i from the last
      position down to 1, swap position i with a randomly chosen
      position, lock it, continue. One pass, zero extra memory, n−1
      swaps: the shape is so simple that every wrong shuffle in the
      wild is this same loop with one detail changed.
    </p>
  ),
  heurRole: (
    <p>
      Supplies <strong>the range</strong>: j uniform in [0, i]: the
      unlocked prefix <em>including i itself</em>. That single bound is
      the entire theorem: position i receives each remaining item with
      equal probability and never moves again, so the decision tree has
      exactly n! equally likely leaves: one per permutation. Measured:
      χ² = 35.3 on 23 degrees of freedom, every cell within noise of
      its 10,000. Widen the range to [0, n−1] and n^n paths must land
      on n! outcomes, which do not divide: bias up to{' '}
      <strong>41%</strong>, measured and enumerated.
    </p>
  ),

  picture: (
    <p>
      Dealing seats at a table, last seat first. The correct dealer
      says: seat n is open to <em>everyone still standing</em>: pick one
      at random, seat them, never revisit. Everyone standing had equal
      claim, so every seating chart is equally likely. The buggy dealer
      lets each pick disturb people <em>already seated</em>: it feels
      more random: more shuffling!: but re-seating the seated is
      exactly what breaks the count: 256 ways to deal 4 seats cannot
      spread evenly over 24 charts. More stirring, less uniform.
    </p>
  ),

  steps: [
    <>
      <strong>i = n−1:</strong> draw j uniform in [0, i]: the unlocked
      range, including i.
    </>,
    <>
      <strong>Swap</strong> a[i] ↔ a[j]: position i is now final:
      locked forever.
    </>,
    <>
      <strong>Decrement and repeat</strong> down to i = 1: n−1 draws,
      n−1 swaps, done.
    </>,
    <>
      <strong>Mind the randomness source:</strong> the permutation
      space must fit in the seed space: 16-bit seeds reached 64,940 of
      10!&apos;s 3.6M orderings, measured.
    </>,
    <>
      <strong>Test, don&apos;t vibe:</strong> count permutation cells
      against expectation: the χ² that certified this page&apos;s
      shuffle convicted both impostors.
    </>,
  ],

  signals: [
    <>
      <strong>The order itself is the product:</strong> deals, draws,
      trial randomization, data-loader epochs: anywhere bias becomes
      unfairness or leakage.
    </>,
    <>
      <strong>In-place and linear matter:</strong> shuffling millions of
      rows wants n swaps, not n log n comparisons and a key per row.
    </>,
    <>
      <strong>Auditability:</strong> the uniformity claim is exactly
      testable (this page&apos;s cell counts are the audit): rare among
      randomized code.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>sort by a random float key</strong>
      : measured uniform here (χ² = 37.3): it works, at O(n log n) plus
      a float per row, and it is one shrunken key space away from
      disaster: with 4-valued keys the stable sort leaks the original
      order and the identity permutation arrives{' '}
      <strong>+228%</strong> overrepresented. The one-pass swap has no
      such cliff.
    </>
  ),

  strength: (
    <>
      <strong>Exactly uniform, provably and testably, at the machine
      minimum.</strong> n−1 swaps, zero allocation, and the theorem is
      one sentence (each seat filled uniformly from the remaining).
      The page&apos;s certificate: 24 cells within 4.5σ of 10,000 and
      χ² = 35.3: with the same instrument convicting swap-anywhere
      (7,166) and the tiny-key sort (108,808).
    </>
  ),
  weakness: (
    <>
      <strong>Uniform only as far as the entropy goes, and only over
      full orderings.</strong> The seed-space ceiling is real and
      measured (1.79% of 10! reachable from 16 bits; 2³² is dust
      against 52!): a perfect algorithm over a weak PRNG is a weak
      shuffle. Sampling k of n wants the reservoir cousin (a live
      unit); provable shuffling for elections wants verifiable mixes;
      and humans will tell you true uniform &quot;repeats too
      much&quot;: that complaint is about their model, not your code.
    </>
  ),

  problem: 'Shuffling and permutation',
  problemSlug: 'shuffling',
  rivals: [
    {
      name: 'Fisher-Yates × backward uniform swaps',
      isThisUnit: true,
      algoName: 'Fisher-Yates shuffle',
      cost: 'O(n), in place',
      wins: (
        <>
          <strong>χ² = 35.3</strong> over 24 cells: uniform to the
          test&apos;s teeth, at n−1 swaps and zero memory: the correct
          default in every standard library.
        </>
      ),
      costs: (
        <>
          Uniform only up to the PRNG&apos;s entropy (the measured seed
          ceiling), and off-by-one edits silently create the impostor.
        </>
      ),
      when: 'Any full shuffle: deals, epochs, randomized trials: this is the tool, full stop.',
    },
    {
      name: 'Reservoir sampling × Algorithm R',
      algoName: 'Reservoir sampling',
      cost: 'O(n) streaming',
      wins: (
        <>
          The streaming sibling: a uniform k-of-n sample from a stream
          of unknown length: the same replace-with-shrinking-probability
          idea, one item at a time.
        </>
      ),
      costs: (
        <>
          Samples, does not order: and its own unit (live here) prices
          its traps.
        </>
      ),
      when: 'k of n from a stream you cannot hold: the sibling question with its own live page.',
    },
    {
      name: 'Lexicographic permutations × next-permutation',
      algoName: 'Lexicographic permutations',
      cost: 'O(n) per step, all n!',
      wins: (
        <>
          The <em>enumerator</em>: every ordering exactly once, in
          order: what this page&apos;s own referee used to walk the
          impostor&apos;s 256 paths.
        </>
      ),
      costs: (
        <>
          Generates all n!: sampling one uniformly from it via
          &quot;generate and index&quot; costs what a swap loop gets
          free.
        </>
      ),
      when: 'Exhaustive search over orderings, ranking/unranking: a different question wearing the same noun.',
    },
    {
      name: 'Verifiable shuffle × Neff proof',
      algoName: 'Verifiable shuffle',
      cost: 'O(n) + zero-knowledge proof',
      wins: (
        <>
          Shuffling where the shuffler is <em>distrusted</em>: mixnets
          and election systems prove the output is a permutation of the
          input without revealing which.
        </>
      ),
      costs: (
        <>
          Cryptographic machinery three orders heavier than a swap
          loop.
        </>
      ),
      when: 'Ballots and mixnets: when “trust me, I shuffled” is not an acceptable sentence.',
    },
  ],
  neverUse: {
    name: 'Swap-anywhere: the off-by-one impostor',
    why: (
      <>
        Change j&apos;s range from [0, i] to [0, n−1]: one character:
        and the shuffle is broken in a way no eyeball catches: n^n
        equally likely paths cannot land evenly on n! outcomes because
        24 does not divide 256. This page <em>enumerated</em> all 256
        paths, predicted every cell of the bias exactly, and confirmed
        the prediction at 5σ over 240,000 trials: worst cell{' '}
        <strong>41%</strong> off uniform, χ² = 7,166 where honest noise
        reads 23. It has shipped in real card games and real lotteries.
        The defense is the test on this page, run once, in CI.
      </>
    ),
  },

  contest: {
    instance:
      'n = 4: all 24 permutation cells counted over 240,000 shuffles per method (expected 10,000 per cell); referees: 4.5σ cell bounds, χ² against 23 degrees of freedom, and exact enumeration of each biased variant’s own theory',
    columns: ['χ² (23 dof)', 'worst cell'],
    rows: [
      {
        method: 'Fisher-Yates [0, i]',
        isThisUnit: true,
        values: ['35.3', 'within noise'],
        best: 0,
        verdict: 'uniform to the test’s teeth: the certificate',
      },
      {
        method: 'Swap-anywhere [0, n−1]',
        values: ['7,166.4', '41% off'],
        verdict: 'the impostor: predicted exactly by its 256-path enumeration',
      },
      {
        method: 'Sort by random float',
        values: ['37.3', 'within noise'],
        verdict: 'works, at n log n plus a key per row',
      },
      {
        method: 'Sort by 4-valued key',
        values: ['108,807.7', 'identity +228%'],
        verdict: 'stable-sort leak: small key spaces resurrect the input order',
      },
    ],
    source:
      'python solutions/fisher_yates_uniform_swaps.py prints this table and asserts: every Fisher-Yates cell within 4.5σ of 10,000 and χ² < 60; the swap-anywhere bias matched cell-by-cell to its exact 256-path enumeration at 5σ, with worst relative deviation > 10% (measured 41%); the float-key sort passing the same χ² gate; the 4-valued-key sort matching its own enumerated leak (identity +228%); the seed ceiling measured (16-bit seeds reach 64,940 of 3,628,800 orderings of 10 items, 1.79%); and 2³² < 52! as the poker-site arithmetic.',
  },

  figure: (
    <Figure
      id="fig-fy-ranges"
      aspect="16 / 7"
      caption="One character of difference. Left: j drawn from the unlocked prefix [0, i]: the decision tree has n·(n−1)·…·2 = n! equally likely leaves, one per permutation: uniform by counting. Right: j drawn from all of [0, n−1]: the tree has nⁿ leaves, and nⁿ/n! is not an integer: some permutations must receive more leaves than others. The bias is not a tendency: it is arithmetic, enumerated here to the cell."
      cite={{
        text: 'Fisher & Yates, Statistical Tables, 1938; Durstenfeld, CACM Algorithm 235, 1964; Knuth TAOCP vol. 2, Algorithm P. The seed-space exploit analysis is Arkin et al., 1999 (Planet Poker).',
        href: 'https://doi.org/10.1145/364520.364540',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="Two decision trees: the uniform n-factorial tree and the biased n-to-the-n tree">
        <text x="40" y="30" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="12">j ∈ [0, i]: shrinking range</text>
        <text x="40" y="56" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="13">4 × 3 × 2 = 24 leaves</text>
        <text x="40" y="78" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">= 4! permutations, once each</text>
        <text x="40" y="112" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="12">measured: χ² = 35.3 (23 dof)</text>
        <line x1="320" y1="20" x2="320" y2="250" stroke="#232c40" />
        <text x="352" y="30" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="12">j ∈ [0, n−1]: full range</text>
        <text x="352" y="56" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="13">4 × 4 × 4 × 4 = 256 leaves</text>
        <text x="352" y="78" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">256 / 24 = 10.67: not an integer</text>
        <text x="352" y="100" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">some permutations get 10 leaves, some 15</text>
        <text x="352" y="134" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="12">measured: χ² = 7,166 · worst cell 41% off</text>
        <text x="40" y="180" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="12">the entropy ceiling: seeds bound reachable orderings</text>
        <text x="40" y="204" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">16-bit seeds → 64,940 of 3,628,800 ten-item orderings (1.79%), measured</text>
        <text x="40" y="226" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">2³² ≪ 52! ≈ 8×10⁶⁷: no 32-bit seed deals most poker decks: ever</text>
        <text x="40" y="266" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="12">uniformity = counting + entropy: this page measured both</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'fisher_yates_uniform_swaps.py',
  Viz: FisherYatesViz,
  narration,
};
