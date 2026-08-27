import UkkonenViz from '../viz/UkkonenViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/suffix_tree_ukkonen_online.py?raw';
import { narration } from './suffix-tree-ukkonen-online.narration.js';

export const content = {
  given:
    'A long text to index once, then interrogate forever: is this substring present? what repeats? what do two texts share?',
  task: 'The suffix tree: a compressed trie of every suffix: built in linear time, online, reading left to right.',
  constraint:
    'Inserting the n suffixes naively costs Θ(n·depth): measured 358× worse on repetitive text, where it matters. The referees: exact suffix-set equality on 200 random strings, the 2(n+1) size theorem on every build, Python’s own `in` at 500 queries, and DP cross-checks on both repeat-structure clients.',

  origins: (
    <p>
      Weiner invented the structure in <strong>1973</strong>: Knuth
      reportedly called it the algorithm of the year: McCreight
      simplified the build in 1976, and <strong>Esko Ukkonen</strong>{' '}
      published the form everyone now learns in Algorithmica,{' '}
      <strong>1995</strong>: the first construction that is{' '}
      <em>online</em>: after each character the tree of the text so
      far is complete: and honest enough to teach. Its machinery:
      open leaf ends, the active point, rule 3&apos;s stop, suffix
      links: reads like a bag of tricks and is in fact one amortized
      argument wearing four masks.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>suffix tree</strong> itself: a compressed trie
      holding every suffix, so every substring of the text is a walk
      from the root. Search costs O(pattern): a 20-character query on
      the 199,589-character client walked exactly{' '}
      <strong>20 comparisons</strong>. Repeated structure reads off
      internal nodes: the deepest one <em>is</em> the longest
      repeated substring (47 characters here, brute-force-verified),
      and one generalized tree answers longest-common-substring
      against the DP on all 100 pairs.
    </p>
  ),
  heurRole: (
    <p>
      Supplies <strong>Ukkonen&apos;s online machinery</strong>: four
      ideas that make the build amortized O(n). Leaves stay open (a
      global end grows every leaf for free: once a leaf, always a
      leaf). The <em>active point</em> names where the next extension
      happens, so nothing is re-walked. Rule 3 stops a phase early:
      if this suffix is already present, all shorter ones are too.
      And <em>suffix links</em> teleport between extension sites.
      Measured: 199,589 characters in 464,432 extension steps:{' '}
      <strong>2.33 per character</strong>, asserted under 6.
    </p>
  ),

  picture: (
    <p>
      A railway map of every journey through the text. Each suffix is
      a train line starting at the central station; lines that begin
      identically <em>share track</em> until they must diverge, and a
      switch (an internal node) marks every divergence. Compressed
      track means a stretch with no switches is one long rail with a
      name painted on it, not a station per meter. Asking &quot;does
      this substring occur?&quot; is boarding at the station and
      following rails for exactly the pattern&apos;s length. And the
      switch <em>deepest into the network</em> is, by definition, the
      longest stretch of shared track: the longest repeated
      substring, read off the map with no search at all.
    </p>
  ),

  steps: [
    <>
      <strong>Stream:</strong> process the text left to right; after
      each character the tree of the prefix is complete (online).
    </>,
    <>
      <strong>Grow leaves for free:</strong> every leaf edge ends at
      a global pointer: one increment extends them all.
    </>,
    <>
      <strong>Extend at the active point:</strong> new leaf, or split
      the edge and hang one: wiring fresh suffix links as splits
      happen.
    </>,
    <>
      <strong>Stop on rule 3:</strong> the suffix is already present:
      so are all shorter ones: end the phase.
    </>,
    <>
      <strong>Teleport by suffix link</strong> to the next extension
      site: the amortized argument that lands 2.33 steps per
      character.
    </>,
  ],

  signals: [
    <>
      <strong>One text, many questions:</strong> build once, then
      substring queries in O(pattern): 20 comparisons for a 20-char
      probe, text length irrelevant.
    </>,
    <>
      <strong>Repetition is the subject:</strong> longest repeats,
      shared substrings, tandem structure: genomes and logs: exactly
      where the naive build measured 358× worse.
    </>,
    <>
      <strong>Online matters:</strong> the stream is still arriving
      and the index must be current after every character: the
      property the 1995 paper is named for.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>naive suffix insertion</strong>:
      each suffix walked into a compressed trie: and the race carries
      this page&apos;s honest surprise: on English-like text it loses
      only <strong>3.7×</strong> (suffixes diverge fast), while on
      17-periodic text it loses <strong>358×</strong>: the quadratic
      adversary is repetition, which is exactly what the
      structure&apos;s best clients (genomes, logs) are made of.
    </>
  ),

  strength: (
    <>
      <strong>Every claim has a referee.</strong> Leaf path-labels
      equal to the true suffix set on 200 random strings; the
      linear-size theorem (≤ 2(n+1) nodes, exactly n+1 leaves) on
      every build; 2.33 extension steps per character at scale;
      agreement with Python&apos;s <code>in</code> on 500 queries;
      the longest repeat brute-force-verified on 100 strings; and
      the generalized-tree LCS equal to the DP on all 100 pairs.
    </>
  ),
  weakness: (
    <>
      <strong>Memory, constants, and fragile beauty.</strong> The
      node objects cost real bytes: ~20 bytes per input character
      even in tight C, an order past the live suffix array&apos;s one
      integer: which is why bioinformatics largely migrated there.
      The build&apos;s correctness hangs on invariants (this
      page&apos;s naive baseline walked off the string the moment a
      terminator was forgotten): and the machinery resists casual
      modification in a way the array&apos;s sort-and-scan never
      does.
    </>
  ),

  problem: 'Full-text indexing',
  problemSlug: 'text-indexing',
  rivals: [
    {
      name: 'Suffix tree × Ukkonen',
      isThisUnit: true,
      algoName: 'Suffix tree',
      cost: 'O(n) build, O(p) query',
      wins: (
        <>
          <strong>The richest answers:</strong> substring in
          O(pattern), longest repeat and LCS read off internal nodes,
          online after every character: all referee-verified here.
        </>
      ),
      costs: (
        <>
          ~20 bytes per character and invariant-heavy machinery: the
          price of the pointers.
        </>
      ),
      when: 'Repeat-structure questions on one text, or a stream that must be queryable mid-arrival.',
    },
    {
      name: 'Suffix array × prefix doubling',
      algoName: 'Suffix array construction',
      cost: 'O(n log n) build',
      wins: (
        <>
          The live unit: the same suffix order in{' '}
          <em>one integer per character</em>: cache-friendly, simple,
          the modern bioinformatics default.
        </>
      ),
      costs: (
        <>
          Queries by binary search (O(p log n)) and repeat structure
          needs the LCP sidecar: the tree&apos;s free answers, paid
          for.
        </>
      ),
      when: 'Big texts where memory wins: the array is this structure flattened, and usually the right call.',
    },
    {
      name: 'Aho-Corasick × failure links',
      algoName: 'Aho-Corasick',
      cost: 'O(Σ patterns) build',
      wins: (
        <>
          The live unit and the exact dual: index the{' '}
          <em>patterns</em>, stream the text once: many needles, one
          haystack pass.
        </>
      ),
      costs: (
        <>
          The pattern set must be known up front: ad-hoc queries
          against one fixed text point back here.
        </>
      ),
      when: 'Dictionary scanning: virus signatures, keyword filters: the mirror image of this unit.',
    },
    {
      name: 'Trie × shared prefixes',
      algoName: 'Trie',
      cost: 'O(total length)',
      wins: (
        <>
          The live unit this structure compresses: one character per
          edge, transparent, perfect for prefix sets of{' '}
          <em>separate keys</em>.
        </>
      ),
      costs: (
        <>
          Uncompressed on n suffixes it is Θ(n²) nodes: the size
          theorem this page asserts is exactly what compression
          buys.
        </>
      ),
      when: 'Dictionaries of words: and as the mental model Ukkonen’s machinery decorates.',
    },
  ],
  neverUse: {
    name: 'Rebuilding the index per query',
    why: (
      <>
        The trap is disguised as simplicity: &quot;we only need one
        search right now&quot;, so each request runs a fresh scan:
        or worse, builds a fresh index, uses it once, and drops it.
        The arithmetic on this page&apos;s client: one build is
        464,432 steps; one query is <strong>20 comparisons</strong>.
        The build is worth twenty-three thousand queries: paying it
        per query multiplies every search by that factor, and paying
        a naive rebuild on repetitive data multiplies it by 358×
        more. Indexes are capital: build once, amortize forever: and
        when the workload really is one-shot, a plain scan
        (Python&apos;s <code>in</code>, or the live Boyer-Moore) is
        the honest tool: the crime is re-paying capital costs as
        operating costs.
      </>
    ),
  },

  contest: {
    instance:
      'build the index at n = 2,000 on two corpora, then serve 199,589 characters at scale; referee: exact suffix sets, the size theorem, and Python’s own `in` on 500 queries',
    columns: ['char comparisons', 'vs Ukkonen'],
    rows: [
      {
        method: 'Naive insert, english-ish',
        values: ['17,103', '3.7×'],
        verdict: 'suffixes diverge fast: the naive build merely loses',
      },
      {
        method: 'Naive insert, periodic',
        values: ['1,969,131', '358×'],
        verdict: 'repetition is the quadratic adversary: genomes, logs',
      },
      {
        method: 'Ukkonen online',
        isThisUnit: true,
        values: ['4,681 / 5,508', '1×'],
        best: 0,
        verdict: 'amortized O(n) on both: 2.33 steps/char at 200K scale',
      },
    ],
    source:
      "python solutions/suffix_tree_ukkonen_online.py prints this table and asserts: leaf path-labels equal to the true suffix set on 200 random strings; ≤ 2(n+1) nodes with exactly n+1 leaves on every build; 464,432 extension steps for 199,589 characters (2.33/char, < 6 asserted); 500 membership queries agreeing with Python's `in` with a 20-char query walking exactly 20 comparisons; the two-corpus naive race (3.7× and 358×); the longest repeat (47 chars) brute-verified on 100 strings; and generalized-tree LCS equal to the DP on all 100 pairs.",
  },

  figure: (
    <Figure
      id="fig-ukkonen-machinery"
      aspect="16 / 7"
      caption="Four masks of one amortized argument. Open leaves: every leaf edge ends at a global pointer, so one increment extends them all: free. The active point names where the next extension happens: nothing is re-walked. Rule 3 stops the phase: if this suffix is already in the tree, every shorter one is too. Suffix links teleport between extension sites. Total measured cost: 2.33 extension steps per character at 200,000 scale: the linear build that makes the index worth owning."
      cite={{
        text: 'Ukkonen, "On-line construction of suffix trees", Algorithmica 14, 1995: the online linear build. Weiner invented the structure (1973), McCreight simplified it (1976); Ukkonen made it teachable.',
        href: 'https://doi.org/10.1007/BF01206331',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="A small suffix tree with open leaves, a suffix link, and the active point annotated">
        <circle cx="70" cy="140" r="7" fill="none" stroke="#5da2ff" strokeWidth="2" />
        <line x1="77" y1="132" x2="240" y2="60" stroke="#5da2ff" strokeWidth="1.8" />
        <text x="130" y="82" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">ab</text>
        <circle cx="248" cy="57" r="7" fill="none" stroke="#5da2ff" strokeWidth="2" />
        <line x1="255" y1="52" x2="420" y2="30" stroke="#62d98a" strokeWidth="1.8" />
        <text x="330" y="32" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">cabx… →E</text>
        <line x1="255" y1="63" x2="420" y2="100" stroke="#62d98a" strokeWidth="1.8" />
        <text x="330" y="94" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">x… →E</text>
        <line x1="77" y1="146" x2="240" y2="180" stroke="#5da2ff" strokeWidth="1.8" />
        <text x="140" y="158" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">b</text>
        <circle cx="248" cy="182" r="7" fill="none" stroke="#5da2ff" strokeWidth="2" />
        <line x1="255" y1="178" x2="420" y2="160" stroke="#62d98a" strokeWidth="1.8" />
        <text x="330" y="162" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">cabx… →E</text>
        <line x1="255" y1="188" x2="420" y2="220" stroke="#62d98a" strokeWidth="1.8" />
        <text x="330" y="214" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">x… →E</text>
        <path d="M 248 66 C 240 120, 240 130, 248 173" fill="none" stroke="#f0b94b" strokeWidth="1.6" strokeDasharray="5 4" />
        <text x="178" y="126" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="10">suffix link: ab→b</text>
        <text x="440" y="30" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="10">→E: open leaves,</text>
        <text x="440" y="44" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="10">grown free by one</text>
        <text x="440" y="58" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="10">global pointer</text>
        <text x="40" y="262" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">measured: 2.33 extension steps/char at 199,589 chars · every build ≤ 2(n+1) nodes · a 20-char query walks 20 comparisons</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'suffix_tree_ukkonen_online.py',
  Viz: UkkonenViz,
  narration,
};
