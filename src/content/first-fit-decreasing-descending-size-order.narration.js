// The spoken lesson for puzzle one hundred thirty one, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle one hundred thirty one: first fit decreasing, paired with descending size order, for bin packing. Here is the puzzle. Items of sizes between zero and one, and bins of capacity one. Pack every item, and use as few bins as possible. The problem is NP hard, and on two thousand items the exact answer is out of reach. The method: first fit. Take the items one at a time and put each into the lowest numbered bin with room, opening a new bin only when none has any. The heuristic is the order: sort the items largest first, so the big ones claim bins while nothing blocks them, and the small ones fill the gaps afterward. On this page the rule is scored against the exact optimum on two hundred small instances, its worst case is built by hand and hit exactly, and on two thousand items it is measured against a bound no packing can beat.',
  },
  {
    section: 'origins',
    text:
      'David Johnson’s MIT thesis of nineteen seventy three, and the paper with Demers, Ullman, Garey, and Graham in nineteen seventy four, proved the worst case ratios for the simple packing rules: first fit within seventeen tenths of optimal, and first fit decreasing within eleven ninths, plus an additive term. That additive term was hunted for three decades. Baker cut it to three in nineteen eighty five, Yue to one in nineteen ninety one, and György Dósa proved the tight bound in two thousand seven, eleven ninths of optimal plus six ninths, with an instance that reaches it. Garey and Johnson listed bin packing among the first NP hard problems. Karmarkar and Karp gave the asymptotic approximation scheme in nineteen eighty two, and Hoberg and Rothvoss an algorithm within a logarithm of optimal in twenty seventeen. The fast first fit by a tree over bin capacities is also Johnson’s, from nineteen seventy four. Every shipping dock, tape library, and cloud scheduler that packs jobs onto machines runs a descendant.',
  },
  {
    section: 'pair',
    text:
      'The algorithm owns the placement rule and its speed. Each item goes into the first bin that has room. A linear scan of the open bins costs one check per bin per item: one million thirty eight thousand bin checks for two thousand items. A max tree over the bin capacities, where each node holds the largest remaining capacity beneath it, descends to the leftmost fitting bin in logarithmic time: forty four thousand node touches, four point two percent of the scan, and the two packings are identical bin for bin. Against the exact optimum on two hundred random twelve item instances, computed by a dynamic program over subsets: one thousand four hundred forty five bins in total, exactly the optimum’s. The heuristic supplies the order, and the order is the guarantee. Largest first: first fit decreasing was optimal on two hundred of two hundred instances. The same rule in arrival order was optimal on one hundred thirty eight, and used up to two extra bins. Next fit, one open bin at a time, was optimal on thirty three, with up to three extra. The sort buys a worst case of eleven ninths of optimal plus six ninths, against seventeen tenths plus two without it. And the bound is real. Johnson’s family of thirty items, sizes a half plus epsilon, a quarter plus two epsilon, a quarter plus epsilon, and a quarter minus two epsilon, packs into nine bins, verified explicitly, while first fit decreasing opens eleven: eleven ninths exactly. At scale, two thousand items: one thousand twenty five bins against a lower bound of one thousand eleven; arrival order one thousand sixty two; next fit one thousand three hundred fifty six.',
  },
  {
    section: 'picture',
    text:
      'Loading a moving truck. The rookie loads boxes in the order they come off the porch, and the sofa arrives after the truck is full of lamp boxes and needs a truck of its own. The mover sorts first. Sofas and refrigerators go in while the truck is empty, then dressers into the gaps beside them, then lamp boxes and shoe boxes into whatever is left, each into the first truck with room. The small boxes are the mortar; loaded first, they are only obstacles. There is still a bad day. When every large box is just over half a truck and every medium box just over a quarter, the sorted rule pairs them wastefully and uses eleven trucks where nine would do. That day has a name, Johnson’s family, and it is the worst that can ever happen.',
  },
  {
    section: 'run',
    text:
      'Here is the run. Sort the items by size, largest first. Place each item into the first bin whose remaining capacity is at least its size; the tree finds that bin in logarithmic time. When no bin fits, open a new one; a bin once opened is never closed. The bound from below: no packing uses fewer bins than the total size rounded up. The bound from above: never more than eleven ninths of optimal plus six ninths. On this page: two hundred small instances, every one of them packed optimally, one thousand four hundred forty five bins to the referee’s one thousand four hundred forty five. Arrival order: one thousand five hundred eight, optimal on one hundred thirty eight. Next fit: one thousand six hundred eighty three, optimal on thirty three. Johnson’s family: nine optimal, eleven by the rule, thirteen by next fit. Two thousand items: one thousand twenty five bins, one point three eight percent above the lower bound, with the tree touching four point two percent of what the scan checked.',
  },
  {
    section: 'signals',
    text:
      'The signals that this pair fits. First: you hold the whole batch. The sort needs every item up front; items arriving one at a time get plain first fit, and its seventeen tenths. Second: one dimension of capacity. Weight, minutes, bytes, seats: with two or more dimensions the sort’s guarantee is gone. Third: good enough beats exact. One point three eight percent above the lower bound on two thousand items, where the exact program would run three to the power of two thousand steps.',
  },
  {
    section: 'tradeoffs',
    text:
      'Now the rivals. Best fit decreasing: the same sort, but each item goes into the tightest bin that fits rather than the first. The same eleven ninths guarantee, slightly less waste in practice, and a tree keyed by remaining capacity instead of position. Reach for it when the last percent of waste matters and the code can carry an ordered tree. Next fit: online, constant memory, one comparison per item, the right tool when bins are sealed as they leave. It was optimal on thirty three of two hundred, used thirteen bins on Johnson’s nine, and one thousand three hundred fifty six on two thousand items where the bound is one thousand eleven. Reach for it when a bin, once closed, cannot be reopened. And branch and bound: the exact optimum, with the Martello and Toth bounds pruning the search, the referee when twelve items become sixty. It costs hours on hard instances and gives no answer at all on two thousand items. Reach for it when every bin is expensive and the instance is small enough to finish.',
  },
  {
    section: 'tradeoffs',
    text:
      'The honest weaknesses of the hero. The bad day is real: Johnson’s family costs eleven bins for nine, and an eleven ninths instance wastes two bins in every nine no matter how large it grows. The sort needs the whole batch, so online arrivals lose it. And it never reconsiders a placement, so whatever gap to optimal remains, fourteen bins on two thousand items, is invisible to it. Best fit decreasing trims some of that gap, and only an exact search closes it.',
  },
  {
    section: 'tradeoffs',
    text:
      'And the negative example: the exact subset dynamic program as the packer. It is the referee on this page and it must never be the tool. The program that scores twelve items exactly takes three to the twelfth, about five hundred thirty thousand submask steps per instance. At twenty items it is three and a half billion. At two thousand items it is three to the two thousandth power, a number with nine hundred fifty five digits. Bin packing is NP hard, and the exact program’s exponent is the reason a one sort heuristic with an eleven ninths guarantee is the algorithm of record. On two thousand items it finished one point three eight percent above a bound the exact program will never reach in the lifetime of the universe.',
  },
  {
    section: 'code',
    text:
      'The code on this page is the packer, its rivals, and its referee in one file. First fit with a counter on every bin check, and the sort in front of it. Next fit. A max tree over bin capacities that finds the first fitting bin in logarithmic time and counts the nodes it touches. The exact optimum by a dynamic program over subsets, enumerating every way to fill one bin from the lowest remaining item. And a validity check that every packing must pass. The self test asserts: every packing valid; first fit decreasing at most eleven ninths of optimal plus six ninths, and at least optimal, on every instance; the sorted rule optimal more often than arrival order, which is optimal more often than next fit, with fewer bins in total in that order; Johnson’s family packing into nine bins, verified, with the rule at eleven; and on two thousand items, the rule within five percent of the lower bound, with the tree reproducing the scan’s packing exactly while touching under a fifth of its checks. When it prints O K, one sort has been shown to be the difference between a guarantee of seventeen tenths and one of eleven ninths. The file would fail before it would lie to you.',
  },
];
