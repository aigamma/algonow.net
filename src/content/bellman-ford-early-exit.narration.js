// The spoken lesson for puzzle thirty four, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle thirty four: Bellman Ford, paired with early exit relaxation, for single source shortest paths. Here is the puzzle. A directed graph whose edge weights are allowed to be negative, and a source. Produce the shortest path to every vertex, or, when no answer exists, a certified negative cycle: the loop itself, with its sum, not a shrug. The constraint that frames everything: greed is disqualified before the race starts. Dijkstra’s settled means final assumption fails the moment an edge can be negative, and this page measures the wreckage: eight hundred fifty two wrong distances out of one thousand, with the failure certified on a three edge gadget.',
  },
  {
    section: 'origins',
    text:
      'The name records a relay team, not a partnership. Shimbel stated the relaxation idea in nineteen fifty five. Lester Ford published the algorithm at RAND in nineteen fifty six. Richard Bellman gave it the dynamic programming frame in nineteen fifty eight, in a paper titled On a Routing Problem. Moore arrived independently in nineteen fifty nine. The routing title turned out to be prophecy: distance vector protocols like RIP are this algorithm running distributed, every router relaxing its neighbors’ announcements, no global map anywhere. And the finance reading is mathematically exact: write each exchange rate as minus the logarithm of the rate, and an arbitrage loop is precisely a negative cycle. The detector on this page finds one in a constructed currency table and multiplies it out to one point zero zero six four.',
  },
  {
    section: 'pair',
    text:
      'The control structure owns the relaxation rounds. Sweep every edge and ask one question: does the path through u improve v? The induction is the entire proof: after round i, every shortest path using at most i edges is final. So n minus one rounds settle everything settleable. And a round n that still improves something has proven a negative cycle, which the code walks back through predecessors and hands over as a certificate. No ordering, no priority queue, no assumptions about signs: just the edge list, swept. The heuristic supplies the early exit. A full pass that changes nothing is a fixpoint, and the fixpoint is the answer: stop. The n minus one guarantee is a worst case owned by pathological chains; real sparse graphs converge in about their hop diameter. Measured here: nine rounds instead of nine hundred ninety nine. Forty five thousand edge relaxations where the full schedule spends five million, with identical distances, asserted element by element.',
  },
  {
    section: 'picture',
    text:
      'Picture a village telephone chain. Each evening, every household calls its neighbors with the cheapest travel route it has heard of so far. News that needs i hops to travel arrives by evening i, so n minus one evenings guarantee every rumor has landed. The early exit is common sense wearing a theorem: an evening when nobody learns anything is an evening after which nobody will ever learn anything. Hang up. And if the phone tree is still buzzing on evening n, listen closely: someone is quoting a route that undercuts itself every time around a loop. The village has not found a shortest path. It has found arbitrage.',
  },
  {
    section: 'run',
    text:
      'Here is the loop. Initialize the source’s distance to zero and everything else to infinity. Now sweep: for each edge from u to v with weight w, if the distance to u plus w beats the distance to v, improve v and record u as its predecessor. After each full sweep, check the flag: if nothing improved, the fixpoint has arrived and you return, which on the measured graph happened at round nine of a possible nine hundred ninety nine. If improvements are still arriving at round n, stop pathfinding: you have proven a negative cycle. Walk the predecessor chain n steps to guarantee you stand inside the loop, collect it, and return the cycle with its weight sum. In the planted test, minus one hundred twenty. The certificate is the product, never just a boolean.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, negative costs are real in your problem: rebates and penalties mixed with rewards, arbitrage expressed as minus log rates, or the potential functions in Johnson’s all pairs preprocessing, which runs one Bellman Ford precisely so that Dijkstra becomes legal afterward. Second, the cycle is the product: currency loops, and systems of difference constraints, which are exactly shortest path problems in disguise, where infeasibility must arrive with a witness. Third, the setting is edge list only or distributed: the sweep needs no adjacency structure and no ordering, which is why routers could run it in nineteen eighty eight and streaming systems can run it now.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: unconditional correctness, certified failure, and a distributed soul. Signs do not matter. Orderings do not matter. When no answer exists, you receive the negative cycle itself with its sum, asserted in the tests, rather than an exception. Every distance on the measured graph is confirmed by an independent referee: Dijkstra rerun in Johnson’s shifted weight space, a different algorithm in a different currency agreeing to the integer. And the early exit lets the honest worst case charge benign graph prices: nine rounds, measured. The weakness: the worst case really is n times m, and greed is nine times cheaper where greed is legal. On nonnegative ground, Dijkstra spent four thousand nine hundred forty one relaxations to the early exit’s forty five thousand: never pay negative edge insurance on a graph without negative edges. SPFA queues away even more waste, nine thousand three hundred six here, but adversarial instances restoring the full n times m are standard contest setter equipment. And the distributed reading inherits counting to infinity, which is the same worst case rediscovered slowly by routers.',
  },
  {
    section: 'tradeoffs',
    text:
      'Here are the measured numbers: one thousand vertices, five thousand directed edges, two thousand seventeen of them negative, and no negative cycle, which the potential construction proves rather than hopes. Bellman Ford on the full schedule: five million relaxations, zero wrong. Bellman Ford with the early exit: forty five thousand relaxations, zero wrong, nine rounds instead of nine hundred ninety nine. SPFA, the queued refinement: nine thousand three hundred six relaxations, zero wrong, the cheapest correct run on this benign ground, with its adversarial obituary duly cited. And Dijkstra, run on the raw negative edge graph: four thousand nine hundred forty one relaxations, the cheapest bill at the table, and eight hundred fifty two wrong distances out of one thousand. Read the last row twice: fast, confident, and wrong, with no error raised. The referee behind the zeros is independent: every Bellman Ford distance was reproduced by Dijkstra running in Johnson’s shifted nonnegative weight space, where greed is legal again.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is Dijkstra on a graph whose signs you have not proven, and the anatomy deserves care because the failure is silent. In the three edge gadget, the source reaches vertex one directly for four, or through vertex two for five minus three, which is two. Dijkstra settles vertex one at four before the discount route has been discovered, and settled means final: the truth arrives, and is ignored. On the measured graph this silence cost eight hundred fifty two wrong answers, delivered with full confidence and no exception. A wrong and confident shortest path is worse than a slow one, because nothing downstream knows to distrust it: the route planner just plans a bad route. The rule worth keeping: prove the signs, or pay the insurance. Johnson’s trick even lets you pay it once: one Bellman Ford pass computes potentials that make every weight nonnegative, and greed becomes legal forever after.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements Bellman Ford with the early exit flag and round n cycle extraction, SPFA with its queue, binary heap Dijkstra, and an exhaustive simple path referee for small graphs, with relaxation counters throughout. The self test asserts, in order: two hundred trials on small graphs with genuinely negative edges agree with the exhaustive referee. The early exit’s distances equal the full schedule’s exactly. Every distance on the thousand vertex instance is confirmed by the Johnson space Dijkstra referee, a different algorithm in a shifted currency. SPFA agrees. The gadget certifies Dijkstra’s greedy failure deterministically, and the big graph measures it at eight hundred fifty two. The planted negative cycle comes back as a vertex list whose weights sum to minus one hundred twenty. And the constructed exchange table yields a loop multiplying to more than one. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
