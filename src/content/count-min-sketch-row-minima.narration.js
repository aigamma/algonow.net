// The spoken lesson for puzzle fifty four, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle fifty four: the count min sketch, paired with the minimum over hash rows, for frequency estimation. Here is the puzzle. A stream arrives that is too big to store: a million items on this page, with one hundred forty five thousand distinct values. Answer, for any item, how many times it appeared: from a fixed grid of eight thousand counters: eighteen times fewer than exact counting would need. Two promises must hold, and this page tests both to the individual item: never underestimate, asserted on every one of the hundred forty five thousand distinct items: and overcount bounded by the stream length over the width, measured at two hundred five point eight against a promised ceiling of five hundred.',
  },
  {
    section: 'origins',
    text:
      'Graham Cormode and S Muthukrishnan published the sketch in two thousand five, and it became the streaming workhorse almost immediately: network switches counting flows at line rate, trending topic counters, natural language pipelines counting n grams at web scale, and denial of service detectors watching traffic they could never enumerate. The conservative update refinement came from Estan and Varghese’s switch measurement work, and is implemented and priced here. The signed sibling, the count sketch of Charikar, Chen, and Farach Colton, is three years older and trades the never under guarantee for unbiasedness: both variants run on this page, and both are measured.',
  },
  {
    section: 'pair',
    text:
      'The control structure owns the counter grid: d rows of w cells, one independent hash function per row, and every arriving item increments exactly one cell in each row. The crucial property is what collisions do: they only ever add. A cell can only overcount its tenants, never undercount, so every cell is an upper bound on every item it hosts. That is the structural one sided guarantee, and it is asserted universally here: not one of the hundred forty five thousand distinct items was ever underestimated, by either variant. The heuristic supplies the minimum over rows. Each row’s overcount is a different accident: a different hash, different strangers sharing the cell: so the smallest of the d answers is the least damaged witness. Markov’s inequality prices a single row’s excess at twice N over w with probability one half, and independence across rows multiplies: d rows push the failure probability to one over two to the d. Measured at four rows of two thousand: mean overcount two hundred five point eight, ninety ninth percentile three hundred twenty four: inside the envelope, from eight thousand integers watching a million arrivals.',
  },
  {
    section: 'picture',
    text:
      'Picture four tally clerks at a parade, each holding a clipboard with two thousand lines. Each clerk files every passing banner under some line according to their own private rule, and unrelated banners inevitably share lines: a shared line can only ever over tally. When you ask how many times the dragon banner passed, each clerk reads out their line’s total: the dragon plus whatever strangers got filed with it: and you keep the smallest of the four answers, because the four filing accidents are independent, and the least crowded line is the closest to the truth. Four clipboards recall a million banner parade to within a rounding error: for the banners big enough to matter. The small banners drown in their lines, and the honest clerk says so.',
  },
  {
    section: 'run',
    text:
      'Here is the loop. To add an item: for each of the d rows, hash it and increment that row’s cell: d array writes, no lookups, no allocation, no growth, ever. To query: read the same d cells and return the minimum: an upper bound, always. To size the sketch, work backward from the promise: width equals two over epsilon for an error of epsilon times the stream length; depth equals log of one over delta for the confidence: and the width dial is measured on this page: mean overcount three thousand eighty five, two hundred seven, and ten point two, as the width grows tenfold twice. If the stream has no deletions, upgrade to conservative update: raise only the cells currently at the minimum: measured here at one point nine times less overcount, still never under. And mind the mice: the error is flat in absolute terms, so rare items drown: this is an instrument for elephants, and the tradeoffs section prices exactly that.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, heavy hitters over unbounded streams: top talkers on a network, trending items, hot keys in a cache: on this page the sketch’s top twenty matched the exact top twenty, twenty out of twenty. Second, fixed memory is non negotiable: a switch’s data plane, an edge collector, per shard telemetry: eight thousand integers, forever, no matter how long the stream runs: and sketches from different shards merge by cellwise addition. Third, overestimation is the safe direction for your decision: rate limiting and abuse detection would rather flag a light user than miss a heavy one, and the sketch’s bias points exactly that way, by structure.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: one sided by structure, priced by theorem, tiny by design. Never under, asserted on every distinct item. Mean overcount two hundred five point eight against Markov’s promised five hundred. Heavy hitters preserved twenty for twenty. The width dial scaling as the theory says, measured across two orders of magnitude. Mergeable across shards. And the conservative refinement measured at one point nine times tighter. The weakness is one sentence with a gradient attached: the absolute error is flat, and a flat absolute error is a death sentence for mice. Rank one carries a quarter percent relative error. Rank ten carries two percent. Rank one hundred carries twenty four percent. And items that appeared exactly once showed a median estimate of about two hundred: twenty thousand percent relative error. The signed count sketch trades the never under contract for unbiasedness: measured bias of minus one point nine, with seventy five thousand genuine underestimates: a different contract, not a free upgrade.',
  },
  {
    section: 'tradeoffs',
    text:
      'Here are the measured numbers, on a million item heavy tailed stream with one hundred forty five thousand five hundred twenty seven distinct values, against an exact counter on every one. The exact dictionary: one hundred forty five thousand counters, zero error: the right tool whenever the keys fit, and at this page’s scale they plainly would. The count min sketch, four rows of two thousand: mean overcount two hundred five point eight, ninety ninth percentile three hundred twenty four, and never once under. With conservative update: one hundred eight point one mean, one hundred thirteen at the ninety ninth: nearly twice as tight, still never under. The count sketch, same grid: bias minus one point nine: essentially unbiased: with seventy five thousand five hundred forty underestimates, because two sided is what unbiased means. And the dial: widths of two hundred, two thousand, and twenty thousand gave mean overcounts of three thousand eighty five, two hundred seven, and ten point two: the theory’s N over w, wearing measurements.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is point querying the mice, and the number is worth hearing twice: items that truly appeared once came back with a median estimate of two hundred one: twenty thousand percent relative error: measured across two thousand such items. Nothing malfunctioned. The sketch’s contract is an ABSOLUTE error of epsilon times the stream length, about two hundred here, and it honored that contract perfectly: two hundred is simply bigger than one. A dashboard that reads individual rare key counts off a count min sketch is rendering collision noise in confident typography. The honest uses follow from the contract: ask about elephants, whose counts dwarf the noise: threshold at epsilon N, below which the sketch legitimately knows nothing: or keep exact side counters for the handful of keys you truly monitor, and let the sketch watch the crowd.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements the count min grid with pairwise hashes, the conservative update variant, the signed count sketch with median estimation, and a heavy tailed stream generator, against an exact Counter referee. The self test asserts, in order: the one sided guarantee on every distinct item, for both count min variants. Mean error within N over w, and the ninety ninth percentile within four times that. The elephant mouse gradient: rank one under two percent relative, the top ten under six, and the count one median at least twenty times its truth. Sketch top twenty equal to exact top twenty at eighteen or better, measured at twenty. The width dial scaling by at least fourfold per tenfold width. Conservative update at least one point four times tighter, measured at one point nine. And the count sketch genuinely two sided: over a fifth of items underestimated: with absolute bias under a third of count min’s. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
