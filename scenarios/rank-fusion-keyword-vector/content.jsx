import CodeBlock from '../../src/components/CodeBlock.jsx';
import RankFusionViz from './visuals/RankFusionViz.jsx';
import solutionSource from './python/src/rank_fusion/solution.py?raw';
import starterSource from './python/src/rank_fusion/starter.py?raw';
import answerSource from './python/src/rank_fusion/practice_answer.py?raw';
import lessonTests from './python/tests/test_lesson.py?raw';
import expectedOutput from './python/fixtures/expected-output.txt?raw';
import expectedPracticeOutput from './python/fixtures/expected-practice-output.txt?raw';
import rankingsFixture from './python/fixtures/rankings.json?raw';

// Authored by Claude Fable 5 in the main thread. Every number on this page was
// produced by running the files below; the expected outputs are the files'
// actual output, compared byte for byte by the tests.
const answerSnippet = answerSource.split('# --- answer begins ---\n')[1].split('# --- answer ends ---')[0].trim();

export const content = {
  brief: (
    <>
      <p>
        Orbit&apos;s support assistant retrieves runbook chunks two ways. A keyword index finds exact terms: error
        codes, flag names, command names. A vector index finds chunks that say the same thing in other words. Each
        returns its own ranked list for a question, and the prompt has room for the top three. The merge that shipped
        took the vector list and appended whatever the keyword list added. For &quot;rotate-key fails with E4031&quot;
        that put the error table for E4031 fourth, so the one chunk that explains the code never reached the prompt.
      </p>
      <p>
        <strong>The action to practice:</strong> fuse two ranked lists with reciprocal rank fusion. Each list gives
        each of its documents <code>1 / (k + rank)</code>, with <code>k = 60</code>. The contributions add up, the
        documents are sorted by score, and equal scores are ordered by name. A document both retrievers found rises
        above a document only one of them found.
      </p>
      <p>
        <strong>Input.</strong> Two rankings of five documents each, written inline as a dictionary from a list name
        to a list of document names, best first:
      </p>
      <table>
        <thead><tr><th>rank</th><th>keyword ranking</th><th>vector ranking</th></tr></thead>
        <tbody>
          <tr><td>1</td><td>errors E4031</td><td>runbook rotate a key</td></tr>
          <tr><td>2</td><td>cli rotate-key</td><td>faq key expiry</td></tr>
          <tr><td>3</td><td>runbook rotate a key</td><td>cli rotate-key</td></tr>
          <tr><td>4</td><td>scopes</td><td>errors E4031</td></tr>
          <tr><td>5</td><td>audit log</td><td>incident call</td></tr>
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
        Change one behavior. The worked solution counts every list the same. Give each list a weight: a list&apos;s
        contribution becomes <code>weight / (k + rank)</code>, and a list with no entry in the weights dictionary
        counts once, as before. The file below is the worked solution with <code>WEIGHTS</code> (keyword 2, vector 1)
        added to its input and a check for the new behavior. As shipped it prints <code>NOT OK</code> and stops.
      </p>
      <p>
        <strong>Hint.</strong> One line changes, inside the inner loop. Look up the weight for the current list name
        with <code>weights.get(name, 1)</code>, the same way the scores dictionary is read with a default of 0.0.
      </p>
      <p>
        <strong>Expected result.</strong> The error table comes first: errors E4031 0.048412, runbook rotate a key
        0.048139, cli rotate-key 0.048131, then scopes, audit log, faq key expiry, incident call. The file ends with{' '}
        <code>OK</code>.
      </p>
      <details>
        <summary>Show the answer</summary>
        <CodeBlock filename="Practice answer" code={answerSnippet} />
        <p>
          One multiplication. Doubling the keyword contributions lifts every document the keyword index found by the
          same factor, so the error table (keyword rank 1) overtakes the runbook (keyword rank 3) even though the
          runbook was the vector index&apos;s first choice. Everything outside the marked region is the practice file
          unchanged.
        </p>
      </details>
    </>
  ),

  files: [
    { path: 'python/src/rank_fusion/solution.py', role: 'reference', language: 'python', source: solutionSource, primary: true,
      description: 'The complete worked example: the two rankings, the sort key, fuse, and a demonstration that prints the fused list with every score and rank, then OK. Runs alone with Python 3.11 or newer.' },
    { path: 'python/src/rank_fusion/starter.py', role: 'starter', language: 'python', source: starterSource, primary: true,
      description: 'The practice file: the worked solution plus a weights dictionary and a check for the new behavior. Prints NOT OK until fuse multiplies each contribution by its list\'s weight.' },
    { path: 'python/src/rank_fusion/practice_answer.py', role: 'reference', language: 'python', source: answerSource,
      description: 'The completed practice variation; the page shows the region between its answer markers.' },
    { path: 'python/fixtures/expected-output.txt', role: 'fixture', language: 'text', source: expectedOutput,
      description: 'What solution.py prints, byte for byte. The test runs the file alone and compares.' },
    { path: 'python/fixtures/expected-practice-output.txt', role: 'fixture', language: 'text', source: expectedPracticeOutput,
      description: 'What practice_answer.py prints, byte for byte.' },
    { path: 'python/tests/test_lesson.py', role: 'test', language: 'python', source: lessonTests,
      description: 'Runs the three lesson files alone and checks the scores, the tie rule, the duplicate guard, the shipped order, why k matters, and the animation fixtures.' },
    { path: 'python/fixtures/rankings.json', role: 'fixture', language: 'json', source: rankingsFixture,
      description: 'The two rankings, k, and the practice weights exactly as the lesson files define them; the animation runs on this copy and a test pins it to the files.' },
  ],

  evidence: (
    <>
      <p>
        <strong>What the file checks</strong> before it prints <code>OK</code>: seven distinct documents come out, the
        runbook leads, the error table is second, and the two lone fifth places sort by name. Run your copy and
        compare its output with the expected output above; they must match line for line.
      </p>
      <p>
        <strong>The failure case.</strong> A ranking that lists the same document twice would give it two
        contributions it did not earn, so <code>fuse</code> raises a <code>ValueError</code> naming the list and the
        document. The same document in two different lists is not a duplicate; it is the whole point.
      </p>
      <p>
        <strong>The shipped merge on the same lists.</strong> Take the vector list, then the keyword documents not
        already present: runbook, faq, cli, errors E4031, incident call, scopes, audit log. The error table is fourth,
        outside a top-three prompt. Fused, it is second, and the three documents both retrievers found fill the
        prompt. The tests also show why <code>k</code> matters: with <code>k = 0</code> a lone first place (1.0) ties
        two second places (0.5 + 0.5); with <code>k = 60</code> two second places (2/62) beat a lone first place
        (1/61). Both facts are checked by the tests in the project download.
      </p>
    </>
  ),

  solution: (
    <>
      <p>
        Read the file top to bottom: the constant, the two rankings, a small sort key, the one function that does
        the work, and a demonstration. Here is its Python, construct by construct.
      </p>
      <ol>
        <li>
          <strong>A dictionary of lists.</strong> <code>RANKINGS</code> maps a list name to a list of document names.{' '}
          <code>rankings.items()</code> yields each (name, list) pair, and <code>for name, ranking in ...</code> unpacks
          the pair into two names in one step. This is tuple unpacking, and it appears three times in the file.
        </li>
        <li>
          <strong>Numbering from one.</strong> <code>enumerate(ranking, start=1)</code> yields a rank and a document
          together. Ranks are one-based because the formula says 1 / (k + 1) for first place, and starting the count
          at one keeps that visible instead of hiding a plus one in the arithmetic.
        </li>
        <li>
          <strong>The guard.</strong> <code>ranking.count(doc) &gt; 1</code> asks a list how many times it holds a
          value. A document listed twice in one ranking would collect two contributions, so the function stops with
          a <code>ValueError</code> whose f-string names the list and the document.
        </li>
        <li>
          <strong>The accumulator idiom.</strong> <code>scores[doc] = scores.get(doc, 0.0) + 1 / (k + rank)</code>.{' '}
          <code>scores.get(doc, 0.0)</code> returns the stored score, or 0.0 the first time a document is seen;{' '}
          <code>scores[doc] +=</code> would raise a <code>KeyError</code> on that first time. The division produces a
          float. This one line is how Python totals anything by key.
        </li>
        <li>
          <strong>A named sort key.</strong> <code>sorted(scores.items(), key=fusion_order)</code> sorts the (document,
          score) pairs by whatever <code>fusion_order</code> returns for each pair. It returns the tuple{' '}
          <code>(-score, doc)</code>: tuples compare element by element, so a higher score (a smaller negative) comes
          first, and only when scores are equal does the name decide. Passing a function by its bare name, with no
          parentheses, hands the function itself to <code>sorted</code>. An inline <code>lambda</code> would do the
          same; a named function can carry a docstring.
        </li>
        <li>
          <strong>What comes back.</strong> <code>sorted</code> returns a new list; the dictionary is untouched. Each
          element is a tuple, so the demonstration writes <code>for position, (doc, score) in enumerate(fused, start=1)</code>:
          nested unpacking, the position from enumerate and the two halves of the pair in one line.
        </li>
        <li>
          <strong>The demonstration.</strong> <code>doc in ranking</code> tests membership and{' '}
          <code>ranking.index(doc) + 1</code> recovers the rank for the printout. The format specs do the alignment:{' '}
          <code>{'{position:2}'}</code> right-aligns a number in two columns, <code>{'{doc:22}'}</code> pads a string to
          twenty-two, <code>{'{score:.6f}'}</code> prints six decimals. <code>&quot;, &quot;.join(found)</code> glues a
          list of strings with a separator. Each <code>assert</code> checks a claim before <code>OK</code>.
        </li>
      </ol>
      <p><strong>Trace the variables.</strong> Follow <code>scores</code> through the ten contributions, keyword list first:</p>
      <table>
        <thead><tr><th>list</th><th>rank</th><th>document</th><th>adds</th><th>running total</th></tr></thead>
        <tbody>
          <tr><td>keyword</td><td>1</td><td>errors E4031</td><td>1/61 = 0.016393</td><td>0.016393</td></tr>
          <tr><td>keyword</td><td>2</td><td>cli rotate-key</td><td>1/62 = 0.016129</td><td>0.016129</td></tr>
          <tr><td>keyword</td><td>3</td><td>runbook rotate a key</td><td>1/63 = 0.015873</td><td>0.015873</td></tr>
          <tr><td>keyword</td><td>4</td><td>scopes</td><td>1/64 = 0.015625</td><td>0.015625</td></tr>
          <tr><td>keyword</td><td>5</td><td>audit log</td><td>1/65 = 0.015385</td><td>0.015385</td></tr>
          <tr><td>vector</td><td>1</td><td>runbook rotate a key</td><td>1/61 = 0.016393</td><td>0.032266</td></tr>
          <tr><td>vector</td><td>2</td><td>faq key expiry</td><td>1/62 = 0.016129</td><td>0.016129</td></tr>
          <tr><td>vector</td><td>3</td><td>cli rotate-key</td><td>1/63 = 0.015873</td><td>0.032002</td></tr>
          <tr><td>vector</td><td>4</td><td>errors E4031</td><td>1/64 = 0.015625</td><td>0.032018</td></tr>
          <tr><td>vector</td><td>5</td><td>incident call</td><td>1/65 = 0.015385</td><td>0.015385</td></tr>
        </tbody>
      </table>
      <p>
        Sorting by score puts the three documents found by both lists on top, in the order 0.032266, 0.032018,
        0.032002: the ranks 3 and 1 beat the ranks 1 and 4 by a hair, which beat 2 and 3 by less. The four lone
        documents follow in rank order, and the two fifth places tie at 0.015385, so the name decides: audit log,
        then incident call.
      </p>
      <p>
        <strong>Why these decisions.</strong> Ranks are fused rather than scores because a keyword score and a vector
        similarity live on different scales and neither is calibrated; a position is the one thing both lists agree
        on the meaning of. The constant 60 keeps first place from dwarfing second (1/61 against 1/62 is a small
        gap), so agreement across lists counts for more than one list&apos;s enthusiasm; with k = 0 first place alone
        would equal two second places. Ties are broken by name so two runs on the same input produce the same
        order, which makes the output testable and the prompt reproducible. Duplicates are rejected rather than
        quietly skipped because a retriever that returns one twice is broken, and the caller should hear about it.
      </p>
      <p>
        <strong>The pattern, and its limits.</strong> Accumulate in a dictionary, then sort with a key. The same shape
        counts votes, merges rankings from any number of retrievers, totals cost per user, or groups log lines by
        error. Its limits: positions carry no sense of how far apart two candidates were, so a runaway first place
        and a narrow one look the same; every list counts equally unless you weight them, which the practice
        variation adds; and fusion only orders what the retrievers found. It is not a reranker and it never reads
        the documents.
      </p>
    </>
  ),

  visual: (
    <figure className="fig">
      <RankFusionViz />
      <figcaption className="fig-cap">
        <span className="fig-caption-text">
          The accumulation from the file, run on its own two rankings at a reading pace: about two and a half seconds
          per contribution, under forty seconds in all. The keyword ranking stands on the left and the vector ranking
          on the right; the intro shows the vector-first order that shipped with the error table fourth. Then each
          document is carried to its row in the middle while its bar grows by 1/(60 + rank) and the caption states
          the arithmetic; the rows sort into the fused order; the prompt frame marks the top three; and the practice
          variation doubles the keyword contributions and re-sorts. Step through with the buttons. Every number comes
          from the same loop run in the browser and is checked against the Python run.
        </span>
      </figcaption>
    </figure>
  ),

  tradeoffs: [
    {
      name: 'Vector list first, keyword leftovers appended (what shipped)',
      preferWhen: 'A quick experiment where one retriever is clearly the main one and the other only fills gaps, and nobody has measured the misses yet.',
      cost: 'Position in the merged list says nothing about agreement. On the two example lists the error table, first for the keyword index and fourth for the vector index, lands fourth and misses a three-chunk prompt. Exact-term questions are precisely the ones the keyword index exists for.',
    },
    {
      name: 'Normalize the scores and add them',
      preferWhen: 'Both retrievers return calibrated scores on comparable scales, or you can learn weights from labeled queries, and the gap between candidates matters more than their order.',
      cost: 'Min-max or z-score normalization is fragile: when one retriever returns five nearly equal scores, normalization stretches noise into decisive gaps. It needs tuning per corpus, and a change in either index silently shifts the balance. Rank fusion needs no scores at all.',
    },
    {
      name: 'A cross-encoder reranker over the union of both lists',
      preferWhen: 'Answer quality justifies a model call per candidate: the reranker reads the question and each chunk together and orders by relevance, which neither index measures.',
      cost: 'Latency and cost grow with the candidate count, and the union must still be built and trimmed first. Rank fusion is usually the cheap first stage that decides which candidates the reranker sees.',
    },
  ],
};
