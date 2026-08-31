import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  PUZZLE_NARRATION_SCHEMA_VERSION,
  buildPuzzleNarrationSegments,
  buildPuzzleNarrationText,
} from '../../src/lib/puzzleNarration.js';

export const IMPLEMENTATION_CONTRACT = Object.freeze({
  source_path: 'D:\\spokenhistory.org\\infra\\narration\\CROSS_REPOSITORY_IMPLEMENTATION_SPEC.md',
  snapshot_sha256: '003d9768756c951518b3e6be8b49bb1ade1c5fa562d2e8a6fc8ed0d4a38fe676',
  audited_at: '2026-08-30 20:58:27 ET',
});

export const APPROVED_BILLING_PROJECT = 'aigamma';
export const PILOT_SLUG = 'kalman-covariance-correction';
export const PILOT_SOURCE_PATH = 'src/content/kalman-covariance-correction.narration.js';
export const LIST_PRICE_PER_MILLION_CHARACTERS = 30;
export const MAX_SYNCHRONOUS_INPUT_BYTES = 5_000;
export const MAX_PROVIDER_SENTENCE_BYTES = 750;
export const MAX_PROVIDER_FRAGMENT_BYTES = 600;
export const MAX_REQUESTS_PER_MINUTE = 60;
export const MIN_REQUEST_INTERVAL_MS = 60_000 / MAX_REQUESTS_PER_MINUTE;
export const MAX_TRANSIENT_SYNTHESIS_ATTEMPTS = 4;
export const TRANSIENT_RETRY_BASE_DELAY_MS = 1_000;
export const GOOGLE_REQUEST_TIMEOUT_MS = 60_000;
export const CACHE_CONTROL = 'public,max-age=31536000,immutable';
export const CONTENT_TYPE = 'audio/mpeg';
export const GENERATION_LOCK_FILE = '.generation.lock';
export const ATTEMPT_JOURNAL_FILE = 'attempt-journal.json';

export const PLAYBACK_POLICY = Object.freeze({
  default_voice: 'aoede',
  default_rate: 1.25,
  rate_options: Object.freeze([
    Object.freeze({ value: 1, label: '1.00x' }),
    Object.freeze({ value: 1.25, label: '1.25x' }),
    Object.freeze({ value: 1.5, label: '1.50x' }),
    Object.freeze({ value: 1.75, label: '1.75x' }),
  ]),
});

export const PUZZLE_NARRATION_VOICES = Object.freeze({
  aoede: Object.freeze({
    label: 'Aoede',
    gender: 'female',
    language_code: 'en-US',
    voice_id: 'en-US-Chirp3-HD-Aoede',
  }),
  algieba: Object.freeze({
    label: 'Algieba',
    gender: 'male',
    language_code: 'en-US',
    voice_id: 'en-US-Chirp3-HD-Algieba',
  }),
});

export const REQUEST_SEGMENTATION = Object.freeze({
  mode: 'utf8-soft-boundary-v1',
  maximum_utf8_bytes: MAX_SYNCHRONOUS_INPUT_BYTES,
  preferred_boundaries: Object.freeze(['paragraph', 'sentence', 'whitespace', 'code-point']),
});

export const PROVIDER_SENTENCE_FRAGMENTATION = Object.freeze({
  mode: 'provider-sentence-fragment-v3',
  scope: 'over-limit-sentences-only',
  trigger_maximum_utf8_bytes: MAX_PROVIDER_SENTENCE_BYTES,
  maximum_utf8_bytes: MAX_PROVIDER_FRAGMENT_BYTES,
  preferred_boundaries: Object.freeze([
    'paragraph',
    'sentence',
    'semicolon',
    'colon',
    'comma',
    'whitespace',
    'code-point',
  ]),
});

export const MULTIPART_ASSEMBLY = Object.freeze({
  mode: 'ffmpeg-concat-remux-v1',
  audio_codec: 'copy',
  container: 'mp3',
});

export const SINGLE_REQUEST_ASSEMBLY = Object.freeze({
  mode: 'single-request-passthrough',
});

const TRACK_IDS = Object.freeze(Object.keys(PUZZLE_NARRATION_VOICES));
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const AUDIO_HASH_PATTERN = /^[a-f0-9]{64}$/;
const MIN_AUDIO_BYTES = 1_000;
const MIN_MEAN_VOLUME_DB = -50;
const MIN_PEAK_VOLUME_DB = -45;
const MAX_NARRATION_CHARACTERS_PER_SECOND = 45;
const FFMPEG_TIMEOUT_MS = 120_000;
const FFMPEG_MAX_OUTPUT_BYTES = 4 * 1024 * 1024;

