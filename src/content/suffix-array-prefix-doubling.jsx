import SuffixArrayViz from '../viz/SuffixArrayViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/suffix_array_prefix_doubling.py?raw';
import { narration } from './suffix-array-prefix-doubling.narration.js';

export const content = {
  given:
    'A text of n characters that will be queried many times.',
  task: 'The sorted array of all n suffixes: an index answering locate, count, and longest-repeat forever after.',
  constraint:
    'Sorting suffixes naively costs their common prefixes: repetitive text drives one comparison toward n characters (measured: 121× on the adversary), and materializing the suffixes would need ~n²/2 memory: 1.8 GB for this page’s 66KB corpus, stated and not run.',

  origins: (
    <p>
      Manber and Myers introduced suffix arrays in <strong>1990</strong>{' '}
      as the space-frugal alternative to suffix trees (Weiner 1973,
      Ukkonen 1995): same questions, a fraction of the memory. The
      prefix-doubling construction descends from Karp-Miller-Rosenberg
      1972: the insight that ranks compose. Linear-time constructions
      arrived in a famous 2003 trio (Kärkkäinen-Sanders&apos; DC3 among
      them), and the structure&apos;s biggest client emerged in
      genomics: the <strong>FM-index</strong> built on the
      Burrows-Wheeler transform: itself just the suffix array read
      sideways: aligns billions of DNA reads a day.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>sort</strong>. The index <em>is</em> the sorted
      order of the n suffixes: nothing more: and every query is then
      binary search (locate and count in O(m log n), verified against a
      find-loop referee on 20 patterns), while the LCP array turns
      adjacent entries into structure: the longest repeated substring
      of this site&apos;s plan: 78 characters of its own boilerplate:
      fell out of one max().
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>doubling ranks</strong>. After round k, each
      suffix knows its rank among 2ᵏ-character prefixes: so round k+1
      sorts by the <em>pair</em> (rank[i], rank[i+2ᵏ]): two integers
      standing in for 2ᵏ⁺¹ characters. The horizon doubles per round,
      ceil(log₂ n) rounds always suffice (asserted), and the measured
      corpus finished in <strong>7</strong>: because its longest repeat
      is 78 &lt; 2⁷ characters: the round count and the LCP maximum
      corroborating each other exactly.
    </p>
  ),

  picture: (
    <p>
      Alphabetizing a phone book of names that share enormous family
      prefixes. The naive clerk compares two entries letter by letter
      from the start, every time: on repetitive text that is reading
      half the name per glance. The doubling clerk makes one pass
      assigning every 1-letter prefix a rank, then sorts by{' '}
      <em>pairs of ranks</em>: my first-half rank, my second-half rank:
      each pass doubling how much of every name is already summarized
      as a single number. Seven passes summarize 128 letters: and no
      name in this book agrees with another past 78.
    </p>
  ),

  steps: [
    <>
      <strong>Round 0:</strong> rank every suffix by its first
      character.
    </>,
    <>
      <strong>Round k:</strong> sort by (rank[i], rank[i+2ᵏ]): the
      pair summarizes 2ᵏ⁺¹ characters: then re-rank.
    </>,
    <>
      <strong>Stop when ranks are all distinct:</strong> ≤ ceil(log₂ n)
      rounds, 7 here.
    </>,
    <>
      <strong>Kasai for LCP in O(n):</strong> adjacent common-prefix
      lengths: repeats, and this page&apos;s certificate of
      sortedness.
    </>,
    <>
      <strong>Query by binary search:</strong> locate/count any pattern
      in O(m log n): the index amortizes over every future question.
    </>,
  ],

  signals: [
    <>
      <strong>Many queries, one text:</strong> search-in-book, genome
      lookups, plagiarism: the index pays once and answers forever:
      one-off questions belong to Boyer-Moore (a live unit).
    </>,
    <>
      <strong>Repeat structure is the question:</strong> longest
      repeated substring, common substrings, tandem repeats: the LCP
      array is the answer sheet.
    </>,
    <>
      <strong>Memory discipline:</strong> one integer per character
      (plus LCP): a fifth of a suffix tree&apos;s pointers, which is
      why arrays displaced trees in practice.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the <strong>char-by-char comparison
      sort</strong>: on this site&apos;s English prose it is genuinely
      fine (14,912 character compares at n = 1,000: the average common
      prefix is tiny). The terrain flips it: on &apos;ab&apos;×500 the
      same sort pays <strong>1,811,090</strong> compares: 121×:
      because every comparison wades through ~500 shared characters.
      Doubling used 10 rounds on both terrains: indifference is what
      the ranks buy.
    </>
  ),

  strength: (
    <>
      <strong>One structure, every substring question, certified.</strong>{' '}
      All 65,995 suffixes ordered with the sortedness proven
      adjacent-pair-by-adjacent-pair through a re-verified LCP array;
      20 pattern queries agreeing with the referee; the longest repeat
      surfaced by a max(); rounds bounded by log₂ n and finishing in 7.
      The index costs one sort and repays it on every query after.
    </>
  ),
  weakness: (
    <>
      <strong>Static, integer-hungry at giant scale, and log-factored.</strong>{' '}
      Edit the text and the array rebuilds (suffix trees and automata
      handle online growth: Ukkonen&apos;s construction is the t1
      sibling); n log n loses to the 2003 linear-time constructions on
      billion-character genomes; and each query pays log n where the
      FM-index&apos;s backward search pays O(m): compressed, which is
      why bioinformatics moved there.
    </>
  ),

  problem: 'Full-text indexing',
  problemSlug: 'text-indexing',
  rivals: [
    {
      name: 'Suffix array × prefix doubling',
      isThisUnit: true,
      algoName: 'Suffix array construction',
      cost: 'O(n log n) build, O(m log n) query',
      wins: (
        <>
          <strong>7 rounds</strong> to index 66K chars, one integer per
          character, terrain-indifferent (10 rounds on the adversary
          that 121×&apos;d the naive sort).
        </>
      ),
      costs: (
        <>
          Static text only, and the log factor at build and query that
          the linear constructions and FM-index respectively shave.
        </>
      ),
      when: 'The default full-text index: simple to build, verify, and binary-search: the workhorse before scale demands specialists.',
    },
    {
      name: 'Suffix tree × Ukkonen',
      algoName: 'Suffix tree',
      cost: 'O(n) build, online',
      wins: (
        <>
          Linear-time, <em>online</em> construction (the text can grow),
          and O(m) queries: the theory-complete structure of which the
          array is a flattening.
        </>
      ),
      costs: (
        <>
          10-20× the memory in pointers: the practical reason arrays
          displaced it almost everywhere.
        </>
      ),
      when: 'Streaming construction or algorithms that walk tree structure (matching statistics, online repeats).',
    },
    {
      name: 'FM-index × backward search',
      algoName: 'FM-index',
      cost: 'O(m) query, compressed',
      wins: (
        <>
          The suffix array read through the Burrows-Wheeler transform
          and then <em>compressed below the text itself</em>: O(m)
          counting queries: the engine aligning billions of DNA reads.
        </>
      ),
      costs: (
        <>
          Substantially subtler machinery (rank structures, sampling),
          and locate queries pay a sampling tax.
        </>
      ),
      when: 'Genome-scale search where the index must be smaller than the data: bioinformatics’ answer.',
    },
    {
      name: "Kasai's algorithm",
      cost: 'O(n) from text + array',
      wins: (
        <>
          The companion: LCP in linear time by walking suffixes in text
          order: and on this page, the <em>verifier</em>: its output
          certifies the whole ordering.
        </>
      ),
      costs: (
        <>
          Needs the suffix array first: a companion, not a competitor.
        </>
      ),
      when: 'The moment the array exists: repeats, distinct-substring counts, and certificates all start here.',
    },
  ],
  neverUse: {
    name: 'Materializing the suffixes',
    why: (
      <>
        sorted(all suffix strings) is the referee at small n and a
        memory bomb at scale: the slices hold ~n²/2 characters:{' '}
        <strong>1.8 GB for this 66KB text</strong>, stated and
        deliberately not run: a 10 MB log would want 50 TB. The
        seduction is that it is one line and correct: the page uses
        exactly that line as its small-n referee: the sin is only
        scale. Indexes exist to <em>avoid</em> materializing what they
        index: an index that copies the text quadratically has
        misunderstood its job.
      </>
    ),
  },

  contest: {
    instance:
      "this site's own plan (65,995 chars) plus the 'ab'×500 adversary; sortedness certified adjacent-pair-by-adjacent-pair via a re-verified Kasai LCP array; queries refereed by a find-loop",
    columns: ['cost, measured', 'terrain'],
    rows: [
      {
        method: 'Naive slice sort',
        values: ['~n²/2 chars RAM', 'referee at small n'],
        verdict: '1.8 GB here: stated, not run: the memory bomb',
      },
      {
        method: 'Char-by-char cmp sort',
        values: ['14,912 vs 1,811,090', 'prose fine, repeats 121×'],
        verdict: 'pays the LCP per comparison: terrain-dependent',
      },
      {
        method: 'Prefix doubling',
        isThisUnit: true,
        values: ['7 rounds × n log n', 'indifferent (10 on the adversary)'],
        best: 0,
        verdict: 'two integers stand in for 2ᵏ characters',
      },
    ],
    source:
      "python solutions/suffix_array_prefix_doubling.py prints this table and asserts: 300 slice-refereed small builds across four text shapes; the full 65,995-suffix ordering certified pair-by-pair via a Kasai LCP array itself re-verified character-by-character (common run holds, is maximal, and orders strictly); rounds ≤ ceil(log₂ n), measured 7 (corroborating the 78-char max repeat < 2⁷); 20 pattern locates/counts equal to the find-loop referee; the longest repeated substring certified to occur twice; and the adversary ratio 121× measured.",
  },

  figure: (
    <Figure
      id="fig-prefix-doubling"
      aspect="16 / 7"
      caption="Ranks compose. After round k every suffix carries one integer summarizing its first 2ᵏ characters: so comparing 2ᵏ⁺¹ characters is comparing two integers: (my rank, my neighbor-at-2ᵏ's rank). The horizon doubles per round; ceil(log₂ n) rounds always finish, and the measured corpus finished in 7 because no two of its suffixes agree past 78 characters: the round count and the LCP maximum are the same fact seen twice."
      cite={{
        text: 'Manber & Myers, "Suffix arrays: a new method for on-line string searches", SIAM J. Computing 22, 1993 (SODA 1990); the doubling idea descends from Karp-Miller-Rosenberg 1972; LCP: Kasai et al. 2001.',
        href: 'https://doi.org/10.1137/0222058',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="Prefix doubling: rank pairs summarizing exponentially growing prefixes">
        <text x="30" y="30" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="12">round k: suffix i is the pair (rank</text>
        <text x="30" y="52" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="13">sort key = ( rank[i] , rank[i + 2ᵏ] )</text>
        {[1, 2, 4, 8].map((span, r) => (
          <g key={r}>
            <text x="30" y={98 + r * 40} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">{`round ${r}:`}</text>
            <rect x="120" y={84 + r * 40} width={span * 28} height="20" fill="rgba(93,162,255,0.15)" stroke="#5da2ff" rx="3" />
            <rect x={120 + span * 28} y={84 + r * 40} width={span * 28} height="20" fill="rgba(240,185,75,0.15)" stroke="#f0b94b" rx="3" />
            <text x={132 + span * 56} y={98 + r * 40} fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">{`= ${2 * span} chars as 2 ints`}</text>
          </g>
        ))}
        <text x="30" y="262" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="12">measured: 7 rounds for 65,995 chars · max repeat 78 &lt; 2⁷ = 128 · the same fact twice</text>
        <text x="30" y="282" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">then Kasai’s LCP certifies every adjacent pair: the index ships with its proof</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'suffix_array_prefix_doubling.py',
  Viz: SuffixArrayViz,
  narration,
};
