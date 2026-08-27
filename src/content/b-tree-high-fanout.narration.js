// The spoken lesson for puzzle forty seven, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle forty seven: the B tree, paired with high fanout node splits, for disk friendly ordered indexing. Here is the puzzle. You hold n keys on page based storage, where a single read fetches an entire page whether you use one byte of it or all of it. Build an ordered index: lookups, inserts, and range scans: whose operations touch a number of pages logarithmic in n with base equal to the page’s capacity. The disk’s economics rule everything, and the measured gap on this page is the entire argument: two point nine nine pages per lookup, against twenty one point one two for the pointer per key tree, on the same one hundred thousand keys.',
  },
  {
    section: 'origins',
    text:
      'Rudolf Bayer and Edward McCreight published the structure in nineteen seventy, working at Boeing, and famously never explained what the B stood for: balanced, broad, Boeing, or Bayer: the mystery is part of the lore. Douglas Comer’s nineteen seventy nine survey was titled The Ubiquitous B Tree, and the title has only grown more correct since: SQLite, Postgres, and MySQL’s InnoDB engine are B tree variants; so are the catalogs of mainstream filesystems; nearly always in the leaf linked B plus form. The modern challenger is the log structured merge tree, which concedes read speed to win write throughput: that bargain sits on this page’s bench, priced honestly.',
  },
  {
    section: 'pair',
    text:
      'The control structure owns the balanced multiway search tree, and it makes a promise no rotation based tree makes: every leaf sits at the same depth, always. This page asserts that invariant, machine checked recursively, after every growth stage at every fanout tested. The secret is where growth happens: when the root itself fills, it splits, and the tree gains its height at the top: leaves sink together, or not at all. The heuristic supplies the fanout: pack each node to the page, up to two t minus one keys, and split any full node around its median on the way down, the median rising to the parent. Height becomes log base t of n, and the dial is measured: at one hundred thousand keys, t of two stands thirteen levels tall; t of eight, five; t of sixty four, three; t of five hundred twelve, two. Splits are rare by construction: one thousand one hundred twenty four across one hundred thousand inserts, roughly n over t. The page is the unit of cost and the unit of growth, and that alignment is the entire design.',
  },
  {
    section: 'picture',
    text:
      'Picture a law library’s catalog. The pointer per key tree is a chain of index cards: each card names one case and points to two more drawers, and answering a question means twenty one drawer openings, each one a trip. The B tree is a shelf of ledgers. Each ledger page lists a hundred and twenty eight ranges and where each continues. Three ledger openings answer anything in the library, because opening a drawer costs the same whether you read one line or the entire page, and the ledger reads the entire page. The librarian’s wisdom is one sentence: when the trip costs more than the reading, pack the reading into the trip.',
  },
  {
    section: 'run',
    text:
      'Here is the loop. To search: binary search within the node’s keys, in memory and effectively free, then descend into the one matching child: one page per level, log base t of n levels. To insert: descend the same way, but split any full child you pass, around its median, before entering it: the median rises into the parent, which is guaranteed to have room because you did the same on the way to it. When the root itself is full, split it under a new one key root: this is the only way height grows, and it is why every leaf shares a depth. To range scan: descend once to the start, then sweep in order: the bill is the height plus the pages the answer itself occupies: eight pages for five hundred keys, measured. And tune t to the hardware: the fanout dial is the storage stack’s block size, wearing an algorithm.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, storage is paged and pages are expensive: spinning disks, solid state drives, network attached storage: and, at a smaller scale, CPU cache lines, which are sixty four byte pages obeying the same arithmetic. Second, range scans matter: order by clauses, time windows, prefix queries: ordered neighbors sharing pages is precisely what the structure buys. Third, reads dominate writes. When the mix inverts toward heavy ingestion, the log structured merge tree’s bargain, sequential writes now, read costs later, starts to win, and pretending otherwise is how databases get slow.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: two point nine nine pages per lookup, every leaf at the same depth, and growth that costs almost nothing. The height theorem is measured across the whole fanout dial: thirteen, five, three, two. Range scans price at height plus payload. The invariants are not trusted but re verified recursively at every stage, and a bisect based shadow dictionary agreed with every one of twenty thousand mixed operations, including the exact contents of every range scan. The weakness, in three honest parts. Write amplification: every insert dirties a page that must be rewritten, and a split dirties three. Occupancy: nodes hover near sixty nine percent full on random keys, so a quarter of the shelf is air. And the read write bargain: write heavy workloads flip the economics toward the log structured merge tree, which batches writes into sorted runs and pays at read time instead. In pure memory, the skip list, a live unit on this site, trades the B tree’s cache discipline for radical simplicity.',
  },
  {
    section: 'tradeoffs',
    text:
      'Here are the measured numbers: one hundred thousand random keys, one page per node, ten thousand random lookups. The B tree at t of sixty four: two point nine nine pages per lookup, height exactly three, every leaf at depth three, asserted. Binary search over a sorted file: nine point five three pages: the probe trail of seventeen comparisons crosses about ten distinct pages: honorable, structureless, and doomed by its first insert, which rewrites the file. The binary search tree, one key per page: twenty one point one two pages: seven times the B tree’s bill for identical keys, because every hop lands on a fresh page and uses one key of it. The fanout dial: heights thirteen, five, three, and two as t climbs from two through five hundred twelve. The range scan: five hundred keys in eight pages: the height once, then the answer’s own pages. And the maintenance ledger: one thousand one hundred twenty four splits in one hundred thousand inserts. Growth at the root; rent near n over t.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is a pointer per key tree as a disk index, and the number is worth saying twice: twenty one page reads where three suffice, measured, a factor of seven in input output for the same keys and the same questions. The mistake is structural, not tuning: a binary node inspects one key per page fetched, so the page’s other one hundred twenty seven keys ride along unread, and the tree’s twenty first century tragedy is that the lesson outlives disks: cache lines are sixty four byte pages, and the same arithmetic is why in memory B trees now beat pointer chasing trees on modern processors. The rule costs one sentence: when storage bills by the block, an index that reads blocks and uses bytes is paying retail for wholesale goods.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements the B tree with preemptive median splits, page read counters, range scans, and a recursive invariant checker: sorted keys within nodes, occupancy bounds, key range containment, and the same depth property for every leaf. Beside it, the pointer per key binary search tree with its own page counter, and a page cost model for binary search over a sorted file. The self test asserts, in order: agreement with a bisect based shadow dictionary across twenty thousand mixed operations, range scan contents included, with invariants re verified every thousand inserts and at every fanout. The height dial monotone: thirteen, five, three, two. The page ledger: the B tree under three point two pages per lookup, the binary search tree more than four times worse, the sorted file more than twice worse. The five hundred key range scan under thirty pages, measured at eight. And splits below n over thirty two, measured at one thousand one hundred twenty four. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
