import test from 'node:test';
import assert from 'node:assert/strict';
import { checkEntryModules } from '../scripts/unit-tooling/check_entry_modules.mjs';

test('the pilot and later entries reject pending audio instead of selecting browser speech', async () => {
  const slugs = ['kalman-covariance-correction', 'lexicographic-permutations-next-permutation-algorithm'];
  const current = await checkEntryModules(slugs);
  for (const entry of current) {
    assert.equal(entry.status, 'rendered', `${entry.slug}: ${entry.error || ''}`);
    assert.equal(entry.preservedPlayer, true, `${entry.slug} uses its preserved player`);
  }
  const pending = await checkEntryModules(slugs, { pending: true });
  for (const entry of pending) {
    assert.equal(entry.status, 'rejected', `${entry.slug} must fail closed for pending audio`);
    assert.match(entry.error, /preserved narration is not deployable/);
  }
});
