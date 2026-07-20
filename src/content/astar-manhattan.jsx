import AStarViz from '../viz/AStarViz.jsx';
import code from '../../solutions/astar_manhattan.py?raw';
import { narration } from './astar-manhattan.narration.js';

// The visible unit: tight, scannable, written for the eye. The narration
// module carries the long-form spoken lesson for the same sections.
export const content = {
  given:
    'A rectangular grid of open cells and walls, a start cell, and a goal cell.',
  task: 'Return a provably shortest route from start to goal, or report that none exists.',
  constraint:
    'Moves are up, down, left, right, each costing 1. Optimality must be guaranteed without settling the whole map.',

  origins: (
    <p>
      Published in 1968 by Peter Hart, Nils Nilsson, and Bertram Raphael at the
      Stanford Research Institute, where it routed an early mobile robot named{' '}
      <strong>Shakey</strong> through rooms and corridors. The idea joined two
      traditions: Dijkstra&apos;s guarantee of shortest paths, and informed
      search&apos;s habit of looking toward the goal. Among algorithms given the
      same heuristic information, A* expands the fewest nodes while still
      guaranteeing the best answer.
    </p>
  ),

  algoRole: (
    <p>
      Owns the bookkeeping: an <strong>open set</strong> prioritized by
      f&nbsp;=&nbsp;g&nbsp;+&nbsp;h, a <strong>closed set</strong> of settled
      cells, the cheapest known cost <strong>g</strong> per cell, and parent
      links for rebuilding the route. It never guesses; it only orders work.
    </p>
  ),
  heurRole: (
    <p>
      The oracle in the priority: <strong>|Δrow| + |Δcol|</strong> to the goal,
      the walk length if the map had no walls. On a 4-direction grid it is{' '}
      <strong>admissible</strong> (never overestimates) and{' '}
      <strong>consistent</strong> (never drops faster than 1 per step), which is
      the whole optimality contract.
    </p>
  ),

  picture: (
    <p>
      A city laid out as a perfect grid; a glass tower you are walking toward
      past construction barriers. The algorithm is your pocket journal: exact
      blocks walked to every corner you have stood on. The heuristic is the
      look upward: blocks north plus blocks east the tower still appears to
      demand. Add the two, always step toward the smallest sum, and the journal
      quietly protects you from the dead ends the view cannot see.
    </p>
  ),

  steps: [
    <>
      <strong>Pop</strong> the open-set cell with the lowest f&nbsp;=&nbsp;g + h.
    </>,
    <>
      If it is the <strong>goal</strong>, stop: follow parent links backward and
      the rebuilt route is optimal.
    </>,
    <>
      Otherwise move it to the <strong>closed set</strong>; its g will never
      improve again.
    </>,
    <>
      <strong>Relax</strong> each open neighbor: if arriving through this cell
      is cheaper than anything seen, record the better g, set the parent, push
      it at its new f.
    </>,
    <>
      <strong>Repeat.</strong> An empty open set before the goal appears proves
      no route exists.
    </>,
  ],

  signals: [
    <>
      The ask is a <strong>shortest</strong> or cheapest path, not just any
      path.
    </>,
    <>
      Both endpoints have <strong>known coordinates</strong>, so a distance
      estimate is free.
    </>,
    <>
      Movement is restricted to a few <strong>unit-cost directions</strong>,
      exactly where Manhattan distance stays admissible.
    </>,
  ],
  baseline: (
    <>
      BFS and Dijkstra are correct here, and wasteful: they expand rings of
      cells that lead away from the goal. The exponential worst case belongs to
      deceptive mazes; on realistic maps an accurate heuristic compresses the
      work toward the length of the answer itself.
    </>
  ),

  strength: (
    <>
      <strong>Optimal efficiency.</strong> With an admissible, consistent
      heuristic, A* provably expands the fewest nodes of any algorithm that
      guarantees the best path from the same information.
    </>
  ),
  weakness: (
    <>
      <strong>Memory.</strong> Open and closed sets remember every discovered
      cell; large or high-dimensional spaces exhaust RAM before time. When
      memory is the scarce resource, reach for iterative deepening (IDA*).
    </>
  ),

  code,
  filename: 'astar_manhattan.py',
  Viz: AStarViz,
  narration,
};
