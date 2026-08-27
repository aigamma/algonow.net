// The spoken lesson for puzzle twelve, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle twelve: HyperLogLog, paired with leading zero registers, for counting distinct items in a stream. Here is the puzzle. A million items flow past, in any order, and most of them are repeats. Your task is to report how many distinct items have passed, within a few percent. The constraint is the interesting part: you get one kilobyte of state, fixed forever, no matter how long the stream runs and no matter how large the universe of possible items is. An exact answer would mean remembering what you have seen, and remembering is exactly what the budget forbids.',
  },
  {
    section: 'origins',
    text:
      'Philippe Flajolet and Nigel Martin built the first version in nineteen eighty three, for IBM’s database query planners, which needed distinct counts to plan joins and had no memory to count distinctly. Twenty years of refinement followed: LogLog in two thousand three, and then HyperLogLog in two thousand seven, where a harmonic mean pushed the error down to one point zero four over the square root of the number of registers, provably close to the floor for the memory spent. Google’s HyperLogLog plus plus, from two thousand thirteen, added a sparse mode and bias correction, and it is what answers BigQuery’s approximate count distinct today. Redis ships the structure behind the commands P F ADD and P F COUNT, twelve kilobytes per counter, under one percent error. And those two letters, P F, are a tribute: Philippe Flajolet died in twenty eleven, and his initials live in the API.',
  },
  {
    section: 'pair',
    text:
      'The control structure owns the averaging machine. One noisy witness is useless, so the first ten bits of every hash route each item to one of one thousand twenty four substreams, and each substream keeps exactly one register of about six bits. The estimate combines all the registers with a harmonic mean. Why harmonic? Because a harmonic mean is dominated by its small values. One substream will always get lucky and see an absurdly long run; an arithmetic mean would be wrecked by it, the way one billionaire wrecks an average income. The harmonic mean refuses to be impressed. The heuristic chooses what each register remembers: the longest run of leading zeros ever seen in that substream’s hashes. A run of r zeros appears about once per two to the r distinct hashes, so the longest run ever seen is a witness statement about how many distinct hashes went by. And here is the deepest property of the whole design: a maximum is repeat proof by construction. The same item hashes to the same bits every single time, so presenting it again moves nothing. Frequency is invisible to this structure. Distinctness is not something it works to ensure; it is something the observable cannot help.',
  },
  {
    section: 'picture',
    text:
      'Estimate how many lottery tickets a town bought, from one fact only: the best prize anyone won. If somebody hit a one in a million jackpot, the town probably bought about a million tickets. If the best prize is a one in fifty win, they bought about fifty. One jackpot is loud but noisy evidence, so improve it the obvious way: split the town into one thousand twenty four neighborhoods, ask each neighborhood for its own best prize, and average the testimonies sensibly. Now notice what cannot fool this census. A resident who waves the same winning ticket every single day changes nothing, because the best prize already counted that ticket once. Volume does not testify here. Rarity does.',
  },
  {
    section: 'run',
    text:
      'Here is the loop. First, hash the item once. The first ten bits choose one of the one thousand twenty four registers. The remaining bits are inspected for their run of leading zeros. Second, if this run beats the register’s stored maximum, store it; six bits per register are enough, because runs longer than about sixty cannot occur in a sixty four bit hash. Third, repeats change nothing, for the reason the pair section gave: same item, same hash, same run, and a maximum cannot be raised by what it already saw. Fourth, to estimate, combine every register with the harmonic formula: alpha times m squared, divided by the sum over registers of two to the minus register value. Fifth, while the count is still small and many registers sit at zero, estimate from that emptiness instead: count the zero registers and use m log m over zeros, which is linear counting, the small range specialist, and hand over once the registers have seen enough. Sixth, to combine two sketches, take the register wise maximum. That union is exact, not approximate: sketching the union of two streams gives byte for byte the same registers as merging their separate sketches, and the tested solution asserts exactly that.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, you need the count of distinct values and nothing else: no membership test, no frequencies, no listing of what was seen. Second, a few percent of error is acceptable and the memory ceiling is not negotiable, which is the trade this structure sells. Third, the stream is sharded across machines, and the per machine sketches must combine into one global answer without shipping data. Register wise maximum does that exactly, which is why every distributed analytics engine carries this structure.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: fixed, tiny, and mergeable. Seven hundred sixty eight bytes at plus or minus three point three percent, constant work per item, blindness to repeats guaranteed by construction rather than by bookkeeping, and exact shard union. The weakness: it only ever estimates, and it only counts. The error band shrinks as one over the square root of the register count, so each halving of the band costs four times the memory. There is no membership, no frequency, no deletion, and no listing. Intersections can only be inferred by inclusion exclusion, and subtraction amplifies relative error, so set overlap is the first place this sketch runs out of road; the k minimum values rival exists for exactly that gap.',
  },
  {
    section: 'tradeoffs',
    text:
      'Here are the measured numbers. The stream is one million items containing exactly two hundred thousand distinct ids, about five appearances each, and every sketch gets about one kilobyte. HyperLogLog, one thousand twenty four registers, seven hundred sixty eight bytes: two hundred four thousand three hundred fifty eight, high by two point two percent. Flajolet Martin, the nineteen eighty five ancestor, two hundred fifty six bitmaps: two hundred three thousand seven hundred seven, high by one point nine, actually a touch closer on this particular draw, at a third more memory and thirty two bits of state per substream against six; what two decades of refinement bought is the band per byte, not any single draw. K minimum values, one hundred twenty eight stored minima: one hundred seventy thousand and six, low by fifteen percent, and that is not a scandal, it is what a plus or minus eight point eight percent band looks like when the dice run cold. Linear counting, eight thousand one hundred ninety two bits: saturated. Every bit set, no estimate at all, because it needs bits proportional to the count itself; below its ceiling it is the sharpest tool on the bench, which is why HyperLogLog uses it as its own small range fallback. And the exact hash set: two hundred thousand, exactly, for three point two megabytes, more than four thousand times the sketch’s memory, growing forever, and unmergeable across shards short of shipping the sets themselves.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never bring to this problem is the tempting one: count the distinct items in a one percent sample and multiply by one hundred. The tested solution measures the wreck instead of asserting it. On this stream, the sample scales to nine hundred ninety three thousand one hundred, against a truth of two hundred thousand: five times over. The reason is structural. Distinct counts do not scale linearly. An item that appears five times has five chances to enter your sample, so repeaters are in every sample, while true singletons mostly vanish, and the sample’s distinct fraction tells you almost nothing about the population’s. Estimating distinct counts from samples is a legitimate research problem with its own estimators built for it. Naive multiplication is not one of them, and the five x measurement is the receipt.',
  },
  {
    section: 'code',
    text:
      'The Python solution builds every sketch from one shared sixty four bit mixer so no method enjoys better randomness than another. HyperLogLog is a byte array of registers, a route on the top ten bits, a bit length call for the zero run, and the harmonic formula with its linear counting fallback. Flajolet Martin keeps two hundred fifty six bitmaps and reads each one’s lowest unset bit. K minimum values keeps the one hundred twenty eight smallest hash fractions and estimates from the largest of them. Linear counting is a bitmap and a logarithm. The self test asserts seven things: the leading zero tail really does fall like two to the minus r; the contest estimate lands within three sigma of two hundred thousand; merging the sketches of two half streams equals the sketch of the whole stream, register for register, byte for byte; average error shrinks when registers grow from two hundred fifty six to four thousand ninety six; linear counting is sharp at one thousand distinct and saturated at two hundred thousand; the rivals sit inside their own bands; and the one percent sampling shortcut overshoots truth at least three fold. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
