import CodeBlock from '../../src/components/CodeBlock.jsx';
import RetryBackoffViz from './visuals/RetryBackoffViz.jsx';
import solutionSource from './python/src/retry_backoff/solution.py?raw';
import starterSource from './python/src/retry_backoff/starter.py?raw';
import answerSource from './python/src/retry_backoff/practice_answer.py?raw';
import lessonTests from './python/tests/test_lesson.py?raw';
import expectedOutput from './python/fixtures/expected-output.txt?raw';
import expectedPracticeOutput from './python/fixtures/expected-practice-output.txt?raw';
import scriptsFixture from './python/fixtures/scripts.json?raw';
import traceFixture from './python/fixtures/expected-trace.json?raw';

// Authored by Claude Fable 5 in the main thread. Every number on this page was
// produced by running the files below; the expected outputs are the files'
// actual output, compared byte for byte by the tests.
const answerSnippet = answerSource.split('# --- answer begins ---\n')[1].split('# --- answer ends ---')[0].trim();

export const content = {
  brief: (
    <>
      <p>
        Orbit&apos;s assistant calls a hosted model for every answer. Under load the endpoint sometimes takes too
        long or replies &quot;429 too many requests&quot; for a few seconds. The assistant&apos;s loop retried at once,
        as fast as it could, which hammered an endpoint that was asking for room, and it retried every error the
        same way, so a request with an empty prompt was sent four times before anyone saw the real problem.
      </p>
      <p>
        <strong>The action to practice:</strong> wrap one unreliable call in a retry loop with exponential backoff
        and a cap. The rules are small:
      </p>
      <ul>
        <li>A <code>TimeoutError</code> or a <code>ConnectionError</code> is retried after a wait that doubles each time: 0.5 s, then 1.0 s, then 2.0 s.</li>
        <li>At most <code>max_attempts</code> calls are made. After the last failed attempt the loop raises a <code>RuntimeError</code> that says how many attempts were made and what the last error was. It never waits after the last attempt.</li>
        <li>Any other error, such as the <code>ValueError</code> for an invalid request, is not caught. It reaches the caller at once, after one call.</li>
        <li>The call and the sleep are passed in as functions. The demonstration passes a fake endpoint that follows a script and a sleep that records the wait instead of waiting, so the file runs instantly. Production passes the real call and <code>time.sleep</code>.</li>
      </ul>
      <p>
        <strong>Input.</strong> Three scripts for the fake endpoint, one outcome per call, with a cap of 4 attempts and
        a first wait of 0.5 s:
      </p>
      <table>
        <thead><tr><th>script</th><th>outcomes</th><th>what the loop does</th></tr></thead>
        <tbody>
          <tr><td>1</td><td>timeout, rate limited, ok</td><td>waits 0.5 s and 1.0 s, then returns the answer on attempt 3</td></tr>
          <tr><td>2</td><td>timeout, timeout, timeout, timeout</td><td>waits 0.5, 1.0, and 2.0 s, then gives up after attempt 4</td></tr>
          <tr><td>3</td><td>invalid request</td><td>raises <code>ValueError</code> after attempt 1, no wait</td></tr>
        </tbody>
      </table>
      <p>
        <strong>Expected output.</strong> <code>python solution.py</code> prints exactly this. The file holds its own
        scripts, so nothing else is needed:
      </p>
      <pre className="expected-output"><code>{expectedOutput}</code></pre>
    </>
  ),

  starter: (
    <>
      <p>
        Change one behavior. The worked solution caps the number of attempts. Add a cap on the total time spent
        waiting: a <code>max_wait</code> of 3.0 s. Before each wait, if the seconds waited so far plus the next delay
        would exceed the budget, stop retrying and raise{' '}
        <code>RuntimeError(&quot;wait budget of 3.0 s exhausted after N attempts: ...&quot;)</code>. The file below is
        the worked solution with the parameter added and unused, and a check for the new behavior. As shipped it
        prints <code>NOT OK</code> and exits 1.
      </p>
      <p>
        <strong>Hint.</strong> Keep a running total in a variable that starts at <code>0.0</code> before the loop.
        After computing <code>delay</code>, compare the total plus the delay with <code>max_wait</code>; raise if it
        would go over, otherwise add the delay to the total before calling <code>sleep</code>.
      </p>
      <p>
        <strong>Expected result.</strong> On the all-timeout script the waits are 0.5 and 1.0 (total 1.5). The next
        wait of 2.0 would make 3.5, over the budget, so the loop stops after attempt 3 instead of attempt 4, and the
        recovering script still succeeds. The file ends with <code>OK</code>.
      </p>
      <details>
        <summary>Show the answer</summary>
        <CodeBlock filename="Practice answer" code={answerSnippet} />
        <p>
          One variable before the loop, one comparison, and one addition. The budget check sits after the cap check
          and before the sleep, so a wait is never taken once it would cross the line, and a wait that lands exactly
          on the budget is still allowed. Everything outside the marked region is the practice file unchanged.
        </p>
      </details>
    </>
  ),

  files: [
    { path: 'python/src/retry_backoff/solution.py', role: 'reference', language: 'python', source: solutionSource, primary: true,
      description: 'The complete worked example: the scripted fake endpoint, call_with_retry, and a demonstration that runs three scripts and prints every attempt, the waits, and OK. Runs alone with Python 3.11 or newer.' },
    { path: 'python/src/retry_backoff/starter.py', role: 'starter', language: 'python', source: starterSource, primary: true,
      description: 'The practice file: the worked solution with a max_wait parameter that is accepted but not used yet, and a check for the new behavior. Prints NOT OK until the wait budget is enforced.' },
    { path: 'python/src/retry_backoff/practice_answer.py', role: 'reference', language: 'python', source: answerSource,
      description: 'The completed practice variation; the page shows the region between its answer markers.' },
    { path: 'python/fixtures/expected-output.txt', role: 'fixture', language: 'text', source: expectedOutput,
      description: 'What solution.py prints, byte for byte. The test runs the file alone and compares.' },
    { path: 'python/fixtures/expected-practice-output.txt', role: 'fixture', language: 'text', source: expectedPracticeOutput,
      description: 'What practice_answer.py prints, byte for byte.' },
    { path: 'python/tests/test_lesson.py', role: 'test', language: 'python', source: lessonTests,
      description: 'Runs the three lesson files alone and checks the doubling, the cap, the untouched ValueError, the exact give-up message, the wait budget, and that the animation fixtures match the solution; measures the tight loop that shipped on the same scripts.' },
    { path: 'python/fixtures/scripts.json', role: 'fixture', language: 'json', source: scriptsFixture,
      description: 'The three scripts, the cap, the first delay, and the practice budget exactly as the lesson files define them; the animation runs on this copy and a test pins it to the files.' },
    { path: 'python/fixtures/expected-trace.json', role: 'fixture', language: 'json', source: traceFixture,
      description: 'Every attempt the loop makes on the three scripts and under the practice budget, with its start time and wait, derived from the real functions; the animation must replay it exactly.' },
  ],

  evidence: (
    <>
      <p>
        <strong>What the file checks</strong> before it prints <code>OK</code>: the recovering script recorded
        exactly the waits 0.5 and 1.0, the all-timeout script recorded 0.5, 1.0, and 2.0 with no fourth wait, and
        the invalid request recorded no wait at all. Run your copy and compare its output with the expected output
        above; they must match line for line.
      </p>
      <p>
        <strong>The failure cases.</strong> After the fourth timeout the loop raises{' '}
        <code>gave up after 4 attempts: no response in 10 seconds</code>, and the demonstration catches it and prints
        the stopped line. The empty prompt raises <code>ValueError</code> from the first call, and the loop lets it
        through: the tests count exactly one call and no waits, and check that the error is neither swallowed nor
        turned into a retry. A cap of 1 means no waits at all.
      </p>
      <p>
        <strong>The loop that shipped, on the same scripts.</strong> An immediate-retry loop with the same cap makes
        four calls in the same instant on the all-timeout script, 0 s of waiting, while backoff spreads the same four
        calls over 3.5 s. On four invalid requests the shipped loop calls four times before failing; the repair calls
        once. Both measurements are tests in the project download.
      </p>
    </>
  ),

  solution: (
    <>
      <p>
        Read the file top to bottom: the constants and the three scripts, a function that builds the fake endpoint,
        the one function that does the work, and a demonstration. Here is its Python, construct by construct.
      </p>
      <ol>
        <li>
          <strong>Functions as values.</strong> A function name without parentheses is the function itself, not a
          call to it. <code>call_with_retry(scripted_endpoint(RECOVERS), record_wait, ...)</code> passes two
          functions as arguments: the first argument is whatever <code>scripted_endpoint</code> returned, and the
          second is <code>record_wait</code> itself. Inside, <code>call()</code> and <code>sleep(delay)</code> run
          them. Production passes the real request function and <code>time.sleep</code>; nothing in the loop changes.
        </li>
        <li>
          <strong>A function that builds a function.</strong> <code>scripted_endpoint(script)</code> copies the script
          with <code>list(script)</code> and defines <code>call</code> inside itself, then returns <code>call</code>.
          The inner function remembers the list it was built with, so each call pops the next outcome with{' '}
          <code>remaining.pop(0)</code> (remove and return the first element). The copy keeps the constant script
          intact for the printed line. A chain of <code>if</code> statements turns an outcome into an exception with{' '}
          <code>raise</code>, or returns the answer.
        </li>
        <li>
          <strong>The attempt loop.</strong> <code>for attempt in range(1, max_attempts + 1):</code> counts 1, 2, 3, 4.
          A range stops before its end value, which is why the end is one past the cap.
        </li>
        <li>
          <strong>try, and a return inside it.</strong> The three lines under <code>try:</code> run until one of them
          raises. If the call returns, the print and <code>return answer</code> run, and the return leaves the whole
          function at once; no later attempt happens.
        </li>
        <li>
          <strong>except with a tuple of types.</strong> <code>except (TimeoutError, ConnectionError) as error:</code>{' '}
          catches either of the two, and <code>error</code> is the exception object; putting it in an f-string gives
          its message. A <code>ValueError</code> is not in the tuple, so Python keeps looking for a handler outside
          the function and the loop ends immediately. That one line is the whole &quot;do not retry what cannot
          succeed&quot; policy.
        </li>
        <li>
          <strong>Giving up.</strong> <code>if attempt == max_attempts: raise RuntimeError(f&quot;...&quot;)</code>{' '}
          creates a new exception that names the count and carries the last error&apos;s message. Because it runs
          before the wait, the loop never sleeps after its last attempt.
        </li>
        <li>
          <strong>The exponent.</strong> <code>delay = base_delay * 2 ** (attempt - 1)</code>: two asterisks raise to a
          power. Two to the power zero is one, so attempt 1 waits 0.5 s, attempt 2 waits 1.0 s, and attempt 3 waits
          2.0 s. The print line stands in for the logger.
        </li>
        <li>
          <strong>The demonstration.</strong> <code>waits = []</code> and <code>record_wait</code>, which appends to
          it, replace the clock. <code>waits.clear()</code> empties the list in place between scripts,{' '}
          <code>sum(waits)</code> adds the floats, and <code>&quot;, &quot;.join(RECOVERS)</code> prints a list as one
          line. The demonstration catches <code>RuntimeError</code> and <code>ValueError</code> itself so that the
          failure cases print instead of crashing, and each <code>assert</code> checks one claim before <code>OK</code>.
        </li>
      </ol>
      <p><strong>Trace the variables.</strong> Follow <code>attempt</code>, <code>delay</code>, and the recorded waits:</p>
      <table>
        <thead><tr><th>script</th><th>attempt</th><th>outcome</th><th>what happens</th><th>waited so far</th></tr></thead>
        <tbody>
          <tr><td>1</td><td>1</td><td>timeout</td><td>caught; delay 0.5 × 1 = 0.5; sleep(0.5)</td><td>0.5</td></tr>
          <tr><td>1</td><td>2</td><td>rate limited</td><td>caught; delay 0.5 × 2 = 1.0; sleep(1.0)</td><td>1.5</td></tr>
          <tr><td>1</td><td>3</td><td>ok</td><td>return answer</td><td>1.5</td></tr>
          <tr><td>2</td><td>1 to 3</td><td>timeout</td><td>caught; delays 0.5, 1.0, 2.0</td><td>3.5</td></tr>
          <tr><td>2</td><td>4</td><td>timeout</td><td>attempt == max_attempts: raise RuntimeError, no sleep</td><td>3.5</td></tr>
          <tr><td>3</td><td>1</td><td>invalid request</td><td>ValueError not in the tuple: propagates</td><td>0</td></tr>
        </tbody>
      </table>
      <p>
        <strong>Why these decisions.</strong> The wait doubles because an overloaded endpoint needs room, and every
        retry that fails is evidence that it needs more; a fixed wait keeps hitting it at the same rate. The cap
        bounds the worst case: four attempts and 3.5 s of waiting, not forever. The <code>ValueError</code> is left
        out of the tuple because a request that is invalid now will be invalid in two seconds, and retrying it would
        hide the bug behind a slow failure. The sleep is injected so that the demonstration and the tests run in
        milliseconds and the policy itself is what gets checked. Production backoff also adds a random jitter to the
        waits so that many clients do not retry in lockstep; it is left out here so the output is exact.
      </p>
      <p>
        <strong>The pattern, and its limits.</strong> This is a retry loop with exponential backoff around any call
        that can fail for a while and then succeed: model APIs, embedding services, vector stores, webhooks. Decide
        which errors mean &quot;try again&quot; and which mean &quot;stop&quot;, bound the attempts, and inject the
        clock. Its limits: no jitter, no distinction between a 429 and a 503 beyond the exception type, and no
        guard against repeating a call that already took effect, so only wrap calls that are safe to repeat.
      </p>
    </>
  ),

  visual: (
    <figure className="fig">
      <RetryBackoffViz />
      <figcaption className="fig-cap">
        <span className="fig-caption-text">
          The loop from the file, run on its own three scripts along a time axis at a reading pace, about half a
          minute in all. Each attempt appears at the simulated moment it starts, the wait before the next attempt
          grows as a bracket that doubles each time, and the caption states the attempt in the numbers of the trace
          table: the recovery on attempt 3 after 1.5 s, the cap after four timeouts and 3.5 s, the invalid request
          raised at once. Then the practice budget of 3.0 s appears and cuts the wait that would cross it. Step
          through with the buttons. The figure rests for two minutes before it plays again, and the motion setting in
          the site header can slow or stop it. Every attempt and number comes from the same loop run in the browser
          and is checked against the Python run.
        </span>
      </figcaption>
    </figure>
  ),

  tradeoffs: [
    {
      name: 'Immediate retry with a cap (what shipped)',
      preferWhen: 'Rare, instant blips on a dependency that is never overloaded, such as a dropped connection on an idle internal service, where the second call almost always succeeds.',
      cost: 'On the all-timeout script it makes four calls in the same instant: it adds load exactly when the endpoint is asking for less, and a 429 is a request to slow down that it ignores. Catching every error retries requests that can never succeed.',
    },
    {
      name: 'Backoff with jitter and a circuit breaker',
      preferWhen: 'Production traffic from many clients against a shared quota: jitter spreads retries so they do not arrive in waves, and a breaker stops calling an endpoint that has been failing for everyone until it recovers.',
      cost: 'More state than a loop: a random source, shared failure counts, open and half-open states, and metrics to tune them. The loop in this lesson is the inner piece of that design, not a replacement for it.',
    },
    {
      name: 'A queue with a worker and a rate limiter',
      preferWhen: 'Work that does not need an answer right now, such as batch embedding or nightly summaries: enqueue, let one worker drain at the allowed rate, and retries become redelivery.',
      cost: 'Latency and infrastructure: a queue, a worker, persistence, and a dead-letter path for requests that keep failing. Interactive answers cannot wait in it.',
    },
  ],
};
