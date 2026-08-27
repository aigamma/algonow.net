// The spoken lesson for puzzle twenty-three, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle twenty three: Kruskal’s algorithm, paired with the union find cycle test, for minimum spanning trees. Here is the puzzle. You are given a weighted graph: vertices, edges, and a cost on every edge. Your task is to choose edges of minimum total weight that connect everything: the minimum spanning tree, exactly optimal, with a certificate a skeptic can check. And here is the constraint that names the real cost. One question will be asked once for every single edge: are these two endpoints already connected? Answer it well and it is nearly free. Answer it naively and it is a graph search per edge, which the measurements price at thirty four fold.',
  },
  {
    section: 'origins',
    text:
      'This problem is older than computer science, and it began as infrastructure. In nineteen twenty six, the Moravian mathematician Otakar Boruvka published the first minimum spanning tree algorithm, in Czech, to plan the electrification of rural Moravia: real villages, real cable, minimum cost. Thirty years later, Joseph Kruskal, twenty five years old at Princeton, read what he called Boruvka’s obscure paper and answered with something simpler: sort the edges, take the cheapest safe one, repeat. Robert Prim at Bell Labs gave the grow one tree alternative in fifty seven, not knowing Vojtech Jarnik had published it in nineteen thirty. But Kruskal’s method shipped incomplete for decades, because its inner question, are these already connected, had no fast answer until union find matured; Robert Tarjan proved the nearly constant amortized bound in nineteen seventy five. That structure, union by rank with path compression, is taught live on this site as puzzle eight, and tonight it reports for duty.',
  },
  {
    section: 'pair',
    text:
      'The control structure owns the greedy and its proof. Scan the edges from lightest to heaviest, and take any edge whose endpoints currently lie in different components. Safety comes from the cut property, which is one sentence: for any way of slicing the vertices into two sides, the lightest edge crossing the slice belongs to every minimum spanning tree, because a tree that omits it must cross the slice somewhere heavier, and swapping the two strictly improves it. Every acceptance in the scan is exactly that argument, applied to the cut between the two components being joined. With distinct weights the tree is unique, which lets the tests demand something stronger than equal cost: all four rival methods must return the identical set of edges. The heuristic answers the inner question. Union find keeps each component as a shallow tree of deeds: find chases parents to the root, and compresses the path it walked; union hangs the shallower root under the deeper. Measured across all eight thousand queries here: zero point nine three parent jumps per find. Not order log n. Under one. That is what the flat forest of puzzle eight buys, and removing it, answering connectivity by breadth first search over the growing forest, costs the same greedy thirty four times the work.',
  },
  {
    section: 'picture',
    text:
      'Picture wiring villages for power on a budget. List every possible cable, sort by cost, cheapest first, and walk the list with one rule: lay the cable only if its two villages are not already on the same grid. The rule turns entirely on answering same grid, instantly. So every village holds a deed pointing toward its grid’s headquarters, and checking is chasing deeds to the top, and every chase flattens the chain it walked, so the next chase is shorter. Merging two grids is one deed rewrite. When n minus one cables are laid, stop, and here is the quiet certificate: every cable you skipped was skipped because its villages were already connected, and by sort order it was the most expensive cable on the loop it would have closed. No cheaper network exists.',
  },
  {
    section: 'run',
    text:
      'Here is the loop. First, sort the edges by weight, cheapest first; that sort is the dominant cost and the contest charges it honestly at E log E. Second, scan: for each edge, ask union find whether the two endpoints share a root. Third, take or skip: different roots, take the edge and union the two components; same root, the edge closes a cycle, and by scan order it is the heaviest edge on that cycle, so it is skipped forever, correctly. Fourth, stop at n minus one edges taken, or at the end of the list, in which case the graph was disconnected and what you hold is its minimum spanning forest, no special case required. Fifth, certify: the cycle property, every non tree edge is the strict maximum on the cycle it closes, is checkable after the fact, and the tested solution checks it on five hundred sampled edges.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, the edges arrive as a list, or better, already sorted: with the sort pre paid, Kruskal’s remaining work on the sparse instance is about twelve thousand operations, the cheapest number on the whole bench. Second, the graph may be disconnected, and you want the forest rather than an exception. Third, union find is already in the room: incremental connectivity, clustering pipelines. And one bonus signal for the machine learning readers: stop the sorted edge scan early, at k components instead of one, and what you have computed is exactly single linkage clustering. Same code, different stopping line.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: simple, certified, and edge list native. One sort, one scan, connectivity at zero point nine three parent jumps per find, uniqueness under distinct weights, the free forest on disconnected input, and a certificate a skeptic can verify by sampling cycles. The weakness: the sort is the bill, and adjacency has a better buyer. On the dense instance, two million of Kruskal’s two point zero four million total is the E log E charge, while Prim’s heap, growing one tree over an adjacency structure and never sorting globally, posts four hundred eighty thousand: about four times less. The strategy line writes itself: when the graph arrives as an edge list, sort one; when it arrives as adjacency and is dense, grow a tree.',
  },
  {
    section: 'tradeoffs',
    text:
      'Here are the measured numbers, on twelve hundred vertices with distinct weights, counting element touches, with Kruskal rows charged E log two E for their sort. Sparse, eight thousand edges: Kruskal with union find, one hundred fifteen thousand eight hundred eighty one, of which the sort is roughly one hundred four thousand: the connectivity answers are nearly free. Kruskal with the heuristic removed, breadth first search as the cycle test: three million nine hundred ninety eight thousand two hundred twenty, thirty four times more, for the identical tree. Prim with a binary heap: thirty two thousand and one, the smallest raw number on the board. Boruvka, every component grabbing its lightest exit simultaneously: one hundred two thousand four hundred eighty seven, in eleven halving rounds, and that round structure is why parallel and GPU spanning tree codes are still Boruvka shaped a century after the electrification of Moravia. Dense, one hundred twenty thousand edges: Kruskal two point zero four million, almost all of it sort; Prim four hundred eighty thousand; Boruvka one point one million. And one delicious detail from the union find ledger: zero point nine three parent jumps per find, averaged over every query. The amortized theorem does not say fast on average in some asymptotic haze; it says the forest is flat, and the counter agrees to the decimal.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is the minimum spanning tree itself, as a routing table. The temptation is real: the tree connects everything, it is cheap, why not route messages along it? Because the tree that connects cheapest does not route shortest. On this very instance, over one hundred random pairs, the tree path is up to fifteen point two times longer than the true shortest path. Total construction cost and pairwise travel cost are different objectives, and a single tree cannot optimize both; the tension even has its own research field, spanners, which buy bounded detours for bounded extra cable. The strategic sentence is short: connect with this unit, route with puzzle seven. Same graph, two questions, two algorithms.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements the whole bench: union find with rank and path compression and a jump counter, Kruskal over pre sorted edges, the breadth first search variant that prices the heuristic by its absence, Prim with a lazy deletion binary heap, and Boruvka in rounds; plus Dijkstra, borrowed for the never here measurement. The self test asserts, in order: all four methods return the identical unique spanning tree, edge set for edge set, because distinct weights make uniqueness a theorem; the tree spans and is acyclic, checked by a fresh union find; the cycle property holds on five hundred sampled non tree edges, which is the certificate of minimality; the parent jumps per find stay under two, and land at zero point nine three; a disconnected variant yields the correct two component forest; and the routing detour is real: worst case fifteen point two fold over one hundred pairs. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
