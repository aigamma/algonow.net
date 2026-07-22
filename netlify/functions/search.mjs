// GET /api/search?q=...&category=...&tier=...
//
// Natural-language search over the atlas: embed the query with Voyage, pull
// candidates from Qdrant with optional payload filters, rerank, return
// canonical units. Client-side filtering already handles browse and lookup
// (see docs/RETRIEVAL.md); this exists only for questions like "find
// near-duplicate documents at scale", which keyword matching cannot answer.
//
// FAILS OPEN. If the retrieval stack is unconfigured or unreachable, this
// returns 200 with `{ available: false }` rather than an error, so the atlas
// page can fall back to its client-side filter without the reader ever
// seeing a broken feature. The site works with no vector database at all;
// this only makes it smarter.
const COLLECTION = 'algonow_atlas';
const MODEL = 'voyage-context-4';
const RERANK_MODEL = 'rerank-2.5';

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=300' },
});

export default async function handler(request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') ?? '').trim();
  if (!q) return json(400, { error: 'q is required' });
  if (q.length > 300) return json(400, { error: 'q too long' });

  const { VOYAGE_API_KEY, QDRANT_URL, QDRANT_API_KEY } = process.env;
  if (!VOYAGE_API_KEY || !QDRANT_URL) {
    return json(200, { available: false, reason: 'retrieval not configured', results: [] });
  }

  const filter = { must: [] };
  const category = url.searchParams.get('category');
  const topic = url.searchParams.get('topic');
  const tier = url.searchParams.get('tier');
  if (category) filter.must.push({ key: 'category', match: { value: category } });
  if (topic) filter.must.push({ key: 'topic', match: { value: topic } });
  if (tier) filter.must.push({ key: 'tier', match: { value: Number(tier) } });

  try {
    const embed = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${VOYAGE_API_KEY}`,
      },
      body: JSON.stringify({ model: MODEL, input: [q], input_type: 'query' }),
    });
    if (!embed.ok) return json(200, { available: false, reason: 'embedding failed', results: [] });
    const vector = (await embed.json()).data[0].embedding;

    const search = await fetch(`${QDRANT_URL}/collections/${COLLECTION}/points/search`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'api-key': QDRANT_API_KEY ?? '' },
      body: JSON.stringify({
        vector,
        limit: 50,
        with_payload: true,
        ...(filter.must.length ? { filter } : {}),
      }),
    });
    if (!search.ok) return json(200, { available: false, reason: 'vector search failed', results: [] });
    const hits = (await search.json()).result ?? [];
    if (!hits.length) return json(200, { available: true, results: [] });

    // Rerank. Most of the ranking quality is won here; never skip it.
    let ordered = hits;
    const docs = hits.map((h) => {
      const p = h.payload ?? {};
      return [p.algorithm, p.heuristic, p.problem_label].filter(Boolean).join(' · ');
    });
    const rr = await fetch('https://api.voyageai.com/v1/rerank', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${VOYAGE_API_KEY}`,
      },
      body: JSON.stringify({ model: RERANK_MODEL, query: q, documents: docs, top_k: 12 }),
    });
    if (rr.ok) {
      const ranked = (await rr.json()).data ?? [];
      ordered = ranked.map((r) => hits[r.index]).filter(Boolean);
    } else {
      ordered = hits.slice(0, 12);
    }

    return json(200, {
      available: true,
      query: q,
      results: ordered.map((h) => ({
        algorithm: h.payload.algorithm,
        heuristic: h.payload.heuristic,
        problem: h.payload.problem_label,
        topic: h.payload.topic,
        category: h.payload.category,
        tier: h.payload.tier,
        rivals: (h.payload.rivals ?? []).slice(0, 4),
        url: h.payload.url,
      })),
    });
  } catch (err) {
    return json(200, { available: false, reason: 'retrieval unavailable', results: [] });
  }
}

export const config = { path: '/api/search' };
