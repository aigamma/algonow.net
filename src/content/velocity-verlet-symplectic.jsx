import VerletViz from '../viz/VerletViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/velocity_verlet_symplectic.py?raw';
import { narration } from './velocity-verlet-symplectic.narration.js';

export const content = {
  given:
    "Newton's equations and a very long time horizon: a protein folding for nanoseconds, a solar system for gigayears: millions of steps between you and the answer.",
  task: 'Integrate the motion so the physics survives: kick-drift-kick each step, and let the symplectic structure keep energy errors orbiting in a band instead of marching.',
  constraint:
    "The referees cannot be argued with: the harmonic oscillator's closed form (energy held to 3×10⁻⁴ over 200,000 steps while forward Euler inflates it 10⁴³-fold on the identical run); time reversal itself (out 20,000 steps, flip velocities, home to 1.3×10⁻¹²); convergence orders measured from dt-halving (1.02 / 2.00 / 4.00); and angular momentum conserved to 4×10⁻¹⁴ across 200 orbits.",

  origins: (
    <p>
      Loup Verlet, <strong>1967</strong>: 864 Lennard-Jones argon
      atoms on a CDC machine, and the update rule that molecular
      dynamics has run ever since (Physical Review 159: the paper
      also invented the neighbor list). The velocity form arrived
      with Swope et al. (1982). The <em>why</em> came a decade
      later: Verlet&apos;s rule is <strong>symplectic</strong>: it
      preserves phase-space volume exactly, like the true flow: so
      by backward-error analysis it follows the exact trajectory of
      a slightly-wrong Hamiltonian rather than a slightly-wrong
      trajectory of the exact one. Energy cannot drift secularly,
      because a nearby conserved quantity is being conserved. The
      same insight now runs celestial mechanics (gigayear solar
      system integrations) and, as the leapfrog inside Hamiltonian
      Monte Carlo, modern Bayesian statistics.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>kick-drift-kick step</strong>: half-step the
      velocity with the current force, full-step the position,
      recompute the force, half-step the velocity again. One force
      evaluation per step (RK4 pays four), positions and
      velocities synchronized (plain leapfrog staggers them), and
      second-order accuracy: <strong>measured at exactly 2.00</strong>{' '}
      by dt-halving. It is also exactly time-reversible: flip the
      velocities and the same code retraces its own history:
      verified here to 1.3×10⁻¹² over 40,000 steps.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the reason long runs survive: the update is{' '}
      <strong>symplectic</strong>, so the energy error cannot
      accumulate: it oscillates in a fixed band: |ΔE/E| under
      3×10⁻⁵ across 200 Kepler orbits, never widening: and angular
      momentum is conserved to <strong>4×10⁻¹⁴</strong>, machine
      roundoff. The counterexamples are measured, not asserted:
      forward Euler pumps energy every step (×10⁴³ over 200,000
      oscillator steps), and even mighty RK4: fourth order,
      measured 4.00: leaks energy <em>monotonically</em>, 199 of
      200 orbits: more accurate per step, wrong physics per epoch.
    </p>
  ),

  picture: (
    <p>
      A pendulum clock and two repairmen. The careless one nudges
      the pendulum on every swing: each nudge is tiny, but they all
      push the same way, and by evening the clock is swinging
      wildly: that is Euler, and even a very precise nudger (RK4)
      who errs by a hair <em>in the same direction each time</em>{' '}
      drains the clock slowly but surely. The Verlet repairman is
      clumsy but <em>even-handed</em>: his errors alternate push
      and pull in a way that is guaranteed, by the symmetry of his
      procedure, to cancel over every full swing. The clock he
      tends keeps slightly imperfect time: the phase drifts: but it
      swings with the same energy at midnight as at noon, and if
      you film him and run the film backwards, every motion is
      still legal: which is precisely the property the careless
      repairman&apos;s film would betray.
    </p>
  ),

  steps: [
    <>
      <strong>Kick:</strong> v ← v + (dt/2)·a(x): half the
      velocity update, with the current force.
    </>,
    <>
      <strong>Drift:</strong> x ← x + dt·v: the position moves at
      the half-step velocity.
    </>,
    <>
      <strong>Kick again:</strong> recompute a(x), finish the
      velocity: one force evaluation per step, total.
    </>,
    <>
      <strong>Trust the band, not the step:</strong> per-step error
      is second order (measured 2.00), but the energy error{' '}
      <em>orbits</em>: 3×10⁻⁵ band across 200 periods, never
      widening.
    </>,
    <>
      <strong>Check with the mirror:</strong> flip velocities and
      re-run: return to start within roundoff (1.3×10⁻¹²): the
      audit any symplectic code should pass.
    </>,
  ],

  signals: [
    <>
      <strong>Long horizons, conserved quantities:</strong>{' '}
      molecular dynamics, orbital mechanics, plasma: when the
      question is statistical or structural, the invariants matter
      more than the trajectory.
    </>,
    <>
      <strong>Force evaluations dominate:</strong> one per step vs
      RK4&apos;s four: in MD the force IS the cost, and Verlet&apos;s
      economy is a 4× throughput head start.
    </>,
    <>
      <strong>Reversibility is load-bearing:</strong> Hamiltonian
      Monte Carlo needs a volume-preserving, reversible proposal
      for detailed balance: the leapfrog inside HMC is exactly this
      page&apos;s update.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>forward Euler</strong>: step
      position by velocity, velocity by force, done: and it
      multiplied the oscillator&apos;s energy by 10⁴³ in 200,000
      steps, measured. Its energy pumping is structural (each step
      spirals outward in phase space), which is why the baseline
      here is not &quot;slow&quot; but <em>wrong</em>: no dt small
      enough rescues a million-step run.
    </>
  ),

  strength: (
    <>
      <strong>Referees that cannot be argued with, all passed.</strong>{' '}
      The closed-form oscillator held to 3×10⁻⁴ over 200,000
      steps; time reversal to 1.3×10⁻¹² over 40,000; convergence
      orders measured at 1.02 / 2.00 / 4.00 exactly as theory
      states; the 200-orbit Kepler marathon&apos;s energy band
      never widening while angular momentum sat at 4×10⁻¹⁴; and
      the instructive defeat of RK4: fourth-order accuracy,
      monotone energy leak, 199 orbits of 200: precision is not
      conservation.
    </>
  ),
  weakness: (
    <>
      <strong>Second order is second order, and the magic has
      conditions.</strong> Verlet&apos;s phase drifts (the orbit
      precesses: &quot;wrong phase, right physics&quot;): when you
      need the trajectory itself to high accuracy over a short
      horizon: a spacecraft flyby, an event time: adaptive RK
      (Fehlberg) is the right tool and symplecticity is beside the
      point. The symplectic guarantee assumes a <em>fixed</em>{' '}
      step: naive adaptive stepping breaks it (the workaround,
      time-transformed integrators, is real machinery). Stiff
      systems and dissipative forces (friction, thermostats) leave
      the Hamiltonian world entirely: and stability still caps dt
      near the fastest oscillation, symplectic or not.
    </>
  ),

  problem: 'Molecular simulation',
  problemSlug: 'molecular-simulation',
  rivals: [
    {
      name: 'Velocity Verlet',
      isThisUnit: true,
      algoName: 'Velocity Verlet dynamics',
      cost: '1 force eval / step',
      wins: (
        <>
          <strong>The invariants survive</strong>: banded energy,
          roundoff angular momentum, exact reversibility: at one
          force evaluation per step.
        </>
      ),
      costs: (
        <>
          Second-order phase accuracy: the orbit precesses even as
          it refuses to decay.
        </>
      ),
      when: 'The default for MD, orbital mechanics, and any Hamiltonian run measured in millions of steps.',
    },
    {
      name: 'RK4',
      algoName: 'Runge-Kutta 4',
      cost: '4 force evals / step',
      wins: (
        <>
          Fourth order, measured 4.00: per-step error two orders
          finer: the general-purpose ODE workhorse for everything
          without a Hamiltonian.
        </>
      ),
      costs: (
        <>
          Not symplectic: its energy error marched monotonically
          for 199 of 200 measured orbits: accurate per step,
          dissipative per epoch.
        </>
      ),
      when: 'Short horizons, non-Hamiltonian dynamics, or anywhere trajectory accuracy outranks conservation.',
    },
    {
      name: 'RK-Fehlberg × adaptivity',
      algoName: 'Runge-Kutta-Fehlberg',
      cost: '6 evals, adaptive dt',
      wins: (
        <>
          Embedded error estimate, step size that shrinks through
          the hard corners and stretches across the easy arcs:
          the tool when the answer is an accurate trajectory.
        </>
      ),
      costs: (
        <>
          Adaptivity breaks the symplectic guarantee: the long-run
          band is forfeit by construction.
        </>
      ),
      when: 'Flybys, event timing, stiff patches: short-horizon precision problems, not marathons.',
    },
    {
      name: 'Leapfrog × staggered v',
      algoName: 'Leapfrog dynamics',
      cost: '1 force eval / step',
      wins: (
        <>
          Algebraically this page&apos;s twin: velocities stored at
          half-steps: identical trajectory, identical band: the
          spelling many MD and astro codes historically use.
        </>
      ),
      costs: (
        <>
          Positions and velocities never coexist at one instant:
          kinetic-energy diagnostics need care.
        </>
      ),
      when: 'Existing leapfrog codebases: the physics is the same, only the bookkeeping differs.',
    },
  ],
  neverUse: {
    name: 'Forward Euler on conservative dynamics',
    why: (
      <>
        Measured on this page: ×10⁴³ energy inflation in 200,000
        oscillator steps, a reversal miss of 11 units on an orbit
        2 units wide. The failure is structural, not a matter of
        step size: each Euler step rotates <em>and stretches</em>{' '}
        phase space by a factor √(1 + dt²ω²) &gt; 1, so every
        oscillation pumps energy in, and no dt small enough
        survives a million steps: shrinking dt only slows the
        exponential. It is the site&apos;s cleanest case of a
        method that passes every short test (first-order
        convergence: measured 1.02, exactly as advertised!) while
        being categorically wrong for the job&apos;s actual
        horizon. The fix costs nothing: symplectic Euler is the
        same arithmetic in a different order: which makes shipping
        the unstable spelling a pure information failure, the kind
        this site exists to prevent.
      </>
    ),
  },

  contest: {
    instance:
      '200 orbits of an e = 0.6 Kepler ellipse (400,000 steps); referee: the closed-form oscillator, exact invariants, and time reversal itself',
    columns: ['order', 'energy behavior'],
    rows: [
      {
        method: 'Forward Euler',
        values: ['1.02', '×10⁴³ in 200k steps'],
        verdict: 'pumps energy every step: the spiral of death',
      },
      {
        method: 'RK4',
        values: ['4.00', 'monotone leak'],
        verdict: 'accurate per step, dissipative per epoch: 199/200 orbits leaking',
      },
      {
        method: 'Velocity Verlet',
        isThisUnit: true,
        values: ['2.00', 'band 3×10⁻⁵, forever'],
        best: 1,
        verdict: 'symplectic: the error orbits, it never marches',
      },
    ],
    source:
      'python solutions/velocity_verlet_symplectic.py prints this table and asserts: the oscillator energy band under 3×10⁻³ across 200,000 Verlet steps while Euler exceeds 10⁴⁰; time reversal returning within 10⁻⁹ for Verlet (measured 1.3×10⁻¹²) and missing by over 1.0 for Euler (measured 2.45 at fine dt, 11+ at the viz dt); convergence orders in the bands 0.8-1.2 / 1.8-2.2 / 3.7-4.5 (measured 1.02 / 2.00 / 4.00); the 200-period Kepler marathon holding |ΔE/E| < 2×10⁻² (measured 3.2×10⁻⁵) with angular momentum within 10⁻¹¹ (measured 4.4×10⁻¹⁴); and RK4\'s energy error growing monotonically on at least 190 of 200 orbits (measured 199).',
  },

  figure: (
    <Figure
      id="fig-verlet-band"
      aspect="16 / 7"
      caption="Three integrators, one gravity. Euler's error compounds outward: the spiral of death, ×10⁴³ measured. RK4's fourth-order error is tiny and biased: it marches monotonically, draining the orbit: precision is not conservation. Verlet's second-order error is larger per step and structurally unbiased: symplecticity means it follows the exact physics of a slightly-wrong Hamiltonian, so the energy error orbits in a band that never widens: 3×10⁻⁵ across 200 periods, angular momentum at machine roundoff, and the whole run reversible to 10⁻¹². For marathons, the shape of the error matters more than its size."
      cite={{
        text: 'Verlet, "Computer ‘Experiments’ on Classical Fluids. I.", Physical Review 159, 1967: 864 argon atoms and the update rule molecular dynamics still runs: the symplectic explanation came two decades later.',
        href: 'https://doi.org/10.1103/PhysRev.159.98',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="Energy error over time for three integrators: Euler explodes, RK4 drifts monotonically, Verlet oscillates in a band">
        <line x1="50" y1="150" x2="610" y2="150" stroke="#9aa5bd" strokeWidth="1" strokeDasharray="3 3" />
        <text x="52" y="144" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">ΔE = 0</text>
        <path d="M 50 150 Q 200 148 320 120 T 610 30" fill="none" stroke="#e2606c" strokeWidth="2.2" />
        <text x="480" y="52" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">Euler: exponential escape</text>
        <path d="M 50 150 L 610 196" fill="none" stroke="#e2606c" strokeWidth="1.6" strokeDasharray="6 3" />
        <text x="440" y="216" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">RK4: small, monotone, fatal</text>
        <path d="M 50 150 C 80 138, 110 162, 140 150 S 200 138, 230 150 S 290 162, 320 150 S 380 138, 410 150 S 470 162, 500 150 S 560 138, 590 150" fill="none" stroke="#5da2ff" strokeWidth="2.2" />
        <text x="80" y="122" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="11">Verlet: the error orbits in a band, forever</text>
        <text x="50" y="252" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">measured: band 3×10⁻⁵ over 200 orbits · L to 4×10⁻¹⁴ · reversal to 1.3×10⁻¹² · orders 1.02 / 2.00 / 4.00</text>
        <text x="50" y="274" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">the mirror test: 20,000 steps out, flip velocities, 20,000 home: Verlet re-arrives: Euler misses by 2.45</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'velocity_verlet_symplectic.py',
  Viz: VerletViz,
  narration,
};
