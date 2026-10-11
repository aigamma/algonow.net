import ForceDirectedViz from '../viz/ForceDirectedViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/fruchterman_reingold_force_directed_placement.py?raw';
import { narration } from './fruchterman-reingold-force-directed-placement.narration.js';

export const content = {
  given:
    'A graph with no coordinates: vertices and edges only, a few dozen to a few thousand, and a screen. Draw it so a person can read it: adjacent vertices near, everything else apart, few crossings.',
  task: 'Fruchterman-Reingold. The algorithm is force-directed layout: treat the drawing as a physical system, let it move under forces, and read the resting positions as coordinates. The heuristic is the 1991 force pair with a cooling cap: every pair of vertices repels with strength k² / d, every edge attracts with strength d² / k, where k = √(area / n) is the ideal edge length, so the forces balance exactly at d = k; each iteration moves every vertex along its net force by at most a temperature t, and t falls linearly to zero, so the drawing settles instead of jittering. Repulsion is all pairs, O(n²) per iteration.',
  constraint:
    'Measured in pure Python on the free plane, two hundred iterations, t from 0.1 to 0. A twelve-cycle from ten random starts came out a convex crossing-free polygon ten times with edge-length CV at most 0.005; a 5 × 5 grid unfolded on nine of ten starts with a mean corner error of 1.5°, and stayed folded with 11 crossings from the circular start. On a 6 × 6 grid (36 vertices, 60 edges) a scale-free stress against graph distance (0 is perfect) read 0.3372 for the random start with 522 crossings, 0.2088 for the circular layout with 135, and 0.0135 for Fruchterman-Reingold with 0 crossings after 126,000 pair forces in about 46 ms; Kamada-Kawai reached 0.0125 in 2,160 Newton steps, spectral layout 0.0166. Cooling took the displacement per iteration from 3.517 to 0.099; with t fixed it stayed at 3.600. The paper’s grid-cell cutoff at n = 144 cut 2,059,200 pair forces to 320,227 but dropped 77.2% of the repulsion and left 114 crossings where the exact sum left 4. K₈ drew with 56 crossings against a known minimum of 19.',

  origins: (
    <p>
      Peter Eades (<strong>1984</strong>) built the first spring embedder: edges
      as springs, vertices as repelling rings, iterate until rest. Kamada and
      Kawai (1989) replaced the physics with an energy, a spring between every
      pair with rest length proportional to graph distance, minimized by
      Newton steps. Fruchterman and Reingold (1991) kept the physics and fixed
      what made Eades slow and unstable: one scale k = √(area / n) with forces
      that balance at k, and a cooling cap so the drawing settles. Barnes-Hut
      summation (puzzle 112) and ForceAtlas2 (Jacomy et al. 2014, the engine
      in Gephi) later took repulsion past the all-pairs wall.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>model</strong>: a drawing is a configuration of a
      physical system, and a good drawing is a low-energy one. Adjacent
      vertices pulled together and all vertices pushed apart encodes the two
      aesthetics people read, and symmetric graphs recover their symmetry
      because the forces have it: the twelve-cycle came out a{' '}
      <strong>convex polygon ten times in ten</strong> with edge lengths equal
      to half a percent, the grid a grid with 1.5° corners. It also owns the
      limits: nothing is minimized explicitly, so the forty-cycle kept one
      crossing at stress 0.1604 where the plain circle scores 0.0147, and K₈
      drew 56 crossings against a possible 19.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>forces and the schedule</strong>. One scale k makes the
      forces balance at the ideal edge length, so nothing is tuned per graph.
      The cap keeps a bad early force from flinging a vertex across the page,
      and cooling it to zero turns motion into a layout:{' '}
      <strong>3.517 units of movement per iteration became 0.099</strong>,
      while the uncooled run was still moving 3.600 at the end with a worse
      drawing (stress 0.0164, edge CV 0.235 against 0.110). The energy these
      forces descend fell from 33.25 to 5.09, though only 59% of the capped
      steps lowered it: a heuristic, not a descent.
    </p>
  ),

  picture: (
    <p>
      Charged marbles on a table, all shoving each other apart, with rubber
      bands tying the connected pairs together. Let go: the bands pull, the
      charges push, and the marbles slide into a shape where every band is
      about the same length and no marble is crowded. The trick is that the
      table gets stickier every second: early on the marbles can slide far
      and escape a tangle, by the end they can barely twitch, so the picture
      freezes instead of trembling forever. The shape was never computed. It
      was found, by a system that wanted to rest.
    </p>
  ),

  steps: [
    <>
      <strong>Set the scale:</strong> k = √(area / n), where d² / k equals
      k² / d; scatter the vertices at random inside the area.
    </>,
    <>
      <strong>Sum the forces:</strong> every pair pushes apart by k² / d along
      the line between them; every edge pulls together by d² / k: n(n − 1) / 2
      pair terms plus m edge terms.
    </>,
    <>
      <strong>Move, capped:</strong> each vertex moves along its net force by
      min(|force|, t); the cap t is the temperature.
    </>,
    <>
      <strong>Cool:</strong> lower t linearly to zero across the fixed budget;
      the last moves are cap-bound, about 3% of the first.
    </>,
    <>
      <strong>Scale it:</strong> approximate the repulsion with Barnes-Hut or
      a multilevel scheme, never a distance cutoff, which drops the long-range
      push that unfolds a sheet.
    </>,
  ],

  signals: [
    <>
      <strong>A graph without coordinates that a person must read:</strong>{' '}
      a dependency graph, a social network sample, a state machine, a protein
      interaction map.
    </>,
    <>
      <strong>Symmetry or clusters you want to surface</strong> rather than
      impose: the forces find them because they have them.
    </>,
    <>
      <strong>A few dozen to a few thousand vertices:</strong> all-pairs
      repulsion is 126,000 force evaluations for 36 vertices and two hundred
      iterations, and quadratic from there.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>the circular layout</strong>: vertices
      evenly on a circle in index order, zero work, 135 crossings and stress
      0.2088 on the 6 × 6 grid, and the exact optimum for a plain cycle.
    </>
  ),

  strength: (
    <>
      <strong>Readable drawings from no information, one scale, no tuning.</strong>{' '}
      Zero crossings on the grid, the tree, and the twelve-cycle from random
      starts; stress 0.0135 against 0.3372 for the start; 46 ms.
    </>
  ),
  weakness: (
    <>
      <strong>A local rest, not an optimum, at quadratic cost.</strong> One
      grid start in ten stayed folded, the circular start stayed folded (16
      crossings), the forty-cycle kept a crossing the circle avoids, K₈ drew
      56 crossings against a possible 19, and every iteration touches every
      pair: 10,296 at n = 144, about 5 × 10¹¹ at a million.
    </>
  ),

  problem: 'Graph layout',
  problemSlug: 'graph-layout',
  rivals: [
    {
      name: 'Fruchterman-Reingold × Force-directed placement',
      isThisUnit: true,
      algoName: 'Fruchterman-Reingold',
      cost: 'O(n² + m) per iteration, a fixed number of iterations',
      wins: (
        <>
          <strong>0 crossings and stress 0.0135</strong> on the grid from a
          random start; the cycle a convex polygon ten of ten; one scale, no
          tuning.
        </>
      ),
      costs: (
        <>
          Settles into local tangles (one grid start in ten, the forty-cycle);
          all-pairs repulsion every iteration.
        </>
      ),
      when: 'The default first drawing of any graph up to a few thousand vertices when structure should emerge rather than be imposed.',
    },
    {
      name: 'Kamada-Kawai',
      algoName: 'Kamada-Kawai',
      cost: 'O(n²) distances once, then O(n) per Newton step',
      wins: (
        <>
          Minimizes stress directly: <strong>0.0125</strong> on the grid in
          2,160 Newton steps, edge CV 0.012, the exact circle for the
          forty-cycle; the lowest stress on all four test graphs.
        </>
      ),
      costs: (
        <>
          Needs all-pairs shortest paths and a dense spring matrix; one basin,
          so a bad start stays bad.
        </>
      ),
      when: 'When faithful distances matter more than spread, and n is in the hundreds.',
    },
    {
      name: 'Spectral layout',
      algoName: 'Spectral layout',
      cost: 'two Laplacian eigenvectors, O(m) per power-iteration step',
      wins: (
        <>
          No schedule and a unique answer: <strong>0 crossings</strong> and
          stress 0.0166 on the grid in 17 ms, the perfect circle for the
          cycle.
        </>
      ),
      costs: (
        <>
          Crushes irregular graphs: edge CV 1.002 on the random tree (vertices
          piled at the center), 8 crossings on the ring with chords.
        </>
      ),
      when: 'Regular, mesh-like graphs, or as the start that force-directed refinement improves.',
    },
    {
      name: 'ForceAtlas2',
      algoName: 'ForceAtlas2',
      cost: 'O(n log n) per iteration with Barnes-Hut repulsion',
      wins: (
        <>
          The same force picture at a hundred thousand vertices: a quadtree
          approximates far repulsion instead of dropping it.
        </>
      ),
      costs: (
        <>
          Several knobs (scaling, gravity, tolerance), continuous rather than
          cooled, and an approximation error to set.
        </>
      ),
      when: 'When n is past a few thousand and the all-pairs wall is the problem; puzzle 112 is the Barnes-Hut lesson.',
    },
  ],
  neverUse: {
    name: 'Exact all-pairs repulsion at a million vertices, or a hard distance cutoff instead',
    why: (
      <>
        Every iteration evaluates n(n − 1) / 2 pair forces: <strong>10,296</strong>{' '}
        at n = 144, about 5 × 10¹¹ at a million vertices, a day of work per
        step. The tempting fix in the original paper, repelling only within
        neighboring cells of side 2k, cut 2,059,200 pair forces to 320,227 but
        dropped 77.2% of the repulsion at the start, and the sheet never
        unfolded: <strong>114 crossings against 4</strong>, stress 0.1448
        against 0.0310. Far vertices push weakly but there are many of them,
        and their sum opens the tangle. Approximate all pairs; never cut them.
      </>
    ),
  },

  contest: {
    instance:
      'the 6 × 6 grid graph (36 vertices, 60 edges) from one seeded random start; referees: crossing count, edge-length coefficient of variation, scale-free stress against graph distance (0 is perfect)',
    columns: ['crossings', 'edge-length CV', 'stress', 'work'],
    rows: [
      {
        method: 'random layout (the start)',
        values: ['522', '0.452', '0.3372', '0'],
        verdict: 'what every method starts from',
      },
      {
        method: 'circular layout',
        values: ['135', '0.703', '0.2088', '0'],
        verdict: 'the baseline; optimal for a cycle, a folded sheet for a grid',
      },
      {
        method: 'Fruchterman-Reingold, cooled',
        isThisUnit: true,
        values: ['0', '0.110', '0.0135', '126,000 pair forces'],
        best: 0,
        verdict: 'unfolded in about 46 ms',
      },
      {
        method: 'Kamada-Kawai',
        values: ['0', '0.012', '0.0125', '2,160 Newton steps'],
        best: 2,
        verdict: 'stress minimized directly',
      },
      {
        method: 'spectral layout',
        values: ['0', '0.277', '0.0166', 'two eigenvectors'],
        verdict: 'closed form, no schedule',
      },
    ],
    source:
      'python solutions/fruchterman_reingold_force_directed_placement.py prints these rows and asserts: the twelve-cycle convex and crossing-free ten of ten; FR stress below the random start on every graph and below the circular layout on all but the cycle, where the circle is optimal; Kamada-Kawai at or below FR on stress; the cooled displacement ending under 5% of the opening one and the uncooled run over ten times it; bitwise determinism; K₆ and K₈ at or above their known rectilinear crossing numbers.',
  },

  figure: (
    <Figure
      id="fig-fr-forces"
      aspect="16 / 7"
      caption="Left: the two forces against distance in units of k. Attraction d² / k (blue) grows, repulsion k² / d (amber) shrinks, and they balance at d = k (green), the edge length the system settles toward. Right: scale-free stress of five layouts of the 6 × 6 grid from the same random start, with crossing counts; 0 is a perfect embedding of graph distance."
      cite={{
        text: 'T. M. J. Fruchterman and E. M. Reingold, "Graph Drawing by Force-directed Placement," Software: Practice and Experience 21(11), 1991. P. Eades, "A Heuristic for Graph Drawing," Congressus Numerantium 42, 1984. T. Kamada and S. Kawai, "An Algorithm for Drawing General Undirected Graphs," Information Processing Letters 31(1), 1989.',
        href: 'https://doi.org/10.1002/spe.4380211102',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="Attraction and repulsion curves balancing at the ideal edge length, beside a bar chart of layout stress for five layouts of a grid graph">
        {(() => {
          const x0 = 40;
          const y0 = 220;
          const fx = (d) => x0 + (d / 2.5) * 240;
          const fy = (f) => y0 - (Math.min(f, 3) / 3) * 170;
          const pts = (fn) => Array.from({ length: 46 }, (_, i) => 0.2 + i * 0.05).map((d) => `${fx(d).toFixed(1)},${fy(fn(d)).toFixed(1)}`).join(' ');
          const bars = [['random', 0.3372, 522, '#9aa5bd'], ['circular', 0.2088, 135, '#9aa5bd'], ['FR', 0.0135, 0, '#5da2ff'], ['Kamada-Kawai', 0.0125, 0, '#62d98a'], ['spectral', 0.0166, 0, '#f0b94b']];
          const bx = 350;
          const hgt = (v) => Math.max((v / 0.36) * 170, 3);
          return (
            <g fontFamily="ui-monospace, monospace">
              <text x={x0} y="30" fill="#9aa5bd" fontSize="10">force against distance, in units of k</text>
              <path d={`M ${x0} ${y0 - 170} V ${y0} H ${x0 + 240}`} fill="none" stroke="#9aa5bd" strokeWidth="1" />
              <polyline points={pts((d) => d * d)} fill="none" stroke="#5da2ff" strokeWidth="2" />
              <polyline points={pts((d) => 1 / d)} fill="none" stroke="#f0b94b" strokeWidth="2" />
              <circle cx={fx(1)} cy={fy(1)} r="4" fill="#62d98a" />
              <text x={fx(1) - 10} y={y0 + 14} fill="#62d98a" fontSize="10">d = k</text>
              <text x={fx(1.55)} y={fy(2.6)} fill="#5da2ff" fontSize="10">attraction d² / k</text>
              <text x={fx(1.4)} y={fy(0.55)} fill="#f0b94b" fontSize="10">repulsion k² / d</text>
              <text x={x0} y="250" fill="#9aa5bd" fontSize="10">k = √(area / n); each vertex moves at most t per iteration</text>
              <text x={bx} y="30" fill="#9aa5bd" fontSize="10">stress on the 6 × 6 grid (0 is perfect), crossings</text>
              {bars.map(([name, v, cr, col], i) => (
                <g key={name}>
                  <rect x={bx + i * 54} y={y0 - hgt(v)} width="40" height={hgt(v)} fill={col} fillOpacity="0.85" />
                  <text x={bx + i * 54} y={y0 - hgt(v) - 6} fill={col} fontSize="9">{v.toFixed(4)}</text>
                  <text x={bx + i * 54} y={y0 + 12} fill="#9aa5bd" fontSize="7">{name}</text>
                  <text x={bx + i * 54} y={y0 + 24} fill={cr ? '#e2606c' : '#62d98a'} fontSize="8">{cr} cross.</text>
                </g>
              ))}
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'fruchterman_reingold_force_directed_placement.py',
  Viz: ForceDirectedViz,
  narration,
};
