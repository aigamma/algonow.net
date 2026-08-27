// The spoken lesson for puzzle thirty, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle thirty: the skip list, paired with coin flip level promotion, for the dynamic ordered dictionary. Here is the puzzle. Maintain a set of keys under four interleaved operations: insert, delete, search, and in order scans, every one of them in logarithmic time. And the constraint that gives the problem its bite: the guarantee must not depend on the input being kind. Keys arriving in sorted order, which is not an edge case but the default shape of real feeds, ids, timestamps, log keys, is the classic structure killer, and this page’s contest feeds it on purpose.',
  },
  {
    section: 'origins',
    text:
      'William Pugh published skip lists in nineteen ninety, in the Communications of the ACM, with a pitch that is rare in the data structures literature: not faster, simpler. The same expected performance as balanced trees, with the entire rebalancing apparatus, rotations, colors, height bookkeeping, replaced by a coin. Three decades later, industry adopted it for a virtue Pugh had not emphasized: because nothing ever rotates, updates touch only a few adjacent pointers, and that is what makes lock free concurrent versions tractable. Java’s concurrent skip list map, Redis’s sorted sets, and the in memory tables of LevelDB and RocksDB are all skip lists, chosen precisely because no operation ever restructures the neighborhood around it.',
  },
  {
    section: 'pair',
    text:
      'The control structure owns the lanes. The base lane is a sorted linked list containing every key. Above it, express lanes: each lane skips roughly half of the lane below. A search boards the top lane and rides right until the next stop would overshoot the target, takes the stairs down one level, and repeats until the floor. That staircase is the entire search algorithm, and its expected length is logarithmic: measured here at forty one visits on average, forty three at the ninety ninth percentile, against a log base two of fourteen point three: the tail is real, and it is tame. The heuristic staffs the lanes by lottery: each inserted key flips a fair coin until tails, and the number of heads is its tower height. The tests verify the coin itself, towers of height at least k occur at rate two to the one minus k, and then verify what the coin buys: indifference to arrival order. The same twenty thousand keys, fed sorted versus fed shuffled, cost thirty nine point eight versus forty one point zero visits: within two percent. The randomness lives inside the structure, so it cannot be spoiled by the input. The tree world’s rebalancing logic is not simplified here. It is replaced.',
  },
  {
    section: 'picture',
    text:
      'Picture a subway line where every station has the local platform. Half the stations, chosen by coin flip at construction, also have an express platform. A quarter have a super express. An eighth, the night flyer. To reach any station: ride the fastest line as far as it goes without passing your stop, take the stairs down one level, ride again. Two things make this picture the whole lesson. First, nobody planned the express map: each station flipped for itself, and the network is balanced anyway, with high probability. Second, it does not matter in what order the stations were built: the coin never saw the construction schedule, so the schedule cannot bias the network. Compare the tree world, where the construction order is exactly what decides whether you get a tree or a five mile corridor.',
  },
  {
    section: 'run',
    text:
      'Here is the loop. To search: start at the top lane; while the next node’s key is below the target, ride right; otherwise take the stairs down; at the floor, the next node either is the target or the target is absent. To insert: flip a coin until tails, giving the tower height; walk the same staircase recording, at each level, the last node you rode past; splice the new tower in after those predecessors, one pointer swap per level. To delete: unlink the tower at each level it occupies; nothing else in the structure is touched, which is the sentence concurrency engineers underline. To scan a range: drop to the floor at the range’s start and walk the base lane, which is simply a sorted linked list. And trust the coin checkably: the height distribution and the search cost tail are measured on this page, not assumed.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, ordered operations with range scans: leaderboards, time indexes, memtables: places where you need neighbors, not just membership. Second, concurrency is coming: the absence of rotations turns updates into small local splices, which compare and swap instructions can manage without global locks; this is why the lock free world standardized on skip lists rather than red black trees. Third, you carry a simplicity budget: the entire structure is one search loop and one splice; the AVL rival on this page needed rotation machinery in four variants and executed one thousand nine hundred eighty nine rotations on the same feed.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: no rebalancing code exists, and no arrival order matters. The coin replaces rotations wholesale; sorted and shuffled feeds cost within two percent of each other, asserted; deletes are local unlinks; scans are walks; and the production lock free versions exist precisely because nothing ever restructures. The weakness, stated with the numbers on the table: the guarantee is expected, not worst case, and this structure does not win the raw visit count. The AVL tree answered the same searches in thirteen point four visits to the skip list’s forty one: tighter paths, deterministic bounds, bought with rotation machinery and multi node restructuring. The skip list also spends roughly double the pointers on its towers. The choice is honest: determinism and tight constants from the tree, or immunity, simplicity, and concurrency from the coin.',
  },
  {
    section: 'tradeoffs',
    text:
      'Here are the measured numbers: twenty thousand keys inserted, twenty thousand searched, average visits per operation, under two arrival orders. The skip list: forty one point zero under random arrivals, thirty nine point eight under sorted. The AVL tree: thirteen point four and thirteen point four, immune as well, its balance invariant verified at every node, its price paid in one thousand nine hundred eighty nine rotations and the code that performs them. The plain binary search tree: sixteen point seven under random arrivals, genuinely fine, better than the skip list; and one thousand one hundred eighty two visits per operation under sorted arrivals, measured at a mere two thousand keys because it is that bad: the linked list wearing a tree’s interface. And the sorted array: two thousand five hundred fourteen point nine under random arrivals, every insert shifting half the tail; fourteen point two under sorted arrivals, the best cell in that column, because appending in order shifts nothing. Read the table as a two by two: two structures whose fate depends on the input’s order, one facing each way, and two structures that are immune, one by determinism, one by lottery.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is the plain binary search tree fed ordered data, and the trap deserves its anatomy. Under random arrivals the plain tree is honestly good: sixteen point seven visits, no rebalancing, less code than anything except the array. The failure is not the structure; it is the assumption hiding under it: that the input supplies the randomness. Feed the same keys in order and every insert turns right, the tree becomes a corridor, and the measured cost is over a thousand visits per operation at two thousand keys, growing linearly forever. Sorted arrivals are what real systems produce by default. The lesson generalizes into one sentence worth keeping: if the input’s order is not yours to choose, then the structure’s balance must not depend on it, and you have exactly two ways to buy that independence: enforce it with rotations, or roll for it with a coin.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements the skip list in about eighty lines: the staircase search with a visit counter, coin flip towers, splice in insert, unlink delete, and floor lane iteration; beside it, a full AVL tree with all four rotation cases, the plain binary search tree, and the sorted array with bisect. The self test asserts, in order: exact agreement with a shadow set through ten thousand mixed operations, including in order iteration; the coin itself, tower heights geometric with rate one half, measured at every level; the expected logarithm with its tail, average under four log n and ninety ninth percentile under ten log n; the immunity, sorted versus shuffled feeds within fifteen percent for the skip list; the collapse, the plain tree beyond thirty times the skip list’s cost on the sorted feed; and the AVL balance invariant verified at every node. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
