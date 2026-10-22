import CodeBlock from '../../src/components/CodeBlock.jsx';
import ClassBalanceViz from './visuals/ClassBalanceViz.jsx';
import solutionSource from './python/src/class_balance/solution.py?raw';
import starterSource from './python/src/class_balance/starter.py?raw';
import answerSource from './python/src/class_balance/practice_answer.py?raw';
import lessonTests from './python/tests/test_lesson.py?raw';
import expectedOutput from './python/fixtures/expected-output.txt?raw';
import expectedPracticeOutput from './python/fixtures/expected-practice-output.txt?raw';
import recordsFixture from './python/fixtures/records.json?raw';

// Authored by Claude Fable 5 in the main thread. Every number on this page was
// produced by running the files below; the expected outputs are the files'
// actual output, compared byte for byte by the tests.
const answerSnippet = answerSource.split('# --- answer begins ---\n')[1].split('# --- answer ends ---')[0].trim();

export const content = {
  brief: (
    <>
      <p>
        Orbit fine-tuned an intent classifier on a support export in which seven of every twelve records were billing
        questions. The model learned the cheapest lesson available: answer &quot;billing&quot; to everything. On its own
        skewed test set that was right 58 percent of the time, which looked like a model, and in production it routed
        outage reports to the billing queue.
      </p>
      <p>
        <strong>The action to practice:</strong> cap every label at a fixed number of records before training, with a
        seeded random sample so the cut is repeatable, and keep the survivors in their original order. The rules are
        small:
      </p>
      <ul>
        <li>Count the records per label. A label at or under the cap keeps every record.</li>
        <li>A label over the cap keeps a random sample of exactly <code>cap</code> records, drawn without replacement by a generator seeded once, so the same seed always keeps the same records.</li>
        <li>Kept records are the original dictionaries, returned in input order; every dropped id is reported.</li>
        <li>A record with no label, or a cap below one, raises a <code>ValueError</code>.</li>
        <li>The worked example only takes records away; lifting small labels is the practice variation.</li>
      </ul>
      <p>
        <strong>Input.</strong> Twelve records, inline as a list of dictionaries, a cap of 3, and seed 11:
      </p>
      <table>
        <thead><tr><th>id</th><th>label</th><th>text</th></tr></thead>
        <tbody>
          <tr><td>r1</td><td>billing</td><td>Why was I charged twice this month?</td></tr>
          <tr><td>r2</td><td>access</td><td>I cannot log in after the password reset.</td></tr>
          <tr><td>r3</td><td>billing</td><td>How do I download last month&apos;s invoice?</td></tr>
          <tr><td>r4</td><td>billing</td><td>Can you refund the duplicate payment?</td></tr>
          <tr><td>r5</td><td>outage</td><td>The dashboard has been down since noon.</td></tr>
          <tr><td>r6</td><td>billing</td><td>Which plan am I on and what does it cost?</td></tr>
          <tr><td>r7</td><td>access</td><td>My API key says it is not active.</td></tr>
          <tr><td>r8</td><td>billing</td><td>Does the price include tax?</td></tr>
          <tr><td>r9</td><td>billing</td><td>Update the card on file for my account.</td></tr>
          <tr><td>r10</td><td>outage</td><td>Uploads fail with a gateway error.</td></tr>
          <tr><td>r11</td><td>access</td><td>Add a teammate to the workspace.</td></tr>
          <tr><td>r12</td><td>billing</td><td>Where can I see my usage this cycle?</td></tr>
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
        Change one behavior. The worked solution only takes records away, so outage still has two records against
        three for the other labels. Make <code>balance</code> lift every label below a floor of 3 by repeating
        records: while a label has fewer kept records than the floor, pick one of its kept records at random with the
        seeded generator and append it again. A repeated record keeps its id and is reported as a repeat. The file
        below is the worked solution with a <code>balance</code> function that calls <code>downsample</code> and
        returns no repeats yet, and a check for the new behavior. As shipped it prints <code>NOT OK</code> and stops.
      </p>
      <p>
        <strong>Hint.</strong> After <code>downsample</code>, group the kept records by label and count them. Create{' '}
        <code>random.Random(seed)</code> once. For each label in sorted order, loop <code>while</code> its count is
        below the floor: <code>rng.choice(group)</code> picks one record, append it to <code>kept</code>, append its id
        to <code>repeats</code>, and add one to the count. A <code>while</code> loop runs as long as its condition stays
        true, so the count must change inside it.
      </p>
      <p>
        <strong>Expected result.</strong> outage gains one repeat, r10, so every label ends at 3 and there are nine
        records: the eight originals in input order, then <code>r10 (repeat)</code>. The best constant answer is now
        right 3 of 9 times (33 percent). The file ends with <code>OK</code>.
      </p>
      <details>
        <summary>Show the answer</summary>
        <CodeBlock filename="Practice answer" code={answerSnippet} />
        <p>
          A second seeded generator, a count per label, and a <code>while</code> loop that appends the pick and raises
          the count until the floor is met. The loop never runs for a label already at the floor, so a floor within the
          counts repeats nothing and the result equals the worked example. Everything outside the marked region is the
          practice file unchanged.
        </p>
      </details>
    </>
  ),

  files: [
    { path: 'python/src/class_balance/solution.py', role: 'reference', language: 'python', source: solutionSource, primary: true,
      description: 'The complete worked example: the twelve records, label_of, count_labels, group_by_label, ids_of, downsample, and a demonstration that prints the counts before and after, the kept and dropped ids, the constant-answer baseline, the rejected record, and OK. Runs alone with Python 3.11 or newer.' },
    { path: 'python/src/class_balance/starter.py', role: 'starter', language: 'python', source: starterSource, primary: true,
      description: 'The practice file: the worked solution with a balance function that does not lift small labels yet, and a check for the new behavior. Prints NOT OK until every label reaches the floor with one seeded repeat.' },
    { path: 'python/src/class_balance/practice_answer.py', role: 'reference', language: 'python', source: answerSource,
      description: 'The completed practice variation; the page shows the region between its answer markers.' },
    { path: 'python/fixtures/expected-output.txt', role: 'fixture', language: 'text', source: expectedOutput,
      description: 'What solution.py prints, byte for byte. The test runs the file alone and compares.' },
    { path: 'python/fixtures/expected-practice-output.txt', role: 'fixture', language: 'text', source: expectedPracticeOutput,
      description: 'What practice_answer.py prints, byte for byte.' },
    { path: 'python/tests/test_lesson.py', role: 'test', language: 'python', source: lessonTests,
      description: 'Runs the three lesson files alone, checks the counts and groups, the cap, the seeded sample and its repeatability, the restored order, the rejected inputs, the practice floor, the animation fixtures, and measures the constant-answer baseline before and after on the same records.' },
    { path: 'python/fixtures/records.json', role: 'fixture', language: 'json', source: recordsFixture,
      description: 'The twelve records, the cap, the seed, and the floor exactly as the lesson files define them; the animation runs on this copy and a test pins it to the files. The trace fixture it replays ships in the project download.' },
  ],

  evidence: (
    <>
      <p>
        <strong>What the file checks</strong> before it prints <code>OK</code>: eight kept and four dropped, billing at
        the cap with access and outage whole, the kept ids in input order (r2, r5, r6, r7, r8, r10, r11, r12), and every
        dropped id a billing record (r1, r3, r4, r9). It also runs the sample a second time with the same seed and
        prints that the two runs agree. Run your copy and compare its output with the expected output above; they must
        match line for line.
      </p>
      <p>
        <strong>The failure cases.</strong> A record with no <code>label</code> key makes <code>label_of</code> raise a{' '}
        <code>ValueError</code> naming the record, and the demonstration prints it as the rejected line instead of
        counting it under a label of its own. A cap of 0 raises before any sampling. The tests in the project download
        also check that a cap at or above the biggest label drops nothing, that another seed keeps a different set, that
        no seed ever leaves a label above the cap, and that the input list is unchanged.
      </p>
      <p>
        <strong>What shipped, on the same records.</strong> Always answering billing is right 7 of 12 times before the
        cap, 58 percent, which is the score the skewed test set rewarded. After the cap the same constant answer is right
        3 of 8 times, 38 percent, and with the practice floor 3 of 9, 33 percent: the training set no longer pays the
        model for ignoring its input. Both measurements are tests in the project download.
      </p>
    </>
  ),

  solution: (
    <>
      <p>
        Read the file top to bottom: the input, three small helpers, a helper for ids, the one function that does the
        work, and a demonstration. Here is its Python, construct by construct.
      </p>
      <ol>
        <li>
          <strong>Two imports.</strong> <code>import random</code> brings in the whole module, reached with a dot as in{' '}
          <code>random.Random</code>; <code>from collections import Counter</code> brings one name straight into the
          file. Nothing is installed.
        </li>
        <li>
          <strong>A guard helper.</strong> <code>label_of</code> tests <code>&quot;label&quot; not in record</code>, which asks a
          dictionary whether it has that key, and raises <code>ValueError</code> with a message naming the id. Every
          function that needs a label calls it, so the check lives in one place.
        </li>
        <li>
          <strong>A Counter.</strong> <code>Counter()</code> is a dictionary whose missing keys count as zero, so{' '}
          <code>counts[label] += 1</code> works on the first record of a label without setting it up. Later,{' '}
          <code>before.most_common(1)</code> returns a list of the most frequent (label, count) pairs, and{' '}
          <code>[0]</code> takes the first.
        </li>
        <li>
          <strong>A dictionary of lists.</strong> <code>group_by_label</code> starts with an empty dictionary; for each
          record, <code>if label not in groups: groups[label] = []</code> creates the list the first time a label appears,
          and <code>groups[label].append(record)</code> adds the record. The lists keep input order.
        </li>
        <li>
          <strong>A seeded generator.</strong> <code>random.Random(seed)</code> creates a private random number generator
          whose sequence is fixed by the seed, unlike the module-level <code>random.sample</code> that every caller shares.{' '}
          <code>rng.sample(group, cap)</code> draws <code>cap</code> distinct records without replacement, in random order.
        </li>
        <li>
          <strong>Sorted labels and extend.</strong> <code>for label in sorted(groups):</code> visits the keys in
          alphabetical order, so the generator&apos;s draws are spent in the same order on every run. <code>kept.extend(group)</code>{' '}
          adds every element of a list; <code>append</code> would add the list as one element.
        </li>
        <li>
          <strong>A position lookup and a key function.</strong> <code>enumerate(records)</code> yields an index with each
          record, filling <code>position</code> from id to index. <code>by_position</code> is defined inside{' '}
          <code>downsample</code>, so it can read <code>position</code> from the enclosing function; <code>kept.sort(key=by_position)</code>{' '}
          calls it on every record and sorts in place by the number it returns.
        </li>
        <li>
          <strong>A set for the dropped ids.</strong> <code>set(ids_of(kept))</code> turns the kept ids into a set, and{' '}
          <code>not in</code> on a set is a constant-time test, so the loop over <code>records</code> collects the dropped
          ids in input order without searching a list each time.
        </li>
        <li>
          <strong>The demonstration.</strong> <code>{'{label:<9}'}</code> left-aligns a label in nine columns and{' '}
          <code>{'{before[label]:>7}'}</code> right-aligns a count in seven. <code>top_label, top_count = ...</code> unpacks
          the pair, <code>:.0f</code> prints a percentage with no decimals, <code>try</code> and <code>except ValueError</code>{' '}
          show the rejection, and each <code>assert</code> checks one claim before <code>OK</code>.
        </li>
      </ol>
      <p><strong>Trace the variables.</strong> Follow <code>groups</code>, the generator, and <code>kept</code> label by label, in sorted order:</p>
      <table>
        <thead><tr><th>label</th><th>records</th><th>over the cap?</th><th>action</th><th>kept</th><th>dropped</th></tr></thead>
        <tbody>
          <tr><td>access</td><td>3</td><td>no</td><td>extend with all three</td><td>r2, r7, r11</td><td></td></tr>
          <tr><td>billing</td><td>7</td><td>yes</td><td>rng.sample(group, 3)</td><td>r6, r8, r12</td><td>r1, r3, r4, r9</td></tr>
          <tr><td>outage</td><td>2</td><td>no</td><td>extend with both</td><td>r5, r10</td><td></td></tr>
        </tbody>
      </table>
      <p>
        After the loop, <code>kept</code> holds r2, r7, r11, then the sample in the order it was drawn, r6, r8, r12, then
        r5, r10: grouped by label, not by export. The sort by position turns that into r2, r5, r6, r7, r8, r10, r11, r12.
        The counts after are access 3, billing 3, outage 2, so eight records survive and four are dropped, all four of
        them billing. The same seed keeps the same four every time; seed 12 keeps r4, r6, r8 and drops r1, r3, r9, r12.
      </p>
      <p>
        <strong>Why these decisions.</strong> A sample instead of the first three billing records, because the first
        three of an export are whatever the ticket system happened to list first, and a sample spreads the kept
        records over the whole month. A seed, because a training set that changes on every run cannot be reviewed,
        reproduced, or compared with the last one. Sorted labels, because the generator&apos;s draws must be consumed in
        a fixed order for the seed to mean anything. Input order restored, because downstream steps such as the batch
        shuffle expect the export order and a reviewer reading the kept list should see the export, not the sampler.
        Every dropped id reported, because a silent cut cannot be audited.
      </p>
      <p>
        <strong>The pattern, and its limits.</strong> Group by a key, then cap each group with a seeded sample: the same
        shape limits examples per customer, per source document, or per language before fine-tuning. Its limits: it
        throws data away, four real billing questions here, and a model trained on 8 records has seen less than one
        trained on 12; the cap is a policy, not a measurement of how much skew the model can take; and balancing the
        training set changes the model&apos;s idea of how common each intent is, so the evaluation set must keep the
        real mix or the scores will lie in the other direction.
      </p>
    </>
  ),

  visual: (
    <figure className="fig">
      <ClassBalanceViz />
      <figcaption className="fig-cap">
        <span className="fig-caption-text">
          The functions from the file, run on their own twelve records at a reading pace: about three seconds per label,
          under half a minute in all. The records sit in one column per label; the Counter fills the headers and the cap
          line appears; then each label is decided in sorted order, access and outage kept whole in green, the billing
          sample kept in blue and the four dropped records faded in red. The kept ids glide into a strip in input order,
          the panel shows the counts before and after with the constant-answer baseline, and the practice variation
          adds the r10 repeat. Step through with the buttons. The figure rests for two minutes before it plays again, and
          the motion setting in the site header can slow or stop it. The ids the seeded sample chose come from the trace
          the Python tests derive from the real functions; everything else is recomputed in the browser and compared
          with that trace.
        </span>
      </figcaption>
    </figure>
  ),

  tradeoffs: [
    {
      name: 'Train on the skew (what shipped)',
      preferWhen: 'The production mix matches the training mix, every class has plenty of examples, and the metric that matters is overall accuracy on that same mix.',
      cost: 'The cheapest lesson wins: on the twelve records a constant billing answer is right 58 percent of the time, so the model learns the majority label instead of the text, and the two outage records teach almost nothing.',
    },
    {
      name: 'Cap each label with a seeded sample (this lesson)',
      preferWhen: 'A few labels dominate, the small labels matter in production, and the big labels have more examples than the model needs; the cut is reproducible and auditable from the seed and the dropped ids.',
      cost: 'It discards data: four of seven billing questions here. The cap is a guess, the kept set changes with the seed, and the model loses its sense of how common each intent is, so the evaluation set must keep the real mix.',
    },
    {
      name: 'Keep every record and reweight: class weights in the loss, or upsampling',
      preferWhen: 'Every example is valuable and the training loop can take a weight per example, or a floor by repetition (the practice variation) is acceptable.',
      cost: 'Weights need the training code to cooperate and are easy to set wrong; repeating records makes the model see the same outage text several times per epoch, which overfits the few examples it has instead of learning the class.',
    },
  ],
};
