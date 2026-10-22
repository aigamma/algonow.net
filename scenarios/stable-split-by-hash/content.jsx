import CodeBlock from '../../src/components/CodeBlock.jsx';
import StableSplitViz from './visuals/StableSplitViz.jsx';
import solutionSource from './python/src/stable_split/solution.py?raw';
import starterSource from './python/src/stable_split/starter.py?raw';
import answerSource from './python/src/stable_split/practice_answer.py?raw';
import lessonTests from './python/tests/test_lesson.py?raw';
import expectedOutput from './python/fixtures/expected-output.txt?raw';
import expectedPracticeOutput from './python/fixtures/expected-practice-output.txt?raw';
import transcriptsFixture from './python/fixtures/transcripts.json?raw';
import traceFixture from './python/fixtures/expected-trace.json?raw';

// Authored by Claude Fable 5 in the main thread. Every number on this page was
// produced by running the files below; the expected outputs are the files'
// actual output, compared byte for byte by the tests.
const answerSnippet = answerSource.split('# --- answer begins ---\n')[1].split('# --- answer ends ---')[0].trim();

export const content = {
  brief: (
    <>
      <p>
        Orbit fine-tunes a small support model on transcripts. New transcripts arrive every week, and the training
        job used to shuffle everything and cut the first fifth off as validation. Each week the shuffle dealt a
        different hand: a transcript scored in validation this week had been trained on last week, and the validation
        numbers jumped for reasons that had nothing to do with the model.
      </p>
      <p>
        <strong>The action to practice:</strong> give each record a side from a hash of its id, so the same id lands
        on the same side on every machine, every run, no matter what else is in the set. The rules are small:
      </p>
      <ul>
        <li>A record&apos;s bucket is the SHA-256 of its id, first eight hex digits read as a number, modulo 100: a value from 0 to 99.</li>
        <li>A bucket below the validation share (20) means validation; anything else means train.</li>
        <li>The result is a dictionary with two lists, in input order. A duplicate or empty id is rejected with a <code>ValueError</code>.</li>
        <li>Python&apos;s built-in <code>hash()</code> is salted per process and must never be used for this. The practice variation adds a third side.</li>
      </ul>
      <p>
        <strong>Input.</strong> Six transcript ids in week one and two more in week two, written inline. The buckets
        decide everything:
      </p>
      <table>
        <thead><tr><th>id</th><th>week</th><th>sha256 starts</th><th>bucket</th><th>side</th></tr></thead>
        <tbody>
          <tr><td>t-1813</td><td>1</td><td>778f7950</td><td>8</td><td>validation</td></tr>
          <tr><td>t-1814</td><td>1</td><td>1a2f9e64</td><td>56</td><td>train</td></tr>
          <tr><td>t-1815</td><td>1</td><td>aa34f6fb</td><td>19</td><td>validation</td></tr>
          <tr><td>t-1816</td><td>1</td><td>392f2e94</td><td>28</td><td>train</td></tr>
          <tr><td>t-1817</td><td>1</td><td>48d23446</td><td>94</td><td>train</td></tr>
          <tr><td>t-1818</td><td>1</td><td>f7b19930</td><td>40</td><td>train</td></tr>
          <tr><td>t-1819</td><td>2</td><td>5f0e5283</td><td>47</td><td>train</td></tr>
          <tr><td>t-1820</td><td>2</td><td>dc37b5ab</td><td>7</td><td>validation</td></tr>
        </tbody>
      </table>
      <p>
        <strong>Expected output.</strong> <code>python solution.py</code> prints exactly this, including the seeded
        shuffle that shipped, run on the same ids for comparison. The file holds its own input, so nothing else is
        needed:
      </p>
      <pre className="expected-output"><code>{expectedOutput}</code></pre>
    </>
  ),

  starter: (
    <>
      <p>
        Change one behavior. The worked solution has two sides. Add a third, a test set that is never touched until
        the end: buckets below <code>TEST_SHARE</code> (10) are test, buckets below{' '}
        <code>TEST_SHARE + VALIDATION_SHARE</code> (30) are validation, and the rest are train. The file below is the
        worked solution with the eight ids, a third list in the dictionary, and a check for the new behavior. As
        shipped it prints <code>NOT OK</code> and stops.
      </p>
      <p>
        <strong>Hint.</strong> Only <code>side_of</code> changes. It already receives <code>test_share</code> and
        ignores it. Compute the bucket once, compare it against the two thresholds in order, smallest first, and
        return <code>&quot;test&quot;</code>, <code>&quot;validation&quot;</code>, or <code>&quot;train&quot;</code>.{' '}
        <code>assign</code> already has a list for each side.
      </p>
      <p>
        <strong>Expected result.</strong> Test t-1813 and t-1820, validation t-1815 and t-1816, train t-1814, t-1817,
        t-1818, and t-1819. Nothing is re-hashed: t-1816 (bucket 28) moves from train to validation only because the
        validation band widened to 30. The file ends with <code>OK</code>.
      </p>
      <details>
        <summary>Show the answer</summary>
        <CodeBlock filename="Practice answer" code={answerSnippet} />
        <p>
          One function. The bucket is computed once into <code>number</code>, and two <code>if</code> statements test
          it against the thresholds from the smallest up, each returning early; the last line is the default. Because
          the buckets did not change, the earlier two-way sides are still readable from this result: everything in
          test or validation here was below 30, and train is unchanged above it.
        </p>
      </details>
    </>
  ),

  files: [
    { path: 'python/src/stable_split/solution.py', role: 'reference', language: 'python', source: solutionSource, primary: true,
      description: 'The complete worked example: the eight ids, bucket, side_of, assign, the seeded shuffle for comparison, and a demonstration that prints both weeks, the shuffle, the rejected duplicate, and OK. Runs alone with Python 3.11 or newer.' },
    { path: 'python/src/stable_split/starter.py', role: 'starter', language: 'python', source: starterSource, primary: true,
      description: 'The practice file: the worked solution with a third side and a check for the new behavior. Prints NOT OK until side_of returns test below the test share and validation below the two shares together.' },
    { path: 'python/src/stable_split/practice_answer.py', role: 'reference', language: 'python', source: answerSource,
      description: 'The completed practice variation; the page shows the region between its answer markers.' },
    { path: 'python/fixtures/expected-output.txt', role: 'fixture', language: 'text', source: expectedOutput,
      description: 'What solution.py prints, byte for byte. The test runs the file alone and compares.' },
    { path: 'python/fixtures/expected-practice-output.txt', role: 'fixture', language: 'text', source: expectedPracticeOutput,
      description: 'What practice_answer.py prints, byte for byte.' },
    { path: 'python/tests/test_lesson.py', role: 'test', language: 'python', source: lessonTests,
      description: 'Runs the three lesson files alone, pins the eight buckets, checks stability across weeks and across processes, the rejections, the strict thresholds, the seeded shuffle that shipped, and that the animation fixtures match the solution.' },
    { path: 'python/fixtures/transcripts.json', role: 'fixture', language: 'json', source: transcriptsFixture,
      description: 'The ids, the shares, and the seed exactly as the lesson files define them; the animation runs on this copy and a test pins it to the files.' },
    { path: 'python/fixtures/expected-trace.json', role: 'fixture', language: 'json', source: traceFixture,
      description: 'Every hash, bucket, and side for the eight ids, the stability check, the seeded shuffle results, and the three-way sides, derived from the Python files; the animation must replay it exactly.' },
  ],

  evidence: (
    <>
      <p>
        <strong>What the file checks</strong> before it prints <code>OK</code>: every id is on exactly one side, none of
        the six week-one ids changed side when week two was added, and the seeded shuffle did move one. Run your copy
        and compare its output with the expected output above; they must match line for line.
      </p>
      <p>
        <strong>The failure case.</strong> Assigning <code>[&quot;t-1813&quot;, &quot;t-1813&quot;]</code> raises{' '}
        <code>ValueError</code> naming the duplicate, and the demonstration catches it and prints the rejected line.
        An empty id is rejected the same way. The thresholds are strict: bucket 8 is train under a share of 8 and
        validation under a share of 9, and the tests pin all eight buckets to their exact integers.
      </p>
      <p>
        <strong>The same program in another process.</strong> The tests start fresh interpreters: the SHA-256 bucket
        of t-1813 is 8 in every one of them, while <code>hash(&quot;t-1813&quot;)</code> prints a different number each
        time, because Python salts string hashes per process. That is the whole reason the bucket is a SHA-256.
      </p>
      <p>
        <strong>The shuffle that shipped, on the same ids.</strong> With seed 7 and the same twenty percent, week one
        puts t-1817 in validation and week two puts t-1819 and t-1820 there, so t-1817 moves into training: the
        transcript the model is scored on this week was trained on last week. The hash split moves nothing. Both facts
        are measured by the tests in the project download.
      </p>
    </>
  ),

  solution: (
    <>
      <p>
        Read the file top to bottom: the input, three small functions, the shuffle kept for comparison, and a
        demonstration. Here is its Python, construct by construct.
      </p>
      <ol>
        <li>
          <strong>Two imports.</strong> <code>import hashlib</code> and <code>import random</code> bring in two
          standard-library modules; their functions are reached with a dot, as in <code>hashlib.sha256</code>. Nothing
          is installed.
        </li>
        <li>
          <strong>Text to bytes to digest.</strong> A hash function eats bytes, so{' '}
          <code>record_id.encode(&quot;utf-8&quot;)</code> turns the string into bytes first.{' '}
          <code>hashlib.sha256(...)</code> builds the hash and <code>.hexdigest()</code> returns it as sixty-four hex
          characters, a string.
        </li>
        <li>
          <strong>Slice, convert, reduce.</strong> <code>digest[:8]</code> is a slice: the first eight characters.{' '}
          <code>int(digest[:8], 16)</code> reads them as a base-sixteen number, up to about four billion. The modulo
          operator <code>% 100</code> keeps the remainder after dividing by 100, so the result is 0 to 99. Three
          operations, one line, and <code>bucket</code> is pure: the same id always gives the same number.
        </li>
        <li>
          <strong>A decision as a function.</strong> <code>side_of</code> compares the bucket with the share and
          returns a string. The early <code>return &quot;validation&quot;</code> inside the <code>if</code> means the
          last line runs only when the test failed, so no <code>else</code> is needed.
        </li>
        <li>
          <strong>A dictionary of lists.</strong> <code>sides = {'{'}&quot;train&quot;: [], &quot;validation&quot;: []{'}'}</code>{' '}
          starts two empty lists under two keys. The line{' '}
          <code>sides[side_of(record_id, validation_share)].append(record_id)</code> does two things: the function call
          inside the brackets produces the key, and <code>.append</code> adds the id to whichever list that key names.
          No branch is needed to choose the list; the key chooses it.
        </li>
        <li>
          <strong>Guards with <code>in</code>.</strong> <code>record_id in sides[&quot;train&quot;]</code> asks whether a
          list already contains the value. Two such checks joined by <code>or</code> catch a duplicate before it is
          appended, and <code>raise ValueError(f&quot;...&quot;)</code> stops the function with a message that names it.
          An empty string is rejected the same way, with <code>==</code>.
        </li>
        <li>
          <strong>The shuffle, for comparison.</strong> <code>list(ids)</code> makes a copy, so the caller&apos;s list is
          never reordered. <code>random.Random(seed)</code> is a generator with a fixed seed, and{' '}
          <code>.shuffle(order)</code> reorders the copy in place. <code>round(len(order) * share / 100)</code> turns
          the share into a count, <code>max(1, ...)</code> keeps it at least one, and <code>order[:count]</code> slices
          the front off as validation.
        </li>
        <li>
          <strong>The demonstration.</strong> <code>{'{'}bucket(record_id):2{'}'}</code> inside an f-string pads the
          number to two characters so the columns line up. <code>&quot;, &quot;.join(sorted(one))</code> sorts a list of
          strings and joins it with commas. The expression <code>(a in x) != (a in y)</code> compares two yes-or-no
          answers and is true when they differ, which is exactly what &quot;moved&quot; means. <code>try</code> and{' '}
          <code>except ValueError as error</code> catch the rejection, and each <code>assert</code> makes the file check
          one of its own claims before it prints <code>OK</code>.
        </li>
      </ol>
      <p><strong>Trace the values.</strong> Follow each id from its digest to its side:</p>
      <table>
        <thead><tr><th>id</th><th>week</th><th>digest[:8]</th><th>int(..., 16)</th><th>% 100</th><th>&lt; 20?</th><th>side</th></tr></thead>
        <tbody>
          <tr><td>t-1813</td><td>1</td><td>778f7950</td><td>2005891408</td><td>8</td><td>yes</td><td>validation</td></tr>
          <tr><td>t-1814</td><td>1</td><td>1a2f9e64</td><td>439328356</td><td>56</td><td>no</td><td>train</td></tr>
          <tr><td>t-1815</td><td>1</td><td>aa34f6fb</td><td>2855597819</td><td>19</td><td>yes</td><td>validation</td></tr>
          <tr><td>t-1816</td><td>1</td><td>392f2e94</td><td>959393428</td><td>28</td><td>no</td><td>train</td></tr>
          <tr><td>t-1817</td><td>1</td><td>48d23446</td><td>1221735494</td><td>94</td><td>no</td><td>train</td></tr>
          <tr><td>t-1818</td><td>1</td><td>f7b19930</td><td>4155611440</td><td>40</td><td>no</td><td>train</td></tr>
          <tr><td>t-1819</td><td>2</td><td>5f0e5283</td><td>1594774147</td><td>47</td><td>no</td><td>train</td></tr>
          <tr><td>t-1820</td><td>2</td><td>dc37b5ab</td><td>3694638507</td><td>7</td><td>yes</td><td>validation</td></tr>
        </tbody>
      </table>
      <p>
        Week two hashes only its two new ids. The six earlier rows are not recomputed, and could not come out
        differently if they were, which is why the demonstration prints &quot;unchanged&quot;.
      </p>
      <p>
        <strong>Why these decisions.</strong> The id is hashed rather than the content, so an edited transcript keeps
        its side; otherwise fixing a typo would move a record across the split. One hundred buckets make the share a
        whole percentage, and the first eight hex digits are plenty: thirty-two bits spread evenly over 100 buckets,
        with a bias too small to matter. SHA-256 is the choice because it is the same in every language, Python
        version, and machine, so the split can be reproduced from the ids alone by anyone; the built-in{' '}
        <code>hash()</code> exists for dictionaries and is deliberately randomized per process. Duplicates are rejected
        rather than merged because a duplicated id is a data bug upstream, and a loud failure at split time is cheaper
        than a quietly doubled record.
      </p>
      <p>
        <strong>The pattern, and its limits.</strong> This is stable assignment by content hash: the same rule picks
        the cohort for a feature flag, the canary slice of a rollout, and the shard that owns a cache key. Its limits
        here: the shares are approximate for small sets (two of six is a third, not a fifth; the balance settles over
        hundreds of records), the id must be the unit of leakage (when several records come from one conversation or
        one user, hash that id instead, or the sides share a source), and a hash does not stratify: if every outage
        transcript must be represented in validation, that is a separate rule layered on top.
      </p>
    </>
  ),

  visual: (
    <figure className="fig">
      <StableSplitViz />
      <figcaption className="fig-cap">
        <span className="fig-caption-text">
          The rule from the file, run on its own eight ids at a reading pace: about two and a half seconds per
          placement, about half a minute in all. Each id&apos;s digest is turned into its bucket in the caption and the
          id is carried onto the strip of one hundred buckets, with the validation band on the left; week two adds
          two ids and the six earlier ones stay where they are; then the seeded shuffle that shipped is shown for the
          same ids with its mover in red; finally the practice variation widens the bands into test, validation, and
          train. Step through with the buttons. The figure rests for two minutes before it plays again, and the motion
          setting in the site header can slow or stop it. The hashes are computed in the browser and checked against
          the Python run; the shuffle rows come from the Python run itself.
        </span>
      </figcaption>
    </figure>
  ),

  tradeoffs: [
    {
      name: 'A seeded shuffle (what shipped)',
      preferWhen: 'The dataset is frozen: one export, split once, never appended. With a fixed seed the split is reproducible for that exact list, and the shares are exact to the record.',
      cost: 'Any change to the list changes the deal. On the eight ids, seed 7 put t-1817 in validation in week one and in training in week two, so the model was scored on a transcript it had trained on. Reproducible is not the same as stable.',
    },
    {
      name: 'A stored split file',
      preferWhen: 'The assignment must be auditable or hand-curated: a reviewed list of ids per side, checked into the repository next to the data, so a reviewer can see exactly which records are held out.',
      cost: 'Someone has to maintain it as data arrives, merge it when two people add records at once, and keep it in sync with the data. A hash of the id is a stored split file that writes itself and can never be out of date.',
    },
    {
      name: 'A stratified or grouped split',
      preferWhen: 'Categories are rare and must be represented on both sides, or records share a source (one user, one conversation) that must not straddle the split.',
      cost: 'More code and a grouping key that has to be right. The grouped case still ends in this lesson: hash the group id instead of the record id, and every record of a group lands together. Stratifying needs the labels at split time and a rule for what balanced means.',
    },
  ],
};
