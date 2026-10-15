import test from 'node:test';
import assert from 'node:assert/strict';
import { auditCanvasCallbacks } from '../scripts/unit-tooling/audit_canvas_callbacks.mjs';

function maximumMatchingSize(adj) {
  let masks = new Set([0]);
  for (const neighbors of adj) {
    const next = new Set(masks);
    for (const mask of masks) {
      for (const job of neighbors) {
        if (!(mask & (1 << job))) next.add(mask | (1 << job));
      }
    }
    masks = next;
  }
  return Math.max(...[...masks].map((mask) => mask.toString(2).replaceAll('0', '').length));
}

test('B+ tree and Hopcroft-Karp actual canvas callbacks initialize, finish, and draw', async () => {
  const report = await auditCanvasCallbacks({
    paths: ['src/viz/BPlusViz.jsx', 'src/viz/HopcroftKarpViz.jsx'],
    cycles: 20,
    output: `node_modules/.cache/canvas-regression-${process.pid}.json`,
    quiet: true,
    onCycle: ({ vizPath, state, model, context }) => {
      if (vizPath.endsWith('BPlusViz.jsx')) {
        assert.equal(state.scene.keys.length, 20);
        assert.equal(new Set(state.scene.keys).size, 20);
        for (let count = 0; count <= 20; count += 1) {
          model.draw(context, { ...state, act: 0, tick: count * 14 });
        }
        model.draw(context, { ...state, act: 1, tick: 100 });
        return;
      }
      const { adj, matchL, matchR, coverL, coverR, phases } = state.scene;
      const matchingSize = matchL.filter((job) => job !== -1).length;
      assert.equal(matchingSize, maximumMatchingSize(adj), 'matching agrees with exhaustive subset oracle');
      matchL.forEach((job, worker) => {
        if (job === -1) return;
        assert.ok(adj[worker].includes(job));
        assert.equal(matchR[job], worker);
      });
      assert.equal(coverL.length + coverR.length, matchingSize, 'cover certifies matching optimality');
      adj.forEach((neighbors, worker) => neighbors.forEach((job) => {
        assert.ok(coverL.includes(worker) || coverR.includes(job), 'cover includes every edge');
      }));
      let lastLength = 0;
      for (const phase of phases) {
        const lengths = new Set(phase.paths.map((augmentingPath) => augmentingPath.length));
        assert.equal(lengths.size, 1, 'every path in a batch has the same shortest length');
        const length = [...lengths][0];
        assert.ok(length > lastLength, 'the next phase uses longer augmenting paths');
        lastLength = length;
        const left = new Set();
        const right = new Set();
        for (const augmentingPath of phase.paths) {
          for (let index = 0; index < augmentingPath.length; index += 1) {
            const visited = index % 2 ? right : left;
            assert.ok(!visited.has(augmentingPath[index]), 'paths in one batch are vertex disjoint');
            visited.add(augmentingPath[index]);
          }
        }
      }
    },
  });
  assert.deepEqual(report.visualizations.flatMap((viz) => viz.errors), []);
  assert.deepEqual(report.visualizations.flatMap((viz) => viz.warnings), []);
  assert.equal(report.summary.completedRuns, 40);
});
