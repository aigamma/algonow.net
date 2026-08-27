import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// The frontier, live. A random dependency graph runs Kahn's algorithm one
// dequeue per beat: amber tasks are the ready queue (no unmet arrows),
// green tasks are done, dim ones still blocked. Each completion fades its
// outgoing edges and may light new amber. Tasks settle into columns by
// wave, so the finished picture IS the parallel schedule, and the wave
// count printed below is the longest prerequisite chain plus one.
const W = 640;
const H = 300;
const SEED = 20260827;
const N = 26;
const TICKS_PER_STEP = 9;

function h32(x) {
  x = (x + 0x9e3779b9) | 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return x >>> 0;
}

function makeScene(seed) {
  const rand = mulberry32(seed);
  // Random DAG on a hidden order.
  const perm = Array.from({ length: N }, (_, i) => i);
  for (let i = N - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  const edges = new Set();
  const target = 40;
  while (edges.size < target) {
    let i = Math.floor(rand() * N);
    let j = Math.floor(rand() * N);
    if (i === j) continue;
    if (i > j) [i, j] = [j, i];
    edges.add(perm[i] * 100 + perm[j]);
  }
  const adj = Array.from({ length: N }, () => []);
  const indeg = new Array(N).fill(0);
  for (const e of edges) {
    const u = Math.floor(e / 100);
    const v = e % 100;
    adj[u].push(v);
    indeg[v] += 1;
  }
  // Waves for layout.
  const wave = new Array(N).fill(0);
  const deg = [...indeg];
  let frontier = [];
  for (let v = 0; v < N; v++) if (deg[v] === 0) frontier.push(v);
  let w = 0;
  while (frontier.length) {
    const nxt = [];
    for (const v of frontier) {
      wave[v] = w;
      for (const t of adj[v]) {
        deg[t] -= 1;
        if (deg[t] === 0) nxt.push(t);
      }
    }
    frontier = nxt;
    w += 1;
  }
  const waves = w;
  const perWave = new Array(waves).fill(0);
  const slot = new Array(N).fill(0);
  for (let v = 0; v < N; v++) {
    slot[v] = perWave[wave[v]];
    perWave[wave[v]] += 1;
  }
  const pos = Array.from({ length: N }, (_, v) => [
    50 + wave[v] * ((W - 100) / Math.max(waves - 1, 1)),
    44 + slot[v] * ((H - 100) / Math.max(Math.max(...perWave) - 1, 1)) + (wave[v] % 2) * 8,
  ]);
  // The dequeue order (FIFO Kahn), precomputed for replay.
  const deg2 = [...indeg];
  const q = [];
  for (let v = 0; v < N; v++) if (deg2[v] === 0) q.push(v);
  const order = [];
  let qi = 0;
  while (qi < q.length) {
    const v = q[qi];
    qi += 1;
    order.push(v);
    for (const t of adj[v]) {
      deg2[t] -= 1;
      if (deg2[t] === 0) q.push(t);
    }
  }
  return { adj, indeg, pos, order, waves };
}

export default function KahnViz() {
  const canvasRef = useRef(null);
  const cycle = useRef(0);
  const statsRef = useRef({ done: 0, ready: 0, waves: 0 });
  const [restart, setRestart] = useState(0);
  const [snap, setSnap] = useState({ done: 0, ready: 0, waves: 0 });

  useEffect(() => {
    const id = setInterval(() => setSnap({ ...statsRef.current }), 400);
    return () => clearInterval(id);
  }, []);

  useCanvasLoop(
    canvasRef,
    {
      width: W,
      height: H,
      stepMs: 40,
      init: () => ({
        scene: makeScene(h32(SEED + cycle.current * 7919)),
        tick: 0,
        rest: 0,
        stopAtRest: isStill(),
      }),
      tick: (s) => {
        const total = (s.scene.order.length + 2) * TICKS_PER_STEP;
        if (s.tick >= total) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            s.scene = makeScene(h32(SEED + cycle.current * 7919));
            s.tick = 0;
            s.rest = 0;
          }
          return true;
        }
        s.tick += 1;
        return true;
      },
      draw: (ctx, s) => {
        ctx.clearRect(0, 0, W, H);
        const css = getComputedStyle(document.documentElement);
        const heur = css.getPropertyValue('--heur').trim() || '#f0b94b';
        const path = css.getPropertyValue('--path').trim() || '#62d98a';
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';

        const doneCount = Math.min(Math.floor(s.tick / TICKS_PER_STEP), s.scene.order.length);
        const done = new Set(s.scene.order.slice(0, doneCount));
        const deg = [...s.scene.indeg];
        for (const v of done) for (const t of s.scene.adj[v]) deg[t] -= 1;
        const ready = [];
        for (let v = 0; v < N; v++) if (!done.has(v) && deg[v] === 0) ready.push(v);

        for (let u = 0; u < N; u++) {
          for (const v of s.scene.adj[u]) {
            const [x1, y1] = s.scene.pos[u];
            const [x2, y2] = s.scene.pos[v];
            ctx.strokeStyle = done.has(u) ? 'rgba(98,217,138,0.14)' : 'rgba(255,255,255,0.12)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
          }
        }
        for (let v = 0; v < N; v++) {
          const [x, y] = s.scene.pos[v];
          const isDone = done.has(v);
          const isReady = ready.includes(v);
          ctx.beginPath();
          ctx.arc(x, y, 9, 0, Math.PI * 2);
          ctx.fillStyle = isDone
            ? 'rgba(98,217,138,0.25)'
            : isReady
              ? 'rgba(240,185,75,0.3)'
              : 'rgba(255,255,255,0.05)';
          ctx.fill();
          ctx.strokeStyle = isDone ? path : isReady ? heur : '#6b7690';
          ctx.lineWidth = isReady ? 1.8 : 1.2;
          ctx.stroke();
        }
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText(
          doneCount >= s.scene.order.length
            ? `all ${N} tasks ordered · ${s.scene.waves} waves = longest chain + 1`
            : `done ${doneCount}/${N} · ready now: ${ready.length} (the amber frontier)`,
          14,
          H - 10,
        );
        statsRef.current = { done: doneCount, ready: ready.length, waves: s.scene.waves };
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
          {snap.done >= N
            ? <>finished in <strong>{snap.waves}</strong> parallel waves · columns are the schedule</>
            : <>the amber frontier holds <strong>{snap.ready}</strong> startable tasks right now</>}
        </span>
      </div>
    </>
  );
}
