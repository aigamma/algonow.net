// The spoken lesson for puzzle fifty nine, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle fifty nine: the Boyer Moore majority vote, paired with pairwise cancellation, for finding a majority element. Here is the puzzle. A stream of values flows past once, in order: too long to store, too wide to tally. Report the majority element: the value holding more than half the positions: or report that none exists. The constraint is the memory: two words. A candidate, and a counter. For contrast, this page runs a dictionary tally on the same million item stream and measures it holding five hundred thousand keys: one per distinct value. The vote holds two. And the referee is the pairing theory itself, asserted on every trial: a majority cannot be cancelled away, and the surplus it must keep is a number the tests check exactly.',
  },
  {
    section: 'origins',
    text:
      'Robert Boyer and J Strother Moore invented this in nineteen eighty at SRI: the same two names as the string search, a different algorithm entirely: while they were building their theorem prover. It went unpublished for eleven years, surfacing in nineteen ninety one in a festschrift for their colleague Woody Bledsoe. The paper is a period piece with a punchline: the Fortran implementation was mechanically proved correct by their own verification system, and the abstract advertises an efficient use of magnetic tape: one sequential pass, two words of state. That constraint has aged beautifully: out of tape drives and into network switches, sensor firmware, and log shippers, without changing shape at all.',
  },
  {
    section: 'pair',
    text:
      'The algorithm owns the one candidate counter scan. When the counter reads zero, adopt the incoming value as the candidate. When the incoming value matches the candidate, add one. When it differs, subtract one. One pass, at most two comparisons per element, and the state never grows: a name and a number. What comes out is a candidate, not an answer: and that distinction is the whole unit. The heuristic supplies the reason it works: pairwise cancellation. Every subtraction pairs one occurrence of the candidate with one different element and throws both away. Deleting two different values can never change who holds a majority. And a value with more than half the positions cannot be paired out of existence: at most the minority’s worth of pairs can form, each destroying at most one copy, so a surplus of at least two m minus n survives. Measured on this page: three hundred adversarial layouts, the bound held on every one, and the alternating gadget hit it exactly: final counter two, not a single copy wasted.',
  },
  {
    section: 'picture',
    text:
      'Picture a hall full of partisans, one faction holding a true majority. Everyone pairs off with someone from a different faction, and every pair walks out together. However the pairing happens to go, whoever is left standing at the end belongs to the majority faction: the minority coalition, even perfectly united, runs out of dance partners first. The counter is nothing more than this brawl’s bookkeeping, run left to right: it tracks the current faction’s unpaired surplus. But notice the dark side of the picture: if no faction held a majority, the hall still empties down to someone: somebody is always left standing: and their confident face tells you nothing. Only a headcount, the verify pass, can tell a winner from a survivor.',
  },
  {
    section: 'run',
    text:
      'Here is the run. Scan the stream once: counter at zero, adopt; on a match, add one; on a mismatch, subtract one and mentally watch a pair walk out. Finish the pass holding two words: the candidate and its surplus. Then verify: one more linear pass, counting only the candidate: it is the majority exactly when its count clears half. That second pass is not an afterthought: it is the method. If a majority exists, the theory guarantees it is the candidate. If none exists, the candidate is noise, and the recount is the only thing standing between you and shipping it. When the question grows from one king to many nobles, the same idea runs k wide: Misra Gries keeps k counters and cancels k plus one different values at a time: every value holding more than an n over k plus one share survives: measured here with eight counters that never once exceeded their budget.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, one pass is all you get: the data flows through a switch, a sensor, a log shipper, and is gone: storage is two words, not a table that grows with the world. Second, the question is dominance, not frequencies: a quorum read, a consensus value, a did anything cross half check: majority or none is exactly this contract, and nothing cheaper answers it exactly. Third, a verify pass is available: a replay buffer, a second spin of the tape, the ability to recount one value: because the vote’s guess only becomes an answer for the price of one more linear scan.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: two words, two passes, and a theorem doing all the lifting. The pairing surplus bound held on all three hundred adversarial layouts: majority copies front loaded, back loaded, alternating, and shuffled: with exact equality on the alternating gadget, where every single pair destroys one majority copy and the counter lands on precisely two m minus n. Full agreement with the dictionary truth across five hundred mixed random streams. And the client is as real as engineering gets: seven way modular redundancy, where seven replicas report a reading and up to three fail adversarially, colluding on the same wrong value: four of seven is still a majority, and the vote recovered the true reading two hundred times out of two hundred.',
  },
  {
    section: 'tradeoffs',
    text:
      'Here is the measured memory contest, on a million item stream with five hundred thousand and one copies planted among four hundred ninety nine thousand nine hundred ninety nine distinct fillers. The dictionary tally: exact counts for everything, at five hundred thousand keys: memory that scales with the data. Sort and take the middle: correct, because a majority must own the middle seat of any sorted order: at the price of a full million item mutable copy. Misra Gries with eight counters: every value over a ninth of the stream survives, in eight counters that never grew past budget. And the vote with its verify pass: two words, two passes, the majority or the word none. For counts rather than dominance, the count min sketch, a live unit on this site, answers point queries the vote cannot: in kilobytes, with one sided error. And offline, with the whole array in hand, quickselect, also live here, finds the median directly: when a majority exists, the median is it.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is the unverified single pass vote, and the gadget is five elements long. a, b, a, b, c. The a’s and b’s annihilate each other in two pairs, and the vote crowns c: the rarest element in the stream, one occurrence out of five. Scaled up and measured: across one thousand streams with no majority, the surviving candidate was not even the most frequent element sixty eight percent of the time. Worse than a guess, because it arrives wearing a counter and a straight face. The candidate is a conditional certificate: if a majority exists, it is this value: and the condition is precisely what the cheap second pass checks. Shipping the candidate without the recount is shipping a coin flip with a confident face. On this site the recurring lesson keeps its shape: the loop was never the guarantee: here, the verify pass is the method.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements the vote, the verify pass, and Misra Gries with an instrumented high water mark. The self test asserts, in order: three hundred planted majority streams under four adversarial layouts, candidate correct and the surplus bound holding on every one, with exact equality on the alternating gadget. Full agreement with a dictionary referee on five hundred mixed streams. The rarest element gadget: a, b, a, b, c crowning c, and the sixty eight percent not even the mode rate across a thousand majority free streams. The four method memory contest at one million items: five hundred thousand keys, a million item copy, eight counters, two words. And the redundancy client: seven replicas, up to three colluding faults, two hundred recoveries in two hundred trials. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
