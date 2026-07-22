import KnapsackViz from '../viz/KnapsackViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/branchbound_fractional.py?raw';
import { narration } from './branchbound-fractional.narration.js';

export const content = {
  given: 'A bag with a strict weight capacity; items each with a weight and a point value.',
  task: 'The subset maximizing total points within capacity, provably optimal.',
  constraint:
    'Each item is all-or-nothing. That single rule creates 2ⁿ subsets; 40 items is a trillion bags.',

  origins: (
    <p>
      Named and formalized by Ailsa Land and Alison Doig at the LSE in 1960 as
      a general recipe for integer programming; the knapsack framing is 1950s
      operations-research folklore. Relaxing a hard problem to get a quick
      optimistic estimate became one of the field&apos;s load-bearing ideas:
      every serious integer-programming solver behind airline schedules and
      supply chains descends from this pair.
    </p>
  ),

  algoRole: (
    <p>
      Depth-first search over decisions: <strong>include or exclude</strong>{' '}
      item i, down a binary tree whose leaves are all possible bags. Banks the
      best complete bag found. Alone, this is enumeration; it reads
      everything.
    </p>
  ),
  heurRole: (
    <p>
      Answer an easier question: if items could be <strong>split</strong>,
      greedy pouring (densest first, fraction of the last) is instantly
      optimal. That poured total is a <strong>ceiling</strong> no legal bag
      from the same items can beat. Any branch whose ceiling ≤ the banked best{' '}
      <strong>dies unopened</strong>.
    </p>
  ),

  picture: (
    <p>
      A jewel thief, one backpack, working a vault shelf by shelf, notebook
      holding the best full pack so far: 118 points, banked. At each aisle a
      thirty-second estimate: even shaving gold bars into dust, everything
      left tops out at 112. Generous by construction, and still short. The
      thief walks past the whole aisle without opening a case. The estimate is
      the relaxation; the walk-past is the pruning; the banked pack is what
      makes the comparison mean something.
    </p>
  ),

  steps: [
    <>
      <strong>Sort by density</strong> (points per kg), densest first: this is
      what makes the ceiling tight and the pruning fierce.
    </>,
    <>
      <strong>Branch:</strong> at item i, include (when it fits) or exclude;
      walk depth-first.
    </>,
    <>
      <strong>Bank</strong> the best complete bag whenever the current one
      beats it.
    </>,
    <>
      <strong>Ceiling:</strong> before descending, pour the remaining items
      fractionally into the leftover capacity.
    </>,
    <>
      <strong>Discard:</strong> ceiling ≤ banked best means retreat; nothing
      below can win.
    </>,
    <>
      <strong>Exhausted tree</strong> = the banked bag is provably optimal:
      every branch was read or out-ceilinged.
    </>,
  ],

  signals: [
    <>
      The answer must be <strong>exactly optimal</strong>; good-enough
      heuristics are disqualified.
    </>,
    <>
      <strong>All-or-nothing choices</strong>, the thing that defeats plain
      greedy.
    </>,
    <>
      A <strong>relaxed version solves instantly</strong> and bounds the
      original; once seen, this signal appears all over optimization.
    </>,
  ],
  baseline: (
    <>
      Full enumeration reads 2ⁿ bags. DP solves knapsack in O(n·capacity) and
      serves as the independent oracle in the tested solution. On a random
      18-item instance, enumeration visited <strong>174,707</strong> nodes;
      the same search carrying the bound visited <strong>39</strong>. Same
      provably optimal answer, ~4,500× less reading.
    </>
  ),

  strength: (
    <>
      <strong>Certainty at a discount.</strong> Provably optimal, usually from
      a sliver of the tree; indifferent to fractional weights or astronomical
      capacities where DP chokes. All it needs is a sound bound.
    </>
  ),
  weakness: (
    <>
      <strong>The discount is not guaranteed.</strong> Adversarial instances
      keep ceilings loose and the search decays toward enumeration; the worst
      case stays exponential. And the bound must be sound: an estimate that
      undershoots prunes away the optimum and silently corrupts the
      guarantee.
    </>
  ),

  problem: 'The 0/1 knapsack',
  problemSlug: 'knapsack',
  rivals: [
    {
      name: 'Exhaustive subsets',
      algoName: 'Subset-sum enumeration',
      cost: 'O(2ⁿ · n)',
      wins: <>Cannot be wrong, and fits in ten lines with no cleverness to review.</>,
      costs: (
        <>
          <strong>262,144 subsets</strong> for 18 items. Add ten more items and
          it is a thousand times worse.
        </>
      ),
      when: 'n below about 20, and only when you want the simplest possible thing that is certainly right.',
    },
    {
      name: 'Branch and bound, no bound',
      algoName: 'Branch and bound',
      cost: 'O(2ⁿ), with capacity pruning only',
      wins: <>Refuses overweight branches, which already removes 40 percent of the work here.</>,
      costs: (
        <>
          <strong>156,030 nodes</strong>: still exponential, because feasible
          and promising are different questions and this asks only the first.
        </>
      ),
      when: 'Never deliberately. It is the control that isolates what the bound contributes.',
    },
    {
      name: 'Branch and bound × fractional bound',
      algoName: 'Branch and bound',
      isThisUnit: true,
      cost: 'O(2ⁿ) worst case, near-trivial on structured instances',
      wins: (
        <>
          <strong>71 nodes</strong>: a <strong>3,692× saving</strong> over
          enumeration, with the same proven optimum, because any branch whose
          optimistic ceiling cannot beat the best bag in hand is discarded
          unopened.
        </>
      ),
      costs: (
        <>
          The bound must never undershoot, or it prunes the optimum away and
          corrupts the guarantee silently. Adversarial instances still decay
          toward enumeration.
        </>
      ),
      when: 'Exact answers on instances too large to enumerate, where a cheap optimistic estimate exists.',
    },
    {
      name: 'Dynamic programming',
      algoName: '0/1 knapsack DP',
      cost: 'O(n · capacity), pseudo-polynomial',
      wins: (
        <>
          <strong>2,574 table cells</strong> and no search at all. Immune to
          the item structure that makes bounds go loose.
        </>
      ),
      costs: (
        <>
          Cost scales with the <strong>capacity number</strong>, not the item
          count. Make weights real-valued or capacity a billion and the table
          is impossible while branch and bound is unbothered.
        </>
      ),
      when: 'Integer weights with a modest capacity, which is most textbook instances and many real ones.',
    },
    {
      name: 'Greedy by density',
      algoName: 'Knapsack greedy',
      cost: 'O(n log n)',
      wins: (
        <>
          <strong>18 steps</strong> and, on this instance,{' '}
          <strong>1.17 percent</strong> below optimal. Often good enough, and
          it is the same relaxation this unit uses as a ceiling.
        </>
      ),
      costs: (
        <>
          No guarantee whatsoever as an answer: the standard counterexample is
          one dense pebble crowding out a gold bar, where it returns an
          arbitrarily small fraction of the optimum.
        </>
      ),
      when: 'Approximate answers under a deadline, or to seed the incumbent that makes the bound prune harder.',
    },
    {
      name: 'Greedy, or the best single item',
      algoName: 'Knapsack greedy',
      cost: 'O(n log n)',
      wins: (
        <>
          A one-line repair with a theorem attached: it can never return less
          than <strong>half</strong> the optimum, which plain greedy cannot
          promise.
        </>
      ),
      costs: <>Identical to plain greedy on well-behaved instances, so the fix looks pointless until it saves you.</>,
      when: 'You need an approximation you can defend in writing rather than one that usually works.',
    },
  ],
  neverUse: {
    name: 'Dynamic programming on real-valued weights',
    why: (
      <>
        The table is indexed by capacity, so it needs the weights to be
        integers of modest size. Faced with weights like 3.7194 kilograms,
        the usual reflex is to scale to integers: multiply by 10,000 and the
        capacity becomes <strong>1,430,000</strong> cells per item, and a
        finer scale multiplies that again. The method has not become slow, it
        has become <strong>the wrong shape</strong>: its cost depends on the
        precision of your numbers rather than the size of your problem.
        Branch and bound does not care, because a bound is arithmetic on
        whatever type you have.
      </>
    ),
  },

  contest: {
    instance:
      '18 items with random weights 3 to 30 and values 5 to 60 (seed 2026), capacity 143, proven optimum 341',
    columns: ['work', 'value', 'gap'],
    rows: [
      {
        method: 'Exhaustive subsets',
        values: ['262,144 subsets', '341', '0%'],
        verdict: 'certainly right, and doubling with every item added',
      },
      {
        method: 'Branch and bound, no bound',
        values: ['156,030 nodes', '341', '0%'],
        verdict: 'capacity pruning alone buys 40 percent',
      },
      {
        method: 'Branch and bound × fractional bound',
        isThisUnit: true,
        values: ['71 nodes', '341', '0%'],
        best: 0,
        verdict: '3,692× less work than enumeration, same proof',
      },
      {
        method: 'Dynamic programming',
        values: ['2,574 cells', '341', '0%'],
        verdict: 'exact with no search, but priced by capacity not by n',
      },
      {
        method: 'Greedy by density',
        values: ['18 steps', '337', '1.17%'],
        verdict: 'nearly right here, no guarantee anywhere',
      },
      {
        method: 'Greedy, or best single item',
        values: ['18 steps', '337', '1.17%'],
        verdict: 'same answer, but now provably within half of optimal',
      },
    ],
    source:
      'python solutions/branchbound_fractional.py prints this table and asserts every exact method agrees on 341 while neither greedy exceeds it. Work units are not interchangeable: subsets enumerated, search nodes visited, table cells filled, and items scanned are different currencies, compared here only within each exact method and against the enumeration baseline.',
  },

  figure: (
    <Figure
      id="fig-bb-ceiling"
      aspect="16 / 8"
      caption="The bound is a receipt, not a guess. At each partial packing, the fractional relaxation (fill the remaining capacity with the best value-per-weight available, allowing a fraction of the last item) gives a ceiling no completion of that branch can exceed. When the ceiling falls below the best complete bag already in hand, every completion of the branch is provably worse, so the entire subtree is discarded without generating a single node of it."
      cite={{
        text: 'Branch and bound: Land and Doig, "An Automatic Method of Solving Discrete Programming Problems", Econometrica 28(3), 1960. The fractional relaxation bound is Dantzig, 1957.',
        href: 'https://doi.org/10.2307/1910129',
      }}
    >
      <svg viewBox="0 0 640 320" role="img" aria-label="A branch whose optimistic ceiling falls below the incumbent value is pruned">
        <line x1="70" y1="252" x2="612" y2="252" stroke="#232c40" strokeWidth="1.5" />
        <line x1="70" y1="36" x2="70" y2="252" stroke="#232c40" strokeWidth="1.5" />
        <text x="70" y="24" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="12">value</text>
        <line x1="70" y1="120" x2="612" y2="120" stroke="#62d98a" strokeWidth="2" strokeDasharray="7 5" />
        <text x="486" y="112" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="12">best bag so far · 341</text>
        <rect x="110" y="70" width="72" height="182" rx="5" fill="rgba(93,162,255,0.18)" stroke="#5da2ff" strokeWidth="1.6" />
        <text x="146" y="272" textAnchor="middle" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">branch A</text>
        <text x="146" y="62" textAnchor="middle" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="11">ceiling 356</text>
        <rect x="238" y="96" width="72" height="156" rx="5" fill="rgba(93,162,255,0.18)" stroke="#5da2ff" strokeWidth="1.6" />
        <text x="274" y="272" textAnchor="middle" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">branch B</text>
        <text x="274" y="88" textAnchor="middle" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="11">ceiling 348</text>
        <rect x="366" y="152" width="72" height="100" rx="5" fill="rgba(224,103,103,0.12)" stroke="#e06767" strokeWidth="1.6" strokeDasharray="5 4" />
        <text x="402" y="272" textAnchor="middle" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">branch C</text>
        <text x="402" y="144" textAnchor="middle" fill="#e06767" fontFamily="ui-monospace, monospace" fontSize="11">ceiling 318</text>
        <text x="402" y="196" textAnchor="middle" fill="#e06767" fontFamily="ui-monospace, monospace" fontSize="13">pruned</text>
        <rect x="494" y="176" width="72" height="76" rx="5" fill="rgba(224,103,103,0.12)" stroke="#e06767" strokeWidth="1.6" strokeDasharray="5 4" />
        <text x="530" y="272" textAnchor="middle" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">branch D</text>
        <text x="530" y="168" textAnchor="middle" fill="#e06767" fontFamily="ui-monospace, monospace" fontSize="11">ceiling 295</text>
        <text x="530" y="216" textAnchor="middle" fill="#e06767" fontFamily="ui-monospace, monospace" fontSize="13">pruned</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'branchbound_fractional.py',
  Viz: KnapsackViz,
  narration,
};
