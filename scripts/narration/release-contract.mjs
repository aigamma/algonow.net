import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { narration } from '../../src/content/kalman-covariance-correction.narration.js';
import {
  CACHE_CONTROL,
  CONTENT_TYPE,
  PILOT_SLUG,
  PILOT_SOURCE_PATH,
  PLAYBACK_POLICY,
  PUZZLE_NARRATION_VOICES,
  buildPuzzleNarrationPlan,
  manifestMatchesPlan,
  releaseOutputDirectory,
  sha256,
  stableJson,
  writeFileAtomic,
} from './puzzle-narration-pipeline.mjs';

const MODULE_PATH = fileURLToPath(import.meta.url);
export const ROOT = path.resolve(path.dirname(MODULE_PATH), '..', '..');
export const PUBLIC_MANIFEST_PATH = 'src/data/narration/kalman-covariance-correction.json';
export const DEFAULT_RECEIPT_PATH = 'infra/narration/publication-receipt.json';
export const PUBLICATION_SCOPE = 'algonow.net kalman covariance correction narration pilot';
export const EXPECTED_DOMAIN_NAME = 'algonow.net';
export const EXPECTED_ENVIRONMENT = 'production';
export const EXPECTED_CACHE_POLICY_ID = 'b2884449-e4de-46a7-ac36-70bc7f1ddd6d';
export const EXPECTED_RESPONSE_HEADERS_POLICY_ID = 'e61eb60c-9c35-4d20-a928-2b84e02af89c';
export const TRACK_IDS = Object.freeze(Object.keys(PUZZLE_NARRATION_VOICES));

const HASH_PATTERN = /^[a-f0-9]{64}$/;
const DISTRIBUTION_ID_PATTERN = /^[A-Z0-9]{8,32}$/;
const CLOUDFRONT_DOMAIN_PATTERN = /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.cloudfront\.net$/;

const PUBLIC_MANIFEST_FIELDS = new Set([
  'schema_version',
  'content_id',
  'source_path',
  'source_sha256',
  'source_characters',
  'recipe',
  'recipe_sha256',
  'release_sha256',
  'generated_at',
  'generated_characters',
  'default_voice',
  'default_rate',
  'rate_options',
  'request_chunks',
  'assembly',
  'segments',
  'tracks',
]);
const RECIPE_REQUIRED_FIELDS = new Set([
  'schema_version',
  'provider',
  'model',
  'language_code',
  'input_type',
  'audio_encoding',
  'speaking_rate',
  'pitch',
  'adapter',
  'normalizer',
  'tracks',
]);
const RECIPE_ALLOWED_FIELDS = new Set([
  ...RECIPE_REQUIRED_FIELDS,
  'request_segmentation',
  'multipart_assembly',
  'provider_sentence_fragmentation',
]);
const RECIPE_TRACK_FIELDS = new Set(['language_code', 'voice_id']);
const RATE_OPTION_FIELDS = new Set(['value', 'label']);
const REQUEST_SEGMENTATION_FIELDS = new Set(['mode', 'maximum_utf8_bytes', 'preferred_boundaries']);
const ASSEMBLY_FIELDS = new Set(['mode', 'audio_codec', 'container']);
const PROVIDER_FRAGMENTATION_FIELDS = new Set([
  'mode',
  'scope',
  'trigger_maximum_utf8_bytes',
  'maximum_utf8_bytes',
  'preferred_boundaries',
]);
const REQUEST_CHUNK_FIELDS = new Set(['id', 'index', 'characters', 'utf8_bytes', 'sha256']);
const SEGMENT_FIELDS = new Set([
  'id',
  'label',
  'source_fields',
  'excluded_fields',
  'utf8_bytes',
  'sha256',
]);
const TRACK_REQUIRED_FIELDS = new Set([
  'label',
  'gender',
  'language_code',
  'voice_id',
  'object_key',
  'content_type',
  'cache_control',
  'bytes',
  'sha256',
]);
const TRACK_ALLOWED_FIELDS = new Set([...TRACK_REQUIRED_FIELDS, 'request_parts']);
const REQUEST_PART_FIELDS = new Set(['request_index', 'request_sha256', 'bytes', 'sha256']);

