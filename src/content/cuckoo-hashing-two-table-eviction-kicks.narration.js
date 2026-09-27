// The spoken lesson for puzzle one hundred thirty nine, written for the ear.

export const narration = [
  {
    section: 'puzzle',
    text:
      'Puzzle one hundred thirty nine: cuckoo hashing, paired with two-table eviction kicks, for worst-case-constant lookup. Here is the puzzle. A dictionary of random keys under churn: twenty thousand inserts and deletes, then forty thousand lookups, in twenty thousand slots. Every lookup must be answered by probing at most two slots, whatever the data and however unlucky the hashes. The method: two tables with two independent hash functions, and every key lives in its slot in the first table or its slot in the second, nowhere else. A lookup checks those two. The heuristic is the insertion: put the key in its first slot, and if that slot is occupied, kick the occupant out to its other slot, which may kick another, until a kicked key finds an empty slot. A chain that runs too long is a cycle, and the cure is to rehash everything with fresh functions. On this page the invariant is checked after every thousand operations, every lookup is checked against a set kept alongside, the rivals are measured at the same load, and the kicks are removed to see what they were worth.',
  },
  {
    section: 'origins',
    text:
      'Rasmus Pagh and Flemming Friche Rodler published cuckoo hashing in two thousand one, with the journal version in two thousand four, named for the cuckoo chick that pushes the other eggs out of the nest. They proved that with two tables below half full, insertion takes expected constant time and a lookup never takes more than two probes. It descends from the power of two choices of Azar, Broder, Karlin, and Upfal in nineteen ninety four, and from the generalization by Fotakis, Pagh, Sanders, and Spirakis in two thousand three, which lifted the load limit to ninety one percent with three choices and ninety seven with four. Kirsch, Mitzenmacher, and Wieder’s stash of two thousand nine made rehashes vanishingly rare, and the cuckoo filter of Fan, Andersen, Kaminsky, and Mitzenmacher, this site’s puzzle sixty four, put the same kicks to work on fingerprints. The scheme sits today in network switches, GPU hash tables, and kernel memory allocators, wherever the worst case matters more than the average.',
  },
  {
    section: 'pair',
    text:
      'The algorithm owns the lookup guarantee. With two tables and the rule that a key is in its slot in the first or its slot in the second, a lookup is two probes, present or absent, always. Measured under churn: the invariant held at every checkpoint, forty thousand lookups agreed with a set kept alongside, and the worst probe count was exactly two. At a load of point four five, the rivals: separate chaining averages one point two probes on a hit but four in its worst bucket; linear probing averages one point four with a worst of fourteen, and twenty three on a miss; and at a load of point nine, linear probing’s worst hit is three hundred eighteen probes and its worst miss five hundred twenty one. The cuckoo table’s worst case is its average case. The heuristic supplies the insertion that makes the guarantee possible: kick the occupant to its other slot rather than refuse or overflow, and follow the chain until a kicked key lands in an empty slot. Measured: a tenth of a kick per insert at load point one, point four six at point four, point five eight at point four five, point seven seven at point four nine, with the longest chain sixty seven and no rehash below half full. Then the cliff the theory predicts: one rehash by load point five, four by point five two, and at point five three four, ten fresh function pairs in a row failed to place the keys. The ablation shows what the kicks are for. Refusing when both slots are full, the same two tables gave up at a load of seven and a half percent, because with no displacement a key can use only the two slots that happen to be free.',
  },
  {
    section: 'picture',
    text:
      'A coat check with two racks, and every coat assigned one hook on each rack. To find a coat you look at its two hooks and nowhere else, so no ticket ever takes more than two glances. Hanging a coat is where the work is. If its first hook holds someone else’s coat, you move that coat to its own hook on the other rack, and if that hook is taken you move that one too, each coat bouncing to its alternate, until one lands on an empty hook. Below half full the bouncing stops quickly. Past half full the coats start chasing each other in circles, and the only cure is new hook assignments for everyone. Without the bouncing at all, the room fills up at seven percent, because a coat whose two hooks are both taken has nowhere to go.',
  },
  {
    section: 'run',
    text:
      'Here is the run. Lookup: check the key’s slot in table one, then its slot in table two; two probes, done. Insert: put the key in its slot in table one; if that is occupied, take the occupant out and put the key in. Kick: the evicted key goes to its slot in the other table, evicting in turn, alternating tables until an empty slot. Cycle: after two hundred kicks, rehash: fresh functions, everything reinserted, with a bounded number of attempts. On this page: twenty thousand operations under churn, the invariant checked every thousand, forty thousand lookups against the set, worst probe two. Then the rivals at load point four five, and the insertion costs by load: a tenth of a kick per insert at point one, rising to point seven seven at point four nine, with no rehash. Then past half full: one rehash by point five, four by point five two, and the table giving up at point five three four. Then the ablation: no kicks, refused at seven and a half percent.',
  },
  {
    section: 'signals',
    text:
      'The signals that this pair fits. First: the worst lookup matters, not the average. A packet classifier, a real time cache, a GPU kernel where one thread’s three hundred probes stall the whole warp. Second: reads dominate writes. Insertion pays in kicks so that every lookup pays nothing. Third: you can keep the load under half, or you can use three or four tables and reach ninety one and ninety seven percent instead.',
  },
  {
    section: 'tradeoffs',
    text:
      'Now the rivals. A hash table with chaining: never refuses, never rehashes for a cycle, one point two probes on average at load point four five; the default everywhere. A worst bucket of four here and unbounded in principle, with pointer chasing on every probe. Reach for it for general purpose dictionaries where the average is what matters. Open addressing with linear probing: the cache’s favorite, one point four probes on average at the same load, all in one line of memory. But clusters: a worst of fourteen at point four five, three hundred eighteen at point nine, and five hundred twenty one for a miss. Reach for it with small keys, high locality, and a load kept comfortably below point seven. And Robin Hood hashing: linear probing with displacement, rich give to poor, so the variance of probe lengths collapses and the worst case stays close to the mean even at high load. Still a probe sequence with no fixed bound, and deletions need backward shifting; reach for it for high load in one array with a tame but not fixed worst case.',
  },
  {
    section: 'tradeoffs',
    text:
      'The honest weaknesses of the hero. Half the table is empty, and the cliff is sharp. Two tables must stay under load one half: the run gave up at point five three four after fourteen rehashes, each a full rebuild. Insertion is unbounded in the worst case, a sixty seven kick chain at load point four nine, and it needs two independent hash functions, which cheap hashes are not. And a rehash in the middle of an insert is a latency spike, which the stash and the multi table variants exist to remove.',
  },
  {
    section: 'tradeoffs',
    text:
      'And the negative example: two choices without displacement. The tempting half measure: give every key two candidate slots, but refuse the insert when both are taken rather than kick anyone out. Measured on the same two tables, it refused at a load of seven and a half percent, where the kicking version reached point four nine with no rehash at all. Two chances per key is not a guarantee; it is a coin flipped twice. The displacement is what lets an insertion rearrange the keys already placed, so that a table can be half full with every key still on one of its two hooks.',
  },
  {
    section: 'code',
    text:
      'The code on this page is three hash tables and a referee. The cuckoo table, with lookup, insert with kicks, delete, bounded rehashing that raises when ten fresh function pairs in a row fail, and an invariant check. A chaining table and a linear probing table with probe counts. The self test asserts: the invariant after every thousand operations and at the end; every one of forty thousand lookups agreeing with the set, with a worst probe count of two; chaining and linear probing worst probes above two at load point four five; at most two rehashes by load one half and the table giving up before point six; and the no kick table refusing before load point two. When it prints O K, a table whose worst lookup is its average lookup has been measured against the ones whose worst case is a story. The file would fail before it would lie to you.',
  },
];
