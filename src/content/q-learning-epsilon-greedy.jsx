import QLearningViz from '../viz/QLearningViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/q_learning_epsilon_greedy.py?raw';
import { narration } from './q-learning-epsilon-greedy.narration.js';

export const content = {
  given:
    'A 4 × 12 grid: start at the bottom left, goal at the bottom right, and the ten cells between them a cliff that costs 100 and throws the walker back to the start. Every other step costs 1. The learner is shown none of this: it sees only where it is and what each step cost.',
  task: 'Learn the best action in every cell from experience alone. Q-learning keeps a table Q(s, a) and after every step moves Q(s, a) toward the reward plus the best Q of the next cell, whatever the walker does next. ε-greedy decides what it does next: the best-known action with probability 0.9, a random one with probability 0.1.',
  constraint:
    'Value iteration on the known map is the referee: the optimal route hugs the cliff in 13 steps and V*(start) = −13. After 2,000 episodes, Q-learning’s greedy table walks exactly those 13 steps, agrees with the optimal action on every cell of the route, and its start value is −13.00. It fell off the cliff 706 times learning it. SARSA, the on-policy rival with the same ε, settles on the 17-step top route and fell 114 times. With ε = 0 the outcome depends on how the table was born: zeros are optimistic here and still find the 13; a table born at −100 locks into a 15-step route forever.',

  origins: (
    <p>
      Bellman&apos;s dynamic programming (1957) gave the optimality
      equation: a state&apos;s value is the best immediate reward plus
      the value of where it leads. Sutton&apos;s temporal-difference
      learning (1988) showed how to learn such values from samples, one
      step at a time, bootstrapping from the current guess. Chris
      Watkins&apos;s Cambridge thesis <strong>Learning from Delayed
      Rewards</strong> (1989) introduced Q-learning, and Watkins and
      Dayan (1992) proved it converges to the optimal table whenever
      every state-action keeps being sampled and the step sizes decay.
      SARSA, the on-policy cousin, is Rummery and Niranjan&apos;s
      (1994). The ε-greedy rule is older and simpler, borrowed from
      the bandit literature; the cliff walk on this page is Example 6.6
      of Sutton and Barto&apos;s textbook, measured rather than
      redrawn. In 2013 Mnih et al. at DeepMind replaced the table with
      a neural network, kept the same update and the same ε-greedy
      behavior, and played Atari from pixels.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>update and its guarantee</strong>: Q(s, a) ←
      Q(s, a) + α [r + γ max<sub>a′</sub> Q(s′, a′) − Q(s, a)].
      The max is over what the walker <em>could</em> do next, not what
      it does, which makes Q-learning off-policy: the table learns the
      value of behaving optimally while the walker behaves foolishly a
      tenth of the time. Measured against value iteration on the known
      map (2,000 episodes, α = 0.5, γ = 1): the greedy route through
      the learned table is the <strong>13-step cliff edge</strong>, the
      learned action matches the optimal action on every cell of it,
      and V(start) = −13.00, exactly the referee&apos;s. The route
      first became optimal at episode 43 and stayed.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>visits</strong>. The update corrects only the
      entries it samples; an entry nobody visits is a guess forever.
      ε-greedy: with probability 0.1, a random action. The ablations,
      each measured: ε = 0 from a table of zeros still found the 13,
      with 11 falls, at episode 45. That is not a victory for greed: in
      a world where every reward is negative an untried zero looks
      better than any tried entry, so greed explores each
      cliff-entering action exactly once (ten cells above the cliff
      stepping down, plus the start stepping right: 11) and never
      again. ε = 0 from a table born at −100 locked into the first
      route it found, <strong>15 steps, never the 13</strong>. ε = 0.5
      found the 13 at episode 18 and fell 11,717 times doing it. ε buys
      robustness to how the table was born, at a price paid in falls.
    </p>
  ),

  picture: (
    <p>
      A hiker learning a mountain pass in the dark, with a notebook.
      For every spot and every direction, the notebook records how bad
      the rest of the trip was from there. Q-learning is the rule for
      the notebook: after each step, update the spot you just left with
      what the step cost plus the <em>best</em> entry at the spot you
      arrived at. The best entry, not the one you will follow next,
      because the notebook is about the best possible trip, not
      tonight&apos;s stumbling. ε-greedy is the rule for the feet:
      follow the notebook, but one step in ten, go somewhere it does
      not recommend, because a path the notebook never rated is a path
      it will never rate. The catch is the cliff. A hiker who follows
      the edge because the notebook says so, and lurches sideways one
      step in ten, falls a lot while learning. The on-policy hiker
      (SARSA) writes down what happens to a hiker who lurches, and
      learns to walk higher up.
    </p>
  ),

  steps: [
    <>
      <strong>Act:</strong> in cell s, take a random action with
      probability ε, else argmax<sub>a</sub> Q(s, a), ties at random.
    </>,
    <>
      <strong>Step:</strong> receive the reward r (−1, or −100 and a
      reset for the cliff) and the next cell s′.
    </>,
    <>
      <strong>Update:</strong> Q(s, a) += α [r + γ max Q(s′, ·) −
      Q(s, a)]; at the goal the target is r alone.
    </>,
    <>
      <strong>Continue:</strong> s ← s′; at the goal, start a new
      episode; 2,000 of them here.
    </>,
    <>
      <strong>Check:</strong> the greedy route vs value iteration: 13
      steps, optimal on every cell, V(start) = −13.00.
    </>,
  ],

  signals: [
    <>
      <strong>An unknown but sampleable world:</strong> no transition
      model to write down, but you can act and observe; the whole reason
      to learn a table instead of solving one.
    </>,
    <>
      <strong>Few enough states for a table</strong> (48 × 4 here), or
      a function approximator standing in for it, which is where deep
      Q-networks begin.
    </>,
    <>
      <strong>You want the optimum while behaving exploratorily:</strong>{' '}
      off-policy learning lets the table converge on the edge route while
      the feet keep lurching.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>value iteration on the known
      map</strong>: exact, 13 steps, a few sweeps. It is the referee
      here rather than a competitor, because it needs every transition
      and reward written down, which the learner does not have. The
      point of Q-learning is to reach the same table from samples
      alone, and on this page it does: cell for cell along the route,
      −13.00 at the start.
    </>
  ),

  strength: (
    <>
      <strong>The optimum, learned while behaving badly on
      purpose.</strong> The 13-step edge route, matched cell for cell
      to value iteration, V(start) = −13.00, from 2,000 episodes of a
      walker that lurched at random a tenth of the time. Convergent
      (Watkins and Dayan) as long as ε keeps every entry sampled, and
      indifferent to how the table was born.
    </>
  ),
  weakness: (
    <>
      <strong>The training bill is paid in falls.</strong> 706 of them,
      against SARSA&apos;s 114, because the table tells the walker to
      hug the cliff and the feet lurch. ε is a dial with no right
      setting printed on it: 0.5 finds the optimum at 11,717 falls; 0
      depends on an accident of the table&apos;s birth. The tabular form
      does not scale (48 cells is a toy), and the max in the update
      overestimates under noise, which double Q-learning was built to
      fix. The convergence proof also wants decaying step sizes, which
      this deterministic world let us skip.
    </>
  ),

  problem: 'Reinforcement learning',
  problemSlug: 'reinforcement-learning',
  rivals: [
    {
      name: 'Q-learning × ε-greedy',
      isThisUnit: true,
      algoName: 'Q-learning',
      cost: 'one table update per step',
      wins: (
        <>
          <strong>The 13-step optimum</strong>, matched to value
          iteration on every cell, learned off-policy from an
          exploring walker.
        </>
      ),
      costs: (
        <>
          706 falls while learning, and a table that does not scale
          past toys without a network behind it.
        </>
      ),
      when: 'Unknown, sampleable worlds where you want the optimal policy and can afford exploratory behavior while learning.',
    },
    {
      name: 'SARSA',
      cost: 'one table update per step',
      wins: (
        <>
          On-policy: the update uses the action the walker actually
          takes next, ε included, so it learns the policy it can
          survive executing: the 17-step top route, <strong>114
          falls</strong> against 706.
        </>
      ),
      costs: (
        <>
          It learns the value of its exploring self, not the optimum:
          17 steps, never the 13, while ε stays on.
        </>
      ),
      when: 'When training-time behavior matters: a real robot, a real cliff.',
    },
    {
      name: 'Value iteration',
      cost: 'a sweep of the whole table per iteration',
      wins: (
        <>
          Exact and fast: the referee on this page, the optimal table
          in a handful of sweeps.
        </>
      ),
      costs: (
        <>
          Needs the model: every transition and reward, written down in
          advance.
        </>
      ),
      when: 'When the map is known: solve it, do not learn it.',
    },
    {
      name: 'Monte Carlo control',
      cost: 'one full episode per update',
      wins: (
        <>
          No bootstrapping: every visited entry moves toward the actual
          return, unbiased.
        </>
      ),
      costs: (
        <>
          Blind until the episode ends, and high variance; a
          500-step wander teaches nothing until it is over.
        </>
      ),
      when: 'Short episodic tasks, or when the bias of bootstrapping from a wrong guess is the enemy.',
    },
  ],
  neverUse: {
    name: 'Greedy-only learning from a realistic table',
    why: (
      <>
        The learner&apos;s instinct is to always take the best-known
        action; exploration feels like wasted steps. From a table born
        at −100, a pessimistic but reasonable guess in a world of
        negative rewards, that instinct locked into a{' '}
        <strong>15-step route and never found the 13</strong> in
        2,000 episodes: once one route had been rated, no untried entry
        could ever look better than it. The same greed from a table of
        zeros did find the 13, and that is the trap: it worked by the
        accident that zero was optimistic on this reward scale, not by
        any property of the method. A method that works only when the
        initial guess happens to be optimistic is not a method.
        ε-greedy does not care how the table was born.
      </>
    ),
  },

  contest: {
    instance:
      'the cliff walk (4 × 12, cliff cost 100, step cost 1), 2,000 episodes, α = 0.5, γ = 1; referee: value iteration on the known map (optimal route 13 steps, V*(start) = −13)',
    columns: ['greedy route', 'cliff falls while learning', 'first optimal episode'],
    rows: [
      {
        method: 'Q-learning, ε = 0.1',
        isThisUnit: true,
        values: ['13 steps', '706', '43'],
        best: 0,
        verdict: 'off-policy: the edge route, learned while lurching',
      },
      {
        method: 'Q-learning, ε = 0, table of zeros',
        values: ['13 steps', '11', '45'],
        verdict: 'zeros are optimistic here: greed explores each cliff-entering action once',
      },
      {
        method: 'Q-learning, ε = 0, table of −100',
        values: ['15 steps', '11', 'never'],
        verdict: 'pessimistic table: locks into the first route found',
      },
      {
        method: 'Q-learning, ε = 0.5',
        values: ['13 steps', '11,717', '18'],
        verdict: 'the optimum is found; the training is carnage',
      },
      {
        method: 'SARSA, ε = 0.1',
        values: ['17 steps', '114', 'never (by design)'],
        verdict: 'on-policy: learns the route its exploring self survives',
      },
    ],
    source:
      'python solutions/q_learning_epsilon_greedy.py prints this table and asserts: the learned greedy route is 13 steps and matches value iteration’s optimal action on every cell of it with V(start) within 1.5 of −13 (measured −13.00); ε = 0 from zeros finds the 13 and from −100 does not; ε = 0.5 falls more than 3× as often as ε = 0.1; SARSA’s route is longer than 13 with fewer falls than Q-learning’s.',
  },

  figure: (
    <Figure
      id="fig-cliff-walk"
      aspect="16 / 7"
      caption="The cliff walk and the three routes the learners settled on. Blue: the 13-step edge, value iteration’s optimum, which Q-learning with ε = 0.1 learns exactly (706 falls while learning). Dashed: the 15-step middle route a greedy learner locked into from a table born at −100. Amber: the 17-step top route SARSA learns with the same ε, the route its lurching self can survive (114 falls). The update behind all three is one line; what differs is whether the target is the best next action (Q-learning) or the taken one (SARSA), and whether the feet ever explore."
      cite={{
        text: 'C. J. C. H. Watkins, P. Dayan, "Q-learning," Machine Learning 8, 1992. DOI 10.1007/BF00992698. Watkins, Learning from Delayed Rewards, 1989. Sutton and Barto, Reinforcement Learning: An Introduction, 2nd ed., 2018, Example 6.6.',
        href: 'https://doi.org/10.1007/BF00992698',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="A four by twelve grid with a red cliff along the bottom row and three routes from start to goal: the blue 13-step edge, a dashed 15-step middle route, and an amber 17-step top route">
        {Array.from({ length: 4 }, (_, r) => Array.from({ length: 12 }, (_, c) => (
          <rect key={`${r}-${c}`} x={40 + c * 46} y={30 + r * 46} width="44" height="44" fill={r === 3 && c >= 1 && c <= 10 ? 'rgba(226,96,108,0.35)' : 'rgba(154,165,189,0.08)'} stroke="rgba(154,165,189,0.3)" />
        )))}
        <text x="52" y="197" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="13" fontWeight="bold">S</text>
        <text x="558" y="197" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="13" fontWeight="bold">G</text>
        <text x="270" y="197" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">the cliff: −100, back to S</text>
        <polyline points="62,190 62,144 568,144 568,190" fill="none" stroke="#5da2ff" strokeWidth="3" />
        <polyline points="66,186 66,98 564,98 564,186" fill="none" stroke="#9aa5bd" strokeWidth="2" strokeDasharray="6 4" />
        <polyline points="58,194 58,52 572,52 572,194" fill="none" stroke="#f0b94b" strokeWidth="2.5" />
        <text x="40" y="238" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="11">Q-learning, ε 0.1: 13 steps along the edge, V(start) −13.00, 706 falls learning it</text>
        <text x="40" y="254" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">greedy from a table of −100: 15 steps, locked in, never the 13</text>
        <text x="40" y="270" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">SARSA, ε 0.1: 17 steps along the top, 114 falls learning it</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'q_learning_epsilon_greedy.py',
  Viz: QLearningViz,
  narration,
};
