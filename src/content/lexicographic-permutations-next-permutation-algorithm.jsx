import NextPermutationViz from '../viz/NextPermutationViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/lexicographic_permutations_next_permutation_algorithm.py?raw';
import { narration } from './lexicographic-permutations-next-permutation-algorithm.narration.js';

export const content = {
  given:
    'One arrangement of a sequence (letters, digits, the cities of a tour) and the need for the arrangement that follows it in dictionary order, then the next, until every arrangement has been visited exactly once, with nothing stored and no duplicates.',
  task: 'Lexicographic permutation generation. The algorithm: visit the arrangements in sorted order, so the enumeration has a first (sorted), a last (reverse sorted), and a rank for everything between. The heuristic is the next-permutation rule (Narayana Pandita 1356; Knuth TAOCP 4A, Algorithm L): scan from the right for the longest non-increasing suffix; the element before it is the pivot; swap the pivot with the rightmost suffix element larger than it; reverse the suffix. In place, two indices of extra memory, O(1) amortized work per step.',
  constraint:
    'Measured: the rule equals itertools.permutations (lexicographic from sorted input) for every n from 1 to 8, 40,320 arrangements at n = 8, each strictly greater than the one before; it lists every distinct arrangement of four multisets once, 34,650 for MISSISSIPPI, equal to the multinomial. Over the full enumeration at n = 9 (362,880 arrangements, 0.12 s) the scanned suffix averaged 1.718 elements, e − 1 to three decimals, with 3.08 comparisons and 1.54 swaps per step. Heap’s algorithm and Steinhaus-Johnson-Trotter each visit all 5,040 arrangements of 7 exactly once with 5,039 swaps (adjacent for Johnson-Trotter) but break sorted order 2,513 and 2,519 times; Algorithm L breaks it 0 times. Lehmer unranking returned the k-th sequential arrangement on 2,000 random k at n = 8 and ranking inverted it. The copying recursion moved 38.7 elements per arrangement at n = 8; the rule agreed with brute force on 300 next-bigger-number cases (52 with no answer). 12! = 479,001,600 would take about 3 minutes at the measured pace, 20! about 26,000 years.',

  origins: (
    <p>
      Narayana Pandita&apos;s Ganita Kaumudi (<strong>1356</strong>) gives the
      procedure for listing the arrangements of a set of digits in increasing
      order. Rediscovered repeatedly in the computing era, it is Algorithm L
      in Knuth&apos;s Art of Computer Programming, vol. 4A, 7.2.1.2, with the
      analysis that the scanned suffix has expected length e − 1 ≈ 1.72, so
      the amortized cost per step is constant. Sedgewick&apos;s 1977 survey of
      permutation generation methods set it beside the swap-based orders:
      Heap&apos;s single-swap method (1963) and the adjacent-transposition
      order of Johnson (1963) and Trotter (1962), both faster per step and
      both unsorted. The rule ships as <code>std::next_permutation</code> and
      answers the interview classic &quot;next bigger number with the same
      digits.&quot; Fisher-Yates (puzzle 46) draws one random arrangement
      instead of all of them.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>order</strong>: sorted output gives the census a first,
      a last, and a rank for every arrangement, so it can be resumed, split
      across workers, and checked against a reference. The referee is the
      standard library: equal sequences for n = 1 to 8 (40,320 at n = 8),
      every arrangement strictly greater than the last; 34,650 distinct
      arrangements of MISSISSIPPI, equal to the multinomial; and the Lehmer
      rank of the k-th output equal to k on 2,000 random draws.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>step</strong>: pivot, partner, swap, reverse. Measured
      over all 362,880 arrangements of nine in 0.12 s: suffix{' '}
      <strong>1.718 = e − 1</strong>, 3.08 comparisons, 1.54 swaps per step,
      two indices of extra memory. The rivals pay less per step and get
      less: Heap and Johnson-Trotter use one swap each but leave sorted
      order 2,513 and 2,519 times in 5,039 steps; Algorithm L, 0.
    </p>
  ),

  picture: (
    <p>
      An odometer whose digits are tiles that can be rearranged but never
      replaced. Rolling forward means finding the rightmost place where a
      tile is smaller than the one after it; everything to its right is
      already in its largest order, like the nines on a real odometer, so it
      cannot roll further. Put the smallest larger tile from the right in
      that place, then reverse the rest so it reads smallest-first, the way
      the nines roll back to zeros. When no such place exists the whole
      reading is descending: every arrangement has been shown.
    </p>
  ),

  steps: [
    <>
      <strong>Start sorted:</strong> the smallest arrangement is the sorted
      sequence.
    </>,
    <>
      <strong>Find the pivot:</strong> scan from the right while a[i] ≥
      a[i+1]; the first i that breaks the run is the pivot and a[i+1..] is a
      non-increasing suffix. If the scan passes the front, this was the last
      arrangement: reverse and stop.
    </>,
    <>
      <strong>Find the partner:</strong> the rightmost suffix element larger
      than a[i]; because the suffix is non-increasing it is the smallest
      element that can replace the pivot.
    </>,
    <>
      <strong>Swap</strong> pivot and partner (the suffix stays
      non-increasing), then <strong>reverse the suffix</strong> so it is
      increasing: the next arrangement in dictionary order.
    </>,
    <>
      <strong>Repeat:</strong> from the sorted start, every arrangement of the
      multiset exactly once; the rank of any arrangement is its Lehmer code.
    </>,
  ],

  signals: [
    <>
      <strong>Order matters, or the census must be resumable:</strong>{' '}
      sorted output and Lehmer ranks make the sequence addressable.
    </>,
    <>
      <strong>You cannot store the arrangements:</strong> two indices in
      place, where the copying recursion moved 38.7 elements per
      arrangement and held all 40,320.
    </>,
    <>
      <strong>You need only the next one:</strong> the next bigger number
      with the same digits is a single step, confirmed on 300 cases.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>Heap&apos;s algorithm</strong>: every
      arrangement exactly once at one swap each, the fewest moves possible,
      with no order to show for it (2,513 descents in 5,039 steps).
    </>
  ),

  strength: (
    <>
      <strong>Sorted, in place, constant amortized cost.</strong> Equal to the
      library for every n to 8 and to the multinomial on multisets; suffix
      1.718 = e − 1 and 1.54 swaps per step at n = 9; two indices of extra
      memory; one step answers the next-bigger-number question.
    </>
  ),
  weakness: (
    <>
      <strong>A factorial census with a non-minimal step.</strong> n = 9 in
      0.12 s but 12! in about 3 minutes and 20! in about 26,000 years; 1.54
      swaps where Heap uses 1; a single step can reverse the whole sequence,
      so the constant is an average.
    </>
  ),

  problem: 'Permutation generation',
  problemSlug: 'permutation-generation',
  rivals: [
    {
      name: 'Lexicographic permutations × Next-permutation algorithm',
      isThisUnit: true,
      algoName: 'Lexicographic permutations',
      cost: 'O(1) amortized per step, O(1) extra memory',
      wins: (
        <>
          <strong>Sorted order, 0 descents</strong>; equal to itertools for
          n ≤ 8; suffix 1.718 = e − 1; multisets handled by the same rule.
        </>
      ),
      costs: (
        <>
          1.54 swaps and 3.08 comparisons per step; one step may reverse the
          whole sequence.
        </>
      ),
      when: 'Arrangements in order, resumable or rankable, in place: the default.',
    },
    {
      name: 'Heap’s algorithm',
      algoName: "Heap's algorithm",
      cost: 'one swap per arrangement, O(n) counters',
      wins: (
        <>
          5,039 swaps for 5,040 arrangements of 7, each once: the fewest
          moves any method can make.
        </>
      ),
      costs: (
        <>
          Unsorted: 2,513 descents; a counter per position; no rank.
        </>
      ),
      when: 'Every arrangement must be visited and the order is irrelevant.',
    },
    {
      name: 'Steinhaus-Johnson-Trotter',
      algoName: 'Steinhaus-Johnson-Trotter',
      cost: 'one adjacent swap per arrangement, O(n) directions',
      wins: (
        <>
          Consecutive outputs differ by one neighboring exchange; 5,039
          adjacent swaps, each arrangement once.
        </>
      ),
      costs: (
        <>
          Unsorted: 2,519 descents; a direction per element; a scan for the
          largest mobile element each step.
        </>
      ),
      when: 'The change between consecutive arrangements must be minimal (displays, bell ringing).',
    },
    {
      name: 'Factorial number system × Lehmer code ranking',
      algoName: 'Factorial number system',
      cost: 'O(n²) per rank or unrank (O(n log n) with a Fenwick tree)',
      wins: (
        <>
          The k-th arrangement directly and the rank of any arrangement:
          equal to the sequential order on 2,000 random k.
        </>
      ),
      costs: (
        <>
          Quadratic per call; no cheap step to the neighbor.
        </>
      ),
      when: 'Jump into the middle, split the census across machines, or check a position.',
    },
  ],
  neverUse: {
    name: 'Regenerating the whole census to answer one next-arrangement question',
    why: (
      <>
        The brute force for the next bigger number with the same digits
        sorts every arrangement and takes the one after the current:{' '}
        <strong>40,320 strings for an eight-digit number</strong>, where the
        rule touches a suffix of about two elements. On 300 random digit
        strings the two agreed, including 52 with no answer (digits already
        descending). The copying recursion is the same mistake inside the
        enumeration: 38.7 elements copied per arrangement at n = 8 and every
        list held in memory, where the in-place rule holds one. When the
        question is about one arrangement, or the next, never pay for all of
        them.
      </>
    ),
  },

  contest: {
    instance:
      'all 5,040 arrangements of seven elements for the swap-based rivals, all 362,880 of nine for the per-step costs, 2,000 random ranks at n = 8, and 300 next-bigger-number queries; referees: itertools.permutations, the multinomial, exhaustive sets, and brute force',
    columns: ['output order', 'swaps per step', 'extra memory', 'random access'],
    rows: [
      {
        method: 'Algorithm L (next permutation)',
        isThisUnit: true,
        values: ['sorted, 0 descents', '1.54 (suffix 1.718)', 'two indices', 'via Lehmer rank/unrank'],
        best: 0,
        verdict: 'sorted and in place',
      },
      {
        method: 'Heap’s algorithm',
        values: ['2,513 descents of 5,039', '1', 'n counters', 'none'],
        best: 1,
        verdict: 'fewest moves, no order',
      },
      {
        method: 'Steinhaus-Johnson-Trotter',
        values: ['2,519 descents of 5,039', '1 (adjacent)', 'n directions', 'none'],
        verdict: 'minimal change, no order',
      },
      {
        method: 'Lehmer unrank for every k',
        values: ['sorted', 'O(n²) per arrangement', 'O(n)', 'direct: k-th in one call'],
        best: 3,
        verdict: 'addressable, costly per step',
      },
      {
        method: 'copying recursion',
        values: ['sorted', '38.7 elements copied', 'all 40,320 lists', 'none'],
        verdict: 'the negative example',
      },
    ],
    source:
      'python solutions/lexicographic_permutations_next_permutation_algorithm.py prints this table and asserts: the rule equal to itertools.permutations for n = 1 to 8 with each arrangement strictly greater than the last; every distinct arrangement of four multisets once, equal to the multinomial; mean suffix within 0.01 of e − 1 at n = 8 and 9 and swaps per step between 1.50 and 1.60; Heap and Johnson-Trotter visiting all 5,040 arrangements once with one swap per step (adjacent for Johnson-Trotter); unrank(k) equal to the k-th output and rank(unrank(k)) = k on 2,000 draws; the copying recursion producing the same set; and 300 next-bigger-number answers equal to brute force.',
  },

  figure: (
    <Figure
      id="fig-next-permutation"
      aspect="16 / 7"
      caption="Left: one step of Algorithm L on 1 2 5 4 3. The suffix 5 4 3 is non-increasing, so the pivot is 2; its partner, the rightmost suffix element larger than 2, is 3; swapping gives 1 3 5 4 2 and reversing the suffix gives 1 3 2 4 5, the next arrangement in dictionary order. Right: measured per-step costs over all 362,880 arrangements of nine (suffix 1.718 = e − 1, comparisons 3.08, swaps 1.54) and the descents in 5,039 steps at n = 7 for the three enumerations."
      cite={{
        text: 'D. E. Knuth, The Art of Computer Programming, vol. 4A, section 7.2.1.2, Algorithm L. Narayana Pandita, Ganita Kaumudi, 1356. R. Sedgewick, "Permutation generation methods," ACM Computing Surveys 9(2), 1977.',
        href: 'https://doi.org/10.1145/356689.356692',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="One next-permutation step shown as three rows of tiles with the pivot, partner, and reversed suffix marked, beside bars of the measured per-step costs and the descents of three enumeration orders">
        {(() => {
          const rows = [
            ['1 2 5 4 3', 'pivot 2, suffix 5 4 3', [1], [2, 3, 4]],
            ['1 3 5 4 2', 'swap pivot with partner 3', [1, 4], [2, 3, 4]],
            ['1 3 2 4 5', 'reverse the suffix: next', [], [2, 3, 4]],
          ];
          const x0 = 20;
          const tw = 34;
          const costs = [['suffix', 1.718, '#5da2ff'], ['cmps', 3.077, '#9aa5bd'], ['swaps', 1.543, '#f0b94b']];
          const desc = [['L', 0, '#62d98a'], ['Heap', 2513, '#e2606c'], ['J-T', 2519, '#e2606c']];
          return (
            <g>
              <text x={x0} y="22" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">one step of Algorithm L</text>
              {rows.map(([tiles, label, amber, blue], r) => (
                <g key={label}>
                  {tiles.split(' ').map((t, k) => (
                    <g key={k}>
                      <rect x={x0 + k * (tw + 6)} y={40 + r * 66} width={tw} height={34} fill={amber.includes(k) ? '#f0b94b' : blue.includes(k) ? '#5da2ff' : '#9aa5bd'} fillOpacity={amber.includes(k) ? 0.95 : blue.includes(k) ? 0.6 : 0.3} />
                      <text x={x0 + k * (tw + 6) + 11} y={64 + r * 66} fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="16">{t}</text>
                    </g>
                  ))}
                  <text x={x0} y={88 + r * 66} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">{label}</text>
                </g>
              ))}
              <text x={x0} y="252" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="10">amber: pivot and partner; blue: the suffix</text>
              <text x={x0} y="268" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">in place, two indices, sorted order kept</text>
              <text x="330" y="22" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">per step at n = 9 (362,880 arrangements)</text>
              {costs.map(([name, v, c], i) => (
                <g key={name}>
                  <rect x={330 + i * 50} y={120 - v * 28} width="36" height={v * 28} fill={c} fillOpacity="0.85" />
                  <text x={330 + i * 50} y={116 - v * 28} fill={c} fontFamily="ui-monospace, monospace" fontSize="9">{v.toFixed(3)}</text>
                  <text x={330 + i * 50} y="132" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">{name}</text>
                </g>
              ))}
              <text x="330" y="166" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">descents in 5,039 steps at n = 7</text>
              {desc.map(([name, v, c], i) => (
                <g key={name}>
                  <rect x={330 + i * 50} y={250 - (v / 2600) * 70} width="36" height={Math.max(1, (v / 2600) * 70)} fill={c} fillOpacity="0.85" />
                  <text x={330 + i * 50} y={246 - (v / 2600) * 70} fill={c} fontFamily="ui-monospace, monospace" fontSize="9">{v.toLocaleString()}</text>
                  <text x={330 + i * 50} y="264" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">{name}</text>
                </g>
              ))}
              <text x="490" y="190" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="10">L: 0 descents,</text>
              <text x="490" y="204" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="10">sorted census</text>
              <text x="490" y="226" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="10">one swap each,</text>
              <text x="490" y="240" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="10">no order</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'lexicographic_permutations_next_permutation_algorithm.py',
  Viz: NextPermutationViz,
  narration,
};