const NARRATION_ARTIFACT_CHECKS = Object.freeze([
  Object.freeze({ label: 'an underscored machine token', pattern: /_/ }),
  Object.freeze({ label: 'raw arrow syntax', pattern: /->|[\u2190\u2192\u2194\u21d2]/ }),
  Object.freeze({
    label: 'a repository or data path',
    pattern: /(?:^|[\s(])\/(?:rag|src|public|tmp|solutions)\//i,
  }),
  Object.freeze({ label: 'a raw URL', pattern: /https?:\/\//i }),
  Object.freeze({ label: 'a raw numeral', pattern: /\d/ }),
  Object.freeze({ label: 'a fenced code block', pattern: /```|~~~(?:python|py|javascript|js)?/i }),
  Object.freeze({ label: 'an HTML code payload', pattern: /<\/?(?:pre|code)\b/i }),
  Object.freeze({
    label: 'raw executable source',
    pattern: /(?:^|\n)\s*(?:#!|from\s+\S+\s+import\s+|import\s+\S+|def\s+\w+\s*\(|class\s+\w+\s*[:(]|(?:const|let|var)\s+\w+\s*=|export\s+(?:default\s+)?(?:function|const|class)\b)/m,
  }),
  Object.freeze({
    label: 'an executable-code sentinel',
    pattern: /(?:EXECUTABLE|PYTHON|SOURCE)_CODE_SENTINEL/i,
  }),
  Object.freeze({ label: 'a literal timestamp', pattern: /\b\d{1,2}:\d{2}(?::\d{2})?\b/ }),
  Object.freeze({
    label: 'interface code chrome',
    pattern: /\b(?:copy code|language badge|line number|output console|syntax highlighting)\b/i,
  }),
]);

function compareStrings(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort(compareStrings)
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

export function costMicrodollarsForCharacters(characters) {
  if (!Number.isSafeInteger(characters) || characters < 0) {
    throw new Error('Billable characters must be a nonnegative safe integer');
  }
  return characters * LIST_PRICE_PER_MILLION_CHARACTERS;
}

export function formatMicrodollars(microdollars) {
  if (!Number.isSafeInteger(microdollars) || microdollars < 0) {
    throw new Error('Microdollars must be a nonnegative safe integer');
  }
  const whole = Math.floor(microdollars / 1_000_000);
  const fraction = String(microdollars % 1_000_000).padStart(6, '0');
  return `${whole}.${fraction}`;
}

export function parseUsdMicrodollars(value) {
  if (typeof value !== 'string' || !/^(?:\d+(?:\.\d{0,6})?|\.\d{1,6})$/.test(value)) {
    throw new Error('--max-usd must be a nonnegative decimal with no more than six decimal places');
  }
  const [wholePartRaw, fractionPart = ''] = value.split('.');
  const wholePart = wholePartRaw || '0';
  const microdollars = (BigInt(wholePart) * 1_000_000n)
    + BigInt(fractionPart.padEnd(6, '0') || '0');
  if (microdollars > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('--max-usd is too large');
  return Number(microdollars);
}

export function assertNarrationTextIsPublicationReady(text, label = 'Narration') {
  if (typeof text !== 'string' || !text.trim()) throw new Error(`${label} is empty`);
  for (const check of NARRATION_ARTIFACT_CHECKS) {
    check.pattern.lastIndex = 0;
    if (check.pattern.test(text)) throw new Error(`${label} contains ${check.label}`);
  }
  return text;
}

export function assertSynchronousInputLimit(text, label = 'Narration') {
  const inputBytes = Buffer.byteLength(text, 'utf8');
  if (inputBytes > MAX_SYNCHRONOUS_INPUT_BYTES) {
    throw new Error(
      `${label} is ${inputBytes} UTF-8 bytes, above the Google synchronous request limit of ${MAX_SYNCHRONOUS_INPUT_BYTES} bytes`
    );
  }
  return inputBytes;
}

function maximumStringIndexWithinUtf8Bytes(text, maximumBytes) {
  let bytes = 0;
  let index = 0;
  for (const character of text) {
    const characterBytes = Buffer.byteLength(character, 'utf8');
    if (bytes + characterBytes > maximumBytes) break;
    bytes += characterBytes;
    index += character.length;
  }
  return index;
}

function lastBoundaryEnd(text, pattern) {
  let end = 0;
  for (const match of text.matchAll(pattern)) end = match.index + match[0].length;
  return end;
}

function preferredRequestBoundary(text, maximumIndex, { clauseBoundaries = false } = {}) {
  const window = text.slice(0, maximumIndex);
  const minimumSoftBoundary = Math.floor(maximumIndex * 0.5);
  const boundaries = [
    lastBoundaryEnd(window, /\n{2,}/g),
    ...(clauseBoundaries ? [
      lastBoundaryEnd(window, /;[ \t\r\n]+/g),
      lastBoundaryEnd(window, /:[ \t\r\n]+/g),
      lastBoundaryEnd(window, /,[ \t\r\n]+/g),
    ] : [lastBoundaryEnd(window, /[.!?](?:["')\]]*)[ \t\r\n]+/g)]),
    lastBoundaryEnd(window, /\s+/g),
  ];
  return boundaries.find((boundary) => boundary >= minimumSoftBoundary) || maximumIndex;
}

function isSentenceAbbreviation(token) {
  return /^(?:Mr|Mrs|Ms|Dr|Rev|Sr|Jr|St|Mt|Gen|Sen|Rep|Gov|Lt|Col|Capt|Sgt|Prof|Hon|Pres|No|Nos|Vol|Inc|Co|Corp|Dept|Est|Cir|v|c)\.$/iu.test(token)
    || /^(?:[A-Z]\.){1,4}$/u.test(token);
}

function providerSentenceSpans(text) {
  if (typeof text !== 'string') throw new Error('Narration sentence text must be a string');
  const spans = [];
  const boundaryPattern = /([.!?](?:["')\]]*)?)(\s+|$)/gu;
  let sentenceStart = 0;
  for (const match of text.matchAll(boundaryPattern)) {
    const punctuationEnd = match.index + match[1].length;
    const boundaryEnd = match.index + match[0].length;
    const token = text.slice(0, match.index + 1).match(/(\S+)$/u)?.[1] || '';
    const hasFollowingText = /\S/u.test(text.slice(boundaryEnd));
    if (match[1].startsWith('.') && hasFollowingText && isSentenceAbbreviation(token)) continue;

    const sentence = text.slice(sentenceStart, punctuationEnd).trim();
    if (sentence) spans.push({ start: sentenceStart, end: boundaryEnd, text: sentence });
    sentenceStart = boundaryEnd;
  }
  const finalSentence = text.slice(sentenceStart).trim();
  if (finalSentence) spans.push({ start: sentenceStart, end: text.length, text: finalSentence });
  return spans;
}

export function providerSentenceByteCounts(text) {
  return providerSentenceSpans(text)
    .map((sentence) => Buffer.byteLength(sentence.text, 'utf8'));
}

export function requiresProviderSentenceFragmentation(text) {
  return providerSentenceByteCounts(text)
    .some((byteCount) => byteCount > MAX_PROVIDER_SENTENCE_BYTES);
}

function buildNarrationRequest(requestText, index) {
  assertSynchronousInputLimit(requestText, `Narration request ${index}`);
  return {
    id: `request-${String(index).padStart(3, '0')}`,
    index,
    text: requestText,
    characters: Array.from(requestText).length,
    utf8_bytes: Buffer.byteLength(requestText, 'utf8'),
    sha256: sha256(requestText),
  };
}

export function splitNarrationIntoRequests(
  text,
  { maximumBytes = MAX_SYNCHRONOUS_INPUT_BYTES, clauseBoundaries = false } = {}
) {
  if (typeof text !== 'string' || !text) throw new Error('Narration request text must be nonempty');
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes <= 0) {
    throw new Error('Narration request byte limit must be a positive safe integer');
  }

  const requests = [];
  let remaining = text;
  while (remaining) {
    const maximumIndex = maximumStringIndexWithinUtf8Bytes(remaining, maximumBytes);
    if (maximumIndex <= 0) {
      throw new Error(`A narration character exceeds the ${maximumBytes}-byte request limit`);
    }
    const boundary = maximumIndex === remaining.length
      ? maximumIndex
      : preferredRequestBoundary(remaining, maximumIndex, { clauseBoundaries });
    const requestText = remaining.slice(0, boundary);
    requests.push(buildNarrationRequest(requestText, requests.length + 1));
    remaining = remaining.slice(boundary);
  }

  if (requests.map((request) => request.text).join('') !== text) {
    throw new Error('Narration request splitting did not preserve the source text exactly');
  }
  return requests;
}

export function splitNarrationForProvider(text) {
  const baseRequests = splitNarrationIntoRequests(text);
  const longSentences = providerSentenceSpans(text)
    .filter((sentence) => Buffer.byteLength(sentence.text, 'utf8') > MAX_PROVIDER_SENTENCE_BYTES);
  if (longSentences.length === 0) return baseRequests;

  const requestTexts = [];
  let baseStart = 0;
  for (const baseRequest of baseRequests) {
    const baseEnd = baseStart + baseRequest.text.length;
    const overlaps = longSentences
      .map((sentence) => ({
        start: Math.max(baseStart, sentence.start),
        end: Math.min(baseEnd, sentence.end),
      }))
      .filter((overlap) => overlap.start < overlap.end);
    if (overlaps.length === 0) {
      requestTexts.push(baseRequest.text);
      baseStart = baseEnd;
      continue;
    }

    let cursor = baseStart;
    let packedText = '';
    for (const overlap of overlaps) {
      if (overlap.start > cursor) packedText += text.slice(cursor, overlap.start);
      const fragments = splitNarrationIntoRequests(text.slice(overlap.start, overlap.end), {
        maximumBytes: MAX_PROVIDER_FRAGMENT_BYTES,
        clauseBoundaries: true,
      });
      for (const [fragmentIndex, fragment] of fragments.entries()) {
        packedText += fragment.text;
        if (fragmentIndex < fragments.length - 1) {
          requestTexts.push(packedText);
          packedText = '';
        }
      }
      cursor = overlap.end;
    }
    if (cursor < baseEnd) packedText += text.slice(cursor, baseEnd);
    if (packedText) requestTexts.push(packedText);
    baseStart = baseEnd;
  }

  const requests = requestTexts.map((requestText, index) => (
    buildNarrationRequest(requestText, index + 1)
  ));
  if (requests.map((request) => request.text).join('') !== text) {
    throw new Error('Provider sentence fragmentation did not preserve the source text exactly');
  }
  return requests;
}

export function buildNarrationRecipe({
  multipart = false,
  providerSentenceFragmentation = false,
} = {}) {
  const recipe = {
    schema_version: PUZZLE_NARRATION_SCHEMA_VERSION,
    provider: 'Google Cloud Text-to-Speech',
    model: 'Chirp 3 HD',
    language_code: 'en-US',
    input_type: 'text',
    audio_encoding: 'MP3',
    speaking_rate: 1,
    pitch: 'provider-default',
    adapter: 'canonical-authored-narration-array-v1',
    normalizer: 'puzzle-narration-v1',
    tracks: Object.fromEntries(
      Object.entries(PUZZLE_NARRATION_VOICES).map(([trackId, voice]) => [trackId, {
        language_code: voice.language_code,
        voice_id: voice.voice_id,
      }])
    ),
  };
  if (multipart) {
    recipe.request_segmentation = REQUEST_SEGMENTATION;
    recipe.multipart_assembly = MULTIPART_ASSEMBLY;
  }
  if (providerSentenceFragmentation) {
    recipe.provider_sentence_fragmentation = PROVIDER_SENTENCE_FRAGMENTATION;
  }
  return recipe;
}

export function buildPuzzleNarrationPlan({
  slug,
  narration,
  sourcePath = `src/content/${slug}.narration.js`,
} = {}) {
  if (!SLUG_PATTERN.test(slug || '')) {
    throw new Error('Puzzle slug must contain only lowercase letters, numbers, and single hyphens');
  }

  const adapterInput = { slug, narration };
  const text = buildPuzzleNarrationText(adapterInput);
  const sourceSegments = buildPuzzleNarrationSegments(adapterInput);
  assertNarrationTextIsPublicationReady(text, `${slug}: narration`);
  const providerSentenceFragmentation = requiresProviderSentenceFragmentation(text);
  const requests = providerSentenceFragmentation
    ? splitNarrationForProvider(text)
    : splitNarrationIntoRequests(text);
  const charactersPerVoice = Array.from(text).length;
  const recipe = buildNarrationRecipe({
    multipart: requests.length > 1,
    providerSentenceFragmentation,
  });
  const sourceHash = sha256(text);
  const recipeHash = sha256(stableJson(recipe));
  const releaseHash = sha256(stableJson({ source_hash: sourceHash, recipe_hash: recipeHash }));
  const plannedBillableCharacters = charactersPerVoice * TRACK_IDS.length;

  const segments = sourceSegments.map((segment) => ({
    id: segment.id,
    label: segment.label,
    source_fields: segment.source_fields,
    excluded_fields: segment.excluded_fields || [],
    utf8_bytes: Buffer.byteLength(segment.text, 'utf8'),
    sha256: sha256(segment.text),
  }));
  const reviewSegments = sourceSegments.map((segment) => ({
    ...segment,
    utf8_bytes: Buffer.byteLength(segment.text, 'utf8'),
    sha256: sha256(segment.text),
  }));
  const requestChunks = requests.map(({ id, index, characters, utf8_bytes, sha256: requestHash }) => ({
    id,
    index,
    characters,
    utf8_bytes,
    sha256: requestHash,
  }));

  return {
    slug,
    contentId: `puzzle:${slug}`,
    sourcePath,
    text,
    inputBytes: Buffer.byteLength(text, 'utf8'),
    charactersPerVoice,
    sourceHash,
    recipe,
    recipeHash,
    releaseHash,
    releasePrefix: releaseHash.slice(0, 20),
    plannedBillableCharacters,
    plannedCostMicrodollars: costMicrodollarsForCharacters(plannedBillableCharacters),
    plannedRequestCount: requests.length * TRACK_IDS.length,
    requests,
    requestChunks,
    assembly: requests.length === 1 ? SINGLE_REQUEST_ASSEMBLY : MULTIPART_ASSEMBLY,
    segments,
    reviewSegments,
  };
}

export function buildReviewArtifact(plan) {
  const artifact = {
    schema_version: 1,
    artifact_type: 'algonow-preserved-narration-review-plan',
    implementation_contract: IMPLEMENTATION_CONTRACT,
    billing_project: APPROVED_BILLING_PROJECT,
    inventory: [{
      stable_id: plan.contentId,
      slug: plan.slug,
      source_path: plan.sourcePath,
      normalized_text: plan.text,
      utf8_bytes_per_voice: plan.inputBytes,
      characters_per_voice: plan.charactersPerVoice,
      source_sha256: plan.sourceHash,
      recipe: plan.recipe,
      recipe_sha256: plan.recipeHash,
      release_sha256: plan.releaseHash,
      segments: plan.reviewSegments,
      requests: plan.requests,
    }],
    voice_count: TRACK_IDS.length,
    voices: PUZZLE_NARRATION_VOICES,
    playback_policy: PLAYBACK_POLICY,
    planned_provider_requests: plan.plannedRequestCount,
    planned_billable_characters: plan.plannedBillableCharacters,
    checked_in_list_price_usd_per_million_characters: LIST_PRICE_PER_MILLION_CHARACTERS,
    conservative_list_price_usd_exact: formatMicrodollars(plan.plannedCostMicrodollars),
    pricing_note: 'This is a conservative checked-in planning constant. Confirm official pricing before paid execution.',
  };
  const approvalSha256 = sha256(stableJson(artifact));
  return { ...artifact, approval_sha256: approvalSha256 };
}

export function reviewArtifactPath(root, plan) {
  return path.join(root, 'build', 'narration', 'review', `${plan.slug}-plan.json`);
}

export function writeFileAtomic(filePath, contents, options = {}) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const suffix = crypto.randomBytes(8).toString('hex');
  const temporaryPath = `${filePath}.tmp-${process.pid}-${suffix}`;
  fs.writeFileSync(temporaryPath, contents, { ...options, flag: 'wx' });
  try {
    fs.renameSync(temporaryPath, filePath);
  } catch (error) {
    if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
    throw error;
  }
}

export function writeReviewArtifact(root, plan) {
  const artifact = buildReviewArtifact(plan);
  const outputPath = reviewArtifactPath(root, plan);
  writeFileAtomic(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, { encoding: 'utf8' });
  return { artifact, outputPath };
}

const ATTEMPT_ID_PATTERN = /^[a-f0-9]{64}$/;
const ATTEMPT_STATUSES = Object.freeze([
  'submitted',
  'provider-error',
  'ambiguous',
  'response-received',
  'response-received-unpersisted',
  'persisted',
  'reconciled',
]);
const BLOCKING_ATTEMPT_STATUSES = new Set([
  'submitted',
  'ambiguous',
  'response-received',
  'response-received-unpersisted',
]);
const JOURNAL_ROOT_KEYS = Object.freeze([
  'schema_version',
  'artifact_type',
  'content_id',
  'release_sha256',
  'recipe_sha256',
  'billing_project',
  'attempts',
]);
const JOURNAL_ATTEMPT_KEYS = new Set([
  'attempt_id',
  'track_id',
  'track_recipe_sha256',
  'request_index',
  'request_sha256',
  'characters',
  'cost_microdollars',
  'authorized_ceiling_microdollars',
  'request_attempt_number',
  'submitted_at',
  'updated_at',
  'status',
  'retryable',
  'http_status',
  'response_received_at',
  'outcome_recorded_at',
  'persisted_at',
  'reconciliation',
]);

function narrationTrackRecipeHash(plan, trackId) {
  return sha256(stableJson({
    recipe_sha256: plan.recipeHash,
    track_id: trackId,
    voice: PUZZLE_NARRATION_VOICES[trackId],
  }));
}

function emptyNarrationAttemptJournal(plan) {
  return {
    schema_version: 1,
    artifact_type: 'algonow-preserved-narration-attempt-journal',
    content_id: plan.contentId,
    release_sha256: plan.releaseHash,
    recipe_sha256: plan.recipeHash,
    billing_project: APPROVED_BILLING_PROJECT,
    attempts: [],
  };
}

export function narrationAttemptJournalPath(root, plan) {
  return path.join(releaseOutputDirectory(root, plan), ATTEMPT_JOURNAL_FILE);
}

function assertJournalTimestamp(value, label) {
  if (typeof value !== 'string' || !value || !Number.isFinite(Date.parse(value))) {
    throw new Error(`${label} must be an ISO timestamp`);
  }
}

function assertJournalMatchesPlan(journal, plan) {
  if (!journal || typeof journal !== 'object' || Array.isArray(journal)) {
    throw new Error(`${plan.slug}: attempt journal must be an object`);
  }
  if (stableJson(Object.keys(journal).sort(compareStrings)) !== stableJson([...JOURNAL_ROOT_KEYS].sort(compareStrings))) {
    throw new Error(`${plan.slug}: attempt journal has unsupported fields`);
  }
  if (journal.schema_version !== 1
    || journal.artifact_type !== 'algonow-preserved-narration-attempt-journal'
    || journal.content_id !== plan.contentId
    || journal.release_sha256 !== plan.releaseHash
    || journal.recipe_sha256 !== plan.recipeHash
    || journal.billing_project !== APPROVED_BILLING_PROJECT
    || !Array.isArray(journal.attempts)) {
    throw new Error(`${plan.slug}: attempt journal does not match the reviewed release`);
  }

  const attemptIds = new Set();
  let cumulativeCostMicrodollars = 0;
  for (const [attemptIndex, attempt] of journal.attempts.entries()) {
    if (!attempt || typeof attempt !== 'object' || Array.isArray(attempt)) {
      throw new Error(`${plan.slug}: attempt journal entry ${attemptIndex + 1} is invalid`);
    }
    if (Object.keys(attempt).some((key) => !JOURNAL_ATTEMPT_KEYS.has(key))) {
      throw new Error(`${plan.slug}: attempt journal entry ${attemptIndex + 1} has unsupported fields`);
    }
    if (!ATTEMPT_ID_PATTERN.test(attempt.attempt_id || '') || attemptIds.has(attempt.attempt_id)) {
      throw new Error(`${plan.slug}: attempt journal entry ${attemptIndex + 1} has an invalid identity`);
    }
    attemptIds.add(attempt.attempt_id);
    const voice = PUZZLE_NARRATION_VOICES[attempt.track_id];
    const request = plan.requests[attempt.request_index - 1];
    if (!voice
      || !request
      || attempt.track_recipe_sha256 !== narrationTrackRecipeHash(plan, attempt.track_id)
      || attempt.request_sha256 !== request.sha256
      || attempt.characters !== request.characters
      || attempt.cost_microdollars !== costMicrodollarsForCharacters(request.characters)) {
      throw new Error(`${plan.slug}: attempt journal entry ${attemptIndex + 1} is outside the reviewed plan`);
    }
    if (!Number.isSafeInteger(attempt.authorized_ceiling_microdollars)
      || attempt.authorized_ceiling_microdollars < attempt.cost_microdollars
      || !Number.isSafeInteger(attempt.request_attempt_number)
      || attempt.request_attempt_number < 1
      || !ATTEMPT_STATUSES.includes(attempt.status)) {
      throw new Error(`${plan.slug}: attempt journal entry ${attemptIndex + 1} has invalid accounting`);
    }
    cumulativeCostMicrodollars += attempt.cost_microdollars;
    if (!Number.isSafeInteger(cumulativeCostMicrodollars)
      || cumulativeCostMicrodollars > attempt.authorized_ceiling_microdollars) {
      throw new Error(`${plan.slug}: attempt journal entry ${attemptIndex + 1} exceeds its authorized ceiling`);
    }
    assertJournalTimestamp(attempt.submitted_at, `${plan.slug}: attempt submitted_at`);
    assertJournalTimestamp(attempt.updated_at, `${plan.slug}: attempt updated_at`);
    if (attempt.retryable !== undefined && typeof attempt.retryable !== 'boolean') {
      throw new Error(`${plan.slug}: attempt retryable marker is invalid`);
    }
    if (attempt.http_status !== undefined
      && (!Number.isInteger(attempt.http_status)
        || attempt.http_status < 100
        || attempt.http_status > 599)) {
      throw new Error(`${plan.slug}: attempt HTTP status is invalid`);
    }
    for (const timestampKey of [
      'response_received_at',
      'outcome_recorded_at',
      'persisted_at',
    ]) {
      if (attempt[timestampKey] !== undefined) {
        assertJournalTimestamp(attempt[timestampKey], `${plan.slug}: attempt ${timestampKey}`);
      }
    }
    if (attempt.reconciliation !== undefined) {
      const reconciliation = attempt.reconciliation;
      if (!reconciliation
        || typeof reconciliation !== 'object'
        || Object.keys(reconciliation).some((key) => ![
          'provider_billed',
          'reconciled_at',
          'next_action',
          'consumed_by_attempt_id',
        ].includes(key))
        || typeof reconciliation.provider_billed !== 'boolean'
        || !reconciliation.next_action
        || Object.keys(reconciliation.next_action).some((key) => ![
          'kind',
          'track_id',
          'request_index',
          'request_sha256',
        ].includes(key))
        || reconciliation.next_action?.kind !== 'resubmit-exact-request'
        || reconciliation.next_action.track_id !== attempt.track_id
        || reconciliation.next_action.request_index !== attempt.request_index
        || reconciliation.next_action.request_sha256 !== attempt.request_sha256
        || !Object.hasOwn(reconciliation, 'consumed_by_attempt_id')
        || (reconciliation.consumed_by_attempt_id !== null
          && !ATTEMPT_ID_PATTERN.test(reconciliation.consumed_by_attempt_id))) {
        throw new Error(`${plan.slug}: attempt journal entry ${attemptIndex + 1} has invalid reconciliation data`);
      }
      assertJournalTimestamp(reconciliation.reconciled_at, `${plan.slug}: reconciliation timestamp`);
    }
    if (attempt.status === 'reconciled' && attempt.reconciliation === undefined) {
      throw new Error(`${plan.slug}: reconciled attempt has no reconciliation record`);
    }
  }
  return journal;
}

export function readNarrationAttemptJournal({ root, plan } = {}) {
  if (!root || !plan) throw new Error('Attempt journal requires a repository root and plan');
  const journalPath = narrationAttemptJournalPath(root, plan);
  if (!fs.existsSync(journalPath)) return emptyNarrationAttemptJournal(plan);
  let journal;
  try {
    journal = JSON.parse(fs.readFileSync(journalPath, 'utf8'));
  } catch (error) {
    throw new Error(`${plan.slug}: attempt journal is invalid: ${error.message}`);
  }
  return assertJournalMatchesPlan(journal, plan);
}

function writeNarrationAttemptJournal(root, plan, journal) {
  assertJournalMatchesPlan(journal, plan);
  ensureReleaseScaffold(root, plan);
  writeFileAtomic(
    narrationAttemptJournalPath(root, plan),
    `${JSON.stringify(journal, null, 2)}\n`,
    { encoding: 'utf8' }
  );
}

export function summarizeNarrationAttemptJournal({ root, plan } = {}) {
  const journal = readNarrationAttemptJournal({ root, plan });
  const submittedCharacters = journal.attempts.reduce(
    (total, attempt) => total + attempt.characters,
    0
  );
  const submittedCostMicrodollars = journal.attempts.reduce(
    (total, attempt) => total + attempt.cost_microdollars,
    0
  );
  if (!Number.isSafeInteger(submittedCharacters) || !Number.isSafeInteger(submittedCostMicrodollars)) {
    throw new Error(`${plan.slug}: attempt journal totals exceed safe integer accounting`);
  }
  return {
    attempt_count: journal.attempts.length,
    submitted_characters: submittedCharacters,
    submitted_cost_microdollars: submittedCostMicrodollars,
    blocking_attempt_ids: journal.attempts
      .filter((attempt) => BLOCKING_ATTEMPT_STATUSES.has(attempt.status))
      .map((attempt) => attempt.attempt_id),
  };
}

export function createNarrationAttemptJournal({
  root,
  plan,
  project,
  maxMicrodollars,
  now = () => new Date().toISOString(),
  nonce = () => crypto.randomBytes(16).toString('hex'),
} = {}) {
  if (project !== APPROVED_BILLING_PROJECT) {
    throw new Error(`Narration billing project must be ${APPROVED_BILLING_PROJECT}`);
  }
  if (!Number.isSafeInteger(maxMicrodollars) || maxMicrodollars < 0) {
    throw new Error('Attempt journal requires a nonnegative safe-integer ceiling');
  }

  function load() {
    return readNarrationAttemptJournal({ root, plan });
  }

  function updateAttempt(attemptId, nextStatus, details = {}) {
    const journal = load();
    const attempt = journal.attempts.find((entry) => entry.attempt_id === attemptId);
    if (!attempt) throw new Error(`${plan.slug}: unknown narration attempt ${attemptId}`);
    const allowedTransitions = {
      submitted: new Set([
        'provider-error',
        'ambiguous',
        'response-received',
        'response-received-unpersisted',
      ]),
      'response-received': new Set(['persisted', 'response-received-unpersisted']),
    };
    if (!allowedTransitions[attempt.status]?.has(nextStatus)) {
      throw new Error(`${plan.slug}: unsafe attempt transition ${attempt.status} to ${nextStatus}`);
    }
    Object.assign(attempt, details, { status: nextStatus, updated_at: now() });
    writeNarrationAttemptJournal(root, plan, journal);
    return { ...attempt };
  }

  return {
    assertReadyForExecution() {
      const summary = summarizeNarrationAttemptJournal({ root, plan });
      if (summary.blocking_attempt_ids.length > 0) {
        throw new Error(
          `${plan.slug}: unresolved narration attempt ${summary.blocking_attempt_ids[0]} requires explicit reconciliation`
        );
      }
      return summary;
    },

    recordSubmission({ trackId, request } = {}) {
      const voice = PUZZLE_NARRATION_VOICES[trackId];
      const plannedRequest = plan.requests[request?.index - 1];
      if (!voice || !plannedRequest || stableJson(plannedRequest) !== stableJson(request)) {
        throw new Error(`${plan.slug}: refusing a provider submission outside the reviewed plan`);
      }
      const journal = load();
      const blockingAttempt = journal.attempts.find((attempt) => (
        BLOCKING_ATTEMPT_STATUSES.has(attempt.status)
      ));
      if (blockingAttempt) {
        throw new Error(
          `${plan.slug}: unresolved narration attempt ${blockingAttempt.attempt_id} blocks provider submission`
        );
      }
      const unconsumedAuthorizations = journal.attempts.filter((attempt) => (
        attempt.status === 'reconciled'
        && attempt.reconciliation?.consumed_by_attempt_id === null
      ));
      if (unconsumedAuthorizations.length > 1) {
        throw new Error(`${plan.slug}: multiple unconsumed reconciliation actions exist`);
      }
      const authorization = unconsumedAuthorizations[0] || null;
      if (authorization
        && (authorization.track_id !== trackId
          || authorization.request_index !== request.index
          || authorization.request_sha256 !== request.sha256)) {
        throw new Error(`${plan.slug}: reconciliation authorizes only the exact unresolved request`);
      }

      const summary = summarizeNarrationAttemptJournal({ root, plan });
      const attemptCostMicrodollars = costMicrodollarsForCharacters(request.characters);
      const persistedRequests = new Set(journal.attempts
        .filter((attempt) => attempt.status === 'persisted')
        .map((attempt) => `${attempt.track_id}:${attempt.request_sha256}`));
      const currentRequestKey = `${trackId}:${request.sha256}`;
      const minimumRemainingCostMicrodollars = TRACK_IDS.reduce((trackTotal, pendingTrackId) => (
        trackTotal + plan.requests.reduce((requestTotal, pendingRequest) => {
          const pendingKey = `${pendingTrackId}:${pendingRequest.sha256}`;
          if (pendingKey === currentRequestKey || persistedRequests.has(pendingKey)) {
            return requestTotal;
          }
          return requestTotal + costMicrodollarsForCharacters(pendingRequest.characters);
        }, 0)
      ), 0);
      if (summary.submitted_cost_microdollars
        + attemptCostMicrodollars
        + minimumRemainingCostMicrodollars
        > maxMicrodollars) {
        throw new Error(
          `${plan.slug}: provider submission plus remaining reviewed requests would exceed the cumulative --max-usd ceiling`
        );
      }
      const submittedAt = now();
      assertJournalTimestamp(submittedAt, `${plan.slug}: provider submission timestamp`);
      const requestAttemptNumber = journal.attempts.filter((attempt) => (
        attempt.track_id === trackId
        && attempt.request_index === request.index
        && attempt.request_sha256 === request.sha256
      )).length + 1;
      const attemptId = sha256(stableJson({
        release_sha256: plan.releaseHash,
        track_id: trackId,
        request_sha256: request.sha256,
        request_attempt_number: requestAttemptNumber,
        submitted_at: submittedAt,
        nonce: nonce(),
      }));
      if (journal.attempts.some((attempt) => attempt.attempt_id === attemptId)) {
        throw new Error(`${plan.slug}: narration attempt identity collision`);
      }
      const attempt = {
        attempt_id: attemptId,
        track_id: trackId,
        track_recipe_sha256: narrationTrackRecipeHash(plan, trackId),
        request_index: request.index,
        request_sha256: request.sha256,
        characters: request.characters,
        cost_microdollars: attemptCostMicrodollars,
        authorized_ceiling_microdollars: maxMicrodollars,
        request_attempt_number: requestAttemptNumber,
        submitted_at: submittedAt,
        updated_at: submittedAt,
        status: 'submitted',
      };
      if (authorization) {
        authorization.reconciliation.consumed_by_attempt_id = attemptId;
        authorization.updated_at = submittedAt;
      }
      journal.attempts.push(attempt);
      writeNarrationAttemptJournal(root, plan, journal);
      return { ...attempt };
    },

    markProviderError(attemptId, { retryable = false, httpStatus = null } = {}) {
      const details = {
        retryable: Boolean(retryable),
        outcome_recorded_at: now(),
      };
      if (Number.isInteger(httpStatus) && httpStatus >= 100 && httpStatus <= 599) {
        details.http_status = httpStatus;
      }
      return updateAttempt(attemptId, 'provider-error', details);
    },

    markAmbiguous(attemptId) {
      return updateAttempt(attemptId, 'ambiguous', { outcome_recorded_at: now() });
    },

    markResponseReceived(attemptId) {
      return updateAttempt(attemptId, 'response-received', { response_received_at: now() });
    },

    markResponseUnpersisted(attemptId) {
      return updateAttempt(attemptId, 'response-received-unpersisted', {
        outcome_recorded_at: now(),
      });
    },

    markPersisted(attemptId) {
      return updateAttempt(attemptId, 'persisted', { persisted_at: now() });
    },

    summary() {
      return summarizeNarrationAttemptJournal({ root, plan });
    },
  };
}

export function reconcileNarrationAttempt({
  root,
  plan,
  project,
  attemptId,
  providerBilled,
  authorizeExactResubmission,
  now = () => new Date().toISOString(),
} = {}) {
  if (project !== APPROVED_BILLING_PROJECT) {
    throw new Error(`Narration billing project must be ${APPROVED_BILLING_PROJECT}`);
  }
  if (!ATTEMPT_ID_PATTERN.test(attemptId || '')) {
    throw new Error('Reconciliation requires an exact 64-character attempt identity');
  }
  if (typeof providerBilled !== 'boolean' || authorizeExactResubmission !== true) {
    throw new Error('Reconciliation must record billed yes or no and authorize exact resubmission');
  }
  const journal = readNarrationAttemptJournal({ root, plan });
  const attemptIndex = journal.attempts.findIndex((attempt) => attempt.attempt_id === attemptId);
  if (attemptIndex < 0) throw new Error(`${plan.slug}: unknown narration attempt ${attemptId}`);
  const attempt = journal.attempts[attemptIndex];
  if (!BLOCKING_ATTEMPT_STATUSES.has(attempt.status)) {
    throw new Error(`${plan.slug}: narration attempt ${attemptId} is not awaiting reconciliation`);
  }
  if (attemptIndex !== journal.attempts.length - 1) {
    throw new Error(`${plan.slug}: only the latest unresolved attempt can be reconciled`);
  }
  const reconciledAt = now();
  assertJournalTimestamp(reconciledAt, `${plan.slug}: reconciliation timestamp`);
  attempt.status = 'reconciled';
  attempt.updated_at = reconciledAt;
  attempt.reconciliation = {
    provider_billed: providerBilled,
    reconciled_at: reconciledAt,
    next_action: {
      kind: 'resubmit-exact-request',
      track_id: attempt.track_id,
      request_index: attempt.request_index,
      request_sha256: attempt.request_sha256,
    },
    consumed_by_attempt_id: null,
  };
  writeNarrationAttemptJournal(root, plan, journal);
  return { ...attempt };
}

export function releaseOutputDirectory(root, plan) {
  return path.join(root, 'build', 'narration', 'releases', plan.slug, plan.releasePrefix);
}

function expectedTrackObjectKey(plan, trackId, audioHash) {
  return `narration/v1/puzzles/${plan.slug}/${plan.releasePrefix}/${trackId}-${audioHash.slice(0, 16)}.mp3`;
}

function expectedLocalFile(root, outputDirectory, fileName) {
  return path.relative(root, path.join(outputDirectory, fileName)).replaceAll('\\', '/');
}

function requestPartDirectory(root, plan, trackId) {
  return path.join(releaseOutputDirectory(root, plan), 'parts', trackId);
}

function requestPartPrefix(request) {
  return `${String(request.index).padStart(3, '0')}-${request.sha256.slice(0, 16)}-`;
}

function ffmpegExecutable() {
  return process.env.FFMPEG_PATH || 'ffmpeg';
}

function lastMatch(text, pattern) {
  return [...String(text || '').matchAll(pattern)].at(-1)?.[1];
}

function parseDecibels(value) {
  if (value === '-inf') return Number.NEGATIVE_INFINITY;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseFfmpegAudioAnalysis(result, label = 'Text-to-Speech output') {
  if (result?.error) {
    throw new Error(`${label} could not be decoded by ffmpeg: ${result.error.message}`);
  }
  if (result?.status !== 0) {
    const detail = String(result?.stderr || '').trim().split(/\r?\n/).at(-1) || 'unknown decode error';
    throw new Error(`${label} could not be decoded by ffmpeg: ${detail}`);
  }

  const stderr = String(result.stderr || '');
  const stdout = String(result.stdout || '');
  const codecName = stderr.match(/Stream #\d+:\d+[^\r\n]*?Audio:\s*([^,\s]+)/)?.[1];
  const samples = Number(lastMatch(stderr, /n_samples:\s*(\d+)/g));
  const meanVolumeDb = parseDecibels(lastMatch(stderr, /mean_volume:\s*(-?(?:\d+(?:\.\d+)?|inf))\s*dB/g));
  const peakVolumeDb = parseDecibels(lastMatch(stderr, /max_volume:\s*(-?(?:\d+(?:\.\d+)?|inf))\s*dB/g));
  const durationMicroseconds = Number(lastMatch(stdout, /^out_time_us=(\d+)$/gm));
  const progressEnded = /^progress=end$/m.test(stdout);

  if (!Number.isSafeInteger(samples) || samples <= 0) {
    throw new Error(`${label} decoded to no audio samples`);
  }
  if (!codecName) throw new Error(`${label} has no readable audio codec`);
  if (meanVolumeDb === null || peakVolumeDb === null) {
    throw new Error(`${label} has no readable volume analysis`);
  }
  if (!Number.isSafeInteger(durationMicroseconds) || durationMicroseconds <= 0 || !progressEnded) {
    throw new Error(`${label} has no complete decoded duration`);
  }
  return {
    codecName,
    samples,
    meanVolumeDb,
    peakVolumeDb,
    durationSeconds: durationMicroseconds / 1_000_000,
  };
}

export function analyzeMp3WithFfmpeg(audio, { executable = ffmpegExecutable() } = {}) {
  const nullOutput = process.platform === 'win32' ? 'NUL' : '/dev/null';
  const result = spawnSync(executable, [
    '-hide_banner',
    '-nostdin',
    '-xerror',
    '-i',
    'pipe:0',
    '-map',
    '0:a:0',
    '-af',
    'volumedetect',
    '-f',
    'null',
    nullOutput,
    '-progress',
    'pipe:1',
    '-nostats',
  ], {
    input: audio,
    encoding: 'utf8',
    maxBuffer: FFMPEG_MAX_OUTPUT_BYTES,
    timeout: FFMPEG_TIMEOUT_MS,
    windowsHide: true,
  });
  return parseFfmpegAudioAnalysis(result);
}

export function assertFfmpegAvailable({ executable = ffmpegExecutable(), runner = spawnSync } = {}) {
  const result = runner(executable, ['-version'], {
    encoding: 'utf8',
    timeout: 10_000,
    windowsHide: true,
  });
  if (result?.error || result?.status !== 0) {
    throw new Error(
      'ffmpeg is required to validate generated narration audio before persistence; set FFMPEG_PATH or install ffmpeg'
    );
  }
  return executable;
}

export function validateMp3Audio(audio, {
  expectedCharacters,
  label = 'Text-to-Speech output',
  analyzer = analyzeMp3WithFfmpeg,
} = {}) {
  if (!Buffer.isBuffer(audio)) throw new Error(`${label} is not a Buffer`);
  if (audio.length < MIN_AUDIO_BYTES) {
    throw new Error(`${label} is unexpectedly small (${audio.length} bytes)`);
  }
  if (!Number.isSafeInteger(expectedCharacters) || expectedCharacters <= 0) {
    throw new Error(`${label} validation requires a positive expected character count`);
  }
  const analysis = analyzer(audio);
  if (analysis?.codecName !== 'mp3') {
    throw new Error(`${label} decoded as ${analysis?.codecName || 'an unknown codec'}, not MP3`);
  }
  if (!analysis || !Number.isFinite(analysis.durationSeconds) || analysis.durationSeconds <= 0) {
    throw new Error(`${label} has no valid decoded duration`);
  }
  if (!Number.isFinite(analysis.meanVolumeDb) || analysis.meanVolumeDb < MIN_MEAN_VOLUME_DB) {
    throw new Error(`${label} is silent or nearly silent (mean ${analysis.meanVolumeDb} dB)`);
  }
  if (!Number.isFinite(analysis.peakVolumeDb) || analysis.peakVolumeDb < MIN_PEAK_VOLUME_DB) {
    throw new Error(`${label} is silent or nearly silent (peak ${analysis.peakVolumeDb} dB)`);
  }
  const minimumDuration = expectedCharacters / MAX_NARRATION_CHARACTERS_PER_SECOND;
  if (analysis.durationSeconds < minimumDuration) {
    throw new Error(
      `${label} is implausibly short (${analysis.durationSeconds.toFixed(3)}s for ${expectedCharacters} characters; minimum ${minimumDuration.toFixed(3)}s)`
    );
  }
  return analysis;
}

function discoverLocalTracks(root, plan, { validateAudio = validateMp3Audio } = {}) {
  const outputDirectory = releaseOutputDirectory(root, plan);
  const tracks = {};
  if (!fs.existsSync(outputDirectory)) return tracks;
  if (!fs.statSync(outputDirectory).isDirectory()) {
    throw new Error(`${plan.slug}: local release path is not a directory`);
  }
  const narrationPath = path.join(outputDirectory, 'narration.txt');
  if (fs.existsSync(narrationPath) && fs.readFileSync(narrationPath, 'utf8') !== `${plan.text}\n`) {
    throw new Error(`${plan.slug}: local narration text does not match the current plan`);
  }
  const fileNames = fs.readdirSync(outputDirectory).sort(compareStrings);
  for (const trackId of TRACK_IDS) {
    const candidates = fileNames.filter(
      (fileName) => fileName.startsWith(`${trackId}-`) && fileName.toLowerCase().endsWith('.mp3')
    );
    if (candidates.length > 1) {
      throw new Error(`${plan.slug}: multiple local ${trackId} tracks exist for one release`);
    }
    if (candidates.length === 0) continue;
    const fileName = candidates[0];
    const match = new RegExp(`^${trackId}-([a-f0-9]{16})\\.mp3$`).exec(fileName);
    if (!match) throw new Error(`${plan.slug}: malformed local ${trackId} filename ${fileName}`);
    const absolutePath = path.join(outputDirectory, fileName);
    const audio = fs.readFileSync(absolutePath);
    const audioHash = sha256(audio);
    if (audio.length < MIN_AUDIO_BYTES || audioHash.slice(0, 16) !== match[1]) {
      throw new Error(`${plan.slug}: local ${trackId} track is incomplete or has the wrong hash`);
    }
    validateAudio(audio, {
      expectedCharacters: plan.charactersPerVoice,
      label: `${plan.slug}: existing ${trackId} track`,
    });
    tracks[trackId] = {
      fileName,
      absolutePath,
      bytes: audio.length,
      sha256: audioHash,
    };
  }
  return tracks;
}

export function discoverLocalRequestParts(
  root,
  plan,
  trackId,
  { validateAudio = validateMp3Audio } = {}
) {
  if (!PUZZLE_NARRATION_VOICES[trackId]) throw new Error(`Unknown narration track: ${trackId}`);
  const partsDirectory = requestPartDirectory(root, plan, trackId);
  if (!fs.existsSync(partsDirectory)) return {};
  if (!fs.statSync(partsDirectory).isDirectory()) {
    throw new Error(`${plan.slug}: local ${trackId} request-parts path is not a directory`);
  }

  const parts = {};
  for (const fileName of fs.readdirSync(partsDirectory).sort(compareStrings)) {
    const match = /^(\d{3})-([a-f0-9]{16})-([a-f0-9]{16})\.mp3$/.exec(fileName);
    if (!match) throw new Error(`${plan.slug}: malformed local ${trackId} request part ${fileName}`);
    const requestIndex = Number(match[1]);
    const request = plan.requests[requestIndex - 1];
    if (!request || request.sha256.slice(0, 16) !== match[2] || parts[requestIndex]) {
      throw new Error(`${plan.slug}: stale or duplicate local ${trackId} request part ${fileName}`);
    }
    const absolutePath = path.join(partsDirectory, fileName);
    const audio = fs.readFileSync(absolutePath);
    const audioHash = sha256(audio);
    if (audio.length < MIN_AUDIO_BYTES || audioHash.slice(0, 16) !== match[3]) {
      throw new Error(`${plan.slug}: local ${trackId} request part is incomplete or has the wrong hash`);
    }
    validateAudio(audio, {
      expectedCharacters: request.characters,
      label: `${plan.slug}: existing ${trackId} request ${requestIndex}`,
    });
    parts[requestIndex] = {
      requestIndex,
      fileName,
      absolutePath,
      bytes: audio.length,
      sha256: audioHash,
    };
  }
  return parts;
}

function trackManifestMatchesPlan(track, trackId, plan, { allowLocalFile = false } = {}) {
  const voice = PUZZLE_NARRATION_VOICES[trackId];
  if (!track || !voice) return false;
  if (track.label !== voice.label || track.gender !== voice.gender) return false;
  if (track.language_code !== voice.language_code || track.voice_id !== voice.voice_id) return false;
  if (track.content_type !== CONTENT_TYPE || track.cache_control !== CACHE_CONTROL) return false;
  if (!Number.isInteger(track.bytes) || track.bytes < MIN_AUDIO_BYTES) return false;
  if (!AUDIO_HASH_PATTERN.test(track.sha256 || '')) return false;
  if (!allowLocalFile && Object.hasOwn(track, 'local_file')) return false;
  if (plan.requests.length > 1) {
    if (!Array.isArray(track.request_parts) || track.request_parts.length !== plan.requests.length) {
      return false;
    }
    for (let index = 0; index < plan.requests.length; index += 1) {
      const request = plan.requests[index];
      const part = track.request_parts[index];
      if (part?.request_index !== request.index || part?.request_sha256 !== request.sha256) return false;
      if (!Number.isInteger(part.bytes) || part.bytes < MIN_AUDIO_BYTES) return false;
      if (!AUDIO_HASH_PATTERN.test(part.sha256 || '')) return false;
    }
  }
  return track.object_key === expectedTrackObjectKey(plan, trackId, track.sha256);
}

function containsPrivateManifestData(value, key = '') {
  if (key === 'local_file') return true;
  if (typeof value === 'string') {
    return /^[A-Za-z]:[\\/]/.test(value)
      || /(?:^|[\\/])(?:tmp|build)[\\/]narration[\\/]/i.test(value)
      || /(?:access[_-]?token|authorization:\s*bearer|private[_-]?key)/i.test(value);
  }
  if (Array.isArray(value)) return value.some((item) => containsPrivateManifestData(item));
  if (value && typeof value === 'object') {
    return Object.entries(value).some(([childKey, childValue]) => (
      containsPrivateManifestData(childValue, childKey)
    ));
  }
  return false;
}

export function manifestMatchesPlan(manifest, plan, { allowLocalFiles = false } = {}) {
  if (!manifest || typeof manifest !== 'object') return false;
  if (!allowLocalFiles && containsPrivateManifestData(manifest)) return false;
  if (manifest.schema_version !== PUZZLE_NARRATION_SCHEMA_VERSION) return false;
  if (manifest.content_id !== plan.contentId || manifest.source_path !== plan.sourcePath) return false;
  if (manifest.source_sha256 !== plan.sourceHash) return false;
  if (manifest.source_characters !== plan.charactersPerVoice) return false;
  if (stableJson(manifest.recipe) !== stableJson(plan.recipe)) return false;
  if (manifest.recipe_sha256 !== plan.recipeHash || manifest.release_sha256 !== plan.releaseHash) return false;
  if (manifest.generated_characters !== plan.plannedBillableCharacters) return false;
  if (manifest.default_voice !== PLAYBACK_POLICY.default_voice) return false;
  if (manifest.default_rate !== PLAYBACK_POLICY.default_rate) return false;
  if (stableJson(manifest.rate_options) !== stableJson(PLAYBACK_POLICY.rate_options)) return false;
  if (stableJson(manifest.request_chunks) !== stableJson(plan.requestChunks)) return false;
  if (stableJson(manifest.assembly) !== stableJson(plan.assembly)) return false;
  if (stableJson(manifest.segments) !== stableJson(plan.segments)) return false;
  if (!manifest.tracks || typeof manifest.tracks !== 'object') return false;
  if (stableJson(Object.keys(manifest.tracks).sort(compareStrings)) !== stableJson([...TRACK_IDS].sort(compareStrings))) {
    return false;
  }
  return TRACK_IDS.every((trackId) => trackManifestMatchesPlan(
    manifest.tracks[trackId],
    trackId,
    plan,
    { allowLocalFile: allowLocalFiles }
  ));
}

function readLocalManifest(root, plan, localTracks, validateAudio) {
  const outputDirectory = releaseOutputDirectory(root, plan);
  const manifestPath = path.join(outputDirectory, 'manifest-entry.json');
  if (!fs.existsSync(manifestPath)) return null;
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    throw new Error(`${plan.slug}: local manifest is invalid: ${error.message}`);
  }
  if (!manifestMatchesPlan(manifest, plan, { allowLocalFiles: true })) {
    throw new Error(`${plan.slug}: local manifest does not match the current plan`);
  }
  for (const trackId of TRACK_IDS) {
    const localTrack = localTracks[trackId];
    const manifestTrack = manifest.tracks[trackId];
    if (!localTrack || manifestTrack.bytes !== localTrack.bytes || manifestTrack.sha256 !== localTrack.sha256) {
      throw new Error(`${plan.slug}: local manifest ${trackId} metadata does not match its MP3`);
    }
    if (manifestTrack.local_file !== expectedLocalFile(root, outputDirectory, localTrack.fileName)) {
      throw new Error(`${plan.slug}: local manifest ${trackId} path is stale`);
    }
    if (plan.requests.length > 1) {
      const parts = discoverLocalRequestParts(root, plan, trackId, { validateAudio });
      for (const request of plan.requests) {
        const part = parts[request.index];
        const manifestPart = manifestTrack.request_parts[request.index - 1];
        if (!part || manifestPart.bytes !== part.bytes || manifestPart.sha256 !== part.sha256) {
          throw new Error(`${plan.slug}: local manifest ${trackId} request part is stale`);
        }
      }
    }
  }
  return manifest;
}

export function classifyPuzzleNarration({
  root,
  plan,
  publishedManifest = null,
  validateAudio = validateMp3Audio,
} = {}) {
  if (manifestMatchesPlan(publishedManifest, plan)) {
    return {
      classification: 'published-current',
      localTracks: {},
      localRequestParts: {},
      localManifest: null,
      pendingTrackIds: [],
      pendingRequests: [],
      pendingRequestCount: 0,
      pendingBillableCharacters: 0,
      pendingCostMicrodollars: 0,
    };
  }

  const localTracks = discoverLocalTracks(root, plan, { validateAudio });
  const outputDirectory = releaseOutputDirectory(root, plan);
  const localManifest = fs.existsSync(outputDirectory)
    ? readLocalManifest(root, plan, localTracks, validateAudio)
    : null;
  const pendingTrackIds = TRACK_IDS.filter((trackId) => !localTracks[trackId]);
  const localRequestParts = {};
  const pendingRequests = [];
  for (const trackId of pendingTrackIds) {
    const parts = plan.requests.length > 1
      ? discoverLocalRequestParts(root, plan, trackId, { validateAudio })
      : {};
    localRequestParts[trackId] = parts;
    for (const request of plan.requests) {
      if (!parts[request.index]) pendingRequests.push({ trackId, request });
    }
  }
  const pendingBillableCharacters = pendingRequests.reduce(
    (total, entry) => total + entry.request.characters,
    0
  );
  const localComplete = pendingTrackIds.length === 0 && localManifest !== null;
  return {
    classification: localComplete ? 'local-complete' : 'pending',
    localTracks,
    localRequestParts,
    localManifest,
    pendingTrackIds,
    pendingRequests,
    pendingRequestCount: pendingRequests.length,
    pendingBillableCharacters,
    pendingCostMicrodollars: costMicrodollarsForCharacters(pendingBillableCharacters),
  };
}

export function generationLockPath(root) {
  return path.join(root, 'build', 'narration', GENERATION_LOCK_FILE);
}

export function acquireGenerationLock({
  root,
  selection = PILOT_SLUG,
  pid = process.pid,
  now = () => new Date().toISOString(),
  token = crypto.randomBytes(16).toString('hex'),
} = {}) {
  if (!root) throw new Error('Generation lock requires a repository root');
  const lockPath = generationLockPath(root);
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });
  let descriptor;
  try {
    descriptor = fs.openSync(lockPath, 'wx');
    fs.writeFileSync(descriptor, `${JSON.stringify({
      schema_version: 1,
      pid,
      selection,
      acquired_at: now(),
      token,
    }, null, 2)}\n`, 'utf8');
    fs.closeSync(descriptor);
    descriptor = undefined;
  } catch (error) {
    if (descriptor !== undefined) {
      fs.closeSync(descriptor);
      if (fs.existsSync(lockPath)) fs.unlinkSync(lockPath);
    }
    if (error?.code === 'EEXIST') {
      let detail = '';
      try {
        const current = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
        detail = Number.isInteger(current.pid) ? ` by PID ${current.pid}` : '';
      } catch {
        detail = '';
      }
      throw new Error(`Narration generation is already locked${detail}`);
    }
    throw error;
  }

  let released = false;
  return {
    lockPath,
    release() {
      if (released) return;
      let current;
      try {
        current = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
      } catch (error) {
        throw new Error(`Cannot safely release narration generation lock: ${error.message}`);
      }
      if (current.token !== token) {
        throw new Error('Cannot safely release narration generation lock owned by another process');
      }
      fs.unlinkSync(lockPath);
      released = true;
    },
  };
}

function ensureReleaseScaffold(root, plan) {
  const outputDirectory = releaseOutputDirectory(root, plan);
  fs.mkdirSync(outputDirectory, { recursive: true });
  const narrationPath = path.join(outputDirectory, 'narration.txt');
  if (fs.existsSync(narrationPath)) {
    if (fs.readFileSync(narrationPath, 'utf8') !== `${plan.text}\n`) {
      throw new Error(`${plan.slug}: local narration text does not match the current plan`);
    }
  } else {
    writeFileAtomic(narrationPath, `${plan.text}\n`, { encoding: 'utf8' });
  }
  return outputDirectory;
}

export function persistGeneratedRequestPart({
  root,
  plan,
  trackId,
  request,
  audio,
  validateAudio = validateMp3Audio,
}) {
  if (!PUZZLE_NARRATION_VOICES[trackId]) throw new Error(`Unknown narration track: ${trackId}`);
  const plannedRequest = plan.requests[request.index - 1];
  if (!plannedRequest || stableJson(plannedRequest) !== stableJson(request)) {
    throw new Error(`${plan.slug}: ${trackId} request part is not in the current plan`);
  }
  validateAudio(audio, {
    expectedCharacters: request.characters,
    label: `${plan.slug}: ${trackId} request ${request.index}`,
  });
  ensureReleaseScaffold(root, plan);
  const partsDirectory = requestPartDirectory(root, plan, trackId);
  fs.mkdirSync(partsDirectory, { recursive: true });
  const audioHash = sha256(audio);
  const fileName = `${requestPartPrefix(request)}${audioHash.slice(0, 16)}.mp3`;
  const audioPath = path.join(partsDirectory, fileName);
  if (fs.existsSync(audioPath)) {
    const existing = fs.readFileSync(audioPath);
    if (existing.length !== audio.length || sha256(existing) !== audioHash) {
      throw new Error(`${plan.slug}: existing ${trackId} request part differs from generated audio`);
    }
  } else {
    writeFileAtomic(audioPath, audio);
  }
  return {
    requestIndex: request.index,
    fileName,
    absolutePath: audioPath,
    bytes: audio.length,
    sha256: audioHash,
  };
}

function assertSafeTemporaryDirectory(temporaryDirectory) {
  const resolved = path.resolve(temporaryDirectory);
  const temporaryRoot = path.resolve(os.tmpdir());
  if (path.dirname(resolved) !== temporaryRoot || !path.basename(resolved).startsWith('algonow-narration-')) {
    throw new Error('Refusing to remove an unexpected temporary narration directory');
  }
  return resolved;
}

export function assembleNarrationRequestParts({
  plan,
  trackId,
  parts,
  executable = ffmpegExecutable(),
  runner = spawnSync,
  analyzer = analyzeMp3WithFfmpeg,
}) {
  if (!Array.isArray(parts) || parts.length !== plan.requests.length || parts.length < 2) {
    throw new Error(`${plan.slug}: ${trackId} assembly requires every planned request part`);
  }
  for (let index = 0; index < parts.length; index += 1) {
    if (parts[index].requestIndex !== index + 1 || !fs.existsSync(parts[index].absolutePath)) {
      throw new Error(`${plan.slug}: ${trackId} request part ${index + 1} is unavailable`);
    }
  }
  const partAnalyses = parts.map((part) => analyzer(fs.readFileSync(part.absolutePath)));
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'algonow-narration-'));
  try {
    const concatLines = [];
    for (let index = 0; index < parts.length; index += 1) {
      const temporaryFileName = `part-${String(index + 1).padStart(3, '0')}.mp3`;
      fs.copyFileSync(parts[index].absolutePath, path.join(temporaryDirectory, temporaryFileName));
      concatLines.push(`file '${temporaryFileName}'`);
    }
    const concatPath = path.join(temporaryDirectory, 'concat.txt');
    const outputPath = path.join(temporaryDirectory, 'assembled.mp3');
    fs.writeFileSync(concatPath, `${concatLines.join('\n')}\n`, 'utf8');
    const result = runner(executable, [
      '-hide_banner',
      '-nostdin',
      '-loglevel',
      'error',
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      concatPath,
      '-map',
      '0:a:0',
      '-vn',
      '-codec:a',
      MULTIPART_ASSEMBLY.audio_codec,
      '-y',
      outputPath,
    ], {
      encoding: 'utf8',
      maxBuffer: FFMPEG_MAX_OUTPUT_BYTES,
      timeout: FFMPEG_TIMEOUT_MS,
      windowsHide: true,
    });
    if (result?.error || result?.status !== 0 || !fs.existsSync(outputPath)) {
      const detail = result?.error?.message
        || String(result?.stderr || '').trim().split(/\r?\n/).at(-1)
        || 'unknown ffmpeg error';
      throw new Error(`${plan.slug}: ${trackId} request-part assembly failed: ${detail}`);
    }
    const assembled = fs.readFileSync(outputPath);
    const assembledAnalysis = analyzer(assembled);
    const expectedSamples = partAnalyses.reduce((total, analysis) => total + analysis.samples, 0);
    const sampleTolerance = 1_152 * parts.length;
    if (Math.abs(assembledAnalysis.samples - expectedSamples) > sampleTolerance) {
      throw new Error(`${plan.slug}: ${trackId} assembled sample count differs from its parts`);
    }
    const expectedDuration = partAnalyses.reduce(
      (total, analysis) => total + analysis.durationSeconds,
      0
    );
    const durationTolerance = Math.max(0.25, parts.length * 0.05);
    if (Math.abs(assembledAnalysis.durationSeconds - expectedDuration) > durationTolerance) {
      throw new Error(`${plan.slug}: ${trackId} assembled duration differs from its parts`);
    }
    return assembled;
  } finally {
    const safeDirectory = assertSafeTemporaryDirectory(temporaryDirectory);
    fs.rmSync(safeDirectory, { recursive: true, force: true });
  }
}

export function persistGeneratedTrack({
  root,
  plan,
  trackId,
  audio,
  validateAudio = validateMp3Audio,
}) {
  if (!PUZZLE_NARRATION_VOICES[trackId]) throw new Error(`Unknown narration track: ${trackId}`);
  validateAudio(audio, {
    expectedCharacters: plan.charactersPerVoice,
    label: `${plan.slug}: ${trackId} final track`,
  });
  const outputDirectory = ensureReleaseScaffold(root, plan);
  const audioHash = sha256(audio);
  const fileName = `${trackId}-${audioHash.slice(0, 16)}.mp3`;
  const audioPath = path.join(outputDirectory, fileName);
  if (fs.existsSync(audioPath)) {
    const existing = fs.readFileSync(audioPath);
    if (existing.length !== audio.length || sha256(existing) !== audioHash) {
      throw new Error(`${plan.slug}: existing ${trackId} track differs from generated audio`);
    }
  } else {
    writeFileAtomic(audioPath, audio);
  }
  return { fileName, absolutePath: audioPath, bytes: audio.length, sha256: audioHash };
}

function buildTrackManifest(root, outputDirectory, plan, trackId, track, requestParts) {
  const manifest = {
    ...PUZZLE_NARRATION_VOICES[trackId],
    object_key: expectedTrackObjectKey(plan, trackId, track.sha256),
    content_type: CONTENT_TYPE,
    cache_control: CACHE_CONTROL,
    bytes: track.bytes,
    sha256: track.sha256,
    local_file: expectedLocalFile(root, outputDirectory, track.fileName),
  };
  if (plan.requests.length > 1) {
    manifest.request_parts = plan.requests.map((request) => {
      const part = requestParts[request.index];
      if (!part) throw new Error(`${plan.slug}: missing ${trackId} request part ${request.index}`);
      return {
        request_index: request.index,
        request_sha256: request.sha256,
        bytes: part.bytes,
        sha256: part.sha256,
      };
    });
  }
  return manifest;
}

export function finalizeLocalRelease({
  root,
  plan,
  generatedAt = new Date().toISOString(),
  validateAudio = validateMp3Audio,
} = {}) {
  const outputDirectory = ensureReleaseScaffold(root, plan);
  const localTracks = discoverLocalTracks(root, plan, { validateAudio });
  const missingTrackIds = TRACK_IDS.filter((trackId) => !localTracks[trackId]);
  if (missingTrackIds.length > 0) {
    throw new Error(`${plan.slug}: cannot finalize; missing tracks: ${missingTrackIds.join(', ')}`);
  }
  const existingManifest = readLocalManifest(root, plan, localTracks, validateAudio);
  if (existingManifest) return existingManifest;

  const requestPartsByTrack = Object.fromEntries(TRACK_IDS.map((trackId) => [
    trackId,
    plan.requests.length > 1
      ? discoverLocalRequestParts(root, plan, trackId, { validateAudio })
      : {},
  ]));
  const tracks = Object.fromEntries(TRACK_IDS.map((trackId) => [
    trackId,
    buildTrackManifest(
      root,
      outputDirectory,
      plan,
      trackId,
      localTracks[trackId],
      requestPartsByTrack[trackId]
    ),
  ]));
  const manifest = {
    schema_version: PUZZLE_NARRATION_SCHEMA_VERSION,
    content_id: plan.contentId,
    source_path: plan.sourcePath,
    source_sha256: plan.sourceHash,
    source_characters: plan.charactersPerVoice,
    recipe: plan.recipe,
    recipe_sha256: plan.recipeHash,
    release_sha256: plan.releaseHash,
    generated_at: generatedAt,
    generated_characters: plan.plannedBillableCharacters,
    default_voice: PLAYBACK_POLICY.default_voice,
    default_rate: PLAYBACK_POLICY.default_rate,
    rate_options: PLAYBACK_POLICY.rate_options,
    request_chunks: plan.requestChunks,
    assembly: plan.assembly,
    segments: plan.segments,
    tracks,
  };
  writeFileAtomic(
    path.join(outputDirectory, 'manifest-entry.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    { encoding: 'utf8' }
  );
  return manifest;
}

export function createRequestRateGate({
  minimumIntervalMs = MIN_REQUEST_INTERVAL_MS,
  now = () => Date.now(),
  sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
} = {}) {
  if (!Number.isFinite(minimumIntervalMs) || minimumIntervalMs < MIN_REQUEST_INTERVAL_MS) {
    throw new Error(`Request interval must be at least ${MIN_REQUEST_INTERVAL_MS} milliseconds`);
  }
  let lastStart = null;
  let requestQueue = Promise.resolve();
  return function waitForRequestStart() {
    const queuedStart = requestQueue.then(async () => {
      if (lastStart !== null) {
        const earliestStart = lastStart + minimumIntervalMs;
        while (now() < earliestStart) await sleep(Math.ceil(earliestStart - now()));
      }
      lastStart = now();
      return lastStart;
    });
    requestQueue = queuedStart.catch(() => {});
    return queuedStart;
  };
}

export async function synthesizeWithTransientRetry({
  synthesize,
  requestRateGate,
  synthesis,
  beforeAttempt = null,
  onAttemptResponse = null,
  onAttemptError = null,
  maximumAttempts = MAX_TRANSIENT_SYNTHESIS_ATTEMPTS,
  baseDelayMs = TRANSIENT_RETRY_BASE_DELAY_MS,
  sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
} = {}) {
  if (typeof synthesize !== 'function' || typeof requestRateGate !== 'function') {
    throw new Error('Synthesis retry requires synthesize and request-rate-gate functions');
  }
  if (!Number.isSafeInteger(maximumAttempts) || maximumAttempts < 1) {
    throw new Error('Synthesis retry attempt limit must be a positive safe integer');
  }
  if (!Number.isFinite(baseDelayMs) || baseDelayMs < 0) {
    throw new Error('Synthesis retry base delay must be nonnegative');
  }
  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    await requestRateGate();
    const attemptContext = typeof beforeAttempt === 'function'
      ? await beforeAttempt({ attempt, synthesis })
      : null;
    let result;
    try {
      result = await synthesize({ ...synthesis, attempt });
    } catch (error) {
      if (typeof onAttemptError === 'function') {
        await onAttemptError({ attempt, attemptContext, error, synthesis });
      }
      if (error?.ambiguous || !error?.retryable || attempt === maximumAttempts) throw error;
      await sleep(baseDelayMs * (2 ** (attempt - 1)));
      continue;
    }
    if (typeof onAttemptResponse === 'function') {
      try {
        await onAttemptResponse({ attempt, attemptContext, result, synthesis });
      } catch (cause) {
        const error = new Error('Provider response was received but could not be safely journaled');
        error.cause = cause;
        error.responseReceivedUnpersisted = true;
        if (typeof onAttemptError === 'function') {
          await onAttemptError({ attempt, attemptContext, error, synthesis });
        }
        throw error;
      }
    }
    return result;
  }
  throw new Error('Synthesis retry loop exhausted unexpectedly');
}

export async function executePuzzleGeneration({
  root,
  plan,
  project,
  accessToken,
  synthesize,
  requestRateGate,
  attemptJournal,
  validateAudio = validateMp3Audio,
  assembleAudio = assembleNarrationRequestParts,
  generatedAt,
} = {}) {
  if (project !== APPROVED_BILLING_PROJECT) {
    throw new Error(`Narration billing project must be ${APPROVED_BILLING_PROJECT}`);
  }
  if (!attemptJournal
    || typeof attemptJournal.assertReadyForExecution !== 'function'
    || typeof attemptJournal.recordSubmission !== 'function'
    || typeof attemptJournal.markProviderError !== 'function'
    || typeof attemptJournal.markAmbiguous !== 'function'
    || typeof attemptJournal.markResponseReceived !== 'function'
    || typeof attemptJournal.markResponseUnpersisted !== 'function'
    || typeof attemptJournal.markPersisted !== 'function') {
    throw new Error('Guarded generation requires a durable attempt journal');
  }
  attemptJournal.assertReadyForExecution();
  let state = classifyPuzzleNarration({ root, plan, validateAudio });
  if (state.classification === 'published-current' || state.classification === 'local-complete') {
    return state;
  }

  async function synthesizeReviewedRequest(trackId, request) {
    let receivedAttemptId = '';
    const audio = await synthesizeWithTransientRetry({
      synthesize,
      requestRateGate,
      synthesis: {
        accessToken,
        project,
        text: request.text,
        voice: PUZZLE_NARRATION_VOICES[trackId],
        trackId,
        request,
      },
      beforeAttempt: () => attemptJournal.recordSubmission({ trackId, request }),
      onAttemptResponse: ({ attemptContext }) => {
        receivedAttemptId = attemptContext.attempt_id;
        attemptJournal.markResponseReceived(receivedAttemptId);
      },
      onAttemptError: ({ attemptContext, error }) => {
        if (!attemptContext?.attempt_id) return;
        if (error?.ambiguous) {
          attemptJournal.markAmbiguous(attemptContext.attempt_id);
        } else if (error?.responseReceivedUnpersisted) {
          attemptJournal.markResponseUnpersisted(attemptContext.attempt_id);
        } else {
          attemptJournal.markProviderError(attemptContext.attempt_id, {
            retryable: error?.retryable,
            httpStatus: error?.httpStatus,
          });
        }
      },
    });
    if (!receivedAttemptId) {
      throw new Error(`${plan.slug}: provider response has no durable attempt identity`);
    }
    return { audio, attemptId: receivedAttemptId };
  }

  function persistReceivedAudio(attemptId, persist) {
    try {
      const persisted = persist();
      attemptJournal.markPersisted(attemptId);
      return persisted;
    } catch (error) {
      try {
        attemptJournal.markResponseUnpersisted(attemptId);
      } catch (journalError) {
        error.cause = journalError;
      }
      throw error;
    }
  }

  for (const trackId of state.pendingTrackIds) {
    if (plan.requests.length === 1) {
      const request = plan.requests[0];
      const { audio, attemptId } = await synthesizeReviewedRequest(trackId, request);
      persistReceivedAudio(attemptId, () => persistGeneratedTrack({
        root,
        plan,
        trackId,
        audio,
        validateAudio,
      }));
      continue;
    }

    let localParts = state.localRequestParts[trackId] || {};
    for (const request of plan.requests) {
      if (localParts[request.index]) continue;
      const { audio, attemptId } = await synthesizeReviewedRequest(trackId, request);
      persistReceivedAudio(attemptId, () => persistGeneratedRequestPart({
        root,
        plan,
        trackId,
        request,
        audio,
        validateAudio,
      }));
      localParts = discoverLocalRequestParts(root, plan, trackId, { validateAudio });
    }
    const orderedParts = plan.requests.map((request) => localParts[request.index]);
    const assembled = await assembleAudio({ plan, trackId, parts: orderedParts });
    persistGeneratedTrack({ root, plan, trackId, audio: assembled, validateAudio });
  }

  finalizeLocalRelease({ root, plan, generatedAt, validateAudio });
  state = classifyPuzzleNarration({ root, plan, validateAudio });
  if (state.classification !== 'local-complete') {
    throw new Error(`${plan.slug}: release did not reach local-complete state`);
  }
  return state;
}
