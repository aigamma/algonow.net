import LinearProbingViz from '../viz/LinearProbingViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/open_addressing_linear_probing.py?raw';
import { narration } from './open-addressing-linear-probing.narration.js';

export const content = {
  given:
    'A hash table that must answer lookups in nanoseconds: tens of thousands of integer keys, memory that is fast only when it is touched in order, and a load that will drift toward full unless someone decides when to resize.',
  task: 'Open addressing. The algorithm stores every key in the slot array itself, no linked nodes, no pointers: hash the key to a home slot and, if it is taken, probe other slots in a fixed sequence until the key or an empty slot appears. The heuristic is linear probing (Amdahl, Boehme, Rochester, and Samuel on the IBM 701, 1954; analyzed by Knuth in 1963): probe the next slot, then the next, wrapping around. The probe sequence is a contiguous run of memory, so the second and later probes almost always sit in the cache line the first probe already fetched. The price is primary clustering: runs of occupied slots merge, and the expected probes grow as (1 + 1/(1 − α))/2 for a hit and (1 + 1/(1 − α)²)/2 for a miss at load α.',
  constraint:
    'Measured on a 65,536-slot table with random 40-bit keys and Fibonacci hashing, a Python set shadowing 1,200,000 mixed operations across six structures: Knuth’s 1963 formulas hold within 1% at loads 0.25 to 0.7 (hits 1.164, 1.509, 2.172 against 1.167, 1.500, 2.167; misses 1.397, 2.510, 5.971 against 1.389, 2.500, 6.056), within 8% at 0.9 (5.962 and 50.434 against 5.5 and 50.5), and within 11% at 0.95 (11.609 and 205.6 against 10.5 and 200.5). At load 0.9, a hit costs linear probing 5.315 probes but 1.540 cache lines, against 2.570 probes and 2.570 lines for double hashing, 2.850 and 1.951 for quadratic probing, 2.450 and 2.450 for separate chaining; the longest cluster is 715 slots and the probe variance 277 (maximum 612), where Robin Hood hashing keeps the same mean 5.315 with variance 19.8 and a maximum of 29. Deleting half the keys of a 70%-full table leaves a miss at 5.864 probes under tombstones and 1.698 under backward-shift deletion. A weak hash on 2,048 consecutive keys costs linear probing 1,056 probes per hit against 8.3 for double hashing.',

  origins: (
    <p>
      Gene Amdahl, Elaine Boehme, Nathaniel Rochester, and Arthur Samuel
      used linear probing on the IBM 701 in <strong>1954</strong>, the
      first open-addressing scheme; Peterson named open addressing in
      1957. Donald Knuth&apos;s unpublished 1963 note, &quot;Notes on open
      addressing,&quot; derived the formulas measured on this page, the
      first analysis of an algorithm he ever did, and later said it was
      what drew him to the analysis of algorithms; Flajolet, Poblete, and
      Viola (1998) found the exact distribution. Celis, Larson, and Munro
      (1985) proposed Robin Hood hashing to tame the variance; Pagh and
      Rodler (2001) offered cuckoo hashing (puzzle 134); Pagh, Pagh, and
      Ružić (2007) proved linear probing needs 5-independent hashing to
      keep its guarantees, and Thorup and Zhang showed why simple hashes
      sometimes fail it. Linear probing is the layout of Google&apos;s
      Swiss tables, Rust&apos;s hashbrown, and most high-performance hash
      maps today, precisely because of the cache line.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>layout</strong>: one flat array, the key in the slot
      itself, a home slot from the hash, and a probe sequence to resolve
      collisions, with deletion by tombstone or by shifting. The referee is
      a Python set shadowing every operation: 1,200,000 inserts, lookups,
      and deletes across six structures, every lookup answer and every
      final size matching. The cost of the layout is counted two ways,
      slot probes and distinct 64-byte cache lines (8 slots per line),
      because the second number is the one the hardware charges: at load
      0.9 a hit touches <strong>1.540 lines</strong> here against 2.570
      for double hashing and 2.450 for chaining, one line per node.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>probe sequence</strong>: the next slot, then the
      next. It makes the lines-per-hit number and it makes the clustering:
      Knuth&apos;s formulas, measured within 1% to load 0.7, say a miss costs
      6 probes at 0.7, 50 at 0.9, and 200 at 0.95, and the longest run of
      occupied slots grows from 85 to 752 to 3,250 over the same loads.
      Hits cost <strong>5.315 probes at 0.9 against 2.570</strong> for
      double hashing, which is why every linear-probing table resizes
      before 0.9, and why Robin Hood&apos;s reordering (same mean 5.315,
      variance 19.8 against 277) and backward-shift deletion (1.698
      against 5.864 after deleting half) are the two fixes worth knowing.
    </p>
  ),

  picture: (
    <p>
      Parking on a long street where every car has a preferred spot. When
      yours is taken you roll forward to the next free one, which is
      usually a few feet away, so you never need the map again. But full
      blocks join into longer blocks, and once the street is nine-tenths
      full a driver can roll past fifty cars before finding a gap. The
      street still beats a parking garage with pointers to each level,
      because rolling forward is nearly free; the trick is to add a street
      before the blocks merge, and when a car leaves, to roll the cars
      behind it back so no gap lies about what is ahead.
    </p>
  ),

  steps: [
    <>
      <strong>Hash:</strong> a strong mix (here the Fibonacci multiplier,
      top bits) to a home slot in a power-of-two table.
    </>,
    <>
      <strong>Probe:</strong> slot h, h + 1, h + 2, ... wrapping; stop at
      the key (hit), at an empty slot (miss or insert here), never at a
      tombstone.
    </>,
    <>
      <strong>Delete:</strong> leave a tombstone (cheap, but misses keep
      paying for it), or shift the cluster back (backward-shift deletion:
      the miss cost of the live load only).
    </>,
    <>
      <strong>Resize:</strong> when the load passes roughly 0.7 to 0.85
      (live plus tombstones), rebuild into a larger array; a miss at 0.95
      costs 200 probes.
    </>,
    <>
      <strong>Check the hash:</strong> a weak hash that maps nearby keys
      to nearby slots turns clusters into one run (1,056 probes per hit
      here); linear probing forgives nothing about the hash.
    </>,
  ],

  signals: [
    <>
      <strong>Memory latency is the cost:</strong> small fixed-size keys,
      lookups that miss the cache, a hot path measured in nanoseconds.
    </>,
    <>
      <strong>You control the load:</strong> you can resize at 0.7 to 0.85
      and can afford a strong hash; the formulas tell you exactly what each
      load costs.
    </>,
    <>
      <strong>Iteration and compactness matter:</strong> one flat array to
      scan, copy, or serialize; no allocator in the loop.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>separate chaining</strong>: a list per
      bucket. Fewer probes (2.450 against 5.315 at load 0.9) and a miss
      that costs 1.923, but one cache line per node (2.450 lines against
      1.540) and an allocation per key.
    </>
  ),

  strength: (
    <>
      <strong>The cheapest probes in the machine, with a formula for the
      price.</strong> 1.540 cache lines per hit at load 0.9 against 2.570
      and 2.450; Knuth&apos;s 1963 formulas within 1% to load 0.7; one flat
      array; the layout of every fast hash map of the last decade.
    </>
  ),
  weakness: (
    <>
      <strong>Clusters, tombstones, and an unforgiving hash.</strong> 5.315
      probes against 2.570 at load 0.9 and 205 per miss at 0.95; a
      variance of 277 and a longest run of 715 slots; tombstones that keep
      the miss cost of the old load (5.864 against 1.698); and 1,056
      probes per hit under a weak hash where double hashing pays 8.3.
    </>
  ),

  problem: 'Hash collision resolution',
  problemSlug: 'hash-collision-resolution',
  rivals: [
    {
      name: 'Open addressing × Linear probing',
      isThisUnit: true,
      algoName: 'Open addressing',
      cost: 'O(1) expected; one flat array',
      wins: (
        <>
          <strong>1.540 cache lines per hit</strong> at load 0.9; Knuth&apos;s
          formulas measured; no allocation, no pointers.
        </>
      ),
      costs: (
        <>
          5.315 probes and clusters of 715 at 0.9; resize early; hash well.
        </>
      ),
      when: 'Small keys, a hot path, and control over load and hash: the default fast map.',
    },
    {
      name: 'Hash table with chaining',
      algoName: 'Hash table with chaining',
      cost: 'O(1) expected; a node per key',
      wins: (
        <>
          2.450 probes per hit and 1.923 per miss at 0.9; graceful past
          load 1; deletion is trivial; a weak hash costs 403, not 1,056.
        </>
      ),
      costs: (
        <>
          One cache line per node (2.450 lines against 1.540); an
          allocation per insert.
        </>
      ),
      when: 'Large or variable-size values, loads you cannot bound, or a hash you do not trust.',
    },
    {
      name: 'Robin Hood hashing',
      algoName: 'Robin Hood hashing',
      cost: 'linear probing plus a displacement per slot',
      wins: (
        <>
          The same mean (5.315) with variance 19.8 against 277 and a
          longest probe of 29 against 612; misses stop early (5.644 against
          47.975).
        </>
      ),
      costs: (
        <>
          Swaps during insertion; a stored displacement; the same clusters.
        </>
      ),
      when: 'Linear probing’s layout with a tail you can bound: latency-sensitive maps.',
    },
    {
      name: 'Cuckoo hashing',
      algoName: 'Cuckoo hashing',
      cost: 'two hashes; at most two probes per lookup',
      wins: (
        <>
          Worst-case constant lookups: two slots, always; no clusters at
          all.
        </>
      ),
      costs: (
        <>
          Insertion kicks that can cascade and force a rehash; a load limit
          near 0.5 with two tables.
        </>
      ),
      when: 'Lookups vastly outnumber inserts and the worst case must be two probes.',
    },
  ],
  neverUse: {
    name: 'Linear probing with a hash that keeps neighbors neighbors',
    why: (
      <>
        Keys 1,000,000 to 1,001,999, consecutive, into a 4,096-slot table at
        load 0.5 with a hash that keeps only the key&apos;s high bits, so
        1,024 consecutive keys share one home slot. Linear probing turns
        them into one run of 2,048 occupied slots and a hit costs{' '}
        <strong>1,056 probes</strong>, against 1.50 with a strong hash;
        double hashing with the same weak hash pays 8.3, because its stride
        differs per key and the collisions never merge; chaining pays 403,
        one bucket of a thousand. Every table with sequential or structured
        keys and a cheap hash is this case waiting to happen, and the
        5-independence result of Pagh, Pagh, and Ružić says why: linear
        probing needs a hash that scatters nearby keys, or it gets exactly
        what it was given.
      </>
    ),
  },

  contest: {
    instance:
      'a 65,536-slot table at load 0.9 (58,982 random 40-bit keys, Fibonacci hashing), a lookup for every key and 5,000 misses; one currency: slot probes, and distinct 64-byte cache lines touched (8 slots per line; one line per node for chaining); referee: Knuth’s 1963 formulas at six loads and a Python set shadowing 200,000 mixed operations per structure',
    columns: ['probes / hit', 'probes / miss', 'lines / hit', 'variance', 'longest probe'],
    rows: [
      {
        method: 'linear probing',
        isThisUnit: true,
        values: ['5.315', '47.975', '1.540', '277', '612'],
        best: 2,
        verdict: 'the fewest lines, the longest tail',
      },
      {
        method: 'Robin Hood hashing',
        values: ['5.315', '5.644', '1.540', '19.8', '29'],
        verdict: 'same mean, tenth of the variance',
      },
      {
        method: 'quadratic probing',
        values: ['2.850', '12.055', '1.951', '16.2', '92'],
        verdict: 'clusters broken, lines half kept',
      },
      {
        method: 'double hashing',
        values: ['2.570', '10.056', '2.570', '11.1', '68'],
        verdict: 'the fewest probes among open schemes; every probe a new line',
      },
      {
        method: 'separate chaining',
        values: ['2.450', '1.923', '2.450', '0.5', '9'],
        verdict: 'the baseline; a line per node',
      },
    ],
    source:
      'python solutions/open_addressing_linear_probing.py prints this table and asserts: measured hits and misses within 6% of Knuth’s formulas to load 0.8 and within 20% at 0.9 and 0.95; 1,200,000 mixed operations across six structures all matching a Python set, with final sizes matching; linear probing touching fewer cache lines per hit than double hashing and chaining while paying more probes than double hashing; Robin Hood’s mean hit cost equal to linear probing’s to 1e-9 with less than half its variance; the longest cluster at load 0.95 more than twenty times the one at 0.25; tombstone deletion costing more than 2.5 times backward shift per miss, each within 15% of the formula for its effective load; and the weak hash costing linear probing more than a hundred times the strong-hash formula and more than five times double hashing.',
  },

  figure: (
    <Figure
      id="fig-linear-probing-knuth"
      aspect="16 / 7"
      caption="Left: expected probes against load factor for a hit (solid) and a miss (dashed): Knuth's 1963 curves with the measured points on top of them, the miss curve passing 50 at load 0.9 and 200 at 0.95. Right: the longest run of occupied slots at each load, the primary clustering that the formulas describe, from 8 slots at a quarter full to 3,250 at 95%."
      cite={{
        text: 'D. E. Knuth, "Notes on open addressing," unpublished memorandum, 1963; The Art of Computer Programming, vol. 3, section 6.4. G. M. Amdahl, E. M. Boehme, N. Rochester, and A. L. Samuel, IBM 701 programming notes, 1954. A. Pagh, R. Pagh, and M. Ružić, "Linear probing with constant independence," STOC 2007, DOI 10.1145/1250790.1250839.',
        href: 'https://doi.org/10.1145/1250790.1250839',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="Knuth's hit and miss probe curves against load with measured points, and a bar chart of the longest occupied run at six loads">
        {(() => {
          const x0 = 44;
          const y0 = 230;
          const pw = 280;
          const ph = 180;
          const X = (a) => x0 + (a / 1) * pw;
          const Y = (v) => y0 - (Math.log10(v) / Math.log10(300)) * ph;
          const hit = (a) => 0.5 * (1 + 1 / (1 - a));
          const miss = (a) => 0.5 * (1 + 1 / (1 - a) ** 2);
          const pts = (f) => Array.from({ length: 96 }, (_, i) => 0.01 + i * 0.01).map((a) => `${X(a)},${Y(f(a))}`).join(' ');
          const measured = [[0.25, 1.164, 1.397], [0.5, 1.509, 2.51], [0.7, 2.172, 5.971], [0.8, 3.027, 12.655], [0.9, 5.962, 50.434], [0.95, 11.609, 205.639]];
          const clusters = [[0.25, 8], [0.5, 31], [0.7, 85], [0.8, 209], [0.9, 752], [0.95, 3250]];
          const bx = 390;
          const by = 230;
          return (
            <g>
              <line x1={x0} y1={y0} x2={x0 + pw} y2={y0} stroke="#9aa5bd" strokeOpacity="0.6" />
              <polyline points={pts(hit)} fill="none" stroke="#5da2ff" strokeWidth="2" />
              <polyline points={pts(miss)} fill="none" stroke="#f0b94b" strokeWidth="2" strokeDasharray="5 3" />
              {measured.map(([a, h, m]) => (
                <g key={a}>
                  <circle cx={X(a)} cy={Y(h)} r="3.5" fill="#e9edf6" />
                  <circle cx={X(a)} cy={Y(m)} r="3.5" fill="#e9edf6" />
                </g>
              ))}
              {[0.25, 0.5, 0.75, 1].map((a) => <text key={a} x={X(a) - 8} y={y0 + 14} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">{a}</text>)}
              {[1, 10, 100].map((v) => <text key={v} x={x0 - 26} y={Y(v) + 3} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">{v}</text>)}
              <text x={x0} y="22" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">probes vs load (log): blue hit, amber miss, dots measured</text>
              <text x={x0} y={y0 + 30} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">at 0.9: 5.96 hit, 50.4 miss; at 0.95: 11.6 and 205.6</text>
              <text x={bx} y="22" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">longest occupied run by load (log)</text>
              {clusters.map(([a, c], i) => {
                const h = (Math.log10(c) / Math.log10(4000)) * 170;
                return (
                  <g key={a}>
                    <rect x={bx + i * 38} y={by - h} width="26" height={h} fill={a >= 0.9 ? '#e2606c' : '#5da2ff'} fillOpacity="0.85" />
                    <text x={bx + i * 38 - 2} y={by - h - 4} fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="9">{c.toLocaleString()}</text>
                    <text x={bx + i * 38} y={by + 12} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="8">{a}</text>
                  </g>
                );
              })}
              <text x={bx} y={by + 30} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">65,536 slots; resize before the red</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'open_addressing_linear_probing.py',
  Viz: LinearProbingViz,
  narration,
};
