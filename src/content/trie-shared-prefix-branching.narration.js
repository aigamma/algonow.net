// The spoken lesson for puzzle fifty one, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle fifty one: the trie, paired with shared prefix branching, for string keyed dictionaries. Here is the puzzle. A growing dictionary of strings: this page uses the site’s own vocabulary, two thousand five hundred fifty one words drawn from its build plan. Support lookups priced by the key’s length and never by the dictionary’s size. And support the query that gives the structure its reason to exist: everything starting with a l, as a walk to a place, not a scan of the world. The constraint is what hashing cannot do: a hash set answers membership beautifully and then must scan all two and a half thousand words to autocomplete anything: five hundred ten thousand element touches for two hundred queries, measured, against the trie’s eleven thousand.',
  },
  {
    section: 'origins',
    text:
      'The idea is old enough to smell of telegraph paper: de la Briandais described it in nineteen fifty nine, and Edward Fredkin named it in nineteen sixty: trie, from the middle of the word retrieval, pronounced tree by its author and try by everyone who wants to be understood. Donald Morrison’s PATRICIA, nineteen sixty eight, compressed the chains, and the structure quietly became infrastructure: internet routers make longest prefix matches on binary tries; every autocomplete box walks one; the T nine keypad generation typed entire text messages through one. And on this very site, the Aho Corasick unit is a trie that grew failure links and learned to hunt.',
  },
  {
    section: 'pair',
    text:
      'The control structure owns the edge labeled tree: one character per edge, one node per distinct prefix, keys marked at their end nodes. That identity is not a metaphor: this page asserts it as arithmetic: seven thousand eight hundred ninety two nodes, equal to seven thousand eight hundred ninety one distinct prefixes plus the root. A lookup walks its key’s characters and visits exactly the key’s length plus one nodes: asserted per lookup, and asserted unchanged when the dictionary grows more than eightfold: the flat cost theorem, measured flat. And a depth first walk in child order emits the entire dictionary already sorted, asserted: radix ordering, free. The heuristic supplies the sharing. Every inserted key rides the existing tree as far as any earlier key has paved, branching only where it becomes novel: algorithm and algonow share four nodes rather than zero. The economics are measured: sixteen thousand characters of vocabulary compress to under eight thousand nodes: and fifty nine percent of those are single child chains, which is precisely the fat that the radix tree’s path compression exists to trim.',
  },
  {
    section: 'picture',
    text:
      'Picture a library’s card catalog drawer for words. The hash set is a valet with a perfect memory for exact questions: is the word algorithm here: instantly, yes. And no memory whatsoever for neighborhoods: ask for everything filed under A L, and the valet must inspect every card in the building, because his memory was organized for identity, not vicinity. The trie is the drawer itself. Walk your fingers to A, then to L, and everything beneath your fingertip is the answer: the neighborhood is a place you stand, not a search you run. And sharing is why the drawer stays small: every word beginning A L files under the same two tabs, paid for once.',
  },
  {
    section: 'run',
    text:
      'Here is the loop. To insert: walk the key character by character, reusing existing edges, creating a node only where the key becomes novel, and mark the final node as a word end. To look up: the same walk: the key’s length plus one visits, exactly, whether the dictionary holds three hundred words or three million. To answer a prefix query: walk the prefix, then enumerate the subtree below where you stopped: the cost is the prefix length plus the size of the answer itself: never the size of the dictionary. For sorted output: depth first, children in order: the dictionary emerges alphabetized. And when memory matters: the measured fifty nine percent of nodes that form single child chains are exactly what path compression collapses into labeled edges: same walks, half the rooms.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, prefixes are the query: autocomplete boxes, spell check neighborhoods, and the internet’s own routing tables, where every packet’s destination is longest prefix matched against a binary trie. Second, the dictionary grows online: inserts are the same walk as lookups, while the sorted array’s static excellence, honestly documented on this page’s bench, ends at its first insertion, which shifts half the array. Third, you want per character guarantees: length plus one, exactly: no hashing constants, no logarithms, no luck: and a foundation that composes upward, since the Aho Corasick automaton is this structure plus failure links.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: size independent lookups, neighborhoods as places, and structure that composes. The flat cost theorem asserted across an eight and a half fold size jump. Prefix answers priced by their own size. Two structural identities held exactly: nodes equal distinct prefixes plus one, and the depth first walk equals the sorted vocabulary. The weakness, in three honest parts. Memory fat: fifty nine percent of nodes are single child chains, a node per character down every long unshared tail: measured, and the radix tree’s entire pitch. Cache hostility: pointer chasing per character is the B tree unit’s block lesson in miniature, and array of children versus dictionary of children is a real engineering fork. And the static case: on a frozen vocabulary, the sorted list with binary search won the prefix ledger outright, four thousand eight hundred visits to the trie’s eleven thousand, with C speed slices as its answers. This site says so plainly: the trie’s regime begins where static ends.',
  },
  {
    section: 'tradeoffs',
    text:
      'Here are the measured numbers, on the site’s own two thousand five hundred fifty one word vocabulary, averaging six point four characters. Two thousand lookups: the trie: fourteen thousand seven hundred node visits: which is exactly two thousand times length plus one, by the theorem. The sorted list with binary search: roughly one hundred fifty four thousand character comparisons: twelve probes each, each probe comparing several characters deep. The hash set: about thirteen thousand character hashes: the membership champion, honestly. Two hundred prefix queries: the trie: eleven thousand two hundred thirty nine visits: the walks plus the answers themselves. The sorted list: four thousand eight hundred: the static winner of this column. And the hash set: five hundred ten thousand two hundred: a full scan of everything, per query, because neighborhoods are structurally invisible to it. One vocabulary, three organizations, three completely different bills for the same questions.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is hash scan autocomplete, and the asymmetry deserves its sentence. Serving starts with a l from a hash set means touching every element per keystroke: five hundred ten thousand touches for two hundred queries here, forty five times the trie’s bill: and the deeper problem is the direction of growth: the scan’s cost grows with the dictionary, while the walk’s cost grows with the answer. At autocomplete scale, millions of keys and a query per keystroke, that asymmetry is the entire product. The general rule is the one this site keeps arriving at from different doors: choosing a data structure is choosing which questions are cheap. The hash chose membership. No amount of hardware un chooses it for prefixes.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements the trie as nested dictionaries with an end marker, node visit counters, prefix enumeration by depth first walk, a chain node counter for the compression analysis, and the bisect range rival. The self test asserts, in order: twenty thousand mixed operations, inserts, hits, misses, and prefix queries, agreeing exactly with a shadow set and bisect ranges over a sorted list. The flat cost theorem: lookup visits equal to length plus one, identical at three hundred words and at two thousand five hundred fifty one. The structural identities: node count equal to distinct prefixes plus one, and the depth first walk equal to the sorted vocabulary. The chain fraction between bounds, measured at fifty nine percent. And the ledger: the trie’s lookups at exactly the theorem’s count, the bisect rival’s prefix win recorded honestly, and the hash scan’s five hundred thousand touch bill counted in full. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
