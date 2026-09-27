import IdaViz from '../viz/IdaViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/ida_star_manhattan_distance.py?raw';
import { narration } from './ida-star-manhattan-distance.narration.js';

export const content = {
  given:
    'Sliding-tile puzzles, the 8-puzzle on a 3 × 3 board and the 15-puzzle on 4 × 4, to be solved in the fewest moves. A* finds optimal solutions but stores every state it has seen, and the 15-puzzle has 10,461,394,944,000 reachable states: on the instances here, A* holds up to 19,921 states in memory to find a 28-move answer, and on harder ones it runs out before it finishes.',
  task: 'IDA*, iterative deepening A*. A depth-first search bounded by f = g + h, where g is the moves made and h an admissible estimate of the moves left; when the bounded search fails, the bound becomes the smallest f that exceeded it and the search restarts from the root. Memory is one path; the answer is still optimal. The heuristic is the Manhattan distance: for each tile, the row distance plus the column distance to its home, summed, never more than the truth because every move slides one tile one square.',
  constraint:
    'Measured against breadth-first search over all 181,440 reachable 8-puzzle states, which gives the exact distance of every state: IDA* with Manhattan returns exactly that distance on 100 of 100 random states (mean 21.7 moves, max 29), and none of the three heuristics tried exceeds the true distance on any of the 181,440 states. Nodes generated per instance: plain iterative deepening 398,551 on the 36 instances of at most 20 moves (Manhattan: 689 on the same), misplaced tiles 130,771, Manhattan 3,043, Manhattan with linear conflict 1,495; A* with Manhattan 2,310 nodes but 2,311 states stored at peak, where IDA* stores at most 30. On a 29-move instance the bounds run 17, 19, …, 29 with 5, 18, 84, 335, 1,843, 8,225, 402 nodes: the last complete iteration is 75% of the work and the final one, which stops at the goal, 4%. Four 15-puzzle instances (26 to 28 moves): IDA* matches A*’s optimal length every time at 1,976 to 15,165 nodes with 27 to 29 states in memory, against A*’s 1,923 to 19,921 stored.',

  origins: (
    <p>
      Richard Korf published IDA* in <strong>1985</strong> (Artificial
      Intelligence 27, &quot;Depth-first iterative-deepening: an optimal
      admissible tree search&quot;), proving it finds optimal solutions
      with the same admissibility condition as A* and the memory of a
      depth-first search, and demonstrating it by solving 100 random
      15-puzzle instances that A* could not fit in the memory of the
      day. A* itself is Hart, Nilsson, and Raphael (1968); the
      Manhattan-distance heuristic for sliding tiles is as old as the
      first search programs on the 8-puzzle. Hansson, Mayer, and Yung
      (1992) added linear conflict; Culberson and Schaeffer (1998)
      replaced hand-made heuristics with pattern databases, lookup
      tables of exact distances for subsets of tiles, and Korf (1997)
      solved random Rubik&apos;s cube positions optimally with IDA* and
      pattern databases, which remains the method for optimal
      solutions of combinatorial puzzles. The same bounded-restart idea
      runs planners, theorem provers, and any search that must be
      optimal in less memory than its frontier.
    </p>
  ),

  algoRole: (
    <p>
      Owns <strong>optimality in linear memory</strong>. A depth-first
      search bounded by f never stores more than its current path, and
      because the bound rises to the smallest f that was cut off, the
      first goal reached has the smallest f of any goal, which with an
      admissible h is the optimal length. The referee is exhaustive:
      breadth-first search from the goal over all 181,440 reachable
      8-puzzle states, and IDA* returns the exact distance on{' '}
      <strong>100 of 100</strong> random states under every heuristic
      tried. The memory claim is measured, not stated: at most 30 states
      on the 8-puzzle and 29 on the 15-puzzle, where A* with the same
      heuristic holds 2,311 and up to 19,921. The price is repeated
      work, and the iteration profile shows how the geometric growth of
      the bounded searches keeps that price small: on a 29-move
      instance the seven iterations cost 5, 18, 84, 335, 1,843, 8,225,
      and 402 nodes, so everything before the last complete iteration
      is 21% of the total.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>cut</strong>. Every node whose g + h exceeds
      the bound is pruned, so the searches are as short as h is sharp,
      and Manhattan is sharp because it counts what every move must
      pay. Measured on the same 100 states: <strong>3,043 nodes</strong>{' '}
      with Manhattan against 130,771 with misplaced tiles and 398,551
      with no heuristic at all (plain iterative deepening, on the 36
      easier instances where Manhattan needs 689). Admissibility is not
      assumed either: all three heuristics are checked on all 181,440
      states and none exceeds the true distance. Linear conflict, the
      refinement that adds two moves for each tile that must step out
      of its goal row to let another pass, halves the nodes again to
      1,495, which is the direction pattern databases take to its end:
      a sharper h is the only lever IDA* has, and it is a large one.
    </p>
  ),

  picture: (
    <p>
      Searching a maze for the shortest way out with a candle instead
      of a map. Decide how far you are willing to walk in total, counting
      the steps taken plus an honest guess of the steps remaining, and
      explore every corridor that stays under that budget, turning back
      the moment a corridor would exceed it. Fail, and raise the budget
      to the smallest amount any corridor would have needed, then walk
      again from the entrance. You repeat the early corridors many
      times, but each budget explores several times more than the last,
      so the repetition costs little. You never carry more than the
      corridor you are in, and the first exit you reach under a budget
      is the nearest one, because every shorter route would have fit
      an earlier budget.
    </p>
  ),

  steps: [
    <>
      <strong>Bound:</strong> b ← h(start).
    </>,
    <>
      <strong>Search:</strong> depth-first from the start; at each node
      f = g + h; if f &gt; b, return f and do not expand.
    </>,
    <>
      <strong>Goal:</strong> if the node is the goal, stop; the path
      length g is optimal.
    </>,
    <>
      <strong>Restart:</strong> b ← the smallest f returned above the
      bound; search again from the start.
    </>,
    <>
      <strong>Memory:</strong> the current path only; skip the parent
      to avoid the trivial two-move cycle.
    </>,
  ],

  signals: [
    <>
      <strong>An exponential state space and a small memory:</strong>
      puzzles, planning, model checking; the frontier will not fit but
      a path always will.
    </>,
    <>
      <strong>An admissible heuristic with few distinct values:</strong>
      integer costs, so each new bound admits many new nodes and the
      iterations grow geometrically.
    </>,
    <>
      <strong>Optimality required:</strong> if any good solution would
      do, weighted A* or beam search finds one in far fewer nodes.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>A* with the same heuristic</strong>:
      2,310 nodes against IDA*&apos;s 3,043 on the 8-puzzle, since A*
      never revisits a state, and 2,311 states in memory against 30.
      When the frontier fits, A* is the right answer; IDA* exists for
      when it does not.
    </>
  ),

  strength: (
    <>
      <strong>Optimal, in the memory of a path, at a small
      premium.</strong> 100 of 100 exact against exhaustive truth, at most
      30 states stored where A* stores 2,311, and total work within a
      third of A*&apos;s because the iterations grow geometrically.
    </>
  ),
  weakness: (
    <>
      <strong>No memory of what it has seen.</strong> Every iteration
      repeats every earlier one; transpositions are re-explored, which
      on graphs with many paths to the same state (not trees) can cost
      exponentially more than A*; a heuristic with real-valued or many
      distinct f-values makes each iteration admit few new nodes, so
      the number of iterations explodes; and the whole method is only
      as good as h: with none, 398,551 nodes where Manhattan needs 689.
    </>
  ),

  problem: 'Memory-bound puzzle search',
  problemSlug: 'puzzle-state-search',
  rivals: [
    {
      name: 'IDA* × Manhattan distance',
      isThisUnit: true,
      algoName: 'IDA*',
      cost: 'depth-first, repeated per bound',
      wins: (
        <>
          <strong>Optimal with at most 30 states in memory</strong>;
          3,043 nodes on the 8-puzzle.
        </>
      ),
      costs: (
        <>
          Repeats earlier iterations; no transposition memory.
        </>
      ),
      when: 'Optimal solutions in a state space whose frontier will not fit.',
    },
    {
      name: 'A*',
      algoName: 'A*',
      cost: 'open and closed sets in memory',
      wins: (
        <>
          Fewer nodes, 2,310 against 3,043, because no state is expanded
          twice; the same optimal answers.
        </>
      ),
      costs: (
        <>
          2,311 states stored on the 8-puzzle and 19,921 on a 28-move
          15-puzzle; exhausts memory on hard instances.
        </>
      ),
      when: 'The frontier fits, or the graph has many transpositions.',
    },
    {
      name: 'Recursive best-first search',
      algoName: 'Recursive best-first search',
      cost: 'linear memory, best-first order',
      wins: (
        <>
          Expands in best-first order with a backed-up f-limit, so it
          handles real-valued costs that would give IDA* one node per
          iteration.
        </>
      ),
      costs: (
        <>
          Re-expands subtrees when the limit changes hands, often more
          than IDA* does on integer costs.
        </>
      ),
      when: 'Linear memory with non-integer or many-valued heuristics.',
    },
    {
      name: 'SMA*',
      algoName: 'SMA*',
      cost: 'A* within a fixed memory budget',
      wins: (
        <>
          Uses all the memory it is given and forgets the worst leaves
          only when full; A*&apos;s behavior until then.
        </>
      ),
      costs: (
        <>
          Complex bookkeeping; thrashes when the optimal path needs
          more memory than the budget.
        </>
      ),
      when: 'A known memory limit that is large but not unlimited.',
    },
  ],
  neverUse: {
    name: 'Breadth-first search on the 15-puzzle',
    why: (
      <>
        Breadth-first search is optimal too, and it is the instinct for
        &quot;fewest moves&quot;. On the 8-puzzle it is even the referee
        on this page: it expands all{' '}
        <strong>181,440 reachable states</strong> to answer a question
        that IDA* with Manhattan answers in 3,043 nodes, and it must
        hold the whole frontier while it does. On the 15-puzzle the
        reachable space is 10,461,394,944,000 states; a frontier at
        depth 28 is billions of states wide, and it is not run here
        because it cannot be. Uninformed search pays for every state at
        every depth; the heuristic exists to refuse almost all of them,
        and iterative deepening exists so that refusal costs no memory.
      </>
    ),
  },

  contest: {
    instance:
      '100 random 8-puzzle states (mean optimal length 21.7, max 29) and four 15-puzzle instances scrambled by 36 random moves; referees: breadth-first distances for all 181,440 8-puzzle states, A* with Manhattan for the 15-puzzle',
    columns: ['optimal', 'nodes generated (mean)', 'states in memory'],
    rows: [
      {
        method: 'IDA*, Manhattan',
        isThisUnit: true,
        values: ['100 of 100', '3,043', 'at most 30'],
        best: 2,
        verdict: 'the path is the memory',
      },
      {
        method: 'IDA*, Manhattan + linear conflict',
        values: ['100 of 100', '1,495', 'at most 30'],
        verdict: 'a sharper h halves the work',
      },
      {
        method: 'IDA*, misplaced tiles',
        values: ['100 of 100', '130,771', 'at most 30'],
        verdict: '43× the nodes of Manhattan',
      },
      {
        method: 'plain iterative deepening (h = 0), 36 instances ≤ 20 moves',
        values: ['36 of 36', '398,551 (Manhattan: 689)', 'at most 21'],
        verdict: '578× the nodes',
      },
      {
        method: 'A*, Manhattan',
        values: ['100 of 100', '2,310', '2,311 at peak'],
        verdict: 'fewer nodes, 77× the memory',
      },
      {
        method: '15-puzzle, 4 instances of 26 to 28 moves',
        values: ['IDA* = A*, 4 of 4', 'IDA* 1,976 to 15,165; A* 1,922 to 19,920', 'IDA* 27 to 29; A* 1,923 to 19,921'],
        verdict: 'same answers, memory 66× to 687× apart',
      },
      {
        method: 'breadth-first search',
        values: ['exact', '181,440 states (8-puzzle)', 'the whole frontier'],
        verdict: '10⁻¹³ of the 15-puzzle per state',
      },
    ],
    source:
      'python solutions/ida_star_manhattan_distance.py prints this table and asserts: 181,440 reachable states with no heuristic exceeding the true distance on any; IDA* equal to the exhaustive distance on 100 of 100 states under every heuristic; linear conflict fewer nodes than Manhattan, fewer than misplaced tiles, and plain deepening more than 20× Manhattan on the paired instances; consecutive bounds differing by 2 with the last complete iteration above half the nodes; IDA* equal to A* on 4 of 4 15-puzzle instances with A* storing more than 50× the states; recursion depth at most the solution length plus one.',
  },

  figure: (
    <Figure
      id="fig-ida-iterations"
      aspect="16 / 7"
      caption="The iteration profile of IDA* on a 29-move 8-puzzle instance, nodes per bound on a log scale. Each bounded search repeats the last and admits about four to five times more nodes, so the last complete iteration (bound 27, 8,225 nodes) is 75% of all the work and everything before it 21%; the final iteration stops at the goal after 402 nodes. Right: what each method keeps in memory on the same 100 instances, A*'s 2,311 states against IDA*'s path of at most 30."
      cite={{
        text: 'R. E. Korf, "Depth-first iterative-deepening: an optimal admissible tree search," Artificial Intelligence 27(1), 1985. DOI 10.1016/0004-3702(85)90084-0. O. Hansson, A. Mayer, M. Yung, "Criticizing solutions to relaxed models yields powerful admissible heuristics," Information Sciences 63, 1992. J. Culberson, J. Schaeffer, "Pattern databases," Computational Intelligence 14(3), 1998.',
        href: 'https://doi.org/10.1016/0004-3702(85)90084-0',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="Bars of nodes per iteration bound rising geometrically then a short final bar, beside two bars comparing states in memory for A star and IDA star">
        {(() => {
          const x0 = 50;
          const y0 = 225;
          const h = 165;
          const bounds = [17, 19, 21, 23, 25, 27, 29];
          const nodes = [5, 18, 84, 335, 1843, 8225, 402];
          const Y = (v) => y0 - (Math.log10(v) / 4) * h;
          const bw = 40;
          return (
            <g>
              <line x1={x0} y1={y0} x2={x0 + bounds.length * 48} y2={y0} stroke="#9aa5bd" strokeOpacity="0.5" />
              {[1, 10, 100, 1000, 10000].map((v) => (
                <g key={v}>
                  <line x1={x0} y1={Y(v)} x2={x0 + bounds.length * 48} y2={Y(v)} stroke="#9aa5bd" strokeOpacity="0.15" />
                  <text x={x0 - 42} y={Y(v) + 4} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">{v.toLocaleString()}</text>
                </g>
              ))}
              {bounds.map((b, i) => (
                <g key={b}>
                  <rect x={x0 + i * 48 + 4} y={Y(nodes[i])} width={bw} height={y0 - Y(nodes[i])} fill={i === bounds.length - 1 ? '#62d98a' : i === bounds.length - 2 ? '#f0b94b' : '#5da2ff'} fillOpacity="0.8" />
                  <text x={x0 + i * 48 + 10} y={y0 + 14} fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="10">{`f≤${b}`}</text>
                  <text x={x0 + i * 48 + 4} y={Y(nodes[i]) - 4} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">{nodes[i].toLocaleString()}</text>
                </g>
              ))}
              <text x={x0} y="22" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">nodes per iteration, 29-move instance (amber: last complete, 75%; green: found the goal, 4%)</text>
              <text x={x0} y={y0 + 32} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">bounds rise by 2 (the 8-puzzle's parity); 10,912 nodes in all</text>
              <g>
                <text x="440" y="60" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">states in memory, 8-puzzle</text>
                <rect x="440" y="70" width="150" height="22" fill="#e2606c" fillOpacity="0.7" />
                <text x="446" y="85" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="10">A*: 2,311</text>
                <rect x="440" y="100" width="2" height="22" fill="#62d98a" />
                <text x="448" y="115" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="10">IDA*: 30 (the path)</text>
                <text x="440" y="150" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">nodes generated, mean of 100:</text>
                <text x="440" y="166" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">A* 2,310, IDA* 3,043</text>
                <text x="440" y="182" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">misplaced tiles 130,771</text>
                <text x="440" y="198" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">no heuristic 398,551</text>
                <text x="440" y="226" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">15-puzzle: A* stores 19,921,</text>
                <text x="440" y="242" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">IDA* 29, same 28-move answer</text>
              </g>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'ida_star_manhattan_distance.py',
  Viz: IdaViz,
  narration,
};
