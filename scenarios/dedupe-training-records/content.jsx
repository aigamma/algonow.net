import DedupeViz from './visuals/DedupeViz.jsx';
import solutionSource from './python/src/dedupe_records/solution.py?raw';
import starterSource from './python/src/dedupe_records/starter.py?raw';
import answerSource from './python/src/dedupe_records/practice_answer.py?raw';
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
        Orbit&apos;s fine-tuning set was exported from the ticket system over six months. The same question appears
        dozens of times with different capitalization, spacing, and trailing punctuation, so the model learned a
        few answers by heart and little else. Worse, three of the evaluation questions are in the training set
        verbatim, so the evaluation score was a lie: the model was reciting, not answering.
      </p>
      <p>
        <strong>The action to practice:</strong> turn each prompt into a normalized key, keep the first record per
        key, name every record you drop, and report which evaluation prompts have a twin in the training set. The
        rules are small:
      </p>
      <ul>
        <li>The key is the prompt lowercased, with only letters, digits, and spaces kept, and every run of whitespace collapsed to one space.</li>
        <li>The first record with a key is kept; a later record with the same key is dropped, and the drop names the kept id it duplicates.</li>
        <li>Kept records are the original dictionaries, in input order; nothing is edited or copied.</li>
        <li>A record with no prompt, or a prompt that normalizes to nothing, raises a <code>ValueError</code> naming the id.</li>
        <li>The worked example reports evaluation overlap; removing it is the practice variation.</li>
      </ul>
      <p>
        <strong>Input.</strong> Eight records, inline as a list of dictionaries, and three evaluation prompts. The
        keys decide everything:
      </p>
      <table>
        <thead><tr><th>id</th><th>prompt</th><th>key</th><th>decision</th></tr></thead>
        <tbody>
          <tr><td>r1</td><td>How do I rotate a key?</td><td>how do i rotate a key</td><td>kept</td></tr>
          <tr><td>r2</td><td>Which scope do list calls need?</td><td>which scope do list calls need</td><td>kept</td></tr>
          <tr><td>r3</td><td>Can a lost key be recovered?</td><td>can a lost key be recovered</td><td>kept</td></tr>
          <tr><td>r4</td><td>how do i rotate a key</td><td>how do i rotate a key</td><td>duplicates r1</td></tr>
          <tr><td>r5</td><td>Where do I find my invoice?</td><td>where do i find my invoice</td><td>kept</td></tr>
          <tr><td>r6</td><td>which scope do LIST calls need</td><td>which scope do list calls need</td><td>duplicates r2</td></tr>
          <tr><td>r7</td><td>How do I rotate a key ?</td><td>how do i rotate a key</td><td>duplicates r1</td></tr>
          <tr><td>r8</td><td>What does the write scope add?</td><td>what does the write scope add</td><td>kept</td></tr>
        </tbody>
      </table>
      <p>
        The evaluation prompts are &quot;which scope do list calls need&quot;, &quot;How is usage billed?&quot;, and
        &quot;Where do I find my invoice?&quot;; the first and third share a key with r2 and r5.
      </p>
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
        Change one behavior. The worked solution reports which kept records have a twin among the evaluation
        prompts and leaves them in. Make <code>dedupe</code> remove them: a record whose key is among the
        normalized evaluation keys is dropped as an evaluation overlap, reported separately from the duplicates,
        and never kept. The file below is the worked solution with <code>eval_prompts</code> passed in but unused,
        and a check for the new behavior. As shipped it prints <code>NOT OK</code> and stops.
      </p>
      <p>
        <strong>Hint.</strong> Build a set of the evaluation keys before the loop, one <code>normalize</code> call
        per prompt and one <code>add</code>. Inside the loop, right after the key is computed, test membership with{' '}
        <code>in</code>, append the id to <code>overlaps</code>, and <code>continue</code>. The duplicate rule stays
        exactly as it is.
      </p>
      <p>
        <strong>Expected result.</strong> Three kept (r1, r3, r8), two duplicates dropped (r4 and r7, both twins of
        r1), and three overlaps removed: r2, r5, and r6, whose key is r2&apos;s. The file ends with <code>OK</code>.
      </p>
      <details>
        <summary>Show the answer</summary>
        <pre><code>{answerSnippet}</code></pre>
        <p>
          The overlap test runs before the duplicate test on purpose: r6 shares r2&apos;s key, and since r2 was
          never kept there is nothing for r6 to duplicate, so it is an overlap too. A second set holds the
          evaluation keys, and membership in it is one <code>in</code> test per record. Everything outside the
          marked region is the practice file unchanged.
        </p>
      </details>
    </>
  ),

  files: [
    { path: 'python/src/dedupe_records/solution.py', role: 'reference', language: 'python', source: solutionSource, primary: true,
      description: 'The complete worked example: the eight records, the evaluation prompts, normalize, dedupe, evaluation_overlap, and a demonstration that prints the kept and dropped records, the overlap, the rejected record, and OK. Runs alone with Python 3.11 or newer.' },
    { path: 'python/src/dedupe_records/starter.py', role: 'starter', language: 'python', source: starterSource, primary: true,
      description: 'The practice file: the worked solution with the evaluation prompts passed into dedupe but unused, and a check for the new behavior. Prints NOT OK until dedupe removes the records that overlap the evaluation set.' },
    { path: 'python/src/dedupe_records/practice_answer.py', role: 'reference', language: 'python', source: answerSource,
      description: 'The completed practice variation; the page shows the region between its answer markers.' },
    { path: 'python/fixtures/expected-output.txt', role: 'fixture', language: 'text', source: expectedOutput,
      description: 'What solution.py prints, byte for byte. The test runs the file alone and compares.' },
    { path: 'python/fixtures/expected-practice-output.txt', role: 'fixture', language: 'text', source: expectedPracticeOutput,
      description: 'What practice_answer.py prints, byte for byte.' },
    { path: 'python/tests/test_lesson.py', role: 'test', language: 'python', source: lessonTests,
      description: 'Runs the three lesson files alone and checks the normalization at its edges, the first-wins rule, the overlap report, the rejected records, the practice removal, the exact-string dedupe that shipped, and pins the animation fixtures to the solution.' },
    { path: 'python/fixtures/records.json', role: 'fixture', language: 'json', source: recordsFixture,
      description: 'The eight records and the three evaluation prompts exactly as the lesson files define them; the animation runs on this copy and a test pins it to the files. The trace fixture it replays ships in the project download.' },
  ],

  evidence: (
    <>
      <p>
        <strong>What the file checks</strong> before it prints <code>OK</code>: five kept and three dropped, every
        drop naming its twin (r4 and r7 duplicate r1, r6 duplicates r2), and two evaluation prompts with a twin.
        Run your copy and compare its output with the expected output above; they must match line for line.
      </p>
      <p>
        <strong>The failure case.</strong> A record whose prompt is <code>&quot;???&quot;</code> normalizes to an
        empty string, so <code>dedupe</code> raises <code>ValueError</code> naming the record, and the demonstration
        prints the rejected line. A record with no prompt key at all raises the same way. The tests in the project
        download also feed <code>normalize</code> tabs, a newline, repeated spaces, and a colon after an error code:
        whitespace runs collapse to one space, the digits survive, and the punctuation does not.
      </p>
      <p>
        <strong>What shipped, on the same records.</strong> A set of the raw prompts has eight members, because
        every spelling differs, so exact-string dedupe dropped nothing. The same exact comparison finds only one
        evaluation twin, the verbatim &quot;Where do I find my invoice?&quot;, and misses &quot;which scope do list
        calls need&quot; because the training spelling has a capital and a question mark. Normalized keys collapse
        the eight records to five and find both twins. Both measurements are tests in the project download.
      </p>
    </>
  ),

  solution: (
    <>
      <p>
        Read the file top to bottom: the input, a function that makes the key, the one function that does the
        work, a function for the overlap report, and a demonstration. Here is its Python, construct by construct.
      </p>
      <ol>
        <li>
          <strong>Lowercase first.</strong> <code>text.lower()</code> returns a new string with every letter in lower
          case; strings are never changed in place. It is the first of three steps, and the order matters: the
          character test below sees the lowered text.
        </li>
        <li>
          <strong>Keep only some characters.</strong> <code>for char in lowered:</code> walks the string one
          character at a time. <code>char.isalnum()</code> is true for a letter or a digit and{' '}
          <code>char.isspace()</code> for a space, a tab, or a newline; <code>or</code> joins the two tests. A kept
          character is appended with <code>kept_chars = kept_chars + char</code>, building a new string each time,
          and punctuation simply never gets appended.
        </li>
        <li>
          <strong>Collapse the whitespace.</strong> <code>kept_chars.split()</code> with no argument splits on any
          run of whitespace and drops the empty pieces, so a double space, a tab, or a trailing space all
          disappear. <code>&quot; &quot;.join(...)</code> glues the pieces back with exactly one space between them.
          Three operations, and the three spellings of the key rotation question become one key.
        </li>
        <li>
          <strong>A dictionary from key to id.</strong> <code>first_id = {'{}'}</code> remembers, for each key, the id
          of the first record that produced it. <code>if key in first_id:</code> asks the dictionary whether it has
          that key, which is a constant-time lookup no matter how many records came before. It answers two
          questions at once: has this key been seen, and by which record.
        </li>
        <li>
          <strong>Two lists, one decision.</strong> A repeat appends the tuple{' '}
          <code>(record[&quot;id&quot;], first_id[key])</code> to <code>dropped</code> and <code>continue</code>s to
          the next record; a new key is stored with <code>first_id[key] = record[&quot;id&quot;]</code> and the
          record itself is appended to <code>kept</code>. The function returns both lists as a tuple, and the
          caller unpacks them with <code>kept, dropped = dedupe(RECORDS)</code>.
        </li>
        <li>
          <strong>The guards.</strong> <code>if &quot;prompt&quot; not in record:</code> tests whether a key exists in
          a dictionary. <code>raise ValueError(f&quot;...&quot;)</code> stops the function with a message that names
          the id. The empty-key guard runs after normalization, so <code>&quot;???&quot;</code> is caught as well.
        </li>
        <li>
          <strong>Sets and their intersection.</strong> <code>training_keys = set()</code> starts an empty set;{' '}
          <code>training_keys.add(key)</code> puts a key in, and a key that is added twice is still in once. The
          evaluation keys go into a second set the same way, and <code>training_keys &amp; eval_keys</code> is a
          new set holding only the keys in both. A set has no order, so the loop over the intersection may visit
          keys in any order; <code>sorted(overlap)</code> makes the report deterministic.
        </li>
        <li>
          <strong>The demonstration.</strong> <code>for dropped_id, kept_id in dropped:</code> unpacks each tuple
          into two names. <code>&quot;, &quot;.join(overlap)</code> prints a list of ids as one line, and{' '}
          <code>len(overlap)</code> counts them. <code>try</code> and <code>except ValueError as error</code> show the
          rejection without crashing, and each <code>assert</code> checks one claim before <code>OK</code>.
        </li>
      </ol>
      <p><strong>Trace the variables.</strong> Follow <code>first_id</code>, <code>kept</code>, and <code>dropped</code> through the eight records:</p>
      <table>
        <thead><tr><th>record</th><th>key</th><th>in first_id?</th><th>result</th><th>kept</th><th>dropped</th></tr></thead>
        <tbody>
          <tr><td>r1</td><td>how do i rotate a key</td><td>no</td><td>first_id gains the key; r1 kept</td><td>1</td><td>0</td></tr>
          <tr><td>r2</td><td>which scope do list calls need</td><td>no</td><td>r2 kept</td><td>2</td><td>0</td></tr>
          <tr><td>r3</td><td>can a lost key be recovered</td><td>no</td><td>r3 kept</td><td>3</td><td>0</td></tr>
          <tr><td>r4</td><td>how do i rotate a key</td><td>yes, r1</td><td>(r4, r1) dropped</td><td>3</td><td>1</td></tr>
          <tr><td>r5</td><td>where do i find my invoice</td><td>no</td><td>r5 kept</td><td>4</td><td>1</td></tr>
          <tr><td>r6</td><td>which scope do list calls need</td><td>yes, r2</td><td>(r6, r2) dropped</td><td>4</td><td>2</td></tr>
          <tr><td>r7</td><td>how do i rotate a key</td><td>yes, r1</td><td>(r7, r1) dropped</td><td>4</td><td>3</td></tr>
          <tr><td>r8</td><td>what does the write scope add</td><td>no</td><td>r8 kept</td><td>5</td><td>3</td></tr>
        </tbody>
      </table>
      <p>
        Then the overlap: the five kept keys form one set, the three normalized evaluation prompts another, and
        their intersection holds two keys, which map back to r2 and r5.
      </p>
      <p>
        <strong>Why these decisions.</strong> The records are normalized before they are compared because the
        duplicates were never byte-equal; a comparison of raw strings is the bug, not a shortcut. The first record
        wins because the rule is deterministic and auditable: anyone can rerun the file and get the same five.
        Every drop names its twin so the decision can be reviewed, record by record, instead of trusted. The
        overlap is reported rather than removed in the worked example because the evaluation set is someone
        else&apos;s artifact and the fix is a policy decision, which is exactly what the practice variation makes.
      </p>
      <p>
        <strong>The pattern, and its limits.</strong> Normalize to a key, then collapse with a set or a dictionary.
        The same shape deduplicates documents before they are embedded, merges user records across systems, and
        finds leakage between any two datasets. Its limits: it is exact after normalization, so a paraphrase
        survives, which takes embeddings or MinHash to catch; the normalization throws information away, and a
        case-sensitive code or a meaningful punctuation mark goes with it; and keeping the first record is a
        policy, not a judgment about which answer is best.
      </p>
    </>
  ),

  visual: (
    <figure className="fig">
      <DedupeViz />
      <figcaption className="fig-cap">
        <span className="fig-caption-text">
          The functions from the file, run on their own eight records at a reading pace: about two and a half
          seconds per record, about half a minute in all. Each prompt passes through the three stages of normalize
          in the middle box, and its key either lands in the set of keys seen as a new row or links back to the
          row it duplicates. Then the three evaluation prompts are normalized and two of them link to kept keys,
          and the practice variation removes those records from the kept list. Step through with the buttons.
          The figure rests for two minutes before it plays again, and the motion setting in the site header can
          slow or stop it. Every key and decision comes from the same functions run in the browser and is
          compared with the Python run.
        </span>
      </figcaption>
    </figure>
  ),

  tradeoffs: [
    {
      name: 'Exact-string dedupe (what shipped)',
      preferWhen: 'Records produced by one program with one formatting rule, where two prompts that differ by a character really are different, such as generated ids or canonical commands.',
      cost: 'On the eight records it drops nothing, because every spelling differs, and it finds one of the two evaluation twins. Human-typed text is never byte-stable, so the set it builds measures spelling, not meaning.',
    },
    {
      name: 'Normalized-key dedupe (this lesson)',
      preferWhen: 'Human-written prompts, questions, or titles where case, spacing, and punctuation carry no meaning and a cheap, explainable key is enough.',
      cost: 'A paraphrase survives, so the same question in other words is two records. The normalization is a policy that must be written down, and a rare prompt whose meaning lives in its punctuation or capitals is merged by mistake.',
    },
    {
      name: 'Near-duplicate detection (MinHash or embeddings)',
      preferWhen: 'Large corpora with paraphrases and templated text, where the duplicates are semantic and the cost of a model or an index per record is justified.',
      cost: 'A similarity threshold to tune, false merges above it and misses below it, an index or an embedding call for every record, and results that are harder to explain than a key. It usually runs after a key-based pass, not instead of one.',
    },
  ],
};
