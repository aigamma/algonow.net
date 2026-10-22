import CodeBlock from '../../src/components/CodeBlock.jsx';
import IngestDiffViz from './visuals/IngestDiffViz.jsx';
import solutionSource from './python/src/incremental_ingest/solution.py?raw';
import starterSource from './python/src/incremental_ingest/starter.py?raw';
import answerSource from './python/src/incremental_ingest/practice_answer.py?raw';
import lessonTests from './python/tests/test_lesson.py?raw';
import expectedOutput from './python/fixtures/expected-output.txt?raw';
import expectedPracticeOutput from './python/fixtures/expected-practice-output.txt?raw';
import documentsFixture from './python/fixtures/documents.json?raw';

// Authored by Claude Fable 5 in the main thread. Every number on this page was
// produced by running the files below; the expected outputs are the files'
// actual output, compared byte for byte by the tests.
const answerSnippet = answerSource.split('# --- answer begins ---\n')[1].split('# --- answer ends ---')[0].trim();

export const content = {
  brief: (
    <>
      <p>
        Orbit&apos;s knowledge base feeds a retrieval assistant, and every night a job re-embedded all of it: every
        document chunked, sent to the embedding model, and written back into the vector index. Most documents had
        not changed since the night before. The job took hours, the provider bill grew with the collection rather
        than with the edits, and a failed run in the middle left the index half old and half new.
      </p>
      <p>
        <strong>The action to practice:</strong> hash the content of every document in tonight&apos;s export,
        compare each hash with the manifest the previous run saved, and plan only the work that changed. The rules
        are small:
      </p>
      <ul>
        <li>The manifest is a dictionary from document id to the SHA-256 hash of the document&apos;s text; the previous run saved one, and tonight&apos;s run builds a new one.</li>
        <li>An id in both with the same hash is unchanged (skip); an id in both with a different hash is changed (re-embed); an id only in tonight&apos;s export is new (embed); an id only in the manifest is deleted (remove its vectors).</li>
        <li>The report is deterministic: documents in export order, then deletions in sorted order.</li>
        <li>A duplicate id in the export raises a <code>ValueError</code> naming it, because the manifest could keep only one of the two.</li>
      </ul>
      <p>
        <strong>Input.</strong> Five documents as the previous run saw them, and five in tonight&apos;s export,
        written inline as lists of dictionaries. In production the previous run saves only its manifest, a small
        JSON file of ids and hashes; the previous texts are in the file so it can compute that manifest honestly and
        run on its own. The export edited <code>d2</code>, dropped <code>d4</code>, and the billing page came back
        as <code>d6</code> after a move to another section:
      </p>
      <table>
        <thead><tr><th>id</th><th>previous text</th><th>tonight&apos;s text</th><th>decision</th></tr></thead>
        <tbody>
          <tr><td>d1</td><td>Rotate an API key: create the replacement, deploy it, then revoke the old key.</td><td>same</td><td>unchanged</td></tr>
          <tr><td>d2</td><td>List calls need the read scope.</td><td>List and get calls need the read scope.</td><td>changed</td></tr>
          <tr><td>d3</td><td>A lost key cannot be recovered. Create a replacement and revoke the lost one.</td><td>same</td><td>unchanged</td></tr>
          <tr><td>d4</td><td>Invoices are under Billing, one PDF per month.</td><td>absent</td><td>deleted</td></tr>
          <tr><td>d5</td><td>The write scope adds create and delete.</td><td>same</td><td>unchanged</td></tr>
          <tr><td>d6</td><td>absent</td><td>Invoices are under Billing, one PDF per month.</td><td>new</td></tr>
        </tbody>
      </table>
      <p>
        <strong>Expected output.</strong> <code>python solution.py</code> prints exactly this, with the first twelve
        characters of each sixty-four character hash. The file holds its own input, so nothing else is needed:
      </p>
      <pre className="expected-output"><code>{expectedOutput}</code></pre>
    </>
  ),

  starter: (
    <>
      <p>
        Change one behavior. Look at the last two rows of the worked output: <code>d6</code> is new and{' '}
        <code>d4</code> is deleted, yet their hashes are identical, because the billing page was moved and re-exported
        under a new id. The worked plan embeds it again and deletes its old vectors. Make <code>plan_ingest</code>{' '}
        recognize a move: a new id whose hash equals a deleted document&apos;s hash gets the decision{' '}
        <code>moved</code> with the old id under the key <code>from</code>, the old id is no longer deleted, and
        nothing is embedded for it. The file below is the worked solution with a <code>detect_moves</code> parameter
        that is accepted but not used yet, and a check for the new behavior. As shipped it prints{' '}
        <code>NOT OK</code> and stops.
      </p>
      <p>
        <strong>Hint.</strong> Compute the deleted ids before the main loop and build a dictionary from each deleted
        document&apos;s hash to its id. In the loop, a document that is not in the previous manifest is new only if
        its hash is not in that dictionary; otherwise append a moved row and <code>remove</code> the old id from the
        deleted list. The test for a new document moves to the end, because a document is only new once it is known
        neither by id nor by content.
      </p>
      <p>
        <strong>Expected result.</strong> Embed 1 (<code>d2</code>), move 1 (<code>d4 -&gt; d6</code>), delete 0,
        skip 3: four of the five embeddings saved, 80 percent. The file ends with <code>OK</code>.
      </p>
      <details>
        <summary>Show the answer</summary>
        <CodeBlock filename="Practice answer" code={answerSnippet} />
        <p>
          The deleted list is computed first so the move branch can take ids out of it, the dictionary turns a
          hash into the old id in one lookup, and the three tests run in order of confidence: known by id and
          unchanged, known by id and changed, known by content, otherwise new. Everything outside the marked region
          is the practice file unchanged.
        </p>
      </details>
    </>
  ),

  files: [
    { path: 'python/src/incremental_ingest/solution.py', role: 'reference', language: 'python', source: solutionSource, primary: true,
      description: 'The complete worked example: the previous and current documents, content_hash, build_manifest, plan_ingest, three small helpers, and a demonstration that prints the decision table, the plan, the saving, the rejected duplicate, and OK. Runs alone with Python 3.11 or newer.' },
    { path: 'python/src/incremental_ingest/starter.py', role: 'starter', language: 'python', source: starterSource, primary: true,
      description: 'The practice file: the worked solution with a detect_moves parameter that is not used yet, and a check for the new behavior. Prints NOT OK until plan_ingest reports d6 as moved from d4.' },
    { path: 'python/src/incremental_ingest/practice_answer.py', role: 'reference', language: 'python', source: answerSource,
      description: 'The completed practice variation; the page shows the region between its answer markers.' },
    { path: 'python/fixtures/expected-output.txt', role: 'fixture', language: 'text', source: expectedOutput,
      description: 'What solution.py prints, byte for byte. The test runs the file alone and compares.' },
    { path: 'python/fixtures/expected-practice-output.txt', role: 'fixture', language: 'text', source: expectedPracticeOutput,
      description: 'What practice_answer.py prints, byte for byte.' },
    { path: 'python/tests/test_lesson.py', role: 'test', language: 'python', source: lessonTests,
      description: 'Runs the three lesson files alone, checks the hash against the published test vector, the plan at its edges (empty manifest, identical runs, duplicate ids, a near-copy that is not a move), pins the animation fixtures to the real functions, and measures the full nightly re-ingest against the plan on the same documents.' },
    { path: 'python/fixtures/documents.json', role: 'fixture', language: 'json', source: documentsFixture,
      description: 'The previous and current documents with the real SHA-256 of each text, exactly as the lesson files define them; the animation runs on this copy (the browser model does not hash) and a test pins every hash to content_hash. The trace fixture it replays ships in the project download.' },
  ],

  evidence: (
    <>
      <p>
        <strong>What the file checks</strong> before it prints <code>OK</code>: three unchanged documents, exactly{' '}
        <code>d2</code> and <code>d6</code> to embed, exactly <code>d4</code> to delete, and a new manifest with one
        entry per exported document. Run your copy and compare its output with the expected output above; they must
        match line for line. The hashes are real SHA-256 digests, so they match on any machine.
      </p>
      <p>
        <strong>The failure case.</strong> The demonstration plans an export that lists <code>d1</code> twice, and{' '}
        <code>build_manifest</code> raises <code>ValueError</code> naming the id, printed as the rejected line. The tests
        in the project download also check the published test vector for the hash of <code>abc</code>, that one
        missing period produces an unrelated hash, that an empty previous manifest makes every document new, that
        two identical runs plan nothing, and that the input dictionary and list are never modified.
      </p>
      <p>
        <strong>What shipped, on the same documents.</strong> The nightly job embedded all five documents, every
        night. The plan embeds two and deletes one, 60 percent of the embedding work saved, and it never skips a
        changed document: for every <code>changed</code> row the two hashes differ, and for every{' '}
        <code>unchanged</code> row they are equal. A second test applies the plan to the previous manifest, deleting
        the deleted id and writing the changed and new hashes, and gets exactly the new manifest: skip, embed, and
        delete together turn the old state into the new one with nothing left over.
      </p>
    </>
  ),

  solution: (
    <>
      <p>
        Read the file top to bottom: the input, a hash function, a function that builds the manifest, the one
        function that plans, three small helpers for the report, and a demonstration. Here is its Python, construct
        by construct.
      </p>
      <ol>
        <li>
          <strong>A hash from text.</strong> <code>import hashlib</code> brings in the standard hashing module.{' '}
          <code>text.encode(&quot;utf-8&quot;)</code> turns the string into bytes, because a hash works on bytes;{' '}
          <code>hashlib.sha256(...)</code> makes a hash object from them, and <code>.hexdigest()</code> returns the
          digest as sixty-four hex characters. The same bytes always give the same digest, and a single changed
          character gives an unrelated one, which is the whole trick.
        </li>
        <li>
          <strong>Building the manifest.</strong> <code>manifest = {'{}'}</code> starts an empty dictionary.{' '}
          <code>if doc[&quot;id&quot;] in manifest:</code> asks whether a key is already present, a constant-time
          test, and raises before a second copy could overwrite the first. The assignment{' '}
          <code>manifest[doc[&quot;id&quot;]] = content_hash(doc[&quot;text&quot;])</code> creates the key; a
          dictionary keeps the order keys were added, so the manifest follows the export.
        </li>
        <li>
          <strong>Two results from one call.</strong> <code>return rows, manifest</code> hands back a tuple, and the
          caller takes it apart with <code>rows, manifest = plan_ingest(previous, CURRENT_DOCS)</code>. Returning the
          manifest beside the rows means the new manifest is simply tonight&apos;s hashes, ready to save.
        </li>
        <li>
          <strong>The three-way decision.</strong> <code>for doc_id in manifest:</code> walks the keys in order, and{' '}
          <code>current = manifest[doc_id]</code> gives the hash a short name. Then an <code>if</code>,{' '}
          <code>elif</code>, <code>else</code> chain: not in <code>previous</code> means new;{' '}
          <code>previous[doc_id] == current</code> means unchanged; otherwise changed. Each branch appends one
          dictionary with the id, the decision, and both hashes, with <code>None</code> standing in for a hash that
          does not exist.
        </li>
        <li>
          <strong>Set difference for the deletions.</strong> <code>set(previous)</code> is the set of the previous
          manifest&apos;s keys and <code>set(manifest)</code> the set of tonight&apos;s; the minus sign between two
          sets keeps the members of the first that are not in the second, so the result is every id that
          disappeared. A set has no order, so <code>sorted(...)</code> fixes one before the loop appends the deleted
          rows.
        </li>
        <li>
          <strong>Filtering with a loop.</strong> <code>ids_with(rows, &quot;changed&quot;)</code> walks the rows and
          collects the ids whose decision matches, and the demonstration calls it three times. The plus sign between
          two lists joins them, so <code>embed</code> is the changed ids followed by the new ones.
        </li>
        <li>
          <strong>Printing helpers.</strong> <code>hash_value[:12]</code> slices the first twelve characters;{' '}
          <code>is None</code> is the test for the missing hash; <code>&quot;, &quot;.join(ids)</code> prints a list
          as one line, and <code>ids == []</code> catches the empty list so the report says <code>none</code> instead
          of printing nothing.
        </li>
        <li>
          <strong>The demonstration.</strong> The format spec <code>{'{row[\'id\']:<3}'}</code> left-aligns in three
          columns so the table lines up; <code>//</code> is floor division, which turns three of five into the
          integer 60 percent. <code>CURRENT_DOCS + [...]</code> builds the rejected input as a new list, leaving the
          original untouched, and <code>try</code> with <code>except ValueError as error</code> shows the rejection
          without crashing. Each <code>assert</code> checks one claim before <code>OK</code>.
        </li>
      </ol>
      <p><strong>Trace the variables.</strong> Follow the comparison for each id, and the plan as it grows:</p>
      <table>
        <thead><tr><th>id</th><th>in previous?</th><th>hashes</th><th>decision</th><th>embed</th><th>delete</th><th>skip</th></tr></thead>
        <tbody>
          <tr><td>d1</td><td>yes</td><td>37182e256ecf both</td><td>unchanged</td><td>0</td><td>0</td><td>1</td></tr>
          <tr><td>d2</td><td>yes</td><td>f3a147442ac1 vs 462cbf1e668d</td><td>changed</td><td>1</td><td>0</td><td>1</td></tr>
          <tr><td>d3</td><td>yes</td><td>c4c7dda9220b both</td><td>unchanged</td><td>1</td><td>0</td><td>2</td></tr>
          <tr><td>d5</td><td>yes</td><td>6889e5405065 both</td><td>unchanged</td><td>1</td><td>0</td><td>3</td></tr>
          <tr><td>d6</td><td>no</td><td>none vs ec50810efe42</td><td>new</td><td>2</td><td>0</td><td>3</td></tr>
          <tr><td>d4</td><td>only there</td><td>ec50810efe42 vs none</td><td>deleted</td><td>2</td><td>1</td><td>3</td></tr>
        </tbody>
      </table>
      <p>
        The loop over the manifest handles the first five rows in export order; the deleted row comes from the set
        difference afterwards, which is why <code>d4</code> is printed last. Notice that <code>d6</code>&apos;s hash is{' '}
        <code>d4</code>&apos;s hash: the plan compares by id, so it cannot see the move. That is the practice variation.
      </p>
      <p>
        <strong>Why these decisions.</strong> Content is hashed rather than trusting a modified-time stamp because
        a timestamp changes when a file is touched, copied, or re-exported with nothing different, and clocks skew
        between systems; the hash answers the only question that matters, whether the bytes the model would embed
        are the bytes it already embedded. The manifest stores ids and hashes, not texts, so it stays small and
        can be saved with the index. The report is ordered by export and then sorted, so two runs over the same
        data print the same lines and a reviewer can diff them. A duplicate id is rejected rather than resolved,
        because either choice would silently drop a document from the index.
      </p>
      <p>
        <strong>The pattern, and its limits.</strong> Hash the content, compare with a saved manifest, act on the
        difference. The same shape drives build systems that rebuild only changed targets, sync tools, cache
        invalidation, and data versioning. Its limits: a change in whitespace is a change, so normalize the text
        first if that matters; the unit is the whole document, and a one-line edit re-embeds every chunk of it,
        which is what chunk-level hashing refines; the manifest must be saved only after the embeddings are written,
        so that a crash in between re-embeds next time rather than skipping; and a document that moves to a new id
        looks like a deletion plus a new document until the plan compares by content as well, which the practice
        adds.
      </p>
    </>
  ),

  visual: (
    <figure className="fig">
      <IngestDiffViz />
      <figcaption className="fig-cap">
        <span className="fig-caption-text">
          The plan from the file, run on its own five documents at a reading pace: just under three seconds per
          document, about half a minute in all. The previous manifest sits on the left with each document&apos;s hash,
          tonight&apos;s export on the right. Each document is hashed, its hash glides to the manifest row with the
          same id, and the decision appears: green for unchanged, blue for changed, amber for new, red for the
          manifest entry that has no document tonight. Then the plan panel totals the work and the saving, and the
          practice variation links the two equal hashes and turns the deletion plus the new document into one move.
          Step through with the buttons. The figure rests for two minutes before it plays again, and the motion
          setting in the site header can slow or stop it. Every hash and decision comes from the same comparison run
          in the browser on the recorded digests and is checked against the Python run.
        </span>
      </figcaption>
    </figure>
  ),

  tradeoffs: [
    {
      name: 'Re-embed everything every night (what shipped)',
      preferWhen: 'A collection small enough that the whole job finishes in minutes and costs cents, or a first run with no manifest to compare against; it needs no saved state and no comparison code.',
      cost: 'Work and spend grow with the size of the collection instead of the size of the change: on these five documents it embeds five where two would do. A failure halfway leaves a mixed index, and nothing records which documents the vectors actually came from.',
    },
    {
      name: 'Document-level content hashes against a saved manifest (this lesson)',
      preferWhen: 'Documents are re-exported whole and most of them are stable between runs; the manifest is about 80 bytes per document (under 100 KB per thousand) and the comparison is one dictionary lookup each. Prefer it over modified-time stamps, which change on a touch or a copy and drift between clocks.',
      cost: 'Saved state to keep in step with the index: the manifest must be written after the vectors are, or a crash can skip work. A one-character edit re-embeds the whole document, whitespace counts as a change unless the text is normalized first, and a moved document reads as a deletion plus a new document until moves are detected.',
    },
    {
      name: 'Chunk-level hashing',
      preferWhen: 'Long documents with frequent small edits, where re-embedding every chunk of a document for one changed paragraph is the dominant cost and chunk boundaries are stable from run to run.',
      cost: 'A manifest entry per chunk instead of per document, a chunker whose boundaries must not shift when text is inserted (or every chunk after the edit changes anyway), and deletions tracked at two levels. It refines this lesson rather than replacing it.',
    },
  ],
};
