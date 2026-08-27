import ClosestPairViz from '../viz/ClosestPairViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/closest_pair_strip_merge.py?raw';
import { narration } from './closest-pair-strip-merge.narration.js';

export const content = {
  given:
    'n points in the plane.',
  task: 'The closest pair, in O(n log n).',
  constraint:
    'The definition compares all n(n−1)/2 pairs: 4,999,950,000 distances at n = 100,000 (about an hour here, stated and not run). The whole page hangs on one packing fact, and it is counted live, not cited: no strip point ever needed more than 7 successors, asserted on every strip of every run.',

  origins: (
    <p>
      Shamos and Hoey&apos;s <strong>1975</strong> paper is the founding
      document of computational geometry, and closest-pair was its
      flagship: the first n log n bound for a problem everyone solved
      quadratically. The divide-and-conquer with the strip argument
      became <em>the</em> textbook exhibit for &quot;the merge step is
      where the theorem lives.&quot; Rabin&apos;s 1976 randomized grid
      version (expected O(n)) was among the first randomized algorithms
      ever published, and the plane-sweep variant became the practical
      workhorse. All three run on this page, referee each other at
      100,000 points, and split the honors in ways worth reading
      closely.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>recursion</strong>. Split at the median x, solve
      each half, and let δ be the better answer. That alone misses
      exactly one family of pairs: those straddling the midline: and
      bounds them inside a 2δ-wide strip. The structure is
      embarrassingly parallel (halves never speak) and its worst case is
      a theorem about <em>every</em> input, not an expectation: the
      vertical-line stress, where the strip is the entire point set,
      still ran in 16,792 distances.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>packing bound</strong>. Inside the strip,
      sorted by y, each point needs comparing to at most{' '}
      <strong>7 successors</strong>: a δ×2δ rectangle cannot contain 8
      points pairwise δ apart (each half&apos;s points already are), so
      the &quot;quadratic&quot; strip check is linear. The page counts
      it rather than citing it: the observed maximum was{' '}
      <strong>2</strong> on uniform data and <strong>1</strong> on the
      collinear adversary, with the ≤7 bound asserted on every strip
      point of every run: a geometry lemma, cashed as a loop invariant.
    </p>
  ),

  picture: (
    <p>
      Two search parties comb the west and east halves of a field for
      the closest pair of mushrooms, then meet at the fence. They need
      not re-search the field: any cross-fence pair beating both
      parties&apos; finds must have <em>both</em> mushrooms within δ of
      the fence: a narrow corridor: and inside it, each mushroom needs
      checking against only a handful of corridor neighbors at its
      height, because mushrooms on the same side already keep their
      distance. The corridor check is a formality with a constant in
      it: and the constant is what turns n² into n log n.
    </p>
  ),

  steps: [
    <>
      <strong>Sort once by x</strong> (and carry a y-sorted copy down
      the recursion: the &quot;merge&quot; in the name).
    </>,
    <>
      <strong>Split</strong> at the median x; recurse into both halves;
      δ = the better of the two answers.
    </>,
    <>
      <strong>Build the strip:</strong> points within δ of the midline,
      already in y order.
    </>,
    <>
      <strong>Scan upward:</strong> compare each strip point to
      successors until the y-gap reaches δ: at most 7, asserted live.
    </>,
    <>
      <strong>Return the minimum</strong> of left, right, and strip: the
      recurrence T(n) = 2T(n/2) + O(n) closes at n log n.
    </>,
  ],

  signals: [
    <>
      <strong>Worst-case guarantees wanted:</strong> the bound holds for
      every input shape: no randomness, no luck: the collinear stress is
      the demonstration.
    </>,
    <>
      <strong>The structure must parallelize or generalize:</strong> the
      halves are independent (map-reduce shaped), and the same recursion
      extends to 3D and beyond, where sweeps get complicated.
    </>,
    <>
      <strong>You are learning or teaching D&amp;C:</strong> this is the
      canonical example that the conquer step, not the split, is where
      theorems live.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>brute force</strong>: 4,999,950,000
      distances at this size, and also the referee that certified all
      three fast methods across 500 small instances spanning four
      hostile shapes (clusters, collinear, zero-distance duplicates).
      Below n ≈ 100 it is also simply the right tool: every fast method
      here pays constants and code that the double loop does not.
    </>
  ),

  strength: (
    <>
      <strong>A worst-case theorem with a measured constant.</strong>{' '}
      142,614 distances instead of five billion (35,059× fewer), the ≤7
      packing bound asserted on every strip point (observed max: 2),
      deterministic for every shape including the strip-is-everything
      adversary, and a structure that parallelizes and lifts to higher
      dimensions.
    </>
  ),
  weakness: (
    <>
      <strong>On friendly ground, the rivals are faster, and the page
      says so.</strong> The plane sweep finished in 0.06s to the
      recursion&apos;s 0.41s; Rabin&apos;s grid matched at 0.40s with 70
      distances. Two honest surprises are kept: distance counts alone
      would crown the sweep 6,000× (its bill hides in window upkeep, so
      count the currency the machine spends), and the vertical line
      expected to hurt the sweep instead arrives pre-sorted and helps
      it. The recursion also carries real bookkeeping: the y-sorted
      partition each level is most of its 0.41s.
    </>
  ),

  problem: 'Closest pair of points',
  problemSlug: 'closest-pair',
  rivals: [
    {
      name: 'Closest pair D&C × strip merge',
      isThisUnit: true,
      algoName: 'Closest pair divide and conquer',
      cost: 'O(n log n) worst case',
      wins: (
        <>
          The guarantee and the lemma: <strong>142,614</strong> distances
          at 100K, strip max 2 of the permitted 7, immune to shape by
          theorem, parallel by structure.
        </>
      ),
      costs: (
        <>
          The y-partition bookkeeping each level: 0.41s where the sweep
          took 0.06: the classroom champion pays rent in practice.
        </>
      ),
      when: 'Worst-case bounds, parallel or higher-dimensional settings, and every algorithms course on Earth.',
    },
    {
      name: 'Closest pair sweep × y-window',
      algoName: 'Closest pair sweep',
      cost: 'O(n log n)',
      wins: (
        <>
          <strong>0.06s</strong>, the practical champion measured: one
          pass, a shrinking window, and distances so pruned that only 21
          were ever computed.
        </>
      ),
      costs: (
        <>
          The bill lives in window maintenance (a balanced structure in
          production; a sorted list here), and its analysis leans on the
          same packing idea it rarely gets credit for.
        </>
      ),
      when: 'The 2-D problem in practice: simplest fast code, and the atlas’s tier-one pick.',
    },
    {
      name: 'Rabin grid (randomized)',
      algoName: "Rabin's closest pair",
      cost: 'O(n) expected',
      wins: (
        <>
          Among the first randomized algorithms ever (1976):{' '}
          <strong>70 distances, 26 grid rebuilds</strong>, expected
          linear: hash the plane at cell size δ and only ever look at 9
          cells.
        </>
      ),
      costs: (
        <>
          Expected, not guaranteed; needs honest randomness and floors;
          rebuild cascades are possible, just unlikely.
        </>
      ),
      when: 'Huge point sets where expected linear beats guaranteed n log n and hashing is cheap.',
    },
    {
      name: 'Bowyer-Watson (Delaunay route)',
      algoName: 'Bowyer-Watson',
      cost: 'O(n log n) + triangulation',
      wins: (
        <>
          The closest pair is always a <em>Delaunay edge</em>: build the
          triangulation and scan its O(n) edges: and you now own the
          whole proximity structure (nearest neighbors, MST) for free.
        </>
      ),
      costs: (
        <>
          A triangulation to get one pair is a mansion for a mailbox:
          only sensible when the mansion was on the shopping list.
        </>
      ),
      when: 'When nearest-neighbor structure, EMST, or meshing is needed anyway: the pair falls out.',
    },
  ],
  neverUse: {
    name: 'The double loop, past the crossover',
    why: (
      <>
        Five billion distances at n = 100,000: roughly an hour of this
        machine&apos;s time for an answer three methods delivered in
        under half a second, each verified against the other to 10⁻⁹.
        The subtlety worth keeping is the <em>other</em> direction:
        below n ≈ 100 the double loop wins on constants, clarity, and
        certainty, and this page&apos;s own referee IS the double loop
        run 500 times at small n. The crime is not the tool: it is
        ignoring the crossover: n² earns two orders of magnitude of
        pain for every factor of ten in n.
      </>
    ),
  },

  contest: {
    instance:
      'n = 100,000 uniform points; referee: brute force on 500 adversarial small instances (four shapes, zero-distance duplicates included), then mutual agreement of all three fast methods to 10⁻⁹ at scale',
    columns: ['distances', 'seconds'],
    rows: [
      {
        method: 'Brute force (definition)',
        values: ['4,999,950,000', '~3,600 (stated)'],
        verdict: 'the referee at small n; the never-use at large',
      },
      {
        method: 'D&C × strip merge',
        isThisUnit: true,
        values: ['142,614', '0.41'],
        verdict: 'the worst-case theorem; strip max 2 of the lemma’s 7',
      },
      {
        method: 'Plane sweep (y-window)',
        values: ['21', '0.06'],
        best: 1,
        verdict: 'practical champion; its bill hides in window upkeep, not distances',
      },
      {
        method: 'Rabin grid (randomized)',
        values: ['70', '0.40'],
        verdict: 'expected O(n), 26 rebuilds: 1976’s randomized pioneer',
      },
    ],
    source:
      'python solutions/closest_pair_strip_merge.py prints this table and asserts: 500 brute-refereed trials across four hostile shapes; mutual agreement of D&C, sweep, and grid to 10⁻⁹ at n = 100,000 (closest distance 0.013389); the ≤7 packing bound asserted on every strip point of every run (observed max 2 uniform, 1 collinear); and the vertical-line stress held to 16,792 distances. Two honest surprises are recorded in the output: distance counts alone would crown the sweep 6,000× (count the currency the machine spends), and the collinear shape expected to hurt the sweep instead arrives y-sorted and helps it.',
  },

  figure: (
    <Figure
      id="fig-strip-packing"
      aspect="16 / 7"
      caption="The strip and its constant. Left and right halves each guarantee their points are ≥ δ apart, so a δ×2δ rectangle of the strip holds at most 8 points: scanning upward in y, each strip point checks at most 7 successors before the y-gap alone exceeds δ. The lemma is asserted live on every strip point of every run; the observed maximum tonight was 2."
      cite={{
        text: 'Shamos & Hoey, "Closest-point problems", FOCS 1975: the founding paper of computational geometry. The randomized grid is Rabin 1976; the sweep formulation follows Hinrichs, Nievergelt & Schorn.',
        href: 'https://doi.org/10.1109/SFCS.1975.8',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="The midline strip with the delta by two-delta packing rectangle">
        <line x1="320" y1="20" x2="320" y2="250" stroke="#5da2ff" strokeWidth="1.5" />
        <rect x="270" y="20" width="100" height="230" fill="rgba(240,185,75,0.08)" stroke="#f0b94b" strokeDasharray="5 4" />
        <text x="278" y="14" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">the strip: ±δ</text>
        {[[80, 60], [150, 120], [110, 200], [200, 90], [230, 170], [60, 150]].map(([x, y], i) => (
          <circle key={`l${i}`} cx={x} cy={y} r="4" fill="#5da2ff" opacity="0.6" />
        ))}
        {[[420, 70], [500, 140], [460, 210], [560, 100], [540, 190]].map(([x, y], i) => (
          <circle key={`r${i}`} cx={x} cy={y} r="4" fill="#5da2ff" opacity="0.6" />
        ))}
        {[[296, 78], [352, 96], [305, 150], [344, 186], [300, 226]].map(([x, y], i) => (
          <circle key={`s${i}`} cx={x} cy={y} r="4.5" fill="#f0b94b" />
        ))}
        <rect x="270" y="70" width="100" height="50" fill="none" stroke="#62d98a" strokeWidth="1.6" />
        <text x="380" y="86" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">δ × 2δ box: ≤ 8 points fit</text>
        <text x="380" y="106" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">⇒ ≤ 7 successor checks each</text>
        <line x1="296" y1="78" x2="352" y2="96" stroke="#62d98a" strokeWidth="1.6" />
        <text x="24" y="272" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">each half already keeps its points ≥ δ apart: that prior work is what the box argument spends</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'closest_pair_strip_merge.py',
  Viz: ClosestPairViz,
  narration,
};
