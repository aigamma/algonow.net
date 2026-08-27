import SpaceSavingViz from '../viz/SpaceSavingViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/space_saving_min_counter.py?raw';
import { narration } from './space-saving-min-counter.narration.js';

export const content = {
  given:
    'A stream too wide to tally: 5,000 distinct items here, unbounded in general: and a question about its head: who are the top k, and how often did they really come?',
  task: 'The heavy hitters with per-item error bars, in m counters, one pass.',
  constraint:
    'The live majority-vote unit finds one king; the live count-min estimates anyone but names no one. This unit must produce the ranked list AND its uncertainty: every count bracketed by its own recorded error, asserted with zero tolerance against an exact tally.',

  origins: (
    <p>
      Metwally, Agrawal, and El Abbadi, ICDT <strong>2005</strong>:
      born from web-advertising fraud detection at UCSB, where the
      question was never &quot;how often did each of a billion
      cookies appear&quot; but &quot;who are the heavy clickers, and
      can you defend the number in a dispute&quot;. The stroke is the
      eviction rule: when a stranger arrives and the table is full,
      do not drop it (sketches&apos; instinct) and do not tax
      everyone (Misra-Gries&apos;s instinct): <em>evict the minimum
      and inherit its count</em>, recording the inheritance as an
      error bar. The summary keeps score and keeps its doubts in the
      same row.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>monitored-set discipline</strong>: exactly m
      triples (item, count, error), updated in one pass. A monitored
      arrival increments. An unmonitored arrival replaces the
      minimum. Two theorems fall out and both are asserted exactly:
      the minimum counter never exceeds <strong>n/m</strong>, so any
      item truly more frequent than n/m is <em>guaranteed
      monitored</em>: and every count is an overestimate bracketed
      by its own error: count − error ≤ true ≤ count, per item, zero
      tolerance, on all 60 streams.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>min-counter inheritance</strong>: the
      newcomer starts at min+1 with error = min recorded on its ear.
      Inheriting: rather than starting at 1: is what keeps the
      minimum climbing and the n/m guarantee alive; recording the
      inheritance is what makes the estimate honest. Measured at
      equal 50-counter budgets on the 200,000-item Zipf stream: worst
      top-10 error <strong>1</strong>, against Misra-Gries&apos;s{' '}
      <strong>2,303</strong>: tight overestimates versus
      decrement-decayed underestimates.
    </p>
  ),

  picture: (
    <p>
      A chart show with m seats. Regulars in seats get a tally mark
      on every appearance. A stranger walks in to a full house: and
      instead of being turned away, takes the <em>coldest seat</em>:
      the occupant with the fewest marks leaves, and the stranger
      inherits that tally, wearing a wristband that says how many of
      those marks are borrowed. Stars accumulate real marks that
      dwarf their wristbands: the top of the chart is clean. The
      bottom seats churn: strangers inheriting from strangers,
      wristbands covering nearly everything: and that is not a flaw
      but a confession: the seat is a placeholder, and it says so.
      One glance at the wristband separates measurement from
      inheritance.
    </p>
  ),

  steps: [
    <>
      <strong>Monitored arrival:</strong> increment its counter: a
      real mark.
    </>,
    <>
      <strong>Room to spare:</strong> admit at count 1, error 0.
    </>,
    <>
      <strong>Full house:</strong> evict the minimum; the newcomer
      takes count min+1 with error = min recorded.
    </>,
    <>
      <strong>Answer queries:</strong> top-k by count; each estimate
      carries its bracket: count − error ≤ true ≤ count.
    </>,
    <>
      <strong>Trust by the bars:</strong> guarantee: anything above
      n/m is monitored; slots whose error swallows their count are
      placeholders, and say so.
    </>,
  ],

  signals: [
    <>
      <strong>The head is the question:</strong> trending topics, top
      talkers, hot keys: ranked heavy hitters with defensible
      numbers, not point queries.
    </>,
    <>
      <strong>Skew exists:</strong> Zipf-shaped traffic is the
      habitat: the dial measured recall 3/6/10/10 at m = 10/20/50/200
      on a 5,000-distinct stream.
    </>,
    <>
      <strong>Error bars are contractual:</strong> billing, fraud,
      abuse reports: the bracket count − error ≤ true ≤ count is a
      statement you can sign.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the exact <strong>dictionary
      tally</strong>: one counter per distinct item: 5,000 here,
      unbounded in the wild: and the streaming shelf offers two live
      neighbors: the <strong>majority vote</strong> (one king,
      two words) and <strong>count-min</strong> (estimates for
      anyone, names for no one). Space-Saving is the middle seat:
      the ranked head, with error bars, in m rows.
    </>
  ),

  strength: (
    <>
      <strong>Brackets with zero tolerance, and a guarantee that
      never slipped.</strong> On all 60 random streams, every
      monitored item satisfied count − error ≤ true ≤ count exactly;
      the minimum counter never exceeded n/m, so nothing frequent
      was ever missing. At equal budgets the worst top-10 error was
      1 against Misra-Gries&apos;s 2,303; recall reached 10/10 at
      m = 50 on 5,000 distinct items; and the budget dial rose
      monotonically to perfect.
    </>
  ),
  weakness: (
    <>
      <strong>No skew, no signal: and the machinery says so.</strong>{' '}
      On a uniform stream the same 50 counters filled with
      inheritance: the best top-10 slot wore an error bar covering{' '}
      <strong>100%</strong> of its count (Zipf: 0.1%): a ranked list
      of placeholders, honestly labeled. Space-Saving needs a head
      to find; where frequencies are flat, no m-counter summary can
      rank them, and this one at least confesses. Deletions are also
      unsupported: that is the cuckoo filter&apos;s shelf.
    </>
  ),

  problem: 'Frequency estimation sketches',
  problemSlug: 'frequency-estimation',
  rivals: [
    {
      name: 'Space-Saving × inheritance',
      isThisUnit: true,
      algoName: 'Space-Saving',
      cost: 'm counters, O(1)*',
      wins: (
        <>
          <strong>Ranked top-k with per-item brackets</strong>: worst
          top-10 error 1 at equal budgets, the n/m guarantee never
          violated, placeholders self-confessed.
        </>
      ),
      costs: (
        <>
          Needs skew to say anything (uniform streams measured at
          100% error bars); no deletions; min-tracking wants a
          linked structure for true O(1).
        </>
      ),
      when: 'Top talkers, trending items, hot keys: ranked lists you must defend with error bars.',
    },
    {
      name: 'Misra-Gries × decrements',
      algoName: 'Misra-Gries',
      cost: 'k counters',
      wins: (
        <>
          The 1982 ancestor: same guarantee family (> n/(k+1)
          survives) with the simplest possible machinery: the
          k-wide cancellation of the live majority-vote unit.
        </>
      ),
      costs: (
        <>
          Every overflow taxes all counters: estimates decay into
          underestimates: worst top-10 error 2,303 vs 1, measured at
          equal budgets.
        </>
      ),
      when: 'When presence suffices and counts are secondary: the survivor list, not the scoreboard.',
    },
    {
      name: 'Count-min × row minima',
      algoName: 'Count-min sketch',
      cost: 'w·d cells',
      wins: (
        <>
          The live unit: an estimate for <em>any</em> queried item,
          monitored or not: point queries Space-Saving cannot answer
          about strangers.
        </>
      ),
      costs: (
        <>
          Names no one: finding the top-k needs an external heap or
          candidate stream: and collisions inflate silently without
          per-item bars.
        </>
      ),
      when: 'When the queries name the items: joins, filters, per-key throttles.',
    },
    {
      name: 'Majority vote × cancellation',
      algoName: 'Boyer-Moore majority vote',
      cost: '2 words',
      wins: (
        <>
          The live unit at the shelf&apos;s far end: the single
          strict-majority king in two words, with a theorem instead
          of an estimate.
        </>
      ),
      costs: (
        <>
          Answers exactly one question: k = 1, threshold one-half:
          and needs its verify pass.
        </>
      ),
      when: 'Quorums and dominance checks: when the answer is one name or none.',
    },
  ],
  neverUse: {
    name: 'Reading placeholder counters as measurements',
    why: (
      <>
        Space-Saving always returns a full, confidently ranked table:
        m rows, descending counts: even on a stream with no head at
        all. On this page&apos;s uniform stream the top slot&apos;s
        error bar covered 100% of its count: every mark borrowed,
        nothing measured: yet the table looks identical in shape to
        the Zipf table whose top-10 were accurate to 0.1%. A
        dashboard that renders the ranking and drops the error column
        will trend fifty random strangers with total conviction. The
        bracket is not decoration: count − error is the only part
        that was <em>witnessed</em>: rank by count, but trust by the
        gap: and when the bars swallow the counts, the honest reading
        is that the stream has no head worth reporting: which is
        itself the answer.
      </>
    ),
  },

  contest: {
    instance:
      'top-10 of a 200,000-item Zipf stream (α = 1.2, 5,000 distinct), 50 counters each; referee: an exact Counter with per-item brackets asserted at zero tolerance',
    columns: ['top-10 recall', 'worst |est − true|'],
    rows: [
      {
        method: 'Misra-Gries (50)',
        values: ['10/10', '2,303'],
        verdict: 'underestimates, decayed by every decrement-all round',
      },
      {
        method: 'Space-Saving (50)',
        isThisUnit: true,
        values: ['10/10', '1'],
        best: 1,
        verdict: 'tight overestimates, each bracketed by its own recorded error',
      },
    ],
    source:
      "python solutions/space_saving_min_counter.py prints this table and asserts: count − error ≤ true ≤ count for every monitored item on 60 random streams (zero tolerance); min counter ≤ n/m with every item above n/m present, every trial; the equal-budget race (worst top-10 error 1 vs 2,303, both 10/10 recall); the no-skew confession (Zipf top-10 worst error fraction 0.1% vs uniform best 100%; tail placeholders 39/50 and 50/50); and the budget dial 3/6/10/10 at m = 10/20/50/200.",
  },

  figure: (
    <Figure
      id="fig-space-saving-seats"
      aspect="16 / 7"
      caption="The chart show with m seats. Regulars accumulate real tally marks; a stranger at a full house takes the coldest seat and inherits its tally, wristband recording how much is borrowed. The head of the chart outruns the churn: real marks dwarf the wristbands. The bottom seats are placeholders and say so. Two theorems ride along: the minimum tally never exceeds n/m (so anything frequent holds a seat), and every count is bracketed by its own wristband: count − error ≤ true ≤ count, asserted here with zero tolerance."
      cite={{
        text: 'Metwally, Agrawal & El Abbadi, "Efficient Computation of Frequent and Top-k Elements in Data Streams", ICDT 2005: Space-Saving, from ad-fraud detection at UCSB; the third seat on this site’s streaming shelf beside count-min and the majority vote.',
        href: 'https://doi.org/10.1007/978-3-540-30570-5_27',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="Counter bars with solid witnessed portions and hatched inherited portions, head clean and tail swallowed">
        <text x="40" y="26" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">m = 8 seats · solid: witnessed marks (count − error) · pale: inherited (the wristband)</text>
        {[
          [420, 2, 'item 17'], [300, 4, 'item 3'], [210, 6, 'item 41'],
          [150, 10, 'item 8'], [110, 30, 'item 96'], [90, 55, 'item 512'],
          [80, 70, 'item 2048'], [78, 74, 'stranger'],
        ].map(([w, err, label], i) => (
          <g key={i}>
            <rect x={110} y={44 + i * 27} width={w - err} height={18} fill="#5da2ff" />
            <rect x={110 + w - err} y={44 + i * 27} width={err} height={18} fill="#3a4560" />
            <text x={40} y={57 + i * 27} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">{label}</text>
          </g>
        ))}
        <text x="545" y="57" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="10">the head:</text>
        <text x="545" y="70" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="10">bars ≈ 0</text>
        <text x="545" y="228" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="10">the churn:</text>
        <text x="545" y="241" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="10">placeholders,</text>
        <text x="545" y="254" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="10">and they say so</text>
        <text x="40" y="278" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">measured: worst top-10 error 1 vs Misra-Gries 2,303 at equal budgets · min seat ≤ n/m, never violated</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'space_saving_min_counter.py',
  Viz: SpaceSavingViz,
  narration,
};
