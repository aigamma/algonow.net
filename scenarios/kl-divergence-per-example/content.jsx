import CodeBlock from '../../src/components/CodeBlock.jsx';
import KlDivergenceViz from './visuals/KlDivergenceViz.jsx';
import solutionSource from './python/src/divergence/solution.py?raw';
import starterSource from './python/src/divergence/starter.py?raw';
import answerSource from './python/src/divergence/practice_answer.py?raw';
import lessonTests from './python/tests/test_lesson.py?raw';
import expectedOutput from './python/fixtures/expected-output.txt?raw';
import expectedPracticeOutput from './python/fixtures/expected-practice-output.txt?raw';
import examplesFixture from './python/fixtures/examples.json?raw';

// Authored by Claude Fable 5. Every number on this page was produced by
// running the files below; the expected outputs are the files' actual output,
// compared byte for byte by the tests.
const answerSnippet = answerSource.split('# --- answer begins ---\n')[1].split('# --- answer ends ---')[0].trim();

export const content = {
  brief: (
    <>
      <p>
        Orbit distilled a small router from its assistant. The router sends each support question to one of three
        teams, billing, access, or outage, and the evaluation compared the student&apos;s top route with the
        teacher&apos;s: four of four agreed, one hundred percent, ship it. In production some routes behaved badly
        anyway. The top route is one number out of three; the student had learned a different shape of distribution,
        and anything that reads the probability rather than the top route, a confidence threshold, a fallback to a
        human, a second opinion, saw a different model.
      </p>
      <p>
        <strong>The action to practice:</strong> measure how far the student&apos;s distribution is from the
        teacher&apos;s on each example with the KL divergence, and rank the examples by it. The rules are small:
      </p>
      <ul>
        <li>Each distribution is a list of probabilities over the routes; it must have no negative entry and sum to 1 within one millionth, or the function raises a <code>ValueError</code>.</li>
        <li>The divergence from teacher <code>p</code> to student <code>q</code> is the sum over routes of <code>p * log(p / q)</code>. A route where the teacher has no mass contributes 0.</li>
        <li>A student probability of 0 where the teacher has mass is an infinite divergence; the code clips <code>q</code> to one billionth, so the result is a very large finite number instead of a crash.</li>
        <li>Examples are ranked by divergence, largest first, with the id breaking ties; the top-route agreement is reported beside it.</li>
      </ul>
      <p>
        <strong>Input.</strong> Four examples, written inline as lists of three probabilities, teacher and student,
        in the route order billing, access, outage:
      </p>
      <table>
        <thead><tr><th>id</th><th>teacher</th><th>student</th><th>top route, both</th></tr></thead>
        <tbody>
          <tr><td>e1</td><td>0.7, 0.2, 0.1</td><td>0.6, 0.3, 0.1</td><td>billing</td></tr>
          <tr><td>e2</td><td>0.1, 0.8, 0.1</td><td>0.4, 0.5, 0.1</td><td>access</td></tr>
          <tr><td>e3</td><td>0.34, 0.33, 0.33</td><td>0.4, 0.3, 0.3</td><td>billing</td></tr>
          <tr><td>e4</td><td>0.9, 0.05, 0.05</td><td>0.95, 0.04, 0.01</td><td>billing</td></tr>
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
        Change one behavior. The KL divergence is not symmetric: from the teacher to the student e2 reads 0.2374,
        and from the student to the teacher it reads 0.3195. Make <code>js_divergence</code> compute the
        Jensen-Shannon divergence instead: build the midpoint distribution, the average of the two route by route,
        then take half the KL divergence from the teacher to the midpoint plus half the KL divergence from the
        student to the midpoint. It reads the same both ways and can never be infinite, because the midpoint has
        mass wherever either side does. The file below is the worked solution with a <code>js_divergence</code> that
        still returns the plain KL divergence, and a check for the new behavior. As shipped it prints{' '}
        <code>NOT OK</code> and stops.
      </p>
      <p>
        <strong>Hint.</strong> Start an empty list, loop over <code>zip(teacher, student, strict=True)</code> and
        append <code>(p + q) / 2</code>, then return <code>0.5 * kl_divergence(teacher, midpoint) + 0.5 *
        kl_divergence(student, midpoint)</code>. The existing function does the rest.
      </p>
      <p>
        <strong>Expected result.</strong> e2 reads 0.0657 both ways, the ranking worst first is still e2, e4, e1, e3
        (0.0657, 0.0079, 0.0070, 0.0019), and every JS value is smaller than its KL value on these examples. The file
        ends with <code>OK</code>.
      </p>
      <details>
        <summary>Show the answer</summary>
        <CodeBlock filename="Practice answer" code={answerSnippet} />
        <p>
          One new list, one loop that fills it, and one line that calls the existing function twice. The midpoint
          sits between the two distributions, so each half-divergence is smaller than the one-sided value, and
          swapping teacher and student swaps the two halves without changing their sum. Everything outside the
          marked region is the practice file unchanged.
        </p>
      </details>
    </>
  ),

  files: [
    { path: 'python/src/divergence/solution.py', role: 'reference', language: 'python', source: solutionSource, primary: true,
      description: 'The complete worked example: the four examples, the distribution check, the per-route terms, the divergence, the ranking, the top-route agreement, and a demonstration that prints the table, the mean, the ranking, the rejected distribution, and OK. Runs alone with Python 3.11 or newer.' },
    { path: 'python/src/divergence/starter.py', role: 'starter', language: 'python', source: starterSource, primary: true,
      description: 'The practice file: the worked solution with a js_divergence that still returns the plain KL divergence, and a check for the new behavior. Prints NOT OK until it computes the Jensen-Shannon divergence.' },
    { path: 'python/src/divergence/practice_answer.py', role: 'reference', language: 'python', source: answerSource,
      description: 'The completed practice variation; the page shows the region between its answer markers.' },
    { path: 'python/fixtures/expected-output.txt', role: 'fixture', language: 'text', source: expectedOutput,
      description: 'What solution.py prints, byte for byte. The test runs the file alone and compares.' },
    { path: 'python/fixtures/expected-practice-output.txt', role: 'fixture', language: 'text', source: expectedPracticeOutput,
      description: 'What practice_answer.py prints, byte for byte.' },
    { path: 'python/tests/test_lesson.py', role: 'test', language: 'python', source: lessonTests,
      description: 'Runs the three lesson files alone, checks the distribution guard, the hand-computed term, the clipping policy, the asymmetry, the ranking and its tie-break, the practice symmetry and bounds, and measures the top-route agreement that shipped against the divergence on the same examples.' },
    { path: 'python/fixtures/examples.json', role: 'fixture', language: 'json', source: examplesFixture,
      description: 'The four examples, the routes, the tolerance, the floor, and the threshold exactly as the lesson files define them; the animation runs on this copy and a test pins it to the files.' },
  ],

  evidence: (
    <>
      <p>
        <strong>What the file checks</strong> before it prints <code>OK</code>: the top routes agree on all four
        examples, e2 ranks first with a divergence above 0.2, and no divergence is negative. Run your copy and compare
        its output with the expected output above; they must match line for line.
      </p>
      <p>
        <strong>The failure cases.</strong> The demonstration asks for the divergence of a list that sums to 0.9, and{' '}
        <code>check_distribution</code> raises a <code>ValueError</code> that the demonstration prints as the
        rejected line instead of returning a number that means nothing. A negative entry raises the same way, and a
        pair of lists of different lengths is caught by <code>zip</code> with <code>strict=True</code>. The tests in
        the project download also feed a student that gives the outage route exactly 0 where the teacher keeps a
        tenth: the clipped result is 1.7610, finite and far above everything in the table, where the unclipped
        arithmetic would divide by zero.
      </p>
      <p>
        <strong>What shipped, on the same examples.</strong> Top-route agreement counts a match on every example:
        4 of 4, one hundred percent, and it cannot tell e2 from e3. The divergence puts e2 at 0.2374, thirty times
        e3&apos;s 0.0076, because the teacher gives access 0.8 and the student gives it 0.5 while moving 0.3 of mass
        onto billing. Both measurements are tests in the project download.
      </p>
    </>
  ),

  solution: (
    <>
      <p>
        Read the file top to bottom: the input, a guard, the function that makes the terms, the function that sums
        them, the ranking, two small helpers for the top route, and a demonstration. Here is its Python, construct by
        construct.
      </p>
      <ol>
        <li>
          <strong>The guard.</strong> <code>check_distribution</code> walks the list once, raising on a negative
          entry and adding into <code>total</code>, then tests <code>abs(total - 1.0) &gt; TOLERANCE</code>:{' '}
          <code>abs</code> is the absolute value, so the test catches a sum that is too high or too low, and the
          tolerance of one millionth forgives the rounding that lists like 0.34, 0.33, 0.33 carry. A function that
          only raises or returns nothing is a common shape for a check.
        </li>
        <li>
          <strong>One term per route.</strong> <code>for p, q in zip(teacher, student, strict=True):</code> walks the
          two lists together, naming the teacher&apos;s probability <code>p</code> and the student&apos;s{' '}
          <code>q</code>; <code>strict=True</code> raises if the lists differ in length instead of silently stopping
          at the shorter one. Each term is <code>p * math.log(p / q)</code>: <code>math.log</code> is the natural
          logarithm, positive when the ratio is above 1 (the teacher is surer than the student) and negative below it.
        </li>
        <li>
          <strong>Two guards inside the loop.</strong> <code>if p == 0:</code> appends <code>0.0</code> and{' '}
          <code>continue</code>s, because a route the teacher never uses contributes nothing and the logarithm of 0 is
          undefined. <code>q = max(q, FLOOR)</code> replaces a student probability of 0 with one billionth:{' '}
          <code>max</code> returns the larger of its arguments, so any ordinary probability passes through unchanged.
        </li>
        <li>
          <strong>Summing the terms.</strong> <code>kl_divergence</code> calls <code>kl_terms</code>, loops over the
          returned list, and adds each term into <code>total</code> with <code>+=</code>. Keeping the terms as their
          own function lets the demonstration print them, and keeping the sum separate keeps each function one idea.
        </li>
        <li>
          <strong>Ranking with a key function.</strong> <code>rank_by_divergence</code> builds a list of{' '}
          <code>(divergence, id)</code> tuples, then <code>sorted(scored, key=worst_first)</code> orders them by what{' '}
          <code>worst_first</code> returns for each pair: <code>(-pair[0], pair[1])</code>. The minus sign turns the
          largest divergence into the smallest key, so it sorts first, and the id breaks ties in alphabetical order.
          Defining the key as a small named function inside the function keeps it readable.
        </li>
        <li>
          <strong>The top route.</strong> <code>top_route</code> starts with <code>best = 0</code> and walks{' '}
          <code>range(1, len(probs))</code>, keeping the index whose probability is larger; a strict <code>&gt;</code>{' '}
          means the first of equal values wins. <code>agreement</code> counts the examples where the two top routes
          match.
        </li>
        <li>
          <strong>The demonstration.</strong> Format specs line up the table: <code>{'{terms[0]:>+8.4f}'}</code> prints
          four decimals in eight columns with an explicit sign, and <code>{'{t_route:<8}'}</code> left aligns a route
          name. <code>&quot;, &quot;.join(...)</code> turns the ranked pairs into one line. <code>try</code> and{' '}
          <code>except ValueError as error</code> show the rejection without crashing, and each <code>assert</code>{' '}
          checks one claim before <code>OK</code>.
        </li>
      </ol>
      <p><strong>Trace the variables.</strong> Follow the three terms and their sum through the four examples:</p>
      <table>
        <thead><tr><th>id</th><th>billing</th><th>access</th><th>outage</th><th>KL</th><th>top routes</th></tr></thead>
        <tbody>
          <tr><td>e1</td><td>+0.1079</td><td>-0.0811</td><td>+0.0000</td><td>0.0268</td><td>billing, billing</td></tr>
          <tr><td>e2</td><td>-0.1386</td><td>+0.3760</td><td>+0.0000</td><td>0.2374</td><td>access, access</td></tr>
          <tr><td>e3</td><td>-0.0553</td><td>+0.0315</td><td>+0.0315</td><td>0.0076</td><td>billing, billing</td></tr>
          <tr><td>e4</td><td>-0.0487</td><td>+0.0112</td><td>+0.0805</td><td>0.0430</td><td>billing, billing</td></tr>
        </tbody>
      </table>
      <p>
        Take e2&apos;s access term by hand: <code>p</code> is 0.8 and <code>q</code> is 0.5, the ratio is 1.6, its
        logarithm is 0.4700, and 0.8 times that is 0.3760. The billing term goes the other way: 0.1 over 0.4 is 0.25,
        the logarithm is -1.3863, and a tenth of it is -0.1386. The outage probabilities match, so the ratio is 1 and
        the term is 0. The sum, 0.2374, is the divergence. A single term can be negative, as every example shows,
        but the sum never is: the positive terms, where the teacher is surer than the student, always outweigh the
        rest. The mean over the four examples is 0.0787, and the ranking reads e2, e4, e1, e3.
      </p>
      <p>
        <strong>Why these decisions.</strong> The divergence runs from the teacher to the student, not the other
        way, because the teacher is the reference: the question is how much of the teacher&apos;s belief the student
        fails to carry, and that direction is the loss distillation trains with. Per example rather than averaged,
        because the mean of 0.0787 hides that one example holds three quarters of it. Clipping instead of raising on
        a zero, because a student that assigns exactly 0 to a route the teacher uses is the most important case to
        rank, not one to crash on. And a check that each list sums to 1, because a divergence between things that
        are not distributions is a number without meaning.
      </p>
      <p>
        <strong>The pattern, and its limits.</strong> Compare two distributions with a sum over classes, then rank
        by the result. The same shape measures a model against its own earlier version, a quantized model against
        the full one, or today&apos;s traffic against last month&apos;s. Its limits: the KL divergence is not
        symmetric and has no upper bound, so values are hard to compare across tasks; it says where two models
        disagree, not which one is right, so e2 still needs a human to read the question; and four examples make a
        lesson, not an evaluation, so in practice the ranking runs over thousands and the top of the list is what
        gets read.
      </p>
    </>
  ),

  visual: (
    <figure className="fig">
      <KlDivergenceViz />
      <figcaption className="fig-cap">
        <span className="fig-caption-text">
          The arithmetic from the file, run on its own four examples at a reading pace: about three seconds per
          example, under half a minute in all. Each row shows the teacher&apos;s probabilities as filled blue bars and
          the student&apos;s as amber outlines, route by route. The intro names what shipped, top-route agreement
          four of four; then each example&apos;s three terms grow as signed bars from a shared axis and its divergence
          appears, while the panel on the right collects the divergences; the ranking beat reorders the panel worst
          first, one move at a time, with the 0.2 line; the outro names e2; and the practice variation adds the
          Jensen-Shannon values in green. Step through with the buttons. Every term and divergence comes from the
          same functions run in the browser and is checked against the Python run.
        </span>
      </figcaption>
    </figure>
  ),

  tradeoffs: [
    {
      name: 'Top-route agreement (what shipped)',
      preferWhen: 'The only consumer of the model is the route itself, with no threshold, no fallback, and no confidence shown to anyone, and the evaluation set is large enough that a mismatch rate means something.',
      cost: 'It reads one number out of three. On the four examples it scores 4 of 4 and cannot tell e2, where the student has moved 0.3 of mass off the teacher\'s route, from e3, where the two distributions nearly coincide.',
    },
    {
      name: 'KL divergence per example (this lesson)',
      preferWhen: 'The student is trained to match the teacher\'s distribution and anything downstream reads the probabilities: thresholds, escalation, calibration, or a second model. It is the training loss itself, measured example by example.',
      cost: 'Not symmetric, not bounded, and undefined where the student gives a used route exactly 0, which the clip turns into a large number rather than a crash. It finds the disagreement; a person still has to decide who is right.',
    },
    {
      name: 'Expected calibration error on the student\'s confidence',
      preferWhen: 'Labeled outcomes exist and the question is whether the student\'s probabilities mean what they say, independent of the teacher: a student can disagree with a miscalibrated teacher and be right.',
      cost: 'It needs labels and bins, says nothing about agreement with the teacher, and with four examples the bins are empty. It answers a different question and is usually run beside the divergence, not instead of it.',
    },
  ],
};
