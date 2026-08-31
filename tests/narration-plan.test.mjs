import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { narration as kalmanNarration } from '../src/content/kalman-covariance-correction.narration.js';
import {
  createFreshTokenSynthesizer,
  parseGenerationArguments,
} from '../scripts/narration/generate-kalman-narration.mjs';
import {
  APPROVED_BILLING_PROJECT,
  IMPLEMENTATION_CONTRACT,
  MAX_PROVIDER_FRAGMENT_BYTES,
  MAX_SYNCHRONOUS_INPUT_BYTES,
  PILOT_SLUG,
  PILOT_SOURCE_PATH,
  PLAYBACK_POLICY,
  PUZZLE_NARRATION_VOICES,
  acquireGenerationLock,
  assertNarrationTextIsPublicationReady,
  buildPuzzleNarrationPlan,
  buildReviewArtifact,
  classifyPuzzleNarration,
  createNarrationAttemptJournal,
  executePuzzleGeneration,
  formatMicrodollars,
  manifestMatchesPlan,
  narrationAttemptJournalPath,
  readNarrationAttemptJournal,
  reconcileNarrationAttempt,
  requiresProviderSentenceFragmentation,
  sha256,
  splitNarrationForProvider,
  stableJson,
  summarizeNarrationAttemptJournal,
  synthesizeWithTransientRetry,
  validateMp3Audio,
} from '../scripts/narration/puzzle-narration-pipeline.mjs';

function buildPilotPlan() {
  return buildPuzzleNarrationPlan({
    slug: PILOT_SLUG,
    narration: kalmanNarration,
    sourcePath: PILOT_SOURCE_PATH,
  });
}

function temporaryRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'algonow-narration-test-'));
}

function removeTemporaryRoot(root) {
  const resolved = path.resolve(root);
  assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
  assert.match(path.basename(resolved), /^algonow-narration-test-/);
  fs.rmSync(resolved, { recursive: true, force: true });
}

test('Kalman plan has pinned identity, exact cost, and lossless Google requests', () => {
  const plan = buildPilotPlan();

  assert.equal(plan.inputBytes, 9_773);
  assert.equal(plan.charactersPerVoice, 9_741);
  assert.equal(plan.plannedBillableCharacters, 19_482);
  assert.equal(plan.plannedCostMicrodollars, 584_460);
  assert.equal(formatMicrodollars(plan.plannedCostMicrodollars), '0.584460');
  assert.equal(plan.requests.length, 2);
  assert.equal(plan.plannedRequestCount, 4);
  assert.equal(plan.requests.map((request) => request.text).join(''), plan.text);
  assert.ok(plan.requests.every((request) => request.utf8_bytes <= MAX_SYNCHRONOUS_INPUT_BYTES));
  assert.deepEqual(
    plan.requests.map((request) => request.utf8_bytes),
    [4_942, 4_831]
  );
  assert.equal(plan.sourceHash, '537f81bd6e0e7948971f6095f3177210122d396fac7e77238e908f91a71b40f4');
  assert.equal(plan.recipeHash, '251cfe29107da7c189a431aff1f9f436b511686ca37508ab09c8df62bcc412f3');
  assert.equal(plan.releaseHash, '3e987b927c5f7958cb3fa559dd758895dcced16bdf14e7a2a699cadef47fa7ad');
});

