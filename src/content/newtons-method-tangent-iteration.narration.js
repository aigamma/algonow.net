// The spoken lesson for puzzle forty five, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle forty five: Newton’s method, paired with tangent line iteration, for root finding. Here is the puzzle. You hold a differentiable function and a starting guess. Find a root, to machine precision and beyond, in a handful of steps. The promise is quadratic convergence: the number of correct digits doubles with every iteration, and this page measures that as a literal ladder in sixty digit arithmetic: one, two, five, eleven, twenty four, forty eight. The catch is the basin: outside it, the very same formula cycles between two points forever, or runs away doubling its distance at an exact factor of minus two per step. Both failures are measured on this page, not warned about.',
  },
  {
    section: 'origins',
    text:
      'Newton described the idea around sixteen sixty nine, working on polynomials without modern notation; Raphson simplified it to the familiar iterate in sixteen ninety; and Simpson generalized it to arbitrary differentiable functions in seventeen forty: the name compresses three people into one. Its first great client was Kepler’s equation, the transcendental heart of orbital mechanics, which this page solves at comet grade eccentricity in six steps: astronomy ran on this iterate for two centuries. Today it lives inside the square root instruction of your processor, inside every implied volatility a trading desk backs out of an option price, and, applied to the derivative, inside second order optimization. In eighteen seventy nine Cayley asked the innocent question of which starting points lead to which roots. The answer, in the complex plane, is the Newton fractal: infinitely filigreed basin boundaries, discovered a century before anyone could draw them.',
  },
  {
    section: 'pair',
    text:
      'The control structure owns iterate and refine: replace the guess with a better one until the residual dies. The frame is broader than any single update rule: bisection lives in it, the secant method lives in it, fixed point iteration lives in it: and the frame’s honest questions are always the same three. How much better per step. At what cost per step. From which starting points. The heuristic supplies the tangent line, which is one answer to all three. Pretend the function is its tangent at the current guess, and jump to where that line crosses zero: x becomes x minus f of x over f prime of x. Near a simple root, the pretense is nearly true, because the function differs from its tangent by a term proportional to the error squared. So the jump lands with the square of the previous miss: digits double. The measured ladder: one, two, five, eleven, twenty four, forty eight correct digits. Six steps of arithmetic bought what bisection needs forty for.',
  },
  {
    section: 'picture',
    text:
      'Picture descending a foggy hillside toward an unseen shoreline. Bisection is a surveyor with a rope: guaranteed progress, one digit of shoreline position per three and a bit halvings, indifferent to the terrain’s mood. Newton is a hiker who looks at the slope under his feet, assumes the hill continues as a perfect ramp all the way down, and strides directly to where that ramp would meet the water. Near the shore, the hill really is ramp like, so each stride lands almost exactly, and the remaining miss squares itself away: a few strides finish the job. But stand on a ledge where the slope under your feet points the wrong way, and the same confident stride hurls you up the mountain: and from the cube root’s ledge, precisely twice as far away, every single time.',
  },
  {
    section: 'run',
    text:
      'Here is the loop. Evaluate the function and its derivative at the current guess. Jump along the tangent: x becomes x minus f over f prime. Stop when the residual falls below tolerance: five iterations for the square root of two at ten to the minus twelve. Guard the three pathologies, because none of them raises an error on its own: a derivative near zero catapults the iterate across the landscape; a cycle repeats states, detectable by remembering recent iterates; a runaway grows without bound, detectable by a distance check. And in production, bracket: Brent’s method keeps bisection’s guarantee in one hand and grabs superlinear steps with the other, which is why it is the library default. Unguarded Newton is for basins you own.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, derivatives are cheap and honest: a closed form, or automatic differentiation: the tangent is half the cost of every step, so it had better be real, not a finite difference guess. Second, a good starting point exists: a warm start from yesterday’s answer, a physical prior, the previous frame’s solution: quadratic convergence is a local promise, and warm starts are how production code stays inside it. Third, precision is the product: when you need machine epsilon in single digit iterations, Kepler solvers, volatility extraction, hardware square roots, nothing classical is faster once it is close.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: digits double, and this page measured it past what floating point can even express: the sixty digit ladder, one, two, five, eleven, twenty four, forty eight. The square root of two to ten to the minus twelve in five iterations. Kepler’s equation at eccentricity point nine in six. A cash flow’s internal rate of return in five, cross checked against bisection to nine decimals. The weakness, in two honest parts. First, the basin is the fine print: the cubic x cubed minus two x plus two, started at zero, cycles zero, one, zero, one, literally forever, asserted as state repetition; the cube root, started anywhere, obeys x becomes minus two x exactly, doubling its miss each step, asserted to the factor. Second, the evaluation ledger: each Newton step costs two evaluations, function and derivative, and the derivative free secant method, with order one point six one eight on single evaluations, beat Newton on total evaluations here, eight to eleven. Per iteration, Newton is king. Per evaluation, the secant’s golden ratio quietly wins, and this page keeps that footnote in the table.',
  },
  {
    section: 'tradeoffs',
    text:
      'Here are the measured numbers, all on the same equation, x squared equals two, to ten to the minus twelve. Bisection, from the bracket one to two: forty iterations, forty one evaluations: one digit per three point three halvings, guaranteed, and completely indifferent to the function’s character. The secant method: six iterations, eight evaluations: order one point six one eight on one evaluation per step, the per evaluation winner of the table. Newton: five iterations, eleven evaluations: order two, fewest iterations, paying two evaluations per step. And beneath the table, the ladder that no float could hold: in sixty digit decimal arithmetic, the correct digits of root two ran one, two, five, eleven, twenty four, forty eight: each rung at least double the last minus one, asserted rung by rung. The quadratic law is not an asymptotic abstraction. It is six numbers you can read.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is unguarded Newton on a function you have not met, and the gadgets make the case in three lines each. The cubic from a bad start does not diverge, does not error, does not warn: it cycles, zero to one to zero, burning the entire iteration budget while looking busy. The cube root turns the method into a doubling machine: each step exactly twice as far, on the wrong side. A nearly flat derivative catapults the guess to the horizon. All three were measured on this page, and all three are silent. The production rule costs one sentence: own the basin, or rent the bracket. Brent’s method demands only a sign change and removes the entire failure class while keeping most of the speed, which is why the solver your library ships is Brent, and the solver your textbook teaches is Newton, and both are right.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements Newton with an evaluation counter and iterate trace, bisection, and the secant method, plus the sixty digit decimal ladder using Python’s exact decimal arithmetic. The self test asserts, in order: the digit ladder doubles, rung by rung, until precision saturates. All three methods agree with the standard library square root. Bisection takes at least thirty five iterations while Newton takes at most six, and the secant’s evaluation count does not exceed Newton’s: the per evaluation footnote, enforced. The two cycle gadget repeats the literal states zero, one, zero, one, zero, one. The cube root runaway obeys next equals minus two times current, to nine digits of relative precision, on every step. Kepler’s equation at eccentricity point nine solves in at most eight iterations with residual below ten to the minus thirteen. And the cash flow’s internal rate of return agrees with an independent bisection to nine decimals. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
