import CodeBlock from '../../src/components/CodeBlock.jsx';
import WindowChunksViz from './visuals/WindowChunksViz.jsx';
import solutionSource from './python/src/window_chunks/solution.py?raw';
import starterSource from './python/src/window_chunks/starter.py?raw';
import answerSource from './python/src/window_chunks/practice_answer.py?raw';
import lessonTests from './python/tests/test_lesson.py?raw';
import expectedOutput from './python/fixtures/expected-output.txt?raw';
import expectedPracticeOutput from './python/fixtures/expected-practice-output.txt?raw';
import documentFixture from './python/fixtures/document.json?raw';

// Authored by Claude Fable 5 in the main thread. Every number on this page was
// produced by running the files below; the expected outputs are the files'
// actual output, compared byte for byte by the tests.
const answerSnippet = answerSource.split('# --- answer begins ---\n')[1].split('# --- answer ends ---')[0].trim();

export const content = {
  brief: (
    <>
      <p>
        Orbit&apos;s older runbooks are long paragraphs with no headings, so the block packer from the first lesson
        has nothing to pack, and ingest fell back to fixed windows of twelve words with no overlap. The recovery
        instruction &quot;set the timeout to thirty seconds&quot; was cut in two at a window boundary: the retriever
        returned one chunk that ended &quot;set the&quot; and another that began &quot;timeout to thirty seconds&quot;,
        and the assistant answered with neither.
      </p>
      <p>
        <strong>The action to practice:</strong> slide a window of <code>window</code> words forward by{' '}
        <code>window - overlap</code> words at a time, so the last <code>overlap</code> words of each chunk open the
        next one. The rules fit in four sentences:
      </p>
      <ul>
        <li>Split the text into words on whitespace; punctuation stays attached to its word. Positions count from 0, and a chunk&apos;s end position is one past its last word, the way Python slices work.</li>
        <li>Windows start at 0, then every <code>stride = window - overlap</code> words; each one takes <code>window</code> words, or whatever is left at the end.</li>
        <li>The loop stops after the window that reaches the end of the text. Without that stop, one more window would start and repeat words the previous chunk already holds.</li>
        <li>A window below 1, or an overlap that is negative or not smaller than the window, raises a <code>ValueError</code>; a stride of zero would never move. An empty document gives no chunks.</li>
      </ul>
      <p>
        <strong>Input.</strong> One paragraph of 39 words, inline as a string, with a window of 12 and an overlap of
        4. Its four sentences and their word positions:
      </p>
      <table>
        <thead><tr><th>positions</th><th>sentence</th></tr></thead>
        <tbody>
          <tr><td>0 to 12</td><td>The gateway returns a timeout when the model takes longer than the limit.</td></tr>
          <tr><td>13 to 19</td><td>Check the queue depth and the logs.</td></tr>
          <tr><td>20 to 31</td><td>To recover, set the timeout to thirty seconds, then restart the worker.</td></tr>
          <tr><td>32 to 38</td><td>Confirm the alert clears within five minutes.</td></tr>
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
        Change one behavior. The sentence &quot;To recover, set the timeout to thirty seconds, then restart the
        worker.&quot; is twelve words long and starts at word 20, so no twelve-word window that starts at a multiple of
        eight contains all of it; a hit on chunk c3 alone returns the instruction with its ending cut off. The file
        below is the worked solution with an <code>expand</code> function that is not written yet: it returns the hit
        chunk alone. As shipped the file prints <code>NOT OK</code> and stops.
      </p>
      <p>
        <strong>Hint.</strong> Collect the chunk ids in a list and find the hit&apos;s position with the list&apos;s{' '}
        <code>index</code> method. The first neighbour is <code>max(0, position - 1)</code> and the last is{' '}
        <code>min(len(chunks) - 1, position + 1)</code>, which clamps both ends of the list. Take the start of the first
        neighbour and the end of the last, slice the words between them, and join them with spaces.
      </p>
      <p>
        <strong>Expected result.</strong> The hit on c3 expands to c2, c3, and c4, words 8 to 35, which contains the
        whole sentence. c1 expands to c1 and c2 only, and c5 to c4 and c5 only. The file prints the hit alone, the
        expansion, the sentence check, the two ends, and <code>OK</code>.
      </p>
      <details>
        <summary>Show the answer</summary>
        <CodeBlock filename="Practice answer" code={answerSnippet} />
        <p>
          <code>ids.index(hit_id)</code> finds the position of the hit, and raises a <code>ValueError</code> for an id
          that is not there, which is the right failure for a bad hit. The two clamps are the whole trick: at the
          first chunk <code>max</code> keeps the first neighbour at 0, and at the last chunk <code>min</code> keeps the
          last neighbour at the final index. Slicing the original words from the first start to the last end avoids
          the duplicated overlap words you would get by joining the chunk texts. Everything outside the marked region
          is the practice file unchanged.
        </p>
      </details>
    </>
  ),

  files: [
    { path: 'python/src/window_chunks/solution.py', role: 'reference', language: 'python', source: solutionSource, primary: true,
      description: 'The complete worked example: the paragraph, the settings, chunk_words, whole_in, and a demonstration that prints the chunks, the storage cost, the span checks with and without overlap, the two rejected settings, and OK. Runs alone with Python 3.11 or newer.' },
    { path: 'python/src/window_chunks/starter.py', role: 'starter', language: 'python', source: starterSource, primary: true,
      description: 'The practice file: the worked solution with the twelve-word sentence, the hit, and an expand function that returns the hit chunk alone. Prints NOT OK until expand returns the hit with its neighbours.' },
    { path: 'python/src/window_chunks/practice_answer.py', role: 'reference', language: 'python', source: answerSource,
      description: 'The completed practice variation; the page shows the region between its answer markers.' },
    { path: 'python/fixtures/expected-output.txt', role: 'fixture', language: 'text', source: expectedOutput,
      description: 'What solution.py prints, byte for byte. The test runs the file alone and compares.' },
    { path: 'python/fixtures/expected-practice-output.txt', role: 'fixture', language: 'text', source: expectedPracticeOutput,
      description: 'What practice_answer.py prints, byte for byte.' },
    { path: 'python/tests/test_lesson.py', role: 'test', language: 'python', source: lessonTests,
      description: 'Runs the three lesson files alone, checks the window positions and texts, the shared words, the coverage, the overlap guarantee by brute force, the rejected settings, the practice expansion, and what the no-overlap ingest cut on the same document; pins the animation fixtures to the solution.' },
    { path: 'python/fixtures/document.json', role: 'fixture', language: 'json', source: documentFixture,
      description: 'The paragraph, the window and overlap, the instruction span, the practice sentence, and the hit exactly as the lesson files define them; the animation runs on this copy and a test pins it to the files.' },
  ],

  evidence: (
    <>
      <p>
        <strong>What the file checks</strong> before it prints <code>OK</code>: the five windows at positions 0 to 12,
        8 to 20, 16 to 28, 24 to 36, and 32 to 39; the instruction whole in c3 with the overlap and in no chunk
        without it; and no chunks for an empty document. Run your copy and compare its output with the expected output
        above; they must match line for line.
      </p>
      <p>
        <strong>The failure cases.</strong> The demonstration asks for an overlap of 12 with a window of 12, which would
        give a stride of zero and a loop that never moves, and for a window of 0; each raises a <code>ValueError</code>{' '}
        that the demonstration prints as a rejected line naming the setting. The tests in the project download also
        check a negative overlap, that a blank document gives no chunks, that a document shorter than the window is
        one chunk, and that a window of 2 with an overlap of 1 steps one word at a time.
      </p>
      <p>
        <strong>What shipped, on the same document.</strong> With no overlap the windows sit at 0, 12, 24, and 36. The
        boundary at word 24 falls inside the instruction: the second chunk ends &quot;set the&quot; and the third
        begins &quot;timeout to thirty seconds,&quot;. With an overlap of 4 the instruction lies whole in c3. The
        overlap is not free: 55 words are stored for 39, 1.41 times the text to embed and search, against exactly 39
        with no overlap. The guarantee is measured by brute force over every position and length: with an overlap of
        4, every span of up to 5 words is whole in some chunk; with no overlap, only single words are. All three
        measurements are tests in the project download.
      </p>
    </>
  ),

  solution: (
    <>
      <p>
        Read the file top to bottom: the paragraph and the settings, one function that makes the chunks, a helper
        that checks a span, and a demonstration. Here is its Python, construct by construct.
      </p>
      <ol>
        <li>
          <strong>Guard clauses first.</strong> <code>if window &lt; 1: raise ValueError(...)</code> and the same for
          an overlap below 0 or at least the window. The second guard is what keeps <code>stride</code> positive;
          checking the settings before the loop means a bad configuration stops ingest at once rather than producing
          a stream of identical chunks.
        </li>
        <li>
          <strong>Words from text.</strong> <code>words = text.split()</code> with no argument splits on any run of
          whitespace and never returns an empty word, so a blank document becomes an empty list. Punctuation stays on
          its word: <code>&quot;limit.&quot;</code> is one word. The window counts words, so one word is one unit.
        </li>
        <li>
          <strong>A range with a step.</strong> <code>for start in range(0, len(words), stride):</code> is the
          three-argument form of <code>range</code>: from 0, up to but not including the word count, every{' '}
          <code>stride</code> words. With 39 words and a stride of 8 the starts are 0, 8, 16, 24, and 32, and 40 would
          be next.
        </li>
        <li>
          <strong>The end, capped.</strong> <code>end = min(start + window, len(words))</code> is the start plus the
          window, or the word count when that is smaller: the last window is allowed to be short. The slice{' '}
          <code>words[start:end]</code> takes positions <code>start</code> up to but not including <code>end</code>,
          which is why the output prints <code>end - 1</code> as the last word.
        </li>
        <li>
          <strong>One dictionary per chunk.</strong> The id is an f-string, <code>f&quot;c{'{'}len(chunks) + 1{'}'}&quot;</code>,
          so the first chunk is c1. <code>&quot; &quot;.join(words[start:end])</code> rebuilds the chunk&apos;s text
          with single spaces. The start and end ride along so the chunk can be cited and so <code>whole_in</code> has
          something to compare.
        </li>
        <li>
          <strong>The break.</strong> <code>if end == len(words): break</code> leaves the loop as soon as a window has
          reached the end. Without it the range would produce a start of 32 and then 40; 40 is past the end and never
          runs, but with other counts a window can start inside the last one and add nothing new. The test in the
          download checks that no chunk lies inside another.
        </li>
        <li>
          <strong>The span check.</strong> <code>whole_in</code> keeps the ids of the chunks whose start is at or before
          the span&apos;s start and whose end is at or after the span&apos;s end: containment is two comparisons. The
          demonstration calls it as <code>whole_in(chunks, *SPAN)</code>; the star unpacks the two-value tuple into the
          two positional arguments.
        </li>
        <li>
          <strong>The demonstration.</strong> <code>&quot;, &quot;.join(found) or &quot;none&quot;</code> prints the
          ids, and when the list is empty the join gives an empty string, which <code>or</code> replaces with the word
          none. A loop adds up <code>end - start</code> for the storage count, <code>try</code> and{' '}
          <code>except ValueError</code> show the rejections without crashing, and each <code>assert</code> checks one
          claim before <code>OK</code>.
        </li>
      </ol>
      <p><strong>Trace the windows.</strong> Follow <code>start</code>, the capped <code>end</code>, and the words shared with the previous chunk:</p>
      <table>
        <thead><tr><th>chunk</th><th>start</th><th>end</th><th>words</th><th>shared with previous</th></tr></thead>
        <tbody>
          <tr><td>c1</td><td>0</td><td>12</td><td>12</td><td>none</td></tr>
          <tr><td>c2</td><td>8</td><td>20</td><td>12</td><td>8 to 11 (4 words)</td></tr>
          <tr><td>c3</td><td>16</td><td>28</td><td>12</td><td>16 to 19</td></tr>
          <tr><td>c4</td><td>24</td><td>36</td><td>12</td><td>24 to 27</td></tr>
          <tr><td>c5</td><td>32</td><td>39 (capped)</td><td>7</td><td>32 to 35, then break</td></tr>
        </tbody>
      </table>
      <p>
        Each start is the previous start plus 8, and each window shares its first four words with the chunk before it.
        c5 asks for 32 to 44, the cap holds it at 39, and because that end equals the word count the loop breaks. The
        instruction occupies words 22 to 27; c3 covers 16 to 27, so it holds the instruction whole, while c2 stops at
        19 and c4 starts at 24. Five chunks hold 12 + 12 + 12 + 12 + 7 = 55 words, 1.41 times the 39 in the text.
      </p>
      <p>
        <strong>Why these decisions.</strong> Words rather than characters because the learner can count them by eye;
        in production the unit is the tokenizer&apos;s token, and the loop is identical over a list of token ids. The
        overlap is measured in words because that is what gives the guarantee: with a stride of <code>window - overlap</code>,
        every span of up to <code>overlap + 1</code> words lies whole in some chunk wherever it falls, and the tests
        confirm that bound by brute force. The six-word instruction is longer than that bound and fit by its position;
        a longer overlap or the practice&apos;s neighbour expansion is what makes longer spans safe. Bad settings raise
        because a wrong window is a configuration error that should stop ingest, while an empty document returns an
        empty list because a pipeline often meets one and should decide for itself.
      </p>
      <p>
        <strong>The pattern, and its limits.</strong> <code>range</code> with a step plus a slice is the general
        sliding window: the same two lines cut time series into windows, token streams into n-grams, and a corpus into
        embedding batches. Its limits: a flat window is blind to sentences and sections, so a structure-aware packer is
        better whenever the document has structure; overlap multiplies storage and embedding cost; a hit still
        depends on the ranker finding the right chunk; and the chunk should carry its positions so an answer can cite
        the source.
      </p>
    </>
  ),

  visual: (
    <figure className="fig">
      <WindowChunksViz />
      <figcaption className="fig-cap">
        <span className="fig-caption-text">
          The function from the file, run on its own paragraph at a reading pace: about two seconds per window and
          under half a minute in all. A ruler counts the 39 word positions, with the four sentences marked above it and
          the instruction span under it. Each beat grows one chunk&apos;s bar to its window and hatches the four words
          it shares with the chunk before in amber. Then the span turns green where c3 holds it whole, a line gives the
          storage cost, red dashed lines show the no-overlap boundaries with the cut at 24, and the practice variation
          outlines the twelve-word sentence and the hit before the green expansion across c2 to c4 appears. Step
          through with the buttons. The figure rests for two minutes before it plays again, and the motion setting in
          the site header can slow or stop it. Every position and count comes from the same function run in the
          browser and is compared with the Python run.
        </span>
      </figcaption>
    </figure>
  ),

  tradeoffs: [
    {
      name: 'Fixed windows with no overlap (what shipped)',
      preferWhen: 'Storage and embedding cost are the constraint and the questions ask about single facts that fit inside a window: it stores each word once and is the simplest chunker there is.',
      cost: 'Every boundary is a potential cut with no guarantee at all beyond single words; on this paragraph the boundary at 24 split the one instruction the runbook exists for, and nothing in the index can put it back together.',
    },
    {
      name: 'Sliding windows with overlap (this lesson)',
      preferWhen: 'The text is flat, with no headings or paragraphs to respect, and spans of a known size must survive: an overlap of O words guarantees every span of O plus 1 words a home, in two lines of range and slice.',
      cost: 'The overlap is paid again on every chunk: 1.41 times the storage here, more with a larger overlap, and neighbouring hits return duplicate text that the answer stage must dedupe. It is still blind to sentences, and the unit should be tokens, not words, before the budget is real.',
    },
    {
      name: 'Pack parsed blocks under a budget (the first lesson in this collection)',
      preferWhen: 'The document has structure, headings, paragraphs, numbered steps, that a parser can see: packing whole blocks keeps a procedure together without any overlap and gives chunks a natural title.',
      cost: 'It needs a parser and fails on exactly this kind of document, a flat paragraph with nothing to pack, which is why the ingest fell back to windows; a hybrid snaps window ends to sentence boundaries when one falls nearby, at the price of a more complex loop.',
    },
  ],
};
