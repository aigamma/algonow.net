import DsaturViz from '../viz/DsaturViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/greedy_graph_coloring_dsatur_saturation_ordering.py?raw';
import { narration } from './greedy-graph-coloring-dsatur-saturation-ordering.narration.js';

export const content = {
  given:
    'A graph. Give every vertex a color so that no edge joins two vertices of the same color, using as few colors as possible: exam slots with no student in two exams at once, registers with no two live values sharing one, frequencies with no two neighboring transmitters alike.',
  task: 'Greedy graph coloring. Take the vertices in some order and give each the smallest color not already used by a colored neighbor: one pass, no backtracking, and never more than Δ + 1 colors (Δ the largest degree). Everything depends on the order. The heuristic is DSatur (Brélaz 1979): color next the uncolored vertex whose colored neighbors already use the most distinct colors, its saturation degree, with ties broken by the number of uncolored neighbors. The most constrained vertex goes first, while its choice is still cheap; and a theorem rides along: DSatur is exact on every bipartite graph.',
  constraint:
    'Measured against an exact branch-and-bound chromatic number on 200 random graphs of 24 vertices (edge probability 0.2 to 0.6): DSatur optimal on 129 of 200 with an average excess of 0.355 colors, recursive largest first 98 (0.545), smallest-last 58 (0.845), largest-first 56 (0.825), a random order 18 (1.430). DSatur used exactly 2 colors on all 200 random connected bipartite graphs (largest-first up to 5). On Mycielski’s triangle-free graphs with chromatic numbers 3, 4, 5, every method hit the optimum. At n = 600: G(600, 0.1) DSatur 18 colors in 216,282 neighbor scans, RLF 19 in 2,601,807, largest-first 20 in 35,982, smallest-last 21, random 22, clique bound 4, Δ + 1 = 89; G(600, 0.5) DSatur 75, RLF 76 (36× the scans), largest-first 80, smallest-last 81, random 85, clique bound 10, Δ + 1 = 335. On the crown graph K₅₀,₅₀ minus a perfect matching, bipartite with every degree 49: largest-first 50 colors, RLF 50, DSatur 2.',

  origins: (
    <p>
      Daniel Brélaz published DSatur in <strong>1979</strong> (&quot;New
      methods to color the vertices of a graph,&quot; Communications of the
      ACM), both as the greedy order and as the branching rule of an exact
      backtracking solver, the referee this page uses. Welsh and Powell
      (1967) had given the largest-first order and the bound of
      Δ + 1; Matula and Beck (1983) proved smallest-last uses at most
      degeneracy + 1, which makes it exact on trees and good on planar
      graphs; Leighton (1979) built recursive largest first for exam
      timetabling, one color class at a time. Greedy coloring with a
      saturation order runs inside register allocators (Chaitin 1981
      colors the interference graph; puzzle 162 on this site), exam and
      shift schedulers, frequency assignment, and the symmetry-breaking
      and clique bounds of exact solvers. Johnson (1974) showed every
      greedy order has a graph that fools it; the crown graph on this
      page is the classic one.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>assignment</strong>: one pass over the vertices,
      each receiving the smallest color absent from its colored neighbors,
      so the cost is a scan of every edge once and the result is a proper
      coloring whatever the order, with at most Δ + 1 colors. The referee
      is Brélaz&apos;s exact branch-and-bound solver on 200 random graphs of
      24 vertices (8,207 search nodes in total) plus two theorems checked on
      every graph: every coloring is proper edge by edge, and never above
      Δ + 1. In the greedy family the order is the only free choice, and a
      random order is optimal on <strong>18 of 200</strong> graphs.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>order</strong>: most saturated first, most uncolored
      neighbors on ties. Optimal on <strong>129 of 200</strong> small
      graphs against 56 for largest-first and 98 for recursive largest
      first; exactly 2 colors on 200 of 200 bipartite graphs where
      largest-first needed up to 5; 18 and 75 colors at n = 600 against 20
      and 80 for largest-first, one fewer than RLF at a thirteenth to a
      thirty-sixth of its neighbor scans. The price is the order itself:
      216,282 scans against 35,982 for largest-first at p = 0.1, because
      the next vertex is chosen after every assignment.
    </p>
  ),

  picture: (
    <p>
      Seating a wedding where feuding guests cannot share a table. The
      naive planner seats the guests in the order they arrive. The DSatur
      planner looks at who is not yet seated and picks the person whose
      enemies already occupy the most different tables, because that guest
      has the fewest tables left and will only get harder to place; among
      equals, the one with the most unseated enemies. Each gets the
      lowest-numbered table with none of their enemies at it. Nobody is
      ever moved. The order alone is why the room ends up with fewer tables.
    </p>
  ),

  steps: [
    <>
      <strong>Saturation:</strong> for every uncolored vertex keep the set
      of colors on its colored neighbors; its saturation is the size of
      that set.
    </>,
    <>
      <strong>Select:</strong> the uncolored vertex with the largest
      saturation; break ties by the most uncolored neighbors (a heap or a
      scan).
    </>,
    <>
      <strong>Color:</strong> give it the smallest color not in its
      saturation set.
    </>,
    <>
      <strong>Update:</strong> add that color to the saturation set of each
      uncolored neighbor and decrement their uncolored degree.
    </>,
    <>
      <strong>Repeat</strong> until every vertex is colored: a proper
      coloring with at most Δ + 1 colors, and exactly 2 on a bipartite
      graph with at least one edge (1 for a nonempty edgeless graph).
    </>,
  ],

  signals: [
    <>
      <strong>A conflict graph and a count to minimize:</strong> exam
      slots, registers, channels, shifts, wavelengths.
    </>,
    <>
      <strong>Fast beats exact:</strong> the chromatic number is NP-hard;
      a saturation order gets within a color of it on most small graphs in
      one pass.
    </>,
    <>
      <strong>Structure you can exploit:</strong> a graph you suspect is
      bipartite, where the saturation order is exact and largest-first
      need not be. Nearly bipartite graphs have no such guarantee.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>largest-first</strong> (Welsh and
      Powell): sort once by degree, then greedy. 20 and 80 colors at
      n = 600 against 18 and 75; optimal on 56 of 200 small graphs against
      129; and 50 colors on the crown graph.
    </>
  ),

  strength: (
    <>
      <strong>One greedy pass, with the order that is hardest to
      fool.</strong> Optimal on 129 of 200 small graphs; exact on every
      bipartite graph; the fewest colors of five methods at n = 600 at a
      thirteenth of RLF&apos;s cost; the crown graph colored with 2 where
      largest-first and RLF use 50.
    </>
  ),
  weakness: (
    <>
      <strong>A dynamic order costs more than a static one, and it is
      still greedy.</strong> 216,282 scans against 35,982 for largest-first
      (quadratic without a heap); wrong on 71 of 200 small graphs by a
      color; 75 colors at p = 0.5 where the clique bound says only 10 and
      the truth is unknown; never a certificate of optimality.
    </>
  ),

  problem: 'Vertex coloring',
  problemSlug: 'vertex-coloring',
  rivals: [
    {
      name: 'Greedy graph coloring × DSatur saturation ordering',
      isThisUnit: true,
      algoName: 'Greedy graph coloring',
      cost: 'one pass; a saturation set per vertex',
      wins: (
        <>
          <strong>Optimal on 129 of 200</strong> small graphs; exact on
          bipartite graphs; 18 and 75 colors at n = 600, the fewest here.
        </>
      ),
      costs: (
        <>
          Six times largest-first&apos;s scans at p = 0.1; no certificate.
        </>
      ),
      when: 'The default greedy order when colors matter more than a few hundred thousand scans.',
    },
    {
      name: 'Recursive largest first',
      algoName: 'Recursive largest first',
      cost: 'one color class at a time; many rescans',
      wins: (
        <>
          Optimal on 98 of 200; builds large independent sets, often the
          fewest colors on dense graphs in the literature.
        </>
      ),
      costs: (
        <>
          2.6 million and 12.8 million scans at n = 600 (12 to 36× DSatur);
          19 and 76 colors here; 50 on the crown graph.
        </>
      ),
      when: 'Dense graphs where every color saved is worth a quadratic rescan.',
    },
    {
      name: 'Backtracking coloring',
      algoName: 'Backtracking coloring',
      cost: 'exponential worst case; DSatur as the branching rule',
      wins: (
        <>
          The exact chromatic number with a certificate: 8,207 search
          nodes for 200 graphs of 24 vertices here.
        </>
      ),
      costs: (
        <>
          Hard instances can become impractical at a few dozen to a few
          hundred vertices; structured graphs can be much easier.
        </>
      ),
      when: 'The graph is small or structured and the answer must be provably optimal.',
    },
    {
      name: 'Smallest-last ordering (greedy)',
      algoName: 'Greedy graph coloring',
      cost: 'a peeling pass, then one greedy pass',
      wins: (
        <>
          At most degeneracy + 1 colors: exact on trees, 6 on any planar
          graph; 2 on the crown graph.
        </>
      ),
      costs: (
        <>
          Optimal on 58 of 200; 21 and 81 colors at n = 600.
        </>
      ),
      when: 'Sparse or planar graphs, where degeneracy is small and the bound is the point.',
    },
  ],
  neverUse: {
    name: 'A static order on a graph built to fool it',
    why: (
      <>
        The crown graph: two sides of 50 vertices, every vertex joined to
        all 49 on the other side except its partner. It is bipartite, so 2
        colors suffice, and every degree is 49, so largest-first falls back
        to index order, which interleaves the sides. Measured:{' '}
        <strong>largest-first uses 50 colors, RLF uses 50, DSatur uses
        2</strong> (smallest-last also 2). Johnson proved in 1974 that every
        fixed greedy order has such a graph; the saturation order escapes
        this one because after the first vertex is colored, its 49
        neighbors across the gap all have saturation 1 and go next, and the
        two sides fill in two colors. A static order cannot look at what it
        has already done; a saturation order does nothing else.
      </>
    ),
  },

  contest: {
    instance:
      '200 random graphs on 24 vertices (edge probability 0.2 to 0.6) scored against an exact branch-and-bound chromatic number; G(600, 0.1) and G(600, 0.5) scored in colors with the greedy clique lower bound; the crown graph K50,50 minus a perfect matching; one cost currency: neighbor scans',
    columns: ['optimal (of 200)', 'avg excess', 'G(600, 0.1) colors', 'G(600, 0.5) colors', 'crown graph', 'scans at p = 0.5'],
    rows: [
      {
        method: 'DSatur order',
        isThisUnit: true,
        values: ['129', '0.355', '18', '75', '2', '359,644'],
        best: 0,
        verdict: 'the fewest colors here, at a modest cost',
      },
      {
        method: 'recursive largest first',
        values: ['98', '0.545', '19', '76', '50', '12,832,354'],
        verdict: 'close in colors, 36x the scans',
      },
      {
        method: 'smallest-last order',
        values: ['58', '0.845', '21', '81', '2', '358,688'],
        verdict: 'degeneracy + 1, proven',
      },
      {
        method: 'largest-first order',
        values: ['56', '0.825', '20', '80', '50', '179,344'],
        verdict: 'the baseline',
      },
      {
        method: 'random order',
        values: ['18', '1.430', '22', '85', '·', '179,344'],
        verdict: 'the order matters',
      },
      {
        method: 'exact chromatic number',
        values: ['200', '0', '≥ 4 (clique)', '≥ 10 (clique)', '2', '8,207 nodes / 200 graphs'],
        verdict: 'the referee',
      },
    ],
    source:
      'python solutions/greedy_graph_coloring_dsatur_saturation_ordering.py prints this table and asserts: every coloring proper edge by edge; every greedy result at least the exact chromatic number and at most Delta + 1; smallest-last at most degeneracy + 1; DSatur optimal on more of the 200 graphs than largest-first and the random order; DSatur exactly 2 colors on 200 of 200 random connected bipartite graphs; the exact solver recovering chromatic numbers 3, 4, 5 on Mycielski graphs; at n = 600 DSatur at most the random order’s colors, at least the clique bound, and cheaper than RLF in scans; and the crown graph at 50 colors for largest-first against 2 for DSatur.',
  },

  figure: (
    <Figure
      id="fig-dsatur-crown"
      aspect="16 / 7"
      caption="Left: the crown graph on six plus six vertices (every vertex joined to all but its partner across the gap) colored by largest-first, which in index order alternates sides and ends with six colors, and by DSatur, which colors one vertex, then all of its neighbors across the gap at saturation 1, and finishes with two. Right: how often each order hit the exact chromatic number on 200 random graphs of 24 vertices."
      cite={{
        text: 'D. Brélaz, "New methods to color the vertices of a graph," Communications of the ACM 22(4), 1979, pp. 251-256, DOI 10.1145/359094.359101. D. J. A. Welsh and M. B. Powell, Computer Journal 10(1), 1967. D. W. Matula and L. L. Beck, JACM 30(3), 1983. D. S. Johnson, "Worst case behavior of graph coloring algorithms," 1974.',
        href: 'https://doi.org/10.1145/359094.359101',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="Two colorings of a six by six crown graph, one with six colors and one with two, beside bars of how often five greedy orders hit the exact chromatic number">
        {(() => {
          const palette = ['#5da2ff', '#f0b94b', '#62d98a', '#e2606c', '#c08cff', '#9aa5bd'];
          const k = 6;
          const left = (ox, colors, title) => {
            const nodes = [];
            const edges = [];
            for (let i = 0; i < k; i += 1) {
              for (let j = 0; j < k; j += 1) {
                if (i !== j) edges.push(<line key={`${ox}-${i}-${j}`} x1={ox} y1={56 + i * 28} x2={ox + 90} y2={56 + j * 28} stroke="#9aa5bd" strokeOpacity="0.25" />);
              }
            }
            for (let i = 0; i < k; i += 1) {
              nodes.push(<circle key={`${ox}-u${i}`} cx={ox} cy={56 + i * 28} r="8" fill={palette[colors[2 * i]]} />);
              nodes.push(<circle key={`${ox}-v${i}`} cx={ox + 90} cy={56 + i * 28} r="8" fill={palette[colors[2 * i + 1]]} />);
            }
            return (
              <g>
                <text x={ox - 10} y="30" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">{title}</text>
                {edges}
                {nodes}
              </g>
            );
          };
          const lfColors = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5];
          const dsColors = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1];
          const bars = [['DSatur', 129, '#5da2ff'], ['RLF', 98, '#9aa5bd'], ['SL', 58, '#f0b94b'], ['LF', 56, '#f0b94b'], ['random', 18, '#e2606c']];
          const bx = 400;
          const by = 236;
          return (
            <g>
              {left(40, lfColors, 'largest-first: 6 colors')}
              {left(190, dsColors, 'DSatur: 2 colors')}
              <text x="30" y="250" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">index order alternates sides: u0 v0 u1 v1, each pair a new color</text>
              <text x="30" y="264" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">at n = 100 the file measures 50 against 2</text>
              <text x={bx} y="30" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">optimal colorings of 200 (exact referee)</text>
              {bars.map(([name, v, c], i) => (
                <g key={name}>
                  <rect x={bx + i * 46} y={by - (v / 200) * 170} width="32" height={(v / 200) * 170} fill={c} fillOpacity="0.85" />
                  <text x={bx + i * 46} y={by - (v / 200) * 170 - 4} fill={c} fontFamily="ui-monospace, monospace" fontSize="9">{v}</text>
                  <text x={bx + i * 46 - 2} y={by + 12} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="8">{name}</text>
                </g>
              ))}
              <text x={bx} y="262" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">excess: 0.36, 0.55, 0.85, 0.83, 1.43</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'greedy_graph_coloring_dsatur_saturation_ordering.py',
  Viz: DsaturViz,
  narration,
};
