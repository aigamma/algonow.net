import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { auditCanvasCallbacks } from '../scripts/unit-tooling/audit_canvas_callbacks.mjs';

const names = ['SegmentTree', 'ExtSort', 'Shamir', 'Autodiff', 'Mcl', 'NaiveBayes', 'BarnesHut', 'NelderMead', 'GaussianProcess', 'Dsatur', 'Hough', 'GrayCode', 'RoundRobin', 'EntropyEstimation', 'Lsh'];
const close = (a, b, tolerance = 1e-7) => assert.ok(Math.abs(a - b) <= tolerance * Math.max(1, Math.abs(a), Math.abs(b)), `${a} != ${b}`);
const done = (model, state) => { for (let i = 0; i < 10000 && !state.done; i++) model.tick(state); assert.ok(state.done); };

function colorable(adj, k) {
  const order = [...adj.keys()].sort((a, b) => adj[b].length - adj[a].length);
  const color = Array(adj.length).fill(-1);
  const visit = (i, used) => {
    if (i === order.length) return true;
    const u = order[i];
    for (let c = 0; c < Math.min(k, used + 1); c++) {
      if (adj[u].some((v) => color[v] === c)) continue;
      color[u] = c;
      if (visit(i + 1, Math.max(used, c + 1))) return true;
    }
    color[u] = -1;
    return false;
  };
  return visit(0, 0);
}

