// Retrieval only. The ordinary search path has no provenance dependency.
export const MODEL = 'voyage-context-4';
export const DIM = 1024;
export const ALIAS = 'algonow_atlas';
export const RERANK_MODEL = 'rerank-2.5';

export function validateQuery(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      Object.keys(input).some(k => !['query', 'top_k', 'category', 'topic', 'tier'].includes(k))) throw new Error('invalid_arguments');
  const { query, top_k = 12, category, topic, tier } = input;
  if (typeof query !== 'string' || !query.trim() || query.length > 300 ||
      !Number.isInteger(top_k) || top_k < 1 || top_k > 12) throw new Error('invalid_query');
  for (const value of [category, topic]) if (value !== undefined && (typeof value !== 'string' || !/^[a-z][a-z0-9-]{0,63}$/.test(value))) throw new Error('invalid_filter');
  if (tier !== undefined && ![1, 2, 3].includes(tier)) throw new Error('invalid_tier');
  return { query: query.trim(), top_k, ...(category ? { category } : {}), ...(topic ? { topic } : {}), ...(tier ? { tier } : {}) };
}

export function parseEmbeddings(body, count) {
  if (body.model !== MODEL || !Array.isArray(body.data) || body.data.length !== count) throw new Error('invalid_embeddings');
  const vectors = new Array(count);
  for (const item of body.data) {
    if (!Number.isInteger(item.index) || item.index < 0 || item.index >= count || vectors[item.index] ||
        !Array.isArray(item.data) || item.data.length !== 1 || item.data[0].index !== 0) throw new Error('invalid_embeddings');
    const vector = item.data[0].embedding;
    if (!Array.isArray(vector) || vector.length !== DIM || vector.some(v => typeof v !== 'number' || !Number.isFinite(v))) throw new Error('invalid_embedding_dimension');
    vectors[item.index] = vector;
  }
  if (!Number.isSafeInteger(body.usage?.total_tokens) || body.usage.total_tokens < 0) throw new Error('invalid_embedding_usage');
  return vectors;
}

export async function requestJson(fetcher, url, options, maximum = 8 * 1024 * 1024) {
  const response = await fetcher(url, { ...options, redirect: 'error' });
  if (!response.ok) throw new Error('upstream_status_' + response.status);
  const reader = response.body.getReader();
  const parts = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximum) { await reader.cancel(); throw new Error('upstream_response_too_large'); }
      parts.push(value);
    }
  } finally { reader.releaseLock(); }
  return JSON.parse(Buffer.concat(parts).toString('utf8'));
}

export async function embedTexts(texts, inputType, { key, fetcher = fetch, signal }) {
  const body = await requestJson(fetcher, 'https://api.voyageai.com/v1/contextualizedembeddings', {
    method: 'POST', signal, headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: MODEL, inputs: texts.map(text => [text]), input_type: inputType,
      enable_auto_chunking: false, output_dimension: DIM, output_dtype: 'float' }),
  });
  return { vectors: parseEmbeddings(body, texts.length), totalTokens: body.usage.total_tokens };
}

export async function retrieveAtlas(input, { env, fetcher = fetch, signal = AbortSignal.timeout(25000) }) {
  const args = validateQuery(input);
  const key = env('VOYAGE_API_KEY');
  const qdrantUrl = env('QDRANT_URL');
  const qdrantKey = env('QDRANT_API_KEY');
  if (!key || !qdrantKey || !qdrantUrl) throw new Error('retrieval_not_configured');
  const base = new URL(qdrantUrl);
  if (base.protocol !== 'https:' || base.username || base.password || base.pathname !== '/') throw new Error('invalid_qdrant_url');
  const embedding = await embedTexts([args.query], 'query', { key, fetcher, signal });
  const filter = { must: Object.entries(args).filter(([k]) => ['category', 'topic', 'tier'].includes(k))
    .map(([key, value]) => ({ key, match: { value } })) };
  const searchBody = { vector: embedding.vectors[0], limit: 50, with_payload: true,
    ...(filter.must.length ? { filter } : {}) };
  const search = await requestJson(fetcher, new URL(`collections/${ALIAS}/points/search`, base), {
    method: 'POST', signal, headers: { 'content-type': 'application/json', 'api-key': qdrantKey }, body: JSON.stringify(searchBody),
  });
  if (search.status !== 'ok' || !Array.isArray(search.result) || search.result.length > 50) throw new Error('invalid_vector_results');
  const candidates = search.result;
  for (const hit of candidates) {
    const p = hit.payload;
    if (!p || typeof p.text !== 'string' || !p.text || typeof p.entry_id !== 'string' ||
        !/^[0-9a-f]{64}$/.test(p.generation || '') || !/^[0-9a-f]{64}$/.test(p.content_sha256 || '') ||
        !/^\/algo\/[a-z0-9-]+\/$/.test(p.url || '') || typeof hit.score !== 'number' || !Number.isFinite(hit.score)) throw new Error('invalid_catalog_record');
  }
  if (new Set(candidates.map(h => h.payload.generation)).size > 1) throw new Error('mixed_catalog_generations');
  let selected = candidates.slice(0, args.top_k);
  let ranking = 'dense';
  let rerankStatus = candidates.length ? 'unavailable' : 'not_needed';
  if (candidates.length) {
    try {
      const ranked = await requestJson(fetcher, 'https://api.voyageai.com/v1/rerank', {
        method: 'POST', signal, headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: RERANK_MODEL, query: args.query, documents: candidates.map(h => h.payload.text), top_k: args.top_k }),
      });
      if (!Array.isArray(ranked.data) || ranked.data.length !== Math.min(args.top_k, candidates.length) ||
          new Set(ranked.data.map(r => r.index)).size !== ranked.data.length ||
          ranked.data.some(r => !Number.isInteger(r.index) || !candidates[r.index] || !Number.isFinite(r.relevance_score))) throw new Error('invalid_rerank_results');
      selected = ranked.data.map(r => ({ ...candidates[r.index], rerank_score: r.relevance_score }));
      ranking = RERANK_MODEL;
      rerankStatus = 'applied';
    } catch {
      if (signal.aborted) throw new Error('retrieval_deadline');
      // Usable dense results are explicitly identified when reranking fails.
    }
  }
  return { args, selected, candidates, queryVector: embedding.vectors[0],
    generation: candidates[0]?.payload.generation ?? null,
    config: { backend: 'qdrant', collection_alias: ALIAS, embedding_model: MODEL, dimension: DIM,
      input_type: 'query', metric: 'Cosine', candidate_k: 50, top_k: args.top_k,
      filter, ranking, rerank_status: rerankStatus, embedding_tokens: embedding.totalTokens } };
}
