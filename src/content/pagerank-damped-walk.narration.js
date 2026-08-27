// The spoken lesson for puzzle sixteen, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle sixteen: PageRank, paired with the damped random walk, for ranking linked graphs. Here is the puzzle. You are given a directed graph of n pages and their links, and the graph is not polite: it contains dead ends with no outgoing links, closed loops that link only each other, and pages created for no purpose except to deceive the ranking. Your task is to assign every page a score measuring how important the link structure makes it. And the constraint is about meaning: the scores must be a probability distribution the graph itself justifies, stable, unique, and not free to hand out to anyone who can mint new pages. A formula is easy. A definition that survives adversaries is the actual problem.',
  },
  {
    section: 'origins',
    text:
      'Stanford, nineteen ninety six. Larry Page and Sergey Brin’s crawler, BackRub, needed to order its index, and the insight was recursive: a link is a vote, but a vote weighted by the importance of the voter, which is itself defined by its voters, all the way down. The recursion resolves through the power method, a technique from the early twentieth century. The name PageRank is a pun on its author’s surname. The nineteen ninety eight paper fixed the damping factor at zero point eight five, a folklore constant the field still uses, and Stanford’s patent stake eventually sold for about three hundred thirty six million dollars. The same two years produced the road not taken: Jon Kleinberg’s HITS, hubs and authorities, ran inside IBM’s Clever prototype and was published in the Journal of the ACM in nineteen ninety nine; Lempel and Moran’s SALSA followed in two thousand to repair its famous flaw. This lesson measures all three against each other on the same hostile graph.',
  },
  {
    section: 'pair',
    text:
      'The control structure owns the iteration. Importance is defined recursively, so compute it by relaxation: start with every page holding one over n, and repeatedly let every page split its current score equally along its outgoing links. Iterated long enough, the vector converges to the principal eigenvector of the link matrix: the one distribution that reproduces itself. Each round is a single pass over the edges, one matrix vector product, which is why the same computation fits in sixty lines of Python and across a datacenter with equal grace. The heuristic repairs the walk’s theology, because on a real graph the pure iteration is broken three ways: dead ends leak probability out of existence, closed loops absorb everything forever, and nothing guarantees a unique answer at all. The damped walk fixes all three with one dial. With probability zero point eight five, follow a random outgoing link. With probability zero point one five, teleport to a page chosen uniformly at random. Now the chain can reach everywhere from everywhere, so a unique stationary answer exists. The error contracts by the damping factor each pass, so the number of passes is known before you start: eighty two, on this page’s instance. Traps drain instead of absorbing. And the score means something: the long run attention of a reader whose patience is about one over zero point one five, seven clicks.',
  },
  {
    section: 'picture',
    text:
      'Follow one distractible reader forever. They read a page, click a random link, read, click again, and every seventh click or so they get bored and jump somewhere completely random. A page’s importance is simply the share of eternity this reader spends on it. Now picture the pathology that boredom cures. Somewhere on the web is a cluster of pages that link only to one another, a roach motel of the link graph. A reader who only follows links and never gets bored will eventually wander in, and then never leave, so given enough eternity the motel owns all of it. The bored reader strolls in, looks around, and teleports out on the next bout of boredom, every single time. In this design, boredom is not noise in the model of human attention. Boredom is the mathematical guarantee.',
  },
  {
    section: 'run',
    text:
      'Here is the loop. First, start uniform: every page holds one over n. Second, one pass: every page splits its held score equally along its outgoing links, and a dead end’s score, having nowhere to go, is spread uniformly across all pages. Third, damp what arrived: the new score of every page is zero point one five over n, plus zero point eight five times the mass it just received. The vector remains an exact probability distribution after every pass, which the tested solution asserts to the last decimal. Fourth, repeat until the total movement between passes drops below tolerance. Because the error shrinks by a factor of zero point eight five per pass, the budget is computable in advance: about one hundred ten passes for eight digits, eighty two measured here. Fifth, read the answer: the fixed point is the stationary distribution of the damped walk, and on a small graph the tested solution confirms it against an exact linear system solve, two independent routes to the same vector.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, you need global, query independent importance: one number per node, comparable across the entire graph, computed once and served to everyone. Second, the graph is messy or hostile: dead ends, closed loops, and manufactured pages are not corner cases on a real web, they are the standing condition, and this method’s guarantees are exactly about surviving them. Third, the computation must shard: one matrix vector product per pass is the canonical distributed workload, and PageRank was literally the demonstration example in the MapReduce paper. If instead you need query specific relevance, or a one shot cheap proxy, the rivals section prices those trades.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: guaranteed, on any graph, at a known price. Existence and uniqueness come from the damping dial, convergence arrives at a geometric rate you can compute before running, traps drain, and farms are diluted. The weakness, honestly: it is global, iterative, and topic blind. Eighty two passes against in degree’s single pass. The constant zero point eight five is folklore: no theorem selects it, and changing it changes the ranking. One universal taste means no notion of a query; the personalized variant re-aims the teleport at a topic instead of the whole web, and is its own atlas entry. And a large enough farm still buys a real, diluted boost, which is why trust seeded teleports exist. Every one of those caveats is measured rather than asserted in what follows.',
  },
  {
    section: 'tradeoffs',
    text:
      'Here are the measured numbers, on a two thousand page web with three attacks planted: a thirty page mutual admiration clique that does have exit links, a ten page spider trap with none, and fifty dead ends. First failure mode: the trap. Run the walk undamped and the ten trap pages end holding eighty four point seven percent of all rank, roughly one hundred seventy times their fair share, and the iteration never settles. One honest wrinkle: the standard patch for dead ends, spreading their mass uniformly, acts as a faint accidental teleport, which is the only reason the trap did not take everything. Damped at zero point eight five, the same trap holds two point seven percent, and convergence takes eighty two passes. Second failure mode: the clique. HITS converges fastest on the bench, nineteen passes, and hands its entire top twenty, one hundred percent, to the planted clique: a mutual admiration society is indistinguishable from authority under mutual reinforcement. That is the tightly knit community effect. SALSA, which is HITS with each walk step normalized, drops the capture to five percent, at one hundred thirty one passes: one normalization, measured, is the entire repair. PageRank also sits at five percent. Third failure mode: the farm. One hundred sock puppet pages, freshly minted with no links pointing at them, all link one obscure target sitting at PageRank rank one thousand six hundred ninety. By in degree, the target becomes the number one page on the web, instantly and for free. Under PageRank, each sock can give only its teleport floor, and the target climbs to ninth. A real boost, honestly reported, but a diluted one that cost a hundred whole pages: dilution, not immunity, and the gap between those two words is the entire anti spam industry.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never bring to this problem is betweenness centrality, reached for because it is the most famous importance measure in network science. Brandes’ exact algorithm costs vertices times edges: twenty one million operations on this toy web against PageRank’s nine hundred thousand, and on a billion page web with ten billion links it is ten to the nineteenth operations, thousands of machine years. And the cost is not even the real objection: betweenness answers a different question. It measures who sits on shortest paths between pairs, brokerage, chokepoints, not who the structure endorses. On a few thousand nodes, asking about flow and bottlenecks, it is exactly the right tool. As a web ranker it is the wrong question computed at an impossible price.',
  },
  {
    section: 'code',
    text:
      'The Python solution builds the hostile web, then runs four rankers over it with one convergence discipline. PageRank is twenty lines: split, spread the dangling mass, damp, measure movement. HITS alternates hub and authority updates with normalization. SALSA walks backward along an in link, then forward along that hub’s out link, normalizing each step. In degree is a counting pass. The self test asserts, in order: power iteration matches an exact Gaussian elimination solve of the four page linear system to ten decimal places, two independent routes to one vector; a directed ring scores exactly uniform, by symmetry; the big vector is a unit mass fixed point; the pass count rises monotonically as the damping factor climbs toward one; the undamped trap hoards more than half of all rank while the damped trap keeps under five percent; HITS’s top twenty is at least ninety percent clique while PageRank’s is at most thirty; and the farm experiment lands exactly as advertised, in degree rank one, PageRank rank single digits but not the crown, from rank one thousand six hundred ninety before. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
