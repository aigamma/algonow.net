import GibbsViz from '../viz/GibbsViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/gibbs_coordinate_conditionals.py?raw';
import { narration } from './gibbs-coordinate-conditionals.narration.js';

export const content = {
  given:
    'A joint distribution you cannot draw from directly: but whose one-coordinate conditionals, each variable given all the rest, are easy draws.',
  task: 'Samples whose occupancy matches the joint: means, correlations, expectations: to known accuracy.',
  constraint:
    'No rejections to tune, no step size to pick: cycle the coordinates and draw each from its exact conditional. The referees are analytic (a Gaussian whose moments AND whose chain autocorrelation are closed-form) and exhaustive (a 4×4 Ising model with all 65,536 states enumerated).',

  origins: (
    <p>
      Two brothers: Stuart and Donald <strong>Geman</strong>: published
      this in 1984 for Bayesian image restoration, treating pixels as
      spins in a lattice and cleaning noise by resampling each site
      from its conditional given its neighbors. They named it for{' '}
      <em>Josiah Willard Gibbs</em>, whose distributions from
      statistical mechanics they were sampling: the physicist died 81
      years before the algorithm that carries his name. It became the
      workhorse of 1990s Bayesian statistics (BUGS is
      &quot;Bayesian inference Using Gibbs Sampling&quot;), and this
      page runs it in the Gemans&apos; own habitat: an Ising lattice,
      refereed by exact enumeration.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>Markov-chain frame</strong>: the live
      Metropolis-Hastings unit&apos;s machinery: propose a move,
      accept by ratio, let occupancy converge to the target. Gibbs is
      that frame with one proposal choice so good the accept step
      dissolves: <em>there is no reject branch anywhere in this
      page&apos;s code</em>, and the measured acceptance column reads
      1.000 against tuned MH&apos;s 0.420 and untuned MH&apos;s
      0.010.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>coordinate-wise conditional draw</strong>:
      propose x from p(x | everything else), and the MH ratio cancels
      to exactly 1: the conditional <em>is</em> the target restricted
      to that line. On the Gaussian the conditionals are little
      Gaussians (x | y ~ N(ρy, 1−ρ²)); on the Ising lattice each spin
      flips by a sigmoid of its neighbors. Estimated correlation
      0.0017 from the truth: with the chain&apos;s own mixing law
      matched: lag-1 autocorrelation measured 0.3605 against the
      predicted ρ² = 0.36.
    </p>
  ),

  picture: (
    <p>
      A staircase walk on a hillside. Gibbs may only step{' '}
      <em>along the axes</em>: freeze y, slide to a random spot on
      that horizontal line weighted by height; freeze x, slide
      vertically likewise. On a round hill the staircase strides
      anywhere in a step or two. Now squeeze the hill into a knife
      ridge running diagonally: ρ = 0.995: and every allowed move is
      nearly perpendicular to the ridge. Each step is legal, each is
      &quot;accepted&quot;: and each advances a tiny shuffle along
      the ridge, because the direction that matters is exactly the
      one the staircase cannot take. Acceptance 1.000, progress 1/94th:
      the two numbers this page keeps apart.
    </p>
  ),

  steps: [
    <>
      <strong>Cycle:</strong> for each coordinate in turn, draw it
      fresh from its conditional given all the others.
    </>,
    <>
      <strong>Never reject:</strong> the conditional is the target on
      that line: the MH ratio is identically 1 (no reject branch
      exists in the file).
    </>,
    <>
      <strong>Burn and keep:</strong> discard the warm-up, then read
      expectations off the trajectory&apos;s occupancy.
    </>,
    <>
      <strong>Price the mixing:</strong> the x-chain is AR(1) with
      coefficient ρ²: τ = (1+ρ²)/(1−ρ²): measured 2.1 and 199 against
      theory 2.1 and 200.
    </>,
    <>
      <strong>Watch the ridge:</strong> strong correlation is the
      failure mode: block correlated coordinates together, or hand
      the problem to a gradient sampler.
    </>,
  ],

  signals: [
    <>
      <strong>Conditionals are easy, the joint is not:</strong>{' '}
      conjugate models, graphical models, lattices: each variable
      given its neighbors is a textbook draw.
    </>,
    <>
      <strong>You want no tuning surface:</strong> no step size, no
      proposal scale: the two MH dials this page shows costing 3.5×
      and 10× in error.
    </>,
    <>
      <strong>Coordinates are weakly coupled:</strong> the mixing law
      is the guardrail: τ grows like 1/(1−ρ²): check the coupling
      before trusting the chain length.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>direct sampling</strong> when you
      can get it (here, a Cholesky pair per draw: the gold standard
      Gibbs approaches at τ ≈ 2): and{' '}
      <strong>random-walk Metropolis-Hastings</strong> (a live unit)
      when you cannot: the same chain frame paying an acceptance rate
      and a tuning dial for its generality. Gibbs sits exactly where
      conditionals are exact draws: no dial, no waste, and the
      geometry of the target left as the only enemy.
    </>
  ),

  strength: (
    <>
      <strong>No dials, no rejections, and referees on every
      claim.</strong> Moments within 0.02 of analytic truth;
      correlation error 0.0017 vs tuned MH&apos;s 0.0059 and untuned
      MH&apos;s 0.0171 at equal budgets; the mixing law matched to
      theory at both ρ = 0.6 and ρ = 0.995; and the Ising sampler
      agreeing with exhaustive enumeration of all 65,536 states
      (|M|/16: 0.4803 vs exact 0.4779; energy −11.33 vs −11.31).
    </>
  ),
  weakness: (
    <>
      <strong>Acceptance is not progress.</strong> At ρ = 0.995 every
      draw is still accepted and the chain still crawls: mixing time{' '}
      <strong>199 sweeps</strong> against 2.1 at ρ = 0.6: a measured
      94× collapse dictated by geometry, not bugs. The staircase
      cannot walk diagonally: strongly coupled coordinates demand
      blocking (sample them jointly), reparameterization, or a
      gradient method like Hamiltonian Monte Carlo.
    </>
  ),

  problem: 'Posterior sampling',
  problemSlug: 'posterior-sampling',
  rivals: [
    {
      name: 'Gibbs × conditional draws',
      isThisUnit: true,
      algoName: 'Gibbs sampling',
      cost: '1 conditional/coordinate',
      wins: (
        <>
          <strong>Acceptance 1.000 with zero tuning:</strong> error
          0.0017 vs the tuned rival&apos;s 0.0059 at equal budgets,
          and the Ising lattice matched to exact enumeration.
        </>
      ),
      costs: (
        <>
          Needs exact conditional draws, and correlation is poison:
          τ = (1+ρ²)/(1−ρ²), measured to a 94× crawl.
        </>
      ),
      when: 'Conjugate and graphical models where each variable given the rest is a textbook draw.',
    },
    {
      name: 'Metropolis-Hastings × ratio',
      algoName: 'Metropolis-Hastings',
      cost: 'accept ratio + a dial',
      wins: (
        <>
          The live parent frame: works on <em>any</em> density you can
          evaluate up to a constant: no conditionals needed at all.
        </>
      ),
      costs: (
        <>
          The dial is real: σ = 1.2 rejects 58% and trails Gibbs 3.5×;
          σ = 12 freezes at 1% acceptance and 10×.
        </>
      ),
      when: 'Whenever a conditional is not an exact draw: the general tool Gibbs specializes.',
    },
    {
      name: 'Hamiltonian Monte Carlo',
      algoName: 'Hamiltonian Monte Carlo',
      cost: 'gradients + leapfrog',
      wins: (
        <>
          Follows the geometry the staircase cannot: gradient
          trajectories glide <em>along</em> the ρ = 0.995 ridge:
          modern samplers (NUTS, Stan) default to it.
        </>
      ),
      costs: (
        <>
          Needs differentiable densities and leapfrog tuning: discrete
          spins need not apply.
        </>
      ),
      when: 'High-dimensional continuous posteriors with real correlation: the ridge is its home.',
    },
    {
      name: 'Slice sampling',
      algoName: 'Slice sampling',
      cost: 'level-set draws',
      wins: (
        <>
          The tuning-free cousin for <em>one awkward coordinate</em>:
          draw uniformly under the density curve, no proposal scale
          anywhere.
        </>
      ),
      costs: (
        <>
          Per-coordinate it inherits the same staircase geometry, plus
          bracket-expansion bookkeeping.
        </>
      ),
      when: 'Inside a Gibbs sweep, for the one conditional that is not a textbook draw.',
    },
  ],
  neverUse: {
    name: 'Reading acceptance as health',
    why: (
      <>
        Gibbs&apos;s acceptance rate is 1.000 <em>by construction</em>:
        it is exactly as high on the chain that mixes in 2 sweeps as
        on the one that needs 199. At ρ = 0.995 this page&apos;s
        sampler accepts every single draw and still crawls 94× slower:
        the staircase steps are legal, tiny, and perpendicular to the
        only direction that matters. A monitoring dashboard that
        watches acceptance (the right instinct for the live MH unit,
        where 1% acceptance really is a frozen chain) sees a perfectly
        green Gibbs sampler producing garbage effective sample sizes.
        Watch the autocorrelation time instead: it is the number this
        page derives, predicts, and matches: acceptance is a property
        of the <em>proposal</em>; mixing is a property of the{' '}
        <em>geometry</em>.
      </>
    ),
  },

  contest: {
    instance:
      'estimate the correlation of a ρ = 0.6 bivariate Gaussian, 100,000 sweeps/steps each; referee: the analytic answer, with the mixing law itself matched to theory',
    columns: ['acceptance', '|corr error|'],
    rows: [
      {
        method: 'Gibbs conditionals',
        isThisUnit: true,
        values: ['1.000', '0.0017'],
        best: 1,
        verdict: 'no reject branch exists in the file: none is needed',
      },
      {
        method: 'MH, σ = 1.2 (tuned)',
        values: ['0.420', '0.0059'],
        verdict: 'the live unit, well tuned: a fair fight, still 3.5× behind',
      },
      {
        method: 'MH, σ = 12 (untuned)',
        values: ['0.010', '0.0171'],
        verdict: 'frozen: rejects 99% of everything: the dial Gibbs deleted',
      },
    ],
    source:
      "python solutions/gibbs_coordinate_conditionals.py prints this table and asserts: moments within 0.02/0.03 of analytic truth; lag-1 autocorrelation = ρ² measured 0.3605 vs 0.36 and 0.9900 vs 0.9900; τ = (1+ρ²)/(1−ρ²) matched at both correlations (2.1 vs 2.1; 199 vs 200) with the 94× crawl asserted > 50×; the MH race at equal budgets; and the 4×4 Ising sampler within 0.02 of exhaustive enumeration over all 65,536 states (|M|/16 exact 0.4779, energy −11.31).",
  },

  figure: (
    <Figure
      id="fig-gibbs-staircase"
      aspect="16 / 7"
      caption="The staircase and the ridge. Gibbs moves only along the axes: freeze y and redraw x from its conditional, then the reverse. On a round target the staircase strides anywhere in a couple of sweeps. On a ρ = 0.995 ridge every legal move is nearly perpendicular to the ridge direction, so the chain shuffles: acceptance 1.000, mixing time 199 sweeps, both measured. Acceptance is a property of the proposal; mixing is a property of the geometry."
      cite={{
        text: 'Geman & Geman, "Stochastic Relaxation, Gibbs Distributions, and the Bayesian Restoration of Images", IEEE TPAMI 6(6), 1984: pixels as spins, denoising as sampling; the sampler named for the physicist of the distributions it draws.',
        href: 'https://doi.org/10.1109/TPAMI.1984.4767596',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="Two targets: a round one crossed easily by axis-aligned steps and a thin diagonal ridge where the same steps barely progress">
        <text x="46" y="26" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">ρ = 0.6: the staircase strides</text>
        <ellipse cx="170" cy="140" rx="110" ry="72" fill="none" stroke="#33507a" transform="rotate(-32 170 140)" />
        <ellipse cx="170" cy="140" rx="66" ry="43" fill="none" stroke="#5da2ff" transform="rotate(-32 170 140)" />
        <polyline points="100,190 150,190 150,140 215,140 215,100 245,100" fill="none" stroke="#f0b94b" strokeWidth="2" />
        <circle cx="100" cy="190" r="4" fill="#f0b94b" />
        <circle cx="245" cy="100" r="4" fill="#62d98a" />
        <text x="46" y="252" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">τ = 2.1 sweeps (theory 2.1)</text>
        <text x="360" y="26" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">ρ = 0.995: the same staircase crawls</text>
        <ellipse cx="480" cy="140" rx="130" ry="10" fill="none" stroke="#e2606c" transform="rotate(-32 480 140)" />
        <polyline points="410,185 419,185 419,177 428,177 428,170 437,170 437,163 446,163 446,157 455,157" fill="none" stroke="#f0b94b" strokeWidth="2" />
        <circle cx="410" cy="185" r="4" fill="#f0b94b" />
        <text x="360" y="252" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">τ = 199 (theory 200) · acceptance still 1.000</text>
        <text x="46" y="278" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">measured on this page: every draw accepted in both panels · the geometry, not the proposal, sets the speed</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'gibbs_coordinate_conditionals.py',
  Viz: GibbsViz,
  narration,
};
