import MatrixFactorizationViz from '../viz/MatrixFactorizationViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/matrix_factorization_stochastic_gradient_descent.py?raw';
import { narration } from './matrix-factorization-stochastic-gradient-descent.narration.js';

export const content = {
  given:
    'A users × items table that is almost entirely blank: each person rated a few dozen of thousands of items. Predict the ratings they never gave, well enough to rank what to show next, and never mistake a blank for a zero.',
  task: 'Matrix factorization. The algorithm assumes the full table is nearly low rank: r̂(u, i) = μ + b_u + b_i + p_u · q_i, with a short taste vector per user, a short trait vector per item, and two biases. The heuristic is stochastic gradient descent (Funk 2006; Koren, Bell, Volinsky 2009): visit the observed ratings one at a time, take the error, nudge the two vectors and two biases a step against it with L2 shrinkage, decay the step each pass. The empty cells are never touched; the fit costs (observed ratings) × rank per pass and no dense matrix is ever formed.',
  constraint:
    'Pure Python. Ratings are PLANTED from a rank-3 model over 150 users × 100 items with Gaussian noise 0.5 (3,838 observed, 754 held out), so the oracle is exact. MF at rank 3: held-out RMSE 0.583 against the noise floor 0.5, 0.328 against the noiseless table; biases alone 1.227, global mean 1.264. Over 5 seeds: MF 0.578 ± 0.014, ALS 0.577 ± 0.014, user k-NN 0.950 ± 0.021, biases 1.224 ± 0.030. At the true rank λ = 0 costs nothing (0.581); at k = 20 it memorizes (train 0.048, held-out 1.060) where λ 0.05 gives 0.697. Rank sweep bottoms at 3 (1.053 at k = 1, 0.697 at k = 20). Cold users 1.119 vs warm 0.587. Zero-filled rank-3 SVD 2.831. Step 0.5 diverges in epoch 1. 230,280 SGD updates, about 1.84M multiply-adds. 9.9 s.',

  origins: (
    <p>
      The Netflix Prize (2006) offered a million dollars for a 10% drop in
      RMSE on a hundred million ratings. Within weeks <strong>Simon
      Funk</strong> (Brandyn Webb) posted &quot;Netflix Update: Try This at
      Home&quot;: an incremental SVD that learned user and item vectors one
      rating at a time by gradient descent and ignored the missing cells. It
      became the backbone of nearly every serious entry. Koren, Bell, and Volinsky, who shared the 2009
      prize, wrote the canonical account in <em>IEEE Computer</em>: add the
      global mean and two biases, regularize everything, train by SGD or
      alternating least squares, extend to implicit feedback (Hu, Koren,
      Volinsky 2008). Latent factor models are older; the prize added scale,
      a public yardstick, and the lesson that biases alone explain a
      surprising share of the error.
    </p>
  ),

  algoRole: (
    <p>
      Owns <strong>the model and its oracles</strong>. Because the ratings
      are planted from a rank-3 model with noise 0.5, held-out error has a
      floor no predictor can beat. MF at rank 3 reaches 0.583 against that
      0.5, and its error against the hidden noiseless table is 0.328: most of
      the remaining gap is noise it correctly refused to fit. The mean scores
      1.264 and the biases 1.227, so here the factors carry the signal.
      Alternating least squares, the exact-solve route to the same
      objective, lands at 0.577 against SGD&apos;s 0.578 over five seeds: a
      statistical tie, as it must be. The rank sweep bottoms out exactly at
      the planted rank.
    </p>
  ),
  heurRole: (
    <p>
      Owns <strong>the optimizer and its knobs</strong>. One rating per step:
      230,280 updates over 60 passes, about 1.84 million multiply-adds, a step
      of 0.05 decaying 3% per pass, shrinkage 0.05. The step size breaks it:
      at 0.5 the error overflowed in the first pass. The shrinkage saves it
      only when capacity exceeds the data: at the true rank λ = 0 scored
      0.581 against 0.583 (the decaying step is regularization enough), but
      at rank 20 the unshrunk model drove training error to 0.048 and
      held-out error to 1.060 while λ = 0.05 held it to 0.697 (early stopping
      would have stopped at epoch 11, 0.925).
    </p>
  ),

  picture: (
    <p>
      A cinema with a hundred thousand members and a mostly blank notebook
      for each. Suppose taste has only a few dimensions: slow films, loud
      films, trust in critics. Then every member is a short list of numbers,
      every film is a short list, and a rating is how well the lists line up
      plus the member&apos;s generosity plus the film&apos;s appeal. The
      gradient recipe learns the lists from the blanks: pick one filled
      cell, see how far the guess missed, slide the member a hair toward the
      film and the film a hair toward the member, move on. Never write into
      a blank; the blanks are the question. Reading a blank as a zero tells
      the model that everyone hates everything they have not seen.
    </p>
  ),

  steps: [
    <>
      <strong>Initialize:</strong> μ = mean observed rating; biases 0; factor
      vectors small random (σ 0.3 here); step γ = 0.05, shrinkage λ = 0.05.
    </>,
    <>
      <strong>One pass:</strong> shuffle the observed ratings; for each (u, i, r):
      e = r − r̂; b_u += γ(e − λb_u); b_i += γ(e − λb_i); p_u += γ(e q_i − λp_u);
      q_i += γ(e p_u − λq_i). Cost per update O(k).
    </>,
    <>
      <strong>Schedule:</strong> γ ← 0.97γ after each pass; track held-out RMSE and
      stop when it stops falling (epoch 11 of the rank-20 run; never needed at rank 3).
    </>,
    <>
      <strong>Recommend:</strong> score every unrated item for the user with the same
      formula and rank; cold users fall back to μ + b_i.
    </>,
  ],

  signals: [
    <>
      <strong>A sparse interaction table</strong> whose rows and columns plausibly
      share a few hidden dimensions: ratings, purchases, clicks, playlists.
    </>,
    <>
      <strong>A strong baseline to beat:</strong> the biases-to-factors gap (1.227
      to 0.583 here) measures how much latent structure the data holds.
    </>,
    <>
      <strong>Streaming updates:</strong> one rating at a time, O(k) memory per
      update, no dense matrix, so the model can learn as the log grows.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>biases only</strong>: μ + b_u + b_i fit by
      the same SGD at rank 0, held-out RMSE 1.227 against MF&apos;s 0.583; on
      this planted data the factors hold the signal, and the gap is the whole
      case for them.
    </>
  ),

  strength: (
    <>
      <strong>Noise-floor accuracy from blanks alone.</strong> 0.583 against a
      floor of 0.5 (0.328 against the noiseless truth), a tie with ALS,
      0.37 better than nearest neighbors; one rating per update, no dense
      matrix, the rank recovered by the sweep.
    </>
  ),
  weakness: (
    <>
      <strong>Blind to newcomers and ruled by knobs.</strong> Cold users 1.119
      against 0.587 warm; rank 20 without shrinkage memorizes (train 0.048,
      held-out 1.060); step 0.5 diverges in the first pass; the factors
      predict but do not explain, and drift as the catalog moves.
    </>
  ),

  problem: 'Recommendation',
  problemSlug: 'recommendation',
  rivals: [
    {
      name: 'Matrix factorization × Stochastic gradient descent',
      isThisUnit: true,
      algoName: 'Matrix factorization',
      cost: 'O(observed × k) per pass; 1.84M multiply-adds here',
      wins: (
        <>
          <strong>Held-out 0.578 ± 0.014 against a 0.5 noise floor</strong>; biases
          1.224, k-NN 0.950; the empty cells cost nothing.
        </>
      ),
      costs: (
        <>
          Step size, shrinkage, rank, and schedule all matter; cold users
          1.119; rank 20 unshrunk memorizes to 1.060.
        </>
      ),
      when: 'A sparse explicit-rating table with latent structure and a budget that favors streaming updates.',
    },
    {
      name: 'Alternating least squares × Implicit-feedback weighting',
      algoName: 'Alternating least squares',
      cost: 'per sweep: a k×k ridge solve per user and per item; 2.53M multiply-adds here',
      wins: (
        <>
          The same objective by exact solves: 0.577 ± 0.014, a tie with SGD, no
          step size to tune; parallel across users and items; the natural form
          for confidence-weighted implicit data.
        </>
      ),
      costs: (
        <>
          More arithmetic per sweep (2.53M vs 1.84M) plus 3,750 small solves;
          each solve needs all of a row&apos;s ratings at once.
        </>
      ),
      when: 'Implicit counts with confidence weights, or a cluster that can solve rows in parallel.',
    },
    {
      name: 'User-based collaborative filtering × Cosine neighbor similarity',
      algoName: 'User-based collaborative filtering',
      cost: 'O(users²) similarities, then k neighbors per prediction',
      wins: (
        <>
          No training phase and a human-readable reason (&quot;people like you
          rated it so&quot;); 0.950 held-out, ahead of the biases.
        </>
      ),
      costs: (
        <>
          0.37 behind the factors; quadratic in the population; blind when two
          users share too few items.
        </>
      ),
      when: 'Small catalogs, cold systems, or recommendations that must come with an explanation.',
    },
    {
      name: 'SVD++ × Implicit-feedback factors',
      algoName: 'SVD++',
      cost: 'one extra sum over the user’s touched items per update',
      wins: (
        <>
          The same factor model plus a term for which items a user touched at
          all, so the footprint of attention becomes a signal.
        </>
      ),
      costs: (
        <>
          A longer update and one more hyperparameter; nothing to gain when
          the implicit footprint equals the explicit one, as here.
        </>
      ),
      when: 'Real logs where what people touched says more than the scores they typed.',
    },
  ],
  neverUse: {
    name: 'A dense SVD of the zero-filled table',
    why: (
      <>
        Fill every blank with zero and take the rank-3 truncated SVD: the
        textbook low-rank method, the same rank, the same data. Held-out RMSE
        <strong> 2.831</strong>, worse than predicting the global mean (1.264)
        for everyone, because the fit spends its capacity reproducing a wall
        of fake zeros and learns that unseen means hated. The gradient recipe
        never reads a blank cell, which is the entire point of the method. The
        second trap is the step size: γ = 0.5 overflowed in the first pass,
        γ = 0.05 converged in sixty. And when training error on noisy data
        heads toward zero (0.048 at rank 20 without shrinkage) you are watching
        memorization, not learning.
      </>
    ),
  },

  contest: {
    instance:
      '150 users × 100 items planted at rank 3 with noise 0.5; 3,838 observed ratings, 754 held out; RMSE as mean ± standard error over 5 seeds; work counted in multiply-adds for one fit',
    columns: ['held-out RMSE', 'vs noise floor 0.5', 'work per fit', 'models'],
    rows: [
      {
        method: 'matrix factorization, SGD, k = 3, λ 0.05',
        isThisUnit: true,
        values: ['0.578 ± 0.014', '+0.08', '1.84M, one rating per step', 'μ, biases, 3 latent factors'],
        verdict: 'the reference: noise-floor accuracy from the observed cells alone',
      },
      {
        method: 'alternating least squares, k = 3, λ 0.05',
        values: ['0.577 ± 0.014', '+0.08', '2.53M + 3,750 4×4 solves', 'the same model, exact row solves'],
        best: 0,
        verdict: 'a tie; wins when rows can be solved in parallel',
      },
      {
        method: 'user-based k-NN, Pearson, 20 neighbors',
        values: ['0.950 ± 0.021', '+0.45', 'users² similarities', 'neighbors, no latent space'],
        verdict: 'explainable, cold-friendly, far less accurate',
      },
      {
        method: 'biases only (μ + b_u + b_i)',
        values: ['1.224 ± 0.030', '+0.72', '0.46M', 'generosity and appeal, no interaction'],
        verdict: 'the honest baseline the factors must beat',
      },
      {
        method: 'global mean',
        values: ['1.292 ± 0.033', '+0.79', 'one pass', 'nothing'],
        verdict: 'the floor of the ceiling',
      },
      {
        method: 'rank-3 SVD of the zero-filled table',
        values: ['2.831', '+2.33', 'subspace iteration over all 15,000 cells', 'fake zeros'],
        verdict: 'never: blanks are the question, not data',
      },
    ],
    source:
      'python solutions/matrix_factorization_stochastic_gradient_descent.py prints these numbers and asserts: MF held-out RMSE within 0.12 above the noise floor and under 0.75 × noise against the truth; over 5 seeds MF beats k-NN by 0.05, biases by 0.1, and ties ALS within 0.05; λ = 0 moves the rank-3 result under 0.02 while at rank 20 it drives training error under 0.1 and held-out 0.1 above its best epoch; the sweep bottoms at the planted rank; cold users worse than warm; the zero-filled SVD loses to the mean; step 0.5 diverges.',
  },

  figure: (
    <Figure
      id="fig-mf-sgd"
      aspect="16 / 7"
      caption="Left: held-out RMSE on the planted data against the 0.5 noise floor (green); the zero-filled SVD (red) is clipped. Right: the rank sweep at λ 0.05 with the unshrunk rank-20 run (red); the minimum sits at the planted rank."
      cite={{
        text: 'Y. Koren, R. Bell, and C. Volinsky, "Matrix factorization techniques for recommender systems," IEEE Computer 42(8), 2009, DOI 10.1109/MC.2009.263. S. Funk, "Netflix Update: Try This at Home," 2006. Y. Hu, Y. Koren, and C. Volinsky, "Collaborative filtering for implicit feedback datasets," ICDM 2008, DOI 10.1109/ICDM.2008.22. R. M. Bell and Y. Koren, "Lessons from the Netflix Prize challenge," SIGKDD Explorations 9(2), 2007.',
        href: 'https://doi.org/10.1109/MC.2009.263',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="Held-out error by method against the noise floor, and the rank sweep with the unregularized rank-20 run">
        {(() => {
          const y0 = 230;
          const BY = (v) => y0 - (Math.min(v, 1.6) / 1.6) * 180;
          const bars = [['mean', 1.292, '#9aa5bd'], ['biases', 1.224, '#9aa5bd'], ['k-NN', 0.950, '#f0b94b'], ['ALS', 0.577, '#5da2ff'], ['MF SGD', 0.578, '#5da2ff'], ['SVD₀', 2.831, '#e2606c']];
          const sweep = [[1, 1.053], [2, 0.847], [3, 0.583], [5, 0.613], [10, 0.665], [20, 0.697]];
          const rx = 380; const rw = 230;
          const RX = (k) => rx + (Math.log2(k) / Math.log2(20)) * rw;
          return (
            <g>
              <text x="30" y="22" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">held-out RMSE, same split</text>
              <line x1="30" y1={y0} x2="330" y2={y0} stroke="#9aa5bd" strokeOpacity="0.6" />
              <line x1="30" y1={BY(0.5)} x2="330" y2={BY(0.5)} stroke="#62d98a" strokeDasharray="4 4" />
              <text x="250" y={BY(0.5) - 4} fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="9">noise floor 0.5</text>
              {bars.map(([label, v, color], i) => (
                <g key={label}>
                  <rect x={40 + i * 48} y={BY(v)} width="30" height={y0 - BY(v)} fill={color} fillOpacity="0.85" />
                  <text x={36 + i * 48} y={BY(v) - 5} fill={color} fontFamily="ui-monospace, monospace" fontSize="9">{v.toFixed(3)}</text>
                  <text x={38 + i * 48} y={y0 + 14} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">{label}</text>
                </g>
              ))}
              <text x={rx} y="22" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">rank sweep, λ 0.05 (log k)</text>
              <line x1={rx} y1={y0} x2={rx + rw} y2={y0} stroke="#9aa5bd" strokeOpacity="0.6" />
              <line x1={rx} y1={BY(0.5)} x2={rx + rw} y2={BY(0.5)} stroke="#62d98a" strokeDasharray="4 4" />
              <polyline fill="none" stroke="#5da2ff" strokeWidth="2" points={sweep.map(([k, v]) => `${RX(k)},${BY(v)}`).join(' ')} />
              {sweep.map(([k, v]) => (
                <g key={k}>
                  <circle cx={RX(k)} cy={BY(v)} r="3" fill="#5da2ff" />
                  <text x={RX(k) - 6} y={y0 + 14} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">k={k}</text>
                  <text x={RX(k) - 12} y={BY(v) - 7} fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="8">{v.toFixed(3)}</text>
                </g>
              ))}
              <circle cx={RX(20)} cy={BY(1.06)} r="4" fill="#e2606c" />
              <text x={RX(20) - 92} y={BY(1.06) + 3} fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="9">k=20, λ=0: 1.060</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'matrix_factorization_stochastic_gradient_descent.py',
  Viz: MatrixFactorizationViz,
  narration,
};
