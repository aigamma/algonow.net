import HoltWintersViz from '../viz/HoltWintersViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/holt_winters_triple_seasonal_smoothing.py?raw';
import { narration } from './holt-winters-triple-seasonal-smoothing.narration.js';

export const content = {
  given:
    'A monthly series has a level that drifts, a trend, and a pattern that repeats every m = 12 months. Forecast the next two years from ten years of history, with no model to fit beyond three smoothing rates.',
  task: 'Holt-Winters. Exponential smoothing keeps a running estimate that moves a fraction of the way toward each observation, a weighted average with geometrically fading weights. The heuristic is the triple decomposition (Holt 1957, Winters 1960): three equations, one each for the level, the trend, and the seasonal index, with rates α, β, γ chosen to minimize the one-step-ahead squared error, and the indices kept as a cycle of m numbers, additive when the swings are constant, multiplicative when they grow with the level. The forecast h steps out is level + h · trend + (or ×) the index for that month.',
  constraint:
    'Measured on a synthetic series with known parts (level 100 drifting 0.5 a month, a twelve-month pattern of amplitude 20, noise 3; ten years fitted, two held out): the oracle forecast from the true parts has RMSE 2.83; Holt-Winters (α 0.06, β 0.01, γ 0.15) 3.31, within 1.17× the floor; seasonal naive with drift 6.49; seasonal naive 11.96; simple exponential smoothing 20.25; Holt’s linear trend 109.91; Holt-Winters with the wrong season length (m = 4) 21.99. Residual autocorrelation at lag 12: Holt-Winters +0.02, Holt +0.37. On swings that grow with the level: additive form 10.73, multiplicative 6.46, oracle 4.26. Airline passengers, 1949 to 1958 fitted, 1959 to 1960 held out, the form pre-selected by training error (multiplicative, 10.4 against additive 12.5 and log-additive 10.6): multiplicative RMSE 36.9 and MAPE 7.3%; additive 36.0 and 6.7%; additive on the log series 17.1 and 3.5%; seasonal naive with drift 49.5 and 10.0%; seasonal naive 77.0 and 15.5%; Holt 119.6 and 19.4%; simple smoothing 137.6 and 23.6%.',

  origins: (
    <p>
      Charles Holt (<strong>1957</strong>, Office of Naval Research
      memorandum, Carnegie Institute of Technology, &quot;Forecasting
      seasonals and trends by exponentially weighted moving
      averages,&quot; reprinted in the International Journal of
      Forecasting in 2004) extended Brown&apos;s simple smoothing to a
      trend and a seasonal pattern; his student Peter Winters (1960,
      Management Science) published the three-equation method, tested on
      sales from a paint company, a utensil maker, and a cleaning-products
      firm. Box and Jenkins (1970) made the airline passenger series the
      benchmark for every seasonal method since. Gardner&apos;s surveys
      (1985, 2006) recorded how the method held up in the M-competitions
      against far more elaborate models, and Hyndman, Koehler, Snyder, and
      Grose (2002) put every exponential smoothing method inside one
      state-space framework, the ETS models in R&apos;s forecast and fable
      packages and in statsmodels. It runs demand planning, call-center
      staffing, and energy load forecasts wherever there is a calendar.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>smoothing</strong>: a running estimate that moves a
      fraction of the way toward each observation, a weighted average with
      geometrically fading weights, which makes the method one pass, three
      numbers, and a cycle of indices per series. The referee is a
      synthetic series with known parts: the oracle forecast from the true
      parts has held-out RMSE 2.83, the noise floor, and the fitted model
      lands at <strong>3.31, within 1.17× the floor</strong>, with
      residual autocorrelation +0.02 at lag 12: no seasonality left.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>decomposition</strong>: level, trend, and season,
      each smoothed at its own rate (fitted α 0.06, β 0.01, γ 0.15). Take
      the seasonal equation away and the error is 109.91 (Holt&apos;s
      linear trend, residual autocorrelation +0.37 at lag 12); take the
      trend away too and it is 20.25. On swings that grow with the level
      the multiplicative form scores 6.46 against 10.73 for the additive
      one. On the airline holdout the three forms score 36.9, 36.0, and
      17.1 (additive on the log series), and the training error picked the
      first: the decomposition is a modeling choice, and the file says
      which one it made before looking.
    </p>
  ),

  picture: (
    <p>
      A shopkeeper with three notebooks: one for the usual level of trade,
      one for how fast it is growing, and one page per month for how that
      month usually runs relative to the rest. Each morning&apos;s takings
      correct all three a little: mostly the level, a touch the growth,
      and only the page for this month. To forecast next July, take the
      level, add the growth times the months ahead, and adjust by
      July&apos;s page. The notebooks never store the past; they carry a
      fading memory of it, and the three fading rates are the whole art.
    </p>
  ),

  steps: [
    <>
      <strong>Initialize:</strong> level = mean of year one; trend = (mean
      of year two − mean of year one) / m; index<sub>i</sub> = y
      <sub>i</sub> − level (or y<sub>i</sub> / level).
    </>,
    <>
      <strong>Forecast one step:</strong> f<sub>t</sub> = level + trend +
      index<sub>t mod m</sub>; record e<sub>t</sub> = y<sub>t</sub> − f
      <sub>t</sub>.
    </>,
    <>
      <strong>Update:</strong> level ← α (y<sub>t</sub> − index) + (1 −
      α)(level + trend); trend ← β Δlevel + (1 − β) trend; index ← γ (y
      <sub>t</sub> − level) + (1 − γ) index.
    </>,
    <>
      <strong>Fit:</strong> α, β, γ by the sum of squared one-step errors
      (a grid of 20 steps each, then a fine grid around the best cell).
    </>,
    <>
      <strong>Forecast and check:</strong> level + h · trend + index for
      that month; residual autocorrelation at lag m near zero, rates
      inside (0, 1) and away from the ceiling, held-out error near the
      noise.
    </>,
  ],

  signals: [
    <>
      <strong>A calendar:</strong> monthly or weekly data with a pattern
      that repeats (sales, load, traffic, admissions).
    </>,
    <>
      <strong>A few years of history, a short horizon:</strong> two
      seasons to initialize, a season or two ahead forecast well.
    </>,
    <>
      <strong>Many series, no analyst per series:</strong> one pass, three
      rates, a cycle of indices.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the <strong>seasonal naive forecast with
      drift</strong>: next July is last July plus the drift. 6.49 against
      3.31 on the synthetic series, 10.0% against 7.3% on the airline
      holdout, zero parameters.
    </>
  ),

  strength: (
    <>
      <strong>Within 1.17× the noise floor with three numbers.</strong>{' '}
      Seasonality removed from the residuals (+0.02 at lag 12), the
      multiplicative form 6.46 against 10.73 on growing swings, and an
      airline forecast at 7.3% against 19.4% for a trend alone.
    </>
  ),
  weakness: (
    <>
      <strong>A continued trend, a modeling choice, and silent
      failures.</strong> A turning point is missed until it has happened;
      additive or multiplicative is a decision the airline data sit
      between (7.3%, 6.7%, 3.5% on the log series, and training error
      picked the first); fitted rates can hit the ceiling (γ = 0.99 on the
      airline series: the season is relearned yearly, not tracked); and
      the wrong season length scores 21.99 against 3.31 with nothing in
      the fit to say so.
    </>
  ),

  problem: 'Time series forecasting',
  problemSlug: 'time-series-forecasting',
  rivals: [
    {
      name: 'Holt-Winters × Triple seasonal smoothing',
      isThisUnit: true,
      algoName: 'Holt-Winters',
      cost: 'one pass; three rates to fit',
      wins: (
        <>
          <strong>1.17× the noise floor</strong>; 7.3% on the airline
          holdout; ten thousand series at a time.
        </>
      ),
      costs: (
        <>
          Additive or multiplicative is your call; trends continue.
        </>
      ),
      when: 'Calendar data, short horizons, many series, no analyst per series.',
    },
    {
      name: 'Seasonal naive forecast',
      algoName: 'Seasonal naive forecast',
      cost: 'nothing',
      wins: (
        <>
          Zero parameters; the number every seasonal method must beat.
        </>
      ),
      costs: (
        <>
          6.49 with drift against 3.31; 10.0% against 7.3%.
        </>
      ),
      when: 'The first number on the page, and series too short or too erratic to fit.',
    },
    {
      name: 'SARIMA',
      algoName: 'SARIMA',
      cost: 'six orders to choose; a likelihood fit',
      wins: (
        <>
          Nests the smoothing models; prediction intervals from a
          likelihood; residual correlation modeled explicitly.
        </>
      ),
      costs: (
        <>
          Order selection; unstable fits on short series.
        </>
      ),
      when: 'When intervals are the deliverable or the residual structure matters.',
    },
    {
      name: 'STL decomposition',
      algoName: 'STL decomposition',
      cost: 'loess windows to choose',
      wins: (
        <>
          Robust to outliers; the seasonal shape may change slowly;
          forecast the remainder with anything.
        </>
      ),
      costs: (
        <>
          No forecast of its own; a window to choose.
        </>
      ),
      when: 'Irregular seasonality, outliers, or a season that drifts in shape.',
    },
  ],
  neverUse: {
    name: 'Holt’s linear trend on seasonal data',
    why: (
      <>
        It looks reasonable: a trend is there, the level drifts, and the
        fit even chases the swings (α 0.98). Measured on the synthetic
        series: <strong>109.91 against 3.31</strong>, 33× the error, with
        residual autocorrelation +0.37 at lag 12, the season the model has
        no equation for; on the airline holdout 19.4% against 7.3%. The
        trend it extrapolates from the last month is the seasonal slope,
        not the drift, so the two-year forecast leaves the data entirely.
        One more equation and a cycle of twelve numbers cut the error by a
        factor of thirty.
      </>
    ),
  },

  contest: {
    instance:
      'A synthetic monthly series with known parts (level 100, drift 0.5, amplitude 20, noise 3; 120 months fitted, 24 held out); a second series whose swings grow with the level; the Box-Jenkins airline passengers (1949 to 1958 fitted, 1959 to 1960 held out); score: held-out RMSE, and MAPE for the airline series',
    columns: ['synthetic RMSE', 'airline RMSE', 'airline MAPE', 'note'],
    rows: [
      {
        method: 'Holt-Winters (pre-selected form)',
        isThisUnit: true,
        values: ['3.31', '36.9', '7.3%', 'additive on the synthetic series; multiplicative on the airline series by training error; residual r₁₂ +0.02'],
        best: 0,
        verdict: '1.17× the noise floor',
      },
      {
        method: 'oracle from the true parts',
        values: ['2.83', '·', '·', 'the noise floor'],
        verdict: 'the referee',
      },
      {
        method: 'Holt-Winters, other forms',
        values: ['3.70 (multiplicative)', '36.0 (additive), 17.1 (log)', '6.7%, 3.5%', 'the training error (10.4 / 12.5 / 10.6) did not pick the log form'],
        verdict: 'a modeling choice',
      },
      {
        method: 'seasonal naive with drift',
        values: ['6.49', '49.5', '10.0%', 'plain seasonal naive 11.96 / 77.0 / 15.5%'],
        verdict: 'the baseline',
      },
      {
        method: 'Holt’s linear trend',
        values: ['109.91', '119.6', '19.4%', 'residual r₁₂ +0.37; α 0.98 chases the swings'],
        verdict: 'no seasonal equation',
      },
      {
        method: 'simple exponential smoothing',
        values: ['20.25', '137.6', '23.6%', 'flattens trend and season'],
        verdict: 'a level only',
      },
      {
        method: 'wrong season length (m = 4)',
        values: ['21.99', '·', '·', 'nothing in the fit says so'],
        verdict: 'a silent failure',
      },
    ],
    source:
      'python solutions/holt_winters_triple_seasonal_smoothing.py prints this table and asserts: Holt-Winters within 1.5× the oracle, ahead of seasonal naive with drift, which is ahead of plain seasonal naive; Holt and simple smoothing at least 3× worse; residual lag-12 autocorrelation below 0.1 for the fit and above 0.25 for Holt; the wrong season length at least 3× worse; the multiplicative form ahead of the additive on growing swings; and on the airline series the form selected by training error ahead of seasonal naive with drift and at least 3× ahead of Holt, with every form ahead of the naive forecast.',
  },

  figure: (
    <Figure
      id="fig-holt-winters-airline"
      aspect="16 / 7"
      caption="The airline passengers, 1949 to 1960 (gray), with the 1959 to 1960 holdout shaded. The pre-selected multiplicative Holt-Winters forecast (blue) follows the seasonal shape and the trend, 7.3% off on average; Holt’s linear trend (red) extrapolates the last months’ slope with no seasonal equation and drifts away, 19.4%. Right: held-out RMSE on the synthetic series against the noise floor of 2.83."
      cite={{
        text: 'P. R. Winters, "Forecasting sales by exponentially weighted moving averages," Management Science 6(3), 1960, pp. 324-342. DOI 10.1287/mnsc.6.3.324. C. C. Holt, "Forecasting seasonals and trends by exponentially weighted moving averages," ONR memorandum 52, 1957; International Journal of Forecasting 20(1), 2004. G. E. P. Box and G. M. Jenkins, Time Series Analysis: Forecasting and Control, 1970.',
        href: 'https://doi.org/10.1287/mnsc.6.3.324',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="The airline passenger series with the held-out two years shaded, the Holt-Winters forecast tracking the seasonal peaks and a trend-only forecast drifting below, beside bars of held-out error for six methods on the synthetic series">
        {(() => {
          const data = [112, 118, 132, 129, 121, 135, 148, 148, 136, 119, 104, 118, 115, 126, 141, 135, 125, 149, 170, 170, 158, 133, 114, 140, 145, 150, 178, 163, 172, 178, 199, 199, 184, 162, 146, 166, 171, 180, 193, 181, 183, 218, 230, 242, 209, 191, 172, 194, 196, 196, 236, 235, 229, 243, 264, 272, 237, 211, 180, 201, 204, 188, 235, 227, 234, 264, 302, 293, 259, 229, 203, 229, 242, 233, 267, 269, 270, 315, 364, 347, 312, 274, 237, 278, 284, 277, 317, 313, 318, 374, 413, 405, 355, 306, 271, 306, 315, 301, 356, 348, 355, 422, 465, 467, 404, 347, 305, 336, 340, 318, 362, 348, 363, 435, 491, 505, 404, 359, 310, 337, 360, 342, 406, 396, 420, 472, 548, 559, 463, 407, 362, 405, 417, 391, 419, 461, 472, 535, 622, 606, 508, 461, 390, 432];
          // schematic forecasts for the shaded years: the multiplicative shape scaled to the trend, and a straight trend line
          const x0 = 30;
          const y0 = 240;
          const pw = 380;
          const ph = 200;
          const X = (t) => x0 + (t / 144) * pw;
          const Y = (v) => y0 - ((v - 90) / 560) * ph;
          const level = 405;
          const slope = 2.2;
          const idx = [0.90, 0.88, 1.00, 0.98, 1.00, 1.14, 1.26, 1.25, 1.08, 0.95, 0.83, 0.92];
          const fc = [];
          const holt = [];
          for (let k = 1; k <= 24; k++) {
            fc.push(Y((level + slope * k) * idx[(k - 1) % 12] * 1.0));
            holt.push(Y(380 + 3.5 * k));
          }
          const bars = [['oracle', 2.83, '#62d98a'], ['Holt-Winters', 3.31, '#5da2ff'], ['naive + drift', 6.49, '#f0b94b'], ['naive', 11.96, '#f0b94b'], ['simple smoothing', 20.25, '#9aa5bd'], ['Holt trend', 109.91, '#e2606c']];
          const bx = 440;
          const by = 236;
          const hgt = (v) => (Math.log10(v) / Math.log10(120)) * 170;
          return (
            <g>
              <rect x={X(120)} y={y0 - ph} width={X(144) - X(120)} height={ph} fill="#9aa5bd" fillOpacity="0.12" />
              <polyline points={data.map((v, t) => `${X(t)},${Y(v)}`).join(' ')} fill="none" stroke="#9aa5bd" strokeWidth="1.2" />
              <polyline points={fc.map((yv, k) => `${X(120 + k)},${yv}`).join(' ')} fill="none" stroke="#5da2ff" strokeWidth="2" />
              <polyline points={holt.map((yv, k) => `${X(120 + k)},${yv}`).join(' ')} fill="none" stroke="#e2606c" strokeWidth="1.5" strokeDasharray="4 3" />
              <text x={x0} y="22" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">airline held-out: HW 7.3%; Holt 19.4%</text>
              <text x={x0} y={y0 + 16} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">log form: 3.5%; training error missed it</text>
              {bars.map(([name, v, color], i) => (
                <g key={name}>
                  <rect x={bx + i * 32} y={by - hgt(v)} width="22" height={hgt(v)} fill={color} fillOpacity="0.85" />
                  <text x={bx + i * 32} y={by - hgt(v) - 4} fill={color} fontFamily="ui-monospace, monospace" fontSize="9">{v}</text>
                </g>
              ))}
              <text x={bx} y="22" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">synthetic held-out RMSE, log scale</text>
              <text x={bx} y="36" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">oracle, HW, naive+drift, naive,</text>
              <text x={bx} y="50" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">simple smoothing, Holt trend</text>
              <text x={bx} y={by + 16} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">floor 2.83; the hero 1.17x</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'holt_winters_triple_seasonal_smoothing.py',
  Viz: HoltWintersViz,
  narration,
};
