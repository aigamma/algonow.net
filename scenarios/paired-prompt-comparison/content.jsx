import PairedEvalViz from './visuals/PairedEvalViz.jsx';
import solutionSource from './python/src/paired_eval/solution.py?raw';
import starterSource from './python/src/paired_eval/starter.py?raw';
import answerSource from './python/src/paired_eval/practice_answer.py?raw';
import lessonTests from './python/tests/test_lesson.py?raw';
import expectedOutput from './python/fixtures/expected-output.txt?raw';
import expectedPracticeOutput from './python/fixtures/expected-practice-output.txt?raw';
import ticketsFixture from './python/fixtures/tickets.json?raw';

// Authored by Claude Fable 5 in the main thread. Every number on this page was
// produced by running the files below; the expected outputs are the files'
// actual output, compared byte for byte by the tests.
const answerSnippet = answerSource.split('# --- answer begins ---\n')[1].split('# --- answer ends ---')[0].trim();

export const content = {
  brief: (
    <>
      <p>
        Orbit&apos;s support assistant reads each incoming ticket and routes it into one of four categories:
        billing, access, outage, or feature. A rewritten prompt (call it prompt B) scored higher than the old prompt A
        on the evaluation set, 6 of 9 against 5 of 9, so it shipped. Within a day, two outage tickets that prompt A had
        always routed correctly were sent to the wrong queue. Aggregate accuracy had gone up, and the most urgent
        category had gotten worse.
      </p>
      <p>
        <strong>The action to practice:</strong> pair the two prompts ticket by ticket. One pass over the tickets
        answers a sharper question than &quot;which prompt scores higher&quot;: on which tickets do they differ, and in
        which direction. The rules are small:
      </p>
      <ul>
        <li>For each ticket, decide whether A is right and whether B is right. That puts it in one of four cells: both right, only A right, only B right, both wrong.</li>
        <li>Count the four cells. Each prompt&apos;s accuracy is the sum of its two cells, so nothing is lost; the table only adds where the difference comes from.</li>
        <li>List the regressions (A right, B wrong) and the gains (A wrong, B right) by ticket id, so each one can be looked at.</li>
        <li>The four lists must have one entry per ticket. A length mismatch is rejected with a <code>ValueError</code> instead of being silently truncated.</li>
      </ul>
      <p>
        <strong>Input.</strong> Nine tickets as four parallel lists: the ids, the gold label, prompt A&apos;s answer,
        prompt B&apos;s answer. One detail is planted on purpose: for t5, prompt B answered <code>&quot;Outage &quot;</code>{' '}
        with a capital letter and a trailing space. The worked example compares exact strings, so that counts as
        wrong; the practice variation changes exactly that rule.
      </p>
      <table>
        <thead><tr><th>ticket</th><th>gold</th><th>prompt A</th><th>prompt B</th><th>cell</th></tr></thead>
        <tbody>
          <tr><td>t1</td><td>billing</td><td>billing</td><td>billing</td><td>both right</td></tr>
          <tr><td>t2</td><td>access</td><td>access</td><td>access</td><td>both right</td></tr>
          <tr><td>t3</td><td>outage</td><td>outage</td><td>access</td><td>regression</td></tr>
          <tr><td>t4</td><td>feature</td><td>billing</td><td>feature</td><td>gain</td></tr>
          <tr><td>t5</td><td>outage</td><td>outage</td><td>&quot;Outage &quot;</td><td>regression (exact strings)</td></tr>
          <tr><td>t6</td><td>billing</td><td>access</td><td>billing</td><td>gain</td></tr>
          <tr><td>t7</td><td>access</td><td>feature</td><td>access</td><td>gain</td></tr>
          <tr><td>t8</td><td>feature</td><td>feature</td><td>feature</td><td>both right</td></tr>
          <tr><td>t9</td><td>outage</td><td>feature</td><td>billing</td><td>both wrong</td></tr>
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
        Change one behavior. The worked solution compares answers as exact strings, so prompt B&apos;s{' '}
        <code>&quot;Outage &quot;</code> for t5 counts as wrong and t5 shows up as a regression. Make the comparison
        ignore case and surrounding whitespace. The file below is the worked solution with a <code>normalize</code>{' '}
        function that returns its text unchanged; <code>compare</code> already passes every label and answer through
        it, so the only thing to complete is that one function body. As shipped it prints <code>NOT OK</code> and stops.
      </p>
      <p>
        <strong>Hint.</strong> Strings have methods for exactly this. <code>text.strip()</code> removes the whitespace
        at both ends and <code>text.lower()</code> lowers the letters. Chain them: the result of one call is a string,
        so the next method applies to it directly.
      </p>
      <p>
        <strong>Expected result.</strong> Prompt B right 7 of 9 (78%), the table becomes 4, 1, 3, 1, and the only
        regression left is t3 outage. The file ends with <code>OK</code>.
      </p>
      <details>
        <summary>Show the answer</summary>
        <pre><code>{answerSnippet}</code></pre>
        <p>
          One line. Notice what it does to the story: t5 was never a real regression, only a formatting difference,
          and t3 still is. Everything outside the marked region is the practice file unchanged.
        </p>
      </details>
    </>
  ),

  files: [
    { path: 'python/src/paired_eval/solution.py', role: 'reference', language: 'python', source: solutionSource, primary: true,
      description: 'The complete worked example: the four lists, compare, two small helpers, and a demonstration that prints the report, the rejected case, and OK. Runs alone with Python 3.11 or newer.' },
    { path: 'python/src/paired_eval/starter.py', role: 'starter', language: 'python', source: starterSource, primary: true,
      description: 'The practice file: the worked solution with a normalize function to complete and a check for the new behavior. Prints NOT OK until labels are compared after strip and lower.' },
    { path: 'python/src/paired_eval/practice_answer.py', role: 'reference', language: 'python', source: answerSource,
      description: 'The completed practice variation; the page shows the region between its answer markers.' },
    { path: 'python/fixtures/expected-output.txt', role: 'fixture', language: 'text', source: expectedOutput,
      description: 'What solution.py prints, byte for byte. The test runs the file alone and compares.' },
    { path: 'python/fixtures/expected-practice-output.txt', role: 'fixture', language: 'text', source: expectedPracticeOutput,
      description: 'What practice_answer.py prints, byte for byte.' },
    { path: 'python/tests/test_lesson.py', role: 'test', language: 'python', source: lessonTests,
      description: 'Runs the three lesson files alone and checks the two-by-two arithmetic, the strict length rule, the empty set, the exact-string policy, that aggregate accuracy alone would have approved prompt B, and that the animation fixtures match the solution.' },
    { path: 'python/fixtures/tickets.json', role: 'fixture', language: 'json', source: ticketsFixture,
      description: 'The four parallel lists exactly as solution.py defines them; the animation runs on this copy and a test pins it to the file. The trace fixture it replays (expected-trace.json) stays in the package and the download.' },
  ],

  evidence: (
    <>
      <p>
        <strong>What the file checks</strong> before it prints <code>OK</code>: the four counts are 3, 2, 3, 1;
        A&apos;s total of 5 agrees with summing the booleans of <code>answer == label</code>; and both regressions are
        outage tickets. Run your copy and compare its output with the expected output above; they must match line for line.
      </p>
      <p>
        <strong>The failure case.</strong> The demonstration calls <code>compare</code> with a gold list of eight
        entries against nine ids, and the strict <code>zip</code> raises <code>ValueError</code> saying that argument 2
        is shorter than argument 1. The demonstration catches it and prints the rejected line instead of crashing; the
        tests check the same error when the ids list is shorter or an answers list is longer. They also check that every
        ticket lands in exactly one cell, that each prompt&apos;s total equals the sum of its two cells, that the
        caller&apos;s lists are unchanged, and that an empty evaluation set gives zero counts and prints 0%.
      </p>
      <p>
        <strong>Aggregate against paired, on the same nine tickets.</strong> Accuracy alone would have approved prompt
        B: 6 beats 5. The paired table shows two regressions, both outage. Gains minus regressions (3 minus 2) equals
        B&apos;s total minus A&apos;s total (6 minus 5): the headline improvement is the net of two opposite movements,
        and the losing side is the urgent one. Both facts are checked by the tests in the project download.
      </p>
    </>
  ),

  solution: (
    <>
      <p>
        Read the file top to bottom: four lists, one function that does the work, two small helpers, and a
        demonstration. Here is its Python, construct by construct.
      </p>
      <ol>
        <li>
          <strong>Parallel lists.</strong> <code>IDS</code>, <code>GOLD</code>, <code>PROMPT_A</code>, and{' '}
          <code>PROMPT_B</code> have the same length, and position 3 in each describes the same ticket. This shape is
          everywhere in evaluation code, because predictions come back as a list aligned with the labels they were made for.
        </li>
        <li>
          <strong><code>zip</code> with <code>strict=True</code>.</strong>{' '}
          <code>for ticket, label, answer_a, answer_b in zip(ids, gold, a, b, strict=True):</code> walks the four lists
          in step, handing out one value from each per iteration; the four names on the left unpack them. Without{' '}
          <code>strict</code>, <code>zip</code> stops quietly at the shortest list, and an export missing one row would
          simply count eight tickets. With it, a length mismatch raises <code>ValueError</code> naming the shorter argument.
        </li>
        <li>
          <strong>Booleans from <code>==</code>.</strong> <code>answer_a == label</code> is <code>True</code> or{' '}
          <code>False</code>. The loop appends a tuple of four values to <code>outcomes</code>: a tuple is a fixed-size
          record written with parentheses, and it cannot be changed afterwards.
        </li>
        <li>
          <strong>A dictionary keyed by tuples.</strong> <code>counts</code> starts with four keys, <code>(True, True)</code>{' '}
          and the other three pairs, each at 0. <code>counts[(a_right, b_right)] += 1</code> looks up the cell from the two
          booleans and adds one. Tuples can be keys because they are immutable, so a two-way table fits in one dictionary
          instead of a dictionary of dictionaries.
        </li>
        <li>
          <strong>Comprehensions with a condition.</strong>{' '}
          <code>[(ticket, label) for ticket, label, a_right, b_right in outcomes if a_right and not b_right]</code> builds
          the regressions in one expression: the value to collect, then <code>for</code> and the names, then{' '}
          <code>if</code> and the condition. It reads as &quot;the (ticket, label) of each outcome where A is right and B
          is not&quot;. <code>gains</code> is the same with the roles swapped.
        </li>
        <li>
          <strong>Totals from the cells.</strong> <code>counts[(True, True)] + counts[(True, False)]</code> is A&apos;s
          count of right answers; B&apos;s uses the first column. The demonstration checks A&apos;s total a second way:{' '}
          <code>sum(answer == label for answer, label in zip(PROMPT_A, GOLD))</code>, a comprehension without its
          brackets fed straight into <code>sum</code>, where <code>True</code> counts as 1.
        </li>
        <li>
          <strong>Format specs.</strong> <code>f&quot;{'{'}part / whole:.0%{'}'}&quot;</code> multiplies by 100 and
          prints a whole percent sign; <code>percent</code> returns <code>0%</code> for an empty set instead of dividing by
          zero. In the table lines, <code>{'{'}&apos;A right&apos;:&lt;10{'}'}</code> pads the row label to ten characters,
          left-aligned, and <code>{'{'}count:&gt;9{'}'}</code> right-aligns a count in nine. <code>describe</code> joins
          (ticket, label) pairs into one line with a comprehension and <code>&quot;, &quot;.join(...)</code>.
        </li>
        <li>
          <strong>The demonstration.</strong> <code>if __name__ == &quot;__main__&quot;:</code> runs only when the file is
          executed directly. It prints the report, then calls <code>compare</code> with a gold list one entry short inside{' '}
          <code>try</code>, and <code>except ValueError as error</code> prints the rejected line. Each <code>assert</code>{' '}
          makes the file check one of its own claims before it prints <code>OK</code>.
        </li>
      </ol>
      <p><strong>Trace the tickets.</strong> Follow each one into its cell:</p>
      <table>
        <thead><tr><th>ticket</th><th>gold</th><th>A right?</th><th>B right?</th><th>cell</th><th>counts so far</th></tr></thead>
        <tbody>
          <tr><td>t1 billing</td><td>billing</td><td>yes</td><td>yes</td><td>both right</td><td>1, 0, 0, 0</td></tr>
          <tr><td>t2 access</td><td>access</td><td>yes</td><td>yes</td><td>both right</td><td>2, 0, 0, 0</td></tr>
          <tr><td>t3 outage</td><td>outage</td><td>yes</td><td>no (access)</td><td>regression</td><td>2, 1, 0, 0</td></tr>
          <tr><td>t4 feature</td><td>feature</td><td>no (billing)</td><td>yes</td><td>gain</td><td>2, 1, 1, 0</td></tr>
          <tr><td>t5 outage</td><td>outage</td><td>yes</td><td>no (&quot;Outage &quot;)</td><td>regression</td><td>2, 2, 1, 0</td></tr>
          <tr><td>t6 billing</td><td>billing</td><td>no (access)</td><td>yes</td><td>gain</td><td>2, 2, 2, 0</td></tr>
          <tr><td>t7 access</td><td>access</td><td>no (feature)</td><td>yes</td><td>gain</td><td>2, 2, 3, 0</td></tr>
          <tr><td>t8 feature</td><td>feature</td><td>yes</td><td>yes</td><td>both right</td><td>3, 2, 3, 0</td></tr>
          <tr><td>t9 outage</td><td>outage</td><td>no (feature)</td><td>no (billing)</td><td>both wrong</td><td>3, 2, 3, 1</td></tr>
        </tbody>
      </table>
      <p>
        <strong>Why these decisions.</strong> Pairing localizes the change: the aggregate difference of one ticket is
        the net of three gains and two regressions, and the two regressions share a category, which is exactly the
        information aggregate accuracy throws away. The strict <code>zip</code> is there because an off-by-one in an
        exported predictions file is the most common silent error in evaluation code, and silent is the problem. Tuples
        as keys keep the four cells in one table, and the output names tickets by id because a regression you cannot name
        is a regression you cannot fix. Comparing exact strings is a policy, made visible by t5 rather than hidden; the
        practice variation is where that policy gets relaxed.
      </p>
      <p>
        <strong>The pattern, and its limits.</strong> This is the paired comparison: a two-by-two table of two versions
        on the same items. It is the backbone of model-version evaluation and of A/B analysis, and the two discordant
        cells (only A, only B) are what McNemar&apos;s test examines when the question is whether a difference is real.
        Nine items cannot support a significance claim, so a real decision needs hundreds of items and that test. Exact
        matching needs normalization or a judge once answers are free text. And the table says where two versions differ,
        not which one is better for the business: that is a decision about the categories that regressed.
      </p>
    </>
  ),

  visual: (
    <figure className="fig">
      <PairedEvalViz />
      <figcaption className="fig-cap">
        <span className="fig-caption-text">
          The comparison from the file, run on its own nine tickets at a reading pace: about two and a half seconds per
          ticket, about thirty-six seconds in all. Each ticket is carried from the queue into its cell of the two-by-two
          grid while the caption states both answers and the verdict; then the counts and the two accuracy bars appear,
          the regressions cell is framed with its two outage tickets, and the practice variation moves t5 into both right
          after strip and lower. Step through with the buttons. The figure rests for two minutes before it plays again,
          and the motion setting in the site header can slow or stop it. Every verdict and number comes from the same
          comparison run in the browser and is checked against the Python run.
        </span>
      </figcaption>
    </figure>
  ),

  tradeoffs: [
    {
      name: 'Aggregate accuracy with a ship threshold (what shipped)',
      preferWhen: 'The two versions are expected to differ broadly rather than in one category, and the evaluation set is large and representative, so a higher score means a better prompt almost everywhere.',
      cost: 'It hides regressions that concentrate in one place. A gain of one ticket can be three gains and two losses, and the losses can all be the urgent ones. On these nine tickets it approved the prompt that broke outage routing.',
    },
    {
      name: 'Paired comparison with a significance test (McNemar on the discordant cells)',
      preferWhen: 'Deciding at scale, with hundreds of labeled items, where the question is whether the difference between the versions is real or noise. The test looks only at the two discordant cells, only A right and only B right.',
      cost: 'More labeled items, a statistics step, and it still needs the regressions listed by id before anyone can act. Significance says the difference is real; it does not say which tickets to look at.',
    },
    {
      name: 'A language model as a judge, rating both answers side by side',
      preferWhen: 'Free-text answers such as summaries or explanations, where exact matching cannot work and a rubric can be stated.',
      cost: 'A model call per item, a position bias that must be controlled by swapping the order, and a judge that needs its own validation against human labels before its verdicts count. The two-by-two table still applies to the judge’s verdicts.',
    },
  ],
};
