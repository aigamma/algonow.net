// The spoken lesson for puzzle seventy three, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle seventy three: Gale Shapley, paired with deferred acceptance, for stable matching. Here is the puzzle. Two sides with opinions: n applicants and n programs, every participant ranking the entire other side. Produce a matching that no pair will defect from: stable, meaning there exist no two participants who prefer each other to what they were assigned. Notice what is not the objective: minimizing total cost is the live Hungarian unit’s mathematics, one page over: this unit prevents elopement, and the two goals genuinely diverge. The referees: every stable matching enumerated exhaustively for small instances, with the famous optimality theorems checked against each member: and blocking pairs counted across all n squared pairs, on all three hundred instances, expecting exactly zero.',
  },
  {
    section: 'origins',
    text:
      'David Gale and Lloyd Shapley, nineteen sixty two, in the American Mathematical Monthly: seven pages, not a single citation, and the founding paper of matching theory. The wonderful irony: the National Resident Matching Program had been running essentially this procedure since nineteen fifty two, discovered by practice a decade before the proof. Alvin Roth established the connection in the eighties, redesigned the residency match with it in nineteen ninety seven, and carried the machinery into kidney exchange chains and school choice systems. The twenty twelve Nobel Prize in Economics went to Roth and Shapley: the rare algorithm whose deployment record is measured in careers and organs.',
  },
  {
    section: 'pair',
    text:
      'The algorithm owns the proposal rounds. Every unmatched proposer works down their preference list, one proposal at a time, and the process runs until nobody is left proposing. Each proposal is a fresh pairing of proposer and receiver: no pair ever meets twice: so the total can never exceed n squared: counted and asserted on every instance. The heuristic supplies deferred acceptance, and the name is exact: a receiver never says yes. Only: you may stay, for now. Each receiver holds the single best offer received so far, and releases it, without sentiment, the moment someone better calls. Rejections are forever. Acceptances are provisional until the music stops. That one asymmetry yields the entire theorem stack, and this page enumerates rather than recites it: the outcome is stable, three hundred out of three hundred: and among all stable matchings: twenty five of the sixty small instances had several: it is simultaneously proposer optimal, every proposer weakly best off, and receiver pessimal, every receiver weakly worst off. Verified against every member of the stable set. Not one counterexample.',
  },
  {
    section: 'picture',
    text:
      'Picture a dance where nobody sits down until the music stops. Suitors cross the floor in the order of their hearts. Each recipient keeps exactly one hand held: the best so far: and drops it, without ceremony, when a better offer arrives. The dropped suitor crosses to the next name on their list; nobody returns where they were refused. When the floor finally quiets, look around and reason it out: could any two people secretly prefer each other to their partners? No: he proposes in order, so he would have reached her before settling lower: and she holds the best, so she would have kept him. The silence is the proof. And watch the asymmetry in the final scene: the crossing side stands near the top of its lists: the holding side, near the bottom of what stability allows.',
  },
  {
    section: 'run',
    text:
      'Here is the run. Propose in order: every unmatched proposer approaches the best receiver who has not yet refused them. Hold, never accept: the receiver compares the newcomer to the current holder, keeps the better, and returns the other to the pool. Rejections are forever, so each of the n squared pairs meets at most once: the counted bound. Stop at silence: when no unmatched proposer has names remaining, the held hands become the matching, and it is stable. And know which side you are on: the outcome favors the proposing side by theorem: measured here at three point zero one ranks of average partner quality at n twenty. If the mechanism lets you choose your role: propose.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, both sides have preferences: residents choosing hospitals that are also choosing residents, students and schools, candidates and firms: there is no single cost to minimize, only opinions to reconcile. Second, defection is the failure mode: the matching must survive participants comparing notes afterward: stability is a no regrets contract, and it is checkable: count the blocking pairs. Third, the market repeats: annual matches, term systems: an unstable mechanism does not merely produce complaints, it unravels: side deals, exploding offers, commitments made years early: the documented pathology of the pre nineteen fifty two residency market that deferred acceptance was invented by practice to cure.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: stability with its theorems enumerated. Zero blocking pairs on three hundred of three hundred instances, every n squared pair checked. Membership in the exhaustively enumerated stable set on all sixty small instances. Proposer optimality and receiver pessimality verified against every stable matching that exists, not quoted from the paper. Proposals inside the n squared bound everywhere. And the propose versus receive edge measured: average partner rank two point two zero when proposing, five point two one when receiving. The weakness: stable is not fair, not welfare optimal, and not honesty proof. The mechanism is systematically partial: proposer optimal means receiver pessimal, and that three rank gap is a policy lever wearing a technical mask: the residency match switched to applicant proposing in nineteen ninety seven for exactly this reason. Receivers can profitably misreport their preferences: only proposers have truth telling as a dominant strategy. And total welfare questions belong to the Hungarian unit’s mathematics: a stable matching can be socially expensive, and the minimum cost assignment can be combustibly unstable.',
  },
  {
    section: 'tradeoffs',
    text:
      'The rivals, honestly placed. The Hungarian algorithm, live one page over: when preferences are costs and one decision maker pays them all, it certifies the minimum sum assignment: dispatch, not markets: and its optimum can be wildly unstable, pairs preferring each other to their welfare optimal partners. Irving’s algorithm: stability without the aisle: one pool, everyone ranking everyone: roommates: where the deep surprise is that a stable matching may simply fail to exist: the two sided structure was doing more work than it looked. And top trading cycles: the one sided cousin for endowed goods: houses, kidneys: point at what you want and trade along the cycles: Pareto efficient and strategy proof at once, a combination two sided stability provably cannot offer. Three adjacent markets, three different theorems: knowing which market you are standing in is the skill.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is shipping an unstable matching, and the danger is that it looks fine on announcement day. Measured here: a random matching carries ninety blocking pairs: ninety applicant program couples who both prefer each other to their assignments. Even the plausible rank greedy heuristic: seize the best mutual pairs first: carries six. Each one is a phone call waiting to happen. And in repeated markets the calls compound into the documented pre nineteen fifty two pathology: exploding offers, matches locked in two years before graduation, everyone worse off including the institutions doing the exploding. Stability is not aesthetics. It is the property that the announcement survives contact with the participants. A mechanism that leaves blocking pairs is not a lesser solution: it is kindling: and the market will eventually burn it down and rebuild deferred acceptance, the way medicine, law clerkships, and school districts each separately did.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements the proposal loop with deferred acceptance: the hold and release, the forever rejections, the proposal counter: plus the blocking pair auditor, the exhaustive stable set enumerator, and the naive rivals. The self test asserts, in order: zero blocking pairs on three hundred random instances, with proposals inside n squared. On sixty small instances: the outcome inside the enumerated stable set, proposer optimal against every member, receiver pessimal against every member, with multiple stable matchings confirmed present. The asymmetry at n twenty: proposing strictly better in aggregate, measured at three point zero one ranks. And the rivals counted: random matchings near ninety blocking pairs, rank greedy at six, deferred acceptance at zero. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
