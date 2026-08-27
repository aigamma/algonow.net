import BloomViz from '../viz/BloomViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/bloom_filter_k_hashes.py?raw';
import { narration } from './bloom-filter-k-hashes.narration.js';

export const content = {
  given:
    'A growing set of n keys, a memory budget of m bits with m far too small to store the keys, and a stream of membership questions.',
  task: 'Answer "have I seen this key?" with no false negatives, and as few false positives as the bits allow.',
  constraint:
    'The budget is absolute: 10,000 keys would need 80 kilobytes to store outright, and you have fifteen. The keys themselves can never be kept.',

  origins: (
    <p>
      Burton Bloom published the structure in <strong>1970</strong>, to gate a
      dictionary: automatic hyphenation handled ninety percent of words by
      simple rules, and the exception list was too big for core memory, so a
      small in-memory filter decided which words were worth a disk seek. That
      shape (a cheap, slightly paranoid gate in front of an expensive exact
      check) is why the idea runs everywhere now: LSM storage engines like
      RocksDB and Cassandra keep one filter per table file to skip files that
      cannot hold the key, CDNs use one to cache only URLs seen twice, and
      Chrome&apos;s malware blocklist shipped for years behind exactly this
      gate.
    </p>
  ),

  algoRole: (
    <p>
      Owns one array and one <strong>invariant</strong>: every hash position
      of every inserted key is set, and nothing is ever unset. A zero at any
      of a key&apos;s positions is therefore <strong>proof of absence</strong>;
      all-ones is only evidence of presence. The structure never stores a
      key, never compares a key, and cannot return one: it holds shadows,
      not members.
    </p>
  ),
  heurRole: (
    <p>
      Decides how many shadows each key casts. Each of the <strong>k</strong>{' '}
      hashes demands one more coincidence before the filter will say yes, so
      raising k buys certainty per query; but each hash also sets another
      bit, so raising k fills the array and manufactures coincidences. The
      two forces cross at <strong>k = (m/n) ln 2</strong>, the value that
      leaves half the bits zero: every bit a fair coin, one full bit of
      information per bit of budget. Here that is 8.3, and k = 8 is measured
      below against both kinds of wrong.
    </p>
  ),

  picture: (
    <p>
      A doorman with a board of 1,200 lightbulbs and no guest list. Each
      guest&apos;s name, fed through the same k scramblers, always lights the
      same k bulbs. When someone claims to have been here before, the
      doorman checks their bulbs: <strong>any dark bulb ends it</strong>,
      because a past visit would have lit all of them. Every bulb lit?
      Probably a regular; possibly an overlap of strangers. Light one bulb
      per guest and the board stays dark but every single coincidence lies.
      Light twenty and the board floods until everyone matches. The working
      doorman keeps the board <strong>half lit</strong>.
    </p>
  ),

  steps: [
    <>
      <strong>Size it:</strong> pick m from your memory budget, then k =
      (m/n) ln 2 for the n you expect. Here: 120,000 bits, k = 8.
    </>,
    <>
      <strong>Insert:</strong> hash the key k independent ways and set those
      k bits. Nothing is ever unset.
    </>,
    <>
      <strong>Query:</strong> read the key&apos;s k positions.{' '}
      <strong>The first zero is a certain no</strong>: stop there.
    </>,
    <>
      All k set: answer yes, and be wrong with probability about fill^k,
      which the sizing pinned near one in three hundred.
    </>,
    <>
      <strong>Watch the fill.</strong> Past design load the filter fails
      silently toward yes; the fix is a rebuild at larger m, never bit
      clearing.
    </>,
  ],

  signals: [
    <>
      You need <strong>membership only</strong>: no values, no listing, no
      retrieval. The keys can stay unstored.
    </>,
    <>
      A false yes is <strong>cheap</strong> (one wasted lookup downstream)
      and a false no is <strong>forbidden</strong>. That asymmetry is the
      whole design.
    </>,
    <>
      The set <strong>only grows</strong>. Churn wants the cuckoo filter;
      frozen sets want XOR.
    </>,
  ],
  baseline: (
    <>
      The exact hash set is the honest baseline: zero lies, full deletion,
      enumeration, everything, at <strong>64+ bits per key</strong> before
      hash-table overhead, more than five times this budget. Inside the
      budget, the same algorithm under a lazy heuristic shows what k is
      worth: at identical memory, k = 1 lies{' '}
      <strong>16,082 times in 200,000</strong> absent queries where k = 8
      lies <strong>653</strong> times, a 25× gap bought purely by asking for
      more coincidences per yes.
    </>
  ),

  strength: (
    <>
      <strong>The no is bulletproof.</strong> False negatives are
      structurally impossible, space is decoupled from key size (a URL and
      an integer cost the same 12 bits), inserts and queries are O(k), and
      two filters over the same universe union by bitwise OR.
    </>
  ),
  weakness: (
    <>
      <strong>It cannot forget, and it fails politely.</strong> Clearing one
      key&apos;s bits takes bystanders with it (the tested solution pins a
      victim), so deletion needs a different structure. And past design load
      there is no error, only decay: at five times load this exact design
      lies <strong>74.6%</strong> of the time.
    </>
  ),

  problem: 'Approximate set membership',
  problemSlug: 'approximate-membership',
  rivals: [
    {
      name: 'Bloom × k hashes',
      isThisUnit: true,
      algoName: 'Bloom filter',
      cost: 'O(k) per op · m bits',
      wins: (
        <>
          <strong>653</strong> lies in 200,000 absent queries at 12 bits per
          key, growing sets welcome, and a zero anywhere is a certain no.
        </>
      ),
      costs: (
        <>
          No deletion, no listing, and saturation is silent: 74.6% lies at
          five times design load.
        </>
      ),
      when: 'Growing sets under tight memory: the gate in front of a slower exact check.',
    },
    {
      name: 'Cuckoo filter',
      cost: 'O(1) per op · 2 buckets',
      wins: (
        <>
          <strong>Deletes cleanly</strong>: 1,000 keys removed, zero
          bystanders harmed (measured). Two bucket reads per query, friendly
          to cache lines.
        </>
      ),
      costs: (
        <>
          Twice the lies at the same 12 bits (<strong>1,245</strong> vs
          653), inserts can fail near full, and eviction needs a max-kick
          bailout.
        </>
      ),
      when: 'Membership with churn: caches and tables where keys leave as well as arrive.',
    },
    {
      name: 'XOR filter',
      cost: '3 probes · 1.23·f bits/key',
      wins: (
        <>
          The space champion: <strong>372</strong> lies at{' '}
          <strong>11.1</strong> bits per key, exactly 2^-9 by construction,
          three probes and two XORs per query.
        </>
      ),
      costs: (
        <>
          Static. Built once from the complete key set by hypergraph
          peeling; one new key means a full rebuild.
        </>
      ),
      when: 'Frozen sets shipped to readers: blocklists, dictionaries, per-file indexes.',
    },
    {
      name: 'Exact hash set',
      algoName: 'Hash table with chaining',
      cost: 'O(1) per op · 64+ bits/key',
      wins: (
        <>
          <strong>Zero</strong> lies, plus everything the filters gave up:
          deletion, enumeration, stored values.
        </>
      ),
      costs: (
        <>
          The keys themselves: five times this budget before any table
          overhead, and growing with key size forever.
        </>
      ),
      when: 'The set fits in memory with room to spare. Approximate is a budget decision, not a default.',
    },
  ],
  neverUse: {
    name: 'A trie of the keys, to save memory',
    why: (
      <>
        A trie&apos;s pointers cost tens of bytes per stored key, so
        &quot;compact&quot; prefix storage lands at <strong>20 to 50 times
        this budget</strong>, to deliver two things nobody asked for:
        exactness the budget explicitly forbids, and prefix queries a
        membership gate never makes. It becomes the right tool the moment
        prefixes are the question (autocomplete, routing tables), and not
        one moment before.
      </>
    ),
  },

  contest: {
    instance:
      '10,000 keys stored in 120,000 bits (15 KB, 12.0 bits per key), then 200,000 absent keys fired at every structure; a false positive is a lie',
    columns: ['false positives', 'bits per key'],
    rows: [
      {
        method: 'Bloom × k = 8',
        isThisUnit: true,
        values: ['653 (0.33%)', '12.0'],
        verdict: 'half the bits set, every bit a fair coin: the budget spent whole',
      },
      {
        method: 'Bloom × k = 1',
        values: ['16,082 (8.04%)', '12.0'],
        verdict: 'one coincidence is one lie: 25× the lies at identical memory',
      },
      {
        method: 'Bloom × k = 20',
        values: ['3,049 (1.52%)', '12.0'],
        verdict: 'too much hashing floods the array: worse than k = 8, same memory',
      },
      {
        method: 'Cuckoo filter',
        values: ['1,245 (0.62%)', '12.0'],
        verdict: 'twice the lies here, but it deletes and reads two buckets',
      },
      {
        method: 'XOR filter',
        values: ['372 (0.19%)', '11.1'],
        best: 0,
        verdict: 'fewest lies, fewest bits, frozen solid at build time',
      },
      {
        method: 'Exact hash set',
        values: ['0', '64+'],
        verdict: 'perfect, and more than five times over the budget',
      },
    ],
    source:
      'python solutions/bloom_filter_k_hashes.py prints this table and asserts zero false negatives across all 10,000 held keys in every structure, measured rates within range of the (1 − e^(−kn/m))^k theory, the k U-curve, cuckoo deletion with zero bystander damage versus the Bloom bit-clearing casualty it pins, and the 74.6% saturation cliff at five times design load.',
  },

  figure: (
    <Figure
      id="fig-bloom-ucurve"
      aspect="16 / 7"
      caption="The heuristic argues with itself. Each extra hash demands one more coincidence before a yes (rate falls like fill^k), but each extra hash also sets more bits (fill rises with k), and past the crossing the second force wins. At 12 bits per key the crossing sits at k = (m/n)·ln 2 ≈ 8.3, where half the bits stay zero. The three marked points are measured, not sketched: 8.04% at k = 1, 0.33% at k = 8, 1.52% at k = 20."
      cite={{
        text: 'Bloom, "Space/Time Trade-offs in Hash Coding with Allowable Errors", Communications of the ACM 13(7), 1970. The optimal-k analysis follows Broder and Mitzenmacher, "Network Applications of Bloom Filters: A Survey", Internet Mathematics 1(4), 2004.',
        href: 'https://doi.org/10.1145/362686.362692',
      }}
    >
      <svg viewBox="0 0 640 300" role="img" aria-label="False-positive rate against k: falling steeply from k equals 1 to a minimum near k equals 8, then rising again toward k equals 20">
        <line x1="60" y1="252" x2="612" y2="252" stroke="#232c40" strokeWidth="1.5" />
        <line x1="60" y1="30" x2="60" y2="252" stroke="#232c40" strokeWidth="1.5" />
        <text x="60" y="20" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="12">false-positive rate · log scale</text>
        <text x="500" y="286" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="12">k, hashes per key</text>
        <text x="80" y="272" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">1</text>
        <text x="292" y="272" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">8</text>
        <text x="576" y="272" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">20</text>
        <path d="M84 58 C 150 150, 220 210, 296 222 C 380 232, 480 205, 580 168" fill="none" stroke="#5da2ff" strokeWidth="2.5" />
        <line x1="304" y1="40" x2="304" y2="252" stroke="#f0b94b" strokeWidth="1.5" strokeDasharray="5 4" />
        <text x="314" y="52" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="12">k = (m/n)·ln 2 ≈ 8.3 · half the bits zero</text>
        <circle cx="84" cy="58" r="5" fill="#e06767" />
        <text x="96" y="56" fill="#e06767" fontFamily="ui-monospace, monospace" fontSize="12">k=1 · 8.04%</text>
        <circle cx="296" cy="222" r="5" fill="#62d98a" />
        <text x="252" y="243" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="12">k=8 · 0.33%</text>
        <circle cx="580" cy="168" r="5" fill="#e06767" />
        <text x="486" y="160" fill="#e06767" fontFamily="ui-monospace, monospace" fontSize="12">k=20 · 1.52%</text>
        <text x="120" y="120" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">more evidence per query →</text>
        <text x="380" y="120" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">← the array floods</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'bloom_filter_k_hashes.py',
  Viz: BloomViz,
  narration,
};
