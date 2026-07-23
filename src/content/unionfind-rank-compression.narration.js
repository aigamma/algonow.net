// The spoken lesson for puzzle eight, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle eight: union find, paired with union by rank and path compression, for connectivity that only ever grows. Here is the puzzle. You are given a universe of elements, each starting alone in its own set, and a stream of two kinds of operations arriving mixed together. A union operation merges the two sets that hold a given pair of elements. A connected query asks whether two elements currently sit in the same set. Your task is to answer every query correctly, online, while the merges keep coming. The constraint is the shape of the problem: sets only merge. Nothing ever splits, no union is ever taken back, and that one way street is exactly what the structure is built to exploit.',
  },
  {
    section: 'origins',
    text:
      'Bernard Galler and Michael Fischer published the parent pointer forest in nineteen sixty four, in Communications of the A C M. Their problem was wonderfully unglamorous: Fortran compilers had to work out which variables the equivalence statement had glued together into one storage location. The balancing rule and the path shortening trick circulated through the sixties as compiler folklore, improvements everyone used and nobody analyzed. Then in nineteen seventy five Robert Tarjan proved one of the strangest results in the field: with both heuristics in place, the amortized cost of each operation is the inverse of the Ackermann function. That function grows so slowly that its value is three at fifteen hundred elements, and still at most four for any input that fits in the physical universe. In nineteen eighty nine, Fredman and Saks proved the matching lower bound. No data structure can beat it. This corner of computer science is finished, and this pairing is the winner.',
  },
  {
    section: 'pair',
    text:
      'The control structure owns the representation. Every element carries a single parent pointer. Follow the pointers upward and you arrive at a node that points to itself: the root, which serves as the name of the whole set. Two elements are connected exactly when their roots coincide, and merging two sets costs one pointer write, hanging one root under the other. That alone is already correct. The only open question is how long the walks to the root become, and that is everything, because the walks are the entire cost. The heuristics control the shape of the forest. Union by rank hangs the shallower tree under the deeper one, which caps the height at the logarithm of the set size. Path compression rewires every node a find walks past so that it points directly at the root, meaning each query flattens the exact trail it just used. Either trick alone gives logarithmic cost. Together they give amortized inverse Ackermann, which in practice reads as constant. And notice: neither heuristic ever changes an answer. They only change the price.',
  },
  {
    section: 'picture',
    text:
      'Picture clubs, each with a president. Every member knows one person more senior than themselves. Ask your senior, they ask theirs, and the chain ends at the president, whose name is how the club is known. To check whether two people belong to the same club, climb both chains and see whether you reach the same president. When two clubs merge, the president of the smaller club simply starts reporting to the president of the larger one. One introduction, and the merge is done. Path compression is what any sensible member does after climbing the chain once: write down who the president actually is, and from then on ask them directly. The org chart flattens itself through use. The busier the club, the flatter it gets.',
  },
  {
    section: 'run',
    text:
      'Here is the loop. First, the start: every element is its own parent, its own root, rank zero. Second, find: follow parent pointers until a node points at itself. That node is the root, the name of the set. Third, compress: walk the same path a second time, and point every node on it directly at the root. The next find along this trail costs a single hop. Fourth, union: find both roots. If they differ, hang the root of lower rank under the root of higher rank. On a tie, pick either, and the winner’s rank rises by one. Fifth, query: two finds and one comparison. Notice the quiet consequence: answering questions makes the structure faster, because every query flattens the path it walked.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, merges and membership questions arrive interleaved, and you must answer as you go, not at the end after all the edges are known. Second, connectivity is monotone: things join and never separate, with no deletions and no undo. Third, the stream is long, so near constant amortized cost per operation is the difference between instant and infeasible. Kruskal’s minimum spanning tree is the textbook customer: sort the edges, and union find decides in effectively constant time whether each edge joins two components or closes a cycle. Percolation studies, connected component labeling in images, and type unification in compilers all fit the same shape.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength is that the cost is effectively constant, and provably so. Amortized inverse Ackermann per operation: three hops at fifteen hundred elements, at most four at the scale of the universe, and Fredman and Saks showed nothing can do better. The weakness is what the structure refuses to know. It answers together or not yet, and nothing else. It cannot split, cannot undo, and cannot tell you the route between two connected elements, only that one exists. The moment edges can be deleted you need entirely different machinery, link cut trees or Euler tour trees, at logarithmic cost per operation. And the guarantee is amortized, not per operation: a single early find can still be slow; it is the average over the stream that is nearly free.',
  },
  {
    section: 'tradeoffs',
    text:
      'Here are the measured numbers, on one shared workload: fifteen hundred elements, fifteen hundred random unions, each union followed by two connectivity queries, and work counted in array touches for every method, so the rows are actually comparable. Union find with rank and compression did twenty five thousand eight hundred twenty five touches. Quick union, the same forest with no balancing at all, did one hundred eighty nine thousand two hundred four, about seven times more. Breadth first search run fresh on every query did one and a half million touches, fifty eight times more. And quick find, which stores each element’s set id directly and relabels the whole array on every effective union, did just over two million touches, seventy nine times the pairing, the worst row on the board. All four produced identical answers to all three thousand queries. The spread from best to worst is seventy nine to one, for the same information.',
  },
  {
    section: 'tradeoffs',
    text:
      'Now the boundary cases that make the ranking honest. Quick union’s seven times looks tolerable, but that number depends entirely on merge order being random. Chain the unions in sorted order, element one with two, two with three, and so on down the line, and the forest degrades into a single long path. After those fifteen hundred chained unions, one find on the deep end walks one thousand five hundred parent pointers. The pairing answers the same find in one touch. That is not a slowdown; it is a different complexity class, and sorted or nearly sorted merge orders are common in practice. Quick find inverts the trade: its queries genuinely are unbeatable, two array reads, and if your workload were almost all queries with a handful of unions on a small universe, it would be the right choice. And breadth first search is the only method here that can hand back the actual path, not just yes or no. If you need the route, none of the forests can help you.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never bring to this problem is a transitive closure matrix maintained after every union. Keeping an n by n reachability table current means touching up to two and a quarter million cells after each of the fifteen hundred merges: roughly three point four billion touches by straightforward arithmetic, against the forest’s measured twenty five thousand, on the order of one hundred thirty thousand times more work, plus memory that grows with the square of the universe while the forest carries one integer per element. Closure matrices earn their keep answering reachability in directed graphs, where union find cannot go at all. For undirected, merge only connectivity, they are a freight train hired to deliver a postcard.',
  },
  {
    section: 'code',
    text:
      'The Python solution carries all four methods so the contest is reproducible rather than quoted. The pairing uses a two pass find: one pass up to locate the root, a second pass to point everything on the trail straight at it, with union by rank deciding which root hangs under which. Quick union is the same forest with the heuristics deleted. Quick find keeps a flat id array and relabels it eagerly. And the search method rebuilds its answer from the edge list on every query. The self test checks five things. All four methods agree on every query across twelve random workloads. The final partition matches components computed independently by graph traversal. The sorted chain really does cost naive linking one thousand five hundred touches for a single find while rank and compression pays one. No find under rank ever exceeds the logarithmic height bound. And the published contest numbers hold in the order the page claims, asserted before they are printed, so if any number drifted the file would fail rather than the page quietly lying.',
  },
];
