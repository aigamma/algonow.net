// The spoken lesson for puzzle one hundred forty two, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle one hundred forty two: betweenness centrality, paired with Brandes accumulation, for node importance. Here is the puzzle. A network: two hundred forty vertices and seven hundred twenty edges at the largest, and two dense communities joined by one edge at the most telling. For every vertex, compute the sum over all pairs of other vertices of the fraction of shortest paths between them that pass through it. The definition is cubic in the vertices if computed as written, and exponential if the paths are listed. The method: from each source, one breadth first search that counts the shortest paths to every vertex as it discovers them. The heuristic is the accumulation: walk the vertices back in reverse order of distance, and let each one pass its dependency to its predecessors, in proportion to the path counts. Every source costs one pass out and one pass back, and no path is ever listed. On this page the method is held against the definition computed independently, against four closed forms, against a walker that lists every path on a grid, and against degree centrality on a graph with a bridge.',
  },
  {
    section: 'origins',
    text:
      'Linton Freeman defined betweenness centrality in nineteen seventy seven, in Sociometry, formalizing an idea from Bavelas and Anthonisse: the vertices that sit between others control what flows between them. For twenty four years it was computed from the definition, cubic in the vertices and unusable past a few thousand, until Ulrik Brandes noticed in two thousand one that the dependencies of one source on all targets could be accumulated in a single pass back over the breadth first search tree: linear in the edges per source for unweighted graphs, with a logarithm for weighted ones. Girvan and Newman built community detection on the edge version in two thousand two: remove the highest betweenness edge, and repeat. Bader and colleagues in two thousand seven, and Riondato and Kornaropoulos in twenty sixteen, gave sampling approximations for graphs with millions of vertices. Every network library computes betweenness Brandes’s way.',
  },
  {
    section: 'pair',
    text:
      'The algorithm owns the path counting. A breadth first search from the source records, for every vertex, its distance and the number of shortest paths that reach it, which is the sum of the counts of its predecessors, so that counts multiply along the search tree instead of being enumerated. Measured: on the ten by ten grid, the corner to corner count is forty eight thousand six hundred twenty, eighteen choose nine. A recursive walker listed every one of those paths to check it, and one search produced the number in three hundred sixty edge visits. Against the definition, which needs all pairs distances and a triple test for every source, vertex, and target, Brandes agrees to nine parts in a hundred trillion on random graphs and exactly on the closed forms: a path, where vertex i sits on i times n minus one minus i pairs; a star; a complete graph, where every value is zero; and a cycle. The heuristic supplies the accumulation. Instead of asking, for each target, which vertices lie on the shortest paths to it, walk the vertices back in decreasing distance and let each hand its dependency to its predecessors: the predecessor’s count over the vertex’s count, times one plus the vertex’s own dependency. The sum over targets is never formed; it falls out of the recurrence. Counted against the definition’s triple test: twenty eight thousand versus one hundred six thousand operations at sixty vertices, one hundred thirteen thousand versus eight hundred fifty seven thousand at one hundred twenty, and four hundred fifty six thousand versus six point nine million at two hundred forty, the ratio doubling with n because one side is linear in the edges per source and the other cubic. And the measure it computes is the one degree cannot see. On two communities joined by one edge, the bridge endpoints have ten point seven times the betweenness of any other vertex, while degree centrality puts them third behind the two hubs.',
  },
  {
    section: 'picture',
    text:
      'Counting how much of a city’s traffic passes through each intersection, if every driver takes a shortest route. The naive count follows every driver from every origin to every destination, one route at a time, and there are routes enough to outlast the city. Brandes’s clerk instead stands at one origin, floods outward marking each intersection with its distance and the number of shortest routes that reach it, a number, not a list, and then works backward from the farthest intersections. Each one reports how much traffic it and everything beyond it owe to each of the intersections that feed it, in proportion to the route counts. One flood out and one report back per origin, and every intersection has its share of every route from that origin without a single route having been walked.',
  },
  {
    section: 'run',
    text:
      'Here is the run. Breadth first search from the source: distances, path counts, and predecessor lists, with the vertices pushed onto a stack in discovery order. The counts multiply: each vertex’s count is the sum over its predecessors. Accumulate: pop the vertices off the stack, farthest first, and for each predecessor add the predecessor’s count over the vertex’s count, times one plus the vertex’s dependency. Add each vertex’s dependency to its betweenness, repeat for every source, and halve the totals for an undirected graph. On this page: five random graphs of forty vertices, agreement with the definition to nine parts in a hundred trillion. Four closed forms, exact. Three random graphs of sixty, one hundred twenty, and two hundred forty vertices, with the definition costing three point eight, seven point six, and fifteen times more. The grid: forty eight thousand six hundred twenty paths, listed and counted. The bridge: first by betweenness, third by degree.',
  },
  {
    section: 'signals',
    text:
      'The signals that this pair fits. First: brokers, bridges, and bottlenecks. When the question is who or what the flow depends on, as opposed to who has the most connections. Second: exact scores on a graph you can search from every vertex. Linear in the edges per source is a few million edge visits at two hundred forty vertices and hours at a few million. Third: community structure to expose. The Girvan and Newman recipe removes the highest betweenness edges first, and the communities fall apart along them.',
  },
  {
    section: 'tradeoffs',
    text:
      'Now the rivals. Degree centrality: instant, local, and right when importance means popularity; the two hubs rank first. It is blind to position: the bridge endpoints, with ten point seven times the betweenness of anyone, rank third. Reach for it for popularity or load, or as the first cut on a huge graph. Closeness centrality: who can reach everyone fastest, the inverse mean distance, from the same searches without the accumulation. Reach is not control: a well connected hub scores high without sitting on anyone’s path. Reach for it for spreading speed, response time, or facility placement. And PageRank: importance by random walks rather than shortest paths, scaling to billions of edges by iteration. It has a damping parameter, a model of flow that wanders rather than routes, and no notion of a bridge; reach for it on web scale graphs and flows that follow links rather than routes.',
  },
  {
    section: 'tradeoffs',
    text:
      'The honest weaknesses of the hero. Linear in the edges per source is still a search from every vertex: a million vertex social graph is a million breadth first searches, and sampling a few hundred sources for an approximation with error bars is what production systems do. Betweenness assumes flow takes shortest paths only, which packets, rumors, and diseases do not. And it is fragile to one added edge, since a new shortcut reroutes every path it lies on and every score along the old route.',
  },
  {
    section: 'tradeoffs',
    text:
      'And the negative example: enumerating the shortest paths. The definition invites it: for each pair, list the shortest paths and tally who is on them. Measured on a ten by ten grid, one pair of opposite corners has forty eight thousand six hundred twenty shortest paths, every one of them walked by the recursive enumerator to check the count. A twenty by twenty grid has thirty five billion for one pair, and the number of pairs is quadratic on top. One breadth first search produced the same forty eight thousand in three hundred sixty edge visits, because the count multiplies along the tree instead of growing with it. Betweenness is about how many paths, never about which.',
  },
  {
    section: 'code',
    text:
      'The code on this page is the algorithm, the definition, and the graphs. Brandes’s algorithm with an operation counter. The definition by all pairs breadth first searches and the triple test, with its own counter. A random connected graph generator. A recursive walker that enumerates the monotone paths across a grid. And a two community graph with hubs and one bridge. The self test asserts: Brandes within one part in a billion of the definition on five random graphs; the path, star, complete graph, and cycle closed forms exact; the definition to Brandes ratio growing between one point six and two and a half times per doubling of n; the grid enumeration equal to eighteen choose nine and to the count from one search; and the bridge endpoints first by betweenness with the hubs first by degree. When it prints O K, the measure behind every network diagram of brokers and bottlenecks has been held to its definition and its cost has been counted. The file would fail before it would lie to you.',
  },
];
