import QuicksortViz from '../viz/QuicksortViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/quicksort_median_of_three.py?raw';
import { narration } from './quicksort-median-of-three.narration.js';

export const content = {
  given:
    'An array of n keys that can only be compared pairwise: no digits, no buckets, just less-than.',
  task: 'Rearrange it, in place, into nondecreasing order.',
  constraint:
    'In place means the array itself plus O(log n) bookkeeping. No second array; the memory you were handed is the memory you get.',

  origins: (
    <p>
      Tony Hoare invented quicksort in 1960, at twenty-six, as an exchange
      student at Moscow State University: he needed to sort Russian words
      before looking them up on a machine-translation dictionary tape. He
      could not implement it until he learned a language with recursion, and
      published it in <strong>1961-62</strong> once ALGOL 60 existed to hold
      it. The pivot went through decades of refinement: Robert Singleton
      proposed sampling first, middle, and last in <strong>1969</strong>,
      Robert Sedgewick&apos;s 1978 analysis made median-of-three the standard
      recipe, David Musser&apos;s 1997 introsort bolted on the worst-case
      escape hatch, and in 1999 Doug McIlroy published the adversary that
      shows why the escape hatch earns its keep.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>scheme</strong>: pick a pivot, sweep once to move
      everything smaller to its left and everything larger to its right, and
      the pivot lands in its final position forever. Recurse on the two
      sides. Correctness never depends on which pivot you picked; the sweep
      is one forward pass through contiguous memory, which is why the scheme
      is fast in a way comparison counts do not even show.
    </p>
  ),
  heurRole: (
    <p>
      Decides the <strong>shape</strong> of the recursion. A median-ish pivot
      halves the range and the work is n log n; a near-minimum pivot peels
      one element per level and the work is n²/2. Median-of-three samples
      the <strong>first, middle, and last</strong> keys and pivots on their
      median: two or three comparisons of insurance per partition that kill
      the classic cliffs (sorted, reverse-sorted, organ-pipe) and shave the
      average, because a sampled pivot splits closer to the middle than a
      blind one. Random pivots and the ninther are the same idea at
      different premiums.
    </p>
  ),

  picture: (
    <p>
      A moving crew sorting boxes by weight picks one reference box, then
      walks the row once: lighter boxes go left of it, heavier go right, and
      the reference box is now exactly where it will sit in the finished
      row. The whole game is which box you grab as the reference. Grab the
      first one off a truck that arrived already almost ordered and it is
      the lightest box in the row: everything lands on one side, and you
      have accomplished one box&apos;s worth of progress for a full walk.
      Weigh three boxes (front, middle, back) and take the middle one, and
      the row splits nearly in half every time. Three cheap weighings buy a
      balanced day.
    </p>
  ),

  steps: [
    <>
      <strong>Sample</strong> the first, middle, and last keys of the range;
      let the pivot be their median. Park it at the end of the range.
    </>,
    <>
      <strong>Sweep</strong> j across the range with a boundary i: every key
      smaller than the pivot swaps down to the boundary, which then advances.
    </>,
    <>
      <strong>Place</strong> the pivot at the boundary. It is now in its
      final sorted position and never moves again.
    </>,
    <>
      <strong>Recurse</strong> on the left part and the right part. An
      explicit stack works as well as recursion and survives bad splits.
    </>,
    <>
      <strong>Stop</strong> when ranges reach size one. Every element became
      a pivot or a singleton, so the array is sorted in place.
    </>,
  ],

  signals: [
    <>
      <strong>Memory is the constraint</strong>: you need to sort inside the
      array you were handed, not beside it.
    </>,
    <>
      <strong>Average speed outranks a guarantee</strong>: no adversary
      chooses your input, and no hard latency promise rides on one sort.
    </>,
    <>
      Keys live in <strong>contiguous memory</strong>: the partition sweep is
      one forward pass, which is where quicksort&apos;s wall-clock fame
      actually comes from.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the same algorithm with the naive heuristic:
      pivot on the first element. On shuffled keys the two are
      indistinguishable, <strong>23,937 against 24,303</strong> comparisons
      on 2,048 keys. Hand the naive rule an <strong>already-sorted</strong>{' '}
      array and it detonates: <strong>2,096,128</strong> comparisons, n²/2
      exactly, against median-of-three&apos;s <strong>20,493</strong>. A
      hundred-fold cliff on the most ordinary input in production: data that
      is already mostly in order.
    </>
  ),

  strength: (
    <>
      <strong>In place and cache-straight.</strong> The sweep touches memory
      forward and sequentially, the pivot retires to its final home every
      pass, and nothing needs a second array. That is why, at equal or even
      slightly worse comparison counts, quicksort is the fastest practical
      sort on real hardware and the skeleton inside most standard libraries.
    </>
  ),
  weakness: (
    <>
      <strong>The ghost is defended, not exorcised.</strong> Median-of-three
      kills the natural cliffs, but a true adversary walks around it:
      McIlroy&apos;s killer drives it to <strong>1,050,624</strong>{' '}
      comparisons on the same 2,048 keys (measured below). And equal keys
      lose their order: quicksort is unstable, pinned by a concrete case in
      the tested solution.
    </>
  ),

  problem: 'Comparison sorting',
  problemSlug: 'comparison-sorting',
  rivals: [
    {
      name: 'Quicksort × median-of-three',
      isThisUnit: true,
      algoName: 'Quicksort',
      cost: 'O(n log n) expected',
      wins: (
        <>
          In place, one forward sweep per partition, and the sorted-input
          cliff is gone: <strong>20,493</strong> comparisons where the naive
          pivot needs 2,096,128.
        </>
      ),
      costs: (
        <>
          Still quadratic against a true adversary (<strong>1,050,624</strong>{' '}
          measured), and equal keys come out reordered.
        </>
      ),
      when: 'The default for in-memory arrays when no adversary and no stability promise exist.',
    },
    {
      name: 'Mergesort',
      cost: 'O(n log n) guaranteed',
      wins: (
        <>
          The fewest comparisons on the board (<strong>19,955</strong>{' '}
          shuffled, 11,264 sorted), a hard n log n bound, and stability:
          equal keys keep their order.
        </>
      ),
      costs: (
        <>
          A whole second array. The copying traffic is real, and in tight
          memory it is simply disqualified.
        </>
      ),
      when: 'Stability is promised, memory is plentiful, or the data lives on disk or in linked structure.',
    },
    {
      name: 'Heapsort',
      cost: 'O(n log n) guaranteed',
      wins: (
        <>
          In place <strong>and</strong> bounded: <strong>38,071</strong>{' '}
          comparisons even against the adversary, with zero extra memory.
          Nothing on this bench is harder to hurt.
        </>
      ),
      costs: (
        <>
          Roughly twice the comparisons everywhere (38,714 shuffled), and
          the sift pattern jumps around memory, so its constant factor is
          the worst of the three classics.
        </>
      ),
      when: 'Hard worst-case bounds in place: kernels, embedded targets, latency ceilings.',
    },
    {
      name: 'Timsort',
      cost: 'O(n log n), O(n) on runs',
      wins: (
        <>
          Finds the order already present: <strong>2,047</strong> comparisons
          on sorted input, one look per adjacent pair. Real data is full of
          runs, which is why Python and the JVM ship it.
        </>
      ),
      costs: (
        <>
          A merge sort at heart: extra memory, a galloping machinery of
          thresholds, and on truly shuffled keys no advantage (19,841).
        </>
      ),
      when: 'General-purpose library sorting of real-world data, where partial order is the norm.',
    },
    {
      name: 'Introsort',
      cost: 'O(n log n) guaranteed',
      wins: (
        <>
          Identical to this unit until trouble: same 24,303 and 20,493, then
          the depth cutoff hands the adversary&apos;s range to heapsort and
          caps the damage at <strong>81,685</strong>, a 13× rescue.
        </>
      ),
      costs: (
        <>
          Everything quicksort costs plus a depth counter and a second code
          path; still unstable.
        </>
      ),
      when: 'A standard library: quicksort speed with a signed worst-case guarantee. This is what C++ std::sort is.',
    },
  ],
  neverUse: {
    name: 'Radix sort, when all you have is less-than',
    why: (
      <>
        It does not compare, it <strong>spreads</strong>: keys go into
        buckets digit by digit. Hand it opaque keys and a comparator, the
        contract this puzzle states, and it cannot take the first step;
        there are no digits to spread by. Where keys do expose fixed-width
        digits (millions of 32-bit integers), the situation inverts and it
        beats everything on this bench by refusing to compare at all. Wrong
        contract, wrong tool; right contract, unbeatable.
      </>
    ),
  },

  contest: {
    instance:
      '2,048 distinct keys, work in comparisons, on three inputs: a seeded shuffle, the already-sorted array, and McIlroy’s killer adversary, which answers every comparison as unhelpfully as consistency allows',
    columns: ['shuffled', 'sorted', 'adversarial'],
    rows: [
      {
        method: 'Quicksort × median-of-three',
        isThisUnit: true,
        values: ['24,303', '20,493', '1,050,624'],
        best: 1,
        verdict: 'the cliffs are gone; the true adversary still lands',
      },
      {
        method: 'Quicksort × first element',
        values: ['23,937', '2,096,128', '2,096,128'],
        verdict: 'fine on chaos, funeral on order: n²/2 exactly',
      },
      {
        method: 'Mergesort',
        values: ['19,955', '11,264', '20,481'],
        best: 0,
        verdict: 'fewest comparisons on the board, paid with a second array',
      },
      {
        method: 'Heapsort',
        values: ['38,714', '40,204', '38,071'],
        best: 2,
        verdict: 'twice the work, zero extra memory, immune to every column',
      },
      {
        method: 'Timsort',
        values: ['19,841', '2,047', '2,047'],
        best: 1,
        verdict: 'reads the order already present: n − 1 looks when sorted',
      },
      {
        method: 'Introsort',
        values: ['24,303', '20,493', '81,685'],
        best: 2,
        verdict: 'this unit until depth runs out, then heapsort: the rescue',
      },
    ],
    source:
      'python solutions/quicksort_median_of_three.py prints this table and asserts all six methods agree with sorted() on 206 cases, that mergesort and Timsort keep equal keys in order while quicksort provably does not, that the naive pivot goes quadratic on sorted input while median-of-three stays n log n, and that the killer beats both quicksorts while the depth cutoff rescues introsort.',
  },

  figure: (
    <Figure
      id="fig-quicksort-shape"
      aspect="16 / 7"
      caption="The pivot does not decide whether quicksort is correct; it decides the shape of the recursion. Median-ish pivots produce the left shape: log n levels, n work per level. A near-minimum pivot produces the right shape: each partition retires one element, n levels deep, n²/2 total. Median-of-three spends three comparisons per partition to buy the left shape on the inputs production actually serves: sorted, reversed, and nearly ordered data."
      cite={{
        text: 'Hoare, "Quicksort", The Computer Journal 5(1), 1962. Median-of-three sampling is Singleton, CACM Algorithm 347, 1969, analyzed in Sedgewick, CACM 21(10), 1978; the adversary is McIlroy, "A Killer Adversary for Quicksort", Software: Practice and Experience 29(4), 1999.',
        href: 'https://doi.org/10.1093/comjnl/5.1.10',
      }}
    >
      <svg viewBox="0 0 640 300" role="img" aria-label="A balanced recursion tree of depth log n beside a degenerate staircase of depth n">
        <text x="24" y="28" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="12">median splits · depth log n · n log n work</text>
        <line x1="160" y1="48" x2="88" y2="98" stroke="#2b5fa8" strokeWidth="1.5" />
        <line x1="160" y1="48" x2="232" y2="98" stroke="#2b5fa8" strokeWidth="1.5" />
        <line x1="88" y1="98" x2="52" y2="148" stroke="#2b5fa8" strokeWidth="1.5" />
        <line x1="88" y1="98" x2="124" y2="148" stroke="#2b5fa8" strokeWidth="1.5" />
        <line x1="232" y1="98" x2="196" y2="148" stroke="#2b5fa8" strokeWidth="1.5" />
        <line x1="232" y1="98" x2="268" y2="148" stroke="#2b5fa8" strokeWidth="1.5" />
        {[[160, 48], [88, 98], [232, 98], [52, 148], [124, 148], [196, 148], [268, 148]].map(([x, y], i) => (
          <circle key={`b${i}`} cx={x} cy={y} r={12 - (i > 0 ? (i > 2 ? 4 : 2) : 0)} fill="#5da2ff" opacity={0.9} />
        ))}
        {[36, 68, 100, 132, 180, 212, 244, 276].map((x, i) => (
          <circle key={`l${i}`} cx={x} cy={192} r={4} fill="#5da2ff" opacity={0.5} />
        ))}
        <text x="24" y="236" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="12">every level does n work · log n levels</text>
        <text x="24" y="254" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="12">three sampled keys per split buy this shape</text>

        <text x="384" y="28" fill="#e06767" fontFamily="ui-monospace, monospace" fontSize="12">near-minimum pivot · depth n · n²/2 work</text>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <g key={`s${i}`}>
            <circle cx={392 + i * 30} cy={52 + i * 30} r={10 - i} fill="#e06767" opacity={0.85} />
            <line x1={392 + i * 30} y1={52 + i * 30} x2={392 + (i + 1) * 30} y2={52 + (i + 1) * 30} stroke="#e06767" strokeWidth="1.4" opacity={0.6} />
          </g>
        ))}
        <text x="404" y="66" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">one element retired,</text>
        <text x="404" y="80" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">a full sweep paid</text>
        <text x="384" y="286" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="12">sorted input hands the first-element rule this shape</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'quicksort_median_of_three.py',
  Viz: QuicksortViz,
  narration,
};
