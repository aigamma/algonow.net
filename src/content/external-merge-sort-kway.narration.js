// The spoken lesson for puzzle ninety two, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle ninety two: external merge sort, paired with k way run merging, for sorting data that will not fit. Here is the puzzle. A million records: memory for four thousand: a ratio of two hundred fifty two to one. This is not an exotic corner case: it is every ORDER BY, every index build, every DISTINCT a database runs when the table dwarfs RAM, which is most of the time. The method has two phases: read memory sized chunks, sort them, write them back as sorted runs: then merge k runs at a time until one remains. The count that matters is passes: complete trips through the data: and the formula is one plus the ceiling of log base k of the number of runs. The referee on this page is Python’s own sorted function: exact equality on all two hundred instances, duplicates and all: and every page of simulated disk traffic is counted, so the pass formula is not derived: it is asserted, instance by instance, and the client’s forty nine thousand page reads land at exactly three times its sixteen thousand pages.',
  },
  {
    section: 'origins',
    text:
      'External sorting is as old as computing itself: Knuth’s third volume spends a hundred pages on merge patterns designed for tape drives that had to physically rewind: polyphase merges, cascade merges, oscillating sorts: a lost world of mechanical choreography. The subject never retired, because data has outgrown memory in every decade since. Goetz Graefe’s two thousand six survey in A C M Computing Surveys is the modern canon: run formation, k way merging, replacement selection, and the engineering that makes ORDER BY work in PostgreSQL, SQL Server, and everything else. And the loveliest theorem in the area: Knuth’s snowplow analysis, after E F Moore: says replacement selection’s runs average TWICE the memory that produced them on random input. This page measures that law at one point nine nine, and both of its edge cases land exactly where the theory puts them.',
  },
  {
    section: 'pair',
    text:
      'The algorithm owns the two phases and the ledger. Phase one: read a memory’s worth of records: four thousand one hundred sixty here: sort them in RAM, write them back as a run: the million record client produces two hundred fifty three runs. Phase two: merge until one run remains: each pass reads every page once and writes every page once, and the counters prove it: forty nine thousand one hundred fifty two page reads, exactly three passes times sixteen thousand three hundred eighty four pages. The heuristic owns the funnel’s width. With M pages of memory, buffer one page from each of k equals M minus one runs, plus one output page: a heap picks the smallest head each step. The pass count is one plus ceiling log base k of the runs: which means THE LOGARITHM’S BASE IS YOUR MEMORY. Measured on identical data and identical memory: k of two costs seven passes and fifty two thousand five hundred page I Os: k of sixty four costs two passes and fifteen thousand: three and a half times cheaper, from bookkeeping alone.',
  },
  {
    section: 'picture',
    text:
      'A librarian must alphabetize a warehouse of index cards using one small desk. Phase one: bring a deskful of cards at a time, sort it, bind it as a booklet, shelve it: the warehouse becomes two hundred fifty three sorted booklets. Phase two: the desk can hold sixty four booklets open at once. Look at the top card of each, take the alphabetically first, place it on the growing master stack: when a booklet runs out, open the next. Sixty four booklets become one: repeat once more, and the warehouse is a single sorted archive. The decision that matters is how many booklets to open per session. Open only two at a time, and every card in the building passes through your hands seven separate times. Open sixty four, and two sessions finish everything. Same desk. Same cards. The number of times each card is touched is the entire bill: and the width of the funnel sets it.',
  },
  {
    section: 'run',
    text:
      'Here is the run, and the snowplow deserves its moment. Simple run formation fills memory, sorts, writes: runs exactly one memory long. Replacement selection is cleverer: keep a heap of a full memory of records: emit the smallest one that can still extend the current run: and refill its slot with the next input record: if the newcomer is smaller than what was just emitted, it cannot join this run, so freeze it for the next one. On random input the run grows to TWICE memory before the frozen records take over: Knuth’s image is a snowplow on a circular road in steady snowfall: at any moment, half the snow on the road is ahead of the plow: measured here: one point nine nine times memory, forty thousand records. The edges are exact: already sorted input produces ONE endless run: the plow never stops: and reverse sorted input freezes every single newcomer, collapsing runs to exactly memory sized: the adversary, measured at precisely ceiling N over M, three hundred thirteen runs. Fewer runs in, fewer merge passes out: phase one’s cleverness is phase two’s discount.',
  },
  {
    section: 'signals',
    text:
      'The signals that this pair fits. First: the data exceeds memory and order is genuinely the ask: ORDER BY, GROUP BY, DISTINCT, index construction, and the sorted streams a merge join drinks: the database quartet plus one. Second: your storage rewards sequential access. External merge reads streams and never seeks per record: the access pattern spinning disks demand and S S Ds still prefer: while the pass formula turns cost prediction into arithmetic: passes times data size, verified here to the page. Third, and the transferable instinct: passes are the currency. Whenever a computation must repeatedly traverse data too large to hold: log compaction, external joins, out of core matrix work: count trips through the data first and operations second: the trips are what you will actually wait for.',
  },
  {
    section: 'tradeoffs',
    text:
      'Now the rivals, and they are mostly this site’s own live units meeting on new ground. Quicksort, in memory: when the data fits, nothing external competes: and it is not even a true rival, because it IS phase one, sorting each memory load into a run. The interesting fight is sort versus hash. The live hash join unit showed equality predicates joined at four hundred eighty eight times under all pairs WITHOUT any ordering: and the same trick serves GROUP BY and DISTINCT: hash partition, never sort. When the query needs only equality, hashing skips the logarithm entirely. When the query needs order: an ORDER BY at the top, a merge join downstream, an index build: sorting earns its rewrite. That choice: sort versus hash: is the query optimizer’s daily knife fight, and knowing which side wins on which shape is exactly the strategic fluency this site is for.',
  },
  {
    section: 'tradeoffs',
    text:
      'The B plus tree: the live unit: appears here as the downstream customer. Every CREATE INDEX you have ever run is this page followed by a linear pass: sort the keys externally, then bulk load the leaves left to right: sequential, packed tight, done. The alternative: inserting records one at a time into a growing tree: pays a random I O per record, exactly the pattern external sorting exists to avoid: the same lesson as the B plus unit’s own seek meter, arriving from the other side. And the k dial has fine print worth speaking: one buffer page per run means enormous k shrinks each buffer toward single page reads: passes fall but each read approaches a seek: real engines balance fan in against buffer depth, and Graefe’s survey is in large part the study of that tension. The formula on this page is the clean core: production adds the friction terms.',
  },
  {
    section: 'tradeoffs',
    text:
      'And the negative example: an in memory sort on top of virtual memory. Allocate two hundred fifty two times your RAM, call quicksort, and let the operating system’s pager sort it out. The code compiles. The small tests pass. Production dies by page fault storm: and the arithmetic is the indictment. Quicksort’s comparisons stride across the whole array, so once the working set exceeds RAM, each memory access is close to a coin flip page fault: ONE disk I O for ONE comparison. External merge does a PAGE of useful work per I O and touches everything three counted times. The pager is an L R U cache: the live L R U unit’s exact machinery: being fed the one access pattern L R U handles worst: uniform random probes over a set two hundred fifty two times its size: a hit rate around one in two hundred fifty two. Same records, same hardware, catastrophically different bill: the difference is only whether the algorithm was told the truth about memory. Lying to your algorithm about its resources is the quietest way to lose four orders of magnitude.',
  },
  {
    section: 'code',
    text:
      'The code on this page is a disk you can audit. A page granular disk class that counts every read and write. Simple run formation, and replacement selection with the memory invariant asserted at every step: heap plus frozen never exceeds capacity. The k way merge with per run page buffers and a heap of heads. The self test asserts: two hundred instances equal to sorted, with the pass formula exact on each: the k dial monotone, with binary versus sixty four way merging measured at three and a half times the I O on identical memory: the snowplow law at one point nine nine times memory with both edge cases exact: and the two hundred fifty two to one client sorted in exactly three passes, its page reads equal to three times its page count, to the page. When it prints O K, the oldest discipline in data processing has run its full ledger in front of you: and the bill was passes, all along.',
  },
];
