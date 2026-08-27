// The spoken lesson for puzzle twenty, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle twenty: gradient descent, paired with Polyak momentum, for smooth minimization. Here is the puzzle. You are given a smooth convex bowl, its gradient wherever you ask, and one promise about its curvature: it bends at least mu and at most L in every direction, and the ratio, L over mu, is the condition number kappa. Here kappa is one hundred: the valley is a hundred times longer than it is wide. Your task is to find the minimizer to eight digits. And you pay per gradient evaluation, which matters, because the natural method spends most of its gradients cancelling each other against the valley walls.',
  },
  {
    section: 'origins',
    text:
      'Gradient descent is the oldest algorithm on this site: Augustin Cauchy proposed it in eighteen forty seven, to fit orbits by least squares. The pairing is Soviet. In nineteen sixty four, Boris Polyak published the heavy ball method: one extra term, reuse a fraction of the previous step, and a proof that the convergence rate improves from the condition number to its square root. In nineteen eighty three, Yuri Nesterov finished the theory with an accelerated variant carrying a matching lower bound: no method that sees only gradients can do better in the worst case. And then history folded back on itself: the nineteen eighty six backpropagation paper already carried a momentum term, and stochastic gradient descent with momentum, along with Adam, which descends from it, now trains essentially every neural network in production. Cauchy’s step, Polyak’s memory, executed trillions of times a day.',
  },
  {
    section: 'pair',
    text:
      'The control structure owns the descent contract. Step against the gradient, at a step size the curvature licenses: anything up to two over L is stable, and the tested solution walks off that cliff on purpose to show what lives past it. Under the contract, every step provably lowers the function, and the error contracts by a factor of kappa minus one over kappa plus one per step. That is a theorem, and on an ill conditioned bowl it is a theorem about zigzag: with kappa one hundred, the factor is roughly point nine eight, and the measured run needed eight hundred twenty three iterations, almost all of them spent bouncing across the valley rather than travelling along it. The heuristic adds memory. Keep a fraction beta of the previous step: x becomes x minus eta gradient, plus beta times the step you just took. Watch what that one term does in the two directions that matter. Along the valley floor, consecutive gradients agree, so the remembered steps accumulate into velocity. Across the valley walls, consecutive gradients alternate in sign, so the remembered steps cancel. One line is simultaneously an accelerator lengthwise and a shock absorber crosswise, and at the tuned beta the contraction becomes root kappa minus one over root kappa plus one: the square root of the condition number. Measured: one hundred eight iterations against eight hundred twenty three.',
  },
  {
    section: 'picture',
    text:
      'Picture a marble dropped into a long, narrow canyon. A massless marble obeys only the local slope, and in a narrow canyon the local slope points at the opposite wall, not down the canyon. So the massless marble ping pongs, wall to wall to wall, creeping toward the sea a sliver per bounce. Now give the marble mass. The wall to wall components of its motion cancel with each bounce, because they alternate; the down canyon components add, because they agree. Within a few oscillations the crosswise motion has damped itself out and the marble is coasting along the canyon floor, fast. Same canyon. Same slope information. One new property: the marble remembers which way it was already going.',
  },
  {
    section: 'run',
    text:
      'Here is the loop. First, tune from curvature: the step size is four over the square of root L plus root mu, and beta is the square of root kappa minus one over root kappa plus one; for kappa one hundred, beta is about two thirds. Second, step: the new point is the old point, minus eta times the gradient, plus beta times the difference between the old point and the one before it. That trailing term is the entire heuristic. Third, slide the window: remember the old point, adopt the new one; the whole state is two vectors, and each iteration costs exactly one gradient. Fourth, stop when the gradient norm drops below tolerance: one hundred eight iterations here, against a square root rate prediction of ninety two, and the tested solution asserts that bracket rather than hoping it. Fifth, respect the regime: beta pushed too high goes underdamped, and the ball visibly climbs mid flight; eta pushed past two over L diverges geometrically, momentum or no momentum.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, the problem is ill conditioned: long valleys, condition numbers in the hundreds or worse, which is exactly where plain descent drowns in its own zigzag. Second, gradients are affordable and Hessians are not: the dimension makes forming, storing, or factoring a d by d matrix unthinkable, which in modern machine learning is simply the standing condition. Third, the surrounding system wants a cheap, stateful iteration: minibatch streams, distributed workers, two vectors of memory and one gradient per step. When any of those fail, the rivals section has the right tool, and the measurements are blunt about it.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: the square root theorem, purchased with one line of code. The rate improves from kappa to root kappa, the measured run landed at one hundred eight iterations against the theorem’s ninety two, each step costs one gradient and two stored vectors regardless of dimension, and the same shape, made stochastic, is the workhorse of deep learning. The weakness comes in two clauses. Dials: eta and beta are tied to curvature constants you may not know, so practice runs on schedules, warmups, and trial and error. And no descent guarantee: momentum is not a descent method. Plain gradient descent decreased the function at every single step of its run, provably and measurably. The heavy ball, at optimal tuning, happened to descend monotonically here too; pushed into the underdamped regime, it measurably climbs mid flight, and still converges. The ball rolling uphill for a moment is not a bug; it is what carrying velocity means.',
  },
  {
    section: 'tradeoffs',
    text:
      'Here are the measured numbers, on one randomly rotated quadratic bowl, dimension sixty, kappa one hundred, stopping when the gradient norm falls below ten to the minus eight. Plain gradient descent: eight hundred twenty three iterations, with the rate theorem predicting about nine hundred twenty one. Gradient descent with Polyak momentum: one hundred eight, prediction ninety two: a seven point six fold speedup that was a theorem before it was a measurement. Nesterov’s accelerated gradient: one hundred seventy seven iterations, the same rate class, no faster here, and carrying something the heavy ball never will: a certificate that no first order method beats it in the worst case. Conjugate gradient: sixty iterations. Read that number again: the dimension is sixty. Finite termination, the property that conjugate gradient reaches the exact answer in at most d steps in exact arithmetic, showed up through floating point to the decimal, with no step size and no beta anywhere: every constant falls out of orthogonality. And Newton’s method: one iteration. On a quadratic, the Hessian solve lands exactly on the minimizer, and at dimension sixty the solve costs the equivalent of about eleven gradients. So on this instance, honestly, Newton wins outright: which is exactly the boundary lesson. Scale the dimension tenfold and the solve grows a thousandfold while the first order methods grow a hundredfold; at a million parameters the Hessian cannot even be stored. First order methods are not better at quadratics; they are what remains possible when dimension forecloses everything else.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never bring to this problem is gradient descent with a step size past two over L, and the reason is arithmetic rather than taste. Each step multiplies the error along the stiffest direction by the absolute value of one minus eta L. At eta equal to two point zero five over L, that factor is one point zero five: growth, compounding geometrically, while every softer direction still shrinks. The tested solution runs exactly this and watches the error climb past its starting value within three hundred steps. Divergence from an overlong step is treacherous because it does not look like failure at first: most coordinates improve while one quietly explodes. Every learning rate schedule, every warmup, every line search in the field is, at bottom, a negotiation with this single constant.',
  },
  {
    section: 'code',
    text:
      'The Python solution builds the bowl honestly: log spaced eigenvalues from one to one hundred, rotated by a random orthogonal matrix from Gram Schmidt, so no method can cheat along coordinate axes. It implements all five methods: plain descent, the heavy ball, Nesterov’s lookahead variant, conjugate gradient, and Newton via Gaussian elimination, with a matvec counter as the shared currency. The self test asserts, in order: all five land on the answer that Gaussian elimination computes independently; the two rate theorems bracket the measured iteration counts, descent within its kappa rate, momentum within its root kappa rate; conjugate gradient terminates within dimension many steps, checked at dimension eight and visible at sixty; Newton takes exactly one step; the step past two over L demonstrably diverges; plain descent is monotone at every step while the underdamped ball measurably climbs somewhere and still converges. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
