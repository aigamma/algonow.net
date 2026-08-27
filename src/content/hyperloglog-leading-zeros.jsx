import HllViz from '../viz/HllViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/hyperloglog_leading_zeros.py?raw';
import { narration } from './hyperloglog-leading-zeros.narration.js';

export const content = {
  given:
    'A stream of a million items in arbitrary order, most of them repeats.',
  task: 'Report how many distinct items have passed, within a few percent.',
  constraint:
    'One kilobyte of state, fixed forever, however long the stream runs and however large the universe of possible items is. Remembering what you have seen is off the table.',

  origins: (
    <p>
      Philippe Flajolet and Nigel Martin built the first version in{' '}
      <strong>1983</strong> for IBM&apos;s database query planners, which
      needed distinct counts without the memory to count distinctly. Twenty
      years of refinement followed: LogLog in 2003, then{' '}
      <strong>HyperLogLog in 2007</strong>, whose harmonic mean pushed the
      error to 1.04/√m, provably near the floor for the memory. Google&apos;s
      2013 HyperLogLog++ (sparse mode, bias correction) is what answers
      BigQuery&apos;s APPROX_COUNT_DISTINCT; Redis ships it behind PFADD and
      PFCOUNT at twelve kilobytes per counter. The PF prefix is a tribute:
      Philippe Flajolet died in 2011, and his initials are in the API.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>averaging machine</strong>. One noisy witness is
      useless, so the first ten bits of each hash route every item to one of
      1,024 substreams, each keeping a single six-bit register, and the
      estimate combines them with a <strong>harmonic mean</strong>, which is
      dominated by its small values, so one substream&apos;s lucky long run
      cannot wreck the answer the way an arithmetic mean would let it. Below
      2.5m the machine swaps itself out for linear counting on the empty
      registers, because at small counts the witnesses have not seen enough
      to testify.
    </p>
  ),
  heurRole: (
    <p>
      Chooses <strong>what each register remembers</strong>: the longest run
      of leading zeros ever seen in that substream&apos;s hashes. A run of r
      zeros appears about once per <strong>2^r distinct hashes</strong>, so
      the maximum run is a witness statement about how many went by. And a
      maximum is <strong>repeat-proof by construction</strong>: the same item
      hashes to the same bits every time, so showing it again moves nothing.
      Frequency is invisible; distinctness is free.
    </p>
  ),

  picture: (
    <p>
      Estimate how many lottery tickets a town bought from one fact: the
      best prize anyone won. A one-in-a-million jackpot suggests about a
      million tickets. One jackpot is loud but noisy evidence, so split the
      town into 1,024 neighborhoods, ask each for <strong>its</strong> best
      prize, and average the testimonies. Note what cannot fool this census:
      a resident waving the same winning ticket every day changes nothing,
      because the best prize already counted it once. Rarity, not volume, is
      what testifies.
    </p>
  ),

  steps: [
    <>
      <strong>Hash</strong> the item once. The first ten bits choose one of
      1,024 registers; the remaining bits are inspected for leading zeros.
    </>,
    <>
      <strong>Witness:</strong> if this hash&apos;s zero-run beats the
      register&apos;s stored maximum, store it. Six bits per register
      suffice.
    </>,
    <>
      <strong>Repeats change nothing:</strong> identical items produce
      identical hashes, and a maximum cannot be raised by what it already
      saw.
    </>,
    <>
      <strong>Estimate:</strong> α·m²/Σ2^(−M[j]), the harmonic combination
      of all 1,024 testimonies.
    </>,
    <>
      <strong>Small counts:</strong> while many registers are still zero,
      estimate from that emptiness instead (linear counting), then hand
      over.
    </>,
    <>
      <strong>Union:</strong> merging two sketches is register-wise max, and
      it is exact: sketch(A ∪ B) equals merge(sketch A, sketch B), register
      for register.
    </>,
  ],

  signals: [
    <>
      You need the <strong>count</strong> of distinct values only: no
      membership tests, no frequencies, no listing.
    </>,
    <>
      A <strong>few percent</strong> of error is acceptable, and a fixed
      memory ceiling is not negotiable.
    </>,
    <>
      The stream is <strong>sharded</strong>: sketches from many machines
      must combine into one answer without shipping data.
    </>,
  ],
  baseline: (
    <>
      The exact hash set is the honest baseline: the true 200,000, for{' '}
      <strong>3.2 megabytes</strong>, more than four thousand times this
      sketch&apos;s 768 bytes, growing without bound, and unmergeable across
      shards short of shipping the sets themselves. The sketch answers{' '}
      <strong>204,358</strong>, off by 2.2 percent, from memory that will
      never grow again.
    </>
  ),

  strength: (
    <>
      <strong>Fixed, tiny, and mergeable.</strong> 768 bytes at ±3.3
      percent, O(1) per item, repeat-blind by construction, and the union of
      shards is register-wise max, proven exact in the tested solution. This
      is why every distributed analytics engine carries it.
    </>
  ),
  weakness: (
    <>
      <strong>It only ever estimates, and it only counts.</strong> The band
      shrinks as 1/√m, so each halving of error costs 4× the memory. No
      membership, no frequencies, no deletion, no listing; intersections
      come only from inclusion-exclusion, which amplifies the error.
    </>
  ),

  problem: 'Cardinality estimation',
  problemSlug: 'cardinality-estimation',
  rivals: [
    {
      name: 'HyperLogLog × zero runs',
      isThisUnit: true,
      algoName: 'HyperLogLog',
      cost: 'O(1)/item · 768 B',
      wins: (
        <>
          <strong>+2.2%</strong> on a million-item stream from 768 bytes,
          and shards merge exactly. The near-optimal error per bit of
          memory.
        </>
      ),
      costs: (
        <>
          Always an estimate (±3.3% here), and halving the band costs four
          times the memory. Counts, and nothing else.
        </>
      ),
      when: 'Distinct counts at scale: analytics, telemetry, joins planned across shards.',
    },
    {
      name: 'Flajolet-Martin sketch',
      algoName: 'Flajolet-Martin',
      cost: 'O(1)/item · 1 KB',
      wins: (
        <>
          The 1985 ancestor, and close on this draw: <strong>+1.9%</strong>.
          Its bitmap observable is easier to reason about than a max.
        </>
      ),
      costs: (
        <>
          32 bits of state per substream against HyperLogLog&apos;s six, and
          a wider band per byte: the constant is what two decades of
          refinement removed.
        </>
      ),
      when: 'Mostly as ancestry now; reach for it when you need the bitmap itself (e.g. set difference sketches).',
    },
    {
      name: 'K-minimum values',
      cost: 'O(log k)/item · 1 KB',
      wins: (
        <>
          The k smallest hashes support more than counting: union,
          intersection, and similarity estimates fall out of the same
          sample.
        </>
      ),
      costs: (
        <>
          ±8.8% at this memory, and the draw below shows it:{' '}
          <strong>−15.0%</strong>. Eight bytes per stored minimum is an
          expensive witness.
        </>
      ),
      when: 'You want set-overlap estimates (Jaccard, intersections) from the same sketch, not just a count.',
    },
    {
      name: 'Linear counting',
      cost: 'O(1)/item · m bits',
      wins: (
        <>
          Sharp and nearly unbiased while zeros remain; below its ceiling it
          beats every sketch here. It is HyperLogLog&apos;s own small-range
          fallback.
        </>
      ),
      costs: (
        <>
          Needs bits proportional to the count itself. At 200,000 distinct
          in 8,192 bits it is <strong>saturated</strong>: every bit set, no
          estimate at all.
        </>
      ),
      when: 'Counts comparable to the bits you can afford: thousands, not hundreds of thousands.',
    },
    {
      name: 'Exact hash set',
      algoName: 'Hash table with chaining',
      cost: 'O(1)/item · 16 B/key',
      wins: (
        <>
          <strong>200,000, exactly</strong>, plus membership, frequencies,
          and listing: everything the sketches gave up.
        </>
      ),
      costs: (
        <>
          3.2 megabytes here and growing forever, and shard union means
          shipping the shards.
        </>
      ),
      when: 'The distinct universe is small enough to hold, or the exact answer is legally the point.',
    },
  ],
  neverUse: {
    name: 'Counting distinct in a 1% sample, times 100',
    why: (
      <>
        Distinct counts do not scale linearly, and the tested solution
        measures the wreck: this stream&apos;s 1% sample scales to{' '}
        <strong>993,100</strong> against a truth of 200,000, five times
        over. Heavy repeaters appear in every sample while singletons vanish,
        so the sample&apos;s distinct fraction says almost nothing about the
        population&apos;s. Estimating distinct counts from samples is its own
        research problem with its own estimators; naive multiplication is
        not one of them.
      </>
    ),
  },

  contest: {
    instance:
      'a 1,000,000-item stream holding exactly 200,000 distinct ids (about five appearances each); every sketch is granted about one kilobyte',
    columns: ['estimate', 'memory'],
    rows: [
      {
        method: 'HyperLogLog, 1,024 registers',
        isThisUnit: true,
        values: ['204,358 (+2.2%)', '768 B'],
        best: 1,
        verdict: 'within 2.2% from 768 bytes, and shards merge exactly',
      },
      {
        method: 'Flajolet-Martin, 256 bitmaps',
        values: ['203,707 (+1.9%)', '1,024 B'],
        verdict: 'the ancestor: close on this draw, wider band per byte',
      },
      {
        method: 'K-minimum values, k = 128',
        values: ['170,006 (−15.0%)', '1,024 B'],
        verdict: 'an 8.8% band at this memory, and this draw shows it',
      },
      {
        method: 'Linear counting, 8,192 bits',
        values: ['saturated', '1,024 B'],
        verdict: 'sharp below its ceiling, silent above it: every bit is set',
      },
      {
        method: 'Exact hash set',
        values: ['200,000 (exact)', '3.2 MB'],
        best: 0,
        verdict: 'the truth, at 4,167× the memory, and shards cannot merge cheaply',
      },
    ],
    source:
      'python solutions/hyperloglog_leading_zeros.py prints this table and asserts the leading-zero tail matches 2^−r, the estimate lands within 3σ, merging half-stream sketches equals the full-stream sketch register for register, error shrinks from m = 256 to m = 4,096, linear counting saturates here yet is sharp below its ceiling, and the 1% sampling shortcut overshoots five-fold.',
  },

  figure: (
    <Figure
      id="fig-hll-witness"
      aspect="16 / 7"
      caption="Rarity as a census. Each hash is a run of fair coin flips; a run of r leading zeros appears about once per 2^r distinct hashes, so the longest run a register has ever seen testifies to how many passed through it. Repeats are powerless: the same item produces the same bits, and a maximum cannot be raised by what it already saw. One witness is noisy; 1,024 of them, combined by a harmonic mean that refuses to be impressed by a single lucky run, land within a few percent."
      cite={{
        text: 'Flajolet, Fusy, Gandouet, and Meunier, "HyperLogLog: the analysis of a near-optimal cardinality estimation algorithm", DMTCS proceedings, AofA 2007. The observable is Flajolet and Martin, JCSS 30(2), 1985; the small-range fallback is Whang, Vander-Zanden, and Taylor, ACM TODS 15(2), 1990.',
        href: 'https://doi.org/10.46298/dmtcs.3545',
      }}
    >
      <svg viewBox="0 0 640 300" role="img" aria-label="Six example hash bit strings with their leading zero runs highlighted; the longest run witnesses the largest count">
        <text x="20" y="26" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="12">one register&apos;s substream · every arriving hash, as coin flips</text>
        {[
          ['1011010110010111', 0],
          ['0110001011101001', 1],
          ['0010111010001101', 2],
          ['1101001100101110', 0],
          ['0000010110110010', 5],
          ['0100110101011011', 1],
        ].map(([bits, run], row) => (
          <g key={row}>
            {bits.split('').map((b, i) => (
              <text
                key={i}
                x={24 + i * 22}
                y={62 + row * 30}
                fill={i < run ? '#f0b94b' : '#6b7690'}
                fontFamily="ui-monospace, monospace"
                fontSize="15"
                fontWeight={i < run ? 700 : 400}
              >
                {b}
              </text>
            ))}
            <text x={392} y={62 + row * 30} fill={run === 5 ? '#62d98a' : '#9aa5bd'} fontFamily="ui-monospace, monospace" fontSize="12">
              {run === 5 ? 'run of 5 · the register keeps this' : `run of ${run}`}
            </text>
          </g>
        ))}
        <line x1="24" y1="248" x2="616" y2="248" stroke="#232c40" strokeWidth="1.2" />
        <text x="24" y="272" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="12">a run of 5 appears about once per 2⁵ = 32 distinct hashes</text>
        <text x="24" y="290" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="12">1,024 registers testify · harmonic mean · ±3.3%</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'hyperloglog_leading_zeros.py',
  Viz: HllViz,
  narration,
};
