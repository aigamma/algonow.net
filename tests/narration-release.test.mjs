import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  CACHE_CONTROL,
  CONTENT_TYPE,
  PLAYBACK_POLICY,
  PUBLIC_MANIFEST_PATH,
  PUZZLE_NARRATION_VOICES,
  TRACK_IDS,
  assertPublicManifest,
  buildPilotPlan,
  buildPublicationReceipt,
  expectedTrackObjectKey,
  privateOriginBindingSha256,
  sha256,
  validatePublicationReceipt,
} from '../scripts/narration/release-contract.mjs';
import {
  assertSuitableAwsIdentity,
  attestPublicationTarget,
  buildPublicationPlan,
  parsePublicationArguments,
  publishKalmanNarration,
  publishObjectConditionally,
} from '../scripts/narration/publish-kalman-narration.mjs';
import {
  installKalmanNarration,
  parseInstallationArguments,
} from '../scripts/narration/install-kalman-narration.mjs';
import {
  bindLiveBaseUrl,
  parseVerificationArguments,
  verifyKalmanNarration,
} from '../scripts/narration/verify-kalman-narration.mjs';
import { releaseOutputDirectory } from '../scripts/narration/puzzle-narration-pipeline.mjs';

const TEST_ACCOUNT = '123456789012';
const TARGET = Object.freeze({
  stack: 'algonow-media-prod',
  region: 'us-east-2',
  bucket: 'algonow-private-media-test',
  distributionId: 'E123456789ABC',
  distributionDomain: 'd111111abcdef8.cloudfront.net',
});

function clone(value) {
  return structuredClone(value);
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function pendingManifest() {
  return {
    schema_version: 1,
    status: 'pending',
    content_id: 'puzzle:kalman-covariance-correction',
    source_path: 'src/content/kalman-covariance-correction.narration.js',
    default_voice: 'aoede',
    default_rate: 1.25,
    tracks: {},
  };
}

function createLocalRelease(root) {
  const plan = buildPilotPlan();
  const outputDirectory = releaseOutputDirectory(root, plan);
  fs.mkdirSync(outputDirectory, { recursive: true });
  const audioByTrack = {};
  const tracks = {};
  for (let index = 0; index < TRACK_IDS.length; index += 1) {
    const trackId = TRACK_IDS[index];
    const body = Buffer.alloc(2_048 + index, 65 + index);
    const audioHash = sha256(body);
    const fileName = `${trackId}-${audioHash.slice(0, 16)}.mp3`;
    const absolutePath = path.join(outputDirectory, fileName);
    fs.writeFileSync(absolutePath, body);
    audioByTrack[trackId] = body;
    tracks[trackId] = {
      ...PUZZLE_NARRATION_VOICES[trackId],
      object_key: expectedTrackObjectKey(plan, trackId, audioHash),
      content_type: CONTENT_TYPE,
      cache_control: CACHE_CONTROL,
      bytes: body.length,
      sha256: audioHash,
      local_file: path.relative(root, absolutePath).replaceAll('\\', '/'),
      request_parts: plan.requests.map((request) => ({
        request_index: request.index,
        request_sha256: request.sha256,
        bytes: 1_100 + request.index,
        sha256: sha256(`${trackId}:${request.index}`),
      })),
    };
  }
  const localManifest = {
    schema_version: 1,
    content_id: plan.contentId,
    source_path: plan.sourcePath,
    source_sha256: plan.sourceHash,
    source_characters: plan.charactersPerVoice,
    recipe: plan.recipe,
    recipe_sha256: plan.recipeHash,
    release_sha256: plan.releaseHash,
    generated_at: '2026-08-30T20:00:00.000Z',
    generated_characters: plan.plannedBillableCharacters,
    default_voice: PLAYBACK_POLICY.default_voice,
    default_rate: PLAYBACK_POLICY.default_rate,
    rate_options: PLAYBACK_POLICY.rate_options,
    request_chunks: plan.requestChunks,
    assembly: plan.assembly,
    segments: plan.segments,
    tracks,
  };
  writeJson(path.join(outputDirectory, 'manifest-entry.json'), localManifest);
  writeJson(path.join(root, PUBLIC_MANIFEST_PATH), pendingManifest());
  return { plan, localManifest, audioByTrack };
}

function createPublishedFixture(root, resultsByTrack = {}) {
  createLocalRelease(root);
  const publication = buildPublicationPlan({ root });
  const receipt = buildPublicationReceipt({
    manifest: publication.manifest,
    target: TARGET,
    resultsByTrack: Object.fromEntries(TRACK_IDS.map((trackId) => [
      trackId,
      resultsByTrack[trackId] || 'uploaded',
    ])),
    publishedAt: '2026-08-30T21:00:00.000Z',
  });
  writeJson(path.join(root, 'infra/narration/publication-receipt.json'), receipt);
  return { publication, receipt };
}

function withTemporaryRoot(callback) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'algonow-narration-release-test-'));
  return Promise.resolve()
    .then(() => callback(root))
    .finally(() => fs.rmSync(root, { recursive: true, force: true }));
}

