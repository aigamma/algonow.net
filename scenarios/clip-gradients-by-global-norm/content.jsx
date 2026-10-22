import CodeBlock from '../../src/components/CodeBlock.jsx';
import GradClipViz from './visuals/GradClipViz.jsx';
import solutionSource from './python/src/grad_clip/solution.py?raw';
import starterSource from './python/src/grad_clip/starter.py?raw';
import answerSource from './python/src/grad_clip/practice_answer.py?raw';
import lessonTests from './python/tests/test_lesson.py?raw';
import expectedOutput from './python/fixtures/expected-output.txt?raw';
import expectedPracticeOutput from './python/fixtures/expected-practice-output.txt?raw';
import gradientsFixture from './python/fixtures/gradients.json?raw';

// Authored by Claude Fable 5 in the main thread. Every number on this page was
// produced by running the files below; the expected outputs are the files'
// actual output, compared byte for byte by the tests.
const answerSnippet = answerSource.split('# --- answer begins ---\n')[1].split('# --- answer ends ---')[0].trim();

export const content = {
  brief: (
    <>
      <p>
        Orbit&apos;s fine-tune ran for three hundred steps and then printed NaN for the loss, and every step after it.
        The run log showed what happened: one batch of unusually long, badly formatted tickets produced gradients
        about ten times larger than any batch before it, the optimizer took a step ten times as far as usual, and
        the weights landed somewhere the loss could not recover from. Nothing was wrong with the model or the
        learning rate on an ordinary batch; one batch was enough.
      </p>
      <p>
        <strong>The action to practice:</strong> clip the gradients by their global norm before the update, the
        operation a framework performs when you call its clip-grad-norm function. The rule is small:
      </p>
      <ul>
        <li><strong>Measure:</strong> the global norm is the length of all the gradients taken together, the square root of the sum of every squared value across every parameter group.</li>
        <li><strong>Compare:</strong> if the norm is at or under the maximum, nothing changes. The scale is <code>min(1, max_norm / norm)</code>.</li>
        <li><strong>Scale:</strong> every gradient value is multiplied by that one factor, so the clipped gradients are exactly <code>max_norm</code> long and point the same way.</li>
        <li><strong>Update:</strong> each parameter moves against its clipped gradient by the learning rate, as before.</li>
      </ul>
      <p>
        <strong>Input.</strong> The gradients of one training step, written inline as three parameter groups of
        plain numbers (a real model has millions, in tensors; three groups of five values show every step), the
        parameters in the same shape, a maximum norm of 5.0, a learning rate of 0.1, and an ordinary batch for
        comparison. The squares decide everything:
      </p>
      <table>
        <thead><tr><th>group</th><th>gradients</th><th>squares</th><th>sum</th></tr></thead>
        <tbody>
          <tr><td>1</td><td>3.0, 4.0</td><td>9, 16</td><td>25</td></tr>
          <tr><td>2</td><td>0.0, 12.0</td><td>0, 144</td><td>144</td></tr>
          <tr><td>3</td><td>1.0</td><td>1</td><td>1</td></tr>
        </tbody>
      </table>
      <p>
        The sum of all the squares is 170, so the global norm is the square root of 170, which is 13.0384. The
        ordinary batch is the same three groups divided by ten: 0.3, 0.4, 0.0, 1.2, 0.1, with a norm of 1.3038.
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
        Change one behavior. The worked solution clips all the gradients together, by their global norm. Make{' '}
        <code>clip_by_group_norm</code> clip each parameter group on its own instead: one norm and one scale per
        group, each group bounded by the maximum by itself. The file below is the worked solution with that function
        present but still clipping by the global norm, and a check for the new behavior. As shipped it prints{' '}
        <code>NOT OK</code> and stops.
      </p>
      <p>
        <strong>Hint.</strong> Loop over the groups. The norm of one group is <code>global_norm([group])</code>, a
        list holding just that group; the scale is the same <code>min</code> as before, with that norm. Append the
        scaled group, its norm, and its scale to three lists, and return the three lists.
      </p>
      <p>
        <strong>Expected result.</strong> Group 1 has a norm of exactly 5.0, so it is left as it is; group 2 has a
        norm of 12.0 and is scaled by 0.4167 to <code>[0.0, 5.0]</code>; group 3 is untouched. The global norm of
        the result is 7.1414, over the maximum of 5.0: each group is bounded, the whole is not, and the parameter
        step is 0.7141, between the clipped 0.5000 and the unclipped 1.3038. The file ends with <code>OK</code>.
      </p>
      <details>
        <summary>Show the answer</summary>
        <CodeBlock filename="Practice answer" code={answerSnippet} />
        <p>
          The same four lines as the worked function, inside a loop over the groups, with the norm taken of a
          one-group list. Three result lists grow together, one append each per group. Everything outside the
          marked region is the practice file unchanged.
        </p>
      </details>
    </>
  ),

  files: [
    { path: 'python/src/grad_clip/solution.py', role: 'reference', language: 'python', source: solutionSource, primary: true,
      description: 'The complete worked example: the gradients, the parameters, the global norm, the clipping, the update, a distance helper, and a demonstration that prints both batches, the rejected shape mismatch, and OK. Runs alone with Python 3.11 or newer.' },
    { path: 'python/src/grad_clip/starter.py', role: 'starter', language: 'python', source: starterSource, primary: true,
      description: 'The practice file: the worked solution with clip_by_group_norm present but still clipping by the global norm, and a check for the new behavior. Prints NOT OK until each group is clipped on its own.' },
    { path: 'python/src/grad_clip/practice_answer.py', role: 'reference', language: 'python', source: answerSource,
      description: 'The completed practice variation; the page shows the region between its answer markers.' },
    { path: 'python/fixtures/expected-output.txt', role: 'fixture', language: 'text', source: expectedOutput,
      description: 'What solution.py prints, byte for byte. The test runs the file alone and compares.' },
    { path: 'python/fixtures/expected-practice-output.txt', role: 'fixture', language: 'text', source: expectedPracticeOutput,
      description: 'What practice_answer.py prints, byte for byte.' },
    { path: 'python/tests/test_lesson.py', role: 'test', language: 'python', source: lessonTests,
      description: 'Runs the three lesson files alone, checks the norm arithmetic, the one scale, the preserved direction, the pass-through of a small batch, the guards, the per-group variation, and pins the animation fixtures to the solution; measures the unclipped step that shipped against the clipped one on the same batch.' },
    { path: 'python/fixtures/gradients.json', role: 'fixture', language: 'json', source: gradientsFixture,
      description: 'The gradients, the parameters, the ordinary batch, the maximum norm, and the learning rate exactly as the lesson files define them; the animation runs on this copy and a test pins it to the files.' },
  ],

  evidence: (
    <>
      <p>
        <strong>What the file checks</strong> before it prints <code>OK</code>: the clipped gradients are exactly
        5.0 long, the ratio between any two clipped values equals the ratio between the originals (the direction
        is unchanged), the ordinary batch comes back equal to its input with a scale of exactly 1.0, and the
        clipped step is shorter than the unclipped one. Run your copy and compare its output with the expected
        output above; they must match line for line.
      </p>
      <p>
        <strong>The failure cases.</strong> The demonstration applies an update whose second gradient group has one
        value where the parameters have two, and <code>apply_update</code> raises a <code>ValueError</code> that
        names the group, printed as the rejected line instead of silently pairing the wrong numbers. A maximum norm
        of zero or less raises the same way, and the tests also feed all-zero gradients: the norm is 0.0, the
        millionth added to it keeps the division safe, the scale is 1.0, and nothing changes.
      </p>
      <p>
        <strong>What shipped, on the same batch.</strong> Without clipping, the update moved the parameters by
        1.3038, exactly ten times the 0.1304 of the ordinary batch, because the bad batch is the ordinary one times
        ten. With clipping, the same batch moves them by 0.5000 along the same direction: every parameter&apos;s
        change is 0.3835 of what it would have been. Both measurements are tests in the project download.
      </p>
    </>
  ),

  solution: (
    <>
      <p>
        Read the file top to bottom: the input, the norm, the clipping, the update, two small helpers, and a
        demonstration. Here is its Python, construct by construct.
      </p>
      <ol>
        <li>
          <strong>Nested lists, nested loops.</strong> The gradients are a list of groups, and each group is a
          list of numbers, so <code>for group in grads:</code> visits each group and the inner{' '}
          <code>for value in group:</code> visits each number. <code>total += value * value</code> adds the square
          into a running total that started at 0.0, and <code>math.sqrt(total)</code> turns the sum into a
          length. That is the whole global norm.
        </li>
        <li>
          <strong>One scale from min.</strong> <code>min(1.0, max_norm / (norm + 1e-6))</code> compares two numbers
          and keeps the smaller. When the norm is over the maximum, the division is below 1 and wins; when the norm
          is under it, the division is above 1 and 1.0 wins, so an ordinary batch is multiplied by exactly 1.0. The{' '}
          <code>1e-6</code> is one millionth, written in scientific notation, added so that all-zero gradients do
          not divide by zero.
        </li>
        <li>
          <strong>New lists, not edited lists.</strong> <code>clip_by_global_norm</code> starts an empty{' '}
          <code>clipped</code> list, builds a <code>new_group</code> for every group with <code>append</code>, and
          appends that to the result. The input lists are never written to, so the caller can compare before and
          after, and so the same gradients can be clipped two ways in one run, as the practice does.
        </li>
        <li>
          <strong>Returning three values.</strong> <code>return clipped, norm, scale</code> hands back a tuple, and
          the caller unpacks it in one line: <code>clipped, norm, scale = clip_by_global_norm(...)</code>.
        </li>
        <li>
          <strong>Guards that name the problem.</strong> <code>if max_norm &lt;= 0: raise ValueError(f&quot;...&quot;)</code>{' '}
          stops the function with a message. In <code>apply_update</code>, <code>enumerate(zip(params, grads), start=1)</code>{' '}
          walks the two lists side by side and counts from 1, so the error can say &quot;parameter group 2 has 2
          values but 1 gradients&quot;; the <code>for index, (group, group_grads) in</code> header unpacks the count
          and the pair at once.
        </li>
        <li>
          <strong>The update.</strong> <code>value - learning_rate * grad</code> moves each parameter against its
          gradient; the inner <code>zip(group, group_grads)</code> pairs each parameter with its own gradient.
        </li>
        <li>
          <strong>A helper that reuses the norm.</strong> <code>distance</code> builds the list of differences
          between two parameter sets in the same nested shape and calls <code>global_norm</code> on it: the step
          length is just the norm of the change. Reuse, not a second formula.
        </li>
        <li>
          <strong>The demonstration.</strong> <code>{'{group_norm:>7.4f}'}</code> right-aligns four decimals in seven
          columns, <code>{'{str(group):<18}'}</code> left-aligns the raw list, and <code>show</code> joins formatted
          numbers with <code>&quot;, &quot;.join(parts)</code>. <code>try</code> and <code>except ValueError</code>{' '}
          catch the rejected update, and each <code>assert</code> checks one claim before <code>OK</code>.
        </li>
      </ol>
      <p><strong>Trace the variables.</strong> Follow <code>total</code> through the five values of the bad batch, then the scale and each clipped value:</p>
      <table>
        <thead><tr><th>group</th><th>value</th><th>square</th><th>total so far</th><th>clipped (times 0.3835)</th></tr></thead>
        <tbody>
          <tr><td>1</td><td>3.0</td><td>9</td><td>9</td><td>1.1504</td></tr>
          <tr><td>1</td><td>4.0</td><td>16</td><td>25</td><td>1.5339</td></tr>
          <tr><td>2</td><td>0.0</td><td>0</td><td>25</td><td>0.0000</td></tr>
          <tr><td>2</td><td>12.0</td><td>144</td><td>169</td><td>4.6018</td></tr>
          <tr><td>3</td><td>1.0</td><td>1</td><td>170</td><td>0.3835</td></tr>
        </tbody>
      </table>
      <p>
        The square root of 170 is 13.0384, over the maximum of 5.0, so the scale is 5.0 divided by 13.0384, which
        is 0.3835. Multiplying every value by it gives gradients whose own norm is 5.0000, and 4.6018 is still
        exactly four times 1.1504, as 12.0 was four times 3.0. The update then moves the first parameter from 0.5
        to 0.3850 instead of 0.2, and the whole set by 0.5000 instead of 1.3038. The ordinary batch has a norm of
        1.3038, under the maximum, so its scale is 1.0 and it passes through untouched.
      </p>
      <p>
        <strong>Why these decisions.</strong> One global norm rather than a per-value limit because the direction
        of the gradient is the information the batch carries; scaling everything by one factor shortens the step
        and keeps that direction, where clamping each value separately would bend it. A maximum on the norm rather
        than a smaller learning rate because an ordinary batch should still take its full step; clipping only
        touches the rare batch that is far too long. The millionth in the denominator and the <code>min</code> with
        1.0 are the two details that make the function safe to call on every step without a special case.
      </p>
      <p>
        <strong>The pattern, and its limits.</strong> Measure a quantity across a whole nested structure, derive
        one factor, apply it everywhere, and leave the inputs alone. In PyTorch, <code>clip_grad_norm_</code> does
        exactly this over every parameter&apos;s <code>.grad</code> tensor between the backward pass and the
        optimizer step; here it is five numbers in three lists. Its limits: a global bound hides which group spiked
        (the practice shows the per-group view, and why it loses the global guarantee); the maximum is one more
        number to choose, and if the norm is over it on every step, the effective learning rate is silently
        lower than the one you set; and clipping treats the symptom. A learning-rate warmup, covered in another
        lesson, prevents many of these spikes rather than catching them.
      </p>
    </>
  ),

  visual: (
    <figure className="fig">
      <GradClipViz />
      <figcaption className="fig-cap">
        <span className="fig-caption-text">
          The clipping from the file, run on its own two batches at a reading pace: about three seconds per
          decision, under half a minute in all. The five gradient values are bars grouped by parameter group; the
          global norm bar below them grows as the squares are added, the amber line marks the maximum of 5.0, and
          the clip beat shrinks every bar by the one scale of 0.3835 while the readout follows. The step beat compares
          the parameter step without clipping, 1.3038, with the clipped 0.5000; the ordinary batch then passes
          under the line untouched; and the practice variation clips each group against its own maximum and shows
          the whole landing at 7.1414, over the line. Step through with the buttons. Every number comes from the
          same functions run in the browser and is checked against the Python run.
        </span>
      </figcaption>
    </figure>
  ),

  tradeoffs: [
    {
      name: 'No clipping (what shipped)',
      preferWhen: 'The data is clean and well conditioned, the learning rate is small, and gradients never spike: a pretrained model fine-tuned on short, uniform records rarely needs the guard.',
      cost: 'One bad batch moves the parameters ten times an ordinary step, 1.3038 against 0.1304 here, and a fine-tune that was converging prints NaN at step three hundred. The failure is silent until it is total.',
    },
    {
      name: 'Global-norm clipping (this lesson)',
      preferWhen: 'Any fine-tune where an occasional batch can be far larger than the rest; the default guard in most training loops, with a maximum of about 1.0 for transformers.',
      cost: 'One more number to choose. If the norm is over the maximum on every step, the effective learning rate is lower than the one you set and nobody notices; and a global bound hides which group spiked.',
    },
    {
      name: 'Per-group or per-value clipping',
      preferWhen: 'One parameter group, such as an embedding table or a new output head, produces pathological gradients on its own and you want it bounded without touching the rest.',
      cost: 'The direction changes: group 2 shrinks relative to group 1, and the step is no longer a scaled copy of the true gradient. The whole can still exceed the budget, 7.1414 here against a maximum of 5.0, so it does not prevent the long step that caused the NaN.',
    },
  ],
};
