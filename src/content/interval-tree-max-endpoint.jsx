import IntervalTreeViz from '../viz/IntervalTreeViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/interval_tree_max_endpoint.py?raw';
import { narration } from './interval-tree-max-endpoint.narration.js';

export const content = {
  given:
    'n intervals: bookings, IP ranges, gene annotations: queried by points and windows.',
  task: '“Which intervals contain x?” and “which overlap [a, b]?” without touching the ones that cannot answer.',
  constraint:
    'The scan touches all 20,000 intervals per question; the plausible fix: sort by start and scan the prefix: works until a few long-lived intervals make every prefix enormous: 14,889 touches per query, measured, where the pruned tree pays 131.',

  origins: (
    <p>
      Interval trees arrived twice around <strong>1980</strong>:
      Edelsbrunner&apos;s and McCreight&apos;s centered versions for
      computational geometry, and the augmented-BST form (the one built
      here) canonized by CLRS as <em>the</em> textbook example of
      augmenting a data structure: one extra field, a new query
      family. The deployments are everywhere intervals live: genome
      browsers stab annotation tracks, kernels manage virtual-memory
      regions, calendars answer &quot;what&apos;s happening at
      3pm&quot;, and the multidimensional generalization: the R-tree:
      indexes the world&apos;s maps.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>balanced search tree</strong> keyed on interval
      low endpoints: ordinary BST machinery, built balanced here by
      median recursion. Alone it answers &quot;intervals starting
      before x&quot;: which is the sorted-list rival&apos;s exact
      ceiling, and not the question. The structure&apos;s power comes
      entirely from what rides on it.
    </p>
  ),
  heurRole: (
    <p>
      Supplies <strong>one number per node</strong>: the maximum high
      endpoint anywhere in its subtree, maintained bottom-up and
      re-verified recursively at every node of every tree in the tests.
      That field is a <em>certificate of absence</em>: a subtree whose
      max-end lies left of the query can contain no answer, and is
      pruned wholesale, unvisited. Measured: <strong>33 visits per
      query</strong> where the scan pays 20,000: and on the adversary
      built to drown sorting, 131 where the sorted scan pays 14,889.
    </p>
  ),

  picture: (
    <p>
      A hotel&apos;s registry, asked &quot;who is here tonight?&quot;
      Sorting guests by <em>check-in date</em> seems right until you
      try the question: everyone who checked in before tonight is a
      candidate, including the long-term resident from January: the
      prefix is the whole book. The interval tree files by check-in but
      writes on each drawer the <em>latest check-out anywhere
      inside</em>: a drawer whose latest check-out is last week cannot
      hold tonight&apos;s guests: skip it unopened. Long-term
      residents fatten one drawer&apos;s label, not every query.
    </p>
  ),

  steps: [
    <>
      <strong>Build:</strong> balance a BST on low endpoints (median
      recursion here); compute each node&apos;s subtree max-end
      bottom-up.
    </>,
    <>
      <strong>Stab x:</strong> at each node: if subtree max-end &lt; x,
      prune: else recurse left, report the node if lo ≤ x ≤ hi, and
      recurse right only when lo ≤ x.
    </>,
    <>
      <strong>Window [a, b]:</strong> the same skeleton with the two
      boundary tests: overlap ⟺ lo ≤ b and hi ≥ a.
    </>,
    <>
      <strong>Maintain on update:</strong> max-end recomputes up the
      insertion path: O(log n): the augmentation discipline CLRS
      teaches.
    </>,
    <>
      <strong>Verify the invariant:</strong> node.maxend == max over
      the subtree: asserted recursively here, everywhere.
    </>,
  ],

  signals: [
    <>
      <strong>Stabbing and overlap are the queries:</strong> whose
      lease covers this date, which ranges claim this IP, what
      annotations cross this locus.
    </>,
    <>
      <strong>Interval lengths vary wildly:</strong> the long-survivor
      shape is exactly where prefix scans die (measured 114×) and
      pruning does not care.
    </>,
    <>
      <strong>The set changes:</strong> augmented BSTs take inserts and
      deletes at O(log n); the static-index alternatives rebuild.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the <strong>sorted list with bisect</strong>
      : on this page&apos;s uniform bookings it reached 10,160 touches
      per query: half the brute scan, respectable: and its ceiling is
      structural: every interval starting before x is a candidate
      forever. Forty long-lived intervals pushed it to 14,889 per
      query: the shape, not the size, is what broke it.
    </>
  ),

  strength: (
    <>
      <strong>One augmented field buys a query family.</strong> 33
      visits per query at 20,000 intervals (600× under the scan);
      adversary-indifferent (131 vs 14,889, measured); point and
      window queries from the same skeleton; O(log n) updates; and the
      invariant is machine-checkable: asserted at every node here.
      The design pattern: augment, then prune by certificate:
      generalizes far past intervals.
    </>
  ),
  weakness: (
    <>
      <strong>Enumeration is O(k log n), not O(log n + k), and one
      dimension only.</strong> The simple augmentation re-descends per
      answer cluster (the centered interval tree of
      Edelsbrunner/McCreight buys the tight bound with two sorted
      lists per node); rectangles and boxes need the R-tree family;
      and for <em>array-position</em> ranges with updates, the live
      segment tree unit is the right different tool.
    </>
  ),

  problem: 'Spatial indexing',
  problemSlug: 'spatial-indexing',
  rivals: [
    {
      name: 'Interval tree × max-end pruning',
      isThisUnit: true,
      algoName: 'Interval tree',
      cost: 'O(log n) find, O(k log n) enumerate',
      wins: (
        <>
          <strong>33 visits/query</strong> vs the scan&apos;s 20,000;
          shape-indifferent (the 114× adversary); dynamic updates; the
          textbook augmentation done honestly.
        </>
      ),
      costs: (
        <>
          The k log n enumeration factor (centered variants fix it),
          and one dimension.
        </>
      ),
      when: 'Stabbing and overlap over changing interval sets: calendars, address ranges, annotation tracks.',
    },
    {
      name: 'R-tree × minimal enlargement',
      algoName: 'R-tree',
      cost: 'O(log n) expected, d-dimensional',
      wins: (
        <>
          The generalization: bounding boxes over bounding boxes: the
          same prune-by-certificate idea lifted to maps, CAD, and every
          spatial database.
        </>
      ),
      costs: (
        <>
          Overlapping boxes make worst cases soft; insertion heuristics
          (enlargement, splits) are engineering, not theorems.
        </>
      ),
      when: 'Two dimensions and up: the moment intervals become rectangles.',
    },
    {
      name: 'Segment tree × lazy propagation',
      algoName: 'Segment tree',
      cost: 'O(log n) per op',
      wins: (
        <>
          The live cousin for <em>array-position</em> ranges: aggregate
          queries and range updates over indexed positions: a different
          question sharing the word &quot;interval&quot;.
        </>
      ),
      costs: (
        <>
          Positions must be fixed coordinates (or compressed);
          arbitrary dynamic endpoints are this unit&apos;s ground.
        </>
      ),
      when: 'Ranges over an array’s indices: sums, minima, bulk updates: its own live page says when.',
    },
  ],
  neverUse: {
    name: 'A start-sorted list as a stabbing index',
    why: (
      <>
        Sorting by start answers &quot;who starts before x&quot;: which
        contains the stabbing answer but does not narrow it: every
        long-lived interval is a candidate for every later query,
        forever. Measured: 40 long-survivors among 20,000 pushed the
        prefix scan to <strong>14,889 touches per query</strong>: 74%
        of the whole set, per question: while the max-end tree paid
        131. The failure is silent and shape-dependent: uniform test
        data hides it (10,160 looked tolerable), production calendars:
        full of annual bookings: find it. Index the question you will
        ask, not the sort that was easy.
      </>
    ),
  },

  contest: {
    instance:
      '20,000 bookings across a year of minutes; 2,000 stabbing queries (avg 9.3 answers), plus the adversary: 40 long-lived intervals with 500 late-day queries; referee: brute scan agreed on every report, max-end invariant verified at every node',
    columns: ['visits / query', 'adversary'],
    rows: [
      {
        method: 'Brute scan',
        values: ['20,000', '20,040'],
        verdict: 'every interval, every time: the referee’s honest bill',
      },
      {
        method: 'Sorted list + bisect',
        values: ['10,160', '14,889'],
        verdict: 'respectable on uniform shapes; drowned by 40 long survivors',
      },
      {
        method: 'Interval tree × max-end',
        isThisUnit: true,
        values: ['33', '131'],
        best: 0,
        verdict: 'the certificate of absence prunes what sorting must wade through',
      },
    ],
    source:
      'python solutions/interval_tree_max_endpoint.py prints this table and asserts: 20,000 refereed point and window queries across 100 random sets (exact set equality with the brute scan); the max-end invariant re-verified recursively at every node of every tree; scale agreement on all 2,500 queries; the tree’s average visits inside its O(k log n) family bound; and the adversary measured: the sorted scan above 70% of the set per query while the tree stays 25× below it (measured 114×).',
  },

  figure: (
    <Figure
      id="fig-interval-maxend"
      aspect="16 / 7"
      caption="One number per drawer. The BST orders by check-in (low endpoint); each node carries its subtree's latest check-out (max-end). A stab at x prunes any subtree whose label ends before x: the certificate of absence: and long-lived intervals fatten one ancestor's label instead of every query's candidate list. The invariant is machine-checked here at every node; the pruning is measured at 600× under the scan."
      cite={{
        text: 'The augmented-BST form is CLRS ch. 14 (\'Augmenting Data Structures\'); the O(log n + k) centered interval tree is Edelsbrunner 1980 / McCreight 1980; the d-dimensional lift is Guttman\'s R-tree, SIGMOD 1984.',
        href: 'https://doi.org/10.1145/602259.602266',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="An interval tree with max-end labels and one pruned subtree">
        <g>
          <rect x="250" y="40" width="140" height="30" fill="rgba(93,162,255,0.12)" stroke="#5da2ff" rx="6" />
          <text x="320" y="59" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="11" textAnchor="middle">[14, 20] max 46</text>
          <rect x="90" y="120" width="140" height="30" fill="rgba(226,96,108,0.10)" stroke="#e2606c" strokeDasharray="5 4" rx="6" />
          <text x="160" y="139" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11" textAnchor="middle">[3, 9] max 11</text>
          <rect x="410" y="120" width="140" height="30" fill="rgba(98,217,138,0.12)" stroke="#62d98a" rx="6" />
          <text x="480" y="139" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="11" textAnchor="middle">[22, 30] max 46</text>
          <line x1="290" y1="70" x2="180" y2="120" stroke="#2a3450" />
          <line x1="350" y1="70" x2="460" y2="120" stroke="#2a3450" />
        </g>
        <text x="90" y="176" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">max 11 &lt; x = 25: pruned unvisited</text>
        <text x="410" y="176" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">descend: answers may live here</text>
        <line x1="330" y1="200" x2="330" y2="240" stroke="#f0b94b" strokeWidth="2" />
        <text x="318" y="256" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">x = 25</text>
        <text x="60" y="282" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">measured: 33 visits/query vs the scan’s 20,000 · the 40-long-survivor adversary: 131 vs 14,889</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'interval_tree_max_endpoint.py',
  Viz: IntervalTreeViz,
  narration,
};
