import CodeBlock from '../../src/components/CodeBlock.jsx';
import TranscriptWindowViz from './visuals/TranscriptWindowViz.jsx';
import solutionSource from './python/src/sft_examples/solution.py?raw';
import starterSource from './python/src/sft_examples/starter.py?raw';
import answerSource from './python/src/sft_examples/practice_answer.py?raw';
import lessonTests from './python/tests/test_lesson.py?raw';
import expectedOutput from './python/fixtures/expected-output.txt?raw';
import expectedPracticeOutput from './python/fixtures/expected-practice-output.txt?raw';
import turnsFixture from './python/fixtures/turns.json?raw';

// Authored by Claude Fable 5 in the main thread. Every number on this page was
// produced by running the files below; the expected outputs are the files'
// actual output, compared byte for byte by the tests.
const answerSnippet = answerSource.split('# --- answer begins ---\n')[1].split('# --- answer ends ---')[0].trim();

export const content = {
  brief: (
    <>
      <p>
        Orbit exports its support chats as flat rows: a conversation id, a turn index, a role, and the text. The rows
        come out in the order they were written to the export, so two conversations interleave and one turn can
        land before the turn that preceded it. The fine-tuning job wants something else entirely: one training
        example per assistant turn, with the turns before it as the context and the assistant&apos;s text as the
        target, and never more than the last few turns of context, because long contexts cost tokens and the model
        should learn to answer from what is recent.
      </p>
      <p>
        <strong>The action to practice:</strong> group the rows by conversation, put each conversation in turn order,
        walk it, and build one example at every assistant turn that has text. The rules are small:
      </p>
      <ul>
        <li>A conversation is a list of its rows sorted by turn index; two rows with the same index in one conversation are an export bug and raise a <code>ValueError</code>.</li>
        <li>At an assistant turn with text, the context is the turns before it, at most <code>MAX_HISTORY</code> of them (the last four), each as a small <code>{'{"role", "text"}'}</code> dictionary, and the target is the assistant text.</li>
        <li>An assistant turn with empty text is never a target; it is counted as skipped, and it stays inside later contexts because it is part of the conversation as it happened.</li>
        <li>User turns are context only. Nothing in the input is modified.</li>
      </ul>
      <p>
        <strong>Input.</strong> Nine rows, inline as a list of dictionaries, exactly as the export wrote them. Notice
        the interleaving and that c1&apos;s turn 5 arrives before its turn 4:
      </p>
      <table>
        <thead><tr><th>conversation</th><th>turn</th><th>role</th><th>text</th></tr></thead>
        <tbody>
          <tr><td>c1</td><td>1</td><td>user</td><td>How do I rotate an API key?</td></tr>
          <tr><td>c2</td><td>1</td><td>user</td><td>Where do I find my invoice?</td></tr>
          <tr><td>c1</td><td>2</td><td>assistant</td><td>Create a replacement key, deploy it, then revoke the old one.</td></tr>
          <tr><td>c1</td><td>3</td><td>user</td><td>Does the old key stop working right away?</td></tr>
          <tr><td>c2</td><td>2</td><td>assistant</td><td>Under Billing.</td></tr>
          <tr><td>c1</td><td>5</td><td>user</td><td>And what if the key is already lost?</td></tr>
          <tr><td>c1</td><td>4</td><td>assistant</td><td>(empty)</td></tr>
          <tr><td>c2</td><td>3</td><td>user</td><td>Found it, thanks!</td></tr>
          <tr><td>c1</td><td>6</td><td>assistant</td><td>A lost key cannot be recovered. Create a replacement and revoke the lost one.</td></tr>
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
        Change one behavior. The worked solution builds a context from conversation turns alone and accepts any
        assistant text as a target, even the two-word &quot;Under Billing.&quot; Make <code>build_examples</code> do two
        small things more: put a system message (<code>SYSTEM</code>) first in every context, before the windowed
        turns, and skip an assistant turn whose text has fewer than <code>MIN_TARGET_WORDS</code> words, counting it
        as skipped like an empty turn. The file below is the worked solution with both constants defined but unused,
        and a check for the new behavior. As shipped it prints <code>NOT OK</code> and stops.
      </p>
      <p>
        <strong>Hint.</strong> The system message is one more dictionary: start <code>context</code> as a list that
        already holds it instead of an empty list, and the loop over the earlier turns appends after it. The word
        count is <code>len(turn[&quot;text&quot;].split())</code>, which is 0 for an empty string, so one comparison
        against <code>MIN_TARGET_WORDS</code> replaces the empty check and covers both cases.
      </p>
      <p>
        <strong>Expected result.</strong> Two examples instead of three: c1 turn 2 with a context of 2 entries (the
        system message and one turn) and c1 turn 6 with 5 entries (the system message and the four windowed turns).
        The two-word answer in c2 is skipped, so 2 skipped in all. The file ends with <code>OK</code>.
      </p>
      <details>
        <summary>Show the answer</summary>
        <CodeBlock filename="Practice answer" code={answerSnippet} />
        <p>
          One comparison replaces the empty check, because an empty string splits into zero words, and the context
          starts as a one-element list. Everything outside the marked region is the practice file unchanged.
        </p>
      </details>
    </>
  ),

  files: [
    { path: 'python/src/sft_examples/solution.py', role: 'reference', language: 'python', source: solutionSource, primary: true,
      description: 'The complete worked example: the nine rows, the sort key, group_turns, build_examples, a small position helper, and a demonstration that prints every example with its context, the totals, the rejected duplicate, and OK. Runs alone with Python 3.11 or newer.' },
    { path: 'python/src/sft_examples/starter.py', role: 'starter', language: 'python', source: starterSource, primary: true,
      description: 'The practice file: the worked solution with SYSTEM and MIN_TARGET_WORDS defined but unused, and a check for the new behavior. Prints NOT OK until every context starts with the system message and short targets are skipped.' },
    { path: 'python/src/sft_examples/practice_answer.py', role: 'reference', language: 'python', source: answerSource,
      description: 'The completed practice variation; the page shows the region between its answer markers.' },
    { path: 'python/fixtures/expected-output.txt', role: 'fixture', language: 'text', source: expectedOutput,
      description: 'What solution.py prints, byte for byte. The test runs the file alone and compares.' },
    { path: 'python/fixtures/expected-practice-output.txt', role: 'fixture', language: 'text', source: expectedPracticeOutput,
      description: 'What practice_answer.py prints, byte for byte.' },
    { path: 'python/tests/test_lesson.py', role: 'test', language: 'python', source: lessonTests,
      description: 'Runs the three lesson files alone, checks the grouping and the sort, the duplicate rejection, the window at every size, the skip rule, the practice, pins the animation fixtures to the solution, and measures the one-example-per-conversation builder that shipped on the same rows.' },
    { path: 'python/fixtures/turns.json', role: 'fixture', language: 'json', source: turnsFixture,
      description: 'The nine rows, the window, the system message, and the minimum word count exactly as the lesson files define them; the animation runs on this copy and a test pins it to the files. The trace fixture it replays ships in the project download.' },
  ],

  evidence: (
    <>
      <p>
        <strong>What the file checks</strong> before it prints <code>OK</code>: three examples and one skipped turn,
        the longest context is exactly four turns, and the context of the last example begins with turn 2 because
        the window dropped turn 1. Run your copy and compare its output with the expected output above; they must
        match line for line.
      </p>
      <p>
        <strong>The failure case.</strong> The demonstration adds a second row with turn index 2 to c1, and{' '}
        <code>group_turns</code> raises <code>ValueError</code> naming the conversation and the index, which the
        demonstration prints as the rejected line instead of silently training on a conversation whose order is
        unknowable. The tests in the project download also run the window at sizes 0 through 10 (the context never
        exceeds it, a window of 10 keeps all five earlier turns, a window of 0 keeps none), feed a conversation whose
        only assistant turn is empty (no examples, one skipped), and confirm the rows are unchanged afterwards.
      </p>
      <p>
        <strong>What shipped, on the same rows.</strong> The old builder made one example per conversation: the last
        assistant turn as the target and the whole transcript before it as the context. On these rows that is two
        examples, and c1&apos;s context holds five turns, more than the window allows, while the answer at c1 turn 2 is
        never a target at all. The per-turn builder makes three examples and keeps every context at four turns or
        fewer. Both measurements are tests in the project download.
      </p>
    </>
  ),

  solution: (
    <>
      <p>
        Read the file top to bottom: the rows and the window, a sort key, the grouping function, the builder, a
        small helper for the demonstration, and the demonstration. Here is its Python, construct by construct.
      </p>
      <ol>
        <li>
          <strong>A dictionary of lists.</strong> <code>conversations = {'{}'}</code> starts empty. For each row,{' '}
          <code>if row[&quot;conversation&quot;] not in conversations:</code> asks whether the id has a list yet and
          creates an empty one when it does not; then <code>conversations[row[&quot;conversation&quot;]].append(row)</code>{' '}
          adds the row to that list. Two lines, and nine rows become two lists. A dictionary remembers the order keys
          were first added, so c1 comes before c2 everywhere below.
        </li>
        <li>
          <strong>Sorting with a key function.</strong> <code>turns.sort(key=turn_index)</code> reorders the list in
          place. The key is a function, passed by name without parentheses, that the sort calls on each row to get
          the value to compare: here <code>turn_index</code> returns <code>row[&quot;turn&quot;]</code>. c1&apos;s rows
          arrive as 1, 2, 3, 5, 4, 6 and leave as 1 through 6.
        </li>
        <li>
          <strong>Looping over pairs.</strong> <code>for conversation_id, turns in conversations.items():</code> visits
          each key and its list together, unpacking the pair into two names. Inside,{' '}
          <code>for position in range(1, len(turns)):</code> counts from 1 so that <code>turns[position - 1]</code>{' '}
          is always a real neighbour; equal turn indexes next to each other after sorting mean a duplicate, and{' '}
          <code>raise ValueError(...)</code> stops the function with a message that names both.
        </li>
        <li>
          <strong>enumerate and continue.</strong> <code>for position, turn in enumerate(turns):</code> yields the
          index and the turn together. <code>continue</code> jumps to the next turn, so a user turn or an empty
          assistant turn never reaches the lines that build an example; <code>skipped += 1</code> counts the empty one
          first.
        </li>
        <li>
          <strong>The window.</strong> <code>start = max(0, position - max_history)</code> is where the context begins:
          four turns before the target, or 0 when fewer exist, because <code>max</code> refuses a negative index.{' '}
          <code>turns[start:position]</code> is a slice, a new list holding the turns from <code>start</code> up to
          but not including <code>position</code>, so the target itself is never in its own context.
        </li>
        <li>
          <strong>Nested dictionaries.</strong> Each context entry is built fresh,{' '}
          <code>{'{"role": earlier["role"], "text": earlier["text"]}'}</code>, and appended; the example is another
          dictionary holding the conversation id, the turn, that context list, and the target. The function returns
          the examples and the count together as a tuple, which the caller unpacks with{' '}
          <code>examples, skipped = build_examples(...)</code>.
        </li>
        <li>
          <strong>Keyword arguments with defaults.</strong> <code>def build_examples(rows, max_history=4)</code> gives
          the window a default; the demonstration still passes <code>max_history=MAX_HISTORY</code> so the number in
          use is visible at the call.
        </li>
        <li>
          <strong>The demonstration.</strong> <code>position_of</code> walks a sorted conversation counting turns
          until it finds the target&apos;s index, so the printout can say how many earlier turns the window dropped
          (the position minus the context size). <code>enumerate(examples, start=1)</code> numbers the examples from
          1, a plain <code>if</code> swaps empty text for <code>(empty)</code>, <code>try</code> and{' '}
          <code>except ValueError as error</code> show the rejection without crashing, and each <code>assert</code>{' '}
          checks one claim before <code>OK</code>.
        </li>
      </ol>
      <p><strong>Trace the variables.</strong> Follow <code>position</code>, <code>start</code>, and the slice through the four assistant turns, in the order the walk visits them:</p>
      <table>
        <thead><tr><th>conversation</th><th>position</th><th>turn</th><th>text</th><th>start</th><th>slice</th><th>context</th><th>result</th></tr></thead>
        <tbody>
          <tr><td>c1</td><td>1</td><td>2</td><td>61 characters</td><td>max(0, 1 - 4) = 0</td><td>turns[0:1]</td><td>1 turn</td><td>example 1</td></tr>
          <tr><td>c1</td><td>3</td><td>4</td><td>empty</td><td></td><td></td><td></td><td>skipped, 1 so far</td></tr>
          <tr><td>c1</td><td>5</td><td>6</td><td>77 characters</td><td>max(0, 5 - 4) = 1</td><td>turns[1:5]</td><td>4 turns, turn 1 dropped</td><td>example 2</td></tr>
          <tr><td>c2</td><td>1</td><td>2</td><td>14 characters</td><td>max(0, 1 - 4) = 0</td><td>turns[0:1]</td><td>1 turn</td><td>example 3</td></tr>
        </tbody>
      </table>
      <p>
        The second example is the one to study: five turns come before turn 6, the window keeps the last four, so
        the slice starts at index 1 and the context runs from turn 2 to turn 5, including the empty assistant turn
        4 as it happened. c2&apos;s third row is a user turn, so it is context for nothing and the walk ends.
      </p>
      <p>
        <strong>Why these decisions.</strong> Grouping before sorting, because an export sorted as a whole would
        still interleave conversations; sorting inside each group makes the walk a straight line. A sort key rather
        than sorting rows as whole dictionaries, because dictionaries have no order of their own and the turn index
        is the only thing that should decide. A window, because the fine-tuning budget is paid per token and the
        last few turns carry nearly all of what the next answer depends on. The empty turn is skipped as a target
        but kept as context, because the context must show the conversation the user actually saw; the practice
        variation makes the target rule stricter, which is a policy decision and the kind of change this pattern
        exists to make easy.
      </p>
      <p>
        <strong>The pattern, and its limits.</strong> Group, sort, walk, window: a dictionary of lists, a key
        function, <code>enumerate</code>, and a slice bounded by <code>max</code>. The same shape turns click logs
        into sessions, sensor rows into sequences, and tickets into threads. Its limits: examples from one
        conversation repeat most of their context tokens, which a loss mask over a single sequence avoids; a fixed
        window drops an early turn the answer may depend on; and the empty-turn policy, the role names, and the
        window size are judgments that belong in a written data spec, not only in the code.
      </p>
    </>
  ),

  visual: (
    <figure className="fig">
      <TranscriptWindowViz />
      <figcaption className="fig-cap">
        <span className="fig-caption-text">
          The functions from the file, run on their own nine rows at a reading pace: about three seconds per
          assistant turn, about twenty-five seconds in all. The rows appear in export order and glide into two lanes
          in turn order. Then each assistant turn is visited: a dashed bracket marks the turns that become the
          context (at most four), the target chip turns green and an example card appears on the right, or the empty
          turn turns red and is skipped. The practice variation adds a system entry to every card and fades the
          two-word answer as skipped. Step through with the buttons. Every window and count comes from the same
          functions run in the browser and is compared with the Python run.
        </span>
      </figcaption>
    </figure>
  ),

  tradeoffs: [
    {
      name: 'One example per conversation, last answer only (what shipped)',
      preferWhen: 'Each conversation has one answer that matters, as in a single-question help desk, and transcripts are short enough that the whole history fits any budget.',
      cost: 'Every earlier answer is thrown away as a target (c1 turn 2 here), and the context runs to the whole transcript: five turns for c1, over the window. Long conversations produce one giant example and short ones produce almost nothing.',
    },
    {
      name: 'One example per assistant turn with a context window (this lesson)',
      preferWhen: 'Multi-turn support data where every assistant turn is worth learning from and the training budget is paid per token, so the context must be bounded.',
      cost: 'Examples from the same conversation repeat most of their context tokens, the window drops early turns an answer may depend on, and the skip rules and window size are policies that have to be written down and versioned with the data.',
    },
    {
      name: 'One sequence per conversation with a loss mask on user turns',
      preferWhen: 'The training stack supports per-token loss masks: the whole conversation is one sequence, every assistant turn is trained at once, and no context is repeated.',
      cost: 'Tokenizer-level masking machinery and a chat template, sequences as long as the longest conversation, and framework support that a plain JSONL loader does not have.',
    },
  ],
};
