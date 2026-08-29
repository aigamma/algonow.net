import GmmViz from '../viz/GmmViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/gaussian_mixture_expectation_maximization.py?raw';
import { narration } from './gaussian-mixture-expectation-maximization.narration.js';

export const content = {
  given:
    'Unlabeled points thrown off by several overlapping sources: sensor modes, customer types, cell populations: with tilted, elongated spreads. Hard boundaries lie about the seams; the sources overlap, so membership is genuinely fractional.',
  task: 'Model the data as k weighted Gaussians with full covariances and fit by EM: the E-step assigns every point soft responsibilities under the current parameters, the M-step refits every parameter in closed form under those weights, and the loop repeats until the likelihood stops moving.',
  constraint:
    'The guiding rule carries a theorem, and this page asserts it numerically: the log-likelihood never decreased across all 119 main-fit iterations and every step of 20 restarts. Recovery is audited against the planted truth (means within 0.13, weights within 0.02, fitted likelihood above the generator’s own), soft beats hard by 7.4 points on tilted overlap, parity on round blobs is said plainly, and the famous singularity is reproduced with numbers.',

  origins: (
    <p>
      Karl Pearson, <strong>1894</strong>, fit the first Gaussian
      mixture by hand: two components over Weldon&apos;s Naples
      crab measurements, via moments and a ninth-degree
      polynomial: statistics&apos; first admission that one bell
      curve was not enough. The modern engine arrived in{' '}
      <strong>1977</strong>: Dempster, Laird, and Rubin&apos;s
      &quot;Maximum likelihood from incomplete data via the EM
      algorithm&quot; unified a scattered family of fixes under
      one two-step scheme and proved the property this page
      cashes out: each iteration can only raise the likelihood
      (the convergence fine print was later tightened by Wu,
      1983). GMM+EM became a workhorse: speaker recognition ran
      on it for two decades, vision systems subtract backgrounds
      with per-pixel mixtures, and Baum-Welch: the trainer behind
      this site&apos;s Viterbi unit: is EM wearing hidden Markov
      clothes. K-means itself is this model&apos;s zero-variance
      limit, which is why the two are natural rivals.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>model and its objective</strong>: k
      sources, each a weight, a center, and a full 2×2
      covariance: tilted ellipses, not circles: mixed into one
      likelihood for the data. That likelihood is the scoreboard:
      the fit on this page ends at -5,526.2,{' '}
      <strong>above the generator&apos;s own parameters&apos;
      -5,536.7</strong>: EM found an explanation at least as good
      as the truth that made the data. Recovery is audited
      component by component under the best label permutation:
      every fitted mean within 0.13, weights within 0.02,
      covariances within 0.34 of the planted values.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>responsibility weighting</strong>: the
      guiding rule that never commits. The E-step scores every
      point under every component and normalizes: a seam point
      might be 0.6 owned by one source and 0.4 by another (173 of
      1,500 points here carry a top responsibility under 0.9).
      The M-step then refits weights, means, and covariances in
      closed form under those fractions. The rule&apos;s license
      is a theorem: each round can only raise the likelihood:{' '}
      <strong>asserted at every one of 119 iterations and every
      step of 20 restarts</strong>: so the loop climbs until a
      local optimum, guaranteed. Restarts (8 here, k-means++
      seeded, best kept) are the standard answer to
      &quot;local.&quot;
    </p>
  ),

  picture: (
    <p>
      Two radio stations bleeding into each other on a highway
      drive. A hard rule: &quot;north of the ridge is station A,
      south is B&quot;: mislabels everything in the overlap
      valley, and worse, it does not know it is guessing. The
      mixture keeps a dial instead of a border: right now this
      signal is 60% A, 40% B. With those fractions in hand you
      can re-estimate each station honestly: where its
      transmitter really sits, how far it really reaches, how
      strong it really is: counting every sample partially,
      by exactly how much it belongs. Better stations imply
      better fractions; better fractions imply better stations;
      and the theorem says this circle spirals upward, never
      down. Where a hard border throws away the seam, the soft
      dial <em>measures</em> it: and the seam is usually where
      the interesting customers, cells, and failures live.
    </p>
  ),

  steps: [
    <>
      <strong>Seed:</strong> k-means++ spread seeding, 8
      restarts, best final likelihood kept: the standard remedy
      for local optima, stated plainly.
    </>,
    <>
      <strong>E-step:</strong> score every point under every
      component, normalize to responsibilities: every row sums to
      1, asserted.
    </>,
    <>
      <strong>M-step:</strong> refit weights, means, and full
      covariances in closed form under the responsibility
      weights: plus a tiny ridge on each variance.
    </>,
    <>
      <strong>Climb:</strong> the likelihood can only rise
      (asserted at every step of every run): stop when the gain
      goes quiet.
    </>,
    <>
      <strong>Read the seams:</strong> the responsibilities are
      the product: 173 points flagged as genuinely shared here,
      not misfiled.
    </>,
  ],

  signals: [
    <>
      <strong>Elongated or tilted clusters:</strong> full
      covariance reads the tilt that round distance cannot: 96.2%
      vs 88.8% on this page&apos;s overlapping ellipses.
    </>,
    <>
      <strong>The overlap is the signal:</strong> churn-risk
      customers between segments, cells mid-transition, sensors
      between modes: soft membership measures the seam instead of
      papering over it.
    </>,
    <>
      <strong>You need a generative story:</strong> densities,
      likelihoods of new points, missing-data handling, sampling:
      a fitted mixture is a model, not just a partition.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>K-means</strong>: hard
      assignment, round distance, blistering speed: and this
      page&apos;s own seeding uses its ++ trick. On round,
      well-separated blobs the two tie at 100%: parity, said
      plainly: k-means is enough there and cheaper. The mixture
      earns its keep exactly when clusters tilt, stretch, and
      overlap: +7.4 accuracy points here: and when you need to
      know <em>which</em> points were uncertain.
    </>
  ),

  strength: (
    <>
      <strong>A model with a warranty.</strong> The two-step loop
      carries a proof: likelihood never decreases: and this page
      asserted it at all 119 main-fit steps and every step of 20
      restarts rather than trusting the textbook. The fit
      recovered the planted truth (means within 0.13, weights
      within 0.02, covariances within 0.34) and scored the data
      higher than the generating parameters themselves. Soft
      responsibilities beat hard assignment by 7.4 points where
      clusters tilt and overlap, and flagged all 173 seam points
      as uncertain instead of silently misfiling them.
    </>
  ),
  weakness: (
    <>
      <strong>Local, parametric, and k must be chosen.</strong>{' '}
      EM climbs to the nearest hill: a bad seed found a 4.28-off
      optimum in this page&apos;s first draft, which is why the
      shipped fit runs 8 seeded restarts and says so. The model
      assumes Gaussian sources: crescents and nested rings break
      it (DBSCAN&apos;s territory), k is an input not an output
      (hierarchical methods dodge that), and each iteration costs
      O(n·k) density evaluations: far heavier than a k-means
      pass. And the likelihood itself has a trapdoor: without a
      variance ridge, a component can collapse onto one point and
      push the likelihood to infinity while explaining nothing:
      measured below.
    </>
  ),

  problem: 'Clustering',
  problemSlug: 'clustering',
  rivals: [
    {
      name: 'GMM × EM',
      isThisUnit: true,
      algoName: 'Gaussian mixture model',
      cost: 'O(t·n·k) densities',
      wins: (
        <>
          <strong>Reads tilt and overlap</strong>: +7.4 points
          here, knows its 173 uncertain points, and yields a real
          density model with a monotone-climb warranty.
        </>
      ),
      costs: (
        <>
          Local optima (restarts required), k chosen by you,
          Gaussian shapes assumed, and the singularity trapdoor
          without a ridge.
        </>
      ),
      when: 'Overlapping elliptical structure, or when you need densities and honest uncertainty.',
    },
    {
      name: 'K-means',
      cost: 'O(t·n·k) distances',
      wins: (
        <>
          The live unit: hard, fast, simple: ties this page at
          100% on round separated blobs, and its ++ seeding is
          exactly what this page borrows to start EM.
        </>
      ),
      costs: (
        <>
          Round distance cannot read tilt (88.8% vs 96.2% here)
          and a hard border says nothing about the seam.
        </>
      ),
      when: 'Round-ish well-separated clusters, huge n, or as the cheap first look.',
    },
    {
      name: 'DBSCAN',
      cost: 'O(n log n) with an index',
      wins: (
        <>
          Density reachability finds crescents, rings, and
          arbitrary shapes no Gaussian can express: and discovers
          its own cluster count, flagging outliers as noise.
        </>
      ),
      costs: (
        <>
          Two sensitive knobs (radius, min-points), no per-point
          probabilities, and struggles when densities vary
          across clusters.
        </>
      ),
      when: 'Arbitrary-shape clusters, unknown k, outliers that deserve a noise label.',
    },
    {
      name: 'Agglomerative clustering',
      cost: 'O(n² log n)',
      wins: (
        <>
          Builds the whole merge tree: every granularity at once,
          cut where you like: no k, no shape model, just a
          linkage rule.
        </>
      ),
      costs: (
        <>
          Quadratic in n, no probabilistic story, and early
          greedy merges are forever: one bad join propagates up
          the tree.
        </>
      ),
      when: 'Small n where the hierarchy itself is the answer: taxonomies, dendrograms.',
    },
    {
      name: 'Gibbs sampling',
      cost: 'O(sweeps · n)',
      wins: (
        <>
          The live unit: the Bayesian mixture: samples the
          posterior over assignments AND parameters, pricing the
          uncertainty EM&apos;s point estimate ignores.
        </>
      ),
      costs: (
        <>
          Many sweeps for one answer, convergence is diagnosed
          rather than proven, and label-switching bedevils the
          summaries.
        </>
      ),
      when: 'Small data, big decisions: when the error bars on the clustering itself matter.',
    },
  ],
  neverUse: {
    name: 'Ridgeless EM chasing a singleton',
    why: (
      <>
        The likelihood objective has a trapdoor, and this page
        fell through it on purpose: seed one component on a
        single data point with no variance floor, and the
        ridgeless M-step collapses its covariance{' '}
        <strong>below determinant 1e-200 in one iteration</strong>.
        Walking that collapse parametrically, the data
        log-likelihood climbs -194 → -177 → -131 → -16, without
        bound, while a sane two-component fit of the same 40
        points scores -149: <strong>infinite likelihood, zero
        insight</strong>: one point memorized exactly, everything
        else explained no better. This is Bishop&apos;s classic
        singularity, and it is why every serious implementation
        adds a variance ridge or prior. Maximizing an unbounded
        objective is not learning: if your likelihood can buy
        points by shrinking a variance to zero, it will: the
        ridge exists precisely for this.
      </>
    ),
  },

  contest: {
    instance:
      'clustering 1,500 points from 3 planted sources, accuracy vs the planted labels (best permutation); both fits referee themselves: EM likelihood monotone, Lloyd distortion non-increasing',
    columns: ['gmm-em', 'k-means'],
    rows: [
      {
        method: 'Tilted, overlapping ellipses',
        isThisUnit: true,
        values: ['96.2%', '88.8%'],
        best: 0,
        verdict: 'full covariance reads the tilt; hard round distance cannot',
      },
      {
        method: 'Round, well-separated blobs',
        values: ['100.0%', '100.0%'],
        verdict: 'parity, said plainly: when clusters are round and apart, k-means is enough',
      },
    ],
    source:
      'python solutions/gaussian_mixture_expectation_maximization.py prints this table and asserts: log-likelihood non-decreasing at every iteration of every run (119 main-fit steps + 20 restarts: the Dempster-Laird-Rubin theorem, numerically); every responsibility row sums to 1; the planted mixture recovered under the best permutation (means within 0.13, weights within 0.02, covariances within 0.34) with fitted likelihood -5,526.2 above the generator’s -5,536.7; Lloyd’s distortion non-increasing (the rival referees itself); soft over hard by 7.4 points on tilted overlap with parity inside 2 points on round blobs; and the ridgeless singularity reproduced: determinant below 1e-200 in one iteration, likelihood ladder -194 → -16 unbounded.',
  },

  figure: (
    <Figure
      id="fig-gmm-em"
      aspect="16 / 7"
      caption="Guess softly, refit exactly, repeat. The E-step scores every point under every tilted ellipse and normalizes into responsibilities: the seam point belongs 0.6 to blue and 0.4 to amber, and 173 of 1,500 points here are genuinely shared like that. The M-step refits weights, means, and full covariances in closed form under those fractions. Each round provably raises the likelihood (asserted at all 119 steps): the staircase climbs to -5,526.2, above the generating parameters' own -5,536.7, recovering every planted mean within 0.13."
      cite={{
        text: 'A. P. Dempster, N. M. Laird, D. B. Rubin, "Maximum likelihood from incomplete data via the EM algorithm," JRSS-B 39(1), 1977. DOI 10.1111/j.2517-6161.1977.tb01600.x. Mixtures back to Pearson 1894; convergence tightened by Wu 1983.',
        href: 'https://doi.org/10.1111/j.2517-6161.1977.tb01600.x',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="Three tilted ellipses over scattered points, a seam point with split responsibilities, the E and M cycle, and a monotone likelihood staircase">
        <ellipse cx="150" cy="120" rx="95" ry="42" transform="rotate(24 150 120)" fill="rgba(93,162,255,0.12)" stroke="#5da2ff" strokeWidth="1.6" />
        <ellipse cx="300" cy="150" rx="52" ry="80" transform="rotate(-18 300 150)" fill="rgba(240,185,75,0.12)" stroke="#f0b94b" strokeWidth="1.6" />
        <ellipse cx="225" cy="52" rx="38" ry="34" fill="rgba(98,217,138,0.12)" stroke="#62d98a" strokeWidth="1.6" />
        {[[110, 105], [150, 135], [185, 118], [130, 92], [206, 142], [298, 120], [312, 172], [282, 195], [318, 138], [222, 44], [240, 62], [208, 66]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="3" fill={i < 5 ? '#5da2ff' : i < 9 ? '#f0b94b' : '#62d98a'} opacity="0.8" />
        ))}
        <circle cx="243" cy="140" r="4.5" fill="#e9edf6" stroke="#e2606c" strokeWidth="1.4" />
        <text x="252" y="132" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="10">the seam point: r = (0.6, 0.4, 0.0)</text>
        <text x="252" y="146" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">173 of 1,500 points live like this</text>
        <path d="M 470 60 a 34 34 0 1 1 -0.1 0" fill="none" stroke="#9aa5bd" strokeWidth="1.4" />
        <text x="452" y="34" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="11">E: score, normalize</text>
        <text x="452" y="112" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">M: refit in closed form</text>
        <path d="M 380 235 h 30 v -8 h 30 v -10 h 30 v -14 h 30 v -20 h 30 v -6 h 30 v -2 h 30" fill="none" stroke="#62d98a" strokeWidth="1.8" />
        <text x="380" y="258" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="10">log-likelihood: never a step down (asserted ×119)</text>
        <text x="380" y="205" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">ends at -5,526.2 &gt; truth&apos;s -5,536.7</text>
        <text x="30" y="240" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">tilted overlap: gmm 96.2% vs k-means 88.8% · round blobs: parity 100/100</text>
        <text x="30" y="262" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">ridgeless trapdoor: det &lt; 1e-200 in one step, likelihood -194 → -16 unbounded: the ridge exists for this</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'gaussian_mixture_expectation_maximization.py',
  Viz: GmmViz,
  narration,
};
