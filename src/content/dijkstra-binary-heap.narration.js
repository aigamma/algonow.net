// The spoken lesson for puzzle seven, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle seven: Dijkstra’s algorithm, paired with a binary heap priority queue, for shortest paths from a single source. Here is the puzzle. You are given a directed graph whose edges carry weights, and all of those weights are zero or greater. You are given one starting vertex. Your task is to return the shortest total distance from that start to every vertex you can reach. The constraint is the one assumption that matters: no edge may have a negative weight. That assumption is not a technicality. It is the thing that licenses the entire method, and if you drop it the algorithm does not run more slowly, it returns a wrong number and tells you nothing is amiss.',
  },
  {
    section: 'origins',
    text:
      'Edsger Dijkstra designed this in nineteen fifty six, in roughly twenty minutes, sitting at a cafe terrace in Amsterdam while out shopping with his fiancee. He said later that one of the reasons it turned out so simple was that he designed it without pencil and paper, which forced him to avoid anything avoidable. He published it three years later in a paper of about three pages. And here is the detail that makes this unit worth its time: the published version has no priority queue at all. Each round it scans every unsettled vertex to find the nearest one, which costs work proportional to the number of vertices squared. The heap came later. The algorithm did not change. Only the container did, and that is the entire difference between a classroom example and something that routes a continent.',
  },
  {
    section: 'pair',
    text:
      'The control structure owns the proof. Settle the nearest unsettled vertex, and its distance is final forever. Why? Because any other route to that vertex would have to pass through some vertex that is further away than it is, and since no edge can have a negative weight, no path can ever get shorter by continuing. Distance only accumulates. So the nearest unsettled vertex cannot be improved by anything you have not looked at yet. That single sentence is the algorithm. Everything else is bookkeeping. The heuristic, the guiding rule, answers exactly one question quickly: which unsettled vertex is nearest right now? A binary heap answers in time proportional to the logarithm of the number of vertices instead of scanning all of them, which drops the total from vertices squared down to edges times that logarithm. Notice what the heap does not do. It does not change a single distance. It never affects the answer. It only changes the price.',
  },
  {
    section: 'picture',
    text:
      'Picture pouring water into a physical model of a road network, at one town, with water flowing down every road at the same speed. The moment water arrives at a town, the route it arrived by is the shortest route to that town, and you need no argument to believe it, because the water tried every path simultaneously and this one got there first. Dijkstra’s method is that flood, performed one town at a time. And the priority queue is nothing more than the clipboard that tells you which town the water is about to reach next, so that you do not have to walk the entire map checking every town to find out.',
  },
  {
    section: 'run',
    text:
      'Here is the loop. First, seed it: distance zero at the source, distance unknown everywhere else, and push the source onto the heap. Second, pop the smallest key from the heap. If that vertex has already been settled, or the key you popped is stale because a better one was pushed later, throw it away and pop again. Third, settle the vertex. Its distance is now final and will never be revised, which is precisely the claim that non negative weights buy you. Fourth, relax each of its outgoing edges: if travelling through this vertex reaches a neighbour more cheaply than any route found so far, record the shorter distance and push that neighbour onto the heap under its new key. Fifth, repeat until the heap is empty. Any vertex that was never pushed was never reachable. One implementation note worth carrying: this version uses lazy deletion. Rather than reaching into the heap to decrease a key in place, it simply pushes the improved key and ignores the stale one when it surfaces. That is why the heap can hold more entries than there are vertices, and why the loop checks whether the popped key is out of date.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. Every edge weight is zero or greater, so a settled vertex can never be improved later. You want distances from one source to many destinations, rather than between one specific pair, which is what makes settling everything worthwhile. And the graph is sparse, meaning it has far fewer edges than the square of its vertex count, which is where the heap earns its keep. Road networks, dependency graphs, and social graphs are all sparse. The baseline is the nineteen fifty nine scan, and it is not a straw man: it genuinely wins on dense graphs.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength is that one proof supports many prices. The correctness argument does not mention the container at all, so the same twenty lines scale from a teaching example to a continental road network purely by swapping the queue, and the answer is provably identical at every size. That is a rare and valuable property. The weakness is that non negativity is load bearing. Take one edge negative and the settle once invariant collapses immediately. The algorithm does not slow down and it does not raise an error; it returns a wrong number with total confidence.',
  },
  {
    section: 'tradeoffs',
    text:
      'Here are the measured numbers, on one shared graph: nine hundred vertices arranged in a grid, three thousand four hundred eighty weighted edges, computing all distances from vertex zero. Work is counted in one unit for every method, queue operations plus edges examined, so the rows are actually comparable. Dijkstra with a binary heap did five thousand six hundred eighty seven units of work. Dijkstra with the original nineteen fifty nine linear scan produced the identical distances and did eight hundred fourteen thousand three hundred eighty units, which is one hundred forty three times as much. Bellman Ford also produced the identical distances, at seventeen thousand four hundred units, roughly three times the heap. And breadth first search finished in nine hundred units, cheapest on the board by a wide margin, and it was wrong, because it counts hops rather than weight.',
  },
  {
    section: 'tradeoffs',
    text:
      'Now the part that stops this from being a simple ranking. On a dense graph of two hundred fifty vertices, where nearly every pair is connected, the same comparison narrows to sixty three thousand four hundred ninety seven for the heap against one hundred twenty five thousand for the scan. The gap fell from one hundred forty three times to about two times, and once you count constant factors, a flat array with no heap machinery at all is genuinely competitive there and often faster in wall clock. That is the real lesson of this unit. The question is never whether a binary heap is good. The question is how many edges your graph actually has, because that number, not the algorithm, decides which container wins.',
  },
  {
    section: 'tradeoffs',
    text:
      'Two boundary cases are worth memorizing. Breadth first search is the cheapest method here and it is wrong, because it treats every edge as costing one. A queue is exactly a heap for a graph where every key is equal, so the moment weights differ, the queue is giving you the wrong ordering. And Bellman Ford costs three times more on this graph while returning the same answer, which makes it look pointless until the day an edge goes negative. On the trap instance in the tested solution, Dijkstra reports a distance of two where the true distance is minus four, and Bellman Ford gets it right. Building that trap took a correction worth repeating: a single negative edge is not enough to fool this implementation, because pushing improved keys rather than decreasing them in place lets a vertex recover if it has not been settled yet. To actually break it you need a vertex to be settled at a wrong value and then have a successor read that stale value. That is what the instance in the code does.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never bring to this problem is Floyd Warshall. It computes shortest paths between every pair of vertices, in time proportional to the number of vertices cubed. On our nine hundred vertex graph that is roughly seven hundred twenty nine million operations and a matrix of eight hundred ten thousand entries, to answer a question the heap answers in five thousand six hundred eighty seven units of work. That is on the order of one hundred twenty eight thousand times more work, in exchange for eight hundred ninety nine answers nobody asked for. It becomes the correct tool the moment you genuinely need all pairs on a dense graph, and not one moment before.',
  },
  {
    section: 'code',
    text:
      'The Python solution carries all four methods so the contest is reproducible rather than quoted. The heap version uses the heap q module, storing tuples of distance and vertex so ordering falls out of tuple comparison. A settled set plus a staleness check discards the duplicate entries lazy deletion creates. The scan version is the nineteen fifty nine formulation, kept honest rather than crippled. Bellman Ford relaxes every edge repeatedly and stops early when a full pass changes nothing. And breadth first search is there to be wrong in an instructive way. The self test checks five things: that the heap version agrees with both the scan and Bellman Ford across twelve random graphs, that every edge in the result satisfies the shortest path bound, that Dijkstra really is fooled by the negative edge instance while Bellman Ford is not, that breadth first search matches exactly when all weights are one, and finally that the published contest numbers come out in the order the page claims. If any published claim stopped being true, the file would fail rather than the page quietly lying.',
  },
];
