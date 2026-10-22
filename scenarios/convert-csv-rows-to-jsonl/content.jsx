import CodeBlock from '../../src/components/CodeBlock.jsx';
import CsvJsonlViz from './visuals/CsvJsonlViz.jsx';
import solutionSource from './python/src/csv_to_jsonl/solution.py?raw';
import starterSource from './python/src/csv_to_jsonl/starter.py?raw';
import answerSource from './python/src/csv_to_jsonl/practice_answer.py?raw';
import lessonTests from './python/tests/test_lesson.py?raw';
import expectedOutput from './python/fixtures/expected-output.txt?raw';
import expectedPracticeOutput from './python/fixtures/expected-practice-output.txt?raw';
import exportFixture from './python/fixtures/export.json?raw';

// Authored by Claude Fable 5 in the main thread. Every number on this page was
// produced by running the files below; the expected outputs are the files'
// actual output, compared byte for byte by the tests.
const answerSnippet = answerSource.split('# --- answer begins ---\n')[1].split('# --- answer ends ---')[0].trim();

export const content = {
  brief: (
    <>
      <p>
        Orbit&apos;s support tickets are exported as a CSV with four columns: the ticket id, the customer&apos;s
        question, the agent&apos;s reply, and a status. Agent replies hold commas and line breaks, so the export
        quotes them, the way every CSV writer does. The first converter split each line on commas. Two of every
        five rows came out shredded: a quoted comma produced an extra field, and a quoted line break turned one
        row into two broken ones. The fine-tuning job wants JSONL, one JSON object per line with a prompt and a
        completion, for the closed tickets that have a reply.
      </p>
      <p>
        <strong>The action to practice:</strong> read the export with the standard <code>csv</code> module, keep the
        rows that qualify, name every row you skip and why, and write one <code>json.dumps</code> line per example.
        The rules are small:
      </p>
      <ul>
        <li>The module does the parsing: a quoted field keeps its commas and line breaks; the code never splits a line itself.</li>
        <li>An export that lacks one of the four required columns raises a <code>ValueError</code> naming the column.</li>
        <li>A row whose status is not <code>closed</code> (after strip and lower) is skipped as <code>not_closed</code>; a row whose reply is empty after strip is skipped as <code>empty_reply</code>. Each skip records the ticket id.</li>
        <li>A kept row becomes <code>{'{"prompt": question, "completion": reply}'}</code>; the JSONL text is one line per example, in file order.</li>
      </ul>
      <p>
        <strong>Input.</strong> Five rows, written inline as the CSV text itself. Two replies are quoted: t2&apos;s
        holds a comma and t3&apos;s spans two lines of the file.
      </p>
      <table>
        <thead><tr><th>id</th><th>question</th><th>reply</th><th>status</th><th>decision</th></tr></thead>
        <tbody>
          <tr><td>t1</td><td>How do I rotate an API key?</td><td>Create a replacement key and deploy it before revoking the old one.</td><td>closed</td><td>kept, line 1</td></tr>
          <tr><td>t2</td><td>Which scope do list calls need?</td><td>&quot;The read scope, which covers list and get calls.&quot;</td><td>closed</td><td>kept, line 2</td></tr>
          <tr><td>t3</td><td>Where do I find my invoice?</td><td>&quot;Open Billing, then Invoices.&quot; then a line break, then &quot;Each month is a PDF.&quot;</td><td>closed</td><td>kept, line 3</td></tr>
          <tr><td>t4</td><td>Can a lost key be recovered?</td><td>We are checking with the security team.</td><td>open</td><td>skipped: not_closed</td></tr>
          <tr><td>t5</td><td>What does the write scope add?</td><td>(empty)</td><td>closed</td><td>skipped: empty_reply</td></tr>
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
        Change one behavior. The worked solution keeps every closed ticket that has a reply. Give{' '}
        <code>rows_to_examples</code> a character budget: when <code>max_chars</code> is a number and the prompt plus
        the completion is longer than it, skip the row as <code>too_long</code>, reported with the other reasons. The
        file below is the worked solution with a <code>max_chars</code> parameter that is accepted but not used yet,
        a <code>too_long</code> list that stays empty, and a check for the new behavior. As shipped it prints{' '}
        <code>NOT OK</code> and stops.
      </p>
      <p>
        <strong>Hint.</strong> The check belongs after the status and empty-reply checks, so a row is reported for
        what it is first, and only a row that would otherwise be kept is measured. One comparison of the two
        lengths added together against <code>max_chars</code>, guarded by <code>max_chars is not None</code>, then
        append the id to the <code>too_long</code> list and <code>continue</code>. Nothing else changes.
      </p>
      <p>
        <strong>Expected result.</strong> With a budget of 90 characters, t1 (27 for the prompt plus 67 for the
        completion, 94 in all) is skipped as <code>too_long</code>; t2 (79) and t3 (76) fit. Two examples are kept,
        the skips read <code>not_closed: 1 (t4)</code>, <code>empty_reply: 1 (t5)</code>, <code>too_long: 1 (t1)</code>,
        and the file ends with <code>OK</code>.
      </p>
      <details>
        <summary>Show the answer</summary>
        <CodeBlock filename="Practice answer" code={answerSnippet} />
        <p>
          One new name for the stripped prompt, one <code>if</code> with two conditions joined by <code>and</code>, an
          append, and a <code>continue</code>. The guard <code>max_chars is not None</code> comes first, so a call
          without a budget never compares anything. Everything outside the marked region is the practice file
          unchanged.
        </p>
      </details>
    </>
  ),

  files: [
    { path: 'python/src/csv_to_jsonl/solution.py', role: 'reference', language: 'python', source: solutionSource, primary: true,
      description: 'The complete worked example: the CSV text, the required columns, rows_to_examples, to_jsonl, and a demonstration that prints the counts, the JSONL lines, the skips by reason, the rejected export, and OK. Runs alone with Python 3.11 or newer.' },
    { path: 'python/src/csv_to_jsonl/starter.py', role: 'starter', language: 'python', source: starterSource, primary: true,
      description: 'The practice file: the worked solution with a max_chars parameter that is not used yet, and a check for the budget. Prints NOT OK until rows over the budget are skipped as too_long.' },
    { path: 'python/src/csv_to_jsonl/practice_answer.py', role: 'reference', language: 'python', source: answerSource,
      description: 'The completed practice variation; the page shows the region between its answer markers.' },
    { path: 'python/fixtures/expected-output.txt', role: 'fixture', language: 'text', source: expectedOutput,
      description: 'What solution.py prints, byte for byte. The test runs the file alone and compares.' },
    { path: 'python/fixtures/expected-practice-output.txt', role: 'fixture', language: 'text', source: expectedPracticeOutput,
      description: 'What practice_answer.py prints, byte for byte.' },
    { path: 'python/tests/test_lesson.py', role: 'test', language: 'python', source: lessonTests,
      description: 'Runs the three lesson files alone, checks the quoted fields, the status and reply rules, the rejected export, the JSON escaping, the budget and its boundary, pins the animation fixtures to the solution, and measures the split-on-commas parser that shipped against csv.DictReader on the same export.' },
    { path: 'python/fixtures/export.json', role: 'fixture', language: 'json', source: exportFixture,
      description: 'The CSV text, the required columns, the practice budget, and the five rows as csv.DictReader parses them, exactly as the lesson files define them; the animation runs on this copy and a test pins it to the files. The trace fixture it replays ships in the project download.' },
  ],

  evidence: (
    <>
      <p>
        <strong>What the file checks</strong> before it prints <code>OK</code>: three examples kept, the skips exactly{' '}
        <code>not_closed</code> t4 and <code>empty_reply</code> t5, the quoted comma still inside t2&apos;s
        completion, and three JSONL lines where t3&apos;s line break travels as two characters. Run your copy and
        compare its output with the expected output above; they must match line for line.
      </p>
      <p>
        <strong>The failure case.</strong> The demonstration feeds an export whose header lacks{' '}
        <code>agent_reply</code>, and <code>rows_to_examples</code> raises <code>ValueError</code> naming the column
        before reading a single row; the demonstration prints it as the rejected line. An empty export is rejected
        the same way. The tests in the project download also check that a header-only export yields no examples and
        no error, that <code>Closed </code> with a trailing space and <code>CLOSED</code> both count as closed, and
        that a reply of only spaces counts as empty.
      </p>
      <p>
        <strong>What shipped, on the same export.</strong> Splitting every line on commas gives six lines for five
        rows, with 4, 5, 4, 2, 4, 4 fields: t2&apos;s quoted comma makes a fifth field, and t3&apos;s quoted line
        break splits the row into a four-field line and a two-field line. Two of the five rows come out wrong.{' '}
        <code>csv.DictReader</code> parses all five to the four named fields, with the comma and the line break where
        the agent typed them. Both measurements are tests in the project download.
      </p>
    </>
  ),

  solution: (
    <>
      <p>
        Read the file top to bottom: three imports, the input, the one function that does the work, a function that
        writes the lines, and a demonstration. Here is its Python, construct by construct.
      </p>
      <ol>
        <li>
          <strong>Three standard modules.</strong> <code>import csv</code>, <code>import io</code>, and{' '}
          <code>import json</code> bring in the CSV parser, in-memory files, and the JSON writer. Nothing is
          installed; all three ship with Python.
        </li>
        <li>
          <strong>A file made from a string.</strong> <code>csv.DictReader</code> wants something it can read line by
          line, as it would read an open file. <code>io.StringIO(csv_text)</code> wraps a string in exactly that
          interface, so the inline text and a real file are handled by the same code.
        </li>
        <li>
          <strong>The reader and its header.</strong> <code>csv.DictReader(...)</code> reads the first line as the
          column names and then yields one dictionary per row, keyed by those names. The names are available as{' '}
          <code>reader.fieldnames</code>, which is <code>None</code> for an empty file; <code>or []</code> turns that
          into an empty list so the loop below can test it. The default dialect is the one the export uses: a comma
          separates fields, a double quote opens a field that may hold commas and line breaks, and a doubled quote
          inside is one quote.
        </li>
        <li>
          <strong>Fail before reading a row.</strong> <code>for column in REQUIRED:</code> checks each required name
          with <code>if column not in columns:</code> and raises <code>ValueError(f&quot;...&quot;)</code> naming the
          first one missing. A wrong export is rejected at the header, never halfway through.
        </li>
        <li>
          <strong>Two lists to fill.</strong> <code>examples = []</code> collects the kept rows;{' '}
          <code>skipped = {'{"not_closed": [], "empty_reply": []}'}</code> is a dictionary whose values are lists, one
          per reason, created before the loop so every reason exists even when it stays empty.
        </li>
        <li>
          <strong>The row loop.</strong> <code>for row in reader:</code> hands over one dictionary at a time;{' '}
          <code>row[&quot;status&quot;]</code> reads a field by its column name. <code>.strip().lower()</code> removes
          surrounding whitespace and lowercases, so <code>Closed </code> and <code>CLOSED</code> both compare equal to{' '}
          <code>&quot;closed&quot;</code>. A status that differs appends the id to <code>skipped[&quot;not_closed&quot;]</code>{' '}
          and <code>continue</code>s, which jumps to the next row and skips everything below.
        </li>
        <li>
          <strong>The second guard, then the keep.</strong> <code>reply = row[&quot;agent_reply&quot;].strip()</code>{' '}
          and <code>if reply == &quot;&quot;:</code> catch an empty reply, including one made only of spaces. A row
          that passes both guards is appended as a new dictionary with two keys, <code>prompt</code> and{' '}
          <code>completion</code>. The function returns both collections as a tuple, and the caller unpacks them with{' '}
          <code>examples, skipped = rows_to_examples(CSV_TEXT)</code>.
        </li>
        <li>
          <strong>One JSON object per line.</strong> <code>json.dumps(example, ensure_ascii=False)</code> turns a
          dictionary into one line of JSON text: the keys and strings are quoted, a line break inside a string becomes
          the two characters <code>\n</code>, and <code>ensure_ascii=False</code> keeps any accented or non-Latin
          character as itself instead of a <code>\u</code> escape. <code>text = text + ... + &quot;\n&quot;</code>{' '}
          grows the output string one line at a time, so every line ends with a newline and no examples means an
          empty string.
        </li>
        <li>
          <strong>The demonstration.</strong> <code>for ids in skipped.values():</code> walks the lists to count the
          rows read; <code>for reason, ids in skipped.items():</code> unpacks each reason and its list to print one
          line each, with <code>&quot;, &quot;.join(ids)</code> turning a list of ids into text. <code>try</code> and{' '}
          <code>except ValueError as error</code> show the rejected export without crashing, and each{' '}
          <code>assert</code> checks one claim before <code>OK</code>.
        </li>
      </ol>
      <p><strong>Trace the variables.</strong> Follow each row through the two guards and into one of the lists:</p>
      <table>
        <thead><tr><th>row</th><th>status</th><th>reply after strip</th><th>decision</th><th>examples</th><th>skipped</th></tr></thead>
        <tbody>
          <tr><td>t1</td><td>closed</td><td>67 characters, no quotes needed</td><td>kept, line 1</td><td>1</td><td>none</td></tr>
          <tr><td>t2</td><td>closed</td><td>48 characters, the quoted comma intact</td><td>kept, line 2</td><td>2</td><td>none</td></tr>
          <tr><td>t3</td><td>closed</td><td>49 characters, one line break inside</td><td>kept, line 3</td><td>3</td><td>none</td></tr>
          <tr><td>t4</td><td>open</td><td>never read</td><td>not_closed</td><td>3</td><td>not_closed: t4</td></tr>
          <tr><td>t5</td><td>closed</td><td>empty</td><td>empty_reply</td><td>3</td><td>plus empty_reply: t5</td></tr>
        </tbody>
      </table>
      <p>
        Then <code>to_jsonl</code> writes the three examples: line 3 is the one to look at, because the completion
        that spans two lines of the CSV becomes a single JSONL line with <code>\n</code> inside its string, and{' '}
        <code>json.loads</code> on that line gives the two-line reply back.
      </p>
      <p>
        <strong>Why these decisions.</strong> The module parses the file because the quoting rules are a format, not
        a convention: a hand-written split gets them wrong exactly where the data matters most, in the long replies.
        The guards run in a fixed order, status first, so every skip has one reason and the report can be audited row
        by row. The missing-column check comes before the loop because a wrong export should fail loudly at once,
        not produce a half-empty training set. The skips are recorded as ids rather than counted, because a count
        cannot be checked against the source system and a list of ids can. The output is JSONL rather than one big
        JSON array because a training job reads it line by line and a broken line costs one example, not the file.
      </p>
      <p>
        <strong>The pattern, and its limits.</strong> Parse with the module, filter with ordered guards, record every
        skip with its reason, serialize one record per line. The same shape converts a ticket export, a chat log, or
        a spreadsheet into the shape a training or evaluation job expects. Its limits: the whole file is read into
        memory as one string here, where a real export streams from an open file; the status and reply rules are
        policy, and a reply that is present but useless passes them; nothing here checks the text for personal data
        or for duplicates, which are their own passes; and a CSV written with a different delimiter or quote
        character needs the dialect named when the reader is created.
      </p>
    </>
  ),

  visual: (
    <figure className="fig">
      <CsvJsonlViz />
      <figcaption className="fig-cap">
        <span className="fig-caption-text">
          The functions from the file, run on their own five rows at a reading pace: about three seconds per row,
          about twenty five seconds in all. Each row passes through the parser panel, where its four fields appear
          one at a time, a quoted reply shown as one field, and the shards a split on commas would have made sit
          faded beneath with their count. The decision chip names the JSONL line or the skip reason, and the line or
          the id moves to the right. The intro shows what shipped (six lines with 4, 5, 4, 2, 4, 4 fields), the outro
          gives 5 rows read, 3 kept, 2 skipped, and the practice variation measures the three kept examples against
          the budget of 90. Step through with the buttons. The figure rests for two minutes before it plays again, and
          the motion setting in the site header can slow or stop it. Every field, count, and line comes from the
          same logic run in the browser and is compared with the Python run.
        </span>
      </figcaption>
    </figure>
  ),

  tradeoffs: [
    {
      name: 'Split each line on commas (what shipped)',
      preferWhen: 'Machine-written data with no quoting at all, such as a numeric log you generated yourself, where no field can contain the delimiter or a line break.',
      cost: 'On these five rows it yields six lines with 4, 5, 4, 2, 4, 4 fields and shreds t2 and t3, the two rows with quoted replies. Human text is never delimiter-safe, and the breakage lands in the longest, most valuable replies.',
    },
    {
      name: 'The csv module with DictReader (this lesson)',
      preferWhen: 'Any export written by a spreadsheet, a ticket system, or a database tool: the module implements the quoting rules, names the fields, and handles a line break inside a cell.',
      cost: 'Every value arrives as a string, so numbers and dates need converting; a file with another delimiter or quote character needs its dialect named; and a header that is misspelled is a missing column, which is why the lesson checks for the required names first.',
    },
    {
      name: 'pandas read_csv, then to_json with lines',
      preferWhen: 'A large export that also needs analysis: typed columns, grouping, joins, and statistics before or after the conversion, with a team already using it.',
      cost: 'A heavy dependency for a conversion, dtype guesses that quietly change values (leading zeros, large ids), and a NaN for an empty reply instead of an empty string, so the empty-reply rule has to be written differently.',
    },
  ],
};
