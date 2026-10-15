import RandomSearchViz from '../viz/RandomSearchViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/random_search_uniform_hyperparameter_sampling.py?raw';
import { narration } from './random-search-uniform-hyperparameter-sampling.narration.js';

export const content = {
  given:
    'A learner with a handful of knobs: learning rate, regularization strength, depth, width. One training run per setting is the only feedback, and you can afford a fixed number of runs. Spend them so the best setting you find is as close to the best setting there is as the budget allows.',
  task: 'Random search. The algorithm: draw each trial’s setting independently at random from the whole search space, train, keep the best. The heuristic is uniform sampling (Bergstra and Bengio 2012): every knob uniform over its range, uniform on a log scale when the range spans orders of magnitude, no grid and no model. Two facts carry it: any n draws land in the top 5% of the space with probability 1 − 0.95ⁿ (0.954 at n = 60) in any number of dimensions, and since only one or two knobs usually matter, a grid with k values per axis tries only k values of the knob that matters while n random trials try n.',
  constraint:
    'Measured: the top 5% of a two-dimensional objective is hit by at least one of n uniform draws with probability 0.4080 ± 0.0049, 0.7793 ± 0.0041, 0.9539 ± 0.0021 at n = 10, 30, 60 (10,000 repeats), against 1 − 0.95ⁿ = 0.4013, 0.7854, 0.9539. On that objective (a peak of width 0.12 at x = 0.37; y barely matters) a k × k grid reaches 0.349, 0.916, 0.404, 0.944, 0.916, 0.802 of the optimum at k = 3 to 8, while k² random trials climb 0.768, 0.884, 0.919, 0.950, 0.967, 0.972 and Latin hypercubes 0.885 to 0.976 (300 repeats). On a three-knob ridge learner whose within-5% region fills 8.5% of the space (dense scan of 3,610 settings), the theorem predicts hit rates 0.91 at 27 trials and 1.00 at 64; measured over 200 repeats, random search 91% and 99%, Latin hypercube 98% and 100%, grids of 3 and 4 per axis never, at 4.915 and 1.430 times the optimum. A learning rate drawn uniformly from [1e-5, 1] converges on 1.9% of draws, log-uniformly on 65.8%, both closed forms. Six knobs at five grid points each: 15,625 trainings reach 0.415 of the optimum; 60 random trainings 0.963 ± 0.001. 2.8 s.',

  origins: (
    <p>
      Random search is older than the computers it runs on: R. L. Anderson
      surveyed it for finding best operating conditions in{' '}
      <strong>1953</strong>, and Solis and Wets (1981) proved its
      convergence. Its hyperparameter career begins with James Bergstra and
      Yoshua Bengio, &quot;Random Search for Hyper-Parameter
      Optimization&quot; (<strong>JMLR 13, 2012</strong>): on neural network
      tuning, random trials beat grids of the same size, because the response
      surface has low effective dimensionality and because n random trials
      land in any region of volume 5% with probability 1 − 0.95ⁿ. Latin
      hypercube sampling (McKay, Beckman, Conover 1979) is the stratified
      cousin; expected improvement (Mockus 1978; Jones, Schonlau, Welch 1998;
      Snoek, Larochelle, Adams 2012) the model-based rival; Hyperband (Li et
      al. 2018) keeps the sampling and adds early stopping.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>budget and the guarantee</strong>. Each trial is an
      independent draw, so trials run in parallel, stop at any time, and
      resume later. The guarantee is a theorem: if the settings you would be
      happy with fill 5% of the space, n draws miss them all with probability
      0.95ⁿ. Measured: <strong>0.4080, 0.7793, 0.9539</strong> at n = 10,
      30, 60 against 0.4013, 0.7854, 0.9539; on the ridge learner, whose
      within-5% region fills 8.5% of the space, the formula predicts 0.91 and
      1.00 at 27 and 64 trials and the measured hit rates were 0.91 and 0.99.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>coverage</strong>. Drawing every knob uniformly means
      every trial tries a fresh value of every knob, so n trials are n
      distinct values of the knob that matters: <strong>k² against k</strong>{' '}
      for a grid of the same size, 60 against 5 for the 15,625-training grid.
      The scale is part of the heuristic: a learning rate drawn uniformly
      from [1e-5, 1] falls in the stable range below 0.02 on{' '}
      <strong>1.9% of draws</strong>, a log-uniform draw on 65.8%, and a draw
      within a factor of two of the best rate shows up in 16.8% against 72.1%
      of twenty-draw budgets.
    </p>
  ),

  picture: (
    <p>
      Picture a chef tuning a recipe with two dials, oven temperature and
      salt, and nine bakes to spend. Only the temperature really matters.
      A grid bakes three temperatures at three salt levels: nine bakes, three
      temperatures, and if the sweet spot sits between two of them none of the
      nine finds it. Nine random bakes try nine temperatures, and the salt
      comes along for free. Give the chef six dials and five settings each: a
      grid is 15,625 bakes for five temperatures. Sixty random bakes try sixty.
    </p>
  ),

  steps: [
    <>
      <strong>Define the space and its scales:</strong> a range for every
      knob; ranges spanning orders of magnitude are drawn on a log scale,
      integers uniformly over their values.
    </>,
    <>
      <strong>Draw:</strong> n settings, each knob independent and uniform
      on its scale, with no reference to the other trials.
    </>,
    <>
      <strong>Train and score:</strong> one run per setting, in parallel if
      the hardware allows; the trials never wait for each other.
    </>,
    <>
      <strong>Keep the best</strong> and the full record, and add trials as
      the budget allows: the guarantee only improves, and sixty trials cover
      any 5% region with probability 0.954.
    </>,
    <>
      <strong>Verify, as the code does:</strong> the hit rate against
      1 − 0.95ⁿ, the best found against a dense scan of the space.
    </>,
  ],

  signals: [
    <>
      <strong>A fixed budget of trainings and more than two knobs:</strong>{' '}
      a grid of k per axis costs kᵈ, and random search costs whatever you
      can afford.
    </>,
    <>
      <strong>You suspect only a few knobs matter</strong> and do not know
      which: almost always true, and exactly where grids waste their budget
      repeating the same few values.
    </>,
    <>
      <strong>Parallel hardware or an anytime answer:</strong> trials that
      never wait for each other, a result you can stop early or extend
      later.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>grid search</strong>: k values per axis,
      every combination. On the ridge learner the 27-training grid finished at
      4.915 times the optimum and the 64-training grid at 1.430 times, both
      outside the 5% band that random search hit in 91% and 99% of repeats.
    </>
  ),

  strength: (
    <>
      <strong>A dimension-free guarantee with no model and no coupling.</strong>{' '}
      1 − 0.95ⁿ matched within three standard errors at n = 10, 30, 60;
      k² distinct values of the important knob against k; 91% and 99% within
      5% of the ridge optimum at 27 and 64 trainings; trivially parallel.
    </>
  ),
  weakness: (
    <>
      <strong>It never learns, and it clumps.</strong> Each draw ignores
      every result so far, so a Gaussian-process optimizer can spend tens of
      expensive trainings better. Uniform draws leave gaps and duplicates:
      Latin hypercubes reached 0.885 where random reached 0.768 at nine
      trials. The scale you choose is everything: the wrong one puts 2% of a
      budget where it can work. And if every knob matters, the top 5% of the
      space may not be good enough.
    </>
  ),

  problem: 'Hyperparameter tuning',
  problemSlug: 'hyperparameter-tuning',
  rivals: [
    {
      name: 'Random search × Uniform hyperparameter sampling',
      isThisUnit: true,
      algoName: 'Random search',
      cost: 'n trainings, independent and embarrassingly parallel',
      wins: (
        <>
          <strong>Top 5% with probability 1 − 0.95ⁿ</strong>, 0.954 measured
          at 60 trials; n distinct values of every knob; 91% and 99% within
          5% of the ridge optimum at 27 and 64.
        </>
      ),
      costs: (
        <>
          Learns nothing from its own results; clumps and gaps (0.768 against
          0.885 for Latin hypercubes at nine trials); the scale you choose
          decides what the draws can reach.
        </>
      ),
      when: 'The default for any budget you can spend in parallel and any space with more than two knobs.',
    },
    {
      name: 'Grid search',
      algoName: 'Grid search',
      cost: 'kᵈ trainings for k values on each of d axes',
      wins: (
        <>
          Deterministic and reproducible; exhaustive when one or two knobs
          matter; at k = 4 the toy grid beat sixteen random trials,{' '}
          <strong>0.916 against 0.884</strong>.
        </>
      ),
      costs: (
        <>
          Only k distinct values of the knob that matters, an alignment
          lottery (0.349, 0.916, 0.404 at k = 3, 4, 5); 15,625 trainings for
          five values per knob reached 0.415 of the optimum.
        </>
      ),
      when: 'One or two knobs with known good ranges, when you want a reproducible table more than a tuned model.',
    },
    {
      name: 'Latin hypercube sampling',
      algoName: 'Latin hypercube sampling',
      cost: 'n trainings, one per stratum on every axis',
      wins: (
        <>
          Random search&apos;s distinct-value property made certain, no
          clumps: <strong>0.885 against 0.768</strong> at nine trials, 98%
          against 91% within 5% at 27.
        </>
      ),
      costs: (
        <>
          The budget is fixed when the design is drawn, so adding trials
          breaks the strata; the advantage shrinks as n grows (0.976 against
          0.972 at 64).
        </>
      ),
      when: 'A small budget fixed in advance where you want random search’s coverage without its clumps.',
    },
    {
      name: 'Bayesian optimization × Expected improvement',
      algoName: 'Expected improvement',
      cost: 'n trainings plus an O(n³) Gaussian-process fit per step, sequential',
      wins: (
        <>
          <strong>Learns from every result</strong>: a Gaussian-process
          posterior over the surface picks the next setting by expected
          improvement, so tens of expensive trainings go where the model
          expects gains (Snoek, Larochelle, Adams 2012).
        </>
      ),
      costs: (
        <>
          Sequential, so no parallel budget; a kernel and its lengthscales to
          choose; a surface smooth enough for the model to be right; and a
          fit that grows as the cube of the trials.
        </>
      ),
      when: 'Each training costs hours, the budget is tens of runs, and you can wait for each result before choosing the next.',
    },
  ],
  neverUse: {
    name: 'An exhaustive grid when six knobs each get five values',
    why: (
      <>
        Five values per knob on six knobs is 5⁶ = <strong>15,625
        trainings</strong>, every one of them reusing the same five values of
        every knob. Measured on a six-knob objective where one knob matters
        most (a peak of width 0.12 at 0.37, between the grid&apos;s 0.25 and
        0.5), the whole grid reached <strong>0.415 of the optimum</strong>.
        Sixty random trainings, one two-hundred-sixtieth of the budget,
        reached 0.963 ± 0.001 on average, above 0.9 in 97% of 500 repeats,
        and hit the top 5% of the space with probability 0.956 ± 0.003, the
        theorem&apos;s 0.954. The grid did not fail because it was small. Its
        15,625 trainings tried five values of the knob that mattered; the
        sixty random trainings tried sixty.
      </>
    ),
  },

  contest: {
    instance:
      'Polynomial ridge learner, 14 training and 200 validation points; knobs degree 1 to 10, λ from 1e-7 to 1e2 on a log scale, and one knob the solver ignores; referee: a dense scan of 3,610 settings (optimum validation MSE 0.0521 at degree 3, λ = 0.060); the settings within 5% of the optimum fill 8.5% of the space',
    columns: ['trainings', 'distinct (degree, λ) pairs tried', 'within 5% of the optimum', 'mean best / optimum'],
    rows: [
      {
        method: 'grid search, 3 per axis',
        values: ['27', '9', 'no: 4.915× the optimum', '4.915'],
        verdict: 'nine real settings, each trained three times',
      },
      {
        method: 'random search, uniform and log-uniform draws',
        isThisUnit: true,
        values: ['27', '27', '91% of 200 repeats (theorem 0.91)', '1.033 ± 0.009'],
        verdict: 'the theorem, cashed',
      },
      {
        method: 'Latin hypercube sampling',
        values: ['27', '27', '98% of 200 repeats', '1.007 ± 0.003'],
        best: 3,
        verdict: 'stratified coverage, best at this budget',
      },
      {
        method: 'grid search, 4 per axis',
        values: ['64', '16', 'no: 1.430× the optimum', '1.430'],
        verdict: 'sixteen real settings, each trained four times',
      },
      {
        method: 'random search, uniform and log-uniform draws',
        isThisUnit: true,
        values: ['64', '64', '99% of 200 repeats (theorem 1.00)', '1.004 ± 0.001'],
        verdict: 'a tenth of a percent from the scan, no model',
      },
    ],
    source:
      'python solutions/random_search_uniform_hyperparameter_sampling.py prints this table and asserts: hit rates within three standard errors of 1 − 0.95ⁿ in two and six dimensions; k distinct grid values of the important axis, grid quality falling from k = 4 to 5 and 7 to 8 while random rises and beats the grid by more than 0.2 at k = 3 and 5; k² distinct learner settings per k³-training grid, both grids outside the 5% band; random hit rates within three standard errors (plus 0.03) of 1 − (1 − 0.085)ⁿ and Latin hypercubes at least as often; both learning-rate samplers matching closed forms; the 15,625-point grid below half the six-knob optimum, 60 random trials above 0.9.',
  },

  figure: (
    <Figure
      id="fig-grid-vs-random"
      aspect="16 / 7"
      caption="Sixteen trials on an objective whose value depends mostly on x (the peak at 0.37 is the green line; y barely matters). The 4 x 4 grid (dim squares) projects onto four distinct x values; sixteen uniform draws (blue dots) project onto sixteen, the ticks along the bottom. The theorem behind the draws, 1 - 0.95^n for the top 5% of the space, measured 0.408, 0.779, 0.954 at n = 10, 30, 60."
      cite={{
        text: 'J. Bergstra and Y. Bengio, "Random Search for Hyper-Parameter Optimization," Journal of Machine Learning Research 13, 2012, 281-305. L. Li et al., "Hyperband," JMLR 18, 2018. J. Snoek, H. Larochelle, R. P. Adams, NeurIPS 2012. M. D. McKay, R. J. Beckman, W. J. Conover, Technometrics 21(2), 1979.',
        href: 'https://jmlr.org/papers/v13/bergstra12a.html',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="A four by four grid and sixteen random points over an objective that depends mostly on x, with their projections onto the x axis">
        {(() => {
          const sx = (x) => 140 + x * 360;
          const sy = (y) => 220 - y * 180;
          let state = 20261010;
          const next = () => {
            state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
            return state / 4294967296;
          };
          const rnd = Array.from({ length: 16 }, () => [next(), next()]);
          return (
            <g fontFamily="ui-monospace, monospace" fontSize="10">
              <text x="140" y="24" fill="#9aa5bd">the objective depends mostly on x: a peak at 0.37 (green); y barely matters</text>
              <rect x={sx(0)} y={sy(1)} width="360" height="180" fill="none" stroke="#9aa5bd" strokeOpacity="0.5" />
              <rect x={sx(0.25)} y={sy(1)} width={0.24 * 360} height="180" fill="#62d98a" fillOpacity="0.08" />
              <line x1={sx(0.37)} y1={sy(1)} x2={sx(0.37)} y2={sy(0)} stroke="#62d98a" strokeOpacity="0.7" strokeDasharray="3 3" />
              {[0, 1, 2, 3].map((i) => [0, 1, 2, 3].map((j) => (
                <rect key={`g${i}${j}`} x={sx(i / 3) - 3.5} y={sy(j / 3) - 3.5} width="7" height="7" fill="#9aa5bd" />
              )))}
              {rnd.map(([x, y], i) => (
                <circle key={`r${i}`} cx={sx(x)} cy={sy(y)} r="4" fill="#5da2ff" />
              ))}
              {[0, 1, 2, 3].map((i) => (
                <rect key={`gt${i}`} x={sx(i / 3) - 1.5} y="228" width="3" height="10" fill="#9aa5bd" />
              ))}
              {rnd.map(([x], i) => (
                <rect key={`rt${i}`} x={sx(x) - 1} y="242" width="2" height="10" fill="#5da2ff" />
              ))}
              <text x="140" y="270" fill="#9aa5bd">grid: 4 x-values / 16 trials</text>
              <text x="500" y="270" fill="#5da2ff" textAnchor="end">random: 16 x-values / 16 trials</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'random_search_uniform_hyperparameter_sampling.py',
  Viz: RandomSearchViz,
  narration,
};
