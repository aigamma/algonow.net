// The spoken lesson for puzzle one hundred thirty, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle one hundred thirty: the perceptron, paired with mistake-driven updates, for linear classification. Here is the puzzle. Two hundred labeled points in the unit disk, the two classes on either side of an unknown direction, with a gap of at least point four, point two, or point one between them. Find a line that puts every point on its correct side. The method: sweep the points in a random order. When the current line gets one wrong, add the point, signed by its label, to the weights, and the label to the bias. When it gets one right, do nothing at all. Sweep again until a full pass makes no mistake. The heuristic is that silence: the line is built only from the points it got wrong, so the final separator is a sum of the mistakes, and Novikoff’s theorem bounds how many mistakes there can ever be. On this page the bound is computed from an independent search for the widest margin, sixty runs are held under it, the silence is removed to see what it was worth, and the cases where no line exists are run to the end of their rope.',
  },
  {
    section: 'origins',
    text:
      'Frank Rosenblatt published the perceptron in nineteen fifty eight, in Psychological Review, and built it as the Mark One at the Cornell Aeronautical Laboratory: a machine with potentiometers for weights and small motors to turn them. Albert Novikoff proved in nineteen sixty two that the mistake-driven rule converges after at most the square of R over gamma mistakes whenever a margin gamma exists, the bound this page measures against. Marvin Minsky and Seymour Papert’s book Perceptrons, in nineteen sixty nine, drew the limits, parity and exclusive or among them, and much of the field’s funding went with it for a decade. Yoav Freund and Robert Schapire revived the algorithm in nineteen ninety nine with the voted and averaged perceptron and the kernel trick. Michael Collins made the structured perceptron a workhorse of natural language tagging in two thousand two. And the passive-aggressive family of Crammer and colleagues, in two thousand six, turned the same mistake-driven step into a margin-constrained one.',
  },
  {
    section: 'pair',
    text:
      'The algorithm owns the update and the guarantee. On a mistake, add the label times the point to the weights, and the label to the bias. Novikoff’s theorem: if some unit vector separates the data with margin gamma, and every point has length at most R, then however the points are ordered, the number of mistakes is at most R over gamma, squared. Measured here with gamma from an independent sweep of fifty four thousand candidate directions and R equal to the square root of two: at gaps of point four, point two, and point one, the margins were point two zero three, point one zero six, and point zero five four; the bounds forty nine, one hundred seventy nine, and six hundred ninety eight; and the worst mistake counts over twenty shuffles, ten, sixteen, and twenty, every run ending with zero errors within four passes. The bound is loose by a factor of five to thirty, and it is a bound: the count never crossed it. The heuristic supplies the discipline of silence. Points on the right side leave the weights alone. That is what makes the final separator a sum of the mistaken points, what makes the bound a count of mistakes rather than a count of steps, and what makes the algorithm stop. The ablation updates on every example with the same step. On the widest-gap data, the mistake rule converged in two passes with six mistakes; the always-update rule was still twelve errors wrong after two hundred passes, dragged around by points it already had right. The same silence is the weakness: with no line to find, the rule never falls silent. Exclusive or by quadrant: twenty thousand eight hundred sixty eight mistakes in two hundred passes, ninety two of two hundred points wrong at the end, and no line does better. Ten flipped labels: five thousand one hundred thirty eight mistakes, never converged, and the last line seven wrong against the truth; the averaged perceptron, the same stream averaged over every intermediate line, zero.',
  },
  {
    section: 'picture',
    text:
      'A bouncer learning a dress code with no rulebook. Each guest who walks up is either waved through or turned away, and the manager corrects only the wrong calls. On a wrong call, the bouncer shifts the mental line a little toward that guest: turned away wrongly, the line moves to admit people like them; admitted wrongly, it moves to exclude. Right calls change nothing, and that is the point. The line is built entirely from the corrections, so the number of corrections is the whole cost. If a consistent dress code exists, the corrections run out, faster when the code is clear cut, slower when the well dressed and the badly dressed look nearly alike. If no line can express the code, the corrections never end, and the bouncer’s current opinion is just the echo of the last few guests.',
  },
  {
    section: 'run',
    text:
      'Here is the run. Start with zero weights and zero bias, shuffle the points once, and keep that order. For the next point, predict the sign of the weights dotted with the point, plus the bias. If the prediction is wrong, add the label times the point to the weights and the label to the bias; if it is right, touch nothing. Stop when a full pass makes no mistake; the line then separates every point. On this page, at a gap of point four: margin point two zero three, bound forty nine, worst of twenty shuffles ten mistakes in three passes. At a gap of point two: margin point one zero six, bound one hundred seventy nine, worst sixteen mistakes in four passes. At a gap of point one: margin point zero five four, bound six hundred ninety eight, worst twenty mistakes in four passes. Sixty runs, sixty separations, sixty counts under the bound. Then the ablation: twelve errors after two hundred passes. Then exclusive or: twenty thousand mistakes and no end. Then ten flipped labels: no end either, seven wrong on the last line, zero on the averaged one.',
  },
  {
    section: 'signals',
    text:
      'The signals that this pair fits. First: linearly separable data with a margin. The bound is finite and the run stops, and the wider the gap, the sooner. Second: streaming or online learning. One example at a time, constant memory, and an update only when wrong, which is why the perceptron survived into structured prediction and large scale text classification. Third: a baseline before anything deeper. Ten lines of code and a theorem; if this separates your data, a hidden layer was never the problem.',
  },
  {
    section: 'tradeoffs',
    text:
      'Now the rivals. The support vector machine: it finds the maximum margin line, the gamma this page had to find by a fifty four thousand direction sweep, and a soft margin handles noise. It costs a quadratic program, solved by sequential minimal optimization, far more than one addition per mistake, plus a regularization constant to choose. Reach for it when the widest margin matters and the data fits in memory. Logistic regression: probabilities rather than sides, a convex fit that converges on inseparable data too when regularized. Every example moves the fit on every pass, so it is slower per example and needs a step size. Reach for it when you need calibrated probabilities or the data is not separable. And passive-aggressive: the same online spirit with a margin built in, silent while the margin holds and an exactly sized closed form step when it is violated. It costs an aggressiveness constant, and noisy examples can force large steps. Reach for it in online learning where a margin, not just a side, must be maintained.',
  },
  {
    section: 'tradeoffs',
    text:
      'The honest weaknesses of the hero. No line, no stop. Exclusive or by quadrant cycled for two hundred passes and twenty thousand mistakes and would cycle forever, ending near half wrong because no line does better. Ten flipped labels also never converged, and the line you hold when you stop is an echo of the last mistakes: seven wrong against the truth, where averaging every intermediate line gave zero. It finds a separator, not the best one; the widest margin is the support vector machine’s job. And the guarantee is loose: the bound sat five to thirty times above the observed counts, which is fine for a proof and useless as a prediction.',
  },
  {
    section: 'tradeoffs',
    text:
      'And the negative example: updating on every example. The Hebbian instinct, measured. Fire the same update on every example, right or wrong, and on the widest gap data, which the mistake rule separates in two passes with six updates, the line is still twelve errors wrong after two hundred passes and never converges. Every correctly classified point pulls the line toward itself, so the sum drifts toward the class centroids instead of the boundary, and the drift never ends because the correct points never fall silent. The perceptron is not add the point. It is add the point only when wrong, and the theorem lives in the second half.',
  },
  {
    section: 'code',
    text:
      'The code on this page is the perceptron, its referee, and its failures in one file. A generator for two classes with a chosen gap inside the unit disk. The perceptron with the always-update switch for the ablation. The averaged perceptron of Freund and Schapire. And an independent maximum margin search over fifty four thousand directions, so the bound is never computed from the perceptron’s own answer. The self test asserts: every one of sixty runs converges with zero errors and a mistake count at most R over gamma squared; the worst counts and the bounds both grow as the gap shrinks; the always-update ablation does not converge in two hundred passes; exclusive or does not converge and ends near half wrong for both the last line and the averaged one; and with ten flipped labels the perceptron does not converge, while the averaged line has fewer errors against the true labels than the last. When it prints O K, the oldest learning algorithm still in use has been held to its own theorem sixty times over. The file would fail before it would lie to you.',
  },
];