test('later actual canvas callbacks preserve mathematical states and labels', async () => {
  let outsideContractions = 0;
  const report = await auditCanvasCallbacks({ cycles: 20, quiet: true,
    paths: names.map((name) => `src/viz/${name}Viz.jsx`),
    output: 'build/audit-2026-10-15/viz-semantics-oracles-late.json',
    onCycle: ({ vizPath, state, model, context }) => {
      const sc = state.scene;
      const name = vizPath.split('/').at(-1);
      if (name === 'SegmentTreeViz.jsx') {
        const values = [...sc.vals];
        for (const op of sc.ops) {
          if (op.kind === 'add') for (let i = op.l; i <= op.r; i++) values[i] += op.v;
          else assert.equal(op.answer, values.slice(op.l, op.r + 1).reduce((a, b) => a + b, 0));
          assert.equal(op.frames.at(-1).s[1], values.reduce((a, b) => a + b, 0), 'displayed root includes completed pulls');
        }
      } else if (name === 'ExtSortViz.jsx') {
        for (const run of [sc.wide, sc.narrow]) {
          assert.deepEqual(run.sorted, [...sc.records].sort((a, b) => a - b));
          assert.equal(run.io, 2 * Math.ceil(sc.records.length / 4) * (run.passes.length + 1));
        }
        assert.equal(sc.wide.mergeMemoryRecords, 36); assert.equal(sc.narrow.mergeMemoryRecords, 12);
      } else if (name === 'ShamirViz.jsx') {
        assert.equal(sc.secret, sc.rec);
        for (const [x, y] of sc.shares) assert.equal((sc.coeffs[0] + sc.coeffs[1] * x + sc.coeffs[2] * x * x) % 97, y);
        for (const candidate of sc.candidates) {
          assert.equal(candidate.curve[0][1], candidate.sPrime);
          for (const [x, y] of sc.two) assert.equal(candidate.curve.find((p) => p[0] === x)[1], y);
        }
      } else if (name === 'AutodiffViz.jsx') {
        if (sc.kind === 'A') { close(sc.adj.x, sc.closed.x); close(sc.adj.y, sc.closed.y); }
        else {
          assert.equal(sc.ops.reverseWouldBe, 42);
          let derivative = 1;
          for (let i = 1; i < sc.values.length; i++) { derivative *= 0.9 * Math.cos(sc.values[i - 1] * 0.9 + 0.1 * i); close(sc.derivs[i], derivative); }
        }
      } else if (name === 'MclViz.jsx') {
        const fresh = model.init();
        while (!fresh.done) {
          model.tick(fresh); const p = fresh.scene;
          close(p.weights.reduce((a, b) => a + b, 0), 1);
          let sin = 0, cos = 0;
          p.posteriorParticles.forEach((x, i) => { sin += p.weights[i] * Math.sin(x * Math.PI / 50); cos += p.weights[i] * Math.cos(x * Math.PI / 50); });
          close(p.mean, (Math.atan2(sin, cos) * 50 / Math.PI + 100) % 100);
        }
      } else if (name === 'NaiveBayesViz.jsx') {
        const dead = [0, 1].map((c) => sc.doc.some((w) => sc.counts[c][w] === 0));
        assert.equal(sc.rawDead, dead[0] && dead[1] ? 'both' : dead[0] ? 0 : dead[1] ? 1 : null);
        const fresh = model.init();
        fresh.scene.counts = [Array(60).fill(1), Array(60).fill(1)];
        fresh.scene.counts[0][0] = 0; fresh.scene.counts[1][1] = 0; fresh.scene.doc = [0, 1];
        model.tick(fresh); assert.equal(fresh.scene.rawDead, 0);
        model.tick(fresh); assert.equal(fresh.scene.rawDead, 'both');
      } else if (name === 'BarnesHutViz.jsx') {
        assert.equal(sc.current, 39);
        const target = sc.bodies[sc.current * 5]; const force = [0, 0];
        for (const body of sc.bodies) {
          if (body === target) continue;
          const dx = body.x - target.x, dy = body.y - target.y;
          const r2 = dx * dx + dy * dy + 0.0001, scale = body.m / r2 ** 1.5;
          force[0] += dx * scale; force[1] += dy * scale;
        }
        close(sc.direct[0], force[0]); close(sc.direct[1], force[1]);
      } else if (name === 'NelderMeadViz.jsx') {
        const fresh = model.init(); const f = ([x, y]) => 100 * (y - x * x) ** 2 + (1 - x) ** 2;
        while (!fresh.done) {
          const before = [...fresh.scene.simplex].sort((a, b) => a.v - b.v);
          const reflected = before[0].p.map((v, i) => v + before[1].p[i] - before[2].p[i]);
          const fr = f(reflected), iteration = fresh.scene.iter;
          model.tick(fresh);
          if (fresh.scene.iter === iteration) continue;
          for (const point of fresh.scene.simplex) close(point.v, f(point.p));
          if (fresh.scene.last.startsWith('contract outside')) { assert.ok(fr < before[2].v); outsideContractions++; }
          if (fresh.scene.last.startsWith('contract inside')) assert.ok(fr >= before[2].v);
        }
      } else if (name === 'GaussianProcessViz.jsx') {
        const fresh = model.init();
        Object.assign(fresh.scene, { xs: [5, 5], ys: [1, 1], total: 2 });
        done(model, fresh); assert.ok(fresh.scene.ok);
        close(fresh.scene.varr[50], 0.0225 / 2.0225);
        close(fresh.scene.mean[50], 2 / 2.0225);
      } else if (name === 'DsaturViz.jsx') {
        assert.ok(colorable(sc.adj, sc.chi)); assert.ok(!colorable(sc.adj, sc.chi - 1));
      } else if (name === 'HoughViz.jsx') {
        const fresh = model.init(); const p = fresh.scene;
        p.pts = []; p.voted = 0; p.acc.forEach((row) => row.fill(0));
        p.acc[20][0] = 100; p.acc[p.nRho - 1 - 20][89] = 100; p.acc[80][45] = 70;
        done(model, fresh);
        assert.ok(p.detected.some((d) => Math.abs(d.theta - 90) <= 2), 'seam copies do not consume both peak slots');
      } else if (name === 'GrayCodeViz.jsx') {
        const fresh = model.init(); model.tick(fresh);
        assert.match(fresh.scene.last, /only the two endpoint readings/);
        assert.equal(sc.grayFlipsTotal, sc.size); assert.equal(sc.seen.size, sc.size);
      } else if (name === 'RoundRobinViz.jsx') {
        const fresh = model.init();
        assert.ok(fresh.scene.last.includes(`${fresh.scene.jobs.filter((j) => j.kind === 'batch').length} of them long`));
      } else if (name === 'EntropyEstimationViz.jsx') {
        assert.match(sc.last, /\(error /);
      } else if (name === 'LshViz.jsx') {
        const segments = []; let start;
        const ctx = Object.create(context);
        ctx.moveTo = (x, y) => { start = [x, y]; };
        ctx.lineTo = (x, y) => { if (start) segments.push([start, [x, y]]); };
        model.draw(ctx, { ...state, done: false });
        const boundaries = segments.filter(([a, b]) => Math.hypot(a[0] - b[0], a[1] - b[1]) > 200).slice(0, sc.lines.length);
        assert.equal(boundaries.length, sc.lines.length);
        boundaries.forEach(([a, b], i) => close((b[0] - a[0]) * Math.cos(sc.lines[i]) - (b[1] - a[1]) * Math.sin(sc.lines[i]), 0));
      }
    },
  });
  assert.ok(outsideContractions > 0);
  assert.equal(report.summary.failedVisualizations, 0, JSON.stringify(report.visualizations.filter((r) => r.errors.length)));
});

test('short RRT steering, overlapping exact matches, and zero Shamir masks are exercised', async () => {
  const bundle = await build({ stdin: { contents: "export * as rrt from './src/viz/RrtViz.jsx'; export * as bm from './src/viz/BoyerMooreViz.jsx'; export * as shamir from './src/viz/ShamirViz.jsx';", resolveDir: process.cwd(), loader: 'jsx' }, bundle: true, format: 'esm', platform: 'node', jsx: 'automatic', write: false, logLevel: 'silent' });
  const { rrt, bm, shamir } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
  const tree = rrt.makeTree(), draws = [0.5, 0.11, 0.5];
  rrt.grow(tree, () => draws.shift(), true);
  assert.deepEqual(tree.nodes[1], [11, 50]);
  assert.deepEqual(bm.simulate('ababa', 'aba').events.filter((e) => e.type === 'found').map((e) => e.align), [0, 2]);
  let zeroMask = false;
  for (let seed = 0; seed < 500; seed++) { const sc = shamir.makeScene(seed); if (sc.coeffs.slice(1).includes(0)) zeroMask = true; }
  assert.ok(zeroMask, 'uniform field coefficients include zero');
});