const RECEIPT_FIELDS = new Set([
  'schema_version',
  'scope',
  'cloudformation_stack',
  'aws_region',
  'cloudfront_distribution_id',
  'cloudfront_distribution_domain',
  'private_origin_binding_sha256',
  'published_at',
  'publication_sha256',
  'page_count',
  'release_count',
  'preexisting_manifest_count',
  'object_count',
  'uploaded_count',
  'verified_existing_count',
  'total_bytes',
  'objects',
]);
const RECEIPT_OBJECT_FIELDS = new Set([
  'stable_id',
  'slug',
  'track_id',
  'source_sha256',
  'recipe_sha256',
  'release_sha256',
  'object_key',
  'bytes',
  'sha256',
  'content_type',
  'cache_control',
  'result',
]);

const FORBIDDEN_FIELD_NAMES = new Set([
  'local_file',
  'local_path',
  'file_path',
  'absolute_path',
  'operator_path',
  'bucket',
  'bucket_name',
  'private_bucket',
  'origin_bucket',
  'account',
  'account_id',
  'account_identifier',
  'aws_account_id',
  'credential',
  'credentials',
  'access_token',
  'refresh_token',
  'secret',
  'secret_key',
  'private_key',
]);

function compareStrings(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function resolveWithinRoot(root, requestedPath, label) {
  assert(typeof requestedPath === 'string' && requestedPath, `${label} requires a path`);
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(root, requestedPath);
  assert(
    resolved === resolvedRoot || resolved.startsWith(`${resolvedRoot}${path.sep}`),
    `${label} must stay inside the repository root`
  );
  return resolved;
}

export function readJsonFile(filePath, label) {
  let value;
  try {
    value = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`${label} is invalid JSON: ${error.message}`);
  }
  assert(isPlainObject(value), `${label} must be a JSON object`);
  return value;
}

function assertAllowedFields(value, allowed, label, required = new Set()) {
  assert(isPlainObject(value), `${label} must be an object`);
  for (const key of Object.keys(value)) {
    assert(allowed.has(key), `${label} contains unapproved field ${key}`);
  }
  for (const key of required) {
    assert(Object.hasOwn(value, key), `${label} is missing required field ${key}`);
  }
}

function assertExactKeySet(value, expected, label) {
  assertAllowedFields(value, expected, label, expected);
}

function assertStringArray(value, label) {
  assert(Array.isArray(value), `${label} must be an array`);
  assert(value.every((item) => typeof item === 'string'), `${label} must contain only strings`);
}

export function stripLocalFiles(value) {
  if (Array.isArray(value)) return value.map(stripLocalFiles);
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== 'local_file')
      .map(([key, item]) => [key, stripLocalFiles(item)])
  );
}

function forbiddenStringReason(value, privateValues, fieldPath) {
  if (/^[A-Za-z]:[\\/]/.test(value) || /^\\\\/.test(value) || /^file:\/\//i.test(value)) {
    return 'an operator-machine path';
  }
  if (/(?:^|[\\/])(?:Users|home|tmp)[\\/]/i.test(value)) return 'an operator-machine path';
  if (/s3:\/\//i.test(value) || /\.s3(?:[.-][a-z0-9-]+)?\.amazonaws\.com/i.test(value)) {
    return 'a private object-store origin';
  }
  if (/(?:authorization\s*:\s*bearer|access[_-]?token|refresh[_-]?token|private[_-]?key|secret[_-]?key)/i.test(value)) {
    return 'credential material';
  }
  if (/(?:AKIA|ASIA)[A-Z0-9]{16}/.test(value)) return 'an AWS access-key identifier';
  const identifierSafeField = /(?:sha256|object_key|cloudfront_distribution_id)$/.test(fieldPath);
  if (!identifierSafeField && !HASH_PATTERN.test(value) && /(^|\D)\d{12}(\D|$)/.test(value)) {
    return 'a cloud account identifier';
  }
  for (const privateValue of privateValues) {
    if (privateValue && value.includes(privateValue)) return 'a private target value';
  }
  return '';
}

