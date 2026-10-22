import CodeBlock from '../../src/components/CodeBlock.jsx';
import CosineRankViz from './visuals/CosineRankViz.jsx';
import solutionSource from './python/src/cosine_retrieval/solution.py?raw';
import starterSource from './python/src/cosine_retrieval/starter.py?raw';
import answerSource from './python/src/cosine_retrieval/practice_answer.py?raw';
import lessonTests from './python/tests/test_lesson.py?raw';
import expectedOutput from './python/fixtures/expected-output.txt?raw';
import expectedPracticeOutput from './python/fixtures/expected-practice-output.txt?raw';
import chunksFixture from './python/fixtures/chunks.json?raw';

// Authored by Claude Fable 5 in the main thread. Every number on this page was
// produced by running the files below; the expected outputs are the files'
// actual output, compared byte for byte by the tests.
const answerSnippet = answerSource.split('# --- answer begins ---\n')[1].split('# --- answer ends ---')[0].trim();

export const content = {
  brief: (
    <>
      <p>
        Orbit&apos;s assistant embeds every runbook chunk and the question as vectors and picks the chunks to read by
        score. The first version scored by the raw dot product, and long chunks with large vectors won every time:
        for &quot;how do I rotate an API key?&quot; the billing overview came first and the one paragraph about key
        rotation came third. The dot product rewards length as much as direction.
      </p>
      <p>
        <strong>The action to practice:</strong> score chunks by cosine similarity, written by hand, and keep the top
        k. The cosine is the dot product divided by both vector lengths, so only the direction counts. Four small
        moves:
      </p>
      <ul>
        <li><strong>Dot product:</strong> multiply matching positions of the two vectors and add the products up.</li>
        <li><strong>Length:</strong> the square root of a vector&apos;s dot product with itself.</li>
        <li><strong>Cosine:</strong> the dot product divided by the product of the two lengths; a zero vector has no direction and is rejected.</li>
        <li><strong>Rank and cut:</strong> sort the (id, score) pairs by score, highest first, ties by id, and slice off the first k.</li>
      </ul>
      <p>
        <strong>Input.</strong> One query vector and five chunks, each a dictionary with an id, a title, and a vector of
        four numbers, written inline. Real embeddings have hundreds of positions; four is enough to see every step.
        The query is <code>[0.9, 0.1, 0.0, 0.4]</code>.
      </p>
      <table>
        <thead><tr><th>id</th><th>title</th><th>vector</th></tr></thead>
        <tbody>
          <tr><td>c1</td><td>Rotate an API key</td><td>[0.8, 0.2, 0.1, 0.5]</td></tr>
          <tr><td>c2</td><td>Billing overview</td><td>[1.5, 3.0, 3.5, 0.5]</td></tr>
          <tr><td>c3</td><td>List call scopes</td><td>[0.9, 2.7, 0.6, 0.3]</td></tr>
          <tr><td>c4</td><td>Revoke a lost key</td><td>[0.6, 0.0, 0.1, 0.8]</td></tr>
          <tr><td>c5</td><td>Invoice downloads</td><td>[0.1, 0.1, 0.9, 0.2]</td></tr>
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
        Change one behavior. The worked solution always returns the top k, however weak the match, so an unrelated
        question gets the three least unrelated chunks. Make <code>rank_chunks</code> also drop any chunk whose cosine
        is below a <code>minimum</code>, even when fewer than k remain. The file below is the worked solution with a{' '}
        <code>minimum</code> parameter that is accepted but not used yet, and a check for the new behavior. As shipped
        it prints <code>NOT OK</code> and stops.
      </p>
      <p>
        <strong>Hint.</strong> One <code>if</code> inside the loop that builds the scored list, before the{' '}
        <code>append</code>: compute the score into a variable first, and when it is below the minimum,{' '}
        <code>continue</code> to the next chunk. A <code>continue</code> skips the rest of the loop body for this
        item only. A second loop that filters the sorted list works too.
      </p>
      <p>
        <strong>Expected result.</strong> With a minimum of 0.5 only two chunks come back, c1 at 0.979 and c4 at 0.864;
        c3 at 0.415 is dropped even though k is 3. The file ends with <code>OK</code>.
      </p>
      <details>
        <summary>Show the answer</summary>
        <CodeBlock filename="Practice answer" code={answerSnippet} />
        <p>
          One new variable, one comparison, and a <code>continue</code>. The test runs before the append, so a weak
          chunk never enters the scored list and the sort and the slice are unchanged. With a minimum of 0.0 nothing is
          skipped and the function behaves exactly like the worked solution. Everything outside the marked region is
          the practice file unchanged.
        </p>
      </details>
    </>
  ),

  files: [
    { path: 'python/src/cosine_retrieval/solution.py', role: 'reference', language: 'python', source: solutionSource, primary: true,
      description: 'The complete worked example: the query, the five chunks, dot, norm, cosine, the sort key, rank_chunks, and a demonstration that prints every score, both rankings, the top three, the rejected chunk, and OK. Runs alone with Python 3.11 or newer.' },
    { path: 'python/src/cosine_retrieval/starter.py', role: 'starter', language: 'python', source: starterSource, primary: true,
      description: 'The practice file: the worked solution with a minimum parameter that is not used yet, and a check for the new behavior. Prints NOT OK until rank_chunks drops every chunk below the minimum.' },
    { path: 'python/src/cosine_retrieval/practice_answer.py', role: 'reference', language: 'python', source: answerSource,
      description: 'The completed practice variation; the page shows the region between its answer markers.' },
    { path: 'python/fixtures/expected-output.txt', role: 'fixture', language: 'text', source: expectedOutput,
      description: 'What solution.py prints, byte for byte. The test runs the file alone and compares.' },
    { path: 'python/fixtures/expected-practice-output.txt', role: 'fixture', language: 'text', source: expectedPracticeOutput,
      description: 'What practice_answer.py prints, byte for byte.' },
    { path: 'python/tests/test_lesson.py', role: 'test', language: 'python', source: lessonTests,
      description: 'Runs the three lesson files alone, checks the dot product, the norm, the cosine, the scale invariance, the rejections, the sort order, the practice minimum, and the fixtures, and measures the dot-product ranking that shipped against the cosine ranking on the same chunks.' },
    { path: 'python/fixtures/chunks.json', role: 'fixture', language: 'json', source: chunksFixture,
      description: 'The query, the five chunks, k, and the practice minimum exactly as the lesson files define them; the animation runs on this copy and a test pins it to the files.' },
  ],

  evidence: (
    <>
      <p>
        <strong>What the file checks</strong> before it prints <code>OK</code>: c1 ranks first by cosine, c2 ranks
        first by dot product and fourth by cosine, and scaling c2&apos;s vector by ten leaves its cosine unchanged
        (within one part in a trillion) while its dot product grows tenfold. Run your copy and compare its output with
        the expected output above; they must match line for line.
      </p>
      <p>
        <strong>The failure cases.</strong> The demonstration ranks a chunk whose vector has three numbers against the
        four-number query, and <code>zip(..., strict=True)</code> raises a <code>ValueError</code> that the
        demonstration prints as the rejected line instead of silently multiplying three pairs. A zero vector raises
        a <code>ValueError</code> from <code>cosine</code>, because dividing by a length of zero would fail and a vector
        of zeros points nowhere. The tests also check that the cosine of a vector with itself is 1.0, that two
        perpendicular vectors score 0.0, that <code>k</code> of 0 returns nothing and <code>k</code> past the end
        returns everything, and that equal scores are ordered by id.
      </p>
      <p>
        <strong>The dot product on the same chunks.</strong> Ranked by dot product, the top three were c2, c3, and c1:
        the billing overview with a length of 4.87 and the scopes chunk with a length of 2.92 both outscored the key
        rotation runbook, whose length is 0.97. Divide each dot product by both lengths and the order becomes c1, c4,
        c3: the runbook the user needed is first, and the billing overview drops to fourth at 0.383. Both measurements
        are tests in the project download.
      </p>
    </>
  ),

  solution: (
    <>
      <p>
        Read the file top to bottom: the input, three one-job helpers, a sort key, the ranking function, and a
        demonstration. Here is its Python, construct by construct.
      </p>
      <ol>
        <li>
          <strong>A module import.</strong> <code>import math</code> brings in the standard math module, and{' '}
          <code>math.sqrt</code> is the square root. Nothing is installed.
        </li>
        <li>
          <strong>The dot product.</strong> <code>for x, y in zip(a, b, strict=True):</code> walks two lists in step,
          handing out one number from each per turn; <code>strict=True</code> makes <code>zip</code> raise a{' '}
          <code>ValueError</code> when the lists differ in length instead of silently stopping at the shorter one.{' '}
          <code>total += x * y</code> adds each product into a running total that started at <code>0.0</code>, and the
          function returns the total.
        </li>
        <li>
          <strong>A function built from a function.</strong> <code>norm</code> is one line:{' '}
          <code>math.sqrt(dot(a, a))</code>. A vector&apos;s dot product with itself is the sum of its squares, and the
          square root of that is its length.
        </li>
        <li>
          <strong>The cosine and its guard.</strong> <code>cosine</code> computes both lengths, and{' '}
          <code>if length_a == 0.0 or length_b == 0.0:</code> raises <code>ValueError</code> before any division;{' '}
          <code>or</code> is true when either side is. Otherwise it returns <code>dot(a, b) / (length_a * length_b)</code>:
          the same dot product, scaled so that only the angle between the vectors remains.
        </li>
        <li>
          <strong>A sort key that returns a tuple.</strong> <code>by_score_then_id</code> takes one{' '}
          <code>(id, score)</code> pair, unpacks it with <code>chunk_id, score = record</code>, and returns{' '}
          <code>(-score, chunk_id)</code>. Python sorts ascending, so negating the score puts the highest first; when
          two scores are equal the tuple&apos;s second element decides, and ids sort alphabetically. The function is
          passed by name, <code>scored.sort(key=by_score_then_id)</code>, without parentheses: the sort calls it once
          per pair.
        </li>
        <li>
          <strong>Build, sort, slice.</strong> <code>rank_chunks</code> starts with <code>scored = []</code>, appends
          one tuple per chunk, <code>(chunk[&quot;id&quot;], cosine(query, chunk[&quot;vector&quot;]))</code>, sorts
          the list in place, and returns <code>scored[:k]</code>, the first k elements. A slice past the end simply
          returns what there is, so k of 10 returns all five.
        </li>
        <li>
          <strong>The demonstration.</strong> Two dictionaries, <code>dots</code> and <code>cosines</code>, map each id
          to its score. <code>sorted(dots.items(), key=by_score_then_id)</code> sorts the dictionary&apos;s{' '}
          <code>(id, score)</code> pairs with the same key function, and <code>enumerate(..., start=1)</code> numbers
          them from 1 to give each chunk its rank. The format specs line the table up: <code>{'{title:<18}'}</code> pads
          to eighteen columns on the left, <code>{'{dot:>5.2f}'}</code> prints two decimals right-aligned in five,{' '}
          <code>{'{cosine:>7.3f}'}</code> three decimals in seven. <code>scale</code> copies a vector with every number
          multiplied, <code>try</code> and <code>except ValueError</code> show the rejection without crashing, and each{' '}
          <code>assert</code> checks one claim before <code>OK</code>.
        </li>
      </ol>
      <p><strong>Trace the scores.</strong> Follow each chunk through the three numbers and the two rankings; the query&apos;s length is 0.99 throughout:</p>
      <table>
        <thead><tr><th>chunk</th><th>dot</th><th>length</th><th>cosine</th><th>rank by dot</th><th>rank by cosine</th></tr></thead>
        <tbody>
          <tr><td>c1 Rotate an API key</td><td>0.94</td><td>0.97</td><td>0.979</td><td>3</td><td>1</td></tr>
          <tr><td>c2 Billing overview</td><td>1.85</td><td>4.87</td><td>0.383</td><td>1</td><td>4</td></tr>
          <tr><td>c3 List call scopes</td><td>1.20</td><td>2.92</td><td>0.415</td><td>2</td><td>3</td></tr>
          <tr><td>c4 Revoke a lost key</td><td>0.86</td><td>1.00</td><td>0.864</td><td>4</td><td>2</td></tr>
          <tr><td>c5 Invoice downloads</td><td>0.18</td><td>0.93</td><td>0.195</td><td>5</td><td>5</td></tr>
        </tbody>
      </table>
      <p>
        Inside <code>rank_chunks</code> the scored list is built in input order, c1 0.979, c2 0.383, c3 0.415, c4
        0.864, c5 0.195. The sort key turns those into (-0.979, c1), (-0.383, c2), and so on, so ascending order is
        c1, c4, c3, c2, c5. The slice <code>[:3]</code> keeps c1, c4, c3. Notice c2: its dot product of 1.85 is the
        largest because its vector is the longest (4.87), yet it points mostly along the second and third positions,
        where the query is nearly zero, so its cosine is 0.383.
      </p>
      <p>
        <strong>Why these decisions.</strong> Cosine rather than the dot product because the chunks were embedded from
        passages of different lengths and the vectors came back with different magnitudes; the question is about
        direction. A strict zip because a silently truncated dot product is a wrong score with no error. A named key
        function rather than a lambda because the tie-break is a rule worth reading, and ids as the tie-break because
        the ranking must be reproducible run to run. The slice rather than a loop with a counter because it is the
        idiom every Python reader expects for &quot;the first k&quot;.
      </p>
      <p>
        <strong>The pattern, and its limits.</strong> Score, sort by a key, slice the top k: the shape of every
        reranking step in a retrieval pipeline, whether the score is a cosine, a keyword weight, or a model&apos;s
        output. Its limits: this is a full scan, one cosine per chunk per query, which is fine for thousands of chunks
        and hopeless for millions, where a vector index does the search approximately; most embedding models already
        return unit-length vectors, in which case the dot product is the cosine and the square roots are wasted; and a
        high cosine means the vectors agree, not that the chunk answers the question, which is why a reranker or the
        model itself usually reads the top k before anything is shown.
      </p>
    </>
  ),

  visual: (
    <figure className="fig">
      <CosineRankViz />
      <figcaption className="fig-cap">
        <span className="fig-caption-text">
          The functions from the file, run on their own five chunks at a reading pace: about two and a half seconds
          per chunk, under half a minute in all. Each row grows an amber bar for the dot product, scaled to the
          largest, and a blue bar for the cosine on a scale of 0 to 1, while the readout shows the dot product, the
          two lengths, and the cosine as they are computed. Then the rows move one at a time into cosine order, the
          cut keeps the top three, and the practice variation draws the minimum of 0.5 and drops the rows below it.
          Step through with the buttons. The figure rests for two minutes before it plays again, and the motion
          setting in the site header can slow or stop it. Every score comes from the same functions run in the browser
          and is compared with the Python run.
        </span>
      </figcaption>
    </figure>
  ),

  tradeoffs: [
    {
      name: 'Raw dot product (what shipped)',
      preferWhen: 'The embedding model returns unit-length vectors, which most hosted embedding models do. Then the dot product equals the cosine, the square roots are unnecessary, and the scan is as cheap as it gets.',
      cost: 'With vectors of mixed length the score rewards length as much as direction. On these five chunks it ranks the billing overview first at 1.85 and the key rotation runbook third at 0.94, and nobody notices until the answers are wrong.',
    },
    {
      name: 'Cosine similarity per query (this lesson)',
      preferWhen: 'A small corpus, vectors of mixed magnitude, and a pipeline that must be readable and exact: thousands of chunks, one query at a time, no index to operate.',
      cost: 'A square root per chunk per query, and still a full scan of every chunk. The ranking is only as good as the embedding: a high cosine says the vectors agree, not that the chunk answers the question.',
    },
    {
      name: 'Normalize once at ingest, then an approximate nearest neighbour index (HNSW)',
      preferWhen: 'Millions of chunks or many queries per second. Each vector is divided by its length once when it is stored, so the index searches by dot product and finds the closest directions without touching every chunk.',
      cost: 'Index build time and memory, approximate recall that must be measured, and a rebuild whenever the embedding model changes, because every stored vector was normalized under the old one.',
    },
  ],
};
