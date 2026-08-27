import KalmanViz from '../viz/KalmanViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/kalman_covariance_correction.py?raw';
import { narration } from './kalman-covariance-correction.narration.js';

export const content = {
  given:
    'A state that drifts, a sensor that lies a little, and forever to run: every GPS fix, drone attitude, and rocket ascent is this problem on a loop.',
  task: 'Track the state optimally in constant memory: predict through the model, then correct toward the measurement by a gain computed from the two uncertainties: never tuned.',
  constraint:
    "The referees cannot be argued with: an independently derived Bayesian implementation (precision addition) matches the filter's posterior mean AND variance to 10⁻¹² over 300 steps; the iterated gain hits the closed-form Riccati root to 10⁻¹²; and optimality is measured, not asserted: on 400,000 steps, none of 40 fixed-gain rivals beats the Kalman MSE, and the best of them lands exactly on the gain Riccati computes.",

  origins: (
    <p>
      Rudolf Kálmán, <strong>1960</strong>, in a mechanical
      engineering journal (Journal of Basic Engineering 82): the
      recursive, state-space solution to linear filtering that
      Wiener&apos;s frequency-domain theory could not make
      practical. NASA heard the talk, and the filter navigated{' '}
      <strong>Apollo</strong> to the moon: Schmidt&apos;s team at
      Ames built the extended variant for the trip: and it has run
      in essentially every navigation system since: GPS receivers,
      aircraft, phones, rockets, robot vacuums. The 2009 National
      Medal of Science citation called it one of the most widely
      applied algorithms of the modern era: two update lines,
      derived once, running billions of times per second worldwide.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>two-step rhythm</strong>: predict the state
      and its uncertainty forward through the dynamics (x ← Fx,
      P grows by Q), then correct with the measurement&apos;s
      innovation (x ← x + K·(z − x), P shrinks). Constant memory,
      one pass, forever. Its exactness is refereed by an{' '}
      <strong>independent derivation</strong>: linear-Gaussian
      Bayes by precision addition, written separately, agreeing
      with the filter to 10⁻¹² in mean and variance at every one
      of 300 steps: two roads to one posterior.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>trust ratio</strong>: the gain
      K = P/(P+R) weighs prediction uncertainty against sensor
      noise: covariance-weighted correction, recomputed every
      step. It is not a knob: on 400,000 measured steps, a grid
      of 40 hand-picked gains found its best at α = 0.400 with
      MSE 1.56: and Riccati&apos;s closed form had already
      computed K* = 0.3904 with the same MSE, <strong>no search,
      by algebra</strong>. The dumb extremes are priced: trusting
      the sensor scores exactly R = 4.00; dead reckoning drifts
      as q·t (99 at t = 100, 412 at t = 400): the blend scores
      1.56.
    </p>
  ),

  picture: (
    <p>
      Two witnesses describe where the car went: a navigator with
      a map and the car&apos;s last heading (&quot;it should be
      about here&quot;), and a spotter squinting through fog
      (&quot;I think I see it there&quot;). A wise judge does not
      pick one: the verdict lands between them, closer to
      whichever witness has been more reliable lately: and the
      judge <em>updates the reliability scores themselves</em>{' '}
      after every round. That running bookkeeping is the whole
      filter: the verdict is the estimate, the gap between
      witnesses is the innovation, and the split ratio is the
      gain: computed from the two track records, never from taste.
      When the car suddenly swerves (a maneuver the navigator&apos;s
      map never showed), the navigator is briefly, confidently
      wrong: the honest failure this page measures.
    </p>
  ),

  steps: [
    <>
      <strong>Predict:</strong> push the state through the model;
      uncertainty grows by the process noise Q.
    </>,
    <>
      <strong>Weigh:</strong> K = P/(P+R): prediction uncertainty
      against sensor noise: the trust ratio, computed fresh.
    </>,
    <>
      <strong>Correct:</strong> move the estimate K of the way
      toward the measurement; uncertainty shrinks by (1−K).
    </>,
    <>
      <strong>Converge:</strong> the gain settles at the algebraic
      Riccati root (hit to 10⁻¹² here): steady state is closed
      form, not folklore.
    </>,
    <>
      <strong>Watch the innovation:</strong> a persistent surprise
      means the model is wrong (the measured maneuver spike):
      divergence is diagnosable, not mysterious.
    </>,
  ],

  signals: [
    <>
      <strong>Streaming fusion under noise:</strong> position from
      GPS plus velocity from wheels plus heading from a gyro:
      constant-memory blending is the shape of every navigation
      stack.
    </>,
    <>
      <strong>Both uncertainties are estimable:</strong> Q and R
      can be measured from data: then the gain is arithmetic:
      when they cannot, the filter degrades into exactly the
      hand-tuning it was built to replace.
    </>,
    <>
      <strong>Linear-Gaussian is roughly true:</strong> dynamics
      near-linear, noise near-Gaussian: then this filter is
      provably optimal: when wildly false, see the particle
      filter card.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>trusting the sensor</strong>:
      report each measurement as the state: MSE exactly R = 4.00,
      measured. Its mirror is <strong>dead reckoning</strong>:
      trust the model, never correct: drift compounding as q·t,
      measured doubling and redoubling. Every fixed blend between
      them is a hand-tuned filter: and the measured best of 40
      such tunings merely rediscovers the gain Kalman computes.
    </>
  ),

  strength: (
    <>
      <strong>Optimality you can watch being earned.</strong> The
      posterior agreeing with an independent Bayesian derivation
      to 10⁻¹² in mean and variance; the gain hitting the
      closed-form Riccati root to 10⁻¹²; 40 fixed-gain rivals on
      400,000 steps with none beating the filter and the best
      landing on Riccati&apos;s own number; the ablation priced
      at both extremes; and the 2D tracker cutting raw GPS error
      2.3× in cruise.
    </>
  ),
  weakness: (
    <>
      <strong>Optimal exactly as far as its assumptions, and
      silent about them.</strong> The measured maneuver: an
      unmodeled 90° turn: spiked the tracker&apos;s error 2.9×
      before re-convergence: the filter was confidently wrong
      while its internal P claimed all was well: model mismatch
      is the practitioner&apos;s recurring bill (watch the
      innovation sequence). Nonlinearity forces the EKF&apos;s
      linearization gamble or the particle filter&apos;s sample
      bill. Q and R must come from somewhere: garbage covariances
      produce a confidently mis-weighted blend: and multimodal
      beliefs (two hypotheses about where the target is) cannot
      live in one Gaussian at all.
    </>
  ),

  problem: 'State estimation and filtering',
  problemSlug: 'state-estimation',
  rivals: [
    {
      name: 'Kalman × trust ratio',
      isThisUnit: true,
      algoName: 'Kalman filter',
      cost: 'O(1) per step',
      wins: (
        <>
          <strong>Provably optimal</strong> for linear-Gaussian
          tracking: the gain computed, the optimum measured
          against 40 rivals, Bayes agreement to 10⁻¹².
        </>
      ),
      costs: (
        <>
          Linear-Gaussian or bust: model mismatch measured at a
          2.9× silent error spike.
        </>
      ),
      when: 'The default fusion core under every navigation stack since Apollo.',
    },
    {
      name: 'EKF × linearization',
      algoName: 'Extended Kalman filter',
      cost: 'O(1) + Jacobians',
      wins: (
        <>
          The nonlinear workhorse: linearize the dynamics at the
          current estimate each step: Apollo&apos;s actual
          navigator, and every drone&apos;s attitude filter.
        </>
      ),
      costs: (
        <>
          The linearization is a local gamble: strong curvature
          or bad initialization and it diverges without notice.
        </>
      ),
      when: 'Mild nonlinearity with a good initial fix: which is most of robotics, most of the time.',
    },
    {
      name: 'Particle filter × resampling',
      algoName: 'Particle filter',
      cost: 'O(N particles)',
      wins: (
        <>
          No linearity, no Gaussianity, no unimodality: a cloud
          of weighted hypotheses survives kidnapped-robot
          problems and split beliefs that no Gaussian can hold.
        </>
      ),
      costs: (
        <>
          Pays per particle, degenerates without careful
          resampling, and answers in samples, not closed form.
        </>
      ),
      when: 'Multimodal or wildly nonlinear estimation: localization from scratch, visual tracking.',
    },
    {
      name: 'Savitzky-Golay × local fit',
      algoName: 'Savitzky-Golay filter',
      cost: 'windowed, offline',
      wins: (
        <>
          When the whole series already exists, fit local
          polynomials through past AND future: smoothing beats
          causal filtering wherever hindsight is available.
        </>
      ),
      costs: (
        <>
          Needs the future: useless in the control loop: and
          carries no model, no uncertainty, no fusion.
        </>
      ),
      when: 'Post-hoc analysis of recorded signals: lab data, not live tracking.',
    },
  ],
  neverUse: {
    name: 'A hand-tuned constant gain shipped as a tracker',
    why: (
      <>
        The exponential smoother with α picked by eye: nudge it
        until the demo looks good, ship it: is this page&apos;s
        ablation wearing production clothes. The measurement is
        the indictment: searching 40 gains on 400,000 steps found
        the best at 0.400: the number Riccati computes in one line
        from Q and R: so at best, hand-tuning rediscovers algebra
        by labor. At worst it silently breaks: swap the sensor
        (R changes), speed up the platform (Q changes), and the
        tuned constant is now the wrong constant with no
        indicator, while the Kalman gain re-derives itself from
        the new covariances. Tuning by eye also erases the
        uncertainty estimate P: the part downstream consumers
        (outlier gates, sensor fusion, safety monitors) actually
        need. When the optimal blend is computable, shipping a
        guessed one is not simplicity: it is discarding the
        answer.
      </>
    ),
  },

  contest: {
    instance:
      'track a drifting state through noise, forever, in O(1) memory; referee: an independent Bayesian implementation, the closed-form Riccati root, and 400,000 measured steps',
    columns: ['MSE', 'nature'],
    rows: [
      {
        method: 'Trust the sensor',
        values: ['4.00', 'copies z'],
        verdict: 'MSE equals R exactly: the noise, passed through',
      },
      {
        method: 'Best of 40 fixed gains',
        values: ['1.56', 'found by search'],
        verdict: 'the grid lands on α = 0.400: labor rediscovering algebra',
      },
      {
        method: 'Kalman',
        isThisUnit: true,
        values: ['1.56', 'computed'],
        best: 0,
        verdict: 'K* = 0.3904 from the Riccati root: no search, and nothing beats it',
      },
    ],
    source:
      "python solutions/kalman_covariance_correction.py prints this table and asserts: the filter posterior equal to an independently derived precision-form Bayes in mean AND variance to 10⁻¹² over 300 steps; the iterated gain equal to the closed-form algebraic Riccati root to 10⁻¹²; on 400,000 steps, no gain in a 40-point grid beating the Kalman MSE, with the best grid point within 0.05 of K*; the sensor-only MSE equal to R within 0.1 and dead reckoning growing (99 at t=100 to 412 at t=400); and the 2D constant-velocity client cutting raw RMSE 2.3× in cruise, spiking 2.9× at an unmodeled 90° maneuver, and re-converging.",
  },

  figure: (
    <Figure
      id="fig-kalman-blend"
      aspect="16 / 7"
      caption="The trust ratio, computed rather than tuned. Predict through the model (uncertainty grows by Q), then correct toward the measurement by K = P/(P+R): the exact ratio of the two uncertainties, recomputed every step, converging to the closed-form Riccati root. The measured verdict: a 40-gain search on 400,000 steps found its best at 0.400 with MSE 1.56; the algebra had already said 0.3904, same MSE, no search. Trusting the sensor alone scores exactly R; trusting the model alone drifts as q·t; the computed blend beats every constant between them: and when the model breaks (the unmodeled maneuver), the innovation sequence is where the truth shows first."
      cite={{
        text: 'Kálmán, "A New Approach to Linear Filtering and Prediction Problems", Journal of Basic Engineering 82(1), 1960: the recursion that navigated Apollo and never stopped running.',
        href: 'https://doi.org/10.1115/1.3662552',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="Predict-correct loop with the gain as a computed balance between prediction and measurement uncertainty">
        <rect x="60" y="50" width="180" height="52" fill="rgba(93,162,255,0.15)" stroke="#5da2ff" strokeWidth="1.8" />
        <text x="78" y="72" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="12">PREDICT: x ← Fx</text>
        <text x="78" y="90" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="12">P grows by Q</text>
        <rect x="400" y="50" width="180" height="52" fill="rgba(98,217,138,0.15)" stroke="#62d98a" strokeWidth="1.8" />
        <text x="412" y="72" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="12">CORRECT: x += K·(z−x)</text>
        <text x="412" y="90" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="12">P shrinks by (1−K)</text>
        <path d="M 240 76 L 396 76" stroke="#9aa5bd" strokeWidth="1.6" />
        <path d="M 490 102 C 490 150, 150 150, 150 106" fill="none" stroke="#9aa5bd" strokeWidth="1.6" strokeDasharray="5 4" />
        <rect x="230" y="130" width="180" height="40" fill="rgba(240,185,75,0.2)" stroke="#f0b94b" strokeWidth="1.8" />
        <text x="248" y="155" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="13">K = P / (P + R)</text>
        <text x="70" y="200" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">measured: sensor-only MSE 4.00 (= R) · dead reckoning 99 → 412 (q·t drift) · Kalman 1.56</text>
        <text x="70" y="222" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">the 40-gain search lands on 0.400 · Riccati computes K* = 0.3904 · Bayes agreement to 10⁻¹²</text>
        <text x="70" y="252" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">the honest failure: an unmodeled 90° maneuver spikes error 2.9× before re-convergence</text>
        <text x="70" y="274" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">two lines, O(1) memory, running since Apollo</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'kalman_covariance_correction.py',
  Viz: KalmanViz,
  narration,
};
