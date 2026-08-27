// The spoken lesson for puzzle thirty six, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle thirty six: Metropolis Hastings, paired with the proposal acceptance ratio, for posterior sampling. Here is the puzzle. You hold a probability density that you can evaluate at any point, but only up to an unknown constant. Draw samples distributed according to it, and estimate expectations under it. The constraint is the unknown constant itself: for a Bayesian posterior, the normalizer is an integral over all parameters that nobody can compute. Whatever you build must never need it. And this page proves its method never does, in the strongest way available: two chains, one with an arbitrary constant added to the log density and one without, run on the same seed, and asserted identical to the bit.',
  },
  {
    section: 'origins',
    text:
      'Los Alamos, nineteen fifty three. Nicholas Metropolis, Marshall and Arianna Rosenbluth, and Augusta and Edward Teller needed equations of state for interacting particles on the MANIAC computer, and invented sampling by wandering: Marshall Rosenbluth did the derivation, and Arianna Rosenbluth wrote the implementation, one of the first substantial Monte Carlo programs ever run. Keith Hastings generalized the acceptance rule to asymmetric proposals in nineteen seventy. The Bayesian revolution of the nineteen nineties, first through the BUGS software and later Stan, turned the trick into the daily workhorse of applied statistics. Its modern descendants, Hamiltonian Monte Carlo and the No U Turn sampler, fly where this one walks, but the nineteen fifty three acceptance rule remains the kernel inside all of them.',
  },
  {
    section: 'pair',
    text:
      'The control structure owns the chain. Wander the space by local proposals, and let the answer be the long run occupancy of the walk, not any single state it visits. The design condition is called detailed balance: the probability flow from state i to state j must equal the flow from j back to i under the target distribution. When that holds, the target is stationary: the chain, run long enough, forgets where it started and breathes with pi. This page checks the condition term by term, on all one hundred forty four state pairs of an exact twelve state chain, and then confirms convergence twice more: once by power iteration, which is pure linear algebra with no randomness anywhere, and once by a three hundred thousand step simulation whose occupancy lands within three thousandths of pi. The heuristic supplies the acceptance ratio: take the proposed move with probability min of one and the ratio of the target at the proposal to the target at the current point. One formula, two miracles. It manufactures detailed balance for any target, using nothing but pointwise evaluation. And the unknown constant cancels in the ratio, which is exactly what the bitwise identical chains prove.',
  },
  {
    section: 'picture',
    text:
      'Picture a restaurant critic covering a city with no map and no directory. Each evening, the critic considers a nearby restaurant. If it is better than tonight’s, they go. If it is worse, they still go sometimes, with probability proportional to how much worse it is. Wander long enough, and the fraction of evenings spent at each table settles into the city’s true quality distribution, even though nobody ever computed the citywide total: only comparisons between pairs of restaurants were ever needed. The step size is the critic’s ambition, and the page measures all three settings. Cross town leaps get vetoed too often: five percent acceptance. Same block shuffles revisit one neighborhood forever: twenty six crossings between the city’s two halves in one hundred thousand nights. The tuned middle explores everything.',
  },
  {
    section: 'run',
    text:
      'Here is the loop. Propose: add Gaussian noise of scale sigma to the current point; the symmetry means the Hastings correction term vanishes. Score: compute the log density at the proposal minus the log density at the current point; the unknown constant has already cancelled. Accept with probability min of one and e to that difference: uphill moves always, downhill moves in proportion. On rejection, and this is the classic bug, the chain re records the current state as another sample; forgetting to do so biases every estimate. Tune sigma toward moderate acceptance, about half here; the optimal scaling literature says forty four percent for one dimension and twenty three point four percent in high dimension. And diagnose before trusting: effective sample size, not raw chain length, is the currency. One hundred thousand steps carried only one hundred ten effective samples at the timid setting.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, your density is unnormalized: Bayesian posteriors, energy based models, Boltzmann weights: anywhere the normalizer is an integral nobody can do. Second, pointwise evaluation is all you have: no gradients, no conditional structure, no special form: the ratio needs two evaluations per step and nothing else. Third, you want expectations rather than a maximum: posterior means, credible intervals, tail probabilities: the chain’s occupancy is the estimate, and the page recovers a coin flip posterior’s mean to four decimal places as the demonstration.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: universal, constant free, and honest about its own error. Any pointwise evaluable target, discrete or continuous: the exact chain, the bimodal mixture, and a Beta posterior are all verified on this page. The normalizer is proven irrelevant, bitwise. The sampled posterior mean came out point six six seven one against the exact two thirds. And the diagnosis travels with the method: effective sample size by batch means tells you what your hundred thousand steps were actually worth. The weakness: correlation, tuning, and multimodality. Samples arrive correlated: even tuned, about four percent efficiency here. The dial must be tuned per problem. Separated modes are the classic failure: the timid chain crossed between the two hills twenty six times in a hundred thousand steps. And an honest surprise, kept on the page because the measurement said so: in one dimension the reckless jumper partially survives, with an effective sample size of two thousand four hundred ninety three at five percent acceptance, because a landed leap teleports across the whole support. Dimension is what executes it: the same sigma of fifty accepts zero point zero zero percent of moves in six dimensions. When dimension grows, you buy mobility with gradients: that is Hamiltonian Monte Carlo.',
  },
  {
    section: 'tradeoffs',
    text:
      'Here are the measured numbers, on the bimodal target with modes at minus three and plus three, one hundred thousand steps per row. Sigma zero point one, the timid crawl: ninety six point nine percent acceptance, one hundred ten effective samples, twenty six mode crossings: a chain that looks busy and has learned one hill. Sigma two point four, the tuned middle: forty nine point three percent acceptance, four thousand forty seven effective samples, five thousand eighty eight crossings: thirty seven times the timid chain’s information from the same budget. Sigma fifty, the reckless jumper: five percent acceptance, two thousand four hundred ninety three effective samples, two thousand four hundred thirty nine crossings: survivable here, executed in dimension six. Behind the table stand the referees: detailed balance verified on every pair of the exact chain, power iteration and simulation both landing on pi, the mixture’s moments matching theory, and the coin posterior matching its Beta distribution to four decimals. The lesson in one sentence: acceptance rate is a vanity metric; effective samples are the currency.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is an envelope method in high dimension, and the price was measured, not imagined. Rejection sampling draws a candidate from a simple envelope and keeps it with probability proportional to the density ratio: perfect, independent samples, and in six dimensions it accepted fifty candidates out of two hundred thousand attempts. Zero point zero three percent, against a theoretical zero point zero two five: the measurement landed on the theory. The rate multiplies itself away with every added dimension: by twenty dimensions it sits near ten to the minus fourteen. The same two hundred thousand evaluations gave the walking chain an effective sample size of eight thousand nine: one hundred sixty times the useful output. The geometry behind the collapse is worth keeping: in high dimension, volume concentrates where envelopes are empty, so almost every independent dart misses. Walking stays where the mass is. Independence is a luxury priced exponentially in dimension, and the chain declines to pay it.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements the random walk chain in fifteen lines, batch means effective sample size, and every referee. The self test asserts, in order: detailed balance on all one hundred forty four pairs of the exact twelve state chain, then pi recovered both by two thousand rounds of power iteration, error below ten to the minus ten, and by a three hundred thousand step simulation, error below point zero zero eight. Z independence by bitwise identical seeded chains with and without an arbitrary constant. The bimodal moments: mean, second moment, and mass balance, against their exact values. The acceptance dial’s orderings: the tuned step beats the timid by more than three times in effective samples, with the reckless jumper’s one dimensional survival and six dimensional execution both on the record. The Beta posterior’s mean and variance to tight tolerances. And the rejection sampler’s collapse at six dimensions, fifty accepts in two hundred thousand, against the chain’s eight thousand. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
