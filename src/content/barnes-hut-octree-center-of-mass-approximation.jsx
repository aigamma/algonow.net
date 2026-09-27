import BarnesHutViz from '../viz/BarnesHutViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/barnes_hut_octree_center_of_mass_approximation.py?raw';
import { narration } from './barnes-hut-octree-center-of-mass-approximation.narration.js';

export const content = {
  given:
    'N masses attract each other by an inverse-square law, and every step of a simulation needs the force on every body. Direct summation costs N(N − 1)/2 pair interactions per step: 499,500 for a thousand bodies, 499,999,500,000 for a million. The bodies here sit in a few clumps inside a unit cube, with Plummer softening so that close pairs stay finite.',
  task: 'Barnes-Hut. Put the bodies in an octree, each cell split into eight until every cell holds one body, and record every cell’s total mass and center of mass. Compute the force on a body by walking the tree from the root. The heuristic is the opening criterion: if a cell’s size divided by its distance is below θ, treat the whole cell as one point mass at its center of mass; otherwise open it and look at its children. Far groups collapse into single interactions, and the cost falls toward N log N.',
  constraint:
    'Measured against direct summation over every pair, with the same softening, on 1,000 clustered bodies: θ = 0 opens every cell and reproduces the direct forces to 2.5e-15; θ = 0.3 / 0.5 / 0.7 / 1.0 / 2.0 costs 341,842 / 195,766 / 130,172 / 76,431 / 28,023 interactions for a median relative force error of 1.2e-3 / 6.0e-3 / 1.6e-2 / 3.8e-2 / 1.7e-1 (worst 1.3e-2 / 5.2e-2 / 9.4e-2 / 2.7e-1 / 1.21). At θ = 0.5 across N = 250 / 500 / 1,000 / 2,000: 24,929 / 77,200 / 209,303 / 539,758 interactions against 62,250 / 249,500 / 999,000 / 3,998,000 body-interactions for direct summation; the tree grew 21.7× for an 8× increase in N, direct summation 64×. Every cell’s mass and center of mass equal its bodies’ to 1e-9 and every body sits in exactly one leaf. A 300-body cluster integrated for 40 leapfrog steps drifts in energy by 2.2e-3 with tree forces and 1.3e-3 with direct forces, and in momentum by 2.5e-3 against 5.8e-17, because the tree’s forces are not exactly antisymmetric.',

  origins: (
    <p>
      Josh Barnes and Piet Hut published the tree code in{' '}
      <strong>1986</strong> (Nature 324, &quot;A hierarchical O(N log N)
      force-calculation algorithm&quot;), replacing the pairwise sum that
      had limited galaxy simulations to a few thousand stars with an
      adaptive octree and a single tunable, the opening angle. Appel
      (1985) had proposed a similar hierarchy; Greengard and Rokhlin
      (1987) took the idea to its limit in the fast multipole method,
      which expands far fields to higher order and reaches O(N) with
      guaranteed error bounds. Hernquist (1987) and Salmon and Warren
      (1994) made the tree code parallel and gave it better opening
      criteria; Springel&apos;s GADGET (2001, 2005) combined a tree with a
      mesh and ran the Millennium simulation&apos;s ten billion
      particles. The same tree drives molecular dynamics, smoothed
      particle hydrodynamics, and the force-directed graph layouts in
      every visualization library, where the &quot;bodies&quot; are nodes
      pushing each other apart.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>tree and its bookkeeping</strong>: every body in
      exactly one leaf, every cell&apos;s mass the sum of its bodies&apos;
      and its center of mass their mass-weighted mean, checked on every
      cell to 1e-9, so that a cell can stand in for its contents
      wherever the heuristic allows. The referee is direct summation:
      with θ = 0 the walk opens every cell and returns the direct forces
      to <strong>2.5e-15</strong>, which proves the tree contains the
      same physics before any approximation is made. The algorithm also
      owns the physics check: a 300-body cluster integrated for 40
      leapfrog steps with tree forces drifts in energy by 2.2e-3
      against 1.3e-3 with direct forces, and its trajectories stay
      within 2.1e-3 of the direct ones.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>opening angle</strong>, the one number that
      trades accuracy for cost, and the page measures the trade at five
      settings. At θ = 0.5, the value most codes ship with, a body
      interacts with 196 cells instead of 999 bodies and its force is
      wrong by <strong>0.6% in the median</strong>, 5% at worst; at 0.3
      the error is 0.12% for 342 interactions; at 2.0 the walk barely
      opens anything, 28 interactions, and the median error is 17%. The
      collapse is what a center of mass can do: the monopole of a far
      cell is exact to first order in the cell&apos;s size over its
      distance, and the quadrupole error it leaves is what θ bounds. The
      price the heuristic cannot hide is symmetry: the force of A on B
      is computed from a different tree walk than B on A, so momentum
      drifts, 2.5e-3 over 40 steps against 5.8e-17 for direct forces.
    </p>
  ),

  picture: (
    <p>
      A census taker who must learn how strongly every town pulls on
      every other, where pull fades with the square of distance. Town by
      town, pair by pair, is a lifetime. Instead, draw the map in a grid
      of squares, each split into four until every square holds one
      town, and write on every square its total population and where
      that population balances. For a given town, look at a square: if
      it is small compared with how far away it is, its whole population
      pulls as one lump from the balance point, one calculation; if it
      is large and near, open it and look at its four quarters. Distant
      provinces collapse into single lumps, the neighborhood is
      examined house by house, and the rule for &quot;small compared
      with far&quot; is the only thing to decide.
    </p>
  ),

  steps: [
    <>
      <strong>Build:</strong> insert each body; a cell with two bodies
      splits into eight children; leaves hold one body.
    </>,
    <>
      <strong>Summarize:</strong> bottom-up, each cell&apos;s mass and
      center of mass from its children.
    </>,
    <>
      <strong>Walk:</strong> for body b at the root: if the cell is a
      leaf, add its pull; else if size / distance &lt; θ, add the pull
      of its center of mass; else recurse into the children.
    </>,
    <>
      <strong>Integrate:</strong> leapfrog with the tree forces; rebuild
      the tree every step.
    </>,
    <>
      <strong>Check</strong> against direct summation on a sample, and
      watch energy and momentum.
    </>,
  ],

  signals: [
    <>
      <strong>Long-range pairwise forces on many bodies:</strong>
      gravity, electrostatics, graph layout; anything where every pair
      matters but far pairs matter smoothly.
    </>,
    <>
      <strong>Clustered, uneven distributions:</strong> the adaptive
      tree follows the bodies; a fixed grid would waste its cells on
      empty space.
    </>,
    <>
      <strong>A few percent of force error is acceptable:</strong>
      simulations already carry integration and softening error of that
      size.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>direct summation</strong>: every
      pair, exact to rounding, antisymmetric so momentum is conserved,
      and the referee on this page. Below a few thousand bodies it is
      the right answer, and on a GPU below a few hundred thousand.
    </>
  ),

  strength: (
    <>
      <strong>Adaptive, tunable, and a tenth of the pairs.</strong> 196
      interactions per body instead of 999 at 0.6% median error, a
      21.7× cost increase where direct summation pays 64×, and a tree
      that follows the clumps wherever they go.
    </>
  ),
  weakness: (
    <>
      <strong>No error bound, no symmetry, and a constant that bites.</strong>{' '}
      θ trades cost for error empirically, with a worst case ten times
      the median (5% at θ = 0.5); the forces are not antisymmetric, so
      momentum drifts where direct summation holds it to rounding;
      dense clumps open many cells, which is why the count grew 21.7×
      rather than the 11× of N log N here; and the tree is rebuilt
      every step.
    </>
  ),

  problem: 'N-body simulation',
  problemSlug: 'n-body',
  rivals: [
    {
      name: 'Barnes-Hut × Octree center-of-mass approximation',
      isThisUnit: true,
      algoName: 'Barnes-Hut',
      cost: 'about N log N interactions per step',
      wins: (
        <>
          <strong>0.6% median error at a fifth of the interactions</strong>;
          adapts to any distribution.
        </>
      ),
      costs: (
        <>
          Empirical error control; momentum not conserved exactly.
        </>
      ),
      when: 'Gravity or layout on tens of thousands to millions of bodies with clumpy structure.',
    },
    {
      name: 'Fast multipole method',
      algoName: 'Fast multipole method',
      cost: 'O(N) with a large constant',
      wins: (
        <>
          Higher-order expansions with a provable error bound, and
          cell-to-cell translations that make the cost linear.
        </>
      ),
      costs: (
        <>
          Far more code and a large constant; wins over the tree only
          at high accuracy or very large N.
        </>
      ),
      when: 'Millions of bodies with tight accuracy targets, electrostatics, integral equations.',
    },
    {
      name: 'Particle mesh Ewald',
      algoName: 'Particle mesh Ewald',
      cost: 'a grid, an FFT, and a short-range sum',
      wins: (
        <>
          The long-range part on a grid by FFT, N log N with a small
          constant and periodic boundaries for free.
        </>
      ),
      costs: (
        <>
          A fixed grid resolves clumps poorly; needs periodicity or a
          large box.
        </>
      ),
      when: 'Molecular dynamics in periodic boxes and cosmology on near-uniform fields.',
    },
    {
      name: 'Leapfrog integration',
      algoName: 'Leapfrog integration',
      cost: 'one force evaluation per step',
      wins: (
        <>
          The symplectic integrator the page uses: energy drift bounded
          over long runs, time-reversible, one force per step.
        </>
      ),
      costs: (
        <>
          A fixed step; close encounters need shorter steps or
          softening, as here.
        </>
      ),
      when: 'Any force method; the integrator is the other half of a simulation.',
    },
  ],
  neverUse: {
    name: 'Direct summation at a million bodies',
    why: (
      <>
        The pairwise sum is exact, simple, and antisymmetric, and it is
        the wrong tool the moment N is large: 499,999,500,000 pair
        interactions per step at a million bodies, which is not run on
        this page because a Python implementation would take a season
        per step. The tree at the measured ratios needs between{' '}
        <strong>250 and 490 million</strong>, an extrapolation, but a
        thousand times fewer at the low end. The measurement on this
        page is the growth: from 250 to 2,000 bodies the direct count
        rose 64× and the tree&apos;s 21.7×; every further doubling
        widens the gap by two. The exactness is real and it is worth a
        few percent of force error many thousands of times over.
      </>
    ),
  },

  contest: {
    instance:
      'forces on N bodies in five Gaussian clumps inside the unit cube, Plummer softening 0.05; referee: direct summation over every pair with the same softening',
    columns: ['interactions', 'median relative error', 'worst'],
    rows: [
      {
        method: 'θ = 0 (every cell opened), 1,000 bodies',
        values: ['999,000', '2.5e-15', '2.5e-15'],
        verdict: 'the tree reproduces direct summation',
      },
      {
        method: 'θ = 0.3',
        values: ['341,842', '1.2e-3', '1.3e-2'],
        verdict: 'a third of the pairs, a tenth of a percent',
      },
      {
        method: 'θ = 0.5',
        isThisUnit: true,
        values: ['195,766', '6.0e-3', '5.2e-2'],
        best: 0,
        verdict: 'the usual setting',
      },
      {
        method: 'θ = 0.7 / 1.0',
        values: ['130,172 / 76,431', '1.6e-2 / 3.8e-2', '9.4e-2 / 2.7e-1'],
        verdict: 'cheaper and rougher',
      },
      {
        method: 'θ = 2.0',
        values: ['28,023', '1.7e-1', '1.21'],
        verdict: 'fast and wrong',
      },
      {
        method: 'scaling at θ = 0.5, N = 250 / 500 / 1,000 / 2,000',
        values: ['24,929 / 77,200 / 209,303 / 539,758', 'direct: 62,250 / 249,500 / 999,000 / 3,998,000 body-interactions', 'tree 21.7×, direct 64×'],
        verdict: 'the gap doubles with every doubling',
      },
      {
        method: 'physics: 300 bodies, 40 leapfrog steps',
        values: ['energy drift 2.2e-3 (direct 1.3e-3)', 'momentum drift 2.5e-3 (direct 5.8e-17)', 'positions within 2.1e-3'],
        verdict: 'not antisymmetric',
      },
    ],
    source:
      'python solutions/barnes_hut_octree_center_of_mass_approximation.py prints this table and asserts: 1,000 bodies in 1,000 leaves with every cell’s mass and center of mass exact to 1e-9; θ = 0 within 1e-9 of direct summation at exactly 999,000 interactions; median errors increasing with θ, under 1% at θ = 0.5 with the worst under 10%, and θ = 2 more than three times worse; the tree’s count growing between 8× and 30× across the 8× range of N while direct summation grows more than 60×, with the tree under a quarter of the body-interactions at 2,000; energy drift under 2% for both integrations, momentum drift under 1e-9 for direct forces and under 1e-2 for tree forces.',
  },

  figure: (
    <Figure
      id="fig-bh-opening"
      aspect="16 / 7"
      caption="The quadtree of a clumpy plane and one body’s walk at θ = 0.5. Cells far enough away, size over distance below θ, are accepted as single point masses at their centers of mass (amber); cells too close are opened (outlined), down to individual bodies near the target. Right: the measured trade from the file, interactions per 1,000-body evaluation against the median force error, θ from 0.3 to 2.0."
      cite={{
        text: 'J. Barnes, P. Hut, "A hierarchical O(N log N) force-calculation algorithm," Nature 324, 1986. DOI 10.1038/324446a0. L. Greengard, V. Rokhlin, "A fast algorithm for particle simulations," Journal of Computational Physics 73, 1987. V. Springel, "The cosmological simulation code GADGET-2," MNRAS 364, 2005.',
        href: 'https://doi.org/10.1038/324446a0',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="A quadtree over clumped points with accepted far cells shaded and opened near cells outlined, beside a chart of interactions against force error for five opening angles">
        {(() => {
          // a small deterministic quadtree picture
          const pts = [];
          let seed = 7;
          const rnd = () => {
            seed = (seed * 1103515245 + 12345) % 2147483648;
            return seed / 2147483648;
          };
          const centers = [[0.22, 0.25], [0.7, 0.3], [0.35, 0.75], [0.78, 0.78]];
          for (let i = 0; i < 120; i++) {
            const c = centers[i % 4];
            pts.push([Math.min(0.98, Math.max(0.02, c[0] + (rnd() + rnd() + rnd() - 1.5) * 0.12)), Math.min(0.98, Math.max(0.02, c[1] + (rnd() + rnd() + rnd() - 1.5) * 0.12))]);
          }
          const target = [0.24, 0.27];
          const cells = [];
          const build = (cx, cy, half, members, depth) => {
            if (members.length <= 1 || depth > 4) {
              if (members.length) cells.push({ cx, cy, half, members });
              return;
            }
            const q = [[], [], [], []];
            for (const p of members) q[(p[0] >= cx ? 1 : 0) | (p[1] >= cy ? 2 : 0)].push(p);
            const h = half / 2;
            q.forEach((m, k) => build(cx + (k & 1 ? h : -h), cy + (k & 2 ? h : -h), h, m, depth + 1));
          };
          // walk with theta on an implicit tree: collect accepted and opened cells
          const accepted = [];
          const opened = [];
          const walk = (cx, cy, half, members, depth) => {
            if (!members.length) return;
            const mx = members.reduce((a, p) => a + p[0], 0) / members.length;
            const my = members.reduce((a, p) => a + p[1], 0) / members.length;
            const d = Math.hypot(mx - target[0], my - target[1]);
            if (members.length === 1 || (d > 0 && (2 * half) / d < 0.5)) {
              accepted.push({ cx, cy, half, mx, my, n: members.length });
              return;
            }
            opened.push({ cx, cy, half });
            const q = [[], [], [], []];
            for (const p of members) q[(p[0] >= cx ? 1 : 0) | (p[1] >= cy ? 2 : 0)].push(p);
            const h = half / 2;
            q.forEach((m, k) => walk(cx + (k & 1 ? h : -h), cy + (k & 2 ? h : -h), h, m, depth + 1));
          };
          walk(0.5, 0.5, 0.5, pts, 0);
          const ox = 20;
          const oy = 30;
          const size = 220;
          const X = (v) => ox + v * size;
          const Y = (v) => oy + v * size;
          const chart = [[0.3, 341842, 1.2e-3], [0.5, 195766, 6.0e-3], [0.7, 130172, 1.6e-2], [1.0, 76431, 3.8e-2], [2.0, 28023, 1.7e-1]];
          const cx0 = 300;
          const cy0 = 230;
          const cw = 310;
          const chh = 180;
          const CX = (n) => cx0 + ((Math.log10(n) - 4.3) / 1.4) * cw;
          const CY = (e) => cy0 - ((Math.log10(e) + 3) / 3) * chh;
          return (
            <g>
              <rect x={ox} y={oy} width={size} height={size} fill="none" stroke="#9aa5bd" strokeOpacity="0.4" />
              {opened.map((c, i) => <rect key={`o-${i}`} x={X(c.cx - c.half)} y={Y(c.cy - c.half)} width={2 * c.half * size} height={2 * c.half * size} fill="none" stroke="#9aa5bd" strokeOpacity="0.25" />)}
              {accepted.filter((c) => c.n > 1).map((c, i) => (
                <g key={`a-${i}`}>
                  <rect x={X(c.cx - c.half)} y={Y(c.cy - c.half)} width={2 * c.half * size} height={2 * c.half * size} fill="#f0b94b" fillOpacity="0.15" stroke="#f0b94b" />
                  <circle cx={X(c.mx)} cy={Y(c.my)} r={2 + Math.sqrt(c.n)} fill="#f0b94b" />
                </g>
              ))}
              {pts.map((p, i) => <circle key={`p-${i}`} cx={X(p[0])} cy={Y(p[1])} r="1.5" fill="#5da2ff" />)}
              <circle cx={X(target[0])} cy={Y(target[1])} r="4" fill="#e9edf6" />
              <text x={ox} y={oy + size + 16} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">amber: far cells as point masses; outlined: opened</text>
              <line x1={cx0} y1={cy0} x2={cx0 + cw} y2={cy0} stroke="#9aa5bd" strokeOpacity="0.5" />
              <line x1={cx0} y1={cy0} x2={cx0} y2={cy0 - chh} stroke="#9aa5bd" strokeOpacity="0.5" />
              <polyline points={chart.map(([, n, e]) => `${CX(n)},${CY(e)}`).join(' ')} fill="none" stroke="#f0b94b" strokeWidth="1.5" />
              {chart.map(([th, n, e]) => (
                <g key={th}>
                  <circle cx={CX(n)} cy={CY(e)} r="4" fill={th === 0.5 ? '#5da2ff' : '#f0b94b'} />
                  <text x={CX(n) + 6} y={CY(e) - 6} fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="9">{`θ ${th}`}</text>
                </g>
              ))}
              <text x={cx0} y={cy0 + 14} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">interactions per evaluation, 28k to 342k (log)</text>
              <text x={cx0 + 6} y={cy0 - chh + 10} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">median force error, 1e-3 to 1 (log)</text>
              <text x={cx0} y={cy0 + 30} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">direct: 999,000 interactions, error 0; θ = 0.5 is a fifth of that at 0.6%</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'barnes_hut_octree_center_of_mass_approximation.py',
  Viz: BarnesHutViz,
  narration,
};
