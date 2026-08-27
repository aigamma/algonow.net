// The spoken lesson for puzzle eighty five, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle eighty five: the hash join, paired with build probe partitioning, for the relational equi-join. Here is the puzzle. Two tables share a key: customers and their orders: and the job is every matching pair of rows. This is the single most executed operation in every database on earth, and the naive answer: compare every row against every row: is ten million comparisons on this page’s workload of five hundred customers and twenty thousand orders. The hash join does it in twenty thousand five hundred touches. The referees are the two rival join algorithms themselves: nested loop and sort merge: all three required to produce the identical multiset of output rows on two hundred instances deliberately thick with duplicate keys, because duplicate keys are where join bugs live. Every meter on this page is an exact count.',
  },
  {
    section: 'origins',
    text:
      'For its first decade, the relational join meant nested loops or sort merge. The hash revolution came from Tokyo: Kitsuregawa, Tanaka, and Moto-Oka, nineteen eighty three, and a database machine called GRACE: partition both relations by a hash of the key, and one enormous join becomes many small independent ones. David DeWitt’s GAMMA project carried the idea into software, hybrid hash join became the workhorse, and today the build probe loop on this page: with vectorized and cache conscious refinements: is what actually runs when you type the word JOIN. A large part of what a query optimizer does all day is decide which side of each join builds the table, and whether memory will hold it.',
  },
  {
    section: 'pair',
    text:
      'The algorithm owns two phases. Build: take one relation and insert every row into a hash table keyed on the join column: five hundred inserts here. Probe: stream the other relation past it: each row hashes to exactly one bucket, walks that bucket’s short chain, and emits one joined row for every true match: twenty thousand probes. Correctness rides on a homely fact: equal keys hash equally: so every possible match lives in precisely the bucket the probe visits, and nothing hides anywhere else. The heuristic owns the choices around the table. Which side builds? The smaller one: measured here as identical output at forty times less memory. What happens when the build side outgrows memory? Partition first: the GRACE idea: hash both relations into sixteen partitions, join each pair independently, and the union is exactly the full join: asserted, row for row.',
  },
  {
    section: 'picture',
    text:
      'A wedding planner has twenty thousand R S V P cards to match against five hundred guest files. The all pairs way: for every card, riffle through every file: ten million riffles. The hash way: first spread the five hundred files across twenty six labeled trays by last initial: that is the build. Then take each card exactly once, walk straight to its tray, and check the two or three files inside: that is the probe. The cards never see the other trays. Build on the files, not the cards: five hundred files fit on the table, twenty thousand cards would not. And mind the prankster: if every tray somehow gets labeled with the same letter, the scheme silently collapses back into riffling everything: the trays were only ever as good as the labeling.',
  },
  {
    section: 'run',
    text:
      'Here is the run. Pick the build side: the smaller relation. Build: five hundred rows hashed into buckets, one pass. Probe: twenty thousand rows streamed, each visiting one bucket, walking its chain, emitting matches: twenty thousand five hundred touches total, against the nested loop’s ten million: four hundred eighty eight times less work, and the identical answer, verified as a multiset. When memory breaks: partition both sides by the same hash into sixteen spill partitions and join them pair by pair: the union equals the full join exactly. And the fine print, measured: give one customer four hundred of the five hundred orders: a white hot key: and its partition swells to thirteen times the mean, because no amount of partitioning can split a single key. Swap the hash for a constant function, and the touch counter reads four hundred thousand: exactly the size of R times the size of S: the nested loop, reborn inside the machinery built to retire it.',
  },
  {
    section: 'signals',
    text:
      'The signals that this pair fits. First: equality is the predicate. Hashing understands equals and nothing else: equi-joins, lookups, semi joins: while range conditions and similarity joins belong to the ordered roads. Second: one side is small, or memory is at least willing: a build table that fits in RAM makes the whole join a single streaming pass over the big side: the exact shape of star schema analytics, where a compact dimension table meets a fact table of millions. Third: no useful order exists or survives. The hash join neither needs sorted inputs nor produces sorted output: when nothing upstream is sorted and nothing downstream wants order, sort merge’s two big sorts are pure overhead, and hashing wastes none of it.',
  },
  {
    section: 'tradeoffs',
    text:
      'Now the rivals. Sort merge join: sort both relations, then zip them together in one linear pass: two hundred forty five thousand comparisons on this page’s workload, twelve times the hash bill: but the output arrives sorted, and when the inputs are already sorted: clustered storage, index scans: the sorts cost nothing and sort merge is the bargain of the catalog. It also degrades gracefully under skew, where hashing suffers. Index nested loop is the third road: when the build side already carries a B tree: the live B plus tree unit’s territory: each probe is an index descent, no build phase at all: unbeatable for a handful of selective probes, and wrong for millions of them, where per probe logarithms lose to the hash table’s constant.',
  },
  {
    section: 'tradeoffs',
    text:
      'The GRACE hash join is the disk sibling rather than a competitor: when the build side outgrows memory, partition both relations by key hash into spill files, then run this page’s join once per partition pair. That is exactly this page’s union oracle in production form, priced at one extra read and write pass over both inputs. Its weakness is the one this page measures: the skew wall. A single hot key: every order pointing at one famous customer: lands entirely in one partition, thirteen times the mean here, and raising the partition count fixes nothing, because the partition function cannot look inside a key. Real engines detect the hot keys and give them dedicated plans: broadcast joins, salted keys: which is skew handling by name.',
  },
  {
    section: 'tradeoffs',
    text:
      'And the negative example: the nested loop on a large equi-join. The nested loop is honest and correct: it referees this very page, and on tiny inputs, or predicates that are not equality at all, it is the right tool. But shipped as the plan for a plain equality join at scale, it pays ten million comparisons where twenty thousand suffice, and the ratio grows with the product of the table sizes forever. Every mature optimizer treats that plan as a failure. The deeper lesson is the sabotage meter: a hash join with a degenerate hash function IS this same disaster wearing a better name: four hundred thousand touches, exactly R times S, measured. So the rule is really one rule: never pay all pairs prices for an equality predicate: under any spelling.',
  },
  {
    section: 'code',
    text:
      'The code on this page is the whole machine. The hash join with its counters: builds, probes, chain touches, and memory. The nested loop and sort merge referees: the sort merge with a counting key class so even the sort’s comparisons are tallied honestly. The GRACE partitioner. The self test runs five oracles: two hundred duplicate heavy instances of three way agreement: the workload meter with the all pairs bill asserted to equal R times S exactly: the build side flip at exactly forty times the memory: GRACE partition joins unioning to exactly the full join, with the skew wall measured at thirteen times: and the constant hash sabotage paying exactly R times S touches. When it prints O K, every number in this lesson has been counted by a running program: none of them estimated.',
  },
];
