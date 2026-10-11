import VertexCoverViz from '../viz/VertexCoverViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/greedy_vertex_cover_maximal_matching.py?raw';
import { narration } from './greedy-vertex-cover-maximal-matching.narration.js';

export const content = {
  given:
    'A graph: servers and the links between them, people and the conflicts between them, variables and the constraints that pair them. Choose the fewest vertices so that every edge has at least one chosen endpoint: the guards who see every corridor, the monitors that watch every link. Minimum vertex cover is NP-hard (Karp 1972), so the exact answer is out of reach past a few dozen vertices.',
  task: 'Greedy vertex cover. The algorithm is the simplest approximation in the book: take any edge neither of whose endpoints is chosen, put both endpoints in the cover, delete every edge they touch, and repeat until no edge is left. The heuristic is the reason it works: the edges you kept never share a vertex, so they form a maximal matching M. Every cover must contain an endpoint of each edge of M, hence OPT ≥ |M|, and you chose exactly 2|M| vertices, so the output is at most twice the optimum. One pass over the edges, a proof you can hold in one hand, and a guarantee nobody has beaten in fifty years.',
  constraint:
    'Measured against exact minimum covers by branch and bound (itself checked against brute force on 60 small graphs): on 300 random graphs of 14 vertices with edge probability 0.3 the matching rule averaged 1.495 × OPT and hit exactly 2.000 at worst, with |M| ≤ OPT ≤ 2|M| on every graph; the max-degree greedy averaged 1.032 and never exceeded 1.286 on the same graphs; LP rounding averaged 1.757 with worst 2.000 and the LP sat at 1/1.123 of OPT. K₆,₆ and the star K₁,₈ return exactly twice the optimum. On the bipartite bad family (n left vertices, n/i right vertices of degree i for each i), where Kőnig gives OPT = n exactly, the degree greedy’s ratio climbed 2.125, 2.719, 3.375, 4.039 at n = 16, 32, 64, 128 (H₁₂₈ − 1 = 4.433) while the matching rule stayed at 2.000. Exact search at average degree 4 took 24, 118, 919, 4,514, 31,496 nodes at n = 24 to 120. 1.0 s.',

  origins: (
    <p>
      Vertex cover was one of Karp&apos;s twenty-one problems (1972), so the
      hunt for approximations began at once. The maximal-matching rule is
      credited to Fănică Gavril, reported as a private communication in
      Garey and Johnson&apos;s <strong>Computers and Intractability</strong>{' '}
      (1979); Mihalis Yannakakis found it independently. Its guarantee of 2
      has not budged: Nemhauser and Trotter (1975) showed the linear
      relaxation is half-integral, which gives the same factor by rounding;
      Karakostas (2009) reached 2 − Θ(1/√log n) with semidefinite methods;
      Dinur and Safra (2005) proved 1.36 is impossible unless P = NP; and
      Khot and Regev (2008) showed that under the Unique Games Conjecture no
      polynomial algorithm reaches 2 − ε for any ε. Kőnig&apos;s theorem
      (1931) makes the bipartite case exact: minimum cover equals maximum
      matching. Johnson (1974) and Lovász (1975) analysed the max-degree
      greedy, whose ratio grows like ln n on the construction measured here.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>cover</strong>: one pass over the edges, each uncovered
      edge contributing both endpoints, no edge left unwatched. The file
      checks the output as a cover on every one of 300 random graphs, on
      K₆,₆, on the star, and on the four bad-family graphs, and prices it
      against the exact optimum: <strong>1.495 × OPT</strong> on average,
      never above 2.000, the proven ceiling. The order of the edges is the
      only freedom: the best of eight random orders averaged 1.289 where one
      order averaged 1.491.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>certificate</strong>. The kept edges never share a
      vertex, so they are a matching, and no uncovered edge survives, so the
      matching is maximal. Any cover spends a distinct vertex on each kept
      edge: OPT ≥ |M|. The output has 2|M| vertices. The file asserts{' '}
      <strong>|M| ≤ OPT ≤ 2|M|</strong> on every instance, and the matching
      is also the lower bound that lets branch and bound prune: a few dozen
      nodes on dense random graphs, 31,496 at n = 120 and average degree 4.
    </p>
  ),

  picture: (
    <p>
      Picture a museum of corridors. A guard standing in a room watches every
      corridor leaving it. Walk to any unwatched corridor and post a guard at
      both of its ends. The corridors you chose never meet, so a rival
      planner, however clever, must still post at least one guard per chosen
      corridor; you posted two. Twice the rival&apos;s count, at most, with
      no arithmetic beyond counting your own corridors.
    </p>
  ),

  steps: [
    <>
      <strong>Scan the edges</strong> in any order; skip an edge if either
      endpoint is already chosen.
    </>,
    <>
      <strong>Take both endpoints</strong> of an uncovered edge and record the
      edge in M.
    </>,
    <>
      <strong>Stop when no uncovered edge remains:</strong> M is a maximal
      matching, the cover has 2|M| vertices.
    </>,
    <>
      <strong>Read the certificate:</strong> OPT ≥ |M|, so the cover is at
      most 2 × OPT; report |M| as the lower bound alongside the answer.
    </>,
    <>
      <strong>Spend spare time on order:</strong> rerun with shuffled edges
      and keep the smallest cover (1.491 to 1.289 with eight tries).
    </>,
  ],

  signals: [
    <>
      <strong>You need a proven bound, not a good average:</strong> a
      certificate |M| ships with the answer.
    </>,
    <>
      <strong>The graph is large and the pass must be linear:</strong> one
      scan, no priority queue, no LP.
    </>,
    <>
      <strong>An adversary may pick the graph:</strong> the degree greedy can
      be made to lose by a logarithm; this rule cannot.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the <strong>max-degree greedy</strong>, greedy
      set cover specialised to edges: 1.032 × OPT on average against the
      matching rule&apos;s 1.495, and 4.039 on the bad family at n = 128.
    </>
  ),

  strength: (
    <>
      <strong>A factor-two guarantee with a one-line proof and a linear
      pass.</strong> Worst measured 2.000, exactly the ceiling; the matching
      doubles as the lower bound that prices every other method.
    </>
  ),
  weakness: (
    <>
      <strong>Mediocre on average and blind to structure.</strong> 1.495 ×
      OPT where the degree greedy gets 1.032 on random graphs; exactly twice
      the optimum on K₆,₆ and on a star; the answer depends on edge order.
    </>
  ),

  problem: 'Vertex cover 2-approximation',
  problemSlug: 'vertex-cover',
  rivals: [
    {
      name: 'Greedy vertex cover × Maximal matching',
      isThisUnit: true,
      algoName: 'Greedy vertex cover',
      cost: 'O(V + E): one pass over the edges',
      wins: (
        <>
          <strong>Never above 2 × OPT</strong>, proven and measured (worst
          2.000); the matching is a free lower bound.
        </>
      ),
      costs: (
        <>
          1.495 × OPT on average; exactly 2 on K₆,₆ and on a star; the result
          depends on edge order.
        </>
      ),
      when: 'A guarantee matters, the graph is big, or an adversary chooses it: streaming, kernelization, and lower bounds for exact search.',
    },
    {
      name: 'LP rounding vertex cover × Half-integrality',
      algoName: 'LP rounding vertex cover',
      cost: 'one bipartite matching on the double cover (or an LP solve)',
      wins: (
        <>
          A half-integral optimum certified by its dual on every graph; OPT /
          LP averaged 1.123, a tighter bound than |M|; extends to weights.
        </>
      ),
      costs: (
        <>
          Rounding x ≥ ½ averaged 1.757 × OPT, worse than the matching rule,
          with the same worst case of 2.000.
        </>
      ),
      when: 'Weighted vertices, or when you want the strongest cheap lower bound rather than the cover itself.',
    },
    {
      name: 'Greedy set cover × Max coverage (max-degree greedy)',
      algoName: 'Greedy set cover',
      cost: 'O(V) per pick with incremental degrees',
      wins: (
        <>
          <strong>1.032 × OPT</strong> on random graphs, worst 1.286, optimal
          on K₆,₆: the best average of the three.
        </>
      ),
      costs: (
        <>
          No constant guarantee: 2.125, 2.719, 3.375, 4.039 on the bad family
          at n = 16 to 128, tracking H_n − 1.
        </>
      ),
      when: 'Typical inputs you trust, where the average matters and nobody is building the graph against you.',
    },
    {
      name: 'Branch and bound (exact)',
      algoName: 'Branch and bound',
      cost: 'exponential; |M| as the bound',
      wins: (
        <>
          The optimum itself: 15 nodes on average at n = 14, and Kőnig makes
          bipartite graphs exact in polynomial time.
        </>
      ),
      costs: (
        <>
          24, 118, 919, 4,514, 31,496 nodes at n = 24 to 120 and average
          degree 4; hopeless at thousands of vertices.
        </>
      ),
      when: 'Small graphs, bipartite graphs, or as the referee that prices the approximations.',
    },
  ],
  neverUse: {
    name: 'The max-degree greedy when the graph may be chosen against you',
    why: (
      <>
        On random graphs the degree greedy is the better heuristic, 1.032 ×
        OPT against the matching rule&apos;s 1.495. But put n vertices on the
        left and, for each i from 2 to n, give every block of i left vertices
        a right neighbour of degree i. The greedy&apos;s first pick has degree
        n and it is a right vertex; after it, the next right vertex has the
        highest degree again, and so on down the groups until it has taken
        every right vertex: 34, 87, 216, 517 of them at n = 16, 32, 64, 128,
        against an optimum of exactly n (the left side, proven minimal by
        Kőnig because the graph is bipartite). Measured ratios{' '}
        <strong>2.125, 2.719, 3.375, 4.039</strong>, climbing with H_n − 1
        (4.433 at n = 128) and never stopping. The matching rule returned
        2.000 on every one of those graphs, because it cannot do worse.
      </>
    ),
  },

  contest: {
    instance:
      'Random G(14, 0.3), 300 graphs with the exact optimum by branch and bound; the bipartite bad family at n = 128 (517 right vertices, OPT = 128 by Kőnig); sparse graphs of average degree 4 for the exact search; one referee: the ratio of cover size to the exact optimum',
    columns: ['mean ratio, 300 graphs', 'worst ratio', 'bad family, n = 128', 'guarantee'],
    rows: [
      {
        method: 'maximal matching rule',
        isThisUnit: true,
        values: ['1.495', '2.000', '2.000', '2 × OPT, proven'],
        best: 3,
        verdict: 'the guarantee, one pass',
      },
      {
        method: 'max-degree greedy',
        values: ['1.032', '1.286', '4.039', 'about ln n'],
        verdict: 'best on average, unbounded',
      },
      {
        method: 'LP rounding at one half',
        values: ['1.757', '2.000', 'not run', '2 × OPT; LP = 0.89 OPT mean'],
        verdict: 'the tightest cheap lower bound',
      },
      {
        method: 'branch and bound (exact)',
        values: ['1.000', '1.000', 'exact by Kőnig', 'exponential: 31,496 nodes at n = 120'],
        verdict: 'the referee',
      },
    ],
    source:
      'python solutions/greedy_vertex_cover_maximal_matching.py prints these tables and asserts: the exact solver equals brute force on 60 graphs; every output is a cover with |M| ≤ OPT ≤ 2|M|; the worst matching-rule and LP-rounding ratios never exceed 2; K₆,₆ and the star return exactly twice the optimum; Kőnig’s cover equals the maximum matching and the brute-force optimum on 40 bipartite graphs; the LP solution is primal feasible, its dual is feasible, and the two values agree; the degree greedy takes every right vertex of the bad family and its ratio grows while the matching rule’s does not; exact-search nodes grow more than a hundredfold from n = 24 to 120.',
  },

  figure: (
    <Figure
      id="fig-vertex-cover-ratios"
      aspect="16 / 7"
      caption="Left: ratio of cover size to the exact optimum over 300 random graphs of 14 vertices, mean and worst, for the matching rule, the max-degree greedy, and LP rounding. The greedy wins on average; the two provable methods touch exactly 2 at worst and never pass it. Right: the bad family. The degree greedy’s ratio climbs with the harmonic number as n doubles from 16 to 128, while the matching rule sits at 2.000 on every graph, because the theorem forbids anything worse."
      cite={{
        text: 'F. Gavril, reported in M. R. Garey and D. S. Johnson, Computers and Intractability, 1979. R. M. Karp, "Reducibility among combinatorial problems," 1972. S. Khot and O. Regev, "Vertex cover might be hard to approximate to within 2 − ε," J. Comput. Syst. Sci. 74(3), 2008. D. Kőnig, 1931.',
        href: 'https://doi.org/10.1016/j.jcss.2007.06.019',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="Bar chart of mean and worst approximation ratios for three methods on random graphs, beside a line chart of the max-degree greedy ratio growing with n on the bad family against the matching rule's flat two">
        {(() => {
          const bars = [['matching rule', 1.495, 2.0, '#5da2ff'], ['degree greedy', 1.032, 1.286, '#9aa5bd'], ['LP rounding', 1.757, 2.0, '#f0b94b']];
          const y = (r) => 230 - (r - 1) * 150;
          const fam = [[16, 2.125], [32, 2.719], [64, 3.375], [128, 4.039]];
          const px = (i) => 370 + i * 80;
          const py = (r) => 230 - (r - 1) * 45;
          return (
            <g fontFamily="ui-monospace, monospace">
              <text x="20" y="22" fill="#9aa5bd" fontSize="10">cover / OPT on 300 random graphs: mean (solid) and worst (outline)</text>
              <line x1="30" y1={y(2)} x2="300" y2={y(2)} stroke="#e2606c" strokeDasharray="4 3" />
              <text x="250" y={y(2) - 4} fill="#e2606c" fontSize="9">2 x OPT</text>
              {bars.map(([name, m, w, c], i) => (
                <g key={name}>
                  <rect x={40 + i * 90} y={y(w)} width="60" height={230 - y(w)} fill="none" stroke={c} strokeOpacity="0.8" />
                  <rect x={46 + i * 90} y={y(m)} width="48" height={230 - y(m)} fill={c} fillOpacity="0.85" />
                  <text x={40 + i * 90} y={y(w) - 5} fill={c} fontSize="9">{m.toFixed(3)} / {w.toFixed(3)}</text>
                  <text x={40 + i * 90} y="246" fill="#9aa5bd" fontSize="9">{name}</text>
                </g>
              ))}
              <text x="20" y="268" fill="#62d98a" fontSize="10">the greedy is better on average; the two provable methods never pass 2</text>
              <text x="340" y="22" fill="#9aa5bd" fontSize="10">the bad family: cover / OPT as n doubles (OPT = n by Konig)</text>
              <polyline points={fam.map(([, r], i) => `${px(i)},${py(r)}`).join(' ')} fill="none" stroke="#e2606c" strokeWidth="2" />
              {fam.map(([n, r], i) => (
                <g key={n}>
                  <circle cx={px(i)} cy={py(r)} r="3.5" fill="#e2606c" />
                  <text x={px(i) - 10} y={py(r) - 8} fill="#e2606c" fontSize="9">{r.toFixed(3)}</text>
                  <text x={px(i) - 12} y="246" fill="#9aa5bd" fontSize="9">n = {n}</text>
                </g>
              ))}
              <line x1={px(0)} y1={py(2)} x2={px(3)} y2={py(2)} stroke="#5da2ff" strokeWidth="2" />
              <text x={px(3) - 70} y={py(2) + 14} fill="#5da2ff" fontSize="9">matching rule 2.000</text>
              <text x="340" y="268" fill="#f0b94b" fontSize="10">degree greedy climbs with H(n) - 1 (4.433 at n = 128)</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'greedy_vertex_cover_maximal_matching.py',
  Viz: VertexCoverViz,
  narration,
};
