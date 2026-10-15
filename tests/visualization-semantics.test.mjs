import test from 'node:test';
import assert from 'node:assert/strict';
import { auditCanvasCallbacks } from '../scripts/unit-tooling/audit_canvas_callbacks.mjs';

const paths = ['AStar', 'Anneal', 'Minimax', 'Sudoku', 'Knapsack', 'MCTS', 'Dijkstra', 'UnionFind', 'Kmp', 'Quicksort', 'Simplex', 'Lm', 'Kmeans', 'Arithmetic', 'Bitap', 'Cuckoo', 'Zbox']
  .map((name) => `src/viz/${name}Viz.jsx`);
const close = (a, b) => assert.ok(Math.abs(a - b) <= 1e-7 * Math.max(1, Math.abs(a), Math.abs(b)), `${a} != ${b}`);

test('reviewed visualization models report quantities consistent with their actual states', async () => {
  const report = await auditCanvasCallbacks({ cycles: 20, paths, quiet: true,
    output: 'build/audit-2026-10-15/viz-semantics-oracles-early.json',
    onCycle: ({ vizPath, state: s, model }) => {
      const name = vizPath.split('/').at(-1);
      if (name === 'AStarViz.jsx') {
        const { grid, path } = s.search;
        const { cols, rows, start, goal, walls } = grid;
        const distance = Array(cols * rows).fill(Infinity);
        distance[start] = 0;
        const q = [start];
        for (let i = 0; i < q.length; i++) {
          const u = q[i];
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const x = u % cols + dx, y = Math.floor(u / cols) + dy;
            if (x < 0 || x >= cols || y < 0 || y >= rows) continue;
            const v = y * cols + x;
            if (!walls[v] && distance[v] === Infinity) { distance[v] = distance[u] + 1; q.push(v); }
          }
        }
        assert.equal(path.length - 1, distance[goal]);
        assert.equal(path[0], start); assert.equal(path.at(-1), goal);
      } else if (name === 'AnnealViz.jsx') {
        const length = (tour) => tour.reduce((sum, v, i) => {
          const a = s.cities[v], b = s.cities[tour[(i + 1) % tour.length]];
          return sum + Math.hypot(a[0] - b[0], a[1] - b[1]);
        }, 0);
        assert.equal(new Set(s.best).size, s.cities.length);
        close(s.bestLen, length(s.best)); close(s.len, length(s.tour));
        assert.ok(s.bestLen <= s.len + 1e-7);
      } else if (name === 'MinimaxViz.jsx') {
        assert.equal(s.tree.value[s.pv.at(-1)], s.tree.value[0]);
      } else if (name === 'SudokuViz.jsx') {
        const valid = (cells) => assert.equal(new Set(cells).size, 9);
        for (let i = 0; i < 9; i++) {
          valid(Array.from({ length: 9 }, (_, j) => s.board[i * 9 + j]));
          valid(Array.from({ length: 9 }, (_, j) => s.board[j * 9 + i]));
          valid(Array.from({ length: 9 }, (_, j) => s.board[(Math.floor(i / 3) * 3 + Math.floor(j / 3)) * 9 + i % 3 * 3 + j % 3]));
        }
        s.givens.forEach((v, i) => { if (v) assert.equal(s.board[i], v); });
      } else if (name === 'KnapsackViz.jsx') {
        const dp = Array(s.capacity + 1).fill(0);
        for (const item of s.items) for (let w = s.capacity; w >= item.w; w--) dp[w] = Math.max(dp[w], dp[w - item.w] + item.v);
        assert.equal(s.best, dp[s.capacity]);
        assert.equal(s.value, s.best);
        assert.equal(s.weight, s.items.reduce((sum, item, i) => sum + (s.decision[i] === 1 ? item.w : 0), 0));
        assert.ok(s.weight <= s.capacity);
      } else if (name === 'MCTSViz.jsx') {
        assert.equal(s.visits[0], s.sims);
        s.visits.forEach((v, i) => assert.ok(s.wins[i] >= 0 && s.wins[i] <= v));
        assert.equal(s.visits[1] + s.visits[2], s.sims);
      } else if (name === 'DijkstraViz.jsx') {
        assert.deepEqual([...s.heapRun.dist], [...s.scanRun.dist]);
        const fresh = model.init();
        while (!fresh.heapRun.done) {
          fresh.heapRun.step();
          const heap = fresh.heapRun.heap;
          for (let i = 1; i < heap.length; i++) assert.ok(heap[(i - 1) >> 1][0] <= heap[i][0]);
        }
      } else if (name === 'UnionFindViz.jsx') {
        assert.equal(s.flat.components, s.naive.components);
        assert.equal(s.flat.components, 1);
      } else if (name === 'KmpViz.jsx') {
        const text = s.text.join(''), pattern = 'CACACACACACA';
        let matches = 0;
        for (let i = 0; i <= text.length - pattern.length; i++) if (text.startsWith(pattern, i)) matches++;
        assert.equal(s.kmp.matches, matches); assert.equal(s.naive.matches, matches);
        assert.equal(s.kmp.work, s.kmp.touches.reduce((a, b) => a + b, 0));
      } else if (name === 'QuicksortViz.jsx') {
        const fresh = model.init();
        let conversions = 0;
        fresh.median.a = fresh.median.a.map((value) => ({ valueOf() { conversions++; return value; } }));
        while (!fresh.median.done) fresh.median.step();
        assert.equal(fresh.median.work, conversions / 2, 'one charge per actual key comparison');
        assert.deepEqual(s.median.a, s.first.a);
        assert.deepEqual(s.median.a, [...s.median.a].sort((a, b) => a - b));
      } else if (name === 'SimplexViz.jsx') {
        const sc = s.scene;
        const objective = ([x, y]) => x * sc.objective[0] + y * sc.objective[1];
        let last = -Infinity;
        for (const point of sc.points) {
          assert.ok(point.every((v) => v >= -1e-8));
          for (const [a, b, rhs] of sc.constraints) assert.ok(a * point[0] + b * point[1] <= rhs + 1e-7);
          assert.ok(objective(point) >= last - 1e-8); last = objective(point);
        }
        close(last, Math.max(...sc.polygon.map(objective)));
        for (const pivot of sc.pivots) assert.equal(pivot.rates[pivot.enter], Math.min(...pivot.rates));
        close(sc.score(sc.verts[sc.path.at(-1)]), Math.max(...sc.verts.map(sc.score)));
      } else if (name === 'KmeansViz.jsx') {
        const fresh = model.init();
        for (const run of [fresh.pp, fresh.rand]) {
          const cost = () => run.pts.reduce((sum, p, i) => sum + p.reduce((v, x, j) => v + (x - run.centers[run.assign[i]][j]) ** 2, 0), 0);
          close(run.sse, cost());
          let last = run.sse;
          for (let i = 0; !run.done && i < 100; i++) {
            run.step(); close(run.sse, cost()); assert.ok(run.sse <= last + 1e-7); last = run.sse;
          }
          assert.ok(run.done);
        }
      } else if (name === 'ArithmeticViz.jsx') {
        const a = s.scene.act1;
        let x = a.bits.reduce((v, bit, i) => v + bit * 2 ** (-i - 1), 0) + 2 ** (-a.bits.length - 1);
        const decoded = [];
        for (let i = 0; i < a.syms.length; i++) {
          const sym = a.cum.findIndex((lo, j) => j < a.probs.length && x >= lo && x < a.cum[j + 1]);
          assert.ok(sym >= 0); decoded.push(sym); x = (x - a.cum[sym]) / a.probs[sym];
        }
        assert.deepEqual(decoded, a.syms);
        assert.equal(a.totalBits, a.bits.length);
        assert.ok(a.terminationBits >= 2);
      } else if (name === 'BitapViz.jsx') {
        const { pat, text, frames } = s.scene;
        let previous = Array.from({ length: pat.length + 1 }, (_, i) => i);
        text.forEach((ch, i) => {
          const next = [0];
          for (let j = 1; j <= pat.length; j++) next[j] = Math.min(previous[j] + 1, next[j - 1] + 1, previous[j - 1] + (pat[j - 1] === ch ? 0 : 1));
          for (let j = 1; j <= pat.length; j++) {
            assert.equal(Boolean(frames[i].R0 & (1 << (j - 1))), next[j] === 0);
            assert.equal(Boolean(frames[i].R1 & (1 << (j - 1))), next[j] <= 1);
          }
          previous = next;
        });
      } else if (name === 'CuckooViz.jsx') {
        const buckets = Array.from({ length: 16 }, () => []);
        const accepted = new Set();
        let held = null;
        for (const event of s.sim.events) {
          if (event.kind === 'evict') {
            if (held === null) accepted.add(event.placed.id);
            else assert.equal(event.placed.id, held);
            const i = buckets[event.b].findIndex((v) => v.id === event.evicted.id);
            assert.ok(i >= 0); buckets[event.b][i] = event.placed; held = event.evicted.id;
          } else if (event.kind === 'place') {
            if (held === null) accepted.add(event.item.id); else assert.equal(held, event.item.id);
            buckets[event.b].push(event.item); held = null;
          } else if (event.kind === 'delete') {
            assert.ok(accepted.delete(event.item.id));
            buckets[event.b] = buckets[event.b].filter((v) => v.id !== event.item.id);
          } else assert.equal(event.kind, 'reject');
          const actual = buckets.flat().map((v) => v.id);
          if (held !== null) actual.push(held);
          assert.deepEqual([...accepted].sort((a, b) => a - b), actual.sort((a, b) => a - b));
          buckets.forEach((bucket, b) => { assert.ok(bucket.length <= 4); bucket.forEach((v) => assert.ok(b === v.i1 || b === v.i2)); });
        }
        assert.equal(held, null);
      } else if (name === 'ZboxViz.jsx') {
        const { s: text, frames } = s.scene;
        let total = 0;
        frames.forEach((frame, i) => {
          let z = 0; while (i + z < text.length && text[z] === text[i + z]) z++;
          assert.equal(frame.z, z);
          total += frame.paid;
          if (i) assert.equal(frame.paidTotal, total);
          if (frame.paid) assert.equal(frame.paid, frame.z - frame.free + (i + frame.z < text.length ? 1 : 0));
        });
      } else if (name === 'LmViz.jsx') {
        const sc = s.scene;
        assert.ok(Number.isFinite(sc.lm.lam));
        assert.ok(sc.lm.converged || sc.lm.stalled);
        const cost = ([a, b]) => sc.data.reduce((sum, [t, y]) => sum + (a * Math.exp(-b * t) - y) ** 2, 0);
        close(sc.referenceCost, cost([3, 1.2])); close(sc.lm.cost, cost(sc.lm.p));
        for (let i = 1; i < sc.lm.path.length; i++) assert.ok(cost(sc.lm.path[i]) <= cost(sc.lm.path[i - 1]) + 1e-10);
        assert.ok(sc.lm.cost <= sc.referenceCost * 1.01);
      }
    },
  });
  assert.equal(report.summary.failedVisualizations, 0, JSON.stringify(report.visualizations.filter((row) => row.errors.length)));
});

