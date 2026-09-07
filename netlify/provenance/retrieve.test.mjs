import test from 'node:test';
import assert from 'node:assert/strict';
import { retrieve } from './retrieve.mjs';
import { sha256 } from './runtime/capture.mjs';

const args = { query: 'Find nearest points', top_k: 1 };
function fixture(text = 'Nearest neighbor index') {
  const hit = { id: 'point-1', score: 0.9, rerank_score: 0.7, payload: { entry_id: 'entry-1', text,
    content_sha256: sha256('Nearest neighbor index'), generation: 'a'.repeat(64),
    source_file_sha256: 'b'.repeat(64), url: '/algo/nearest-neighbor/' } };
  return { selected: [hit], candidates: [hit], generation: 'a'.repeat(64), queryVector: [0.5], config: {} };
}
test('capture retains exact point bytes and catalog generation', async () => {
  const source = fixture();
  const result = await retrieve(args, { query: async () => source });
  assert.deepEqual(JSON.parse(result.records[0].sourceBytes), source.selected[0]);
  assert.equal(result.generation.catalog_sha256, 'a'.repeat(64));
  assert.equal(result.records[0].originalDocumentSha256, 'b'.repeat(64));
  assert.deepEqual(result.configuration.candidate_records, source.candidates);
});
test('changed source text is rejected at the capture boundary', async () => {
  await assert.rejects(retrieve(args, { query: async () => fixture('changed') }), /catalog_content_hash_mismatch/);
});
