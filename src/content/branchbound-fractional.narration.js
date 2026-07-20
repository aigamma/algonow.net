// The spoken lesson for puzzle five, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle five: branch and bound, paired with the fractional relaxation bound, for the zero one knapsack. Here is the puzzle. You are given a bag with a strict weight capacity and a pile of items, each with a weight and a value in points. Your task is to choose the subset of items that maximizes total points without exceeding the capacity, and the answer must be exactly optimal, not merely good. The constraint is that each item is all or nothing, in or out, no fractions. That single rule is what makes the problem hard: with n items there are two to the n subsets, and with just forty items that is a trillion bags.',
  },
  {
    section: 'origins',
    text:
      'Branch and bound was named and formalized by Ailsa Land and Alison Doig at the London School of Economics in nineteen sixty, as a general recipe for integer programming problems exactly like this one. The knapsack framing is older, part of the folklore of operations research since the nineteen fifties, and the pattern of relaxing a hard problem to get a quick optimistic estimate became one of the load bearing ideas of the field. Every serious integer programming solver today, the engines behind airline scheduling and supply chains, is an industrial descendant of this pair: exhaustive search married to relaxation bounds.',
  },
  {
    section: 'pair',
    text:
      'The control structure is branch and bound, which at its core is exhaustive depth first search over decisions: include item one or exclude it, then item two, and so on down a binary tree whose leaves are all possible bags. Alone, that is enumeration, and it reads everything. The guiding rule is the fractional relaxation bound, and it comes from answering an easier question. Suppose, just for estimation, that items could be split, taking half a laptop at half its points. Under that relaxed rule the best strategy is obvious and instant: pour in items in order of points per kilogram, densest first, and top off with a fraction of whatever comes next. The points that pouring achieves is a ceiling: no legal, no fractions bag drawn from those same remaining items can ever beat it. So at every node the search asks one question. Could this branch, at its ceiling, beat the best complete bag I already hold? If not, the branch dies unopened, and with it every bag inside.',
  },
  {
    section: 'picture',
    text:
      'Picture a jewel thief with one small backpack, working through a vault shelf by shelf. In a notebook, the thief keeps the best full backpack assembled so far: one hundred eighteen points, banked. At each shelf the thief makes a thirty second estimate: if I could shave gold bars and take dust instead of bars, everything left on these shelves tops out at one hundred twelve. The estimate is generous by construction, dust packs perfectly, and it still cannot reach the banked bag. So the thief walks past the whole aisle without opening a single case. That walk past is the entire trick. The generous estimate is the relaxation; walking past unopened cases is the pruning; and the banked backpack is what makes the comparison mean something.',
  },
  {
    section: 'run',
    text:
      'Here is the loop. First, sort the items by value density, points per unit of weight, densest first: this ordering makes the ceiling tight and the pruning fierce. Second, walk the decision tree depth first: at item i, branch into include, when it fits, and exclude. Third, at every node, keep the running weight and points of the bag so far, and bank the best complete bag whenever the current one beats it. Fourth, before descending into any subtree, compute the fractional ceiling: pour the remaining items greedily, split the last one. Fifth, the discard: if the ceiling is less than or equal to the banked best, retreat immediately; nothing below can win. Sixth, when the tree is exhausted, the banked bag is not just good, it is provably optimal, because every branch either was examined or owned a ceiling that could not beat it.',
  },
  {
    section: 'signals',
    text:
      'The signals for this pair. The answer must be exactly optimal, so the heuristic family that merely finds good answers is disqualified. The problem is all or nothing choices, which is what defeats plain greedy. And a relaxed version of the problem, fractions allowed, integrality dropped, solves instantly and bounds the original. That last signal is the deep one, and once you see it you find it everywhere in optimization. The baselines frame the win. Full enumeration reads two to the n bags. Dynamic programming solves knapsack exactly in n times capacity steps, a fine alternative when capacities are small integers, and our test file uses it as the independent oracle. On a random eighteen item instance, plain enumeration visited one hundred seventy four thousand seven hundred seven nodes; the same search carrying the fractional bound visited thirty nine. Same optimal answer, four thousand times less reading.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength is certainty at a discount. Branch and bound returns the provably optimal bag, usually after exploring a sliver of the tree, and unlike dynamic programming it does not care whether weights are fractional or capacities astronomical; it needs only a sound bound. The weakness is that the discount is not guaranteed. On adversarial instances the ceilings stay loose, pruning starves, and the search decays toward full enumeration; the worst case remains exponential. The bound must also be sound: an estimate that ever undershoots the truth prunes away the optimum and silently corrupts the guarantee, which is why our test file checks the ceiling against exact completions.',
  },
  {
    section: 'code',
    text:
      'The Python solution has three parts. The fractional bound function pours the remaining items densest first into the leftover capacity and splits the last item, returning the ceiling. The search function walks include exclude decisions depth first, banks the best bag seen, and retreats the moment the ceiling cannot beat the bank. And an independent dynamic programming solver exists purely as the oracle. The file then holds the pair to account: on twenty random instances the branch and bound value must equal the dynamic programming value exactly, the chosen items must genuinely fit and genuinely add up, the node counters must show pruning cutting the work by more than ten times, and the ceiling itself is audited, at several tree depths, against the true best completion it claims to dominate. That is the pair. Branch and bound supplies the certainty. The relaxation supplies the receipt that lets almost all of the certainty go unread.',
  },
];
