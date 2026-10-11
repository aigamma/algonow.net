import ComponentLabelingViz from '../viz/ComponentLabelingViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/connected_component_labeling_two_pass_union_find.py?raw';
import { narration } from './connected-component-labeling-two-pass-union-find.narration.js';

export const content = {
  given:
    'A binary image: foreground pixels on a background. Give every foreground pixel the number of its blob, so that two pixels share a number exactly when a chain of touching foreground pixels joins them, under 4-connectivity (edge neighbors) or 8-connectivity (edges and corners), in a streaming read of the pixels.',
  task: 'Connected component labeling. The algorithm is the two-pass raster scan of Rosenfeld and Pfaltz (1966): pass one reads the pixels in reading order and gives each foreground pixel the label of an already-scanned neighbor (left, up, and for 8-connectivity the two upper diagonals) or a fresh provisional label; pass two rewrites every label to its component’s final number. The heuristic is the union-find between the passes: when a pixel sees two different labels among its scanned neighbors (the arms of a U meeting at the bottom), union them; resolve labels with find; path compression and union by rank make each operation amortized near-constant. Two streaming passes, no stack, no recursion.',
  constraint:
    'Measured on a 160 × 120 image of 60 random disks (5,520 foreground pixels) under 4- and 8-connectivity, against an independent breadth-first flood fill compared as a partition of pixels: equal there, on 80 random image-connectivity pairs, and on images of 10, 25, and 40 separated disks with counts known by construction. Exactly 38,400 pixel visits, two per pixel; unions equal to sets made minus components for every method, asserted.',

  origins: (
    <p>
      Azriel Rosenfeld and John Pfaltz published the two-pass scheme in{' '}
      <strong>1966</strong>: one pass to hand out provisional labels and
      record which are equivalent, a second to rewrite them. The union-find of Galler and Fischer (1964), with Tarjan&apos;s
      near-constant bound (1975), made that table cheap; Dillencourt, Samet,
      and Tamminen (1992) made it a general connected-components method, and
      Fiorio and Gustedt (1996) proved the labeling linear time. He, Chao, and
      Suzuki (2008) labeled runs instead of pixels; Wu, Otoo, and Suzuki
      (2009) turned the 8-connected neighbor checks into a decision tree;
      Grana (2010) and Bolelli (2020) pushed that into block-based and
      generated trees, which is what OpenCV runs today. The problem is
      everywhere a mask exists: cells on a slide, characters on a page, the
      blobs in the edge map of puzzle 173.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>scan and the labels</strong>: in reading order a
      pixel&apos;s left neighbor and the pixels above it are already labeled,
      so the pass never looks forward or back. The referee is an independent
      flood fill compared as a <strong>partition of pixels</strong>, so label
      numbers cannot fake an agreement: 88 image-connectivity comparisons
      equal, counts of 10, 25, and 40 separated disks exact, 1,200 against 39
      components on diagonal stripes under 4- and 8-connectivity, and exactly
      two visits per pixel (38,400) against the flood fill&apos;s 41,280 and
      63,360.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>equivalences</strong>: 179 provisional labels became 28
      components through 151 unions; 7,934 finds followed 0.635 parent links
      each (8-connectivity: 78 labels, 51 unions, 7,474 finds, 0.405 links),
      path compression and union by rank at work. Used alone over raw pixels,
      the structure made <strong>5,520 sets</strong> and spent 5,493 unions
      and 45,026 finds for the same partition: the provisional labels shrink
      it seventy-fold. Run-length labeling needs fewer finds (1,443 against
      7,934) but more unions (471 against 151) and a run table; the flood
      fill needs no union-find at all.
    </p>
  ),

  picture: (
    <p>
      A surveyor flies strips over an archipelago, east to west, then the
      next strip south, never turning back. Land with no named land beside it
      or just north gets a new island name. When a strip crosses a bay and the
      land on both sides already carries two names, the surveyor writes one
      ledger line: these two names are one island. Afterwards the ledger is
      read once and every name on the chart becomes the island&apos;s final
      name. The ledger is the union-find: kept flat so a lookup is a hop or
      two, and it only ever joins names. Nothing in it is ever split.
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
      fresh label; otherwise take the smallest neighbor label and union it
      with every different one.
    </>,
    <>
      <strong>Union-find:</strong> find follows parent links to the root and
      points the path straight at it; union hangs the lower-rank root under
      the higher.
    </>,
    <>
      <strong>Pass two, reading order again:</strong> replace each label by
      the root find returns, numbering roots in first-seen order.
    </>,
    <>
      <strong>Count the work:</strong> two visits per pixel; unions = labels −
      components; finds = one per foreground pixel plus two per union call.
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
      visits with a queue up to 50 pixels; simple and correct, but every
      pixel is examined from each neighbor and a frontier must be stored.
    </>
  ),

  strength: (
    <>
      <strong>Exactly two streaming visits per pixel, with a tiny merge-only
      table.</strong> 38,400 visits where the flood fill spends up to 63,360;
      78 labels for 5,520 pixels; no recursion and no queue, so the
      3,220-pixel snake that raises RecursionError costs 11 labels and 10
      unions.
    </>
  ),
  weakness: (
    <>
      <strong>The label count follows the shapes, not the components.</strong>{' '}
      179 labels for 28 blobs under 4-connectivity (every row where a blob
      widens on its left starts one); the second pass touches every pixel
      again; reading order is serial, so a parallel version labels strips and
      merges their borders; on long runs, run-length labeling does the job
      with a fifth of the finds (1,443).
    </>
  ),

  problem: 'Region labeling',
  problemSlug: 'region-labeling',
  rivals: [
    {
      name: 'Connected component labeling × Two-pass union-find',
      isThisUnit: true,
      algoName: 'Connected component labeling',
      cost: 'O(n α(n)): two passes, near-constant per union and find',
      wins: (
        <>
          <strong>38,400 visits, two per pixel</strong>; 78 labels for 5,520
          pixels; the flood fill&apos;s partition on 88 comparisons.
        </>
      ),
      costs: (
        <>
          A second full read; 179 labels for 28 blobs under 4-connectivity;
          serial by nature.
        </>
      ),
      when: 'Labeling every blob in a raster, streaming, bounded memory, no stack: the default.',
    },
    {
      name: 'Flood fill',
      algoName: 'Flood fill',
      cost: 'O(n) visits with a frontier queue, one seed per blob',
      wins: (
        <>
          The referee; labels one region on demand from a seed; no
          equivalence bookkeeping.
        </>
      ),
      costs: (
        <>
          41,280 and 63,360 visits against 38,400; a queue up to 50 pixels;
          the recursive form needs depth 3,220 on the snake and dies at 1,000.
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
          components; works on any graph, not only a grid.
        </>
      ),
      costs: (
        <>
          45,026 finds against 7,474, 0.889 links each; a parent entry per
          pixel against 78.
        </>
      ),
      when: 'Pixels as vertices of an arbitrary graph, or adjacencies in no order; puzzle 8 is the full lesson.',
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
        U, because the arms were named at the top and only met at the bottom;
        on the 60 disks under 8-connectivity, 78 labels for 27 blobs. The two-pass method made the same 60 provisional
        labels, then 30 unions repaired every U: the union-find is precisely
        the memory the single pass lacks. Its cousin is recursive flood fill:
        the 3,220-pixel snake raised RecursionError at Python&apos;s default
        limit of 1,000, where the two passes used 11 labels, 10 unions, and no
        stack.
      </>
    ),
  },

  contest: {
    instance:
      '160 × 120 image of 60 random disks, 5,520 foreground pixels, 28 / 27 components under 4- / 8-connectivity; referee: an independent flood fill compared as a partition; one currency',
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
        method: 'flood fill (the referee)',
        values: ['41,280 / 63,360 (queue up to 30 / 50)', 'none', 'none', 'none'],
        verdict: 'simplest; a frontier queue; the recursive form needs depth 597 / 573 here and 3,220 on the snake (RecursionError at 1,000)',
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
      'python solutions/connected_component_labeling_two_pass_union_find.py prints this table and asserts every partition equality (88 comparisons), the exact disk counts, two visits per pixel, unions equal to sets made minus components, links per find under 1.5, the snake’s depth 3,220 and failure at 1,000, the stripe counts, and the split U shapes.',
  },

  figure: (
    <Figure
      id="fig-two-pass-labeling"
      aspect="16 / 7"
      caption="Left: pass one on a U shape under 4-connectivity: the arms get labels 1 and 2 before anyone can know they are one shape; at the corner the pixel sees 1 left and 2 above and fires union(1, 2), the amber cell. Right: sets made on the 60-disk image under 8-connectivity, log scale: 78 provisional labels against 499 runs and 5,520 pixel sets, seventy-fold smaller."
      cite={{
        text: 'A. Rosenfeld and J. L. Pfaltz, "Sequential Operations in Digital Picture Processing," J. ACM 13(4), 1966. L. He, Y. Chao, K. Suzuki, IEEE Trans. Image Processing 17(5), 2008. K. Wu, E. Otoo, K. Suzuki, Pattern Analysis and Applications 12, 2009.',
        href: 'https://doi.org/10.1145/321356.321357',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="Pass one on a U shape with two provisional labels and the union at its corner, beside a log-scale chart of sets made by three methods">
        <g fontFamily="ui-monospace, monospace" fontSize="10">
          <text x="30" y="22" fill="#9aa5bd">pass one, reading order: left and up neighbors</text>
          {['.........', '.1.....2.', '.1.....2.', '.1.....2.', '.1.....2.', '.111111u.', '.........'].map((row, y) => [...row].map((ch, x) => (
            <g key={`${x}-${y}`}>
              <rect x={30 + x * 24} y={44 + y * 24} width="22" height="22" fill={ch === '1' ? '#5da2ff' : ch === 'u' ? '#f0b94b' : '#9aa5bd'} fillOpacity={ch === '.' ? 0.12 : 0.9} />
              {ch !== '.' && <text x={37 + x * 24} y={60 + y * 24} fill="#0b0f17" fontSize="11">{ch === 'u' ? '1' : ch}</text>}
            </g>
          )))}
          <text x="30" y="230" fill="#f0b94b">amber: left is 1, up is 2, so union(1, 2)</text>
          <text x="30" y="246" fill="#9aa5bd">no table: 60 labels for 30 U shapes</text>
          <text x="330" y="22" fill="#9aa5bd">sets made: 60 disks, 5,520 pixels, 8-connectivity (log)</text>
          {[['two-pass provisional labels', 78, '#5da2ff'], ['run-length labeling (runs)', 499, '#9aa5bd'], ['union-find over pixels', 5520, '#9aa5bd']].map(([name, v, c], i) => (
            <g key={name}>
              <text x="330" y={56 + i * 60} fill={c}>{name}</text>
              <rect x="330" y={62 + i * 60} width={Math.log10(v) * 59} height="16" fill={c} fillOpacity="0.85" />
              <text x={334 + Math.log10(v) * 59} y={75 + i * 60} fill="#e9edf6">{v.toLocaleString()}</text>
            </g>
          ))}
          <text x="330" y="250" fill="#62d98a">all three: the flood fill&apos;s 27 components</text>
        </g>
      </svg>
    </Figure>
  ),

  code,
  filename: 'connected_component_labeling_two_pass_union_find.py',
  Viz: ComponentLabelingViz,
  narration,
};
