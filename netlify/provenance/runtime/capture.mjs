// Called only inside an explicitly authenticated provenance operation.
import { createHash, randomUUID } from 'node:crypto';
import { sealNode } from './identity.mjs';
import { verifyResponse, CONTRACT } from './consumer.mjs';

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

// Canonical attributes support integers; upstream decimal numbers are preserved
// in source_bytes_utf8 and represented as decimal strings in the typed result.
export function typed(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return Number.isSafeInteger(value) ? value : String(value);
  if (Array.isArray(value)) return value.map(typed);
  if (value && Object.getPrototypeOf(value) === Object.prototype) return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, typed(v)]));
  throw new Error('unsupported_capture_value');
}

export function captureRetrieval({ core, leaf, namespace, publicMaterial, requestId, args,
  retrieval, applicationCommit, adapterVersion, now = Date.now(), captureId = randomUUID() }) {
  if (!/^[0-9a-f-]{36}$/.test(captureId)) throw new Error('invalid_capture_id');
  if (typeof requestId !== 'string' || !/^[A-Za-z0-9._:-]{1,128}$/.test(requestId)) throw new Error('invalid_request_id');
  if (!/^[0-9a-f]{40}$/.test(applicationCommit)) throw new Error('missing_application_commit');
  const bundle = [];
  const add = (kind, role, attributes, links = []) => {
    const signed = sealNode(core, leaf, namespace, {
      kind, name: `${namespace}/${role}/${captureId}`, attributes: typed(attributes), links,
    });
    bundle.push(signed);
    return signed.cid;
  };
  const link = (rel, target) => ({ rel, target });
  const request = add('entity', 'requests', { request_id: requestId, operation: 'retrieve', arguments: args });
  const configuration = add('entity', 'configurations', {
    application_commit: applicationCommit, adapter_version: adapterVersion,
    configuration: retrieval.configuration, corpus_generation: retrieval.generation,
    access: retrieval.access, captured_at: new Date(now).toISOString(),
  });
  const hits = [];
  const sourceCids = [];
  const ordered = retrieval.records.map((record, index) => {
    if (typeof record.sourceBytes !== 'string' || typeof record.hit?.text !== 'string') throw new Error('missing_source_bytes');
    const source = add('entity', `sources/${index}`, {
      source_id: record.sourceId, source_version: record.sourceVersion,
      source_scope: record.sourceScope, source_media_type: record.mediaType,
      source_bytes_sha256: sha256(record.sourceBytes), source_bytes_utf8: record.sourceBytes,
      original_document_sha256: record.originalDocumentSha256 ?? null,
    });
    sourceCids.push(source);
    const hit = typed(record.hit);
    hits.push(hit);
    return add('entity', `passages/${index}`, {
      ...hit, passage_sha256: sha256(hit.text), source_cid: source,
    }, [link('wasDerivedFrom', source)]);
  });
  const selectedGeneration = add('entity', 'selected-generations', {
    scope: 'selected-records-only', source_cids: sourceCids,
    provider_generation: retrieval.generation,
    selection_is_complete_corpus_snapshot: false,
  });
  const activity = add('activity', 'retrievals', {
    timings_us: retrieval.timingsUs, outcome: hits.length ? 'hits' : 'empty',
  }, [request, configuration, selectedGeneration, ...ordered].map(cid => link('used', cid)));
  const result = {
    hits, returned_count: hits.length, requested_top_k: args.top_k,
    has_more: false, completion: 'complete-top-k-query',
    completeness_claim: 'top-k-output-only',
  };
  const root = add('entity', 'results', {
    capture_contract: 'codexproof-spoke/v1', request_id: requestId, capture_id: captureId,
    producer_id: namespace, operation: 'retrieve', capture_mode: 'jit', captured_at: new Date(now).toISOString(),
    outcome: hits.length ? 'hits' : 'empty', request_cid: request, result,
    ordered_hit_cids: ordered, supplied_context: null, generation_performed: false,
    application_commit: applicationCommit, adapter_version: adapterVersion,
    corpus_generation: retrieval.generation, generation_manifest_cid: selectedGeneration,
    retrieval_configuration: retrieval.configuration, effective_access: retrieval.access,
    archive: { capture_id: captureId, retention: 'until-explicit-owner-retirement',
      access: 'authenticated-provenance-service', storage_guarantee: 'retained-with-readback-and-digest-check' },
  }, [link('wasGeneratedBy', activity), ...ordered.map(cid => link('wasDerivedFrom', cid))]);
  const wrapper = { contract: CONTRACT, request_id: requestId, capture_id: captureId,
    root_cid: root, envelope: { ...publicMaterial, bundle } };
  verifyResponse(core, wrapper, { namespace, requestId, operation: 'retrieve', args }, {
    anchors: publicMaterial.anchors, now: Math.floor(now / 1000),
  });
  return wrapper;
}

export async function retainCapture(store, wrapper) {
  const bytes = JSON.stringify(wrapper);
  const key = `captures/${wrapper.capture_id}`;
  if (await store.get(key) !== null) throw new Error('capture_id_collision');
  await store.set(key, bytes);
  const restored = await store.get(key);
  if (restored !== bytes) throw new Error('capture_archive_readback_failed');
  return { sha256: sha256(bytes), bytes: Buffer.byteLength(bytes) };
}
