// The spoken lesson for puzzle one hundred thirty four, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle one hundred thirty four: Grover’s search, paired with amplitude amplification, for unstructured search. Here is the puzzle. Four thousand ninety six items, one of them marked, and the only tool an oracle that answers, is this one marked? No order, no index, no structure. Classically, a random order scan expects about two thousand forty eight oracle calls. The method: prepare an equal superposition over all the items and repeat one round about pi over four times the square root of N times. The oracle flips the sign of the marked amplitude; then the diffusion operator reflects every amplitude about the mean. Then measure. The heuristic is the geometry of that round: each one rotates the state by a fixed angle toward the marked item, so the marked probability climbs as the square of a sine, peaks after the right number of rounds, and falls again if you keep going. On this page the state vector is simulated exactly and held to the closed form at every round, the classical scan is measured beside it, and the round count is deliberately set wrong to show what the geometry predicts.',
  },
  {
    section: 'origins',
    text:
      'Lov Grover published the algorithm in nineteen ninety six, at the theory of computing conference, two years after Shor’s factoring, and it was the second result to show a quantum computer beating every classical algorithm for a natural task. Bennett, Bernstein, Brassard, and Vazirani had already proved in nineteen ninety four, before the algorithm existed, that no quantum search can beat the square root of N queries, so Grover’s method was optimal on arrival; Zalka made the constant tight in nineteen ninety nine. Boyer, Brassard, Høyer, and Tapp worked out in nineteen ninety eight the geometry used on this page: the exact success probability, the case of several marked items, and the schedule for an unknown number of them. Brassard, Høyer, Mosca, and Tapp generalized the whole thing in two thousand two to amplitude amplification of any quantum subroutine. And the algorithm has run on real hardware for a handful of qubits since nineteen ninety eight, first by nuclear magnetic resonance.',
  },
  {
    section: 'pair',
    text:
      'The algorithm owns the round and the count. Oracle: flip the marked signs. Diffusion: replace every amplitude by twice the mean minus itself. Repeat the optimal number of times, which is pi over four theta, minus one half, rounded. Measured on the exact state vector for four thousand ninety six items: fifty oracle calls to a marked probability of point nine nine nine nine, two thousand of two thousand simulated measurements hitting the marked item, against two thousand one hundred twelve calls for the classical scan. Four marked items in twenty five rounds, at point nine nine nine five. The square root law measured across seven sizes from two hundred fifty six to sixteen thousand three hundred eighty four items: optimal rounds of twelve, seventeen, twenty five, thirty five, fifty, seventy one, and one hundred, growing by about one point four per doubling, the square root of two. The heuristic supplies the geometry that says when to stop. In the plane spanned by the marked and the unmarked states, oracle then diffusion is a rotation by twice theta, where the sine of theta is the square root of k over N, so after t rounds the marked probability is exactly the square of the sine of two t plus one, times theta. The simulation agrees to two parts in a quadrillion at every round. That tells you the peak, and that the peak is a peak: at twice the optimum the probability is point zero zero zero nine, and at three times it is back above point nine nine. It tells you that the count of marked items matters: the one item schedule on four items lands at two parts in ten thousand. And it gives the fix when the count is unknown: random round counts under a cap that grows by six fifths on each failure, fifty two calls on average to a confirmed hit. The ablations are exact. The oracle alone leaves the probability at one over N forever, because a sign is invisible to measurement. The diffusion alone leaves the uniform state exactly where it was.',
  },
  {
    section: 'picture',
    text:
      'A choir of four thousand ninety six voices singing the same note at the same volume, one of them the person you are looking for. The oracle cannot point; it can only make that one voice sing a half beat out of phase. The diffusion step is the conductor telling everyone: sing at twice the average minus what you were singing. For the voices in phase, that changes almost nothing. For the out of phase voice, whose contribution was pulling the average down, it means a louder voice than before. Repeat: out of phase, reflect; out of phase, reflect. Each pass tilts the whole choir a fixed angle toward the one voice, and after about the square root of N passes it is nearly the only one you hear. Keep going and the tilt carries past it, and the voice fades again. Measure at the peak.',
  },
  {
    section: 'run',
    text:
      'Here is the run. Prepare: every amplitude equal to one over the square root of N, and theta the arcsine of the square root of k over N. Oracle: negate the amplitude of every marked item; that is one query. Diffusion: set every amplitude to twice the mean minus itself, a reflection about the mean. Repeat the optimal number of times: fifty for four thousand ninety six items and one target. Measure: the marked probability is point nine nine nine nine, and one more classical query confirms the item. On this page: the classical scan, two thousand one hundred twelve calls averaged over two thousand random orders. Grover, fifty calls, point nine nine nine nine, two thousand hits in two thousand measurements. One hundred rounds, the overshoot: point zero zero zero nine. Four marked items, twenty five rounds: point nine nine nine five. Four marked items on the one item schedule: point zero zero zero two. And the schedule for an unknown count: fifty two calls on average, every run confirmed.',
  },
  {
    section: 'signals',
    text:
      'The signals that this pair fits. First: no structure to exploit. The only handle on the data is a yes or no oracle; anything sorted or indexed beats the square root of N classically. Second: the oracle is a circuit, a predicate you can evaluate in superposition: satisfiability clauses, a hash preimage, a collision, not a lookup in classical memory. Third: quadratic is enough. The square root of N turns two to the one hundred twenty eighth into two to the sixty fourth and halves symmetric key lengths; it does not turn exponential into polynomial.',
  },
  {
    section: 'tradeoffs',
    text:
      'Now the rivals. Linear search: no hardware assumptions, no oracle circuit, one comparison per item, the classical floor for unstructured data. Two thousand one hundred twelve calls measured against fifty, and the gap grows as the square root of N. Reach for it when everything is classical, or N is small enough that two thousand calls is nothing. Quantum walk search: the same quadratic speedup when the items sit on a graph and the oracle must move locally, on grids and Johnson graphs. More machinery, and on a two dimensional grid the speedup shrinks by a logarithm; reach for it for spatial search, element distinctness, and triangle finding. And binary search: twelve queries on four thousand ninety six sorted items, four times fewer than Grover, with no quantum computer at all. It needs the data sorted or indexed and is useless on an oracle alone; reach for it whenever the structure exists.',
  },
  {
    section: 'tradeoffs',
    text:
      'The honest weaknesses of the hero. Quadratic, not exponential, and that is a ceiling, not a current limit: no version of this reaches polynomial time on hard search problems. Overshoot is real, with the probability at nine parts in ten thousand at twice the optimum. The wrong count of marked items is fatal, two parts in ten thousand, and the fix for an unknown count costs a constant factor, fifty two calls against fifty. The oracle must be a reversible circuit, and loading a classical database into it costs the N operations you were trying to save.',
  },
  {
    section: 'tradeoffs',
    text:
      'And the negative example: Grover on data that has structure. The mistake is aiming the algorithm at the wrong problem. On four thousand ninety six sorted items, binary search takes twelve queries; Grover takes fifty, and each of the fifty is a superposed evaluation on quantum hardware. The square root speedup is against the classical floor for unstructured search, and only there; against an index it is a loss of four times, on a machine you do not have. The same trap in reverse: loading an unstructured classical database into a quantum oracle costs N operations up front, which returns every one of the two thousand calls Grover saved.',
  },
  {
    section: 'code',
    text:
      'The code on this page is an exact simulation of the algorithm and its referees. The oracle, the diffusion, and the round loop on a real amplitude vector. The closed form for the success probability and the optimal round count. A sampler that measures the state. The Boyer, Brassard, Høyer, and Tapp schedule for an unknown number of marked items. And the classical scan for comparison. The self test asserts: the simulated marked probability within one part in a trillion of the closed form at every round, for one and for four marked items; fifty rounds with probability above point nine nine nine and more than one thousand nine hundred eighty hits in two thousand measurements; the classical mean within statistical error of half of N; the optimal round count growing between one point three and one point five per doubling across seven sizes; probability below one percent at twice the optimum and above ninety nine percent at three times; four marked items above point nine nine nine on their own schedule and below one half on the wrong one; the unknown count schedule under four times the square root of N over k calls; and the two ablations exact. When it prints O K, the one quantum algorithm everybody can simulate has been held to its own geometry, round by round. The file would fail before it would lie to you.',
  },
];
