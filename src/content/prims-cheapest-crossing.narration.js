// The spoken lesson for puzzle seventy seven, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle seventy seven: Prim’s algorithm, paired with the cheapest crossing edge, for minimum spanning trees. Here is the puzzle. Sites must be wired into one connected network: vertices, weighted edges, and the total cost of wire as the only objective. Grow the answer as a single tree, from a seed, one edge at a time: and let every greedy purchase carry a license that can be audited, not merely cited. The referees on this page: the live Kruskal unit’s machinery, rebuilt, agreeing on three hundred graphs: exhaustive enumeration of every spanning tree on fifty small ones: and the cut property itself, checked as a running assertion: every edge of every finished tree removed in turn, its cut recovered, and the edge verified no heavier than anything crossing.',
  },
  {
    section: 'origins',
    text:
      'Named for Robert Prim of Bell Labs, nineteen fifty seven: wiring terminals with the least copper: with Dijkstra publishing the same procedure independently two years later. The true origin is earlier and quieter: Vojtěch Jarník, nineteen thirty, in a Czech journal, answering Otakar Borůvka’s problem of electrifying rural Moravia. The algorithm predates its own name by twenty seven years: this site’s recurring pattern, after Jacobi’s century on the Hungarian method and Waterman’s decades on the reservoir. The minimum spanning tree trio: Borůvka nineteen twenty six, Jarník nineteen thirty, Kruskal nineteen fifty six: is the oldest complete shelf in combinatorial optimization, and tonight it becomes complete on this site as well.',
  },
  {
    section: 'pair',
    text:
      'The algorithm owns single tree growth. Start at a seed. Keep every edge that leaves the tree in a heap: the frontier: with lazy deletion: pop the cheapest, discard it if both ends are already inside, absorb the new vertex otherwise, and push its edges. One tree the whole way: no forest, no union find: the frontier is the entire state. Measured: ten thousand two hundred fifty seven heap operations on the dense graph, where the rival’s global sort bills one hundred fifty nine thousand comparisons. The heuristic supplies the purchase rule: always the cheapest edge crossing from tree to rest: licensed by the cut property: for any cut, the lightest crossing edge belongs to some minimum spanning tree: swap it into any tree that lacks it, a cycle forms, another crossing edge leaves, and the total never rises. This page audits that license on every edge of every tree it builds.',
  },
  {
    section: 'picture',
    text:
      'Picture an island electrifying itself from one power station. At every moment there is a lit region and a dark region, and exactly one economic question: of all the wires that could cross from light into dark, which is cheapest? Buy it. One more village lights up. Ask again. The cut property is the reason no planning committee is needed: whatever the future holds, the cheapest crossing wire is never a mistake, because any completed plan that omitted it could be improved by swapping it in. And notice the trap living one desk over: ask instead which village is cheapest to reach from the station: accumulated distance: and you are building commuter routes, not cheap wiring. Same loop, same heap, different question: measured on this page at eight point two times the copper.',
  },
  {
    section: 'run',
    text:
      'Here is the run. Seed: any vertex: a lit region of one. Offer: push every edge leaving the lit region into the heap, keyed by its own weight. Absorb: pop the cheapest offer; if both endpoints are already lit, discard it: lazy deletion: otherwise buy the edge, light the vertex, and push its edges in turn. Repeat until n minus one purchases. And mind the keystroke, because it is the deepest hazard in the unit: the key is w, the edge’s own weight: never d plus w, the accumulated distance. The second spelling is Dijkstra: a correct algorithm for a different question: and it will hand you a connected, plausible, reviewable spanning tree that costs, on this page’s hub gadget, four hundred where the minimum is forty nine.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, one component at minimum total cost: cabling, pipelines, hierarchical clustering’s merge order: connectivity is the requirement and the sum of wire is the bill. Second, the graph is dense and lives in adjacency form: the frontier heap touches only edges it actually meets: ten thousand operations against the global sort’s one hundred fifty nine thousand on the dense instance. Third, the tree should grow from somewhere: a data center, a root site, a seed of civilization: Prim’s shape is growth from a designated origin, where Kruskal’s forest condenses everywhere at once and has no center at all.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: the license audited, the referees stacked. Weight equal to Kruskal on three hundred graphs. Equal to brute enumeration of every spanning tree on fifty. Identical edge sets: not just weights: under distinct weights, exercising the unique tree theorem on a hundred more. The cut property verified for every tree edge everywhere: the exchange argument as a running assertion rather than a lecture. And the cabling client ordered cleanly: the tree at nine point three two, the nearest neighbor chain at eleven point nine seven, the best hub star at seventy six point six five. The weakness: needs adjacency, sits still, and lives one keystroke from a different algorithm. An edge stream with no adjacency favors the sort. A changing graph wants dynamic tree machinery. And the honest asterisk on the meter: the abstract operation counts favor Prim on both instances, but Python’s C speed sort makes Kruskal effectively free at these sizes in wall clock: the model and the stopwatch disagree, and the page says which is which: the Toom unit’s lesson, wearing graphs.',
  },
  {
    section: 'tradeoffs',
    text:
      'The rivals, honestly placed. Kruskal, live on this site: sort every edge once, sweep with union find: the simplest correctness proof on the shelf, the natural choice for edge lists and sparse graphs, and the page’s referee. Borůvka, the nineteen twenty six original: every component grabs its cheapest outgoing edge simultaneously, rounds halving the component count: sequentially it buys nothing over its two children, but it is the parallel and distributed MST, and the engine inside the fancy near linear hybrids. And Dijkstra, live, one keystroke away: keyed by accumulated distance, it answers the other question perfectly: cheapest routes from the root: and answers this one at eight point two times the price. Three siblings and a doppelganger: knowing which question you are asking is the entire skill.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is Dijkstra keys in a Prim loop, and it is the most instructive bug in graph algorithms. The two procedures share everything: the heap, the frontier, the visited set, the loop structure: except one expression. Prim keys an edge by its own weight. Dijkstra keys by the distance accumulated from the root. Type the second into the first’s loop and nothing crashes. A spanning tree still emerges: connected, plausible, and it passes code review, because the code is correct: for the other problem. On the hub gadget: forty villages, spokes costing ten, a ring costing one: the minimum tree buys one spoke and the ring: forty nine. The shortest path tree buys nearly every spoke: four hundred: because every village wants its own fast line to the station. Both trees are right answers to different questions: total copper versus travel time. The defense is not carefulness: it is the audit this page runs: check any tree edge against its cut, and the impostor fails on the first ring edge it skipped.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements Prim with the lazy heap and an operation counter, Kruskal with union find as the referee, the Dijkstra variant for the confusion gadget, the cut auditor that recomputes components with each tree edge removed, and the brute force enumerator over all spanning trees. The self test asserts, in order: weight equality with Kruskal on three hundred graphs, with the cut property audited on every tree edge of every one. Equality with full enumeration on fifty small graphs. Identical edge sets under distinct weights on one hundred. The dense and sparse meters. The hub gadget: the tree at exactly forty nine, the shortest path tree near four hundred. And the plane cabling client, ordered tree, chain, star. One build note in the honest tradition: the graph generator’s uncapped edge request spun forever when small n drew m beyond the complete graph: caught after eleven minutes of silence, capped at n choose two, and the lesson recorded here. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
