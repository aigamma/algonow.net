// Invoked only by an explicit semantic search. Local catalog filtering stays local.
import { retrieveAtlas } from '../retrieval/atlas.mjs';

const json = (status, body) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
});

export default async function handler(request) {
  if (request.method !== 'GET') return json(405, { error: 'method_not_allowed' });
  const url = new URL(request.url);
  const args = { query: url.searchParams.get('q') ?? '' };
  for (const key of ['category', 'topic', 'tier']) {
    const value = url.searchParams.get(key);
    if (value) args[key] = key === 'tier' ? Number(value) : value;
  }
  try {
    const result = await retrieveAtlas(args, { env: key => Netlify.env.get(key) });
    return json(200, { available: true, query: result.args.query, ranking: result.config.ranking,
      results: result.selected.map(({ payload: p }) => ({ algorithm: p.algorithm, heuristic: p.heuristic,
        problem: p.problem_label, topic: p.topic, category: p.category, tier: p.tier,
        rivals: (p.rivals ?? []).slice(0, 4), url: p.url })) });
  } catch (error) {
    if (['invalid_query', 'invalid_filter', 'invalid_tier'].includes(error.message)) return json(400, { error: error.message });
    return json(200, { available: false, reason: 'Semantic search is temporarily unavailable. Local filtering remains available.', results: [] });
  }
}

export const config = { path: '/api/search' };
