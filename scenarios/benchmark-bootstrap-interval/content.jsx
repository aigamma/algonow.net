import BootstrapViz from './visuals/BootstrapViz.jsx';
import solutionSource from './python/src/bootstrap_eval/solution.py?raw';
import starterSource from './python/src/bootstrap_eval/starter.py?raw';
import answerSource from './python/src/bootstrap_eval/practice_answer.py?raw';
import lessonTests from './python/tests/test_lesson.py?raw';
import expectedOutput from './python/fixtures/expected-output.txt?raw';
import expectedPracticeOutput from './python/fixtures/expected-practice-output.txt?raw';
import resultsFixture from './python/fixtures/results.json?raw';
import traceFixture from './python/fixtures/expected-trace.json?raw';

// Authored by Claude Fable 5 in the main thread. Every number on this page was
// produced by running the files below; the expected outputs are the files'
// actual output, compared byte for byte by the tests.
const answerSnippet = answerSource.split('# --- answer begins ---\n')[1].split('# --- answer ends ---')[0].trim();

export const content = {
  brief: (
    <>
      <p>
        Orbit&apos;s new assistant model scored 18 of 25 on the internal support benchmark; the old one scored 17 of
        25. Four points looked like progress, and the team wanted to ship on it. Twenty-five items cannot settle a
        four-point difference by themselves: swap a couple of items and the gain is gone, or doubled.
      </p>
      <p>
        <strong>The action to practice:</strong> a paired bootstrap of the difference. Resample the 25 items with
        replacement, many times, with a seeded generator; score both models on the same resampled items; and report
        the range the middle 95 percent of those differences fall in. The rules are small:
      </p>
      <ul>
        <li>The two result lists are paired: entry 7 in both is the same benchmark item, 1 for right and 0 for wrong.</li>
        <li>Each resample draws 25 items with replacement, so some items repeat and some are left out, and computes new accuracy minus old accuracy on exactly those items.</li>
        <li>The interval is the 2.5th and 97.5th percentiles of the 200 differences, read off the sorted list by nearest rank.</li>
        <li>If the interval includes zero, the gain is not established. Unequal list lengths and zero resamples are rejected with a <code>ValueError</code>.</li>
      </ul>
      <p>
        <strong>Input.</strong> Two lists of 25 results, written inline, and a seed. Fifteen items are right for
        both models, two are right only for the old one (items 9 and 21), three only for the new one (items 3, 10,
        and 19), and five are wrong for both. Those five discordant items are all the difference there is:
      </p>
      <table>
        <thead><tr><th>list</th><th>right</th><th>accuracy</th><th>results, items 1 to 25</th></tr></thead>
        <tbody>
          <tr><td>OLD</td><td>17</td><td>68.0%</td><td>1 1 0 1 1 0 1 1 1 0 1 1 0 1 1 1 0 1 0 1 1 0 1 1 0</td></tr>
          <tr><td>NEW</td><td>18</td><td>72.0%</td><td>1 1 1 1 1 0 1 1 0 1 1 1 0 1 1 1 0 1 1 1 0 0 1 1 0</td></tr>
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
        Change one behavior. The worked solution reports an interval. Add one more number: the probability that the
        new model is better, estimated as the share of resamples whose difference is above zero (a difference of
        exactly zero does not count). The file below is the worked solution with an empty{' '}
        <code>better_fraction</code> function and a check for the new behavior. As shipped it prints{' '}
        <code>NOT OK</code> and stops.
      </p>
      <p>
        <strong>Hint.</strong> One short function. Count the differences greater than zero with a loop, divide the
        count by how many differences there are, and return that share as a float between 0 and 1. The division
        turns two integers into a float on its own.
      </p>
      <p>
        <strong>Expected result.</strong> 119 of the 200 resamples favor the new model, so the file prints
        &quot;probability the new model is better: 59.5% of resamples&quot; after the verdict line, and ends with{' '}
        <code>OK</code>.
      </p>
      <details>
        <summary>Show the answer</summary>
        <pre><code>{answerSnippet}</code></pre>
        <p>
          A counter, a loop with one comparison, and a division. The comparison is strict, so the 36 resamples that
          tie at zero do not count as better. Sixty percent is the honest reading of a four-point gain on 25 items:
          more likely better than not, and nowhere near certain.
        </p>
      </details>
    </>
  ),

  files: [
    { path: 'python/src/bootstrap_eval/solution.py', role: 'reference', language: 'python', source: solutionSource, primary: true,
      description: 'The complete worked example: the two result lists, accuracy, percentile, bootstrap_differences, and a demonstration that prints the accuracies, the interval, the verdict, the rejected unequal lists, and OK. Runs alone with Python 3.11 or newer.' },
    { path: 'python/src/bootstrap_eval/starter.py', role: 'starter', language: 'python', source: starterSource, primary: true,
      description: 'The practice file: the worked solution with an empty better_fraction function and a check for the new behavior. Prints NOT OK until the function returns the share of resamples above zero.' },
    { path: 'python/src/bootstrap_eval/practice_answer.py', role: 'reference', language: 'python', source: answerSource,
      description: 'The completed practice variation; the page shows the region between its answer markers.' },
    { path: 'python/fixtures/expected-output.txt', role: 'fixture', language: 'text', source: expectedOutput,
      description: 'What solution.py prints, byte for byte. The test runs the file alone and compares.' },
    { path: 'python/fixtures/expected-practice-output.txt', role: 'fixture', language: 'text', source: expectedPracticeOutput,
      description: 'What practice_answer.py prints, byte for byte.' },
    { path: 'python/tests/test_lesson.py', role: 'test', language: 'python', source: lessonTests,
      description: 'Runs the three lesson files alone, checks the accuracies, the seeded resampling, the percentile rule, the guards, the shipping decision against the interval, and that the animation fixtures match the solution.' },
    { path: 'python/fixtures/results.json', role: 'fixture', language: 'json', source: resultsFixture,
      description: 'The two result lists, the resample count, and the seed exactly as the lesson files define them; the animation runs on this copy and a test pins it to the files.' },
    { path: 'python/fixtures/expected-trace.json', role: 'fixture', language: 'json', source: traceFixture,
      description: 'The drawn indices and scores of the first twelve resamples, all two hundred differences, the interval, and the better share, derived from the Python files; the animation rescores the shown resamples and recomputes the interval from this and must match it exactly.' },
  ],

  evidence: (
    <>
      <p>
        <strong>What the file checks</strong> before it prints <code>OK</code>: the interval is a real range, it
        brackets the observed difference, and on this benchmark it includes zero. Run your copy and compare its
        output with the expected output above; they must match line for line, because the generator is seeded.
      </p>
      <p>
        <strong>The failure cases.</strong> A results list one entry short raises <code>ValueError</code> from the
        strict <code>zip</code>, and the demonstration catches it and prints the rejected line; a request for zero
        resamples raises as well. The tests also replay the generator: every resample draws exactly 25 indices
        between 0 and 24, some items repeat, and scoring those indices by hand gives the same difference the
        function recorded.
      </p>
      <p>
        <strong>The shipping decision, measured.</strong> The point estimate alone, +4.0 points, says ship. The
        interval, -12.0 to +20.0, says the gain is not established. With 1,000 resamples and the same seed the
        interval is still -12.0 to +20.0; with seed 7 and 200 resamples it is -16.0 to +24.0, a different range with
        the same verdict. And the method does detect real gains: for a constructed pair where the new model is right
        on everything the old one got right plus the other eight items, the whole interval sits above zero. All of
        this is checked by the tests in the project download.
      </p>
    </>
  ),

  solution: (
    <>
      <p>
        Read the file top to bottom: the input, three small functions, and a demonstration. Here is its Python,
        construct by construct.
      </p>
      <ol>
        <li>
          <strong>Parallel lists of 1 and 0.</strong> <code>OLD</code> and <code>NEW</code> hold one integer per item
          in the same order, so position 7 in both is the same benchmark item. <code>sum(results)</code> counts the
          right answers because every right answer is a 1, and dividing by <code>len(results)</code> gives the
          accuracy as a float.
        </li>
        <li>
          <strong>A seeded generator object.</strong> <code>random.Random(seed)</code> creates a generator with its own
          state, started from the seed, so the same seed replays the same draws on any machine. The module-level{' '}
          <code>random.randrange</code> would share one hidden global state with everything else in the program,
          which is why the function builds its own.
        </li>
        <li>
          <strong>Pairing with a strict zip.</strong> <code>list(zip(old, new, strict=True))</code> walks both lists
          in step and builds a list of (old, new) tuples, one per item. <code>strict=True</code> raises a{' '}
          <code>ValueError</code> if the lists differ in length; without it, <code>zip</code> would stop quietly at
          the shorter list and the benchmark would silently shrink.
        </li>
        <li>
          <strong>Resampling with replacement.</strong> <code>for _ in range(resamples):</code> runs the whole
          procedure 200 times; the underscore is the usual name for a loop variable that is never read. Inside,{' '}
          <code>for _ in range(count):</code> draws 25 times. <code>generator.randrange(count)</code> returns an
          integer from 0 to 24, <code>pairs[...]</code> picks that item, and{' '}
          <code>old_item, new_item = ...</code> unpacks the tuple. Because the index is drawn fresh each time, an
          item can be drawn twice and another never: that is what &quot;with replacement&quot; means.
        </li>
        <li>
          <strong>Running totals and the difference.</strong> <code>old_right += old_item</code> adds 0 or 1 to the
          total. After 25 draws, <code>(new_right - old_right) / count</code> is the difference in accuracy on this
          resample, and <code>differences.append(...)</code> keeps it.
        </li>
        <li>
          <strong>Percentiles by position.</strong> <code>sorted(values)</code> returns a sorted copy, leaving the
          list alone. <code>round(share / 100 * (len(ordered) - 1))</code> turns 2.5 percent of 199 (4.975) into
          position 5 and 97.5 percent into position 194; the value at that position is the percentile. This is the
          nearest-rank convention, one of several; Python&apos;s <code>round</code> sends an exact half to the even
          neighbour.
        </li>
        <li>
          <strong>Formats and a chained comparison.</strong> <code>{'{accuracy(OLD):.1%}'}</code> prints a share as a
          percentage with one decimal, <code>{'{observed * 100:+.1f}'}</code> prints a number with its sign, and{' '}
          <code>{'{observed * 100:.0f}'}</code> rounds to a whole number. <code>low &lt;= 0 &lt;= high</code> is one
          expression that asks whether zero sits inside the interval. The conditional expression{' '}
          <code>&quot;not established&quot; if includes_zero else &quot;established&quot;</code> picks a string in one line.
        </li>
        <li>
          <strong>The demonstration.</strong> <code>try</code> and <code>except ValueError as error</code> catch the
          rejection of the shortened list and print it, and each <code>assert</code> makes the file check one of its
          own claims before it prints <code>OK</code>.
        </li>
      </ol>
      <p><strong>Trace the values.</strong> The first four resamples, as the seeded generator draws them:</p>
      <table>
        <thead><tr><th>resample</th><th>distinct items</th><th>most drawn</th><th>old right</th><th>new right</th><th>difference</th></tr></thead>
        <tbody>
          <tr><td>1</td><td>18 of 25</td><td>item 8, three times</td><td>20</td><td>18</td><td>-8.0 points</td></tr>
          <tr><td>2</td><td>14 of 25</td><td>item 6, four times</td><td>15</td><td>16</td><td>+4.0 points</td></tr>
          <tr><td>3</td><td>17 of 25</td><td>item 7, three times</td><td>16</td><td>18</td><td>+8.0 points</td></tr>
          <tr><td>4</td><td>15 of 25</td><td>item 12, three times</td><td>17</td><td>20</td><td>+12.0 points</td></tr>
        </tbody>
      </table>
      <p>
        The very first resample favors the old model by eight points, and the next three favor the new one by four
        to twelve. Across all 200, the sorted differences run from -16.0 to +32.0 points; position 5 holds -12.0 and
        position 194 holds +20.0, so that is the interval, and zero sits inside it.
      </p>
      <p>
        <strong>Why these decisions.</strong> The resample is paired: both models are scored on the same drawn
        items, so item difficulty cancels and only their disagreements move the difference. Two hundred resamples
        keep the output short to read; real reports use a thousand or more, and the tests show the interval here
        barely changes. The seed makes the run reproducible, which is what lets the page show exact numbers and
        lets a reviewer rerun them. Percentiles of the bootstrap distribution need no formula for the standard error,
        which is why the same code works for any metric. And the verdict is about zero sitting inside the interval,
        not about a p-value: the question the team asked was &quot;could the true difference be nothing?&quot;, and
        the interval answers exactly that.
      </p>
      <p>
        <strong>The pattern, and its limits.</strong> Resample, recompute, read off percentiles. The same loop gives
        an interval for an F1 score, a pass rate, or a mean latency, metrics with no textbook formula. Its limits: 25
        items make a wide interval whatever method you use, so the real fix is a larger benchmark; the bootstrap
        assumes the items are exchangeable, which a benchmark built from one customer&apos;s tickets is not; it says
        nothing about how the models behave on traffic unlike the benchmark; and a tight interval around a tiny gain
        is still a tiny gain. The nearest-rank percentile interval is the simplest convention; bias-corrected
        variants exist for skewed metrics.
      </p>
    </>
  ),

  visual: (
    <figure className="fig">
      <BootstrapViz />
      <figcaption className="fig-cap">
        <span className="fig-caption-text">
          The bootstrap from the file, run on its own 25 items at a reading pace: about two and a half seconds per
          shown resample, under half a minute in all. The 25 items stand as split squares on the left, old on the left
          half and new on the right; each shown resample draws its 25 tiles in the middle, with repeats, and scores
          both models; the histogram of differences on the right grows by one bar per resample, then fills with the
          remaining resamples computed by the Python file; the 95% interval bracket and the zero line appear; and
          the practice variation shades the resamples above zero. Step through with the buttons. The figure rests
          for two minutes before it plays again, and the motion setting in the site header can slow or stop it. The
          shown resamples are rescored in the browser from the indices the Python file drew, and the interval is
          recomputed from its differences and checked against the Python run.
        </span>
      </figcaption>
    </figure>
  ),

  tradeoffs: [
    {
      name: 'Ship on the point estimate (what shipped)',
      preferWhen: 'The benchmark is large enough that four points is many items, the decision is cheap to reverse, and the number is one signal among several rather than the gate.',
      cost: 'On 25 items a four-point gain is one item. The bootstrap interval for this run is -12.0 to +20.0 points: the same benchmark could as easily have shown the old model ahead. A number without a range is a guess with a confident face.',
    },
    {
      name: 'McNemar’s exact test on the discordant items',
      preferWhen: 'The question is only whether the two models differ at all, the items are paired, and a p-value is the currency the team already speaks.',
      cost: 'It uses only the items where the models disagree (two for the old model, three for the new one here), so it is a test of 3 against 2, and it answers yes or no rather than how much. No resampling, but also no interval, and no help for metrics beyond paired right-or-wrong.',
    },
    {
      name: 'A larger benchmark',
      preferWhen: 'Always, when it can be had: the interval narrows with the square root of the item count, so four times the items halve the width.',
      cost: 'Writing and labeling items is slow and expensive, and a bigger set drawn from the same narrow source inherits its blind spots. The bootstrap does not replace it; it tells you honestly how far the current set can take you.',
    },
  ],
};
