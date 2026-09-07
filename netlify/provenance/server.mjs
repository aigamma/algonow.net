import { getStore, getDeployStore } from '@netlify/blobs';
import { pathToFileURL } from 'node:url';
import { join, sep } from 'node:path';
import { loadCore } from './runtime/core-loader.mjs';
import { privateKeyFromSeed, sealNode } from './runtime/identity.mjs';
import { captureRetrieval, retainCapture } from './runtime/capture.mjs';
import { verifyResponse } from './runtime/consumer.mjs';
import { authorizeBearer, handleMcp, jsonResponse, readBoundedJson } from './runtime/http.mjs';
import { retrieve, validateArguments } from './retrieve.mjs';

const NAMESPACE = '/algonow';
const ADAPTER_VERSION = 'algonow-provenance/1.0.0';
const CAPTURE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function publicTrust(env) {
  const parsed = JSON.parse(env('PROV_TRUST_JSON') || 'null');
  if (!parsed || !Array.isArray(parsed.anchors) || parsed.anchors.length !== 1 ||
      parsed.anchors[0].name !== NAMESPACE || !Array.isArray(parsed.certs) || !Array.isArray(parsed.revocations)) throw new Error('trust_not_configured');
  return { anchors: parsed.anchors, certs: parsed.certs, revocations: parsed.revocations };
}

async function runtime(env) {
  const core = await loadCore(pathToFileURL(join(process.cwd(), 'netlify/provenance/runtime/core') + sep));
  const publicMaterial = publicTrust(env);
  const leaf = privateKeyFromSeed(env('PROV_LEAF_SEED'));
  const now = Math.floor(Date.now() / 1000);
  if (publicMaterial.revocations.length !== 1 || publicMaterial.revocations[0].not_after - publicMaterial.revocations[0].issued_at > 86400 ||
      publicMaterial.revocations[0].issued_at > now || publicMaterial.revocations[0].not_after <= now) throw new Error('revocation_not_fresh');
  const probe = sealNode(core, leaf, NAMESPACE, { kind: 'entity', name: `${NAMESPACE}/readiness`, attributes: {}, links: [] });
  core.authorize_revocable(JSON.stringify(probe), JSON.stringify(publicMaterial.certs), JSON.stringify(publicMaterial.anchors), JSON.stringify(publicMaterial.revocations), now);
  return { core, publicMaterial, leaf };
}

function captureStore(context) {
  const options = { name: 'codexproof-captures-v1', consistency: 'strong' };
  return context.deploy?.context === 'production' ? getStore(options) : getDeployStore(options);
}

export async function serve(request, context, dependencies = {}) {
  const env = dependencies.env || (key => Netlify.env.get(key));
  const path = new URL(request.url).pathname;
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return jsonResponse({ error: 'origin_not_allowed' }, 403);
  try {
    if (path === '/api/provenance/trust' && request.method === 'GET') {
      return jsonResponse({ namespace: NAMESPACE, adapter_version: ADAPTER_VERSION, ...publicTrust(env) });
    }
    if (!authorizeBearer(request, env('PROV_ACCESS_TOKEN'))) return jsonResponse({ error: 'unauthorized' }, 401);
    const call = async (name, input) => {
      const state = await (dependencies.runtime || runtime)(env);
      const store = dependencies.store || captureStore(context);
      if (name === 'provenance_get_capture') {
        if (!input || Object.keys(input).some(k => k !== 'capture_id') || !CAPTURE_ID.test(input.capture_id)) throw new Error('invalid_capture_id');
        const bytes = await store.get(`captures/${input.capture_id}`);
        if (!bytes) throw new Error('capture_not_found');
        const wrapper = JSON.parse(bytes);
        if (wrapper.capture_id !== input.capture_id) throw new Error('archive_binding_failed');
        wrapper.envelope = { ...state.publicMaterial, bundle: wrapper.envelope.bundle };
        const root = wrapper.envelope.bundle.find(n => n.cid === wrapper.root_cid);
        const req = wrapper.envelope.bundle.find(n => n.cid === root?.node.attributes.request_cid);
        verifyResponse(state.core, wrapper, { namespace: NAMESPACE, requestId: wrapper.request_id,
          operation: 'retrieve', args: req?.node.attributes.arguments }, { anchors: state.publicMaterial.anchors });
        return wrapper;
      }
      if (name !== 'provenance_retrieve' || !input || Object.keys(input).some(k => !['request_id', 'arguments'].includes(k))) throw new Error('invalid_tool_arguments');
      if (typeof input.request_id !== 'string' || !/^[A-Za-z0-9._:-]{1,128}$/.test(input.request_id)) throw new Error('invalid_request_id');
      const args = validateArguments(input.arguments);
      const applicationCommit = env('PROV_APPLICATION_COMMIT');
      if (!/^[0-9a-f]{40}$/.test(applicationCommit || '')) throw new Error('application_commit_not_configured');
      const retrieval = await (dependencies.retrieve || retrieve)(args, { env });
      const wrapper = captureRetrieval({ ...state, namespace: NAMESPACE, requestId: input.request_id,
        args, retrieval, applicationCommit, adapterVersion: ADAPTER_VERSION });
      await retainCapture(store, wrapper);
      return wrapper;
    };
    if (path === '/mcp/provenance') return handleMcp(request, {
      name: 'algonow-provenance', tools: toolDefinitions(), call,
    });
    if (path === '/api/provenance' && request.method === 'POST') return jsonResponse(await call('provenance_retrieve', await readBoundedJson(request)));
    const match = path.match(/^\/api\/provenance\/captures\/([^/]+)$/);
    if (match && request.method === 'GET') return jsonResponse(await call('provenance_get_capture', { capture_id: match[1] }));
    return jsonResponse({ error: 'not_found' }, 404);
  } catch (failure) {
    const code = /^[a-z][a-z0-9_]{1,80}$/.test(failure?.message) ? failure.message : 'provenance_operation_failed';
    return jsonResponse({ error: code }, code.startsWith('invalid_') ? 400 : 503);
  }
}

function toolDefinitions() {
  return [{
    name: 'provenance_retrieve', description: 'Retrieve existing algorithm catalog records and retain a signed evidence graph. Requires the preconfigured service credential.',
    inputSchema: { type: 'object', additionalProperties: false, required: ['request_id', 'arguments'], properties: {
      request_id: { type: 'string', pattern: '^[A-Za-z0-9._:-]{1,128}$' },
      arguments: { type: 'object', additionalProperties: false, required: ['query', 'top_k'], properties: {
        query: { type: 'string', minLength: 1, maxLength: 300 },
        category: { type: 'string' }, topic: { type: 'string' }, tier: { type: 'integer', minimum: 1, maximum: 3 },
        top_k: { type: 'integer', minimum: 1, maximum: 12 },
      } },
    } }, annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  }, {
    name: 'provenance_get_capture', description: 'Read a retained signed capture with current public revocation material. Does not repeat retrieval.',
    inputSchema: { type: 'object', additionalProperties: false, required: ['capture_id'], properties: { capture_id: { type: 'string', format: 'uuid' } } },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }];
}
