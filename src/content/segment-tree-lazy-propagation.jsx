import SegmentTreeViz from '../viz/SegmentTreeViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/segment_tree_lazy_propagation.py?raw';
import { narration } from './segment-tree-lazy-propagation.narration.js';

export const content = {
  given:
    'An array of n numbers under a stream of interleaved operations.',
  task: 'Range updates and range queries, both in O(log n).',
  constraint:
    'Both directions at once is the hard part: reads alone have cheap answers (prefix sums), writes alone too (difference arrays); a workload that mixes them breaks each half-solution, and the naive array pays 2,481 element touches per operation, measured.',

  origins: (
    <p>
      Segment trees entered the literature through{' '}
      <strong>computational geometry</strong>: Bentley built them in 1977
      to answer which rectangles cover a point, and the textbook
      treatment still lives in the geometry canon. Competitive
      programming then adopted the structure as its universal workhorse
      and, in the 2000s, folklore-engineered the piece geometry never
      needed: <strong>lazy propagation</strong>, the debt trick that
      makes range <em>writes</em> as cheap as range reads. The pattern
      is older than the name: write-back caches, database write
      buffering, and rent notices in apartment lobbies all park work
      where it falls and pay it on the next visit.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>canonical decomposition</strong>. A binary tree
      over the array: each node holds the sum of its interval, and any
      range [l, r] splits into at most 2·log n <em>cover nodes</em>:
      nodes whose interval lies wholly inside the range. A range read
      collects the covers and is done: 47 node visits per operation,
      measured, against the naive array&apos;s 2,481. The tree alone,
      though, only reads fast: a range <em>write</em> would still walk
      every leaf below.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>debt</strong>. A range write stops at the same
      cover nodes and stamps the update there as a lazy tag: &quot;+v
      owed to everything below&quot;: adjusting the node&apos;s own sum
      and going home. The tag is pushed one level down only when a later
      operation actually walks through. Nobody below ever learns about
      an update no one asked about: the eager tree that refuses this
      debt pays <strong>81×</strong>, measured. And the trick is
      algebra-generic: the same page runs it over <em>min</em> instead
      of sum, referee-checked, which is the door the leaner Fenwick
      identity cannot walk through.
    </p>
  ),

  picture: (
    <p>
      A landlord raising rent on a whole tower does not knock on every
      door: one notice goes up in the lobby, and the building&apos;s
      ledger updates immediately. A tenant on the fourteenth floor learns
      the new number only when they next pass through, and the notice
      follows them up, floor by floor, exactly as far as anyone actually
      walks. The lobby notice is the lazy tag; pushing it one floor down
      is propagation; and the eager landlord who really does knock on
      every door is the measured 81× on this page.
    </p>
  ),

  steps: [
    <>
      <strong>Build:</strong> a complete binary tree over the array; each
      node stores its interval&apos;s sum.
    </>,
    <>
      <strong>Range write:</strong> descend; at each cover node, adjust
      its sum by v·length, stamp the lazy tag, stop.
    </>,
    <>
      <strong>Push on contact:</strong> before descending{' '}
      <em>through</em> a tagged node, hand the tag to both children
      (apply to their sums, merge into their tags), clear it.
    </>,
    <>
      <strong>Range read:</strong> descend the same way; sum the cover
      nodes met.
    </>,
    <>
      <strong>Change the algebra freely:</strong> min, max, assignment,
      affine maps: any monoid with a composable update: the min variant
      runs referee-checked in the tests.
    </>,
  ],

  signals: [
    <>
      <strong>Reads and writes both span ranges:</strong> interval
      bookings, brightness over image rows, add-a-bonus-to-a-team
      queries: the mixed workload with no half-price shortcut.
    </>,
    <>
      <strong>The question may change:</strong> today sum, tomorrow min
      or assignment: lazy composes across monoids; the Fenwick identity
      is welded to sums.
    </>,
    <>
      <strong>Online and interleaved:</strong> answers needed now, in
      arrival order: the offline reordering tricks (Mo&apos;s) are off
      the table.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the <strong>naive array</strong>: 4,961,554
      element touches for 2,000 mixed operations, exactly the sum of the
      spans (asserted to the element). It is also unbeatable below
      n ≈ 100: every clever structure here pays constants the flat
      loop does not. The crossover, not the asymptote, decides: this
      page&apos;s ledger sits at n = 10,000, where the debt trick is
      53× and simplicity has stopped being cheap.
    </>
  ),

  strength: (
    <>
      <strong>Both directions logarithmic, any monoid, online.</strong>{' '}
      47 visits per operation against 2,481 naive (53×), the min-algebra
      variant referee-checked to show the generality is real, and
      full-range operations touching literally one node. This is the
      structure competitive programming reaches for by reflex, because
      it bends to the problem instead of the reverse.
    </>
  ),
  weakness: (
    <>
      <strong>Constants, memory, and code weight.</strong> On its home
      algebra the Fenwick two-tree identity is leaner: 27 visits to 47,
      measured, in a third of the code. The tree spends ~4n nodes plus a
      tag array; recursion depth is real; and lazy composition rules for
      richer updates (assignment over sum) are a classic source of subtle
      bugs. Below the crossover, the naive array wins outright.
    </>
  ),

  problem: 'Array range queries',
  problemSlug: 'array-range-queries',
  rivals: [
    {
      name: 'Segment tree × lazy propagation',
      isThisUnit: true,
      algoName: 'Segment tree',
      cost: 'O(log n) per op',
      wins: (
        <>
          <strong>47 visits/op</strong> on the mixed workload (53× over
          naive), any monoid (min demonstrated), online, full-range ops
          in one node.
        </>
      ),
      costs: (
        <>
          ~4n memory, recursive code, and 1.7× the Fenwick constant on
          pure sums.
        </>
      ),
      when: 'Mixed range reads and writes, or any algebra beyond sums: the general tool.',
    },
    {
      name: 'Fenwick × two-tree identity',
      algoName: 'Fenwick tree',
      cost: 'O(log n) per op',
      wins: (
        <>
          <strong>27 visits/op</strong>, the leanest correct run on this
          workload: two bit-ladder arrays and an algebraic identity, in a
          dozen lines.
        </>
      ),
      costs: (
        <>
          The identity (prefix(i) = i·B₁ − B₂) is welded to sum algebra:
          no min, no max, no assignment: change the question and the
          structure has no answer.
        </>
      ),
      when: 'Pure range-add / range-sum workloads: the specialist on its home ground, as its own unit’s page argues.',
    },
    {
      name: 'Sqrt decomposition',
      cost: 'O(√n) per op',
      wins: (
        <>
          <strong>122 visits/op</strong> (20×) from twenty lines with no
          recursion: blocks with pending adds: the simplest structure
          that beats naive.
        </>
      ),
      costs: (
        <>
          √n is not log n: at n = 10⁶ the gap is 1,000 vs 20 per
          operation, and it grows.
        </>
      ),
      when: 'Medium n, tight deadlines, or as the stepping stone it is: Mo’s algorithm is built on its blocks.',
    },
    {
      name: "Mo's algorithm × sqrt block ordering",
      algoName: "Mo's algorithm",
      cost: 'O((n+q)√n) offline',
      wins: (
        <>
          Reorders <em>queries</em> (not data) by block so consecutive
          ones share work: handles per-range state no tree can compose,
          like &quot;distinct values in [l, r]&quot;.
        </>
      ),
      costs: (
        <>
          Offline only: every query known in advance, and no updates in
          the classic form.
        </>
      ),
      when: 'Batch analytics over a frozen array where the question resists monoid algebra.',
    },
  ],
  neverUse: {
    name: 'The eager tree: range writes without the debt',
    why: (
      <>
        The same segment tree, refusing lazy tags, performs a range write
        as one point-update per element: each O(log n), so a span of
        1,000 costs ~10,000 node visits <em>through</em> the very
        structure that was supposed to save work. Measured:{' '}
        <strong>1,297,075 visits where lazy spent 15,984 (81×)</strong>,
        which is worse than owning no tree at all. A structure&apos;s
        asymptotics only apply to the operations it was actually designed
        for: wrapping the right structure around the wrong access
        pattern is how log-time tools quietly go quadratic in
        production.
      </>
    ),
  },

  contest: {
    instance:
      'n = 10,000, m = 2,000 interleaved range-adds and range-sums (average span 2,480); referee: every query answer identical across all structures, and the naive bill equals the summed spans exactly',
    columns: ['node/element visits', 'per op'],
    rows: [
      {
        method: 'Naive array',
        values: ['4,961,554', '2,481'],
        verdict: 'the honest floor, and the winner below n ≈ 100',
      },
      {
        method: 'Sqrt decomposition',
        values: ['244,402', '122'],
        verdict: '20×: twenty lines, no recursion, √n forever',
      },
      {
        method: 'Segment tree × lazy',
        isThisUnit: true,
        values: ['94,400', '47'],
        verdict: '53×, and the only row that also serves min, max, assign',
      },
      {
        method: 'Fenwick, two trees',
        values: ['53,220', '27'],
        best: 1,
        verdict: '93×: the sum-specialist wins its home algebra',
      },
    ],
    source:
      'python solutions/segment_tree_lazy_propagation.py prints this table and asserts: four structures and the min-monoid variant agree with brute-force referees on every query across 2,000 mixed small-array ops plus the full ledger; the naive bill matches the summed spans to the element; lazy stays inside its 4(log n + 2) per-op bound; and the eager tree pays 81× (1,297,075 vs 15,984 visits) for refusing the debt.',
  },

  figure: (
    <Figure
      id="fig-lazy-debt"
      aspect="16 / 7"
      caption="A range write stops at its cover nodes. The update adjusts each cover's sum and parks as an amber debt tag; everything below stays untouched and stale, on purpose. A later walk through a tagged node pushes the debt one level down, and no further. Work is paid exactly where, and exactly when, someone actually reads: the eager alternative that knocks on every door measures 81× worse."
      cite={{
        text: 'Segment trees: Bentley 1977, via de Berg, Cheong, van Kreveld & Overmars, "Computational Geometry: Algorithms and Applications", 3rd ed., Springer 2008, ch. 10. Lazy propagation is competitive-programming folklore engineering on that structure.',
        href: 'https://doi.org/10.1007/978-3-540-77974-2',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="A segment tree with a range update stamping debt tags on cover nodes">
        {[
          [1, 0, 16], [2, 0, 8], [3, 8, 8],
          [4, 0, 4], [5, 4, 4], [6, 8, 4], [7, 12, 4],
        ].map(([id, lo, len]) => {
          const depth = id === 1 ? 0 : id < 4 ? 1 : 2;
          const x = 40 + (lo / 16) * 560;
          const w = (len / 16) * 560 - 8;
          const y = 30 + depth * 58;
          const cover = id === 5 || id === 3;
          return (
            <g key={id}>
              <rect x={x} y={y} width={w} height={34} fill={cover ? 'rgba(240,185,75,0.14)' : 'rgba(93,162,255,0.07)'} stroke={cover ? '#f0b94b' : '#5da2ff'} strokeWidth={cover ? 2 : 1} rx="5" />
              {cover && <text x={x + w - 34} y={y + 14} fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">+v</text>}
              <text x={x + 8} y={y + 22} fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="11">{`[${lo}, ${lo + len - 1}]`}</text>
            </g>
          );
        })}
        <rect x={40 + (4 / 16) * 560} y={214} width={(12 / 16) * 560 - 8} height={16} fill="none" stroke="#62d98a" strokeWidth="1.4" strokeDasharray="5 4" rx="4" />
        <text x={40 + (4 / 16) * 560} y={246} fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="12">the write: add v to [4, 15]</text>
        <text x="40" y="246" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">covers: [4,7] and [8,15]</text>
        <text x="40" y="272" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">two stamps, zero leaves touched · debt descends only under later footsteps · eager instead: 81×, measured</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'segment_tree_lazy_propagation.py',
  Viz: SegmentTreeViz,
  narration,
};
