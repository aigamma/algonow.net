import CuckooHashingViz from '../viz/CuckooHashingViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/cuckoo_hashing_two_table_eviction_kicks.py?raw';
import { narration } from './cuckoo-hashing-two-table-eviction-kicks.narration.js';

export const content = {
  given:
    'A dictionary of random keys under churn: 20,000 inserts and deletes, then 40,000 lookups, in 20,000 slots. Every lookup must be answered by probing at most two slots, whatever the data and however unlucky the hashes.',
  task: 'Two tables with two independent hash functions; every key lives in slot h₁(k) of the first table or slot h₂(k) of the second, nowhere else. Lookup checks those two. Insertion puts the key in its first slot; if that is occupied, the occupant is kicked to its other slot, which may kick another, until a kicked key finds an empty slot. A chain that runs too long is a cycle: rehash everything with fresh functions.',
  constraint:
    'After every operation the invariant held (each key in one of its two slots, none stored twice) and all 40,000 lookups agreed with a Python set, with a worst probe count of exactly 2. At load 0.45 the cuckoo table’s worst lookup is 2 probes where separate chaining’s is 4 and linear probing’s 14 (23 on a miss); at load 0.9 linear probing reaches 318 and 521. Insertion pays in kicks: 0.10, 0.19, 0.31, 0.46, 0.58, 0.77 per insert at loads 0.1 through 0.49, longest chain 67, no rehash below 0.5. Past 0.5 the cliff: one rehash by load 0.50, four by 0.52, and at 0.534 ten fresh function pairs in a row failed. Without kicks, the table refused an insert at load 0.075.',

  origins: (
    <p>
      Rasmus Pagh and Flemming Friche Rodler published cuckoo hashing
      in <strong>2001</strong> (ESA; journal version 2004), named for
      the cuckoo chick that pushes the other eggs out of the nest, and
      proved that with two tables below half full, insertion takes
      expected constant time and a lookup never takes more than two
      probes. It descends from Azar, Broder, Karlin, and Upfal&apos;s
      &quot;power of two choices&quot; (1994) and from Fotakis, Pagh,
      Sanders, and Spirakis&apos;s d-ary generalization (2003), which
      lifted the load limit to 91% with three choices and 97% with
      four. Kirsch, Mitzenmacher, and Wieder&apos;s stash (2009) made
      rehashes vanishingly rare; Fan, Andersen, Kaminsky, and
      Mitzenmacher&apos;s cuckoo filter (2014, this site&apos;s puzzle
      64) put the same kicks to work on fingerprints. The scheme sits
      today in network switches, GPU hash tables, and the Linux
      kernel&apos;s memory allocators, wherever the worst case matters
      more than the average.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>lookup guarantee</strong>: with two tables and
      the rule that a key is in h<sub>1</sub>(k) of the first or
      h<sub>2</sub>(k) of the second, a lookup is two probes, present
      or absent, always. Measured under churn: the invariant held at
      every checkpoint, 40,000 lookups agreed with a Python set kept
      alongside, and the worst probe count was <strong>exactly 2</strong>.
      At load 0.45 the rivals: separate chaining averages 1.22 probes
      on a hit but 4 in its worst bucket; linear probing averages 1.41
      with a worst of 14, and 23 on a miss; at load 0.9 linear
      probing&apos;s worst hit is 318 probes and its worst miss 521.
      The cuckoo table&apos;s worst case is its average case.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>insertion that makes the guarantee
      possible</strong>: kick the occupant to its other slot rather
      than refuse or overflow, and follow the chain until a kicked key
      lands in an empty slot. Measured: 0.10 kicks per insert at load
      0.1, 0.46 at 0.4, 0.58 at 0.45, 0.77 at 0.49, with the longest
      chain 67 and <strong>no rehash below load 0.5</strong>. Then the
      cliff the theory predicts: one rehash by 0.50, four by 0.52, and
      at 0.534 ten fresh function pairs in a row failed to place the
      keys. The ablation shows what the kicks are for: refusing when
      both slots are full, the same two tables gave up at load{' '}
      <strong>0.075</strong>, because with no displacement a key can
      use only the two slots that happen to be free.
    </p>
  ),

  picture: (
    <p>
      A coat check with two racks, and every coat assigned one hook on
      each rack. To find a coat you look at its two hooks and nowhere
      else, so no ticket ever takes more than two glances. Hanging a
      coat is where the work is: if its first hook holds someone
      else&apos;s coat, you move that coat to <em>its</em> hook on the
      other rack, and if that hook is taken you move that one too,
      each coat bouncing to its alternate, until one lands on an empty
      hook. Below half full the bouncing stops quickly. Past half full
      the coats start chasing each other in circles, and the only cure
      is new hook assignments for everyone. Without the bouncing at
      all, the room fills up at seven percent, because a coat whose
      two hooks are both taken has nowhere to go.
    </p>
  ),

  steps: [
    <>
      <strong>Lookup:</strong> check t<sub>1</sub>[h<sub>1</sub>(k)]
      then t<sub>2</sub>[h<sub>2</sub>(k)]; two probes, done.
    </>,
    <>
      <strong>Insert:</strong> put k in t<sub>1</sub>[h<sub>1</sub>(k)];
      if occupied, take the occupant out and place k.
    </>,
    <>
      <strong>Kick:</strong> the evicted key goes to its slot in the
      other table, evicting in turn; alternate tables until an empty
      slot.
    </>,
    <>
      <strong>Cycle:</strong> after 200 kicks, rehash: fresh
      h<sub>1</sub>, h<sub>2</sub>, reinsert everything, bounded
      attempts.
    </>,
    <>
      <strong>Check:</strong> the invariant after every 1,000 ops, 40,000
      lookups against a set, worst probe 2.
    </>,
  ],

  signals: [
    <>
      <strong>The worst lookup matters, not the average:</strong> a
      packet classifier, a real-time cache, a GPU kernel where one
      thread&apos;s 318 probes stall the warp.
    </>,
    <>
      <strong>Reads dominate writes:</strong> insertion pays kicks so
      that every lookup pays nothing.
    </>,
    <>
      <strong>You can keep the load under half</strong> (or use three
      or four tables for 91% and 97%).
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>the same two tables without
      kicks</strong>: put the key in either of its slots if one is
      free, else refuse. Measured, it refused at load 0.075. The kicks
      are not an optimization of that table; they are what turns two
      chances into a guarantee.
    </>
  ),

  strength: (
    <>
      <strong>A worst case you can write down.</strong> Two probes per
      lookup, measured as exact on 40,000 lookups under churn, against
      14 and 318 for linear probing and 4 for chaining; insertion at a
      fraction of a kick per key below load 0.45; and a structure
      simple enough to fit in a network switch.
    </>
  ),
  weakness: (
    <>
      <strong>Half the table is empty, and the cliff is sharp.</strong>{' '}
      Two tables must stay under load 0.5: the run gave up at 0.534
      after fourteen rehashes, each a full rebuild. Insertion is
      unbounded in the worst case (a 67-kick chain at load 0.49) and
      needs two independent hash functions, which cheap hashes are
      not. A rehash mid-insert is a latency spike, which the stash and
      the d-ary variants exist to remove.
    </>
  ),

  problem: 'Worst-case-constant lookup',
  problemSlug: 'hash-collision-resolution',
  rivals: [
    {
      name: 'Cuckoo hashing × two-table eviction kicks',
      isThisUnit: true,
      algoName: 'Cuckoo hashing',
      cost: '2 probes per lookup, always',
      wins: (
        <>
          <strong>Worst lookup 2</strong> on 40,000 probes; 0.58 kicks
          per insert at load 0.45.
        </>
      ),
      costs: (
        <>
          Load under 0.5 or the rehashes cascade (gave up at 0.534);
          insertion spikes.
        </>
      ),
      when: 'Read-heavy tables where the worst lookup is the number that matters.',
    },
    {
      name: 'Hash table with chaining',
      cost: 'expected 1 + load per probe',
      wins: (
        <>
          Never refuses, never rehashes for a cycle, 1.22 probes on
          average at load 0.45; the default everywhere.
        </>
      ),
      costs: (
        <>
          A worst bucket of 4 here and unbounded in principle; pointer
          chasing on every probe.
        </>
      ),
      when: 'General-purpose dictionaries where the average is what matters.',
    },
    {
      name: 'Open addressing',
      cost: 'one array, sequential probes',
      wins: (
        <>
          Linear probing is the cache&apos;s favorite: 1.41 probes on
          average at load 0.45, all in one line of memory.
        </>
      ),
      costs: (
        <>
          Clusters: worst 14 at load 0.45, 318 at 0.9, and 521 for a
          miss.
        </>
      ),
      when: 'Small keys, high locality, and a load kept comfortably below 0.7.',
    },
    {
      name: 'Robin Hood hashing',
      cost: 'linear probing with displacement',
      wins: (
        <>
          Rich-give-to-poor: the variance of probe lengths collapses,
          so the worst case is close to the mean even at high load.
        </>
      ),
      costs: (
        <>
          Still a probe sequence, still no fixed bound; deletions need
          backward shifting.
        </>
      ),
      when: 'High load in one array with a tame but not fixed worst case.',
    },
  ],
  neverUse: {
    name: 'Two choices without displacement',
    why: (
      <>
        The tempting half-measure: give every key two candidate slots,
        but refuse the insert when both are taken rather than kick
        anyone out. Measured on the same two tables, it refused at load{' '}
        <strong>0.075</strong>, seven percent full, where the kicking
        version reached 0.49 with no rehash. Two chances per key is
        not a guarantee; it is a coin flipped twice. The displacement
        is what lets an insertion rearrange the keys already placed, so
        that a table can be half full with every key still on one of
        its two hooks.
      </>
    ),
  },

  contest: {
    instance:
      '20,000 slots (two tables of 10,000), random 30-bit keys, load 0.45; referee: a Python set kept alongside 20,000 inserts and deletes, then 40,000 lookups',
    columns: ['hit probes mean / worst', 'miss probes mean / worst'],
    rows: [
      {
        method: 'Cuckoo hashing (two tables)',
        isThisUnit: true,
        values: ['1.33 / 2', '2.00 / 2'],
        best: 0,
        verdict: 'every lookup at most two probes, present or absent',
      },
      {
        method: 'Separate chaining',
        values: ['1.22 / 4', '1.09 / 4'],
        verdict: 'short on average, unbounded in the worst bucket',
      },
      {
        method: 'Linear probing',
        values: ['1.41 / 14', '2.14 / 23'],
        verdict: 'clusters; at load 0.9: 5.4 / 318 hit, 52.8 / 521 miss',
      },
      {
        method: 'Cuckoo insertion cost, loads 0.1 to 0.49',
        values: ['0.10, 0.19, 0.31, 0.46, 0.58, 0.77 kicks per insert', 'longest chain 67, 0 rehashes'],
        verdict: 'below half full the chains stay short',
      },
      {
        method: 'The cliff, and the ablation',
        values: ['rehashes 1 by 0.50, 4 by 0.52', 'gave up at 0.534; no kicks: refused at 0.075'],
        verdict: 'the two-table limit is real, and so are the kicks',
      },
    ],
    source:
      'python solutions/cuckoo_hashing_two_table_eviction_kicks.py prints this table and asserts: the invariant after every 1,000 operations and at the end, every one of 40,000 lookups agreeing with the set with a worst probe count of 2; chaining and linear probing worst probes above 2 at load 0.45; at most 2 rehashes by load 0.5 and the table giving up before 0.6; and the no-kick table refusing before load 0.2.',
  },

  figure: (
    <Figure
      id="fig-cuckoo-kicks"
      aspect="16 / 7"
      caption="One insertion with a kick chain. Key k wants slot h₁(k) in table 1, which holds a; a is kicked to its own slot h₂(a) in table 2, which holds b; b is kicked to h₁(b) in table 1, which is empty, and the chain ends. Three keys moved, and every one of them is still in one of its two slots, so a lookup for any key remains two probes. Measured: 0.58 kicks per insert at load 0.45, the longest chain 67 at 0.49, the first rehash at 0.50, the table giving up at 0.534; without kicks, refused at 0.075."
      cite={{
        text: 'R. Pagh, F. F. Rodler, "Cuckoo hashing," Journal of Algorithms 51(2), 2004. DOI 10.1016/j.jalgor.2003.12.002. D. Fotakis, R. Pagh, P. Sanders, P. Spirakis, "Space efficient hash tables with worst case constant access time," STACS 2003.',
        href: 'https://doi.org/10.1016/j.jalgor.2003.12.002',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="Two rows of hash table slots with a kick chain of three keys traced by amber arrows, and the measured insertion and cliff numbers">
        {[0, 1].map((t) => (
          <g key={t}>
            <text x="20" y={70 + t * 100} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">T{t + 1}</text>
            {Array.from({ length: 14 }, (_, i) => (
              <rect key={i} x={50 + i * 40} y={52 + t * 100} width="36" height="26" fill={(t === 0 && (i === 3 || i === 9)) || (t === 1 && i === 6) ? 'rgba(93,162,255,0.35)' : 'rgba(154,165,189,0.12)'} stroke="rgba(154,165,189,0.4)" />
            ))}
          </g>
        ))}
        <text x="180" y="70" fill="#e9edf6" fontFamily="ui-medium, ui-monospace, monospace" fontSize="11">a</text>
        <text x="300" y="170" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="11">b</text>
        <text x="420" y="70" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">b lands</text>
        <text x="150" y="36" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">k → h₁(k): occupied by a</text>
        <path d="M 188 82 L 300 150" fill="none" stroke="#f0b94b" strokeWidth="2" />
        <text x="196" y="128" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="10">a kicked to h₂(a)</text>
        <path d="M 316 150 L 428 82" fill="none" stroke="#f0b94b" strokeWidth="2" />
        <text x="352" y="128" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="10">b kicked to h₁(b): empty</text>
        <text x="20" y="214" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="11">lookup: two probes, always (worst measured 2 on 40,000 lookups; chaining 4, linear probing 14 and 318)</text>
        <text x="20" y="234" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">insert: 0.10 / 0.19 / 0.31 / 0.46 / 0.58 / 0.77 kicks at loads 0.1 to 0.49; longest chain 67; no rehash below 0.5</text>
        <text x="20" y="252" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="10">the cliff: 1 rehash by 0.50, 4 by 0.52, gave up at 0.534; without kicks: refused at load 0.075</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'cuckoo_hashing_two_table_eviction_kicks.py',
  Viz: CuckooHashingViz,
  narration,
};
