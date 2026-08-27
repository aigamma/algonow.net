import WelzlViz from '../viz/WelzlViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/welzl_randomized_basis.py?raw';
import { narration } from './welzl-randomized-basis.narration.js';

export const content = {
  given:
    'A cloud of n points, and a question Sylvester posed in one sentence in 1857: the least circle that contains them all.',
  task: 'The exact smallest enclosing circle: found in expected linear time by processing the points in random order and rebuilding only on the rare arrival that lands outside.',
  constraint:
    'Exhaustion over every pair-diameter and triple-circumcircle referees 150 instances (n ≤ 16) to 10⁻⁷; at 100,000 points, where no exhaustion can follow, an optimality certificate takes over: every point inside, the ≤ 3 basis points on the boundary to 10⁻⁶, the circle recomputed from its basis, the center inside the basis hull.',

  origins: (
    <p>
      James Joseph Sylvester posed the problem in <strong>1857</strong> in
      a single sentence; a century of geometry passed through it.
      Megiddo&apos;s 1983 deterministic linear-time solution was a
      landmark nobody implements. Emo Welzl&apos;s <strong>1991</strong>{' '}
      six-line recursion, built on Raimund Seidel&apos;s randomized
      linear programming, is what everyone implements: shuffle,
      insert, rebuild only on the rare outsider, pin the rebuild on
      the point that forced it. Its analysis popularized{' '}
      <em>backwards analysis</em>: ask, at step i, how likely the
      just-arrived point was one of the ≤ 3 that pin the answer:
      probability at most 3/i, so rebuilds thin out harmonically and
      the total is expected O(n). The idea grew into the LP-type
      framework of Matoušek, Sharir, and Welzl: balls, ellipsoids,
      and beyond.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>incremental construction and the basis
      logic</strong>: keep the smallest circle of the points seen so
      far; when arrival p lands outside, the new circle must pass{' '}
      <em>through p</em> (otherwise it could shrink), so the prefix
      is redone with p pinned on the boundary: then with two pinned,
      then three: and a circle through three points is fully
      determined, so the recursion bottoms out at the{' '}
      <strong>circumcircle</strong>. At most three points ever pin
      the answer: a diameter pair or a triangle: and that basis is
      the certificate this page checks at 100,000 points.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>arrival order</strong>: a uniform shuffle,
      and nothing else. Backwards analysis prices it: the i-th random
      arrival is one of the ≤ 3 basis points with probability at most
      3/i, so the expensive rebuild almost never fires late, and
      total work is expected O(n): measured flat at{' '}
      <strong>7.54, 9.09, 8.87 tests per point</strong> across
      10³, 10⁴, 10⁵. Feed the same code adversarially sorted input
      and the guarantee evaporates: <strong>247×</strong> measured on
      an arc in angular order. The shuffle is not hygiene: it is the
      algorithm.
    </p>
  ),

  picture: (
    <p>
      One round canopy must shelter a scattered crowd. Call people
      over in random order. Almost everyone walks in under the
      canopy already: one glance, no work. Rarely, someone stands
      outside: the canopy must be re-pitched so its <em>edge</em>{' '}
      reaches them exactly: they become a pole-holder: and at most
      three pole-holders ever matter, because a circle is fixed by a
      diameter pair or by three boundary points. Early on,
      re-pitching is cheap (few people to re-check); late arrivals
      are almost never outside, because the canopy already fits a
      crowd that random order made representative. Call people in
      sorted order along a line instead, and every single arrival
      stands just past the edge: re-pitch, re-pitch, re-pitch: the
      same canopy, a quadratic bill.
    </p>
  ),

  steps: [
    <>
      <strong>Shuffle:</strong> the heuristic in full: a uniform
      random arrival order, the run&apos;s only randomness.
    </>,
    <>
      <strong>Test:</strong> next point inside the current circle?
      Almost always: one distance check, move on.
    </>,
    <>
      <strong>Rebuild pinned:</strong> an outsider p must lie ON the
      new circle: redo the prefix with p on the boundary: then two
      pinned (diameter), then three (circumcircle): the recursion
      bottoms out.
    </>,
    <>
      <strong>Carry the basis:</strong> the ≤ 3 boundary points that
      pin the circle: the answer&apos;s certificate, checked here to
      10⁻⁶ at 100,000 points.
    </>,
    <>
      <strong>Price it backwards:</strong> arrival i is a basis point
      with probability ≤ 3/i: rebuilds thin harmonically: expected
      O(n), measured flat across three decades.
    </>,
  ],

  signals: [
    <>
      <strong>Minimal enclosing anything:</strong> circle, ball,
      ellipsoid, annulus: LP-type problems: this machinery is the
      standard exact answer in low dimension.
    </>,
    <>
      <strong>A certificate matters:</strong> the basis names the ≤ 3
      points that justify the radius: coverage radii, facility
      ranges, worst-case tolerances want that receipt.
    </>,
    <>
      <strong>Input order is not yours:</strong> any randomized
      incremental structure (quickselect&apos;s pivots, treaps,
      incremental Delaunay) carries this page&apos;s moral: shuffle
      first, or an adversarial feed makes the average case a lie.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>exhaustion</strong>: every
      pair-diameter and every triple-circumcircle, each checked
      against all n points: O(n⁴), exact, and this page&apos;s
      referee at n ≤ 16. The practical shortcut is the{' '}
      <strong>centroid circle</strong>: center at the mean, radius to
      the farthest point: one pass, always valid, measured{' '}
      <strong>+12.2% fat</strong> on the client: the shape
      Ritter&apos;s two-pass growth tightens and Welzl closes to
      zero.
    </>
  ),

  strength: (
    <>
      <strong>Exact, certified, and expected linear: all three
      measured.</strong> 150 instances equal to pair-and-triple
      exhaustion within 10⁻⁷; the optimality certificate holding at
      100,000 points (basis on the boundary to 10⁻⁶, center in the
      basis hull); work per point flat at 7.54 / 9.09 / 8.87 across
      three decades of n; and the guarantee&apos;s source located
      by ablation: remove the shuffle, feed an arc in angular order,
      and the same code pays 502,500 tests against 2,034: 247×.
    </>
  ),
  weakness: (
    <>
      <strong>Expected, not worst-case: and the expectation is over
      YOUR coin, not the data.</strong> The 3/i argument needs the
      shuffle actually performed: pipelines that &quot;helpfully&quot;
      pre-sort (by x, by timestamp, by angle) hand the algorithm its
      adversarial order back. Degenerate near-cocircular inputs
      stress the 10⁻⁹ tolerance (production libraries carry exact
      predicates), recursion-heavy statements of the six-liner can
      blow Python&apos;s stack (this page&apos;s form is iterative),
      and in high dimension the basis grows to d+1 and the constant
      factor with it: LP-type methods stay practical only for
      modest d.
    </>
  ),

  problem: 'Bounding circles and spheres',
  problemSlug: 'bounding-spheres',
  rivals: [
    {
      name: 'Welzl × random basis',
      isThisUnit: true,
      algoName: "Welzl's algorithm",
      cost: 'O(n) expected',
      wins: (
        <>
          <strong>Exact with a receipt</strong>: the ≤ 3-point basis
          certifies the radius: and expected linear, measured flat
          across three decades.
        </>
      ),
      costs: (
        <>
          The guarantee rides on the shuffle: sorted feeds go
          quadratic (247× measured): and near-cocircular inputs
          stress floating tolerances.
        </>
      ),
      when: 'The default for exact smallest enclosing circles and low-dimensional balls.',
    },
    {
      name: "Ritter's × sphere growth",
      algoName: "Ritter's algorithm",
      cost: 'O(n), two passes',
      wins: (
        <>
          Two passes, no recursion, no tolerance drama: a bounding
          sphere <em>guaranteed valid</em> and typically 5-20% fat:
          the centroid client&apos;s disciplined cousin.
        </>
      ),
      costs: (
        <>
          Approximate, period: no basis, no certificate, and the
          slack varies with the cloud&apos;s shape.
        </>
      ),
      when: 'Culling and broad-phase collision, where 10% slack is free and branch-free speed is the point.',
    },
    {
      name: 'Graham scan × hull first',
      algoName: 'Graham scan',
      cost: 'O(n log n) + O(h)',
      wins: (
        <>
          The basis points are hull vertices, so the live hull
          unit&apos;s output shrinks the instance to h points:
          repeated circle queries on a static set amortize the sort
          once.
        </>
      ),
      costs: (
        <>
          The sort costs more than all of Welzl: worth it only when
          the hull is already needed or reused.
        </>
      ),
      when: 'When the convex hull is in hand anyway: the circle question becomes h points, not n.',
    },
    {
      name: "Fortune's × beach line",
      algoName: "Fortune's algorithm",
      cost: 'O(n log n)',
      wins: (
        <>
          The classical pre-1991 road: the smallest enclosing
          circle&apos;s center sits on the <em>farthest-point</em>{' '}
          Voronoi diagram, which the sweep constructs in full.
        </>
      ),
      costs: (
        <>
          A whole diagram of machinery for a three-point answer:
          the sledgehammer this page&apos;s six lines retired.
        </>
      ),
      when: 'When farthest-point structure is needed for many queries beyond the one circle.',
    },
  ],
  neverUse: {
    name: 'Simulated annealing on the center',
    why: (
      <>
        The objective (minimize the farthest distance) is convex,
        piecewise-smooth, and solved <em>exactly</em> by thirty
        lines in expected linear time with a three-point
        certificate. Reaching for the live annealing unit&apos;s
        machinery here buys a temperature schedule to tune, a
        stopping criterion to guess, an answer that is only
        probably-approximately right, and no certificate: while
        costing more per sweep than Welzl costs in total. General
        metaheuristics are for landscapes with structure you cannot
        exploit: this landscape is a single bowl with a named exact
        algorithm sitting at the bottom. Using a stochastic hammer
        on a convex nail is not caution: it is a 100× bill for a
        worse answer.
      </>
    ),
  },

  contest: {
    instance:
      'the smallest circle around 100,000 points; referee: exhaustion over every pair and triple on 150 instances, then the optimality certificate at scales exhaustion cannot reach',
    columns: ['work/point', 'nature'],
    rows: [
      {
        method: 'Pair-and-triple exhaustion',
        values: ['O(n³) circles', 'exact'],
        verdict: 'the referee: and hopeless past n ≈ 20',
      },
      {
        method: 'Centroid + max radius',
        values: ['1', 'valid, fat'],
        verdict: '+12.2% radius on the client: the price of skipping the basis',
      },
      {
        method: 'Welzl, shuffled',
        isThisUnit: true,
        values: ['8.87', 'exact, certified'],
        best: 0,
        verdict: 'expected O(n): flat at 7.54 / 9.09 / 8.87 across 10³..10⁵',
      },
    ],
    source:
      "python solutions/welzl_randomized_basis.py prints this table and asserts: 150 instances (n ≤ 16) equal to exhaustion over every pair-diameter and triple-circumcircle within 10⁻⁷; the optimality certificate at 100,000 points (all inside, basis of 3 on the boundary to 10⁻⁶, circle recomputed from its basis, center inside the basis hull); work per point under 15 with max/min under 2.0 across three decades; the sorted-feed betrayal above 100× (measured 247×: 502,500 tests vs 2,034 on a 2,000-point arc fed in angular order); and the centroid shortcut never smaller than optimal, priced at +12.2%.",
  },

  figure: (
    <Figure
      id="fig-welzl-basis"
      aspect="16 / 7"
      caption="At most three points pin the answer. The smallest enclosing circle is fixed by a diameter pair or by three boundary points (amber): every other point is slack. Backwards analysis prices the shuffle: the i-th random arrival is one of those ≤ 3 with probability at most 3/i, so rebuilds thin out harmonically and the total is expected O(n): measured flat at 7.54 / 9.09 / 8.87 tests per point across 10³, 10⁴, 10⁵. Remove the shuffle and the promise dies: an arc fed in sorted angular order made every arrival an outsider: 502,500 tests against 2,034, a 247× bill for the same answer."
      cite={{
        text: 'Welzl, "Smallest enclosing disks (balls and ellipsoids)", LNCS 555, 1991: six lines, backwards analysis, and the LP-type framework that grew from them. Sylvester posed the problem in 1857.',
        href: 'https://doi.org/10.1007/BFb0038202',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="A point cloud, its smallest enclosing circle, and the three amber basis points that pin it on the boundary">
        <circle cx="240" cy="145" r="108" fill="none" stroke="#5da2ff" strokeWidth="2.2" />
        {[[190, 100], [250, 170], [280, 120], [215, 190], [300, 165], [230, 80], [170, 160], [265, 200], [205, 135], [285, 90], [160, 120], [245, 55]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={3} fill="#9aa5bd" />
        ))}
        {[[240, 37], [147, 199], [338, 191]].map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r={4} fill="#f0b94b" />
            <circle cx={x} cy={y} r={9} fill="none" stroke="#f0b94b" strokeWidth="2" />
          </g>
        ))}
        <text x="360" y="60" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">the basis: three points on the boundary</text>
        <text x="360" y="78" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">everything else is slack: inside, ignorable</text>
        <text x="360" y="116" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="11">P(arrival i pins the circle) ≤ 3/i</text>
        <text x="360" y="134" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">rebuilds thin harmonically: expected O(n)</text>
        <text x="360" y="172" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">measured: 7.54 / 9.09 / 8.87 tests per point</text>
        <text x="360" y="190" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">across n = 10³, 10⁴, 10⁵: flat</text>
        <text x="360" y="226" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">sorted feed: 502,500 tests vs 2,034 (247×)</text>
        <text x="360" y="244" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">the shuffle IS the algorithm</text>
        <text x="40" y="272" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">certificate at 100,000 points: basis on boundary to 10⁻⁶, center in basis hull, all inside</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'welzl_randomized_basis.py',
  Viz: WelzlViz,
  narration,
};
