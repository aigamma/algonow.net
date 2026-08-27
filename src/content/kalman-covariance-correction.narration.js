// The spoken lesson for puzzle ninety seven, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle ninety seven: the Kalman filter, paired with covariance weighted correction, for linear state estimation. Here is the puzzle. A state drifts: a position, a velocity, a temperature: and a sensor reports it, noisily, forever. Track the truth through the noise, in constant memory, at streaming speed: every G P S fix, every drone attitude update, every rocket ascent is this problem running on a loop. The method is two lines: predict the state forward through the model, then correct toward the measurement: and the whole genius lives in HOW FAR to correct: a gain computed from the two uncertainties, never tuned. The referees on this page cannot be argued with. An independently derived Bayesian implementation matches the filter’s posterior mean AND variance to one part in ten to the twelfth, at every one of three hundred steps. The gain converges to the closed form root of the algebraic Riccati equation, to the same precision. And optimality is measured, not asserted: on four hundred thousand steps, forty hand picked fixed gains all fail to beat the Kalman error, and the best of them lands exactly on the number the algebra computes.',
  },
  {
    section: 'origins',
    text:
      'Rudolf Kalman, nineteen sixty, in: of all places: the Journal of Basic Engineering, a mechanical engineering venue, after the electrical engineering journals showed little interest. The paper recast Wiener’s frequency domain filtering into state space and recursion: no infinite past, no spectral factorization: just predict and correct, over and over. NASA heard the talk. Stanley Schmidt’s team at Ames adapted it: inventing the extended variant along the way: and the filter navigated Apollo to the moon on a computer with less memory than this sentence. It has run in essentially every navigation system since: G P S receivers, aircraft, phones, robot vacuums, rockets. When Kalman received the National Medal of Science, the citation called the filter one of the most widely applied algorithms of the modern era: two update lines, derived once, running billions of times per second, everywhere, right now.',
  },
  {
    section: 'pair',
    text:
      'The algorithm owns the two step rhythm. Predict: push the estimate forward through the dynamics, and let the uncertainty P grow by the process noise Q: motion makes you less sure. Correct: take the innovation: the gap between what the sensor says and what you predicted: and move the estimate part of the way across it, shrinking P as you go. Constant memory, one pass, forever. The heuristic is the trust ratio that decides how far: the gain K equals P over P plus R: prediction uncertainty against sensor noise: recomputed from the same algebra at every step. It is not a knob, and this page proves it by measurement: a grid of forty hand picked gains, run over four hundred thousand steps, found its best at zero point four zero zero with mean squared error one point five six. The Riccati equation had already computed zero point three nine zero four: same error, no search. The search rediscovered the algebra: by labor.',
  },
  {
    section: 'picture',
    text:
      'Two witnesses describe where the car went. The navigator has a map and the car’s last heading: it should be about here. The spotter squints through fog: I think I see it there. A wise judge does not choose a favorite. The verdict lands between the two claims, closer to whichever witness has been more reliable lately: and: this is the whole trick: the judge updates the reliability scores themselves after every round. That running bookkeeping IS the Kalman filter. The verdict is the estimate. The disagreement between witnesses is the innovation. The split ratio is the gain: computed from the two track records, never from taste. And when the car suddenly swerves: a maneuver the navigator’s map never showed: the navigator becomes briefly, confidently wrong, and the verdicts lurch until the scores catch up. That honest failure is measured on this page too.',
  },
  {
    section: 'run',
    text:
      'Here is the run. Predict: x forward through the model, P up by Q. Weigh: K equals P over P plus R. Correct: x moves K of the way toward the measurement, P shrinks by one minus K. Repeat forever. On this page the loop faces its referees: the posterior agrees with an independently written precision form of Bayes rule: posterior precision equals prior precision plus measurement precision: to ten to the minus twelve, in mean and in variance, step by step: two derivations, one answer. The gain’s trajectory lands on the algebraic Riccati root: a quadratic formula: to the same precision: steady state is closed form, not folklore. And the extremes are priced: trust the sensor alone and your error is exactly R: four point zero zero, measured. Trust the model alone: dead reckoning: and the error compounds like Q times T: ninety nine at time one hundred, four hundred twelve at time four hundred, measured. The computed blend: one point five six.',
  },
  {
    section: 'signals',
    text:
      'The signals that this pair fits. First: streaming fusion under noise: position from G P S, velocity from wheel encoders, heading from a gyro: whenever several imperfect sources must merge into one running belief in constant memory, this is the shape, and P: the uncertainty the filter carries alongside the estimate: is what makes principled fusion possible at all. Second: both uncertainties are estimable. Q and R can be measured from data: then the gain is arithmetic: and when they cannot be, the filter quietly degrades into exactly the hand tuning it was built to replace: knowing which regime you are in is the practitioner’s first duty. Third: linear and Gaussian are roughly true. Near linear dynamics, near Gaussian noise: then optimality is a theorem. Wildly false: a belief with two separate peaks, dynamics that fold back on themselves: and no single Gaussian can even represent the answer: the rivals section knows what to do.',
  },
  {
    section: 'tradeoffs',
    text:
      'Now the rivals, which are mostly the same idea meeting harder worlds. The extended Kalman filter handles nonlinear dynamics by linearizing at the current estimate, every step: Jacobians in place of constants: it is Apollo’s actual navigator and the attitude filter in every drone. Its price is that the linearization is a local gamble: strong curvature or a bad initial fix, and it diverges: sometimes without any internal sign. The unscented variant replaces Jacobians with a handful of deterministically chosen sigma points pushed through the true nonlinearity: better curvature handling, no derivatives, modest extra cost. The particle filter abandons the Gaussian entirely: a cloud of weighted hypothesis samples, resampled as evidence arrives: it survives multimodal beliefs: two hypotheses about where the robot is: and arbitrary nonlinearity, at a price paid per particle. The ladder is: linear, Kalman: mildly curved, E K F or U K F: wild or multimodal, particles.',
  },
  {
    section: 'tradeoffs',
    text:
      'One rival answers a different question, and telling the questions apart is the skill: the Savitzky Golay filter, and offline smoothing generally. When the whole series already exists: recorded lab data, a finished flight log: you may fit local polynomials through past AND future points, and hindsight beats any causal filter at reconstructing what happened. The Kalman filter is for the control loop, where the future has not arrived and the answer is needed now: the smoother is for afterwards. Confusing them wastes either latency or accuracy. And the honest limit of this page’s hero: the measured maneuver. An unmodeled ninety degree turn spiked the two D tracker’s error nearly three fold while the filter’s internal confidence claimed all was well: the filter is exactly as good as its model, and it does not know when the model is wrong. The practitioner’s instrument is the innovation sequence: persistent surprise means the model, not the sensor, is lying.',
  },
  {
    section: 'tradeoffs',
    text:
      'And the negative example: a hand tuned constant gain, shipped as a tracker. The exponential smoother with alpha picked by eye: nudge it until the demo looks smooth, ship it: is this page’s ablation wearing production clothes. The measurement is the indictment: forty gains searched over four hundred thousand steps, and the winner was zero point four zero zero: the very number the Riccati equation computes in one line from Q and R. At best, tuning by eye rediscovers algebra by labor. At worst it breaks silently: swap the sensor and R changes: speed up the platform and Q changes: the tuned constant is now the wrong constant, with no indicator anywhere, while the Kalman gain would simply re-derive itself from the new covariances. And the tuned smoother throws away P, the uncertainty: the very output that downstream consumers: outlier gates, fusion stages, safety monitors: actually need. When the optimal blend is computable, shipping a guessed one is not simplicity. It is discarding the answer.',
  },
  {
    section: 'code',
    text:
      'The code on this page is the whole argument. The scalar filter: five lines. The independent referee: Bayes by precision addition, derived separately, agreeing to ten to the minus twelfth. The closed form Riccati root: a quadratic formula. The forty gain grid on four hundred thousand steps. The two D constant velocity tracker with its hand rolled two by two covariance blocks, its cruise, its unmodeled maneuver, and its recovery. The self test asserts: Bayes agreement in mean and variance: the gain at the Riccati root: no fixed gain beating the filter, with the grid’s best within five hundredths of K star: the sensor only error equal to R: dead reckoning’s compounding drift: and the client’s cruise, spike, and re-convergence, each bounded. When it prints O K, you have watched the nineteen sixty theorem do what it has done every second since Apollo: turn two uncertainties into one number, and be right about it.',
  },
];
