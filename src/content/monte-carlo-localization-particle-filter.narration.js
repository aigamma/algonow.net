// The spoken lesson for puzzle one hundred thirty eight, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle one hundred thirty eight: Monte Carlo localization, paired with the particle filter, for robot localization. Here is the puzzle. A robot on a known loop one hundred meters around, with doors at ten, thirty, thirty seven, and seventy meters. It moves two meters per step with odometry noise of about a third of a meter, and it reads the distance to the nearest door with noise of about a meter. It starts somewhere unknown: the prior is uniform over the whole loop. Where is it? The method: represent the belief by a thousand particles, guessed positions. Each step, move every particle through the noisy motion model, weight each one by how likely the sensor reading would be from its position, and resample, so that likely particles multiply and unlikely ones die. The weighted cloud is the posterior, and its mean is the estimate. The heuristic is the particle filter itself: guesses instead of cells, weights instead of densities, and above all the resampling step, without which the cloud stops representing anything. On this page the cloud is held against the exact Bayes filter on a fine grid, the particle count is turned down until it fails, the resampling is removed, and the robot is kidnapped.',
  },
  {
    section: 'origins',
    text:
      'The particle filter arrived three times. Gordon, Salmond, and Smith’s bootstrap filter in nineteen ninety three; Kitagawa’s Monte Carlo filter in nineteen ninety six; and Isard and Blake’s Condensation algorithm for visual tracking in nineteen ninety eight. Dellaert, Fox, Burgard, and Thrun applied it to a robot’s position in nineteen ninety nine, at the robotics and automation conference, as Monte Carlo localization, replacing the grid of Markov localization, which was exact but cost a cell for every square of floor. Fox’s KLD sampling in two thousand three let the cloud grow and shrink with the uncertainty. The augmented filter with random particles that this page measures is from Thrun, Burgard, and Fox’s Probabilistic Robotics of two thousand five, and the kidnapped robot test is theirs too. The museum guide robots Rhino and Minerva localized this way among crowds of visitors, and every vacuum, warehouse cart, and delivery robot since has run a descendant.',
  },
  {
    section: 'pair',
    text:
      'The algorithm owns the Bayes filter. The belief is predicted through the motion model, multiplied by the likelihood of the reading, and normalized. Its exact form is the referee: a two thousand cell grid, predicted by circular convolution with the motion noise and updated by the same likelihood. Measured over two hundred steps from a uniform prior: the grid converges by step six to an error of point three nine meters. The thousand particle filter converges by the same step to the same point three nine meters, and its mean tracks the grid’s to two centimeters. The Bayes rule is the same; the particles are a way of carrying it. The heuristic supplies the representation and its maintenance. Guesses instead of cells, weights instead of densities, and the resampling step that keeps the guesses where the probability is. Measured: fifty particles miss the truth by fourteen meters; two hundred land at point four; a thousand at point three nine; five thousand at point three nine. Enough is enough, and too few is fatal. Without resampling the weights collapse: the effective sample size falls to one, a single particle carrying all the weight, and the error doubles to point seven eight meters while the cloud stops meaning anything. And the cloud can be told to doubt itself. Two percent random particles per step let the filter recover from a kidnapping in eighteen steps, where the plain filter, its whole cloud at the old position, never does: forty two meters wrong for the rest of the run.',
  },
  {
    section: 'picture',
    text:
      'A thousand blindfolded scouts dropped along a circular corridor, each told: assume you are the robot. Every step they all shuffle two meters forward, a little unevenly. Then the robot calls out what it senses, a door about three meters away, and every scout who could plausibly sense that from where they stand raises a hand; those who could not, lower theirs. Now the roll call: scouts with raised hands are cloned, scouts without are sent home, until there are a thousand again. After a few calls the crowd has gathered where the robot must be, and the middle of the crowd is the answer. Keep a few scouts wandering at random and the crowd can even follow the robot if someone carries it away in the night. Without them, the crowd stands loyally on the spot where the robot used to be.',
  },
  {
    section: 'run',
    text:
      'Here is the run. Prior: a thousand particles uniform on the loop, equal weights. Predict: each particle moves two meters plus Gaussian noise, wrapped around the loop. Weight: each particle’s weight is proportional to the Gaussian likelihood of the reading given the nearest door distance from that particle. Resample: low variance resampling on the weights, then replace two percent of the cloud with random positions. On this page: the grid referee and the cloud both converge by step six. Once settled, the cloud’s mean is two centimeters from the grid’s, and both are point three nine meters from the truth. Fifty particles: fourteen meters. Two hundred: point four. Five thousand: point three nine. No resampling: effective sample size one, error point seven eight. Kidnapped at step one hundred twenty to the eighty five meter mark: the plain filter never recovers; the augmented filter recovers after eighteen steps, and finishes at point four meters.',
  },
  {
    section: 'signals',
    text:
      'The signals that this pair fits. First: a belief that is not one Gaussian. A uniform prior, symmetric landmarks that leave two possibilities, a kidnapping; anything a single bell curve cannot hold. Second: a nonlinear sensor model you can only evaluate. The nearest door distance has no derivative worth linearizing, but it is trivial to compute for a guessed position, which is all the particles ask. Third: a state space too big for a grid. Two thousand cells on a line, millions on a floor plan, hopeless in six dimensions, while a thousand particles cost the same in any dimension.',
  },
  {
    section: 'tradeoffs',
    text:
      'Now the rivals. The Kalman filter, the live pilot on this site: exact and optimal when the belief is one Gaussian and the models are linear, in a handful of multiplies per step. One Gaussian only: it cannot hold a uniform prior, a two lobed belief, or a kidnapping. Reach for it when tracking from a known start with linear dynamics and a Gaussian enough sensor. Markov localization: the exact Bayes filter on a grid, the referee here, point three nine meters with no sampling noise. Its bill is the grid, two thousand cells for a line and the product of the resolutions for each added dimension; reach for it in low dimensions on a small map where exactness is worth the cells. And the extended Kalman filter: the Kalman filter with the nonlinear models linearized at the current estimate, cheap and good once localized. Still one Gaussian; the nearest door sensor has a discontinuous Jacobian, and a multimodal start it cannot express. Reach for it for mildly nonlinear tracking from a known start.',
  },
  {
    section: 'tradeoffs',
    text:
      'The honest weaknesses of the hero. Enough particles is a guess, and the cloud can lie: fifty particles were fourteen meters wrong with no warning, and two hundred were fine. Without resampling the cloud collapses to one particle. The estimate is a sample, not a density, and a thousand draws cost a thousand sensor model evaluations per step where a Kalman filter costs one matrix multiply. And the plain filter cannot recover from a kidnapping, which is why the two percent of random particles exist, and why they cost a little accuracy in the calm periods.',
  },
  {
    section: 'tradeoffs',
    text:
      'And the negative example: importance weighting without resampling. The filter with the resampling step removed is the obvious simplification: keep the thousand particles, and just multiply their weights step by step. Measured, the effective sample size collapses to one. A single particle carries all the weight; the other nine hundred ninety nine are dead weight, moved and evaluated every step for nothing; and the error doubles to point seven eight meters while the cloud no longer represents a distribution at all. Resampling is not a refinement of the particle filter. It is what makes a particle filter different from a thousand independent guesses.',
  },
  {
    section: 'code',
    text:
      'The code on this page is the filter, its referee, and the world. A simulated robot on the loop with noisy odometry and a noisy nearest door sensor, with an optional kidnapping. The particle filter with low variance resampling, a switch to turn resampling off, and a fraction of random particles to inject. The exact Bayes filter on a two thousand cell circular grid. Circular means and errors, because the corridor is a loop. The self test asserts: the particle mean within a meter of the grid mean on average once settled, both within a meter and a half of the truth, and convergence before step eighty; five thousand particles better than fifty; the effective sample size under five without resampling and above twenty with it; and the augmented filter recovering from the kidnapping with a smaller tail error than the plain one. When it prints O K, the filter under every robot that knows where it is has been held to the exact Bayes rule and shown what its cloud is for. The file would fail before it would lie to you.',
  },
];
