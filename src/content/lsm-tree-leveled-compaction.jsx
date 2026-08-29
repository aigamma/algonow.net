import LsmViz from '../viz/LsmViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/lsm_tree_leveled_compaction.py?raw';
import { narration } from './lsm-tree-leveled-compaction.narration.js';

export const content = {
  given:
    'A write-heavy key-value store on page-grain storage. The update-in-place B-tree answers every 32-byte write by rewriting a 4 KB page: a measured 112.7 bytes of device traffic per user byte: the page-per-teaspoon tax.',
  task: 'Never update in place. Buffer writes in a RAM memtable, flush immutable sorted runs, and let background compaction merge them down a geometric cascade of levels, keeping each level one bounded sorted run.',
  constraint:
    'One currency (bytes of storage traffic) and a merciless referee: a plain dict answers every one of 200,000 mixed operations alongside all engines, and every get must match it exactly, mid-flush, mid-compaction, always. The triangle is measured, not recited: write amp 112.7 > 4.2 > 1.8 (b-tree, leveled, tiered), read traffic 36.2 > 19.6 > 12.0 KB per get in the reverse order, space amp 1.32 > 1.06.',

  origins: (
    <p>
      O&apos;Neil, Cheng, Gawlick, and O&apos;Neil,{' '}
      <strong>1996</strong>, named the log-structured merge-tree
      in Acta Informatica, generalizing the 1992 log-structured
      filesystem of Rosenblum and Ousterhout (a rival card below)
      from files to indexes: stop paying a disk seek per update;
      log now, sort later. The idea ran the modern data world:
      Google&apos;s Bigtable (2006) built on it, Dean and
      Ghemawat&apos;s LevelDB (2011) open-sourced the{' '}
      <strong>leveled</strong> compaction policy this page pairs,
      Facebook&apos;s RocksDB industrialized it, and Cassandra
      ships the rival tiered policy as its default. The
      trade-off this page measures has its own name in the
      literature: the RUM conjecture: read, update, and memory
      overheads cannot all be minimized at once: pick your
      corner, and let the compaction policy say which one you
      picked.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>write path that never edits</strong>:
      puts land in a RAM memtable; at 4,096 entries it flushes as
      an immutable sorted run into level zero; reads consult
      memtable, then L0 runs newest-first, then each deeper
      level. Deletes are writes too: a tombstone rides the same
      path and must shadow every older version below it (this
      page&apos;s referee caught a draft that conflated
      &quot;absent&quot; with &quot;deleted&quot; and quietly
      resurrected dead keys: the dict disagreed within 300
      operations). Every byte of traffic is accounted:
      18,861,728 written = 4,456,448 flushed + 14,405,280
      compacted, exactly.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>compaction policy</strong>: which runs
      merge, and when: the dial that picks the storage
      engine&apos;s corner of the triangle. Leveled keeps every
      level a <em>single</em> sorted run within a geometric cap
      (L1 &le; C, L2 &le; 8C, ...), audited here after every one
      of 12 compactions: merging into a level rewrites it, so
      writes cost more (4.2× vs tiered&apos;s 1.8×), but a read
      probes at most one run per level (19.6 KB vs tiered&apos;s
      36.2 KB per get) and dead versions die fast (space 1.06 vs
      1.32). Same LSM machinery, opposite corner: the policy is
      the trade-off.
    </p>
  ),

  picture: (
    <p>
      A kitchen that never files receipts one at a time. Every
      purchase goes on the counter pile (the memtable): instant.
      When the counter fills, the pile is sorted once and dropped
      into the inbox drawer (level zero). The filing rule is the
      heuristic: the inbox merges into a small folder, the small
      folder, when it bulges past its cap, merges into a folder
      eight times bigger, and so on: each merge re-copies a
      folder, which is the write tax, but every folder stays{' '}
      <em>one</em> sorted sheaf, so finding any receipt means
      checking one place per folder size. The alternative filing
      rule (tiered) just stacks sheaves in each drawer and merges
      a drawer only when eight pile up: half the copying, but
      now every lookup riffles a stack per drawer. Neither rule
      is right: one is for kitchens that mostly cook (writes),
      one for kitchens that mostly audit (reads).
    </p>
  ),

  steps: [
    <>
      <strong>Buffer:</strong> writes and tombstones land in the
      memtable: RAM speed, zero device traffic.
    </>,
    <>
      <strong>Flush:</strong> at capacity, sort once and drop an
      immutable run into L0: sequential bytes, never an edit.
    </>,
    <>
      <strong>Compact by level:</strong> L0 merges into L1; any
      level over its geometric cap merges into the next: one
      sorted run per level, invariant audited every time.
    </>,
    <>
      <strong>Read down the cascade:</strong> memtable, L0
      newest-first, then one probe per level, fences pruning
      runs the key cannot touch: 19.6 KB per get, measured.
    </>,
    <>
      <strong>Let tombstones sink:</strong> deletes shadow older
      versions until the bottom merge drops them: space amp
      1.06, dict-verified the whole way.
    </>,
  ],

  signals: [
    <>
      <strong>Writes dominate:</strong> event streams, telemetry,
      message queues, fast-changing state: the B-tree&apos;s
      112.7× page tax is the bill this design exists to duck.
    </>,
    <>
      <strong>Storage loves sequential:</strong> SSDs and shingled
      drives reward big immutable writes and punish scattered
      page edits: flush-and-merge is exactly that shape.
    </>,
    <>
      <strong>You can name your read/write mix:</strong> the
      policy dial is the point: leveled for read-lean-but-real,
      tiered for ingest firehoses, and the numbers to choose by
      are three rows up.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the <strong>B-tree</strong>: one
      page found, one page rewritten, per write: and it wins
      reads outright (12.0 KB per get, fewest anywhere) while
      staying at space amp ~1.0. Its write bill is the story:
      112.7 bytes of traffic per user byte on this workload, 27×
      leveled&apos;s 4.2. Every database is a negotiation between
      these two shapes: read-optimized in place, write-optimized
      append-and-merge.
    </>
  ),

  strength: (
    <>
      <strong>Writes at RAM speed, traffic at cascade
      prices, correctness dict-checked.</strong> Write
      amplification 4.2 against the B-tree&apos;s 112.7 (27×
      less device traffic on the same 200,000 operations), with
      every get: all 60,000 in-stream plus 5,000 against the
      final state: exactly equal to a plain dict&apos;s answer,
      through flushes, compactions, and tombstone shadowing. The
      leveled invariant (one bounded sorted run per level) held
      at every audit, and the accounting closed to the byte.
    </>
  ),
  weakness: (
    <>
      <strong>Reads and space pay the rent, and compaction is a
      tenant.</strong> Point reads cost 19.6 KB here against the
      B-tree&apos;s 12.0: a read must consult the memtable, L0,
      and a run per level (production engines bolt on Bloom
      filters: this site&apos;s own Bloom unit: to skip most
      probes). Space runs 1.06× live data while dead versions
      await their merge. Compaction itself is background work
      that real systems must pace against foreground traffic
      (write stalls are the classic RocksDB operations page).
      And against tiered, leveled is the write-heavier policy:
      4.2 vs 1.8: chosen only because reads matter too.
    </>
  ),

  problem: 'Crash consistency and write paths',
  problemSlug: 'crash-consistency',
  rivals: [
    {
      name: 'LSM × leveled',
      isThisUnit: true,
      algoName: 'Log-structured merge tree',
      cost: 'WA 4.2 · 19.6 KB/get',
      wins: (
        <>
          <strong>The balanced corner</strong>: 27× under the
          B-tree&apos;s write tax while holding reads to one run
          per level and space to 1.06: RocksDB&apos;s default for
          a reason.
        </>
      ),
      costs: (
        <>
          Rewrites the target level per merge: 2.3× tiered&apos;s
          write traffic: and reads still trail the B-tree.
        </>
      ),
      when: 'Write-heavy stores that still serve real point reads: the general-purpose engine.',
    },
    {
      name: 'LSM × tiered',
      algoName: 'Log-structured merge tree',
      cost: 'WA 1.8 · 36.2 KB/get',
      wins: (
        <>
          Same machinery, opposite corner: stack runs, merge a
          level only when full: write amp 1.8, the ingest
          champion (Cassandra&apos;s default).
        </>
      ),
      costs: (
        <>
          A stack of runs per level: 36.2 KB per get and space
          amp 1.32 while duplicates await their merge.
        </>
      ),
      when: 'Firehose ingest, scans over point reads, time-series that compacts by age.',
    },
    {
      name: 'B-tree',
      cost: 'WA 112.7 · 12.0 KB/get',
      wins: (
        <>
          The live unit: fewest bytes per read of anything here,
          space ~1.0, predictable latency, no background
          machinery: five decades of default for a reason.
        </>
      ),
      costs: (
        <>
          One 4 KB page rewritten per 32-byte write: 112.7 bytes
          of traffic per user byte, measured.
        </>
      ),
      when: 'Read-dominated or balanced workloads: still the right first answer.',
    },
    {
      name: 'Log-structured filesystem',
      cost: 'sequential logs + cleaning',
      wins: (
        <>
          The 1992 ancestor: whole filesystems as one append-only
          log, with segment cleaning as its compaction: the idea
          the LSM tree lifted into indexes.
        </>
      ),
      costs: (
        <>
          Cleaning cost explodes as the disk fills, and reads
          scatter across the log without an index structure.
        </>
      ),
      when: 'As lineage and as the design language of flash translation layers today.',
    },
  ],
  neverUse: {
    name: 'One giant sorted file, rewritten per flush',
    why: (
      <>
        The tempting middle: keep exactly one sorted file and
        merge each memtable flush into it: sorted reads, simple
        code, no cascade to reason about. Measured here: write
        amplification <strong>13.3, and growing</strong>: it was
        7.3 at half the dataset, because every flush rewrites{' '}
        <em>everything</em>, so the tax scales with total data
        rather than with the write. At 10× the data it is
        roughly 10× worse; the cascade&apos;s amplification is
        capped by its level count regardless of size. That
        unboundedness is the disqualifier: the geometric levels
        are not an optimization of this design, they are the
        repair of it. (History agrees: this is the 1970s
        sort-merge file pattern the LSM paper was written to
        retire.)
      </>
    ),
  },

  contest: {
    instance:
      '200,000 mixed ops (60% put, 10% delete, 30% get) on a 400,000-key space; one currency: bytes of storage traffic; referee: a plain dict on every get',
    columns: ['b-tree', 'lsm-leveled', 'lsm-tiered'],
    rows: [
      {
        method: 'Write amp (bytes written / user byte)',
        isThisUnit: true,
        values: ['112.7', '4.2', '1.8'],
        best: 2,
        verdict: 'the page-per-teaspoon tax vs batched cascades: 27× under the B-tree',
      },
      {
        method: 'Read traffic per get (KB)',
        values: ['12.0', '19.6', '36.2'],
        best: 0,
        verdict: 'the other side of the triangle: in-place wins reads; leveled holds to one run per level',
      },
      {
        method: 'Space amp (resident / live)',
        values: ['~1.0', '1.06', '1.32'],
        best: 0,
        verdict: 'dead versions wait for their merge: leveled buries them 5× faster than tiered',
      },
    ],
    source:
      'python solutions/lsm_tree_leveled_compaction.py prints this table and asserts: every get equal to a plain dict across all 200,000 operations and 5,000 final-state reads, on all engines, through flushes, compactions, and tombstone shadowing; the leveled invariant (one sorted duplicate-free run per level, caps respected, L0 bounded) after every one of 12 leveled and 6 tiered compactions; the accounting identity written == flushed + compacted to the byte; both triangle orderings (write amp 112.7 > 4.2 > 1.8, read 36.2 > 19.6 > 12.0, space 1.32 > 1.06); and the giant-file write amp above leveled and growing with data size (7.3 at half, 13.3 at full).',
  },

  figure: (
    <Figure
      id="fig-lsm-cascade"
      aspect="16 / 7"
      caption="Log now, sort later, merge down a cascade. Writes buffer in RAM and flush as immutable sorted runs; leveled compaction keeps each level one bounded run (L1 ≤ C, L2 ≤ 8C, ...), so a read probes at most one run per level while each merge rewrites its target level. Measured on 200,000 dict-refereed operations: write amp 4.2 vs the B-tree's 112.7 and tiered's 1.8; read traffic 19.6 KB/get between the B-tree's 12.0 and tiered's 36.2; space amp 1.06 vs 1.32. The compaction policy chooses the engine's corner of the read/update/memory triangle."
      cite={{
        text: 'P. O\'Neil, E. Cheng, D. Gawlick, E. O\'Neil, "The log-structured merge-tree (LSM-tree)," Acta Informatica 33(4), 1996. DOI 10.1007/s002360050048. After Rosenblum-Ousterhout\'s LFS (1992); leveled policy via LevelDB (2011).',
        href: 'https://doi.org/10.1007/s002360050048',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="Memtable flushing into a cascade of levels, with the write and read triangle measured">
        <rect x="40" y="24" width="120" height="26" fill="rgba(240,185,75,0.18)" stroke="#f0b94b" strokeWidth="1.6" rx="4" />
        <text x="52" y="41" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">memtable (RAM)</text>
        <path d="M 100 50 v 16" stroke="#9aa5bd" strokeWidth="1.4" />
        <text x="110" y="64" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">flush: immutable sorted run</text>
        {[0, 1, 2].map((i) => (
          <rect key={i} x={40 + i * 34} y={70} width={28} height={16} fill="rgba(93,162,255,0.16)" stroke="#5da2ff" strokeWidth="1.3" rx="3" />
        ))}
        <text x="150" y="82" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="10">L0: a few fresh runs</text>
        <path d="M 80 86 v 18" stroke="#9aa5bd" strokeWidth="1.4" />
        <rect x="40" y="106" width="110" height="16" fill="rgba(93,162,255,0.16)" stroke="#5da2ff" strokeWidth="1.4" rx="3" />
        <text x="160" y="118" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">L1: ONE sorted run ≤ C (audited)</text>
        <path d="M 95 122 v 18" stroke="#9aa5bd" strokeWidth="1.4" />
        <rect x="40" y="142" width="240" height="16" fill="rgba(93,162,255,0.16)" stroke="#5da2ff" strokeWidth="1.4" rx="3" />
        <text x="290" y="154" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">L2: one run ≤ 8C: merging in REWRITES it (the write tax)</text>
        <path d="M 160 158 v 18" stroke="#9aa5bd" strokeWidth="1.4" />
        <rect x="40" y="178" width="420" height="16" fill="rgba(98,217,138,0.14)" stroke="#62d98a" strokeWidth="1.4" rx="3" />
        <text x="470" y="190" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="10">bottom: tombstones die here</text>
        <text x="40" y="218" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="11">a get probes: memtable → L0 (newest first) → one run per level: 19.6 KB measured</text>
        <text x="40" y="244" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">the triangle: write amp 112.7 (b-tree) &gt; 4.2 (leveled) &gt; 1.8 (tiered) · read KB 36.2 &gt; 19.6 &gt; 12.0 · space 1.32 &gt; 1.06</text>
        <text x="40" y="266" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">the giant-file trap: rewrite everything per flush: WA 13.3 and growing with data (7.3 at half): the cascade caps it</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'lsm_tree_leveled_compaction.py',
  Viz: LsmViz,
  narration,
};
