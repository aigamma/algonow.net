import CannyViz from '../viz/CannyViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/canny_edge_detector_hysteresis_thresholding.py?raw';
import { narration } from './canny-edge-detector-hysteresis-thresholding.narration.js';

export const content = {
  given:
    'A noisy grayscale image. Mark the pixels where the intensity changes sharply, as thin connected curves, without marking the noise, and without losing the faint stretch of an edge whose other end is strong.',
  task: 'Canny edge detector. The algorithm is Canny’s 1986 pipeline: smooth with a Gaussian, take the gradient with Sobel masks, keep only the pixels that are local maxima of gradient magnitude along the gradient direction (non-maximum suppression, which makes the edges one pixel thin), then decide which maxima are edges. The heuristic is hysteresis thresholding: two thresholds, not one. A pixel above the high threshold is an edge; a pixel above the low threshold is an edge only if it connects, through other above-low pixels, to one above the high threshold. Strong evidence anywhere on a contour lets the weak parts of the same contour through, while isolated weak responses, which is what noise produces, are dropped.',
  constraint:
    'Measured on a 96 × 96 image whose true edges are known by construction (a disk 120 levels above the background and a square whose brightness ramps from 30 to 120 above it, so its edges run from weak to strong), scored within one pixel: noiseless, Canny finds the 248 true boundary pixels with precision and recall 1.000, zero thick pixels, and 2 components. Under Gaussian noise of 8, 16, 24, and 40 levels its F1 is 1.000, 1.000, 0.980, 0.937 with 2 components every time; a single high threshold alone keeps precision 1.000 but recall 0.82 at every level, the weak edges lost (F1 0.90); the low threshold alone keeps recall but at noise 24 and 40 admits 297 and 751 pixels for 248 true (precision 0.80 and 0.33, in 26 and 131 fragments); thresholded Sobel magnitude without thinning is 99% thick (F1 0.83 to 0.86); Marr-Hildreth zero crossings reach recall 0.65 to 0.76 in 5 to 28 fragments. The hysteresis invariant held pixel by pixel: 193 strong and 48 weak pixels kept, every weak one connected to a strong one.',

  origins: (
    <p>
      John Canny (<strong>1986</strong>, &quot;A computational approach to
      edge detection,&quot; IEEE Transactions on Pattern Analysis and
      Machine Intelligence) set three criteria, good detection, good
      localization, and one response per edge, derived the optimal 1-D
      step detector under them (close to a Gaussian derivative), and added
      non-maximum suppression and hysteresis to turn the response into
      thin, connected edges. The Sobel operator (1968) supplies the
      gradient; Marr and Hildreth (1980) had proposed zero crossings of the
      Laplacian of Gaussian, the rival measured here; Deriche (1987) gave a
      recursive implementation. Canny&apos;s detector is the one in OpenCV,
      scikit-image, and MATLAB, and the standard first stage of contour,
      Hough (puzzle 153), and feature pipelines; its three criteria shaped
      how every later edge detector, learned ones included, is evaluated.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>pipeline</strong>: a Gaussian blur at σ = 1.4,
      Sobel gradients, magnitude and direction, and non-maximum
      suppression along the quantized gradient direction, which is what
      makes an edge one pixel thin: zero thick pixels noiseless and under
      4% at noise 40, where thresholded Sobel magnitude is 99% thick. The
      referee is a ground truth known by construction, the 248 boundary
      pixels of the clean shapes, scored within one pixel: noiseless,
      precision 1.000, recall 1.000, <strong>2 components for 2
      shapes</strong>.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>decision</strong>: high at half the strongest
      gradient, low at 40% of high, and connectivity between them. Measured
      against its two halves: the high threshold alone keeps precision
      1.000 but loses the square&apos;s faint edges at every noise level
      (recall 0.82, F1 0.90); the low threshold alone keeps them but at
      noise 40 admits 751 pixels for 248 true (precision 0.33, 131
      fragments). Hysteresis takes both: <strong>F1 0.937 at noise 40</strong>,
      193 strong pixels pulling 48 weak ones through, every weak one
      connected to a strong one, and no noise speck that was not.
    </p>
  ),

  picture: (
    <p>
      Tracing a faded coastline on an old map. Where the ink is dark you
      are sure it is coast; where it is faint it could be coast or a
      smudge. A single rule, &quot;dark enough,&quot; drops the faint
      stretches and leaves gaps; a single rule, &quot;any mark,&quot; traces
      every smudge. Hysteresis traces with two pens: wherever the line is
      dark, follow it, and keep following through the faint parts as long
      as they stay faintly visible; a faint mark that no dark line leads
      to is a smudge. One pixel wide, because you only ever mark the
      darkest line of a thick stroke.
    </p>
  ),

  steps: [
    <>
      <strong>Smooth:</strong> convolve with a Gaussian (σ = 1.4 here), the
      noise reduced about fivefold at the cost of some localization.
    </>,
    <>
      <strong>Gradient:</strong> Sobel masks give G<sub>x</sub>, G<sub>y</sub>;
      magnitude √(G<sub>x</sub>² + G<sub>y</sub>²) and direction atan2(G<sub>y</sub>, G<sub>x</sub>),
      quantized to four directions.
    </>,
    <>
      <strong>Thin:</strong> keep a pixel only if its magnitude is at least
      its two neighbors&apos; along the gradient (strict on one side, so a tie
      keeps one pixel): non-maximum suppression.
    </>,
    <>
      <strong>Two thresholds:</strong> mark pixels above high as strong; above
      low as candidates.
    </>,
    <>
      <strong>Hysteresis:</strong> breadth-first from every strong pixel
      through 8-connected candidates; what is reached is an edge, the rest
      is dropped.
    </>,
  ],

  signals: [
    <>
      <strong>Edges of varying contrast:</strong> shading, soft lighting, a
      boundary that fades along its length.
    </>,
    <>
      <strong>Noise you must not trace:</strong> sensor grain, texture,
      compression artifacts; one threshold cannot separate it from faint
      edges.
    </>,
    <>
      <strong>Thin, connected output wanted:</strong> contours for Hough,
      fitting, segmentation, or measurement, not a blurry gradient map.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>Sobel magnitude with one threshold</strong>:
      compute the gradient, keep what is above a number. F1 0.83 to 0.86
      and 99% of its pixels thick, because a blurred step is several pixels
      wide above any threshold.
    </>
  ),

  strength: (
    <>
      <strong>Thin, connected, and faithful to faint edges in noise.</strong>{' '}
      F1 1.000 noiseless and 0.937 at noise 40 with 2 components for 2
      shapes; recall 0.93 where a single high threshold holds 0.81; the
      hysteresis invariant proven pixel by pixel.
    </>
  ),
  weakness: (
    <>
      <strong>Three knobs and a blur.</strong> σ, high, and low are set by
      rules of thumb (half the peak, 40% of high here) that shift with
      the image; the Gaussian trades localization for noise (corners
      round, close edges merge); a weak edge with no strong anchor is
      still lost; and at noise 40 precision falls to 0.95 as a few speckles
      attach to true contours.
    </>
  ),

  problem: 'Edge detection',
  problemSlug: 'edge-detection',
  rivals: [
    {
      name: 'Canny edge detector × Hysteresis thresholding',
      isThisUnit: true,
      algoName: 'Canny edge detector',
      cost: 'a blur, a gradient, a thinning pass, a BFS',
      wins: (
        <>
          <strong>F1 0.937 at noise 40</strong>, 2 components, under 4% thick;
          weak edges rescued by their strong neighbors.
        </>
      ),
      costs: (
        <>
          Three parameters; a blur that rounds corners.
        </>
      ),
      when: 'Contours for a pipeline, in noise, with contrast that varies along an edge: the default.',
    },
    {
      name: 'Sobel operator',
      algoName: 'Sobel operator',
      cost: 'two 3 × 3 convolutions',
      wins: (
        <>
          The gradient itself, in a few lines; the first stage of Canny.
        </>
      ),
      costs: (
        <>
          Thresholded alone, 99% thick and F1 0.83 to 0.86; no thinning,
          no connectivity.
        </>
      ),
      when: 'You want a gradient map, not an edge map: shading, orientation, a feature for something else.',
    },
    {
      name: 'Marr-Hildreth',
      algoName: 'Marr-Hildreth',
      cost: 'a Laplacian of Gaussian and a zero-crossing scan',
      wins: (
        <>
          Closed contours by construction, no threshold on magnitude, one
          scale parameter; precision 0.99 to 1.00 up to noise 24.
        </>
      ),
      costs: (
        <>
          Recall 0.65 to 0.76 in 5 to 28 fragments once a slope test
          rejects the noise; zero crossings wander in flat regions.
        </>
      ),
      when: 'Scale-space analysis and blob-like structure, where closed contours matter more than localization.',
    },
    {
      name: 'Otsu thresholding',
      algoName: 'Otsu thresholding',
      cost: 'one histogram pass',
      wins: (
        <>
          Separates regions, not edges: a global threshold by between-class
          variance, then the region boundary is the edge.
        </>
      ),
      costs: (
        <>
          Bimodal images only; the ramped square here spans both modes and
          is cut in half.
        </>
      ),
      when: 'Two populations of intensity and you want regions; see puzzle 154.',
    },
  ],
  neverUse: {
    name: 'A single threshold on an image with faint and strong edges together',
    why: (
      <>
        The square&apos;s contrast runs from 30 to 120 gray levels along its
        edges. Set the one threshold high enough to reject noise 40 and the
        faint half of the square disappears: <strong>recall 0.81</strong> at
        every noise level, the contour broken where it fades. Set it low
        enough to keep the faint half and the noise comes with it:{' '}
        <strong>751 pixels for 248 true</strong>, precision 0.33, 131
        fragments. No single number separates a faint true edge from a
        loud noise pixel, because by magnitude they are the same thing. What
        separates them is that the true edge is attached to a strong one,
        and only a connectivity rule can read that.
      </>
    ),
  },

  contest: {
    instance:
      'a 96 × 96 image (a disk 120 levels above the background, a square ramping from 30 to 120 above it) under Gaussian noise of 8, 16, 24, and 40 levels; referee: the 248 boundary pixels of the clean shapes within one pixel; thick = edge pixels inside a filled 2 × 2 block; Canny thresholds: high at half the peak gradient, low at 40% of high',
    columns: ['F1 at noise 8 / 16 / 24 / 40', 'precision at 40', 'recall at 40', 'thick at 40', 'components at 40'],
    rows: [
      {
        method: 'Canny (NMS + hysteresis)',
        isThisUnit: true,
        values: ['1.000 / 1.000 / 0.980 / 0.937', '0.946', '0.927', '0.033', '2'],
        best: 0,
        verdict: 'thin, whole, and faithful',
      },
      {
        method: 'NMS + single high threshold',
        values: ['0.900 / 0.898 / 0.898 / 0.895', '1.000', '0.810', '0.000', '3'],
        verdict: 'the faint edges are gone',
      },
      {
        method: 'NMS + single low threshold',
        values: ['1.000 / 0.992 / 0.885 / 0.495', '0.330', '0.992', '0.011', '131'],
        verdict: 'the noise comes in',
      },
      {
        method: 'Sobel magnitude, single threshold',
        values: ['0.831 / 0.848 / 0.854 / 0.855', '0.904', '0.810', '0.994', '3'],
        verdict: 'the baseline: thick bands',
      },
      {
        method: 'Marr-Hildreth (LoG zero crossings)',
        values: ['0.865 / 0.833 / 0.785 / 0.789', '0.869', '0.722', '0.000', '28'],
        verdict: 'closed in theory, broken by the slope test',
      },
    ],
    source:
      'python solutions/canny_edge_detector_hysteresis_thresholding.py prints this table and asserts: noiseless F1 above 0.98 with under 2% thick pixels and exactly 2 components; the hysteresis invariant at every noise level (every kept pixel above low, every kept weak pixel 8-connected through kept pixels to a strong one); at each noise level Canny’s F1 above the single high threshold’s and not below the single low threshold’s, its recall more than 0.1 above the high threshold’s, its precision not below the low threshold’s, its thick fraction under 5% against over 50% for thresholded Sobel, and its F1 above Sobel’s; and at noise 40 the low threshold alone keeping more than twice the true pixel count with precision at least 0.2 below Canny’s while the high threshold alone falls below recall 0.9 and Canny stays above it.',
  },

  figure: (
    <Figure
      id="fig-canny-hysteresis"
      aspect="16 / 7"
      caption="Left: gradient magnitude along one edge of the ramped square, schematic, with the high and low thresholds drawn: the faint stretch sits between them, so a single high threshold drops it and a single low threshold would also admit noise peaks of the same height (gray spikes); hysteresis keeps the stretch because it connects to the strong part and drops the spikes because nothing strong leads to them. Right: F1 by noise level for Canny, the two single thresholds, and thresholded Sobel magnitude."
      cite={{
        text: 'J. Canny, "A computational approach to edge detection," IEEE Transactions on Pattern Analysis and Machine Intelligence 8(6), 1986, pp. 679-698, DOI 10.1109/TPAMI.1986.4767851. D. Marr and E. Hildreth, "Theory of edge detection," Proceedings of the Royal Society B 207, 1980.',
        href: 'https://doi.org/10.1109/TPAMI.1986.4767851',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="A gradient magnitude profile along an edge with high and low thresholds and noise spikes, and a chart of F1 by noise level for four methods">
        {(() => {
          const x0 = 40;
          const y0 = 220;
          const pw = 280;
          const ph = 170;
          const X = (t) => x0 + t * pw;
          const Y = (v) => y0 - v * ph;
          const profile = Array.from({ length: 61 }, (_, i) => {
            const t = i / 60;
            return `${X(t)},${Y(0.25 + 0.7 * t)}`;
          }).join(' ');
          const spikes = [[0.12, 0.42], [0.3, 0.38], [0.52, 0.45], [0.8, 0.4]];
          const bx = 380;
          const by = 230;
          const bw = 230;
          const bh = 170;
          const noises = [8, 16, 24, 40];
          const XN = (i) => bx + 20 + i * 62;
          const YF = (f) => by - ((f - 0.4) / 0.6) * bh;
          const series = [
            ['#5da2ff', [1.0, 1.0, 0.98, 0.937]],
            ['#f0b94b', [0.9, 0.898, 0.898, 0.895]],
            ['#e2606c', [1.0, 0.992, 0.885, 0.495]],
            ['#9aa5bd', [0.831, 0.848, 0.854, 0.855]],
          ];
          return (
            <g>
              <line x1={x0} y1={y0} x2={x0 + pw} y2={y0} stroke="#9aa5bd" strokeOpacity="0.6" />
              <line x1={x0} y1={Y(0.5)} x2={x0 + pw} y2={Y(0.5)} stroke="#5da2ff" strokeDasharray="4 3" />
              <line x1={x0} y1={Y(0.2)} x2={x0 + pw} y2={Y(0.2)} stroke="#f0b94b" strokeDasharray="4 3" />
              <text x={x0 + 4} y={Y(0.5) - 5} fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="9">high: half the peak</text>
              <text x={x0 + 4} y={Y(0.2) - 5} fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="9">low: 40% of high</text>
              <polyline points={profile} fill="none" stroke="#62d98a" strokeWidth="2.5" />
              {spikes.map(([t, v]) => <line key={t} x1={X(t)} y1={y0} x2={X(t)} y2={Y(v)} stroke="#9aa5bd" strokeWidth="2" />)}
              <text x={x0} y="22" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">gradient along the ramped edge (green) and noise peaks (gray)</text>
              <text x={x0} y={y0 + 16} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">weak edge: kept through its connection</text>
              <text x={x0} y={y0 + 30} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">to the strong end; the spikes have no such connection</text>
              <line x1={bx} y1={by} x2={bx + bw} y2={by} stroke="#9aa5bd" strokeOpacity="0.6" />
              {series.map(([c, vals]) => (
                <g key={c}>
                  <polyline points={vals.map((f, i) => `${XN(i)},${YF(f)}`).join(' ')} fill="none" stroke={c} strokeWidth="2" />
                  {vals.map((f, i) => <circle key={i} cx={XN(i)} cy={YF(f)} r="3" fill={c} />)}
                </g>
              ))}
              {noises.map((n, i) => <text key={n} x={XN(i) - 6} y={by + 14} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">{n}</text>)}
              {[0.5, 0.75, 1.0].map((f) => <text key={f} x={bx - 26} y={YF(f) + 3} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="9">{f.toFixed(2)}</text>)}
              <text x={bx} y="22" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">F1 by noise level</text>
              <text x={bx} y="36" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="10">Canny</text>
              <text x={bx + 50} y="36" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="10">high only</text>
              <text x={bx + 120} y="36" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="10">low only</text>
              <text x={bx + 185} y="36" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">Sobel</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'canny_edge_detector_hysteresis_thresholding.py',
  Viz: CannyViz,
  narration,
};
