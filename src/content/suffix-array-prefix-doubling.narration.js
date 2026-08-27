// The spoken lesson for puzzle forty nine, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle forty nine: suffix array construction, paired with prefix doubling ranks, for full text indexing. Here is the puzzle. You hold a text of n characters that will be queried many times: locate this pattern, count that one, find the longest repeated passage. Build the sorted array of all n suffixes: the index that answers every such question by binary search, forever after. The constraint is what naive sorting costs: comparing two suffixes character by character costs their common prefix, and repetitive text drives that toward n per comparison: measured on this page at one hundred twenty one times. And materializing the suffixes as strings would need about n squared over two memory: one point eight gigabytes for this page’s own sixty six kilobyte corpus: stated, and deliberately not run.',
  },
  {
    section: 'origins',
    text:
      'Manber and Myers introduced suffix arrays in nineteen ninety as the space frugal alternative to suffix trees, which Weiner had invented in seventy three and Ukkonen would make online in ninety five: the same questions, a fraction of the memory. The prefix doubling construction descends from Karp, Miller, and Rosenberg’s nineteen seventy two insight that ranks compose. Linear time constructions arrived in a famous trio of papers in two thousand three. And the structure’s biggest client emerged in genomics: the F M index, built on the Burrows Wheeler transform, which is itself just the suffix array read sideways, aligns billions of DNA reads every day. This page’s corpus is humbler and closer to home: the site’s own build plan, indexed and interrogated.',
  },
  {
    section: 'pair',
    text:
      'The control structure owns the sort. The index is nothing more than the sorted order of the n suffixes, stored as n starting positions. Every query is then binary search: locate and count in pattern length times log n, verified here against a find loop referee on twenty patterns. And the L C P array: longest common prefix of each adjacent pair: turns the sorted order into structure: the longest repeated substring of this site’s plan, seventy eight characters of its own boilerplate, fell out of a single max. The heuristic supplies the doubling ranks. After round k, every suffix knows its rank among all two to the k character prefixes. So round k plus one sorts by the pair: my rank, and the rank of the suffix starting two to the k positions later. Two integers stand in for twice as many characters, the certified horizon doubles per round, and ceiling of log two of n rounds always suffice, asserted. The measured corpus finished in seven rounds: because its longest repeat is seventy eight characters, and seventy eight is less than two to the seventh. The round count and the maximum of the L C P array are the same fact, seen from two sides, and this page measured both.',
  },
  {
    section: 'picture',
    text:
      'Picture alphabetizing a phone book of names that share enormous family prefixes. The naive clerk compares two entries letter by letter from the beginning, every single time: on repetitive text, that is reading half of each name per glance, and this page measured that clerk paying one hundred twenty one times more on repetition than on prose. The doubling clerk works differently. One pass assigns every one letter prefix a rank. The next pass sorts by pairs of ranks: my first half’s rank, my second half’s rank: and re ranks. Each pass doubles how much of every name is already summarized inside a single number. Seven passes summarize one hundred twenty eight letters. And no name in this particular book agrees with any other past seventy eight.',
  },
  {
    section: 'run',
    text:
      'Here is the loop. Round zero: rank every suffix by its first character alone. Round k: sort the suffixes by the pair, rank of i, rank of i plus two to the k, using minus one when the second half runs off the end, then assign fresh ranks: equal pairs share a rank, distinct pairs advance it. Stop when all n ranks are distinct: at most ceiling log two of n rounds, and seven here. Then run Kasai’s algorithm: one linear pass, walking suffixes in text order, computes every adjacent common prefix length: the L C P array: which gives you repeats, distinct substring counts, and, on this page, the certificate: every adjacent pair of the sixty six thousand suffix ordering was verified through it, character by character. Queries are binary search over the array: locate, then count as a range.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, many queries against one text: search inside a book, a genome, a codebase: the index pays its sort once and answers forever; for a single one off search, Boyer Moore, a live unit here, is the tool, and building an index would be a loss. Second, repeat structure is itself the question: longest repeated substring, longest common substring of two documents, tandem repeats in DNA: the L C P array is the answer sheet. Third, memory discipline matters: one integer per character, a fifth of a suffix tree’s pointer bill, which is the practical reason arrays displaced trees almost everywhere.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: one structure, every substring question, and certified rather than trusted. All sixty five thousand nine hundred ninety five suffixes ordered, with the sortedness proven adjacent pair by adjacent pair through a Kasai L C P array that was itself re verified character by character: the common run holds, is maximal, and orders strictly. Twenty pattern queries agreeing with the referee. The longest repeat surfaced by a max. Rounds bounded by the logarithm and finishing in seven. The weakness, in three honest parts. The index is static: edit the text and the array rebuilds; suffix trees and automata handle online growth, and Ukkonen’s construction is the tier one sibling for exactly that. At genome scale, n log n loses to the two thousand three linear time constructions. And each query pays a log factor that the F M index’s backward search shaves to pattern length alone, compressed below the text itself: which is why bioinformatics lives there now.',
  },
  {
    section: 'tradeoffs',
    text:
      'Here are the measured numbers. The corpus: this site’s own plan, sixty five thousand nine hundred ninety five characters. Prefix doubling: seven rounds, each a sort of n rank pairs: and the seven corroborates the corpus’s longest repeat of seventy eight characters, since seventy eight lies below two to the seventh. The adversary terrain, at one thousand characters: English prose costs the character by character sort fourteen thousand nine hundred twelve comparisons: genuinely fine, because prose repeats little. The string a b repeated five hundred times costs the same sort one million, eight hundred eleven thousand and ninety: one hundred twenty one times more, because every comparison wades through roughly five hundred shared characters before deciding anything. Doubling used ten rounds on both terrains: indifference is exactly what the ranks purchase. And the naive slice sort, the one liner that materializes every suffix: the referee at small sizes, and at this corpus’s size, one point eight gigabytes of memory: stated, not run.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is materializing the suffixes, and the shape of the mistake is worth keeping, because the line is so innocent: sorted, of all suffix strings. It is one line. It is correct. This page uses exactly that line as its small scale referee. The sin is only scale: the slices of a text of length n hold about n squared over two characters, so this sixty six kilobyte plan would cost one point eight gigabytes, and a ten megabyte log file would cost fifty terabytes. An index exists to avoid materializing the thing it indexes: an index that quadratically copies its own text has misunderstood its job description. The general rule costs one sentence: before shipping a one liner, price its hidden copies: correctness at n of one hundred says nothing about memory at n of one hundred thousand.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements prefix doubling with round counting, the naive slice sort as small scale referee, the character by character comparison sort with a compare counter as the honest middle rung, Kasai’s linear L C P construction, binary search locate and count, and the longest repeat extraction. The self test asserts, in order: three hundred slice refereed builds across four text shapes, including runs and near periodic strings. At full scale, the entire ordering certified through the L C P array, with the array itself re verified: each claimed common run present, maximal, and strictly ordered at its first difference. Rounds within the ceiling of log two of n, measured at seven. Twenty pattern locates and counts equal to the find loop referee, overlapping occurrences included. The longest repeated substring verified to occur at least twice, with the L C P maximum as its certificate. And the adversary ratio, one hundred twenty one fold, measured. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
