import RaftViz from '../viz/RaftViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/raft_leader_election.py?raw';
import { narration } from './raft-leader-election.narration.js';

export const content = {
  given:
    'Five machines, an unreliable network, crashes at arbitrary moments: and a question that must never have two simultaneous answers: who leads?',
  task: "Elect one leader per term, provably: logical terms as epochs, one vote per node per term, majority quorums: with liveness bought by each node's randomized election timeout.",
  constraint:
    'The referee is the raw vote ledger, audited at zero tolerance: 19,248 votes across 3,875 terms with no double votes, no double majorities, no term ever holding two leaders. The ablation removes only the randomness: identical timeouts livelock 0-of-60 elections in five-way splits, while a 150 ms spread resolves 60-of-60, usually in one term.',

  origins: (
    <p>
      Consensus belonged to Paxos for twenty five years: Lamport&apos;s
      1989 protocol, correct and famously impenetrable. Diego Ongaro
      and John Ousterhout&apos;s <strong>Raft</strong> (USENIX ATC{' '}
      <strong>2014</strong>, Best Paper) redesigned for
      understandability: decompose into leader election, log
      replication, and safety; strengthen the leader; and make the
      election a familiar thing: terms as election years, one vote
      per citizen per year, majority wins. A user study in the paper
      measured students learning Raft faster than Paxos: the rare
      algorithm whose headline contribution is pedagogical: and
      industry agreed: etcd (Kubernetes&apos; brain), Consul,
      TiKV, and CockroachDB all run their elections on exactly the
      machinery this page simulates and audits.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>safety machinery</strong>: monotonic{' '}
      <em>terms</em> stamp every message; a node grants at most one
      vote per term (audited: 19,248 votes, zero doubles); a
      candidate needs a strict majority: and since two disjoint
      majorities of five cannot exist, <strong>two leaders in one
      term is arithmetic, not misfortune</strong>: checked across
      all 3,875 terms, including every livelocked one. A stale
      leader hearing a higher term steps down; keepalives from the
      current leader keep follower timers full.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>liveness</strong>: each follower&apos;s
      election timeout is drawn fresh from [T, T + spread], so
      after a leader dies, <em>one</em> node usually wakes first
      and runs unopposed. The ablation is this page&apos;s
      centerpiece: spread zero (identical timers, symmetric
      delays) and all five wake together, vote for themselves,
      split five ways, and repeat: <strong>0 of 60 elections
      resolve in 45 timeout-spans</strong>. Two milliseconds of
      spread: 58 of 60, averaging 12.2 terms. One hundred fifty:
      60 of 60 at 1.00 terms. Safety never depended on the dice:
      liveness was never anything else.
    </p>
  ),

  picture: (
    <p>
      A committee whose chair has stopped answering email. If the
      bylaws say &quot;anyone may call an election after exactly
      ten silent minutes,&quot; all five members hit send at the
      same instant, each votes for their own motion, nothing
      carries, and the cycle repeats forever: polite, symmetric,
      deadlocked. The working bylaw adds one word: wait ten
      minutes <em>plus a random few</em>. Now someone&apos;s
      clock runs out first, their motion reaches everyone before
      any rival motion exists, and it carries four to one. The
      election-year number on every ballot (the term) is what
      keeps a returning chair from confusing the room: mail from
      year 3 is discarded by anyone living in year 5: and the
      majority rule is what makes two simultaneous chairs
      impossible rather than merely unlikely.
    </p>
  ),

  steps: [
    <>
      <strong>Follow:</strong> reset your randomized timer on every
      leader keepalive: a live leader means no elections.
    </>,
    <>
      <strong>Stand:</strong> timer expires: increment the term,
      vote for yourself, ask everyone else.
    </>,
    <>
      <strong>Grant once:</strong> one vote per node per term
      (audited: zero doubles in 19,248): first valid asker wins
      your ballot.
    </>,
    <>
      <strong>Crown on majority:</strong> three of five: disjoint
      majorities cannot exist, so neither can co-leaders: checked
      in every term.
    </>,
    <>
      <strong>Step down on a higher term:</strong> any message
      from the future demotes you: stale leaders are harmless,
      not dangerous.
    </>,
  ],

  signals: [
    <>
      <strong>Exactly-one semantics under failure:</strong> a
      primary database, a lock holder, a job scheduler: anything
      where two simultaneous owners corrupt state.
    </>,
    <>
      <strong>Symmetry must be broken cheaply:</strong> randomized
      timeouts are the lightest tiebreaker there is: no
      configuration, no fixed hierarchy, no single point whose
      death matters more.
    </>,
    <>
      <strong>Auditability matters:</strong> terms and vote
      ledgers make the safety argument checkable from logs: this
      page&apos;s referee is exactly that audit, run at zero
      tolerance.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>promote-on-timeout
      failover</strong>: the standby declares itself primary after
      missed keepalives, no terms, no quorum: which works until
      the first partition, when both sides promote and split-brain
      corrupts data silently. Raft&apos;s election is that same
      timeout instinct with two guardrails welded on: epochs and
      majorities: and this page&apos;s audit is the proof the
      guardrails hold.
    </>
  ),

  strength: (
    <>
      <strong>Safety audited, liveness ablated, recovery
      counted.</strong> Zero safety violations across 19,248
      logged votes in 3,875 terms including every pathological
      livelock round; the randomization shown to be the entire
      liveness story (0/60 without it, 60/60 with, the spread
      dial reproduced between); and the crash client killing the
      leader 120 consecutive times with 120 successors crowned,
      mean gap 211 ms, worst 700 ms, never a headless cluster and
      never a double one.
    </>
  ),
  weakness: (
    <>
      <strong>Elections are the easy half, and quorums have a
      price.</strong> This unit isolates leader election: full
      Raft must also guarantee the new leader holds every
      committed log entry (the up-to-date voting restriction) and
      replicate safely: understandable is not the same as small.
      A five-node cluster tolerates two failures and then{' '}
      <em>stops</em>: losing the quorum halts writes by design:
      availability is deliberately sacrificed to consistency (the
      CAP choice made in advance). Randomized timeouts assume
      timeout spreads dwarf network jitter (150 ms vs 12 ms
      here): in networks where delay rivals the spread, elections
      churn: and a flaky leader that keeps winning re-election is
      a livelock the dice cannot fix (real systems add pre-vote
      and lease checks).
    </>
  ),

  problem: 'Distributed consensus',
  problemSlug: 'distributed-consensus',
  rivals: [
    {
      name: 'Raft × random timeouts',
      isThisUnit: true,
      algoName: 'Raft',
      cost: 'one round typical',
      wins: (
        <>
          <strong>Understandable and auditable</strong>: terms,
          one-vote ledgers, majority crowns: safety you can check
          from logs, run here at zero tolerance.
        </>
      ),
      costs: (
        <>
          Liveness rides the dice: shrink the spread below network
          jitter and elections churn (measured to livelock at
          zero).
        </>
      ),
      when: 'The default consensus core for new systems: etcd, Consul, TiKV chose it for a reason.',
    },
    {
      name: 'Paxos × acceptor quorums',
      algoName: 'Paxos',
      cost: 'two phases per decree',
      wins: (
        <>
          The ancestor and the generality champion: no distinguished
          leader required, proposals survive amid competing
          proposers: the protocol Raft deliberately specialized.
        </>
      ),
      costs: (
        <>
          Famously hard to implement faithfully: the understandability
          gap is the entire reason Raft exists.
        </>
      ),
      when: 'When the literature, formal proofs, or an existing Paxos codebase anchor the work.',
    },
    {
      name: 'Multi-Paxos × stable leader',
      algoName: 'Multi-Paxos',
      cost: 'one phase steady-state',
      wins: (
        <>
          Paxos with Raft&apos;s best idea retrofitted: elect a
          stable proposer once, skip phase one thereafter:
          Chubby&apos;s and Spanner&apos;s road: throughput equal
          to Raft&apos;s.
        </>
      ),
      costs: (
        <>
          The leader-election sub-protocol is left as an exercise:
          precisely the part this page makes rigorous.
        </>
      ),
      when: 'Paxos shops needing steady-state speed: the two families converge in production.',
    },
    {
      name: 'Zab × primary order',
      algoName: 'Zab',
      cost: 'epoch + broadcast',
      wins: (
        <>
          ZooKeeper&apos;s engine: like Raft with epochs and a
          strong primary, plus strict primary-order delivery for
          the watch semantics ZooKeeper promises.
        </>
      ),
      costs: (
        <>
          Coupled to ZooKeeper&apos;s model: chosen by using the
          system, rarely by implementing the protocol.
        </>
      ),
      when: 'When ZooKeeper is already the coordination layer: you are running Zab whether you know it or not.',
    },
  ],
  neverUse: {
    name: 'Promote-on-timeout failover without quorum',
    why: (
      <>
        The standby pings the primary; silence for N seconds
        means &quot;promote myself.&quot; It passes every test in
        development, survives clean crashes in staging, and then
        the first real network partition arrives: both sides
        conclude the other is dead, both promote, and two
        primaries accept conflicting writes for minutes:
        split-brain, the classic HA disaster (the reason STONITH:
        &quot;shoot the other node in the head&quot;: exists as
        an industry term). The failure is structural: a timeout
        can prove silence, never death: distinguishing
        &quot;crashed&quot; from &quot;partitioned away&quot; is
        exactly what a lone node cannot do. Raft&apos;s election
        is this same timeout with the two missing guardrails:
        terms so stale primaries are demoted by arithmetic, and
        quorums so promotion requires the partition&apos;s{' '}
        <em>majority</em> side: this page&apos;s 3,875-term audit
        is the difference between hoping and knowing.
      </>
    ),
  },

  contest: {
    instance:
      'who leads a 5-node cluster; referee: the raw vote ledger, audited: one vote per node per term, one majority per term, every crowned leader holding a logged majority',
    columns: ['elected', 'mean terms'],
    rows: [
      {
        method: 'Identical timeouts',
        values: ['0/60', 'livelock'],
        verdict: 'all five wake together, split five ways, forever: the ablation',
      },
      {
        method: 'Spread 2 ms',
        values: ['58/60', '12.21'],
        verdict: 'a sliver of asymmetry almost suffices',
      },
      {
        method: 'Spread 150 ms',
        isThisUnit: true,
        values: ['60/60', '1.00'],
        best: 0,
        verdict: 'someone always runs unopposed: liveness is the dice',
      },
    ],
    source:
      'python solutions/raft_leader_election.py prints this table and asserts: election safety audited from raw vote records at zero tolerance (19,248 votes in 3,875 terms: no double votes, no double majorities, no term with two leaders, every crowned leader holding a logged majority); the randomization ablation livelocked exactly (0 of 60 elections resolve in 45 timeout-spans with identical timers and symmetric delays); the spread dial reproduced (58/60 at 2 ms averaging 12.21 terms, 60/60 at 10 ms and above, 1.00 terms at 150 ms); and the crash client killing the leader 120 consecutive times with 120 successors crowned (mean gap 211 ms, worst 700 ms).',
  },

  figure: (
    <Figure
      id="fig-raft-election"
      aspect="16 / 7"
      caption="Safety from the quorum, liveness from the dice. Terms are epochs: one vote per node per term, and two disjoint majorities of five cannot exist, so two leaders in one term is forbidden by arithmetic: audited here across 3,875 terms including every livelocked one. The randomized timeout is the entire liveness story: identical timers wake all five at once and split the vote forever (0 of 60, measured), while a spread ten times the network jitter elects in a single term, 60 of 60. The heuristic does not protect correctness: it protects progress: and the protocol is built so that even when the dice go badly, nothing worse than waiting ever happens."
      cite={{
        text: 'Ongaro & Ousterhout, "In Search of an Understandable Consensus Algorithm", USENIX ATC 2014 (Best Paper): consensus redesigned for human working memory: elections, terms, and quorums this page simulates and audits.',
        href: 'https://www.usenix.org/conference/atc14/technical-sessions/presentation/ongaro',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="A five-node cluster with a crowned leader and vote flows, beside the livelock of identical timeouts">
        {[[150, 60], [235, 110], [200, 200], [100, 200], [65, 110]].map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r={17} fill={i === 0 ? 'rgba(98,217,138,0.3)' : 'rgba(154,165,189,0.15)'} stroke={i === 0 ? '#62d98a' : '#9aa5bd'} strokeWidth={i === 0 ? 2.4 : 1.2} />
            {i !== 0 && <line x1={x} y1={y} x2={150 + (x - 150) * 0.22} y2={60 + (y - 60) * 0.22} stroke="#62d98a" strokeWidth="1.4" strokeDasharray="4 3" />}
          </g>
        ))}
        <text x="140" y="38" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="12">♛ term 7</text>
        <text x="40" y="248" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">a spread of timers: one wakes first, four ballots flow, one crown</text>
        {[0, 1, 2, 3, 4].map((i) => (
          <circle key={i} cx={420 + (i % 3) * 60} cy={80 + Math.floor(i / 3) * 70} r={17} fill="rgba(240,185,75,0.3)" stroke="#f0b94b" strokeWidth="2" />
        ))}
        <text x="400" y="38" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="12">identical timers: five candidates</text>
        <text x="400" y="200" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">1-1-1-1-1, term++, repeat: 0/60 ever elect</text>
        <text x="40" y="276" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">audited: 19,248 votes, 3,875 terms, zero double votes, zero double majorities · 120/120 crash successions, worst gap 700 ms</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'raft_leader_election.py',
  Viz: RaftViz,
  narration,
};
