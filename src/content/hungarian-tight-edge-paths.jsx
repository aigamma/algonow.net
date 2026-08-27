import HungarianViz from '../viz/HungarianViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/hungarian_tight_edge_paths.py?raw';
import { narration } from './hungarian-tight-edge-paths.narration.js';

export const content = {
  given:
    'n workers, n jobs, and an n×n table of costs: every worker could do every job, at a price.',
  task: 'The assignment of minimum total cost: exactly, with a proof of optimality attached.',
  constraint:
    'n! assignments exist: 150! is unthinkable: yet the answer must be certified, not argued. The referees: exhaustive permutation search on 150 small instances, then the LP duality certificate at every size: potentials feasible on all 22,500 pairs, matched edges tight, dual total equal to primal cost.',

  origins: (
    <p>
      Harold Kuhn, <strong>1955</strong>, in the Naval Research
      Logistics Quarterly: named the &quot;Hungarian method&quot; for
      the two Hungarian mathematicians whose theorems power it:
      Kőnig (whose matching duality already anchors the live
      Hopcroft-Karp unit) and Egerváry. Munkres tightened the
      analysis in 1957: hence &quot;Kuhn-Munkres&quot;. And the
      field&apos;s best footnote arrived in 2006: Jacobi&apos;s
      posthumous papers show the method essentially complete{' '}
      <em>a century earlier</em>: the Hungarian algorithm predates
      its own name by sixty-five years.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>primal-dual frame</strong>: maintain
      potentials u[i], v[j] with u+v ≤ cost everywhere (dual
      feasibility), and permit matching only along <em>tight</em>
      edges, where u[i]+v[j] = c[i][j] exactly. The frame carries
      the proof in its pockets: any perfect assignment costs at
      least Σu + Σv: so the moment a full assignment of tight edges
      exists, its cost <em>equals</em> the bound: optimality proven,
      not argued: asserted here on every instance (dual total 1,747
      = primal 1,747 at n = 150).
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>tight-edge alternating path</strong>: from
      each unmatched row, grow an alternating tree using tight edges
      only. Stuck: raise the tree&apos;s row potentials and lower
      its column potentials by the <em>minimum slack</em>: no
      feasible edge breaks, at least one new edge snaps tight, the
      tree grows: until an augmenting path completes and the row
      joins the matching. Measured: <strong>886 dual updates</strong>{' '}
      for n = 150 against the n² = 22,500 bound: one row at a time,
      n times, O(n³) in all.
    </p>
  ),

  picture: (
    <p>
      A subsidy negotiation. Give every worker a stipend u and every
      job a discount v, constrained so no cell&apos;s price is ever
      beaten below zero: and call a pairing <em>fair</em> where
      stipend plus discount hits the price exactly. The dance:
      try to marry everyone off using only fair cells. Stuck: the
      negotiator nudges the subsidies: raises the stuck group&apos;s
      stipends, lowers their candidate jobs&apos; discounts: by the
      smallest amount that makes one new cell fair. Nothing breaks,
      the options grow, and when the last worker marries, the books
      balance to the cent: total subsidies equal total cost, and
      that equality <em>is</em> the proof no better wedding exists.
    </p>
  ),

  steps: [
    <>
      <strong>Feasible start:</strong> u = v = 0 (costs
      non-negative): every edge has slack, none tight yet.
    </>,
    <>
      <strong>Grow the tree:</strong> from an unmatched row,
      alternate over tight edges: matched, unmatched, matched.
    </>,
    <>
      <strong>Stuck: update duals</strong> by the minimum slack:
      tree rows up, tree columns down: one edge snaps tight, zero
      break.
    </>,
    <>
      <strong>Augment:</strong> the path flips: one more row
      matched: repeat n times.
    </>,
    <>
      <strong>Read the proof:</strong> Σu + Σv = total cost, u+v ≤ c
      everywhere: the certificate this page asserts on all 22,500
      pairs.
    </>,
  ],

  signals: [
    <>
      <strong>Both sides are scarce:</strong> workers and jobs,
      servers and shards, trackers and targets: one-to-one, everyone
      assigned, total cost the objective.
    </>,
    <>
      <strong>The answer must be defensible:</strong> the duality
      certificate is an audit artifact: this schedule is optimal,
      and here is the arithmetic.
    </>,
    <>
      <strong>n in the thousands or less:</strong> O(n³) with tiny
      constants: 0.1 seconds covers everything on this page:
      vision&apos;s object-track matching runs it per frame.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>greedy assignment</strong>:
      each row takes the cheapest remaining job: measured{' '}
      <strong>160% over optimal</strong> on honest random costs and{' '}
      <strong>334×</strong> on the trap, because early rows steal
      the shared cheap columns that were late rows&apos; only exits.
      And the honest ceiling is exhaustive search: exact, certified
      by definition: and 150! is a number with 263 digits.
    </>
  ),

  strength: (
    <>
      <strong>Exact, certified, and fast enough to forget
      about.</strong> Equal to exhaustive permutation search on all
      150 small instances; the full duality certificate asserted at
      every size (feasibility on all pairs, matched edges tight,
      dual total = primal cost); the trap dispatched at the optimal
      12 where greedy paid 4,004; and 886 dual updates at n = 150:
      well inside the O(n³) promise, 0.1 seconds wall-clock.
    </>
  ),
  weakness: (
    <>
      <strong>Square, dense, and centralized.</strong> The classic
      form wants a complete n×n matrix: unbalanced problems need
      padding, sparse ones waste the density, and huge ones (n in
      the millions) outgrow O(n³): where the auction
      algorithm&apos;s decentralized bidding and min-cost-flow
      formulations take over. And the assignment must be
      one-to-one: capacities, precedences, or multiple jobs per
      worker leave the assignment polytope and this machinery with
      it.
    </>
  ),

  problem: 'Assignment',
  problemSlug: 'assignment-problem',
  rivals: [
    {
      name: 'Hungarian × tight edges',
      isThisUnit: true,
      algoName: 'Hungarian algorithm',
      cost: 'O(n³)',
      wins: (
        <>
          <strong>Optimal with the proof attached</strong>: Σu+Σv =
          cost, asserted: 1,747 vs greedy&apos;s 4,535 on the same
          matrix, in a tenth of a second.
        </>
      ),
      costs: (
        <>
          Dense square matrices, one-to-one only: padding and
          reformulation at the edges of the contract.
        </>
      ),
      when: 'Assignment proper: task allocation, tracking, chore splits: the certified default.',
    },
    {
      name: 'Hopcroft-Karp × layers',
      algoName: 'Hopcroft-Karp',
      cost: 'O(E√V)',
      wins: (
        <>
          The live unit: when costs are 0/1 (can or cannot),
          maximum-cardinality matching in batches of shortest
          augmenting paths: far faster than carrying prices nobody
          set.
        </>
      ),
      costs: (
        <>
          No notion of cost at all: the moment prices differ, its
          answer is merely feasible.
        </>
      ),
      when: 'Pure eligibility matching: the unweighted special case, solved by its specialist.',
    },
    {
      name: 'Successive shortest paths',
      algoName: 'Successive shortest paths',
      cost: 'O(n · SP)',
      wins: (
        <>
          Assignment as min-cost flow: the same potentials wearing
          Johnson&apos;s name: and the generalization handles
          capacities, unbalance, and sparsity natively.
        </>
      ),
      costs: (
        <>
          A flow network&apos;s scaffolding for a matrix problem:
          more machinery, same O(n³) here.
        </>
      ),
      when: 'When assignment is one corner of a larger flow: capacities, multiple slots, sparse costs.',
    },
    {
      name: 'Auction algorithm',
      algoName: 'Auction algorithm',
      cost: 'O(n² log n / ε)',
      wins: (
        <>
          Bertsekas&apos;s decentralized bidding: workers bid for
          jobs, prices rise: embarrassingly parallel, and the
          ε-scaling converges to exact.
        </>
      ),
      costs: (
        <>
          The ε dial and price-war stalls: tuning the Hungarian
          frame never needs.
        </>
      ),
      when: 'Distributed and parallel assignment: robot fleets, GPU batches: bidding beats a central tree.',
    },
  ],
  neverUse: {
    name: 'Greedy assignment on shared scarcity',
    why: (
      <>
        Each row takes its cheapest remaining job: it is the
        assignment everyone writes in the first five minutes, and on
        this page&apos;s trap it paid <strong>4,004 against the
        optimal 12</strong>. The mechanism deserves naming: the
        first row of each block takes the <em>shared</em> cheap
        column: worth 1 to it, worth everything to its neighbor,
        whose only alternative costs 1,000. Greedy prices what a
        column is worth to <em>me</em>, never what taking it costs{' '}
        <em>everyone else</em>: and on honest random costs that
        blindness still measured 160% over optimal. Opportunity cost
        is the entire content of this problem: the potentials u and
        v are precisely its bookkeeping: and the greedy loop is the
        decision to skip the bookkeeping and hope.
      </>
    ),
  },

  contest: {
    instance:
      'assign 150 workers to 150 jobs, uniform costs 0..999; referee: all n! permutations on 150 small instances, then the LP duality certificate at every size',
    columns: ['total cost', 'guarantee'],
    rows: [
      {
        method: 'Greedy (cheapest left)',
        values: ['4,535', 'none'],
        verdict: '160% over optimal here; 334× on the block trap',
      },
      {
        method: 'Hungarian',
        isThisUnit: true,
        values: ['1,747', 'Σu+Σv = 1,747'],
        best: 0,
        verdict: 'optimal with the proof attached: certified on all 22,500 pairs',
      },
    ],
    source:
      "python solutions/hungarian_tight_edge_paths.py prints this table and asserts: equality with exhaustive permutation search on 150 instances (n = 2..7); the full duality certificate on every instance including n = 150 (u+v ≤ c on all pairs, matched edges tight, dual total = primal cost); the greedy trap exact (4,004 vs 12, four [[1,2],[1,1000]] blocks); the random-cost greedy gap above 5% (measured 160%); and 886 dual updates inside the n² bound.",
  },

  figure: (
    <Figure
      id="fig-hungarian-duals"
      aspect="16 / 7"
      caption="The subsidy ledger. Stipends u on the rows, discounts v on the columns, constrained so u+v never beats any cell's price: matching allowed only where it hits the price exactly (tight, green). A stuck alternating tree triggers the dual update: tree rows rise, tree columns fall, by the minimum slack: nothing breaks, one new cell snaps tight, the tree grows. When the last row matches, Σu + Σv equals the assignment's cost: and since no assignment can beat Σu + Σv, the equality is the optimality proof: asserted on this page for all 22,500 pairs at n = 150."
      cite={{
        text: 'Kuhn, "The Hungarian method for the assignment problem", Naval Research Logistics Quarterly 2, 1955: named for Kőnig and Egerváry; Munkres 1957 tightened it; Jacobi\'s posthumous papers (2006 rediscovery) show the method a century early.',
        href: 'https://doi.org/10.1002/nav.3800020109',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="A cost matrix with row and column potentials, tight cells marked and one dual update illustrated">
        <text x="40" y="24" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">costs c[i][j] · stipends u left · discounts v below · green: tight (u+v = c) · blue: matched</text>
        {[
          [8, 4, 7], [5, 2, 3], [9, 4, 8],
        ].map((row, i) =>
          row.map((c, j) => {
            const tight = (i === 0 && j === 1) || (i === 1 && j === 0) || (i === 2 && j === 1) || (i === 1 && j === 2);
            const matched = (i === 0 && j === 1) || (i === 1 && j === 2);
            return (
              <g key={`${i}${j}`}>
                <rect
                  x={200 + j * 70}
                  y={50 + i * 54}
                  width={62}
                  height={46}
                  fill={matched ? 'rgba(93,162,255,0.25)' : tight ? 'rgba(98,217,138,0.15)' : 'none'}
                  stroke={matched ? '#5da2ff' : tight ? '#62d98a' : '#2a3450'}
                  strokeWidth={matched ? 2 : 1.4}
                />
                <text x={224 + j * 70} y={78 + i * 54} fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="13">{c}</text>
              </g>
            );
          }),
        )}
        {[4, 2, 4].map((uv, i) => (
          <text key={i} x={150} y={78 + i * 54} fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="12">u={uv}</text>
        ))}
        {[1, 0, 1].map((vv, j) => (
          <text key={j} x={218 + j * 70} y={230} fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="12">v={vv}</text>
        ))}
        <text x="450" y="78" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="10">stuck tree: rows +δ,</text>
        <text x="450" y="92" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="10">columns −δ, δ = min slack:</text>
        <text x="450" y="106" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="10">one cell snaps tight</text>
        <text x="40" y="262" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">measured: greedy 4,535 vs optimal 1,747 (n=150) · the trap 4,004 vs 12 · Σu+Σv = cost, asserted everywhere</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'hungarian_tight_edge_paths.py',
  Viz: HungarianViz,
  narration,
};
