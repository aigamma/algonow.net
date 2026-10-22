import CodeBlock from '../../src/components/CodeBlock.jsx';
import JsonlValidationViz from './visuals/JsonlValidationViz.jsx';
import solutionSource from './python/src/jsonl_validation/solution.py?raw';
import starterSource from './python/src/jsonl_validation/starter.py?raw';
import answerSource from './python/src/jsonl_validation/practice_answer.py?raw';
import lessonTests from './python/tests/test_lesson.py?raw';
import expectedOutput from './python/fixtures/expected-output.txt?raw';
import expectedPracticeOutput from './python/fixtures/expected-practice-output.txt?raw';
import linesFixture from './python/fixtures/lines.json?raw';

// Authored by Claude Fable 5 in the main thread. Every number on this page was
// produced by running the files below; the expected outputs are the files'
// actual output, compared byte for byte by the tests.
const answerSnippet = answerSource.split('# --- answer begins ---\n')[1].split('# --- answer ends ---')[0].trim();

export const content = {
  brief: (
    <>
      <p>
        Orbit fine-tunes a small support model on an export of resolved conversations: a JSONL file, one JSON
        object per line, each with a <code>prompt</code> and an <code>answer</code>. Last night&apos;s job crashed
        on one malformed line a few thousand lines in. Someone deleted that line by hand and reran, and the job
        trained happily on a record with no answer key and on one whose answer was empty. The model it produced
        now answers some questions with nothing at all.
      </p>
      <p>
        <strong>The action to practice:</strong> validate the export line by line with a generator that hands out
        good records as it goes, names every bad line with its reason, and never stops. The rules are small:
      </p>
      <ul>
        <li>A blank line is skipped and not counted; a hand-edited file often ends with one.</li>
        <li>A line that does not parse is rejected as <code>malformed json</code>, and nothing else about it is checked.</li>
        <li>The parsed value must be an object with string keys <code>prompt</code> and <code>answer</code>, both non-empty after stripping whitespace, and the answer within 300 characters.</li>
        <li>Every rejection is recorded as a pair, the line&apos;s number and a reason, and the loop continues; a good record is yielded the moment it passes.</li>
      </ul>
      <p>
        <strong>Input.</strong> The export, inline as one multi-line string: eight records and a final empty line.
        What each line holds decides its fate:
      </p>
      <table>
        <thead><tr><th>line</th><th>what it holds</th><th>outcome</th></tr></thead>
        <tbody>
          <tr><td>1</td><td>How do I rotate a key? with a 115-character answer</td><td>kept</td></tr>
          <tr><td>2</td><td>Which scope do list calls need? with a 41-character answer</td><td>kept</td></tr>
          <tr><td>3</td><td>Why was I billed twice? but the closing brace is missing</td><td>rejected: malformed json</td></tr>
          <tr><td>4</td><td>Can a lost key be recovered? with a 74-character answer</td><td>kept</td></tr>
          <tr><td>5</td><td>How long does a hold last? with no answer key at all</td><td>rejected: missing answer</td></tr>
          <tr><td>6</td><td>What does the write scope add? with an empty answer</td><td>rejected: empty answer</td></tr>
          <tr><td>7</td><td>Where do I find my invoice? with a 49-character answer</td><td>kept</td></tr>
          <tr><td>8</td><td>What happens during rotation? with a 345-character answer</td><td>rejected: answer too long</td></tr>
          <tr><td>9</td><td>empty</td><td>skipped</td></tr>
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
        Change one behavior. The worked solution keeps every record that passes its checks, even when a prompt
        repeats an earlier one, and a fine-tuning set with the same question answered two ways teaches the model to
        guess. Make <code>validate</code> keep the first record for a prompt and reject a later repeat with the
        reason <code>duplicate prompt</code>, counted like any other rejection. The file below is the worked solution
        with a ninth line that repeats the prompt of line 1 with a different answer, and a check for the new
        behavior. As shipped it prints <code>NOT OK</code> and stops.
      </p>
      <p>
        <strong>Hint.</strong> A set remembers what has been seen: <code>seen = set()</code> before the loop,{' '}
        <code>if prompt in seen:</code> after the other checks have passed, and <code>seen.add(prompt)</code> just
        before the record is yielded. Three lines, all inside the generator.
      </p>
      <p>
        <strong>Expected result.</strong> 4 kept and 5 rejected, the last rejection being <code>line 9: duplicate
        prompt</code>, the record from line 1 still kept, and the file ends with <code>OK</code>.
      </p>
      <details>
        <summary>Show the answer</summary>
        <CodeBlock filename="Practice answer" code={answerSnippet} />
        <p>
          The new check sits after the others on purpose: a malformed or empty repeat is still reported for what
          it is, and only a record that would otherwise be kept counts as a duplicate. The set holds prompts, not
          whole records, so two different answers to one question are caught. Everything outside the marked region
          is the practice file unchanged.
        </p>
      </details>
    </>
  ),

  files: [
    { path: 'python/src/jsonl_validation/solution.py', role: 'reference', language: 'python', source: solutionSource, primary: true,
      description: 'The complete worked example: the nine-line export, the validate generator, and a demonstration that prints the counts, every rejection with its line, the tally by reason, the kept records, and OK. Runs alone with Python 3.11 or newer.' },
    { path: 'python/src/jsonl_validation/starter.py', role: 'starter', language: 'python', source: starterSource, primary: true,
      description: 'The practice file: the worked solution plus a ninth line that repeats the prompt of line 1, and a check for the new behavior. Prints NOT OK until validate rejects the repeat as a duplicate prompt.' },
    { path: 'python/src/jsonl_validation/practice_answer.py', role: 'reference', language: 'python', source: answerSource,
      description: 'The completed practice variation; the page shows the region between its answer markers.' },
    { path: 'python/fixtures/expected-output.txt', role: 'fixture', language: 'text', source: expectedOutput,
      description: 'What solution.py prints, byte for byte. The test runs the file alone and compares.' },
    { path: 'python/fixtures/expected-practice-output.txt', role: 'fixture', language: 'text', source: expectedPracticeOutput,
      description: 'What practice_answer.py prints, byte for byte.' },
    { path: 'python/tests/test_lesson.py', role: 'test', language: 'python', source: lessonTests,
      description: 'Runs the three lesson files alone and checks every rejection reason at its boundary, that the generator is lazy and never raises on content, the duplicate rule, and the unguarded and half-guarded readers that shipped, and pins the animation fixtures to the solution.' },
    { path: 'python/fixtures/lines.json', role: 'fixture', language: 'json', source: linesFixture,
      description: 'The nine lines, the answer limit, and the practice file\'s ten lines, exactly as the lesson files define them; the animation runs on this copy and a test pins it to the files. The trace fixture it replays ships in the project download.' },
  ],

  evidence: (
    <>
      <p>
        <strong>What the file checks</strong> before it prints <code>OK</code>: four records kept, four lines rejected,
        the rejected lines are 3, 5, 6, and 8, and the first kept record is the key rotation question. Run your copy
        and compare its output with the expected output above; they must match line for line.
      </p>
      <p>
        <strong>The failure cases.</strong> Line 3 is missing its closing brace, so <code>json.loads</code> raises{' '}
        <code>JSONDecodeError</code>; the generator catches it, records <code>(3, &quot;malformed json&quot;)</code>, and
        moves on. Line 5 parses but has no answer key, so <code>record.get(&quot;answer&quot;)</code> returns{' '}
        <code>None</code> and the <code>isinstance</code> test fails. Line 6 has an answer of <code>&quot;&quot;</code>, which
        strips to nothing. Line 8&apos;s answer is 345 characters against a limit of 300. The tests in the project
        download also feed the generator a JSON array, a bare number, <code>null</code>, a numeric prompt, a list
        answer, an empty object, garbage, and an unclosed brace: every one is rejected with a reason, and nothing
        raises. An answer of exactly 300 characters is kept and 301 is rejected. Consuming the generator one record
        at a time with <code>next</code> shows that line 3 is not even read until the loop asks for the record after
        line 2.
      </p>
      <p>
        <strong>What shipped, on the same lines.</strong> <code>json.loads</code> on every line with no guard parses
        two records and then raises on line 3; the remaining five lines are never read, which is the crash that
        cost the night. Guarding only the parse keeps 7 of the 8 records, and three of those have no usable answer:
        the missing key, the empty string, and the 345-character runaway. The repair keeps the four good ones and
        names the rest. Both measurements are tests in the project download.
      </p>
    </>
  ),

  solution: (
    <>
      <p>
        Read the file top to bottom: the input, one generator function that does the work, and a demonstration.
        Here is its Python, construct by construct.
      </p>
      <ol>
        <li>
          <strong>The export as one string.</strong> <code>LINES</code> is a triple-quoted string, which may span
          lines and contain quotes freely. <code>LINES.splitlines()</code> cuts it into a list of nine strings; the
          empty last line is the ninth. A real file is read the same way with{' '}
          <code>with open(path, encoding=&quot;utf-8&quot;) as file:</code> and <code>for line in file:</code>, which
          hands out one line at a time with its newline still attached, and the <code>strip</code> below handles
          that too.
        </li>
        <li>
          <strong>A generator.</strong> <code>validate</code> has a <code>yield</code> inside it, which makes it a
          generator function. Calling it runs nothing: it returns a generator object. Each time a{' '}
          <code>for</code> loop asks for the next record, the function runs until it reaches <code>yield</code>, hands
          that record out, and pauses there with all its variables intact. The rejections list is passed in by the
          caller and filled as the loop goes, so the caller sees both outputs: the records, one at a time, and the
          reasons.
        </li>
        <li>
          <strong>Numbered lines.</strong> <code>for number, line in enumerate(lines, start=1):</code> yields a pair on
          every pass, and the two names on the left of <code>in</code> unpack it. Counting from 1 makes the report
          match what an editor shows.
        </li>
        <li>
          <strong>Blank lines.</strong> <code>line.strip()</code> removes whitespace at both ends, including the
          newline a file leaves on. <code>if text == &quot;&quot;: continue</code> jumps to the next line without
          recording anything.
        </li>
        <li>
          <strong>Parsing with a guard.</strong> <code>json.loads(text)</code> turns the text into Python values. If
          the text is not valid JSON it raises <code>json.JSONDecodeError</code>, and the <code>except</code> clause
          catches exactly that type: <code>rejections.append((number, &quot;malformed json&quot;))</code> adds one
          pair (the inner parentheses build the tuple) and <code>continue</code> moves on.
        </li>
        <li>
          <strong>Shape checks.</strong> Valid JSON is not always an object: <code>[1, 2]</code> and{' '}
          <code>42</code> parse fine. <code>isinstance(record, dict)</code> keeps only dictionaries.{' '}
          <code>record.get(&quot;prompt&quot;)</code> returns the value or <code>None</code> when the key is missing,
          and <code>isinstance(prompt, str)</code> rejects both a missing key and a non-string in one test.
        </li>
        <li>
          <strong>Content checks, in order.</strong> Each later check assumes the earlier ones passed: strip the
          prompt and the answer and reject empties, then compare <code>len(answer)</code> with the limit. Every
          check ends with <code>continue</code>, so only a record that passes them all reaches{' '}
          <code>yield record</code>.
        </li>
        <li>
          <strong>The demonstration.</strong> <code>for record in validate(...)</code> drives the generator and{' '}
          <code>kept.append(record)</code> collects what it yields (<code>list(validate(...))</code> would do the
          same in one line). <code>Counter()</code> is a dictionary whose missing keys count as zero, so{' '}
          <code>by_reason[reason] += 1</code> needs no setup, and <code>most_common()</code> lists pairs by count,
          highest first, equal counts in first-seen order. <code>record[&apos;prompt&apos;]</code> inside an f-string
          uses single quotes because the string itself uses double ones.
        </li>
      </ol>
      <p><strong>Trace the variables.</strong> Follow <code>kept</code> and <code>rejections</code> through the nine lines:</p>
      <table>
        <thead><tr><th>line</th><th>checks</th><th>result</th><th>kept</th><th>rejections</th></tr></thead>
        <tbody>
          <tr><td>1</td><td>parses, object, both keys, non-empty, 115 ≤ 300</td><td>yield</td><td>1</td><td>0</td></tr>
          <tr><td>2</td><td>all pass, 41 ≤ 300</td><td>yield</td><td>2</td><td>0</td></tr>
          <tr><td>3</td><td>json.loads raises</td><td>(3, malformed json)</td><td>2</td><td>1</td></tr>
          <tr><td>4</td><td>all pass, 74 ≤ 300</td><td>yield</td><td>3</td><td>1</td></tr>
          <tr><td>5</td><td>parses, object, prompt ok, answer is None</td><td>(5, missing answer)</td><td>3</td><td>2</td></tr>
          <tr><td>6</td><td>parses, object, both keys, answer strips to empty</td><td>(6, empty answer)</td><td>3</td><td>3</td></tr>
          <tr><td>7</td><td>all pass, 49 ≤ 300</td><td>yield</td><td>4</td><td>3</td></tr>
          <tr><td>8</td><td>all pass until 345 &gt; 300</td><td>(8, answer too long)</td><td>4</td><td>4</td></tr>
          <tr><td>9</td><td>strips to empty</td><td>continue, nothing recorded</td><td>4</td><td>4</td></tr>
        </tbody>
      </table>
      <p>
        <strong>Why these decisions.</strong> The loop never stops on a bad line because one broken record must
        not cost a night: the job reads the whole export and reports. Every rejection carries a line&apos;s number
        and a reason so the report is something a person can act on: fix the exporter, or fix line 2,310. The
        function is a generator rather than a function that returns a list because an export can be larger than
        memory and because the training loader can start on the first record before the last is read. Blank
        lines are skipped without a word because they carry no information, and a report full of &quot;blank&quot;
        hides the real problems. The length limit is a policy, not a parser: a runaway answer is usually a pasted
        log, and a loud count is the right first response. The checks run in a fixed order because each one
        assumes the ones before it, which keeps every check a single line.
      </p>
      <p>
        <strong>The pattern, and its limits.</strong> Parse, check, count, yield is the shape of every ingestion step:
        loading documents for an embedding pipeline, reading an evaluation set, scanning logs for incidents. The
        reusable part is the generator with a rejections list beside it. Its limits: the checks are written by
        hand, so a new field means a new line of code where a schema library would take a declaration; nothing is
        coerced or repaired, a numeric prompt is rejected rather than converted; and duplicates are only caught
        exactly, after the practice variation, so two prompts that differ by a space both get through. Those are
        the next lessons, not this one.
      </p>
    </>
  ),

  visual: (
    <figure className="fig">
      <JsonlValidationViz />
      <figcaption className="fig-cap">
        <span className="fig-caption-text">
          The generator from the file, run on its own nine lines at a reading pace: about two and a half seconds
          per line, about half a minute in all. Each line is carried to the gate, the checks light up in order
          until one fails, and the line lands in the kept stack or the rejected stack with its reason while the
          tally counts by reason. The blank last line is skipped, and the practice variation then adds a ninth
          record that repeats a kept prompt and shows the new check catching it. Step through with the buttons.
          The figure rests for two minutes before it plays again, and the motion setting in the site header can
          slow or stop it. Every outcome and count comes from the same checks run in the browser and is compared
          with the Python run.
        </span>
      </figcaption>
    </figure>
  ),

  tradeoffs: [
    {
      name: 'Load everything, then filter',
      preferWhen: 'A small export that fits in memory many times over, read once by a script that nobody will run unattended, where the simplest code wins.',
      cost: 'The whole file sits in memory before the first record is usable, so a nightly export that grew past the box fails late and loudly, and the training loader cannot start until the last line is parsed. The same checks are needed either way; only the generator is given up.',
    },
    {
      name: 'A schema library (pydantic or jsonschema)',
      preferWhen: 'Records with many fields, nested structure, or types that must be coerced, where the rules change often and a declaration beats a chain of ifs.',
      cost: 'A dependency to pin, its error messages to translate into counts, and a learning curve for every reader of the pipeline. For two string fields and a length limit it replaces seven plain lines with a model class, and the line-by-line loop around it still has to be written.',
    },
    {
      name: 'Fail fast on the first bad line (what shipped)',
      preferWhen: 'A hand-edited configuration file, where one bad line means the person is still editing and nothing downstream should run.',
      cost: 'On a nightly export it turns one malformed line into a lost night and a manual repair, and a parse-only guard is worse still: it keeps records with no usable answer, which is how the model learned to answer with nothing.',
    },
  ],
};
