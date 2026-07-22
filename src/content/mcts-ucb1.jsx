import MCTSViz from '../viz/MCTSViz.jsx';
import Figure from '../components/Figure.jsx';
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

  problem: 'Spending a fixed budget of trials on options of unknown value',
  rivals: [
    {
      name: 'UCB1',
      isThisUnit: true,
      cost: 'O(k) per pull, no parameters to tune beyond c',
      wins: (
        <>
          Robustness. Its worst run of 40 was <strong>66.6 regret</strong>{' '}
          against greedy&apos;s <strong>149.7</strong>, and it needs no
          knowledge of the horizon, the gaps, or the payoff scale.
        </>
      ),
      costs: (
        <>
          It over-explores at short horizons.{' '}
          <strong>Fourth of five on mean regret</strong> in the table below,
          because the bonus term keeps sampling arms it has nearly ruled out.
        </>
      ),
      when: 'You cannot tune, cannot repeat the experiment, and care about the bad night more than the average one.',
    },
    {
      name: 'Epsilon-greedy',
      cost: 'O(k) per pull, one parameter',
      wins: (
        <>
          <strong>Best mean regret on this bench, 23.8</strong>, half of
          UCB1&apos;s, from four lines of code.
        </>
      ),
      costs: (
        <>
          That epsilon was tuned to this problem. It also explores at a fixed
          rate forever, paying the same tax at pull ten thousand as at pull
          ten.
        </>
      ),
      when: 'You can tune on representative data, and the environment will not shift under you.',
    },
    {
      name: 'Thompson sampling',
      cost: 'O(k) per pull, one posterior per arm',
      wins: (
        <>
          <strong>27.9 mean regret</strong> with no tuning at all, and it
          degrades gracefully: exploration falls out of the posterior rather
          than a schedule.
        </>
      ),
      costs: <>Needs a prior and a conjugate model, so non-Bernoulli payoffs take real work.</>,
      when: 'Almost always, in practice, when the payoff model is tractable.',
    },
    {
      name: 'Greedy',
      cost: 'O(k) per pull',
      wins: <>Maximum exploitation, and it beat uniform sampling on average.</>,
      costs: (
        <>
          <strong>Worst run 149.7</strong>, three times its own average: one
          unlucky early sample on the best arm and it never plays that arm
          again. The variance is the whole problem.
        </>
      ),
      when: 'Never alone. It is the control that shows why an exploration term exists.',
    },
    {
      name: 'Uniform sampling',
      cost: 'O(1) per pull',
      wins: <>Learns the most about every arm, and its regret has no variance at all.</>,
      costs: (
        <>
          <strong>75.0 regret, the worst mean here</strong>: it keeps paying
          full price for arms it has already established are bad.
        </>
      ),
      when: 'You want unbiased estimates of every option, not the best return. That is measurement, not decision-making.',
    },
  ],
  neverUse: {
    name: 'UCB1 with a horizon of one',
    why: (
      <>
        The exploration bonus is a statement about how much you still stand
        to learn, which is worth exactly nothing on the last pull. Any policy
        that will never act on the information again should be{' '}
        <strong>purely greedy</strong>. The mistake generalizes: the size of
        an exploration term should scale with the remaining opportunity to
        use what it buys, which is precisely why UCB1 loses to a tuned
        epsilon-greedy over 1,000 pulls and would win it back over a million.
      </>
    ),
  },

  contest: {
    instance:
      'four Bernoulli arms paying 0.50, 0.55, 0.60 and 0.45, a budget of 1,000 pulls, averaged over 40 independent runs with identical seeds per policy',
    columns: ['mean regret', 'worst run'],
    rows: [
      {
        method: 'Uniform sampling',
        values: ['75.0', '75.0'],
        verdict: 'no variance, and the worst average: measurement, not decision',
      },
      {
        method: 'Greedy',
        values: ['54.7', '149.7'],
        verdict: 'fine on a good night, catastrophic on a bad one',
      },
      {
        method: 'Epsilon-greedy (0.1)',
        values: ['23.8', '56.4'],
        best: 0,
        verdict: 'best mean here, with an epsilon tuned to this problem',
      },
      {
        method: 'UCB1',
        isThisUnit: true,
        values: ['48.7', '66.6'],
        verdict: 'fourth on average, second on robustness, and tuned to nothing',
      },
      {
        method: 'Thompson sampling',
        values: ['27.9', '62.4'],
        verdict: 'near the best mean with no tuning at all',
      },
    ],
    source:
      'python solutions/mcts_ucb1.py prints this table and asserts both directions: UCB1 must beat uniform and greedy, and it must lose to tuned epsilon-greedy and Thompson at this horizon. Regret is reward forgone against always playing the best arm, so lower is better.',
  },

  figure: (
    <Figure
      id="fig-ucb1-terms"
      aspect="16 / 8"
      caption="The two halves of the formula, and why the balance shifts on its own. Exploitation is the arm's observed average, which settles as evidence accumulates. Exploration is a confidence width that shrinks as the square root of visits, so a rarely-tried arm keeps a large bonus and a heavily-tried one loses it. Nobody schedules the transition from exploring to exploiting; it falls out of the arithmetic."
      cite={{
        text: 'UCB1: Auer, Cesa-Bianchi and Fischer, "Finite-time Analysis of the Multiarmed Bandit Problem", Machine Learning 47, 2002. Applied to trees as UCT by Kocsis and Szepesvari, 2006.',
        href: 'https://doi.org/10.1023/A:1013689704352',
      }}
    >
      <svg viewBox="0 0 640 320" role="img" aria-label="Exploitation flat and exploration decaying with the number of visits">
        <line x1="66" y1="256" x2="612" y2="256" stroke="#232c40" strokeWidth="1.5" />
        <line x1="66" y1="40" x2="66" y2="256" stroke="#232c40" strokeWidth="1.5" />
        <text x="66" y="28" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="12">score contributed</text>
        <text x="430" y="290" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="12">visits to this arm  →</text>
        <line x1="66" y1="168" x2="612" y2="160" stroke="#5da2ff" strokeWidth="2.5" />
        <text x="500" y="150" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="12">exploitation · w/n</text>
        <path d="M66 56 C 150 168, 260 224, 612 246" fill="none" stroke="#f0b94b" strokeWidth="2.5" />
        <text x="470" y="238" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="12">exploration · c√(ln t / n)</text>
        <line x1="200" y1="40" x2="200" y2="256" stroke="#232c40" strokeWidth="1" strokeDasharray="4 5" />
        <text x="208" y="60" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">bonus dominates</text>
        <text x="330" y="60" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">evidence dominates</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'mcts_ucb1.py',
  Viz: MCTSViz,
  narration,
};
