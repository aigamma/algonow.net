// The spoken lesson for puzzle seventy one, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle seventy one: the B plus tree, paired with linked leaf range scans, for database range indexing. Here is the puzzle. A table’s worth of keyed rows lives on paged storage, and the query that pays the rent is a range: where timestamp between a and b. The live B tree unit balances beautifully: but it stores rows in every node, so a range scan walks the tree, and a point lookup ends at an unpredictable depth. This unit asks what happens when you change not the balancing but the residency rules: every row to a leaf, internal nodes reduced to pure directions, and the leaves chained left to right. The referees: three hundred range queries equal to sorted list slices, exactly, on both trees; the structural invariants asserted after a hundred thousand inserts; and two meters that disagree on purpose: node touches, which come out a wash, and disk seeks, which come out nine to one.',
  },
  {
    section: 'origins',
    text:
      'The B tree is Bayer and McCreight, nineteen seventy two: the live unit’s page tells that story. The plus variant grew inside IBM’s database groups in the years right after, and it received its name and canonical form in Douglas Comer’s nineteen seventy nine survey, The Ubiquitous B Tree: which observed, already then, that the plus form was what implementers actually built. Half a century on, that observation is simply the truth of the industry: SQLite, Postgres, MySQL’s InnoDB storage engine, LMDB: every serious disk index is a B plus tree. This page measures the two reasons why: fanout, and the straight line.',
  },
  {
    section: 'pair',
    text:
      'The algorithm owns the balanced high fanout tree: the live B tree unit’s machinery, unchanged: splits propagating upward, every leaf at the same depth, occupancy floors keeping the height logarithmic. All of it is asserted here after the build: sorted nodes, uniform leaf depth, minimum occupancy, and the leaf chain in strictly increasing order. The heuristic supplies the plus discipline: three residency rules. Every row lives in a leaf. Internal nodes hold nothing but separator keys. And the leaves are chained, left to right. Three consequences follow, and all three are measured. Lookups touch exactly the height: one thousand probes, every single one touching three nodes, zero variance: while the plain B tree’s probes wandered between one and three. Separator only pages point roughly two hundred fifty six ways where inline rows fit sixty: so the tree is shallower at scale: height four instead of five at a hundred million rows. And a range query never climbs the tree twice: one descent, then the chain.',
  },
  {
    section: 'picture',
    text:
      'Picture a library where the index cards and the books live apart. In the plain B tree, some books are stored inside the card cabinet itself: finding one of those is lucky and quick, finding others means descending drawer after drawer: and reading a whole shelf’s worth of material means bouncing between the cabinet and the stacks, over and over. The plus library moves every book out to the shelves and keeps the cabinet as pure directions: the cards are thinner now, so each drawer points further. And then the decisive move: the shelves are bolted into one continuous aisle. You find the first book through the cabinet: and you read the next thousand by walking the aisle. Nobody returns to the cabinet in the middle of a shelf. That is the entire difference between seeking and streaming.',
  },
  {
    section: 'run',
    text:
      'Here is the run. Descend by separators: internal nodes route, only leaves answer: which is why every lookup lands at exactly the height. Insert at the leaf, splitting on overflow: and mind the one asymmetry: a leaf’s split key is copied upward, because the row itself must stay in the leaf: an internal split moves its middle key up, because routers hold no rows. Chain every new leaf into the list as splits happen: the chain stays sorted, and this page asserts it. A range query: descend once to the leaf holding a, then follow next pointers until the keys pass b: no re climbing, ever. And the operational rule that makes the meter sing: lay the leaves out on disk in chain order. On this page that turned one thousand three hundred twenty seven page transitions sequential, leaving one hundred eighty seeks where the tree walk paid one thousand five hundred fifty three.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, ranges pay the rent: time windows, key prefixes, pagination: between is the workload, and the chain is its instrument. Second, storage comes in pages: disk blocks, SSD erase units, buffer pool frames: fanout per page and sequential reads are the two currencies that matter, and they are exactly what evicting rows and chaining leaves purchase. Third, latency is contractual: when every lookup touches exactly the height, the ninety ninth percentile looks like the median: this page measured a thousand lookups with zero variance: predictability you can put in a service agreement.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: slice exact answers, asserted structure, and the straight line. All three hundred ranges equal to sorted list slices on both trees. The invariants: sorted nodes, uniform leaf depth, occupancy floors, the ordered chain: asserted after one hundred thousand inserts. Lookups at exactly height three, zero variance. And the seek meter: one hundred eighty against one thousand five hundred fifty three: nine to one: with thirteen hundred transitions turned sequential by the chain. The weakness, in three honest parts. Separator keys are stored twice: once as a router, once with their row: the price of eviction. Every insert dirties a leaf page, and splits dirty a neighbor: write amplification, which is the entire reason the log structured merge world exists. And the honest wash: when the whole index is hot in RAM, the touch meter says the plain B tree walk is within three percent: the plus form’s advantages are page shaped: no pages, no advantage.',
  },
  {
    section: 'tradeoffs',
    text:
      'The rivals, honestly placed. The plain B tree, live on this site: rows in every node mean lucky lookups end high: measured here touching as few as one node: marginally better for point heavy loads in memory, and the right teaching structure: but its ranges walk scattered pages, every hop a seek. The log structured merge tree: the write side answer: appends and background merges instead of in place page edits: it exists precisely to dodge the write amplification this unit’s splits pay: and its reads consult multiple levels, with Bloom filters as bandages. And the skip list, also live here: the in memory cousin of the same chain idea: its bottom level is literally a linked list, scanned exactly like the leaf chain: lock friendly, simple: and with no page discipline at all, the fanout and sequential I O advantages evaporate on disk: fittingly, the LSM engines use skip lists as their in memory front end. The shelf is coherent: one idea, the sorted chain, dressed for three different rooms.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is scattering the leaves, and the trap is that nothing catches it. The chain is a pointer structure: it works wherever the leaves physically live. So let them land wherever allocation happens to drop them: insert order, recycled pages, fragmentation after months of churn: and every next pointer hop quietly becomes a random seek. The meter’s one hundred eighty climbs back toward the walk’s one thousand five hundred: while every correctness test still passes, because the answers never change. This is why real engines fight for physical order: SQLite’s vacuum, Postgres’s cluster command, InnoDB’s order preserving page allocation. The performance contract lives in a property no unit test can see. A B plus tree with scattered leaves is a B plus tree in name and a random I O generator in practice. The data structure is the layout.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements the B plus tree: leaf and internal nodes, splits with the copy up versus move up asymmetry, the chained leaves, lookup and range with node counters, and a full invariant checker: alongside a classic B tree with preemptive splits for the race, and the page layout seek meter for both. The self test asserts, in order: three hundred ranges equal to sorted list slices on both trees, and two thousand memberships. The invariants after one hundred thousand inserts. The uniform depth property: a thousand lookups at exactly three touches, zero variance, against the B tree’s wander. The touch count wash, reported honestly at three percent. And the seek meter under natural layouts: one hundred eighty against one thousand five hundred fifty three, better than four to one asserted, measured at nine. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
