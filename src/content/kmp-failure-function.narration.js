// The spoken lesson for puzzle nine, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle nine: the Knuth Morris Pratt algorithm, paired with the failure function, for finding a pattern inside a text. Here is the puzzle. You are given a text of n characters and a pattern of m characters, over any alphabet you like. Your task is to report every position where the pattern occurs in the text, and overlapping occurrences count. The constraint is the interesting part: the text may only be read forward. Once your eyes have passed a character, you never back up to look at it again. Hold that constraint in mind, because the entire method exists to make it affordable.',
  },
  {
    section: 'origins',
    text:
      'James Morris and Vaughan Pratt worked the method out in nineteen seventy, in a technical report at Berkeley. Donald Knuth found the same algorithm from a completely different direction. He had been reading Stephen Cook’s theorem about a class of abstract machines, two way pushdown automata, and by tracing through what the theorem’s simulation actually did, he extracted a linear time string matcher. He later said it was the first time in his experience that automata theory had taught him how to solve a real programming problem better. The three published together in nineteen seventy seven. One more detail belongs in the record. Morris built the method into his text editor, and the code was subtle enough that another maintainer, unable to understand why it was written the way it was, later repaired it back into a slow loop. Keep that story; it is the honest price tag on this pairing.',
  },
  {
    section: 'pair',
    text:
      'The control structure owns a discipline. Two fingers: one on the text, one on the pattern. The text finger never moves backward, not once, on any input. Every character of the text is consumed exactly one time, in order. That is why this same loop runs on a string in memory, on a tape, or on a live network socket, without changing a line. All of the cleverness lives in what happens to the pattern finger when a comparison fails. The heuristic, the guiding rule, is the failure function. For every prefix of the pattern, it stores one number: the length of that prefix’s longest border, meaning the longest piece that is both a proper prefix and a suffix of it. When a match breaks after j characters, the failure function answers one question in constant time: how much of the certainty I just built up is still standing? The pattern finger falls back to that number, and the text finger stays exactly where it was. Notice what the table is built from. The pattern alone. Nothing about the text is ever stored.',
  },
  {
    section: 'picture',
    text:
      'Picture a ticker tape running through a window in one direction. There is no rewind handle. You are watching for a code word. A promising run of letters starts to match, and then it breaks at the ninth letter. Here is why you feel no panic about the eight letters already gone by: you know exactly what they were. They matched your code word, and the code word is in your hand. So before the tape ever started, you prepared a small card from the code word alone. The card says: if you had matched eight letters and then broke, then the last six of those letters are also how the code word begins, so carry on exactly as if you had matched six. Every memory this method needs is memory about the pattern. None of it is memory about the tape.',
  },
  {
    section: 'run',
    text:
      'Here is the loop. First, before touching the text, compute the failure table: for every j, the length of the longest proper border of the pattern’s first j characters. That costs time proportional to the pattern, and it is done by the same two finger argument, run on the pattern against itself. Second, walk the text with finger i, keeping a count j of how many pattern characters are currently matched. Third, on a match, advance both fingers. Fourth, on a mismatch while j is greater than zero, set j to the failure value of j, and compare again. The text finger does not move. Fifth, on a mismatch when j is zero, nothing was at stake; advance the text finger. And sixth, when j reaches m, the full pattern length, record a match, set j to the failure value of m, and keep walking. That last step is why overlapping occurrences fall out for free: finishing a match is treated exactly like any other fallback.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, the input is a stream you cannot store or rewind: a socket, a tape, a sensor feed, or simply a file larger than memory. Second, the data is repetitive. Genomes, logs, and telemetry are full of self similarity, and self similar text is exactly where methods that re-read go quadratic. Third, you need a hard worst case guarantee: a latency budget you must keep, or input that an adversary gets to choose. If none of those hold, stay for the trade offs section, because on ordinary text this method’s honest rival is a dead heat.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength is that the guarantee travels. At most two n plus m comparisons on any input whatsoever, overlapping matches included, and the text finger never backs up. The failure table is also reusable structure in its own right: it is the border array, it detects periodicity in strings, and it is the skeleton that the Aho Corasick automaton grows into when you need to match a whole dictionary at once. The weakness is that it reads everything. There is no skipping ahead, so on ordinary prose, Boyer Moore examines about nine times fewer characters. And the subtlety is a real cost: this is the algorithm that has been getting repaired into bugs since Morris’s own editor.',
  },
  {
    section: 'tradeoffs',
    text:
      'Here are the measured numbers, on the unit’s home ground. The instance is a strand of one hundred twenty thousand characters, the letters C A repeated sixty thousand times with forty seeded mutations, the tandem repeat structure that DNA fingerprinting actually reads. The pattern is that same repeat, thirty characters long, and it occurs fifty nine thousand three hundred eighty six times, overlapping. Work is characters examined, with hash updates counted for Rabin Karp so every row pays in the same currency. Knuth Morris Pratt examined one hundred twenty thousand six hundred eleven characters, essentially one look per character of text. The naive scan examined one million eight hundred fifty thousand eight hundred ninety five, about fifteen times more, every extra look a re-read of something it had already seen. Boyer Moore, the famous skipper, examined one million seven hundred eighty one thousand six hundred thirty eight, because on a text made of repeats the skip rules collapse. And Rabin Karp examined one million nine hundred one thousand five hundred eighty, the worst on the board, because every one of those fifty nine thousand matches forces a verification, and verification is re-reading.',
  },
  {
    section: 'tradeoffs',
    text:
      'Now the honest crossover. Run the same four methods over one hundred twenty thousand characters of ordinary prose, searching for a thirteen letter word that is not there. Knuth Morris Pratt examines about one hundred twenty two thousand characters. The naive scan examines about one hundred twenty three thousand, a dead heat, because diverse text kills almost every alignment on its first letter. Rabin Karp examines about one hundred twenty thousand, one hash update per character. And Boyer Moore examines thirteen thousand three hundred thirty four, nine times fewer than everyone else, because a diverse alphabet lets it skip almost a full pattern length at every stop. So the ranking flips completely between the two instances, and that flip is the lesson. You do not choose Knuth Morris Pratt because it is fast on average. You choose it because its cost is a promise the input cannot break: repetitive data cannot slow it down, an adversary cannot slow it down, and a stream never needs to be rewound.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never bring to this problem is a suffix tree of the text, built to answer one streaming search. A suffix tree answers pattern queries in time proportional to the pattern, which sounds unbeatable, but only after an expensive build that holds ten to forty bytes of index for every character of text, resident in memory, before the first answer arrives. For one search that is paying more for the index than the question costs. And on a stream it is not merely slow, it is impossible, because the text has to be gone the moment it passes the window. Indexing earns its keep when the text is fixed and the queries number in the thousands. That is a different problem, full text indexing, and it has its own methods and its own page.',
  },
  {
    section: 'code',
    text:
      'The Python solution carries all four methods so the contest is reproducible rather than quoted. The failure function is built by the two finger argument run on the pattern against itself, and the search loop consumes the text with a plain forward iteration, so the never backs up property is structural: there is no code path that could move the text index backward. The self test then checks five things. The failure table is compared against a brute force border computation, a second, independent formulation of the same definition. All four matchers, and Python’s own find method as an outside referee, must report identical results across hundreds of random and adversarial cases, including overlapping matches. The theorem is checked numerically: on every case, comparisons stay under twice the text length plus the pattern length. The naive scan’s backup counter must show it really does re-read on repetitive input. And the published contest numbers are regenerated and their ordering asserted, so if any number on this page stopped being true, the file would fail instead of the page quietly lying.',
  },
];
