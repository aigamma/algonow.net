import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  CACHE_CONTROL,
  CONTENT_TYPE,
  DEFAULT_RECEIPT_PATH,
  EXPECTED_CACHE_POLICY_ID,
  EXPECTED_DOMAIN_NAME,
  EXPECTED_ENVIRONMENT,
  EXPECTED_RESPONSE_HEADERS_POLICY_ID,
  PILOT_SLUG,
  ROOT,
  TRACK_IDS,
  assert,
  buildPublicationReceipt,
  loadLocalRelease,
  normalizePublicationTarget,
  readJsonFile,
  resolveWithinRoot,
  sha256,
  stableJson,
  validatePublicationReceipt,
  writeFileAtomic,
} from './release-contract.mjs';

const MODULE_PATH = fileURLToPath(import.meta.url);
const FETCH_TIMEOUT_MS = 30_000;

export function parsePublicationArguments(argv) {
  const options = {
    execute: false,
    stack: '',
    region: '',
    bucket: '',
    distributionId: '',
    distributionDomain: '',
    receiptPath: DEFAULT_RECEIPT_PATH,
    awsPath: '',
  };
  const explicit = new Set();
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--execute') options.execute = true;
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
    } else if (argument === '--receipt') {
      options.receiptPath = argv[++index] || '';
      explicit.add('receiptPath');
    } else if (argument === '--aws-path') {
      options.awsPath = argv[++index] || '';
      explicit.add('awsPath');
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  assert(options.receiptPath, '--receipt requires a repository-relative path');
  const targetFields = ['stack', 'region', 'bucket', 'distributionId', 'distributionDomain'];
  const hasPartialTarget = targetFields.some((field) => explicit.has(field));
  if (options.execute || hasPartialTarget) {
    for (const field of targetFields) {
      assert(explicit.has(field), `--${field.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)} is required`);
    }
    normalizePublicationTarget(options);
  }
  if (options.execute) {
    assert(explicit.has('receiptPath'), '--receipt is required with --execute');
  }
  return options;
}

