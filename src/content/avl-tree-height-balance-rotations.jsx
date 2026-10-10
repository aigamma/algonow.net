import AvlTreeViz from '../viz/AvlTreeViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/avl_tree_height_balance_rotations.py?raw';
import { narration } from './avl-tree-height-balance-rotations.narration.js';

export const content = {
  given:
    'A sorted set of keys under insert, delete, and lookup, in whatever order the keys arrive: random, already sorted, or chosen by someone who has read your code.',
  task: 'AVL tree. The binary search tree is the algorithm: smaller keys left, larger keys right, one comparison per level. The heuristic is the height-balance rule of Adelson-Velsky and Landis (1962): every node stores the height of its subtree, the two children of any node may differ in height by at most one, and an insertion or deletion that breaks the rule is repaired on the way back up by a single or double rotation at the lowest unbalanced node. The rule pins the height below 1.4405 log₂(n + 2) − 0.328, so no lookup costs more than about 1.44 log₂ n comparisons, and an insertion is repaired by at most one rotation.',
  constraint:
    'Measured on 20,000 keys with a Python set as referee (in-order walk equal to the sorted set at every checkpoint, every lookup matched, heights and balance factors audited at every node): under random arrival the AVL tree reaches height 17 against the bound 20.3 and the perfect-balance floor 15, with 4,732 single and 4,708 double rotations over 20,000 insertions and never more than one per insertion; under sorted arrival height 15, the floor itself, at one rotation per insertion; deleting 10,000 keys costs 0.369 rotations each. Lookups: 14.11 node visits against 14.29 for a left-leaning red-black tree, 17.79 for a treap, and 18.03 for the plain tree, whose height is 38. The plain tree under sorted arrival: height 4,000 at n = 4,000, 2,053 visits per lookup.',

  origins: (
    <p>
      Georgy Adelson-Velsky and Evgenii Landis (<strong>1962</strong>,
      &quot;An algorithm for the organization of information,&quot; Doklady
      Akademii Nauk SSSR 146, translated in Soviet Mathematics Doklady 3)
      described the first self-balancing search tree, and the bound on its
      height follows from a Fibonacci argument about the sparsest tree the
      rule allows. Knuth analyzed it in volume three of The Art of
      Computer Programming (1973), where the name AVL and the tabulated
      rotation frequencies come from. Rudolf Bayer&apos;s symmetric binary
      B-trees (1972) became the red-black tree of Guibas and Sedgewick
      (1978), the looser rival that trades a taller tree for cheaper
      updates; Sedgewick&apos;s left-leaning formulation (2008) is the one
      raced on this page. Pfaff&apos;s libavl and the ordered-map
      implementations in several language runtimes keep the AVL rule
      where lookups outnumber updates.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>search</strong>: one comparison per level, left or
      right, until the key or an empty slot. Everything the tree can do
      (membership, predecessor, successor, a range walk) is that descent
      plus an in-order walk, so its cost is the height. The referee is a
      Python set shadowing every operation: 20,000 insertions, 2,000
      lookups half present and half absent, 6,666 deletions, and 6,666
      reinsertions, with the in-order walk compared to the sorted set at
      every checkpoint. The tree answered every one of them correctly, at{' '}
      <strong>14.11 node visits per lookup</strong>.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>shape</strong>: a height stored in every node, a
      balance factor in {'{'}−1, 0, +1{'}'} audited at every node, and a
      rotation at the lowest node that breaks it. Measured against the
      theorems: height <strong>17 under the bound 20.3</strong> and above
      the floor 15 at n = 20,000; 4,732 single and 4,708 double rotations
      over 20,000 random insertions, never two on one insertion; sorted
      arrival, the order that stretches a plain tree into a list, builds
      height 15 at exactly one rotation per insertion. Take the rule away
      and the same keys build height 38 (random) or 4,000 (sorted).
    </p>
  ),

  picture: (
    <p>
      A librarian shelving books into a tree of shelves, each shelf
      labeled with how tall the stack beneath it is. After every new book
      she walks back up the path she came down, relabels, and the moment
      one shelf&apos;s two sides differ in height by two she swings the
      heavier side up with a single twist, or two twists when the weight
      sits on the inner grandchild. One twist and the walk is over; the
      labels above cannot have changed. The shelves never get more than
      forty-four percent taller than a perfectly packed stack, however
      the books arrive.
    </p>
  ),

  steps: [
    <>
      <strong>Descend:</strong> compare at each node, go left or right,
      stop at the key (no change) or at an empty slot (new node of height
      one).
    </>,
    <>
      <strong>Unwind:</strong> on the way back up, set height = 1 +
      max(left, right) and balance = height(left) − height(right).
    </>,
    <>
      <strong>Single rotation:</strong> balance +2 with a left child of
      balance ≥ 0 (or the mirror): rotate right at this node; the
      left child becomes the subtree root.
    </>,
    <>
      <strong>Double rotation:</strong> balance +2 with a left child of
      balance −1 (or the mirror): rotate left at the child, then right
      here; the inner grandchild becomes the root.
    </>,
    <>
      <strong>Stop:</strong> after one rotation an insertion is done (the
      subtree height is what it was). A deletion swaps in the in-order
      successor and may repair every level: measured, 0.369 rotations per
      deletion.
    </>,
  ],

  signals: [
    <>
      <strong>Lookups outnumber updates:</strong> the strict rule buys the
      shortest tree of the rotation-based family (17 against 21 and 33).
    </>,
    <>
      <strong>A worst case that must hold:</strong> real-time code, or an
      arrival order an adversary controls; the bound is a theorem, not an
      expectation.
    </>,
    <>
      <strong>Ordered operations in memory:</strong> predecessor,
      successor, range walks, order statistics with a size per node; a
      hash table gives none of these.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the <strong>plain binary search tree</strong>:
      the same search with no rule. Under random arrival it is only a
      little worse (18.03 visits and height 38 against 14.11 and 17);
      under sorted arrival it is a linked list.
    </>
  ),

  strength: (
    <>
      <strong>The shortest tree for any arrival order, with one rotation
      per insertion.</strong> Height 17 at n = 20,000 (bound 20.3, floor
      15); 14.11 visits per lookup against 14.29 for red-black, 17.79 for
      the treap, and 18.03 for the plain tree; sorted arrival builds the
      floor itself.
    </>
  ),
  weakness: (
    <>
      <strong>Updates pay for the lookups.</strong> 0.707 rotations per
      random insertion, a stored height in every node, and a deletion that
      can rotate at several levels (at most 3 rebalancings seen on one
      deletion here). A tree that is updated far more than it is read is
      better served by a looser rule, and a tree on disk by a wider node.
    </>
  ),

  problem: 'Ordered dictionaries and balanced search trees',
  problemSlug: 'ordered-dictionary',
  rivals: [
    {
      name: 'AVL tree × Height-balance rotations',
      isThisUnit: true,
      algoName: 'AVL tree',
      cost: 'O(log n) worst case; a height per node',
      wins: (
        <>
          <strong>Height 17 at n = 20,000</strong>, the shortest of the
          four; 14.11 visits per lookup; one rotation per insertion.
        </>
      ),
      costs: (
        <>
          0.707 rotations per insertion; deletions repair several levels.
        </>
      ),
      when: 'Lookups dominate, or the worst case must be a theorem.',
    },
    {
      name: 'Red-black tree',
      algoName: 'Red-black tree',
      cost: 'O(log n) worst case; one bit per node',
      wins: (
        <>
          Height within 2 log₂(n + 1); a classic insertion rotates at
          most twice and a deletion at most three times; one color bit.
        </>
      ),
      costs: (
        <>
          A taller tree (21 against 17); 14.29 visits per lookup; the
          left-leaning variant raced here rotates 15.3 times per deletion.
        </>
      ),
      when: 'Updates and lookups are mixed; the default in most standard libraries.',
    },
    {
      name: 'Treap',
      algoName: 'Treap',
      cost: 'O(log n) expected; a random priority per node',
      wins: (
        <>
          Shape independent of arrival order; split and merge in one
          rotation sequence; a few dozen lines.
        </>
      ),
      costs: (
        <>
          Height 33 and 17.79 visits per lookup; 1.98 rotations per
          insertion; the bound is an expectation.
        </>
      ),
      when: 'You need split and merge, or the simplest balanced tree that is never bad in expectation.',
    },
    {
      name: 'Splay tree',
      algoName: 'Splay tree',
      cost: 'O(log n) amortized; no per-node data',
      wins: (
        <>
          Recently touched keys rise to the root; static optimality;
          nothing stored per node.
        </>
      ),
      costs: (
        <>
          A single lookup can cost n; every lookup writes to the tree;
          no worst-case bound per operation.
        </>
      ),
      when: 'Access is skewed and bursty, and no single operation has a deadline.',
    },
  ],
  neverUse: {
    name: 'A plain binary search tree on keys that arrive in order',
    why: (
      <>
        Sorted input is the common case, not the exotic one: a log replayed
        by time, keys from an auto-increment, a file read in order. Each new
        key is larger than every key in the tree, so it hangs off the
        right end: the tree is a linked list. Measured at n = 4,000,{' '}
        <strong>height 4,000 and 2,053 node visits per lookup</strong>,
        against 13.88 for the AVL tree built from the same sorted keys at
        n = 20,000; at 20,000 keys the plain tree would not finish the
        workload. One stored height and one rotation per insertion turn
        the worst order into the best tree.
      </>
    ),
  },

  contest: {
    instance:
      'an ordered set of 20,000 keys (random arrival, then a mixed phase of 6,666 deletions and 6,666 reinsertions), with a second build from the same keys in sorted order; one currency: node visits per lookup over 2,000 probes (half present, half absent inside the key range) and rotations per update; referee: a Python set at every checkpoint',
    columns: ['lookup visits', 'height', 'rotations / insert', 'rotations / delete', 'sorted arrival'],
    rows: [
      {
        method: 'AVL tree',
        isThisUnit: true,
        values: ['14.11', '17', '0.707', '0.379', 'height 15 as built; 13.88 visits'],
        best: 0,
        verdict: 'under the bound 20.3; floor 15',
      },
      {
        method: 'red-black tree (left-leaning)',
        values: ['14.29', '21', '1.198', '15.307', 'height 20; 13.88 visits'],
        verdict: 'looser rule, taller tree',
      },
      {
        method: 'treap',
        values: ['17.79', '33', '1.980', '0.968', 'height 41; 19.66 visits'],
        verdict: 'expected balance only',
      },
      {
        method: 'plain binary search tree',
        values: ['18.03', '38', '0', '0', 'height 4,000 at n = 4,000; 2,053 visits'],
        verdict: 'the baseline; a list on sorted input',
      },
    ],
    source:
      'python solutions/avl_tree_height_balance_rotations.py prints this table and asserts: in-order walk equal to the sorted referee at every checkpoint for every structure; every lookup matched; AVL heights, stored heights, and balance factors audited at every node; height under 1.4405 log2(n + 2) - 0.328 and at or above ceil(log2(n + 1)) at five sizes; at most one rebalancing on every one of 20,000 insertions; the red-black rules audited; the plain tree at height 4,000 under sorted arrival; and the orderings in the table.',
  },

  figure: (
    <Figure
      id="fig-avl-double-rotation"
      aspect="16 / 7"
      caption="Left: the double rotation. Inserting 15 under 10 leaves 20 with balance +2 and its left child 10 with balance −1 (the weight on the inner grandchild), so one rotation at 10 and one at 20 lift 15 to the root; every subtree keeps its order and the height returns to what it was before the insertion. Right: height at n = 20,000 under random arrival, measured, against the AVL bound and the perfect-balance floor."
      cite={{
        text: 'G. M. Adelson-Velsky and E. M. Landis, "An algorithm for the organization of information," Doklady Akademii Nauk SSSR 146, 1962, pp. 263-266 (Soviet Mathematics Doklady 3, pp. 1259-1263). D. E. Knuth, The Art of Computer Programming, vol. 3, section 6.2.3, 1973. L. J. Guibas and R. Sedgewick, "A dichromatic framework for balanced trees," FOCS 1978, DOI 10.1109/SFCS.1978.3.',
        href: 'https://doi.org/10.1109/SFCS.1978.3',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="A three-node tree before and after a double rotation, beside bars of measured tree heights for four structures against the AVL bound and the perfect floor">
        {(() => {
          const node = (x, y, label, color, extra) => (
            <g key={`${x}-${y}-${label}`}>
              <circle cx={x} cy={y} r="14" fill={color} fillOpacity="0.9" />
              <text x={x} y={y + 4} textAnchor="middle" fill="#0b0d12" fontFamily="ui-monospace, monospace" fontSize="11" fontWeight="700">{label}</text>
              {extra && <text x={x + 18} y={y - 10} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">{extra}</text>}
            </g>
          );
          const edge = (x1, y1, x2, y2) => <line key={`${x1}-${y1}-${x2}-${y2}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#9aa5bd" strokeOpacity="0.7" />;
          const bars = [['floor', 15, '#62d98a'], ['AVL', 17, '#5da2ff'], ['bound', 20.3, '#9aa5bd'], ['red-black', 21, '#f0b94b'], ['treap', 33, '#f0b94b'], ['plain', 38, '#e2606c']];
          const bx = 430;
          const by = 236;
          const hgt = (v) => (v / 40) * 180;
          return (
            <g>
              <text x="24" y="22" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">before: 20 has balance +2, its left child 10 has balance −1</text>
              {edge(90, 70, 50, 120)}
              {edge(50, 120, 90, 170)}
              {edge(90, 70, 130, 120)}
              {node(90, 70, '20', '#e2606c', '+2')}
              {node(50, 120, '10', '#f0b94b', '−1')}
              {node(130, 120, '30', '#5da2ff')}
              {node(90, 170, '15', '#5da2ff', 'new')}
              <text x="170" y="120" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="14">⟹</text>
              <text x="200" y="22" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">after: rotate left at 10, then right at 20</text>
              {edge(290, 70, 250, 120)}
              {edge(290, 70, 330, 120)}
              {node(290, 70, '15', '#62d98a', '0')}
              {node(250, 120, '10', '#5da2ff', '0')}
              {node(330, 120, '20', '#5da2ff', '0')}
              <text x="24" y="226" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">one rotation (single or double) per insertion; the</text>
              <text x="24" y="240" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">subtree is as tall as before, so the walk up stops</text>
              <text x="24" y="262" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">measured: 4,732 single, 4,708 double over 20,000 inserts</text>
              <text x={bx} y="22" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">height at n = 20,000, random arrival</text>
              {bars.map(([name, v, color], i) => (
                <g key={name}>
                  <rect x={bx + i * 34} y={by - hgt(v)} width="24" height={hgt(v)} fill={color} fillOpacity="0.85" />
                  <text x={bx + i * 34} y={by - hgt(v) - 4} fill={color} fontFamily="ui-monospace, monospace" fontSize="9">{v}</text>
                  <text x={bx + i * 34} y={by + 12} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="8">{name}</text>
                </g>
              ))}
              <text x={bx} y="262" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">bound 1.4405 log2(n + 2) − 0.328 = 20.3; floor 15</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'avl_tree_height_balance_rotations.py',
  Viz: AvlTreeViz,
  narration,
};
