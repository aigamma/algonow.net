// Keyless consumer checks over the frozen core. No producer secrets or vendor calls.
import { isDeepStrictEqual } from 'node:util';

export const CONTRACT = 'codexproof-interrogation/v1';
const CID = /^b3-[0-9a-f]{64}$/;
const KEY = /^ed25519:[0-9a-f]{64}$/;
const SIGNATURE = /^[0-9a-f]{128}$/;

function check(condition, message) {
  if (!condition) throw new Error(message);
}

export function verifyResponse(core, wrapper, expected, policy) {
  const { anchors, now = Math.floor(Date.now() / 1000), highWater = new Map(), maxNodes = 1024, maxBytes = 3 * 1024 * 1024, maxListAge = 86400 } = policy ?? {};
  check(Number.isSafeInteger(now) && now >= 0, 'invalid_clock');
  check(Number.isSafeInteger(maxNodes) && maxNodes > 0 && Number.isSafeInteger(maxBytes) && maxBytes > 0, 'invalid_limits');
  check(Number.isSafeInteger(maxListAge) && maxListAge > 0, 'invalid_revocation_policy');
  check(Array.isArray(anchors) && anchors.length > 0, 'missing_pinned_anchors');
  check(expected && typeof expected.requestId === 'string' && expected.requestId.length > 0 && typeof expected.operation === 'string' && Object.hasOwn(expected, 'args'), 'missing_expected_request');
  check(typeof expected.namespace === 'string' && /^\/[a-z][a-z0-9-]*$/.test(expected.namespace), 'invalid_expected_namespace');
  check(anchors.every(a => typeof a.name === 'string' && /^\/[a-z][a-z0-9-]*$/.test(a.name) && KEY.test(a.key)), 'invalid_anchor_policy');
  check(new Set(anchors.map(a => a.name)).size === anchors.length && new Set(anchors.map(a => a.key)).size === anchors.length, 'ambiguous_anchor_policy');
  check(wrapper?.contract === CONTRACT, 'wrong_contract');
  check(Buffer.byteLength(JSON.stringify(wrapper)) <= maxBytes, 'response_too_large');
  const env = wrapper.envelope;
  check(Array.isArray(env?.bundle) && env.bundle.length > 0 && env.bundle.length <= maxNodes, 'invalid_bundle');
  check(Array.isArray(env.certs) && env.certs.length <= maxNodes && Array.isArray(env.revocations) && env.revocations.length <= anchors.length, 'invalid_trust_material');
  check(Array.isArray(env.anchors) && env.anchors.length <= anchors.length && env.anchors.every(a => anchors.some(p => isDeepStrictEqual(a, p))), 'unaccepted_anchor');
  const nodes = new Map();
  for (const sn of env.bundle) {
    check(CID.test(sn.cid) && KEY.test(sn.signer) && SIGNATURE.test(sn.sig), 'invalid_node_encoding');
    check(!nodes.has(sn.cid), 'duplicate_cid');
    check(sn.node && typeof sn.node.name === 'string' && Array.isArray(sn.node.links ?? []), 'invalid_node');
    check(Object.keys(sn.node).every(key => ['kind', 'name', 'attributes', 'links'].includes(key)), 'unknown_node_field');
    nodes.set(sn.cid, sn);
  }
  const root = nodes.get(wrapper.root_cid);
  const attr = root?.node.attributes;
  check(root?.node.kind === 'entity' && attr?.capture_contract === 'codexproof-spoke/v1', 'missing_result_root');
  check(root.node.name.startsWith(expected.namespace + '/') && attr.producer_id === expected.namespace, 'wrong_producer');
  check(attr.request_id === expected.requestId && wrapper.request_id === attr.request_id && typeof attr.capture_id === 'string' && attr.capture_id.length > 0 && wrapper.capture_id === attr.capture_id, 'request_binding_failed');
  check(attr.operation === expected.operation && Object.hasOwn(attr, 'result'), 'operation_binding_failed');
  const visited = new Set();
  const pending = [root.cid];
  while (pending.length) {
    const cid = pending.pop();
    if (visited.has(cid)) continue;
    const sn = nodes.get(cid);
    check(Boolean(sn), 'missing_parent');
    visited.add(cid);
    for (const link of sn.node.links ?? []) {
      check(CID.test(link.target), 'invalid_parent');
      pending.push(link.target);
    }
  }
  check(visited.size === nodes.size, 'disconnected_evidence');
  const request = nodes.get(attr.request_cid);
  check(request?.node.kind === 'entity' && request.node.attributes?.request_id === expected.requestId && request.node.attributes?.operation === expected.operation && isDeepStrictEqual(request.node.attributes?.arguments, expected.args), 'arguments_binding_failed');
  check(Array.isArray(attr.ordered_hit_cids) && attr.ordered_hit_cids.every(cid => nodes.has(cid)), 'missing_ordered_evidence');
  if (Object.hasOwn(wrapper, 'result')) check(isDeepStrictEqual(wrapper.result, attr.result), 'outer_result_substitution');

  check(core.verify_bundle_json(JSON.stringify(env.bundle)), 'integrity_signature_or_closure_failed');
  const used = new Map();
  for (const sn of env.bundle) {
    const name = core.authorize(JSON.stringify(sn), JSON.stringify(env.certs), JSON.stringify(anchors));
    const anchor = anchors.find(a => a.name === name);
    check(Boolean(anchor), 'unaccepted_authorizing_anchor');
    used.set(name, anchor);
  }
  const nextVersions = new Map();
  for (const anchor of used.values()) {
    const lists = env.revocations.filter(r => r.anchor === anchor.name && r.issuer === anchor.key);
    check(lists.length === 1, 'missing_or_ambiguous_revocation');
    const list = lists[0];
    const stateKey = `${anchor.name}|${anchor.key}`;
    check(Number.isSafeInteger(list.version) && list.version >= 0 && list.version >= (highWater.get(stateKey) ?? 0), 'revocation_rollback');
    check(Number.isSafeInteger(list.issued_at) && Number.isSafeInteger(list.not_after) && list.issued_at >= 0 && list.issued_at <= now && now < list.not_after && list.not_after > list.issued_at && list.not_after - list.issued_at <= maxListAge, 'revocation_freshness');
    nextVersions.set(stateKey, list.version);
  }
  for (const sn of env.bundle) {
    core.authorize_revocable(JSON.stringify(sn), JSON.stringify(env.certs), JSON.stringify(anchors), JSON.stringify(env.revocations), now);
  }
  // No unverified or unused list may poison persistent rollback state.
  for (const [key, version] of nextVersions) highWater.set(key, version);
  return { result: attr.result, root, usedAnchors: [...used.keys()], nodeCount: nodes.size };
}
