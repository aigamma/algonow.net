import SimplexViz from '../viz/SimplexViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/simplex_dantzig_pivots.py?raw';
import { narration } from './simplex-dantzig-pivots.narration.js';

export const content = {
  given:
    'A linear objective and linear inequality constraints: the feasible set is a polytope, and somewhere on it the objective is largest.',
  task: 'Find the optimal vertex, exactly, with a certificate: a dual solution proving nothing better exists.',
  constraint:
    'Correctness includes termination. Degenerate corners can trap careless pivot rules in eternal cycles (demonstrated in exact arithmetic below), and adversarial polytopes can stretch greedy walks exponentially (measured: 4,095 pivots on a 12-dimensional cube).',

  origins: (
    <p>
      George Dantzig built the simplex method in <strong>1947</strong> for
      Air Force planning problems, and for two decades it looked
      unbeatable: a few dozen pivots on anything anyone tried. Then Klee
      and Minty (1972) squashed a cube so that Dantzig&apos;s reduced-cost rule visits{' '}
      <strong>every one of its 2ⁿ vertices</strong>, Beale had already
      (1955) exhibited a corner where it cycles forever, and Bland (1977)
      proved the humble smallest-index rule cannot cycle. Spielman and Teng&apos;s <strong>smoothed analysis</strong> (2004)
      proved a bound for a particular two-phase shadow-vertex simplex
      method: expected time polynomial in the dimensions and 1/σ under
      their Gaussian coefficient-perturbation model. The bound depends
      on the perturbation scale σ; it does not establish that guarantee
      for Dantzig&apos;s rule. The traps measured here remain real.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>walk and the certificate</strong>. The optimum of a
      linear objective over a polytope lies at a vertex; simplex walks
      vertex to adjacent vertex along edges that improve the objective,
      and when no improving edge remains it does not merely stop: the
      final tableau&apos;s reduced costs <em>are</em> a dual solution, and
      the tests verify it on five larger instances: dual feasible, gap
      zero. The answer arrives holding its own proof.
    </p>
  ),
  heurRole: (
    <p>
      Chooses <strong>which improving edge</strong>. Dantzig&apos;s rule
      takes the largest gain per unit of the entering variable: the most negative reduced cost in this tableau.
      On real ground that greed is superb: a median of{' '}
      <strong>9 pivots</strong> on random 30×60 programs, about 3.7 times below
      Bland&apos;s cautious 33.5. Its two failure modes are the page&apos;s
      story: on the Klee-Minty cube it takes exactly{' '}
      <strong>2ⁿ − 1</strong> pivots (63, 255, 1,023, 4,095 measured as n
      climbs), and at Beale&apos;s degenerate corner, with a plain
      tie-break, it <strong>cycles forever</strong>, revisiting a basis in
      exact rational arithmetic while Bland&apos;s rule walks out in six.
    </p>
  ),

  picture: (
    <p>
      A climber on a cut gemstone in fog, seeking the highest corner. The
      only sense available is local: from this corner, which edges lead
      upward, and what gain do they offer per unit of the entering variable?
      Dantzig&apos;s climber takes the largest such gain, not the largest
      gain per unit of geometric distance. The Klee-Minty stone is cut
      so that this choice at every corner belongs to the scenic route: the climber
      visits all 4,096 corners of a 12-dimensional stone, each step locally
      irreproachable. And one corner is polished so flat that several
      edges tie at zero gain: a climber who breaks ties carelessly circles
      it forever, feeling progress at every turn.
    </p>
  ),

  steps: [
    <>
      <strong>Stand at a vertex:</strong> a basis of tight constraints;
      the origin (all slacks basic) starts it here.
    </>,
    <>
      <strong>Price the edges:</strong> reduced costs say how the
      objective responds, per unit, to entering each nonbasic variable.
    </>,
    <>
      <strong>Choose by the rule:</strong> Dantzig takes the largest gain per unit of the entering variable;
      Bland the smallest index; random any improving one. The choice is
      the heuristic, and the contest prices all three.
    </>,
    <>
      <strong>Ratio test:</strong> increase the entering variable to
      the minimum nonnegative ratio; a basic variable reaches zero and
      leaves. Bland breaks ties by the smallest basic-variable index.
      No positive pivot-column entry means unbounded, reported as such.
    </>,
    <>
      <strong>Stop with proof:</strong> no negative reduced cost remains;
      the row of reduced costs on the slacks is the dual, verified
      feasible with zero gap.
    </>,
  ],

  signals: [
    <>
      You need <strong>exact vertex answers and duals</strong>:
      sensitivity, shadow prices, and the LP relaxations inside every
      integer-programming solver.
    </>,
    <>
      <strong>Warm starts matter:</strong> re-solving after one added
      constraint resumes from the old vertex: the property interior-point
      methods lack, and the reason branch-and-bound is simplex country.
    </>,
    <>
      <strong>Typical performance matters:</strong> measure your
      instances. The smoothed bound for the shadow-vertex method does
      not supply a polynomial guarantee for Dantzig&apos;s rule.
    </>,
  ],
  baseline: (
    <>
      The honest baseline for the <em>pivot rule</em> is Bland&apos;s
      smallest-index rule: never cycles (proven by Bland, demonstrated
      here on the exact instance where Dantzig loops), and pays for the
      guarantee with a median of <strong>33.5 pivots</strong> against
      Dantzig&apos;s 9 on random ground. Real solvers keep both: greed for
      speed, Bland as the anti-cycling parachute deployed only when
      degeneracy stalls progress.
    </>
  ),

  strength: (
    <>
      <strong>Fast in the world, and self-certifying.</strong> Nine median
      pivots on random 30×60 programs, the dual certificate free in the
      final tableau (verified: feasible, gap zero), and warm-startable.
      These measured results do not give Dantzig&apos;s rule a polynomial
      guarantee under coefficient perturbations.
    </>
  ),
  weakness: (
    <>
      <strong>The traps exist and are measured.</strong> Exactly 2ⁿ − 1
      pivots on Klee-Minty (4,095 at n = 12); an eternal cycle at
      Beale&apos;s corner under a plain tie-break, caught by basis
      tracking in exact arithmetic. And each dense tableau pivot costs
      O(mn): production solvers live on the revised simplex with sparse
      factorizations, plus Karmarkar-descended interior-point methods for
      the worst-case guarantee.
    </>
  ),

  problem: 'Linear programming',
  problemSlug: 'linear-programming',
  rivals: [
    {
      name: 'Simplex × Dantzig',
      isThisUnit: true,
      algoName: 'Simplex method',
      cost: 'exp worst, superb typical',
      wins: (
        <>
          <strong>9 median pivots</strong> where caution needs 33.5; the
          dual certificate free; warm starts for branch-and-bound.
        </>
      ),
      costs: (
        <>
          2ⁿ − 1 on the adversary&apos;s cube, and cycles at degenerate
          corners without a safeguard.
        </>
      ),
      when: 'The default LP engine, especially inside integer programming; greed with a parachute packed.',
    },
    {
      name: 'Simplex × Bland',
      algoName: 'Simplex method',
      cost: 'finite, always',
      wins: (
        <>
          <strong>Cannot cycle</strong>, by theorem, demonstrated here on
          the exact corner where Dantzig loops: six pivots to the
          optimum, in rational arithmetic.
        </>
      ),
      costs: (
        <>
          Slow greed: median 33.5 pivots on random ground, about 3.7 times
          Dantzig; nobody runs it as the primary rule.
        </>
      ),
      when: 'As the fallback rule under degeneracy: the parachute, not the aircraft.',
    },
    {
      name: 'Simplex × random edge',
      algoName: 'Simplex method',
      cost: '39 pivots on this cube; no general bound here',
      wins: (
        <>
          On this cube and random seed: <strong>39
          pivots</strong> on the Klee-Minty instance that costs Dantzig
          4,095. A measured improvement for this instance.
        </>
      ),
      costs: (
        <>
          Middling on this random sample (median 28.5); the measured
          cube result is not a worst-case guarantee.
        </>
      ),
      when: 'Comparing pivot rules on difficult instances; changing the rule is distinct from perturbing the coefficients.',
    },
    {
      name: 'Interior-point method',
      cost: 'polynomial, guaranteed',
      wins: (
        <>
          Karmarkar (1984) and descendants cut through the polytope&apos;s
          interior: polynomial on <strong>every</strong> instance,
          Klee-Minty included: the cube is only cursed along its skin.
        </>
      ),
      costs: (
        <>
          Each iteration solves a Newton system (heavy at scale), answers
          arrive in the interior needing rounding to a vertex, and warm
          starts are famously poor.
        </>
      ),
      when: 'Huge LPs, worst-case guarantees, one-shot solves: the complement, not the replacement.',
    },
  ],
  neverUse: {
    name: 'Enumerating the vertices',
    why: (
      <>
        &quot;The optimum is at a vertex, so check the vertices&quot; is
        this page&apos;s own oracle at toy size: 495 bases at 8 variables
        and 4 constraints, solved exactly. At the contest&apos;s modest
        30×60 it is C(90, 30) ≈ <strong>6 × 10²³</strong> bases: a mole of
        linear systems. The vertex theorem tells you where the answer
        lives, not that you can afford the neighborhood; simplex is
        precisely the discipline of visiting almost none of it (nine,
        median).
      </>
    ),
  },

  contest: {
    instance:
      'pivots to the proven optimum: 30 random programs (m = 30, n = 60, median) and the Klee-Minty cube at n = 12; the rules checked against exhaustive basis enumeration at toy size and Dantzig against dual certificates on five larger instances',
    columns: ['random LPs (median)', 'Klee-Minty n = 12'],
    rows: [
      {
        method: 'Dantzig (steepest rate)',
        isThisUnit: true,
        values: ['9', '4,095'],
        best: 0,
        verdict: 'greed wins the world and walks every corner of the trap: 2ⁿ − 1 exactly',
      },
      {
        method: 'Bland (smallest index)',
        values: ['33.5', '465'],
        verdict: 'the anti-cycling theorem, paying about 3.7× on this random sample',
      },
      {
        method: 'Random improving edge',
        values: ['28.5', '39'],
        best: 1,
        verdict: '105× fewer pivots than Dantzig on this cube and random seed',
      },
    ],
    source:
      'python solutions/simplex_dantzig_pivots.py prints this table and asserts all three rules match exhaustive basis enumeration on 25 exact-arithmetic instances, dual feasibility with zero gap on five larger instances, per-pivot feasibility, the Klee-Minty counts (63, 255, 1,023, 4,095: 2ⁿ − 1 at each n), and Beale’s corner: Dantzig revisits a basis in exact Fractions while Bland terminates at 1/20 in six pivots.',
  },

  figure: (
    <Figure
      id="fig-klee-minty"
      aspect="16 / 7"
      caption="The trap, at n = 3. Klee and Minty squash a cube so that from every vertex, the edge with the largest gain per unit of its entering variable belongs to the long way around: Dantzig's climber visits all 2³ corners in 7 pivots, each step locally irreproachable, while the illustrated three-pivot route to the top sat there the whole time. The construction scales: 2ⁿ − 1 pivots, measured on this page up to 4,095 at n = 12, while the random rule takes 39 pivots on the measured n = 12 instance. That changes the pivot rule, not the coefficients."
      cite={{
        text: 'Klee and Minty, "How Good is the Simplex Algorithm?", 1972; the cycling corner is Beale, 1955, and its cure is Bland, 1977. The shadow-vertex smoothed bound is Spielman and Teng, "Smoothed Analysis of Algorithms", JACM 51(3), 2004; its expected bound depends on dimensions and inverse Gaussian perturbation scale.',
        href: 'https://doi.org/10.1145/990308.990310',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="A squashed cube with the seven-step greedy path snaking through all eight vertices and a three-step direct path to the top">
        {(() => {
          const V = {
            a: [150, 240], b: [330, 252], c: [110, 150], d: [300, 158],
            e: [210, 196], f: [392, 206], g: [172, 96], h: [364, 104],
          };
          const cube = [['a','b'],['a','c'],['a','e'],['b','d'],['b','f'],['c','d'],['c','g'],['d','h'],['e','f'],['e','g'],['f','h'],['g','h']];
          const greedy = ['a','b','d','c','g','e','f','h'];
          const els = [];
          for (const [p, q] of cube) {
            els.push(<line key={`c${p}${q}`} x1={V[p][0]} y1={V[p][1]} x2={V[q][0]} y2={V[q][1]} stroke="rgba(93,162,255,0.35)" strokeWidth="1.2" />);
          }
          for (let i = 0; i + 1 < greedy.length; i++) {
            const [x1, y1] = V[greedy[i]];
            const [x2, y2] = V[greedy[i + 1]];
            els.push(<line key={`g${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#e06767" strokeWidth="2.2" opacity="0.9" />);
          }
          els.push(<line key="s1" x1={V.a[0]} y1={V.a[1]} x2={V.e[0]} y2={V.e[1]} stroke="#62d98a" strokeWidth="2.4" strokeDasharray="6 4" />);
          els.push(<line key="s2" x1={V.e[0]} y1={V.e[1]} x2={V.g[0]} y2={V.g[1]} stroke="#62d98a" strokeWidth="2.4" strokeDasharray="6 4" />);
          els.push(<line key="s3" x1={V.g[0]} y1={V.g[1]} x2={V.h[0]} y2={V.h[1]} stroke="#62d98a" strokeWidth="2.4" strokeDasharray="6 4" />);
          for (const [name, [x, y]] of Object.entries(V)) {
            els.push(<circle key={`v${name}`} cx={x} cy={y} r={name === 'h' ? 8 : 5} fill={name === 'h' ? '#f0b94b' : name === 'a' ? '#e9edf6' : '#5da2ff'} />);
          }
          return els;
        })()}
        <text x="120" y="272" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="11">start</text>
        <text x="384" y="88" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">optimum</text>
        <text x="440" y="180" fill="#e06767" fontFamily="ui-monospace, monospace" fontSize="12">Dantzig: 7 pivots,</text>
        <text x="440" y="196" fill="#e06767" fontFamily="ui-monospace, monospace" fontSize="12">every vertex visited</text>
        <text x="440" y="226" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="12">a 3-pivot route</text>
        <text x="440" y="242" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="12">existed throughout</text>
        <text x="30" y="36" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="12">Dantzig maximizes gain per unit of the entering variable</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'simplex_dantzig_pivots.py',
  Viz: SimplexViz,
  narration,
};
