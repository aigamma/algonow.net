import ArithmeticViz from '../viz/ArithmeticViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/arithmetic_coding_renormalization.py?raw';
import { narration } from './arithmetic-coding-renormalization.narration.js';

export const content = {
  given:
    'A message and a probability model, and a wall in the obvious approach: Huffman must spend a whole number of bits per symbol, but a 99%-probable symbol carries only 0.0145 bits of information. On the skewed source below, that wall costs 12.4×.',
  task: 'Encode the entire message as one number in [0, 1): each symbol narrows the interval by exactly its probability. Ship settled leading bits as you go and rescale the 32-bit registers: renormalization: so the state never grows.',
  constraint:
    'The referee is the round trip: decode(encode(x)) == x on 300 randomized messages and every contest source, exactly. The Shannon floor is honored and nearly touched: output within 0.02% of n*H on the skew and never below it; the Huffman wall is measured at 12.4× there with parity said plainly on English-like (0.8%) and uniform sources; and the naive exact-fraction coder’s state is measured exploding: 2,492 → 19,932 denominator bits over 2,000 symbols, while the register coder never leaves 32.',

  origins: (
    <p>
      Shannon set the floor in 1948: no code beats n·H bits.
      Peter Elias saw, in unpublished work from the 1960s, that
      a whole message could live as one number in [0, 1), each
      symbol shaving the interval by its probability: optimal in
      principle, unusable in practice, because the interval
      endpoints need ever-longer arithmetic. Rissanen and Pasco
      (independently, <strong>1976</strong>) supplied
      finite-precision versions, and Witten, Neal, and
      Cleary&apos;s 1987 CACM paper: code included: made the
      32-bit renormalizing coder the canon this page implements.
      The idea runs the modern world&apos;s pixels: JPEG&apos;s
      QM-coder, and the CABAC engine inside H.264 and HEVC
      video, are arithmetic coders; zstd&apos;s ANS is its
      table-driven successor built on the same
      fractional-bit insight. Every streamed movie is Elias&apos;s
      interval, renormalized millions of times a second.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>interval</strong>: start with [0, 1),
      and for each symbol keep only the sub-interval whose width
      is that symbol&apos;s probability: after the whole
      message, any number in the surviving interval identifies
      the message exactly, and its length is within a bit or two
      of the ideal -Σ log₂ p. The decoder replays the same
      narrowing to walk the symbols back out. Exactness is the
      referee: 300 randomized messages plus all three contest
      sources, decoded identical to the byte, including the
      all-one-symbol and single-character edges.
    </p>
  ),
  heurRole: (
    <p>
      Supplies <strong>renormalization</strong>: the move that
      makes the thought experiment an algorithm. Whenever the
      interval falls entirely into the top or bottom half, its
      leading bit is settled: ship it and double the interval;
      when it straddles the midpoint too tightly (the classic
      underflow case: <strong>97,368 straddle events handled
      here</strong>), defer the bit and rescale anyway. The
      registers never leave 32 bits, the range never drops below
      quarter-width (asserted at every symbol), and the price of
      all this finite precision is measured at{' '}
      <strong>0.02% over the entropy floor</strong>. The naive
      coder without it is also on this page, with its state
      graphed on its way to 19,932 bits.
    </p>
  ),

  picture: (
    <p>
      A number line as a filing system. The whole line [0, 1) is
      the set of all possible messages. Give the letter
      &apos;e&apos; 12.7% of the line, &apos;z&apos; its 0.07%,
      in some agreed order. To encode &quot;e...&quot;, step
      into e&apos;s stretch; to encode the next letter, divide{' '}
      <em>that stretch</em> in the same proportions and step
      again. Common letters barely shrink your stretch: cheap:
      rare letters shrink it hard: expensive: and nobody ever
      pays a whole bit for a nearly-certain letter, because bits
      only get spent when the stretch crosses a binary boundary.
      The renormalization is the desk trick that makes it
      practical: whenever your stretch sits entirely in the left
      or right half of the line, write down which half (one
      bit), then <em>zoom in 2×</em> and forget the half you
      left: the ruler stays the same size forever while the
      message rides out as bits. Zoom without writing: the
      straddle case: and you owe a bit whose value the future
      will reveal.
    </p>
  ),

  steps: [
    <>
      <strong>Partition [0, 1):</strong> each symbol owns a
      stretch equal to its probability, in cumulative-count
      order.
    </>,
    <>
      <strong>Narrow:</strong> encoding a symbol keeps only its
      stretch of the current interval: integer arithmetic on
      32-bit low/high registers.
    </>,
    <>
      <strong>Renormalize:</strong> settled halves ship a bit
      and double the interval; tight straddles defer a bit
      (97,368 handled) and double anyway.
    </>,
    <>
      <strong>Never underflow:</strong> the range stays above
      quarter-width, asserted at every one of 150,000 contest
      symbols.
    </>,
    <>
      <strong>Finish and flush:</strong> two closing bits pin
      the final interval; the decoder replays the narrowing to
      read the message back: exactly, 300 times over.
    </>,
  ],

  signals: [
    <>
      <strong>Skewed probabilities:</strong> run-length flags,
      almost-always-zero residuals, binary decisions near
      certainty: where whole-bit codes pay 12× and fractional
      bits are the entire game (video codecs live here).
    </>,
    <>
      <strong>A model worth honoring:</strong> when a predictor
      gives sharp per-symbol probabilities (context models,
      neural predictors), arithmetic coding converts them to
      bits at 0.02% overhead: the optimal back end.
    </>,
    <>
      <strong>Adaptivity wanted:</strong> the interval narrows
      by whatever probabilities you hand it per symbol: models
      may update mid-stream with no table rebuild (Huffman
      needs its tree redone).
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>Huffman coding</strong>: the
      live unit, provably optimal among whole-bit prefix codes,
      and genuinely near-optimal wherever probabilities sit
      close to powers of one half: within{' '}
      <strong>0.8%</strong> of entropy on the English-like
      source and a dead heat on uniform bytes: rows this page
      states plainly. Its wall is granularity: on the 99/1
      source it must spend 50,000 bits where the information
      content is 4,033.
    </>
  ),

  strength: (
    <>
      <strong>The entropy floor, touched, with 32-bit
      registers.</strong> Output within 0.02% of n·H on the
      skewed source (12.4× under Huffman&apos;s wall), 0.00% on
      the other two, never once below the floor: with exact
      round-trips on every message tried, the range invariant
      asserted at every symbol, and 97,368 straddle
      renormalizations handled silently. The infinite-precision
      idea runs at finite precision for a measured tax of
      almost nothing: that is the heuristic&apos;s whole
      victory.
    </>
  ),
  weakness: (
    <>
      <strong>Serial, model-hungry, and historically
      encumbered.</strong> The interval is a chain: symbol k
      needs symbol k-1&apos;s interval, so decoding resists
      parallelism and SIMD (ANS, its successor, was invented
      largely to fix this: zstd decodes entropy streams far
      faster). The output is only as good as the model: garbage
      probabilities in, entropy-of-garbage out: and Huffman
      matches it within ~1% whenever distributions are
      whole-bit friendly, at lower complexity. Patent thickets
      around arithmetic coding famously stalled its adoption
      for two decades (JPEG shipped Huffman as default partly
      for this reason): the patents have expired; the caution
      in old codecs remains.
    </>
  ),

  problem: 'Entropy coding',
  problemSlug: 'entropy-coding',
  rivals: [
    {
      name: 'Arithmetic × renormalization',
      isThisUnit: true,
      algoName: 'Arithmetic coding',
      cost: '~n·H bits, serial',
      wins: (
        <>
          <strong>Fractional bits</strong>: 12.4× under Huffman
          on the skew, 0.02% off the floor, adaptive models for
          free: the video-codec engine.
        </>
      ),
      costs: (
        <>
          Serial state chains, model dependence, and decades of
          patent-scarred adoption history.
        </>
      ),
      when: 'Skewed or adaptive probabilities: residuals, flags, context models.',
    },
    {
      name: 'Huffman coding',
      cost: 'optimal whole-bit prefix',
      wins: (
        <>
          The live unit: table-driven, fast, parallel-friendly,
          and within 0.8% of entropy on English-like data:
          optimal in its class, and its class is usually enough.
        </>
      ),
      costs: (
        <>
          One bit minimum per symbol: 50,000 spent against 4,033
          of information on this page&apos;s skewed source.
        </>
      ),
      when: 'Whole-bit-friendly distributions, or when decode speed and simplicity rule.',
    },
    {
      name: 'Asymmetric numeral systems',
      cost: '~n·H bits, table-driven',
      wins: (
        <>
          The modern successor (Duda): fractional bits at
          Huffman-like speed via table lookups: the engine
          inside zstd and modern codecs.
        </>
      ),
      costs: (
        <>
          Decodes in reverse order, table construction
          subtleties, and streaming adaptivity is harder than
          the interval&apos;s.
        </>
      ),
      when: 'Throughput-critical entropy coding: the default choice for new formats.',
    },
    {
      name: 'Shannon-Fano coding',
      cost: 'whole-bit, suboptimal',
      wins: (
        <>
          The 1948-era almost: top-down probability splitting,
          simple to explain, and the historical bridge between
          the entropy formula and working codes.
        </>
      ),
      costs: (
        <>
          Provably suboptimal even among prefix codes: Huffman
          dominates it everywhere: a museum piece with a lesson.
        </>
      ),
      when: 'Teaching the gap between a bound and an algorithm: never in production.',
    },
  ],
  neverUse: {
    name: 'The infinite-precision interval coder',
    why: (
      <>
        Elias&apos;s idea taken literally: keep the interval as
        exact fractions and encode with perfect arithmetic. It
        is <em>correct</em>: and this page measured what it
        costs: over 2,000 symbols the interval&apos;s
        denominator grew from 2,492 bits to{' '}
        <strong>19,932 bits</strong>, monotonically and without
        bound: every further symbol multiplies the fraction
        again, so per-symbol work grows with message length and
        the coder quadratically buries itself. The renormalizing
        coder ships settled bits and rescales, so its registers{' '}
        <strong>never leave 32 bits by construction</strong>: same
        output length to within a rounding, constant work per
        symbol, forever. The gap between a beautiful idea and a
        shippable algorithm is exactly one heuristic: and this
        unit&apos;s pairing is that heuristic.
      </>
    ),
  },

  contest: {
    instance:
      '50,000 symbols per source; one currency: output bits; the entropy floor n·H computed from the same counted model; referee: exact round-trip decode on every message',
    columns: ['huffman', 'arithmetic', 'entropy floor'],
    rows: [
      {
        method: 'Skewed 99/1',
        isThisUnit: true,
        values: ['50,000', '4,034', '4,033'],
        best: 1,
        verdict: 'the wall: whole bits vs 0.08 bits of information: 12.4×, and the floor touched at +0.02%',
      },
      {
        method: 'English-like letters',
        values: ['210,282', '208,696', '208,695'],
        best: 1,
        verdict: 'parity said plainly: Huffman within 0.8% when probabilities suit whole bits',
      },
      {
        method: 'Uniform bytes',
        values: ['400,000', '399,831', '399,830'],
        best: 1,
        verdict: 'dead heat: 8-bit symbols want exactly 8 bits: no fractional dividend exists',
      },
    ],
    source:
      'python solutions/arithmetic_coding_renormalization.py prints this table and asserts: decode(encode(x)) == x on 300 randomized messages (skewed, uniform, single-symbol edges) and every contest source; output ≥ n·H always and within 0.2% + 64 bits of it; Huffman ≥ 10× arithmetic on the skew with the parity rows inside their stated margins; the range register never below quarter-width at any of the 150,000 contest symbols (97,368 straddle renormalizations counted); and the exact-fraction coder’s denominator bit-length growing monotonically past 19,000 bits over 2,000 symbols while the register coder stays at 32 by construction.',
  },

  figure: (
    <Figure
      id="fig-arithmetic-interval"
      aspect="16 / 7"
      caption="The message as one number. Each symbol keeps only its probability-sized stretch of the current interval, so a 99%-probable symbol costs its true 0.0145 bits instead of Huffman's mandatory whole bit (12.4× on the skewed source, measured). Renormalization makes it an algorithm: settled halves ship a bit and the interval doubles; tight straddles defer a bit and double anyway (97,368 handled): the registers never leave 32 bits while the naive exact-fraction coder's state was measured growing past 19,932 bits. Output within 0.02% of the Shannon floor, never below it."
      cite={{
        text: 'I. H. Witten, R. M. Neal, J. G. Cleary, "Arithmetic coding for data compression," CACM 30(6), 1987. DOI 10.1145/214762.214771. Interval idea: Elias; finite precision: Rissanen 1976, Pasco 1976; successor: Duda\'s ANS.',
        href: 'https://doi.org/10.1145/214762.214771',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="An interval narrowing symbol by symbol with renormalization doubling it back, versus Huffman's whole-bit staircase">
        <rect x="40" y="40" width="560" height="14" fill="rgba(93,162,255,0.15)" stroke="#5da2ff" strokeWidth="1.2" />
        <rect x="40" y="40" width="470" height="14" fill="rgba(93,162,255,0.35)" />
        <text x="44" y="34" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="10">symbol A (p = 0.84): keep its stretch</text>
        <rect x="80" y="76" width="400" height="14" fill="rgba(240,185,75,0.3)" stroke="#f0b94b" strokeWidth="1.2" />
        <text x="84" y="70" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="10">next symbol narrows again…</text>
        <path d="M 480 96 l 40 22" stroke="#62d98a" strokeWidth="1.4" />
        <rect x="40" y="122" width="560" height="14" fill="rgba(98,217,138,0.25)" stroke="#62d98a" strokeWidth="1.2" />
        <text x="44" y="116" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="10">renormalize: settled half ships a bit, the interval doubles: registers stay 32-bit forever</text>
        <text x="40" y="170" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">skewed 99/1 source: huffman 50,000 bits · arithmetic 4,034 · floor 4,033 (+0.02%)</text>
        <text x="40" y="192" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">english-like: 210,282 vs 208,696 vs 208,695 (huffman +0.8%: parity) · uniform: dead heat</text>
        <text x="40" y="222" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">the naive exact-fraction coder: denominator 2,492 → 19,932 bits over 2,000 symbols: unbounded</text>
        <text x="40" y="244" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">97,368 straddle events: the deferred-bit trick: zoom now, owe a bit the future reveals</text>
        <text x="40" y="270" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">round-trip exact on 300 messages + all sources: the floor honored, never undercut</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'arithmetic_coding_renormalization.py',
  Viz: ArithmeticViz,
  narration,
};
