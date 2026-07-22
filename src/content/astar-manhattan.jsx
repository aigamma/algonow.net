import AStarViz from '../viz/AStarViz.jsx';
import Figure from '../components/Figure.jsx';
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

  problem: 'Nonnegative shortest paths',
  problemSlug: 'single-source-shortest-paths',
  rivals: [
    {
      name: 'A* search',
      isThisUnit: true,
      cost: 'O(b^d) worst case, near-linear in the answer with a sharp heuristic',
      wins: (
        <>
          Optimal, and provably the cheapest way to be optimal from this
          information. It settles cells only where{' '}
          <strong>g + h</strong> can still beat the answer.
        </>
      ),
      costs: (
        <>
          Needs a heuristic you can justify. An estimate that overshoots
          silently voids the guarantee, and the open set holds every frontier
          cell in memory.
        </>
      ),
      when: 'Coordinates are known, so an admissible estimate is free.',
    },
    {
      name: "Dijkstra's algorithm",
      cost: 'O(E log V)',
      wins: (
        <>
          Needs <strong>nothing</strong> but the edge weights. Same optimal
          answer, no heuristic to design, defend, or get wrong.
        </>
      ),
      costs: (
        <>
          Settles cells in every direction, including away from the goal:{' '}
          <strong>13,665 against A*&apos;s 4,350</strong> on the instance below.
        </>
      ),
      when: 'No geometry to exploit, or many goals at once from one source.',
    },
    {
      name: 'Breadth-first search',
      cost: 'O(V + E)',
      wins: (
        <>
          A queue and a visited set: no priority queue, no float arithmetic,
          twenty lines. On unit-cost graphs it returns the same optimum.
        </>
      ),
      costs: (
        <>
          Optimality holds <strong>only</strong> while every edge costs the
          same. One weighted cell and the answer is quietly wrong.
        </>
      ),
      when: 'The grid is genuinely unweighted and you want the simplest correct thing.',
    },
    {
      name: 'Greedy best-first search',
      cost: 'O(b^m), no optimality guarantee',
      wins: (
        <>
          Fastest to the goal by a wide margin: <strong>1,451 cells</strong>,
          a third of what A* touches, because it never looks back at cost paid.
        </>
      ),
      costs: (
        <>
          Wrong. On the instance below it returns a{' '}
          <strong>203-step path where 147 exists</strong>, a 38 percent detour,
          because a concave pocket looks like progress the whole way in.
        </>
      ),
      when: 'Any route beats no route and the map has no traps worth fearing.',
    },
  ],
  neverUse: {
    name: 'Floyd-Warshall',
    why: (
      <>
        It solves <strong>all pairs</strong> of shortest paths in{' '}
        <strong>O(V³)</strong> time and <strong>O(V²)</strong> memory. On this
        121 by 121 grid that is 14,641 vertices: roughly{' '}
        <strong>three thousand billion</strong> operations and a distance
        matrix of 214 million entries, to answer one question A* answers by
        touching 4,350 cells. Reach for it when you need every pair on a dense
        graph of hundreds of nodes, never to route one agent across a map.
      </>
    ),
  },

  contest: {
    instance:
      'a 121 by 121 grid with one U-shaped pocket opening toward the start, routing (60, 6) to (60, 114)',
    columns: ['cells settled', 'path length'],
    rows: [
      {
        method: 'A* × Manhattan',
        isThisUnit: true,
        values: ['4,350', '147'],
        best: 1,
        verdict: 'optimal, and 3.1× cheaper than the blind method that ties it',
      },
      {
        method: "Dijkstra's algorithm",
        values: ['13,665', '147'],
        best: 1,
        verdict: 'same answer, three times the work',
      },
      {
        method: 'Breadth-first search',
        values: ['13,659', '147'],
        best: 1,
        verdict: 'same answer again, and only because every edge costs 1',
      },
      {
        method: 'Greedy best-first',
        values: ['1,451', '203'],
        best: 0,
        verdict: 'cheapest search, 56 steps of detour, no guarantee',
      },
    ],
    source:
      'python solutions/astar_manhattan.py prints this table and asserts each claim. On open ground the gap widens: 161 cells against 25,255.',
  },

  figure: (
    <Figure
      id="fig-astar-frontier"
      aspect="16 / 8"
      caption="Why the estimate pays. Dijkstra settles every cell within reach of the start, a diamond that grows in all directions. A* settles only cells where the cost paid plus the cost still owed can still beat the answer, which on open ground is little more than the corridor between the two points."
      cite={{
        text: 'After Hart, Nilsson and Raphael, "A Formal Basis for the Heuristic Determination of Minimum Cost Paths", IEEE Transactions on Systems Science and Cybernetics 4(2), 1968.',
        href: 'https://doi.org/10.1109/TSSC.1968.300136',
      }}
    >
      <svg viewBox="0 0 640 320" role="img" aria-label="Dijkstra settles a diamond around the start; A* settles a narrow corridor toward the goal">
        <defs>
          <linearGradient id="astar-corr" x1="0" x2="1">
            <stop offset="0" stopColor="rgba(93,162,255,0.42)" />
            <stop offset="1" stopColor="rgba(93,162,255,0.12)" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="640" height="320" fill="none" />
        <text x="26" y="30" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="13">
          Dijkstra · h = 0
        </text>
        <text x="352" y="30" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="13">
          A* · h = Manhattan
        </text>
        <path d="M96 176 L176 96 L256 176 L176 256 Z" fill="rgba(240,185,75,0.16)" stroke="rgba(240,185,75,0.55)" strokeWidth="1.5" />
        <path d="M96 176 L136 136 L176 176 L136 216 Z" fill="rgba(240,185,75,0.22)" stroke="rgba(240,185,75,0.4)" strokeWidth="1" />
        <path d="M422 160 L500 138 L578 160 L500 182 Z" fill="url(#astar-corr)" stroke="rgba(93,162,255,0.6)" strokeWidth="1.5" />
        <line x1="422" y1="160" x2="578" y2="160" stroke="var(--path, #62d98a)" strokeWidth="2.5" strokeDasharray="6 5" />
        <circle cx="96" cy="176" r="6" fill="#62d98a" />
        <circle cx="256" cy="176" r="6" fill="#e06767" />
        <circle cx="422" cy="160" r="6" fill="#62d98a" />
        <circle cx="578" cy="160" r="6" fill="#e06767" />
        <text x="76" y="288" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="12">
          25,255 cells settled
        </text>
        <text x="430" y="288" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="12">
          161 cells settled
        </text>
        <text x="84" y="196" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">start</text>
        <text x="244" y="196" fill="#e06767" fontFamily="ui-monospace, monospace" fontSize="11">goal</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'astar_manhattan.py',
  Viz: AStarViz,
  narration,
};
