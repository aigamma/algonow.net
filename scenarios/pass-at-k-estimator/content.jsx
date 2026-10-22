import CodeBlock from '../../src/components/CodeBlock.jsx';
import PassAtKViz from './visuals/PassAtKViz.jsx';
import solutionSource from './python/src/pass_at_k/solution.py?raw';
import starterSource from './python/src/pass_at_k/starter.py?raw';
import answerSource from './python/src/pass_at_k/practice_answer.py?raw';
import lessonTests from './python/tests/test_lesson.py?raw';
import expectedOutput from './python/fixtures/expected-output.txt?raw';
import expectedPracticeOutput from './python/fixtures/expected-practice-output.txt?raw';
import problemsFixture from './python/fixtures/problems.json?raw';

// Authored by Claude Fable 5. Every number on this page was produced by
// running the files below; the expected outputs are the files' actual output,
// compared byte for byte by the tests.
const answerSnippet = answerSource.split('# --- answer begins ---\n')[1].split('# --- answer ends ---')[0].trim();

export const content = {
  brief: (
    <>
      <p>
        Orbit evaluates its code model by sampling five candidate solutions for every benchmark problem and running
        the tests on each one. The team reported the share of problems where any of the five passed as the
        model&apos;s score. That number answers one question only: what a user sees after trying all five samples.
        A user who takes the first sample and runs with it sees something much lower, and nobody had computed it.
      </p>
      <p>
        <strong>The action to practice:</strong> turn the per-problem sample counts into pass@k, the chance that at
        least one of k samples passes, for any k up to n, without sampling again. Four small moves:
      </p>
      <ul>
        <li><strong>Count the subsets.</strong> Of the n samples, a user who takes k of them gets one of <code>comb(n, k)</code> equally likely subsets.</li>
        <li><strong>Count the bad ones.</strong> A subset with no passing sample is made only of the n minus c failures: there are <code>comb(n - c, k)</code> of those.</li>
        <li><strong>Divide.</strong> The subsets with at least one pass, over all subsets, is the estimate: <code>(comb(n, k) - comb(n - c, k)) / comb(n, k)</code>, which is exact, not a guess.</li>
        <li><strong>Guard the edge.</strong> When the failures cannot fill a subset of k, every subset holds a pass, and the estimate is 1 before any arithmetic.</li>
      </ul>
      <p>
        <strong>Input.</strong> Six problems, written inline as a list of dictionaries: for each, the number of samples
        n and the number that passed, c. The k values to report are 1, 3, and 5.
      </p>
      <table>
        <thead><tr><th>problem</th><th>p1 date parsing</th><th>p2 interval merge</th><th>p3 LRU cache</th><th>p4 email check</th><th>p5 topological sort</th><th>p6 binary search</th></tr></thead>
        <tbody>
          <tr><td>passed c of n</td><td>5 of 5</td><td>3 of 5</td><td>1 of 5</td><td>0 of 5</td><td>2 of 5</td><td>4 of 5</td></tr>
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
        Add one behavior. The worked solution estimates the chance that <em>at least one</em> of k samples passes.
        Add <code>pass_all_k</code>: the chance that <em>every one</em> of the k samples passes, the number to report
        when a user will trust the first answer without checking the others. The file below is the worked solution
        with a <code>pass_all_k</code> that returns 0.0 and is not written yet, and a check for the new behavior. As
        shipped it prints <code>NOT OK</code> and stops.
      </p>
      <p>
        <strong>Hint.</strong> Of the <code>comb(n, k)</code> subsets of size k, the ones made only of passing samples
        are the subsets of size k drawn from the c passes: <code>comb(c, k)</code>. When c is below k no such subset
        exists, so the answer is 0.0. Keep the same two guards as <code>pass_at_k</code>, and let{' '}
        <code>estimate(PROBLEMS, KS, score=pass_all_k)</code> build the second table; the scoring function is a
        parameter for exactly this reason.
      </p>
      <p>
        <strong>Expected result.</strong> A second table whose mean row reads 0.500, 0.250, and 0.167. The first
        column equals pass@1 exactly, because with a single sample &quot;at least one passes&quot; and &quot;all of
        them pass&quot; are the same event; p6 reads 0.400 at k of 3, since four of its ten subsets of three are made
        only of passes. The file ends with <code>OK</code>.
      </p>
      <details>
        <summary>Show the answer</summary>
        <CodeBlock filename="Practice answer" code={answerSnippet} />
        <p>
          The same two guards, a different early return, and one division: the subsets drawn from the passes over
          all subsets. Everything outside the marked region is the practice file unchanged.
        </p>
      </details>
    </>
  ),

  files: [
    { path: 'python/src/pass_at_k/solution.py', role: 'reference', language: 'python', source: solutionSource, primary: true,
      description: 'The complete worked example: the six problems, pass_at_k with its guards and early return, estimate over several k with a scoring function as a parameter, print_table, and a demonstration that prints the table, the means, the any-correct rate, the rejected call, and OK. Runs alone with Python 3.11 or newer.' },
    { path: 'python/src/pass_at_k/starter.py', role: 'starter', language: 'python', source: starterSource, primary: true,
      description: 'The practice file: the worked solution with a pass_all_k that is not written yet and a check for the new behavior. Prints NOT OK until pass_all_k returns the share of subsets made only of passes.' },
    { path: 'python/src/pass_at_k/practice_answer.py', role: 'reference', language: 'python', source: answerSource,
      description: 'The completed practice variation; the page shows the region between its answer markers.' },
    { path: 'python/fixtures/expected-output.txt', role: 'fixture', language: 'text', source: expectedOutput,
      description: 'What solution.py prints, byte for byte. The test runs the file alone and compares.' },
    { path: 'python/fixtures/expected-practice-output.txt', role: 'fixture', language: 'text', source: expectedPracticeOutput,
      description: 'What practice_answer.py prints, byte for byte.' },
    { path: 'python/tests/test_lesson.py', role: 'test', language: 'python', source: lessonTests,
      description: 'Runs the three lesson files alone, checks every estimate against the subsets it stands for by brute force, the identities at k of 1 and k of n, the guards, the practice estimator, the fixtures the animation replays, and measures the any-correct rate that shipped against pass at one and pass at three on the same samples.' },
    { path: 'python/fixtures/problems.json', role: 'fixture', language: 'json', source: problemsFixture,
      description: 'The six problems and the k values exactly as the lesson files define them, plus which problem the figure enumerates; the animation runs on this copy and a test pins it to the files.' },
  ],

  evidence: (
    <>
      <p>
        <strong>What the file checks</strong> before it prints <code>OK</code>: pass@3 for p5 is exactly 0.9 (nine of
        the ten subsets of three hold a pass), the three means round to 0.500, 0.750, and 0.833, and the pass@5 mean
        equals the any-correct rate to twelve decimals. Run your copy and compare its output with the expected output
        above; they must match line for line.
      </p>
      <p>
        <strong>The failure cases.</strong> The demonstration asks for pass@6 from five samples, and the first guard
        raises a <code>ValueError</code> that the demonstration prints as the rejected line instead of returning a
        number that means nothing. The tests also reject k of 0, c above n, and a negative c, check that the early
        return is the exact 1.0 and not a rounded 0.999, and feed <code>estimate</code> a different scoring function to
        prove the table code does not depend on the estimator.
      </p>
      <p>
        <strong>The estimator against the subsets it stands for.</strong> For every problem and every k from 1 to 5,
        a test enumerates all the subsets of k samples with <code>itertools.combinations</code>, counts the ones that
        hold a pass, and compares the share with <code>pass_at_k</code> to twelve decimals; the practice estimator is
        checked the same way against the subsets made only of passes.
      </p>
      <p>
        <strong>What shipped, on the same samples.</strong> &quot;Any sample passed&quot; is true for five of the six
        problems, 0.833, and that is exactly the pass@5 mean: the shipped score was pass@5 wearing the name of
        accuracy. It overstates pass@3 (0.750) by a twelfth and pass@1 (0.500) by a third. Per problem, the shipped
        indicator is 1 for every problem with a single passing sample, while pass@1 for those problems reads 1.0, 0.6,
        0.2, 0.4, and 0.8. Both measurements are tests in the project download.
      </p>
    </>
  ),

  solution: (
    <>
      <p>
        Read the file top to bottom: the input, one function that estimates, one that builds the table, one that
        prints it, and a demonstration. Here is its Python, construct by construct.
      </p>
      <ol>
        <li>
          <strong>Importing one name.</strong> <code>from math import comb</code> brings a single function into the
          file, so it is called as <code>comb(n, k)</code> with no module prefix. <code>comb</code> returns the number
          of ways to choose k items from n without regard to order: <code>comb(5, 3)</code> is 10, <code>comb(5, 5)</code>{' '}
          is 1, and when k is larger than n it returns 0.
        </li>
        <li>
          <strong>Two guards.</strong> <code>if k &lt; 1 or k &gt; n:</code> joins two tests with <code>or</code> and
          raises a <code>ValueError</code> whose f-string names the offending values. The second guard does the same
          for c. A guard at the top means every line below can trust its inputs.
        </li>
        <li>
          <strong>An early return.</strong> <code>if n - c &lt; k: return 1.0</code> leaves the function before the
          arithmetic: with fewer failures than slots, no subset of k can be made only of failures, so every subset
          holds a pass. The formula below would also give 1.0 here, because <code>comb</code> returns 0 when its first
          argument is smaller than k, but the early return names the case instead of relying on that detail.
        </li>
        <li>
          <strong>Counting the complement.</strong> <code>(comb(n, k) - comb(n - c, k)) / comb(n, k)</code>: all the
          subsets, minus the ones made only of failures, over all the subsets. The subtraction happens between
          integers and the division comes last, so pass@1 is exactly c over n and pass@3 for p5 is exactly 0.9.
        </li>
        <li>
          <strong>A function as a parameter.</strong> <code>def estimate(problems, ks, score=pass_at_k):</code> names a
          function as a default value. Inside, <code>score(problem[&quot;n&quot;], problem[&quot;c&quot;], k)</code>{' '}
          calls whichever function was passed. The worked example never passes one, so <code>pass_at_k</code> runs;
          the practice variation passes <code>pass_all_k</code> and reuses every other line.
        </li>
        <li>
          <strong>Nested loops that build a table.</strong> The outer loop visits each problem; the inner loop over{' '}
          <code>ks</code> appends one score per k to a fresh list; then one dictionary per problem is appended to{' '}
          <code>rows</code>. The means loop runs over <code>range(len(ks))</code>, the column positions, adding{' '}
          <code>row[&quot;scores&quot;][position]</code> into a running total and dividing by the number of rows.
        </li>
        <li>
          <strong>Printing a table.</strong> <code>print(..., end=&quot;&quot;)</code> replaces the newline that{' '}
          <code>print</code> normally adds with nothing, so several calls build one line; a bare <code>print()</code>{' '}
          ends it. The format specs line the columns up: <code>{'{\'problem\':<20}'}</code> pads to twenty characters
          on the left and <code>{'{value:>9.3f}'}</code> right aligns three decimals in nine.{' '}
          <code>label + &apos;@&apos; + str(k)</code> joins strings and a number turned into text.
        </li>
        <li>
          <strong>The demonstration.</strong> A loop counts the problems with <code>problem[&quot;c&quot;] &gt; 0</code>{' '}
          into <code>any_correct</code>, the number that shipped. <code>try</code> and <code>except ValueError</code>{' '}
          show the rejected call without crashing, and each <code>assert</code> checks one claim before <code>OK</code>.
        </li>
      </ol>
      <p><strong>Trace the arithmetic.</strong> Follow the failure count and the two subset counts into each estimate:</p>
      <table>
        <thead><tr><th>problem</th><th>c</th><th>failures</th><th>k = 1</th><th>k = 3</th><th>k = 5</th></tr></thead>
        <tbody>
          <tr><td>p1</td><td>5</td><td>0</td><td>early return: 1.000</td><td>early return: 1.000</td><td>early return: 1.000</td></tr>
          <tr><td>p2</td><td>3</td><td>2</td><td>(5 - 2) / 5 = 0.600</td><td>early return: 1.000</td><td>early return: 1.000</td></tr>
          <tr><td>p3</td><td>1</td><td>4</td><td>(5 - 4) / 5 = 0.200</td><td>(10 - 4) / 10 = 0.600</td><td>early return: 1.000</td></tr>
          <tr><td>p4</td><td>0</td><td>5</td><td>(5 - 5) / 5 = 0.000</td><td>(10 - 10) / 10 = 0.000</td><td>(1 - 1) / 1 = 0.000</td></tr>
          <tr><td>p5</td><td>2</td><td>3</td><td>(5 - 3) / 5 = 0.400</td><td>(10 - 1) / 10 = 0.900</td><td>early return: 1.000</td></tr>
          <tr><td>p6</td><td>4</td><td>1</td><td>(5 - 1) / 5 = 0.800</td><td>early return: 1.000</td><td>early return: 1.000</td></tr>
        </tbody>
      </table>
      <p>
        The means are the column averages: 0.500, 0.750, and 0.833. The last one is five sixths, the share of problems
        with any passing sample, because at k equal to n the one subset is the whole set and it holds a pass exactly
        when c is above zero.
      </p>
      <p>
        <strong>Why these decisions.</strong> The subset count rather than the tempting <code>1 - (1 - c/n) ** k</code>:
        that formula treats the k samples as drawn with replacement from an infinite pool and is biased for small n,
        while the subset count is the exact probability for samples drawn from the n actually taken, which is the
        estimator the Codex paper introduced for exactly this reason. The complement is counted because the subsets
        with no pass have one shape, all failures, while the subsets with at least one pass have many. The guards and
        the early return come first so the formula line never has to defend itself. The scoring function is a
        parameter because the table, the means, and the printing do not care which probability they tabulate.
      </p>
      <p>
        <strong>The pattern, and its limits.</strong> Sample once, estimate for every k: the same n samples per
        problem answer the single-try question and the five-try question without another run. The same shape
        estimates agreement rates, retry policies, and any &quot;at least one of k&quot; question from a fixed pool.
        Its limits: n must be at least k, and a tight estimate for a small k wants many more samples than k; the
        samples must be exchangeable, drawn the same way at the same temperature; &quot;passing the tests&quot; is only
        as true as the tests; and six problems make a worked example, not a benchmark.
      </p>
    </>
  ),

  visual: (
    <figure className="fig">
      <PassAtKViz />
      <figcaption className="fig-cap">
        <span className="fig-caption-text">
          The estimator from the file, run on its own six problems at a reading pace: about two and a half seconds per
          table row, about thirty five seconds in all. The intro names what shipped. Then one problem, p5 with two
          passes in five, shows its five samples and the ten subsets of three, nine of which hold a pass, and the
          ratio reads 0.900. The table on the right fills one row per problem with the three estimates and their
          formulas, the means appear, and the practice variation switches to the subsets made only of passes for p6.
          Step through with the buttons. The figure rests for two minutes before it plays again, and the motion
          setting in the site header can slow or stop it. Every subset and estimate comes from the same functions run
          in the browser and is compared with the Python run.
        </span>
      </figcaption>
    </figure>
  ),

  tradeoffs: [
    {
      name: 'Any of the n samples passed (what shipped)',
      preferWhen: 'The product really runs the tests on every sample and hands the user a passing one, so the user experience is the n-sample experience; then this number is honest, under its real name, pass at n.',
      cost: 'Reported as accuracy it overstates every smaller k: on the six problems it reads 0.833 where pass at three is 0.750 and pass at one is 0.500. It also cannot answer any question about fewer samples without resampling.',
    },
    {
      name: 'The unbiased pass at k from n samples (this lesson)',
      preferWhen: 'One sampling run must answer several k at once, from the single-try user to the many-try agent, and the samples were drawn the same way.',
      cost: 'It needs n at least k, and a tight estimate for a small k wants many more samples than k, which is model time and test time per problem; per-problem estimates on five samples move in steps of a fifth.',
    },
    {
      name: 'Greedy single-sample accuracy (temperature zero)',
      preferWhen: 'A cheap, deterministic regression gate: one sample per problem, the same answer every run, no variance to argue about.',
      cost: 'It is pessimistic about anything that samples, says nothing about pass at three or five, and a greedy decode is not the sample a user at a normal temperature gets; best-of-n with a verifier or a majority vote is the other direction, more compute per problem for a higher number.',
    },
  ],
};
