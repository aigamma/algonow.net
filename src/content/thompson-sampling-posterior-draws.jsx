import ThompsonViz from '../viz/ThompsonViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/thompson_sampling_posterior_draws.py?raw';
import { narration } from './thompson-sampling-posterior-draws.narration.js';

export const content = {
  given:
    'Three slot machines paying at unknown rates 0.45, 0.50, 0.55, one pull per round, ten thousand rounds. Every pull spent learning is a pull not spent earning: the exploration-exploitation dilemma with money on the table.',
  task: 'Keep an exact Beta posterior per arm. Each round, draw one plausible world from each posterior and play the arm that wins in that imagined world: probability matching by simulation, with no exploration knob to mis-tune.',
  constraint:
    'The posterior is audited (Beta(a,b) = (1 + successes, 1 + failures), exactly, every arm of every run) and its promise is checked: the true rate sat inside the central 95% interval 97.3% of the time. The race over 100 runs: greedy 470 (65% stuck), UCB1 176.6, ε-greedy 95.3, Thompson 53.0: with the twist the first draft got backwards and the run corrected: vanilla UCB1 loses to tuned ε at this horizon.',

  origins: (
    <p>
      William R. Thompson, <strong>1933</strong>, in Biometrika:
      &quot;On the likelihood that one unknown probability
      exceeds another&quot;: proposed for clinical trials, so
      that patients would be assigned to treatments in
      proportion to the evidence the treatments were best. The
      idea then sat almost untouched for eight decades while
      bandit theory grew up around UCB-style optimism. The
      revival was empirical: Chapelle and Li&apos;s 2011
      evaluation showed the 1933 rule beating the modern
      favorites on ad-click data, Agrawal and Goyal supplied
      matching optimal regret bounds in 2012, and the industry
      quietly standardized on it: content experiments, ad
      allocation, recommendation exploration. The oldest bandit
      algorithm in the literature is now, by a fair margin, the
      one most likely to be running behind a website you used
      today.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>Bayesian ledger</strong>: one Beta
      posterior per arm, updated by conjugacy: a win adds one to
      α, a loss adds one to β, and the arithmetic is exact, no
      approximation anywhere. This page audits the ledger rather
      than trusting it: every arm of every run ended with
      Beta(a, b) equal to (1 + successes, 1 + failures) against
      independently kept counts, and the posterior&apos;s
      promise was checked empirically: the true payout rate sat
      inside the central 95% credible interval{' '}
      <strong>97.3%</strong> of the time. Identification
      followed: the most-pulled arm was the true best in 100 of
      100 runs.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>draw</strong>: one random sample from
      each arm&apos;s posterior per round, and the sampled
      values compete. A wide posterior throws occasional high
      draws, so uncertain arms get tried; a posterior settling
      low stops winning the imagined contest, so bad arms fade
      out: <strong>exploration exactly proportional to the
      probability of being best</strong>, with no ε to tune and
      no bonus formula to pick. Measured: regret 53.0 against
      ε-greedy&apos;s 95.3 and UCB1&apos;s 176.6, and a
      second-half increment of just 8 while ε paid its analytic
      floor of 25-per-half forever.
    </p>
  ),

  picture: (
    <p>
      Choosing a lunch spot with three untried restaurants. The
      spreadsheet approach: eat at random 10% of days
      (ε-greedy): works, but you are still coin-flipping into
      the bad taqueria in year five. The optimist&apos;s
      approach (UCB): visit whichever place your rosiest
      defensible estimate favors: principled, but the rosiness
      formula does not know your street, and here it overdoes
      the revisits. The Thompson approach: each day,{' '}
      <em>imagine one plausible version of the truth</em>: mentally
      roll each restaurant&apos;s quality from what you have
      actually experienced: and go where that imagined day says.
      Early on, your imagination varies wildly, so you try
      everything. As evidence accumulates, the imagined days
      agree more and more, and you drift: never by decree, only
      by dwindling doubt: toward the genuinely best table. The
      day you stop exploring is the day you stop being unsure,
      and not one day sooner.
    </p>
  ),

  steps: [
    <>
      <strong>Start flat:</strong> Beta(1, 1) per arm: every
      payout rate equally plausible.
    </>,
    <>
      <strong>Draw a world:</strong> one sample per posterior:
      the round&apos;s imagined truth.
    </>,
    <>
      <strong>Play its winner:</strong> the arm with the highest
      draw gets the pull: probability matching, mechanically.
    </>,
    <>
      <strong>Update by conjugacy:</strong> win: α+1; loss: β+1:
      exact Bayes, audited against raw counts on every run.
    </>,
    <>
      <strong>Let doubt decay:</strong> posteriors sharpen,
      draws stop disagreeing, exploration fades to zero on its
      own: increment 8 in the second half vs ε&apos;s 25 floor.
    </>,
  ],

  signals: [
    <>
      <strong>Exploration costs real money:</strong> A/B tests
      that ramp traffic to the winner, ad allocation, treatment
      assignment: the settings Thompson was invented for in
      1933.
    </>,
    <>
      <strong>No one to tune the knob:</strong> ε and bonus
      constants need a person with intuition; the posterior
      draw&apos;s exploration rate is set by the evidence
      itself.
    </>,
    <>
      <strong>Small gaps, long horizons:</strong> 0.05 gaps at
      T = 10,000 is where this page&apos;s race was run: the
      regime where the trap is expensive and the bend matters.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>greedy</strong>: estimate
      each arm, always play the current leader. Its failure is
      not slowness but commitment: in <strong>65% of runs</strong>{' '}
      it finished still married to a suboptimal arm, for a mean
      regret of 470: nine times Thompson&apos;s. One unlucky
      early streak on the best arm, and greedy never returns to
      find out.
    </>
  ),

  strength: (
    <>
      <strong>Self-tuning exploration with an audited
      ledger.</strong> Regret 53.0 against 95.3 (tuned ε), 176.6
      (UCB1), and 470 (greedy) on identical instances; the
      most-pulled arm was the true best 100 times out of 100;
      the posterior arithmetic was verified exact against
      independent counts; and the 95% credible intervals covered
      the truth 97.3% of the time. The second-half increment of
      8 against ε&apos;s permanent 25-per-half floor is the log
      curve bending on camera.
    </>
  ),
  weakness: (
    <>
      <strong>A model, randomness, and no per-run
      certificate.</strong> The exactness leans on conjugacy:
      Bernoulli rewards and Beta priors: step outside (delayed
      feedback, drifting rates, correlated arms) and you need
      approximate posteriors with their own failure modes. The
      policy is randomized: two identical deployments explore
      differently, which complicates debugging and auditing:
      UCB1&apos;s determinism is a genuine operational virtue.
      Its guarantees are Bayesian-average and asymptotic, not
      per-run promises. And this page&apos;s twist cuts both
      ways: rules with knobs (ε) can beat rules with guarantees
      (UCB1) at practical horizons: measured 95.3 vs 176.6: so
      &quot;principled&quot; is not a synonym for
      &quot;faster.&quot;
    </>
  ),

  problem: 'Multi-armed bandits',
  problemSlug: 'bandits',
  rivals: [
    {
      name: 'Thompson × posterior draws',
      isThisUnit: true,
      algoName: 'Thompson sampling',
      cost: 'O(k) draws per round',
      wins: (
        <>
          <strong>Self-tuning</strong>: regret 53.0, best of the
          bench; identification 100/100; the exploration rate is
          the uncertainty itself.
        </>
      ),
      costs: (
        <>
          Needs a posterior (conjugacy or approximation),
          randomized behavior, Bayesian-average guarantees.
        </>
      ),
      when: 'Exploration costs money and nobody wants to babysit a knob: the industry default.',
    },
    {
      name: 'UCB1',
      cost: 'O(k) per round, deterministic',
      wins: (
        <>
          Optimism with a worst-case receipt: log-regret
          guaranteed distribution-free, fully deterministic and
          auditable: the live MCTS unit&apos;s steering rule.
        </>
      ),
      costs: (
        <>
          The conservative bonus over-explored here: 176.6,
          losing even to tuned ε at this horizon: guarantees
          charge rent.
        </>
      ),
      when: 'Adversary-adjacent settings, audits requiring determinism, or inside tree search.',
    },
    {
      name: 'Epsilon-greedy',
      cost: 'O(k), one knob',
      wins: (
        <>
          Ten lines, one knob, and honestly strong at practical
          horizons: 95.3 here, ahead of UCB1: never sneer at the
          simple baseline.
        </>
      ),
      costs: (
        <>
          The knob must be tuned per problem, and the regret is
          linear forever: the 25-per-half floor never stops
          accruing.
        </>
      ),
      when: 'Quick deployments, sanity baselines, or when simplicity is the requirement.',
    },
    {
      name: 'Exp3',
      cost: 'O(k), adversarial-safe',
      wins: (
        <>
          The paranoid cousin: exponential weights that need no
          statistical assumptions at all: the rewards may be
          chosen by an adversary and the √T guarantee stands.
        </>
      ),
      costs: (
        <>
          Pays for paranoia in stochastic worlds: √T regret
          where the Bayesian and optimistic rules get log T.
        </>
      ),
      when: 'Rewards that fight back: spam, security, markets: anything non-stationary by intent.',
    },
  ],
  neverUse: {
    name: 'Greedy: exploit-only, explore never',
    why: (
      <>
        The default every untutored system converges to: estimate
        each option, always pick the current leader, never
        &quot;waste&quot; a trial. Measured here:{' '}
        <strong>mean regret 470, and in 65% of runs the horizon
        ended with greedy still committed to a suboptimal
        arm</strong>: one unlucky opening streak on the true best
        and it never went back to check. The failure is not
        slowness: it is permanence: no amount of additional time
        fixes it, because the policy has made checking
        impossible. Every serious bandit rule on this bench is,
        at bottom, a machine for guaranteeing return visits;
        greedy is what remains when that machinery is deleted to
        &quot;save&quot; pulls. The pulls it saves cost nine
        times themselves, forever.
      </>
    ),
  },

  contest: {
    instance:
      '3 arms at rates 0.45 / 0.50 / 0.55, T = 10,000 rounds, mean cumulative regret over 100 independent runs; the posterior ledger audited exactly on every run',
    columns: ['mean regret'],
    rows: [
      {
        method: 'Greedy (no exploration)',
        values: ['470.3'],
        verdict: 'the trap: stuck on a loser in 65% of runs, permanently',
      },
      {
        method: 'UCB1',
        values: ['176.6'],
        verdict: 'the twist, asserted as found: the conservative bonus over-explores at this horizon',
      },
      {
        method: 'Epsilon-greedy (10%)',
        values: ['95.3'],
        verdict: 'ahead of UCB1 today, linear forever: its 25-per-half floor never stops accruing',
      },
      {
        method: 'Thompson sampling',
        isThisUnit: true,
        values: ['53.0'],
        best: 0,
        verdict: 'probability matching: second-half increment 8, the log curve bending on camera',
      },
    ],
    source:
      'python solutions/thompson_sampling_posterior_draws.py prints this table and asserts: Beta(a,b) equal to (1 + successes, 1 + failures) exactly on every arm of every run against independent counts; 95% credible-interval coverage 97.3% within [88%, 99.5%]; the most-pulled arm equal to the true best in 100/100 runs; the race ordering as measured (greedy > UCB1 > ε > Thompson, with the first draft’s assumed UCB1 < ε corrected by the run and the correction kept in a comment); second-half increments ε ≈ its analytic floor of 25 vs Thompson 8; and the greedy trap counted at 65%.',
  },

  figure: (
    <Figure
      id="fig-thompson-posteriors"
      aspect="16 / 7"
      caption="Draw a world, play its winner, update, repeat. Each arm keeps an exact Beta posterior (audited: α, β = 1 + successes, 1 + failures on every run); each round one sample per posterior competes and the winning arm gets the pull. Wide posteriors throw occasional high draws, so uncertain arms get tried; settled-low posteriors stop winning, so bad arms fade: exploration exactly as large as the doubt. Measured at T = 10,000 over 100 runs: Thompson 53.0 against ε-greedy's 95.3, UCB1's 176.6 (the over-exploring twist, asserted as found), and greedy's 470 with 65% of runs permanently stuck."
      cite={{
        text: 'W. R. Thompson, "On the likelihood that one unknown probability exceeds another in view of the evidence of two samples," Biometrika 25, 1933. DOI 10.1093/biomet/25.3-4.285. Revival: Chapelle-Li 2011; bounds: Agrawal-Goyal 2012.',
        href: 'https://doi.org/10.1093/biomet/25.3-4.285',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="Three Beta posteriors of different sharpness with sampled draws, and the regret race summary">
        {[
          ['arm A · 0.45', 110, '#e2606c', 40, 'M 40 150 C 70 150, 85 60, 110 60 C 135 60, 150 150, 180 150', 0.44],
          ['arm B · 0.50', 320, '#f0b94b', 30, 'M 250 150 C 285 150, 300 78, 320 78 C 340 78, 355 150, 390 150', 0.52],
          ['arm C · 0.55', 530, '#62d98a', 55, 'M 470 150 C 505 150, 515 38, 530 38 C 545 38, 555 150, 590 150', 0.56],
        ].map(([label, cx, col, , path, draw]) => (
          <g key={String(label)}>
            <path d={String(path)} fill="none" stroke={String(col)} strokeWidth="1.8" />
            <text x={Number(cx) - 38} y="170" fill={String(col)} fontFamily="ui-monospace, monospace" fontSize="10">{label}</text>
            <circle cx={Number(cx) + (Number(draw) - 0.5) * 140} cy="150" r="4" fill={String(col)} />
          </g>
        ))}
        <text x="40" y="34" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">the round&apos;s draws: one sample per posterior: highest draw gets the pull</text>
        <text x="40" y="196" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">wide posterior: occasional high draws: still explored · sharp winner: draws stop losing: exploited</text>
        <text x="40" y="222" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">audited: α,β = 1+wins, 1+losses exactly · 95% intervals covered truth 97.3% · best arm most-pulled 100/100</text>
        <text x="40" y="244" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">regret at T=10,000: thompson 53.0 · ε-greedy 95.3 · UCB1 176.6 · greedy 470 (65% stuck forever)</text>
        <text x="40" y="266" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">second-half increments: ε pays its floor of 25 forever · thompson pays 8 and falling: the bend is the product</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'thompson_sampling_posterior_draws.py',
  Viz: ThompsonViz,
  narration,
};
