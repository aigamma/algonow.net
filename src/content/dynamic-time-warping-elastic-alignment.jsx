import DtwViz from '../viz/DtwViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/dynamic_time_warping_elastic_alignment.py?raw';
import { narration } from './dynamic-time-warping-elastic-alignment.narration.js';

export const content = {
  given:
    'Time series that are the same shape spoken at different speeds: a peak that arrives early in one and late in the other, a plateau that lasts twice as long, noise on top. Say how similar two series are, well enough to classify 120 test series into six shapes and to search a library without computing every distance. Euclidean distance compares sample i with sample i and pays in full for every shift in timing.',
  task: 'Dynamic time warping. A dynamic program over the grid of all (i, j) sample pairs finds the cheapest monotone path from (0, 0) to (n − 1, m − 1), stepping right, up, or diagonally, so that each sample of one series is matched to one or more samples of the other. The heuristic is the elastic alignment itself: time may stretch and compress locally, inside a band of ±w samples, so shape is compared while timing is forgiven, up to a point.',
  constraint:
    'Measured on 100-sample series under random smooth time warps (about 14 samples off the identity at their farthest) with noise 0.05: against a known time map, the recovered path stays within 2.05 samples on average (worst 9), and the DTW distance is 0.387 where the Euclidean distance on the same pair is 4.134. One-nearest-neighbor over six shapes, 60 training and 120 test series: DTW with a 10-sample band 99.2%, Euclidean 83.3%. The band: 5% of the length computes 1,070 of 10,000 cells and scores 90.0%; 10% computes 1,990 cells at 100%; 20% 3,680 at 100%; unbounded 10,000 at 100%. LB_Keogh never exceeds the true distance on 1,800 pairs, and the pruned search returns the same neighbor on 60 of 60 queries with 358 DTW computations instead of 3,600. Two flat series a level apart stay 9.99 apart under DTW, the same as Euclidean; a spike against a 60-wide plateau matches at distance 0.00 with one sample stretched over 60, and the 10-sample band caps that at 21 and distance 6.24.',

  origins: (
    <p>
      Vintsyuk (1968) used dynamic programming to align spoken words
      of different durations; Sakoe and Chiba (<strong>1978</strong>,
      IEEE Transactions on Acoustics, Speech, and Signal Processing,
      &quot;Dynamic programming algorithm optimization for spoken word
      recognition&quot;) gave the form still used, with the diagonal
      band that carries their name, and Itakura (1975) the
      parallelogram constraint. Berndt and Clifford (1994) carried it
      from speech into data mining, where it became the distance to
      beat for time-series classification; Keogh and Ratanamahatana
      (2005) made it searchable with LB_Keogh, a lower bound cheap
      enough to skip most of the warps; Salvador and Chan (2007)
      approximated it in linear time (FastDTW); Rakthanmanon and
      colleagues (2012) searched a trillion subsequences with the
      cascade of bounds in the UCR suite. Cuturi and Blondel (2017)
      smoothed the minimum into soft-DTW so it could be a loss
      function, and it sits inside speech, gesture, ECG, and
      handwriting systems to this day.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>optimal path</strong>: among all monotone
      alignments of the two series, the dynamic program finds the one
      with the least total cost, exactly, in n · m cell updates, and
      the cost of that path is the distance. The referee is a time map
      the generator knows: the recovered path tracks it{' '}
      <strong>within 2.05 samples</strong> on average, and the distance
      it reports, 0.387, is a tenth of the Euclidean 4.134 on the same
      pair, the difference being pure timing. On the classification
      task the same distance gives 99.2% against Euclidean&apos;s 83.3%.
      The algorithm also owns the bound that makes it searchable:
      LB_Keogh, an envelope distance computed in linear time, is
      provably never larger than the true DTW distance, checked here on
      all 1,800 pairs with zero violations, and the search that trusts
      it finds the same nearest neighbor on 60 of 60 queries after only
      358 of 3,600 full DTWs.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>forgiveness, and its limit</strong>. Letting
      each sample match one or more samples of the other series is what
      turns timing differences into cheap steps, and the Sakoe-Chiba
      band is what stops the forgiveness from becoming nonsense. The
      band is measured both ways: at 5% of the length it is tighter than
      the warps in the data and accuracy falls to 90.0%; at 10% it
      computes <strong>1,990 of 10,000 cells</strong> at 100%. Without
      it, a single spike aligns to a 60-sample plateau at distance 0.00,
      one sample stretched over sixty, which is the pathological path
      every practitioner has been bitten by; with the band the same pair
      is 6.24 apart and no sample matches more than 21. And warping is
      only ever about time: two flat series a level apart are 9.99 apart
      under DTW and 9.99 under Euclidean, because no rearrangement of
      time changes a level.
    </p>
  ),

  picture: (
    <p>
      Two singers performing the same melody, one rushing the verse and
      dragging the chorus, the other the reverse. Compare them beat for
      beat and they never match: the note one singer holds on beat
      twelve, the other reaches on beat fifteen. Instead, lay the two
      recordings on a table and draw a line through every pair of
      moments that should correspond, never going backward in either
      recording, letting one moment of the first pair with several of
      the second where a note is held. Among all such lines, find the
      one along which the notes agree best. That line is the warp, its
      cost is the distance, and the rule that the line may not stray
      too far from the diagonal is what keeps a single held note from
      being matched to an entire verse.
    </p>
  ),

  steps: [
    <>
      <strong>Grid:</strong> D[0][0] = 0, everything else ∞; local cost
      d(i, j) = (a<sub>i</sub> − b<sub>j</sub>)².
    </>,
    <>
      <strong>Fill:</strong> for each (i, j) inside the band |i − j| ≤ w:
      D[i][j] = d(i, j) + min(D[i−1][j], D[i][j−1], D[i−1][j−1]).
    </>,
    <>
      <strong>Distance:</strong> √D[n][m]; the path is read back from
      the corner by following the minima.
    </>,
    <>
      <strong>Bound:</strong> LB_Keogh(q, c) from the envelope of q over
      ±w; compute DTW only if the bound could beat the best so far.
    </>,
    <>
      <strong>Check:</strong> the band against the warps in the data,
      and the path against anything known about the true alignment.
    </>,
  ],

  signals: [
    <>
      <strong>Same shape, different tempo:</strong> speech, gestures,
      pulse traces, gait, handwriting; timing varies and means little.
    </>,
    <>
      <strong>Whole-series comparison, not a pointwise fit:</strong> the
      question is “is this that pattern”, not “what is the value at
      t”.
    </>,
    <>
      <strong>A library to search:</strong> nearest-neighbor
      classification and subsequence search, where the lower bound
      turns n² per pair into something you can afford.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>Euclidean distance</strong>, one
      pass over the samples with no alignment at all: 83.3% on the six
      shapes here, and the right answer whenever timing itself carries
      the information.
    </>
  ),

  strength: (
    <>
      <strong>Exact, elastic, and searchable.</strong> The optimal
      alignment in n · m updates, 99.2% against 83.3% where timing
      varies, a fifth of the cells with a 10% band at no loss, and a
      lower bound that skips 90% of the full computations without
      changing a single answer.
    </>
  ),
  weakness: (
    <>
      <strong>Quadratic, not a metric, and too forgiving unbounded.</strong>{' '}
      n · m cells per pair (10,000 here; a million for 1,000-sample
      series) before any band; the triangle inequality does not hold,
      so metric indexes cannot be used and LB_Keogh is the workaround;
      without a band a spike matches a plateau perfectly; and it
      forgives only time: amplitude, offset, and trend must be
      normalized away first, or two flat series a level apart stay a
      level apart.
    </>
  ),

  problem: 'Series similarity',
  problemSlug: 'series-similarity',
  rivals: [
    {
      name: 'Dynamic time warping × Elastic alignment',
      isThisUnit: true,
      algoName: 'Dynamic time warping',
      cost: 'n · m cells, or n · w with a band',
      wins: (
        <>
          <strong>99.2% vs 83.3%</strong> under time warps; the path
          within 2 samples of the truth.
        </>
      ),
      costs: (
        <>
          Quadratic; not a metric; pathological without a band.
        </>
      ),
      when: 'Shape matters and tempo does not, on series short enough or banded enough to afford.',
    },
    {
      name: 'FastDTW',
      algoName: 'FastDTW',
      cost: 'about linear in n',
      wins: (
        <>
          Coarsens the series, warps at low resolution, and refines
          within a radius: long series in linear time.
        </>
      ),
      costs: (
        <>
          Approximate, and on short series a good band is both faster
          and exact.
        </>
      ),
      when: 'Series of many thousands of samples where the full grid is out of reach.',
    },
    {
      name: 'Matrix profile',
      algoName: 'Matrix profile',
      cost: 'n² subsequence distances, fast via FFT',
      wins: (
        <>
          Every subsequence&apos;s nearest neighbor in one sweep: motifs,
          discords, and anomalies without a query.
        </>
      ),
      costs: (
        <>
          Euclidean on z-normalized windows, so no elasticity; a
          different question from “how far apart are these two”.
        </>
      ),
      when: 'Finding repeated or anomalous patterns inside one long recording.',
    },
    {
      name: 'Longest common subsequence',
      algoName: 'Longest common subsequence',
      cost: 'n · m cells',
      wins: (
        <>
          The same grid, but samples may be skipped: outliers and
          dropouts cost nothing.
        </>
      ),
      costs: (
        <>
          A match threshold to set; a similarity count, not a distance.
        </>
      ),
      when: 'Series with spikes, gaps, or missing samples that a warp would be forced to explain.',
    },
  ],
  neverUse: {
    name: 'Unbounded warping',
    why: (
      <>
        Drop the band and the alignment may stretch any one sample over
        any number of the other series. Measured: a single spike against
        a plateau 60 samples wide matches at{' '}
        <strong>distance 0.00</strong>, the spike&apos;s one sample paired
        with all sixty, the zeros paired with the zeros, a perfect score
        for two series that look nothing alike. With a 10-sample band
        the same pair is 6.24 apart and no sample matches more than 21.
        The elasticity is the whole point of the method and the whole
        danger of it; the band is not an optimization, it is the
        statement of how much timing you are prepared to forgive. Set it
        from the warps you expect (they were about 14 samples here, and
        a 5-sample band lost 10 points), then measure.
      </>
    ),
  },

  contest: {
    instance:
      '100-sample series from six shapes under random smooth time warps (about 14 samples off the identity at most) and noise 0.05; referees: a known time map, 1-NN accuracy on 120 test series, the lower bound checked on 1,800 pairs',
    columns: ['1-NN accuracy', 'cells per pair', 'note'],
    rows: [
      {
        method: 'Euclidean distance',
        values: ['83.3%', '100', 'pays for every timing shift'],
        verdict: 'the baseline',
      },
      {
        method: 'DTW, band 5% (±5)',
        values: ['90.0%', '1,070', 'tighter than the warps'],
        verdict: 'the band must exceed the warps',
      },
      {
        method: 'DTW, band 10% (±10)',
        isThisUnit: true,
        values: ['99.2% (100% on the 30-series subset)', '1,990', 'path within 2.05 samples of the true map'],
        best: 0,
        verdict: 'a fifth of the grid, no loss',
      },
      {
        method: 'DTW, band 20% / unbounded',
        values: ['100% / 100%', '3,680 / 10,000', '·'],
        verdict: 'more cells, nothing gained',
      },
      {
        method: 'LB_Keogh-pruned 1-NN search',
        values: ['same neighbor, 60 of 60', '358 full DTWs of 3,600', '0 violations in 1,800 bounds'],
        verdict: 'exact search at a tenth of the work',
      },
      {
        method: 'flat series a level apart',
        values: ['·', 'DTW 9.99, Euclidean 9.99', 'warping cannot fix amplitude'],
        verdict: 'normalize first',
      },
      {
        method: 'spike vs 60-wide plateau, unbounded / band 10',
        values: ['·', 'distance 0.00 / 6.24', 'one sample matched to 60 / at most 21'],
        verdict: 'the pathological path',
      },
    ],
    source:
      'python solutions/dynamic_time_warping_elastic_alignment.py prints this table and asserts: the recovered path within 3 samples of the true map on average and 12 at worst, with DTW under 0.4 of the Euclidean distance; DTW at least 5 points above Euclidean and above 90% on 1-NN; the 10% band under a quarter of the full cells and within 5 points of the unbounded accuracy; LB_Keogh never above the true distance and the pruned search agreeing on every query at under half the DTW computations; flat series at least 0.9 of their Euclidean distance apart; and the unbounded spike-plateau path matching one sample to at least 50 while the banded one matches at most 21.',
  },

  figure: (
    <Figure
      id="fig-dtw-grid"
      aspect="16 / 7"
      caption="Two 16-sample series, a peak and the same peak arriving five samples early, aligned on the cost grid. Cells inside the band are shaded by accumulated cost (brighter is cheaper), the recovered path runs in green, and the Euclidean pairing is the red diagonal, which crosses the expensive region where one series is high and the other is not. The path bends off the diagonal exactly where the timing differs, then returns. Numbers from the file: path within 2.05 samples of the true warp, 99.2% against 83.3%, 1,990 of 10,000 cells with the band."
      cite={{
        text: 'H. Sakoe, S. Chiba, "Dynamic programming algorithm optimization for spoken word recognition," IEEE Transactions on Acoustics, Speech, and Signal Processing 26(1), 1978. DOI 10.1109/TASSP.1978.1163055. E. Keogh, C. A. Ratanamahatana, "Exact indexing of dynamic time warping," Knowledge and Information Systems 7, 2005. T. Rakthanmanon et al., "Searching and mining trillions of time series subsequences under dynamic time warping," KDD 2012.',
        href: 'https://doi.org/10.1109/TASSP.1978.1163055',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="A sixteen by sixteen cost grid with a shaded band, a green warping path bending off the red diagonal, and the two series drawn beside it">
        {(() => {
          const n = 16;
          const a = Array.from({ length: n }, (_, i) => Math.exp(-(((i / (n - 1) - 0.55) / 0.12) ** 2)));
          const b = Array.from({ length: n }, (_, i) => Math.exp(-(((i / (n - 1) - 0.25) / 0.12) ** 2)));
          const w = 6;
          const INF = 1e9;
          const D = Array.from({ length: n + 1 }, () => new Array(n + 1).fill(INF));
          D[0][0] = 0;
          for (let i = 1; i <= n; i++) {
            for (let j = Math.max(1, i - w); j <= Math.min(n, i + w); j++) {
              D[i][j] = (a[i - 1] - b[j - 1]) ** 2 + Math.min(D[i - 1][j], D[i][j - 1], D[i - 1][j - 1]);
            }
          }
          let i = n;
          let j = n;
          const path = [];
          while (i > 0 && j > 0) {
            path.push([i - 1, j - 1]);
            const c = Math.min(D[i - 1][j - 1], D[i - 1][j], D[i][j - 1]);
            if (c === D[i - 1][j - 1]) {
              i -= 1;
              j -= 1;
            } else if (c === D[i - 1][j]) i -= 1;
            else j -= 1;
          }
          let maxc = 0;
          for (let r = 1; r <= n; r++) for (let c = 1; c <= n; c++) if (D[r][c] < INF) maxc = Math.max(maxc, D[r][c]);
          const gx = 30;
          const gy = 30;
          const cell = 14;
          const cells = [];
          for (let r = 1; r <= n; r++) {
            for (let c = 1; c <= n; c++) {
              if (D[r][c] >= INF) continue;
              const v = D[r][c] / maxc;
              cells.push(<rect key={`${r}-${c}`} x={gx + (c - 1) * cell} y={gy + (r - 1) * cell} width={cell} height={cell} fill="#5da2ff" fillOpacity={0.12 + 0.7 * (1 - v)} />);
            }
          }
          const sx = 320;
          const sw = 290;
          const line = (series, y0, color) => (
            <polyline points={series.map((v, k) => `${sx + (k / (n - 1)) * sw},${y0 - v * 50}`).join(' ')} fill="none" stroke={color} strokeWidth="2" />
          );
          return (
            <g>
              {cells}
              <rect x={gx} y={gy} width={n * cell} height={n * cell} fill="none" stroke="#9aa5bd" strokeOpacity="0.5" />
              <line x1={gx} y1={gy} x2={gx + n * cell} y2={gy + n * cell} stroke="#e2606c" strokeWidth="1.5" />
              <polyline points={path.map(([r, c]) => `${gx + (c + 0.5) * cell},${gy + (r + 0.5) * cell}`).join(' ')} fill="none" stroke="#62d98a" strokeWidth="3" />
              <text x={gx} y={gy + n * cell + 16} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">j: series B →</text>
              <text x={gx + n * cell + 6} y={gy + 12} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">i: A ↓</text>
              {line(a, 90, '#5da2ff')}
              {line(b, 170, '#f0b94b')}
              {path.filter((_, k) => k % 2 === 0).map(([r, c]) => (
                <line key={`m-${r}-${c}`} x1={sx + (r / (n - 1)) * sw} y1={90 - a[r] * 50} x2={sx + (c / (n - 1)) * sw} y2={170 - b[c] * 50} stroke="#62d98a" strokeOpacity="0.5" />
              ))}
              <text x={sx} y="32" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="10">A: the peak at 0.55</text>
              <text x={sx} y="112" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="10">B: the same peak at 0.25, five samples early</text>
              <text x={sx} y="200" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="10">green: matched pairs along the path</text>
              <text x={sx} y="218" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="10">red diagonal: the Euclidean pairing, i with i</text>
              <text x={sx} y="246" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">file: path within 2.05 samples of the true warp;</text>
              <text x={sx} y="262" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">1-NN 99.2% vs 83.3%; band 10: 1,990 of 10,000 cells</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'dynamic_time_warping_elastic_alignment.py',
  Viz: DtwViz,
  narration,
};
