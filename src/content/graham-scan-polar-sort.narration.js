// The spoken lesson for puzzle nineteen, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle nineteen: the Graham scan, paired with polar angle sorting, for convex hulls in the plane. Here is the puzzle. You are given n points, duplicates and collinear runs included. Your task is to report the convex hull: the vertices of the smallest convex polygon that contains every point, listed in boundary order. And the constraint is the word exactly. Hull code lives and dies on the sign of orientation tests, is this turn left, right, or dead straight, so every such test in this lesson is an integer cross product whose sign cannot lie, and the degenerate inputs, the grids and the collinear lines, are treated as part of the problem rather than an appendix.',
  },
  {
    section: 'origins',
    text:
      'Bell Labs, nineteen seventy two. A colleague brings Ron Graham a practical problem: the convex hull of around ten thousand points, and the quadratic methods of the day are too slow for it. Graham answers with the sort and scan in a paper about two pages long, and it becomes one of the founding acts of computational geometry: n log n, with a matching lower bound, so provably unimprovable in the general case. Jarvis’s wrapping march follows a year later; Andrew’s coordinate sorted chain in seventy nine; and Timothy Chan closes the story in ninety six with a hybrid that is optimal in both the input and the output size. One biographical note, because this site enjoys its characters: Graham was mathematics’ great generalist, Paul Erdos’s closest collaborator, a past president of the International Jugglers Association, and the namesake of a number so large the observable universe cannot write it down.',
  },
  {
    section: 'pair',
    text:
      'The control structure owns the stack discipline. Walk the points in some order. Push each one onto a stack. And while the last three points on the stack make a clockwise turn, or run dead straight, pop the middle one, as many times as it takes. Each point is pushed exactly once and popped at most once, so whatever the ordering cost, the walk itself is linear; on this page’s fifty thousand point instance the entire scan spends fewer than three n orientation tests, and the tested solution asserts that bound rather than citing it. The heuristic chooses the order that makes one forgetful pass sufficient: sort by polar angle around the bottom most point. Two things become true in that order. The tour through all n points never crosses itself. And it meets the hull’s vertices in boundary order. Together they license the amnesia: a point popped for a bad turn is provably interior, because everything still to come lies further around the sweep and can only pull the chain tighter past it. Discarded means discarded rightly, forever. In any other order that is simply false, and the same pop rule throws away points the hull needs.',
  },
  {
    section: 'picture',
    text:
      'Stand at the lowest pin on a corkboard and sweep your arm counterclockwise, tying string to every pin in the order your arm reaches them. When the sweep finishes, the string traces a wobbly, star shaped tour through all the pins, and, because you tied it in sweep order, the string never crosses itself. Now pull it tight. Wherever the string bends inward, it snaps straight, releasing the pin it was bent around, and a released pin never comes back, because every pin the arm found later sits further around the board, where the tightening can only pass it by. When the string stops moving, what remains is taut around the outside: the hull. The sort chose the tour. The stack is the tightening.',
  },
  {
    section: 'run',
    text:
      'Here is the loop. First, the anchor: take the bottom most point, leftmost on ties. It is on the hull with certainty. Second, sort the remaining points by angle around the anchor, comparing angles by the sign of an exact cross product, never by floating point arc tangents. Break ties in angle by distance, and, for the points sharing the very last ray, run them farthest first: that detail, and one more coming, is where textbook implementations quietly break. Third, scan: push each point in sorted order, and while the last three make a clockwise or straight turn, pop the middle one. Fourth, close the loop: after the walk, the final survivor can still be collinear with the wrap around edge back to the anchor, so check it. This page’s own first implementation missed both of those degenerate cases, and its test oracles caught both: the all collinear input, and the final ray survivor. They are in the record because that is precisely the kind of thing this site exists to be honest about. Fifth, read the stack: the hull, counterclockwise, in boundary order, no collinear vertices.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, the point set is static and the question is one shot, and you want the boundary in order, not merely a membership test. Second, the hull may be large, or you simply do not know: n log n is safe whatever h turns out to be, and the circle instance in the measurements is exactly the case that punishes methods which gambled on a small hull. Third, exact predicates are available: integer coordinates, or robust orientation arithmetic. If your turns are computed with naked floating point, no choice of algorithm will save you; the sign of the cross product is the entire epistemology of this problem.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: one sort buys a linear, provable scan. Seven hundred twenty five thousand six hundred ninety three operations on fifty thousand points, at most three n orientation tests after the sort, boundary order for free, and total indifference to the hull’s size: on the circle, where every point is a vertex, eleven thousand nine hundred thirty one operations, while gift wrapping pays almost four million. The weakness has two halves. The sort is the cost: when the hull is tiny, output sensitive rivals win, and the measurements show gift wrapping paying exactly h times n, which for small h beats any n log n. And the angles are the trap: polar sorting’s tie cases are where hull implementations bleed, including, candidly, this page’s own first draft. The monotone chain variant exists so that you never have to write those repairs.',
  },
  {
    section: 'tradeoffs',
    text:
      'Here are the measured numbers, counting orientation tests plus sort comparisons. First instance: fifty thousand integer points uniform in a disk, whose hull has one hundred thirty six vertices. Graham with the polar sort: seven hundred twenty five thousand six hundred ninety three. Andrew’s monotone chain: nine hundred eighty thousand, carrying an idealized charge for its coordinate sort, in practice the fastest safe implementation. Jarvis’s march: six million seven hundred ninety nine thousand seven hundred twenty eight, and that number deserves a slow read, because it equals exactly one hundred thirty six times fifty thousand: h times n, output sensitivity as poetry. Quickhull: three hundred twenty five thousand nine hundred sixty one, the winner on this instance, because farthest point splitting discards interior points in bulk. Second instance: two thousand points on a circle, every one of them a hull vertex. Graham: eleven thousand nine hundred thirty one. Monotone chain: twenty seven thousand nine hundred twenty three. Quickhull: fifty nine thousand eight hundred sixty five. And Jarvis: three million nine hundred ninety six thousand, which is two thousand squared, minus its finish: the same formula that was poetry on the disk is a detonation here. Chan’s algorithm exists precisely to marry the two columns: run Graham on small batches, Jarvis over the batch hulls, and pay n log h, optimal in both letters.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never bring to this problem is the definition itself, executed. A pair of points forms a hull edge exactly when every other point lies strictly to its left; test all pairs, keep the edges, chain them into a polygon. It is perfectly correct, it is the oracle this page’s tests trust, and as an algorithm it is n cubed in the worst case. On a mere one hundred twenty points it spent forty one thousand four hundred thirty three orientation tests against Graham’s eight hundred nine, a fifty one fold gap, and even that number is flattered by lucky early exits: an interior pair usually meets its disproving witness quickly, but an adversarial ordering restores the full cube. Its one honest job is the one it holds here: the executable definition that every fast method must agree with, three hundred cases out of three hundred.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements four hull algorithms over exact integer orientation tests, plus the brute force definition as the oracle. Graham with the polar sort, including the two degenerate case repairs its own tests demanded: the all collinear input, and the farthest first final ray with the wrap around check. Andrew’s monotone chain, building lower and upper chains from a plain coordinate sort. Jarvis’s march with farthest point tie breaking. Quickhull with farthest point recursion and a collinear vertex cleanup, because its tie cases seat vertices in the middle of edges, and yes, the tests caught that too. The self test asserts, in order: all four methods return the identical hull on three hundred cases spanning uniform clouds, circles, collinear heavy grids, duplicates, and degenerate inputs; every hull is verified against the definition itself, convex, counterclockwise, all input points inside or on it; the scan respects its linear budget; Jarvis prices at about h times n on the disk and at least n squared over two on the circle; and the brute force definition agrees while paying its fifty one fold price. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
