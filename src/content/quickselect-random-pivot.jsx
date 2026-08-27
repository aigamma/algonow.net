import QuickselectViz from '../viz/QuickselectViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/quickselect_random_pivot.py?raw';
import { narration } from './quickselect-random-pivot.narration.js';

export const content = {
  given:
    'n unordered items and a rank k.',
  task: 'The k-th smallest, in expected linear time, without sorting.',
  constraint:
    'Inputs are allowed to be hostile. This page does not merely worry about adversaries: it builds the killer input for the deterministic pivot rule with McIlroy’s gas adversary, replays it to certified quadratic cost, then feeds the same array to the lottery.',

  origins: (
    <p>
      Tony Hoare published FIND in <strong>1961</strong> as Algorithm 65,
      the companion to quicksort&apos;s Algorithm 64: partition, but
      recurse into one side only. In <strong>1973</strong>, Blum, Floyd,
      Pratt, Rivest, and Tarjan (five names that would each alone anchor
      a career) proved selection needs no luck at all: median of medians,
      worst-case linear. Floyd and Rivest shaved the constants in 1975 by
      two-pivot sampling. And in <strong>1999</strong> Doug McIlroy
      closed the loop from the dark side: a &quot;killer adversary&quot;
      that manufactures a quadratic input for <em>any</em> quicksort or
      quickselect whose pivot choices it can watch: the construction this
      page runs live.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>partition-and-discard skeleton</strong>. Pick a
      pivot, three-way partition into less, equal, greater, and note
      where rank k falls: only one side can hold it, so the other is
      discarded <em>unexamined</em>. If each pivot lands anywhere
      reasonable, the survivor shrinks geometrically and the passes sum
      to a constant times n: quicksort&apos;s idea, minus the half of the
      work selection never needed.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>unpredictability</strong>. A pivot drawn
      uniformly at random makes the geometric shrink a theorem in
      expectation for <em>every</em> input, because an adversary cannot
      aim at a coin it has not seen: measured here as{' '}
      <strong>4.54n</strong> comparisons on the very array that drives
      median-of-three to 1.5 million. On friendly data the lottery costs
      about 5.2n with this three-way partition (the classic 3.39n
      constant times the ~1.5 comparisons per element that duplicate
      immunity buys), and no input moves it.
    </p>
  ),

  picture: (
    <p>
      A rigged tournament. If the bracket seeding is fixed and published,
      a bookmaker can arrange the entrants so every round eliminates
      almost nobody: the tournament that should take log rounds runs for
      n of them. That is exactly what the gas adversary does to a fixed
      pivot rule: it watches which entrant the rule will crown, and
      arranges for that entrant to be a nobody. Seed the bracket by coin
      flip and the bookmaker has nothing to aim at: no fixture list
      exists until the coins are flipped, and half the field, in
      expectation, goes home every round.
    </p>
  ),

  steps: [
    <>
      <strong>Draw</strong> a pivot index uniformly from the live range.
    </>,
    <>
      <strong>Three-way partition</strong> around its value: less |
      equal | greater, in place (the Dutch flag pass: duplicates land in
      the equal zone instead of recursing forever).
    </>,
    <>
      <strong>Locate k:</strong> inside the equal zone means done: the
      pivot value is the answer.
    </>,
    <>
      <strong>Discard</strong> the side that cannot hold rank k, without
      reading it again; adjust k if the greater side survives.
    </>,
    <>
      <strong>Repeat</strong> on the survivor: expected passes are
      geometric, expected total ~5.2n comparisons, measured.
    </>,
  ],

  signals: [
    <>
      <strong>One rank, not an ordering:</strong> a median, a p99, a
      cutoff for the top decile: sorting answers questions nobody asked
      at triple the price.
    </>,
    <>
      <strong>Data in memory and mutable:</strong> the partition works in
      place; streams and read-only data want the heap specialist
      instead.
    </>,
    <>
      <strong>Inputs you do not control:</strong> user-supplied,
      duplicate-heavy, or adversarial: the lottery and the three-way
      partition make both immunities measurable.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>median-of-three quickselect</strong>
      : on random data it is genuinely the better constant (4.36n against
      the lottery&apos;s 5.2n average, measured: sampling three beats
      sampling one). The page&apos;s whole argument is what that saving
      costs: a fixed, watchable rule is a target, and the built killer
      sends it to 1,503,501 comparisons at n = 2,000 while the lottery
      shrugs at 4.54n. Cheaper on Tuesday, quadratic under fire.
    </>
  ),

  strength: (
    <>
      <strong>Expected linear against every input, in place, simple.</strong>{' '}
      No input exists that raises the expectation: the adversary needs to
      predict coins. The all-equal storm costs 2.00n flat (three-way
      partition, measured), the killer costs 4.54n, random data 5.2n:
      the numbers barely move because there is nothing to aim at. This
      is std::nth_element&apos;s engine and the standard tool behind
      medians and percentile cuts.
    </>
  ),
  weakness: (
    <>
      <strong>Expected, not guaranteed, and it needs real randomness.</strong>{' '}
      The 4⁻ᵏ-style tail is one-sided luck: a hard-realtime bound wants
      BFPRT&apos;s 10.0n-that-never-moves (or introselect&apos;s fallback).
      A predictable PRNG quietly reopens the attack: the lottery&apos;s
      immunity is exactly as good as its coins. Data must sit mutable in
      memory. And the three-way partition&apos;s ~1.5× comparison factor
      is a real tax, paid for duplicate immunity.
    </>
  ),

  problem: 'Selection and order statistics',
  problemSlug: 'selection',
  rivals: [
    {
      name: 'Quickselect × random pivot',
      isThisUnit: true,
      algoName: 'Quickselect',
      cost: 'O(n) expected',
      wins: (
        <>
          <strong>4.54n on the killer</strong> that quadratics
          median-of-three; 5.2n average anywhere; 2.00n on all-equal.
          Floyd-Rivest&apos;s two-pivot sampling is the comparison-lean
          refinement of the same lottery.
        </>
      ),
      costs: (
        <>
          Expectation, not guarantee; needs honest coins and mutable
          in-memory data.
        </>
      ),
      when: 'The default for one rank of an in-memory array, especially when inputs are not yours to trust.',
    },
    {
      name: 'Median of medians',
      cost: 'O(n) worst case',
      wins: (
        <>
          The 1973 theorem: <strong>10.0n on the killer, 11.5n on
          random</strong>: the number simply does not move. Introselect
          (std::nth_element&apos;s real algorithm) uses it as the escape
          hatch when a quickselect recursion runs deep.
        </>
      ),
      costs: (
        <>
          Twice the lottery&apos;s constant on friendly data, and real
          implementation weight (groups of five, recursive pivoting).
        </>
      ),
      when: 'Hard-realtime bounds, or as introselect’s safety net: the guarantee you buy when “expected” is not a word your spec allows.',
    },
    {
      name: 'Heapselect × bounded k-heap',
      algoName: 'Heapselect',
      cost: 'O(n log k)',
      wins: (
        <>
          <strong>1.00n measured at k = 10</strong>: a size-k heap
          watches the stream go by, and most elements cost one
          comparison. Works on data that never fits in memory.
        </>
      ),
      costs: (
        <>
          Off its turf at k = n/2: <strong>13.96n</strong>, worse than
          sorting. The log k is invisible only while k is tiny.
        </>
      ),
      when: 'Top-k of a stream or a file too big to load: the specialist exactly where quickselect cannot play.',
    },
    {
      name: 'Timsort (full sort)',
      algoName: 'Timsort',
      cost: 'O(n log n)',
      wins: (
        <>
          15.3n buys <em>every</em> rank at once, stability, and total
          immunity to pivot games (11,266 comparisons on the killer,
          whose structure its run-detection even exploits).
        </>
      ),
      costs: (
        <>
          The log factor is pure waste when one rank was the question:
          triple the lottery&apos;s price for answers nobody asked.
        </>
      ),
      when: 'You need several ranks, the order itself, or the array sorted anyway afterward.',
    },
  ],
  neverUse: {
    name: 'A fixed pivot rule facing chosen inputs',
    why: (
      <>
        Any deterministic rule can be watched, and what can be watched
        can be aimed at: McIlroy&apos;s gas adversary built a killer for
        median-of-three (<strong>1,503,501</strong> comparisons at
        n = 2,000, replayed and certified) and another for the
        first-element rule (<strong>3,003,000</strong>) using nothing but
        the comparisons the code itself asked for. The folklore version,
        first-element pivot on already-sorted input, is the same disease
        in its textbook-Lomuto form. If inputs can be chosen by someone
        else, a fixed rule is not a smaller constant: it is a denial of
        service invitation.
      </>
    ),
  },

  contest: {
    instance:
      'A: n = 100,000 random floats, k = median. B: the n = 2,000 killer permutation the gas adversary built against median-of-three, replayed. Comparisons counted exactly; every answer checked against the sorted referee',
    columns: ['random (cmps/n)', 'the built killer'],
    rows: [
      {
        method: 'Quickselect × random pivot',
        isThisUnit: true,
        values: ['5.2 avg', '9,084 (4.54n)'],
        best: 1,
        verdict: 'nothing to aim at: the numbers barely move',
      },
      {
        method: 'Quickselect × median-of-3',
        values: ['4.36', '1,503,501'],
        verdict: 'cheaper on Tuesday, quadratic under fire',
      },
      {
        method: 'Median of medians',
        values: ['11.51', '20,058 (10.0n)'],
        verdict: 'the guarantee: pay double, fear nothing',
      },
      {
        method: 'Timsort (full sort)',
        values: ['15.29', '11,266'],
        verdict: 'immune, at the price of answering every k',
      },
    ],
    source:
      'python solutions/quickselect_random_pivot.py prints both ledgers plus heapselect’s two faces (1.00n at k=10, 13.96n at k=n/2) and asserts: agreement with the sorted referee across 300 duplicate-heavy trials and both rank edges; the killer is a genuine permutation whose replay certifies ≥ n²/8 comparisons for median-of-three (and a second built killer sends first-element to 3,003,000); the lottery averages ≤ 12n on the killer across ten seeds; BFPRT stays ≤ 60n everywhere; the all-equal storm finishes in 2.00n; and Timsort’s count sits within 10% of n·log₂n.',
  },

  figure: (
    <Figure
      id="fig-gas-adversary"
      aspect="16 / 7"
      caption="Two fates for the same skeleton. Left: a random pivot shrinks the survivor geometrically, and the passes sum to ~5n. Right: McIlroy's gas adversary watches a fixed rule's comparisons, freezes whichever value the rule is about to crown to the smallest unused rank, and the survivor shrinks by a constant instead: n passes, quadratic total. The killer is not found, it is manufactured: and it cannot be manufactured against a coin."
      cite={{
        text: 'Hoare, "Algorithm 65: FIND", CACM 4(7), 1961; Blum-Floyd-Pratt-Rivest-Tarjan 1973 for the deterministic guarantee; the live construction is McIlroy, "A Killer Adversary for Quicksort", Software: Practice & Experience 29(4), 1999.',
        href: 'https://doi.org/10.1145/366622.366647',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="Geometric shrink under a random pivot versus linear shrink under the gas adversary">
        <text x="24" y="30" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="12">the lottery: geometric collapse</text>
        {[300, 150, 75, 38, 19, 10].map((w, i) => (
          <rect key={i} x={24} y={44 + i * 26} width={w * 0.9} height={16} fill="rgba(98,217,138,0.16)" stroke="#62d98a" strokeWidth="1" />
        ))}
        <text x="24" y="216" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="12">n + n/2 + n/4 + … ≈ 2n passes</text>
        <text x="24" y="236" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">measured 5.2n comparisons (3-way partition)</text>
        <line x1="330" y1="24" x2="330" y2="250" stroke="#232c40" strokeWidth="1" />
        <text x="352" y="30" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="12">the gas adversary: starvation</text>
        {[300, 292, 284, 276, 268, 260].map((w, i) => (
          <rect key={i} x={352} y={44 + i * 26} width={w * 0.9} height={16} fill="rgba(226,96,108,0.14)" stroke="#e2606c" strokeWidth="1" />
        ))}
        <text x="352" y="216" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="12">n + (n−2) + (n−4) + … ≈ n²/4</text>
        <text x="352" y="236" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">freeze rule: the watched pivot is always a nobody</text>
        <text x="24" y="272" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="12">the adversary needs to see the rule · a coin shows it nothing</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'quickselect_random_pivot.py',
  Viz: QuickselectViz,
  narration,
};
