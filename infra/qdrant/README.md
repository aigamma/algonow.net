# Qdrant for algonow

The vector store for semantic search over the atlas. Browsing and lookup do
NOT need this (see `docs/RETRIEVAL.md`): the atlas page filters client-side
and the prerendered `/algo/` and `/problem/` pages are static. This exists
for one feature, natural-language questions like "find near-duplicate
documents at scale", and for the eventual learner chatbot's retrieval.

**Nothing here is running yet, and nothing here has been paid for.** The
files are the deployable configuration; `scripts/embed-atlas.mjs` refuses to
make a metered call without `--i-am-paying`.

## Why Qdrant on Fly

Recorded so the choice is not relitigated: it matches the Fly-first infra
preference, `learnrust.ai` already runs Qdrant so the pattern is proven
in-stack, payload filtering maps directly onto the atlas schema (category,
topic, tier, problem), and self-hosting keeps per-query cost off a metered
vendor. Pinecone and Supabase pgvector were the alternatives; the reasoning
against each is in `docs/RETRIEVAL.md`.

## Deploy

```sh
fly launch --no-deploy --copy-config --name algonow-qdrant
fly volumes create qdrant_data --size 3 --region ord
fly secrets set QDRANT__SERVICE__API_KEY="$(openssl rand -hex 32)"
fly deploy
```

Then point the site at it:

```sh
netlify env:set QDRANT_URL   "https://algonow-qdrant.fly.dev"
netlify env:set QDRANT_API_KEY "<the same key>"
netlify env:set VOYAGE_API_KEY "<voyage key>"
```

## Collection

One collection, `algonow_atlas`, 1024 dimensions, cosine distance. That
dimension is the quality-cost knee for the Voyage 4 family; 2048 is
available and should only be adopted if evaluation shows it pays.

Payload indexes are created up front by the embed script, because adding an
index later forces a full re-scan:

| field | type | used for |
|---|---|---|
| `category` | keyword | "only graph algorithms" |
| `topic` | keyword | "only in search-structures" |
| `problem` | keyword | "other methods for this problem" |
| `tier` | integer | "canon only" |

## Cost

Embedding the whole catalog is one metered call of roughly 214,000 tokens
(3,116 records), which is cents. Re-embedding is incremental: each record
carries a content hash, so a re-run only touches changed entries. Query
embedding plus rerank is per-search and tiny.

Per the token doctrine in `CLAUDE.md`, even this small spend needs an
explicit in-session go-ahead. Run the dry run first and read what it plans
to send:

```sh
node scripts/embed-atlas.mjs --sample 5
```
