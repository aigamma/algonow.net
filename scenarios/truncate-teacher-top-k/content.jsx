import CodeBlock from '../../src/components/CodeBlock.jsx';
import TopKTruncateViz from './visuals/TopKTruncateViz.jsx';
import solutionSource from './python/src/sparse_targets/solution.py?raw';
import starterSource from './python/src/sparse_targets/starter.py?raw';
import answerSource from './python/src/sparse_targets/practice_answer.py?raw';
import lessonTests from './python/tests/test_lesson.py?raw';
import expectedOutput from './python/fixtures/expected-output.txt?raw';
import expectedPracticeOutput from './python/fixtures/expected-practice-output.txt?raw';
import positionsFixture from './python/fixtures/positions.json?raw';

// Authored by Claude Fable 5 in the main thread. Every number on this page was
// produced by running the files below; the expected outputs are the files'
// actual output, compared byte for byte by the tests.
const answerSnippet = answerSource.split('# --- answer begins ---\n')[1].split('# --- answer ends ---')[0].trim();

export const content = {
  brief: (
    <>
      <p>
        Orbit is distilling a small router from its large assistant. The training target at every position is the
        teacher&apos;s probability distribution over its vocabulary of thirty two thousand tokens, and the plan was to
        store all of it: two million positions times thirty two thousand floats is terabytes, for numbers that are
        almost all a rounding error. At a typical position the teacher puts nearly everything on a handful of tokens.
      </p>
      <p>
        <strong>The action to practice:</strong> keep only the <code>k</code> largest probabilities per position,
        renormalize them so they sum to one again, and measure the mass you dropped. The rules are small:
      </p>
      <ul>
        <li>The kept entries are <code>(index, probability)</code> pairs, largest probability first; a tie goes to the lower index, so two runs agree byte for byte.</li>
        <li>Each kept probability is divided by the kept sum, so the stored targets form a distribution again; the ratios between kept tokens do not change.</li>
        <li>The dropped mass is the sum of the probabilities that were not kept, measured from the full row, not assumed from it.</li>
        <li>A <code>k</code> below 1 or above the vocabulary size raises a <code>ValueError</code>.</li>
      </ul>
      <p>
        <strong>Input.</strong> Three positions over a six-token vocabulary, written inline. Real vocabularies are far
        larger; six is enough to see every step. <code>k</code> is 3.
      </p>
      <table>
        <thead><tr><th>position</th><th>after</th><th>key</th><th>scope</th><th>token</th><th>secret</th><th>api</th><th>old</th></tr></thead>
        <tbody>
          <tr><td>p1</td><td>revoke the old</td><td>0.5</td><td>0.2</td><td>0.15</td><td>0.1</td><td>0.03</td><td>0.02</td></tr>
          <tr><td>p2</td><td>calls need the read</td><td>0.3</td><td>0.3</td><td>0.2</td><td>0.1</td><td>0.05</td><td>0.05</td></tr>
          <tr><td>p3</td><td>rotate the API</td><td>0.9</td><td>0.04</td><td>0.03</td><td>0.02</td><td>0.005</td><td>0.005</td></tr>
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
        Change one behavior. The worked solution keeps a fixed number of tokens at every position, whether the teacher
        is sure or not. Make <code>top_p_sparse</code> keep the smallest set of largest probabilities whose mass reaches{' '}
        <code>P</code> instead, so a confident position stores one token and a flat one stores several. The file below is
        the worked solution with <code>top_p_sparse</code> accepting <code>p</code> but still returning the top three,
        and a check for the new behavior. As shipped it prints <code>NOT OK</code> and stops.
      </p>
      <p>
        <strong>Hint.</strong> Build and sort the pairs exactly as <code>top_k_sparse</code> does. Then walk the sorted
        pairs with a running total that starts at 0.0: append each pair, add its probability to the total, and{' '}
        <code>break</code> as soon as the total reaches <code>p</code>. A <code>break</code> leaves the loop immediately,
        so the pairs appended so far are the answer.
      </p>
      <p>
        <strong>Expected result.</strong> With <code>P</code> of 0.9 the three positions keep 4, 4, and 1 tokens where the
        top k kept 3, 3, 3: p1 reaches 0.950 at its fourth token and drops 0.050, p2 reaches 0.900 exactly at its fourth
        and drops 0.100, and p3&apos;s first token alone is 0.900, so it keeps one and its renormalized value is 1.000.
        The file ends with <code>OK</code>.
      </p>
      <details>
        <summary>Show the answer</summary>
        <CodeBlock filename="Practice answer" code={answerSnippet} />
        <p>
          The same pairs and the same sort, then a running total instead of a slice. The comparison uses{' '}
          <code>&gt;=</code>, so a position whose top tokens land exactly on <code>p</code>, like p2 at 0.900, stops there.
          Everything outside the marked region is the practice file unchanged.
        </p>
      </details>
    </>
  ),

  files: [
    { path: 'python/src/sparse_targets/solution.py', role: 'reference', language: 'python', source: solutionSource, primary: true,
      description: 'The complete worked example: the vocabulary, the three positions, the sort key, top_k_sparse, renormalize, dropped_mass, truncate_all, and a demonstration that prints each position, the mean dropped mass, the storage ratio, the rejected k, and OK. Runs alone with Python 3.11 or newer.' },
    { path: 'python/src/sparse_targets/starter.py', role: 'starter', language: 'python', source: starterSource, primary: true,
      description: 'The practice file: the worked solution with top_p_sparse accepting p but still keeping the top three, and a check for the new behavior. Prints NOT OK until the running mass decides how many to keep.' },
    { path: 'python/src/sparse_targets/practice_answer.py', role: 'reference', language: 'python', source: answerSource,
      description: 'The completed practice variation; the page shows the region between its answer markers.' },
    { path: 'python/fixtures/expected-output.txt', role: 'fixture', language: 'text', source: expectedOutput,
      description: 'What solution.py prints, byte for byte. The test runs the file alone and compares.' },
    { path: 'python/fixtures/expected-practice-output.txt', role: 'fixture', language: 'text', source: expectedPracticeOutput,
      description: 'What practice_answer.py prints, byte for byte.' },
    { path: 'python/tests/test_lesson.py', role: 'test', language: 'python', source: lessonTests,
      description: 'Runs the three lesson files alone, checks the sort order and its tie-break, the renormalized sums, the dropped mass, the rejected k, the top-p counts, pins the animation fixtures to the solution, and measures how far the stored targets sit from the teacher.' },
    { path: 'python/fixtures/positions.json', role: 'fixture', language: 'json', source: positionsFixture,
      description: 'The vocabulary, the three positions, k, and p exactly as the lesson files define them; the animation runs on this copy and a test pins it to the files.' },
  ],

  evidence: (
    <>
      <p>
        <strong>What the file checks</strong> before it prints <code>OK</code>: the tie at p2 goes to the lower index
        (indices 0, 1, 2 are kept), every renormalized triple sums to one within a billionth, and the dropped masses
        round to 0.150, 0.200, and 0.030. Run your copy and compare its output with the expected output above; they
        must match line for line.
      </p>
      <p>
        <strong>The failure case.</strong> The demonstration asks for a <code>k</code> of 7 from a six-token row, and{' '}
        <code>top_k_sparse</code> raises <code>ValueError</code> naming the allowed range, which the demonstration prints
        as the rejected line. A <code>k</code> of 0 raises the same way. The tests in the project download also check
        that the indices travel with their probabilities through the sort, that <code>k</code> equal to the vocabulary
        keeps everything, and that the input rows are never modified.
      </p>
      <p>
        <strong>What the truncation costs, measured.</strong> Because every kept token is scaled by the same factor, the
        KL divergence from the stored targets to the teacher is minus the log of the kept mass: 0.1625 at p1 (kept
        0.850), 0.2231 at p2 (kept 0.800), and 0.0305 at p3 (kept 0.970). The flat position loses the most and the
        confident one almost nothing, which is what the practice variation exploits. The other direction, from the
        teacher to the stored targets, has no finite value: the teacher gives mass to tokens the stored targets set to
        zero. Both facts are tests in the project download.
      </p>
    </>
  ),

  solution: (
    <>
      <p>
        Read the file top to bottom: the input, a key function, the one function that chooses, two small functions
        that renormalize and measure, a function that runs the three, and a demonstration. Here is its Python,
        construct by construct.
      </p>
      <ol>
        <li>
          <strong>Indices that travel with their values.</strong> <code>for index, prob in enumerate(probs):</code>{' '}
          yields a position number and the value at that position together, and{' '}
          <code>pairs.append((index, prob))</code> stores them as a two-element tuple. Once a probability is paired with
          its index, sorting can reorder the pairs freely and the index still says which token each value belongs to.
        </li>
        <li>
          <strong>A key function with a tuple.</strong> <code>pairs.sort(key=sort_key)</code> sorts the list in place,
          smallest key first, and <code>sort_key</code> returns <code>(-prob, index)</code>. Negating the probability
          makes the largest come first; tuples compare element by element, so two equal probabilities are ordered by
          the second element, the index. That is the whole tie-break: at p2, key and scope both have 0.3 and key, index
          0, comes first. <code>sort</code> returns <code>None</code>, so it is a statement, not an assignment;{' '}
          <code>sorted(pairs, key=sort_key)</code> would return a new list instead.
        </li>
        <li>
          <strong>Slicing the top k.</strong> <code>pairs[:k]</code> is a new list holding the first <code>k</code>{' '}
          elements; the sorted list itself is untouched. The guard above it,{' '}
          <code>if k &lt; 1 or k &gt; len(probs): raise ValueError(...)</code>, runs before any work so a bad request
          stops with a message naming the allowed range.
        </li>
        <li>
          <strong>Unpacking in a loop header.</strong> <code>for index, prob in sparse:</code> takes each two-element
          tuple apart into two names. <code>renormalize</code> uses it twice: once to add every probability into{' '}
          <code>kept_sum</code> with <code>+=</code>, then again to append <code>(index, prob / kept_sum)</code>. The
          division produces a float; the kept list is never changed, a new one is built.
        </li>
        <li>
          <strong>A set for membership.</strong> <code>dropped_mass</code> puts the kept indices into a set with{' '}
          <code>kept_indices.add(index)</code>, then walks the full row with <code>enumerate</code> again and adds the
          probability of every index that is <code>not in</code> the set. A set answers membership in constant time no
          matter how many tokens were kept, and measuring the dropped tokens directly means the function does not
          assume the teacher&apos;s row sums to exactly one.
        </li>
        <li>
          <strong>A dictionary per position.</strong> <code>truncate_all</code> builds one dictionary with four keys for
          each position, <code>{'{"id": ..., "kept": ..., "renormalized": ..., "dropped": ...}'}</code>, and appends it
          to <code>records</code>. The demonstration reads them with square brackets, as in{' '}
          <code>record[&quot;dropped&quot;]</code>.
        </li>
        <li>
          <strong>The demonstration.</strong> <code>zip(POSITIONS, records, strict=True)</code> walks the input and the
          results side by side and raises if their lengths ever differ. The inner loop zips the kept pairs with the
          renormalized pairs and unpacks both tuples in one header. Format specs line the table up:{' '}
          <code>{'{index:>5}'}</code> right aligns in five columns, <code>{'{VOCAB[index]:<7}'}</code> left aligns the
          token name, <code>{'{prob:>7.3f}'}</code> prints three decimals. <code>try</code> and{' '}
          <code>except ValueError</code> show the rejected request, and each <code>assert</code> checks one claim before{' '}
          <code>OK</code>.
        </li>
      </ol>
      <p><strong>Trace the variables.</strong> Follow the kept pairs, the kept sum, and the renormalized values through the three positions:</p>
      <table>
        <thead><tr><th>position</th><th>sorted pairs (index: token)</th><th>kept</th><th>kept sum</th><th>renormalized</th><th>dropped</th></tr></thead>
        <tbody>
          <tr><td>p1</td><td>0: key 0.5, 1: scope 0.2, 2: token 0.15, 3: secret 0.1, 4: api 0.03, 5: old 0.02</td><td>0, 1, 2</td><td>0.850</td><td>0.588, 0.235, 0.176</td><td>0.150</td></tr>
          <tr><td>p2</td><td>0: key 0.3, 1: scope 0.3 (tie, lower index first), 2: token 0.2, 3: secret 0.1, 4: api 0.05, 5: old 0.05</td><td>0, 1, 2</td><td>0.800</td><td>0.375, 0.375, 0.250</td><td>0.200</td></tr>
          <tr><td>p3</td><td>0: key 0.9, 1: scope 0.04, 2: token 0.03, 3: secret 0.02, 4: api 0.005, 5: old 0.005</td><td>0, 1, 2</td><td>0.970</td><td>0.928, 0.041, 0.031</td><td>0.030</td></tr>
        </tbody>
      </table>
      <p>
        At p1 the three kept probabilities sum to 0.85, so 0.5 becomes 0.5 divided by 0.85, which is 0.588, and the
        three new values sum to one again. At p3 the teacher was already sure: 0.9 becomes 0.928 and only 0.030 is
        dropped. The mean dropped mass over the three positions is 0.127, and each position is stored as three pairs
        instead of six probabilities; at the real vocabulary that is three pairs instead of thirty two thousand floats.
      </p>
      <p>
        <strong>Why these decisions.</strong> A fixed <code>k</code> gives every position the same storage footprint, so
        the targets fit a dense array of positions by <code>k</code> by two with no offsets. The tie-break by index is
        a policy: whichever rule you choose, it must be deterministic, or two ingest runs produce different targets
        for the same teacher. Renormalizing matters because the student&apos;s soft loss treats the stored row as a
        distribution; left unnormalized, a position that kept 0.80 of its mass would weigh less than one that kept
        0.97, for no reason the student should learn. The dropped mass is measured because it is the price of the
        truncation, and the evidence section shows it is the only number in the divergence from the teacher.
      </p>
      <p>
        <strong>The pattern, and its limits.</strong> Pair each value with its index, sort by a tuple key, slice, and
        renormalize what you kept: the same shape ranks retrieval candidates, keeps the best beams in a decoder, and
        stores sparse rows of any kind. Its limits: a fixed <code>k</code> wastes slots on confident positions and
        starves flat ones, which is what the practice variation changes; the tokens outside the top <code>k</code>{' '}
        receive zero mass, so the student is never told anything about them (mixing in the hard label or a small
        remainder bucket softens that); and at a real vocabulary a full sort per position is wasteful, so production
        code uses partial selection, <code>heapq.nlargest</code> in the standard library, to find the top{' '}
        <code>k</code> without ordering the rest.
      </p>
    </>
  ),

  visual: (
    <figure className="fig">
      <TopKTruncateViz />
      <figcaption className="fig-cap">
        <span className="fig-caption-text">
          The functions from the file, run on their own three positions at a reading pace: about three seconds per
          step, about half a minute in all. Each panel is one position with a bar per token at the teacher&apos;s
          probability. The three largest light up in rank order while the rest fade and the dropped mass is counted,
          then the kept bars grow to their renormalized values with the teacher&apos;s value left as a mark inside each
          one. The outro states the storage and the mean dropped mass, and the practice variation replays the three
          positions with the running mass climbing across the bars until it reaches 0.9. Step through with the
          buttons. The figure rests for two minutes before it plays again, and the motion setting in the site header
          can slow or stop it. Every value comes from the same functions run in the browser and is compared with the
          Python run.
        </span>
      </figcaption>
    </figure>
  ),

  tradeoffs: [
    {
      name: 'Store the full distribution (what shipped)',
      preferWhen: 'A small vocabulary or few positions, where the complete rows fit the disk and the loader without engineering: nothing is lost and no policy has to be chosen.',
      cost: 'One float per vocabulary entry per position: six here, thirty two thousand in production, terabytes at two million positions, almost all of it below 0.01. Loading those rows dominates each training step.',
    },
    {
      name: 'Top-k pairs, renormalized (this lesson)',
      preferWhen: 'The teacher is peaked at most positions and a fixed storage footprint per position matters: three pairs instead of a row, dense arrays, deterministic output.',
      cost: 'Tokens outside the top k get exactly zero, so the student learns nothing about them; a fixed k wastes slots where the teacher is sure (p3 keeps 0.97 with three) and starves flat positions (p2 drops 0.20). The practice variation, top-p, keeps as many as the mass needs at the price of variable-length rows.',
    },
    {
      name: 'Run the teacher during student training',
      preferWhen: 'The teacher is cheap relative to the student step, the corpus changes often, or the targets must stay exact over the whole vocabulary.',
      cost: 'A teacher forward pass for every example at every epoch, so the compute roughly doubles and the teacher must be served next to the trainer; nothing is stored, so nothing can be inspected or reused across runs.',
    },
  ],
};
