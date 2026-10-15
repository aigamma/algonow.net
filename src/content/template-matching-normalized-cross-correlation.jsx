import TemplateMatchingViz from '../viz/TemplateMatchingViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/template_matching_normalized_cross_correlation.py?raw';
import { narration } from './template-matching-normalized-cross-correlation.narration.js';

export const content = {
  given:
    'A small reference patch and a larger scene captured under different lighting, with noise: where does the patch appear, to the pixel and below, and how do you know the answer is not a bright patch of nothing?',
  task: 'Template matching. The algorithm: slide the template over every position of the scene and score the window under it; the best score is the match. The heuristic is normalized cross-correlation (Lewis 1995): subtract each window’s mean and divide by the window’s and the template’s standard deviations, so the score is a correlation coefficient in [−1, 1] that ignores any positive gain and offset of the scene’s brightness, and read the window mean and variance from two summation tables in O(1) per position instead of O(template area). A variance floor refuses to score untextured windows; a quadratic fit over the 3 × 3 neighbourhood of the peak places the match below the pixel.',
  constraint:
    'Measured on 64 × 64 synthetic scenes with a 12 × 12 pattern planted at a known position (2,809 candidate positions): NCC is exactly 1.000000 at every exact copy and never leaves [−1, 1] on any map. With the scene’s brightness rescaled by a random gain (0.4 to 2.5) and offset (±60 grey levels), NCC finds the plant 24 of 24 times against 8 for the sum of squared differences, 6 for the sum of absolute differences, and 22 for raw correlation; under additive noise of σ = 80 grey levels NCC finds 6 of 6 where SSD finds 1. The summation-table map equals the direct map to 1.2 × 10⁻¹³ and replaces 404,496 window multiplications per match with 4,096 (one squared image), while an FFT numerator costs 1,441,792 multiplications against 404,496 for the direct dot products at this size. The quadratic peak fit lands 0.314 px from a planted fractional shift where the integer peak lands 0.640 px away. Rotating the planted pattern: 6 of 6 found at 0°, 5°, and 10°, then 0 of 6 at 15°; scaling it by 0.8 to 1.25: 6 of 6 at every scale. An untextured template with no variance floor is found 0 of 6 times with a mean peak of 0.26; the floor flags all 6; a flat 20 × 20 block in the scene floors exactly its 81 windows.',

  origins: (
    <p>
      Correlating a template against an image is as old as digital imagery:
      Anuta (<strong>1970</strong>) registered multispectral satellite frames
      by FFT cross-correlation, and Barnea and Silverman (1972) sped the scan
      up with the sequential similarity detection algorithm. The normalized
      form, a Pearson correlation per window, became the machine-vision
      standard because it survives lighting changes, and J. P. Lewis
      (<strong>1995</strong>, &quot;Fast Normalized Cross-Correlation&quot;)
      showed that the denominator, the expensive part, falls to O(1) per
      position with running-sum tables, with the numerator left to the FFT.
      Briechle and Hanebeck (2001) approximated the numerator with basis
      functions to speed it further; Brunelli&apos;s 2009 monograph surveys
      the field. NCC still drives alignment in inspection, stereo block
      matching, particle image velocimetry, and medical image registration.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>exhaustive scan</strong>: every one of the 2,809
      positions is scored, so the answer is the global best and nothing is
      skipped. The referee is the plant itself: the pattern was written into
      the scene at a known position, so every matcher&apos;s argmax is graded
      against the truth, under lighting change, under noise, under fractional
      shifts, and under the rotations and scalings that the model does not
      cover.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>score</strong>. Subtracting the window mean removes an
      offset, dividing by the standard deviations removes a positive gain, so the same
      pattern under a positive gain and any offset scores exactly 1:{' '}
      <strong>24 of 24 found against SSD&apos;s 8</strong>. The two summation
      tables make the mean and variance of any window four lookups each,{' '}
      <strong>4,096 multiplications</strong> for the squared image against
      404,496 per match for recomputing them window by window; the maps agree
      to 10⁻¹³. The honest count: at this size the FFT numerator (1,441,792)
      costs more than the direct dot products (404,496), so the speed on this
      page comes from the tables, not the transform.
    </p>
  ),

  picture: (
    <p>
      A stencil slid over a photograph under changing light. Hold the stencil
      and the photo up to the same lamp and dim them both to the same average
      brightness and the same contrast before you compare: now a patch that
      is merely brighter cannot impersonate the pattern, and a patch in
      shadow cannot hide it. The bookkeeper who keeps a running total of the
      photo&apos;s brightness and brightness squared can tell you any window&apos;s
      average and spread by subtracting four numbers, however large the
      window.
    </p>
  ),

  steps: [
    <>
      <strong>Template statistics once:</strong> its sum, its sum of squares,
      and its variance; refuse a template under the variance floor.
    </>,
    <>
      <strong>Two summation tables:</strong> running sums of the scene and of
      the scene squared, so any window&apos;s sum and sum of squares are four
      lookups each.
    </>,
    <>
      <strong>Numerator per position:</strong> the dot product of the window
      and the template (direct, or by FFT when the template is large and the
      scene transform is reused).
    </>,
    <>
      <strong>Normalize:</strong> NCC = (Σft − Σf·Σt/n) / √((Σf² − (Σf)²/n)(Σt² − (Σt)²/n));
      windows under the variance floor score 0.
    </>,
    <>
      <strong>Locate:</strong> argmax over the map, then a least-squares
      quadratic over the 3 × 3 neighbourhood for the sub-pixel peak.
    </>,
  ],

  signals: [
    <>
      <strong>The pattern keeps its shape but not its brightness:</strong>{' '}
      lighting, exposure, and gain differ between template and scene.
    </>,
    <>
      <strong>Translation only, or nearly:</strong> rotation under about ten
      degrees and scale within a quarter at this template size.
    </>,
    <>
      <strong>Many windows, one template:</strong> the two tables amortize
      the normalization over every position.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is the <strong>sum of squared differences</strong>:
      the maximum-likelihood matcher under Gaussian noise at fixed lighting,
      6 of 6 at σ = 40 like NCC, and 8 of 24 the moment the lighting moves.
    </>
  ),

  strength: (
    <>
      <strong>Exactly invariant to positive gain and offset, with a bounded score and
      O(1) normalization.</strong> 24 of 24 under random lighting, 6 of 6 at
      σ = 80, a correlation coefficient you can threshold, and 4,096
      multiplications where the naive denominator costs 404,496.
    </>
  ),
  weakness: (
    <>
      <strong>Translation only, and blind to texture-free templates.</strong>{' '}
      0 of 6 at 15° of rotation; a flat template gives a 0.26 peak at a
      random place unless the floor refuses it; the numerator is still
      O(template area) per position unless the FFT pays off.
    </>
  ),

  problem: 'Pattern localization',
  problemSlug: 'object-detection',
  rivals: [
    {
      name: 'Template matching × Normalized cross-correlation',
      isThisUnit: true,
      algoName: 'Template matching',
      cost: 'O(positions × template area) numerator, O(1) normalization per position',
      wins: (
        <>
          <strong>24 of 24 under new lighting</strong>, 6 of 6 at σ = 80; the
          score is a correlation coefficient; maps agree to 10⁻¹³.
        </>
      ),
      costs: (
        <>
          Translation only: 0 of 6 at 15°; the dot product is still paid at
          every position.
        </>
      ),
      when: 'A rigid pattern at a known orientation and scale under unknown lighting: inspection, alignment, stereo blocks.',
    },
    {
      name: 'Phase correlation',
      algoName: 'Phase correlation',
      cost: 'O(N² log N) for two FFTs and one inverse',
      wins: (
        <>
          One global translation in one shot, with the magnitude spectrum
          whitened so a sharp delta marks the shift.
        </>
      ),
      costs: (
        <>
          Whole-image shifts, not a small template in a cluttered scene; no
          per-window normalization.
        </>
      ),
      when: 'Registering two frames of the same content that moved as a whole.',
    },
    {
      name: 'SIFT',
      algoName: 'SIFT',
      cost: 'keypoints and 128-d descriptors, then matching',
      wins: (
        <>
          Rotation and scale invariant by construction, where NCC falls to 0
          of 6 at 15°.
        </>
      ),
      costs: (
        <>
          Needs textured keypoints; far heavier than one dot product per
          window; no dense score map.
        </>
      ),
      when: 'The object may appear rotated, rescaled, or partly occluded.',
    },
    {
      name: 'Hough transform',
      algoName: 'Hough transform',
      cost: 'O(edge pixels × parameter samples)',
      wins: (
        <>
          Finds parametric shapes (lines, circles) from edge votes without a
          pixel template at all.
        </>
      ),
      costs: (
        <>
          Only shapes with a few parameters; no appearance, no texture.
        </>
      ),
      when: 'The target is a geometric primitive rather than a picture.',
    },
  ],
  neverUse: {
    name: 'NCC for an object that may be rotated, or a template with no texture',
    why: (
      <>
        The same pattern planted with a rotation was found <strong>6 of 6
        times at 10° and 0 of 6 at 15°</strong>, with the peak falling from
        0.91 to 0.85 and then 0.49 at 45°: a bare pixel template has no
        notion of orientation, and the measured collapse is abrupt. And a
        template with no variance gives the formula zero over zero; with the
        floor removed, a near-flat template was found 0 of 6 times with a
        mean peak of 0.26 at a random position. Rotated or rescaled targets
        want features (SIFT) or a rotated template bank; untextured
        templates want to be refused before the scan, which the floor does
        6 of 6 times.
      </>
    ),
  },

  contest: {
    instance:
      '64 × 64 synthetic scenes, a 12 × 12 pattern planted at a known position, 2,809 candidate positions; 24 exact copies, 24 scenes under random gain (0.4 to 2.5) and offset (±60), 6 scenes at each noise level; the referee is the plant; one currency: multiplications per full match',
    columns: ['exact copy', 'gain + offset', 'noise σ = 80', 'multiplications per match'],
    rows: [
      {
        method: 'NCC, summation tables',
        isThisUnit: true,
        values: ['24/24', '24/24', '6/6', '4,096 + 404,496'],
        best: 3,
        verdict: 'invariant, bounded, O(1) normalization',
      },
      {
        method: 'NCC, direct per window',
        values: ['24/24', '24/24', '6/6', '808,992'],
        verdict: 'the same map to 10⁻¹³',
      },
      {
        method: 'NCC, FFT numerator',
        values: ['24/24', '24/24', '6/6', '1,441,792 + 4,096'],
        verdict: 'more work than direct at this size',
      },
      {
        method: 'sum of squared differences',
        values: ['24/24', '8/24', '1/6', '808,992 (shares the sums)'],
        verdict: 'the Gaussian-noise optimum, lighting-blind',
      },
      {
        method: 'sum of absolute differences',
        values: ['24/24', '6/24', '0/6', '404,496 subtractions'],
        verdict: 'cheap, lighting-blind',
      },
      {
        method: 'raw cross-correlation',
        values: ['24/24', '22/24', '2/6', '404,496'],
        verdict: 'prefers bright windows',
      },
    ],
    source:
      'python solutions/template_matching_normalized_cross_correlation.py prints this table and asserts: NCC within 10⁻⁹ of 1 at six exact copies and |NCC| ≤ 1 over every map; NCC 24 of 24 under gain and offset with SSD and raw correlation below 24; the table-plus-FFT map within 10⁻⁷ of the direct map with its argmax on the plant; the quadratic sub-pixel error below 0.6 of the integer error; 6 of 6 at 0° and under 2 at 45°; exactly 81 floored windows for the flat block and the flat template flagged 6 of 6 times.',
  },

  figure: (
    <Figure
      id="fig-ncc-lighting"
      aspect="16 / 7"
      caption="Left: of 24 scenes whose brightness was rescaled by a random gain and offset, how many times each score put its best window on the planted pattern. Normalized cross-correlation is exactly invariant to a positive gain and an offset; the sum of squared differences and the sum of absolute differences are not; raw correlation mostly survives because the pattern’s own dot product still dominates. Right: multiplications per full match on a log scale. The summation tables cut the normalization from 404,496 to 4,096; the FFT numerator costs more than the direct dot products at this scene size."
      cite={{
        text: 'J. P. Lewis, "Fast Normalized Cross-Correlation," Vision Interface, 1995. K. Briechle and U. D. Hanebeck, "Template matching using fast normalized cross correlation," Proc. SPIE 4387, 2001. R. Brunelli, Template Matching Techniques in Computer Vision, Wiley, 2009.',
        href: 'https://doi.org/10.1117/12.421129',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="Bar chart of hits under lighting change for four scores, beside a log-scale bar chart of multiplications per match for the direct and table-based normalizations and the direct and FFT numerators">
        {(() => {
          const hits = [['NCC', 24, '#5da2ff'], ['SSD', 8, '#9aa5bd'], ['SAD', 6, '#9aa5bd'], ['raw corr', 22, '#9aa5bd']];
          const mults = [['denominator direct', 404496, '#9aa5bd'], ['denominator tables', 4096, '#f0b94b'], ['numerator direct', 404496, '#9aa5bd'], ['numerator FFT', 1441792, '#e2606c']];
          const hgt = (v) => (Math.log10(v) / Math.log10(2000000)) * 170;
          return (
            <g fontFamily="ui-monospace, monospace">
              <text x="20" y="22" fill="#9aa5bd" fontSize="10">hits / 24 scenes; gain and offset varied</text>
              {hits.map(([name, v, c], i) => (
                <g key={name}>
                  <rect x={30 + i * 70} y={230 - v * 7.5} width="46" height={v * 7.5} fill={c} fillOpacity="0.85" />
                  <text x={30 + i * 70} y={230 - v * 7.5 - 5} fill={c} fontSize="10">{v}/24</text>
                  <text x={30 + i * 70} y="246" fill="#9aa5bd" fontSize="9">{name}</text>
                </g>
              ))}
              <text x="20" y="268" fill="#62d98a" fontSize="10">NCC at plant: 1 under positive gain + offset</text>
              <text x="340" y="22" fill="#9aa5bd" fontSize="10">mults (log): 2,809 windows, each 12 × 12</text>
              {mults.map(([name, v, c], i) => (
                <g key={name}>
                  <rect x={350 + i * 70} y={230 - hgt(v)} width="46" height={hgt(v)} fill={c} fillOpacity="0.85" />
                  <text x={350 + i * 70} y={230 - hgt(v) - 5} fill={c} fontSize="9">{v.toLocaleString()}</text>
                  <text x={350 + i * 70 - 6} y="246" fill="#9aa5bd" fontSize="7">{name}</text>
                </g>
              ))}
              <text x="340" y="268" fill="#f0b94b" fontSize="10">summed-area tables give the speedup</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'template_matching_normalized_cross_correlation.py',
  Viz: TemplateMatchingViz,
  narration,
};
