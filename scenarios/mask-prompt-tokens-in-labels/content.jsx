import CodeBlock from '../../src/components/CodeBlock.jsx';
import LabelMaskViz from './visuals/LabelMaskViz.jsx';
import solutionSource from './python/src/label_masking/solution.py?raw';
import starterSource from './python/src/label_masking/starter.py?raw';
import answerSource from './python/src/label_masking/practice_answer.py?raw';
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
        Orbit fine-tuned its assistant on support chats. The training loss fell beautifully, and the model learned to
        repeat the customer&apos;s question before answering it. The trainer had computed the loss on every token of
        every row, prompt included, so a third of what the model was rewarded for predicting was the customer&apos;s
        side of the conversation.
      </p>
      <p>
        <strong>The action to practice:</strong> build the labels a causal language model trainer expects, so that
        only the completion is trained. The rules fit in four sentences:
      </p>
      <ul>
        <li>The input ids are the prompt tokens, then the completion tokens, then the end-of-sequence token.</li>
        <li>The labels are the same length: <code>-100</code> over every prompt position, the completion ids over the completion, and the end-of-sequence id last. <code>-100</code> is the value the loss ignores, by convention of the training frameworks.</li>
        <li>A batch is padded on the right to its longest row with the pad id, <code>-100</code> labels under the pads, and an attention mask of 1 for real tokens and 0 for pads.</li>
        <li>An example with an empty completion raises a <code>ValueError</code>: it has nothing to train on.</li>
      </ul>
      <p>
        <strong>Input.</strong> Three examples, inline as a list of dictionaries with a prompt and a completion. The
        tokenizer is a stand-in that gives each new word the next id, with 0 reserved for padding and 1 for the end
        of sequence; a real tokenizer gives different ids and the label arithmetic is identical:
      </p>
      <table>
        <thead><tr><th>prompt</th><th>completion</th></tr></thead>
        <tbody>
          <tr><td>how do i reset my password</td><td>use the forgot password link</td></tr>
          <tr><td>where is my invoice</td><td>open billing and choose invoices</td></tr>
          <tr><td>cancel my plan</td><td>go to billing and choose cancel plan</td></tr>
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
        Change one behavior. The trainer accepts rows of at most ten positions, and the first example is twelve
        positions long. The file below is the worked solution with <code>MAX_LEN</code> set to 10 and a{' '}
        <code>fit</code> function that is not written yet: it hands every row back unchanged. As shipped the file
        prints <code>NOT OK</code> and stops.
      </p>
      <p>
        <strong>Hint.</strong> A row that already fits comes back unchanged. Otherwise count the prompt positions with{' '}
        <code>labels.count(IGNORE)</code>; the trained positions are the rest, and when there are more of them than{' '}
        <code>max_len</code>, raise a <code>ValueError</code>, because cutting the completion would train on a
        truncated answer. A negative slice, <code>ids[-max_len:]</code>, keeps the last <code>max_len</code> items of
        a list; apply the same slice to the labels so the two stay aligned.
      </p>
      <p>
        <strong>Expected result.</strong> Example one drops two prompt tokens and example three drops one, the batch is
        padded to ten positions instead of twelve, and all twenty trained tokens are still there, now out of thirty real
        tokens. The file prints the fitted rows, the counts, the rejected over-long completion, and <code>OK</code>.
      </p>
      <details>
        <summary>Show the answer</summary>
        <CodeBlock filename="Practice answer" code={answerSnippet} />
        <p>
          Truncating from the left is the right side for this data: the oldest prompt tokens are the least useful
          context, and the completion, the thing being learned, is never touched. <code>labels.count(IGNORE)</code>{' '}
          works because the ignore labels are exactly the leading prompt positions. The guard turns a silent cut of
          the answer into a loud rejection. Everything outside the marked region is the practice file unchanged.
        </p>
      </details>
    </>
  ),

  files: [
    { path: 'python/src/label_masking/solution.py', role: 'reference', language: 'python', source: solutionSource, primary: true,
      description: 'The complete worked example: the three examples, the stand-in tokenizer, build_labels, pad_batch, and a demonstration that prints every row, the padded batch with its masks, the trained count, the rejected empty completion, and OK. Runs alone with Python 3.11 or newer.' },
    { path: 'python/src/label_masking/starter.py', role: 'starter', language: 'python', source: starterSource, primary: true,
      description: 'The practice file: the worked solution with MAX_LEN 10 and a fit function that returns rows unchanged. Prints NOT OK until fit keeps the last MAX_LEN positions.' },
    { path: 'python/src/label_masking/practice_answer.py', role: 'reference', language: 'python', source: answerSource,
      description: 'The completed practice variation; the page shows the region between its answer markers.' },
    { path: 'python/fixtures/expected-output.txt', role: 'fixture', language: 'text', source: expectedOutput,
      description: 'What solution.py prints, byte for byte. The test runs the file alone and compares.' },
    { path: 'python/fixtures/expected-practice-output.txt', role: 'fixture', language: 'text', source: expectedPracticeOutput,
      description: 'What practice_answer.py prints, byte for byte.' },
    { path: 'python/tests/test_lesson.py', role: 'test', language: 'python', source: lessonTests,
      description: 'Runs the three lesson files alone, checks the vocabulary, every label position against the prompt length, the padding and masks, the rejected inputs, the practice truncation and its guard, and what training on every token counted; pins the animation fixtures to the solution.' },
    { path: 'python/fixtures/examples.json', role: 'fixture', language: 'json', source: examplesFixture,
      description: 'The three examples and the pad, eos, ignore, and maximum-length settings exactly as the lesson files define them; the animation runs on this copy and a test pins it to the files.' },
  ],

  evidence: (
    <>
      <p>
        <strong>What the file checks</strong> before it prints <code>OK</code>: the first six ids of example one are
        the prompt with six ignore labels under them; the remaining six positions carry the completion and eos as both
        ids and labels, with <code>password</code> keeping the id it was given in the prompt; and twenty of thirty-three
        real tokens carry a label. Run your copy and compare its output with the expected output above; they must
        match line for line.
      </p>
      <p>
        <strong>The failure cases.</strong> The demonstration asks for labels on an example whose completion is empty,
        and <code>build_labels</code> raises a <code>ValueError</code> that the demonstration prints as a rejected line
        naming the prompt; it passes a copy of the vocabulary so the rejected call cannot add a word. The practice file
        rejects a completion of eleven tokens that cannot fit ten positions. The tests in the project download also
        check that an empty batch pads to an empty list, that a single row needs no padding, and that the input
        examples are unchanged.
      </p>
      <p>
        <strong>What shipped, on the same batch.</strong> Labels equal to the ids train every real token: 33 of 33,
        the 13 prompt tokens included, against 20 of 33 with the mask. A word that occurs only in prompts, such as{' '}
        <code>reset</code>, never appears as a label once the mask is in place, and a pad position never trains however
        long the batch grows; both are tests in the project download.
      </p>
    </>
  ),

  solution: (
    <>
      <p>
        Read the file top to bottom: the three examples and three constants, a stand-in tokenizer, one function that
        builds a row, one that pads a batch, and a demonstration. Here is its Python, construct by construct.
      </p>
      <ol>
        <li>
          <strong>A vocabulary as a growing dictionary.</strong> <code>if word not in vocab: vocab[word] = len(vocab) + 2</code>{' '}
          gives a new word the next free id: the dictionary&apos;s own length is the counter, and the plus two skips
          the reserved 0 and 1. A word seen before keeps its id, which is why <code>password</code> is 7 in the prompt
          and in the completion. The dictionary is created once in the demonstration and passed in, so all three
          examples share one vocabulary.
        </li>
        <li>
          <strong>List arithmetic.</strong> <code>prompt_ids + completion_ids + [EOS]</code> concatenates lists;{' '}
          <code>[EOS]</code> is a one-item list, because you can only add a list to a list. <code>[IGNORE] * len(prompt_ids)</code>{' '}
          repeats one value as many times as there are prompt tokens. The two lines produce lists of exactly the same
          length, which is the invariant everything else relies on: position <code>i</code> of the labels says what the
          model should predict at position <code>i</code> of the ids.
        </li>
        <li>
          <strong>The guard.</strong> <code>if not completion_ids: raise ValueError(...)</code> fires on an empty list.
          The <code>!r</code> inside the f-string prints the prompt with quotes around it, the way a debugger would,
          so an empty or odd prompt is visible in the message.
        </li>
        <li>
          <strong>Padding to the longest.</strong> A first loop finds <code>longest</code> with <code>max</code>; a second
          loop computes <code>missing = longest - len(ids)</code> and appends a three-item tuple: the ids padded with{' '}
          <code>[PAD] * missing</code>, the labels padded with <code>[IGNORE] * missing</code>, and the attention mask,{' '}
          <code>[1] * len(ids) + [0] * missing</code>. The row that is already longest gets <code>missing</code> of 0 and
          empty padding lists.
        </li>
        <li>
          <strong>Counting.</strong> The demonstration loops over the labels and counts every one that is not{' '}
          <code>IGNORE</code>; <code>sum(mask)</code> adds the ones and zeros to count the real tokens.{' '}
          <code>{'{trained / real:.0%}'}</code> formats a fraction as a whole percentage.
        </li>
        <li>
          <strong>The demonstration.</strong> <code>enumerate(zip(EXAMPLES, rows), start=1)</code> walks two lists
          together and numbers them from one; the loop header unpacks the number, the example, and the pair of lists
          in one line. <code>dict(vocab)</code> makes a copy for the rejected call, so the demonstration cannot change
          the vocabulary it has already printed.
        </li>
      </ol>
      <p><strong>Trace the rows.</strong> Follow the counts through the three examples and the padded batch:</p>
      <table>
        <thead><tr><th>example</th><th>prompt</th><th>completion</th><th>row length</th><th>trained</th><th>pads to 12</th></tr></thead>
        <tbody>
          <tr><td>1</td><td>6 tokens, ids 2 to 7</td><td>5 tokens, ids 8, 9, 10, 7, 11</td><td>12 with eos</td><td>6</td><td>0</td></tr>
          <tr><td>2</td><td>4 tokens</td><td>5 tokens</td><td>10</td><td>6</td><td>2</td></tr>
          <tr><td>3</td><td>3 tokens</td><td>7 tokens</td><td>11</td><td>8</td><td>1</td></tr>
        </tbody>
      </table>
      <p>
        Thirty-three real tokens in all; twenty carry a label, the five, five, and seven completion tokens plus three
        end-of-sequence tokens, and the thirteen prompt tokens are read but never predicted. The three pads add three
        more ignored positions and three zeros in the masks.
      </p>
      <p>
        <strong>Why these decisions.</strong> The prompt stays in the ids because the model must read it to condition
        its answer; it leaves the labels because predicting it teaches the model to write customer questions. The value
        <code>-100</code> is not arbitrary: it is the default ignore index of the cross-entropy loss in PyTorch and what
        the common trainers expect. The end-of-sequence token is trained on purpose, or the model never learns to stop.
        Padding on the right with a mask keeps every real token at its original position; the trainer multiplies the
        loss by the mask or skips the ignore labels, so a pad costs nothing but memory.
      </p>
      <p>
        <strong>The pattern, and its limits.</strong> Two lists of the same length, built from slices and repetition,
        with a sentinel value where no supervision is wanted: the same shape masks system messages, earlier turns of a
        conversation, or tool outputs. Its limits: a real tokenizer splits words into subword pieces, so the boundary
        between prompt and completion must be found in token space, by tokenizing the two parts separately as here or
        by matching offsets; chat templates add special tokens around each turn that need their own treatment; and
        packing several examples into one row, which trainers do for throughput, needs masks that stop one example
        from attending to the next.
      </p>
    </>
  ),

  visual: (
    <figure className="fig">
      <LabelMaskViz />
      <figcaption className="fig-cap">
        <span className="fig-caption-text">
          The functions from the file, run on their own three examples at a reading pace: three seconds per example
          and under half a minute in all. Each example is a row of token boxes with the word above, the id inside, and
          the label below: grey where the label is minus one hundred, blue where the completion id is trained, green
          for the end-of-sequence token. Then the pads appear with their zero masks, the count totals the trained
          tokens, and a beat shows what shipped, with every prompt label turned red and counted. The practice variation
          slides the rows left to ten positions. Step through with the buttons. The figure rests for two minutes before
          it plays again, and the motion setting in the site header can slow or stop it. Every id, label, and count
          comes from the same functions run in the browser and is compared with the Python run.
        </span>
      </figcaption>
    </figure>
  ),

  tradeoffs: [
    {
      name: 'Train on every token (what shipped)',
      preferWhen: 'The data is plain text with no prompt and completion roles, continued pretraining on documents, or when the prompts are themselves what the model should learn to write.',
      cost: 'On a prompt and completion set the model is rewarded for predicting the customer\'s side: on these three examples 13 of the 33 trained tokens are prompt, the loss number says nothing about answer quality, and the model learns to parrot the question.',
    },
    {
      name: 'Mask the prompt with the ignore label (this lesson)',
      preferWhen: 'Supervised fine-tuning on prompt and completion pairs, which is almost always: two aligned lists, a sentinel the loss already understands, and no change to the trainer.',
      cost: 'Fewer trained tokens per row, 20 of 33 here, so each example teaches less and the batch carries read-only tokens; and the boundary must be located in token space, which takes care with subword tokenizers and chat templates.',
    },
    {
      name: 'A small weight on prompt tokens instead of zero',
      preferWhen: 'The prompts carry domain language worth absorbing and the set is small: a loss weight such as a tenth on prompt positions keeps a little of that signal without letting the prompt dominate.',
      cost: 'A custom loss instead of the built-in ignore index, one more hyperparameter to tune, and loss numbers that are no longer comparable with standard runs; the parroting comes back as the weight rises.',
    },
  ],
};
