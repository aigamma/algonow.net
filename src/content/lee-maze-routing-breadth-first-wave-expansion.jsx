import LeeRouterViz from '../viz/LeeRouterViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/lee_maze_routing_breadth_first_wave_expansion.py?raw';
import { narration } from './lee-maze-routing-breadth-first-wave-expansion.narration.js';

export const content = {
  given:
    'A routing grid: a source pin, a target pin, obstacle cells (macros, pins of other nets, wires already placed), and the rule that a wire moves one cell at a time through free cells. This is detailed routing on a chip or a printed circuit board, and it is also every maze: connect two cells with a valid path, preferably the shortest, and know for certain when no path exists.',
  task: 'Lee maze routing. The algorithm is Lee’s 1961 router: expand a wave from the source, one ring at a time, labeling every reached cell with its distance, until the wave touches the target; then retrace from the target through labels D − 1, D − 2, … , 0 to recover a shortest path. The heuristic is the wave itself, breadth-first expansion: because the wave visits cells in order of distance, every label is exact, the first touch of the target is a shortest path, and a wave that dies before reaching the target is a proof that no path exists. The price is that the wave labels every cell within distance D, which can be the whole grid.',
  constraint:
    'Measured on 277 nets across 60 × 60 grids with 22 percent random obstacles and three walls (mean shortest path 49.2 cells): every Lee path equals the distance found by an independent breadth-first search from the target and is valid cell by cell; A* with the Manhattan heuristic and Hadlock’s detour-number search return the same length on every net, Akers’s two-bit coding retraces the same length, and Soukup’s line probe is longer on 123 of 277 (3.6 percent extra on average). Cells touched per net: Lee 935 (26 percent of the grid), A* 338 expanded and 383 labeled at peak, Hadlock 316, Soukup 467. On 150 walled grids the wave routed all 46 connected pairs at the shortest length and reported all 104 disconnected pairs after labeling exactly the reachable region. Routing 40 two-pin nets in sequence on 8 grids: short nets first completed 19.2 of 40, long first 13.2, random 16.1, short first with rip-up and reroute 21.1 (10.9 rip-ups). A greedy straight-line router failed on 231 of 277 nets and was 13.2 percent longer when it succeeded. 3.0 s.',

  origins: (
    <p>
      E. F. Moore described the shortest path through a maze in 1959; C. Y. Lee
      turned it into a router at Bell Labs in <strong>1961</strong>, with the
      wave expansion, the retrace, and the proof that the first touch is
      shortest and a dead wave means no path. Memory was the cost: a label per
      cell on a board of a quarter million cells. S. B. Akers (1967) cut it to
      two bits per cell with the coding 1, 1, 2, 2, 1, 1, 2, 2, whose values
      two steps apart always differ, so the retrace still knows which way is
      back. Mikami and Tabuchi (1968) and Hightower (1969) replaced the wave
      with line probes; Rubin (1974) brought A* to routing; Hadlock (1977)
      counted detours instead of distance; Soukup (1978) ran a line probe and
      fell back to a wave only when blocked. Every detailed router since, down
      to PathFinder’s negotiated congestion (McMurchie and Ebeling 1995), keeps
      a maze router at its core.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>completeness</strong> and the <strong>retrace</strong>.
      The wave is a search that cannot miss: if the target is reachable the
      ring that contains it eventually arrives, and if the wave dies first,
      no path exists. Measured on 150 walled grids: <strong>46</strong>{' '}
      connected pairs routed, <strong>104</strong> disconnected pairs refused,
      each refusal after labeling exactly the reachable region, with no case
      in either direction misjudged. The retrace is the receipt: from the
      target, step to any neighbor labeled one less, and the path falls out
      in D steps without any search.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>optimality</strong>. Breadth-first order means every
      label equals the true distance, so the path is shortest by
      construction: on all 277 nets Lee’s length matched an independent
      breadth-first search from the target, and A* and Hadlock agreed. The
      price is the ring: <strong>935 cells labeled per net</strong> against
      338 expanded by A* and 316 by Hadlock, 12 bits of label per cell on a
      60 × 60 grid against Akers’s 2, and about half a millisecond per net
      against three tenths for A* in the same interpreter.
    </p>
  ),

  picture: (
    <p>
      Picture pouring water into the source cell of a dry maze. The water
      spreads one cell outward each second, into every free cell it can
      reach, so the moment it wets the target you know exactly how many
      seconds it took, and that nothing could have been faster. Now walk back
      from the target, always stepping onto a cell that got wet one second
      earlier: you arrive at the source along a shortest route without ever
      choosing wrong. The cost is the puddle: the whole flooded region had to
      be wetted to find one path.
    </p>
  ),

  steps: [
    <>
      <strong>Label the source 0</strong> and put it in the frontier.
    </>,
    <>
      <strong>Expand one ring:</strong> every unlabeled free neighbor of the
      frontier gets label d + 1 and joins the next frontier.
    </>,
    <>
      <strong>Stop</strong> when the target is labeled, or when the frontier
      is empty (no path exists; the labeled set is the reachable region).
    </>,
    <>
      <strong>Retrace:</strong> from the target, step to any neighbor labeled
      one less, preferring to go straight, until the source.
    </>,
    <>
      <strong>Clear the labels</strong> (or store Akers’s two-bit codes) and
      mark the path as an obstacle for the next net.
    </>,
  ],

  signals: [
    <>
      <strong>Grid or unit-cost graph, one net at a time:</strong> wires on a
      routing layer, a robot on a tile map, any maze.
    </>,
    <>
      <strong>You need a proof, not a guess:</strong> shortest when a path
      exists, a definite no when it does not.
    </>,
    <>
      <strong>Memory is cheap and the grid is bounded:</strong> the wave may
      label most of it before the target appears.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>Soukup’s line probe</strong>: run
      straight at the target and wave only when blocked, 467 cells touched
      per net but a longer path on 123 of 277.
    </>
  ),

  strength: (
    <>
      <strong>Complete and exact with no heuristic to tune.</strong> 277 of 277
      shortest, 104 of 104 impossibilities proven, and the retrace needs no
      search at all.
    </>
  ),
  weakness: (
    <>
      <strong>It floods.</strong> 935 cells per net where A* expands 338 and
      Hadlock labels 316; one net at a time, so order and rip-up decide how
      many nets complete.
    </>
  ),

  problem: 'Detailed routing',
  problemSlug: 'chip-routing',
  rivals: [
    {
      name: 'Lee maze routing × Breadth-first wave expansion',
      isThisUnit: true,
      algoName: 'Lee maze routing',
      cost: 'O(cells within distance D) per net; a label per cell',
      wins: (
        <>
          <strong>Shortest on 277 of 277, complete on 150 of 150</strong>; the
          retrace is free and Akers’s coding fits the labels in 2 bits.
        </>
      ),
      costs: (
        <>
          935 cells labeled per net, 26 percent of the grid; nets routed one
          at a time with no view of congestion.
        </>
      ),
      when: 'Any grid routing or maze where you must know the path is shortest and the refusal is final.',
    },
    {
      name: 'A* search × Manhattan heuristic',
      algoName: 'A* search',
      cost: 'O(expanded cells log) with a heap; open and closed lists',
      wins: (
        <>
          Same shortest length on every net at <strong>338 expansions</strong>{' '}
          and 383 labeled at peak, 41 percent of Lee’s footprint.
        </>
      ),
      costs: (
        <>
          A heap and a heuristic to keep admissible; on obstacle-free stretches
          it narrows to a line, in mazes it widens back toward the wave.
        </>
      ),
      when: 'The target is far, the grid is wide, and memory or time per net matters more than simplicity.',
    },
    {
      name: 'Line-probe routing × Escape-line intersection',
      algoName: 'Line-probe routing',
      cost: 'O(probe segments) in open space; a wave only when stuck',
      wins: (
        <>
          Soukup’s hybrid touched <strong>467 cells</strong> per net and found a
          path on every routable net, with far less memory than labels.
        </>
      ),
      costs: (
        <>
          Not shortest: longer on 123 of 277 nets, 3.6 percent extra on
          average; the wave phase is Lee’s algorithm wearing a hat.
        </>
      ),
      when: 'Sparse boards with long straight runs, where most nets never meet an obstacle.',
    },
    {
      name: 'Rip-up and reroute × Congestion-driven reordering',
      algoName: 'Rip-up and reroute',
      cost: 'several Lee routes per contested net, bounded by a rip-up budget',
      wins: (
        <>
          Lifted completion from 19.2 to <strong>21.1 of 40 nets</strong> with
          10.9 rip-ups per grid, by moving earlier nets out of a blocked net’s way.
        </>
      ),
      costs: (
        <>
          Re-routes, rollbacks, and an ordering policy on top of the router;
          the first version without rollback completed fewer nets than none.
        </>
      ),
      when: 'Many nets contend for the same channels and the maze router alone leaves some unrouted.',
    },
  ],
  neverUse: {
    name: 'A greedy straight-line router, or any probe that never backs up, on a maze',
    why: (
      <>
        Step toward the target, turn at obstacles, never revisit: it looks like
        a router and it is cheap. On the 277 nets it <strong>failed on 231</strong>,
        walking into a pocket behind a wall with every neighbor used, and on
        the 46 nets it did finish its path was 13.2 percent longer than the
        shortest. Lee’s wave touched more cells, 935 against a few dozen, but
        it never failed and never returned a longer path. When a wall stands
        between the pins, a search that cannot back up is not a search; the
        breadth-first wave is the cheapest thing that is one.
      </>
    ),
  },

  contest: {
    instance:
      '277 two-pin nets on 60 × 60 grids with 22 percent obstacles and three walls (mean shortest path 49.2 cells), shortest length by an independent breadth-first search; 150 walled grids for completeness; 8 grids × 40 nets for sequential routing',
    columns: ['cells touched per net', 'shortest?', 'complete?', 'memory per cell'],
    rows: [
      {
        method: 'Lee wave expansion',
        isThisUnit: true,
        values: ['935', 'yes, 277 of 277', 'yes, 150 of 150', '12-bit label, or 2 bits (Akers)'],
        best: 1,
        verdict: 'exact and complete, at the price of the flood',
      },
      {
        method: 'A* with Manhattan heuristic',
        values: ['338 expanded, 383 peak', 'yes, 277 of 277', 'yes', 'open and closed lists'],
        verdict: 'same answer, 41 percent of the footprint',
      },
      {
        method: 'Hadlock detour numbers',
        values: ['316', 'yes, 277 of 277', 'yes', 'detour count per cell'],
        verdict: 'the leanest exact wave here',
      },
      {
        method: 'Soukup line probe plus wave',
        values: ['467', 'no: longer on 123 of 277, +3.6%', 'yes', 'probe trail'],
        verdict: 'fast in the open, not shortest',
      },
      {
        method: 'greedy straight line, no backtracking',
        values: ['a few dozen', 'no: +13.2% when it finished', 'no: failed 231 of 277', 'none'],
        verdict: 'the negative example',
      },
    ],
    source:
      'python solutions/lee_maze_routing_breadth_first_wave_expansion.py prints these tables and asserts: every Lee path is valid and equals the independent breadth-first distance on all 277 nets; A*, Hadlock, and the Akers two-bit retrace return the same length on every net and Soukup never a shorter one; Hadlock’s length equals Manhattan distance plus twice its detour count; on 150 walled grids Lee succeeds exactly when a flood fill says the pins are connected and otherwise labels exactly the reachable region; A* and Hadlock touch fewer cells than Lee; short-first ordering completes at least as many nets as long-first and rip-up at least as many as short-first.',
  },

  figure: (
    <Figure
      id="fig-lee-wave"
      aspect="16 / 7"
      caption="Left: cells touched per net by each router on the same 277 nets (shortest path 49 cells on average); only the three exact methods keep the shortest length. Right: a wave on a small maze. Labels are distances from S; the wall forces the wave around through the gap; the first ring to reach T has label 9, and the retrace (green) steps 8, 7, … back to S."
      cite={{
        text: 'C. Y. Lee, "An algorithm for path connections and its applications," IRE Transactions on Electronic Computers EC-10(3), 1961. S. B. Akers, "A modification of Lee\'s path connection algorithm," IEEE Transactions on Electronic Computers EC-16(1), 1967. F. O. Hadlock, "A shortest path algorithm for grid graphs," Networks 7(4), 1977. J. Soukup, "Fast maze router," DAC 1978.',
        href: 'https://doi.org/10.1109/TEC.1961.5219222',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="Bar chart of cells touched per net for Lee, Soukup, A*, and Hadlock beside a small maze grid labeled with wave distances and the retraced shortest path">
        {(() => {
          const bars = [['Lee', 935, '#5da2ff', 'shortest'], ['Soukup', 467, '#9aa5bd', 'longer on 123'], ['A*', 338, '#f0b94b', 'shortest'], ['Hadlock', 316, '#62d98a', 'shortest']];
          const y = (v) => 230 - v * 0.2;
          const rows = ['S..#......', '...#......', '...#......', '...#..##..', '.....T##..', '...#......'];
          const R = rows.length;
          const C = rows[0].length;
          const blocked = new Set();
          let src = 0;
          let dst = 0;
          rows.forEach((row, r) => [...row].forEach((ch, c) => {
            if (ch === '#') blocked.add(r * C + c);
            if (ch === 'S') src = r * C + c;
            if (ch === 'T') dst = r * C + c;
          }));
          const dist = new Map([[src, 0]]);
          const queue = [src];
          for (let i = 0; i < queue.length; i += 1) {
            const cur = queue[i];
            const r = Math.floor(cur / C);
            const c = cur % C;
            [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => {
              const nr = r + dr;
              const nc = c + dc;
              const q = nr * C + nc;
              if (nr < 0 || nr >= R || nc < 0 || nc >= C || blocked.has(q) || dist.has(q)) return;
              dist.set(q, dist.get(cur) + 1);
              queue.push(q);
            });
          }
          const D = dist.get(dst);
          const path = new Set([dst]);
          let cur = dst;
          while (cur !== src) {
            const r = Math.floor(cur / C);
            const c = cur % C;
            const next = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dr, dc]) => (r + dr) * C + c + dc).find((q) => Math.floor(q / C) >= 0 && Math.floor(q / C) < R && dist.get(q) === dist.get(cur) - 1);
            path.add(next);
            cur = next;
          }
          const cx = (c) => 352 + c * 27;
          const cy = (r) => 40 + r * 27;
          return (
            <g fontFamily="ui-monospace, monospace">
              <text x="20" y="22" fill="#9aa5bd" fontSize="10">cells touched per net, 277 nets, shortest path 49 on average</text>
              {bars.map(([name, v, color, note], i) => (
                <g key={name}>
                  <rect x={40 + i * 70} y={y(v)} width="44" height={230 - y(v)} fill={color} fillOpacity="0.85" />
                  <text x={36 + i * 70} y={y(v) - 5} fill={color} fontSize="10">{v}</text>
                  <text x={36 + i * 70} y="246" fill="#9aa5bd" fontSize="9">{name}</text>
                  <text x={36 + i * 70} y="258" fill={note === 'shortest' ? '#62d98a' : '#e2606c'} fontSize="8">{note}</text>
                </g>
              ))}
              <text x="20" y="274" fill="#9aa5bd" fontSize="10">the wave labels every cell within distance D: 26 percent of a 60 x 60 grid here</text>
              <text x="352" y="22" fill="#9aa5bd" fontSize="10">one wave, labels = distance from S; the gap in the wall is the only way through</text>
              {rows.map((row, r) => [...row].map((ch, c) => {
                const k = r * C + c;
                const d = dist.get(k);
                const fill = blocked.has(k) ? '#9aa5bd' : path.has(k) ? '#62d98a' : d === undefined ? 'none' : '#5da2ff';
                const op = blocked.has(k) ? 0.5 : path.has(k) ? 0.9 : d === undefined ? 1 : 0.2 + 0.6 * (d / D);
                return (
                  <g key={k}>
                    <rect x={cx(c)} y={cy(r)} width="25" height="25" fill={fill} fillOpacity={op} stroke="#9aa5bd" strokeOpacity="0.3" />
                    {!blocked.has(k) && d !== undefined && (
                      <text x={cx(c) + 12.5} y={cy(r) + 17} fill={path.has(k) ? '#0b1020' : '#e9edf6'} fontSize="10" textAnchor="middle">{k === src ? 'S' : k === dst ? 'T' : d}</text>
                    )}
                  </g>
                );
              }))}
              <text x="352" y="228" fill="#62d98a" fontSize="10">T labeled {D}: the first ring to arrive, so {D} steps is shortest; retrace {D - 1}, {D - 2}, … to S</text>
              <text x="352" y="246" fill="#f0b94b" fontSize="10">{dist.size} of {R * C - blocked.size} free cells labeled to route one net of {D} steps</text>
              <text x="352" y="264" fill="#9aa5bd" fontSize="10">an empty frontier before T would prove that no path exists</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'lee_maze_routing_breadth_first_wave_expansion.py',
  Viz: LeeRouterViz,
  narration,
};
