import CodeBlock from '../../src/components/CodeBlock.jsx';
import ShingleViz from './visuals/ShingleViz.jsx';
import solutionSource from './python/src/shingle_dedupe/solution.py?raw';
import starterSource from './python/src/shingle_dedupe/starter.py?raw';
import answerSource from './python/src/shingle_dedupe/practice_answer.py?raw';
import lessonTests from './python/tests/test_lesson.py?raw';
import expectedOutput from './python/fixtures/expected-output.txt?raw';
import expectedPracticeOutput from './python/fixtures/expected-practice-output.txt?raw';
import recordsFixture from './python/fixtures/records.json?raw';

// Authored by Claude Fable 5 in the main thread. Every number on this page was
// produced by running the files below; the expected outputs are the files'
// actual output, compared byte for byte by the tests.
const answerSnippet = answerSource.split('# --- answer begins ---\n')[1].split('# --- answer ends ---')[0].trim();

export const content = {
  brief: (
    <>
      <p>
        Orbit&apos;s fine-tuning set had already been deduplicated by exact normalized text, and the model still
        memorized: the same support answer appeared again and again with one word changed, a word added at the front,
        or a sentence dropped. Exact matching, even after lowercasing and trimming, sees five different strings. The
        training loop saw one answer three times.
      </p>
      <p>
        <strong>The action to practice:</strong> compare records by their word shingles and score each pair with
        Jaccard similarity. The rules fit in four sentences:
      </p>
      <ul>
        <li>Normalize each text into words: lowercase, punctuation stripped, split on whitespace.</li>
        <li>A record&apos;s shingles are every run of three consecutive words, each run a tuple, collected in a set. Fifteen words give thirteen shingles.</li>
        <li>Jaccard similarity is the shingles two records share divided by the shingles either one has: 1.0 for the same text, 0.0 for nothing in common.</li>
        <li>Walk the records in order and keep each one unless its best match among the records already kept scores at or above the threshold; then it is dropped as a near-duplicate of that match. A record too short to have a shingle raises a <code>ValueError</code>.</li>
      </ul>
      <p>
        <strong>Input.</strong> Five records, inline as a list of dictionaries with an id and a text, a shingle size of
        3, and a threshold of 0.50:
      </p>
      <table>
        <thead><tr><th>id</th><th>text</th></tr></thead>
        <tbody>
          <tr><td>r1</td><td>Restart the worker, then set the timeout to thirty seconds and confirm the alert clears.</td></tr>
          <tr><td>r2</td><td>Restart the worker, then set the timeout to thirty seconds and check the alert clears.</td></tr>
          <tr><td>r3</td><td>Rotate the API key from the billing page and update the gateway secret.</td></tr>
          <tr><td>r4</td><td>Please restart the worker, then set the timeout to thirty seconds and confirm the alert clears.</td></tr>
          <tr><td>r5</td><td>Set the timeout to thirty seconds.</td></tr>
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
        Change one behavior. Word shingles punish a single changed word three times over, because the word sits in
        three consecutive shingles: one edit in a fifteen-word answer costs three of its thirteen shingles. Character
        shingles are gentler and also survive typos. The file below is the worked solution with a shingle size of 5
        and the word version of <code>shingles</code> still in place. As shipped the file prints <code>NOT OK</code>{' '}
        and stops.
      </p>
      <p>
        <strong>Hint.</strong> Join the normalized words with a single space to get one string. A string slice from{' '}
        <code>start</code> to <code>start + size</code> is a window of characters, and a string can go straight into a
        set. Loop <code>start</code> over <code>range(len(joined) - size + 1)</code>, exactly like the word version.
      </p>
      <p>
        <strong>Expected result.</strong> r1 has 79 character shingles instead of 13 word shingles, and the similarity
        of r1 and r2 rises from 0.62 to 0.79, because the changed word sits in three of r1&apos;s thirteen word shingles
        but in only ten of its seventy-nine character shingles. The same three records are kept. The file prints the
        pair table, the decisions, the rejected short record, and <code>OK</code>.
      </p>
      <details>
        <summary>Show the answer</summary>
        <CodeBlock filename="Practice answer" code={answerSnippet} />
        <p>
          The only change is the unit of the window: a slice of a string instead of a slice of a list, and no{' '}
          <code>tuple</code> call, because a string is already hashable. Joining with single spaces means the windows
          cross word boundaries the same way for every record, so spacing in the original never matters. Notice that
          every similarity moved: the near-duplicates rose, and the unrelated pairs rose from 0.00 to a few hundredths,
          because short character runs such as &quot;the &quot; appear in every English sentence. Everything outside the
          marked region is the practice file unchanged.
        </p>
      </details>
    </>
  ),

  files: [
    { path: 'python/src/shingle_dedupe/solution.py', role: 'reference', language: 'python', source: solutionSource, primary: true,
      description: 'The complete worked example: the five records, words_of, shingles, jaccard, near_duplicates, and a demonstration that prints every pair, the decisions, the rejected short record, and OK. Runs alone with Python 3.11 or newer.' },
    { path: 'python/src/shingle_dedupe/starter.py', role: 'starter', language: 'python', source: starterSource, primary: true,
      description: 'The practice file: the worked solution with a shingle size of 5 and the word version of shingles still in place. Prints NOT OK until shingles slides a window of characters.' },
    { path: 'python/src/shingle_dedupe/practice_answer.py', role: 'reference', language: 'python', source: answerSource,
      description: 'The completed practice variation; the page shows the region between its answer markers.' },
    { path: 'python/fixtures/expected-output.txt', role: 'fixture', language: 'text', source: expectedOutput,
      description: 'What solution.py prints, byte for byte. The test runs the file alone and compares.' },
    { path: 'python/fixtures/expected-practice-output.txt', role: 'fixture', language: 'text', source: expectedPracticeOutput,
      description: 'What practice_answer.py prints, byte for byte.' },
    { path: 'python/tests/test_lesson.py', role: 'test', language: 'python', source: lessonTests,
      description: 'Runs the three lesson files alone, checks the normalized words, the shingle sets, every similarity as an exact fraction with inclusion-exclusion, the decisions and how threshold and order change them, the rejected input, the practice character windows, and what exact matching missed; pins the animation fixtures to the solution.' },
    { path: 'python/fixtures/records.json', role: 'fixture', language: 'json', source: recordsFixture,
      description: 'The five records, the shingle size, the threshold, and the practice size exactly as the lesson files define them; the animation runs on this copy and a test pins it to the files.' },
  ],

  evidence: (
    <>
      <p>
        <strong>What the file checks</strong> before it prints <code>OK</code>: the decisions kept, dropped, kept,
        dropped, kept; both dropped records tracing back to r1; thirteen shingles for r1; and a similarity of exactly
        1.0 for r1 against itself. Run your copy and compare its output with the expected output above; they must match
        line for line.
      </p>
      <p>
        <strong>The failure cases.</strong> The demonstration feeds <code>near_duplicates</code> a two-word record,
        which has no three-word shingle and would otherwise divide by zero in the similarity; it raises a{' '}
        <code>ValueError</code> that the demonstration prints as a rejected line naming the record. The tests in the
        project download also check that an empty list gives no decisions, that the input list is unchanged, that a
        threshold of 0.95 keeps even r4 at 0.93, that a threshold of 0.3 also drops the fragment r5, and that walking
        the records in reverse keeps r4 and drops r1: the first copy seen is the one that survives, so order decides.
      </p>
      <p>
        <strong>What shipped, on the same records.</strong> Exact matching after normalization kept all five, because
        no two texts are identical. Shingle Jaccard drops r2 at 0.62 and r4 at 0.93, both near-copies of r1, and keeps
        three. The fragment r5 shares four shingles with r1 but only 4 of the 13 in the union, 0.31, so it stays, and
        the unrelated r3 scores 0.00 against everything. Every similarity in the table is also rebuilt in the tests as
        an exact fraction, and the union is checked against the count of each set minus the shared count. All three
        measurements are tests in the project download.
      </p>
    </>
  ),

  solution: (
    <>
      <p>
        Read the file top to bottom: the five records and two settings, three small functions, one function that walks
        the records, and a demonstration. Here is its Python, construct by construct.
      </p>
      <ol>
        <li>
          <strong>Normalizing words.</strong> <code>text.lower().split()</code> lowercases and splits on whitespace.
          Inside, a second loop builds each word one character at a time: <code>word += character</code> appends only
          when <code>character.isalnum()</code> is true, so <code>&quot;worker,&quot;</code> becomes{' '}
          <code>&quot;worker&quot;</code>. A word that was all punctuation ends up empty and is skipped.
        </li>
        <li>
          <strong>Shingles as tuples in a set.</strong> <code>range(len(words) - size + 1)</code> gives every start
          position that still has <code>size</code> words after it; the plus one is because a run can start at the
          very last valid position. <code>tuple(words[start:start + size])</code> turns the slice into a tuple, which
          can go into a set; a list cannot, because it can change. <code>found.add(...)</code> ignores a repeated run,
          so a phrase that occurs twice counts once.
        </li>
        <li>
          <strong>Jaccard in one line.</strong> <code>a &amp; b</code> is the intersection of two sets and{' '}
          <code>a | b</code> their union; <code>len</code> counts each. The ratio is 1.0 when the sets are equal and 0.0
          when they share nothing. It is symmetric: the order of the two sets does not matter.
        </li>
        <li>
          <strong>The walk with a best-so-far search.</strong> <code>kept</code> is a list of <code>(id, shingles)</code>{' '}
          pairs created before the loop. For each record, two variables, <code>best_id</code> starting at{' '}
          <code>None</code> and <code>best</code> at 0.0, track the closest kept record; the inner loop header{' '}
          <code>for kept_id, other in kept:</code> unpacks each pair. <code>if score &gt; best:</code> keeps the maximum.
          After the inner loop, <code>best &gt;= threshold</code> decides: dropped with the match recorded, or kept and
          appended to <code>kept</code> so later records can match it.
        </li>
        <li>
          <strong>The guard.</strong> <code>if not own: raise ValueError(...)</code> fires when a record has no
          shingles. An empty set is false in a condition, which is what <code>not own</code> tests. Without the guard the
          first comparison would divide by zero inside <code>jaccard</code> with an unhelpful message.
        </li>
        <li>
          <strong>Every pair once.</strong> The demonstration nests <code>for j in range(i + 1, len(RECORDS))</code>{' '}
          inside <code>for i in range(len(RECORDS))</code>: j always runs ahead of i, so r1 with r2 is printed and r2
          with r1 is not, and a record is never compared with itself. Five records give ten pairs.
        </li>
        <li>
          <strong>Formatting.</strong> The flag is a conditional expression, a string or an empty string chosen inline.{' '}
          <code>{'{score:7.2f}'}</code> prints two decimals right-aligned in seven columns, and the pair label is padded
          with <code>{'{pair:<7}'}</code> so the columns line up under the header. The decision loop unpacks each
          four-value tuple in its header.
        </li>
      </ol>
      <p><strong>Trace the walk.</strong> Follow <code>kept</code> and the best match as each record arrives:</p>
      <table>
        <thead><tr><th>record</th><th>kept so far</th><th>best match</th><th>decision</th></tr></thead>
        <tbody>
          <tr><td>r1</td><td>nothing</td><td>none, 0.00</td><td>kept</td></tr>
          <tr><td>r2</td><td>r1</td><td>r1 at 10/16 = 0.62</td><td>dropped, near-duplicate of r1</td></tr>
          <tr><td>r3</td><td>r1</td><td>r1 at 0/24 = 0.00</td><td>kept</td></tr>
          <tr><td>r4</td><td>r1, r3</td><td>r1 at 13/14 = 0.93</td><td>dropped, near-duplicate of r1</td></tr>
          <tr><td>r5</td><td>r1, r3</td><td>r1 at 4/13 = 0.31</td><td>kept</td></tr>
        </tbody>
      </table>
      <p>
        r2 differs from r1 by one word, confirm against check, and that word sits in three consecutive shingles, so
        the two records share 10 of their 13 each; the union is 13 + 13 − 10 = 16. r4 is r1 with &quot;Please&quot; in
        front: it holds all 13 of r1&apos;s shingles plus one new one, 13 shared of 14. r5 is a fragment whose four
        shingles are all in r1, but 4 of 13 in the union is only 0.31. Notice that r2 and r4 also score 0.59 against
        each other; both are near-copies of the same original, and the walk assigns each to r1 because r1 was kept
        first.
      </p>
      <p>
        <strong>Why these decisions.</strong> Shingles rather than bags of words because order matters: a sentence that
        reuses the same words in a different order is a different answer, and three-word runs encode the order. Three
        is the customary size for short texts; long documents use five to nine. The walk keeps the first copy seen and
        compares only against kept records, which is what makes the result a set of groups each with one survivor,
        at the price that order decides which copy survives. The threshold of 0.50 separates the edits (0.62, 0.93)
        from the fragment (0.31) on this data; in practice it is tuned on a sample of pairs read by a person.
      </p>
      <p>
        <strong>The pattern, and its limits.</strong> A set of fixed-size windows per record and a set similarity
        between every pair is the standard shape for near-duplicate detection, plagiarism checks, and clustering short
        texts. Its limits: comparing every pair is quadratic, fine for thousands of records and hopeless for millions,
        where MinHash signatures and locality-sensitive hashing approximate the same Jaccard in near-linear time; the
        shingle size trades sensitivity for precision; and a paraphrase that shares no three-word run, reboot the
        worker instead of restart the worker, is invisible to shingles and needs embeddings.
      </p>
    </>
  ),

  visual: (
    <figure className="fig">
      <ShingleViz />
      <figcaption className="fig-cap">
        <span className="fig-caption-text">
          The functions from the file, run on their own five records at a reading pace: under two seconds per pair and
          about thirty-five seconds in all. The records sit on the left with their word and shingle counts. Each beat
          scores one pair: both records light up, a panel on the right shows the two shingle counts, the shared count,
          and the division, and the pair&apos;s cell in the matrix fills with the similarity, red when it reaches the
          threshold. Then the walk marks each record kept or dropped with the match it traces to. The practice variation
          switches the counts and the matrix to character shingles. Step through with the buttons. The figure rests for
          two minutes before it plays again, and the motion setting in the site header can slow or stop it. Every count
          and similarity comes from the same functions run in the browser and is compared with the Python run.
        </span>
      </figcaption>
    </figure>
  ),

  tradeoffs: [
    {
      name: 'Exact match after normalization (what shipped)',
      preferWhen: 'Duplicates are literal copies, exports and merges that repeat whole records: one normalized key per record, a set of seen keys, linear time, nothing to tune.',
      cost: 'A single changed, added, or dropped word defeats it. On these five records it removed nothing, and the model trained on three copies of one answer.',
    },
    {
      name: 'Word shingles and Jaccard (this lesson)',
      preferWhen: 'Near-copies with small edits must be caught and the set is thousands of records, not millions: three-word runs encode order, Jaccard gives a similarity a person can read, and the walk leaves one survivor per group.',
      cost: 'Every pair is compared, which is quadratic; at scale the same similarity is estimated with MinHash signatures and locality-sensitive hashing. The threshold and the shingle size need tuning on read samples, and the first copy seen is the one kept, so order decides.',
    },
    {
      name: 'Embedding similarity',
      preferWhen: 'The duplicates are paraphrases, reboot the worker against restart the worker, that share no word runs: cosine similarity between embeddings sees meaning, and a vector index finds near neighbours without comparing every pair.',
      cost: 'An embedding call per record and an index to maintain, a threshold with no simple reading, and false positives on answers that are similar in topic but different in instruction, exactly the pairs a training set should keep apart.',
    },
  ],
};
