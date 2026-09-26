import DlxViz from '../viz/DlxViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/knuths_algorithm_x_dancing_links.py?raw';
import { narration } from './knuths-algorithm-x-dancing-links.narration.js';

export const content = {
  given:
    'A 0/1 matrix: rows are choices, columns are constraints, and every column must end up with exactly one chosen row. Eight queens, a sudoku, a box of pentominoes: all the same matrix, all the same question.',
  task: 'Pick a column, try each row that covers it, remove every column that row satisfies and every row that would now collide, recurse, put everything back, try the next row. Choose the column with the fewest rows, and undo with pointers instead of copies.',
  constraint:
    'Every count is refereed: 92 and 724 queens solutions match an independent backtracking counter and the published sequence; the sudoku is unique and equals the grid from an independent cell-by-cell solver; 8 tilings of 3 × 20 are 4 orientations of the published 2. After every search, every link is back where it started, checked node by node against a snapshot. The ablations are measured: first-column branching, and a backtracker that copies the matrix instead of dancing.',

  origins: (
    <p>
      Donald Knuth, <strong>2000</strong>, in a paper titled simply
      Dancing Links, credited the trick to Hiroshi Hitotsumatsu and
      Kohei Noshita (1979) and named the search Algorithm X because
      it was too obvious to deserve a better name: the interesting
      part was the data structure. A doubly linked node removed by
      x.left.right = x.right and x.right.left = x.left can be put
      back by x.left.right = x and x.right.left = x, as long as
      removals are undone in reverse order: backtracking for the
      price of the forward step, with nothing copied. The smallest
      column rule he called heuristic S, after Golomb and
      Baumert&apos;s 1965 advice to branch where the choices are
      fewest. DLX became the standard exact-cover engine for
      polyomino tilings, sudoku solvers, and Knuth&apos;s own
      Volume 4B, where it fills a hundred pages.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>recursion over a shrinking matrix</strong>.
      Choose a column c. For each row r that has a 1 in c: include
      r, cover every column r satisfies (unlinking each column
      header and every row that would collide), recurse, then
      uncover in reverse order and try the next r. Success is an
      empty header list. The referees are counts and structure:
      1,198 nodes for 8-queens and 16,447 for 10-queens reach
      exactly 92 and 724 solutions, the numbers the plain
      backtracking counter and the published sequence agree on;
      a hard sudoku falls in <strong>2,740 nodes</strong> where the
      cell-by-cell backtracker needs 49,558; and after every search
      a node-by-node snapshot proves every link restored.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>two tricks that make it fast</strong>.
      Dancing links: each node keeps four neighbors, removal is two
      pointer writes, restoration is the same two in reverse, and
      no matrix is ever copied. Measured against a set-copying
      backtracker with the identical branching rule, the 64-row
      queens toy is at parity (84,484 writes vs 89,407 operations),
      100 rows is 1.4×, and the 561-row sudoku is{' '}
      <strong>31.8×</strong>: copying pays for every live row at
      every node; the links pay only for what the step touches.
      Heuristic S: branch on the column with the fewest candidate
      rows. Removing it doubles the queens trees (2,056 and 35,538
      nodes) and leaves the sudoku <strong>unsolved after 200,000
      nodes</strong> against 2,740.
    </p>
  ),

  picture: (
    <p>
      A jigsaw where every piece is a rule and every rule must be
      satisfied exactly once. The naive solver photocopies the whole
      table of remaining pieces before each guess, so it can throw
      the copy away if the guess fails: the photocopier is the cost.
      Dancing links replaces the photocopier with a string. Every
      piece hangs on strings to its neighbors; to try a guess, you
      unhook the pieces it rules out, and each unhooked piece
      keeps its own strings taut in memory, still pointing at the
      neighbors it left. When the guess fails, you rehook them in
      the reverse order, and they slide back into exactly the holes
      they came from. Nothing is copied, nothing is searched for,
      and the undo is as cheap as the do. Then the second trick:
      always guess at the rule with the fewest ways left to satisfy
      it, because a rule with one candidate is not a guess at all.
    </p>
  ),

  steps: [
    <>
      <strong>Choose:</strong> the column with the fewest rows
      (heuristic S); size zero means backtrack now.
    </>,
    <>
      <strong>Cover:</strong> unlink the column header and, for
      every row in it, unlink that row from every other column it
      touches.
    </>,
    <>
      <strong>Try a row:</strong> include it, cover each other
      column it satisfies, recurse.
    </>,
    <>
      <strong>Uncover in reverse:</strong> x.left.right = x,
      x.right.left = x, sizes restored: the links dance back.
    </>,
    <>
      <strong>Done:</strong> an empty header list is a solution:
      92, 724, 1 unique sudoku, 8 tilings, all refereed.
    </>,
  ],

  signals: [
    <>
      <strong>Each constraint exactly once:</strong> tilings,
      schedules, sudoku, queens: if the problem is a 0/1 matrix
      with exactly-one columns, it is this engine.
    </>,
    <>
      <strong>Deep backtracking with wide branching:</strong> the
      undo cost dominates naive solvers; the links make it free,
      and the gap is 31.8× at 561 rows.
    </>,
    <>
      <strong>Counting, not just finding:</strong> the whole tree
      is walked anyway, and DLX walks it with the smallest tree
      the branching rule allows.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>backtracking search with a
      copied state</strong>: the same Algorithm X, with sets of
      live rows and columns rebuilt at every node. It is correct,
      simpler to write, and at parity on a toy (89,407 operations
      against 84,484 pointer writes on 8-queens). The bill arrives
      with size: 1.4× at 100 rows, 31.8× at 561 rows, and it keeps
      growing with the matrix.
    </>
  ),

  strength: (
    <>
      <strong>Undo for the price of do, and the smallest tree the
      matrix allows.</strong> Every search on this page restored
      every link exactly (snapshot-checked), every count matched an
      independent referee, and the branching rule turned a sudoku
      that first-column branching could not finish in 200,000
      nodes into a 2,740-node walk. One engine, one data structure,
      every exact-cover puzzle.
    </>
  ),
  weakness: (
    <>
      <strong>Exponential when the matrix is, and only for
      exactly-once problems.</strong> Heuristic S shrinks the tree;
      it does not make it polynomial (10-queens is still 16,447
      nodes). At-most-once constraints need secondary columns and
      at-least-once constraints need a different solver entirely
      (set cover is another puzzle here). The links cost four
      pointers per 1 in the matrix, and the recursion is depth-first
      only: no bound, no pruning by cost, just exact cover, exactly.
    </>
  ),

  problem: 'Exact cover',
  problemSlug: 'exact-cover',
  rivals: [
    {
      name: 'Algorithm X × dancing links',
      isThisUnit: true,
      algoName: "Knuth's Algorithm X",
      cost: 'O(1) undo per link',
      wins: (
        <>
          <strong>The exact-cover engine</strong>: 2,740 nodes for
          the sudoku, links restored exactly, 31.8× less undo work
          than copying at 561 rows.
        </>
      ),
      costs: (
        <>
          Four pointers per matrix 1, exactly-once semantics only,
          and a tree that is still exponential in the worst case.
        </>
      ),
      when: 'Tilings, sudoku, queens, timetables: any exactly-once matrix, especially when counting solutions.',
    },
    {
      name: 'Backtracking search',
      cost: 'copy or recompute on undo',
      wins: (
        <>
          The live unit here with its minimum-remaining-values rule:
          the same idea as heuristic S, written directly against the
          problem instead of a matrix.
        </>
      ),
      costs: (
        <>
          Undo means copying or recomputing state: at parity on 64
          rows, 31.8× behind on 561, and every new puzzle is a new
          solver.
        </>
      ),
      when: 'Problems whose constraints do not fit the exactly-once matrix, or one-off solvers.',
    },
    {
      name: 'DPLL',
      cost: 'SAT encoding',
      wins: (
        <>
          Encode exactly-one as clauses and hand it to a SAT solver
          (the live unit): unit propagation and clause learning find
          structure DLX never looks for.
        </>
      ),
      costs: (
        <>
          Exactly-one costs O(n²) clauses or auxiliary variables,
          and counting all solutions is a different, harder problem.
        </>
      ),
      when: 'Mixed constraints beyond exact cover, or a single solution to a large industrial instance.',
    },
    {
      name: 'N-queens',
      cost: 'problem-specific',
      wins: (
        <>
          Row-by-row placement with diagonal bitmasks: the referee
          on this page, and far simpler code for this one puzzle.
        </>
      ),
      costs: (
        <>
          It solves queens and nothing else; the matrix view solves
          queens, sudoku, and pentominoes with one engine.
        </>
      ),
      when: 'When the puzzle is exactly one puzzle and it will stay that way.',
    },
  ],
  neverUse: {
    name: 'Branching on whichever column comes first',
    why: (
      <>
        It is the natural loop: take the first unsatisfied
        constraint, try its rows. On the queens it merely doubles
        the tree (2,056 and 35,538 nodes against 1,198 and 16,447).
        On the sudoku it is a catastrophe: the search was{' '}
        <strong>still running after 200,000 nodes</strong>, where
        the smallest-column rule finished in 2,740, because the
        first column is a cell with nine candidate digits while
        somewhere in the grid a cell has exactly one. Every branch
        taken at a nine-way column before that forced cell is a
        multiplier on wasted work. Heuristic S is one line: pick
        the minimum size. It is the difference between a solver and
        a space heater.
      </>
    ),
  },

  contest: {
    instance:
      'the same exact-cover instances: 8-queens (92 solutions), 10-queens (724), a hard sudoku (unique), pentominoes on 3 × 20 (8 tilings, the published 2 in 4 orientations); currency: search nodes, and pointer writes versus elementary operations for the undo',
    columns: ['8-queens', '10-queens', 'sudoku'],
    rows: [
      {
        method: 'Algorithm X + DLX, smallest column',
        isThisUnit: true,
        values: ['1,198', '16,447', '2,740'],
        best: 2,
        verdict: 'nodes; undo in two pointer writes per link, every link restored',
      },
      {
        method: 'Algorithm X + DLX, first column',
        values: ['2,056', '35,538', '>200,000'],
        verdict: 'nodes; same answers on the queens, the sudoku still unsolved at the cap',
      },
      {
        method: 'Cell-by-cell sudoku backtracking',
        values: ['-', '-', '49,558'],
        verdict: 'nodes; the plain solver that ignores the matrix view',
      },
      {
        method: 'Copying backtracker (undo work)',
        values: ['1.06×', '1.37×', '31.8×'],
        verdict: 'operations relative to dancing-link writes: parity on the toy, the gap grows with the matrix',
      },
    ],
    source:
      'python solutions/knuths_algorithm_x_dancing_links.py prints this table and asserts: 92 and 724 queens solutions equal to an independent backtracking counter and the published sequence; the sudoku unique and equal to the independent solver; 8 tilings of 3 × 20 each covering all 60 cells once; every link restored after every search (snapshot compared node by node); smallest-column beating first-column on the queens and the first-column sudoku unfinished at 200,000 nodes; and the copying-to-links ratio rising 1.06 < 1.37 < 31.8 across 64, 100, and 561 rows.',
  },

  figure: (
    <Figure
      id="fig-dancing-links"
      aspect="16 / 7"
      caption="A node leaves its row by two pointer writes and returns by two more. Removed: x.left.right = x.right and x.right.left = x.left; the node itself still holds both neighbors. Restored, in reverse order of removal: x.left.right = x and x.right.left = x. Covering a column unlinks its header and every colliding row this way; uncovering replays it backwards. Measured: 8-queens 1,198 nodes with the smallest-column rule against 2,056 without; the sudoku 2,740 against unfinished at 200,000; copying instead of dancing costs 31.8× the undo work at 561 rows."
      cite={{
        text: 'D. E. Knuth, "Dancing Links," in Millennial Perspectives in Computer Science, 2000 (arXiv cs/0011047); heuristic S after Golomb and Baumert, JACM 12(4), 1965. Also The Art of Computer Programming, Vol. 4B, 2022.',
        href: 'https://arxiv.org/abs/cs/0011047',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="A row of doubly linked nodes with one node unlinked but still pointing at its neighbors, and the two writes that restore it">
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i}>
            <rect x={60 + i * 110} y={70} width={60} height={34} rx="6" fill={i === 2 ? 'rgba(240,185,75,0.25)' : 'rgba(93,162,255,0.12)'} stroke={i === 2 ? '#f0b94b' : '#5da2ff'} strokeWidth="1.6" />
            <text x={78 + i * 110} y={92} fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="12">{i === 2 ? 'x' : `n${i}`}</text>
          </g>
        ))}
        <path d="M 120 82 L 170 82" stroke="#5da2ff" strokeWidth="1.5" markerEnd="url(#arr)" />
        <path d="M 170 96 L 120 96" stroke="#5da2ff" strokeWidth="1.5" />
        <path d="M 230 62 C 260 30, 340 30, 390 62" fill="none" stroke="#5da2ff" strokeWidth="1.8" strokeDasharray="5 4" />
        <path d="M 390 112 C 340 144, 260 144, 230 112" fill="none" stroke="#5da2ff" strokeWidth="1.8" strokeDasharray="5 4" />
        <path d="M 280 82 L 232 82" stroke="#f0b94b" strokeWidth="1.5" />
        <path d="M 340 82 L 388 82" stroke="#f0b94b" strokeWidth="1.5" />
        <path d="M 450 82 L 500 82" stroke="#5da2ff" strokeWidth="1.5" />
        <path d="M 500 96 L 450 96" stroke="#5da2ff" strokeWidth="1.5" />
        <text x="60" y="150" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="11">unlinked: x.left.right = x.right;  x.right.left = x.left  (the list closes over x)</text>
        <text x="60" y="170" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">x keeps its own left and right, so restoring is  x.left.right = x;  x.right.left = x</text>
        <text x="60" y="196" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">the rule: undo in the exact reverse order of the removals, and every hole is still where the node left it</text>
        <text x="60" y="232" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">measured: 8-queens 1,198 nodes (smallest column) vs 2,056 · sudoku 2,740 vs unfinished at 200,000 · undo 31.8× cheaper than copying at 561 rows</text>
        <text x="60" y="256" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">referees: 92 and 724 queens (backtracking counter + published), sudoku unique and equal to a cell-by-cell solver, 8 tilings of 3 × 20, every link restored</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'knuths_algorithm_x_dancing_links.py',
  Viz: DlxViz,
  narration,
};
