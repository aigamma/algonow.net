import CodeBlock from '../../src/components/CodeBlock.jsx';
import StreamViz from './visuals/StreamViz.jsx';
import solutionSource from './python/src/stream_reader/solution.py?raw';
import starterSource from './python/src/stream_reader/starter.py?raw';
import answerSource from './python/src/stream_reader/practice_answer.py?raw';
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
        Orbit&apos;s gateway streams the model&apos;s reply to the browser word by word. It read the provider&apos;s
        stream in network chunks and treated each chunk as one complete event. The network does not cut where events
        end: a chunk can carry two events, or the first half of one. The JSON parser crashed on the second chunk and
        the reply died at a random word, with the browser left holding &quot;Restart &quot;.
      </p>
      <p>
        <strong>The action to practice:</strong> read a stream through a line buffer. The rules fit in four sentences:
      </p>
      <ul>
        <li>Append each chunk to a string buffer. While the buffer contains a line break, split off the first complete line and keep the rest.</li>
        <li>A line that starts with <code>data:</code> is an event: parse the JSON after the prefix and append its <code>delta</code> to the text. Blank separator lines and comment lines such as <code>: keepalive</code> are skipped.</li>
        <li>The payload <code>[DONE]</code> ends the stream: nothing after it is read, including the rest of the buffer and any later chunk.</li>
        <li>A data line that is not valid JSON raises a <code>ValueError</code> naming the chunk, and so does a stream that ends without the marker, naming the characters still waiting.</li>
      </ul>
      <p>
        <strong>Input.</strong> Six chunks, inline as a list of strings, that together form one streamed reply. The
        line breaks are shown as <code>\n</code>:
      </p>
      <table>
        <thead><tr><th>chunk</th><th>content</th><th>what it carries</th></tr></thead>
        <tbody>
          <tr><td>1</td><td><code>{'data: {"delta": "Restart "}\\n\\n'}</code></td><td>one whole event</td></tr>
          <tr><td>2</td><td><code>{'data: {"delta": "the "}\\n\\ndata: {"delta": "worker"}\\n\\n'}</code></td><td>two events</td></tr>
          <tr><td>3</td><td><code>{'data: {"del'}</code></td><td>half an event</td></tr>
          <tr><td>4</td><td><code>{'ta": ", then "}\\n\\n: keepalive\\n\\n'}</code></td><td>the other half, then a comment</td></tr>
          <tr><td>5</td><td><code>{'data: {"delta": "set the timeout."}\\n\\n'}</code></td><td>one event</td></tr>
          <tr><td>6</td><td><code>{'data: {"usage": {"output_tokens": 9}}\\n\\ndata: [DONE]\\n\\ndata: {"delta": "ignored after done"}\\n\\n'}</code></td><td>a usage event, the end marker, and data that must never be read</td></tr>
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
        Change one behavior. The provider sends one more event before the end marker: a usage object with the output
        token count, which the gateway needs for billing and logs. The worked solution parses it, adds nothing to the
        text, which is right, and then forgets it. The file below is the worked solution with a <code>usage</code>{' '}
        variable that stays <code>None</code> and is returned as a fourth value. As shipped the file prints{' '}
        <code>NOT OK</code> and stops.
      </p>
      <p>
        <strong>Hint.</strong> After an event is parsed, test whether the key <code>usage</code> is in the event
        dictionary with the <code>in</code> operator, and when it is, store the event&apos;s usage value in the variable.
        The variable is created before the loop, so it survives every iteration and the last usage event wins.
      </p>
      <p>
        <strong>Expected result.</strong> The usage comes back as a dictionary with 9 output tokens, the text and the six
        events are unchanged, and the file prints the usage line before <code>OK</code>.
      </p>
      <details>
        <summary>Show the answer</summary>
        <CodeBlock filename="Practice answer" code={answerSnippet} />
        <p>
          Two lines inside the loop and one in the return. The membership test reads the parsed dictionary rather than
          the raw line, so a delta whose text happens to contain the word usage cannot trigger it. Everything outside the
          marked region is the practice file unchanged.
        </p>
      </details>
    </>
  ),

  files: [
    { path: 'python/src/stream_reader/solution.py', role: 'reference', language: 'python', source: solutionSource, primary: true,
      description: 'The complete worked example: the six chunks, read_stream, and a demonstration that prints the per-chunk table, the assembled reply, what parsing whole chunks delivered, two rejected streams, and OK. Runs alone with Python 3.11 or newer.' },
    { path: 'python/src/stream_reader/starter.py', role: 'starter', language: 'python', source: starterSource, primary: true,
      description: 'The practice file: the worked solution with a usage variable that stays None and is returned as a fourth value. Prints NOT OK until read_stream captures the usage event.' },
    { path: 'python/src/stream_reader/practice_answer.py', role: 'reference', language: 'python', source: answerSource,
      description: 'The completed practice variation; the page shows the region between its answer markers.' },
    { path: 'python/fixtures/expected-output.txt', role: 'fixture', language: 'text', source: expectedOutput,
      description: 'What solution.py prints, byte for byte. The test runs the file alone and compares.' },
    { path: 'python/fixtures/expected-practice-output.txt', role: 'fixture', language: 'text', source: expectedPracticeOutput,
      description: 'What practice_answer.py prints, byte for byte.' },
    { path: 'python/tests/test_lesson.py', role: 'test', language: 'python', source: lessonTests,
      description: 'Runs the three lesson files alone, checks the buffer at every chunk boundary, the same stream cut at every position and one character at a time, comments and the end marker, the rejected streams, the practice usage capture, and what parsing whole chunks delivered; pins the animation fixtures to the solution.' },
    { path: 'python/fixtures/chunks.json', role: 'fixture', language: 'json', source: chunksFixture,
      description: 'The six network chunks exactly as the lesson files define them; the animation runs on this copy and a test pins it to the files.' },
  ],

  evidence: (
    <>
      <p>
        <strong>What the file checks</strong> before it prints <code>OK</code>: the reply reads &quot;Restart the worker,
        then set the timeout.&quot;; six events were parsed, two of them from chunk 2 and none from the split chunk 3;
        and the buffer held 11 characters after chunk 3 and nothing after chunk 4. Run your copy and compare its output
        with the expected output above; they must match line for line.
      </p>
      <p>
        <strong>The failure cases.</strong> The demonstration feeds the reader a data line with a missing brace and a
        stream that ends without the marker; each raises a <code>ValueError</code> that the demonstration prints as a
        rejected line, the first naming the chunk and the malformed payload, the second naming the characters still
        waiting. The tests in the project download also check that an empty list raises, that a chunk after the end
        marker is never read, that a usage event counts but adds no text, and that the chunks are unchanged.
      </p>
      <p>
        <strong>What shipped, on the same chunks.</strong> Parsing each chunk as one JSON event crashes at chunk 2,
        which holds two events, after delivering &quot;Restart &quot;; it would crash on the split chunk 3 the same way.
        The buffer reader delivers all 41 characters. The strongest test is independence from chunking: the same
        stream cut at every one of its positions into two chunks, or delivered one character at a time, assembles the
        same reply with the same six events. All three measurements are tests in the project download.
      </p>
    </>
  ),

  solution: (
    <>
      <p>
        Read the file top to bottom: the six chunks, one function that reads them, and a demonstration. Here is its
        Python, construct by construct.
      </p>
      <ol>
        <li>
          <strong>State before the loop.</strong> <code>buffer</code>, <code>text</code>, <code>events</code>, a{' '}
          <code>done</code> flag, and a <code>log</code> list are created once. The buffer is the whole idea: it carries
          the unfinished tail of one chunk into the next.
        </li>
        <li>
          <strong>Appending to a string.</strong> <code>buffer += chunk</code> builds a new, longer string; strings
          cannot change in place. <code>if done: break</code> at the top of the loop means a chunk that arrives after
          the end marker is never even appended.
        </li>
        <li>
          <strong>While a line break is present.</strong> <code>while &quot;\n&quot; in buffer and not done:</code>{' '}
          tests membership of a substring. <code>line, buffer = buffer.split(&quot;\n&quot;, 1)</code> splits at the
          first line break only, into exactly two pieces: the complete line and everything after it, which becomes the
          new buffer. The loop runs once per complete line and stops when only a fragment is left.
        </li>
        <li>
          <strong>Classifying the line.</strong> <code>strip</code> removes stray whitespace and a carriage return.{' '}
          <code>continue</code> skips any line that does not start with <code>data:</code>, which covers the blank
          separators and the comment. <code>removeprefix(&quot;data:&quot;)</code> takes the prefix off without guessing
          its length, and a second <code>strip</code> drops the space after the colon.
        </li>
        <li>
          <strong>The end marker and the parse.</strong> <code>if payload == &quot;[DONE]&quot;:</code> sets the flag and
          breaks out of the line loop. Otherwise <code>json.loads</code> runs inside <code>try</code>; the{' '}
          <code>except json.JSONDecodeError</code> branch raises a <code>ValueError</code> with the chunk number and the
          payload, turning a parser traceback into a message that says where the stream broke.
        </li>
        <li>
          <strong>Taking the text.</strong> <code>event.get(&quot;delta&quot;, &quot;&quot;)</code> reads the delta or an
          empty string when the event has none, so a usage event adds nothing instead of raising a{' '}
          <code>KeyError</code>. The counters go up, and after the line loop a tuple of five values is appended to the
          log for this chunk.
        </li>
        <li>
          <strong>After the loop.</strong> <code>if not done: raise ValueError(...)</code> catches a stream that was cut
          off, naming how many characters were still waiting, and the function returns three values. The
          demonstration also replays what shipped: <code>chunk.removeprefix(&quot;data:&quot;).strip()</code> fed
          straight to <code>json.loads</code>, with the crash caught and reported.
        </li>
      </ol>
      <p><strong>Trace the buffer.</strong> Follow what each chunk leaves behind:</p>
      <table>
        <thead><tr><th>chunk</th><th>characters</th><th>lines released</th><th>events</th><th>left waiting</th><th>text so far</th></tr></thead>
        <tbody>
          <tr><td>1</td><td>29</td><td>2</td><td>1</td><td>0</td><td>Restart </td></tr>
          <tr><td>2</td><td>52</td><td>4</td><td>2</td><td>0</td><td>Restart the worker</td></tr>
          <tr><td>3</td><td>11</td><td>0</td><td>0</td><td>11</td><td>Restart the worker</td></tr>
          <tr><td>4</td><td>30</td><td>4</td><td>1</td><td>0</td><td>Restart the worker, then </td></tr>
          <tr><td>5</td><td>37</td><td>2</td><td>1</td><td>0</td><td>Restart the worker, then set the timeout.</td></tr>
          <tr><td>6</td><td>92</td><td>3</td><td>1 (usage)</td><td>40, never read</td><td>unchanged</td></tr>
        </tbody>
      </table>
      <p>
        Chunk 3 is the case that shipped could not handle: <code>data: {'{"del'}</code> has no line break, so the while
        loop never runs, nothing is parsed, and the eleven characters wait. Chunk 4 begins with the rest of that event;
        appended, the buffer reads <code>data: {'{"delta": ", then "}'}</code> followed by the comment, and the loop
        releases four lines. Chunk 6 parses the usage event, meets the marker, and stops; the forty characters after
        it, including a delta that says it should be ignored, are never read.
      </p>
      <p>
        <strong>Why these decisions.</strong> A line buffer rather than a JSON buffer because the protocol is line
        based: every event ends with a line break, and a complete line is cheap to detect with <code>in</code>. Splitting
        at the first line break only, with the maximum of one, is what keeps the remainder intact. The end marker stops
        reading at once because providers can send trailing data, and a gateway that keeps reading will bill or
        display it. Malformed data raises instead of being skipped because a broken event means a broken stream;
        silently dropping it would hide the fault that this lesson exists to surface.
      </p>
      <p>
        <strong>The pattern, and its limits.</strong> Append, split off complete units, keep the fragment: the same
        shape reads length-prefixed frames, newline-delimited JSON logs, and chunked uploads. Its limits: this reader
        handles the one-line events most providers send and not multi-line <code>data:</code> blocks or the{' '}
        <code>event:</code> and <code>id:</code> fields of the full protocol; the buffer is a Python string, fine for text
        and wrong for binary frames, which need bytes and a decoder that tolerates a split multi-byte character; and
        a real client reads from a socket with timeouts, where a stall must be told apart from a slow model.
      </p>
    </>
  ),

  visual: (
    <figure className="fig">
      <StreamViz />
      <figcaption className="fig-cap">
        <span className="fig-caption-text">
          The function from the file, run on its own six chunks at a reading pace: under two and a half seconds per
          chunk and under half a minute in all. The chunks wait in an arrival strip; each beat lifts one into the buffer
          panel, where its characters appear with visible line breaks, then releases the complete lines one at a time
          into the log on the right, green for a text event, grey for a separator or a comment, blue for the usage
          event, amber for the end marker, while the reply grows below. Chunk 3 leaves eleven characters waiting and
          chunk 6 stops at the marker with forty never read. A beat shows what shipped as a red bubble cut off at
          &quot;Restart &quot;, and the practice variation adds the captured usage. Step through with the buttons. The
          figure rests for two minutes before it plays again, and the motion setting in the site header can slow or stop
          it. Every line and count comes from the same function run in the browser and is compared with the Python run.
        </span>
      </figcaption>
    </figure>
  ),

  tradeoffs: [
    {
      name: 'Parse each network chunk as one event (what shipped)',
      preferWhen: 'Never for a real network; it only works on a loopback test where every write arrives as one read, which is exactly how the bug got past review.',
      cost: 'The first chunk that carries two events or half of one crashes the parser: chunk 2 here, with "Restart " delivered and the rest of the reply lost. The failure is random because it depends on the network\'s cut points.',
    },
    {
      name: 'A line buffer (this lesson)',
      preferWhen: 'The provider speaks the usual line-based event protocol and the client is plain Python: a string, a split at the first line break, and a loop give a reader that does not care where the chunks were cut.',
      cost: 'It handles one-line events only, keeps the buffer as text rather than bytes, and leaves timeouts and reconnection to the caller; a provider that sends multi-line data blocks or id and event fields needs the fuller protocol.',
    },
    {
      name: 'The provider\'s client library',
      preferWhen: 'A maintained library exists for the provider and the language: it implements the full event protocol, retries, timeouts, and the usage event, and it tracks protocol changes so the gateway does not have to.',
      cost: 'A dependency to pin and update, behaviour that is harder to inspect when a stream misbehaves, and one library per provider; the buffer in this lesson is what sits inside every one of them, and knowing it is how a stall or a cut-off reply gets diagnosed.',
    },
  ],
};
