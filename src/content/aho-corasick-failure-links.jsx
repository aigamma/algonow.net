import AhoCorasickViz from '../viz/AhoCorasickViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/aho_corasick_failure_links.py?raw';
import { narration } from './aho-corasick-failure-links.narration.js';

export const content = {
  given:
    'A dictionary of k patterns and a text of n characters.',
  task: 'Report every occurrence of every pattern, with its identity, in one pass over the text.',
  constraint:
    'One pass means one: the text is consumed forward exactly once, whatever k is. The dictionary may be preprocessed as much as it likes; the text may not.',

  origins: (
    <p>
      Bell Labs, 1975. Margaret Corasick was building a bibliographic
      search system that had to scan literature for thousands of keywords,
      and the projected cost was steep enough that special-purpose hardware
      was on the table. Alfred Aho supplied the algorithm instead: build
      the keyword trie, thread it with failure links, and one pass serves
      the whole dictionary. The paper reports the software outrunning the
      planned hardware, the Unix tool <code>fgrep</code> shipped as exactly
      this automaton, and the same machine now runs where dictionaries are
      largest: intrusion detection (Snort), virus scanning, content
      filters, and DNA panel matching.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>trie, walked</strong>. All k patterns share one
      prefix tree (nodes ≤ total pattern length, asserted), and the text
      drives a cursor through it: each character either extends the
      current path or consults the mismatch machinery. Patterns that end
      at a node, including patterns ending <em>inside</em> other patterns,
      are collected by output links: the classic nest (&quot;ushers&quot;
      containing she, he, hers) is pinned in the tests, position by
      position.
    </p>
  ),
  heurRole: (
    <p>
      Is <a href="/kmp-failure-function/">puzzle 09&apos;s failure
      function</a>, grown up. Every node carries a link to the node of the{' '}
      <strong>longest proper suffix of its string that is also a trie
      prefix</strong>: on a mismatch the automaton slides down that link
      instead of the text backing up, exactly KMP&apos;s move, generalized
      from one pattern to a dictionary (on a one-word trie the two are the
      same machine). The tests verify every link against that definition,
      exhaustively, and the payoff is the contest&apos;s flat row: the
      text pass costs the text, not the dictionary.
    </p>
  ),

  picture: (
    <p>
      A security checkpoint with one guard who has memorized the entire
      watchlist as a decision tree. Names flow past one letter at a time;
      the guard&apos;s finger walks the tree. When a letter breaks the
      current path, the guard never asks the queue to repeat itself: the
      finger slides to the deepest point in the tree that still agrees
      with the letters just seen, because the tree was pre-threaded with
      exactly those shortcuts. One guard, one reading, ten or ten thousand
      names on the list: the queue moves at the same speed.
    </p>
  ),

  steps: [
    <>
      <strong>Build the trie:</strong> insert all k patterns; nodes number
      at most the total pattern length plus one.
    </>,
    <>
      <strong>Thread the links (BFS):</strong> a node&apos;s failure link
      is its parent&apos;s link advanced by the same character: the
      failure function, computed level by level across the whole
      dictionary.
    </>,
    <>
      <strong>Chain the outputs:</strong> each node inherits its failure
      target&apos;s matches, so patterns ending mid-path are never missed.
    </>,
    <>
      <strong>Stream the text:</strong> per character, slide down failure
      links until the character extends a path (amortized: at most 2n
      slides total, asserted), then step forward.
    </>,
    <>
      <strong>Report at every node:</strong> the node&apos;s output list is
      the matches ending here, with pattern identities attached.
    </>,
  ],

  signals: [
    <>
      <strong>Many patterns, one stream:</strong> filters, scanners,
      watchlists: k in the thousands is the design point, not a stretch.
    </>,
    <>
      The dictionary is <strong>stable</strong>: build the automaton once,
      stream texts through it forever.
    </>,
    <>
      Identities matter: you need <em>which</em> pattern hit and{' '}
      <em>where</em>, not a boolean.
    </>,
  ],
  baseline: (
    <>
      The honest baseline runs <a href="/kmp-failure-function/">puzzle
      09</a> once per pattern: correct, streaming, and priced per
      dictionary entry: <strong>5,829,248 steps for 100 patterns</strong>{' '}
      against the automaton&apos;s 95,700, a 61× gap that scales with k by
      construction. The failure link did not get faster here; it got{' '}
      <strong>shared</strong>.
    </>
  ),

  strength: (
    <>
      <strong>The text pass costs the text.</strong> Growing the dictionary
      tenfold moved the automaton&apos;s work from 95,700 to{' '}
      <strong>96,807</strong>: one percent. Never backs up (streams),
      reusable across texts, identities included, and the whole build is
      bounded by the dictionary&apos;s own size.
    </>
  ),
  weakness: (
    <>
      <strong>Memory is the dictionary times the alphabet, and change is a
      rebuild.</strong> Dense byte-alphabet transition tables cost 256
      slots per node (sparse maps trade that against speed); adding one
      pattern re-threads links, so churning dictionaries want other
      machinery; and huge alphabets (Unicode) push implementations toward
      hashed transitions with their own constants.
    </>
  ),

  problem: 'Multiple-pattern search',
  problemSlug: 'multiple-pattern-search',
  rivals: [
    {
      name: 'Aho-Corasick × fail links',
      isThisUnit: true,
      algoName: 'Aho-Corasick',
      cost: 'build Σ|P|, text O(n)',
      wins: (
        <>
          The flat row: <strong>95,700 → 96,807</strong> steps as k grows
          10×. One pass, all identities, nested matches included.
        </>
      ),
      costs: (
        <>
          Automaton memory scales with dictionary × alphabet, and edits to
          the dictionary mean rebuilding the links.
        </>
      ),
      when: 'Stable watchlists over endless streams: scanners, filters, fgrep’s whole reason.',
    },
    {
      name: 'KMP, once per pattern',
      algoName: 'Knuth-Morris-Pratt',
      cost: 'O(k·n)',
      wins: (
        <>
          Zero new machinery if puzzle 09 is already on the shelf, and
          patterns can come and go freely: no shared structure to rebuild.
        </>
      ),
      costs: (
        <>
          Pays the text once <strong>per pattern</strong>: 5,829,248 steps
          at k = 100, and linearly worse forever after.
        </>
      ),
      when: 'A handful of patterns, or dictionaries that churn faster than they are searched.',
    },
    {
      name: 'Rabin-Karp multi-hash',
      algoName: 'Rabin-Karp',
      cost: 'O(n) expected',
      wins: (
        <>
          Also flat in k (<strong>50,040 → 50,176</strong>), from one
          rolling hash and a set lookup: the lightest build on the bench.
        </>
      ),
      costs: (
        <>
          All patterns must share one length (or one pass per length), and
          every hash hit pays a verification: expected-time, not
          guaranteed.
        </>
      ),
      when: 'Fixed-width signatures: chunk hashes, k-mers, shingles: where one length is natural.',
    },
  ],
  neverUse: {
    name: 'A backtracking regex with a thousand alternations',
    why: (
      <>
        <code>p1|p2|…|p1000</code> handed to a backtracking engine is the
        k-pass strategy wearing a convenient syntax: at each text position
        the engine tries alternatives in turn, reproducing the measured
        k·n bill (5.8M steps at k = 100 here) with added risk of
        catastrophic backtracking when patterns overlap. Engines built on
        automata (RE2, Hyperscan) compile alternations into exactly this
        unit&apos;s machine, which is the tell: when the regex is a
        watchlist, the automaton is not an optimization of the regex; it
        is what the regex should have been.
      </>
    ),
  },

  contest: {
    instance:
      'one text of 50,000 characters; work = automaton and comparison steps; the dictionary grows tenfold between the columns (Rabin-Karp rows use single-length dictionaries, its structural requirement)',
    columns: ['100 patterns', '1,000 patterns'],
    rows: [
      {
        method: 'Aho-Corasick',
        isThisUnit: true,
        values: ['95,700', '96,807'],
        best: 1,
        verdict: 'the flat row: ten times the watchlist, one percent the cost',
      },
      {
        method: 'KMP, once per pattern',
        values: ['5,829,248', 'not run (k·n)'],
        verdict: 'puzzle 09 unshared: correct, streaming, and priced per pattern',
      },
      {
        method: 'Rabin-Karp multi-hash',
        values: ['50,040', '50,176'],
        best: 0,
        verdict: 'flat too, and cheapest, inside its one-length-fits-all cage',
      },
    ],
    source:
      'python solutions/aho_corasick_failure_links.py prints this table and asserts the ushers nest exactly (she@1, he@2, hers@2 via output links), every failure link equal to its definition (longest proper suffix present in the trie, checked exhaustively), three matchers plus a slicing referee agreeing on 60 randomized dictionaries, node count bounded by total pattern length, and the text walk within its amortized 2n slide budget.',
  },

  figure: (
    <Figure
      id="fig-ac-links"
      aspect="16 / 7"
      caption="Puzzle 09's failure function, grown into a dictionary. The trie holds he, she, his, hers; dashed amber links point each node to the longest proper suffix of its string that the trie also contains. Reading 'ushers', the cursor rides s→h→e, and the output chain at that node reports both she and the nested he without the text ever stepping back. On a one-word trie these links are exactly KMP's table: same idea, one pattern or ten thousand."
      cite={{
        text: 'Aho and Corasick, "Efficient String Matching: An Aid to Bibliographic Search", CACM 18(6), 1975: the automaton that became fgrep, built to replace special-purpose hardware for literature scanning.',
        href: 'https://doi.org/10.1145/360825.360855',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="A keyword trie for he, she, his, hers with dashed failure links pointing suffixes back into the trie">
        {(() => {
          const nodes = {
            root: [70, 145], h: [190, 90], he: [310, 60], her: [430, 60], hers: [550, 60],
            hi: [310, 130], his: [430, 130], s: [190, 210], sh: [310, 210], she: [430, 210],
          };
          const edges = [
            ['root', 'h', 'h'], ['h', 'he', 'e'], ['he', 'her', 'r'], ['her', 'hers', 's'],
            ['h', 'hi', 'i'], ['hi', 'his', 's'], ['root', 's', 's'], ['s', 'sh', 'h'], ['sh', 'she', 'e'],
          ];
          const fails = [
            ['she', 'he'], ['sh', 'h'], ['hers', 's'], ['his', 's'],
          ];
          const out = new Set(['he', 'she', 'his', 'hers']);
          const els = [];
          for (const [a, b, ch] of edges) {
            const [x1, y1] = nodes[a];
            const [x2, y2] = nodes[b];
            els.push(<line key={`e${a}${b}`} x1={x1 + 14} y1={y1} x2={x2 - 14} y2={y2} stroke="#5da2ff" strokeWidth="1.5" opacity="0.8" />);
            els.push(<text key={`t${a}${b}`} x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 6} textAnchor="middle" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">{ch}</text>);
          }
          for (const [a, b] of fails) {
            const [x1, y1] = nodes[a];
            const [x2, y2] = nodes[b];
            els.push(<path key={`f${a}${b}`} d={`M ${x1} ${y1 + 14} C ${(x1 + x2) / 2} ${Math.max(y1, y2) + 62}, ${(x1 + x2) / 2} ${Math.max(y1, y2) + 62}, ${x2} ${y2 + 14}`} fill="none" stroke="#f0b94b" strokeWidth="1.5" strokeDasharray="5 4" />);
          }
          for (const [name, [x, y]] of Object.entries(nodes)) {
            els.push(<circle key={`n${name}`} cx={x} cy={y} r={14} fill={out.has(name) ? 'rgba(98,217,138,0.15)' : 'rgba(20,26,40,0.9)'} stroke={out.has(name) ? '#62d98a' : '#5da2ff'} strokeWidth="1.5" />);
            els.push(<text key={`l${name}`} x={x} y={y + 4} textAnchor="middle" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="10">{name === 'root' ? '·' : name}</text>);
          }
          return els;
        })()}
        <text x="30" y="272" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="12">dashed: failure links · green ring: a pattern ends here (output links chain the nested ones)</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'aho_corasick_failure_links.py',
  Viz: AhoCorasickViz,
  narration,
};