test('review artifact binds exact text, requests, provenance, voices, and playback defaults', () => {
  const plan = buildPilotPlan();
  const artifact = buildReviewArtifact(plan);
  const { approval_sha256: approvalSha256, ...unsignedArtifact } = artifact;

  assert.deepEqual(artifact.implementation_contract, IMPLEMENTATION_CONTRACT);
  assert.equal(artifact.billing_project, APPROVED_BILLING_PROJECT);
  assert.equal(artifact.inventory.length, 1);
  assert.equal(artifact.inventory[0].normalized_text, plan.text);
  assert.deepEqual(artifact.inventory[0].requests, plan.requests);
  assert.equal(approvalSha256, sha256(stableJson(unsignedArtifact)));
  assert.equal(approvalSha256, '68825c26abf5d55bc02dcfeb100250d4488516a9a80a88b634879403065a85b4');

  assert.equal(PLAYBACK_POLICY.default_voice, 'aoede');
  assert.equal(PLAYBACK_POLICY.default_rate, 1.25);
  assert.deepEqual(PLAYBACK_POLICY.rate_options, [
    { value: 1, label: '1.00x' },
    { value: 1.25, label: '1.25x' },
    { value: 1.5, label: '1.50x' },
    { value: 1.75, label: '1.75x' },
  ]);
  assert.equal(PUZZLE_NARRATION_VOICES.aoede.gender, 'female');
  assert.equal(PUZZLE_NARRATION_VOICES.aoede.voice_id, 'en-US-Chirp3-HD-Aoede');
  assert.equal(PUZZLE_NARRATION_VOICES.algieba.gender, 'male');
  assert.equal(PUZZLE_NARRATION_VOICES.algieba.voice_id, 'en-US-Chirp3-HD-Algieba');
  assert.equal(plan.recipe.speaking_rate, 1);
});

test('public manifest identity requires Aoede and the exact 1.25 playback policy', () => {
  const plan = buildPilotPlan();
  const tracks = Object.fromEntries(
    Object.entries(PUZZLE_NARRATION_VOICES).map(([trackId, voice], index) => {
      const audioHash = String(index + 1).repeat(64);
      return [trackId, {
        ...voice,
        object_key: `narration/v1/puzzles/${PILOT_SLUG}/${plan.releasePrefix}/${trackId}-${audioHash.slice(0, 16)}.mp3`,
        content_type: 'audio/mpeg',
        cache_control: 'public,max-age=31536000,immutable',
        bytes: 10_000,
        sha256: audioHash,
        request_parts: plan.requests.map((request, requestIndex) => ({
          request_index: request.index,
          request_sha256: request.sha256,
          bytes: 5_000,
          sha256: String(requestIndex + index + 3).repeat(64),
        })),
      }];
    })
  );
  const manifest = {
    schema_version: 1,
    content_id: plan.contentId,
    source_path: plan.sourcePath,
    source_sha256: plan.sourceHash,
    source_characters: plan.charactersPerVoice,
    recipe: plan.recipe,
    recipe_sha256: plan.recipeHash,
    release_sha256: plan.releaseHash,
    generated_characters: plan.plannedBillableCharacters,
    default_voice: 'aoede',
    default_rate: 1.25,
    rate_options: PLAYBACK_POLICY.rate_options,
    request_chunks: plan.requestChunks,
    assembly: plan.assembly,
    segments: plan.segments,
    tracks,
  };

  assert.equal(manifestMatchesPlan(manifest, plan), true);
  assert.equal(manifestMatchesPlan({ ...manifest, default_rate: 1 }, plan), false);
  assert.equal(manifestMatchesPlan({
    ...manifest,
    tracks: {
      ...manifest.tracks,
      aoede: { ...manifest.tracks.aoede, local_file: 'build/narration/private.mp3' },
    },
  }, plan), false);
});

test('publication artifact gate rejects URLs, executable source, sentinels, and visual numerals', () => {
  const unsafe = [
    'Read https://example.test/source.',
    'def hidden_example():\n return true',
    'The EXECUTABLE_CODE_SENTINEL reached narration.',
    'Use 1.25 speed in the spoken source.',
  ];
  for (const text of unsafe) {
    assert.throws(() => assertNarrationTextIsPublicationReady(text), /contains/);
  }
  assert.equal(
    assertNarrationTextIsPublicationReady('Safe authored prose for the ear.'),
    'Safe authored prose for the ear.'
  );
});

test('long provider sentences fragment deterministically without changing source text', () => {
  const longSentence = `${'alpha, '.repeat(160)}omega.`;
  assert.equal(requiresProviderSentenceFragmentation(longSentence), true);
  const requests = splitNarrationForProvider(longSentence);
  assert.ok(requests.length > 1);
  assert.ok(requests.every((request) => request.utf8_bytes <= MAX_PROVIDER_FRAGMENT_BYTES));
  assert.equal(requests.map((request) => request.text).join(''), longSentence);
});

