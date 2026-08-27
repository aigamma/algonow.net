import BTreeViz from '../viz/BTreeViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/b_tree_high_fanout.py?raw';
import { narration } from './b-tree-high-fanout.narration.js';

export const content = {
  given:
    'n keys on page-based storage: one read fetches a whole page.',
  task: 'An ordered index: lookups, inserts, range scans: in O(log_B n) page reads.',
  constraint:
    'The disk’s economics rule everything: a page read costs the same whether you use 1 key of it or 128. The measured gap is the whole argument: 2.99 pages per lookup against the pointer-per-key tree’s 21.12, on the same 100,000 keys.',

  origins: (
    <p>
      Bayer and McCreight published the structure at Boeing in{' '}
      <strong>1970</strong>, famously never explaining the
      &quot;B&quot; (balanced? broad? Boeing? Bayer?): the mystery is
      part of the lore. Comer&apos;s 1979 survey was titled &quot;The
      Ubiquitous B-Tree&quot; and has only become more correct: every
      serious database (SQLite, Postgres, MySQL&apos;s InnoDB), every
      mainstream filesystem, and most embedded key-value stores are
      B-tree variants, usually the leaf-linked <strong>B+ tree</strong>.
      The modern challenger is the LSM tree, which concedes reads to win
      writes: that trade is a card below.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>balanced multiway search tree</strong>, with a
      promise no rotation-based tree makes: <em>every leaf sits at the
      same depth, always</em>: asserted here after every growth stage at
      every fanout. The trick is where growth happens: a full root
      splits and the tree gains height <em>at the top</em>, so leaves
      sink together or not at all. Search is the obvious generalization:
      binary-search within the node, descend one child, repeat.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>fanout</strong>: pack each node to the page
      (up to 2t−1 keys), and split a full child around its median on
      the way down. Height becomes log_t n, and the dial is measured:
      at 100,000 keys, t = 2 stands 13 tall, t = 8 five, t = 64 three,
      t = 512 two. Splits are rare by construction (1,124 across
      100,000 inserts: about n/t): the page is the unit of both cost
      and growth, which is the entire design.
    </p>
  ),

  picture: (
    <p>
      A law library&apos;s catalog. The pointer-per-key tree is a chain
      of index cards, each card naming one case and pointing to two
      more drawers: twenty-one drawer-openings per question, measured.
      The B-tree is a shelf of <em>ledgers</em>: each ledger page lists
      a hundred and twenty-eight ranges and where they continue. Three
      ledger openings answer anything: because opening a drawer costs
      the same whether you read one line or the whole page, and the
      ledger reads the whole page.
    </p>
  ),

  steps: [
    <>
      <strong>Search:</strong> binary-search the node&apos;s keys,
      descend the matching child: one page per level, log_t n levels.
    </>,
    <>
      <strong>Insert, splitting on the way down:</strong> any full child
      you pass splits around its median (the median rises to the
      parent), so there is always room below.
    </>,
    <>
      <strong>Grow at the root:</strong> a full root splits into a
      one-key root: the only way height increases, and why leaves share
      a depth.
    </>,
    <>
      <strong>Range scan:</strong> descend once, then sweep: height +
      the answer&apos;s own pages (8 pages for 500 keys, measured).
    </>,
    <>
      <strong>Tune t to the page:</strong> the fanout dial is the
      storage stack&apos;s block size wearing an algorithm.
    </>,
  ],

  signals: [
    <>
      <strong>Storage is paged and pages are expensive:</strong> disks,
      SSDs, network storage: also CPU cache lines: the same economics
      at a smaller scale.
    </>,
    <>
      <strong>Range scans matter:</strong> ORDER BY, time windows,
      prefix queries: ordered neighbors on shared pages is the whole
      point.
    </>,
    <>
      <strong>Reads dominate writes:</strong> when the mix inverts
      toward heavy ingest, the LSM tree&apos;s trade starts winning.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>binary search over a sorted
      file</strong>: no structure at all, and its probe trail crosses
      9.53 pages, measured: only 3.2× worse than the B-tree, and
      unbeatable if the data never changes. The B-tree&apos;s rent is
      paid for <em>inserts</em>: the sorted file pays a full rewrite
      per insert, the tree pays 1,124 splits per 100,000.
    </>
  ),

  strength: (
    <>
      <strong>2.99 pages per lookup, every leaf at the same depth, and
      cheap growth.</strong> The height theorem measured across the
      fanout dial (13 / 5 / 3 / 2); range scans at height + payload (8
      pages for 500 keys); invariants machine-checked after every
      growth stage; and the shadow referee agreed on all 20,000 mixed
      operations including full range contents.
    </>
  ),
  weakness: (
    <>
      <strong>Write amplification, half-empty pages, and the LSM
      trade.</strong> Every insert dirties a page that must be
      rewritten (and splits dirty three); occupancy hovers near 69%
      on random keys, so a quarter of the shelf is air; and
      write-heavy workloads flip the economics toward LSM trees, which
      batch writes into sorted runs and pay at read time. In RAM the
      skip list (a live unit) trades the B-tree&apos;s cache lines for
      radical simplicity.
    </>
  ),

  problem: 'Disk-friendly ordered indexing',
  problemSlug: 'disk-ordered-index',
  rivals: [
    {
      name: 'B-tree × high-fanout splits',
      isThisUnit: true,
      algoName: 'B-tree',
      cost: 'O(log_B n) pages',
      wins: (
        <>
          <strong>2.99 pages/lookup</strong> at 100,000 keys, leaves
          provably level, splits at n/t: the structure under nearly
          every database and filesystem you use.
        </>
      ),
      costs: (
        <>
          In-place page rewrites (write amplification), ~69% occupancy,
          and read-optimized economics.
        </>
      ),
      when: 'Read-heavy ordered data on paged storage: the default index of the last fifty years.',
    },
    {
      name: 'B+ tree',
      cost: 'O(log_B n) + linked leaves',
      wins: (
        <>
          The shipping refinement: all values at the leaves, leaves
          chained left-to-right: range scans become one descent plus a
          linked walk: no re-descending, ever.
        </>
      ),
      costs: (
        <>
          Interior keys duplicate leaf keys, and the sibling links are
          one more thing crash recovery must keep honest.
        </>
      ),
      when: 'What databases actually ship: if this page’s tree had a production sibling, it is this.',
    },
    {
      name: 'LSM tree × tiered compaction',
      algoName: 'Log-structured merge tree',
      cost: 'O(1) amortized writes, reads pay',
      wins: (
        <>
          Writes become sequential appends into sorted runs: ingest
          rates B-trees cannot touch: the engine of RocksDB, Cassandra,
          LevelDB.
        </>
      ),
      costs: (
        <>
          Reads consult multiple runs (bloom filters blunt it: a live
          unit here), and compaction is a background tax forever.
        </>
      ),
      when: 'Write-heavy and append-mostly workloads: the other side of the read/write bargain.',
    },
    {
      name: 'Skip list × coin flips',
      algoName: 'Skip list',
      cost: 'O(log n) expected, in RAM',
      wins: (
        <>
          The in-memory cousin (a live unit): no splits, no rotations,
          lock-free friendly: what Redis and memtables use{' '}
          <em>inside</em> the RAM tier of LSM engines.
        </>
      ),
      costs: (
        <>
          Pointer-chasing economics: on paged storage it pays the same
          page-per-hop bill the BST does.
        </>
      ),
      when: 'Ordered maps in memory, especially concurrent ones: a different tier of the same stack.',
    },
  ],
  neverUse: {
    name: 'Pointer-per-key trees as disk indexes',
    why: (
      <>
        The binary search tree paid <strong>21.12 pages per
        lookup</strong> to the B-tree&apos;s 2.99, measured on
        identical keys: seven times the I/O, because every hop lands on
        a different page and uses one key of it. The lesson outlives
        disks: cache lines are 64-byte pages, and the same arithmetic
        is why in-memory B-trees beat pointer-chasing trees on modern
        CPUs. Any time the storage bills by the block, an index that
        reads blocks and uses bytes is paying retail for wholesale
        goods.
      </>
    ),
  },

  contest: {
    instance:
      '100,000 random keys, page = one node, 10,000 random lookups; referee: a bisect shadow dictionary agreeing on all 20,000 mixed ops (range contents included), with same-depth and occupancy invariants machine-checked at every stage',
    columns: ['pages / lookup', 'height'],
    rows: [
      {
        method: 'B-tree, t = 64 (fanout 128)',
        isThisUnit: true,
        values: ['2.99', '3'],
        best: 0,
        verdict: 'every leaf at depth 3: the theorem, standing',
      },
      {
        method: 'Sorted file + binary search',
        values: ['9.53', '~17 probes'],
        verdict: 'structureless and honorable: until the first insert',
      },
      {
        method: 'BST (pointer per key)',
        values: ['21.12', '~34'],
        verdict: 'every hop a page fault: 7× the I/O for the same keys',
      },
    ],
    source:
      'python solutions/b_tree_high_fanout.py prints this table and asserts: shadow-referee agreement on 20,000 mixed operations including exact range-scan contents; the same-depth invariant and occupancy bounds re-verified recursively at every checkpoint and every fanout; the height dial monotone (t = 2/8/64/512 → 13/5/3/2); the page ledger (2.99 vs 9.53 vs 21.12, with BST > 4× and sorted-file > 2× asserted); the 500-key range scan at 8 pages; and 1,124 splits across 100,000 inserts (< n/32).',
  },

  figure: (
    <Figure
      id="fig-btree-fanout"
      aspect="16 / 7"
      caption="The page is the unit of cost and of growth. Left: a pointer-per-key tree spends one page read per key inspected: ~2 log₂ n reads. Right: the B-tree packs ~128 keys per page, binary-searches inside the page for free, and descends once per level: log₁₂₈ n reads. Growth happens at the root: a full root splits upward, so every leaf sinks together and the same-depth invariant is structural, not maintained."
      cite={{
        text: 'Bayer & McCreight, "Organization and Maintenance of Large Ordered Indices", Acta Informatica 1, 1972 (the Boeing paper that never explained the B); Comer, "The Ubiquitous B-Tree", Computing Surveys 1979.',
        href: 'https://doi.org/10.1007/BF00288683',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="A tall binary tree of single-key pages beside a shallow B-tree of wide pages">
        <text x="40" y="28" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="12">1 key / page: height ~34</text>
        {[0, 1, 2, 3, 4, 5].map((d) => (
          <rect key={d} x={70 + d * 14} y={44 + d * 32} width="26" height="18" fill="rgba(226,96,108,0.15)" stroke="#e2606c" rx="3" />
        ))}
        <text x="70" y="262" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">…28 more hops…</text>
        <text x="66" y="280" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">21.12 pages, measured</text>
        <line x1="320" y1="20" x2="320" y2="270" stroke="#232c40" />
        <text x="352" y="28" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="12">128 keys / page: height 3</text>
        <rect x="420" y="48" width="120" height="20" fill="rgba(98,217,138,0.15)" stroke="#62d98a" rx="3" />
        {[0, 1, 2].map((i) => (
          <rect key={i} x={360 + i * 90} y={110} width="110" height="20" fill="rgba(93,162,255,0.12)" stroke="#5da2ff" rx="3" />
        ))}
        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={i} x={344 + i * 58} y={172} width="52" height="20" fill="rgba(93,162,255,0.10)" stroke="#5da2ff" rx="3" />
        ))}
        <line x1="480" y1="68" x2="415" y2="110" stroke="#62d98a" strokeWidth="1.4" />
        <line x1="415" y1="130" x2="380" y2="172" stroke="#62d98a" strokeWidth="1.4" />
        <text x="352" y="222" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">binary search inside a page is free:</text>
        <text x="352" y="240" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">the page is already in memory</text>
        <text x="352" y="266" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="12">2.99 pages, measured · fanout dial: 13 / 5 / 3 / 2</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'b_tree_high_fanout.py',
  Viz: BTreeViz,
  narration,
};
