import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Fruchterman-Reingold on a seeded small graph (grid, random tree, or ring
// with chords), four iterations per tick from a random start. Invariant each
// tick: every move within the cap, all n(n-1)/2 pairs counted, coordinates
// finite; crossings are counted by a segment test.
const W = 640;
const H = 300;
const SEED = 20261010;
const ITERS = 200;
const PER_TICK = 4;

function makeGraph(kind, rand) {
  if (kind === 0) {
    const a = 4; const b = 5; const n = a * b; const edges = [];
    for (let i = 0; i < a; i += 1) for (let j = 0; j < b; j += 1) {
      if (j + 1 < b) edges.push([i * b + j, i * b + j + 1]);
      if (i + 1 < a) edges.push([i * b + j, (i + 1) * b + j]);
    }
    return { n, edges, label: '4 x 5 grid' };
  }
  if (kind === 1) {
    const n = 18; const edges = [];
    for (let i = 1; i < n; i += 1) edges.push([Math.floor(rand() * i), i]);
    return { n, edges, label: 'random tree, 18 vertices' };
  }
  const n = 16; const edges = []; const seen = new Set();
  for (let i = 0; i < n; i += 1) { edges.push([i, (i + 1) % n]); seen.add(`${i},${(i + 1) % n}`); seen.add(`${(i + 1) % n},${i}`); }
  while (edges.length < n + 3) {
    const a = Math.floor(rand() * n); const b = Math.floor(rand() * n);
    if (a !== b && !seen.has(`${a},${b}`)) { edges.push([a, b]); seen.add(`${a},${b}`); seen.add(`${b},${a}`); }
  }
  return { n, edges, label: 'ring of 16 with 3 chords' };
}

function crossings(edges, pos) {
  const o = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  let c = 0;
  for (let x = 0; x < edges.length; x += 1) for (let y = x + 1; y < edges.length; y += 1) {
    const [a, b] = edges[x]; const [cc, d] = edges[y];
    if (a === cc || a === d || b === cc || b === d) continue;
    const p = pos[a]; const q = pos[b]; const r = pos[cc]; const s = pos[d];
    if (o(p, q, r) * o(p, q, s) < 0 && o(r, s, p) * o(r, s, q) < 0) c += 1;
  }
  return c;
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const kind = Math.floor(rand() * 3);
  const g = makeGraph(kind, rand);
  const pos = Array.from({ length: g.n }, () => [rand(), rand()]);
  return { ...g, pos, k: Math.sqrt(1 / g.n), it: 0, t: 0.1, pairs: 0, maxMove: 0, cross: crossings(g.edges, pos), startCross: 0, ok: true, done: false, last: `${g.label}: random start` };
}

function iterate(sc) {
  const { n, edges, pos, k } = sc;
  const t = 0.1 * (1 - sc.it / ITERS);
  const disp = pos.map(() => [0, 0]);
  let pairs = 0;
  for (let i = 0; i < n; i += 1) for (let j = i + 1; j < n; j += 1) {
    pairs += 1;
    let dx = pos[j][0] - pos[i][0]; let dy = pos[j][1] - pos[i][1];
    let d = Math.hypot(dx, dy);
    if (d < 1e-9) { dx = 1e-6; dy = 1e-6; d = Math.hypot(dx, dy); }
    const f = (k * k) / d / d;
    disp[j][0] += dx * f; disp[j][1] += dy * f; disp[i][0] -= dx * f; disp[i][1] -= dy * f;
  }
  for (const [a, b] of edges) {
    const dx = pos[b][0] - pos[a][0]; const dy = pos[b][1] - pos[a][1];
    const d = Math.hypot(dx, dy) || 1e-9;
    const f = d / k;
    disp[b][0] -= dx * f; disp[b][1] -= dy * f; disp[a][0] += dx * f; disp[a][1] += dy * f;
  }
  let maxMove = 0;
  for (let i = 0; i < n; i += 1) {
    const m = Math.hypot(disp[i][0], disp[i][1]);
    if (m > 0) {
      const s = Math.min(m, t) / m;
      pos[i][0] += disp[i][0] * s; pos[i][1] += disp[i][1] * s;
      maxMove = Math.max(maxMove, m * s);
    }
  }
  sc.ok = sc.ok && pairs === (n * (n - 1)) / 2 && maxMove <= t + 1e-9 && pos.every((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]) && Math.abs(p[0]) < 50 && Math.abs(p[1]) < 50);
  sc.pairs += pairs; sc.maxMove = maxMove; sc.t = t; sc.it += 1;
}

