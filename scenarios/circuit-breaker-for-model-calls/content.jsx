import CodeBlock from '../../src/components/CodeBlock.jsx';
import CircuitBreakerViz from './visuals/CircuitBreakerViz.jsx';
import solutionSource from './python/src/circuit_breaker/solution.py?raw';
import starterSource from './python/src/circuit_breaker/starter.py?raw';
import answerSource from './python/src/circuit_breaker/practice_answer.py?raw';
import lessonTests from './python/tests/test_lesson.py?raw';
import expectedOutput from './python/fixtures/expected-output.txt?raw';
import expectedPracticeOutput from './python/fixtures/expected-practice-output.txt?raw';
import callsFixture from './python/fixtures/calls.json?raw';

// Authored by Claude Fable 5 in the main thread. Every number on this page was
// produced by running the files below; the expected outputs are the files'
// actual output, compared byte for byte by the tests.
const answerSnippet = answerSource.split('# --- answer begins ---\n')[1].split('# --- answer ends ---')[0].trim();

export const content = {
  brief: (
    <>
      <p>
        Orbit&apos;s gateway calls a hosted model provider. One afternoon the provider degraded: every request waited
        the full timeout and then failed, and the retries behind each failure (the retry-with-backoff lesson) kept
        the provider saturated and the gateway&apos;s workers busy doing nothing. Nothing in the gateway noticed that
        the last fifty calls had all failed.
      </p>
      <p>
        <strong>The action to practice:</strong> protect the calls with a circuit breaker, a small state machine
        carried through a loop. The rules fit in four sentences:
      </p>
      <ul>
        <li>The breaker starts <code>closed</code>: calls go to the provider, and a counter tracks failures in a row. A success resets the counter to zero.</li>
        <li>When the counter reaches <code>threshold</code>, the breaker opens (state <code>open</code>) and remembers when. While open, every call is skipped: the provider is not called and the caller gets an error at once.</li>
        <li>Once <code>cooldown</code> seconds have passed, the breaker is <code>half-open</code> and the next call is a trial. A trial that succeeds closes the breaker; a trial that fails opens it again for a fresh cooldown.</li>
        <li>Calls must be in time order; an earlier timestamp raises a <code>ValueError</code>, because the cooldown is measured between timestamps.</li>
      </ul>
      <p>
        <strong>Input.</strong> Ten calls, inline as a list of dictionaries with an id, an arrival time in seconds,
        and what the provider would answer if the call reached it. That third field is a scripted stand-in for the
        provider so the example runs alone; in production the answer comes from the real request. Against a
        threshold of 3 and a cooldown of 2.0 seconds: one success, seven failures in a row from 0.4 to 4.0 seconds,
        then two successes:
      </p>
      <table>
        <thead><tr><th>id</th><th>c1</th><th>c2</th><th>c3</th><th>c4</th><th>c5</th><th>c6</th><th>c7</th><th>c8</th><th>c9</th><th>c10</th></tr></thead>
        <tbody>
          <tr><td>arrives at</td><td>0.0</td><td>0.4</td><td>0.8</td><td>1.2</td><td>1.5</td><td>2.0</td><td>3.3</td><td>4.0</td><td>5.4</td><td>5.8</td></tr>
          <tr><td>provider would</td><td>ok</td><td>fail</td><td>fail</td><td>fail</td><td>fail</td><td>fail</td><td>fail</td><td>fail</td><td>ok</td><td>ok</td></tr>
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
        Change one behavior. The worked solution closes the breaker on the first successful trial, and one success
        after an outage is thin evidence: a provider that is flapping will pass one call and fail the next, so the
        breaker would close and reopen on every pair. Make closing require <code>RECOVERY</code> consecutive trial
        successes, set to 2. The file below is the worked solution with that setting, a <code>successes</code>{' '}
        variable created before the loop but not used yet, and a check for the new behavior. As shipped it prints{' '}
        <code>NOT OK</code> and stops.
      </p>
      <p>
        <strong>Hint.</strong> Everything happens inside the half-open branch. On a successful trial, add one to{' '}
        <code>successes</code> and set the action, then move to <code>closed</code> only when{' '}
        <code>successes</code> has reached <code>recovery</code>, resetting both counters to zero; when it has not,
        leave the state <code>half-open</code>, so the next call is also a trial. On a failed trial, set{' '}
        <code>successes</code> back to zero before reopening. The closed branch and the skip are unchanged.
      </p>
      <p>
        <strong>Expected result.</strong> Only the last two rows change: c9 is the first trial success and leaves
        the breaker <code>half-open</code>, and c10 is the second trial, <code>trial ok</code>, which closes it. The
        counts are the same as the worked run, the file prints{' '}
        <code>closed after 2 trial successes (c9, c10)</code>, and ends with <code>OK</code>.
      </p>
      <details>
        <summary>Show the answer</summary>
        <CodeBlock filename="Practice answer" code={answerSnippet} />
        <p>
          A second counter does for the half-open state what <code>failures</code> does for the closed state: it
          counts a run, and the transition fires when the run is long enough. Notice the cost: a breaker that needs
          two good trials stays half-open longer, and while half-open every arriving call is a trial that may fail,
          so the first real traffic after an outage carries the risk. Everything outside the marked region is the
          practice file unchanged.
        </p>
      </details>
    </>
  ),

  files: [
    { path: 'python/src/circuit_breaker/solution.py', role: 'reference', language: 'python', source: solutionSource, primary: true,
      description: 'The complete worked example: the ten scripted calls, the settings, protect, and a demonstration that prints the state table, the counts, the rejected out-of-order run, and OK. Runs alone with Python 3.11 or newer.' },
    { path: 'python/src/circuit_breaker/starter.py', role: 'starter', language: 'python', source: starterSource, primary: true,
      description: 'The practice file: the worked solution with a RECOVERY setting and an unused successes counter, and a check for the new behavior. Prints NOT OK until closing takes two consecutive trial successes.' },
    { path: 'python/src/circuit_breaker/practice_answer.py', role: 'reference', language: 'python', source: answerSource,
      description: 'The completed practice variation; the page shows the region between its answer markers.' },
    { path: 'python/fixtures/expected-output.txt', role: 'fixture', language: 'text', source: expectedOutput,
      description: 'What solution.py prints, byte for byte. The test runs the file alone and compares.' },
    { path: 'python/fixtures/expected-practice-output.txt', role: 'fixture', language: 'text', source: expectedPracticeOutput,
      description: 'What practice_answer.py prints, byte for byte.' },
    { path: 'python/tests/test_lesson.py', role: 'test', language: 'python', source: lessonTests,
      description: 'Runs the three lesson files alone, checks every state and action, the threshold and cooldown boundaries, the rejected settings and arrivals, the two-trial rule, and measures calling the provider every time against the breaker on the same script; pins the animation fixtures to the solution.' },
    { path: 'python/fixtures/calls.json', role: 'fixture', language: 'json', source: callsFixture,
      description: 'The ten calls with their scripted answers, the threshold, the cooldown, and the recovery count exactly as the lesson files define them; the animation runs on this copy and a test pins it to the files.' },
  ],

  evidence: (
    <>
      <p>
        <strong>What the file checks</strong> before it prints <code>OK</code>: seven calls reach the provider,
        exactly c5, c6, and c8 are skipped, c7 is the trial after the first cooldown, and the breaker ends closed.
        Run your copy and compare its output with the expected output above; they must match line for line.
      </p>
      <p>
        <strong>The failure cases.</strong> The demonstration feeds <code>protect</code> a call stamped 0.5 seconds
        after one stamped 1.0, and the time-order guard raises a <code>ValueError</code> that the demonstration
        prints as the rejected line instead of measuring a cooldown backwards. A threshold of 0 or a cooldown of 0
        raises the same way. The tests in the project download also show that two failures, a success, and two more
        failures never open the breaker (the success resets the run), that the third failure opens it and not the
        second, that a call arriving exactly when the cooldown ends is the trial while one a thousandth of a second
        earlier is skipped, and that a failed trial starts a fresh cooldown from its own timestamp.
      </p>
      <p>
        <strong>What shipped, on the same script.</strong> With every call forwarded, all 10 reach the provider and 7
        fail, each one waiting out the full timeout before the gateway can answer. With the breaker, 7 calls reach the
        provider and 4 fail; the 3 skipped calls are answered at once, and on this script every one of them would
        have failed anyway, so no answer was lost. That last part is not guaranteed: a second script in the tests
        has the provider recover during the cooldown, and the call that arrives then is skipped although it would
        have succeeded. That is the price of failing fast, and the cooldown length is where it is paid.
      </p>
    </>
  ),

  solution: (
    <>
      <p>
        Read the file top to bottom: the settings and the scripted calls, one function that does the work, and a
        demonstration. Here is its Python, construct by construct.
      </p>
      <ol>
        <li>
          <strong>Guard clauses first.</strong> <code>if threshold &lt; 1: raise ValueError(...)</code> and the same
          for a cooldown that is not positive. A <code>raise</code> stops the function at once with a message, so bad
          settings never produce a half-finished table.
        </li>
        <li>
          <strong>State before the loop.</strong> <code>state = &quot;closed&quot;</code> holds the state as a plain
          string: comparing it with <code>==</code> in the branches below is the whole state machine, no class or
          enumeration needed. Beside it, <code>failures = 0</code> counts failures in a row, <code>opened_at = 0.0</code>{' '}
          remembers when the breaker opened, and <code>last_time = 0.0</code> serves the time-order guard. Every
          iteration reads and rewrites these; the breaker remembers what the previous call left behind.
        </li>
        <li>
          <strong>The time-order guard.</strong> <code>if t &lt; last_time:</code> compares this arrival with the one
          before it and raises with the call&apos;s id and both times; then <code>last_time = t</code>.
        </li>
        <li>
          <strong>The open branch and <code>continue</code>.</strong> <code>if state == &quot;open&quot;:</code> asks
          first whether the cooldown has passed: <code>if t - opened_at &gt;= cooldown:</code> moves the state to{' '}
          <code>&quot;half-open&quot;</code> so this call becomes the trial. Otherwise the record{' '}
          <code>(call[&quot;id&quot;], t, &quot;open&quot;, &quot;skipped&quot;, &quot;open&quot;)</code> is appended
          and <code>continue</code> jumps straight to the next call: nothing below runs, so the provider is never
          asked. That one keyword is the breaker doing its job.
        </li>
        <li>
          <strong>The call goes through.</strong> <code>before = state</code> keeps the state for the record (after
          the move to half-open, so a trial is labelled as one), and <code>outcome = call[&quot;provider&quot;]</code>{' '}
          reads the scripted answer. In production this line is the real request.
        </li>
        <li>
          <strong>The half-open branch.</strong> <code>if state == &quot;half-open&quot;:</code> then a good outcome
          sets <code>state = &quot;closed&quot;</code>, <code>failures = 0</code>, and the action{' '}
          <code>&quot;trial ok&quot;</code>; a bad one sets <code>state = &quot;open&quot;</code>,{' '}
          <code>opened_at = t</code> (a fresh cooldown counted from now), and <code>&quot;trial failed&quot;</code>.
        </li>
        <li>
          <strong>The closed branch.</strong> The <code>else</code> handles the normal state: a good outcome resets{' '}
          <code>failures = 0</code>; a bad one does <code>failures += 1</code> (add one in place) and then{' '}
          <code>if failures &gt;= threshold:</code> opens the breaker and records <code>opened_at = t</code>. The
          counter only ever reaches the threshold on consecutive failures because every success zeroes it.
        </li>
        <li>
          <strong>One record per call, and the demonstration.</strong> <code>records.append((call[&quot;id&quot;], t, before, action, state))</code>{' '}
          stores a five-value tuple; the demonstration unpacks it in its loop header. The format specs{' '}
          <code>{'{before:<9}'}</code> and <code>{'{action:<12}'}</code> pad words on the right so the columns line
          up; a second loop sorts ids into <code>reached</code>, <code>returned_failure</code>, and{' '}
          <code>skipped</code>, where <code>action == &quot;failed&quot; or action == &quot;trial failed&quot;</code>{' '}
          joins two comparisons with <code>or</code>; <code>try</code> and <code>except ValueError</code> show the
          rejection without crashing; each <code>assert</code> checks one claim before <code>OK</code>.
        </li>
      </ol>
      <p><strong>Trace the variables.</strong> Follow <code>state</code>, <code>failures</code>, and the time since the breaker opened through the ten calls:</p>
      <table>
        <thead><tr><th>call</th><th>arrives</th><th>state before</th><th>counter or cooldown</th><th>provider</th><th>action</th><th>state after</th></tr></thead>
        <tbody>
          <tr><td>c1</td><td>0.0</td><td>closed</td><td>failures 0</td><td>ok</td><td>ok</td><td>closed</td></tr>
          <tr><td>c2</td><td>0.4</td><td>closed</td><td>failures 1 of 3</td><td>fail</td><td>failed</td><td>closed</td></tr>
          <tr><td>c3</td><td>0.8</td><td>closed</td><td>failures 2 of 3</td><td>fail</td><td>failed</td><td>closed</td></tr>
          <tr><td>c4</td><td>1.2</td><td>closed</td><td>failures 3 of 3: opens at 1.2</td><td>fail</td><td>failed</td><td>open</td></tr>
          <tr><td>c5</td><td>1.5</td><td>open</td><td>0.3 s of 2.0 passed</td><td>not asked</td><td>skipped</td><td>open</td></tr>
          <tr><td>c6</td><td>2.0</td><td>open</td><td>0.8 s of 2.0 passed</td><td>not asked</td><td>skipped</td><td>open</td></tr>
          <tr><td>c7</td><td>3.3</td><td>half-open</td><td>2.1 s passed: trial</td><td>fail</td><td>trial failed</td><td>open (opens at 3.3)</td></tr>
          <tr><td>c8</td><td>4.0</td><td>open</td><td>0.7 s of 2.0 passed</td><td>not asked</td><td>skipped</td><td>open</td></tr>
          <tr><td>c9</td><td>5.4</td><td>half-open</td><td>2.1 s passed: trial</td><td>ok</td><td>trial ok</td><td>closed</td></tr>
          <tr><td>c10</td><td>5.8</td><td>closed</td><td>failures 0</td><td>ok</td><td>ok</td><td>closed</td></tr>
        </tbody>
      </table>
      <p>
        The first failure after c1 starts the run; c4 is the third in a row and opens the breaker at 1.2 seconds.
        c5 and c6 arrive 0.3 and 0.8 seconds later, inside the cooldown, and are turned back without a provider
        call. c7 arrives 2.1 seconds after the breaker opened, so it is the trial; the provider is still failing,
        and the breaker reopens with its cooldown counted from 3.3. c8 is skipped at 0.7 seconds. c9, 2.1 seconds
        after the second opening, is the next trial; it succeeds and the breaker closes with the counter at zero,
        so c10 flows through as a normal call.
      </p>
      <p>
        <strong>Why these decisions.</strong> The state is a string rather than a class because three names and a
        few comparisons are the whole machine, and a reader can see every transition in one screen. The cooldown
        is checked lazily, when a call arrives, instead of by a timer: nothing runs between calls, and the function
        stays a pure loop over a list, which is what makes it testable. Only consecutive failures count, so one
        unlucky call never trips the breaker. A single trial is let through rather than all traffic, because a
        provider that is still down should see one request, not a stampede. The time-order guard is there because
        the whole open state is one timestamp, and a backwards clock would end the cooldown early.
      </p>
      <p>
        <strong>The pattern, and its limits.</strong> A string state, a counter, and a timestamp rewritten inside a
        loop is the plain Python form of a state machine, and the three-state breaker is the standard shape for
        protecting a dependency: fail fast while it is down, probe gently to find out when it is back. Its limits:
        a skipped call fails even when the provider would have answered; the threshold and cooldown are guesses
        tuned by hand; the state lives in one process, so several gateway instances each learn about the outage
        separately; and a breaker needs a fallback to be useful, an error the client can handle or a cheaper model
        to route to.
      </p>
    </>
  ),

  visual: (
    <figure className="fig">
      <CircuitBreakerViz />
      <figcaption className="fig-cap">
        <span className="fig-caption-text">
          The function from the file, run on its own ten calls at a reading pace: about two and a half seconds per
          call, about half a minute in all. The calls sit on a time axis; the badge between the gateway and the
          provider is the breaker, colored by its state (closed green, open red, half-open amber), with its
          failure counter as three boxes and its cooldown as a draining bar. Each beat sends the call along the
          wire to the provider and colors its chip with the answer, or turns it back at the breaker with a hollow
          red chip and no provider call. The log on the right keeps every state. The practice variation replays
          the two-trial rule. Step through with the buttons. The figure rests for two minutes before it plays
          again, and the motion setting in the site header can slow or stop it. Every state and action comes from
          the same function run in the browser and is compared with the Python run.
        </span>
      </figcaption>
    </figure>
  ),

  tradeoffs: [
    {
      name: 'Call the provider every time and rely on retries with backoff (what shipped)',
      preferWhen: 'Failures are rare and independent, one slow call now and then, so there is no run to detect and nothing to tune: the simplest gateway.',
      cost: 'During an outage every call still waits out the full timeout, and the retries behind each one multiply the load on a provider that is already failing: on this script 10 provider calls and 7 failures, each paid in full by its caller.',
    },
    {
      name: 'A circuit breaker in the gateway (this lesson)',
      preferWhen: 'Failures arrive in episodes and failing fast beats waiting: the breaker turns a run of timeouts into immediate errors and probes the provider with one call per cooldown, in a string, a counter, and a timestamp.',
      cost: 'A skipped call fails at once even when the provider would have answered (the tests show one); the threshold and cooldown are tuned by hand; and the state lives in one process, so several gateway instances each discover the outage on their own.',
    },
    {
      name: 'Failover to a second provider or a smaller fallback model behind a health check',
      preferWhen: 'A fallback exists and a degraded answer beats an error: the gateway routes around the outage instead of refusing, and a health probe decides when to route back.',
      cost: 'A second integration to keep working, answers of different quality from the two paths, and a health probe that can itself lie or lag, so the breaker logic is still needed on each path.',
    },
  ],
};
