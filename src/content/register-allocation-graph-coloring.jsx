import RegAllocViz from '../viz/RegAllocViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/register_allocation_graph_coloring.py?raw';
import { narration } from './register-allocation-graph-coloring.narration.js';

export const content = {
  given:
    'A compiler has lowered a program to instructions over an unbounded supply of virtual registers; the machine has K. Two values that are live at the same time cannot share a register, and a value that does not fit must be spilled to memory: a store after each definition, a load before each use. Choose the assignment and the spills so the program still computes the same thing and touches memory as rarely as possible.',
  task: 'Register allocation by graph coloring. Build the interference graph: one node per value, an edge between any two live at the same time (Chaitin’s rule: at each definition, the new value interferes with everything live after it). A K-coloring is an allocation. The heuristic is simplify-select with a spill-cost choice: remove any node with fewer than K neighbors (it can be colored last); when stuck, remove the node with the smallest cost / degree, cost being defs + uses weighted 10× per loop level; pop the stack, color each node with a register its neighbors do not hold, spill the ones that find none (Briggs’s optimistic variant), rewrite, repeat.',
  constraint:
    'Measured on 30 random structured programs of 48 to 354 values with register pressure 12 to 25, each allocation checked two ways (no interference edge inside one register; the same trace of computed values on K physical registers). Dynamic loads + stores at K = 4 / 8 / 12 / 16: graph coloring 22,890 / 7,918 / 1,998 / 294; linear scan 28,051 / 18,453 / 15,485 / 10,946; a degree-only spill choice 28,488 / 15,248 / 5,911 / 994; every value in memory 41,250. Spilled values at K = 8: 1,026 / 813 / 478: the hero spills more values and moves less than half the data. χ equals the clique number on all 30 graphs and simplify-select matches it on 30 of 30, in 0.03 s. Linear scan holds a register on 33.6% of positions where the value is dead. One program of 6,787 values and 1,033,679 edges: graph build 1.67 s, coloring 2.81 s, linear scan 4 ms.',

  origins: (
    <p>
      Gregory Chaitin, with Auslander, Chandra, Cocke, Hopkins, and
      Markstein (<strong>1981</strong>, Computer Languages, &quot;Register
      allocation via coloring&quot;) and alone (1982, SIGPLAN Compiler
      Construction, &quot;Register allocation &amp; spilling via graph
      coloring&quot;) built the allocator for IBM&apos;s PL.8 compiler.
      The interference graph, the rule that a node with fewer than K
      neighbors can be set aside (Kempe&apos;s 1879 argument for the
      four-color problem), the spill choice by cost / degree, and the
      proof that any graph is some program&apos;s interference graph, so
      allocation is as hard as coloring, all come from that work. Briggs, Cooper, and Torczon (1994, TOPLAS) added
      optimistic coloring, rematerialization, and conservative coalescing;
      George and Appel (1996) iterated coalescing; Poletto and Sarkar
      (1999, TOPLAS) linear scan for JITs that cannot afford the graph.
      HotSpot&apos;s server compiler and GCC color the graph, LLVM splits
      live ranges under a priority allocator, and baseline JITs scan.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>graph and the guarantee</strong>: liveness to a
      fixed point, an edge for every pair that can never share a
      register, and the fact that any proper K-coloring is a correct
      allocation, which two oracles check on every run (no edge of the
      final graph inside one register; the same trace of computed values
      on K physical registers). All 30 programs, all four methods, all
      four K passed both. The graph also settles what the coloring
      costs: χ equals the clique number on all 30 graphs and
      simplify-select finds a χ-coloring on <strong>30 of 30</strong> in
      0.03 s. The coloring is not the hard part.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>spills</strong>, where the contest is decided.
      At K = 4 / 8 / 12 / 16 the allocated programs execute 22,890 /
      7,918 / 1,998 / 294 loads and stores; linear scan 28,051 / 18,453 /
      15,485 / 10,946; a degree-only spill choice 28,488 / 15,248 / 5,911
      / 994; everything in memory 41,250. At K = 8 the hero spills{' '}
      <strong>more values</strong> than either rival (1,026 against 813
      and 478) and moves less than half the data: it spills what is cheap
      to spill, touched rarely, outside the loops, in the way of many
      others. Cost / degree is the price of freeing a register, and the
      heuristic buys the cheapest freedom first.
    </p>
  ),

  picture: (
    <p>
      Seating guests at a dinner with K tables when some pairs cannot
      sit together. Kempe&apos;s trick: a guest with fewer than K enemies
      can always be seated last, whatever the others do, so set them
      aside and worry about the rest. When every remaining guest has K
      or more enemies, set aside the one whose absence hurts least (rarely
      visits, quarrels with many) and hope: when the guests come back in
      reverse order, most still find a table. The ones who do not are
      sent outside, which is a spill: they wait in the hall and are
      fetched in only for the course they must attend.
    </p>
  ),

  steps: [
    <>
      <strong>Liveness:</strong> iterate live-in = use ∪ (live-out − def)
      to a fixed point over the blocks.
    </>,
    <>
      <strong>Interference:</strong> walk each block backward with the
      live set; at every def, add an edge from the defined value to each
      value live after it.
    </>,
    <>
      <strong>Simplify:</strong> push a node with degree &lt; K; if none,
      push the node with the smallest cost / degree (cost = defs + uses,
      ×10 per loop level) as a candidate.
    </>,
    <>
      <strong>Select:</strong> pop; give each node a register its colored
      neighbors do not hold; a node with none is spilled.
    </>,
    <>
      <strong>Rewrite and repeat:</strong> a slot, a store after each
      def, a load into a fresh temporary before each use; rebuild and
      recolor until nothing spills (4 rounds max here); then check the
      final graph and run the program.
    </>,
  ],

  signals: [
    <>
      <strong>Pressure above K in places:</strong> some values must go
      to memory and the choice matters (pressure 12 to 25 here against K
      = 4 to 16).
    </>,
    <>
      <strong>Loops:</strong> the cost weight keeps loop-carried values
      in registers; degree-only spilling is 3× worse at K = 12.
    </>,
    <>
      <strong>Compile time to spend:</strong> the graph is quadratic
      (1,033,679 edges for 6,787 values, 4.5 s against 4 ms), so a JIT
      reaches for linear scan instead.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>every value in memory</strong>, the
      unoptimized compiler: a load before each use and a store after
      each def, 41,250 loads and stores against 294 at K = 16, 140×.
    </>
  ),

  strength: (
    <>
      <strong>The cheapest values go to memory.</strong> At K = 12,
      1,998 loads and stores against 15,485 for linear scan (7.7×) and
      5,911 for degree-only spilling (3×); optimal colorings on 30 of 30
      graphs; two oracles green on every allocation.
    </>
  ),
  weakness: (
    <>
      <strong>Quadratic, whole-value, and NP-hard in general.</strong>{' '}
      A million edges for under 7,000 values, rebuilt every spill round;
      a value is spilled whole, so one live across a loop it never touches
      pays at every use (live-range splitting repairs this); the cost
      model guesses 10× per loop level whatever the trip count; and the
      heuristic can fail to K-color a K-colorable graph (it never did
      here).
    </>
  ),

  problem: 'Compiler backend',
  problemSlug: 'compiler-backend',
  rivals: [
    {
      name: 'Register allocation × Graph coloring',
      isThisUnit: true,
      algoName: 'Register allocation',
      cost: 'a quadratic graph per spill round',
      wins: (
        <>
          <strong>1,998 loads and stores at K = 12</strong> against
          15,485; optimal colorings on 30 of 30.
        </>
      ),
      costs: (
        <>
          4.5 s on 6,787 values; whole-value spills.
        </>
      ),
      when: 'Optimizing compilers, where code runs far more often than it is compiled.',
    },
    {
      name: 'Register allocation × Linear scan',
      algoName: 'Register allocation',
      cost: 'sort the intervals, one pass',
      wins: (
        <>
          4 ms against 4.5 s on the large program; a page of code.
        </>
      ),
      costs: (
        <>
          One interval per value holds a register where the value is
          dead (33.6% of positions); 10,946 against 294 at K = 16.
        </>
      ),
      when: 'JITs and baseline compilers, where compile time is the product.',
    },
    {
      name: 'Greedy graph coloring × DSatur',
      algoName: 'Greedy graph coloring',
      cost: 'a saturation-ordered pass',
      wins: (
        <>
          Matched χ on 30 of 30 graphs here with no stack and no
          candidates.
        </>
      ),
      costs: (
        <>
          A coloring, not an allocation: says nothing about which value
          to evict when the colors run out.
        </>
      ),
      when: 'When the coloring alone is the job (timetabling, frequencies), or SSA-form graphs, which are chordal and greedy-colorable optimally.',
    },
    {
      name: 'Backtracking coloring × Brélaz selection',
      algoName: 'Backtracking coloring',
      cost: 'exponential in general',
      wins: (
        <>
          Proves the chromatic number (trivially here: the clique bound
          was met on every graph, 0.03 s).
        </>
      ),
      costs: (
        <>
          Exponential when the clique bound is loose; no spill model.
        </>
      ),
      when: 'Small graphs where a certificate is worth having: does this hot loop truly need K + 1 registers?',
    },
  ],
  neverUse: {
    name: 'Spilling by degree alone',
    why: (
      <>
        The graph-theory instinct is to evict the most constrained
        vertex, the one with the most neighbors, since its removal frees
        the most. Measured on the same 30 programs: 28,488 / 15,248 /
        5,911 / 994 loads and stores at K = 4 / 8 / 12 / 16 against
        22,890 / 7,918 / 1,998 / 294, <strong>3× worse at K = 12 and
        3.4× at K = 16</strong>. The value with the most neighbors is the
        one live across the whole loop, the one you most want to keep,
        and evicting it puts a load and a store in every iteration. Cost
        / degree asks what an eviction costs per register it frees;
        dropping the numerator triples the traffic.
      </>
    ),
  },

  contest: {
    instance:
      '30 random structured programs (if/else and counted loops nested two deep), 48 to 354 values, pressure 12 to 25; K = 4, 8, 12, 16; score: loads + stores executed; two validity oracles on every allocation',
    columns: ['K = 4', 'K = 8', 'K = 12', 'K = 16', 'note'],
    rows: [
      {
        method: 'graph coloring, cost / degree spill',
        isThisUnit: true,
        values: ['22,890', '7,918', '1,998', '294', '1,026 values spilled at K = 8'],
        best: 2,
        verdict: 'the cheapest values go to memory',
      },
      {
        method: 'linear scan (Poletto and Sarkar)',
        values: ['28,051', '18,453', '15,485', '10,946', '813 spilled at K = 8; 33.6% of positions dead'],
        verdict: 'fast, imprecise',
      },
      {
        method: 'graph coloring, degree-only spill',
        values: ['28,488', '15,248', '5,911', '994', '478 spilled at K = 8'],
        verdict: 'evicts the loop-carried values',
      },
      {
        method: 'every value in memory',
        values: ['41,250', '41,250', '41,250', '41,250', 'the unoptimized compiler'],
        verdict: 'the baseline',
      },
    ],
    source:
      'python solutions/register_allocation_graph_coloring.py prints this table and asserts: every allocation valid under both oracles; coloring executing fewer loads and stores than linear scan and than degree-only spilling at K = 4, 8, 12; everything in memory more than five times the hero at K = 16; the exact χ found on at least 25 graphs with simplify-select matching it on at least 80%.',
  },

  figure: (
    <Figure
      id="fig-regalloc-spill"
      aspect="16 / 7"
      caption="Left: six live ranges over sixteen positions with a loop (shaded, accesses ×10) and K = 3. At positions 5 and 6 four values are live, so one must go. Cost per degree: A, touched twice outside the loop and overlapping four others, 0.5; B 0.67; C 2.4; D, the loop-carried value, 5. A is the candidate and is spilled: two memory accesses, not twenty. Right: dynamic loads and stores on the 30 programs at K = 8, 12, 16 (log scale) for the four allocators."
      cite={{
        text: 'G. J. Chaitin, "Register allocation & spilling via graph coloring," SIGPLAN Symposium on Compiler Construction, 1982. DOI 10.1145/800230.806984. G. J. Chaitin, M. A. Auslander, A. K. Chandra, J. Cocke, M. E. Hopkins, and P. W. Markstein, "Register allocation via coloring," Computer Languages 6(1), 1981. P. Briggs, K. D. Cooper, and L. Torczon, "Improvements to graph coloring register allocation," ACM TOPLAS 16(3), 1994. DOI 10.1145/177492.177575. M. Poletto and V. Sarkar, "Linear scan register allocation," ACM TOPLAS 21(5), 1999. DOI 10.1145/330249.330250.',
        href: 'https://doi.org/10.1145/800230.806984',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="Six live ranges with a loop band, one spilled, beside bars of loads and stores for four allocators at three register counts">
        {(() => {
          const ranges = [
            ['A', 0, 10, 'spill', 'cost 2 / deg 4'],
            ['B', 2, 6, 'r0', 'cost 2 / deg 3'],
            ['C', 4, 12, 'r1', 'cost 12 / deg 5'],
            ['D', 5, 9, 'r2', 'cost 20 / deg 4'],
            ['E', 8, 14, 'r0', 'cost 3 / deg 3'],
            ['F', 11, 15, 'r2', 'cost 2 / deg 2'],
          ];
          const x0 = 30;
          const X = (p) => x0 + (p / 16) * 250;
          const groups = [['K = 8', [7918, 18453, 15248, 41250]], ['K = 12', [1998, 15485, 5911, 41250]], ['K = 16', [294, 10946, 994, 41250]]];
          const colors = ['#5da2ff', '#f0b94b', '#e2606c', '#9aa5bd'];
          const gx = 360;
          const gy = 232;
          const hgt = (v) => ((Math.log10(v) - 2) / 3) * 170;
          return (
            <g>
              <rect x={X(5)} y="34" width={X(11) - X(5)} height="150" fill="#f0b94b" fillOpacity="0.12" />
              <text x={X(5) + 4} y="46" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="9">loop, accesses ×10</text>
              {ranges.map(([name, a, b, reg, note], i) => (
                <g key={name}>
                  <rect x={X(a)} y={56 + i * 21} width={X(b + 1) - X(a)} height="12" fill={reg === 'spill' ? '#e2606c' : '#62d98a'} fillOpacity={reg === 'spill' ? 0.9 : 0.75} />
                  <text x="8" y={66 + i * 21} fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="10">{name}</text>
                  <text x={X(b + 1) + 4} y={66 + i * 21} fill={reg === 'spill' ? '#e2606c' : '#9aa5bd'} fontFamily="ui-monospace, monospace" fontSize="9">{`${reg}, ${note}`}</text>
                </g>
              ))}
              <text x="8" y="22" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">K = 3; pressure 4 at positions 5 and 6; spill the smallest cost / degree</text>
              <text x="8" y="216" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">A: 2 accesses, in the way of 4: 0.5; D: 20 in the loop: 5.0</text>
              <line x1={gx} y1={gy} x2={gx + 260} y2={gy} stroke="#9aa5bd" strokeOpacity="0.5" />
              {groups.map(([label, vals], g) => (
                <g key={label}>
                  {vals.map((v, i) => (
                    <rect key={i} x={gx + 8 + g * 88 + i * 18} y={gy - hgt(v)} width="14" height={hgt(v)} fill={colors[i]} fillOpacity="0.85" />
                  ))}
                  <text x={gx + 12 + g * 88} y={gy + 14} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">{label}</text>
                  <text x={gx + 8 + g * 88} y={gy - hgt(vals[0]) - 4} fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="9">{vals[0].toLocaleString()}</text>
                </g>
              ))}
              <text x={gx} y="22" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">loads + stores, 30 programs, log scale</text>
              <text x={gx} y="38" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">blue coloring, amber linear scan,</text>
              <text x={gx} y="52" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">red degree-only, gray all in memory</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'register_allocation_graph_coloring.py',
  Viz: RegAllocViz,
  narration,
};
