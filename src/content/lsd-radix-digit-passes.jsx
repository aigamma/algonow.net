import RadixViz from '../viz/RadixViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/lsd_radix_digit_passes.py?raw';
import { narration } from './lsd-radix-digit-passes.narration.js';

export const content = {
  given:
    'Two hundred thousand fixed-width keys to sort, and a mathematical wall: any sort that learns order by asking "is a < b?" must ask at least log2(n!) times: 3,233,399 questions at this size. The referee on this page asked 3,257,989. The wall is real.',
  task: 'Never ask. Read the keys digit by digit, least significant first: each pass distributes all n keys into buckets by one digit and gathers them back in bucket order, and each pass must be stable so it inherits the order the earlier passes built.',
  constraint:
    'The referee is sorted() itself: exact on 400 randomized cases and every instance, with stability verified id-by-id on 30,000 tagged records. The 32-bit contest lands at 2.0× under the comparison bill and the 8-bit one at 5.9×; the honest row concedes wide keys at small n (2.1× against); the linear-vs-linearithmic split is measured on a doubling; and the load-bearing heuristic is sabotaged on purpose: unstable passes broke 200 of 200 arrays.',

  origins: (
    <p>
      Older than the computer. Herman Hollerith&apos;s tabulating
      machines processed the <strong>1890 United States
      census</strong> on punched cards, and card sorters worked
      exactly this way: run every card through on the least
      significant column, stack the pockets in order, repeat one
      column left: clerks executed stable digit passes for
      seventy years before software did. Harold Seward&apos;s
      1954 MIT thesis formalized counting sort and the radix
      composition for electronic machines, and Knuth&apos;s
      Volume 3 preserved the card-room lineage. The pattern
      never left: GPU sorting libraries are radix underneath
      (comparisons branch; digit passes stream), columnar
      database engines radix-partition their joins, and this
      site&apos;s own suffix-array unit rebuilds ranks with
      radix-style passes. Wherever keys are fixed-width and n is
      huge, the century-old card trick is still the fastest
      thing in the room.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>pass structure</strong>: for a 32-bit key
      at byte-wide digits, four rounds of
      distribute-and-gather, each touching every key exactly
      twice (one digit read, one placement) plus its bucket
      walk: 1,601,024 units of work at n = 200,000 where the
      comparison referee spent 3,257,989 comparisons. No
      comparison happens anywhere: the lower bound that binds
      every rival on this bench simply does not apply. Checked
      against sorted() on 400 randomized cases, every contest
      instance, and a doubling experiment that measured the
      split: radix work scaled 2.00×, comparisons 2.12×.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>invariant that makes passes
      compose</strong>: every pass is stable: keys with equal
      digits keep their arrival order. That is the entire
      mechanism: after pass k the array is sorted by its k
      lowest digits, <em>because</em> pass k sorted by digit k
      while stability preserved the order passes 1..k-1 had
      already built. This page removed it on purpose: the same
      code with unstable buckets broke <strong>200 of 200</strong>{' '}
      multi-digit arrays. Stability also rides through to
      records: 30,000 tagged duplicates emerged in exactly
      sorted()&apos;s stable order. And the digit width is a
      measured dial: 16-bit digits win at n = 200,000 (931,072
      work) and lose at n = 2,000 (histograms dominate).
    </p>
  ),

  picture: (
    <p>
      The 1890 census room. A clerk sorts a mountain of punched
      cards by a three-digit district number using a machine
      with ten pockets. First run: every card drops into the
      pocket of its <em>last</em> digit; restack pockets 0
      through 9. Second run: middle digit; restack. Third run:
      first digit; restack: and the mountain is in perfect
      order. The whole trick lives in one rule the clerk never
      thinks about: each pocket keeps cards in the order they
      arrived. After the last-digit run, cards agreeing on their
      later digits already sit in the right relative order, and
      every subsequent run <em>preserves</em> that inside its
      pockets while fixing one more digit. Break the rule:
      shuffle a pocket before restacking: and the mountain comes
      out wrong, every time (this page counted: 200 of 200). The
      clerk never compared two cards. The machine never asked a
      question. The order was assembled, not discovered.
    </p>
  ),

  steps: [
    <>
      <strong>Bucket by the lowest digit:</strong> one read, one
      placement per key: n keys into base-many buckets.
    </>,
    <>
      <strong>Gather stably:</strong> concatenate buckets 0..base-1,
      arrival order intact within each: the invariant everything
      rests on.
    </>,
    <>
      <strong>Repeat one digit up:</strong> after pass k the
      array is sorted by its k lowest digits: asserted at every
      pass in the visualization&apos;s model.
    </>,
    <>
      <strong>Stop at the width:</strong> four byte passes cover
      32 bits: 1,601,024 work units against the referee&apos;s
      3,257,989 comparisons.
    </>,
    <>
      <strong>Size the digit:</strong> the dial is measured:
      wider digits amortize passes at large n and drown small
      arrays in histogram cost.
    </>,
  ],

  signals: [
    <>
      <strong>Fixed-width keys, huge n:</strong> integers, IDs,
      IP addresses, timestamps, normalized floats: the regime
      where 2.0×-5.9× under the comparison bill is free money.
    </>,
    <>
      <strong>The bound is your bottleneck:</strong> when
      profiling shows comparison cost itself (branchy,
      cache-hostile), the sort that never compares streams
      sequentially: why GPUs sort this way.
    </>,
    <>
      <strong>Stability is wanted anyway:</strong> radix is
      stable by construction: multi-key sorts compose by
      sorting the minor key first, exactly like the passes
      themselves.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the <strong>comparison
      referee</strong> (Python&apos;s sorted, Timsort
      underneath): general over any comparator, adaptive to
      preexisting runs, and utterly unbothered by key width:
      which is the row it wins: at 64-bit keys and n = 1,000,
      eight radix passes cost 18,048 against 8,641 comparisons.
      Radix pays per digit <em>regardless of n</em>; comparisons
      pay per log n regardless of width. The crossover is the
      whole choosing lesson.
    </>
  ),

  strength: (
    <>
      <strong>Under the wall, with the referee&apos;s
      receipts.</strong> The comparison lower bound of 3,233,399
      binds every question-asking sort at this size (the referee
      duly spent 3,257,989); radix asked nothing and spent
      1,601,024 work units: 2.0× under on 32-bit keys, 5.9× on
      8-bit. Exactness held on 400 randomized cases; stability
      held id-by-id on 30,000 tagged records; and the doubling
      experiment showed the asymptotic split as a measurement:
      2.00× versus 2.12×.
    </>
  ),
  weakness: (
    <>
      <strong>Pays by the digit, needs the digits, and lives on
      one invariant.</strong> Wide keys at small n lose honestly
      (2.1× against, measured): w passes cost w·n whether n is
      huge or tiny. The keys must expose digits: arbitrary
      comparators, custom orderings, and objects without a
      radix-friendly encoding push you back to comparison
      territory (floats and signed ints need bit tricks first).
      It buys no adaptivity: an already-sorted array still pays
      every pass, where Timsort pays ~n. Space is O(n + base)
      for buckets and histograms. And the whole construction
      stands on pass stability: sabotaged here, 200 of 200
      arrays came out wrong.
    </>
  ),

  problem: 'Integer sorting',
  problemSlug: 'integer-sorting',
  rivals: [
    {
      name: 'LSD radix × stable passes',
      isThisUnit: true,
      algoName: 'LSD radix sort',
      cost: 'O(w·n), zero comparisons',
      wins: (
        <>
          <strong>Under the comparison wall</strong>: 2.0×-5.9×
          measured, stable by construction, streams beautifully:
          the GPU and card-room champion.
        </>
      ),
      costs: (
        <>
          Pays per digit regardless of n, needs digit-exposing
          keys, and collapses without pass stability (200/200).
        </>
      ),
      when: 'Fixed-width keys in bulk: IDs, addresses, timestamps at scale.',
    },
    {
      name: 'Counting sort',
      cost: 'O(n + universe)',
      wins: (
        <>
          The single-pass foundation: one histogram, one stable
          scatter: unbeatable when keys live in a small universe
          (5.9× on this page&apos;s 8-bit row is one of these).
        </>
      ),
      costs: (
        <>
          The universe is the bill: 32-bit keys would want a
          four-billion-slot histogram: which is exactly why radix
          runs it per digit instead.
        </>
      ),
      when: 'Small key universes outright: grades, bytes, bounded categories.',
    },
    {
      name: 'MSD radix sort',
      cost: 'O(w·n) worst case',
      wins: (
        <>
          The sibling that starts from the top digit: buckets
          recurse independently, finish early on distinguishing
          prefixes, and handle variable-length keys: the string
          sorter (burstsort country).
        </>
      ),
      costs: (
        <>
          Recursion state and small-bucket overhead where LSD
          just streams; loses LSD&apos;s single-pipeline shape.
        </>
      ),
      when: 'Strings and variable-length keys, or when prefixes distinguish early.',
    },
    {
      name: 'Timsort',
      cost: 'O(n log n), adaptive',
      wins: (
        <>
          The live unit and the comparison champion: any
          comparator, any object, ~n on already-sorted data, and
          the 64-bit small-n row on this page (2.1× over radix).
        </>
      ),
      costs: (
        <>
          Bound by log2(n!) forever: 3,257,989 comparisons where
          radix spent 1,601,024 work units asking nothing.
        </>
      ),
      when: 'General keys, custom orderings, or data with history: the sensible default.',
    },
  ],
  neverUse: {
    name: 'Radix with unstable inner passes',
    why: (
      <>
        The subtle version of forgetting the heuristic: swap the
        stable bucket gather for anything order-mangling: a
        parallel scatter without tie discipline, an in-place
        shuffle, a &quot;faster&quot; unstable partition per
        digit: and the algorithm does not degrade, it{' '}
        <strong>breaks</strong>. Measured here by sabotage:
        reversing within buckets broke <strong>200 of 200</strong>{' '}
        multi-digit arrays, because pass k&apos;s correctness{' '}
        <em>is</em> the preservation of passes 1..k-1, and only
        stability preserves them. This ships in real code as a
        parallelized radix whose per-bucket writes race, passing
        single-digit tests (one pass needs no history) and
        corrupting multi-digit sorts in production. The stable
        gather is not a implementation nicety. It is the theorem.
      </>
    ),
  },

  contest: {
    instance:
      'sorting 200,000 keys; currencies stated per method: comparisons for the comparison referee (counted via a wrapped key class), element touches + bucket slots for radix',
    columns: ['sorted() comparisons', 'radix work'],
    rows: [
      {
        method: '32-bit keys, n = 200,000',
        isThisUnit: true,
        values: ['3,257,989', '1,601,024'],
        best: 1,
        verdict: 'four stable passes, 2.0× under the bill: and the referee sits just above the log2(n!) = 3,233,399 wall',
      },
      {
        method: '8-bit keys, n = 200,000',
        values: ['2,374,012', '400,256'],
        best: 1,
        verdict: 'one pass: 5.9×: narrow keys are radix country',
      },
      {
        method: '64-bit keys, n = 1,000',
        values: ['8,641', '18,048'],
        best: 0,
        verdict: 'the honest row: eight passes regardless of n: comparisons win 2.1×',
      },
    ],
    source:
      'python solutions/lsd_radix_digit_passes.py prints this table and asserts: radix equal to sorted() on 400 randomized cases and every instance, with stability exact on 30,000 tagged records; unstable inner passes wrong on 200 of 200 arrays (the sabotage oracle); the doubling experiment scaling radix work 2.00× and referee comparisons 2.12×; the digit-width dial measured in both regimes (16-bit digits winning at n = 200,000, losing at n = 2,000); and every contest ordering above.',
  },

  figure: (
    <Figure
      id="fig-radix-passes"
      aspect="16 / 7"
      caption="Order assembled, never discovered. Each pass buckets all keys by one digit, least significant first, and gathers the buckets stably: equal digits keep arrival order, so pass k fixes digit k while preserving everything passes 1..k-1 built. After the last pass the keys are sorted and no comparison ever happened: 1,601,024 work units against the referee's 3,257,989 comparisons at n = 200,000, with the log2(n!) = 3,233,399 lower bound binding every comparison sort and not this one. Sabotaging stability broke 200 of 200 arrays: the invariant is the algorithm."
      cite={{
        text: 'Card-sorter lineage: Hollerith tabulators, 1890 census; formalized in H. H. Seward\'s 1954 MIT thesis; documented in D. E. Knuth, The Art of Computer Programming, Vol. 3, §5.2.5.',
        href: 'https://www-cs-faculty.stanford.edu/~knuth/taocp.html',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="Three stable digit passes sorting three-digit numbers, with the comparison lower bound shown as a wall radix walks under">
        <text x="30" y="28" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">pass 1 · ones digit</text>
        <text x="240" y="28" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">pass 2 · tens digit</text>
        <text x="450" y="28" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">pass 3 · hundreds digit</text>
        {[['329', '457', '657', '839', '436', '720', '355'],
          ['720', '355', '436', '457', '657', '329', '839'],
          ['720', '329', '436', '839', '355', '457', '657']].map((col, ci) => (
          col.map((v, ri) => (
            <text
              key={`${ci}-${ri}`}
              x={ci === 0 ? 30 : ci === 1 ? 240 : 450}
              y={44 + ri * 17}
              fill="#e9edf6"
              fontFamily="ui-monospace, monospace"
              fontSize="12"
              opacity="0.9"
            >{v}</text>
          ))
        ))}
        {[['329', 0], ['355', 1], ['436', 2], ['457', 3], ['657', 4], ['720', 5], ['839', 6]].map(([v, ri]) => (
          <text key={String(v)} x={560} y={44 + ri * 17} fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="12">{v}</text>
        ))}
        <text x="560" y="28" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="10">sorted</text>
        <path d="M 150 110 h 60 M 360 110 h 60 M 530 110 h 20" stroke="#f0b94b" strokeWidth="1.4" />
        <text x="30" y="188" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">the invariant: after pass k, sorted by the k lowest digits: equal digits keep arrival order (stability)</text>
        <text x="30" y="212" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">sabotage: shuffle inside one bucket and 200 of 200 arrays come out wrong: the invariant IS the algorithm</text>
        <line x1="30" y1="232" x2="610" y2="232" stroke="rgba(226,96,108,0.5)" strokeWidth="1.4" strokeDasharray="6 4" />
        <text x="30" y="250" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">the wall: log2(n!) = 3,233,399 comparisons binds every comparison sort (referee paid 3,257,989)</text>
        <text x="30" y="272" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">radix walked under it: 1,601,024 work units, zero comparisons: 2.0× at 32 bits, 5.9× at 8 bits</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'lsd_radix_digit_passes.py',
  Viz: RadixViz,
  narration,
};