export function assertNoPrivateData(value, {
  label = 'Public artifact',
  privateValues = [],
  fieldPath = 'root',
} = {}) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoPrivateData(item, {
      label,
      privateValues,
      fieldPath: `${fieldPath}[${index}]`,
    }));
    return;
  }
  if (isPlainObject(value)) {
    for (const [key, item] of Object.entries(value)) {
      assert(!FORBIDDEN_FIELD_NAMES.has(key), `${label} contains forbidden field ${fieldPath}.${key}`);
      assertNoPrivateData(item, {
        label,
        privateValues,
        fieldPath: `${fieldPath}.${key}`,
      });
    }
    return;
  }
  if (typeof value === 'string') {
    const reason = forbiddenStringReason(value, privateValues, fieldPath);
    assert(!reason, `${label} contains ${reason} at ${fieldPath}`);
  }
}

export function buildPilotPlan() {
  return buildPuzzleNarrationPlan({
    slug: PILOT_SLUG,
    narration,
    sourcePath: PILOT_SOURCE_PATH,
  });
}

export function expectedTrackObjectKey(plan, trackId, audioHash) {
  assert(PUZZLE_NARRATION_VOICES[trackId], `Unknown narration track ${trackId}`);
  assert(HASH_PATTERN.test(audioHash || ''), `${trackId}: audio SHA-256 is invalid`);
  return `narration/v1/puzzles/${plan.slug}/${plan.releasePrefix}/${trackId}-${audioHash.slice(0, 16)}.mp3`;
}

