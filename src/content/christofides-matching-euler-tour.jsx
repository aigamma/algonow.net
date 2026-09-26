import ChristofidesViz from '../viz/ChristofidesViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/christofides_matching_euler_tour.py?raw';
import { narration } from './christofides-matching-euler-tour.narration.js';

export const content = {
  given:
    'Cities with distances that obey the triangle inequality, and a salesman who must visit every one and come home. Exact answers cost 2^n; the question is what you can promise in polynomial time.',
  task: 'Build a minimum spanning tree. Take its odd-degree cities (always an even number), add a minimum-weight perfect matching on exactly those. Walk an Euler tour of the tree-plus-matching and shortcut every repeat.',
  constraint:
    'Every ratio on this page is measured against the exact Held-Karp optimum on six 13-city instances, not against a bound. The theorem is asserted numerically on every instance: MST at most OPT (mean 0.796), matching at most OPT/2 (mean 0.339), Christofides at most 1.5 OPT (measured 1.066 mean, 1.133 worst), the double-tree at most 2 OPT (1.199 mean, 1.315 worst). The matching is cross-checked against brute-force enumeration; every Euler walk uses every edge once and closes.',

  origins: (
    <p>
      Nicos Christofides, <strong>1976</strong>, in a Carnegie
      Mellon technical report (GSIA Report 388) that was rejected
      by the journal it was sent to and then cited a few thousand
      times: a 3/2-approximation for the metric traveling salesman
      problem. Anatoliy Serdyukov found the same algorithm
      independently in 1978, and the bound was so good that nobody
      improved it for forty-four years: Karlin, Klein, and Oveis
      Gharan finally shaved off 10⁻³⁶ in 2021, which tells you how
      sharp the 1976 argument was. The pieces are older than the
      whole: Euler&apos;s bridges of Königsberg (1736) explain why
      even degrees give a closed walk, and Edmonds&apos; blossom
      algorithm (1965) makes the minimum-weight perfect matching
      polynomial: the ingredient the double-tree shortcut, a plain
      2-approximation, does not have.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>construction and its certificates</strong>.
      Prim grows the minimum spanning tree, whose cost is at most
      any tour&apos;s (delete one edge of a tour and you have a
      spanning path). The odd-degree vertices are collected, the
      matching is added, Hierholzer walks an Euler tour of the
      multigraph (the self-test asserts every edge is used once and
      the walk closes), and the shortcut visits each city once. By
      the triangle inequality the shortcut is never longer than
      the walk, asserted on every instance. Against the exact
      Held-Karp referee the tours land at{' '}
      <strong>1.066× optimal on average, 1.133× at worst</strong>,
      far inside the proven 1.5.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>cheap repair of odd degrees</strong>.
      The double-tree fixes parity by doubling every tree edge:
      cost 2 × MST, bound 2. Christofides pairs up only the odd
      cities with a minimum-weight perfect matching, and the
      argument is the whole page: an optimal tour restricted to the
      odd cities is a cycle on an even number of vertices, so it
      splits into two perfect matchings, and the cheaper one costs
      at most OPT/2: measured 0.339 × OPT on average. Tree plus
      matching is at most 1.5 OPT, every degree is even, and the
      Euler walk exists. The matching is refereed: the subset DP is
      cross-checked against brute-force enumeration of every
      perfect matching, and the double-tree it replaces measured
      1.199 mean against Christofides&apos; 1.066.
    </p>
  ),

  picture: (
    <p>
      A snowplow must clear every street of a town and return to
      the depot, and a street may be plowed twice but never left
      unplowed. Plowing every street exactly once and coming home
      is possible only if every intersection has an even number of
      streets: you leave as often as you arrive. Christofides is the
      dispatcher&apos;s trick applied to a different problem: start
      with the cheapest network that reaches every intersection at
      all (the spanning tree), notice which intersections are
      odd, and pave the cheapest set of new roads that pairs those
      odd corners up. Now the plow can drive every road once and
      come home. The salesman&apos;s tour is that plow route with
      the repeat visits skipped: shortcuts that, on a map obeying the
      triangle inequality, can only make it shorter. The whole bill
      is the tree, which no tour beats, plus the pairing, which no
      tour beats half of.
    </p>
  ),

  steps: [
    <>
      <strong>Tree:</strong> Prim&apos;s minimum spanning tree: at
      most OPT, since any tour minus an edge spans.
    </>,
    <>
      <strong>Odd cities:</strong> the vertices of odd degree: an
      even count, always ([4, 6, 6, 6, 6, 8] here).
    </>,
    <>
      <strong>Matching:</strong> the minimum-weight perfect matching
      on the odd cities: at most OPT/2 by the two-matchings
      argument.
    </>,
    <>
      <strong>Euler walk:</strong> every degree is even, so
      Hierholzer walks every edge once and returns.
    </>,
    <>
      <strong>Shortcut:</strong> skip repeats: a tour no longer than
      the walk, hence at most 1.5 OPT, measured 1.066.
    </>,
  ],

  signals: [
    <>
      <strong>Metric distances:</strong> road miles, flight times,
      Euclidean plans: the triangle inequality is what makes the
      shortcut free and the bound real.
    </>,
    <>
      <strong>A promise is worth more than an average:</strong>{' '}
      contracts, SLAs, and theorems want the worst case bounded;
      2-opt averaged 1.008 here but promises nothing.
    </>,
    <>
      <strong>A starting tour for polish:</strong> Christofides
      plus 2-opt reached the exact optimum on all six instances:
      the guarantee as an opening position.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the <strong>double-tree shortcut</strong>:
      double every MST edge, walk the Euler tour, skip repeats: the
      classic 2-approximation from the same era, with no matching
      to compute. It measured 1.199× optimal on average and 1.315×
      at worst against Christofides&apos; 1.066 and 1.133. The
      matching is the difference: a cheap parity repair instead of
      an expensive one.
    </>
  ),

  strength: (
    <>
      <strong>A worst-case promise you can sign, measured far
      inside itself.</strong> Every tour on this page sat at or
      under 1.133× the exact optimum against a proven 1.5, the
      pieces of the theorem held numerically on every instance
      (tree 0.796 OPT, matching 0.339 OPT), and the construction is
      polynomial end to end with Edmonds&apos; blossom matching.
      For forty-four years nothing beat its bound, and the 2021
      improvement is invisible at any instance size you will meet.
    </>
  ),
  weakness: (
    <>
      <strong>A guarantee is not an average, and the matching is
      the expensive part.</strong> Plain 2-opt from a random tour
      averaged 1.008× here, better than Christofides&apos; 1.066,
      because random Euclidean instances are friendly; the
      construction earns its keep only on the adversarial instances
      2-opt cannot promise anything about. The matching needs
      Edmonds&apos; O(n³) blossom algorithm at scale (this page
      uses an exact subset DP, fine for 13 cities and hopeless for
      a hundred). And the whole argument dies without the triangle
      inequality: on non-metric distances no polynomial
      approximation ratio exists at all unless P = NP.
    </>
  ),

  problem: 'Traveling salesman',
  problemSlug: 'traveling-salesman',
  rivals: [
    {
      name: 'Christofides × matching plus Euler tour',
      isThisUnit: true,
      algoName: 'Christofides',
      cost: 'O(n³), proven 1.5',
      wins: (
        <>
          <strong>The bound</strong>: 1.066× mean and 1.133× worst
          against the exact optimum, under a 1.5 that no adversarial
          instance can break.
        </>
      ),
      costs: (
        <>
          A blossom matching to implement, and an average that plain
          local search beat on friendly instances (1.008).
        </>
      ),
      when: 'Whenever the worst case must be bounded, or as the opening tour a polisher starts from.',
    },
    {
      name: 'Double-tree TSP',
      cost: 'O(n²), proven 2',
      wins: (
        <>
          No matching at all: double the tree, walk, shortcut.
          Simpler code and the same triangle-inequality argument.
        </>
      ),
      costs: (
        <>
          Pays the tree twice: 1.199× mean and 1.315× worst here
          against 1.066 and 1.133.
        </>
      ),
      when: 'Teaching the shortcut argument, or when a factor of two is fine and a matching library is not at hand.',
    },
    {
      name: '2-opt',
      cost: 'local search, no bound',
      wins: (
        <>
          Uncross two edges while it helps: 1.008× mean from a
          random start here, and exactly optimal when started from
          the Christofides tour on all six instances.
        </>
      ),
      costs: (
        <>
          A local optimum can be arbitrarily bad in theory; the
          1.048 worst here is luck of Euclidean instances, not a
          promise.
        </>
      ),
      when: 'Almost every practical solver, layered on top of a constructed tour: the polish, not the promise.',
    },
    {
      name: 'Held-Karp',
      cost: 'O(2ⁿ n²), exact',
      wins: (
        <>
          The referee: the true optimum, by dynamic programming over
          subsets (the live unit here).
        </>
      ),
      costs: (
        <>
          49,152 states at 13 cities becomes fifteen billion at 30
          and twenty-eight quadrillion at 50: exact stops being an
          option before the instance gets interesting.
        </>
      ),
      when: 'Small instances, refereeing, and the base case of branch-and-bound solvers.',
    },
  ],
  neverUse: {
    name: 'Exact Held-Karp on a delivery-route-sized instance',
    why: (
      <>
        The instinct is reasonable: the exact answer exists, the
        code is twenty lines, and it ran in a blink on this
        page&apos;s 13 cities. The state count is (n − 1)·2ⁿ⁻¹:{' '}
        <strong>49,152 states at 13 cities, about 15.6 billion at
        30, about 2.8 × 10¹⁶ at 50</strong>: a day&apos;s deliveries
        for one van would need more memory than exists. The cost
        does not creep; it doubles with every city, and no constant
        factor, no language, no cluster moves the wall more than a
        handful of cities. This is exactly the instance class
        Christofides was invented for: a tour in polynomial time
        with a bound you can sign, then 2-opt to polish it (here,
        to the optimum). When the input grows, the exact method is
        not slow, it is absent.
      </>
    ),
  },

  contest: {
    instance:
      'metric TSP on six random Euclidean instances of 13 cities, every ratio against the exact Held-Karp optimum; the matching cross-checked by brute force, every Euler walk and shortcut asserted valid',
    columns: ['mean ratio', 'worst'],
    rows: [
      {
        method: 'Nearest neighbor tour',
        values: ['1.133', '1.449'],
        verdict: 'no guarantee: greedy strands the last cities',
      },
      {
        method: 'Double-tree (MST shortcut)',
        values: ['1.199', '1.315'],
        verdict: 'the 2-approximation Christofides improves on',
      },
      {
        method: '2-opt from a random tour',
        values: ['1.008', '1.048'],
        verdict: 'local search: better on average here, no bound anywhere',
      },
      {
        method: 'Christofides',
        isThisUnit: true,
        values: ['1.066', '1.133'],
        verdict: 'proven at most 1.5, measured far inside it',
      },
      {
        method: 'Christofides + 2-opt',
        values: ['1.000', '1.000'],
        best: 0,
        verdict: 'the guarantee as a starting point: optimal on all six',
      },
      {
        method: 'Held-Karp (exact)',
        values: ['1.000', '1.000'],
        verdict: 'the referee: O(2ⁿ n²), thirteen cities only',
      },
    ],
    source:
      'python solutions/christofides_matching_euler_tour.py prints this table and asserts: the subset-DP matching equals brute-force enumeration; every Euler walk used every edge once and closed; every shortcut is a permutation no longer than its walk; MST ≤ OPT, matching ≤ OPT/2, Christofides ≤ 1.5 OPT, and double-tree ≤ 2 OPT on all six instances; Christofides beats the double-tree and nearest neighbor on the mean; and the 2-opt polish is never worse than its start.',
  },

  figure: (
    <Figure
      id="fig-christofides"
      aspect="16 / 7"
      caption="Tree, parity repair, walk, shortcut. The minimum spanning tree (blue) costs at most any tour. Its odd-degree cities (amber rings, always an even count) get a minimum-weight perfect matching (amber, dashed), at most half an optimal tour because the optimal tour restricted to the odd cities splits into two matchings. Every degree is now even, so an Euler walk exists; skipping repeats (green) can only shorten it by the triangle inequality. Measured against the exact optimum on six 13-city instances: tree 0.796, matching 0.339, tour 1.066 mean and 1.133 worst, against a proven 1.5."
      cite={{
        text: 'N. Christofides, "Worst-case analysis of a new heuristic for the travelling salesman problem," GSIA Report 388, Carnegie Mellon University, 1976; reprinted Operations Research Forum 3:20, 2022. DOI 10.1007/s43069-021-00101-z.',
        href: 'https://doi.org/10.1007/s43069-021-00101-z',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="A spanning tree on eight cities, its four odd-degree cities matched in pairs, and the shortcut tour drawn around the outside">
        {[[70, 150], [150, 70], [170, 210], [250, 130], [330, 60], [340, 200], [420, 120], [500, 160]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="4" fill="#e9edf6" />
        ))}
        {[[70, 150, 150, 70], [70, 150, 170, 210], [150, 70, 250, 130], [250, 130, 330, 60], [250, 130, 340, 200], [330, 60, 420, 120], [420, 120, 500, 160]].map(([a, b, c, d], i) => (
          <line key={i} x1={a} y1={b} x2={c} y2={d} stroke="#5da2ff" strokeWidth="2" />
        ))}
        {[[150, 70], [170, 210], [340, 200], [500, 160]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="10" fill="none" stroke="#f0b94b" strokeWidth="1.6" />
        ))}
        <line x1="150" y1="70" x2="170" y2="210" stroke="#f0b94b" strokeWidth="2" strokeDasharray="6 4" />
        <line x1="340" y1="200" x2="500" y2="160" stroke="#f0b94b" strokeWidth="2" strokeDasharray="6 4" />
        <path d="M 70 150 L 150 70 L 250 130 L 330 60 L 420 120 L 500 160 L 340 200 L 170 210 Z" fill="none" stroke="#62d98a" strokeWidth="1.6" opacity="0.9" />
        <text x="30" y="250" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="11">tree ≤ OPT (measured 0.796)</text>
        <text x="230" y="250" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">matching on the odd cities ≤ OPT/2 (0.339)</text>
        <text x="30" y="272" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">Euler walk shortcut = tour ≤ 1.5 OPT: measured 1.066 mean, 1.133 worst · double-tree 1.199 · 2-opt polish reaches 1.000</text>
        <text x="30" y="24" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">an optimal tour through the odd cities is an even cycle: two perfect matchings, the cheaper at most half of it</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'christofides_matching_euler_tour.py',
  Viz: ChristofidesViz,
  narration,
};
