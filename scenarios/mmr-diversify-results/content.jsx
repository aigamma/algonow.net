import CodeBlock from '../../src/components/CodeBlock.jsx';
import MmrViz from './visuals/MmrViz.jsx';
import solutionSource from './python/src/mmr_rerank/solution.py?raw';
import starterSource from './python/src/mmr_rerank/starter.py?raw';
import answerSource from './python/src/mmr_rerank/practice_answer.py?raw';
import lessonTests from './python/tests/test_lesson.py?raw';
import expectedOutput from './python/fixtures/expected-output.txt?raw';
import expectedPracticeOutput from './python/fixtures/expected-practice-output.txt?raw';
import candidatesFixture from './python/fixtures/candidates.json?raw';

// Authored by Claude Fable 5 in the main thread. Every number on this page was
// produced by running the files below; the expected outputs are the files'
// actual output, compared byte for byte by the tests.
const answerSnippet = answerSource.split('# --- answer begins ---\n')[1].split('# --- answer ends ---')[0].trim();

export const content = {
  brief: (
    <>
      <p>
        Orbit&apos;s assistant retrieves runbook chunks for a question and sends the top few to the model. For
        &quot;rotate key&quot; the top three were three near-copies of one paragraph, one from each runbook version
        still in the index, so the answer explained rotation three times and never saw the revocation step that
        sat one chunk further down. Ranking by relevance alone rewards every copy of the best paragraph.
      </p>
      <p>
        <strong>The action to practice:</strong> rerank the candidates with maximal marginal relevance, so each
        slot after the first goes to something relevant <em>and</em> new. Four moves:
      </p>
      <ul>
        <li><strong>Relevance:</strong> the score the retriever already gave each candidate, 0 to 1.</li>
        <li><strong>Penalty:</strong> a candidate&apos;s highest similarity to anything already picked; 0 in the first round, when nothing is picked.</li>
        <li><strong>Score:</strong> <code>lam * relevance - (1 - lam) * penalty</code>, with <code>lam = 0.7</code> here: relevance counts seventy percent, novelty thirty.</li>
        <li><strong>Loop:</strong> pick the highest score, move it from the remaining list to the selected list, and repeat until k are picked.</li>
      </ul>
      <p>
        <strong>Input.</strong> Six candidates, inline as a list of dictionaries, and a six by six similarity matrix
        between them. Three are versions of the same rotation paragraph; c4 is the revocation step.
      </p>
      <table>
        <thead><tr><th>id</th><th>source</th><th>title</th><th>relevance</th></tr></thead>
        <tbody>
          <tr><td>c1</td><td>runbook</td><td>Rotate an API key, runbook v3</td><td>0.92</td></tr>
          <tr><td>c2</td><td>runbook</td><td>Rotate an API key, runbook v2</td><td>0.90</td></tr>
          <tr><td>c3</td><td>runbook</td><td>Rotate an API key, runbook v1</td><td>0.88</td></tr>
          <tr><td>c4</td><td>security-faq</td><td>Revoke the old key after rotating</td><td>0.80</td></tr>
          <tr><td>c5</td><td>security-faq</td><td>Grace period for the old key</td><td>0.75</td></tr>
          <tr><td>c6</td><td>cli-reference</td><td>rotate-key command flags</td><td>0.55</td></tr>
        </tbody>
      </table>
      <table>
        <thead><tr><th>similarity</th><th>c1</th><th>c2</th><th>c3</th><th>c4</th><th>c5</th><th>c6</th></tr></thead>
        <tbody>
          <tr><td>c1</td><td>1.00</td><td>0.92</td><td>0.90</td><td>0.45</td><td>0.50</td><td>0.40</td></tr>
          <tr><td>c2</td><td>0.92</td><td>1.00</td><td>0.91</td><td>0.42</td><td>0.48</td><td>0.38</td></tr>
          <tr><td>c3</td><td>0.90</td><td>0.91</td><td>1.00</td><td>0.40</td><td>0.46</td><td>0.36</td></tr>
          <tr><td>c4</td><td>0.45</td><td>0.42</td><td>0.40</td><td>1.00</td><td>0.30</td><td>0.20</td></tr>
          <tr><td>c5</td><td>0.50</td><td>0.48</td><td>0.46</td><td>0.30</td><td>1.00</td><td>0.25</td></tr>
          <tr><td>c6</td><td>0.40</td><td>0.38</td><td>0.36</td><td>0.20</td><td>0.25</td><td>1.00</td></tr>
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
        Change one behavior. The worked solution lets one source fill every slot when its chunks score well.
        Make <code>mmr</code> respect a cap: a candidate whose source already has <code>max_per_source</code> picks
        is skipped for the rest of the run. The file below is the worked solution with the parameter accepted but
        unused, rounds returned as <code>(rows, blocked)</code> pairs, and a check for the new behavior. As shipped
        it prints <code>NOT OK</code> and stops.
      </p>
      <p>
        <strong>Hint.</strong> At the top of each round, split <code>remaining</code> into two lists, allowed and
        blocked: for each candidate, count how many selected candidates share its source with a small inner loop,
        and compare the count with the cap. Score only the allowed list, append the blocked list to the round&apos;s
        record, and <code>break</code> out of the <code>while</code> loop when nothing is allowed, because no further
        pick is possible.
      </p>
      <p>
        <strong>Expected result.</strong> With a cap of 1, pick 2 skips c2 and c3 (runbook already has c1) and
        pick 3 also skips c5 (security-faq already has c4), so c6 is the only candidate left and the picks become
        c1, c4, c6: three sources, highest similarity between two picks 0.45, at the price of a 0.55 relevance chunk
        in the third slot. The file ends with <code>OK</code>.
      </p>
      <details>
        <summary>Show the answer</summary>
        <CodeBlock filename="Practice answer" code={answerSnippet} />
        <p>
          Two new lists at the top of the round, a counting loop, one comparison against the cap, and a{' '}
          <code>break</code> for the case where every remaining source is capped. The scoring, the best-so-far
          search, and the bookkeeping are unchanged; they simply run over <code>allowed</code> instead of{' '}
          <code>remaining</code>. Everything outside the marked region is the practice file unchanged.
        </p>
      </details>
    </>
  ),

  files: [
    { path: 'python/src/mmr_rerank/solution.py', role: 'reference', language: 'python', source: solutionSource, primary: true,
      description: 'The complete worked example: the six candidates and their similarity matrix, the relevance-only baseline, the round scorer, the greedy MMR loop, three small reporting helpers, and a demonstration that prints every round, the picks, the rejected lambda, and OK. Runs alone with Python 3.11 or newer.' },
    { path: 'python/src/mmr_rerank/starter.py', role: 'starter', language: 'python', source: starterSource, primary: true,
      description: 'The practice file: the worked solution with a max_per_source parameter that is not used yet, rounds returned as (rows, blocked) pairs, and a check for the cap. Prints NOT OK until mmr skips candidates whose source is at its cap.' },
    { path: 'python/src/mmr_rerank/practice_answer.py', role: 'reference', language: 'python', source: answerSource,
      description: 'The completed practice variation; the page shows the region between its answer markers.' },
    { path: 'python/fixtures/expected-output.txt', role: 'fixture', language: 'text', source: expectedOutput,
      description: 'What solution.py prints, byte for byte. The test runs the file alone and compares.' },
    { path: 'python/fixtures/expected-practice-output.txt', role: 'fixture', language: 'text', source: expectedPracticeOutput,
      description: 'What practice_answer.py prints, byte for byte.' },
    { path: 'python/tests/test_lesson.py', role: 'test', language: 'python', source: lessonTests,
      description: 'Runs the three lesson files alone, checks the round arithmetic, the lambda extremes, the guards, the per-source cap, and the fixtures, and measures the relevance-only picks that shipped against the MMR picks on the same candidates.' },
    { path: 'python/fixtures/candidates.json', role: 'fixture', language: 'json', source: candidatesFixture,
      description: 'The six candidates, the similarity matrix, k, lambda, and the per-source cap exactly as the lesson files define them; the animation runs on this copy and a test pins it to the files.' },
  ],

  evidence: (
    <>
      <p>
        <strong>What the file checks</strong> before it prints <code>OK</code>: the picks are c1, c4, c5; relevance
        alone picks c1, c2, c3; and the highest similarity between any two MMR picks (0.50) is below the lowest
        between any two relevance-only picks (0.90 or more). Run your copy and compare its output with the expected
        output above; they must match line for line.
      </p>
      <p>
        <strong>The failure cases.</strong> The demonstration asks for a lambda of 1.5 and <code>mmr</code> raises a{' '}
        <code>ValueError</code> that the demonstration prints as the rejected line, because a weight outside 0 to 1
        would make the score mean nothing. The tests in the project download also reject a similarity matrix with
        five rows for six candidates and a row with four entries, check that asking for ten picks from six
        candidates returns each once, and pin the two extremes: a lambda of 1 reproduces the relevance order, and a
        lambda of 0 picks the least similar candidate every round (c1, then c6, then c4).
      </p>
      <p>
        <strong>What shipped, on the same candidates.</strong> The relevance-only top three are c1, c2, c3: every
        pair is 0.90 or more similar, all three come from the runbook, and the revocation step c4 is absent. MMR
        keeps c1 first, holds the highest similarity between its picks to 0.50, and covers two sources; the
        practice cap covers three. All of it is measured by the tests in the project download.
      </p>
    </>
  ),

  solution: (
    <>
      <p>
        Read the file top to bottom: the input, the baseline that shipped, one function that scores a round, the
        greedy loop, three small reporting helpers, and a demonstration. Here is its Python, construct by construct.
      </p>
      <ol>
        <li>
          <strong>A list of dictionaries.</strong> <code>CANDIDATES</code> is a list whose items are dictionaries, so{' '}
          <code>candidates[index][&quot;relevance&quot;]</code> is two lookups: the square brackets on the list pick a
          position, and the square brackets on the dictionary pick a key. The functions work with positions
          (0 to 5) and only the demonstration turns them back into ids.
        </li>
        <li>
          <strong>A list of lists as a matrix.</strong> <code>SIMILARITY</code> holds six rows of six numbers, and{' '}
          <code>similarity[index][chosen]</code> reads row <code>index</code>, column <code>chosen</code>. The matrix is
          symmetric, so either order gives the same number, and the diagonal is 1.00 because a chunk is identical
          to itself.
        </li>
        <li>
          <strong>The baseline with a tuple sort.</strong> <code>top_by_relevance</code> appends one tuple per
          candidate, <code>(-candidate[&quot;relevance&quot;], index)</code>, then calls <code>pairs.sort()</code>. A
          list of tuples sorts by the first item, then the second, so the negative relevance puts the highest
          first and the index settles ties; <code>pairs[:k]</code> slices the first k, and the loop header{' '}
          <code>for negative_relevance, index in pairs[:k]</code> unpacks each tuple.
        </li>
        <li>
          <strong>Scoring one round.</strong> <code>score_round</code> loops over the remaining positions, and for
          each one loops over the selected positions keeping a running maximum: <code>penalty</code> starts at 0.0
          and is raised whenever a larger similarity appears, so with nothing selected it stays 0. The score line
          is the formula itself, <code>lam * candidates[index][&quot;relevance&quot;] - (1 - lam) * penalty</code>, and
          the row is appended as a tuple <code>(index, penalty, score)</code>.
        </li>
        <li>
          <strong>The guards.</strong> <code>if not 0.0 &lt;= lam &lt;= 1.0:</code> is a chained comparison that reads
          like the arithmetic. <code>raise ValueError(f&quot;...&quot;)</code> stops the function with a message that
          names the bad value. The matrix is checked row by row before any scoring happens.
        </li>
        <li>
          <strong>The while loop with two conditions.</strong> <code>while len(selected) &lt; k and remaining:</code>{' '}
          keeps going while fewer than k are picked and the remaining list is not empty; a non-empty list counts
          as true on its own. <code>remaining = list(range(n))</code> builds the positions 0 to n minus 1 as a real
          list, because the loop will remove from it.
        </li>
        <li>
          <strong>Best so far.</strong> <code>best = rows[0]</code> starts with the first row, and{' '}
          <code>if row[2] &gt; best[2]: best = row</code> replaces it only on a strictly higher score, so a tie keeps
          the earlier candidate and the result is deterministic. <code>index, penalty, score = best</code> unpacks the
          winning tuple into three names.
        </li>
        <li>
          <strong>Append and remove.</strong> <code>selected.append(index)</code> adds to the end;{' '}
          <code>remaining.remove(index)</code> deletes the first item equal to that value, not the item at that
          position. Together they move one candidate across. <code>picks.append(best)</code> and{' '}
          <code>rounds.append(rows)</code> keep the record.
        </li>
        <li>
          <strong>Two return values.</strong> <code>return picks, rounds</code> hands back a tuple of two lists, and
          the caller unpacks it in one line: <code>picks, rounds = mmr(...)</code>.
        </li>
        <li>
          <strong>The helpers and the demonstration.</strong> <code>names</code> joins ids with{' '}
          <code>&quot;, &quot;.join(ids)</code>. <code>pairwise_max</code> visits every pair once with two ranges,{' '}
          <code>for second in range(first + 1, len(indexes))</code>. <code>sources_of</code> uses <code>not in</code>{' '}
          to add each source once. The demonstration numbers the rounds with <code>enumerate(rounds, start=1)</code>,
          slices <code>picked[:number - 1]</code> for the selected-so-far line, lines the table up with format specs
          such as <code>{'{penalty:>8.2f}'}</code>, catches the rejected lambda with <code>try</code> and{' '}
          <code>except ValueError</code>, and checks each claim with <code>assert</code> before <code>OK</code>.
        </li>
      </ol>
      <p><strong>Trace the rounds.</strong> Follow the penalty and the score of every remaining candidate through the three picks:</p>
      <table>
        <thead><tr><th>pick</th><th>candidate</th><th>relevance</th><th>penalty</th><th>score</th><th>result</th></tr></thead>
        <tbody>
          <tr><td>1</td><td>c1</td><td>0.92</td><td>0.00</td><td>0.644</td><td>picked</td></tr>
          <tr><td>1</td><td>c2 to c6</td><td>0.90 to 0.55</td><td>0.00</td><td>0.630 to 0.385</td><td>lower</td></tr>
          <tr><td>2</td><td>c2</td><td>0.90</td><td>0.92</td><td>0.354</td><td>a copy of c1</td></tr>
          <tr><td>2</td><td>c3</td><td>0.88</td><td>0.90</td><td>0.346</td><td>a copy of c1</td></tr>
          <tr><td>2</td><td>c4</td><td>0.80</td><td>0.45</td><td>0.425</td><td>picked</td></tr>
          <tr><td>2</td><td>c5</td><td>0.75</td><td>0.50</td><td>0.375</td><td>lower</td></tr>
          <tr><td>2</td><td>c6</td><td>0.55</td><td>0.40</td><td>0.265</td><td>lower</td></tr>
          <tr><td>3</td><td>c2</td><td>0.90</td><td>0.92</td><td>0.354</td><td>still a copy</td></tr>
          <tr><td>3</td><td>c3</td><td>0.88</td><td>0.90</td><td>0.346</td><td>still a copy</td></tr>
          <tr><td>3</td><td>c5</td><td>0.75</td><td>0.50</td><td>0.375</td><td>picked</td></tr>
          <tr><td>3</td><td>c6</td><td>0.55</td><td>0.40</td><td>0.265</td><td>lower</td></tr>
        </tbody>
      </table>
      <p>
        In the first round every penalty is 0, so the scores are 0.7 times the relevance and c1 wins at 0.644. In
        the second round each candidate is penalized by its similarity to c1: the two copies lose 0.3 times 0.92
        and 0.3 times 0.90, which drops them to 0.354 and 0.346, while c4 loses only 0.3 times 0.45 and wins at
        0.425 despite a relevance ten points lower than c2. In the third round the penalty is the highest
        similarity to c1 or c4; c5&apos;s 0.30 to c4 is below its 0.50 to c1, so its penalty stays 0.50, and its 0.375
        beats c2&apos;s 0.354. The picks are c1, c4, c5.
      </p>
      <p>
        <strong>Why these decisions.</strong> Greedy, one pick per round, because checking every triple of six
        candidates is twenty cases but every ten of a thousand is not; one pass of k rounds over the remaining list
        is cheap and good enough. The penalty is the highest similarity, not the average, because one near-copy
        already makes a candidate redundant. Lambda 0.7 keeps relevance in charge and lets novelty break near-ties;
        the tests pin both extremes so the knob is understood. The similarity matrix is an input, computed once
        from the same embeddings the retriever used, so the reranker adds no model calls. Ties keep the earlier
        candidate so the same input always gives the same picks.
      </p>
      <p>
        <strong>The pattern, and its limits.</strong> A greedy loop whose score changes after every pick: a best-so-far
        search over a shrinking list, then move the winner across. The same shape seeds clusters, schedules jobs,
        and picks exemplars for a prompt. Its limits: greedy is not optimal, and a different lambda or a different
        tie rule can change the set; every round reads one similarity per remaining candidate per selected one, so
        the work grows with k times the pool; the similarity comes from embeddings and can miss two chunks that
        say the same thing in different words; and at a low lambda a novel but useless chunk slips in, which is
        exactly what the practice cap shows at the third slot.
      </p>
    </>
  ),

  visual: (
    <figure className="fig">
      <MmrViz />
      <figcaption className="fig-caption">
        <span className="fig-caption-text">
          The greedy loop from the file, run on its own six candidates at a reading pace: about three seconds per
          decision, about twenty five seconds in all. Each candidate is a row with its relevance in blue; the trio
          that shipped is outlined in amber. Pick one glides into the first slot, then for each later pick the
          amber penalty bars grow to each remaining candidate&apos;s highest similarity to the selected chunks, the
          scores appear, and the winner glides across. The outro compares the two lists, and the practice
          variation replays the third pick with the per-source cap blocking c2, c3, and c5. Step through with the
          buttons. Every penalty and score comes from the same loop run in the browser and is checked against the
          Python run.
        </span>
      </figcaption>
    </figure>
  ),

  tradeoffs: [
    {
      name: 'Top k by relevance (what shipped)',
      preferWhen: 'The index holds one copy of each document and the question has one answer, so the most relevant chunks are also different from each other.',
      cost: 'With duplicates or versions in the index, the top slots fill with copies: on the six candidates it picks c1, c2, c3 at 0.90 or more pairwise similarity, one source, and the revocation step never reaches the model.',
    },
    {
      name: 'Maximal marginal relevance (this lesson)',
      preferWhen: 'A pool of a few dozen candidates with a similarity matrix already in hand, where a few slots must cover different aspects of the question.',
      cost: 'Greedy, not optimal, with a lambda to tune: at 0.7 the picks are c1, c4, c5 with a highest similarity of 0.50; at 0 a useless but novel chunk can win a slot. Each round costs a similarity lookup per remaining candidate per selected one.',
    },
    {
      name: 'Deduplicate before ranking',
      preferWhen: 'The redundancy is literal copies or versions: drop any candidate above a similarity threshold to a higher-ranked one, or keep one chunk per document, then take the top k.',
      cost: 'A hard threshold instead of a tradeoff, so two chunks at 0.89 both survive while two at 0.91 collapse; it cannot prefer a slightly less relevant chunk that adds a new aspect, and the threshold itself needs tuning per embedding model.',
    },
  ],
};
