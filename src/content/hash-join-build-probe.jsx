import HashJoinViz from '../viz/HashJoinViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/hash_join_build_probe.py?raw';
import { narration } from './hash-join-build-probe.narration.js';

export const content = {
  given:
    'Two tables and a shared key: customers and their orders: the single most executed operation in every database on earth.',
  task: 'The equi-join: every matching pair of rows: computed by building a hash table on the small side and streaming the big side past it.',
  constraint:
    'Two rival join algorithms referee: nested-loop and sort-merge must produce the identical multiset of output rows on 200 instances deliberately thick with duplicate keys, where multiplicity bugs live. Every meter is an exact count: the all-pairs bill is asserted to equal |R|·|S| to the comparison.',

  origins: (
    <p>
      The join is relational algebra&apos;s beating heart, and for
      its first decade it meant nested loops or sort-merge. The hash
      revolution came from Tokyo: Kitsuregawa, Tanaka, and Moto-Oka&apos;s{' '}
      <strong>GRACE</strong> machine (<strong>1983</strong>) showed
      that partitioning both relations by a hash of the key turns
      one huge join into k independent small ones: and DeWitt&apos;s
      GAMMA project carried the idea into software, where hybrid
      hash join became the workhorse of query engines. Today the
      build-probe loop on this page is, with vectorized and
      radix-partitioned refinements, what actually runs when you
      type JOIN: the optimizer&apos;s job is largely deciding which
      side builds and whether memory holds it.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>two phases</strong>. Build: insert each row
      of one relation into a hash table keyed on the join column
      (500 inserts here). Probe: stream the other relation; each row
      hashes to exactly one bucket, walks its short chain, and emits
      a joined row per true match (20,000 probes, 488× under the
      all-pairs scan). Correctness rides on a homely fact: equal
      keys hash equally, so every match lives in the bucket the
      probe visits: nothing is elsewhere. Duplicates are honest
      work: chains hold them, and the referee&apos;s 200
      duplicate-heavy instances check every multiplicity.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>choices around the table</strong>. Which
      side builds? The smaller: measured here as identical output at{' '}
      <strong>40× less memory</strong> (500 vs 20,000 entries).
      What if the build side outgrows memory? <strong>Partition
      first</strong> (the GRACE idea): hash both relations into k
      buckets on disk, join bucket pairs independently: the union
      is exactly the full join, asserted. The heuristic&apos;s
      fine print is measured too: partitioning cannot split a
      single hot key (13× skew, shown), and the whole scheme is
      only as good as its hash: a constant hash pays exactly
      |R|·|S| touches: the nested loop, reborn.
    </p>
  ),

  picture: (
    <p>
      A wedding planner matches 20,000 RSVP cards to 500 guest
      files. The all-pairs way: for every card, riffle through
      every file: ten million riffles. The hash way: first spread
      the 500 files across 26 labeled trays by last initial (the
      build). Then take each card once, walk straight to its tray,
      and check the two or three files inside (the probe). The
      cards never see the other trays. Build on the files, not the
      cards: 500 files fit on the table; 20,000 cards would not.
      And if some prankster labels every tray &quot;S&quot;, the
      scheme silently collapses back into riffling everything:
      the trays were only ever as good as the labeling.
    </p>
  ),

  steps: [
    <>
      <strong>Pick the build side:</strong> the smaller relation:
      identical output, 40× less memory, measured.
    </>,
    <>
      <strong>Build:</strong> hash each build row&apos;s key into a
      bucket chain: 500 inserts, one pass.
    </>,
    <>
      <strong>Probe:</strong> stream the big side: each row visits
      exactly one bucket, walks its chain, emits a row per true
      match: equal keys hash equally, so nothing hides elsewhere.
    </>,
    <>
      <strong>Partition when memory breaks:</strong> GRACE: hash
      both sides into k spill partitions, join each pair, union:
      exactly the full join, asserted.
    </>,
    <>
      <strong>Respect the fine print:</strong> one hot key skews
      its partition 13× (hash cannot split a key), and a degenerate
      hash pays exactly |R|·|S|: measured, both.
    </>,
  ],

  signals: [
    <>
      <strong>Equality is the predicate:</strong> equi-joins,
      lookups, semi-joins: hashing needs =: for range predicates
      the ordered roads (sort-merge, indexes) own the job.
    </>,
    <>
      <strong>One side is small (or memory is):</strong> a build
      side that fits in RAM makes the join one streaming pass over
      the big side: the shape of star-schema analytics.
    </>,
    <>
      <strong>No useful order exists or survives:</strong>{' '}
      hash join neither needs sorted inputs nor produces sorted
      output: when the plan upstream and downstream is unordered,
      nothing is wasted.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the <strong>nested loop</strong>:
      compare every pair: 10,000,000 comparisons here, asserted to
      equal |R|·|S| exactly: correct, order-free, and the right
      tool only for tiny inputs or non-equality predicates. The
      ordered rival, <strong>sort-merge</strong>, paid 245,177
      comparisons on the same workload: two sorts, then one linear
      zip.
    </>
  ),

  strength: (
    <>
      <strong>Every claim is an exact count, refereed twice.</strong>{' '}
      200 duplicate-heavy instances where hash, nested-loop, and
      sort-merge produce the identical output multiset; the
      all-pairs bill exact (10,000,000); build+probe at 20,500
      (488×); the build-side memory rule at precisely 40×; GRACE
      partition joins unioning to exactly the full join; and both
      failure modes priced: 13× partition skew from one hot key,
      and constant-hash degradation to exactly |R|·|S| touches.
    </>
  ),
  weakness: (
    <>
      <strong>Equality-only, memory-hungry, and quietly fragile to
      skew and bad hashing.</strong> No range predicates, no sorted
      output for free. The build table is real memory, and when it
      overflows, GRACE partitioning saves the join except where it
      can&apos;t: a single white-hot key (every order pointing at
      one customer) lands whole in one partition, 13× the mean
      here, and no partition count fixes it: engines fall back to
      skew-specific plans. And the whole edifice stands on hash
      quality: the sabotage meter&apos;s constant hash quietly
      turned 826 touches into 400,000: the nested loop, wearing a
      hash join&apos;s name.
    </>
  ),

  problem: 'Relational joins',
  problemSlug: 'relational-joins',
  rivals: [
    {
      name: 'Hash join × build-probe',
      isThisUnit: true,
      algoName: 'Hash join',
      cost: 'O(|R| + |S|)',
      wins: (
        <>
          <strong>One pass each side</strong>: 20,500 touches where
          all-pairs pays 10,000,000: the default equi-join in every
          engine.
        </>
      ),
      costs: (
        <>
          Equality only, a real memory footprint, and measured
          fragility to skew and hash quality.
        </>
      ),
      when: 'The equi-join workhorse: one side fits in memory, no order needed.',
    },
    {
      name: 'Sort-merge join',
      algoName: 'Sort-merge join',
      cost: 'O(n log n + m log m)',
      wins: (
        <>
          Sort both, zip once: 245,177 comparisons here: and the
          output arrives <em>sorted</em>: free when inputs already
          are (indexes, clustered storage), graceful under skew.
        </>
      ),
      costs: (
        <>
          The sorts dominate when no order pre-exists: 12× this
          page&apos;s hash bill on the same workload.
        </>
      ),
      when: 'Inputs pre-sorted, output order wanted downstream, or skew too ugly for hashing.',
    },
    {
      name: 'Index nested loop',
      algoName: 'Index nested loop join',
      cost: 'O(|S| · log |R|)',
      wins: (
        <>
          When the build side already has a B-tree (the live B+
          unit&apos;s territory), each probe is an index descent:
          no build phase at all: unbeatable when the probe side is
          tiny or highly selective.
        </>
      ),
      costs: (
        <>
          Per-probe log cost and random I/O: streams of millions of
          probes want the hash table&apos;s O(1).
        </>
      ),
      when: 'A few selective probes against an already-indexed table: point lookups, not scans.',
    },
    {
      name: 'Grace hash join',
      algoName: 'Grace hash join',
      cost: 'O(|R| + |S|), spilled',
      wins: (
        <>
          The disk sibling: partition both sides by key hash into
          spill files, join partition pairs: this page&apos;s union
          oracle in production form: joins bigger than memory,
          priced at one extra read-write pass.
        </>
      ),
      costs: (
        <>
          The extra pass, and the skew wall this page measures:
          hot keys defeat partitioning.
        </>
      ),
      when: 'The build side outgrows RAM: partition first, then run this unit k times.',
    },
  ],
  neverUse: {
    name: 'Nested loop on a large equi-join',
    why: (
      <>
        The nested loop is real, honest, and correct: it is this
        page&apos;s referee, and on tiny inputs or non-equality
        predicates (range joins, similarity joins) it is the right
        tool. But shipped as the plan for a plain equi-join at
        scale, it pays the measured 10,000,000 comparisons where
        20,500 suffice: 488×: and the ratio grows as the product of
        the table sizes forever. Every mature optimizer treats an
        unindexed nested-loop equi-join at scale as a planning
        failure. The deeper lesson is the sabotage meter: a hash
        join with a degenerate hash IS this disaster wearing a
        better name: 400,000 touches, exactly |R|·|S|: so the
        never-use is really one rule: never pay all-pairs prices
        for an equality predicate, under any spelling.
      </>
    ),
  },

  contest: {
    instance:
      'an equi-join of 500 build rows with 20,000 probe rows; referee: nested-loop and sort-merge joins, all three producing the identical multiset on 200 duplicate-heavy instances',
    columns: ['work', 'nature'],
    rows: [
      {
        method: 'Nested loop',
        values: ['10,000,000', 'exact'],
        verdict: 'every pair compared: the referee, and the bill to never pay',
      },
      {
        method: 'Sort-merge',
        values: ['245,177', 'exact, ordered'],
        verdict: 'two sorts then one zip: wins when order pre-exists',
      },
      {
        method: 'Hash join, build small',
        isThisUnit: true,
        values: ['20,500', 'exact'],
        best: 0,
        verdict: '500 builds + 20,000 probes: 488× under all-pairs',
      },
    ],
    source:
      "python solutions/hash_join_build_probe.py prints this table and asserts: 200 duplicate-heavy instances where hash, nested-loop, and sort-merge joins produce the identical sorted multiset; the nested-loop bill exactly |R|·|S| = 10,000,000; hash speedup above 400× (measured 488×); the build-side flip yielding identical rows at exactly |S|/|R| = 40× the memory; GRACE partition joins (16 partitions) unioning to exactly the full join with uniform keys balanced (max 32 vs mean 31) and one hot key skewing 13× the mean; and the constant-hash sabotage paying exactly |R|·|S| touches (400,000 vs 826, 484×).",
  },

  figure: (
    <Figure
      id="fig-hashjoin-grace"
      aspect="16 / 7"
      caption="The GRACE idea: equal keys hash equally, so partitioning BOTH relations by the same hash of the key splits one huge join into k independent small ones whose union is exactly the full join: asserted on this page. The fine print is measured too: partitioning cannot split a single key, so one white-hot key drags its whole partition 13× past the mean, and the entire scheme stands on hash quality: a constant hash pays exactly |R|·|S| touches: the nested loop, reborn under a better name."
      cite={{
        text: 'Kitsuregawa, Tanaka & Moto-Oka, "Application of Hash to Data Base Machine and Its Architecture", New Generation Computing 1, 1983: the GRACE machine that made partitioned hash joins the industry road.',
        href: 'https://doi.org/10.1007/BF03037022',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="Two relations partitioned by the same key hash into aligned buckets, each bucket pair joined independently">
        <rect x="40" y="30" width="120" height="44" fill="rgba(240,185,75,0.25)" stroke="#f0b94b" strokeWidth="1.6" />
        <text x="58" y="56" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="12">R: 500 rows</text>
        <rect x="40" y="196" width="120" height="44" fill="rgba(93,162,255,0.25)" stroke="#5da2ff" strokeWidth="1.6" />
        <text x="52" y="222" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="12">S: 20,000 rows</text>
        {[0, 1, 2, 3].map((i) => {
          const x = 250 + i * 92;
          const hot = i === 1;
          return (
            <g key={i}>
              <rect x={x} y={60} width={64} height={hot ? 44 : 26} fill={hot ? 'rgba(226,96,108,0.35)' : 'rgba(240,185,75,0.25)'} stroke={hot ? '#e2606c' : '#f0b94b'} strokeWidth="1.4" />
              <rect x={x} y={170} width={64} height={26} fill="rgba(93,162,255,0.25)" stroke="#5da2ff" strokeWidth="1.4" />
              <line x1={x + 32} y1={hot ? 104 : 86} x2={x + 32} y2={170} stroke="#62d98a" strokeWidth="1.8" strokeDasharray="4 3" />
              <text x={x + 8} y={152} fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="10">join {i}</text>
              <line x1="160" y1="52" x2={x + 32} y2={hot ? 60 : 60} stroke="#f0b94b" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="160" y1="218" x2={x + 32} y2="196" stroke="#5da2ff" strokeWidth="1" strokeDasharray="3 3" />
            </g>
          );
        })}
        <text x="250" y="40" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">hash(key) % k routes BOTH sides the same way</text>
        <text x="342" y="120" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="10">the hot key: 13× the mean</text>
        <text x="250" y="222" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">union of partition joins == full join, asserted</text>
        <text x="40" y="272" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">measured: all-pairs 10,000,000 · sort-merge 245,177 · build+probe 20,500 (488×) · constant hash: 400,000, exactly |R|·|S|</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'hash_join_build_probe.py',
  Viz: HashJoinViz,
  narration,
};
