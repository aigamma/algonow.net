import TimsortViz from '../viz/TimsortViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/timsort_galloping_threshold.py?raw';
import { narration } from './timsort-galloping-threshold.narration.js';

export const content = {
  given:
    "The sort that actually runs when you type sorted(): built on a heresy: real-world data is not random, so a real-world sort should hunt for the order already present.",
  task: 'Detect natural runs, keep a merge stack balanced by invariants, and when one side of a merge wins seven straight: stop plodding and gallop in doubling strides.',
  constraint:
    'The referee is sorted() itself: 500 arrays across seven data shapes, exact equality, with stability verified on 4,000 tagged records. Every dividend is a counted comparison: the run dividend at 9.7× on nearly-sorted data with exact parity (0.99×) on random; the gallop dividend isolated at 4.4× with the hysteresis tax at +1.2%.',

  origins: (
    <p>
      Tim Peters, <strong>2002</strong>, for CPython&apos;s list.sort:
      documented not in a journal but in{' '}
      <strong>listsort.txt</strong>, a file of benchmarks and
      design argument that ships inside Python to this day: with
      the galloping idea credited to McIlroy&apos;s 1993
      &quot;Optimistic Sorting.&quot; The bet: production data
      arrives partially sorted (logs by time, tables re-sorted by
      a second key), so detect the runs already present and merge
      them. Java adopted it for objects in 2009, Android
      followed, and V8 sorts JavaScript arrays with it: the 100th
      puzzle on this site is the sort that probably executed
      while you loaded the page. Its merge-stack invariant even
      had a formal-methods epilogue: a 2015 KeY verification
      found the original rule insufficient, fixing real JDK
      crashes: and 2018&apos;s Powersort refined the merge policy
      further.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>run machinery</strong>: scan for natural
      runs (a strictly descending run is reversed in place:
      stability is why <em>strictly</em>), extend short runs to
      minrun by binary insertion, and push onto a merge stack
      whose invariants (each run longer than the next two
      combined) keep the merge tree balanced: audited here at
      every one of 64 pushes. The referee is sorted() itself: 500
      arrays across seven shapes, equal: and stability exact on
      4,000 tagged records with 30 duplicate keys.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>gallop</strong>: during a merge, once
      one run supplies MIN_GALLOP = 7 elements in a row, stop
      comparing one-by-one: exponential search (1, 3, 7, 15…)
      finds the streak&apos;s end in O(log streak), then the
      whole block copies at once. Isolated here:{' '}
      <strong>4.4× fewer comparisons</strong> on block-interleaved
      data, same code, gallop off vs on: while the hysteresis
      keeps the random-data tax at <strong>+1.2%</strong>: and
      the dial is measured: an eager threshold of 1 pays +77.9%
      on random data. Seven is not folklore: it is a measured
      balance point.
    </p>
  ),

  picture: (
    <p>
      Merging two sorted piles of exam papers by hand. The
      plodding clerk compares the top papers, moves one, compares
      again: fine when the piles interleave, absurd when one pile
      holds all the A-through-M students: five hundred
      comparisons to move five hundred papers that were never
      going to lose. The galloping clerk notices seven wins in a
      row and changes question: not &quot;which paper is
      next?&quot; but &quot;<em>where does the other pile&apos;s
      top paper belong in this one?</em>&quot;: checks positions
      1, 3, 7, 15 ahead, brackets the answer, binary-searches the
      gap, and moves the whole wad. And when the piles start
      interleaving again, the streak counter resets and the clerk
      goes back to plodding: leaping costs a little when streaks
      are short, so the clerk demands seven wins of evidence
      before betting on an eighth.
    </p>
  ),

  steps: [
    <>
      <strong>Hunt runs:</strong> ascending kept, strictly
      descending reversed in place: the order already present is
      the head start.
    </>,
    <>
      <strong>Enforce minrun:</strong> short runs grow by binary
      insertion: merges stay near-balanced from below.
    </>,
    <>
      <strong>Stack with invariants:</strong> each run longer than
      the next two combined (audited every push): the merge tree
      stays logarithmic.
    </>,
    <>
      <strong>Gallop on streaks:</strong> seven straight wins
      triggers exponential search + block copy: measured 4.4× on
      streaky merges.
    </>,
    <>
      <strong>Back off by hysteresis:</strong> galloping that
      stops paying raises its own threshold: the random-data tax
      stays at +1.2%.
    </>,
  ],

  signals: [
    <>
      <strong>Data with history:</strong> logs by timestamp,
      tables re-sorted by a second column, appended batches: runs
      are everywhere production data lives.
    </>,
    <>
      <strong>Stability is load-bearing:</strong> sort by
      department, then by name, and equal keys must keep their
      order: the multi-key idiom every ORDER BY user relies on.
    </>,
    <>
      <strong>Adaptive beats worst-case thinking:</strong> pay
      O(n) when the data is kind, O(n log n) when it is not, and
      nothing extra for having checked: the engineering posture
      itself.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>bottom-up mergesort</strong>:
      run-blind, gallop-blind, n log n always: this page&apos;s
      counted rival: 514,838 comparisons on nearly-sorted 50,000
      where Timsort pays 52,884. On random data the two tie at
      0.99×: hunting for order that is not there costs nothing
      measurable: which is why the hunt is always on.
    </>
  ),

  strength: (
    <>
      <strong>The production sort, with every claim counted.</strong>{' '}
      500 arrays equal to sorted() across seven shapes; stability
      exact on tagged duplicates; the run dividend at 9.7× on
      nearly-sorted data with parity on random; the gallop
      dividend isolated at 4.4× with the hysteresis tax at +1.2%
      and the eager-threshold alternative measured at +77.9%; and
      the merge-stack invariants audited at every push. Adaptive,
      stable, and never worse than n log n: the reason three
      languages ship it.
    </>
  ),
  weakness: (
    <>
      <strong>Complexity is the price, and comparisons are the
      currency.</strong> Timsort is a system: run detection,
      minrun, stack invariants, galloping, hysteresis: and its
      subtlety is proven by history: the original stack invariant
      was formally shown insufficient in 2015 (real
      ArrayIndexOutOfBounds crashes in the JDK), and Powersort
      (2018) replaced the merge policy in CPython because the
      invariant rule can build measurably suboptimal merge
      trees. It also buys nothing on truly random data (parity,
      measured), needs O(n/2) merge buffer unlike in-place
      quicksort, and in comparison-cheap regimes (plain ints in
      arrays) cache-friendly quicksort variants or radix sorts
      win on constants: Python ships Timsort because Python
      comparisons are expensive, and the design follows the cost
      model.
    </>
  ),

  problem: 'Comparison sorting',
  problemSlug: 'comparison-sorting',
  rivals: [
    {
      name: 'Timsort × galloping',
      isThisUnit: true,
      algoName: 'Timsort',
      cost: 'O(n) to O(n log n)',
      wins: (
        <>
          <strong>Adaptive and stable</strong>: 9.7× on
          nearly-sorted, parity on random, streaks leapt at 4.4×:
          the production default in three languages.
        </>
      ),
      costs: (
        <>
          A system, not a loop: its own invariant needed formal
          verification to get right.
        </>
      ),
      when: 'Sorting anything with history or duplicate keys: which is production data.',
    },
    {
      name: 'Quicksort × pivots',
      algoName: 'Quicksort',
      cost: 'O(n log n), in place',
      wins: (
        <>
          The live unit: cache-friendly partitioning, no buffer,
          unbeatable constants on primitive arrays: why C and
          Java primitives sort this way.
        </>
      ),
      costs: (
        <>
          Unstable: equal keys shuffle: and blind to preexisting
          runs: the two properties Timsort exists to add.
        </>
      ),
      when: 'Primitive arrays where stability is moot and comparisons are one instruction.',
    },
    {
      name: 'Introsort × cutoffs',
      algoName: 'Introsort',
      cost: 'O(n log n) guaranteed',
      wins: (
        <>
          Quicksort with an escape hatch: recursion too deep
          switches to heapsort, small ranges to insertion sort:
          C++&apos;s std::sort: worst case tamed by cutover.
        </>
      ),
      costs: (
        <>
          Still unstable and run-blind: the guarantee is about
          adversaries, not about exploiting kindness.
        </>
      ),
      when: 'The systems-language default: primitives, no stability contract, adversarial inputs possible.',
    },
    {
      name: 'Natural mergesort',
      algoName: 'Natural mergesort',
      cost: 'O(n) to O(n log n)',
      wins: (
        <>
          Timsort&apos;s honest ancestor: detect runs, merge
          pairwise: adaptivity without minrun, stacks, or
          galloping: teachable in ten lines.
        </>
      ),
      costs: (
        <>
          Unbalanced merge trees on skewed run lengths and
          per-element merging on streaks: the gaps Timsort&apos;s
          two additions close.
        </>
      ),
      when: 'When you want the adaptive idea without the production machinery.',
    },
  ],
  neverUse: {
    name: 'Reimplementing the library sort',
    why: (
      <>
        The 100th puzzle&apos;s lesson points back at itself:
        this page reimplemented Timsort to <em>measure</em> it,
        and the exercise is the argument against doing so in
        production. The invariant subtlety is real (the
        original rule shipped for a decade in the JDK before
        formal verification found inputs that crash it); the
        stability contract is easy to break in one careless
        comparison (this page&apos;s gallop path needed a
        strict-inequality variant precisely for ties); and the
        library version carries twenty years of fixes yours will
        not. The general rule: reimplement to understand, never
        to deploy: sorted() is free, verified, and faster than
        your version, and the energy belongs in the layer above:
        choosing keys, exploiting stability, knowing when the
        data&apos;s shape makes the sort linear. That layer is
        what these hundred puzzles are for.
      </>
    ),
  },

  contest: {
    instance:
      'the sort that runs when you type sorted(); referee: sorted() itself on 500 arrays across seven shapes, stability checked on tagged records',
    columns: ['timsort', 'mergesort'],
    rows: [
      {
        method: 'Nearly sorted (n = 50,000)',
        values: ['52,884', '514,838'],
        verdict: 'the run dividend: 9.7× fewer comparisons where order preexists',
      },
      {
        method: 'Random (n = 50,000)',
        values: ['722,489', '733,308'],
        verdict: 'parity at 0.99×: hunting for order costs nothing when there is none',
      },
      {
        method: 'Block-interleaved (gallop)',
        isThisUnit: true,
        values: ['41,535', '183,999*'],
        best: 0,
        verdict: '*same code, gallop off: the leap is worth 4.4× on streaks',
      },
    ],
    source:
      'python solutions/timsort_galloping_threshold.py prints this table and asserts: 500 arrays across seven shapes equal to sorted(); stability exact on 4,000 tagged records with 30 duplicate keys (order of equal keys identical to sorted\'s); the run dividend above 8× on nearly-sorted 50,000 (measured 9.7×) with random parity inside 0.9-1.1 (measured 0.99); the gallop dividend above 2.5× on block-interleaved data (measured 4.4×) with the MIN_GALLOP=7 hysteresis tax under 5% on random (measured +1.2%) and the eager threshold-1 dial measurably worse (+77.9%); merge-stack invariants audited at every push; and every non-final run at least minrun after binary-insertion extension.',
  },

  figure: (
    <Figure
      id="fig-timsort-gallop"
      aspect="16 / 7"
      caption="Find the order, keep the order, leap the streaks. Natural runs are detected (descending ones reversed in place), grown to minrun, and merged under stack invariants that keep the tree balanced: 9.7× fewer comparisons than run-blind mergesort on nearly-sorted data, exact parity on random. Inside each merge, seven straight wins trigger the gallop: exponential probes at 1, 3, 7, 15 bracket the streak's end, binary search pins it, and the whole block moves at once: 4.4× on streaky merges, +1.2% tax on random, with the threshold's own dial measured (eager galloping pays +77.9%). The production sort of three languages, counted claim by claim."
      cite={{
        text: 'Tim Peters, listsort.txt (CPython, 2002): the design document that ships inside Python: galloping after McIlroy\'s "Optimistic Sorting" (1993); invariant formally repaired 2015; merge policy refined by Powersort 2018.',
        href: 'https://github.com/python/cpython/blob/main/Objects/listsort.txt',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="Runs detected in a bar array, a merge stack, and galloping probes leaping a winning streak">
        {[...Array(26)].map((_, i) => {
          const run = i < 9 ? 0 : i < 14 ? 1 : 2;
          const hs = [20 + i * 5, 150 - (i - 9) * 8, 40 + (i - 14) * 6];
          const cols = ['#5da2ff', '#e2606c', '#62d98a'];
          return <rect key={i} x={30 + i * 9} y={130 - hs[run]} width={7} height={hs[run]} fill={cols[run]} opacity="0.7" />;
        })}
        <text x="30" y="150" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">runs found: ascending · descending (flips) · ascending</text>
        <rect x="330" y="40" width="120" height="22" fill="rgba(93,162,255,0.2)" stroke="#5da2ff" strokeWidth="1.4" />
        <rect x="330" y="66" width="80" height="22" fill="rgba(240,185,75,0.2)" stroke="#f0b94b" strokeWidth="1.4" />
        <rect x="330" y="92" width="50" height="22" fill="rgba(98,217,138,0.2)" stroke="#62d98a" strokeWidth="1.4" />
        <text x="466" y="70" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">the stack: each run longer</text>
        <text x="466" y="84" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">than the next two (audited)</text>
        <line x1="30" y1="200" x2="610" y2="200" stroke="rgba(154,165,189,0.4)" strokeWidth="1.4" />
        {[1, 3, 7, 15].map((o, i) => (
          <path key={i} d={`M ${60 + (o - 1) * 8} 200 q ${o * 4} -26 ${o * 8} 0`} fill="none" stroke="#f0b94b" strokeWidth="1.8" />
        ))}
        <text x="30" y="224" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="10">the gallop: probes at 1, 3, 7, 15 bracket the streak, binary search pins it, the block moves whole</text>
        <text x="30" y="252" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">measured: nearly-sorted 52,884 vs 514,838 (9.7×) · random parity 0.99× · gallop 4.4× · hysteresis tax +1.2%</text>
        <text x="30" y="274" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">stability exact on 4,000 tagged records · 500 arrays equal to sorted() · the sort your page load already ran</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'timsort_galloping_threshold.py',
  Viz: TimsortViz,
  narration,
};
