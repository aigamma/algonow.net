# Retrieval: browsing and searching 2,000+ algorithms

Two different problems, two different answers. Do not conflate them.

## 1. Browsing the catalog: no backend, already built

The atlas entries are short strings. The `/atlas` page filters the whole
catalog client-side (atlas-summary.json has the live count), instantly,
grouped by the 20 categories, with alias resolution (typing `DSU` finds
Union-Find) and tier filtering. This costs
nothing, needs no service, and keeps a perfect PageSpeed score. **No vector
database is needed for browse/lookup, and none should be added for it.**

## 2. Semantic search: "what algorithm solves my problem?"

This is the valuable feature and the only one that wants a vector database:
a natural-language query ("I need to find near-duplicate documents at scale",
"shortest path with negative edges") returning the right units by meaning, not
keyword. This is also what feeds the eventual learner chatbot's retrieval.

### Best-of-everything stack (owner directive: always start with the best)

- **Embeddings: Voyage `voyage-context-4`** (released 2026-06-29), the current
  best-performing Voyage model: contextualized chunk embeddings on a
  mixture-of-experts backbone, with built-in auto-chunking and transparent
  handling of documents past 32K tokens, so chunking stops being a design
  concern. For plain dense embeddings where a fixed model is simpler, **`voyage-4-large`**
  (the MoE flagship, 2026-01-15) is the alternative; all Voyage 4 models share
  a compatible embedding space, so query and document models can be mixed.
  Supersede the older `voyage-3`/`voyage-3.5` everywhere this stack touches.
  Dimensions: 2048 / 1024 / 512 / 256 with quantization options; start at 1024
  (the quality/cost knee) and only go to 2048 if evaluation shows it pays.
- **Reranker: Voyage `rerank-2.5`** (or the latest `rerank` at build time) over
  the top ~50 vector candidates. This is where most of the ranking quality is
  won; never skip it.
- **Vector store: Qdrant on Fly.io.** Rationale below.

### Vector store choice (all three are subscribed; pick Qdrant)

| Option | For | Against |
|---|---|---|
| **Qdrant on Fly** (recommended) | Matches the Fly-first infra preference; `learnrust.ai` already runs Qdrant (proven in-stack); rich payload filtering (by category / topic / tier / problem straight from the atlas schema); self-hosted, no per-query vendor metering | One service to run (trivial at this scale) |
| **Pinecone** | Zero-ops serverless; `worldthought.com` already pairs it with Voyage, so the exact ingest+query pattern exists to copy | Another metered vendor; less flexible payload filtering than Qdrant |
| **Supabase pgvector** | One fewer vendor if a Postgres is already in play | Entangles algonow with the Supabase project that doubles as the mathlimit conference exhibit; keep them separate |

Qdrant wins on infra fit and on keeping algonow's data clear of the mathlimit
exhibit. The atlas schema (`category`, `topic`, `t` tier, `d` phrase, problem
slug, plus the alias list) maps directly to Qdrant payload fields, so filtered
semantic search ("only tier-1 graph algorithms about X") is a one-query
feature.

### The staged record (one entry, ready to embed)

Everything below is committed data already; the embed script only joins it.
Keeping these joins healthy IS the staging work, done now so no forensic
reconstruction is needed later: alias density is what makes five names
resolve to one vector, and problem registration (`problems.json`) is what
lets "what else solves this?" come back as structured rivals instead of
fuzzy neighbors.

- `id`: deterministic slug of the canonical `a` (plus heuristic slug when
  paired), per the redirect doctrine in ATLAS.md
- `text` (what gets embedded): canonical name, aliases, heuristic, `d`
  phrase, problem label, topic, category
- payload (filterable): `category`, `topic`, `tier`, `problem` slug,
  `aliases[]`, `rivals[]` (canonical names sharing the problem)

### Cost and the token doctrine

Embedding the full catalog once is a **one-time near-trivial metered cost**
(a few thousand entries x ~40 tokens of joined record each is on the order
of 200K tokens on Voyage, cents). Re-embedding
on catalog growth is incremental. Query embedding + rerank is per-search and
tiny. Per the standing doctrine (see ATLAS.md), this metered spend is
legitimate because it is deployed-runtime retrieval, not interactive building;
the catalog authoring itself stays on the subscription. Even so, **no embedding
run happens without an explicit in-session go-ahead** (the API-spend rule).

### What to build when green-lit

1. `scripts/embed-atlas.mjs`: read every topic file, compose the staged
   record above per entry, embed the `text` with `voyage-context-4`, upsert
   to Qdrant with the payload. Idempotent on a content hash so re-runs only
   touch changed entries.
2. A Netlify function `/api/search`: embed the query, Qdrant top-K with optional
   category/tier filter, Voyage rerank, return canonical units. Fail-open.
3. Wire the atlas page's search box to fall back from client-side filter to
   `/api/search` when the query looks like a natural-language question.

This is the same shape as `worldthought.com`'s retrieval, upgraded to Voyage 4.

Sources for the model facts: Voyage AI blog (voyage-4 family, 2026-01-15;
voyage-context-4, 2026-06-29).
