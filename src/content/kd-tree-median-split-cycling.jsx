import KdTreeViz from '../viz/KdTreeViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/kd_tree_median_split_cycling.py?raw';
import { narration } from './kd-tree-median-split-cycling.narration.js';

export const content = {
  given:
    'Sixty thousand points on a map and a stream of "what is closest to here?" questions. The brute-force scan answers each one honestly: by measuring the distance to every single point, every single time.',
  task: 'Carve space once: split the points at their median along one axis, cycle to the next axis a level down, recurse. A query descends to its home cell, then unwinds, entering a sibling subtree only if the best-so-far ball crosses its splitting plane.',
  constraint:
    'The referee is brute force itself: 1,200 refereed queries across four instances, tree distance equal to the scanned distance, exactly, every time. The structure is audited (k-d property at all 60,000 nodes, depth 16 ≤ 17, content the exact input multiset), the 2D carve examines 2,706× fewer points, and the famous failure is measured, not recited: at d = 16 the tree visits 99% of everything.',

  origins: (
    <p>
      Jon Louis Bentley, <strong>1975</strong>, as a Stanford
      student: &quot;Multidimensional binary search trees used
      for associative searching,&quot; in the CACM. The name
      k-d tree is the paper&apos;s own: a k-dimensional binary
      search tree, one comparison per level, axes taken in turn.
      Friedman, Bentley, and Finkel supplied the nearest-neighbor
      query and its logarithmic expected-time analysis in 1977,
      and the structure became the default spatial index of an
      era: scikit-learn&apos;s neighbor searches, photon maps in
      graphics (ray tracers pair the same tree with a different
      split rule, the surface-area heuristic: a separate atlas
      entry), robot motion planners. Its famous limit has an
      older name still: Bellman coined &quot;the curse of
      dimensionality&quot; in 1961, and this page gives the curse
      a number instead of a shudder.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>carve and the unwind</strong>: build by
      recursive splitting, then answer a query by walking down to
      the home cell (a first candidate in ~17 comparisons) and
      unwinding the recursion. On the way back up, each
      node&apos;s far child is a region the query never entered:
      it is visited <em>only if</em> the current best ball
      crosses the splitting plane. The whole-subtree k-d property
      (every left descendant &le; the split on its axis, every
      right &ge;) was verified at all 60,000 nodes, and the tree
      holds exactly the input multiset: the carve loses nothing.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>construction rule</strong> that makes
      the prune bite: split at the <em>median</em>, cycle the{' '}
      <em>axis</em>. Medians guarantee balance (depth audited at
      16 against the ceil(log2 n) + 1 = 17 bound), so descent is
      logarithmic; cycling gives every dimension its turn, so
      cells stay squarish and the best-ball rarely crosses
      planes. The measured result in 2D: <strong>22.2 nodes
      visited per query against 60,000 scanned</strong>: 2,706×.
      The same rule&apos;s honest limit: as d grows, each axis
      gets its turn only every d levels, cells stop being
      squarish, and the prune dies: 569 visits at d = 8, 3,961
      of 4,000 at d = 16.
    </p>
  ),

  picture: (
    <p>
      Finding the nearest coffee shop with a paper map that has
      been folded smartly. Each fold halves the city through the
      median of its shops: first a north-south crease, then
      east-west, alternating. Your query walks the creases:
      seventeen quick which-side decisions land you in a tiny
      cell with a first candidate shop. Now the clever part: you
      hold a piece of string cut to that candidate&apos;s
      distance. Walking back up the folds, most creases sit
      farther away than your string is long: everything beyond
      them is <em>provably</em> too far, unopened. Only when the
      string crosses a crease do you peek at the other side.
      In two dimensions the string almost never crosses: 22
      peeks, 60,000 shops. In sixteen dimensions every crease
      sits close (there are so many directions to be close in)
      and you end up unfolding the entire map anyway: that is
      the curse, and this page counted it.
    </p>
  ),

  steps: [
    <>
      <strong>Carve:</strong> median split on the current axis,
      recurse with the next axis: balance audited, depth 16 &le;
      17.
    </>,
    <>
      <strong>Descend:</strong> a query drops to its home cell:
      one comparison per level, a first candidate immediately.
    </>,
    <>
      <strong>Unwind and prune:</strong> a far subtree is entered
      only if (query - split)² is under the best distance: the
      slab test.
    </>,
    <>
      <strong>Tighten:</strong> every visited node may shrink the
      best ball, and a smaller ball prunes harder: 22.2 visits
      average in 2D.
    </>,
    <>
      <strong>Know the regime:</strong> the same code measured at
      d = 2, 8, 16: visits 18 → 569 → 3,961: the tool is
      dimensional, and says so.
    </>,
  ],

  signals: [
    <>
      <strong>Low-dimensional coordinates:</strong> maps, game
      worlds, robot configuration slices, color spaces: d of 2
      to ~10 is k-d country, 2,706× measured here.
    </>,
    <>
      <strong>Many queries against one set:</strong> the carve is
      paid once and every query rides it: matchmaking, collision
      candidates, photon gathering, kNN classification.
    </>,
    <>
      <strong>Exactness required:</strong> unlike the hashing
      rivals, the tree returns the true nearest neighbor:
      refereed here against brute force 1,200 times without one
      disagreement.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the <strong>brute-force scan</strong>:
      n distances, no build, no structure, and correct by
      construction: it is literally this page&apos;s referee. At
      60,000 points it examines 60,000 per query where the tree
      examines 22.2. But hold the verdict until the dimension is
      known: at d = 16 the tree visited 3,961 of 4,000 anyway,
      and the scan: simpler, cache-friendly, overhead-free: is
      the better tool.
    </>
  ),

  strength: (
    <>
      <strong>Exact answers at logarithmic prices, in the right
      regime.</strong> 22.2 nodes examined per query against
      60,000: 2,706×, averaged over 2,000 queries: with every
      refereed answer equal to brute force&apos;s exact distance,
      1,200 of 1,200. The structure is audited, not assumed:
      the k-d property at every node via whole-subtree bounds,
      median balance hitting depth 16 on the 17 bound, range
      queries set-identical to a brute filter on 200 boxes. One
      build, then every query rides it.
    </>
  ),
  weakness: (
    <>
      <strong>The dimension is the contract.</strong> The prune
      lives on cells being squarish and planes being far; both
      die as d grows. Measured with the same code and n: 18
      visits at d = 2, 569 at d = 8, 3,961 of 4,000 (99%) at d =
      16: at which point the tree is a slower, pointer-chasing
      brute scan. Embedding vectors live at d = 384+, which is
      why vector search belongs to LSH and graph methods, not to
      this tree. Two smaller costs: the classic structure is
      static (heavy churn wants rebuilds or scapegoat-style
      variants), and skewed data blunts axis-cycling (ray
      tracers swap in the surface-area heuristic for exactly
      that reason).
    </>
  ),

  problem: 'Nearest neighbor search',
  problemSlug: 'nearest-neighbor-search',
  rivals: [
    {
      name: 'K-d tree × median splits',
      isThisUnit: true,
      algoName: 'K-d tree',
      cost: 'O(log n) expected query',
      wins: (
        <>
          <strong>Exact and fast in low d</strong>: 2,706× under
          brute here, balance guaranteed by medians, range
          queries for free.
        </>
      ),
      costs: (
        <>
          The curse, measured: 99% of the tree visited at d =
          16: and static under heavy churn.
        </>
      ),
      when: 'Coordinates with d ≲ 10, many queries, exactness required: maps, games, robots.',
    },
    {
      name: 'Ball tree',
      cost: 'O(log n) to O(n)',
      wins: (
        <>
          Bounding spheres instead of axis slabs: prunes by
          triangle inequality, holds up in moderately higher d
          and on clustered data: scikit-learn&apos;s other tree.
        </>
      ),
      costs: (
        <>
          Costlier construction, and the curse still wins
          eventually: spheres overlap just like slabs do.
        </>
      ),
      when: 'd in the awkward teens, clustered data, or non-axis-aligned structure.',
    },
    {
      name: 'Locality-sensitive hashing',
      cost: 'sublinear, approximate',
      wins: (
        <>
          The high-d escape hatch: hash so near points collide,
          probe a few buckets: sublinear at d = 384 where every
          tree has died.
        </>
      ),
      costs: (
        <>
          Approximate by contract: misses a true neighbor with
          tunable probability, and eats memory for its tables.
        </>
      ),
      when: 'Embeddings and high-d vectors where exactness is negotiable: the modern default.',
    },
    {
      name: 'Vantage-point tree',
      cost: 'O(log n) expected',
      wins: (
        <>
          Needs only a metric, no coordinates: picks a vantage
          point, splits by distance to it: edit distance and
          other coordinate-free spaces welcome.
        </>
      ),
      costs: (
        <>
          Same dimensional ceiling, and no axis-aligned range
          queries: the coordinate structure is what it gave up.
        </>
      ),
      when: 'Metric-only data: strings under edit distance, arbitrary similarity spaces.',
    },
  ],
  neverUse: {
    name: 'A k-d tree over high-dimensional embeddings',
    why: (
      <>
        The reach-for-it-anyway mistake, measured on this page
        with the same code and the same 4,000 points: at d = 16
        the query visited <strong>3,961 nodes: 99% of the
        tree</strong>: because in high dimension nearly every
        splitting plane sits within the best-ball&apos;s radius,
        so the prune never fires and the &quot;tree&quot; is a
        brute scan with pointer-chasing overhead and a build cost
        on top. Real embedding vectors live at d = 384 or 1,536,
        far past where this died. The escape hatches are
        different tools, not tuning: approximate methods (LSH on
        this bench, HNSW and friends in the atlas) or an honest
        brute scan over a compressed representation. The tree
        that owns 2D is not wrong at d = 16: it is{' '}
        <em>irrelevant</em>, and the visit counter is how you
        know before production does.
      </>
    ),
  },

  contest: {
    instance:
      'nearest neighbor, one currency (points/nodes examined per query); referee: brute force recomputes the exact distance, 300 refereed queries per instance',
    columns: ['brute scan', 'k-d tree'],
    rows: [
      {
        method: '2D, n = 60,000',
        isThisUnit: true,
        values: ['60,000', '22.2'],
        best: 1,
        verdict: 'the carve pays: 2,706× fewer points examined, answers exact',
      },
      {
        method: 'd = 8, n = 4,000',
        values: ['4,000', '569'],
        best: 1,
        verdict: 'the prune weakens: each axis gets its turn once every 8 levels',
      },
      {
        method: 'd = 16, n = 4,000',
        values: ['4,000', '3,961'],
        best: 0,
        verdict: 'the curse: 99% visited: a brute scan wearing a tree costume',
      },
    ],
    source:
      'python solutions/kd_tree_median_split_cycling.py prints this table and asserts: tree nearest-neighbor distance exactly equal to the brute-force referee on 1,200 queries across all instances; the k-d property verified at every one of 60,000 nodes via whole-subtree bounds with depth 16 ≤ ceil(log2 n) + 1 = 17 and the tree holding the exact input multiset; 200 range boxes set-equal to a brute filter; the 2D average of 22.2 visits under n/500; and the curse monotone with d = 16 above 50% of all points (measured 99%).',
  },

  figure: (
    <Figure
      id="fig-kdtree-carve"
      aspect="16 / 7"
      caption="Carve at medians, cycle the axes, prune with the ball. The plane is split at the median x, each half at its median y, and so on: squarish cells, balanced depth (16 on the 17 bound, audited). A query descends to its home cell for a first candidate, then unwinds: subtrees beyond a plane farther than the best-so-far radius are provably irrelevant and never opened. Measured: 22.2 visits per query against a 60,000-point scan (2,706×), exact against the brute referee 1,200 times: and the same code visiting 99% of everything at d = 16, the curse counted."
      cite={{
        text: 'J. L. Bentley, "Multidimensional binary search trees used for associative searching," CACM 18(9), 1975. DOI 10.1145/361002.361007. NN query analysis: Friedman, Bentley, Finkel 1977; "curse of dimensionality": Bellman 1961.',
        href: 'https://doi.org/10.1145/361002.361007',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="A k-d carved plane with a query ball pruning subtrees, and the curse rising with dimension">
        <rect x="30" y="30" width="300" height="220" fill="none" stroke="rgba(154,165,189,0.5)" strokeWidth="1.2" />
        <line x1="180" y1="30" x2="180" y2="250" stroke="#5da2ff" strokeWidth="1.8" />
        <line x1="30" y1="150" x2="180" y2="150" stroke="#f0b94b" strokeWidth="1.5" />
        <line x1="180" y1="110" x2="330" y2="110" stroke="#f0b94b" strokeWidth="1.5" />
        <line x1="100" y1="30" x2="100" y2="150" stroke="#5da2ff" strokeWidth="1.2" opacity="0.7" />
        <line x1="250" y1="110" x2="250" y2="250" stroke="#5da2ff" strokeWidth="1.2" opacity="0.7" />
        <line x1="100" y1="200" x2="30" y2="200" stroke="#f0b94b" strokeWidth="1.2" opacity="0.6" />
        {[[60, 70], [140, 60], [80, 180], [150, 220], [210, 60], [290, 80], [220, 160], [300, 200], [255, 230], [120, 120]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2.6" fill="#9aa5bd" opacity="0.85" />
        ))}
        <circle cx="228" cy="188" r="4" fill="#e2606c" />
        <circle cx="228" cy="188" r="34" fill="none" stroke="#62d98a" strokeWidth="1.6" strokeDasharray="4 3" />
        <text x="240" y="182" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="10">best ball</text>
        <rect x="30" y="30" width="150" height="120" fill="rgba(226,96,108,0.10)" />
        <text x="40" y="46" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="10">never opened: plane farther</text>
        <text x="40" y="60" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="10">than the ball&apos;s radius</text>
        <text x="30" y="272" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">2D: 22.2 visits vs 60,000 scanned (2,706×), exact ×1,200</text>
        <text x="370" y="46" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">the curse, counted (n = 4,000):</text>
        {[['d = 2', 18, '#62d98a'], ['d = 8', 569, '#f0b94b'], ['d = 16', 3961, '#e2606c']].map(([label, v, col], i) => (
          <g key={label}>
            <text x={370} y={80 + i * 52} fill={col} fontFamily="ui-monospace, monospace" fontSize="11">{label} · {v.toLocaleString()} visits</text>
            <rect x={370} y={88 + i * 52} width={230 * (v / 4000)} height={12} fill={col} opacity="0.55" />
            <rect x={370} y={88 + i * 52} width={230} height={12} fill="none" stroke="rgba(154,165,189,0.4)" strokeWidth="1" />
          </g>
        ))}
        <text x="370" y="248" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="10">99% visited at d = 16: the prune is dead;</text>
        <text x="370" y="262" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="10">embeddings live at d = 384: different tools</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'kd_tree_median_split_cycling.py',
  Viz: KdTreeViz,
  narration,
};
