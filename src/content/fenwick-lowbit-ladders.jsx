import FenwickViz from '../viz/FenwickViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/fenwick_lowbit_ladders.py?raw';
import { narration } from './fenwick-lowbit-ladders.narration.js';

export const content = {
  given:
    'An array of n numbers that keeps changing, and a stream of prefix-sum questions interleaved with point updates.',
  task: 'Answer every prefix sum and absorb every update, both in logarithmic time.',
  constraint:
    'Both at once is the whole problem: pure reads have a perfect answer (cumulative sums) and pure writes have a trivial one (the array itself); the mixed stream is where each of those detonates.',

  origins: (
    <p>
      Peter Fenwick published the structure in <strong>1994</strong> in
      Auckland, and the motivating application closes a loop on this site:
      he needed <strong>cumulative frequency tables for arithmetic
      coding</strong>, the entropy coder of puzzle 14, whose model must
      update a symbol&apos;s count and query cumulative counts on every
      single symbol. Boris Ryabko had described an equivalent structure in
      1989, in Russian, so the idea carries the site&apos;s familiar
      pattern: independently found, then canonized. Competitive programming
      adopted the twelve-liner as a signature move, and it lives today in
      order-statistics tricks, inversion counting, and every arithmetic
      coder&apos;s model.
    </p>
  ),

  algoRole: (
    <p>
      Owns an <strong>implicit tree that is just an array</strong>. Cell i
      of the tree is responsible for a block of the input, queries descend
      from responsibility to responsibility summing disjoint blocks, and
      updates climb to every responsible cell. No pointers, no nodes, no
      structure beyond the indices themselves: n + 1 integers, and the
      tested solution asserts the ownership invariant (cell i holds exactly
      the sum of its block) for <strong>every cell</strong> after random
      updates.
    </p>
  ),
  heurRole: (
    <p>
      Makes the tree exist: <strong>lowbit(i) = i &amp; (−i)</strong>, the
      lowest set bit, straight out of two&apos;s-complement arithmetic.
      Cell i owns the block of length lowbit(i) ending at i; a prefix query
      runs i −= lowbit(i), peeling the index&apos;s binary expansion into
      disjoint blocks that exactly tile the prefix (13 = 8 + 4 + 1: three
      blocks, three touches); an update runs i += lowbit(i), visiting each
      owner. One bit trick is the entire routing table, and the worst
      measured walk on 100,000 cells is <strong>15 touches</strong>.
    </p>
  ),

  picture: (
    <p>
      A relay of tally clerks. The clerk at desk 8 keeps the total of desks
      1 through 8; the clerk at 12 keeps 9 through 12; the clerk at 13
      keeps only desk 13. Ask for the first thirteen desks and you visit
      exactly the clerks whose blocks tile that range: 8, 12, 13: read
      three numbers, done. Change desk 13&apos;s figure and you notify only
      the clerks whose blocks contain it: a short climb up ever-larger
      districts. Who covers what was never written down anywhere; it is
      encoded in the desk numbers themselves, in binary.
    </p>
  ),

  steps: [
    <>
      <strong>Store:</strong> tree[i] = the sum of the block of length
      lowbit(i) ending at position i. One array, 1-indexed (the bit tricks
      demand it).
    </>,
    <>
      <strong>Query prefix(i):</strong> while i &gt; 0: add tree[i], then
      i −= lowbit(i). The blocks visited are i&apos;s binary expansion,
      disjoint and complete.
    </>,
    <>
      <strong>Update(i, +δ):</strong> while i ≤ n: tree[i] += δ, then i +=
      lowbit(i). Every block containing i is corrected, and only those.
    </>,
    <>
      <strong>Range = two prefixes:</strong> sum(l..r) = prefix(r) −
      prefix(l). Subtraction is doing real work here: remember it when the
      operation has none.
    </>,
    <>
      <strong>Bound it:</strong> both walks touch at most ⌈log₂ n⌉ + 1
      cells: asserted as a maximum over thousands of operations, worst
      observed 15 at n = 100,000.
    </>,
  ],

  signals: [
    <>
      The workload is a <strong>mix</strong>: point updates and prefix or
      range sums, interleaved, both mattering.
    </>,
    <>
      The operation has an <strong>inverse</strong>: sums, counts, XORs.
      Range-from-prefixes needs subtraction to exist (the never-here below
      is what happens when it does not).
    </>,
    <>
      Memory and constants matter: n cells, no pointers, array strides:
      half the segment tree&apos;s footprint and half its touches
      (measured).
    </>,
  ],
  baseline: (
    <>
      The honest baseline owns one column outright: the cumulative-sum
      array answers the static workload in <strong>100,000</strong> touches
      (one per query) where Fenwick needs 560,918. Let one update per query
      into the stream and it detonates: <strong>4,473,363</strong> touches
      against Fenwick&apos;s 34,906, a 128× penalty, because every change
      rebuilds the tail. If it never changes, sum it once; if it churns,
      build the ladder.
    </>
  ),

  strength: (
    <>
      <strong>Twelve lines, n cells, fifteen touches.</strong> The mixed
      workload&apos;s winner at 34,906 (half the segment tree&apos;s
      68,444), the log bound asserted as a maximum, cache-friendly array
      strides, and perfect reversibility (updates undone restore every
      prefix, asserted).
    </>
  ),
  weakness: (
    <>
      <strong>It needs subtraction, and it shows its bits.</strong> Range
      queries come from prefix differences, so non-invertible operations
      (min, max) are structurally out of reach: the tested solution proves
      two arrays with identical prefix minima that differ on a range
      minimum. That is the segment tree&apos;s territory, along with lazy
      range updates. And the 1-indexed bit gymnastics sit one desk over
      from the off-by-one museum of puzzle 22.
    </>
  ),

  problem: 'Array range queries',
  problemSlug: 'array-range-queries',
  rivals: [
    {
      name: 'Fenwick × lowbit',
      isThisUnit: true,
      algoName: 'Fenwick tree',
      cost: 'O(log n), n cells',
      wins: (
        <>
          The mixed stream at <strong>34,906</strong> touches: 128× under
          the rebuild, half the segment tree, from twelve lines and one
          array.
        </>
      ),
      costs: (
        <>
          Invertible operations only, prefix-first thinking, and bit
          tricks that punish 0-indexing.
        </>
      ),
      when: 'Sums, counts, and frequencies under churn: coder models, inversion counts, order statistics.',
    },
    {
      name: 'Segment tree',
      cost: 'O(log n), ~2n–4n cells',
      wins: (
        <>
          Everything: min, max, gcd, lazy range updates, no inverse
          needed. When Fenwick&apos;s subtraction trick dies, this is
          where you go.
        </>
      ),
      costs: (
        <>
          Roughly double on both columns here (<strong>68,444 /
          1,021,015</strong>) and double the memory: generality is a
          constant factor you pay every operation.
        </>
      ),
      when: 'Non-invertible aggregates, range updates, or any query the prefix trick cannot phrase.',
    },
    {
      name: 'Sqrt decomposition',
      cost: 'O(√n) query, O(1) update',
      wins: (
        <>
          Two touches per update, the cheapest write on the bench, and
          simple enough to derive at a whiteboard under stress.
        </>
      ),
      costs: (
        <>
          √n per query adds up: <strong>167,663 / 5,370,149</strong>, the
          slowest reads here. Its real home is queries too weird for
          trees (Mo&apos;s algorithm territory).
        </>
      ),
      when: 'Update-dominated streams, or offline query batching where block structure is the point.',
    },
  ],
  neverUse: {
    name: 'Prefix tricks for range minimum',
    why: (
      <>
        Range-from-prefixes runs on subtraction, and min has none. This is
        not an implementation gap but an information-theoretic one, proven
        in the tests by two witnesses: <strong>[1, 5, 9]</strong> and{' '}
        <strong>[1, 7, 9]</strong> have identical prefix-minimum sequences
        (1, 1, 1) yet different answers for min of the middle element
        alone, so <em>no function of prefix minima whatsoever</em> can
        answer range min. The moment your aggregate loses its inverse,
        change structures, not code: segment trees (or sparse tables for
        static data) exist precisely here.
      </>
    ),
  },

  contest: {
    instance:
      'n = 3,000; two workloads, work = cells touched: a mixed stream of 3,000 point updates interleaved with 3,000 prefix queries, and a static workload of one build plus 100,000 queries',
    columns: ['mixed 3k + 3k', 'static 100k queries'],
    rows: [
      {
        method: 'Fenwick × lowbit',
        isThisUnit: true,
        values: ['34,906', '560,918'],
        best: 0,
        verdict: 'the churn winner: log everywhere, nothing rebuilt, n cells',
      },
      {
        method: 'Prefix-sum array',
        values: ['4,473,363', '100,000'],
        best: 1,
        verdict: 'one touch per query forever, until the first update detonates it',
      },
      {
        method: 'Segment tree',
        values: ['68,444', '1,021,015'],
        verdict: 'twice the touches, twice the memory, every query answerable',
      },
      {
        method: 'Sqrt decomposition',
        values: ['167,663', '5,370,149'],
        verdict: 'two-touch updates, √n reads: the write-heavy specialist',
      },
    ],
    source:
      'python solutions/fenwick_lowbit_ladders.py prints this table and asserts the lowbit identity across 4,096 integers, the ownership invariant (tree[i] equals its block sum) for every cell after random updates, four structures agreeing with a brute-force referee across 3,000 interleaved operations, the log bound as a maximum (worst walk 15 touches at n = 100,000), full reversibility, and the two-witness proof that range minimum is unrecoverable from prefix minima.',
  },

  figure: (
    <Figure
      id="fig-fenwick-blocks"
      aspect="16 / 7"
      caption="An index's binary expansion, read as geometry. Thirteen is 8 + 4 + 1, so prefix(13) is exactly three blocks: the clerk at 8 (owning 1–8), the clerk at 12 (owning 9–12, a block of length 4), and the clerk at 13 (owning itself). Descending i −= lowbit(i) visits 13, 12, 8: disjoint, complete, done in the popcount of the index. The tree was never built; it was always hiding in the numerals."
      cite={{
        text: 'Fenwick, "A New Data Structure for Cumulative Frequency Tables", Software: Practice and Experience 24(3), 1994, built for the arithmetic-coding models of puzzle 14. An equivalent structure appears in Ryabko, 1989.',
        href: 'https://doi.org/10.1002/spe.4380240306',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="Sixteen array cells with bracket arcs showing each index's owned block; the three blocks tiling prefix thirteen are highlighted">
        {Array.from({ length: 16 }, (_, k) => (
          <g key={k}>
            <rect x={40 + k * 35} y={170} width={31} height={26} rx={3}
              fill={k < 13 ? 'rgba(93,162,255,0.12)' : 'rgba(255,255,255,0.04)'}
              stroke="#2b3650" strokeWidth="1" />
            <text x={55 + k * 35} y={188} textAnchor="middle" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">{k + 1}</text>
          </g>
        ))}
        {[
          [1, 1], [2, 2], [3, 1], [4, 4], [5, 1], [6, 2], [7, 1], [8, 8],
          [9, 1], [10, 2], [11, 1], [12, 4], [13, 1], [14, 2], [15, 1], [16, 16],
        ].map(([i, len]) => {
          const hot = (i === 8 && len === 8) || (i === 12 && len === 4) || (i === 13 && len === 1);
          const x1 = 40 + (i - len) * 35 + 2;
          const x2 = 40 + (i - 1) * 35 + 33;
          const h = 24 + Math.log2(len) * 30;
          return (
            <path
              key={i}
              d={`M ${x1} 166 C ${x1} ${166 - h}, ${x2} ${166 - h}, ${x2} 166`}
              fill="none"
              stroke={hot ? '#62d98a' : 'rgba(93,162,255,0.35)'}
              strokeWidth={hot ? 2.4 : 1.2}
            />
          );
        })}
        <text x="40" y="26" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="12">prefix(13): blocks ending at 13, 12, 8 · lengths 1 + 4 + 8 = 13</text>
        <text x="40" y="46" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="12">13 = 1101₂ · one block per set bit · i −= i &amp; (−i) walks them</text>
        <text x="40" y="230" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="12">update(5): climbs 5 → 6 → 8 → 16, the cells whose arcs cover it</text>
        <text x="40" y="266" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="12">no pointers anywhere: the routing table is two’s-complement arithmetic</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'fenwick_lowbit_ladders.py',
  Viz: FenwickViz,
  narration,
};
