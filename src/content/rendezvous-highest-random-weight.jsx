import RendezvousViz from '../viz/RendezvousViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/rendezvous_highest_random_weight.py?raw';
import { narration } from './rendezvous-highest-random-weight.narration.js';

export const content = {
  given:
    'Keys to place on nodes, and many independent clients who must all agree on the placement: with no coordinator, no shared state, no messages.',
  task: 'A pure function from key to node that balances load: and, when a node joins or dies, moves only the keys it must.',
  constraint:
    'Nodes come and go without announcements. The referee is exhaustive set arithmetic on 100,000 keys: the disruption theorem is asserted key-by-key with zero tolerated exceptions, and the live consistent-hashing ring is re-raced beside the modulo shard.',

  origins: (
    <p>
      David Thaler and Chinya Ravishankar built this at Michigan in{' '}
      <strong>1996</strong>, for web proxy caches and multicast
      rendezvous points: a year <em>before</em> the consistent-hashing
      ring was published. The ring got the fame (Akamai, Dynamo,
      memcached); the scoreboard got the standards: PIM Sparse-Mode
      multicast routing adopted highest-random-weight to elect
      rendezvous points, and modern object stores and load balancers
      keep rediscovering that for modest cluster sizes the simplest
      answer was published first.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>rendezvous protocol</strong>: every client
      computes the same pure function of (key, node) for every live
      node and picks the argmax. Agreement needs no ring state, no
      metadata service, no gossip: two clients with the same node list
      cannot disagree, because they ran the same arithmetic. The
      entire distributed data structure is <em>a deterministic
      scoreboard recomputed on demand</em>.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>highest-random-weight score</strong>:
      hash(key, node), so each key ranks all nodes in an independent
      random order. Uniform argmax gives balance with no tuning knob:
      measured spread <strong>1.03</strong> against the bare
      ring&apos;s <strong>51.16</strong>. And the ranking gives the
      disruption theorem: remove a node and each key&apos;s argmax
      either survives (nothing moves) or was the dead node (promote
      the runner-up): asserted on all 100,000 keys, zero exceptions.
    </p>
  ),

  picture: (
    <p>
      Every key holds a private lottery over the nodes: node three
      drew 87, node seven drew 91, node nine drew 34. The key lives
      with its highest draw. Anyone can rerun the lottery: the draws
      are hashes, so every client gets identical numbers without
      asking anyone. When node seven dies, this key&apos;s runner-up:
      node three: was standing in second place <em>all along</em>:
      promotion, not reshuffling. And keys whose winner still lives
      notice nothing at all, because removing a loser from a contest
      never changes who won it.
    </p>
  ),

  steps: [
    <>
      <strong>Score:</strong> for key k, compute hash(k, n) for every
      live node n.
    </>,
    <>
      <strong>Place:</strong> the key belongs to the argmax: the
      highest random weight.
    </>,
    <>
      <strong>On node death:</strong> recompute without it: only the
      dead node&apos;s keys move, each to its runner-up (asserted
      key-by-key).
    </>,
    <>
      <strong>On node birth:</strong> the newcomer steals exactly the
      keys it now wins: measured 9.1% ≈ 1/11, never a move between
      old nodes.
    </>,
    <>
      <strong>Mind the bill:</strong> one hash per node per lookup:
      O(n): the ring&apos;s O(log n) wins past a few hundred nodes.
    </>,
  ],

  signals: [
    <>
      <strong>Agreement without coordination:</strong> many clients,
      sidecars, or routers must map keys identically with nothing
      shared but the node list.
    </>,
    <>
      <strong>Churn is routine:</strong> caches, proxies, worker
      pools: nodes join and die weekly, and every unnecessary key move
      is a cold miss you pay for.
    </>,
    <>
      <strong>Modest node counts:</strong> tens to a few hundred:
      where an O(n) score scan per lookup is nothing and the
      ring&apos;s machinery (sorted points, vnode knob) buys nothing.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the <strong>modulo shard</strong>: hash
      the key, take it mod n: perfectly balanced (spread 1.02) and
      catastrophically brittle: growing 10 nodes to 11 moved{' '}
      <strong>90.7%</strong> of 100,000 keys, because key mod 11
      disagrees with key mod 10 almost everywhere. Rendezvous moved
      9.1%: the theoretical floor. The gap between those two numbers
      is this entire subject.
    </>
  ),

  strength: (
    <>
      <strong>Balanced by construction, minimal by theorem, and
      stateless.</strong> Spread 1.03 with no knob (the bare ring:
      51.16; the ring patched with 100 vnodes: 1.22). Removal moved
      exactly the dead node&apos;s 10,077 keys and not one other:
      asserted key-by-key. Addition stole 9.1% ≈ 1/11, all to the
      newcomer. Weighted nodes are one multiply away, and there is no
      table to build, sync, or corrupt.
    </>
  ),
  weakness: (
    <>
      <strong>The lookup bill scales with the cluster.</strong> Every
      placement computes n hashes: at 10 nodes that is nothing; at
      10,000 it is the ring&apos;s O(log n) binary search or
      Maglev&apos;s O(1) table by a mile. And the scores must come
      from a real hash: a weak or correlated score function quietly
      breaks both balance and the independence the disruption theorem
      leans on.
    </>
  ),

  problem: 'Distributed key placement',
  problemSlug: 'distributed-key-placement',
  rivals: [
    {
      name: 'Rendezvous × highest weight',
      isThisUnit: true,
      algoName: 'Rendezvous hashing',
      cost: 'O(n) per lookup',
      wins: (
        <>
          <strong>Spread 1.03 and 9.1% disruption</strong> with zero
          state and zero knobs: the theorem asserted key-by-key on
          100,000 keys with no exceptions.
        </>
      ),
      costs: (
        <>
          One hash per node per lookup: past a few hundred nodes the
          scan is the bottleneck.
        </>
      ),
      when: 'Modest clusters with churn, and anywhere many clients must agree without coordination.',
    },
    {
      name: 'Consistent hashing × vnodes',
      algoName: 'Consistent hashing',
      cost: 'O(log n) per lookup',
      wins: (
        <>
          The ring (a live unit): binary-search lookups that stay
          cheap at any cluster size: the standard at Dynamo and
          memcached scale.
        </>
      ),
      costs: (
        <>
          Bare, its spread measured 51.16 here: the vnode knob (100
          points per node: 1.22) is mandatory machinery, state to
          build and sync.
        </>
      ),
      when: 'Thousands of nodes, or when the ring and its tooling already run in your stack.',
    },
    {
      name: 'Jump consistent hash',
      algoName: 'Jump consistent hash',
      cost: 'O(ln n), zero memory',
      wins: (
        <>
          Google&apos;s 2014 arithmetic trick: a few multiplies map
          key to bucket with no table, no scan, perfect balance.
        </>
      ),
      costs: (
        <>
          Buckets are <em>numbered</em>: it can only grow or shrink at
          the end: an arbitrary node&apos;s death is not expressible.
        </>
      ),
      when: 'Numbered shards (storage stripes) that only ever grow: not clusters with real churn.',
    },
    {
      name: 'Maglev hashing',
      algoName: 'Maglev hashing',
      cost: 'O(1) via table',
      wins: (
        <>
          Google&apos;s load balancer: a permutation-filled lookup
          table answers at packet rate, with near-minimal disruption
          on membership change.
        </>
      ),
      costs: (
        <>
          The table must be built and rebuilt (size a prime ~100×
          nodes), and a rebuild slightly reshuffles beyond the
          minimum.
        </>
      ),
      when: 'Per-packet lookup budgets where even O(log n) is too slow: the table pays for itself.',
    },
  ],
  neverUse: {
    name: 'Modulo sharding on a live cluster',
    why: (
      <>
        hash(key) mod n is the placement everyone writes first:
        perfectly balanced, one line long: and the moment the cluster
        resizes it detonates. Measured here: growing 10 nodes to 11
        moved <strong>90.7% of 100,000 keys</strong>, versus the 9.1%
        floor: because mod 11 and mod 10 disagree almost everywhere.
        For a cache tier at a 95% hit rate, that is the difference
        between re-earning one key in eleven and re-earning{' '}
        <em>the entire working set at once</em>: a blip versus an
        outage with a thundering herd behind it. Modulo is fine only
        when n is frozen forever: and no cluster&apos;s n is frozen
        forever.
      </>
    ),
  },

  contest: {
    instance:
      '100,000 keys on 10 nodes, then resize; spread = heaviest node over lightest; referee: exhaustive per-key set arithmetic, zero tolerated exceptions on the disruption theorem',
    columns: ['spread', 'moved on +1 node'],
    rows: [
      {
        method: 'Modulo shard',
        values: ['1.02', '90.7%'],
        verdict: 'balanced and catastrophic: nearly everything reshuffles',
      },
      {
        method: 'Ring, 1 vnode',
        values: ['51.16', '~9.1%'],
        verdict: 'minimal moves, famously lumpy placement',
      },
      {
        method: 'Ring, 100 vnodes',
        values: ['1.22', '~9.1%'],
        verdict: 'the patch: spread tamed by replicated points',
      },
      {
        method: 'HRW rendezvous',
        isThisUnit: true,
        values: ['1.03', '9.1%'],
        best: 1,
        verdict: 'both columns at once, no knob: O(n) scores per lookup',
      },
    ],
    source:
      "python solutions/rendezvous_highest_random_weight.py prints this table and asserts: every node's load within 5 sigma of 10,000; removal of node3 moving exactly its 10,077 keys and not one other (key-by-key, zero exceptions); addition stealing 9.1% ≈ 1/11, all to the newcomer; the ring re-raced at 1 and 100 vnodes with HRW's spread beating both; and the modulo resize measured at 90.7% moved.",
  },

  figure: (
    <Figure
      id="fig-rendezvous-scoreboard"
      aspect="16 / 7"
      caption="One key, one scoreboard. Each node's bar is hash(key, node): every client computes identical bars without a message, and the key lives with the tallest. When the winner dies, the runner-up was standing in second place all along: promotion, not reshuffling: and any key whose winner survives notices nothing, because removing a loser never changes who won. Balance and minimal disruption both fall out of one argmax."
      cite={{
        text: 'Thaler & Ravishankar, "Using Name-Based Mappings to Increase Hit Rates", IEEE/ACM Transactions on Networking 6(1), 1998 (Michigan TR 1996): highest-random-weight predates the consistent-hashing ring by a year; PIM Sparse-Mode multicast standardized it.',
        href: 'https://doi.org/10.1109/90.663936',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="Score bars for one key across six nodes with the tallest marked winner and a dead node's promotion shown">
        <text x="60" y="34" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">key "user:4821" scores every node: identical on every client</text>
        {[
          [0, 118, false], [1, 176, true], [2, 64, false],
          [3, 152, false], [4, 91, false], [5, 40, false],
        ].map(([i, h, win]) => (
          <g key={i}>
            <rect
              x={70 + i * 88}
              y={210 - h}
              width={44}
              height={h}
              fill={win ? '#62d98a' : i === 3 ? '#f0b94b' : '#33507a'}
            />
            <text x={74 + i * 88} y={228} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">n{i}</text>
          </g>
        ))}
        <text x="130" y="24" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11" />
        <text x="152" y="52" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">winner</text>
        <text x="322" y="76" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">runner-up: promoted if n1 dies</text>
        <line x1="92" y1="240" x2="92" y2="252" stroke="#e2606c" strokeWidth="0" />
        <text x="60" y="256" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">n1 dies: only n1's keys move (each to its runner-up) · everyone else's argmax is untouched</text>
        <text x="60" y="278" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">measured: spread 1.03 vs bare ring 51.16 · resize moves 9.1% vs modulo's 90.7%</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'rendezvous_highest_random_weight.py',
  Viz: RendezvousViz,
  narration,
};
