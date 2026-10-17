import DiagramViewport from '../../src/components/DiagramViewport.jsx';
import pipelineSource from './python/src/rag_chunking/pipeline.py?raw';
import starterSource from './python/src/rag_chunking/starter.py?raw';
import solutionSource from './python/src/rag_chunking/solution.py?raw';
import chunkingTests from './python/tests/test_chunking.py?raw';
import retrievalTests from './python/tests/test_retrieval.py?raw';
import queriesFixture from './python/fixtures/queries.json?raw';
import apiKeysRunbook from './python/fixtures/runbooks/api-keys.md?raw';
import webhooksRunbook from './python/fixtures/runbooks/webhooks.md?raw';
import dataExportRunbook from './python/fixtures/runbooks/data-export.md?raw';
import ssoRunbook from './python/fixtures/runbooks/sso.md?raw';
import rateLimitsRunbook from './python/fixtures/runbooks/rate-limits.md?raw';
import incidentsRunbook from './python/fixtures/runbooks/incidents.md?raw';
import diagram from './visuals/chunk-boundaries.svg?raw';

// Authored by Claude Fable 5 in the main thread. Every number below was
// measured by running the package in this directory; nothing is predicted.
export const content = {
  brief: (
    <>
      <p>
        Orbit runs an internal support assistant over six Markdown runbooks: API keys, webhooks,
        data export, single sign-on, rate limits, and incident response. Ingest splits each runbook
        into chunks, a BM25 index ranks chunks against the question, and the top three chunks are
        pasted into the answering model&apos;s prompt. Each chunk may use at most{' '}
        <strong>500 characters</strong>; the budget is fixed and the product will not raise it.
      </p>
      <p>
        Last sprint, ingest was &quot;simplified&quot;: the chunker became a plain character window,
        500 characters and then the next 500, blind to headings and numbered lists. Ask how to rotate
        an API key without downtime and the best chunk holds steps one through three, then stops in
        the middle of step four, mid-word. The model, being helpful, answers confidently from most of
        a procedure.
      </p>
      <p>
        <strong>Your request:</strong> rebuild <code>chunk_document</code> in the starter so retrieval
        returns whole answers again, inside the same budget, and prove it on the labeled question set.
        The interface the rest of the pipeline relies on:
      </p>
      <ul>
        <li>Each chunk is a contiguous span of the original text, <code>body == doc.text[start:end]</code>, so a citation can point at exact offsets.</li>
        <li><code>chunk.text</code> is the heading trail, a newline, then the body (for example <code>API keys &gt; Scopes</code>), and never exceeds <code>max_chars</code>.</li>
        <li>A numbered procedure is never split; a block larger than the budget splits at sentence ends with no character lost.</li>
        <li>Bad budgets and non-string text raise; an empty or heading-only document yields no chunks.</li>
      </ul>
      <p>
        <strong>Success:</strong> all 23 labeled answers intact inside some chunk, answer recall at three of at least
        0.9, and no chunk over budget. Fixed windows measure 9 of 23 intact and 8 of 23 recalled; the reference measures
        23 of 23 and 21 of 23.
      </p>
    </>
  ),

  starter: (
    <>
      <p>
        Python 3.11 or newer, standard library only: nothing to install, no credentials, no network. From{' '}
        <code>python/</code>, run the suite against the reference to see the bar, then point{' '}
        <code>RAG_CHUNKER</code> at the starter and watch eight tests fail:
      </p>
      <pre><code>{`PYTHONPATH=src python -m unittest discover -s tests -p "test_*.py"
RAG_CHUNKER=rag_chunking.starter PYTHONPATH=src python -m unittest discover -s tests`}</code></pre>
      <p>
        The harness in <code>pipeline.py</code> is fixed. It loads the runbooks, resolves each labeled answer to a
        verbatim span, indexes <code>chunk.text</code> with BM25, and reports <strong>recall at three</strong> (is the
        whole answer inside one of the top three chunks?) and the <strong>intact rate</strong> (is it inside any chunk
        at all?). The second number isolates the chunker&apos;s job from the ranker&apos;s. A chunk over 500 characters
        raises <code>BudgetError</code>, so nobody can buy recall with giant chunks.
      </p>
      <p>
        The starter&apos;s <code>chunk_document</code> delegates to <code>fixed_window_chunks</code>, the code that
        shipped. Rewrite that one function: find the document&apos;s own blocks (headings, paragraphs, lists) with
        their offsets, carry the heading trail, pack whole blocks greedily up to the budget, split only an oversized
        block at sentence ends, and validate inputs. Keep the chunking tests green, then see whether recall follows.
      </p>
    </>
  ),

  files: [
    { path: 'python/src/rag_chunking/starter.py', role: 'starter', language: 'python', source: starterSource,
      description: 'The function to rewrite. It delegates to the fixed-window chunker that shipped.' },
    { path: 'python/src/rag_chunking/pipeline.py', role: 'starter', language: 'python', source: pipelineSource,
      description: 'The fixed harness: records, tokenizer, BM25, fixed_window_chunks, and evaluate() with the budget enforced. Read it; do not change it.' },
    { path: 'python/fixtures/queries.json', role: 'fixture', language: 'json', source: queriesFixture,
      description: 'Twenty-three natural questions, each naming its runbook and the first and last words of the verbatim answer span.' },
    { path: 'python/fixtures/runbooks/api-keys.md', role: 'fixture', language: 'text', source: apiKeysRunbook,
      description: 'The runbook in the diagram: create, rotate, and revoke procedures, and scopes.' },
    { path: 'python/fixtures/runbooks/webhooks.md', role: 'fixture', language: 'text', source: webhooksRunbook,
      description: 'Retry schedule, signature verification, and replaying missed events.' },
    { path: 'python/fixtures/runbooks/data-export.md', role: 'fixture', language: 'text', source: dataExportRunbook,
      description: 'Requesting an export, file layout, scheduled exports, and stuck exports.' },
    { path: 'python/fixtures/runbooks/sso.md', role: 'fixture', language: 'text', source: ssoRunbook,
      description: 'SAML configuration, enforcement, and break-glass access.' },
    { path: 'python/fixtures/runbooks/rate-limits.md', role: 'fixture', language: 'text', source: rateLimitsRunbook,
      description: 'Default limits, limit headers, handling a 429, and requesting a higher limit.' },
    { path: 'python/fixtures/runbooks/incidents.md', role: 'fixture', language: 'text', source: incidentsRunbook,
      description: 'Severity levels, declaring an incident, communication cadence, and the postmortem.' },
    { path: 'python/tests/test_chunking.py', role: 'test', language: 'python', source: chunkingTests,
      description: 'Structural checks on the chunker RAG_CHUNKER names: offsets, budget, whole procedures, heading trail, sentence splits, line endings, determinism, bad input.' },
    { path: 'python/tests/test_retrieval.py', role: 'test', language: 'python', source: retrievalTests,
      description: 'Fixture integrity, BM25 sanity, the measured fixed-window regression, the whole-document rejection, and the intact and recall bars.' },
    { path: 'python/src/rag_chunking/solution.py', role: 'reference', language: 'python', source: solutionSource,
      description: 'The reference repair: blocks with offsets, heading trail, greedy packing, sentence-level splits, loud failures.' },
  ],

  evidence: (
    <>
      <p>
        All expectations are exact: the fixtures are deterministic text and the harness has no randomness. Measured
        with the shipped harness, same tokenizer for every row:
      </p>
      <table>
        <thead><tr><th>chunker</th><th>chunks</th><th>longest text</th><th>answers intact</th><th>recall at 3</th></tr></thead>
        <tbody>
          <tr><td>fixed 500-char windows</td><td>22</td><td>500</td><td>9 / 23</td><td>8 / 23 (0.35)</td></tr>
          <tr><td>fixed windows, 100-char overlap</td><td>26</td><td>500</td><td>12 / 23</td><td>12 / 23 (0.52)</td></tr>
          <tr><td>structure-aware (reference)</td><td>30</td><td>494</td><td>23 / 23</td><td>21 / 23 (0.91)</td></tr>
        </tbody>
      </table>
      <p>
        Fixed windows cut 14 of the 23 answers: the chunker, not the ranker, is the failure. Overlap rescues some
        and still cuts nearly half. The reference leaves every answer intact; its two misses are ranking failures, and
        the tests name them so a regression cannot hide behind them. <strong>q01</strong> (a key pasted into a public
        issue): the revoke procedure is intact in its own chunk, but the section&apos;s intro paragraph, which talks
        about public repositories and pasted keys, outranks it and the steps land fifth. <strong>q19</strong> (an outage
        described in plain words) shares no vocabulary with the declare-an-incident procedure, so a lexical ranker
        scores it zero.
      </p>
      <p>
        Failure cases covered: bad budgets (zero, negative, too small, boolean, fractional), bytes instead of text,
        empty and heading-only documents, a 20-sentence paragraph under a 200-character budget, Windows line endings,
        and a whole-document chunker that would score perfectly and is rejected by the budget. Two facts for honesty:
        stripping word suffixes in the tokenizer rescued two questions that had failed on plurals and tense, so part of
        the gain is retrieval hygiene (the fixed-window rows use the same tokenizer); and the heading trail did not
        change recall at three here (21 of 23 either way), so it stays for the prompt builder and the citation, not for
        the metric. Not proven: generation quality, other corpora, or rankers other than BM25.
      </p>
    </>
  ),

  solution: (
    <>
      <p>The reference follows the document&apos;s own structure, because Markdown already marks the meaning boundaries.</p>
      <ol>
        <li><strong>Blocks with offsets.</strong> Walk the text line by line: a heading is a block of its own, a blank line closes whatever is open, consecutive list lines form one list block, other lines form a paragraph. Each block records the offsets of its first and last character.</li>
        <li><strong>Headings become context, never body.</strong> A heading updates a small table of levels; the breadcrumb is the titles joined from the top down, so a chunk under the rotation section is prefixed <code>API keys &gt; Rotate a key without downtime</code>. Intro text before the first section carries only the title.</li>
        <li><strong>Greedy packing over whole blocks.</strong> The budget for a chunk is <code>max_chars</code> minus the breadcrumb and a newline. A block that fits is appended; one that would not fit closes the chunk and opens the next. A numbered procedure is one block, so packing can never cut it.</li>
        <li><strong>Oversized blocks split at sentence ends.</strong> Prefer the last sentence end inside the window, then the last whitespace, then a hard cut; pieces never start or end with whitespace and together cover every character.</li>
        <li><strong>Loud failures.</strong> Non-string text raises <code>TypeError</code>; a budget that cannot hold the trail plus 40 characters raises <code>ValueError</code>; empty or heading-only input returns an empty list.</li>
      </ol>
      <p>
        Debugging followed the numbers. The first run scored 19 of 23; printing the rank of the gold chunk for each
        miss showed two plural and tense mismatches, fixed by the suffix stripper, and the two cases above. No overlap
        was added: with whole blocks as the unit no labeled answer straddles a boundary, and overlap would duplicate
        text in the index and the prompt for nothing. Raising the budget was not an option, and the budget check in{' '}
        <code>evaluate</code> exists so that nobody quietly makes it one.
      </p>
    </>
  ),

  visual: (
    <figure className="fig">
      <DiagramViewport width={900} aspect="900 / 540" frameClassName="fig-canvas">
        <div dangerouslySetInnerHTML={{ __html: diagram }} />
      </DiagramViewport>
      <figcaption className="fig-cap">
        <span className="fig-caption-text">
          Measured, not illustrative: the api-keys runbook (1,851 characters) as a character ruler. Fixed windows end
          at 500, 1,000, and 1,500 characters, each inside a procedure, so three of its four labeled answers are cut
          (red); the six structure-aware chunks keep all four intact (green). The bars cover all 23 questions: filled is
          recall at three, the dashed outline is answers intact in any chunk.
        </span>
      </figcaption>
    </figure>
  ),

  tradeoffs: [
    {
      name: 'Parent-section retrieval (small-to-big)',
      preferWhen: 'Index small chunks for ranking but hand the model the whole enclosing section. The natural fix for q01, where the intro and the procedure of one section should travel together, and for corpora whose sections are short.',
      cost: 'The budget moves to the section level: the revoke section is 545 characters before its heading trail, already over the limit, so oversized sections still need a splitter exactly like this one, and prompts grow for every hit.',
    },
    {
      name: 'Embedding retrieval, or hybrid BM25 plus embeddings',
      preferWhen: 'Questions share little vocabulary with their answers, as in q19, where an outage described in plain words scores zero against the declare-an-incident procedure. Fusing BM25 and embedding ranks keeps exact-term wins while covering paraphrase.',
      cost: 'An embedding model or a provider call for every chunk and every query, a full re-index when the model changes, latency, and money. It fixes nothing about cut answers: a split procedure is split in any index, so chunking is repaired first.',
    },
    {
      name: 'Fixed windows with overlap (the team’s first proposal)',
      preferWhen: 'Text with no structure at all, such as a transcript or an OCR dump, where there are no headings or lists to follow and something is needed today.',
      cost: 'On structured runbooks it measured 12 of 23 recalled, duplicated text in both the index and the prompt, and carried no heading context: a bandage over a boundary problem whose boundaries were already written down in the Markdown.',
    },
  ],
};
