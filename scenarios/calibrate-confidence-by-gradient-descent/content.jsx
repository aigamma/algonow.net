import CalibrationFitViz from './visuals/CalibrationFitViz.jsx';
import solutionSource from './python/src/calibration_fit/solution.py?raw';
import starterSource from './python/src/calibration_fit/starter.py?raw';
import answerSource from './python/src/calibration_fit/practice_answer.py?raw';
import lessonTests from './python/tests/test_lesson.py?raw';
import expectedOutput from './python/fixtures/expected-output.txt?raw';
import expectedPracticeOutput from './python/fixtures/expected-practice-output.txt?raw';
import answersFixture from './python/fixtures/answers.json?raw';

// Authored by Claude Fable 5 in the main thread. Every number on this page was
// produced by running the files below; the expected outputs are the files'
// actual output, compared byte for byte by the tests.
const answerSnippet = answerSource.split('# --- answer begins ---\n')[1].split('# --- answer ends ---')[0].trim();

export const content = {
  brief: (
    <>
      <p>
        Orbit&apos;s assistant shows a confidence score with every answer and escalates to a human when the score is
        below 0.6. A week of reviewed answers told a different story: answers scored 0.9 were right about seven times
        in ten, and answers scored 0.6 were a coin flip. The number on the screen was a learned signal, not a
        probability, so the threshold meant nothing.
      </p>
      <p>
        <strong>The action to practice:</strong> fit a two-parameter calibration to reviewed answers by gradient
        descent, written out by hand. The calibrated probability is <code>sigmoid(a * score + b)</code>: <code>a</code>{' '}
        rescales the score and <code>b</code> shifts it. The loop is the one every training framework runs for you:
      </p>
      <ul>
        <li><strong>Forward:</strong> turn each raw score into a probability with the current <code>a</code> and <code>b</code>.</li>
        <li><strong>Loss:</strong> measure how wrong those probabilities are against the reviewed labels (log loss, averaged).</li>
        <li><strong>Gradient:</strong> compute how the loss changes with <code>a</code> and with <code>b</code>: for log loss through a sigmoid, each example contributes <code>(p - label) * score</code> and <code>(p - label)</code>.</li>
        <li><strong>Update:</strong> move <code>a</code> and <code>b</code> a small step against the gradient, and repeat for a fixed number of epochs.</li>
      </ul>
      <p>
        <strong>Input.</strong> Eight reviewed answers, written inline as two parallel lists: the raw confidence the
        model showed and whether the answer was right. Starting point <code>a = 1.0</code>, <code>b = 0.0</code>{' '}
        (trust the score as it is), learning rate 0.5, 200 epochs.
      </p>
      <table>
        <thead><tr><th>raw score</th><th>0.95</th><th>0.90</th><th>0.85</th><th>0.80</th><th>0.70</th><th>0.60</th><th>0.40</th><th>0.30</th></tr></thead>
        <tbody>
          <tr><td>right?</td><td>1</td><td>1</td><td>0</td><td>1</td><td>0</td><td>1</td><td>0</td><td>0</td></tr>
        </tbody>
      </table>
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
        Change one behavior. The worked solution always runs all 200 epochs. Make <code>fit</code> stop early
        instead: when an epoch improves the mean loss by less than a tolerance of 0.0005, leave the loop, so the
        fitted <code>a</code> and <code>b</code> are the values that produced that last loss. The file below is the
        worked solution with a <code>tolerance</code> parameter that is accepted but not used yet, and a check for the
        new behavior. As shipped it prints <code>NOT OK</code> and stops.
      </p>
      <p>
        <strong>Hint.</strong> Keep the previous epoch&apos;s loss in a variable that starts as <code>None</code>. Right
        after the new loss is measured, compare the improvement with the tolerance and <code>break</code> when it is
        too small; otherwise remember the new loss and update <code>a</code> and <code>b</code> as before. A{' '}
        <code>break</code> leaves the nearest enclosing loop immediately; the <code>return</code> after the loop then
        hands back whatever <code>a</code> and <code>b</code> are at that moment.
      </p>
      <p>
        <strong>Expected result.</strong> The loop stops at epoch 87, where the loss improved by 0.000497. The fit is
        flatter than the full run: <code>a = 2.0350</code>, <code>b = -1.3266</code>, loss 0.5917, and a raw 0.9 reads
        0.624. The file ends with <code>OK</code>.
      </p>
      <details>
        <summary>Show the answer</summary>
        <pre><code>{answerSnippet}</code></pre>
        <p>
          One new variable before the loop, one comparison inside it, and a <code>break</code>. The comparison runs
          before the update, so the parameters that produced the last measured loss are the ones returned. Everything
          outside the marked region is the practice file unchanged.
        </p>
      </details>
    </>
  ),

  files: [
    { path: 'python/src/calibration_fit/solution.py', role: 'reference', language: 'python', source: solutionSource, primary: true,
      description: 'The complete worked example: the eight answers, sigmoid, forward, log loss, one pass that measures the loss and its gradients, the epoch loop, and a demonstration that prints the table, the fit, the calibrated probabilities, and OK. Runs alone with Python 3.11 or newer.' },
    { path: 'python/src/calibration_fit/starter.py', role: 'starter', language: 'python', source: starterSource, primary: true,
      description: 'The practice file: the worked solution with a tolerance parameter that is not used yet, and a check for early stopping. Prints NOT OK until fit stops once an epoch improves the loss by less than the tolerance.' },
    { path: 'python/src/calibration_fit/practice_answer.py', role: 'reference', language: 'python', source: answerSource,
      description: 'The completed practice variation; the page shows the region between its answer markers.' },
    { path: 'python/fixtures/expected-output.txt', role: 'fixture', language: 'text', source: expectedOutput,
      description: 'What solution.py prints, byte for byte. The test runs the file alone and compares.' },
    { path: 'python/fixtures/expected-practice-output.txt', role: 'fixture', language: 'text', source: expectedPracticeOutput,
      description: 'What practice_answer.py prints, byte for byte.' },
    { path: 'python/tests/test_lesson.py', role: 'test', language: 'python', source: lessonTests,
      description: 'Runs the three lesson files alone, checks the sigmoid, the hand-computed gradients, the descent, the early stop, and the fixtures, and measures the raw scores that shipped against the calibrated ones on the same answers.' },
    { path: 'python/fixtures/answers.json', role: 'fixture', language: 'json', source: answersFixture,
      description: 'The eight answers, the starting point, the learning rate, the epoch count, the tolerance, and the threshold exactly as the lesson files define them; the animation runs on this copy and a test pins it to the files.' },
  ],

  evidence: (
    <>
      <p>
        <strong>What the file checks</strong> before it prints <code>OK</code>: the mean loss after fitting is below the
        loss before it, a raw 0.9 no longer reads 0.9, and the fitted <code>a</code> and <code>b</code> land in the
        expected ranges. Run your copy and compare its output with the expected output above; they must match line
        for line.
      </p>
      <p>
        <strong>The failure cases.</strong> The demonstration fits with a label list one entry short, and{' '}
        <code>zip(..., strict=True)</code> raises a <code>ValueError</code> that the demonstration prints as the
        rejected line instead of silently fitting seven answers. A label that is not 0 or 1 raises the same way. The
        tests also check that a learning rate of 0 moves nothing, that the loss falls at every one of the 200 epochs,
        and that the gradients at the start equal the hand-computed values.
      </p>
      <p>
        <strong>The raw scores on the same answers.</strong> Of the three answers scored 0.85 or higher, two were
        right: 67 percent, where the screen promised 90. After fitting, a raw 0.9 reads 0.674, within 0.02 of that
        rate. The escalation threshold of 0.6 applied to raw scores escalated only the two lowest answers; applied to
        the calibrated probabilities it escalates five of the eight (0.8 reads 0.599, 0.7 reads 0.520, 0.6 reads
        0.439). Both facts are checked by the tests in the project download.
      </p>
    </>
  ),

  solution: (
    <>
      <p>
        Read the file top to bottom: the input, three small helpers, one pass that measures the loss and its
        gradients, the epoch loop, and a demonstration. Here is its Python, construct by construct.
      </p>
      <ol>
        <li>
          <strong>A module import.</strong> <code>import math</code> brings in the standard math module; its functions
          are reached with a dot, as in <code>math.exp</code> and <code>math.log</code>. Nothing is installed.
        </li>
        <li>
          <strong>The sigmoid.</strong> <code>1 / (1 + math.exp(-x))</code> squashes any number into the open interval
          0 to 1: large negative inputs go to 0, large positive ones to 1, and 0 maps to exactly 0.5. The exponent
          never overflows at the magnitudes in this lesson. <code>forward</code> applies it to <code>a * score + b</code>:
          that line is the model.
        </li>
        <li>
          <strong>The loss.</strong> <code>log_loss</code> returns <code>-math.log(p)</code> when the label is 1 and{' '}
          <code>-math.log(1 - p)</code> when it is 0. It is near 0 when the probability agrees with the label and grows
          without bound as it disagrees, which is why it is the standard loss for probabilities.
        </li>
        <li>
          <strong>One pass, three results.</strong> <code>loss_and_gradients</code> loops over the examples with{' '}
          <code>zip(scores, labels, strict=True)</code>, adds each example&apos;s loss and its two gradient terms into
          running totals, divides each by the count, and returns all three as a tuple:{' '}
          <code>return total_loss / n, grad_a / n, grad_b / n</code>. The caller unpacks them in one line,{' '}
          <code>loss, grad_a, grad_b = loss_and_gradients(...)</code>, and the demonstration writes{' '}
          <code>final_loss, _, _ =</code> to keep only the first, with an underscore for a value it does not need.
        </li>
        <li>
          <strong>The gradient terms.</strong> <code>grad_a += (p - label) * score</code> and <code>grad_b += p - label</code>.
          For log loss through a sigmoid, the derivative collapses to prediction minus target: a prediction that is
          too high pushes the parameters down, one that is too low pushes them up, and <code>a</code> feels it scaled by
          the score. The augmented assignment <code>+=</code> adds to the running total in place.
        </li>
        <li>
          <strong>The epoch loop.</strong> <code>for epoch in range(1, epochs + 1):</code> counts 1 to 200. Each epoch
          measures, records a snapshot <code>(epoch, a, b, loss)</code> into <code>history</code>, then steps:{' '}
          <code>a -= learning_rate * grad_a</code> and <code>b -= learning_rate * grad_b</code>. The snapshot is taken
          before the step, so each printed row shows the parameters and the loss they produced.
        </li>
        <li>
          <strong>Keyword arguments with defaults.</strong> <code>def fit(scores, labels, learning_rate=0.5, epochs=200)</code>{' '}
          gives the two settings defaults; the demonstration still names them at the call,{' '}
          <code>fit(SCORES, LABELS, learning_rate=LEARNING_RATE, epochs=EPOCHS)</code>, so the numbers in use are
          visible at the call site.
        </li>
        <li>
          <strong>The demonstration.</strong> <code>epoch == 1 or epoch % 50 == 0</code> selects the rows to print, with{' '}
          <code>%</code> the remainder operator. The format specs line up the table: <code>{'{epoch:>5}'}</code> right
          aligns in five columns and <code>{'{a_now:>7.4f}'}</code> prints four decimals in seven. <code>try</code> and{' '}
          <code>except ValueError</code> catch the rejected fit, and each <code>assert</code> checks a claim before{' '}
          <code>OK</code>.
        </li>
      </ol>
      <p><strong>Trace the variables.</strong> Follow <code>a</code>, <code>b</code>, and the loss at the printed epochs, with the mean gradients that drive the next step and what a raw 0.9 reads at that moment:</p>
      <table>
        <thead><tr><th>epoch</th><th>a</th><th>b</th><th>loss</th><th>grad a</th><th>grad b</th><th>0.9 reads</th></tr></thead>
        <tbody>
          <tr><td>1</td><td>1.0000</td><td>0.0000</td><td>0.6941</td><td>0.0612</td><td>0.1637</td><td>0.711</td></tr>
          <tr><td>50</td><td>1.5246</td><td>-0.9634</td><td>0.6129</td><td>-0.0296</td><td>0.0210</td><td>0.601</td></tr>
          <tr><td>100</td><td>2.1978</td><td>-1.4426</td><td>0.5856</td><td>-0.0244</td><td>0.0174</td><td>0.631</td></tr>
          <tr><td>150</td><td>2.7557</td><td>-1.8413</td><td>0.5668</td><td>-0.0203</td><td>0.0146</td><td>0.655</td></tr>
          <tr><td>200</td><td>3.2234</td><td>-2.1768</td><td>0.5535</td><td>-0.0171</td><td>0.0123</td><td>0.674</td></tr>
        </tbody>
      </table>
      <p>
        The first step moves <code>a</code> to 0.9694 and <code>b</code> to -0.0818: both gradients are positive, so
        both parameters fall. The shift <code>b</code> keeps falling, which pulls every probability down, and from
        about epoch 10 the gradient of <code>a</code> turns negative, so the curve steepens while it drops. A raw 0.9
        reads 0.711 at the start, dips below 0.6 near epoch 25, and settles at 0.674. After the 200th update the fit
        is <code>a = 3.2320</code>, <code>b = -2.1830</code>, loss 0.5533.
      </p>
      <p>
        <strong>Why these decisions.</strong> Two parameters because they are enough to rescale and shift a score
        that is already ordered correctly, and eight reviewed answers cannot support more. Gradient descent rather
        than a closed form because the same loop fits anything with a differentiable loss, and it is exactly what a
        framework runs. The learning rate of 0.5 and the fixed 200 epochs are plain choices that let the run be
        printed in full; the practice variation replaces the fixed count with a stopping rule. Calibration is a
        fine-tuning concern because the raw score is a learned signal: it drifts whenever the model, the prompt, or
        the traffic changes, and the fit has to be redone on fresh reviewed answers.
      </p>
      <p>
        <strong>The pattern, and its limits.</strong> Forward, loss, gradient, update is the whole training loop. In
        PyTorch the forward pass builds a graph, <code>loss.backward()</code> fills in every gradient that this file
        computes by hand, <code>optimizer.step()</code> performs the update, and <code>optimizer.zero_grad()</code> resets
        the running totals that this file resets by starting each epoch at 0.0; the data moves through in batches on a
        device. The loop here is that loop with the machinery removed. Its limits: eight points overfit easily and
        there is no held-out check; one global step size and no batching; the two-parameter form cannot fix a score
        that is not even ordered correctly; and a calibration is only as good as the reviewed answers it was fit on.
      </p>
    </>
  ),

  visual: (
    <figure className="fig">
      <CalibrationFitViz />
      <figcaption className="fig-cap">
        <span className="fig-caption-text">
          The training loop from the file, run on its own eight answers at a reading pace: about two and a half
          seconds per shown epoch, under half a minute in all. The answers sit at the top (right) and bottom (wrong)
          of a raw score axis; the dashed line is what shipped, the raw score shown as the probability. The blue curve
          bends along the real per-epoch trace at epochs 1, 10, 25, 50, 100, 150, and 200 while the readout and the
          loss sparkline follow; the outro marks the escalation threshold and which answers now fall below it; the
          practice variation adds the early-stopped curve at epoch 87. Step through with the buttons. Every parameter
          and loss comes from the same loop run in the browser and is checked against the Python run.
        </span>
      </figcaption>
    </figure>
  ),

  tradeoffs: [
    {
      name: 'Keep the raw score and move the threshold (what shipped)',
      preferWhen: 'A single model, a single traffic mix, and a reviewer who can retune the threshold by hand after each release; nothing needs to be a probability.',
      cost: 'The threshold is tuned to one model and silently wrong for the next. On the eight answers it escalated two; the calibrated probabilities escalate five, including the raw 0.8 that reads 0.599. Nothing downstream can combine the score with other evidence, because 0.9 does not mean 90 percent.',
    },
    {
      name: 'Isotonic or binned calibration',
      preferWhen: 'Thousands of reviewed answers and a score whose relationship to accuracy is not a smooth curve: calibration by bins or a monotone step function needs no formula and fits any shape.',
      cost: 'Steps instead of a curve, so nearby scores can jump; many bins need many examples each, and the eight answers here would give one or two per bin. The fitted table also has to be stored and versioned with the model.',
    },
    {
      name: 'A learned verifier',
      preferWhen: 'The confidence score itself is uninformative and the budget allows a second model call: a verifier reads the question and the answer and predicts whether it is right.',
      cost: 'A second model to train, evaluate, and serve, and a second call per answer. It replaces the calibration problem with a modeling problem, and its own output still needs calibrating before a threshold means anything.',
    },
  ],
};
