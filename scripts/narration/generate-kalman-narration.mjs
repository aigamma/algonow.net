import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { narration } from '../../src/content/kalman-covariance-correction.narration.js';
import {
  APPROVED_BILLING_PROJECT,
  GOOGLE_REQUEST_TIMEOUT_MS,
  IMPLEMENTATION_CONTRACT,
  LIST_PRICE_PER_MILLION_CHARACTERS,
  MAX_REQUESTS_PER_MINUTE,
  MAX_SYNCHRONOUS_INPUT_BYTES,
  MAX_TRANSIENT_SYNTHESIS_ATTEMPTS,
  MIN_REQUEST_INTERVAL_MS,
  PILOT_SLUG,
  PILOT_SOURCE_PATH,
  PLAYBACK_POLICY,
  TRANSIENT_RETRY_BASE_DELAY_MS,
  acquireGenerationLock,
  assertFfmpegAvailable,
  buildPuzzleNarrationPlan,
  classifyPuzzleNarration,
  createNarrationAttemptJournal,
  createRequestRateGate,
  executePuzzleGeneration,
  formatMicrodollars,
  parseUsdMicrodollars,
  reconcileNarrationAttempt,
  summarizeNarrationAttemptJournal,
  writeReviewArtifact,
} from './puzzle-narration-pipeline.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const PUBLIC_MANIFEST_PATH = path.join(
  ROOT,
  'src',
  'data',
  'narration',
  'kalman-covariance-correction.json'
);

export function parseGenerationArguments(argv) {
  const options = {
    execute: false,
    project: '',
    maxUsd: '',
    maxMicrodollars: null,
    approvedPlanSha256: '',
    reconcileAttemptId: '',
    reconcileProviderBilled: null,
    authorizeExactResubmission: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--execute') options.execute = true;
    else if (argument === '--project') options.project = argv[++index] || '';
    else if (argument === '--max-usd') options.maxUsd = argv[++index] || '';
    else if (argument === '--approved-plan-sha256') {
      options.approvedPlanSha256 = (argv[++index] || '').toLowerCase();
    } else if (argument === '--reconcile-attempt') {
      options.reconcileAttemptId = (argv[++index] || '').toLowerCase();
    } else if (argument === '--reconcile-provider-billed') {
      const value = (argv[++index] || '').toLowerCase();
      if (value !== 'yes' && value !== 'no') {
        throw new Error('--reconcile-provider-billed must be yes or no');
      }
      options.reconcileProviderBilled = value === 'yes';
    } else if (argument === '--authorize-exact-resubmission') {
      options.authorizeExactResubmission = true;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  const reconciliationRequested = Boolean(
    options.reconcileAttemptId
    || options.reconcileProviderBilled !== null
    || options.authorizeExactResubmission
  );
  if (options.execute && reconciliationRequested) {
    throw new Error('Reconciliation cannot be combined with --execute');
  }
  if (!options.execute && !reconciliationRequested) {
    if (options.project || options.maxUsd || options.approvedPlanSha256) {
      throw new Error('Paid-generation arguments require --execute or exact reconciliation');
    }
    return options;
  }
  if (options.project !== APPROVED_BILLING_PROJECT) {
    throw new Error(`--project must be the reviewed billing project ${APPROVED_BILLING_PROJECT}`);
  }
  if (!/^[a-f0-9]{64}$/.test(options.approvedPlanSha256)) {
    throw new Error('--approved-plan-sha256 must be the 64-character hash from the reviewed plan');
  }
  if (reconciliationRequested) {
    if (options.maxUsd) throw new Error('Reconciliation does not accept --max-usd');
    if (!/^[a-f0-9]{64}$/.test(options.reconcileAttemptId)
      || options.reconcileProviderBilled === null
      || !options.authorizeExactResubmission) {
      throw new Error(
        'Reconciliation requires one exact attempt, billed yes or no, and exact resubmission authorization'
      );
    }
    return options;
  }
  options.maxMicrodollars = parseUsdMicrodollars(options.maxUsd);
  return options;
}

function resolveGcloud() {
  const candidates = [
    process.env.GCLOUD_PATH,
    path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Cloud SDK', 'google-cloud-sdk', 'bin', 'gcloud.cmd'),
    'C:\\Program Files (x86)\\Google\\Cloud SDK\\google-cloud-sdk\\bin\\gcloud.cmd',
    'C:\\Program Files\\Google\\Cloud SDK\\google-cloud-sdk\\bin\\gcloud.cmd',
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate)) || 'gcloud';
}

function gcloudInvocation(args) {
  const gcloud = resolveGcloud();
  if (process.platform === 'win32' && /\.cmd$/i.test(gcloud)) {
    const sdkRoot = path.resolve(path.dirname(gcloud), '..');
    const bundledPython = path.join(sdkRoot, 'platform', 'bundledpython', 'python.exe');
    const launcher = path.join(sdkRoot, 'lib', 'gcloud.py');
    if (!fs.existsSync(bundledPython) || !fs.existsSync(launcher)) {
      throw new Error('The Google Cloud SDK launcher is incomplete');
    }
    return { executable: bundledPython, args: [launcher, ...args] };
  }
  return { executable: gcloud, args };
}

function getApplicationDefaultAccessToken() {
  const invocation = gcloudInvocation([
    'auth',
    'application-default',
    'print-access-token',
  ]);
  const token = execFileSync(invocation.executable, invocation.args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
    timeout: 30_000,
    windowsHide: true,
  }).trim();
  if (!token) throw new Error('Google Application Default Credentials returned no access token');
  return token;
}

