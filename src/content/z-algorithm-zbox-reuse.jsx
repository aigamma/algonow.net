import ZboxViz from '../viz/ZboxViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/z_algorithm_zbox_reuse.py?raw';
import { narration } from './z-algorithm-zbox-reuse.narration.js';

export const content = {
  given:
    'A string, and for every position one question: how long does the text here impersonate the beginning?',
  task: 'The full Z-array: Z[i] = the longest common prefix of s and s[i:]: in linear time, with a pattern matcher falling out of it.',
  constraint:
    'The naive answer re-verifies every suffix from scratch: 7,998,000 comparisons on the all-a adversary. The linear method is asserted linear by counter (3,999): and its deepest referee is a bridge: KMP’s failure function, reconstructed from the Z-array alone, equal to its direct computation on 200 strings.',

  origins: (
    <p>
      A rare pedigree: the Z-algorithm is <em>textbook-born</em>.
      Dan Gusfield&apos;s 1997 <em>Algorithms on Strings, Trees, and
      Sequences</em> introduced and named it as the clean first
      chapter of string matching: folklore machinery distilled so
      that KMP and Boyer-Moore could be derived from it rather than
      memorized. This site&apos;s shelf makes the family visible:
      the live KMP unit is the same information in another
      coordinate system (bridged and asserted below), and
      yesterday&apos;s Manacher is the same never-re-verify
      economics pointed at palindromes.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>prefix-similarity sweep</strong>: Z[i]
      measures how long the suffix at i copies the prefix: and one
      sentinel trick turns the array into a complete matcher: Z on
      pattern + &apos;\0&apos; + text reports every occurrence as a
      Z-value ≥ |pattern|: verified against Python&apos;s own{' '}
      <code>find</code> on 200 cases. Periodicity reads off the same
      array (p is a period iff Z[p] ≥ n−p: brute-verified): one
      array, three products.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>Z-box</strong>: the rightmost window
      [L, R] already verified to copy the prefix. A new position i
      inside it has a twin i−L back at the start: and inside the box
      the text <em>is</em> a certified copy: so Z[i] starts at
      min(Z[i−L], R−i+1), and fresh comparisons happen only past R.
      R only moves right: total comparisons under 2n: asserted at{' '}
      <strong>3,999 vs 7,998,000</strong> on the adversary: the
      Manacher mirror&apos;s exact economics, prefix flavor.
    </p>
  ),

  picture: (
    <p>
      A forger&apos;s registry. The opening of the document is the
      authentic signature; at every later position you ask how many
      characters forge it convincingly. The registry keeps one
      certificate: the furthest-reaching verified copy found so far
      (the Z-box). Anyone starting <em>inside</em> that copy points
      at their twin near the original: &quot;whatever you certified
      about them holds for me, we live in a verified duplicate&quot;:
      and inspection resumes only past the certificate&apos;s edge.
      Every fresh inspection extends the certificate. Nothing inside
      a verified copy is ever inspected twice: 3,999 inspections
      where naive diligence performs eight million.
    </p>
  ),

  steps: [
    <>
      <strong>Sweep left to right:</strong> Z[0] = n by convention;
      maintain the Z-box [L, R].
    </>,
    <>
      <strong>Inherit:</strong> for i ≤ R, Z[i] starts at
      min(Z[i−L], R−i+1): the twin&apos;s certificate.
    </>,
    <>
      <strong>Compare only past R</strong>: every successful
      comparison is new territory and extends some box.
    </>,
    <>
      <strong>Advance the box</strong> when i + Z[i] − 1 &gt; R: R
      only moves right: comparisons ≤ 2n, asserted.
    </>,
    <>
      <strong>Harvest:</strong> matching via the sentinel, periods
      via Z[p] ≥ n−p, and KMP&apos;s failure function
      reconstructible from the array (the bridge, asserted).
    </>,
  ],

  signals: [
    <>
      <strong>Prefix structure is the question:</strong> matching,
      borders, periods, string powers: the Z-array answers the
      family from one pass.
    </>,
    <>
      <strong>You want string algorithms you can derive:</strong> Z
      is the teachable root: KMP falls out of it (bridged here),
      and contest editorials assume it.
    </>,
    <>
      <strong>Repetitive input again:</strong> runs and periodic
      text are the naive scan&apos;s quadratic death and the
      box&apos;s best case: the adversary decides.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the <strong>naive per-position LCP
      scan</strong>: five lines, obviously correct (it referees all
      400 strings here), and quadratic on repetitive input:
      7,998,000 comparisons on the adversary against the box&apos;s
      3,999. On random text it is honestly fine: the same
      average-vs-adversary story the Manacher unit prices: runs are
      where the box earns its keep.
    </>
  ),

  strength: (
    <>
      <strong>Linear by counter, and refereed from four
      directions.</strong> Full array equality with the naive scan
      on 400 strings; comparisons ≤ 2n asserted on the adversary
      (2,000×); every pattern occurrence equal to Python&apos;s{' '}
      <code>find</code> on 200 cases; smallest periods
      brute-verified on 200 periodic-heavy strings; and the bridge:
      the live KMP unit&apos;s failure function{' '}
      <em>reconstructed from the Z-array alone</em> and asserted
      equal on 200 strings: two famous machines, one information
      content.
    </>
  ),
  weakness: (
    <>
      <strong>Offline on its own string, prefix-shaped only.</strong>{' '}
      The Z-array describes one fixed string: streaming a text past
      a pattern is KMP&apos;s native mode (the bridge means you can
      convert, but KMP&apos;s automaton form is what runs online).
      Questions that are not prefix-shaped: suffixes need the
      reversed pass, general substrings need the live suffix
      array/tree shelf: and the sentinel trick assumes a character
      outside the alphabet exists to be the sentinel.
    </>
  ),

  problem: 'Substring search',
  problemSlug: 'substring-search',
  rivals: [
    {
      name: 'Z-algorithm × the box',
      isThisUnit: true,
      algoName: 'Z-algorithm',
      cost: 'O(n), ≤ 2n cmps',
      wins: (
        <>
          <strong>3,999 vs 7,998,000</strong> on the adversary, the
          matcher and period detector free, and the most derivable
          machine on the string shelf.
        </>
      ),
      costs: (
        <>
          One fixed string, prefix questions, and a sentinel
          character to spare.
        </>
      ),
      when: 'Contest string work, teaching, and every prefix-shaped question in one pass.',
    },
    {
      name: 'KMP × failure function',
      algoName: 'Knuth-Morris-Pratt',
      cost: 'O(n), online',
      wins: (
        <>
          The live unit: the same information as automaton: streams
          text past a pattern with no sentinel and no lookahead:
          the deployable form.
        </>
      ),
      costs: (
        <>
          The failure function is famously error-prone to derive
          cold: the bridge here shows it IS the Z-array, rotated.
        </>
      ),
      when: 'Online matching in production: derive via Z, ship via KMP.',
    },
    {
      name: 'Manacher × mirror',
      algoName: "Manacher's algorithm",
      cost: 'O(n)',
      wins: (
        <>
          The live sibling: identical economics (inherit inside a
          verified window, pay only past the frontier) pointed at
          palindromes instead of prefixes.
        </>
      ),
      costs: (
        <>
          Answers symmetry, not prefix similarity: the twin trick
          transfers, the array does not.
        </>
      ),
      when: 'Palindromic questions: and as the second example that makes the pattern a pattern.',
    },
    {
      name: 'Suffix array × doubling',
      algoName: 'Suffix array construction',
      cost: 'O(n log n)',
      wins: (
        <>
          The live heavyweight: all-substrings questions, many
          patterns, LCP structure: everything the one-pass array
          cannot see.
        </>
      ),
      costs: (
        <>
          Build cost and machinery for questions Z answers in one
          linear sweep.
        </>
      ),
      when: 'Past prefix-shaped: the index shelf begins where the Z-array ends.',
    },
  ],
  neverUse: {
    name: 'Memorizing what you can derive',
    why: (
      <>
        The failure function&apos;s computation is the classic
        memorize-and-pray snippet: the while-loop with pi[k−1] that
        candidates transcribe from memory and get subtly wrong under
        pressure: an off-by-one there ships a matcher that is wrong
        only on <em>some</em> patterns, the worst kind of wrong.
        The bridge on this page is the alternative: the Z-array is
        derivable from a picture (a box, a twin, a frontier), and
        this page <em>proves</em> the failure function is the same
        information: reconstructed from Z and asserted equal on 200
        strings. Own the derivable form; convert when the deployable
        form is needed. A tool you can rebuild from a picture
        survives pressure: a memorized incantation fails exactly
        when it matters: this site&apos;s whole reason for pairing
        every algorithm with its <em>why</em>.
      </>
    ),
  },

  contest: {
    instance:
      "the Z-array of 'a' × 4,000 (the adversarial input); referee: the naive per-position LCP scan, full array equality on 400 strings",
    columns: ['comparisons', 'nature'],
    rows: [
      {
        method: 'Naive per-position LCP',
        values: ['7,998,000', 'n²/2'],
        verdict: 'every suffix re-verified from scratch',
      },
      {
        method: 'Z-algorithm',
        isThisUnit: true,
        values: ['3,999', '≤ 2n'],
        best: 0,
        verdict: 'the box’s certificate inherited: 2,000×, linear by counter',
      },
    ],
    source:
      "python solutions/z_algorithm_zbox_reuse.py prints this table and asserts: full Z-array equality with the naive scan on 400 strings; comparisons ≤ 2n on the adversary (3,999) with the baseline asserted quadratic (7,998,000); all pattern occurrences equal to Python's find on 200 sentinel-matcher cases; KMP's failure function reconstructed from the Z-array and equal to its direct computation on 200 strings (the bridge); and smallest periods equal to brute force on 200 periodic-heavy strings.",
  },

  figure: (
    <Figure
      id="fig-zbox"
      aspect="16 / 7"
      caption="The box's certificate. [L, R] is the rightmost stretch verified to copy the prefix. A new position i inside it has a twin i−L back at the start: inside a certified copy, the twin's Z-value transfers: Z[i] starts at min(Z[i−L], R−i+1), and comparisons resume only past R. Every success extends some box and R never retreats: comparisons ≤ 2n, asserted at 3,999 against the naive 7,998,000. The same page proves the bridge: KMP's failure function is this array in another coordinate system."
      cite={{
        text: 'Gusfield, "Algorithms on Strings, Trees, and Sequences", Cambridge, 1997: the book that named the Z-algorithm and taught a generation to derive KMP and Boyer-Moore from it rather than memorize them.',
        href: 'https://doi.org/10.1017/CBO9780511574931',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="A string bar with the prefix, a Z-box window, twin positions linked, and the frontier R">
        <rect x="40" y="120" width="560" height="26" fill="#1d2740" stroke="#2a3450" />
        <rect x="40" y="120" width="120" height="26" fill="rgba(93,162,255,0.25)" stroke="#5da2ff" strokeWidth="1.6" />
        <text x="70" y="138" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="12">prefix</text>
        <rect x="300" y="120" width="180" height="26" fill="rgba(98,217,138,0.18)" stroke="#62d98a" strokeWidth="1.6" />
        <text x="330" y="138" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="12">the Z-box: a certified copy</text>
        <text x="296" y="112" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">L</text>
        <text x="474" y="112" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">R</text>
        <circle cx="400" cy="160" r="5" fill="#f0b94b" />
        <text x="394" y="182" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="12">i</text>
        <circle cx="140" cy="160" r="5" fill="#f0b94b" />
        <text x="120" y="182" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="12">i−L</text>
        <path d="M 150 168 C 220 210, 330 210, 392 168" fill="none" stroke="#f0b94b" strokeWidth="1.5" strokeDasharray="5 4" />
        <text x="216" y="226" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">the twin’s certificate transfers: Z[i] ≥ min(Z[i−L], R−i+1)</text>
        <path d="M 482 133 L 560 133" fill="none" stroke="#e2606c" strokeWidth="2" markerEnd="url(#zArrow)" />
        <defs>
          <marker id="zArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#e2606c" />
          </marker>
        </defs>
        <text x="470" y="98" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">fresh comparisons only here</text>
        <text x="40" y="262" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">measured: 3,999 vs 7,998,000 on the adversary · the bridge: KMP’s failure function rebuilt from Z, exact on 200 strings</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'z_algorithm_zbox_reuse.py',
  Viz: ZboxViz,
  narration,
};
