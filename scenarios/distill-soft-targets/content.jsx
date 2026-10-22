import CodeBlock from '../../src/components/CodeBlock.jsx';
import DistillationViz from './visuals/DistillationViz.jsx';
import solutionSource from './python/src/distillation_targets/solution.py?raw';
import starterSource from './python/src/distillation_targets/starter.py?raw';
import answerSource from './python/src/distillation_targets/practice_answer.py?raw';
import lessonTests from './python/tests/test_lesson.py?raw';
import expectedOutput from './python/fixtures/expected-output.txt?raw';
import expectedPracticeOutput from './python/fixtures/expected-practice-output.txt?raw';
import logitsFixture from './python/fixtures/logits.json?raw';

// Authored by Claude Fable 5 in the main thread. Every number on this page was
// produced by running the files below; the expected outputs are the files'
// actual output, compared byte for byte by the tests.
const answerSnippet = answerSource.split('# --- answer begins ---\n')[1].split('# --- answer ends ---')[0].trim();

export const content = {
  brief: (
    <>
      <p>
        Orbit is replacing its large assistant with a small router model for first-line ticket classification:
        billing, access, outage, or feature. Trained on the hard labels alone, the student plateaued. A hard label says
        &quot;outage&quot; and nothing about how close &quot;access&quot; was, and the large model knows exactly that:
        its logits rank the wrong answers too. Distillation hands that ranking to the student.
      </p>
      <p>
        <strong>The action to practice:</strong> turn the teacher&apos;s logits into soft targets with a temperature,
        and score the student against them. The rules are small:
      </p>
      <ul>
        <li>Softmax turns a row of logits into probabilities: divide each logit by the temperature, subtract the largest, exponentiate, divide by the sum. Subtracting the largest changes nothing mathematically and keeps <code>exp</code> finite.</li>
        <li>At temperature 1 the teacher is as sharp as it was trained to be. At temperature 2 every logit is halved first, so the peaks drop and the wrong answers become visible; the top class never changes.</li>
        <li>The soft loss is how far the student&apos;s softened distribution is from the teacher&apos;s (a KL divergence), times the temperature squared so its gradients stay on the same scale as the hard loss.</li>
        <li>A temperature of zero or below, or a row with the wrong number of logits, is rejected with a <code>ValueError</code>.</li>
      </ul>
      <p>
        <strong>Input.</strong> Three tickets with four classes each: the teacher&apos;s logits, the student&apos;s logits,
        the gold label, and a temperature of 2. Example 3 is the interesting one: the teacher reads it as access with
        outage close behind, and the student cannot separate the two yet.
      </p>
      <table>
        <thead><tr><th>example</th><th>gold</th><th>teacher logits (billing, access, outage, feature)</th><th>student logits</th></tr></thead>
        <tbody>
          <tr><td>1</td><td>outage</td><td>2.0, 0.5, 3.5, -1.0</td><td>1.0, 1.0, 2.0, 0.0</td></tr>
          <tr><td>2</td><td>billing</td><td>4.0, 1.0, 0.0, -2.0</td><td>2.5, 1.5, 0.5, -1.0</td></tr>
          <tr><td>3</td><td>access</td><td>0.5, 2.5, 2.0, -0.5</td><td>0.5, 1.5, 1.5, 0.0</td></tr>
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
        Change one behavior. The worked solution scores the student with the soft loss alone. The usual distillation
        recipe blends two losses, <code>alpha</code> times the soft loss plus <code>1 - alpha</code> times the hard
        loss, so the student keeps learning the gold label while it learns the teacher&apos;s ranking. The file below is
        the worked solution with a <code>distillation_loss</code> function to complete and a check for the new
        behavior. As shipped it returns the soft loss only, prints <code>NOT OK</code>, and stops.
      </p>
      <p>
        <strong>Hint.</strong> Both losses already exist as functions. Call <code>soft_loss</code> with the two logit
        rows and the temperature, call <code>hard_loss</code> with the student&apos;s row and the label, multiply each
        by its weight, and add the two numbers. Two assignments and one <code>return</code>.
      </p>
      <p>
        <strong>Expected result.</strong> Blended losses of 0.460, 0.474, and 0.373 at <code>alpha</code> 0.7, with a
        mean of 0.436, between the soft mean (0.336) and the hard mean (0.669). The file ends with <code>OK</code>.
      </p>
      <details>
        <summary>Show the answer</summary>
        <CodeBlock filename="Practice answer" code={answerSnippet} />
        <p>
          Three lines. At <code>alpha</code> 1 the blend is the soft loss, at 0 it is the hard loss, and every value
          in between is a straight line between them, which is why the mean of the blends equals the blend of the
          means. Everything outside the marked region is the practice file unchanged.
        </p>
      </details>
    </>
  ),

  files: [
    { path: 'python/src/distillation_targets/solution.py', role: 'reference', language: 'python', source: solutionSource, primary: true,
      description: 'The complete worked example: the logits, softmax with the max trick, cross-entropy, KL divergence, the hard and soft losses, and a demonstration that prints every probability, both losses, the rejected row, and OK. Runs alone with Python 3.11 or newer.' },
    { path: 'python/src/distillation_targets/starter.py', role: 'starter', language: 'python', source: starterSource, primary: true,
      description: 'The practice file: the worked solution with a distillation_loss function to complete and a check for the blended mean. Prints NOT OK until the function blends the soft and hard losses with alpha.' },
    { path: 'python/src/distillation_targets/practice_answer.py', role: 'reference', language: 'python', source: answerSource,
      description: 'The completed practice variation; the page shows the region between its answer markers.' },
    { path: 'python/fixtures/expected-output.txt', role: 'fixture', language: 'text', source: expectedOutput,
      description: 'What solution.py prints, byte for byte. The test runs the file alone and compares.' },
    { path: 'python/fixtures/expected-practice-output.txt', role: 'fixture', language: 'text', source: expectedPracticeOutput,
      description: 'What practice_answer.py prints, byte for byte.' },
    { path: 'python/tests/test_lesson.py', role: 'test', language: 'python', source: lessonTests,
      description: 'Runs the three lesson files alone and checks the softmax arithmetic, the max trick against overflow, the temperature rules, both losses, the near-miss evaluation, the blend, and that the animation fixtures match the solution.' },
    { path: 'python/fixtures/logits.json', role: 'fixture', language: 'json', source: logitsFixture,
      description: 'The classes, logits, labels, temperature, and alpha exactly as the lesson files define them; the animation runs on this copy and a test pins it to the files. The trace fixture it replays (expected-trace.json) stays in the package and the download.' },
  ],

  evidence: (
    <>
      <p>
        <strong>What the file checks</strong> before it prints <code>OK</code>: every row of probabilities sums to 1
        within a billionth, the temperature 2 distribution has a lower peak than the temperature 1 distribution for
        every example, the top class never changes with the temperature, and every loss is positive. Run your copy and
        compare its output with the expected output above; they must match line for line.
      </p>
      <p>
        <strong>The failure cases.</strong> A temperature of 0 or below raises <code>ValueError</code> before any
        division happens, and a row with three logits instead of four is rejected by <code>check_row</code>; the
        demonstration shows the second one as the rejected line. The tests also check that adding the same constant to
        every logit leaves the softmax unchanged, that temperature 1 equals the textbook formula, that the KL divergence
        is exactly 0 when the student matches the teacher, and that the caller&apos;s lists are untouched.
      </p>
      <p>
        <strong>Why the max trick, measured.</strong> On the lesson&apos;s logits the trick and the textbook formula
        agree to twelve decimals. On logits of 1000, 999, 998, 997 the textbook formula raises{' '}
        <code>OverflowError</code> at the first <code>exp</code>, while the trick returns finite probabilities that sum to
        1 with the same top class. That is a real production failure: a confident model emits large logits.
      </p>
      <p>
        <strong>Why soft targets, measured on example 3.</strong> The hard target gives outage 0; the teacher at
        temperature 2 gives it 0.329 next to access 0.422. Take the student&apos;s row and move its outage weight to
        feature: the hard loss is identical (it only sees the gold probability), while the soft loss rises, because the
        teacher ranks outage second and feature last. The hard loss cannot tell a near miss from a far miss; the soft loss
        can. Both facts are checked by the tests in the project download.
      </p>
    </>
  ),

  solution: (
    <>
      <p>
        Read the file top to bottom: the input, a guard, four small functions that build on each other, the two losses,
        a formatter, and a demonstration. Here is its Python, construct by construct.
      </p>
      <ol>
        <li>
          <strong>Lists of lists.</strong> <code>TEACHER_LOGITS</code> is a list of three rows, each a list of four
          numbers: a small matrix. <code>TEACHER_LOGITS[2][1]</code> reads row 2, column 1, which is example 3&apos;s
          access logit, 2.5. The demonstration loops over row numbers with <code>range(len(LABELS))</code> and picks the
          matching row from each list by that number.
        </li>
        <li>
          <strong>Building a new list from an old one.</strong> <code>softmax</code> does it three times: an empty list,
          a <code>for</code> over the old values, and <code>append</code> of the transformed value. The same shape, written
          with square brackets as a comprehension, is what you will meet in most code; the long form shows what the
          comprehension hides.
        </li>
        <li>
          <strong>The max trick.</strong> <code>largest = max(scaled)</code> finds the biggest scaled logit, and every
          value has it subtracted before <code>math.exp</code>. Dividing by the sum cancels the shift exactly, so the
          probabilities are unchanged, but the largest exponent is now <code>exp(0) = 1</code>, and nothing overflows.
        </li>
        <li>
          <strong>Division into a new list.</strong> <code>sum(exponentials)</code> adds a list of floats, and the last
          loop divides each by that total. The result sums to 1 by construction.
        </li>
        <li>
          <strong>Two losses with the same loop shape.</strong> <code>cross_entropy</code> walks the targets and the
          probabilities together with <code>zip(..., strict=True)</code> and subtracts{' '}
          <code>target * math.log(probability)</code> from a running total; the minus sign makes the loss positive,
          because a log of a probability is negative. <code>kl_divergence</code> adds{' '}
          <code>target * math.log(target / probability)</code> instead: zero when the two rows match, positive otherwise.
          For a one-hot target the cross-entropy collapses to minus the log of the gold probability.
        </li>
        <li>
          <strong>The hard target.</strong> <code>one_hot</code> builds <code>1.0</code> on the gold class and{' '}
          <code>0.0</code> elsewhere with an <code>if</code> inside the loop. <code>hard_loss</code> is the cross-entropy
          of the student at temperature 1 against it: the ordinary training loss.
        </li>
        <li>
          <strong>The soft loss.</strong> <code>soft_loss</code> softens both the teacher and the student at the same
          temperature, measures the divergence, and multiplies by <code>temperature ** 2</code> (two asterisks raise to a
          power). The scaling matters because the gradient through a softmax at temperature T is smaller by a factor of
          T squared, and the two losses should pull with comparable strength.
        </li>
        <li>
          <strong>Guards and formats.</strong> <code>check_row</code> compares <code>len(logits)</code> with the class
          count and raises <code>ValueError</code> with an f-string. <code>{'{'}value:.3f{'}'}</code> prints three
          decimals; <code>{'{'}TEMPERATURE:g{'}'}</code> prints 2.0 as 2; <code>&quot;  &quot;.join(parts)</code> glues
          the formatted numbers. Each <code>assert</code> checks one claim before <code>OK</code>.
        </li>
      </ol>
      <p><strong>Trace the values.</strong> Follow example 3&apos;s teacher logits through <code>softmax</code> at both temperatures:</p>
      <table>
        <thead><tr><th>step</th><th>T = 1</th><th>T = 2</th></tr></thead>
        <tbody>
          <tr><td>logits</td><td>0.5, 2.5, 2.0, -0.5</td><td>0.5, 2.5, 2.0, -0.5</td></tr>
          <tr><td>scaled by 1 / T</td><td>0.5, 2.5, 2.0, -0.5</td><td>0.25, 1.25, 1.0, -0.25</td></tr>
          <tr><td>minus the largest</td><td>-2.0, 0.0, -0.5, -3.0</td><td>-1.0, 0.0, -0.25, -1.5</td></tr>
          <tr><td>exp</td><td>0.135, 1.000, 0.607, 0.050</td><td>0.368, 1.000, 0.779, 0.223</td></tr>
          <tr><td>sum</td><td>1.792</td><td>2.370</td></tr>
          <tr><td>probabilities</td><td>0.076, 0.558, 0.339, 0.028</td><td>0.155, 0.422, 0.329, 0.094</td></tr>
        </tbody>
      </table>
      <p>
        The student&apos;s row for example 3 at temperature 2 is 0.197, 0.325, 0.325, 0.153. The divergence from the
        teacher&apos;s 0.155, 0.422, 0.329, 0.094 is 0.031, times 4 is the soft loss of 0.125. The hard loss is minus
        the log of the student&apos;s gold probability at temperature 1, 0.386, which is 0.952.
      </p>
      <p>
        <strong>Why these decisions.</strong> The temperature exists because a trained teacher is sharp: at temperature 1
        example 1 puts 0.779 on outage and 0.009 on feature, and the student would learn almost nothing beyond the label.
        Halving the logits reveals the teacher&apos;s ranking of the wrong answers, which is the information the hard label
        lacks. The max trick is there because a confident model emits large logits and a bare <code>exp</code> overflows.
        The loss is a divergence between distributions rather than a comparison of top classes because the whole point is
        to learn the shape, not the argmax. And the temperature squared keeps the soft loss from being swamped by the hard
        loss once the two are blended, which the practice variation does.
      </p>
      <p>
        <strong>The pattern, and its limits.</strong> Softmax, cross-entropy, and a temperature are the same three
        pieces that appear in sampling (temperature decoding), calibration, and contrastive losses. In a framework the
        softmax and the divergence are two lines over tensors, a log softmax of the student over the temperature and a KL
        divergence against the softened teacher, and the loop over examples becomes a batch. Its limits: three examples,
        no training step (the student&apos;s logits are given, not learned), and the temperature and the blend weight
        come from validation, not from theory.
      </p>
    </>
  ),

  visual: (
    <figure className="fig">
      <DistillationViz />
      <figcaption className="fig-cap">
        <span className="fig-caption-text">
          The arithmetic from the file, run on its own three examples at a reading pace: about three seconds per step,
          twenty-seven seconds in all. Each example starts as its hard label, one full bar on the gold class; the bars
          morph into the teacher&apos;s probabilities at temperature 1, soften together at temperature 2, and the
          student&apos;s distribution appears outlined beneath them with the soft and hard losses alongside. Example 3 is
          spotlighted as the near miss, and the practice variation adds the blended loss at alpha 0.7. Step through with
          the buttons. The figure rests for two minutes before it plays again, and the motion setting in the site header
          can slow or stop it. Every probability and loss comes from the same arithmetic run in the browser and is checked
          against the Python run.
        </span>
      </figcaption>
    </figure>
  ),

  tradeoffs: [
    {
      name: 'Hard labels only (what shipped)',
      preferWhen: 'There is no stronger teacher to learn from, or the labels are the whole truth: a task without near misses, where a wrong answer is simply wrong.',
      cost: 'One bit of signal per example. A near miss and a far miss cost the same, so on example 3 the student is pushed as hard away from outage as from feature, and a small model plateaus with nothing left to learn from the labels.',
    },
    {
      name: 'Soft targets with a temperature (this lesson)',
      preferWhen: 'A strong teacher exists and the classes overlap, so the teacher’s ranking of the wrong answers is real information. The first thing to try when a small model stalls below a large one.',
      cost: 'A teacher forward pass per training example, or its cached logits; two knobs, the temperature and the blend weight, that need validation; and a student that inherits the teacher’s mistakes along with its judgment.',
    },
    {
      name: 'Sequence-level or feature-level distillation',
      preferWhen: 'The student must imitate generations rather than class scores, or a layer-by-layer match of internal representations is wanted. Train on the teacher’s generated outputs, or match hidden states.',
      cost: 'Far more plumbing: generated datasets to store and filter, layers to align across different architectures, and a loss per layer. The logit-level recipe here is usually the first stage, and often enough.',
    },
  ],
};
