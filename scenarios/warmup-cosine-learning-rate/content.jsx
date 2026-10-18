import LrScheduleViz from './visuals/LrScheduleViz.jsx';
import solutionSource from './python/src/lr_schedule/solution.py?raw';
import starterSource from './python/src/lr_schedule/starter.py?raw';
import answerSource from './python/src/lr_schedule/practice_answer.py?raw';
import lessonTests from './python/tests/test_lesson.py?raw';
import expectedOutput from './python/fixtures/expected-output.txt?raw';
import expectedPracticeOutput from './python/fixtures/expected-practice-output.txt?raw';
import scheduleFixture from './python/fixtures/schedule.json?raw';

// Authored by Claude Fable 5. Every number on this page was produced by running
// the files below; the expected outputs are the files' actual output, compared
// byte for byte by the tests.
const answerSnippet = answerSource.split('# --- answer begins ---\n')[1].split('# --- answer ends ---')[0].trim();

export const content = {
  brief: (
    <>
      <p>
        Orbit fine-tunes its support model with adapter weights. The last run diverged in its first twenty steps:
        the loss spiked and never recovered, because training began at the full learning rate on freshly
        initialized adapters and a fresh optimizer state. The fix is not a smaller rate everywhere. It is a
        schedule: climb to the peak over the first steps, then come down along a smooth curve.
      </p>
      <p>
        <strong>The action to practice:</strong> write the schedule as a pure function of the step, so it can be
        printed, tested, and plotted before a GPU minute is spent. The rules are small:
      </p>
      <ul>
        <li><strong>Warmup.</strong> For steps before <code>warmup_steps</code>, the rate is the peak scaled by <code>step / warmup_steps</code>: a straight line from 0 to the peak.</li>
        <li><strong>Decay.</strong> After warmup, <code>progress</code> is the fraction of the decay completed, from 0 to 1, and the rate is <code>peak * 0.5 * (1 + cos(pi * progress))</code>: the peak at progress 0, half the peak at 0.5, zero at 1.</li>
        <li><strong>Edges.</strong> A warmup that leaves no steps for the decay, a negative step, or a step past the end raises a <code>ValueError</code>. The function is defined through step 100 so the landing at zero is visible; a run of 100 updates uses steps 0 to 99.</li>
        <li><strong>Who reads it.</strong> The trainer calls the function every step and sets the optimizer&apos;s learning rate from it. In PyTorch the same function is handed to a lambda scheduler. This file is the schedule, not the trainer.</li>
      </ul>
      <p>
        <strong>Input.</strong> Three numbers, inline: 100 steps, 10 warmup steps, and a peak of 2e-4, which is
        0.0002 written in scientific notation (two times ten to the minus four).
      </p>
      <p>
        <strong>Expected output.</strong> <code>python solution.py</code> prints exactly this. The file holds its own
        input, so nothing else is needed:
      </p>
      <pre className="expected-output"><code>{expectedOutput}</code></pre>
    </>
  ),

  starter: (
    <>
      <p>
        Change one behavior. The worked solution starts the decay the moment warmup ends. Add a hold phase: keep
        the rate at the peak for <code>hold_steps</code> after warmup, and only then decay over the steps that
        remain. The file below is the worked solution with the parameter added and unused, and a check for the
        new behavior. As shipped it prints <code>NOT OK</code> and exits 1.
      </p>
      <p>
        <strong>Hint.</strong> The function gains one more early return, between the warmup branch and the decay:
        while the step is below <code>warmup_steps + hold_steps</code>, return the peak. The decay&apos;s{' '}
        <code>progress</code> must then start counting at the end of the hold and divide by the steps left after
        warmup and hold, so the decay still lands at zero on step 100. The guard at the top should reject a warmup
        plus hold that leaves no steps for the decay.
      </p>
      <p>
        <strong>Expected result.</strong> With a hold of 20 the peak is held from step 10 to step 30, the decay runs
        from 30 to 100, and its midpoint moves to step 65 at 1.00e-04. The table changes from step 20 on, and the
        file ends with <code>OK</code>.
      </p>
      <details>
        <summary>Show the answer</summary>
        <pre><code>{answerSnippet}</code></pre>
        <p>
          One new early return and two subtractions in the progress line. The order of the branches is the whole
          logic: warmup, then hold, then decay, each handled by the first condition that is true. Everything outside
          the marked region is the practice file unchanged.
        </p>
      </details>
    </>
  ),

  files: [
    { path: 'python/src/lr_schedule/solution.py', role: 'reference', language: 'python', source: solutionSource, primary: true,
      description: 'The complete worked example: the three parameters, learning_rate, and a demonstration that prints the table a trainer would follow, the peak step, the midpoint, the band check, a rejected warmup, and OK. Runs alone with Python 3.11 or newer.' },
    { path: 'python/src/lr_schedule/starter.py', role: 'starter', language: 'python', source: starterSource, primary: true,
      description: 'The practice file: the worked solution with a hold_steps parameter that is accepted but not used yet, and a check for the new behavior. Prints NOT OK until the hold phase is added.' },
    { path: 'python/src/lr_schedule/practice_answer.py', role: 'reference', language: 'python', source: answerSource,
      description: 'The completed practice variation; the page shows the region between its answer markers.' },
    { path: 'python/fixtures/expected-output.txt', role: 'fixture', language: 'text', source: expectedOutput,
      description: 'What solution.py prints, byte for byte. The test runs the file alone and compares.' },
    { path: 'python/fixtures/expected-practice-output.txt', role: 'fixture', language: 'text', source: expectedPracticeOutput,
      description: 'What practice_answer.py prints, byte for byte.' },
    { path: 'python/tests/test_lesson.py', role: 'test', language: 'python', source: lessonTests,
      description: 'Runs the three lesson files alone and checks the warmup line, the exact peak, the midpoint, the landing at zero, the band, the edges, the hold, and that the animation fixtures match the functions; measures the constant rate that shipped on the same run.' },
    { path: 'python/fixtures/schedule.json', role: 'fixture', language: 'json', source: scheduleFixture,
      description: 'The total steps, warmup steps, hold steps, and peak exactly as the lesson files define them; the animation runs on this copy and a test pins it to the files.' },
  ],

  evidence: (
    <>
      <p>
        <strong>What the file checks</strong> before it prints <code>OK</code>: the peak arrives exactly at step 10,
        the midpoint of the decay (step 55) is half the peak within 1e-12, step 100 is exactly 0.0, and no rate
        leaves the band between 0 and the peak over all 101 steps. Run your copy and compare its output with the
        expected output above; they must match line for line.
      </p>
      <p>
        <strong>The failure cases.</strong> A warmup of 100 steps in a run of 100 leaves nothing for the decay, so
        the function raises and the demonstration prints the rejected line. The tests also raise on a negative step
        and on step 101: a schedule asked about a step it does not cover should say so rather than extrapolate.
      </p>
      <p>
        <strong>The constant rate that shipped, measured on the same run.</strong> It puts the full 2e-4 on step 1;
        the schedule puts 2e-5 there, one tenth. Nothing in the schedule exceeds nine tenths of the peak before
        warmup ends. Over 101 steps the schedule&apos;s rates sum to 50 peaks (4.5 from the warmup line, 45.5 from the
        cosine, whose values above and below the midpoint cancel in pairs), against 101 peaks for the constant
        rate: a ratio of 2.02. Both facts are checked by the tests in the project download.
      </p>
    </>
  ),

  solution: (
    <>
      <p>
        Read the file top to bottom: one import, three constants, the one function, and a demonstration. Here is
        its Python, construct by construct.
      </p>
      <ol>
        <li>
          <strong>A module and its dot.</strong> <code>import math</code> brings in the standard-library math
          module, and <code>math.cos</code>, <code>math.pi</code> reach its contents with a dot. Nothing is
          installed. <code>2e-4</code> is an ordinary float literal in scientific notation; <code>0.0002</code> means
          the same number and is printed back as <code>2.00e-04</code> by the <code>:.2e</code> format.
        </li>
        <li>
          <strong>Guards first.</strong> Two <code>if</code> statements at the top raise <code>ValueError</code> with
          an f-string that names the bad value. A guard that runs before any arithmetic keeps the branches below
          free of special cases.
        </li>
        <li>
          <strong>An early return.</strong> <code>if step &lt; warmup_steps: return peak * step / warmup_steps</code>.
          The function leaves here for every warmup step, so the decay lines below never see those steps and need no{' '}
          <code>else</code>. A piecewise formula is a chain of early returns, one per piece, in order.
        </li>
        <li>
          <strong>True division.</strong> <code>step / warmup_steps</code> divides two integers and gives a float:
          5 / 10 is 0.5. The other operator, <code>//</code>, is integer division and would give 0 for every warmup
          step, so the whole warmup would sit at zero. The demonstration uses <code>//</code> on purpose where a
          whole step number is wanted: the midpoint is <code>10 + 90 // 2</code>.
        </li>
        <li>
          <strong>The formula, in parentheses.</strong> <code>progress = (step - warmup_steps) / (total_steps - warmup_steps)</code>{' '}
          is the fraction of the decay completed, and <code>peak * 0.5 * (1 + math.cos(math.pi * progress))</code> is
          the rate. The parentheses are the formula: the cosine of pi times progress runs from 1 down to -1, adding 1
          moves it to 2 down to 0, the 0.5 scales that to 1 down to 0, and the peak sets the units.
        </li>
        <li>
          <strong>A table as a list of tuples.</strong> <code>range(0, TOTAL_STEPS + 1)</code> counts 0 to 100, and{' '}
          <code>rows.append((step, rate))</code> stores a pair per step; the inner parentheses build the tuple.{' '}
          <code>for step, rate in rows:</code> unpacks each pair back into two names.
        </li>
        <li>
          <strong>Choosing what to print.</strong> <code>step % 10 == 0 or step == 5</code> keeps every tenth step
          and step 5, so the table shows the warmup line, the peak, and the decay without printing 101 rows.
        </li>
        <li>
          <strong>The highest value by a loop, the bounds by max and min.</strong> A loop that keeps the best pair
          seen so far finds the peak step; <code>max(rates)</code> and <code>min(rates)</code> take a plain list and
          return its largest and smallest values for the band check.
        </li>
        <li>
          <strong>Format specs.</strong> Inside an f-string, <code>:4</code> right-aligns a number in four columns,{' '}
          <code>:.2e</code> prints scientific notation with two decimals in the mantissa, and <code>:4.0%</code>{' '}
          multiplies by 100, prints no decimals, adds the sign, and pads to four characters. The columns line up
          because every row uses the same specs.
        </li>
      </ol>
      <p><strong>Trace the phases.</strong> Follow the printed steps from phase to rate:</p>
      <table>
        <thead><tr><th>step</th><th>phase</th><th>progress</th><th>rate</th><th>of peak</th></tr></thead>
        <tbody>
          <tr><td>0</td><td>warmup</td><td>0 / 10</td><td>0.00e+00</td><td>0%</td></tr>
          <tr><td>5</td><td>warmup</td><td>5 / 10</td><td>1.00e-04</td><td>50%</td></tr>
          <tr><td>10</td><td>decay</td><td>0 / 90 = 0.000</td><td>2.00e-04</td><td>100%</td></tr>
          <tr><td>30</td><td>decay</td><td>20 / 90 = 0.222</td><td>1.77e-04</td><td>88%</td></tr>
          <tr><td>55</td><td>decay</td><td>45 / 90 = 0.500</td><td>1.00e-04</td><td>50%</td></tr>
          <tr><td>80</td><td>decay</td><td>70 / 90 = 0.778</td><td>2.34e-05</td><td>12%</td></tr>
          <tr><td>99</td><td>decay</td><td>89 / 90 = 0.989</td><td>6.09e-08</td><td>0%</td></tr>
          <tr><td>100</td><td>decay</td><td>90 / 90 = 1</td><td>0.00e+00</td><td>0%</td></tr>
        </tbody>
      </table>
      <p>
        <strong>Why these decisions.</strong> Warmup exists because fresh adapter weights and a fresh optimizer
        state make the first gradients unreliable; a small rate lets the optimizer&apos;s running estimates settle
        before any step can do damage. Cosine decay spends most of the run near the peak, where learning happens,
        and lands softly, so the last steps refine instead of jolting. A pure function of the step can be printed
        and tested before training, plotted next to the loss afterwards, and resumed from any checkpoint by asking
        for that step. Raising on a bad step beats extrapolating because a trainer that silently kept a rate past
        the end would hide a wrong step count.
      </p>
      <p>
        <strong>The pattern, and its limits.</strong> A schedule is a pure function of progress, the same shape as
        exponential backoff and temperature annealing: compute where you are, apply the piece that covers it,
        return a number. Its limits: there is no floor, so the final steps barely move; there are no restarts;
        every parameter group gets the same rate; and the right peak still has to be found by a sweep, which the
        schedule only makes comparable.
      </p>
    </>
  ),

  visual: (
    <figure className="fig">
      <LrScheduleViz />
      <figcaption className="fig-cap">
        <span className="fig-caption-text">
          The schedule from the file, one thin bar per step at a reading pace: about three seconds per phase, under
          half a minute in all. The intro shows the constant rate that shipped as faint flat bars; the warmup bars
          rise in order; the decay fills in four spans while the caption states progress and the rate with the
          file&apos;s own numbers; the readout follows the cursor with the phase and the formula fragment that
          applies; then the practice variation holds steps 10 to 30 at the peak and re-shapes the decay. Step through
          with the buttons. Every rate comes from the same function run in the browser and is checked against the
          Python run.
        </span>
      </figcaption>
    </figure>
  ),

  tradeoffs: [
    {
      name: 'A constant rate (what shipped)',
      preferWhen: 'A tiny run, a well-conditioned model, or a sweep where the only question is which peak to try next and a spike is cheap to notice and restart.',
      cost: 'Step 1 gets the full rate on fresh adapters and a fresh optimizer; on this run the loss spiked within twenty steps. Over the same 101 steps it applies twice the total rate of the schedule and never lands softly.',
    },
    {
      name: 'Linear decay to zero',
      preferWhen: 'When simplicity wins: a straight line is easy to reason about, and for short fine-tunes it performs close to cosine.',
      cost: 'It leaves the peak immediately and at a constant pace, so fewer steps happen near the peak, and it ends abruptly rather than easing in. The same early-return shape applies; only the decay expression changes.',
    },
    {
      name: 'Cosine with restarts or a floor',
      preferWhen: 'Long runs where a periodic jump back toward the peak escapes plateaus, or when the final steps should still move and a minimum rate keeps them alive.',
      cost: 'More knobs: a cycle length, a multiplier per cycle, a floor. Each one needs a sweep of its own, and a restart in the wrong place undoes the soft landing.',
    },
  ],
};
