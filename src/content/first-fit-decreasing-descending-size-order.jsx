import FirstFitViz from '../viz/FirstFitViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/first_fit_decreasing_descending_size_order.py?raw';
import { narration } from './first-fit-decreasing-descending-size-order.narration.js';

export const content = {
  given:
    'Items of sizes between 0 and 1, and bins of capacity 1. Pack every item; use as few bins as possible. The problem is NP-hard, and on 2,000 items the exact answer is out of reach.',
  task: 'First fit: take the items one at a time and put each into the lowest-numbered bin with room, opening a new bin only when none has any. The heuristic is the order: sort the items largest first, so the big ones claim bins while nothing blocks them and the small ones fill the gaps afterward.',
  constraint:
    'On 200 random 12-item instances scored against the exact optimum (a subset dynamic program), first fit decreasing is optimal on 200 of 200; the same rule in arrival order is optimal on 138 and worse on 62; next fit on 33. Dósa’s tight bound FFD ≤ 11/9 OPT + 6/9 held on every instance, and Johnson’s constructed family hits it: 9 bins optimal (packing verified bin by bin), 11 by first fit decreasing. On 2,000 items the packing lands 1.38% above the lower bound ⌈Σ sizes⌉ = 1,011, which no packing can beat, and a max-tree finds each first fit in 4.2% of the bin checks of the linear scan, with the identical packing.',

  origins: (
    <p>
      David Johnson&apos;s MIT thesis (1973) and the paper with Demers,
      Ullman, Garey, and Graham (SIAM J. Computing, <strong>1974</strong>)
      proved the worst-case ratios for the simple packing rules: first
      fit within 17/10 of optimal, first fit decreasing within 11/9
      plus an additive term. The additive term was hunted for three
      decades: Baker cut it to 3 (1985), Yue to 1 (1991), and Dósa
      (2007) proved the tight <strong>11/9 OPT + 6/9</strong>, with an
      instance that reaches it. Garey and Johnson listed bin packing
      among the first NP-hard problems; Karmarkar and Karp (1982)
      gave the asymptotic approximation scheme, and Hoberg and
      Rothvoß (2017) an OPT + O(log OPT) algorithm. The O(n log n)
      first fit by a tree over bin capacities is also Johnson&apos;s,
      from 1974. Every shipping dock, tape library, and cloud
      scheduler that packs jobs onto machines runs a descendant.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>placement rule and its speed</strong>: each
      item goes into the first bin that has room. A linear scan of the
      open bins costs O(bins) per item, 1,038,021 bin checks for 2,000
      items; a max-tree over bin capacities (each node the largest
      remaining capacity beneath it) descends to the leftmost fitting
      bin in O(log n), <strong>44,000 node touches, 4.2%</strong> of
      the scan, and the packings are identical bin for bin. Against
      the exact optimum on 200 random 12-item instances (a subset
      dynamic program, 3<sup>12</sup> submask steps each): 1,445 bins
      in total, the optimum&apos;s 1,445.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>order</strong>, and the order is the
      guarantee. Largest first: first fit decreasing was{' '}
      <strong>optimal on 200 of 200</strong> instances; the same rule in
      arrival order was optimal on 138 and used up to 2 extra bins;
      next fit, one open bin at a time, on 33 with up to 3 extra. The
      sort buys a worst case of 11/9 OPT + 6/9 against 17/10 OPT + 2
      without it. And the bound is real: Johnson&apos;s family of 30
      items (1/2+ε, 1/4+2ε, 1/4+ε, 1/4−2ε) packs into 9 bins,
      verified explicitly, while first fit decreasing opens 11, exactly
      11/9. At scale, 2,000 items: 1,025 bins against the lower bound
      1,011; arrival order 1,062; next fit 1,356.
    </p>
  ),

  picture: (
    <p>
      Loading a moving truck. The rookie loads boxes in the order they
      come off the porch: a sofa arrives after the truck is full of
      lamp boxes and needs its own truck. The mover sorts first: sofas
      and refrigerators go in while the truck is empty, then dressers
      into the gaps beside them, then lamp boxes and shoeboxes into
      whatever is left, each into the first truck with room. The
      small boxes are the mortar; loaded first they are only
      obstacles. There is still a bad day: when every large box is just
      over half a truck and every medium box just over a quarter, the
      sorted rule pairs them wastefully and uses eleven trucks where
      nine would do. That day has a name (Johnson&apos;s family), and
      it is the worst that can ever happen.
    </p>
  ),

  steps: [
    <>
      <strong>Sort:</strong> items by size, largest first: O(n log n).
    </>,
    <>
      <strong>Place:</strong> each item into the first bin with
      remaining capacity ≥ size; the tree finds it in O(log n).
    </>,
    <>
      <strong>Open:</strong> when no bin fits, start a new one; a bin
      once opened is never closed.
    </>,
    <>
      <strong>Bound:</strong> bins ≥ ⌈Σ sizes⌉, and bins ≤ 11/9 OPT
      + 6/9 (Dósa); Johnson&apos;s family reaches 11 vs 9.
    </>,
    <>
      <strong>Check:</strong> 200 of 200 optimal against the subset
      DP; the tree&apos;s packing identical to the scan&apos;s.
    </>,
  ],

  signals: [
    <>
      <strong>You hold the whole batch:</strong> the sort needs every
      item up front; online arrivals get plain first fit (17/10).
    </>,
    <>
      <strong>One dimension of capacity:</strong> weight, minutes,
      bytes; two or more dimensions break the sort&apos;s guarantee.
    </>,
    <>
      <strong>Good enough beats exact:</strong> 1.38% above the lower
      bound on 2,000 items where the exact program is 3<sup>2,000</sup>.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>first fit in arrival order</strong>:
      the same placement rule without the sort, optimal on 138 of 200
      small instances, 1,062 bins against 1,025 on 2,000 items, and a
      worst-case ratio of 17/10. Everything the sort adds is measured
      against it.
    </>
  ),

  strength: (
    <>
      <strong>Near-optimal in practice, bounded in theory, fast.</strong>{' '}
      Optimal on 200 of 200 random instances, 1.38% above the
      lower bound on 2,000 items, a proven 11/9 OPT + 6/9 worst case,
      and O(n log n) with the max-tree: 4.2% of the linear scan&apos;s
      work for the identical packing.
    </>
  ),
  weakness: (
    <>
      <strong>The bad day is real, and the sort needs the batch.</strong>{' '}
      Johnson&apos;s family costs 11 bins for 9, and any 11/9 instance
      wastes two bins in nine no matter how large the input. The sort
      needs every item in hand, so online arrivals lose it. It never
      reconsiders a placement, so the gap to optimal that remains
      (14 bins on 2,000 items) is invisible to it; best fit decreasing
      trims some of it, and only branch and bound closes it.
    </>
  ),

  problem: 'Bin packing',
  problemSlug: 'bin-packing',
  rivals: [
    {
      name: 'First fit decreasing × descending size order',
      isThisUnit: true,
      algoName: 'First fit decreasing',
      cost: 'O(n log n) with the tree',
      wins: (
        <>
          <strong>200 of 200 optimal</strong>, 1.38% above the bound at
          scale, 11/9 OPT + 6/9 guaranteed.
        </>
      ),
      costs: (
        <>
          Needs the whole batch; never revisits a placement; the
          11/9 day exists.
        </>
      ),
      when: 'A batch of one-dimensional items where near-optimal in milliseconds beats exact in hours.',
    },
    {
      name: 'Best fit decreasing',
      cost: 'O(n log n) with a balanced tree',
      wins: (
        <>
          Same sort, tightest fitting bin instead of the first: the
          same 11/9 guarantee and slightly less waste in practice.
        </>
      ),
      costs: (
        <>
          A tree keyed by remaining capacity rather than position;
          the same worst case.
        </>
      ),
      when: 'When the last percent of waste matters and the code can carry an ordered tree.',
    },
    {
      name: 'Next fit',
      cost: 'O(n), one open bin',
      wins: (
        <>
          Online, constant memory, one comparison per item: the right
          tool when bins are sealed as they leave.
        </>
      ),
      costs: (
        <>
          Optimal on 33 of 200; 13 bins on Johnson&apos;s 9; 1,356 on
          2,000 items where the bound is 1,011.
        </>
      ),
      when: 'Streaming items into bins that cannot be reopened.',
    },
    {
      name: 'Branch and bound',
      cost: 'exponential, pruned',
      wins: (
        <>
          The exact optimum with Martello-Toth bounds pruning the
          search; the referee when 12 items become 60.
        </>
      ),
      costs: (
        <>
          Hours on hard instances; no answer at all on 2,000 items.
        </>
      ),
      when: 'When every bin is expensive and the instance is small enough to finish.',
    },
  ],
  neverUse: {
    name: 'The exact subset dynamic program as the packer',
    why: (
      <>
        It is the referee on this page and it must never be the tool.
        The program that scores 12 items exactly takes 3<sup>12</sup> =
        531,441 submask steps per instance; at 20 items it is 3.5
        billion, at 2,000 it is 3<sup>2,000</sup>, a number with 955
        digits. Bin packing is NP-hard, and the exact program&apos;s
        exponent is the reason a one-sort heuristic with an 11/9
        guarantee is the algorithm of record: on 2,000 items it
        finished 1.38% above a bound the exact program will never
        reach in the lifetime of the universe.
      </>
    ),
  },

  contest: {
    instance:
      '200 random instances of 12 items, sizes uniform in [0.05, 0.95], unit bins; referee: the exact optimum by subset DP (531,441 submask steps per instance)',
    columns: ['bins (200 instances)', 'optimal on', 'worst excess'],
    rows: [
      {
        method: 'Optimum (subset DP)',
        values: ['1,445', '200 / 200', '0'],
        verdict: 'the referee',
      },
      {
        method: 'First fit decreasing',
        isThisUnit: true,
        values: ['1,445', '200 / 200', '0'],
        best: 0,
        verdict: 'largest first: big items claim bins before anything blocks them',
      },
      {
        method: 'First fit, arrival order',
        values: ['1,508', '138 / 200', '2'],
        verdict: 'the same rule without the sort; worse on 62 of 200',
      },
      {
        method: 'Next fit',
        values: ['1,683', '33 / 200', '3'],
        verdict: 'one open bin at a time',
      },
      {
        method: 'Johnson’s family (30 items)',
        values: ['FFD 11 vs OPT 9', 'next fit 13', '11/9, tight'],
        verdict: 'the constructed worst case; the optimal packing verified bin by bin',
      },
    ],
    source:
      'python solutions/first_fit_decreasing_descending_size_order.py prints this table and asserts: every packing valid; FFD ≤ 11/9 OPT + 6/9 and ≥ OPT on every instance; FFD optimal more often than arrival order, which is optimal more often than next fit, and fewer bins in total in that order; Johnson’s family packs into 9 (verified) with FFD at 11; on 2,000 items FFD within 5% of ⌈Σ sizes⌉ and the max-tree reproducing the scan’s packing exactly while touching under a fifth of its bin checks (measured 4.2%).',
  },

  figure: (
    <Figure
      id="fig-ffd-worst-case"
      aspect="16 / 7"
      caption="Johnson’s family, the tight worst case. Thirty items: six of 1/2+ε, six of 1/4+2ε, six of 1/4+ε, twelve of 1/4−2ε (ε = 0.01). Left: the optimal packing, 9 bins, each verified to hold at most 1: six bins of {1/2+ε, 1/4+ε, 1/4−2ε} and three of two 1/4+2ε with two 1/4−2ε. Right: first fit decreasing opens 11: the six largest each take one 1/4+2ε and then nothing else fits beside them, the 1/4+ε items go three to a bin, and the twelve smallest four to a bin. 11/9 exactly, and Dósa proved nothing worse can happen."
      cite={{
        text: 'D. S. Johnson, A. Demers, J. D. Ullman, M. R. Garey, R. L. Graham, "Worst-case performance bounds for simple one-dimensional packing algorithms," SIAM J. Computing 3(4), 1974. DOI 10.1137/0203025. G. Dósa, "The tight bound of first fit decreasing bin-packing algorithm is FFD(I) ≤ 11/9 OPT(I) + 6/9," 2007.',
        href: 'https://doi.org/10.1137/0203025',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="Nine optimal bins on the left and eleven first-fit-decreasing bins on the right for Johnson's worst-case family">
        {(() => {
          const opt = [...Array(6).fill([0.51, 0.26, 0.23]), ...Array(3).fill([0.27, 0.27, 0.23, 0.23])];
          const ffd = [...Array(6).fill([0.51, 0.27]), ...Array(2).fill([0.26, 0.26, 0.26]), ...Array(3).fill([0.23, 0.23, 0.23, 0.23])];
          const colors = { 0.51: '#5da2ff', 0.27: '#62d98a', 0.26: '#c792ea', 0.23: '#f0b94b' };
          const draw = (bins, x0, bw) => bins.map((bin, k) => {
            let top = 220;
            return (
              <g key={k}>
                <rect x={x0 + k * bw} y={60} width={bw - 4} height={160} fill="none" stroke="rgba(154,165,189,0.4)" />
                {bin.map((s, j) => {
                  top -= s * 160;
                  return <rect key={j} x={x0 + k * bw + 1} y={top + 1} width={bw - 6} height={s * 160 - 2} fill={colors[s]} opacity="0.8" />;
                })}
              </g>
            );
          });
          return (
            <>
              {draw(opt, 30, 28)}
              {draw(ffd, 320, 28)}
            </>
          );
        })()}
        <text x="30" y="44" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="12">optimal: 9 bins (verified)</text>
        <text x="320" y="44" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="12">first fit decreasing: 11 bins = 11/9</text>
        <text x="30" y="246" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="10">■ 1/2+ε</text>
        <text x="110" y="246" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="10">■ 1/4+2ε</text>
        <text x="200" y="246" fill="#c792ea" fontFamily="ui-monospace, monospace" fontSize="10">■ 1/4+ε</text>
        <text x="280" y="246" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="10">■ 1/4−2ε</text>
        <text x="30" y="268" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">200 random instances: FFD optimal on 200, arrival order on 138, next fit on 33; 2,000 items: 1,025 bins vs bound 1,011</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'first_fit_decreasing_descending_size_order.py',
  Viz: FirstFitViz,
  narration,
};
