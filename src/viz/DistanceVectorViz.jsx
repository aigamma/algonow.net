import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Nine routers on a seeded mesh learn their distance to the amber destination
// by the Bellman-Ford exchange, one interval per tick; then the destination
// loses every link or one link in use is cut (plain or poison reverse by
// cycle). Invariant: estimates never fall below the truth while building, a
// quiet interval means every estimate equals the BFS referee after exactly
// L - 1 busy intervals, and no finite estimate reaches the cap.
const W = 640;
const H = 300;
const SEED = 20261010;
const N = 9;
const CAP = 16;
const INF = Infinity;

function bfs(adj) {
  const d = Array(N).fill(INF);
  d[0] = 0;
  const q = [0];
  while (q.length) {
    const u = q.shift();
    for (const v of adj[u]) if (d[v] === INF) { d[v] = d[u] + 1; q.push(v); }
  }
  return d;
}

// The variant follows the seed, so seeded cycles cover all four.
export function makeScene(seed, variant = seed % 4) {
  const rand = mulberry32(seed);
  const order = [...Array(N).keys()];
  for (let i = N - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const adj = Array.from({ length: N }, () => new Set());
  const link = (u, v) => { adj[u].add(v); adj[v].add(u); };
  for (let i = 1; i < N; i += 1) link(order[i], order[Math.floor(rand() * i)]);
  for (let extra = 3 + Math.floor(rand() * 4), tries = 0; extra > 0 && tries < 400; tries += 1) {
    const u = Math.floor(rand() * N);
    const v = Math.floor(rand() * N);
    if (u !== v && !adj[u].has(v)) { link(u, v); extra -= 1; }
  }
  const pos = [];
  for (let i = 0; i < N; i += 1) {
    const a = (2 * Math.PI * i) / N - Math.PI / 2 + (rand() - 0.5) * 0.35;
    const r = 96 + (rand() - 0.5) * 30;
    pos.push([200 + r * Math.cos(a), 152 + r * Math.sin(a)]);
  }
  const est = Array(N).fill(INF);
  const hop = Array(N).fill(-1);
  est[0] = 0;
  hop[0] = 0;
  for (const v of adj[0]) { est[v] = 1; hop[v] = 0; }
  const truth = bfs(adj);
  const poison = variant % 2 === 1;
  return { rand, adj, pos, est, hop, truth, L: Math.max(...truth), poison, mode: poison ? 'poison reverse' : 'plain exchange', isolate: variant < 2, phase: 'build', busy: 0, busy2: 0, hold: 3, vectors: 0, changed: 0, worst: 0, failed: [], done: false, ok: true, last: 'building the tables toward the amber destination' };
}

function exchange(sc) {
  const { adj, est, hop } = sc;
  const heard = est.map(() => []);
  for (let v = 0; v < N; v += 1) {
    for (const u of adj[v]) {
      heard[u].push([v, sc.poison && hop[v] === u && v !== 0 ? INF : est[v]]);
      sc.vectors += 1;
    }
  }
  let changes = 0;
  for (let u = 1; u < N; u += 1) {
    let best = INF;
    let bestHop = -1;
    for (const [v, adv] of heard[u]) {
      if (1 + adv < best || (1 + adv === best && v === hop[u])) { best = 1 + adv; bestHop = v; }
    }
    if (best >= CAP) { best = INF; bestHop = -1; }
    // a new next hop at the same distance is a change too (poison reverse)
    if (best !== est[u] || bestHop !== hop[u]) changes += 1;
    est[u] = best;
    hop[u] = bestHop;
    if (best !== INF && sc.phase === 'fail') sc.worst = Math.max(sc.worst, best);
  }
  return changes;
}

function cut(sc) {
  const { adj } = sc;
  if (sc.isolate) {
    for (const v of [...adj[0]]) { adj[0].delete(v); adj[v].delete(0); sc.failed.push([0, v]); }
  } else {
    // a link in use as a next hop, if one can go without disconnecting the mesh
    const edges = [];
    for (let u = 0; u < N; u += 1) for (const v of adj[u]) if (u < v) edges.push([u, v]);
    const used = ([u, v]) => (sc.hop[u] === v || sc.hop[v] === u ? 1 : 0);
    edges.sort((a, b) => used(b) - used(a) || sc.rand() - 0.5);
    for (const [u, v] of edges) {
      adj[u].delete(v);
      adj[v].delete(u);
      if (bfs(adj).every((x) => x !== INF)) { sc.failed.push([u, v]); break; }
      adj[u].add(v);
      adj[v].add(u);
    }
  }
  sc.truth = bfs(adj);
}

export function sceneTick(sc) {
  if (sc.done) return true;
  const wrong = () => sc.est.filter((e, u) => e !== sc.truth[u]).length;
  if (sc.phase === 'build') {
    sc.changed = exchange(sc);
    if (sc.est.some((e, u) => e < sc.truth[u])) sc.ok = false;
    if (sc.changed === 0) {
      if (wrong() || sc.busy !== Math.max(sc.L - 1, 0)) sc.ok = false;
      sc.phase = 'hold';
      sc.last = `quiet after ${sc.busy} busy intervals (L - 1 = ${sc.L - 1}): every estimate equals the BFS referee`;
    } else {
      sc.busy += 1;
      sc.last = `interval ${sc.busy}: ${sc.changed} routers changed, ${N - wrong()} of ${N} hold the true distance`;
    }
    return false;
  }
  if (sc.phase === 'hold') {
    if ((sc.hold -= 1) <= 0) {
      cut(sc);
      sc.phase = 'fail';
      sc.last = sc.isolate ? `the destination lost ${sc.failed.length} links: every router must learn it is gone (${sc.mode})` : `link ${sc.failed[0][0]}-${sc.failed[0][1]} failed: the tables must re-route (${sc.mode})`;
    }
    return false;
  }
  sc.changed = exchange(sc);
  sc.busy2 += 1;
  if (sc.est.some((e) => e !== INF && e >= CAP)) sc.ok = false;
  if (sc.changed === 0 || sc.busy2 > 80) {
    sc.busy2 -= 1;
    if (sc.changed !== 0 || wrong()) sc.ok = false;
    sc.done = true;
    sc.last = `done: ${sc.busy2} intervals after the failure, ${sc.isolate ? 'the dead route counted to' : 'worst transient'} ${sc.worst} (${sc.mode}); tables equal the referee: ${sc.ok ? 'yes' : 'NO'}`;
    return true;
  }
  sc.last = `interval ${sc.busy2} after the failure: ${sc.changed} changed, ${wrong()} of ${N} still wrong, worst distance ${sc.worst}`;
  return false;
}

export default function DistanceVectorViz() {
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
      stepMs: 520,
      init: () => ({ scene: makeScene(SEED + cycle.current * 7919), done: false, rest: 0, stopAtRest: isStill() }),
      tick: (s) => {
        if (s.done) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s) * 2) {
            cycle.current += 1;
            Object.assign(s, { scene: makeScene(SEED + cycle.current * 7919), done: false, rest: 0 });
          }
          return true;
        }
        if (sceneTick(s.scene)) s.done = true;
        return true;
      },
      draw: (ctx, s) => {
        ctx.clearRect(0, 0, W, H);
        const css = getComputedStyle(document.documentElement);
        const col = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
        const algo = col('--algo', '#5da2ff');
        const heur = col('--heur', '#f0b94b');
        const good = col('--path', '#62d98a');
        const warn = col('--warn', '#e2606c');
        const dim = col('--ink-dim', '#9aa5bd');
        const sc = s.scene;
        const okAt = (u) => sc.est[u] === sc.truth[u];
        const seg = (u, v) => { ctx.beginPath(); ctx.moveTo(...sc.pos[u]); ctx.lineTo(...sc.pos[v]); ctx.stroke(); };
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText(`one update interval per tick: each router hands its distance to the amber destination to every neighbor (${sc.mode})`, 12, 18);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = `${dim}77`;
        for (let u = 0; u < N; u += 1) for (const v of sc.adj[u]) if (u < v) seg(u, v);
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = warn;
        for (const [u, v] of sc.failed) seg(u, v);
        ctx.setLineDash([]);
        ctx.lineWidth = 2;
        for (let u = 1; u < N; u += 1) {
          if (sc.hop[u] < 0) continue;
          const [x0, y0] = sc.pos[u];
          const [x1, y1] = sc.pos[sc.hop[u]];
          const ex = x0 + (x1 - x0) * 0.55;
          const ey = y0 + (y1 - y0) * 0.55;
          ctx.strokeStyle = ctx.fillStyle = okAt(u) ? algo : warn;
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(ex, ey);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(ex, ey, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
        for (let u = 0; u < N; u += 1) {
          const [x, y] = sc.pos[u];
          const color = u === 0 ? heur : okAt(u) ? good : warn;
          ctx.beginPath();
          ctx.arc(x, y, 14, 0, Math.PI * 2);
          ctx.fillStyle = u === 0 ? heur : '#1b2130';
          ctx.fill();
          ctx.strokeStyle = color;
          ctx.stroke();
          ctx.fillStyle = u === 0 ? '#1b2130' : color;
          ctx.font = 'bold 11px ui-monospace, monospace';
          const label = u === 0 ? 'D' : sc.est[u] === INF ? '∞' : String(sc.est[u]);
          ctx.fillText(label, x - (label.length > 1 ? 7 : 3.5), y + 4);
          ctx.font = '11px ui-monospace, monospace';
        }
        const right = N - sc.est.filter((e, u) => e !== sc.truth[u]).length;
        const after = sc.phase === 'fail' || sc.done;
        [
          [dim, `vectors handed over: ${sc.vectors}; changed now: ${sc.changed}`],
          [right === N ? good : warn, `${right} of ${N} equal the BFS referee`],
          [after && sc.worst >= 8 ? warn : dim, after ? `${sc.isolate ? 'dead route counted to' : 'worst transient distance'} ${sc.worst} (cap ${CAP})` : `L - 1 = ${sc.L - 1} busy intervals expected`],
          [dim, 'the file: the chain counts to 15 in 15 intervals'],
          [sc.ok ? good : warn, sc.ok ? 'invariant: quiet tables equal BFS' : 'INVARIANT BROKEN'],
        ].forEach(([c, t], i) => { ctx.fillStyle = c; ctx.fillText(t, 400, 80 + i * 22); });
        ctx.fillStyle = s.done ? (sc.ok ? good : warn) : col('--ink', '#e9edf6');
        ctx.fillText(sc.last.length > 96 ? `${sc.last.slice(0, 95)}…` : sc.last, 12, H - 6);
        statsRef.current = { line: sc.last };
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
          new network
        </button>
        <span className="viz-stat">{snap.line || 'exchanging vectors…'}</span>
      </div>
    </>
  );
}
