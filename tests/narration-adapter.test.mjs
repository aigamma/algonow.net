import assert from 'node:assert/strict';
import test from 'node:test';

import { narration as kalmanNarration } from '../src/content/kalman-covariance-correction.narration.js';
import {
  AI_NARRATION_DISCLOSURE,
  PUZZLE_NARRATION_EXCLUDED_FIELDS,
  buildPuzzleNarrationSegments,
  buildPuzzleNarrationText,
  normalizePuzzleNarrationText,
} from '../src/lib/puzzleNarration.js';

const PILOT_SLUG = 'kalman-covariance-correction';

test('Kalman adapter preserves the authored narration order behind an AI disclosure', () => {
  const segments = buildPuzzleNarrationSegments({
    slug: PILOT_SLUG,
    narration: kalmanNarration,
  });

  assert.equal(segments.length, kalmanNarration.length + 1);
  assert.deepEqual(
    segments.map((segment) => segment.id),
    [
      `${PILOT_SLUG}.00-disclosure`,
      `${PILOT_SLUG}.01-puzzle`,
      `${PILOT_SLUG}.02-origins`,
      `${PILOT_SLUG}.03-pair`,
      `${PILOT_SLUG}.04-picture`,
      `${PILOT_SLUG}.05-run`,
      `${PILOT_SLUG}.06-signals`,
      `${PILOT_SLUG}.07-tradeoffs`,
      `${PILOT_SLUG}.08-tradeoffs`,
      `${PILOT_SLUG}.09-tradeoffs`,
      `${PILOT_SLUG}.10-code`,
    ]
  );
  assert.equal(segments[0].text, AI_NARRATION_DISCLOSURE);
  assert.match(segments[1].text, /^Puzzle ninety seven:/);
  assert.match(segments.at(-1).text, /^The code on this page is the whole argument\./);
});

test('adapter provenance explicitly allowlists authored speech and excludes executable code', () => {
  const executableCode = [
    'def hidden_example():',
    "    return 'EXECUTABLE_CODE_SENTINEL_NINE_FOUR'",
  ].join('\n');
  const fixture = {
    slug: 'adapter-fixture',
    executableCode,
    code: executableCode,
    narration: [
      { section: 'puzzle', text: 'Prose immediately before the omitted source.' },
      { section: 'code', text: 'Prose immediately after the omitted source.' },
    ],
  };

  const segments = buildPuzzleNarrationSegments(fixture);
  const text = buildPuzzleNarrationText(fixture);
  assert.ok(text.indexOf('Prose immediately before') < text.indexOf('Prose immediately after'));
  assert.doesNotMatch(text, /hidden_example|EXECUTABLE_CODE_SENTINEL|return '/);

  for (const segment of segments) {
    assert.deepEqual(segment.excluded_fields, [...PUZZLE_NARRATION_EXCLUDED_FIELDS]);
    assert.ok(segment.excluded_fields.includes('content.code'));
    assert.ok(segment.excluded_fields.includes('solution source'));
  }
  assert.deepEqual(segments[1].source_fields, [
    'narration[0].section',
    'narration[0].text',
  ]);
});

test('normalization is deterministic and removes visual punctuation before planning', () => {
  const input = '  Alpha&nbsp;beta\u2014gamma\r\n delta\u2013epsilon &amp; zeta.  ';
  assert.equal(
    normalizePuzzleNarrationText(input),
    'Alpha beta, gamma\ndelta to epsilon & zeta.'
  );
});

test('adapter fails closed on an unknown authored section', () => {
  assert.throws(
    () => buildPuzzleNarrationText({
      slug: 'unknown-section',
      narration: [{ section: 'sidebar', text: 'This must not be inferred as lesson text.' }],
    }),
    /unsupported section/
  );
});
