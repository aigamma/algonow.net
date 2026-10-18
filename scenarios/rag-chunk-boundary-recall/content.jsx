import PackBlocksViz from './visuals/PackBlocksViz.jsx';
import solutionSource from './python/src/rag_chunking/solution.py?raw';
import starterSource from './python/src/rag_chunking/starter.py?raw';
import answerSource from './python/src/rag_chunking/practice_answer.py?raw';
import lessonTests from './python/tests/test_lesson.py?raw';
import expectedOutput from './python/fixtures/expected-output.txt?raw';
import expectedPracticeOutput from './python/fixtures/expected-practice-output.txt?raw';
import blocksFixture from './python/fixtures/blocks.json?raw';
import traceFixture from './python/fixtures/expected-trace.json?raw';

// Authored by Claude Fable 5 in the main thread. Every number on this page was
// produced by running the files below; the expected outputs are the files'
// actual output, compared byte for byte by the tests.
const answerSnippet = answerSource.split('# --- answer begins ---\n')[1].split('# --- answer ends ---')[0].trim();

export const content = {
  brief: (
    <>
      <p>
        Orbit&apos;s support assistant answers questions from runbooks. Ingest cuts each runbook into chunks, an
        index ranks the chunks against the question, and the top few are pasted into the model&apos;s prompt, each
        under a fixed budget. Last sprint ingest switched to fixed-size character windows, and multi-step answers
        started arriving in halves: the best chunk for &quot;how do I rotate a key&quot; ends in the middle of step
        two, and the model answers confidently from half a procedure.
      </p>
      <p>
        <strong>The action to practice:</strong> pack blocks that a parser already found (one paragraph or one
        numbered procedure, each under its section heading) into chunks under a budget, so that a block is never
        cut and a chunk never mixes sections. The rules are small:
      </p>
      <ul>
        <li>A chunk&apos;s text is its heading, a newline, and its body. The budget is measured on that text.</li>
        <li>Consecutive blocks under one heading join into one chunk, separated by a blank line, while the text still fits.</li>
        <li>A heading change, or a block that would push the text over the budget, opens a new chunk.</li>
        <li>A block that cannot fit on its own is rejected with a <code>ValueError</code> that says how big it is. The practice variation changes that one rule.</li>
      </ul>
      <p>
        <strong>Input.</strong> Five blocks from a shortened API keys runbook, each a dictionary with a heading and a
        text, and a budget of 200 characters (a stand-in for the token budget a real prompt builder counts). The
        sizes decide the packing:
      </p>
      <table>
        <thead><tr><th>block</th><th>heading</th><th>text</th><th>chars</th><th>with heading</th></tr></thead>
        <tbody>
          <tr><td>1</td><td>API keys</td><td>Keys are shown once at creation and stored hashed...</td><td>97</td><td>106</td></tr>
          <tr><td>2</td><td>Rotate a key</td><td>Rotation keeps the old key valid while the new one rolls out.</td><td>61</td><td>74</td></tr>
          <tr><td>3</td><td>Rotate a key</td><td>1. Create a replacement key... (three numbered steps)</td><td>119</td><td>132</td></tr>
          <tr><td>4</td><td>Rotate a key</td><td>Before revoking, confirm in the request log...</td><td>97</td><td>110</td></tr>
          <tr><td>5</td><td>Scopes</td><td>The read scope covers list and get calls...</td><td>81</td><td>88</td></tr>
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
        Change one behavior. The worked solution rejects a block that cannot fit on its own. Make it split such a
        block at its line breaks instead, so each line becomes its own block under the same heading, and then pack
        as before. The file below is the worked solution with the five-step incident block added to its input and
        a check for the new behavior. As shipped it prints <code>NOT OK</code> and stops.
      </p>
      <p>
        <strong>Hint.</strong> Do the splitting before the loop decides anything: build a new list of blocks in
        which only the oversized ones are replaced by one block per line, then let the existing loop pack that
        list. <code>text.split(&quot;\n&quot;)</code> turns a multi-line string into a list of lines. The{' '}
        <code>raise</code> can stay as the guard for a single line that is still too long.
      </p>
      <p>
        <strong>Expected result.</strong> Six chunks: the four from the worked example, then the incident steps
        one to three (136 characters) and steps four to five (161 characters). The file ends with <code>OK</code>.
      </p>
      <details>
        <summary>Show the answer</summary>
        <pre><code>{answerSnippet}</code></pre>
        <p>
          One new function and one new line at the top of <code>pack_blocks</code>. The split lines are ordinary
          blocks from then on, so they rejoin with blank lines like any other blocks, and a single line over the
          budget is still rejected. Everything outside the marked region is the practice file unchanged.
        </p>
      </details>
    </>
  ),

  files: [
    { path: 'python/src/rag_chunking/solution.py', role: 'reference', language: 'python', source: solutionSource, primary: true,
      description: 'The complete worked example: the five blocks, chunk_text, pack_blocks, and a demonstration that prints the chunks, the rejected block, and OK. Runs alone with Python 3.11 or newer.' },
    { path: 'python/src/rag_chunking/starter.py', role: 'starter', language: 'python', source: starterSource, primary: true,
      description: 'The practice file: the worked solution plus the oversized incident block and a check for the new behavior. Prints NOT OK until pack_blocks splits that block at its line breaks.' },
    { path: 'python/src/rag_chunking/practice_answer.py', role: 'reference', language: 'python', source: answerSource,
      description: 'The completed practice variation; the page shows the region between its answer markers.' },
    { path: 'python/fixtures/expected-output.txt', role: 'fixture', language: 'text', source: expectedOutput,
      description: 'What solution.py prints, byte for byte. The test runs the file alone and compares.' },
    { path: 'python/fixtures/expected-practice-output.txt', role: 'fixture', language: 'text', source: expectedPracticeOutput,
      description: 'What practice_answer.py prints, byte for byte.' },
    { path: 'python/tests/test_lesson.py', role: 'test', language: 'python', source: lessonTests,
      description: 'Runs the three lesson files alone and checks the packing rules, the exact budget boundary, the rejection, that the input is never modified, and that the animation fixtures match the solution.' },
    { path: 'python/fixtures/blocks.json', role: 'fixture', language: 'json', source: blocksFixture,
      description: 'The five blocks, the budget, and the oversized block, exactly as solution.py defines them; the animation runs on this copy and a test pins it to the file.' },
    { path: 'python/fixtures/expected-trace.json', role: 'fixture', language: 'json', source: traceFixture,
      description: 'Every decision the loop makes on the example, derived from the Python solution; the animation must replay it exactly.' },
  ],

  evidence: (
    <>
      <p>
        <strong>What the file checks</strong> before it prints <code>OK</code>: every chunk text is within 200
        characters, there are four chunks, and the three-step procedure sits whole inside chunk 2. Run your copy and
        compare its output with the expected output above; they must match line for line.
      </p>
      <p>
        <strong>The failure case.</strong> The incident block&apos;s five steps make 267 characters, 281 with the
        heading, so <code>pack_blocks</code> raises; the demonstration catches the error and prints the rejected
        line. The budget is never raised to make a block fit, and a chunk may reach the budget exactly: the tests
        pack a block that lands on 200 and one that lands on 201.
      </p>
      <p>
        <strong>The shipped approach on the same input.</strong> Join the five texts (463 characters, headings
        dropped) and cut fixed 200-character windows, and two of the five blocks are cut: the first window ends
        inside step one of the procedure, the second inside the scopes paragraph. <code>pack_blocks</code> keeps all
        five whole. A 100-character overlap happens to rescue both on this input, at the price of indexing 826
        characters for 463 of text; it guarantees only blocks of 101 characters or fewer, and the procedure is 119.
        Both facts are checked by the tests in the project download.
      </p>
    </>
  ),

  solution: (
    <>
      <p>
        Read the file top to bottom: the input, one helper, the one function that does the work, and a
        demonstration. Here is its Python, construct by construct.
      </p>
      <ol>
        <li>
          <strong>Records as dictionaries in a list.</strong> <code>BLOCKS</code> is a list, written with square
          brackets. Each element is a dictionary, written with braces, holding two keys. <code>block[&quot;heading&quot;]</code>{' '}
          reads a value by its key. This is the shape of almost every dataset an AI engineer touches: a list of
          records, usually loaded from JSON. Adjacent string literals inside parentheses are glued into one string,
          which is how the three-step procedure is written on three lines.
        </li>
        <li>
          <strong>A helper that names a rule.</strong> <code>chunk_text(heading, text)</code> returns{' '}
          <code>heading + &quot;\n&quot; + text</code>. Plus joins strings and <code>&quot;\n&quot;</code> is a newline.
          The budget is measured on this string in three places, and a reader learns the rule once.
        </li>
        <li>
          <strong>The loop.</strong> <code>chunks = []</code> starts with an empty list. <code>for block in blocks:</code>{' '}
          visits each record in order, and <code>heading = block[&quot;heading&quot;]</code> copies a value into a short
          name so the lines below read plainly.
        </li>
        <li>
          <strong>The guard.</strong> <code>len(...)</code> counts characters. If the block&apos;s own chunk text is
          over the budget, <code>raise ValueError(f&quot;...&quot;)</code> stops the function with an error. An f-string,
          marked by the <code>f</code> before the quote, puts the variables in braces straight into the message.
        </li>
        <li>
          <strong>The join decision.</strong> <code>if chunks and chunks[-1][&quot;heading&quot;] == heading:</code> An empty
          list counts as false, so the line reads &quot;if there is an open chunk and its heading matches&quot;.{' '}
          <code>chunks[-1]</code> is the last element; negative indexes count from the end. <code>joined</code> is the
          candidate body: the open chunk&apos;s text, a blank line, this block. If its chunk text fits,{' '}
          <code>chunks[-1][&quot;text&quot;] = joined</code> replaces the body of the last chunk in place, and{' '}
          <code>continue</code> jumps to the next block, skipping the append below.
        </li>
        <li>
          <strong>Otherwise a new chunk.</strong> <code>chunks.append({'{'}...{'}'})</code> adds a new dictionary to the
          end of the list. It is a new record built from the two values, not the input block itself, so the
          caller&apos;s list is never modified. <code>return chunks</code> hands the list back.
        </li>
        <li>
          <strong>The demonstration.</strong> <code>if __name__ == &quot;__main__&quot;:</code> runs only when the file is
          executed directly, not when a test imports it. <code>enumerate(chunks, start=1)</code> yields a number and a
          chunk together. <code>try</code> and <code>except ValueError as error</code> catch the rejection and print
          it instead of crashing. Each <code>assert</code> makes the file check one of its own claims before it
          prints <code>OK</code>.
        </li>
      </ol>
      <p><strong>Trace the variables.</strong> Follow <code>chunks</code> through the five blocks:</p>
      <table>
        <thead><tr><th>block</th><th>open chunk</th><th>test</th><th>result</th><th>chunks</th></tr></thead>
        <tbody>
          <tr><td>1 API keys (97)</td><td>none</td><td>list is empty</td><td>open chunk 1: 106</td><td>1</td></tr>
          <tr><td>2 Rotate a key (61)</td><td>API keys</td><td>heading differs</td><td>open chunk 2: 74</td><td>2</td></tr>
          <tr><td>3 Rotate a key (119)</td><td>Rotate a key</td><td>74 + 2 + 119 = 195 ≤ 200</td><td>join: chunk 2 is now 195</td><td>2</td></tr>
          <tr><td>4 Rotate a key (97)</td><td>Rotate a key</td><td>195 + 2 + 97 = 294 &gt; 200</td><td>open chunk 3: 110</td><td>3</td></tr>
          <tr><td>5 Scopes (81)</td><td>Rotate a key</td><td>heading differs (193 would have fit)</td><td>open chunk 4: 88</td><td>4</td></tr>
        </tbody>
      </table>
      <p>
        <strong>Why these decisions.</strong> Blocks are the unit because the parser already found the boundaries
        that matter: a numbered procedure is one block, so it can only enter a chunk whole. The heading rides inside
        the chunk text because the index scores it (a question that says &quot;rotate&quot; matches the heading even
        when the body says &quot;replacement&quot;) and the model reads it as context. Packing is greedy and in document
        order, rather than an optimal rearrangement, because reading order and citations survive, the pass is
        linear, and a reader can predict where a boundary falls. Rejecting an oversized block is a deliberate
        policy: a loud failure at ingest beats a silently truncated answer at query time, and the right split
        depends on the content, which is what the practice variation decides.
      </p>
      <p>
        <strong>The pattern, and its limits.</strong> This is greedy packing of ordered units under a budget. The
        same loop batches requests under a token limit, groups log lines into one alert, and fills a context window
        with retrieved passages. Characters stand in for tokens here; a real prompt builder measures with the serving
        model&apos;s tokenizer, and the decisions carry over unchanged while the numbers do not. The never-cut rule
        holds only because the budget wins by rejecting; if blocks can exceed it, decide where they may be split
        before you decide how a chunk grows. Nothing here ranks chunks: retrieval quality is the next lesson.
      </p>
    </>
  ),

  visual: (
    <figure className="fig">
      <PackBlocksViz />
      <figcaption className="fig-cap">
        <span className="fig-caption-text">
          The loop from the file, run on its own five blocks at a reading pace: about three seconds per decision,
          about half a minute in all. Each block is carried to the chunk it lands in while the caption states the
          decision in the words of the trace table; the chunk bars fill against the 200-character budget; the
          oversized incident block is rejected at 281; then the practice variation splits it into five lines that
          pack into two more chunks. Step through with the buttons. The figure rests for two minutes before it plays
          again, and the motion setting in the site header can slow or stop it. Every decision and number comes from
          the same loop run in the browser and is checked against the Python run.
        </span>
      </figcaption>
    </figure>
  ),

  tradeoffs: [
    {
      name: 'Fixed windows with overlap (what shipped, plus the first proposal)',
      preferWhen: 'Text with no structure at all, such as a transcript or an OCR dump, where there are no headings or blocks to pack and something is needed today.',
      cost: 'On the five-block example a 100-character overlap rescues the cut procedure only by alignment: an overlap of n characters guarantees whole blocks of at most n plus 1, the procedure is 119, and the index holds 826 characters for 463 of text. A boundary problem is not fixed by a bandage over the boundary.',
    },
    {
      name: 'Sentence-level splitting for oversized blocks',
      preferWhen: 'Paragraphs that routinely exceed the budget, where rejecting at ingest is not an option and a cut at a sentence end is acceptable.',
      cost: 'A sentence splitter (a regular expression or a tokenizer), pieces that lose the context of their list numbering, and chunks that still end mid-procedure when a single step is long. It replaces one policy with a more complex one; it does not remove the decision.',
    },
    {
      name: 'Parent-section retrieval (small to big)',
      preferWhen: 'Questions whose answer spans a whole section: index small chunks for ranking, then hand the model the enclosing section instead of the chunk.',
      cost: 'The budget moves to the section level, so a section over the budget still needs a packer exactly like this one, and every hit costs more prompt. Worth it when sections are short and questions are broad.',
    },
  ],
};
