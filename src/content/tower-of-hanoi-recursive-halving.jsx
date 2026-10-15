import HanoiViz from '../viz/HanoiViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/tower_of_hanoi_recursive_halving.py?raw';
import { narration } from './tower-of-hanoi-recursive-halving.narration.js';

export const content = {
  given:
    'n disks of distinct sizes stacked on one of three pegs, largest at the bottom. Move the whole tower to another peg, one disk at a time, never placing a larger disk on a smaller one, in as few moves as possible, and know that the count is as few as possible.',
  task: 'Tower of Hanoi. The algorithm is the recursion: to move n disks from the source to the target, move the top n − 1 to the spare peg, move the largest disk to the target, then move the n − 1 from the spare onto it. The heuristic is the halving the recursion embodies: the largest disk moves exactly once, in the middle, and both halves of the plan are the same problem one disk smaller, so T(n) = 2T(n − 1) + 1 = 2ⁿ − 1, and the count is optimal because the largest disk cannot move until the other n − 1 are stacked on the one peg it is not on, which already costs T(n − 1), and they must come off again afterward. The same sequence falls out of an iterative rule, of binary counting, and of the Gray code.',
  constraint:
    'Measured by replaying every move on simulated pegs: the recursion produces exactly 2ⁿ − 1 legal moves for every n from 1 to 20 (1,048,575 at n = 20) and the tower arrives. Breadth-first search over the whole state graph (3ⁿ states, 6,561 at n = 8) confirms the optimum is 2ⁿ − 1 for n = 1 to 8 and that the recursive sequence is a shortest path at every one of its steps. The iterative rule (the smallest disk cycles one peg on every odd move, the only other legal move on every even move) reproduces the recursion move for move for n = 1 to 12; the disk moved at step k is one plus the trailing zeros of k, and the disks moved an odd number of times after k moves spell the reflected binary Gray code of k, for every k below 4,096. With four pegs the Frame-Stewart recursion uses 1, 3, 5, 9, 13, 17, 25, 33 moves for n = 1 to 8, equal to the breadth-first optimum over 4ⁿ states at every n (33 against 255 on three pegs). A random legal walk that never undoes its last move needs 5,780 moves on average at n = 6 (1,063 to 17,148 over 20 trials) against 63.',

  origins: (
    <p>
      Édouard Lucas published the puzzle in <strong>1883</strong> under the
      anagram &quot;N. Claus de Siam,&quot; with the legend of the temple
      priests and sixty-four golden disks whose 2⁶⁴ − 1 moves would outlast
      the world; the recursive solution and the optimality argument are
      in every discrete mathematics course since. Frame and Stewart gave
      the four-peg algorithm in the American Mathematical Monthly in{' '}
      <strong>1941</strong>, as answers to a problem posed by Stewart in
      1939; whether it was optimal stayed open for seventy years until
      Thierry Bousch proved it in 2014 (Bulletin of the Belgian
      Mathematical Society). The binary and Gray-code structure of the move
      sequence (Buneman and Levy 1980; Hinz&apos;s 1989 survey) ties the
      puzzle to the ruler sequence and to the hypercube, and the Hanoi
      state graph is the Sierpiński triangle, a standard example in
      textbooks on recursion, on amortized analysis, and on
      self-similarity.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>plan</strong>: three lines of recursion that emit
      the moves in order with no search and no memory beyond the call
      stack, O(1) work per move. The referee is twofold: every move of
      every sequence is replayed on simulated pegs and checked for legality
      (the top disk of its source, onto a larger disk or an empty peg), and
      breadth-first search over the full state graph finds the true
      optimum for n up to 8. The recursion&apos;s{' '}
      <strong>2ⁿ − 1 moves</strong> are that optimum, and the state after
      its k-th move sits at distance exactly k from the start: it never
      wastes a step.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>count and the shape</strong>: because the largest
      disk moves once, in the middle, and both halves are the same problem
      one disk smaller, the sequence is self-similar. Measured against
      three other descriptions of it: the iterative rule reproduces it move
      for move to n = 12; the disk moved at step k is{' '}
      <strong>one plus the trailing zeros of k</strong>; and after k moves
      the set of disks moved an odd number of times is the Gray code of k,
      checked for every k below 4,096. The same halving with a fourth peg
      (Frame-Stewart) cuts 255 moves to 33 at n = 8, and breadth-first
      search over 4ⁿ states confirms every one of those counts.
    </p>
  ),

  picture: (
    <p>
      A removal crew moving a stack of nested crates with one spare bay.
      The foreman never thinks about the whole stack: to move it, clear
      everything off the bottom crate into the spare bay (the same job,
      one crate smaller), roll the bottom crate across, then clear the
      spare bay onto it (the same job again). Nobody writes the plan down;
      the plan is the instruction applied to itself. Watch the crew for a
      while and a pattern shows: the smallest crate moves every other
      time, always in the same direction around the three bays, and in
      between there is only ever one other move worth making.
    </p>
  ),

  steps: [
    <>
      <strong>Base case:</strong> zero disks need zero moves; one disk goes
      straight from source to target.
    </>,
    <>
      <strong>Clear:</strong> move the top n − 1 disks from the source to
      the spare peg (recursively, with the target as their spare).
    </>,
    <>
      <strong>Cross:</strong> move disk n from the source to the target: the
      one move the largest disk ever makes.
    </>,
    <>
      <strong>Rebuild:</strong> move the n − 1 disks from the spare to the
      target (recursively, with the source as their spare).
    </>,
    <>
      <strong>Count:</strong> T(n) = 2T(n − 1) + 1 = 2ⁿ − 1, optimal; or
      iterate: on odd moves the smallest disk steps one peg along its
      cycle, on even moves make the only other legal move.
    </>,
  ],

  signals: [
    <>
      <strong>A problem that contains itself:</strong> the plan for n is two
      plans for n − 1 around one decisive step.
    </>,
    <>
      <strong>Optimality by a counting argument,</strong> not a search: the
      obstacle (the largest disk) can only be cleared one way.
    </>,
    <>
      <strong>Teaching recursion, binary, and Gray codes at once:</strong>{' '}
      three descriptions of one sequence, each checkable against the
      others.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>breadth-first search</strong> over the
      state graph: it finds the same 2ⁿ − 1 with a proof, but by visiting
      all 3ⁿ states, 6,561 at n = 8 and 3.5 billion at n = 20, where the
      recursion writes the 1,048,575 moves down directly.
    </>
  ),

  strength: (
    <>
      <strong>Optimal by construction, in three lines.</strong> 2ⁿ − 1 legal
      moves for every n to 20, a shortest path at every step against
      breadth-first search to n = 8, and the same sequence recovered by an
      iterative rule, by binary counting, and by the Gray code.
    </>
  ),
  weakness: (
    <>
      <strong>Exponential by necessity, and three pegs only.</strong> 2ⁿ − 1
      is the floor, not a flaw of the method, but at n = 64 it is the
      legend&apos;s end of the world; with four pegs the three-peg recursion
      is far from optimal (255 against 33 at n = 8) and the right split k
      must be chosen (Frame-Stewart); and the recursion&apos;s elegance says
      nothing about variants with restricted moves or colored disks.
    </>
  ),

  problem: 'Tower of Hanoi',
  problemSlug: 'tower-of-hanoi',
  rivals: [
    {
      name: 'Tower of Hanoi × Recursive halving',
      isThisUnit: true,
      algoName: 'Tower of Hanoi',
      cost: '2ⁿ − 1 moves; O(n) stack',
      wins: (
        <>
          <strong>Optimal and proven so</strong> by a counting argument; the
          move list emitted with no search; 1,048,575 moves at n = 20 in
          under a second.
        </>
      ),
      costs: (
        <>
          Three pegs; exponential by necessity.
        </>
      ),
      when: 'The classic puzzle, and the first recursion a learner should trace by hand.',
    },
    {
      name: 'Frame-Stewart',
      algoName: 'Frame-Stewart',
      cost: 'split k chosen by a recurrence',
      wins: (
        <>
          Four pegs: 33 moves at n = 8 against 255; equal to the
          breadth-first optimum at every n to 8, and optimal for all n
          (Bousch 2014).
        </>
      ),
      costs: (
        <>
          The split k must be searched; optimality took seventy years to
          prove; still exponential (about 2^√(2n)).
        </>
      ),
      when: 'More than three pegs.',
    },
    {
      name: 'Breadth-first search',
      algoName: 'Breadth-first search',
      cost: '3ⁿ states (4ⁿ with four pegs)',
      wins: (
        <>
          The optimum for any peg count or move restriction, with a proof,
          and the referee on this page: 2ⁿ − 1 confirmed to n = 8.
        </>
      ),
      costs: (
        <>
          6,561 states at n = 8, 3.5 billion at n = 20; it finds what the
          recursion already knows.
        </>
      ),
      when: 'A variant with no closed form: restricted moves, colored disks, or an unusual start.',
    },
    {
      name: 'Gray code generation',
      algoName: 'Gray code generation',
      cost: 'k ^ (k >> 1) per step',
      wins: (
        <>
          The same move sequence from counting: the bit that flips from k −
          1 to k is the disk that moves, checked for every k below 4,096.
        </>
      ),
      costs: (
        <>
          It names the disk, not the peg; the peg still follows from the
          cycle rule.
        </>
      ),
      when: 'You want the k-th move without the first k − 1, or the hypercube view of the puzzle.',
    },
  ],
  neverUse: {
    name: 'A random legal walk, or any search that does not know the recursion',
    why: (
      <>
        Make legal moves at random, never undoing the last one, until the
        tower arrives. At n = 6 that took <strong>5,780 moves on average
        over 20 trials</strong>, between 1,063 and 17,148, against the 63 of
        the recursion; at n = 5, 1,781 against 31. The Hanoi state graph is a
        Sierpiński triangle whose corners are the three towers, and a random
        walker wanders its 3ⁿ states for an expected time that grows faster
        than the optimum by a factor that itself grows with n. Breadth-first
        search does better than wandering but still touches every one of
        the 3ⁿ states to prove what the counting argument gives for free.
      </>
    ),
  },

  contest: {
    instance:
      'move n disks between pegs, n = 3 to 8 (and to 20 for the recursion); referee: every move replayed for legality on simulated pegs, breadth-first search over the complete state graph for the true optimum; one currency: moves made, and states explored for the search',
    columns: ['n = 6 moves', 'n = 8 moves', 'states explored (n = 8)', 'n = 20'],
    rows: [
      {
        method: 'recursion, three pegs',
        isThisUnit: true,
        values: ['63', '255', '0 (no search)', '1,048,575 moves, every one legal'],
        best: 0,
        verdict: 'optimal by construction',
      },
      {
        method: 'breadth-first search, three pegs',
        values: ['63', '255', '6,561', '3.5 billion states'],
        verdict: 'the referee: the same answer with a proof',
      },
      {
        method: 'Frame-Stewart, four pegs',
        values: ['17', '33', '65,536 (to confirm)', 'about 2^√(2n)'],
        verdict: 'a fourth peg changes the game',
      },
      {
        method: 'iterative rule / binary / Gray code',
        values: ['63', '255', '0', 'the same 1,048,575'],
        verdict: 'three descriptions, one sequence',
      },
      {
        method: 'random legal walk (20 trials)',
        values: ['5,780 (1,063 to 17,148)', '·', '·', '·'],
        verdict: 'ninety times the optimum at n = 6',
      },
    ],
    source:
      'python solutions/tower_of_hanoi_recursive_halving.py prints this table and asserts: the recursion yields exactly 2^n - 1 legal moves and delivers the tower for every n from 1 to 20; breadth-first search over all 3^n states finds the optimum 2^n - 1 for n = 1 to 8 with the recursive state after move k at distance k; the iterative rule equals the recursion move for move for n = 1 to 12; the ruler-sequence and Gray-code identities hold for every k below 4,096; the Frame-Stewart four-peg sequence is legal, matches its recurrence, and equals the breadth-first four-peg optimum for n = 1 to 8; and the random walk finishes every trial but needs more than ten times the optimum at n = 6.',
  },

  figure: (
    <Figure
      id="fig-hanoi-sierpinski"
      aspect="16 / 7"
      caption="Left: the state graph for three disks, 27 states drawn as the Sierpiński triangle, with the recursive solution's path from the all-on-source corner to the all-on-target corner highlighted: 7 highlighted legal moves, the largest disk's single move being the step between the two big sub-triangles. Right: moves by n for three pegs (2ⁿ − 1), four pegs (Frame-Stewart, equal to the breadth-first optimum), and the random walk's mean, on a log scale."
      cite={{
        text: 'É. Lucas (as N. Claus), La Tour d’Hanoï, 1883. J. S. Frame and B. M. Stewart, solutions to advanced problem 3918, American Mathematical Monthly 48(3), 1941, pp. 216-219, DOI 10.2307/2304268. T. Bousch, "La quatrième tour de Hanoï," Bulletin of the Belgian Mathematical Society 21(5), 2014.',
        href: 'https://doi.org/10.2307/2304268',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="The 27-state graph of the three-disk puzzle as a Sierpinski triangle with the optimal seven-move path, and a log-scale chart of moves by disk count for three pegs, four pegs, and a random walk">
        {(() => {
          // Sierpinski layout of the 3-disk state graph: state = (peg of largest, middle, smallest)
          const pegVec = [[0, 1], [-0.866, -0.5], [0.866, -0.5]];
          const pos = (state) => {
            let x = 0;
            let y = 0;
            let r = 68;
            for (let i = 0; i < 3; i += 1) {
              x += pegVec[state[i]][0] * r;
              y -= pegVec[state[i]][1] * r;
              r /= 2;
            }
            return [180 + x, 164 + y];
          };
          const states = [];
          for (let a = 0; a < 3; a += 1) for (let b = 0; b < 3; b += 1) for (let c = 0; c < 3; c += 1) states.push([a, b, c]);
          const edges = [];
          const key = (s) => s.join('');
          const seen = new Set();
          for (const s of states) {
            const tops = {};
            for (let i = 0; i < 3; i += 1) tops[s[i]] = i;
            for (const p of Object.keys(tops)) {
              const i = tops[p];
              for (let q = 0; q < 3; q += 1) {
                if (q === Number(p)) continue;
                if (tops[q] === undefined || tops[q] < i) {
                  const t = s.slice();
                  t[i] = q;
                  const k = [key(s), key(t)].sort().join('-');
                  if (!seen.has(k)) {
                    seen.add(k);
                    edges.push([s, t]);
                  }
                }
              }
            }
          }
          // the optimal path: states after each recursive move for n = 3 (source 0, target 2, spare 1)
          const path = [[0, 0, 0], [0, 0, 2], [0, 1, 2], [0, 1, 1], [2, 1, 1], [2, 1, 0], [2, 2, 0], [2, 2, 2]];
          const onPath = new Set();
          for (let i = 0; i + 1 < path.length; i += 1) onPath.add([key(path[i]), key(path[i + 1])].sort().join('-'));
          const bx = 390;
          const by = 230;
          const ns = [3, 4, 5, 6, 7, 8];
          const three = ns.map((n) => 2 ** n - 1);
          const four = [5, 9, 13, 17, 25, 33];
          const walk = [52, 364, 1781, 5780];
          const X = (i) => bx + 20 + i * 42;
          const Y = (v) => by - (Math.log10(v) / 4) * 180;
          return (
            <g>
              {edges.map(([s, t]) => {
                const [x1, y1] = pos(s);
                const [x2, y2] = pos(t);
                const hot = onPath.has([key(s), key(t)].sort().join('-'));
                return <line key={key(s) + key(t)} x1={x1} y1={y1} x2={x2} y2={y2} stroke={hot ? '#62d98a' : '#9aa5bd'} strokeOpacity={hot ? 1 : 0.4} strokeWidth={hot ? 3 : 1} />;
              })}
              {states.map((s) => {
                const [x, y] = pos(s);
                const isStart = key(s) === '000';
                const isGoal = key(s) === '222';
                return <circle key={key(s)} cx={x} cy={y} r={isStart || isGoal ? 5 : 3} fill={isStart ? '#5da2ff' : isGoal ? '#62d98a' : '#9aa5bd'} />;
              })}
              <text x="30" y="22" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">27 states of three disks; green: the 7 optimal moves</text>
              <text x="30" y="262" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">the big jump between sub-triangles is the largest disk</text>
              <line x1={bx} y1={by} x2={bx + 240} y2={by} stroke="#9aa5bd" strokeOpacity="0.6" />
              <polyline points={three.map((v, i) => `${X(i)},${Y(v)}`).join(' ')} fill="none" stroke="#5da2ff" strokeWidth="2" />
              <polyline points={four.map((v, i) => `${X(i)},${Y(v)}`).join(' ')} fill="none" stroke="#62d98a" strokeWidth="2" />
              <polyline points={walk.map((v, i) => `${X(i)},${Y(v)}`).join(' ')} fill="none" stroke="#e2606c" strokeWidth="2" strokeDasharray="4 3" />
              {ns.map((n, i) => <text key={n} x={X(i) - 3} y={by + 14} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">{n}</text>)}
              {[1, 10, 100, 1000].map((v) => <text key={v} x={bx - 30} y={Y(v) + 3} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">{v}</text>)}
              <text x={bx} y="22" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">moves (log): blue 3 pegs, green 4,</text>
              <text x={bx} y="36" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">red dashed the random walk's mean</text>
              <text x={bx} y="262" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">n=8: 255 vs 33 · n=6 walk: 5,780</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'tower_of_hanoi_recursive_halving.py',
  Viz: HanoiViz,
  narration,
};
