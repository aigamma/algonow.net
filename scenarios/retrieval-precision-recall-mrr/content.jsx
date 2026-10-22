import CodeBlock from '../../src/components/CodeBlock.jsx';
import RetrievalMetricsViz from './visuals/RetrievalMetricsViz.jsx';
import solutionSource from './python/src/retrieval_metrics/solution.py?raw';
import starterSource from './python/src/retrieval_metrics/starter.py?raw';
import answerSource from './python/src/retrieval_metrics/practice_answer.py?raw';
import lessonTests from './python/tests/test_lesson.py?raw';
import expectedOutput from './python/fixtures/expected-output.txt?raw';
import expectedPracticeOutput from './python/fixtures/expected-practice-output.txt?raw';
import queriesFixture from './python/fixtures/queries.json?raw';

// Authored by Claude Fable 5. Every number on this page was produced by
// running the files below; the expected outputs are the files' actual output,
// compared byte for byte by the tests.
const answerSnippet = answerSource.split('# --- answer begins ---\n')[1].split('# --- answer ends ---')[0].trim();

export const content = {
  brief: (
    <>
      <p>
        Orbit swapped the embedding model behind its runbook retriever because the new results &quot;felt
        better&quot;. Nobody could say by how much, or whether the old model found chunks the new one misses, and a
        feeling is not a number you can defend at a release review. The fix is not a bigger evaluation set; it is
        three small functions run on the questions you already have.
      </p>
      <p>
        <strong>The action to practice:</strong> score two rankings on the same questions with the three standard
        retrieval numbers, each a function of a ranked list, the set of relevant ids, and <code>k</code>:
      </p>
      <ul>
        <li><strong>Precision at k:</strong> of the first <code>k</code> results, the fraction that are relevant.</li>
        <li><strong>Recall at k:</strong> of the chunks a reviewer marked relevant, the fraction the first <code>k</code> results found.</li>
        <li><strong>Reciprocal rank:</strong> one over the position of the first relevant result (1 at position 1, 1/2 at position 2, 1/3 at position 3), or 0 when none appears. Its mean over the queries is the MRR.</li>
      </ul>
      <p>
        <strong>Input.</strong> Four questions, written inline as a list of dictionaries: the ids the reviewer marked
        relevant (a set), the top five ids from the old model, and the top five from the new one. <code>K = 3</code>,
        because a reader looks at about three results.
      </p>
      <table>
        <thead><tr><th>query</th><th>question</th><th>relevant</th><th>old top 5</th><th>new top 5</th></tr></thead>
        <tbody>
          <tr><td>q1</td><td>how do I rotate an API key?</td><td>c1</td><td>c4 c2 <strong>c1</strong> c9 c5</td><td><strong>c1</strong> c4 c2 c9 c5</td></tr>
          <tr><td>q2</td><td>a key was leaked, what do I do?</td><td>c3, c8</td><td>c6 <strong>c3 c8</strong> c7 c2</td><td><strong>c3 c8</strong> c6 c7 c2</td></tr>
          <tr><td>q3</td><td>which scope do list calls need?</td><td>c5</td><td><strong>c5</strong> c2 c9 c4 c1</td><td>c2 <strong>c5</strong> c9 c4 c1</td></tr>
          <tr><td>q4</td><td>where is last month&apos;s invoice?</td><td>c10</td><td>c2 c4 c6 c7 c9</td><td>c4 c2 c9 c6 c7</td></tr>
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
        Change one behavior. Precision and recall at k treat a hit at position 1 and a hit at position 3 the same,
        and the reciprocal rank looks only at the first hit. Add <code>ndcg_at_k</code>: every relevant result among
        the first <code>k</code> earns <code>1 / log2(position + 1)</code>, so later hits earn less, and the total
        is divided by the best total possible for that query (the ideal: the relevant chunks at positions 1, 2, 3,
        up to <code>min(k, len(relevant))</code> of them). The file below is the worked solution with an nDCG
        column already wired into <code>evaluate</code> and the function left unwritten. As shipped it prints{' '}
        <code>NOT OK</code> and stops.
      </p>
      <p>
        <strong>Hint.</strong> Two loops and a division. Loop over <code>ranked[:k]</code> with{' '}
        <code>enumerate(..., start=1)</code> and add the discounted gain for each relevant id; then loop over{' '}
        <code>range(1, ideal_hits + 1)</code> adding the same discount for the ideal positions; return the first total
        divided by the second. <code>math.log2</code> is the base-two logarithm, and the file already imports{' '}
        <code>math</code>.
      </p>
      <p>
        <strong>Expected result.</strong> q2 scores 0.693 under the old ranking (hits at positions 2 and 3 earn 0.631
        and 0.500 of a possible 1.631) and 1.000 under the new one; q3 slips from 1.000 to 0.631; the means are 0.548
        old against 0.658 new, a difference of +0.109. The file ends with <code>OK</code>.
      </p>
      <details>
        <summary>Show the answer</summary>
        <CodeBlock filename="Practice answer" code={answerSnippet} />
        <p>
          The same guards as the other functions, then a gain loop over the judged slice with <code>enumerate</code>{' '}
          starting at 1, an ideal loop over <code>range</code>, and one division. A question with one relevant chunk
          has an ideal of exactly 1, so its nDCG is simply the discount of its first hit. Everything outside the marked
          region is the practice file unchanged.
        </p>
      </details>
    </>
  ),

  files: [
    { path: 'python/src/retrieval_metrics/solution.py', role: 'reference', language: 'python', source: solutionSource, primary: true,
      description: 'The complete worked example: the four queries, hits_in_top, precision_at_k, recall_at_k, reciprocal_rank, evaluate, and a demonstration that prints both tables, the difference, the rejected k, and OK. Runs alone with Python 3.11 or newer.' },
    { path: 'python/src/retrieval_metrics/starter.py', role: 'starter', language: 'python', source: starterSource, primary: true,
      description: 'The practice file: the worked solution with an nDCG column wired into evaluate and ndcg_at_k left unwritten. Prints NOT OK until the function discounts each hit by its position and divides by the ideal.' },
    { path: 'python/src/retrieval_metrics/practice_answer.py', role: 'reference', language: 'python', source: answerSource,
      description: 'The completed practice variation; the page shows the region between its answer markers.' },
    { path: 'python/fixtures/expected-output.txt', role: 'fixture', language: 'text', source: expectedOutput,
      description: 'What solution.py prints, byte for byte. The test runs the file alone and compares.' },
    { path: 'python/fixtures/expected-practice-output.txt', role: 'fixture', language: 'text', source: expectedPracticeOutput,
      description: 'What practice_answer.py prints, byte for byte.' },
    { path: 'python/tests/test_lesson.py', role: 'test', language: 'python', source: lessonTests,
      description: 'Runs the three lesson files alone, checks the metrics against hand-computed rankings and their guards, pins the animation fixtures to the real functions, and measures what the two rankings share and where they differ.' },
    { path: 'python/fixtures/queries.json', role: 'fixture', language: 'json', source: queriesFixture,
      description: 'The four queries and k exactly as the lesson files define them, with each relevant set written as a sorted list; the animation runs on this copy and a test pins it to the files.' },
  ],

  evidence: (
    <>
      <p>
        <strong>What the file checks</strong> before it prints <code>OK</code>: the two rankings have the same mean
        precision and the same mean recall, the new ranking has the higher MRR, and q4 has a reciprocal rank of 0
        under both. Run your copy and compare its output with the expected output above; they must match line for
        line.
      </p>
      <p>
        <strong>The failure cases.</strong> The demonstration scores with <code>k = 0</code>, and{' '}
        <code>hits_in_top</code> raises a <code>ValueError</code> that the demonstration prints as the rejected line;
        dividing by zero was never reached. An empty relevant set raises the same way from every function, because
        recall would divide by zero and a question nobody has judged cannot be scored. The tests in the project
        download also score a ranking with no hits (0 everywhere), a ranking shorter than k (the slice stops early
        but k still divides), and a hand-built ranking whose numbers are known by inspection.
      </p>
      <p>
        <strong>What shipped, on the same queries.</strong> &quot;Felt better&quot; turns out to mean one thing:
        for every question the two models put the same relevant chunks inside the top three, so precision and recall
        tie exactly at 0.333 and 0.750, while the first hit moves from position 3 to 1 on q1 and from 2 to 1 on q2.
        The mean reciprocal rank rises from 0.458 to 0.625. The table also shows two things the feeling hid: q3
        slipped from position 1 to 2, and q4&apos;s relevant chunk is missing from both top fives, which points at
        the index rather than the model. All of this is pinned by the tests in the project download.
      </p>
    </>
  ),

  solution: (
    <>
      <p>
        Read the file top to bottom: the input, one helper that counts hits, three metric functions, one function
        that scores a whole ranking, and a demonstration. Here is its Python, construct by construct.
      </p>
      <ol>
        <li>
          <strong>A set literal.</strong> <code>&quot;relevant&quot;: {'{'}&quot;c3&quot;, &quot;c8&quot;{'}'}</code> uses
          curly braces with values and no colons, which makes a set rather than a dictionary. A set holds each value
          once, has no order, and answers <code>chunk_id in relevant</code> in constant time, which is the only thing
          the metrics ask of it. <code>len(relevant)</code> is the number of relevant chunks.
        </li>
        <li>
          <strong>Slicing the first k.</strong> <code>ranked[:k]</code> is a new list holding the first <code>k</code>{' '}
          items, or fewer when the list is shorter; the original list is untouched. <code>for chunk_id in ranked[:k]:</code>{' '}
          then walks only the results a reader would see.
        </li>
        <li>
          <strong>One helper, used twice.</strong> <code>hits_in_top</code> counts the relevant ids in the slice with a
          running total: <code>hits = 0</code> before the loop and <code>hits += 1</code> inside an <code>if</code>.
          Precision divides that count by <code>k</code>; recall divides the same count by <code>len(relevant)</code>.
          Writing the loop once keeps the two definitions visibly different in exactly one place: the denominator.
        </li>
        <li>
          <strong>Guards that raise.</strong> <code>if k &lt; 1: raise ValueError(f&quot;k must be at least 1, got {'{k}'}&quot;)</code>{' '}
          stops the function with a message instead of returning a meaningless number, and <code>if not relevant:</code>{' '}
          is true for an empty set (an empty collection counts as false in Python).
        </li>
        <li>
          <strong>enumerate with start=1, and an early return.</strong> <code>for position, chunk_id in enumerate(ranked, start=1):</code>{' '}
          pairs each id with its position counted from 1 instead of 0, the way people number results. Inside the loop,{' '}
          <code>return 1 / position</code> leaves the function at the first relevant id, so the loop never looks past
          the first hit; the <code>return 0.0</code> after the loop runs only when nothing was found.
        </li>
        <li>
          <strong>Division makes a float.</strong> <code>1 / 3</code> is <code>0.333...</code> in Python 3, never 0,
          so every metric is a plain fraction without casting.
        </li>
        <li>
          <strong>Scoring a whole ranking.</strong> <code>evaluate</code> takes <code>ranking_key</code>, the string{' '}
          <code>&quot;old&quot;</code> or <code>&quot;new&quot;</code>, and reads <code>query[ranking_key]</code> to pick that
          list out of each dictionary. It appends one tuple <code>(id, precision, recall, rr)</code> per query, keeps
          three running totals, and returns the rows together with a dictionary of means:{' '}
          <code>{'{"precision": ..., "recall": ..., "mrr": ...}'}</code>. The caller unpacks{' '}
          <code>rows, means = evaluate(...)</code> and reads <code>means[&quot;mrr&quot;]</code>.
        </li>
        <li>
          <strong>The demonstration.</strong> <code>for key in [&quot;old&quot;, &quot;new&quot;]:</code> scores both rankings
          with the same code, and <code>results[key] = means</code> keeps each dictionary for the comparison. The
          format specs line the tables up: <code>{'{query_id:<6}'}</code> pads to six columns on the left,{' '}
          <code>{'{precision:>7.3f}'}</code> prints three decimals right-aligned in seven, and <code>{'{delta:+.3f}'}</code>{' '}
          forces a sign, so a zero difference prints as <code>+0.000</code>. <code>try</code> and{' '}
          <code>except ValueError</code> show the rejected k, and each <code>assert</code> checks one claim before{' '}
          <code>OK</code>.
        </li>
      </ol>
      <p><strong>Trace the hits.</strong> Follow where each relevant chunk lands and what the three numbers make of it:</p>
      <table>
        <thead><tr><th>query</th><th>relevant</th><th>old hits at</th><th>P@3</th><th>R@3</th><th>RR</th><th>new hits at</th><th>P@3</th><th>R@3</th><th>RR</th></tr></thead>
        <tbody>
          <tr><td>q1</td><td>c1</td><td>3</td><td>0.333</td><td>1.000</td><td>0.333</td><td>1</td><td>0.333</td><td>1.000</td><td>1.000</td></tr>
          <tr><td>q2</td><td>c3, c8</td><td>2, 3</td><td>0.667</td><td>1.000</td><td>0.500</td><td>1, 2</td><td>0.667</td><td>1.000</td><td>1.000</td></tr>
          <tr><td>q3</td><td>c5</td><td>1</td><td>0.333</td><td>1.000</td><td>1.000</td><td>2</td><td>0.333</td><td>1.000</td><td>0.500</td></tr>
          <tr><td>q4</td><td>c10</td><td>none</td><td>0.000</td><td>0.000</td><td>0.000</td><td>none</td><td>0.000</td><td>0.000</td><td>0.000</td></tr>
          <tr><td>mean</td><td></td><td></td><td>0.333</td><td>0.750</td><td>0.458</td><td></td><td>0.333</td><td>0.750</td><td>0.625</td></tr>
        </tbody>
      </table>
      <p>
        Precision at 3 is 1/3 whenever one relevant chunk sits inside the window and 2/3 when two do, whatever their
        order; recall at 3 is 1 whenever every relevant chunk is inside it. Only the reciprocal rank moves with the
        position: q1 goes from 1/3 to 1, q2 from 1/2 to 1, q3 from 1 to 1/2, and q4 stays at 0. The MRR is the mean
        of that column: (1/3 + 1/2 + 1 + 0) / 4 = 0.458 against (1 + 1 + 1/2 + 0) / 4 = 0.625.
      </p>
      <p>
        <strong>Why these decisions.</strong> k is 3 because the metric should describe what the reader, or the
        generator&apos;s context window, actually receives; a k of 10 would make both rankings look perfect here.
        Recall needs the full relevant set, which only a human review can supply, so the queries carry it as data
        rather than deriving it from either ranking. The reciprocal rank is kept separate from precision and recall
        because it answers a different question, how soon, and on these queries it is the only one of the three that
        moved. Scoring both rankings with one function on the same queries is the point: a paired comparison, with
        the differences printed, not two numbers from two different weeks.
      </p>
      <p>
        <strong>The pattern, and its limits.</strong> Slice the first k, test membership in a set, divide by the right
        denominator, and average across queries. The same shape scores a search box, a vector index, or a tool
        router. Its limits: the relevance labels are binary, so a chunk that half answers the question counts as
        nothing or everything; four queries cannot distinguish a real gain from luck (a bootstrap interval, the
        earlier lesson, is the next step); the means hide q3&apos;s regression unless you print the rows; and no
        retrieval metric says whether the final answer was right, which is what end-to-end evaluation measures.
      </p>
    </>
  ),

  visual: (
    <figure className="fig">
      <RetrievalMetricsViz />
      <figcaption className="fig-cap">
        <span className="fig-caption-text">
          The functions from the file, run on their own four questions at a reading pace: about two and a half
          seconds per ranking, about half a minute in all. For each question the old ranking lights up first, then the
          new one: the five returned ids as slots, relevant chunks in green, a bright border on the first relevant hit,
          and an amber box around the three results that are judged; under each row, meters for precision at three,
          recall at three, and the reciprocal rank fill to their values. The table on the right collects every row, the
          means appear in the outro, and the practice variation adds the nDCG column with a plot of the per-position
          discounts for q2. Step through with the buttons. Every number comes from the same functions run in the
          browser and is checked against the Python run.
        </span>
      </figcaption>
    </figure>
  ),

  tradeoffs: [
    {
      name: 'Eyeballing a few queries (what shipped)',
      preferWhen: 'A prototype with no judged questions yet, where the goal is to notice gross failures, such as a category of question that returns nothing usable.',
      cost: 'No baseline and no paired comparison, so a model that merely reorders the same hits looks like a breakthrough and a model that drops q3 to second place goes unnoticed. The decision cannot be repeated or defended, and it never reveals that q4 is missing from the index.',
    },
    {
      name: 'Precision at k, recall at k, and MRR (this lesson)',
      preferWhen: 'A set of judged questions exists or can be built from a review queue, relevance is a yes or no, and the retriever is compared release against release on the same questions.',
      cost: 'Binary relevance throws away degrees of usefulness; a k has to be chosen and defended; a handful of queries gives noisy means (0.458 against 0.625 here rests on four questions); and the rows must be read as well as the means, or a regression like q3 hides inside an improvement.',
    },
    {
      name: 'End-to-end answer evaluation with a judge',
      preferWhen: 'What matters is whether the generated answer is right, the retriever is one stage among several, and the budget allows a model or human judgment per question.',
      cost: 'A judgment per question per release, a judge that itself needs validating against humans, and a score that mixes retrieval and generation, so a drop cannot be attributed to the retriever without the retrieval metrics alongside it. It complements the three numbers rather than replacing them.',
    },
  ],
};