export function resolveAwsCliPath(explicitPath = '') {
  const requested = String(explicitPath || process.env.AWS_PATH || '').trim();
  if (requested) return requested;
  const candidates = [
    'C:\\Program Files\\Amazon\\AWSCLIV2\\aws.exe',
    'C:\\Program Files (x86)\\Amazon\\AWSCLIV2\\aws.exe',
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || 'aws';
}

export function runAwsCli(args, { awsPath = '' } = {}) {
  const result = spawnSync(resolveAwsCliPath(awsPath), args, {
    encoding: 'utf8',
    env: {
      ...process.env,
      AWS_CLI_AUTO_PROMPT: 'off',
      AWS_PAGER: '',
    },
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.error) throw new Error(`AWS CLI could not start: ${result.error.message}`);
  return {
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

function parseAwsJson(result, operation) {
  assert(result && typeof result.status === 'number', `AWS ${operation} returned no status`);
  if (result.status !== 0) throw new Error(`AWS ${operation} failed`);
  try {
    return result.stdout.trim() ? JSON.parse(result.stdout) : {};
  } catch (error) {
    throw new Error(`AWS ${operation} returned invalid JSON: ${error.message}`);
  }
}

function arnParts(arn) {
  const match = String(arn || '').match(/^arn:(aws(?:-us-gov|-cn)?):([^:]+):([^:]*):(\d{12}):(.+)$/);
  assert(match, 'AWS caller identity ARN is invalid');
  return {
    partition: match[1],
    service: match[2],
    region: match[3],
    account: match[4],
    resource: match[5],
  };
}

export function assertSuitableAwsIdentity(identity) {
  assert(identity && typeof identity === 'object', 'AWS caller identity is missing');
  assert(/^\d{12}$/.test(identity.Account || ''), 'AWS caller account is invalid');
  const parts = arnParts(identity.Arn);
  assert(parts.account === identity.Account, 'AWS caller identity account mismatch');
  if (parts.service === 'iam' && parts.resource === 'root') {
    throw new Error('AWS root credentials are not permitted for narration publication');
  }
  if (parts.service === 'iam' && parts.resource.startsWith('user/')) {
    throw new Error('Long-lived IAM user credentials are not permitted for narration publication');
  }
  const assumedRole = parts.service === 'sts' && parts.resource.startsWith('assumed-role/');
  const federatedUser = parts.service === 'sts' && parts.resource.startsWith('federated-user/');
  assert(
    assumedRole || federatedUser,
    'Narration publication requires a short-lived AWS role or federated session'
  );
  return { accountId: identity.Account, partition: parts.partition };
}

function oneEntry(entries, keyName, key, label) {
  const matches = (entries || []).filter((entry) => entry?.[keyName] === key);
  assert(matches.length === 1, `Media stack must have exactly one ${label}`);
  return matches[0];
}

function assertExactStringSet(value, expected, message) {
  const actual = Array.isArray(value) ? value : [value];
  assert(
    actual.length === expected.length
      && new Set(actual).size === expected.length
      && expected.every((item) => actual.includes(item)),
    message
  );
}

function assertStackResource({ detail, stack, accountId, logicalId, resourceType, physicalId }) {
  assert(detail && typeof detail === 'object', `${logicalId} stack resource is missing`);
  assert(detail.StackId === stack.StackId, `${logicalId} belongs to a different stack`);
  assert(arnParts(detail.StackId).account === accountId, `${logicalId} belongs to a different account`);
  assert(detail.LogicalResourceId === logicalId, `${logicalId} logical resource mismatch`);
  assert(detail.ResourceType === resourceType, `${logicalId} resource type mismatch`);
  assert(
    ['CREATE_COMPLETE', 'UPDATE_COMPLETE', 'IMPORT_COMPLETE'].includes(detail.ResourceStatus),
    `${logicalId} is not in a complete state`
  );
  assert(typeof detail.PhysicalResourceId === 'string' && detail.PhysicalResourceId, `${logicalId} physical ID is missing`);
  if (physicalId) assert(detail.PhysicalResourceId === physicalId, `${logicalId} physical ID mismatch`);
}

function parseBucketPolicy(response) {
  assert(typeof response?.Policy === 'string', 'Media bucket policy is missing');
  try {
    return JSON.parse(response.Policy);
  } catch {
    throw new Error('Media bucket policy is invalid JSON');
  }
}

function assertBucketPolicy(policy, { target, accountId, partition }) {
  assert(policy?.Version === '2012-10-17', 'Media bucket policy version mismatch');
  assert(Array.isArray(policy.Statement), 'Media bucket policy statements are missing');
  assert(policy.Statement.length === 2, 'Media bucket policy must contain exactly two statements');
  const cloudFront = policy.Statement.filter((statement) => statement?.Sid === 'AllowCloudFrontReadOnly');
  assert(cloudFront.length === 1, 'Media bucket policy must have one CloudFront read statement');
  assert(cloudFront[0].Effect === 'Allow', 'CloudFront read policy effect mismatch');
  assert(
    stableJson(cloudFront[0].Principal) === stableJson({ Service: 'cloudfront.amazonaws.com' }),
    'CloudFront read policy principal mismatch'
  );
  assertExactStringSet(cloudFront[0].Action, ['s3:GetObject'], 'CloudFront read policy action mismatch');
  assertExactStringSet(
    cloudFront[0].Resource,
    [`arn:${partition}:s3:::${target.bucket}/*`],
    'CloudFront read policy resource mismatch'
  );
  assert(
    stableJson(cloudFront[0].Condition) === stableJson({
      StringEquals: {
        'AWS:SourceArn': `arn:${partition}:cloudfront::${accountId}:distribution/${target.distributionId}`,
      },
    }),
    'CloudFront read policy source binding mismatch'
  );

  const secure = policy.Statement.filter((statement) => statement?.Sid === 'DenyInsecureTransport');
  assert(secure.length === 1, 'Media bucket policy must have one secure-transport statement');
  assert(secure[0].Effect === 'Deny', 'Secure-transport policy effect mismatch');
  assert(
    secure[0].Principal === '*' || stableJson(secure[0].Principal) === stableJson({ AWS: '*' }),
    'Secure-transport policy principal mismatch'
  );
  assertExactStringSet(secure[0].Action, ['s3:*'], 'Secure-transport policy action mismatch');
  assertExactStringSet(
    secure[0].Resource,
    [`arn:${partition}:s3:::${target.bucket}`, `arn:${partition}:s3:::${target.bucket}/*`],
    'Secure-transport policy resource mismatch'
  );
  assert(
    stableJson(secure[0].Condition) === stableJson({ Bool: { 'aws:SecureTransport': 'false' } }),
    'Secure-transport policy condition mismatch'
  );
}

async function assertAnonymousOriginDenied(target, fetchImpl) {
  const response = await fetchImpl(
    `https://${target.bucket}.s3.${target.region}.amazonaws.com/`,
    {
      method: 'HEAD',
      redirect: 'manual',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    }
  );
  assert(response.status === 403, 'Anonymous direct-origin access is not denied');
}

export async function attestPublicationTarget({
  runner,
  target,
  fetchImpl = fetch,
} = {}) {
  assert(typeof runner === 'function', 'AWS runner is required');
  assert(typeof fetchImpl === 'function', 'Anonymous origin verifier is required');
  const normalized = normalizePublicationTarget(target);

  const identity = parseAwsJson(
    runner(['sts', 'get-caller-identity', '--output', 'json']),
    'caller identity attestation'
  );
  const { accountId, partition } = assertSuitableAwsIdentity(identity);

  const stackResponse = parseAwsJson(runner([
    'cloudformation', 'describe-stacks',
    '--region', normalized.region,
    '--stack-name', normalized.stack,
    '--output', 'json',
  ]), 'stack attestation');
  assert(Array.isArray(stackResponse.Stacks) && stackResponse.Stacks.length === 1, 'Media stack lookup must return exactly one stack');
  const stack = stackResponse.Stacks[0];
  assert(stack.StackName === normalized.stack, 'Media stack name mismatch');
  assert(
    ['CREATE_COMPLETE', 'UPDATE_COMPLETE', 'IMPORT_COMPLETE'].includes(stack.StackStatus),
    'Media stack is not in a complete state'
  );
  assert(stack.EnableTerminationProtection === true, 'Media stack termination protection is disabled');
  const stackArn = arnParts(stack.StackId);
  assert(stackArn.account === accountId, 'Media stack belongs to a different account');
  assert(stackArn.region === normalized.region, 'Media stack belongs to a different region');
  assert(
    oneEntry(stack.Parameters, 'ParameterKey', 'DomainName', 'DomainName parameter').ParameterValue === EXPECTED_DOMAIN_NAME,
    'Media stack production domain mismatch'
  );
  assert(
    oneEntry(stack.Parameters, 'ParameterKey', 'Environment', 'Environment parameter').ParameterValue === EXPECTED_ENVIRONMENT,
    'Media stack environment mismatch'
  );
  assert(
    oneEntry(stack.Outputs, 'OutputKey', 'BucketName', 'BucketName output').OutputValue === normalized.bucket,
    'Supplied private bucket does not match the media stack output'
  );
  assert(
    oneEntry(stack.Outputs, 'OutputKey', 'DistributionId', 'DistributionId output').OutputValue === normalized.distributionId,
    'Supplied distribution ID does not match the media stack output'
  );
  assert(
    oneEntry(stack.Outputs, 'OutputKey', 'DistributionDomainName', 'DistributionDomainName output').OutputValue === normalized.distributionDomain,
    'Supplied distribution domain does not match the media stack output'
  );

  const describeResource = (logicalId) => parseAwsJson(runner([
    'cloudformation', 'describe-stack-resource',
    '--region', normalized.region,
    '--stack-name', normalized.stack,
    '--logical-resource-id', logicalId,
    '--output', 'json',
  ]), `${logicalId} stack-resource attestation`).StackResourceDetail;
  const bucketResource = describeResource('MediaBucket');
  assertStackResource({
    detail: bucketResource,
    stack,
    accountId,
    logicalId: 'MediaBucket',
    resourceType: 'AWS::S3::Bucket',
    physicalId: normalized.bucket,
  });
  const distributionResource = describeResource('MediaDistribution');
  assertStackResource({
    detail: distributionResource,
    stack,
    accountId,
    logicalId: 'MediaDistribution',
    resourceType: 'AWS::CloudFront::Distribution',
    physicalId: normalized.distributionId,
  });
  const originAccessControlResource = describeResource('MediaOriginAccessControl');
  assertStackResource({
    detail: originAccessControlResource,
    stack,
    accountId,
    logicalId: 'MediaOriginAccessControl',
    resourceType: 'AWS::CloudFront::OriginAccessControl',
  });

  const bucketArgs = ['--region', normalized.region, '--bucket', normalized.bucket, '--expected-bucket-owner', accountId, '--output', 'json'];
  const bucketLocation = parseAwsJson(
    runner(['s3api', 'get-bucket-location', ...bucketArgs]),
    'bucket-region attestation'
  );
  const actualRegion = bucketLocation.LocationConstraint || 'us-east-1';
  assert(actualRegion === normalized.region, 'Media bucket region mismatch');
  parseAwsJson(runner(['s3api', 'head-bucket', ...bucketArgs]), 'bucket ownership attestation');

  const publicAccess = parseAwsJson(
    runner(['s3api', 'get-public-access-block', ...bucketArgs]),
    'bucket public-access attestation'
  ).PublicAccessBlockConfiguration;
  assert(
    publicAccess?.BlockPublicAcls === true
      && publicAccess?.IgnorePublicAcls === true
      && publicAccess?.BlockPublicPolicy === true
      && publicAccess?.RestrictPublicBuckets === true,
    'Media bucket must keep every Block Public Access control enabled'
  );
  const versioning = parseAwsJson(
    runner(['s3api', 'get-bucket-versioning', ...bucketArgs]),
    'bucket versioning attestation'
  );
  assert(versioning.Status === 'Enabled', 'Media bucket versioning must be enabled');
  const encryption = parseAwsJson(
    runner(['s3api', 'get-bucket-encryption', ...bucketArgs]),
    'bucket encryption attestation'
  ).ServerSideEncryptionConfiguration;
  assert(
    Array.isArray(encryption?.Rules)
      && encryption.Rules.length === 1
      && encryption.Rules[0]?.ApplyServerSideEncryptionByDefault?.SSEAlgorithm === 'AES256'
      && !encryption.Rules[0].ApplyServerSideEncryptionByDefault.KMSMasterKeyID,
    'Media bucket encryption must use one AES256 rule'
  );
  const ownership = parseAwsJson(
    runner(['s3api', 'get-bucket-ownership-controls', ...bucketArgs]),
    'bucket ownership-controls attestation'
  ).OwnershipControls;
  assert(
    Array.isArray(ownership?.Rules)
      && ownership.Rules.length === 1
      && ownership.Rules[0]?.ObjectOwnership === 'BucketOwnerEnforced',
    'Media bucket ownership must be BucketOwnerEnforced'
  );
  const bucketPolicy = parseAwsJson(
    runner(['s3api', 'get-bucket-policy', ...bucketArgs]),
    'bucket policy attestation'
  );
  assertBucketPolicy(parseBucketPolicy(bucketPolicy), {
    target: normalized,
    accountId,
    partition,
  });

  const originAccessControl = parseAwsJson(runner([
    'cloudfront', 'get-origin-access-control',
    '--id', originAccessControlResource.PhysicalResourceId,
    '--output', 'json',
  ]), 'origin access control attestation').OriginAccessControl;
  assert(
    originAccessControl?.Id === originAccessControlResource.PhysicalResourceId,
    'Origin Access Control ID mismatch'
  );
  assert(
    originAccessControl?.OriginAccessControlConfig?.OriginAccessControlOriginType === 's3'
      && originAccessControl.OriginAccessControlConfig.SigningBehavior === 'always'
      && originAccessControl.OriginAccessControlConfig.SigningProtocol === 'sigv4',
    'Origin Access Control signing configuration mismatch'
  );

  const distribution = parseAwsJson(runner([
    'cloudfront', 'get-distribution',
    '--id', normalized.distributionId,
    '--output', 'json',
  ]), 'distribution attestation').Distribution;
  assert(distribution?.Id === normalized.distributionId, 'CloudFront distribution ID mismatch');
  assert(distribution?.DomainName === normalized.distributionDomain, 'CloudFront distribution domain mismatch');
  assert(distribution?.Status === 'Deployed', 'CloudFront distribution is not deployed');
  assert(arnParts(distribution?.ARN).account === accountId, 'CloudFront distribution belongs to a different account');
  const config = distribution.DistributionConfig;
  assert(config?.Enabled === true, 'CloudFront distribution is disabled');
  const origins = config?.Origins?.Items || [];
  assert(config?.Origins?.Quantity === 1 && origins.length === 1, 'CloudFront distribution must have exactly one origin');
  assert(config?.CacheBehaviors?.Quantity === 0, 'CloudFront distribution must not have path behaviors');
  assert(config?.OriginGroups?.Quantity === 0, 'CloudFront distribution must not have origin groups');
  const origin = origins[0];
  assert(origin.Id === 'S3MediaOrigin', 'CloudFront media origin ID mismatch');
  assert(origin.DomainName === `${normalized.bucket}.s3.${normalized.region}.amazonaws.com`, 'CloudFront media origin domain mismatch');
  assert(origin.OriginAccessControlId === originAccessControlResource.PhysicalResourceId, 'CloudFront origin access control mismatch');
  assert(origin.S3OriginConfig?.OriginAccessIdentity === '', 'CloudFront origin must not use a legacy origin identity');
  const behavior = config.DefaultCacheBehavior;
  assert(behavior?.TargetOriginId === 'S3MediaOrigin', 'CloudFront default behavior target mismatch');
  assertExactStringSet(behavior?.AllowedMethods?.Items, ['GET', 'HEAD'], 'CloudFront allowed methods mismatch');
  assert(behavior?.AllowedMethods?.Quantity === 2, 'CloudFront allowed-method count mismatch');
  assertExactStringSet(behavior?.AllowedMethods?.CachedMethods?.Items, ['GET', 'HEAD'], 'CloudFront cached methods mismatch');
  assert(behavior?.AllowedMethods?.CachedMethods?.Quantity === 2, 'CloudFront cached-method count mismatch');
  assert(behavior.CachePolicyId === EXPECTED_CACHE_POLICY_ID, 'CloudFront cache policy mismatch');
  assert(behavior.ResponseHeadersPolicyId === EXPECTED_RESPONSE_HEADERS_POLICY_ID, 'CloudFront response headers policy mismatch');
  assert(behavior.ViewerProtocolPolicy === 'redirect-to-https', 'CloudFront viewer protocol policy mismatch');
  assert(behavior.Compress === false, 'CloudFront compression must be disabled for MP3 objects');

  await assertAnonymousOriginDenied(normalized, fetchImpl);
  return {
    target: normalized,
    expectedBucketOwner: accountId,
  };
}

export function buildPublicationPlan({ root = ROOT } = {}) {
  const release = loadLocalRelease({ root });
  const objects = TRACK_IDS.map((trackId) => {
    const track = release.tracks[trackId];
    return {
      trackId,
      localPath: track.localPath,
      objectKey: track.object_key,
      bytes: track.bytes,
      sha256: track.sha256,
      contentType: track.content_type,
      cacheControl: track.cache_control,
    };
  }).sort((left, right) => left.objectKey.localeCompare(right.objectKey, 'en'));
  return {
    pageCount: 1,
    releaseCount: 1,
    objectCount: objects.length,
    totalBytes: objects.reduce((total, object) => total + object.bytes, 0),
    manifest: release.publicManifest,
    objects,
  };
}

function isPreconditionFailure(result) {
  return result?.status !== 0
    && /PreconditionFailed|precondition failed|condition specified using HTTP conditional header|\b412\b/i.test(`${result.stdout || ''}\n${result.stderr || ''}`);
}

function verifyHeadMetadata(head, object) {
  assert(Number(head.ContentLength) === object.bytes, `${object.trackId}: remote byte count mismatch`);
  assert(head.ContentType === object.contentType, `${object.trackId}: remote content type mismatch`);
  assert(head.CacheControl === object.cacheControl, `${object.trackId}: remote cache policy mismatch`);
  const expectedChecksum = Buffer.from(object.sha256, 'hex').toString('base64');
  assert(head.ChecksumSHA256 === expectedChecksum, `${object.trackId}: remote checksum metadata mismatch`);
}

function headObject({ runner, target, expectedBucketOwner, object }) {
  const head = parseAwsJson(runner([
    's3api', 'head-object',
    '--region', target.region,
    '--bucket', target.bucket,
    '--expected-bucket-owner', expectedBucketOwner,
    '--key', object.objectKey,
    '--checksum-mode', 'ENABLED',
    '--output', 'json',
  ]), `${object.trackId} object metadata verification`);
  verifyHeadMetadata(head, object);
}

function verifyExistingObjectBody({ runner, target, expectedBucketOwner, object }) {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'algonow-narration-s3-'));
  const downloadPath = path.join(temporaryDirectory, 'existing.mp3');
  try {
    parseAwsJson(runner([
      's3api', 'get-object',
      '--region', target.region,
      '--bucket', target.bucket,
      '--expected-bucket-owner', expectedBucketOwner,
      '--key', object.objectKey,
      '--checksum-mode', 'ENABLED',
      '--output', 'json',
      downloadPath,
    ]), `${object.trackId} existing-object verification`);
    assert(fs.existsSync(downloadPath), `${object.trackId}: existing object body was not downloaded`);
    const body = fs.readFileSync(downloadPath);
    assert(body.length === object.bytes, `${object.trackId}: existing object body byte count mismatch`);
    assert(sha256(body) === object.sha256, `${object.trackId}: existing object body SHA-256 mismatch`);
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

export function publishObjectConditionally({
  runner,
  target,
  expectedBucketOwner,
  object,
} = {}) {
  assert(/^\d{12}$/.test(expectedBucketOwner || ''), 'Expected private bucket owner is invalid');
  const checksum = Buffer.from(object.sha256, 'hex').toString('base64');
  const result = runner([
    's3api', 'put-object',
    '--region', target.region,
    '--bucket', target.bucket,
    '--expected-bucket-owner', expectedBucketOwner,
    '--key', object.objectKey,
    '--body', object.localPath,
    '--content-type', CONTENT_TYPE,
    '--cache-control', CACHE_CONTROL,
    '--checksum-algorithm', 'SHA256',
    '--checksum-sha256', checksum,
    '--if-none-match', '*',
    '--output', 'json',
  ]);
  if (result.status === 0) {
    headObject({ runner, target, expectedBucketOwner, object });
    return { trackId: object.trackId, result: 'uploaded' };
  }
  if (!isPreconditionFailure(result)) {
    throw new Error(`${object.trackId}: conditional object publication failed`);
  }
  headObject({ runner, target, expectedBucketOwner, object });
  verifyExistingObjectBody({ runner, target, expectedBucketOwner, object });
  return { trackId: object.trackId, result: 'verified-existing' };
}

export async function publishKalmanNarration({
  root = ROOT,
  execute = false,
  stack = '',
  region = '',
  bucket = '',
  distributionId = '',
  distributionDomain = '',
  receiptPath = DEFAULT_RECEIPT_PATH,
  awsPath = '',
  runner = (args) => runAwsCli(args, { awsPath }),
  fetchImpl = fetch,
  publishedAt,
} = {}) {
  const plan = buildPublicationPlan({ root });
  if (!execute) return { mode: 'dry-run', plan, receipt: null, receiptPath: null };

  const target = normalizePublicationTarget({ stack, region, bucket, distributionId, distributionDomain });
  const attestation = await attestPublicationTarget({ runner, target, fetchImpl });
  const results = [];
  for (const object of plan.objects) {
    results.push(publishObjectConditionally({
      runner,
      target,
      expectedBucketOwner: attestation.expectedBucketOwner,
      object,
    }));
  }
  const resultsByTrack = Object.fromEntries(results.map((result) => [result.trackId, result.result]));
  const receipt = buildPublicationReceipt({
    manifest: plan.manifest,
    target,
    resultsByTrack,
    publishedAt,
  });
  const absoluteReceiptPath = resolveWithinRoot(root, receiptPath, 'Publication receipt path');
  if (fs.existsSync(absoluteReceiptPath)) {
    const existing = readJsonFile(absoluteReceiptPath, 'Existing publication receipt');
    validatePublicationReceipt(existing, { manifest: plan.manifest, target });
    assert(
      existing.publication_sha256 === receipt.publication_sha256,
      'Existing publication receipt describes a different release'
    );
    assert(
      results.every((result) => result.result === 'verified-existing'),
      'Existing receipt claimed publication before every remote object existed'
    );
    return {
      mode: 'verified-existing-receipt',
      plan,
      receipt: existing,
      receiptPath: path.relative(root, absoluteReceiptPath).replaceAll('\\', '/'),
    };
  }
  fs.mkdirSync(path.dirname(absoluteReceiptPath), { recursive: true });
  writeFileAtomic(absoluteReceiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { encoding: 'utf8' });
  return {
    mode: 'execute',
    plan,
    receipt,
    receiptPath: path.relative(root, absoluteReceiptPath).replaceAll('\\', '/'),
  };
}

export async function main(argv = process.argv.slice(2)) {
  const options = parsePublicationArguments(argv);
  const result = await publishKalmanNarration(options);
  console.log(JSON.stringify({
    mode: result.mode,
    slug: PILOT_SLUG,
    releases: result.plan.releaseCount,
    objects: result.plan.objectCount,
    total_bytes: result.plan.totalBytes,
    uploaded: result.receipt?.uploaded_count || 0,
    verified_existing: result.receipt?.verified_existing_count || 0,
    receipt: result.receiptPath,
  }, null, 2));
  if (!options.execute) {
    console.log('Dry run complete. Publication requires explicit target arguments and --execute.');
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(MODULE_PATH)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
