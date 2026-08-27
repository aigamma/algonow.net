import BinarySearchViz from '../viz/BinarySearchViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/binary_search_halving.py?raw';
import { narration } from './binary-search-halving.narration.js';

export const content = {
  given:
    'A sorted array of n keys and a target.',
  task: 'Return the target’s position, or the exact place it would go, in logarithmic time.',
  constraint:
    'The array is all you have: no index, no hash, no promise about how the keys are distributed. And correctness must survive the edges: empty arrays, duplicates, absent targets, and the two-element case that has been trapping professionals since 1946.',

  origins: (
    <p>
      Binary search was first described in print by John Mauchly in the{' '}
      <strong>1946</strong> Moore School Lectures, the founding course of
      computing itself. Knuth&apos;s history then delivers the famous
      indictment: the first published version that worked for{' '}
      <strong>every</strong> n, not just lucky sizes, appeared only in{' '}
      <strong>1962</strong>: sixteen years for a correct loop. Jon Bentley
      later asked professional programmers to write it and watched{' '}
      <strong>ninety percent fail</strong>; in 2006 Joshua Bloch reported
      that Java&apos;s own <code>binarySearch</code> had carried an overflow
      bug for nine years. This unit treats that history as data: the
      invariant is the algorithm, and everything famous that broke, broke
      by leaving it.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>bracket</strong>: a half-open interval [lo, hi) that
      provably contains the answer, an invariant restored after every
      probe. The loop does nothing but shrink the bracket until it closes,
      and every notorious bug is a violated clause: <code>lo = mid</code>{' '}
      without the +1 stops shrinking it (spins forever on two elements,
      pinned in the tested solution), inclusive-vs-exclusive confusion
      breaks the containment, and the overflow bug corrupted the midpoint
      itself. Write the invariant and the code writes itself; skip it and
      join the sixteen-year club.
    </p>
  ),
  heurRole: (
    <p>
      Decides <strong>where to probe</strong>, and the midpoint is a
      minimax argument: whichever way the comparison answers, the bracket
      halves, so <strong>⌈log₂ n⌉ + 1 probes suffice on any input
      whatsoever</strong>, asserted below as a maximum over ten thousand
      lookups, not an average. The slot accepts other bets: probe where
      the value <em>should</em> be (interpolation: brilliant on uniform
      keys, punished by skew) or probe by doubling from a cursor
      (exponential search: pay log of the distance, not of the array). One
      invariant, three probe policies: the whole family in one loop.
    </p>
  ),

  picture: (
    <p>
      The number-guessing game, played three ways. The midpoint player asks
      &quot;is it above 500,000?&quot; and is guaranteed the answer in
      twenty questions, no matter how the numbers were chosen or how the
      opponent squirms. The interpolation player reasons &quot;you said
      about 700 thousand-ish, so I&apos;ll guess near 700,000&quot;:
      five questions when the numbers are spread evenly, punished brutally
      when they bunch. The galloping player, told the answer is near the
      last one, probes 1, 2, 4, 8 steps out and pays for the hop, not the
      haystack. Same game, same referee, three theories of where to point.
    </p>
  ),

  steps: [
    <>
      <strong>Bracket:</strong> lo = 0, hi = n. The claim, forever: the
      answer&apos;s index lies in [lo, hi).
    </>,
    <>
      <strong>Probe the midpoint:</strong> mid = (lo + hi) / 2, rounded
      down (in fixed-width languages, written overflow-safely).
    </>,
    <>
      <strong>Shrink, keeping the claim true:</strong> if a[mid] &lt;
      target, lo = mid + 1; otherwise hi = mid. The +1 is what makes
      progress provable.
    </>,
    <>
      <strong>Stop</strong> when lo = hi: the bracket has closed on the
      answer, present or not: this is the insertion point.
    </>,
    <>
      <strong>Generalize:</strong> nothing used the array but
      monotonicity. Binary search over answers (&quot;is x feasible?&quot;)
      is the same loop, and half of competitive programming.
    </>,
  ],

  signals: [
    <>
      Sorted data, random access, and <strong>no distribution promise</strong>:
      the flat row in the contest (20.0 / 19.9 / 20.0) is what
      &quot;guarantee&quot; looks like.
    </>,
    <>
      The predicate is <strong>monotone</strong>, even when there is no
      array at all: thresholds, capacities, feasibility: bisection is this
      unit wearing other clothes.
    </>,
    <>
      Lookups are cold and scattered; for hot nearby lookups the doubling
      variant, and for range scans a B-tree, take over.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the linear scan: <strong>~n/2 probes</strong>{' '}
      (4,867 measured at n = 10⁴, half a million at 10⁶). The gap to twenty
      is the logarithm&apos;s entire sales pitch, and it needed no
      preprocessing beyond the sort the problem already gave us.
    </>
  ),

  strength: (
    <>
      <strong>A guarantee with no fine print.</strong> ⌈log₂ n⌉ + 1 probes
      maximum, on adversarial keys, absent targets, and duplicates alike:
      the contest&apos;s binary row does not move (20.0 / 19.9 / 20.0)
      while every rival&apos;s row swings. And the invariant generalizes
      past arrays to any monotone question.
    </>
  ),
  weakness: (
    <>
      <strong>It ignores everything but order.</strong> Value information
      is left on the table (interpolation reads it and wins 4× on uniform
      keys); locality is left on the table (doubling from a cursor wins 2×
      on nearby targets); and the jumps are cache-hostile at scale, which
      is why databases wrap the same idea in B-tree nodes. The famous
      fragility is real too: sixteen years, ninety percent, nine years in
      Java.
    </>
  ),

  problem: 'Search in a sorted array',
  problemSlug: 'sorted-array-search',
  rivals: [
    {
      name: 'Binary × midpoint',
      isThisUnit: true,
      algoName: 'Binary search',
      cost: '⌈log₂ n⌉ + 1, worst case',
      wins: (
        <>
          The flat row: <strong>20.0 / 19.9 / 20.0</strong> average probes
          across uniform, skewed, and local workloads. The minimax choice
          buys indifference to the input.
        </>
      ),
      costs: (
        <>
          Reads nothing but order: on friendly inputs both rivals beat it,
          and its scattered jumps miss caches at scale.
        </>
      ),
      when: 'The default: unknown distributions, adversarial inputs, and every monotone predicate.',
    },
    {
      name: 'Interpolation × value estimate',
      algoName: 'Interpolation search',
      cost: 'O(log log n) uniform, O(n) worst',
      wins: (
        <>
          Reads the values: <strong>4.9</strong> average probes on a
          million uniform keys, log log n in the flesh, four times under
          binary.
        </>
      ),
      costs: (
        <>
          The estimate is a bet on uniformity: on cubic-skewed keys it
          creeps at <strong>250.0</strong> average probes, twelve times
          worse than the method it meant to beat.
        </>
      ),
      when: 'Keys you know to be near-uniform: dense ids, timestamps, hash values.',
    },
    {
      name: 'Exponential × doubling',
      algoName: 'Exponential search',
      cost: 'O(log Δ) from a cursor',
      wins: (
        <>
          Pays for the hop, not the haystack: <strong>9.5</strong> average
          probes on near-cursor targets, and it works on unbounded or
          stream-fed arrays with no n in hand.
        </>
      ),
      costs: (
        <>
          From a cold start it doubles all the way up: <strong>37.9</strong>{' '}
          probes, twice binary, the price of not knowing where to begin.
        </>
      ),
      when: 'Merge joins, gallops, and any access pattern that lands near the last answer.',
    },
    {
      name: 'Linear search',
      cost: 'O(n), or O(Δ) from a cursor',
      wins: (
        <>
          From a cursor on truly nearby targets it is honest competition:{' '}
          <strong>25.4</strong> average probes against the gallop&apos;s
          9.5, with perfect cache behavior and unbeatable simplicity.
        </>
      ),
      costs: (
        <>
          Anywhere else it is the n/2 baseline: half a million probes per
          lookup at this size.
        </>
      ),
      when: 'Tiny arrays, hot caches, and hops so small the doubling machinery costs more than it saves.',
    },
  ],
  neverUse: {
    name: 'Binary search written casually, from memory',
    why: (
      <>
        The method you must never ship is this unit&apos;s own loop,
        composed without its invariant. The record: sixteen years from
        first publication to the first generally correct version;{' '}
        <strong>ninety percent</strong> of professional programmers failing
        Bentley&apos;s exercise; a nine-year overflow bug in Java&apos;s
        standard library. The tested solution keeps a museum piece
        (<code>lo = mid</code> without the +1) and demonstrates it spinning
        forever on a two-element array. Write the bracket down first, or
        use the library call, which exists because of everything above.
      </>
    ),
  },

  contest: {
    instance:
      'one million sorted keys, 10,000 lookups per cell, average probes; three workloads: uniform random keys, cubic-skewed keys (value no longer tracks position), and targets landing within 50 positions of the previous hit',
    columns: ['uniform keys', 'cubic skew', 'near cursor'],
    rows: [
      {
        method: 'Binary × midpoint',
        isThisUnit: true,
        values: ['20.0', '19.9', '20.0'],
        best: 1,
        verdict: 'the row that does not move: minimax means no bad inputs',
      },
      {
        method: 'Interpolation × estimate',
        values: ['4.9', '250.0', '4.9'],
        best: 0,
        verdict: 'log log n on its home turf, 12× worse the moment skew appears',
      },
      {
        method: 'Exponential × doubling',
        values: ['37.9', '37.8', '9.5'],
        best: 2,
        verdict: 'pays log of the hop: cold starts cost double, locality wins double',
      },
      {
        method: 'Linear scan from cursor',
        values: ['~n/2', '~n/2', '25.4'],
        verdict: 'the baseline everywhere except a genuinely tiny hop',
      },
    ],
    source:
      'python solutions/binary_search_halving.py prints this table and asserts 100,000-case agreement with CPython’s bisect across duplicates, absences, and empty arrays; the minimax bound as a maximum over all 10,000 binary lookups; interpolation at least 3× under binary on uniform keys and at least 2× over it on skew; the gallop within its log-of-the-hop bound; and the 1946 museum piece (lo = mid without +1) spinning forever on [1, 3].',
  },

  figure: (
    <Figure
      id="fig-binary-invariant"
      aspect="16 / 7"
      caption="The invariant is the algorithm. The claim [lo, hi) contains the answer is restored after every probe: a[mid] < target discards mid itself (lo = mid + 1), anything else keeps mid as a candidate (hi = mid). Both famous failures are clause violations: dropping the +1 stops the bracket from shrinking, and on two elements the loop spins forever; computing the midpoint as (lo+hi)/2 in fixed-width arithmetic overflowed Java's library for nine years."
      cite={{
        text: 'Bentley, "Programming Pearls: Writing Correct Programs", CACM 26(12), 1983 (the ninety-percent study). The 1946-to-1962 history is Knuth, TAOCP volume 3, §6.2.1; the library overflow is Bloch, 2006.',
        href: 'https://doi.org/10.1145/358476.358484',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="A bracketed array halving over three probes, and below it the broken variant stuck on a two-element array">
        {[0, 1, 2].map((row) => {
          const lo = [0, 8, 8][row];
          const hi = [16, 16, 12][row];
          const mid = [8, 12, 10][row];
          return (
            <g key={row}>
              {Array.from({ length: 16 }, (_, i) => (
                <rect
                  key={i}
                  x={40 + i * 32}
                  y={30 + row * 52}
                  width={28}
                  height={22}
                  rx={3}
                  fill={i >= lo && i < hi ? 'rgba(93,162,255,0.2)' : 'rgba(255,255,255,0.04)'}
                  stroke={i === mid ? '#f0b94b' : '#2b3650'}
                  strokeWidth={i === mid ? 2 : 1}
                />
              ))}
              <text x={556} y={46 + row * 52} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">
                {['probe 1', 'probe 2', 'probe 3'][row]}
              </text>
            </g>
          );
        })}
        <text x="40" y="200" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="12">the bracket halves whatever the answer says · ⌈log₂ n⌉ + 1 maximum</text>
        <g>
          <rect x={40} y={222} width={28} height={22} rx={3} fill="rgba(224,103,103,0.2)" stroke="#e06767" strokeWidth="1.6" />
          <rect x={72} y={222} width={28} height={22} rx={3} fill="rgba(224,103,103,0.2)" stroke="#e06767" strokeWidth="1.6" />
          <text x={54} y={237} textAnchor="middle" fill="#e06767" fontFamily="ui-monospace, monospace" fontSize="11">1</text>
          <text x={86} y={237} textAnchor="middle" fill="#e06767" fontFamily="ui-monospace, monospace" fontSize="11">3</text>
          <text x={116} y={238} fill="#e06767" fontFamily="ui-monospace, monospace" fontSize="12">seek 3 with lo = mid: mid = 0, lo stays 0, forever</text>
        </g>
        <text x="40" y="276" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">1946 first publication · 1962 first generally correct version · 2006 the library overflow</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'binary_search_halving.py',
  Viz: BinarySearchViz,
  narration,
};
