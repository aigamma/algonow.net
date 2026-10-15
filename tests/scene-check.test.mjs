import test from 'node:test';
import assert from 'node:assert/strict';
import { checkSceneModel } from '../scripts/unit-tooling/scene-check.mjs';

test('scene checks include a failure first exposed by the completing tick', () => {
  const result = checkSceneModel({
    makeScene: () => ({ ok: true, ticks: 0 }),
    sceneTick: (scene) => {
      scene.ticks += 1;
      if (scene.ticks < 3) return false;
      scene.ok = false;
      return true;
    },
  }, { seed: 7 });
  assert.equal(result.ticks, 3);
  assert.equal(result.invariantBreaks, 1);
  assert.equal(result.firstBrokenTick, 3);
  assert.equal(result.terminalOk, false);
});

test('scene checks retain transient failures even when the final state is valid', () => {
  const result = checkSceneModel({
    makeScene: () => ({ ok: true, ticks: 0 }),
    sceneTick: (scene) => {
      scene.ticks += 1;
      scene.ok = scene.ticks !== 1;
      return scene.ticks === 2;
    },
  });
  assert.equal(result.invariantBreaks, 1);
  assert.equal(result.terminalOk, true);
});

test('scene checks distinguish absent invariants and reject nontermination', () => {
  const absent = checkSceneModel({ makeScene: () => ({}), sceneTick: () => true });
  assert.equal(absent.invariantObserved, false);
  assert.equal(absent.terminalOk, null);
  assert.throws(() => checkSceneModel({
    makeScene: () => ({ ok: true }), sceneTick: () => false,
  }, { seed: 4, maxTicks: 3 }), /did not finish within 3 ticks/);
});

test('scene arguments reach initialization and terminal correctness checks fail closed', () => {
  const result = checkSceneModel({
    makeScene: (seed, count) => ({ seed, count }),
    sceneTick: () => true,
    isCorrect: (scene) => scene.seed === 8 && scene.count === 2,
  }, { seed: 8, sceneArgs: [1] });
  assert.equal(result.terminalCheck, false);
  assert.equal(result.invariantBreaks, 1);
  assert.equal(result.firstBrokenTick, 1);
});
