import HnswViz from '../viz/HnswViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/hnsw_navigable_small_world_layers.py?raw';
import { narration } from './hnsw-navigable-small-world-layers.narration.js';

export const content = {
  given:
    'Thousands of 16-dimensional vectors (embeddings of documents, images, products) and a stream of queries, each wanting its ten nearest neighbors. Scanning everything costs one distance per point per query; trees stop pruning past a dozen dimensions.',
  task: 'Build a graph where each point links to a diverse handful of near neighbors, and layer it: every point lives in the bottom layer, about one in M also in the layer above, and so on. Answer a query by hopping greedily down the sparse layers, then running a small beam search at the bottom.',
  constraint:
    'Every query is refereed by exact brute force. Recall@10 is 0.997, 0.992, 0.987 at 1,000, 2,000, 4,000 points while the distance computations per query fall from 40.8% of brute force to 24.4% to 13.6%. On the 2,000-point index the heuristic is removed piece by piece: no beam (ef = 1) drops recall to 0.843, nearest-M neighbor lists instead of the diversity rule drop it to 0.955, and a single flat layer costs about the same per query at this size (463 vs 487), which the page says plainly. An exact k-d tree on the same data visits all 2,000 points: the curse of dimensionality, measured.',

  origins: (
    <p>
      Yury Malkov and Dmitry Yashunin, <strong>2016</strong> (arXiv,
      then IEEE TPAMI 2020): Efficient and robust approximate
      nearest neighbor search using Hierarchical Navigable Small
      World graphs. The lineage runs through Kleinberg&apos;s 2000
      analysis of why greedy routing works in small-world networks
      (long links at every scale), Malkov&apos;s own flat navigable
      small-world graphs of 2011 to 2014, and the observation that a
      skip-list-like hierarchy of layers gives the long links for
      free: the top layers are the long jumps, the bottom layer the
      short ones. The diversity rule for choosing neighbors (keep a
      candidate only if it is closer to you than to any neighbor
      already kept) is what keeps the graph navigable instead of
      clumped. It is the index inside FAISS, Lucene, pgvector,
      Milvus, Weaviate, and nearly every vector database of the
      embedding era.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>graph search</strong>: from an entry point,
      keep a beam of the ef best candidates seen, repeatedly expand
      the nearest unexpanded one, add its neighbors that beat the
      worst of the beam, and stop when the nearest candidate is no
      better than the beam&apos;s worst. The same routine inserts a
      point (search for its neighbors, then link) and answers a
      query (search, then return the k best). Refereed against exact
      brute force on 100 queries per size:{' '}
      <strong>recall@10 of 0.997, 0.992, 0.987</strong> at 1,000,
      2,000, 4,000 points, and every node&apos;s degree held under
      its cap. Remove the beam (ef = 1) and the same graph gives
      0.843: pure greedy stops in the first local dip.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>layers and the diversity rule</strong>.
      A new point is assigned a level from a geometric draw
      (probability 1/M per extra layer: sizes 4,000 / 520 / 71 / 16
      / 2 / 1 here), so the upper layers are a sparse skeleton of
      long links; a query hops greedily down them and arrives at
      the bottom already close. Neighbor lists keep a candidate
      only if it is nearer to the node than to any neighbor already
      kept, so links spread in different directions. Measured: the
      fraction of brute-force work falls <strong>40.8% → 24.4% →
      13.6%</strong> as the index doubles; nearest-M lists instead
      of the diversity rule cost recall (0.955 vs 0.992); and the
      honest row: a single flat layer matches the hierarchy&apos;s
      cost at these sizes (463 vs 487 distances), because the
      layers buy a logarithmic entry into millions of points, not
      thousands.
    </p>
  ),

  picture: (
    <p>
      Finding the nearest bakery in a city you do not know. The
      brute force is a phone book: every bakery, every time. A tree
      of neighborhoods would help on a flat map, but in a city of
      sixteen dimensions every neighborhood borders every other,
      and the tree checks all of them anyway. The small-world way:
      every bakery knows a handful of nearby bakeries, chosen so
      that they point in different directions rather than all down
      one street, and a few well-known bakeries also know others far
      across town. Start at a famous one, ask which of its far
      contacts is closest to where you are going, jump there, repeat
      until the far contacts stop helping, then switch to local
      contacts and walk the last blocks, keeping a short list of the
      best you have heard of so a dead-end street does not trap you.
      A few dozen questions, instead of the whole phone book, and
      the right bakery nineteen times in twenty.
    </p>
  ),

  steps: [
    <>
      <strong>Level:</strong> draw the point&apos;s top layer
      geometrically (1/M per extra level): most points bottom only.
    </>,
    <>
      <strong>Descend:</strong> from the entry point, hop greedily
      (ef = 1) down each layer above the point&apos;s level.
    </>,
    <>
      <strong>Link:</strong> on each layer from its level down, beam
      search ef candidates and keep M by the diversity rule; prune
      neighbors that overflow.
    </>,
    <>
      <strong>Query:</strong> greedy descent to layer 0, then a beam
      search of width ef; return the k best.
    </>,
    <>
      <strong>Measure:</strong> recall against brute force (0.987 at
      4,000 points) and distances per query (13.6% of the scan).
    </>,
  ],

  signals: [
    <>
      <strong>High dimensions:</strong> embeddings of 16 to 1,536
      dimensions, where the k-d tree on this page degraded to a
      full scan.
    </>,
    <>
      <strong>Approximate is acceptable:</strong> nine-in-ten recall
      at a tenth of the cost is the trade a recommender or a
      retrieval-augmented model wants.
    </>,
    <>
      <strong>Millions of points, incremental inserts:</strong> the
      layers pay off logarithmically at scale, and points can be
      added without rebuilding.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>the brute-force scan</strong>:
      one distance per point, exact, and the referee for every
      number on this page. It costs 1,000, 2,000, 4,000 distances
      per query as the index grows; the hierarchy costs 408, 487,
      544 for recall above 0.98. The other exact rival, a k-d tree,
      visited all 2,000 points in 16 dimensions: the tree is a scan
      with extra steps once the dimension is high.
    </>
  ),

  strength: (
    <>
      <strong>Sub-linear queries in high dimensions, with the
      recall measured.</strong> Recall@10 above 0.98 at every size
      against exact brute force; the work fraction falling by
      nearly half with each doubling (40.8% → 24.4% → 13.6%);
      incremental inserts; every degree bounded; and a beam that
      trades ef for recall on a dial. The k-d tree on the same data
      scanned everything.
    </>
  ),
  weakness: (
    <>
      <strong>Approximate, memory-hungry, and expensive to
      build.</strong> Recall is 0.99, not 1: the ef = 1 run at 0.843
      shows how much the beam is doing. Every point keeps up to 2M
      bottom-layer neighbors, so the index is a large multiple of
      the data. Building cost 8.7 million distance computations for
      4,000 points (2,180 per insert), far more than a query. And
      at thousands of points the hierarchy is at parity with a flat
      graph: the log-N entry point matters at millions, which is
      why this page measures rather than promises.
    </>
  ),

  problem: 'Nearest neighbor search',
  problemSlug: 'nearest-neighbor-search',
  rivals: [
    {
      name: 'HNSW × navigable small-world layers',
      isThisUnit: true,
      algoName: 'HNSW',
      cost: '~log N hops, ef-sized beam',
      wins: (
        <>
          <strong>13.6% of brute force at 0.987 recall</strong> on
          4,000 points in 16 dimensions, with the fraction falling
          at every doubling.
        </>
      ),
      costs: (
        <>
          Approximate, 2M neighbors per point in memory, 2,180
          distances per insert, and no advantage over a flat graph
          at thousands of points.
        </>
      ),
      when: 'Embedding search at scale: the default index of every vector database.',
    },
    {
      name: 'k-d tree',
      algoName: 'K-d tree',
      cost: 'exact, dimension-cursed',
      wins: (
        <>
          The live unit here: exact and logarithmic in two or three
          dimensions, where a split plane actually prunes.
        </>
      ),
      costs: (
        <>
          Visited every one of 2,000 points in 16 dimensions: no
          pruning at all, a scan wearing a tree.
        </>
      ),
      when: 'Low dimensions (maps, meshes, simulations), or exact answers you can afford.',
    },
    {
      name: 'Locality-sensitive hashing',
      cost: 'hash tables',
      wins: (
        <>
          Random hyperplanes put near vectors in the same buckets
          with a provable probability; no graph, trivially
          parallel, and the bucket math is a theorem.
        </>
      ),
      costs: (
        <>
          Many tables for high recall, and a recall-cost curve far
          below a graph index on real embeddings.
        </>
      ),
      when: 'Streaming deduplication and sketching, where a bound beats an empirical curve.',
    },
    {
      name: 'IVF-PQ',
      cost: 'coarse cells + compressed codes',
      wins: (
        <>
          Cluster into cells, probe a few, and compare compressed
          codes: billions of vectors in memory that a graph could
          not hold.
        </>
      ),
      costs: (
        <>
          Quantization error, a training step, and lower recall at
          equal cost than a graph on the same data.
        </>
      ),
      when: 'Billion-scale corpora where memory, not query time, is the binding constraint.',
    },
  ],
  neverUse: {
    name: 'A k-d tree for embedding search',
    why: (
      <>
        It is the nearest-neighbor structure everyone learns, it is
        exact, and it is a live unit on this site because in two or
        three dimensions it is wonderful. The measurement here is the
        whole argument: on 2,000 points in 16 dimensions the exact
        tree search <strong>visited all 2,000 points</strong>, 100% of
        brute force, because in high dimensions the query&apos;s
        nearest-neighbor ball intersects nearly every split plane
        and no subtree can be skipped. Real embeddings are 384 to
        1,536 dimensions. The tree is not slower than the scan; it is
        the scan, plus the tree. Graph search does not ask a split
        plane for permission, which is why it is the structure that
        survived.
      </>
    ),
  },

  contest: {
    instance:
      '10-nearest-neighbor search over random 16-dimensional Gaussian points, 100 queries, exact brute force as the referee; currency: distance computations per query; the scaling table grows the index, the ablation table removes the heuristic piece by piece on 2,000 points',
    columns: ['recall@10', 'distances per query'],
    rows: [
      {
        method: 'Brute force (2,000 points)',
        values: ['1.000', '2,000'],
        verdict: 'the referee: every point, every time',
      },
      {
        method: 'k-d tree, exact',
        values: ['1.000', '2,000'],
        verdict: 'pruning never fires in 16 dimensions: the curse, measured',
      },
      {
        method: 'Flat graph (one layer)',
        values: ['0.993', '463'],
        verdict: 'parity with the hierarchy at this size: the layers pay off at millions',
      },
      {
        method: 'Nearest-M neighbor lists',
        values: ['0.955', '417'],
        verdict: 'the diversity rule removed: clumped links, lower recall',
      },
      {
        method: 'HNSW, ef = 1',
        values: ['0.843', '187'],
        verdict: 'the beam removed: pure greedy stops in the first dip',
      },
      {
        method: 'HNSW, ef = 48',
        isThisUnit: true,
        values: ['0.992', '487'],
        best: 0,
        verdict: '24.4% of brute force here, 13.6% at 4,000 points, 40.8% at 1,000',
      },
    ],
    source:
      'python solutions/hnsw_navigable_small_world_layers.py prints both tables and asserts: recall@10 at least 0.9 at 1,000, 2,000, and 4,000 points against exact brute force with the HNSW fraction of brute-force work falling 40.8% > 24.4% > 13.6%; layer sizes strictly decreasing and every degree under its cap; ef = 1 losing more than 0.1 recall; the flat graph within 30% of the hierarchy’s cost (parity, asserted as such); the k-d tree exact yet costing more than half the scan.',
  },

  figure: (
    <Figure
      id="fig-hnsw-layers"
      aspect="16 / 7"
      caption="Three layers of one graph. Every point is in the bottom layer; about one in M rises to each layer above, so the top is a sparse skeleton of long links. A query enters at the top, hops greedily to the neighbor nearest it until none is nearer, drops a layer, repeats, and at the bottom runs a beam search of width ef. Measured on 16-dimensional data: recall@10 of 0.987 at 13.6% of brute-force distances on 4,000 points; remove the beam and recall falls to 0.843; a flat graph costs about the same at this size; an exact k-d tree visits every point."
      cite={{
        text: 'Yu. A. Malkov, D. A. Yashunin, "Efficient and robust approximate nearest neighbor search using Hierarchical Navigable Small World graphs," IEEE TPAMI 42(4), 2020 (arXiv 2016). DOI 10.1109/TPAMI.2018.2889473.',
        href: 'https://doi.org/10.1109/TPAMI.2018.2889473',
      }}
    >
      <svg viewBox="0 0 640 290" role="img" aria-label="Three stacked layers of points with a greedy path descending from a sparse top layer to a dense bottom layer and ending at the query">
        {[[60, 30, 3, 'layer 2: sparse, long links'], [60, 110, 12, 'layer 1'], [60, 190, 40, 'layer 0: every point, short links']].map(([x0, y0, n, label], li) => (
          <g key={li}>
            <rect x={x0 - 20} y={y0 - 12} width="380" height="60" rx="8" fill="rgba(93,162,255,0.06)" stroke="rgba(154,165,189,0.35)" strokeWidth="1" />
            <text x={x0 - 12} y={y0 + 60} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">{label}</text>
            {[...Array(n).keys()].map((i) => (
              <circle key={i} cx={x0 + ((i * 97) % 340)} cy={y0 + ((i * 53) % 36)} r={li === 0 ? 5 : li === 1 ? 4 : 2.6} fill={li === 2 ? 'rgba(154,165,189,0.6)' : 'rgba(240,185,75,0.85)'} />
            ))}
          </g>
        ))}
        <path d="M 60 30 L 254 30 L 254 116 L 310 128 L 310 200 L 338 212 L 352 220" fill="none" stroke="#f0b94b" strokeWidth="2" strokeDasharray="6 3" />
        <circle cx="352" cy="220" r="6" fill="none" stroke="#62d98a" strokeWidth="2" />
        <text x="360" y="224" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="10">query</text>
        <text x="440" y="40" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">amber: greedy descent, one nearest hop per step</text>
        <text x="440" y="60" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="11">bottom: beam search, ef candidates</text>
        <text x="440" y="96" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">recall@10: 0.997 / 0.992 / 0.987</text>
        <text x="440" y="114" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">at 1,000 / 2,000 / 4,000 points</text>
        <text x="440" y="140" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">work vs brute force: 40.8% → 24.4% → 13.6%</text>
        <text x="440" y="170" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="10">ef = 1 (no beam): recall 0.843</text>
        <text x="440" y="186" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="10">nearest-M lists: recall 0.955</text>
        <text x="440" y="202" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">flat graph: 463 vs 487 (parity here)</text>
        <text x="440" y="218" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="10">k-d tree, 16 dims: all 2,000 visited</text>
        <text x="440" y="250" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">layer sizes 4,000 / 520 / 71 / 16 / 2 / 1</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'hnsw_navigable_small_world_layers.py',
  Viz: HnswViz,
  narration,
};
