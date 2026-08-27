import PagerankViz from '../viz/PagerankViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/pagerank_damped_walk.py?raw';
import { narration } from './pagerank-damped-walk.narration.js';

export const content = {
  given:
    'A directed graph of n pages and their links, complete with dead ends, closed loops, and pages built purely to deceive.',
  task: 'Assign every page a score measuring how important the link structure makes it.',
  constraint:
    'The scores must mean something: a probability distribution that the graph itself justifies, stable under recomputation, and not free to hand out for anyone who can mint pages.',

  origins: (
    <p>
      Stanford, 1996. Larry Page and Sergey Brin&apos;s BackRub crawler needed
      to order its index, and the insight was to treat a link as a vote
      weighted by the voter&apos;s own importance: a recursion, resolved by
      the century-old power method. The name is a pun on its author. Their
      1998 paper fixed the damping factor at <strong>0.85</strong>, a
      folklore number the field still uses; Stanford&apos;s patent stake
      eventually sold for about $336 million. The same years produced the
      road not taken: Jon Kleinberg&apos;s <strong>HITS</strong> (hubs and
      authorities, JACM 1999) powered IBM&apos;s Clever prototype, and Lempel
      and Moran&apos;s <strong>SALSA</strong> repaired its famous failure.
      All three are measured against each other below.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>iteration</strong>. Importance is defined recursively
      (a page is important if important pages link it), and power iteration
      resolves the recursion: start uniform, repeatedly let every page split
      its current score along its out-links, and the vector converges to the
      principal eigenvector of the link matrix. Each round is one pass over
      the edges, a matrix-vector product, which is why the computation
      shards across a datacenter as naturally as it fits in sixty lines.
    </p>
  ),
  heurRole: (
    <p>
      Repairs the walk&apos;s theology. With probability d = 0.85 the surfer
      follows a random out-link; with probability 0.15 it{' '}
      <strong>teleports to a uniformly random page</strong>. That one dial
      buys four things at once: the chain becomes irreducible and aperiodic,
      so a unique answer <em>exists</em>; the error contracts by a factor d
      per pass, so the iteration count is known before starting (82 here);
      spider traps drain instead of absorbing (2.7% versus 84.7% measured);
      and the score acquires a meaning: the long-run attention share of a
      reader whose patience runs about 1/(1−d) ≈ 7 clicks.
    </p>
  ),

  picture: (
    <p>
      Follow one distractible reader forever. They click links at random,
      and every seventh click or so they get bored and jump to a completely
      random page. A page&apos;s importance is the share of eternity this
      reader spends on it. Now watch the pathology the boredom fixes: a
      cluster of pages that link only each other is a roach motel, and a
      purely link-following reader who wanders in never leaves, so the motel
      eventually owns all of eternity. The bored reader escapes on the next
      teleport, every time. Boredom is not a bug in the model; it is the
      guarantee.
    </p>
  ),

  steps: [
    <>
      <strong>Start uniform:</strong> every page holds 1/n.
    </>,
    <>
      <strong>Pass:</strong> each page splits its score equally along its
      out-links; a dead end&apos;s score is spread uniformly over all pages.
    </>,
    <>
      <strong>Damp:</strong> new score = 0.15/n + 0.85 × (received mass).
      The vector stays a probability distribution to the last decimal.
    </>,
    <>
      <strong>Repeat</strong> until total movement drops below tolerance.
      Error shrinks by 0.85 per pass, so the budget is known in advance:
      82 passes to 10⁻⁸ here.
    </>,
    <>
      <strong>Read:</strong> the fixed point is the stationary distribution
      of the damped walk, verified against an exact linear solve in the
      tested solution.
    </>,
  ],

  signals: [
    <>
      You need <strong>global, query-independent</strong> importance, one
      number per node, comparable across the whole graph.
    </>,
    <>
      The graph is <strong>hostile or messy</strong>: dead ends, closed
      loops, and pages minted to game the ranking are the normal case.
    </>,
    <>
      The computation must <strong>shard</strong>: one matrix-vector product
      per pass is the shape MapReduce was literally demonstrated on.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the <strong>in-degree count</strong>: one pass,
      no iteration, and on an honest graph it is a fine proxy. Its failure
      is priced below: 100 sock pages crown their target{' '}
      <strong>#1 by in-degree</strong>, for free, while under PageRank the
      same farm lifts the target only to ninth, from 1,690th, at the cost
      of minting 100 whole pages whose only asset is their teleport floor.
      Dilution, not immunity; the difference between them is the entire
      anti-spam industry.
    </>
  ),

  strength: (
    <>
      <strong>Guaranteed on any graph, at a known price.</strong> Existence
      and uniqueness from the damping dial, convergence in
      log(ε)/log(d) passes (82 measured), traps drained (2.7% vs 84.7%),
      farms diluted (9th vs 1st), and each pass is one shardable
      matrix-vector product.
    </>
  ),
  weakness: (
    <>
      <strong>Global, iterative, and topic-blind.</strong> Eighty-two passes
      against in-degree&apos;s one; d = 0.85 is folklore with no theory
      choosing it; the score is one universal taste with no notion of
      query (the personalized-restart variant re-aims the teleport at a
      topic, and is its own atlas entry); and a large enough farm still
      buys a diluted boost, which is why TrustRank re-aims the teleport at
      trusted seeds.
    </>
  ),

  problem: 'Node importance and link analysis',
  problemSlug: 'link-analysis',
  rivals: [
    {
      name: 'PageRank × damped walk',
      isThisUnit: true,
      algoName: 'PageRank',
      cost: 'O(E) per pass, 82 passes',
      wins: (
        <>
          The only method on the bench that survives <strong>all three
          planted attacks</strong>: trap 2.7%, clique capture 5%, farm
          denied the crown.
        </>
      ),
      costs: (
        <>
          Dozens of global passes, a folklore dial, and no topic awareness
          without the personalized variant.
        </>
      ),
      when: 'Ranking anything linked and adversarial: the web, citations, follows, dependency graphs.',
    },
    {
      name: 'HITS algorithm',
      cost: 'O(E) per pass, 19 passes',
      wins: (
        <>
          Two scores instead of one: hubs (good pointers) and authorities
          (good targets), converging fastest here (19 passes), and
          query-scoped by design.
        </>
      ),
      costs: (
        <>
          The tightly-knit-community effect, measured at full strength: the
          planted 30-page clique owns <strong>100% of its top 20</strong>.
          A mutual-admiration society is indistinguishable from importance.
        </>
      ),
      when: 'Query-time ranking of a focused subgraph, where hubs and authorities are genuinely different roles.',
    },
    {
      name: 'SALSA',
      cost: 'O(E) per pass, 131 passes',
      wins: (
        <>
          HITS&apos;s two roles with the capture repaired: normalizing each
          walk step drops the clique to <strong>5%</strong> of the top 20,
          measured. The fix is one normalization.
        </>
      ),
      costs: (
        <>
          Slowest convergence on the bench (131 passes), still
          query-scoped in spirit, and its scores lean heavily toward plain
          in-degree within communities.
        </>
      ),
      when: 'HITS-style analysis where dense cliques are a real threat: citation rings, follow-back clusters.',
    },
    {
      name: 'Degree centrality',
      cost: 'one pass',
      wins: (
        <>
          Free: a single counting pass, no iteration, trap-proof (0.4%),
          and on honest graphs a strong first proxy for the eigenvector.
        </>
      ),
      costs: (
        <>
          Gameable at zero cost: the 100-sock farm makes its target the{' '}
          <strong>#1 page on the web</strong> by in-degree. Every vote
          counts equally, including votes from nobody.
        </>
      ),
      when: 'Honest graphs, first drafts, and features for models; never where rank converts to money.',
    },
  ],
  neverUse: {
    name: 'Betweenness centrality, for web-scale ranking',
    why: (
      <>
        Brandes&apos; exact algorithm costs O(V·E): about 21 million
        operations on this toy 2,000-page web against PageRank&apos;s
        900,000, and at a billion pages with ten billion links it is
        10¹⁹ operations, thousands of machine-years, to answer the{' '}
        <strong>wrong question</strong>: betweenness measures who sits on
        shortest paths between pairs (brokerage), not who the structure
        endorses. It becomes the right tool on network-shaped questions of
        flow and chokepoints, at thousands of nodes, not billions.
      </>
    ),
  },

  contest: {
    instance:
      'a 2,000-page web with three planted attacks: a 30-page mutual-admiration clique (with exits), a 10-page spider trap, and 50 dead ends; trap mass = share of total score held by the 10 trap pages; clique capture = share of the method’s top 20 drawn from the clique',
    columns: ['passes', 'trap mass', 'clique capture'],
    rows: [
      {
        method: 'PageRank, d = 0.85',
        isThisUnit: true,
        values: ['82', '2.7%', '5%'],
        verdict: 'survives every column; the farm below only reaches ninth',
      },
      {
        method: 'Random walk, d = 1.0',
        values: ['>500', '84.7%', '5%'],
        verdict: 'the heuristic removed: ten pages hoard 85% of all rank',
      },
      {
        method: 'HITS (authorities)',
        values: ['19', '0.0%', '100%'],
        best: 0,
        verdict: 'fastest to converge, and the clique owns its entire top 20',
      },
      {
        method: 'SALSA (authorities)',
        values: ['131', '0.4%', '5%'],
        verdict: 'HITS with the capture normalized away, at 7× the passes',
      },
      {
        method: 'In-degree count',
        values: ['1', '0.4%', '5%'],
        verdict: 'free and farm-fatal: 100 socks buy the crown outright',
      },
    ],
    source:
      'python solutions/pagerank_damped_walk.py prints this table and asserts power iteration matches an exact Gaussian-elimination solve to 10⁻¹⁰, a directed ring scores exactly uniform, the vector stays a unit-mass fixed point, iteration counts rise monotonically with d, the trap and clique captures, and the farm experiment: in-degree rank 1 versus PageRank rank 9, from 1,690 before the farm.',
  },

  figure: (
    <Figure
      id="fig-pagerank-teleport"
      aspect="16 / 7"
      caption="What the damping dial buys. Left: a spider trap under the pure walk: probability flows in, circulates, and never leaves, so the loop's share of the ranking grows without bound (84.7% measured). Right: the same trap under the damped walk: every page continuously exhales 15% of its mass to everywhere, so the trap leaks exactly as fast as any neighborhood its size deserves, and the chain acquires a unique stationary answer reachable at a known geometric rate."
      cite={{
        text: 'Brin and Page, "The Anatomy of a Large-Scale Hypertextual Web Search Engine", Computer Networks 30, 1998. The rival lens is Kleinberg, "Authoritative Sources in a Hyperlinked Environment", JACM 46(5), 1999; the repair is Lempel and Moran’s SALSA, 2000.',
        href: 'https://doi.org/10.1016/S0169-7552(98)00110-X',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="A spider trap absorbing the pure walk on the left; on the right the damped walk's teleports leak the trap back out">
        <text x="30" y="28" fill="#e06767" fontFamily="ui-monospace, monospace" fontSize="12">pure walk · the trap only inhales</text>
        {[[120, 110], [200, 90], [190, 170]].map(([x, y], i) => (
          <circle key={`l${i}`} cx={x} cy={y} r={16} fill="rgba(224,103,103,0.2)" stroke="#e06767" strokeWidth="1.6" />
        ))}
        <path d="M 134 102 C 160 86, 176 86, 188 96" fill="none" stroke="#e06767" strokeWidth="1.6" />
        <path d="M 198 104 C 202 126, 200 146, 194 158" fill="none" stroke="#e06767" strokeWidth="1.6" />
        <path d="M 176 168 C 150 158, 132 140, 124 124" fill="none" stroke="#e06767" strokeWidth="1.6" />
        {[[40, 60], [46, 160], [60, 230]].map(([x, y], i) => (
          <g key={`in${i}`}>
            <circle cx={x} cy={y} r={8} fill="#232c40" stroke="#9aa5bd" />
            <line x1={x + 9} y1={y} x2={106} y2={110} stroke="#9aa5bd" strokeWidth="1.2" />
          </g>
        ))}
        <text x="52" y="266" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">arrows in, none out · 84.7% of all rank</text>

        <line x1="320" y1="40" x2="320" y2="260" stroke="#232c40" strokeWidth="1" />

        <text x="356" y="28" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="12">damped walk · every page exhales 15%</text>
        {[[450, 110], [530, 90], [520, 170]].map(([x, y], i) => (
          <circle key={`r${i}`} cx={x} cy={y} r={16} fill="rgba(93,162,255,0.14)" stroke="#5da2ff" strokeWidth="1.6" />
        ))}
        <path d="M 464 102 C 490 86, 506 86, 518 96" fill="none" stroke="#5da2ff" strokeWidth="1.4" />
        <path d="M 528 104 C 532 126, 530 146, 524 158" fill="none" stroke="#5da2ff" strokeWidth="1.4" />
        {[[450, 110], [530, 90], [520, 170]].map(([x, y], i) => (
          <g key={`t${i}`}>
            <path d={`M ${x} ${y - 16} C ${x - 24} ${y - 52}, ${x - 60} ${y - 60}, ${x - 84} ${y - 48}`} fill="none" stroke="#f0b94b" strokeWidth="1.5" strokeDasharray="4 4" />
            <path d={`M ${x + 8} ${y + 14} C ${x + 30} ${y + 46}, ${x + 42} ${y + 58}, ${x + 58} ${y + 62}`} fill="none" stroke="#f0b94b" strokeWidth="1.5" strokeDasharray="4 4" />
          </g>
        ))}
        <text x="356" y="266" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">teleports leak it back out · 2.7% · unique answer, rate 0.85 per pass</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'pagerank_damped_walk.py',
  Viz: PagerankViz,
  narration,
};
