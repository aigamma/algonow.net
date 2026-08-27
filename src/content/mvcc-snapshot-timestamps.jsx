import MVCCViz from '../viz/MVCCViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/mvcc_snapshot_timestamps.py?raw';
import { narration } from './mvcc-snapshot-timestamps.narration.js';

export const content = {
  given:
    'Hundreds of transactions sharing one database: readers demanding a consistent world, writers demanding progress, and locks making everyone queue.',
  task: 'Let them coexist: every write creates a new timestamped version, every transaction reads as of its snapshot: readers never block writers, writers never block readers.',
  constraint:
    'The referees are invariants and replays: 200 snapshot audits each summing exactly the invariant total while 500+ transfers commit around them (the read-latest auditor tears 56% of the time on the same storm); first-committer-wins leaving the counter equal to successful commits exactly; and the write-skew anomaly both demonstrated under snapshot isolation and refuted under both serial orders.',

  origins: (
    <p>
      Multiversioning is old (Reed&apos;s 1978 thesis; Oracle shipped
      it in the 1980s), but the modern vocabulary comes from one
      1995 SIGMOD paper: Berenson, Bernstein, <strong>Jim Gray</strong>,
      Melton, and the O&apos;Neils&apos; &quot;A Critique of ANSI SQL
      Isolation Levels,&quot; which defined <strong>snapshot
      isolation</strong> precisely: and, in the same pages, named
      the anomaly it cannot prevent: <strong>write skew</strong>.
      PostgreSQL, Oracle, SQL Server&apos;s snapshot mode, MySQL
      InnoDB&apos;s reads: everything runs some dialect of this
      page&apos;s engine: and the 2008 discovery of serializable
      snapshot isolation (Cahill et al.) finally closed the
      1995 hole cheaply enough for production, becoming
      PostgreSQL&apos;s SERIALIZABLE.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>version machinery</strong>: each key holds a
      chain of (commit-timestamp, value) versions; writes buffer
      privately and land as new versions at commit; nothing is
      overwritten in place. Commit runs{' '}
      <strong>first-committer-wins</strong>: if any written key
      gained a version after my snapshot, abort: asserted to
      prevent every lost update (1,000 conflict rounds: final
      counter equals successful commits <em>exactly</em>, 1,000
      losers aborted, while the blind engine silently lost 1,000
      of 2,000 increments). Vacuum reclaims versions no live
      snapshot can see: the storm&apos;s 844 versions collapsed to
      20, ledger balanced.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>frozen instant</strong>: a transaction
      reads the newest version committed at or before its start
      timestamp: one consistent world per transaction, regardless
      of what commits mid-flight. Measured: 200 auditors summed 20
      accounts during a 500-transfer storm and every single sum
      equaled the invariant total exactly: while the read-latest
      auditor, on the same storm, saw money vanish in{' '}
      <strong>56% of its audits</strong>. The price is honesty
      about staleness: your snapshot is true <em>as of then</em>,
      and decisions based on it can be outdated by commit time:
      which is exactly the crack write skew climbs through.
    </p>
  ),

  picture: (
    <p>
      A newspaper photograph of a city. Every reader of the morning
      edition sees one coherent instant: no half-demolished
      building shown next to its own already-built replacement:
      even though the city kept moving all night. That is the
      snapshot: internally consistent, honestly dated. The presses
      never stop for readers, and readers never delay the presses.
      The famous accident hides in the dating: two officials each
      study the <em>same photograph</em>, see two bridges open,
      and each closes one for repairs: both decisions were safe in
      the photo: together they closed both bridges. No photograph
      can warn them, because neither touched what the other
      touched: the conflict is between their <em>assumptions</em>,
      not their edits.
    </p>
  ),

  steps: [
    <>
      <strong>Stamp:</strong> begin assigns a snapshot timestamp;
      commit assigns a commit timestamp: time is a counter, not a
      clock.
    </>,
    <>
      <strong>Read as-of:</strong> newest version with commit ≤
      snapshot (own writes first): 200 audits, every sum exact.
    </>,
    <>
      <strong>Write aside:</strong> buffer privately; land as new
      versions at commit: nothing is overwritten, readers are
      never torn.
    </>,
    <>
      <strong>First committer wins:</strong> a written key
      versioned after my snapshot aborts me: lost updates
      prevented to the count.
    </>,
    <>
      <strong>Vacuum behind the horizon:</strong> versions older
      than every live snapshot are garbage: 844 → 20, ledger
      asserted balanced.
    </>,
  ],

  signals: [
    <>
      <strong>Read-heavy with long reports:</strong> analytics over
      a live OLTP store: the reporting query that would hold locks
      for minutes holds a snapshot instead.
    </>,
    <>
      <strong>Writers must not starve readers (or vice versa):</strong>{' '}
      the never-block-each-other property is structural, not
      tuned: it is why every major engine chose versions.
    </>,
    <>
      <strong>Invariants span multiple keys:</strong> then know the
      hole: disjoint-write anomalies (write skew) need SSI,
      explicit locking, or materialized conflicts: the deciding
      skill is naming which queries carry cross-key rules.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>read-latest with blind
      writes</strong>: no versions, no checks: measured tearing
      56% of concurrent audits and silently losing half of 2,000
      increments. Its polished cousin, <strong>two-phase
      locking</strong>, fixes correctness by making everyone
      queue: serializable, and readers block writers block
      readers: the world MVCC was built to escape.
    </>
  ),

  strength: (
    <>
      <strong>Both the guarantee and the hole, demonstrated on the
      same page.</strong> 200 frozen-instant audits exact against
      the invariant; the torn-read rate of the naive reader
      measured at 56% on the identical storm; lost updates
      prevented to the count (and the blind engine&apos;s 50% loss
      quantified); write skew made to happen on demand under SI
      and shown impossible under both serial orders; and
      vacuum&apos;s ledger balanced version-for-version.
    </>
  ),
  weakness: (
    <>
      <strong>Snapshot isolation is not serializability, and
      versions are not free.</strong> Write skew is the proof:
      disjoint writes, each safe in its own snapshot, jointly
      violating a cross-key rule: the 1995 paper named it, this
      page triggers it, and closing it costs SSI&apos;s
      dependency tracking or explicit locks. Version chains are
      real storage (844 accumulated here) and vacuum is a
      first-class operational burden (PostgreSQL admins know):
      long-running snapshots hold the horizon back and bloat
      every table. And first-committer-wins converts contention
      into aborts: hot-key workloads trade deadlocks for retry
      loops.
    </>
  ),

  problem: 'Concurrency control',
  problemSlug: 'concurrency-control',
  rivals: [
    {
      name: 'MVCC × snapshots',
      isThisUnit: true,
      algoName: 'Multiversion concurrency control',
      cost: 'versions + vacuum',
      wins: (
        <>
          <strong>Readers never block writers</strong>: 200 exact
          audits mid-storm: the design every major engine
          converged on.
        </>
      ),
      costs: (
        <>
          Write skew (demonstrated), version bloat (counted), and
          aborts where locks would have queued.
        </>
      ),
      when: 'The default for mixed read/write workloads: which is to say, databases.',
    },
    {
      name: 'Two-phase locking',
      algoName: 'Two-phase locking',
      cost: 'blocking + deadlocks',
      wins: (
        <>
          True serializability by construction: grow locks, then
          only release: no anomaly of any name survives it.
        </>
      ),
      costs: (
        <>
          Readers block writers block readers: long reports
          strangle OLTP: plus deadlock detection as a way of
          life.
        </>
      ),
      when: 'Short, hot, conflict-heavy transactions where blocking beats retrying.',
    },
    {
      name: 'SSI × dangerous structures',
      algoName: 'Serializable snapshot isolation',
      cost: 'SI + dependency tracking',
      wins: (
        <>
          The 2008 fix for the 1995 hole: track rw-antidependencies
          atop snapshots, abort when a dangerous cycle shape
          appears: PostgreSQL&apos;s SERIALIZABLE: write skew dies.
        </>
      ),
      costs: (
        <>
          Tracking overhead and some false-positive aborts: the
          price of closing a hole most workloads never fall
          through.
        </>
      ),
      when: 'Cross-key invariants in the schema: on-call rosters, budget caps, uniqueness-by-convention.',
    },
    {
      name: 'OCC × validation',
      algoName: 'Optimistic concurrency control',
      cost: 'read-validate-write',
      wins: (
        <>
          The cousin creed: run without locks, validate the read
          set at commit: beautiful when conflicts are rare, and
          the backbone of many in-memory engines.
        </>
      ),
      costs: (
        <>
          Validation retries under contention: like
          first-committer-wins with the honesty moved to the read
          set.
        </>
      ),
      when: 'Low-conflict, in-memory, short transactions: validation beats versioning bookkeeping.',
    },
  ],
  neverUse: {
    name: 'Last-write-wins on transactional data',
    why: (
      <>
        The blind engine this page measures: no versions, no
        validation, latest value wins: lost <strong>1,000 of
        2,000 increments</strong> silently and tore 56% of
        concurrent audits. Last-write-wins is a legitimate policy
        in its home country (eventually-consistent KV stores
        reconciling replicas, where losing a concurrent write is
        the documented contract): imported into transactional
        data: counters, balances, inventories: it is silent data
        loss with excellent latency. The tell is the word
        &quot;increment&quot;: any read-modify-write cycle on
        latest-value storage is a lost-update generator, and no
        retry loop fixes what was never detected. The site&apos;s
        recurring lesson in database costume: the failure mode is
        invisible to every test that runs transactions one at a
        time.
      </>
    ),
  },

  contest: {
    instance:
      '500+ interleaved transactions on one store; referee: the invariant total, serial replay, and the anomaly catalog of Berenson et al. 1995',
    columns: ['torn audits', 'lost updates'],
    rows: [
      {
        method: 'Read-latest, blind writes',
        values: ['113/200', '1,000/2,000'],
        verdict: 'money vanishes mid-scan and increments stomp each other: silently',
      },
      {
        method: 'Two-phase locking',
        values: ['0', '0'],
        verdict: 'serializable by queueing: readers and writers take turns',
      },
      {
        method: 'MVCC snapshots',
        isThisUnit: true,
        values: ['0/200', '0'],
        best: 0,
        verdict: 'exact audits mid-storm, no blocking: one named hole (write skew) to know',
      },
    ],
    source:
      'python solutions/mvcc_snapshot_timestamps.py prints this table and asserts: all 200 snapshot audits equal to the invariant total exactly while the read-latest auditor tears 113 of 200 on the same storm; first-committer-wins leaving the counter equal to successful commits exactly (1,000 losers aborted) while the blind engine loses exactly 1,000 of 2,000 increments; the final committed state preserving the total; write skew occurring under SI (both doctors commit, zero on call) and failing under both serial orders; and vacuum reclaiming 824 of 844 versions with the ledger asserted balanced (before == after + removed).',
  },

  figure: (
    <Figure
      id="fig-mvcc-versions"
      aspect="16 / 7"
      caption="Version chains and frozen instants. Every commit appends a timestamped version; a reader resolves each key at the newest version no later than its snapshot line: writers land to the right, readers never wait, and each audit sums one coherent world (200 of 200 exact, mid-storm). The named hole: two transactions photograph the same safe world, write disjoint keys, and both commit: each snapshot was true, together they lied: write skew, defined in the same 1995 paper that defined the guarantee. SSI closes it by watching for the dangerous dependency shape."
      cite={{
        text: 'Berenson, Bernstein, Gray, Melton, O\'Neil & O\'Neil, "A Critique of ANSI SQL Isolation Levels", SIGMOD 1995: snapshot isolation defined, and its one anomaly named, in the same ten pages.',
        href: 'https://doi.org/10.1145/223784.223785',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="Version chains per key with a reader's snapshot line, and the write-skew scenario">
        {['acct A', 'acct B'].map((k, r) => (
          <g key={r}>
            <text x="30" y={64 + r * 46} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">{k}</text>
            <line x1="100" y1={60 + r * 46} x2="600" y2={60 + r * 46} stroke="rgba(154,165,189,0.3)" strokeWidth="1" />
            {[0, 1, 2, 3].map((i) => (
              <rect key={i} x={110 + i * 120 + r * 40} y={48 + r * 46} width={34} height={22} fill={i === 0 ? 'rgba(154,165,189,0.3)' : 'rgba(240,185,75,0.55)'} stroke="#f0b94b" strokeWidth="1" />
            ))}
          </g>
        ))}
        <line x1="330" y1="36" x2="330" y2="128" stroke="#5da2ff" strokeWidth="2" strokeDasharray="5 3" />
        <text x="338" y="42" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="11">reader&apos;s snapshot: resolves left, ignores right</text>
        <text x="100" y="152" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">200/200 audits summed the invariant exactly · read-latest tore 113/200 on the same storm</text>
        <text x="100" y="186" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">write skew: T1 and T2 read the same safe photo, write disjoint keys, both commit: 0 on call</text>
        <text x="100" y="208" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">first-committer-wins: counter == successful commits exactly · blind engine: 1,000 of 2,000 increments lost</text>
        <text x="100" y="240" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">vacuum: 844 versions → 20 (one per key), ledger balanced: old snapshots are storage, not magic</text>
        <text x="100" y="266" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">the fix when invariants span keys: SSI (dangerous-structure detection) or explicit locks</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'mvcc_snapshot_timestamps.py',
  Viz: MVCCViz,
  narration,
};
