// The spoken lesson for puzzle seventy, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle seventy: Space Saving, paired with min counter replacement, for top k heavy hitters. Here is the puzzle. A stream too wide to tally: five thousand distinct items on this page, unbounded in the wild: and a question about its head: who are the top k, and how often did each of them really come? The live majority vote unit finds a single king in two words. The live count min sketch estimates any item you name but names no one itself. This unit must produce the ranked list and its uncertainty together: every count bracketed by its own recorded error, and the referee is an exact tally, asserting the bracket in both directions, per item, with zero tolerance, on sixty random streams.',
  },
  {
    section: 'origins',
    text:
      'Metwally, Agrawal, and El Abbadi, at the International Conference on Database Theory, two thousand five. The algorithm was born from web advertising fraud detection at Santa Barbara, where the operational question was never how often did each of a billion cookies appear: it was who are the heavy clickers, and can you defend the number when the advertiser disputes the bill. The stroke of the paper is its eviction rule. When a stranger arrives and the table is full, do not drop the stranger: that is the sketch family’s instinct. Do not tax every counter: that is Misra Gries. Evict the minimum, and let the newcomer inherit its count: recording the inheritance, permanently, as an error bar on that row. The summary keeps the score and keeps its doubts in the same table.',
  },
  {
    section: 'pair',
    text:
      'The algorithm owns the monitored set discipline: exactly m triples: item, count, error: updated in one pass. A monitored arrival increments its counter: a real mark. An unmonitored arrival, with the table full, replaces the minimum. Two theorems fall out of that discipline, and both are asserted exactly on this page. First: the minimum counter can never exceed n over m: the total count is n, spread over m always growing counters: so any item truly more frequent than n over m is guaranteed a seat: it cannot be evicted for good. Second: every count is an overestimate, bracketed by its own recorded error: count minus error is at most the truth, and the truth is at most the count: per item, zero tolerance. The heuristic supplies the inheritance itself: the newcomer starts at min plus one, error equal to min. Inheriting rather than restarting keeps the minimum climbing, which keeps the guarantee alive: and recording the inheritance keeps the estimate honest. Measured at equal fifty counter budgets: worst top ten error of one, against Misra Gries at two thousand three hundred three.',
  },
  {
    section: 'picture',
    text:
      'Picture a chart show with m seats. Regulars in seats collect a tally mark on every appearance. A stranger walks into a full house: and instead of being turned away, takes the coldest seat: the occupant with the fewest marks leaves, and the stranger inherits that entire tally, wearing a wristband that records exactly how many of the marks are borrowed. Watch what emerges. The stars accumulate real marks that dwarf their wristbands: the top of the chart is clean measurement. The bottom seats churn: strangers inheriting from strangers, wristbands covering nearly everything. And that is not a flaw: it is a confession. The seat is a placeholder, and its wristband says so. One glance separates what was witnessed from what was merely inherited.',
  },
  {
    section: 'run',
    text:
      'Here is the run. A monitored arrival: increment. Room to spare: admit at count one, error zero. Full house: find the minimum counter, evict its item, and install the newcomer at the minimum plus one, with error equal to the minimum. Answer queries from the table: top k by count, each estimate carrying its bracket: count minus error at most the truth, truth at most the count. And read trust off the bars: the guarantee says anything above n over m holds a seat; a slot whose error bar swallows its count is a placeholder and admits it. On this page’s Zipf client, the top ten came out with a worst error of one: on the uniform stream, the same machinery produced bars covering one hundred percent: the correct answer to a stream with no head.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, the head is the question: trending topics, top talkers on a network, hot keys in a cache: you need the ranked list with defensible numbers, not point queries about items you already know. Second, skew exists: Zipf shaped traffic is the natural habitat: this page’s budget dial measured recall of three, six, ten, and ten out of ten as the counters grew from ten to two hundred against five thousand distinct items: a modest budget suffices because the head is heavy. Third, the error bars are contractual: billing, fraud, abuse reports: count minus error to count is a bracket you can sign your name to, because this page asserts it with zero tolerance.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: brackets with zero tolerance, and a guarantee that never slipped. On all sixty random streams, every monitored item satisfied its bracket exactly. The minimum counter never exceeded n over m, so nothing genuinely frequent was ever absent. At equal budgets, the worst top ten error was one, against Misra Gries at two thousand three hundred three: tight overestimates against decrement decayed underestimates: with both finding all ten of the true top ten. The weakness: no skew, no signal: and the machinery says so. On a uniform stream, the same fifty counters filled with pure inheritance: the best top ten slot wore an error bar covering its entire count, against a tenth of a percent on the Zipf stream. A ranked list of placeholders, honestly labeled. Where frequencies are flat, no small summary can rank them: this one at least confesses. And deletions are unsupported: items leaving the set is the cuckoo filter’s shelf, one unit over.',
  },
  {
    section: 'tradeoffs',
    text:
      'The streaming shelf, now complete, reads as one story. The majority vote, live: one king, two words, a theorem: k equals one, threshold one half, nothing else. Misra Gries: the nineteen eighty two ancestor: k wide cancellation, the same survival guarantee, the simplest machinery: and counts that decay into underestimates with every decrement all round: the survivor list, not the scoreboard. Count min, live: an estimate for anything you name, monitored or not: point queries this unit cannot answer about strangers: but it names no one, and its collisions inflate silently without per item bars. And Space Saving: the ranked head, with error bars, in m rows: the middle seat that the fraud detection world actually ships. Choosing among them is one question: do you need one name, any count, or the ranked head with its uncertainty?',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is reading placeholder counters as measurements. Space Saving always returns a full, confidently ranked table: m rows, descending counts: even on a stream with no head at all. On this page’s uniform stream, the top slot’s error bar covered one hundred percent of its count: every mark borrowed, nothing witnessed: and yet the table’s shape is identical to the Zipf table whose top ten were accurate to a tenth of a percent. A dashboard that renders the ranking and drops the error column will trend fifty random strangers with total conviction. The bracket is not decoration. Count minus error is the only part of the number that was witnessed. Rank by count: trust by the gap: and when the bars swallow the counts, the honest reading is that the stream has no head worth reporting: which is itself the answer, and the machinery just told it to you.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements the monitored set with counts and error bars, the min counter eviction, Misra Gries rebuilt from the majority vote unit for the race, and a Zipf stream generator. The self test asserts, in order: the bracket, both directions, per item, zero tolerance, on sixty random streams. The guarantee: minimum counter at most n over m, and every item above that threshold present, every trial. The equal budget race: worst top ten error of one against two thousand three hundred three, both at ten of ten recall. The no skew confession: top ten error fractions of a tenth of a percent on Zipf against one hundred percent on uniform, with the tail placeholders counted on both. And the budget dial: three, six, ten, ten out of ten as m grows. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
