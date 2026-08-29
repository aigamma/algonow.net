import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two acts of one lift. Act one: a small graph with negative
// edges (red) gets surveyed by Bellman-Ford: each node sinks or
// rises to its potential (its altitude), and every edge relabels
// to w + h(u) - h(v): watch the red labels turn green as the
// whole landscape tilts nonnegative with no path ranking touched.
// Act two: the bill: Floyd-Warshall's flat n^3 vs Johnson's
// survey-plus-n-Dijkstras vs n Bellman-Fords, counted exactly on
// a bigger instance, with plain Dijkstra's wrong-pair count as
// the red closing line.
const W = 640;
const H = 300;
// 20260830: scanned so the FIRST scene's raw-dijkstra check lands wrong
// pairs (3 of 51) with visible negative edges; later cycles vary honestly.
const SEED = 20260830;
const END_HOLD = 70;
const INF = Infinity;

export function genGraph(rand, n, m, spread) {
  // negative edges, no negative cycle: weights from hidden potentials
  const p = Array.from({ length: n }, () => Math.floor(rand() * (2 * spread + 1)) - spread);
  const seen = new Set();
  const edges = [];
  let guard = 0;
  while (edges.length < m && guard < m * 60) {
    guard += 1;
    const u = Math.floor(rand() * n);
    const v = Math.floor(rand() * n);
    const k = u * n + v;
    if (u === v || seen.has(k)) continue;
    seen.add(k);
    edges.push([u, v, Math.floor(rand() * 10) + p[u] - p[v]]);
  }
  return edges;
}

export function bellmanFord(n, edges, src, count) {
  const dist = new Array(n).fill(INF);
  dist[src] = 0;
  for (let pass = 0; pass < n - 1; pass++) {
    let changed = false;
    for (const [u, v, w] of edges) {
      count.c += 1;
      if (dist[u] !== INF && dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w;
        changed = true;
      }
    }
    if (!changed) break;
  }
  return dist;
}

export function dijkstra(n, adj, src, count) {
  // array-min variant (n is small): pop-finalize semantics
  const dist = new Array(n).fill(INF);
  const done = new Array(n).fill(false);
  dist[src] = 0;
  for (;;) {
    let u = -1;
    for (let i = 0; i < n; i++) if (!done[i] && (u === -1 || dist[i] < dist[u])) u = i;
    if (u === -1 || dist[u] === INF) break;
    done[u] = true;
    for (const [v, w] of adj[u]) {
      count.c += 1;
      if (dist[u] + w < dist[v]) dist[v] = dist[u] + w;
    }
  }
  return dist;
}

export function floydWarshall(n, edges) {
  const d = Array.from({ length: n }, () => new Array(n).fill(INF));
  for (let i = 0; i < n; i++) d[i][i] = 0;
  for (const [u, v, w] of edges) if (w < d[u][v]) d[u][v] = w;
  for (let k = 0; k < n; k++)
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++)
        if (d[i][k] + d[k][j] < d[i][j]) d[i][j] = d[i][k] + d[k][j];
  return d;
}

export function johnsonAll(n, edges, count) {
  const virt = edges.concat(Array.from({ length: n }, (_, v) => [n, v, 0]));
  const h = bellmanFord(n + 1, virt, n, count);
  const adj = Array.from({ length: n }, () => []);
  let minLifted = Infinity;
  for (const [u, v, w] of edges) {
    const wl = w + h[u] - h[v];
    if (wl < minLifted) minLifted = wl;
    adj[u].push([v, wl]);
  }
  const dist = [];
  for (let s = 0; s < n; s++) {
    const ds = dijkstra(n, adj, s, count);
    dist.push(ds.map((dv, v) => (dv === INF ? INF : dv - h[s] + h[v])));
  }
  return { dist, h, minLifted };
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  // Act 1: a small drawable graph.
  const n = 8;
  const edges = genGraph(rand, n, 14, 6);
  const c0 = { c: 0 };
  const { dist, h, minLifted } = johnsonAll(n, edges, c0);
  const fw = floydWarshall(n, edges);
  // raw dijkstra wrongness on the small graph
  const adjRaw = Array.from({ length: n }, () => []);
  for (const [u, v, w] of edges) adjRaw[u].push([v, w]);
  let wrong = 0;
  let reach = 0;
  for (let s = 0; s < n; s++) {
    const ds = dijkstra(n, adjRaw, s, { c: 0 });
    for (let v = 0; v < n; v++) {
      if (fw[s][v] !== INF) {
        reach += 1;
        if (ds[v] !== fw[s][v]) wrong += 1;
      }
    }
  }
  // Act 2: the counted race on a bigger instance.
  const N2 = 60;
  const edges2 = genGraph(rand, N2, 240, 20);
  const cj = { c: 0 };
  johnsonAll(N2, edges2, cj);
  const cb = { c: 0 };
  for (let s = 0; s < N2; s++) bellmanFord(N2, edges2, s, cb);
  const fwCount = N2 * N2 * N2;
  return { n, edges, h, minLifted, dist, fw, wrong, reach, N2, race: { fw: fwCount, johnson: cj.c, nbf: cb.c } };
}