test('credential-free classification computes the exact pending amount', () => {
  const root = temporaryRoot();
  try {
    const plan = buildPilotPlan();
    const state = classifyPuzzleNarration({ root, plan });
    assert.equal(state.classification, 'pending');
    assert.deepEqual(state.pendingTrackIds, ['aoede', 'algieba']);
    assert.equal(state.pendingRequestCount, 4);
    assert.equal(state.pendingBillableCharacters, 19_482);
    assert.equal(state.pendingCostMicrodollars, 584_460);
  } finally {
    removeTemporaryRoot(root);
  }
});

test('guarded local generation sends identical text to Aoede and Algieba', async () => {
  const root = temporaryRoot();
  try {
    const plan = buildPuzzleNarrationPlan({
      slug: 'same-text-fixture',
      sourcePath: 'src/content/same-text-fixture.narration.js',
      narration: [{
        section: 'puzzle',
        text: 'The same reviewed prose must reach both preserved voices.',
      }],
    });
    const calls = [];
    let audioByte = 1;
    const validateAudio = () => ({
      codecName: 'mp3',
      samples: 44_100,
      meanVolumeDb: -20,
      peakVolumeDb: -2,
      durationSeconds: 2,
    });

    const attemptJournal = createNarrationAttemptJournal({
      root,
      plan,
      project: APPROVED_BILLING_PROJECT,
      maxMicrodollars: 1_000_000,
    });
    const state = await executePuzzleGeneration({
      root,
      plan,
      project: APPROVED_BILLING_PROJECT,
      accessToken: 'held-in-memory-fixture-token',
      requestRateGate: async () => {},
      attemptJournal,
      validateAudio,
      generatedAt: '2026-08-30T20:58:27.000Z',
      synthesize: async (request) => {
        calls.push({ text: request.text, voiceId: request.voice.voice_id });
        const audio = Buffer.alloc(1_100, audioByte);
        audioByte += 1;
        return audio;
      },
    });

    assert.equal(state.classification, 'local-complete');
    assert.deepEqual(calls.map((call) => call.text), [plan.text, plan.text]);
    assert.deepEqual(calls.map((call) => call.voiceId), [
      'en-US-Chirp3-HD-Aoede',
      'en-US-Chirp3-HD-Algieba',
    ]);
    assert.equal(state.localManifest.default_voice, 'aoede');
    assert.equal(state.localManifest.default_rate, 1.25);
    assert.equal(state.localManifest.source_characters, plan.charactersPerVoice);
    assert.deepEqual(state.localManifest.rate_options, PLAYBACK_POLICY.rate_options);
  } finally {
    removeTemporaryRoot(root);
  }
});

test('paid argument parsing requires execution, project, exact ceiling, and reviewed hash', () => {
  assert.deepEqual(parseGenerationArguments([]), {
    execute: false,
    project: '',
    maxUsd: '',
    maxMicrodollars: null,
    approvedPlanSha256: '',
    reconcileAttemptId: '',
    reconcileProviderBilled: null,
    authorizeExactResubmission: false,
  });
  assert.throws(
    () => parseGenerationArguments(['--execute', '--project', APPROVED_BILLING_PROJECT, '--max-usd', '1']),
    /approved-plan-sha256/
  );
  assert.throws(
    () => parseGenerationArguments(['--project', 'valid-project']),
    /require --execute/
  );

  const approvedHash = 'a'.repeat(64);
  const options = parseGenerationArguments([
    '--execute',
    '--project',
    APPROVED_BILLING_PROJECT,
    '--max-usd',
    '0.584460',
    '--approved-plan-sha256',
    approvedHash,
  ]);
  assert.equal(options.maxMicrodollars, 584_460);
  assert.equal(options.approvedPlanSha256, approvedHash);
  assert.equal(options.project, APPROVED_BILLING_PROJECT);
  assert.throws(
    () => parseGenerationArguments([
      '--execute',
      '--project',
      'wrong-project',
      '--max-usd',
      '0.60',
      '--approved-plan-sha256',
      approvedHash,
    ]),
    /reviewed billing project aigamma/
  );

  const attemptId = 'b'.repeat(64);
  const reconciliation = parseGenerationArguments([
    '--project',
    APPROVED_BILLING_PROJECT,
    '--approved-plan-sha256',
    approvedHash,
    '--reconcile-attempt',
    attemptId,
    '--reconcile-provider-billed',
    'yes',
    '--authorize-exact-resubmission',
  ]);
  assert.equal(reconciliation.execute, false);
  assert.equal(reconciliation.reconcileAttemptId, attemptId);
  assert.equal(reconciliation.reconcileProviderBilled, true);
  assert.equal(reconciliation.authorizeExactResubmission, true);
});

