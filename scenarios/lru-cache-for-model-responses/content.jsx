import CodeBlock from '../../src/components/CodeBlock.jsx';
import LruCacheViz from './visuals/LruCacheViz.jsx';
import solutionSource from './python/src/response_cache/solution.py?raw';
import starterSource from './python/src/response_cache/starter.py?raw';
import answerSource from './python/src/response_cache/practice_answer.py?raw';
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
        Orbit&apos;s assistant answers the same ten questions all day: how to rotate a key, which scope list calls
        need, where the invoice is. Every one of them was a call to the hosted model, including the same question
        asked a minute later with different capitals and an extra space. The bill and the latency scaled with the
        repeats, not with the questions.
      </p>
      <p>
        <strong>The action to practice:</strong> keep recent answers in a plain dictionary keyed by the normalized
        prompt, and evict the least recently used entry when the cache is full. A Python dictionary remembers the
        order its keys were inserted, which is the whole trick. The rules are small:
      </p>
      <ul>
        <li>The key is the prompt lowercased, with every run of whitespace collapsed to one space.</li>
        <li>A hit returns the cached answer and the entry becomes the most recent: delete the key, then insert it again.</li>
        <li>A miss calls the model, stores the answer as the most recent entry, and counts one model call.</li>
        <li>When the dictionary holds more than the capacity, the first key, which is always the oldest, is evicted.</li>
        <li>A capacity below 1 is rejected with a <code>ValueError</code>; the request list is never modified.</li>
      </ul>
      <p>
        <strong>Input.</strong> Nine requests in arrival order, inline as a list of dictionaries, with the minute each
        arrived; four distinct questions once normalized. Capacity 3, and a fake model that returns one canned answer
        per question:
      </p>
      <table>
        <thead><tr><th>id</th><th>min</th><th>prompt as typed</th><th>key</th></tr></thead>
        <tbody>
          <tr><td>r1</td><td>0</td><td>Rotate a key?</td><td>rotate a key?</td></tr>
          <tr><td>r2</td><td>15</td><td>List call scope?</td><td>list call scope?</td></tr>
          <tr><td>r3</td><td>20</td><td>Find my invoice?</td><td>find my invoice?</td></tr>
          <tr><td>r4</td><td>25</td><td>rotate a key?</td><td>rotate a key?</td></tr>
          <tr><td>r5</td><td>28</td><td>LIST call scope?</td><td>list call scope?</td></tr>
          <tr><td>r6</td><td>30</td><td>Lost key recovery?</td><td>lost key recovery?</td></tr>
          <tr><td>r7</td><td>42</td><td>Rotate&nbsp;&nbsp;a key?</td><td>rotate a key?</td></tr>
          <tr><td>r8</td><td>44</td><td>List call scope?</td><td>list call scope?</td></tr>
          <tr><td>r9</td><td>46</td><td>Find my invoice?</td><td>find my invoice?</td></tr>
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
        Change one behavior. Cached answers can go stale: a status answer from forty minutes ago may be wrong now.
        Give every entry a time to live. Each entry now stores the answer together with the minute it was inserted,
        and each request carries the minute it arrived. A hit whose entry is older than <code>TTL_MINUTES</code>{' '}
        counts as <code>expired</code>: remove it, call the model again, and insert the fresh answer with the current
        minute. A hit inside the time to live keeps its original minute. The file below is the worked solution with
        the entries already stored as pairs and a <code>ttl</code> parameter that is accepted but not used yet, plus
        a check for the new behavior. As shipped it prints <code>NOT OK</code> and stops.
      </p>
      <p>
        <strong>Hint.</strong> On a hit, unpack the stored pair into the answer and the minute it was inserted,
        compare the age (<code>now - inserted_at</code>) with the time to live, and either refresh the entry as
        before or delete it, count it as expired, and fall through to the miss path below. Nothing else changes.
      </p>
      <p>
        <strong>Expected result.</strong> r7 arrives at minute 42 and finds the answer inserted at minute 0, which is
        42 minutes old, so it expires and the model is called a sixth time; r8 at minute 44 finds an entry from
        minute 15, 29 minutes old, still a hit. The totals become 6 calls, 3 hits, 1 expired, 2 evictions, and the
        file ends with <code>OK</code>.
      </p>
      <details>
        <summary>Show the answer</summary>
        <CodeBlock filename="Practice answer" code={answerSnippet} />
        <p>
          One comparison inside the hit branch and an <code>outcome</code> variable that starts as{' '}
          <code>&quot;miss&quot;</code>. A fresh entry refreshes the entry as before; a stale one is deleted and
          counted, and the code falls through to the same miss path that calls the model and inserts the pair with
          the current minute. Everything outside the marked region is the practice file unchanged.
        </p>
      </details>
    </>
  ),

  files: [
    { path: 'python/src/response_cache/solution.py', role: 'reference', language: 'python', source: solutionSource, primary: true,
      description: 'The complete worked example: the nine requests, the canned answers, key_for, the fake model, cached_answer, and a demonstration that prints every outcome, the totals, the rejected capacity, and OK. Runs alone with Python 3.11 or newer.' },
    { path: 'python/src/response_cache/starter.py', role: 'starter', language: 'python', source: starterSource, primary: true,
      description: 'The practice file: the worked solution with entries stored as (answer, minute) pairs and a ttl parameter that is not used yet, and a check for the new behavior. Prints NOT OK until a stale entry expires and the model is called again.' },
    { path: 'python/src/response_cache/practice_answer.py', role: 'reference', language: 'python', source: answerSource,
      description: 'The completed practice variation; the page shows the region between its answer markers.' },
    { path: 'python/fixtures/expected-output.txt', role: 'fixture', language: 'text', source: expectedOutput,
      description: 'What solution.py prints, byte for byte. The test runs the file alone and compares.' },
    { path: 'python/fixtures/expected-practice-output.txt', role: 'fixture', language: 'text', source: expectedPracticeOutput,
      description: 'What practice_answer.py prints, byte for byte.' },
    { path: 'python/tests/test_lesson.py', role: 'test', language: 'python', source: lessonTests,
      description: 'Runs the three lesson files alone, checks the key normalization, the recency refresh, the eviction order, the capacity guard, the expiry, and the fixtures, and measures no cache and first-in-first-out against least-recently-used on the same requests.' },
    { path: 'python/fixtures/requests.json', role: 'fixture', language: 'json', source: requestsFixture,
      description: 'The nine requests, the capacity, the time to live, and the canned answers exactly as the lesson files define them; the animation runs on this copy and a test pins it to the files.' },
  ],

  evidence: (
    <>
      <p>
        <strong>What the file checks</strong> before it prints <code>OK</code>: five model calls, four hits, and two
        evictions; the final cache order is <code>rotate a key?</code>, <code>list call scope?</code>,{' '}
        <code>find my invoice?</code>, oldest first; and a cached answer is the model&apos;s answer. Run your copy and
        compare its output with the expected output above; they must match line for line.
      </p>
      <p>
        <strong>The failure case.</strong> A capacity of 0 would evict every answer the moment it was stored, so{' '}
        <code>cached_answer</code> raises <code>ValueError</code> for any capacity below 1 and the demonstration
        prints the rejected line. The tests in the project download also check that a capacity of 1 keeps only the
        latest answer, that a hit returns exactly what the miss stored, and that the request list is unchanged.
      </p>
      <p>
        <strong>What shipped, on the same requests.</strong> No cache: nine model calls for four distinct questions.
        A first-in-first-out cache of the same size, which stores answers but never refreshes a hit: seven calls,
        because by the time r7 and r8 arrive their answers were already evicted. The least-recently-used cache:
        five calls, because the hits at r4 and r5 moved those two answers to the recent end and r6 evicted the
        invoice answer instead. Both measurements are tests in the project download.
      </p>
    </>
  ),

  solution: (
    <>
      <p>
        Read the file top to bottom: the input, the key function, the fake model, the one function that does the
        work, and a demonstration. Here is its Python, construct by construct.
      </p>
      <ol>
        <li>
          <strong>The key.</strong> <code>&quot; &quot;.join(prompt.lower().split())</code> chains three string
          operations: <code>lower()</code> returns a lowercase copy, <code>split()</code> with no argument splits on
          any run of whitespace and drops the empty pieces, and <code>&quot; &quot;.join(...)</code> glues the
          pieces back with single spaces. <code>Rotate&nbsp;&nbsp;a key?</code> and <code>rotate a key?</code>{' '}
          become the same key.
        </li>
        <li>
          <strong>A dictionary remembers insertion order.</strong> Since Python 3.7, iterating a dictionary yields
          its keys in the order they were inserted, so the first key is the oldest entry. <code>cache = {'{}'}</code>{' '}
          starts it empty, and <code>key in cache</code> asks whether a key is present, a constant-time lookup
          however many answers are stored.
        </li>
        <li>
          <strong>The refresh.</strong> On a hit, <code>del cache[key]</code> removes the entry from its old
          position and <code>cache[key] = answer</code> inserts it again, so it lands at the end as the most recent.
          Deleting and reinserting is all it takes to make the dictionary a least-recently-used list.
        </li>
        <li>
          <strong>The eviction.</strong> <code>iter(cache)</code> makes an iterator over the keys and{' '}
          <code>next(...)</code> takes its first item, the oldest key, without writing a loop. After the miss inserts
          the new answer, <code>if len(cache) &gt; capacity:</code> evicts that key with <code>del</code>.
        </li>
        <li>
          <strong>A function as a value.</strong> <code>call_model</code> is a parameter that holds a function; the
          demonstration passes <code>fake_model</code>, and production code would pass the real client function.
          The cache never needs to know what it is calling.
        </li>
        <li>
          <strong>Counters passed in.</strong> <code>stats</code> is a dictionary the caller owns.{' '}
          <code>stats[&quot;hits&quot;] += 1</code> adds to it in place, and because dictionaries are shared rather
          than copied, the caller sees the new counts after every call.
        </li>
        <li>
          <strong>Three results, one return.</strong> <code>return answer, &quot;hit&quot;, None</code> hands back a
          tuple, and the demonstration unpacks it with <code>answer, outcome, evicted = cached_answer(...)</code>.{' '}
          <code>None</code> says nothing was evicted; a small <code>if evicted is not None:</code> turns it into a
          dash for the table.
        </li>
        <li>
          <strong>The guard.</strong> <code>if capacity &lt; 1: raise ValueError(...)</code> runs before anything
          else, and the demonstration&apos;s <code>try</code> and <code>except ValueError</code> print the rejection.
        </li>
        <li>
          <strong>The demonstration.</strong> <code>&quot; | &quot;.join(cache)</code> joins the keys in order,
          because iterating a dictionary yields keys. The format specs <code>{'{outcome:<7}'}</code> and{' '}
          <code>{'{shown:<18}'}</code> left-align the columns, and each <code>assert</code> checks one claim before{' '}
          <code>OK</code>.
        </li>
      </ol>
      <p><strong>Trace the variables.</strong> Follow the cache order and the counters through the nine requests:</p>
      <table>
        <thead><tr><th>req</th><th>key</th><th>outcome</th><th>evicted</th><th>cache after, oldest first</th><th>calls</th></tr></thead>
        <tbody>
          <tr><td>r1</td><td>rotate a key?</td><td>miss</td><td></td><td>rotate</td><td>1</td></tr>
          <tr><td>r2</td><td>list call scope?</td><td>miss</td><td></td><td>rotate, scope</td><td>2</td></tr>
          <tr><td>r3</td><td>find my invoice?</td><td>miss</td><td></td><td>rotate, scope, invoice</td><td>3</td></tr>
          <tr><td>r4</td><td>rotate a key?</td><td>hit</td><td></td><td>scope, invoice, rotate</td><td>3</td></tr>
          <tr><td>r5</td><td>list call scope?</td><td>hit</td><td></td><td>invoice, rotate, scope</td><td>3</td></tr>
          <tr><td>r6</td><td>lost key recovery?</td><td>miss</td><td>invoice</td><td>rotate, scope, recovery</td><td>4</td></tr>
          <tr><td>r7</td><td>rotate a key?</td><td>hit</td><td></td><td>scope, recovery, rotate</td><td>4</td></tr>
          <tr><td>r8</td><td>list call scope?</td><td>hit</td><td></td><td>recovery, rotate, scope</td><td>4</td></tr>
          <tr><td>r9</td><td>find my invoice?</td><td>miss</td><td>recovery</td><td>rotate, scope, invoice</td><td>5</td></tr>
        </tbody>
      </table>
      <p>
        The first three requests fill the cache. r4 and r5 are hits that move their keys to the recent end, which
        leaves the invoice answer as the oldest, so r6&apos;s miss evicts it. r7 and r8 hit again and push the
        recovery answer to the front of the queue, so r9&apos;s miss evicts that one and the invoice answer is
        fetched a second time: five calls for nine requests.
      </p>
      <p>
        <strong>Why these decisions.</strong> The prompt is normalized because the repeats were never byte-equal;
        without the key function the three spellings of the key rotation question would be three entries.
        Least-recently-used rather than first-in-first-out because a question asked again is likely to be asked a
        third time, and refreshing on a hit keeps exactly those answers. The capacity is 3 to make every eviction
        visible on one screen; a production cache holds thousands. The outcome and the evicted key are returned so
        the caller can log hit rates, and the counters live in a dictionary the caller passes in rather than in a
        global, so two caches never share one tally.
      </p>
      <p>
        <strong>The pattern, and its limits.</strong> Normalize to a key, look it up in an insertion-ordered
        dictionary, refresh on a hit, evict the first key on overflow. Python&apos;s <code>functools.lru_cache</code>{' '}
        decorator does the same for a pure function in one line; it is written out here because the key is
        normalized, the counts are visible, and the eviction is explicit. Its limits: the cache lives in one
        process, so a restart empties it and two instances do not share it; nothing expires an answer when the
        knowledge base changes, which is what the practice variation adds; answers that depend on who is asking
        must never be cached without the user in the key; and an exact key misses a paraphrase, which a semantic
        cache catches at the risk of returning a confident answer to a different question.
      </p>
    </>
  ),

  visual: (
    <figure className="fig">
      <LruCacheViz />
      <figcaption className="fig-cap">
        <span className="fig-caption-text">
          The function from the file, run on its own nine requests at a reading pace: about two and a half seconds
          per request, about half a minute in all. The queue along the top marks each request as it is handled; the
          box shows the prompt as typed and its key; the shelf holds the cache with the oldest entry on the left. A
          hit slides its slot to the recent end, a miss enters a new slot, and over capacity the oldest slot drops
          into the evicted tray. Bars compare the model calls so far with no cache, and the outro adds the
          first-in-first-out count; the practice beat replays r7&apos;s expiry against the forty-minute time to
          live. Step through with the buttons. The figure rests for two minutes before it plays again, and the
          motion setting in the site header can slow or stop it. Every outcome comes from the same logic run in the
          browser and is compared with the Python run.
        </span>
      </figcaption>
    </figure>
  ),

  tradeoffs: [
    {
      name: 'No cache (what shipped)',
      preferWhen: 'Answers depend on fresh data or on who is asking, traffic has few repeats, or a model call is cheap next to the engineering of a cache.',
      cost: 'On the nine requests, nine model calls for four distinct questions. Latency and spend scale with every repeat, and the same question asked with a capital letter pays again.',
    },
    {
      name: 'An in-process LRU cache keyed by normalized prompt (this lesson)',
      preferWhen: 'A single service instance, repeated short questions, and answers that stay valid for a while; a few dozen lines with no new infrastructure.',
      cost: 'Five calls instead of nine here, but the cache lives in one process: a restart empties it, two instances do not share it, and without a time to live a stale answer survives until it is evicted.',
    },
    {
      name: 'A shared cache (Redis) keyed by a prompt hash, or a semantic cache',
      preferWhen: 'Many instances serving the same traffic, hit rates worth a network hop, or paraphrased questions that an exact key misses.',
      cost: 'One more system to run and secure and an expiry policy to design. A semantic cache adds a similarity threshold, and below it the cache can return a confident answer to a slightly different question.',
    },
  ],
};