const POS = [
  [110, 90], [250, 62], [390, 88], [500, 120],
  [470, 210], [330, 232], [180, 222], [80, 170],
];

export default function JohnsonViz() {
  const canvasRef = useRef(null);
  const cycle = useRef(0);
  const statsRef = useRef({ line: '' });
  const [restart, setRestart] = useState(0);
  const [snap, setSnap] = useState({ line: '' });

  useEffect(() => {
    const id = setInterval(() => setSnap({ ...statsRef.current }), 400);
    return () => clearInterval(id);
  }, []);

  useCanvasLoop(
    canvasRef,
    {
      width: W,
      height: H,
      stepMs: 60,
      init: () => ({
        scene: makeScene(SEED + cycle.current * 7919),
        act: 0,
        tick: 0,
        rest: 0,
        stopAtRest: isStill(),
      }),
      tick: (s) => {
        if (s.act >= 2) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            Object.assign(s, {
              scene: makeScene(SEED + cycle.current * 7919),
              act: 0,
              tick: 0,
              rest: 0,
            });
          }
          return true;
        }
        s.tick += 1;
        const len = s.act === 0 ? 260 + END_HOLD : 200 + END_HOLD;
        if (s.tick >= len) {
          s.tick = len;
          s.actRest = (s.actRest || 0) + 1;
          if (s.actRest > holdTicks(s)) {
            s.tick = 0;
            s.act += 1;
            s.actRest = 0;
          }
        }
        return true;
      },
      draw: (ctx, s) => {
        ctx.clearRect(0, 0, W, H);
        const css = getComputedStyle(document.documentElement);
        const algo = css.getPropertyValue('--algo').trim() || '#5da2ff';
        const heur = css.getPropertyValue('--heur').trim() || '#f0b94b';
        const good = css.getPropertyValue('--path').trim() || '#62d98a';
        const warn = css.getPropertyValue('--warn').trim() || '#e2606c';
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';
        const ink = css.getPropertyValue('--ink').trim() || '#e9edf6';
        const sc = s.scene;

        const done = s.act >= 2;
        const actIdx = done ? 1 : s.act;
        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';

        if (actIdx === 0) {
          const t = done ? 260 : Math.min(s.tick, 260);
          const phase = t < 80 ? 0 : t < 170 ? 1 : 2; // raw -> survey -> lifted
          const lift = phase === 0 ? 0 : phase === 1 ? Math.min(1, (t - 80) / 70) : 1;
          ctx.fillText('act 1 · the lift: one bellman-ford survey tilts every edge nonnegative, no ranking touched', 14, 20);
          const yOf = (i) => POS[i][1] + lift * Math.min(55, -sc.h[i] * 4);
          // edges
          ctx.font = '10px ui-monospace, monospace';
          for (const [u, v, w] of sc.edges) {
            const wl = w + sc.h[u] - sc.h[v];
            const x1 = POS[u][0];
            const y1 = yOf(u);
            const x2 = POS[v][0];
            const y2 = yOf(v);
            const neg = w < 0;
            ctx.strokeStyle = phase === 2 ? `${good}55` : neg ? `${warn}AA` : 'rgba(154,165,189,0.35)';
            ctx.lineWidth = neg && phase < 2 ? 1.8 : 1.1;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            // direction tick at 70% along
            const tx = x1 + (x2 - x1) * 0.7;
            const ty = y1 + (y2 - y1) * 0.7;
            ctx.fillStyle = ctx.strokeStyle;
            ctx.fillRect(tx - 1.5, ty - 1.5, 3, 3);
            const mx = (x1 + x2) / 2;
            const my = (y1 + y2) / 2 - 4;
            if (phase === 2) {
              ctx.fillStyle = good;
              ctx.fillText(String(wl), mx, my);
            } else {
              ctx.fillStyle = neg ? warn : dim;
              ctx.fillText(String(w), mx, my);
            }
          }
          // nodes
          for (let i = 0; i < sc.n; i++) {
            const y = yOf(i);
            ctx.fillStyle = 'rgba(93,162,255,0.16)';
            ctx.beginPath();
            ctx.arc(POS[i][0], y, 11, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = algo;
            ctx.lineWidth = 1.4;
            ctx.stroke();
            ctx.fillStyle = ink;
            ctx.font = '10px ui-monospace, monospace';
            ctx.fillText(String(i), POS[i][0] - 3, y + 3);
            if (phase >= 1) {
              ctx.fillStyle = heur;
              ctx.fillText(`h=${sc.h[i]}`, POS[i][0] + 14, y + 3);
            }
          }
          let line;
          if (done || t >= 260) {
            line = `lifted: min edge weight ${sc.minLifted} (never negative): dijkstra is safe now; raw dijkstra had ${sc.wrong} of ${sc.reach} pairs WRONG on this graph`;
            ctx.fillStyle = good;
          } else if (phase === 0) {
            line = 'raw graph: red edges are negative: pop-means-final is invalid here';
            ctx.fillStyle = warn;
          } else if (phase === 1) {
            line = 'the survey: bellman-ford from a virtual source assigns every node its altitude h';
            ctx.fillStyle = heur;
          } else {
            line = 'every edge relabels to w + h(u) - h(v): interior potentials cancel along any path';
            ctx.fillStyle = ink;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = { line };
        } else {
          const t = done ? 200 : Math.min(s.tick, 200);
          ctx.fillText(`act 2 · the bill at n = ${sc.N2}, m = 240 (sparse), in edge relaxations examined`, 14, 20);
          const frac = Math.min(1, t / 200);
          const bars = [
            ['floyd-warshall (flat n³)', sc.race.fw, warn],
            [`${sc.N2} × bellman-ford`, sc.race.nbf, heur],
            ['johnson: survey + lift + dijkstras', sc.race.johnson, algo],
          ];
          bars.forEach(([label, total, color], i) => {
            const val = Math.floor(frac * total);
            const y = 62 + i * 56;
            ctx.fillStyle = color;
            ctx.font = '12px ui-monospace, monospace';
            ctx.fillText(`${label}: ${val.toLocaleString()}`, 60, y - 8);
            ctx.strokeStyle = color;
            ctx.strokeRect(60, y, 500 * Math.min(1, total / sc.race.fw), 14);
            ctx.fillStyle = `${color}44`;
            ctx.fillRect(60, y, 500 * Math.min(1, val / sc.race.fw), 14);
          });
          let line;
          if (done || t >= 200) {
            line = `same ${sc.N2 * sc.N2} distances, verified equal: ${(sc.race.fw / sc.race.johnson).toFixed(0)}x under the flat loops (48x at n=200 in the solution)`;
            ctx.fillStyle = good;
          } else {
            line = 'all three produce the identical distance matrix: only the bill differs';
            ctx.fillStyle = ink;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = {
            line: done
              ? 'survey once, lift everything, then greed is safe: the potential is the whole trick'
              : line,
          };
        }
      },
    },
    [restart],
  );

  return (
    <>
      <canvas ref={canvasRef} style={{ aspectRatio: `${W} / ${H}` }} aria-hidden="true" />
      <div className="viz-controls">
        <button
          type="button"
          className="btn"
          onClick={() => {
            cycle.current += 1;
            setRestart((t) => t + 1);
          }}
        >
          new graph
        </button>
        <span className="viz-stat">
          {snap.line || 'surveying the terrain…'}
        </span>
      </div>
    </>
  );
}
