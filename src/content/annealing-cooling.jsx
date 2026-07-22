import AnnealViz from '../viz/AnnealViz.jsx';
import Figure from '../components/Figure.jsx';
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

  problem: 'Traveling-salesman tours',
  rivals: [
    {
      name: 'Simulated annealing',
      isThisUnit: true,
      cost: 'O(k · n) for k proposals, one tour in memory',
      wins: (
        <>
          Escapes local optima <strong>without restarting</strong>, and is an
          anytime method: stop it whenever and it hands back the best tour it
          has seen.
        </>
      ),
      costs: (
        <>
          No certificate, and the schedule is a per-problem craft. On the
          60-city instance below, default parameters cost{' '}
          <strong>0.55 seconds to finish behind a method that took 0.04</strong>.
        </>
      ),
      when: 'The landscape is rugged, restarts keep landing in the same basin, and you want one continuous improving run.',
    },
    {
      name: 'Nearest neighbor',
      cost: 'O(n²)',
      wins: <>Instant, ten lines, and a legitimate starting tour for everything else.</>,
      costs: (
        <>
          Greedy to a fault: <strong>33 percent above optimal</strong> on the
          instance below, because the last few cities are whatever is left over.
        </>
      ),
      when: 'You need a tour this millisecond, or a warm start for local search.',
    },
    {
      name: '2-opt hill climbing',
      cost: 'O(n²) per sweep until no improving move remains',
      wins: (
        <>
          Cuts the greedy tour&apos;s excess by most of the way (
          <strong>33 percent down to 5.5</strong>) with no temperature, no
          schedule, and no randomness to tune.
        </>
      ),
      costs: <>Stops at the first local optimum it cannot improve, and stays there.</>,
      when: 'Almost always, first. It is the baseline any fancier search must beat.',
    },
    {
      name: '2-opt with random restarts',
      cost: 'O(restarts × climb)',
      wins: (
        <>
          The honest surprise of this page: it{' '}
          <strong>matched the proven optimum</strong> on 12 cities and{' '}
          <strong>beat annealing on 60</strong>, at a fourteenth of the time.
        </>
      ),
      costs: (
        <>
          Throws away everything it learned on every restart, and needs enough
          restarts to get lucky. Scales worse as basins multiply.
        </>
      ),
      when: 'Euclidean instances of modest size, where climbs are cheap and basins are many.',
    },
    {
      name: 'Held-Karp',
      cost: 'O(n² · 2ⁿ) time, O(n · 2ⁿ) memory',
      wins: <>The <strong>proven</strong> optimum, which is what anchors every gap on this page.</>,
      costs: <>Suffocates around 20 cities. At 60 it would need more memory than exists.</>,
      when: 'Small instances where "probably good" is not good enough.',
    },
  ],
  neverUse: {
    name: 'Brute-force permutation search',
    why: (
      <>
        Enumerating every tour is <strong>(n-1)!/2</strong> candidates. At the
        12 cities below that is about <strong>twenty million</strong>, which a
        laptop will grind through, and it teaches exactly the wrong instinct,
        because at 20 cities it is <strong>60 quadrillion</strong> and at 60
        cities the count exceeds the number of atoms in the observable
        universe by more than fifty orders of magnitude. Held-Karp is the
        exact method worth knowing; permutation search is the one worth
        refusing.
      </>
    ),
  },

  contest: {
    instance:
      '12 random cities in the unit square (seed 99), small enough that Held-Karp can prove the true optimum every other method is scored against',
    columns: ['tour length', 'gap to optimum'],
    rows: [
      {
        method: 'Nearest neighbor',
        values: ['3.6388', '+33.13%'],
        verdict: 'instant, and a third too long',
      },
      {
        method: '2-opt hill climbing',
        values: ['2.8823', '+5.45%'],
        verdict: 'most of the gap closed by the simplest local search',
      },
      {
        method: '2-opt × 12 restarts',
        values: ['2.7332', '+0.00%'],
        best: 0,
        verdict: 'found the optimum without any temperature at all',
      },
      {
        method: 'Simulated annealing',
        isThisUnit: true,
        values: ['2.7332', '+0.00%'],
        best: 0,
        verdict: 'found the optimum too, and paid more to do it',
      },
      {
        method: 'Held-Karp (exact)',
        values: ['2.7332', 'proven'],
        best: 0,
        verdict: 'the anchor: exact, and hopeless past about 20 cities',
      },
    ],
    source:
      'python solutions/annealing_cooling.py prints this table and asserts nothing beats the proven optimum. At 60 cities, where Held-Karp is impossible: restarts 5.7848 in 0.04s, annealing 5.9133 in 0.55s.',
  },

  figure: (
    <Figure
      id="fig-anneal-acceptance"
      aspect="16 / 8"
      caption="The schedule is the whole method. Temperature sets how willingly the walk accepts a worse tour: while hot, a costly trade is taken often enough to escape a basin; as T decays geometrically, the same trade is refused, and the walk stops exploring and starts polishing. Cool too fast and it freezes tangled; too slowly and it burns compute polishing air."
      cite={{
        text: 'After Kirkpatrick, Gelatt and Vecchi, "Optimization by Simulated Annealing", Science 220(4598), 1983, which borrowed the Metropolis acceptance rule of 1953.',
        href: 'https://doi.org/10.1126/science.220.4598.671',
      }}
    >
      <svg viewBox="0 0 640 320" role="img" aria-label="Acceptance probability curves falling as temperature decreases">
        <line x1="60" y1="270" x2="610" y2="270" stroke="#232c40" strokeWidth="1.5" />
        <line x1="60" y1="40" x2="60" y2="270" stroke="#232c40" strokeWidth="1.5" />
        <text x="60" y="298" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="12">
          how much worse the proposed tour is  →
        </text>
        <text x="14" y="36" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="12">
          P(accept)
        </text>
        <path d="M60 60 C 200 96, 380 150, 610 214" fill="none" stroke="#e06767" strokeWidth="2.5" />
        <path d="M60 60 C 160 130, 300 226, 610 262" fill="none" stroke="#f0b94b" strokeWidth="2.5" />
        <path d="M60 60 C 96 200, 150 264, 610 269" fill="none" stroke="#5da2ff" strokeWidth="2.5" />
        <text x="500" y="200" fill="#e06767" fontFamily="ui-monospace, monospace" fontSize="12">hot · explores</text>
        <text x="500" y="250" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="12">warm</text>
        <text x="500" y="264" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="12">cold · polishes</text>
        <text x="66" y="54" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">1.0</text>
        <text x="66" y="284" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">0</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'annealing_cooling.py',
  Viz: AnnealViz,
  narration,
};
