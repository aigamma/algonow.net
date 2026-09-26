// The spoken lesson for puzzle one hundred twenty nine, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle one hundred twenty nine: DBSCAN, paired with density-reachability, for arbitrary-shape clustering. Here is the puzzle. Six hundred points in the plane: two interleaved crescents of two hundred points each, a tight blob of one hundred, and one hundred points of uniform noise scattered over the whole scene. No centers, no cluster count, and no shapes are given. The method: call a point core if at least five points, itself included, lie within a radius epsilon of point two. A cluster is everything reachable from a core point through chains of core points at most epsilon apart, plus the non-core points within epsilon of any of them. Everything else is noise. The heuristic is the rule itself: membership is decided by chains of dense neighborhoods, never by distance to a center, which is why a crescent is one cluster and a stray point is nobody’s. On this page the definition is recomputed by brute force and the scan is held to it on every point, k-means is run on the same scene, and both dials are turned the wrong way on purpose.',
  },
  {
    section: 'origins',
    text:
      'Martin Ester, Hans-Peter Kriegel, Jörg Sander, and Xiaowei Xu published DBSCAN in nineteen ninety six, at the knowledge discovery conference, from Munich. The paper defined density-reachability and density-connectivity as what a cluster is, used an R-star tree for the neighborhood queries, and offered the sorted k-distance plot as the rule of thumb for choosing epsilon. Ankerst, Breunig, Kriegel, and Sander answered its one-density limitation with OPTICS in nineteen ninety nine, an ordering of the points rather than a partition. Campello, Moulavi, and Sander made it hierarchical as HDBSCAN in twenty thirteen and dropped epsilon altogether. The original paper took the conference’s test of time award in twenty fourteen, and in twenty seventeen Schubert, Sander, Ester, Kriegel, and Xu wrote DBSCAN Revisited, Revisited, to settle its running time in print: quadratic in the worst case, near linear with an index in low dimensions, and no faster algorithm needed for the problem the original was built for.',
  },
  {
    section: 'pair',
    text:
      'The algorithm owns the scan: one pass over the points. For each unlabeled point, query its epsilon neighborhood. Fewer than five, mark it noise for now. Otherwise open a cluster and expand a queue: every dequeued point joins the cluster, and if it is core, its own neighbors join the queue. A noise point reached from a core neighbor is relabeled as a border. The referee is the definition itself, computed by brute force: all one hundred seventy nine thousand seven hundred pairwise distances, core points by count, and union find over pairs of core points within epsilon. The scan agreed on every point: the same five hundred twenty one core points, the same connected components, six border points each sitting in a cluster that owns one of its core neighbors, seventy three noise points with no core neighbor at all, and zero borders whose label could depend on visit order. With cells of side epsilon and a three by three block per query, the scan computed twenty six thousand eight hundred distances, fourteen point nine percent of brute force. The heuristic supplies the membership rule: two points share a cluster if and only if a chain of core points at most epsilon apart connects them. No centers, no k, no convexity. Each crescent is one cluster, and the adjusted Rand index against the generating labels is point nine zero one, where k-means with three centers scores point three seven two. The rule has two dials. Min points one turns it into single linkage: sixty one clusters and no noise at all, every stray point a cluster of its own. The draft of this page expected the noise to bridge the crescents at that setting; measured, it did not, because the gap between them is wider than epsilon and the noise is too sparse to fill it. Epsilon of point five merges the crescents into one label while stray noise forms small clusters of its own: five clusters, index point three four seven. Epsilon of point zero eight shatters them: fifteen pieces, one hundred forty three points of noise, index point three one four.',
  },
  {
    section: 'picture',
    text:
      'A crowd in a plaza at night, seen from above: no faces, no groups, only bodies. The rule: a person with at least four others within arm’s reach is in a crowd. Two people are in the same crowd if you can walk from one to the other stepping only between crowd members an arm’s reach apart. Someone standing alone is nobody’s. Someone at the edge, an arm from a crowd member but with few neighbors of their own, belongs to that crowd but cannot recruit anyone. A conga line snaking across the plaza is one crowd, however far it winds, because arm’s reach chains along it. Two crowds separated by an empty strip stay two, however close their centers are.',
  },
  {
    section: 'run',
    text:
      'Here is the run. Index: bucket the points into cells of side epsilon, so a neighborhood query scans only the three by three block around a point’s cell. Visit: for each unlabeled point, count the neighbors within epsilon; fewer than five, and it is noise for now. Expand: at least five, and a cluster opens; the neighbors go into a queue; each dequeued point joins, and the core ones enqueue their own neighbors. Borders: a noise point reached from a core neighbor is relabeled into that cluster. On this page: three clusters, the two crescents and the blob; seventy three of the hundred stray points named as noise, the rest absorbed where they fell inside a dense neighborhood; five hundred twenty one cores and six borders; twenty six thousand eight hundred distances instead of one hundred seventy nine thousand seven hundred. Then the checks: the brute force definition, point for point; the index against the truth, point nine zero one; and k-means on the same scene, point three seven two.',
  },
  {
    section: 'signals',
    text:
      'The signals that this pair fits. First: clusters with shapes. Crescents, rings, streets, coastlines, anything a center cannot describe. On this scene k-means scored point three seven two because it cannot hold a crescent. Second: noise you want named. Seventy three of the hundred stray points were marked as noise rather than forced into a cluster, and in a real data set those are the outliers you were looking for. Third: an unknown number of clusters at roughly one density. The two dials replace k, and they assume the clusters share a density, which is the limitation to remember.',
  },
  {
    section: 'tradeoffs',
    text:
      'Now the rivals. K-means, this site’s live unit with k-means plus plus seeding: fast, simple, and right when the clusters are round blobs. It needs k, it draws a Voronoi cell around each center, and on crescents it cuts each one in two: point three seven two. Reach for it for compact, roughly spherical clusters with a known count. OPTICS: the same density idea, but instead of a partition it produces an ordering of the points with a reachability distance for each, from which clusters at every density can be read off. It costs a slower pass and a cut that still has to be chosen, and it earns its keep when clusters have different densities or when epsilon cannot be chosen in advance. And HDBSCAN: hierarchical density clustering with only min points to set. It builds a minimum spanning tree over mutual reachability distances, condenses the cluster tree, and keeps the clusters that persist the longest. More machinery, but no epsilon, and the fix for the one-density weakness.',
  },
  {
    section: 'tradeoffs',
    text:
      'The honest weaknesses of the hero. Two dials and one density. Epsilon of point two works on this scene; point five merges the crescents; point zero eight shatters them into fifteen pieces and calls most of the points noise; and nothing inside the algorithm chooses between them. Clusters of different densities cannot share one epsilon at all, which is why OPTICS and HDBSCAN exist. Border points are order dependent in principle: a point within epsilon of core points from two clusters goes to whichever claimed it first. On this scene there were none, and the page counts them rather than assuming. And the running time is quadratic in the worst case; in low dimensions a grid or a tree makes the neighborhood query cheap, and in high dimensions nothing does.',
  },
  {
    section: 'tradeoffs',
    text:
      'And the negative example: k-means on crescents. It is the default first reach, and it was measured here: the best of twenty runs with k-means plus plus seeding scores point three seven two, against point nine zero one for the scan. A center-based method draws a Voronoi cell around each center, and a crescent has no center. Its two horns lie closer to the other crescent’s center than to their own, so each crescent is cut at the middle and the halves are handed to the wrong side. No number of restarts fixes a geometric impossibility, and every noise point gets a home it does not deserve.',
  },
  {
    section: 'code',
    text:
      'The code on this page is the scan and its referee in one file. A grid index with cells of side epsilon that counts every distance it computes. The scan itself, with a queue for expansion and the relabeling of noise into borders. The definition by brute force: every pairwise distance, core points by count, union find over core pairs. An adjusted Rand index. And k-means with plus plus seeding, twenty restarts, best inertia kept, for the comparison. The self test asserts: the scan’s core mask equals the brute force one; core points of one component share one label and no two components share a label; every border sits in a cluster owning one of its core neighbors; every noise point has no core neighbor; three clusters, with the index above point nine against the truth and k-means below point six; each ablation below the scan, with epsilon of point five merging the crescents’ majority labels and epsilon of point zero eight producing more clusters and more noise; and the grid index under a quarter of brute force. When it prints O K, the density rule has been held to its own definition on six hundred points and beaten the center-based default on the shapes it was built for. The file would fail before it would lie to you.',
  },
];
