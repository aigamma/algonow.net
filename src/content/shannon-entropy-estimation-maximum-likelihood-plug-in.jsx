import EntropyEstimationViz from '../viz/EntropyEstimationViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/shannon_entropy_estimation_maximum_likelihood_plug_in.py?raw';
import { narration } from './shannon-entropy-estimation-maximum-likelihood-plug-in.narration.js';

export const content = {
  given:
    'A text, a spike train, a genome window, a column of categorical data: n samples from an unknown distribution over k symbols. Report its Shannon entropy in bits, and say honestly how far the number can be trusted.',
  task: 'Shannon entropy estimation. The algorithm is the estimator: count each symbol, divide by n, and put the frequencies into H = −Σ p log₂ p. The heuristic is the maximum likelihood plug-in itself: trust the empirical frequencies as if they were the truth. They are the maximum likelihood estimate of the distribution, so the number is the maximum likelihood estimate of the entropy, in one pass over the counts with nothing to tune. The price is a bias that is always negative (Jensen) and known to first order: about (k − 1)/(2n ln 2) bits when n ≫ k, and far worse when it is not.',
  constraint:
    'Measured against distributions with closed-form entropy and against the plug-in’s own exact expectation (a finite sum over binomial counts, confirmed by brute force on a four-symbol alphabet to 1e-12): for 100 equiprobable symbols (6.644 bits) the bias is −0.0728 bits at n = 1,000 against Miller’s first-order −0.0714, −0.00715 at n = 10,000 against −0.00714, −0.822 at n = 100, and −3.41 at n = 10, where the estimate collapses to 3.23 bits because ten samples can show at most ten kinds (log₂ 10 = 3.32). Miller-Madow brings the n = 1,000 bias to −0.0012 and the jackknife to +0.0018. Zipf over 100 symbols (5.310 bits): −0.0765 at n = 1,000, −0.0072 at 10,000. Fourteen Monte Carlo means, all within three standard errors of the exact expectation; 2,480 samples, none above log₂ of the symbols seen. A Zipf tail over 2,000 symbols at n = 2,000 sees 632 of them and sits 0.583 bits below its 8.115; independent variables show 0.0587 bits of plug-in mutual information. 0.7 s.',

  origins: (
    <p>
      Claude Shannon defined the entropy of a source in{' '}
      <strong>1948</strong> (&quot;A Mathematical Theory of Communication,&quot;
      Bell System Technical Journal 27) and in 1951 estimated the entropy
      of printed English from letter counts, the first plug-in in anger.
      George Miller and William Madow (1954 technical report; Miller&apos;s
      1955 &quot;Note on the bias of information estimates&quot;) found the
      (k − 1)/(2n) correction that carries both names; Georgii Basharin
      (1959) proved the estimator consistent and asymptotically normal
      with the same leading bias; Samuel Zahl (1977, Ecology) jackknifed
      it. Liam Paninski (2003, Neural Computation) proved that no unbiased
      estimator of entropy exists and that bias, not variance, dominates
      when the alphabet is large, the regime for which Nemenman, Shafee,
      and Bialek (2002) built their Bayesian estimator. The question is
      live wherever entropy is a measurement: neural coding, genetics,
      linguistics, anomaly detection, and every mutual information score
      ever read off a contingency table.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>formula and the referee</strong>. The formula is
      Shannon&apos;s; the referee is exact: the plug-in is a sum over
      symbols of a function of each symbol&apos;s count, each count is
      Binomial(n, pᵢ), so E[Ĥ] is a finite sum the file evaluates for any
      n, matched to 1e-12 by brute force over every count vector on a
      tiny alphabet. All fourteen Monte Carlo means on the page sit within{' '}
      <strong>three standard errors</strong> of that expectation, and the
      bias shrinks like 1/n: ratios 10.17 (uniform) and 10.66 (Zipf) from
      n = 1,000 to 10,000, against Miller&apos;s first-order formula to
      four digits at 10,000.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>plug-in and its bias</strong>. Trusting the
      frequencies measures the diversity of the sample, never of the
      source: on all 2,480 samples the estimate stayed at or below log₂ of
      the symbols actually seen, and at n = 10 for 100 equiprobable
      symbols it expects <strong>3.23 bits of 6.64</strong>. The spread is
      the honest surprise: it falls like 1/√n for Zipf (ratio 3.40 against
      √10 = 3.16) but like 1/n for the uniform source (ratio 11.06), whose
      leading variance term vanishes because every log pᵢ is equal. One
      added term, (k̂ − 1)/(2n ln 2), turns −0.0728 into −0.0012 at
      n = 1,000.
    </p>
  ),

  picture: (
    <p>
      A census taker who has interviewed ten people in a city of a hundred
      neighborhoods and met ten different ones. Asked how diverse the
      city is, the plug-in answers: ten neighborhoods, equally populated,
      3.3 bits. The city has a hundred, and 6.6 bits. Nothing in ten
      interviews can say so: every neighborhood not yet met is diversity
      that cannot be counted, and more interviews can only raise the
      number. The correction terms are the census taker&apos;s estimate of
      how many doors remain unknocked; when most of them do, no estimate
      from the interviews alone is honest.
    </p>
  ),

  steps: [
    <>
      <strong>Count:</strong> one pass over the n samples, a count cᵢ for
      each of the k symbols.
    </>,
    <>
      <strong>Plug in:</strong> Ĥ = log₂ n − (Σ cᵢ log₂ cᵢ)/n, the same
      number as −Σ (cᵢ/n) log₂ (cᵢ/n) with no division per symbol.
    </>,
    <>
      <strong>Correct:</strong> add (k̂ − 1)/(2n ln 2) bits, k̂ the symbols
      seen (Miller-Madow); or jackknife, n Ĥ − ((n − 1)/n) Σ cₛ Ĥ₋ₛ, one
      more pass since leaving out one occurrence changes one term.
    </>,
    <>
      <strong>Report with n against k:</strong> at n ≥ 10k the correction had millibit-scale bias on the tested uniform examples; individual estimates still vary, and this is no distribution-free accuracy guarantee; at n ≈ k say so, or reach
      for a Bayesian estimator.
    </>,
  ],

  signals: [
    <>
      <strong>n ≫ k:</strong> ten samples per symbol or more; with Miller&apos;s
      term the error is thousandths of a bit here.
    </>,
    <>
      <strong>Independent samples:</strong> a sequence with memory has a
      lower entropy rate that only a sequential estimator (Lempel-Ziv
      complexity) can see.
    </>,
    <>
      <strong>A number anyone can recompute:</strong> one pass, no prior, no
      tuning, an exact expectation to check against.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>compressed size per symbol</strong>: a
      Huffman code on the same counts spends 5.3185 bits against the
      plug-in&apos;s 5.2808 and the truth of 5.3102; within a bit above by
      Huffman&apos;s theorem, near the truth only because its overhead
      offsets the bias.
    </>
  ),

  strength: (
    <>
      <strong>One pass, no parameters, a bias you can compute.</strong>{' '}
      Exact expectation by a finite sum; first-order bias −0.00714 against
      the measured −0.00715 at n = 10,000; Miller-Madow to −0.0012 and the
      jackknife to +0.0018 at n = 1,000 for 100 symbols.
    </>
  ),
  weakness: (
    <>
      <strong>Biased low in expectation, and badly so when n is not large against k.</strong>{' '}
      −0.822 bits at n = 100, −3.41 at n = 10; 0.583 bits low on a
      2,000-symbol tail at n = 2,000 (632 symbols ever seen); 0.0587 bits
      of mutual information between independent variables, the predicted
      (kₓ − 1)(kᵧ − 1)/(2n ln 2) inflation that careless analyses call
      dependence.
    </>
  ),

  problem: 'Entropy and information estimation',
  problemSlug: 'entropy-estimation',
  rivals: [
    {
      name: 'Shannon entropy estimation × Maximum likelihood plug-in',
      isThisUnit: true,
      algoName: 'Shannon entropy estimation',
      cost: 'one pass over n samples, one over k counts',
      wins: (
        <>
          <strong>Exact expectation in closed form</strong>; bias −0.0728
          bits at n = 1,000, −0.00715 at 10,000 for 100 symbols, matching
          Miller&apos;s formula; no prior, nothing to tune.
        </>
      ),
      costs: (
        <>
          Always low: −0.822 at n = 100, −3.41 at n = 10, −0.583 on a heavy
          tail at n = k.
        </>
      ),
      when: 'n at least ten times k, independent samples, and a number a reviewer can recompute.',
    },
    {
      name: 'Miller-Madow correction',
      algoName: 'Miller-Madow correction',
      cost: 'one extra term, (k̂ − 1)/(2n ln 2)',
      wins: (
        <>
          Bias −0.0012 against −0.0728 at n = 1,000 and nothing visible at
          10,000; exact expectation still computable.
        </>
      ),
      costs: (
        <>
          Counts only the symbols seen: −0.370 at n = 100 and −0.356 on
          the 2,000-symbol tail at n = 2,000.
        </>
      ),
      when: 'Always, when n is comfortably larger than k; it costs one line.',
    },
    {
      name: 'Jackknife entropy estimator (Zahl)',
      algoName: 'Jackknife resampling',
      cost: 'a second pass over the counts',
      wins: (
        <>
          +0.0018 at n = 1,000, −0.065 at n = 100 where Miller-Madow sat at
          −0.370, −0.205 on the heavy tail: the best of the three without
          a prior.
        </>
      ),
      costs: (
        <>
          Larger variance; still −2.12 bits at n = 10 for 100 symbols.
        </>
      ),
      when: 'n a few times k, where the first-order term is no longer enough.',
    },
    {
      name: 'NSB entropy estimator',
      algoName: 'NSB entropy estimator',
      cost: 'a one-dimensional integral over Dirichlet priors',
      wins: (
        <>
          Built for n near or below k, where the plug-in collapses toward
          log₂ n; returns an error bar with the estimate.
        </>
      ),
      costs: (
        <>
          Needs a known or bounded alphabet size and a prior a reviewer may
          question; far more compute than one pass.
        </>
      ),
      when: 'The alphabet is as large as the sample and the answer must carry an uncertainty.',
    },
  ],
  neverUse: {
    name: 'The plug-in on an alphabet as large as the sample, reported as unbiased',
    why: (
      <>
        A Zipf source over 2,000 symbols has 8.115 bits of entropy. With
        n = 2,000 the sample sees 632 of the symbols and the plug-in expects{' '}
        <strong>7.532 bits, 0.583 low</strong>, 7% of the answer, with no
        error bar to warn anyone; Miller-Madow recovers to −0.356 and the
        jackknife to −0.205, still wrong. Ten times the data brings the
        plug-in to −0.079 and the corrections within a hundredth. These are
        exact expectations, not simulations: when n is of the order of k,
        the plug-in is a lower bound on what you saw, not an estimate of
        what is there.
      </>
    ),
  },

  contest: {
    instance:
      '100-symbol alphabets, uniform (6.644 bits) and Zipf (5.310), n from 10 to 10,000, 120 to 200 Monte Carlo repetitions per cell against the exact expectation of the plug-in and of Miller-Madow (binomial sums); a Zipf tail over 2,000 symbols at n = 2,000; bias in bits, uniform alphabet unless noted',
    columns: ['n = 100', 'n = 1,000', 'n = 10,000', 'n = 10 (truth 6.64)', 'heavy tail, n = k'],
    rows: [
      {
        method: 'plug-in (maximum likelihood)',
        isThisUnit: true,
        values: ['−0.822', '−0.0728', '−0.00715', '3.23 bits', '−0.583'],
        verdict: 'exact, known, and always low',
      },
      {
        method: 'Miller first-order prediction, −(k − 1)/(2n ln 2)',
        values: ['−0.714', '−0.0714', '−0.00714', '·', '·'],
        verdict: 'four digits right once n ≫ k',
      },
      {
        method: 'Miller-Madow',
        values: ['−0.370', '−0.0012', '−0.0000', '3.86 bits', '−0.356'],
        best: 2,
        verdict: 'one term, nearly unbiased at n ≫ k',
      },
      {
        method: 'jackknife (Zahl)',
        values: ['−0.065', '+0.0018', '−0.0000', '4.52 bits', '−0.205'],
        best: 0,
        verdict: 'the best without a prior; still lost at n = 10',
      },
    ],
    source:
      'python solutions/shannon_entropy_estimation_maximum_likelihood_plug_in.py prints this table and asserts: the exact-expectation formula equals brute force to 1e-12 and lies below the truth; on all 14 cells the Monte Carlo means of the plug-in and of Miller-Madow lie within 3 standard errors of their exact expectations; no sample’s estimate exceeds log₂ of the symbols seen; the exact bias matches Miller’s formula within 5% at n = 3,000 and 10,000 and shrinks by a factor between 8 and 12 from 1,000 to 10,000; both corrections beat the raw bias at every large n; the spread ratio from 1,000 to 10,000 is 2.3 to 4.3 for Zipf and above 6 for the uniform; n = 10 collapses within 0.25 bits of log₂ 10; the ideal code length equals the plug-in and Huffman sits within one bit above; independent variables show plug-in mutual information within 3 standard errors of its exact expectation and within 10% of the first-order formula; the heavy tail at n = k is more than 0.5 bits low, and ten times the data cuts it by more than three.',
  },

  figure: (
    <Figure
      id="fig-entropy-plugin-bias"
      aspect="16 / 7"
      caption="Left: exact bias of the entropy estimate for 100 equiprobable symbols against the sample size (log scale): the raw plug-in (amber), Miller's first-order prediction −(k − 1)/(2n ln 2) (dashed), Miller-Madow (blue), and the jackknife (green); the formula is useless at n = 10, 7% off at n = 100, and four digits right at n = 10,000. Right: the collapse: expected plug-in estimate (amber bars) against the truth (green line) and the ceiling log₂ n (red ticks) at n = 10, 30, 100, 300, 1,000."
      cite={{
        text: 'C. E. Shannon, "A Mathematical Theory of Communication," Bell System Technical Journal 27, 1948, DOI 10.1002/j.1538-7305.1948.tb01338.x. G. A. Miller, "Note on the bias of information estimates," in Information Theory in Psychology, 1955. L. Paninski, "Estimation of Entropy and Mutual Information," Neural Computation 15(6), 2003, DOI 10.1162/089976603321780272. I. Nemenman, F. Shafee, W. Bialek, "Entropy and inference, revisited," NIPS 14, 2002.',
        href: 'https://doi.org/10.1162/089976603321780272',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="Exact bias of the plug-in entropy estimate and its corrections against sample size, and the collapse of the estimate toward log2 n when the sample is small">
        {(() => {
          const x0 = 48;
          const y0 = 230;
          const pw = 250;
          const ph = 180;
          const ns = [10, 30, 100, 300, 1000, 3000, 10000];
          const X = (n) => x0 + ((Math.log10(n) - 1) / 3) * pw;
          const Y = (b) => y0 - (Math.log10(Math.max(1e-4, -b)) + 4) / 4.6 * ph;
          const plug = [-3.4105, -2.011, -0.8216, -0.2607, -0.0728, -0.0239, -0.00715];
          const mm = [-2.786, -1.3985, -0.37, -0.0343, -0.0012, -0.0001, -0.0001];
          const jk = [-2.12, -0.834, -0.0649, -0.0273, -0.0018, -0.0002, -0.0001];
          const miller = ns.map((n) => -99 / (2 * n * Math.LN2));
          const line = (vals, color, dash) => (
            <polyline points={vals.map((b, i) => `${X(ns[i])},${Y(b)}`).join(' ')} fill="none" stroke={color} strokeWidth="2" strokeDasharray={dash || 'none'} />
          );
          const bx = 380;
          const by = 230;
          const small = [[10, 3.2334], [30, 4.6329], [100, 5.8223], [300, 6.3831], [1000, 6.5711]];
          const BY = (v) => by - (v / 7) * 170;
          return (
            <g>
              <line x1={x0} y1={y0} x2={x0 + pw} y2={y0} stroke="#9aa5bd" strokeOpacity="0.6" />
              <line x1={x0} y1={y0 - ph} x2={x0} y2={y0} stroke="#9aa5bd" strokeOpacity="0.6" />
              {line(miller, '#9aa5bd', '4 3')}
              {line(plug, '#f0b94b')}
              {line(mm, '#5da2ff')}
              {line(jk, '#62d98a')}
              {ns.map((n) => <text key={n} x={X(n) - 10} y={y0 + 14} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">{n >= 1000 ? `${n / 1000}k` : n}</text>)}
              {[-3, -1, -0.1, -0.01, -0.001].map((b) => <text key={b} x={x0 - 44} y={Y(b) + 3} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">{b}</text>)}
              <text x={x0} y="22" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">bias in bits (log scale), 100 equiprobable symbols</text>
              <text x={x0} y="36" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="10">amber: plug-in; dashed: -(k-1)/(2n ln 2)</text>
              <text x={x0} y="50" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="10">blue: Miller-Madow; green: jackknife</text>
              <text x={bx} y="22" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">E[plug-in] vs truth 6.644 (green)</text>
              <text x={bx} y="36" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="10">red ticks: the ceiling log2 n</text>
              <line x1={bx} y1={BY(6.644)} x2={bx + 240} y2={BY(6.644)} stroke="#62d98a" strokeWidth="2" />
              {small.map(([n, v], i) => (
                <g key={n}>
                  <rect x={bx + i * 48} y={BY(v)} width="30" height={by - BY(v)} fill="#f0b94b" fillOpacity="0.85" />
                  <line x1={bx + i * 48 - 2} y1={BY(Math.min(7, Math.log2(n)))} x2={bx + i * 48 + 32} y2={BY(Math.min(7, Math.log2(n)))} stroke="#e2606c" strokeWidth="2" />
                  <text x={bx + i * 48} y={BY(v) - 4} fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="9">{v.toFixed(2)}</text>
                  <text x={bx + i * 48} y={by + 12} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="8">{n}</text>
                </g>
              ))}
              <text x={bx} y={by + 28} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">at n=10: estimate 3.23, truth 6.64</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'shannon_entropy_estimation_maximum_likelihood_plug_in.py',
  Viz: EntropyEstimationViz,
  narration,
};
