import LaplaceMechanismViz from '../viz/LaplaceMechanismViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/differential_privacy_laplace_mechanism.py?raw';
import { narration } from './differential-privacy-laplace-mechanism.narration.js';

export const content = {
  given:
    'A database of a thousand people, each with a sensitive bit. Publish how many have it, usefully, so that nobody who sees the published number can tell whether any one person’s record was in the data, even an attacker who knows every other record.',
  task: 'Differential privacy. The algorithm is a definition with a release procedure attached (Dwork, McSherry, Nissim, Smith 2006): a randomized release M is ε-differentially private when for every two databases differing in one record and every set of outputs S, Pr[M(D) ∈ S] ≤ e^ε Pr[M(D′) ∈ S]. The heuristic is the Laplace mechanism: add noise drawn from the Laplace distribution with scale b = Δf / ε, where the global sensitivity Δf is the most one record can change the true answer. Two Laplace densities one sensitivity apart have a ratio of at most e^ε everywhere, which is exactly the guarantee, and the price is a mean absolute error of b, no more and no less.',
  constraint:
    'Measured on a count over 1,000 records and its neighbor one record away: 200,000 noisy releases of each, histogrammed, give a worst ratio of empirical probabilities of 2.785 in the ten bins holding at least 2,000 releases, against e¹ = 2.718 (inside a 10% statistical margin), and the exact Laplace density ratio evaluated on a grid peaks at 2.718282 and never above: the bound is tight. The mean absolute error is the scale: 9.994, 1.986, 1.004, 0.503 at ε = 0.1, 0.5, 1, 2 against b = 10, 2, 1, 0.5, with variances 199.2, 7.89, 2.00, 0.51 against 2b². Ten releases at ε = 0.1 each never let the adversary’s log-likelihood ratio exceed the composed 1.0 (mean 0.048, 99th percentile 0.80). An attacker who knows both neighbors identifies the true one 0.698 of the time against Laplace at ε = 1 (the theorem allows at most 0.731), 0.526 at ε = 0.1, 0.952 against uncalibrated noise of standard deviation 0.3, and 1.000 against exact release. The Gaussian mechanism at (ε = 1, δ = 10⁻⁵) has error 3.86 on one count against 1.00, and 27.3 against 50.1 on fifty counts under one budget.',

  origins: (
    <p>
      Cynthia Dwork, Frank McSherry, Kobbi Nissim, and Adam Smith
      (<strong>2006</strong>, &quot;Calibrating noise to sensitivity in
      private data analysis,&quot; TCC) defined differential privacy and
      proved the Laplace mechanism achieves it, after Dinur and Nissim
      (2003) showed that answering too many exact or lightly perturbed
      counts lets an attacker reconstruct a database. Warner&apos;s
      randomized response (1965) was the local-privacy ancestor; the
      Gaussian mechanism and (ε, δ) relaxation followed in Dwork,
      Kenthapadi, McSherry, Mironov, and Naor (2006); McSherry and Talwar
      (2007) gave the exponential mechanism for selection; Dwork and Roth&apos;s
      monograph (2014) is the standard text. The U.S. Census Bureau released
      the 2020 census redistricting data under differential privacy, Apple
      and Google ship local variants in their telemetry, and the moments
      accountant (Abadi et al. 2016) carries the idea into model training.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>guarantee</strong>: a statement about every pair of
      neighboring databases and every output set, not about an attacker&apos;s
      knowledge, so it survives an adversary who knows the other 999
      records. The referee is that pair: the count of a thousand records
      and its neighbor one record away, with 200,000 releases of each
      histogrammed and every populated bin&apos;s probability ratio checked
      against e^ε (worst 2.785 against 2.718 within the margin), the exact
      density ratio tight at <strong>2.718282</strong>, and an optimal
      attacker who knows both databases succeeding{' '}
      <strong>0.698 of the time</strong> against the theorem&apos;s ceiling
      of 0.731. Composition is a theorem too: ten releases at ε = 0.1 never
      exceeded a log-likelihood ratio of 1.0.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>noise</strong>: Laplace with scale b = Δf/ε, no
      more and no less. Measured, the mean absolute error is the scale
      (1.004 at b = 1, 9.994 at b = 10) and the variance is 2b²; the
      sensitivity decides everything else, measured by trying every record
      and both extreme replacements: 1 for a count, 99.99 of 100 for a sum
      of bounded values, 0.100 for a mean of 1,000, and a median whose
      local change is 0.116 but whose global bound is the whole range of
      100, which is why medians get the exponential mechanism instead. The
      honest comparison with the Gaussian: <strong>Laplace wins one count
      (1.00 against 3.86)</strong> and loses fifty counts under one budget
      (50.1 against 27.3) because its L1 calibration adds up where the
      Gaussian&apos;s L2 does not.
    </p>
  ),

  picture: (
    <p>
      A census clerk answering &quot;how many people on this street have
      the condition&quot; by rolling a weighted die and adding the result
      before speaking. The die is weighted so that whether or not one
      particular neighbor is counted, every possible spoken number is
      almost equally likely, within a fixed factor, and &quot;almost&quot;
      is a number you choose. Ask the clerk ten times and the factors
      multiply, so the budget is spent. Ask for a sum of incomes and the
      die must be a hundred times heavier, because one rich neighbor moves
      the sum a hundred times further than one neighbor moves a count.
    </p>
  ),

  steps: [
    <>
      <strong>Sensitivity:</strong> Δf = max over neighboring databases of
      |f(D) − f(D′)|: 1 for a count, the range for a sum, range/n for a
      mean.
    </>,
    <>
      <strong>Budget:</strong> choose ε; smaller is more private; the
      attacker&apos;s best success against one bit is at most e^ε/(1 + e^ε).
    </>,
    <>
      <strong>Noise:</strong> draw Lap(b) with b = Δf/ε (density e^{'{−|x|/b}'}/2b):
      sample u uniform on (−½, ½), return −b sign(u) ln(1 − 2|u|).
    </>,
    <>
      <strong>Release</strong> f(D) + noise; the density ratio of the two
      neighbors&apos; outputs is e^{'{(|x − f(D′)| − |x − f(D)|)/b}'} ≤ e^{'{Δf/b}'} = e^ε.
    </>,
    <>
      <strong>Account:</strong> k releases compose to kε (10 × 0.1 = 1.0
      here, never exceeded); stop releasing when the budget is spent.
    </>,
  ],

  signals: [
    <>
      <strong>A trusted curator and a sensitive population:</strong> census
      tables, medical counts, usage statistics released to the public.
    </>,
    <>
      <strong>Low-sensitivity numeric queries:</strong> counts, histograms,
      bounded sums and means, where Δf is small and known.
    </>,
    <>
      <strong>A guarantee you can state, not a hope:</strong> auditors,
      regulators, or a paper that must say what an attacker cannot learn.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>exact release</strong>: publish the
      true count. Error 0.00, and an attacker who knows the other 999
      records reads the last person&apos;s bit with certainty: success 1.000.
      Uncalibrated noise of standard deviation 0.3 is barely better: 0.952.
    </>
  ),

  strength: (
    <>
      <strong>A provable ceiling on what anyone learns, at a known
      price.</strong> Density ratio tight at e^ε, attacker success 0.698
      against the theorem&apos;s 0.731, error exactly b (1.004 at ε = 1), the
      budget composing additively (1.0 never exceeded over ten releases);
      one count answered to within a single person.
    </>
  ),
  weakness: (
    <>
      <strong>Sensitivity is global, budgets are finite, and L1 adds
      up.</strong> A median&apos;s local change here is 0.116 but its global
      sensitivity is 100, so the Laplace scale is useless for it; fifty
      counts under one budget cost error 50.1 where the Gaussian pays
      27.3; local privacy without a curator costs 24.4 on the same count;
      and ε is a policy choice the mathematics does not make for you.
    </>
  ),

  problem: 'Differential privacy',
  problemSlug: 'differential-privacy',
  rivals: [
    {
      name: 'Differential privacy × Laplace mechanism',
      isThisUnit: true,
      algoName: 'Differential privacy',
      cost: 'one Laplace draw per release; error b = Δf/ε',
      wins: (
        <>
          <strong>Pure ε</strong>, density ratio tight at e^ε, error 1.00 on
          a count at ε = 1; the attacker held to 0.698 against a 0.731
          ceiling.
        </>
      ),
      costs: (
        <>
          L1 sensitivity adds up: 50.1 on fifty counts.
        </>
      ),
      when: 'A trusted curator, a few low-sensitivity queries, and a guarantee with no δ.',
    },
    {
      name: 'Gaussian mechanism (differential privacy)',
      algoName: 'Differential privacy',
      cost: 'one Gaussian draw; σ = Δ₂ √(2 ln(1.25/δ)) / ε',
      wins: (
        <>
          Calibrated to L2 sensitivity, so a batch of fifty counts costs 27.3
          against 50.1; composes tightly; the mechanism behind private SGD.
        </>
      ),
      costs: (
        <>
          A δ (10⁻⁵ here) of failure probability; 3.86 against 1.00 on a
          single count.
        </>
      ),
      when: 'Many queries or high-dimensional releases under one budget, where approximate privacy is acceptable.',
    },
    {
      name: 'Randomized response',
      algoName: 'Randomized response',
      cost: 'each person flips a biased coin; no curator',
      wins: (
        <>
          Local privacy: nobody ever holds the true data; the same e^ε/(1 +
          e^ε) ceiling per person; what phones ship.
        </>
      ),
      costs: (
        <>
          Error 24.4 on the count of 1,000 against 1.00: noise grows with
          √n instead of staying constant.
        </>
      ),
      when: 'The collector cannot be trusted and the population is large enough to pay √n.',
    },
    {
      name: 'K-anonymity',
      algoName: 'K-anonymity',
      cost: 'generalize quasi-identifiers until every row has k twins',
      wins: (
        <>
          No noise, exact aggregates, a regulator-friendly table; the
          pre-2006 standard.
        </>
      ),
      costs: (
        <>
          No guarantee against an attacker with background knowledge:
          homogeneity and differencing attacks read sensitive values
          exactly.
        </>
      ),
      when: 'Releasing a microdata table where syntactic anonymity is the legal requirement and the adversary is weak.',
    },
  ],
  neverUse: {
    name: 'Exact or uncalibrated release when the attacker can difference two queries',
    why: (
      <>
        Release the count for the street, then the count for the street
        without one house, and the difference is that household&apos;s bit.
        Measured: with exact counts the attacker who knows both candidate
        databases is right <strong>1.000</strong> of the time; with
        &quot;a little noise&quot; of standard deviation 0.3 added by feel,{' '}
        <strong>0.952</strong>; with Laplace noise calibrated to the
        sensitivity at ε = 1, 0.698, and at ε = 0.1, 0.526, a coin flip.
        Dinur and Nissim proved in 2003 that enough lightly perturbed
        counts reconstruct the whole database; the noise has to be scaled
        to what one record can change, or it is decoration.
      </>
    ),
  },

  contest: {
    instance:
      'a database of 1,000 records (a sensitive bit, a bounded value) and its neighbor one record away; the released count, scored by mean absolute error, and by the success rate of an attacker who knows both candidate databases and sees one release (100,000 trials); the theorem: no attacker beats e^ε/(1 + e^ε) = 0.731 against a pure ε = 1 mechanism',
    columns: ['guarantee', 'MAE, one count', 'MAE, fifty counts, one budget', 'attacker success'],
    rows: [
      {
        method: 'Laplace, ε = 1',
        isThisUnit: true,
        values: ['pure ε = 1', '1.00', '50.1', '0.698 (ceiling 0.731)'],
        best: 1,
        verdict: 'the guarantee, at the price of b',
      },
      {
        method: 'Laplace, ε = 0.1',
        values: ['pure ε = 0.1', '10.00', '·', '0.526'],
        verdict: 'near a coin flip, ten times the error',
      },
      {
        method: 'Gaussian, ε = 1, δ = 10⁻⁵',
        values: ['approximate (ε, δ)', '3.86', '27.3', '0.544'],
        verdict: 'loses one count, wins the batch',
      },
      {
        method: 'randomized response, ε = 1 (local)',
        values: ['pure ε = 1, no curator', '24.4', '·', '0.731 (per person)'],
        verdict: 'privacy without trust, at √n',
      },
      {
        method: 'uncalibrated noise, std 0.3',
        values: ['none', '0.24', '·', '0.952'],
        verdict: 'decoration',
      },
      {
        method: 'exact release',
        values: ['none', '0.00', '0.00', '1.000'],
        verdict: 'the baseline: the bit is read off',
      },
    ],
    source:
      'python solutions/differential_privacy_laplace_mechanism.py prints this table and asserts: the worst empirical probability ratio over populated bins within a 10% margin of e^ε and the exact density ratio equal to e^ε within 1e-9; mean absolute error within 2% of b and variance within 5% of 2b² at four epsilons; measured local sensitivities at or under the global bounds, with the count exactly 1 and the mean within 1% of range/n; the composed log-likelihood ratio never above kε over 100,000 trials; the Gaussian’s error above three times Laplace’s on one count and below it on fifty; randomized response’s error within 10% of its closed form; the attacker’s success against Laplace within 0.01 of 1 − e^(−ε/2)/2 and under the e^ε/(1 + e^ε) ceiling, under 0.53 at ε = 0.1, exactly 1 against exact release, above 0.9 against uncalibrated noise.',
  },

  figure: (
    <Figure
      id="fig-laplace-mechanism"
      aspect="16 / 7"
      caption="Left: the two Laplace output densities for neighboring databases whose counts differ by one, at ε = 1 (scale b = 1): wherever you look, one is at most e times the other, and the ratio reaches exactly e outside the gap between the two centers. Right: the mean absolute error of the released count against ε for the Laplace mechanism (b = 1/ε) and the Gaussian mechanism at δ = 10⁻⁵, with the measured points; the Gaussian pays about 3.9 times more for a single count."
      cite={{
        text: 'C. Dwork, F. McSherry, K. Nissim, and A. Smith, "Calibrating noise to sensitivity in private data analysis," Theory of Cryptography Conference 2006, DOI 10.1007/11681878_14. C. Dwork and A. Roth, The Algorithmic Foundations of Differential Privacy, Foundations and Trends in Theoretical Computer Science 9(3-4), 2014.',
        href: 'https://doi.org/10.1007/11681878_14',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="Two overlapping Laplace densities one unit apart with their ratio marked, and error against epsilon for the Laplace and Gaussian mechanisms with measured points">
        {(() => {
          const x0 = 36;
          const y0 = 220;
          const pw = 280;
          const ph = 170;
          const X = (x) => x0 + ((x + 4) / 9) * pw;
          const Y = (d) => y0 - (d / 0.55) * ph;
          const lap = (x, mu) => Math.exp(-Math.abs(x - mu)) / 2;
          const pts = (mu) => Array.from({ length: 181 }, (_, i) => -4 + i * 0.05).map((x) => `${X(x)},${Y(lap(x, mu))}`).join(' ');
          const bx = 390;
          const by = 220;
          const bw = 220;
          const bh = 170;
          const XE = (e) => bx + ((Math.log10(e) + 1) / 1.3) * bw;
          const YM = (m) => by - ((Math.log10(m) + 0.5) / 2) * bh;
          const lapCurve = Array.from({ length: 61 }, (_, i) => 0.1 * 10 ** (i / 46.15)).map((e) => `${XE(e)},${YM(1 / e)}`).join(' ');
          const gauss = (e) => (Math.sqrt(2 * Math.log(1.25 / 1e-5)) / e) * Math.sqrt(2 / Math.PI);
          const gaussCurve = Array.from({ length: 61 }, (_, i) => 0.1 * 10 ** (i / 46.15)).map((e) => `${XE(e)},${YM(gauss(e))}`).join(' ');
          const measured = [[0.1, 9.994], [0.5, 1.986], [1, 1.004], [2, 0.503]];
          return (
            <g>
              <line x1={x0} y1={y0} x2={x0 + pw} y2={y0} stroke="#9aa5bd" strokeOpacity="0.6" />
              <polyline points={pts(0)} fill="none" stroke="#5da2ff" strokeWidth="2" />
              <polyline points={pts(1)} fill="none" stroke="#f0b94b" strokeWidth="2" />
              <line x1={X(0)} y1={Y(0)} x2={X(0)} y2={Y(0.5)} stroke="#5da2ff" strokeDasharray="3 3" />
              <line x1={X(1)} y1={Y(0)} x2={X(1)} y2={Y(0.5)} stroke="#f0b94b" strokeDasharray="3 3" />
              <text x={X(0) - 14} y={y0 + 14} fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="9">f(D)</text>
              <text x={X(1) - 2} y={y0 + 14} fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="9">f(D′) = f(D) + 1</text>
              <text x={X(2.2)} y={Y(lap(2.2, 1)) - 8} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">ratio exactly e out here</text>
              <text x={x0} y="22" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">output densities of the two neighbors, ε = 1, b = 1</text>
              <text x={x0} y={y0 + 32} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">measured over 200,000 releases: worst bin ratio 2.785 vs e = 2.718</text>
              <text x={x0} y={y0 + 46} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">exact density ratio peaks at 2.718282, never above</text>
              <line x1={bx} y1={by} x2={bx + bw} y2={by} stroke="#9aa5bd" strokeOpacity="0.6" />
              <polyline points={lapCurve} fill="none" stroke="#5da2ff" strokeWidth="2" />
              <polyline points={gaussCurve} fill="none" stroke="#9aa5bd" strokeWidth="2" strokeDasharray="5 3" />
              {measured.map(([e, m]) => <circle key={e} cx={XE(e)} cy={YM(m)} r="3.5" fill="#e9edf6" />)}
              {[0.1, 0.5, 1, 2].map((e) => <text key={e} x={XE(e) - 8} y={by + 14} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">{e}</text>)}
              {[0.5, 1, 10].map((m) => <text key={m} x={bx - 22} y={YM(m) + 3} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">{m}</text>)}
              <text x={bx} y="22" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">mean absolute error vs ε (log-log), one count</text>
              <text x={bx} y="36" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="10">Laplace b = 1/ε, dots measured</text>
              <text x={bx} y="50" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">Gaussian, δ = 10⁻⁵ (dashed): 3.9x</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'differential_privacy_laplace_mechanism.py',
  Viz: LaplaceMechanismViz,
  narration,
};
