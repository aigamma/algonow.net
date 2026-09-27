import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two small communities joined by one bridge. Each tick runs Brandes
// from one more source: a breadth-first search layers the graph
// (blue rings by distance, path counts sigma on the nodes), then the
// accumulation walks back from the farthest layer passing
// dependencies to predecessors (amber edges). Node size is the
// betweenness accumulated so far; when every source has been used
// the bridge endpoints stand out, and the final values are compared
// with the definition computed from all-pairs distances.
const W = 640;
const H = 300;
const SEED = 20260926;
const K = 8;

export function makeGraph(seed) {
  const rand = mulberry32(seed);
  const n = 2 * K;
  const adj = Array.from({ length: n }, () => new Set());
  const add = (u, v) => {
    adj[u].add(v);
    adj[v].add(u);
  };
  for (const side of [0, K]) {
    for (let u = side; u < side + K; u++) for (let v = u + 1; v < side + K; v++) if (rand() < 0.5) add(u, v);
    for (let v = side + 1; v < side + K; v++) add(side, v);
  }
  add(2, K + 2);
  const pos = [];
  for (let i = 0; i < n; i++) {
    const side = i < K ? 0 : 1;
    const j = i % K;
    const angle = (2 * Math.PI * j) / K;
    pos.push([(side === 0 ? 130 : 400) + 70 * Math.cos(angle), 150 + 70 * Math.sin(angle)]);
  }
  return { n, adj: adj.map((s) => [...s].sort((a, b) => a - b)), pos, bridge: [2, K + 2] };
}

export function makeScene(seed) {
  const g = makeGraph(seed);
  return { g, cb: new Array(g.n).fill(0), source: 0, last: null, done: false };
}

function brandesSource(g, s) {
  const n = g.n;
  const stack = [];
  const preds = Array.from({ length: n }, () => []);
  const sigma = new Array(n).fill(0);
  const dist = new Array(n).fill(-1);
  sigma[s] = 1;
  dist[s] = 0;
  const q = [s];
  let head = 0;
  while (head < q.length) {
    const v = q[head++];
    stack.push(v);
    for (const w of g.adj[v]) {
      if (dist[w] < 0) {
        dist[w] = dist[v] + 1;
        q.push(w);
      }
      if (dist[w] === dist[v] + 1) {
        sigma[w] += sigma[v];
        preds[w].push(v);
      }
    }
  }
  const delta = new Array(n).fill(0);
  const edgesUsed = [];
  while (stack.length) {
    const w = stack.pop();
    for (const v of preds[w]) {
      delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w]);
      edgesUsed.push([v, w]);
    }
  }
  return { dist, sigma, delta, edgesUsed };
}

export function sceneTick(sc) {
  if (sc.done) return true;
  const s = sc.source;
  const r = brandesSource(sc.g, s);
  for (let v = 0; v < sc.g.n; v++) if (v !== s) sc.cb[v] += r.delta[v] / 2;
  sc.last = { s, ...r };
  sc.source += 1;
  if (sc.source >= sc.g.n) sc.done = true;
  return sc.done;
}

export function byDefinition(g) {
  const n = g.n;
  const dist = [];
  const sigma = [];
  for (let s = 0; s < n; s++) {
    const d = new Array(n).fill(-1);
    const sg = new Array(n).fill(0);
    d[s] = 0;
    sg[s] = 1;
    const q = [s];
    let head = 0;
    while (head < q.length) {
      const v = q[head++];
      for (const w of g.adj[v]) {
        if (d[w] < 0) {
          d[w] = d[v] + 1;
          q.push(w);
        }
        if (d[w] === d[v] + 1) sg[w] += sg[v];
      }
    }
    dist.push(d);
    sigma.push(sg);
  }
  const cb = new Array(n).fill(0);
  for (let s = 0; s < n; s++) for (let t = s + 1; t < n; t++) for (let v = 0; v < n; v++) {
    if (v === s || v === t) continue;
    if (dist[s][v] + dist[v][t] === dist[s][t]) cb[v] += (sigma[s][v] * sigma[v][t]) / sigma[s][t];
  }
  return cb;
}

export default function BrandesViz() {
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
      stepMs: 700,
      init: () => ({ scene: makeScene(SEED + cycle.current * 7919), done: false, rest: 0, stopAtRest: isStill() }),
      tick: (s) => {
        if (s.done) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
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
        const algo = css.getPropertyValue('--algo').trim() || '#5da2ff';
        const heur = css.getPropertyValue('--heur').trim() || '#f0b94b';
        const good = css.getPropertyValue('--path').trim() || '#62d98a';
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';
        const ink = css.getPropertyValue('--ink').trim() || '#e9edf6';
        const sc = s.scene;
        const { g } = sc;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText(`two communities of ${K} joined by one bridge; source ${Math.min(sc.source, g.n)} of ${g.n}: one BFS, then one accumulation pass back`, 12, 18);
        // edges
        const used = new Set(sc.last ? sc.last.edgesUsed.map(([a, b]) => `${a}-${b}`) : []);
        for (let u = 0; u < g.n; u++) for (const v of g.adj[u]) {
          if (v < u) continue;
          const key1 = `${u}-${v}`;
          const key2 = `${v}-${u}`;
          const active = !s.done && (used.has(key1) || used.has(key2));
          ctx.strokeStyle = active ? heur : `${dim}44`;
          ctx.lineWidth = active ? 2 : 1;
          ctx.beginPath();
          ctx.moveTo(g.pos[u][0], g.pos[u][1]);
          ctx.lineTo(g.pos[v][0], g.pos[v][1]);
          ctx.stroke();
        }
        ctx.lineWidth = 1;
        const maxCb = Math.max(1e-9, ...sc.cb);
        for (let v = 0; v < g.n; v++) {
          const [x, y] = g.pos[v];
          const r = 4 + 12 * (sc.cb[v] / maxCb);
          const isBridge = g.bridge.includes(v);
          ctx.fillStyle = s.done && isBridge ? good : sc.last && sc.last.s === v ? heur : algo;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
          if (sc.last && !s.done) {
            ctx.fillStyle = ink;
            ctx.font = '9px ui-monospace, monospace';
            ctx.fillText(`d${sc.last.dist[v]} σ${sc.last.sigma[v]}`, x + r + 2, y - 4);
            ctx.font = '11px ui-monospace, monospace';
          }
        }
        ctx.fillStyle = dim;
        ctx.fillText('node size: betweenness accumulated so far; amber: this source and the edges its accumulation used', 12, 250);
        ctx.fillText('labels: d = distance from the source, σ = number of shortest paths to the node', 12, 268);
        let line;
        if (s.done) {
          const def = byDefinition(g);
          const worst = Math.max(...sc.cb.map((v, i) => Math.abs(v - def[i])));
          const order = [...Array(g.n).keys()].sort((a, b) => sc.cb[b] - sc.cb[a]);
          line = `all ${g.n} sources done: the bridge endpoints ${order[0]} and ${order[1]} rank first (${sc.cb[order[0]].toFixed(1)}, ${sc.cb[order[1]].toFixed(1)}); agreement with the definition ${worst.toExponential(0)}`;
          ctx.fillStyle = good;
        } else {
          line = 'delta(v) = sum over successors w of (sigma(v) / sigma(w)) (1 + delta(w)): every path counted, none listed';
          ctx.fillStyle = ink;
        }
        ctx.fillText(line, 12, H - 8);
        statsRef.current = { line };
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
        <span className="viz-stat">{snap.line || 'accumulating…'}</span>
      </div>
    </>
  );
}