export function sceneTick(sc) {
  if (sc.done) return true;
  if (sc.it === 0) sc.startCross = sc.cross;
  for (let r = 0; r < PER_TICK && sc.it < ITERS; r += 1) iterate(sc);
  sc.cross = crossings(sc.edges, sc.pos);
  if (sc.it >= ITERS) {
    sc.done = true;
    sc.last = `done: ${sc.label}, ${ITERS} iterations, ${sc.pairs.toLocaleString()} pair forces; crossings ${sc.startCross} at the start, ${sc.cross} at rest; invariants held: ${sc.ok ? 'yes' : 'NO'}`;
    return true;
  }
  sc.last = `iteration ${sc.it}: t = ${sc.t.toFixed(3)}, largest move ${sc.maxMove.toFixed(4)}, crossings ${sc.cross}`;
  return false;
}

export default function ForceDirectedViz() {
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
      stepMs: 90,
      init: () => ({ scene: makeScene(SEED + cycle.current * 7919), done: false, rest: 0, stopAtRest: isStill() }),
      tick: (s) => {
        if (s.done) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s) * 6) {
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
        const warn = css.getPropertyValue('--warn').trim() || '#e2606c';
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';
        const ink = css.getPropertyValue('--ink').trim() || '#e9edf6';
        const sc = s.scene;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText('repulsion k²/d on every pair, attraction d²/k on every edge, moves capped by a cooling t', 12, 18);
        // fit the drawing to a box
        const xs = sc.pos.map((p) => p[0]); const ys = sc.pos.map((p) => p[1]);
        const minX = Math.min(...xs); const maxX = Math.max(...xs); const minY = Math.min(...ys); const maxY = Math.max(...ys);
        const span = Math.max(maxX - minX, maxY - minY, 1e-6);
        const box = 200; const ox = 40; const oy = 50;
        const px = (p) => [ox + ((p[0] - minX) / span) * box + (box - ((maxX - minX) / span) * box) / 2, oy + ((p[1] - minY) / span) * box + (box - ((maxY - minY) / span) * box) / 2];
        ctx.strokeStyle = algo; ctx.lineWidth = 1.5;
        for (const [a, b] of sc.edges) { const p = px(sc.pos[a]); const q = px(sc.pos[b]); ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); }
        ctx.fillStyle = ink;
        for (const p0 of sc.pos) { const p = px(p0); ctx.beginPath(); ctx.arc(p[0], p[1], 3.5, 0, Math.PI * 2); ctx.fill(); }
        // temperature bar and counters
        const bx = 300; const by = 60;
        ctx.fillStyle = dim; ctx.fillText(`${sc.label}; iteration ${sc.it} of ${ITERS}`, bx, by);
        ctx.fillText('temperature t (the move cap), cooling linearly to zero', bx, by + 22);
        ctx.fillStyle = `${heur}55`; ctx.fillRect(bx, by + 30, 300, 10);
        ctx.fillStyle = heur; ctx.fillRect(bx, by + 30, 300 * (sc.t / 0.1), 10);
        ctx.fillStyle = dim; ctx.fillText(`largest move this iteration ${sc.maxMove.toFixed(4)}, cap ${sc.t.toFixed(3)}`, bx, by + 58);
        ctx.fillText(`pair forces so far ${sc.pairs.toLocaleString()} (${((sc.n * (sc.n - 1)) / 2).toLocaleString()} per iteration)`, bx, by + 76);
        ctx.fillStyle = sc.cross === 0 ? good : warn;
        ctx.fillText(`edge crossings: ${sc.cross}${sc.it > 0 ? ` (${sc.startCross} at the random start)` : ''}`, bx, by + 100);
        ctx.fillStyle = dim;
        ctx.fillText('the file: 6x6 grid 522 crossings to 0, stress 0.3372 to 0.0135', bx, by + 124);
        ctx.fillStyle = sc.ok ? good : warn;
        ctx.fillText(sc.ok ? 'invariant: moves within the cap, all pairs counted, coordinates finite' : 'INVARIANT BROKEN', bx, by + 148);
        const line = sc.last;
        ctx.fillStyle = s.done ? (sc.ok ? good : warn) : ink;
        ctx.fillText(line.length > 96 ? `${line.slice(0, 95)}…` : line, 12, H - 6);
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
        <span className="viz-stat">{snap.line || 'settling…'}</span>
      </div>
    </>
  );
}
