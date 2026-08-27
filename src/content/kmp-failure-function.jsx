import KmpViz from '../viz/KmpViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/kmp_failure_function.py?raw';
import { narration } from './kmp-failure-function.narration.js';

export const content = {
  given:
    'A text of n characters and a pattern of m characters, over any alphabet.',
  task: 'Report every position where the pattern occurs in the text, overlapping occurrences included.',
  constraint:
    'The text is read forward only. Once a character has been consumed, the search never backs up to look at it again. That one discipline is what the failure function exists to buy.',

  origins: (
    <p>
      James Morris and Vaughan Pratt worked the method out in 1970 in a
      Berkeley technical report. Donald Knuth arrived at the same algorithm
      independently, by tracing through Stephen Cook&apos;s 1971 theorem on
      two-way pushdown automata, and called it the first algorithm he had ever
      extracted from a theorem rather than invented; the three published
      jointly in <strong>1977</strong>. Morris had already built it into his
      text editor, where the code proved subtle enough that a maintainer who
      could not understand it later &quot;repaired&quot; it back into a slow
      loop. The pairing&apos;s one real cost has been on record since day one.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>discipline</strong>: two fingers, one on the text and
      one on the pattern, and the text finger <strong>never moves
      backward</strong>. Every character of the text is consumed exactly once,
      in order, which is why the same loop runs unchanged on a string in
      memory, a tape, or a socket. All the cleverness is in what happens to
      the pattern finger when a comparison fails.
    </p>
  ),
  heurRole: (
    <p>
      Answers one question in O(1): <strong>after matching j characters and
      failing, how much of that certainty survives?</strong> The failure
      function stores, for every prefix of the pattern, the length of its
      longest border: the longest proper prefix that is also a suffix. On a
      mismatch the pattern finger falls back to <strong>fail[j]</strong> and
      the text finger stays put. The table is built from the pattern alone, in
      O(m), by the same two-finger argument run on the pattern against itself.
    </p>
  ),

  picture: (
    <p>
      You are watching a ticker tape for a code word, and the tape only moves
      forward through the window; there is no rewind. When a promising run
      breaks at the ninth letter, you feel no panic about the eight letters
      gone by, because you know exactly what they were: they matched your code
      word, which you hold in your hand. The failure table is a card you
      prepared from the code word alone. It says: if you had matched eight and
      then broke, the last six of those letters are also how the code word
      begins, so carry on as if you had matched six. Every memory the method
      needs is about the pattern. None of it is about the tape.
    </p>
  ),

  steps: [
    <>
      <strong>Precompute</strong> fail[j] for every j: the length of the
      longest proper border of the pattern&apos;s first j characters. O(m),
      pattern only.
    </>,
    <>
      <strong>Walk</strong> the text with finger i and keep j, the number of
      pattern characters currently matched.
    </>,
    <>
      <strong>Match:</strong> text[i] equals pattern[j]. Advance both fingers.
    </>,
    <>
      <strong>Mismatch with j &gt; 0:</strong> set j to fail[j] and compare
      again. The text finger does not move; only certainty shrinks.
    </>,
    <>
      <strong>Mismatch at j = 0:</strong> nothing was at stake. Advance i.
    </>,
    <>
      <strong>j reaches m:</strong> record a match ending at i, set j to
      fail[m], and keep walking. Overlapping occurrences fall out for free.
    </>,
  ],

  signals: [
    <>
      The input is a <strong>stream</strong> you cannot store or rewind:
      sockets, tapes, sensor feeds, anything larger than memory.
    </>,
    <>
      The data is <strong>repetitive</strong>: genomes, logs, telemetry.
      Self-similar text is exactly where re-reading methods go quadratic.
    </>,
    <>
      You need a <strong>hard worst-case guarantee</strong>: a latency budget,
      or input an adversary chooses.
    </>,
  ],
  baseline: (
    <>
      The naive scan is the honest baseline, and on ordinary prose it is
      nearly unbeatable: <strong>122,917</strong> characters examined against
      KMP&apos;s <strong>122,329</strong> on the same 120,000 characters, a
      dead heat, because diverse text kills most alignments on their first
      letter. The repeat strand below is where it dies:{' '}
      <strong>1,850,895 against 120,611</strong>, a 15× gap, and every extra
      character is a re-read of something it had already seen.
    </>
  ),

  strength: (
    <>
      <strong>The guarantee travels.</strong> At most 2n + m comparisons on
      any input whatsoever, overlaps included, and the text finger never
      backs up, so the same twenty lines run on a string, a tape, or a live
      socket. The table itself is reusable structure: it is the border array,
      the periodicity detector, and the skeleton Aho-Corasick grows into a
      whole-dictionary matcher.
    </>
  ),
  weakness: (
    <>
      <strong>It reads everything.</strong> There is no skipping, so on
      ordinary prose Boyer-Moore examines <strong>nine times fewer</strong>{' '}
      characters (13,334 against 122,329, measured below). And the subtlety
      is real: the failure function has been getting &quot;repaired&quot;
      into bugs since Morris&apos;s own editor.
    </>
  ),

  problem: 'Substring search',
  problemSlug: 'substring-search',
  rivals: [
    {
      name: 'KMP × failure function',
      isThisUnit: true,
      algoName: 'Knuth-Morris-Pratt',
      cost: 'O(n + m) guaranteed',
      wins: (
        <>
          <strong>120,611</strong> characters examined on the repeat strand
          where every rival needs about 1.8 million: the only method here
          whose cost the input cannot choose.
        </>
      ),
      costs: (
        <>
          Examines every character: no skips, so it never beats n even on
          easy text. The table is subtle to hand-write correctly.
        </>
      ),
      when: 'Streams you cannot rewind, repetitive data, or any hard latency budget.',
    },
    {
      name: 'Naive scan',
      algoName: 'Naive string matching',
      cost: 'O(n·m) worst case',
      wins: (
        <>
          Ten lines, zero preprocessing, zero memory, and on prose it ties
          the field: <strong>122,917 against KMP&apos;s 122,329</strong>.
        </>
      ),
      costs: (
        <>
          Repeats are fatal: <strong>1,850,895</strong> characters, fifteen
          times the work, all of it re-reading text it had already seen.
        </>
      ),
      when: 'Short patterns and small one-off searches, where simplicity outranks guarantees.',
    },
    {
      name: 'Boyer-Moore',
      cost: 'O(n/m) typical',
      wins: (
        <>
          It skips: <strong>13,334</strong> characters examined on prose,
          nine times fewer than anything else on the bench. The engine inside
          grep.
        </>
      ),
      costs: (
        <>
          Needs the window in hand (no streaming), two preprocessing tables,
          and repeats collapse it to <strong>1,781,638</strong>, as bad as
          naive. Horspool and Sunday are its simplified variants, not
          separate methods.
        </>
      ),
      when: 'Long patterns, diverse alphabets, ordinary text you hold in memory.',
    },
    {
      name: 'Rabin-Karp',
      cost: 'O(n + m) expected',
      wins: (
        <>
          One rolling fingerprint generalizes: many patterns at once,
          plagiarism chunks, two-dimensional grids. Hash the shape instead of
          scanning it.
        </>
      ),
      costs: (
        <>
          Expected, not guaranteed: every hash hit is verified by re-reading,
          so the match-dense strand costs <strong>1,901,580</strong>, worst
          on the board.
        </>
      ),
      when: 'Many equal-length patterns at once, or when a fingerprint is the natural object.',
    },
  ],
  neverUse: {
    name: 'A suffix tree of the text, for one streaming search',
    why: (
      <>
        It answers in O(m) only after an O(n) build that holds{' '}
        <strong>ten to forty bytes per text character</strong> resident, so
        the index costs more than the question. On a stream it is not slow,
        it is <strong>impossible</strong>: the text must be gone the moment
        it passes. Indexing earns its keep when the text is fixed and the
        queries number in the thousands; that is full-text indexing, a
        different problem with its own page.
      </>
    ),
  },

  contest: {
    instance:
      'one work unit, characters examined (hash updates included), on two instances: a 120,000-character CA-repeat strand searched for the 30-character repeat (CA)×15 with 59,386 overlapping matches, and 120,000 characters of prose searched for an absent 13-letter word',
    columns: ['repeat strand', 'prose'],
    rows: [
      {
        method: 'Knuth-Morris-Pratt',
        isThisUnit: true,
        values: ['120,611', '122,329'],
        best: 0,
        verdict: 'never re-reads: wins the repeats 15-fold, holds even on prose',
      },
      {
        method: 'Naive scan',
        values: ['1,850,895', '122,917'],
        verdict: 'a dead heat on prose, then fatal re-reading on repeats',
      },
      {
        method: 'Boyer-Moore',
        values: ['1,781,638', '13,334'],
        best: 1,
        verdict: 'skipping collapses on repeats, then wins prose nine-fold',
      },
      {
        method: 'Rabin-Karp',
        values: ['1,901,580', '119,999'],
        verdict: 'the fingerprint never skips, and every hit is re-read to verify',
      },
    ],
    source:
      'python solutions/kmp_failure_function.py prints both tables and asserts the four methods return identical positions, that KMP stays under its 2n + m comparison bound, and that the naive scan really does back its text finger up while KMP never does.',
  },

  figure: (
    <Figure
      id="fig-kmp-jump"
      aspect="16 / 7"
      caption="The jump that never re-reads. Six characters matched, then a mismatch. The failure table knows the matched prefix CACACA ends in CACA, which is also how the pattern begins, so the pattern slides forward two and comparison resumes at the very same text character. The text finger stayed put; only the certainty moved."
      cite={{
        text: 'Knuth, Morris, and Pratt, "Fast Pattern Matching in Strings", SIAM Journal on Computing 6(2), 1977. Morris and Pratt first described the linear-time method in a 1970 Berkeley technical report.',
        href: 'https://doi.org/10.1137/0206024',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="A mismatch after six matched characters; the pattern shifts two so its four-character border realigns, and comparison resumes at the same text position">
        <text x="16" y="30" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="12">text · the finger is at position 6 and will not move back</text>
        {['C', 'A', 'C', 'A', 'C', 'A', 'C', 'A', 'T', 'A'].map((ch, i) => (
          <g key={`t${i}`}>
            <rect x={16 + i * 44} y={42} width={40} height={34} rx={4} fill={i === 6 ? 'rgba(93,162,255,0.25)' : 'rgba(255,255,255,0.04)'} stroke={i === 6 ? '#5da2ff' : '#232c40'} strokeWidth={i === 6 ? 2 : 1} />
            <text x={36 + i * 44} y={65} textAnchor="middle" fill="#e8ecf5" fontFamily="ui-monospace, monospace" fontSize="16">{ch}</text>
          </g>
        ))}
        <text x="16" y="106" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="12">first try · matched six, then T under the finger fails</text>
        {['C', 'A', 'C', 'A', 'C', 'A', 'T'].map((ch, i) => (
          <g key={`p1${i}`}>
            <rect x={16 + i * 44} y={116} width={40} height={34} rx={4} fill={i < 6 ? 'rgba(98,217,138,0.16)' : 'rgba(255,107,107,0.22)'} stroke={i < 6 ? '#62d98a' : '#ff6b6b'} strokeWidth={1.4} />
            <text x={36 + i * 44} y={139} textAnchor="middle" fill={i < 6 ? '#62d98a' : '#ff6b6b'} fontFamily="ui-monospace, monospace" fontSize="16">{ch}</text>
          </g>
        ))}
        <text x={300} y={139} fill="#ff6b6b" fontFamily="ui-monospace, monospace" fontSize="13">× mismatch</text>
        <path d="M 60 168 C 90 184, 130 184, 148 170" fill="none" stroke="#f0b94b" strokeWidth="1.8" markerEnd="none" />
        <text x="160" y="184" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="12">fail[6] = 4 · the border CACA re-aligns itself</text>
        <text x="16" y="212" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="12">second try · slide 6 − 4 = 2, resume at the same text character</text>
        {['C', 'A', 'C', 'A', 'C', 'A', 'T'].map((ch, i) => (
          <g key={`p2${i}`}>
            <rect x={16 + (i + 2) * 44} y={222} width={40} height={34} rx={4} fill={i < 4 ? 'rgba(240,185,75,0.18)' : i === 4 ? 'rgba(93,162,255,0.25)' : 'rgba(255,255,255,0.04)'} stroke={i < 4 ? '#f0b94b' : i === 4 ? '#5da2ff' : '#232c40'} strokeWidth={i === 4 ? 2 : 1.2} />
            <text x={36 + (i + 2) * 44} y={245} textAnchor="middle" fill={i < 4 ? '#f0b94b' : i === 4 ? '#5da2ff' : '#9aa5bd'} fontFamily="ui-monospace, monospace" fontSize="16">{ch}</text>
          </g>
        ))}
        <line x1={300} y1={80} x2={300} y2={218} stroke="#5da2ff" strokeWidth="1.6" strokeDasharray="5 4" />
        <text x={492} y={245} fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="12">nothing re-read</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'kmp_failure_function.py',
  Viz: KmpViz,
  narration,
};
