import CodeBlock from '../../src/components/CodeBlock.jsx';
import PercentileViz from './visuals/PercentileViz.jsx';
import solutionSource from './python/src/latency_percentiles/solution.py?raw';
import starterSource from './python/src/latency_percentiles/starter.py?raw';
import answerSource from './python/src/latency_percentiles/practice_answer.py?raw';
import lessonTests from './python/tests/test_lesson.py?raw';
import expectedOutput from './python/fixtures/expected-output.txt?raw';
import expectedPracticeOutput from './python/fixtures/expected-practice-output.txt?raw';
import latenciesFixture from './python/fixtures/latencies.json?raw';

// Authored by Claude Fable 5 in the main thread. Every number on this page was
// produced by running the files below; the expected outputs are the files'
// actual output, compared byte for byte by the tests.
const answerSnippet = answerSource.split('# --- answer begins ---\n')[1].split('# --- answer ends ---')[0].trim();

export const content = {
  brief: (
    <>
      <p>
        Orbit&apos;s gateway team shipped a new deployment of the model gateway and reported that the mean time to
        first token had dropped from 332 ms to 292 ms. The on-call engineer kept receiving complaints about slow
        answers. Both were right: the mean had improved, and the slow requests had become much slower. A mean is one
        number for the whole distribution, and a handful of very slow requests barely moves it.
      </p>
      <p>
        <strong>The action to practice:</strong> report latency as percentiles with the nearest-rank method, and
        compare deployments on the tail, not the mean. The rule fits in three sentences:
      </p>
      <ul>
        <li>Sort a copy of the samples, smallest first.</li>
        <li>The rank of the <code>p</code>th percentile is <code>ceil(p * n / 100)</code>: how many samples sit at or below the answer. For 20 samples, p50 is rank 10, p95 is rank 19, and p99 is rank 20.</li>
        <li>The answer is the sample at that rank, which lives at index <code>rank - 1</code> of the sorted list.</li>
      </ul>
      <p>
        <strong>Input.</strong> Twenty time-to-first-token samples per deployment, in milliseconds, in the order they
        were logged, inline as a dictionary of two lists:
      </p>
      <table>
        <thead><tr><th>deployment</th><th>samples (ms, logged order)</th></tr></thead>
        <tbody>
          <tr><td>old</td><td>310, 295, 330, 350, 300, 345, 320, 365, 305, 340, 325, 355, 315, 335, 360, 300, 345, 330, 370, 350</td></tr>
          <tr><td>new</td><td>175, 190, 160, 1200, 185, 170, 200, 180, 165, 195, 1400, 175, 185, 160, 190, 170, 205, 180, 165, 190</td></tr>
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
        Change one behavior. The worked solution picks the nearest rank, so every answer is one of the samples. Most
        numeric and plotting libraries report a different default: linear interpolation between the two samples on
        either side of a fractional position, <code>(n - 1) * p / 100</code>. A dashboard built on one and a report
        built on the other disagree about the same data. Make <code>percentile</code> interpolate. The file below is
        the worked solution with a check for the new behavior at the bottom; as shipped it prints <code>NOT OK</code>{' '}
        and stops.
      </p>
      <p>
        <strong>Hint.</strong> Keep the guards and the sorted copy. Compute{' '}
        <code>position = (len(ordered) - 1) * p / 100</code>, then <code>lower = math.floor(position)</code> and{' '}
        <code>fraction = position - lower</code>. When <code>lower + 1</code> reaches the end of the list, return the
        last sample. Otherwise return <code>ordered[lower] + fraction * (ordered[lower + 1] - ordered[lower])</code>:
        the lower sample plus a fraction of the gap to the next one.
      </p>
      <p>
        <strong>Expected result.</strong> old p50 332.50, p95 365.25, p99 369.05; new p50 182.50, p95 1210.00,
        p99 1362.00. The p95 position is 18.05, between the 19th and 20th smallest, so for new the answer is{' '}
        <code>1200 + 0.05 * 200</code>. The file prints the table with two decimals, the four differences (p95: new is
        844.75 ms slower), the two rejected calls, and <code>OK</code>.
      </p>
      <details>
        <summary>Show the answer</summary>
        <CodeBlock filename="Practice answer" code={answerSnippet} />
        <p>
          The whole-number rank became a fractional position, <code>math.floor</code> splits it into an index and a
          fraction, and the return line weighs the gap between two neighbouring samples. The branch for the top end
          is needed because position <code>n - 1</code> has no next sample. Notice that the check at the bottom compares
          with <code>round(value, 2)</code>: 18.05 is not exact in binary, so the fraction carries noise far to the
          right of the decimal point (the raw p95 values are 365.25000000000006 and 1210.0000000000002), and comparing
          rounded values is the honest way to test a number produced by interpolation. Both methods tell the same
          story, and from twenty samples neither p99 means much: nearest rank returns the maximum, interpolation lands
          a few percent below it. Everything outside the marked region is the practice file unchanged.
        </p>
      </details>
    </>
  ),

  files: [
    { path: 'python/src/latency_percentiles/solution.py', role: 'reference', language: 'python', source: solutionSource, primary: true,
      description: 'The complete worked example: the two deployments, percentile, summarize, and a demonstration that prints the table, the four differences, the two rejected calls, and OK. Runs alone with Python 3.11 or newer.' },
    { path: 'python/src/latency_percentiles/starter.py', role: 'starter', language: 'python', source: starterSource, primary: true,
      description: 'The practice file: the worked solution with a check for interpolated percentiles. Prints NOT OK until percentile interpolates linearly between the two nearest ranks.' },
    { path: 'python/src/latency_percentiles/practice_answer.py', role: 'reference', language: 'python', source: answerSource,
      description: 'The completed practice variation; the page shows the region between its answer markers.' },
    { path: 'python/fixtures/expected-output.txt', role: 'fixture', language: 'text', source: expectedOutput,
      description: 'What solution.py prints, byte for byte. The test runs the file alone and compares.' },
    { path: 'python/fixtures/expected-practice-output.txt', role: 'fixture', language: 'text', source: expectedPracticeOutput,
      description: 'What practice_answer.py prints, byte for byte.' },
    { path: 'python/tests/test_lesson.py', role: 'test', language: 'python', source: lessonTests,
      description: 'Runs the three lesson files alone, checks every percentile and mean, the nearest rank against a brute-force definition on both lists and on seeded random lists, the boundaries and rejected inputs, the practice against the statistics module, and measures how the mean and the tail disagree; pins the animation fixtures to the solution.' },
    { path: 'python/fixtures/latencies.json', role: 'fixture', language: 'json', source: latenciesFixture,
      description: 'The two deployments and the three percentiles exactly as the lesson files define them; the animation runs on this copy and a test pins it to the files.' },
  ],

  evidence: (
    <>
      <p>
        <strong>What the file checks</strong> before it prints <code>OK</code>: the new deployment&apos;s p95 is 1200
        and its p99 is 1400, the old p50 is 330, and the new mean is below the old one. Run your copy and compare its
        output with the expected output above; they must match line for line.
      </p>
      <p>
        <strong>The failure cases.</strong> <code>percentile([], 50)</code> raises a <code>ValueError</code>, because
        there is no rank to compute for no samples, and <code>percentile(old, 0)</code> raises one, because the
        definition covers only percentiles above 0 and at most 100; the demonstration prints both as rejected lines.
        The tests in the project download also reject 101 and -5, confirm that p = 100 returns the maximum and
        p = 0.1 the minimum, that a one-sample list returns that sample for every p, and that the input list is
        unchanged because <code>sorted</code> made a copy.
      </p>
      <p>
        <strong>What shipped, on the same samples.</strong> The mean says new is 40.25 ms faster (about 12 percent)
        and p50 agrees (150 ms faster). p95 says new is 835 ms slower and p99 says 1030 ms slower. Two of the twenty
        new samples are above a second; the old deployment has none. The tests pin all four differences, check the
        nearest rank against the brute-force definition (the smallest sample that at least p percent of the samples
        are at or below) on both lists and on two hundred seeded random lists, and check the practice&apos;s
        interpolation against <code>statistics.quantiles</code> with the inclusive method to nine decimal places: the
        two methods differ by 10 ms at new p95 (1210 against 1200) and tell the same story. A p99 from twenty samples
        is the maximum, and it stays the maximum up to ninety-nine samples.
      </p>
    </>
  ),

  solution: (
    <>
      <p>
        Read the file top to bottom: an import, the two lists, one function that does the work, a second that gathers
        four results, and a demonstration. Here is its Python, construct by construct.
      </p>
      <ol>
        <li>
          <strong>The import.</strong> <code>import math</code> brings in <code>math.ceil</code>, the smallest whole
          number at or above its argument: <code>math.ceil(19.8)</code> is 20 and <code>math.ceil(10.0)</code> is 10.
          The practice adds <code>math.floor</code>, its mirror image.
        </li>
        <li>
          <strong>Guard clauses first.</strong> <code>if len(latencies) == 0: raise ValueError(...)</code> and the same
          for a <code>p</code> at or below 0 or above 100. A <code>raise</code> stops the function at once with a
          message; there is no rank to compute for no samples, and no sample is at or below zero percent of the data.
        </li>
        <li>
          <strong>A sorted copy.</strong> <code>ordered = sorted(latencies)</code> returns a new list with the same
          values, smallest first, and leaves the caller&apos;s list exactly as it was. <code>latencies.sort()</code>{' '}
          would instead reorder the caller&apos;s list in place, and the logged order would be gone.
        </li>
        <li>
          <strong>The rank.</strong> <code>rank = math.ceil(p * len(ordered) / 100)</code>. The order of operations
          matters: <code>p * len(ordered)</code> is a product of two whole numbers and exact, so the division lands
          exactly on a whole number whenever it should (<code>35 * 20 / 100</code> is exactly 7.0). Dividing first,{' '}
          <code>p / 100 * n</code>, can leave the product a hair above a whole number, and <code>ceil</code> would then
          report 8 where 7 is right. The rank is how many samples sit at or below the answer.
        </li>
        <li>
          <strong>The lookup.</strong> <code>return ordered[rank - 1]</code>: ranks count from 1 and list indexes from
          0, so the tenth smallest sample sits at index 9.
        </li>
        <li>
          <strong>A function that returns a dictionary.</strong> <code>summarize</code> returns a dictionary literal
          with four keys: <code>&quot;mean&quot;</code>, which is <code>sum(latencies) / len(latencies)</code>, and the
          three <code>percentile</code> calls for 50, 95, and 99. The caller reads <code>summary[&quot;p95&quot;]</code>{' '}
          by name instead of counting positions in a tuple.
        </li>
        <li>
          <strong>The demonstration.</strong> <code>for name, latencies in DEPLOYMENTS.items():</code> yields each name
          with its list, and a <code>summaries</code> dictionary keeps each result by name. The format specs line the
          table up: <code>{'{summary[\'mean\']:>7.2f}'}</code> prints two decimals right aligned in seven columns and{' '}
          <code>{'{summary[\'p50\']:>5}'}</code> right aligns a whole number. A loop over the four key names computes{' '}
          <code>change = new[key] - old[key]</code>, and <code>if change &lt; 0</code> decides the word: faster, with{' '}
          <code>-change</code> flipping the sign for printing, or slower. <code>try</code> and{' '}
          <code>except ValueError</code> print each rejected call instead of crashing, and each <code>assert</code>{' '}
          checks one claim before <code>OK</code>.
        </li>
      </ol>
      <p><strong>Trace the ranks.</strong> Follow <code>p * n / 100</code>, the ceiling, and the lookup for every percentile:</p>
      <table>
        <thead><tr><th>deployment</th><th>percentile</th><th>p * 20 / 100</th><th>ceil = rank</th><th>index</th><th>value (ms)</th></tr></thead>
        <tbody>
          <tr><td>old</td><td>p50</td><td>10.0</td><td>10</td><td>9</td><td>330</td></tr>
          <tr><td>old</td><td>p95</td><td>19.0</td><td>19</td><td>18</td><td>365</td></tr>
          <tr><td>old</td><td>p99</td><td>19.8</td><td>20</td><td>19</td><td>370 (the maximum)</td></tr>
          <tr><td>new</td><td>p50</td><td>10.0</td><td>10</td><td>9</td><td>180</td></tr>
          <tr><td>new</td><td>p95</td><td>19.0</td><td>19</td><td>18</td><td>1200</td></tr>
          <tr><td>new</td><td>p99</td><td>19.8</td><td>20</td><td>19</td><td>1400 (the maximum)</td></tr>
        </tbody>
      </table>
      <p>
        The new deployment&apos;s sorted list runs 160, 160, 165, 165, 170, 170, 175, 175, 180, 180, 185, 185, 190,
        190, 190, 195, 200, 205, 1200, 1400. The tenth is 180, the nineteenth 1200, the twentieth 1400. The samples add
        up to 5840 ms and the two slow requests contribute 2600 of that, which is why the mean moved; the median never
        sees them, because it looks at the tenth sample and they sit at the nineteenth and twentieth.
      </p>
      <p>
        <strong>Why these decisions.</strong> The nearest rank is used because the answer is always a sample somebody
        observed: &quot;95 percent of requests finished at or below 1200 ms&quot; is a statement about a real request.
        The multiplication comes before the division to keep whole ranks whole in floating-point arithmetic. The copy
        is sorted rather than the original because callers keep the logged order for other uses. The guards reject an
        empty list and a percentile outside the range where the definition means anything, instead of returning a
        number that looks plausible.
      </p>
      <p>
        <strong>The pattern, and its limits.</strong> Sort, then index by a computed rank, is the plain Python form of
        an order statistic, and the way to answer how slow the slow requests are. Its limits: the whole sample must be
        kept in memory and sorted for every report, so a service that sees millions of requests keeps a histogram or
        a sketch instead; a p99 needs at least a hundred samples before it is anything but the maximum, and here it is
        exactly the maximum; and tools interpolate differently, so a dashboard and a report can disagree about the
        same data by the kind of gap the practice variation shows.
      </p>
    </>
  ),

  visual: (
    <figure className="fig">
      <PercentileViz />
      <figcaption className="fig-cap">
        <span className="fig-caption-text">
          The function from the file, run on its own two deployments at a reading pace: about half a minute in all.
          Each panel holds twenty bars on a shared scale to 1500 ms. The bars appear in logged order, each panel is
          sorted, and then six picks follow: an amber cursor slides to the computed rank, the bar there lights blue,
          and the caption spells out the arithmetic. Dashed lines draw the means, the outro states the four
          comparisons, and the practice variation marks the fractional position 18.05 with its interpolated value.
          Step through with the buttons. The figure rests for two minutes before it plays again, and the motion
          setting in the site header can slow or stop it. Every rank and value comes from the same function run in
          the browser and is compared with the Python run.
        </span>
      </figcaption>
    </figure>
  ),

  tradeoffs: [
    {
      name: 'Report the mean latency (what shipped)',
      preferWhen: 'Capacity math and cost: the mean times the request count is the total time spent, which is what a fleet pays for and what a queueing model needs.',
      cost: 'It hides the tail. On these samples it ranked the deployment with the slower tail as the better one by 40.25 ms, while p95 was 835 ms worse and p99 1030 ms worse.',
    },
    {
      name: 'Nearest-rank percentiles over the full sample (this lesson)',
      preferWhen: 'Service level objectives and deployment comparisons, where the question is how slow the slow requests are and the answer must be a request that actually happened.',
      cost: 'The whole sample is kept and sorted for every report. A p99 from twenty samples is just the maximum. Tools interpolate differently, so the same data gives different p95 and p99 figures on different dashboards (1210 against 1200 here).',
    },
    {
      name: 'A streaming quantile sketch (fixed-bucket histograms or a t-digest, as monitoring systems do)',
      preferWhen: 'Continuous monitoring over millions of requests, where samples cannot be kept, and results from many hosts must be merged into one number.',
      cost: 'The answer is approximate, the bucket boundaries bias it, and the bucket layout has to be chosen before the data is seen; a tail that lands between coarse buckets is reported as the bucket edge.',
    },
  ],
};
