import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildRecords } from '../scripts/embed-atlas.mjs';
import { batchesOf, generationOf, pointId } from '../scripts/atlas-ingest.mjs';
import { parseEmbeddings, retrieveAtlas, MODEL, DIM } from '../netlify/retrieval/atlas.mjs';

const vector = Array(DIM).fill(0.1);
const embedding = { model: MODEL, data: [{ index: 0, data: [{ index: 0, embedding: vector }] }], usage: { total_tokens: 12 } };
const env = key => ({ VOYAGE_API_KEY: 'test', QDRANT_URL: 'https://qdrant.example/', QDRANT_API_KEY: 'read-only-test' })[key];
const records = buildRecords();

test('all catalog entries map uniquely, with bounded embedding batches and content-sensitive generations', () => {
  assert.equal(records.length, JSON.parse(readFileSync('src/data/atlas-summary.json', 'utf8')).total);
  assert.equal(new Set(records.map(r => pointId(r.id))).size, records.length);
  assert.equal(batchesOf(records).flat().length, records.length);
  for (const batch of batchesOf(records)) assert.ok(batch.length <= 64 && batch.reduce((n, r) => n + Buffer.byteLength(r.text), 0) <= 28000);
  assert.notEqual(generationOf(records), generationOf([{ ...records[0], text: 'changed' }, ...records.slice(1)]));
});

test('contextualized response indexing is honored and malformed vectors rejected', () => {
  const other = Array(DIM).fill(0.2);
  const two = { ...embedding, data: [{ index: 1, data: [{ index: 0, embedding: other }] }, ...embedding.data] };
  assert.deepEqual(parseEmbeddings(two, 2), [vector, other]);
  assert.throws(() => parseEmbeddings({ ...two, data: [two.data[0], two.data[0]] }, 2), /invalid_embeddings/);
  assert.throws(() => parseEmbeddings({ ...embedding, data: [{ index: 0, data: [{ index: 0, embedding: [0.1] }] }] }, 1), /invalid_embedding_dimension/);
});

function mock(rerankFails = false) {
  const calls = [];
  const fetcher = async (url, options) => {
    const body = JSON.parse(options.body); calls.push({ url: String(url), body });
    if (String(url).endsWith('/contextualizedembeddings')) {
      assert.equal(body.input_type, 'query'); assert.equal(body.enable_auto_chunking, false);
      assert.deepEqual(body.inputs, [['nearest points']]);
      return Response.json(embedding);
    }
    if (String(url).endsWith('/points/search')) return Response.json({ status: 'ok', result: records.slice(0, 3).map((r, i) => ({
      id: pointId(r.id), score: 0.9 - i / 10, payload: { ...r.payload, text: r.text, entry_id: r.id, content_sha256: r.hash, generation: 'a'.repeat(64) },
    })) });
    if (rerankFails) return new Response('unavailable', { status: 503 });
    return Response.json({ data: [{ index: 2, relevance_score: 0.8 }, { index: 0, relevance_score: 0.6 }] });
  };
  return { fetcher, calls };
}

test('filtered retrieval preserves provider ordering and exact selected records', async () => {
  const { fetcher, calls } = mock();
  const result = await retrieveAtlas({ query: 'nearest points', top_k: 2, category: 'geometry', tier: 1 }, { env, fetcher });
  assert.equal(result.selected[0].id, pointId(records[2].id));
  assert.deepEqual(calls[1].body.filter.must, [{ key: 'category', match: { value: 'geometry' } }, { key: 'tier', match: { value: 1 } }]);
  assert.equal(result.config.ranking, 'rerank-2.5');
  assert.deepEqual(result.queryVector, vector);
});

test('rerank outage returns bounded dense results with explicit ranking state', async () => {
  const result = await retrieveAtlas({ query: 'nearest points', top_k: 2 }, { env, ...mock(true) });
  assert.equal(result.selected.length, 2); assert.equal(result.selected[0].id, pointId(records[0].id));
  assert.equal(result.config.ranking, 'dense'); assert.equal(result.config.rerank_status, 'unavailable');
});

test('invalid requests and unconfigured services make no external call', async () => {
  const fetcher = () => { throw new Error('unexpected_external_call'); };
  await assert.rejects(retrieveAtlas({ query: 'x', tier: 99 }, { env, fetcher }), /invalid_tier/);
  await assert.rejects(retrieveAtlas({ query: 'x' }, { env: () => '', fetcher }), /retrieval_not_configured/);
});
