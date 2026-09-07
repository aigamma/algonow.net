import assert from 'node:assert/strict';
import test from 'node:test';
import { serve } from './server.mjs';
import { loadCore } from './runtime/core-loader.mjs';
import { generateIdentity, privateKeyFromSeed } from './runtime/identity.mjs';
import { verifyResponse } from './runtime/consumer.mjs';

const core = await loadCore();
const identity = generateIdentity('/algonow', Math.floor(Date.now() / 1000));
const token = 'offline-test-credential-'.repeat(3);
const args = { query: 'What is knowledge?', top_k: 2 };
const saved = new Map();
let vendorCalls = 0;
const env = key => ({ PROV_ACCESS_TOKEN: token, PROV_TRUST_JSON: JSON.stringify(identity.publicMaterial),
  PROV_APPLICATION_COMMIT: '2'.repeat(40) })[key];
const deps = { env, runtime: async () => ({ core, leaf: privateKeyFromSeed(identity.secrets.leafSeed), publicMaterial: identity.publicMaterial }),
  store: { get: async key => saved.get(key) ?? null, set: async (key, bytes) => saved.set(key, bytes) },
  retrieve: async () => { vendorCalls++; return { records: [], configuration: { backend: 'offline-fixture' },
    generation: { provider_snapshot: 'offline-only' }, access: { classification: 'test' }, timingsUs: {} }; } };
function request(path, body, authorized = true, extra = {}) {
  return new Request('https://algonow.com' + path, { method: body ? 'POST' : 'GET',
    headers: { ...(authorized ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}), ...extra },
    ...(body ? { body: JSON.stringify(body) } : {}) });
}
test('unauthorized and cross-origin requests perform no retrieval', async () => {
  const before = vendorCalls;
  assert.equal((await serve(request('/api/provenance', { request_id: 'x', arguments: args }, false), {}, deps)).status, 401);
  assert.equal((await serve(request('/api/provenance', {}, true, { Origin: 'https://foreign.example' }), {}, deps)).status, 403);
  assert.equal(vendorCalls, before);
});
test('public trust disclosure needs no signer initialization', async () => {
  const result = await serve(request('/api/provenance/trust', null, false), {}, { env, runtime: () => { throw Error('must_not_run'); } });
  assert.equal(result.status, 200);
  assert.deepEqual((await result.json()).anchors, identity.publicMaterial.anchors);
});
test('invalid arguments are rejected before vendor calls', async () => {
  const before = vendorCalls;
  assert.equal((await serve(request('/api/provenance', { request_id: 'x', arguments: { ...args, top_k: 999 } }), {}, deps)).status, 400);
  assert.equal(vendorCalls, before);
});
test('HTTPS capture and MCP archive read preserve the same signed root', async () => {
  const response = await serve(request('/api/provenance', { request_id: 'test-https', arguments: args }), {}, deps);
  assert.equal(response.status, 200);
  const capture = await response.json();
  verifyResponse(core, capture, { namespace: '/algonow', requestId: 'test-https', operation: 'retrieve', args }, { anchors: identity.publicMaterial.anchors });
  const before = vendorCalls;
  const mcp = await serve(request('/mcp/provenance', { jsonrpc: '2.0', id: 1, method: 'tools/call',
    params: { name: 'provenance_get_capture', arguments: { capture_id: capture.capture_id } } }, true,
    { Accept: 'application/json, text/event-stream', 'MCP-Protocol-Version': '2025-06-18' }), {}, deps);
  const result = (await mcp.json()).result;
  assert.equal(result.structuredContent.root_cid, capture.root_cid);
  assert.equal(JSON.parse(result.content[0].text).root_cid, capture.root_cid);
  assert.equal(vendorCalls, before);
});
