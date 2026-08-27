// The spoken lesson for puzzle ninety, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle ninety: Raft, paired with leader election under randomized terms, for distributed consensus. Here is the puzzle. Five machines, an unreliable network, crashes at arbitrary moments: and one question that must never, under any interleaving of failures, have two simultaneous answers: who is the leader right now? Two leaders means two machines accepting writes, and that means silent data corruption: the one outcome a storage system may never produce. The method: logical terms as election epochs, one vote per node per term, a majority to win: and a randomized election timeout so that somebody usually runs unopposed. The referee on this page is the raw vote ledger itself, audited at zero tolerance: nineteen thousand two hundred forty eight votes across three thousand eight hundred seventy five terms: no node ever voting twice in a term, no term ever holding two majorities, no term ever crowning two leaders. And the heuristic is put on trial by ablation: remove only the randomness, and the cluster livelocks forever: zero of sixty elections resolve. Restore it: sixty of sixty.',
  },
  {
    section: 'origins',
    text:
      'For twenty five years, consensus meant Paxos: Leslie Lamport’s protocol, correct, foundational, and famously impenetrable: the standard joke was that there were only five people who understood it, and they disagreed about what it said. Diego Ongaro and John Ousterhout published Raft at USENIX A T C twenty fourteen, and the title says the whole ambition: In Search of an Understandable Consensus Algorithm. Decompose the problem: leader election, log replication, safety. Strengthen the leader. Make elections familiar: terms as election years, one vote per citizen per year, majority wins. The paper measured its own contribution with a user study: students learned Raft faster than Paxos: and it took the Best Paper award. Industry voted next: et c d, the brain of Kubernetes: Consul: Ti K V: Cockroach D B: all of them elect their leaders with exactly the machinery this page simulates.',
  },
  {
    section: 'pair',
    text:
      'The algorithm owns safety. Every message carries a term number, and terms only rise. A node grants at most one vote per term: this page audits that from the ledger: nineteen thousand votes, zero doubles. A candidate becomes leader only on a strict majority: three of five: and here is the whole safety proof in one sentence: two disjoint majorities of five machines cannot exist, so two leaders in one term is forbidden by arithmetic, not discouraged by hope. A deposed or partitioned leader that hears a higher term steps down instantly: stale leaders are harmless, not dangerous. The heuristic owns liveness. Each follower draws its election timeout fresh from an interval: base plus a random spread: so when the leader dies, one timer usually expires well before the rest, and that node collects votes before any rival even stands. Safety never depends on the dice. Liveness is nothing but the dice: and this page proves both halves by experiment.',
  },
  {
    section: 'picture',
    text:
      'A committee whose chair has stopped answering email. Suppose the bylaws say: anyone may call an election after exactly ten silent minutes. Then all five members hit send at the same instant, each votes for their own motion, nothing carries three votes, and the cycle repeats: polite, symmetric, and deadlocked forever. The working bylaw adds three words: plus random minutes. Now someone’s clock runs out first, their motion reaches every inbox before any rival motion exists, and it carries four to one. The election year printed on every ballot is the term, and it is what keeps a returning chair from confusing the room: a motion stamped year three is discarded on sight by anyone living in year five. And the majority rule is what makes two simultaneous chairs impossible: not unlikely, impossible: because two disjoint majorities of five people do not exist.',
  },
  {
    section: 'run',
    text:
      'Here is the run, as this page’s simulator executes it. Follow: each node resets its randomized timer every time the leader’s keepalive arrives: a healthy leader means elections never start. Stand: a timer expires: the node increments its term, votes for itself, and asks the other four. Grant once: each node’s first valid request in a term gets its ballot: everyone else is refused. Crown on majority: three votes of five: the winner starts sending keepalives, and every follower’s timer refills. Step down on a higher term: any message from the future demotes you on the spot. The crash client runs this gauntlet one hundred twenty times in a row: kill the leader, watch the succession: one hundred twenty successors crowned, mean gap two hundred eleven milliseconds, worst seven hundred: and across every one of those transitions, the ledger audit found no term that ever held two leaders. The cluster was never headless for long, and never two headed at all.',
  },
  {
    section: 'signals',
    text:
      'The signals that this pair fits. First: exactly one semantics under failure: a primary database, a lock holder, a job scheduler, anything where two simultaneous owners corrupt state: that is consensus shaped, and timeouts alone will not survive a partition. Second: symmetry must be broken, and broken cheaply: randomized timeouts are the lightest tiebreaker in the catalog: no fixed hierarchy, no configuration file ranking the nodes, no special machine whose death matters more than the others. The same trick: randomization as symmetry breaking: runs through this site: quickselect’s pivots, Welzl’s shuffle, Karger’s contractions: here it buys liveness for a distributed system. Third: auditability matters. Terms and one vote ledgers make the safety argument checkable from logs after the fact: this page’s referee is exactly that audit, and production systems run the same check when the stakes are real.',
  },
  {
    section: 'tradeoffs',
    text:
      'Now the rivals, which are one family with different accents. Paxos, with proposer acceptor quorums, is the ancestor and the generality champion: no distinguished leader is required at all, proposals can survive amid competing proposers, and the safety core is bulletproof. Its cost is the reason Raft exists: implementing Paxos faithfully is notoriously hard, and the understandability gap between the papers is the entire story. Multi Paxos closes most of the practical distance from the other side: elect a stable proposer once, skip the first phase thereafter: Chubby and Spanner run on it: and in the steady state it and Raft are nearly the same machine. The honest summary: the two families converged in production, and the choice is usually about which literature, which proofs, and which existing codebase anchor your system: for a new build, Raft’s teachability wins, which is why the new infrastructure of the last decade chose it.',
  },
  {
    section: 'tradeoffs',
    text:
      'Zab: ZooKeeper’s atomic broadcast: is the third accent: epochs like terms, a strong primary like Raft’s leader, plus a strict primary order delivery guarantee that ZooKeeper’s watch semantics require. Almost nobody implements Zab: you choose it by running ZooKeeper, and thousands of systems do. And the limits of this page’s own unit deserve saying plainly. Leader election is the easy half of Raft: full Raft must also guarantee that a new leader already holds every committed log entry: that is the up to date restriction on voting: and must replicate safely. A five node cluster tolerates two failures and then stops accepting writes: losing the quorum halts the system by design: consistency deliberately chosen over availability. And the dice have fine print: the analysis assumes the timeout spread dwarfs network jitter: one hundred fifty versus twelve milliseconds here. Shrink that ratio and elections churn: this page measured the extreme: at spread two milliseconds, fifty eight of sixty elected, but averaging twelve terms of split votes to get there.',
  },
  {
    section: 'tradeoffs',
    text:
      'And the negative example: promote on timeout failover, without quorum. The standby pings the primary: silence for N seconds means promote myself. It passes every test in development. It survives clean crashes in staging. Then the first real network partition arrives: both sides conclude the other is dead: both promote: and two primaries accept conflicting writes for minutes. Split brain: the classic high availability disaster, so classic the industry named its remedy STONITH: shoot the other node in the head. The failure is structural, not a tuning problem: a timeout can prove silence: it can never prove death: and distinguishing crashed from partitioned away is precisely what a lone node cannot do. Raft’s election is this same timeout instinct with the two missing guardrails welded on: terms, so a stale primary is demoted by arithmetic the moment it reconnects: and quorums, so promotion is only possible on the majority side of any partition. The audit on this page: three thousand terms, zero double leaders: is the measured difference between hoping and knowing.',
  },
  {
    section: 'code',
    text:
      'The code on this page is a discrete event simulator and its auditor. The event queue carries alarms, vote requests, grants, and keepalives, each with its own network delay. Nodes hold a term, a vote, a role, and a randomized alarm. The audit function replays the raw vote ledger: at most one vote per node per term: at most one majority per term: every crowned leader holding a logged majority. The self test asserts: safety at zero tolerance across every run, including the pathological ones: the ablation livelocking exactly: zero of sixty elections with identical timers: the spread dial reproducing the paper’s shape: fifty eight of sixty at two milliseconds, sixty of sixty from ten up, one point zero terms at one fifty: and one hundred twenty crash successions, every one crowned, gaps bounded. When it prints O K, you have watched the theorem that runs the cloud: safety from the quorum, liveness from the dice: hold, both halves, under fire.',
  },
];
