// The spoken lesson for puzzle sixty eight, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle sixty eight: the suffix tree, paired with Ukkonen’s online construction, for full text indexing. Here is the puzzle. A long text will be indexed once and interrogated forever: is this substring present? What is the longest repeated stretch? What do two texts share? The suffix tree answers all of these: a compressed trie holding every suffix, so that every substring of the text is a walk from the root. The catch is the build. Inserting the n suffixes one by one costs n times the average depth: measured on this page at three hundred fifty eight times worse on repetitive text, which is exactly the text this structure exists for. The referees: exact suffix set equality on two hundred random strings, the linear size theorem on every build, Python’s own membership operator on five hundred queries at scale, and dynamic programming cross checks on both repeat structure clients.',
  },
  {
    section: 'origins',
    text:
      'Peter Weiner invented the structure in nineteen seventy three: Donald Knuth reportedly crowned it the algorithm of the year. Edward McCreight simplified the construction in nineteen seventy six. And Esko Ukkonen, in Algorithmica, nineteen ninety five, published the form the world now learns: the first construction that is truly online: after every single character, the tree of the text so far is complete and correct: and honest enough to teach. Its famous machinery: open leaf ends, the active point, rule three’s early stop, suffix links: reads like a bag of four unrelated tricks, and is in fact one amortized argument wearing four masks. This page counts the argument: two point three three extension steps per character, measured across two hundred thousand characters.',
  },
  {
    section: 'pair',
    text:
      'The algorithm owns the suffix tree itself. Every suffix is a path from the root; paths that begin identically share edges; an edge with no branching is compressed into one labeled rail. Consequences cascade: substring search costs only the pattern’s length: a twenty character query on the two hundred thousand character client walked exactly twenty comparisons. The deepest internal node is, by definition, the longest repeated substring: forty seven characters here, verified by brute force. And one generalized tree over two texts hands over their longest common substring: equal to the dynamic program on all one hundred pairs. The heuristic supplies Ukkonen’s machinery, the reason the build is linear: leaves whose ends grow for free, an active point that remembers exactly where the next extension happens, rule three’s stop, and suffix links that teleport between extension sites. Four ideas, one bill: amortized constant work per character.',
  },
  {
    section: 'picture',
    text:
      'Picture a railway map of every journey through the text. Each suffix is a train line departing the central station. Lines that begin identically share track until the first place they must diverge, and a switch marks every divergence. Compressed track means a stretch with no switches is one long rail with its name painted along it: not a station every meter. Asking whether a substring occurs is boarding at the central station and riding rails for exactly the pattern’s length: the text’s size never enters the fare. And the switch that sits deepest into the network is, by pure definition, the longest stretch of track that two journeys share: the longest repeated substring, read directly off the map, no searching at all.',
  },
  {
    section: 'run',
    text:
      'Here is the run. Stream the text left to right; after each character, the tree of the prefix so far is complete. Grow the leaves for free: every leaf edge ends at one global pointer, and a single increment extends them all: once a leaf, always a leaf. Extend at the active point: either a fresh leaf hangs off an existing node, or an edge splits in the middle and a leaf hangs off the new junction: with suffix links wired between consecutive splits. Stop the phase on rule three: if the current suffix is already in the tree, every shorter suffix is too: nothing to do. And teleport by suffix link to the next extension site rather than re walking from the root. The total, measured: four hundred sixty four thousand extension steps for one hundred ninety nine thousand characters: two point three three per character, asserted under six.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, one text and many questions: build once, then answer substring queries in pattern time: twenty comparisons for a twenty character probe, whether the text is a page or a genome. Second, repetition is the subject: longest repeats, shared substrings, tandem structure: the questions genomes and logs ask: and precisely the data where this page measured the naive build collapsing by three hundred fifty eight times. Third, online matters: the stream is still arriving, and the index must be correct after every character: the property Ukkonen’s paper is literally named for.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: every claim on this page has a referee. The leaf path labels equal the true suffix set on two hundred random strings. The linear size theorem: at most two n plus two nodes, exactly n plus one leaves: holds on every single build. The amortized bill lands at two point three three steps per character at scale. Five hundred membership queries agree with Python’s own operator. The longest repeat is brute force verified on a hundred strings, and the longest common substring equals the dynamic program on a hundred pairs. The weakness: memory, constants, and fragile beauty. The nodes cost real bytes: some twenty per input character even in careful C: an order of magnitude past the live suffix array’s single integer per character, which is why bioinformatics largely migrated there. And the build’s correctness hangs on invariants: this page’s own naive baseline walked straight off the end of the string the moment a terminator was forgotten: machinery this beautiful resists casual modification.',
  },
  {
    section: 'tradeoffs',
    text:
      'The rivals, honestly placed, three of them live on this site. The suffix array with prefix doubling: the same suffix order flattened into one integer per character: cache friendly, simple to reason about, queries by binary search at pattern times log n, and repeat structure available only with the LCP sidecar: the tree’s free answers, purchased separately. For big texts where memory wins, it is usually the right call: the array is this structure flattened. Aho Corasick with failure links: the exact dual: index the patterns instead of the text, then stream the text through once: many needles, one haystack pass: virus signatures and keyword filters live there. And the trie with shared prefixes: the uncompressed ancestor: perfect for dictionaries of separate keys, and quadratic the moment you feed it all n suffixes: the size theorem this page asserts is precisely what compression buys.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is rebuilding the index per query, and the trap is disguised as simplicity. We only need one search right now: so each request runs a fresh scan: or worse, builds a fresh index, uses it once, and throws it away. The arithmetic on this page’s client is stark. One build: four hundred sixty four thousand steps. One query: twenty comparisons. The build is worth some twenty three thousand queries: paying it per query multiplies every search by that factor, and paying a naive rebuild on repetitive data multiplies it by another three hundred fifty eight. Indexes are capital expenditure: build once, amortize forever. And when the workload genuinely is one shot, a plain scan: Python’s in, or the live Boyer Moore: is the honest tool. The crime is not the scan. The crime is re paying capital costs as operating costs, query after query, forever.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements Ukkonen’s builder with the active point, open leaves, rule three, and suffix links, plus a step counter: alongside the naive compressed trie insertion with a comparison counter, the membership walk, the suffix enumerator, the deepest internal node search, and the generalized tree for common substrings. The self test asserts, in order: suffix sets exact on two hundred random strings, with the size theorem on every build. Membership agreeing with Python on five hundred queries at scale, the twenty character query walking exactly twenty comparisons. The two corpus race: three point seven times on English like text, three hundred fifty eight on periodic. The amortized bill under six steps per character. The longest repeat against brute force on a hundred strings. And the common substring client against the dynamic program on a hundred pairs. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
