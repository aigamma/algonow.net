import MinimaxViz from '../viz/MinimaxViz.jsx';
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

  code,
  filename: 'minimax_alphabeta.py',
  Viz: MinimaxViz,
  narration,
};
