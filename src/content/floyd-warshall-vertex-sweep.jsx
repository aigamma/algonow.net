import FloydWarshallViz from '../viz/FloydWarshallViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/floyd_warshall_vertex_sweep.py?raw';
import { narration } from './floyd-warshall-vertex-sweep.narration.js';

export const content = {
  given:
    'A directed, weighted graph: negative edges allowed.',
  task: 'Shortest paths between ALL pairs, negative cycles detected, in three lines of loop.',
  constraint:
    'The three lines carry a landmine: the k-loop must be outermost. Swapped inward: the most famous loop-order bug in algorithms: it computed wrong distances on 52 of 60 random graphs here: and, measured stranger still, running the wrong loop three times heals it, 60 for 60.',

  origins: (
    <p>
      Three discoveries in one year: Bernard Roy (1959, transitive
      closure), Stephen Warshall (1962, closure), and Robert Floyd
      (1962, shortest paths) all found the same triple loop: Floyd
      built explicitly on Warshall&apos;s theorem, and the French
      literature says Roy-Floyd-Warshall. The deeper frame came later:
      the loop is matrix &quot;multiplication&quot; over the (min, +)
      semiring, one identity powering shortest paths, transitive
      closure (booleanized here, BFS-refereed), widest paths, and
      regular-expression conversion: one loop, many algebras.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>unusual DP dimension</strong>: not path length,
      but <em>which vertices may serve as intermediates</em>. After
      processing vertex k, dist[i][j] is exact over all paths whose
      interior stops lie in {'{0..k}'}: the invariant that makes three
      lines a proof. Negative edges cost nothing extra (200
      Bellman-Ford-refereed trials), and a negative cycle announces
      itself on the diagonal: dist[i][i] &lt; 0, planted and detected.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>sweep</strong>: admit intermediates{' '}
      <em>one at a time</em>, relaxing every pair through the newcomer,
      in place, k outermost. The discipline is everything: k innermost
      computed wrong answers on <strong>52 of 60</strong> graphs: the
      invariant (&quot;exact through {'{0..k}'}&quot;) is what dies in
      the swap. The measured oddity is the redemption: the{' '}
      <em>wrong</em> loop, repeated three times, healed every one of
      the 60: convergent relaxation dressed as a bug.
    </p>
  ),

  picture: (
    <p>
      A freight network opening hubs one at a time. Before any hub
      opens, you know only direct routes. Open hub 0: update every
      city-pair that improves by connecting through it. Open hub 1: the
      routes you improve may already <em>use</em> hub 0: gains
      compound. After the last hub opens, every tariff in the book is
      optimal over all layovers. The bug is opening hubs{' '}
      <em>per route</em> instead of per network: route A gets quoted
      before hub 3 opens, never re-quoted after: stale tariffs, 52
      times out of 60.
    </p>
  ),

  steps: [
    <>
      <strong>Initialize:</strong> dist = the adjacency matrix (∞ for
      absent edges, 0 on the diagonal); next[i][j] = j for edges.
    </>,
    <>
      <strong>For k = 0..n−1 (outermost!):</strong> for every pair
      (i, j): dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j]).
    </>,
    <>
      <strong>Record the turn:</strong> on improvement, next[i][j] =
      next[i][k]: paths reconstruct by following next (200+ routes
      re-priced edge-by-edge here).
    </>,
    <>
      <strong>Read the diagonal:</strong> dist[i][i] &lt; 0 ⟺ a
      negative cycle through i: detection is free.
    </>,
    <>
      <strong>Change the algebra, keep the loop:</strong> (OR, AND)
      gives transitive closure: BFS-refereed on this page.
    </>,
  ],

  signals: [
    <>
      <strong>All pairs genuinely needed:</strong> distance matrices for
      routing tables, betweenness preprocessing, game maps: not one
      source repeated.
    </>,
    <>
      <strong>Dense or small n:</strong> n³ with a tiny constant and
      perfect memory locality: unbeatable simplicity below n ≈ 1,000.
    </>,
    <>
      <strong>Negative edges or other algebras:</strong> the semiring
      family (closure, widest path, min-cost) reuses the identical
      loop.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>running a single-source method n
      times</strong>: n Bellman-Fords is this page&apos;s referee, and
      Johnson&apos;s algorithm (one Bellman-Ford for potentials, then n
      Dijkstras) is the refined form: it agreed with the sweep{' '}
      <em>exactly</em> on both terrains at n = 200, and on the sparse
      one did so in <strong>354,660 operations against 4.4
      million</strong>: the sweep does not notice sparsity, which is
      its vice and its metronome steadiness at once.
    </>
  ),

  strength: (
    <>
      <strong>Three lines, negative-proof, algebra-generic, and
      self-diagnosing.</strong> 200 refereed trials with negative
      edges; cycles surfacing on the diagonal; closure matching BFS;
      paths re-priced exactly; and the semiring reading turning one
      loop into a family. Nothing else on this site does so much with
      so little code.
    </>
  ),
  weakness: (
    <>
      <strong>n³ no matter what, and a landmine in the loop
      order.</strong> The sweep ran 4.4M operations on a graph with
      800 edges: sparsity is invisible to it (Johnson: 355K, 12×), and
      n³ at n = 10⁵ is 10¹⁵: never. The famous swap (k innermost) is
      wrong 52/60: and an honest clock note: in this Python stand,
      Johnson&apos;s C-speed heap even edged the dense race (0.21s vs
      0.40s): the sweep&apos;s dense virtue is constants in compiled
      code, and simplicity everywhere.
    </>
  ),

  problem: 'All-pairs shortest paths',
  problemSlug: 'all-pairs-shortest-paths',
  rivals: [
    {
      name: 'Floyd-Warshall × vertex sweep',
      isThisUnit: true,
      algoName: 'Floyd-Warshall',
      cost: 'Θ(n³), Θ(n²) memory',
      wins: (
        <>
          Three lines answering <strong>all 40,000 pairs</strong> with
          negative edges, cycle detection on the diagonal, and the
          semiring family for free.
        </>
      ),
      costs: (
        <>
          n³ blind to sparsity (4.4M ops for 800 edges), and the
          loop-order landmine measured at 52/60.
        </>
      ),
      when: 'Dense or small graphs, negative edges, closure/widest-path algebras: the default below n ≈ 1,000.',
    },
    {
      name: "Johnson's algorithm × reweighting",
      algoName: "Johnson's algorithm",
      cost: 'O(nm + n² log n)',
      wins: (
        <>
          One Bellman-Ford buys potentials that make every weight
          nonnegative, then n Dijkstras: <strong>354,660 ops on the
          sparse terrain (12×)</strong>, agreeing with the sweep
          exactly.
        </>
      ),
      costs: (
        <>
          Three algorithms in a trenchcoat: the machinery of the whole
          shortest-path family where the sweep needed three lines.
        </>
      ),
      when: 'Sparse all-pairs at scale: road networks, big graphs: the crossover is early and decisive.',
    },
    {
      name: "Dijkstra's algorithm (× n sources)",
      algoName: "Dijkstra's algorithm",
      cost: 'O(n·m log n)',
      wins: (
        <>
          When weights are already nonnegative, n heap runs are
          Johnson without the preamble: the live unit&apos;s engine,
          multiplied.
        </>
      ),
      costs: (
        <>
          One negative edge anywhere voids all n runs: the greed
          measured wrong at puzzle 34 fails identically here.
        </>
      ),
      when: 'Nonnegative sparse graphs where all pairs are needed and Johnson’s preamble is redundant.',
    },
    {
      name: 'Bellman-Ford × early exit',
      algoName: 'Bellman-Ford',
      cost: 'O(n·m) per source',
      wins: (
        <>
          The negative-safe single-source workhorse (a live unit): as
          the per-source referee here, its early exit made 200-source
          verification affordable.
        </>
      ),
      costs: (
        <>
          All-pairs via n runs pays n²m worst-case: the referee role,
          not the production role.
        </>
      ),
      when: 'One source with negative edges: and as the auditor when an all-pairs method needs checking.',
    },
  ],
  neverUse: {
    name: 'The sweep past a few thousand vertices',
    why: (
      <>
        n³ is a promise in both directions: at n = 200 it is 8 million
        operations and 0.4 seconds; at n = 10,000 it is 10¹²: hours:
        and at a road network&apos;s 10⁵ it is 10¹⁵: never: while the
        graph&apos;s 800 actual edges sit ignored (measured: the sweep
        spent 4.4M ops where Johnson spent 355K). The three-line
        elegance is real and the cubic bill is realer: past the
        crossover, sparsity is money on the table, and Johnson exists
        to pick it up.
      </>
    ),
  },

  contest: {
    instance:
      'all pairs at n = 200 on two terrains (dense: 19,900 edges; sparse: 800); referees: per-source Bellman-Ford on 200 small trials with negative edges, and Johnson agreeing with the sweep exactly at scale',
    columns: ['dense: ops / s', 'sparse: ops / s'],
    rows: [
      {
        method: 'Floyd-Warshall × sweep',
        isThisUnit: true,
        values: ['7,955,600 / 0.40', '4,390,600 / 0.22'],
        verdict: 'the metronome: n³ regardless: strength and vice in one number',
      },
      {
        method: 'Johnson (BF + n·Dijkstra)',
        values: ['8,000,000 / 0.21', '354,660 / 0.02'],
        best: 1,
        verdict: 'scales with m: 12× on sparse, and the C-speed heap even took the dense clock',
      },
    ],
    source:
      "python solutions/floyd_warshall_vertex_sweep.py prints this table and asserts: 200 trials refereed by per-source Bellman-Ford with negative edges; reachability equal to BFS (the closure reading); 200+ reconstructed paths re-priced edge-by-edge to their matrix entries; the k-innermost bug wrong on 52/60 graphs with its 3-pass healing confirmed on all 60; planted negative cycles surfacing as a negative diagonal; and Johnson agreeing with the sweep exactly on both n = 200 terrains.",
  },

  figure: (
    <Figure
      id="fig-fw-invariant"
      aspect="16 / 7"
      caption="The invariant that is the proof. After the sweep admits vertex k, dist[i][j] is exact over all paths whose interior stops lie in {0..k}: each round asks one question: does routing through the newcomer help? k outermost grows the certified set once for everyone; k innermost quotes route (i, j) before later hubs open and never re-quotes: wrong 52 times in 60, measured: though three passes of the wrong loop converge anyway, 60 for 60."
      cite={{
        text: 'Floyd, "Algorithm 97: Shortest Path", CACM 5(6), 1962, building on Warshall\'s theorem (JACM 1962); Roy 1959 in the French literature. The semiring reading is the algebraic-path framework.',
        href: 'https://doi.org/10.1145/367766.368168',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="A path from i to j whose interior vertices are drawn from the growing admitted set">
        <circle cx="70" cy="150" r="12" fill="rgba(93,162,255,0.2)" stroke="#5da2ff" strokeWidth="1.5" />
        <text x="66" y="155" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="12">i</text>
        <circle cx="570" cy="150" r="12" fill="rgba(93,162,255,0.2)" stroke="#5da2ff" strokeWidth="1.5" />
        <text x="566" y="155" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="12">j</text>
        <rect x="150" y="110" width="340" height="80" fill="rgba(240,185,75,0.07)" stroke="#f0b94b" strokeDasharray="6 4" rx="10" />
        <text x="230" y="100" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">interior stops ∈ {'{0..k}'} : certified</text>
        {[200, 280, 360, 440].map((x, i) => (
          <circle key={i} cx={x} cy={150} r="8" fill="rgba(240,185,75,0.25)" stroke="#f0b94b" />
        ))}
        <path d="M 82 150 L 192 150 M 208 150 L 272 150 M 288 150 L 352 150 M 368 150 L 432 150 M 448 150 L 558 150" stroke="#62d98a" strokeWidth="2" />
        <circle cx="320" cy="220" r="10" fill="rgba(98,217,138,0.2)" stroke="#62d98a" strokeWidth="1.8" />
        <text x="313" y="225" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">k+1</text>
        <text x="340" y="226" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">next round: does the newcomer help any pair?</text>
        <text x="70" y="262" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="12">dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j]) · k OUTERMOST</text>
        <text x="70" y="282" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">k innermost: wrong on 52/60 graphs · repeated ×3: healed on 60/60 · both measured</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'floyd_warshall_vertex_sweep.py',
  Viz: FloydWarshallViz,
  narration,
};
