// The spoken lesson for puzzle eighty two, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle eighty two: Karger’s algorithm, paired with random edge contraction, for the global minimum cut. Here is the puzzle. A connected graph, and the question reliability engineering never stops asking: what is the smallest set of edges whose loss splits the network in two? No designated source, no designated sink: the weakest seam, wherever it hides. The method sounds like a joke: destroy the graph at random, repeatedly, and trust a theorem about what survives. The referees take the joke seriously: brute force over all two to the n minus one bipartitions on one hundred graphs, with the amplified contraction required to match every one and every reported partition re counted: and the theorem itself treated as a measurable claim: twenty thousand single runs, with the success frequency required to clear its bound.',
  },
  {
    section: 'origins',
    text:
      'David Karger, nineteen ninety three, as a Stanford graduate student: an algorithm so simple it fits in a sentence, whose analysis founded a subfield. With Clifford Stein, in the Journal of the ACM, nineteen ninety six, came the recursive contraction schedule: contract only while it is safe, branch where it is dangerous: and randomized graph algorithms grew up around the idea. This page’s own build supplied a fitting anecdote: the brute force referee shipped with a bug: it never priced the cut that isolates vertex zero: and Karger promptly found a cut smaller than the quote exact answer. The defendant corrected the judge. The referee was fixed, the record kept.',
  },
  {
    section: 'pair',
    text:
      'The algorithm owns the contraction process. Pick an edge uniformly at random. Merge its two endpoints into one supernode: parallel edges are kept, because they are real evidence of connection strength: self loops are dropped, because a merged pair no longer separates. Repeat exactly n minus two times: audited on this page: five hundred runs, five hundred times n minus two merges, to the unit: and the edges still crossing between the two survivors form a cut of the original graph. Every run ends holding some cut. The heuristic is the reason to hope it is the smallest one: the minimum cut has few edges by definition: that is what minimum means: so a uniformly random draw rarely lands on one. Survive all n minus two contractions, and the minimum cut is exactly what remains. The theorem prices one run’s success at no worse than two over n times n minus one: measured here at thirty one point three percent over twenty thousand runs, against a bound of one and a half: and independent repetition amplifies at will: failure seventy percent, twenty two, zero point eight, zero point one, at budgets of one, four, sixteen, and sixty four runs: measured, monotone, compounding as advertised.',
  },
  {
    section: 'picture',
    text:
      'Picture a rumor merging a company. Each round, one random working relationship fuses two people into a faction: factions fuse onward until only two remain: and the surviving cross faction relationships are, by construction, a way to split the company in half. Now suppose two divisions are truly joined by only two cables’ worth of collaboration. Random gossip overwhelmingly flows inside the dense halves: the two fragile links are almost never the ones that fuse: so the seam survives the merger frenzy and stands exposed at the end, the only relationships left crossing. One merger spree is a lottery ticket on the seam surviving. The theorem prices the ticket. Buying n squared of them makes the lottery a near certainty: and the buying is the algorithm.',
  },
  {
    section: 'run',
    text:
      'Here is the run. Contract: one uniformly random edge fuses its endpoints, with union find doing the merging, parallel edges kept, self loops skipped when drawn. Repeat exactly n minus two times: two supernodes remain, and their crossing edges are the run’s cut. Trust the census, not the run: one run succeeds with probability at least two over n times n minus one: so repeat: R independent runs miss together with probability at most one minus p to the R: the measured curve on this page falls from seventy percent failure at one run to a tenth of a percent at sixty four. Keep the best cut seen: and revalidate it: this page re counts every reported partition against the original edges before believing anything. Twenty transparent lines, a loop counter, and a theorem: that is the entire machine.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, the cut is global, not source to sink: no distinguished pair, just the weakest seam anywhere: reliability audits, cluster splitting, community boundaries. Second, simplicity is worth variance: no flow machinery, no priority queues, nothing to certify but a loop: the teaching algorithm for the entire randomized graph family, and often the fastest thing to actually write. Third, repetition is affordable: the runs are completely independent: embarrassingly parallel across cores or machines: and the failure probability is a dial you set with the repetition count, to any target the contract demands.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: a theorem you can watch come true. One hundred graphs matched against full bipartition enumeration, partitions re counted. The success bound cleared with room to spare: thirty one percent measured against one and a half promised: the bound is worst case over graphs, and the dumbbell is friendlier than the worst. The amplification curve monotone down to a tenth of a percent. The contraction count exact. And the client’s two bridge cables named by the surviving partition, asserted edge by edge. The weakness: a lottery, honestly priced: and the bound is the contract. One run fails most of the time: seventy percent measured: the guarantee lives entirely in repetition, and budgeting by the average commits the same sin the Pollard unit prices: the tail is the specification. Plain Karger also loses asymptotically to its own descendant: Karger Stein’s recursive schedule: and to the deterministic Stoer Wagner: this unit is the idea in its purest and priciest form. And weighted graphs need weighted edge sampling: one subtlety past the uniform draw, easy to forget.',
  },
  {
    section: 'tradeoffs',
    text:
      'The rivals, honestly placed. Karger Stein: the descendant: notice that early contractions are nearly safe and late ones carry all the danger: so contract only down to n over root two, then branch into two independent continuations: repetition spent exactly where the risk lives: the same idea, scheduled cleverly, and the version production would choose. Stoer Wagner: the deterministic answer: maximum adjacency sweeps, no randomness, no failure probability at any repetition count: certainty as a feature, at the price of real machinery and poor parallelism. And the live Edmonds Karp unit: the classical road: fix a source, run a maximum flow to every other vertex, and duality certifies each answer: n minus one full flow computations for one global number: the engine to ride when flows already run in your system. The shelf’s lesson: one idea can be pure, scheduled, derandomized, or dualized: know which form the situation is asking for.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is one run, read as the answer. A single contraction run always ends holding a cut: connected looking, plausible, and on this page’s dumbbell, wrong seventy percent of the time. The failure shape is one this site has priced twice already: Space Saving’s placeholder counters, Pollard’s clock: randomized machinery returns a confident artifact whose quality lives in a distribution, and reading one sample as the answer discards the entire guarantee: which was never about a run: it was about R of them. The repetition count is not overhead to be trimmed in review. It is the algorithm. The measured curve: seventy percent to a tenth of a percent across sixty four runs: is the price list: and shipping a single run is buying zero lottery tickets and announcing the jackpot.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements the contraction run with union find, lazy self loop pruning, and a merge counter: the repetition driver keeping the best cut: the brute force bipartition referee: and the dumbbell construction with its unique known cut. The self test asserts, in order: one hundred graphs equal to full enumeration, with every reported partition re counted against the original edges. The theorem as measurement: single run success frequency over twenty thousand runs at or above the two over n n minus one bound. Exactly n minus two contractions per run, across five hundred counted runs. The amplification curve: strictly falling across budgets of one, four, sixteen, sixty four, ending at or under two percent, with the geometric decay pattern checked. And the client: the two bridges, named exactly. One build note, kept proudly: the first referee excluded the isolate vertex zero cut, and Karger beat it: when the defendant corrects the judge, fix the judge and keep the transcript. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