test('public manifest schema is exact and strips every private local path', async () => {
  await withTemporaryRoot((root) => {
    createLocalRelease(root);
    const publication = buildPublicationPlan({ root });
    assertPublicManifest(publication.manifest);
    assert.equal(JSON.stringify(publication.manifest).includes('local_file'), false);
    assert.deepEqual(publication.manifest.rate_options, [
      { value: 1, label: '1.00x' },
      { value: 1.25, label: '1.25x' },
      { value: 1.5, label: '1.50x' },
      { value: 1.75, label: '1.75x' },
    ]);

    const extraField = clone(publication.manifest);
    extraField.operator_note = 'reviewed';
    assert.throws(() => assertPublicManifest(extraField), /unapproved field/);

    const privateValue = clone(publication.manifest);
    privateValue.tracks.aoede.label = TARGET.bucket;
    assert.throws(() => assertPublicManifest(privateValue), /private target|current source and recipe/);

    const wrongRates = clone(publication.manifest);
    wrongRates.rate_options.push({ value: 2, label: '2.00x' });
    assert.throws(() => assertPublicManifest(wrongRates), /rate controls|current source and recipe/);
  });
});

test('publication receipt binds the private bucket without storing it', async () => {
  await withTemporaryRoot((root) => {
    const { publication } = createPublishedFixture(root, { algieba: 'verified-existing' });
    const receipt = buildPublicationReceipt({
      manifest: publication.manifest,
      target: TARGET,
      resultsByTrack: { aoede: 'uploaded', algieba: 'verified-existing' },
      publishedAt: '2026-08-30T21:00:00.000Z',
    });
    validatePublicationReceipt(receipt, { manifest: publication.manifest, target: TARGET });
    const serialized = JSON.stringify(receipt);
    assert.equal(serialized.includes(TARGET.bucket), false);
    assert.equal(serialized.includes(TEST_ACCOUNT), false);
    assert.equal(receipt.private_origin_binding_sha256, privateOriginBindingSha256(TARGET));
    assert.equal(receipt.uploaded_count, 1);
    assert.equal(receipt.verified_existing_count, 1);

    const differentTarget = { ...TARGET, bucket: 'algonow-different-private-media' };
    assert.throws(
      () => validatePublicationReceipt(receipt, { manifest: publication.manifest, target: differentTarget }),
      /private origin binding mismatch/
    );
    const tampered = clone(receipt);
    tampered.objects[0].bytes += 1;
    assert.throws(
      () => validatePublicationReceipt(tampered, { manifest: publication.manifest, target: TARGET }),
      /release inventory/
    );
  });
});

test('publication CLI is dry by default and execution requires every explicit target binding', () => {
  assert.equal(parsePublicationArguments([]).execute, false);
  assert.throws(() => parsePublicationArguments(['--execute']), /--stack is required/);
  assert.throws(() => parsePublicationArguments([
    '--execute',
    '--stack', TARGET.stack,
    '--region', TARGET.region,
    '--bucket', TARGET.bucket,
    '--distribution-id', TARGET.distributionId,
    '--distribution-domain', TARGET.distributionDomain,
  ]), /--receipt is required/);
  const parsed = parsePublicationArguments([
    '--execute',
    '--stack', TARGET.stack,
    '--region', TARGET.region,
    '--bucket', TARGET.bucket,
    '--distribution-id', TARGET.distributionId,
    '--distribution-domain', TARGET.distributionDomain,
    '--receipt', 'infra/narration/publication-receipt.json',
  ]);
  assert.equal(parsed.execute, true);
});

