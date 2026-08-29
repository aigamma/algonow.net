import RabinKarpViz from '../viz/RabinKarpViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/rabin_karp_rolling_hash.py?raw';
import { narration } from './rabin-karp-rolling-hash.narration.js';

export const content = {
  given:
    'A long text and a pattern (or a hundred patterns). Comparing letters at every alignment re-reads the same characters over and over: the window barely changed, so why does the work start over?',
  task: 'Replace the window with a number. Hash the pattern once, roll the window hash in O(1) per slide (subtract the leaving character, multiply, add the entering one), and read actual letters only when fingerprints agree.',
  constraint:
    'The referee is str.find on every instance: 300 randomized cases plus three contest instances, exact occurrence lists, overlaps included. One currency: character touches (a roll touches 2, a comparison 1). The honest rows stand: naive WINS friendly English text (207,971 vs 400,504 touches); the adversary pays naive 25×; 100 patterns ride one rolling pass for 49×; spurious hits are 0 at 61 bits and 6,573 at mod 31, both measured.',

  origins: (
    <p>
      Richard Karp and Michael Rabin, circulating from{' '}
      <strong>1981</strong> and published in <strong>1987</strong>:
      &quot;Efficient randomized pattern-matching
      algorithms.&quot; The names carry weight on this site:
      Rabin&apos;s randomized fingerprints are the same bet as his
      primality test (Miller-Rabin, a live unit), and Karp already
      appears in three other live pairs (Edmonds-Karp,
      Hopcroft-Karp, Held-Karp). Their idea outgrew substring
      search: plagiarism detectors fingerprint every k-gram of
      every essay this way (Stanford&apos;s MOSS, via the 2003
      winnowing paper), rsync rolls a checksum across files to
      find shifted content, deduplicating filesystems cut chunk
      boundaries with Rabin fingerprints, and bioinformatics
      pipelines hash millions of k-mers. Wherever a window slides
      and re-hashing from scratch would drown you, this pair is
      underneath.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>scan-and-verify loop</strong>: one pass,
      one window, and a candidate list that only fingerprint
      matches can enter. A hash match is never trusted: the
      window is verified letter by letter before it counts, so a
      collision costs one cheap verification, never a wrong
      answer. The referee held everywhere: on 300 randomized
      cases and all three contest instances, the occurrence lists
      equal str.find&apos;s exactly, overlaps included, even with
      the modulus sabotaged down to 31.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>fingerprint</strong>: the window as a
      base-293 number mod the Mersenne prime 2^61-1, updated in
      O(1) per slide. The rolling identity is audited at every
      one of 1,984 windows: rolled hash equals fresh hash,
      always. The bet is measured from both sides: at 61 bits,
      the English instance produced <strong>42 hash matches = 42
      true occurrences + 0 spurious</strong>; at mod 31, 6,573
      spurious verifications appeared and correctness still held,
      with the touch tax at just +1.7%: a false candidate usually
      dies in one letter. And the roll is the whole point:
      re-hashing every window from scratch would cost 6.0× more
      touches, which is the naive blowup wearing a hash.
    </p>
  ),

  picture: (
    <p>
      A teacher checking essays for a borrowed sentence. The slow
      way: at every position, lay the suspect sentence over the
      essay and compare word by word. The fingerprint way: add up
      the sentence into one checksum, then slide along the essay
      keeping a running checksum of the last twelve words: as the
      window slides one word, subtract the word that left,
      add the word that entered: a two-touch update however long
      the window. Only when the two checksums agree does the
      teacher stop and actually read the passage. Almost every
      stop is a real hit: with a wide checksum, false alarms are
      measured at zero. And the same trick scales to a hundred
      suspect sentences at once: pool their hundred fingerprints
      in one lookup set and the essay still gets read{' '}
      <em>once</em>: that pooling is what plodding letter-matchers
      cannot do.
    </p>
  ),

  steps: [
    <>
      <strong>Fingerprint the pattern:</strong> a base-293
      polynomial mod 2^61-1: one number stands in for m
      characters.
    </>,
    <>
      <strong>Roll the window:</strong> subtract the leaving
      character&apos;s term, multiply by the base, add the
      entering one: O(1) per slide, audited equal to a fresh hash
      at all 1,984 windows.
    </>,
    <>
      <strong>Verify on agreement only:</strong> a fingerprint
      match earns a letter-by-letter check: collisions cost a
      verification, never a wrong answer.
    </>,
    <>
      <strong>Pool fingerprints for many patterns:</strong> a
      hundred patterns become a hash-set lookup inside the same
      single pass: 445,048 touches where a hundred separate scans
      pay 21.7 million.
    </>,
    <>
      <strong>Size the modulus:</strong> the dial is measured: 0
      spurious at 61 bits, 6,573 at mod 31: wide enough and the
      bet simply never loses.
    </>,
  ],

  signals: [
    <>
      <strong>Many patterns, one text:</strong> plagiarism
      k-grams, signature scans, dictionary hits: fingerprints
      pool into one set; letter-matchers must re-walk the text
      per pattern.
    </>,
    <>
      <strong>The window slides:</strong> rsync-style sync,
      chunk-boundary detection, any moving-window statistic: the
      O(1) roll is the primitive everything else rides on.
    </>,
    <>
      <strong>Adversarial or repetitive input:</strong> on a^n
      data the naive scan quietly goes quadratic (25× here);
      the fingerprint never re-reads a window it can rule out
      arithmetically.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the <strong>naive scan</strong>, and
      on friendly English text it <em>wins</em>: 207,971 touches
      to Rabin-Karp&apos;s 400,504, because a mismatched
      alignment usually dies on its first letter while the roll
      pays two touches at every slide regardless. The fingerprint
      collects its rent elsewhere, and this page measures exactly
      where: 25× on the adversarial instance, 49× when a hundred
      patterns share one pass.
    </>
  ),

  strength: (
    <>
      <strong>One pass, any number of patterns, and a safe
      bet.</strong> The multi-pattern dividend is the headline:
      100 patterns found in 445,048 touches against 21.7 million
      for repeated naive scans and 21.2 million for repeated KMP
      (49× and 48×, measured). The worst case is tamed: the
      adversary that drives naive to 5.0 million touches costs
      the fingerprint 200,000. And the bet is quantified: 0
      spurious hits at 61 bits on this instance; even sabotaged
      to mod 31 the answer stayed exact with a +1.7% tax,
      because verification catches every lie.
    </>
  ),
  weakness: (
    <>
      <strong>Expected-time guarantees, and a price on friendly
      ground.</strong> Single rare pattern on English text: naive
      beats it (207,971 vs 400,504) and KMP matches naive with a
      worst-case guarantee attached: paying 2n touches to roll a
      hash you almost never need is a real cost. The linearity is
      probabilistic, not promised: an adversary who knows your
      modulus can manufacture collisions (production rotates
      random bases per run, and this page measures the collision
      dial at mod 31 to show why the width matters). KMP&apos;s
      O(n+m) needs no luck; Boyer-Moore skips most of the text on
      large alphabets; and for variable-length pattern sets,
      Aho-Corasick&apos;s automaton is the industrial answer
      where fingerprint pooling needs equal lengths per pass.
    </>
  ),

  problem: 'Substring search',
  problemSlug: 'substring-search',
  rivals: [
    {
      name: 'Rabin-Karp × fingerprints',
      isThisUnit: true,
      algoName: 'Rabin-Karp',
      cost: 'O(n + m) expected',
      wins: (
        <>
          <strong>Pools patterns</strong>: 100 in one pass for
          49×, tames the adversary at 25×, and the roll is the
          primitive rsync and MOSS are built on.
        </>
      ),
      costs: (
        <>
          2n touches on text where naive pays ~n; linear in
          expectation only: the guarantee is the modulus width.
        </>
      ),
      when: 'Many equal-length patterns, sliding-window jobs, or input you do not trust.',
    },
    {
      name: 'Knuth-Morris-Pratt',
      cost: 'O(n + m) guaranteed',
      wins: (
        <>
          The live unit: worst-case linear with no randomness and
          no collisions: 202,545 touches on the English instance,
          200,048 on the adversary: never lucky, never sorry.
        </>
      ),
      costs: (
        <>
          One automaton per pattern: a hundred patterns cost a
          hundred passes (21.2 million touches, measured).
        </>
      ),
      when: 'Single pattern, hard guarantees required: parsers, streaming matchers, hostile input.',
    },
    {
      name: 'Boyer-Moore',
      cost: 'O(n/m) best case',
      wins: (
        <>
          The live unit: skips text the pattern proves it never
          has to read: sublinear in practice on large alphabets:
          the grep-style single-pattern champion.
        </>
      ),
      costs: (
        <>
          Per-pattern skip tables; the skips do not pool across a
          pattern set the way fingerprints do.
        </>
      ),
      when: 'One long pattern, big alphabet, plain fast search: the everyday grep case.',
    },
    {
      name: 'Aho-Corasick',
      cost: 'O(n + total m + hits)',
      wins: (
        <>
          The live unit: one automaton for a whole
          variable-length dictionary, guaranteed linear: the
          industrial multi-pattern matcher.
        </>
      ),
      costs: (
        <>
          Automaton build time and memory; overkill for a quick
          equal-length k-gram sweep that fingerprints handle in
          twenty lines.
        </>
      ),
      when: 'Large fixed dictionaries of mixed lengths: virus signatures, keyword filters.',
    },
    {
      name: 'Naive string matching',
      cost: 'O(n·m) worst case',
      wins: (
        <>
          Wins this page&apos;s friendly-text row outright
          (207,971 vs 400,504 touches): zero preprocessing, zero
          state, and mismatches usually die on the first letter.
        </>
      ),
      costs: (
        <>
          The adversary drives it to 5.0 million touches (25×),
          and a hundred patterns cost a hundred full scans.
        </>
      ),
      when: 'Short texts, one-off searches, trusted input: honestly, most quick scripts.',
    },
  ],
  neverUse: {
    name: 'Hashing every window from scratch',
    why: (
      <>
        The half-understood version of this unit: &quot;hash each
        window and compare hashes&quot; without the roll.
        Computing a fresh hash per alignment touches all m
        characters of every window: 2,399,880 touches on this
        page&apos;s English instance, 6.0× the rolling cost, and
        asymptotically the same n·m as the naive scan you were
        trying to escape: except now with modular arithmetic on
        top and collisions to verify besides. The entire
        algorithm is the two-touch update: subtract the leaver,
        multiply, add the enterer. If your window hash cannot be
        updated in O(1), you do not have Rabin-Karp: you have the
        slow scan wearing a disguise. (The same trap appears in
        production as re-hashing whole buffers per byte in sync
        tools: the fix, always, is a rollable hash.)
      </>
    ),
  },

  contest: {
    instance:
      'substring search in one currency (character touches: a roll touches 2, a comparison 1); referee: str.find, exact on every instance',
    columns: ['naive', 'rabin-karp', 'kmp'],
    rows: [
      {
        method: 'English text, 1 pattern (n = 200,000)',
        values: ['207,971', '400,504', '202,545'],
        best: 2,
        verdict: 'the honest row: naive and KMP win friendly text; mismatches die in one touch',
      },
      {
        method: 'Adversary: a^100,000 vs a^49b',
        values: ['4,997,550', '200,000', '200,048'],
        best: 1,
        verdict: 'naive quietly goes quadratic: 25× the fingerprint’s bill',
      },
      {
        method: '100 patterns, one text',
        isThisUnit: true,
        values: ['21,739,295', '445,048', '21,248,948'],
        best: 1,
        verdict: 'the fingerprint dividend: one rolling pass beats a hundred scans by 49×',
      },
    ],
    source:
      'python solutions/rabin_karp_rolling_hash.py prints this table and asserts: occurrence lists exactly equal to a str.find referee on 300 randomized cases and all three instances (overlaps included, tiny-modulus runs included); the rolled hash equal to a freshly computed hash at every one of 1,984 windows; naive ahead on the English row and behind by 20×+ on the adversary; the 100-pattern pass ahead of both rivals by 25×+; 0 spurious hits at mod 2^61-1 and thousands at mod 31, counted; and the from-scratch hashing alternative 5×+ dearer than the roll by the same currency.',
  },

  figure: (
    <Figure
      id="fig-rabin-karp-roll"
      aspect="16 / 7"
      caption="The window as a number. The pattern is hashed once; the text window's hash rolls right in O(1): the leaving character's term is subtracted, the rest shifts up by one base power, the entering character is added. Letters are read only when fingerprints agree: 42 hash matches = 42 true occurrences + 0 spurious on the English instance at 61 bits (measured), 6,573 spurious at mod 31 with the answer still exact. Pooling 100 fingerprints into one set turns a hundred scans into one pass: 445,048 touches vs 21.7 million."
      cite={{
        text: 'R. M. Karp and M. O. Rabin, "Efficient randomized pattern-matching algorithms," IBM Journal of Research and Development 31(2), 1987. DOI 10.1147/rd.312.0249.',
        href: 'https://doi.org/10.1147/rd.312.0249',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="A text ribbon with a sliding window, the rolling hash update, and a fingerprint set matching many patterns at once">
        {'fingerprintingbyarithmetic'.split('').map((c, i) => (
          <text key={i} x={34 + i * 22} y={52} fill={i >= 6 && i < 14 ? '#e9edf6' : '#9aa5bd'} fontFamily="ui-monospace, monospace" fontSize="15">{c}</text>
        ))}
        <rect x="160" y="34" width="176" height="26" fill="none" stroke="#5da2ff" strokeWidth="1.6" rx="4" />
        <path d="M 152 66 q -8 -18 8 -26" fill="none" stroke="#e2606c" strokeWidth="1.6" />
        <text x="96" y="84" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="10">- leaving char · base^(m-1)</text>
        <path d="M 344 40 q 16 8 8 26" fill="none" stroke="#62d98a" strokeWidth="1.6" />
        <text x="332" y="84" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="10">+ entering char</text>
        <text x="200" y="106" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">h&apos; = (h - out·lead) · base + in   (mod 2^61-1) : two touches</text>
        <rect x="34" y="128" width="270" height="112" fill="none" stroke="rgba(154,165,189,0.4)" strokeWidth="1.2" rx="6" />
        <text x="46" y="148" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">the fingerprint set: 100 patterns, hashed once</text>
        {[0, 1, 2, 3, 4].map((r) => (
          <text key={r} x={46} y={168 + r * 14} fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="10">{['0x2f81…a1', '0x9c04…77', '0x1de9…3b', '0x77b2…c8', '⋯ 96 more'][r]}</text>
        ))}
        <path d="M 310 182 h 44" stroke="#5da2ff" strokeWidth="1.6" markerEnd="" />
        <text x="362" y="162" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="10">window hash in the set?</text>
        <text x="362" y="178" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="10">yes -&gt; verify letters (42 = 42 true + 0 false)</text>
        <text x="362" y="194" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">no -&gt; slide on: the window is never read</text>
        <text x="362" y="216" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="10">mod 31 dial: 6,573 false candidates, +1.7% tax,</text>
        <text x="362" y="230" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="10">answer still exact: verification catches every lie</text>
        <text x="34" y="268" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">measured: 100 patterns in one pass 445,048 touches vs 21,739,295 naive (49×) · adversary 25× · roll beats fresh hashing 6.0×</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'rabin_karp_rolling_hash.py',
  Viz: RabinKarpViz,
  narration,
};
