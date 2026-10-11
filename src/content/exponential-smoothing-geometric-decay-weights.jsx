import ExponentialSmoothingViz from '../viz/ExponentialSmoothingViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/exponential_smoothing_geometric_decay_weights.py?raw';
import { narration } from './exponential-smoothing-geometric-decay-weights.narration.js';

export const content = {
  given:
    'A series whose level drifts under noise: demand, load, a sensor. Forecast the next value, one step ahead, every step, for thousands of series, with one number to tune and one number to store.',
  task: 'Exponential smoothing (Brown 1956, Holt 1957). Keep one running level and move it a fraction α toward each new observation: level ← α y + (1 − α) level; the forecast is the level. The heuristic is what that recursion is: a weighted average of the whole past with weights α(1 − α)^k that fade geometrically, sum to one, and put their mean lag at (1 − α)/α values back. Fit α by the sum of squared one-step errors; on a local level model the fit lands on the steady-state Kalman gain.',
  constraint:
    'Measured: the recursion equals the unrolled weighted sum to 3e-14; at α = 0.3 the weights sum to one and half the weight sits on the last two values. On a local level model with signal-to-noise ratio 0.25 (Kalman gain 0.390) the squared-error fit over 150 series finds α = 0.390 ± 0.003, and the ARIMA(0,1,1) recursion with θ = α − 1 produces the same forecasts to 3e-14. One-step RMSE, fitted on the first half and scored on the second: smoothing 1.284 ± 0.005 against an innovation floor of 1.281, the best moving average 1.321 (window 4.2 on average), the naive forecast 1.499, the mean 4.662, α = 0.01 at 3.498. On a trend of slope 0.5 with noise 2 the forecast lags by 0.960 ± 0.008, the formula b/α giving 0.959; Holt’s linear trend has bias −0.001 ± 0.005 and RMSE 2.246 against 2.523. Interval coverage 0.925 at h = 1 and 0.935 at h = 10, the error variance at h = 10 2.35 times the one-step against the formula’s 2.37. On a seasonal series: 7.86 trailing the signal by a month, against seasonal naive 2.84 and Holt-Winters 2.29.',

  origins: (
    <p>
      Robert G. Brown (<strong>1956</strong>, Arthur D. Little report,
      &quot;Exponential smoothing for predicting demand,&quot; then his 1959
      and 1963 books) built it for Navy inventory control: one number per
      stock item, updated with one multiply and one add, when storage was
      the cost. Charles Holt (1957, Office of Naval Research memorandum,
      reprinted in the International Journal of Forecasting in 2004) added
      the trend equation, Winters (1960) the season (puzzle 164). John
      Muth (1960) showed the recursion is the optimal predictor of a random
      walk seen through noise, which made it a Kalman filter in steady
      state (puzzle 97), and Box and Jenkins (1970) showed it is the
      ARIMA(0,1,1) forecast. Hyndman, Koehler, Ord, and Snyder (2008) put
      every smoothing method into one state-space family, the ETS models in
      every forecasting package. It still runs most of the world&apos;s
      demand plans, and every exponentially weighted moving average in a
      monitoring dashboard is the same line.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>recursion</strong>: one level, moved a fraction α
      toward each observation, O(1) time and memory per step, the forecast
      read off the level. The referee is the unrolled sum: the level after
      t values equals α Σ (1 − α)<sup>k</sup> y<sub>t−1−k</sub> plus the
      faded start, <strong>to 3e-14</strong>, and the ARIMA(0,1,1)
      recursion with θ = α − 1 gives the same forecasts to the same
      tolerance. One-step RMSE on the local level series:{' '}
      <strong>1.284 against a floor of 1.281</strong>.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>weights</strong>: α(1 − α)<sup>k</sup>, summing to
      one, mean lag (1 − α)/α, half the weight on the last two values at
      α = 0.3. The rate is the whole model. Fitted by squared one-step
      error over 150 series it finds <strong>0.390 ± 0.003</strong>, the
      Kalman gain of the generating model (0.390); α = 1 is the naive
      forecast (1.499), α near 0 is the mean (3.498 at 0.01, 4.662 for
      the mean itself). The same weights explain the failure: on a slope b
      they lag by b/α (0.960 measured, 0.959 predicted), and on a season
      they trail the signal by a month.
    </p>
  ),

  picture: (
    <p>
      A bucket with a slow leak and a tap you open a fraction α each
      morning to pour in today&apos;s number. What is in the bucket is
      mostly the last few days, less of the week before, a trace of last
      month: a geometric fade. Open the tap wide and the bucket just holds
      yesterday; barely crack it and the bucket averages everything since
      you bought it and never learns. The leak rate is the whole art, and
      when the true level wanders at a known pace, the right rate is a
      formula.
    </p>
  ),

  steps: [
    <>
      <strong>Initialize:</strong> level = y<sub>0</sub> (or the mean of a
      few values).
    </>,
    <>
      <strong>Forecast:</strong> f<sub>t</sub> = level; record e
      <sub>t</sub> = y<sub>t</sub> − f<sub>t</sub>.
    </>,
    <>
      <strong>Update:</strong> level ← α y<sub>t</sub> + (1 − α) level,
      which is level + α e<sub>t</sub>.
    </>,
    <>
      <strong>Fit α:</strong> minimize Σ e<sub>t</sub><sup>2</sup> after
      a burn-in (a coarse grid, then golden section); on a local level
      model with noise ratio q the answer is the Kalman gain (−q + √(q
      <sup>2</sup> + 4q))/2.
    </>,
    <>
      <strong>Intervals:</strong> the h-step error variance is σ<sup>2</sup>
      (1 + (h − 1) α<sup>2</sup>) with σ the one-step error sd; check
      coverage.
    </>,
  ],

  signals: [
    <>
      <strong>A level that wanders, no trend, no season:</strong> demand
      for a steady product, a sensor&apos;s drift, a queue&apos;s load.
    </>,
    <>
      <strong>One step ahead, every step, at scale:</strong> O(1) per
      series per step; one number stored.
    </>,
    <>
      <strong>Recent values matter more:</strong> when the mean is wrong
      because the process moved, and the naive forecast is wrong because
      the noise is loud.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the <strong>naive forecast</strong>, α = 1:
      next is last. 1.499 against 1.284 on the local level series. Beat
      it and the smoothing earned its one parameter.
    </>
  ),

  strength: (
    <>
      <strong>Within 0.3% of the innovation floor with one number.</strong>{' '}
      The fit finds the Kalman gain (0.390 against 0.390), beats the best
      moving average (1.321) and the naive forecast (1.499), and equals the
      ARIMA(0,1,1) forecast exactly, in one multiply and one add per step.
    </>
  ),
  weakness: (
    <>
      <strong>No trend, no season, and a flat forecast.</strong> On a
      slope it lags by b/α (0.96 of a unit measured); on a season it trails
      by a month and scores 7.86 where seasonal naive scores 2.84; the
      h-step forecast is the same number for every h, with intervals that
      widen by α<sup>2</sup> a step and covered 0.925 to 0.945 here,
      not 0.95, because σ is estimated.
    </>
  ),

  problem: 'Time series forecasting',
  problemSlug: 'time-series-forecasting',
  rivals: [
    {
      name: 'Exponential smoothing × Geometric decay weights',
      isThisUnit: true,
      algoName: 'Exponential smoothing',
      cost: 'O(1) per step; one rate to fit',
      wins: (
        <>
          <strong>1.284 against a floor of 1.281</strong>; the fit lands
          on the Kalman gain; one number stored.
        </>
      ),
      costs: (
        <>
          A flat forecast: lags a slope by b/α, trails a season by a month.
        </>
      ),
      when: 'A wandering level, one step ahead, thousands of series, no analyst.',
    },
    {
      name: 'Moving average × Sliding window',
      algoName: 'Moving average',
      cost: 'O(1) per step with a running sum; k values stored',
      wins: (
        <>
          Equal weights are easy to explain; a window of 4 scored 1.321
          here, close behind.
        </>
      ),
      costs: (
        <>
          A cliff at the window edge: a value matters fully, then not at
          all; k values to keep.
        </>
      ),
      when: 'When the audience needs to see which values are in and which are out.',
    },
    {
      name: 'Holt linear trend × Level plus trend smoothing',
      algoName: 'Holt linear trend',
      cost: 'two rates; a level and a slope',
      wins: (
        <>
          Removes the lag on a slope: bias −0.001 against 0.960, RMSE 2.246
          against 2.523.
        </>
      ),
      costs: (
        <>
          A second rate to fit; a trend that is continued past the horizon.
        </>
      ),
      when: 'When the level drifts with a direction, not just a wander.',
    },
    {
      name: 'ARIMA × Box-Jenkins identification',
      algoName: 'ARIMA',
      cost: 'orders to identify; a likelihood fit',
      wins: (
        <>
          Contains this method as (0,1,1) with θ = α − 1, to 3e-14 here,
          and models whatever the residuals still carry.
        </>
      ),
      costs: (
        <>
          Order selection by hand or by search; unstable on short series.
        </>
      ),
      when: 'When residual correlation matters or intervals are the deliverable.',
    },
  ],
  neverUse: {
    name: 'Simple smoothing on a seasonal series',
    why: (
      <>
        A twelve-month wave of amplitude 20 under noise of 2: the fitted
        rate chases the wave and the forecast trails the signal by a
        month, <strong>7.86 against 2.84</strong> for the seasonal naive
        forecast (last year&apos;s value) and 2.29 for Holt-Winters. The
        weights fade with distance, and the value that predicts next month
        is twelve back, where almost no weight is left. One rate cannot
        hold a cycle; a cycle of indices can.
      </>
    ),
  },

  contest: {
    instance:
      'Local level model (noise sd 1, signal-to-noise 0.25), 150 series of 400, each method fitted on the first half and scored one step ahead on the second; a trend of slope 0.5 with noise 2; a seasonal wave of amplitude 20 with noise 2',
    columns: ['local level RMSE', 'trend bias', 'seasonal RMSE', 'note'],
    rows: [
      {
        method: 'exponential smoothing (fitted α)',
        isThisUnit: true,
        values: ['1.284 ± 0.005', '0.960 (b/α 0.959)', '7.86', 'α 0.390 against the Kalman gain 0.390; intervals 0.925 to 0.945'],
        best: 0,
        verdict: 'the floor, one number',
      },
      {
        method: 'innovation floor',
        values: ['1.281', '·', '·', 'the one-step sd at the true gain'],
        verdict: 'the referee',
      },
      {
        method: 'moving average (best window)',
        values: ['1.321', '·', '·', 'window 4.2 on average'],
        verdict: 'close behind',
      },
      {
        method: 'naive (α = 1)',
        values: ['1.499', '·', '·', 'next is last'],
        verdict: 'the baseline',
      },
      {
        method: 'Holt linear trend',
        values: ['·', '−0.001 ± 0.005', '·', 'RMSE 2.246 against 2.523 on the slope'],
        verdict: 'removes the lag',
      },
      {
        method: 'seasonal naive / Holt-Winters',
        values: ['·', '·', '2.84 / 2.29', 'last year’s value; a cycle of indices'],
        verdict: 'hold the season',
      },
      {
        method: 'mean / α = 0.01',
        values: ['4.662 / 3.498', '·', '·', 'the rate too small to follow the level'],
        verdict: 'never forgets',
      },
    ],
    source:
      'python solutions/exponential_smoothing_geometric_decay_weights.py prints this table and asserts: recursion equal to the unrolled sum to 1e-12; weights summing to one with mean lag (1 − α)/α; the fitted α within three standard errors plus 0.02 of the Kalman gain; ARIMA(0,1,1) forecasts equal to 1e-9; smoothing ahead of the moving average, the naive forecast, and the mean, within 1.15× the floor; the trend lag within 15% of b/α and Holt unbiased; interval coverage between 0.92 and 0.98; the seasonal error at least 2.5× the seasonal naive.',
  },

  figure: (
    <Figure
      id="fig-exponential-smoothing-weights"
      aspect="16 / 7"
      caption="Left: the weights α(1 − α)^k that a level at α = 0.3 (amber) and α = 0.1 (gray) puts on the past; they sum to one, and the mean lag is (1 − α)/α, 2.3 and 9 values. Right: one-step RMSE on the local level series, log scale, against the innovation floor of 1.281."
      cite={{
        text: 'R. G. Brown, Exponential Smoothing for Predicting Demand, Arthur D. Little, 1956. C. C. Holt, "Forecasting seasonals and trends by exponentially weighted moving averages," ONR memorandum 52, 1957; International Journal of Forecasting 20(1), 2004. DOI 10.1016/j.ijforecast.2003.09.015. R. J. Hyndman, A. B. Koehler, J. K. Ord, R. D. Snyder, Forecasting with Exponential Smoothing, Springer, 2008.',
        href: 'https://doi.org/10.1016/j.ijforecast.2003.09.015',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="Bars of geometric weights for two smoothing rates beside bars of one-step error for six methods">
        {(() => {
          const x0 = 40;
          const y0 = 230;
          const ks = Array.from({ length: 16 }, (_, k) => k);
          const w = (a, k) => a * (1 - a) ** k;
          const hgt = (v) => v * 560;
          const bars = [['floor', 1.281, '#62d98a'], ['smoothing', 1.284, '#5da2ff'], ['moving avg', 1.321, '#f0b94b'], ['naive', 1.499, '#f0b94b'], ['alpha 0.01', 3.498, '#9aa5bd'], ['mean', 4.662, '#e2606c']];
          const bx = 420;
          const bh = (v) => (Math.log10(v) / Math.log10(5)) * 170 + 20;
          return (
            <g>
              {ks.map((k) => (
                <g key={k}>
                  <rect x={x0 + k * 20} y={y0 - hgt(w(0.3, k))} width="9" height={hgt(w(0.3, k))} fill="#f0b94b" fillOpacity="0.9" />
                  <rect x={x0 + k * 20 + 9} y={y0 - hgt(w(0.1, k))} width="9" height={hgt(w(0.1, k))} fill="#9aa5bd" fillOpacity="0.7" />
                </g>
              ))}
              <text x={x0} y="22" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">weight on the value k steps back; amber alpha 0.3 (mean lag 2.3), gray alpha 0.1 (mean lag 9)</text>
              <text x={x0} y={y0 + 16} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">k = 0 ... 15; half the weight on the last two values at 0.3, the last seven at 0.1</text>
              {bars.map(([name, v, color], i) => (
                <g key={name}>
                  <rect x={bx + i * 34} y={y0 - bh(v)} width="24" height={bh(v)} fill={color} fillOpacity="0.85" />
                  <text x={bx + i * 34} y={y0 - bh(v) - 4} fill={color} fontFamily="ui-monospace, monospace" fontSize="9">{v}</text>
                </g>
              ))}
              <text x={bx} y="22" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">one-step RMSE, log scale</text>
              <text x={bx} y="36" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">floor, smoothing, moving avg,</text>
              <text x={bx} y="50" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">naive, alpha 0.01, mean</text>
              <text x={bx} y={y0 + 16} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">1.284 against the floor 1.281</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'exponential_smoothing_geometric_decay_weights.py',
  Viz: ExponentialSmoothingViz,
  narration,
};