test('publication dry run never invokes AWS or writes a receipt', async () => {
  await withTemporaryRoot(async (root) => {
    createLocalRelease(root);
    const result = await publishKalmanNarration({
      root,
      runner: () => {
        throw new Error('AWS must not run during a dry run');
      },
    });
    assert.equal(result.mode, 'dry-run');
    assert.equal(result.plan.objectCount, 2);
    assert.equal(fs.existsSync(path.join(root, 'infra/narration/publication-receipt.json')), false);
  });
});

test('publication refuses root and long-lived IAM user credentials', () => {
  assert.throws(() => assertSuitableAwsIdentity({
    Account: TEST_ACCOUNT,
    Arn: `arn:aws:iam::${TEST_ACCOUNT}:root`,
  }), /root credentials/);
  assert.throws(() => assertSuitableAwsIdentity({
    Account: TEST_ACCOUNT,
    Arn: `arn:aws:iam::${TEST_ACCOUNT}:user/operator`,
  }), /Long-lived IAM user/);
  assert.deepEqual(assertSuitableAwsIdentity({
    Account: TEST_ACCOUNT,
    Arn: `arn:aws:sts::${TEST_ACCOUNT}:assumed-role/NarrationPublisher/session`,
  }), { accountId: TEST_ACCOUNT, partition: 'aws' });
});

function successJson(value) {
  return { status: 0, stdout: JSON.stringify(value), stderr: '' };
}

