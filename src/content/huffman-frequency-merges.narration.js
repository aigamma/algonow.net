// The spoken lesson for puzzle fourteen, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle fourteen: Huffman coding, paired with frequency sorted merges, for building optimal prefix codes. Here is the puzzle. You are given an alphabet of k symbols with known frequencies, and a message of n symbols drawn from it. Your task is to assign each symbol a string of bits so that the encoded message is as short as possible, and so that it decodes unambiguously with no separators between code words. The constraint that makes this a real problem is prefix freedom: no code word may be the beginning of another code word. That single property makes the bit stream punctuate itself, and it defines the arena in which optimal will actually mean optimal.',
  },
  {
    section: 'origins',
    text:
      'MIT, nineteen fifty one. Robert Fano offers his information theory class a choice: sit the final exam, or solve one problem instead: construct the optimal binary code. What he does not mention is that he and Claude Shannon have both attacked the problem and settled for a good but suboptimal method, splitting the alphabet from the top down. David Huffman, a twenty five year old graduate student, works on it for months, gets nowhere, and is about to throw his notes away and study for the exam when the idea arrives by inversion: stop splitting from the top. Build from the bottom. Merge the two rarest symbols first, treat the pair as one symbol, and repeat. He proves it optimal, hands it in, and publishes in nineteen fifty two. He never patents it. That term paper now runs inside deflate, JPEG, PNG, and MP3, and the professor’s own method appears later in this lesson, as a rival that never wins.',
  },
  {
    section: 'pair',
    text:
      'The control structure owns the tree discipline. Every symbol starts as a loose leaf carrying its frequency as a weight. Repeatedly, two subtrees are merged under a new parent whose weight is their sum, until a single tree remains. Reading left as zero and right as one, each symbol’s code is the path to its leaf, and its length is its depth. Prefix freedom is automatic, because symbols live only at leaves, and the path to one leaf can never pass through another. The heuristic decides which two subtrees to merge, and the answer is: always the two lightest. Here is why that greedy choice is a theorem rather than a hunch. Suppose an optimal tree parked a common symbol at the deepest level while a rare one sat higher. Swap them. The common symbol’s many occurrences each get a shorter code, the rare symbol’s few occurrences each get a longer one, and the total strictly falls. Contradiction. So some optimal tree has the two rarest symbols as siblings at the very bottom, which is exactly the shape one frequency sorted merge creates. Then induction on the merged alphabet finishes the proof. Rare symbols sink deep. Common symbols float shallow. And among all prefix free codes, nothing does better.',
  },
  {
    section: 'picture',
    text:
      'Picture a tournament run backwards, seeded by obscurity. Every symbol enters as a contestant. In each round, the two least popular contestants are taped together into a team, and the team’s popularity is the sum of theirs. Teams get taped to teams, until one grand alliance holds everyone. Now read off each symbol’s address: the sequence of tape jobs that brought it into the alliance. A symbol taped in the very first round, one of the two rarest, carries the longest address. The crowd favorite, taped in the final round, carries the shortest. The addresses are the codes, and popularity has priced every one of them.',
  },
  {
    section: 'run',
    text:
      'Here is the loop. First, count the frequencies and push every symbol into a priority queue keyed by weight. Second, pop the two lightest entries, hang them under a new parent that weighs their sum, and push the parent back into the queue. Third, repeat until one tree remains; that is k minus one merges, and with a heap the whole build costs k log k, trivial next to the message itself. Fourth, read the codes off the tree: the path to each leaf, zero for left and one for right, so depth is code length; a canonical renumbering of the same lengths lets the code table ship in a few bytes. Fifth, encode by table lookup, one entry per symbol, and decode by walking the tree bit by bit: each arriving bit chooses a child, each leaf emits a symbol and resets to the root. No separators exist anywhere, and none are needed.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, the frequencies are known or stable enough to ship a table with the data; sources that drift want the adaptive variants. Second, whole bits per symbol are affordable, meaning no single symbol is so dominant that rounding its ideal fractional cost up to one full bit hurts; the trade offs section measures exactly what happens when that fails. Third, decoding speed and simplicity matter: table walks and tree steps, no per symbol arithmetic, friendly to hardware, which is a large part of why the nineteen fifty two method still ships in formats designed forty years later.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: optimal, and provably so, in its arena. Among all prefix free codes, none beats it, and the tested solution does not take the textbook’s word: on two hundred random alphabets it enumerates every code length assignment permitted by the Kraft inequality and confirms that nothing beats the Huffman cost. On the prose instance, the tree lands within seven tenths of a percent of the entropy floor. The weakness is the one bit floor. A prefix code must spend at least one whole bit on every symbol, no matter how predictable that symbol is. When one symbol dominates the stream, the ideal cost is a small fraction of a bit, and rounding it up to one is catastrophic in relative terms. That is the skew cliff, and the numbers are next.',
  },
  {
    section: 'tradeoffs',
    text:
      'Here are the measured numbers, in bits to encode each instance. First instance: two hundred thousand symbols of English like prose, whose entropy floor is eight hundred five thousand one hundred forty one bits. Plain ASCII spends one million six hundred thousand. A fixed width code over the actual alphabet spends one million and twenty. Shannon and Fano’s top down splitter spends eight hundred ten thousand seven hundred sixty one, and Huffman spends exactly the same on this alphabet, a genuine tie here, with the difference that the sweep proves Fano never wins and sometimes loses. Arithmetic coding spends eight hundred five thousand one hundred forty two: one single bit above the floor. And range A N S spends eight hundred five thousand one hundred sixty eight, the same ratio from table lookups. Second instance: a sensor feed that is ninety eight percent one quiet symbol, entropy floor thirty one thousand five hundred fifty seven bits. Huffman pays two hundred three thousand nine hundred ninety nine, six and a half times the floor, because the floor of one bit per symbol has become the entire cost. Arithmetic coding pays thirty one thousand five hundred fifty eight. One bit above the floor, again. Same frequencies, same message, and the arena, prefix codes, is suddenly the wrong arena.',
  },
  {
    section: 'tradeoffs',
    text:
      'Two rivals deserve their own sentences. Arithmetic coding abandons the idea of a code word per symbol entirely: the whole message becomes one long binary fraction, and each symbol narrows the interval in proportion to its probability, so a ninety eight percent symbol costs three hundredths of a bit. Its price is real arithmetic on every symbol and delicate carry handling. Asymmetric numeral systems, A N S, is the modern resolution of that trade: arithmetic coding’s ratios at Huffman’s table driven speed, with the odd property that encoding runs backwards, last symbol first. It is the engine inside z standard, L Z F S E, and JPEG X L, and the honest summary of fifty years of entropy coding is one sentence: Huffman when no symbol dominates, A N S when the ratios matter. And the method you would never bring to this problem is run length encoding, because it prices repetition, not skew. English prose has almost no runs, so naive symbol and count pairs expand the instance to over three million bits, nearly double raw ASCII. Measured, not asserted. R L E becomes exactly right when runs are the real structure, fax lines, sparse bitmaps, and then usually as a stage before an entropy coder, never instead of one.',
  },
  {
    section: 'code',
    text:
      'The Python solution builds four real coders and races them. Huffman is a heap of subtrees and a canonical code assignment. Shannon Fano is the recursive balanced splitter. The arithmetic coder is the classic thirty two bit integer implementation with the three renormalization cases and pending bit handling, and its decoder reverses it exactly. The A N S coder quantizes frequencies to four thousand ninety six slots, encodes in reverse with byte wise renormalization, and decodes forward. The self test asserts seven things. Huffman’s cost equals the best possible over every Kraft feasible length assignment on two hundred random alphabets, exhaustively. The code is genuinely prefix free and its Kraft sums come to exactly one. All three serious coders round trip to the exact original on both instances. No coder lands below the entropy floor, which is Shannon’s theorem doing duty as a unit test. The near entropy coders land within one percent of the floor. The skew cliff holds: Huffman at or above one bit per symbol while arithmetic and A N S crush it. And the run length expansion is measured. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
