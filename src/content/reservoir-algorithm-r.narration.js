// The spoken lesson for puzzle twenty-four, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle twenty four: reservoir sampling, paired with Algorithm R, for uniform sampling from a stream. Here is the puzzle. Items flow past, one at a time, each seen exactly once, and nobody will tell you how many there are; the stream may end in ten items or ten billion, without warning. Your task is to hold, at every instant, a uniform random sample of exactly k of the items seen so far. Read the constraint twice, because it is the hard part: at every instant. Not a sample that becomes fair when the stream ends. A sample that is already perfectly fair whenever anyone happens to ask, because the end is not a concept this stream has promised you.',
  },
  {
    section: 'origins',
    text:
      'Algorithm R is folklore made canon. Donald Knuth’s Art of Computer Programming presents it in nineteen sixty nine, crediting the idea to Alan Waterman, and for years it circulated as one of those tricks everyone half knew. Jeffrey Vitter’s nineteen eighty five paper, Random Sampling with a Reservoir, gave the family its name and its analysis. And in nineteen ninety four, Kim Hung Li closed the story with Algorithm L, which stops flipping a coin for every arrival and instead draws, directly, how many arrivals to skip before the next admission: on this page’s million item stream, three thousand eight hundred seventy nine random draws where the classic needs almost a million. The reservoir now sits wherever data outruns memory: stream processors, telemetry pipelines, database engines, and the shuffling machinery of machine learning.',
  },
  {
    section: 'pair',
    text:
      'The control structure owns the contract: exactly k items in hand at all times; each newcomer’s fate decided the instant it arrives; nothing revisited, nothing waited for. That discipline is what buys the anytime property, because a sample that is maintained rather than constructed is valid at every prefix by definition. The heuristic supplies the one number that makes the contract achievable: admit item number n with probability k over n, and on admission, evict a resident chosen uniformly at random. The proof is an induction of two lines. The newcomer’s inclusion chance is k over n, by construction. Any resident’s chance of being in the sample was k over n minus one, and it survives the round unless the newcomer boards and the eviction die names its seat, which is k over n times one over k, or one over n. So its new chance is k over n minus one, times n minus one over n, which is k over n. New item and old item land on the same number, at every step, forever. And this page does not verify that with statistics: the tested solution walks the algorithm’s entire decision tree with exact rational arithmetic, every branch weighted by an exact fraction, for every stream length up to eight, and each item’s inclusion probability comes out equal, as a fraction, to k over n.',
  },
  {
    section: 'picture',
    text:
      'Picture a twelve seat lifeboat beside an endless line of boarders. When person number n reaches the front, the rule is: roll an n sided die; if it shows twelve or less, they board, and one seated passenger, chosen by the same die, goes back into the water. Early boarders get on trivially, and are displaced easily. Late arrivals almost never board, but when they do, they unseat someone who has been comfortable for a very long time. The arithmetic balances those forces so exactly that at every single moment, every person who has ever walked past the boat holds precisely the same claim to a seat: twelve over n. Notice what nobody in this picture knows: how long the line is. The line does not know either. The fairness never depended on it.',
  },
  {
    section: 'run',
    text:
      'Here is the loop. First, fill: the first k items board unconditionally. Second, for each later item, number n, draw a single uniform integer j between zero and n minus one; that one draw decides everything. Third, admit or refuse: if j is less than k, the newcomer takes seat j, so the same draw that admitted it also names the evictee; otherwise the item is gone forever, unstored and unmourned. Fourth, answer anytime: at every prefix, the k residents are an exactly uniform sample of everything that has passed. Fifth, when the per item draw itself becomes the bottleneck, switch to Algorithm L: it draws the length of the gap until the next admission from the correct distribution and fast forwards over the refusals, keeping the distribution identical while collapsing a million draws to a few thousand.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, the stream’s length is unknown or unbounded: log tails, sockets, table scans, feeds. If you could ask for n up front, simpler designs open up; you usually cannot. Second, exactly k matters: an evaluation set of exactly one hundred, a dashboard of exactly fifty, a memory budget that does not flex. The Bernoulli rival keeps each item with probability k over n and delivers a sample whose size is itself random: seventy two to one hundred twenty four across four hundred runs, measured. About k is a different contract. Third, the answer must be valid whenever asked. If your pipeline is sharded across machines, note the bottom k rival: it is the one whose per shard samples provably merge into the exact global sample.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: exactness three ways, in k memory. Exactly uniform, proven by rational enumeration rather than simulation. Exactly k, asserted structurally at every step. Exactly valid at every prefix. One decision per item, constant work, constant memory. The weakness comes in three honest clauses. Sequential: classic Algorithm R spends one random draw per arrival, nine hundred ninety nine thousand nine hundred of them here, which is why Algorithm L exists and cuts that two hundred fifty eight fold. Solitary: two reservoirs cannot be merged into a reservoir of the union; if your stream is sharded, sample by bottom k keys instead, and the tested solution proves that merge exact, byte for byte. And unweighted: when items deserve unequal probabilities, this machinery does not stretch; weighted reservoir schemes exist, and they are their own lesson.',
  },
  {
    section: 'tradeoffs',
    text:
      'Here are the measured numbers, on one stream of a million items with k of one hundred, as a ledger. Reservoir with Algorithm R: nine hundred ninety nine thousand nine hundred random draws, one hundred items of memory, exactly k, always. Reservoir with Algorithm L: three thousand eight hundred seventy nine draws, same memory, same distribution, verified against the same statistical harness: skip, do not flip. Bottom k random keys: one million draws, one hundred memory, exact k, and the one superpower nothing else on the bench has: sample each shard separately, union the shard samples, keep the k smallest keys, and you hold exactly the sample you would have drawn from the whole stream; the test constructs both and asserts identity. Store everything and pick at the end: one hundred draws, perfect uniformity, one million items of memory, ten thousand fold the reservoir, and no answer at all until an end that may never arrive. And Bernoulli sampling at rate k over n: a million draws, roughly k memory, and a sample size that is itself a random variable: minimum seventy two, maximum one hundred twenty four, across four hundred runs. Five methods, five contracts; the reservoir is the only one holding all three exactnesses at once.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is the one that feels the most sensible: systematic sampling, take every ten thousandth item. It is cheap, spreads evenly, and looks random. It is a phase lock waiting for a period. The tested stream carries a pattern that repeats every eight items, and the stride of ten thousand is divisible by eight, so every sampled item lands on exactly the same phase of the cycle. The systematic sample’s estimate of the stream mean misses the truth by three point five zero; the reservoir’s misses by zero point one four. And divisibility is not bad luck: real streams arrange it constantly: hourly patterns sampled daily, batch cycles sampled once per batch, eight step telemetry sampled at powers of ten. Stride sampling is a perfectly good deterministic tool. As a substitute for randomness, it is a resonance accident on a schedule.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements the full bench: Algorithm R with its single draw per arrival, Algorithm L with the direct skip lengths, bottom k with a heap of smallest keys, Bernoulli, and the store everything baseline. The self test asserts, in order: exact uniformity for Algorithm R, by walking its entire decision tree with fraction arithmetic for every stream length up to eight and every k up to three, each inclusion probability equal to k over n exactly; exact uniformity for bottom k by enumerating every permutation of distinct keys on small cases; four sigma statistical agreement for both reservoir variants at a size the enumeration cannot reach, thirty thousand trials; the draw ledger, including Algorithm L within its logarithmic bound; Bernoulli’s size spread, seventy two to one hundred twenty four around a correct mean; the bottom k shard merge, constructed and asserted identical to the full stream sample; and the systematic phase lock, one phase only, with its three point five error against the reservoir’s zero point one four. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
