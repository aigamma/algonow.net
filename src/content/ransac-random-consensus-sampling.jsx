import RansacViz from '../viz/RansacViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/ransac_random_consensus_sampling.py?raw';
import { narration } from './ransac-random-consensus-sampling.narration.js';

export const content = {
  given:
    'Two hundred points. Sixty percent of them lie within noise of a line; the other forty percent are scattered anywhere in the frame. Find the line. Least squares minimizes the sum of squared residuals, so every outlier pulls on the fit in proportion to its distance, and eighty outliers pull hard: the fitted slope lands 0.278 from the truth on average when the noise alone would allow 0.004.',
  task: 'RANSAC, random sample consensus. Draw the smallest sample that determines a model (two points for a line), fit the model to the sample, count the points that agree with it within a threshold, and keep the model with the largest consensus. Repeat for N draws, then refit to the consensus set. The heuristic is the sampling: N is chosen so that at least one draw is all inliers with probability p, and N depends on the outlier fraction and the sample size, not on how many points there are.',
  constraint:
    'Measured against the generating line and the true inlier set: with 31 draws (one failure in a million) at 40% outliers, the line is recovered in 200 of 200 trials, worst slope error 0.023, worst intercept error 0.083, and the consensus set matches the true inliers to a Jaccard of 0.896 or better. The draw-count law holds: 11 draws (p = 0.99) succeed in 98.1% of 2,000 trials, 3 draws in 68.2%; across 20 / 40 / 60 / 80% outliers the formula asks for 5 / 11 / 27 / 113 draws and delivers 98.2 / 98.4 / 98.6 / 97.0%. The threshold matters: 0.05 starves the vote (slope error 0.034), 5.0 admits outliers (0.062), 1.0 lands at 0.008. Against the rivals at 60% outliers: RANSAC 0.008, Huber 0.052, Theil-Sen 0.108, least squares 0.415.',

  origins: (
    <p>
      Martin Fischler and Robert Bolles published RANSAC in{' '}
      <strong>1981</strong> (Communications of the ACM 24(6), &quot;Random
      Sample Consensus: A Paradigm for Model Fitting with Applications
      to Image Analysis and Automated Cartography&quot;), working at SRI
      International on the location determination problem: where is the
      camera, given a few landmarks, some of which are misidentified?
      Their insight inverted the usual order. Classical robust
      statistics starts from all the data and tries to identify the
      outliers; RANSAC starts from the smallest possible sample and
      lets the data vote on it. Torr and Zisserman (2000) replaced the
      count with a bounded loss (MSAC, MLESAC); Chum and Matas (2005)
      ordered the draws by match quality (PROSAC); Chum, Matas, and
      Kittler (2003) added a local refit to each new best (LO-RANSAC);
      Raguram and colleagues folded them together (USAC, 2013). It
      estimates the homography in every panorama stitcher, the
      fundamental matrix in every structure-from-motion pipeline, and
      the ground plane in every point-cloud library.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>vote</strong>. A model is scored not by how well
      it fits the points but by <strong>how many points it fits</strong>{' '}
      within the threshold, and the best model is refit by least
      squares to its consensus set alone. The referee here is the line
      that generated the data, y = 0.7x + 3 with noise 0.3, and the
      true inlier set: with enough draws the refit lands within{' '}
      <strong>0.023 in slope</strong> and 0.083 in intercept in the worst
      of 200 trials, and the consensus set matches the true inliers to
      a Jaccard of 0.896 or better. The mismatch is the threshold&apos;s
      doing: about 5% of the uniformly scattered outliers happen to sit
      within 1.0 of the line and are counted, which is why the draft&apos;s
      demand for 0.95 was refused by the measurement.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>draws</strong>. With inlier fraction w and a
      sample of s points, one draw is all inliers with probability
      w<sup>s</sup>, so N = log(1 − p) / log(1 − w<sup>s</sup>) draws
      make at least one clean draw likely with probability p. At 40%
      outliers and s = 2 that is <strong>11 draws for p = 0.99</strong>,
      measured at 98.1% success over 2,000 trials, and 31 draws for one
      failure in a million, measured at 200 of 200. Three draws succeed
      68.2% of the time. The count is independent of n: 200 points or
      200,000, the same 11 draws. It is not independent of the outliers:
      5 / 11 / 27 / 113 draws at 20 / 40 / 60 / 80%, each delivering
      97% or better. The draft asked the 99% draw count to succeed in
      every one of 200 trials and it failed once, exactly as a 99%
      guarantee permits; the every-trial claim now uses the count that
      earns it.
    </p>
  ),

  picture: (
    <p>
      A room of two hundred witnesses, sixty percent of whom saw the
      same event and describe it consistently, and forty percent of
      whom are making things up. Averaging every statement produces a
      story nobody told. RANSAC picks two witnesses at random, writes
      down the story their two accounts imply, and asks the room: who
      agrees with this? If both were honest, most of the honest room
      raises a hand. If either was a fabricator, the story matches
      almost nobody, and it is discarded without ceremony. Eleven such
      pairs, at these odds, almost surely include an honest pair; the
      story with the most hands wins, and the final account is written
      from the hands alone. The liars never get a vote in the ending.
    </p>
  ),

  steps: [
    <>
      <strong>Draw:</strong> pick s points at random (s = 2 for a
      line); fit the model to them exactly.
    </>,
    <>
      <strong>Vote:</strong> count the points whose residual is within
      the threshold t; this is the consensus set.
    </>,
    <>
      <strong>Keep:</strong> if the consensus is the largest so far,
      remember the model and the set.
    </>,
    <>
      <strong>Repeat:</strong> N = log(1 − p) / log(1 − w<sup>s</sup>)
      draws; 11 at 40% outliers for p = 0.99.
    </>,
    <>
      <strong>Refit:</strong> least squares on the winning consensus
      set; the outliers never enter the final fit.
    </>,
  ],

  signals: [
    <>
      <strong>Gross outliers, not just noise:</strong> mismatched
      features, sensor glitches, a second population; anything a
      squared residual would let dominate.
    </>,
    <>
      <strong>A model a tiny sample determines exactly:</strong> a line
      from 2 points, a plane from 3, a homography from 4; the draw
      count grows as w<sup>−s</sup>.
    </>,
    <>
      <strong>The inlier fraction is known roughly:</strong> the draw
      count comes from it; when it is unknown, estimate it from the
      best consensus so far and adapt N.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>ordinary least squares</strong>: on
      clean data it is the optimal line and RANSAC would only add
      sampling noise to it. The outliers are what change the answer:
      0.145 mean slope error at 20% of them, 0.260 at 40%, 0.415 at 60%,
      against RANSAC&apos;s 0.004, 0.004, 0.008.
    </>
  ),

  strength: (
    <>
      <strong>Breakdown point near 100%, at a cost set by the odds.</strong>{' '}
      Recovered the line in 200 of 200 trials at 40% outliers, 97% of
      trials at 80% outliers with 113 draws, and stays under 0.01 slope
      error where Huber sits at 0.052 and Theil-Sen at 0.108; the draw
      count never depends on n.
    </>
  ),
  weakness: (
    <>
      <strong>Two knobs and a coin flip.</strong> The threshold is
      hand-set and matters: 0.05 starves the vote (0.034 slope error),
      5.0 admits outliers (0.062), 1.0 is right (0.008) only because the
      noise is known. The draw count explodes with the sample size:
      s = 8 for a fundamental matrix at 50% inliers is 1,177 draws.
      The guarantee is probabilistic, and a 99% guarantee failed once
      in 200 trials in this very file. And the raw vote rewards the
      biggest consensus set, not the most accurate model, which is
      what MSAC&apos;s bounded loss fixes.
    </>
  ),

  problem: 'Robust model fitting',
  problemSlug: 'robust-fitting',
  rivals: [
    {
      name: 'RANSAC × Random consensus sampling',
      isThisUnit: true,
      algoName: 'RANSAC',
      cost: 'N draws × n residuals, N from w and s',
      wins: (
        <>
          <strong>0.008 slope error at 60% outliers</strong>, 200 of 200
          recoveries at 40%, draws independent of n.
        </>
      ),
      costs: (
        <>
          A hand-set threshold, a probabilistic guarantee, N ~ w<sup>−s</sup>.
        </>
      ),
      when: 'Gross outliers and a model a minimal sample pins down exactly.',
    },
    {
      name: 'Huber regression',
      algoName: 'Huber regression',
      cost: '~50 reweighted least-squares fits',
      wins: (
        <>
          Deterministic, no threshold on membership, statistically
          efficient on the inliers: 0.009 at 20% outliers.
        </>
      ),
      costs: (
        <>
          Bounded influence is not zero influence: 0.052 at 60%
          outliers, six times RANSAC.
        </>
      ),
      when: 'Heavy tails rather than a second population; when you want a smooth loss and a confidence interval.',
    },
    {
      name: 'Theil-Sen estimator',
      algoName: 'Theil-Sen estimator',
      cost: 'n²/2 pairwise slopes, one median',
      wins: (
        <>
          No parameters at all; the median of pairwise slopes: 0.006 at
          20% outliers.
        </>
      ),
      costs: (
        <>
          Breakdown point 29%: 0.020 at 40% outliers, 0.108 at 60%; and
          quadratic in n.
        </>
      ),
      when: 'One-dimensional trends with a modest outlier fraction and no appetite for tuning.',
    },
    {
      name: 'Hough transform',
      algoName: 'Hough transform',
      cost: 'n × (angle bins) votes into a 2-D grid',
      wins: (
        <>
          Finds several lines at once and needs no random draws; every
          point votes for every line through it.
        </>
      ),
      costs: (
        <>
          A discretized parameter space, so the answer is only as fine
          as the grid; hopeless past two or three parameters.
        </>
      ),
      when: 'Multiple lines or circles in an image, and a parameter space small enough to grid.',
    },
  ],
  neverUse: {
    name: 'Least squares on everything',
    why: (
      <>
        The line through 200 points by least squares is one formula and
        no parameters, and it is the wrong tool the moment a second
        population is present. Its objective is the sum of squared
        residuals, so the points farthest from the line, which are
        precisely the outliers, get the loudest say: measured,{' '}
        <strong>0.145 mean slope error at 20% outliers</strong>, 35 times
        RANSAC&apos;s 0.004, and 0.415 at 60%, where the fit is closer to
        the scatter than to the line. No amount of data fixes it; more
        points bring more outliers in the same proportion. Robust
        fitting is not a refinement of least squares; it is least
        squares applied only after the vote has decided who gets to be
        fitted.
      </>
    ),
  },

  contest: {
    instance:
      'a line through 200 points, 60% within noise 0.3 of y = 0.7x + 3 and 40% scattered uniformly; referee: the generating line and the true inlier set, mean absolute slope error over 30 trials per row',
    columns: ['RANSAC (draws for p = 0.99)', 'least squares', 'Theil-Sen', 'Huber (IRLS)'],
    rows: [
      {
        method: '20% outliers',
        values: ['0.004 (5)', '0.145', '0.006', '0.009'],
        verdict: 'every robust method fine; least squares 35× off',
      },
      {
        method: '40% outliers',
        values: ['0.004 (11)', '0.260', '0.020', '0.023'],
        verdict: 'Theil-Sen past its 29% breakdown point',
      },
      {
        method: '60% outliers',
        isThisUnit: true,
        values: ['0.008 (27)', '0.415', '0.108', '0.052'],
        best: 0,
        verdict: 'only the sampler stays under 0.01',
      },
      {
        method: 'draws at 20 / 40 / 60 / 80%',
        values: ['5 / 11 / 27 / 113', 'one fit', 'n²/2 slopes', '50 fits'],
        verdict: 'RANSAC succeeds 98.2 / 98.4 / 98.6 / 97.0%',
      },
      {
        method: 'threshold 0.05 / 1.0 / 5.0 at 40%',
        values: ['0.034 / 0.008 / 0.062', '·', '·', '·'],
        verdict: 'too tight starves the vote; too loose admits outliers',
      },
    ],
    source:
      'python solutions/ransac_random_consensus_sampling.py prints this table and asserts: with 31 draws at 40% outliers the refit lands within 0.05 in slope and 0.3 in intercept in every one of 200 trials with consensus-vs-truth Jaccard above 0.85; 11 draws succeed in at least 97% of 2,000 trials and 3 draws in fewer; the sweep needs exactly 5 / 11 / 27 / 113 draws and succeeds in at least 95% at each; the 1.0 threshold beats 0.05 and 5.0; and at 60% outliers RANSAC is under 0.02 and below Huber, below Theil-Sen, below least squares.',
  },

  figure: (
    <Figure
      id="fig-ransac-vote"
      aspect="16 / 7"
      caption="One draw: two random points (amber rings) fix a candidate line; the points within the threshold band (blue) are its consensus. A draw that includes an outlier (dashed amber) fits almost nobody and is discarded. After N draws the largest consensus is refit by least squares; the outliers never enter it. Least squares on all 200 points (red dashed) is pulled toward the scatter: 0.278 mean slope error at 40% outliers against RANSAC’s worst of 0.023 over 200 trials."
      cite={{
        text: 'M. A. Fischler, R. C. Bolles, "Random sample consensus: a paradigm for model fitting with applications to image analysis and automated cartography," Communications of the ACM 24(6), 1981. DOI 10.1145/358669.358692. P. H. S. Torr, A. Zisserman, "MLESAC," CVIU 78(1), 2000. O. Chum, J. Matas, "Matching with PROSAC," CVPR 2005.',
        href: 'https://doi.org/10.1145/358669.358692',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="A scatter of points, most along a line and some spread out, with a candidate line through two sampled points, its threshold band, a bad candidate through an outlier, and the least-squares line pulled off">
        <rect x="30" y="20" width="400" height="240" fill="none" stroke="#9aa5bd" strokeOpacity="0.3" />
        <polygon points="30,194 430,71 430,91 30,214" fill="#5da2ff" fillOpacity="0.12" />
        <line x1="30" y1="204" x2="430" y2="81" stroke="#f0b94b" strokeWidth="1.5" />
        <line x1="61" y1="260" x2="363" y2="20" stroke="#f0b94b" strokeWidth="1" strokeDasharray="4 3" />
        <line x1="30" y1="165" x2="430" y2="120" stroke="#e2606c" strokeWidth="1.5" strokeDasharray="5 4" />
        {[[40, 197], [62, 192], [85, 183], [108, 180], [130, 171], [152, 163], [175, 158], [198, 151], [220, 142], [243, 137], [265, 130], [288, 124], [310, 115], [333, 110], [355, 104], [378, 96], [400, 90], [422, 82]].map(([x, y], i) => (
          <circle key={`in-${i}`} cx={x} cy={y} r="3" fill="#5da2ff" />
        ))}
        {[[60, 60], [95, 240], [140, 45], [170, 230], [210, 70], [250, 250], [280, 40], [320, 210], [350, 30], [390, 240], [410, 170], [120, 120]].map(([x, y], i) => (
          <circle key={`out-${i}`} cx={x} cy={y} r="3" fill="#9aa5bd" fillOpacity="0.6" />
        ))}
        <circle cx="108" cy="180" r="7" fill="none" stroke="#f0b94b" strokeWidth="2" />
        <circle cx="355" cy="104" r="7" fill="none" stroke="#f0b94b" strokeWidth="2" />
        <circle cx="198" cy="151" r="7" fill="none" stroke="#f0b94b" strokeWidth="1" strokeDasharray="3 2" />
        <circle cx="350" cy="30" r="7" fill="none" stroke="#f0b94b" strokeWidth="1" strokeDasharray="3 2" />
        <text x="445" y="50" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="10">a draw: two points, one candidate</text>
        <text x="445" y="68" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="10">its band: the consensus votes</text>
        <text x="445" y="86" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="10">dashed: a draw with an outlier</text>
        <text x="445" y="104" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">in it; almost no votes; discarded</text>
        <text x="445" y="140" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="10">red: least squares on all 200</text>
        <text x="445" y="158" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">mean slope error 0.278 at 40%</text>
        <text x="445" y="194" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="10">31 draws: 200 of 200 recoveries</text>
        <text x="445" y="212" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">worst slope error 0.023</text>
        <text x="445" y="230" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">draws: 5 / 11 / 27 / 113</text>
        <text x="445" y="248" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">at 20 / 40 / 60 / 80% outliers</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'ransac_random_consensus_sampling.py',
  Viz: RansacViz,
  narration,
};
