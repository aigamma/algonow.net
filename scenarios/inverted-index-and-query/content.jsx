import CodeBlock from '../../src/components/CodeBlock.jsx';
import InvertedIndexViz from './visuals/InvertedIndexViz.jsx';
import solutionSource from './python/src/inverted_index/solution.py?raw';
import starterSource from './python/src/inverted_index/starter.py?raw';
import answerSource from './python/src/inverted_index/practice_answer.py?raw';
import lessonTests from './python/tests/test_lesson.py?raw';
import expectedOutput from './python/fixtures/expected-output.txt?raw';
import expectedPracticeOutput from './python/fixtures/expected-practice-output.txt?raw';
import docsFixture from './python/fixtures/docs.json?raw';

// Authored by Claude Fable 5 (a fork of the main thread). Every number on this
// page was produced by running the files below; the expected outputs are the
// files' actual output, compared byte for byte by the tests.
const answerSnippet = answerSource.split('# --- answer begins ---\n')[1].split('# --- answer ends ---')[0].trim();

export const content = {
  brief: (
    <>
      <p>
        Orbit&apos;s keyword retriever scanned every runbook for every question. Each query cost a pass over the
        whole collection, the cost grew with every document added, and the retriever got slower every week. An
        inverted index turns that around: instead of asking each document whether it contains the query terms, it
        maps each term, once, to the documents that contain it, so a query reads only the posting lists of its own
        terms and intersects them.
      </p>
      <p>
        <strong>The action to practice:</strong> build the index once as a dictionary of lists, then answer each
        AND query from the posting lists. The rules are small:
      </p>
      <ul>
        <li>A token is a lowercase word: letters and digits only, split on whitespace, so punctuation and capitals disappear.</li>
        <li>The index maps each term to the ids of the documents that contain it, in input order. A term repeated inside one document is listed once.</li>
        <li>An AND query is the intersection of its terms&apos; posting lists, returned sorted. A term the index has never seen contributes an empty list, so the result is empty.</li>
        <li>A query with no terms raises a <code>ValueError</code>: an empty intersection would silently mean everything or nothing.</li>
        <li>Each query reports how many posting entries it read; the worked example counts that work against a full scan.</li>
      </ul>
      <p>
        <strong>Input.</strong> Five documents, inline as a list of dictionaries, and three queries. The distinct
        terms decide everything:
      </p>
      <table>
        <thead><tr><th>id</th><th>text</th><th>tokens</th><th>distinct</th><th>new terms</th></tr></thead>
        <tbody>
          <tr><td>d1</td><td>Rotate the API key, then revoke the old key.</td><td>9</td><td>7</td><td>7</td></tr>
          <tr><td>d2</td><td>List calls need the read scope.</td><td>6</td><td>6</td><td>5</td></tr>
          <tr><td>d3</td><td>A lost key cannot be recovered; create a new key.</td><td>10</td><td>8</td><td>7</td></tr>
          <tr><td>d4</td><td>The write scope adds create and delete.</td><td>7</td><td>7</td><td>4</td></tr>
          <tr><td>d5</td><td>Invoices are under Billing, one PDF per month.</td><td>8</td><td>8</td><td>8</td></tr>
        </tbody>
      </table>
      <p>
        The queries are <code>key AND revoke</code>, <code>scope AND create</code>, and <code>key AND scope</code>.
      </p>
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
        Change one behavior. The worked solution answers AND queries, where a document must contain every term.
        Write <code>or_query</code> instead: a document that contains any of the terms is a match, and the matches
        are ranked by how many of the query terms each one contains, most first, with ties broken by id. The file
        below is the worked solution with <code>or_query</code> stubbed to return the AND result, and a check for
        the new behavior. As shipped it prints <code>NOT OK</code> and stops.
      </p>
      <p>
        <strong>Hint.</strong> Walk the posting list of each query term and count, per document id, how many terms
        listed it, in a dictionary from id to count; <code>counts.get(doc_id, 0) + 1</code> makes the first count as
        easy as the rest. Then turn the dictionary into a list of <code>(id, count)</code> pairs and sort it with a
        key function that returns <code>(-count, id)</code>, so higher counts come first and ties fall in id order.
      </p>
      <p>
        <strong>Expected result.</strong> For <code>key OR scope OR create</code>, four documents: d3 and d4 contain
        two of the three terms, d1 and d2 contain one each, so the ranking is d3, d4, d1, d2. The AND query for the
        same three terms finds nothing. The file ends with <code>OK</code>.
      </p>
      <details>
        <summary>Show the answer</summary>
        <CodeBlock filename="Practice answer" code={answerSnippet} />
        <p>
          One small helper for the sort key and one counting loop. The same empty-query guard applies, a one-term
          OR query lists that term&apos;s documents with a count of 1, and an unknown term matches nothing.
          Everything outside the marked region is the practice file unchanged.
        </p>
      </details>
    </>
  ),

  files: [
    { path: 'python/src/inverted_index/solution.py', role: 'reference', language: 'python', source: solutionSource, primary: true,
      description: 'The complete worked example: the five documents, the three queries, tokenize, build_index, and_query, postings_read, and a demonstration that prints the shared terms, each query with its answer and work, the rejected query, and OK. Runs alone with Python 3.11 or newer.' },
    { path: 'python/src/inverted_index/starter.py', role: 'starter', language: 'python', source: starterSource, primary: true,
      description: 'The practice file: the worked solution with or_query stubbed to return the AND result, and a check for the new behavior. Prints NOT OK until or_query ranks documents by how many query terms they contain.' },
    { path: 'python/src/inverted_index/practice_answer.py', role: 'reference', language: 'python', source: answerSource,
      description: 'The completed practice variation; the page shows the region between its answer markers.' },
    { path: 'python/fixtures/expected-output.txt', role: 'fixture', language: 'text', source: expectedOutput,
      description: 'What solution.py prints, byte for byte. The test runs the file alone and compares.' },
    { path: 'python/fixtures/expected-practice-output.txt', role: 'fixture', language: 'text', source: expectedPracticeOutput,
      description: 'What practice_answer.py prints, byte for byte.' },
    { path: 'python/tests/test_lesson.py', role: 'test', language: 'python', source: lessonTests,
      description: 'Runs the three lesson files alone, checks the tokenizer, the postings, and the queries at their edges, the rejected empty query, the practice ranking, pins the animation fixtures to the solution, and measures the linear scan that shipped against the index on the same documents.' },
    { path: 'python/fixtures/docs.json', role: 'fixture', language: 'json', source: docsFixture,
      description: 'The five documents, the three queries, and the practice query exactly as the lesson files define them; the animation runs on this copy and a test pins it to the files. The trace fixture it replays ships in the project download.' },
  ],

  evidence: (
    <>
      <p>
        <strong>What the file checks</strong> before it prints <code>OK</code>: <code>key AND revoke</code> finds
        exactly d1, <code>key AND scope</code> finds nothing, and the posting list for <code>key</code> is d1 and d3,
        which proves a term repeated inside one document is listed once. Run your copy and compare its output with
        the expected output above; they must match line for line.
      </p>
      <p>
        <strong>The failure case.</strong> A query with no terms raises <code>ValueError</code>, and the demonstration
        prints the rejected line instead of returning a misleading answer. The tests in the project download also
        feed <code>tokenize</code> punctuation, capitals, tabs, and a digit that survives; ask for a one-term query
        (its own posting list), a term the index has never seen (nothing, zero entries read), the same query with
        its terms in the other order, and a term repeated in the query.
      </p>
      <p>
        <strong>What shipped, on the same documents.</strong> A linear scan that reads every document and keeps the
        ones containing every term gives exactly the same answers as the index on eight queries (the three from the
        lesson and five more), so the index changes the work and not the result. The three lesson queries read 11
        posting entries through the index, where the scan reads 15 documents, and no single query reads more entries
        than there are documents. Both measurements are tests in the project download.
      </p>
    </>
  ),

  solution: (
    <>
      <p>
        Read the file top to bottom: the input, a tokenizer, the function that builds the index, the function that
        answers a query, a small function that counts the work, and a demonstration. Here is its Python, construct by
        construct.
      </p>
      <ol>
        <li>
          <strong>The tokenizer.</strong> <code>text.lower()</code> returns a new lowercase string; strings are never
          changed in place. <code>for char in lowered:</code> walks it one character at a time, and{' '}
          <code>char.isalnum() or char.isspace()</code> keeps a letter, a digit, or a whitespace character by
          appending it with <code>kept_chars = kept_chars + char</code>; punctuation is simply never appended.{' '}
          <code>kept_chars.split()</code> with no argument splits on any run of whitespace, drops the empty pieces, and
          returns the list of tokens.
        </li>
        <li>
          <strong>Collapsing repeats.</strong> <code>set(tokenize(...))</code> keeps each distinct term once, and{' '}
          <code>sorted(...)</code> walks those terms in alphabetical order. A set has no order of its own and can
          iterate differently from run to run, so sorting first makes the index build the same way every time.
        </li>
        <li>
          <strong>The membership-insert idiom.</strong> <code>index = {'{}'}</code> starts empty. For each distinct
          term, <code>if term not in index:</code> asks whether the term is already a key (on a dictionary,{' '}
          <code>in</code> tests the keys) and <code>index[term] = []</code> stores an empty list when it is not. Then,
          whether the key was new or not, <code>index[term].append(doc[&quot;id&quot;])</code> adds the document&apos;s id.
          Two lines, and a dictionary of lists grows one posting at a time; because documents are visited in input
          order, every posting list is in input order too.
        </li>
        <li>
          <strong>A lookup with a default.</strong> <code>index.get(term, [])</code> returns the posting list, or the
          empty list for a term the index has never seen, instead of stopping the program with a <code>KeyError</code>.
        </li>
        <li>
          <strong>Sets and intersection.</strong> <code>set(index.get(terms[0], []))</code> turns the first term&apos;s
          list into a set; <code>terms[0]</code> is the first element and <code>terms[1:]</code> is a slice from the
          second element to the end, which the loop walks. <code>result = result &amp; set(...)</code> builds the
          intersection and assigns it back to the same name, so <code>result</code> now refers to a new, smaller set.
        </li>
        <li>
          <strong>A stable answer and a guard.</strong> <code>sorted(result)</code> turns the unordered set into a sorted
          list. Before any of it, <code>if len(terms) == 0: raise ValueError(...)</code> stops the function with a
          message that names the problem.
        </li>
        <li>
          <strong>The work counter.</strong> <code>postings_read</code> adds the lengths of the posting lists a query
          touches, with the same <code>get</code> default, so an unseen term adds zero. It exists so the lesson can
          measure the index against the scan.
        </li>
        <li>
          <strong>The demonstration.</strong> <code>for term in sorted(index):</code> iterates the keys in alphabetical
          order, and <code>len(index[term]) &gt;= 2</code> picks the shared terms. <code>&quot;, &quot;.join(ids)</code>{' '}
          glues a list of ids into one line, <code>{'{term:<8}'}</code> left-aligns each term in eight columns, and{' '}
          <code>&quot; AND &quot;.join(terms)</code> builds the query label. An <code>if</code> and <code>else</code>{' '}
          choose the text to show for an empty result, <code>try</code> and <code>except ValueError as error</code>{' '}
          catch the rejected query, and each <code>assert</code> checks one claim before <code>OK</code>.
        </li>
      </ol>
      <p><strong>Trace the variables.</strong> Follow the index through the five documents:</p>
      <table>
        <thead><tr><th>document</th><th>tokens</th><th>distinct</th><th>already indexed</th><th>new terms</th><th>index size</th></tr></thead>
        <tbody>
          <tr><td>d1</td><td>9</td><td>7 (the, key repeat)</td><td>none</td><td>7</td><td>7</td></tr>
          <tr><td>d2</td><td>6</td><td>6</td><td>the</td><td>5</td><td>12</td></tr>
          <tr><td>d3</td><td>10</td><td>8 (a, key repeat)</td><td>key</td><td>7</td><td>19</td></tr>
          <tr><td>d4</td><td>7</td><td>7</td><td>the, scope, create</td><td>4</td><td>23</td></tr>
          <tr><td>d5</td><td>8</td><td>8</td><td>none</td><td>8</td><td>31</td></tr>
        </tbody>
      </table>
      <p>Then the queries, each an intersection of posting lists:</p>
      <table>
        <thead><tr><th>query</th><th>posting lists</th><th>intersection</th><th>entries read</th></tr></thead>
        <tbody>
          <tr><td>key AND revoke</td><td>{'{d1, d3} & {d1}'}</td><td>d1</td><td>3</td></tr>
          <tr><td>scope AND create</td><td>{'{d2, d4} & {d3, d4}'}</td><td>d4</td><td>4</td></tr>
          <tr><td>key AND scope</td><td>{'{d1, d3} & {d2, d4}'}</td><td>none</td><td>4</td></tr>
        </tbody>
      </table>
      <p>
        <strong>Why these decisions.</strong> The index is built once and queried many times, so the work moves from
        query time to build time, which is the whole point. It is a dictionary because a key lookup takes the same
        time whether the index holds 31 terms or 31 million. The posting lists are lists rather than sets because
        they keep the input order, which makes the output reproducible and reviewable; the query converts them to
        sets only when it needs an intersection. The distinct terms are sorted before insertion so two runs build
        identical dictionaries. And the empty query is rejected rather than guessed at: starting an intersection
        from nothing could mean every document or none, and either guess is wrong for someone.
      </p>
      <p>
        <strong>The pattern, and its limits.</strong> A dictionary of lists keyed by a normalized term is the inverted
        index inside every search engine, every log system, and every keyword stage of a retrieval pipeline. Its
        limits: there is no ranking, so every match counts the same (the practice variation starts to fix that);
        matching is exact after normalization, so <code>keys</code> and <code>key</code> are different terms, and{' '}
        <code>the</code> is indexed like any other word and ties three documents together, which is why a stopword
        list is the usual next step; the whole index lives in memory and is rebuilt from scratch, and removing a
        document means walking every list; and AND is strict, so one missing term empties the result.
      </p>
    </>
  ),

  visual: (
    <figure className="fig">
      <InvertedIndexViz />
      <figcaption className="fig-cap">
        <span className="fig-caption-text">
          The functions from the file, run on their own five documents at a reading pace: about three seconds per
          document and per query, about half a minute in all. Each document&apos;s distinct terms glide from its
          card into the index grid on the right, landing as a new chip or joining an existing chip&apos;s list, with
          repeated terms collapsed on the way. Then each query lights its terms, lists their postings in the panel
          below the cards, and shows the intersection, while the status strip counts posting entries read against
          the documents a scan would read. The practice variation ranks the OR query at the end. Step through with
          the buttons. The figure rests for two minutes before it plays again, and the motion setting in the site
          header can slow or stop it. Every chip, posting, and count comes from the same functions run in the browser
          and is compared with the Python run.
        </span>
      </figcaption>
    </figure>
  ),

  tradeoffs: [
    {
      name: 'Linear scan over every document (what shipped)',
      preferWhen: 'A small collection, under a thousand short documents, and rare queries: nothing to build, nothing to keep in sync, and the code is a loop and a membership test.',
      cost: 'Every query reads every document, 15 reads for the three queries here, and the time grows with the collection, so it is the version that gets slower every week.',
    },
    {
      name: 'Inverted index with AND queries (this lesson)',
      preferWhen: 'The same collection is queried many times and exact term matching is what you want: the build runs once and each query reads only the posting lists of its own terms, 11 entries here.',
      cost: 'No ranking, so every match counts the same; the index must be rebuilt or patched when documents change; and exact terms mean an inflected or misspelled word, or a stopword such as "the", behaves badly without a normalization step.',
    },
    {
      name: 'A ranked index (BM25 weights) or a vector index',
      preferWhen: 'Queries return many matches and the order matters (term frequency and document length separate a passing mention from a document about the term), or users ask in their own words and the matching terms are not in the document at all.',
      cost: 'A scoring formula to tune, or an embedding call for every document and query plus an approximate nearest neighbour structure; in both cases results that are harder to explain than a posting list.',
    },
  ],
};
