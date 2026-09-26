import BowyerWatsonViz from '../viz/BowyerWatsonViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/bowyer_watson_cavity_retriangulation.py?raw';
import { narration } from './bowyer-watson-cavity-retriangulation.narration.js';

export const content = {
  given:
    'A set of points in the plane. Connect them into triangles so that no point lies strictly inside any triangle’s circumcircle: the Delaunay triangulation, which maximizes the smallest angle and is the dual of the Voronoi diagram.',
  task: 'Start with one enormous super-triangle and insert the points one at a time. For each new point, find every triangle whose circumcircle contains it: those bad triangles form a star-shaped cavity. Delete them and fan the cavity’s rim to the new point.',
  constraint:
    'Every predicate is exact (integer coordinates, integer determinants). On 40 points the output equals the brute-force set of all triples with an empty circumcircle (67 triangles). On every instance every circumcircle is checked empty against every point, the triangle and edge counts match Euler (2n − 2 − h, 3n − 3 − h) with h from an independent hull, the boundary is that hull edge for edge, and Lawson’s flip algorithm, written separately, produces the identical triangle set.',

  origins: (
    <p>
      Adrian Bowyer and David Watson, <strong>1981</strong>,
      back-to-back papers in the same issue of The Computer Journal
      (Computing Dirichlet tessellations; Computing the
      n-dimensional Delaunay tessellation), each describing the
      insert-delete-refan loop independently: hence the double
      name. The object is older: Boris Delaunay defined the
      triangulation in 1934 as the dual of Georgy Voronoi&apos;s 1908
      cells, and Charles Lawson showed in 1977 that flipping edges
      until every one is locally Delaunay reaches the same
      triangulation (the rival on this page). Guibas and Stolfi
      (1985) gave the divide-and-conquer version and the quad-edge
      structure; Jonathan Shewchuk&apos;s exact predicates (1997)
      made all of them robust, which is why this page computes its
      in-circle test as an integer determinant. Meshes for finite
      elements, terrain models, and every Voronoi diagram you have
      seen drawn start here.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>incremental insertion and its invariant</strong>:
      the triangulation is Delaunay before each insertion and
      Delaunay after it. The super-triangle makes the first state
      trivially valid; each point is inserted into the current
      mesh; at the end every triangle touching a fake corner is
      discarded. The referees hold on every instance: the 40-point
      output <strong>equals the brute-force empty-circumcircle
      triple set</strong> (67 triangles); every circumcircle on
      every instance is empty against every point; triangle counts
      187 / 385 / 780 at n = 100 / 200 / 400 match 2n − 2 − h
      exactly; and the boundary is the independent convex hull,
      edge for edge.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>cavity</strong>. Every triangle whose
      circumcircle contains the new point is bad, the bad triangles
      are connected and star-shaped around the point, and their
      boundary edges (the ones not shared by two bad triangles)
      fanned to the point are exactly the new Delaunay triangles:
      no flipping, no search for what to fix, one local rewrite per
      insertion. Lawson&apos;s flips, the rival written separately,
      reach the identical triangle set on all four instances at
      231,242 tests (in-circle plus locate) against the
      cavity&apos;s 160,000 at n = 400; rebuilding from scratch after
      each insertion costs <strong>20,219,600</strong>. The
      heuristic&apos;s honest weakness is measured too: a
      super-triangle only 1× the point spread drops 5 hull edges
      on 200 points, 3× drops 4, 10× drops 3, 1000× drops none.
    </p>
  ),

  picture: (
    <p>
      Paving a courtyard with triangular stones so that every stone
      is as fat as it can be: no long slivers. A new post is driven
      into the paved yard. Draw the circle through the corners of
      each stone; any stone whose circle swallows the new post is
      now a sliver waiting to happen, so pry it up. The pried
      stones always form one connected hole with the post inside
      it, and the hole&apos;s rim is a ring of stone edges. Cut new
      stones from the post to each rim edge, like spokes, and the
      yard is fat-stoned again, with every circle empty. Do that
      once per post and the last paving is the fattest possible for
      the whole set. The trap: the yard started as three imaginary
      corner posts far outside the walls, and if they are not far
      enough, their circles reach in and steal edges along the
      wall. Put them at the horizon and the wall is straight.
    </p>
  ),

  steps: [
    <>
      <strong>Super-triangle:</strong> three fake corners far
      outside the points (1000× the spread here; 1× loses hull
      edges).
    </>,
    <>
      <strong>Find the bad triangles:</strong> every triangle whose
      circumcircle holds the new point, by an exact in-circle
      determinant.
    </>,
    <>
      <strong>Cut the cavity:</strong> delete them; the rim is the
      set of their edges used exactly once.
    </>,
    <>
      <strong>Fan the rim:</strong> connect each rim edge to the
      point: the new triangles are Delaunay by construction.
    </>,
    <>
      <strong>Finish:</strong> drop every triangle touching a fake
      corner: 780 triangles from 400 points, boundary = hull.
    </>,
  ],

  signals: [
    <>
      <strong>Meshes and terrains:</strong> finite-element grids,
      elevation models, and interpolation all want fat triangles,
      which the empty-circumcircle rule delivers.
    </>,
    <>
      <strong>Voronoi by duality:</strong> nearest-neighbor
      regions, coverage, and the largest empty circle come free
      from the triangulation&apos;s dual.
    </>,
    <>
      <strong>Points arriving over time:</strong> insertion is
      local: 160,000 tests to build 400 points incrementally
      against 20,219,600 rebuilding after each one.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>Lawson&apos;s flip
      algorithm</strong>: insert the point into the triangle that
      contains it, split that triangle into three, then flip any
      edge whose opposite vertex lies inside a circumcircle until
      none remains. It reaches the identical triangulation on all
      four instances and pays 231,242 tests against the
      cavity&apos;s 160,000 at n = 400, most of it locating the
      containing triangle.
    </>
  ),

  strength: (
    <>
      <strong>One local rewrite per point, provably Delaunay,
      checked against the definition.</strong> The 40-point mesh
      equals the brute-force triple set; every instance passes the
      empty-circumcircle check for every triangle against every
      point, Euler&apos;s counts, and the hull boundary; the flip
      rival agrees on every triangle; and the incremental form beats
      rebuilding by 126× at 400 points. Exact integer predicates
      mean no epsilon and no near-degenerate crash.
    </>
  ),
  weakness: (
    <>
      <strong>The super-triangle is a lie you must tell
      convincingly, and naive cavity search is quadratic.</strong>{' '}
      A super-triangle too near the points steals hull edges (5
      missing at 1× on 200 points, 3 still missing at 10×); real
      implementations use symbolic infinity or a final hull
      repair. Scanning every triangle for the cavity costs O(n) per
      insertion, n² total (exactly 160,000 at 400): production
      code walks from a nearby triangle and inserts in random
      order for O(n log n) expected. And four cocircular points make
      the triangulation non-unique: this page&apos;s random integer
      points avoid it; grids and lattices do not.
    </>
  ),

  problem: 'Delaunay and Voronoi construction',
  problemSlug: 'delaunay-triangulation',
  rivals: [
    {
      name: 'Bowyer-Watson × cavity refan',
      isThisUnit: true,
      algoName: 'Bowyer-Watson',
      cost: 'O(n²) naive, O(n log n) with locate',
      wins: (
        <>
          <strong>Local and simple</strong>: delete the bad
          triangles, fan the rim; 160,000 tests for 400 points,
          brute-force-equal on 40, hull-exact everywhere.
        </>
      ),
      costs: (
        <>
          The super-triangle trap (hull edges lost when it is
          near), and a cavity scan that is linear per insertion
          without a locate structure.
        </>
      ),
      when: 'Incremental meshing, points arriving over time, and any implementation you want to write in an afternoon.',
    },
    {
      name: 'Delaunay flip algorithm',
      cost: 'insert, then flip',
      wins: (
        <>
          Lawson&apos;s 1977 loop: split the containing triangle
          and flip locally bad edges until none remain; identical
          output on every instance here, with a proof that the
          flips terminate.
        </>
      ),
      costs: (
        <>
          231,242 tests against 160,000 at n = 400, mostly locating
          the containing triangle, and a flip queue to manage.
        </>
      ),
      when: 'Repairing a triangulation after moving a few points, or when the mesh must stay a valid triangulation at every step.',
    },
    {
      name: "Fortune's algorithm",
      cost: 'O(n log n) sweep',
      wins: (
        <>
          A sweep line with a beach line of parabolas builds the
          Voronoi diagram (hence the Delaunay dual) in guaranteed
          n log n, no insertion order, no super-triangle.
        </>
      ),
      costs: (
        <>
          Notoriously delicate to implement (circle events, beach
          line as a balanced tree), and static: one point added
          means a full rerun.
        </>
      ),
      when: 'Large static point sets where the guaranteed bound matters more than code size.',
    },
    {
      name: 'Divide-and-conquer Delaunay',
      cost: 'O(n log n) merge',
      wins: (
        <>
          Guibas-Stolfi: split by x, triangulate halves, zip them
          with a rising bubble of edges; the fastest exact method in
          practice for static sets.
        </>
      ),
      costs: (
        <>
          The merge step and the quad-edge structure are the
          hardest code in this list, and it is static.
        </>
      ),
      when: 'Static meshing at scale, in a library you do not have to write yourself.',
    },
  ],
  neverUse: {
    name: 'Rebuilding the whole triangulation after every new point',
    why: (
      <>
        It is the reflex when points arrive over time and you
        already have a working builder: append, rerun. This page
        priced it: <strong>20,219,600 in-circle tests</strong> to
        reach 400 points that way, against 160,000 inserting each
        point into the existing mesh, a factor of 126 that grows
        linearly with every point you add. The cavity is the whole
        point of the method: an insertion touches only the
        triangles whose circumcircles contain the new point, a
        handful in the middle of a mesh, and everything else is
        untouched by proof. Rebuilding throws that locality away
        and pays the full price n times. If your points arrive one
        by one, insert them one by one.
      </>
    ),
  },

  contest: {
    instance:
      'Delaunay triangulation of random integer points with exact predicates, n = 100 / 200 / 400; currency: in-circle tests (the flip method also pays orientation tests to locate); referees: brute-force empty-circumcircle triples at n = 40, Euler counts, the independent hull as the boundary',
    columns: ['n = 100', 'n = 200', 'n = 400'],
    rows: [
      {
        method: 'Bowyer-Watson, cavity refan',
        isThisUnit: true,
        values: ['10,000', '40,000', '160,000'],
        best: 2,
        verdict: 'n² with a naive cavity scan; 187 / 385 / 780 triangles = 2n − 2 − h, hull exact',
      },
      {
        method: 'Lawson flips (locate + flip)',
        values: ['16,213', '58,221', '231,242'],
        verdict: 'the identical triangle set on every instance; the locate walk is most of the bill',
      },
      {
        method: 'Rebuild from scratch each insertion',
        values: ['338,150', '2,585,800', '20,219,600'],
        verdict: '126× at n = 400 and growing linearly: locality thrown away',
      },
    ],
    source:
      'python solutions/bowyer_watson_cavity_retriangulation.py prints this table and asserts: the 40-point output equals the brute-force set of empty-circumcircle triples (67 triangles); every triangle empty against every point on every instance; triangle and edge counts equal to Euler with the hull from Andrew’s monotone chain; the boundary equal to that hull edge for edge; Lawson’s flips identical on all four instances; and the super-triangle trap measured (5 hull edges lost at 1×, 4 at 3×, 3 at 10×, none at 1000× on 200 points).',
  },

  figure: (
    <Figure
      id="fig-bowyer-watson-cavity"
      aspect="16 / 7"
      caption="One insertion. The new point (amber) lies inside the circumcircles of the red triangles, which together form a star-shaped cavity; their rim edges (the ones not shared by two bad triangles) are fanned to the point, and every new triangle is Delaunay by construction. Measured: the 40-point mesh equals the brute-force empty-circumcircle triple set; 160,000 in-circle tests for 400 points against 231,242 for Lawson’s flips and 20,219,600 for rebuilding after each insertion; a super-triangle only 1× the point spread loses 5 hull edges on 200 points, 1000× loses none."
      cite={{
        text: 'A. Bowyer, "Computing Dirichlet tessellations," The Computer Journal 24(2), 1981, DOI 10.1093/comjnl/24.2.162; D. F. Watson, same issue, DOI 10.1093/comjnl/24.2.167. Lawson 1977; Guibas-Stolfi 1985; Shewchuk 1997.',
        href: 'https://doi.org/10.1093/comjnl/24.2.162',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="A triangulated point set with a cavity of bad triangles around a new point, and the fan of new triangles from the point to the cavity rim">
        {[[60, 60], [150, 40], [250, 70], [330, 50], [80, 150], [190, 130], [290, 150], [120, 230], [220, 240], [320, 230]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="3.5" fill="#e9edf6" />
        ))}
        {[[60, 60, 150, 40], [150, 40, 250, 70], [250, 70, 330, 50], [60, 60, 80, 150], [330, 50, 290, 150], [80, 150, 120, 230], [120, 230, 220, 240], [220, 240, 320, 230], [320, 230, 290, 150], [60, 60, 190, 130], [150, 40, 190, 130], [250, 70, 290, 150], [80, 150, 190, 130], [190, 130, 120, 230], [190, 130, 220, 240]].map(([a, b, c, d], i) => (
          <line key={i} x1={a} y1={b} x2={c} y2={d} stroke="rgba(93,162,255,0.7)" strokeWidth="1.3" />
        ))}
        <polygon points="190,130 250,70 290,150" fill="rgba(226,96,108,0.22)" stroke="#e2606c" strokeWidth="1.6" />
        <polygon points="190,130 290,150 220,240" fill="rgba(226,96,108,0.22)" stroke="#e2606c" strokeWidth="1.6" />
        <circle cx="238" cy="160" r="4.5" fill="#f0b94b" />
        {[[190, 130], [250, 70], [290, 150], [220, 240]].map(([x, y], i) => (
          <line key={i} x1="238" y1="160" x2={x} y2={y} stroke="#f0b94b" strokeWidth="1.6" strokeDasharray="5 3" />
        ))}
        <text x="370" y="60" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">red: circumcircle contains the new point (bad)</text>
        <text x="370" y="80" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">amber: the rim of the cavity fanned to the point</text>
        <text x="370" y="100" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="11">blue: untouched, still Delaunay by proof</text>
        <text x="370" y="140" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">40 points: output = brute-force triple set (67)</text>
        <text x="370" y="160" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">400 points: cavity 160,000 tests · flips 231,242</text>
        <text x="370" y="176" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">rebuild after each insertion: 20,219,600</text>
        <text x="370" y="204" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="10">super-triangle at 1× the spread: 5 hull edges lost</text>
        <text x="370" y="220" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">at 10×: 3 lost · at 1000×: none (Euler and hull exact)</text>
        <text x="40" y="272" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">every triangle count = 2n − 2 − h with h from an independent hull; Lawson’s flips agree on every triangle</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'bowyer_watson_cavity_retriangulation.py',
  Viz: BowyerWatsonViz,
  narration,
};
