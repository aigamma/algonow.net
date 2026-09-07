// Operator/producer-only code. Never import into the deployed keyless hub.
import { createPrivateKey, createPublicKey, randomBytes, sign } from 'node:crypto';

const SEED_HEADER = Buffer.from('302e020100300506032b657004220420', 'hex');
const NODE_DOMAIN = Buffer.from('prov-sig:v1\n');
const CERT_DOMAIN = Buffer.from('prov-cert:v1\n');
const LIST_DOMAIN = Buffer.from('prov-revlist:v1\n');

export function namespaceName(value) {
  if (typeof value !== 'string' || !/^\/[a-z][a-z0-9-]*$/.test(value)) throw new Error('invalid_namespace');
  return value;
}

export function privateKeyFromSeed(seedHex) {
  if (typeof seedHex !== 'string' || !/^[0-9a-f]{64}$/i.test(seedHex)) throw new Error('invalid_leaf_seed');
  return createPrivateKey({ key: Buffer.concat([SEED_HEADER, Buffer.from(seedHex, 'hex')]), format: 'der', type: 'pkcs8' });
}

export function publicIdentity(key) {
  return 'ed25519:' + createPublicKey(key).export({ format: 'der', type: 'spki' }).subarray(-32).toString('hex');
}

function idBytes(value, prefix, bytes) {
  if (typeof value !== 'string' || !value.startsWith(prefix) || !new RegExp(`^[0-9a-f]{${bytes * 2}}$`).test(value.slice(prefix.length))) throw new Error('invalid_identifier');
  return Buffer.from(value.slice(prefix.length), 'hex');
}

function uint64(value) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('invalid_integer');
  const out = Buffer.alloc(8);
  out.writeBigUInt64LE(BigInt(value));
  return out;
}

function namedBytes(name) {
  const bytes = Buffer.from(name, 'utf8');
  return [uint64(bytes.length), bytes];
}

export function issueCertificate(anchorKey, namespace, leafIdentity, leafName = `${namespace}/signer/v1`) {
  namespaceName(namespace);
  if (typeof leafName !== 'string' || !leafName.startsWith(namespace + '/') ||
      !leafName.slice(1).split('/').every(part => /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(part))) throw new Error('invalid_leaf_name');
  const subject = { name: leafName, key: leafIdentity };
  const message = Buffer.concat([CERT_DOMAIN, ...namedBytes(leafName), idBytes(leafIdentity, 'ed25519:', 32)]);
  return { subject, issuer: publicIdentity(anchorKey), sig: sign(null, message, anchorKey).toString('hex') };
}

export function issueRevocationList(anchorKey, { namespace, version, issuedAt, notAfter, revokedCids = [], revokedKeys = [] }) {
  namespaceName(namespace);
  if (!Number.isSafeInteger(issuedAt) || !Number.isSafeInteger(notAfter) || issuedAt < 0 || notAfter <= issuedAt) throw new Error('invalid_revocation_window');
  const cids = [...new Set(revokedCids)].sort();
  const keys = [...new Set(revokedKeys)].sort();
  const message = Buffer.concat([
    LIST_DOMAIN, ...namedBytes(namespace), uint64(version), uint64(issuedAt), uint64(notAfter),
    uint64(cids.length), ...cids.map(cid => idBytes(cid, 'b3-', 32)),
    uint64(keys.length), ...keys.map(key => idBytes(key, 'ed25519:', 32)),
  ]);
  return {
    anchor: namespace, version, issued_at: issuedAt, not_after: notAfter,
    revoked_cids: cids, revoked_keys: keys, issuer: publicIdentity(anchorKey),
    sig: sign(null, message, anchorKey).toString('hex'),
  };
}

// Returns secrets only to the administrative caller. It performs no output or I/O.
export function generateIdentity(namespace, now, validitySeconds = 86400) {
  namespaceName(namespace);
  if (!Number.isSafeInteger(validitySeconds) || validitySeconds <= 0) throw new Error('invalid_validity');
  const anchorSeed = randomBytes(32).toString('hex');
  const leafSeed = randomBytes(32).toString('hex');
  const anchorKey = privateKeyFromSeed(anchorSeed);
  const leafKey = privateKeyFromSeed(leafSeed);
  return {
    secrets: { anchorSeed, leafSeed },
    publicMaterial: {
      anchors: [{ name: namespace, key: publicIdentity(anchorKey) }],
      certs: [issueCertificate(anchorKey, namespace, publicIdentity(leafKey))],
      revocations: [issueRevocationList(anchorKey, { namespace, version: 1, issuedAt: now, notAfter: now + validitySeconds })],
    },
  };
}

export function sealNode(core, leafKey, namespace, node) {
  namespaceName(namespace);
  if (typeof node?.name !== 'string' || !node.name.startsWith(namespace + '/')) throw new Error('wrong_namespace');
  if (!Object.keys(node).every(key => ['kind', 'name', 'attributes', 'links'].includes(key))) throw new Error('unknown_node_field');
  const serialized = JSON.stringify(node);
  const snapshot = JSON.parse(serialized);
  const cid = core.cid(serialized);
  const message = Buffer.concat([NODE_DOMAIN, idBytes(cid, 'b3-', 32)]);
  return { node: snapshot, cid, signer: publicIdentity(leafKey), sig: sign(null, message, leafKey).toString('hex') };
}
