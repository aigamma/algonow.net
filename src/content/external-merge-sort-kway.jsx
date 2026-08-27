import ExtSortViz from '../viz/ExtSortViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/external_merge_sort_kway.py?raw';
import { narration } from './external-merge-sort-kway.narration.js';

export const content = {
  given:
    'A million records, memory for four thousand: every ORDER BY, index build, and dedup a database runs when the table dwarfs RAM.',
  task: 'Sort data 252 times larger than memory: form sorted runs, then merge k of them at a time: the pass count is 1 + ⌈log_k(runs)⌉, and the logarithm\'s base is your memory.',
  constraint:
    'The referee is sorted() itself: exact equality on all 200 instances, duplicates included. Every page of simulated I/O is counted, and the pass formula is asserted exactly per instance: the client reads its million records precisely three times (49,152 page reads = 3 × 16,384, checked to the page).',

  origins: (
    <p>
      External sorting is as old as computing on tapes: Knuth&apos;s
      Volume 3 devotes a hundred pages to merge patterns designed
      for drives you had to rewind: and it never went away, because
      data kept outgrowing memory faster than memory grew. Goetz
      Graefe&apos;s <strong>2006</strong> Computing Surveys article
      is the modern canon: run formation, k-way merging,
      replacement selection, and the engineering that makes ORDER
      BY work in every serious database. The{' '}
      <strong>snowplow</strong> analysis (Knuth, after E. F. Moore):
      replacement selection&apos;s runs average <em>twice</em> the
      memory on random input: is measured on this page at 1.99×,
      with both edge cases landing exactly where the theory puts
      them.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>two phases and the ledger</strong>. Phase
      one: read a memory&apos;s worth, sort it, write it back as a
      run: 253 runs from the million-record client. Phase two:
      merge until one run remains, each pass reading and writing
      every page exactly once: counted, not estimated:{' '}
      <strong>49,152 page reads = 3 passes × 16,384 pages</strong>,
      to the page. Output equality with sorted() is asserted on
      every one of 200 instances including all-duplicate, sorted,
      and reversed inputs.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>width of the funnel</strong>: with M
      pages of memory, one page buffers each of k = M − 1 input
      runs (a heap picks the smallest head) and one page buffers
      output. The pass count is 1 + ⌈log_k(runs)⌉: asserted
      exactly, instance by instance: so <strong>the
      logarithm&apos;s base is the memory</strong>. The dial is
      measured: identical data and memory, k = 2 costs 7 passes
      and 52,500 page I/Os; k = 64 costs 2 passes and 15,000:{' '}
      <strong>3.5×</strong>, from bookkeeping alone. Replacement
      selection stretches phase one&apos;s runs to 1.99× memory
      (Knuth&apos;s 2M), one run on sorted input, and exactly the
      ⌈N/M⌉ adversary on reversed input.
    </p>
  ),

  picture: (
    <p>
      A librarian must alphabetize a warehouse of cards with one
      small desk. Phase one: bring a deskful at a time, sort it,
      bind it as a booklet: the warehouse becomes 253 sorted
      booklets. Phase two: the desk holds 64 booklets open at
      once: repeatedly take the alphabetically-first top card among
      them: one giant sorted stack grows, and 64 booklets become
      one. The choice that matters is how many booklets to open
      per session: open only two and you re-handle every card in
      seven full sessions; open 64 and two sessions finish the
      warehouse. Same desk, same cards: the number of times every
      card gets touched is the entire bill, and the funnel&apos;s
      width sets it.
    </p>
  ),

  steps: [
    <>
      <strong>Form runs:</strong> read M pages, sort in memory,
      write a sorted run: or run the snowplow (replacement
      selection) and get 2M-long runs from the same memory.
    </>,
    <>
      <strong>Buffer one page per run:</strong> k = M − 1 inputs
      plus one output page: memory spent as funnel width.
    </>,
    <>
      <strong>Merge by heap:</strong> smallest head wins, output
      page flushes when full, exhausted pages refill from their
      run.
    </>,
    <>
      <strong>Repeat until one run:</strong> passes = 1 +
      ⌈log_k(runs)⌉: asserted exactly on all 200 instances.
    </>,
    <>
      <strong>Count the bill in passes:</strong> each pass reads
      and writes everything once: the client&apos;s million
      records cost exactly three reads of the data.
    </>,
  ],

  signals: [
    <>
      <strong>Data exceeds memory and order is the ask:</strong>{' '}
      ORDER BY, GROUP BY, DISTINCT, index builds, merge-join
      inputs: the database quartet.
    </>,
    <>
      <strong>Sequential I/O is cheap, random is not:</strong>{' '}
      external merge reads streams, never seeks per record: the
      access pattern disks and SSDs both love.
    </>,
    <>
      <strong>Passes are the currency:</strong> when you can
      predict cost as (passes × data size), capacity planning
      becomes arithmetic: this page&apos;s formula is that
      prediction, verified to the page.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the <strong>in-memory sort</strong>:
      when data fits, nothing external competes (the live
      quicksort unit&apos;s territory), and phase one uses exactly
      it. The instructive failure is pretending data fits: sorting
      252× memory through the pager: which is the neverUse box,
      priced.
    </>
  ),

  strength: (
    <>
      <strong>Every claim counted to the page.</strong> 200
      instances equal to sorted() with the pass formula holding
      exactly on each; the k dial measured (7 passes / 52,500 I/Os
      at k = 2 vs 2 / 15,000 at k = 64: 3.5×); the snowplow law
      landing at 1.99× memory with both edge cases exact (one run
      sorted, ⌈N/M⌉ = 313 reversed); and the 252× client sorted in
      exactly three counted passes: 49,152 page reads = 3 ×
      16,384, asserted.
    </>
  ),
  weakness: (
    <>
      <strong>Order costs a full rewrite of the data: pay it only
      when order is the product.</strong> When equality is all the
      query needs, hashing wins without sorting anything (the live
      hash-join unit&apos;s 488×): sort vs hash is the
      planner&apos;s daily knife-fight. The k dial has a floor:
      one page per run means huge k shrinks each buffer toward
      single-page reads, trading passes for seek-sized I/Os (real
      engines balance buffer size against fan-in: Graefe&apos;s
      survey is largely this tension). Replacement
      selection&apos;s 2M magic inverts on reversed input (⌈N/M⌉,
      measured), and modern engines often skip it: cache-friendly
      quicksorted runs beat heap-churn when memory is large.
    </>
  ),

  problem: 'External sorting',
  problemSlug: 'external-sorting',
  rivals: [
    {
      name: 'External merge × k-way',
      isThisUnit: true,
      algoName: 'External merge sort',
      cost: '2N · (1 + ⌈log_k r⌉)',
      wins: (
        <>
          <strong>Sequential I/O and a pass formula you can bill
          by</strong>: 252× memory sorted in three counted reads
          of the data.
        </>
      ),
      costs: (
        <>
          Order costs a full rewrite per pass: buy it only when
          order is the deliverable.
        </>
      ),
      when: 'The default under every ORDER BY, index build, and merge join that outgrows RAM.',
    },
    {
      name: 'Quicksort × in memory',
      algoName: 'Quicksort',
      cost: 'O(n log n), RAM speed',
      wins: (
        <>
          The live unit: when data fits, nothing external
          competes: and it IS this page&apos;s phase one, sorting
          each memory-load into a run.
        </>
      ),
      costs: (
        <>
          Fits-in-memory is a hard precondition, not a hope: see
          the neverUse box for the cost of pretending.
        </>
      ),
      when: 'Data under the memory line: and inside every run-formation phase above it.',
    },
    {
      name: 'Hash join × GRACE',
      algoName: 'Hash join',
      cost: 'O(N), no order',
      wins: (
        <>
          The live unit: when the query needs <em>equality</em>,
          not order: joins, GROUP BY, DISTINCT can hash-partition
          and never sort: no log factor at all.
        </>
      ),
      costs: (
        <>
          Produces no order: the moment ORDER BY or a merge join
          wants sorted streams, hashing hands the job back.
        </>
      ),
      when: 'Sort vs hash is the optimizer\'s daily choice: hash for equality, sort when order is reused.',
    },
    {
      name: 'B+ tree × bulk load',
      algoName: 'B+ tree',
      cost: 'sort + one sequential build',
      wins: (
        <>
          The live unit as the downstream customer: index builds
          sort once, then bulk-load leaves left-to-right:
          sequential, packed, and this page is the sort in front.
        </>
      ),
      costs: (
        <>
          Insert-at-a-time building instead costs a random I/O per
          record: the pattern external sorting exists to avoid.
        </>
      ),
      when: 'Every CREATE INDEX you have ever run: external sort followed by a linear build.',
    },
  ],
  neverUse: {
    name: 'In-memory sort atop virtual memory',
    why: (
      <>
        Malloc 252× your RAM, call quicksort, and let the pager
        sort it out: the code compiles, the small tests pass, and
        production dies by page-fault storm. The arithmetic is the
        argument: quicksort&apos;s comparisons stride across the
        whole array, so once the working set exceeds RAM, a
        comparison&apos;s memory access is a coin-flip page fault:
        one disk I/O for <em>one comparison</em>: while external
        merge does a <em>page of useful work</em> per I/O, streams
        instead of seeks, and touches everything three counted
        times. The pager is an LRU cache (the live LRU unit&apos;s
        machinery) being fed the one access pattern LRU handles
        worst: uniformly random probes over a set 252× its size:
        hit rate ≈ 1/252 per touch. Same records, same hardware:
        the difference is whether the algorithm was told the truth
        about memory.
      </>
    ),
  },

  contest: {
    instance:
      'sort 1,048,576 records with 4,160 records of memory (252× smaller than the data); referee: sorted() itself, exact equality on every instance',
    columns: ['passes', 'page I/O'],
    rows: [
      {
        method: 'k = 2 (binary merge)',
        values: ['7', '52,500'],
        verdict: 'the log\'s base is 2: every pass re-reads everything',
      },
      {
        method: 'k = 8',
        values: ['3', '22,500'],
        verdict: 'wider funnel, fewer passes: same memory',
      },
      {
        method: 'k = 64 (this unit)',
        isThisUnit: true,
        values: ['2', '15,000'],
        best: 1,
        verdict: 'one merge pass suffices: 3.5× under binary at identical memory',
      },
    ],
    source:
      "python solutions/external_merge_sort_kway.py prints this table and asserts: 200 instances (random, duplicate-heavy, sorted, reversed) equal to sorted() with passes == 1 + ceil(log_k(runs)) exact on each; the k dial monotone with k = 2 vs 64 above 2× (measured 3.5×); the snowplow law (replacement selection runs averaging 1.99× memory on random input, collapsing to 1 run on sorted input, hitting the ceil(N/M) = 313 adversary exactly on reversed input, with the memory invariant len(heap)+len(frozen) <= M asserted every step); and the 252× client sorted in exactly 3 passes with 49,152 page reads == 3 × 16,384 pages, to the page.",
  },

  figure: (
    <Figure
      id="fig-extsort-passes"
      aspect="16 / 7"
      caption="Passes are the currency, and k buys them down. Each merge pass reads and writes every page once, so the bill is (1 + ⌈log_k(runs)⌉) times the data: and the base of that logarithm is memory spent as funnel width. Measured at identical memory: binary merging pays 7 passes and 52,500 page I/Os; a 64-way funnel pays 2 and 15,000. Phase one has its own dial: replacement selection's snowplow stretches runs to 1.99× memory on random input (Knuth's 2M law, measured), one run on sorted input, and exactly the ⌈N/M⌉ adversary on reversed: fewer runs in, fewer merges out."
      cite={{
        text: 'Graefe, "Implementing Sorting in Database Systems", ACM Computing Surveys 38(3), 2006: the modern canon of run formation, k-way merging, and the engineering under every ORDER BY.',
        href: 'https://doi.org/10.1145/1132960.1132964',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="Runs merging through a k-way funnel into one sorted tape, with the pass-count comparison">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect key={i} x={40 + i * 64} y={40} width={52} height={14} fill="rgba(240,185,75,0.4)" stroke="#f0b94b" strokeWidth="1.4" />
        ))}
        <text x="430" y="52" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">253 sorted runs (phase 1)</text>
        <path d="M 60 60 L 320 120 M 130 60 L 320 120 M 200 60 L 320 120 M 270 60 L 320 120 M 340 60 L 320 120 M 410 60 L 320 120" stroke="#5da2ff" strokeWidth="1.2" />
        <circle cx="320" cy="126" r="10" fill="none" stroke="#5da2ff" strokeWidth="2" />
        <text x="340" y="130" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="11">k-way heap: one page per run</text>
        <rect x="120" y="158" width="400" height="14" fill="rgba(98,217,138,0.4)" stroke="#62d98a" strokeWidth="1.6" />
        <text x="240" y="190" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">one sorted stream out</text>
        <text x="40" y="224" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">measured at identical memory: k=2: 7 passes, 52,500 I/O · k=8: 3, 22,500 · k=64: 2, 15,000 (3.5×)</text>
        <text x="40" y="246" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">the client: 1,048,576 records, 4,160 of memory: 3 passes, 49,152 page reads == 3 × 16,384 exactly</text>
        <text x="40" y="272" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">the pager anti-pattern: quicksort over 252× RAM pays one I/O per comparison: the funnel pays one per page</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'external_merge_sort_kway.py',
  Viz: ExtSortViz,
  narration,
};
