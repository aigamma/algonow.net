import CodeBlock from '../../src/components/CodeBlock.jsx';
import AnswerScoreViz from './visuals/AnswerScoreViz.jsx';
import solutionSource from './python/src/answer_scoring/solution.py?raw';
import starterSource from './python/src/answer_scoring/starter.py?raw';
import answerSource from './python/src/answer_scoring/practice_answer.py?raw';
import lessonTests from './python/tests/test_lesson.py?raw';
import expectedOutput from './python/fixtures/expected-output.txt?raw';
import expectedPracticeOutput from './python/fixtures/expected-practice-output.txt?raw';
import answersFixture from './python/fixtures/answers.json?raw';

// Authored by Claude Fable 5 in the main thread. Every number on this page was
// produced by running the files below; the expected outputs are the files'
// actual output, compared byte for byte by the tests.
const answerSnippet = answerSource.split('# --- answer begins ---\n')[1].split('# --- answer ends ---')[0].trim();

export const content = {
  brief: (
    <>
      <p>
        Orbit&apos;s question answering evaluation compared the model&apos;s answer with the gold answer as strings.
        &quot;The read scope.&quot; against &quot;read scope&quot; counted as wrong, so the accuracy number punished
        capitals, punctuation, and articles instead of mistakes, and an answer that got most of the way there earned
        exactly nothing. The two metrics the SQuAD benchmark settled on fix both problems.
      </p>
      <p>
        <strong>The action to practice:</strong> normalize both answers, then score them twice. The rules are small:
      </p>
      <ul>
        <li>Normalization lowercases the text, keeps only letters, digits, and spaces, splits on whitespace, and drops the articles <code>a</code>, <code>an</code>, and <code>the</code>. The result is a list of tokens.</li>
        <li><strong>Exact match</strong> is 1 when the two token lists are identical, in the same order, else 0.</li>
        <li><strong>Token F1</strong> gives partial credit: the overlap is how many tokens the two lists share, counting a repeated token only as often as both sides have it; precision is the overlap over the predicted tokens, recall is the overlap over the gold tokens, and F1 is their harmonic mean.</li>
        <li>Two empty answers score 1.0, one empty answer scores 0.0, and no overlap scores 0.0 without dividing by zero. A gold answer that normalizes to nothing is a data bug and raises a <code>ValueError</code> naming the pair.</li>
      </ul>
      <p>
        <strong>Input.</strong> Five answer pairs, inline as a list of dictionaries. The tokens after normalization
        decide everything:
      </p>
      <table>
        <thead><tr><th>id</th><th>model answer</th><th>gold answer</th><th>tokens shared</th></tr></thead>
        <tbody>
          <tr><td>e1</td><td>The read scope.</td><td>read scope</td><td>2 of 2 and 2</td></tr>
          <tr><td>e2</td><td>rotate the key, then revoke the old one</td><td>Create a replacement key, deploy it, then revoke the old one</td><td>5 of 6 and 9</td></tr>
          <tr><td>e3</td><td>seven days</td><td>7 days</td><td>1 of 2 and 2</td></tr>
          <tr><td>e4</td><td>Billing, then Invoices</td><td>billing then invoices</td><td>3 of 3 and 3</td></tr>
          <tr><td>e5</td><td>no</td><td>yes</td><td>0 of 1 and 1</td></tr>
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
        Change one behavior. The worked solution scores each prediction against a single gold answer. In the
        practice file every pair carries a <em>list</em> of acceptable gold answers, and <code>score_pair</code> must
        score the prediction against each of them and keep the best exact match and the best F1. The file below is
        the worked solution with the lists in place and a <code>score_pair</code> that still looks only at the first
        gold answer, plus a check for the new behavior. As shipped it prints <code>NOT OK</code> and stops.
      </p>
      <p>
        <strong>Hint.</strong> Loop over the gold answers. Keep a best exact match and a best F1 that start at zero
        and raise them with <code>max</code>, or with a comparison, as better scores appear. Report the overlap,
        precision, and recall of the gold answer that produced the best F1, so the row stays consistent.
      </p>
      <p>
        <strong>Expected result.</strong> e3 now matches its second gold answer, &quot;seven days&quot;: exact match 1,
        F1 1.000. e2&apos;s second gold answer scores only 0.500, so its 0.667 stands. The means rise to exact match
        0.600 and F1 0.733, and the file ends with <code>OK</code>.
      </p>
      <details>
        <summary>Show the answer</summary>
        <CodeBlock filename="Practice answer" code={answerSnippet} />
        <p>
          Five variables that start at zero, one loop, and two ways of keeping a maximum: <code>max</code> for the
          exact match, and a comparison that replaces four values at once when a better F1 appears, so the overlap,
          precision, and recall always belong to the same gold answer as the F1. Everything outside the marked
          region is the practice file unchanged.
        </p>
      </details>
    </>
  ),

  files: [
    { path: 'python/src/answer_scoring/solution.py', role: 'reference', language: 'python', source: solutionSource, primary: true,
      description: 'The complete worked example: the five pairs, normalize, exact_match, token_f1, score_all, and a demonstration that prints the table, the means, the rejected pair, and OK. Runs alone with Python 3.11 or newer.' },
    { path: 'python/src/answer_scoring/starter.py', role: 'starter', language: 'python', source: starterSource, primary: true,
      description: 'The practice file: the worked solution with a list of acceptable gold answers per pair and a score_pair that still scores only the first one. Prints NOT OK until the best of the gold answers is kept.' },
    { path: 'python/src/answer_scoring/practice_answer.py', role: 'reference', language: 'python', source: answerSource,
      description: 'The completed practice variation; the page shows the region between its answer markers.' },
    { path: 'python/fixtures/expected-output.txt', role: 'fixture', language: 'text', source: expectedOutput,
      description: 'What solution.py prints, byte for byte. The test runs the file alone and compares.' },
    { path: 'python/fixtures/expected-practice-output.txt', role: 'fixture', language: 'text', source: expectedPracticeOutput,
      description: 'What practice_answer.py prints, byte for byte.' },
    { path: 'python/tests/test_lesson.py', role: 'test', language: 'python', source: lessonTests,
      description: 'Runs the three lesson files alone, checks the normalizer and both metrics at their edges, the rejected pair, the practice maximum, and pins the animation fixtures to the solution; measures the string equality that shipped against the normalized metrics on the same pairs.' },
    { path: 'python/fixtures/answers.json', role: 'fixture', language: 'json', source: answersFixture,
      description: 'The five pairs, the article list, and the practice gold answers exactly as the lesson files define them; the animation runs on this copy and a test pins it to the files. The trace fixture it replays ships in the project download.' },
  ],

  evidence: (
    <>
      <p>
        <strong>What the file checks</strong> before it prints <code>OK</code>: two of the five pairs match exactly,
        e2&apos;s F1 rounds to 0.667, and the mean F1 rounds to 0.633. Run your copy and compare its output with the
        expected output above; they must match line for line.
      </p>
      <p>
        <strong>The failure case.</strong> The demonstration scores a pair whose gold answer is <code>&quot;...&quot;</code>,
        which normalizes to no tokens at all, so <code>score_all</code> raises <code>ValueError</code> naming the pair
        and the demonstration prints the rejected line. The tests in the project download also call{' '}
        <code>token_f1</code> directly with two empty answers (1.0), one empty answer (0.0), and two answers that
        share nothing (0.0), and feed <code>normalize</code> tabs, repeated spaces, an article in the middle of a
        sentence, and a digit, which survives.
      </p>
      <p>
        <strong>What shipped, on the same pairs.</strong> As strings, zero of the five pairs are equal, so string
        equality reported zero exact matches. After normalization e1 and e4 are exact matches, which is 0.400, and
        token F1 adds partial credit for e2 and e3, which lifts the mean to 0.633: the gap of 0.233 between the two
        means is the credit the old scorer threw away. Both measurements are tests in the project download.
      </p>
    </>
  ),

  solution: (
    <>
      <p>
        Read the file top to bottom: one import, the input, a normalizer, the two metrics, a function that scores
        every pair, and a demonstration. Here is its Python, construct by construct.
      </p>
      <ol>
        <li>
          <strong>Importing one name.</strong> <code>from collections import Counter</code> brings a single class out of
          the standard library&apos;s collections module so the file can write <code>Counter(...)</code> without a
          prefix. A Counter is a dictionary from a value to how many times it appeared.
        </li>
        <li>
          <strong>Normalize, in three steps.</strong> <code>text.lower()</code> returns a lowercased copy; strings are
          never changed in place. The character loop keeps a character when <code>char.isalnum()</code> (a letter or
          a digit) or <code>char.isspace()</code> is true, so punctuation is simply never appended.{' '}
          <code>kept_chars.split()</code> with no argument splits on any run of whitespace and drops the empty
          pieces. A second loop appends each word that is <code>not in ARTICLES</code>, a tuple of three strings, and
          the function returns the list of tokens rather than a joined string, because the metrics need the tokens
          one at a time.
        </li>
        <li>
          <strong>Exact match.</strong> <code>normalize(prediction) == normalize(gold)</code> compares two lists
          element by element: same length, same tokens, same order. The function returns the integers 1 and 0
          rather than True and False so the results add up into a count.
        </li>
        <li>
          <strong>Guard clauses.</strong> <code>token_f1</code> handles the edges first and returns early. An empty
          list is false in Python, so <code>not predicted and not expected</code> means both answers are empty, and{' '}
          <code>not predicted or not expected</code> means exactly one is. Each early return hands back four values,
          so every caller can unpack the same shape.
        </li>
        <li>
          <strong>The overlap, with a Counter.</strong> <code>Counter(predicted) &amp; Counter(expected)</code> keeps each
          token that appears in both with the smaller of its two counts, so a token repeated three times on one side
          and once on the other counts once. <code>.values()</code> are those counts and <code>sum</code> adds them. The
          third guard returns zeros when the overlap is zero, which is also what keeps the divisions below safe.
        </li>
        <li>
          <strong>Precision, recall, F1.</strong> <code>overlap / len(predicted)</code> asks how much of what the model
          said was right; <code>overlap / len(expected)</code> asks how much of the gold answer it covered;{' '}
          <code>2 * precision * recall / (precision + recall)</code> is the harmonic mean, which stays low unless both
          are high. The <code>return</code> packs four values into a tuple.
        </li>
        <li>
          <strong>Scoring every pair.</strong> <code>score_all</code> raises <code>ValueError</code> with an f-string
          naming the pair when a gold answer has no tokens, unpacks the four values in one assignment,{' '}
          <code>overlap, precision, recall, f1 = token_f1(...)</code>, appends a six-value tuple per pair, keeps two
          running totals with <code>+=</code>, and returns the rows and the two means; the caller unpacks them as{' '}
          <code>rows, mean_em, mean_f1 = score_all(PAIRS)</code>.
        </li>
        <li>
          <strong>The demonstration.</strong> The table loop unpacks six names per row. The format specs line it up:{' '}
          <code>{'{pair_id:<3}'}</code> left aligns in three columns and <code>{'{precision:>6.3f}'}</code> prints three
          decimals right aligned in six. <code>try</code> and <code>except ValueError as error</code> show the
          rejection without crashing, and each <code>assert</code> checks one claim before <code>OK</code>.
        </li>
      </ol>
      <p><strong>Trace the variables.</strong> Follow the two token lists, the overlap, and the three ratios through the five pairs:</p>
      <table>
        <thead><tr><th>pair</th><th>predicted tokens</th><th>gold tokens</th><th>overlap</th><th>P</th><th>R</th><th>F1</th><th>EM</th></tr></thead>
        <tbody>
          <tr><td>e1</td><td>read scope</td><td>read scope</td><td>2</td><td>1.000</td><td>1.000</td><td>1.000</td><td>1</td></tr>
          <tr><td>e2</td><td>rotate key then revoke old one</td><td>create replacement key deploy it then revoke old one</td><td>5</td><td>0.833</td><td>0.556</td><td>0.667</td><td>0</td></tr>
          <tr><td>e3</td><td>seven days</td><td>7 days</td><td>1</td><td>0.500</td><td>0.500</td><td>0.500</td><td>0</td></tr>
          <tr><td>e4</td><td>billing then invoices</td><td>billing then invoices</td><td>3</td><td>1.000</td><td>1.000</td><td>1.000</td><td>1</td></tr>
          <tr><td>e5</td><td>no</td><td>yes</td><td>0</td><td>0.000</td><td>0.000</td><td>0.000</td><td>0</td></tr>
        </tbody>
      </table>
      <p>
        e1 loses &quot;The&quot; and the period and becomes identical to its gold. e2 keeps six tokens against nine,
        shares five of them (key, then, revoke, old, one), and its precision of 0.833 is pulled down by a recall of
        0.556 to an F1 of 0.667. e3 shares only &quot;days&quot;, because &quot;seven&quot; and &quot;7&quot; are different
        tokens. e5 shares nothing and takes the zero guard. The totals are 2 exact matches and an F1 sum of 3.167,
        so the means are 0.400 and 0.633.
      </p>
      <p>
        <strong>Why these decisions.</strong> Normalizing before comparing is the repair, not a shortcut: every
        difference that string equality punished was a difference of format. Articles are dropped because SQuAD
        drops them and they carry no answer content. Two metrics are reported because they answer two questions,
        whether the answer is exactly right and how close it came, and keeping both avoids an argument over one
        number. F1 rather than precision alone, because precision rewards a one-word answer and recall rewards
        dumping every word, and the harmonic mean punishes that imbalance. The guards make the function total, so
        the scorer never crashes on a blank model answer; an empty gold answer is different, it is a bug in the
        evaluation set, so it raises instead of quietly scoring zero.
      </p>
      <p>
        <strong>The pattern, and its limits.</strong> Normalize, then count the overlap with a Counter, then turn the
        overlap into precision, recall, and F1. The same shape computes ROUGE-1 for summaries and the unigram
        precision inside BLEU. Its limits: no credit for synonyms, so &quot;seven&quot; against &quot;7&quot; scores half;
        order is ignored by F1, so a scrambled answer with the right words scores 1.000; the article list is English
        only; and long free-form answers need a judge, because they can be right while sharing few tokens.
      </p>
    </>
  ),

  visual: (
    <figure className="fig">
      <AnswerScoreViz />
      <figcaption className="fig-cap">
        <span className="fig-caption-text">
          The functions from the file, run on their own five pairs at a reading pace: about three seconds per pair,
          under half a minute in all. Each pair shows the model&apos;s tokens above and the gold tokens below, with the
          dropped articles struck through; green links join the tokens that match, and three meters fill to that
          pair&apos;s precision, recall, and F1 while the running means and the F1 of every pair build up on the right.
          The outro gives the means and names what string equality missed, and the practice variation lets e3 match
          its second gold answer. Step through with the buttons. The figure rests for two minutes before it plays
          again, and the motion setting in the site header can slow or stop it. Every score comes from the same
          functions run in the browser and is compared with the Python run.
        </span>
      </figcaption>
    </figure>
  ),

  tradeoffs: [
    {
      name: 'Raw string equality (what shipped)',
      preferWhen: 'The answers are closed-form outputs produced by one program with one formatting rule: identifiers, error codes, enum labels, numbers printed the same way every time.',
      cost: 'It scores format, not meaning. On the five pairs it reported zero exact matches, where two were right word for word and two more were mostly right; every capital letter, comma, and article became a wrong answer.',
    },
    {
      name: 'Normalized exact match plus token F1 (this lesson)',
      preferWhen: 'Short extractive answers, such as question answering over your own documents, where the gold answers are short spans and a cheap, deterministic, explainable score is worth more than nuance.',
      cost: 'No credit for synonyms, so seven against 7 scores 0.500; word order is ignored by F1; the article list is English only; and a model that pads its answers is punished through precision even when the right span is in there.',
    },
    {
      name: 'An LLM judge or an embedding similarity',
      preferWhen: 'Long or paraphrased answers, where two correct answers may share almost no tokens and a human would still call both right.',
      cost: 'A model call per item, nondeterministic scores unless you pin the model and the prompt, and a judge that itself has to be validated against human labels before its number means anything; the cheap metrics usually stay in the report beside it.',
    },
  ],
};
