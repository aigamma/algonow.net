import HuffmanViz from '../viz/HuffmanViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/huffman_frequency_merges.py?raw';
import { narration } from './huffman-frequency-merges.narration.js';

export const content = {
  given:
    'An alphabet of k symbols with known frequencies, and a message of n symbols drawn from it.',
  task: 'Assign each symbol a bit string so the encoded message is as short as possible and decodes without separators.',
  constraint:
    'The code must be prefix-free: no code word may begin another. That one property makes the bit stream self-punctuating, and it is the arena in which optimal means optimal.',

  origins: (
    <p>
      MIT, 1951. Robert Fano offered his information theory class a choice:
      sit the final exam, or solve one problem: construct the optimal binary
      code. Fano did not mention that he and Shannon had both attacked it and
      settled for a good-but-suboptimal top-down splitter. David Huffman, a
      25-year-old graduate student, worked for months, and was about to give
      up and study for the exam when the idea arrived by inversion:{' '}
      <strong>build the tree from the bottom</strong>, merging the two rarest
      symbols first, instead of splitting from the top. He proved it optimal,
      published in <strong>1952</strong>, and never patented it. His term
      paper now runs inside DEFLATE, JPEG, PNG, and MP3; his professor&apos;s
      method appears below, as a rival.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>tree discipline</strong>. Start with every symbol as a
      loose leaf weighted by its frequency; repeatedly merge two subtrees
      under a new parent whose weight is their sum; stop at one tree. Leaf
      depth becomes code length, left and right become 0 and 1, and
      prefix-freedom is automatic: symbols live only at leaves, and no path
      to a leaf passes through another leaf.
    </p>
  ),
  heurRole: (
    <p>
      Decides <strong>which two to merge</strong>: always the two lowest
      frequencies. The exchange argument turns that greedy instinct into a
      theorem: in some optimal tree the two rarest symbols are siblings at
      the deepest level, because if anything more common sat deeper, swapping
      the pair would shorten the total. So merging the two rarest is never a
      mistake, and induction on the merged alphabet does the rest. Rare
      symbols sink deep, common symbols float shallow, and{' '}
      <strong>no prefix-free code can do better</strong>.
    </p>
  ),

  picture: (
    <p>
      A tournament run backwards, seeded by obscurity. Every symbol enters as
      a player, and in each round the two <strong>least popular</strong>{' '}
      contestants are taped together into a team whose popularity is their
      sum. Teams of teams form until one grand alliance remains. Now read
      each symbol&apos;s address: the sequence of tape-jobs that got it into
      the alliance. A symbol taped in the very first round carries the
      longest address; the crowd favorite, taped last, carries the shortest.
      Addresses are the codes, and popularity has priced them.
    </p>
  ),

  steps: [
    <>
      <strong>Count</strong> frequencies and push every symbol into a
      priority queue keyed by weight.
    </>,
    <>
      <strong>Merge:</strong> pop the two lightest, hang them under a new
      parent weighing their sum, push the parent back.
    </>,
    <>
      <strong>Repeat</strong> until one tree remains: k − 1 merges, O(k log
      k) total.
    </>,
    <>
      <strong>Read codes:</strong> the path to each leaf, 0 left and 1
      right; depth is code length. Canonical renumbering makes the table
      shippable in a few bytes.
    </>,
    <>
      <strong>Encode</strong> by table lookup, <strong>decode</strong> by
      walking the tree bit by bit. No separators needed: prefix-freedom
      punctuates the stream.
    </>,
  ],

  signals: [
    <>
      Frequencies are <strong>known or stable</strong> enough to ship a
      table; wildly drifting sources want adaptive variants.
    </>,
    <>
      <strong>Whole bits per symbol are affordable</strong>: no symbol is so
      common that rounding its ideal fractional length up to 1 bit hurts
      (the skew cliff below is the counterexample).
    </>,
    <>
      Decode <strong>speed and simplicity</strong> matter: table walks, no
      per-bit arithmetic, hardware-friendly.
    </>,
  ],
  baseline: (
    <>
      The fixed-width code is the honest baseline: 5 bits for this 22-symbol
      alphabet, <strong>1,000,020 bits</strong> for the prose instance.
      Huffman&apos;s frequency-shaped tree pays <strong>810,761</strong>, a
      19 percent saving, and sits <strong>0.7 percent above the entropy
      floor</strong> of 805,141 bits: nearly everything the frequencies had
      to give, from a term paper&apos;s worth of machinery.
    </>
  ),

  strength: (
    <>
      <strong>Optimal, and provably so, in its arena.</strong> Among all
      prefix-free codes nothing beats it: the tested solution checks this
      against exhaustive search over every Kraft-feasible code on 200 random
      alphabets. The tables are tiny, encoding is a lookup, and decoding is
      a tree walk: the speed is why DEFLATE and JPEG still ship it.
    </>
  ),
  weakness: (
    <>
      <strong>The one-bit floor.</strong> A prefix code cannot spend less
      than one whole bit per symbol, so when one symbol dominates, the ideal
      fractional cost rounds up catastrophically: on the 98-percent-quiet
      sensor feed below, Huffman pays <strong>203,999 bits against an
      entropy of 31,557</strong>, six and a half times the floor, while
      arithmetic coding pays 31,558. Skew is where the arena itself is the
      wrong arena.
    </>
  ),

  problem: 'Prefix code construction',
  problemSlug: 'prefix-codes',
  rivals: [
    {
      name: 'Huffman × sorted merges',
      isThisUnit: true,
      algoName: 'Huffman coding',
      cost: 'O(k log k) build',
      wins: (
        <>
          <strong>810,761 bits</strong> on the prose, 0.7% above the entropy
          floor, provably unbeatable among prefix codes, with table-lookup
          speed.
        </>
      ),
      costs: (
        <>
          The one-bit floor: <strong>203,999 vs 31,557</strong> entropy on
          the skewed feed. And the frequency table must travel with the
          data.
        </>
      ),
      when: 'The default symbol coder when no single symbol dominates: file formats, network protocols.',
    },
    {
      name: 'Shannon-Fano coding',
      cost: 'O(k log k) build',
      wins: (
        <>
          The 1948 top-down splitter: simpler to explain, and on these two
          alphabets it happens to <strong>tie Huffman exactly</strong>.
        </>
      ),
      costs: (
        <>
          Never better, sometimes worse: the 200-alphabet sweep pins it
          strictly losing on some distributions while Huffman never loses.
          History&apos;s answer, superseded by a student&apos;s homework.
        </>
      ),
      when: 'Essentially never in new work; it survives as the method Huffman dethroned and in the ZIP spec’s ancestry.',
    },
    {
      name: 'Arithmetic coding',
      cost: 'O(n) with per-symbol math',
      wins: (
        <>
          Fractional bits: <strong>805,142</strong> on the prose and{' '}
          <strong>31,558</strong> on the skew, one bit above the entropy
          floor on both. The skew cliff simply is not there.
        </>
      ),
      costs: (
        <>
          Multiplications and renormalization on every symbol, careful
          32-bit carry handling, and decades of (now expired) patent
          shadow.
        </>
      ),
      when: 'Skewed or precisely modeled sources: compression research, context modeling, codecs like JPEG2000.',
    },
    {
      name: 'Asymmetric numeral systems',
      cost: 'O(n), table-driven',
      wins: (
        <>
          Arithmetic&apos;s ratios at Huffman&apos;s speed:{' '}
          <strong>805,168 / 31,584 bits</strong> here, from table lookups.
          This is the engine inside zstd, LZFSE, and JPEG XL.
        </>
      ),
      costs: (
        <>
          Encoding runs <strong>backwards</strong> (last symbol first), state
          must be flushed, and the quantized tables take real care to build.
        </>
      ),
      when: 'Modern general-purpose compression: whenever you would have said Huffman but the ratios matter.',
    },
  ],
  neverUse: {
    name: 'Run-length encoding, for frequency skew',
    why: (
      <>
        RLE prices <strong>repetition</strong>: it pays off when the same
        symbol repeats in runs. Frequency skew is a different structure, and
        prose has almost no runs, so naive (symbol, count) pairs{' '}
        <strong>expand</strong> this instance to 3,136,672 bits: nearly
        double the raw ASCII. Measured, not asserted. RLE becomes exactly
        right when runs are the actual structure (fax scans, sparse
        bitmaps), often as a stage <em>before</em> an entropy coder, never
        as a substitute for one.
      </>
    ),
  },

  contest: {
    instance:
      'bits to encode two 200,000-symbol instances with known frequencies: English-like prose (entropy floor 805,141 bits) and a 98-percent-quiet sensor feed (entropy floor 31,557 bits); no code of any kind can go below the floor',
    columns: ['English prose', 'quiet sensor'],
    rows: [
      {
        method: 'ASCII, 8 bits flat',
        values: ['1,600,032', '1,600,000'],
        verdict: 'pays for symbols nobody sent',
      },
      {
        method: 'Fixed width (5 / 2 bits)',
        values: ['1,000,020', '400,000'],
        verdict: 'right alphabet, no idea about frequency',
      },
      {
        method: 'Shannon-Fano',
        values: ['810,761', '203,999'],
        verdict: 'ties Huffman here; never beats it, sometimes loses',
      },
      {
        method: 'Huffman × sorted merges',
        isThisUnit: true,
        values: ['810,761', '203,999'],
        best: 0,
        verdict: '0.7% off the floor on prose; floored at 1 bit on skew',
      },
      {
        method: 'Arithmetic coding',
        values: ['805,142', '31,558'],
        best: 1,
        verdict: 'one bit above the entropy floor, on both instances',
      },
      {
        method: 'rANS',
        values: ['805,168', '31,584'],
        verdict: 'the same ratios from table lookups: zstd’s engine',
      },
    ],
    source:
      'python solutions/huffman_frequency_merges.py prints this table and asserts Huffman optimal against exhaustive search over every Kraft-feasible code on 200 random alphabets, prefix-freedom and full Kraft sums, exact round trips for Huffman, arithmetic, and rANS on both instances, the Shannon floor as an inequality, the skew cliff, and the RLE expansion.',
  },

  figure: (
    <Figure
      id="fig-huffman-exchange"
      aspect="16 / 7"
      caption="Why merging the two rarest is a theorem, not a hunch. Suppose an optimal tree parks a common symbol at the deepest level while a rare one sits higher. Swapping them moves many occurrences up and few occurrences down, shortening the total: contradiction. So some optimal tree has the two rarest symbols as siblings at the bottom, which is exactly what one frequency-sorted merge creates; induction on the merged alphabet finishes the proof."
      cite={{
        text: 'Huffman, "A Method for the Construction of Minimum-Redundancy Codes", Proceedings of the IRE 40(9), 1952: the term paper written for Fano’s 1951 information theory class in place of a final exam.',
        href: 'https://doi.org/10.1109/JRPROC.1952.273898',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="A code tree where a common symbol sits deepest; arrows show swapping it with a shallower rare symbol shortens the total cost">
        <line x1="320" y1="36" x2="180" y2="92" stroke="#2b5fa8" strokeWidth="1.6" />
        <line x1="320" y1="36" x2="460" y2="92" stroke="#2b5fa8" strokeWidth="1.6" />
        <line x1="180" y1="92" x2="110" y2="148" stroke="#2b5fa8" strokeWidth="1.6" />
        <line x1="180" y1="92" x2="250" y2="148" stroke="#2b5fa8" strokeWidth="1.6" />
        <line x1="110" y1="148" x2="75" y2="204" stroke="#2b5fa8" strokeWidth="1.6" />
        <line x1="110" y1="148" x2="145" y2="204" stroke="#2b5fa8" strokeWidth="1.6" />
        <circle cx="320" cy="36" r="10" fill="#232c40" stroke="#5da2ff" />
        <circle cx="180" cy="92" r="10" fill="#232c40" stroke="#5da2ff" />
        <circle cx="110" cy="148" r="10" fill="#232c40" stroke="#5da2ff" />
        <g>
          <circle cx="460" cy="92" r="16" fill="rgba(98,217,138,0.2)" stroke="#62d98a" strokeWidth="1.6" />
          <text x="460" y="97" textAnchor="middle" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="13">z·2</text>
          <text x="484" y="97" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">rare, shallow?</text>
        </g>
        <g>
          <circle cx="75" cy="204" r="16" fill="rgba(224,103,103,0.2)" stroke="#e06767" strokeWidth="1.6" />
          <text x="75" y="209" textAnchor="middle" fill="#e06767" fontFamily="ui-monospace, monospace" fontSize="13">e·40</text>
          <text x="99" y="209" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">common, deep?</text>
        </g>
        <circle cx="145" cy="204" r="16" fill="rgba(240,185,75,0.16)" stroke="#f0b94b" strokeWidth="1.4" />
        <text x="145" y="209" textAnchor="middle" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="13">q·1</text>
        <circle cx="250" cy="148" r="16" fill="rgba(240,185,75,0.16)" stroke="#f0b94b" strokeWidth="1.4" />
        <text x="250" y="153" textAnchor="middle" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="13">x·3</text>
        <path d="M 95 188 C 200 96, 330 70, 442 84" fill="none" stroke="#e9edf6" strokeWidth="1.6" strokeDasharray="6 4" markerEnd="none" />
        <text x="200" y="60" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="12">swap: 40 heavy trips get shorter,</text>
        <text x="200" y="76" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="12">2 light trips get longer · total falls</text>
        <text x="36" y="258" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="12">so the deepest pair may be assumed the two rarest · merge them · recurse</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'huffman_frequency_merges.py',
  Viz: HuffmanViz,
  narration,
};
