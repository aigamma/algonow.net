import GaussianViz from '../viz/GaussianViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/gaussian_elimination_partial_pivoting.py?raw';
import { narration } from './gaussian-elimination-partial-pivoting.narration.js';

export const content = {
  given:
    'A dense n × n matrix A and a right-hand side b, in floating point. Solve A x = b to the precision of the arithmetic, and do it in about n³/3 multiply-adds.',
  task: 'Gaussian elimination: subtract multiples of each row from the rows below it until the matrix is upper triangular, then back-substitute. Partial pivoting: before eliminating column k, swap up the row with the largest entry in that column at or below the diagonal, so every multiplier has size at most 1.',
  constraint:
    'On the classic 2 × 2 [[ε, 1], [1, 1]] x = (1, 2) with ε = 10⁻¹⁷, elimination without pivoting returns (0, 1), 100% wrong in its first component; with pivoting, (1, 1) to full precision. On a system whose first pivot is exactly zero, no pivoting cannot proceed at all. On random 80 × 80 systems the relative residual with pivoting is 1.3 × 10⁻¹⁶, without it 2.0 × 10⁻¹⁴; against exact rational arithmetic on 30 integer systems, the pivoted solution agrees to 10⁻¹⁴. The known bad day is measured too: Wilkinson’s matrix of order 24 drives the element growth to exactly 2²³ = 8,388,608, where complete pivoting holds it at 2 and random matrices never exceeded 8.',

  origins: (
    <p>
      The method is older than Gauss: the <em>Nine Chapters on the
      Mathematical Art</em> (China, by the 2nd century BCE) solves
      systems by exactly this row reduction. Gauss used it in 1810 for
      the normal equations of least squares, and Jordan (1888) added
      the back-elimination that bears both names. The floating-point
      story begins in 1947, when von Neumann and Goldstine analyzed
      the rounding errors and feared exponential growth; Turing
      (1948) framed the factorization as LU and introduced the
      condition number; and James Wilkinson (<strong>1961</strong>)
      gave the backward error analysis that settled it: with partial
      pivoting the computed solution is exact for a nearby matrix,
      with the perturbation bounded by the growth factor, which is at
      most 2<sup>n−1</sup>, a bound his own matrix attains. Trefethen
      and Schreiber (1990) explained why the bound is a curiosity:
      random matrices grow like n<sup>2/3</sup>. LINPACK (1979) and
      LAPACK&apos;s dgesv made partial pivoting the world&apos;s default.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>elimination and its cost</strong>: for each
      column k, subtract (a<sub>ik</sub>/a<sub>kk</sub>) times row k
      from each row i below, then back-substitute. Counted:{' '}
      <strong>21,320 / 170,640 / 1,365,280 multiply-adds</strong> at
      n = 40 / 80 / 160, ×8.0 per doubling, the n³/3 law. Against
      exact rational elimination on 30 integer systems, the
      floating-point solution agrees to 10<sup>−14</sup>; on random
      80 × 80 systems the relative residual |Ax − b| / (|A||x|) is
      1.3 × 10<sup>−16</sup>, the precision of the arithmetic.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>choice of pivot</strong>: the largest
      entry of the column, so |multiplier| ≤ 1 and errors are not
      amplified row by row. Removed, the same code returns (0, 1) for
      the 2 × 2 whose answer is (1, 1), dies on a zero pivot, and
      lets multipliers reach 10<sup>4</sup> on a planted tiny entry
      (residual 10<sup>−13</sup> against 10<sup>−17</sup>). The
      search costs O(n²) comparisons in total, 12,880 at n = 160,
      against complete pivoting&apos;s O(n³), 1,378,160. Its known
      weakness is measured: Wilkinson&apos;s matrix of order 24 grows the
      entries by <strong>2²³ = 8,388,608</strong> under partial
      pivoting while complete pivoting holds growth at 2; random
      80 × 80 matrices never grew past 8.
    </p>
  ),

  picture: (
    <p>
      Balancing a ledger by cancelling accounts against each other.
      Each step picks one account as the reference and uses it to
      cancel that column from every account below. If the reference
      account is tiny, cancelling a normal-sized entry against it
      means multiplying the reference by a huge number, and every
      rounding error in the reference is multiplied by the same huge
      number before it lands in the accounts below; do that twenty
      times and the ledger is noise. Partial pivoting is the
      bookkeeper&apos;s habit: before each step, swap up the account
      with the largest entry in the column, so every multiplier is a
      fraction and no error is ever amplified. It is not perfect:
      Wilkinson found a ledger where the entries still double at
      every step even with the habit. Nobody has met that ledger by
      accident.
    </p>
  ),

  steps: [
    <>
      <strong>Pivot:</strong> in column k, find p = argmax<sub>i ≥ k</sub>{' '}
      |a<sub>ik</sub>|; swap rows k and p (and b).
    </>,
    <>
      <strong>Eliminate:</strong> for each i &gt; k, f = a<sub>ik</sub>/a<sub>kk</sub>{' '}
      (|f| ≤ 1); row<sub>i</sub> −= f · row<sub>k</sub>.
    </>,
    <>
      <strong>Repeat</strong> for k = 0 … n − 1: the matrix is upper
      triangular after n³/3 multiply-adds.
    </>,
    <>
      <strong>Back-substitute:</strong> x<sub>n−1</sub> first, each
      x<sub>i</sub> from the rows below it.
    </>,
    <>
      <strong>Check:</strong> the residual at 10<sup>−16</sup>; exact
      arithmetic to 10<sup>−14</sup>; the 2 × 2 and the zero pivot.
    </>,
  ],

  signals: [
    <>
      <strong>Dense, square, moderate n:</strong> thousands of unknowns
      in memory, one or a few right-hand sides.
    </>,
    <>
      <strong>No special structure:</strong> not symmetric positive
      definite (Cholesky halves the work), not sparse (iterate
      instead).
    </>,
    <>
      <strong>Backward stability is the requirement:</strong> the
      answer must be exact for a matrix within rounding of the one
      given.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>elimination with no pivoting</strong>:
      the same arithmetic taking whatever sits on the diagonal. On
      random matrices it survives with a residual of 2 × 10<sup>−14</sup>,
      a hundred times worse; on a tiny pivot it multiplies by 10<sup>4</sup>;
      on the 2 × 2 it returns the wrong answer; on a zero it stops.
    </>
  ),

  strength: (
    <>
      <strong>The default for a reason.</strong> Residual at the
      precision of the arithmetic (1.3 × 10<sup>−16</sup>), agreement
      with exact arithmetic to 10<sup>−14</sup>, the 2 × 2 and the
      zero pivot handled, all for O(n²) extra comparisons on top of
      n³/3 multiply-adds; and a backward-error theorem (Wilkinson)
      behind every one of those numbers.
    </>
  ),
  weakness: (
    <>
      <strong>The bound is exponential and the matrix exists.</strong>{' '}
      Wilkinson&apos;s order-24 matrix grows entries by 2²³ under
      partial pivoting; complete pivoting holds it at 2 for O(n³)
      comparisons. In practice growth stays small (at most 8 on random
      80 × 80 here), but an adversary can build the bad case. And
      n³/3 is the whole cost: at n = 10,000 that is 3 × 10<sup>11</sup>
      multiply-adds, where sparse or iterative methods take over.
    </>
  ),

  problem: 'Linear systems',
  problemSlug: 'linear-systems',
  rivals: [
    {
      name: 'Gaussian elimination × partial pivoting',
      isThisUnit: true,
      algoName: 'Gaussian elimination',
      cost: 'n³/3 multiply-adds + O(n²) compares',
      wins: (
        <>
          <strong>Residual 10<sup>−16</sup></strong>, exact to
          10<sup>−14</sup>, the 2 × 2 and the zero pivot solved.
        </>
      ),
      costs: (
        <>
          Growth up to 2<sup>n−1</sup> on a constructed matrix, and
          n³/3 with no reuse across right-hand sides.
        </>
      ),
      when: 'Dense systems of moderate size with no structure to exploit.',
    },
    {
      name: 'LU decomposition',
      cost: 'the same n³/3, stored',
      wins: (
        <>
          The same elimination kept as P A = L U: every further
          right-hand side costs n², not n³.
        </>
      ),
      costs: (
        <>
          Storing L and U; identical numerics, identical growth.
        </>
      ),
      when: 'Many right-hand sides with one matrix.',
    },
    {
      name: 'Cholesky decomposition',
      cost: 'n³/6',
      wins: (
        <>
          Half the work and no pivoting needed at all, provably stable.
        </>
      ),
      costs: (
        <>
          Only for symmetric positive definite matrices; it fails
          loudly on anything else.
        </>
      ),
      when: 'Normal equations, covariance matrices, stiffness matrices.',
    },
    {
      name: 'Conjugate gradient',
      cost: 'a matrix-vector product per iteration',
      wins: (
        <>
          Never forms the elimination: for large sparse SPD systems,
          a few hundred products beat n³/3 by orders of magnitude.
        </>
      ),
      costs: (
        <>
          Iterative, needs SPD and a preconditioner, converges at a
          rate set by the condition number.
        </>
      ),
      when: 'Sparse systems too large for elimination.',
    },
  ],
  neverUse: {
    name: 'Cramer’s rule',
    why: (
      <>
        The formula every student meets first: x<sub>i</sub> = det(A<sub>i</sub>)/det(A).
        By cofactor expansion a determinant of order n has n! terms, so
        at n = 24 one determinant is 24! ≈ 6.2 × 10<sup>23</sup> products
        and the rule needs 25 of them, while elimination with partial
        pivoting finishes in about 4,600 multiply-adds with a
        backward-error guarantee. Computing the determinants by
        elimination instead is possible, and then the rule is just
        elimination done n + 1 times with worse rounding. There is no
        n at which Cramer&apos;s rule is the right way to solve a system.
      </>
    ),
  },

  contest: {
    instance:
      'dense linear systems in double precision; referees: exact rational elimination (30 integer 6 × 6 systems), the relative residual on random 80 × 80 systems, the constructed 2 × 2 with ε = 10⁻¹⁷, and Wilkinson’s growth matrix of order 24',
    columns: ['2 × 2, ε = 10⁻¹⁷', 'worst residual, 80 × 80', 'Wilkinson growth'],
    rows: [
      {
        method: 'Elimination, no pivoting',
        values: ['x = (0, 1)', '2.0 × 10⁻¹⁴', '-'],
        verdict: 'wrong on the 2 × 2, dead on a zero pivot',
      },
      {
        method: 'Elimination, partial pivoting',
        isThisUnit: true,
        values: ['x = (1, 1)', '1.3 × 10⁻¹⁶', '8,388,608 = 2²³'],
        best: 1,
        verdict: 'every multiplier at most 1; the worst case is 2ⁿ⁻¹ and this is it',
      },
      {
        method: 'Elimination, complete pivoting',
        values: ['-', '7.5 × 10⁻¹⁷', '2'],
        verdict: 'growth tamed, at 1,378,160 comparisons vs 12,880 (n = 160)',
      },
      {
        method: 'Exact rational arithmetic (n = 6)',
        values: ['-', 'agreement 10⁻¹⁴', '-'],
        verdict: 'the referee for the small systems',
      },
    ],
    source:
      'python solutions/gaussian_elimination_partial_pivoting.py prints this table and asserts: agreement with exact arithmetic under 10⁻¹²; residuals under 10⁻¹³ for partial and complete pivoting; no pivoting fails on a zero pivot and misses the 2 × 2 by more than 0.99 where pivoting is within 10⁻¹⁵; Wilkinson growth equal to 2²³ under partial pivoting and at most 2 under complete; random growth under 50; the multiply-add count growing 6.5 to 8.5× per doubling; complete pivoting’s searches more than 20× partial’s.',
  },

  figure: (
    <Figure
      id="fig-pivot-growth"
      aspect="16 / 7"
      caption="Why the largest entry pivots. Left: the 2 × 2 with ε = 10⁻¹⁷. Without pivoting the multiplier is 1/ε = 10¹⁷, the second row becomes (0, 1 − 10¹⁷) = (0, −10¹⁷) in floating point, and back-substitution returns x = (0, 1); with the rows swapped the multiplier is ε and the answer is (1, 1). Right: element growth. Wilkinson’s matrix (ones on the diagonal and last column, minus ones below the diagonal) doubles the last column at every step: 2²³ at order 24, the proven worst case; complete pivoting holds it at 2; random 80 × 80 matrices reached at most 8."
      cite={{
        text: 'J. H. Wilkinson, "Error analysis of direct methods of matrix inversion," J. ACM 8(3), 1961. DOI 10.1145/321075.321076. L. N. Trefethen, R. S. Schreiber, "Average-case stability of Gaussian elimination," SIAM J. Matrix Anal. Appl. 11(3), 1990.',
        href: 'https://doi.org/10.1145/321075.321076',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="The two by two example with and without pivoting, and a bar chart of element growth: Wilkinson under partial pivoting far above complete pivoting and random matrices">
        <text x="30" y="40" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="12">[ ε  1 ] [x₁]   [1]</text>
        <text x="30" y="58" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="12">[ 1  1 ] [x₂] = [2]     ε = 10⁻¹⁷</text>
        <text x="30" y="96" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">no pivot: multiplier 1/ε = 10¹⁷</text>
        <text x="30" y="112" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">row 2 → (0, 1 − 10¹⁷) = (0, −10¹⁷)</text>
        <text x="30" y="128" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">x = (0, 1)</text>
        <text x="30" y="160" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">partial pivot: swap rows, multiplier ε</text>
        <text x="30" y="176" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">row 2 → (0, 1 − ε) = (0, 1)</text>
        <text x="30" y="192" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">x = (1, 1)</text>
        <text x="30" y="230" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">80 × 80 residual: 2.0 × 10⁻¹⁴ without, 1.3 × 10⁻¹⁶ with</text>
        <text x="30" y="246" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">exact arithmetic (n = 6): agreement 10⁻¹⁴</text>
        <text x="360" y="40" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="12">element growth, log scale</text>
        <line x1="370" y1="60" x2="370" y2="230" stroke="rgba(154,165,189,0.4)" />
        <line x1="370" y1="230" x2="620" y2="230" stroke="rgba(154,165,189,0.4)" />
        <rect x="390" y="66" width="50" height="164" fill="#5da2ff" opacity="0.85" />
        <rect x="470" y="223" width="50" height="7" fill="#62d98a" opacity="0.9" />
        <rect x="550" y="209" width="50" height="21" fill="#9aa5bd" opacity="0.8" />
        <text x="384" y="248" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="10">Wilkinson, partial</text>
        <text x="384" y="262" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="10">2²³ = 8,388,608</text>
        <text x="466" y="248" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="10">Wilkinson, complete</text>
        <text x="466" y="262" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="10">2</text>
        <text x="546" y="248" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">random 80 × 80</text>
        <text x="546" y="262" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">at most 8</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'gaussian_elimination_partial_pivoting.py',
  Viz: GaussianViz,
  narration,
};
