import ConsistentHashViz from '../viz/ConsistentHashViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/consistent_hashing_virtual_nodes.py?raw';
import { narration } from './consistent-hashing-virtual-nodes.narration.js';

export const content = {
  given:
    'A fleet of nodes that join and leave, and a stream of keys to place.',
  task: 'A key→node mapping where membership changes move only the keys they must.',
  constraint:
    'The obvious mapping, hash(key) mod N, moves 90.0% of all keys when one of ten nodes leaves (measured; theory says (N−1)/N exactly). Every cache in the fleet goes cold at once: the constraint is surviving change.',

  origins: (
    <p>
      Karger, Lehman, Leighton, Levine, Lewin, and Panigrahy published
      the ring in <strong>1997</strong> to solve web-cache hotspots; the
      paper became the founding technology of <strong>Akamai</strong>{' '}
      (Lewin and Leighton&apos;s company). Amazon&apos;s{' '}
      <strong>Dynamo</strong> paper (2007) took it to storage and made
      virtual nodes famous in production; Cassandra and Riak inherited
      the design; memcached&apos;s ketama brought it to every web shop.
      The lineage continues: rendezvous hashing (1996, and honestly{' '}
      <em>earlier</em>), jump hash, Google&apos;s Maglev, and
      bounded-load variants: all answers to the same question the mod
      operator gets catastrophically wrong.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>ring</strong>. Hash nodes and keys onto one
      circle; each key belongs to the first node clockwise. A
      node&apos;s departure hands its arc, and <em>only</em> its arc, to
      its successor: minimal movement is geometry, not luck. The tests
      state it as set algebra: the moved keys equal the departed
      node&apos;s keys, <strong>exactly</strong>: not one key more, not
      one less, asserted at both one and one hundred vnodes. Joins
      mirror it: every moved key lands on the newcomer, asserted.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>many hats</strong>. One hash point per server
      makes arcs wildly uneven: the measured max/mean load is 2.49, and
      the &quot;minimal&quot; departure still moved 24.9% of all keys,
      because the victim&apos;s one arc was two and a half times
      oversized. Hash each server at 100 points and the arcs interleave:
      load variance collapses (coefficient of variation 0.716 → 0.079,
      measured across the dial), the departure&apos;s share drops to its
      fair 9.5%, and the grief spreads across <strong>9 heirs</strong>{' '}
      instead of burying one neighbor.
    </p>
  ),

  picture: (
    <p>
      A round table of delivery zones. Mod-N is dealing the city out by
      counting off: when one driver quits, everyone recounts, and every
      address changes hands. The ring is a map on the wall: each driver
      owns the stretch from their pin clockwise to the next pin: a
      driver quitting hands their stretch to the neighbor and nobody
      else moves. Virtual nodes are each driver holding <em>many small
      pins scattered across the map</em> instead of one big one: no
      driver&apos;s territory is huge by accident, and a departure
      scatters its small stretches among many neighbors instead of
      doubling one route.
    </p>
  ),

  steps: [
    <>
      <strong>Hash each node at v points</strong> on the circle
      (node#0, node#1, …): the vnode dial.
    </>,
    <>
      <strong>Sort the points once:</strong> the ring is a sorted array;
      construction is order-independent (asserted).
    </>,
    <>
      <strong>Lookup:</strong> hash the key, binary-search clockwise:
      one hash + O(log nv).
    </>,
    <>
      <strong>Leave:</strong> delete the node&apos;s points; its arcs
      fall to their clockwise successors: nothing else moves (set
      equality, asserted).
    </>,
    <>
      <strong>Join:</strong> insert the newcomer&apos;s points; only
      keys landing on them move: 9.8% measured for an 11th node.
    </>,
  ],

  signals: [
    <>
      <strong>Membership churns:</strong> caches, shards, load-balanced
      backends: anywhere deploys, failures, and autoscaling change N
      while the data must not stampede.
    </>,
    <>
      <strong>Movement is expensive:</strong> a moved key is a cold
      cache, a rebalanced shard, a re-replicated gigabyte: the 90%-vs-10%
      gap is the whole bill.
    </>,
    <>
      <strong>No coordinator wanted:</strong> any client with the node
      list computes the same placement, asserted order-independent: no
      lookup service in the path.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>mod-N</strong>: perfectly balanced
      (1.02 max/mean, measured: the modulus is a great load balancer!)
      and catastrophic under change: 90.0% of keys moved on one
      departure, within a rounding error of the (N−1)/N theory. It is
      also completely fine when N never changes: a fixed hash-partitioned
      batch job needs none of this machinery. The ring is insurance, and
      insurance is only worth buying where change happens.
    </>
  ),

  strength: (
    <>
      <strong>Movement equals ownership, exactly, with no
      coordinator.</strong> The set-algebra assertion is the whole
      guarantee: departures move 9.5%, joins 9.8%, each key&apos;s fate
      decided by geometry every client can compute alone. The vnode dial
      turns balance into a knob: cv 0.716 → 0.035 across three orders of
      vnodes, and failover grief spreads 1 → 9 heirs.
    </>
  ),
  weakness: (
    <>
      <strong>Vnodes cost memory and build time, balance is only
      statistical, and rivals exist.</strong> The ring holds n×v points
      (10,000 at v=1,000); even at v=100 the max/mean is 1.13, not 1.00
      (bounded-load variants exist precisely for the tail); and
      rendezvous hashing matches the movement theorem with{' '}
      <em>perfect</em> 1.02 balance and zero vnodes: paying n hashes per
      lookup (10× measured) to get it. Below a dozen nodes, that trade
      often wins.
    </>
  ),

  problem: 'Distributed key placement',
  problemSlug: 'distributed-key-placement',
  rivals: [
    {
      name: 'Consistent hashing × virtual nodes',
      isThisUnit: true,
      algoName: 'Consistent hashing',
      cost: 'O(log nv) lookup',
      wins: (
        <>
          Movement == ownership exactly (asserted as sets), 9.5% on
          departure vs mod-N&apos;s 90%, balance dialed to 1.13 at
          v=100, grief spread across 9 heirs.
        </>
      ),
      costs: (
        <>
          n×v ring points in memory, statistical (not perfect) balance,
          and a dial someone must set.
        </>
      ),
      when: 'The default for churning fleets: caches, shards, distributed stores: Dynamo’s and Cassandra’s answer.',
    },
    {
      name: 'Rendezvous hashing × highest random weight',
      algoName: 'Rendezvous hashing',
      cost: 'O(n) hashes/lookup',
      wins: (
        <>
          The same movement theorem (asserted), <strong>1.02
          balance with zero vnodes</strong>, no ring state at all: and it
          predates the ring (1996).
        </>
      ),
      costs: (
        <>
          n hashes per lookup: <strong>100,000 vs 10,000</strong>{' '}
          measured over the same keys: linear in fleet size, every
          single time.
        </>
      ),
      when: 'Small fleets (a dozen nodes) where perfect balance and zero state beat lookup cost.',
    },
    {
      name: 'Maglev hashing × permutation lookup table',
      algoName: 'Maglev hashing',
      cost: 'O(1) lookup, O(M) rebuild',
      wins: (
        <>
          Google&apos;s load-balancer answer: a precomputed table gives
          constant-time lookups at line rate with near-perfect balance.
        </>
      ),
      costs: (
        <>
          Table rebuilds on membership change move slightly{' '}
          <em>more</em> than minimal, traded knowingly for the O(1)
          packet path.
        </>
      ),
      when: 'Packet-rate load balancing where lookup latency outranks strict movement minimality.',
    },
    {
      name: 'Consistent hashing load balancing × bounded loads',
      algoName: 'Consistent hashing load balancing',
      cost: 'O(log nv) + bounded overflow',
      wins: (
        <>
          Caps any node at (1+ε)·mean by cascading overflow to the next
          arc: kills the statistical tail (the 1.13) outright: deployed
          for exactly that at Vimeo and Google.
        </>
      ),
      costs: (
        <>
          Overflowed keys lose strict arc ownership, complicating
          replication bookkeeping.
        </>
      ),
      when: 'Hot-key-prone request routing where the balance tail, not movement, is what pages you at night.',
    },
  ],
  neverUse: {
    name: 'mod-N where membership changes',
    why: (
      <>
        One departure from ten nodes remapped <strong>90.0%</strong> of
        100,000 keys, measured against the exact (N−1)/N theory: in a
        cache fleet that is a synchronized cold start (the thundering
        herd hits your database); in a storage fleet it is re-replicating
        ninety percent of everything you own. The cruel part is that
        mod-N <em>looks</em> perfect in every test that holds N fixed
        (its 1.02 balance beat the 1-vnode ring here). The failure only
        exists on the day a machine dies: which is to say, it is
        scheduled.
      </>
    ),
  },

  contest: {
    instance:
      '10 nodes, 100,000 keys, one node removed; movement asserted as set algebra (moved keys == the departed node’s keys, exactly, for ring and rendezvous)',
    columns: ['keys moved', 'max/mean load'],
    rows: [
      {
        method: 'mod-N rehash',
        values: ['90.0%', '1.02'],
        verdict: 'perfectly balanced, catastrophically brittle: (N−1)/N exactly',
      },
      {
        method: 'Ring, 1 vnode',
        values: ['24.9%', '2.49'],
        verdict: '“minimal” movement of a bloated arc: one heir buried',
      },
      {
        method: 'Ring × 100 vnodes',
        isThisUnit: true,
        values: ['9.5%', '1.13'],
        best: 0,
        verdict: 'fair share moved, load level, grief spread across 9 heirs',
      },
      {
        method: 'Rendezvous (HRW)',
        values: ['9.9%', '1.02'],
        verdict: 'same theorem, perfect balance, n hashes per lookup (10×)',
      },
    ],
    source:
      'python solutions/consistent_hashing_virtual_nodes.py prints this table and asserts: order-independent ring construction; movement == ownership as exact set equality for the ring (at 1 and 100 vnodes) and for rendezvous; mod-N measured at 90.0% vs its (N−1)/N theory; joins landing every moved key on the newcomer (9.8%); the vnode dial collapsing the load coefficient of variation 0.716 → 0.280 → 0.079 → 0.035 across v ∈ {1, 10, 100, 1000}; heirs going 1 → 9; and the rendezvous lookup bill counted at exactly n hashes per key.',
  },

  figure: (
    <Figure
      id="fig-hash-ring"
      aspect="16 / 7"
      caption="The ring, and why the hats multiply. Left: one point per node makes arcs wildly uneven (max/mean 2.49 measured), and a departure hands one oversized arc to one neighbor. Right: each node hashed at many points: arcs interleave, loads level (1.13), and the same departure scatters small arcs to many heirs. Movement equals ownership either way: the theorem; vnodes decide how much ownership there was to move, and who inherits."
      cite={{
        text: 'Karger, Lehman, Leighton, Levine, Lewin & Panigrahy, "Consistent Hashing and Random Trees", STOC 1997; virtual nodes in production: DeCandia et al., "Dynamo", SOSP 2007; rendezvous: Thaler & Ravishankar 1996.',
        href: 'https://doi.org/10.1145/258533.258660',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="Two hash rings: one point per node with uneven arcs, versus many virtual points with interleaved arcs">
        <circle cx="160" cy="140" r="86" fill="none" stroke="#2a3450" strokeWidth="16" />
        <path d="M 160 54 A 86 86 0 1 1 86 96" fill="none" stroke="#5da2ff" strokeWidth="16" />
        <path d="M 86 96 A 86 86 0 0 1 132 59" fill="none" stroke="#f0b94b" strokeWidth="16" />
        <path d="M 132 59 A 86 86 0 0 1 160 54" fill="none" stroke="#62d98a" strokeWidth="16" />
        <text x="160" y="252" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11" textAnchor="middle">1 point each: one arc is 2.49× the mean</text>
        {Array.from({ length: 36 }, (_, i) => {
          const a1 = (i / 36) * Math.PI * 2 - Math.PI / 2;
          const a2 = ((i + 1) / 36) * Math.PI * 2 - Math.PI / 2;
          const colors = ['#5da2ff', '#f0b94b', '#62d98a', '#a58bff', '#e2606c'];
          const c = colors[(i * 7 + Math.floor(i / 5)) % colors.length];
          const x1 = 480 + 86 * Math.cos(a1);
          const y1 = 140 + 86 * Math.sin(a1);
          const x2 = 480 + 86 * Math.cos(a2);
          const y2 = 140 + 86 * Math.sin(a2);
          return <path key={i} d={`M ${x1} ${y1} A 86 86 0 0 1 ${x2} ${y2}`} fill="none" stroke={c} strokeWidth="16" />;
        })}
        <text x="480" y="252" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11" textAnchor="middle">many hats: interleaved arcs, max/mean 1.13</text>
        <text x="320" y="30" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="12" textAnchor="middle">key → first node clockwise · a departure’s arcs fall to their successors</text>
        <text x="320" y="278" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11" textAnchor="middle">moved == owned, asserted as set equality · mod-N would move 90%</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'consistent_hashing_virtual_nodes.py',
  Viz: ConsistentHashViz,
  narration,
};
