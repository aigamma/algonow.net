import HoughViz from '../viz/HoughViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/hough_transform_parameter_space_voting.py?raw';
import { narration } from './hough-transform-parameter-space-voting.narration.js';

export const content = {
  given:
    'An edge image of 200 × 200 pixels with three straight lines in it, each sampled as 40 edge points with 0.7 pixels of noise, buried in 200 clutter points. Find the lines: how many there are and where. Fitting one line to all the points is meaningless when there are several and most points belong to none; measured, it puts 6 of 320 points within 1.5 pixels of the result.',
  task: 'The Hough transform. Every edge point votes for every line that could pass through it, and lines are the cells of the parameter space with the most votes. The heuristic is the parametrization and the voting: lines as (ρ, θ) with ρ = x cos θ + y sin θ, so each point traces one sinusoid through a bounded accumulator, and a line’s points meet in one cell while clutter spreads its votes thin.',
  constraint:
    'Measured against the planted (ρ, θ) of every line, with 2 pixels and 2 degrees of tolerance: all three lines sit at the top of a 566 × 180 accumulator (1 px × 1°), with 101, 100, and 86 votes summed over each peak’s 3 × 3 neighborhood against 50 for the tallest clutter peak. Under 0 / 200 / 400 / 800 clutter points every line is still found, the weakest planted peak at 74 / 81 / 97 / 122 against the tallest clutter peak at 38 / 58 / 63 / 91. Resolution: 2° × 2 px bins (25,470 cells) gather 100 votes on the weakest line and localize within 0.8 px and 2°; 4° bins find only two of the three lines; 1° × 2 px finds all three at 130 votes and 0° error. Sequential RANSAC recovers 3 of 3 lines with 168,400 residual evaluations where the transform casts 57,600 votes.',

  origins: (
    <p>
      Paul Hough patented the method in <strong>1962</strong> (US
      3,069,654, &quot;Method and means for recognizing complex
      patterns&quot;) to find particle tracks in bubble-chamber
      photographs, voting in slope and intercept, a parameter space
      that is unbounded for vertical lines. Duda and Hart (1972,
      Communications of the ACM, &quot;Use of the Hough transformation
      to detect lines and curves in pictures&quot;) replaced it with
      the normal form (ρ, θ), bounded on both axes, which is the form
      every implementation uses. Ballard (1981) generalized the vote
      to arbitrary shapes through a lookup table of edge orientations;
      Kiryati, Eldar, and Bruckstein (1991) showed a random subset of
      the points suffices; Matas, Galambos, and Kittler (2000) made
      that progressive, which is the HoughLinesP in OpenCV. The same
      idea is the Radon transform in tomography, and it reappears
      wherever many noisy observations must agree on a few parameters:
      lane detection, document deskewing, and the circle finder in
      every lab microscope.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>vote</strong>: a line is not fitted to points
      but elected by them, and the election tolerates any number of
      abstentions. Each of the 320 points casts 180 votes, one per θ,
      and the accumulator is simply counted. The referee is the set of
      planted lines: all three are <strong>the three tallest peaks</strong>,
      each within 2 pixels of ρ and 2 degrees of θ, and the tallest
      peak that is not a line has half the votes of the weakest that
      is. The algorithm also owns its robustness curve, measured: with
      800 clutter points, twenty for every line point, the weakest line
      still out-polls the tallest clutter peak, 122 to 91, because
      clutter votes land in a different cell every time and line votes
      land in the same one. And it owns what least squares cannot: 6
      of 320 points near the single fitted line, against 40 near each
      elected one.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>parameter space and its grain</strong>. The
      normal form ρ = x cos θ + y sin θ bounds both axes, so the
      accumulator is a finite table (566 × 180 here) and a point&apos;s
      votes trace one sinusoid across it; two points&apos; sinusoids
      cross at the one line through both, forty points&apos; cross at
      one cell. The grain is the trade the file measures both ways.
      Pixel noise of 0.7 splits a line&apos;s 40 votes across adjacent
      cells, only 10 to 26 landing in the exact one, so peaks are read
      from 3 × 3 sums; 2° × 2 px bins gather 100 on the weakest line
      in a quarter of the cells; 4° bins let a line whose angle falls
      between bins spread its ρ over 7 pixels at the image edge and{' '}
      <strong>lose one of the three</strong>; 1° × 2 px gathers 130 and
      localizes θ exactly. Coarse bins collect, fine bins locate, and
      the smoothing is what lets the two be had together.
    </p>
  ),

  picture: (
    <p>
      A town meeting about where the new road should run. Every
      resident who has seen a stretch of it stands on the map and
      names every straight road that could pass through their spot;
      each naming is one vote in a ledger indexed by the road&apos;s
      direction and its distance from the town hall. A resident who saw
      nothing real votes for a full circle of roads, one each. But the
      residents who saw the same road all name it, among their many
      other guesses, and its line in the ledger fills up while every
      other line gets a scattering. Read the ledger&apos;s tallest
      entries and you have the roads, however many there are, and the
      confused residents never had to be identified.
    </p>
  ),

  steps: [
    <>
      <strong>Accumulator:</strong> θ in steps over [0°, 180°), ρ in
      steps over [−ρ<sub>max</sub>, ρ<sub>max</sub>]; all zeros.
    </>,
    <>
      <strong>Vote:</strong> for each edge point and each θ, ρ = x cos θ
      + y sin θ; increment the cell (ρ, θ).
    </>,
    <>
      <strong>Sum:</strong> each cell plus its 3 × 3 neighbors, so noise
      that split a line&apos;s votes is gathered back.
    </>,
    <>
      <strong>Peaks:</strong> cells above a threshold that are maxima
      in their neighborhood, with θ wrapping (ρ, θ) ≡ (−ρ, θ + 180°).
    </>,
    <>
      <strong>Verify:</strong> count the points within a pixel or two
      of each elected line; refit them by least squares if a precise
      line is wanted.
    </>,
  ],

  signals: [
    <>
      <strong>Several instances of a few-parameter shape:</strong>
      lines, circles, ellipses, where a fit needs to know which points
      belong to which.
    </>,
    <>
      <strong>More clutter than signal:</strong> votes from unrelated
      points spread thin; the transform never has to say which points
      are outliers.
    </>,
    <>
      <strong>A parameter space you can grid:</strong> two or three
      dimensions; the accumulator grows as the product of the
      resolutions.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>sequential RANSAC</strong>: fit one
      line from two random points, keep the largest consensus, remove
      it, repeat. It recovered 3 of 3 lines here, at 168,400 residual
      evaluations against the transform&apos;s 57,600 votes, and it needs
      to be told how many lines to look for.
    </>
  ),

  strength: (
    <>
      <strong>All the lines at once, from all the points, with no
      outlier decision.</strong> Three of three at the top of the
      accumulator within 2 px and 2°, still found under twenty clutter
      points per line point, and 57,600 votes against RANSAC&apos;s
      168,400 evaluations.
    </>
  ),
  weakness: (
    <>
      <strong>The accumulator is the cost, and the grain is a
      decision.</strong> Cells grow as the product of the resolutions
      (101,880 at 1° × 1 px) and votes as points × θ steps; each extra
      parameter multiplies both, which is why circles need a third axis
      and ellipses are out of reach; the bin size trades peak height
      against localization and can drop a line outright (4° bins:
      two of three); and the peaks give infinite lines, not segments,
      so the endpoints need a second pass over the points.
    </>
  ),

  problem: 'Line detection',
  problemSlug: 'shape-detection',
  rivals: [
    {
      name: 'Hough transform × Parameter-space voting',
      isThisUnit: true,
      algoName: 'Hough transform',
      cost: 'points × θ steps votes; cells = ρ steps × θ steps',
      wins: (
        <>
          <strong>3 of 3 lines at the top of the table</strong>, no
          outlier decision, 57,600 votes.
        </>
      ),
      costs: (
        <>
          A gridded parameter space; peaks split by noise and bins.
        </>
      ),
      when: 'Several lines or circles among clutter, and a parameter space of two or three dimensions.',
    },
    {
      name: 'RANSAC',
      algoName: 'RANSAC',
      cost: 'draws × points residuals per line',
      wins: (
        <>
          No accumulator, any model a minimal sample fixes, exact
          sub-pixel lines from the refit: 3 of 3 here.
        </>
      ),
      costs: (
        <>
          168,400 residual evaluations for three lines; one line at a
          time; needs the count or a stopping rule.
        </>
      ),
      when: 'One dominant model, or a model with too many parameters to grid.',
    },
    {
      name: 'Generalized Hough transform',
      algoName: 'Generalized Hough transform',
      cost: 'votes per edge point per table entry',
      wins: (
        <>
          Ballard&apos;s table of edge orientations lets any shape vote
          for its position, not only shapes with a formula.
        </>
      ),
      costs: (
        <>
          Scale and rotation add axes to the accumulator; the table
          needs a clean template.
        </>
      ),
      when: 'A known arbitrary outline to locate in clutter.',
    },
    {
      name: 'Line segment detector',
      algoName: 'Line segment detector',
      cost: 'linear in the pixels',
      wins: (
        <>
          Grows regions of aligned gradient and validates each segment
          statistically: endpoints included, no parameters to tune.
        </>
      ),
      costs: (
        <>
          Needs gradients from an image, not a point set; breaks long
          lines into pieces at gaps.
        </>
      ),
      when: 'Real photographs where segments, not infinite lines, are the answer.',
    },
  ],
  neverUse: {
    name: 'One least-squares line through all the points',
    why: (
      <>
        Least squares answers &quot;which single line is closest to
        these points&quot;, and when the points come from three lines and
        a cloud of clutter the answer is a line close to none of them.
        Measured on the 320 points: a line at ρ = 119, θ = 79° with{' '}
        <strong>6 points within 1.5 pixels of it</strong>, against 40 on
        each of the lines that are actually there. The squared residual
        makes every point pull, so the fit lands in the middle of
        everything; no threshold, weighting, or iteration rescues a
        method that assumes one model when the data holds three. The
        transform&apos;s vote is the opposite assumption: many models,
        each elected by its own supporters, and the losers never enter
        the arithmetic.
      </>
    ),
  },

  contest: {
    instance:
      '3 lines of 40 edge points (pixel noise 0.7) in a 200 × 200 image with 200 clutter points; referees: the planted (ρ, θ) of every line, 2 px and 2° tolerance; peaks read from 3 × 3 sums of the accumulator',
    columns: ['lines found', 'peak votes (weakest line / tallest clutter)', 'cost'],
    rows: [
      {
        method: 'Hough, 1° × 1 px (566 × 180 cells)',
        isThisUnit: true,
        values: ['3 of 3', '86 / 50', '57,600 votes'],
        best: 0,
        verdict: 'the three tallest peaks are the three lines',
      },
      {
        method: 'clutter 0 / 200 / 400 / 800',
        values: ['3 of 3 each', '74 / 38; 81 / 58; 97 / 63; 122 / 91', '·'],
        verdict: 'the margin narrows to 1.3× at 20 clutter per line point',
      },
      {
        method: 'bins 2° × 2 px / 4° × 1 px / 1° × 2 px',
        values: ['3 / 2 / 3 of 3', '100 / 58 / 130', '25,470 / 25,470 / 50,940 cells'],
        verdict: 'coarse θ bins lose a line between bins',
      },
      {
        method: 'sequential RANSAC, 200 draws per line',
        values: ['3 of 3 (38, 42, 35 inliers)', '·', '168,400 residual evaluations'],
        verdict: 'one line at a time, told to find three',
      },
      {
        method: 'least squares on all 320 points',
        values: ['0 of 3', '6 points within 1.5 px', '1 pass'],
        verdict: 'one model for three',
      },
    ],
    source:
      'python solutions/hough_transform_parameter_space_voting.py prints this table and asserts: every planted line among the peaks within 2 px and 2°, the three tallest peaks all planted lines, and the weakest planted peak more than 1.5× the tallest clutter peak; all lines found at 0, 200, and 400 clutter points with the tallest clutter peak rising with clutter; 1° and 2° bins finding all three lines and 4° bins fewer, with 2° × 2 px gathering at least as many votes as 1° × 1 px; sequential RANSAC recovering all three lines; and least squares on everything placing fewer than 20 points within 1.5 px of its line.',
  },

  figure: (
    <Figure
      id="fig-hough-sinusoids"
      aspect="16 / 7"
      caption="Left: six edge points, three on each of two lines. Right: each point’s votes in (θ, ρ) space form one sinusoid, ρ = x cos θ + y sin θ. The three sinusoids of a line’s points cross at one cell, the line’s (ρ, θ); the crossings are marked. Clutter would add sinusoids that cross the others once each, never three in the same cell. In the file, 40-point lines make peaks of 86 to 101 summed votes while 200 clutter points manage 50."
      cite={{
        text: 'R. O. Duda, P. E. Hart, "Use of the Hough transformation to detect lines and curves in pictures," Communications of the ACM 15(1), 1972. DOI 10.1145/361237.361242. P. V. C. Hough, "Method and means for recognizing complex patterns," US Patent 3,069,654, 1962. D. H. Ballard, "Generalizing the Hough transform to detect arbitrary shapes," Pattern Recognition 13(2), 1981.',
        href: 'https://doi.org/10.1145/361237.361242',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="Six edge points on two lines in a small image on the left; on the right their six sinusoids in theta-rho space crossing at two marked cells">
        {(() => {
          const lines = [
            { rho: 60, theta: 35, color: '#5da2ff' },
            { rho: 40, theta: 120, color: '#f0b94b' },
          ];
          const pts = [];
          for (const { rho, theta, color } of lines) {
            const th = (theta * Math.PI) / 180;
            for (const t of [-30, 5, 40]) {
              pts.push({ x: rho * Math.cos(th) - t * Math.sin(th), y: rho * Math.sin(th) + t * Math.cos(th), color });
            }
          }
          const ix = 30;
          const iy = 40;
          const isz = 200;
          const sc = isz / 100;
          const X = (v) => ix + (v + 10) * sc * 0.83;
          const Y = (v) => iy + (v + 10) * sc * 0.83;
          const ax = 300;
          const ay = 30;
          const aw = 320;
          const ah = 220;
          const rhoMax = 120;
          const AX = (theta) => ax + (theta / 180) * aw;
          const AY = (rho) => ay + ah / 2 - (rho / rhoMax) * (ah / 2);
          return (
            <g>
              <rect x={ix} y={iy} width={isz} height={isz} fill="none" stroke="#9aa5bd" strokeOpacity="0.4" />
              {lines.map((l, i) => {
                const th = (l.theta * Math.PI) / 180;
                const p1 = [l.rho * Math.cos(th) - 120 * Math.sin(th), l.rho * Math.sin(th) + 120 * Math.cos(th)];
                const p2 = [l.rho * Math.cos(th) + 120 * Math.sin(th), l.rho * Math.sin(th) - 120 * Math.cos(th)];
                return <line key={i} x1={X(p1[0])} y1={Y(p1[1])} x2={X(p2[0])} y2={Y(p2[1])} stroke={l.color} strokeOpacity="0.35" strokeDasharray="4 3" />;
              })}
              {pts.map((p, i) => <circle key={i} cx={X(p.x)} cy={Y(p.y)} r="4" fill={p.color} />)}
              <text x={ix} y={iy + isz + 16} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">image: six edge points, two lines</text>
              <rect x={ax} y={ay} width={aw} height={ah} fill="none" stroke="#9aa5bd" strokeOpacity="0.4" />
              {pts.map((p, i) => (
                <polyline key={`s-${i}`} fill="none" stroke={p.color} strokeOpacity="0.8" strokeWidth="1.2" points={Array.from({ length: 91 }, (_, k) => {
                  const theta = k * 2;
                  const th = (theta * Math.PI) / 180;
                  return `${AX(theta)},${AY(p.x * Math.cos(th) + p.y * Math.sin(th))}`;
                }).join(' ')} />
              ))}
              {lines.map((l, i) => <circle key={`c-${i}`} cx={AX(l.theta)} cy={AY(l.rho)} r="6" fill="none" stroke="#62d98a" strokeWidth="2" />)}
              <text x={ax} y={ay + ah + 16} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">θ: 0° to 180°</text>
              <text x={ax + aw - 60} y={ay + ah + 16} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">ρ ↑ (±120)</text>
              <text x={ax + 4} y={ay + 14} fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="10">green rings: where three sinusoids meet, the lines</text>
              <text x={ax + 4} y={ay + ah - 8} fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">file: 40-point lines 86 to 101 votes, 200 clutter points 50</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'hough_transform_parameter_space_voting.py',
  Viz: HoughViz,
  narration,
};
