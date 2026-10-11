import PrefixTrieViz from '../viz/PrefixTrieViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/longest_prefix_match_trie_lookup.py?raw';
import { narration } from './longest-prefix-match-trie-lookup.narration.js';

export const content = {
  given:
    'A forwarding table of thousands of CIDR prefixes, each with a next hop: a /16 that goes east, a /24 inside it that goes north, a /0 default for everything else. A packet arrives with a 32-bit destination and must leave on the next hop of the LONGEST prefix that covers it, within a few dozen nanoseconds, while routes are announced and withdrawn underneath.',
  task: 'Longest prefix match. The algorithm is the rule: the most specific covering route wins, which lets one entry summarize a block while exceptions inside it stay exact. The heuristic is the trie lookup: store prefixes in a binary tree keyed by address bits, walk the destination one bit per level, remember the last prefix passed, and return it when the walk falls off the tree. The bound is the address width (32 steps), not the table size.',
  constraint:
    'Measured on a seeded table of 2,000 prefixes (570 nested inside a shorter one, 23 distinct lengths) against a scan of every prefix as the referee, on 2,200 destinations: 1,000 random plus the first and last address of 300 prefixes and the addresses just outside them (174 destinations covered by two or more prefixes). The unibit trie: 20,804 nodes, mean depth 17.0, max 32, 0.60 µs per lookup against the scan’s 104.3 µs (173 ×). Stride-8 multibit trie with controlled prefix expansion: 2,047 nodes × 256 entries = 524,032 entries (38,625 of them expansion copies), 2.64 steps mean, max 4, 0.25 µs. Patricia: 3,504 nodes, 10.8 visits, 0.81 µs. Binary search on 23 prefix lengths: 4.7 probes, max 5, 2,620 markers, 0.42 µs. All four equal the referee on every destination, and again after 200 inserts and 200 deletes (20,978 nodes, restored to 20,804). An exact-match hash table missed 1,000 of 1,000 destinations. 0.9 s.',

  origins: (
    <p>
      Donald Morrison&apos;s <strong>PATRICIA</strong> (1968) is the
      path-compressed binary trie; Keith Sklower put a radix tree into the
      BSD kernel in 1991 for the routing table. Classless inter-domain
      routing (Fuller, Li, Yu, Varadhan, RFC 1519, 1993) replaced the fixed
      class A, B, and C sizes with prefixes of any length, so a route lookup
      became a longest-match problem. 1997 was the year of fast lookups:
      Degermark, Brodnik, Carlsson, and Pink compressed a full table into a
      processor cache at Lulea, and Waldvogel, Varghese, Turner, and
      Plattner replaced the bit walk with a binary search over prefix
      lengths. Srinivasan and Varghese (1998) chose multibit strides by
      dynamic programming (controlled prefix expansion); Nilsson and
      Karlsson&apos;s LC-trie (1999) became the Linux forwarding table; line
      cards moved the problem into ternary CAMs that match every prefix at
      once. The trie of puzzle 51 is the data structure; this is the
      problem that made it famous.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>rule</strong>: the most specific covering prefix wins.
      The file enforces it with a scan that checks every prefix and keeps
      the longest match, and uses that scan as the referee on 2,200
      destinations, 174 of them covered by two or more prefixes, where a
      first match or a shortest match would route wrong. Every structure on
      the page returned the referee&apos;s next hop on every destination,
      before and after 200 inserts and 200 deletes.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>bound</strong>. 2,000 prefixes became 20,804 trie
      nodes; a lookup walks a mean of 17.0 bits and never more than 32, at
      0.60 µs where the scan takes 104.3 µs. Widening the walk to a byte per
      level (stride 8) cuts it to 2.64 steps and 0.25 µs at the price of
      524,032 entries; compressing paths (Patricia) cuts the nodes to 3,504.
      The trie does not know how large the table is, only how wide the
      address is.
    </p>
  ),

  picture: (
    <p>
      Dialing from a hotel phone. The switch reads digits one at a time: a
      leading zero leaves the hotel, the next digits name a country, then a
      city, then an exchange, and at each step it remembers the most
      specific destination recognized so far. When the digits stop matching
      anything it knows, the call goes to the last thing recognized. A trie
      is that switchboard built from bits, one board per bit, a note pinned
      wherever a route lives.
    </p>
  ),

  steps: [
    <>
      <strong>Build:</strong> follow each prefix&apos;s bits from the root,
      creating nodes as needed; write the next hop on the node where the
      prefix ends; the default route lives on the root.
    </>,
    <>
      <strong>Look up:</strong> start with the root&apos;s next hop as the
      answer; follow the destination&apos;s bits; whenever a node carries a
      next hop, overwrite the answer; return it when the child is missing.
    </>,
    <>
      <strong>Update:</strong> insert by the same walk; delete by clearing
      the hop and pruning childless, route-less nodes back up the path.
    </>,
    <>
      <strong>Widen or narrow:</strong> read a stride of bits per level and
      expand prefixes into every entry they cover (4 steps, more memory), or
      collapse single-child chains into skip edges (Patricia, less memory).
    </>,
  ],

  signals: [
    <>
      <strong>Keys are prefixes of a fixed-width address</strong> and the
      query is a full address: the answer is the longest key that is a prefix
      of it, which a hash cannot express.
    </>,
    <>
      <strong>Prefixes nest</strong> (570 of 2,000 here) and the exceptions
      must beat the summaries.
    </>,
    <>
      <strong>Time must be bounded by key width, not table size:</strong>{' '}
      hundreds of thousands of routes, 14.88 million packets per second on
      10 GbE.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the <strong>linear scan</strong> that referees
      the page: 2,000 comparisons and 104.3 µs per destination, 173 × the
      trie, and 1,552 × the 67 ns budget of a 10 GbE line card.
    </>
  ),

  strength: (
    <>
      <strong>Bounded by 32 bits, exact, and updatable in place.</strong> Mean
      depth 17.0, max 32, 0.60 µs; equal to the referee on all 2,200
      destinations; 200 inserts and 200 deletes left every answer right and
      undoing them restored exactly 20,804 nodes.
    </>
  ),
  weakness: (
    <>
      <strong>Up to 32 dependent pointer chases and a node per bit.</strong>{' '}
      20,804 nodes for 2,000 routes (about 10 per route); 0.60 µs is 9 × the
      67 ns line-card budget even before C, which is why hardware strides
      and TCAMs exist.
    </>
  ),

  problem: 'Packet forwarding and classification',
  problemSlug: 'packet-forwarding',
  rivals: [
    {
      name: 'Longest prefix match × Trie lookup',
      isThisUnit: true,
      algoName: 'Longest prefix match',
      cost: 'at most 32 bit steps per lookup; one node per prefix bit',
      wins: (
        <>
          <strong>Mean 17.0 steps, max 32</strong>, 0.60 µs against the
          scan&apos;s 104.3; exact on 2,200 destinations before and after
          400 updates.
        </>
      ),
      costs: (
        <>
          20,804 nodes for 2,000 routes; 32 dependent reads in the worst
          case; 9 × the 10 GbE budget in this interpreter.
        </>
      ),
      when: 'The reference structure: tables that change, memory that is cheap enough for a node per bit, and a lookup that must be bounded.',
    },
    {
      name: 'Multibit trie forwarding × Controlled prefix expansion',
      algoName: 'Multibit trie forwarding',
      cost: '32 / stride steps; 2^stride entries per node, prefixes expanded to fill',
      wins: (
        <>
          Stride 8: <strong>2.64 steps, max 4</strong>, 0.25 µs from 2,047
          nodes; the shape line cards use.
        </>
      ),
      costs: (
        <>
          524,032 entries against 41,608 slots, 38,625 of them expansion
          copies that every update must rewrite.
        </>
      ),
      when: 'Lookups are the bottleneck and memory is cheap: every hardware or kernel forwarding table.',
    },
    {
      name: 'Radix tree × Path compression',
      algoName: 'Radix tree',
      cost: 'one node per branch or prefix; a skip comparison per edge',
      wins: (
        <>
          <strong>3,504 nodes against 20,804</strong>, a sixfold cut, 10.8
          visits per lookup; the BSD kernel&apos;s structure since 1991.
        </>
      ),
      costs: (
        <>
          0.81 µs here against the plain walk&apos;s 0.60: the skip
          comparison cost more than the steps it saved; updates re-split
          edges.
        </>
      ),
      when: 'Sparse tables where memory is the constraint and the key width is large.',
    },
    {
      name: 'Trie × Shared-prefix branching',
      algoName: 'Trie',
      cost: 'one step per symbol; exact-key membership',
      wins: (
        <>
          The same walk (puzzle 51) answers <strong>is this key present</strong>{' '}
          and enumerates completions in order.
        </>
      ),
      costs: (
        <>
          Without the last-prefix bookkeeping it cannot say which stored key
          covers a longer query; that one line is this whole page.
        </>
      ),
      when: 'Dictionaries, autocomplete, exact keys; the forwarding problem needs the longest-match variant.',
    },
  ],
  neverUse: {
    name: 'An exact-match hash table, or a scan of the table per packet',
    why: (
      <>
        A hash keyed by the network addresses of all 2,000 prefixes missed{' '}
        <strong>1,000 of 1,000</strong> random destinations: a destination
        equals a prefix&apos;s network address almost never, and a hash
        cannot ask which key is a prefix of mine. The scan answers correctly
        at 2,000 comparisons and 104.3 µs per packet, 1,552 × the 67 ns
        budget of a 10 GbE line card at minimum-size frames, where the trie
        costs 9 budgets and the stride-8 trie 4. Longest match is answered
        in bounded time only by a structure keyed on address bits.
      </>
    ),
  },

  contest: {
    instance:
      '2,000 seeded IPv4 prefixes with a BGP-like length mix (most /16 to /24, a /0 default, a few /32s), 570 nested; 2,200 destinations: 1,000 random plus the bounds and outside neighbours of 300 prefixes; referee: a scan of every prefix keeping the longest match; timings in interpreted Python, ratios being the point',
    columns: ['nodes / entries', 'mean steps (max)', 'µs per lookup', 'equal to referee'],
    rows: [
      {
        method: 'unibit trie (one bit per level)',
        isThisUnit: true,
        values: ['20,804 / 41,608', '17.0 (32)', '0.60', '2,200 of 2,200'],
        verdict: 'bounded by the address width; a node per prefix bit',
      },
      {
        method: 'stride-8 multibit trie, prefix expansion',
        values: ['2,047 / 524,032', '2.64 (4)', '0.25', '2,200 of 2,200'],
        best: 1,
        verdict: 'four steps; twelve times the memory',
      },
      {
        method: 'Patricia (path-compressed) trie',
        values: ['3,504 / 7,008', '10.8 (15)', '0.81', '2,200 of 2,200'],
        best: 0,
        verdict: 'sixfold fewer nodes; the skip check costs time here',
      },
      {
        method: 'binary search on 23 prefix lengths',
        values: ['23 tables / 4,620', '4.7 (5)', '0.42', '2,200 of 2,200'],
        verdict: '2,620 markers; shines for wide keys',
      },
      {
        method: 'linear scan (the referee)',
        values: ['· / 2,000', '2,000 (2,000)', '104.3', '·'],
        verdict: '1,552 line-card budgets per packet',
      },
      {
        method: 'exact-match hash table',
        values: ['· / 2,000', '1 (1)', '·', 'misses 1,000 of 1,000'],
        verdict: 'cannot express a prefix',
      },
    ],
    source:
      'python solutions/longest_prefix_match_trie_lookup.py prints these numbers and asserts: the unibit trie, the stride-8 trie, the Patricia trie, and the length search equal the scan on all 2,200 destinations; no unibit lookup exceeds 32 steps and no stride-8 lookup exceeds 4; the expanded entry count equals the sum over prefixes of 2^(8 − len mod 8) − 1; the Patricia trie has fewer nodes than the unibit trie; after 200 inserts and 200 deletes every answer equals a scan of the changed table and undoing them restores the exact node count; the exact-match table misses every random destination.',
  },

  figure: (
    <Figure
      id="fig-lpm-trie-walk"
      aspect="16 / 7"
      caption="Left: a five-bit trie holding four prefixes (amber: 0/1, 10/2, 1011/4, and the root default) and the walk for destination 10110 (blue): it passes 10/2, then 1011/4, then falls off at the fifth bit, so 1011/4 is the answer (green); a scan would compare all four. Right: the measured cost of one lookup on the 2,000-prefix table, steps (bars) and entries (labels), for the unibit trie, the stride-8 trie, Patricia, binary search on lengths, and the scan."
      cite={{
        text: 'V. Fuller, T. Li, J. Yu, K. Varadhan, "Classless Inter-Domain Routing (CIDR)," RFC 1519, 1993. K. Sklower, "A Tree-Based Packet Routing Table for Berkeley Unix," USENIX Winter 1991. M. Degermark, A. Brodnik, S. Carlsson, S. Pink, "Small Forwarding Tables for Fast Routing Lookups," SIGCOMM 1997, DOI 10.1145/263105.263133. M. Waldvogel, G. Varghese, J. Turner, B. Plattner, "Scalable High Speed IP Routing Lookups," SIGCOMM 1997, DOI 10.1145/263105.263136. V. Srinivasan, G. Varghese, "Fast Address Lookups Using Controlled Prefix Expansion," ACM TOCS 1999.',
        href: 'https://doi.org/10.1145/263105.263136',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="A small binary trie with a highlighted longest-prefix walk, and bars of lookup steps per structure">
        {(() => {
          const nodes = {
            r: [150, 30, 'root /0', true], a0: [80, 75, '0/1', true], a1: [220, 75, '', false],
            b10: [190, 120, '10/2', true], b11: [260, 120, '', false], c101: [205, 165, '', false],
            d1011: [220, 210, '1011/4', true], c110: [250, 165, '', false], d1100: [240, 210, '', false], e11000: [230, 255, '11000/5', true],
          };
          const edges = [['r', 'a0', '0'], ['r', 'a1', '1'], ['a1', 'b10', '0'], ['a1', 'b11', '1'], ['b10', 'c101', '1'], ['c101', 'd1011', '1'], ['b11', 'c110', '0'], ['c110', 'd1100', '0'], ['d1100', 'e11000', '0']];
          const path = new Set(['r', 'a1', 'b10', 'c101', 'd1011']);
          const bars = [['unibit trie', 17.0, '41,608 slots', '#5da2ff'], ['stride-8 trie', 2.64, '524,032 entries', '#f0b94b'], ['Patricia', 10.8, '7,008 slots', '#5da2ff'], ['length search', 4.7, '4,620 keys', '#5da2ff'], ['linear scan', 32, '2,000 compares (2,000 steps)', '#e2606c']];
          const bx = 360;
          return (
            <g fontFamily="ui-monospace, monospace" fontSize="10">
              {edges.map(([u, v, bit]) => {
                const [x1, y1] = nodes[u];
                const [x2, y2] = nodes[v];
                const on = path.has(u) && path.has(v);
                return (
                  <g key={u + v}>
                    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={on ? '#5da2ff' : '#9aa5bd'} strokeWidth={on ? 2.5 : 1} strokeOpacity={on ? 1 : 0.6} />
                    <text x={(x1 + x2) / 2 + (x2 < x1 ? -12 : 6)} y={(y1 + y2) / 2 + 3} fill="#9aa5bd">{bit}</text>
                  </g>
                );
              })}
              {Object.entries(nodes).map(([k, [x, y, label, isPrefix]]) => (
                <g key={k}>
                  <circle cx={x} cy={y} r={k === 'd1011' ? 7 : isPrefix ? 5.5 : 3.5} fill={k === 'd1011' ? '#62d98a' : isPrefix ? '#f0b94b' : path.has(k) ? '#5da2ff' : '#9aa5bd'} />
                  {label && <text x={x + 10} y={y + 4} fill={k === 'd1011' ? '#62d98a' : '#e9edf6'}>{label}</text>}
                </g>
              ))}
              <text x="20" y="20" fill="#9aa5bd">destination 10110: walk 1, 0, 1, 1, then no child for 0</text>
              <text x="20" y="275" fill="#62d98a">answer: 1011/4, the last prefix passed (10/2 and the default were passed earlier)</text>
              <text x={bx} y="20" fill="#9aa5bd">steps per lookup, 2,000-prefix table (measured)</text>
              {bars.map(([label, v, mem, color], i) => {
                const y = 40 + i * 44;
                const w = Math.min(250, (v / 32) * 250);
                return (
                  <g key={label}>
                    <rect x={bx} y={y} width={w} height="16" fill={color} fillOpacity="0.85" />
                    <text x={bx} y={y - 3} fill="#e9edf6">{label}: {v === 32 ? '2,000' : v} steps</text>
                    <text x={bx} y={y + 29} fill="#9aa5bd">{mem}</text>
                  </g>
                );
              })}
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'longest_prefix_match_trie_lookup.py',
  Viz: PrefixTrieViz,
  narration,
};
