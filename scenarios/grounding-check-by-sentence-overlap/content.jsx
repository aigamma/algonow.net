import CodeBlock from '../../src/components/CodeBlock.jsx';
import GroundingViz from './visuals/GroundingViz.jsx';
import solutionSource from './python/src/grounding_check/solution.py?raw';
import starterSource from './python/src/grounding_check/starter.py?raw';
import answerSource from './python/src/grounding_check/practice_answer.py?raw';
import lessonTests from './python/tests/test_lesson.py?raw';
import expectedOutput from './python/fixtures/expected-output.txt?raw';
import expectedPracticeOutput from './python/fixtures/expected-practice-output.txt?raw';
import answerFixture from './python/fixtures/answer.json?raw';

// Authored by Claude Fable 5 in the main thread. Every number on this page was
// produced by running the files below; the expected outputs are the files'
// actual output, compared byte for byte by the tests.
const answerSnippet = answerSource.split('# --- answer begins ---\n')[1].split('# --- answer ends ---')[0].trim();

export const content = {
  brief: (
    <>
      <p>
        Orbit&apos;s assistant answers support questions from retrieved runbook chunks and cites them. A reviewed
        answer about rotating an API key invented a step, &quot;restart the gateway&quot;, that appears in none of
        the runbooks, and the citation check passed because every sentence carried a bracket. A bracket proves that
        the model wrote a citation; it does not prove that the chunk says what the sentence says.
      </p>
      <p>
        <strong>The action to practice:</strong> a grounding check by word overlap. Split the answer into sentences,
        turn each sentence and each chunk into a set of content words, find the chunk that shares the largest share
        of each sentence&apos;s words, and flag the sentence when that share is below a threshold. The rules are
        small:
      </p>
      <ul>
        <li>A sentence ends at a period, a question mark, or an exclamation mark; its citation in square brackets is set aside, not scored.</li>
        <li>Content words are lowercase, punctuation removed, a short stopword list dropped, kept in a set, so a repeated word counts once.</li>
        <li>The support score is the shared words divided by the sentence&apos;s own content words, not the chunk&apos;s, because chunks are long.</li>
        <li>The best chunk has the highest score, and the first chunk wins a tie; <code>supported</code> at or above 0.6, otherwise <code>unsupported</code>; a sentence with no content words is reported as <code>no content</code>.</li>
        <li>An empty answer raises a <code>ValueError</code>.</li>
      </ul>
      <p>
        <strong>Input.</strong> Three retrieved chunks and a four-sentence answer, written inline:
      </p>
      <table>
        <thead><tr><th>chunk</th><th>text</th></tr></thead>
        <tbody>
          <tr><td>c1</td><td>To rotate an API key, create a replacement key with the same scopes and deploy it to every service that uses the old key.</td></tr>
          <tr><td>c2</td><td>Revoke the old key only after the replacement has been deployed everywhere; revocation takes effect within a minute.</td></tr>
          <tr><td>c3</td><td>A lost key cannot be recovered. Create a replacement key and revoke the lost one as soon as possible.</td></tr>
        </tbody>
      </table>
      <table>
        <thead><tr><th>#</th><th>answer sentence</th><th>cites</th></tr></thead>
        <tbody>
          <tr><td>1</td><td>Create a replacement key with the same scopes and deploy it to each service.</td><td>c1</td></tr>
          <tr><td>2</td><td>Revoke the old key only once the replacement is deployed everywhere.</td><td>c3</td></tr>
          <tr><td>3</td><td>Then restart the gateway so the new key is picked up.</td><td>c1</td></tr>
          <tr><td>4</td><td>Revocation takes effect within a minute.</td><td>c2</td></tr>
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
        Change one behavior. The worked solution calls a sentence supported when its best chunk clears the threshold,
        whichever chunk that is. Make <code>check_grounding</code> stricter when <code>require_citation</code> is{' '}
        <code>True</code>: a sentence counts as supported only if its best chunk is one of the chunks it cites. A
        sentence that clears the threshold but cites a different chunk gets the verdict <code>miscited</code>. The
        file below is the worked solution with the flag accepted but unused, and a check for the new behavior. As
        shipped it prints <code>NOT OK</code> and stops.
      </p>
      <p>
        <strong>Hint.</strong> The cited ids are already in the list that <code>split_citation</code> returns. After
        the verdict is chosen, one more <code>if</code> turns <code>supported</code> into <code>miscited</code> when the
        flag is on and <code>best_id not in cited</code>. The <code>in</code> operator answers membership for a list
        the same way it does for a set.
      </p>
      <p>
        <strong>Expected result.</strong> Sentence 2 scores 0.857 against c2 but cites c3, so it becomes{' '}
        <code>miscited</code>; 2 of 4 sentences supported; flagged: sentence 2 (miscited), 3 (unsupported). The file
        ends with <code>OK</code>.
      </p>
      <details>
        <summary>Show the answer</summary>
        <CodeBlock filename="Practice answer" code={answerSnippet} />
        <p>
          One <code>if</code> with three conditions joined by <code>and</code>, placed after the verdict chain so it
          only ever downgrades a supported sentence. The support is real, the score is unchanged; what the verdict
          now says is that the reader is sent to the wrong chunk. Everything outside the marked region is the
          practice file unchanged.
        </p>
      </details>
    </>
  ),

  files: [
    { path: 'python/src/grounding_check/solution.py', role: 'reference', language: 'python', source: solutionSource, primary: true,
      description: 'The complete worked example: the three chunks, the answer, the stopwords, split_sentences, split_citation, content_words, support_score, check_grounding, and a demonstration that prints the rows, the summary, the rejected answer, and OK. Runs alone with Python 3.11 or newer.' },
    { path: 'python/src/grounding_check/starter.py', role: 'starter', language: 'python', source: starterSource, primary: true,
      description: 'The practice file: the worked solution with a require_citation flag that is not used yet, and a check for the new behavior. Prints NOT OK until a supported sentence that does not cite its best chunk is marked miscited.' },
    { path: 'python/src/grounding_check/practice_answer.py', role: 'reference', language: 'python', source: answerSource,
      description: 'The completed practice variation; the page shows the region between its answer markers.' },
    { path: 'python/fixtures/expected-output.txt', role: 'fixture', language: 'text', source: expectedOutput,
      description: 'What solution.py prints, byte for byte. The test runs the file alone and compares.' },
    { path: 'python/fixtures/expected-practice-output.txt', role: 'fixture', language: 'text', source: expectedPracticeOutput,
      description: 'What practice_answer.py prints, byte for byte.' },
    { path: 'python/tests/test_lesson.py', role: 'test', language: 'python', source: lessonTests,
      description: 'Runs the three lesson files alone and checks the splitter, the citation split, the word sets, the score edges, the threshold boundary, the tie rule, the rejected answer, the practice verdicts, and the animation fixtures, and measures the citation-presence check that shipped against the overlap check on the same answer.' },
    { path: 'python/fixtures/answer.json', role: 'fixture', language: 'json', source: answerFixture,
      description: 'The chunks, the answer, the threshold, and the stopwords exactly as the lesson files define them; the animation runs on this copy and a test pins it to the files. The trace fixture it replays ships in the project download.' },
  ],

  evidence: (
    <>
      <p>
        <strong>What the file checks</strong> before it prints <code>OK</code>: three sentences supported and the
        restart sentence flagged, that sentence&apos;s best score rounding to 0.167, and sentence 2 being supported by
        c2 while it cites c3. Run your copy and compare its output with the expected output above; they must match
        line for line.
      </p>
      <p>
        <strong>The failure case.</strong> An answer of only spaces splits into no sentences, so{' '}
        <code>check_grounding</code> raises <code>ValueError</code> and the demonstration prints the rejected line.
        The tests in the project download also feed the splitter a question mark, an exclamation mark, and a
        trailing fragment without a period; give <code>split_citation</code> a sentence with no bracket and one with
        two ids; score a sentence whose words are all stopwords (<code>no content</code>, score 0); check that a
        score of exactly 0.6 is supported and 0.6 against a threshold of 0.61 is not; and reverse the chunk order to
        show that a tie goes to whichever chunk comes first.
      </p>
      <p>
        <strong>What shipped, on the same answer.</strong> The citation-presence check asks only whether each
        sentence carries a bracket: 4 of 4 do, so it passed everything, including the invented step. The overlap
        check scores that sentence at 0.167 against every chunk, because the only word it shares with any of them
        is &quot;key&quot;, and flags it. Both measurements are tests in the project download.
      </p>
    </>
  ),

  solution: (
    <>
      <p>
        Read the file top to bottom: the input, a stopword set, four small helpers, the one function that does the
        work, and a demonstration. Here is its Python, construct by construct.
      </p>
      <ol>
        <li>
          <strong>A character loop with a buffer.</strong> <code>split_sentences</code> walks the text one character
          at a time, appending each to <code>buffer</code> with <code>buffer = buffer + char</code>. When the character
          is in the string <code>&quot;.?!&quot;</code> (<code>in</code> tests a single character against a string),
          the buffer is a finished sentence: <code>strip()</code> trims its spaces, a non-empty result is appended, and
          the buffer is reset to <code>&quot;&quot;</code>. After the loop, any leftover text without a final period is
          appended too.
        </li>
        <li>
          <strong>find and slicing.</strong> <code>sentence.find(&quot;[&quot;)</code> returns the index of the first
          bracket, or <code>-1</code> when there is none; the guard returns the sentence and an empty list in that
          case. The slice <code>sentence[start + 1:end]</code> is the text between the brackets, which{' '}
          <code>split(&quot;,&quot;)</code> turns into ids, each <code>strip()</code>ped of spaces in a loop. The
          sentence without its citation is two slices joined, <code>sentence[:start].rstrip()</code> (the space
          before the bracket dropped) plus <code>sentence[end + 1:]</code>, and the function returns both values as a
          tuple, which the caller unpacks with <code>text, cited = split_citation(sentence)</code>.
        </li>
        <li>
          <strong>A set built in a loop.</strong> <code>content_words</code> lowercases the text, then copies each
          character that <code>isalnum()</code> or <code>isspace()</code> and replaces anything else with a space,
          so <code>&quot;key,&quot;</code> becomes <code>key</code> and <code>&quot;everywhere;&quot;</code> loses its
          semicolon. <code>split()</code> with no argument breaks on any run of whitespace. The loop adds each word
          to a <code>set()</code> with <code>add</code> unless <code>word in STOPWORDS</code>, where{' '}
          <code>STOPWORDS</code> is a set literal written with braces. A set has no duplicates, so a word that appears
          twice counts once.
        </li>
        <li>
          <strong>Intersection and a ratio.</strong> <code>sentence_words &amp; chunk_words</code> is a new set holding
          the words in both. <code>len(shared) / len(sentence_words)</code> is the share of the sentence that the
          chunk covers; the <code>if len(sentence_words) == 0</code> guard returns <code>0.0</code> first, because a
          division by zero would raise.
        </li>
        <li>
          <strong>Best so far.</strong> <code>check_grounding</code> starts <code>best_score</code> at{' '}
          <code>-1.0</code>, a value every real score beats, and <code>best_id</code> at <code>None</code>. The inner
          loop scores each chunk and keeps it only when <code>score &gt; best_score</code>; the strict comparison means
          a later chunk with the same score does not replace the earlier one, so a tie goes to the first chunk.{' '}
          <code>enumerate(sentences, start=1)</code> yields the number and the sentence together.
        </li>
        <li>
          <strong>The verdict chain.</strong> <code>if</code>, <code>elif</code>, <code>else</code> try three cases in
          order and take the first that is true: no content words, a best score at or above the threshold
          (<code>&gt;=</code>, so exactly 0.6 is supported), and everything else. Each row is a dictionary built with a
          literal, and the function returns the list of rows.
        </li>
        <li>
          <strong>The demonstration.</strong> The f-string format specs line up the table: <code>{'{row[\'number\']:<3}'}</code>{' '}
          left-aligns in three columns and <code>{'{row[\'score\']:>5.3f}'}</code> prints three decimals in five.{' '}
          <code>&quot;,&quot;.join(row[&quot;cited&quot;])</code> prints a list of ids as one string. A loop counts the
          supported rows and collects the flagged numbers, <code>try</code> and <code>except ValueError</code> show the
          rejected answer, and each <code>assert</code> checks one claim before <code>OK</code>.
        </li>
      </ol>
      <p><strong>Trace the variables.</strong> Follow each sentence&apos;s content words and its three scores:</p>
      <table>
        <thead><tr><th>#</th><th>content words</th><th>c1</th><th>c2</th><th>c3</th><th>best</th><th>verdict</th></tr></thead>
        <tbody>
          <tr><td>1</td><td>create, replacement, key, same, scopes, deploy, each, service (8)</td><td>7 shared, 0.875</td><td>2, 0.250</td><td>3, 0.375</td><td>c1</td><td>supported</td></tr>
          <tr><td>2</td><td>revoke, old, key, once, replacement, deployed, everywhere (7)</td><td>3, 0.429</td><td>6 shared, 0.857</td><td>3, 0.429</td><td>c2</td><td>supported</td></tr>
          <tr><td>3</td><td>restart, gateway, new, key, picked, up (6)</td><td>1, 0.167</td><td>1, 0.167</td><td>1, 0.167</td><td>c1</td><td>unsupported</td></tr>
          <tr><td>4</td><td>revocation, takes, effect, within, minute (5)</td><td>0, 0.000</td><td>5 shared, 1.000</td><td>0, 0.000</td><td>c2</td><td>supported</td></tr>
        </tbody>
      </table>
      <p>
        Sentence 1 misses only <code>each</code>, which c1 writes as <code>every</code>. Sentence 2 misses{' '}
        <code>once</code>, which c2 writes as <code>after</code>, a stopword. Sentence 3 shares exactly one word with
        each chunk, <code>key</code>: three ties at 0.167, so the first chunk, c1, is named best, and the sentence
        is flagged. Sentence 4 is a word-for-word match with the end of c2.
      </p>
      <p>
        <strong>Why these decisions.</strong> The score divides by the sentence&apos;s size rather than the union of
        both sets, because a chunk is several sentences long and a true sentence can only ever cover a small part of
        it; a Jaccard index would punish every sentence for the chunk&apos;s length. Stopwords are dropped because
        <code>the</code>, <code>a</code>, and <code>it</code> appear in every chunk and would lift every score alike.
        The citation is set aside because an id is not evidence; the practice variation is where it becomes a second
        check. The first chunk wins a tie so the rule is deterministic and auditable. The threshold of 0.6 is a
        plain choice: on reviewed answers it would be tuned to the point that catches invented steps without flagging
        paraphrase.
      </p>
      <p>
        <strong>The pattern, and its limits.</strong> Split, normalize to sets, score by overlap, keep the best,
        compare with a threshold. The same shape checks a summary against its source, a claim against a document, or
        a generated test against a specification. Its limits: a paraphrase (<code>remove</code> for{' '}
        <code>revoke</code>) scores zero; a sentence that contradicts its chunk while sharing its words (&quot;do not
        revoke&quot;) scores high; numbers and negation carry meaning that word sets ignore; the splitter breaks on
        abbreviations; and the stopword list is English only. It is a cheap first gate, not a judge.
      </p>
    </>
  ),

  visual: (
    <figure className="fig">
      <GroundingViz />
      <figcaption className="fig-cap">
        <span className="fig-caption-text">
          The functions from the file, run on their own three chunks and four sentences at a reading pace: about
          three and a half seconds per sentence, under half a minute in all. The chunks sit on the left and the
          answer sentences on the right. Each sentence in turn collects its content words in the panel at the
          bottom, grows a score bar against every chunk with the threshold marked, and draws a link to its best chunk,
          green when supported and red when not, while the shared words light up in both texts. The practice
          variation turns sentence 2&apos;s verdict amber, miscited, because its best chunk is not the one it cites.
          Step through with the buttons. Every score comes from the same functions run in the browser and is
          compared with the Python run.
        </span>
      </figcaption>
    </figure>
  ),

  tradeoffs: [
    {
      name: 'Citation presence (what shipped)',
      preferWhen: 'The model is constrained to quote from short chunks and a reviewer reads every answer anyway; the check is free and catches only missing brackets.',
      cost: 'A bracket proves nothing about the sentence. On this answer it passed 4 of 4, including the invented restart step, and would pass a sentence that cites the wrong chunk.',
    },
    {
      name: 'Lexical overlap per sentence (this lesson)',
      preferWhen: 'A cheap first gate on every answer: no model call, deterministic, explainable word by word, tunable with one threshold.',
      cost: 'Paraphrase scores zero and contradiction can score high; it needs a stopword list and a threshold tuned on reviewed answers, and it says nothing about meaning. It flags sentences for review; it cannot approve them.',
    },
    {
      name: 'An entailment model or an LLM judge per sentence',
      preferWhen: 'Paraphrase is common, the chunks are long, and a model call per sentence fits the latency and the budget: the judge reads the sentence and the chunk together and decides whether one supports the other.',
      cost: 'Latency and spend on every answer, nondeterminism, and a judge that itself has to be validated against human labels before its verdicts mean anything.',
    },
  ],
};