test('cuckoo kick-limit rejection preserves every previously accepted member', async () => {
  let rejections = 0;
  const report = await auditCanvasCallbacks({ cycles: 22, paths: ['src/viz/CuckooViz.jsx'], quiet: true,
    output: 'build/audit-2026-10-15/cuckoo-rollback-regression.json',
    onCycle: ({ state }) => {
      const buckets = Array.from({ length: 16 }, () => []), members = new Set();
      let held = null;
      for (const e of state.sim.events) {
        if (e.kind === 'evict') {
          if (held === null) members.add(e.placed.id); else assert.equal(held, e.placed.id);
          const slot = buckets[e.b].indexOf(e.evicted.id);
          assert.ok(slot >= 0); buckets[e.b][slot] = e.placed.id; held = e.evicted.id;
        } else if (e.kind === 'place') {
          if (held === null) members.add(e.item.id); else assert.equal(held, e.item.id);
          buckets[e.b].push(e.item.id); held = null;
        } else if (e.kind === 'delete') {
          assert.ok(members.delete(e.item.id)); buckets[e.b] = buckets[e.b].filter((id) => id !== e.item.id);
        } else {
          assert.equal(e.kind, 'reject'); assert.equal(held, null); assert.ok(!members.has(e.item.id)); rejections++;
        }
        const present = buckets.flat(); if (held !== null) present.push(held);
        assert.deepEqual(present.sort((a, b) => a - b), [...members].sort((a, b) => a - b));
      }
      assert.equal(held, null, 'no accepted fingerprint is left outside the table');
    },
  });
  assert.ok(rejections > 0, 'the deterministic corpus exercises a failed insertion');
  assert.equal(report.summary.failedVisualizations, 0);
});
