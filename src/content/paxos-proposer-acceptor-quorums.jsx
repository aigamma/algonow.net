import PaxosViz from '../viz/PaxosViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/paxos_proposer_acceptor_quorums.py?raw';
import { narration } from './paxos-proposer-acceptor-quorums.narration.js';

export const content = {
  given:
    'Five acceptors that can crash, a network that delays, reorders, and drops, and three proposers each pushing a different value: the cluster must settle on one value and must never, even for an instant, hold two.',
  task: 'Two phases, both addressed to every acceptor: prepare with a ballot number and collect promises, then accept a value and collect acceptances. A phase counts only when a majority answers, and a proposer that wins the prepare phase must carry forward the highest-ballot value its majority already accepted.',
  constraint:
    'Safety is not sampled. An exhaustive model check of a 3-acceptor, 2-proposer system explores every delivery order and every drop (1,439,849 reachable states) and finds at most one value ever chosen. Remove the heuristic and the same checker finds two chosen values within 453 states (half quorums) or 731 states (no prepare phase). Liveness, crashes, and the two-phase-commit disaster are measured on 40 seeded adversarial runs.',

  origins: (
    <p>
      Leslie Lamport wrote <strong>The Part-Time Parliament</strong>{' '}
      in 1990 as a story about the legislature of a Greek island
      whose members wandered in and out of the chamber; the
      reviewers found the joke tiresome and the paper sat until
      ACM Transactions on Computer Systems printed it in 1998. It
      is the algorithm underneath Google&apos;s Chubby lock service
      (2006) and Spanner, Microsoft&apos;s Autopilot, and the
      replicated logs of most databases that survive a crashed
      node. <strong>Paxos Made Simple</strong> (2001) restated it
      in plain English in two pages, and Fischer, Lynch, and
      Paterson&apos;s 1985 impossibility result explains why the
      protocol can promise safety always but progress only when the
      network cooperates: no asynchronous protocol can promise both.
      Raft (2014) is the same quorum idea rebuilt around a stable
      leader so that people could understand it.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>two-phase choreography</strong>. Prepare: a
      proposer picks a ballot number larger than any it has used
      and asks every acceptor to promise never to accept a lower
      ballot, and to report the highest-ballot value it has already
      accepted. Accept: with promises from a majority in hand, the
      proposer asks the same acceptors to accept a value under that
      ballot. An acceptor keeps three numbers and nothing else: the
      ballot it promised, the ballot it accepted, the value it
      accepted. The referee is exhaustive: on a 3-acceptor,
      2-proposer system the self-test enumerates{' '}
      <strong>1,439,849 reachable states</strong> under every
      delivery order and every possible drop, and in none of them
      is more than one value ever chosen.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>quorum rule</strong>: nothing counts
      until a majority of acceptors has answered, and the winning
      proposer must adopt the highest-ballot value already accepted
      inside that majority. Any two majorities of five share at
      least one acceptor, and that acceptor is the protocol&apos;s
      memory: once a value is chosen by one majority, every later
      prepare phase meets a witness who forces the same value
      forward. The ablations prove the rule is load-bearing. Quorums
      of two out of five (no intersection): the checker finds two
      chosen values after <strong>453 states</strong>. Accept without
      a prepare phase: two chosen values after{' '}
      <strong>731 states</strong>. Same messages, same acceptors:
      remove the intersection or the memory it carries and
      agreement dies.
    </p>
  ),

  picture: (
    <p>
      A parliament whose members are part-timers: they wander in
      and out, letters arrive late or not at all, and nobody can be
      sure who is in the chamber. The standing rule is that a
      motion passes only with a majority of the whole roster
      present, and every motion carries a number. Before proposing,
      a member circulates her number and asks each colleague for a
      promise to ignore anything numbered lower, and to tell her
      what the last motion they voted for was. The trick is
      arithmetic: two majorities of the same roster cannot avoid
      sharing a member, and that shared member remembers. If the
      island already passed a motion under number one, whoever
      collects promises under number two hears about it from the
      overlap and is bound to re-propose the same text. No clerk, no
      ledger, no leader: the overlap <em>is</em> the ledger. Shrink
      the rule to two votes out of five, and two disjoint pairs pass
      two different laws on the same afternoon: the ablation this
      page measures.
    </p>
  ),

  steps: [
    <>
      <strong>Prepare(b):</strong> pick a fresh ballot, ask every
      acceptor to promise to ignore lower ballots and report what
      it already accepted.
    </>,
    <>
      <strong>Majority of promises:</strong> fewer is silence; a
      majority is a quorum, and any two quorums intersect.
    </>,
    <>
      <strong>Adopt or propose:</strong> if any promise carried an
      accepted value, take the highest-ballot one; only if none did,
      propose your own.
    </>,
    <>
      <strong>Accept(b, v):</strong> ask everyone; an acceptor takes
      it unless it has promised a higher ballot since.
    </>,
    <>
      <strong>Chosen:</strong> a majority accepted (b, v). The
      checker confirms it in 1,439,849 states: chosen once, chosen
      forever.
    </>,
  ],

  signals: [
    <>
      <strong>Replicated state that must never fork:</strong> lock
      services, configuration stores, leader election, the commit
      log of a database: anywhere two answers is worse than no
      answer.
    </>,
    <>
      <strong>Crash faults, not lies:</strong> nodes stop and
      messages vanish, but nobody forges. Five acceptors tolerate
      two crashes (40/40 decided); three crashes stop the world
      (0/40): a majority must survive, by construction.
    </>,
    <>
      <strong>Safety first, progress when possible:</strong> the
      network may stall a decision (FLP says something must give),
      but it can never produce a second one.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>two-phase commit</strong>:
      one coordinator collects votes and announces the outcome. It
      is simpler and cheaper, and it is not consensus: the
      self-test crashes the coordinator after the votes are in and
      all <strong>5 of 5</strong> participants sit blocked holding
      their locks, unable to commit (someone may have voted no) or
      abort (the coordinator may have logged commit). No quorum of
      survivors can release them, because 2PC has no shared memory
      to consult.
    </>
  ),

  strength: (
    <>
      <strong>Agreement that survives every schedule, proved by
      exhaustion.</strong> Under every delivery order and every
      drop in the checked system (1,439,849 states with drops,
      160,523 with pure reordering) at most one value was ever
      chosen and only proposed values were chosen; two of five
      acceptors crashed and every one of 40 runs still decided; the
      per-acceptor state is three numbers. Every consensus system
      in production is this rule or a restatement of it.
    </>
  ),
  weakness: (
    <>
      <strong>Progress is not promised, and the duel is
      expensive.</strong> Three proposers preempting one another
      spent 29 ticks and 10.0 ballots per decision without backoff
      against 11 ticks and 3.3 with it (measured: the network&apos;s
      own jitter kept the duel from livelocking here; a synchronous
      network would not). A majority crash stops everything: 0/40.
      Single-decree Paxos settles one value in two round trips;
      real systems run Multi-Paxos or Raft with a stable leader to
      make it one. And the protocol tolerates crashes, not lies:
      one Byzantine acceptor breaks it, which is PBFT&apos;s
      department.
    </>
  ),

  problem: 'Distributed consensus',
  problemSlug: 'distributed-consensus',
  rivals: [
    {
      name: 'Paxos × majority quorums',
      isThisUnit: true,
      algoName: 'Paxos',
      cost: '2 round trips, N-1 crashes / 2',
      wins: (
        <>
          <strong>Safety by intersection</strong>: 1,439,849
          checked states, one value ever chosen; 40/40 decisions
          with two of five acceptors down.
        </>
      ),
      costs: (
        <>
          No liveness promise, dueling proposers (10.0 ballots per
          decision without backoff), one value per instance.
        </>
      ),
      when: 'The kernel of any crash-tolerant replicated store, or when you must understand what Raft is hiding.',
    },
    {
      name: 'Raft',
      cost: 'stable leader, one round trip',
      wins: (
        <>
          The same quorum intersection with a leader elected by
          majority and a log that only the leader appends to: one
          round trip per entry and a design people can hold in
          their heads (the live unit here).
        </>
      ),
      costs: (
        <>
          Election storms and a leader on the critical path; the
          safety argument is Paxos&apos;s, restated with terms and
          log indices.
        </>
      ),
      when: 'Almost every new system: etcd, Consul, CockroachDB, TiKV run it.',
    },
    {
      name: 'Multi-Paxos',
      cost: 'amortized prepare',
      wins: (
        <>
          Run the prepare phase once for a whole sequence of
          decisions under one stable leader, then pay only the
          accept phase per entry: the replicated-log form of this
          page.
        </>
      ),
      costs: (
        <>
          Leader failover, log holes, and reconfiguration are left
          as exercises, which is exactly what Raft filled in.
        </>
      ),
      when: 'Chubby, Spanner, and any log where one value at a time is not enough.',
    },
    {
      name: 'PBFT',
      cost: '3f+1 nodes, three phases',
      wins: (
        <>
          Survives f nodes that lie, not just crash: quorums of
          2f+1 out of 3f+1 so any two share an honest node.
        </>
      ),
      costs: (
        <>
          Quadratic messages per decision and a third phase; four
          nodes minimum to survive one traitor.
        </>
      ),
      when: 'Blockchains and multi-party systems where a participant may be malicious.',
    },
  ],
  neverUse: {
    name: 'Two-phase commit as your consensus protocol',
    why: (
      <>
        It looks like consensus: everyone votes, a coordinator
        announces. This page crashed the coordinator after the
        votes were in and measured the result:{' '}
        <strong>5 of 5 participants blocked</strong>, holding locks,
        forever. A prepared participant cannot commit (another may
        have voted no) and cannot abort (the coordinator may already
        have logged commit), and no majority of survivors can tell
        it which, because 2PC keeps its memory in one place. Paxos
        keeps it in the intersection of every majority, so the
        survivors always include a witness. Atomic commit and
        consensus are different problems; the first one blocks by
        design.
      </>
    ),
  },

  contest: {
    instance:
      'one value among 5 acceptors with 3 dueling proposers under an adversarial scheduler (random delays, reordering, 40 seeded runs), with safety refereed separately by exhaustive model checking of a 3-acceptor, 2-proposer system across every delivery order and every drop',
    columns: ['safe', 'decided', 'rounds'],
    rows: [
      {
        method: 'Paxos, majority quorums + backoff',
        isThisUnit: true,
        values: ['yes', '40/40', '11'],
        best: 2,
        verdict: '3.3 ballots per decision: the shared acceptor carries the value forward',
      },
      {
        method: 'Paxos, majority quorums, no backoff',
        values: ['yes', '40/40', '29'],
        verdict: '10.0 ballots per decision: dueling proposers preempt each other; the network’s jitter breaks the tie here, a synchronous network would not',
      },
      {
        method: 'Quorum = half (no intersection)',
        values: ['NO', '-', '-'],
        verdict: 'the checker found two chosen values after 453 states',
      },
      {
        method: 'Accept without prepare',
        values: ['NO', '-', '-'],
        verdict: 'the checker found two chosen values after 731 states',
      },
      {
        method: 'Two-phase commit, coordinator crash',
        values: ['yes', '0/40', 'stuck'],
        verdict: '5/5 participants blocked holding locks: atomic commit is not consensus',
      },
    ],
    source:
      'python solutions/paxos_proposer_acceptor_quorums.py prints this table and asserts: no reachable state of the checked system holds two chosen values or an unproposed one (1,439,849 states with drops, 160,523 with pure reordering); both ablations reach a two-value state; 40/40 decisions with and without backoff, with the duel costing more than 1.5x the ticks and 2x the ballots; 40/40 with two acceptors crashed and 0/40 with three; and 5/5 participants blocked by a coordinator crash in two-phase commit.',
  },

  figure: (
    <Figure
      id="fig-paxos-quorums"
      aspect="16 / 7"
      caption="Any two majorities of five share at least one acceptor, and that acceptor remembers. Proposer P1 wins promises from {a0, a1, a2} and lands accept(1, A) on a majority: A is chosen. P2 arrives with ballot 2 and collects promises from {a2, a3, a4}; the overlap a2 reports (1, A), so P2 is bound to propose A, and the second majority re-chooses it. Checked exhaustively: 1,439,849 states, one value ever chosen. Shrink the quorum to two of five and the pairs stop overlapping: two values in 453 states."
      cite={{
        text: 'L. Lamport, "The Part-Time Parliament," ACM TOCS 16(2), 1998. DOI 10.1145/279227.279229. Also "Paxos Made Simple," 2001; Fischer-Lynch-Paterson, JACM 1985.',
        href: 'https://doi.org/10.1145/279227.279229',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="Five acceptors with two overlapping majority quorums; the shared acceptor carries the chosen value from ballot one into ballot two">
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i}>
            <circle cx={90 + i * 110} cy={150} r="22" fill={i === 2 ? 'rgba(240,185,75,0.25)' : 'rgba(93,162,255,0.10)'} stroke={i === 2 ? '#f0b94b' : '#5da2ff'} strokeWidth="1.6" />
            <text x={82 + i * 110} y={155} fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="12">a{i}</text>
          </g>
        ))}
        <path d="M 60 96 Q 200 40 340 96" fill="none" stroke="#5da2ff" strokeWidth="2" strokeDasharray="6 4" />
        <text x="120" y="64" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="11">P1, ballot 1: promises {'{a0, a1, a2}'} → accept(1, A) chosen</text>
        <path d="M 300 204 Q 440 260 580 204" fill="none" stroke="#f0b94b" strokeWidth="2" strokeDasharray="6 4" />
        <text x="300" y="248" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">P2, ballot 2: promises {'{a2, a3, a4}'}: a2 reports (1, A)</text>
        <text x="300" y="264" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">so P2 must propose A: chosen again, never B</text>
        <text x="30" y="200" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">the overlap is the memory: every majority of five meets every other</text>
        <text x="30" y="24" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">exhaustive: 1,439,849 states, one value ever chosen · 2 of 5 crashed: 40/40 decided</text>
        <text x="30" y="286" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">ablation: quorum = 2 of 5 → two values in 453 states · no prepare → two values in 731 · 2PC coordinator crash → 5/5 blocked</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'paxos_proposer_acceptor_quorums.py',
  Viz: PaxosViz,
  narration,
};
