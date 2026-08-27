import LouvainViz from '../viz/LouvainViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/louvain_modularity_moves.py?raw';
import { narration } from './louvain-modularity-moves.narration.js';

export const content = {
  given:
    'A network nobody labeled: friendships, citations, protein interactions: and the suspicion that it has natural neighborhoods.',
  task: 'Find the communities by greedy modularity moves: each node joins whichever neighbor community raises Q most, then communities collapse into supernodes and the process repeats.',
  constraint:
    "Referees at three scales: every accepted move's incremental ΔQ audited against the from-scratch definition to 10⁻¹² (335 moves, zero drift); every set partition enumerated (Bell numbers) on 60 small graphs (optimal on 54, mean 98.7% of Q*); and the planted truth on 30 block graphs recovered exactly, 30 of 30.",

  origins: (
    <p>
      Blondel, Guillaume, Lambiotte, and Lefebvre, <strong>2008</strong>,
      at the University of Louvain: a two-phase unfolding: greedy
      local moves, then collapse communities into supernodes and
      repeat: that made community detection routine on
      million-node networks and became one of the most cited
      methods in network science. Its objective, Newman and
      Girvan&apos;s <strong>modularity</strong>, predates it
      (2004): edges inside communities minus what chance would put
      there: and its most famous flaw was proven by Fortunato and
      Barthélemy in 2007: the <strong>resolution limit</strong>,
      which this page runs rather than cites. The 2019 Leiden
      refinement fixed connectivity defects; the greedy unfolding
      idea is unchanged.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>two-phase loop</strong>: sweep the nodes
      until no move helps, then aggregate each community into a
      supernode (internal edges become self-loops, kept) and sweep
      again on the smaller graph: hierarchy for free. Every claim
      is audited: <strong>335 accepted moves</strong> had their
      incremental ΔQ checked against Q recomputed from the
      definition, to 10⁻¹², zero drift: the bookkeeping IS the
      definition. On Zachary&apos;s karate club it lands at{' '}
      <strong>Q = 0.4188 with 4 communities</strong>: the
      canonical result.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>move rule</strong>: each node inspects
      only its neighbors&apos; communities and takes the one with
      the largest modularity gain, computed incrementally in
      O(degree): locality is the entire scalability story.
      Measured against enumerated optima (every partition, Bell
      numbers) it is <strong>optimal on 54 of 60</strong> small
      graphs and averages 98.7% of Q*: and on planted 4-block
      networks it recovers the truth exactly, 30 of 30. What it
      inherits is modularity&apos;s own blind spot: the
      resolution limit, measured below.
    </p>
  ),

  picture: (
    <p>
      A city of strangers sorting into neighborhoods. Each person
      periodically asks: among the blocks my friends live on,
      where would moving most increase the density of
      friendships-inside-blocks relative to chance? They move;
      the city settles; then whole blocks start acting as units
      and the same question repeats at block scale: neighborhoods
      of neighborhoods. The famous illusion: in a metropolis of
      many tiny villages arranged in a ring, the yardstick itself
      starts preferring <em>pairs</em> of villages fused: not
      because anyone&apos;s friendships changed, but because the
      chance-correction term shrinks as the city grows: the
      ruler bends with the size of what it measures.
    </p>
  ),

  steps: [
    <>
      <strong>Start as confetti:</strong> every node its own
      community.
    </>,
    <>
      <strong>Move greedily:</strong> join the neighbor community
      with the largest ΔQ (O(degree) per evaluation, audited
      against the definition).
    </>,
    <>
      <strong>Sweep until quiet:</strong> no improving move
      remains: a local optimum of modularity.
    </>,
    <>
      <strong>Aggregate:</strong> communities become supernodes,
      internal edges become self-loops: repeat on the smaller
      graph: the hierarchy unfolds.
    </>,
    <>
      <strong>Distrust small structures:</strong> below the
      resolution scale, modularity itself prefers merges: the
      measured 40-clique ring: check before believing.
    </>,
  ],

  signals: [
    <>
      <strong>Unlabeled relational data at scale:</strong> social
      graphs, citation webs, interaction networks: millions of
      nodes, locality-only work.
    </>,
    <>
      <strong>Hierarchy is welcome:</strong> the aggregation
      levels are a feature: neighborhoods of neighborhoods come
      free.
    </>,
    <>
      <strong>A yardstick exists but is imperfect:</strong>{' '}
      optimizing a proxy objective hard: and knowing the
      proxy&apos;s failure modes: is the whole modern-ML-adjacent
      skill this unit drills.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>exhaustive partition
      search</strong>: every set partition scored: exact, this
      page&apos;s referee at n ≤ 9, and Bell-number impossible
      beyond (Bell(34) ≈ 10²⁶ for the karate club alone). The
      classical alternative, <strong>Girvan-Newman</strong>, cuts
      edges by betweenness: lovely dendrograms at O(m²n) cost:
      the scale wall Louvain was built to pass.
    </>
  ),

  strength: (
    <>
      <strong>Audited arithmetic, enumerated optima, planted
      truth, and a canonical client.</strong> Every accepted
      move&apos;s ΔQ equal to the definition&apos;s difference to
      10⁻¹²; optimal on 54 of 60 fully enumerated instances (mean
      98.7% of Q*); 30 of 30 planted block networks recovered
      exactly; the karate club at the canonical Q = 0.4188 with
      the 1977 fission matched 33 of 34: the one dissenter being
      the network&apos;s famous boundary member.
    </>
  ),
  weakness: (
    <>
      <strong>It optimizes modularity, and modularity has a
      provable blind spot.</strong> The resolution limit, run: a
      ring of 10 five-cliques yields all 10 communities, a ring
      of 40 yields 20: adjacent cliques fused: and the page
      convicts the objective itself: the merged partition{' '}
      <em>scores higher Q</em> (0.9045 vs 0.8841) than the
      obviously right one. No cleverer search fixes an objective
      that prefers the wrong answer: below the resolution scale
      you need a resolution parameter, Leiden-style refinement,
      or a different yardstick. Greedy order also makes runs
      nondeterministic in general, and phase-1 local optima can
      strand nodes (this page&apos;s aggregation pass is what
      rescues them).
    </>
  ),

  problem: 'Community detection',
  problemSlug: 'community-detection',
  rivals: [
    {
      name: 'Louvain × greedy ΔQ',
      isThisUnit: true,
      algoName: 'Louvain method',
      cost: 'O(m) per sweep',
      wins: (
        <>
          <strong>Locality buys scale</strong>: million-node
          networks routine, hierarchy free, 54/60 enumerated
          optima hit.
        </>
      ),
      costs: (
        <>
          Inherits modularity&apos;s resolution limit (run here):
          the search is fine, the yardstick bends.
        </>
      ),
      when: 'The default first look at any large unlabeled network.',
    },
    {
      name: 'Leiden × refinement',
      algoName: 'Leiden algorithm',
      cost: 'O(m)-ish, refined',
      wins: (
        <>
          The 2019 successor: a refinement phase guarantees
          well-connected communities (Louvain can emit internally
          disconnected ones) and converges better under repeated
          runs.
        </>
      ),
      costs: (
        <>
          Same objective, same resolution limit: better search
          cannot fix the yardstick.
        </>
      ),
      when: 'Production community detection today: Louvain\'s lesson, Leiden\'s implementation.',
    },
    {
      name: 'Girvan-Newman × betweenness',
      algoName: 'Girvan-Newman',
      cost: 'O(m²n)',
      wins: (
        <>
          The classical road: repeatedly cut the
          highest-betweenness edge: a full dendrogram of nested
          structure, principled and interpretable.
        </>
      ),
      costs: (
        <>
          Betweenness recomputation per cut: hopeless past tens
          of thousands of edges.
        </>
      ),
      when: 'Small networks where the full hierarchy story matters more than speed.',
    },
    {
      name: 'Label propagation',
      algoName: 'Label propagation',
      cost: 'O(m) per round',
      wins: (
        <>
          Even cheaper: each node adopts its neighbors&apos;
          majority label: near-linear, no objective at all:
          sometimes that is the point.
        </>
      ),
      costs: (
        <>
          No yardstick means no guarantees: unstable across runs,
          and prone to label avalanches swallowing everything.
        </>
      ),
      when: 'A fast first sketch on huge graphs, or as Leiden\'s refinement subroutine.',
    },
  ],
  neverUse: {
    name: 'Trusting the optimum of a proxy objective',
    why: (
      <>
        The resolution limit is this site&apos;s cleanest specimen
        of a general disease: the search did nothing wrong: the
        measured merged partition genuinely scores higher
        modularity than one-community-per-clique: the{' '}
        <em>objective</em> prefers the wrong answer, provably and
        reproducibly. Optimizing a proxy harder: more sweeps,
        better refinements, restarts: only converges more reliably
        to the proxy&apos;s mistake. The discipline is to know
        your yardstick&apos;s failure modes before trusting its
        optimum: here, that communities below √(2m) edges can be
        fused: and to validate against ground truth or stability
        checks where stakes are real. The same instinct guards
        against reward hacking in RL and metric gaming in
        production ML: the objective is part of the system under
        test.
      </>
    ),
  },

  contest: {
    instance:
      "find the communities nobody labeled; referee: every set partition enumerated (Bell numbers) on 60 small graphs, planted truth on 120-node blocks, and the karate club's real fission",
    columns: ['result', 'nature'],
    rows: [
      {
        method: 'vs enumerated optimum',
        values: ['54/60', 'mean 98.7% of Q*'],
        verdict: 'greedy locality against every possible partition: near-ceiling',
      },
      {
        method: 'Planted 4×25 blocks',
        values: ['30/30', 'exact'],
        verdict: 'pair agreement 1.0 on every instance: clear structure, found',
      },
      {
        method: 'Karate club',
        isThisUnit: true,
        values: ['Q = 0.4188', '33/34'],
        best: 0,
        verdict: 'the canonical Q, and the 1977 fission matched but for the famous boundary member',
      },
    ],
    source:
      "python solutions/louvain_modularity_moves.py prints this table and asserts: 335 accepted moves with incremental ΔQ equal to the from-scratch definition's difference to 10⁻¹²; optimality against full Bell-number enumeration on 60 graphs of n ≤ 9 (54 exact, Q never exceeding Q*, mean ratio 98.7%); exact recovery (pair agreement 1.0) on all 30 planted 4×25 block graphs; the resolution limit run (ring of 10 five-cliques: all 10 found; ring of 40: 20 found, with the merged partition asserted to score HIGHER modularity than one-per-clique, 0.9045 vs 0.8841); and the karate club at Q = 0.4188 with 4 communities and a best 2-coarsening matching the historical fission on at least 33 of 34 members.",
  },

  figure: (
    <Figure
      id="fig-louvain-limit"
      aspect="16 / 7"
      caption="The unfolding, and the ruler that bends. Phase 1: greedy local moves, each audited against the definition of Q. Phase 2: communities collapse into supernodes and the moves repeat: hierarchy for free. The famous flaw is the objective's, not the search's: in a ring of 40 five-cliques, the partition that fuses adjacent cliques scores HIGHER modularity (0.9045) than one-community-per-clique (0.8841), so a perfect optimizer must return the fused answer. Below the resolution scale, modularity prefers the wrong partition: know the yardstick's failure modes before trusting its optimum."
      cite={{
        text: 'Blondel, Guillaume, Lambiotte & Lefebvre, "Fast unfolding of communities in large networks", J. Stat. Mech. 2008: the two-phase greedy that made community detection routine at scale.',
        href: 'https://doi.org/10.1088/1742-5468/2008/10/P10008',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="Local moves forming communities, aggregation into supernodes, and the clique-ring resolution limit">
        {[[80, 70], [120, 50], [110, 95], [220, 60], [255, 90], [240, 40]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={9} fill={i < 3 ? 'rgba(93,162,255,0.5)' : 'rgba(240,185,75,0.5)'} stroke={i < 3 ? '#5da2ff' : '#f0b94b'} strokeWidth="1.5" />
        ))}
        <text x="70" y="130" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">phase 1: greedy ΔQ moves (audited to 10⁻¹²)</text>
        <path d="M 300 70 L 350 70" stroke="#9aa5bd" strokeWidth="1.6" />
        <circle cx="400" cy="60" r="17" fill="rgba(93,162,255,0.4)" stroke="#5da2ff" strokeWidth="2" />
        <circle cx="460" cy="75" r="17" fill="rgba(240,185,75,0.4)" stroke="#f0b94b" strokeWidth="2" />
        <text x="370" y="120" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">phase 2: aggregate, repeat</text>
        {[...Array(10)].map((_, i) => {
          const ang = (i / 10) * Math.PI * 2;
          const x = 320 + Math.cos(ang) * 68;
          const y = 212 + Math.sin(ang) * 48;
          const pair = Math.floor(i / 2);
          const cols = ['#5da2ff', '#f0b94b', '#62d98a', '#e2606c', '#b78cff'];
          return <circle key={i} cx={x} cy={y} r={9} fill={cols[pair]} opacity="0.75" />;
        })}
        <text x="60" y="200" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">the resolution limit, run:</text>
        <text x="60" y="218" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">40 cliques → 20 colors</text>
        <text x="440" y="200" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">merged Q 0.9045</text>
        <text x="440" y="218" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">beats right Q 0.8841</text>
        <text x="60" y="262" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">measured: 54/60 enumerated optima · 30/30 planted blocks exact · karate Q = 0.4188, fission 33/34</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'louvain_modularity_moves.py',
  Viz: LouvainViz,
  narration,
};
