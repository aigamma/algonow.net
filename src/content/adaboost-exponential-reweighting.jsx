import AdaBoostViz from '../viz/AdaBoostViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/adaboost_exponential_reweighting.py?raw';
import { narration } from './adaboost-exponential-reweighting.narration.js';

export const content = {
  given:
    'Points in the unit square labeled +1 inside a disk and −1 outside it, a boundary no single axis-aligned threshold can trace: the best decision stump gets 63.7% of held-out points right. 400 training points, 1,000 held out.',
  task: 'Run 200 rounds. Each round fits one stump to the weighted training set and gives it a vote α = ½ ln((1 − ε)/ε). Between rounds, multiply every point’s weight by exp(−α y h(x)) and renormalize: the last stump’s mistakes grow, its successes shrink, and the next stump is fitted to what the vote still gets wrong.',
  constraint:
    'Two exact identities checked every round: after reweighting, the stump just fitted has weighted error exactly ½ (worst deviation 2 × 10⁻¹⁵), and Z = 2√(ε(1 − ε)) (1 × 10⁻¹⁵). The training error of the vote sat under the Freund-Schapire bound ∏ Z at all 200 rounds, hit zero at round 95, and the held-out accuracy kept rising after that, to 96.7%. The same stumps with the reweighting removed refit one stump 200 times: 63.7%. Bagged stumps: 64.0%. With 10% of the labels flipped, 34% of the weight ends up on the 40 flipped points and held-out accuracy falls to 89.5%.',

  origins: (
    <p>
      Kearns and Valiant asked in 1988 whether a learner only slightly
      better than chance could be turned into one that is nearly always
      right. Schapire answered yes in 1990 (<strong>The Strength of
      Weak Learnability</strong>) with the first boosting construction.
      Freund and Schapire gave the practical form in 1995, in full in
      1997: AdaBoost, adaptive boosting, with the exponential
      reweighting and the bound this page checks; it earned them the
      2003 Gödel Prize. Schapire, Freund, Bartlett, and Lee (1998)
      explained why test error keeps falling after training error
      reaches zero: the margins keep growing. Friedman, Hastie, and
      Tibshirani (2000) showed AdaBoost is stagewise fitting of the
      exponential loss, which opened the door to gradient boosting
      (Friedman 2001). Viola and Jones built the first real-time face
      detector (2001) out of exactly this: AdaBoost over thousands of
      rectangle stumps.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>vote and the bound</strong>. Each round fits
      the stump with the least weighted error ε<sub>t</sub> (a sweep
      along each feature&apos;s sorted order prices every threshold in
      O(n)); its vote is α<sub>t</sub> = ½ ln((1 − ε<sub>t</sub>)/ε<sub>t</sub>),
      positive while the stump beats a coin. The classifier is
      sign Σ α<sub>t</sub> h<sub>t</sub>(x). The guarantee: training
      error ≤ ∏<sub>t</sub> Z<sub>t</sub> with Z<sub>t</sub> =
      2√(ε<sub>t</sub>(1 − ε<sub>t</sub>)) &lt; 1, so every useful
      round shrinks the bound geometrically. Measured: bound{' '}
      <strong>0.954 → 0.656 → 0.277 → 0.151 → 0.070</strong> at
      rounds 1, 10, 50, 100, 200; training error under it every round,
      zero from round 95; held-out accuracy still rising afterward, to
      96.7%.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>focus</strong>: w<sub>i</sub> ← w<sub>i</sub>{' '}
      exp(−α<sub>t</sub> y<sub>i</sub> h<sub>t</sub>(x<sub>i</sub>)) / Z<sub>t</sub>.
      Two exact consequences, checked to 10<sup>−15</sup> every
      round: the stump just fitted has weighted error exactly ½ on
      the new weights (made useless, so round t+1 must find something
      new), and the normalizer is 2√(ε(1 − ε)), which is why the
      bound is a product. Remove the reweighting and every round refits
      the same stump: <strong>63.7%</strong>, identical to one stump.
      Keep it: <strong>96.7%</strong>. The price: the exponential piles
      weight onto whatever the vote keeps getting wrong, including
      labels that are simply wrong: 34% of the weight on the 40 flipped
      points, 89.5% held out, down from 91.3% at round 20 before the
      pile-up.
    </p>
  ),

  picture: (
    <p>
      A committee of specialists hired one at a time. Each new hire is
      chosen by an exam whose questions are weighted by how badly the
      current committee does on them: the questions everyone gets right
      barely count; the ones the committee keeps missing count for most
      of the grade. The hire who scores best gets a vote in proportion
      to how much better than a coin flip they scored. Then the exam is
      reweighted again so that the newest hire scores exactly fifty
      percent on it: their strengths are spent, and the next hire must
      bring something different. After a hundred hires, questions no
      single specialist could answer are answered by the vote. The
      danger is a question with a wrong answer key: it never gets
      answered right, so its weight grows and grows, and the last hires
      are chosen for their talent at matching the wrong key.
    </p>
  ),

  steps: [
    <>
      <strong>Init:</strong> w<sub>i</sub> = 1/n for all 400 points.
    </>,
    <>
      <strong>Fit:</strong> the stump (feature, threshold, polarity)
      with the least weighted error ε<sub>t</sub>; sorted sweep, O(n)
      per feature.
    </>,
    <>
      <strong>Vote:</strong> α<sub>t</sub> = ½ ln((1 − ε<sub>t</sub>)/ε<sub>t</sub>).
    </>,
    <>
      <strong>Reweight:</strong> w<sub>i</sub> ← w<sub>i</sub>{' '}
      e<sup>−α y<sub>i</sub> h(x<sub>i</sub>)</sup> / Z<sub>t</sub>;
      Z<sub>t</sub> = 2√(ε<sub>t</sub>(1 − ε<sub>t</sub>)).
    </>,
    <>
      <strong>Predict:</strong> sign Σ α<sub>t</sub> h<sub>t</sub>(x);
      check error ≤ ∏ Z<sub>t</sub> every round, 96.7% held out.
    </>,
  ],

  signals: [
    <>
      <strong>A weak learner that is cheap and reliably better than
      chance:</strong> stumps, one comparison each, 63.7% alone, and
      always more of them.
    </>,
    <>
      <strong>Bias is the problem, not variance:</strong> a base
      learner too simple to trace the boundary; averaging copies of it
      gave 64.0% here, boosting makes the copies different.
    </>,
    <>
      <strong>Clean labels:</strong> the exponential loss treats every
      persistent mistake as the most important point in the set, and a
      flipped label is a mistake that never stops.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>a single decision stump</strong>:
      63.7% held out, the weak learner itself. Everything above that
      floor is what 200 rounds and the reweighting bought; the same 200
      stumps without the reweighting sit exactly on the floor.
    </>
  ),

  strength: (
    <>
      <strong>Provable and measured.</strong> Training error under
      ∏ Z<sub>t</sub> at every one of 200 rounds, zero by round 95,
      96.7% held out from a learner that alone manages 63.7%; the two
      identities behind the bound holding to 10<sup>−15</sup>; and
      no parameters to tune beyond the number of rounds.
    </>
  ),
  weakness: (
    <>
      <strong>A noise magnet.</strong> With 10% of the labels flipped,
      34% of the weight sat on those 40 points by the last round, and
      the held-out accuracy was lower at round 200 (89.5%) than at
      round 20 (91.3%): more rounds made it worse, because the
      exponential loss cannot tell a hard point from a wrong one. It is
      sequential where a forest is parallel, the exponential loss is
      the wrong loss for probabilities and outliers (LogitBoost and
      robust gradient boosting are the fixes), and stumps draw
      staircases around a circle.
    </>
  ),

  problem: 'Boosted classification',
  problemSlug: 'classification',
  rivals: [
    {
      name: 'AdaBoost × exponential reweighting',
      isThisUnit: true,
      algoName: 'AdaBoost',
      cost: '200 stumps, one round at a time',
      wins: (
        <>
          <strong>96.7% from a 63.7% learner</strong>, a training-error
          bound that holds every round, and nothing to tune but the
          round count.
        </>
      ),
      costs: (
        <>
          Weight piles onto flipped labels (34% on 10% of the points),
          and the rounds cannot run in parallel.
        </>
      ),
      when: 'A cheap weak learner, bias to remove, and labels you trust.',
    },
    {
      name: 'Gradient boosting',
      cost: 'one tree per stage, any loss',
      wins: (
        <>
          The same stagewise idea for any differentiable loss: each
          stage fits the negative gradient; AdaBoost is the
          exponential-loss special case.
        </>
      ),
      costs: (
        <>
          More knobs: learning rate, depth, subsampling; and still
          sequential.
        </>
      ),
      when: 'Regression, ranking, probabilities, or any problem where the exponential loss is the wrong loss.',
    },
    {
      name: 'Random forest',
      cost: 'many deep trees, in parallel',
      wins: (
        <>
          Variance reduction over bootstrap samples and random feature
          subsets; parallel; shrugs at label noise.
        </>
      ),
      costs: (
        <>
          Cannot make a weak learner strong: the same recipe on stumps
          gave 64.0% here.
        </>
      ),
      when: 'A strong base learner, noisy labels, or parallel hardware.',
    },
    {
      name: 'Decision tree',
      cost: 'one tree',
      wins: (
        <>
          One deep tree traces the disk by itself in a staircase, and
          you can read it.
        </>
      ),
      costs: (
        <>
          High variance alone; the ensembles exist to fix what one tree
          overfits.
        </>
      ),
      when: 'When one explainable model matters more than the last few points of accuracy.',
    },
  ],
  neverUse: {
    name: 'Bagging as the way to make stumps strong',
    why: (
      <>
        The obvious thing to try: fit 200 stumps on 200 bootstrap
        resamples and let them vote. Measured:{' '}
        <strong>64.0%, indistinguishable from one stump at 63.7%</strong>,
        against 96.7% for the same 200 stumps under the reweighting.
        Averaging attacks variance; a stump&apos;s error is bias, and
        averaging many copies of the same bias returns the same bias.
        The heuristic that makes boosting work is exactly the thing
        bagging refuses to do: make each round depend on the last.
      </>
    ),
  },

  contest: {
    instance:
      'a disk-versus-ring boundary in the unit square, 400 training points, 1,000 held out, decision stumps as the weak learner, 200 rounds',
    columns: ['held-out accuracy', 'training error'],
    rows: [
      {
        method: 'AdaBoost, exponential reweighting',
        isThisUnit: true,
        values: ['0.967', '0.000 (from round 95)'],
        best: 0,
        verdict: 'the vote of stumps fitted to each other’s mistakes',
      },
      {
        method: 'Single stump',
        values: ['0.637', '0.350'],
        verdict: 'one axis-aligned threshold against a disk',
      },
      {
        method: '200 rounds, uniform weights (ablation)',
        values: ['0.637', '0.350'],
        verdict: 'no reweighting: the same stump refitted 200 times',
      },
      {
        method: '200 bagged stumps (bootstrap + majority)',
        values: ['0.640', '-'],
        verdict: 'averages variance; a stump’s bias stays',
      },
      {
        method: 'AdaBoost on 10% flipped labels',
        values: ['0.895', '-'],
        verdict: '34% of the weight on the 40 flipped points by round 200; 0.913 at round 20',
      },
    ],
    source:
      'python solutions/adaboost_exponential_reweighting.py prints this table and asserts, every round: the refitted stump’s weighted error on the new weights is ½ and Z = 2√(ε(1 − ε)) to 10⁻⁹ (measured 10⁻¹⁵), and the training error is at most ∏ Z; then: the ensemble above 0.9 held out and more than 0.1 above bagging, the ablation equal to a single stump, stump and bagging below 0.8, and under flipped labels more than 30% of the weight on the flipped points with accuracy below the clean run.',
  },

  figure: (
    <Figure
      id="fig-adaboost-bound"
      aspect="16 / 7"
      caption="Two hundred rounds of stumps on the disk. The dim curve is the Freund-Schapire bound, the running product of Z = 2√(ε(1 − ε)); the blue curve is the training error of the vote, which sat under the bound at every round and reached zero at round 95; the amber curve is the held-out error, still falling for a hundred rounds after the training error hit zero (0.037 at round 100, 0.033 at round 200). The same stumps without the reweighting never leave the first point."
      cite={{
        text: 'Y. Freund, R. E. Schapire, "A decision-theoretic generalization of on-line learning and an application to boosting," J. Computer and System Sciences 55(1), 1997. DOI 10.1006/jcss.1997.1504. Schapire, "The strength of weak learnability," Machine Learning 5, 1990.',
        href: 'https://doi.org/10.1006/jcss.1997.1504',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="Three curves over two hundred rounds: the product-of-Z bound falling from 0.95 to 0.07, the training error falling to zero by round 95, and the held-out error falling to 0.033">
        <rect x="60" y="40" width="540" height="200" fill="rgba(154,165,189,0.06)" stroke="rgba(154,165,189,0.35)" />
        <text x="18" y="44" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">1.0</text>
        <text x="18" y="144" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">0.5</text>
        <text x="18" y="244" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">0.0</text>
        <text x="60" y="258" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">round 1</text>
        <text x="540" y="258" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">round 200</text>
        <polyline points="62.7,49.2 87,108.8 195,184.6 330,209.8 600,226" fill="none" stroke="#9aa5bd" strokeWidth="2.5" />
        <polyline points="62.7,167.4 87,194.8 195,230.6 330,232.6 600,233.4" fill="none" stroke="#f0b94b" strokeWidth="2" />
        <polyline points="62.7,170 87,200.4 195,236.4 330,239 600,240" fill="none" stroke="#5da2ff" strokeWidth="2.5" />
        <line x1="316.5" y1="40" x2="316.5" y2="240" stroke="#62d98a" strokeWidth="1.5" strokeDasharray="5 4" />
        <text x="322" y="92" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">training error 0 at round 95</text>
        <text x="400" y="200" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">bound ∏ Z: 0.070 at 200</text>
        <text x="400" y="216" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">held-out error: 0.033</text>
        <text x="400" y="232" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="11">training error: 0</text>
        <text x="60" y="274" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">no reweighting: the same stump 200 times, every curve frozen at round 1 (0.350 training, 0.363 held out)</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'adaboost_exponential_reweighting.py',
  Viz: AdaBoostViz,
  narration,
};
