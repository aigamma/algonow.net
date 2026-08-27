// The spoken lesson for puzzle ninety three, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle ninety three: multiversion concurrency control, paired with snapshot timestamps, for transaction isolation. Here is the puzzle. Hundreds of transactions share one database. Readers want a consistent world: a report that sums twenty accounts must not watch money teleport mid scan. Writers want progress: they cannot wait for every report to finish. Locks solve correctness by making everyone queue. Versions solve it by letting everyone coexist: every write creates a NEW timestamped version of its key, and every transaction reads the world as of its own start time. Readers never block writers. Writers never block readers. This page runs a real little engine under an interleaved scheduler and referees it with invariants: two hundred snapshot audits, each summing EXACTLY the invariant total while five hundred transfers commit around them: while a read latest auditor, watching the same storm, saw money vanish in fifty six percent of its audits. And then the page does the honest thing: it makes the one anomaly snapshot isolation cannot see: write skew: happen on demand, and shows both serial orders refusing it.',
  },
  {
    section: 'origins',
    text:
      'Multiversioning is old: David Reed’s nineteen seventy eight thesis sketched it, and Oracle shipped versions in the nineteen eighties. But the modern vocabulary comes from one nineteen ninety five SIGMOD paper: Berenson, Bernstein, Jim Gray, Melton, and the O’Neils: A Critique of ANSI SQL Isolation Levels. It demolished the standard’s fuzzy definitions, defined SNAPSHOT ISOLATION precisely: and, in the same ten pages, named the anomaly snapshot isolation cannot prevent: write skew. Nearly every database you have touched runs some dialect of this page’s engine: PostgreSQL, Oracle, SQL Server’s snapshot mode, InnoDB’s consistent reads. The final chapter came in two thousand eight: Cahill, Roehm, and Fekete’s serializable snapshot isolation: track the dangerous dependency shapes atop snapshots and abort them: cheap enough for production, and now PostgreSQL’s SERIALIZABLE level. The hole stayed open for thirteen years, and closing it earned a best paper award.',
  },
  {
    section: 'pair',
    text:
      'The algorithm owns the version machinery. Each key holds a chain of versions, each stamped with its writer’s commit timestamp. Writes buffer privately inside their transaction and land as new versions at commit: nothing is ever overwritten in place, which is precisely why nothing is ever torn. Commit runs first committer wins: if any key I wrote has gained a version since my snapshot, someone beat me to it: abort. Measured: one thousand conflict rounds, two transactions each reading and incrementing the same counter: the final value equals the number of successful commits EXACTLY, one thousand losers aborted: while the blind engine, no versions, no checks, silently lost one thousand of its two thousand increments. The heuristic is the snapshot timestamp: read the newest version committed no later than your start time: one frozen instant per transaction. Two hundred audits, every sum exact, storm notwithstanding.',
  },
  {
    section: 'picture',
    text:
      'A newspaper photograph of a city. Every reader of the morning edition sees one coherent instant: no half demolished building printed beside its own completed replacement: even though the city kept moving all night. That is the snapshot: internally consistent, honestly dated. The presses never stop for readers, and the readers never delay the presses. And the famous accident lives in the dating. Two city officials each study the SAME photograph. Each sees two bridges open. Each, independently, closes one for repairs: a safe decision, in the photo. Together, they have closed both bridges. No photograph could have warned either one, because neither official touched what the other touched: their edits were disjoint. The conflict was never between their writes. It was between their assumptions: and assumptions do not appear in any version chain.',
  },
  {
    section: 'run',
    text:
      'Here is the run. Begin: stamp the transaction with the current timestamp: its snapshot. Read: newest version at or before the snapshot, own writes first. Write: buffer privately. Commit: first committer wins: check every written key for versions newer than the snapshot: any hit aborts: otherwise stamp a fresh commit timestamp and append the new versions. And vacuum: versions older than every live snapshot can never be read again: garbage. The storm on this page accumulated eight hundred forty four versions across twenty accounts: vacuum reclaimed eight hundred twenty four, leaving exactly one per key, and the ledger is asserted to balance: before equals after plus removed. That bookkeeping is not a footnote: in production PostgreSQL, vacuum is a daily operational concern, and a single forgotten long running transaction: one old snapshot: holds the horizon back and bloats every table behind it.',
  },
  {
    section: 'signals',
    text:
      'The signals that this pair fits. First: read heavy workloads with long reports over live data: the analytics query that would hold locks for minutes holds a snapshot instead, and the transaction traffic never notices it ran. Second: neither side may starve the other: the readers never block writers property is structural: it falls out of never overwriting in place: not a tuning achievement: which is why essentially every serious engine converged on versions. Third, the deciding skill: know which of your invariants span multiple keys. Single key rules: a balance never negative: are safe under first committer wins. Cross key rules: at least one doctor on call, the sum of two budgets under a cap: are exactly where the photograph lies, and those transactions need S S I, an explicit lock, or a materialized conflict row. Reading a schema and naming its cross key invariants is the whole game.',
  },
  {
    section: 'tradeoffs',
    text:
      'Now the rivals. Two phase locking is the elder: acquire locks as you go, release only at the end: truly serializable by construction, no anomaly of any name survives it. Its price is the queue: readers block writers, writers block readers, a long report strangles the afternoon’s traffic, and deadlock detection becomes a way of life. Reach for it when transactions are short, hot, and conflict heavy: blocking briefly can beat aborting repeatedly. Optimistic concurrency control is the cousin creed: run with no locks at all, then validate your READ set at commit: if anything you read has changed, retry. It is first committer wins with the honesty moved from the write set to the read set: beautiful when conflicts are rare, the backbone of in memory engines: and a retry storm when they are not.',
  },
  {
    section: 'tradeoffs',
    text:
      'Serializable snapshot isolation deserves its own chapter, because it is the fix for this page’s demonstrated hole. The two thousand eight insight: every snapshot isolation anomaly, write skew included, requires a specific shape in the dependency graph: two consecutive read write anti dependencies through a pivot transaction. So: keep running plain snapshot isolation, cheaply track those anti dependencies, and abort someone whenever the dangerous shape completes. False positives exist: some innocent transactions die: but write skew becomes impossible, and the cost is a fraction of two phase locking’s. That is PostgreSQL’s SERIALIZABLE today. The strategic summary of the whole family: versions for coexistence: first committer wins for lost updates: S S I or locks for cross key invariants: and the knowledge of which query needs which is worth more than any of the three.',
  },
  {
    section: 'tradeoffs',
    text:
      'And the negative example: last write wins on transactional data. The blind engine this page measures: no versions, no validation, the latest value simply wins: lost one thousand of two thousand increments and tore fifty six percent of concurrent audits: silently, which is the operative word. Last write wins is a legitimate policy in its home country: eventually consistent key value stores reconciling replicas, where dropping a concurrent write is the documented contract and the application signed it. Imported into transactional data: counters, balances, inventory: it is silent data loss with excellent latency. The tell is the word increment: ANY read modify write cycle on latest value storage is a lost update generator, and no retry loop fixes what was never detected. It is this site’s recurring lesson in database costume: the failure is invisible to every test that runs transactions one at a time: and production never runs them one at a time.',
  },
  {
    section: 'code',
    text:
      'The code on this page is a database engine you can read in five minutes. Version chains as lists of timestamp value pairs. Begin, read as of, buffered writes, first committer wins commit, vacuum with the horizon rule. The self test asserts: two hundred snapshot audits equal to the invariant total, exactly, while the read latest auditor tears one hundred thirteen of two hundred on the same interleaved storm: the counter equal to successful commits with exactly one thousand aborted losers, and the blind engine’s loss counted at exactly half: write skew made to occur: both doctors commit, zero on call: and refuted by both serial orders: and vacuum’s ledger balanced version for version. When it prints O K, you have watched the deal every modern database offers: perfect frozen instants, no waiting: and one named, closable hole: run to completion in thirty milliseconds.',
  },
];
