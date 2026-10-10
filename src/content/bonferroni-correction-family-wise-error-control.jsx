import BonferroniViz from '../viz/BonferroniViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/bonferroni_correction_family_wise_error_control.py?raw';
import { narration } from './bonferroni-correction-family-wise-error-control.narration.js';

export const content = {
  given:
    'Twenty subgroup analyses, a hundred genes, a thousand pixels: m hypothesis tests run at once, each with its own p-value, and a reader who will remember only the ones you call significant. Decide which to call, so that the chance of making any false claim across the whole family stays at α.',
  task: 'Bonferroni correction. The algorithm is the correction itself: test each hypothesis at level α/m, or equivalently multiply each p-value by m and compare it to α. The heuristic is the target it serves: the family-wise error rate, the probability of at least one false rejection, held at or below α by the union bound, P(A₁ ∪ ... ∪ Aₘ) ≤ ΣP(Aᵢ) = m · α/m = α, which asks nothing about how the m tests depend on one another. The price is paid in power: every real effect must now clear α/m instead of α.',
  constraint:
    'Measured at α = 0.05 with two-sided z-tests and exact p-values, thousands of simulated families: with every hypothesis null, the uncorrected family-wise error rate is 0.639 at m = 20 and 0.992 at m = 100; Bonferroni holds it at 0.0473 and 0.0507 (exact 0.0488), 0.0400 at m = 1,000, and 0.0247 to 0.0373 under a common positive factor, where the bound is merely conservative. Sidak sits at 0.0490 and 0.0513 (exact 0.05). On every family Bonferroni’s rejections sat inside Holm’s, and Holm’s inside Benjamini-Hochberg’s. With 10 real effects of 3.5 standard errors among 100 tests: power 0.511 for Bonferroni, 0.516 for Holm, 0.733 for BH, 0.939 uncorrected; FWER 0.044, 0.047, 0.321, and 0.990; FDR 0.008, 0.008, 0.046 (theorem 0.045), and 0.310. The median smallest p-value among 20 nulls is 0.0334; the best of twenty subgroups clears 0.05 in 63.9% of experiments.',

  origins: (
    <p>
      Carlo Emilio Bonferroni published the inequalities in{' '}
      <strong>1936</strong> (&quot;Teoria statistica delle classi e calcolo
      delle probabilità,&quot; Pubblicazioni del R. Istituto Superiore di
      Scienze Economiche e Commerciali di Firenze), and Olive Jean Dunn
      (1961, Journal of the American Statistical Association) turned them
      into the multiple-comparison procedure that carries his name. Zbyněk
      Šidák (1967) gave the slightly sharper 1 − (1 − α)^(1/m) for the
      multivariate normal; Sture Holm (1979) showed the step-down version
      is uniformly more powerful at the same guarantee; Yoav Benjamini and
      Yosef Hochberg (1995) changed the target to the false discovery
      rate and made genome-scale testing feasible. Bonferroni remains the
      correction every reviewer accepts without argument, the one behind
      the 5σ discovery threshold in particle physics (a look-elsewhere
      correction over a search window) and the genome-wide 5 × 10⁻⁸.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>rule</strong>: divide α by m, compare, done; or
      multiply each p-value by m to get an adjusted p-value that a reader
      can compare to any α. The referee is exact: with every hypothesis
      null and the tests independent, the family-wise error rate is
      exactly 1 − (1 − α/m)^m = 0.0488, and the measured 0.0473 at m = 20
      and 0.0507 at m = 100 sit inside their standard errors of 0.004;
      with no correction the same families false-alarm{' '}
      <strong>63.9% and 99.2%</strong> of the time, against the exact
      0.642 and 0.994.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>guarantee</strong>: the family-wise error rate,
      bounded by the union bound whatever the dependence. Measured under
      a common positive factor (correlation 0.5) the rate falls to 0.0373
      and 0.0247, and under centering (negative correlation) to 0.0467 and
      0.0500: <strong>never above α</strong> in nine null settings. What
      the guarantee costs shows with real effects present: 10 effects of
      3.5 standard errors among 100 tests are found 51.1% of the time
      against 93.9% uncorrected, while Benjamini-Hochberg finds 73.3% by
      controlling a different thing, the false discovery rate (0.046),
      and lets the family-wise error rate rise to 0.321.
    </p>
  ),

  picture: (
    <p>
      A fire marshal inspecting twenty rooms with a smoke test that goes off
      falsely one time in twenty. Test every room at that sensitivity and
      the building is &quot;on fire&quot; somewhere in two out of three
      inspections of a perfectly safe building. The marshal&apos;s rule: if
      the whole building may be condemned on any single alarm, each alarm
      must be made twenty times harder to trigger, so that a false alarm
      anywhere in the building is again a one-in-twenty event. Real
      smoke now has to be twenty times thicker to be noticed; that is the
      bargain, and the marshal knows it.
    </p>
  ),

  steps: [
    <>
      <strong>Count the family:</strong> m is every test you ran or could
      have reported, not every test you chose to mention.
    </>,
    <>
      <strong>Divide:</strong> reject hypothesis i if pᵢ ≤ α/m; equivalently
      report the adjusted value min(1, m · pᵢ).
    </>,
    <>
      <strong>Guarantee:</strong> P(any false rejection) ≤ Σ P(pᵢ ≤ α/m over a
      true null) = m₀ · α/m ≤ α, for any dependence among the tests.
    </>,
    <>
      <strong>Sharpen if you can:</strong> Holm&apos;s step-down (sort the
      p-values, compare the k-th smallest to α/(m − k + 1), stop at the first
      failure) rejects a superset at the same guarantee.
    </>,
    <>
      <strong>Change the target if you may:</strong> when a few false
      discoveries among many are acceptable, Benjamini-Hochberg controls
      the expected false fraction at α and finds far more.
    </>,
  ],

  signals: [
    <>
      <strong>One false claim is one too many:</strong> a drug approval, a
      confirmatory trial, a discovery announcement.
    </>,
    <>
      <strong>The family is small or the effects are large:</strong> m in the
      tens, effects of several standard errors; the power loss is bearable.
    </>,
    <>
      <strong>Dependence is unknown:</strong> the union bound needs nothing;
      Šidák and BH need independence or positive dependence for exactness.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>no correction</strong>: each test at α.
      Power 0.939 on the real effects, and a false claim in 99.0% of
      families of 100 and 63.9% of families of 20 when nothing is there.
    </>
  ),

  strength: (
    <>
      <strong>A guarantee with no assumptions, in one division.</strong>{' '}
      Family-wise error 0.047 to 0.051 under independence (exact 0.0488),
      lower under any correlation tried; adjusted p-values a reader can
      check by hand; the correction nobody has to be talked into.
    </>
  ),
  weakness: (
    <>
      <strong>Power, and a family that is hard to count.</strong> 51.1%
      of real effects found against 93.9% uncorrected at m = 100, and 29.0%
      at m = 1,000; conservative under positive dependence (0.0247 where
      0.05 was allowed); dominated by Holm at the same guarantee (51.6%);
      and silent about which tests belong to the family, the question
      that decides everything.
    </>
  ),

  problem: 'Multiple testing correction',
  problemSlug: 'multiple-testing',
  rivals: [
    {
      name: 'Bonferroni correction × Family-wise error control',
      isThisUnit: true,
      algoName: 'Bonferroni correction',
      cost: 'one division; no sorting, no assumptions',
      wins: (
        <>
          <strong>FWER 0.047 to 0.051</strong> against the exact 0.0488, and
          below α under every dependence tried; adjusted p-values by hand.
        </>
      ),
      costs: (
        <>
          Power 0.511 against 0.939 uncorrected at m = 100.
        </>
      ),
      when: 'Few tests, large effects, unknown dependence, and a reader who must be convinced.',
    },
    {
      name: 'Holm-Bonferroni',
      algoName: 'Holm-Bonferroni',
      cost: 'a sort and a step-down scan',
      wins: (
        <>
          The same family-wise guarantee with a superset of the rejections
          on every family measured; power 0.516 against 0.511.
        </>
      ),
      costs: (
        <>
          The gain is small when effects are few; a sorted list to explain.
        </>
      ),
      when: 'Always, when you want family-wise control and can sort: it is never worse.',
    },
    {
      name: 'Benjamini-Hochberg',
      algoName: 'Benjamini-Hochberg',
      cost: 'a sort and a step-up scan',
      wins: (
        <>
          Power 0.733 at m = 100 and 0.640 at m = 1,000; the false discovery
          rate held at 0.046 against the theorem&apos;s 0.045.
        </>
      ),
      costs: (
        <>
          No family-wise guarantee: FWER 0.321 and 0.793 with real effects
          present; needs independence or positive dependence.
        </>
      ),
      when: 'Screening thousands of hypotheses where a 5% false fraction among the discoveries is acceptable.',
    },
    {
      name: 'Permutation test',
      algoName: 'Permutation test',
      cost: 'thousands of relabelings per family',
      wins: (
        <>
          The max-statistic permutation distribution learns the dependence
          and gives exact family-wise control without the union bound.
        </>
      ),
      costs: (
        <>
          Compute per family; exchangeability needed; harder to report.
        </>
      ),
      when: 'Strongly correlated tests (imaging, genomics) where Bonferroni is too conservative to find anything.',
    },
  ],
  neverUse: {
    name: 'No correction, with the best of many analyses reported',
    why: (
      <>
        Run twenty subgroup analyses of a treatment that does nothing and
        report the one with the smallest p-value. Its median value is{' '}
        <strong>0.0334</strong> (the theory for the smallest of twenty is
        0.0341), so the best subgroup clears 0.05 in 63.9% of such
        experiments and the best of a hundred in 99.2%; across the thousand
        families of 100 nulls measured here, uncorrected testing made at
        least one false claim 992 times. The reader sees one test; the
        family was twenty, and the Bonferroni threshold for a family of
        twenty is 0.0025. The correction is not conservative here; the
        uncorrected claim is simply wrong about what was tested.
      </>
    ),
  },

  contest: {
    instance:
      'simulated families at α = 0.05 with two-sided z-tests and exact p-values: all-null families of 20, 100, and 1,000 (3,000, 3,000, and 600 repetitions) under independence, a common positive factor, and centering; mixed families of 100 with 10 real effects and 1,000 with 50, each effect 3.5 standard errors; referee: the exact expectations of each rule, Monte Carlo standard errors, and set inclusions checked on every family',
    columns: ['FWER, m = 100 null (exact)', 'FWER, common factor', 'power with 10 effects in 100', 'FWER with effects', 'FDR with effects'],
    rows: [
      {
        method: 'Bonferroni (α / m)',
        isThisUnit: true,
        values: ['0.0507 (0.0488)', '0.0247', '0.511', '0.044', '0.008'],
        best: 3,
        verdict: 'the guarantee, at a price',
      },
      {
        method: 'Šidák (1 − (1 − α)^(1/m))',
        values: ['0.0513 (0.0500)', '0.0247', '·', '·', '·'],
        verdict: 'exact under independence, same price',
      },
      {
        method: 'Holm step-down',
        values: ['0.0507', '0.0247', '0.516', '0.047', '0.008'],
        verdict: 'a superset of Bonferroni, same guarantee',
      },
      {
        method: 'Benjamini-Hochberg step-up',
        values: ['0.0527', '0.0310', '0.733', '0.321', '0.046 (theorem 0.045)'],
        verdict: 'a different target: FDR, not FWER',
      },
      {
        method: 'no correction',
        values: ['0.992 (0.994)', '0.781', '0.939', '0.990', '0.310'],
        verdict: 'the baseline; a false claim almost always',
      },
    ],
    source:
      'python solutions/bonferroni_correction_family_wise_error_control.py prints this table and asserts: Bonferroni’s family-wise error rate at or below α within 2.5 standard errors in all nine null settings, equal to the exact 1 − (1 − α/m)^m within 3 standard errors under independence; Šidák equal to α under independence and at or below it under dependence; no correction equal to 1 − 0.95^m; Bonferroni within Holm within Benjamini-Hochberg as sets on every family; with real effects, Bonferroni and Holm at or below α, Holm at least as powerful as Bonferroni, BH at least as powerful as Holm, no correction above BH, BH’s FDR at α m₀/m within Monte Carlo error, and BH’s FWER above α; the median smallest null p-value within 35% of 1 − 0.5^(1/m); and the uncorrected FWER above 0.97 at m = 100.',
  },

  figure: (
    <Figure
      id="fig-bonferroni-fwer"
      aspect="16 / 7"
      caption="Left: the family-wise error rate of uncorrected testing against the number of null hypotheses, 1 − 0.95^m (gray), with the measured points at m = 20, 100, and 1,000, against the Bonferroni line held at α (blue, measured 0.047, 0.051, 0.040 under independence and 0.037, 0.025, 0.027 under a common factor). Right: with 10 real effects among 100 tests, each rule's power (bars) and its family-wise error rate (dots): Bonferroni and Holm keep the guarantee at half the discoveries, Benjamini-Hochberg finds 73% at a false discovery rate of 0.046 but a family-wise error of 0.32, and no correction finds 94% with a false claim in 99% of families."
      cite={{
        text: 'C. E. Bonferroni, "Teoria statistica delle classi e calcolo delle probabilità," Pubblicazioni del R. Istituto Superiore di Scienze Economiche e Commerciali di Firenze 8, 1936. O. J. Dunn, "Multiple comparisons among means," JASA 56(293), 1961, DOI 10.1080/01621459.1961.10482090. S. Holm, Scandinavian Journal of Statistics 6, 1979. Y. Benjamini and Y. Hochberg, JRSS B 57(1), 1995.',
        href: 'https://doi.org/10.1080/01621459.1961.10482090',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="Family-wise error rate against the number of tests for uncorrected and Bonferroni testing, and bars of power with dots of family-wise error for four rules with real effects present">
        {(() => {
          const x0 = 44;
          const y0 = 230;
          const pw = 260;
          const ph = 180;
          const X = (m) => x0 + ((Math.log10(m) - 0) / 3) * pw;
          const Y = (v) => y0 - v * ph;
          const curve = [];
          for (let e = 0; e <= 3; e += 0.05) {
            const m = 10 ** e;
            curve.push(`${X(m)},${Y(1 - 0.95 ** m)}`);
          }
          const measured = [[20, 0.639, 0.0473, 0.0373], [100, 0.992, 0.0507, 0.0247], [1000, 1.0, 0.04, 0.0267]];
          const bx = 380;
          const by = 230;
          const bars = [['Bonferroni', 0.511, 0.044, '#5da2ff'], ['Holm', 0.516, 0.047, '#5da2ff'], ['BH', 0.733, 0.321, '#f0b94b'], ['none', 0.939, 0.99, '#e2606c']];
          return (
            <g>
              <line x1={x0} y1={y0} x2={x0 + pw} y2={y0} stroke="#9aa5bd" strokeOpacity="0.6" />
              <polyline points={curve.join(' ')} fill="none" stroke="#9aa5bd" strokeWidth="2" />
              <line x1={x0} y1={Y(0.05)} x2={x0 + pw} y2={Y(0.05)} stroke="#5da2ff" strokeWidth="2" />
              {measured.map(([m, nc, b, cf]) => (
                <g key={m}>
                  <circle cx={X(m)} cy={Y(nc)} r="4" fill="#e9edf6" />
                  <circle cx={X(m)} cy={Y(b)} r="4" fill="#5da2ff" />
                  <circle cx={X(m)} cy={Y(cf)} r="3" fill="#62d98a" />
                </g>
              ))}
              {[1, 10, 100, 1000].map((m) => <text key={m} x={X(m) - 8} y={y0 + 14} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">{m}</text>)}
              {[0, 0.5, 1].map((v) => <text key={v} x={x0 - 26} y={Y(v) + 3} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">{v.toFixed(1)}</text>)}
              <text x={x0} y="22" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">P(any false claim) vs number of null tests m</text>
              <text x={x0} y="36" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">gray: no correction, 1 - 0.95^m; blue: Bonferroni at alpha</text>
              <text x={x0} y={y0 + 30} fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="10">green: Bonferroni under a common factor, conservative</text>
              <text x={bx} y="22" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">10 real effects in 100: power (bars), FWER (dots)</text>
              {bars.map(([name, pow, fwer, c], i) => (
                <g key={name}>
                  <rect x={bx + i * 60} y={by - pow * 180} width="36" height={pow * 180} fill={c} fillOpacity="0.8" />
                  <text x={bx + i * 60} y={by - pow * 180 - 5} fill={c} fontFamily="ui-monospace, monospace" fontSize="9">{pow.toFixed(3)}</text>
                  <circle cx={bx + i * 60 + 46} cy={by - fwer * 180} r="4" fill="#e9edf6" />
                  <text x={bx + i * 60 + 2} y={by + 12} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="8">{name}</text>
                </g>
              ))}
              <line x1={bx} y1={by - 0.05 * 180} x2={bx + 240} y2={by - 0.05 * 180} stroke="#9aa5bd" strokeDasharray="3 3" />
              <text x={bx} y={by + 28} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">dashed: alpha; BH FDR 0.046, FWER 0.321</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'bonferroni_correction_family_wise_error_control.py',
  Viz: BonferroniViz,
  narration,
};
