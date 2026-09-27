import GossipViz from '../viz/GossipViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/gossip_protocol_random_peer_anti_entropy.py?raw';
import { narration } from './gossip-protocol-random-peer-anti-entropy.narration.js';

export const content = {
  given:
    'One of 1,024 nodes learns something, and every node must learn it: no coordinator, no membership list that has to be exact, and nodes that crash without warning. Measure how many rounds and messages it takes, and whether everyone is reached.',
  task: 'Gossip: in every round, each node contacts one peer and the two reconcile what they know. The heuristic is the choice of peer and the direction of the exchange: a uniformly random peer each round, and anti-entropy, a full reconciliation by push, pull, or both, rather than a fixed neighbor or a fire-and-forget rumor.',
  constraint:
    'Push gossip informed all 1,024 nodes in 100 of 100 trials, in 18.1 rounds on average (maximum 24) against the classical estimate log₂N + ln N = 16.9, at 8,193 messages per trial. Pull took 13.8 rounds, push-pull 9.2. Rumor mongering, where an informed node stops with probability ½ after contacting a peer that already knows, left 5.0% of the nodes uninformed on average; anti-entropy leaves none. A fixed peer (each node always contacts its ring neighbor) took exactly 1,023 rounds. With 30% of the nodes dead, random-peer gossip still reached every live node, in 23.8 rounds on average, while a fan-out-4 spanning-tree broadcast missed 70.3% of the live nodes.',

  origins: (
    <p>
      Demers, Greene, Hauser, Irish, Larson, Shenker, Sturgis, Swinehart,
      and Terry at Xerox PARC (<strong>1987</strong>, &quot;Epidemic
      algorithms for replicated database maintenance,&quot; PODC)
      named anti-entropy and rumor mongering and used them to keep the
      Clearinghouse name servers consistent, borrowing the mathematics
      of epidemics from Bailey. Pittel (1987) proved the push spread
      takes log₂N + ln N + O(1) rounds; Karp, Schindelhauer, Shenker,
      and Vöcking (2000) showed push-pull needs only O(N log log N)
      messages. Van Renesse, Minsky, and Hayden (1998) made gossip a
      failure detector; SWIM (Das, Gupta, Motivala, 2002) a membership
      protocol; Amazon&apos;s Dynamo (2007) and Cassandra reconcile
      replicas by anti-entropy over Merkle trees; Bitcoin relays
      transactions by gossip; and Plumtree (Leitão, Pereira,
      Rodrigues, 2007) grows a spanning tree inside the gossip so that
      the redundant messages become a repair channel.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>round</strong>: every node, every round,
      contacts one peer and reconciles state, with no coordinator and
      no global knowledge. Measured over 100 trials on 1,024 nodes:
      push gossip complete in every trial, <strong>18.1 rounds</strong>{' '}
      on average (maximum 24) against the estimate 16.9, at 8,193
      messages; pull 13.8 rounds and 10,357 messages; push-pull 9.2
      rounds and 9,441 messages. The doubling phase is the algorithm:
      while few nodes know, each round nearly doubles them, which is
      the log₂N; the tail is luck, each uninformed node waiting to be
      hit, which is the ln N.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>random peer and the reconciliation</strong>.
      Randomness is what makes the spread an epidemic: replace it with
      a fixed neighbor and the same protocol takes <strong>1,023
      rounds</strong>, one node per round down the ring. Anti-entropy is
      what makes it complete: replace it with rumor mongering, where a
      node loses interest after telling someone who already knew, and{' '}
      <strong>5.0%</strong> of the nodes are never informed, because the
      rumor dies out before the last stragglers hear it; a node that
      pulls from a random peer every round cannot be missed forever.
      The two together are what survives crashes: with 30% of the
      nodes dead, random-peer push still reached every live node
      (23.8 rounds), while a spanning-tree broadcast, the efficient
      thing, lost every subtree under a dead node and missed 70.3%.
    </p>
  ),

  picture: (
    <p>
      A rumor in a village with no town crier. Each evening, everyone
      who has heard it tells one person chosen at random. The first
      evenings it doubles: one knows, then two, four, eight. Then it
      saturates: most people told already know, and the few who
      don&apos;t are found by chance, a couple more evenings for the
      last of them. Compare the village where everyone tells only the
      neighbor to their left: the rumor walks around the square one
      house per evening, and the last house waits a thousand nights.
      Compare the village where people stop repeating a rumor once
      they tell someone who has heard it: the rumor fizzles with a few
      houses never told. And compare the village where the mayor
      phones a tree of deputies: one deputy away at the coast and a
      whole district hears nothing.
    </p>
  ),

  steps: [
    <>
      <strong>Round:</strong> every node picks a peer uniformly at
      random.
    </>,
    <>
      <strong>Push:</strong> if the node knows and the peer does not,
      the peer learns; <strong>pull:</strong> the reverse;{' '}
      <strong>push-pull:</strong> both.
    </>,
    <>
      <strong>Repeat:</strong> until every node knows; nobody counts,
      the protocol just runs.
    </>,
    <>
      <strong>Measure:</strong> rounds and messages over 100 trials;
      the estimate log₂N + ln N.
    </>,
    <>
      <strong>Ablate:</strong> fixed peer (1,023 rounds), rumor
      mongering (5.0% missed), a dead 30% (tree misses 70.3%).
    </>,
  ],

  signals: [
    <>
      <strong>No coordinator can be trusted to stay up:</strong> a
      cluster where any node may crash, including whichever one is
      &quot;in charge.&quot;
    </>,
    <>
      <strong>Eventual consistency is enough:</strong> membership,
      failure detection, configuration, replica reconciliation, a
      transaction pool.
    </>,
    <>
      <strong>Logarithmic rounds and linear-ish messages:</strong>{' '}
      8,000 to 10,000 messages for 1,024 nodes is fine; a broadcast
      storm every second is not.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>a spanning-tree broadcast</strong>:
      N − 1 messages, log N rounds, and no redundancy at all, which
      is exactly why 30% dead nodes cost it 70.3% of the live ones.
      Gossip pays 8× the messages to buy the redundancy.
    </>
  ),

  strength: (
    <>
      <strong>Everyone, in logarithmic rounds, through crashes, with no
      one in charge.</strong> 100 of 100 trials complete in 18.1 rounds
      (push) or 9.2 (push-pull); every live node reached with 30% of
      the cluster dead; and the whole protocol is one random contact
      per node per round.
    </>
  ),
  weakness: (
    <>
      <strong>Redundant, probabilistic, and only eventually consistent.</strong>{' '}
      8,193 messages to inform 1,024 nodes is 8× a tree; the rounds
      are a distribution (18.1 mean, 24 maximum here), not a promise;
      and the rumor variant that saves messages leaves 5.0% behind
      unless anti-entropy backs it up. A node cannot know when the
      spread is done, and stale updates race fresh ones unless the
      state carries versions.
    </>
  ),

  problem: 'Epidemic dissemination',
  problemSlug: 'broadcast-dissemination',
  rivals: [
    {
      name: 'Gossip protocol × random-peer anti-entropy',
      isThisUnit: true,
      algoName: 'Gossip protocol',
      cost: 'one message per node per round',
      wins: (
        <>
          <strong>Complete in 18.1 rounds</strong> (9.2 push-pull), and
          every live node reached with 30% dead.
        </>
      ),
      costs: (
        <>
          8× the messages of a tree; probabilistic timing; eventual,
          not immediate.
        </>
      ),
      when: 'Membership, failure detection, and replica reconciliation in clusters where anything can crash.',
    },
    {
      name: 'Plumtree',
      cost: 'tree messages plus lazy gossip',
      wins: (
        <>
          Grows a spanning tree inside the gossip: eager pushes along
          the tree, lazy hints elsewhere, so the message count falls
          toward N while the gossip repairs the tree when a node dies.
        </>
      ),
      costs: (
        <>
          Tree state at every node and a repair delay after each
          failure.
        </>
      ),
      when: 'Broadcast at scale where the 8× redundancy is too expensive but crashes still happen.',
    },
    {
      name: 'Anti-entropy repair',
      cost: 'a Merkle-tree comparison per pair',
      wins: (
        <>
          Reconciling whole replicas, not one update: Merkle trees find
          the differing ranges in logarithmic comparisons.
        </>
      ),
      costs: (
        <>
          Hash trees to maintain, and a heavier exchange than a rumor.
        </>
      ),
      when: 'Replicated databases that must converge after partitions (Dynamo, Cassandra).',
    },
    {
      name: 'Gossip-based membership',
      cost: 'one keepalive exchange per round',
      wins: (
        <>
          The same random contacts carry who is alive: SWIM-style
          failure detection with no central monitor.
        </>
      ),
      costs: (
        <>
          False suspicions under load, and a detection latency of a
          few rounds.
        </>
      ),
      when: 'Knowing who is in the cluster is itself the thing to disseminate.',
    },
  ],
  neverUse: {
    name: 'A spanning-tree broadcast without repair',
    why: (
      <>
        The efficient answer, N − 1 messages in log N rounds, and it
        is measured here with 30% of the nodes dead:{' '}
        <strong>70.3% of the live nodes never heard</strong>, because
        every subtree under a dead node is cut off and nobody else is
        responsible for it. Random-peer gossip reached every live node
        from the same start. The tree spends nothing on redundancy and
        so has nothing to spend when a node fails; the fixed-peer ring
        is the same mistake in slow motion, 1,023 rounds where
        randomness took 18.
      </>
    ),
  },

  contest: {
    instance:
      'one update spread to N = 1,024 nodes, 100 trials per protocol; referee: the classical estimate log₂N + ln N = 16.9 rounds for push, and completeness checked node by node',
    columns: ['mean rounds (max)', 'messages per trial'],
    rows: [
      {
        method: 'Push, random peer',
        isThisUnit: true,
        values: ['18.1 (24)', '8,193'],
        best: 0,
        verdict: 'complete in every trial; logarithmic in N',
      },
      {
        method: 'Pull anti-entropy',
        values: ['13.8 (18)', '10,357'],
        verdict: 'slow start, fast finish: the stragglers pull',
      },
      {
        method: 'Push-pull anti-entropy',
        values: ['9.2 (11)', '9,441'],
        verdict: 'fewest rounds',
      },
      {
        method: 'Rumor mongering (stop w.p. ½)',
        values: ['25.2 (31)', '-'],
        verdict: '5.0% of nodes never informed',
      },
      {
        method: 'Fixed peer (ring)',
        values: ['1,023', '1,023'],
        verdict: 'no randomness: N − 1 rounds',
      },
      {
        method: '30% dead: gossip vs fan-out-4 tree',
        values: ['23.8, all live nodes', 'tree misses 70.3%'],
        verdict: 'redundancy is what survives',
      },
    ],
    source:
      'python solutions/gossip_protocol_random_peer_anti_entropy.py prints this table and asserts: every push trial complete within 3 log₂N rounds with the mean within 4 of the estimate; push-pull faster than push; rumor mongering leaving between 2% and 50% uninformed; the ring at exactly N − 1 rounds; and with 30% dead, push gossip reaching every live node in 20 of 20 trials while the tree misses more than 30%.',
  },

  figure: (
    <Figure
      id="fig-gossip-epidemic"
      aspect="16 / 7"
      caption="The fraction informed by round, measured on 1,024 nodes. Push (blue) doubles while few know and then chases stragglers: 18.1 rounds on average. Push-pull (amber) finishes in 9.2 because uninformed nodes also pull. The ring (gray) climbs one node per round toward 1,023. The tree broadcast (red) is fastest of all when nothing fails and loses 70.3% of the live nodes when 30% are dead; gossip loses none."
      cite={{
        text: 'A. Demers et al., "Epidemic algorithms for replicated database maintenance," PODC 1987. DOI 10.1145/41840.41841. R. Karp, C. Schindelhauer, S. Shenker, B. Vöcking, "Randomized rumor spreading," FOCS 2000. B. Pittel, "On spreading a rumor," SIAM J. Applied Math 47(1), 1987.',
        href: 'https://doi.org/10.1145/41840.41841',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="Curves of the fraction of nodes informed against rounds for push, push-pull, and ring gossip, with a note on the tree broadcast under crashes">
        <rect x="60" y="30" width="380" height="200" fill="rgba(154,165,189,0.05)" stroke="rgba(154,165,189,0.35)" />
        <text x="30" y="36" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">100%</text>
        <text x="40" y="234" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">0</text>
        <text x="60" y="248" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">round 0</text>
        <text x="400" y="248" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">round 24</text>
        <polyline points="60,229.8 92,229.6 124,229.2 155,228.4 187,226.9 219,223.9 250,218 282,207 314,187 345,155 377,112 409,68 440,40" fill="none" stroke="#5da2ff" strokeWidth="2.5" />
        <polyline points="60,229.8 92,229.2 124,227 155,220 187,200 219,150 250,80 282,42 314,32 345,30" fill="none" stroke="#f0b94b" strokeWidth="2.5" />
        <polyline points="60,229.8 440,225.2" fill="none" stroke="#9aa5bd" strokeWidth="2" />
        <text x="380" y="106" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="10">push: 18.1</text>
        <text x="250" y="70" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="10">push-pull: 9.2</text>
        <text x="300" y="218" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">ring: 1 node per round</text>
        <text x="460" y="60" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="11">measured, N = 1,024</text>
        <text x="460" y="84" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">estimate log₂N + ln N: 16.9</text>
        <text x="460" y="102" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">messages: 8,193 / 10,357 / 9,441</text>
        <text x="460" y="130" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">rumor mongering: 5.0% missed</text>
        <text x="460" y="158" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="10">30% dead: tree misses 70.3%</text>
        <text x="460" y="176" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="10">gossip reaches all live nodes</text>
        <text x="460" y="194" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">in 23.8 rounds</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'gossip_protocol_random_peer_anti_entropy.py',
  Viz: GossipViz,
  narration,
};
