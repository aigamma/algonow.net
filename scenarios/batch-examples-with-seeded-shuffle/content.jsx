import CodeBlock from '../../src/components/CodeBlock.jsx';
import BatchShuffleViz from './visuals/BatchShuffleViz.jsx';
import solutionSource from './python/src/batching/solution.py?raw';
import starterSource from './python/src/batching/starter.py?raw';
import answerSource from './python/src/batching/practice_answer.py?raw';
import lessonTests from './python/tests/test_lesson.py?raw';
import expectedOutput from './python/fixtures/expected-output.txt?raw';
import expectedPracticeOutput from './python/fixtures/expected-practice-output.txt?raw';
import examplesFixture from './python/fixtures/examples.json?raw';

// Authored by Claude Fable 5 in the main thread. Every number on this page was
// produced by running the files below; the expected outputs are the files'
// actual output, compared byte for byte by the tests.
const answerSnippet = answerSource.split('# --- answer begins ---\n')[1].split('# --- answer ends ---')[0].trim();

export const content = {
  brief: (
    <>
      <p>
        Orbit&apos;s fine-tuning script read its training examples straight from the export file, four at a time. The
        export was sorted by label, so the first batches were all billing questions and the last were all access
        questions: the loss lurched with every batch and the model learned whichever label it had seen last. Then the
        final batch held two examples instead of four, and a shape check that assumed full batches crashed the run
        at the end of the epoch.
      </p>
      <p>
        <strong>The action to practice:</strong> a generator that yields batches from a seeded shuffle. The rules fit
        in four sentences:
      </p>
      <ul>
        <li>The list is copied before it is shuffled, so the caller&apos;s list keeps its order and can still be indexed elsewhere.</li>
        <li><code>random.Random(seed).shuffle</code> reorders the copy. The same seed always gives the same order, so a run can be repeated exactly; each epoch uses the seed plus the epoch number, so the batches differ from epoch to epoch and are still reproducible.</li>
        <li>Slices of <code>batch_size</code> are yielded one at a time, and the last slice is shorter when the count does not divide evenly: ten examples in batches of four give 4, 4, and 2.</li>
        <li>A batch size below 1 raises a <code>ValueError</code> the moment the generator is first used.</li>
      </ul>
      <p>
        <strong>Input.</strong> Ten labeled examples, inline as a list of dictionaries and in file order, with a batch
        size of 4, a seed of 7, and two epochs:
      </p>
      <table>
        <thead><tr><th>id</th><th>label</th><th>prompt</th></tr></thead>
        <tbody>
          <tr><td>e1</td><td>billing</td><td>Where is my invoice?</td></tr>
          <tr><td>e2</td><td>billing</td><td>Why was I charged twice?</td></tr>
          <tr><td>e3</td><td>billing</td><td>Change the card on file</td></tr>
          <tr><td>e4</td><td>billing</td><td>Refund for last month</td></tr>
          <tr><td>e5</td><td>billing</td><td>Is tax included?</td></tr>
          <tr><td>e6</td><td>access</td><td>Reset my password</td></tr>
          <tr><td>e7</td><td>access</td><td>Rotate an API key</td></tr>
          <tr><td>e8</td><td>access</td><td>Add a teammate</td></tr>
          <tr><td>e9</td><td>access</td><td>Which scope do list calls need?</td></tr>
          <tr><td>e10</td><td>access</td><td>Revoke a lost key</td></tr>
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
        Change one behavior. The worked solution yields the ragged last batch, two examples where the others have four.
        Make <code>batches</code> skip it when <code>drop_last</code> is <code>True</code>, so every batch it yields has
        exactly <code>batch_size</code> examples and the leftover examples sit out that epoch. The file below is the
        worked solution with a <code>drop_last</code> parameter that is accepted but not used yet, and a check for the
        new behavior. As shipped it prints <code>NOT OK</code> and stops.
      </p>
      <p>
        <strong>Hint.</strong> Build the slice into a name before yielding it. When <code>drop_last</code> is true and
        the slice is shorter than <code>batch_size</code>, leave the loop with <code>break</code> instead of yielding;
        only the last slice can be short, so there is nothing after it to lose. A <code>break</code> inside a generator
        ends the loop, the function runs off its end, and the caller&apos;s <code>for</code> loop simply stops.
      </p>
      <p>
        <strong>Expected result.</strong> Each epoch yields two batches of four, eight examples in all. Epoch 1 leaves
        out e3 and e6, epoch 2 leaves out e4 and e6, and with <code>drop_last</code> false the ragged batch comes back
        as <code>[4, 4, 2]</code>. The file ends with <code>OK</code>.
      </p>
      <details>
        <summary>Show the answer</summary>
        <CodeBlock filename="Practice answer" code={answerSnippet} />
        <p>
          One name for the slice, one comparison, and a <code>break</code>. The test runs before the <code>yield</code>,
          so a short slice is never handed out; a full slice falls through to the <code>yield</code> as before.
          Everything outside the marked region is the practice file unchanged.
        </p>
      </details>
    </>
  ),

  files: [
    { path: 'python/src/batching/solution.py', role: 'reference', language: 'python', source: solutionSource, primary: true,
      description: 'The complete worked example: the ten examples, the generator, three small helpers for ids and label counts, and a demonstration that prints every batch of two epochs, the reproducibility check, the rejected batch size, and OK. Runs alone with Python 3.11 or newer.' },
    { path: 'python/src/batching/starter.py', role: 'starter', language: 'python', source: starterSource, primary: true,
      description: 'The practice file: the worked solution with a drop_last parameter that is not used yet, and a check for the new behavior. Prints NOT OK until batches skips a final batch shorter than batch_size when drop_last is True.' },
    { path: 'python/src/batching/practice_answer.py', role: 'reference', language: 'python', source: answerSource,
      description: 'The completed practice variation; the page shows the region between its answer markers.' },
    { path: 'python/fixtures/expected-output.txt', role: 'fixture', language: 'text', source: expectedOutput,
      description: 'What solution.py prints, byte for byte. The test runs the file alone and compares.' },
    { path: 'python/fixtures/expected-practice-output.txt', role: 'fixture', language: 'text', source: expectedPracticeOutput,
      description: 'What practice_answer.py prints, byte for byte.' },
    { path: 'python/tests/test_lesson.py', role: 'test', language: 'python', source: lessonTests,
      description: 'Runs the three lesson files alone, pins every batch of both seeds id by id, checks the copy, the laziness, the ragged tail, and the practice drop, pins the animation fixtures, and measures the file order that shipped against the shuffle on the same examples.' },
    { path: 'python/fixtures/examples.json', role: 'fixture', language: 'json', source: examplesFixture,
      description: 'The ten examples, the batch size, the seed, and the epoch count exactly as the lesson files define them; the animation runs on this copy and a test pins it to the files. The trace fixture it replays, which also carries the shuffled order of each epoch, ships in the project download.' },
  ],

  evidence: (
    <>
      <p>
        <strong>What the file checks</strong> before it prints <code>OK</code>: every example appears exactly once in
        each epoch, the same seed gives the same batches twice, the batch sizes are 4, 4, and 2, and the next epoch&apos;s
        seed gives a different order. Run your copy and compare its output with the expected output above; they must
        match line for line, because the standard library&apos;s shuffle is the same on every machine for the same seed.
      </p>
      <p>
        <strong>The failure case.</strong> A batch size of 0 raises <code>ValueError</code>, but not at the call:
        calling <code>batches(EXAMPLES, 0, SEED)</code> only creates the generator. The check runs on the first request
        for a batch, which is why the demonstration wraps <code>list(...)</code> in the <code>try</code> and prints the
        rejected line. The tests in the project download also check that an even split has no ragged batch, that a
        batch size past the count gives one batch, and that an empty list gives no batches.
      </p>
      <p>
        <strong>What shipped, on the same examples.</strong> Cut from file order, batch 1 is billing only and batch 3
        is access only: two of the three batches hold a single label. After the seeded shuffle every full batch holds
        both labels, 2 of 2 in each epoch (access 1, billing 3 and access 3, billing 1 in epoch 1; two and two in both
        batches of epoch 2). The ragged batch holds two examples either way, and a shape check that assumes four
        crashes on it; the practice variation is the usual fix. Both measurements are tests in the project download.
      </p>
    </>
  ),

  solution: (
    <>
      <p>
        Read the file top to bottom: the input, the generator, three small helpers, and a demonstration. Here is its
        Python, construct by construct.
      </p>
      <ol>
        <li>
          <strong>A private random generator.</strong> <code>import random</code> brings in the standard module, and{' '}
          <code>random.Random(seed)</code> creates a generator object of its own, started from the seed. Calling{' '}
          <code>.shuffle(order)</code> on it reorders the list in place and returns <code>None</code>: writing{' '}
          <code>order = random.Random(seed).shuffle(order)</code> would throw the list away, a classic trap. A private
          generator means the shuffle neither disturbs nor depends on any other random call in the program.
        </li>
        <li>
          <strong>Copy first.</strong> <code>order = list(examples)</code> builds a new list holding the same ten
          dictionaries. The shuffle rearranges the copy, so <code>EXAMPLES</code> keeps its file order, which the
          demonstration prints as <code>input order unchanged: True</code>.
        </li>
        <li>
          <strong>A generator function.</strong> Because the body contains <code>yield</code>, calling{' '}
          <code>batches(...)</code> runs none of it; it returns a generator object. Each request for the next value,
          which a <code>for</code> loop makes for you, runs the body up to the next <code>yield</code>, hands that batch
          out, and pauses there with every local variable kept. The <code>ValueError</code> check at the top therefore
          runs on the first request, not at the call, and only one batch exists at a time.
        </li>
        <li>
          <strong>Starts and slices.</strong> <code>range(0, len(order), batch_size)</code> counts 0, 4, 8: the start of
          each batch. <code>order[start:start + batch_size]</code> takes up to four items from there; a slice that runs
          past the end simply stops at the end, so the last start, 8, yields two items without any special case.
        </li>
        <li>
          <strong>Helpers that build lists and strings.</strong> <code>ids_of</code> appends one id per example.{' '}
          <code>label_mix</code> counts with <code>counts.get(label, 0) + 1</code>, where <code>get</code> returns 0 for
          a label not seen yet, and a dictionary remembers the order in which labels first appeared.{' '}
          <code>describe</code> collects <code>f&quot;{'{label} {count}'}&quot;</code> parts in a list and joins them
          with <code>&quot;, &quot;.join(parts)</code>.
        </li>
        <li>
          <strong>The epoch loop.</strong> <code>for epoch in range(EPOCHS)</code> counts 0 and 1, so{' '}
          <code>SEED + epoch</code> is 7 and then 8, and the printed epoch is <code>epoch + 1</code>.{' '}
          <code>enumerate(..., start=1)</code> numbers the batches from 1. <code>seen.extend(ids_of(batch))</code> adds
          all of a batch&apos;s ids to one list, where <code>append</code> would have added the list itself as a single
          item. The format spec <code>{'{ids:<17}'}</code> pads the id string to 17 columns, left aligned, so the label
          mixes line up.
        </li>
        <li>
          <strong>The checks.</strong> <code>sorted(seen) == sorted(ids_of(EXAMPLES))</code> proves every example was
          yielded exactly once; <code>first == again</code> compares two lists of lists of dictionaries element by
          element; <code>try</code> and <code>except ValueError as error</code> show the rejected batch size without
          crashing; each <code>assert</code> states one claim before <code>OK</code>.
        </li>
      </ol>
      <p><strong>Trace the variables.</strong> Follow <code>start</code> and the yielded slice through epoch 1, whose shuffled copy reads e9, e4, e2, e5, e8, e1, e10, e7, e3, e6, and then epoch 2:</p>
      <table>
        <thead><tr><th>epoch (seed)</th><th>start</th><th>slice</th><th>yielded</th><th>label mix</th></tr></thead>
        <tbody>
          <tr><td>1 (7)</td><td>0</td><td>order[0:4]</td><td>e9, e4, e2, e5</td><td>access 1, billing 3</td></tr>
          <tr><td>1 (7)</td><td>4</td><td>order[4:8]</td><td>e8, e1, e10, e7</td><td>access 3, billing 1</td></tr>
          <tr><td>1 (7)</td><td>8</td><td>order[8:12]</td><td>e3, e6</td><td>billing 1, access 1</td></tr>
          <tr><td>2 (8)</td><td>0</td><td>order[0:4]</td><td>e9, e3, e10, e5</td><td>access 2, billing 2</td></tr>
          <tr><td>2 (8)</td><td>4</td><td>order[4:8]</td><td>e1, e8, e2, e7</td><td>billing 2, access 2</td></tr>
          <tr><td>2 (8)</td><td>8</td><td>order[8:12]</td><td>e6, e4</td><td>access 1, billing 1</td></tr>
        </tbody>
      </table>
      <p>
        Epoch 2&apos;s shuffled copy reads e9, e3, e10, e5, e1, e8, e2, e7, e6, e4: a different permutation from the
        same ten dictionaries, because the seed is 8. Run the file again and both epochs come out identical, because
        the seeds are fixed.
      </p>
      <p>
        <strong>Why these decisions.</strong> Shuffle every epoch because a gradient step on four same-label examples
        pushes the model toward that label and the next batch pushes it back; mixed batches make each step an honest
        average. Seed the shuffle because a bad batch has to be found again: the epoch&apos;s seed and the batch number
        locate it exactly. Copy before shuffling because the caller may index into its list elsewhere, and a function
        that quietly reorders its argument is a bug that surfaces far from here. Yield instead of returning a list of
        batches because the whole epoch never needs to exist at once, which matters when the examples are streamed
        from disk. The ragged batch is yielded by default because dropping data silently is a policy decision, which is
        exactly what the practice variation makes explicit.
      </p>
      <p>
        <strong>The pattern, and its limits.</strong> Shuffle a copy with a seed, then slice it at a stride: that is what
        a framework&apos;s data loader does with <code>shuffle=True</code> and a generator seed, with the same{' '}
        <code>drop_last</code> switch. Its limits: the whole list sits in memory, so a huge dataset shuffles a list of
        indices instead of the records; a shuffle balances labels only on average, and a batch can still be lopsided by
        chance, which stratified sampling fixes; nothing here groups examples by length, so padded batches waste
        compute; and <code>drop_last</code> drops different examples each epoch, so over many epochs every example is
        still seen, but any single epoch is incomplete.
      </p>
    </>
  ),

  visual: (
    <figure className="fig">
      <BatchShuffleViz />
      <figcaption className="fig-caption">
        <span className="fig-caption-text">
          The generator from the file, run on its own ten examples at a reading pace: about five seconds for each
          shuffle, under three seconds per batch, about half a minute in all. The cards start in file order with the
          batches that shipped bracketed in amber; then each epoch shuffles the copy, one card gliding to its new slot
          after another, and the slices drop into the batch rows with their label mix. The practice variation fades
          the ragged pair that <code>drop_last</code> leaves out. Step through with the buttons. The figure rests for
          two minutes before it plays again, and the motion setting in the site header can slow or stop it. The
          shuffled order of each epoch is taken from the Python run; every slice, count, and drop is recomputed in the
          browser and compared with it.
        </span>
      </figcaption>
    </figure>
  ),

  tradeoffs: [
    {
      name: 'File order, fixed slices (what shipped)',
      preferWhen: 'The export is already in a random order and will never be re-sorted, or the job is a one-off evaluation pass where the order does not feed back into the model.',
      cost: 'On these ten examples two of the three batches hold a single label, so each gradient step leans toward one label and the next step leans back. Any upstream sort, by label, by date, by customer, silently becomes a training bias.',
    },
    {
      name: 'Seeded shuffle and fixed-size batches (this lesson)',
      preferWhen: 'A list that fits in memory, labels that are roughly balanced, and the need to rerun an epoch exactly from a seed and a batch number.',
      cost: 'Balance is only probabilistic: a batch can still come out lopsided by chance, and the ragged tail needs a policy. The copy doubles the list of references, and shuffling records rather than indices does not scale to a dataset that lives on disk.',
    },
    {
      name: 'Length bucketing, or a framework data loader with workers',
      preferWhen: 'Variable-length text where padding dominates compute, or a dataset large enough that loading and tokenizing must overlap with training on another process.',
      cost: 'Bucketing by length trades some randomness for less padding, and the buckets themselves need shuffling. A data loader adds a sampler, worker processes, and a collate step, and its seed handling across workers is a frequent source of silently repeated batches.',
    },
  ],
};
