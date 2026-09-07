import RrtViz from '../viz/RrtViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/rrt_voronoi_bias.py?raw';
import { narration } from './rrt-voronoi-bias.narration.js';

export const content = {
  given:
    'A robot in continuous space with obstacles: an open field, a concave bug trap, a two-unit gap: and a path to find from start to goal. Grids only approximate this world; greedy walking dies at the first concavity (step 14, measured).',
  task: 'Grow a tree with three lines: sample a random point, find the NEAREST tree node, extend it one step toward the sample. The geometry does the steering: each node is chosen with probability proportional to its Voronoi region, so the frontier rushes into unexplored space.',
  constraint:
    'Every edge is exact-checked (Liang-Barsky segment geometry) and independently cross-checked by dense sampling: two drafts lost the resolution war before exact geometry ended it, and the lesson ships in the file. A* on a unit grid certifies every world solvable and referees length: RRT succeeded 12/12, 12/12, 10/12 with paths at 1.36× grid-optimal: and the ablation isolates the heuristic: remove the Voronoi bias and success collapses from 12/12 to 0/12.',

  origins: (
    <p>
      Steven LaValle, <strong>1998</strong>, in a technical
      report that reshaped robotics: &quot;Rapidly-exploring
      random trees: a new tool for path planning,&quot; extended
      with James Kuffner into the kinodynamic planning framework
      (IJRR 2001). The named insight is the one this page
      ablates: the innocent loop: uniform sample, nearest node,
      fixed step: makes each node extend with probability
      proportional to its <em>Voronoi region</em>, so nodes
      facing the largest unexplored voids grow most and the tree
      sprints rather than diffuses. Nobody codes the bias; the
      geometry supplies it. Descendants run real robots:
      RRT-Connect grows trees from both ends (manipulation
      planning&apos;s workhorse), RRT* (Karaman-Frazzoli 2011)
      adds rewiring for asymptotic optimality, and DARPA-era
      autonomous cars carried closed-loop RRT variants through
      city traffic.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>tree and its certificates</strong>: nodes
      in continuous space, each joined to its parent by an edge
      that is <em>proven</em> collision-free: exact
      segment-versus-rectangle geometry at build time, with an
      independent dense-sampling cross-check agreeing on every
      edge of every run (two earlier drafts sampled at 1.0 and
      0.25 units and were each caught grazing corners by a finer
      referee: only exact geometry ends a resolution war). When
      a node lands within the goal radius, walking parents back
      yields the path: re-verified, then measured against the
      A* grid referee at 1.36× optimal on average.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>emergent steering</strong>: sample
      uniformly, extend the nearest node. Because a
      node&apos;s chance of being nearest to a random point{' '}
      <em>is</em> the area of its Voronoi cell, frontier nodes
      bordering large empty regions get chosen constantly and
      interior nodes almost never: exploration pressure from
      pure geometry. The ablation isolates it: the same loop
      extending a <em>random</em> node in a <em>random</em>{' '}
      direction (diffusion) went <strong>0 for 12</strong> on
      the bug trap with 19% coverage, where the Voronoi-biased
      tree went 12 for 12 with 81%. Same code, one line
      different, the entire capability gone.
    </p>
  ),

  picture: (
    <p>
      Ink spreading through a maze-shaped sponge, two ways. Drop
      ink that diffuses: every droplet wanders from wherever
      droplets already are, so the blot thickens around its own
      center and barely reaches the maze&apos;s far rooms:
      that is the ablated tree, 19% of the sponge in the budget.
      Now the RRT trick: throw darts at a map of the{' '}
      <em>whole sponge</em>, and each time, grow the blot from
      its point nearest the dart. Darts mostly land in the vast
      un-inked territories, so the blot&apos;s frontier: not its
      thick center: does almost all the growing, streaming down
      corridors and around corners toward wherever is emptiest.
      Same ink, same sponge: 81% covered, every room found. The
      dart-thrower never sees the maze&apos;s walls or plans a
      route; being pulled toward emptiness is, by itself, a
      search strategy.
    </p>
  ),

  steps: [
    <>
      <strong>Sample:</strong> a uniform random point (with a 5%
      goal bias): the dart at the map.
    </>,
    <>
      <strong>Nearest:</strong> the tree node closest to the
      sample: chosen, implicitly, in proportion to its Voronoi
      area: the frontier wins.
    </>,
    <>
      <strong>Extend:</strong> one fixed step toward the sample,
      the new edge proven free by exact segment geometry.
    </>,
    <>
      <strong>Repeat until the goal radius:</strong> 283 / 611 /
      701 average iterations on the three worlds, 12/12, 12/12,
      10/12.
    </>,
    <>
      <strong>Walk back and re-verify:</strong> the parent chain
      is the path: re-checked edge by edge, then measured at
      1.36× the A* referee&apos;s optimum.
    </>,
  ],

  signals: [
    <>
      <strong>Continuous, high-dimensional configuration
      spaces:</strong> robot arms, steering-constrained cars,
      molecules: where grids explode exponentially and sampling
      is the only way in.
    </>,
    <>
      <strong>Concave clutter:</strong> bug traps and cul-de-sacs
      kill greedy local reasoning (dead at step 14 here); global
      random exploration walks out of them 12/12.
    </>,
    <>
      <strong>Feasible-first deadlines:</strong> when any valid
      path now beats the best path later: the anytime shape
      planners need on real robots.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>A* on a grid</strong>: on
      these 2D worlds it is complete, optimal, and this
      page&apos;s referee (certifying all three worlds solvable
      at lengths 112/109/82). The trade is dimensionality: a
      unit grid in 2D is 10,000 cells; the same resolution for a
      6-joint arm is 10²⁴. RRT&apos;s sampling never builds the
      grid: which is the entire reason it exists: and pays with
      probabilistic completeness and 1.36× paths.
    </>
  ),

  strength: (
    <>
      <strong>Exploration you never had to program, with
      certificates.</strong> Three lines of loop solved all
      three worlds (12/12, 12/12, 10/12) inside a 3,000-iteration
      budget, escaping the concavity that kills greedy at step
      14: with every edge exact-verified, every path re-checked,
      and every world independently certified solvable by A*.
      The ablation proves where the power lives: bias removed,
      success 0/12, coverage 19%: the Voronoi pull is the
      algorithm.
    </>
  ),
  weakness: (
    <>
      <strong>Feasible, not optimal: probabilistic, not
      certain: and thin gaps starve it.</strong> Paths land at
      1.36× the grid optimum on average (1.44× in the trap):
      raw RRT never improves a path it has found: that is
      RRT*&apos;s rewiring. Completeness is probabilistic: the
      two-unit gap dropped success to 10/12 in budget, because
      uniform sampling rarely lands in thin corridors (the
      known weakness that bridge-test and informed sampling
      variants exist to close). And the nearest-neighbor
      search dominates runtime as the tree grows: real
      planners pair the loop with k-d trees: this
      site&apos;s own unit 105.
    </>
  ),

  problem: 'Motion planning',
  problemSlug: 'motion-planning',
  rivals: [
    {
      name: 'RRT × Voronoi bias',
      isThisUnit: true,
      algoName: 'Rapidly-exploring random tree',
      cost: 'probabilistically complete',
      wins: (
        <>
          <strong>Emergent exploration</strong>: 12/12 through
          the trap greedy dies in, 81% coverage vs
          diffusion&apos;s 19%, no grid ever built.
        </>
      ),
      costs: (
        <>
          1.36× paths, budget-bounded success (10/12 at the thin
          gap), and nearest-neighbor as the runtime tax.
        </>
      ),
      when: 'High-dimensional continuous planning where feasible-now beats optimal-later.',
    },
    {
      name: 'RRT*',
      cost: 'asymptotically optimal',
      wins: (
        <>
          Karaman-Frazzoli&apos;s rewiring: every new node
          reconsiders its neighborhood&apos;s wiring, and path
          cost converges to the optimum as samples accumulate.
        </>
      ),
      costs: (
        <>
          Rewiring multiplies nearest-neighbor work per
          iteration; the anytime-optimal promise is paid in
          compute.
        </>
      ),
      when: 'When path quality matters and the robot can keep planning while acting.',
    },
    {
      name: 'RRT-Connect',
      cost: 'bidirectional greed',
      wins: (
        <>
          Two trees, one from each end, greedily extended toward
          each other: the manipulation-planning workhorse that
          often finds paths in a fraction of one-tree&apos;s
          iterations.
        </>
      ),
      costs: (
        <>
          The greedy connect step inherits trap-sensitivity, and
          bidirectionality assumes the goal state is known
          exactly.
        </>
      ),
      when: 'Arm and manipulation planning with concrete start and goal configurations.',
    },
    {
      name: 'A* search',
      cost: 'complete + optimal on grids',
      wins: (
        <>
          The live unit and this page&apos;s referee: on a
          discretization it is complete, optimal, and
          deterministic: everything sampling gives up.
        </>
      ),
      costs: (
        <>
          The grid is the bill: 10⁴ cells in 2D becomes 10²⁴ for
          a six-joint arm: resolution times dimension is an
          exponential invoice.
        </>
      ),
      when: 'Low-dimensional spaces where a grid fits: maps, games, this page’s refereeing.',
    },
  ],
  neverUse: {
    name: 'Greedy straight-at-the-goal walking',
    why: (
      <>
        The instinct every navigation system starts with: step
        toward the goal; when blocked, you must be close, push
        on. This page walked it into the bug trap and it{' '}
        <strong>died at step 14</strong>: inside the concavity,
        every straight-line step is blocked, and no amount of
        local reasoning: wall-sliding, jitter, potential fields:
        reliably escapes a pocket whose exit points{' '}
        <em>away</em> from the goal. This is the local-minimum
        disease of all descent-flavored navigation, and it is
        why the field went global-and-random: the RRT that
        cannot see the goal at all except through a 5% bias
        walked out of the same trap 12 times in 12, because
        being pulled toward <em>emptiness</em> is immune to
        pockets. If your planner&apos;s failure story is
        &quot;it gets stuck near concave obstacles,&quot; no
        tuning fixes the story: the architecture does.
      </>
    ),
  },

  contest: {
    instance:
      'motion planning in three worlds, 12 seeded runs each, 3,000-iteration budget; referees: exact segment geometry + dense-sampling cross-check on every edge, and A* on a unit grid for existence and length',
    columns: ['success', 'avg iters', 'len vs A*'],
    rows: [
      {
        method: 'Open field',
        values: ['12/12', '283', '1.29×'],
        verdict: 'the sprint: Voronoi bias rushes the frontier into the void',
      },
      {
        method: 'Bug trap',
        isThisUnit: true,
        values: ['12/12', '611', '1.44×'],
        best: 0,
        verdict: 'escapes the concavity that kills greedy at step 14',
      },
      {
        method: 'Narrow gap (2 units)',
        values: ['10/12', '701', '1.28×'],
        verdict: 'the honest row: thin corridors starve uniform sampling: bridge/informed variants exist for this',
      },
    ],
    source:
      'python solutions/rrt_voronoi_bias.py prints this table and asserts: every tree edge exact-checked (Liang-Barsky, with the checker’s own corner-graze unit tests) and independently confirmed by dense sampling at 0.1 units (two drafts lost the resolution war at 1.0 and 0.25 before exact geometry ended it: the lore ships in the file); A* certifying all three worlds solvable with RRT paths inside [1.0, 2.2]× of grid-optimal; the ablation collapse (Voronoi 12/12 with 81% coverage vs random-walk growth 0/12 with 19%); greedy dead in the trap at step 14; and the narrow row’s measured cost (10/12, iterations > 1.5× the open field’s).',
  },

  figure: (
    <Figure
      id="fig-rrt-voronoi"
      aspect="16 / 7"
      caption="Nobody codes the bias; the geometry supplies it. A uniform sample lands in some node's Voronoi cell, and that nearest node extends one step toward it: so frontier nodes with huge empty cells grow constantly and the tree rushes into unexplored space. Ablated (random node, random direction), the same loop diffuses: 0/12 through the bug trap at 19% coverage against the biased tree's 12/12 at 81%. Every edge is exact-checked and cross-checked; A* certifies the worlds and prices the paths (1.36× optimal on average); and the thin-gap row is conceded at 10/12: uniform sampling starves in corridors."
      cite={{
        text: 'S. M. LaValle, J. J. Kuffner, "Randomized kinodynamic planning," IJRR 20(5), 2001 (RRT: LaValle TR 98-11). DOI 10.1177/02783640122067453. RRT-Connect: Kuffner-LaValle 2000; RRT*: Karaman-Frazzoli 2011.',
        href: 'https://doi.org/10.1177/02783640122067453',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="An RRT growing through a bug trap with Voronoi frontier regions highlighted, versus a diffusing random-walk blob">
        <rect x="30" y="34" width="280" height="220" fill="none" stroke="rgba(154,165,189,0.4)" strokeWidth="1.2" />
        <rect x="128" y="90" width="120" height="12" fill="rgba(226,96,108,0.35)" />
        <rect x="128" y="188" width="120" height="12" fill="rgba(226,96,108,0.35)" />
        <rect x="236" y="90" width="12" height="110" fill="rgba(226,96,108,0.35)" />
        {[[60, 144], [88, 130], [88, 160], [116, 118], [116, 172], [150, 108], [150, 182], [190, 76], [230, 66], [270, 80], [292, 120], [286, 160], [268, 196], [200, 220], [160, 146]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2.6" fill="#5da2ff" />
        ))}
        {[[60, 144, 88, 130], [60, 144, 88, 160], [88, 130, 116, 118], [88, 160, 116, 172], [116, 118, 150, 108], [116, 172, 150, 182], [150, 108, 190, 76], [190, 76, 230, 66], [230, 66, 270, 80], [270, 80, 292, 120], [292, 120, 286, 160], [286, 160, 268, 196], [268, 196, 200, 220], [116, 172, 160, 146]].map(([a, b, c, d], i) => (
          <line key={i} x1={a} y1={b} x2={c} y2={d} stroke="rgba(93,162,255,0.6)" strokeWidth="1.3" />
        ))}
        <circle cx="60" cy="144" r="5" fill="#62d98a" />
        <circle cx="200" cy="146" r="5" fill="none" stroke="#62d98a" strokeWidth="1.6" />
        <text x="34" y="272" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">the tree wraps the trap: frontier nodes own huge Voronoi cells and grow most</text>
        <text x="340" y="50" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">measured (12 seeded runs each):</text>
        <text x="340" y="72" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">open 12/12 · trap 12/12 · thin gap 10/12</text>
        <text x="340" y="88" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">paths 1.36× A*-optimal on average</text>
        <text x="340" y="116" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="10">ablation (bias removed): 0/12, 19% coverage</text>
        <text x="340" y="132" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="10">greedy: dead in the trap at step 14</text>
        <text x="340" y="160" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="10">edges: exact Liang-Barsky + sampling cross-check</text>
        <text x="340" y="176" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="10">(two drafts lost the resolution war first)</text>
        <text x="340" y="204" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">A* referee: all worlds solvable, lengths 112/109/82</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'rrt_voronoi_bias.py',
  Viz: RrtViz,
  narration,
};
