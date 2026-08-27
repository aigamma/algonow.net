// The spoken lesson for puzzle eleven, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle eleven: the Bloom filter, paired with k independent hashes, for approximate set membership. Here is the puzzle. Keys keep arriving, ten thousand of them, and you must be able to answer, for any key at all, have I seen this one before. The catch is the budget. Storing the keys outright would take eighty kilobytes, and you have fifteen. You are allowed a bounded number of lies, but only in one direction: you may occasionally say yes to a stranger, and you may never, ever say no to a member. No false negatives, few false positives, fifteen kilobytes. That one sided contract is the whole design.',
  },
  {
    section: 'origins',
    text:
      'Burton Bloom published the structure in nineteen seventy, and the motivating example is worth keeping, because it is still the shape of every modern use. Automatic hyphenation could handle nine words in ten by simple rules, but the exceptions lived in a dictionary too large for core memory. So a small filter sat in memory and answered one question: is this word possibly an exception. Most words got a certain no and skipped the disk entirely; the occasional false yes cost one harmless lookup. A cheap, slightly paranoid gate in front of an expensive exact check. That is why the idea is everywhere now. Log structured storage engines like RocksDB and Cassandra keep one filter per data file, so a read skips every file that cannot hold the key. Content delivery networks cache a URL only on its second appearance, using a filter to remember first appearances cheaply. And Chrome shipped its malware blocklist behind exactly this gate for years.',
  },
  {
    section: 'pair',
    text:
      'The control structure owns one array of m bits and one invariant: every hash position of every inserted key is set, and nothing is ever unset. That invariant is the entire correctness story. If any one of a key’s positions holds a zero, that key was never inserted, full stop, because insertion would have set it. So a zero is proof of absence. All ones is only evidence of presence, because other keys’ bits can overlap yours. Notice what the structure never does: it never stores a key, never compares a key, and cannot produce one. It holds shadows, not members. The heuristic decides how many shadows each key casts. Each of the k hashes demands one more coincidence before the filter will say yes, so raising k buys certainty per query. But each hash also sets another bit, so raising k fills the array faster and manufactures the very coincidences it was guarding against. The two forces cross at k equals m over n, times the natural log of two: the value that leaves half the bits zero. Every bit a fair coin, one full bit of information per bit of budget. For twelve bits per key that is about eight point three, and this unit runs k equals eight.',
  },
  {
    section: 'picture',
    text:
      'Picture a doorman with a board of twelve hundred lightbulbs and no guest list. Every guest’s name, fed through the same k scramblers, always lights the same k bulbs. When someone claims to be a regular, the doorman checks that person’s bulbs. Any dark bulb ends the conversation, politely and with certainty, because a real visit would have lit it. Every bulb lit? Probably a regular. Possibly an accident of overlap between strangers. Now watch the heuristic argue with itself. Light one bulb per guest, and the board stays mostly dark, but any single coincidence is a lie with no second check. Light twenty per guest, and the board floods until nearly everyone matches everything. The working doorman keeps the board half lit. That is not a compromise; it is the measured optimum.',
  },
  {
    section: 'run',
    text:
      'Here is the loop. First, size it: choose m from the memory budget, then set k to m over n times log two, for the n you expect to hold. Second, to insert a key, hash it k independent ways and set those k bits. Nothing is ever cleared. Third, to query a key, read its k positions, and stop at the first zero: that zero is a certain no, and on a half empty array the average query stops after about two probes. Fourth, if all k positions are set, answer yes, knowing the chance you are wrong is about the fill ratio raised to the k, which the sizing pinned near one in three hundred. Fifth, watch the fill. The filter has no error state: past its design load it simply drifts toward answering yes to everyone. The remedy is a rebuild at a larger size, never clearing bits, and the trade offs section shows exactly why.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, you need membership and nothing else: no values, no listing, no retrieval, so the keys can stay unstored. Second, the two kinds of error have wildly different prices: a false yes costs one wasted lookup downstream, and a false no is forbidden by the contract. That asymmetry is exactly what the structure sells. Third, the set only grows. If keys also leave, the cuckoo filter is the right rival; if the set is frozen at build time, the XOR filter beats everyone on both lies and bits.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: the no is bulletproof. False negatives are structurally impossible, not merely rare. Space is decoupled from key size, a forty character URL and a four byte integer both cost twelve bits here. Inserts and queries are constant time. And two filters over the same universe merge by bitwise or, which distributed systems quietly adore. The weakness: it cannot forget, and it fails politely. Clearing one key’s bits takes bystanders with it, because those bits may be load bearing for other keys; the tested solution finds a concrete victim and pins the casualty. And past design load there is no exception, no error code, only decay toward yes.',
  },
  {
    section: 'tradeoffs',
    text:
      'Here are the measured numbers. Ten thousand keys, one hundred twenty thousand bits, twelve bits per key, and two hundred thousand absent keys fired at every structure. A false positive is a lie. This unit, k equals eight: six hundred fifty three lies, about one in three hundred. The same filter with k equals one: sixteen thousand eighty two lies, twenty five times worse, at identical memory. And k equals twenty: three thousand forty nine lies, worse than eight, because too much hashing floods the array. That is the U curve, measured at both ends. The cuckoo filter at the same twelve bits: one thousand two hundred forty five lies, twice this unit’s count, but it can delete, and the solution proves the deletion is clean: one thousand keys removed, zero bystanders harmed. The XOR filter: three hundred seventy two lies at eleven point one bits per key, the space champion, with a rate of exactly two to the minus nine by construction; its price is that it is frozen, built once from the complete key set, and a single new key means a full rebuild. And the exact hash set: zero lies, at sixty four plus bits per key, more than five times the budget. Every one of those structures also passed the same non negotiable test: across all ten thousand held keys, not one false negative, anywhere.',
  },
  {
    section: 'tradeoffs',
    text:
      'Two boundary lessons deserve their own breath. First, saturation. Take this exact design and overfill it five fold, and it does not crash, warn, or degrade its latency by a nanosecond. It lies. At five times design load it says yes to seventy four point six percent of strangers, measured. A Bloom filter does not fail loudly; it fails by agreeing with everyone, so the fill ratio is an operational metric, not an implementation detail. Second, the method you would never bring to this problem: a trie of the keys, reached for because tries sound compact. A trie’s pointers cost tens of bytes per stored key, twenty to fifty times this budget, and what they buy is exactness the budget forbids and prefix queries a membership gate never makes. The moment prefixes become the question, autocomplete, routing tables, the trie becomes the right tool. Here it is a category mistake with a large invoice.',
  },
  {
    section: 'code',
    text:
      'The Python solution builds every structure on the page from one shared sixty four bit mixer, so no method enjoys better randomness than another. The Bloom filter is a byte array and two loops. The cuckoo filter stores ten bit fingerprints, four to a bucket, with the subtraction trick for the alternate bucket and a bounded eviction walk. The XOR filter is built by hypergraph peeling: three candidate slots per key, repeatedly retire any slot claimed by exactly one key, then assign the table backward so every key’s three slots exclusive or to its fingerprint. The self test asserts, in order: zero false negatives across all ten thousand keys in every structure; measured false positive rates within range of the closed form theory; the U curve, k equals eight beating both one and twenty; the space ranking, XOR under Bloom under cuckoo at this budget; clean cuckoo deletion against the pinned Bloom bit clearing casualty; and the saturation cliff, seventy four point six percent lies at five times load. If any number on this page stopped being true, the file would fail before the page could lie about lying.',
  },
];
