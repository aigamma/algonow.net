import CodeBlock from '../../src/components/CodeBlock.jsx';
import VotesViz from './visuals/VotesViz.jsx';
import solutionSource from './python/src/teacher_votes/solution.py?raw';
import starterSource from './python/src/teacher_votes/starter.py?raw';
import answerSource from './python/src/teacher_votes/practice_answer.py?raw';
import lessonTests from './python/tests/test_lesson.py?raw';
import expectedOutput from './python/fixtures/expected-output.txt?raw';
import expectedPracticeOutput from './python/fixtures/expected-practice-output.txt?raw';
import samplesFixture from './python/fixtures/samples.json?raw';

// Authored by Claude Fable 5 in the main thread. Every number on this page was
// produced by running the files below; the expected outputs are the files'
// actual output, compared byte for byte by the tests.
const answerSnippet = answerSource.split('# --- answer begins ---\n')[1].split('# --- answer ends ---')[0].trim();

export const content = {
  brief: (
    <>
      <p>
        Orbit builds the distillation set for its small router by sampling the large assistant, the teacher, five
        times per prompt at a temperature above zero. The script that shipped took the first sample as the label.
        Some prompts got five different answers, and for those the first sample was a coin toss; on others the first
        sample was the one answer the teacher gave once. Contradictory labels went into the training set, and the
        student learned them.
      </p>
      <p>
        <strong>The action to practice:</strong> keep a teacher label only when the teacher&apos;s samples agree. The
        rules fit in four sentences:
      </p>
      <ul>
        <li>Normalize each sampled answer, surrounding space removed and lowercased, so spellings of the same answer count together.</li>
        <li>Count the normalized answers and read the most common one and its share of the samples: the agreement.</li>
        <li>Drop the prompt when two answers tie for the top count, or when the agreement is below the threshold; otherwise keep it with the most common answer as its label and the agreement recorded.</li>
        <li>A prompt with no samples raises a <code>ValueError</code>, and so does a threshold at or below one half (not a majority) or above one.</li>
      </ul>
      <p>
        <strong>Input.</strong> Five prompts, inline as a list of dictionaries with an id and the teacher&apos;s five
        sampled route labels, and a threshold of 0.60, three of five:
      </p>
      <table>
        <thead><tr><th>id</th><th>samples</th></tr></thead>
        <tbody>
          <tr><td>p1</td><td>billing, billing, billing, billing, billing</td></tr>
          <tr><td>p2</td><td>access, outage, access, access, outage</td></tr>
          <tr><td>p3</td><td>access, billing, outage, billing, access</td></tr>
          <tr><td>p4</td><td>outage, outage, billing, outage, outage</td></tr>
          <tr><td>p5</td><td>outage, billing, Billing, access, &quot;billing &quot; (with a trailing space)</td></tr>
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
        Change one behavior. A kept label from a unanimous teacher is worth more than one from a three-to-two vote, and
        the training loop can weight them differently if it knows. The file below is the worked solution with a{' '}
        <code>tier_of</code> function that returns <code>silver</code> for anything at or above the threshold and{' '}
        <code>dropped</code> below it, and a demonstration that counts the tiers. As shipped the file prints{' '}
        <code>NOT OK</code> and stops.
      </p>
      <p>
        <strong>Hint.</strong> An <code>if</code>, <code>elif</code>, <code>else</code> chain. Test{' '}
        <code>agreement == 1.0</code> first and return <code>gold</code>; then <code>agreement &gt;= threshold</code>{' '}
        and return <code>silver</code>; otherwise return <code>dropped</code>. Order matters: a unanimous teacher is
        also at or above the threshold, so the gold test has to come first.
      </p>
      <p>
        <strong>Expected result.</strong> p1 is gold, p2, p4, and p5 are silver, and p3 stays dropped: gold 1,
        silver 3, dropped 1. The file prints the graded table, the counts, the rejected empty prompt, and <code>OK</code>.
      </p>
      <details>
        <summary>Show the answer</summary>
        <CodeBlock filename="Practice answer" code={answerSnippet} />
        <p>
          The chain is read top to bottom and the first true test wins, which is why the stricter condition sits
          first: with the tests the other way round, a unanimous teacher would be caught by the silver test and never
          reach gold. Comparing a float with <code>== 1.0</code> is safe here because the agreement is a count divided
          by five, and five of five is exactly 1.0. Everything outside the marked region is the practice file unchanged.
        </p>
      </details>
    </>
  ),

  files: [
    { path: 'python/src/teacher_votes/solution.py', role: 'reference', language: 'python', source: solutionSource, primary: true,
      description: 'The complete worked example: the five prompts, normalize, decide, filter_samples, and a demonstration that prints every tally and decision, the kept count, the first-sample labels with their status, the two rejected thresholds, and OK. Runs alone with Python 3.11 or newer.' },
    { path: 'python/src/teacher_votes/starter.py', role: 'starter', language: 'python', source: starterSource, primary: true,
      description: 'The practice file: the worked solution with a tier_of function that returns silver for everything kept, and a demonstration that counts the tiers. Prints NOT OK until tier_of returns gold for a unanimous teacher.' },
    { path: 'python/src/teacher_votes/practice_answer.py', role: 'reference', language: 'python', source: answerSource,
      description: 'The completed practice variation; the page shows the region between its answer markers.' },
    { path: 'python/fixtures/expected-output.txt', role: 'fixture', language: 'text', source: expectedOutput,
      description: 'What solution.py prints, byte for byte. The test runs the file alone and compares.' },
    { path: 'python/fixtures/expected-practice-output.txt', role: 'fixture', language: 'text', source: expectedPracticeOutput,
      description: 'What practice_answer.py prints, byte for byte.' },
    { path: 'python/tests/test_lesson.py', role: 'test', language: 'python', source: lessonTests,
      description: 'Runs the three lesson files alone, checks the normalization, every tally against a plain-dictionary count, the decisions, the threshold edges, the rejected inputs, the practice tiers, and what the first-sample labels got wrong; pins the animation fixtures to the solution.' },
    { path: 'python/fixtures/samples.json', role: 'fixture', language: 'json', source: samplesFixture,
      description: 'The five prompts with their sampled answers and the threshold exactly as the lesson files define them; the animation runs on this copy and a test pins it to the files.' },
  ],

  evidence: (
    <>
      <p>
        <strong>What the file checks</strong> before it prints <code>OK</code>: the decisions kept, kept, dropped, kept,
        kept; p5&apos;s label billing with a count of three, which only normalization makes possible; and p3&apos;s
        reason, a tie at 2. Run your copy and compare its output with the expected output above; they must match line
        for line.
      </p>
      <p>
        <strong>The failure cases.</strong> The demonstration asks for thresholds of 0.5 and 1.5; each raises a{' '}
        <code>ValueError</code> that the demonstration prints as a rejected line, because a threshold of one half would
        accept a plurality that is not a majority and anything above one can never be met. The practice file rejects a
        prompt with no samples. The tests in the project download also check the edges: two of five is dropped with its
        agreement named, three of five is kept exactly at 0.60 and dropped at 0.80, a single sample counts as
        unanimous, an empty list gives no decisions, and the samples are never modified.
      </p>
      <p>
        <strong>What shipped, on the same samples.</strong> The first sample as the label agrees with the majority for
        p1, p2, and p4. For p3 it produces a label the teacher never settled on, and for p5 it produces outage, a
        minority answer against three votes for billing: two of five labels wrong or unsettled. Without normalization
        p5&apos;s three spellings of billing would count once each and the prompt would be dropped. All three
        measurements are tests in the project download.
      </p>
    </>
  ),

  solution: (
    <>
      <p>
        Read the file top to bottom: the five prompts and the threshold, a one-line normalizer, one function that
        decides a prompt, one that walks the list, and a demonstration. Here is its Python, construct by construct.
      </p>
      <ol>
        <li>
          <strong>Normalize first.</strong> <code>answer.strip().lower()</code> chains two string methods: strip removes
          surrounding whitespace, lower folds the case. Both return new strings; the samples themselves are never
          changed, which the tests confirm.
        </li>
        <li>
          <strong>A Counter that counts itself.</strong> <code>counts = Counter()</code> is a dictionary built for
          tallies: a key that has never been seen reads as 0, so <code>counts[normalize(vote)] += 1</code> works on the
          first vote without an <code>if</code>. The import at the top, <code>from collections import Counter</code>,
          brings in the class.
        </li>
        <li>
          <strong>most_common.</strong> <code>counts.most_common()</code> returns a list of <code>(answer, count)</code>{' '}
          pairs, largest count first; answers with equal counts keep the order they were first seen in.{' '}
          <code>top, top_count = ranked[0]</code> unpacks the winner, and <code>ranked[1][1]</code> is the runner-up&apos;s
          count, which is how the tie is detected.
        </li>
        <li>
          <strong>Two decisions in order.</strong> The tie test comes first, guarded by <code>len(ranked) &gt; 1</code>{' '}
          so a unanimous prompt with one entry never indexes past the end. Then <code>agreement &lt; threshold</code>{' '}
          drops a weak majority. Each branch returns a dictionary with the same keys, <code>id</code>,{' '}
          <code>counts</code>, <code>action</code>, plus either a <code>reason</code> or a <code>label</code> and an{' '}
          <code>agreement</code>; <code>dict(ranked)</code> turns the pairs back into a plain dictionary in that order.
        </li>
        <li>
          <strong>The threshold guard.</strong> <code>filter_samples</code> rejects a threshold at or below 0.5 or above
          1.0 once, before any prompt is counted. The loop then appends one decision per prompt and keeps the input
          order.
        </li>
        <li>
          <strong>The demonstration.</strong> <code>decision[&quot;counts&quot;].items()</code> yields the pairs for
          the printed tally, <code>{'{...:<34}'}</code> pads the tally column so the verdicts line up, and the shipped
          comparison normalizes the first sample and compares it with the kept label, counting the rows where the label
          would have been wrong or unsettled. <code>try</code> and <code>except ValueError</code> show the two rejected
          thresholds without crashing, and each <code>assert</code> checks one claim before <code>OK</code>.
        </li>
      </ol>
      <p><strong>Trace the tallies.</strong> Follow each prompt from its samples to its decision:</p>
      <table>
        <thead><tr><th>prompt</th><th>normalized tally</th><th>top share</th><th>decision</th></tr></thead>
        <tbody>
          <tr><td>p1</td><td>billing 5</td><td>5 of 5 = 1.00</td><td>kept as billing</td></tr>
          <tr><td>p2</td><td>access 3, outage 2</td><td>3 of 5 = 0.60</td><td>kept as access, exactly at the threshold</td></tr>
          <tr><td>p3</td><td>access 2, billing 2, outage 1</td><td>2 of 5, tied</td><td>dropped: tie at 2</td></tr>
          <tr><td>p4</td><td>outage 4, billing 1</td><td>4 of 5 = 0.80</td><td>kept as outage</td></tr>
          <tr><td>p5</td><td>billing 3, outage 1, access 1</td><td>3 of 5 = 0.60</td><td>kept as billing</td></tr>
        </tbody>
      </table>
      <p>
        p5 is the one normalization decides: its samples read outage, billing, Billing, access, and billing with a
        trailing space. Stripped and lowercased, three of them are billing. Without that step every spelling would
        count once, the top count would be a five-way tie at 1, and the prompt would be dropped. p3 is the honest
        failure: access and billing tie at two, and no threshold can settle a tie, so the prompt waits for a human or
        for more samples.
      </p>
      <p>
        <strong>Why these decisions.</strong> The most common answer rather than the first because sampling at a
        temperature is a vote, and the first ballot is not the count. The tie test before the threshold test because a
        tie at 3 of 6 would pass a 0.5 threshold while meaning nothing. A threshold strictly above one half because
        &quot;majority&quot; is the claim the label makes, and 0.6 with five samples means three must agree. The
        agreement is recorded with the label because the training loop, or the practice&apos;s tiers, can use it.
      </p>
      <p>
        <strong>The pattern, and its limits.</strong> Count normalized answers, read the most common, compare its share
        with a threshold: self-consistency filtering, the same shape that votes over chain-of-thought samples or over
        several judges. Its limits: it works on short answers that normalize to identical strings and not on free
        text, where paraphrases need a semantic match; five samples give coarse shares, so the threshold can only
        be 0.6, 0.8, or 1.0; and agreement is not correctness: a teacher that is confidently wrong is unanimous.
      </p>
    </>
  ),

  visual: (
    <figure className="fig">
      <VotesViz />
      <figcaption className="fig-cap">
        <span className="fig-caption-text">
          The functions from the file, run on their own five prompts at a reading pace: under three seconds per prompt
          and under half a minute in all. Each row holds the five sample chips, a tally, and a decision. Each beat snaps
          the chips to their normalized spelling, outlining in amber the ones that changed, feeds them one by one into
          the tally as the bars grow, and shows the decision: green kept with the label and agreement, red dropped with
          the reason. A summary counts the kept prompts, a beat outlines in red the first chips that shipped as wrong or
          unsettled labels, and the practice variation turns the tags into gold and silver tiers. Step through with the
          buttons. The figure rests for two minutes before it plays again, and the motion setting in the site header
          can slow or stop it. Every count and decision comes from the same functions run in the browser and is
          compared with the Python run.
        </span>
      </figcaption>
    </figure>
  ),

  tradeoffs: [
    {
      name: 'The first sample as the label (what shipped)',
      preferWhen: 'The teacher is sampled once at temperature zero, so there is only one answer and no vote to count: the cheapest possible labeling, one call per prompt.',
      cost: 'With several samples it throws four of five away and keeps a coin toss: on these prompts it labels p3, which the teacher never settled, and labels p5 with a minority answer. Two of five labels wrong or unsettled, and no record of how sure the teacher was.',
    },
    {
      name: 'Majority vote with a threshold (this lesson)',
      preferWhen: 'The answers are short and normalize to identical strings, route labels, classes, numbers, and a few extra samples per prompt are affordable: a Counter and two comparisons give a label and an agreement, and drop what the teacher cannot settle.',
      cost: 'Five calls per prompt instead of one, a dropped share of the data (one prompt in five here), coarse agreement steps with few samples, and no help for free-text answers; agreement is also not correctness, since a confidently wrong teacher is unanimous.',
    },
    {
      name: 'A second model as a judge',
      preferWhen: 'The answers are free text where paraphrases cannot be counted, or the teacher is known to be unreliable on a slice: a judge scores each sampled answer against a rubric and the best-scoring one becomes the label.',
      cost: 'Another model call per sample and a rubric to write and maintain, the judge\'s own errors and biases folded into the labels, and a result that is harder to audit than a count; the kappa lesson shows how far a judge can drift from a human.',
    },
  ],
};
