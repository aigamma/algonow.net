import PerlinNoiseViz from '../viz/PerlinNoiseViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/perlin_noise_gradient_lattice_interpolation.py?raw';
import { narration } from './perlin-noise-gradient-lattice-interpolation.narration.js';

export const content = {
  given:
    'A texture, a terrain, a cloud, a flame: natural-looking variation at every point of a surface, computed on demand at any resolution, the same value every time it is asked, smooth at every scale, with no image stored anywhere.',
  task: 'Perlin noise. The algorithm: hash every integer lattice point to a pseudo-random unit gradient through a seeded permutation table, and define the noise at a point as the blend of the four surrounding corners’ gradients dotted with the offsets from those corners. The heuristic is gradient lattice interpolation (Perlin 1985, improved 2002): the surface is zero at every lattice point and leaves it with the prescribed slope, and the blend uses the quintic fade 6t⁵ − 15t⁴ + 10t³, whose first and second derivatives vanish at both ends, so neighboring cells join with continuous slope and curvature and the lattice never shows.',
  constraint:
    'Measured on a 256 × 256 lattice torus with eight unit gradients: exactly 0 at 16,384 of 16,384 grid points, slope equal to the hashed gradient to 1.0e-7. All 65,536 cell centers and 200,000 random points stay inside ±√2/2 = ±0.707107, attained exactly in 28 cells. Across 2,000 cell borders the slope jump is 2.7e-9 (quintic fade), 8.1e-5 (1985 cubic), 2.703 (linear, a crease; interior slopes reach 1.860); the curvature jump at h = 1e-4 is 0.0125 for the quintic (shrinking from 0.1241 at 1e-3) and 12.515 for the cubic (a step). FFT along lattice-periodic lines: 0.005% of the power above two cycles per cell, median frequency 0.301 cycles per cell against 0.199 (value noise) and 4.000 (white noise), 93.9% between a quarter cycle and two cycles along a lattice row. Simplex noise: 3 corners per sample against 4. Four octaves at halving amplitude stay inside the bound. 0.5 s.',

  origins: (
    <p>
      Ken Perlin wrote the first noise function in 1983 at MAGI, the studio
      that had just rendered <em>Tron</em>, because every surface the
      renderer produced looked machined; he published it inside &quot;An
      Image Synthesizer&quot; (<strong>SIGGRAPH 1985</strong>): random
      gradients on a lattice, zero at the lattice, blended with a cubic fade,
      driving marble, clouds, fire, and water from one function of position.
      It earned an Academy Technical Achievement Award in 1997.
      &quot;Improving Noise&quot; (<strong>SIGGRAPH 2002</strong>) replaced
      the cubic fade with the quintic 6t⁵ − 15t⁴ + 10t³ so curvature is
      continuous across cells, and the 256 random directions with the twelve
      edge directions of a cube. Simplex noise (2001) traded the hypercube
      for the simplex, n + 1 corners instead of 2<sup>n</sup>; Worley&apos;s
      cellular texture (1996) measures distances to scattered feature points
      instead; Musgrave, Kolb, and Mace (1989) stacked octaves into fractal
      terrain.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>lattice and its gradients</strong>: a seeded
      permutation of 0 to 255, doubled, hashes any integer point to one of
      eight unit directions in constant time, so the texture is defined
      everywhere and repeats only on a 256-cell torus.
      The referee is exact: <strong>0.0 at all 16,384 grid points
      tested</strong>, the finite-difference slope there equal to the hashed
      gradient to 1.0e-7, and with unit gradients the value never leaves
      ±√2/2 on 265,536 samples, hitting the bound in exactly the 28 cells
      whose gradients all point inward or all outward.
    </p>
  ),
  heurRole: (
    <p>
      Owns the <strong>blend between the corners</strong>. Each corner
      contributes its gradient dotted with the offset from that corner, and
      the four tilted planes are mixed with fade weights. The fade is the
      whole heuristic: with linear
      weights the cells meet in a crease, <strong>a slope jump of 2.703 at
      the borders</strong> where no interior slope exceeds 1.860; with the
      1985 cubic the slope joins (8.1e-5) but the curvature steps by 12.5;
      with the 2002 quintic both join, 2.7e-9 and 0.0125 shrinking with h.
    </p>
  ),

  picture: (
    <p>
      A rubber sheet pinned to a grid of pins that all stand at the same
      height, zero. At each pin a small card forces the sheet to leave at a
      prescribed tilt, pointing a random way. Between the pins the sheet
      rises where a tilt points up and dips where one points down, and
      because the pins are at zero the hills and valleys fall between the
      pins, never on them. The fade is the stiffness of the sheet: a floppy
      sheet (linear) folds in a visible crease along every line of pins; the
      right stiffness (quintic) rounds slope and curvature across the line so
      you cannot find the grid by looking. Stack sheets with twice the pins
      and half the height, and the range grows foothills and gravel.
    </p>
  ),

  steps: [
    <>
      <strong>Table:</strong> shuffle 0 to 255 with the seed and write the
      permutation twice; lattice point (i, j) hashes to gradient
      p[p[i &amp; 255] + (j &amp; 255)] &amp; 7.
    </>,
    <>
      <strong>Cell:</strong> floor the sample point to its cell and keep the
      fractional offsets t<sub>x</sub>, t<sub>y</sub> in [0, 1).
    </>,
    <>
      <strong>Corners:</strong> each corner contributes its gradient dotted
      with the offset from that corner: four tilted planes through zero.
    </>,
    <>
      <strong>Fade:</strong> u = 6t<sub>x</sub>⁵ − 15t<sub>x</sub>⁴ +
      10t<sub>x</sub>³ and v likewise; blend the bottom pair by u, the top
      pair by u, then the two results by v.
    </>,
    <>
      <strong>Octaves:</strong> add the noise at 2×, 4×, 8× the frequency
      with amplitudes 1/2, 1/4, 1/8 and divide by the amplitude sum; the base
      lattice stays exactly zero through every octave.
    </>,
    <>
      <strong>Verify:</strong> zero and the hashed slope at every lattice
      point; no sample outside ±√2/2; one-sided slopes and curvatures agree
      across borders; little measured power above two cycles per cell, not a strict frequency cutoff.
    </>,
  ],

  signals: [
    <>
      <strong>A field at any point, at any scale, without storage:</strong>{' '}
      a shader asking for a value per pixel, a terrain streamed as the camera
      moves, a volume of clouds.
    </>,
    <>
      <strong>Smooth but not boring:</strong> random enough to look natural,
      with no visible grid or seams, and the same value on every call, so the
      picture holds still between frames.
    </>,
    <>
      <strong>Control over scale:</strong> roughness dialed by adding
      octaves, and a continuous derivative for bump mapping and flow fields.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>value noise</strong>: the same lattice
      and fade with random heights at the corners instead of gradients.
      Measured, it is flat at every one of the 16,384 grid points (slope
      5.7e-8), so every hill and valley sits on the grid, and its median
      frequency is 0.199 cycles per cell against Perlin&apos;s 0.301: the
      blotchy look that gradients were invented to remove.
    </>
  ),

  strength: (
    <>
      <strong>A smooth, bounded, stateless function of position.</strong>{' '}
      Exactly zero at the lattice with the hashed slope; inside ±√2/2 on
      265,536 samples; slope jump 2.7e-9 and curvature jump 0.0125 across
      borders; 0.005% of the power above two cycles per cell.
    </>
  ),
  weakness: (
    <>
      <strong>The grid is still there if you know how to look.</strong> The
      spectrum has a small high-frequency tail and is not strictly band-limited or band-pass: along a generic line
      41.7% of the power sits below a quarter cycle per cell, because every
      cell carries a random mean. The axis and diagonal gradients leave a
      directional bias; cost is 2<sup>n</sup> corners per sample; and the
      texture repeats on the 256-cell torus.
    </>
  ),

  problem: 'Procedural texturing',
  problemSlug: 'procedural-texturing',
  rivals: [
    {
      name: 'Perlin noise × Gradient lattice interpolation',
      isThisUnit: true,
      algoName: 'Perlin noise',
      cost: '2ⁿ corner gradients per sample (4 in 2D), constant memory',
      wins: (
        <>
          <strong>0 at 16,384 of 16,384 grid points</strong>, slope equal to
          the gradient, inside ±√2/2 on 265,536 samples, border jumps 2.7e-9
          and 0.0125.
        </>
      ),
      costs: (
        <>
          41.7% of the power below a quarter cycle per cell along a generic
          line; 2ⁿ corners; a 256-cell repeat.
        </>
      ),
      when: 'Any shader or terrain that needs a smooth, bounded, stateless field: the default.',
    },
    {
      name: 'Simplex noise',
      algoName: 'Simplex noise',
      cost: 'n + 1 corners per sample (3 in 2D, 4 in 3D)',
      wins: (
        <>
          <strong>3 corners against 4</strong> here, 4 against 8 in 3D;
          radial kernels with no axis bias; smooth (slope jump 3.6e-4 at
          random points); range [−0.705, +0.706].
        </>
      ),
      costs: (
        <>
          A skew and a corner ordering per sample; a bound harder to reason
          about; patented until 2022.
        </>
      ),
      when: 'Three or more dimensions, or when the square lattice’s diagonal bias shows in your material.',
    },
    {
      name: 'Worley noise',
      algoName: 'Worley noise',
      cost: 'distances to the feature points of 9 neighboring cells (27 in 3D)',
      wins: (
        <>
          Cells, scales, cobblestones, cracked earth: the nearest-point
          distance F₁ and the difference F₂ − F₁ draw boundaries no gradient
          blend can.
        </>
      ),
      costs: (
        <>
          Creases along the cell edges by design; several distances sorted
          per sample; no clean derivatives.
        </>
      ),
      when: 'The material is made of cells with edges, not hills and valleys.',
    },
    {
      name: 'Diamond-square algorithm',
      algoName: 'Diamond-square algorithm',
      cost: 'O(N²) grid, filled once by recursive midpoint displacement',
      wins: (
        <>
          A whole fractal terrain in one pass of adds and random offsets; no
          hashing or fades; roughness is one exponent.
        </>
      ),
      costs: (
        <>
          Not a function of position: the grid must exist before any point
          can be read; creases along the subdivision axes; fixed size.
        </>
      ),
      when: 'An offline heightmap of known size, where a stored grid is fine.',
    },
  ],
  neverUse: {
    name: 'Linear interpolation in place of the fade',
    why: (
      <>
        Keep the lattice and the gradients but blend the corners with the raw
        offsets t instead of the quintic fade. Zero at the lattice still
        holds, so it looks right until you light it: the slope jumps by{' '}
        <strong>2.703 across cell borders</strong> while no slope inside any
        cell exceeds 1.860, so
        every border is a crease sharper than any feature of the surface, and
        every bump map shows the grid as a lattice of lines. The 1985 cubic
        fade removes the crease but leaves a curvature step of 12.5 in every
        second derivative, which is why the 2002 paper changed it. The other
        trap is white noise where coherent noise is wanted: 8.50 zero
        crossings per cell, 80% of the power above two cycles per cell, and no
        blur recovers a structure that was never there.
      </>
    ),
  },

  contest: {
    instance:
      'A 256 × 256 lattice torus with eight unit gradients; referees: exact zeros and slopes at 16,384 lattice points, the bound √2/2 on 265,536 samples, one-sided differences across 2,000 cell borders, FFTs of 4,096 samples along lattice-periodic lines',
    columns: ['at the grid points', 'slope jump at a border', 'power above 2 cycles per cell', 'median frequency (cycles per cell)', 'corners per sample'],
    rows: [
      {
        method: 'Perlin noise, quintic fade (2002)',
        isThisUnit: true,
        values: ['0 exactly, slope = gradient, 16,384 of 16,384', '2.7e-9 (curvature 0.0125, shrinking with h)', '0.005%', '0.301; 0.512 along a lattice row', '4'],
        best: 0,
        verdict: 'smooth to the second derivative, bounded, stateless',
      },
      {
        method: 'Perlin noise, cubic fade (1985)',
        values: ['0 exactly, slope = gradient', '8.1e-5 (curvature steps by 12.5)', 'same lattice', 'same lattice', '4'],
        verdict: 'no crease, but a curvature step the second derivative finds',
      },
      {
        method: 'gradients with linear interpolation',
        values: ['0 exactly', '2.703, a crease (interior slopes reach 1.860)', 'same lattice', 'same lattice', '4'],
        verdict: 'the grid as a lattice of lines',
      },
      {
        method: 'value noise, same lattice and fade',
        values: ['random heights; slope 5.7e-8, every grid point stationary', '3.6e-9', '0.002%', '0.199', '4'],
        verdict: 'smooth, but the hills sit on the grid',
      },
      {
        method: 'white noise, one hash per sample',
        values: ['no lattice', 'discontinuous everywhere', '80.1%', '4.000 (8.50 crossings per cell)', '1'],
        verdict: 'structureless; no blur recovers coherence',
      },
      {
        method: 'simplex noise',
        values: ['0 at its triangle vertices', '3.6e-4 at random points', 'not lattice-periodic', 'not lattice-periodic', '3'],
        verdict: 'one corner fewer, isotropic kernels',
      },
    ],
    source:
      'python solutions/perlin_noise_gradient_lattice_interpolation.py prints this table and asserts: exactly 0.0 at 16,384 lattice points with the slope matching the hashed gradient; every sample inside ±√2/2 and the extreme cells attaining it; border slope jumps below 1e-3 for the quintic and cubic fades and over 1,000× larger for linear weights; the quintic curvature jump shrinking fivefold from h = 1e-3 to 1e-4 while the cubic’s does not; power above two cycles per cell below 0.1%; a higher median frequency than value noise; white noise mostly above two cycles per cell with no lag-one correlation; 4 corners per sample for Perlin and 3 for simplex; every octave sum inside the bound.',
  },

  figure: (
    <Figure
      id="fig-gradient-lattice"
      aspect="16 / 7"
      caption="One-dimensional gradient noise across twelve cells. Green dots are the lattice points, all at zero; blue segments are the hashed slopes the surface must leave each point with; amber blends neighboring slopes with the quintic fade 6t⁵ − 15t⁴ + 10t³, whose slope and curvature vanish at both ends, so the pieces join without a kink; dashed red blends them with linear weights and creases at every lattice point (slope jump 2.703 in the two-dimensional file, where no interior slope exceeds 1.860). The 1985 cubic 3t² − 2t³ removes the crease but keeps curvature ±6 at the ends, the measured step of 12.5."
      cite={{
        text: 'K. Perlin, "An Image Synthesizer," SIGGRAPH 1985, Computer Graphics 19(3), 287 to 296. K. Perlin, "Improving Noise," SIGGRAPH 2002, ACM Transactions on Graphics 21(3), 681 to 682.',
        href: 'https://doi.org/10.1145/325165.325247',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="Gradient noise through twelve lattice points at zero, blended by the quintic fade and by linear weights">
        {(() => {
          const slopes = [0.9, -0.7, 0.4, -1.0, 0.8, -0.3, 0.6, -0.9, 0.2, 1.0, -0.5, 0.7, -0.4];
          const cells = slopes.length - 1;
          const lx = (x) => 30 + (x / cells) * 580;
          const quintic = (t) => t * t * t * (t * (t * 6 - 15) + 10);
          const noise1d = (x, fade) => {
            const i = Math.min(cells - 1, Math.floor(x));
            const t = x - i;
            const a = slopes[i] * t;
            const b = slopes[i + 1] * (t - 1);
            return a + fade(t) * (b - a);
          };
          const curve = (fade) => Array.from({ length: cells * 30 + 1 }, (_, k) => k / 30).map((x) => `${lx(x).toFixed(1)},${(140 - noise1d(x, fade) * 170).toFixed(1)}`).join(' ');
          return (
            <g fontFamily="ui-monospace, monospace" fontSize="9">
              <text x="30" y="20" fill="#9aa5bd" fontSize="10">one-dimensional gradient noise: zero at the lattice, hashed slopes, two blends</text>
              <line x1="30" y1="140" x2="610" y2="140" stroke="#9aa5bd" strokeOpacity="0.5" />
              <polyline points={curve((t) => t)} fill="none" stroke="#e2606c" strokeWidth="1.6" strokeDasharray="5 4" />
              <polyline points={curve(quintic)} fill="none" stroke="#f0b94b" strokeWidth="2.5" />
              {slopes.map((s, i) => (
                <g key={i}>
                  <line x1={lx(i) - 14} y1={140 + s * 49.2} x2={lx(i) + 14} y2={140 - s * 49.2} stroke="#5da2ff" strokeWidth="2" />
                  <circle cx={lx(i)} cy="140" r="3.5" fill="#62d98a" />
                </g>
              ))}
              <text x="30" y="258" fill="#f0b94b">amber: quintic fade, slope and curvature continuous, no crease</text>
              <text x="30" y="270" fill="#e2606c">dashed red: linear weights, a crease of 2.703 at every lattice point</text>
              <text x="610" y="258" fill="#5da2ff" textAnchor="end">blue: the hashed slopes</text>
              <text x="610" y="270" fill="#62d98a" textAnchor="end">green: exactly zero at the lattice</text>
            </g>
          );
        })()}
      </svg>
    </Figure>
  ),

  code,
  filename: 'perlin_noise_gradient_lattice_interpolation.py',
  Viz: PerlinNoiseViz,
  narration,
};
