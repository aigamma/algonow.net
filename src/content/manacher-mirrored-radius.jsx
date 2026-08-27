import ManacherViz from '../viz/ManacherViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/manacher_mirrored_radius.py?raw';
import { narration } from './manacher-mirrored-radius.narration.js';

export const content = {
  given:
    'A string, and the question every DNA scanner, plagiarism checker, and interview room eventually asks: the longest stretch that reads the same both ways.',
  task: 'The longest palindromic substring: with its location: in linear time.',
  constraint:
    'Every center could expand to the edge: the all-a adversary makes naive expansion pay 8,002,000 match steps. The linear method must be asserted linear (expansions ≤ 2n by counter, 7,999 measured) and equal to two referees: center expansion on 400 strings with witnesses checked, and brute force over every substring on 60.',

  origins: (
    <p>
      Glenn <strong>Manacher</strong>, JACM 1975: a linear-time
      algorithm for the smallest <em>initial</em> palindrome, built
      on KMP-era ideas. Competitive programming folklore extended it
      into the general all-centers form everyone now means by
      &quot;Manacher&quot;: with the separator transform (#a#b#a#)
      that unifies odd and even palindromes as its standard opening
      move. The modern heir is the Eertree (2015), which indexes{' '}
      <em>every distinct</em> palindrome: but the mirror trick
      below is where linear palindromy began.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>center sweep</strong>: transform the string
      with separators so every character and every gap is a center
      (odd and even unified), then grow a radius at each center
      while the ends match: tracking the rightmost reach R and its
      center C. The sweep&apos;s bill is the expansions: and{' '}
      <strong>every successful expansion pushes R rightward</strong>,
      R never retreats: so total expansions ≤ n: the entire
      linearity proof in one sentence, asserted here by counter:
      7,999 on the 4,000-a adversary.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>mirrored radius</strong>: a new center i
      inside R has a twin j = 2C − i, mirrored across C: and inside
      the big palindrome the text reads identically both ways, so
      whatever j verified, i inherits: P[i] starts at min(P[j],
      R − i) instead of zero. Audited at 50,000 palindrome-dense
      characters: <strong>60% of all radius was inherited</strong>{' '}
      (149,750 of 249,748 units): verified once, reused forever:
      the same never-re-verify economics as KMP&apos;s failure
      function, pointed at symmetry instead of prefixes.
    </p>
  ),

  picture: (
    <p>
      A hall of mirrors with one great mirror already mounted: the
      big palindrome spanning to R. Stand anywhere inside it and
      look left: whatever the hall already certified about your
      twin&apos;s reflection: &quot;a palindrome of radius 4 lives
      there&quot;: is certified about you too, because the great
      mirror <em>is</em> the certificate that both halves match.
      Your only fresh work begins where the great mirror ends:
      peeking past R: and every peek that succeeds extends the great
      mirror itself, so the next visitors inherit more. The hall
      never re-checks a reflection: that discipline, alone, is the
      difference between 8 million steps and 7,999.
    </p>
  ),

  steps: [
    <>
      <strong>Transform:</strong> interleave separators: #a#b#a#:
      one center per char and per gap: odd/even unified.
    </>,
    <>
      <strong>Inherit:</strong> for center i inside R: P[i] =
      min(P[mirror], R − i): the free start.
    </>,
    <>
      <strong>Expand</strong> past the inherited radius while ends
      match: only these steps cost.
    </>,
    <>
      <strong>Advance the frontier:</strong> if i + P[i] &gt; R,
      this palindrome reaches further: C, R update: R only moves
      right.
    </>,
    <>
      <strong>Read everything off P:</strong> the longest (max), and
      the count of all palindromic substrings (Σ⌈P/2⌉: verified
      against enumeration).
    </>,
  ],

  signals: [
    <>
      <strong>Symmetry is the query:</strong> palindromic repeats in
      DNA (hairpins, restriction sites), aesthetic scans, puzzle
      engines: reads-both-ways is the actual structure.
    </>,
    <>
      <strong>Repetitive input is expected:</strong> the adversary
      (runs, near-runs) is exactly where naive expansion dies
      quadratically: 8M steps at n = 4,000, measured.
    </>,
    <>
      <strong>You need all centers, not one:</strong> the radius
      array answers longest, count, and per-position questions in
      one pass: the interview escalations come free.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>center expansion</strong>:
      expand around all 2n−1 centers: fifteen lines, perfectly
      correct (it referees this page&apos;s 400 strings), and O(n²)
      when palindromes nest: 8,002,000 steps on the adversary
      against Manacher&apos;s 7,999. On random text it is nearly
      linear in practice: the honest note: the adversary, not the
      average, is why the mirror exists.
    </>
  ),

  strength: (
    <>
      <strong>Linearity asserted, not claimed: and referees
      stacked.</strong> Total expansions counted under 2n on the
      adversary (7,999 vs 8,002,000: 1,000×); equal to center
      expansion on 400 strings with every witness verified to be a
      palindrome of the reported length; equal to full-substring
      brute force on 60; the count identity Σ⌈P/2⌉ verified against
      enumeration; and the mirror audit quantifying the reuse: 60%
      of all radius inherited.
    </>
  ),
  weakness: (
    <>
      <strong>One question, exact matches, contiguous only.</strong>{' '}
      Manacher answers palindromic <em>substrings</em>: subsequences
      (the DP cousin), approximate palindromes (mismatch budgets),
      and gapped biology motifs all outgrow the mirror: symmetry
      with errors breaks the inheritance argument. Indexing{' '}
      <em>every distinct</em> palindrome for repeated queries is the
      Eertree&apos;s job: and on random non-repetitive text the
      humble n² expander is honestly competitive, since deep nesting
      is what it needs to fail.
    </>
  ),

  problem: 'Palindromic substrings',
  problemSlug: 'palindrome-substrings',
  rivals: [
    {
      name: 'Manacher × mirror reuse',
      isThisUnit: true,
      algoName: "Manacher's algorithm",
      cost: 'O(n), ≤ 2n expansions',
      wins: (
        <>
          <strong>7,999 steps where expansion pays 8,002,000</strong>:
          linearity by the R-only-moves-right argument, asserted by
          counter: and the whole radius array as a by-product.
        </>
      ),
      costs: (
        <>
          Exact, contiguous palindromes only: errors, gaps, and
          subsequences break the mirror&apos;s certificate.
        </>
      ),
      when: 'Longest/count palindrome questions at scale, and repetitive inputs above all.',
    },
    {
      name: 'Center expansion',
      algoName: "Manacher's algorithm",
      cost: 'O(n²) worst',
      wins: (
        <>
          Fifteen transparent lines, no transform, no frontier: this
          page&apos;s referee: and near-linear on random
          non-repetitive text.
        </>
      ),
      costs: (
        <>
          Nested palindromes are its death: the all-a adversary
          bills n²/2, measured at 8 million.
        </>
      ),
      when: 'Small inputs, interviews under time pressure, and anywhere the adversary cannot reach.',
    },
    {
      name: 'Suffix array × doubling',
      algoName: 'Suffix array construction',
      cost: 'O(n log n) + LCP',
      wins: (
        <>
          The live unit&apos;s road: index s + reverse(s), and
          longest-common-extension queries answer palindrome
          questions <em>and</em> a hundred others from one
          structure.
        </>
      ),
      costs: (
        <>
          Heavy machinery for one symmetric question: the mirror
          gets the same answer in one pass and no index.
        </>
      ),
      when: 'When the suffix index already exists for other reasons: palindromes ride along.',
    },
    {
      name: 'Eertree (palindromic tree)',
      algoName: 'Eertree',
      cost: 'O(n) build',
      wins: (
        <>
          The 2015 heir: one node per <em>distinct</em> palindrome
          (at most n + 2 exist: a lovely theorem): occurrence
          counts, suffix-palindrome chains, online.
        </>
      ),
      costs: (
        <>
          A linked structure with two link types: real machinery for
          questions the radius array cannot ask.
        </>
      ),
      when: 'Distinct-palindrome inventories and factorization problems: past longest-and-count.',
    },
  ],
  neverUse: {
    name: 'Trusting average-case on adversarial input',
    why: (
      <>
        Center expansion is honestly near-linear on random text:
        which is exactly how it gets shipped. Then production meets
        a run: repeated characters in DNA, padded logs, generated
        test data: and the quadratic wakes: 8,002,000 steps at
        n = 4,000, a hundred billion at n = 10⁶: the service that
        was fine for months times out on one weird file. The
        pattern generalizes past palindromes: quicksort&apos;s
        sorted-input death (the live quickselect unit measured it),
        hash floods, regex catastrophes: <em>average-case comfort
        plus adversarial input is an outage schedule</em>. The
        defense is this page&apos;s habit: know the adversary,
        measure on it, and prefer machinery: the mirror: whose
        guarantee is worst-case: R only moves right, no matter what
        the string does.
      </>
    ),
  },

  contest: {
    instance:
      "longest palindromic substring of 'a' × 4,000 (the adversarial input); referee: center expansion on 400 strings with witnesses verified, full enumeration on 60",
    columns: ['match steps', 'nature'],
    rows: [
      {
        method: 'Center expansion',
        values: ['8,002,000', 'n²/2'],
        verdict: 'every center re-verifies to the edge: the nesting is its death',
      },
      {
        method: 'Manacher',
        isThisUnit: true,
        values: ['7,999', '≤ 2n'],
        best: 0,
        verdict: 'R only moves right: 1,000×, with linearity asserted by counter',
      },
    ],
    source:
      "python solutions/manacher_mirrored_radius.py prints this table and asserts: equality with center expansion on 400 strings (palindrome-dense, mixed, and planted) with every witness verified to be a palindrome of the reported length; equality with brute force over all substrings on 60 strings; the count identity Σ⌈P/2⌉ equal to enumeration on 60 more; expansions ≤ 2n+1 on the adversary (7,999) vs the baseline's asserted-quadratic 8,002,000; and the mirror audit: 60% of all radius inherited (149,750 of 249,748) at 50,000 chars.",
  },

  figure: (
    <Figure
      id="fig-manacher-mirror"
      aspect="16 / 7"
      caption="The great mirror pays for the small ones. A palindrome of center C reaches R; a new center i inside it has a twin j = 2C − i, and whatever radius j verified, i inherits: min(P[j], R − i) comes free. Fresh work begins only past R, and every success extends R: since R never retreats, total expansions stay under 2n: the linearity proof is one sentence, and this page asserts it by counter: 7,999 expansions where naive re-verification pays 8,002,000."
      cite={{
        text: 'Manacher, "A New Linear-Time On-Line Algorithm for Finding the Smallest Initial Palindrome of a String", JACM 22(3), 1975: the mirror trick; folklore generalized it to all centers, and the Eertree (2015) is its modern heir.',
        href: 'https://doi.org/10.1145/321892.321896',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="A palindrome arc spanning to R with mirrored centers i and j inheriting radius">
        <line x1="40" y1="170" x2="600" y2="170" stroke="#2a3450" strokeWidth="2" />
        <path d="M 120 170 A 190 190 0 0 1 500 170" fill="none" stroke="#5da2ff" strokeWidth="2.2" />
        <circle cx="310" cy="170" r="6" fill="#5da2ff" />
        <text x="300" y="196" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="12">C</text>
        <line x1="500" y1="158" x2="500" y2="182" stroke="#5da2ff" strokeWidth="2" />
        <text x="494" y="150" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="12">R</text>
        <path d="M 180 170 A 45 45 0 0 1 270 170" fill="none" stroke="#62d98a" strokeWidth="2" />
        <circle cx="225" cy="170" r="5" fill="#62d98a" />
        <text x="218" y="196" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="12">j</text>
        <path d="M 350 170 A 45 45 0 0 1 440 170" fill="none" stroke="#f0b94b" strokeWidth="2" strokeDasharray="6 4" />
        <circle cx="395" cy="170" r="5" fill="#f0b94b" />
        <text x="390" y="196" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="12">i</text>
        <path d="M 240 130 C 280 100, 340 100, 380 130" fill="none" stroke="#9aa5bd" strokeWidth="1.2" strokeDasharray="3 4" />
        <text x="266" y="96" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">i inherits j’s radius: free</text>
        <text x="508" y="196" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">fresh work only past R</text>
        <text x="40" y="240" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">R never retreats ⇒ expansions ≤ 2n: measured 7,999 vs 8,002,000 on the all-a adversary</text>
        <text x="40" y="264" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">the audit: 60% of all radius inherited at 50,000 chars · count identity Σ⌈P/2⌉ enumeration-verified</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'manacher_mirrored_radius.py',
  Viz: ManacherViz,
  narration,
};
