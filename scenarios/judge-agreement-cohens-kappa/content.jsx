import CodeBlock from '../../src/components/CodeBlock.jsx';
import KappaViz from './visuals/KappaViz.jsx';
import solutionSource from './python/src/judge_kappa/solution.py?raw';
import starterSource from './python/src/judge_kappa/starter.py?raw';
import answerSource from './python/src/judge_kappa/practice_answer.py?raw';
import lessonTests from './python/tests/test_lesson.py?raw';
import expectedOutput from './python/fixtures/expected-output.txt?raw';
import expectedPracticeOutput from './python/fixtures/expected-practice-output.txt?raw';
import gradesFixture from './python/fixtures/grades.json?raw';

// Authored by Claude Fable 5 in the main thread. Every number on this page was
// produced by running the files below; the expected outputs are the files'
// actual output, compared byte for byte by the tests.
const answerSnippet = answerSource.split('# --- answer begins ---\n')[1].split('# --- answer ends ---')[0].trim();

export const content = {
  brief: (
    <>
      <p>
        Orbit replaced its human review of assistant answers with a model judge that grades each answer pass or fail.
        The report said the judge agrees with the human reviewer on 80 percent of answers, and the team was ready to
        retire the human review. But seven answers in ten pass anyway. Two graders who both pass most answers agree
        most of the time by luck alone, so a percentage of agreement says little about the judge.
      </p>
      <p>
        <strong>The action to practice:</strong> compute Cohen&apos;s kappa, the agreement beyond chance, from two
        lists of grades. The rules fit in four sentences:
      </p>
      <ul>
        <li>Count how often each pair of grades occurs: human pass with judge pass, human pass with judge fail, and so on. The pairs where both graders said the same label are the diagonal.</li>
        <li>Observed agreement is the share of answers on the diagonal.</li>
        <li>Chance agreement is what two graders with the same totals would reach by luck: for each label, the share the human gives it times the share the judge gives it, summed over the labels.</li>
        <li>Kappa is observed minus chance, divided by one minus chance: the share of the available room above chance that the graders actually used. A missing grade raises a <code>ValueError</code>, and so does a batch where every grade is the same label, because then chance agreement is certain and kappa is undefined.</li>
      </ul>
      <p>
        <strong>Input.</strong> Ten graded answers, inline as a list of dictionaries with an id, the human&apos;s grade,
        and the judge&apos;s grade. The two graders disagree on a07 and a08:
      </p>
      <table>
        <thead><tr><th>id</th><th>a01</th><th>a02</th><th>a03</th><th>a04</th><th>a05</th><th>a06</th><th>a07</th><th>a08</th><th>a09</th><th>a10</th></tr></thead>
        <tbody>
          <tr><td>human</td><td>pass</td><td>pass</td><td>pass</td><td>pass</td><td>pass</td><td>pass</td><td>pass</td><td>fail</td><td>fail</td><td>fail</td></tr>
          <tr><td>judge</td><td>pass</td><td>pass</td><td>pass</td><td>pass</td><td>pass</td><td>pass</td><td>fail</td><td>pass</td><td>fail</td><td>fail</td></tr>
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
        Change one behavior. A new batch was graded with three labels, pass, partial, and fail, and the team decided
        that a partial answer counts as a fail for this comparison. The file below is the worked solution with twelve
        three-label records, a <code>COLLAPSE</code> mapping from <code>partial</code> to <code>fail</code>, and a{' '}
        <code>collapse</code> function that is not written yet: it hands the records back unchanged. As shipped the
        file prints <code>NOT OK</code> and stops.
      </p>
      <p>
        <strong>Hint.</strong> Build a new list. For each record, create a new dictionary with the same id and, for
        each grader, the mapped grade: <code>mapping.get(grade, grade)</code> returns the replacement when the grade is
        a key of the mapping and the grade itself otherwise. Append the new dictionary and return the list. Do not
        write into the input records; the check at the bottom notices.
      </p>
      <p>
        <strong>Expected result.</strong> With three labels the observed agreement is 0.67 and kappa 0.45. With
        partial counted as fail the agreement rises to 0.75 and kappa to 0.50. The file prints the twelve rows, the two
        summary lines, and <code>OK</code>.
      </p>
      <details>
        <summary>Show the answer</summary>
        <CodeBlock filename="Practice answer" code={answerSnippet} />
        <p>
          A loop builds a fresh dictionary per record, so the original list is untouched and can still be printed with
          its three labels. Notice what the numbers say: collapsing raised the raw agreement by 0.08 but kappa by only
          0.05, because merging labels also raised the chance agreement, from 0.40 to 0.50. Fewer labels always make
          agreement look better; kappa discounts most of that. Everything outside the marked region is the practice
          file unchanged.
        </p>
      </details>
    </>
  ),

  files: [
    { path: 'python/src/judge_kappa/solution.py', role: 'reference', language: 'python', source: solutionSource, primary: true,
      description: 'The complete worked example: the ten graded answers, kappa, band, and a demonstration that prints the rows, the pair counts, the totals, the three statistics, the lazy judge, the two rejected inputs, and OK. Runs alone with Python 3.11 or newer.' },
    { path: 'python/src/judge_kappa/starter.py', role: 'starter', language: 'python', source: starterSource, primary: true,
      description: 'The practice file: the worked solution with twelve three-label records, the COLLAPSE mapping, and a collapse function that returns the records unchanged. Prints NOT OK until collapse maps the grades into new records.' },
    { path: 'python/src/judge_kappa/practice_answer.py', role: 'reference', language: 'python', source: answerSource,
      description: 'The completed practice variation; the page shows the region between its answer markers.' },
    { path: 'python/fixtures/expected-output.txt', role: 'fixture', language: 'text', source: expectedOutput,
      description: 'What solution.py prints, byte for byte. The test runs the file alone and compares.' },
    { path: 'python/fixtures/expected-practice-output.txt', role: 'fixture', language: 'text', source: expectedPracticeOutput,
      description: 'What practice_answer.py prints, byte for byte.' },
    { path: 'python/tests/test_lesson.py', role: 'test', language: 'python', source: lessonTests,
      description: 'Runs the three lesson files alone, checks the pair counts, totals, and the exact fractions behind the three statistics, the three-label case, the band thresholds, the rejected inputs, the practice collapse, and the chance formula against every arrangement of the judge grades; pins the animation fixtures to the solution.' },
    { path: 'python/fixtures/grades.json', role: 'fixture', language: 'json', source: gradesFixture,
      description: 'The ten graded answers, the twelve practice records, and the collapse mapping exactly as the lesson files define them; the animation runs on this copy and a test pins it to the files.' },
  ],

  evidence: (
    <>
      <p>
        <strong>What the file checks</strong> before it prints <code>OK</code>: the four pair counts (six, one, one,
        two), an observed agreement of 0.80 and a chance agreement of 0.58 within a billionth, kappa equal to 0.5238
        at four decimals, and a kappa of exactly zero for the judge that passes everything. Run your copy and compare
        its output with the expected output above; they must match line for line.
      </p>
      <p>
        <strong>The failure cases.</strong> The demonstration feeds <code>kappa</code> a record whose judge grade is an
        empty string and a batch where both graders passed everything; each raises a <code>ValueError</code> that the
        demonstration prints as a rejected line, naming the answer in the first case and explaining in the second that
        chance agreement is certain, so the formula would divide by zero. The tests in the project download also check
        the empty list, a missing human grade, the band at each threshold, that three labels are handled with the
        labels sorted, and that the input list is unchanged afterwards.
      </p>
      <p>
        <strong>What shipped, on the same grades.</strong> The percentage that shipped is 0.80; kappa is 0.52, moderate,
        a gap of more than a quarter. A judge that passes everything agrees with the human on seven of ten, 0.70, for
        doing nothing, and its kappa is 0.00. The chance formula itself is checked against an independent oracle: over
        all 120 ways to place the judge&apos;s three fails among the ten answers, the average observed agreement is
        exactly 0.58, the chance agreement, so the average kappa over those arrangements is zero. All three
        measurements are tests in the project download.
      </p>
    </>
  ),

  solution: (
    <>
      <p>
        Read the file top to bottom: the ten records, one function that computes the statistics, a small function that
        names the band, and a demonstration. Here is its Python, construct by construct.
      </p>
      <ol>
        <li>
          <strong>Counting pairs in a dictionary keyed by tuples.</strong> <code>pair = (record[&quot;human&quot;], record[&quot;judge&quot;])</code>{' '}
          makes a two-value tuple, and <code>counts[pair] = counts.get(pair, 0) + 1</code> adds one to its count.{' '}
          <code>get</code> with a default of 0 is what lets the first occurrence work: there is no entry yet, so 0 plus
          one becomes the first count. Tuples can be dictionary keys because they cannot change; lists cannot.
        </li>
        <li>
          <strong>A set of labels, then sorted.</strong> <code>labels.add(...)</code> on a set ignores repeats, so after
          the loop the set holds each grade once. <code>sorted(labels)</code> turns it into a list in a fixed order,
          and every later loop runs in that order, which is why the output never changes between runs.
        </li>
        <li>
          <strong>Totals from the pairs.</strong> <code>for (human, judge), count in counts.items():</code> unpacks a
          nested tuple in the loop header: the key splits into two names and the value becomes <code>count</code>.
          Each pair adds its count to the human&apos;s total for the first grade and the judge&apos;s total for the
          second. Two more <code>get</code> calls with a default of 0 handle the first time a label appears.
        </li>
        <li>
          <strong>The diagonal.</strong> <code>counts.get((label, label), 0)</code> reads the pair where both graders
          said the same label, 0 when nobody did. Summed over the labels and divided by <code>n</code>, that is the
          observed agreement.
        </li>
        <li>
          <strong>Chance agreement.</strong> For each label, the human&apos;s share times the judge&apos;s share, added
          to a running total that starts at <code>0.0</code>. Starting with a decimal keeps the sum a decimal.
        </li>
        <li>
          <strong>The guard and the formula.</strong> <code>if chance == 1.0: raise ValueError(...)</code> stops the
          one input that would divide by zero, with a message that names the single label. Then{' '}
          <code>(observed - chance) / (1 - chance)</code> is kappa, returned inside a dictionary with everything the
          demonstration prints, so the function has one return value with named parts.
        </li>
        <li>
          <strong>The band.</strong> <code>band</code> is an <code>if</code>, <code>elif</code>, <code>else</code> chain.
          Each test is checked in order and the first true one returns; because the earlier tests already failed, the
          test <code>value &lt; 0.4</code> really means between 0.2 and 0.4. The thresholds are the customary reading
          of kappa, not a law.
        </li>
        <li>
          <strong>The demonstration.</strong> <code>&quot;yes&quot; if a == b else &quot;no&quot;</code> is a conditional
          expression, a value chosen inline. The pair counts and the chance terms are built as lists of short strings
          and printed with <code>join</code>. The lazy judge is built with a loop that copies each record with the judge
          grade set to <code>&quot;pass&quot;</code>. <code>try</code> and <code>except ValueError</code> show the
          rejections without crashing, and the asserts compare decimals with <code>abs(...) &lt; 1e-9</code> and{' '}
          <code>round(..., 4)</code>, never with <code>==</code>, because 0.7 times 0.7 is not exactly 0.49 in a float.
        </li>
      </ol>
      <p><strong>Trace the counts.</strong> Follow each answer into its cell and the running count of agreements:</p>
      <table>
        <thead><tr><th>answer</th><th>human</th><th>judge</th><th>cell</th><th>agreed so far</th></tr></thead>
        <tbody>
          <tr><td>a01 to a06</td><td>pass</td><td>pass</td><td>pass/pass, the diagonal</td><td>6 of 6</td></tr>
          <tr><td>a07</td><td>pass</td><td>fail</td><td>pass/fail</td><td>6 of 7</td></tr>
          <tr><td>a08</td><td>fail</td><td>pass</td><td>fail/pass</td><td>6 of 8</td></tr>
          <tr><td>a09</td><td>fail</td><td>fail</td><td>fail/fail, the diagonal</td><td>7 of 9</td></tr>
          <tr><td>a10</td><td>fail</td><td>fail</td><td>fail/fail, the diagonal</td><td>8 of 10</td></tr>
        </tbody>
      </table>
      <p>
        The totals fall out of the cells: the human passed 6 + 1 = 7 and failed 1 + 2 = 3; the judge passed 6 + 1 = 7
        and failed 1 + 2 = 3. Observed agreement is 8 of 10, 0.80. Chance agreement is fail 0.30 × 0.30 = 0.09 plus
        pass 0.70 × 0.70 = 0.49, so 0.58: with these totals, two graders flipping weighted coins would agree 58 percent
        of the time. Kappa is (0.80 − 0.58) / (1 − 0.58) = 0.22 / 0.42 = 0.52. The judge used about half of the room
        above chance.
      </p>
      <p>
        <strong>Why these decisions.</strong> The pairs live in a dictionary keyed by tuples rather than in a fixed
        two-by-two table so the same function handles three labels in the practice without a change. The labels are
        sorted so the printed order and the chance terms are stable. The <code>chance == 1.0</code> guard is there
        because a batch where both graders agree on one label everywhere is not perfect agreement but no information,
        and the division would otherwise crash with a bare <code>ZeroDivisionError</code>. Kappa is reported with its
        band because the number alone is easy to over-read: 0.52 is moderate, which is a long way from the near-perfect
        judge the percentage suggested.
      </p>
      <p>
        <strong>The pattern, and its limits.</strong> A dictionary keyed by tuples that counts co-occurrences, totals
        summed from it, and a statistic that compares what happened with what chance predicts: the same shape serves
        confusion matrices, inter-annotator agreement, and any two-way count. Its limits: Cohen&apos;s kappa compares
        exactly two graders on nominal labels, it is sensitive to how lopsided the totals are (the same disagreements
        give a lower kappa when one label dominates), and the bands are a convention. With more than two graders use
        Fleiss&apos; kappa or Krippendorff&apos;s alpha; with ordered labels such as a one-to-five score, a weighted kappa
        that forgives near misses.
      </p>
    </>
  ),

  visual: (
    <figure className="fig">
      <KappaViz />
      <figcaption className="fig-cap">
        <span className="fig-caption-text">
          The function from the file, run on its own ten graded answers at a reading pace: under two seconds per
          answer and about forty seconds in all. The list on the left holds the answers with both grades; each beat
          sends one answer into its cell of the two-by-two table in the middle, green on the diagonal where the graders
          agree and red off it. Then the totals appear beside the rows and under the columns, the panel on the right
          builds the observed agreement, the chance agreement from the totals, and kappa, and a marker lands on the
          kappa gauge with its bands. The judge that passes everything drops the marker to zero, and the practice
          variation plays its three-label and collapsed values. Step through with the buttons. The figure rests for
          two minutes before it plays again, and the motion setting in the site header can slow or stop it. Every
          count and statistic comes from the same function run in the browser and is compared with the Python run.
        </span>
      </figcaption>
    </figure>
  ),

  tradeoffs: [
    {
      name: 'Raw percent agreement (what shipped)',
      preferWhen: 'The labels are balanced and the audience knows the base rate: it is the easiest number to compute and explain, one count divided by another.',
      cost: 'It rewards the base rate. On the ten answers a judge that passes everything scores 0.70, and the real judge\'s 0.80 is only 0.10 above doing nothing. Comparisons across batches with different pass rates are meaningless, and the number drifts whenever the mix of answers changes.',
    },
    {
      name: 'Cohen\'s kappa (this lesson)',
      preferWhen: 'Two graders, nominal labels, and a decision about whether a judge can replace or sample a human: kappa subtracts the agreement the totals alone would produce and reads the remainder on a known scale.',
      cost: 'It is symmetric, so it cannot say which grader is wrong, and it dips when one label dominates even if the disagreements stay the same. It needs enough answers to be stable: ten answers give a point estimate with a wide range, so a real decision wants a few hundred and a confidence interval from a bootstrap.',
    },
    {
      name: 'Treat the human as ground truth and report the judge\'s precision and recall on fail',
      preferWhen: 'The human grades are the reference and the costly mistakes are one-sided: a judge that passes answers the human failed is the risk, so recall on the fail label is the number the on-call engineer needs.',
      cost: 'It assumes the human is right, which review of the disagreements often disproves, and it is two numbers per label instead of one; on the ten answers the judge finds two of the three human fails (recall 0.67) at a precision of 0.67, which is more actionable than kappa but needs a chosen class and threshold.',
    },
  ],
};
