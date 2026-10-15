import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { LIVE_PUZZLES } from '../src/data/puzzles.js';
import { assertPublicManifest, buildPlanForSlug } from '../scripts/narration/release-contract.mjs';

test('every installed recorded lesson matches its canonical narration', async () => {
  const failures = [];
  for (const { slug } of LIVE_PUZZLES) {
    const file = new URL(`../src/data/narration/${slug}.json`, import.meta.url);
    if (!fs.existsSync(file)) continue;
    try {
      const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
      assertPublicManifest(manifest, await buildPlanForSlug(slug), slug);
    } catch (error) {
      failures.push(`${slug}: ${error.message}`);
    }
  }
  assert.deepEqual(failures, [], 'Recorded explanations must be regenerated after canonical text changes');
});
