// The spoken lesson for puzzle one hundred forty three, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle one hundred forty three: the gossip protocol, paired with random-peer anti-entropy, for epidemic dissemination. Here is the puzzle. One of one thousand twenty four nodes learns something, and every node must learn it: no coordinator, no membership list that has to be exact, and nodes that crash without warning. Measure how many rounds and how many messages it takes, and whether everyone is reached. The method: in every round, each node contacts one peer and the two reconcile what they know. The heuristic is the choice of peer and the direction of the exchange: a uniformly random peer each round, and anti-entropy, a full reconciliation by push, pull, or both, rather than a fixed neighbor or a fire and forget rumor. On this page the spread is measured against the classical estimate, the three directions are compared, the randomness and the anti-entropy are each removed to see what they were worth, and a third of the cluster is killed.',
  },
  {
    section: 'origins',
    text:
      'Demers and eight colleagues at Xerox PARC, in nineteen eighty seven, in Epidemic Algorithms for Replicated Database Maintenance, named anti-entropy and rumor mongering and used them to keep the Clearinghouse name servers consistent, borrowing the mathematics of epidemics from Bailey. Pittel proved the same year that the push spread takes the base two logarithm of N plus the natural logarithm of N rounds, plus a constant. Karp, Schindelhauer, Shenker, and Vöcking showed in two thousand that push-pull needs only N times the logarithm of the logarithm of N messages. Van Renesse, Minsky, and Hayden made gossip a failure detector in nineteen ninety eight; SWIM, in two thousand two, a membership protocol. Amazon’s Dynamo and Cassandra reconcile replicas by anti-entropy over Merkle trees. Bitcoin relays transactions by gossip. And Plumtree, in two thousand seven, grows a spanning tree inside the gossip so that the redundant messages become a repair channel.',
  },
  {
    section: 'pair',
    text:
      'The algorithm owns the round. Every node, every round, contacts one peer and reconciles state, with no coordinator and no global knowledge. Measured over one hundred trials on one thousand twenty four nodes: push gossip complete in every trial, eighteen point one rounds on average and twenty four at most, against the estimate of sixteen point nine, at eight thousand one hundred ninety three messages per trial. Pull: thirteen point eight rounds and ten thousand messages. Push-pull: nine point two rounds and nine thousand four hundred messages. The doubling phase is the algorithm: while few nodes know, each round nearly doubles them, which is the base two logarithm. The tail is luck, each uninformed node waiting to be hit, which is the natural logarithm. The heuristic supplies the random peer and the reconciliation. Randomness is what makes the spread an epidemic: replace it with a fixed neighbor, and the same protocol takes one thousand twenty three rounds, one node per round down the ring. Anti-entropy is what makes it complete: replace it with rumor mongering, where a node loses interest after telling someone who already knew, and five percent of the nodes are never informed, because the rumor dies out before the last stragglers hear it; a node that pulls from a random peer every round cannot be missed forever. The two together are what survives crashes. With thirty percent of the nodes dead, random-peer push still reached every live node, in twenty four rounds, while a spanning tree broadcast, the efficient thing, lost every subtree under a dead node and missed seventy percent.',
  },
  {
    section: 'picture',
    text:
      'A rumor in a village with no town crier. Each evening, everyone who has heard it tells one person chosen at random. The first evenings it doubles: one knows, then two, four, eight. Then it saturates: most people told already know, and the few who do not are found by chance, a couple more evenings for the last of them. Compare the village where everyone tells only the neighbor to their left: the rumor walks around the square one house per evening, and the last house waits a thousand nights. Compare the village where people stop repeating a rumor once they tell someone who has heard it: the rumor fizzles, with a few houses never told. And compare the village where the mayor phones a tree of deputies: one deputy away at the coast, and a whole district hears nothing.',
  },
  {
    section: 'run',
    text:
      'Here is the run. Round: every node picks a peer uniformly at random. Push: if the node knows and the peer does not, the peer learns. Pull: the reverse. Push-pull: both. Repeat until every node knows; nobody counts, the protocol just runs. On this page: push, eighteen point one rounds on average, twenty four at most, one hundred of one hundred trials complete. Pull, thirteen point eight. Push-pull, nine point two. Rumor mongering with a coin flip to stop: twenty five rounds and five percent never told. The ring: one thousand twenty three rounds exactly. And with three hundred seven nodes dead, push gossip reached every live node in twenty three point eight rounds on average, while a fan-out four tree missed seventy point three percent of them.',
  },
  {
    section: 'signals',
    text:
      'The signals that this pair fits. First: no coordinator can be trusted to stay up. A cluster where any node may crash, including whichever one is in charge. Second: eventual consistency is enough. Membership, failure detection, configuration, replica reconciliation, a transaction pool; anything where a few rounds of delay is fine and a missed node is not. Third: logarithmic rounds and roughly linear messages. Eight to ten thousand messages for a thousand nodes is fine; a broadcast storm every second is not.',
  },
  {
    section: 'tradeoffs',
    text:
      'Now the rivals. Plumtree: grows a spanning tree inside the gossip, eager pushes along the tree and lazy hints elsewhere, so the message count falls toward N while the gossip repairs the tree when a node dies. It costs tree state at every node and a repair delay after each failure; reach for it for broadcast at scale where the eightfold redundancy is too expensive but crashes still happen. Anti-entropy repair: reconciling whole replicas rather than one update, with Merkle trees finding the differing ranges in logarithmic comparisons. Hash trees to maintain and a heavier exchange than a rumor; reach for it in replicated databases that must converge after partitions. And gossip-based membership: the same random contacts carry who is alive, failure detection with no central monitor. False suspicions under load and a detection latency of a few rounds; reach for it when knowing who is in the cluster is itself the thing to disseminate.',
  },
  {
    section: 'tradeoffs',
    text:
      'The honest weaknesses of the hero. Redundant, probabilistic, and only eventually consistent. Eight thousand messages to inform a thousand nodes is eight times a tree. The rounds are a distribution, eighteen on average and twenty four at worst here, not a promise. The rumor variant that saves messages leaves five percent behind unless anti-entropy backs it up. A node cannot know when the spread is done, and stale updates race fresh ones unless the state carries versions.',
  },
  {
    section: 'tradeoffs',
    text:
      'And the negative example: a spanning tree broadcast without repair. It is the efficient answer, N minus one messages in logarithmic rounds, and it is measured here with thirty percent of the nodes dead: seventy point three percent of the live nodes never heard, because every subtree under a dead node is cut off and nobody else is responsible for it. Random-peer gossip reached every live node from the same start. The tree spends nothing on redundancy, and so has nothing to spend when a node fails. The fixed-peer ring is the same mistake in slow motion: one thousand twenty three rounds where randomness took eighteen.',
  },
  {
    section: 'code',
    text:
      'The code on this page is five protocols and a graveyard. Push, pull, and push-pull anti-entropy, each counting rounds and messages. Rumor mongering with a coin flip to lose interest. The fixed-peer ring. A spanning tree broadcast with a fan-out of four. And a set of dead nodes that neither relay nor receive. The self test asserts: every push trial complete within three times the base two logarithm of N rounds, with the mean within four of the estimate; push-pull faster than push; rumor mongering leaving between two and fifty percent uninformed; the ring at exactly N minus one rounds; and with thirty percent dead, push gossip reaching every live node in twenty of twenty trials while the tree misses more than thirty percent. When it prints O K, the protocol under every cluster’s membership list has been held to the mathematics of epidemics and shown what each half of its heuristic is for. The file would fail before it would lie to you.',
  },
];