function responseError(status, detail) {
  const error = new Error(
    `Google Text-to-Speech request failed (${status}): ${String(detail || '').slice(0, 800)}`
  );
  error.retryable = status === 429 || status >= 500;
  error.httpStatus = status;
  return error;
}

function responseReceivedUnpersistedError(message, cause) {
  const error = new Error(message);
  error.cause = cause;
  error.responseReceivedUnpersisted = true;
  error.retryable = false;
  return error;
}

export async function synthesizeGoogle({ accessToken, project, text, voice }) {
  if (typeof accessToken !== 'string' || !accessToken) {
    throw new Error('Google Text-to-Speech requires a short-lived access token');
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GOOGLE_REQUEST_TIMEOUT_MS);
  let response;
  try {
    response = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Goog-User-Project': project,
      },
      body: JSON.stringify({
        input: { text },
        voice: {
          languageCode: voice.language_code,
          name: voice.voice_id,
        },
        audioConfig: { audioEncoding: 'MP3' },
      }),
      signal: controller.signal,
    });
  } catch (cause) {
    clearTimeout(timeout);
    const error = new Error(
      'Google Text-to-Speech ended without a definitive response. Stop, reconcile provider activity, then make an explicit retry decision.'
    );
    error.cause = cause;
    error.ambiguous = true;
    error.retryable = false;
    throw error;
  }

  try {
    if (!response.ok) {
      let detail = '';
      try {
        detail = await response.text();
      } catch {
        detail = 'provider error response body was unreadable';
      }
      throw responseError(response.status, detail);
    }
    let payload;
    try {
      payload = await response.json();
    } catch (cause) {
      throw responseReceivedUnpersistedError(
        'Google Text-to-Speech returned an unreadable successful response',
        cause
      );
    }
    if (typeof payload.audioContent !== 'string' || !payload.audioContent) {
      throw responseReceivedUnpersistedError(
        'Google Text-to-Speech returned no audio content'
      );
    }
    let audio;
    try {
      audio = Buffer.from(payload.audioContent, 'base64');
    } catch (cause) {
      throw responseReceivedUnpersistedError(
        'Google Text-to-Speech returned invalid audio encoding',
        cause
      );
    }
    if (audio.length < 1_000) {
      throw responseReceivedUnpersistedError(
        `Google Text-to-Speech returned an unexpectedly small MP3 (${audio.length} bytes)`
      );
    }
    return audio;
  } finally {
    clearTimeout(timeout);
  }
}

export function createFreshTokenSynthesizer({
  getAccessToken = getApplicationDefaultAccessToken,
  synthesize = synthesizeGoogle,
} = {}) {
  if (typeof getAccessToken !== 'function' || typeof synthesize !== 'function') {
    throw new Error('Fresh-token synthesis requires token and synthesis functions');
  }
  return async (request) => synthesize({
    ...request,
    accessToken: getAccessToken(),
  });
}

export function buildPilotPlan() {
  return buildPuzzleNarrationPlan({
    slug: PILOT_SLUG,
    narration,
    sourcePath: PILOT_SOURCE_PATH,
  });
}

function loadPublishedManifest() {
  if (!fs.existsSync(PUBLIC_MANIFEST_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(PUBLIC_MANIFEST_PATH, 'utf8'));
  } catch (error) {
    throw new Error(`Pilot public narration manifest is invalid: ${error.message}`);
  }
}

