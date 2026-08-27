import CountMinViz from '../viz/CountMinViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/count_min_sketch_row_minima.py?raw';
import { narration } from './count-min-sketch-row-minima.narration.js';

export const content = {
  given:
    'A stream too big to store: a million items here, 145,527 distinct.',
  task: 'Estimate any item’s frequency from a fixed grid of counters: 8,000 of them: 18× fewer than exact counting.',
  constraint:
    'Two promises must hold and both are tested to the item: never underestimate (asserted on all 145,527 distinct items), and overcount bounded by N/w on average (measured: 205.8 against a promised ceiling of 500).',

  origins: (
    <p>
      Cormode and Muthukrishnan published the sketch in{' '}
      <strong>2005</strong>, and it became the streaming
      workhorse almost immediately: heavy-hitter detection in network
      switches (Estan and Varghese&apos;s conservative update came from
      exactly that setting), trending-topic counters, NLP feature
      counting at web scale, and DDoS detectors watching flows they
      could never enumerate. Its signed sibling, the Count sketch
      (Charikar-Chen-Farach-Colton 2002), trades the one-sided
      guarantee for unbiasedness: both run and both are measured on
      this page.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>counter grid</strong>: d rows of w cells, one
      independent hash per row; every arriving item increments exactly
      one cell in each row. Collisions only ever <em>add</em>, so each
      cell upper-bounds every item it hosts: the structural one-sided
      guarantee, asserted here universally: of 145,527 distinct items,
      not one was ever underestimated, by either variant.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>minimum over rows</strong>. Each row&apos;s
      overcount is a different accident (different hash, different
      collisions), so the smallest cell is the least-damaged witness.
      Markov bounds one row&apos;s excess by 2N/w with probability ½;
      independence across d rows multiplies the failure to 2⁻ᵈ.
      Measured at d = 4, w = 2,000: mean overcount{' '}
      <strong>205.8</strong>, 99th percentile 324: inside the promised
      envelope, from 8,000 integers watching a million arrivals.
    </p>
  ),

  picture: (
    <p>
      Four tally clerks at a parade, each with a clipboard of 2,000
      lines. Each clerk files every passing banner under a line by
      their own private rule: unrelated banners share lines, and shared
      lines can only ever over-tally. Ask how many times a banner
      passed: each clerk answers with their line&apos;s tally: an
      overcount by whatever else got filed with it: and you take the{' '}
      <em>smallest</em> answer, since the clerks&apos; accidents are
      independent. Four clipboards recall a million-banner parade to
      within a rounding error: for the banners big enough to matter.
    </p>
  ),

  steps: [
    <>
      <strong>Add x:</strong> for each of d rows, increment cell
      hᵣ(x): d array writes, no lookups, no growth.
    </>,
    <>
      <strong>Query x:</strong> read the same d cells, return the
      minimum: an upper bound, always.
    </>,
    <>
      <strong>Size by promise:</strong> w = 2/ε for error εN;
      d = log(1/δ) for confidence: the dial measured below (mean
      overcount 3,085 → 207 → 10.2 as w grows 10×, 10×).
    </>,
    <>
      <strong>Conservative update</strong> (if no deletions): raise
      only the minimal cells: 1.9× less overcount, measured.
    </>,
    <>
      <strong>Mind the mice:</strong> the error is flat in absolute
      terms, so rare items drown: this is an instrument for
      elephants.
    </>,
  ],

  signals: [
    <>
      <strong>Heavy hitters over unbounded streams:</strong> top
      talkers, trending items, hot keys: the sketch&apos;s top-20
      matched exact&apos;s top-20, 20/20.
    </>,
    <>
      <strong>Fixed memory is non-negotiable:</strong> switches, edge
      collectors, per-shard telemetry: 8,000 ints, forever, regardless
      of stream length.
    </>,
    <>
      <strong>Overestimates are the safe direction:</strong> rate
      limiting, abuse detection: where missing a heavy user is worse
      than flagging a light one.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the <strong>exact dictionary</strong>:
      145,527 counters, zero error, and the right answer whenever the
      key set fits: which, at this page&apos;s scale, it plainly would.
      The sketch&apos;s regime begins where keys outrun memory: flows
      at line rate, n-grams at web scale: and its 18× compression here
      is a miniature of ratios that reach thousands in production.
    </>
  ),

  strength: (
    <>
      <strong>One-sided by structure, priced by theorem, tiny by
      design.</strong> Never under: asserted on every distinct item;
      mean overcount 205.8 inside Markov&apos;s 500; heavy hitters
      preserved 20/20; the width dial scaling as N/w (3,085 / 207 /
      10.2, measured); mergeable across shards by cell-wise addition;
      and the conservative refinement measured at 1.9× tighter.
    </>
  ),
  weakness: (
    <>
      <strong>Flat absolute error is a death sentence for mice.</strong>{' '}
      The gradient is the whole honesty: rank 1 carries 0.25% relative
      error, rank 10 carries 1.94%, rank 100 carries 23.6%: and
      count-one items showed a <em>median</em> overcount of 200:
      twenty-thousand percent. Point queries on rare items are noise
      wearing digits. The signed Count sketch trades the one-sided
      guarantee for unbiasedness (measured: bias −1.9 with 75,540
      genuine underestimates): a different contract, not a free
      upgrade.
    </>
  ),

  problem: 'Frequency estimation sketches',
  problemSlug: 'frequency-estimation',
  rivals: [
    {
      name: 'Count-min × row minima',
      isThisUnit: true,
      algoName: 'Count-min sketch',
      cost: 'd writes/reads per op',
      wins: (
        <>
          <strong>Never under, asserted universally</strong>; mean
          error 205.8 on a promised 500; 18× compression; mergeable;
          the streaming default.
        </>
      ),
      costs: (
        <>
          One-sided bias that buries rare items (rank-100 already at
          23.6% relative), and adversarial inputs want salted hashes.
        </>
      ),
      when: 'Heavy hitters and rate estimates over streams that outrun memory: switches, telemetry, trending.',
    },
    {
      name: 'Count sketch × signed hashes',
      algoName: 'Count sketch',
      cost: 'd writes/reads per op',
      wins: (
        <>
          A second hash flips signs, the median unbiases: measured bias{' '}
          <strong>−1.9</strong> against CM&apos;s +205.8: the estimator
          statistics and ML feature-hashing want.
        </>
      ),
      costs: (
        <>
          Genuinely two-sided: 75,540 underestimates here: the
          &quot;never under&quot; contract is gone, and constants are
          slightly worse per cell.
        </>
      ),
      when: 'Unbiasedness matters: moment estimation, sketch-based regression, anywhere errors must cancel.',
    },
    {
      name: 'Boyer-Moore majority vote',
      algoName: 'Boyer-Moore majority vote',
      cost: 'O(1) memory, one pass',
      wins: (
        <>
          The minimalist cousin: one counter and one candidate find a
          strict-majority element with <em>certainty</em>: the extreme
          point of the memory-vs-generality trade.
        </>
      ),
      costs: (
        <>
          Answers exactly one question (is there a &gt;50% item, and
          which): no frequencies, no top-k.
        </>
      ),
      when: 'The single-majority question: quorum detection, dominant-value scans: nothing smaller exists.',
    },
    {
      name: 'HyperLogLog × leading zeros',
      algoName: 'HyperLogLog',
      cost: 'KB for billions',
      wins: (
        <>
          The sibling question (a live unit): <em>how many distinct</em>
          , not <em>how many of each</em>: the two sketches ride the
          same telemetry pipelines side by side.
        </>
      ),
      costs: (
        <>
          Cardinality only: it cannot name a single heavy hitter.
        </>
      ),
      when: 'Distinct counts: unique visitors, distinct flows: its own page prices it.',
    },
  ],
  neverUse: {
    name: 'Point-querying the mice',
    why: (
      <>
        The sketch&apos;s absolute error is flat: ~206 here no matter
        who you ask about: so an item that truly appeared{' '}
        <em>once</em> came back with a median estimate of 201:{' '}
        <strong>twenty-thousand percent relative error</strong>,
        measured across 2,000 count-one items. Dashboards that read
        individual rare-key counts off a CM sketch are rendering
        collision noise with confident typography. The sketch&apos;s
        contract is εN <em>absolute</em>: honor it by asking about
        elephants (rank-1 error here: 0.25%), thresholding at εN, or
        keeping exact side-counters for the keys you truly monitor.
      </>
    ),
  },

  contest: {
    instance:
      '1,000,000-item heavy-tailed stream, 145,527 distinct; sketches at 4 × 2,000 = 8,000 counters (18× fewer than exact); referee: an exact Counter on every distinct item',
    columns: ['mean err', 'p99'],
    rows: [
      {
        method: 'Exact dict (145,527 ctrs)',
        values: ['0', '0'],
        verdict: 'a counter per elephant and per mouse: right when it fits',
      },
      {
        method: 'Count-min × row minima',
        isThisUnit: true,
        values: ['205.8', '324'],
        best: 0,
        verdict: 'never under, asserted on all 145,527: inside Markov’s 500',
      },
      {
        method: '+ conservative update',
        values: ['108.1', '113'],
        verdict: 'raise only the minimal cells: 1.9× tighter, still never under',
      },
      {
        method: 'Count sketch (signed)',
        values: ['−1.9 bias', '±'],
        verdict: 'unbiased and two-sided: 75,540 genuine underestimates',
      },
    ],
    source:
      'python solutions/count_min_sketch_row_minima.py prints this table and asserts: the one-sided guarantee on every distinct item for both CM variants; mean error within N/w and p99 within 4N/w; the elephants-mice gradient (rank 1: 0.25%, rank 10: 1.94%, rank 100: 23.6%, count-one median overcount 200); sketch top-20 equal to exact top-20 (20/20); the width dial scaling (3,085 / 207 / 10.2 at w = 200/2,000/20,000); conservative update at least 1.4× tighter (measured 1.9×); and the Count sketch measured genuinely two-sided with |bias| < a third of CM’s.',
  },

  figure: (
    <Figure
      id="fig-cm-grid"
      aspect="16 / 7"
      caption="The grid and the minimum. Each row hashes independently; an arriving item increments one cell per row; collisions only add, so every cell upper-bounds its tenants. A query reads its d cells and keeps the smallest: the least-damaged witness. Markov prices one row at 2N/w with probability half; independence compounds d rows to 2^−d. Measured: mean overcount 205.8 on a promised 500, and not one underestimate in 145,527 chances."
      cite={{
        text: 'Cormode & Muthukrishnan, "An improved data stream summary: the count-min sketch and its applications", J. Algorithms 55, 2005; conservative update: Estan & Varghese 2002; the signed sibling: Charikar, Chen & Farach-Colton 2002.',
        href: 'https://doi.org/10.1016/j.jalgor.2003.12.001',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="A count-min grid with one item hashing into one cell per row and the minimum taken">
        {[0, 1, 2, 3].map((r) => (
          <g key={r}>
            {Array.from({ length: 16 }, (_, c) => (
              <rect key={c} x={90 + c * 30} y={60 + r * 40} width="27" height="26" fill={(r * 7 + c * 3) % 5 === 0 ? 'rgba(93,162,255,0.18)' : 'rgba(255,255,255,0.04)'} stroke="#2a3450" />
            ))}
            <text x="40" y={78 + r * 40} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">{`h${r + 1}`}</text>
          </g>
        ))}
        {[[4, 0], [11, 1], [7, 2], [13, 3]].map(([c, r], i) => (
          <rect key={i} x={90 + c * 30} y={60 + r * 40} width="27" height="26" fill="rgba(240,185,75,0.35)" stroke="#f0b94b" strokeWidth="2" />
        ))}
        <text x="300" y="40" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="12" textAnchor="middle">item x: one cell per row, +1</text>
        <text x="90" y="248" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="12">query: min(47, 52, 46, 61) = 46 · true 45 · the +1 is a stranger sharing the cell</text>
        <text x="90" y="274" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">never under (structural) · over by ~N/w (Markov) · 8,000 ints for a million arrivals</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'count_min_sketch_row_minima.py',
  Viz: CountMinViz,
  narration,
};
