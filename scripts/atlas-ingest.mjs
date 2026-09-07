// Explicit, bounded catalog ingestion with retained generations and atomic activation.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, open, readFile, writeFile, unlink } from 'node:fs/promises';
import { MODEL, DIM, ALIAS, embedTexts, requestJson } from '../netlify/retrieval/atlas.mjs';

const sha = value => createHash('sha256').update(value).digest('hex');
export const pointId = id => sha(id).slice(0, 32).replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');
export function generationOf(records) { return sha(JSON.stringify({ schema: 1, model: MODEL, dimension: DIM, records })); }
export function batchesOf(records) {
  const batches = []; let batch = [], size = 0;
  for (const record of records) {
    const bytes = Buffer.byteLength(record.text);
    if (bytes > 28000) throw new Error('record_exceeds_embedding_bound');
    if (batch.length && (batch.length === 64 || size + bytes > 28000)) { batches.push(batch); batch = []; size = 0; }
    batch.push(record); size += bytes;
  }
  if (batch.length) batches.push(batch);
  return batches;
}

export async function runIngestion(records, { argv = process.argv.slice(2), env = process.env, fetcher = fetch } = {}) {
  const generation = generationOf(records);
  const collection = `${ALIAS}_${generation.slice(0, 16)}`;
  const bytes = records.reduce((n, r) => n + Buffer.byteLength(r.text), 0);
  const option = (name, fallback) => argv.includes(name) ? Number(argv[argv.indexOf(name) + 1]) : fallback;
  const maxRecords = option('--max-records', 5000);
  const maxTokens = option('--max-tokens', 1500000);
  if (!Number.isSafeInteger(maxRecords) || !Number.isSafeInteger(maxTokens) || records.length > maxRecords || bytes + 128 * records.length > maxTokens) throw new Error('ingestion_budget_exceeded');
  await mkdir('build/embedding-cache', { recursive: true });
  await writeFile('build/atlas-records.json', JSON.stringify(records, null, 2) + '\n');
  console.log(JSON.stringify({ records: records.length, model: MODEL, dimension: DIM, generation, collection,
    textBytes: bytes, conservativeTokenBound: bytes + 128 * records.length, paid: argv.includes('--i-am-paying') }));
  for (const record of records.slice(0, Math.max(0, option('--sample', 0)))) console.log(JSON.stringify(record));
  if (!argv.includes('--i-am-paying')) return { generation, records: records.length, dryRun: true };
  if (!env.VOYAGE_API_KEY || !env.QDRANT_URL || !env.QDRANT_API_KEY) throw new Error('missing_ingestion_credentials');
  const base = new URL(env.QDRANT_URL);
  if (base.protocol !== 'https:' || base.pathname !== '/' || base.username || base.password) throw new Error('invalid_qdrant_url');
  const lock = await open('build/atlas-ingestion.lock', 'wx', 0o600);
  const startedAt = new Date().toISOString();
  const receiptPath = `build/ingestion-${startedAt.replace(/[-:.]/g, '')}.json`;
  const receipt = { schema: 'algonow-catalog-ingestion/v1', startedAt, generation, collection,
    sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    records: records.length, model: MODEL, dimension: DIM, maxTokens, embeddingsRequested: 0,
    embeddingTokens: 0, reused: 0, upserted: 0, verified: 0, attempts: [], outcome: 'started' };
  const save = () => writeFile(receiptPath, JSON.stringify(receipt, null, 2) + '\n');
  const qdrant = async (path, method = 'GET', body) => {
    const response = await requestJson(fetcher, new URL(path, base), { method, signal: AbortSignal.timeout(60000),
      headers: { 'content-type': 'application/json', 'api-key': env.QDRANT_API_KEY }, ...(body ? { body: JSON.stringify(body) } : {}) });
    if (response.status !== 'ok') throw new Error('qdrant_operation_failed');
    return response.result;
  };
  try {
    await lock.writeFile(JSON.stringify({ pid: process.pid, startedAt, generation }));
    await save();
    const existing = (await qdrant('collections')).collections;
    if (!existing.some(c => c.name === collection)) await qdrant(`collections/${collection}`, 'PUT', { vectors: { size: DIM, distance: 'Cosine', on_disk: true } });
    const info = await qdrant(`collections/${collection}`);
    if (info.config.params.vectors.size !== DIM || info.config.params.vectors.distance !== 'Cosine') throw new Error('collection_config_mismatch');
    for (const field of ['category', 'topic', 'tier', 'problem']) {
      await qdrant(`collections/${collection}/index?wait=true`, 'PUT', { field_name: field, field_schema: field === 'tier' ? 'integer' : 'keyword' });
    }
    const aliases = (await qdrant('aliases')).aliases;
    const previous = aliases.find(a => a.alias_name === ALIAS)?.collection_name;
    receipt.previousCollection = previous ?? null;
    const pools = [collection, ...(previous && previous !== collection ? [previous] : [])];
    for (const batch of batchesOf(records)) {
      const reusable = new Map();
      const retained = new Map();
      for (const pool of pools) {
        const points = await qdrant(`collections/${pool}/points`, 'POST', { ids: batch.map(r => pointId(r.id)), with_payload: true, with_vector: true });
        for (const point of points) {
          if (!reusable.has(point.id)) reusable.set(point.id, point);
          if (pool === collection) retained.set(point.id, point);
        }
      }
      const vectors = new Map();
      const pending = [];
      for (const record of batch) {
        const point = reusable.get(pointId(record.id));
        if (point?.payload?.content_sha256 === record.hash && point.payload.embedding_model === MODEL &&
            Array.isArray(point.vector) && point.vector.length === DIM && point.vector.every(Number.isFinite)) {
          vectors.set(record.id, point.vector); receipt.reused++; continue;
        }
        const cachePath = `build/embedding-cache/${MODEL}-${DIM}-${record.hash}.json`;
        try {
          const cache = JSON.parse(await readFile(cachePath, 'utf8'));
          if (cache.model !== MODEL || cache.textSha256 !== record.hash || !Array.isArray(cache.vector) || cache.vector.length !== DIM || !cache.vector.every(Number.isFinite)) throw new Error('invalid_embedding_cache');
          vectors.set(record.id, cache.vector); receipt.reused++;
        } catch (error) { if (error.code !== 'ENOENT') throw error; pending.push(record); }
      }
      if (pending.length) {
        const attempt = { count: pending.length, idsSha256: sha(JSON.stringify(pending.map(r => r.id))), startedAt: new Date().toISOString(), outcome: 'requested' };
        receipt.attempts.push(attempt); receipt.embeddingsRequested += pending.length; await save();
        // No automatic retry after an ambiguous metered outcome.
        const embedded = await embedTexts(pending.map(r => r.text), 'document', { key: env.VOYAGE_API_KEY, fetcher, signal: AbortSignal.timeout(60000) });
        receipt.embeddingTokens += embedded.totalTokens;
        for (const [index, record] of pending.entries()) {
          vectors.set(record.id, embedded.vectors[index]);
          await writeFile(`build/embedding-cache/${MODEL}-${DIM}-${record.hash}.json`, JSON.stringify({ model: MODEL, textSha256: record.hash, vector: embedded.vectors[index] }));
        }
        Object.assign(attempt, { outcome: 'received_and_cached', tokens: embedded.totalTokens, completedAt: new Date().toISOString() });
        await save();
        if (receipt.embeddingTokens > maxTokens) throw new Error('reported_token_budget_exceeded');
      }
      const points = batch.map(r => {
        const payload = JSON.parse(JSON.stringify({ ...r.payload, text: r.text, content_sha256: r.hash,
          entry_id: r.id, embedding_model: MODEL, generation }));
        const id = pointId(r.id);
        const existingPoint = retained.get(id);
        if (existingPoint && (!/^[0-9a-f]{40}$/.test(existingPoint.payload.catalog_commit || '') ||
            Object.keys(payload).some(k => JSON.stringify(existingPoint.payload[k]) !== JSON.stringify(payload[k])))) throw new Error('retained_generation_record_mismatch');
        return { id, vector: vectors.get(r.id), payload: { ...payload,
          catalog_commit: existingPoint?.payload.catalog_commit ?? receipt.sourceCommit } };
      });
      const missing = points.filter(p => !retained.has(p.id));
      if (missing.length) await qdrant(`collections/${collection}/points?wait=true`, 'PUT', { points: missing });
      const restored = await qdrant(`collections/${collection}/points`, 'POST', { ids: points.map(p => p.id), with_payload: true, with_vector: false });
      const expected = new Map(points.map(p => [p.id, p]));
      if (restored.length !== points.length || restored.some(p => {
        const want = expected.get(p.id)?.payload;
        return !want || Object.keys(want).some(k => JSON.stringify(p.payload[k]) !== JSON.stringify(want[k]));
      })) throw new Error('upsert_readback_failed');
      receipt.upserted += missing.length; receipt.verified += points.length; await save();
      console.log(JSON.stringify({ upserted: receipt.upserted, verified: receipt.verified, total: records.length, tokens: receipt.embeddingTokens, reused: receipt.reused }));
    }
    const count = await qdrant(`collections/${collection}/points/count`, 'POST', { exact: true });
    if (count.count !== records.length) throw new Error('generation_count_mismatch');
    const latestPrevious = (await qdrant('aliases')).aliases.find(a => a.alias_name === ALIAS)?.collection_name;
    if (latestPrevious !== previous) throw new Error('concurrent_catalog_activation');
    if (previous !== collection) await qdrant('collections/aliases', 'POST', { actions: [
      ...(previous ? [{ delete_alias: { alias_name: ALIAS } }] : []),
      { create_alias: { alias_name: ALIAS, collection_name: collection } },
    ] });
    const activated = (await qdrant('aliases')).aliases.find(a => a.alias_name === ALIAS)?.collection_name;
    if (activated !== collection) throw new Error('alias_readback_failed');
    Object.assign(receipt, { outcome: 'activated', completedAt: new Date().toISOString(), activeCollection: activated,
      retention: 'Previous collections retained. Removal from the new catalog takes effect by atomic alias activation.' });
    await save();
    await writeFile('build/CURRENT-CATALOG.json', JSON.stringify(receipt, null, 2) + '\n');
    return receipt;
  } catch (error) {
    receipt.outcome = 'failed'; receipt.failure = /^[a-z0-9_]+$/.test(error.message) ? error.message : 'local_or_service_failure';
    await save(); throw error;
  } finally { await lock.close(); await unlink('build/atlas-ingestion.lock'); }
}
