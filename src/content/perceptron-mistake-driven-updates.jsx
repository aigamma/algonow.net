import PerceptronViz from '../viz/PerceptronViz.jsx';
import Figure from '../components/Figure.jsx';
import code from '../../solutions/perceptron_mistake_driven_updates.py?raw';
import { narration } from './perceptron-mistake-driven-updates.narration.js';

export const content = {
  given:
    '200 labeled points in the unit disk, the two classes on either side of an unknown direction with a gap of at least 0.4, 0.2, or 0.1 between them. Find a line that puts every point on its correct side.',
  task: 'Sweep the points in a random order. When the current line gets one wrong, add y x to the weights and y to the bias; when it gets one right, do nothing. Sweep again until a full pass makes no mistake. The final line is a sum of the points it got wrong, and Novikoff’s theorem bounds how many that can be: at most (R/γ)², with γ the widest margin any separator achieves.',
  constraint:
    'The margin γ is found by an independent sweep of 54,000 candidate directions; R = √2. Across 20 shuffles at each of three margins, every run separates the data exactly, with worst mistake counts of 10, 16, and 20 against bounds of 49, 179, and 698. The ablation that updates on every example, mistake or not, never converges: 12 errors after 200 passes on data the mistake rule separates in 2. Where no line exists (XOR by quadrant) the perceptron cycles forever, 20,868 mistakes in 200 passes and 92 of 200 points wrong at the end; on nearly separable data (10 flipped labels) it also never stops, and the averaged perceptron reads the same stream to a separator with 0 errors against the true labels where the last one has 7.',

  origins: (
    <p>
      Frank Rosenblatt published the perceptron in <strong>1958</strong>{' '}
      (Psychological Review) and built it as the Mark I at the Cornell
      Aeronautical Laboratory, a machine with potentiometers for
      weights and motors to turn them. Albert Novikoff proved in 1962
      that the mistake-driven rule converges after at most (R/γ)²
      mistakes whenever a margin γ exists, a bound this page
      measures against. Minsky and Papert&apos;s <em>Perceptrons</em>{' '}
      (1969) drew the limits, parity and XOR among them, and the
      field&apos;s funding went with it for a decade. Freund and
      Schapire (1999) revived the algorithm with the voted and averaged
      perceptron and the kernel trick; Collins (2002) made the
      structured perceptron a workhorse of natural language tagging;
      and the passive-aggressive family (Crammer et al. 2006) turned
      the same mistake-driven step into a margin-constrained one.
    </p>
  ),

  algoRole: (
    <p>
      Owns the <strong>update and the guarantee</strong>: on a
      mistake, w ← w + y x and b ← b + y. Novikoff&apos;s theorem: if
      a unit vector u separates the data with margin γ and every
      point has norm at most R, then however the points are ordered
      the number of mistakes is at most (R/γ)². Measured with γ
      from an independent 54,000-direction sweep and R = √2: at
      margins 0.4 / 0.2 / 0.1, γ = 0.203 / 0.106 / 0.054, bounds{' '}
      <strong>49 / 179 / 698</strong>, worst observed mistakes over 20
      shuffles <strong>10 / 16 / 20</strong>, every run ending with
      zero errors within 4 passes. The bound is loose by a factor of
      five to thirty, and it is a bound: the count never crossed it.
    </p>
  ),
  heurRole: (
    <p>
      Supplies the <strong>discipline of silence</strong>: points on
      the right side leave the weights alone. That is what makes the
      final separator a sum of the mistaken points, what makes the
      bound a count of mistakes rather than a count of steps, and what
      makes the algorithm stop. The ablation updates on every example
      with the same step: on the margin-0.4 data the mistake rule
      converged in 2 passes with 6 mistakes; the always-update rule
      was still <strong>12 errors wrong after 200 passes</strong>,
      dragged around by points it already had right. The same silence
      is the weakness: with no line to find, the rule never falls
      silent. XOR by quadrant: 20,868 mistakes in 200 passes, 92 of
      200 wrong at the end (no line does better). Ten flipped labels:
      5,138 mistakes, never converged, the last line 7 wrong against
      the truth; the averaged perceptron, the same stream averaged over
      every intermediate line, 0.
    </p>
  ),

  picture: (
    <p>
      A bouncer learning a dress code with no rulebook. Each guest who
      walks in is either waved through or turned away; the manager
      corrects only the wrong calls. On a wrong call the bouncer shifts
      the mental line a little toward that guest: turned away wrongly,
      the line moves to admit people like them; admitted wrongly, it
      moves to exclude. Right calls change nothing, and that is the
      point: the line is built entirely from the corrections, so the
      number of corrections is the whole cost. If a consistent dress
      code exists, the corrections run out, faster when the code is
      clear-cut and slower when the well-dressed and the badly-dressed
      look nearly alike. If no line can express the code, the
      corrections never end, and the bouncer&apos;s current opinion is
      just the echo of the last few guests.
    </p>
  ),

  steps: [
    <>
      <strong>Start:</strong> w = 0, b = 0; shuffle the points once and
      keep that order.
    </>,
    <>
      <strong>Predict:</strong> ŷ = sign(w · x + b) for the next
      point.
    </>,
    <>
      <strong>Mistake?</strong> if ŷ ≠ y: w ← w + y x, b ← b + y;
      otherwise touch nothing.
    </>,
    <>
      <strong>Stop:</strong> when a full pass makes no mistake; the
      line then separates every point.
    </>,
    <>
      <strong>Check:</strong> mistakes ≤ (R/γ)² with γ from an
      independent sweep; 60 of 60 runs under the bound.
    </>,
  ],

  signals: [
    <>
      <strong>Linearly separable data with a margin:</strong> the
      bound is finite and the run stops; the wider the margin, the
      sooner.
    </>,
    <>
      <strong>Streaming or online learning:</strong> one example at a
      time, constant memory, an update only when wrong.
    </>,
    <>
      <strong>A baseline before anything deeper:</strong> ten lines of
      code and a theorem; if this separates the data, a hidden layer
      is not the problem.
    </>,
  ],
  baseline: (
    <>
      The honest baseline is <strong>the same update fired on every
      example</strong>, the Hebbian instinct: it drags the line toward
      every point regardless of side, and on data the mistake rule
      separates in 2 passes it is still 12 errors wrong after 200.
      Silence on correct examples is not an optimization; it is the
      algorithm.
    </>
  ),

  strength: (
    <>
      <strong>A theorem you can watch.</strong> Every one of 60 runs
      separated its data under the Novikoff bound, worst 10 / 16 / 20
      mistakes against 49 / 179 / 698, within 4 passes; the update is
      one addition per mistake, needs no learning rate, and the final
      line is literally a sum of the points it got wrong.
    </>
  ),
  weakness: (
    <>
      <strong>No line, no stop.</strong> XOR by quadrant cycles forever
      (20,868 mistakes in 200 passes, 92 wrong at the end); ten flipped
      labels also never converge, and the line held when you stop is
      an echo of the last mistakes (7 wrong against the truth, where
      averaging gives 0). It finds a separator, not the best one: the
      max-margin line is the support vector machine&apos;s job, and the
      bound&apos;s slack (five to thirty times the observed count) says
      how loose the guarantee is.
    </>
  ),

  problem: 'Linear classification',
  problemSlug: 'classification',
  rivals: [
    {
      name: 'Perceptron × mistake-driven updates',
      isThisUnit: true,
      algoName: 'Perceptron',
      cost: 'one addition per mistake',
      wins: (
        <>
          <strong>Separates with a proven mistake bound</strong>, 60 of
          60 runs under (R/γ)², no learning rate, constant memory.
        </>
      ),
      costs: (
        <>
          Any separator, not the widest; never stops when no line
          exists.
        </>
      ),
      when: 'Separable or nearly separable data arriving one example at a time, and a baseline before anything deeper.',
    },
    {
      name: 'Support vector machine',
      cost: 'a quadratic program',
      wins: (
        <>
          The max-margin line, the γ this page had to find by a
          54,000-direction sweep, with a soft margin for noise.
        </>
      ),
      costs: (
        <>
          Solving the program (SMO) is far more than one addition per
          mistake, and needs a regularization constant.
        </>
      ),
      when: 'When the widest margin matters and the data fits in memory.',
    },
    {
      name: 'Logistic regression',
      cost: 'a convex fit, IRLS or gradient steps',
      wins: (
        <>
          Probabilities, not just sides; converges on inseparable data
          too, with regularization.
        </>
      ),
      costs: (
        <>
          Every example moves the fit, every pass; slower per example
          and a learning rate to choose.
        </>
      ),
      when: 'When you need calibrated probabilities or the data is not separable.',
    },
    {
      name: 'Passive-aggressive',
      cost: 'one closed-form step per example',
      wins: (
        <>
          The same online spirit with a margin: silent while the margin
          holds, an exactly sized step when it is violated.
        </>
      ),
      costs: (
        <>
          An aggressiveness constant to set; noisy examples can force
          large steps.
        </>
      ),
      when: 'Online learning where a margin, not just a side, must be maintained.',
    },
  ],
  neverUse: {
    name: 'Updating on every example',
    why: (
      <>
        The Hebbian instinct, measured: fire the same update on every
        example, right or wrong, and on the margin-0.4 data that the
        mistake rule separates in 2 passes with 6 updates, the line is
        still <strong>12 errors wrong after 200 passes</strong> and
        never converges. Every correctly classified point pulls the
        line toward itself, so the sum drifts toward the class
        centroids instead of the boundary, and the drift never ends
        because the correct points never fall silent. The perceptron
        is not &quot;add y x&quot;; it is &quot;add y x only when
        wrong,&quot; and the theorem lives in the second half.
      </>
    ),
  },

  contest: {
    instance:
      '200 points in the unit disk, two classes on either side of a random direction with a gap of 0.4, 0.2, or 0.1; 20 shuffles each; referee: the Novikoff bound (R/γ)² with γ from an independent 54,000-direction sweep and R = √2',
    columns: ['γ (margin found)', 'bound (R/γ)²', 'worst mistakes / passes'],
    rows: [
      {
        method: 'Perceptron, gap 0.4',
        isThisUnit: true,
        values: ['0.203', '49', '10 / 3'],
        best: 2,
        verdict: 'separated in all 20 shuffles, every count under the bound',
      },
      {
        method: 'Perceptron, gap 0.2',
        values: ['0.106', '179', '16 / 4'],
        verdict: 'the margin law: half the gap, more mistakes, a bound four times larger',
      },
      {
        method: 'Perceptron, gap 0.1',
        values: ['0.054', '698', '20 / 4'],
        verdict: 'still under the bound, which is now thirty times the count',
      },
      {
        method: 'Update on every example, gap 0.4',
        values: ['0.203', '49', '12 errors after 200 passes'],
        verdict: 'never converged: dragged by points it already had right',
      },
      {
        method: 'Perceptron, XOR by quadrant',
        values: ['none', '∞', '20,868 / 200, 92 wrong'],
        verdict: 'no line exists: cycles forever, near half wrong',
      },
      {
        method: 'Perceptron vs averaged, 10 flipped labels',
        values: ['none', '∞', '5,138 / 200: last 7 wrong, averaged 0'],
        verdict: 'never stops; the averaged line ignores the echo of the last mistakes',
      },
    ],
    source:
      'python solutions/perceptron_mistake_driven_updates.py prints this table and asserts: every one of 60 runs converges with zero errors and a mistake count at most (R/γ)²; worst counts and bounds both grow as the gap shrinks; the always-update ablation does not converge in 200 passes; XOR does not converge and ends near half wrong for both the last and the averaged line; with ten flipped labels the perceptron does not converge and the averaged line has fewer errors against the true labels than the last one.',
  },

  figure: (
    <Figure
      id="fig-perceptron-bound"
      aspect="16 / 7"
      caption="Two classes in the unit disk with a gap, the widest-margin direction u found by an independent sweep (γ = the smallest y (u · x)), and the perceptron’s final line, which is a sum of the points it got wrong (amber rings). Novikoff: mistakes ≤ (R/γ)². Measured at gaps 0.4 / 0.2 / 0.1: γ 0.203 / 0.106 / 0.054, bounds 49 / 179 / 698, worst mistakes 10 / 16 / 20 across 20 shuffles each; updating on every example never converges."
      cite={{
        text: 'A. B. J. Novikoff, "On convergence proofs on perceptrons," Symposium on the Mathematical Theory of Automata 12, 1962. F. Rosenblatt, "The perceptron: a probabilistic model for information storage and organization in the brain," Psychological Review 65(6), 1958. DOI 10.1037/h0042519.',
        href: 'https://doi.org/10.1037/h0042519',
      }}
    >
      <svg viewBox="0 0 640 280" role="img" aria-label="A disk of two-class points separated by a gap, the max-margin direction, the perceptron's line, and the bound formula">
        <circle cx="150" cy="140" r="110" fill="rgba(154,165,189,0.05)" stroke="rgba(154,165,189,0.35)" />
        {Array.from({ length: 70 }, (_, k) => {
          const r = Math.sqrt((k + 0.5) / 70) * 106;
          const a = k * 2.399963;
          const x = r * Math.cos(a);
          const yv = r * Math.sin(a);
          const s = (x * 0.866 + yv * 0.5) / 110;
          if (Math.abs(s) < 0.18) return null;
          return <circle key={k} cx={150 + x} cy={140 - yv} r="3" fill={s > 0 ? '#5da2ff' : '#e2606c'} />;
        })}
        <line x1="95" y1="45" x2="205" y2="235" stroke="#9aa5bd" strokeWidth="1" strokeDasharray="5 4" />
        <line x1="80" y1="50" x2="220" y2="230" stroke="#62d98a" strokeWidth="2.5" />
        <line x1="150" y1="140" x2="212" y2="104" stroke="#f0b94b" strokeWidth="2" />
        <text x="216" y="100" fill="#f0b94b" fontFamily="ui-monospace, monospace" fontSize="11">u, margin γ</text>
        <text x="60" y="262" fill="#62d98a" fontFamily="ui-monospace, monospace" fontSize="11">green: the perceptron’s line, a sum of its mistakes</text>
        <text x="330" y="60" fill="#e9edf6" fontFamily="ui-monospace, monospace" fontSize="12">mistakes ≤ (R / γ)², R = √2</text>
        <text x="330" y="96" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">gap 0.4: γ 0.203, bound 49, worst 10</text>
        <text x="330" y="114" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">gap 0.2: γ 0.106, bound 179, worst 16</text>
        <text x="330" y="132" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="11">gap 0.1: γ 0.054, bound 698, worst 20</text>
        <text x="330" y="164" fill="#5da2ff" fontFamily="ui-monospace, monospace" fontSize="11">60 of 60 runs: zero errors, under the bound</text>
        <text x="330" y="194" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">update on every example: 12 wrong at pass 200</text>
        <text x="330" y="212" fill="#e2606c" fontFamily="ui-monospace, monospace" fontSize="11">XOR: 20,868 mistakes, never stops</text>
        <text x="330" y="240" fill="#9aa5bd" fontFamily="ui-monospace, monospace" fontSize="10">10 flipped labels: last line 7 wrong, averaged line 0</text>
      </svg>
    </Figure>
  ),

  code,
  filename: 'perceptron_mistake_driven_updates.py',
  Viz: PerceptronViz,
  narration,
};
