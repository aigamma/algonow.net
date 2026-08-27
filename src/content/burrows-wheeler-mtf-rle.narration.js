// The spoken lesson for puzzle seventy five, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle seventy five: Burrows Wheeler compression, paired with move to front plus run length encoding. Here is the puzzle. A block of text must shrink, and its redundancy lives in context: which letter follows which: exactly where a per symbol coder cannot see it. Find a reversible transform that moves the redundancy to where a dumb coder can eat it. The referees on this page are exact and slightly cruel: byte exact round trips at every stage, on three hundred strings and a twenty one thousand character corpus: and one identity asserted to the tenth decimal: the transform’s output has exactly the raw text’s order zero entropy: three point nine zero one seven bits, both: a permutation compresses nothing. The compression happens afterward, and the meters show precisely where.',
  },
  {
    section: 'origins',
    text:
      'Michael Burrows and David Wheeler, at Digital’s Systems Research Center, nineteen ninety four: a technical report so strange the field took years to digest it. Sort every rotation of the text. Keep only the last column. And: the miracle: that column alone reconstructs everything. Julian Seward built bzip2 on it, and for a stretch of the late nineties it beat gzip on ratio wherever text was text. Giovanni Manzini’s two thousand one analysis in the Journal of the ACM proved why: the pipeline’s output tracks the k th order entropy of the input. And then the strangest turn: the same transform became the FM index: the structure inside every modern DNA aligner: a compressor that turned out to be a search engine in disguise.',
  },
  {
    section: 'pair',
    text:
      'The algorithm owns the transform and its inverse. Forward: append a sentinel, sort all rotations, keep the last column: built on this page by the live suffix array unit’s prefix doubling, because sorting the suffixes of a sentinel terminated string is sorting its rotations: the transform is one subtraction away from the suffix array. Inverse: the LF mapping miracle: the k th occurrence of a letter in the last column is the k th occurrence in the first: walk that correspondence and the text emerges, last character first: three hundred round trips, byte exact. The heuristic supplies the back end that cashes what the transform bought. The transform’s only product is locality: mean run length measured rising from one point zero two to four point three five. Move to front converts recently seen into small numbers: after the transform, eighty five and a half percent of its output is a zero or a one: on raw text, seven percent. And run length encoding folds the zeros: twenty one thousand symbols down to six thousand. Order zero entropy: three point nine down to one point three six bits.',
  },
  {
    section: 'picture',
    text:
      'Picture a library reshelved by what comes after. Sorting the rotations lines up every occurrence of each context: all the rotations beginning h e, all the ones beginning t h: and the last column reads the letter standing just before each context. The letter before h e is nearly always t: so the column comes out in long runs: all the t’s of all the the’s standing shoulder to shoulder, sorted into each other’s company by their shared future. Nothing was deleted. The same letters, every one of them, rearranged by a rule so rigid it can be run backward. But now a coder with no memory whatsoever walks the shelf and meets the same letter, again and again: which is exactly the world a memoryless coder was built for.',
  },
  {
    section: 'run',
    text:
      'Here is the run. Terminate: append the sentinel: it makes rotations into suffixes and pins the inverse. Transform: suffix sort by prefix doubling, then read off the last column: the character before each suffix. Move to front: keep an alphabet list; each symbol is encoded as its current position, then moved to the front: locality becomes numerical skew. Run length encode the zeros: measured folding three and a half to one here: and real bzip2 hands the result to Huffman, the live unit one shelf over. Invert by LF: counts and ranks over the last column alone, walk backward from the sentinel row, reverse: byte exact on everything this page touched. And note what the pipeline is: four dumb stages and one profound permutation: remove the permutation and the dumb stages measurably fail.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, the redundancy is context shaped: natural language, genomes, structured logs: what follows what is the structure: per symbol coders are blind to it, and dictionary coders see only literal repeats. Second, block processing is acceptable: the sort needs the whole block in hand: bzip2 works in blocks up to nine hundred kilobytes: when data must stream, the LZ shelf is home. Third, you might want search later: the transform plus a little bookkeeping is the FM index: compress today, and tomorrow run substring queries directly on the compressed form: the reason genomics never let this transform go.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: reversible to the byte, and every claim carries a meter. Round trips at every stage on three hundred strings and the full corpus. The permutation identity exact to ten decimals. Clustering measured: runs one point zero two to four point three five. The move to front gain measured from both directions: eighty five percent small symbols against seven, one point three six bits against four point two three. The fold measured, with its null result on raw text: nothing to fold. And the constructor is literally the live suffix array unit: one machine, two famous products. The weakness: blocks, memory, and a lost throne. The sort wants the block resident and the suffix machinery is real memory: streaming belongs to the LZ shelf. And the market verdict, honestly: modern champions: zstd and its cousins: are LZ plus entropy coding, tuned for two decades, and they won general purpose compression on speed. The transform’s enduring kingdom is where its byproduct rules: the FM index, aligning billions of DNA reads against compressed genomes, every single day.',
  },
  {
    section: 'tradeoffs',
    text:
      'The rivals, honestly placed, three live. LZ seventy seven, the sliding window: repeats by back reference, streaming, no block boundaries: it exploits literal repetition where this transform exploits statistical context: different redundancy, which is why DEFLATE composes LZ with Huffman rather than choosing. Huffman coding, live: the pipeline’s true back end: optimal per symbol bits for exactly the skew that move to front manufactures: bzip2 is this page plus that unit, in series. And the suffix array, live: the constructor itself: b w t at i is the text at s a of i, minus one: and with the transform it becomes the FM index: search inside compression. One more shelf note: the LZW unit measured DEFLATE beating it everywhere: this transform is the other road that once beat DEFLATE on text ratio: the two stories bracket the compression shelf.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is shipping the transform as compression, and the demo is genuinely seductive: run the transform, print the output, see the gorgeous runs, declare victory. The page’s central identity says exactly what you shipped: the output has the input’s order zero entropy, equal to the tenth decimal place: three point nine zero one seven bits, before and after: because a permutation changes no symbol counts. Zero bytes were compressed. Information was moved, never removed. The transform is a lens, not a press: its entire value is making the next stage’s assumptions come true: measured here as move to front going from backfiring at four point two three bits to delivering one point three six. The general lesson travels far beyond compression: judge any transform in any pipeline not by how the data looks afterward, but by what the meter says after the stage that actually pays.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements the suffix array by prefix doubling, the transform read off it, the LF mapping inverse with counts and ranks, move to front in both directions, and the zero folding run length pass. The self test asserts, in order: round trips at every stage on three hundred mixed strings: binary, english like, and full range: and the corpus. The output verified as a permutation, with order zero entropy equal to the raw text’s within ten to the minus twelve. Mean run length up by more than a factor of two point two. The move to front gain from both sides: small symbol fractions and entropies. The fold: better than one point two five to one on transformed input, and the null result on raw. One build note in the honest tradition: the first LF walk started at the wrong row and read the wrong direction: the ab hand trace fixed it, and three hundred round trips now agree. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
