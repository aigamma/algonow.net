import BitapViz from '../viz/BitapViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/bitap_bitmask_fuzzy_states.py?raw';
import { narration } from './bitap-bitmask-fuzzy-states.narration.js';

export const content = {
  given:
    'A pattern, a long text, and the admission that the text lies a little: a typo, a sequencing error, a mistranscribed base.',
  task: 'Every position where the pattern matches with at most k edits: insertions, deletions, substitutions: in one pass.',
  constraint:
    'Exact search is blind to a single substitution (measured below: it misses the planted site outright). The dynamic program sees everything and pays n·m cells. The question is whether the DP column can ride inside a machine word: and the referee is that same DP, agreeing on every end position across 400 exhaustive cases.',

  origins: (
    <p>
      October 1992, one issue of the CACM, two papers back to back:
      Baeza-Yates and Gonnet&apos;s shift-or (pages 74–82), the exact
      bitmask scan: and <strong>Wu and Manber&apos;s</strong>{' '}
      &quot;Fast Text Searching Allowing Errors&quot; (pages 83–91),
      which stacked k+1 of those registers into the fuzzy machine and
      shipped it as <code>agrep</code>: for years the fastest way on
      Unix to grep with typos. The idea is older than both papers:
      Bálint Dömölki ran pattern automata through bit-vectors in
      1964: but 1992 is when the trick met the tool everyone wanted.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>one-pass scan</strong>: read the text left to
      right, constant work per character, report every position where
      a match <em>ends</em>. No preprocessing of the text, no index,
      no backtracking: the pattern is compiled once into per-letter
      bitmasks and the text flows through. 240,000 word operations on
      the 120,000-base client: two per character, k+1 in general.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>bitmask state registers</strong>: bit j of
      R_d means &quot;the pattern&apos;s first j+1 characters match a
      suffix of what has been read, with at most d errors&quot;. One
      shift-AND against the letter&apos;s mask advances{' '}
      <em>every prefix hypothesis at once</em>; three extra ORs per
      error level splice in substitution, insertion, and deletion.
      The whole Sellers DP column lives in k+1 words: measured{' '}
      <strong>2,880,000 DP cells against 240,000 word-ops</strong>:
      the same arithmetic, packed 24 lanes wide.
    </p>
  ),

  picture: (
    <p>
      A row of two dozen lamps, one per pattern prefix. Each text
      character throws one big lever: the shift slides every lit lamp
      one place right (your hypothesis grew by a letter), and the
      letter&apos;s mask snuffs every lamp whose next pattern
      character is not the letter just read. Lamps light, cascade,
      die: and when the last lamp lights, a full match just ended
      here. The fuzzy version installs a second row wired to the
      first: when a lamp in the exact row dies of a typo, the
      one-error row inherits its glow and carries on. In the client
      below you can watch the exact row go dark at the mutated base
      while the k=1 row sails through to the finish lamp.
    </p>
  ),

  steps: [
    <>
      <strong>Compile:</strong> per letter c, mask B[c] with bit j set
      iff pattern[j] = c.
    </>,
    <>
      <strong>Scan:</strong> R₀ = ((R₀ ≪ 1) | 1) &amp; B[c]: every
      prefix hypothesis advances or dies in one word-op.
    </>,
    <>
      <strong>Stack the error levels:</strong> R_d also ORs in
      substitution (R_{'{'}d−1{'}'} ≪ 1), deletion, and insertion
      splices: three extra ops per level.
    </>,
    <>
      <strong>Report:</strong> the accept bit (position m−1) lit in
      R_k means a ≤k-edit match ends here.
    </>,
    <>
      <strong>Mind the word:</strong> in C the mask dies at 64
      pattern chars; Python&apos;s big ints keep going but each op
      spans ⌈m/64⌉ words: a cost cliff, not a correctness cliff:
      verified at m = 96.
    </>,
  ],

  signals: [
    <>
      <strong>The text lies a little:</strong> OCR output, sequencing
      reads, user queries: exact search measured missing a planted
      one-substitution site entirely.
    </>,
    <>
      <strong>Short pattern, long text, no index:</strong> the
      pattern fits a word and the text streams past once: agrep&apos;s
      exact niche.
    </>,
    <>
      <strong>Positions suffice:</strong> you need <em>where</em>{' '}
      matches end, not the edit script: bitap keeps no traceback, and
      that absence is its speed.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the <strong>Sellers DP</strong>: the live
      Wagner-Fischer unit&apos;s approximate-matching form: which
      finds everything bitap finds (it is this page&apos;s referee,
      agreeing on every end position) at n·m cells paid one at a
      time. Bitap is not smarter than the DP: it is the{' '}
      <em>same recurrence</em>, restated so a machine word computes
      24 cells per instruction.
    </>
  ),

  strength: (
    <>
      <strong>One pass, word-parallel, and referee-matched
      everywhere.</strong> Agreement with the Sellers DP on all 400
      exhaustive small cases (k = 0, 1, 2, alphabets of 2 and 4) and
      on the full client; exact mode equal to the naive scan; the
      planted typo pinned at base 71,003 that <code>find</code>{' '}
      misses; 12× fewer operations than the DP, each op 24 lanes
      wide; and the 96-character pattern: past C&apos;s word cliff:
      still exact on Python&apos;s big ints.
    </>
  ),
  weakness: (
    <>
      <strong>Positions, not alignments: and the word sets the
      price.</strong> Bitap reports where matches end: it keeps no
      traceback, so the edit script (which base changed?) needs the
      live Wagner-Fischer or Smith-Waterman machinery. Cost scales
      with (k+1)·⌈m/64⌉ words per character: long patterns and large
      k erode the packing that is its entire advantage. And it finds
      one pattern: for dictionaries, the live Aho-Corasick automaton
      is the tool.
    </>
  ),

  problem: 'Approximate string matching',
  problemSlug: 'approximate-string-matching',
  rivals: [
    {
      name: 'Bitap × bitmask states',
      isThisUnit: true,
      algoName: 'Bitap algorithm',
      cost: 'O(n·(k+1)) word-ops',
      wins: (
        <>
          <strong>240,000 word-ops vs 2,880,000 DP cells</strong> for
          identical answers: one streaming pass, no index, typos
          included.
        </>
      ),
      costs: (
        <>
          End positions only (no edit script); the word size caps the
          pattern; k+1 registers cap the error budget.
        </>
      ),
      when: 'Short patterns, streaming text, small k: agrep’s home ground.',
    },
    {
      name: 'Wagner-Fischer × the table',
      algoName: 'Wagner-Fischer',
      cost: 'O(n·m) cells',
      wins: (
        <>
          The live unit and this page&apos;s referee: the full table
          keeps the traceback: it can say <em>which</em> edit
          happened, and handles any m and k.
        </>
      ),
      costs: (
        <>
          Every cell paid individually: 12× more operations here for
          the same positions.
        </>
      ),
      when: 'When the alignment itself matters, or the pattern outgrows the word.',
    },
    {
      name: 'Smith-Waterman × zero floor',
      algoName: 'Smith-Waterman',
      cost: 'O(n·m), scored',
      wins: (
        <>
          The live unit for <em>weighted</em> similarity: match
          bonuses, gap penalties, local islands: biology&apos;s
          actual scoring, not unit-cost edits.
        </>
      ),
      costs: (
        <>
          Full DP cost and scoring-matrix tuning: bitap&apos;s
          unit-cost edits are a special case worth 12×.
        </>
      ),
      when: 'Alignment quality under a real substitution model: past yes-or-no matching.',
    },
    {
      name: 'Boyer-Moore × skip tables',
      algoName: 'Boyer-Moore',
      cost: 'sublinear, exact only',
      wins: (
        <>
          The live unit for <em>exact</em> search: skips most of the
          text entirely (measured 0.50n there): faster than any
          scanner when zero errors is truly the spec.
        </>
      ),
      costs: (
        <>
          One substitution is invisibility: measured here missing the
          planted site outright.
        </>
      ),
      when: 'Clean text, exact spec: and never on data that lies.',
    },
  ],
  neverUse: {
    name: 'Exact search on text that lies',
    why: (
      <>
        The client makes it concrete: a 24-base probe, planted in a
        120,000-base genome with <em>one</em> substituted base:{' '}
        <code>find</code> returns −1, bitap at k = 0 agrees, and both
        are working exactly as specified: exact means exact, and one
        wrong character is total invisibility. Sequencing reads err
        at every position; OCR mangles; users typo. Running exact
        search over such data does not degrade gracefully: it returns
        clean, confident, <em>empty</em> results: the most dangerous
        kind of wrong. If the data can lie, the spec must budget for
        errors: k = 1 here found the site for two word-ops per
        character. The failure is not the algorithm&apos;s: it is
        specifying &quot;exact&quot; for a world that is not.
      </>
    ),
  },

  contest: {
    instance:
      'a 24-base probe with one planted substitution, in 120,000 bases; referee: the Sellers DP agreeing on every end position (here and on 400 exhaustive small cases)',
    columns: ['ops', 'outcome'],
    rows: [
      {
        method: 'Exact find',
        values: ['~n', 'MISSES'],
        verdict: 'one substitution is invisibility: clean, confident, empty',
      },
      {
        method: 'Sellers DP (WF form)',
        values: ['2,880,000', 'finds it'],
        verdict: 'n·m cells, one at a time: the referee',
      },
      {
        method: 'Bitap, k = 1',
        isThisUnit: true,
        values: ['240,000', 'finds it'],
        best: 0,
        verdict: 'two word-ops per char, 24 lanes each: the same DP, packed',
      },
    ],
    source:
      "python solutions/bitap_bitmask_fuzzy_states.py prints this table and asserts: agreement with the Sellers referee on all 400 exhaustive small cases at k = 0..2; exact mode equal to the naive scan; the planted site (base 71,003, end 71,027) found by k=1 and the referee, missed by find and k=0; the op meter exactly n·m = 2,880,000 cells vs n·(k+1) = 240,000 word-ops (12×); and the 96-char pattern past C's 64-bit word cliff still referee-exact on Python's big ints.",
  },

  figure: (
    <Figure
      id="fig-bitap-lamps"
      aspect="16 / 7"
      caption="The DP column as a row of lamps. Bit j of R_d says: the pattern's first j+1 characters match a suffix of the text read so far, with at most d errors. Each text character is one lever pull: shift slides every hypothesis forward, the letter's mask kills the ones it contradicts, and three OR splices per error level inherit dying hypotheses into the next register. The accept lamp lighting in R_k is a ≤k-edit match ending here. Same recurrence as the Wagner-Fischer table: computed 24 lanes per instruction."
      cite={{
        text: 'Wu & Manber, "Fast Text Searching Allowing Errors", CACM 35(10), 1992: agrep\'s engine, printed back-to-back with Baeza-Yates & Gonnet\'s exact shift-or in the same issue; Dömölki ran automata through bit-vectors in 1964.',
        href: 'https://doi.org/10.1145/135239.135244',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="Two bit registers as lamp rows over a text strip, the exact row dying at a typo while the one-error row carries to the accept lamp">
        <text x="40" y="26" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">pattern: g a t t a c a · text streams below: one lever pull per character</text>
        <text x="40" y="66" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="11">R₀ (exact)</text>
        {[1, 1, 1, 0, 0, 0, 0].map((lit, i) => (
          <circle key={i} cx={160 + i * 46} cy={62} r={11} fill={lit ? '#5da2ff' : 'none'} stroke={i === 6 ? '#62d98a' : '#33507a'} strokeWidth="2" />
        ))}
        <text x="40" y="116" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">R₁ (≤1 edit)</text>
        {[1, 1, 1, 1, 1, 0, 0].map((lit, i) => (
          <circle key={i} cx={160 + i * 46} cy={112} r={11} fill={lit ? '#f0b94b' : 'none'} stroke={i === 6 ? '#62d98a' : '#33507a'} strokeWidth="2" />
        ))}
        <text x="470" y="152" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="10">accept lamp</text>
        <line x1="436" y1="130" x2="436" y2="72" stroke="#62d98a" strokeWidth="0" />
        <text x="40" y="188" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">the typo: R₀'s hypothesis dies at the substituted letter…</text>
        <text x="40" y="210" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">…R₁ inherits it through the substitution splice (R₀ ≪ 1) and carries on</text>
        <text x="40" y="248" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">measured: 2,880,000 DP cells vs 240,000 word-ops for identical end positions (12×)</text>
        <text x="40" y="270" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">the planted one-substitution site: found by k=1 and the referee · missed by exact find</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'bitap_bitmask_fuzzy_states.py',
  Viz: BitapViz,
  narration,
};
