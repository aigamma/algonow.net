import HeldKarpViz from '../viz/HeldKarpViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/held_karp_bitmask_states.py?raw';
import { narration } from './held-karp-bitmask-states.narration.js';

export const content = {
  given:
    'n cities, all pairwise distances, one van: the problem NP-hardness is named for.',
  task: 'The exact minimum tour: not approximated, PROVEN: with the proof being the algorithm itself.',
  constraint:
    'Orderings explode: (n−1)! is 6×10¹⁶ at n = 20. The referees: all tours enumerated on 100 instances (n ≤ 9) with the reconstructed tour revalidated; the transition counter equal to its closed form Σ C(m,s)·s·(m−s) to the unit; and the heuristics priced against certified optima: numbers an approximate page can only estimate.',

  origins: (
    <p>
      Michael Held and Richard Karp, J. SIAM <strong>1962</strong>:
      with Bellman publishing the same recursion independently the
      same year: the Bellman-Held-Karp DP. Sixty-three years later
      its O(2ⁿn²) is <em>still the best exact bound known</em> for
      general TSP: no algorithm provably beats the subset DP: a
      standing challenge the field has thrown itself at since. The
      same authors&apos; 1970 lower-bound work (the 1-tree) powers
      branch-and-bound solvers like Concorde: the two Held-Karps
      bracket exact TSP from both sides.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>DP over partial tours</strong>: the cheapest
      path that starts at city 0, visits exactly the set S, and
      stands at city j depends only on <strong>(S, j)</strong>: not
      on the order S was walked. That one observation collapses
      (n−1)! orderings onto 2ⁿ⁻¹·(n−1) states: at n = 20,{' '}
      <strong>44,826,624 transitions against
      60,822,550,204,416,000 tours</strong>: a trillion-fold
      collapse from refusing to remember what cannot matter.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>bitmask</strong>: a subset <em>is</em> an
      integer: membership is a shift, removal an XOR, and the state
      table becomes an array indexed by the subset itself: no
      hashing, no set objects, layer upon layer by popcount. The
      accounting is exact enough to audit: the transition counter
      landed on Σ C(12,s)·s·(12−s) = <strong>135,168 to the
      unit</strong> at n = 13: the algorithm&apos;s bill derived,
      predicted, and matched.
    </p>
  ),

  picture: (
    <p>
      A van driver&apos;s ledger, kept the clever way. The naive
      ledger has a page per <em>route</em>: astronomically many.
      The clever ledger has a page per <em>predicament</em>: which
      cities are done, and where the van stands: because two routes
      arriving at the same predicament have identical futures, and
      only the cheaper arrival deserves the page. Predicaments
      number 2ⁿ⁻¹·(n−1): astronomical still, but a tamed
      astronomy: 44 million pages at twenty cities instead of sixty
      quadrillion. Exponential, yes: and the difference between
      exponentials is the difference between impossible and{' '}
      <em>done by lunch</em>.
    </p>
  ),

  steps: [
    <>
      <strong>Seed:</strong> dp[{'{j}'}][j] = d(0, j): one-city
      predicaments.
    </>,
    <>
      <strong>Sweep subsets ascending:</strong> integers order
      subsets so every S precedes its supersets: push each settled
      (S, j) to every k ∉ S.
    </>,
    <>
      <strong>Keep the cheaper arrival:</strong> the order S was
      walked is forgotten: that forgetting IS the collapse.
    </>,
    <>
      <strong>Close the loop:</strong> min over j of dp[full][j] +
      d(j, 0): backpointers replay the proven tour.
    </>,
    <>
      <strong>Know the wall:</strong> 2ⁿ is real: n ≈ 20-25 in
      Python, ~30 tuned: past it, branch-and-bound and the
      heuristics this page prices.
    </>,
  ],

  signals: [
    <>
      <strong>The answer must be certified:</strong> benchmarks for
      heuristics, disputes, one-shot expensive routes: &quot;proven
      minimal&quot; is the deliverable.
    </>,
    <>
      <strong>n fits under the wall:</strong> ≤ ~20 cities: exactly
      the size of daily delivery runs, PCB drill clusters, and
      interview escalations.
    </>,
    <>
      <strong>Visit-all-states DP in disguise:</strong> the
      bitmask-over-subsets pattern solves assignment variants, set
      cover DPs, and half of contest hard problems: TSP is its
      teaching instance.
    </>,
  ],
  baseline: (
    <>
      The honest baselines are the two speeds of giving up:
      <strong> brute force</strong> (exact, and 6×10¹⁶ tours at
      n = 20) and <strong>nearest neighbor</strong> (instant, and
      measured <strong>+10% average, +35% worst</strong> against
      certified optima: with 2-opt repair closing it to +0.4%). The
      DP is the narrow bridge between them: exact like the first,
      feasible like the second, for exactly as long as 2ⁿ fits.
    </>
  ),

  strength: (
    <>
      <strong>Proven optima, audited accounting.</strong> Equal to
      full enumeration on all 100 instances with tours revalidated
      city by city; the transition count matched to its closed form
      to the unit; the n = 20 collapse stated in exact arithmetic
      (44.8M vs 6.1×10¹⁶); and the certification dividend: the
      heuristics priced against <em>known</em> optima: on the
      client, 2-opt happened to find the optimum: a fact only this
      page could certify.
    </>
  ),
  weakness: (
    <>
      <strong>The exponent is tamed, not slain.</strong> 2ⁿ⁻¹·(n−1)
      states cost memory as well as time: n = 25 wants ~800MB of
      floats: and past ~30 cities no amount of tuning saves the
      subset table: Concorde-style branch-and-bound (powered by the{' '}
      <em>other</em> Held-Karp: the 1-tree bound) owns exact TSP
      from there, and the metaheuristic shelf owns the rest. The DP
      also needs nothing from the distances: no triangle
      inequality: which means it also <em>exploits</em> nothing.
    </>
  ),

  problem: 'Traveling salesman',
  problemSlug: 'traveling-salesman',
  rivals: [
    {
      name: 'Held-Karp × bitmask',
      isThisUnit: true,
      algoName: 'Held-Karp',
      cost: 'O(2ⁿn²)',
      wins: (
        <>
          <strong>Proven minimal</strong>, 63 years unbeaten as an
          exact bound: 44.8M transitions where orderings number
          6×10¹⁶: and the judge that prices every heuristic.
        </>
      ),
      costs: (
        <>
          The wall at n ≈ 20-30: states cost memory too: and no
          structure of the metric is exploited.
        </>
      ),
      when: 'Certified tours under ~20 cities, and as the referee for everything faster.',
    },
    {
      name: '2-opt × edge uncrossing',
      algoName: '2-opt',
      cost: 'O(n²) per pass',
      wins: (
        <>
          Measured +0.4% average against certified optima: and on
          the client it <em>found</em> the optimum: repair
          heuristics punch far above their proof weight.
        </>
      ),
      costs: (
        <>
          A local optimum with no certificate: without this
          page&apos;s referee, +0.0% and +5% look identical.
        </>
      ),
      when: 'Any n, always: the cheapest large improvement on any starting tour.',
    },
    {
      name: 'Christofides × matching',
      algoName: 'Christofides',
      cost: 'O(n³), metric only',
      wins: (
        <>
          The guarantee without exactness: ≤ 1.5× optimal,
          <em>proven</em>, on metric instances: the approximation
          shelf&apos;s crown jewel.
        </>
      ),
      costs: (
        <>
          Needs the triangle inequality, a matching solver, and
          accepts up to 50% slack this page&apos;s DP never does.
        </>
      ),
      when: 'Big metric instances where a worst-case promise matters more than the last percent.',
    },
    {
      name: 'Simulated annealing',
      algoName: 'Simulated annealing',
      cost: 'as long as you like',
      wins: (
        <>
          The live unit: past every wall: tours for n in the
          thousands, quality bought with patience and a cooling
          schedule.
        </>
      ),
      costs: (
        <>
          No certificate, no bound: its answer&apos;s quality is
          knowable only where an exact method can still referee.
        </>
      ),
      when: 'Beyond exactness and past Christofides’ metric: the metaheuristic default.',
    },
  ],
  neverUse: {
    name: 'Shipping a heuristic tour unpriced',
    why: (
      <>
        Nearest neighbor measured <strong>+10% average and +35%
        worst</strong> against certified optima: and without an
        exact referee, those numbers are unknowable: a heuristic
        tour carries no evidence about itself. The operational
        failure is silent: routes 10% long, forever, invisibly:
        35% on the unlucky days: costs that never appear in any
        log because nothing knows the baseline. The discipline this
        page enables: run the exact DP on subsampled or small
        instances to <em>measure your heuristic&apos;s gap on your
        data</em>: here it certified 2-opt at +0.4% (and outright
        optimal on the client): a pricing exercise that converts
        &quot;we use a heuristic&quot; from a hope into a
        quantified engineering decision. Exactness at small n is
        not a toy: it is the instrument that calibrates everything
        larger.
      </>
    ),
  },

  contest: {
    instance:
      'the exact tour of 13 plane cities; referee: all (n−1)! tours enumerated on 100 instances (n ≤ 9), the transition counter equal to its closed form to the unit',
    columns: ['tour cost', 'guarantee'],
    rows: [
      {
        method: 'Nearest neighbor',
        values: ['3.3890', 'none'],
        verdict: '+25.9% here; +10% average, +35% worst vs certified optima',
      },
      {
        method: 'NN + 2-opt',
        values: ['2.6908', 'local opt'],
        verdict: '+0.4% average: and here it found the optimum: only the DP could certify that',
      },
      {
        method: 'Held-Karp',
        isThisUnit: true,
        values: ['2.6908', 'PROVEN'],
        best: 0,
        verdict: 'every (subset, endpoint) priced: 135,168 transitions, exactly the closed form',
      },
    ],
    source:
      "python solutions/held_karp_bitmask_states.py prints this table and asserts: equality with full (n−1)! enumeration on 100 instances (n = 5..9) with each reconstructed tour revalidated; the transition counter equal to Σ C(12,s)·s·(12−s) = 135,168 to the unit at n = 13; the heuristics priced against proven optima over 100 instances (NN +10% avg/+35% worst, 2-opt +0.4% avg, orderings asserted); and the n = 20 arithmetic: 44,826,624 transitions vs 60,822,550,204,416,000 tours.",
  },

  figure: (
    <Figure
      id="fig-heldkarp-lattice"
      aspect="16 / 7"
      caption="A page per predicament, not per route. Two routes reaching the same (visited set, current city) have identical futures: only the cheaper arrival survives. Subsets are integers, so the table is an array swept in ascending order: every set precedes its supersets: layer by popcount layer. The collapse is audited: at n = 13 the transitions land on Σ C(12,s)·s·(12−s) = 135,168 exactly; at n = 20 the ledger holds 44.8 million entries where routes number sixty quadrillion."
      cite={{
        text: 'Held & Karp, "A Dynamic Programming Approach to Sequencing Problems", J. SIAM 10(1), 1962 (Bellman independently the same year): O(2ⁿn²), still the best exact bound known for general TSP, 63 years on.',
        href: 'https://doi.org/10.1137/0110015',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="A subset lattice by popcount layers narrowing into one optimal tour, beside the factorial count">
        <text x="40" y="26" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">subsets by size: every layer built from the one below · (S, j) pages, cheaper arrival kept</text>
        {[1, 2, 3, 4, 5].map((layer) => {
          const count = [5, 10, 10, 5, 1][layer - 1];
          const y = 220 - layer * 36;
          return Array.from({ length: count }, (_, k) => (
            <rect
              key={`${layer}-${k}`}
              x={320 - count * 22 + k * 44}
              y={y}
              width={32}
              height={20}
              rx={4}
              fill={layer === 5 ? 'rgba(98,217,138,0.3)' : 'rgba(93,162,255,0.14)'}
              stroke={layer === 5 ? '#62d98a' : '#33507a'}
            />
          ));
        })}
        <text x="252" y="76" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">full set: close the loop</text>
        <text x="40" y="250" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">audited: 135,168 transitions at n = 13, equal to the closed form to the unit</text>
        <text x="40" y="274" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">the alternative at n = 20: 60,822,550,204,416,000 orderings · the ledger: 44,826,624</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'held_karp_bitmask_states.py',
  Viz: HeldKarpViz,
  narration,
};
