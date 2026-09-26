import DbscanViz from '../viz/DbscanViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/dbscan_density_reachability.py?raw';
import { narration } from './dbscan-density-reachability.narration.js';

export const content = {
  given:
    'Six hundred points in the plane: two interleaved crescents of 200, a tight blob of 100, and 100 points of uniform noise scattered over the scene. No centers, no cluster count, no shapes are given.',
  task: 'Call a point core if at least 5 points (itself included) lie within ε = 0.2 of it. A cluster is everything reachable from a core point through chains of core points at most ε apart, plus the non-core points within ε of any of them; the rest is noise. Membership is decided by chains of dense neighborhoods, never by distance to a center.',
  constraint:
    'The definition is recomputed independently by brute force (179,700 pairwise distances, union-find over core pairs): the scan agrees on every core point, every border, every noise point. It finds 3 clusters and 73 noise points, adjusted Rand index 0.901 against the generating labels; k-means with k = 3 scores 0.372, cutting each crescent in two. The ε-grid index computes 26,800 distances, 14.9% of brute force. The dials, ablated: minPts = 1 gives 61 clusters and no noise; ε = 0.5 merges the crescents; ε = 0.08 shatters them into 15 pieces with 143 points of noise.',

  origins: (
    <p>
      Ester, Kriegel, Sander, and Xu published DBSCAN at KDD{' '}
      <strong>1996</strong> from Munich: density-reachability and
      density-connectivity as the definition of a cluster, an R*-tree
      for the neighborhood queries, and the sorted k-distance plot as
      the rule of thumb for ε. Ankerst, Breunig, Kriegel, and Sander
      answered the one-density limitation with OPTICS in 1999, an
      ordering rather than a partition; Campello, Moulavi, and Sander
      made it hierarchical as HDBSCAN in 2013 and dropped ε
      altogether. The paper took the KDD test-of-time award in 2014,
      and in 2017 Schubert, Sander, Ester, Kriegel, and Xu wrote
      &quot;DBSCAN Revisited, Revisited&quot; to settle its running
      time in print: quadratic in the worst case, near-linear with an
      index in low dimensions, and no faster algorithm needed for the
      problem the original was built for.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>scan</strong>: one pass over the points. For
      each unlabeled point, query its ε-neighborhood; fewer than
      minPts, mark it noise for now; otherwise open a cluster and
      expand a queue: every dequeued point joins, and if it is core its
      neighbors join the queue. A noise point reached from a core
      neighbor is relabeled as a border. The referee is the definition
      itself, computed by brute force: core masks identical, connected
      components identical, <strong>521 core points, 6 borders, 0
      order-dependent borders</strong>, 73 noise. With cells of side
      ε and a 3 × 3 block per query, the scan computed 26,800
      distances against 179,700 for brute force: 14.9%.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>membership rule</strong>: two points share
      a cluster if and only if a chain of core points at most ε apart
      connects them. No centers, no k, no convexity: each crescent is
      one cluster (ARI <strong>0.901</strong>; k-means with k = 3,
      0.372). The rule has two dials. minPts = 1 turns it into single
      linkage: 61 clusters and no noise, every stray point a cluster of
      its own (the draft expected the noise to bridge the crescents;
      measured, it did not, because the gap is wider than ε and the
      noise too sparse). ε = 0.5 merges the crescents into one label
      while stray noise forms clusters of its own: 5 clusters, ARI
      0.347. ε = 0.08 shatters them: 15 pieces, 143 noise, ARI 0.314.
    </p>
  ),

  picture: (
    <p>
      A crowd in a plaza at night, seen from above: no faces, no
      groups, only bodies. The rule: a person with at least four others
      within arm&apos;s reach is in a crowd. Two people are in the same
      crowd if you can walk from one to the other stepping only between
      crowd-members an arm&apos;s reach apart. Someone standing alone
      is nobody&apos;s. Someone at the edge, an arm from a crowd member
      but with few neighbors of their own, belongs to that crowd but
      cannot recruit. A conga line snaking across the plaza is one
      crowd, however far it winds, because arm&apos;s-reach chains
      along it; two crowds separated by an empty strip stay two,
      however close their centers.
    </p>
  ),

  steps: [
    <>
      <strong>Index:</strong> bucket the points into cells of side ε;
      a neighborhood query scans the 3 × 3 block.
    </>,
    <>
      <strong>Visit:</strong> for each unlabeled point, count neighbors
      within ε; fewer than minPts, noise for now.
    </>,
    <>
      <strong>Expand:</strong> at least minPts, open a cluster; queue
      the neighbors; each dequeued point joins, and core ones enqueue
      theirs.
    </>,
    <>
      <strong>Borders:</strong> a noise point reached from a core
      neighbor is relabeled into that cluster.
    </>,
    <>
      <strong>Check:</strong> cores, components, borders, and noise
      against brute force; ARI 0.901 against the truth.
    </>,
  ],

  signals: [
    <>
      <strong>Clusters with shapes:</strong> crescents, rings,
      streets, anything a center cannot describe (k-means: 0.372).
    </>,
    <>
      <strong>Noise you want named:</strong> 73 of the 100 stray points
      marked as noise rather than forced into a cluster.
    </>,
    <>
      <strong>Unknown k, roughly one density:</strong> the two dials
      replace k, and they assume the clusters share a density.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>k-means with k = 3</strong>, the
      default first reach: the best of 20 k-means++ runs scores ARI
      0.372, cutting each crescent at its middle and assigning every
      noise point somewhere. It needs k, and it draws Voronoi cells
      around centers; the crescents have no centers.
    </>
  ),

  strength: (
    <>
      <strong>The definition, exactly, at a fraction of the
      cost.</strong> Point for point equal to the brute-force
      definition at 14.9% of its distances; crescents and blob found as
      three clusters with the noise named; no k, no centers, no shape
      assumptions.
    </>
  ),
  weakness: (
    <>
      <strong>Two dials and one density.</strong> ε = 0.2 works, 0.5
      merges, 0.08 shatters, and nothing inside the algorithm chooses;
      clusters of different densities cannot share one ε, which OPTICS
      and HDBSCAN exist to fix. Borders are order-dependent in
      principle (0 ambiguous here, counted rather than assumed). Worst
      case quadratic, and in high dimensions no index makes the
      neighborhood query cheap.
    </>
  ),

  problem: 'Clustering',
  problemSlug: 'clustering',
  rivals: [
    {
      name: 'DBSCAN × density-reachability',
      isThisUnit: true,
      algoName: 'DBSCAN',
      cost: 'one neighborhood query per point',
      wins: (
        <>
          <strong>Shapes and noise</strong>: 3 clusters and 73 noise
          points matching the definition on every point, ARI 0.901.
        </>
      ),
      costs: (
        <>
          ε and minPts chosen by hand, one density for all clusters.
        </>
      ),
      when: 'Clusters of arbitrary shape at a common density, with noise to be named rather than absorbed.',
    },
    {
      name: 'K-means',
      cost: 'k centers, a few sweeps',
      wins: (
        <>
          The live unit here with k-means++ seeding: fast, simple, and
          right when clusters are round blobs.
        </>
      ),
      costs: (
        <>
          Needs k; cuts each crescent in two (ARI 0.372); assigns every
          noise point somewhere.
        </>
      ),
      when: 'Compact, roughly spherical clusters and a known k.',
    },
    {
      name: 'OPTICS',
      cost: 'a reachability ordering',
      wins: (
        <>
          One ε-free ordering from which clusters at every density can
          be read off.
        </>
      ),
      costs: (
        <>
          The ordering still has to be cut; slower than one scan.
        </>
      ),
      when: 'Clusters of different densities, or when ε cannot be chosen in advance.',
    },
    {
      name: 'HDBSCAN',
      cost: 'a condensed cluster tree',
      wins: (
        <>
          Hierarchical density clustering with only minPts to set;
          stable clusters chosen by persistence.
        </>
      ),
      costs: (
        <>
          More machinery: a minimum spanning tree over mutual
          reachability distances and a condensed tree to prune.
        </>
      ),
      when: 'Variable density and no appetite for tuning ε.',
    },
  ],
  neverUse: {
    name: 'K-means on crescents',
    why: (
      <>
        The default first reach, measured: the best of 20 k-means++
        runs scores <strong>ARI 0.372</strong> on this scene, against
        0.901 for the scan. A center-based method draws a Voronoi cell
        around each center, and a crescent has no center: its two
        horns are closer to the other crescent&apos;s center than to
        their own, so each crescent is cut at the middle and the halves
        are handed to the wrong side. No number of restarts fixes a
        geometric impossibility, and noise gets a home it does not
        deserve.
      </>
    ),
  },

  contest: {
    instance:
      'two crescents (200 + 200), a blob (100), uniform noise (100); ε = 0.2, minPts = 5; referee: the definition by brute force (179,700 pairwise distances)',
    columns: ['clusters', 'noise', 'ARI vs truth'],
    rows: [
      {
        method: 'DBSCAN, ε 0.2, minPts 5',
        isThisUnit: true,
        values: ['3', '73', '0.901'],
        best: 2,
        verdict: 'crescents, blob, and noise, matching the definition on every point',
      },
      {
        method: 'k-means, k = 3 (best of 20)',
        values: ['3', '0', '0.372'],
        verdict: 'centers cannot hold a crescent: each is cut in two',
      },
      {
        method: 'DBSCAN, ε 0.2, minPts 1',
        values: ['61', '0', '0.861'],
        verdict: 'single linkage: every stray point becomes its own cluster',
      },
      {
        method: 'DBSCAN, ε 0.5, minPts 5',
        values: ['5', '21', '0.347'],
        verdict: 'too wide: the crescents merge, and stray noise forms clusters',
      },
      {
        method: 'DBSCAN, ε 0.08, minPts 5',
        values: ['15', '143', '0.314'],
        verdict: 'too narrow: fragments, and most points are noise',
      },
    ],
    source:
      'python solutions/dbscan_density_reachability.py prints this table and asserts: the scan’s core mask equals the brute-force one, core points of one component share one label and no two components share a label, every border sits in a cluster owning one of its core neighbors, every noise point has no core neighbor; 3 clusters, ARI above 0.9 against the truth and k-means below 0.6; each ablation below the scan, ε = 0.5 merging the crescents’ majority labels and ε = 0.08 producing more clusters and more noise; the grid index under a quarter of brute force.',
  },

  figure: (
    <Figure
      id="fig-dbscan-scene"
      aspect="16 / 7"
      caption="The scene and the rule. Two crescents (blue and green), a blob (purple), and stray noise (red crosses). The amber circle is one density test: ε = 0.2 around a point, minPts = 5 inside it makes the point core. Chains of core points at most ε apart carry membership along each crescent and never across the gap, which is wider than ε; a stray point with fewer than 5 neighbors has no chain to join. Measured: 3 clusters, 73 noise, 521 cores, 6 borders, ARI 0.901; k-means 0.372."
      cite={{
        text: 'M. Ester, H.-P. Kriegel, J. Sander, X. Xu, "A density-based algorithm for discovering clusters in large spatial databases with noise," KDD 1996. E. Schubert et al., "DBSCAN Revisited, Revisited," ACM TODS 42(3), 2017. DOI 10.1145/3068335.',
        href: 'https://doi.org/10.1145/3068335',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="Two crescent-shaped clusters, a round blob, scattered noise crosses, and one amber epsilon circle on a crescent">
        <path d="M 76 164 A 60 60 0 0 1 196 164" fill="none" stroke="#5da2ff" strokeWidth="9" strokeLinecap="round" opacity="0.85" />
        <path d="M 136 134 A 60 60 0 0 0 256 134" fill="none" stroke="#62d98a" strokeWidth="9" strokeLinecap="round" opacity="0.85" />
        <circle cx="316" cy="116" r="20" fill="#c792ea" opacity="0.85" />
        {[[60, 60], [300, 40], [380, 200], [150, 230], [250, 60], [400, 90], [90, 210], [340, 170], [220, 240], [40, 130]].map(([x, y], i) => (
          <g key={i} stroke="#e2606c" strokeWidth="1.6">
            <line x1={x - 4} y1={y - 4} x2={x + 4} y2={y + 4} />
            <line x1={x + 4} y1={y - 4} x2={x - 4} y2={y + 4} />
          </g>
        ))}
        <circle cx="103" cy="118" r="12" fill="none" stroke="#f0b94b" strokeWidth="2" />
        <text x="118" y="100" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">ε = 0.2, minPts = 5: core</text>
        <line x1="166" y1="164" x2="166" y2="134" stroke="#9aa5bd" strokeWidth="1" strokeDasharray="3 3" />
        <text x="172" y="154" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">gap 0.5 &gt; ε</text>
        <text x="430" y="60" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="11">600 points, 179,700 pairs</text>
        <text x="430" y="82" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="11">3 clusters, 521 cores, 6 borders</text>
        <text x="430" y="100" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">73 noise points named</text>
        <text x="430" y="126" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">ARI 0.901 vs truth</text>
        <text x="430" y="144" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">k-means, k = 3: 0.372</text>
        <text x="430" y="170" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">ε-grid: 26,800 distances</text>
        <text x="430" y="186" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">14.9% of brute force</text>
        <text x="430" y="212" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">minPts 1: 61 clusters, no noise</text>
        <text x="430" y="228" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">ε 0.5: crescents merge, ARI 0.347</text>
        <text x="430" y="244" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">ε 0.08: 15 pieces, 143 noise</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'dbscan_density_reachability.py',
  Viz: DbscanViz,
  narration,
};
