// The spoken lesson for puzzle sixty, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle sixty: LZW, paired with the growing phrase dictionary, for dictionary compression. Here is the puzzle. A byte stream needs to shrink, and the decoder on the far side will only ever see your codes. Phrase dictionaries are the obvious tool: replace repeated words with short symbols: but shipping the dictionary costs the very bits you were saving. The constraint sharpens the puzzle into its classic form: the dictionary must be learned from the data, and learned twice, identically, by two machines that never exchange it. The referee on this page is the round trip: decode of encode equals the input, byte for byte, on every corpus and three hundred mixed trials: with zlib, the shipped standard, racing honestly in every row.',
  },
  {
    section: 'origins',
    text:
      'Terry Welch published this in nineteen eighty four at Sperry Research, as a hardware friendly tightening of Ziv and Lempel’s nineteen seventy eight scheme: and it conquered the decade. Unix compress. GIF. TIFF. Modem standards. Then came the strangest chapter any algorithm on this site can claim: in the nineteen nineties, Unisys began enforcing the LZW patents, and the free software world answered by building a whole new image format: PNG, riding on the unpatented DEFLATE. A patent created a file format. The patents expired in two thousand three, the drama faded, and the design is still inside every GIF that has ever loaded.',
  },
  {
    section: 'pair',
    text:
      'The algorithm owns the greedy longest match scan. Keep extending the current phrase while the table still knows it; the moment it falls off the map, emit the code for the longest known prefix, and start fresh from the byte that broke it. One pass, one table lookup per byte, fixed width codes out: twelve bits on this page, for legible accounting. The heuristic supplies the growing phrase dictionary, and the coupling is the entire trick: every emission also mints exactly one new phrase: the phrase just emitted, plus the byte that broke it. So the table ends at exactly two hundred fifty six plus the number of codes, minus one: asserted, exact. And because minting follows emission by rule, the decoder can replay the same rule one step behind and grow the identical table from the codes alone. Nothing but codes ever crosses the wire.',
  },
  {
    section: 'picture',
    text:
      'Picture two stenographers inventing shorthand in parallel. The sender writes a word, and both of them agree, by the same standing rule, that this word plus its next letter now has a private symbol. Neither ever mails the codebook. It does not need mailing: every symbol was minted in public view, one step before its first possible use, so the receiver can reconstruct the whole book from the messages themselves. The famous corner is the symbol used the very instant it is minted. The receiver, one step behind, has not written that entry yet: but the timing forces what it must be: the previous word, plus that word’s own first letter. Forced, not guessed: this page counted the corner arising three thousand eight hundred ninety eight times across its trials, and the round trip survived every one.',
  },
  {
    section: 'run',
    text:
      'Here is the run. Extend the phrase while the table knows it. Emit the longest known prefix’s code, and mint phrase plus next byte as a new entry. The decoder replays the same rule one step behind: identical table, never transmitted. When a code arrives that the decoder has not built: the minted this instant case: reconstruct it as the previous phrase plus its own first byte. And mind the cap: at two to the twelfth entries the table freezes, and a frozen dictionary on drifting data is a tax this page measures at one hundred seventy two percent: Unix compress shipped a clear code, and watched its own compression ratio, for exactly this reason.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, there is no side channel for a codebook: the decoder is firmware, a file format reader, a stranger across a modem: everything must ride inside the stream itself. Second, the redundancy is phrase repetition, not just symbol skew: logs, prose, telemetry, where the same words recur whole: a dictionary pays exactly where Huffman’s one symbol at a time view is blind. Third, the machine must be tiny: the nineteen eighty four pitch still holds: no window searches, no code trees: one table, one lookup per byte, simple enough for hardware.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: the dictionary is free, the machine is tiny, and the corner is forced rather than patched. Four point three six to one on English like text; four point six five to one on a server log; every corpus round tripped byte exact. The growth invariant lands exactly: table equals two fifty six plus codes minus one. The reconstruction corner was exercised thousands of times without a miss. And dictionary reuse is real: two halves of the same kind of data compressed four percent better sharing one learned dictionary than starting fresh. The weakness comes in three measured parts, and the next sections price them: noise expands, drift taxes, and the shipped standard wins.',
  },
  {
    section: 'tradeoffs',
    text:
      'Here is the contest, on a forty nine thousand seven hundred eighty one byte synthetic server log, every row decompressed byte exact. Raw bytes: one point zero zero, the stream as it arrived. LZW with twelve bit codes: four point six five to one: ten thousand seven hundred seven bytes, and not one bit of dictionary transmitted. DEFLATE, via zlib at level nine: five point three zero to one: the winner here, and on the text corpus, five point five seven against four point three six, and on random bytes, where it simply refuses to expand. The rivals tell the same story from three sides. LZ77, a live unit here, keeps the dictionary as the sliding window itself: adapts instantly, no cap to freeze. Huffman coding, also live, works the orthogonal axis: symbol skew, blind to phrases. And DEFLATE is precisely those two rivals composed: which is why it displaced this unit’s method nearly everywhere.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is LZW on incompressible bytes. Encrypted data, already compressed data, random noise: there are no phrases to learn, but the encoder still pays twelve bits per code for phrases that stubbornly stay one byte long. Measured on this page: zero point seven zero to one: an expansion of one point four two: byte for byte worse than doing nothing at all. On the same corpus, zlib holds at one point zero zero, because DEFLATE detects the futility and stores raw blocks. The engineering lesson generalizes: a compressor in a pipeline must be allowed to say no. Wrap the output in a did it shrink check, the way compress’s ratio monitor did in nineteen eighty four: or your archiver becomes an inflater on exactly the data that looks most modern.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements the encoder, the one step behind decoder with the forced corner, and the bit accounting, with zlib imported as the shipped rival. The self test asserts, in order: three hundred round trips byte exact across mixed alphabets, plus the empty and single byte edges. The corner forced deterministically on a run gadget and counted in the wild: three thousand eight hundred ninety eight reconstructions. The growth invariant, exact. The three corpus contest: text four point three six, log four point six five, noise zero point seven zero, with zlib winning every row. And the freeze on drift lesson in both directions: text plus DNA jointly costs one hundred seventy two percent more than fresh dictionaries per half, while same kind halves save four percent by sharing. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
