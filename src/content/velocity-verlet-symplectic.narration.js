// The spoken lesson for puzzle ninety one, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle ninety one: velocity Verlet, paired with symplectic time stepping, for molecular dynamics integration. Here is the puzzle. Newton’s equations, and a very long time horizon: a protein folding for nanoseconds, a solar system aging for billions of years: millions of integration steps between you and the answer. The trouble is not accuracy per step. The trouble is that most integrators secretly pump energy in, or bleed it out, a little every step, always in the same direction: and after a million steps the physics is simply gone. The method is the kick drift kick update molecular dynamics has run since nineteen sixty seven: and the referees on this page cannot be argued with. The harmonic oscillator’s closed form: energy held to three parts in ten thousand across two hundred thousand steps, while forward Euler inflated it by a factor of ten to the forty third power on the identical run. Time reversal itself: twenty thousand steps out, flip the velocities, and come home to within ten to the minus twelve. And the convergence orders, measured by halving the step: one point zero two, two point zero zero, four point zero zero: exactly the textbook numbers, produced by running code.',
  },
  {
    section: 'origins',
    text:
      'Loup Verlet, nineteen sixty seven, in Physical Review: eight hundred sixty four argon atoms interacting through a Lennard Jones potential, integrated on the computers of the day: the paper that founded practical molecular dynamics, invented the neighbor list, and gave its update rule a name. The velocity form: the one on this page, with positions and velocities synchronized: arrived with Swope and colleagues in nineteen eighty two. But the deep explanation waited two more decades: Verlet’s rule is symplectic: it preserves phase space volume exactly, the way the true flow does: and backward error analysis showed the consequence: a symplectic integrator follows the EXACT trajectory of a slightly wrong Hamiltonian, rather than a slightly wrong trajectory of the exact one. Energy cannot drift away, because a nearby conserved quantity is being genuinely conserved. That insight now carries gigayear solar system integrations, and: as the leapfrog inside Hamiltonian Monte Carlo: a great deal of modern Bayesian statistics.',
  },
  {
    section: 'pair',
    text:
      'The algorithm owns the step. Kick: advance the velocity half a step using the current force. Drift: advance the position a full step at that half step velocity. Kick again: recompute the force at the new position, finish the velocity. One force evaluation per step: R K four pays four: and second order accuracy, measured on this page at exactly two point zero zero. The heuristic is the reason the marathon survives: the update is symplectic and exactly time reversible, so the energy error cannot accumulate: it oscillates in a fixed band. Measured: across two hundred orbits of an eccentric Kepler ellipse: four hundred thousand steps: the energy error never left a band three parts in a hundred thousand wide, and angular momentum was conserved to four parts in ten to the fourteenth: machine roundoff. The counterexamples are measured too: Euler pumping by ten to the forty three: and mighty fourth order R K four leaking energy monotonically, one hundred ninety nine orbits out of two hundred: more accurate per step, wrong physics per epoch.',
  },
  {
    section: 'picture',
    text:
      'A pendulum clock and two repairmen. The careless one nudges the pendulum on every swing. Each nudge is tiny: but they all push the same way, and by evening the clock swings wildly. That is Euler. And notice: a very precise nudger who errs by a hair in the same direction each time drains the clock just as surely, only slower: that is R K four: precision is not conservation. The Verlet repairman is clumsier per touch but even handed: the symmetry of his procedure guarantees his errors alternate: push, pull, push, pull: canceling over every full swing. The clock he tends keeps slightly imperfect time: the phase drifts, the orbit precesses: but it swings with the same energy at midnight as at noon. And here is the tell: film him at work and run the film backwards: every motion is still legal. The careless repairman’s film, reversed, shows a pendulum spontaneously gaining energy from nowhere: physics that never happens, betrayed by a mirror.',
  },
  {
    section: 'run',
    text:
      'Here is the run. Kick, drift, kick: two hundred thousand oscillator steps: the energy pinned inside three parts in ten thousand of one half, forever, while the identical loop with Euler’s update ends at ten to the forty three times the starting energy. Then the mirror test, the oracle no tuning can fake: integrate the eccentric orbit twenty thousand steps forward: flip both velocity components: integrate twenty thousand more. Velocity Verlet re-arrives at its starting point within one point three times ten to the minus twelve: pure floating point roundoff: because the algorithm is exactly reversible in exact arithmetic. Euler, through the same mirror, misses its start by two point four five: on an orbit only two units wide. Then the marathon: two hundred Kepler periods: the band holds, angular momentum sits at roundoff, and the ellipse precesses slowly without ever decaying: wrong phase, right physics: which for statistical questions is precisely the right trade.',
  },
  {
    section: 'signals',
    text:
      'The signals that this pair fits. First: long horizons over conserved dynamics: molecular dynamics, orbital mechanics, plasma physics: whenever the question is statistical or structural: temperatures, distributions, stability: the invariants matter more than any single trajectory, and symplectic integrators are built to keep exactly those. Second: force evaluations dominate the budget. In molecular dynamics the force computation IS the cost: Verlet spends one per step against R K four’s four: a four fold throughput head start before accuracy even enters the argument. Third: reversibility is load bearing. Hamiltonian Monte Carlo requires a volume preserving, time reversible proposal for its detailed balance argument to hold: the leapfrog inside every H M C sampler is this page’s update, wearing a statistician’s coat: one more case of the site’s recurring pattern, where a property proved for physics turns out to be the exact hinge a different field needed.',
  },
  {
    section: 'tradeoffs',
    text:
      'Now the rivals. Runge Kutta four: the general purpose workhorse: fourth order, measured four point zero zero on this page: per step error two orders of magnitude finer than Verlet’s. For short horizons, for dynamics with no Hamiltonian: chemistry rate equations, control systems, anything driven or damped: it is the right default. But it is not symplectic, and this page measured the consequence: on the Kepler marathon its energy error marched monotonically downward for one hundred ninety nine of two hundred orbits: tiny, biased, and fatal at scale. Runge Kutta Fehlberg adds adaptivity: an embedded error estimate lets the step shrink through hard corners and stretch across easy arcs: the tool of choice when the deliverable is an accurate trajectory: a flyby, an event time. The fine print: adaptive stepping breaks the symplectic guarantee by construction: the long run band is forfeit: choose by horizon.',
  },
  {
    section: 'tradeoffs',
    text:
      'The leapfrog is not a rival so much as this page’s twin in different clothes: velocities stored at half steps, positions at whole ones: algebraically the same trajectory, the same band, the same reversibility: and the spelling that many molecular dynamics and astrophysics codebases have used for decades. Its one cost is bookkeeping: positions and velocities never coexist at the same instant, so kinetic energy diagnostics need a synchronizing half step. Choose by codebase, not by physics: the physics is identical. The strategic lesson of the whole unit sits here: integrators are not ranked on one axis. Order measures error per step. Symplecticity measures the SHAPE of the error over epochs. R K four beats Verlet on the first axis and loses the marathon on the second: and knowing which axis your problem lives on is the entire decision.',
  },
  {
    section: 'tradeoffs',
    text:
      'And the negative example: forward Euler on conservative dynamics. Measured on this page: energy times ten to the forty three in two hundred thousand steps: a mirror test miss of eleven units on an orbit two units wide. The failure is structural, not a tuning problem: each Euler step rotates phase space AND stretches it by a factor greater than one, so every oscillation pumps energy in, and shrinking the step only slows the exponential: no step size survives a million steps. What makes this the site’s cleanest negative example is that Euler passes every short test honestly: its first order convergence measured one point zero two, exactly as advertised: correct per step, categorically wrong for the horizon. And the fix costs nothing: symplectic Euler is the SAME arithmetic in a different order: update velocity first, then position with the new velocity: first order still, but banded forever. Shipping the unstable spelling when the stable one is free is a pure information failure: the kind this site exists to prevent.',
  },
  {
    section: 'code',
    text:
      'The code on this page is four integrators and their referees. Velocity Verlet, forward Euler, and R K four, in one dimension for the oscillator and two for Kepler: forty lines of physics, no libraries. The self test asserts: the oscillator’s closed form energy band held across two hundred thousand steps while Euler exceeds ten to the fortieth: the mirror test returning within ten to the minus ninth for Verlet: measured ten to the minus twelfth: and missing by more than one full unit for Euler: convergence orders inside the bands around one, two, and four: the two hundred period Kepler marathon’s band, with angular momentum inside ten to the minus eleventh: measured ten to the minus fourteenth: and R K four’s energy error growing monotonically on at least one hundred ninety of two hundred orbits: measured one hundred ninety nine. When it prints O K, you have watched the difference between accuracy and conservation: run, reversed, and banded: and you will never confuse the two axes again.',
  },
];
