import LZ77Viz from '../viz/LZ77Viz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/lz77_sliding_window.py?raw';
import { narration } from './lz77-sliding-window.narration.js';

export const content = {
  given:
    'A byte stream: prose, code, styles: anything real.',
  task: 'Encode it smaller, losslessly: the decoder must reproduce every byte.',
  constraint:
    'Lossless admits exactly one oracle, and this page uses nothing else: decompress(compress(x)) == x, byte for byte, on this repository’s own files, plus the two honest edges: the all-same stream (collapse, 79×) and the random stream (expansion: pigeonhole, measured to the byte).',

  origins: (
    <p>
      Jacob Ziv and Abraham Lempel published the window idea in{' '}
      <strong>1977</strong> with a universality theorem attached: as the
      window grows, the scheme approaches the source&apos;s entropy{' '}
      <em>without knowing the source</em>. Storer and Szymanski added the
      flag-bit framing (LZSS, 1982: implemented and named honestly here);
      Welch&apos;s 1984 LZW variant powered GIF and detonated the Unisys
      patent wars; and Phil Katz welded LZ77 to Huffman coding as{' '}
      <strong>DEFLATE</strong> (RFC 1951), which became gzip, zlib, PNG,
      and HTTP compression. Every page you have ever loaded, this one
      included, traveled through this idea.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>token stream</strong>: a sequence of literals and
      (distance, length) copy commands. The decoder is ten lines and
      cannot drift, because every copy points into text it has{' '}
      <em>already written</em>: even self-overlapping copies (distance 1,
      length 200: &quot;repeat the last byte&quot;) unroll correctly
      byte-at-a-time, which is how 10,000 identical bytes collapse to{' '}
      <strong>127</strong>. Compression lives entirely in the encoder;
      decompression is trivial forever: an asymmetry formats are built
      on.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>window</strong>: match only against the recent
      past. That bounds memory and search, and bets that repetition is
      local: real prose repeats phrases it used recently, not chapters
      ago. The dial is measured: on this site&apos;s own build plan, a
      256-byte window leaves 49,827 bytes, 4,096 leaves 37,838, and
      32,768 leaves <strong>32,719</strong>: monotone by construction
      (asserted), paid for in search time and decoder memory. Ziv-Lempel
      universality is the limit of this dial.
    </p>
  ),

  picture: (
    <p>
      A scribe copying a manuscript with a lazy superpower. Most words
      they copy stroke by stroke (literals). But whenever the text
      repeats something written in the last few pages, they instead jot
      a margin note: &quot;same as 214 characters back, for 30
      characters&quot;: a back-reference. The reader reconstructs
      perfectly by flipping back within those pages: the window: which is
      why the note never says &quot;as in chapter one&quot;: the reader
      (and the scribe) only keep a few pages in view. The lazier the
      text, the shorter the copy.
    </p>
  ),

  steps: [
    <>
      <strong>Hash the next 3 bytes</strong> and look up recent positions
      with the same prefix (hash chains).
    </>,
    <>
      <strong>Extend each candidate</strong> to the longest match within
      the window; keep the best.
    </>,
    <>
      <strong>Emit:</strong> a (distance, length) token if the match
      reaches 3 bytes, else a literal; a flag bit says which.
    </>,
    <>
      <strong>Slide:</strong> index the bytes just covered and continue;
      old positions expire past the window.
    </>,
    <>
      <strong>Decode by copying:</strong> literals append; matches copy
      from the output&apos;s own tail: byte at a time, so overlaps
      unroll.
    </>,
  ],

  signals: [
    <>
      <strong>Real data with local repetition:</strong> logs, HTML, CSS,
      source code, JSON: this site&apos;s stylesheet compresses 2.93×
      with the window alone.
    </>,
    <>
      <strong>Decode must be cheap:</strong> the asymmetry (heavy encode,
      trivial decode) fits publish-once-read-many perfectly: PNG, gzip,
      game assets.
    </>,
    <>
      <strong>Streaming with bounded memory:</strong> the window is the
      whole state: kilobytes, fixed, forever.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>Huffman coding alone</strong> (a
      live unit on this site): 32,128 bytes on the same file, 1.61×,
      almost exactly tying this unit&apos;s 1.58×: a genuinely
      remarkable measured coincidence, because the two exploit{' '}
      <em>disjoint</em> redundancy. Huffman sees that &apos;e&apos; is
      common and &apos;#&apos; is rare; LZ77 sees that &quot;the
      algorithm&quot; appeared twelve lines ago. The proof they are
      different: the pipeline running both, DEFLATE, lands at 23,064:
      40% below either.
    </>
  ),

  strength: (
    <>
      <strong>Universal, streaming, decoder-trivial, and honest about
      its limits.</strong> No model of the data is assumed (Ziv-Lempel
      universality is the theorem form of that sentence); memory is the
      window, fixed; the decoder is ten unfailing lines; and every claim
      round-tripped byte-exact on this repo&apos;s living files: 1.37× to
      2.93× with the window stage alone.
    </>
  ),
  weakness: (
    <>
      <strong>Blind to symbol skew, greedy, and local by design.</strong>{' '}
      Without an entropy stage the tokens themselves are wasteful
      (DEFLATE&apos;s 40% gap is exactly that waste, measured); greedy
      longest-match is not optimal parsing (zstd&apos;s optimal parser
      is the modern refinement); and repetition beyond the window is
      invisible: the dial buys reach with search time. On random data it
      can only lose: +12.5%, the flag bits precisely.
    </>
  ),

  problem: 'General-purpose compression',
  problemSlug: 'dictionary-compression',
  rivals: [
    {
      name: 'LZ77 × sliding window',
      isThisUnit: true,
      algoName: 'LZ77',
      cost: 'O(n) decode, window-bounded encode',
      wins: (
        <>
          <strong>1.58×</strong> on real prose and 2.93× on CSS from the
          window alone; 79× on runs; ten-line decoder; fixed memory.
          (The flag-bit framing is Storer-Szymanski&apos;s LZSS: same
          idea, named honestly.)
        </>
      ),
      costs: (
        <>
          No entropy stage (the 40% DEFLATE gap), greedy parsing, and
          blindness past the window.
        </>
      ),
      when: 'The repetition stage of nearly every real pipeline, and standalone where decode speed and memory rule.',
    },
    {
      name: 'Huffman coding × frequency merges',
      algoName: 'Huffman coding',
      cost: 'O(n + Σ log Σ)',
      wins: (
        <>
          <strong>1.61×</strong> on the same file from symbol skew alone:
          provably optimal per-symbol codes, streaming, tiny state.
        </>
      ),
      costs: (
        <>
          Cannot see repetition at all: &quot;the algorithm&quot; twice
          costs double: the redundancy it exploits is disjoint from the
          window&apos;s.
        </>
      ),
      when: 'As the entropy stage after dictionary coding, or alone when symbols are skewed but sequences are not.',
    },
    {
      name: 'DEFLATE × LZ77 plus Huffman',
      algoName: 'DEFLATE',
      cost: 'O(n), two stages',
      wins: (
        <>
          <strong>23,064 bytes (2.25×)</strong>, measured via zlib level
          9: both redundancies harvested: the format inside gzip, PNG,
          zip, and HTTP for thirty years.
        </>
      ),
      costs: (
        <>
          Two coupled stages of complexity, a 32KB window ceiling, and a
          1993 design that zstd now beats on every axis.
        </>
      ),
      when: 'The interoperable default everywhere; reach for zstd when you control both ends.',
    },
    {
      name: 'LZW',
      cost: 'O(n), code-table dictionary',
      wins: (
        <>
          Builds an explicit phrase dictionary as numbered codes: no
          distances, no window: elegant streaming simplicity that ran
          GIF and early modems.
        </>
      ),
      costs: (
        <>
          The table resets and code-width games cap its ratios, and its
          patent history (Unisys, 1994-2003) made it famous for the
          wrong reason.
        </>
      ),
      when: 'Legacy formats (GIF, TIFF) and teaching: elsewhere the window family won.',
    },
  ],
  neverUse: {
    name: 'Compressing the incompressible',
    why: (
      <>
        The 10,000 random bytes came back as <strong>11,250</strong>:
        expansion of exactly 12.5%, the flag bits and nothing else,
        because not one 3-byte match existed to point at. That is
        pigeonhole made flesh: no lossless scheme shrinks all inputs,
        and data that is already compressed (zips, JPEGs, encrypted
        blobs) <em>is</em> random to every model. Production pipelines
        that gzip already-compressed uploads spend CPU to grow their
        payloads: check the content type, or measure one ratio, before
        paying to make things bigger.
      </>
    ),
  },

  contest: {
    instance:
      'docs/OVERNIGHT-PLAN.md, 51,790 bytes of this site’s own prose (the living corpus: puzzles.js, theme.css, and a solution file are also round-tripped); every row decompressed byte-exact',
    columns: ['bytes', 'ratio'],
    rows: [
      {
        method: 'Raw',
        values: ['51,790', '1.00×'],
        verdict: 'the file as written',
      },
      {
        method: 'Huffman alone',
        values: ['32,128', '1.61×'],
        verdict: 'symbol skew only: blind to every repeated phrase',
      },
      {
        method: 'LZ77, 32K window',
        isThisUnit: true,
        values: ['32,719', '1.58×'],
        verdict: 'repeats only: a near-tie from disjoint redundancy',
      },
      {
        method: 'DEFLATE (zlib −9)',
        values: ['23,064', '2.25×'],
        best: 0,
        verdict: 'LZ77 then Huffman: the pipeline beats both stages by 40%',
      },
    ],
    source:
      'python solutions/lz77_sliding_window.py prints this table and asserts: byte-exact round-trips on four repo files and all edge cases; the window dial monotone (256B → 49,827, 4K → 37,838, 32K → 32,719); the all-same stream collapsing 79×; the random stream expanding to 11,250 (the flag bits exactly); and the two-stage pipeline strictly beating both single stages. Corpus ratios: plan 1.37× (4K window), puzzles.js 2.04×, theme.css 2.93×, solution code 1.80×. Numbers are as measured at unit build; the corpus is the living repository.',
  },

  figure: (
    <Figure
      id="fig-lz77-window"
      aspect="16 / 7"
      caption="The cursor, the window, and the back-reference. Everything left of the cursor is already-written output; the window is its recent tail. A match becomes a (distance, length) token: an instruction to the decoder to copy from its own past. The flag bit (LZSS) says which kind of token follows. Repetition beyond the window is invisible on purpose: that blindness is the price of fixed memory, and the measured dial shows what each kilobyte of reach buys."
      cite={{
        text: 'Ziv & Lempel, "A Universal Algorithm for Sequential Data Compression", IEEE Trans. Information Theory 23, 1977; the flag framing is Storer & Szymanski 1982; the pipeline is DEFLATE, RFC 1951 (Katz).',
        href: 'https://doi.org/10.1109/TIT.1977.1055714',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="A byte stream with a sliding window and a back-reference arc from the cursor to an earlier match">
        <rect x="30" y="90" width="580" height="40" fill="rgba(255,255,255,0.03)" stroke="#2a3450" rx="4" />
        <rect x="150" y="90" width="290" height="40" fill="rgba(93,162,255,0.10)" stroke="#5da2ff" strokeDasharray="5 4" rx="4" />
        <text x="150" y="82" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="11">the window (recent output only)</text>
        <rect x="440" y="90" width="10" height="40" fill="#f0b94b" />
        <text x="428" y="150" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">cursor</text>
        <text x="456" y="115" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">…not yet read…</text>
        <rect x="235" y="96" width="72" height="28" fill="rgba(98,217,138,0.22)" stroke="#62d98a" rx="3" />
        <path d="M 445 88 C 400 30, 300 30, 271 88" fill="none" stroke="#62d98a" strokeWidth="2" />
        <text x="282" y="44" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="12">(distance 205, length 24)</text>
        <text x="30" y="196" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="12">token stream: [lit t][lit h][lit e] … [copy 205,24] … [lit .]</text>
        <text x="30" y="220" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">flag bits (LZSS) mark literal vs copy: 1 bit, not 1 byte, of framing</text>
        <text x="30" y="252" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">measured dial: 256B window → 49,827 · 4KB → 37,838 · 32KB → 32,719 bytes</text>
        <text x="30" y="274" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">then hand the tokens to Huffman and the same file falls to 23,064: DEFLATE</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'lz77_sliding_window.py',
  Viz: LZ77Viz,
  narration,
};
