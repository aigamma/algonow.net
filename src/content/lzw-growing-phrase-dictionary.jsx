import LzwViz from '../viz/LzwViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/lzw_growing_phrase_dictionary.py?raw';
import { narration } from './lzw-growing-phrase-dictionary.narration.js';

export const content = {
  given:
    'A byte stream to compress, and a decoder on the far side that will only ever see your codes.',
  task: 'Fewer bits out than in, decompressing byte-exact: without ever transmitting a dictionary.',
  constraint:
    'The dictionary must be learned from the data: and learned twice, identically, by two machines that never exchange it. The referee is the round trip: decode(encode(x)) == x on every corpus and 300 mixed trials: and zlib, the shipped standard, racing on every row.',

  origins: (
    <p>
      Terry Welch published this in <strong>1984</strong> at Sperry
      Research, as a hardware-friendly tightening of Ziv and
      Lempel&apos;s 1978 scheme: and it promptly conquered the decade:
      Unix <code>compress</code>, GIF, TIFF, modem standards. Then the
      Unisys patent enforcement of the 1990s made it infamous: the
      free-software world&apos;s answer was PNG, built on the
      unpatented DEFLATE: so the burglar-alarm version of this
      algorithm&apos;s history is that <em>a patent created a file
      format</em>. The patents expired in 2003; the design outlived
      the drama, still inside every GIF.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>greedy longest-match scan</strong>: keep
      extending the current phrase while the table still knows it;
      when it falls off the map, emit the code for the longest known
      prefix and start again. One pass, one table lookup per byte,
      codes of fixed width out (12 bits here, for legible accounting:
      <code>compress</code> and GIF grew widths 9 to 12). The emission
      schedule <em>is</em> the training schedule: that coupling is
      what the heuristic exploits.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>growing phrase dictionary</strong>: each
      emission registers one new phrase (the emitted phrase plus the
      byte that broke it), so the table ends at exactly 256 + codes −
      1 entries: asserted. The decoder replays the same rule one step
      behind and builds the <em>identical</em> table from the codes
      alone: no dictionary ever crosses the wire. The one corner:
      a code arriving before the decoder has built it: has a forced
      answer (w + w[0]), exercised 3,898 times across this
      page&apos;s trials.
    </p>
  ),

  picture: (
    <p>
      Two stenographers inventing shorthand in parallel. The sender
      writes a word, and <em>both</em> agree, by the same rule, that
      this word plus its next letter now has a private symbol. Neither
      ever mails the codebook: it is reconstructible from the messages
      themselves, because every symbol was minted in public view, one
      step before its first use. The famous corner is the symbol used
      the instant it is minted: the receiver, one step behind, has not
      written it down yet: but the timing forces what it must be: the
      last word plus that word&apos;s own first letter. The shorthand
      grows richer as the conversation continues: which is exactly why
      a <em>frozen</em> codebook on a changed topic becomes a tax.
    </p>
  ),

  steps: [
    <>
      <strong>Extend:</strong> grow the current phrase while the table
      knows it.
    </>,
    <>
      <strong>Emit and mint:</strong> output the longest known
      prefix&apos;s code; register phrase-plus-next-byte as a new
      entry.
    </>,
    <>
      <strong>Decode one step behind:</strong> the receiver replays
      the same rule from the codes alone: identical table, never
      transmitted.
    </>,
    <>
      <strong>Handle the minted-this-instant code:</strong> KwKwK: it
      can only be w + w[0]: forced, not guessed (counted 3,898 times
      here).
    </>,
    <>
      <strong>Mind the cap:</strong> at 2¹² entries the table freezes:
      on drifting data that is a 172% measured tax: <code>compress</code>
      shipped a CLEAR code for exactly this.
    </>,
  ],

  signals: [
    <>
      <strong>No side channel for a codebook:</strong> the decoder is
      firmware, a file format reader, a stranger: everything must ride
      in the stream itself.
    </>,
    <>
      <strong>Phrase repetition, not just symbol skew:</strong> logs,
      prose, telemetry: the same words recur: a dictionary pays where
      Huffman&apos;s per-symbol view cannot see.
    </>,
    <>
      <strong>One pass, tiny state, hardware-simple:</strong> the 1984
      pitch still holds: no window scans, no trees: one table, one
      lookup per byte.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>raw bytes</strong> at 1.00×, and
      the honest ceiling is <strong>DEFLATE</strong> (zlib −9): the
      LZ77-plus-Huffman pipeline that displaced LZW nearly everywhere:
      measured winning every corpus on this page (5.30× vs 4.65× on
      the log). LZW&apos;s surviving niche is simplicity and history:
      one-pass hardware, GIF, and the classroom: the cleanest possible
      demonstration that a dictionary can ride inside the data.
    </>
  ),

  strength: (
    <>
      <strong>The dictionary is free, the machine is tiny, and the
      corner is forced.</strong> 4.36× on English-ish text and 4.65×
      on a server log (measured, round-tripped byte-exact); the growth
      invariant exact (table = 256 + codes − 1); the KwKwK
      reconstruction exercised 3,898 times across 300 trials; and
      same-kind halves share a learned dictionary for a measured 4%
      saving over starting fresh.
    </>
  ),
  weakness: (
    <>
      <strong>Noise expands, drift taxes, and the standard wins.</strong>{' '}
      Random bytes come out at 0.70× (a 1.42× <em>expansion</em>: 12
      fixed bits per mostly-single-byte phrase). A frozen table on
      drifting data cost a measured <strong>172% extra</strong> versus
      fresh dictionaries per half: the reason compress monitored its
      ratio and kept a CLEAR code. And zlib −9 beat LZW on every
      corpus tested: DEFLATE displaced this design for reasons the
      table shows plainly.
    </>
  ),

  problem: 'General-purpose compression',
  problemSlug: 'dictionary-compression',
  rivals: [
    {
      name: 'LZW × growing dictionary',
      isThisUnit: true,
      algoName: 'LZW',
      cost: 'O(n), one pass',
      wins: (
        <>
          <strong>No dictionary transmitted, ever:</strong> both sides
          grow it from the stream; 4.65× on the log corpus with a
          one-lookup-per-byte machine simple enough for 1984 hardware.
        </>
      ),
      costs: (
        <>
          Fixed-width codes pay a noise tax (1.42× expansion measured)
          and the capped table freezes on drift (172% measured).
        </>
      ),
      when: 'Teaching the self-carrying dictionary; GIF and legacy formats; hardware one-pass paths.',
    },
    {
      name: 'LZ77 × sliding window',
      algoName: 'LZ77',
      cost: 'O(n·w) naive scan',
      wins: (
        <>
          The other dictionary (a live unit): the recent{' '}
          <em>window itself</em>, addressed by back-references: no
          table, no cap, adapts instantly because the dictionary{' '}
          <em>is</em> the last 32K bytes.
        </>
      ),
      costs: (
        <>
          Finding matches costs the search machinery LZW never needs;
          repeats older than the window are invisible.
        </>
      ),
      when: 'The default dictionary side of modern pipelines: recency beats accumulation on real data.',
    },
    {
      name: 'Huffman × sorted merges',
      algoName: 'Huffman coding',
      cost: 'O(n + σ log σ)',
      wins: (
        <>
          The orthogonal axis (a live unit): optimal bits per{' '}
          <em>symbol</em> from frequency skew: exactly the redundancy
          a phrase dictionary does not model.
        </>
      ),
      costs: (
        <>
          Blind to every repeated phrase: the live LZ77 page measured
          the two axes near-tied and disjoint on this site&apos;s own
          prose.
        </>
      ),
      when: 'Skewed symbols without phrase structure: or as the second stage after a dictionary pass.',
    },
    {
      name: 'DEFLATE × LZ77 + Huffman',
      algoName: 'DEFLATE',
      cost: 'O(n), tuned',
      wins: (
        <>
          Both axes at once: measured <strong>5.57× / 5.30× / 1.00×</strong>{' '}
          across this page&apos;s three corpora: never expanding,
          always winning: the shipped standard (zlib, PNG, gzip).
        </>
      ),
      costs: (
        <>
          A far bigger machine: window search, two code trees, block
          framing: nothing you rederive at a whiteboard.
        </>
      ),
      when: 'Production compression, full stop: the race it wins on this page is the reason it is everywhere.',
    },
  ],
  neverUse: {
    name: 'LZW on incompressible bytes',
    why: (
      <>
        Encrypted, already-compressed, or random data has no phrases
        to learn: but LZW still pays <strong>12 bits per code</strong>{' '}
        for phrases that stay one byte long: measured on this page at{' '}
        <strong>0.70×: a 1.42× expansion</strong>, byte-for-byte worse
        than doing nothing. (zlib on the same corpus: 1.00×: DEFLATE
        detects the futility and stores raw blocks.) A compressor in a
        pipeline must be allowed to say no: wrap the output with a
        did-it-shrink check, as compress&apos;s ratio monitor did in
        1984: or the archiver becomes an inflater on exactly the data
        that looks most modern.
      </>
    ),
  },

  contest: {
    instance:
      'a 49,781-byte synthetic server log (deterministic; paths and latencies from a seeded RNG); referee: every row decompressed byte-exact, and the same race run on English-ish text (46,624 B) and random bytes (20,480 B)',
    columns: ['ratio', 'log corpus'],
    rows: [
      {
        method: 'Raw bytes',
        values: ['1.00×', '49,781 B'],
        verdict: 'the stream as it arrived',
      },
      {
        method: 'LZW, 12-bit codes',
        isThisUnit: true,
        values: ['4.65×', '10,707 B'],
        verdict: 'the dictionary rides inside the data: nothing transmitted',
      },
      {
        method: 'DEFLATE (zlib −9)',
        values: ['5.30×', '9,398 B'],
        best: 0,
        verdict: 'LZ77 + Huffman: wins here and on every corpus tested',
      },
    ],
    source:
      "python solutions/lzw_growing_phrase_dictionary.py prints this table and asserts: 300 round trips byte-exact across mixed alphabets plus the edges; the KwKwK corner forced on the run gadget (3 hits) and counted in the wild (3,898 across the trials); the growth invariant table = 256 + codes − 1 exact; text 4.36×, log 4.65×, random bytes 0.70× with zlib winning every corpus; and the freeze-on-drift lesson both directions: text+DNA joint 172% worse than fresh halves, same-kind joint 4% better.",
  },

  figure: (
    <Figure
      id="fig-lzw-dictionary"
      aspect="16 / 7"
      caption="The dictionary rides inside the data. Every emission mints one new phrase: the emitted phrase plus the byte that broke it: so the decoder, replaying the same rule one step behind, reconstructs the identical table from the codes alone. The one corner is the code used the instant it is minted: the decoder has not built it yet, but the timing forces its value: the last phrase plus that phrase's own first byte. Nothing is transmitted but the codes; the codebook is a shadow both sides compute."
      cite={{
        text: 'Welch, "A Technique for High-Performance Data Compression", IEEE Computer 17(6), 1984: the hardware-friendly form of Ziv-Lempel 1978. Unix compress, GIF, and TIFF shipped it; the Unisys patents made DEFLATE (and PNG) the world\'s answer.',
        href: 'https://doi.org/10.1109/MC.1984.1659158',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="Encoder and decoder growing identical phrase tables one step apart">
        <text x="60" y="34" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">input: t h e _ t h e _ t h e</text>
        <rect x="60" y="52" width="220" height="120" rx="6" fill="none" stroke="#5da2ff" strokeWidth="1.6" />
        <text x="74" y="74" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="11">encoder table</text>
        <text x="74" y="96" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="11">256: "th"</text>
        <text x="74" y="114" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="11">257: "he"</text>
        <text x="74" y="132" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="11">258: "e_"</text>
        <text x="74" y="150" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">259: "_t"  just minted</text>
        <rect x="360" y="52" width="220" height="120" rx="6" fill="none" stroke="#62d98a" strokeWidth="1.6" />
        <text x="374" y="74" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">decoder table (one step behind)</text>
        <text x="374" y="96" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="11">256: "th"</text>
        <text x="374" y="114" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="11">257: "he"</text>
        <text x="374" y="132" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="11">258: "e_"</text>
        <text x="374" y="150" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">259: pending its first use</text>
        <path d="M 285 110 L 355 110" fill="none" stroke="#f0b94b" strokeWidth="1.8" markerEnd="url(#lzwArrow)" />
        <defs>
          <marker id="lzwArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#f0b94b" />
          </marker>
        </defs>
        <text x="288" y="100" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">codes only</text>
        <text x="60" y="210" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">no codebook crosses the wire: both tables are shadows of the same stream</text>
        <text x="60" y="234" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">the corner: a code used the instant it is minted must be w + w[0]: forced, not guessed</text>
        <text x="60" y="262" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">measured: text 4.36x · log 4.65x · random bytes 0.70x (an expansion) · zlib wins every corpus</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'lzw_growing_phrase_dictionary.py',
  Viz: LzwViz,
  narration,
};
