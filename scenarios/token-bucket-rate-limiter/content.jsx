import CodeBlock from '../../src/components/CodeBlock.jsx';
import TokenBucketViz from './visuals/TokenBucketViz.jsx';
import solutionSource from './python/src/token_bucket/solution.py?raw';
import starterSource from './python/src/token_bucket/starter.py?raw';
import answerSource from './python/src/token_bucket/practice_answer.py?raw';
import lessonTests from './python/tests/test_lesson.py?raw';
import expectedOutput from './python/fixtures/expected-output.txt?raw';
import expectedPracticeOutput from './python/fixtures/expected-practice-output.txt?raw';
import requestsFixture from './python/fixtures/requests.json?raw';

// Authored by Claude Fable 5 in the main thread. Every number on this page was
// produced by running the files below; the expected outputs are the files'
// actual output, compared byte for byte by the tests.
const answerSnippet = answerSource.split('# --- answer begins ---\n')[1].split('# --- answer ends ---')[0].trim();

export const content = {
  brief: (
    <>
      <p>
        Orbit&apos;s gateway forwarded every request to the hosted model the instant it arrived. One afternoon a batch
        job sent twenty requests inside a second, the provider&apos;s rate limit rejected all twenty, and the retries
        that followed kept the endpoint over the limit for another minute. The provider allows a steady rate with a
        little room for bursts; the gateway was enforcing nothing.
      </p>
      <p>
        <strong>The action to practice:</strong> admit or reject each request with a token bucket, written as a
        few lines of state carried through a loop. The rules fit in four sentences:
      </p>
      <ul>
        <li>The bucket holds at most <code>capacity</code> tokens and starts full; that is the burst allowance.</li>
        <li>Tokens trickle in at <code>rate</code> per second. On each arrival the bucket is brought up to date for the time passed since the previous arrival, and <code>min</code> keeps it from going past the top.</li>
        <li>A request that finds at least one token takes one and is admitted; a request that finds less than one is rejected and spends nothing.</li>
        <li>Arrivals must be in time order; a timestamp earlier than the previous one raises a <code>ValueError</code>, because a bucket run backwards would refill from the future.</li>
      </ul>
      <p>
        <strong>Input.</strong> Eight requests, inline as a list of dictionaries with an id and an arrival time in
        seconds, against a capacity of 3 and a refill of 1.0 per second. Four arrive inside the first second, two
        more at 1.5 and 1.6, and two late ones at 4.0 and 4.1:
      </p>
      <table>
        <thead><tr><th>id</th><th>q1</th><th>q2</th><th>q3</th><th>q4</th><th>q5</th><th>q6</th><th>q7</th><th>q8</th></tr></thead>
        <tbody>
          <tr><td>arrives at</td><td>0.0</td><td>0.2</td><td>0.4</td><td>0.6</td><td>1.5</td><td>1.6</td><td>4.0</td><td>4.1</td></tr>
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
        Change one behavior. The worked solution keeps one bucket for everyone, so one tenant&apos;s burst empties it
        for the others: the two rejected requests, q4 and q6, both belong to tenant b, which sent nothing else in
        that second. Give each tenant its own bucket. The file below is the worked solution with a{' '}
        <code>tenant</code> field on every request, an empty <code>buckets</code> dictionary that is not used yet,
        and a check for the new behavior. As shipped it prints <code>NOT OK</code> and stops.
      </p>
      <p>
        <strong>Hint.</strong> Inside the loop, read the request&apos;s tenant and test whether it is already a key
        of <code>buckets</code> with <code>in</code>. When it is not, store a small dictionary for it holding the
        tokens (a full bucket) and the last time (zero). Then run the same four lines, the elapsed time, the capped
        refill, the record of the time, and the spend, on that stored dictionary instead of the shared variables.
        The time-order guard stays shared, because arrivals are still one stream.
      </p>
      <p>
        <strong>Expected result.</strong> Every one of the eight requests is admitted: q4 and q6 find tenant b&apos;s
        own bucket full at 3.00 when they arrive. The file prints the table with a tenant column, then{' '}
        <code>tenant a: 5 admitted, 0 rejected</code> and <code>tenant b: 3 admitted, 0 rejected</code>, and ends
        with <code>OK</code>.
      </p>
      <details>
        <summary>Show the answer</summary>
        <CodeBlock filename="Practice answer" code={answerSnippet} />
        <p>
          The shared <code>tokens</code> and the shared refill time become two entries of a per-tenant dictionary,
          created full the first time a tenant appears, and every line that touched the shared bucket now touches{' '}
          <code>bucket</code> instead. Notice what the change gives up: the gateway no longer bounds the total rate
          to the provider, only each tenant&apos;s share. A production gateway usually keeps both, a bucket per tenant
          and one shared bucket behind them. Everything outside the marked region is the practice file unchanged.
        </p>
      </details>
    </>
  ),

  files: [
    { path: 'python/src/token_bucket/solution.py', role: 'reference', language: 'python', source: solutionSource, primary: true,
      description: 'The complete worked example: the eight arrivals, the settings, admit, and a demonstration that prints the decision table, the counts, the rejected out-of-order run, and OK. Runs alone with Python 3.11 or newer.' },
    { path: 'python/src/token_bucket/starter.py', role: 'starter', language: 'python', source: starterSource, primary: true,
      description: 'The practice file: the worked solution with a tenant on every request and an unused buckets dictionary, and a check for the new behavior. Prints NOT OK until admit keeps one bucket per tenant.' },
    { path: 'python/src/token_bucket/practice_answer.py', role: 'reference', language: 'python', source: answerSource,
      description: 'The completed practice variation; the page shows the region between its answer markers.' },
    { path: 'python/fixtures/expected-output.txt', role: 'fixture', language: 'text', source: expectedOutput,
      description: 'What solution.py prints, byte for byte. The test runs the file alone and compares.' },
    { path: 'python/fixtures/expected-practice-output.txt', role: 'fixture', language: 'text', source: expectedPracticeOutput,
      description: 'What practice_answer.py prints, byte for byte.' },
    { path: 'python/tests/test_lesson.py', role: 'test', language: 'python', source: lessonTests,
      description: 'Runs the three lesson files alone, checks every level and decision, the refill cap, the exact-token boundary, the rejected settings and arrivals, the per-tenant buckets, and measures forwarding everything against the bucket on the same arrivals; pins the animation fixtures to the solution.' },
    { path: 'python/fixtures/requests.json', role: 'fixture', language: 'json', source: requestsFixture,
      description: 'The eight arrivals with their tenants, the capacity, the rate, and the evaluation windows exactly as the lesson files define them; the animation runs on this copy and a test pins it to the files.' },
  ],

  evidence: (
    <>
      <p>
        <strong>What the file checks</strong> before it prints <code>OK</code>: six admitted, exactly q4 and q6
        rejected, and no level above the capacity at any arrival. Run your copy and compare its output with the
        expected output above; they must match line for line.
      </p>
      <p>
        <strong>The failure cases.</strong> The demonstration feeds <code>admit</code> a request at 0.5 seconds after
        one at 1.0, and the time-order guard raises a <code>ValueError</code> that the demonstration prints as the
        rejected line instead of refilling from the future. A capacity of 0 or a rate of 0 raises the same way. The
        tests in the project download also drain the bucket with three arrivals at time zero and show that a request
        at exactly 1.0 seconds is admitted on the one token that has refilled, while one at 0.999 is rejected; that
        a gap of a hundred seconds refills to exactly the capacity and no further; and that a rejected request never
        changes the level.
      </p>
      <p>
        <strong>What shipped, on the same arrivals.</strong> With nothing in the way, six of the eight requests
        reach the provider inside 1.6 seconds, and the busiest one-second window carries four, against a sustained
        allowance of one per second. With the bucket, the busiest one-second window carries three admissions,
        inside the bound of four (the capacity plus one second of refill), and that bound holds for any arrival
        pattern. The practice
        variation admits all eight on the same arrivals, because the two rejections were tenant b paying for tenant
        a&apos;s burst. All three measurements are tests in the project download.
      </p>
    </>
  ),

  solution: (
    <>
      <p>
        Read the file top to bottom: the settings and the arrivals, one function that does the work, and a
        demonstration. Here is its Python, construct by construct.
      </p>
      <ol>
        <li>
          <strong>Guard clauses first.</strong> <code>if capacity &lt; 1: raise ValueError(...)</code> and the same
          for a rate that is not positive. A <code>raise</code> stops the function at once with a message; checking
          the settings before the loop means no half-finished work when they are wrong.
        </li>
        <li>
          <strong>State before the loop.</strong> <code>tokens = float(capacity)</code> and <code>last_time = 0.0</code>{' '}
          are created once, outside the loop, and every iteration reads and rewrites them. That is the whole idea of
          state carried across iterations: the bucket remembers what the previous request left behind. The{' '}
          <code>float</code> call makes the level a decimal number from the start, so the arithmetic below never
          mixes integers in.
        </li>
        <li>
          <strong>The time-order guard.</strong> <code>if t &lt; last_time:</code> compares this arrival with the one
          before it. The f-string in the error names the request and both times, so the caller can see which record
          was out of place.
        </li>
        <li>
          <strong>The refill, capped.</strong> <code>elapsed = t - last_time</code> is the time passed, and{' '}
          <code>tokens = min(capacity, tokens + elapsed * rate)</code> adds the tokens earned in that time and takes
          the smaller of that sum and the capacity. <code>min</code> returns the smallest of its arguments, so the
          bucket can never hold more than the capacity no matter how long the gap was. Then{' '}
          <code>last_time = t</code> records that the bucket is up to date as of this arrival.
        </li>
        <li>
          <strong>The decision.</strong> <code>before = tokens</code> keeps a copy for the record. <code>if tokens &gt;= 1:</code>{' '}
          asks whether a whole token is there; if so <code>tokens -= 1</code> spends it (the augmented assignment
          subtracts in place) and the decision is <code>&quot;admit&quot;</code>; the <code>else</code> branch sets{' '}
          <code>&quot;reject&quot;</code> and leaves the level alone. A rejected request costs nothing, which is what
          lets the level recover.
        </li>
        <li>
          <strong>One record per request.</strong> <code>records.append((request[&quot;id&quot;], t, before, decision, tokens))</code>{' '}
          builds a tuple of five values and adds it to the list; the parentheses inside the call are the tuple. The
          function returns the list, and the demonstration unpacks each tuple in its loop header,{' '}
          <code>for request_id, t, before, decision, after in records:</code>, five names for five positions.
        </li>
        <li>
          <strong>The demonstration.</strong> The format specs line the table up: <code>{'{t:>4.2f}'}</code> prints
          two decimals right aligned in four columns and <code>{'{decision:<8}'}</code> pads the word on the right.
          A second loop sorts the ids into <code>admitted</code> and <code>rejected</code> lists,{' '}
          <code>&quot;, &quot;.join(rejected)</code> prints a list as one line, <code>try</code> and{' '}
          <code>except ValueError</code> show the rejection without crashing, and each <code>assert</code> checks one
          claim before <code>OK</code>.
        </li>
      </ol>
      <p><strong>Trace the variables.</strong> Follow <code>elapsed</code>, the refill, and the decision through the eight arrivals:</p>
      <table>
        <thead><tr><th>request</th><th>arrives</th><th>elapsed</th><th>refilled to</th><th>decision</th><th>after</th></tr></thead>
        <tbody>
          <tr><td>q1</td><td>0.0</td><td>0.0</td><td>3.00 (full)</td><td>admit</td><td>2.00</td></tr>
          <tr><td>q2</td><td>0.2</td><td>0.2</td><td>2.20</td><td>admit</td><td>1.20</td></tr>
          <tr><td>q3</td><td>0.4</td><td>0.2</td><td>1.40</td><td>admit</td><td>0.40</td></tr>
          <tr><td>q4</td><td>0.6</td><td>0.2</td><td>0.60</td><td>reject</td><td>0.60</td></tr>
          <tr><td>q5</td><td>1.5</td><td>0.9</td><td>1.50</td><td>admit</td><td>0.50</td></tr>
          <tr><td>q6</td><td>1.6</td><td>0.1</td><td>0.60</td><td>reject</td><td>0.60</td></tr>
          <tr><td>q7</td><td>4.0</td><td>2.4</td><td>3.00 (capped)</td><td>admit</td><td>2.00</td></tr>
          <tr><td>q8</td><td>4.1</td><td>0.1</td><td>2.10</td><td>admit</td><td>1.10</td></tr>
        </tbody>
      </table>
      <p>
        The burst spends the three stored tokens by q3. q4 arrives 0.2 seconds later with only 0.2 of a token
        earned, so it is rejected and the level stays at 0.60. By q5, 0.9 seconds have passed and the level is 1.50:
        enough for one. q6 follows a tenth of a second behind and finds 0.60 again. The long gap to q7 would earn 2.4
        tokens on top of 0.60, which is more than the bucket holds, so <code>min</code> caps it at 3.00 and the
        extra time is simply lost; q7 and q8 are then served from the stored tokens.
      </p>
      <p>
        <strong>Why these decisions.</strong> The level is updated lazily, on arrival, rather than by a timer that
        adds a token every second: the arithmetic is the same, there is nothing running between requests, and the
        function stays a pure loop over a list, which is what makes it testable. The cap is in the refill line and
        not a separate check so the bucket can never be observed above the capacity. Rejecting rather than waiting
        keeps the function free of time and threads; the alternatives discuss queueing. The time-order guard is
        there because the bucket&apos;s whole state is one level and one timestamp, and a backwards timestamp would
        corrupt both silently.
      </p>
      <p>
        <strong>The pattern, and its limits.</strong> A few variables created before a loop and rewritten inside it
        are the plain Python form of a state machine, and the token bucket is the standard shape for admission
        control: a steady rate plus a burst allowance, in four lines. Its limits: this bucket lives in one process,
        so two gateway instances enforce twice the rate unless the level is kept in a shared store; the rejected
        request still needs somewhere to go, an error to the client or a queue; and the capacity and rate are
        copied from the provider&apos;s limit by hand, so they drift when the plan changes.
      </p>
    </>
  ),

  visual: (
    <figure className="fig">
      <TokenBucketViz />
      <figcaption className="fig-cap">
        <span className="fig-caption-text">
          The function from the file, run on its own eight arrivals at a reading pace: about two and a half seconds
          per arrival, about half a minute in all. The arrivals sit on a time axis; the gauge is the bucket, with
          the capacity at the top and the one-token line it must reach. Each beat refills the gauge for the time
          passed, capped at the top, then spends a token (a green chip on the axis) or refuses (a red chip and no
          change). The log on the right keeps every level. The practice variation splits the gauge into one bucket
          per tenant and replays the decisions. Step through with the buttons. The figure rests for two minutes
          before it plays again, and the motion setting in the site header can slow or stop it. Every level and
          decision comes from the same function run in the browser and is compared with the Python run.
        </span>
      </figcaption>
    </figure>
  ),

  tradeoffs: [
    {
      name: 'Forward everything and rely on retries (what shipped)',
      preferWhen: 'Traffic stays far below the provider limit and a rare burst can afford to fail: the simplest gateway, nothing to tune.',
      cost: 'A burst fails in bulk at the provider, and the retries that follow amplify it: on the eight arrivals, six reach the provider inside 1.6 seconds and four inside one second, against an allowance of one per second. The failures land on whoever sent last, with no fairness.',
    },
    {
      name: 'A token bucket at the gateway (this lesson)',
      preferWhen: 'A known steady limit with short bursts, where an immediate answer is better than a late one: the bucket bounds every one-second window at the capacity plus one second of refill, in four lines of state.',
      cost: 'A rejected request needs a client path, an error or a queue in front of the bucket. The level lives in one process, so several gateway instances need a shared store (a cache with atomic updates) to enforce one limit together, and the capacity and rate must track the provider plan.',
    },
    {
      name: 'A bounded queue with a fixed-interval dispatcher',
      preferWhen: 'No request may be dropped and callers can wait: a queue releases one request every interval (the leaky bucket shape) and absorbs bursts as latency instead of errors.',
      cost: 'Latency grows with the backlog, so the queue needs a bound and a timeout, and under sustained overload it degrades into the same rejections, only later and after holding connections open. It also needs a running dispatcher, where the token bucket is a pure function of the arrivals.',
    },
  ],
};
