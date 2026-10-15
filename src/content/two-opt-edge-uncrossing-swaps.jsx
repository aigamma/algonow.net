import TwoOptViz from '../viz/TwoOptViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/two_opt_edge_uncrossing_swaps.py?raw';
import { narration } from './two-opt-edge-uncrossing-swaps.narration.js';

export const content = {
  given:
    'A tour through n points in the plane, built by any construction at all (nearest neighbor, a random order, a dispatcher’s guess), and a budget of seconds: make it shorter until no simple change helps, and know exactly what “no simple change helps” certifies.',
  task: '2-opt. The algorithm is local search over tours: a neighborhood of small edits, apply an improving edit, repeat until none exists, and call the result a local optimum. The heuristic is the edge-uncrossing swap (Croes 1958): remove two edges (a, b) and (c, d) and reconnect them as (a, c) and (b, d), which reverses the segment between b and c. When the two edges cross, the triangle inequality makes the reconnection strictly shorter, so a 2-opt local optimum has no crossing edges at all, and the test costs four distance lookups. Neighbor lists (Bentley 1992, Johnson and McGeoch 1997) try only the near cities closer than the edge being replaced, which cuts a pass from O(n²) to O(nk) without losing any move whose new short edge is within the k nearest.',
  constraint:
    'Measured against an exact Held-Karp dynamic program (itself checked against brute force) on twenty random instances with n = 16: nearest neighbor averages 14.98% over the optimum (worst 41.6%, optimal once); 2-opt from it averages 1.85% (worst 8.31%, optimal 13 of 20); 2-opt from a random tour 4.12% (worst 17.9%, optimal 8 of 20); 2-opt then Or-opt 0.00%, optimal on all 20. Every 2-opt local optimum under the full neighborhood had zero crossings on every instance from n = 16 to n = 1,600, where the starting tours had 17 to 147 crossings (nearest neighbor) and 1,026 to 69,376 (random); every accepted swap strictly shortened the tour and the accepted deltas summed exactly to the change in length. At n = 400 the nearest-neighbor tour fell from 18.472 to 16.241 in 103 swaps, 1,369,560 lookups, and 46 ms; sorted neighbor lists of twenty reached 15.802 in 186,230 lookups; Or-opt took that on to 15.664; a random start of length 203.4 and 18,278 crossings reached 16.766 in 2,334 swaps. At n = 1,600 the full scan spent 40.9 million lookups (1.9 s) and lists of twenty 2.95 million (0.3 s), both crossing-free, while lists of ten left 5 crossings. Best-improvement beat first-improvement by 1.4% from the nearest-neighbor start and 2.3% from random, at 3.8 and 13.5 times the lookups (means of ten instances at n = 100).',

  origins: (
    <p>
      Merrill Flood (<strong>1956</strong>) noticed that an optimal tour in the
      plane never crosses itself and improved tours by hand with segment
      inversions; G. A. Croes (1958) made the inversion an algorithm, the
      first published local search for the traveling salesman problem. Shen
      Lin (1965) generalized it to 3-opt and coined the λ-opt family of
      moves, Lin and Kernighan (1973) made the depth variable, Ilhan Or
      (1976) restricted 3-opt to short segment relocations, and Jon Bentley
      (1992) made 2-opt fast on a million cities with neighbor lists,
      don&apos;t-look bits, and k-d trees. Johnson and McGeoch&apos;s 1997 case
      study fixed the folklore numbers: on random uniform instances 2-opt
      lands about 5% above the Held-Karp bound, 3-opt about 3%, Lin-Kernighan
      about 2%. On this site the same move drives simulated annealing
      (puzzle 2), the exact Held-Karp program is puzzle 81, and Christofides
      (puzzle 117) is the construction with a guarantee.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>loop and the certificate</strong>: scan the neighborhood,
      apply an improving edit, repeat until a full pass accepts nothing. That
      clean pass is a proof that no single swap helps, and in the plane it
      is a proof that no two edges cross. The referee is an exact Held-Karp
      dynamic program on twenty instances with n = 16 (3.5 s of exact
      answers): the local optimum from a nearest-neighbor start is{' '}
      <strong>1.85% above optimal</strong> on average and exactly optimal 13
      times, where the start was 14.98% above. A geometric crossing count
      reads zero on every local optimum from n = 16 to 1,600, every accepted
      delta is negative, and the deltas sum to the measured change in length
      to within rounding.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>move</strong>: four lookups decide whether (a, c) and
      (b, d) beat (a, b) and (c, d), and reversing the shorter side of the
      cycle applies it. The geometry is the reason the move is the right one:
      two crossing edges always lose to their uncrossing, so{' '}
      <strong>32 crossings at n = 400 became zero in 103 swaps</strong>. The
      pruning is the reason it scales: an improving swap must add an edge
      shorter than the removed edge it shares an endpoint with, so sorted
      neighbor lists of twenty see the same moves for 186,230 lookups where
      the full scan spent 1,369,560, and 2.95 million against 40.9 million
      at n = 1,600. The honest constants: lists of ten left 5 crossings at
      1,600 cities, and the neighbor-list scan, which tries the shortest new
      edge first, landed on a shorter local optimum than the full scan at
      every size: a different path through the same landscape, not a bigger
      neighborhood.
    </p>
  ),

  picture: (
    <p>
      A shoelace threaded once through every peg on a board, in a tangle.
      Wherever the lace crosses itself, pinch the two crossing strands, lift
      the loop between them, and lay it back down flipped. The crossing is
      gone and the lace is shorter, because the two straight runs you made
      are each shorter than the bent paths they replace. Keep flipping until
      nothing crosses. The lace is now untangled and shorter, and it is not
      the shortest lace possible: it is the shortest lace that no single
      flip can improve, which is a different and weaker thing, and the whole
      lesson is knowing the difference.
    </p>
  ),

  steps: [
    <>
      <strong>Start anywhere:</strong> the nearest-neighbor tour (15% above
      optimal on average) or a random order (an order of magnitude above);
      keep a position array so pos[city] is known.
    </>,
    <>
      <strong>Test a pair:</strong> for tour edges (a, b) and (c, d) compute
      delta = d(a, c) + d(b, d) − d(a, b) − d(c, d), four lookups; the pair
      is a candidate when the edges are not adjacent.
    </>,
    <>
      <strong>Swap:</strong> if delta &lt; 0, reverse the tour between b and
      c (reverse the shorter side of the cycle, the same undirected tour),
      update positions, count the swap.
    </>,
    <>
      <strong>Pass until clean:</strong> first-improvement continues the scan
      past each accepted swap; a pass that accepts nothing is the local
      optimum, and in the plane it has no crossings.
    </>,
    <>
      <strong>Scale it:</strong> sorted neighbor lists of about twenty, both
      tour directions, stopping at the first near city farther than the edge
      being replaced; don&apos;t-look bits; then Or-opt or 3-opt as the
      finishing pass.
    </>,
  ],

  signals: [
    <>
      <strong>A cyclic order to improve under a metric:</strong> tours,
      drilling paths, delivery routes, any sequence where cost is a sum of
      adjacent distances obeying the triangle inequality.
    </>,
    <>
      <strong>A construction that visibly crosses itself:</strong> nearest
      neighbor left 17 to 147 crossings here; each one is a guaranteed
      improving move.
    </>,
    <>
      <strong>Thousands of cities and seconds of budget:</strong> exact search
      is hopeless past about twenty, and a crossing-free tour a few percent
      above the bound is the baseline every heavier method is judged against.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>nearest neighbor and stop</strong>: 18.47
      at n = 400 with 32 crossings, 14.98% above the exact optimum at n = 16
      and 41.6% at worst, which a few hundred swaps repair.
    </>
  ),

  strength: (
    <>
      <strong>Crossing-free in milliseconds, four lookups per test.</strong>{' '}
      1.85% above the exact optimum from a nearest-neighbor start at n = 16,
      optimal 13 times in 20; 400 cities untangled in 46 ms; 1,600 cities in
      2.95 million lookups with neighbor lists; the same move is the engine
      inside simulated annealing and Lin-Kernighan.
    </>
  ),
  weakness: (
    <>
      <strong>A local optimum, not the optimum.</strong> 8.31% above exact at
      worst from the nearest-neighbor start and 4.12% on average from random
      starts at n = 16; the full scan is quadratic per pass (40.9 million
      lookups at n = 1,600); an array reversal is O(n) per swap; and without
      the triangle inequality the uncrossing guarantee is gone.
    </>
  ),

  problem: 'Tour improvement',
  problemSlug: 'traveling-salesman',
  rivals: [
    {
      name: '2-opt × Edge-uncrossing swaps',
      isThisUnit: true,
      algoName: '2-opt',
      cost: 'O(n²) per pass; O(nk) with neighbor lists',
      wins: (
        <>
          <strong>Zero crossings, certified</strong>; 1.85% above exact from a
          nearest-neighbor start; 400 cities in 46 ms.
        </>
      ),
      costs: (
        <>
          Stops at the first local optimum: 8.31% above exact at worst, 4.12%
          on average from random starts.
        </>
      ),
      when: 'The first thing to run on any tour, and the baseline every heavier method is measured against.',
    },
    {
      name: 'Or-opt',
      algoName: 'Or-opt',
      cost: 'O(n²) per pass over runs of one to three cities',
      wins: (
        <>
          After 2-opt it reached the exact optimum on <strong>20 of 20</strong>{' '}
          instances at n = 16, and took 16.241 to 15.664 at n = 400.
        </>
      ),
      costs: (
        <>
          3.8 million lookups for 41 moves at n = 400, nearly three times
          2-opt&apos;s whole run; one move type, no uncrossing argument.
        </>
      ),
      when: 'As the finishing pass after 2-opt: the cheap slice of 3-opt, moving short segments 2-opt cannot.',
    },
    {
      name: 'Lin-Kernighan',
      algoName: 'Lin-Kernighan',
      cost: 'variable-depth exchanges, roughly O(n²·²) in practice',
      wins: (
        <>
          About 2% above the Held-Karp bound on random uniform instances where
          2-opt sits near 5% (Johnson and McGeoch); LKH is the state of the
          art.
        </>
      ),
      costs: (
        <>
          A serious implementation: sequential edge exchanges, a gain
          criterion, tour data structures for the reversals.
        </>
      ),
      when: 'When the last few percent matter and n is in the thousands or millions.',
    },
    {
      name: 'Simulated annealing',
      algoName: 'Simulated annealing',
      cost: 'the same 2-opt move, millions of times, under a cooling schedule',
      wins: (
        <>
          Accepts uphill swaps early, so it can leave the local optimum 2-opt
          stops at and find a better basin.
        </>
      ),
      costs: (
        <>
          Orders of magnitude more moves than the 103 swaps here, and a
          schedule to tune; no certificate at the end.
        </>
      ),
      when: 'When a 2-opt local optimum is not good enough and Lin-Kernighan is not at hand; puzzle 2 is the full lesson.',
    },
  ],
  neverUse: {
    name: 'Held-Karp, or any exact search, at n = 400',
    why: (
      <>
        The referee on this page is the exact Held-Karp dynamic program, and
        it is a referee, not a method: twenty instances with sixteen cities
        took <strong>3.5 s</strong>, about 0.18 s each, and every added city
        roughly doubles the states, 2ⁿ subsets times n endpoints. At forty
        cities the same program needs on the order of 2²⁴ times longer, months;
        at 400 the state count alone, 2⁴⁰⁰, is beyond any count of atoms.
        2-opt untangled the same 400 cities in 103 swaps and 46 ms, Or-opt
        finished it, and the result sat about 10% above the asymptotic
        estimate of the optimum. Exact where exact is cheap, local search
        where it is not; a learner who reaches for the referee as the method
        will wait forever.
      </>
    ),
  },

  contest: {
    instance:
      'n = 400 random uniform points in the unit square, nearest-neighbor start unless noted; referees: a geometric crossing count on every tour, strict improvement on every swap with the deltas summing to the length change, and the exact Held-Karp optimum on twenty instances at n = 16; one currency: distance lookups',
    columns: ['length (× BHH estimate)', 'distance lookups', 'moves', 'crossings left'],
    rows: [
      {
        method: 'nearest neighbor tour (the start)',
        values: ['18.472 (1.296)', '79,800', '0', '32'],
        verdict: 'the baseline: 14.98% above exact at n = 16',
      },
      {
        method: '2-opt, full scan',
        isThisUnit: true,
        values: ['16.241 (1.140)', '1,369,560', '103', '0'],
        best: 3,
        verdict: 'crossing-free in 46 ms',
      },
      {
        method: '2-opt, neighbor lists of 20',
        values: ['15.802 (1.109)', '186,230', '110', '0'],
        best: 1,
        verdict: 'a seventh of the lookups, a shorter tour',
      },
      {
        method: '2-opt then Or-opt',
        values: ['15.664 (1.099)', '+3,824,750', '+41', '0'],
        best: 0,
        verdict: 'the finishing pass; optimal 20 of 20 at n = 16',
      },
      {
        method: '2-opt from a random tour',
        values: ['16.766 (1.177)', '2,223,069', '2,334', '0'],
        verdict: 'twenty times the swaps, a worse local optimum',
      },
      {
        method: 'random tour (the other start)',
        values: ['203.411 (14.276)', '0', '0', '18,278'],
        verdict: 'what 2-opt rescues',
      },
    ],
    source:
      'python solutions/two_opt_edge_uncrossing_swaps.py prints this table and asserts: Held-Karp equal to brute force at n = 9; every tour a permutation; every tour at least the exact optimum on twenty instances at n = 16; 2-opt no longer than its start and Or-opt no longer than 2-opt; zero crossings at every full-neighborhood local optimum from n = 16 to 1,600 and positive counts on the starting tours; every accepted delta negative and the deltas summing to the change in length; neighbor lists spending fewer lookups than the full scan; a random tour more than five times the 2-opt length; and the mean 2-opt gap under 10% and below the nearest-neighbor gap.',
  },

  figure: (
    <Figure
      id="fig-two-opt-uncrossing"
      aspect="16 / 7"
      caption="Left: two crossing tour edges (a, b) and (c, d) meet at X. Reconnecting as (a, c) and (b, d) reverses the path between b and c, and by the triangle inequality |ac| < |aX| + |Xc| and |bd| < |bX| + |Xd|, so the new pair is strictly shorter than the old: every crossing is an improving 2-opt move, and a 2-opt local optimum has none. Right: mean gap over the exact Held-Karp optimum on twenty random instances with n = 16, with the number of instances solved exactly."
      cite={{
        text: 'G. A. Croes, "A Method for Solving Traveling-Salesman Problems," Operations Research 6(6), 1958. M. M. Flood, "The Traveling-Salesman Problem," Operations Research 4(1), 1956. D. S. Johnson and L. A. McGeoch, "The Traveling Salesman Problem: A Case Study in Local Optimization," in Local Search in Combinatorial Optimization, Wiley, 1997.',
        href: 'https://doi.org/10.1287/opre.6.6.791',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="Two crossing tour edges and their uncrossed replacement, beside a bar chart of exact gaps over the optimum for four methods on sixteen-city instances">
        {(() => {
          const a = [40, 60];
          const b = [250, 220];
          const c = [250, 60];
          const d = [40, 220];
          const x = [145, 140];
          const bars = [['nearest neighbor', 14.98, '1 of 20', '#9aa5bd'], ['random', 4.12, '8 of 20', '#5da2ff'], ['NN', 1.85, '13 of 20', '#5da2ff'], ['2-opt then Or-opt', 0.0, '20 of 20', '#62d98a']];
          const bx = 360;
          const by = 220;
          const hgt = (v) => (v / 16) * 160;
          return (
            <g fontFamily="ui-monospace, monospace">
              <text x="40" y="30" fill="#9aa5bd" fontSize="10">before: edges (a, b) and (c, d) cross at X</text>
              <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#e2606c" strokeWidth="2" />
              <line x1={c[0]} y1={c[1]} x2={d[0]} y2={d[1]} stroke="#e2606c" strokeWidth="2" />
              <line x1={a[0]} y1={a[1]} x2={c[0]} y2={c[1]} stroke="#f0b94b" strokeWidth="2" strokeDasharray="5 4" />
              <line x1={b[0]} y1={b[1]} x2={d[0]} y2={d[1]} stroke="#f0b94b" strokeWidth="2" strokeDasharray="5 4" />
              <path d={`M ${a[0]} ${a[1]} C 0 140, 0 140, ${d[0]} ${d[1]}`} stroke="#5da2ff" strokeWidth="1.5" fill="none" strokeOpacity="0.6" />
              <path d={`M ${c[0]} ${c[1]} C 300 140, 300 140, ${b[0]} ${b[1]}`} stroke="#5da2ff" strokeWidth="1.5" fill="none" strokeOpacity="0.6" />
              {[a, b, c, d].map((p, i) => (
                <circle key={i} cx={p[0]} cy={p[1]} r="4" fill="#e9edf6" />
              ))}
              <circle cx={x[0]} cy={x[1]} r="3" fill="#e2606c" />
              <text x={a[0] - 14} y={a[1] - 8} fill="#e9edf6" fontSize="11">a</text>
              <text x={b[0] + 8} y={b[1] + 4} fill="#e9edf6" fontSize="11">b</text>
              <text x={c[0] + 8} y={c[1] - 4} fill="#e9edf6" fontSize="11">c</text>
              <text x={d[0] - 14} y={d[1] + 12} fill="#e9edf6" fontSize="11">d</text>
              <text x={x[0] + 6} y={x[1] - 6} fill="#e2606c" fontSize="10">X</text>
              <text x="40" y="250" fill="#e2606c" fontSize="10">red: removed, |ab| + |cd| = (|aX| + |Xb|) + (|cX| + |Xd|)</text>
              <text x="40" y="264" fill="#f0b94b" fontSize="10">amber: shorter pair; reverse b..c</text>
              <text x={bx} y="30" fill="#9aa5bd" fontSize="10">gap over the exact optimum, n = 16, 20 instances</text>
              {bars.map(([name, v, hits, col], i) => (
                <g key={name}>
                  <rect x={bx + i * 66} y={by - Math.max(hgt(v), 2)} width="50" height={Math.max(hgt(v), 2)} fill={col} fillOpacity="0.85" />
                  <text x={bx + i * 66} y={by - Math.max(hgt(v), 2) - 6} fill={col} fontSize="10">{v.toFixed(2)}%</text>
                  <text x={bx + i * 66} y={by + 12} fill="#9aa5bd" fontSize="7">{name}</text>
                  <text x={bx + i * 66} y={by + 24} fill="#9aa5bd" fontSize="7">optimal {hits}</text>
                </g>
              ))}
              <text x={bx} y="258" fill="#9aa5bd" fontSize="10">worst cases: 41.6%, 17.9%, 8.31%, 0.00%</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'two_opt_edge_uncrossing_swaps.py',
  Viz: TwoOptViz,
  narration,
};
