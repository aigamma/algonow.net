import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CACHE_CONTROL,
  CONTENT_TYPE,
  DEFAULT_RECEIPT_PATH,
  EXPECTED_DOMAIN_NAME,
  PILOT_SLUG,
  ROOT,
  TRACK_IDS,
  assert,
  assertPublicManifest,
  buildPilotPlan,
  loadPublicationReceipt,
  loadPublicManifest,
  normalizePublicationTarget,
  sha256,
} from './release-contract.mjs';

const MODULE_PATH = fileURLToPath(import.meta.url);
const FETCH_TIMEOUT_MS = 30_000;

export function parseVerificationArguments(argv) {
  const options = {
    baseUrl: '',
    stack: '',
    region: '',
    bucket: '',
    distributionId: '',
    distributionDomain: '',
    receiptPath: DEFAULT_RECEIPT_PATH,
  };
  const explicit = new Set();
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--base-url') options.baseUrl = (argv[++index] || '').trim();
    else if (argument === '--stack') {
      options.stack = argv[++index] || '';
      explicit.add('stack');
    } else if (argument === '--region') {
      options.region = argv[++index] || '';
      explicit.add('region');
    } else if (argument === '--bucket') {
      options.bucket = argv[++index] || '';
      explicit.add('bucket');
    } else if (argument === '--distribution-id') {
      options.distributionId = argv[++index] || '';
      explicit.add('distributionId');
    } else if (argument === '--distribution-domain') {
      options.distributionDomain = argv[++index] || '';
      explicit.add('distributionDomain');
    } else if (argument === '--receipt') options.receiptPath = argv[++index] || '';
    else throw new Error(`Unknown argument: ${argument}`);
  }
  const flags = {
    stack: '--stack',
    region: '--region',
    bucket: '--bucket',
    distributionId: '--distribution-id',
    distributionDomain: '--distribution-domain',
  };
  for (const [field, flag] of Object.entries(flags)) {
    assert(explicit.has(field), `${flag} is required for receipt-bound verification`);
  }
  assert(options.receiptPath, '--receipt requires a repository-relative path');
  normalizePublicationTarget(options);
  return options;
}

export function encodeObjectKey(objectKey) {
  return objectKey.split('/').map((segment) => encodeURIComponent(segment)).join('/');
}

export function bindLiveBaseUrl(baseUrl, receipt) {
  let url;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new Error('Live verification base URL is invalid');
  }
  assert(
    url.protocol === 'https:'
      && !url.username
      && !url.password
      && !url.port
      && url.pathname === '/'
      && !url.search
      && !url.hash,
    'Live verification base URL must be one HTTPS origin'
  );
  assert(
    url.hostname.toLowerCase() === receipt.cloudfront_distribution_domain.toLowerCase(),
    'Live verification base URL does not match the receipt-bound CDN domain'
  );
  return url.origin;
}

function assertCors(response, label) {
  assert(
    response.headers.get('access-control-allow-origin') === '*',
    `${label}: CORS must allow the AlgoNow page origin through the reviewed wildcard policy`
  );
}

function assertImmutableHeaders(response, track, label, { requireFullLength = false } = {}) {
  assert(response.headers.get('content-type') === CONTENT_TYPE, `${label}: content type mismatch`);
  assert(response.headers.get('cache-control') === CACHE_CONTROL, `${label}: cache policy mismatch`);
  if (requireFullLength) {
    assert(Number(response.headers.get('content-length')) === track.bytes, `${label}: content length mismatch`);
  }
  assertCors(response, label);
}

async function verifyCdnTrack({ baseUrl, target, trackId, track, fetchImpl }) {
  const objectUrl = `${baseUrl}/${encodeObjectKey(track.object_key)}`;
  const common = {
    headers: { Origin: `https://${EXPECTED_DOMAIN_NAME}` },
    redirect: 'manual',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  };
  const head = await fetchImpl(objectUrl, { ...common, method: 'HEAD' });
  assert(head.status === 200, `${trackId}: CDN HEAD returned ${head.status}`);
  assertImmutableHeaders(head, track, `${trackId}: CDN HEAD`, { requireFullLength: true });
  assert(head.headers.get('accept-ranges') === 'bytes', `${trackId}: CDN does not advertise byte ranges`);

  const rangeEnd = Math.min(1_023, track.bytes - 1);
  const range = await fetchImpl(objectUrl, {
    ...common,
    headers: { ...common.headers, Range: `bytes=0-${rangeEnd}` },
  });
  assert(range.status === 206, `${trackId}: CDN range request returned ${range.status}`);
  assertImmutableHeaders(range, track, `${trackId}: CDN range`);
  assert(
    range.headers.get('content-range') === `bytes 0-${rangeEnd}/${track.bytes}`,
    `${trackId}: CDN content range mismatch`
  );
  const rangeBody = Buffer.from(await range.arrayBuffer());
  assert(rangeBody.length === rangeEnd + 1, `${trackId}: CDN range body length mismatch`);

  const full = await fetchImpl(objectUrl, common);
  assert(full.status === 200, `${trackId}: CDN full download returned ${full.status}`);
  assertImmutableHeaders(full, track, `${trackId}: CDN full download`, { requireFullLength: true });
  const body = Buffer.from(await full.arrayBuffer());
  assert(body.length === track.bytes, `${trackId}: CDN full body length mismatch`);
  assert(sha256(body) === track.sha256, `${trackId}: CDN full body SHA-256 mismatch`);

  const directOriginUrl = `https://${target.bucket}.s3.${target.region}.amazonaws.com/${encodeObjectKey(track.object_key)}`;
  const direct = await fetchImpl(directOriginUrl, {
    method: 'HEAD',
    redirect: 'manual',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  assert(direct.status === 403, `${trackId}: anonymous direct-origin access is not denied`);
}

export async function verifyKalmanNarration({
  root = ROOT,
  baseUrl = '',
  stack,
  region,
  bucket,
  distributionId,
  distributionDomain,
  receiptPath = DEFAULT_RECEIPT_PATH,
  fetchImpl = fetch,
} = {}) {
  const target = normalizePublicationTarget({ stack, region, bucket, distributionId, distributionDomain });
  const plan = buildPilotPlan();
  const { manifest } = loadPublicManifest({ root, plan });
  assertPublicManifest(manifest, plan);
  const receipt = loadPublicationReceipt({ root, receiptPath, manifest, target });
  let verifiedBaseUrl = '';
  if (baseUrl) {
    verifiedBaseUrl = bindLiveBaseUrl(baseUrl, receipt);
    for (const trackId of TRACK_IDS) {
      await verifyCdnTrack({
        baseUrl: verifiedBaseUrl,
        target,
        trackId,
        track: manifest.tracks[trackId],
        fetchImpl,
      });
    }
  }
  return {
    slug: PILOT_SLUG,
    manifestCount: 1,
    trackCount: TRACK_IDS.length,
    receiptValidated: true,
    cdnVerified: Boolean(verifiedBaseUrl),
    originDenialVerified: Boolean(verifiedBaseUrl),
  };
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseVerificationArguments(argv);
  const result = await verifyKalmanNarration(options);
  console.log(JSON.stringify({
    slug: result.slug,
    manifests: result.manifestCount,
    tracks: result.trackCount,
    publication_receipt_validated: result.receiptValidated,
    cdn_verified: result.cdnVerified,
    direct_origin_denial_verified: result.originDenialVerified,
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(MODULE_PATH)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
