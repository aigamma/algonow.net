import MosViz from '../viz/MosViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/mos_algorithm_sqrt_blocks.py?raw';
import { narration } from './mos-algorithm-sqrt-blocks.narration.js';

export const content = {
  given:
    'An array, and hundreds of range queries known in advance: count distinct in [l, r]: a query no classic tree decomposes.',
  task: 'Every answer exactly, with total work far below recounting each range.',
  constraint:
    'One window, two pointers, O(1) add/remove updates: and the only degree of freedom is the ORDER the queries are visited in. The referee recounts every query brute-force; the meter counts every pointer move, exactly, for six orderings through the same machinery.',

  origins: (
    <p>
      A rare thing on this site: an algorithm with no paper. The
      technique is competitive-programming folklore, named for{' '}
      <strong>Mo Tao</strong>, who popularized it in Chinese olympiad
      circles around 2010; it spread worldwide through Codeforces
      blogs and cp-algorithms. The underlying move: sqrt-decompose not
      the <em>data</em> but the <em>query schedule</em>: is the
      novelty, and the Hilbert-curve refinement raced below is its
      second-generation folklore. Provenance this informal is worth
      naming honestly: the measurements on this page are the
      citation.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>two-pointer window</strong>: maintain [curL,
      curR] with O(1) add and remove updates to a running answer (a
      frequency table and a distinct counter), and reach any query by
      sliding the ends. The machinery is identical in every race on
      this page: <em>every ordering produced exactly the same 900
      answers</em>, asserted against the brute-force referee. What
      changed was only the bill: 3,060,650 moves down to 154,452.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>sqrt-block schedule</strong>: sort queries
      by (⌊l/b⌋, then r). Within one block the right pointer sweeps
      monotonically (n moves per block, never resetting), while the
      left jitters at most b per query: total O(n²/b + q·b), measured{' '}
      <strong>411,033</strong> at the folklore b = √n against
      3,060,650 for random order: with the snake (alternate r
      direction per block: 241,825) and the tuned block b = n/√q
      (228,894) as free refinements.
    </p>
  ),

  picture: (
    <p>
      A librarian must fetch hundreds of shelf ranges, one cart, no
      teleporting: the cart only rolls left or right, picking up and
      putting back one book at a time. Serve requests in arrival
      order and the cart crisscrosses the library all day. Mo&apos;s
      insight is a dispatcher&apos;s: <em>batch by neighborhood</em>.
      Chop the left ends into √n-wide districts; within a district,
      serve requests in right-end order, so the cart&apos;s far edge
      rolls steadily forward and never doubles back. The
      Hilbert refinement drops the districts entirely and drives the
      cart along a space-filling curve through (l, r) space: the same
      idea taken to its logical end: <em>the schedule is the
      algorithm</em>.
    </p>
  ),

  steps: [
    <>
      <strong>Build the window:</strong> add(i)/remove(i) maintain a
      frequency table and the running distinct count in O(1).
    </>,
    <>
      <strong>Order the queries:</strong> sort by (⌊l/√n⌋, r): right
      pointer monotone per block, left pointer caged to a block.
    </>,
    <>
      <strong>Slide and record:</strong> drag the window to each query
      in turn; the answer is read off the counter.
    </>,
    <>
      <strong>Take the free refinements:</strong> snake the r
      direction on odd blocks (241,825), or order by Hilbert curve
      (154,452): measured, same answers.
    </>,
    <>
      <strong>Tune the dial honestly:</strong> √n is calibrated for q
      ≈ n: with q ≪ n the balance point b = n/√q cut moves 44% here.
    </>,
  ],

  signals: [
    <>
      <strong>The query has no tree:</strong> distinct count, mode,
      inversions in range: anything with cheap add/remove but no
      merge: the segment tree&apos;s door is closed.
    </>,
    <>
      <strong>Offline is acceptable:</strong> all queries known up
      front, answers deliverable in any order: a batch report, a
      contest, an analytics pass.
    </>,
    <>
      <strong>n and q in the honest middle:</strong> ~10⁴ to 10⁶,
      where (n+q)√n beats both q·n recounting and heavyweight
      persistent structures.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>recounting each range</strong>:
      correct, online, and ~q·n/3 touches: with its two-pointer
      cousins measured beside it: random-order sliding (3,060,650
      moves) and sorted-by-l (927,263: the r pointer resets every
      query). The schedule alone: same window, same answers: bought
      the rest.
    </>
  ),

  strength: (
    <>
      <strong>One meter, six orderings, a 19.8× spread.</strong> Every
      ordering answered all 900 queries identically (asserted against
      brute force); the sqrt-block schedule landed inside its theory
      bound; the snake saved 1.7× on top; Hilbert reached 154,452:
      19.8× below random order. And the dial was measured, not
      recited: the U-shape (880,551 at b=10; 519,055 at b=2000)
      brackets a real optimum.
    </>
  ),
  weakness: (
    <>
      <strong>Offline only, no updates, and the folklore dial
      lies.</strong> The schedule needs every query up front: one
      insertion into the array (without the harder 3D variant) or one
      online query breaks the whole frame. And b = √n is a
      q-dependent folklore: at q = 900 ≪ n the true balance point
      n/√q = 200 cut moves by a measured <strong>44%</strong>: tune
      the block to the workload, not the slogan.
    </>
  ),

  problem: 'Array range queries',
  problemSlug: 'array-range-queries',
  rivals: [
    {
      name: "Mo's × sqrt-block order",
      isThisUnit: true,
      algoName: "Mo's algorithm",
      cost: 'O((n+q)·√n) offline',
      wins: (
        <>
          <strong>Queries no tree decomposes</strong> (distinct, mode,
          frequency-of-frequency) at 411,033 moves vs 3,060,650: the
          schedule is the entire speedup, measured.
        </>
      ),
      costs: (
        <>
          Strictly offline, allergic to updates, and the answer
          structure must support O(1) add/remove.
        </>
      ),
      when: 'Batch analytics and contest queries where the merge step does not exist.',
    },
    {
      name: 'Segment tree × lazy ranges',
      algoName: 'Segment tree',
      cost: 'O(log n) online',
      wins: (
        <>
          The live unit: any <em>decomposable</em> query (sum, min,
          gcd) online, with updates: per-query cost Mo&apos;s cannot
          approach.
        </>
      ),
      costs: (
        <>
          Needs a merge: distinct-in-range has none, and forcing it
          means heavyweight persistence tricks.
        </>
      ),
      when: 'The moment the query decomposes or updates arrive: which is most of the time.',
    },
    {
      name: 'Sqrt decomposition',
      algoName: 'Sqrt decomposition',
      cost: 'O(√n) per op',
      wins: (
        <>
          The same √n instinct applied to the <em>data</em>: block
          summaries answer online with updates, in twenty lines.
        </>
      ),
      costs: (
        <>
          Still needs per-block summaries that merge: it shares the
          tree&apos;s blindness to distinct-style queries.
        </>
      ),
      when: 'Online range work where log-factor machinery feels heavy and √n per query is fine.',
    },
    {
      name: 'Persistent segment tree',
      algoName: 'Persistent segment tree',
      cost: 'O(log n) online, O(n log n) space',
      wins: (
        <>
          The online heavyweight: version-per-prefix turns
          distinct-in-range into a rank query: no offline requirement
          at all.
        </>
      ),
      costs: (
        <>
          n log n memory and real implementation weight: the price of
          refusing to batch.
        </>
      ),
      when: 'Distinct-style queries that MUST be online: pay the memory, keep the latency.',
    },
  ],
  neverUse: {
    name: "Mo's on a decomposable query",
    why: (
      <>
        If the query has a merge: sum, min, max, gcd: a segment tree
        (a live unit here) answers online in O(log n) per query with
        updates welcome. Reaching for Mo&apos;s there trades an
        18-line tree for an offline-only batch pass that is{' '}
        <em>asymptotically worse per query</em> (√n vs log n), cannot
        absorb a single update, and must re-sort the world when one
        more query arrives. Mo&apos;s is the tool for queries the
        tree cannot express: using it where the tree is fluent is
        paying the schedule&apos;s rigidity for nothing. The signal
        is the merge: if two half-answers combine, build the tree; if
        they do not: distinct, mode, majority-in-range: batch and
        slide.
      </>
    ),
  },

  contest: {
    instance:
      '900 offline distinct-count queries on n = 6,000; referee: brute-force recount of every query, all six orderings asserted equal; meter: exact add/remove count',
    columns: ['pointer moves', 'vs random'],
    rows: [
      {
        method: 'Random order',
        values: ['3,060,650', '1.0×'],
        verdict: 'both pointers thrash a third of the array per query',
      },
      {
        method: 'Sorted by l',
        values: ['927,263', '3.3×'],
        verdict: 'l monotone, but r resets on every query',
      },
      {
        method: 'Mo: sqrt blocks',
        isThisUnit: true,
        values: ['411,033', '7.4×'],
        verdict: 'r sweeps once per block: inside the theory bound',
      },
      {
        method: '+ snake, tuned b',
        values: ['228,894', '13.4×'],
        verdict: 'alternate r direction; b = n/√q, not √n: 44% off the folklore',
      },
      {
        method: 'Mo: Hilbert curve',
        values: ['154,452', '19.8×'],
        best: 0,
        verdict: 'the t3 refinement: one curve through (l, r), no blocks at all',
      },
    ],
    source:
      "python solutions/mos_algorithm_sqrt_blocks.py prints this table and asserts: all six orderings produce answers identical to the brute-force recount; sqrt blocks under half of both random and sorted-by-l and inside 2(n²/b + qb + n); snake < plain; Hilbert < plain; and the dial's U-shape (b=10: 880,551; b=77: 411,033; b=200: 228,894; b=2000: 519,055) with n/√q beating folklore √n by 44%.",
  },

  figure: (
    <Figure
      id="fig-mos-schedule"
      aspect="16 / 7"
      caption="The schedule is the algorithm. Each query is a point (l, r); the window walks point to point, paying |Δl| + |Δr| per hop. Arrival order crisscrosses the plane. Mo's order chops l into √n-wide blocks and serves each block in r order: the path becomes a boustrophedon: down a column, snake to the next: and total travel drops from q·n to (n+q)√n. The Hilbert refinement replaces the blocks with one space-filling curve through the same points: measured best on this page. Same points, same window, same answers: only the path changed."
      cite={{
        text: "Competitive-programming folklore, named for Mo Tao (c. 2010), reference implementation at cp-algorithms; the Hilbert-order refinement is second-generation folklore. No paper exists: the racing meter on this page is the citation.",
        href: 'https://cp-algorithms.com/data_structures/sqrt_decomposition.html',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="Query points in the l-r plane with a chaotic path and a blocked boustrophedon path compared">
        <text x="40" y="26" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">arrival order: the cart crisscrosses</text>
        <rect x="40" y="38" width="250" height="200" fill="none" stroke="#2a3450" />
        <polyline
          points="60,220 250,70 90,180 230,210 70,90 260,150 120,60 200,190"
          fill="none"
          stroke="#e2606c"
          strokeWidth="1.6"
        />
        {[[60, 220], [250, 70], [90, 180], [230, 210], [70, 90], [260, 150], [120, 60], [200, 190]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={3.5} fill="#5da2ff" />
        ))}
        <text x="350" y="26" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">Mo's order: blocks, then r: a snake</text>
        <rect x="350" y="38" width="250" height="200" fill="none" stroke="#2a3450" />
        {[413, 476, 539].map((x, i) => (
          <line key={i} x1={x} y1={38} x2={x} y2={238} stroke="#2a3450" strokeDasharray="4 4" />
        ))}
        <polyline
          points="370,220 380,180 400,90 390,60 430,70 425,120 445,190 460,210 490,200 480,150 500,100 495,60 530,80 545,130 560,170 555,215"
          fill="none"
          stroke="#62d98a"
          strokeWidth="1.8"
        />
        {[[370, 220], [400, 90], [390, 60], [430, 70], [445, 190], [490, 200], [500, 100], [530, 80], [560, 170]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={3.5} fill="#5da2ff" />
        ))}
        <text x="40" y="262" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">3,060,650 moves</text>
        <text x="350" y="262" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">411,033 moves (Hilbert: 154,452)</text>
        <text x="40" y="282" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">same 900 queries, same window machinery, same answers: only the visiting order changed</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'mos_algorithm_sqrt_blocks.py',
  Viz: MosViz,
  narration,
};
