// The spoken lesson for puzzle thirty eight, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle thirty eight: L Z seventy seven, paired with sliding window matching, for general purpose compression. Here is the puzzle. You hold a byte stream: prose, code, styles, anything real. Encode it smaller, losslessly: the decoder must reproduce every single byte. Lossless admits exactly one oracle, and this page uses nothing else: decompress of compress of x equals x, byte for byte, tested on this repository’s own living files, plus the two honest edges: ten thousand identical bytes collapsing seventy nine fold, and ten thousand random bytes expanding, because the pigeonhole principle says they must.',
  },
  {
    section: 'origins',
    text:
      'Jacob Ziv and Abraham Lempel published the sliding window idea in nineteen seventy seven, and they shipped it with a universality theorem: as the window grows, the scheme approaches the entropy of the source without ever being told what the source is. Storer and Szymanski added the flag bit framing in nineteen eighty two: that refinement, called L Z S S, is what this page implements, and it names it honestly. Terry Welch’s nineteen eighty four variant, L Z W, powered the GIF image format and later detonated the Unisys patent wars. And Phil Katz welded the window to Huffman coding as DEFLATE, R F C nineteen fifty one, which became gzip, zlib, P N G, and the compression inside H T T P. Every web page you have ever loaded, this one included, traveled through this idea on the way to you.',
  },
  {
    section: 'pair',
    text:
      'The control structure owns the token stream: a sequence of literals and copy commands, each copy a distance and a length pointing backward into text the decoder has already written. The decoder is ten lines and cannot drift, because it only ever copies from its own finished output: even a self overlapping copy, distance one, length two hundred, meaning repeat the last byte two hundred times, unrolls correctly one byte at a time. That is how ten thousand identical bytes collapse to one hundred twenty seven. All the intelligence lives in the encoder; decoding stays trivial forever, an asymmetry that publish once, read many formats are built on. The heuristic supplies the window: match only against the recent past. That bounds memory and search, and it bets that repetition is local: real prose repeats phrases it used recently, not chapters ago. The dial is measured on this site’s own build plan: a two hundred fifty six byte window leaves forty nine thousand eight hundred twenty seven bytes; four kilobytes leaves thirty seven thousand eight hundred thirty eight; thirty two kilobytes leaves thirty two thousand seven hundred nineteen. Monotone by construction, asserted, and paid for in search time.',
  },
  {
    section: 'picture',
    text:
      'Picture a scribe copying a manuscript, with one lazy superpower. Most words they copy stroke by stroke: those are the literals. But whenever the text repeats something written within the last few pages, the scribe instead jots a margin note: same as two hundred five characters back, for twenty four characters. That note is the token. The reader reconstructs the passage perfectly by flipping back within those few pages, and the note never says, as in chapter one, because neither the scribe nor the reader keeps chapter one in view: the few pages they do keep are the window. The lazier the text, the shorter the copy. And a text with no repetition at all, pure noise, gains nothing and pays for the margin notes anyway.',
  },
  {
    section: 'run',
    text:
      'Here is the loop. Hash the next three bytes and look up recent positions that started with the same three: the hash chains. Extend each candidate backward match as far as it will go, up to the window’s edge, and keep the longest. If the best match reaches three bytes, emit a distance and length token; otherwise emit the literal byte; a single flag bit says which kind follows. Slide forward over what you just covered, indexing as you go; positions older than the window expire. Decoding is the mirror with no thinking: literals append; copies read from the output’s own tail, one byte at a time, so overlapping copies unroll into runs. One pass, fixed memory, and the exactness is checked here on every file, not assumed.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, real data with local repetition: logs, H T M L, style sheets, source code, J S O N. This site’s own stylesheet compresses two point nine three times under the window stage alone. Second, decoding must be cheap: the asymmetry of heavy encode and trivial decode fits publish once, read many perfectly, which is why P N G images, gzip archives, and game assets all live downstream of this scheme. Third, streaming with bounded memory: the window is the entire state, a fixed number of kilobytes, forever, no matter how long the stream runs.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: universal, streaming, decoder trivial, and honest about its limits. No model of the data is assumed: Ziv and Lempel’s universality theorem is the formal version of that sentence. Memory is the window, fixed. The decoder is ten unfailing lines. And every claim on this page round tripped byte exact on the repository’s living files: one point three seven to two point nine three fold from the window stage alone. The weakness: blind to symbol skew, greedy, and local by design. Without an entropy stage, the tokens themselves are wasteful: the forty percent gap to DEFLATE is exactly that waste, measured. Greedy longest match is not optimal parsing: modern zstandard runs an optimal parser over the same token language. Repetition beyond the window is invisible: the dial buys reach with search time. And on random data the scheme can only lose: plus twelve and a half percent, which is precisely the flag bits.',
  },
  {
    section: 'tradeoffs',
    text:
      'Here are the measured numbers, on fifty one thousand seven hundred ninety bytes of this site’s own build plan, every row decompressed byte exact. Huffman coding alone, the live unit that exploits symbol skew: thirty two thousand one hundred twenty eight bytes, one point six one fold. L Z seventy seven alone, this unit, exploiting repetition: thirty two thousand seven hundred nineteen bytes, one point five eight fold. Read those two rows twice, because the near tie is the lesson of the page: two methods, almost identical scores, and completely disjoint mechanisms. Huffman sees that the letter e is common and the hash mark is rare; the window sees that the phrase, the algorithm, appeared twelve lines ago. The proof that they are different is the third row: DEFLATE, which runs the window and then Huffman codes the tokens, lands at twenty three thousand sixty four bytes, two and a quarter fold: forty percent below either stage alone. Redundancy comes in kinds, and the kinds compose. That sentence is most of compression engineering.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is compression on the incompressible, and the page prices it to the byte. The ten thousand random bytes came back as eleven thousand two hundred fifty: expansion of exactly twelve and a half percent, which is the flag bits and nothing else, because in ten thousand random bytes not one three byte match existed to point at. That is the pigeonhole principle made flesh: no lossless scheme shrinks all inputs, since two different inputs cannot share one output. And data that is already compressed, zip archives, J P E G images, encrypted blobs, is random to every model by design. Production pipelines that gzip already compressed uploads spend real C P U to make their payloads larger. The rule costs one sentence: check the content type, or measure a single ratio, before paying to grow your data.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements the encoder with three byte hash chains and greedy longest match, the flag bit token framing, the ten line decoder, and an exact Huffman payload sizer for the comparison. The self test asserts, in order: byte exact round trips on four of this repository’s own files and on the deliberate edge cases: empty, single byte, and a short incompressible string. The all same stream collapsing better than fifty fold, measured at seventy nine. The random stream expanding, as the pigeonhole demands. The window dial monotone across two hundred fifty six, four thousand ninety six, and thirty two thousand seven hundred sixty eight bytes. And the pipeline inequality: zlib’s DEFLATE strictly beating both the Huffman only and window only sizes on the same file, with its own round trip checked. The corpus is the living repository, so the numbers move as the site grows; the properties are asserted so they cannot. If any claim on this page stopped being true, the file would fail before the page could lie.',
  },
];
