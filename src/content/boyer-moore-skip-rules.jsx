import BoyerMooreViz from '../viz/BoyerMooreViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/boyer_moore_skip_rules.py?raw';
import { narration } from './boyer-moore-skip-rules.narration.js';

export const content = {
  given:
    'A text of n characters and a pattern of m.',
  task: 'Every occurrence: while reading fewer than n characters.',
  constraint:
    'Sublinearity is the whole point and the whole surprise: this page finds a 13-character pattern in its own 60,365-character build plan while inspecting 10.9% of it, measured: and the longer the pattern, the less of the text gets read (6.0% at m = 32).',

  origins: (
    <p>
      Boyer and Moore published the right-to-left scan in{' '}
      <strong>1977</strong>, and the claim still sounds illegal: find the
      needle without reading most of the haystack. Horspool showed in
      1980 that the bad-character rule alone usually suffices (Sunday
      trimmed further in 1986); Galil added the patch that makes the
      worst case linear in 1979. The idea&apos;s most famous deployment
      is <strong>grep</strong>: the celebrated &quot;why GNU grep is
      fast&quot; explanation opens with exactly this: it{' '}
      <em>does not look at most of the bytes</em>.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>right-to-left scan</strong>. At each alignment,
      compare the pattern from its <em>last</em> character backward. A
      mismatch there is not a failure: it is intelligence: the text
      character just revealed may not occur in the pattern at all, in
      which case no alignment overlapping it can ever match, and the
      pattern may leap its whole length. Left-to-right scanning can
      never learn this: KMP, measured on the same search, reads exactly
      100.0% of the text, by design.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>two skip tables</strong> that spend the
      intelligence. Bad character: slide until the mismatched text
      character sits under its rightmost occurrence in the pattern (or
      past everything, if absent). Good suffix: slide until the
      already-matched tail re-aligns with its next occurrence inside the
      pattern. Take the larger. On prose the first rule does nearly all
      the work (Horspool ties this unit at 6,599 inspections, measured):
      the second rule&apos;s keep is earned on <strong>small
      alphabets</strong>, where bad-character collapses (1.50n: more
      than the text!) and good-suffix holds the pair to 0.50n.
    </p>
  ),

  picture: (
    <p>
      Checking whether a 12-digit serial number appears on a long
      printed tape. The amateur reads the tape digit by digit. The
      inspector aligns the stencil, looks at the <em>last</em> window
      position only, and sees a symbol that appears nowhere in the
      serial: the stencil cannot match anywhere overlapping that spot,
      so it jumps its full length past it. One glance bought twelve
      positions. Most of the tape passes under the stencil{' '}
      <em>unread</em>: which is why the measured page leaves 89% of its
      own text untouched.
    </p>
  ),

  steps: [
    <>
      <strong>Precompute</strong> the bad-character map (rightmost index
      of each symbol) and the good-suffix table: O(m + σ), once.
    </>,
    <>
      <strong>Align and compare backward</strong> from the
      pattern&apos;s last character.
    </>,
    <>
      <strong>On mismatch:</strong> shift by the larger of the two
      rules&apos; recommendations (never less than 1).
    </>,
    <>
      <strong>On match:</strong> report; shift by the pattern&apos;s
      period (the good-suffix entry for a full match).
    </>,
    <>
      <strong>Repeat:</strong> long patterns leap further: 31.0% of the
      text read at m = 4, 6.0% at m = 32, measured on this site&apos;s
      own prose.
    </>,
  ],

  signals: [
    <>
      <strong>Long-ish patterns over big alphabets:</strong> words and
      phrases in text, byte signatures in binaries: the leap scales
      with m and with symbol diversity.
    </>,
    <>
      <strong>The text dwarfs the pattern</strong> and is scanned once:
      grep through logs, editors&apos; find, virus signatures: no index
      exists and none is worth building.
    </>,
    <>
      <strong>Reading is the cost:</strong> when bytes are expensive
      (cache misses, mmap faults), an algorithm that skips them beats
      one that streams them.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>KMP</strong>, a live unit here: its
      failure function guarantees linear worst case and never re-reads:
      and it read exactly <strong>60,365 of 60,365</strong> characters,
      100.0%, because a left-to-right scan must witness everything. That
      is the structural line this unit crosses: the question is not how
      cheaply to read each character: it is whether to read it at all.
    </>
  ),

  strength: (
    <>
      <strong>Sublinear on real text, deepening with m.</strong> 10.9%
      of the text read for a 13-character pattern (6,599 of 60,365,
      referee-checked against str.find), 6.0% at m = 32; the leap is
      the property no left-to-right method can have, and it is why
      grep&apos;s speed lore begins with this algorithm.
    </>
  ),
  weakness: (
    <>
      <strong>Small alphabets, short patterns, and a quadratic
      tail.</strong> On binary text the bad-character rule collapses
      (Horspool: 1.50n, more than the text; good-suffix holds the pair
      to 0.50n): DNA and bit-streams want other tools. At m ≤ 3 the
      leaps barely pay. And the unpatched worst case is real: a²⁰⁰⁰⁰
      searched for a²⁰ cost 399,620 inspections (&gt; 5n, measured):
      Galil&apos;s rule is the linearity fix, cited here, not
      implemented.
    </>
  ),

  problem: 'Substring search',
  problemSlug: 'substring-search',
  rivals: [
    {
      name: 'Boyer-Moore × both rules',
      isThisUnit: true,
      algoName: 'Boyer-Moore',
      cost: 'O(n/m) typical, O(nm) unpatched worst',
      wins: (
        <>
          <strong>10.9% of the text read</strong>, deepening to 6.0% at
          m = 32: and the good-suffix rule holds small alphabets to
          0.50n where bad-character alone drowns.
        </>
      ),
      costs: (
        <>
          Two tables, a subtle construction (good-suffix is a classic
          bug farm), and the quadratic tail without Galil.
        </>
      ),
      when: 'Single-pattern search in real text and bytes: the reason grep is fast.',
    },
    {
      name: 'Knuth-Morris-Pratt × failure function',
      algoName: 'Knuth-Morris-Pratt',
      cost: 'O(n + m) guaranteed',
      wins: (
        <>
          Linear worst case, never backs up in the text: the right tool
          for streams that cannot rewind, and the theory backbone.
        </>
      ),
      costs: (
        <>
          Reads <strong>100.0%</strong> of the text by design: measured
          here at exactly n: the guarantee costs the leap.
        </>
      ),
      when: 'Adversarial inputs, one-pass streams, and worst-case contracts.',
    },
    {
      name: 'Boyer-Moore-Horspool × bad-character only',
      algoName: 'Boyer-Moore-Horspool',
      cost: 'O(n/m) typical',
      wins: (
        <>
          One table, ten lines, and a <strong>measured exact tie</strong>{' '}
          with the full pair on this page&apos;s prose (6,599
          inspections both): the simplification that usually loses
          nothing. Sunday&apos;s quick-search variant trims further.
        </>
      ),
      costs: (
        <>
          Nothing in reserve when the alphabet shrinks: 1.50n on binary
          text, measured: reading half again more than the haystack.
        </>
      ),
      when: 'Everyday text search where the alphabet is rich and the code budget is small.',
    },
    {
      name: 'Aho-Corasick × failure links',
      algoName: 'Aho-Corasick',
      cost: 'O(n + Σm + matches)',
      wins: (
        <>
          Hundreds of patterns in one linear pass: the automaton
          amortizes what Boyer-Moore would re-scan per pattern.
        </>
      ),
      costs: (
        <>
          Reads every character, and the automaton&apos;s memory grows
          with the dictionary.
        </>
      ),
      when: 'Multi-pattern matching: content filters, intrusion signatures: a live unit on this site.',
    },
  ],
  neverUse: {
    name: 'Bad-character alone on a small alphabet',
    why: (
      <>
        On random binary text, Horspool read <strong>1.50n</strong>{' '}
        characters: fifty percent <em>more</em> than the text it was
        searching, measured, because the mismatched character is nearly
        always in the pattern and the shift collapses to a shuffle. The
        same instance held the full two-rule Boyer-Moore to 0.50n: the
        good-suffix table is not decoration; it is the small-alphabet
        insurance. Genomes, bitmasks, and binary protocols are exactly
        where the &quot;usually loses nothing&quot; simplification
        quietly loses everything.
      </>
    ),
  },

  contest: {
    instance:
      "this site's own build plan (60,365 chars), pattern 'the algorithm' (13 chars, 1 occurrence); referee: str.find agrees with every method; corpus is living, numbers as measured at build",
    columns: ['chars read', 'of the text'],
    rows: [
      {
        method: 'Naive, left-to-right',
        values: ['64,661', '107.1%'],
        verdict: 'reads it all, and some of it twice',
      },
      {
        method: 'KMP',
        values: ['60,365', '100.0%'],
        verdict: 'exactly n: the linear guarantee, priced',
      },
      {
        method: 'Horspool (bad-char only)',
        values: ['6,599', '10.9%'],
        verdict: 'ties the full pair on prose: see its binary fate below',
      },
      {
        method: 'Boyer-Moore × both rules',
        isThisUnit: true,
        values: ['6,599', '10.9%'],
        best: 1,
        verdict: '89% of the haystack was never read',
      },
    ],
    source:
      'python solutions/boyer_moore_skip_rules.py prints this table and asserts: all four methods equal the str.find referee across 600 adversarial trials (binary through English-like alphabets, present and absent patterns, overlaps); sublinearity deepening with pattern length (31.0% / 16.6% / 10.0% / 6.0% at m = 4/8/16/32); KMP reading ≥ n by design; the small-alphabet split (Horspool 1.50n vs full BM 0.50n on binary, near-tie on prose); and the unpatched worst case measured at 399,620 inspections for a²⁰⁰⁰⁰ vs a²⁰.',
  },

  figure: (
    <Figure
      id="fig-bm-leap"
      aspect="16 / 7"
      caption="The leap. Comparing right-to-left, the first character inspected is the most informative one: if it does not occur in the pattern at all, every alignment overlapping it is impossible and the pattern jumps its full length. The bad-character table prices that jump per symbol; the good-suffix table covers the case where a matched tail constrains the slide: its keep is earned on small alphabets, where bad-character alone reads more than the text (1.50n measured) and the pair still skips (0.50n)."
      cite={{
        text: 'Boyer & Moore, "A Fast String Searching Algorithm", CACM 20(10), 1977; Horspool 1980; Galil 1979 for the linear worst case. The grep lore is Haertel\'s "why GNU grep is fast".',
        href: 'https://doi.org/10.1145/359842.359859',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="A pattern aligned under text leaping past an impossible region after one mismatch">
        <text x="30" y="50" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="15" letterSpacing="4">w e   f o u n d   t h e   q u i e t   z o n e</text>
        <rect x="252" y="34" width="20" height="22" fill="rgba(226,96,108,0.25)" stroke="#e2606c" />
        <text x="30" y="96" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="15" letterSpacing="4">a l g o r i t h m</text>
        <path d="M 262 60 L 262 74" stroke="#e2606c" strokeWidth="1.5" />
        <text x="286" y="80" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">'q' is not in the pattern</text>
        <path d="M 160 120 C 260 150, 360 150, 452 124" fill="none" stroke="#f0b94b" strokeWidth="2.2" />
        <text x="250" y="168" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="12">leap m = 9: no overlap can match</text>
        <text x="30" y="210" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="12">one glance bought nine positions · the gray text is never read</text>
        <text x="30" y="242" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">measured on this site’s plan: 10.9% of 60,365 chars inspected (m = 13) · 6.0% at m = 32</text>
        <text x="30" y="266" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">KMP on the same search: 100.0%, exactly: left-to-right must witness everything</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'boyer_moore_skip_rules.py',
  Viz: BoyerMooreViz,
  narration,
};