function buildAttestationRunner(target) {
  const stackId = `arn:aws:cloudformation:${target.region}:${TEST_ACCOUNT}:stack/${target.stack}/fixture`;
  const oacId = 'E123OACFIXTURE';
  const resources = {
    MediaBucket: ['AWS::S3::Bucket', target.bucket],
    MediaDistribution: ['AWS::CloudFront::Distribution', target.distributionId],
    MediaOriginAccessControl: ['AWS::CloudFront::OriginAccessControl', oacId],
  };
  return (args) => {
    const operation = `${args[0]} ${args[1]}`;
    if (operation === 'sts get-caller-identity') {
      return successJson({
        Account: TEST_ACCOUNT,
        Arn: `arn:aws:sts::${TEST_ACCOUNT}:assumed-role/NarrationPublisher/session`,
      });
    }
    if (operation === 'cloudformation describe-stacks') {
      return successJson({
        Stacks: [{
          StackId: stackId,
          StackName: target.stack,
          StackStatus: 'UPDATE_COMPLETE',
          EnableTerminationProtection: true,
          Parameters: [
            { ParameterKey: 'DomainName', ParameterValue: 'algonow.net' },
            { ParameterKey: 'Environment', ParameterValue: 'production' },
          ],
          Outputs: [
            { OutputKey: 'BucketName', OutputValue: target.bucket },
            { OutputKey: 'DistributionId', OutputValue: target.distributionId },
            { OutputKey: 'DistributionDomainName', OutputValue: target.distributionDomain },
          ],
        }],
      });
    }
    if (operation === 'cloudformation describe-stack-resource') {
      const logicalId = args[args.indexOf('--logical-resource-id') + 1];
      const [resourceType, physicalId] = resources[logicalId];
      return successJson({
        StackResourceDetail: {
          StackId: stackId,
          LogicalResourceId: logicalId,
          ResourceType: resourceType,
          ResourceStatus: 'CREATE_COMPLETE',
          PhysicalResourceId: physicalId,
        },
      });
    }
    if (operation === 's3api get-bucket-location') return successJson({ LocationConstraint: target.region });
    if (operation === 's3api head-bucket') return successJson({});
    if (operation === 's3api get-public-access-block') {
      return successJson({
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          IgnorePublicAcls: true,
          BlockPublicPolicy: true,
          RestrictPublicBuckets: true,
        },
      });
    }
    if (operation === 's3api get-bucket-versioning') return successJson({ Status: 'Enabled' });
    if (operation === 's3api get-bucket-encryption') {
      return successJson({
        ServerSideEncryptionConfiguration: {
          Rules: [{ ApplyServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' } }],
        },
      });
    }
    if (operation === 's3api get-bucket-ownership-controls') {
      return successJson({ OwnershipControls: { Rules: [{ ObjectOwnership: 'BucketOwnerEnforced' }] } });
    }
    if (operation === 's3api get-bucket-policy') {
      return successJson({
        Policy: JSON.stringify({
          Version: '2012-10-17',
          Statement: [
            {
              Sid: 'AllowCloudFrontReadOnly',
              Effect: 'Allow',
              Principal: { Service: 'cloudfront.amazonaws.com' },
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${target.bucket}/*`],
              Condition: {
                StringEquals: {
                  'AWS:SourceArn': `arn:aws:cloudfront::${TEST_ACCOUNT}:distribution/${target.distributionId}`,
                },
              },
            },
            {
              Sid: 'DenyInsecureTransport',
              Effect: 'Deny',
              Principal: '*',
              Action: ['s3:*'],
              Resource: [`arn:aws:s3:::${target.bucket}`, `arn:aws:s3:::${target.bucket}/*`],
              Condition: { Bool: { 'aws:SecureTransport': 'false' } },
            },
          ],
        }),
      });
    }
    if (operation === 'cloudfront get-origin-access-control') {
      return successJson({
        OriginAccessControl: {
          Id: oacId,
          OriginAccessControlConfig: {
            OriginAccessControlOriginType: 's3',
            SigningBehavior: 'always',
            SigningProtocol: 'sigv4',
          },
        },
      });
    }
    if (operation === 'cloudfront get-distribution') {
      return successJson({
        Distribution: {
          Id: target.distributionId,
          DomainName: target.distributionDomain,
          Status: 'Deployed',
          ARN: `arn:aws:cloudfront::${TEST_ACCOUNT}:distribution/${target.distributionId}`,
          DistributionConfig: {
            Enabled: true,
            Origins: {
              Quantity: 1,
              Items: [{
                Id: 'S3MediaOrigin',
                DomainName: `${target.bucket}.s3.${target.region}.amazonaws.com`,
                OriginAccessControlId: oacId,
                S3OriginConfig: { OriginAccessIdentity: '' },
              }],
            },
            CacheBehaviors: { Quantity: 0 },
            OriginGroups: { Quantity: 0 },
            DefaultCacheBehavior: {
              TargetOriginId: 'S3MediaOrigin',
              AllowedMethods: {
                Quantity: 2,
                Items: ['GET', 'HEAD'],
                CachedMethods: { Quantity: 2, Items: ['GET', 'HEAD'] },
              },
              CachePolicyId: 'b2884449-e4de-46a7-ac36-70bc7f1ddd6d',
              ResponseHeadersPolicyId: 'e61eb60c-9c35-4d20-a928-2b84e02af89c',
              ViewerProtocolPolicy: 'redirect-to-https',
              Compress: false,
            },
          },
        },
      });
    }
    throw new Error(`Unexpected mocked AWS operation: ${operation}`);
  };
}

test('publication target attestation proves the complete private-origin topology offline', async () => {
  let anonymousChecks = 0;
  const result = await attestPublicationTarget({
    runner: buildAttestationRunner(TARGET),
    target: TARGET,
    fetchImpl: async (url, options) => {
      anonymousChecks += 1;
      assert.equal(url, `https://${TARGET.bucket}.s3.${TARGET.region}.amazonaws.com/`);
      assert.equal(options.method, 'HEAD');
      return new Response(null, { status: 403 });
    },
  });
  assert.equal(result.target.distributionId, TARGET.distributionId);
  assert.equal(result.expectedBucketOwner, TEST_ACCOUNT);
  assert.equal(anonymousChecks, 1);
});

test('conditional upload uses create-only semantics and verifies existing full bytes', async () => {
  await withTemporaryRoot((root) => {
    createLocalRelease(root);
    const object = buildPublicationPlan({ root }).objects[0];
    const checksum = Buffer.from(object.sha256, 'hex').toString('base64');
    const calls = [];
    const uploaded = publishObjectConditionally({
      target: TARGET,
      expectedBucketOwner: TEST_ACCOUNT,
      object,
      runner: (args) => {
        calls.push(args);
        if (args[1] === 'put-object') return successJson({ ChecksumSHA256: checksum });
        if (args[1] === 'head-object') {
          return successJson({
            ContentLength: object.bytes,
            ContentType: object.contentType,
            CacheControl: object.cacheControl,
            ChecksumSHA256: checksum,
          });
        }
        throw new Error('Unexpected upload mock call');
      },
    });
    assert.equal(uploaded.result, 'uploaded');
    const put = calls.find((args) => args[1] === 'put-object');
    assert.equal(put[put.indexOf('--if-none-match') + 1], '*');
    assert.equal(put[put.indexOf('--content-type') + 1], CONTENT_TYPE);
    assert.equal(put[put.indexOf('--cache-control') + 1], CACHE_CONTROL);

    const existing = publishObjectConditionally({
      target: TARGET,
      expectedBucketOwner: TEST_ACCOUNT,
      object,
      runner: (args) => {
        if (args[1] === 'put-object') {
          return { status: 255, stdout: '', stderr: 'PreconditionFailed 412' };
        }
        if (args[1] === 'head-object') {
          return successJson({
            ContentLength: object.bytes,
            ContentType: object.contentType,
            CacheControl: object.cacheControl,
            ChecksumSHA256: checksum,
          });
        }
        if (args[1] === 'get-object') {
          fs.writeFileSync(args.at(-1), fs.readFileSync(object.localPath));
          return successJson({ ChecksumSHA256: checksum });
        }
        throw new Error('Unexpected existing-object mock call');
      },
    });
    assert.equal(existing.result, 'verified-existing');

    assert.throws(() => publishObjectConditionally({
      target: TARGET,
      expectedBucketOwner: TEST_ACCOUNT,
      object,
      runner: (args) => {
        if (args[1] === 'put-object') {
          return { status: 255, stdout: '', stderr: 'PreconditionFailed 412' };
        }
        if (args[1] === 'head-object') {
          return successJson({
            ContentLength: object.bytes,
            ContentType: object.contentType,
            CacheControl: object.cacheControl,
            ChecksumSHA256: checksum,
          });
        }
        if (args[1] === 'get-object') {
          fs.writeFileSync(args.at(-1), Buffer.alloc(object.bytes, 0));
          return successJson({});
        }
        throw new Error('Unexpected mismatch mock call');
      },
    }), /SHA-256 mismatch/);
  });
});

test('publisher cannot reach PutObject when caller attestation reports root', async () => {
  await withTemporaryRoot(async (root) => {
    createLocalRelease(root);
    const calls = [];
    await assert.rejects(() => publishKalmanNarration({
      root,
      execute: true,
      ...TARGET,
      runner: (args) => {
        calls.push(args);
        if (args[0] === 'sts') {
          return successJson({ Account: TEST_ACCOUNT, Arn: `arn:aws:iam::${TEST_ACCOUNT}:root` });
        }
        throw new Error('Attestation did not stop before another operation');
      },
      fetchImpl: async () => new Response(null, { status: 403 }),
    }), /root credentials/);
    assert.equal(calls.some((args) => args[1] === 'put-object'), false);
  });
});

test('installer validates the complete receipt before one atomic public-manifest change', async () => {
  await withTemporaryRoot((root) => {
    createPublishedFixture(root);
    const common = {
      root,
      ...TARGET,
      receiptPath: 'infra/narration/publication-receipt.json',
    };
    const dry = installKalmanNarration(common);
    assert.equal(dry.mode, 'dry-run');
    assert.equal(dry.changedCount, 1);
    assert.equal(JSON.parse(fs.readFileSync(path.join(root, PUBLIC_MANIFEST_PATH), 'utf8')).status, 'pending');

    const installed = installKalmanNarration({ ...common, execute: true });
    assert.equal(installed.changedCount, 1);
    const manifest = JSON.parse(fs.readFileSync(path.join(root, PUBLIC_MANIFEST_PATH), 'utf8'));
    assertPublicManifest(manifest);
    assert.equal(JSON.stringify(manifest).includes('local_file'), false);

    const resumed = installKalmanNarration({ ...common, execute: true });
    assert.equal(resumed.sourceType, 'published-current');
    assert.equal(resumed.changedCount, 0);
  });
});

test('installer and verifier CLIs require the exact private and public target', () => {
  assert.throws(() => parseInstallationArguments([]), /--stack is required/);
  assert.throws(() => parseVerificationArguments([]), /--stack is required/);
  const argumentsList = [
    '--stack', TARGET.stack,
    '--region', TARGET.region,
    '--bucket', TARGET.bucket,
    '--distribution-id', TARGET.distributionId,
    '--distribution-domain', TARGET.distributionDomain,
  ];
  assert.equal(parseInstallationArguments(argumentsList).execute, false);
  assert.equal(parseVerificationArguments(argumentsList).distributionId, TARGET.distributionId);
});

function responseHeaders(track, extra = {}) {
  return {
    'content-type': CONTENT_TYPE,
    'cache-control': CACHE_CONTROL,
    'content-length': String(track.bytes),
    'access-control-allow-origin': '*',
    'accept-ranges': 'bytes',
    ...extra,
  };
}

test('verifier binds the receipt CDN and proves headers, ranges, hashes, CORS, and origin denial', async () => {
  await withTemporaryRoot(async (root) => {
    const { publication, receipt } = createPublishedFixture(root);
    installKalmanNarration({
      root,
      execute: true,
      ...TARGET,
      receiptPath: 'infra/narration/publication-receipt.json',
    });
    assert.equal(bindLiveBaseUrl(`https://${TARGET.distributionDomain}`, receipt), `https://${TARGET.distributionDomain}`);
    assert.throws(
      () => bindLiveBaseUrl('https://mirror.example.net', receipt),
      /receipt-bound CDN domain/
    );

    const audioByKey = new Map(publication.objects.map((object) => [
      object.objectKey,
      fs.readFileSync(object.localPath),
    ]));
    let directDenials = 0;
    const result = await verifyKalmanNarration({
      root,
      baseUrl: `https://${TARGET.distributionDomain}`,
      ...TARGET,
      receiptPath: 'infra/narration/publication-receipt.json',
      fetchImpl: async (url, options = {}) => {
        const parsed = new URL(url);
        if (parsed.hostname.endsWith('.amazonaws.com')) {
          directDenials += 1;
          return new Response(null, { status: 403 });
        }
        const objectKey = decodeURIComponent(parsed.pathname.slice(1));
        const body = audioByKey.get(objectKey);
        assert(body, `Unexpected CDN key ${objectKey}`);
        const track = publication.manifest.tracks[objectKey.includes('/aoede-') ? 'aoede' : 'algieba'];
        if (options.method === 'HEAD') {
          return new Response(null, { status: 200, headers: responseHeaders(track) });
        }
        if (options.headers?.Range) {
          const end = Math.min(1_023, body.length - 1);
          return new Response(body.subarray(0, end + 1), {
            status: 206,
            headers: responseHeaders(track, {
              'content-length': String(end + 1),
              'content-range': `bytes 0-${end}/${body.length}`,
            }),
          });
        }
        return new Response(body, { status: 200, headers: responseHeaders(track) });
      },
    });
    assert.equal(result.cdnVerified, true);
    assert.equal(result.originDenialVerified, true);
    assert.equal(directDenials, TRACK_IDS.length);
  });
});

test('live verifier fails closed when the CDN omits CORS', async () => {
  await withTemporaryRoot(async (root) => {
    const { publication } = createPublishedFixture(root);
    installKalmanNarration({
      root,
      execute: true,
      ...TARGET,
      receiptPath: 'infra/narration/publication-receipt.json',
    });
    const firstTrack = publication.manifest.tracks.aoede;
    await assert.rejects(() => verifyKalmanNarration({
      root,
      baseUrl: `https://${TARGET.distributionDomain}`,
      ...TARGET,
      receiptPath: 'infra/narration/publication-receipt.json',
      fetchImpl: async () => new Response(null, {
        status: 200,
        headers: {
          'content-type': CONTENT_TYPE,
          'cache-control': CACHE_CONTROL,
          'content-length': String(firstTrack.bytes),
          'accept-ranges': 'bytes',
        },
      }),
    }), /CORS/);
  });
});
