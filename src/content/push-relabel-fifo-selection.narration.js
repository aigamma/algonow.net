// The spoken lesson for puzzle sixty nine, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle sixty nine: push relabel, paired with FIFO vertex selection, for maximum flow. Here is the puzzle. A capacitated network, a source, a sink: the same contract as the live Edmonds Karp unit, one shelf over: but with a new constraint that changes everything. Every operation must be local. A vertex may consult only its own excess, its own height, and its immediate neighbors. No breadth first search, no global view of the graph, no paths: the property that lets the method run on parallel hardware and rule computer vision pipelines. The referees: value equality with Edmonds Karp on two hundred random graphs, the full duality certificate on every single instance, and a discipline assert: internal excess exactly zero at termination, because until then the state is deliberately not a flow at all.',
  },
  {
    section: 'origins',
    text:
      'Goldberg and Tarjan, Journal of the ACM, nineteen eighty eight: building on Karzanov’s nineteen seventy four idea of the preflow: the deliberately illegal state where a vertex may hold more inflow than outflow. Their mental model became the field’s: water on terraces. Flood the source’s pipes, let the excess puddle, push each puddle one terrace downhill, and when a puddle is stuck, jack its terrace up one notch and let it drain. The path seeking dynasty: Ford Fulkerson, the live Edmonds Karp, the live Dinic: computes routes from source to sink. This method abolishes routes entirely: and that is precisely why graph cut segmentation code and parallel max flow solvers ship it.',
  },
  {
    section: 'pair',
    text:
      'The algorithm owns the preflow with height labels. The source starts at height n and saturates its outgoing edges; from then on only two moves exist. Push: send excess along a residual edge to a neighbor exactly one level downhill. Relabel: a stuck vertex rises to one above its lowest residual neighbor. Heights only ever climb, which is why the machine must terminate: and at termination, this page asserts that every internal vertex holds exactly zero excess, the sink’s excess is declared the flow, and the residual cut certifies it: cut equal to flow on all two hundred instances. The heuristic supplies the selection rule: keep the active vertices in a first in, first out queue, work them in arrival order, requeue on relabel. That single discipline tightens the generic bound of V squared E down to V cubed.',
  },
  {
    section: 'picture',
    text:
      'Picture water on terraces. The source is a tank raised to height n. Opening it floods every outgoing pipe, and water puddles on the terraces below. A puddle may drain only to a terrace exactly one step lower: and when no lower terrace has pipe capacity left, the stuck terrace itself is jacked up, one notch past its lowest pipeworthy neighbor, and drains. Water that can reach the sink finds its way down. Water that cannot: excess beyond what the network can carry: keeps rising on its terrace until it climbs over the source’s own height and drains back home. Nobody plans a route. Nobody ever sees the map. The flood computes the maximum flow because gravity plus bookkeeping is the proof: heights only rise, pushes only descend, and the final puddle free landscape carries its own minimum cut certificate.',
  },
  {
    section: 'run',
    text:
      'Here is the run. Initialize: source to height n, saturate its edges, excess puddles on its neighbors, all of them entering the queue. Loop: take the front vertex. Push its excess along admissible edges: residual capacity, exactly one level downhill: waking any neighbor that gains excess. If it sticks with excess remaining, relabel: one above the lowest residual neighbor: requeue it, and move to the next vertex in line. Heights only climb, so this ends. Read the answer: the sink’s excess is the flow. And check the discipline: every internal vertex at exactly zero excess: only then does the preflow deserve the name flow: and the residual cut from the source side seals it: cut equal to flow, asserted on every instance this page ran.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, locality is a requirement, not a preference: parallel and distributed max flow, GPU implementations: there is no global breadth first search to serialize around, because there is no search at all. Second, graph cuts on grids: computer vision’s segmentation networks: this page’s eight by eight client recovered its planted blob exactly, certified by its own cut: the workload this method effectively owns in practice. Third, dense or adversarial instances: the V cubed insurance policy for graphs where augmenting path counts explode: the same families the live Dinic serves by the opposite philosophy.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: local moves, a global optimum, and certificates everywhere. Flow value equal to Edmonds Karp on all two hundred random graphs. Internal excess asserted zero at every termination. The residual cut equal to the flow on every instance. The zigzag gadget: the one the Edmonds Karp page measured killing a pathological path chooser at two hundred thousand augmentations: dispatched here in four local operations, because the trap needs a path chooser to catch and this method does not have one. And the vision client’s cut recovering the planted four by four blob exactly. The weakness: constants, tuning lore, and an honest mid pack surprise. Bare push relabel is not fast. Production solvers lean on the gap heuristic and periodic global relabeling: and when this page raced the folklore champion, highest label selection, bare: without its entourage: it landed mid pack: fourteen thousand eight hundred against FIFO’s fourteen thousand. Reputations in this family are earned by ensembles, not by selection rules alone.',
  },
  {
    section: 'tradeoffs',
    text:
      'Here is the contest, on the Edmonds Karp page’s own zigzag gadget at capacity one hundred thousand. The pathological path chooser: two hundred thousand augmentations: one barrel per round trip, as that page measured. Edmonds Karp itself: two augmentations: breadth first search immunity, the fix that keeps paths but chooses them shortest first. Push relabel: four local operations. Not because it chooses paths wisely: because no paths exist to be chosen badly. The selection dial, measured on thirty layered graphs with identical answers everywhere: FIFO fourteen thousand twenty three operations, bare highest label fourteen thousand eight hundred twenty nine, random fourteen thousand eight hundred eighty two. The margins are small and the page says so: on friendly graphs the queue is a tune up, not a rescue: FIFO’s real earnings are its worst case bound. And the rivals complete the shelf: the live Dinic between the philosophies, and highest label with its gap heuristic entourage as the production standard.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is reading the preflow mid run. Halfway through, the state is deliberately illegal: vertices hold excess that flow conservation forbids: some of it destined for the sink, some destined to climb all the way back home to the source. A dashboard that samples edge flows mid run, or an engineer who stops the solver early because most of the flow seems to have arrived, is reporting a preflow: which is not a flow at all: edges can carry quantities that no feasible routing will ever justify. The discipline is this page’s referee: internal excess exactly zero at termination, and only then is the sink’s excess called the answer. The contrast with the path dynasty is sharp and worth carrying: every Edmonds Karp augmentation leaves a valid partial flow: stop it anytime and ship what you have. Preflow methods are all or nothing: the intermediate state is scaffolding: and shipping scaffolding as a bridge is how dashboards lie.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements the preflow machine: heights, excess, the push and relabel moves, and three interchangeable selection rules: FIFO, bare highest label, and random: plus a compact Edmonds Karp as the referee and the certificate checker. The self test asserts, in order: flow values equal to Edmonds Karp on two hundred random graphs, with the residual cut certificate and zero internal excess on every one. The zigzag gadget at full flow in under thirty local operations: measured at four. The selection dial on thirty layered graphs: FIFO strictly beating random in aggregate, with the honest highest label surprise recorded rather than smoothed over. And the eight by eight segmentation client: cut equal to flow equal to ninety six, with the recovered region exactly the planted blob. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