export function assertPublicManifest(manifest, plan = buildPilotPlan(), label = 'Public narration manifest') {
  assertExactKeySet(manifest, PUBLIC_MANIFEST_FIELDS, label);
  assertAllowedFields(manifest.recipe, RECIPE_ALLOWED_FIELDS, `${label}.recipe`, RECIPE_REQUIRED_FIELDS);
  assertExactKeySet(
    manifest.recipe.tracks,
    new Set(TRACK_IDS),
    `${label}.recipe.tracks`
  );
  for (const trackId of TRACK_IDS) {
    assertExactKeySet(
      manifest.recipe.tracks[trackId],
      RECIPE_TRACK_FIELDS,
      `${label}.recipe.tracks.${trackId}`
    );
  }
  if (Object.hasOwn(manifest.recipe, 'request_segmentation')) {
    assertExactKeySet(
      manifest.recipe.request_segmentation,
      REQUEST_SEGMENTATION_FIELDS,
      `${label}.recipe.request_segmentation`
    );
    assertStringArray(
      manifest.recipe.request_segmentation.preferred_boundaries,
      `${label}.recipe.request_segmentation.preferred_boundaries`
    );
  }
  if (Object.hasOwn(manifest.recipe, 'multipart_assembly')) {
    assertExactKeySet(
      manifest.recipe.multipart_assembly,
      ASSEMBLY_FIELDS,
      `${label}.recipe.multipart_assembly`
    );
  }
  if (Object.hasOwn(manifest.recipe, 'provider_sentence_fragmentation')) {
    assertExactKeySet(
      manifest.recipe.provider_sentence_fragmentation,
      PROVIDER_FRAGMENTATION_FIELDS,
      `${label}.recipe.provider_sentence_fragmentation`
    );
    assertStringArray(
      manifest.recipe.provider_sentence_fragmentation.preferred_boundaries,
      `${label}.recipe.provider_sentence_fragmentation.preferred_boundaries`
    );
  }
  assert(Array.isArray(manifest.rate_options), `${label}.rate_options must be an array`);
  for (let index = 0; index < manifest.rate_options.length; index += 1) {
    assertExactKeySet(
      manifest.rate_options[index],
      RATE_OPTION_FIELDS,
      `${label}.rate_options[${index}]`
    );
  }
  assert(Array.isArray(manifest.request_chunks), `${label}.request_chunks must be an array`);
  for (let index = 0; index < manifest.request_chunks.length; index += 1) {
    assertExactKeySet(
      manifest.request_chunks[index],
      REQUEST_CHUNK_FIELDS,
      `${label}.request_chunks[${index}]`
    );
  }
  assertAllowedFields(manifest.assembly, ASSEMBLY_FIELDS, `${label}.assembly`, new Set(['mode']));
  assert(Array.isArray(manifest.segments), `${label}.segments must be an array`);
  for (let index = 0; index < manifest.segments.length; index += 1) {
    const segment = manifest.segments[index];
    assertExactKeySet(segment, SEGMENT_FIELDS, `${label}.segments[${index}]`);
    assertStringArray(segment.source_fields, `${label}.segments[${index}].source_fields`);
    assertStringArray(segment.excluded_fields, `${label}.segments[${index}].excluded_fields`);
  }
  assertExactKeySet(manifest.tracks, new Set(TRACK_IDS), `${label}.tracks`);
  for (const trackId of TRACK_IDS) {
    const track = manifest.tracks[trackId];
    assertAllowedFields(track, TRACK_ALLOWED_FIELDS, `${label}.tracks.${trackId}`, TRACK_REQUIRED_FIELDS);
    if (Object.hasOwn(track, 'request_parts')) {
      assert(Array.isArray(track.request_parts), `${label}.tracks.${trackId}.request_parts must be an array`);
      for (let index = 0; index < track.request_parts.length; index += 1) {
        assertExactKeySet(
          track.request_parts[index],
          REQUEST_PART_FIELDS,
          `${label}.tracks.${trackId}.request_parts[${index}]`
        );
      }
    }
  }

  assertNoPrivateData(manifest, { label });
  assert(manifest.default_voice === 'aoede', `${label}: default voice must be aoede`);
  assert(manifest.default_rate === 1.25, `${label}: default rate must be 1.25`);
  assert(
    stableJson(manifest.rate_options) === stableJson(PLAYBACK_POLICY.rate_options),
    `${label}: rate controls must be exactly 1.00x, 1.25x, 1.50x, and 1.75x`
  );
  assert(
    typeof manifest.generated_at === 'string' && !Number.isNaN(Date.parse(manifest.generated_at)),
    `${label}: generated_at must be an ISO timestamp`
  );
  assert(manifestMatchesPlan(manifest, plan), `${label} does not match the current source and recipe`);
  for (const trackId of TRACK_IDS) {
    const track = manifest.tracks[trackId];
    const voice = PUZZLE_NARRATION_VOICES[trackId];
    assert(track.label === voice.label, `${label}: ${trackId} label mismatch`);
    assert(track.gender === voice.gender, `${label}: ${trackId} gender mismatch`);
    assert(track.language_code === voice.language_code, `${label}: ${trackId} language mismatch`);
    assert(track.voice_id === voice.voice_id, `${label}: ${trackId} voice ID mismatch`);
    assert(track.content_type === CONTENT_TYPE, `${label}: ${trackId} content type mismatch`);
    assert(track.cache_control === CACHE_CONTROL, `${label}: ${trackId} cache policy mismatch`);
    assert(
      track.object_key === expectedTrackObjectKey(plan, trackId, track.sha256),
      `${label}: ${trackId} object key mismatch`
    );
  }
  return manifest;
}

