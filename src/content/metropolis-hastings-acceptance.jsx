import MetropolisViz from '../viz/MetropolisViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/metropolis_hastings_acceptance.py?raw';
import { narration } from './metropolis-hastings-acceptance.narration.js';

export const content = {
  given:
    'A density you can evaluate only up to an unknown constant.',
  task: 'Samples distributed by it, and expectations under it.',
  constraint:
    'The normalizing constant is off-limits: for a Bayesian posterior it is the intractable integral over all parameters. Whatever you build must never need it, and this page proves its method never does: two chains, with and without an arbitrary constant, are bitwise identical.',

  origins: (
    <p>
      Los Alamos, <strong>1953</strong>: Metropolis, the two Rosenbluths,
      and the two Tellers needed equations of state for interacting hard
      disks on MANIAC I, and invented sampling-by-wandering (Arianna
      Rosenbluth wrote the implementation; Marshall Rosenbluth did the
      derivation). Hastings generalized the acceptance rule to asymmetric
      proposals in <strong>1970</strong>. The Bayesian revolution of the
      1990s (BUGS, then Stan) turned the trick into the workhorse of
      applied statistics, and its descendants (Hamiltonian Monte Carlo,
      NUTS) power it still. The 1953 rule remains the kernel inside all
      of them.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>chain</strong>. Wander the space by local
      proposals, and let the answer be the <em>long-run occupancy</em> of
      the walk, not any single state. The design condition is detailed
      balance: probability flow i→j must equal flow j→i under the
      target, and then the target is stationary: the chain, run long
      enough, forgets its start and breathes with π. This page checks
      that condition <em>term by term</em>, on all 144 state pairs of an
      exact discrete chain, then confirms convergence twice more: by
      power iteration (pure linear algebra, no randomness) and by a
      300,000-step simulation landing within 0.003 of π.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>acceptance ratio</strong>: take the proposed
      move with probability min(1, π(y)/π(x)). One formula, two miracles.
      First, it makes detailed balance hold for <em>any</em> target with
      no knowledge beyond pointwise evaluation. Second, the unknown
      constant <em>cancels in the ratio</em>: proven here by running the
      same seeded chain with and without an arbitrary constant and
      asserting the outputs identical to the bit. Uphill moves always
      taken; downhill moves taken in proportion: the walk samples, not
      optimizes.
    </p>
  ),

  picture: (
    <p>
      A restaurant critic covering a city without a map of it. Each
      evening they consider a nearby restaurant: if it is better, they
      go; if worse, they still go sometimes, in proportion to how much
      worse: enough wandering, and the fraction of evenings spent at
      each table settles into the city&apos;s true quality distribution,
      though nobody ever computed the citywide total. The step size is
      the critic&apos;s ambition: cross-town leaps get vetoed too often
      (5% acceptance, measured), same-block shuffles revisit one
      neighborhood forever (26 mode crossings in 100,000 nights), and
      the tuned middle explores everything.
    </p>
  ),

  steps: [
    <>
      <strong>Propose:</strong> y = x + Gaussian(0, σ): symmetric, so the
      Hastings correction vanishes.
    </>,
    <>
      <strong>Score the ratio:</strong> log π̃(y) − log π̃(x): the
      unknown constant is already gone.
    </>,
    <>
      <strong>Accept</strong> with probability min(1, e^Δ): uphill
      always, downhill proportionally; on rejection, the chain{' '}
      <em>re-records</em> the current state (forgetting this biases
      everything).
    </>,
    <>
      <strong>Tune σ</strong> toward moderate acceptance: ~50% here
      (theory says 0.44 for 1-D, 0.234 in high dimension): the measured
      dial below is the whole argument.
    </>,
    <>
      <strong>Diagnose before trusting:</strong> effective sample size,
      not raw length: 100,000 steps carried only 110 effective samples
      at σ = 0.1.
    </>,
  ],

  signals: [
    <>
      <strong>Unnormalized densities:</strong> Bayesian posteriors,
      energy-based models, Boltzmann weights: anywhere Z is an integral
      nobody can do.
    </>,
    <>
      <strong>Pointwise evaluation is all you have:</strong> no
      gradients, no conditional structure: the ratio needs two calls per
      step and nothing else.
    </>,
    <>
      <strong>Expectations, not the mode:</strong> you want posterior
      means, intervals, and probabilities: the chain&apos;s occupancy IS
      the estimate.
    </>,
  ],
  baseline: (
    <>
      The honest baseline within the pair is a <strong>mistuned
      dial</strong>: σ = 0.1 accepts 96.9% of moves and delivers 110
      effective samples per 100,000 steps, with 26 mode crossings: a
      chain that looks busy and has learned one hill. Acceptance rate
      alone is a vanity metric: the tuned σ = 2.4 accepts half as often
      and carries <strong>37×</strong> the effective samples.
    </>
  ),

  strength: (
    <>
      <strong>Universal, constant-free, and honest about its own
      error.</strong> Any pointwise-evaluable target, discrete or
      continuous (the exact chain, the bimodal mixture, and a Beta
      posterior all verified here); Z proven irrelevant bitwise;
      posterior mean 0.6671 against the exact 0.6667. And the diagnosis
      travels with it: ESS by batch means tells you what your 100,000
      steps were actually worth.
    </>
  ),
  weakness: (
    <>
      <strong>Correlation, tuning, and multimodality.</strong> Samples
      arrive correlated (4% efficiency even tuned, here); the dial must
      be tuned per problem; and separated modes are the classic failure:
      the timid chain crossed 26 times in 100,000 steps. In one
      dimension a reckless jumper partially compensates (ESS 2,493 at 5%
      acceptance, an honest surprise kept on this page): but dimension
      executes it: the same σ = 50 accepts 0.00% at d = 6. Gradients
      (HMC) buy mobility when dimension grows.
    </>
  ),

  problem: 'Posterior sampling',
  problemSlug: 'posterior-sampling',
  rivals: [
    {
      name: 'Metropolis-Hastings × acceptance ratio',
      isThisUnit: true,
      algoName: 'Metropolis-Hastings',
      cost: 'O(1) evals/step',
      wins: (
        <>
          Works on anything you can evaluate: <strong>ESS 4,047</strong>{' '}
          per 100K on the bimodal target, exact-chain referee passed,
          Z-independence proven bitwise.
        </>
      ),
      costs: (
        <>
          Correlated output, a dial that needs tuning, and mode-hopping
          that dies as modes separate or dimension grows.
        </>
      ),
      when: 'The default first tool for any unnormalized target: and the kernel inside almost everything fancier.',
    },
    {
      name: 'Gibbs sampling × full-conditional draws',
      algoName: 'Gibbs sampling',
      cost: 'O(1) conditionals/step',
      wins: (
        <>
          No tuning and no rejections: every move accepted, because each
          coordinate is drawn from its exact conditional.
        </>
      ),
      costs: (
        <>
          Needs those conditionals in closed form, and correlated
          coordinates make its axis-aligned moves crawl.
        </>
      ),
      when: 'Hierarchical models with conjugate structure: the engine of classic BUGS.',
    },
    {
      name: 'Hamiltonian Monte Carlo × leapfrog',
      algoName: 'Hamiltonian Monte Carlo',
      cost: 'O(grad) per step',
      wins: (
        <>
          Gradient-guided flights make distant proposals that still get
          accepted: the cure for exactly the dimensional execution
          measured here (σ = 50 at 0.00% acceptance in d = 6).
        </>
      ),
      costs: (
        <>
          Needs differentiable log-densities and its own tuning (step
          size, path length: NUTS exists to automate it).
        </>
      ),
      when: 'Continuous high-dimensional posteriors with gradients: the Stan/PyMC default.',
    },
    {
      name: 'Rejection sampling × envelope proposal',
      algoName: 'Rejection sampling',
      cost: 'O(1/acceptance)',
      wins: (
        <>
          Perfect independent samples, no correlation, no burn-in: when
          the envelope is tight, nothing is cleaner.
        </>
      ),
      costs: (
        <>
          Acceptance collapses exponentially with dimension:{' '}
          <strong>50 of 200,000</strong> at d = 6, measured (theory
          0.025%): the same budget gave MH an ESS of 8,009.
        </>
      ),
      when: 'Low dimension with a snug envelope: random variate generation, not posterior exploration.',
    },
  ],
  neverUse: {
    name: 'Envelope methods in high dimension',
    why: (
      <>
        Rejection sampling from a box envelope accepted{' '}
        <strong>50 of 200,000</strong> proposals for a 6-dimensional
        Gaussian: 0.03% measured against 0.025% theory, and the rate
        multiplies itself away with every added dimension (d = 20 sits
        near 10⁻¹⁴). The same 200,000 evaluations gave the chain an
        effective sample size of 8,009: <strong>160×</strong> the useful
        output. Volume concentrates where envelopes are empty; walking
        stays where the mass is. Reaching for iid purity in high
        dimension buys almost nothing at an exponential price.
      </>
    ),
  },

  contest: {
    instance:
      'the bimodal target 0.5·N(−3,1) + 0.5·N(3,1), unnormalized (the arbitrary constant is proven irrelevant: bitwise-identical chains); 100,000 steps per row, ESS by batch means',
    columns: ['acceptance', 'ESS / 100K', 'mode crossings'],
    rows: [
      {
        method: 'σ = 0.1 (timid)',
        values: ['96.9%', '110', '26'],
        verdict: 'busy-looking, one hill learned: acceptance is vanity',
      },
      {
        method: 'σ = 2.4 (tuned)',
        isThisUnit: true,
        values: ['49.3%', '4,047', '5,088'],
        best: 1,
        verdict: 'the dial at its theory-guided middle: 37× the timid ESS',
      },
      {
        method: 'σ = 50 (reckless)',
        values: ['5.0%', '2,493', '2,439'],
        verdict: 'survives 1-D (a landed leap teleports); executed at d = 6',
      },
    ],
    source:
      'python solutions/metropolis_hastings_acceptance.py prints this table and asserts: detailed balance verified on all 144 pairs of an exact 12-state chain, with power iteration and a 300,000-step simulation both landing on π (errors 1e-10 and 0.003); Z-independence by bitwise-identical seeded chains; bimodal moments (mean −0.036, E[X²] 9.98, P(X>0) 0.495) against exact values; the Beta(8,4) coin posterior matched to 4 decimals; the dial orderings; rejection sampling’s 6-d collapse (50/200,000, theory 0.025%) against MH’s ESS 8,009; and the reckless σ’s 0.00% acceptance at d = 6.',
  },

  figure: (
    <Figure
      id="fig-mh-balance"
      aspect="16 / 7"
      caption="Detailed balance, the design condition: flow i→j equals flow j→i under the target, and then the target is stationary. The acceptance ratio min(1, π(y)/π(x)) manufactures this for any target from pointwise evaluations alone, with the normalizing constant cancelling. This page does not cite the balance: it verifies all 144 terms of an exact chain, then watches occupancy converge to π by algebra and by simulation."
      cite={{
        text: 'Metropolis, Rosenbluth, Rosenbluth, Teller & Teller, "Equation of State Calculations by Fast Computing Machines", J. Chem. Phys. 21, 1953; Hastings, Biometrika 57, 1970; optimal scaling: Roberts, Gelman & Gilks, 1997.',
        href: 'https://doi.org/10.1063/1.1699114',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="Two states exchanging balanced probability flow, and the acceptance rule that creates the balance">
        <circle cx="150" cy="110" r="34" fill="rgba(93,162,255,0.12)" stroke="#5da2ff" strokeWidth="1.5" />
        <circle cx="410" cy="110" r="22" fill="rgba(93,162,255,0.12)" stroke="#5da2ff" strokeWidth="1.5" />
        <text x="150" y="115" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="12" textAnchor="middle">π(x) big</text>
        <text x="410" y="115" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="11" textAnchor="middle">π(y) small</text>
        <path d="M 190 96 C 260 66, 330 66, 384 94" fill="none" stroke="#f0b94b" strokeWidth="2" />
        <text x="240" y="62" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">x→y: accept π(y)/π(x)</text>
        <path d="M 384 128 C 330 156, 260 156, 190 126" fill="none" stroke="#62d98a" strokeWidth="2" />
        <text x="252" y="174" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">y→x: accept 1 (uphill)</text>
        <text x="120" y="216" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="12">flow: π(x) · q · π(y)/π(x)  =  π(y) · q · 1</text>
        <text x="120" y="238" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">both sides equal π(y)·q: balance holds, Z never appears</text>
        <text x="120" y="268" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">verified here on all 144 pairs · then π recovered by algebra and by walking</text>
        <text x="480" y="60" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">q = symmetric proposal</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'metropolis_hastings_acceptance.py',
  Viz: MetropolisViz,
  narration,
};
