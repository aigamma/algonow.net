import ComponentLabelingViz from '../viz/ComponentLabelingViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/connected_component_labeling_two_pass_union_find.py?raw';
import { narration } from './connected-component-labeling-two-pass-union-find.narration.js';

export const content = {
  given:
    'A binary image: foreground pixels on a background. Give every foreground pixel the number of the blob it belongs to, so that two pixels share a number exactly when a chain of touching foreground pixels joins them, under 4-connectivity (edge neighbors) or 8-connectivity (edges and corners), in a streaming read of the pixels.',
  task: 'Connected component labeling. The algorithm is the two-pass raster scan of Rosenfeld and Pfaltz (1966): pass one reads the pixels in reading order and gives each foreground pixel the label of an already-scanned neighbor (left, up, and for 8-connectivity the two upper diagonals), or a fresh provisional label when it has none; pass two rewrites every provisional label to its component’s final number. The heuristic is the union-find kept between the passes: when a pixel sees two different labels among its scanned neighbors (the two arms of a U meeting at the bottom), union them, and resolve every label with find; with path compression and union by rank each operation costs amortized near-constant time. Two streaming passes, no stack, no recursion, no pixel revisited.',
  constraint:
    'Measured on a 160 × 120 image of 60 random disks (5,520 foreground pixels): 28 components under 4-connectivity and 27 under 8, identical as a partition of pixels to an independent breadth-first flood fill, as were 80 random image-connectivity pairs and images of 10, 25, and 40 separated disks whose counts are known by construction. The two passes cost exactly 38,400 pixel visits against 41,280 and 63,360 for the flood fill (queue up to 30 and 50 pixels). Pass one created 179 provisional labels (4-connectivity) and 78 (8-connectivity) for 28 and 27 components; the union-find merged them with 151 and 51 unions and resolved 7,934 and 7,474 finds at 0.635 and 0.405 parent links per find. Unions always equal sets made minus components (asserted for every method): run-length labeling made 499 runs and spent 471 unions and 1,443 finds; union-find over raw pixels made 5,520 sets and spent 5,493 unions and 45,026 finds. A one-pixel-wide snake of 3,220 pixels: 11 provisional labels, 10 unions, a flood-fill queue never above 1, and a recursive flood fill needing depth 3,220, which raises RecursionError at Python’s default limit of 1,000. Diagonal stripes of period 3: 1,200 components under 4-connectivity (every pixel alone), 39 under 8. A single pass with no equivalence table: 60 labels for 30 U shapes and 78 for 27 blobs.',

  origins: (
    <p>
      Azriel Rosenfeld and John Pfaltz published the two-pass scheme in{' '}
      <strong>1966</strong> (&quot;Sequential Operations in Digital Picture
      Processing,&quot; Journal of the ACM 13(4)): one pass to hand out
      provisional labels and record which are equivalent, a second to
      rewrite them. Their equivalence table was a plain list, and much of the
      next three decades went into making that table cheap. The union-find
      structure is Galler and Fischer (1964), with Tarjan&apos;s near-constant
      amortized bound (1975); Dillencourt, Samet, and Tamminen (1992) made it
      a general connected-components method for any image representation,
      and Fiorio and Gustedt (1996) proved two union-find strategies that
      make the labeling linear time. He, Chao, and Suzuki (2008) labeled runs
      instead of pixels; Wu, Otoo, and Suzuki (2009) turned the 8-connected
      neighbor checks into a decision tree; Grana (2010) and Bolelli (2020)
      pushed that into block-based and generated decision trees, which is what
      OpenCV&apos;s labeling call runs today. The problem is everywhere a mask
      exists: cells on a slide, characters on a scanned page, the blobs in
      the edge map that puzzle 173 on this site produces.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>scan and the labels</strong>: reading order means a
      pixel&apos;s left neighbor and the pixels above it are already labeled,
      so the pass never looks forward and never comes back. The referee is an
      independent breadth-first flood fill compared as a{' '}
      <strong>partition of pixels</strong>, so label numbers cannot fake an
      agreement: 88 image-connectivity comparisons equal, counts of 10, 25,
      and 40 separated disks exact, 1,200 against 39 components on diagonal
      stripes under 4- and 8-connectivity, and exactly two visits per pixel
      (38,400) against the flood fill&apos;s 41,280 and 63,360.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>equivalences</strong>: 179 provisional labels became 28
      components through 151 unions, 7,934 finds followed 0.635 parent links
      each (8-connectivity: 78 labels, 51 unions, 7,474 finds, 0.405 links),
      which is path compression and union by rank doing their work. The
      honest comparison is the structure used alone: union-find over raw
      pixels made <strong>5,520 sets</strong> and spent 5,493 unions and
      45,026 finds for the same partition, so the provisional labels shrink
      the structure seventy-fold. Run-length labeling needs fewer finds
      (1,443 against 7,934) at the price of more unions (471 against 151) and
      a run table; the flood fill needs no union-find at all.
    </p>
  ),

  picture: (
    <p>
      A surveyor flying strips over an archipelago: east to west along one
      strip, then the next strip to the south, never turning back. Each time
      land appears under the plane with no named land beside it or just to
      the north, the surveyor names a new island. When a strip crosses a bay
      and the land on both sides already carries two different names, the
      surveyor writes one line in a ledger: these two names are one island.
      When the strips are done, the ledger is read once and every name on the
      chart is replaced by the island&apos;s final name. The ledger is the
      union-find: kept flat so a lookup is a hop or two, and it only ever
      joins names. Nothing in it is ever split.
    </p>
  ),

  steps: [
    <>
      <strong>Pass one, reading order:</strong> for each foreground pixel,
      look at the scanned neighbors: left and up, plus up-left and up-right
      for 8-connectivity.
    </>,
    <>
      <strong>Label it:</strong> no labeled neighbor, make a new set and a
      fresh provisional label; otherwise take the smallest neighbor label and
      union it with every different one.
    </>,
    <>
      <strong>Union-find:</strong> find follows parent links to the root and
      points every node on the path straight at it; union hangs the
      lower-rank root under the higher.
    </>,
    <>
      <strong>Pass two, reading order again:</strong> replace each label by
      the root find returns, numbering roots in first-seen order; those are
      the components.
    </>,
    <>
      <strong>Count the work:</strong> exactly two visits per pixel; unions =
      labels − components; finds = one per foreground pixel plus two per
      union call.
    </>,
  ],

  signals: [
    <>
      <strong>A raster you can stream in a fixed order:</strong> each
      element&apos;s already-seen neighbors form a small, fixed mask.
    </>,
    <>
      <strong>Equivalences discovered late:</strong> the arms of a U are named
      before anyone can know they are one shape; you need a memory that only
      merges.
    </>,
    <>
      <strong>No queue, no recursion, a table sized by labels:</strong> 78
      entries for 5,520 pixels; the 3,220-pixel snake that crashes a
      recursive fill costs 11 labels and 10 unions.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>breadth-first flood fill</strong> from
      every unlabeled foreground pixel: the referee here, 41,280 and 63,360
      visits with a queue up to 50 pixels; correct and simple, but every
      pixel is examined from each of its neighbors and a frontier must be
      stored.
    </>
  ),

  strength: (
    <>
      <strong>Exactly two streaming visits per pixel, with a tiny merge-only
      table.</strong> 38,400 visits where the flood fill spends up to 63,360;
      78 labels for 5,520 pixels, seventy times smaller than one set per
      pixel; no recursion and no queue, so the 3,220-pixel snake that raises
      RecursionError costs 11 labels and 10 unions.
    </>
  ),
  weakness: (
    <>
      <strong>The label count follows the shapes, not the components.</strong>{' '}
      179 labels for 28 blobs under 4-connectivity (every row where a blob
      widens on its left starts one), each a set and later a union; the
      second pass touches every pixel again; reading order is serial, so a
      parallel version labels strips and merges their borders; on long runs,
      run-length labeling does the job with a fifth of the finds (1,443).
    </>
  ),

  problem: 'Region labeling',
  problemSlug: 'region-labeling',
  rivals: [
    {
      name: 'Connected component labeling × Two-pass union-find',
      isThisUnit: true,
      algoName: 'Connected component labeling',
      cost: 'O(n α(n)): two passes over n pixels, near-constant per union and find',
      wins: (
        <>
          <strong>38,400 visits, two per pixel</strong>; 78 labels for 5,520
          pixels; the partition of the flood fill on 88 comparisons.
        </>
      ),
      costs: (
        <>
          A second full read; 179 labels for 28 blobs under 4-connectivity;
          serial by nature.
        </>
      ),
      when: 'Labeling every blob in a raster, streaming, with bounded memory and no stack: the default.',
    },
    {
      name: 'Flood fill',
      algoName: 'Flood fill',
      cost: 'O(n) visits with a frontier queue, one seed per blob',
      wins: (
        <>
          The referee; labels one region on demand from a seed; no
          equivalence bookkeeping at all.
        </>
      ),
      costs: (
        <>
          41,280 and 63,360 visits against 38,400; a queue up to 50 pixels;
          the recursive form needs depth 3,220 on the snake and dies at
          1,000.
        </>
      ),
      when: 'A paint bucket, one blob at a time, or a referee for a labeler.',
    },
    {
      name: 'Union-find',
      algoName: 'Union-find',
      cost: 'O(α(n)) per operation, one set per pixel',
      wins: (
        <>
          No labels to invent: 5,520 sets, 5,493 unions, the same 27
          components; one line per adjacency; works on any graph, not only a
          grid.
        </>
      ),
      costs: (
        <>
          45,026 finds against 7,474, 0.889 links each; a parent entry per
          pixel against 78.
        </>
      ),
      when: 'The pixels are vertices of an arbitrary graph, or adjacencies arrive in no order; puzzle 8 is the full lesson.',
    },
    {
      name: 'Run-length encoding',
      algoName: 'Run-length encoding',
      cost: 'O(n) to cut runs, then unions over runs (He, Chao, Suzuki 2008)',
      wins: (
        <>
          <strong>499 runs stand in for 5,520 pixels</strong>: 1,443 finds
          against 7,934; the pixel loop becomes a run loop.
        </>
      ),
      costs: (
        <>
          471 unions against 151 (one set per run); a run table per row; no
          gain on thin or noisy images where runs are a pixel long.
        </>
      ),
      when: 'Documents, masks, and anything with long horizontal runs.',
    },
  ],
  neverUse: {
    name: 'One raster pass with no equivalence table',
    why: (
      <>
        The version a learner writes first: each pixel takes the smallest
        label among its scanned neighbors and nothing is recorded when labels
        meet. It produced <strong>60 labels for 30 U shapes</strong>, two per
        U, because the arms were named at the top and only met at the bottom,
        after both had been written; on the 60 disks under 8-connectivity, 78
        labels for 27 blobs. The two-pass method made the same 60 provisional
        labels, then 30 unions repaired every U: the union-find is precisely
        the memory the single pass lacks, at near-constant cost per
        operation. Its cousin is recursive flood fill on a large image: on the
        3,220-pixel snake it raised RecursionError at Python&apos;s default
        limit of 1,000, where the two passes used 11 labels, 10 unions, and no
        stack at all.
      </>
    ),
  },

  contest: {
    instance:
      '160 × 120 image of 60 random disks, 5,520 foreground pixels, 28 components under 4-connectivity and 27 under 8; referee: an independent breadth-first flood fill compared as a partition of pixels, plus counts known by construction; one currency: pixel visits, sets made, unions, finds',
    columns: ['pixel visits (4 / 8)', 'sets made (4 / 8)', 'unions (4 / 8)', 'finds (4 / 8)'],
    rows: [
      {
        method: 'two-pass raster scan + union-find',
        isThisUnit: true,
        values: ['38,400 / 38,400 (two per pixel)', '179 / 78 labels', '151 / 51', '7,934 / 7,474 at 0.635 / 0.405 links'],
        best: 0,
        verdict: 'two streaming reads, a label-sized table',
      },
      {
        method: 'BFS flood fill (the referee)',
        values: ['41,280 / 63,360 (queue up to 30 / 50)', 'none', 'none', 'none'],
        verdict: 'simplest; a frontier queue; revisits from every neighbor',
      },
      {
        method: 'recursive flood fill',
        values: ['41,280 / 63,360', 'none', 'none', 'none; depth 597 / 573 here, 3,220 on the snake (RecursionError at 1,000)'],
        verdict: 'crashes on long regions',
      },
      {
        method: 'run-length labeling (He, Chao, Suzuki)',
        values: ['one run scan + one rewrite', '499 / 499 runs', '471 / 472', '1,443 / 1,455'],
        best: 3,
        verdict: 'fewest finds; one set per run',
      },
      {
        method: 'union-find over raw pixels',
        values: ['one scan + one rewrite', '5,520 / 5,520', '5,492 / 5,493', '25,588 / 45,026 at 0.824 / 0.889 links'],
        verdict: 'no labels to invent; thirty to seventy times the state',
      },
      {
        method: 'single pass, no equivalence table',
        values: ['19,200 (one read)', '78 labels for 27 blobs (8-connectivity)', 'none', 'none'],
        verdict: 'wrong: every U split in two',
      },
    ],
    source:
      'python solutions/connected_component_labeling_two_pass_union_find.py prints this table and asserts: the two-pass partition equal to the flood fill’s on every image under both connectivities (88 comparisons), with run-length labeling and union-find over pixels agreeing; 10, 25, and 40 separated disks counted exactly; visits exactly two per pixel; unions exactly sets made minus components for every method; parent links per find under 1.5; the recursive and queue fills examining the same neighbors; the snake one component needing recursion depth 3,220 and failing at a limit of 1,000; 1,200 against 39 components on the stripes; and the naive single pass splitting every U (60 labels for 30).',
  },

  figure: (
    <Figure
      id="fig-two-pass-labeling"
      aspect="16 / 7"
      caption="Left: pass one on a U shape in reading order under 4-connectivity. The left arm is labeled 1 and the right arm 2 before anyone can know they are one shape; the bottom row carries 1 to the corner, where the pixel sees 1 on its left and 2 above and fires union(1, 2), the amber cell; pass two reads the root of every label and writes one component. Right: sets made and finds spent on the 60-disk image under 8-connectivity, log scale: provisional labels shrink the union-find seventy-fold against one set per pixel, and run-length labeling trades fewer finds for more unions."
      cite={{
        text: 'A. Rosenfeld and J. L. Pfaltz, "Sequential Operations in Digital Picture Processing," Journal of the ACM 13(4), 1966. L. He, Y. Chao, and K. Suzuki, "A Run-Based Two-Scan Labeling Algorithm," IEEE Transactions on Image Processing 17(5), 2008. K. Wu, E. Otoo, and K. Suzuki, "Optimizing two-pass connected-component labeling algorithms," Pattern Analysis and Applications 12, 2009.',
        href: 'https://doi.org/10.1145/321356.321357',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="A U shape labeled by the first raster pass with two provisional labels and the union fired at its corner, beside a log-scale chart of sets made and finds spent by three labeling methods">
        {(() => {
          const cell = 24;
          const ox = 30;
          const oy = 44;
          const cols = 9;
          const rows = 7;
          const label = (x, y) => {
            if (x === 1 && y >= 1 && y <= 5) return 1;
            if (x === 7 && y >= 1 && y <= 4) return 2;
            if (y === 5 && x >= 2 && x <= 6) return 1;
            if (y === 5 && x === 7) return 'u';
            return 0;
          };
          const fill = (l) => {
            if (l === 1) return '#5da2ff';
            if (l === 2) return '#9aa5bd';
            return '#f0b94b';
          };
          const bars = [
            ['two-pass provisional labels', 78, 7474, '#5da2ff'],
            ['run-length labeling (runs)', 499, 1455, '#9aa5bd'],
            ['union-find over pixels', 5520, 45026, '#9aa5bd'],
          ];
          const bx = 330;
          const scale = (v) => (Math.log10(v) / Math.log10(50000)) * 230;
          return (
            <g fontFamily="ui-monospace, monospace">
              <text x={ox} y="22" fill="#9aa5bd" fontSize="10">pass one, reading order: left and up neighbors (4-connectivity)</text>
              {Array.from({ length: rows }, (_, y) => Array.from({ length: cols }, (_, x) => {
                const l = label(x, y);
                return (
                  <g key={`${x}-${y}`}>
                    <rect x={ox + x * cell} y={oy + y * cell} width={cell - 2} height={cell - 2} fill={l ? fill(l) : '#9aa5bd'} fillOpacity={l ? 0.9 : 0.12} />
                    {l ? <text x={ox + x * cell + 7} y={oy + y * cell + 16} fill="#0b0f17" fontSize="11">{l === 'u' ? '1' : l}</text> : null}
                  </g>
                );
              }))}
              <text x={ox} y={oy + rows * cell + 18} fill="#f0b94b" fontSize="10">amber: left is 1, up is 2, so union(1, 2); pass two writes one component</text>
              <text x={ox} y={oy + rows * cell + 34} fill="#9aa5bd" fontSize="10">a single pass with no table keeps both: 60 labels for 30 U shapes</text>
              <text x={bx} y="22" fill="#9aa5bd" fontSize="10">60 disks, 5,520 pixels, 8-connectivity (log scale)</text>
              {bars.map(([name, sets, finds, c], i) => (
                <g key={name}>
                  <text x={bx} y={52 + i * 64} fill={c} fontSize="10">{name}</text>
                  <rect x={bx} y={58 + i * 64} width={scale(sets)} height="12" fill={c} fillOpacity="0.85" />
                  <text x={bx + scale(sets) + 4} y={68 + i * 64} fill="#e9edf6" fontSize="9">{sets.toLocaleString()} sets</text>
                  <rect x={bx} y={74 + i * 64} width={scale(finds)} height="12" fill={c} fillOpacity="0.45" />
                  <text x={bx + scale(finds) + 4} y={84 + i * 64} fill="#e9edf6" fontSize="9">{finds.toLocaleString()} finds</text>
                </g>
              ))}
              <text x={bx} y="250" fill="#62d98a" fontSize="10">all three: the same 27 components as the flood fill</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'connected_component_labeling_two_pass_union_find.py',
  Viz: ComponentLabelingViz,
  narration,
};