export function assertPendingPublicManifest(manifest, label = 'Pending narration manifest') {
  const fields = new Set([
    'schema_version',
    'status',
    'content_id',
    'source_path',
    'default_voice',
    'default_rate',
    'tracks',
  ]);
  assertExactKeySet(manifest, fields, label);
  assert(manifest.schema_version === 1, `${label}: schema version mismatch`);
  assert(manifest.status === 'pending', `${label}: status must be pending`);
  assert(manifest.content_id === `puzzle:${PILOT_SLUG}`, `${label}: content ID mismatch`);
  assert(manifest.source_path === PILOT_SOURCE_PATH, `${label}: source path mismatch`);
  assert(manifest.default_voice === 'aoede', `${label}: default voice mismatch`);
  assert(manifest.default_rate === 1.25, `${label}: default rate mismatch`);
  assertExactKeySet(manifest.tracks, new Set(), `${label}.tracks`);
  assertNoPrivateData(manifest, { label });
  return manifest;
}

export function loadLocalRelease({ root = ROOT, plan = buildPilotPlan() } = {}) {
  const outputDirectory = releaseOutputDirectory(root, plan);
  const manifestPath = path.join(outputDirectory, 'manifest-entry.json');
  assert(fs.existsSync(manifestPath), `${plan.slug}: local release manifest is missing`);
  const localManifest = readJsonFile(manifestPath, `${plan.slug}: local release manifest`);
  assert(
    manifestMatchesPlan(localManifest, plan, { allowLocalFiles: true }),
    `${plan.slug}: local release manifest does not match the current source and recipe`
  );
  const publicManifest = stripLocalFiles(localManifest);
  assertPublicManifest(publicManifest, plan);

  const tracks = {};
  for (const trackId of TRACK_IDS) {
    const track = localManifest.tracks[trackId];
    assert(typeof track.local_file === 'string' && track.local_file, `${trackId}: local_file is missing`);
    const expectedFileName = `${trackId}-${track.sha256.slice(0, 16)}.mp3`;
    const expectedPath = path.join(outputDirectory, expectedFileName);
    const localPath = resolveWithinRoot(root, track.local_file, `${trackId}: local file`);
    assert(localPath === expectedPath, `${trackId}: local file path is not release-addressed`);
    assert(fs.existsSync(localPath), `${trackId}: local MP3 is missing`);
    const stat = fs.statSync(localPath);
    assert(stat.isFile(), `${trackId}: local MP3 path is not a file`);
    assert(stat.size === track.bytes, `${trackId}: local MP3 byte count mismatch`);
    const body = fs.readFileSync(localPath);
    assert(sha256(body) === track.sha256, `${trackId}: local MP3 SHA-256 mismatch`);
    tracks[trackId] = { ...track, localPath };
  }
  return { plan, localManifest, publicManifest, tracks, manifestPath };
}

export function normalizePublicationTarget(target = {}) {
  const normalized = {
    stack: String(target.stack || '').trim(),
    region: String(target.region || '').trim(),
    bucket: String(target.bucket || '').trim(),
    distributionId: String(target.distributionId || '').trim(),
    distributionDomain: String(target.distributionDomain || '').trim().toLowerCase(),
  };
  assert(/^[A-Za-z][-A-Za-z0-9]{0,127}$/.test(normalized.stack), 'Publication stack name is invalid');
  assert(/^[a-z]{2}(?:-gov)?-[a-z]+-\d+$/.test(normalized.region), 'Publication region is invalid');
  assert(
    normalized.bucket.length >= 3
      && normalized.bucket.length <= 63
      && /^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(normalized.bucket),
    'Publication bucket name is invalid'
  );
  assert(DISTRIBUTION_ID_PATTERN.test(normalized.distributionId), 'CloudFront distribution ID is invalid');
  assert(CLOUDFRONT_DOMAIN_PATTERN.test(normalized.distributionDomain), 'CloudFront distribution domain is invalid');
  return normalized;
}

export function privateOriginBindingSha256(target) {
  const normalized = normalizePublicationTarget(target);
  return sha256(stableJson({
    aws_region: normalized.region,
    cloudformation_stack: normalized.stack,
    cloudfront_distribution_domain: normalized.distributionDomain,
    cloudfront_distribution_id: normalized.distributionId,
    private_bucket: normalized.bucket,
  }));
}

