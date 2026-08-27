// The spoken lesson for puzzle eighteen, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle eighteen: k-means, paired with k-means plus plus seeding, for clustering. Here is the puzzle. You are given n points in space and a number k. Your task is to place k centers and assign every point to its nearest one, minimizing the total squared distance from points to their centers, the quantity everyone calls the S S E. The constraint is a fact about the landscape: minimizing that objective exactly is NP hard, so nobody solves it; the real game is reaching a good local optimum at honest cost, and, just as important, knowing which failures come from bad seeding, which you can fix, and which come from the shape of the data, which no seeding will ever fix.',
  },
  {
    section: 'origins',
    text:
      'Bell Labs, nineteen fifty seven. Stuart Lloyd works out the alternation for pulse code modulation, quantizing telephone signals into k levels, and writes it up in a technical memo that stays unpublished for twenty five years, circulating as folklore until the I E E E finally prints it in nineteen eighty two. Forgy rediscovers the same iteration in sixty five; MacQueen names it k means in sixty seven. And for half a century, the seeding was an afterthought: pick k random points and hope. In two thousand seven, Arthur and Vassilvitskii ended the hoping with a two line change: pick each next seed with probability proportional to squared distance from the seeds chosen so far, and the expected cost is provably within a factor of about eight log k of optimal before the first iteration even runs. Two lines, one theorem, and it has been the default in every serious library since.',
  },
  {
    section: 'pair',
    text:
      'The control structure owns the descent. Alternate two half steps. First: assign every point to its nearest center. Second: move every center to the mean of the points assigned to it. Each half step can only lower the objective, for clean reasons: for a fixed assignment, the mean is the single best place a center can stand; for fixed centers, nearest is the single best assignment. So the S S E falls monotonically and the iteration always converges to a fixed point. The tested solution does not cite that proof; it asserts the descent on every iteration of every run. But notice what the proof cannot promise: which fixed point you reach. That is decided entirely by where the descent starts, and that is the heuristic’s job. Uniform random seeding lands two seeds in one cluster constantly; on fifteen well separated blobs, random seeds hit a median of only ten distinct blobs, and every doubled seed is a permanent defect: two real clusters somewhere else must share one center, and Lloyd’s iteration, which only ever descends, can never climb out. K means plus plus picks each next seed with probability proportional to squared distance from the nearest seed already placed. Far, badly served territory is favored quadratically, the fifteen seeds hit all fifteen blobs, and the guarantee is in force before iteration one.',
  },
  {
    section: 'picture',
    text:
      'Picture opening k pizza shops in a city of dense neighborhoods, with a rule that each shop keeps relocating to the middle of its own customers. The relocation logic is flawless, and it is doomed by the opening map. Open two shops on the same block, and they will split that block between them forever, while two neighborhoods across town share one distant shop and hate it. No amount of relocating repairs a bad opening, because every relocation is local: no shop will ever abandon its customers to serve strangers across the city. The plus plus rule is a scouting policy for openings: open each new shop at a location chosen with likelihood proportional to how badly served it currently is, squared. Under that policy, the unserved suburbs practically shout, and the same block almost never gets two shops.',
  },
  {
    section: 'run',
    text:
      'Here is the loop. First, seed one center uniformly at random. Second, seed each remaining center by D squared sampling: compute every point’s squared distance to its nearest chosen seed, and pick the next seed with probability proportional to that number; two lines of code, order n k work in total. Third, assign: every point to its nearest center. Fourth, update: every center to the mean of its assigned points. Both half steps lower the objective, so this is a descent, not a wander. Fifth, repeat until no assignment changes. From plus plus seeds on the blob instance, that takes a median of two iterations; from random seeds, eight, because the descent starts from wreckage and has further to fall.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, the clusters are compact and roughly round at similar scales. This is not a stylistic preference: nearest center regions are convex cells, so the objective structurally assumes blob shaped clusters. Second, k is known, or cheap to sweep, and n is large enough that speed matters; each iteration is a single pass costing n times k distances. Third, you would rather seed well once than restart blindly many times. The measurements price both strategies, and the folk remedy loses harder than intuition expects.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: fast, monotone, and guaranteed before it starts. A median of two iterations to convergence, twenty two thousand five hundred distance evaluations per run, the descent asserted at every step, the true optimum found in twenty one runs of thirty, and the expected cost theorem riding on two lines of seeding. The weakness comes in three clauses. Convex cells: shapes that are not blobs are structurally out of reach, and the measurements make that exact. Chosen k: the method cannot tell you how many clusters exist, only where k of them would stand. And squared distances: outliers shout, pulling means toward themselves, which is why the robust cousins, k medoids and trimmed k means, exist.',
  },
  {
    section: 'tradeoffs',
    text:
      'Here are the measured numbers. The arena: fifteen tight, well separated blobs, seven hundred fifty points, k fifteen, thirty seeded restarts per strategy, and every S S E quoted relative to the best result any run found. K means plus plus: a median ratio of exactly one point zero zero, the optimum found in twenty one runs of thirty, median two iterations, twenty two thousand five hundred distance evaluations. Uniform random seeding: a median ratio of seven point six three, the optimum found once in thirty runs, median eight iterations. And the cost structure is worth hearing precisely: the ratios are quantized. Each doubled up seed merges two real blobs somewhere and adds roughly one four x level: runs land near one, near four, near seven and a half, near eleven, depending on how many defects the opening dealt. Then the folk remedy: take the best of ten random restarts. Its median pool still lands at four point two six, one defect, having spent eight hundred sixty six thousand distance evaluations, about thirty eight times the work of a single seeded run. With fifteen blobs, a random opening is perfect about once in thirty tries, so ten tries usually contain zero perfect openings. Restarting is not a substitute for seeding; it is buying more lottery tickets for a lottery the other method simply does not play.',
  },
  {
    section: 'tradeoffs',
    text:
      'Now the boundary that no seeding crosses, because the failure lives in the objective, not the opening. Two concentric rings, seven hundred points. K means with k two, seeded any way you like, scores a pairing agreement of zero point five zero, a coin flip, because its cells are convex and a ring is not: the best it can ever do is cut the picture in half. D B S C A N, which chains points through dense neighborhoods and never asks for k, reads the shape exactly: agreement one point zero zero. Single linkage agglomerative clustering, which is precisely the minimum spanning tree with the longest edges cut, also scores perfect on the rings, because rings are connected filaments, its home terrain. And then its own boundary, measured in the same breath: lay fifteen quiet noise points in a thin line between two blobs, and single linkage chains across the bridge, fusing two real clusters and falling to zero point seven six, while k means plus plus, which never cared about connectivity, holds zero point nine five. Every method on this bench is a bet about what a cluster is. Compactness, density, connectedness: the data decides which bet was right, and these are the numbers of betting wrong.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements the full bench in two dimensions: Lloyd’s iteration with an injectable seeder and a distance evaluation counter, D squared sampling in the advertised two lines, D B S C A N by density reachability, and single linkage the honest way, as a minimum spanning tree built by Prim’s method with the k minus one longest edges cut. Clusterings are compared by the Rand index, pair counting agreement, which no label permutation can fool. The self test asserts, in order: Lloyd’s descent, S S E non increasing at every iteration of every one of the sixty runs; the seed coverage medians, fifteen of fifteen blobs for plus plus against ten for random; the outcome gap, including that ten random restarts still leave the median pool defective at thirty eight times the work; the shape boundary, rings at zero point five for k means against perfect scores for density and linkage; and the chaining boundary, the fifteen point bridge dragging single linkage to zero point seven six while k means plus plus holds. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
