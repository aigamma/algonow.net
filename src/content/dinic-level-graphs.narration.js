// The spoken lesson for puzzle fifteen, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle fifteen: Dinic’s algorithm, paired with level graph blocking flows, for maximum flow. Here is the puzzle. You are given a directed network whose edges carry capacities, a source, and a sink. Your task is to route as much flow from source to sink as the pipes allow, and to report the flow on every single edge. The constraints are conservation, everything entering an interior vertex leaves it, and capacity, no edge above its limit. And there is one more demand that gives the problem its character: the answer must carry a certificate. A cut whose capacity equals your flow proves no better flow exists, so optimality becomes something you check, not something you trust.',
  },
  {
    section: 'origins',
    text:
      'Moscow, nineteen sixty nine. Yefim Dinitz is a student in Georgy Adelson Velsky’s algorithms seminar, the same Adelson Velsky of the A V L tree. The homework asks about Ford and Fulkerson’s augmenting path method, and Dinitz answers it with the phase idea: layer the network by distance, saturate a whole layer cake at a time. He publishes it in nineteen seventy, in about two pages. Then comes the twist. Western researchers could not fully read the Russian paper. Shimon Even and Alon Itai reconstructed the algorithm in nineteen seventy five from a partial understanding, and their reconstruction, breadth first levels plus a depth first search with the current arc trick, is what every textbook on earth now teaches as Dinic’s algorithm, including the spelling of the name. Dinitz’s own two thousand six retrospective tells the story cheerfully: the algorithm the world learned is a translation error that happened to be excellent.',
  },
  {
    section: 'pair',
    text:
      'The control structure owns the phase machine. Each phase does three things. First, a breadth first search from the source labels every vertex with its distance in the residual graph, the graph of remaining capacities. Second, the search keeps only the edges that step exactly one level down, from distance d to distance d plus one; that restricted graph is the level graph. Third, a depth first search pushes a blocking flow through it: a flow with the property that every level respecting path from source to sink now contains at least one saturated edge. Add the blocking flow to the running total, rebuild the levels, and repeat until the sink gets no label at all. The heuristic is the restriction itself: only shortest paths are allowed to exist. That buys the two guarantees the original method lacks. The zigzag augmentations that shuttle one unit back and forth cannot happen, because a zigzag is never level respecting; the pathological edge is simply not in the graph the search sees. And progress is forced: once the level graph is blocked, every shortest path is saturated, so the distance from source to sink strictly rises with every phase. Distances cannot exceed the number of vertices, so the phase count is bounded before the first edge is ever examined.',
  },
  {
    section: 'picture',
    text:
      'Picture flooding a building, floor by floor, from a pump toward a drain. Before pouring, you survey: how many doors is each room from the pump? That survey is the level graph, and you allow water only through doors that lead strictly one floor closer to the drain. Then you pour until every surveyed route is choked somewhere: that is the blocking flow. Survey again. Here is the beautiful part: the drain is now strictly further away than before, always, without exception. So the surveys never repeat a distance, and after at most one survey per room, the building holds all the water it ever will. The zigzag corridors that trap a naive plumber, pushing a bucket forward here and backward there forever, were never on any survey to begin with.',
  },
  {
    section: 'run',
    text:
      'Here is the loop. First, survey: breadth first search from the source across every edge with remaining capacity, recording each vertex’s distance. If the sink receives no distance, stop: the flow is maximum, and the set of vertices you could still reach forms one side of a minimum cut, your certificate, for free. Second, restrict: keep only the edges that go from some level d to level d plus one. Third, block: depth first search from the source inside the level graph, and every time the sink is reached, push the bottleneck along the path. The current arc pointer is the one subtle line: when an edge fails to lead anywhere useful, the pointer moves past it and never looks at it again this phase, which is what keeps a phase near linear instead of quadratic. Fourth, account: pushed flow lowers an edge’s remaining capacity and raises its partner’s, so a later phase can undo an earlier routing decision that turned out greedy. Fifth, repeat. Each phase strictly raises the source to sink distance, so there are at most as many phases as vertices. On this page’s big instance, there were two.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, the network is sparse and capacities are bounded, where the phase structure runs far below its worst case. Second, capacities are unit or nearly so: on unit networks the phase count drops to about the square root of the edge count, which is why bipartite matching belongs to this method; Hopcroft Karp is exactly Dinic specialized to matching, a specialization, not a separate idea. Third, you need the certificate: when the last survey fails to reach the sink, the reachable set hands you the minimum cut with no further work, and max flow equals min cut stops being a slogan and becomes a checkable receipt.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: guaranteed phases at practical speed. At most V phases on any input, measured at two on the layered network below; near E times root V on unit capacities; the certificate free at the end; and the entire method in about sixty lines, one of which, the current arc pointer, carries all the subtlety. Forget that pointer and the method stays correct while its phases quietly go quadratic, which is the classic implementation wound. The weakness: the worst case is real, dense adversarial networks can push toward V squared E, and on hard dense instances the push relabel family, once armed with its own heuristics, is the practical champion. Note the phrasing: its own heuristics. That family is another algorithm times heuristic pairing, and the measurements next make the point sharply.',
  },
  {
    section: 'tradeoffs',
    text:
      'Here are the measured numbers, counting edge examinations so every method pays in the same currency. First instance: a layered network of one thousand two hundred two vertices and four thousand five hundred edges, maximum flow three thousand five hundred eighty three. Dinic: fifty thousand six hundred eight examinations, in exactly two phases. Edmonds Karp, which is Ford Fulkerson disciplined to one shortest path per breadth first search: six million six hundred sixty one thousand three hundred ninety eight examinations across eight hundred twenty three augmentations, one hundred thirty one times more, because it rediscovers from scratch the same level structure Dinic reuses for an entire phase. Ford Fulkerson with plain depth first paths: about nine million. And push relabel, run naked as plain FIFO with no gap or global relabeling: eighteen million four hundred seventy six thousand, three hundred sixty five times Dinic. That last number is not an indictment of push relabel; it is a measurement of how much of push relabel’s fame belongs to its heuristics. Second instance: Zwick’s diamond, four vertices, two wide paths, one cross edge of capacity one, and C set to two hundred fifty thousand. The adversarial path order, which the original method’s spec fully permits, spends one and a half million operations shuttling one unit at a time through the cross edge. Edmonds Karp finishes in twelve operations. Dinic in twenty, one phase. The cross edge connects two vertices on the same level, so for the level graph it does not exist.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never bring to this problem, stated carefully, is Ford Fulkerson with arbitrary path choice on capacities you do not control. Not because the idea is wrong: every method on this bench, including Dinic, is Ford Fulkerson’s idea plus a discipline. But unconstrained path choice hands the adversary the wheel. On the diamond it costs half a million augmentations for a flow two augmentations deliver. And with irrational capacities, Uri Zwick exhibited tiny networks, six vertices, on which the procedure never terminates at all, and converges to the wrong value while failing. Correct at every step, wrong forever in the limit. The whole later history of maximum flow, shortest paths, levels, preflows, is the story of removing exactly that freedom.',
  },
  {
    section: 'code',
    text:
      'The Python solution builds one shared residual network representation, edge and partner edge in a paired array, and runs four methods over it with a common examination counter. Dinic is the breadth first survey, the level restricted depth first blocking flow, and the current arc pointer. Edmonds Karp is one breadth first search per augmentation. Ford Fulkerson uses plain depth first paths, plus a separate adversarial driver that exercises the documented worst path order on the diamond. Push relabel maintains heights and excesses and pushes locally, deliberately without its gap and global relabeling companions, to price them by their absence. The self test asserts, in order: all four methods agree on two hundred random networks and both big instances; every flow satisfies capacity and conservation exactly, edge by edge and vertex by vertex; every Dinic run’s residual reachable set defines a cut whose capacity equals the flow, which is max flow equals min cut serving as a unit test; the trap costs the adversarial order exactly two C augmentations while Edmonds Karp needs two and Dinic one phase; the push relabel height bound holds throughout; and the published contest numbers regenerate with their orderings asserted. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
