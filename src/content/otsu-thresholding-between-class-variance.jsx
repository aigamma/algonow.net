import OtsuViz from '../viz/OtsuViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/otsu_thresholding_between_class_variance.py?raw';
import { narration } from './otsu-thresholding-between-class-variance.narration.js';

export const content = {
  given:
    'A grayscale image of 128 × 128 pixels, objects on a background, both noisy, to be turned into a mask of object and not-object with one gray-level threshold. The truth is known because the image is synthesized from a known mask: background N(80, 15), objects N(160, 20), so the Bayes-optimal threshold and its error floor are computable.',
  task: 'Otsu’s method. Try every threshold t from 0 to 255 and choose the one that best separates the histogram into two classes. The heuristic is the criterion: between-class variance, the weighted squared distance between the two class means, ω₀ω₁(μ₀ − μ₁)², which is maximized exactly when the within-class variance is minimized, and which one pass over the 256-bin histogram evaluates for every threshold at once.',
  constraint:
    'Measured: at every threshold the within-class plus the between-class variance equals the total variance to 9e-13, so the argmax is the argmin; Otsu picks 121 where the Bayes threshold is 115, and its mask agrees with the truth on 98.45% of pixels against the Bayes mask’s 98.75%. The one-pass method costs 18,728 operations (a histogram pass plus 2,344 on 256 bins) where recomputing both classes from the 16,384 pixels at every threshold costs 7,798,784, for the same threshold. Under a 140-level illumination ramp no global threshold works (Otsu 69.1%, the best possible 83.6%); Sauvola’s local threshold with a 41-pixel window recovers 94.3% and a morphological top-hat followed by Otsu 97.8%. On overlapping classes N(100, 18) and N(150, 22), at 7.6% objects Otsu falls to 72.9% while the minimum-error threshold holds 95.9%; at 51.4% objects the minimum-error criterion finds a spurious tail minimum (48.6%) while Otsu holds 89.0%.',

  origins: (
    <p>
      Nobuyuki Otsu published the method in <strong>1979</strong> (IEEE
      Transactions on Systems, Man, and Cybernetics, &quot;A threshold
      selection method from gray-level histograms&quot;), framing
      thresholding as discriminant analysis on the histogram and
      showing that the between-class and within-class variances sum to
      a constant, so one is maximized when the other is minimized. It
      is the same criterion as k-means with two clusters in one
      dimension, exhaustively solved because there are only 256
      candidates. Kittler and Illingworth (1986) proposed fitting two
      Gaussians and minimizing the classification error instead;
      Niblack (1986) and Sauvola and Pietikäinen (2000) made the
      threshold local for document images; Kapur, Sahoo, and Wong
      (1985) maximized entropy. Otsu&apos;s remains the default
      &quot;auto threshold&quot; in ImageJ, OpenCV, scikit-image, and
      MATLAB, and its one-pass histogram form is the reason it costs
      nothing.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>exhaustive search</strong>: 256 candidates, every
      one evaluated, the best kept; nothing is approximated. The referee
      is the mask the image was made from. Otsu&apos;s threshold, 121,
      sits 6 levels from the Bayes threshold that the known Gaussians
      define, 115, and its mask is right on <strong>98.45%</strong> of
      pixels against the Bayes mask&apos;s 98.75%, within the error floor
      the noise sets. The algorithm also owns the identity that makes
      the criterion meaningful: at every one of the 256 thresholds the
      within-class variance plus the between-class variance equals the
      total variance, measured to 9e-13, so choosing the threshold that
      spreads the two class means farthest apart is the same as
      choosing the one that makes each class tightest.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>criterion in one pass</strong>. Between-class
      variance needs only the two class weights and means, and both are
      running sums over the histogram, so all 256 values come from one
      sweep of 256 bins: 2,344 operations after the histogram, against
      7,798,784 for recomputing the classes from the pixels at every
      threshold, the same answer 416 times cheaper. The criterion is
      also where the method breaks, and the file measures where. A
      140-level illumination ramp makes the histogram&apos;s two hills
      overlap and <strong>no global threshold reaches 84%</strong>;
      local thresholds or a background correction are needed, 94.3%
      and 97.8%. With classes that overlap and objects at 7.6% of the
      image, the criterion prefers to split the big background class,
      72.9%, where a minimum-error fit of two Gaussians holds 95.9%.
      And that rival has its own cliff: at 51.4% objects it finds a
      spurious minimum in the upper tail and scores 48.6% while Otsu
      holds 89.0%.
    </p>
  ),

  picture: (
    <p>
      A pile of coins to be sorted into two boxes by weight with one
      scale setting, and a table of how many coins there are at each
      weight. Rather than guess the cutoff, try every one: for each
      candidate, note the average weight of the light box and of the
      heavy box, and how far apart those averages are, weighted by how
      full each box is. The cutoff that pushes the two averages
      farthest apart is the one that makes each box most uniform,
      because the two measures add up to a fixed number. And the table
      makes the trial cheap: sliding the cutoff up one weight moves one
      row of coins from the heavy box to the light one, so the
      averages update in a single step.
    </p>
  ),

  steps: [
    <>
      <strong>Histogram:</strong> h[0..255] from one pass over the
      pixels; n = Σ h, total = Σ i · h[i].
    </>,
    <>
      <strong>Sweep:</strong> for t = 0 … 255 keep running ω₀ += h[t],
      s₀ += t · h[t]; then μ₀ = s₀ / ω₀, μ₁ = (total − s₀) / (n − ω₀).
    </>,
    <>
      <strong>Criterion:</strong> σ²<sub>b</sub>(t) = (ω₀/n)(ω₁/n)(μ₀ −
      μ₁)²; keep the t that maximizes it.
    </>,
    <>
      <strong>Mask:</strong> pixel &gt; t is object.
    </>,
    <>
      <strong>Check:</strong> the histogram is bimodal, the illumination
      flat, and the classes not tiny; otherwise correct the image or
      change the criterion.
    </>,
  ],

  signals: [
    <>
      <strong>A bimodal histogram under even light:</strong> scanned
      text, cells on a slide, parts on a belt; two hills and a valley.
    </>,
    <>
      <strong>No time to tune:</strong> one parameter-free pass; the
      &quot;auto&quot; button in every image tool.
    </>,
    <>
      <strong>A threshold as a first stage:</strong> before contours,
      connected components, or a watershed, when the mask only needs
      to be roughly right.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>the mean gray level as the
      threshold</strong>: no histogram, one pass. It matches Otsu on
      balanced classes (89.5% against 89.0%) and collapses when the
      classes are unequal, 61.2% at 7.6% objects, because the mean is
      pulled into the big class.
    </>
  ),

  strength: (
    <>
      <strong>Exact, parameter-free, and free.</strong> Six levels from
      the Bayes threshold at 98.45% of pixels, the identity holding to
      9e-13, 2,344 operations for all 256 candidates, and no knob
      anyone can set wrong.
    </>
  ),
  weakness: (
    <>
      <strong>One global cut, and a criterion that likes equal
      halves.</strong> Uneven illumination defeats every global
      threshold (83.6% at best here); small objects on a big background
      push the split into the background (72.9% at 7.6% objects on
      overlapping classes); the criterion assumes two classes, so a
      three-material image needs a multi-level extension; and it says
      nothing about noise, so the mask needs cleaning afterward.
    </>
  ),

  problem: 'Image binarization',
  problemSlug: 'image-segmentation',
  rivals: [
    {
      name: 'Otsu thresholding × Between-class variance',
      isThisUnit: true,
      algoName: 'Otsu thresholding',
      cost: 'one histogram pass + 256 bins',
      wins: (
        <>
          <strong>98.45% at 2,344 operations</strong>; no parameters; the
          identity proven on every threshold.
        </>
      ),
      costs: (
        <>
          Global only; fails under shading and on rare objects.
        </>
      ),
      when: 'Even lighting, a two-hill histogram, and no appetite for tuning.',
    },
    {
      name: 'Adaptive thresholding',
      algoName: 'Adaptive thresholding',
      cost: 'a window per pixel, from integral images',
      wins: (
        <>
          Sauvola&apos;s local rule tracks the illumination: 94.3% under
          the ramp that holds every global threshold under 84%.
        </>
      ),
      costs: (
        <>
          Window and k to set, a polarity assumption (dark objects on
          light), and noise in windows that hold one class only (86.4%
          at window 15).
        </>
      ),
      when: 'Documents and photographs with uneven light or a gradient.',
    },
    {
      name: 'Kittler-Illingworth thresholding',
      algoName: 'Kittler-Illingworth thresholding',
      cost: '256 bins with per-class variances',
      wins: (
        <>
          Fits two Gaussians and minimizes the error: 95.9% at 7.6%
          objects where Otsu falls to 72.9%.
        </>
      ),
      costs: (
        <>
          Spurious minima in the tails: 48.6% on balanced overlapping
          classes where Otsu holds 89.0%.
        </>
      ),
      when: 'A small object class on a large background, with roughly Gaussian classes.',
    },
    {
      name: 'k-means',
      algoName: 'k-means',
      cost: 'iterations × pixels, or × 256 on the histogram',
      wins: (
        <>
          Otsu with two clusters is exactly one-dimensional 2-means
          solved exhaustively; k-means extends to more levels and to
          color.
        </>
      ),
      costs: (
        <>
          Iterative and initialization-dependent where Otsu is exact;
          the same preference for equal-sized clusters.
        </>
      ),
      when: 'More than two gray levels or several channels to split at once.',
    },
  ],
  neverUse: {
    name: 'A global threshold under uneven light',
    why: (
      <>
        Add a smooth 140-level brightness ramp across the image and the
        object pixels on the dark side are darker than the background
        pixels on the bright side, so no single cut separates them:
        Otsu scores 69.1%, and{' '}
        <strong>the best global threshold that exists scores 83.6%</strong>,
        found by trying all of them against the truth, which no real
        pipeline can do. The failure is not Otsu&apos;s criterion but the
        premise that one number describes the whole image. Estimate the
        background first, with a morphological opening larger than any
        object and a top-hat subtraction, and the same Otsu sweep on the
        corrected image scores 97.8%; or let the threshold vary with a
        local window, 94.3%. The mask you want is a function of position
        whenever the light is.
      </>
    ),
  },

  contest: {
    instance:
      '128 × 128 synthetic images with a known mask; referees: the within + between = total identity at every threshold, the Bayes threshold of the known class Gaussians, and the true mask',
    columns: ['threshold', 'mask accuracy', 'note'],
    rows: [
      {
        method: 'Otsu, N(80, 15) vs N(160, 20), 51% objects',
        isThisUnit: true,
        values: ['121 (Bayes 115)', '98.45% (Bayes 98.75%)', '18,728 operations'],
        best: 1,
        verdict: 'within the noise floor',
      },
      {
        method: 'naive recomputation at every threshold',
        values: ['121', '98.45%', '7,798,784 operations'],
        verdict: 'the same answer, 416× the work',
      },
      {
        method: 'illumination ramp: Otsu / best global / Sauvola 41 / top-hat + Otsu',
        values: ['103 / · / local / 72', '69.1 / 83.6 / 94.3 / 97.8%', '26% objects'],
        verdict: 'no global cut survives shading',
      },
      {
        method: 'overlapping classes, 51.4% objects: Otsu / minimum-error / mean',
        values: ['127 / 227 / 125', '89.0 / 48.6 / 89.5%', 'Bayes 123 at 89.6%'],
        verdict: 'minimum-error finds a false tail minimum',
      },
      {
        method: 'overlapping classes, 20.3% objects',
        values: ['121 / 146 / 110', '88.8 / 90.7 / 76.8%', 'Bayes 134 at 92.9%'],
        verdict: 'both criteria a few points off',
      },
      {
        method: 'overlapping classes, 7.6% objects',
        values: ['109 / 152 / 103', '72.9 / 95.9 / 61.2%', 'Bayes 142 at 96.4%'],
        verdict: 'Otsu splits the big class; minimum-error holds',
      },
    ],
    source:
      'python solutions/otsu_thresholding_between_class_variance.py prints this table and asserts: the identity within 1e-6 at every threshold; Otsu within 6 levels of the Bayes threshold and above 97% with the Bayes mask no more than a point better; the naive method returning the same threshold at more than 200× the operations; under the ramp Otsu under 70% and the best global under 85%, Sauvola above 90% and top-hat plus Otsu above 95%; on overlapping classes Otsu under 80% and minimum-error above 95% at 7.6% objects, Otsu above 88% and minimum-error under 60% at 51%, both above 85% at 20%, and the mean threshold under 65% at 7.6%.',
  },

  figure: (
    <Figure
      id="fig-otsu-curve"
      aspect="16 / 7"
      caption="A two-hill histogram (background N(80, 15), objects N(160, 20)) with the between-class variance curve over every threshold. The curve peaks in the valley between the hills, at the threshold where the two class means are farthest apart weighted by class size, and at that same threshold the within-class variance is smallest, since the two sum to the total variance at every t (measured to 9e-13). The file’s Otsu threshold, 121, and the Bayes threshold, 115, are marked."
      cite={{
        text: 'N. Otsu, "A threshold selection method from gray-level histograms," IEEE Transactions on Systems, Man, and Cybernetics 9(1), 1979. DOI 10.1109/TSMC.1979.4310076. J. Kittler, J. Illingworth, "Minimum error thresholding," Pattern Recognition 19(1), 1986. J. Sauvola, M. Pietikäinen, "Adaptive document image binarization," Pattern Recognition 33(2), 2000.',
        href: 'https://doi.org/10.1109/TSMC.1979.4310076',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="A bimodal gray-level histogram with the between-class variance curve peaking in the valley, with Otsu's and the Bayes thresholds marked">
        {(() => {
          const x0 = 40;
          const y0 = 230;
          const w = 560;
          const h = 170;
          const gauss = (x, mu, sd) => Math.exp(-0.5 * ((x - mu) / sd) ** 2) / sd;
          const hist = Array.from({ length: 256 }, (_, i) => 0.49 * gauss(i, 80, 15) + 0.51 * gauss(i, 160, 20));
          const hmax = Math.max(...hist);
          const n = hist.reduce((a, b) => a + b, 0);
          const total = hist.reduce((a, c, i) => a + i * c, 0);
          const curve = [];
          let w0 = 0;
          let s0 = 0;
          for (let t = 0; t < 256; t++) {
            w0 += hist[t];
            s0 += t * hist[t];
            const w1 = n - w0;
            curve.push(w0 > 0 && w1 > 0 ? (w0 / n) * (w1 / n) * (s0 / w0 - (total - s0) / w1) ** 2 : 0);
          }
          const cmax = Math.max(...curve);
          const X = (i) => x0 + (i / 255) * w;
          return (
            <g>
              <line x1={x0} y1={y0} x2={x0 + w} y2={y0} stroke="#9aa5bd" strokeOpacity="0.5" />
              {hist.map((v, i) => (
                <rect key={i} x={X(i)} y={y0 - (v / hmax) * h * 0.75} width={w / 255 + 0.4} height={(v / hmax) * h * 0.75} fill={i <= 121 ? '#9aa5bd' : '#5da2ff'} fillOpacity="0.5" />
              ))}
              <polyline points={curve.map((v, i) => `${X(i)},${y0 - (v / cmax) * h}`).join(' ')} fill="none" stroke="#f0b94b" strokeWidth="2" />
              <line x1={X(121)} y1={y0} x2={X(121)} y2={y0 - h} stroke="#62d98a" strokeWidth="1.5" />
              <line x1={X(115)} y1={y0} x2={X(115)} y2={y0 - h} stroke="#e9edf6" strokeWidth="1" strokeDasharray="3 3" />
              <text x={X(121) + 6} y={y0 - h + 12} fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="10">Otsu t = 121 (curve maximum)</text>
              <text x={X(115) - 130} y={y0 - h + 30} fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="10">Bayes t = 115 (dashed)</text>
              <text x={X(60)} y={y0 - h * 0.78} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">background N(80, 15)</text>
              <text x={X(150)} y={y0 - h * 0.62} fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="10">objects N(160, 20)</text>
              <text x={X(180)} y={y0 - h * 0.98} fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="10">amber: between-class variance σ²ᵦ(t)</text>
              <text x={x0} y={y0 + 14} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">0</text>
              <text x={x0 + w - 20} y={y0 + 14} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">255</text>
              <text x={x0 + 200} y={y0 + 14} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">gray level t</text>
              <text x={x0} y={y0 + 32} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">within(t) + between(t) = total at every t, measured to 9e-13; mask accuracy 98.45% at 121, 98.75% at 115</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'otsu_thresholding_between_class_variance.py',
  Viz: OtsuViz,
  narration,
};