function buildReport({ plan, state, artifact, outputPath, mode, attemptSummary }) {
  return {
    mode,
    selection: `slug:${PILOT_SLUG}`,
    implementation_contract: IMPLEMENTATION_CONTRACT,
    billing_project: APPROVED_BILLING_PROJECT,
    review_artifact: path.relative(ROOT, outputPath).replaceAll('\\', '/'),
    approval_sha256: artifact.approval_sha256,
    classification: state.classification,
    content_id: plan.contentId,
    source_path: plan.sourcePath,
    source_sha256: plan.sourceHash,
    source_characters: plan.charactersPerVoice,
    recipe_sha256: plan.recipeHash,
    release_sha256: plan.releaseHash,
    voice_count: 2,
    default_voice: PLAYBACK_POLICY.default_voice,
    default_rate: PLAYBACK_POLICY.default_rate,
    rate_options: PLAYBACK_POLICY.rate_options,
    utf8_bytes_per_voice: plan.inputBytes,
    request_count_per_voice: plan.requests.length,
    planned_provider_requests: plan.plannedRequestCount,
    planned_billable_characters: plan.plannedBillableCharacters,
    checked_in_list_price_usd_per_million_characters: LIST_PRICE_PER_MILLION_CHARACTERS,
    planned_list_price_usd_exact: formatMicrodollars(plan.plannedCostMicrodollars),
    pending_tracks: state.pendingTrackIds,
    pending_provider_requests: state.pendingRequestCount,
    pending_billable_characters: state.pendingBillableCharacters,
    pending_list_price_usd_exact: formatMicrodollars(state.pendingCostMicrodollars),
    cumulative_submitted_provider_attempts: attemptSummary.attempt_count,
    cumulative_submitted_characters: attemptSummary.submitted_characters,
    cumulative_submitted_list_price_usd_exact: formatMicrodollars(
      attemptSummary.submitted_cost_microdollars
    ),
    unresolved_attempts: attemptSummary.blocking_attempt_ids,
    request_policy: {
      maximum_utf8_bytes_per_request: MAX_SYNCHRONOUS_INPUT_BYTES,
      maximum_requests_per_minute: MAX_REQUESTS_PER_MINUTE,
      minimum_request_interval_ms: MIN_REQUEST_INTERVAL_MS,
      maximum_transient_attempts: MAX_TRANSIENT_SYNTHESIS_ATTEMPTS,
      transient_retry_base_delay_ms: TRANSIENT_RETRY_BASE_DELAY_MS,
      request_timeout_ms: GOOGLE_REQUEST_TIMEOUT_MS,
      ambiguous_outcome_policy: 'fail-closed-and-reconcile-before-explicit-retry',
      spend_ceiling_policy: 'all-durably-journaled-provider-submissions-across-reruns',
    },
    request_chunks: plan.requestChunks,
    segments: plan.segments,
  };
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseGenerationArguments(argv);
  const plan = buildPilotPlan();
  const { artifact, outputPath } = writeReviewArtifact(ROOT, plan);
  const publishedManifest = loadPublishedManifest();
  let state = classifyPuzzleNarration({ root: ROOT, plan, publishedManifest });
  let attemptSummary = summarizeNarrationAttemptJournal({ root: ROOT, plan });
  const mode = options.execute
    ? 'execute-preflight'
    : (options.reconcileAttemptId ? 'reconcile-preflight' : 'plan');

  console.log(JSON.stringify(buildReport({
    plan,
    state,
    artifact,
    outputPath,
    mode,
    attemptSummary,
  }), null, 2));
  if (!options.execute && !options.reconcileAttemptId) return;

  if (artifact.approval_sha256 !== options.approvedPlanSha256) {
    throw new Error(
      `Reviewed plan hash mismatch. Current approval hash is ${artifact.approval_sha256}`
    );
  }

  const generationLock = acquireGenerationLock({ root: ROOT, selection: PILOT_SLUG });
  try {
    if (options.reconcileAttemptId) {
      const reconciled = reconcileNarrationAttempt({
        root: ROOT,
        plan,
        project: options.project,
        attemptId: options.reconcileAttemptId,
        providerBilled: options.reconcileProviderBilled,
        authorizeExactResubmission: options.authorizeExactResubmission,
      });
      console.log(JSON.stringify({
        mode: 'reconciled',
        attempt_id: reconciled.attempt_id,
        provider_billed: reconciled.reconciliation.provider_billed,
        next_action: reconciled.reconciliation.next_action,
      }, null, 2));
      return;
    }
    state = classifyPuzzleNarration({ root: ROOT, plan, publishedManifest });
    const attemptJournal = createNarrationAttemptJournal({
      root: ROOT,
      plan,
      project: options.project,
      maxMicrodollars: options.maxMicrodollars,
    });
    attemptSummary = attemptJournal.assertReadyForExecution();
    if (attemptSummary.submitted_cost_microdollars + state.pendingCostMicrodollars
      > options.maxMicrodollars) {
      throw new Error(
        `Cumulative submissions plus exact pending estimate exceed --max-usd ${options.maxUsd}`
      );
    }
    if (state.classification === 'published-current' || state.classification === 'local-complete') {
      console.log(`${PILOT_SLUG}: no generation is pending`);
      return;
    }

    assertFfmpegAvailable();
    const requestRateGate = createRequestRateGate();
    await executePuzzleGeneration({
      root: ROOT,
      plan,
      project: options.project,
      accessToken: '',
      synthesize: createFreshTokenSynthesizer(),
      requestRateGate,
      attemptJournal,
    });
    console.log(`${PILOT_SLUG}: local-complete`);
  } finally {
    generationLock.release();
  }
}

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
