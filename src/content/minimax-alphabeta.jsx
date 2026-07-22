import MinimaxViz from '../viz/MinimaxViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/minimax_alphabeta.py?raw';
import { narration } from './minimax-alphabeta.narration.js';

export const content = {
  given:
    'A two-player, zero-sum game of perfect information (tic-tac-toe here; the frame fits checkers and chess).',
  task: 'Choose the move that guarantees the best outcome against a perfect opponent.',
  constraint:
    'The game tree grows as bᵈ. Reading all of it is possible only for toy games, and wasteful even there.',

  origins: (
    <p>
      Von Neumann proved the minimax theorem in 1928; Shannon sketched machine
      chess on it in 1950. Alpha-beta emerged in the late 1950s and was
      analyzed definitively by Knuth and Moore (1975), with a striking result:
      pruning changes <strong>nothing</strong> about the answer and, with
      well-ordered moves, nearly squares the reachable depth. Every strong
      classical engine since, Deep Blue included, was built on this pair.
    </p>
  ),

  algoRole: (
    <p>
      Walks the tree depth-first. Leaves get scores; your turns back up the{' '}
      <strong>max</strong> child, opponent turns the <strong>min</strong>. The
      value reaching the root is the outcome of perfect play; the child that
      delivered it is your move.
    </p>
  ),
  heurRole: (
    <p>
      α carries the best score the maximizer can already force, β the
      minimizer&apos;s. A subtree proved ≥ β (or ≤ α) makes its remaining
      siblings irrelevant: a rational opponent never steers there.{' '}
      <strong>How much gets cut depends entirely on move order</strong>; a
      cheap guess (captures first, center first) is what makes the windows slam
      shut early.
    </p>
  ),

  picture: (
    <p>
      A chess coach at a simultaneous exhibition reads her most promising
      candidate deeply and banks a roughly even line. Second candidate: one
      glance shows it drops a bishop, and she stops instantly, not because she
      read every continuation but because it is already worse than the banked
      line. The banked line is α; the instant dismissal is the cutoff; her
      habit of checking the natural move first is the ordering heuristic.
    </p>
  ),

  steps: [
    <>
      <strong>Terminal?</strong> At a finished position or the depth limit,
      return the score.
    </>,
    <>
      <strong>Order the moves</strong> by the heuristic, best guess first.
    </>,
    <>
      <strong>Search each child</strong> inside the current (α, β) window;
      apply, recurse, undo.
    </>,
    <>
      <strong>Tighten:</strong> max nodes raise α with the running best; min
      nodes lower β.
    </>,
    <>
      <strong>Cutoff:</strong> the instant α ≥ β, stop reading siblings; the
      opponent holds a refutation.
    </>,
    <>
      <strong>Return</strong> the running best upward; at the root, return the
      move that produced it.
    </>,
  ],

  signals: [
    <>
      <strong>Two players alternate</strong> with perfect information and
      zero-sum payoffs.
    </>,
    <>
      A scored <strong>lookahead is feasible</strong> to some depth.
    </>,
    <>
      A cheap guess exists for <strong>which moves are strong</strong>, ready
      to feed the ordering.
    </>,
  ],
  baseline: (
    <>
      Plain minimax reads everything. On the full tic-tac-toe tree, the tested
      solution below visits <strong>549,946</strong> nodes plain,{' '}
      <strong>18,297</strong> with pruning in naive order, and{' '}
      <strong>7,275</strong> with the center-first ordering: 75× less work for
      the provably identical answer.
    </>
  ),

  strength: (
    <>
      <strong>A free lunch.</strong> Identical value, identical move, a
      vanishing fraction of the reading; memory stays O(d) because the walk is
      depth-first. Well ordered, effort drops toward O(b^(d/2)), nearly
      doubling reachable depth.
    </>
  ),
  weakness: (
    <>
      <strong>The frame&apos;s inheritance.</strong> Depth still explodes, so
      real engines stop early and trust an evaluation function whose blind
      spots become theirs; gains hinge on ordering quality; and dice, hidden
      cards, or cooperation each break a load-bearing assumption.
    </>
  ),

  problem: 'Game-tree search',
  rivals: [
    {
      name: 'Plain minimax',
      cost: 'O(bᵈ)',
      wins: (
        <>
          The definition itself: correct, obvious, and the oracle every other
          method on this page is checked against.
        </>
      ),
      costs: (
        <>
          Reads everything. <strong>549,946 nodes</strong> for a game a child
          finishes in a minute, and the number is a power, not a multiple.
        </>
      ),
      when: 'Teaching the idea, or writing the reference implementation you test the fast one against.',
    },
    {
      name: 'Alpha-beta, natural order',
      cost: 'O(b^(3d/4)) with random ordering',
      wins: (
        <>
          Same value, same move, <strong>3.3 percent of the reading</strong>,
          and it needs no domain knowledge whatsoever.
        </>
      ),
      costs: <>Leaves most of the available saving on the table, because cutoffs fire late.</>,
      when: 'You have no idea which moves are good, which is a perfectly honest position to be in.',
    },
    {
      name: 'Alpha-beta, center-first order',
      isThisUnit: true,
      cost: 'O(b^(d/2)) with perfect ordering',
      wins: (
        <>
          Strong moves first make windows collapse early:{' '}
          <strong>7,275 nodes, 1.3 percent of plain</strong>, from one line of
          domain knowledge about where good moves live.
        </>
      ),
      costs: (
        <>
          The ordering is a guess about the game. A wrong guess costs the
          sorting work and returns nothing.
        </>
      ),
      when: 'You can cheaply rank moves before searching them, which is nearly always.',
    },
    {
      name: 'Alpha-beta + transposition table',
      cost: 'O(distinct positions), plus memory for the table',
      wins: (
        <>
          The same position arrives by many move orders. Remembering it once
          reaches <strong>1,981 nodes, 0.4 percent of plain</strong>: a{' '}
          <strong>278× saving</strong> over the baseline, and it composes with
          ordering rather than competing.
        </>
      ),
      costs: (
        <>
          Memory, plus the trap this page hit while being written: a value
          proven under a narrow window is a <strong>bound</strong>, not the
          answer. Store it as exact and the search silently returns +1 for a
          drawn game.
        </>
      ),
      when: 'Positions repeat, which they do in every board game with move transpositions.',
    },
    {
      name: 'Monte Carlo tree search',
      cost: 'O(k · d) for k playouts',
      wins: <>Needs no evaluation function, and scales to trees no exact method can touch.</>,
      costs: <>Returns a statistic, not a proof, and needs many playouts to be confident.</>,
      when: 'The tree is too big to solve and you have no good evaluation function. See puzzle 06.',
    },
  ],
  neverUse: {
    name: 'Monte Carlo tree search, here specifically',
    why: (
      <>
        Tic-tac-toe has <strong>5,478 reachable positions</strong> and an
        exact answer that alpha-beta with a table proves in{' '}
        <strong>1,981 node visits</strong>. Running playouts instead trades a{' '}
        <strong>proof for a sample</strong>: thousands of simulations to
        become fairly confident of a fact you could have settled with
        certainty in milliseconds. The rule generalizes past this board. When
        a game is small enough to solve, sampling it is not humility, it is
        throwing away the guarantee you had for free.
      </>
    ),
  },

  contest: {
    instance: 'the empty tic-tac-toe board with X to move, searched to the end of the game',
    columns: ['nodes visited', 'share of plain', 'value'],
    rows: [
      {
        method: 'Plain minimax',
        values: ['549,946', '100%', 'draw'],
        verdict: 'the oracle: correct and unaffordable',
      },
      {
        method: 'Alpha-beta, natural order',
        values: ['18,297', '3.3%', 'draw'],
        verdict: 'same answer for 1/30th of the reading',
      },
      {
        method: 'Alpha-beta, center-first',
        isThisUnit: true,
        values: ['7,275', '1.3%', 'draw'],
        verdict: 'ordering alone halves it again',
      },
      {
        method: 'Alpha-beta + transposition table',
        values: ['1,981', '0.4%', 'draw'],
        best: 0,
        verdict: '278× fewer nodes than plain, and it stacks with ordering',
      },
    ],
    source:
      'python solutions/minimax_alphabeta.py prints this table and asserts every method returns the identical value. Speed may differ; the answer may not.',
  },

  figure: (
    <Figure
      id="fig-ab-cutoff"
      aspect="16 / 8"
      caption="What a cutoff actually refuses to read. The maximizer has already secured 3 on its first branch. Exploring the second branch, the minimizer finds a reply worth 2. Since the minimizer can hold this branch to 2 or less, and 3 is already banked, every remaining sibling under that node is irrelevant: no value they hold can change the choice above. The search stops mid-branch, and the greyed subtree is never generated at all."
      cite={{
        text: 'After Knuth and Moore, "An Analysis of Alpha-Beta Pruning", Artificial Intelligence 6(4), 1975, which formalized a technique in informal use since the late 1950s.',
        href: 'https://doi.org/10.1016/0004-3702(75)90019-3',
      }}
    >
      <svg viewBox="0 0 640 320" role="img" aria-label="A game tree where a subtree is pruned after a cutoff">
        <line x1="320" y1="52" x2="180" y2="140" stroke="#5da2ff" strokeWidth="2" />
        <line x1="320" y1="52" x2="460" y2="140" stroke="#5da2ff" strokeWidth="2" />
        <line x1="180" y1="140" x2="120" y2="232" stroke="#2b5fa8" strokeWidth="1.6" />
        <line x1="180" y1="140" x2="240" y2="232" stroke="#2b5fa8" strokeWidth="1.6" />
        <line x1="460" y1="140" x2="400" y2="232" stroke="#2b5fa8" strokeWidth="1.6" />
        <line x1="460" y1="140" x2="520" y2="232" stroke="#232c40" strokeWidth="1.6" strokeDasharray="5 4" />
        <line x1="460" y1="140" x2="580" y2="232" stroke="#232c40" strokeWidth="1.6" strokeDasharray="5 4" />
        <circle cx="320" cy="52" r="17" fill="#0d1119" stroke="#5da2ff" strokeWidth="2" />
        <text x="320" y="57" textAnchor="middle" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="13">max</text>
        <circle cx="180" cy="140" r="17" fill="#0d1119" stroke="#f0b94b" strokeWidth="2" />
        <text x="180" y="145" textAnchor="middle" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="13">min</text>
        <circle cx="460" cy="140" r="17" fill="#0d1119" stroke="#f0b94b" strokeWidth="2" />
        <text x="460" y="145" textAnchor="middle" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="13">min</text>
        <rect x="102" y="216" width="36" height="32" rx="6" fill="#0d1119" stroke="#62d98a" strokeWidth="1.6" />
        <text x="120" y="238" textAnchor="middle" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="13">3</text>
        <rect x="222" y="216" width="36" height="32" rx="6" fill="#0d1119" stroke="#62d98a" strokeWidth="1.6" />
        <text x="240" y="238" textAnchor="middle" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="13">5</text>
        <rect x="382" y="216" width="36" height="32" rx="6" fill="#0d1119" stroke="#e06767" strokeWidth="1.6" />
        <text x="400" y="238" textAnchor="middle" fill="#e06767" fontFamily="ui-monospace, monospace" fontSize="13">2</text>
        <rect x="502" y="216" width="36" height="32" rx="6" fill="none" stroke="#232c40" strokeWidth="1.4" strokeDasharray="4 4" />
        <text x="520" y="238" textAnchor="middle" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="13" opacity="0.45">?</text>
        <rect x="562" y="216" width="36" height="32" rx="6" fill="none" stroke="#232c40" strokeWidth="1.4" strokeDasharray="4 4" />
        <text x="580" y="238" textAnchor="middle" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="13" opacity="0.45">?</text>
        <text x="352" y="46" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="12">α = 3 banked</text>
        <text x="404" y="286" fill="#e06767" fontFamily="ui-monospace, monospace" fontSize="12">2 ≤ 3 → cut</text>
        <text x="500" y="300" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="12" opacity="0.7">never generated</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'minimax_alphabeta.py',
  Viz: MinimaxViz,
  narration,
};
