import BPlusViz from '../viz/BPlusViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/bplus_tree_linked_leaves.py?raw';
import { narration } from './bplus-tree-linked-leaves.narration.js';

export const content = {
  given:
    'A table worth of keyed rows on disk, and the query that pays the rent: WHERE ts BETWEEN a AND b.',
  task: 'An ordered index where point lookups are shallow and predictable, and range scans read in a straight line.',
  constraint:
    'The live B-tree unit balances beautifully: but stores rows in every node, so ranges walk the tree and lookups end at unpredictable depths. Referees here: 300 ranges equal to sorted-list slices, structural invariants after the build, and two meters that disagree on purpose: node touches (a 1.03× wash) and disk seeks (9×).',

  origins: (
    <p>
      The B-tree is Bayer and McCreight, 1972: the live unit&apos;s
      page. The <strong>B+ variant</strong> grew inside IBM&apos;s
      database groups in the years after, and got its name and
      canonical form in Douglas Comer&apos;s 1979 survey{' '}
      <em>&quot;The Ubiquitous B-Tree&quot;</em>: which observed,
      already then, that the plus form is what implementers actually
      built. Half a century later that is simply true: SQLite,
      Postgres, MySQL&apos;s InnoDB, LMDB: every serious disk index
      is a B+ tree, and this page measures the two reasons why.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>balanced high-fanout tree</strong>: the live
      B-tree unit&apos;s machinery: splits propagating upward, all
      leaves at one depth, occupancy floors keeping the height
      logarithmic. The invariants are asserted after the build:
      sorted nodes, uniform leaf depth, minimum occupancy, and the
      leaf chain in strictly increasing order. Nothing about the
      balancing changes in the plus form: what changes is what the
      nodes <em>hold</em>.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>plus discipline</strong>: every row lives
      in a leaf; internal nodes hold nothing but separator keys; and
      the leaves are <em>chained left to right</em>. Three
      consequences, all measured: lookups touch exactly the height
      (1,000 lookups, zero variance, vs the B-tree&apos;s 1..3
      wander): separator-only pages carry ~256 pointers where inline
      rows fit ~60, so height falls (4 vs 5 at 10⁸ rows): and BETWEEN
      never re-climbs: one descent, then the chain, read{' '}
      <strong>sequentially</strong>: 180 seeks vs 1,553.
    </p>
  ),

  picture: (
    <p>
      A library where the index cards and the books live apart. In
      the plain B-tree, some books sit inside the card cabinet
      itself: finding one can end early (lucky) or deep (unlucky),
      and reading a shelf&apos;s worth means bouncing between
      cabinet and stacks. The plus library moves <em>every book to
      the shelves</em> and keeps the cabinet purely as directions:
      thinner cards, so each drawer points further: and then bolts
      the shelves into <strong>one continuous aisle</strong>. Find
      the first book by cabinet; read the rest by walking the aisle.
      Nobody returns to the cabinet mid-shelf: which is the entire
      difference between seeking and streaming.
    </p>
  ),

  steps: [
    <>
      <strong>Descend by separators:</strong> internal nodes route;
      only leaves answer: every lookup lands at exactly height.
    </>,
    <>
      <strong>Insert at the leaf:</strong> split on overflow; the
      leaf&apos;s split key <em>copies</em> up (it must stay with
      its row), internal splits <em>move</em> theirs up.
    </>,
    <>
      <strong>Chain the leaves:</strong> each split wires the new
      leaf into the list: the chain stays sorted (asserted).
    </>,
    <>
      <strong>Range = descend once, then walk:</strong> find a&apos;s
      leaf, follow next-pointers until past b: no re-climbing, ever.
    </>,
    <>
      <strong>Lay leaves out in chain order:</strong> the seek meter
      is the reason: 1,327 of the transitions turn sequential.
    </>,
  ],

  signals: [
    <>
      <strong>Ranges pay the rent:</strong> time windows, key
      prefixes, pagination: BETWEEN is the workload, and the chain
      is its instrument.
    </>,
    <>
      <strong>Storage is paged:</strong> disk or SSD blocks, buffer
      pools: fanout per page and sequential reads are the currency:
      the two things the plus form buys.
    </>,
    <>
      <strong>Latency is contractual:</strong> every lookup costs
      exactly the height: zero variance measured: the predictability
      a p99 budget wants.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the live <strong>B-tree</strong> at the
      same node width: and the meters split honestly. Node touches:
      1,553 vs 1,507: <strong>a 1.03× wash</strong>: in RAM the
      in-order walk is fine. Disk seeks under each structure&apos;s
      natural layout: 1,553 vs 180: <strong>9×</strong>: because the
      chain reads in a straight line and the walk jumps between
      pages scattered by splits. The plus form&apos;s win was never
      fewer touches: it is touches in a straight line.
    </>
  ),

  strength: (
    <>
      <strong>Slice-exact answers, asserted structure, and the
      straight line.</strong> All 300 ranges equal to sorted-list
      slices on both trees; invariants (sorted nodes, uniform leaf
      depth, occupancy floors, ordered chain) asserted after 100,000
      inserts; lookups at exactly height 3 with zero variance across
      1,000 probes; and the seek meter: 180 vs 1,553, with 1,327
      transitions turned sequential by the chain.
    </>
  ),
  weakness: (
    <>
      <strong>Duplication, write cost, and an honest RAM wash.</strong>{' '}
      Separator keys are stored twice (once as a router, once with
      the row): the price of eviction. Every insert dirties a leaf
      page and, on splits, a chain neighbor: write amplification the
      LSM world exists to dodge. And when the whole index is hot in
      RAM, the touch meter says the plain B-tree walk is within 3%:
      the plus form&apos;s advantages are page-shaped: no pages, no
      advantage.
    </>
  ),

  problem: 'Disk-friendly ordered indexing',
  problemSlug: 'disk-ordered-index',
  rivals: [
    {
      name: 'B+ tree × leaf chain',
      isThisUnit: true,
      algoName: 'B+ tree',
      cost: 'O(log n), seeks ≈ h + k/leaf',
      wins: (
        <>
          <strong>Ranges in a straight line</strong> (180 vs 1,553
          seeks), lookups at exactly height (zero variance), fanout
          up and height down: the shipped database default.
        </>
      ),
      costs: (
        <>
          Separators duplicated, split writes touch neighbors, and in
          pure RAM the walk ties within 3%.
        </>
      ),
      when: 'Any paged ordered index where BETWEEN matters: which is nearly every database.',
    },
    {
      name: 'B-tree × node splits',
      algoName: 'B-tree',
      cost: 'O(log n), early exits',
      wins: (
        <>
          The live unit: rows in every node mean lucky lookups end
          high (measured 1..3 touches): marginally fewer touches for
          point-heavy loads.
        </>
      ),
      costs: (
        <>
          Ranges walk the tree over scattered pages: every transition
          a seek here: and inline rows cut fanout, adding a level at
          scale.
        </>
      ),
      when: 'In-memory ordered maps and teaching: where pages and chains buy nothing.',
    },
    {
      name: 'LSM tree × leveled merges',
      algoName: 'Log-structured merge tree',
      cost: 'O(log n) reads, batched writes',
      wins: (
        <>
          The write-side answer: appends and merges instead of
          in-place page edits: the amplification this unit&apos;s
          splits pay is its whole reason to exist.
        </>
      ),
      costs: (
        <>
          Reads consult multiple levels (bloom filters as bandages),
          and compaction is a background tax.
        </>
      ),
      when: 'Write-heavy stores: the RocksDB world: reads pay so writes can stream.',
    },
    {
      name: 'Skip list × coin flips',
      algoName: 'Skip list',
      cost: 'O(log n) expected',
      wins: (
        <>
          The live unit&apos;s in-memory cousin of the chain idea:
          the bottom level IS a linked list, ranges scan it the same
          way: lock-friendly and simple.
        </>
      ),
      costs: (
        <>
          Pointer-chasing with no page discipline: the fanout and
          sequential-I/O wins evaporate on disk.
        </>
      ),
      when: 'Concurrent in-memory ordered maps: memtables inside the LSM engines, fittingly.',
    },
  ],
  neverUse: {
    name: 'Scattering the leaves',
    why: (
      <>
        The chain is a pointer structure: it works wherever the
        leaves physically live: and that is exactly the trap. Let
        leaves land wherever allocation happens to put them:
        insert-order, arena-recycled, fragmented after months of
        churn: and every next-pointer hop becomes a random seek: the
        meter&apos;s 180 climbs right back toward the walk&apos;s
        1,553, while every correctness test still passes. This is
        why real engines fight for physical order: SQLite&apos;s
        VACUUM, Postgres&apos;s CLUSTER, InnoDB&apos;s
        order-preserving page allocation: the index&apos;s
        performance contract lives in a property no unit test can
        see. A B+ tree with scattered leaves is a B+ tree in name
        and a random-I/O generator in practice: the data structure
        is the layout.
      </>
    ),
  },

  contest: {
    instance:
      '60 range scans of ~1,000 rows over a 100,000-key index, equal node widths (63 keys); referee: every answer equal to the sorted-list slice (300 ranges, 2,000 lookups)',
    columns: ['node touches', 'disk seeks'],
    rows: [
      {
        method: 'B-tree (live unit)',
        values: ['1,553', '1,553'],
        verdict: 'in-order walk over pages scattered by splits: every hop a seek',
      },
      {
        method: 'B+ tree, chained leaves',
        isThisUnit: true,
        values: ['1,507', '180'],
        best: 1,
        verdict: 'descent, then a straight line: 1,327 transitions turned sequential',
      },
    ],
    source:
      "python solutions/bplus_tree_linked_leaves.py prints this table and asserts: 300 ranges slice-exact on both trees plus 2,000 memberships; structural invariants (sorted nodes, uniform leaf depth, occupancy floors, strictly ordered chain) after 100,000 inserts; 1,000 B+ lookups touching exactly height 3 with zero variance vs the B-tree's 1..3; the touch-count wash reported honestly (1.03×); and the seek meter under natural layouts: 180 vs 1,553 (9×), with the fanout arithmetic (256 vs ~60 per 4KB page: height 4 vs 5 at 10⁸ rows) stated in prose.",
  },

  figure: (
    <Figure
      id="fig-bplus-chain"
      aspect="16 / 7"
      caption="Separators route, leaves answer, the chain streams. Every row lives at leaf depth, so lookups cost exactly the height: zero variance measured. Internal pages hold only separator keys, so a 4KB page points ~256 ways instead of ~60: height falls. And BETWEEN a AND b is one descent plus a walk along the leaf chain: laid out in chain order, 1,327 of its page transitions read sequentially: 180 seeks against the tree walk's 1,553. The win was never fewer touches: it is touches in a straight line."
      cite={{
        text: 'Comer, "The Ubiquitous B-Tree", ACM Computing Surveys 11(2), 1979: the survey that named the B+ form and observed implementers had already chosen it. The balancing is Bayer & McCreight 1972: the live B-tree unit\'s page.',
        href: 'https://doi.org/10.1145/356770.356776',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="A B+ tree with separator-only internals, chained leaves, and a range scan running along the chain">
        <rect x="270" y="30" width="100" height="24" rx="4" fill="none" stroke="#5da2ff" strokeWidth="1.6" />
        <text x="284" y="46" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="11">37 | 71</text>
        {[150, 320, 490].map((x, i) => (
          <g key={i}>
            <rect x={x - 45} y={100} width={90} height={22} rx="4" fill="none" stroke="#5da2ff" strokeWidth="1.4" />
            <text x={x - 30} y={115} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">{['12 | 24', '48 | 60', '82 | 90'][i]}</text>
            <line x1={320 + (i - 1) * 30} y1={54} x2={x} y2={98} stroke="#2a3450" />
          </g>
        ))}
        {[70, 165, 260, 355, 450, 545].map((x, i) => (
          <g key={i}>
            <rect x={x - 38} y={180} width={76} height={24} rx="4" fill={i >= 2 && i <= 4 ? 'rgba(98,217,138,0.15)' : 'none'} stroke={i >= 2 && i <= 4 ? '#62d98a' : '#40507a'} strokeWidth="1.5" />
            <text x={x - 26} y={196} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">{['4 9', '14 21', '29 33', '41 55', '63 78', '85 96'][i]}</text>
            {i < 5 && (
              <path d={`M ${x + 40} 192 L ${x + 55} 192`} stroke="#f0b94b" strokeWidth="1.8" markerEnd="url(#bpArrow)" fill="none" />
            )}
          </g>
        ))}
        <defs>
          <marker id="bpArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#f0b94b" />
          </marker>
        </defs>
        <line x1="150" y1="124" x2="100" y2="176" stroke="#2a3450" />
        <line x1="150" y1="124" x2="180" y2="176" stroke="#2a3450" />
        <line x1="320" y1="124" x2="280" y2="176" stroke="#2a3450" />
        <line x1="320" y1="124" x2="360" y2="176" stroke="#2a3450" />
        <line x1="490" y1="124" x2="460" y2="176" stroke="#2a3450" />
        <line x1="490" y1="124" x2="545" y2="176" stroke="#2a3450" />
        <text x="60" y="240" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">BETWEEN 29 AND 70: one descent, then the amber chain: no re-climbing</text>
        <text x="60" y="264" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">measured: touches 1,507 vs 1,553 (a wash) · seeks 180 vs 1,553 (9×) · lookups exactly height 3, zero variance</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'bplus_tree_linked_leaves.py',
  Viz: BPlusViz,
  narration,
};