export function receiptObjectsForManifest(manifest, resultsByTrack = {}) {
  return TRACK_IDS.map((trackId) => {
    const track = manifest.tracks[trackId];
    return {
      stable_id: manifest.content_id,
      slug: PILOT_SLUG,
      track_id: trackId,
      source_sha256: manifest.source_sha256,
      recipe_sha256: manifest.recipe_sha256,
      release_sha256: manifest.release_sha256,
      object_key: track.object_key,
      bytes: track.bytes,
      sha256: track.sha256,
      content_type: track.content_type,
      cache_control: track.cache_control,
      result: resultsByTrack[trackId] || 'uploaded',
    };
  }).sort((left, right) => compareStrings(left.object_key, right.object_key));
}

export function publicationIdentity(objects) {
  return objects.map(({ result: _result, ...identity }) => identity);
}

export function buildPublicationReceipt({
  manifest,
  target,
  resultsByTrack,
  publishedAt = new Date().toISOString(),
} = {}) {
  const normalizedTarget = normalizePublicationTarget(target);
  assertPublicManifest(manifest);
  assertNoPrivateData(manifest, {
    label: 'Public narration manifest',
    privateValues: [normalizedTarget.bucket],
  });
  const objects = receiptObjectsForManifest(manifest, resultsByTrack);
  for (const object of objects) {
    assert(
      ['uploaded', 'verified-existing'].includes(object.result),
      `${object.track_id}: publication result is invalid`
    );
  }
  return {
    schema_version: 1,
    scope: PUBLICATION_SCOPE,
    cloudformation_stack: normalizedTarget.stack,
    aws_region: normalizedTarget.region,
    cloudfront_distribution_id: normalizedTarget.distributionId,
    cloudfront_distribution_domain: normalizedTarget.distributionDomain,
    private_origin_binding_sha256: privateOriginBindingSha256(normalizedTarget),
    published_at: publishedAt,
    publication_sha256: sha256(stableJson(publicationIdentity(objects))),
    page_count: 1,
    release_count: 1,
    preexisting_manifest_count: 0,
    object_count: objects.length,
    uploaded_count: objects.filter((object) => object.result === 'uploaded').length,
    verified_existing_count: objects.filter((object) => object.result === 'verified-existing').length,
    total_bytes: objects.reduce((total, object) => total + object.bytes, 0),
    objects,
  };
}

