// The spoken lesson for puzzle fifty seven, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle fifty seven: Edmonds Karp, paired with shortest augmenting paths, for maximum flow. Here is the puzzle. A network of pipes with capacities, a source, a sink. Push the maximum possible flow, with a running time bound that does not depend on how large the capacities are: and hand back the minimum cut as a certificate that no more flow exists. The constraint is subtle, because correctness was never the problem: Ford and Fulkerson’s augmenting scheme is right whenever it stops. The problem is when it stops. The zigzag gadget on this page takes two hundred thousand augmentations under a bad path chooser, and two under the right one. The entire heuristic is one word.',
  },
  {
    section: 'origins',
    text:
      'Ford and Fulkerson gave the augmenting path scheme and the max flow min cut theorem in nineteen fifty six: one of the great dualities, and an algorithm silent about which augmenting path to take. With irrational capacities that silence is fatal: the scheme can run forever, provably. With large integers it merely runs for ages, as measured here. Edmonds and Karp published the one word fix in nineteen seventy two: breadth first search: always the shortest residual path: with the theorem that makes the word work: residual distances only ever grow, so augmentations are bounded by the vertex count times the edge count over two, with no capacity anywhere in the bound. Dinic reached the same insight independently in nineteen seventy and batched it into phases: a live unit on this site. Push relabel later abandoned paths entirely. And the certificate side of the duality is what applications actually spend: this page closes with a min cut buying a project portfolio.',
  },
  {
    section: 'pair',
    text:
      'The control structure owns augment and repeat. Find a source to sink path with residual room; push its bottleneck; update the residual graph, including the reverse edges that let later augmentations undo earlier greed: that undo mechanism is why the scheme is correct at all. When no path remains, the vertices still reachable from the source in the residual graph form one side of a cut, and that cut’s capacity equals the flow: maximum flow, minimum cut, one theorem. This page certifies that duality edge by edge on every instance it runs, and on two hundred small graphs it goes further: enumerating every one of the two to the n minus two possible cuts and confirming the flow equals the smallest. The heuristic supplies the word: breadth first search. Augment along a shortest residual path, always. Distances from the source in the residual graph are then monotone: they only grow: each edge can be a bottleneck only on the order of V times, and the total augmentations stay under V times E over two. Measured: the gadget falls in two: the five hundred node network in twenty two.',
  },
  {
    section: 'picture',
    text:
      'Picture two wide pipelines running from source to sink, crossed in the middle by one thin transfer hose. A naive dispatcher keeps routing single barrels through the hose: each trip moves one barrel, and, because the trip crosses between pipelines, it flips which side has spare room: so the next trip elects the hose again, in the other direction. Two hundred thousand trips, measured, for water that two direct runs would have moved. The breadth first dispatcher asks one question before every trip: what is the shortest route with room? The hose route is one hop longer than the direct runs. It is never chosen. Two runs, done. The hose was never needed: only bad routing ever made it busy: and that sentence is the entire unit.',
  },
  {
    section: 'run',
    text:
      'Here is the loop. Breadth first search the residual graph from the source: the first arrival at the sink traces a shortest augmenting path. Find the path’s bottleneck: the smallest residual room along it: and push that much, adding reverse residual edges as you go: the undo mechanism. Repeat until the search cannot reach the sink. Then read the certificate off the failure: the set of vertices the last search reached is the source side of a minimum cut: its capacity equals your flow, every edge crossing it is saturated, and this page asserts both, everywhere. And then spend the cut: minimum cuts are what project selection, image segmentation, and bipartite vertex covers actually purchase: the page closes by choosing a project portfolio with one, and checking it against brute force.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, capacities are large or unknown: the running time must not depend on them, and that independence is Edmonds Karp’s entire contribution: the gadget is what dependence looks like. Second, the cut is the product: segmentation masks, closure and selection problems, minimum vertex covers through König’s theorem: the flow is often just the vehicle; the certificate is the cargo. Third, you want simplicity with a proof: forty lines, one theorem, and a defensible answer: the flow algorithm to write at a whiteboard, with Dinic and push relabel as the documented upgrades when scale demands them.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: capacity free termination, certificates native, and honest simplicity. The gadget at two augmentations where the bad chooser paid two hundred thousand. Twenty two augmentations at five hundred nodes, against a worst case allowance of seven hundred fifty thousand. Duality certified edge by edge on every instance, and confirmed against exhaustive cut enumeration on two hundred small graphs. And the application cashed: a project selection solved by min cut, matching brute force. The weakness: the V E squared worst case is real, and paths are not the only paradigm. Dense adversarial instances push Edmonds Karp to its bound; Dinic’s level graphs, a live unit here, batch the same shortest path idea into phases for V squared E; push relabel abandons paths entirely and rules the hard practical instances; capacity scaling is the other classical fix, at the price of readmitting log C into the bound. Edmonds Karp is the theorem bearing baseline they all improve upon: which is exactly the right thing to be.',
  },
  {
    section: 'tradeoffs',
    text:
      'Here are the measured numbers. The gadget, at capacity one hundred thousand: the pathological chooser: two hundred thousand augmentations, one barrel each: the flow value itself, delivered in installments of one. Breadth first search on the identical gadget: two augmentations, and the middle hose never touched. At scale: five hundred nodes, three thousand edges, capacities up to a million: twenty two augmentations, roughly thirty thousand times below the capacity free allowance: with the full certificate suite passing: conservation at every internal node, no edge over capacity, the cut’s capacity equal to the flow, every crossing edge saturated. The referees behind it: two hundred small graphs where the flow equaled the minimum over every one of the enumerated cuts. And the application: four projects, three machines, net profit eleven: total profits thirty five minus a cut of twenty four: matching exhaustive search over all sixteen portfolios.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is unspecified path augmentation on big capacities, and the shape of the failure deserves respect, because it is invisible to correctness testing. Every intermediate flow the bad chooser produces is valid. Every augmentation makes progress. The unit tests pass. The disease is only in the count: two hundred thousand trips at capacity ten to the five; days of trips at ten to the nine; and with irrational capacities, provable non termination: the algorithm is correct and never finishes. The gadget that exhibits all of this is two triangles and a crossing edge. The vaccine is one word, breadth first, and the reason the word works is a theorem about monotone distances: which is this site’s recurring lesson in its purest form: the skeleton was never the intelligence: the choosing rule is.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements Edmonds Karp with breadth first path finding, reverse edge bookkeeping, and augmentation counters; the pathological chooser simulated on the gadget; the residual reachability cut extractor; a full certificate suite checking capacity, conservation, cut equality, and saturation; and the project selection reduction. The self test asserts, in order: on two hundred small graphs, the certificate suite passes and the flow equals the minimum over every enumerated cut: duality in both directions. The gadget measured at two C augmentations for the bad chooser and exactly two for breadth first search, with the certificate passing on the result. The scale run within the capacity free bound, measured at twenty two. And the project selection: net profit from the min cut equal to the best over all sixteen portfolios. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
