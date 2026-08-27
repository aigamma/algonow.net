// The spoken lesson for puzzle ninety eight, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle ninety eight: the Louvain method, paired with greedy modularity moves, for community detection. Here is the puzzle. A network nobody labeled: friendships, citations, protein interactions: and the suspicion that it has natural neighborhoods: groups that connect densely inside and sparsely across. Find them, with no labels, no group count given, and possibly millions of nodes. The yardstick is modularity: the fraction of edges inside communities, minus what pure chance would have put there: and the method optimizes it by the greediest possible rule: every node keeps joining whichever neighbor community raises modularity most, and when the moves quiet down, whole communities collapse into supernodes and the process repeats one level up. The referees work at three scales: every accepted move audited against the definition of modularity to one part in ten to the twelfth: every possible partition enumerated on sixty small graphs: and thirty planted-truth networks that must be recovered exactly, and are, thirty of thirty.',
  },
  {
    section: 'origins',
    text:
      'Blondel, Guillaume, Lambiotte, and Lefebvre, two thousand eight, at the University of Louvain in Belgium: a paper whose method now carries the university’s name through every network-science toolkit on earth. The objective it optimizes is older: Newman and Girvan defined modularity in two thousand four: and the method’s most famous flaw is older than the method too: Fortunato and Barthelemy proved the resolution limit in two thousand seven, one year before Louvain appeared. That flaw is not recited on this page: it is run, and the objective is convicted by its own arithmetic. The story since: the Leiden algorithm, two thousand nineteen, patched real defects in the greedy unfolding: communities that Louvain could leave internally disconnected: while keeping the two-phase idea intact. One method, one yardstick, one proven blind spot: the full package is the lesson.',
  },
  {
    section: 'pair',
    text:
      'The algorithm owns the two-phase loop. Phase one: sweep the nodes in order: each considers only the communities its neighbors already belong to, and joins the one with the largest modularity gain: repeat sweeps until no move improves anything. Phase two: collapse each community into a single supernode: internal edges become self-loops, kept, because they carry the community’s weight: and run phase one again on the smaller graph. Hierarchy falls out for free. The heuristic is the move rule’s locality: the gain of joining a neighbor community is computable in time proportional to the node’s degree, from running totals: no global recomputation, ever: and that locality is the entire reason million-node networks are routine. This page audits the shortcut against the law: three hundred thirty five accepted moves, each one’s incremental gain compared to modularity recomputed from scratch, from the definition: agreement to ten to the minus twelve, zero drift.',
  },
  {
    section: 'picture',
    text:
      'A city of strangers sorting into neighborhoods. Each person periodically asks: among the blocks where my friends live, which move would most increase the density of friendships inside blocks, compared to chance? They move. The city settles. Then something lovely happens: whole blocks begin acting as single units, asking the same question about each other: neighborhoods of neighborhoods, the hierarchy unfolding by itself. And then the famous illusion. In a metropolis made of many tiny villages arranged in a ring, the yardstick itself starts preferring PAIRS of villages fused together: not because anyone’s friendships changed, but because the chance-correction term shrinks as the whole city grows. The ruler bends with the size of what it is measuring. Every village is still obviously a village: the measurement says otherwise: and the measurement is what the algorithm obeys.',
  },
  {
    section: 'run',
    text:
      'Here is the run, at its three scales. Small, where truth is enumerable: sixty graphs of up to nine nodes, every possible partition scored: Bell numbers, twenty one thousand partitions at nine nodes: Louvain hits the exact modularity optimum on fifty four of the sixty and averages ninety eight point seven percent of it, never exceeding it: greedy locality against perfect knowledge, nearly at the ceiling. Medium, where truth is planted: thirty networks of four twenty-five-node blocks, dense inside, sparse across: the planted labels recovered exactly: pair agreement one point zero: thirty of thirty. And the canonical: Zachary’s karate club, the field’s fruit fly: thirty four members, and the club really did split in nineteen seventy seven. Louvain lands at modularity zero point four one eight eight: the number every textbook quotes: with four communities, and coarsening them to two matches the historical fission on thirty three of thirty four members. The one dissenter is the network’s famous boundary member, torn between factions in real life too.',
  },
  {
    section: 'signals',
    text:
      'The signals that this pair fits. First: unlabeled relational data at scale: social graphs, citation webs, purchase networks, interactomes: when the nodes come in millions, locality-only work per move is not an optimization but a precondition. Second: hierarchy is welcome. The aggregation levels are not scaffolding: they are output: communities of communities, zoomable structure, free. Third, and the widest lesson on the page: you have a yardstick, and the yardstick is imperfect. Optimizing a proxy objective hard: while knowing exactly where the proxy fails: is the modern skill this unit drills: the same posture you need with loss functions, engagement metrics, and reward models. The optimum of a flawed objective is a flawed answer found efficiently.',
  },
  {
    section: 'tradeoffs',
    text:
      'Now the rivals. The Leiden algorithm is the direct successor, two thousand nineteen: it adds a refinement phase between the sweep and the aggregation, guaranteeing that every community is internally well connected: a real Louvain defect: and converging more stably under repetition. Same objective, same resolution limit: better search cannot straighten a bent ruler: but production work today mostly says Leiden where this page teaches Louvain. Girvan and Newman’s edge-betweenness method is the classical road: repeatedly remove the edge that the most shortest paths cross, and read a full dendrogram of nested communities off the cuts. Principled, interpretable, and quadratic-times-linear in cost: hopeless past tens of thousands of edges: exactly the wall the Louvain paper was built to pass.',
  },
  {
    section: 'tradeoffs',
    text:
      'Label propagation is the minimalist rival: each node simply adopts the majority label among its neighbors, over and over. Near-linear, no objective function at all: sometimes that is the point, and Leiden even uses it as an internal subroutine. Its price is anarchy: no yardstick means no guarantees: different runs give different answers, and label avalanches can swallow half the graph. And spectral clustering, from the machine-learning aisle, cuts by the graph Laplacian’s eigenvectors: beautiful theory, needs the community count in advance and an eigensolve you will feel at scale. The strategic map: Louvain or Leiden for large unlabeled graphs: Girvan-Newman for small graphs where the story matters: label propagation for a fast sketch: spectral when you know k and can afford eigenvectors.',
  },
  {
    section: 'tradeoffs',
    text:
      'And the negative example, which is the deepest thing on this page: trusting the optimum of a proxy objective. The resolution limit, run: a ring of ten five-cliques: Louvain finds all ten, perfectly. A ring of forty: it finds twenty: adjacent cliques fused in pairs. And here is the conviction: the merged partition SCORES HIGHER modularity: zero point nine zero four five against zero point eight eight four one for the obviously right answer: so a PERFECT optimizer must return the fused partition. The search did nothing wrong. The objective prefers the wrong answer, provably. Optimizing harder: more sweeps, refinements, restarts: only converges more reliably to the yardstick’s mistake. The discipline: know your objective’s failure modes before trusting its optimum: here, that communities below roughly the square root of the network’s edge count can be invisibly fused: and validate against ground truth where the stakes are real. Reward hacking, metric gaming, teaching to the test: same disease, same cure.',
  },
  {
    section: 'code',
    text:
      'The code on this page is the method and its three referees. Modularity from the definition: the independent judge. The full two-phase Louvain with an audit switch: every accepted move’s incremental gain checked against the definition, to ten to the minus twelfth: and a build note worth keeping: the first draft leaked self-loops into the neighbor scan after aggregation, quietly stalling the merge phase: the audit machinery is what made the bug findable. Exhaustive partition enumeration by Bell recursion. The planted-block generator. The clique ring. And the karate club’s seventy eight edges, verbatim. The self test asserts: three hundred thirty five audited moves, zero drift: fifty four of sixty enumerated optima, never exceeding Q star: thirty of thirty planted recoveries: the resolution limit with the objective itself convicted: and the canonical club at zero point four one eight eight, fission matched thirty three of thirty four. When it prints O K, you have watched a great heuristic win almost everywhere: and learned exactly where its yardstick, not its greed, is the thing that fails.',
  },
];