test('project mismatch fails before journal, credentials, or synthesis can be touched', async () => {
  const plan = buildPuzzleNarrationPlan({
    slug: 'project-guard-fixture',
    sourcePath: 'src/content/project-guard-fixture.narration.js',
    narration: [{ section: 'puzzle', text: 'The reviewed billing project is exact.' }],
  });
  let journalTouches = 0;
  let syntheses = 0;
  const untouchedJournal = Object.fromEntries([
    'assertReadyForExecution',
    'recordSubmission',
    'markProviderError',
    'markAmbiguous',
    'markResponseReceived',
    'markResponseUnpersisted',
    'markPersisted',
  ].map((name) => [name, () => {
    journalTouches += 1;
  }]));

  await assert.rejects(
    executePuzzleGeneration({
      root: 'unused-for-project-mismatch',
      plan,
      project: 'wrong-project',
      synthesize: async () => {
        syntheses += 1;
        return Buffer.alloc(1_100, 1);
      },
      requestRateGate: async () => {},
      attemptJournal: untouchedJournal,
    }),
    /Narration billing project must be aigamma/
  );
  assert.equal(journalTouches, 0);
  assert.equal(syntheses, 0);
});

test('a 0.60 ceiling counts all four submissions and blocks a fifth retry', () => {
  const root = temporaryRoot();
  try {
    const plan = buildPilotPlan();
    let clock = 0;
    let nonceNumber = 0;
    const attemptJournal = createNarrationAttemptJournal({
      root,
      plan,
      project: APPROVED_BILLING_PROJECT,
      maxMicrodollars: 600_000,
      now: () => new Date(Date.UTC(2026, 7, 30, 21, 0, clock++)).toISOString(),
      nonce: () => `fixture-nonce-${nonceNumber++}`,
    });
    for (const trackId of ['aoede', 'algieba']) {
      for (const request of plan.requests) {
        const attempt = attemptJournal.recordSubmission({ trackId, request });
        attemptJournal.markResponseReceived(attempt.attempt_id);
        attemptJournal.markPersisted(attempt.attempt_id);
      }
    }

    const summary = attemptJournal.summary();
    assert.equal(summary.attempt_count, 4);
    assert.equal(summary.submitted_characters, 19_482);
    assert.equal(summary.submitted_cost_microdollars, 584_460);
    assert.throws(
      () => attemptJournal.recordSubmission({ trackId: 'aoede', request: plan.requests[0] }),
      /cumulative --max-usd ceiling/
    );
    assert.equal(attemptJournal.summary().attempt_count, 4);

    const serializedJournal = fs.readFileSync(
      narrationAttemptJournalPath(root, plan),
      'utf8'
    );
    assert.equal(serializedJournal.includes(plan.requests[0].text), false);
    assert.equal(/access[_-]?token|authorization:\s*bearer|private[_-]?key/i.test(serializedJournal), false);
  } finally {
    removeTemporaryRoot(root);
  }
});

test('a 0.60 ceiling reserves the other reviewed requests and blocks an early retry', async () => {
  const root = temporaryRoot();
  try {
    const plan = buildPilotPlan();
    const attemptJournal = createNarrationAttemptJournal({
      root,
      plan,
      project: APPROVED_BILLING_PROJECT,
      maxMicrodollars: 600_000,
    });
    let syntheses = 0;
    await assert.rejects(
      executePuzzleGeneration({
        root,
        plan,
        project: APPROVED_BILLING_PROJECT,
        synthesize: async () => {
          syntheses += 1;
          const error = new Error('retryable provider response');
          error.retryable = true;
          error.httpStatus = 500;
          throw error;
        },
        requestRateGate: async () => {},
        attemptJournal,
        validateAudio: () => ({
          codecName: 'mp3',
          samples: 44_100,
          meanVolumeDb: -20,
          peakVolumeDb: -2,
          durationSeconds: 2,
        }),
      }),
      /remaining reviewed requests would exceed the cumulative --max-usd ceiling/
    );
    assert.equal(syntheses, 1);
    assert.equal(attemptJournal.summary().attempt_count, 1);
  } finally {
    removeTemporaryRoot(root);
  }
});

