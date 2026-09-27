import LshViz from '../viz/LshViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/locality_sensitive_hashing_random_hyperplane_hashes.py?raw';
import { narration } from './locality-sensitive-hashing-random-hyperplane-hashes.narration.js';

export const content = {
  given:
    '2,000 unit vectors in 32 dimensions, clustered so that near neighbors exist, and 100 queries, each asking for the stored vector at the smallest angle. Brute force computes 2,000 dot products per query and is exactly right. The question is how many of those 2,000 a query can skip without losing the neighbor.',
  task: 'Locality-sensitive hashing. Hash every vector so that near vectors collide with higher probability than far ones, look up the query’s bucket, and compute exact distances only to the candidates found there. The heuristic is the hash: random hyperplanes through the origin, one bit each for which side a vector falls on, so that two vectors at angle θ agree on a bit with probability 1 − θ/π. k bits make a code that agrees with probability pᵏ, sharp; L independent codes give L chances, 1 − (1 − pᵏ)ᴸ, which is how one weak bit is amplified into a useful filter.',
  constraint:
    'Measured against brute force. The collision law: pairs at exactly 15°, 30°, 60°, 90°, 120° are separated by 8.2 / 17.0 / 33.4 / 50.3 / 66.5% of 20,000 random hyperplanes, against θ/π = 8.3 / 16.7 / 33.3 / 50.0 / 66.7%. Amplification at k = 10, L = 20: a pair at 30° becomes a candidate 96.2% of the time (formula 97.0%), a pair at 80° 6.0% (formula 5.5%). The search at k = 10, L = 20: the true neighbor in 100 of 100 queries with 137 candidates and 337 dot products per query against 2,000; k = 6, L = 4 recalls 0.89 at 244; k = 12, L = 24 recalls 0.96 at 379. One bit examines 1,044 of 2,000 (recall 0.84); twenty bits in one table examines 1 (recall 0.03). Random projection to 8 dimensions with a rerank of 100 recalls 0.73 at about 608; a k-d tree in 32 dimensions is exact and visits 1,676 of 2,000.',

  origins: (
    <p>
      Piotr Indyk and Rajeev Motwani introduced locality-sensitive
      hashing in <strong>1998</strong> (STOC, &quot;Approximate nearest
      neighbors: towards removing the curse of dimensionality&quot;),
      with Gionis, Indyk, and Motwani giving the bit-sampling scheme for
      Hamming space the next year. The random hyperplane hash is Moses
      Charikar&apos;s (STOC <strong>2002</strong>, &quot;Similarity
      estimation techniques from rounding algorithms&quot;), lifted from
      Goemans and Williamson&apos;s 1995 MAX-CUT rounding, where the
      fact that a random hyperplane separates two vectors with
      probability θ/π is the whole proof. Datar, Immorlica, Indyk, and
      Mirrokni (2004) gave the p-stable projections for Euclidean
      distance; Lv, Josephson, Wang, Charikar, and Li (2007) added
      multi-probe, which reads neighboring buckets instead of building
      more tables; Manku, Jain, and Das Sarma (2007) ran the sign hash,
      as SimHash, over the whole web to find near-duplicate pages.
      Andoni and Indyk&apos;s 2008 survey in Communications of the ACM is
      the standard map of the family.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>guarantee shape</strong>: a family of hashes is
      locality-sensitive when near pairs collide with probability at
      least p₁ and far pairs at most p₂ &lt; p₁, and then k bits and L
      tables turn that gap into a filter with a computable miss rate,
      1 − (1 − p₁ᵏ)ᴸ for the neighbor against 1 − (1 − p₂ᵏ)ᴸ for the
      crowd. The referee is brute force: at k = 10, L = 20 the filter
      returns the true nearest neighbor in{' '}
      <strong>100 of 100 queries</strong> while examining 137 of the
      2,000 vectors. The amplification is measured, not trusted: a pair
      at 30° becomes a candidate 96.2% of the time against the
      formula&apos;s 97.0%, a pair at 80° 6.0% against 5.5%. And the
      ablations show what each knob does: one bit and one table examines
      1,044 vectors, half the data, for recall 0.84; twenty bits in one
      table examines one, for recall 0.03.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>bit</strong>. For a random hyperplane through
      the origin, two unit vectors at angle θ land on opposite sides
      with probability exactly θ/π, measured here at{' '}
      <strong>8.2, 17.0, 33.4, 50.3, 66.5%</strong> for 15, 30, 60, 90,
      120 degrees against 8.3, 16.7, 33.3, 50.0, 66.7. A vector&apos;s
      code is k such bits, one dot product each, and a table is a
      dictionary from code to the vectors that share it. On clustered
      data whose true neighbor sits at 24° on average, the working
      point costs 200 hash dots plus 137 candidates: 337 dot products
      against 2,000, six times fewer, for the same answer. The
      neighboring points in the sweep say where the trade lives: k = 12,
      L = 24 sharpens the codes and needs more tables to keep recall
      (0.96 at 379); k = 10, L = 10 halves the tables and loses queries
      (0.88 at 198).
    </p>
  ),

  picture: (
    <p>
      A city of two thousand people and a stranger looking for the one
      who lives closest to them. Asking every person their address is
      exact and slow. Instead, draw a random straight road through the
      city and ask everyone which side they live on. Two neighbors
      almost always answer alike; two people across town disagree half
      the time. Six random roads make a six-bit answer, and the
      stranger only speaks to people whose six bits match their own:
      neighbors nearly always match, strangers rarely do. But one bad
      road can split a pair of neighbors, so the stranger asks four
      independent sets of six roads and talks to anyone who matched on
      any set. The neighbor is almost certainly in that crowd, and the
      crowd is a fraction of the city.
    </p>
  ),

  steps: [
    <>
      <strong>Planes:</strong> for each of L tables draw k random
      Gaussian vectors h₁ … h<sub>k</sub>.
    </>,
    <>
      <strong>Code:</strong> code(v) = (sign(v · h₁), …, sign(v ·
      h<sub>k</sub>)); store every vector under its code in each table.
    </>,
    <>
      <strong>Query:</strong> compute the query&apos;s code in each
      table (k · L dot products) and collect the vectors in those L
      buckets.
    </>,
    <>
      <strong>Rerank:</strong> exact dot products to the candidates
      only; return the best.
    </>,
    <>
      <strong>Tune:</strong> k sharpens the filter, L buys chances;
      check recall against brute force on held-out queries.
    </>,
  ],

  signals: [
    <>
      <strong>Angle is the distance:</strong> normalized embeddings,
      documents as term vectors, fingerprints; the sign hash is exactly
      calibrated to cosine.
    </>,
    <>
      <strong>Too many dimensions for a tree:</strong> past a dozen or
      so, a k-d tree visits nearly everything (1,676 of 2,000 here);
      hashing never looks at the dimension count.
    </>,
    <>
      <strong>A miss rate you can budget:</strong> the formula gives it,
      the ablation shows it, and recall is a knob you pay for in tables.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>brute force</strong>: 2,000 dot
      products per query, exactly right, trivially parallel, and the
      referee for everything on this page. Below a few thousand vectors
      it is also the right answer.
    </>
  ),

  strength: (
    <>
      <strong>Sublinear candidates with a computable miss rate.</strong>{' '}
      100 of 100 neighbors found at 337 dot products against 2,000, the
      collision law within 0.6 points of θ/π at five angles, the
      amplification within 1 point of its formula, and no dependence on
      the dimension.
    </>
  ),
  weakness: (
    <>
      <strong>Two knobs, many tables, and no free lunch on hard data.</strong>{' '}
      k and L must be tuned against a brute-force sample; L tables cost
      L copies of the index; the codes are only as good as the gap
      between near and far angles, so uniformly spread data with a
      neighbor at 65° gives almost no filtering; and the sign hash is
      calibrated to cosine only, so Euclidean or edit distance needs a
      different family.
    </>
  ),

  problem: 'Approximate nearest neighbors',
  problemSlug: 'nearest-neighbor-search',
  rivals: [
    {
      name: 'Locality-sensitive hashing × Random hyperplane hashes',
      isThisUnit: true,
      algoName: 'Locality-sensitive hashing',
      cost: 'k · L hash dots + candidates per query',
      wins: (
        <>
          <strong>Recall 1.00 at 337 dots</strong> against 2,000, with a
          formula for the miss rate.
        </>
      ),
      costs: (
        <>
          L index copies; k and L tuned by hand; cosine only.
        </>
      ),
      when: 'High-dimensional cosine search with a recall budget and memory for tables.',
    },
    {
      name: 'Random projection',
      algoName: 'Random projection',
      cost: 'n short dots + a rerank',
      wins: (
        <>
          One projection, no tables, distances preserved on average
          (Johnson-Lindenstrauss).
        </>
      ),
      costs: (
        <>
          Still linear in n: recall 0.73 at about 608 dot-equivalents
          here, because 8 dimensions scramble the order of close angles.
        </>
      ),
      when: 'Reducing dimension before another index, or when n is small enough that linear scans are fine.',
    },
    {
      name: 'HNSW',
      algoName: 'HNSW',
      cost: 'about log n distance computations per query',
      wins: (
        <>
          The graph index behind most vector databases: recall near 0.99
          at a few hundred distance computations on millions of vectors.
        </>
      ),
      costs: (
        <>
          A slow, memory-hungry build; no closed-form miss rate; hard to
          shard or update in place.
        </>
      ),
      when: 'Millions of vectors, a fixed corpus, and latency that matters more than build time.',
    },
    {
      name: 'Multi-probe LSH',
      algoName: 'Multi-probe LSH',
      cost: 'fewer tables, more bucket probes per query',
      wins: (
        <>
          Reads the buckets one bit away from the query&apos;s code
          instead of building another table: the same recall at a
          fraction of the memory.
        </>
      ),
      costs: (
        <>
          More probes per query; the probe order is another design.
        </>
      ),
      when: 'When L tables no longer fit and query time is cheaper than memory.',
    },
  ],
  neverUse: {
    name: 'A k-d tree in 32 dimensions',
    why: (
      <>
        The tree is the right answer in two or three dimensions and the
        instinct in thirty-two, where it stops working. A tree on 2,000
        points has about eleven levels, so it splits on eleven of the
        thirty-two coordinates and never touches the rest; the pruning
        test, which compares the distance to a splitting plane against
        the best distance so far, almost never fires. Measured:{' '}
        <strong>1,676 of 2,000 points visited</strong> per query, exact,
        and no faster than brute force once the tree walk is added on
        top. The curse of dimensionality is not a slogan here; it is a
        count. Hashing never asks how many dimensions there are.
      </>
    ),
  },

  contest: {
    instance:
      'nearest neighbor by angle among 2,000 unit vectors in 32 dimensions (25 clusters, true neighbor at 24° on average), 100 queries; referee: brute force over all 2,000',
    columns: ['recall@1', 'candidates examined', 'dot products per query'],
    rows: [
      {
        method: 'LSH, k = 6, L = 4',
        values: ['0.89', '220', '244'],
        verdict: 'coarse codes let the crowd in',
      },
      {
        method: 'LSH, k = 10, L = 10',
        values: ['0.88', '98', '198'],
        verdict: 'sharp codes, too few chances',
      },
      {
        method: 'LSH, k = 10, L = 20',
        isThisUnit: true,
        values: ['1.00', '137', '337'],
        best: 0,
        verdict: 'the working point: 6× fewer dots than brute force',
      },
      {
        method: 'LSH, k = 12, L = 24',
        values: ['0.96', '91', '379'],
        verdict: 'sharper codes need more tables',
      },
      {
        method: 'ablation k = 1, L = 1',
        values: ['0.84', '1,044', '1,045'],
        verdict: 'half the data, no filter',
      },
      {
        method: 'ablation k = 20, L = 1',
        values: ['0.03', '1', '21'],
        verdict: 'a filter with no second chance',
      },
      {
        method: 'brute force',
        values: ['1.00', '2,000', '2,000'],
        verdict: 'the referee',
      },
      {
        method: 'random projection to 8 dims, rerank 100',
        values: ['0.73', '100', '≈ 608 equivalents'],
        verdict: 'eight dimensions scramble close angles',
      },
      {
        method: 'k-d tree, 32 dimensions',
        values: ['1.00 (exact)', '1,676 visited', '1,676'],
        verdict: 'the curse: 84% of the points',
      },
    ],
    source:
      'python solutions/locality_sensitive_hashing_random_hyperplane_hashes.py prints this table and asserts: the separation frequency within 0.015 of θ/π at five exact angles over 20,000 hyperplanes; the candidate probability within 0.04 of 1 − (1 − pᵏ)ᴸ at 30° and 80° over 500 fresh hyperplane sets; recall at least 0.9 with under a quarter of the data examined at k = 10, L = 20; one bit examining more than 40% of the data; twenty bits in one table recalling at least 0.3 below the working point; the k-d tree exact on every query while visiting more than half the points; and the working point cheaper than both the tree and brute force.',
  },

  figure: (
    <Figure
      id="fig-lsh-amplification"
      aspect="16 / 7"
      caption="Left: one random hyperplane through the origin separates two vectors at angle θ with probability θ/π, measured at five angles within 0.6 points. Right: what k bits and L tables do to that probability. One bit (gray) is a weak filter; ten bits (amber) almost never collide unless the pair is close; twenty tables of ten bits (blue) restore the near pairs while leaving the far ones out. The dots are the measured candidate probabilities at 30° and 80°: 0.962 and 0.060 against the curve’s 0.970 and 0.055."
      cite={{
        text: 'M. S. Charikar, "Similarity estimation techniques from rounding algorithms," STOC 2002. DOI 10.1145/509907.509965. P. Indyk, R. Motwani, "Approximate nearest neighbors: towards removing the curse of dimensionality," STOC 1998. A. Andoni, P. Indyk, "Near-optimal hashing algorithms for approximate nearest neighbor in high dimensions," CACM 51(1), 2008.',
        href: 'https://doi.org/10.1145/509907.509965',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="A circle with two vectors and random lines on the left; on the right, collision probability against angle for one bit, ten bits, and twenty tables of ten bits, with two measured points">
        <circle cx="110" cy="140" r="90" fill="none" stroke="#9aa5bd" strokeOpacity="0.4" />
        {[0.3, 1.1, 1.9, 2.5].map((phi, i) => (
          <line key={i} x1={110 + Math.cos(phi) * 90} y1={140 - Math.sin(phi) * 90} x2={110 - Math.cos(phi) * 90} y2={140 + Math.sin(phi) * 90} stroke="#f0b94b" strokeOpacity="0.7" />
        ))}
        <line x1="110" y1="140" x2={110 + Math.cos(0.9) * 90} y2={140 - Math.sin(0.9) * 90} stroke="#5da2ff" strokeWidth="2" />
        <line x1="110" y1="140" x2={110 + Math.cos(1.4) * 90} y2={140 - Math.sin(1.4) * 90} stroke="#5da2ff" strokeWidth="2" />
        <text x="30" y="258" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">two vectors at θ; a random line splits them w.p. θ/π</text>
        <text x="30" y="272" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">measured 8.2 / 17.0 / 33.4 / 50.3 / 66.5% at 15 to 120°</text>
        {(() => {
          const x0 = 280;
          const y0 = 240;
          const w = 330;
          const h = 200;
          const X = (deg) => x0 + (deg / 180) * w;
          const Y = (p) => y0 - p * h;
          const angles = Array.from({ length: 61 }, (_, i) => i * 3);
          const one = angles.map((d) => `${X(d)},${Y(1 - d / 180)}`).join(' ');
          const ten = angles.map((d) => `${X(d)},${Y((1 - d / 180) ** 10)}`).join(' ');
          const amp = angles.map((d) => `${X(d)},${Y(1 - (1 - (1 - d / 180) ** 10) ** 20)}`).join(' ');
          return (
            <g>
              <line x1={x0} y1={y0} x2={x0 + w} y2={y0} stroke="#9aa5bd" strokeOpacity="0.5" />
              <line x1={x0} y1={y0} x2={x0} y2={y0 - h} stroke="#9aa5bd" strokeOpacity="0.5" />
              <polyline points={one} fill="none" stroke="#9aa5bd" strokeWidth="1" strokeDasharray="4 3" />
              <polyline points={ten} fill="none" stroke="#f0b94b" strokeWidth="1.5" />
              <polyline points={amp} fill="none" stroke="#5da2ff" strokeWidth="2" />
              <circle cx={X(30)} cy={Y(0.962)} r="4" fill="#62d98a" />
              <circle cx={X(80)} cy={Y(0.06)} r="4" fill="#62d98a" />
              <text x={x0} y={y0 + 14} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">0°</text>
              <text x={x0 + w - 24} y={y0 + 14} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">180°</text>
              <text x={x0 + 6} y={y0 - h + 12} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">P(candidate)</text>
              <text x={X(100)} y={Y(0.62)} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">one bit: 1 − θ/π</text>
              <text x={X(40)} y={Y(0.30)} fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="10">ten bits: p¹⁰</text>
              <text x={X(45)} y={Y(0.90)} fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="10">20 tables: 1 − (1 − p¹⁰)²⁰</text>
              <text x={X(88)} y={Y(0.14)} fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="10">measured 0.962 at 30°, 0.060 at 80°</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'locality_sensitive_hashing_random_hyperplane_hashes.py',
  Viz: LshViz,
  narration,
};
