// The spoken lesson for puzzle sixty three, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle sixty three: Gibbs sampling, paired with coordinate wise conditional draws, for posterior sampling. Here is the puzzle. A joint distribution that you cannot draw from directly: but with a gift attached: each single coordinate, given all the others, is an easy, exact draw. A little Gaussian. A coin flip through a sigmoid. Produce samples whose occupancy matches the joint: means, correlations, expectations: to a known accuracy. The referees on this page are unusually strict for a randomized method: a bivariate Gaussian whose moments and even whose chain autocorrelation are known in closed form, and a four by four Ising lattice whose sixty five thousand five hundred thirty six states are exhaustively enumerated for exact expectations.',
  },
  {
    section: 'origins',
    text:
      'Two brothers, Stuart and Donald Geman, published this in nineteen eighty four, for cleaning noisy images. Their move was to treat pixels as spins in a lattice and denoising as sampling: resample each site from its conditional given its neighbors, over and over, and read the restored image off the chain. They named the sampler for Josiah Willard Gibbs, the physicist of the distributions they were drawing from: a man who died eighty one years before the algorithm that carries his name. Through the nineties it became the workhorse of Bayesian statistics: the software that carried the field was literally called BUGS: Bayesian inference Using Gibbs Sampling. This page runs the method in the Geman brothers’ own habitat: an Ising lattice, refereed by exact enumeration.',
  },
  {
    section: 'pair',
    text:
      'The algorithm owns the Markov chain frame: the same machinery as the live Metropolis Hastings unit. Propose a move, accept or reject by the ratio, and let the walk’s occupancy converge to the target. Gibbs is that frame with one proposal chosen so well that the accept step dissolves. The heuristic supplies it: propose each coordinate from its own full conditional. Work the acceptance ratio through, and everything cancels to exactly one: the conditional is the target, restricted to that line: so there is no reject branch anywhere in this page’s code. The measured acceptance column reads one point zero zero zero, against the tuned rival’s zero point four two and the untuned rival’s zero point zero one. And the accuracy follows: correlation estimated within zero point zero zero one seven of the analytic truth, three and a half times closer than well tuned Metropolis at the same budget.',
  },
  {
    section: 'picture',
    text:
      'Picture a staircase walk on a hillside. Gibbs may only step along the axes: freeze the vertical coordinate and slide to a random spot on that horizontal line, weighted by height: then freeze the horizontal and slide vertically the same way. On a round hill, the staircase strides anywhere in a step or two. Now squeeze the hill into a knife ridge running diagonally: correlation zero point nine nine five: and watch. Every allowed move is nearly perpendicular to the ridge. Each step is legal. Each is accepted. And each advances a tiny shuffle along the ridge, because the one direction that matters is exactly the direction the staircase cannot take. Acceptance one point zero. Progress: one ninety fourth. Keeping those two numbers apart is this unit’s deepest lesson.',
  },
  {
    section: 'run',
    text:
      'Here is the run. Cycle the coordinates: draw x fresh from its conditional given y, then y given the new x. On the Gaussian those conditionals are little Gaussians centered at rho times the other coordinate. On the Ising lattice, each spin flips up with probability given by a sigmoid of twice beta times the neighbor sum. Never reject: the ratio is identically one. Burn the warm up, then read expectations off the trajectory. And price the mixing honestly, because here it has a closed form: the x chain is autoregressive with coefficient rho squared, so the mixing time is one plus rho squared over one minus rho squared. Measured on this page: lag one autocorrelation zero point three six zero five against the predicted zero point three six, and at high correlation, zero point nine nine zero zero against zero point nine nine: the theory matched to the fourth decimal.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, the conditionals are easy and the joint is not: conjugate Bayesian models, graphical models, lattices: each variable given its neighbors is a textbook draw even when the whole is intractable. Second, you want no tuning surface: no step size, no proposal scale: this page prices the Metropolis dial at three and a half times the error when set well and ten times when set badly: Gibbs deletes the dial. Third, the coordinates are weakly coupled: the mixing law is the guardrail: the time constant grows like one over one minus rho squared, so check the coupling before you trust any chain length.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: no dials, no rejections, and a referee on every claim. Moments within two percent of analytic truth. Correlation error zero point zero zero one seven, against zero point zero zero five nine for well tuned Metropolis and zero point zero one seven one for the frozen version, all at equal budgets. The mixing law matched at both correlations: two point one sweeps against theory’s two point one, and one hundred ninety nine against two hundred. And on the Ising lattice, the sampler against exhaustive enumeration of all sixty five thousand five hundred thirty six states: magnetization zero point four eight against zero point four seven seven nine exact, energy minus eleven point three three against minus eleven point three one. The weakness is one sentence with a measured number: acceptance is not progress. At correlation zero point nine nine five, every draw is still accepted and the chain still crawls ninety four times slower. The staircase cannot walk diagonally. Strong coupling demands blocking correlated coordinates into one joint draw, reparameterizing the model, or handing the geometry to a gradient sampler.',
  },
  {
    section: 'tradeoffs',
    text:
      'The rivals, honestly priced. Metropolis Hastings, the live parent frame: works on any density you can evaluate up to a constant, no conditionals required: and pays for that generality with the acceptance dial this page measures. Hamiltonian Monte Carlo follows gradients along the very ridge that defeats the staircase: modern samplers, NUTS and Stan, default to it for continuous, correlated posteriors: at the price of differentiability and leapfrog tuning, and discrete spins need not apply. And slice sampling is the tuning free cousin for a single awkward coordinate: draw uniformly from the region under the density curve: the standard patch inside a Gibbs sweep when one conditional refuses to be a textbook draw. The composition is the practical takeaway: real samplers are hybrids: Gibbs over the graph, slice for the stubborn coordinate, Hamiltonian dynamics for the correlated continuous block.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is reading acceptance as health. Gibbs accepts everything by construction: its acceptance is exactly as high on the chain that mixes in two sweeps as on the one that needs a hundred ninety nine. A monitoring dashboard watching the acceptance rate: the right instinct for Metropolis, where one percent acceptance really does mean a frozen chain: sees a perfectly green Gibbs sampler producing garbage effective sample sizes on the ridge. Watch the autocorrelation time instead. It is the number this page derives from theory, predicts, and matches to the fourth decimal. Acceptance is a property of the proposal. Mixing is a property of the geometry. The dashboard that confuses them will page you for the healthy sampler and sleep through the sick one.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements the Gaussian Gibbs chain, the Metropolis rival with its dial, the lag one autocorrelation meter, the exact Ising enumeration, and the single site Ising sampler. The self test asserts, in order: mean, variance, and correlation of the Gaussian chain within tight bounds of the analytic answers. The autoregressive coefficient equal to rho squared at both correlations: zero point three six and zero point nine nine, matched to the fourth decimal. The mixing time formula matched at both, with the ninety four fold crawl asserted greater than fifty. The race at equal budgets: Gibbs beating the frozen rival outright. And the Ising sampler within two percent of exhaustive enumeration for both magnetization and energy. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
