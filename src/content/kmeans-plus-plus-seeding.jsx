import KmeansViz from '../viz/KmeansViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/kmeans_plus_plus_seeding.py?raw';
import { narration } from './kmeans-plus-plus-seeding.narration.js';

export const content = {
  given:
    'n points in space and a number k.',
  task: 'Place k centers and assign every point to its nearest one, minimizing the total squared distance (the SSE).',
  constraint:
    'Minimizing exactly is NP-hard, so the real game is a good local optimum at honest cost, and knowing which failures are seeding and which are shape.',

  origins: (
    <p>
      Bell Labs, 1957. Stuart Lloyd worked out the alternation for pulse-code
      modulation (quantizing signals into k levels) in a technical memo that
      stayed unpublished for <strong>25 years</strong>, circulating as folklore
      until IEEE printed it in 1982. Forgy re-derived it in 1965, MacQueen
      named it <strong>&quot;k-means&quot;</strong> in 1967, and for half a
      century its seeding was an afterthought: pick k random points, hope.
      Arthur and Vassilvitskii ended the hoping in <strong>2007</strong>:
      seed by D² sampling and the expected cost is within 8(ln k + 2) of
      optimal <em>before the first iteration runs</em>. It is two lines of
      code, and it is the default in every serious library since.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>descent</strong>. Alternate two half-steps: assign
      every point to its nearest center; move every center to the mean of
      its assigned points. Each half-step can only lower the objective (the
      mean is the best center for a fixed assignment; the nearest center is
      the best assignment for fixed centers), so SSE falls monotonically to
      a fixed point. The tested solution does not cite that proof, it
      asserts it on every iteration of every run. What the proof cannot
      promise is <strong>which</strong> fixed point.
    </p>
  ),
  heurRole: (
    <p>
      Decides <strong>where the descent starts</strong>, which decides where
      it ends. Uniform random seeds land two-in-one-blob constantly (a
      median of 10 distinct blobs hit out of 15, measured), and every
      doubled seed merges two real clusters somewhere else, a defect Lloyd
      can never repair. k-means++ picks each next seed with probability
      proportional to <strong>squared distance</strong> from the seeds so
      far: far, unclaimed territory is exponentially favored, the 15 seeds
      hit 15 blobs (median), and the guarantee holds before iteration one.
    </p>
  ),

  picture: (
    <p>
      Open k pizza shops in a city of dense neighborhoods, then let each
      shop relocate to the middle of its own customers, again and again.
      The relocation logic is flawless and doomed by the franchise map:
      open two shops on the same block and they will split that block
      forever, while two neighborhoods across town share one distant shop.
      No amount of relocation fixes a bad opening. The ++ rule is a scouting
      policy: open each new shop with likelihood proportional to how{' '}
      <strong>badly served</strong> a location currently is, squared. The
      unserved suburbs practically shout.
    </p>
  ),

  steps: [
    <>
      <strong>Seed one</strong> center uniformly at random.
    </>,
    <>
      <strong>Seed the rest:</strong> pick each next center with probability
      ∝ D²(x), the squared distance from x to its nearest chosen center.
      Two lines, O(nk) total.
    </>,
    <>
      <strong>Assign:</strong> every point to its nearest center.
    </>,
    <>
      <strong>Update:</strong> every center to the mean of its points.
      Both half-steps lower SSE; the descent is a theorem.
    </>,
    <>
      <strong>Stop</strong> when no assignment changes: a local optimum,
      reached here in a median of <strong>2 iterations</strong> from ++
      seeds versus 8 from random ones.
    </>,
  ],

  signals: [
    <>
      Clusters are <strong>compact and roughly round</strong> at similar
      scales: the objective literally assumes it (nearest-center cells are
      convex).
    </>,
    <>
      <strong>k is known</strong> or worth sweeping; n is large and speed
      matters: each iteration is one pass, n·k distances.
    </>,
    <>
      You would rather <strong>seed well once</strong> than restart blindly
      many times; the contest prices both.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the same Lloyd&apos;s iteration with uniform
      random seeds: median <strong>7.63×</strong> the best-known SSE on
      fifteen tight blobs, finding the true optimum in{' '}
      <strong>1 run of 30</strong>. The cost is quantized: each doubled-up
      seed merges two real blobs and adds about one 4× level. Seeding is
      not a detail; on this instance it is the whole outcome.
    </>
  ),

  strength: (
    <>
      <strong>Fast, monotone, and guaranteed-before-it-starts.</strong> A
      median of 2 iterations to convergence (22,500 distance evaluations),
      SSE descent asserted at every step, the true optimum found in 21 of
      30 runs, and the O(log k) expected-cost theorem riding on two lines
      of seeding code.
    </>
  ),
  weakness: (
    <>
      <strong>Convex cells, chosen k, squared distances.</strong> On two
      concentric rings every seeding scores a pairing agreement of{' '}
      <strong>0.50</strong>, coin-flip territory, while DBSCAN reads the
      shape exactly (1.00): no seeding fixes a shape mismatch. k must be
      supplied, and squaring makes outliers shout: robust variants
      (k-medoids, trimmed k-means) exist for exactly that.
    </>
  ),

  problem: 'Clustering',
  problemSlug: 'clustering',
  rivals: [
    {
      name: 'K-means × ++ seeding',
      isThisUnit: true,
      algoName: 'K-means',
      cost: 'O(nk) per iteration',
      wins: (
        <>
          The optimum in <strong>21 of 30</strong> runs, median 2
          iterations, and a proven expected-cost bound before Lloyd&apos;s
          even starts. The default for compact clusters at scale.
        </>
      ),
      costs: (
        <>
          Convex cells only (rings: 0.50), k required, and outliers pull
          means hard.
        </>
      ),
      when: 'Blob-shaped structure, known-ish k, big n: the first clustering to reach for.',
    },
    {
      name: 'DBSCAN',
      cost: 'O(n²) naive, O(n log n) indexed',
      wins: (
        <>
          Reads <strong>shape</strong>: pairing agreement 1.00 on the rings
          k-means halves, no k needed, and outliers become labeled noise
          instead of magnets.
        </>
      ),
      costs: (
        <>
          Two dials (ε, minPts) that genuinely matter, trouble when
          densities vary across clusters, and no notion of a center to
          hand downstream.
        </>
      ),
      when: 'Arbitrary shapes, unknown k, noise you want quarantined rather than absorbed.',
    },
    {
      name: 'Gaussian mixture (EM)',
      algoName: 'Gaussian mixture model',
      cost: 'O(nkd²) per iteration',
      wins: (
        <>
          K-means with the assumptions made explicit and relaxed: soft
          memberships, elliptical clusters, per-cluster covariance, and
          honest probabilities out.
        </>
      ),
      costs: (
        <>
          More parameters to estimate, the same local-optimum landscape
          (it needs good seeding too, often from k-means++ itself), and
          singular covariances to guard.
        </>
      ),
      when: 'Elongated or overlapping clusters, or when downstream wants membership probabilities.',
    },
    {
      name: 'Single-linkage agglomerative',
      algoName: 'Agglomerative clustering',
      cost: 'O(n²)',
      wins: (
        <>
          Follows connectedness itself (it is exactly the minimum spanning
          tree with the longest edges cut): pairing agreement{' '}
          <strong>1.00 on the rings</strong>, filaments and shells welcome.
        </>
      ),
      costs: (
        <>
          Chaining: fifteen noise points bridging two blobs drag its
          agreement to <strong>0.76</strong> while k-means++ holds 0.95.
          One thin path of debris fuses real clusters.
        </>
      ),
      when: 'Connected, filament-like structure in clean data; Ward or complete linkage when compactness matters.',
    },
  ],
  neverUse: {
    name: 'K-means itself, when the clusters are shells, chains, or moons',
    why: (
      <>
        The failure is structural, not fixable by seeding: nearest-center
        regions are <strong>convex cells</strong>, and a ring is not
        convex, so on two concentric circles every seeding of k-means
        scores <strong>0.50</strong>, a coin flip, while DBSCAN and single
        linkage both score 1.00. When the answer to &quot;what shape are
        the clusters?&quot; is not &quot;blobs&quot;, changing the seeding
        is rearranging deck chairs; change the method.
      </>
    ),
  },

  contest: {
    instance:
      'fifteen tight, well-separated blobs (750 points, k = 15), 30 seeded restarts per row; SSE quoted relative to the best result found by any run; work in distance evaluations',
    columns: ['median SSE ÷ best', 'optimum found', 'work (median run)'],
    rows: [
      {
        method: 'K-means × ++ seeding',
        isThisUnit: true,
        values: ['1.00×', '21 / 30', '22,500'],
        best: 0,
        verdict: 'seeds hit all 15 blobs (median); Lloyd finishes in 2 iterations',
      },
      {
        method: 'K-means × random seeds',
        values: ['7.63×', '1 / 30', '90,000'],
        verdict: 'a median of 10 blobs seeded: every doubled seed is a 4× level',
      },
      {
        method: 'K-means × best of 10 random',
        values: ['4.26×', '1 / 3 pools', '866,250'],
        verdict: 'the folk remedy priced: 38× the work, still usually defective',
      },
    ],
    source:
      'python solutions/kmeans_plus_plus_seeding.py prints this table and asserts Lloyd’s monotone descent on every iteration of every run, the seed-coverage medians (15 vs 10 of 15 blobs), the outcome gap, and the shape boundaries: rings at 0.50 for k-means versus 1.00 for DBSCAN and single linkage, and the fifteen-point bridge that chains single linkage to 0.76 while k-means++ holds 0.95.',
  },

  figure: (
    <Figure
      id="fig-kmeanspp-d2"
      aspect="16 / 7"
      caption="D² sampling in one frame. One seed is placed; every other point's brightness is its squared distance to the nearest seed so far, which is exactly its probability of becoming the next seed. The far, unserved blobs practically shout, a doubled-up seed becomes a rare accident instead of the expected case, and the 8(ln k + 2) expected-cost guarantee is already in force before Lloyd's first iteration."
      cite={{
        text: 'Arthur and Vassilvitskii, "k-means++: The Advantages of Careful Seeding", SODA 2007. Lloyd’s iteration is the 1957 Bell Labs memo published as "Least Squares Quantization in PCM", IEEE Transactions on Information Theory 28(2), 1982.',
        href: 'https://doi.org/10.1109/TIT.1982.1056489',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="Blobs of points shaded by squared distance from the one placed seed; the farthest blob glows brightest as the likely next seed">
        {[
          [110, 200, 0.08], [150, 90, 0.35], [330, 210, 0.55], [380, 70, 0.8], [560, 150, 1.0],
        ].map(([cx, cy, w], b) => (
          <g key={b}>
            {Array.from({ length: 26 }, (_, i) => {
              const a = (i * 2.399) % (Math.PI * 2);
              const r = 6 + ((i * 13) % 34);
              return (
                <circle
                  key={i}
                  cx={cx + Math.cos(a) * r}
                  cy={cy + Math.sin(a) * r * 0.7}
                  r={2.4}
                  fill={`rgba(240,185,75,${0.12 + w * 0.78})`}
                />
              );
            })}
          </g>
        ))}
        <circle cx="110" cy="200" r="7" fill="#5da2ff" />
        <text x="96" y="232" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="12">seed 1</text>
        <circle cx="560" cy="150" r="10" fill="none" stroke="#62d98a" strokeWidth="2" strokeDasharray="5 4" />
        <text x="500" y="112" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="12">almost surely seed 2</text>
        <text x="30" y="34" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="12">brightness = D²(x) = squared distance to the nearest chosen seed</text>
        <text x="30" y="270" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="12">P(x becomes the next seed) ∝ D²(x) · far and unserved wins</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'kmeans_plus_plus_seeding.py',
  Viz: KmeansViz,
  narration,
};
