// The spoken lesson for puzzle eighty three, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle eighty three: Welzl’s algorithm, paired with a randomized incremental basis, for the smallest enclosing circle. Here is the puzzle. A cloud of n points, and a question James Joseph Sylvester posed in a single sentence in eighteen fifty seven: find the least circle that contains them all. Not roughly the least: exactly the least: the one circle that cannot shrink by a hair without dropping somebody. The method processes the points in random order, keeps a running circle, and rebuilds only when an arrival lands outside: which, in random order, almost never happens. The referees: exhaustion over every pair diameter and every triple circumcircle on one hundred fifty small instances, agreement to one part in ten million: and at one hundred thousand points, where no exhaustion can follow, an optimality certificate: every point inside, at most three basis points on the boundary to one part in a million, the circle recomputed from its own basis, and the center inside the hull those basis points span.',
  },
  {
    section: 'origins',
    text:
      'Sylvester, eighteen fifty seven, one sentence. A century of geometry passed through the problem before Nimrod Megiddo settled the theory in nineteen eighty three: deterministic linear time, a landmark that almost nobody implements. Then Emo Welzl, nineteen ninety one, building on Raimund Seidel’s randomized linear programming: six lines that everyone implements. Shuffle the points. Keep a circle. When an arrival lands outside, rebuild the prefix with that point pinned on the boundary. The analysis made a technique famous: backwards analysis. Stand at step i and ask: what is the chance the point that just arrived is one of the at most three that pin the answer? At most three out of i. So rebuilds thin out harmonically, and the whole run costs expected linear time. The idea grew into the L P type framework of Matousek, Sharir, and Welzl: smallest enclosing balls, ellipsoids, and a family of geometric optimization problems, all riding the same shuffle.',
  },
  {
    section: 'pair',
    text:
      'The algorithm owns the incremental construction and the basis logic. Keep the smallest circle of the points seen so far. When a new point lands outside, observe something sharp: the new circle must pass exactly through that point: otherwise it could shrink toward the others and still contain everything. So redo the prefix with the newcomer pinned on the boundary. If another point then lands outside, pin it too: two pinned points make a diameter. Pin a third and the circle is the circumcircle: fully determined, no freedom left. At most three points ever pin the answer: that trio is called the basis, and it is the answer’s receipt. The heuristic supplies exactly one thing: the arrival order: a uniform shuffle. Backwards analysis prices it: the i-th random arrival is a basis point with probability at most three over i: so the expensive rebuild almost never fires late, and total work is expected linear: measured on this page at seven point five, nine point one, and eight point nine tests per point across one thousand, ten thousand, and one hundred thousand points. Flat, across three decades.',
  },
  {
    section: 'picture',
    text:
      'Picture one round canopy that must shelter a scattered crowd. Call people over in random order. Almost everyone walks in under the canopy already: one glance, no work. Rarely, someone stands outside: the canopy must be re-pitched so that its edge reaches them exactly: they become a pole holder: and at most three pole holders ever matter, because a circle is fixed by a diameter pair or by three boundary points. Early on, re-pitching is cheap: there are few people to walk back past. Late in the line, arrivals are almost never outside, because a canopy fit to a large random crowd is already representative. Now run the disaster: call people in sorted order, marching along an arc. Every single arrival stands just past the edge. Re-pitch. Re-pitch. Re-pitch. Same canopy, same code, and the bill goes quadratic. The shuffle was never a nicety. The shuffle is the algorithm.',
  },
  {
    section: 'run',
    text:
      'Here is the run. Shuffle the points: the only randomness in the machine. Walk the list: for each point, one distance test against the current circle: inside, move on. Outside: rebuild the prefix with the newcomer pinned: then, if needed, with two pinned: then three: and a circle through three points is the circumcircle, computed in closed form. Carry the basis: the at most three boundary points that justify the radius. On this page the sequence runs at scale: one hundred thousand gaussian points, the certificate checked at the end: all inside, basis of three on the boundary to one part in a million, center inside the basis triangle. And the ablation: two thousand points on a circle, fed in sorted angular order, no shuffle: five hundred two thousand five hundred tests. The same points shuffled: two thousand and thirty four tests. Two hundred forty seven times: for the identical answer.',
  },
  {
    section: 'signals',
    text:
      'The signals that this pair fits. First: minimal enclosing anything: circle, ball, ellipsoid, annulus: these are L P type problems, and Welzl’s machinery is the standard exact answer in low dimension. Second: a certificate matters: the basis names the two or three points that justify the radius: coverage radii, facility ranges, and worst case tolerances want that receipt, not just a number. Third, and widest: the input order is not yours to trust. Any randomized incremental structure: quickselect’s random pivots, treaps, incremental Delaunay triangulation: carries this page’s moral: the expectation is over your own coin, so flip it: shuffle first, or an adversarial feed quietly replaces the average case with the worst one.',
  },
  {
    section: 'tradeoffs',
    text:
      'Now the rivals, because a smallest circle is not always the job. Ritter’s algorithm, with two pass sphere growth, is the engineering shortcut: pick a far pair, grow the sphere through one pass of the data: guaranteed valid, typically five to twenty percent fat, no recursion, no tolerances, branch free. For culling and broad phase collision, where ten percent of slack is free and speed is everything, Ritter wins the day: this page’s centroid client, at twelve percent fat, is its cruder cousin.',
  },
  {
    section: 'tradeoffs',
    text:
      'The hull first road rides the live Graham scan unit. The basis points of the smallest circle are always vertices of the convex hull: so compute the hull once, and the circle question shrinks from n points to h hull points. The sort costs n log n: more than all of Welzl: so this road pays only when the hull is already needed for other reasons, or when many circle queries amortize one sort. And the classical road before nineteen ninety one ran through Fortune’s beach line: the smallest enclosing circle’s center sits on the farthest point Voronoi diagram, which the sweep constructs in full: a whole diagram of machinery for a three point answer. Reach for it when farthest point structure serves many queries: never for the one circle.',
  },
  {
    section: 'tradeoffs',
    text:
      'And the negative example: simulated annealing on the center. The objective: minimize the farthest distance: is convex: one bowl, no false valleys: and an exact expected linear algorithm with a three point certificate is sitting at the bottom of it. Annealing here buys a temperature schedule to tune, a stopping rule to guess, an answer that is only probably approximately right, and no certificate: at a hundred times the cost. General metaheuristics earn their keep on landscapes whose structure you cannot exploit. This landscape has a name, a nineteen ninety one paper, and thirty lines of code. Matching the tool to the structure is the entire strategic game: a stochastic hammer on a convex nail is the canonical mismatch.',
  },
  {
    section: 'code',
    text:
      'The code on this page is thirty lines of the real thing, iterative rather than recursive so Python’s stack stays out of the story. Circle from two points: midpoint and half distance. Circle from three: the circumcenter in closed form. The main loop: one inside test per point, and the pinned rebuilds when the test fails. The self test runs five oracles: one hundred fifty instances against pair and triple exhaustion, agreement to one part in ten million: the certificate at one hundred thousand points: work per point flat across three decades: the sorted feed ablation, two hundred forty seven times: and the centroid shortcut priced at twelve percent fat. When the last line prints O K, every number you heard tonight has been asserted, not asserted about.',
  },
];