export function validatePublicationReceipt(receipt, {
  manifest,
  target,
  label = 'Publication receipt',
} = {}) {
  const normalizedTarget = normalizePublicationTarget(target);
  assertPublicManifest(manifest);
  assertNoPrivateData(manifest, {
    label: 'Public narration manifest',
    privateValues: [normalizedTarget.bucket],
  });
  assertExactKeySet(receipt, RECEIPT_FIELDS, label);
  assertNoPrivateData(receipt, {
    label,
    privateValues: [normalizedTarget.bucket],
  });
  assert(receipt.schema_version === 1, `${label}: schema version mismatch`);
  assert(receipt.scope === PUBLICATION_SCOPE, `${label}: scope mismatch`);
  assert(receipt.cloudformation_stack === normalizedTarget.stack, `${label}: stack mismatch`);
  assert(receipt.aws_region === normalizedTarget.region, `${label}: region mismatch`);
  assert(
    receipt.cloudfront_distribution_id === normalizedTarget.distributionId,
    `${label}: distribution ID mismatch`
  );
  assert(
    receipt.cloudfront_distribution_domain === normalizedTarget.distributionDomain,
    `${label}: distribution domain mismatch`
  );
  assert(
    receipt.private_origin_binding_sha256 === privateOriginBindingSha256(normalizedTarget),
    `${label}: private origin binding mismatch`
  );
  assert(
    typeof receipt.published_at === 'string' && !Number.isNaN(Date.parse(receipt.published_at)),
    `${label}: published_at is invalid`
  );
  assert(receipt.page_count === 1, `${label}: page count mismatch`);
  assert(receipt.release_count === 1, `${label}: release count mismatch`);
  assert(receipt.preexisting_manifest_count === 0, `${label}: preexisting manifest count mismatch`);
  assert(receipt.object_count === TRACK_IDS.length, `${label}: object count mismatch`);
  assert(Array.isArray(receipt.objects), `${label}: object inventory is missing`);
  assert(receipt.objects.length === TRACK_IDS.length, `${label}: object inventory count mismatch`);
  for (let index = 0; index < receipt.objects.length; index += 1) {
    assertExactKeySet(receipt.objects[index], RECEIPT_OBJECT_FIELDS, `${label}.objects[${index}]`);
  }
  const expected = receiptObjectsForManifest(
    manifest,
    Object.fromEntries(receipt.objects.map((object) => [object.track_id, object.result]))
  );
  assert(
    stableJson(receipt.objects) === stableJson(expected),
    `${label}: release inventory does not match the public manifest`
  );
  const uploaded = receipt.objects.filter((object) => object.result === 'uploaded').length;
  const existing = receipt.objects.filter((object) => object.result === 'verified-existing').length;
  assert(receipt.uploaded_count === uploaded, `${label}: uploaded count mismatch`);
  assert(receipt.verified_existing_count === existing, `${label}: verified-existing count mismatch`);
  assert(uploaded + existing === receipt.object_count, `${label}: object result coverage mismatch`);
  const totalBytes = receipt.objects.reduce((total, object) => total + object.bytes, 0);
  assert(receipt.total_bytes === totalBytes, `${label}: total byte count mismatch`);
  assert(HASH_PATTERN.test(receipt.publication_sha256 || ''), `${label}: publication SHA-256 is invalid`);
  assert(
    receipt.publication_sha256 === sha256(stableJson(publicationIdentity(receipt.objects))),
    `${label}: publication SHA-256 mismatch`
  );
  return receipt;
}

export function loadPublicationReceipt({
  root = ROOT,
  receiptPath = DEFAULT_RECEIPT_PATH,
  manifest,
  target,
} = {}) {
  const absolutePath = resolveWithinRoot(root, receiptPath, 'Publication receipt path');
  assert(fs.existsSync(absolutePath), `Publication receipt is missing: ${receiptPath}`);
  const receipt = readJsonFile(absolutePath, 'Publication receipt');
  return validatePublicationReceipt(receipt, { manifest, target });
}

export function loadPublicManifest({ root = ROOT, plan = buildPilotPlan(), allowPending = false } = {}) {
  const filePath = resolveWithinRoot(root, PUBLIC_MANIFEST_PATH, 'Public narration manifest path');
  assert(fs.existsSync(filePath), 'Public narration manifest is missing');
  const manifest = readJsonFile(filePath, 'Public narration manifest');
  if (manifest.status === 'pending') {
    assert(allowPending, 'Public narration manifest is still pending');
    assertPendingPublicManifest(manifest);
  } else {
    assertPublicManifest(manifest, plan);
  }
  return { manifest, filePath };
}

export function installPublicManifest({ root = ROOT, manifest, execute = false } = {}) {
  const plan = buildPilotPlan();
  assertPublicManifest(manifest, plan);
  const { manifest: current, filePath } = loadPublicManifest({ root, plan, allowPending: true });
  if (current.status !== 'pending') assertPublicManifest(current, plan);
  const updatedText = `${JSON.stringify(manifest, null, 2)}\n`;
  const currentText = fs.readFileSync(filePath, 'utf8');
  const changed = currentText !== updatedText;
  if (execute && changed) writeFileAtomic(filePath, updatedText, { encoding: 'utf8' });
  return { changed, filePath };
}

export {
  CACHE_CONTROL,
  CONTENT_TYPE,
  PILOT_SLUG,
  PLAYBACK_POLICY,
  PUZZLE_NARRATION_VOICES,
  sha256,
  stableJson,
  writeFileAtomic,
};
