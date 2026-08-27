import MajorityVoteViz from '../viz/MajorityVoteViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/boyer_moore_majority_vote.py?raw';
import { narration } from './boyer-moore-majority-vote.narration.js';

export const content = {
  given:
    'A stream of values, read once, in order: too long to store, too wide to tally.',
  task: 'The majority element: the value holding MORE than half the positions: or the news that none exists.',
  constraint:
    'Two words of memory: a candidate and a counter. A dictionary tally holds one key per distinct value (measured: half a million); this method holds two, and the pairing theory that lets it is asserted on every trial.',

  origins: (
    <p>
      Invented in <strong>1980</strong> at SRI by Robert Boyer and J
      Strother Moore: the same pair as the string search, a different
      algorithm: while building their theorem prover, and published
      eleven years later in a festschrift for Woody Bledsoe. The paper
      is a period piece with a punchline: the Fortran was{' '}
      <em>mechanically proved correct</em> by their verification
      system, and the abstract brags about &quot;an efficient use of
      magnetic tape&quot;: one sequential pass, two words of state, a
      constraint that has aged from tape drives into network switches
      and sensor firmware without changing shape.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>one-candidate counter scan</strong>: when the
      counter is zero, adopt the incoming value; on a match, increment;
      on a mismatch, decrement. One pass, constant state, at most two
      comparisons per element. The output is a <em>candidate</em>, not
      an answer: the cheap second pass that recounts it against the
      stream is part of the method, and the gadget below is what
      skipping it costs.
    </p>
  ),
  heurRole: (
    <p>
      Supplies <strong>pairwise cancellation</strong>: every decrement
      pairs one occurrence of the candidate with one non-candidate
      element and discards both. Deleting two <em>different</em> values
      can never change who holds a majority, and a value with more
      than half the positions cannot be paired away: at most n−m pairs
      can each destroy one copy, leaving a surplus of at least 2m−n.
      Measured: the bound held on all 300 adversarial layouts, and the
      alternating gadget hit it <strong>exactly</strong>: final counter
      2m−n = 2, not a copy wasted.
    </p>
  ),

  picture: (
    <p>
      A hall full of partisans, one faction holding a true majority.
      Everyone pairs off with someone from a <em>different</em>{' '}
      faction, and every pair walks out together. However the pairing
      goes, whoever remains standing at the end is the majority
      faction: the minority coalition, even united, runs out of
      partners first. The counter is just the bookkeeping of this
      brawl run left to right: it counts the current faction&apos;s
      unpaired surplus. And if <em>no</em> faction held a majority,
      someone still remains standing at the end: the hall empties into
      a lie, and only a headcount (the verify pass) can tell.
    </p>
  ),

  steps: [
    <>
      <strong>Scan:</strong> counter zero: adopt the value; match:
      increment; mismatch: decrement (one cancelled pair).
    </>,
    <>
      <strong>Finish the pass</strong> holding two words: a candidate
      and its unpaired surplus.
    </>,
    <>
      <strong>Verify:</strong> recount the candidate in a second pass:
      majority iff its count exceeds n/2. This pass is the method.
    </>,
    <>
      <strong>Trust the theory:</strong> if a majority exists, it is
      the candidate: surplus ≥ 2m−n, asserted on every trial.
    </>,
    <>
      <strong>Generalize when asked for more:</strong> Misra-Gries
      runs k counters and (k+1)-wise cancellation: every value over
      n/(k+1) survives (measured with k = 8: never past its budget).
    </>,
  ],

  signals: [
    <>
      <strong>One pass is all you get:</strong> network taps, sensor
      firmware, log shippers: the data flows through and is gone:
      storage is two words, not a table.
    </>,
    <>
      <strong>The question is dominance, not frequencies:</strong> a
      quorum reading, a consensus value, a duplicated-beyond-half
      element: majority-or-none is exactly the contract.
    </>,
    <>
      <strong>A verify pass is available:</strong> replay, or a second
      tape spin: the guess becomes an answer for one more linear scan.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the <strong>dictionary tally</strong>:
      exact counts for everything, one key per distinct value: measured
      at <strong>500,000 keys</strong> on this page&apos;s
      million-item stream. Sort-and-take-middle is the other classic:
      a majority must own the middle seat of any sorted order: at the
      price of a full mutable copy. Both are fine answers when memory
      is cheap; the vote&apos;s niche is exactly where it is not.
    </>
  ),

  strength: (
    <>
      <strong>Two words, two passes, and a theorem doing the
      lifting.</strong> The pairing surplus bound (count ≥ 2m−n) held
      on all 300 adversarial layouts: front-loaded, back-loaded,
      alternating, shuffled: with exact equality on the alternating
      gadget. Full agreement with the dictionary truth on 500 mixed
      streams. And the client is real: 7-way modular redundancy with
      up to 3 colluding faults recovered the true reading 200 of 200
      times.
    </>
  ),
  weakness: (
    <>
      <strong>Majority-or-garbage, and majority only.</strong> With no
      majority present, the surviving candidate means nothing: on
      a,b,a,b,c the vote crowns <em>c, the rarest element</em>, and
      across 1,000 no-majority streams the candidate was not even the
      mode <strong>68%</strong> of the time. The unverified vote also
      cannot answer plurality, top-k, or counts: that is Misra-Gries
      and count-min territory, priced on their own cards.
    </>
  ),

  problem: 'Frequency estimation sketches',
  problemSlug: 'frequency-estimation',
  rivals: [
    {
      name: 'Majority vote × cancellation',
      isThisUnit: true,
      algoName: 'Boyer-Moore majority vote',
      cost: 'O(n), 2 words',
      wins: (
        <>
          <strong>Two words of memory</strong> against the
          dictionary&apos;s 500,000 keys (measured); one pass plus a
          cheap verify; exact majority-or-None with a theorem, not an
          estimate.
        </>
      ),
      costs: (
        <>
          Answers exactly one question: strictly-more-than-half:
          and the raw candidate is garbage without the second pass.
        </>
      ),
      when: 'Single-pass dominance checks under hard memory ceilings: switches, firmware, quorum reads.',
    },
    {
      name: 'Misra-Gries summary',
      algoName: 'Misra-Gries',
      cost: 'O(n), k words',
      wins: (
        <>
          The same cancellation run <em>k-wide</em>: every value with
          more than n/(k+1) of the stream survives (measured at k = 8:
          summary never past budget, majority always present).
        </>
      ),
      costs: (
        <>
          Counts come out low-biased and need a verify pass too;
          k must be chosen before the stream starts.
        </>
      ),
      when: 'Heavy hitters, not just the one king: the standard first reach past a single counter.',
    },
    {
      name: 'Count-min sketch × row minima',
      algoName: 'Count-min sketch',
      cost: 'O(n), w·d cells',
      wins: (
        <>
          Approximate <em>counts</em> for every value on demand (a
          live unit here): point queries the vote cannot answer at
          all, with one-sided error priced by theory.
        </>
      ),
      costs: (
        <>
          Kilobytes of state and overestimates on collisions: the live
          page measures both honestly.
        </>
      ),
      when: 'When you need how-many, not who-dominates: frequencies, quantiles, joins.',
    },
    {
      name: 'Quickselect × random pivot',
      algoName: 'Quickselect',
      cost: 'O(n) offline',
      wins: (
        <>
          With the data in hand, the median <em>is</em> the majority
          when one exists (it must own the middle seat): the live
          unit&apos;s expected-linear machinery answers it directly.
        </>
      ),
      costs: (
        <>
          Needs the whole array resident and mutable: the one thing a
          stream never grants.
        </>
      ),
      when: 'Offline arrays where selection machinery already exists: one call, no second pass.',
    },
  ],
  neverUse: {
    name: 'The unverified single-pass vote',
    why: (
      <>
        The deterministic gadget is five elements long: a,b,a,b,c. The
        pairs annihilate a against b twice, and the vote crowns{' '}
        <strong>c: the rarest element in the stream</strong>, on one
        occurrence out of five. Measured at scale: across 1,000
        no-majority streams the surviving candidate was not even the
        most frequent element 68% of the time. The candidate is a
        conditional certificate: <em>if</em> a majority exists it is
        this: and the condition is exactly what the cheap second pass
        checks. Shipping the candidate without it is shipping a
        coin-flip with a confident face: the verify pass is not an
        optimization, it is the method.
      </>
    ),
  },

  contest: {
    instance:
      'majority element of a 1,000,000-item stream: 500,001 copies planted among 499,999 distinct fillers; referee: the pairing theory’s surplus bound asserted on every trial',
    columns: ['memory held', 'guarantees'],
    rows: [
      {
        method: 'Dictionary tally',
        values: ['500,000 keys', 'exact counts for everything'],
        verdict: 'one key per distinct value: memory scales with the data',
      },
      {
        method: 'Sort, take middle',
        values: ['1,000,000 copy', 'majority must own the middle seat'],
        verdict: 'correct, offline, and a full mutable copy',
      },
      {
        method: 'Misra-Gries, k = 8',
        values: ['8 counters', 'every value over n/9 survives'],
        verdict: 'the k-wide generalization: measured never past budget',
      },
      {
        method: 'BM vote + verify',
        isThisUnit: true,
        values: ['2 words', 'the majority, or None'],
        best: 0,
        verdict: 'two passes, two words: the theorem carries the rest',
      },
    ],
    source:
      "python solutions/boyer_moore_majority_vote.py prints this table and asserts: 300 planted-majority streams under adversarial layouts with the surplus bound count ≥ 2m−n (exact equality on the alternating gadget), full agreement with the dictionary truth on 500 mixed streams, the a,b,a,b,c gadget crowning the rarest element and 68% not-even-the-mode across 1,000 no-majority streams, the four-method memory contest at one million items, and 7-way redundancy with 3 colluding faults recovered 200/200.",
  },

  figure: (
    <Figure
      id="fig-majority-cancellation"
      aspect="16 / 7"
      caption="Pairwise cancellation. Every decrement pairs one copy of the candidate with one different element and discards both: and deleting two different values never changes who holds a majority. A faction with m > n/2 members cannot be paired away: at most n−m pairs each destroy one copy, leaving a surplus of at least 2m−n standing. The counter is just this brawl's bookkeeping, run left to right in two words of memory."
      cite={{
        text: 'Boyer & Moore, "MJRTY: A Fast Majority Vote Algorithm", in Automated Reasoning: Essays in Honor of Woody Bledsoe, 1991 (written 1980). The Fortran was mechanically proved correct; the abstract advertises an efficient use of magnetic tape.',
        href: 'https://doi.org/10.1007/978-94-011-3488-0_5',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="A stream of tokens with cancelled pairs crossed out and the majority surplus remaining">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
          const isMaj = [0, 2, 4, 5, 7, 8].includes(i);
          return (
            <circle
              key={i}
              cx={70 + i * 58}
              cy={90}
              r={15}
              fill={isMaj ? '#5da2ff' : 'none'}
              stroke={isMaj ? '#5da2ff' : '#9aa5bd'}
              strokeWidth="2"
            />
          );
        })}
        <text x="52" y="45" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">the stream: 6 blue of 9 (m=6, n=9)</text>
        {/* cancelled pairs: (0,1), (2,3), (5,6) */}
        {[[0, 1], [2, 3], [5, 6]].map(([a, b], k) => (
          <g key={k}>
            <path
              d={`M ${70 + a * 58} 112 C ${70 + a * 58} 150, ${70 + b * 58} 150, ${70 + b * 58} 112`}
              fill="none"
              stroke="#e2606c"
              strokeWidth="1.8"
              strokeDasharray="5 4"
            />
            <text x={(70 + a * 58 + 70 + b * 58) / 2 - 5} y={168} fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="12">×</text>
          </g>
        ))}
        <text x="52" y="200" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">3 pairs cancel: each destroys at most one blue</text>
        {[4, 7, 8].map((i, k) => (
          <circle key={k} cx={70 + i * 58} cy={238} r={13} fill="#62d98a" />
        ))}
        <text x="52" y="272" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">surplus standing: at least 2m−n = 3 blue: the majority cannot be paired away</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'boyer_moore_majority_vote.py',
  Viz: MajorityVoteViz,
  narration,
};
