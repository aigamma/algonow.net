import BronKerboschViz from '../viz/BronKerboschViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/bron_kerbosch_tomita_pivoting.py?raw';
import { narration } from './bron-kerbosch-tomita-pivoting.narration.js';

export const content = {
  given:
    'A graph, and the question every social-network, protein-interaction, and constraint-analysis tool eventually asks: list every group in which everyone is connected to everyone, and no one else could join.',
  task: 'Keep three sets: R, the clique being built; P, the candidates that could extend it; X, the vertices already reported with R. When P and X are both empty, R is maximal. Pick a pivot u from P ∪ X with the most neighbors in P and branch only on candidates outside its neighborhood.',
  constraint:
    'On twelve small graphs the pivoted search, the unpivoted search, and the degeneracy-ordered search all equal brute-force enumeration of every vertex subset. On four larger graphs every reported set is verified a clique, maximal, and unique, and the three variants agree. On Moon-Moser graphs with 3ᵏ maximal cliques the pivoted search makes exactly (3ᵏ⁺¹ − 1)/2 calls and the unpivoted search exactly 4ᵏ, laws read off the run and asserted.',

  origins: (
    <p>
      Coen Bron and Joep Kerbosch, <strong>1973</strong>, Algorithm
      457 in Communications of the ACM: the three-set recursion, and
      already a second version with a pivot. Etsuji Tomita, Akira
      Tanaka, and Haruhisa Takahashi (2006) proved that choosing the
      pivot with the most neighbors among the candidates makes the
      search run in O(3ⁿᐟ³) time, which is optimal because Moon and
      Moser had shown in 1965 that a graph on n vertices can have
      3ⁿᐟ³ maximal cliques (the complete multipartite graph with
      parts of three, which this page builds). Eppstein, Löffler, and
      Strash (2010) added a degeneracy ordering at the outer level
      for sparse graphs, giving O(d n 3ᵈᐟ³) for degeneracy d: the
      form that lists cliques in social networks with millions of
      vertices, which have small d and enormous n.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>three-set recursion and its completeness</strong>.
      Every vertex of P is tried as an extension of R, with P and X
      shrunk to the vertex&apos;s neighbors; after a vertex is
      explored it moves from P to X so that no clique containing it
      is reported again from this branch. R is reported exactly when
      P and X are both empty: nothing can extend it and nothing has
      already covered it. The referees: on twelve small graphs the
      output <strong>equals brute-force enumeration</strong> of all
      2ⁿ subsets; on G(60, 0.5) the 1,870 cliques, on G(60, 0.7) the
      14,479, on G(120, 0.5) the 42,009 are each verified a clique,
      maximal, and unique; and all three variants report identical
      collections.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>pivot</strong>. Any maximal clique either
      contains the pivot u or contains a vertex not adjacent to u
      (otherwise u could join it), so branching only on P \ N(u)
      loses nothing and skips every candidate inside the
      pivot&apos;s neighborhood. Tomita&apos;s rule picks the u that
      covers the most of P. Measured on G(60, 0.5): <strong>4,427
      calls against 19,487</strong> without a pivot; on G(60, 0.7),
      35,170 against 693,973. On the Moon-Moser graphs the laws are
      exact: pivoted calls (3ᵏ⁺¹ − 1)/2 for 3ᵏ cliques, unpivoted 4ᵏ,
      a gap that widens as (4/3)ᵏ: 2.1×, 2.8×, 3.7× at k = 4, 5, 6.
    </p>
  ),

  picture: (
    <p>
      Listing every table at a banquet where all guests at a table
      already know one another and no one else in the hall knows
      them all. You build a table one guest at a time. Candidates
      are the people who know everyone seated so far; the excluded
      list is people who were already seated at a table you have
      finished writing down, so you never write the same table
      twice. When no candidate remains and no excluded guest could
      have joined, the table is complete and maximal. The pivot is a
      shortcut a good host sees at once: pick the candidate who
      knows the most other candidates, and notice that any complete
      table either has that person at it or has someone who does
      not know them. So you only need to start new tables with
      people outside that person&apos;s circle; the rest are covered
      by the table with the pivot in it. Every room is still listed;
      most of the starts are skipped.
    </p>
  ),

  steps: [
    <>
      <strong>Start:</strong> R empty, P every vertex, X empty; a
      call is one node of the search tree.
    </>,
    <>
      <strong>Report:</strong> P and X both empty means R is a
      maximal clique: written out exactly once.
    </>,
    <>
      <strong>Pivot:</strong> u ∈ P ∪ X with the most neighbors in
      P; candidates are P \ N(u).
    </>,
    <>
      <strong>Branch:</strong> for each candidate v, recurse on
      R ∪ {'{v}'}, P ∩ N(v), X ∩ N(v); then move v from P to X.
    </>,
    <>
      <strong>Sparse graphs:</strong> order the outer level by
      degeneracy so each first-level P has at most d vertices
      (13, 23, 35, 50 here).
    </>,
  ],

  signals: [
    <>
      <strong>All maximal cliques, not the largest:</strong>
      community detection, motif counting, protein complexes,
      conflict analysis in constraint problems.
    </>,
    <>
      <strong>Dense or adversarial structure:</strong> the pivot
      earns 20× on G(60, 0.7) and keeps the Moon-Moser worst case
      at its 3ⁿᐟ³ floor.
    </>,
    <>
      <strong>Big sparse graphs:</strong> degeneracy ordering makes
      the outer level cheap when d is small, which social networks
      are.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>Bron-Kerbosch without a pivot</strong>:
      the same three sets, branching on every candidate. It is
      complete and correct, agrees on every clique here, and costs
      1,672 calls where the pivot costs 847 on G(60, 0.3); by
      G(60, 0.7) the gap is 693,973 against 35,170, because every
      candidate inside a would-be pivot&apos;s neighborhood starts a
      branch that the pivot proves redundant.
    </>
  ),

  strength: (
    <>
      <strong>Every maximal clique exactly once, at the provably
      optimal rate.</strong> Equal to brute force on every small
      graph, validated clique by clique on the large ones, three
      variants in agreement; the pivot cut calls on every graph
      measured, by 20× at density 0.7; and on the graphs Moon and
      Moser built to have the most cliques possible, the pivoted
      call count follows an exact geometric law in 3 while the
      unpivoted one follows 4.
    </>
  ),
  weakness: (
    <>
      <strong>Output-bound, and only as fast as the number of
      answers.</strong> G(120, 0.5) has 42,009 maximal cliques and no
      algorithm can list them in fewer than 42,009 steps; dense
      graphs simply have too many. The recursion copies sets at
      every call (bitsets fix the constant, not the exponent). The
      pivot choice costs a scan of P ∪ X per call, which is why the
      degeneracy variant paid slightly more calls here (944 vs 847)
      while bounding the worst case for sparse inputs. And it lists
      cliques; if you only want the largest one, branch-and-bound
      with a coloring bound prunes what this method must visit.
    </>
  ),

  problem: 'Clique finding',
  problemSlug: 'clique-finding',
  rivals: [
    {
      name: 'Bron-Kerbosch × Tomita pivot',
      isThisUnit: true,
      algoName: 'Bron-Kerbosch',
      cost: 'O(3ⁿᐟ³), optimal',
      wins: (
        <>
          <strong>Every clique once, fewest calls</strong>: 4,427 vs
          19,487 on G(60, 0.5), exact (3ᵏ⁺¹ − 1)/2 on the worst-case
          graphs.
        </>
      ),
      costs: (
        <>
          A pivot scan per call, set copies in the recursion, and a
          bound that is the output size when the output is huge.
        </>
      ),
      when: 'Enumerating all maximal cliques on graphs of moderate size or any density.',
    },
    {
      name: 'Degeneracy ordering (Eppstein-Löffler-Strash)',
      algoName: 'Bron-Kerbosch',
      cost: 'O(d n 3ᵈᐟ³)',
      wins: (
        <>
          The same pivoted recursion under an outer loop in
          degeneracy order, so every first-level candidate set has
          at most d vertices: linear in n for sparse graphs.
        </>
      ),
      costs: (
        <>
          Slightly more calls on small dense graphs (944 vs 847 on
          G(60, 0.3)); the win is asymptotic and needs small d.
        </>
      ),
      when: 'Social and web graphs: millions of vertices, degeneracy in the dozens.',
    },
    {
      name: 'Max-clique branch and bound',
      cost: 'coloring upper bound',
      wins: (
        <>
          When only the largest clique matters: a greedy coloring of
          the candidates bounds the clique size and prunes whole
          subtrees this method must enumerate.
        </>
      ),
      costs: (
        <>
          Finds one clique, not all of them; useless for listing.
        </>
      ),
      when: 'Maximum clique, not maximal cliques: the size, or one witness.',
    },
    {
      name: 'Backtracking search',
      cost: 'generic',
      wins: (
        <>
          The live unit here: the same depth-first skeleton with a
          minimum-remaining-values rule, written against any
          constraint problem rather than the clique structure.
        </>
      ),
      costs: (
        <>
          Without the X set it reports cliques many times; without
          the pivot it branches on everything.
        </>
      ),
      when: 'Problems that are not clique-shaped, where the three-set trick does not apply.',
    },
  ],
  neverUse: {
    name: 'Enumerating every vertex subset and keeping the maximal cliques',
    why: (
      <>
        It is the referee on this page for graphs up to 14 vertices:
        16,384 subsets, each tested for adjacency and maximality.
        The count is 2ⁿ. At 60 vertices that is{' '}
        <strong>1.15 × 10¹⁸ subsets</strong> to reach the 1,870
        cliques the pivoted search found in 4,427 calls; at 120
        vertices, 1.3 × 10³⁶. The three-set recursion never visits a
        subset that is not a clique, never reports one twice, and
        with the pivot never even starts a branch that a sibling
        already covers. The subset loop is the right oracle for a
        unit test and the wrong algorithm for every graph you will
        meet outside one.
      </>
    ),
  },

  contest: {
    instance:
      'maximal clique listing on random graphs G(n, p) and on Moon-Moser graphs (parts of three, 3ᵏ maximal cliques); currency: recursive calls; referees: brute-force subset enumeration on small graphs, clique/maximality/uniqueness validation on large ones, three variants agreeing',
    columns: ['G(60, 0.5)', 'G(60, 0.7)', 'G(120, 0.5)'],
    rows: [
      {
        method: 'No pivot',
        values: ['19,487', '693,973', '574,935'],
        verdict: 'every candidate branched: the same cliques at 4× to 20× the calls',
      },
      {
        method: 'Tomita pivot',
        isThisUnit: true,
        values: ['4,427', '35,170', '100,994'],
        best: 1,
        verdict: '1,870 / 14,479 / 42,009 cliques, each verified; exact (3ᵏ⁺¹ − 1)/2 calls on Moon-Moser graphs',
      },
      {
        method: 'Degeneracy order + pivot',
        values: ['4,574', '35,769', '103,156'],
        verdict: 'first-level candidate sets bounded by d = 23 / 35 / 50; the asymptotic win needs sparse graphs',
      },
    ],
    source:
      'python solutions/bron_kerbosch_tomita_pivoting.py prints this table and asserts: twelve small graphs equal to brute force under all three variants; every reported set a clique, maximal, and unique on the four large graphs; the variants agreeing; pivoting cutting calls on every graph; depth-one candidate sets bounded by the degeneracy; and on Moon-Moser graphs exactly 3ᵏ cliques with pivoted calls exactly (3ᵏ⁺¹ − 1)/2 and unpivoted exactly 4ᵏ, the gap widening 2.1×, 2.8×, 3.7×.',
  },

  figure: (
    <Figure
      id="fig-bron-kerbosch-pivot"
      aspect="16 / 7"
      caption="Why the pivot loses nothing. R is the clique so far (green), P the candidates (blue), X the excluded (grey). Take the pivot u with the most neighbors in P. Any maximal clique extending R either contains u, and is found by the branch that adds u, or contains a candidate outside u’s neighborhood, and is found by that candidate’s branch: so the candidates inside N(u) never need a branch of their own. Measured: 4,427 calls against 19,487 on G(60, 0.5), 35,170 against 693,973 on G(60, 0.7); on Moon-Moser graphs the pivoted count is exactly (3ᵏ⁺¹ − 1)/2 and the unpivoted exactly 4ᵏ."
      cite={{
        text: 'E. Tomita, A. Tanaka, H. Takahashi, "The worst-case time complexity for generating all maximal cliques and computational experiments," TCS 363(1), 2006, DOI 10.1016/j.tcs.2006.06.015; C. Bron, J. Kerbosch, CACM 16(9), 1973, DOI 10.1145/362342.362367.',
        href: 'https://doi.org/10.1016/j.tcs.2006.06.015',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="A clique R, a candidate set P split by a pivot's neighborhood, and the excluded set X, with only the candidates outside the neighborhood branched">
        <rect x="30" y="50" width="120" height="90" rx="10" fill="rgba(98,217,138,0.15)" stroke="#62d98a" strokeWidth="1.6" />
        <text x="44" y="72" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">R: the clique so far</text>
        {[[60, 105], [95, 95], [120, 120]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="7" fill="#62d98a" />)}
        <rect x="190" y="50" width="280" height="90" rx="10" fill="rgba(93,162,255,0.10)" stroke="#5da2ff" strokeWidth="1.6" />
        <text x="204" y="72" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="11">P: candidates that extend R</text>
        <circle cx="250" cy="110" r="11" fill="rgba(240,185,75,0.3)" stroke="#f0b94b" strokeWidth="2.4" />
        <text x="245" y="114" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="10">u</text>
        {[[290, 100], [315, 122], [340, 100], [365, 122]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="7" fill="rgba(93,162,255,0.35)" stroke="#5da2ff" strokeWidth="1" />)}
        <path d="M 250 110 L 290 100 M 250 110 L 315 122 M 250 110 L 340 100 M 250 110 L 365 122" stroke="#f0b94b" strokeWidth="1" strokeDasharray="3 3" />
        {[[420, 100], [445, 122]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="7" fill="rgba(93,162,255,0.35)" stroke="#5da2ff" strokeWidth="2.4" />)}
        <text x="396" y="80" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="10">P \\ N(u): branch</text>
        <text x="270" y="80" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="10">N(u): covered by u’s branch</text>
        <rect x="500" y="50" width="110" height="90" rx="10" fill="rgba(154,165,189,0.10)" stroke="#9aa5bd" strokeWidth="1.2" />
        <text x="512" y="72" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">X: excluded</text>
        {[[535, 105], [570, 118]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="7" fill="rgba(154,165,189,0.3)" stroke="#9aa5bd" strokeWidth="1" />)}
        <text x="30" y="176" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">a maximal clique extending R contains u, or contains a vertex not adjacent to u: the two branches shown cover everything</text>
        <text x="30" y="206" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">measured calls: G(60, 0.5) 4,427 vs 19,487 · G(60, 0.7) 35,170 vs 693,973 · G(120, 0.5) 100,994 vs 574,935</text>
        <text x="30" y="228" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">Moon-Moser (3ᵏ cliques): pivoted (3ᵏ⁺¹ − 1)/2 calls, unpivoted 4ᵏ: 121 vs 256, 364 vs 1,024, 1,093 vs 4,096</text>
        <text x="30" y="258" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">referees: brute-force subsets on 12 small graphs; every large-graph clique verified maximal and unique; three variants agreeing</text>
        <text x="30" y="280" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="10">subset enumeration at 60 vertices: 1.15 × 10¹⁸ candidates for 1,870 cliques</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'bron_kerbosch_tomita_pivoting.py',
  Viz: BronKerboschViz,
  narration,
};
