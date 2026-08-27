// The spoken lesson for puzzle fifty, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle fifty: Floyd Warshall, paired with the intermediate vertex sweep, for all pairs shortest paths. Here is the puzzle. A directed, weighted graph, negative edges allowed. Compute the shortest path between every pair of vertices, detect any negative cycle, and do it in three lines of loop. The constraint is that the three lines carry a landmine: the k loop must be outermost. Swap it inward, the most famous loop order bug in algorithms, and it computed wrong distances on fifty two of sixty random graphs on this page. And, measured stranger still: running the wrong loop three times over heals it, sixty out of sixty. Both halves of that sentence are results on this page, not folklore.',
  },
  {
    section: 'origins',
    text:
      'Three discoveries in about one year. Bernard Roy, nineteen fifty nine, for transitive closure. Stephen Warshall, nineteen sixty two, also for closure. Robert Floyd, the same year, for shortest paths, building explicitly on Warshall’s theorem: which is why the French literature says Roy Floyd Warshall and everyone else says Floyd Warshall. The deeper frame arrived later: the triple loop is matrix multiplication over the min plus semiring, and swapping the algebra swaps the product: shortest paths under min and plus, transitive closure under or and and, widest bottleneck paths under max and min, even regular expression conversion. One loop, many algebras: and this page runs two of them, refereeing the closure reading against breadth first search.',
  },
  {
    section: 'pair',
    text:
      'The control structure owns an unusual dynamic programming dimension: not path length, not edge count, but WHICH vertices are permitted to serve as intermediate stops. After the sweep has processed vertex k, the distance matrix is exact over all paths whose interior stops are drawn from zero through k. That single invariant is the entire correctness proof, and it is why three lines suffice. Negative edges cost nothing extra: two hundred trials refereed by per source Bellman Ford. And a negative cycle announces itself on the diagonal: a vertex whose distance to itself has gone negative: planted here, detected here. The heuristic supplies the sweep: admit the intermediates one at a time, and for each newcomer k, relax every pair through it, in place, with k on the outermost loop. The discipline is everything. Put k innermost and pairs get quoted before later hubs have opened, and never re quoted: wrong on fifty two of sixty. The redemption is the strange part: the wrong loop, run three times, converges to the right answer anyway: relaxation wearing a bug costume: confirmed on all sixty.',
  },
  {
    section: 'picture',
    text:
      'Picture a freight network opening hubs one at a time. Before any hub opens, the tariff book lists only direct routes. Hub zero opens: every city pair that improves by routing through it gets a new quote. Hub one opens: the routes it improves may already route through hub zero: the gains compound, automatically, because the book is updated in place. When the last hub has opened, every tariff in the book is optimal over every possible sequence of layovers. The bug is opening hubs per route instead of per network: quote the route from A to B once, early, while most hubs are still closed, and never revisit it. Fifty two books out of sixty carried stale tariffs. And the odd redemption: reprint the whole book three times and the staleness washes out.',
  },
  {
    section: 'run',
    text:
      'Here is the loop. Initialize the matrix: zero on the diagonal, edge weights where edges exist, infinity elsewhere; and a successor matrix pointing along each direct edge, for reconstruction. Then, for k from zero to n minus one, outermost: for every pair i j, ask one question: is the path through k, dist i k plus dist k j, better than what the book says? If yes, update in place, and record the turn: successor of i j becomes successor of i k. When the sweep ends, read the diagonal: any negative entry names a vertex on a negative cycle. Reconstruct any route by following successors: this page rebuilt over two hundred routes and re priced each one edge by edge against its matrix entry. And for other questions, swap the algebra and keep the loop: or and and give reachability, checked here against breadth first search.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, you genuinely need all pairs: a full distance matrix for routing tables, betweenness centrality preprocessing, the travel table of a game map: not one source queried repeatedly. Second, the graph is dense, or n is small: cubic with a tiny constant and perfect memory locality is unbeatable simplicity below roughly a thousand vertices. Third, negative edges, or a different algebra entirely: closure, widest path, minimum cost with negatives: the semiring family reuses the identical three lines, and nothing else in the toolbox is so generic for so little code.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: three lines, negative proof, algebra generic, and self diagnosing. Two hundred refereed trials with negative edges. Cycles surfacing on the diagonal for free. The closure reading matching breadth first search. Two hundred reconstructed paths re priced exactly. The weakness: n cubed no matter what, and the landmine in the loop order. The sweep spent four point four million operations on a graph with eight hundred edges: sparsity is invisible to it, and Johnson’s algorithm did the same job in three hundred fifty five thousand: twelve times less. At ten thousand vertices the cube is ten to the twelfth: hours: at a road network’s hundred thousand, ten to the fifteenth: never. And one honest clock note, kept because the measurement said so: in this pure Python stand, Johnson’s C speed heap edged even the dense race, point two one seconds to point four zero. The sweep’s dense virtue lives in compiled constants and in simplicity: not in every stopwatch.',
  },
  {
    section: 'tradeoffs',
    text:
      'Here are the measured numbers, at two hundred vertices on two terrains, with Johnson agreeing with the sweep exactly on both. Dense, nineteen thousand nine hundred edges: the sweep, seven point nine six million operations in point four zero seconds; Johnson, eight million operations in point two one. Near parity in operations: the dense terrain is where the cube is honest work. Sparse, eight hundred edges: the sweep, four point four million operations, barely fewer than dense, because the cube does not read the edge count; Johnson, three hundred fifty four thousand six hundred sixty: twelve times fewer, in a fiftieth of a second. And the bug ledger: k innermost wrong on fifty two of sixty graphs; the same wrong loop repeated three times, correct on all sixty. The pattern to keep: the sweep is a metronome: the same bill on every terrain: which is its reliability and its waste in a single number.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is the sweep past a few thousand vertices, and the arithmetic is short. The cube is a promise in both directions: at two hundred vertices, eight million operations, well under a second: at ten thousand, a trillion: at a hundred thousand, ten to the fifteenth, which is never, while the actual edges, often just a few hundred thousand of them, sit unread. This page measured the miniature version: four point four million operations spent on eight hundred edges, twelve times what Johnson needed. The elegance of three lines is real, and the cubic bill is realer. Past the crossover, sparsity is money lying on the table, and Johnson’s algorithm, one Bellman Ford to buy nonnegative weights, then n Dijkstras, exists precisely to pick it up.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements the sweep with successor tracking and an operation counter, the k innermost wrong variant with a pass count, per source Bellman Ford as the referee, Dijkstra and Johnson’s reweighting for the terrain contest, and the potential construction that plants negative edges without negative cycles. The self test asserts, in order: two hundred trials where the sweep equals per source Bellman Ford, negative edges included. Reachability equal to breadth first search: the closure reading. Over two hundred reconstructed paths re priced edge by edge to their matrix entries, with no path longer than n. The loop order bug wrong on a majority of graphs, and its three pass healing on every single one. Planted negative cycles surfacing as a negative diagonal, and clean graphs keeping the diagonal at zero. And Johnson agreeing with the sweep exactly on both two hundred vertex terrains. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
