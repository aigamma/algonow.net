import DouglasPeuckerViz from '../viz/DouglasPeuckerViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/douglas_peucker_max_deviation_recursion.py?raw';
import { narration } from './douglas-peucker-max-deviation-recursion.narration.js';

export const content = {
  given:
    'A track of 2,000 points, a GPS trace or a digitized coastline, to be replaced by a polyline with far fewer vertices that stays within a tolerance ε of the original everywhere. Fewer vertices is the goal; the guarantee is the constraint: no original point may end up farther than ε from the simplified line.',
  task: 'Douglas-Peucker. Keep the two endpoints. Find the interior point farthest from the chord between them. If it is farther than ε, keep it and recurse on the two halves it splits off; if not, drop every interior point of that chord. The heuristic is the choice of split point: the point of maximum deviation, the one point the tolerance cannot do without, so every vertex the recursion keeps is one the guarantee demanded.',
  constraint:
    'Measured on the 2,000-point track: every original point within ε of the simplification at ε = 0.05, 0.2, 1.0, 5.0, keeping 1,669 / 836 / 79 / 28 vertices with maximum error 0.050 / 0.199 / 0.995 / 4.577. Against the Imai-Iri optimum on a 200-point subsample: 157 vertices vs the minimum 153 at ε = 0.2 (1.03×), 66 vs 60 at ε = 1.0 (1.10×). At the same 79 vertices, uniform decimation errs by 1.960 and radial distance by 3.387 where Douglas-Peucker holds 0.995. Cost at ε = 0 on 400 points: 3,609 distance evaluations on the track, 79,401 of a possible 79,800 on a decaying zigzag built to defeat the recursion.',

  origins: (
    <p>
      David Douglas and Thomas Peucker published the algorithm in{' '}
      <strong>1973</strong> (The Canadian Cartographer 10(2),
      &quot;Algorithms for the reduction of the number of points
      required to represent a digitized line or its caricature&quot;),
      the year after Urs Ramer had proposed the same recursion for
      polygonal approximation of curves in image processing, which is
      why it is often called Ramer-Douglas-Peucker. Cartographers
      needed it because digitizing tables produced far more points
      than a plotted map could use, and because a map at a smaller
      scale needs the caricature of a coastline, not its every wiggle.
      Hershberger and Snoeyink (1992) brought the worst case from
      quadratic to n log n with path hulls; Imai and Iri (1988) had
      shown how to find the true minimum-vertex simplification as a
      shortest path; Visvalingam and Whyatt (1993) offered the
      area-based alternative. It runs in PostGIS as ST_Simplify, in
      every web map&apos;s simplify routine, and in every GPS logger that
      thins a track before upload.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>guarantee</strong>: a chord is kept only when
      every point it skips lies within ε of it, so the finished
      polyline is within ε of every original point by construction.
      The referee checks it point by point, not by trust: at ε = 0.05,
      0.2, 1.0, and 5.0 the measured maximum error is{' '}
      <strong>0.050, 0.199, 0.995, 4.577</strong>, each under its
      tolerance, with 1,669, 836, 79, and 28 of the 2,000 vertices kept.
      Against the Imai-Iri optimum, which enumerates every chord that
      respects the tolerance and takes the shortest path through them,
      the recursion keeps 157 vertices where 153 suffice at ε = 0.2 and
      66 where 60 suffice at ε = 1.0: <strong>within 10% of the
      minimum</strong> at a fraction of the cost.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>split point</strong>. Any interior point
      would do for correctness; the recursion terminates either way.
      Choosing the point of maximum deviation is what makes the result
      small: that point is outside the band by the largest margin, so it
      is the one vertex the guarantee cannot do without, and keeping it
      first cuts the two halves as close to the tolerance as possible.
      Compared at the same 79 vertices that ε = 1.0 produces, taking
      every 25th point errs by <strong>1.960</strong>, twice the
      tolerance, and the radial-distance filter by <strong>3.387</strong>;
      both keep vertices the shape did not ask for and drop ones it did.
      The heuristic&apos;s cost is its worst case: on a decaying zigzag
      where the farthest point from every chord is the very next one,
      each split peels off a single point and the count reaches 79,401
      of a possible 79,800 for 400 points, against 3,609 on the track.
    </p>
  ),

  picture: (
    <p>
      A hiker&apos;s trace of two thousand pins on a wall map, to be
      redrawn with string and as few pins as possible, without the
      string ever straying more than a thumb&apos;s width from any pin.
      Stretch one string from the first pin to the last. Find the pin
      it misses by the most. If that miss is within a thumb, you are
      done: two pins. If not, that pin is non-negotiable; put the string
      through it and now you have two strings, each with its own
      farthest pin, and the same question for each. Every pin you add
      is one the thumb rule forced, and every pin you skip lies within
      a thumb of a string. On the real trace that is 79 pins out of two
      thousand, and no pin more than a thumb from the string.
    </p>
  ),

  steps: [
    <>
      <strong>Chord:</strong> start with the segment from the first
      point to the last; push it on a stack.
    </>,
    <>
      <strong>Farthest:</strong> pop a chord (i, j); scan k = i + 1 … j
      − 1 for the largest perpendicular distance d<sub>max</sub>.
    </>,
    <>
      <strong>Split or settle:</strong> if d<sub>max</sub> &gt; ε, mark
      that point kept and push (i, k) and (k, j); else drop every
      interior point.
    </>,
    <>
      <strong>Repeat</strong> until the stack is empty; the kept
      points in order are the simplification.
    </>,
    <>
      <strong>Verify:</strong> for every original point, its distance
      to the nearest kept segment is at most ε.
    </>,
  ],

  signals: [
    <>
      <strong>A hard error bound, not a target count:</strong> the
      tolerance is the promise; the vertex count falls out.
    </>,
    <>
      <strong>Long, mostly smooth paths with occasional sharp
      corners:</strong> tracks, contours, coastlines, time series; the
      corners get kept, the smooth runs collapse.
    </>,
    <>
      <strong>Endpoints that must survive:</strong> the recursion never
      moves or drops them; a closed ring is split at two points first.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>uniform decimation</strong>, keeping
      every k-th point: one line of code, no distance computations, and
      no guarantee. At the same 79 vertices it errs by 1.960 against
      Douglas-Peucker&apos;s 0.995, and nothing bounds it.
    </>
  ),

  strength: (
    <>
      <strong>A guarantee, near-minimal, in near n log n.</strong> Every
      point within ε at four tolerances, within 1.03× to 1.10× of the
      Imai-Iri minimum, and 3,609 evaluations for 400 points where the
      quadratic worst case is 79,800.
    </>
  ),
  weakness: (
    <>
      <strong>Quadratic in the worst case, and blind to topology.</strong>{' '}
      A decaying zigzag makes every split peel one point: 79,401
      evaluations on 400 points, the n² / 2 bound (Hershberger and
      Snoeyink&apos;s path hulls fix it). It is not optimal: 10% more
      vertices than Imai-Iri at ε = 1.0. The simplified line can cross
      itself or a neighbor where the original did not, which matters
      for polygons and needs a separate check. And the endpoints are
      sacred, so a closed ring must be cut before it can be simplified.
    </>
  ),

  problem: 'Polyline simplification',
  problemSlug: 'polyline-simplification',
  rivals: [
    {
      name: 'Douglas-Peucker × Max-deviation recursion',
      isThisUnit: true,
      algoName: 'Douglas-Peucker',
      cost: 'O(n log n) typical, O(n²) worst',
      wins: (
        <>
          <strong>Every point within ε</strong>, 79 of 2,000 vertices at
          ε = 1.0, within 1.10× of the optimum.
        </>
      ),
      costs: (
        <>
          Quadratic on adversarial zigzags; can introduce
          self-intersections.
        </>
      ),
      when: 'A hard tolerance on a long path; the default for tracks and contours.',
    },
    {
      name: 'Visvalingam-Whyatt',
      algoName: 'Visvalingam-Whyatt',
      cost: 'O(n log n) with a heap',
      wins: (
        <>
          Removes the point whose triangle with its neighbors has the
          least area, repeatedly; keeps the shape&apos;s character and
          gives a ranking of every vertex, so one pass serves every
          zoom level.
        </>
      ),
      costs: (
        <>
          The knob is an area, not a distance, so there is no
          per-point error bound in the same units.
        </>
      ),
      when: 'Map rendering across scales, where the look of the line matters more than a metric guarantee.',
    },
    {
      name: 'Imai-Iri optimal simplification',
      algoName: 'Imai-Iri algorithm',
      cost: 'O(n²) chords, O(n³) naive checks',
      wins: (
        <>
          The true minimum: 153 vertices where the recursion keeps 157,
          60 where it keeps 66.
        </>
      ),
      costs: (
        <>
          Cubic checks in the plain form, n³/6: about 1.3 billion for the 2,000-point
          track against 22,631.
        </>
      ),
      when: 'Short polylines where every vertex is expensive, as in a bandwidth-limited transmission of a fixed shape.',
    },
    {
      name: 'Radial distance',
      algoName: 'Radial distance simplification',
      cost: 'O(n), one pass',
      wins: (
        <>
          Drops every point within δ of the last kept one; linear and
          trivial; the pre-pass in simplify.js before Douglas-Peucker.
        </>
      ),
      costs: (
        <>
          No deviation bound at all: 3.387 at the same 79 vertices, 3.4×
          the tolerance.
        </>
      ),
      when: 'Removing dense clusters of near-duplicate samples before a real simplification.',
    },
  ],
  neverUse: {
    name: 'Uniform decimation',
    why: (
      <>
        Keeping every 25th point gives the same 79 vertices in one line
        of code and no distance computations, and it is the wrong
        answer to a tolerance. It keeps vertices at fixed intervals along
        smooth runs that needed none and skips corners that needed one,
        so its maximum error at 79 vertices is{' '}
        <strong>1.960, twice the tolerance</strong> the recursion holds to
        0.995, and no setting of k bounds it: a single sharp turn between
        two kept samples is lost whatever k is. The radial-distance
        filter, which at least looks at the data, is worse still at
        3.387. Simplification within ε is a promise about every point;
        a method that never measures the deviation cannot make it.
      </>
    ),
  },

  contest: {
    instance:
      'a 2,000-point noisy track simplified to within ε everywhere; referees: the point-by-point guarantee, the Imai-Iri optimum on a 200-point subsample, and decimation and radial distance at the same vertex count',
    columns: ['ε', 'vertices kept (of 2,000)', 'max error, measured', 'distance evaluations'],
    rows: [
      {
        method: 'Douglas-Peucker',
        values: ['0.05', '1,669', '0.050', '23,916'],
        verdict: 'within tolerance',
      },
      {
        method: 'Douglas-Peucker',
        values: ['0.2', '836', '0.199', '22,631'],
        verdict: '157 vs the optimum 153 on 200 points',
      },
      {
        method: 'Douglas-Peucker',
        isThisUnit: true,
        values: ['1.0', '79', '0.995', '15,812'],
        best: 2,
        verdict: '66 vs the optimum 60 on 200 points (1.10×)',
      },
      {
        method: 'uniform decimation, same count',
        values: ['1.0', '79', '1.960', '0'],
        verdict: 'twice the tolerance',
      },
      {
        method: 'radial distance, same count',
        values: ['1.0', '79', '3.387', '2,000'],
        verdict: '3.4× the tolerance',
      },
      {
        method: 'Douglas-Peucker',
        values: ['5.0', '28', '4.577', '12,499'],
        verdict: 'the caricature',
      },
      {
        method: 'cost at ε = 0, 400 points',
        values: ['track / zigzag', '400 / 400', '0 / 0', '3,609 / 79,401 of 79,800'],
        verdict: 'the zigzag is the quadratic worst case',
      },
    ],
    source:
      'python solutions/douglas_peucker_max_deviation_recursion.py prints this table and asserts: every original point within ε of the simplification at all four tolerances with the counts strictly decreasing; Douglas-Peucker at most 1.5× the Imai-Iri minimum on 200 points at ε = 0.2 and 1.0; at 79 vertices Douglas-Peucker within 1.0 while decimation exceeds 1.5 and radial distance exceeds 2.0; and on 400 points the zigzag costs more than 90% of n(n − 1)/2 evaluations while the track costs under 30%.',
  },

  figure: (
    <Figure
      id="fig-dp-split"
      aspect="16 / 7"
      caption="Fourteen points. The first chord (amber) runs from the first point to the last; its tolerance band is shaded. The farthest interior point misses the chord by 124 (dashed), far outside the band, so it is kept and the chord splits. Two levels later every chord’s farthest point is inside the band and four vertices (blue) carry the whole line (green). On the 2,000-point track at ε = 1.0: 79 vertices, maximum error 0.995, 15,812 evaluations; the same 79 by decimation err 1.960."
      cite={{
        text: 'D. H. Douglas, T. K. Peucker, "Algorithms for the reduction of the number of points required to represent a digitized line or its caricature," The Canadian Cartographer 10(2), 1973. DOI 10.3138/FM57-6770-U75U-7727. U. Ramer, CGIP 1(3), 1972. J. Hershberger, J. Snoeyink, "Speeding up the Douglas-Peucker line-simplification algorithm," SDH 1992.',
        href: 'https://doi.org/10.3138/FM57-6770-U75U-7727',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="A jagged polyline with the first chord and its tolerance band, the farthest point marked with a dashed perpendicular, and the final four-vertex simplification">
        <polygon points="43.1,229.8 433.1,189.8 426.9,130.2 36.9,170.2" fill="#f0b94b" fillOpacity="0.12" />
        <polyline points="40,200 70,150 100,170 130,90 160,110 190,60 220,100 250,80 280,140 310,120 340,180 370,150 400,190 430,160" fill="none" stroke="#9aa5bd" strokeWidth="1.2" strokeOpacity="0.7" />
        <line x1="40" y1="200" x2="430" y2="160" stroke="#f0b94b" strokeWidth="1.5" strokeDasharray="6 3" />
        <line x1="190" y1="60" x2="202.6" y2="183.3" stroke="#5da2ff" strokeWidth="1.2" strokeDasharray="3 3" />
        <polyline points="40,200 190,60 340,180 430,160" fill="none" stroke="#62d98a" strokeWidth="2.5" />
        {[[40, 200], [190, 60], [340, 180], [430, 160]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="4.5" fill="#5da2ff" />
        ))}
        {[[70, 150], [100, 170], [130, 90], [160, 110], [220, 100], [250, 80], [280, 140], [310, 120], [370, 150], [400, 190]].map(([x, y], i) => (
          <circle key={`d-${i}`} cx={x} cy={y} r="2.5" fill="#9aa5bd" fillOpacity="0.7" />
        ))}
        <text x="205" y="128" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="10">124 &gt; ε: split here</text>
        <text x="445" y="50" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="10">amber: the first chord and its band</text>
        <text x="445" y="68" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="10">blue: the farthest point, kept</text>
        <text x="445" y="86" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="10">green: 4 vertices carry 14 points</text>
        <text x="445" y="122" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">2,000-point track at ε = 1.0:</text>
        <text x="445" y="140" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">79 vertices, max error 0.995</text>
        <text x="445" y="158" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">15,812 distance evaluations</text>
        <text x="445" y="194" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="10">same 79 by decimation: 1.960</text>
        <text x="445" y="212" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="10">by radial distance: 3.387</text>
        <text x="445" y="248" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">optimum on 200 points: 60 vs 66</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'douglas_peucker_max_deviation_recursion.py',
  Viz: DouglasPeuckerViz,
  narration,
};
