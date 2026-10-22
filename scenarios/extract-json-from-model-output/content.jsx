import CodeBlock from '../../src/components/CodeBlock.jsx';
import JsonExtractViz from './visuals/JsonExtractViz.jsx';
import solutionSource from './python/src/json_extract/solution.py?raw';
import starterSource from './python/src/json_extract/starter.py?raw';
import answerSource from './python/src/json_extract/practice_answer.py?raw';
import lessonTests from './python/tests/test_lesson.py?raw';
import expectedOutput from './python/fixtures/expected-output.txt?raw';
import expectedPracticeOutput from './python/fixtures/expected-practice-output.txt?raw';
import repliesFixture from './python/fixtures/replies.json?raw';

// Authored by Claude Fable 5 in the main thread. Every number on this page was
// produced by running the files below; the expected outputs are the files'
// actual output, compared byte for byte by the tests.
const answerSnippet = answerSource.split('# --- answer begins ---\n')[1].split('# --- answer ends ---')[0].trim();

export const content = {
  brief: (
    <>
      <p>
        Orbit&apos;s assistant asks the model to classify a support ticket and answer with one JSON object: an
        intent, a priority from 1 to 3, and a list of tags. The service handed the whole reply to{' '}
        <code>json.loads</code>. The model answers in prose, wraps the object in a code fence, adds a closing remark,
        sometimes stops in the middle of the object, and sometimes returns a priority as text, so one unparseable
        reply raised an exception and crashed the worker that handled it.
      </p>
      <p>
        <strong>The action to practice:</strong> find the first balanced object in the reply, parse only that span,
        check the keys and the types, and return a reason for every reply you cannot use. The rules are small:
      </p>
      <ul>
        <li>Walk the reply one character at a time. Outside any object, only an opening brace matters; it starts the span and sets the depth to 1.</li>
        <li>Inside the object, a quote opens a string and the next unescaped quote closes it; a brace inside a string does not change the depth, and a backslash protects the character after it.</li>
        <li>A closing brace that brings the depth back to 0 ends the span. A reply whose depth never returns to 0 has no object.</li>
        <li>The span alone goes to <code>json.loads</code>; a parse error is reported as invalid JSON, never raised.</li>
        <li>A parsed object must hold <code>intent</code> (non-empty text), <code>priority</code> (an integer from 1 to 3, and a boolean does not count), and <code>tags</code> (a list of strings); the first failed check is the reason.</li>
        <li>A reply that is not a string at all is a programming error and raises a <code>ValueError</code>.</li>
      </ul>
      <p>
        <strong>Input.</strong> Six replies, inline as a list of dictionaries with an id and the text exactly as the
        model produced it:
      </p>
      <table>
        <thead><tr><th>id</th><th>what the model sent</th></tr></thead>
        <tbody>
          <tr><td>r1</td><td>the object alone, 65 characters</td></tr>
          <tr><td>r2</td><td>the object inside a <code>```json</code> code fence</td></tr>
          <tr><td>r3</td><td>a sentence, a line break, the object (one tag reads <code>error {'{'}502{'}'}</code>), another sentence</td></tr>
          <tr><td>r4</td><td>&quot;Here you go:&quot; and an object cut off before its closing bracket and brace</td></tr>
          <tr><td>r5</td><td>a valid object whose priority is the text <code>&quot;high&quot;</code></td></tr>
          <tr><td>r6</td><td>a label, the object with a comma before its closing brace, and &quot;Done.&quot;</td></tr>
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
        Change one behavior. The worked solution rejects a balanced object that <code>json.loads</code> cannot parse,
        and the most common such defect is a trailing comma before a closing brace or bracket, which models produce
        often and JSON never allows. Make <code>repair_trailing_commas</code> drop every comma whose next non-space
        character is <code>{'}'}</code> or <code>]</code>, so the second parse in <code>parse_reply</code> succeeds
        and r6 is accepted. The file below is the worked solution with that function present but returning its input
        unchanged, the retry already wired, and a check for the new behavior. As shipped it prints{' '}
        <code>NOT OK</code> and stops.
      </p>
      <p>
        <strong>Hint.</strong> Walk the candidate with <code>enumerate</code>, building a new string one character at
        a time. When the character is a comma, take the rest of the text with a slice, strip its leading whitespace
        with <code>lstrip</code>, and <code>continue</code> past the comma when that rest starts with a closing
        brace or bracket; every other character is appended.
      </p>
      <p>
        <strong>Expected result.</strong> r6 is accepted with the note &quot;repaired a trailing comma&quot;, its
        record reads intent access, priority 1, tags keys and expired, and the tally becomes 4 accepted and 2
        rejected. The file ends with <code>OK</code>.
      </p>
      <details>
        <summary>Show the answer</summary>
        <CodeBlock filename="Practice answer" code={answerSnippet} />
        <p>
          One loop, one slice, and two string methods. <code>candidate[index + 1:]</code> is everything after the
          comma, <code>lstrip()</code> removes spaces and line breaks at its front, and <code>startswith</code> asks
          whether a closing brace or bracket comes next; <code>continue</code> skips the append for that one comma.
          The limit is honest: a comma inside a string value that happens to sit right before a closing brace would
          be dropped too. Everything outside the marked region is the practice file unchanged.
        </p>
      </details>
    </>
  ),

  files: [
    { path: 'python/src/json_extract/solution.py', role: 'reference', language: 'python', source: solutionSource, primary: true,
      description: 'The complete worked example: the six replies, find_json_span, validate, parse_reply, and a demonstration that prints every verdict, the tally, the rejected non-string reply, and OK. Runs alone with Python 3.11 or newer.' },
    { path: 'python/src/json_extract/starter.py', role: 'starter', language: 'python', source: starterSource, primary: true,
      description: 'The practice file: the worked solution with repair_trailing_commas returning its input unchanged and the retry wired, plus a check for the new behavior. Prints NOT OK until the repair drops a trailing comma.' },
    { path: 'python/src/json_extract/practice_answer.py', role: 'reference', language: 'python', source: answerSource,
      description: 'The completed practice variation; the page shows the region between its answer markers.' },
    { path: 'python/fixtures/expected-output.txt', role: 'fixture', language: 'text', source: expectedOutput,
      description: 'What solution.py prints, byte for byte. The test runs the file alone and compares.' },
    { path: 'python/fixtures/expected-practice-output.txt', role: 'fixture', language: 'text', source: expectedPracticeOutput,
      description: 'What practice_answer.py prints, byte for byte.' },
    { path: 'python/tests/test_lesson.py', role: 'test', language: 'python', source: lessonTests,
      description: 'Runs the three lesson files alone, checks the brace walk at its edges (nesting, braces inside strings, escaped quotes, truncation), every validation reason, the repair, and pins the animation fixtures to the solution; measures the whole-reply parse that shipped against the extractor on the same six replies.' },
    { path: 'python/fixtures/replies.json', role: 'fixture', language: 'json', source: repliesFixture,
      description: 'The six replies, the required keys, and the priority range exactly as the lesson files define them; the animation runs on this copy and a test pins it to the files. The trace fixture it replays ships in the project download.' },
  ],

  evidence: (
    <>
      <p>
        <strong>What the file checks</strong> before it prints <code>OK</code>: r1, r2, and r3 are accepted in that
        order, and the three rejections carry exactly the reasons no object, priority must be an integer from 1 to 3,
        and invalid json. Run your copy and compare its output with the expected output above; they must match line
        for line.
      </p>
      <p>
        <strong>The failure cases.</strong> A reply that is not a string raises a <code>ValueError</code> naming its
        type, and the demonstration prints it as the rejected line instead of crashing. The three bad replies are
        rejected with reasons, never with exceptions: r4 never closes its object, so the walk returns <code>None</code>;
        r6 closes but the comma before the brace is not JSON, so <code>json.loads</code> raises and the{' '}
        <code>except</code> turns that into a reason; r5 parses and then fails the priority check. The tests in the
        project download also walk a nested object, braces and escaped quotes inside strings, a stray closing brace
        before any object, and a <code>True</code> priority, which is rejected on purpose.
      </p>
      <p>
        <strong>What shipped, on the same replies.</strong> <code>json.loads</code> on the whole reply parses two of
        the six (r1 and r5) and raises on the other four, which is what crashed the worker. Worse, the two it parses
        include r5, whose priority is the text &quot;high&quot;: with no validation that record went downstream and
        failed later, far from the cause. The extractor accepts three, rejects three with a named reason each, and
        never accepts a record that fails a check; the practice repair accepts four. Both measurements are tests in
        the project download.
      </p>
    </>
  ),

  solution: (
    <>
      <p>
        Read the file top to bottom: the input, the walk that finds the span, the checks, the function that ties
        them together, and a demonstration. Here is its Python, construct by construct.
      </p>
      <ol>
        <li>
          <strong>Index and character together.</strong> <code>for index, char in enumerate(text):</code> walks the
          string one character at a time and hands over the position as well, so the loop can remember where the
          object started and report where it closed. Four variables set before the loop carry the state between
          characters: <code>depth</code>, <code>start</code>, <code>in_string</code>, and <code>escaped</code>.
        </li>
        <li>
          <strong>Outside any object.</strong> <code>if depth == 0:</code> is the first test, and inside it only an
          opening brace does anything: it records <code>start = index</code> and sets the depth to 1. The{' '}
          <code>continue</code> jumps to the next character, so prose, fences, and stray closing braces before the
          object are skipped.
        </li>
        <li>
          <strong>Inside a string.</strong> <code>if in_string:</code> comes next, because while a quoted value is open
          nothing else counts. The <code>elif</code> chain handles one case each: an <code>escaped</code> flag set by
          a backslash is cleared, a backslash sets it, and an unescaped quote closes the string. A brace seen here
          falls through every branch, which is how the braces in r3&apos;s tag are ignored.
        </li>
        <li>
          <strong>Counting braces.</strong> Outside a string, a quote opens one, <code>{'{'}</code> adds one to the depth
          with <code>depth += 1</code>, and <code>{'}'}</code> subtracts one; when that brings the depth back to 0 the
          function returns <code>start, index</code>, a tuple built right in the <code>return</code>. The{' '}
          <code>return None</code> after the loop is reached only when no object ever closed.
        </li>
        <li>
          <strong>Unpacking and slicing.</strong> The caller writes <code>start, end = span</code> to take the tuple
          apart, after testing <code>if span is None</code> first. <code>text[start:end + 1]</code> copies the span:
          a slice stops before its second index, so the closing brace at <code>end</code> needs the plus one.
        </li>
        <li>
          <strong>Catching the parse error.</strong> <code>json.loads(candidate)</code> turns the text into a
          dictionary, and when the text is not JSON it raises <code>json.JSONDecodeError</code>. Wrapping the call in{' '}
          <code>try</code> with <code>except json.JSONDecodeError:</code> turns that exception into the returned reason{' '}
          <code>&quot;invalid json&quot;</code>, so a bad reply is data, not a crash.
        </li>
        <li>
          <strong>The checks.</strong> <code>validate</code> asks <code>if key not in record</code> for each required
          key, then tests types with <code>isinstance(value, str)</code>, <code>int</code>, and <code>list</code>.
          The priority line tests <code>bool</code> first, because to Python <code>True</code> is an integer, then the
          range with two comparisons joined by <code>or</code>. Each failed check returns its reason at once, and the
          final <code>return None</code> means the record passed.
        </li>
        <li>
          <strong>Two results, one convention.</strong> <code>parse_reply</code> returns <code>record, None</code> on
          success and <code>None, reason</code> otherwise, so the caller asks <code>if record is None</code> and finds
          the reason in the second slot. A non-string argument raises <code>ValueError</code> with the type&apos;s name
          from <code>type(text).__name__</code>: that is a bug in the caller, not a reply to tolerate.
        </li>
        <li>
          <strong>The demonstration.</strong> <code>rejected</code> is a dictionary of lists keyed by reason:{' '}
          <code>if reason not in rejected: rejected[reason] = []</code> creates the list the first time a reason
          appears, and <code>append</code> adds the id. <code>&quot;, &quot;.join(record[&quot;tags&quot;])</code> prints
          a list as one line, the format spec <code>{'{reply[\'id\']:<3}'}</code> pads to three columns, and each{' '}
          <code>assert</code> checks one claim before <code>OK</code>.
        </li>
      </ol>
      <p><strong>Trace the walk.</strong> Follow <code>start</code>, the closing position, the braces ignored inside strings, and where each reply stops:</p>
      <table>
        <thead><tr><th>reply</th><th>length</th><th>first brace</th><th>closes at</th><th>ignored braces</th><th>parse</th><th>checks</th><th>outcome</th></tr></thead>
        <tbody>
          <tr><td>r1</td><td>65</td><td>0</td><td>64</td><td>none</td><td>parses</td><td>all pass</td><td>accepted</td></tr>
          <tr><td>r2</td><td>69</td><td>8</td><td>64</td><td>none</td><td>parses</td><td>all pass</td><td>accepted</td></tr>
          <tr><td>r3</td><td>135</td><td>34</td><td>104</td><td>97, 101</td><td>parses</td><td>all pass</td><td>accepted</td></tr>
          <tr><td>r4</td><td>78</td><td>13</td><td>never</td><td>none</td><td>not reached</td><td>not reached</td><td>no object</td></tr>
          <tr><td>r5</td><td>62</td><td>0</td><td>61</td><td>none</td><td>parses</td><td>priority is text</td><td>rejected</td></tr>
          <tr><td>r6</td><td>87</td><td>16</td><td>80</td><td>none</td><td>fails at the comma (79)</td><td>not reached</td><td>invalid json</td></tr>
        </tbody>
      </table>
      <p>
        The depth never rises above 1 in these replies because no value is itself an object; a nested object would
        take it to 2 and back, and the span would still end at the brace that returns it to 0. In r3 the two braces at
        positions 97 and 101 arrive while <code>in_string</code> is true, so the depth stays at 1 and the object closes
        at 104, three characters later. In r4 the walk reaches the end of the text at depth 1 and the loop simply
        finishes, which is why the function ends with an explicit <code>return None</code>.
      </p>
      <p>
        <strong>Why these decisions.</strong> Only the span goes to the parser because the reply is a conversation
        and the object is the payload; parsing the whole thing punishes the model for being polite. Reasons come back
        as strings instead of exceptions because a reply the model got wrong is ordinary traffic the caller must
        count and route, while a reply that is not a string is a programming error, the one case that raises.
        Validation runs after parsing because valid JSON says nothing about the schema: r5 is perfect JSON and still
        unusable. The boolean test exists because <code>isinstance(True, int)</code> is true in Python, so a priority
        of <code>true</code> would otherwise pass as 1. And the first object wins by policy.
      </p>
      <p>
        <strong>The pattern, and its limits.</strong> A walk with a depth counter and an in-string flag is a tiny
        state machine, and the same shape extracts fenced code, matches brackets, or splits nested delimiters. Parse,
        then validate, then return a reason is the shape of every boundary that takes untrusted structured text. Its
        limits: the first object only, never a top-level array; a brace in the prose before the real object would
        start the span early; the checks are shallow, so a nested shape needs its own tests; a repair fixes one
        defect at a time; and when the provider offers a structured-output mode, that removes the problem at its
        source.
      </p>
    </>
  ),

  visual: (
    <figure className="fig">
      <JsonExtractViz />
      <figcaption className="fig-cap">
        <span className="fig-caption-text">
          The functions from the file, run on their own six replies at a reading pace: about three and a half seconds
          per reply, about half a minute in all. Each reply is laid out one character per cell. An amber cursor walks
          it while the depth meter counts open braces; cells inside a string are shaded, a brace that did not count
          gets an amber mark, and the span handed to the parser is underlined in blue once the object closes. Then
          the five checks tick in order and the verdict appears with its reason; the tally fills one chip per reply.
          The practice variation drops r6&apos;s trailing comma at position 79 and accepts it. Step through with the
          buttons. The figure rests for two minutes before it plays again, and the motion setting in the site header
          can slow or stop it. Every position, outcome, and reason comes from the same functions run in the browser
          and is compared with the Python run.
        </span>
      </figcaption>
    </figure>
  ),

  tradeoffs: [
    {
      name: 'json.loads on the whole reply (what shipped)',
      preferWhen: 'The model is held to a strict output mode that returns nothing but the object, or the reply is produced by code you control; then the whole text is the payload and the walk is wasted work.',
      cost: 'On the six replies it parses two and raises on four, one of the two carries a text priority that fails downstream, and every unexpected sentence from the model becomes an exception in the service.',
    },
    {
      name: 'Find the balanced span, parse it, validate it (this lesson)',
      preferWhen: 'The model is asked for JSON inside a conversation, replies vary in wrapping, and a rejected reply can be counted, logged, or retried by the caller.',
      cost: 'About forty lines to test at their edges, a first-object-only policy, shallow checks that do not reach nested shapes, and one more rule for every repair you add; a truncated reply is still lost.',
    },
    {
      name: 'Structured output from the provider, or a repair request to the model',
      preferWhen: 'The provider supports a JSON schema or constrained decoding, which removes malformed replies at the source; or the reply is valuable enough that a second call asking the model to fix its own JSON is worth the latency and cost.',
      cost: 'Vendor coupling for the schema feature, a validation step you still need for the values, and, for the repair call, double latency and spend on every bad reply from a model that may produce a bad object again.',
    },
  ],
};
