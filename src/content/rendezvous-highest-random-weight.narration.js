// The spoken lesson for puzzle sixty one, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle sixty one: rendezvous hashing, paired with the highest random weight score, for distributed key placement. Here is the puzzle. Keys must be placed on nodes, and many independent clients must all agree on the placement: with no coordinator, no shared state, and no messages between them. The function from key to node must balance the load. And when a node joins or dies: which happens constantly, without announcements: only the keys that must move should move, because in a cache tier every moved key is a cold miss someone pays for. The referee on this page is exhaustive set arithmetic over one hundred thousand keys: the disruption theorem is asserted key by key, with zero tolerated exceptions, and both the consistent hashing ring and the modulo shard race honestly alongside.',
  },
  {
    section: 'origins',
    text:
      'David Thaler and Chinya Ravishankar built this at the University of Michigan in nineteen ninety six, for web proxy caches and multicast rendezvous points: a full year before the consistent hashing ring was published. The ring went on to fame: Akamai, Dynamo, memcached. The scoreboard went on to standards: the sparse mode multicast routing protocol adopted highest random weight to elect its rendezvous points, and modern object stores and load balancers keep rediscovering, decades later, that for modest cluster sizes the simplest answer had been published first. On this site, where binary search’s frame keeps reappearing under different predicates, here is the distributed systems version of the same lesson: one argmax, correctly scored, replaces an entire coordination protocol.',
  },
  {
    section: 'pair',
    text:
      'The algorithm owns the rendezvous protocol. Every client computes the same pure function of key and node, for every live node, and picks the argmax. Agreement needs no ring state, no metadata service, no gossip: two clients holding the same node list cannot disagree, because they ran the same arithmetic. The whole distributed data structure is a deterministic scoreboard, recomputed on demand. The heuristic supplies the score: hash of key and node together, so that each key ranks all the nodes in its own independent random order. That one choice buys both properties at once. Uniform argmax gives balance with no tuning knob: measured spread one point zero three, against the bare ring’s fifty one point one six. And an independent ranking gives the disruption theorem: remove a node, and each key’s winner either survives, in which case nothing about that key changes, or the winner was the dead node, in which case the runner up: who was standing in second place all along: is promoted. Asserted here on all one hundred thousand keys. Zero exceptions.',
  },
  {
    section: 'picture',
    text:
      'Picture every key holding a private lottery over the nodes. Node three drew eighty seven. Node seven drew ninety one. Node nine drew thirty four. The key lives with its highest draw. Anyone can rerun the lottery at any time, because the draws are hashes: every client computes identical numbers without asking anyone anything. Now node seven dies. This key’s runner up, node three, was already standing in second place: promotion, not reshuffling. And every key whose winner still lives notices nothing at all: removing a loser from a contest has never once changed who won it. That last sentence is the entire minimal disruption proof: it fits in a breath.',
  },
  {
    section: 'run',
    text:
      'Here is the run. For a key, compute one hash per live node: the score. Place the key on the argmax. When a node dies, recompute without it: only the dead node’s keys move, each to its own runner up: this page measured the removal of one node in ten moving exactly its ten thousand seventy seven keys and not one single other. When a node is born, it steals exactly the keys it now wins: measured nine point one percent, which is one eleventh, all moving to the newcomer, never between the old nodes. And mind the bill: one hash per node per lookup is order n. At ten nodes it is nothing. At ten thousand, the ring’s logarithmic search or Maglev’s constant time table wins by a mile.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, agreement without coordination: many clients, sidecars, or routers must map keys identically, and the only thing they share is the list of live nodes. Second, churn is routine: caches, proxies, worker pools, where machines join and die weekly, and every unnecessary key movement is a cold miss with a price tag. Third, the node count is modest: tens to a few hundred: where scanning all the scores per lookup costs nothing measurable, and the ring’s extra machinery: sorted points, the virtual node knob, state to build and sync: buys you nothing but surface area.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: balanced by construction, minimal by theorem, and stateless. The spread came out at one point zero three with no knob to turn: the bare ring measured fifty one point one six, and even patched with one hundred virtual nodes per server it reached one point two two. Removal moved exactly the dead node’s keys and nothing else, asserted key by key with zero exceptions. Addition stole one eleventh, all to the newcomer. Weighted nodes are one multiply away. And there is no table to build, synchronize, or corrupt. The weakness: the lookup bill scales with the cluster. Every placement computes one hash per node. Past a few hundred nodes, that scan is the bottleneck, and the ring’s binary search or a precomputed table becomes the right engineering. And the scores must come from a real hash: a weak or correlated score function quietly breaks both the balance and the independence that the disruption theorem stands on.',
  },
  {
    section: 'tradeoffs',
    text:
      'Here is the measured contest: one hundred thousand keys, ten nodes, then a resize to eleven. Spread is the heaviest node divided by the lightest. The modulo shard: spread one point zero two, beautifully balanced: and ninety point seven percent of all keys moved on the resize. Catastrophic. The bare ring with one point per node: minimal movement, but spread fifty one point one six: one server nearly starving while another drowns. The ring with one hundred virtual nodes per server: spread tamed to one point two two: the patch works, at the price of a knob and a thousand point table. Rendezvous: spread one point zero three and nine point one percent moved: both columns at once, no knob. The rivals fill in the edges. Jump consistent hash, Google’s twenty fourteen arithmetic trick, maps keys to numbered buckets in a few multiplies with perfect balance: but buckets can only be added or removed at the end, so an arbitrary node’s death is not even expressible. And Maglev, Google’s load balancer, precomputes a permutation table for constant time lookups at packet rate: the right answer when even logarithmic is too slow, at the price of building and rebuilding the table.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is modulo sharding on a live cluster, and it is the placement everyone writes first. Hash the key, take it mod n. One line. Perfectly balanced. And the moment the cluster resizes, it detonates: mod eleven and mod ten disagree almost everywhere, so growing ten nodes to eleven moved ninety point seven percent of one hundred thousand keys, against the nine point one percent floor. For a cache tier running at ninety five percent hit rate, that is the difference between re earning one key in eleven and re earning the entire working set at once: a blip, versus an outage with a thundering herd of database reads behind it. Modulo is fine in exactly one world: the one where n is frozen forever. No cluster’s n is frozen forever.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements the scoreboard with an eight byte blake two hash, a minimal consistent hashing ring for the re race, and the modulo shard. The self test asserts, in order: every node’s load within five sigma of ten thousand on one hundred thousand keys. The removal theorem, key by key: dropping one node moved exactly its own ten thousand seventy seven keys and not one other. The addition theorem: the newcomer stole nine point one percent, one eleventh within a percent, and no key moved between old nodes. The ring re raced at one and one hundred virtual nodes: spreads fifty one point one six and one point two two, both beaten by rendezvous at one point zero three. And the modulo resize measured at ninety point seven percent moved. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
