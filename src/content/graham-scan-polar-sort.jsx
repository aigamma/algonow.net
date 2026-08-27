import GrahamViz from '../viz/GrahamViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/graham_scan_polar_sort.py?raw';
import { narration } from './graham-scan-polar-sort.narration.js';

export const content = {
  given:
    'n points in the plane, duplicates and collinear runs included.',
  task: 'Report their convex hull: the vertices of the smallest convex polygon containing them all, in boundary order.',
  constraint:
    'Exactly. Orientation decisions must be trustworthy, so every turn test here is an integer cross product whose sign cannot lie; the degenerate inputs are part of the problem, not an appendix.',

  origins: (
    <p>
      Bell Labs, 1972. A colleague brought Ron Graham a practical problem
      (the hull of about ten thousand points) that the quadratic methods of
      the day handled too slowly, and Graham answered with the sort-and-scan
      in a <strong>two-page paper</strong>, one of the founding acts of
      computational geometry: n log n, with a matching lower bound, so
      provably unimprovable for the general case. Jarvis&apos;s wrapping
      march followed in 1973, Andrew&apos;s coordinate-sorted chain in 1979,
      and Chan closed the story in 1996 with the optimal O(n log h) hybrid.
      Graham himself was the field&apos;s great generalist: Erdős&apos;s
      closest collaborator, a past president of the International Jugglers&apos;
      Association, and the namesake of a number too large for the universe.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>stack discipline</strong>. Walk the points in a
      chosen order; push each one; while the last three make a clockwise or
      straight turn, pop the middle one, forever. Every point is pushed once
      and popped at most once, so after the ordering the scan is{' '}
      <strong>linear</strong>: on this page&apos;s big instance the whole
      walk spends under 3n orientation tests, a bound the tested solution
      asserts rather than cites.
    </p>
  ),
  heurRole: (
    <p>
      Chooses the <strong>order that makes one pass sufficient</strong>:
      sort by polar angle around the bottom-most point. In that order the
      polyline through all n points never crosses itself and meets the hull
      vertices in boundary order, so a point popped for a bad turn is
      provably interior and never needed again. Any old order breaks this:
      the pop rule discards points that a later arrival would prove
      essential. The sort is not preprocessing; it is the licence for the
      scan&apos;s amnesia.
    </p>
  ),

  picture: (
    <p>
      Stand at the lowest pin on a corkboard and sweep your arm
      counterclockwise, tying string to each pin in the order your arm
      finds them. The string visits every pin as a wobbly star-shaped tour.
      Now tighten it: wherever the string bends inward, it snaps straight,
      releasing the pin it bent around, and a released pin is gone for
      good, because everything the arm meets later lies further around, and
      can only pull the string tighter past it. When the sweep completes,
      the taut string <em>is</em> the hull: the sort chose the tour, the
      tightening is the stack.
    </p>
  ),

  steps: [
    <>
      <strong>Anchor:</strong> take the bottom-most point (leftmost on
      ties). It is certainly on the hull.
    </>,
    <>
      <strong>Sort</strong> the rest by angle around the anchor, by exact
      cross-product comparison, never by floating atan2; break angle ties
      by distance, and run the final ray farthest-first.
    </>,
    <>
      <strong>Scan:</strong> push each point; while the last three turn
      clockwise or run straight, pop the middle one.
    </>,
    <>
      <strong>Close:</strong> check the wrap-around edge to the anchor for
      one last collinear survivor.
    </>,
    <>
      <strong>Read</strong> the stack: the hull, counterclockwise, in
      boundary order, no collinear vertices.
    </>,
  ],

  signals: [
    <>
      One-shot on a <strong>static point set</strong>, and you want
      boundary order, not just membership.
    </>,
    <>
      The hull may be <strong>large</strong>: n log n is safe whatever h
      turns out to be (the circle column is the proof).
    </>,
    <>
      Exact predicates are available (integer or robust arithmetic):
      orientation signs are where hull code goes to die.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the definition itself: a pair (a, b) is a hull
      edge iff every other point lies strictly to its left. On 120 points
      it agrees perfectly and spends <strong>41,433</strong> orientation
      tests to Graham&apos;s <strong>809</strong>, a 51× gap that is itself
      flattered by lucky early exits; adversarial orderings restore the
      full n³.
    </>
  ),

  strength: (
    <>
      <strong>One sort buys a linear, provable scan.</strong> 725,693 total
      operations on 50,000 points, at most 3n orientation tests after the
      sort (asserted), boundary order for free, and complete indifference
      to how big the hull turns out to be: 11,931 operations on the
      all-on-hull circle that costs Jarvis 3,996,000.
    </>
  ),
  weakness: (
    <>
      <strong>The sort is the cost, and the angles are the trap.</strong>{' '}
      When h is tiny, output-sensitive rivals win (Jarvis paid exactly h·n
      here; Chan&apos;s hybrid makes that optimal). And polar sorting is
      where implementations bleed: this very page&apos;s Graham needed two
      degenerate-case repairs (the all-collinear input and the final-ray
      survivor) that its own test oracles caught. The monotone chain
      exists so you never write those repairs.
    </>
  ),

  problem: 'Convex hull',
  problemSlug: 'convex-hull',
  rivals: [
    {
      name: 'Graham × polar sort',
      isThisUnit: true,
      algoName: 'Graham scan',
      cost: 'O(n log n) always',
      wins: (
        <>
          Immune to the hull&apos;s size: <strong>11,931</strong> operations
          where gift wrapping pays 3,996,000. The 1972 optimality proof
          still stands.
        </>
      ),
      costs: (
        <>
          The angle sort&apos;s tie cases (collinear rays, the wrap-around)
          are real enough that this page&apos;s tests caught two of them.
        </>
      ),
      when: 'Large or unknown h, boundary order needed, exact predicates in hand.',
    },
    {
      name: 'Andrew monotone chain',
      algoName: "Andrew's monotone chain",
      cost: 'O(n log n) always',
      wins: (
        <>
          The same stack discipline under a plain coordinate sort: no
          angles, no final-ray trap, cheaper comparisons. The version to
          actually write.
        </>
      ),
      costs: (
        <>
          Nothing real beyond two passes instead of one; its work here
          (980,336) carries an idealized sort charge, and in practice it is
          the fastest safe choice.
        </>
      ),
      when: 'Almost always, in real code: same guarantees, fewer sharp edges.',
    },
    {
      name: 'Jarvis march',
      cost: 'O(n·h)',
      wins: (
        <>
          Output-sensitive to the point of poetry: measured{' '}
          <strong>exactly h·n</strong> (6,799,728 = 136 × 50,000). When the
          hull is a handful of points, nothing simpler wins.
        </>
      ),
      costs: (
        <>
          When everything is on the hull it detonates:{' '}
          <strong>3,996,000</strong> operations on 2,000 circle points, n²
          on the nose. Chan&apos;s algorithm exists to keep its virtue and
          amputate this.
        </>
      ),
      when: 'Tiny hulls over huge clouds; or inside Chan’s O(n log h) hybrid.',
    },
    {
      name: 'Quickhull',
      cost: 'O(n log n) expected',
      wins: (
        <>
          The fastest on the random disk: <strong>325,961</strong>{' '}
          operations, half of Graham, because farthest-point splitting
          discards interior points in bulk.
        </>
      ),
      costs: (
        <>
          Adversarial inputs push it quadratic, and its farthest-point ties
          seat vertices mid-edge unless cleaned (this page&apos;s tests
          caught exactly that).
        </>
      ),
      when: 'Random-ish clouds where average case rules, and in 3D, where it is the standard.',
    },
  ],
  neverUse: {
    name: 'The definition, executed: test every candidate edge',
    why: (
      <>
        &quot;(a, b) is a hull edge iff all other points lie to its
        left&quot; is a perfect definition and a terrible algorithm: n³
        worst case, and even with lucky early exits it spent{' '}
        <strong>41,433</strong> tests against Graham&apos;s 809 on a mere
        120 points, a gap that grows without bound. Its one honest job is
        the one this page gives it: the oracle that every fast method must
        agree with in the tests.
      </>
    ),
  },

  contest: {
    instance:
      'work = orientation tests plus sort comparisons, two instances: 50,000 integer points uniform in a disk (hull size 136), and 2,000 points on a circle (every point on the hull)',
    columns: ['disk, h = 136', 'circle, h = 2,000'],
    rows: [
      {
        method: 'Graham × polar sort',
        isThisUnit: true,
        values: ['725,693', '11,931'],
        best: 1,
        verdict: 'the sort pays once; the hull’s size cannot touch it',
      },
      {
        method: 'Andrew monotone chain',
        values: ['980,336', '27,923'],
        verdict: 'same discipline, plainer sort: the one to implement',
      },
      {
        method: 'Jarvis march',
        values: ['6,799,728', '3,996,000'],
        verdict: 'exactly h·n both times: poetry on one column, n² on the other',
      },
      {
        method: 'Quickhull',
        values: ['325,961', '59,865'],
        best: 0,
        verdict: 'bulk discarding wins the random cloud; ties need cleaning',
      },
    ],
    source:
      'python solutions/graham_scan_polar_sort.py prints this table and asserts all four methods return the identical hull on 300 cases including grids, circles, duplicates, and all-collinear inputs, verifies every hull from the definition (convex, counterclockwise, containing all points), pins Jarvis at ~h·n on the disk and ≥ n²/2 on the circle, bounds Graham’s scan, and prices the brute-force definition at 51× on 120 points.',
  },

  figure: (
    <Figure
      id="fig-graham-order"
      aspect="16 / 7"
      caption="What the sort buys. Connect the points in polar order around the anchor and the tour never crosses itself, visiting the hull's vertices in boundary order. Walking that tour, any inward bend is provably interior: everything still to come lies further around the sweep, so nothing can ever need the popped point again. That single geometric fact converts hull-finding into one sort plus one forgetful linear pass."
      cite={{
        text: 'Graham, "An Efficient Algorithm for Determining the Convex Hull of a Finite Planar Set", Information Processing Letters 1(4), 1972. The coordinate-sorted variant is Andrew, 1979; the O(n log h) hybrid is Chan, 1996.',
        href: 'https://doi.org/10.1016/0020-0190(72)90045-2',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="Points connected in polar order around an anchor form a non-crossing star tour; the hull is its tightened outline, and one inward bend is marked as a pop">
        {(() => {
          const anchor = [320, 252];
          const pts = [
            [488, 214], [560, 150], [470, 96], [520, 40], [380, 84], [330, 30],
            [246, 92], [160, 44], [120, 128], [186, 160], [96, 214], [222, 226],
          ];
          const hullIdx = [1, 3, 5, 7, 10];
          const els = [];
          let prev = anchor;
          pts.forEach((p, i) => {
            els.push(<line key={`t${i}`} x1={prev[0]} y1={prev[1]} x2={p[0]} y2={p[1]} stroke="#9aa5bd" strokeWidth="1" strokeDasharray="3 3" opacity="0.7" />);
            prev = p;
          });
          const hull = [anchor, ...hullIdx.map((i) => pts[i])];
          hull.forEach((p, i) => {
            const q = hull[(i + 1) % hull.length];
            els.push(<line key={`h${i}`} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke="#62d98a" strokeWidth="2.2" />);
          });
          pts.forEach((p, i) => {
            els.push(<circle key={`p${i}`} cx={p[0]} cy={p[1]} r={4} fill={hullIdx.includes(i) ? '#62d98a' : '#5da2ff'} />);
          });
          els.push(<circle key="a" cx={anchor[0]} cy={anchor[1]} r={6} fill="#f0b94b" />);
          els.push(<circle key="pop" cx={470} cy={96} r={9} fill="none" stroke="#e06767" strokeWidth="1.8" strokeDasharray="4 3" />);
          return els;
        })()}
        <text x="30" y="278" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="12">anchor</text>
        <text x="440" y="76" fill="#e06767" fontFamily="ui-monospace, monospace" fontSize="12">inward bend: popped, forever</text>
        <text x="30" y="26" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="12">dashed: the polar-order tour (never crosses itself) · green: the tightened hull</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'graham_scan_polar_sort.py',
  Viz: GrahamViz,
  narration,
};
