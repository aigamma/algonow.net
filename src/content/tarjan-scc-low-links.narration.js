// The spoken lesson for puzzle fifty two, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle fifty two: Tarjan’s S C C algorithm, paired with the low link stack discipline, for strongly connected components. Here is the puzzle. A directed graph: dependencies, implications, hyperlinks, call sites. Partition it into its strongly connected components: the maximal sets in which every vertex can reach every other: in a single depth first pass, and emit the components already sorted in reverse topological order. The constraint is what the naive question costs: asking mutual reachability pair by pair means a breadth first search from every vertex: roughly one point six billion edge touches on this page’s twenty thousand vertex instance: where the one pass answer touched every edge exactly once: fifty nine thousand nine hundred ninety five, counted to the edge and asserted equal to m.',
  },
  {
    section: 'origins',
    text:
      'Robert Tarjan’s nineteen seventy two paper, Depth First Search and Linear Graph Algorithms, is the founding document of depth first search as a precision instrument: strongly connected components, bridges, and articulation points all fall out of one traversal with the right bookkeeping, and this site’s atlas carries all three. Kosaraju’s two pass method, unpublished but transmitted through Sharir, is the elegant sibling and this page’s independent referee. Gabow’s two stack variant completes the trio. And the application that keeps the theorem employed daily is two satisfiability: Aspvall, Plass, and Tarjan showed in nineteen seventy nine that either or constraints become an implication graph, and satisfiability becomes the question of whether any variable shares a component with its own negation: decided and certified two hundred fifty times on this page.',
  },
  {
    section: 'pair',
    text:
      'The control structure owns the depth first skeleton with discovery indices: every vertex stamped with the moment the search first touched it. That much is common property. The heuristic supplies the low link discipline. Each vertex tracks the smallest discovery index reachable through its own subtree plus at most one back edge: children hand their low links upward, and back edges to vertices still on the auxiliary stack offer their index. A vertex whose low link equals its own index has just proven something: nothing beneath it escapes above it: and everything on the auxiliary stack down to that vertex pops off as one finished, certified component. Two integers per vertex and one stack turn a walk into a partition. Measured: fifty nine thousand nine hundred ninety five edge touches: exactly m, asserted as equality, not approximation. And the components emerge in reverse topological order, asserted on every cross edge of the condensation: the downstream component is always emitted first.',
  },
  {
    section: 'picture',
    text:
      'Picture exploring a cave system with a rope and a piece of chalk. Chalk each chamber with the order you reached it; the rope pays out behind you. In every chamber you keep one running note: the earliest chalked chamber that anyone below this point has found a passage back up to. That note is the low link. And when you surface into a chamber whose note points to itself, you hold a proof: no passage from anywhere below escapes above this chamber. Everything still on the rope beneath it is one sealed cavern system: coil it off as a unit, name it, and keep walking. One spelunk, every cavern found, and they come off the rope deepest first: which is exactly the order a cartographer wants to draw them in.',
  },
  {
    section: 'run',
    text:
      'Here is the loop, in the iterative form that survives twenty thousand vertex recursions Python would refuse. On first arrival, stamp the vertex: index and low link equal to the arrival counter: and push it onto the side stack. Explore edges one at a time: an unvisited target becomes a new frame; a visited target still on the side stack offers its index to your low link; a visited target no longer on the stack belongs to a finished component and offers nothing: that on stack check is the classic half memory omission. When a vertex finishes, hand its low link to its parent. And when a vertex finishes with low link equal to index: pop the side stack down to it: one component, certified, emitted. For two satisfiability: build the implication graph, run this once, report unsatisfiable if any variable shares a component with its negation, and otherwise read the assignment straight off the component order.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, cycles are the structure you are after: deadlock detection, circular imports, mutually recursive functions: the condensation, the graph of components, is the map you actually wanted. Second, a DAG pipeline follows: dynamic programming on a graph with cycles begins by collapsing the cycles, and Tarjan’s emission order hands you the topological sort of the condensation without a second algorithm. Third, the problem is a constraint system in disguise: two satisfiability and its many costumes: paired scheduling choices, either or placements: this page decided two hundred fifty such instances and re verified every certificate.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: one pass, every edge exactly once, order included, certificates native. The touch counter read fifty nine thousand nine hundred ninety five on sixty thousand attempted edges, equal to the actual edge count to the digit. The two thousand three hundred three component partition agreed with both referees. The reverse topological emission held on every cross edge. And the closure test, low link equals index, is itself a proof object, which is why the two satisfiability payload comes out certified in both directions. The weakness: bookkeeping density, recursion depth, and an invariant that punishes half memory. Two arrays, a stack, and an on stack flag whose interplay is famously easy to almost remember: omitting the on stack check yields an algorithm that works on most graphs and lies on the rest. Plain recursion dies at this page’s scale, so the honest implementation is iterative, and the iterative form is genuinely harder to write. And when all you need is reachability from one source, all of this is overkill: breadth first search exists.',
  },
  {
    section: 'tradeoffs',
    text:
      'Here are the measured numbers, on a twenty thousand vertex, sixty thousand edge random digraph that condensed to two thousand three hundred three components around a giant of seventeen thousand six hundred ninety eight vertices. Brute mutual reachability: roughly one point six billion touches: stated, and used as the referee only at small sizes. Kosaraju: one hundred nineteen thousand nine hundred ninety touches: exactly twice the edge count, asserted: the price of two transparent passes, one to order by finish time, one to sweep the reversed graph. Tarjan: fifty nine thousand nine hundred ninety five: exactly the edge count, asserted: one pass, with the ordering and the certificates thrown in. And the payload ledger: two hundred fifty random two satisfiability instances, one hundred thirty four satisfiable, one hundred sixteen not, every verdict matching an exhaustive truth table, and every satisfying assignment re checked against every clause. The partition is the same three ways. The bills are one, two, and twenty seven thousand times m.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is per pair reachability at scale, and the pattern deserves naming because this site keeps meeting it: quadratic honesty referees linear cleverness, and production ships the cleverness. Running breadth first search from every vertex is transparent, correct, and one point six billion touches here: four orders of magnitude over the one pass answer for the identical partition: yet it is exactly what this page runs, gladly, at sixty vertices, three hundred times, as the referee. The subtler trap is partial laziness: answering component queries on demand with cached searches. The giant component holds seventeen thousand six hundred ninety eight of the twenty thousand vertices, so nearly every cache miss is nearly a full scan. Components are a global property; compute them globally, once, and the queries become array lookups.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements iterative Tarjan with the explicit work stack, the side stack, and the on stack flags, plus an edge touch counter; Kosaraju’s two pass method as the independent referee; brute force mutual reachability; and the Aspvall Plass Tarjan two satisfiability solver with assignment extraction from component order. The self test asserts, in order: three hundred small trials where Tarjan’s partition equals brute force. The structure gadgets exact: one ring is one component, a DAG is all singletons, two chained cycles are two components emitted downstream first. At scale, Kosaraju’s partition equal to Tarjan’s, with the touch counters equal to exactly m and exactly two m. Reverse topological emission on every condensation edge. And the payload: two hundred fifty two satisfiability instances matching exhaustive truth tables, satisfiable and unsatisfiable both well represented, with every satisfying assignment re verified clause by clause. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