test('an ambiguous attempt is durable and an unattended rerun cannot resubmit it', async () => {
  const root = temporaryRoot();
  try {
    const plan = buildPuzzleNarrationPlan({
      slug: 'ambiguous-fixture',
      sourcePath: 'src/content/ambiguous-fixture.narration.js',
      narration: [{ section: 'puzzle', text: 'A reviewed provider attempt may have completed.' }],
    });
    const validateAudio = () => ({
      codecName: 'mp3',
      samples: 44_100,
      meanVolumeDb: -20,
      peakVolumeDb: -2,
      durationSeconds: 2,
    });
    let syntheses = 0;
    const firstJournal = createNarrationAttemptJournal({
      root,
      plan,
      project: APPROVED_BILLING_PROJECT,
      maxMicrodollars: 1_000_000,
    });
    await assert.rejects(
      executePuzzleGeneration({
        root,
        plan,
        project: APPROVED_BILLING_PROJECT,
        synthesize: async () => {
          syntheses += 1;
          const journal = readNarrationAttemptJournal({ root, plan });
          assert.equal(journal.attempts.at(-1).status, 'submitted');
          const error = new Error('provider outcome is unknown');
          error.ambiguous = true;
          error.retryable = true;
          throw error;
        },
        requestRateGate: async () => {},
        attemptJournal: firstJournal,
        validateAudio,
      }),
      /provider outcome is unknown/
    );
    const unresolved = summarizeNarrationAttemptJournal({ root, plan });
    assert.equal(unresolved.attempt_count, 1);
    assert.equal(unresolved.blocking_attempt_ids.length, 1);

    const rerunJournal = createNarrationAttemptJournal({
      root,
      plan,
      project: APPROVED_BILLING_PROJECT,
      maxMicrodollars: 1_000_000,
    });
    await assert.rejects(
      executePuzzleGeneration({
        root,
        plan,
        project: APPROVED_BILLING_PROJECT,
        synthesize: async () => {
          syntheses += 1;
          return Buffer.alloc(1_100, 1);
        },
        requestRateGate: async () => {},
        attemptJournal: rerunJournal,
        validateAudio,
      }),
      /requires explicit reconciliation/
    );
    assert.equal(syntheses, 1);

    const reconciled = reconcileNarrationAttempt({
      root,
      plan,
      project: APPROVED_BILLING_PROJECT,
      attemptId: unresolved.blocking_attempt_ids[0],
      providerBilled: true,
      authorizeExactResubmission: true,
    });
    assert.equal(reconciled.reconciliation.provider_billed, true);
    const postReconciliation = createNarrationAttemptJournal({
      root,
      plan,
      project: APPROVED_BILLING_PROJECT,
      maxMicrodollars: 1_000_000,
    });
    assert.throws(
      () => postReconciliation.recordSubmission({
        trackId: 'algieba',
        request: plan.requests[0],
      }),
      /authorizes only the exact unresolved request/
    );
    const authorized = postReconciliation.recordSubmission({
      trackId: 'aoede',
      request: plan.requests[0],
    });
    assert.equal(authorized.request_attempt_number, 2);
  } finally {
    removeTemporaryRoot(root);
  }
});

