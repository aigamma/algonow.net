import ShardingViz from '../viz/ShardingViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/sharding_hash_partitioning.py?raw';
import { narration } from './sharding-hash-partitioning.narration.js';

export const content = {
  given:
    'One table that no longer fits one machine: a billion rows of users, orders, or events, more writes per second than one disk absorbs, and a product that must keep looking like one database. Split it across N shards so that every key has one home, every lookup goes to one machine, the load stays even, and the cluster can grow.',
  task: 'Sharding. The algorithm is the split: a partition function from key to shard that every router computes identically, and a layout in which each shard holds exactly its keys and nothing else. The heuristic is hash partitioning: shard = h(key) mod N with a deterministic hash. The hash scatters neighbors, so the load is as even as a multinomial allows, no directory is needed, and a lookup is one hash and one modulo. The price is a layout that knows nothing about order: a range scan touches every shard, a hot key stays hot, and changing N re-homes almost everything.',
  constraint:
    'Measured with a 64-bit BLAKE2 digest as the hash: over 100 key sets of 20,000 keys on 16 shards the chi-square statistic averaged 15.06 ± 0.55 against the multinomial’s 15, the per-shard standard deviation 33.7 against 34.2, the heaviest shard 1.089 × the mean at worst. 100,000 keys each found on exactly one shard (loads 6,122 to 6,390 around 6,250) at 0.34 µs per route. Growing 16 shards to 17 under modulo re-homed 94.18% of the keys (theory 16/17 = 94.12%), against 6.37% on a consistent-hashing ring with 100 virtual nodes and 5.96% under jump consistent hash (theory 1/17 = 5.88%), every one of those onto the new node; doubling to 32 moved 49.93%, each mover to shard s + 16. The hottest key of a Zipf workload took 8.3% of 200,000 requests and put its shard at 2.58 × the mean; salting the 13 keys above a tenth of a shard’s mean load brought it to 1.19. A scan of 1,000 consecutive keys touched 1.01 shards under range partitioning and 16 under hashing; the last 10,000 time-ordered inserts landed 100% on one range shard and 7.0% on the busiest hash shard. 2.3 s.',

  origins: (
    <p>
      Teradata&apos;s DBC/1012 (1984) spread rows across its processors by
      a hash of the primary index, and David DeWitt&apos;s Gamma machine
      (1986) made hash partitioning the default of the parallel database
      literature; Michael Stonebraker&apos;s{' '}
      <strong>&quot;The Case for Shared Nothing&quot;</strong> (1986) argued
      that machines sharing neither memory nor disk, each owning a slice of
      the data, were the architecture that scales. The web took the idea
      without the research: application-level sharding of MySQL by user id
      carried Flickr, LiveJournal, and Facebook through the 2000s. Karger,
      Lehman, Leighton, Panigrahy, Levine, and Lewin (1997) introduced
      consistent hashing for exactly the modulo&apos;s weakness, the move
      cost of changing N, and Amazon&apos;s Dynamo (DeCandia et al., 2007)
      made it the default of key-value stores. Google&apos;s Bigtable (2006)
      and Spanner (Corbett et al., 2012) chose range partitioning with
      dynamic splits instead, and Lamping and Veach (2014) published jump
      consistent hash, the move cost of a ring with no ring to store.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>contract</strong>: one home per key, computed the
      same way by every router, and a layout in which each shard stores
      exactly its keys. The file inserts 100,000 keys, finds every one on
      its home shard and on no other, and times the route at{' '}
      <strong>0.34 µs</strong>. The contract is what makes growth
      expensive: whatever moves when N changes must move physically, so
      the move fraction is the bill. Modulo pays 94.2% at 16 to 17 and
      exactly half when doubling, each mover to s + 16; the ring and jump
      hash pay about 1/17, every mover onto the newcomer.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>spread</strong>. A good hash makes the loads a
      multinomial: chi-square 15.06 against 15, per-shard spread 33.7
      against 34.2, the heaviest of 1,600 shard loads 1.089 × the mean. No
      directory, no coordination, no hot tail on time-ordered inserts
      (7.0% of the last 10,000 on the busiest shard against 100% under
      ranges). What it cannot do is split a key: the hottest Zipf key alone
      took 8.3% of traffic against a shard&apos;s 6.25% share, so its
      shard sat at <strong>2.58 × the mean</strong> until the key was
      salted into 16 sub-keys.
    </p>
  ),

  picture: (
    <p>
      A post office with sixteen counters and no queue manager: every
      envelope carries a number, and the counter is the number modulo
      sixteen. Nobody consults anyone, the lines stay even, and a customer
      who knows the rule walks straight to the right window. Then a
      seventeenth counter opens, the rule becomes modulo seventeen, and
      sixteen of every seventeen envelopes already sorted are in the wrong
      pigeonhole. A ring instead hands the newcomer one seventeenth of the
      mail and leaves the rest where it lies. And one celebrity who
      receives a twelfth of all the city&apos;s letters will jam a counter
      under any rule that reads only the name on the envelope.
    </p>
  ),

  steps: [
    <>
      <strong>Hash:</strong> h = a deterministic 64-bit digest of the key
      (never a per-process salted hash); shard = h mod N.
    </>,
    <>
      <strong>Route:</strong> every client and router computes the same
      shard and talks to it directly; a key lookup is one machine.
    </>,
    <>
      <strong>Scatter-gather:</strong> a range scan or a query on a non-key
      attribute fans out to all N shards and merges.
    </>,
    <>
      <strong>Grow:</strong> rehash under the new N and move the keys whose
      shard changed (N/(N + 1) of them), or pre-split into many logical
      shards and move whole shards to new machines.
    </>,
  ],

  signals: [
    <>
      <strong>Point lookups by key dominate</strong> and the key is known
      at query time: one hash, one machine.
    </>,
    <>
      <strong>No one needs order across keys:</strong> scans by time or by
      prefix are rare or served elsewhere.
    </>,
    <>
      <strong>N is stable, or logical shards outnumber machines</strong>{' '}
      so that growth moves whole shards instead of rehashing keys.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>range partitioning on the same key</strong>:
      a scan of 1,000 consecutive keys touched 1.01 shards against the
      hash&apos;s 16, and the last 10,000 time-ordered inserts landed 100%
      on one shard against 7.0% under hashing.
    </>
  ),

  strength: (
    <>
      <strong>Even by the multinomial, directory-free, one lookup per key.</strong>{' '}
      Chi-square 15.06 against 15 over 100 key sets, heaviest shard 1.089
      × the mean at worst, 0.34 µs per route, and no hot tail under
      sequential inserts.
    </>
  ),
  weakness: (
    <>
      <strong>Blind to order and to N.</strong> Every range scan touches all
      16 shards; growing 16 to 17 re-homes 94.2% of the data (9.42 TB of a
      10 TB cluster) where a ring moves 0.60 TB; a hot key sits on one
      shard at 2.58 × the mean until someone salts it.
    </>
  ),

  problem: 'Sharding and partitioning',
  problemSlug: 'sharding',
  rivals: [
    {
      name: 'Sharding × Hash partitioning',
      isThisUnit: true,
      algoName: 'Sharding',
      cost: 'one hash and one modulo per route; N/(N + 1) of the data moved per added shard',
      wins: (
        <>
          <strong>Loads a multinomial</strong> (chi-square 15.06 against 15,
          heaviest 1.089 × mean), 0.34 µs per route, no directory, 7.0% tail
          share under time-ordered inserts.
        </>
      ),
      costs: (
        <>
          16 shards per range scan; 94.2% of keys re-homed at 16 → 17; a hot
          key at 2.58 × mean until salted.
        </>
      ),
      when: 'Point lookups by key, no cross-key order, and a shard count that changes rarely or by moving whole logical shards.',
    },
    {
      name: 'Sharding × Range partitioning',
      algoName: 'Sharding',
      cost: 'a boundary table per route; splits and merges as ranges grow',
      wins: (
        <>
          A 1,000-key scan touched <strong>1.01 shards</strong> against 16;
          neighbors stay together, so prefix and time queries read one
          machine.
        </>
      ),
      costs: (
        <>
          Time-ordered inserts put 100% of the last 10,000 writes on one
          shard; balance needs dynamic splitting (Bigtable, Spanner).
        </>
      ),
      when: 'Scans and prefix queries matter, keys are not monotone, or the system splits hot ranges on its own.',
    },
    {
      name: 'Consistent hashing × Virtual nodes',
      algoName: 'Consistent hashing',
      cost: 'a sorted ring of N × V points and a binary search per route',
      wins: (
        <>
          Adding the 17th node moved <strong>6.37%</strong> of the keys,
          every one onto the newcomer; loads 5,290 to 7,113 around 5,882
          with 100 virtual nodes.
        </>
      ),
      costs: (
        <>
          Rougher balance than modulo (1.21 × mean here; 2.1 to 5.4 × with
          one point per node); still 16 shards per scan.
        </>
      ),
      when: 'Nodes come and go: caches, Dynamo-style stores, anything that grows one machine at a time.',
    },
    {
      name: 'Jump consistent hash',
      algoName: 'Jump consistent hash',
      cost: 'about ln N iterations of one multiply, no table',
      wins: (
        <>
          Growing 16 to 17 buckets moved <strong>5.96%</strong> against the
          theory&apos;s 5.88%, all into bucket 16; nothing to store or
          replicate.
        </>
      ),
      costs: (
        <>
          Buckets are numbered 0 to N − 1, so only the last bucket can be
          removed; no weighting without a wrapper.
        </>
      ),
      when: 'The shard count only grows or shrinks at the end, and every client must agree with no shared state.',
    },
  ],
  neverUse: {
    name: 'A bare modulo on a growing cluster, or a hash that is not one',
    why: (
      <>
        Partitioning <code>user:&lt;id&gt;</code> by its last digit left{' '}
        <strong>6 of 16 shards empty</strong> and the busiest at 1.62 × the
        mean: ten digits cannot fill sixteen bins, and any field with
        structure (length, prefix, a timestamp) does the same. And a correct
        hash does not save the modulo from growth: 16 to 17 shards re-homed
        94.18% of 100,000 keys, 9.42 TB of a 10 TB cluster over the wire,
        where the ring moved 0.60 TB and jump hash 0.60 TB. Pre-split into
        hundreds of logical shards, or hash onto a ring, before the first
        machine is added.
      </>
    ),
  },

  contest: {
    instance:
      '16 shards; 100 random key sets of 20,000 keys for balance; 100,000 keys for routing and growth to 17 and 32 shards; a ring with 100 virtual nodes and jump consistent hash as the growth rivals; 200,000 Zipf requests over 100,000 keys for skew; 1,000 range scans of 1,000 consecutive ids and the last 10,000 of 1,000,000 time-ordered ids for the range comparison',
    columns: ['heaviest / mean', 'moved, 16 → 17', 'shards per 1,000-key scan', 'tail share, last 10,000 inserts'],
    rows: [
      {
        method: 'hash partitioning, h(key) mod N',
        isThisUnit: true,
        values: ['1.09 worst of 100 sets', '94.2%', '16', '7.0%'],
        verdict: 'even and directory-free; the add is the bill',
      },
      {
        method: 'range partitioning (static boundaries)',
        values: ['·', '·', '1.01', '100%'],
        best: 2,
        verdict: 'one shard per scan; the tail shard takes every write',
      },
      {
        method: 'consistent hashing, 100 virtual nodes',
        values: ['1.21 after the add', '6.4%', '16', '·'],
        best: 1,
        verdict: 'one seventeenth moves, onto the newcomer only',
      },
      {
        method: 'jump consistent hash',
        values: ['·', '6.0%', '16', '·'],
        verdict: 'the ring’s move cost with no ring to store',
      },
      {
        method: 'last digit of the key',
        values: ['1.62, 6 shards empty', '·', '·', '·'],
        verdict: 'not a hash',
      },
    ],
    source:
      'python solutions/sharding_hash_partitioning.py prints these numbers and asserts: the chi-square mean over 100 key sets within three standard errors of N − 1 and the per-shard spread within 15% of sqrt(n/N (1 − 1/N)), the heaviest load under a five-sigma bound; every key found on its home shard and on no other; the modulo move fraction within 0.005 of N/(N + 1) at 16 → 17 and within 0.012 at 4, 8, and 32; doubling moves half and only to s + N; every ring and jump move lands on the new node with fractions within 0.02 and 0.005 of 1/(N + 1); the hottest Zipf key exceeds a shard’s mean load and its shard is the heaviest; salting cuts the heaviest shard below 1.25 × mean; range scans touch under 1.1 shards against all 16; the hot tail is 100% against under 10%; the last-digit scheme leaves exactly 6 shards empty.',
  },

  figure: (
    <Figure
      id="fig-sharding-move-cost"
      aspect="16 / 7"
      caption="Left: the fraction of keys re-homed when one shard joins, against the shard count: modulo (amber curve, N/(N + 1); measured dots at 4, 8, 16, 32 shards) against a consistent-hashing ring or jump consistent hash (blue, 1/(N + 1); measured at 16). Right: a Zipf workload on 16 shards, loads as multiples of the mean: the hottest key alone (8.3% of traffic) puts its shard at 2.58 × (red); salting the 13 hottest keys into 16 sub-keys each flattens it to 1.19 × (green)."
      cite={{
        text: 'M. Stonebraker, "The Case for Shared Nothing," IEEE Database Engineering Bulletin 9(1), 1986. D. Karger, E. Lehman, T. Leighton, R. Panigrahy, M. Levine, D. Lewin, "Consistent Hashing and Random Trees," STOC 1997, DOI 10.1145/258533.258660. G. DeCandia et al., "Dynamo: Amazon\'s Highly Available Key-value Store," SOSP 2007, DOI 10.1145/1294261.1294281. J. C. Corbett et al., "Spanner: Google\'s Globally-Distributed Database," OSDI 2012. J. Lamping, E. Veach, "A Fast, Minimal Memory, Consistent Hash Algorithm," 2014.',
        href: 'https://doi.org/10.1145/258533.258660',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="Fraction of keys moved when a shard is added, modulo against consistent hashing, and the hot-key skew before and after salting">
        {(() => {
          const x0 = 48;
          const y0 = 230;
          const pw = 250;
          const ph = 180;
          const X = (n) => x0 + ((n - 2) / 30) * pw;
          const Y = (f) => y0 - f * ph;
          const ns = [];
          for (let n = 2; n <= 32; n += 1) ns.push(n);
          const mod = ns.map((n) => `${X(n)},${Y(n / (n + 1))}`).join(' ');
          const ring = ns.map((n) => `${X(n)},${Y(1 / (n + 1))}`).join(' ');
          const dots = [[4, 0.804], [8, 0.896], [16, 0.942], [32, 0.969]];
          const bx = 360;
          const by = 230;
          const before = [0.97, 1.02, 2.58, 0.99, 1.0, 0.96, 1.05, 0.93, 1.01, 0.98, 0.9, 1.03, 0.95, 1.0, 0.94, 1.02];
          const after = [1.01, 1.05, 1.19, 0.98, 1.04, 0.95, 1.07, 0.96, 1.02, 0.99, 0.92, 1.06, 0.97, 1.03, 0.93, 1.0];
          const BY = (v) => by - (v / 2.8) * 170;
          return (
            <g>
              <line x1={x0} y1={y0} x2={x0 + pw} y2={y0} stroke="#9aa5bd" strokeOpacity="0.6" />
              <line x1={x0} y1={y0 - ph} x2={x0} y2={y0} stroke="#9aa5bd" strokeOpacity="0.6" />
              <polyline points={mod} fill="none" stroke="#f0b94b" strokeWidth="2" />
              <polyline points={ring} fill="none" stroke="#5da2ff" strokeWidth="2" />
              {dots.map(([n, f]) => <circle key={n} cx={X(n)} cy={Y(f)} r="3.5" fill="#f0b94b" />)}
              <circle cx={X(16)} cy={Y(0.0637)} r="3.5" fill="#5da2ff" />
              <circle cx={X(16)} cy={Y(0.0596)} r="2.5" fill="#e9edf6" />
              {[2, 8, 16, 24, 32].map((n) => <text key={n} x={X(n) - 6} y={y0 + 14} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">{n}</text>)}
              {[0, 0.25, 0.5, 0.75, 1].map((f) => <text key={f} x={x0 - 34} y={Y(f) + 3} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">{f}</text>)}
              <text x={x0} y="22" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">fraction of keys moved when shard N + 1 joins</text>
              <text x={x0} y="36" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="10">amber: modulo, N/(N+1); 94.2% at 16</text>
              <text x={x0} y="50" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="10">blue: ring or jump hash, 1/(N+1); 6.4% and 6.0% at 16</text>
              <text x={x0 + 120} y={y0 + 28} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">shards before the add</text>
              <text x={bx} y="22" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">Zipf traffic on 16 shards, load / mean</text>
              <text x={bx} y="36" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="10">red: the hottest key&apos;s shard, 2.58 x</text>
              <text x={bx} y="50" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="10">green: after salting 13 keys, 1.19 x</text>
              <line x1={bx} y1={BY(1)} x2={bx + 256} y2={BY(1)} stroke="#9aa5bd" strokeDasharray="4 3" />
              {before.map((v, i) => (
                <rect key={`b${i}`} x={bx + i * 16} y={BY(v)} width="7" height={by - BY(v)} fill={i === 2 ? '#e2606c' : '#f0b94b'} fillOpacity="0.85" />
              ))}
              {after.map((v, i) => (
                <rect key={`a${i}`} x={bx + i * 16 + 7} y={BY(v)} width="7" height={by - BY(v)} fill={i === 2 ? '#62d98a' : '#5da2ff'} fillOpacity="0.7" />
              ))}
              <text x={bx + 36} y={BY(2.58) - 4} fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="9">2.58</text>
              <text x={bx + 60} y={BY(1.19) - 4} fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="9">1.19</text>
              <text x={bx} y={by + 14} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">16 shards; dashed line = mean load</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'sharding_hash_partitioning.py',
  Viz: ShardingViz,
  narration,
};
