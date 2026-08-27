// The spoken lesson for puzzle sixty four, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle sixty four: the cuckoo filter, paired with fingerprint eviction, for deletable set membership. Here is the puzzle. A set too large to store, membership queries that tolerate a rare false positive: and one requirement the classic tools cannot meet: items leave. Flows expire. Cache entries get evicted. Sessions end. The live Bloom filter unit on this site cannot delete: clearing a departed item’s bits shreds the other items that shared them, and this page measures the damage at ninety six percent of survivors falsely reported gone. The alternative: store a twelve bit fingerprint of each item in one of two bucket homes: and the referee asserts zero false negatives on every member, after every operation, through thirty rounds of churn.',
  },
  {
    section: 'origins',
    text:
      'Fan, Andersen, Kaminsky, and Mitzenmacher published this at CoNEXT twenty fourteen, under a title that is a thesis statement: Cuckoo Filter, Practically Better Than Bloom. The lineage runs back through Pagh and Rodler’s cuckoo hashing of two thousand one, named for the cuckoo chick that shoves the other eggs out of the nest. The enabling discovery is the partial key trick: an evicted fingerprint can compute its alternate home without the original item, because the two homes are linked by an exclusive or, and exclusive or is an involution: apply it twice and you are back where you started. The networking world adopted the result for flow tables and cache admission filters: precisely the workloads where members leave.',
  },
  {
    section: 'pair',
    text:
      'The algorithm owns the two home discipline of cuckoo hashing. Every item may live in exactly one of two buckets, each holding four slots. Insert into either home with space; if both are full, evict a resident into the resident’s other home, chain style, up to a kick budget. That discipline is what fills tables: measured here, ninety seven point one percent of four thousand ninety six slots with four slot buckets, against fifty two point one percent when each bucket holds one: the choose and kick machinery is worth forty five points of load. The heuristic supplies the fingerprint: store not the item but twelve bits of its hash, with the second home computed as the first, exclusive or the hash of the fingerprint. Membership is fingerprint in either home: false positive rate measured zero point one five three five percent, against the law’s zero point one four nine zero. And deletion becomes one removal with a guarantee: twenty five thousand leavers deleted, twenty five thousand survivors every one still found. Zero collateral. Asserted.',
  },
  {
    section: 'picture',
    text:
      'Picture a pair of apartment buildings where every tenant is assigned two possible flats: one chosen by their name, and one reachable from the first by a rule anyone can apply using only the name tag on the door. When a newcomer finds both flats full, a resident is shoved out, cuckoo style: and here is the elegance: the shoved tenant does not need to remember who they are to know where to go. The rule works from the name tag alone. Checking residency means reading two doors. Departure means removing one tag: and because every tenant holds one tag in one flat, a removal never harms the neighbors. The Bloom alternative is a shared wall of light switches: every tenant flips several, many hands on each switch: and deleting someone means flipping switches other tenants depend on. Measured on this page: ninety six percent of them left in the dark.',
  },
  {
    section: 'run',
    text:
      'Here is the run. Fingerprint: twelve bits of the item’s hash. Two homes: the first from the item’s hash, the second from the first, exclusive or the hash of the fingerprint. Insert: a free slot in either home takes it; otherwise evict a resident to its other home: computable from its fingerprint alone: and chain, up to five hundred kicks. Lookup: is the fingerprint in either home: two bucket reads, two cache lines. Delete: remove one matching fingerprint: one slot, one item, no shared state to corrupt. And run the table hot: space is fingerprint bits divided by load: twelve point four bits per item at the ninety seven percent frontier, but fifteen point seven at this page’s seventy six percent fill: the space advantage over Bloom exists only in a full table, and this page says so with both numbers.',
  },
  {
    section: 'signals',
    text:
      'Three signals tell you this is the right pair. First, members leave: flow tables, cache admission, session tracking: churn is the workload, and the churn client here ran thirty rounds of four hundred departures and four hundred arrivals at eighty three percent load, staying exact throughout. Second, the false positive target is moderately low: below roughly three percent, fingerprint bits over load undercut Bloom’s one point four four times log of one over epsilon: the paper’s title claim, and this page prices exactly where it holds. Third, memory behavior matters: a lookup touches two buckets, not nine scattered bits: on real hardware, two cache lines against nine is the argument that wins the systems room.',
  },
  {
    section: 'tradeoffs',
    text:
      'The strength: deletion with a zero collateral guarantee, at Bloom class error. Every member found after every operation, asserted through the full churn run. Twenty five thousand deletions without harming one survivor, and the deleted items’ ghost rate falling to nine hundredths of a percent: indistinguishable from the background false positive noise. The false positive law matched: measured zero point one five three five percent against the predicted zero point one four nine. The load frontier measured at ninety seven point one percent, with the longest eviction chain recorded at five hundred kicks. And the rival’s failure measured rather than narrated: naive Bloom deletion false negatived ninety six percent of the survivors. The weakness, in three honest parts: the space win exists only in a hot table: at seventy six percent fill this page pays fifteen point seven bits per item against Bloom’s thirteen. Near the frontier, insertions run long kick chains and can fail outright, so production filters need a resize story. And deletion requires the item to have actually been inserted: deleting a stranger can evict an innocent matching fingerprint.',
  },
  {
    section: 'tradeoffs',
    text:
      'Here is the measured contest, fifty thousand items, deletable membership. The Bloom filter, the live unit: thirteen bits per item, false positive rate zero point one five percent, the simplest machinery on the shelf: and no deletion at all. The counting Bloom filter: the pre twenty fourteen answer: keeps Bloom’s semantics and deletes by decrementing four bit counters instead of clearing bits: at fifty two bits per item, a four times tax. The cuckoo filter at this page’s fill: fifteen point seven bits, comparable error, honest deletion. The cuckoo filter run hot, at the measured ninety seven percent frontier: twelve point four bits: cheaper than Bloom, deletable, and the row the paper’s title is about. And one rival from outside the ring: the XOR filter, for sets that never change: about one point two three times the fingerprint bits, three probes, smaller than everyone: and frozen solid: no inserts, no deletes, the whole set required up front.',
  },
  {
    section: 'tradeoffs',
    text:
      'The method you would never use is deleting from a plain Bloom filter, and the treachery is that it looks like it works. Clear the departing item’s nine bits: its own lookups start failing, the dashboard counts a successful deletion: and every cleared bit was load bearing for somebody else. Measured here: after naively deleting twenty five thousand leavers, ninety six percent of the twenty five thousand remaining members came back not present. False negatives: the one error class a membership filter must never emit: silently poisoning every cache, router, and dedup pass downstream, while all the monitoring stays green. A filter that must forget needs per item state: a counter cell at four times the space, or a fingerprint in its own slot, which is this unit. Shared bits are a one way door. An entropy note from the build, kept in the spirit of this site: the first version of the rival Bloom drew only one hundred twenty eight bits of hash for indices needing one hundred seventy four, quietly collapsing later indices toward zero and inflating the corruption to a fake one hundred percent: the referee caught the too clean number, and the fixed measurement is the honest ninety six.',
  },
  {
    section: 'code',
    text:
      'The Python solution implements the filter: fingerprints, the exclusive or home rule, kick chains with a recorded maximum, lookup, and delete: plus the rival Bloom filter with naive deletion bolted on so the damage can be measured. The self test asserts, in order: all fifty thousand members found, and the false positive rate within its two b load over two to the f law. The load frontier: four slot buckets past ninety percent, one slot buckets collapsing near half. The deletion referee: twenty five thousand removals, zero collateral, ghost rate under one percent. The Bloom corruption above thirty percent: measured at ninety six. And the churn client: thirty rounds of four hundred out and four hundred in at eighty three percent load, every live flow found every round. If any number on this page stopped being true, the file would fail before the page could lie.',
  },
];
