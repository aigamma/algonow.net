// The spoken lesson for puzzle twenty-seven, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle twenty seven: Aho Corasick, paired with the failure link automaton, for matching many patterns at once. Here is the puzzle. You are given a dictionary of k patterns and a text of n characters. Your task is to report every occurrence of every pattern, with its identity, where it matched and which entry it was. And the constraint carries the design: one pass over the text, exactly one, forward only, no matter whether the dictionary holds ten patterns or ten thousand. The dictionary may be preprocessed as lavishly as you like. The text may not.',
  },
  {
    section: 'origins',
    text:
      'Bell Labs, nineteen seventy five. Margaret Corasick was building a bibliographic search system, a service that scanned scientific literature for subscribers’ keyword lists, thousands of keywords at a time, and the projected computing bill was steep enough that special purpose hardware was under consideration. Alfred Aho supplied an algorithm instead: put the whole keyword list into one trie, thread the trie with failure links, and a single pass of the text serves every keyword simultaneously. Their paper reports the software comfortably outrunning the planned hardware. The Unix tool f grep shipped as exactly this automaton, and the same machine now runs wherever watchlists are largest: network intrusion detection, virus scanners, content filters, and DNA panel matching. One trie, fifty years of duty.',
  },
  {
    section: 'pair',
    text:
      'The control structure owns the trie, walked. All k patterns share a single prefix tree, whose node count is at most the total length of the dictionary, a bound the tests assert. The text drives a cursor through this tree, one character at a time: each character either extends the current path or invokes the mismatch machinery. Patterns end at marked nodes, and, through output links, patterns that end inside other patterns are collected too: the textbook nest is the word ushers, which contains she, he, and hers, and the tests pin all three, at their exact positions. The heuristic is puzzle nine’s failure function, grown up. Each node carries a link to the node spelling the longest proper suffix of its own string that also exists in the trie. On a mismatch, the automaton slides down that link, and maybe the next, until a path accepts the character, and the text finger never moves backward: exactly the KMP move, generalized from a single pattern to a dictionary. On a trie of one word, the two machines are the same machine. The tests verify every link in a thirty pattern automaton against the definition directly, longest proper suffix present in the trie, exhaustively enumerated. And the payoff is the contest’s flat row: the text pass costs the text, not the dictionary.',
  },
  {
    section: 'picture',
    text:
      'Picture a security checkpoint with a single guard who has memorized the entire watchlist as one decision tree. Names flow past a letter at a time, and the guard’s finger walks the tree as the letters arrive. When a letter breaks the current path, the guard never asks the queue to back up and repeat itself. Instead, the finger slides to the deepest place in the tree that still agrees with the letters just seen, because the tree was threaded in advance with exactly those shortcuts. One guard. One reading of the queue. Ten names on the list, or ten thousand: the queue moves at the same speed, and only the guard’s memory grows.',
  },
  {
    section: 'run',
    text:
      'Here is the loop. First, build the trie: insert all k patterns; shared prefixes share nodes, so the tree is at most as large as the dictionary itself. Second, thread the failure links by breadth first search: a node’s link is its parent’s link advanced by the same character, sliding further if needed, which is precisely how puzzle nine computed its table, now computed level by level across the whole dictionary at once. Third, chain the outputs: every node inherits the matches of its failure target, so a pattern that ends in the middle of another pattern’s path is never missed. Fourth, stream the text: for each character, slide down failure links until the character extends some path, then step forward; the sliding is amortized, at most two n slides across the entire text, a budget the tests assert. Fifth, report at every node: its output list is exactly the set of dictionary entries ending at this character, identities attached, positions computed by subtraction.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, many patterns and one stream: content filters, malware signatures, watchlists, keyword alerts: a thousand patterns is the design point, not an abuse. Second, the dictionary is stable: you build the automaton once and stream texts through it for days; if the dictionary churns hourly, the rebuild cost starts to argue with you, and the rivals section prices the alternative. Third, identities matter: you need to know which pattern fired and where, not merely whether anything did. When all three align, this is not one candidate among several; it is the reason the others are measured against it.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength, in one measured sentence: growing the dictionary tenfold, from one hundred patterns to one thousand, moved the automaton’s text work from ninety five thousand seven hundred steps to ninety six thousand eight hundred seven. One percent. The text pass costs the text. Add to that the streaming property inherited from its parent, the reusability of the automaton across endless texts, and identities and nested matches included, and you have the machine that ended a hardware project in nineteen seventy five. The weakness: memory and rigidity. Transitions cost dictionary times alphabet: dense byte tables spend two hundred fifty six slots per node for speed, sparse maps trade speed back for space, and enormous alphabets push toward hashed transitions with constants of their own. And the automaton is a built artifact: adding one pattern re-threads links, so dictionaries that change faster than they are searched belong to other machinery.',
  },
  {
    section: 'tradeoffs',
    text:
      'Here are the measured numbers: one text of fifty thousand characters, work counted in automaton and comparison steps, with the dictionary growing tenfold between columns. Aho Corasick: ninety five thousand seven hundred, then ninety six thousand eight hundred seven. Flat. Puzzle nine’s KMP, run once per pattern, the honest baseline: five million eight hundred twenty nine thousand two hundred forty eight steps at one hundred patterns, sixty one times the automaton, and at one thousand patterns it is not run, because the bill is k times n by construction: the failure link did not get faster in this unit; it got shared. And Rabin Karp with a single hash table of all patterns: fifty thousand forty steps, then fifty thousand one hundred seventy six: also flat, and actually the cheapest row, living inside its structural cage: every pattern must share one length, or you run one pass per distinct length, and every hash hit pays a verification. Three shapes, one lesson each: sharing the failure structure buys flatness in k; hashing buys flatness with a length cage; and refusing to share pays per pattern, forever.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is the thousand way regex alternation handed to a backtracking engine. Pattern one, bar, pattern two, bar, and so on to a thousand: it reads like one clean expression, and inside a backtracking engine it is the k pass strategy wearing convenient syntax: at each text position, alternatives are tried in turn, reproducing the measured k times n bill, with the added hazard of catastrophic backtracking when patterns overlap. The tell is what the serious engines do: R E two and Hyperscan compile large alternations into exactly this unit’s automaton before running. When your regex is really a watchlist, the automaton is not an optimization of the regex. It is what the regex should have been from the start.',
  },
  {
    section: 'code',
    text:
      'The Python solution builds the automaton in about forty lines: the trie as a list of dictionaries, failure links by breadth first search, output lists flattened through the links. Beside it stand puzzle nine’s KMP, run per pattern, and the multi pattern Rabin Karp, whose rolling hash taught this unit’s author a lesson mid build: the first draft multiplied before evicting the outgoing character, corrupting its coefficient, and the agreement oracle refused it on the spot; evict first, then shift. The self test asserts, in order: the ushers nest, she at one, he at two, hers at two, exactly, through output links; every failure link in a thirty pattern automaton equal to its definition, the longest proper suffix present in the trie, by exhaustive enumeration; three matchers plus a brute force slicing referee agreeing across sixty randomized dictionaries, overlaps and nestings included; the node count bounded by the dictionary’s total length; the text walk within its amortized sliding budget; and the contest regenerated, with the flat row asserted flat: less than double at ten times the patterns, measured at one percent. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