test('a received response that fails persistence blocks an unattended rerun', async () => {
  const root = temporaryRoot();
  try {
    const plan = buildPuzzleNarrationPlan({
      slug: 'unpersisted-fixture',
      sourcePath: 'src/content/unpersisted-fixture.narration.js',
      narration: [{ section: 'puzzle', text: 'A received response must be persisted before reuse.' }],
    });
    let syntheses = 0;
    const run = (attemptJournal) => executePuzzleGeneration({
      root,
      plan,
      project: APPROVED_BILLING_PROJECT,
      synthesize: async () => {
        syntheses += 1;
        return Buffer.alloc(1_100, 1);
      },
      requestRateGate: async () => {},
      attemptJournal,
      validateAudio: () => {
        throw new Error('fixture persistence validation failed');
      },
    });
    const firstJournal = createNarrationAttemptJournal({
      root,
      plan,
      project: APPROVED_BILLING_PROJECT,
      maxMicrodollars: 1_000_000,
    });
    await assert.rejects(run(firstJournal), /fixture persistence validation failed/);
    assert.equal(syntheses, 1);
    assert.equal(
      readNarrationAttemptJournal({ root, plan }).attempts[0].status,
      'response-received-unpersisted'
    );

    const rerunJournal = createNarrationAttemptJournal({
      root,
      plan,
      project: APPROVED_BILLING_PROJECT,
      maxMicrodollars: 1_000_000,
    });
    await assert.rejects(run(rerunJournal), /requires explicit reconciliation/);
    assert.equal(syntheses, 1);
  } finally {
    removeTemporaryRoot(root);
  }
});

test('exclusive generation lock is acquired before any credential path can proceed', () => {
  const root = temporaryRoot();
  try {
    const first = acquireGenerationLock({
      root,
      pid: 111,
      token: 'first-lock-token',
      now: () => '2026-08-30T20:58:27.000Z',
    });
    assert.throws(
      () => acquireGenerationLock({ root, pid: 222, token: 'second-lock-token' }),
      /already locked/
    );
    first.release();
    const second = acquireGenerationLock({ root, pid: 222, token: 'second-lock-token' });
    second.release();
  } finally {
    removeTemporaryRoot(root);
  }
});

test('ambiguous provider failures stop without an automatic retry', async () => {
  let syntheses = 0;
  let gateStarts = 0;
  const ambiguous = new Error('unknown provider outcome');
  ambiguous.ambiguous = true;
  ambiguous.retryable = true;

  await assert.rejects(
    synthesizeWithTransientRetry({
      synthesize: async () => {
        syntheses += 1;
        throw ambiguous;
      },
      requestRateGate: async () => {
        gateStarts += 1;
      },
      synthesis: {},
      sleep: async () => {},
    }),
    /unknown provider outcome/
  );
  assert.equal(syntheses, 1);
  assert.equal(gateStarts, 1);
});

test('every provider attempt obtains a fresh short-lived access token', async () => {
  const accessTokens = [];
  let tokenNumber = 0;
  const synthesize = createFreshTokenSynthesizer({
    getAccessToken: () => {
      tokenNumber += 1;
      return `short-lived-token-${tokenNumber}`;
    },
    synthesize: async ({ accessToken }) => {
      accessTokens.push(accessToken);
      if (accessTokens.length === 1) {
        const transient = new Error('retryable response');
        transient.retryable = true;
        throw transient;
      }
      return Buffer.alloc(1_100, 1);
    },
  });

  await synthesizeWithTransientRetry({
    synthesize,
    requestRateGate: async () => {},
    synthesis: {},
    sleep: async () => {},
  });
  assert.deepEqual(accessTokens, [
    'short-lived-token-1',
    'short-lived-token-2',
  ]);
});

test('audio validation requires decoded MP3, audible signal, and plausible duration', () => {
  const audio = Buffer.alloc(1_100, 1);
  const accepted = validateMp3Audio(audio, {
    expectedCharacters: 450,
    analyzer: () => ({
      codecName: 'mp3',
      samples: 441_000,
      meanVolumeDb: -22,
      peakVolumeDb: -3,
      durationSeconds: 10,
    }),
  });
  assert.equal(accepted.durationSeconds, 10);

  assert.throws(
    () => validateMp3Audio(audio, {
      expectedCharacters: 450,
      analyzer: () => ({
        codecName: 'mp3',
        samples: 441_000,
        meanVolumeDb: -60,
        peakVolumeDb: -55,
        durationSeconds: 10,
      }),
    }),
    /silent or nearly silent/
  );
});
