import MclViz from '../viz/MclViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/monte_carlo_localization_particle_filter.py?raw';
import { narration } from './monte-carlo-localization-particle-filter.narration.js';

export const content = {
  given:
    'A robot on a known 100 m loop with doors at 10, 30, 37, and 70 m. It moves 2 m per step with odometry noise of 0.3 m and reads the distance to the nearest door with noise of 1 m. It starts somewhere unknown: the prior is uniform over the loop. Where is it?',
  task: 'Represent the belief by 1,000 particles (guessed positions). Each step: move every particle through the noisy motion model, weight each by the likelihood of the sensor reading from its position, and resample so that likely particles multiply and unlikely ones die. The weighted cloud is the posterior; its mean is the estimate.',
  constraint:
    'The referee is the exact Bayes filter on a 2,000-cell grid. Both converge from the uniform prior by step 6; once settled, the particle mean tracks the grid mean to 0.02 m, and both sit 0.39 m from the truth on average. With 50 particles the error is 14.04 m (the cloud misses the truth); 200 particles give 0.40 m, 5,000 give 0.39. Remove resampling and the effective sample size collapses to 1.0. Kidnap the robot at step 120 and the plain filter never recovers (41.9 m tail error); the filter that injects 2% random particles per step recovers in 18 steps to 0.4 m.',

  origins: (
    <p>
      The particle filter arrived three times: Gordon, Salmond, and
      Smith&apos;s bootstrap filter (1993), Kitagawa&apos;s Monte Carlo
      filter (1996), and Isard and Blake&apos;s Condensation for
      tracking (1998). Dellaert, Fox, Burgard, and Thrun applied it to
      robot position in <strong>1999</strong> (&quot;Monte Carlo
      localization for mobile robots,&quot; ICRA), replacing the grid
      of Markov localization, which was exact but cost a cell for every
      square of floor. Fox&apos;s KLD-sampling (2003) let the cloud
      grow and shrink with the uncertainty; the augmented filter with
      random particles that this page measures is from Thrun, Burgard,
      and Fox&apos;s <em>Probabilistic Robotics</em> (2005), and the
      kidnapped-robot test is theirs too. The museum guides Rhino and
      Minerva localized this way among crowds of visitors; every
      vacuum, warehouse cart, and delivery robot since has run a
      descendant.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>Bayes filter</strong>: belief ← predict
      through the motion model, then multiply by the likelihood of the
      reading, then normalize. Its exact form is the referee: a
      2,000-cell grid, predicted by circular convolution with the
      motion noise and updated by the same likelihood. Measured over
      200 steps from a uniform prior: the grid converges by step 6 to
      an error of <strong>0.39 m</strong>; the 1,000-particle filter
      converges by the same step to the same 0.39 m, and its mean
      tracks the grid&apos;s to 0.02 m. The Bayes rule is the same; the
      particles are a way of carrying it.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>representation and its maintenance</strong>:
      guesses instead of cells, weights instead of densities, and the
      resampling step that keeps the guesses where the probability is.
      Measured: 50 particles miss the truth by 14.04 m, 200 land at
      0.40, 1,000 at 0.39, 5,000 at 0.39: enough is enough, too few is
      fatal. Without resampling the weights collapse: the effective
      sample size falls to <strong>1.0</strong>, one particle carrying
      all the weight, and the error doubles to 0.78 m while the cloud
      stops meaning anything. And the cloud can be told to doubt
      itself: 2% random particles per step let the filter recover from
      a kidnapping in 18 steps, where the plain filter, its whole cloud
      at the old position, never does (41.9 m for the rest of the
      run).
    </p>
  ),

  picture: (
    <p>
      A thousand blindfolded scouts dropped along a circular corridor,
      each told: assume you are the robot. Every step they all shuffle
      two meters forward, a little unevenly. Then the robot calls out
      what it senses (&quot;a door about three meters away&quot;), and
      every scout who could plausibly sense that from where they stand
      raises a hand; those who could not, lower theirs. Now the roll
      call: scouts with raised hands are cloned, scouts without are
      sent home, until there are a thousand again. After a few calls
      the crowd has gathered where the robot must be, and the middle of
      the crowd is the answer. Keep a few scouts wandering at random
      and the crowd can even follow the robot if someone carries it
      away in the night; without them, the crowd stands loyally on the
      spot where the robot used to be.
    </p>
  ),

  steps: [
    <>
      <strong>Prior:</strong> 1,000 particles uniform on the loop,
      weights 1/1,000.
    </>,
    <>
      <strong>Predict:</strong> each particle moves 2 m plus Gaussian
      noise (σ 0.3), wrapped around the loop.
    </>,
    <>
      <strong>Weight:</strong> w<sub>i</sub> ∝ exp(−(z −
      d(x<sub>i</sub>))² / 2σ²) with d the nearest-door distance.
    </>,
    <>
      <strong>Resample:</strong> low-variance resampling on the
      weights; replace 2% of the cloud with random positions.
    </>,
    <>
      <strong>Check:</strong> against the 2,000-cell Bayes filter
      (0.02 m), the truth (0.39 m), and the kidnapping (18 steps).
    </>,
  ],

  signals: [
    <>
      <strong>A non-Gaussian, multimodal belief:</strong> a uniform
      prior, symmetric landmarks, a kidnapping; anything a single
      Gaussian cannot hold.
    </>,
    <>
      <strong>A nonlinear sensor model you can only evaluate:</strong>{' '}
      the nearest-door distance has no derivative worth linearizing.
    </>,
    <>
      <strong>A state space too big for a grid:</strong> 2,000 cells
      on a line, millions on a floor plan, hopeless in six dimensions.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>the grid (Markov localization)</strong>:
      Bayes&apos; rule on every cell, exact up to the cell size, 0.39 m
      here and the referee for the cloud. Its bill is the grid: 2,000
      cells for a 100 m line, and the product of the resolutions for
      every added dimension.
    </>
  ),

  strength: (
    <>
      <strong>The exact filter&apos;s answer at a cloud&apos;s price.</strong>{' '}
      0.02 m from the 2,000-cell Bayes filter once settled, 0.39 m from
      the truth, converged by step 6 from a uniform prior, with any
      sensor model you can evaluate and any shape of belief; and a
      recovery from kidnapping in 18 steps that the Gaussian filters
      cannot make at all.
    </>
  ),
  weakness: (
    <>
      <strong>Enough particles is a guess, and the cloud can lie.</strong>{' '}
      50 particles were 14 m wrong with no warning; 200 were fine. The
      cloud collapses to one particle without resampling, and with it
      the estimate is a sample, not a density: 1,000 draws cost a
      thousand sensor-model evaluations per step where a Kalman filter
      costs one matrix multiply. And the plain filter cannot recover
      from a kidnapping, which is why the 2% random particles exist.
    </>
  ),

  problem: 'Robot localization',
  problemSlug: 'robot-localization',
  rivals: [
    {
      name: 'Monte Carlo localization × particle filter',
      isThisUnit: true,
      algoName: 'Monte Carlo localization',
      cost: 'N sensor evaluations per step',
      wins: (
        <>
          <strong>0.02 m from the exact filter</strong>, any belief
          shape, any sensor, and a kidnapping survived.
        </>
      ),
      costs: (
        <>
          N is a guess (50 fails, 200 works), and every step costs N
          likelihoods.
        </>
      ),
      when: 'Global localization with an unknown start, a nonlinear sensor, or a belief that can split.',
    },
    {
      name: 'Kalman filter',
      cost: 'one matrix update per step',
      wins: (
        <>
          The live pilot on this site: exact and optimal when the
          belief is one Gaussian and the models are linear, in a
          handful of multiplies.
        </>
      ),
      costs: (
        <>
          One Gaussian only: it cannot hold a uniform prior, a
          two-lobed belief, or a kidnapping.
        </>
      ),
      when: 'Tracking from a known start with linear dynamics and a Gaussian-enough sensor.',
    },
    {
      name: 'Markov localization',
      cost: 'one cell per unit of floor',
      wins: (
        <>
          The exact Bayes filter on a grid, the referee here: 0.39 m
          with no sampling noise.
        </>
      ),
      costs: (
        <>
          2,000 cells for a line; the product of resolutions for each
          added dimension.
        </>
      ),
      when: 'Low-dimensional state and a small map where exactness is worth the cells.',
    },
    {
      name: 'Extended Kalman filter',
      cost: 'a Jacobian per step',
      wins: (
        <>
          Kalman with the nonlinear models linearized at the estimate:
          cheap, and good once localized.
        </>
      ),
      costs: (
        <>
          Still one Gaussian; a nearest-door sensor has a
          discontinuous Jacobian and a multimodal start it cannot
          express.
        </>
      ),
      when: 'Mildly nonlinear tracking from a known start.',
    },
  ],
  neverUse: {
    name: 'Importance weighting without resampling',
    why: (
      <>
        The filter with the resampling step removed is the obvious
        simplification: keep the thousand particles, just multiply
        their weights step by step. Measured, the effective sample size
        collapses to <strong>1.0</strong>: one particle carries all the
        weight, the other 999 are dead weight moved and evaluated every
        step for nothing, and the error doubles to 0.78 m while the
        cloud no longer represents a distribution at all. Resampling
        is not a refinement of the particle filter; it is what makes a
        particle filter different from a thousand independent guesses.
      </>
    ),
  },

  contest: {
    instance:
      'a 100 m loop with doors at 10, 30, 37, 70; 2 m steps (odometry σ 0.3 m), a nearest-door sensor (σ 1 m), uniform prior, 200 steps; referee: the exact Bayes filter on a 2,000-cell grid',
    columns: ['converged by', 'steady error'],
    rows: [
      {
        method: 'Exact grid filter (2,000 cells)',
        values: ['step 6', '0.39 m'],
        verdict: 'the referee: Bayes’ rule on every cell',
      },
      {
        method: 'Particle filter, 1,000 particles',
        isThisUnit: true,
        values: ['step 6', '0.39 m'],
        best: 1,
        verdict: 'tracks the grid mean to 0.02 m; minimum effective sample size 182',
      },
      {
        method: 'Particle filter, 50 particles',
        values: ['-', '14.04 m'],
        verdict: 'too few: the cloud misses the truth',
      },
      {
        method: 'Particle filter, 200 / 5,000 particles',
        values: ['-', '0.40 / 0.39 m'],
        verdict: 'enough is enough',
      },
      {
        method: 'Weights only, no resampling',
        values: ['-', '0.78 m'],
        verdict: 'effective sample size collapsed to 1.0',
      },
      {
        method: 'Kidnapped at step 120: plain vs augmented (2% random)',
        values: ['never vs 18 steps', '41.9 vs 0.4 m'],
        verdict: 'the random particles bought the recovery',
      },
    ],
    source:
      'python solutions/monte_carlo_localization_particle_filter.py prints this table and asserts: the particle mean within 1 m of the grid mean on average once settled, both within 1.5 m of the truth, convergence before step 80; 5,000 particles better than 50; effective sample size under 5 without resampling and above 20 with it; the augmented filter recovering from the kidnapping and finishing with a smaller tail error than the plain one.',
  },

  figure: (
    <Figure
      id="fig-mcl-cloud"
      aspect="16 / 7"
      caption="One step of the filter on the corridor (unrolled). Top: the particles before the update, spread by the motion noise. Middle: the sensor says the nearest door is about 3 m away, so particles near a door at that distance get high weights (tall amber bars) and the rest are nearly zero. Bottom: after resampling, the cloud has multiplied where the weights were high, in two lobes because two doors fit the reading; the next steps break the tie. Measured: 0.39 m steady error, 0.02 m from the exact grid filter, convergence by step 6; 50 particles fail at 14 m; without resampling the effective sample size is 1."
      cite={{
        text: 'F. Dellaert, D. Fox, W. Burgard, S. Thrun, "Monte Carlo localization for mobile robots," IEEE ICRA 1999. DOI 10.1109/ROBOT.1999.772544. N. J. Gordon, D. J. Salmond, A. F. M. Smith, "Novel approach to nonlinear/non-Gaussian Bayesian state estimation," IEE Proc. F 140(2), 1993. S. Thrun, W. Burgard, D. Fox, Probabilistic Robotics, MIT Press 2005.',
        href: 'https://doi.org/10.1109/ROBOT.1999.772544',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="Three rows of a corridor with doors: particles spread, then weighted by a sensor reading, then resampled into two lobes near matching doors">
        {[60, 130, 200].map((y, row) => (
          <g key={row}>
            <line x1="40" y1={y} x2="600" y2={y} stroke="rgba(154,165,189,0.5)" />
            {[10, 30, 37, 70].map((d) => <rect key={d} x={40 + d * 5.6 - 2} y={y - 10} width="4" height="20" fill="#e9edf6" />)}
          </g>
        ))}
        {Array.from({ length: 60 }, (_, k) => <circle key={k} cx={40 + ((k * 37) % 100) * 5.6} cy={60 - 16 - (k % 4) * 3} r="2" fill="#5da2ff" opacity="0.7" />)}
        <text x="40" y="34" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="11">predict: every particle moves 2 m plus noise</text>
        {Array.from({ length: 60 }, (_, k) => {
          const x = (k * 37) % 100;
          const dist = Math.min(...[10, 30, 37, 70].map((d) => Math.min(Math.abs(x - d), 100 - Math.abs(x - d))));
          const w = Math.exp(-0.5 * ((3 - dist) / 1) ** 2);
          return <rect key={k} x={40 + x * 5.6 - 1.5} y={130 - 14 - w * 22} width="3" height={w * 22 + 1} fill="#f0b94b" opacity="0.85" />;
        })}
        <text x="40" y="104" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">weight: sensor says nearest door 3 m away; bars are likelihoods</text>
        {[7, 13, 27, 33, 40, 34, 67, 73, 6.5, 13.5, 27.5, 33.5].map((x, k) => Array.from({ length: 5 }, (_, j) => <circle key={`${k}-${j}`} cx={40 + (x + (j - 2) * 0.4) * 5.6} cy={200 - 16 - (j % 3) * 3} r="2" fill="#5da2ff" opacity="0.8" />))}
        <text x="40" y="174" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="11">resample: the cloud gathers where the weights were, at every door 3 m fits</text>
        <text x="40" y="244" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">measured: 0.39 m steady error, 0.02 m from the exact grid, converged by step 6</text>
        <text x="40" y="262" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">50 particles: 14.04 m; no resampling: ESS 1.0; kidnapped: plain never recovers, 2% random particles recover in 18 steps</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'monte_carlo_localization_particle_filter.py',
  Viz: MclViz,
  narration,
};
