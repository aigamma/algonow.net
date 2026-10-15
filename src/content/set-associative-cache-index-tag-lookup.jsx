import SetAssociativeCacheViz from '../viz/SetAssociativeCacheViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/set_associative_cache_index_tag_lookup.py?raw';
import { narration } from './set-associative-cache-index-tag-lookup.narration.js';

export const content = {
  given:
    'A small fast memory in front of a large slow one. Every load and store asks, in one step: is the block holding this address here, and in which slot? When the fast memory is full, which block leaves? One slot per address (direct-mapped) lets addresses that share low bits evict each other forever; comparing every slot never conflicts but costs a comparator per block.',
  task: 'Set-associative cache. The algorithm is the organization: capacity split into S sets of W ways (W blocks each), a block living in any way of exactly one set. The heuristic is the index-tag lookup: cut the address into an offset within the block (the low bits), an index that names the set (the next bits), and a tag (the rest); the index selects one set, and that set\'s W stored tags are compared with the address tag in parallel. W = 1 is direct-mapped; S = 1 is fully associative; two to eight ways capture almost all of the difference.',
  constraint:
    'Measured on a 16 KB cache, 64-byte blocks, 32-bit addresses: 240,000 bit-exact address rebuilds; independent direct-mapped and fully associative LRU references agreeing with the simulator on 206,976 decisions. Three arrays 16 KB apart (192 blocks): one and two ways miss all 6,144 accesses, four ways the 192 first touches. A 128 × 128 matrix walked by columns: 100% misses at 1 to 16 ways, 12.5% fully associative or in 16-row tiles. A Zipf trace (40,000 accesses, 4,096 blocks): conflict misses 2,357, 990, 381, 201, 146, 0 at 1, 2, 4, 8, 16, 256 ways above 3,535 compulsory and 13,328 capacity; Belady\'s floor 10,282. Five blocks cycling through a four-way set: LRU and FIFO miss 10,000 of 10,000, random 4,014.',

  origins: (
    <p>
      Maurice Wilkes proposed the idea in <strong>1965</strong> as a
      &quot;slave memory&quot; close to the processor; the first commercial
      cache shipped in the IBM System/360 Model 85 in 1968 (Liptay 1968),
      and Conti&apos;s 1969 paper named the organizations: direct-mapped,
      fully associative, set-associative. Belady (1966) gave the optimal farthest-next-use
      policy every real cache is measured against. Hill and Smith (1989)
      classified misses as compulsory, capacity, and conflict and quantified
      what each added way buys, while Hill (1988) argued the case for
      direct-mapped caches: the hit time of one comparator. Jouppi&apos;s
      victim cache (1990) and Seznec&apos;s skewed-associative cache (1993)
      buy associativity cheaply. Every processor cache, TLB, and branch
      predictor table since is set-associative.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>organization</strong>: S sets of W ways, every block
      eligible for exactly one set. The referees are two caches written a
      second way (a dictionary from index to tag for W = 1, an ordered
      dictionary of blocks for S = 1), which agree with the simulator on all{' '}
      <strong>206,976</strong> hit-or-miss decisions, and Belady&apos;s optimal
      policy, which no cache of the same capacity can beat. The payoff is the
      three C decomposition on the Zipf trace: with 3,535 compulsory and
      13,328 capacity misses fixed by the trace and the size, the ways buy
      the conflict misses, 2,357 direct-mapped down to 0 fully associative.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>lookup</strong>: cut the address into offset, index,
      and tag, read the one set the index names, compare its W tags in
      parallel. The widths are forced by the geometry (offset log2 of the
      block size, index log2 of the set count, tag the rest), checked by
      rebuilding all <strong>240,000</strong> addresses; each added way moves
      one bit from index to tag and doubles the comparators, 1 to 256 per
      access, with state growing from 3.71% to 6.84% of the data bits. It is
      why a hit takes one cycle and why addresses that agree in their index
      bits fight: three arrays one cache size apart send A[i], B[i], and C[i]
      to the same set, and with one or two ways all 6,144 accesses miss.
    </p>
  ),

  picture: (
    <p>
      A coat check with numbered racks. The ticket&apos;s last digits say
      which rack; the rest is written on a tag on the coat. Direct-mapped is
      one hook per rack: two guests whose tickets end the same way swap coats
      all evening in a half-empty cloakroom. Fully associative is one enormous
      rack and an attendant who reads every tag for every guest. The
      set-associative room has a few hooks per rack: the digits send you to
      the right rack, the attendant reads only its four tags, and the two
      colliding guests each keep a hook. What the hooks cannot fix is a bus
      tour of thirty guests with the same last digits.
    </p>
  ),

  steps: [
    <>
      <strong>Split:</strong> offset = the low log2(block) bits; index = the
      next log2(sets) bits; tag = the rest (18, 8, 6 direct-mapped; 20, 6, 6
      at four ways; 26, 0, 6 fully associative).
    </>,
    <>
      <strong>Select:</strong> read the one set the index names: W tags, W
      valid bits, W data blocks.
    </>,
    <>
      <strong>Compare:</strong> all W tags against the address tag at once; a
      valid match is a hit and its way selects the data.
    </>,
    <>
      <strong>Miss:</strong> fill an empty way, else evict by the set&apos;s
      policy (LRU, pseudo-LRU, FIFO, random) and install the tag.
    </>,
    <>
      <strong>Size the ways:</strong> stop when the conflict residue no longer
      pays for the comparators (381, 201, 146, 0 misses against 4, 8, 16, 256
      comparators here).
    </>,
  ],

  signals: [
    <>
      <strong>A fixed fast store in front of a slow one, with locality:</strong>{' '}
      processor caches, TLBs, branch target buffers, bucketed software caches.
    </>,
    <>
      <strong>A lookup that must finish in one step:</strong> the index
      narrows the search to a handful of slots, so only W comparisons happen.
    </>,
    <>
      <strong>A few colliding streams:</strong> arrays or stacks whose
      addresses share low bits (power-of-two spacing); two to four ways absorb
      them.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the <strong>direct-mapped cache</strong>: one
      way, one comparator, the fastest hit. Measured: 48.05% misses against
      43.11% at four ways on the Zipf trace, and 6,144 of 6,144 against 192
      on three arrays one cache size apart.
    </>
  ),

  strength: (
    <>
      <strong>A few ways erase most conflict misses.</strong> 2,357 to 381 at
      four ways on the Zipf trace (84% gone), 6,144 to 192 on the aligned
      arrays, with 4 comparators instead of 256; direct-mapped at N misses
      about like two-way at N/2 (ratio 0.893), the rule of thumb, measured.
    </>
  ),
  weakness: (
    <>
      <strong>Ways do not fix a stride.</strong> The 128 × 128 column walk
      aims every block of a column at the same few sets and misses 100% at 2
      to 16 ways; only full associativity or a 16-row tile reaches 12.5%.
      Inside a set, LRU loses to random when five blocks cycle through four
      ways (10,000 misses against 4,014), and each way costs a comparator, a
      tag bit, hit latency, and energy.
    </>
  ),

  problem: 'Cache organization',
  problemSlug: 'cache-organization',
  rivals: [
    {
      name: 'Set-associative cache × Index-tag lookup',
      isThisUnit: true,
      algoName: 'Set-associative cache',
      cost: 'one set read, W tag compares in parallel',
      wins: (
        <>
          <strong>Conflict misses 2,357 to 381</strong> at four ways; 6,144 to
          192 on three aligned arrays; one-cycle hits with 4 comparators.
        </>
      ),
      costs: (
        <>
          A power-of-two stride still thrashes at 16 ways (100% on the column
          walk); each way adds a comparator and a tag bit.
        </>
      ),
      when: 'Every hardware cache and most software ones: the default.',
    },
    {
      name: 'Victim cache',
      algoName: 'Victim cache',
      cost: 'direct-mapped hit time plus a small fully associative buffer',
      wins: (
        <>
          Keeps the one-comparator fast path and catches the lines just
          evicted; Jouppi (1990) measured one to five entries removing a large
          share of a small direct-mapped cache&apos;s conflict misses.
        </>
      ),
      costs: (
        <>
          A second lookup on the miss path and a swap; a few entries cannot
          hold a column walk&apos;s 128 blocks.
        </>
      ),
      when: 'A latency-critical first-level cache with a few colliding streams.',
    },
    {
      name: 'Skewed-associative cache',
      algoName: 'Skewed-associative cache',
      cost: 'W tag compares, one hash per way',
      wins: (
        <>
          Each way indexes with a different hash, so blocks that collide in one
          way scatter in the others; Seznec (1993) measured two skewed ways
          behaving like four conventional ones.
        </>
      ),
      costs: (
        <>
          Hash logic on the critical path, no clean set for LRU to order,
          harder to verify.
        </>
      ),
      when: 'Strided or power-of-two patterns that defeat plain indexing, when more ways are too expensive.',
    },
    {
      name: 'Loop tiling',
      algoName: 'Loop tiling',
      cost: 'a restructured loop, tile size tuned to the cache',
      wins: (
        <>
          The software fix: the column walk in 16-row tiles misses{' '}
          <strong>12.5%</strong> even direct-mapped, where 2 to 16 ways all
          missed 100%.
        </>
      ),
      costs: (
        <>
          You must own the loop and re-tune the tile per cache and stride; it
          does nothing for traces you did not write.
        </>
      ),
      when: 'Matrix and stencil code where associativity cannot reach: change the access order, not the cache.',
    },
  ],
  neverUse: {
    name: 'A direct-mapped cache under streams spaced a cache size apart',
    why: (
      <>
        Three arrays of 512 doubles, their bases exactly 16 KB apart, and the
        loop C[i] = A[i] + B[i]. The data is 192 blocks and the cache holds
        256, so everything fits; yet A[i], B[i], and C[i] have identical index
        bits, every access evicts the block the next one needs, and the
        direct-mapped cache misses <strong>6,144 of 6,144</strong> accesses
        over four passes: 100% on data that fits. Two ways change nothing
        (three lines cycling through two slots still miss every time), and a
        32 KB direct-mapped cache leaves A and C colliding at 67.7%. Four
        ways miss the 192 first touches and nothing else. Avoid power-of-two
        spacing when you lay out data, and one way when you cannot control
        the layout.
      </>
    ),
  },

  contest: {
    instance:
      'a 16 KB cache, 64-byte blocks, 32-bit addresses; traces: a 64 KB sweep, three 4 KB arrays 16 KB apart (four passes), a 128 × 128 matrix by rows, columns, and 16-row tiles, a Zipf trace (40,000 accesses, 4,096 blocks); referees: 240,000 bit-exact address rebuilds, independent references agreeing on 206,976 decisions, Belady optimal as the floor, the three C decomposition',
    columns: ['three arrays, 16 KB apart', 'column walk', 'Zipf misses', 'Zipf conflict misses', 'comparators per access'],
    rows: [
      {
        method: 'direct-mapped (1 way)',
        values: ['100% (6,144 of 6,144)', '100%', '48.05%', '2,357 (5.89%)', '1'],
        verdict: 'the baseline: fastest hit, worst conflicts',
      },
      {
        method: '2-way set-associative',
        values: ['100%', '100%', '44.63%', '990 (2.48%)', '2'],
        verdict: 'three lines in two ways still ping-pong',
      },
      {
        method: '4-way set-associative',
        isThisUnit: true,
        values: ['3.12% (192 first touches)', '100%', '43.11%', '381 (0.95%)', '4'],
        best: 3,
        verdict: 'most of the benefit for four comparators',
      },
      {
        method: '8-way set-associative',
        values: ['3.12%', '100%', '42.66%', '201 (0.50%)', '8'],
        verdict: 'diminishing returns begin',
      },
      {
        method: 'fully associative (256 ways, LRU)',
        values: ['3.12%', '12.5%', '42.16%', '0', '256'],
        verdict: 'no conflicts, 256 comparators per access',
      },
      {
        method: 'Belady optimal, fully associative',
        values: ['3.12%', '12.5%', '25.70%', '·', '·'],
        verdict: 'the floor: knows the future',
      },
      {
        method: 'direct-mapped + 16-row loop tiling',
        values: ['·', '12.5%', '·', '·', '1'],
        verdict: 'the software fix for the stride',
      },
    ],
    source:
      'python solutions/set_associative_cache_index_tag_lookup.py prints this table and asserts: 240,000 bit-exact address rebuilds; the simulator equal to both references on 206,976 decisions; Belady missing no more than any configuration; misses equal to compulsory plus capacity plus conflict, conflict zero when fully associative; one miss per block on the sweep and row walk; the three arrays missing all 6,144 at one and two ways and 192 at four; the column walk at 100% for 1 to 16 ways and 12.5% fully associative or tiled; Zipf conflict misses strictly falling to four ways, under a quarter of direct-mapped; LRU at or below FIFO and random; the N to two-way N/2 ratio between 0.8 and 1.25; the five-block cycle missing every access under LRU and FIFO but not random; tags 18 and 26 bits.',
  },

  figure: (
    <Figure
      id="fig-set-associative-split"
      aspect="16 / 7"
      caption="Left: one 32-bit address cut three ways for a 16 KB cache with 64-byte blocks; each doubling of the ways moves one bit from the index (amber, the set selector) to the tag (blue, compared in every way). Right: Zipf conflict misses by associativity, above the compulsory and capacity misses no organization of this size removes: four ways remove 84% of them with 4 comparators; the last 381 cost 252 more."
      cite={{
        text: 'M. D. Hill and A. J. Smith, "Evaluating associativity in CPU caches," IEEE Transactions on Computers 38(12), 1989, DOI 10.1109/12.40842. A. J. Smith, "Cache memories," ACM Computing Surveys 14(3), 1982, DOI 10.1145/356887.356892. J. L. Hennessy and D. A. Patterson, Computer Architecture: A Quantitative Approach, appendix B.',
        href: 'https://doi.org/10.1109/12.40842',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="Tag, index, and offset fields of a 32-bit address at one, four, and 256 ways, beside a bar chart of Zipf conflict misses falling from 2,357 to zero">
        {(() => {
          const splits = [['direct-mapped', 18, 8], ['4-way', 20, 6], ['fully associative', 26, 0]];
          const conflicts = [['1', 2357], ['2', 990], ['4', 381], ['8', 201], ['16', 146], ['256', 0]];
          const x0 = 20;
          const per = 290 / 32;
          const cx = 350;
          const cy = 236;
          const slot = 45;
          return (
            <g fontFamily="ui-monospace, monospace" fontSize="10">
              <text x={x0} y="20" fill="#9aa5bd">32-bit address: tag | index | offset</text>
              {splits.map(([label, tag, index], r) => {
                const y = 44 + r * 64;
                const sets = index > 0 ? 1 << index : 1;
                return (
                  <g key={label}>
                    <text x={x0} y={y - 6} fill="#e9edf6">{label}: {tag} + {index} + 6 bits</text>
                    <rect x={x0} y={y} width={tag * per} height="22" fill="#5da2ff" fillOpacity="0.85" />
                    {index > 0 && <rect x={x0 + tag * per} y={y} width={index * per} height="22" fill="#f0b94b" fillOpacity="0.9" />}
                    <rect x={x0 + (tag + index) * per} y={y} width={6 * per} height="22" fill="#9aa5bd" fillOpacity="0.5" />
                    <text x={x0 + 4} y={y + 15} fill="#0b1020">tag {tag}</text>
                    {index > 0 && <text x={x0 + tag * per + 4} y={y + 15} fill="#0b1020">idx {index}</text>}
                    <text x={x0 + (tag + index) * per + 3} y={y + 15} fill="#0b1020">off</text>
                    <text x={x0} y={y + 36} fill="#9aa5bd" fontSize="9">{sets} sets, {256 / sets} comparators</text>
                  </g>
                );
              })}
              <text x={cx} y="20" fill="#9aa5bd">Zipf trace: conflict misses by ways</text>
              <line x1={cx} y1={cy} x2={cx + 270} y2={cy} stroke="#9aa5bd" strokeOpacity="0.6" />
              {conflicts.map(([label, v], i) => {
                const h = Math.max((v / 2357) * 170, 3);
                const x = cx + i * slot + 8;
                return (
                  <g key={label}>
                    <rect x={x} y={cy - h} width={slot - 16} height={h} fill={v === 0 ? '#62d98a' : '#e2606c'} fillOpacity="0.85" />
                    <text x={x + (slot - 16) / 2} y={cy - h - 5} fill="#e9edf6" fontSize="9" textAnchor="middle">{v.toLocaleString()}</text>
                    <text x={x + (slot - 16) / 2} y={cy + 13} fill="#9aa5bd" fontSize="9" textAnchor="middle">{label}</text>
                  </g>
                );
              })}
              <text x={cx} y={cy + 28} fill="#9aa5bd" fontSize="9">ways; compulsory/capacity misses unchanged</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'set_associative_cache_index_tag_lookup.py',
  Viz: SetAssociativeCacheViz,
  narration,
};
