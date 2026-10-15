import KdeViz from '../viz/KdeViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/kernel_density_estimation_silverman_bandwidth.py?raw';
import { narration } from './kernel-density-estimation-silverman-bandwidth.narration.js';

export const content = {
  given:
    'A sample of a few hundred numbers and no idea what family they came from. Draw the probability density they were drawn from as a smooth curve, close to the truth, without inventing bumps the data do not support or smoothing away the ones they do.',
  task: 'Kernel density estimation. The algorithm (Rosenblatt 1956, Parzen 1962) centers a small bump, a Gaussian of width h, on every observation and averages the bumps: a density by construction, nonnegative and integrating to one, with no parametric family assumed. The heuristic is Silverman’s rule of thumb (1986) for the one number that matters, the bandwidth h = 0.9 min(s, IQR/1.34) n^{−1/5}: the bandwidth that would be optimal if the data were Gaussian, made robust with the interquartile range and shrunk a little so a non-Gaussian shape is not smoothed away. Too small an h follows the sample; too large blurs the shape; the rule puts h in the right place for most unimodal data in one line of arithmetic.',
  constraint:
    'Measured on samples of 300 from three Marron-Wand test densities, with the integrated squared error against the true density computed exactly (every density is a Gaussian mixture) and the oracle bandwidth found by grid search: on the Gaussian, Silverman’s h = 0.296 against the oracle 0.297 for 1.00× the oracle ISE (Scott 1.04×, cross-validation 1.12×, histograms 1.97× and 2.35×); on the skewed unimodal density 1.10× (histograms 3.75× and 9.14×); on the separated bimodal density the rule oversmooths, h = 0.453 against 0.227 for 5.01× the oracle ISE, where least-squares cross-validation reaches 1.03× and even a ten-bin histogram does better (4.92×). Fixed bandwidths of 0.03 and 1.5 cost 7× to 79× the oracle. Across n = 50 to 800 on the Gaussian, the rule’s bandwidth shrinks with slope −0.167 (theory −0.2) and the ISE falls with slope −0.69 (theory −0.8).',

  origins: (
    <p>
      Murray Rosenblatt (<strong>1956</strong>) and Emanuel Parzen (1962)
      defined the estimate and proved its consistency and the n^{'{−4/5}'}{' '}
      rate of its error; Rosenblatt&apos;s paper also showed that no
      nonparametric density estimate can be unbiased. Bernard
      Silverman&apos;s monograph Density Estimation for Statistics and Data
      Analysis (<strong>1986</strong>) gave the rule of thumb measured here,
      an adaptation of the normal reference rule of Deheuvels (1977) and
      Scott (1979); Rudemo (1982) and Bowman (1984) gave least-squares
      cross-validation, and Sheather and Jones (1991) the plug-in
      selector that replaced the rule where accuracy matters. Marron and
      Wand (1992) assembled the fifteen Gaussian-mixture test densities,
      three of which are the referee on this page. The estimate with
      Scott&apos;s or Silverman&apos;s rule is the default of SciPy, R&apos;s
      density(), pandas, and seaborn, which is why its failure on
      multimodal data is the most common silent error in exploratory plots.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>estimate</strong>: a Gaussian bump on each of the n
      points, averaged. It is a density by construction (checked:
      nonnegative, integrating to one within 0.2% on a wide grid), its
      error against the truth is a closed form when the truth is a Gaussian
      mixture, and it converges at the n^{'{−4/5}'} rate when the bandwidth
      is right. The referee is that exact integrated squared error on three
      Marron-Wand densities with a 30-point grid search for the oracle
      bandwidth; against it, a histogram with Freedman-Diaconis bins costs{' '}
      <strong>1.97× to 7.83×</strong> the oracle and fixed bandwidths cost
      7× to 79×.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>bandwidth</strong>: 0.9 min(s, IQR/1.34) n^{'{−1/5}'}.
      On the Gaussian it is almost exactly the oracle, h = 0.296 against
      0.297 for <strong>1.00× the oracle error</strong>, and on the skewed
      density 1.10×, ahead of cross-validation (1.12× and 1.27×), which pays
      in variance for adapting. Its assumption is also its failure: on two
      well-separated modes the standard deviation measures the gap, not the
      bumps, so h = 0.453 where the oracle is 0.227, 5.01× the error, and a
      ten-bin histogram does better. Across sample sizes the rule&apos;s h
      shrinks with slope −0.167 and the error with −0.69, near the theory.
    </p>
  ),

  picture: (
    <p>
      A photographer blurring a scatter of pinpricks into a landscape.
      Each pinprick becomes a soft spot of light; where points crowd, the
      spots overlap into a hill. The focus ring is the bandwidth: too
      sharp and every pinprick is its own spike, too soft and two hills
      merge into one mound. Silverman&apos;s rule sets the ring from how
      spread out the pinpricks are, which is right whenever the scatter is
      one cloud. Point it at two clouds and it measures the distance
      between them, softens too far, and the valley between the hills
      fills in.
    </p>
  ),

  steps: [
    <>
      <strong>Scale:</strong> compute the sample standard deviation s and
      the interquartile range IQR; take A = min(s, IQR/1.34).
    </>,
    <>
      <strong>Bandwidth:</strong> h = 0.9 A n^{'{−1/5}'} (0.296 for n = 300
      Gaussian points with s = 1.03).
    </>,
    <>
      <strong>Estimate:</strong> f̂(x) = (1/n) Σ φ((x − x<sub>i</sub>)/h)/h,
      a Gaussian bump of width h on every observation.
    </>,
    <>
      <strong>Check the shape:</strong> if the plot shows two or more
      clusters, s is measuring their separation; cross-validate h instead
      (0.198 against the rule&apos;s 0.453 here).
    </>,
    <>
      <strong>Report:</strong> the curve, the bandwidth, and how it was
      chosen; a density plot without its bandwidth is a drawing.
    </>,
  ],

  signals: [
    <>
      <strong>A first look at a distribution:</strong> hundreds to
      thousands of points, one dimension, no family in mind.
    </>,
    <>
      <strong>Smoothness over counts:</strong> you want a curve for a plot,
      a likelihood, or a mode, not bars that move when the bin edges do.
    </>,
    <>
      <strong>One cloud, roughly:</strong> the rule of thumb is a Gaussian
      reference; it is right when the data are unimodal and wrong by a
      factor when they are not.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the <strong>histogram</strong>: count the
      points in bins. With Freedman-Diaconis widths it costs 1.97× the
      oracle error on the Gaussian and 3.75× on the skewed density; with
      Sturges&apos;s ten bins, 2.35× and 9.14×; and it depends on where the
      bin edges fall.
    </>
  ),

  strength: (
    <>
      <strong>Near-optimal on unimodal data in one line.</strong> 1.00× the
      oracle error on the Gaussian and 1.10× on the skewed density, ahead
      of cross-validation; a smooth density with no edges and no family;
      the n^{'{−4/5}'} rate measured at −0.69.
    </>
  ),
  weakness: (
    <>
      <strong>One number for the whole line, set by a Gaussian.</strong> Two
      separated modes give h = 0.453 where 0.227 is right, 5.01× the error
      and a filled-in valley; the same h smooths the tails and the peak
      alike; and the estimate costs n bumps per evaluation unless binned.
    </>
  ),

  problem: 'Density estimation',
  problemSlug: 'density-estimation',
  rivals: [
    {
      name: 'Kernel density estimation × Silverman bandwidth',
      isThisUnit: true,
      algoName: 'Kernel density estimation',
      cost: 'O(n) per evaluation point; one bandwidth',
      wins: (
        <>
          <strong>1.00× the oracle error</strong> on Gaussian data, 1.10× on
          skewed; smooth, nonparametric, one line to set.
        </>
      ),
      costs: (
        <>
          5.01× the oracle on two separated modes; one bandwidth everywhere.
        </>
      ),
      when: 'The first picture of a unimodal sample, and the default smooth density behind a plot.',
    },
    {
      name: 'Leave-one-out cross-validation',
      algoName: 'Leave-one-out cross-validation',
      cost: 'O(n²) per candidate bandwidth',
      wins: (
        <>
          Chooses h from the data, no Gaussian reference: 1.03× the oracle
          on the separated bimodal density where the rule gives 5.01×.
        </>
      ),
      costs: (
        <>
          Variance: 1.12× and 1.27× on the unimodal densities, behind the
          rule; a grid search over h.
        </>
      ),
      when: 'The data may be multimodal or heavy-tailed and a wrong bandwidth would mislead.',
    },
    {
      name: 'Gaussian mixture model',
      algoName: 'Gaussian mixture model',
      cost: 'EM over k components',
      wins: (
        <>
          A parametric density with a few numbers; exact for the mixtures
          here; clusters as a by-product (puzzle 110).
        </>
      ),
      costs: (
        <>
          k to choose; local optima; a shape the components cannot make is
          missed.
        </>
      ),
      when: 'You believe in a small number of bumps and want their means, spreads, and weights.',
    },
    {
      name: 'Mean shift',
      algoName: 'Mean shift',
      cost: 'gradient ascent on the kernel estimate',
      wins: (
        <>
          Finds the modes of the kernel density directly, and so clusters
          without choosing k.
        </>
      ),
      costs: (
        <>
          Inherits the bandwidth problem exactly: oversmooth and two modes
          become one.
        </>
      ),
      when: 'Modes and basins are the question, not the curve itself.',
    },
  ],
  neverUse: {
    name: 'The rule of thumb on data with separated modes',
    why: (
      <>
        Two bumps of width 0.5 centered at ±1.5. The sample standard
        deviation is 1.57 and the interquartile range 2.97: both measure the
        gap between the bumps, not the bumps, so the rule prescribes{' '}
        <strong>h = 0.453 where the oracle is 0.227</strong>, and the estimate
        costs 5.01× the oracle error, with the valley between the modes
        half filled; Scott&apos;s rule is worse at 7.82×, and a ten-bin
        histogram beats both at 4.92×. Cross-validation reads the same
        sample and lands at 0.198 for 1.03×. The rule is a Gaussian
        reference wearing a robust scale; the moment the data have two
        centers, the scale it measures is the wrong one.
      </>
    ),
  },

  contest: {
    instance:
      'samples of 300 from three Marron-Wand densities (Gaussian; skewed unimodal; separated bimodal); referee: the exact integrated squared error against the true density, every density being a Gaussian mixture, and the oracle bandwidth from a 30-point log-spaced grid search; scores are multiples of the oracle ISE',
    columns: ['Gaussian', 'skewed unimodal', 'separated bimodal', 'bandwidth on the bimodal'],
    rows: [
      {
        method: 'KDE, Silverman rule of thumb',
        isThisUnit: true,
        values: ['1.00×', '1.10×', '5.01×', '0.453 (oracle 0.227)'],
        best: 0,
        verdict: 'the oracle on one cloud, a blur on two',
      },
      {
        method: 'KDE, oracle bandwidth',
        values: ['1 (ISE 0.0047)', '1 (ISE 0.0015)', '1 (ISE 0.0033)', '0.227'],
        verdict: 'the referee',
      },
      {
        method: "KDE, Scott's normal reference",
        values: ['1.04×', '1.11×', '7.82×', '0.533'],
        verdict: 'the same assumption, less robust',
      },
      {
        method: 'KDE, least-squares cross-validation',
        values: ['1.12×', '1.27×', '1.03×', '0.198'],
        verdict: 'adapts; pays in variance',
      },
      {
        method: 'histogram, Freedman-Diaconis bins',
        values: ['1.97× (13 bins)', '3.75× (19)', '7.83× (7)', '·'],
        verdict: 'the baseline',
      },
      {
        method: 'histogram, Sturges bins',
        values: ['2.35× (10 bins)', '9.14× (10)', '4.92× (10)', '·'],
        verdict: 'beats the oversmoothed KDE on two modes',
      },
      {
        method: 'KDE, fixed h = 0.03 / h = 1.5',
        values: ['7.3× / 11.5×', '17.6× / 78.8×', '8.5× / 36.6×', '·'],
        verdict: 'spiky or blurred; the bandwidth is everything',
      },
    ],
    source:
      'python solutions/kernel_density_estimation_silverman_bandwidth.py prints this table and asserts: every kernel estimate nonnegative and integrating to one within 0.2%; on the Gaussian the rule’s bandwidth within 0.6 to 1.3 of the oracle’s and its ISE and Scott’s within 1.25x; on the separated bimodal density the rule’s bandwidth above 1.5x the oracle’s with ISE above 1.5x, cross-validation below the rule in both; cross-validation behind the rule on the Gaussian; both histograms behind the rule on the unimodal densities and behind the oracle everywhere; fixed bandwidths above 3x and 2x the oracle; and across n = 50 to 800 the bandwidth slope within 0.05 of -1/5 and the ISE slope between -1.05 and -0.55.',
  },

  figure: (
    <Figure
      id="fig-kde-bandwidth"
      aspect="16 / 7"
      caption="Left: the separated bimodal density (gray) and three kernel estimates of a sample from it: the oracle bandwidth 0.227 (blue) resolves the two modes, Silverman's 0.453 (amber) fills half the valley, and a fixed 0.03 (thin red) follows every point. Right: integrated squared error against bandwidth on the same sample, the U whose bottom is the oracle, with the rule's choice and cross-validation's marked."
      cite={{
        text: 'B. W. Silverman, Density Estimation for Statistics and Data Analysis, Chapman and Hall, 1986, section 3.4.2. M. Rosenblatt, "Remarks on some nonparametric estimates of a density function," Annals of Mathematical Statistics 27(3), 1956. E. Parzen, "On estimation of a probability density function and mode," Annals of Mathematical Statistics 33(3), 1962, DOI 10.1214/aoms/1177704472. J. S. Marron and M. P. Wand, "Exact mean integrated squared error," Annals of Statistics 20(2), 1992.',
        href: 'https://doi.org/10.1214/aoms/1177704472',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="A bimodal density with three kernel estimates at different bandwidths, beside the U-shaped curve of error against bandwidth with the rule's choice marked">
        {(() => {
          const phi = (x, mu, s) => Math.exp(-0.5 * ((x - mu) / s) ** 2) / (s * Math.sqrt(2 * Math.PI));
          const truth = (x) => 0.5 * phi(x, -1.5, 0.5) + 0.5 * phi(x, 1.5, 0.5);
          // a small deterministic sample standing in for the 300 points
          const pts = [];
          let seed = 7;
          const rnd = () => {
            seed = (seed * 16807) % 2147483647;
            return seed / 2147483647;
          };
          for (let i = 0; i < 60; i += 1) {
            const u1 = rnd();
            const u2 = rnd();
            const z = Math.sqrt(-2 * Math.log(u1 || 1e-9)) * Math.cos(2 * Math.PI * u2);
            pts.push((i % 2 === 0 ? -1.5 : 1.5) + 0.5 * z);
          }
          const kde = (x, h) => pts.reduce((s, p) => s + phi(x, p, h), 0) / pts.length;
          const x0 = 30;
          const y0 = 230;
          const pw = 300;
          const ph = 180;
          const X = (x) => x0 + ((x + 3.5) / 7) * pw;
          const Y = (v) => y0 - (v / 0.5) * ph;
          const curve = (f) => Array.from({ length: 141 }, (_, i) => -3.5 + i * 0.05).map((x) => `${X(x)},${Y(Math.min(f(x), 0.5))}`).join(' ');
          const bx = 390;
          const by = 230;
          const bw = 220;
          const bh = 180;
          const hs = [0.05, 0.08, 0.12, 0.17, 0.227, 0.3, 0.4, 0.453, 0.55, 0.7, 0.9, 1.2, 1.5];
          const ise = [0.030, 0.016, 0.0085, 0.0047, 0.0033, 0.0046, 0.0105, 0.0165, 0.029, 0.052, 0.078, 0.108, 0.121];
          const XH = (h) => bx + ((Math.log(h) - Math.log(0.03)) / (Math.log(1.5) - Math.log(0.03))) * bw;
          const YI = (e) => by - ((Math.log10(e) + 2.6) / 1.8) * bh;
          return (
            <g>
              <line x1={x0} y1={y0} x2={x0 + pw} y2={y0} stroke="#9aa5bd" strokeOpacity="0.6" />
              <polyline points={curve(truth)} fill="none" stroke="#9aa5bd" strokeWidth="2.5" />
              <polyline points={curve((x) => kde(x, 0.03))} fill="none" stroke="#e2606c" strokeWidth="1" strokeOpacity="0.8" />
              <polyline points={curve((x) => kde(x, 0.453))} fill="none" stroke="#f0b94b" strokeWidth="2" />
              <polyline points={curve((x) => kde(x, 0.227))} fill="none" stroke="#5da2ff" strokeWidth="2" />
              {pts.map((p, i) => <circle key={i} cx={X(p)} cy={y0 - 3} r="1.5" fill="#e9edf6" fillOpacity="0.7" />)}
              <text x={x0} y="22" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">two modes; KDE h: blue .227, amber .453, red .03</text>
              <text x={x0} y={y0 + 16} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">the rule measures the gap between the modes and softens too far</text>
              <line x1={bx} y1={by} x2={bx + bw} y2={by} stroke="#9aa5bd" strokeOpacity="0.6" />
              <polyline points={hs.map((h, i) => `${XH(h)},${YI(ise[i])}`).join(' ')} fill="none" stroke="#62d98a" strokeWidth="2" />
              <circle cx={XH(0.227)} cy={YI(0.0033)} r="4" fill="#5da2ff" />
              <circle cx={XH(0.453)} cy={YI(0.0165)} r="4" fill="#f0b94b" />
              <circle cx={XH(0.198)} cy={YI(0.0034)} r="3" fill="#e9edf6" />
              <text x={XH(0.453) + 6} y={YI(0.0165)} fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="9">rule 0.453: 5.0x</text>
              <text x={XH(0.227) - 10} y={YI(0.0033) + 16} fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="9">oracle 0.227</text>
              <text x={XH(0.198) - 70} y={YI(0.0034) - 6} fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="9">LSCV 0.198: 1.03x</text>
              {[0.05, 0.2, 0.5, 1.5].map((h) => <text key={h} x={XH(h) - 8} y={by + 14} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">{h}</text>)}
              <text x={bx} y="22" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">exact ISE vs bandwidth (log-log), same sample</text>
              <text x={bx} y={by + 30} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">spiky on the left, blurred on the right</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'kernel_density_estimation_silverman_bandwidth.py',
  Viz: KdeViz,
  narration,
};
