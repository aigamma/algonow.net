import KadaneViz from '../viz/KadaneViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/kadane_running_maximum.py?raw';
import { narration } from './kadane-running-maximum.narration.js';

export const content = {
  given:
    'An array of n numbers, positive and negative freely mixed.',
  task: 'Find the contiguous run with the largest sum, and report exactly where it sits.',
  constraint:
    'Contiguous is the whole game: no picking and choosing elements. And at least one element must be taken, so an all-negative array still has a real answer: its largest element.',

  origins: (
    <p>
      In 1977 the statistician Ulf Grenander posed it at Brown, as the
      one-dimensional core of a pattern-detection problem: find the brightest
      region in a digitized image. His solution ran in O(n²). Michael Shamos
      heard the problem and built the O(n log n) divide and conquer overnight.
      Then, at a Carnegie Mellon seminar in 1984 where Shamos presented it,
      the statistician <strong>Jay Kadane</strong> sketched the linear-time
      scan <strong>in under a minute</strong>. Jon Bentley published the whole
      arms race in his Programming Pearls column that September, and the
      one-minute algorithm has carried Kadane&apos;s name since.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>state design</strong>. Every candidate window ends
      somewhere, so it is enough to know, at each position, the best run{' '}
      <strong>ending exactly here</strong>, and to keep the best of those
      ever seen. That single observation collapses n(n+1)/2 windows into n
      states of one number each: dynamic programming with the smallest state
      that still covers every candidate.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>update</strong>: extend or restart. best_here =
      max(x, best_here + x). The justification is one inequality: a window
      that drags a <strong>negative prefix</strong> is beaten by the same
      window without it, so the instant the running sum dips below zero it
      is dead weight, and the run restarts at the current element. That
      single max() is the entire intelligence of the method.
    </p>
  ),

  picture: (
    <p>
      A year of daily gains and losses, and you want the best stretch you
      ever had. Walk the year once with two numbers in your pocket: how this
      current stretch is going, and the best stretch ever. Each morning, the
      only decision is whether yesterday&apos;s momentum is an asset or
      baggage: if the running total is still positive, carry it; the moment
      it goes negative, drop it and let today start a fresh stretch, because
      any future stretch would be strictly better without that debt. At the
      end of the walk, the answer is already in your pocket.
    </p>
  ),

  steps: [
    <>
      <strong>Seed:</strong> the run and the best are both the first
      element; the run starts at index 0.
    </>,
    <>
      <strong>At each element x:</strong> if the run is negative or empty,
      restart it at x (and remember the new start); otherwise extend it by
      x.
    </>,
    <>
      <strong>Record:</strong> if the run now beats the best, the best
      becomes this run, with its start and current index as the witness.
    </>,
    <>
      <strong>Finish:</strong> after one pass, the best and its interval are
      the answer. No second pass, no table.
    </>,
    <>
      <strong>Convention:</strong> the rule never takes zero elements, so an
      all-negative array correctly answers its largest single element.
    </>,
  ],

  signals: [
    <>
      The array is <strong>static</strong> and the question is one-shot; a
      changing array wants the segment tree instead (measured below).
    </>,
    <>
      The answer needs the <strong>location</strong>, not just the value:
      the witness indices fall out of the same pass for free.
    </>,
    <>
      Memory is O(1), so the same loop runs on a <strong>stream</strong> it
      can never store.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the definition itself: try every window. At
      n = 4,000 that is <strong>8,002,000</strong> window extensions against
      Kadane&apos;s <strong>4,000</strong> reads, a 2,000× gap that widens
      quadratically. The lesson is not that brute force is slow; it is that
      the right <strong>DP state</strong> collapsed half a trillion windows
      at n = 300,000 into one number per element.
    </>
  ),

  strength: (
    <>
      <strong>Provably unbeatable, structurally verified.</strong> Any
      correct method must read every element once; this reads each element{' '}
      <strong>exactly once</strong> (the tested solution asserts the counter
      equals n, not approximately), in O(1) memory, streaming-ready, with
      the witness interval free.
    </>
  ),
  weakness: (
    <>
      <strong>It knows nothing the moment the data moves.</strong> One
      changed element invalidates the scan: under 2,000 point updates the
      rescan bill is <strong>8,000,000</strong> reads while a segment tree
      pays <strong>33,936</strong> merges, 236× less. And the contiguity
      premise is load-bearing: allowed to skip elements, the problem
      changes species entirely.
    </>
  ),

  problem: 'Maximum subarray',
  problemSlug: 'maximum-subarray',
  rivals: [
    {
      name: 'Kadane × running maximum',
      isThisUnit: true,
      algoName: "Kadane's algorithm",
      cost: 'O(n), exactly n reads',
      wins: (
        <>
          <strong>4,000 reads on 4,000 elements</strong>, witness included,
          O(1) memory. Optimal in a sense the tests make structural: the
          counter equals n.
        </>
      ),
      costs: (
        <>
          Static. Under churn it can only rescan: 8,000,000 reads for 2,000
          updates, 236× the tree&apos;s bill.
        </>
      ),
      when: 'The default: one-shot answers on static arrays or unbounded streams.',
    },
    {
      name: 'Divide and conquer',
      algoName: 'Divide-and-conquer maximum subarray',
      cost: 'O(n log n)',
      wins: (
        <>
          The <strong>associative formulation</strong>: its (total, best,
          prefix, suffix) merge parallelizes across cores and shards. This
          is how the problem map-reduces.
        </>
      ),
      costs: (
        <>
          Sequentially pointless: <strong>51,904</strong> reads where Kadane
          needs 4,000, thirteen times the work for the same answer.
        </>
      ),
      when: 'Sharded data or parallel reductions; also the stepping stone to the tree.',
    },
    {
      name: 'Segment tree',
      cost: 'O(log n) per update',
      wins: (
        <>
          Untouchable under churn: 2,000 updates with fresh answers cost{' '}
          <strong>33,936</strong> merges against the rescan&apos;s
          8,000,000. Same four-field merge as divide and conquer, kept warm.
        </>
      ),
      costs: (
        <>
          4n tuples of memory and a build pass; for one static answer it
          does about <strong>twice</strong> Kadane&apos;s work (7,999).
        </>
      ),
      when: 'The array keeps changing and the answer must stay current: dashboards, live windows.',
    },
  ],
  neverUse: {
    name: 'An interval DP table over every (i, j)',
    why: (
      <>
        The reflex &quot;it is an optimization problem, allocate a DP
        table&quot; produces n²/2 cells, which is brute force wearing a DP
        costume: <strong>8,000,000 cells</strong> at n = 4,000 to compute
        what a one-number state computes in 4,000 reads. The art of dynamic
        programming is <strong>state design</strong>, not table allocation,
        and Kadane <em>is</em> the DP here: state, one number; transition,
        one max. When the state cannot shrink (paths, edits, parses), the
        table earns its memory. Here it never does.
      </>
    ),
  },

  contest: {
    instance:
      'work = element reads plus tree-node merges, on one seeded array per column: a one-shot answer at n = 4,000, a one-shot answer at n = 300,000, and 2,000 point updates each demanding a fresh whole-array answer',
    columns: ['one shot, n=4,000', 'one shot, n=300,000', '2,000 updates'],
    rows: [
      {
        method: 'Kadane × running maximum',
        isThisUnit: true,
        values: ['4,000', '300,000', '8,000,000'],
        best: 0,
        verdict: 'exactly n, provably minimal; under churn it can only rescan',
      },
      {
        method: 'Divide and conquer',
        values: ['51,904', '5,775,712', 'not run'],
        verdict: 'thirteen times the reads sequentially; the shape that parallelizes',
      },
      {
        method: 'Brute force pairs',
        values: ['8,002,000', 'not run', 'not run'],
        verdict: 'the definition, executable: the oracle this page tests against',
      },
      {
        method: 'Segment tree',
        values: ['7,999', '599,999', '33,936'],
        best: 2,
        verdict: 'double the work once, then near-free forever: 236× under churn',
      },
    ],
    source:
      'python solutions/kadane_running_maximum.py prints this table and asserts all four methods agree with the brute-force definition on 407 cases with every witness interval re-summed independently, the all-negative convention, that Kadane’s read counter equals n exactly, and that after each of 300 random updates the tree’s root equals a fresh rescan.',
  },

  figure: (
    <Figure
      id="fig-kadane-restart"
      aspect="16 / 7"
      caption="The one inequality that powers the pass. Two candidate runs end at the same place: one drags the prefix it walked in with, one starts fresh where the prefix went negative. The dragged version scores the fresh version's sum plus a negative number, so it loses to the fresh version on every future window too. That is the entire proof that best_here = max(x, best_here + x) never discards a winner."
      cite={{
        text: 'Bentley, "Programming Pearls: Algorithm Design Techniques", CACM 27(9), 1984, which records the lineage: posed by Grenander in 1977, O(n log n) by Shamos, and the linear scan produced by Jay Kadane at a 1984 seminar in under a minute.',
        href: 'https://doi.org/10.1145/358234.381162',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="Two runs ending at the same index: one carrying a negative prefix scores lower than the one that restarted after the prefix">
        <line x1="30" y1="150" x2="610" y2="150" stroke="#232c40" strokeWidth="1.5" />
        {[3, 4, -6, -8, 5, 6, -2, 7, 4, -1, 6, 3].map((v, i) => (
          <rect
            key={i}
            x={44 + i * 46}
            y={v > 0 ? 150 - v * 9 : 150}
            width={30}
            height={Math.abs(v) * 9}
            rx={2}
            fill={i < 4 ? 'rgba(224,103,103,0.55)' : 'rgba(93,162,255,0.6)'}
          />
        ))}
        <path d="M 44 236 L 44 244 L 594 244 L 594 236" fill="none" stroke="#e06767" strokeWidth="1.6" />
        <text x="200" y="262" fill="#e06767" fontFamily="ui-monospace, monospace" fontSize="12">carry the prefix: (−7) + 28 = 21</text>
        <path d="M 228 210 L 228 218 L 594 218 L 594 210" fill="none" stroke="#5da2ff" strokeWidth="1.6" />
        <text x="300" y="206" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="12">restart after it: 28</text>
        <text x="52" y="62" fill="#e06767" fontFamily="ui-monospace, monospace" fontSize="12">prefix sums to −7 · dead weight</text>
        <text x="392" y="40" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="12">28 &gt; 21 · restarting wins,</text>
        <text x="392" y="56" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="12">here and on every extension</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'kadane_running_maximum.py',
  Viz: KadaneViz,
  narration,
};
