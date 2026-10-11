import FiniteDifferenceViz from '../viz/FiniteDifferenceViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/finite_difference_method_central_difference_stencils.py?raw';
import { narration } from './finite-difference-method-central-difference-stencils.narration.js';

export const content = {
  given:
    'A differential equation with no closed-form answer: heat spreading along a rod, a membrane sagging under load, a voltage settling across a chip. The unknown is a function on a continuum. The computer holds a finite list of numbers. Turn the equation into algebra on a grid without losing the physics, and know how wrong the grid makes you.',
  task: 'Finite difference method. The algorithm: lay a grid of spacing h, keep the unknown only at the grid points, and replace every derivative by a combination of neighboring values, so the equation becomes a linear system (for a steady problem) or a recurrence in time (for an evolving one). The heuristic: center the stencils. The three-point second difference (u(x + h) minus 2u(x) plus u(x minus h), over h squared) is exact on cubics and errs like h squared; the centered first difference beats the one-sided one by a whole power of h; a five-point stencil buys h to the fourth. Centering cancels the odd terms of the Taylor series for free, and the same stencil in two dimensions is the five-point Laplacian.',
  constraint:
    'Poisson on a line, u = sin(πx): max error 3.22e-3 at 16 intervals, 1.26e-5 at 256, observed order 2.00 at every halving; quadratics and cubics reproduced to 1e-14. First derivative of e^x at x = 1: forward order 1.01, central 2.00, five-point 4.00 (errors 1.7e-2, 7.1e-5, 2.2e-9 at h = 0.0125). The central stencil bottoms out at h = 3.8e-6 with error 9.9e-12 and climbs to 6.9e-9 at h = 1.5e-8: round-off, eps / h. Five-point Laplacian on the square, u = e^x sin(πx) sin(πy): errors 1.89e-2, 4.72e-3, 1.18e-3 at n = 8, 16, 32 (orders 2.00, 1.99); Jacobi 173, 705, 2,834 sweeps (4.08x, 4.02x per halving), conjugate gradient 7, 19, 44. Heat equation, h = 1/40, 1,500 explicit steps: r = 0.49 decays to 0.01069 (exact 0.01074); r = 0.51 reaches 1.9e10. Against the semi-discrete exact solution at T = 0.1: backward Euler order 0.99, Crank-Nicolson 2.00, explicit 1.00; at r = 8 backward Euler 0.3818 and Crank-Nicolson 0.3728 against 0.3729. The second-difference eigenvalues (2 minus 2 cos kπh) / h² hold to 1.3e-13; condition number 648 = 4 / (πh)². 0.8 s.',

  origins: (
    <p>
      Lewis Fry Richardson (1911) solved the stress in a masonry dam by hand on
      a grid, replacing derivatives by differences, and dreamed of a
      &quot;forecast factory&quot; of human computers doing the same for the
      weather. Courant, Friedrichs, and Lewy (1928) proved that an explicit
      scheme can only be stable when its time step respects the speed at
      which information travels on the grid: the CFL condition, the first
      stability theorem of numerical analysis. Crank and Nicolson (1947) gave
      the implicit averaging that removed the step limit for the heat
      equation at the price of a tridiagonal solve. Lax and Richtmyer (1956)
      tied it together: a consistent scheme converges if and only if it is
      stable. The grids of 1911 became the finite difference codes of weather,
      seismology, and finance, and the stencil vocabulary (three-point,
      five-point, upwind, compact) is still how practitioners talk.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>grid and the algebra</strong>: unknowns at the points,
      derivatives as differences, boundaries as known values, and a solver.
      For the steady problems the file solves a tridiagonal system by the
      Thomas algorithm in one sweep and the two-dimensional Laplacian by
      Jacobi and by conjugate gradient; for the heat equation it steps in
      time, explicitly or by a tridiagonal solve per step. The referees are
      closed forms: <strong>sin(πx)</strong> for Poisson, the decaying sine
      for heat, the exact eigenvalues of the difference matrix.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>accuracy</strong>. Centering the stencil cancels the
      odd Taylor terms, so the error is <strong>h²</strong> rather than h:
      measured orders 2.00 for the second difference at every halving from 16
      to 256 intervals, 1.01 for the one-sided first derivative against 2.00
      centered and 4.00 for five points. And it knows its own limit: the
      centered derivative is best near h = 4e-6 (error 1e-11) and gets worse
      below, because subtracting nearly equal numbers divides round-off by h.
    </p>
  ),

  picture: (
    <p>
      Picture a line of thermometers along a rod, one every centimeter. You
      cannot see the temperature between them, but you can guess the curvature
      at any thermometer from its two neighbors: if both neighbors read higher,
      the spot is a dip and heat flows in. Replace the smooth law &quot;heat
      flows toward the dips&quot; by &quot;each reading moves toward the average
      of its neighbors&quot; and step the clock. Step too far and a reading
      overshoots past its neighbors, the next step overshoots back harder, and
      the rod explodes on paper while the real rod does nothing of the kind.
    </p>
  ),

  steps: [
    <>
      <strong>Lay the grid:</strong> spacing h, unknowns at the interior points,
      boundary values filled in from the problem.
    </>,
    <>
      <strong>Replace derivatives by centered differences:</strong> u&apos;&apos;
      becomes (u(x + h) − 2u(x) + u(x − h)) / h², u&apos; becomes (u(x + h) −
      u(x − h)) / 2h; in two dimensions the five-point Laplacian.
    </>,
    <>
      <strong>Solve the algebra:</strong> tridiagonal for a line (Thomas,
      one sweep), banded for a plane (Jacobi, Gauss-Seidel, conjugate
      gradient, multigrid).
    </>,
    <>
      <strong>For time, pick a scheme and respect its limit:</strong> explicit
      steps need r = Δt / h² at most one half; backward Euler and
      Crank-Nicolson take any r for a tridiagonal solve per step.
    </>,
    <>
      <strong>Check the order:</strong> halve h, the error should drop by
      four; if it does not, a boundary or a stencil is wrong.
    </>,
  ],

  signals: [
    <>
      <strong>The domain is a box or a line and the solution is smooth:</strong>
      a regular grid fits, and centered stencils earn their h².
    </>,
    <>
      <strong>You want the simplest discretization that is provably right:</strong>
      a Taylor series proves the order, a closed form confirms it.
    </>,
    <>
      <strong>The operator is local:</strong> each unknown touches a few
      neighbors, so the matrix is banded and sparse solvers apply.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the <strong>one-sided difference</strong>: order
      1.01 against 2.00 for the same three readings, so the centered stencil
      buys a hundredfold at h = 0.01 for nothing.
    </>
  ),

  strength: (
    <>
      <strong>Second order on the plainest grid, provable from a Taylor series.</strong>{' '}
      Error 3.2e-3 to 1.3e-5 across four halvings, exact on cubics,
      tridiagonal solves in one sweep, and the stability limit known in
      closed form.
    </>
  ),
  weakness: (
    <>
      <strong>Rigid grids, a stiff explicit step, and a round-off floor.</strong>{' '}
      Curved boundaries need special stencils; r above one half explodes
      (1.9e10 after 1,500 steps); Jacobi needs 4x the sweeps per halving;
      h below 4e-6 makes the derivative worse.
    </>
  ),

  problem: 'PDE discretization',
  problemSlug: 'pde-discretization',
  rivals: [
    {
      name: 'Finite difference method × Central difference stencils',
      isThisUnit: true,
      algoName: 'Finite difference method',
      cost: 'O(n) per tridiagonal solve; O(n²) unknowns on a square, O(1/h²) Jacobi sweeps',
      wins: (
        <>
          <strong>Order 2.00 at every halving</strong> on Poisson, exact on
          cubics; the whole method fits in a Taylor expansion and a
          tridiagonal solve.
        </>
      ),
      costs: (
        <>
          Regular grids only; the explicit heat step dies above r = 1/2
          (1.9e10 at r = 0.51); the centered derivative floors at 1e-11.
        </>
      ),
      when: 'Rectangular domains, smooth solutions, and you want the error law in closed form.',
    },
    {
      name: 'Finite element method × Galerkin weak form',
      algoName: 'Finite element method',
      cost: 'assembly over elements, then a sparse symmetric solve',
      wins: (
        <>
          <strong>Any geometry</strong>: triangles follow curved boundaries
          and refine where the solution is rough; natural boundary
          conditions come out of the weak form; the same order on
          unstructured meshes.
        </>
      ),
      costs: (
        <>
          Meshing, quadrature, and assembly before the first solve; on a box
          with linear elements it reproduces the same three-point stencil
          with more machinery.
        </>
      ),
      when: 'The domain is a wing, a bone, or a bracket rather than a box, or the mesh must adapt.',
    },
    {
      name: 'Spectral method × Fourier basis',
      algoName: 'Spectral method',
      cost: 'O(n log n) per derivative by FFT',
      wins: (
        <>
          <strong>Exponential convergence</strong> for smooth periodic
          solutions: a few dozen modes where differences need thousands of
          points for the same error.
        </>
      ),
      costs: (
        <>
          Periodic or specially chosen domains; a kink or a shock destroys
          the accuracy (Gibbs ringing); dense coupling between all points.
        </>
      ),
      when: 'Periodic boxes with smooth fields: turbulence, waves, climate dynamics cores.',
    },
    {
      name: 'Crank-Nicolson × Implicit time stepping',
      algoName: 'Crank-Nicolson',
      cost: 'one tridiagonal solve per step, any step size',
      wins: (
        <>
          <strong>Order 2.00 in time and no step limit</strong>: at r = 8 it
          returned 0.3728 against the exact 0.3729 where the explicit scheme
          cannot run at all.
        </>
      ),
      costs: (
        <>
          A linear solve per step; weakly damped high modes can ring at very
          large r; the stencil in space is still the same centered difference.
        </>
      ),
      when: 'Diffusion with a fine grid, where the explicit limit Δt ≤ h² / 2 would mean millions of steps.',
    },
  ],
  neverUse: {
    name: 'The explicit heat step above r = 1/2',
    why: (
      <>
        Forward in time, centered in space, with Δt / h² = 0.51 instead of
        0.49: the same code, the same grid, a step two percent longer. The
        highest grid mode is multiplied by 1 − 4r = −1.04 every step; a seed
        of 1e-12 passes one in about 700 steps and reaches{' '}
        <strong>1.9 × 10¹⁰ after 1,500</strong>, while r = 0.49 decays to
        0.01069 against the exact 0.01074. Nothing in the physics changed. The
        other way to lose is shrinking h without end for a derivative: the
        centered estimate of e at h = 1.5e-8 is off by 6.9e-9, seven hundred
        times worse than at h = 3.8e-6, because round-off divided by h grows
        as h shrinks. Pick the step from the stability limit and the spacing
        from the balance of truncation against round-off, not from the
        instinct that smaller is better.
      </>
    ),
  },

  contest: {
    instance:
      'the heat equation u_t = u_xx on the unit interval with u(x, 0) = sin(πx), h = 1/40, run to T = 0.1 and compared with the exact solution of the semi-discrete system (which isolates the time-stepping error) at three step sizes; and 1,500 explicit steps at r = 0.49 and 0.51 compared with the closed form',
    columns: ['stability condition', 'error at the largest r tried', 'order in time (measured)', 'cost per step'],
    rows: [
      {
        method: 'explicit (FTCS), r ≤ 1/2',
        isThisUnit: true,
        values: ['r ≤ 1/2', '4.5e-4 at r = 0.4', '1.00', 'one stencil sweep'],
        best: 3,
        verdict: 'cheapest step, shortest step',
      },
      {
        method: 'explicit (FTCS), r = 0.51',
        values: ['violated', '1.9e10 after 1,500 steps', 'none', 'one stencil sweep'],
        verdict: 'the negative example',
      },
      {
        method: 'backward Euler',
        values: ['any r', '8.9e-3 at r = 8', '0.99', 'one tridiagonal solve'],
        verdict: 'stable, first order',
      },
      {
        method: 'Crank-Nicolson',
        values: ['any r', '7.5e-5 at r = 8', '2.00', 'one tridiagonal solve'],
        verdict: 'stable, second order',
      },
    ],
    source:
      'python solutions/finite_difference_method_central_difference_stencils.py prints these tables and asserts: the Poisson orders lie in (1.9, 2.1) at every halving; quadratics and cubics are reproduced to 1e-11; the first-derivative orders are near 1, 2, and 4; the central round-off floor sits between h = 1e-6 and 1e-4 with error below 1e-10, and the error at h = 1.5e-8 exceeds 1e-9; the two-dimensional orders lie in (1.9, 2.1) and Jacobi’s sweep count grows by 3.3x to 4.7x per halving; r = 0.49 stays below one with error below 1e-3 while r = 0.51 exceeds one; backward Euler, Crank-Nicolson, and FTCS measure time orders near 1, 2, and 1 against the semi-discrete exact solution; the closed-form eigenvalues hold to 1e-10 and power iteration agrees to 1e-3.',
  },

  figure: (
    <Figure
      id="fig-fd-orders-stability"
      aspect="16 / 7"
      caption="Left: error of the first derivative of e^x at x = 1 against h on log axes. Measured anchors as dots: forward (slope 1), central (slope 2), five-point (slope 4) at h = 0.1 to 0.0125, and the central stencil’s round-off floor, 9.9e-12 at h = 3.8e-6 then 6.9e-9 at h = 1.5e-8, where eps / h takes over. Right: max |u| of the explicit heat scheme over 1,500 steps at r = 0.49 (decays toward the exact 0.0107) and r = 0.51 (the seeded top mode grows by 1.04 per step to 1.9e10)."
      cite={{
        text: 'R. Courant, K. Friedrichs, and H. Lewy, "Über die partiellen Differenzengleichungen der mathematischen Physik," Mathematische Annalen 100, 1928. L. F. Richardson, "The approximate arithmetical solution by finite differences of physical problems involving differential equations," Philosophical Transactions A 210, 1911. R. J. LeVeque, Finite Difference Methods for Ordinary and Partial Differential Equations, SIAM, 2007.',
        href: 'https://doi.org/10.1007/BF01448839',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="Log-log plot of first-derivative error against step size for three stencils with a round-off floor, beside a plot of the explicit heat scheme's maximum against steps for a stable and an unstable step ratio">
        {(() => {
          const lx = (h) => 40 + (Math.log10(h) + 8) * 31; // h from 1e-8 to 1e-1
          const ly = (e) => 236 - (Math.log10(e) + 12) * 18; // e from 1e-12 to 1e0
          const fwd = [[0.1, 0.141], [0.05, 0.0691], [0.025, 0.0343], [0.0125, 0.0171]];
          const cen = [[0.1, 4.53e-3], [0.05, 1.13e-3], [0.025, 2.83e-4], [0.0125, 7.08e-5], [3.8e-6, 9.9e-12], [1.5e-8, 6.9e-9]];
          const five = [[0.1, 9.07e-6], [0.05, 5.66e-7], [0.025, 3.54e-8], [0.0125, 2.21e-9]];
          const path = (pts) => pts.map(([h, e], i) => `${i ? 'L' : 'M'}${lx(h).toFixed(1)},${ly(e).toFixed(1)}`).join(' ');
          const cenCurve = [[0.1, 4.53e-3], [0.01, 4.5e-5], [1e-3, 4.5e-7], [1e-4, 4.5e-9], [3.8e-6, 9.9e-12], [1e-6, 2.2e-10], [1e-7, 2.2e-9], [1.5e-8, 6.9e-9]];
          const sx = (s) => 352 + s * 0.18; // steps 0 to 1500
          const sy = (v) => 236 - (Math.log10(v) + 12) * 9.2; // 1e-12 to 1e11
          const ok = [[0, 1], [500, 0.21], [1000, 0.045], [1500, 0.0107]];
          const bad = [[0, 1], [500, 1], [700, 1.1], [900, 3.3e3], [1100, 8.5e6], [1300, 2.2e9], [1500, 1.9e10]];
          return (
            <g fontFamily="ui-monospace, monospace" fontSize="9">
              <text x="20" y="20" fill="#9aa5bd" fontSize="10">first-derivative error vs h (log-log): dots are measured</text>
              <line x1="40" y1="236" x2="330" y2="236" stroke="#9aa5bd" strokeOpacity="0.5" />
              <line x1="40" y1="20" x2="40" y2="236" stroke="#9aa5bd" strokeOpacity="0.5" />
              {[-8, -6, -4, -2].map((k) => <text key={k} x={lx(10 ** k) - 10} y="250" fill="#9aa5bd">1e{k}</text>)}
              {[-12, -8, -4, 0].map((k) => <text key={k} x="4" y={ly(10 ** k) + 3} fill="#9aa5bd">1e{k}</text>)}
              <path d={path(fwd)} stroke="#9aa5bd" fill="none" strokeWidth="1.5" />
              <path d={path(cenCurve)} stroke="#5da2ff" fill="none" strokeWidth="1.5" />
              <path d={path(five)} stroke="#f0b94b" fill="none" strokeWidth="1.5" />
              {fwd.map(([h, e]) => <circle key={`f${h}`} cx={lx(h)} cy={ly(e)} r="2.5" fill="#9aa5bd" />)}
              {cen.map(([h, e]) => <circle key={`c${h}`} cx={lx(h)} cy={ly(e)} r="2.5" fill="#5da2ff" />)}
              {five.map(([h, e]) => <circle key={`v${h}`} cx={lx(h)} cy={ly(e)} r="2.5" fill="#f0b94b" />)}
              <text x={lx(0.1) + 6} y={ly(0.141)} fill="#9aa5bd">forward, slope 1</text>
              <text x={lx(0.1) + 6} y={ly(4.53e-3) + 10} fill="#5da2ff">central, slope 2</text>
              <text x={lx(0.1) + 6} y={ly(9.07e-6) + 12} fill="#f0b94b">five-point, slope 4</text>
              <text x={lx(1e-7) - 60} y={ly(9.9e-12) - 6} fill="#e2606c">round-off floor: eps / h</text>
              <text x="20" y="270" fill="#62d98a" fontSize="10">orders measured 1.01, 2.00, 4.00; smaller h stops helping near 4e-6</text>
              <text x="352" y="20" fill="#9aa5bd" fontSize="10">explicit heat step: max |u| over 1,500 steps</text>
              <line x1="352" y1="236" x2="628" y2="236" stroke="#9aa5bd" strokeOpacity="0.5" />
              <line x1="352" y1="20" x2="352" y2="236" stroke="#9aa5bd" strokeOpacity="0.5" />
              <line x1="352" y1={sy(1)} x2="628" y2={sy(1)} stroke="#9aa5bd" strokeDasharray="3 3" strokeOpacity="0.6" />
              <text x="600" y={sy(1) - 4} fill="#9aa5bd">one</text>
              <path d={ok.map(([s, v], i) => `${i ? 'L' : 'M'}${sx(s).toFixed(1)},${sy(v).toFixed(1)}`).join(' ')} stroke="#62d98a" fill="none" strokeWidth="1.5" />
              <path d={bad.map(([s, v], i) => `${i ? 'L' : 'M'}${sx(s).toFixed(1)},${sy(v).toFixed(1)}`).join(' ')} stroke="#e2606c" fill="none" strokeWidth="1.5" />
              <text x={sx(1500) - 70} y={sy(0.0107) + 14} fill="#62d98a">r = 0.49: 0.0107</text>
              <text x={sx(1000) - 20} y={sy(2.2e9) - 6} fill="#e2606c">r = 0.51: 1.9e10</text>
              {[0, 500, 1000, 1500].map((s) => <text key={s} x={sx(s) - 10} y="250" fill="#9aa5bd">{s}</text>)}
              <text x="352" y="270" fill="#f0b94b" fontSize="10">two percent past the limit: the same code, a different universe</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'finite_difference_method_central_difference_stencils.py',
  Viz: FiniteDifferenceViz,
  narration,
};
