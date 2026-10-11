import ActiveLearningViz from '../viz/ActiveLearningViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/uncertainty_sampling_least_confidence_query.py?raw';
import { narration } from './uncertainty-sampling-least-confidence-query.narration.js';

export const content = {
  given:
    'A pool of unlabeled examples, a classifier, and an oracle (a human, an assay, a slow simulation) that will label one example at a time for a price. Spend as few labels as possible to reach a target accuracy.',
  task: 'Uncertainty sampling: a loop. Train on what is labeled, score every unlabeled point with the current model, ask the oracle about one, retrain. The heuristic is the least-confidence query: ask about the point whose top predicted class has the lowest probability, the one the model is closest to flipping on. For two classes that is the point nearest the decision boundary, and the same point that margin sampling and entropy sampling would pick; the three criteria part ways only from three classes up.',
  constraint:
    'Measured against random sampling on two Gaussian classes with a Newton-trained logistic regression: 30 seeds, 2 seed labels, 40 queries, a 300-point pool, a 400-point test set. In four dimensions (Bayes 0.933) least confidence reaches 0.903 after 13 labels where random needs 44; area under the curve 0.9072 against 0.8759, 4.1 standard errors apart; at 20 labels 0.9165 against 0.8742. In the plane the gain shrinks to 2.7 standard errors; with a wide class gap it vanishes (0.9876 against 0.9883). The price is a scoring pass per round: 1,002,600 probabilities across the runs where random computes none. Two failures measured: a hidden cluster the model is confidently wrong about gets 0 of 40 queries and 0.000 accuracy, where random reaches 0.838 and a farthest-first seed 0.891; scattered label noise drew 0.70 of the first 15 queries, 2.10 under random, 0.00 density weighted. 7.0 s.',

  origins: (
    <p>
      David Lewis and William Gale named uncertainty sampling in{' '}
      <strong>1994</strong> (&quot;A sequential algorithm for training text
      classifiers,&quot; SIGIR): a probabilistic classifier chose the
      documents it was least sure of for a human to label, and a few hundred
      such labels matched thousands drawn at random. Seung, Opper, and
      Sompolinsky&apos;s query by committee (1992) and Cohn, Atlas, and
      Ladner&apos;s selective sampling (1994) are the cousins; Burr
      Settles&apos; 2009 survey (Wisconsin technical report 1648) fixed the
      vocabulary, least confidence against margin against entropy, and
      Settles and Craven (EMNLP 2008) measured the outlier problem and
      weighted the score by density. Sequential experimental design, from
      Fedorov to MacKay&apos;s 1992 information-based objective, asked the
      same question of physical experiments first.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>loop and the referee</strong>. Train, score the pool,
      query, retrain: forty one models per run here, each a Newton fit of a
      regularized logistic regression, and a held-out accuracy after every
      query so the learning curve is a measurement, not a hope. The referee
      is random sampling on the same pool, the same seed labels, and the
      same test set, thirty seeds a side: in four dimensions{' '}
      <strong>13 labels against 44</strong> to reach 0.903, with the area
      under the curve 4.1 standard errors apart.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>choice of question</strong>. The least-confidence
      score 1 − max p is largest where the model is nearest to flipping, so
      every label lands on the boundary, where one answer moves the weights
      most; nowhere else is a label worth as much to a linear model. The
      same scan is its cost, 298 probabilities on the first round and one
      fewer each round, and its blindness: a point the model is{' '}
      <strong>confidently wrong</strong> about scores near zero and is
      never asked.
    </p>
  ),

  picture: (
    <p>
      A teacher grading a stack of essays with a student who will mark the
      rest. Random sampling hands the student twenty essays off the top.
      Uncertainty sampling asks the student which twenty essays they are
      least sure how to grade and corrects exactly those. The student
      learns the border between a B and a C in a fraction of the time,
      and never asks about the one essay in a foreign language they
      confidently, wrongly, gave an A.
    </p>
  ),

  steps: [
    <>
      <strong>Seed:</strong> one or a few labels per class, or a
      farthest-first handful if the pool may hide a cluster.
    </>,
    <>
      <strong>Train:</strong> fit the classifier on the labeled set (here
      Newton&apos;s method, a dozen iterations on a 5 × 5 system).
    </>,
    <>
      <strong>Score and query:</strong> one pass over the pool computing
      1 − max p; label the argmax, move it from pool to labeled set.
    </>,
    <>
      <strong>Repeat and watch the curve:</strong> stop at the target
      accuracy, the budget, or when the top score stops falling.
    </>,
  ],

  signals: [
    <>
      <strong>Labels cost more than compute:</strong> an annotator, an
      assay, a long simulation; a scoring pass over the pool is cheap by
      comparison.
    </>,
    <>
      <strong>A boundary with many knobs:</strong> the gain grew from 2.7
      standard errors in the plane to 4.1 in four dimensions and vanished
      when the classes were far apart.
    </>,
    <>
      <strong>A pool that covers the space:</strong> the model can only ask
      about what is in front of it, and only about what it already doubts.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>random sampling</strong> from the same
      pool: no scoring pass, no bias, and in four dimensions 44 labels to
      reach what least confidence reaches in 13, while finding the hidden
      cluster (0.838) that least confidence never visits.
    </>
  ),

  strength: (
    <>
      <strong>Three labels saved in four at the boundary.</strong>{' '}
      13 against 44 labels to 0.903 accuracy in four dimensions; 0.9165
      against 0.8742 at 20 labels; one scoring pass per round and one line
      of code for the criterion.
    </>
  ),
  weakness: (
    <>
      <strong>It only asks about what it already doubts.</strong> A
      twenty-point cluster the seed model is confidently wrong about got 0
      of 40 queries and stayed at 0.000 accuracy while the main clusters
      sat at 0.993; a wide class gap or a two-dimensional boundary leaves
      little for the heuristic to save.
    </>
  ),

  problem: 'Active learning',
  problemSlug: 'active-learning',
  rivals: [
    {
      name: 'Uncertainty sampling × Least-confidence query',
      isThisUnit: true,
      algoName: 'Uncertainty sampling',
      cost: 'one scoring pass over the pool per query, one model fit per query',
      wins: (
        <>
          <strong>13 labels against 44</strong> to reach 0.903 in four
          dimensions; identical to margin and entropy sampling for two
          classes on all 40 rounds checked.
        </>
      ),
      costs: (
        <>
          Blind to confident mistakes: 0 of 40 queries and 0.000 accuracy on
          the hidden cluster; no gain when the classes are far apart.
        </>
      ),
      when: 'A probabilistic classifier, expensive labels, and a pool you trust to cover the space.',
    },
    {
      name: 'Query by committee × Vote-disagreement query',
      algoName: 'Query by committee',
      cost: 'k models trained per round, k scoring passes',
      wins: (
        <>
          Disagreement among models measures version-space uncertainty, not
          one model&apos;s calibration; robust where a single model is
          overconfident.
        </>
      ),
      costs: (
        <>
          k times the training and scoring; the committee needs diversity
          (bagging, varied seeds) or it votes in unison.
        </>
      ),
      when: 'The single model is poorly calibrated or several cheap models are at hand.',
    },
    {
      name: 'Diversity sampling × Cluster-representative query',
      algoName: 'Diversity sampling',
      cost: 'distances to the labeled set, O(pool) per query',
      wins: (
        <>
          A farthest-first seed of six put <strong>8.3 labels</strong> into
          the hidden cluster and lifted it to 0.891 accuracy where least
          confidence stayed at 0.000.
        </>
      ),
      costs: (
        <>
          Spends labels on representativeness, not on the boundary: 0.961
          on the main clusters against 0.993.
        </>
      ),
      when: 'Cold starts and pools that may hide a region the seed model is confidently wrong about.',
    },
    {
      name: 'Expected error reduction',
      algoName: 'Expected error reduction',
      cost: 'one retraining per candidate per possible label',
      wins: (
        <>
          Asks the question whose answer would most reduce expected error on
          the pool, the decision-theoretic ideal.
        </>
      ),
      costs: (
        <>
          Pool × classes model fits per query against one; impractical
          without sampling the candidates.
        </>
      ),
      when: 'Tiny pools, cheap models, very expensive labels.',
    },
  ],
  neverUse: {
    name: 'Least confidence on a pool with a region the seed model is confidently wrong about',
    why: (
      <>
        Two main clusters, class 0 at (−2, 0) and class 1 at (2, 0), and a
        twenty-point class-1 cluster at (−5, 6) that the two seed labels
        never see. The seed model draws its boundary near x = 0 and calls
        the hidden cluster class 0 with high confidence, so its score 1 −
        max p sits near zero; across 20 seeds it received{' '}
        <strong>0 of 40 queries</strong> and the final model classified{' '}
        <strong>0.000</strong> of its test points correctly, while scoring
        0.993 on the main clusters. Random sampling landed 2.6 labels there
        and reached 0.838; a six-point farthest-first seed landed 8.3 and
        reached 0.891. The heuristic cannot ask about what it does not
        doubt, and the measured cure is a seed that covers the pool, not a
        sharper doubt.
      </>
    ),
  },

  contest: {
    instance:
      'Two Gaussian classes, a Newton-trained logistic regression, 2 seed labels then one query per round, 30 seeds; four dimensions at separation 3.0 (Bayes 0.933) for the learning-curve columns; the hidden-cluster and scattered-noise pools in the plane, 20 seeds each',
    columns: ['labels to 0.903', 'accuracy at 20 labels', 'area under the curve', 'hidden-cluster accuracy', 'noise points in first 15 queries'],
    rows: [
      {
        method: 'least-confidence uncertainty sampling',
        isThisUnit: true,
        values: ['13', '0.9165', '0.9072 ± 0.0034', '0.000', '0.70'],
        best: 0,
        verdict: 'three labels saved in four at the boundary; blind off it',
      },
      {
        method: 'random sampling',
        values: ['44', '0.8742', '0.8759 ± 0.0068', '0.838', '2.10'],
        verdict: 'no scoring pass, no blind spot, three times the labels',
      },
      {
        method: 'farthest-first diversity seed, then least confidence',
        values: ['·', '·', '·', '0.891', '·'],
        best: 3,
        verdict: 'six seeds that cover the pool find the hidden cluster',
      },
      {
        method: 'density-weighted least confidence',
        values: ['·', '·', '·', '·', '0.00'],
        best: 4,
        verdict: 'no noise queried; curve unchanged within one standard error',
      },
    ],
    source:
      'python solutions/uncertainty_sampling_least_confidence_query.py prints these tables and asserts: in four dimensions the area under the curve beats random by more than 2.5 standard errors and the target comes in fewer labels; the plane gains less than four dimensions; with a wide gap neither strategy needs more labels; random scores zero pool points and least confidence exactly the sum of the shrinking pool sizes; the three criteria agree on every two-class round and disagree on some three-class rounds; the hidden cluster gets no query and scores below 0.05 where random and the diversity seed score higher, every farthest-first seed of six landing in it; density weighting cuts noise queries below plain least confidence, below random, with the curve unchanged within two standard errors.',
  },

  figure: (
    <Figure
      id="fig-uncertainty-sampling"
      aspect="16 / 7"
      caption="Left: the hidden-cluster pool. Two seed labels (circled) give the amber boundary near x = 0; the twenty class-1 points at (−5, 6) sit far on its confident side, score near zero, and are never queried; a farthest-first seed reaches them and rotates the boundary (blue). Right: mean test accuracy against labels in four dimensions: least confidence (blue) reaches 0.903 at 13 labels, random (dim) at 44; dashed, the Bayes accuracy 0.933."
      cite={{
        text: 'D. D. Lewis, W. A. Gale, "A sequential algorithm for training text classifiers," SIGIR 1994, DOI 10.1145/188490.188495. B. Settles, "Active Learning Literature Survey," University of Wisconsin-Madison technical report 1648, 2009. B. Settles, M. Craven, "An analysis of active learning strategies for sequence labeling tasks," EMNLP 2008.',
        href: 'https://doi.org/10.1145/188490.188495',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="A pool with a hidden cluster that least confidence never queries, and learning curves of least confidence against random sampling in four dimensions">
        {(() => {
          const sx = (x) => 150 + x * 18;
          const sy = (y) => 190 - y * 18;
          const pts0 = [[-2.4, 0.6], [-1.6, -0.5], [-2.9, -0.2], [-1.3, 0.9], [-2.1, -1.1], [-1.8, 0.2], [-2.6, 1.2], [-1.1, -0.3], [-2.2, 0.0], [-3.1, 0.5], [-1.5, -1.3], [-2.0, 1.5]];
          const pts1 = [[2.3, 0.4], [1.5, -0.7], [2.8, 0.1], [1.2, 0.8], [2.1, -1.2], [1.9, 0.3], [2.6, 1.1], [1.0, -0.2], [2.2, -0.4], [3.0, 0.6], [1.6, 1.3], [1.4, -1.4]];
          const hid = [[-5.2, 6.1], [-4.7, 5.8], [-5.0, 6.4], [-5.4, 5.6], [-4.8, 6.3], [-5.1, 5.9]];
          const rx = 390;
          const ry = 230;
          const rw = 230;
          const rh = 170;
          const X = (n) => rx + ((n - 2) / 40) * rw;
          const Y = (a) => ry - ((a - 0.8) / 0.15) * rh;
          const unc = [[2, 0.80], [10, 0.8991], [20, 0.9165], [42, 0.9265]];
          const rnd = [[2, 0.80], [10, 0.8665], [20, 0.8742], [42, 0.9036]];
          const poly = (pts, color, dash) => (
            <polyline points={pts.map(([n, a]) => `${X(n)},${Y(a)}`).join(' ')} fill="none" stroke={color} strokeWidth="2" strokeDasharray={dash || 'none'} />
          );
          return (
            <g fontFamily="ui-monospace, monospace">
              <text x="20" y="22" fill="#9aa5bd" fontSize="10">the hidden-cluster pool: class 0 left, class 1 right, class 1 again at (-5, 6)</text>
              {pts0.map(([x, y], i) => <circle key={`a${i}`} cx={sx(x)} cy={sy(y)} r="3" fill="none" stroke="#9aa5bd" />)}
              {pts1.map(([x, y], i) => <circle key={`b${i}`} cx={sx(x)} cy={sy(y)} r="3" fill="#9aa5bd" />)}
              {hid.map(([x, y], i) => <circle key={`h${i}`} cx={sx(x)} cy={sy(y)} r="3" fill="#e2606c" />)}
              <circle cx={sx(-2.2)} cy={sy(0.0)} r="7" fill="none" stroke="#62d98a" strokeWidth="2" />
              <circle cx={sx(2.2)} cy={sy(-0.4)} r="7" fill="none" stroke="#62d98a" strokeWidth="2" />
              <line x1={sx(0.1)} y1={sy(-2.5)} x2={sx(-0.1)} y2={sy(7.5)} stroke="#f0b94b" strokeWidth="2" />
              <line x1={sx(-7.5)} y1={sy(7.5)} x2={sx(2.5)} y2={sy(-2.5)} stroke="#5da2ff" strokeWidth="2" strokeDasharray="5 3" />
              <text x={sx(-7.4)} y={sy(4.6)} fill="#e2606c" fontSize="9">hidden: 0 of 40 queries, 0.000</text>
              <text x={sx(0.4)} y={sy(7.0)} fill="#f0b94b" fontSize="9">least-confidence boundary</text>
              <text x={sx(-2.6)} y={sy(-2.1)} fill="#5da2ff" fontSize="9">farthest-first seed: 0.891</text>
              <line x1={rx} y1={ry} x2={rx + rw} y2={ry} stroke="#9aa5bd" strokeOpacity="0.6" />
              <line x1={rx} y1={ry - rh} x2={rx} y2={ry} stroke="#9aa5bd" strokeOpacity="0.6" />
              <line x1={rx} y1={Y(0.933)} x2={rx + rw} y2={Y(0.933)} stroke="#62d98a" strokeWidth="1.5" strokeDasharray="4 3" />
              <line x1={rx} y1={Y(0.903)} x2={rx + rw} y2={Y(0.903)} stroke="#9aa5bd" strokeWidth="1" strokeDasharray="2 3" />
              {poly(rnd, '#9aa5bd')}
              {poly(unc, '#5da2ff')}
              <circle cx={X(13)} cy={Y(0.903)} r="4" fill="#5da2ff" />
              <circle cx={X(42)} cy={Y(0.9036)} r="4" fill="#9aa5bd" />
              <text x={rx} y="22" fill="#9aa5bd" fontSize="10">test accuracy vs labels, four dimensions, 30 seeds</text>
              <text x={rx} y="36" fill="#5da2ff" fontSize="10">blue: least confidence, 0.903 at 13 labels</text>
              <text x={rx} y="50" fill="#9aa5bd" fontSize="10">dim: random, 0.903 at 44 labels</text>
              <text x={rx + rw - 62} y={Y(0.933) - 4} fill="#62d98a" fontSize="9">Bayes 0.933</text>
              {[2, 10, 20, 30, 42].map((n) => <text key={n} x={X(n) - 6} y={ry + 13} fill="#9aa5bd" fontSize="9">{n}</text>)}
              {[0.80, 0.85, 0.90, 0.95].map((a) => <text key={a} x={rx - 30} y={Y(a) + 3} fill="#9aa5bd" fontSize="9">{a.toFixed(2)}</text>)}
              <text x={rx + rw - 40} y={ry + 26} fill="#9aa5bd" fontSize="9">labels</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'uncertainty_sampling_least_confidence_query.py',
  Viz: ActiveLearningViz,
  narration,
};
