import MCTSViz from '../viz/MCTSViz.jsx';
import code from '../../solutions/mcts_ucb1.py?raw';
import { narration } from './mcts-ucb1.narration.js';

export const content = {
  given: 'A game position and a clock, in a game whose tree outruns any exhaustive search.',
  task: 'Choose a strong move using nothing but fast random playouts and counting.',
  constraint:
    'Double ignorance: you cannot read everything, and no trustworthy mid-game evaluation function exists. All you can do is finish games quickly and count.',

  origins: (
    <p>
      Three threads braid together: Auer, Cesa-Bianchi, and Fischer proved the
      bandit rule&apos;s logarithmic regret (2002); Rémi Coulom coined MCTS in
      his Go program Crazy Stone (2006); Kocsis and Szepesvári ran the bandit
      rule at every tree node as <strong>UCT</strong> (2006). A decade later
      the pair, with a neural network whispering priors, sat inside{' '}
      <strong>AlphaGo</strong>. Computer Go had been stuck for decades; this
      idea unstuck it.
    </p>
  ),

  algoRole: (
    <p>
      A loop of four moves: <strong>select</strong> down the built tree,{' '}
      <strong>expand</strong> one frontier node, <strong>roll out</strong> a
      fast random finish, <strong>backpropagate</strong> the result up the
      path (visits + wins at every node). The tree is a growing memory of what
      the playouts have taught.
    </p>
  ),
  heurRole: (
    <p>
      Answers the loop&apos;s only open question: which child deserves the
      walk. <strong>win rate + c·√(ln N / n)</strong>: greed plus an
      uncertainty bonus that is large for rarely-tried children and near zero
      for well-tried ones. c = 0 makes a glutton; c huge makes a tourist;
      between them sits the balance the bandit theorem blesses.
    </p>
  ),

  picture: (
    <p>
      A food critic, thirty dinners, a hundred restaurants. Pure greed returns
      nightly to the first decent plate and never finds the best kitchen in
      town; pure novelty knows a hundred appetizers and nothing deeply. The
      seasoned critic keeps a notebook of averages adjusted upward by rarity,
      and dines wherever the adjusted score peaks: everywhere early, at the
      genuinely best table by month&apos;s end. The notebook is the tree; the
      adjustment is the bonus; the dinners are the budget.
    </p>
  ),

  steps: [
    <>
      <strong>Select:</strong> from the root, descend to the highest
      win-rate + c·√(ln N / n) child until a node has an untried move.
    </>,
    <>
      <strong>Expand:</strong> play the untried move; add the new position to
      the tree.
    </>,
    <>
      <strong>Roll out:</strong> finish the game with uniformly random moves;
      no wisdom, just speed.
    </>,
    <>
      <strong>Backpropagate:</strong> +1 visit along the path, wins credited
      to the player who just moved at each node.
    </>,
    <>
      <strong>Repeat</strong> for the budget; thousands of simulations.
    </>,
    <>
      <strong>Act:</strong> play the root child with the most visits, the move
      the evidence gathered around.
    </>,
  ],

  signals: [
    <>
      Branching or depth makes exhaustive search <strong>laughable</strong>.
    </>,
    <>
      No reliable evaluation function, but <strong>finishing a random game is
      cheap</strong>: minimax&apos;s situation, inverted.
    </>,
    <>
      The budget is elastic and decisions repeat: an <strong>anytime</strong>{' '}
      search whose tree seeds the next move.
    </>,
  ],
  baseline: (
    <>
      Uniform sampling spreads playouts evenly and wastes most of the budget
      re-proving that bad moves are bad. In the tested solution&apos;s bandit
      oracle (one arm pays 80%, one pays 20%), UCB1 spent{' '}
      <strong>981 of 1,000</strong> pulls on the good arm and still spent 19
      confirming the bad one stayed bad; uniform would have burned 500 there.
    </>
  ),

  strength: (
    <>
      <strong>Scale with grace.</strong> No evaluation function needed; memory
      grows only with nodes you choose to build; the tree grows asymmetrically
      toward lines that matter; every extra simulation helps. This is the
      search that made superhuman Go possible.
    </>
  ),
  weakness: (
    <>
      <strong>Variance and blind tactics.</strong> Random rollouts blur
      razor-sharp positions, so a shallow trap minimax would see instantly can
      slip past playout averages; c needs per-game tuning; and the convergence
      guarantees are asymptotic, promises about the limit rather than
      tonight&apos;s budget.
    </>
  ),

  code,
  filename: 'mcts_ucb1.py',
  Viz: MCTSViz,
  narration,
};
