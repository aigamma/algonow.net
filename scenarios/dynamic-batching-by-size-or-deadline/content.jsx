import CodeBlock from '../../src/components/CodeBlock.jsx';
import DynamicBatcherViz from './visuals/DynamicBatcherViz.jsx';
import solutionSource from './python/src/dynamic_batcher/solution.py?raw';
import starterSource from './python/src/dynamic_batcher/starter.py?raw';
import answerSource from './python/src/dynamic_batcher/practice_answer.py?raw';
import lessonTests from './python/tests/test_lesson.py?raw';
import expectedOutput from './python/fixtures/expected-output.txt?raw';
import expectedPracticeOutput from './python/fixtures/expected-practice-output.txt?raw';
import arrivalsFixture from './python/fixtures/arrivals.json?raw';

// Authored by Claude Fable 5 in the main thread. Every number on this page was
// produced by running the files below; the expected outputs are the files'
// actual output, compared byte for byte by the tests.
const answerSnippet = answerSource.split('# --- answer begins ---\n')[1].split('# --- answer ends ---')[0].trim();

export const content = {
  brief: (
    <>
      <p>
        Orbit&apos;s embedding service forwarded each request to the model as its own call. Every call pays the
        model&apos;s fixed per-call overhead, so at busy hours the service fell behind while the accelerator sat
        mostly idle between tiny calls. Requests that arrive within the same fraction of a second could have shared
        one call.
      </p>
      <p>
        <strong>The action to practice:</strong> collect arriving requests into batches with a dynamic batcher, a
        pending list that fills and is sent, bounded two ways. The rules fit in three sentences:
      </p>
      <ul>
        <li>A request joins the pending batch when it arrives. When the batch holds <code>max_batch</code> requests, it is sent at once: the reason is <code>full</code>.</li>
        <li>No request waits for company longer than <code>max_wait</code> seconds: when the oldest pending request has waited that long, the batch is sent at that moment, whatever its size: the reason is <code>deadline</code>.</li>
        <li>Arrivals must be in time order; a timestamp earlier than the previous one raises a <code>ValueError</code>, because a batcher fed out of order would settle deadlines against the wrong clock.</li>
      </ul>
      <p>
        <strong>Input.</strong> Nine requests, inline as a list of dictionaries with an id and an arrival time in
        seconds, against a cap of 4 per batch and a wait of 1.0 second. Four arrive inside the first half second,
        two more at 0.5 and 0.9, and three late ones at 1.7, 2.0, and 2.2:
      </p>
      <table>
        <thead><tr><th>id</th><th>r1</th><th>r2</th><th>r3</th><th>r4</th><th>r5</th><th>r6</th><th>r7</th><th>r8</th><th>r9</th></tr></thead>
        <tbody>
          <tr><td>arrives at</td><td>0.0</td><td>0.1</td><td>0.3</td><td>0.4</td><td>0.5</td><td>0.9</td><td>1.7</td><td>2.0</td><td>2.2</td></tr>
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
        Change one behavior. The worked solution bounds a batch by its size and by the wait of its oldest request. A
        model call also has a budget of tokens, and the first batch above, r1 to r4, would carry 600 tokens against a
        budget of 500. Add a third bound. The file below is the worked solution with a <code>tokens</code> field on
        every request, a <code>MAX_TOKENS</code> setting of 500 passed into <code>batch</code> as a fourth parameter
        that is not used yet, and a check for the new behavior. As shipped it prints <code>NOT OK</code> and stops.
      </p>
      <p>
        <strong>Hint.</strong> Inside the loop, after the deadline check and before the <code>append</code>, first
        compare the request&apos;s tokens with <code>max_tokens</code> and <code>raise</code> a <code>ValueError</code>{' '}
        when the request alone is too large: it can never be sent, so say so loudly rather than splitting or dropping
        it. Then add up the tokens of the requests already pending with a small loop, and when that total plus the new
        request&apos;s tokens is more than the budget, call <code>flush</code> with the arrival time and the reason{' '}
        <code>&quot;tokens&quot;</code> before appending. The deadline check stays first, because a deadline that has
        already passed is settled before anything else happens at this arrival.
      </p>
      <p>
        <strong>Expected result.</strong> Four model calls instead of three: r1, r2, r3 go at 0.40 for tokens (r4
        would have made 600), r4, r5, r6 go at 1.40 by deadline, r7, r8 go at 2.20 for tokens (r9 would have made
        550), and r9 goes alone at 3.20 by deadline. No batch carries more than 500 tokens, the longest wait is still
        1.00 s, and a single request of 600 tokens is rejected with a message naming it. The file prints the tables
        with a tokens column, the two rejected lines, and <code>OK</code>.
      </p>
      <details>
        <summary>Show the answer</summary>
        <CodeBlock filename="Practice answer" code={answerSnippet} />
        <p>
          Two additions inside the loop and nothing else: the oversized guard, and a running total over the pending
          list that decides whether this request would push the batch past the budget, in which case the pending
          batch is sent first with a third reason. <code>flush</code> did not change, which is the point of having it
          as a function: the third call site reads exactly like the other two. Notice what the change costs: one more
          model call on the same arrivals, because a budget is a third way for a batch to end early. Everything
          outside the marked region is the practice file unchanged.
        </p>
      </details>
    </>
  ),

  files: [
    { path: 'python/src/dynamic_batcher/solution.py', role: 'reference', language: 'python', source: solutionSource, primary: true,
      description: 'The complete worked example: the nine arrivals, the settings, flush, batch, and a demonstration that prints the batches, every wait, the counts, the rejected out-of-order run, and OK. Runs alone with Python 3.11 or newer.' },
    { path: 'python/src/dynamic_batcher/starter.py', role: 'starter', language: 'python', source: starterSource, primary: true,
      description: 'The practice file: the worked solution with tokens on every request, an unused max_tokens parameter, and a check for the new behavior. Prints NOT OK until batch respects the token budget.' },
    { path: 'python/src/dynamic_batcher/practice_answer.py', role: 'reference', language: 'python', source: answerSource,
      description: 'The completed practice variation; the page shows the region between its answer markers.' },
    { path: 'python/fixtures/expected-output.txt', role: 'fixture', language: 'text', source: expectedOutput,
      description: 'What solution.py prints, byte for byte. The test runs the file alone and compares.' },
    { path: 'python/fixtures/expected-practice-output.txt', role: 'fixture', language: 'text', source: expectedPracticeOutput,
      description: 'What practice_answer.py prints, byte for byte.' },
    { path: 'python/tests/test_lesson.py', role: 'test', language: 'python', source: lessonTests,
      description: 'Runs the three lesson files alone, checks every batch and wait, the deadline boundary, the rejected settings and arrivals, the token budget, and measures one call per request against the batcher on the same arrivals; pins the animation fixtures to the solution.' },
    { path: 'python/fixtures/arrivals.json', role: 'fixture', language: 'json', source: arrivalsFixture,
      description: 'The nine arrivals with their tokens, the cap, the wait, the token budget, and the evaluation window exactly as the lesson files define them; the animation runs on this copy and a test pins it to the files.' },
  ],

  evidence: (
    <>
      <p>
        <strong>What the file checks</strong> before it prints <code>OK</code>: three batches, none above the cap of
        4, the reasons <code>full</code>, <code>deadline</code>, <code>deadline</code> in that order, and no wait
        above 1.0 second. Run your copy and compare its output with the expected output above; they must match line
        for line.
      </p>
      <p>
        <strong>The failure cases.</strong> The demonstration feeds <code>batch</code> a request at 0.5 seconds after
        one at 1.0, and the time-order guard raises a <code>ValueError</code> that the demonstration prints as the
        rejected line. A cap of 0 or a wait of 0 raises the same way. The tests in the project download also show
        that a request arriving exactly at the deadline finds the batch already sent, while one arriving a
        thousandth of a second earlier joins it; that a single request is sent at its own deadline; that a cap of 1
        sends every request the instant it arrives; and that the request list is unchanged afterwards.
      </p>
      <p>
        <strong>What shipped, on the same arrivals.</strong> One call per request means 9 model calls, and the
        busiest one-second window carries 6 of them. With the batcher, 3 model calls carry the same nine requests,
        the busiest one-second window carries 1, and no request waits more than the 1.00 second it was promised: the
        two deadline batches reach the cap exactly. The practice variation makes 4 calls on the same arrivals, the
        price of a third bound, with the longest wait still 1.00 s. All three measurements are tests in the project
        download.
      </p>
    </>
  ),

  solution: (
    <>
      <p>
        Read the file top to bottom: the settings and the arrivals, a small helper, one function that does the work,
        and a demonstration. Here is its Python, construct by construct.
      </p>
      <ol>
        <li>
          <strong>A helper that is called from three places.</strong> <code>flush(pending, at, reason, batches)</code>{' '}
          turns the pending requests into one batch record: a loop collects their ids into a new list, a dictionary
          with the ids, the time, and the reason is appended to <code>batches</code>, and the function returns an empty
          list. Every call site reads <code>pending = flush(...)</code>, so the batch is emptied by rebinding the name
          to a fresh list. <code>pending.clear()</code> would empty the same list in place; the rebinding makes the
          reset visible at the call site, where the decision is.
        </li>
        <li>
          <strong>Guard clauses first.</strong> <code>if max_batch &lt; 1: raise ValueError(...)</code> and the same for
          a wait that is not positive. Checking the settings before the loop means no half-finished work when they are
          wrong.
        </li>
        <li>
          <strong>State before the loop.</strong> <code>batches = []</code>, <code>pending = []</code>, and{' '}
          <code>last_time = 0.0</code> are created once and rewritten inside the loop. The pending list is the whole
          state of the batcher: who is waiting, in arrival order, so <code>pending[0]</code> is always the oldest.
        </li>
        <li>
          <strong>The deadline, settled lazily.</strong> <code>if pending and t &gt;= pending[0][&quot;t&quot;] + max_wait:</code>{' '}
          asks whether the oldest pending request&apos;s deadline passed before this arrival. <code>pending and ...</code>{' '}
          is short-circuit evaluation: an empty list is false, so the index is never taken on an empty list. When the
          deadline has passed, the batch is sent at the deadline, not at the arrival: that is the timestamp a real
          timer would have fired at. Nothing runs between arrivals in this function, so each arrival first settles any
          deadline that already passed.
        </li>
        <li>
          <strong>Join, then the cap.</strong> <code>pending.append(request)</code> adds the arrival, and{' '}
          <code>if len(pending) == max_batch:</code> sends the batch at <code>t</code> with the reason{' '}
          <code>&quot;full&quot;</code>. The equality is enough because the list grows by one per arrival and is
          emptied the moment it reaches the cap.
        </li>
        <li>
          <strong>After the loop.</strong> <code>if pending:</code> sends whatever is still waiting at the oldest
          request&apos;s deadline. Without this line the last requests would never be sent; with it, the function
          answers the question a server must answer at shutdown too.
        </li>
        <li>
          <strong>The demonstration.</strong> <code>enumerate(batches, start=1)</code> pairs each batch with a counter
          starting at one, for the table. A dictionary <code>arrival</code> maps each id to its time so the second loop
          can compute <code>record[&quot;at&quot;] - arrival[request_id]</code>, the wait. <code>max(waits)</code> and{' '}
          <code>sum(waits) / len(waits)</code> give the longest and the average, <code>try</code> and{' '}
          <code>except ValueError</code> show the rejection without crashing, and each <code>assert</code> checks one
          claim before <code>OK</code>. The wait check allows a billionth of a second, because decimal times added in
          binary can be off by one unit in the last place: 1.7 plus 1.0 minus 1.7 is not exactly 1.0 in Python.
        </li>
      </ol>
      <p><strong>Trace the variables.</strong> Follow <code>pending</code> and the two bounds through the nine arrivals:</p>
      <table>
        <thead><tr><th>request</th><th>arrives</th><th>deadline settled first?</th><th>pending after joining</th><th>sent</th></tr></thead>
        <tbody>
          <tr><td>r1</td><td>0.0</td><td>no, nothing pending</td><td>r1</td><td></td></tr>
          <tr><td>r2</td><td>0.1</td><td>no, r1 waited 0.1</td><td>r1, r2</td><td></td></tr>
          <tr><td>r3</td><td>0.3</td><td>no, r1 waited 0.3</td><td>r1, r2, r3</td><td></td></tr>
          <tr><td>r4</td><td>0.4</td><td>no, r1 waited 0.4</td><td>r1, r2, r3, r4: the cap</td><td>batch 1 at 0.40, full</td></tr>
          <tr><td>r5</td><td>0.5</td><td>no, nothing pending</td><td>r5</td><td></td></tr>
          <tr><td>r6</td><td>0.9</td><td>no, r5 waited 0.4</td><td>r5, r6</td><td></td></tr>
          <tr><td>r7</td><td>1.7</td><td>yes: 1.7 is past 0.5 + 1.0</td><td>r7 (r5, r6 were sent first)</td><td>batch 2 at 1.50, deadline</td></tr>
          <tr><td>r8</td><td>2.0</td><td>no, r7 waited 0.3</td><td>r7, r8</td><td></td></tr>
          <tr><td>r9</td><td>2.2</td><td>no, r7 waited 0.5</td><td>r7, r8, r9</td><td></td></tr>
          <tr><td>end</td><td></td><td>the loop is over</td><td>empty</td><td>batch 3 at 2.70, deadline</td></tr>
        </tbody>
      </table>
      <p>
        The first four arrivals fill the batch inside 0.4 seconds, so the cap sends it and nobody waits long. r5 and
        r6 then wait for company that never comes in time: when r7 arrives at 1.7, the oldest of them has waited 1.2
        seconds, so the batch is recorded as sent at 1.5, the moment the deadline passed, and r5&apos;s wait is exactly
        the 1.0 second it was promised. r7, r8, and r9 are still pending when the input ends, and the last line sends
        them at r7&apos;s deadline, 2.7. Three model calls instead of nine; the longest wait is the cap, the average is
        0.51 seconds.
      </p>
      <p>
        <strong>Why these decisions.</strong> The deadline is checked at each arrival rather than by a timer because
        the function then stays a pure loop over a list, which is what makes it testable: the same input always gives
        the same batches. Recording the deadline batch at the deadline time, not the arrival time, keeps the waits
        truthful: a server with a timer would have sent it then. The cap is checked after the append, so a batch is
        never observed above <code>max_batch</code>. The helper returns a fresh list instead of clearing in place so
        that no caller can keep a reference to a batch that has already gone out.
      </p>
      <p>
        <strong>The pattern, and its limits.</strong> A list that fills and is flushed on whichever of two conditions
        comes first is the plain Python form of dynamic batching, the standard shape in front of a model server: it
        trades a bounded wait for fewer, fuller calls. Its limits: this function settles deadlines only when the next
        request arrives, so a production server needs a real timer for the last batch of a quiet period; the two
        settings trade latency for throughput and are tuned per model and per load; and the batch has no notion of
        size beyond the count, which the practice variation adds.
      </p>
    </>
  ),

  visual: (
    <figure className="fig">
      <DynamicBatcherViz />
      <figcaption className="fig-cap">
        <span className="fig-caption-text">
          The function from the file, run on its own nine arrivals at a reading pace: about two and a half seconds
          per arrival, about half a minute in all. The arrivals sit on a time axis with an amber marker for the
          batcher&apos;s clock; the tray is the pending list, with a bar that fills as its oldest request waits toward
          the deadline. Each beat advances the clock to the arrival, settles a deadline that already passed (the
          batch slides into the column of model calls, labeled deadline in amber), adds the request to the tray, and
          sends the batch when the cap is reached (labeled full in blue). The waits appear below as batches go out.
          The practice variation redraws the column with box widths proportional to tokens and the budget line at
          500. Step through with the buttons. The figure rests for two minutes before it plays again, and the motion
          setting in the site header can slow or stop it. Every batch and wait comes from the same function run in
          the browser and is compared with the Python run.
        </span>
      </figcaption>
    </figure>
  ),

  tradeoffs: [
    {
      name: 'One model call per request (what shipped)',
      preferWhen: 'Traffic is light, or a request cannot wait even a fraction of a second for company: the simplest service, nothing to tune, and the lowest latency for a lone request.',
      cost: 'Every call pays the fixed overhead, so throughput collapses at busy hours: 9 calls for 9 requests here, 6 of them inside one second, while the accelerator idles between them.',
    },
    {
      name: 'Dynamic batching with a size cap and a deadline (this lesson)',
      preferWhen: 'Requests arrive close together and a bounded extra wait is acceptable: 3 calls carry the 9 requests, no request waits more than the 1.0 second it was promised, and a lone request still goes out at its deadline.',
      cost: 'A request may wait up to max_wait, the two settings trade latency for throughput and are tuned per model, and in production the deadline needs a real timer: this function settles it at the next arrival, which a server cannot do when no next arrival comes.',
    },
    {
      name: 'Fixed-interval batching, a timer that sends whatever is pending every T seconds',
      preferWhen: 'Steady high load and simple operations: one timer, one rule, batches of whatever accumulated, with no per-arrival bookkeeping.',
      cost: 'Adds up to T of latency to every request even when the service is idle, sends tiny batches when traffic is light, and still needs a size cap, so it ends up with the same two settings and a worse worst case.',
    },
  ],
};
