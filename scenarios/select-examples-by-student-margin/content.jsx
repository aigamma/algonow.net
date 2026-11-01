import CodeBlock from '../../src/components/CodeBlock.jsx';
import MarginViz from './visuals/MarginViz.jsx';
import solutionSource from './python/src/margin_selection/solution.py?raw';
import starterSource from './python/src/margin_selection/starter.py?raw';
import answerSource from './python/src/margin_selection/practice_answer.py?raw';
import lessonTests from './python/tests/test_lesson.py?raw';
import expectedOutput from './python/fixtures/expected-output.txt?raw';
import expectedPracticeOutput from './python/fixtures/expected-practice-output.txt?raw';
import candidatesFixture from './python/fixtures/candidates.json?raw';

// Authored by Claude Fable 5 in the main thread. Every number on this page was
// produced by running the files below; the expected outputs are the files'
// actual output, compared byte for byte by the tests.
const answerSnippet = answerSource.split('# --- answer begins ---\n')[1].split('# --- answer ends ---')[0].trim();

export const content = {
  brief: (
    <>
      <p>
        Orbit distills a small router, the student, from its large assistant, the teacher. Every teacher label costs a
        call, and this round&apos;s budget covers three of the eight unlabeled prompts. The script that shipped sent the
        first three in arrival order, and one of them was a prompt the student already routes with 92 percent
        confidence: a call spent confirming what the student knew.
      </p>
      <p>
        <strong>The action to practice:</strong> rank the prompts by the student&apos;s margin and spend the budget on
        the smallest. The rules fit in four sentences:
      </p>
      <ul>
        <li>For each prompt, sort a copy of the student&apos;s probabilities largest first. The first two are the top route and the runner-up, and the margin is their difference: near 0 when the student is torn, near 1 when it is sure.</li>
        <li>A probability list must have one entry per route and sum to 1; otherwise it raises a <code>ValueError</code>.</li>
        <li>Sort the scored prompts by margin, then by id, so ties break the same way every run, and take the first <code>budget</code> of them.</li>
        <li>A budget below 0 or above the number of prompts raises a <code>ValueError</code>.</li>
      </ul>
      <p>
        <strong>Input.</strong> Eight prompts, inline as a list of dictionaries with an id and the student&apos;s
        probabilities over three routes, and a budget of 3:
      </p>
      <table>
        <thead><tr><th>id</th><th>billing</th><th>access</th><th>outage</th></tr></thead>
        <tbody>
          <tr><td>u1</td><td>0.92</td><td>0.05</td><td>0.03</td></tr>
          <tr><td>u2</td><td>0.07</td><td>0.48</td><td>0.45</td></tr>
          <tr><td>u3</td><td>0.15</td><td>0.60</td><td>0.25</td></tr>
          <tr><td>u4</td><td>0.34</td><td>0.33</td><td>0.33</td></tr>
          <tr><td>u5</td><td>0.05</td><td>0.15</td><td>0.80</td></tr>
          <tr><td>u6</td><td>0.39</td><td>0.21</td><td>0.40</td></tr>
          <tr><td>u7</td><td>0.40</td><td>0.05</td><td>0.55</td></tr>
          <tr><td>u8</td><td>0.20</td><td>0.70</td><td>0.10</td></tr>
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
        Change one behavior. The margin looks only at the top two probabilities. u3, at 0.15, 0.60, 0.25, scores a
        comfortable margin of 0.35 even though the student puts forty percent of its belief on the other two routes.
        The file below is the worked solution with the score renamed <code>uncertainty</code>, a key function that
        already sorts the largest uncertainty first, and an <code>uncertainty</code> function that still returns one
        minus the margin. As shipped the file prints <code>NOT OK</code> and stops.
      </p>
      <p>
        <strong>Hint.</strong> Replace the returned value with the entropy of the whole distribution: start a running
        total at 0.0, loop over the probabilities, and for each <code>p</code> above zero subtract{' '}
        <code>p * math.log(p)</code> from the total. Skip a zero probability: it contributes nothing and{' '}
        <code>math.log(0)</code> raises. Return the top route and the total.
      </p>
      <p>
        <strong>Expected result.</strong> u4 scores the highest entropy, 1.099, then u6 at 1.061, then u3 at 0.938
        above u2 at 0.898, so the picks become u4, u6, u3. The file prints the entropy table, the picks, the entropy of
        an even split, the rejected input, and <code>OK</code>.
      </p>
      <details>
        <summary>Show the answer</summary>
        <CodeBlock filename="Practice answer" code={answerSnippet} />
        <p>
          Entropy sums a term for every route, so u3&apos;s 0.25 on outage counts, where the margin saw only 0.60
          against 0.25. Margin and entropy agree on the two most torn prompts and differ on the third, which is the
          usual picture: the two measures rank similarly at the extremes and disagree in the middle. The guard against
          a zero probability matters in practice, because a confident student emits many of them. Everything outside
          the marked region is the practice file unchanged.
        </p>
      </details>
    </>
  ),

  files: [
    { path: 'python/src/margin_selection/solution.py', role: 'reference', language: 'python', source: solutionSource, primary: true,
      description: 'The complete worked example: the eight prompts, the routes, the budget, score, by_margin, select, and a demonstration that prints the table, the picks, the waiting prompts, what the first three cost, the two rejected inputs, and OK. Runs alone with Python 3.11 or newer.' },
    { path: 'python/src/margin_selection/starter.py', role: 'starter', language: 'python', source: starterSource, primary: true,
      description: 'The practice file: the worked solution with an uncertainty function that still returns one minus the margin and a key that sorts the most uncertain first. Prints NOT OK until uncertainty returns the entropy.' },
    { path: 'python/src/margin_selection/practice_answer.py', role: 'reference', language: 'python', source: answerSource,
      description: 'The completed practice variation; the page shows the region between its answer markers.' },
    { path: 'python/fixtures/expected-output.txt', role: 'fixture', language: 'text', source: expectedOutput,
      description: 'What solution.py prints, byte for byte. The test runs the file alone and compares.' },
    { path: 'python/fixtures/expected-practice-output.txt', role: 'fixture', language: 'text', source: expectedPracticeOutput,
      description: 'What practice_answer.py prints, byte for byte.' },
    { path: 'python/tests/test_lesson.py', role: 'test', language: 'python', source: lessonTests,
      description: 'Runs the three lesson files alone, checks every margin against a search without sorting, the ranking and its tie-break, the rejected inputs, the edges of the margin, the practice entropies against an independent computation, and what the first three prompts cost; pins the animation fixtures to the solution.' },
    { path: 'python/fixtures/candidates.json', role: 'fixture', language: 'json', source: candidatesFixture,
      description: 'The eight prompts with their probabilities, the routes, and the budget exactly as the lesson files define them; the animation runs on this copy and a test pins it to the files.' },
  ],

  evidence: (
    <>
      <p>
        <strong>What the file checks</strong> before it prints <code>OK</code>: the picks are u4, u6, u2, with the two
        ties at 0.01 first in id order and 0.03 third; u1&apos;s margin rounds to 0.87 and u4&apos;s to 0.01; and the
        input probabilities are untouched after the sort. Run your copy and compare its output with the expected output
        above; they must match line for line.
      </p>
      <p>
        <strong>The failure cases.</strong> The demonstration scores a list that sums to 1.30 and a list with two
        probabilities for three routes; each raises a <code>ValueError</code> that the demonstration prints as a
        rejected line. The tests in the project download also reject a budget of 9 and of minus 1, check the margin at
        its edges (1.0 for a certain answer, 0.0 for an exact tie and for an even split), and show that reversing the
        arrival order leaves the picks unchanged, because the tie-break is the id and not the position.
      </p>
      <p>
        <strong>What shipped, on the same prompts.</strong> The first three in arrival order, u1, u2, u3, average a
        margin of 0.42 and include u1 at 0.87; the margin picks average 0.02. Every picked prompt has a margin no
        larger than every waiting prompt&apos;s, which is what a sort guarantees. Margin and the practice&apos;s entropy
        agree on the two most torn prompts and disagree on the third. All three measurements are tests in the project
        download.
      </p>
    </>
  ),

  solution: (
    <>
      <p>
        Read the file top to bottom: the routes, the eight prompts, the budget, a scoring function, a key function, a
        selection function, and a demonstration. Here is its Python, construct by construct.
      </p>
      <ol>
        <li>
          <strong>Guards with a tolerance.</strong> <code>len(probs) != len(routes)</code> catches a row with the wrong
          number of entries, and <code>abs(sum(probs) - 1.0) &gt; 1e-6</code> catches one that is not a distribution.
          The tolerance is there because 0.34 + 0.33 + 0.33 is not exactly 1.0 in floating point; comparing with{' '}
          <code>==</code> would reject valid rows.
        </li>
        <li>
          <strong>Sorting pairs.</strong> <code>zip(probs, routes)</code> pairs each probability with its route name,
          and <code>sorted(..., reverse=True)</code> orders the pairs largest first. Tuples compare element by element,
          so the probability decides and the route name breaks exact ties. <code>sorted</code> returns a new list; the
          original probabilities are not reordered.
        </li>
        <li>
          <strong>Unpacking and returning three values.</strong> <code>top_prob, top = ranked[0]</code> splits the first
          pair into two names, and the function returns <code>top, second, top_prob - second_prob</code>: three values
          packed into a tuple, which the caller unpacks in one line, <code>top, second, gap = score(...)</code>.
        </li>
        <li>
          <strong>A key function with a tuple.</strong> <code>by_margin</code> returns <code>(record[&quot;margin&quot;], record[&quot;id&quot;])</code>.
          Passed as <code>key=by_margin</code>, it tells <code>sorted</code> what to compare: the margin first, and the
          id when two margins are equal. Without the id, the order of equal margins would depend on the arrival order.
        </li>
        <li>
          <strong>The slice.</strong> <code>ranked[:budget]</code> is the first <code>budget</code> rows of the sorted
          list, and a loop collects their ids. A budget of 0 gives an empty slice and no picks.
        </li>
        <li>
          <strong>The demonstration.</strong> A loop over <code>zip(CANDIDATES, scored)</code> prints each prompt beside
          its score, building the probability column from a list of formatted strings joined with spaces.{' '}
          <code>candidate[&quot;id&quot;] not in picked</code> collects the waiting prompts. A dictionary from id to
          margin, built in a loop, lets the demonstration average the margins of any set of ids, and{' '}
          <code>CANDIDATES[:BUDGET]</code> is what shipped: the first three.
        </li>
      </ol>
      <p><strong>Trace the ranking.</strong> Follow each prompt from its probabilities to its place in the sorted list:</p>
      <table>
        <thead><tr><th>rank</th><th>id</th><th>top</th><th>second</th><th>margin</th><th>decision</th></tr></thead>
        <tbody>
          <tr><td>1</td><td>u4</td><td>billing 0.34</td><td>outage 0.33</td><td>0.01</td><td>to the teacher</td></tr>
          <tr><td>2</td><td>u6</td><td>outage 0.40</td><td>billing 0.39</td><td>0.01</td><td>to the teacher</td></tr>
          <tr><td>3</td><td>u2</td><td>access 0.48</td><td>outage 0.45</td><td>0.03</td><td>to the teacher</td></tr>
          <tr><td>4</td><td>u7</td><td>outage 0.55</td><td>billing 0.40</td><td>0.15</td><td>waits</td></tr>
          <tr><td>5</td><td>u3</td><td>access 0.60</td><td>outage 0.25</td><td>0.35</td><td>waits</td></tr>
          <tr><td>6</td><td>u8</td><td>access 0.70</td><td>billing 0.20</td><td>0.50</td><td>waits</td></tr>
          <tr><td>7</td><td>u5</td><td>outage 0.80</td><td>access 0.15</td><td>0.65</td><td>waits</td></tr>
          <tr><td>8</td><td>u1</td><td>billing 0.92</td><td>access 0.05</td><td>0.87</td><td>waits</td></tr>
        </tbody>
      </table>
      <p>
        u4 and u6 both have a margin of 0.01, so the id decides and u4 comes first. u4&apos;s second route is outage
        rather than access although both sit at 0.33: the pairs compared equal on the probability, and the route name
        broke the tie in reverse order. The budget of three stops after u2. The picked margins average 0.02; the first
        three in arrival order, u1, u2, u3, average 0.42.
      </p>
      <p>
        <strong>Why these decisions.</strong> The margin rather than the top probability alone, because a top of 0.48
        over a second of 0.45 is a two-way confusion the teacher can settle, while a top of 0.48 over a second of 0.20
        is not. Sorting a copy keeps the student&apos;s output usable afterwards. The tie-break by id makes the picks a
        function of the data and not of the order it arrived in, which is what makes the test that reverses the list
        pass. The budget guard turns a configuration error into a loud failure instead of a silent empty round.
      </p>
      <p>
        <strong>The pattern, and its limits.</strong> Score every item with one number, sort with a key, slice the
        budget: uncertainty sampling, the oldest active-learning recipe, in three lines. Its limits: the smallest
        margins are also where label noise and outliers live, so a round of pure uncertainty picks can fill the set
        with oddities; the student&apos;s probabilities must be calibrated for the margin to mean anything, which the
        calibration lesson addresses; picks made one at a time ignore that the three most torn prompts may be near
        copies of each other, where a diversity term helps; and the recipe assumes every teacher label costs the same.
      </p>
    </>
  ),

  visual: (
    <figure className="fig">
      <MarginViz />
      <figcaption className="fig-cap">
        <span className="fig-caption-text">
          The functions from the file, run on their own eight prompts at a reading pace: under two seconds per prompt
          and about thirty seconds in all. Each row is a probability line with one dot per route. Each beat draws the
          amber bracket between the two rightmost dots, the margin, and writes its value. Then the rows glide into margin
          order, the three smallest turn green and are tagged for the teacher, the first three in arrival order are
          outlined red with their mean margin, and the practice variation swaps the column to entropy and re-sorts so
          u3 rises above u2. Step through with the buttons. The figure rests for two minutes before it plays again, and
          the motion setting in the site header can slow or stop it. Every margin, rank, and pick comes from the same
          functions run in the browser and is compared with the Python run.
        </span>
      </figcaption>
    </figure>
  ),

  tradeoffs: [
    {
      name: 'The first prompts in arrival order (what shipped)',
      preferWhen: 'The arrival order is itself informative, newest traffic first, and the student has no usable probabilities yet: nothing to compute, and every round covers fresh prompts.',
      cost: 'It spends teacher calls regardless of need: on these eight prompts the first three average a margin of 0.42 and include u1 at 0.87, a label the student could have written itself.',
    },
    {
      name: 'Smallest margin first (this lesson)',
      preferWhen: 'The student emits calibrated probabilities and the budget is tight: each call goes where the student is most torn between two routes, the cases a label changes most.',
      cost: 'It concentrates calls on the hardest and noisiest prompts, needs calibrated probabilities to mean anything, and picks near copies of each other without a diversity term; sorting is cheap, but the picks are only as good as the student\'s probabilities.',
    },
    {
      name: 'A seeded random sample',
      preferWhen: 'The labels must also serve as an unbiased evaluation set, or the student\'s probabilities are known to be poorly calibrated: a random sample keeps the training distribution honest and needs nothing from the student.',
      cost: 'On average it spends calls on easy prompts in proportion to how common they are; the budget teaches less per call, and the hardest cases may never be sampled in a small round.',
    },
  ],
};
