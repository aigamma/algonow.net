import TreapViz from '../viz/TreapViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/treap_random_priorities.py?raw';
import { narration } from './treap-random-priorities.narration.js';

export const content = {
  given:
    'An ordered dictionary that must survive its own input. A plain binary search tree is perfect on shuffled keys and a disaster on sorted ones: fed 4,000 sequential keys it becomes a 4,000-link list, and every lookup walks it.',
  task: 'Give every key one random priority at birth and maintain two orders at once: a search tree on the keys (in-order = sorted) and a max-heap on the priorities: all edits by split and merge.',
  constraint:
    'A set referee shadows a 30,000-operation workload: in-order equals sorted(reference) at every checkpoint, both invariants audited over the whole tree, 500 split/merge round-trips exact. The theorem is measured: average depth 20.4 against the 2 ln n = 23.0 expectation at n = 100,000; the canonical-shape property proven by building one (key, priority) set in three orders and asserting identical trees; and the adversary priced: 2,007 visits per lookup for the plain BST, 14.8 for the treap.',

  origins: (
    <p>
      Two ideas, nine years apart. Jean Vuillemin&apos;s{' '}
      <strong>1980</strong> cartesian tree showed a set of (key,
      priority) pairs defines exactly one tree that is
      simultaneously a BST on keys and a heap on priorities.
      Cecilia Aragon and Raimund Seidel&apos;s{' '}
      <strong>1989</strong> randomized search trees supplied the
      missing move: draw the priorities <em>at random</em>, and
      that unique tree is distributed exactly like a BST built
      from a random insertion order: expected depth O(log n){' '}
      <em>regardless of the actual arrival order</em>. The
      portmanteau stuck: tree + heap = treap. It shares a
      birthday spirit with the skip list (Pugh, 1990: a live
      unit here): two structures that replaced delicate
      rebalancing with dice: and its modern descendant, the zip
      tree (Tarjan, 2018), sits one shelf over in the atlas.
      Competitive programmers made the treap a workhorse: split
      and merge compose into interval operations no rotation
      dance matches.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>two orders and the two verbs</strong>.
      Every node satisfies BST order on keys and heap order on
      priorities: both audited here over the whole tree at ten
      workload checkpoints, never assumed. All editing reduces to{' '}
      <strong>split</strong> (cut the tree at a key into a
      &lt;-tree and a &ge;-tree) and <strong>merge</strong> (zip
      two key-disjoint trees, higher priority on top): insert =
      split, make a leaf, merge twice; delete = two splits, drop
      the middle, merge. Five hundred split/merge round-trips
      restored the exact in-order sequence, and a 30,000-op
      mixed workload never once disagreed with the set referee.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>dice</strong>: one uniform priority
      per key, drawn at birth, fixed for life. The consequence is
      the page&apos;s theorem: the tree&apos;s shape is a{' '}
      <strong>canonical function of the (key, priority) set</strong>,
      independent of arrival order: proven here by inserting the
      same 3,000 pairs ascending, descending, and shuffled, and
      asserting the three trees identical node for node. So the
      adversary who controls arrival order controls nothing:
      sequential keys left the treap at 14.8 visits per lookup
      while the plain BST bloated to 2,007. Depth at n =
      100,000: average 20.4, maximum 41, right beside the 2 ln n
      = 23.0 the proof promises.
    </p>
  ),

  picture: (
    <p>
      An office seating chart with a lottery. Rank people
      left-to-right by <em>name</em> (that is the searchable
      order), but decide who sits <em>above</em> whom by a
      lottery ticket each person drew on their first day. One
      arrangement satisfies both rules at once, and here is the
      trick: the arrangement depends only on who holds which
      ticket: not on the order anyone joined the company. A rival
      office that promotes by seniority (arrival order) can be
      gamed: hire in alphabetical order and their chart
      degenerates into one long reporting chain: 4,000 deep on
      this page. The lottery office cannot be gamed, because the
      adversary does not hold the dice. And reorganizations are
      two verbs: split the chart at a name, merge two charts
      ticket-by-ticket: no delicate case analysis, no rotation
      choreography: which is why this structure cuts and splices
      whole intervals as easily as it inserts one key.
    </p>
  ),

  steps: [
    <>
      <strong>Draw at birth:</strong> each key gets one uniform
      priority, fixed for life: the only randomness in the
      structure.
    </>,
    <>
      <strong>Split:</strong> cut at a key into a &lt;-tree and a
      &ge;-tree, heap order preserved on both sides: 500
      round-trips verified exact.
    </>,
    <>
      <strong>Merge:</strong> zip two key-disjoint trees, higher
      priority wins the root: split&apos;s exact inverse.
    </>,
    <>
      <strong>Edit by composition:</strong> insert = split +
      leaf + two merges; delete = two splits, drop the middle,
      merge: no rebalancing cases, ever.
    </>,
    <>
      <strong>Trust the theorem, then check it:</strong> depth
      20.4 average at n = 100,000 (2 ln n = 23.0), and the same
      shape from three arrival orders.
    </>,
  ],

  signals: [
    <>
      <strong>Input order you do not control:</strong> keys
      arriving sorted, nearly sorted, or adversarially: the exact
      inputs that collapse naive trees (2,007 vs 14.8 visits
      here).
    </>,
    <>
      <strong>Interval surgery:</strong> split and merge make
      cut-a-range, move-a-range, join-two-sets first-class:
      the treap&apos;s signature over rotation-based trees.
    </>,
    <>
      <strong>Simplicity with proof:</strong> two short recursive
      functions carry the whole structure: when audit-ability
      beats squeezing the last constant, dice beat cases.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the <strong>plain BST</strong>, and
      the parity row protects it: on shuffled input it matched
      the treap at 14.8 visits per lookup: randomness in the{' '}
      <em>data</em> balances it for free. The treap&apos;s
      premium buys the case where the data is not random:
      sequential arrival, 2,007 vs 14.8. The <strong>sorted
      array</strong> wins pure lookups (12 probes) and loses
      insertion: 2,000 elements shifted per arrival on this
      instance.
    </>
  ),

  strength: (
    <>
      <strong>Adversary-proof balance from one random draw, with
      the theorem cashed out.</strong> In-order equaled the
      sorted reference at every checkpoint of a 30,000-op
      workload with both invariants audited over the whole tree;
      the canonical-shape property held across three arrival
      orders, node for node; depth at n = 100,000 averaged 20.4
      against the promised 2 ln n = 23.0; and the sequential
      adversary that inflates a plain BST 136-fold never moved
      the treap&apos;s bill at all. Split and merge do all of it
      in two short functions.
    </>
  ),
  weakness: (
    <>
      <strong>Expected, not guaranteed: and the dice must stay
      secret.</strong> The O(log n) is an expectation: any single
      operation can run long (max depth 41 here vs average
      20.4), so hard-real-time code prefers a red-black
      tree&apos;s worst-case certificate. An adversary who can
      see or predict the priorities defeats them: this
      page&apos;s neverUse shows key-derived
      &quot;priorities&quot; collapsing to depth 4,000: so the
      generator seed must not leak. Each node also carries a
      stored priority the deterministic trees skip, and against
      a static sorted array the treap loses pure-lookup work 14.8
      to 12: pay for dynamism only when you have churn.
    </>
  ),

  problem: 'Ordered dictionary',
  problemSlug: 'ordered-dictionary',
  rivals: [
    {
      name: 'Treap × random priorities',
      isThisUnit: true,
      algoName: 'Treap',
      cost: 'O(log n) expected',
      wins: (
        <>
          <strong>Order-proof balance</strong> from one draw per
          key, plus split/merge interval surgery: 14.8 visits per
          lookup whatever the arrival order.
        </>
      ),
      costs: (
        <>
          Expected bounds only, a stored priority per node, and
          the dice must stay unpredictable.
        </>
      ),
      when: 'Untrusted input order, range cut-and-splice, or when two auditable functions beat case analysis.',
    },
    {
      name: 'Skip list',
      cost: 'O(log n) expected',
      wins: (
        <>
          The live unit and the treap&apos;s randomized sibling:
          coin-flip towers over sorted lists, lock-friendly
          enough that ConcurrentSkipListMap ships on it.
        </>
      ),
      costs: (
        <>
          More pointers per key on average, and the same
          expected-only guarantee: dice, not certificates.
        </>
      ),
      when: 'Concurrent ordered maps, or when the list-of-lists mental model fits the team.',
    },
    {
      name: 'Red-black tree',
      cost: 'O(log n) worst case',
      wins: (
        <>
          The deterministic industrial default: worst-case
          certificates on every operation: std::map, Java&apos;s
          TreeMap, kernel schedulers all ride its color rules.
        </>
      ),
      costs: (
        <>
          The rebalancing case analysis is famously intricate:
          correctness by careful enumeration, not by one theorem.
        </>
      ),
      when: 'Hard latency bounds or library-grade guarantees: the certificate is the product.',
    },
    {
      name: 'Splay tree',
      cost: 'O(log n) amortized',
      wins: (
        <>
          Self-adjusting: every access splays its key to the
          root, so hot keys get cheap: static-optimality
          conjectured, caching behavior for free.
        </>
      ),
      costs: (
        <>
          A single operation can cost O(n), writes happen on
          every read, and uniform access patterns thrash it.
        </>
      ),
      when: 'Skewed access with hot keys: caches, rope-like text buffers.',
    },
  ],
  neverUse: {
    name: 'Deterministic "priorities" derived from the keys',
    why: (
      <>
        The half-understood version: keep the elegant split/merge
        machinery but save a random draw by hashing the key into
        its priority, or worse, using the key itself. Measured
        here: priorities set to -key on sequential input rebuilt
        the exact pathology the treap exists to prevent:{' '}
        <strong>depth 4,000 of 4,000, 2,007 visits per
        lookup</strong>: a linked list wearing a treap costume.
        The entire theorem rests on the priorities being
        independent of the key order, so any deterministic
        function of the key hands the adversary the dice (a
        predictable hash just makes them work slightly for it:
        adversarial-input attacks on hash-shaped structures are
        a real security genre). The random draw is not an
        implementation detail to optimize away. It is the
        load-bearing wall.
      </>
    ),
  },

  contest: {
    instance:
      'an ordered dictionary of 4,000 keys under three arrival orders; one currency: node visits per lookup (1,000 probed keys, every membership referee-checked)',
    columns: ['plain bst', 'treap', 'sorted array'],
    rows: [
      {
        method: 'Random insertion order',
        values: ['14.8', '14.8', '12'],
        best: 2,
        verdict: 'parity, said plainly: randomness in the data balances the plain BST for free',
      },
      {
        method: 'Sequential insertion order',
        isThisUnit: true,
        values: ['2,007.0', '14.8', '12'],
        best: 1,
        verdict: 'the adversary: the BST is a 4,000-link list; the treap’s dice never noticed',
      },
      {
        method: 'Insert cost (elements moved)',
        values: ['~depth', '~depth', '2,000'],
        best: 1,
        verdict: 'the array wins lookups and pays half the array per arrival: static vs dynamic',
      },
    ],
    source:
      'python solutions/treap_random_priorities.py prints this table and asserts: in-order equal to sorted(reference) at all 10 checkpoints of a 30,000-op mixed workload with BST and heap order audited over the whole tree; 500 split/merge round-trips exact; the canonical-shape property (three insertion orders of one (key, priority) set produce identical preorders); average depth 20.4 within 2.5 ln n at n = 100,000 (2 ln n = 23.0, max 41); the plain BST over 100× the treap on sequential input; and key-derived priorities collapsing to depth 4,000.',
  },

  figure: (
    <Figure
      id="fig-treap-two-orders"
      aspect="16 / 7"
      caption="Two orders, one tree, and the dice hold the shape. Keys read left-to-right in BST order; priorities decrease downward in heap order; the unique tree satisfying both is a canonical function of the (key, priority) set, independent of arrival order (proven here across three orders, node for node). Random draws make that shape behave like a random-order BST: average depth 20.4 at n = 100,000 against the 2 ln n = 23.0 expectation: while sequential arrival, which stretches a plain BST to depth 4,000 (2,007 visits per lookup), leaves the treap at 14.8."
      cite={{
        text: 'R. Seidel, C. R. Aragon, "Randomized Search Trees," Algorithmica 16, 1996 (FOCS 1989). DOI 10.1007/BF01940876. Cartesian trees: Vuillemin 1980; kin: skip lists (Pugh 1990), zip trees (Tarjan et al. 2018).',
        href: 'https://doi.org/10.1007/BF01940876',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="A treap with keys in BST order and priorities in heap order, plus split and merge arrows and measured depth numbers">
        {[
          [320, 52, 'k=41', 'p=.97'],
          [170, 108, 'k=17', 'p=.81'],
          [470, 108, 'k=68', 'p=.74'],
          [90, 164, 'k=08', 'p=.52'],
          [250, 164, 'k=29', 'p=.66'],
          [400, 164, 'k=55', 'p=.31'],
          [545, 164, 'k=90', 'p=.45'],
        ].map(([x, y, k, p], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="20" fill="rgba(93,162,255,0.12)" stroke="#5da2ff" strokeWidth="1.5" />
            <text x={x} y={y - 2} fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="10" textAnchor="middle">{k}</text>
            <text x={x} y={y + 11} fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="9" textAnchor="middle">{p}</text>
          </g>
        ))}
        {[[320, 72, 170, 90], [320, 72, 470, 90], [170, 128, 90, 146], [170, 128, 250, 146], [470, 128, 400, 146], [470, 128, 545, 146]].map(([x1, y1, x2, y2], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(154,165,189,0.5)" strokeWidth="1.3" />
        ))}
        <text x="30" y="205" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="10">← keys in search order →</text>
        <text x="480" y="52" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="10">priorities decrease downward</text>
        <text x="480" y="66" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="10">(a max-heap: the dice)</text>
        <text x="30" y="232" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">split(k): one tree → (&lt;k, ≥k) · merge: the inverse · insert and delete are compositions</text>
        <text x="30" y="254" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">measured: avg depth 20.4 at n=100,000 (2 ln n = 23.0) · same shape from 3 arrival orders · adversary: bst 2,007 vs treap 14.8</text>
        <text x="30" y="276" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">key-derived priorities: depth 4,000 of 4,000: the randomness is the load-bearing wall</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'treap_random_priorities.py',
  Viz: TreapViz,
  narration,
};
