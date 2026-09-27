import CgViz from '../viz/CgViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/conjugate_gradient_jacobi_preconditioner.py?raw';
import { narration } from './conjugate-gradient-jacobi-preconditioner.narration.js';

export const content = {
  given:
    'The 2-D Poisson equation discretized on an n × n grid: a symmetric positive definite system with n² unknowns and five nonzeros per row, 4,096 unknowns at n = 64, too large to eliminate and too sparse to want to. Solve it to a relative residual of 10⁻⁸. Then the same grid with a diffusion coefficient that jumps by 10⁴ across the quadrants.',
  task: 'Conjugate gradient touches A only through matrix-vector products and builds search directions that are A-conjugate to every previous one, so no step undoes another: the exact answer in at most N steps, and in about √κ steps in practice. The Jacobi preconditioner replaces the residual r by M⁻¹r with M = diag(A), one division per unknown per iteration, which removes any bad scaling of the rows before the iteration sees it.',
  constraint:
    'On 64 unknowns CG matches Gaussian elimination to 5 × 10⁻¹⁴ and terminates in 31 iterations. On the uniform grids the residual reaches 10⁻⁸ in 51, 101, and 199 iterations at n = 16, 32, 64, under the classical bounds 103, 201, 396 from the closed-form condition numbers 116, 441, 1,712, and growing ×2.0 per doubling of n, as √κ predicts. Jacobi changes the uniform grid by exactly 0 iterations (the diagonal is constant) and cuts the jumping-coefficient system from 1,082 iterations to 103. Steepest descent on the uniform 32 × 32 grid needs 3,417 iterations where CG needs 101.',

  origins: (
    <p>
      Magnus Hestenes and Eduard Stiefel published the conjugate
      gradient method in <strong>1952</strong> (Journal of Research of
      the National Bureau of Standards), Hestenes at UCLA and Stiefel
      at ETH having found it independently; Cornelius Lanczos&apos;s
      1950 iteration is its close cousin. It was first sold as a direct
      method (exact in N steps) and disappointed, since rounding broke
      the promise; John Reid&apos;s 1971 paper revived it as an
      iterative method for large sparse systems, which is what it had
      been all along. Preconditioning grew up in the 1970s: Meijerink
      and van der Vorst&apos;s incomplete Cholesky (1977) and the
      recognition that the humble Jacobi scaling, dividing by the
      diagonal, fixes the commonest cause of a bad condition number.
      Jonathan Shewchuk&apos;s 1994 &quot;An Introduction to the
      Conjugate Gradient Method Without the Agonizing Pain&quot; is how
      most people learned it; PETSc, Trilinos, and every finite-element
      package ship it as the default for SPD problems.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>iteration and its guarantee</strong>: x<sub>k+1</sub> =
      x<sub>k</sub> + α<sub>k</sub> p<sub>k</sub> with α<sub>k</sub>
      the exact minimizer along p<sub>k</sub>, and p<sub>k+1</sub> =
      r<sub>k+1</sub> + β<sub>k</sub> p<sub>k</sub> chosen so that
      p<sub>k+1</sub><sup>T</sup> A p<sub>k</sub> = 0. Each step
      minimizes the error in the A-norm over the whole Krylov space so
      far. Measured: on 64 unknowns the answer matches Gaussian
      elimination to 5 × 10<sup>−14</sup> in 31 iterations (finite
      termination within N); on 256, 1,024, and 4,096 unknowns the
      residual reaches 10<sup>−8</sup> in <strong>51, 101, 199
      iterations</strong>, under the bounds 103, 201, 396 from the
      exact condition numbers, doubling with n exactly as √κ does.
      Steepest descent, the same quadratic with the gradient as the
      direction and no conjugacy, needs 3,417 iterations on the 32 × 32
      grid: κ steps against √κ.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>cheapest possible change of variables</strong>:
      M = diag(A), so the iteration runs on M<sup>−1</sup>A, whose
      rows are scaled to a common size, for one division per unknown
      per iteration. On the uniform grid the diagonal is the same
      number everywhere and Jacobi changes nothing: <strong>101 iterations
      plain, 101 preconditioned</strong>, and the page says so rather than
      pretending. On the grid whose coefficient jumps by 10<sup>4</sup>
      across the quadrants, the rows differ by four orders of magnitude,
      the condition number carries the jump, and plain CG needs 1,082
      iterations; dividing by the diagonal takes the scaling back out
      and Jacobi-preconditioned CG converges in <strong>103</strong>,
      the count of the unscaled problem. The preconditioner does not
      make CG faster; it removes the reasons CG was slow.
    </p>
  ),

  picture: (
    <p>
      Finding the bottom of a long narrow valley in fog. Steepest
      descent walks straight downhill, hits the far wall, turns
      straight downhill again, and zigzags across the valley a thousand
      times, each step partly undoing the last. Conjugate gradient
      remembers the direction it just took and chooses the next one so
      that, measured in the valley&apos;s own curvature, it is
      perpendicular to all the earlier ones; each step settles one
      direction for good, and a valley with N independent directions is
      settled in N steps, or far fewer when the valley is nearly round.
      The Jacobi preconditioner is a change of units: if the valley is
      a thousand times longer in one direction because that axis is
      measured in millimeters and the other in meters, divide each axis
      by its own scale first, and the valley becomes round enough that
      the walk is short.
    </p>
  ),

  steps: [
    <>
      <strong>Start:</strong> x = 0, r = b, z = M<sup>−1</sup>r, p = z.
    </>,
    <>
      <strong>Step:</strong> α = rᵀz / pᵀAp; x += αp; r −= αAp.
    </>,
    <>
      <strong>Precondition:</strong> z = M<sup>−1</sup>r: one division
      per unknown for Jacobi.
    </>,
    <>
      <strong>Conjugate:</strong> β = r<sub>new</sub>ᵀz<sub>new</sub> /
      rᵀz; p = z + βp; repeat until |r| / |b| &lt; 10<sup>−8</sup>.
    </>,
    <>
      <strong>Check:</strong> against elimination (5 × 10<sup>−14</sup>),
      the residual, the √κ bound, and the jump (1,082 → 103).
    </>,
  ],

  signals: [
    <>
      <strong>Symmetric positive definite and sparse:</strong> a
      discretized elliptic operator, a stiffness matrix, a graph
      Laplacian, normal equations.
    </>,
    <>
      <strong>Too large to factor:</strong> n³/3 for elimination
      against a few hundred matrix-vector products.
    </>,
    <>
      <strong>Rows on different scales:</strong> when the diagonal
      varies by orders of magnitude, Jacobi is the first
      preconditioner to try and often the last needed.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>plain conjugate gradient</strong>:
      the same iteration without the diagonal scaling. On the uniform
      grid it is exactly as good (101 iterations both ways); on the
      jumping coefficient it needs 1,082 iterations to the
      preconditioned 103. The preconditioner earns nothing on a
      well-scaled problem and everything on a badly scaled one.
    </>
  ),

  strength: (
    <>
      <strong>√κ iterations, one product each, provably.</strong>{' '}
      51 / 101 / 199 iterations under bounds of 103 / 201 / 396,
      doubling with n as the theory says; elimination matched to
      5 × 10<sup>−14</sup>; a 10<sup>4</sup> coefficient jump absorbed by one
      division per unknown; and steepest descent beaten 3,417 to 101.
    </>
  ),
  weakness: (
    <>
      <strong>SPD or nothing, and √κ can still be large.</strong>{' '}
      A nonsymmetric or indefinite matrix breaks the conjugacy (GMRES
      and MINRES exist for those). Iterations grow with the grid (199
      at n = 64, doubling each refinement) because Jacobi does nothing
      about the Laplacian&apos;s own condition number; multigrid and
      incomplete Cholesky do. Rounding erodes conjugacy over long runs,
      and the finite-termination promise is a theorem about exact
      arithmetic.
    </>
  ),

  problem: 'SPD sparse systems',
  problemSlug: 'linear-systems',
  rivals: [
    {
      name: 'Conjugate gradient × Jacobi preconditioner',
      isThisUnit: true,
      algoName: 'Conjugate gradient',
      cost: '~√κ matrix-vector products',
      wins: (
        <>
          <strong>101 iterations on 1,024 unknowns</strong>, elimination
          matched to 5 × 10⁻¹⁴, a 10⁴ jump absorbed (1,082 → 103).
        </>
      ),
      costs: (
        <>
          SPD only; iterations still grow with the grid (199 at n = 64).
        </>
      ),
      when: 'Large sparse SPD systems, especially ones with rows on different scales.',
    },
    {
      name: 'Gaussian elimination',
      cost: 'n³/3 dense, less banded',
      wins: (
        <>
          The live unit here: exact in one pass, any matrix, and the
          referee CG matched to 5 × 10⁻¹⁴ on 64 unknowns.
        </>
      ),
      costs: (
        <>
          Fill-in destroys the sparsity; 4,096 unknowns dense is
          2 × 10¹⁰ multiply-adds against 199 products of 20,000.
        </>
      ),
      when: 'Small or dense systems, or many right-hand sides through LU.',
    },
    {
      name: 'Gauss-Seidel',
      cost: 'one sweep per iteration',
      wins: (
        <>
          Simple, no inner products, and a fine smoother inside
          multigrid.
        </>
      ),
      costs: (
        <>
          κ iterations, not √κ: thousands on the 32 × 32 grid where
          CG needs 101.
        </>
      ),
      when: 'As a smoother, or when an inner product is a luxury.',
    },
    {
      name: 'GMRES',
      cost: 'a growing Krylov basis',
      wins: (
        <>
          Conjugate-gradient thinking for nonsymmetric systems, with
          restarts to bound the memory.
        </>
      ),
      costs: (
        <>
          Memory and work grow with the iteration; restarting can
          stall.
        </>
      ),
      when: 'Nonsymmetric matrices: convection, non-self-adjoint operators.',
    },
  ],
  neverUse: {
    name: 'Steepest descent on an ill-conditioned system',
    why: (
      <>
        The gradient is the obvious direction, and it is the wrong one
        a thousand times in a row: on the uniform 32 × 32 grid steepest
        descent needed <strong>3,417 iterations</strong> to reach the
        residual conjugate gradient reached in 101, and its count grows
        with κ where CG grows with √κ. Each step is the exact minimizer
        along the gradient, and each step partly undoes the one before,
        because nothing makes the directions independent. The
        conjugacy is the whole difference: the same matrix-vector
        product per step, one extra vector kept, and thirty-four times
        fewer steps.
      </>
    ),
  },

  contest: {
    instance:
      'the 2-D Poisson equation (5-point Laplacian) on n × n grids, tolerance 10⁻⁸; referees: Gaussian elimination on 64 unknowns, the residual, and the closed-form condition number',
    columns: ['unknowns', 'κ', 'iterations (bound)'],
    rows: [
      {
        method: 'CG, uniform 16 × 16',
        values: ['256', '116', '51 (103)'],
        verdict: 'residual 9.7 × 10⁻⁹',
      },
      {
        method: 'CG, uniform 32 × 32',
        isThisUnit: true,
        values: ['1,024', '441', '101 (201)'],
        best: 2,
        verdict: 'residual 8.2 × 10⁻⁹; Jacobi changes it by 0',
      },
      {
        method: 'CG, uniform 64 × 64',
        values: ['4,096', '1,712', '199 (396)'],
        verdict: '×2.0 per doubling of n, as √κ predicts',
      },
      {
        method: 'Plain CG, 10⁴ coefficient jump, 32 × 32',
        values: ['1,024', 'carries the jump', '1,082'],
        verdict: 'the rows differ by four orders of magnitude',
      },
      {
        method: 'Jacobi-preconditioned CG, same jump',
        values: ['1,024', 'scaled out', '103'],
        verdict: 'one division per unknown per iteration',
      },
      {
        method: 'Steepest descent, uniform 32 × 32',
        values: ['1,024', '441', '3,417'],
        verdict: 'κ iterations, not √κ',
      },
    ],
    source:
      'python solutions/conjugate_gradient_jacobi_preconditioner.py prints this table and asserts: CG within 10⁻⁹ of elimination on 64 unknowns and terminating within N + 2; residuals under 10⁻⁸ with iterations under the √κ bound at n = 16, 32, 64 and growing 1.5 to 2.6× per doubling; Jacobi within 1 iteration of plain CG on the uniform grid and at least 1.5× faster on the jump; steepest descent more than 10× CG’s count.',
  },

  figure: (
    <Figure
      id="fig-cg-directions"
      aspect="16 / 7"
      caption="Two walks down the same valley (the level sets of ½ xᵀAx − bᵀx for a 2 × 2 system with κ = 20). Gray: steepest descent, each step the exact minimizer along the gradient, zigzagging because every direction is perpendicular to the last in the plain sense. Blue: conjugate gradient, the second direction chosen A-conjugate to the first, so the second step lands on the minimum exactly. Measured on the 32 × 32 Poisson grid: 3,417 steps against 101; with a 10⁴ coefficient jump, 1,082 for plain CG against 103 with the Jacobi scaling."
      cite={{
        text: 'M. R. Hestenes, E. Stiefel, "Methods of conjugate gradients for solving linear systems," J. Research of the National Bureau of Standards 49(6), 1952. DOI 10.6028/jres.049.044. J. R. Shewchuk, "An introduction to the conjugate gradient method without the agonizing pain," 1994.',
        href: 'https://doi.org/10.6028/jres.049.044',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="Elongated elliptical level sets with a gray zigzag path of steepest descent and a blue two-step path of conjugate gradient reaching the center">
        {[1, 2, 3, 4, 5].map((k) => <ellipse key={k} cx="300" cy="150" rx={k * 52} ry={k * 12} fill="none" stroke="rgba(154,165,189,0.35)" />)}
        <circle cx="300" cy="150" r="4" fill="#62d98a" />
        <polyline points="60,205 118,181 130,166 168,153 176,146 205,150 210,149 230,151 232,150 250,150 251,150 262,150 263,150 275,150 276,150 286,150" fill="none" stroke="#9aa5bd" strokeWidth="2" />
        <text x="60" y="230" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">steepest descent: 3,417 steps on the 32 × 32 grid</text>
        <polyline points="60,205 200,178 300,150" fill="none" stroke="#5da2ff" strokeWidth="2.5" />
        <text x="60" y="250" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="11">conjugate gradient: 101 steps (2 here, N = 2)</text>
        <text x="380" y="60" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="11">uniform grids: 51 / 101 / 199 iterations</text>
        <text x="380" y="78" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">bounds 103 / 201 / 396 from κ = 116 / 441 / 1,712</text>
        <text x="380" y="110" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">10⁴ jump: plain 1,082, Jacobi 103</text>
        <text x="380" y="128" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">uniform: Jacobi changes nothing (101 = 101)</text>
        <text x="380" y="256" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">64 unknowns: elimination matched to 5e-14 in 31 steps</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'conjugate_gradient_jacobi_preconditioner.py',
  Viz: CgViz,
  narration,
};
