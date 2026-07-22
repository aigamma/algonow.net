import SudokuViz from '../viz/SudokuViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/backtracking_mrv.py?raw';
import { narration } from './backtracking-mrv.narration.js';

export const content = {
  given: 'A 9×9 Sudoku grid, partly filled.',
  task:
    'Complete it so every row, column, and 3×3 box holds 1–9 exactly once, or prove no completion exists.',
  constraint:
    '~50 empty cells × up to 9 choices each is astronomical on paper; the rules interlock so tightly that most choices are illegal on close inspection. The craft is inspecting in the right place.',

  origins: (
    <p>
      Backtracking is one of computing&apos;s oldest moves; Derrick Lehmer
      coined the word in the 1950s, and the method appears wherever exhaustive
      search meets structure (eight queens, graph coloring, circuit layout).
      Constraint-satisfaction research in the 1960s–70s noticed that{' '}
      <strong>variable order changes the tree by orders of magnitude</strong>,
      and the rule that emerged, work the fewest-options variable first, the{' '}
      <strong>fail-first principle</strong>, is still the default in industrial
      solvers.
    </p>
  ),

  algoRole: (
    <p>
      Depth-first trial and error with an <strong>undo</strong>: place a legal
      digit, go deeper; when any cell reaches zero legal digits the branch is
      dead, so erase the latest placement and try its next alternative.{' '}
      <strong>Complete</strong>: finds a solution if one exists, proves absence
      if none does.
    </p>
  ),
  heurRole: (
    <p>
      Among all empty cells, always work the one with the{' '}
      <strong>fewest legal digits left</strong>. A 1-candidate cell is forced,
      free progress; a 0-candidate cell is a dead branch you want discovered{' '}
      <strong>now</strong>, not twenty placements deep.{' '}
      <strong>Fail first</strong>, so the undo is one move, not twenty.
    </p>
  ),

  picture: (
    <p>
      Flat-pack furniture, a bag of near-identical screws. Reading order starts
      at panel one, hole one, inserts whatever fits, and discovers at panel
      nine that an early screw was wrong: unscrew everything back to it. The
      experienced builder scans for the hole that accepts exactly one screw,
      fastens it, rescans. Forced fastenings shrink options elsewhere; when a
      guess is finally needed it is between two screws, not nine, and a wrong
      one announces itself within a fastening or two.
    </p>
  ),

  steps: [
    <>
      <strong>Count:</strong> for each empty cell, the legal digits under its
      row, column, and box.
    </>,
    <>
      <strong>Select</strong> the minimum-remaining-values cell; a zero-count
      cell anywhere means backtrack immediately.
    </>,
    <>
      <strong>Place</strong> one candidate; keep the alternatives on the undo
      stack.
    </>,
    <>
      <strong>Recurse:</strong> the placement tightens its row, column, and
      box; counts drop, often to one, and forced moves cascade.
    </>,
    <>
      <strong>On failure, pop:</strong> erase, try the next candidate, keep
      unwinding when a cell exhausts.
    </>,
    <>
      <strong>No empty cells left</strong> means the grid stands complete and
      verified.
    </>,
  ],

  signals: [
    <>
      Values assigned to variables under <strong>hard interlocking rules</strong>,
      needing a complete assignment or an impossibility proof.
    </>,
    <>
      Legal values per variable are <strong>cheap to count</strong>.
    </>,
    <>
      Placements <strong>propagate</strong>: each decision tightens its
      neighbors (timetables, seating, register allocation).
    </>,
  ],
  baseline: (
    <>
      Same backtracking, reading order: on the hard grid in the tested
      solution it is <strong>still unfinished at 20,000 calls</strong>, the
      budget the test actually enforces, while MRV completed it in{' '}
      <strong>482</strong>; on a gentle grid, 201 calls against 50. Both are
      O(9^m) in the worst case; the heuristic does not change the ceiling, it
      changes whether you ever meet it.
    </>
  ),

  strength: (
    <>
      <strong>Completeness with early failure.</strong> Misses nothing, proves
      impossibility on demand, and fail-first converts wrong guesses into
      shallow one-move detours while forced cascades fill most of the grid
      free.
    </>
  ),
  weakness: (
    <>
      <strong>Cost per node, and the ceiling survives.</strong> Recounting
      candidates is real work per placement; adversarial grids still thrash
      exponentially; and bare MRV is weaker than the industrial recipe
      (propagation, least-constraining-value, learned no-goods). The heuristic
      picks where to work, not how much work can exist.
    </>
  ),

  problem: 'Constraint satisfaction search',
  problemSlug: 'constraint-satisfaction',
  rivals: [
    {
      name: 'Backtracking, reading order',
      algoName: 'Backtracking search',
      cost: 'O(9^m) worst case',
      wins: (
        <>
          Zero heuristic machinery, and it accidentally exploits locality:
          consecutive cells share a row and a box, so a contradiction usually
          surfaces nearby. <strong>201 calls</strong> below.
        </>
      ),
      costs: (
        <>
          On grids built to defeat it, the same search runs for hours. The
          locality is luck, not a guarantee.
        </>
      ),
      when: 'A first implementation, or when the instance is known to be gentle.',
    },
    {
      name: 'Backtracking, random cell',
      algoName: 'Backtracking search',
      cost: 'O(9^m), and the constant is brutal',
      wins: <>Nothing. It is on this bench to prove a point, and it proves it.</>,
      costs: (
        <>
          <strong>Did not finish inside 20,000 calls</strong> on the same
          puzzle reading order solved in 201. Choosing at random keeps
          re-deciding loose cells with seven or eight candidates, so the tree
          it opens is astronomically wider.
        </>
      ),
      when: 'Never. A bad ordering is far worse than no ordering.',
    },
    {
      name: 'Backtracking × MRV',
      algoName: 'Backtracking search',
      isThisUnit: true,
      cost: 'O(9^m) worst case, with a far smaller effective branching factor',
      wins: (
        <>
          Always works the tightest cell first, so a doomed branch dies in one
          move instead of twenty: <strong>50 calls</strong>, a quarter of
          reading order, and 482 on a puzzle built to punish naive solvers.
        </>
      ),
      costs: (
        <>
          Recounting candidates at every node is real work per placement, and
          the exponential ceiling still stands.
        </>
      ),
      when: 'Any constraint problem where domains shrink as you assign.',
    },
    {
      name: 'MRV + constraint propagation',
      algoName: 'Constraint propagation for Sudoku',
      cost: 'O(m) per propagation pass',
      wins: (
        <>
          Assigns every forced cell before searching at all, and{' '}
          <strong>solved this grid in a single call</strong>: no search
          whatsoever, only inference.
        </>
      ),
      costs: (
        <>
          More code, more state to keep consistent, and on genuinely hard
          grids it merely shrinks the tree rather than removing it.
        </>
      ),
      when: 'Production. This is what real constraint solvers do, and ordering composes with it rather than competing.',
    },
  ],
  neverUse: {
    name: 'Generate and test',
    why: (
      <>
        Filling every empty cell with digits and then checking validity means{' '}
        <strong>9 to the power of the blanks</strong> candidate grids. The
        gentle puzzle below has 51 blanks, so that is roughly{' '}
        <strong>10⁴⁸</strong> grids to test, against 50 placements for the
        same answer. The lesson is not that brute force is slow. It is that
        checking a constraint only at the end throws away the information
        that makes the problem tractable: a contradiction is visible the
        moment it is created, and every method on this bench beats generate
        and test purely by looking sooner.
      </>
    ),
  },

  contest: {
    instance:
      'one gentle 9 by 9 Sudoku with 51 blanks, every method capped at 20,000 recursive calls',
    columns: ['calls', 'solved'],
    rows: [
      {
        method: 'Backtracking, reading order',
        values: ['201', 'yes'],
        verdict: 'no heuristic at all, and it exploits locality by accident',
      },
      {
        method: 'Backtracking, random cell',
        values: ['over 20,000', 'no'],
        verdict: 'a bad ordering is far worse than none: 100× worse and still unfinished',
      },
      {
        method: 'Backtracking × MRV',
        isThisUnit: true,
        values: ['50', 'yes'],
        verdict: 'tightest cell first, a quarter of the work',
      },
      {
        method: 'MRV + constraint propagation',
        values: ['1', 'yes'],
        best: 0,
        verdict: 'pure inference, no search: the grid was never actually hard',
      },
    ],
    source:
      'python solutions/backtracking_mrv.py prints this table and asserts every finisher produced a valid grid. On a puzzle built to defeat naive solvers, MRV still finishes in 482 calls.',
  },

  figure: (
    <Figure
      id="fig-mrv-branching"
      aspect="16 / 7"
      caption="Why the tightest cell first is not a preference but a pruning device. A cell with seven candidates opens seven branches, and a mistake there is discovered many placements later. A cell with one candidate is free progress, and a cell with none proves the current branch dead immediately, before any of its subtree is generated. Minimum remaining values simply always takes the leftmost bar on this chart."
      cite={{
        text: 'The fail-first principle, Haralick and Elliott, "Increasing Tree Search Efficiency for Constraint Satisfaction Problems", Artificial Intelligence 14(3), 1980.',
        href: 'https://doi.org/10.1016/0004-3702(80)90051-X',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="Branching factor bars, from a dead cell with zero candidates to a loose cell with seven">
        <line x1="56" y1="228" x2="612" y2="228" stroke="#232c40" strokeWidth="1.5" />
        {[
          { x: 80, n: 0, h: 4, fill: '#e06767', label: 'dead' },
          { x: 152, n: 1, h: 26, fill: '#62d98a', label: 'forced' },
          { x: 224, n: 2, h: 52, fill: '#5da2ff', label: '' },
          { x: 296, n: 3, h: 78, fill: '#5da2ff', label: '' },
          { x: 368, n: 4, h: 104, fill: '#5da2ff', label: '' },
          { x: 440, n: 5, h: 130, fill: '#f0b94b', label: '' },
          { x: 512, n: 6, h: 156, fill: '#f0b94b', label: '' },
          { x: 584, n: 7, h: 182, fill: '#f0b94b', label: 'loose' },
        ].map((b) => (
          <g key={b.n}>
            <rect x={b.x - 22} y={228 - b.h} width="44" height={b.h} rx="4" fill={b.fill} opacity="0.72" />
            <text x={b.x} y="248" textAnchor="middle" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="12">
              {b.n}
            </text>
            {b.label && (
              <text x={b.x} y={218 - b.h} textAnchor="middle" fill={b.fill} fontFamily="ui-monospace, monospace" fontSize="11">
                {b.label}
              </text>
            )}
          </g>
        ))}
        <text x="56" y="268" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="12">
          candidates left in the cell  →
        </text>
        <text x="56" y="34" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="12">
          branches opened by choosing that cell
        </text>
        <line x1="56" y1="42" x2="56" y2="228" stroke="#232c40" strokeWidth="1.5" />
      </svg>
    </Figure>
  ),

  code,
  filename: 'backtracking_mrv.py',
  Viz: SudokuViz,
  narration,
};
