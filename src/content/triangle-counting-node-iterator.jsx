import TriangleCountingViz from '../viz/TriangleCountingViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/triangle_counting_node_iterator.py?raw';
import { narration } from './triangle-counting-node-iterator.narration.js';

export const content = {
  given:
    'A graph with thousands of edges: a social network, a protein interaction map, a citation web. Count its triangles, three nodes all linked to one another, and from them the clustering coefficient: the fraction of open wedges (two edges meeting at a node) that a third edge closes. That one number separates a social network from a random graph of the same size (Watts and Strogatz 1998), and it has to be exact.',
  task: 'Triangle counting by the node-iterator. Stand at each node, take every pair of its neighbors, and ask whether the pair shares an edge. Every triangle is seen three times, once from each corner, so the sum over nodes is divided by three. The per-node tallies are the local clustering coefficients for free, and 3T over the number of wedges is the transitivity. The price is the sum over nodes of degree choose two: cheap on a graph of modest degrees, and dominated by the hubs on a scale-free one.',
  constraint:
    'Measured against three independent referees: the node-iterator, the degree-ordered forward algorithm, and brute force over every node triple agree on 40 small random graphs; trace(A³)/6 gives the same 170 triangles on a 100-node graph; and on the three families (Erdős–Rényi n = 400, planted communities 4 × 60, preferential attachment n = 600) the two exact methods agree at 94, 3,615, and 205 triangles. The random graph obeys C(n,3) p³: 148.5 ± 4.2 over 30 seeds against 143.8 expected, transitivity 0.0808 against p = 0.08. The planted communities cluster at 0.245 against 0.075 for a random twin of equal density (3.3×). On the preferential-attachment graph the six largest hubs (degrees 76 to 49) take 43.4% of the 23,282 pair checks; the forward algorithm, with every edge pointed uphill in degree, does the same count in 6,550 merge steps (3.6× fewer) and no out-list longer than 6, while on the hub-free random graph it saves only 1.50×. Wedge sampling from 2,000 wedges: rms error 0.0111 against a predicted standard error 0.0096. Every node triple of the 600-node graph: 35,820,200 candidates against 23,282 pair checks (1,539×). 0.8 s.',

  origins: (
    <p>
      Duncan Watts and Steven Strogatz defined the clustering coefficient in
      their 1998 <strong>Nature</strong> paper on small-world networks: the
      fraction of a node&apos;s neighbor pairs that are connected, averaged
      over nodes. Sociologists had the global version first as{' '}
      <strong>transitivity</strong>, a friend of my friend is my friend. The
      counting problem is a classic: Itai and Rodeh (1978) found a triangle
      in O(m<sup>3/2</sup>); Chiba and Nishizeki (1985) bounded the work by
      the edges times the arboricity, small for sparse real networks; Alon,
      Yuster, and Zwick (1997) brought fast matrix multiplication to it.
      Schank and Wagner (2005) ran the exact methods against one another and
      recommended the <strong>forward</strong> algorithm; Latapy (2008) gave
      the compact-forward version with its degree ordering and the O(m√m)
      bound measured here. Approximation followed: DOULION sparsification
      (Tsourakakis, Kang, Miller, Faloutsos 2009) and wedge sampling
      (Seshadhri, Pinar, Kolda 2013).
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>count</strong>, and refuses to take it on faith. Four
      exact methods agree on 40 small graphs and on the 100-node cube (170
      triangles, trace(A³)/6); the two fast ones agree on every family. The
      random graph matches its theory: <strong>148.5 ± 4.2</strong> triangles
      over 30 seeds against C(n,3) p³ = 143.8, and a transitivity of 0.0808
      against p = 0.08, because 3 C(n,3) = n C(n−1,2) makes the ratio exactly
      p in expectation.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>view from the node</strong>. A node of degree d costs
      C(d,2) pair checks, so a pass costs the wedge count: 12,899 on the
      random graph, 44,329 on the communities, 23,282 on the hub graph, where{' '}
      <strong>six hubs take 43.4%</strong>. The same tallies are the local
      coefficients, and the communities cluster 3.3× their random twin. The
      forward order points every edge uphill and merges short lists: 6,550
      steps on the hub graph, out-lists of at most 6 against a hub of 76.
    </p>
  ),

  picture: (
    <p>
      Picture a party where every guest holds a list of their friends in the
      room. Walk up to each guest, take the list, and for every pair of names
      on it ask the two whether they know each other. Each trio of mutual
      friends is asked three times, once by way of each member, so divide the
      tally by three at the door. The host with two hundred friends costs you
      nearly twenty thousand questions alone; a guest with three friends costs
      three. Exact, simple, priced by the squares of the degrees.
    </p>
  ),

  steps: [
    <>
      <strong>Store neighbors as sets</strong> so &quot;are u and w joined&quot;
      is one lookup.
    </>,
    <>
      <strong>At each node</strong>, sort its neighbors and check every pair
      (i &lt; j): a hit is a triangle through this node.
    </>,
    <>
      <strong>Sum the per-node hits</strong> and divide by three; each
      triangle was seen from all three corners.
    </>,
    <>
      <strong>Read the clustering:</strong> local C(v) = hits(v) / C(d,2);
      Watts–Strogatz clustering is their mean; transitivity is 3T / wedges.
    </>,
    <>
      <strong>Hubs? Switch to forward order:</strong> sort by degree, keep
      only higher-degree neighbors in sorted out-lists, merge list pairs; each
      triangle is counted once at its lowest-degree corner.
    </>,
  ],

  signals: [
    <>
      <strong>The count must be exact:</strong> it goes into a table, a
      paper, or a test, not an estimate with an error bar.
    </>,
    <>
      <strong>Degrees are modest:</strong> the wedge count is a few times the
      edge count and the pass takes milliseconds.
    </>,
    <>
      <strong>You want per-node numbers too:</strong> local clustering as a
      feature for ranking, community detection, or spotting the nodes whose
      friends are strangers.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the <strong>forward algorithm</strong>: the same
      exact count in 6,550 merge steps against 23,282 pair checks on the hub
      graph, and only 1.50× fewer on the random graph. Hubs decide.
    </>
  ),

  strength: (
    <>
      <strong>Exact, one pass, no data structure beyond a set per node.</strong>{' '}
      Agrees with brute force and the matrix cube everywhere; local
      coefficients fall out of the same tallies.
    </>
  ),
  weakness: (
    <>
      <strong>Priced by the squares of the degrees.</strong> Six hubs of 600
      nodes take 43.4% of the work; a degree-thousands hub alone costs
      millions of checks that the forward order avoids.
    </>
  ),

  problem: 'Clustering coefficient',
  problemSlug: 'subgraph-counting',
  rivals: [
    {
      name: 'Triangle counting × Node-iterator',
      isThisUnit: true,
      algoName: 'Triangle counting',
      cost: 'Σ C(d, 2) pair checks: the wedge count',
      wins: (
        <>
          <strong>Exact and one pass:</strong> equals brute force, the matrix
          cube, and the forward count on every graph; local clustering for
          free.
        </>
      ),
      costs: (
        <>
          Hubs dominate: 43.4% of 23,282 checks from six nodes on the
          preferential-attachment graph.
        </>
      ),
      when: 'Sparse graphs of modest degree where the exact count and the per-node coefficients are the deliverable.',
    },
    {
      name: 'Triangle counting × DOULION sparsification (and wedge sampling)',
      algoName: 'Triangle counting',
      cost: 'k sampled wedges or a p-sparsified graph',
      wins: (
        <>
          2,000 wedges estimated the transitivity to <strong>0.0111 rms</strong>{' '}
          (predicted 0.0096) and 3,583 triangles against 3,615, at 2,000
          closure checks instead of 44,329.
        </>
      ),
      costs: (
        <>
          An estimate with a confidence interval, never a certificate; the
          sparsifier&apos;s variance grows as p shrinks.
        </>
      ),
      when: 'Billions of edges where the clustering coefficient is a statistic to report, not a number to assert.',
    },
    {
      name: "Strassen's algorithm × Seven-product block split (trace of A³)",
      algoName: "Strassen's algorithm",
      cost: 'O(n^2.81) for the cube; O(n³) schoolbook',
      wins: (
        <>
          trace(A³)/6 is the count with no graph code at all; the plain cube
          returned the same 170 triangles on the 100-node graph.
        </>
      ),
      costs: (
        <>
          1,010,000 multiplications against 4,936 pair checks (205×) on that
          graph; a dense matrix for a sparse object.
        </>
      ),
      when: 'Dense graphs already held as matrices, or when you want many walk counts of which triangles are one.',
    },
    {
      name: 'Bron-Kerbosch × Tomita pivoting',
      algoName: 'Bron-Kerbosch',
      cost: 'O(3^(n/3)) worst case for all maximal cliques',
      wins: (
        <>
          Lists every maximal clique, so triangles, 4-cliques, and the whole
          clique structure come out of one enumeration.
        </>
      ),
      costs: (
        <>
          Exponential in the worst case and heavy on dense graphs, for an
          answer the node-iterator gets in one linear-ish pass.
        </>
      ),
      when: 'You need the cliques themselves (communities, motifs beyond triangles), not the count.',
    },
  ],
  neverUse: {
    name: 'Every node triple, or a dense matrix cube, on a sparse graph',
    why: (
      <>
        The preferential-attachment graph has 600 nodes and 1,794 edges. All
        node triples are C(600,3) = <strong>35,820,200</strong> candidates,
        each up to three lookups; the file ran them and got the same 205
        triangles the node-iterator found with <strong>23,282</strong> pair
        checks: 1,539× the work and several hundred times the wall clock. The
        dense cube is the same mistake in matrix clothing: 1,010,000
        multiplications on a 100-node graph for 170 triangles that cost 4,936
        checks by the node-iterator. On a sparse graph the work must follow
        the edges, not n² or n³.
      </>
    ),
  },

  contest: {
    instance:
      'Three graph families: Erdős–Rényi n = 400, p = 0.02 (1,609 edges); planted communities 4 × 60 with p_in 0.30 and p_out 0.01 (2,330 edges); Barabási–Albert preferential attachment n = 600, m = 3 (1,794 edges, max degree 76); referees: brute force over triples on 40 small graphs and the 600-node graph, trace(A³)/6 on a 100-node graph',
    columns: ['triangles (ER / planted / BA)', 'work on BA', 'largest list', 'exact?'],
    rows: [
      {
        method: 'node-iterator',
        isThisUnit: true,
        values: ['94 / 3,615 / 205', '23,282 pair checks', 'degree 76', 'yes, all three referees'],
        best: 3,
        verdict: 'one pass, hub-priced',
      },
      {
        method: 'forward (edges uphill)',
        values: ['94 / 3,615 / 205', '6,550 merge steps', 'out-list 6', 'yes'],
        best: 1,
        verdict: '3.6× fewer on hubs, 1.5× on ER',
      },
      {
        method: 'wedge sampling, 2,000 wedges',
        values: ['3,583 est. on planted', '2,000 closure checks', 'none', 'no: rms 0.0111'],
        verdict: 'the statistic, not the certificate',
      },
      {
        method: 'trace(A³)/6, plain cube',
        values: ['170 on n = 100', '1,010,000 multiplications', 'n × n matrix', 'yes'],
        verdict: '205× the node-iterator',
      },
      {
        method: 'every node triple',
        values: ['205 on BA', '35,820,200 triples', 'none', 'yes'],
        verdict: '1,539× the work',
      },
    ],
    source:
      'python solutions/triangle_counting_node_iterator.py prints these tables and asserts: node-iterator, forward, brute force, and trace(A³)/6 agree on 40 small graphs and the 100-node cube; node-iterator and forward agree on every family; per-node tallies sum to 3T; the random graph’s mean count over 30 seeds is within 3.5 standard errors of C(n,3) p³ and its transitivity within 0.01 of p; the planted communities cluster at least 2.5× their random twin; forward spends fewer steps than the node-iterator on the hub graph; every wedge-sampling estimate lies within 4 standard errors of the exact transitivity with rms error within 2.5× the prediction; the all-triples count equals the node-iterator’s.',
  },

  figure: (
    <Figure
      id="fig-triangle-counting-work"
      aspect="16 / 7"
      caption="Left: exact work per family, node-iterator pair checks (blue) against forward merge steps (amber), all returning the same counts. The saving is 1.5× on the hub-free random graph and 3.6× on the preferential-attachment graph. Right: where the node-iterator’s 23,282 checks on that graph come from: six hubs (degrees 76 to 49), one percent of the nodes, take 43.4%; the other 594 nodes share the rest. The forward order caps every out-list at 6."
      cite={{
        text: 'D. J. Watts and S. H. Strogatz, "Collective dynamics of small-world networks," Nature 393, 1998. T. Schank and D. Wagner, "Finding, counting and listing all triangles in large graphs," WEA 2005. M. Latapy, "Main-memory triangle computations for very large (sparse (power-law)) graphs," Theoretical Computer Science 407, 2008. N. Chiba and T. Nishizeki, "Arboricity and subgraph listing algorithms," SIAM J. Comput. 14, 1985.',
        href: 'https://doi.org/10.1016/j.tcs.2008.07.017',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="Grouped bars of pair checks against forward merge steps for three graph families, beside a bar showing that six hubs account for 43.4 percent of the node-iterator's work on the preferential-attachment graph">
        {(() => {
          const fam = [['Erdos-Renyi', 12899, 8609], ['planted 4 x 60', 44329, 33510], ['pref. attachment', 23282, 6550]];
          const sc = 150 / 44329;
          const y = (v) => 230 - v * sc;
          return (
            <g fontFamily="ui-monospace, monospace">
              <text x="20" y="22" fill="#9aa5bd" fontSize="10">exact work per family: pair checks (blue) against forward merge steps (amber)</text>
              {fam.map(([name, a, b], i) => (
                <g key={name}>
                  <rect x={40 + i * 100} y={y(a)} width="34" height={230 - y(a)} fill="#5da2ff" fillOpacity="0.85" />
                  <rect x={78 + i * 100} y={y(b)} width="34" height={230 - y(b)} fill="#f0b94b" fillOpacity="0.85" />
                  <text x={40 + i * 100} y={y(a) - 5} fill="#5da2ff" fontSize="9">{a.toLocaleString()}</text>
                  <text x={78 + i * 100} y={y(b) - 5} fill="#f0b94b" fontSize="9">{b.toLocaleString()}</text>
                  <text x={40 + i * 100} y="246" fill="#9aa5bd" fontSize="9">{name}</text>
                  <text x={40 + i * 100} y="258" fill="#62d98a" fontSize="9">{(a / b).toFixed(1)}x fewer</text>
                </g>
              ))}
              <text x="20" y="274" fill="#9aa5bd" fontSize="10">same counts everywhere: 94, 3,615, 205 triangles</text>
              <text x="360" y="22" fill="#9aa5bd" fontSize="10">who pays on the hub graph: 23,282 pair checks</text>
              <rect x="370" y="60" width="240" height="40" fill="#9aa5bd" fillOpacity="0.35" />
              <rect x="370" y="60" width={240 * 0.434} height="40" fill="#e2606c" fillOpacity="0.9" />
              <text x="376" y="85" fill="#0b0e14" fontSize="10">6 hubs: 43.4%</text>
              <text x="486" y="85" fill="#e9edf6" fontSize="10">594 other nodes: 56.6%</text>
              <text x="370" y="124" fill="#9aa5bd" fontSize="9">hub degrees 76, 68, 60, 55, 52, 49: C(d,2) each</text>
              <text x="370" y="150" fill="#f0b94b" fontSize="10">forward order: every edge points uphill in degree</text>
              <text x="370" y="166" fill="#f0b94b" fontSize="9">largest out-list 6 against the hub's 76 neighbors</text>
              <text x="370" y="182" fill="#f0b94b" fontSize="9">6,550 merge steps, the same 205 triangles</text>
              <text x="370" y="214" fill="#62d98a" fontSize="10">on the random graph (no hubs) the saving is only 1.50x</text>
              <text x="370" y="246" fill="#e2606c" fontSize="10">never: all 35,820,200 node triples (1,539x the work)</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'triangle_counting_node_iterator.py',
  Viz: TriangleCountingViz,
  narration,
};
