import SudokuViz from '../viz/SudokuViz.jsx';
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
      solution, abandoned <strong>still unfinished past 2,000,000 calls</strong>{' '}
      while MRV completed it in <strong>482</strong>; on a gentle grid, 201
      calls against 50. Both are O(9^m) in the worst case; the heuristic
      does not change the ceiling, it changes whether you ever meet it.
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

  code,
  filename: 'backtracking_mrv.py',
  Viz: SudokuViz,
  narration,
};
