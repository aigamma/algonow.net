import AnnealViz from '../viz/AnnealViz.jsx';
import code from '../../solutions/annealing_cooling.py?raw';
import { narration } from './annealing-cooling.narration.js';

export const content = {
  given: 'Coordinates for a few dozen cities.',
  task: 'One closed loop visiting every city exactly once, as short as you can make it.',
  constraint:
    'Tour count grows factorially (40 cities ≈ 10⁴⁷ tours). No exhaustive check; a provably perfect answer is not required, an excellent one is.',

  origins: (
    <p>
      Descended from physics: Metropolis and colleagues simulated how matter
      settles into low-energy states at Los Alamos (1953); Kirkpatrick, Gelatt,
      and Vecchi at IBM turned the same mathematics on circuits and tours
      (1983). The name is a blacksmith&apos;s: steel cooled slowly,{' '}
      <strong>annealed</strong>, finds an orderly strong arrangement; quenched
      fast, it freezes mid-chaos, brittle. Treat a bad tour like hot metal and
      order emerges.
    </p>
  ),

  algoRole: (
    <p>
      Holds one current tour, proposes <strong>2-opt</strong> moves (cut two
      edges, reverse the segment between), always accepts improvements, and
      accepts a worsening move with probability{' '}
      <strong>e^(−Δ/T)</strong>. Keeps the best tour ever seen off to the side,
      because the walk is allowed to wander away from it.
    </p>
  ),
  heurRole: (
    <p>
      Temperature is the <strong>willingness to take bad trades</strong>. The
      geometric schedule multiplies T by a constant α &lt; 1 after each round:
      hot early (leap over hills, escape greedy traps), cold late (only
      improvements survive). The schedule decides how much exploring happens
      before the polishing begins; it is the entire art.
    </p>
  ),

  picture: (
    <p>
      A marble dropped on a table-sized egg carton rolls into the nearest dent,
      almost never the deepest: that is greedy. Shake the carton hard and the
      marble hops between dents, sampling everywhere; ease off slowly and
      shallow dents lose their grip while deep hollows start to hold. When your
      hands go still, the marble sits, far more often than chance allows, in
      one of the deepest hollows. The shaking is T; the easing is the schedule;
      the marble is your tour.
    </p>
  ),

  steps: [
    <>
      <strong>Start hot:</strong> any random tour; T ≈ the largest distance on
      the map.
    </>,
    <>
      <strong>Propose 2-opt:</strong> cut two edges, reverse the segment; Δ
      costs O(1), only two edges leave and two arrive.
    </>,
    <>
      <strong>Metropolis rule:</strong> accept if Δ &lt; 0, else accept with
      probability e^(−Δ/T).
    </>,
    <>
      <strong>Cool:</strong> after each batch of proposals, T ← αT (α ≈ 0.99).
    </>,
    <>
      <strong>Remember</strong> the best tour ever visited; the walk may drift
      away from it.
    </>,
    <>
      <strong>Stop</strong> when T hits the floor; return the remembered best.
    </>,
  ],

  signals: [
    <>
      The space is <strong>astronomical and discrete</strong>; gradients have
      nothing to grip.
    </>,
    <>
      Evaluating a candidate (or the <strong>Δ between neighbors</strong>) is
      cheap.
    </>,
    <>
      The ask is a <strong>good answer inside a budget</strong>, not a
      certificate of optimality.
    </>,
  ],
  baseline: (
    <>
      Exact Held-Karp guarantees the optimum in O(n²·2ⁿ) and suffocates near 20
      cities. Greedy nearest-neighbor is instant and typically 10–25% longer
      than optimal, trapped in the first basin it finds. Annealing holds one
      tour in memory, spends only your proposal budget, and lands within a few
      percent of optimal on a patient schedule.
    </>
  ),

  strength: (
    <>
      <strong>Escape.</strong> Uphill acceptance while hot frees the walk from
      local optima; the cooled finish polishes the basin it settles in. Stop it
      early and it still hands you the best tour seen: an anytime algorithm.
    </>
  ),
  weakness: (
    <>
      <strong>No certificate.</strong> Different seeds return different tours,
      and everything hinges on the schedule: cool too fast and the tour freezes
      tangled (quench), too slowly and you burn compute polishing air. Tuning α
      and T₀ is a per-problem craft.
    </>
  ),

  code,
  filename: 'annealing_cooling.py',
  Viz: AnnealViz,
  narration,
};
