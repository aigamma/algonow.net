import TrieViz from '../viz/TrieViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/trie_shared_prefix_branching.py?raw';
import { narration } from './trie-shared-prefix-branching.narration.js';

export const content = {
  given:
    'A growing dictionary of strings: this page uses the site’s own 2,551-word vocabulary.',
  task: 'Lookups priced by the key’s length, never the dictionary’s size: and “everything starting with al-” as a walk, not a scan.',
  constraint:
    'The prefix regime is the whole reason: a hash set answers membership beautifully and then must scan all 2,551 words to autocomplete anything: 510,200 touches for 200 queries, measured, against the trie’s 11,239.',

  origins: (
    <p>
      The idea is telegraph-old (de la Briandais 1959); Fredkin named it
      in 1960: &quot;trie&quot; from re<em>trie</em>val, pronounced
      &quot;tree&quot; by its author and &quot;try&quot; by everyone
      avoiding ambiguity. Morrison&apos;s PATRICIA (1968) compressed the
      chains; the structure then quietly became infrastructure: IP
      routers longest-prefix-match on binary tries, autocomplete lives
      here, and this site&apos;s own Aho-Corasick unit is a trie that
      grew failure links. The T9 keypad generation typed every text
      message through one.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>edge-labeled tree</strong>: one character per
      edge, one node per <em>distinct prefix</em>: an identity this page
      asserts exactly (7,892 nodes = 7,891 prefixes + the root). Keys
      mark their end nodes; a lookup walks the key&apos;s characters and
      visits precisely len(key)+1 nodes: asserted per lookup, and
      asserted <em>unchanged</em> when the dictionary grows from 300
      words to 2,551. And a depth-first walk emits the dictionary{' '}
      <em>in sorted order</em>, asserted: radix ordering for free.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>sharing</strong>. Every inserted key rides
      the existing tree as far as any earlier key has paved it,
      branching only where it becomes novel: &quot;algorithm&quot; and
      &quot;algonow&quot; share four nodes, not zero. The economics are
      measured: 2,551 words totaling ~16,000 characters compress to
      7,892 nodes: and 59% of those are single-child chains, which is
      precisely the fat the radix tree&apos;s path compression trims
      (its card below).
    </p>
  ),

  picture: (
    <p>
      A library&apos;s card catalog drawer for words. The hash set is a
      valet with perfect memory for exact questions: &quot;is
      &apos;algorithm&apos; here?&quot;: instant: and no memory at all
      for neighborhoods: ask for &quot;everything under AL-&quot; and
      the valet must inspect every card in the building. The trie is
      the drawer itself: walk to A, then L, and everything below your
      fingertip <em>is</em> the answer: the neighborhood is a place,
      not a search. Sharing is why the drawer is small: every word
      starting AL- files under the same two tabs.
    </p>
  ),

  steps: [
    <>
      <strong>Insert:</strong> walk the key&apos;s characters, reusing
      existing edges, creating nodes only where the key becomes novel;
      mark the end.
    </>,
    <>
      <strong>Lookup:</strong> the same walk: len(key)+1 visits,
      exactly, at any dictionary size (asserted).
    </>,
    <>
      <strong>Prefix query:</strong> walk the prefix, then enumerate
      the subtree: cost = len(prefix) + the answer&apos;s own size.
    </>,
    <>
      <strong>Sorted output free:</strong> DFS in child order == the
      sorted dictionary (asserted).
    </>,
    <>
      <strong>Compress when it matters:</strong> the measured 59% chain
      nodes are the radix tree&apos;s entire pitch.
    </>,
  ],

  signals: [
    <>
      <strong>Prefixes are the query:</strong> autocomplete, IP
      longest-prefix routing, spell-check neighborhoods: the regime
      hashes cannot enter.
    </>,
    <>
      <strong>The dictionary grows online:</strong> inserts are the same
      walk as lookups: the sorted array&apos;s static excellence (see
      the bench) ends at its first insertion.
    </>,
    <>
      <strong>Per-character guarantees wanted:</strong> len(key)+1,
      exactly: no hashing constants, no log n, no luck: and the
      foundation Aho-Corasick builds on.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the <strong>sorted list with bisect</strong>
      : on a static vocabulary it is excellent: 200 prefix queries cost
      it 4,800 comparison-visits to the trie&apos;s 11,239, and its
      answers are C-speed slices. This page&apos;s referee is exactly
      that structure, and the verdict is honest: <em>for a frozen
      dictionary, bisect wins</em>. The trie&apos;s regime begins where
      static ends: online inserts, per-char bounds, and automaton
      construction.
    </>
  ),

  strength: (
    <>
      <strong>Size-independent lookups, neighborhoods as places, and
      structure that composes.</strong> len(key)+1 visits asserted flat
      across a 8.5× size jump; prefix answers priced by their own size;
      nodes = prefixes + 1 and DFS = sorted, both asserted; and the
      same skeleton underlies radix routers, ternary search trees, and
      the live Aho-Corasick automaton.
    </>
  ),
  weakness: (
    <>
      <strong>Memory fat, cache-hostile, and honestly beaten by bisect
      on static data.</strong> 59% of nodes are single-child chains
      (measured): the naive trie pays a node per character down long
      unshared tails: pointer-chasing per character is the B-tree
      unit&apos;s cache lesson in miniature: and the frozen-dictionary
      case belongs to the sorted array. Radix compression and ternary
      search trees exist precisely for the first two.
    </>
  ),

  problem: 'String-keyed dictionaries and tries',
  problemSlug: 'string-key-dictionary',
  rivals: [
    {
      name: 'Trie × shared-prefix branching',
      isThisUnit: true,
      algoName: 'Trie',
      cost: 'O(|key|) everything',
      wins: (
        <>
          <strong>len(key)+1 visits, exactly, at any size</strong>{' '}
          (asserted flat); prefix queries priced by their answers;
          sorted DFS free.
        </>
      ),
      costs: (
        <>
          59% chain-node fat (measured), a pointer per character, and
          the static case honestly lost to bisect.
        </>
      ),
      when: 'Dynamic string sets with prefix queries: autocomplete engines, router tables, automaton foundations.',
    },
    {
      name: 'Radix tree × path compression',
      algoName: 'Radix tree',
      cost: 'O(|key|), compressed',
      wins: (
        <>
          Erases exactly the measured fat: the 4,628 single-child
          chains collapse into labeled edges: same asymptotics, ~59%
          fewer nodes here.
        </>
      ),
      costs: (
        <>
          Edge labels complicate every operation&apos;s inner loop:
          split-on-mismatch bookkeeping the plain trie never does.
        </>
      ),
      when: 'Memory-serious deployments: IP routing tables (as PATRICIA), kernel data structures, big vocabularies.',
    },
    {
      name: 'Hash table with chaining',
      algoName: 'Hash table with chaining',
      cost: 'O(|key|) expected membership',
      wins: (
        <>
          The membership champion: one hash, one bucket: simpler and
          usually faster than any walk for exact questions.
        </>
      ),
      costs: (
        <>
          <strong>510,200 touches</strong> for 200 prefix queries,
          measured: neighborhoods require scanning everything:
          structurally, not by tuning.
        </>
      ),
      when: 'Exact membership only: the moment prefixes enter the requirements, the regime changes.',
    },
    {
      name: 'Aho-Corasick × failure links',
      algoName: 'Aho-Corasick',
      cost: 'O(n + matches)',
      wins: (
        <>
          The trie, graduated: add failure links and the dictionary
          scans <em>streams</em> in one pass: a live unit built
          literally on this page&apos;s structure.
        </>
      ),
      costs: (
        <>
          Construction and memory beyond the plain trie; a different
          question (search text, not store keys).
        </>
      ),
      when: 'Multi-pattern scanning: where the dictionary stops being stored and starts hunting.',
    },
  ],
  neverUse: {
    name: 'Hash-scan autocomplete',
    why: (
      <>
        Serving &quot;starts with al-&quot; from a hash set means
        scanning the entire dictionary per keystroke:{' '}
        <strong>510,200 element touches for 200 queries</strong> here,
        against the trie&apos;s 11,239 (45×): and the scan&apos;s bill
        grows with the <em>dictionary</em> while the walk&apos;s grows
        with the <em>answer</em>. At autocomplete scale (millions of
        keys, a query per keystroke) that asymmetry is the entire
        product. Choosing a structure is choosing which questions are
        cheap: the hash chose membership, and no amount of hardware
        unchoosing it makes prefixes free.
      </>
    ),
  },

  contest: {
    instance:
      "this site's own vocabulary: 2,551 words, avg 6.4 chars; 2,000 lookups + 200 prefix queries; referee: bisect ranges over the sorted list agreed on all 20,000 mixed shadow ops",
    columns: ['2,000 lookups', '200 prefix queries'],
    rows: [
      {
        method: 'Trie',
        isThisUnit: true,
        values: ['14,700 visits', '11,239 visits'],
        best: 0,
        verdict: 'len+1 exactly, size-independent; prefix = walk + answer',
      },
      {
        method: 'Sorted list + bisect',
        values: ['~154,000 char-cmps', '4,800 visits'],
        verdict: 'the honest rival: wins static prefix queries outright',
      },
      {
        method: 'Hash set',
        values: ['~12,800 char-hashes', '510,200 scans'],
        verdict: 'membership champion; neighborhoods cost everything',
      },
    ],
    source:
      "python solutions/trie_shared_prefix_branching.py prints this table and asserts: 20,000 shadow-refereed mixed operations (inserts, hit/miss lookups, prefix queries equal to bisect ranges); the flat-cost theorem (lookup visits == len(key)+1, identical at 300 and 2,551 words); the structural identities (nodes == distinct prefixes + 1 == 7,892; DFS == sorted vocabulary); the chain fraction 59% measured for the radix sibling; and the prefix ledger (trie 11,239 vs bisect 4,800 vs hash-scan 510,200).",
  },

  figure: (
    <Figure
      id="fig-trie-sharing"
      aspect="16 / 7"
      caption="One node per distinct prefix: the identity is the structure. 'algo', 'algorithm', and 'algonow' share their first four nodes; novelty alone pays for new ones (asserted: 7,892 nodes = 7,891 distinct prefixes + the root). A lookup's cost is its own length: the dictionary's size never appears in the formula: and the measured 59% single-child chains are exactly what the radix tree's path compression erases."
      cite={{
        text: 'Fredkin, "Trie Memory", CACM 3(9), 1960 (the name, from retrieval); de la Briandais 1959 for the idea; Morrison\'s PATRICIA 1968 for the compressed form that routes the internet.',
        href: 'https://doi.org/10.1145/367390.367400',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="A trie sharing the prefix a-l-g-o across three words">
        {[['a', 90], ['l', 170], ['g', 250], ['o', 330]].map(([ch, x], i) => (
          <g key={i}>
            <circle cx={x} cy={120} r="15" fill="rgba(240,185,75,0.18)" stroke="#f0b94b" strokeWidth="1.6" />
            <text x={x} y={125} fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="13" textAnchor="middle">{ch}</text>
            {i < 3 && <line x1={x + 15} y1={120} x2={x + 65} y2={120} stroke="#f0b94b" strokeWidth="1.4" />}
          </g>
        ))}
        <text x="150" y="88" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">shared: paid once, used by all</text>
        {[['r', 410, 60], ['n', 410, 120], ['$', 410, 180]].map(([ch, x, y], i) => (
          <g key={i}>
            <line x1="345" y1="120" x2={x - 15} y2={y} stroke="#5da2ff" strokeWidth="1.2" />
            <circle cx={x} cy={y} r="13" fill="rgba(93,162,255,0.15)" stroke="#5da2ff" strokeWidth="1.4" />
            <text x={x} y={y + 4} fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="12" textAnchor="middle">{ch}</text>
          </g>
        ))}
        <text x="440" y="56" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">→ …ithm  ("algorithm")</text>
        <text x="440" y="124" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">→ …ow   ("algonow")</text>
        <text x="440" y="184" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">"algo" ends here</text>
        <text x="60" y="232" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="12">nodes = distinct prefixes + 1 (asserted: 7,892) · lookup visits = len(key)+1, at any size</text>
        <text x="60" y="256" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">DFS reads the drawer in order: the sorted vocabulary, free (asserted)</text>
        <text x="60" y="278" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">59% of nodes are single-child chains: the radix tree’s pitch, measured</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'trie_shared_prefix_branching.py',
  Viz: TrieViz,
  narration,
};
