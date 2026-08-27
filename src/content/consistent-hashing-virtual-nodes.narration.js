// The spoken lesson for puzzle forty, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle forty: consistent hashing, paired with virtual nodes, for distributed key placement. Here is the puzzle. You run a fleet of nodes, caches, shards, backends, and nodes join and leave: deploys, failures, autoscaling. Place a stream of keys onto the fleet so that a membership change moves only the keys it absolutely must. The constraint is what the obvious answer does: hash the key, take it modulo N. When one node of ten departs, that scheme remaps ninety percent of every key in the system, measured on this page against the exact theory of N minus one over N. Every cache goes cold at once. The constraint is surviving change.',
  },
  {
    section: 'origins',
    text:
      'Karger, Lehman, Leighton, Levine, Lewin, and Panigrahy published the ring in nineteen ninety seven, at the Symposium on Theory of Computing, to solve web cache hotspots, and the paper became the founding technology of Akamai, the company Lewin and Leighton built. Amazon’s Dynamo paper in two thousand seven carried the ring into storage and made virtual nodes famous in production; Cassandra and Riak inherited the design, and memcached’s ketama library brought it to every web shop in the world. The lineage keeps producing answers to the same question: rendezvous hashing, which honestly predates the ring by a year; jump hash; Google’s Maglev; and the bounded load variants. All of them exist because the modulus operator, the obvious answer, fails catastrophically on the day a machine dies.',
  },
  {
    section: 'pair',
    text:
      'The control structure owns the ring. Hash the nodes and the keys onto one circle, and give each key to the first node clockwise from where it lands. Now a node’s departure hands its arc, and only its arc, to its clockwise successor. Minimal movement is geometry, not luck, and this page states it in the strongest form available: set algebra. The keys that moved equal the keys the departed node owned: exactly: not one key more, not one fewer, asserted at both one and one hundred virtual nodes, and again for joins, where every moved key lands on the newcomer. The heuristic supplies the many hats. With one hash point per server, the arcs are wildly uneven: the measured worst node carried two and a half times the mean load, and the so called minimal departure still moved twenty five percent of all keys, because the victim’s single arc happened to be bloated. Hash each server onto the circle at one hundred points and the arcs interleave: the load variance collapses, measured from point seven two down to point zero eight; the departure’s share drops to its fair nine and a half percent; and the grief spreads across nine heirs instead of burying one neighbor.',
  },
  {
    section: 'picture',
    text:
      'Picture a round table of delivery drivers dividing a city. Mod N is dealing the city out by counting off: house number modulo the number of drivers. When one driver quits, everyone recounts, and nearly every address in the city changes hands overnight. The ring is a map on the wall with pins: each driver owns the stretch from their pin clockwise to the next pin. A driver quitting hands their stretch to one neighbor, and nobody else’s route changes at all. Virtual nodes are the final touch: each driver holds many small pins scattered across the map instead of one big one. No driver’s territory is huge by accident of where a single pin fell. And when someone quits, their many small stretches scatter among many neighbors: no one’s route doubles overnight.',
  },
  {
    section: 'run',
    text:
      'Here is the loop. Build: hash each node at v points on the circle, node hash one, node hash two, and so on: v is the virtual node dial. Sort the points once: the ring is just a sorted array, and two rings built from differently ordered node lists agree on every key, asserted. Look up: hash the key, binary search for the first point clockwise: one hash and a log of n times v search. Leave: delete the departing node’s points; each of its arcs falls to its clockwise successor; nothing else moves, and the tests check that as exact set equality. Join: insert the newcomer’s points; the only keys that move are the ones now landing on them: nine point eight percent measured for an eleventh node, every single moved key verified to sit on the newcomer.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, membership churns: caches, shards, load balanced backends: anywhere deploys, failures, and autoscaling change the fleet while the data must not stampede. Second, movement is expensive: a moved key is a cold cache miss, a rebalanced shard, a re replicated gigabyte. The gap between ninety percent and ten percent moved is the entire bill, and it was measured here, not estimated. Third, you want no coordinator: any client holding the node list computes the same placement as every other client, with no lookup service in the request path. The ring is a convention, not a server.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: movement equals ownership, exactly, with no coordinator. That set algebra assertion is the entire guarantee, and it held at every vnode setting tested. Departures moved nine and a half percent; joins moved nine point eight; every key’s fate is decided by geometry each client can compute alone. The vnode dial turns balance into a knob: the coefficient of variation falls from point seven two through point two eight and point zero eight down to point zero three five as v climbs from one to a thousand. And failover grief spreads from one heir to nine. The weakness: vnodes cost memory and build time; balance is only statistical; and honest rivals exist. The ring holds n times v points: ten thousand entries at a thousand vnodes. Even at a hundred vnodes the loaded node carries thirteen percent over the mean, which is why bounded load variants exist. And rendezvous hashing matches the movement theorem with perfect balance and zero vnodes, paying n hashes per lookup for the privilege: measured at exactly ten times the ring’s hashing bill. Below a dozen nodes, that trade often wins.',
  },
  {
    section: 'tradeoffs',
    text:
      'Here are the measured numbers: ten nodes, one hundred thousand keys, one node removed. Mod N rehash: ninety point zero percent of keys moved, against a theoretical ninety: and, honestly, a beautiful balance of one point zero two, because the modulus is a fine load balancer on a frozen fleet. The ring with one vnode: twenty four point nine percent moved, with the worst arc at two point four nine times the mean, and every moved key inherited by a single neighbor. The ring with one hundred vnodes: nine and a half percent moved, balance one point one three, nine heirs sharing the load. And rendezvous hashing: nine point nine percent moved, balance one point zero two, no ring state at all, at the price of ten hashes per lookup where the ring pays one plus a binary search: one hundred thousand hashes against ten thousand, counted over the same keys. Read the table as a triangle of trades: movement, balance, and lookup cost: and notice the row that wins nothing outright and loses nothing badly. That row is the one running in Dynamo, Cassandra, and your C D N.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is mod N on a fleet whose membership changes, and the cruelty of it deserves the anatomy. Mod N passes every test that holds N fixed. Its balance here beat the one vnode ring outright: one point zero two against two point four nine. It is simple, fast, and correct looking, right up until the day a machine dies, and then it remaps ninety percent of one hundred thousand keys at once: measured within rounding of the exact N minus one over N. In a cache fleet, that is a synchronized cold start, and the thundering herd lands on your database. In a storage fleet, it is re replicating ninety percent of everything you own, tonight. The lesson generalizes and is worth one sentence: a scheme that is only ever tested at constant N has not been tested on the event it exists to survive. The failure is not rare. It is scheduled.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements the ring as a sorted array of sha one points with a bisect lookup, mod N placement, and rendezvous hashing, with hash call counters. The self test asserts, in order: two rings built from differently ordered node lists agree on every key. The movement theorem as set equality: the moved keys equal the departed node’s keys exactly, at one vnode and at one hundred, and the same equality for rendezvous hashing. Mod N measured above eighty percent and landing at ninety, matching its theory. Joins landing every moved key on the newcomer, at nine point eight percent. The vnode dial collapsing the coefficient of variation monotonically across one, ten, one hundred, and one thousand vnodes. The grief of a departure spreading from exactly one heir to at least seven, measured at nine. And the lookup bill: rendezvous paying exactly n hashes per key, ten times the ring’s. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
