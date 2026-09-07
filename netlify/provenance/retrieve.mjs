// Source hashing and evidence assembly execute only on explicit interrogation.
import { retrieveAtlas, validateQuery } from '../retrieval/atlas.mjs';
import { sha256 } from './runtime/capture.mjs';

export function validateArguments(args) {
  validateQuery(args);
  if (!Number.isInteger(args.top_k) || args.query !== args.query.trim()) throw new Error('invalid_retrieval_arguments');
  return args;
}

export async function retrieve(args, { env, fetcher = fetch, query = retrieveAtlas } = {}) {
  validateArguments(args);
  const started = performance.now();
  const output = await query(args, { env, fetcher });
  const records = output.selected.map(hit => {
    const p = hit.payload;
    if (sha256(p.text) !== p.content_sha256) throw new Error('catalog_content_hash_mismatch');
    return { sourceId: p.entry_id, sourceVersion: p.generation,
      sourceScope: 'returned-qdrant-point-json', sourceBytes: JSON.stringify(hit), mediaType: 'application/json',
      originalDocumentSha256: p.source_file_sha256,
      hit: { ...p, qdrant_id: String(hit.id), dense_score: hit.score, rerank_score: hit.rerank_score ?? null,
        citation_locator: 'https://algonow.net' + p.url } };
  });
  return { records,
    generation: { catalog_sha256: output.generation, alias: 'algonow_atlas',
      collection: output.generation ? 'algonow_atlas_' + output.generation.slice(0, 16) : null,
      selected_records_retained: true, generation_retention: 'until-explicit-owner-retirement' },
    configuration: { ...output.config, query_vector: output.queryVector,
      candidate_records: output.candidates, rerank_input: 'payload.text',
      source_digest_semantics: 'Original topic-file digest is an ingestion declaration; selected point JSON is retained and hashed at capture.' },
    access: { classification: 'authenticated-owner-service', source: 'public-authored-algorithm-catalog',
      generation_performed: false, corpus_scope: 'catalog-index-records-not-full-lessons' },
    timingsUs: { atlas_retrieval: Math.round((performance.now() - started) * 1000) } };
}
