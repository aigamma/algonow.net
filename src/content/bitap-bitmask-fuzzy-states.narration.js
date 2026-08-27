// The spoken lesson for puzzle sixty six, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle sixty six: the bitap algorithm, paired with bitmask fuzzy states, for approximate string matching. Here is the puzzle. A pattern, a long text, and an honest admission: the text lies a little. A typo, a sequencing error, a mistranscribed base. Find every position where the pattern matches with at most k edits: insertions, deletions, substitutions: in a single pass over the text. Exact search is blind here: this page plants a probe with one substituted character in a one hundred twenty thousand base genome, and find returns minus one, working precisely as specified. The dynamic program sees everything and pays n times m cells. The question this unit answers: can that entire DP column ride inside a machine word? The referee is the DP itself, agreeing on every end position across four hundred exhaustive cases.',
  },
  {
    section: 'origins',
    text:
      'October nineteen ninety two, one issue of the Communications of the ACM, two papers printed back to back. Pages seventy four to eighty two: Baeza Yates and Gonnet’s shift or: the exact bitmask scan. Pages eighty three to ninety one: Wu and Manber’s Fast Text Searching Allowing Errors: which stacked k plus one of those registers into the fuzzy machine and shipped it as a tool called agrep: for years the fastest way on Unix to grep with typos. The core trick is older than both papers: Balint Domolki was running pattern automata through bit vectors in nineteen sixty four. But nineteen ninety two is when the trick met the tool everyone actually wanted: search that forgives.',
  },
  {
    section: 'pair',
    text:
      'The algorithm owns the one pass scan. Read the text left to right, constant work per character, and report every position where a match ends. No text preprocessing, no index, no backtracking: the pattern is compiled once into one bitmask per letter, and the text flows through. The heuristic supplies the state registers. Bit j of register R sub d means: the pattern’s first j plus one characters match a suffix of what has been read, with at most d errors. One shift and AND against the current letter’s mask advances every prefix hypothesis simultaneously: and three extra OR operations per error level splice in substitution, insertion, and deletion, inheriting each dying hypothesis into the next register up. The entire Sellers DP column lives in k plus one machine words. Measured: two million eight hundred eighty thousand DP cells against two hundred forty thousand word operations: identical answers, the same arithmetic, packed twenty four lanes wide.',
  },
  {
    section: 'picture',
    text:
      'Picture a row of two dozen lamps, one for each prefix of the pattern. Every text character throws one big lever. The shift slides every lit lamp one position rightward: each hypothesis grew by a letter: and the letter’s mask instantly snuffs every lamp whose next pattern character is not the letter just read. Lamps light, cascade, and die in waves: and when the final lamp lights, a complete match just ended at this very character. The fuzzy version installs a second row of lamps wired to the first: when a lamp in the exact row dies of a typo, the one error row inherits its glow through the substitution splice and carries on burning. In this page’s client you can watch it happen: the exact row goes dark at the mutated base: and the one error row sails through to the finish lamp.',
  },
  {
    section: 'run',
    text:
      'Here is the run. Compile: for each letter, a mask with bit j set exactly where the pattern’s letter j is that letter. Scan: the exact register shifts left, takes an OR with one to admit a fresh start, and an AND with the letter’s mask: every hypothesis advances or dies in one operation. Stack the error levels: each higher register also ORs in three splices: the previous level shifted, for substitution; the previous level unshifted, for insertion; and the current level of the neighbor below, for deletion. Report: when bit m minus one lights in register k, a match with at most k edits ends here. And mind the word: in C the mask dies at sixty four pattern characters. Python’s big integers keep going: this page verifies a ninety six character pattern against the referee: but each operation then spans multiple machine words. A cost cliff, not a correctness cliff: and the page says which.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, the text lies a little: OCR output, DNA sequencing reads, user queries with fat fingered keys: this page measured exact search missing a planted one substitution site entirely, returning clean and empty. Second, short pattern, long text, no index: the pattern fits in a machine word and the text streams past exactly once: agrep’s home ground, and a router’s, and a firmware scanner’s. Third, positions suffice: you need to know where matches end, not how they align: bitap keeps no traceback, and that absence is precisely its speed.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: one pass, word parallel, and referee matched everywhere. Agreement with the Sellers dynamic program on all four hundred exhaustive small cases, at k equals zero, one, and two, over alphabets of two and four letters: and again on the full client. Exact mode equal to the naive scan. The planted typo pinned at base seventy one thousand three, where find returned minus one. Twelve times fewer operations than the DP, each operation updating all twenty four pattern positions at once. And the ninety six character pattern: well past C’s word cliff: still exact on Python’s arbitrary precision integers. The weakness: positions, not alignments, and the word sets the price. Bitap cannot tell you which base changed: reconstructing the edit script is the live Wagner Fischer unit’s job. The cost scales with k plus one registers times the words the pattern spans: long patterns and generous error budgets erode the packing that is the entire advantage. And it searches for one pattern: dictionaries belong to the live Aho Corasick automaton.',
  },
  {
    section: 'tradeoffs',
    text:
      'The rivals, honestly placed. Wagner Fischer, the live unit and this page’s referee: the full table, every cell paid individually, and in exchange the traceback: it can say which edit happened, at any pattern length and any error budget. When the alignment itself matters, it is not a rival but the successor. Smith Waterman, also live: weighted similarity: match bonuses, gap penalties, local islands: biology’s real scoring, of which bitap’s unit cost edits are the special case worth twelve x. And Boyer Moore, also live: the exact search champion, skipping most of the text entirely: measured on its own page at half an n: unbeatable when zero errors is truly the specification, and measured on this page missing the planted site, because one substitution is invisibility. Three live badges: this corner of the site now argues with itself, which is the point.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is exact search on text that lies, and the client makes it visceral. A twenty four base probe, planted in a one hundred twenty thousand base genome with exactly one substituted base. Find returns minus one. Bitap at k equals zero agrees. Both are working perfectly: exact means exact, and one wrong character is total invisibility. The danger is the shape of the failure: it does not degrade, it does not warn: it returns clean, confident, empty results: the most dangerous kind of wrong, because empty looks like there was simply nothing to find. Sequencing reads err at every position. OCR mangles. Users typo. If the data can lie, the specification must budget for errors: k equals one here found the site for two word operations per character. The failure was never the algorithm’s. It was specifying exact for a world that is not.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements the mask compiler, the Wu Manber scan with k plus one registers and an operation counter, and the Sellers dynamic program as the referee, cell counted. The self test asserts, in order: agreement with the referee on every end position across four hundred exhaustive small cases, alphabets of two and four, k from zero to two. Exact mode equal to the naive scan on fifty longer texts. The client: the planted one substitution site found by k equals one and by the referee at the same position, missed by find and by k equals zero. The meter, exactly: n times m cells against n times k plus one word operations: twelve to one. And the ninety six character pattern, past the C word cliff, still referee exact. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
