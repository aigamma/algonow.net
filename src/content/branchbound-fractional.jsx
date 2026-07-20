import KnapsackViz from '../viz/KnapsackViz.jsx';
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

  code,
  filename: 'branchbound_fractional.py',
  Viz: KnapsackViz,
  narration,
};
