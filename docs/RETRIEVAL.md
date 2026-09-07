# Retrieval over the AlgoNow atlas

Semantic search answers a concrete learner question: which cataloged algorithm
fits a problem described in ordinary language? It searches all committed atlas
entries, including aliases, heuristics, problem labels and taxonomy. These are
catalog records, not newly authored lessons. Existing local lookup, random picks,
prerendered pages and preserved narration remain available independently.

The atlas has an explicit "search by meaning" form. Opening the page, opening the
form and typing do not invoke retrieval. A submitted search uses the selected
category and tier. Service failure leaves local filtering available. Results link
to existing catalog pages and do not synthesize an answer.

## Architecture and provider choice

Qdrant is deployed as a separate Fly service with a persistent volume. Category,
topic, tier and problem payload filters map directly to the catalog's structure.
This follows the owner's Rust/Qdrant preference and existing Fly operating model.
No existing Pinecone or Supabase data is migrated. A separate service keeps this
catalog operationally independent of other conference exhibits.

Voyage `voyage-context-4` embeds each existing joined entry as one prechunked
document at 1024 dimensions. Queries use the same model and query input type.
Both call `/v1/contextualizedembeddings`, with automatic chunking disabled. The
response has document and chunk indices, which the client validates explicitly.
Qdrant returns up to 50 cosine candidates; `rerank-2.5` selects up to 12. When
reranking fails, bounded dense results carry an explicit ranking indicator.
These choices are implementation decisions, not a measured quality superiority
claim. Source: https://docs.voyageai.com/docs/contextualized-chunk-embeddings.

The Netlify search function has only a read-only Qdrant credential and the Voyage
credential. Neither credential reaches the browser. The write credential is held
by the operator and never installed in the search function. No signer, BLAKE3
operation, capture archive or provenance dependency is on ordinary search paths.

## Ingestion and continued development

`node scripts/embed-atlas.mjs` is a free dry run. It joins the existing authored
JSON, excludes the three non-entry registries, checks total coverage and unique
point IDs, and writes `build/atlas-records.json`. It authors no teaching content.

An authorized live run adds `--i-am-paying`. Explicit `--max-records` and
`--max-tokens` bounds can be raised for a reviewed larger run; they are operational
spend bounds, not limits on the catalog. Calls are sequential, at most 64 short
records and 28,000 UTF-8 text bytes per embedding request. Actual token usage and
all attempts are retained in `build/ingestion-*.json`. An ambiguous paid request
is not automatically retried. Successful vectors are cached before upsert.

Each full generation has a deterministic SHA-256 identifier and its own Qdrant
collection. Unchanged text vectors are reused from a retained generation or the
local embedding cache. Payloads include exact embedded text, full text SHA-256,
source-file path and hash, source commit, embedding model, and generation.
Every upsert receives an exact payload readback, followed by an exact total count.
Only then does one atomic alias update activate the complete generation. Removed
entries disappear from current search through the new generation; older
collections remain retained for review and rollback. A local exclusive lock
serializes this operator; it is not a distributed writer lock.

This permits ongoing corpus growth while an empirical campaign pins its specific
generation and preserves captures. Retention must be managed deliberately:
old campaign generations are not automatically deleted by ingestion.

## Verification and release

September 7 implementation checks: full dry run covers 3,257 records; five new
retrieval checks cover corpus coverage, response ordering and dimensions, filters,
rerank fallback, and requests rejected before vendor calls. `npm run build` and
`npm run check` pass, including all 66 tests and existing page-size budgets.
Deployment and actual provider-call evidence are recorded separately when run.
