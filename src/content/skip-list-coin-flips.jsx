import SkipListViz from '../viz/SkipListViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/skip_list_coin_flips.py?raw';
import { narration } from './skip-list-coin-flips.narration.js';

export const content = {
  given:
    'A dynamic ordered set: inserts, deletes, searches, and in-order scans, interleaved.',
  task: 'Every operation in logarithmic time.',
  constraint:
    'The guarantee must not depend on the input being kind. Sorted insertion order, the commonest real arrival pattern there is, is the classic structure-killer, and the contest feeds it deliberately.',

  origins: (
    <p>
      William Pugh published skip lists in <strong>1990</strong> with a
      pitch unusual for a data-structures paper: not faster, but{' '}
      <strong>simpler</strong>: the same expected performance as balanced
      trees with the entire rebalancing apparatus replaced by a coin. The
      industry heard a different virtue three decades later: no rotations
      means no multi-node restructuring, which makes lock-free concurrent
      versions tractable: Java&apos;s ConcurrentSkipListMap, Redis sorted
      sets, and the memtables of LevelDB and RocksDB are all skip lists,
      chosen for exactly that.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>lanes</strong>. The base is a sorted linked list of
      everything; each level above is an express lane skipping roughly half
      the lane below. A search boards the top lane, rides right until the
      next stop would overshoot, drops one level, and repeats: a staircase
      whose expected length is O(log n), measured here at 41 visits average
      and 43 at the 99th percentile against log₂ n of 14.3: the tail is
      real and tame.
    </p>
  ),
  heurRole: (
    <p>
      Staffs the lanes by <strong>lottery</strong>: each inserted key flips
      a fair coin until tails, and the heads count is its tower height. The
      tests verify the coin (heights ≥ k occur at rate 2^(1−k), measured)
      and, more importantly, what the coin buys:{' '}
      <strong>indifference to arrival order</strong>. Sorted feed, random
      feed: 39.8 versus 41.0 visits, within two percent, because the
      randomness lives in the structure rather than being assumed of the
      input. The rebalancing logic of the tree world is not implemented
      here; it is <em>replaced</em>.
    </p>
  ),

  picture: (
    <p>
      A subway line where every station has the local platform, half the
      stations (by coin flip) also have an express platform, a quarter have
      a super-express, and so on. To reach a station, ride the fastest line
      as far as it goes without passing your stop, take the stairs down one
      level, and repeat. Nobody planned which stations got express
      platforms: each station flipped for itself at construction time, and
      the ride is short anyway, with high probability, no matter in what
      order the stations were built.
    </p>
  ),

  steps: [
    <>
      <strong>Search:</strong> from the top lane, run right while the next
      node&apos;s key is still below the target; drop a level; repeat to
      the floor. The staircase is the whole algorithm.
    </>,
    <>
      <strong>Insert:</strong> flip until tails: the heads count is the
      tower height. Splice the tower in along the search path&apos;s
      per-level predecessors.
    </>,
    <>
      <strong>Delete:</strong> unlink the tower at every level it occupies.
      No restructuring of anything else, ever.
    </>,
    <>
      <strong>Scan:</strong> the base lane is a sorted linked list: range
      queries are a walk.
    </>,
    <>
      <strong>Trust the coin, checkably:</strong> tower heights are
      geometric(1/2) and the search-cost tail is measured, not assumed
      (p99 = 43 visits at n = 20,000).
    </>,
  ],

  signals: [
    <>
      Ordered operations with <strong>range scans</strong>: leaderboards,
      time indexes, memtables.
    </>,
    <>
      <strong>Concurrency</strong> is coming: no rotations means CAS-able
      local splices: the reason the lock-free world standardized on this
      structure.
    </>,
    <>
      A <strong>simplicity budget</strong>: the whole structure is a search
      loop and a splice; the AVL rival needed rotation machinery and paid
      1,989 rotations on the same feed.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the plain unbalanced BST, and the contest is
      a 2×2 of order-sensitivity: the BST <strong>loves chaos</strong>{' '}
      (16.7 visits under random arrivals) and <strong>dies of order</strong>{' '}
      (1,182 under sorted, the linked-list-in-disguise), while the sorted
      array dies of chaos (2,515: every insert shifts the tail) and loves
      order (14.2: appends shift nothing). The skip list&apos;s row reads
      41.0 and 39.8: the only randomized structure on the bench, and the
      point of it.
    </>
  ),

  strength: (
    <>
      <strong>No rebalancing code exists, and no arrival order matters.</strong>{' '}
      The coin replaces rotations entirely, sorted and random feeds cost
      within two percent of each other (asserted), deletes are local
      unlinks, range scans are walks, and the lock-free versions that run
      Redis and Java exist <em>because</em> nothing ever restructures.
    </>
  ),
  weakness: (
    <>
      <strong>Expected, not guaranteed, and not the visit-count winner.</strong>{' '}
      AVL answered the same searches in 13.4 visits to the skip
      list&apos;s 41: determinism and tighter paths, bought with rotation
      machinery. The skip list&apos;s bounds are probabilistic (the p99
      tail is measured tame, but it is a tail), and the towers cost about
      2× the pointers of a tree.
    </>
  ),

  problem: 'Ordered dictionaries and balanced search trees',
  problemSlug: 'ordered-dictionary',
  rivals: [
    {
      name: 'Skip list × coin flips',
      isThisUnit: true,
      algoName: 'Skip list',
      cost: 'O(log n) expected',
      wins: (
        <>
          <strong>41.0 vs 39.8</strong> visits across the two arrival
          orders: immunity by construction, with no rebalancing code
          anywhere, and lock-free versions in production.
        </>
      ),
      costs: (
        <>
          Probabilistic bounds (p99 = 43, measured), ~3× AVL&apos;s visit
          count, double the pointers.
        </>
      ),
      when: 'Concurrent ordered maps, memtables, leaderboards: wherever rotations would fight the locks.',
    },
    {
      name: 'AVL tree',
      cost: 'O(log n), guaranteed',
      wins: (
        <>
          The visit-count champion: <strong>13.4</strong> on both feeds,
          deterministic, with the balance invariant verified node-by-node
          in the tests.
        </>
      ),
      costs: (
        <>
          <strong>1,989 rotations</strong> on this feed and the machinery
          to perform them: multi-node restructuring that concurrency
          pays for dearly.
        </>
      ),
      when: 'Single-threaded exact guarantees, hot read paths, adversarial inputs.',
    },
    {
      name: 'Treap',
      cost: 'O(log n) expected',
      wins: (
        <>
          The other lottery: random <em>priorities</em> plus BST rotations
          give the same order-immunity with tree topology (and set
          split/merge as a bonus).
        </>
      ),
      costs: (
        <>
          It kept the rotations the skip list abolished, so the
          concurrency story is the tree world&apos;s again.
        </>
      ),
      when: 'Randomized balance with tree structure: competitive programming’s split/merge workhorse.',
    },
    {
      name: 'Sorted array + binary search',
      algoName: 'Binary search',
      cost: 'O(log n) search, O(n) insert',
      wins: (
        <>
          The cheapest searches on the bench (puzzle 22&apos;s twenty
          probes) and, fed in sorted order, the cheapest everything:{' '}
          <strong>14.2</strong> visits per op.
        </>
      ),
      costs: (
        <>
          Random arrivals shift half the tail per insert:{' '}
          <strong>2,514.9</strong> visits per op, the worst cell in the
          table.
        </>
      ),
      when: 'Build-once-query-forever data, or arrivals genuinely known to come in order.',
    },
  ],
  neverUse: {
    name: 'A plain BST fed ordered data',
    why: (
      <>
        Under random arrivals it is genuinely fine (16.7 visits, better
        than the skip list). Fed the same keys <em>in order</em>: every
        insert goes right, the tree is a linked list wearing a
        tree&apos;s API, and the measured cost is <strong>1,182 visits
        per operation at a mere n = 2,000</strong>, growing linearly
        forever. Sorted arrivals are not an edge case: they are ids,
        timestamps, and log keys: the default shape of real feeds. If the
        input&apos;s order is not yours to choose, the structure&apos;s
        balance must not depend on it.
      </>
    ),
  },

  contest: {
    instance:
      'n = 20,000 keys inserted then 20,000 searched; average visits per operation, under two arrival orders: uniformly random, and fully sorted (the plain BST’s sorted cell is measured at n = 2,000 because it is that bad)',
    columns: ['random arrivals', 'sorted arrivals'],
    rows: [
      {
        method: 'Skip list × coin flips',
        isThisUnit: true,
        values: ['41.0', '39.8'],
        verdict: 'the lottery never looks at arrival order: 2% apart',
      },
      {
        method: 'AVL tree',
        values: ['13.4', '13.4'],
        best: 0,
        verdict: 'fewer visits and equally immune, at 1,989 rotations',
      },
      {
        method: 'Plain BST',
        values: ['16.7', '1,182.0'],
        verdict: 'loves chaos, dies of order: the linked list in disguise',
      },
      {
        method: 'Sorted array',
        values: ['2,514.9', '14.2'],
        best: 1,
        verdict: 'dies of chaos, loves order: every regime has its structure',
      },
    ],
    source:
      'python solutions/skip_list_coin_flips.py prints this table and asserts shadow-set agreement through 10,000 mixed operations with exact in-order iteration, the geometric coin (heights ≥ k at rate 2^(1−k)), expected-log with a measured p99 tail of 43 visits, order-immunity within 15%, the BST collapse beyond 30× the skip list on sorted feed, and the AVL balance invariant at every node.',
  },

  figure: (
    <Figure
      id="fig-skiplist-lanes"
      aspect="16 / 7"
      caption="Express lanes by lottery. Every key stands in the base lane; each also stands in the lane above with probability one half, decided by its own coin at insertion. A search rides the top lane until it would overshoot, takes the stairs down, and repeats: expected O(log n) stairs and rides, and since no coin ever saw the arrival order, no arrival order can bias the structure. The tree world's rebalancing is not simplified here; it is replaced by probability."
      cite={{
        text: 'Pugh, "Skip Lists: A Probabilistic Alternative to Balanced Trees", CACM 33(6), 1990. The lock-free significance came later: Java’s ConcurrentSkipListMap, Redis sorted sets, and LSM memtables all build on the absence of rotations.',
        href: 'https://doi.org/10.1145/78973.78977',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="Four skip-list lanes over ten keys with towers of coin-flipped heights and a staircase search path descending to the target">
        {(() => {
          const keys = [3, 7, 12, 19, 24, 31, 38, 45, 52, 60];
          const heights = [1, 3, 1, 2, 4, 1, 2, 1, 3, 1];
          const x = (i) => 60 + i * 56;
          const y = (lvl) => 216 - lvl * 44;
          const els = [];
          for (let lvl = 0; lvl < 4; lvl++) {
            els.push(<line key={`lane${lvl}`} x1={30} y1={y(lvl)} x2={610} y2={y(lvl)} stroke="rgba(93,162,255,0.16)" strokeWidth="1" />);
            els.push(<text key={`ll${lvl}`} x={8} y={y(lvl) + 4} fill="#6b7690" fontFamily="ui-monospace, monospace" fontSize="9">L{lvl}</text>);
          }
          keys.forEach((k, i) => {
            for (let lvl = 0; lvl < heights[i]; lvl++) {
              els.push(
                <rect key={`t${i}-${lvl}`} x={x(i) - 13} y={y(lvl) - 11} width={26} height={22} rx={4}
                  fill="rgba(93,162,255,0.12)" stroke="#5da2ff" strokeWidth="1.1" />,
              );
              if (lvl === 0) {
                els.push(<text key={`k${i}`} x={x(i)} y={y(0) + 4} textAnchor="middle" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="10">{k}</text>);
              }
            }
          });
          // Search path for 45: L3 from head to 24; drop; L2 24->38? heights: 24 has h4; 38 h2; ride L2 24->38; drop L1: 38 -> (45 h1 no)... L1: 38 to 52? 52 h3 yes overshoot; drop L0: 38 -> 45.
          const path = [
            [30, y(3)], [x(4), y(3)],
            [x(4), y(2)], [x(4), y(2)],
            [x(4), y(1)], [x(6), y(1)],
            [x(6), y(0)], [x(7), y(0)],
          ];
          for (let i = 0; i + 1 < path.length; i++) {
            els.push(<line key={`p${i}`} x1={path[i][0]} y1={path[i][1]} x2={path[i + 1][0]} y2={path[i + 1][1]} stroke="#62d98a" strokeWidth="2.4" opacity="0.9" />);
          }
          els.push(<circle key="target" cx={x(7)} cy={y(0)} r={14} fill="none" stroke="#62d98a" strokeWidth="2" />);
          return els;
        })()}
        <text x="40" y="262" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="12">searching 45: ride, overshoot, stairs down, ride · expected 2·log₂ n moves</text>
        <text x="40" y="280" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="12">tower heights: each key flipped its own coin · heads promote, tails stop</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'skip_list_coin_flips.py',
  Viz: SkipListViz,
  narration,
};
