import BwtViz from '../viz/BwtViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/burrows_wheeler_mtf_rle.py?raw';
import { narration } from './burrows-wheeler-mtf-rle.narration.js';

export const content = {
  given:
    'A block of text to compress: and a suspicion that its redundancy lives in context: which letter follows which: where no per-symbol coder can see it.',
  task: 'A reversible transform that moves the redundancy to where a dumb coder can eat it.',
  constraint:
    'Reversibility is non-negotiable and measured byte-exact at every stage. And one identity is asserted to the bit: the transform’s output has EXACTLY the raw text’s order-0 entropy (3.9017053931 bits, both): a permutation compresses nothing: the compression happens after, and the meters show where.',

  origins: (
    <p>
      Michael Burrows and David Wheeler, DEC Systems Research
      Center, <strong>1994</strong>: a tech report (SRC-124) so
      strange it took the field years to digest: sort all rotations
      of the text, keep the <em>last column</em>, and: the miracle:
      that column alone reconstructs everything. Julian Seward built{' '}
      <code>bzip2</code> on it; Manzini&apos;s 2001 JACM analysis
      proved the pipeline tracks k-th order entropy; and the same
      transform became the <strong>FM-index</strong> inside every
      modern DNA aligner: a compressor that turned out to be a
      search index in disguise.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>transform and its inverse</strong>. Forward:
      sort all rotations of text+sentinel and keep the last column:
      built here by the live suffix-array unit&apos;s prefix
      doubling (bwt[i] = s[sa[i]−1]): sorting suffixes of a
      sentinel-terminated string <em>is</em> sorting rotations.
      Inverse: the LF-mapping: the k-th occurrence of a letter in
      the last column is the k-th in the first: walk it and the text
      emerges, last char first: 300 round trips, byte-exact.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>back end that cashes the clustering</strong>.
      The transform&apos;s only product is <em>locality</em>: mean
      run length 1.02 → 4.35, measured: and move-to-front converts
      recently-seen into small numbers: after BWT,{' '}
      <strong>85.5%</strong> of MTF output is a 0 or 1 (raw: 7.3%),
      and order-0 entropy falls 3.90 → <strong>1.36 bits</strong>.
      RLE then folds the zero-runs: 21,698 symbols → 6,273 (on raw:
      nothing to fold). The honest twist: MTF on raw text makes it{' '}
      <em>worse</em> (4.23 bits): the coder is dumb by design: the
      transform is what makes it smart.
    </p>
  ),

  picture: (
    <p>
      A library reshelved by <em>what comes after</em>. Sorting the
      rotations lines up every occurrence of &quot;he&quot; followed
      by anything, &quot;th&quot; followed by anything: and the last
      column reads the letter <em>before</em> each context. Since
      the letter before &quot;he&quot; is nearly always
      &quot;t&quot;, the column comes out in long runs: all the
      t&apos;s of &quot;the&quot; standing together, sorted into
      each other&apos;s company by their shared future. Nothing was
      deleted: the same letters, rearranged by a rule so rigid it
      can be undone: but now a coder with no memory at all walks
      down the shelf and finds the same book, over and over, exactly
      as a memoryless coder needs.
    </p>
  ),

  steps: [
    <>
      <strong>Terminate:</strong> append the sentinel: it makes
      rotations = suffixes and pins the inverse.
    </>,
    <>
      <strong>Transform:</strong> suffix-sort (the live unit&apos;s
      prefix doubling); read bwt[i] = s[sa[i]−1]: the last column.
    </>,
    <>
      <strong>MTF:</strong> each symbol becomes its position in a
      recently-used list, then moves to front: locality becomes
      skew.
    </>,
    <>
      <strong>RLE the zeros</strong> (bzip2 adds Huffman after: the
      live unit): the fold measured 3.5× here.
    </>,
    <>
      <strong>Invert by LF:</strong> counts + ranks over the last
      column alone: walk backward, reverse, done: byte-exact
      everywhere.
    </>,
  ],

  signals: [
    <>
      <strong>Context-shaped redundancy:</strong> text, genomes,
      logs: what follows what is the structure: exactly what
      per-symbol coders cannot see.
    </>,
    <>
      <strong>Block processing is acceptable:</strong> the sort
      needs the block in hand: bzip2&apos;s 900KB blocks: streams
      need the LZ shelf instead.
    </>,
    <>
      <strong>You might want search later:</strong> the same
      transform is the FM-index: compress today, substring-query the
      compressed form tomorrow.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the <strong>coder without the
      transform</strong>: MTF straight on raw text measured{' '}
      <em>worse than nothing</em> (4.23 bits vs the raw 3.90), and
      RLE found nothing to fold (21,697 of 21,697 symbols survive).
      The pipeline&apos;s entire gain: 3.90 → 1.36 bits: appears
      only when the transform runs first: the stages are a system,
      not a buffet.
    </>
  ),

  strength: (
    <>
      <strong>Reversible to the byte, and every claim carries a
      meter.</strong> Round trips at every stage on 300 strings and
      the 21,697-char corpus; the permutation identity exact to ten
      decimals; clustering measured (runs 1.02 → 4.35); the MTF gain
      measured from both sides (85.5% vs 7.3% small symbols; 1.36 vs
      4.23 bits); the RLE fold measured with its raw-side null
      result; and the constructor shared with the live suffix-array
      unit: one machine, two famous products.
    </>
  ),
  weakness: (
    <>
      <strong>Blocks, memory, and a lost throne.</strong> The sort
      wants the whole block resident (bzip2 caps at 900KB) and the
      suffix machinery is real memory: streaming is the LZ
      shelf&apos;s home game. And honesty about the market: zstd
      and friends: LZ77 plus entropy coding, tuned for decades: won
      general-purpose compression on speed; BWT&apos;s enduring
      kingdom is where its by-product rules: the FM-index, aligning
      billions of DNA reads against compressed genomes daily.
    </>
  ),

  problem: 'General-purpose compression',
  problemSlug: 'dictionary-compression',
  rivals: [
    {
      name: 'BWT × MTF + RLE',
      isThisUnit: true,
      algoName: 'Burrows-Wheeler compression',
      cost: 'O(n log n) block',
      wins: (
        <>
          <strong>3.90 → 1.36 bits</strong> for a memoryless back
          end: context converted to locality, reversibly: and the
          transform doubles as a search index.
        </>
      ),
      costs: (
        <>
          Whole blocks in memory, suffix machinery, and MTF that
          backfires without the transform (4.23 bits, measured).
        </>
      ),
      when: 'Text-like blocks where context is the redundancy: and anywhere the FM-index beckons.',
    },
    {
      name: 'LZ77 × sliding window',
      algoName: 'LZ77',
      cost: 'O(n), streaming',
      wins: (
        <>
          The live unit: repeats by back-reference, streaming, no
          block boundary: the dictionary half of every modern
          general-purpose champion.
        </>
      ),
      costs: (
        <>
          Sees literal repeats, not statistical context: the two
          exploit different redundancy, which is why DEFLATE adds
          Huffman.
        </>
      ),
      when: 'Streams and latency: the deployed default this transform briefly dethroned on ratio.',
    },
    {
      name: 'Huffman × sorted merges',
      algoName: 'Huffman coding',
      cost: 'O(n + σ log σ)',
      wins: (
        <>
          The live unit and the pipeline&apos;s real back end:
          optimal per-symbol bits for the skew that MTF manufactures:
          bzip2 = this page + that unit.
        </>
      ),
      costs: (
        <>
          Memoryless by construction: on raw text it sees 3.90 bits
          of skew and nothing of context.
        </>
      ),
      when: 'As the final stage: fed transformed input, its blindness becomes irrelevant.',
    },
    {
      name: 'Suffix array × doubling',
      algoName: 'Suffix array construction',
      cost: 'O(n log² n) here',
      wins: (
        <>
          The live unit that <em>builds</em> this one: bwt[i] =
          s[sa[i]−1]: and with the transform, becomes the FM-index:
          search inside compression.
        </>
      ),
      costs: (
        <>
          The constructor&apos;s memory is the pipeline&apos;s
          binding constraint: the block cap lives here.
        </>
      ),
      when: 'Whenever this unit runs: they are one machine: and alone, for plain-text indexing.',
    },
  ],
  neverUse: {
    name: 'Shipping the transform as compression',
    why: (
      <>
        The demo is seductive: run BWT, see the beautiful runs,
        declare victory: and the page&apos;s central identity says
        what you shipped: the output has <strong>exactly</strong>{' '}
        the input&apos;s order-0 entropy: 3.9017053931 bits, equal
        to ten decimals, because a permutation changes no symbol
        counts. Zero bytes were compressed: information was{' '}
        <em>moved</em>, never removed: and a gzip of the transformed
        file may even beat gzip of the original, disguising the
        no-op as progress. The transform is a lens, not a press: its
        entire value is making the NEXT stage&apos;s assumptions
        true (measured here: MTF goes from backfiring at 4.23 to
        delivering 1.36). Judge every transform in a pipeline the
        same way: not by how the data looks, but by what the meter
        says after the stage that pays.
      </>
    ),
  },

  contest: {
    instance:
      'a 21,697-char english-ish corpus through the bzip2-shaped pipeline; referee: byte-exact round trips at every stage, entropy identities asserted to the bit',
    columns: ['H0 bits/sym', 'note'],
    rows: [
      {
        method: 'Raw text',
        values: ['3.90', 'runs 1.02'],
        verdict: 'the redundancy is in context, invisible to order-0',
      },
      {
        method: 'BWT (last column)',
        values: ['3.90', 'runs 4.35'],
        verdict: 'IDENTICAL entropy to ten decimals: a permutation compresses nothing',
      },
      {
        method: 'MTF on raw',
        values: ['4.23', '≤1: 7.3%'],
        verdict: 'the coder without the transform: worse than nothing',
      },
      {
        method: 'MTF on BWT',
        isThisUnit: true,
        values: ['1.36', '≤1: 85.5%'],
        best: 0,
        verdict: 'context turned into locality: the dumb coder got smart',
      },
    ],
    source:
      "python solutions/burrows_wheeler_mtf_rle.py prints this table and asserts: round trips at every stage (BWT/LF, MTF, RLE) on 300 mixed strings and the corpus; the BWT output a provable permutation with H0 equal to raw's to 1e-12 (3.9017053931 bits); mean run 1.02 → 4.35 (> 2.2×); MTF small-symbol fraction 85.5% vs 7.3% and H0 1.36 vs 4.23; RLE folding MTF(BWT) to 6,273 symbols from 21,698 with the raw-side null result (21,697 survive); and the suffix-array-built transform inverted by LF everywhere.",
  },

  figure: (
    <Figure
      id="fig-bwt-column"
      aspect="16 / 7"
      caption="Sorted by their futures. Every rotation of banana| lines up in sorted order, and the last column reads the letter BEFORE each context: the letter before every 'an…' is 'n', before every 'na…' is 'a': shared futures pull identical letters together. The column is a permutation: same letters, same entropy, to the bit: but the runs are new, and runs are what a memoryless coder can eat. The LF-mapping walks the column backward and rebuilds the text from nothing else."
      cite={{
        text: 'Burrows & Wheeler, "A Block-sorting Lossless Data Compression Algorithm", DEC SRC Report 124, 1994; Manzini, "An Analysis of the Burrows-Wheeler Transform", JACM 48(3), 2001, proved the pipeline tracks k-th order entropy. bzip2 ships it; the FM-index made it a search engine.',
        href: 'https://doi.org/10.1145/382780.382782',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="Sorted rotations of banana with the last column highlighted showing clustered letters">
        <text x="40" y="26" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">rotations of “banana|”, sorted · | is the sentinel, smallest</text>
        {['|banana', 'a|banan', 'ana|ban', 'anana|b', 'banana|', 'na|bana', 'nana|ba'].map((row, i) => (
          <g key={i}>
            {row.split('').map((ch, j) => (
              <text
                key={j}
                x={100 + j * 34}
                y={58 + i * 28}
                fill={j === 6 ? (ch === 'n' ? '#62d98a' : ch === 'a' ? '#f0b94b' : '#5da2ff') : '#5a647d'}
                fontFamily="ui-monospace, monospace"
                fontSize="16"
                fontWeight={j === 6 ? 'bold' : 'normal'}
              >
                {ch}
              </text>
            ))}
          </g>
        ))}
        <rect x="296" y="38" width="30" height="196" fill="none" stroke="#40507a" strokeDasharray="4 4" />
        <text x="356" y="70" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">last column: a n n b | a a</text>
        <text x="356" y="94" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">the two n’s each sit before an a:</text>
        <text x="356" y="108" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">rotations sharing a future sort</text>
        <text x="356" y="122" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">together: so the n’s are neighbors</text>
        <text x="356" y="152" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">same letters as banana| exactly:</text>
        <text x="356" y="166" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">H0 unchanged to the bit</text>
        <text x="40" y="262" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">measured at 21,697 chars: runs 1.02 → 4.35 · MTF ≤1 fraction 7.3% → 85.5% · H0 after MTF 4.23 → 1.36 bits</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'burrows_wheeler_mtf_rle.py',
  Viz: BwtViz,
  narration,
};
