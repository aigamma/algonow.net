import NaiveBayesViz from '../viz/NaiveBayesViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/naive_bayes_laplace_smoothing.py?raw';
import { narration } from './naive-bayes-laplace-smoothing.narration.js';

export const content = {
  given:
    'Documents over a 5,000-word vocabulary, drawn from two hidden class distributions: Zipfian word frequencies, each class boosting its own 200 topic words. Label a document from its word counts, with 1,000 training documents, about 40 words each, so that only 1,512 of the 5,000 words have been seen in both classes and most test documents contain a word one class has never seen.',
  task: 'Naive Bayes. Score each class by its prior times the product of per-word likelihoods, as if every word were drawn independently given the class, and pick the larger; in logs, a sum. Laplace smoothing is the heuristic: estimate each word’s class probability as (count + α) / (total + αV) rather than count / total, so a word never seen in a class’s training documents costs a bounded penalty instead of the whole verdict.',
  constraint:
    'Measured against the generating distributions, whose exact classifier scores 95.6% on 2,000 test documents: multinomial naive Bayes with α = 1 scores 90.2%. The smoothing sweep: α = 0 zeroes a class in 96.0% of test documents and scores 50.2%, the majority rate; 0.01 / 0.1 / 0.3 / 1 / 3 / 10 / 100 score 75.9 / 84.1 / 87.4 / 90.2 / 88.9 / 82.0 / 60.0%. Calibration: mean confidence 0.930 at accuracy 0.902; doubling every count, which adds no evidence, raises the confidence to 0.963 at accuracy 0.904. The learning curve at 20 / 50 / 200 / 500 / 1,000 documents: naive Bayes 57.3 / 89.1 / 87.8 / 87.9 / 90.2%, logistic regression 69.8 / 82.8 / 88.8 / 88.6 / 90.9%. Raw probability products survive 40-word documents (smallest winning product 1.2e-188) and underflow to zero for both classes on 68% of 176-word documents and 100% of 419-word ones.',

  origins: (
    <p>
      The smoothing is older than the classifier: Laplace&apos;s rule of
      succession (<strong>1774</strong>, and the sunrise problem in the
      1814 Essai philosophique) adds one imaginary success and one
      failure to every count, and Lidstone (1920) generalized the one
      to α. Maron (1961, &quot;Automatic indexing: an experimental
      inquiry,&quot; JACM) built the first Bayesian text classifier;
      Mosteller and Wallace (1963) settled the authorship of the
      disputed Federalist Papers with word-count likelihoods. The
      method became the workhorse of the 1990s: Lewis (1998) on its
      &quot;independence assumption&quot;, McCallum and Nigam (1998) on
      multinomial versus Bernoulli event models, Sahami, Dumais,
      Heckerman, and Horvitz (1998) on spam, and Paul Graham&apos;s
      &quot;A Plan for Spam&quot; (2002), which put it in every mail
      client. Domingos and Pazzani (1997) explained why it classifies
      well while its probabilities are wrong, and Ng and Jordan (2002)
      showed the generative model reaching its asymptote with far less
      data than the discriminative one, which the learning curve on
      this page reproduces.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>factorization</strong>: P(class | words) ∝
      P(class) Π P(word | class), the independence lie that turns a
      5,000-dimensional density into 5,000 counts. The referee is the
      generating model itself, whose exact classifier scores 95.6%;
      naive Bayes trained on 1,000 documents scores{' '}
      <strong>90.2%</strong>, with only 1,512 of the 5,000 words seen in
      both classes. The lie is measured, not excused: mean confidence
      0.930 at accuracy 0.902 on the real documents, and when every
      count is doubled, which adds no information, the confidence rises
      to 0.963 while the accuracy stays at 0.904. Correlated evidence is
      counted twice, so the posteriors are sharper than the truth; the
      decisions, which only need the sign of the log-odds, survive
      (Domingos and Pazzani). The learning curve is the other half of
      the story: at 50 documents naive Bayes scores 89.1% where logistic
      regression scores 82.8%, and at 1,000 the discriminative model
      has caught up, 90.9% to 90.2%.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>pseudo-count</strong>. With α = 0 a word that
      one class never produced in training has likelihood zero for that
      class, and the product is zero no matter what the other 39 words
      say: measured, <strong>96.0% of test documents</strong> have such a
      word for at least one class, and the classifier scores 50.2%, the
      majority rate. Add α to every count and αV to every total and the
      unseen word costs log(α / (total + αV)) instead of everything.
      The sweep shows both cliffs: 0.01 scores 75.9%, 0.1 scores 84.1%,
      1 scores 90.2%, the best of the eight, 10 scores 82.0%, and 100,
      which adds half a million pseudo-tokens to 40,000 real ones,
      scores 60.0%. Laplace&apos;s α = 1 is not a law; it is a good
      default that this vocabulary and this training size happen to
      favor, and the file&apos;s note records that at 20 training
      documents it over-smooths (57.3%) while α = 0.1 scores 72.5%.
    </p>
  ),

  picture: (
    <p>
      A librarian sorting letters into two trays by the words they
      contain, keeping a tally of how often each word appeared in each
      tray so far. A new letter arrives; for each tray, multiply the
      tallies&apos; frequencies of its words and pick the bigger
      product. Then a letter contains a word the left tray has never
      seen. Frequency zero, product zero, the left tray is eliminated
      by one word, however strongly the other forty pointed there. The
      fix is a small act of imagination: pretend every word has been
      seen once in every tray before the first letter arrived. The
      never-seen word now counts as rare rather than impossible, and
      the other forty words get their vote back.
    </p>
  ),

  steps: [
    <>
      <strong>Count:</strong> for each class, the number of training
      documents and the count of every word.
    </>,
    <>
      <strong>Smooth:</strong> P(w | c) = (count<sub>c</sub>(w) + α) /
      (total<sub>c</sub> + αV); α = 1 is Laplace.
    </>,
    <>
      <strong>Score:</strong> log P(c) + Σ<sub>w</sub> n<sub>w</sub> log
      P(w | c), a sum of logs, never a product.
    </>,
    <>
      <strong>Decide:</strong> the class with the larger score; the
      softmax of the scores is the (overconfident) posterior.
    </>,
    <>
      <strong>Check:</strong> accuracy against held-out labels, and
      confidence against accuracy, before trusting the probabilities.
    </>,
  ],

  signals: [
    <>
      <strong>Many sparse features, few examples:</strong> text,
      categorical logs, anything where 5,000 counts beat 5,000 weights
      fit from 50 documents.
    </>,
    <>
      <strong>A first baseline in one pass:</strong> training is
      counting; no epochs, no learning rate, no convergence.
    </>,
    <>
      <strong>Decisions, not probabilities:</strong> the ranking is
      good, the confidence is inflated; calibrate before you show a
      number.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>the majority class</strong>, 50.9%
      here, which is also exactly what unsmoothed naive Bayes achieves
      once one unseen word per document has eliminated a class at
      random.
    </>
  ),

  strength: (
    <>
      <strong>Counting beats fitting when data is scarce.</strong> 89.1%
      from 50 documents against logistic regression&apos;s 82.8%, 90.2%
      from 1,000 against a ceiling of 95.6%, one pass over the data,
      and a fix for unseen words that costs one parameter.
    </>
  ),
  weakness: (
    <>
      <strong>Wrong probabilities, one knob, and a ceiling it cannot
      reach.</strong> Confidence 0.930 at accuracy 0.902, and 0.963 on the
      same decisions when the evidence is merely repeated; α set by
      hand, with both cliffs measured (75.9% at 0.01, 60.0% at 100); and
      the independence assumption caps it below the discriminative
      model once data is plentiful, 90.2% to 90.9% at 1,000 documents
      and further behind with more.
    </>
  ),

  problem: 'Probabilistic classification',
  problemSlug: 'classification',
  rivals: [
    {
      name: 'Naive Bayes × Laplace smoothing',
      isThisUnit: true,
      algoName: 'Naive Bayes',
      cost: 'one counting pass; V counts per class',
      wins: (
        <>
          <strong>89.1% from 50 documents</strong>, 90.2% from 1,000,
          trained by counting.
        </>
      ),
      costs: (
        <>
          Inflated confidence; α by hand; below the discriminative model
          with plenty of data.
        </>
      ),
      when: 'Sparse high-dimensional data with few labels, or a baseline you need today.',
    },
    {
      name: 'Logistic regression',
      algoName: 'Logistic regression',
      cost: 'gradient passes over n × features',
      wins: (
        <>
          Fits the decision boundary directly and needs no independence:
          90.9% at 1,000 documents, and calibrated probabilities.
        </>
      ),
      costs: (
        <>
          Needs data: 82.8% at 50 documents, 69.8% at 20; epochs, a
          learning rate, regularization.
        </>
      ),
      when: 'Thousands of labeled examples and a need for probabilities you can act on.',
    },
    {
      name: 'k-nearest neighbors',
      algoName: 'k-nearest neighbors',
      cost: 'n similarities per query',
      wins: (
        <>
          No model at all; any similarity, any number of classes,
          nonlinear by construction.
        </>
      ),
      costs: (
        <>
          70.7% here by cosine on 800 documents: sparse 40-word
          documents rarely share enough words to be near anything.
        </>
      ),
      when: 'Dense representations (embeddings) where near really means similar, and a small corpus.',
    },
    {
      name: 'Support vector machine',
      algoName: 'Support vector machine',
      cost: 'quadratic program, or SGD on the hinge loss',
      wins: (
        <>
          The strongest linear text classifier of its era (Joachims
          1998): margins tolerate the many irrelevant words.
        </>
      ),
      costs: (
        <>
          No probabilities without a second fit; a regularization
          constant to tune; nothing to read.
        </>
      ),
      when: 'Accuracy on text with enough labels, and when a margin matters more than a probability.',
    },
  ],
  neverUse: {
    name: 'Raw probability products',
    why: (
      <>
        The formula says multiply, so the first implementation
        multiplies: prior times forty likelihoods, each a few
        thousandths. It works on this page&apos;s 40-word documents,
        where the smallest winning product is 1.2 × 10⁻¹⁸⁸, one order of
        magnitude at a time toward the floor of double precision at
        10⁻³⁰⁸. Merge documents to about 176 words and{' '}
        <strong>68% of them underflow to 0.0 for both classes</strong>;
        at about 419 words, 100% do, and the argmax of (0.0, 0.0) is a
        coin. Nothing warns you: no exception, no NaN, just a classifier
        that silently becomes the majority rule on long inputs. Sum the
        logs. The scores are then a few hundred negative units apart and
        the decision survives any length.
      </>
    ),
  },

  contest: {
    instance:
      '1,000 training and 2,000 test documents over a 5,000-word vocabulary, two classes each boosting 200 topic words 3×, about 40 words per document; referee: the generating distributions (exact classifier 95.6%, majority 50.9%)',
    columns: ['accuracy', 'documents with a zeroed class', 'note'],
    rows: [
      {
        method: 'naive Bayes, α = 0',
        values: ['50.2%', '96.0%', 'one unseen word ends it'],
        verdict: 'the majority rate',
      },
      {
        method: 'α = 0.01 / 0.1 / 0.3',
        values: ['75.9 / 84.1 / 87.4%', '0%', 'under-smoothed'],
        verdict: 'rare words still shout',
      },
      {
        method: 'α = 1 (Laplace)',
        isThisUnit: true,
        values: ['90.2%', '0%', 'ceiling 95.6%'],
        best: 0,
        verdict: 'the best of eight settings',
      },
      {
        method: 'α = 3 / 10 / 100',
        values: ['88.9 / 82.0 / 60.0%', '0%', 'over-smoothed'],
        verdict: '100 adds half a million pseudo-tokens',
      },
      {
        method: 'confidence vs accuracy; counts doubled',
        values: ['0.902; 0.904', '·', 'confidence 0.930 → 0.963'],
        verdict: 'the independence lie, measured',
      },
      {
        method: 'learning curve 20 / 50 / 200 / 500 / 1,000',
        values: ['NB 57.3 / 89.1 / 87.8 / 87.9 / 90.2%', '·', 'logistic 69.8 / 82.8 / 88.8 / 88.6 / 90.9%'],
        verdict: 'generative leads early, discriminative catches up',
      },
      {
        method: '7-NN by cosine (800 train, 300 test)',
        values: ['70.7%', '·', 'sparse documents are far from everything'],
        verdict: 'a weak fit for word counts',
      },
      {
        method: 'raw products, 40 / 176 / 419 words',
        values: ['·', '0 / 68 / 100% underflow', 'smallest winning product 1.2e-188'],
        verdict: 'sum the logs',
      },
    ],
    source:
      'python solutions/naive_bayes_laplace_smoothing.py prints this table and asserts: naive Bayes within 7 points of the exact classifier and 30 above the majority; α = 0 zeroing a class in more than 90% of documents and scoring under 60%; α = 1 the best of the sweep and α = 100 more than 20 points behind it; doubling counts changing accuracy by under a point while raising confidence by more than 0.02; naive Bayes ahead of logistic regression by 3 points at 50 documents and logistic within a point of it or ahead at 1,000; and raw products underflowing on none of the 40-word documents, between 30 and 95% of the 176-word ones, and more than 95% of the 419-word ones.',
  },

  figure: (
    <Figure
      id="fig-nb-smoothing"
      aspect="16 / 7"
      caption="Left: accuracy against the pseudo-count α on a log axis. At α = 0 an unseen word zeroes a class in 96% of documents and the classifier is a coin; the peak is Laplace’s α = 1 at 90.2%, and α = 100 drowns 40,000 real tokens in 500,000 imaginary ones. Right: the learning curve. Naive Bayes reaches 89.1% from 50 documents where logistic regression scores 82.8%; by 1,000 documents the discriminative model has caught up, 90.9% to 90.2%, under a ceiling of 95.6%."
      cite={{
        text: 'P.-S. Laplace, "Mémoire sur la probabilité des causes par les événements," 1774. M. E. Maron, "Automatic indexing: an experimental inquiry," JACM 8(3), 1961. DOI 10.1145/321075.321084. A. Ng, M. Jordan, "On discriminative vs. generative classifiers," NeurIPS 2001. P. Domingos, M. Pazzani, "On the optimality of the simple Bayesian classifier under zero-one loss," Machine Learning 29, 1997.',
        href: 'https://doi.org/10.1145/321075.321084',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="Accuracy against the smoothing constant on the left, peaking at alpha one; on the right, accuracy against training size for naive Bayes and logistic regression">
        {(() => {
          const x0 = 40;
          const y0 = 230;
          const w = 250;
          const h = 180;
          const alphas = [0.01, 0.1, 0.3, 1, 3, 10, 100];
          const acc = [75.9, 84.1, 87.4, 90.2, 88.9, 82.0, 60.0];
          const X = (a) => x0 + ((Math.log10(a) + 2) / 4) * w;
          const Y = (v) => y0 - ((v - 45) / 55) * h;
          return (
            <g>
              <line x1={x0} y1={y0} x2={x0 + w} y2={y0} stroke="#9aa5bd" strokeOpacity="0.5" />
              <line x1={x0} y1={y0} x2={x0} y2={y0 - h} stroke="#9aa5bd" strokeOpacity="0.5" />
              <line x1={x0} y1={Y(95.6)} x2={x0 + w} y2={Y(95.6)} stroke="#62d98a" strokeOpacity="0.6" strokeDasharray="2 3" />
              <text x={x0 + 4} y={Y(95.6) - 4} fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="9">exact classifier 95.6%</text>
              <polyline points={alphas.map((a, i) => `${X(a)},${Y(acc[i])}`).join(' ')} fill="none" stroke="#f0b94b" strokeWidth="2" />
              {alphas.map((a, i) => <circle key={a} cx={X(a)} cy={Y(acc[i])} r="3" fill={a === 1 ? '#5da2ff' : '#f0b94b'} />)}
              <circle cx={x0 - 12} cy={Y(50.2)} r="4" fill="#e2606c" />
              <text x={x0 - 30} y={Y(50.2) - 8} fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="9">α = 0: 50.2%</text>
              <text x={X(1) - 30} y={Y(90.2) - 10} fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="9">α = 1: 90.2%</text>
              {[0.01, 0.1, 1, 10, 100].map((a) => (
                <text key={a} x={X(a) - 10} y={y0 + 12} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">{a}</text>
              ))}
              <text x={x0 + 90} y={y0 + 26} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">pseudo-count α</text>
            </g>
          );
        })()}
        {(() => {
          const x0 = 360;
          const y0 = 230;
          const w = 250;
          const h = 180;
          const sizes = [20, 50, 200, 500, 1000];
          const nb = [57.3, 89.1, 87.8, 87.9, 90.2];
          const lr = [69.8, 82.8, 88.8, 88.6, 90.9];
          const X = (n) => x0 + ((Math.log10(n) - 1.3) / 1.7) * w;
          const Y = (v) => y0 - ((v - 45) / 55) * h;
          return (
            <g>
              <line x1={x0} y1={y0} x2={x0 + w} y2={y0} stroke="#9aa5bd" strokeOpacity="0.5" />
              <line x1={x0} y1={y0} x2={x0} y2={y0 - h} stroke="#9aa5bd" strokeOpacity="0.5" />
              <line x1={x0} y1={Y(95.6)} x2={x0 + w} y2={Y(95.6)} stroke="#62d98a" strokeOpacity="0.6" strokeDasharray="2 3" />
              <polyline points={sizes.map((n, i) => `${X(n)},${Y(nb[i])}`).join(' ')} fill="none" stroke="#5da2ff" strokeWidth="2" />
              <polyline points={sizes.map((n, i) => `${X(n)},${Y(lr[i])}`).join(' ')} fill="none" stroke="#9aa5bd" strokeWidth="1.5" strokeDasharray="4 3" />
              <text x={X(50) + 6} y={Y(89.1) - 8} fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="9">naive Bayes 89.1% at 50</text>
              <text x={X(50) + 6} y={Y(82.8) + 14} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">logistic 82.8% at 50</text>
              <text x={X(500) - 20} y={Y(90.9) - 20} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">90.9 vs 90.2 at 1,000</text>
              {sizes.map((n) => (
                <text key={n} x={X(n) - 10} y={y0 + 12} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">{n}</text>
              ))}
              <text x={x0 + 80} y={y0 + 26} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">training documents</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'naive_bayes_laplace_smoothing.py',
  Viz: NaiveBayesViz,
  narration,
};
