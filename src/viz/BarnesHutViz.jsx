import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// 200 bodies in a few clumps, in a quadtree (the plane's octree). Each
// tick picks the next body and computes the force on it two ways: by
// direct summation over the other 199 bodies, and by walking the tree
// with the opening criterion size / distance < theta. Cells accepted as
// single point masses are drawn amber with their centers of mass; cells
// that had to be opened are outlined faintly. The two force arrows
// are drawn on the body, and the interaction count and relative error
// are reported.
const W = 640;
const H = 300;
const SEED = 20260926;
const N = 200;
const THETA = 0.5;
const EPS = 0.01;

function gauss(rand) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function makeCell(cx, cy, half) {
  return { cx, cy, half, mass: 0, comx: 0, comy: 0, children: null, body: null, count: 0 };
}

function insert(cell, b) {
  if (cell.count === 0) {
    cell.body = b;
    cell.count = 1;
    return;
  }
  if (cell.children === null) {
    cell.children = [null, null, null, null];
    const old = cell.body;
    cell.body = null;
    insertChild(cell, old);
  }
  insertChild(cell, b);
  cell.count += 1;
}

function insertChild(cell, b) {
  const q = (b.x >= cell.cx ? 1 : 0) | (b.y >= cell.cy ? 2 : 0);
  if (cell.children[q] === null) {
    const h = cell.half / 2;
    cell.children[q] = makeCell(cell.cx + (q & 1 ? h : -h), cell.cy + (q & 2 ? h : -h), h);
  }
  insert(cell.children[q], b);
}

function finalize(cell) {
  if (cell.children === null) {
    cell.mass = cell.body.m;
    cell.comx = cell.body.x;
    cell.comy = cell.body.y;
    return;
  }
  let m = 0;
  let sx = 0;
  let sy = 0;
  for (const ch of cell.children) {
    if (!ch) continue;
    finalize(ch);
    m += ch.mass;
    sx += ch.mass * ch.comx;
    sy += ch.mass * ch.comy;
  }
  cell.mass = m;
  cell.comx = sx / m;
  cell.comy = sy / m;
}

function pair(x, y, sx, sy, m) {
  const dx = sx - x;
  const dy = sy - y;
  const r2 = dx * dx + dy * dy + EPS * EPS;
  const inv = m / (r2 * Math.sqrt(r2));
  return [dx * inv, dy * inv];
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const clumps = 3 + Math.floor(rand() * 3);
  const centers = Array.from({ length: clumps }, () => [0.2 + rand() * 0.6, 0.2 + rand() * 0.6]);
  const bodies = [];
  for (let i = 0; i < N; i++) {
    const c = centers[i % clumps];
    bodies.push({ x: Math.min(0.999, Math.max(0.001, c[0] + gauss(rand) * 0.07)), y: Math.min(0.999, Math.max(0.001, c[1] + gauss(rand) * 0.07)), m: 1 / N });
  }
  const root = makeCell(0.5, 0.5, 0.5);
  for (const b of bodies) insert(root, b);
  finalize(root);
  return { bodies, root, current: -1, accepted: [], opened: [], direct: null, tree: null, interactions: 0, error: 0, errors: [], counts: [], done: false };
}

export function forceOn(sc, b) {
  const accepted = [];
  const opened = [];
  let fx = 0;
  let fy = 0;
  let count = 0;
  const walk = (cell) => {
    if (cell.children === null) {
      if (cell.body === b) return;
      const [px, py] = pair(b.x, b.y, cell.comx, cell.comy, cell.mass);
      fx += px;
      fy += py;
      count += 1;
      return;
    }
    const dx = cell.comx - b.x;
    const dy = cell.comy - b.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0 && (2 * cell.half) / dist < THETA) {
      accepted.push(cell);
      const [px, py] = pair(b.x, b.y, cell.comx, cell.comy, cell.mass);
      fx += px;
      fy += py;
      count += 1;
      return;
    }
    opened.push(cell);
    for (const ch of cell.children) if (ch) walk(ch);
  };
  walk(sc.root);
  let dx = 0;
  let dy = 0;
  for (const o of sc.bodies) {
    if (o === b) continue;
    const [px, py] = pair(b.x, b.y, o.x, o.y, o.m);
    dx += px;
    dy += py;
  }
  const err = Math.hypot(fx - dx, fy - dy) / Math.hypot(dx, dy);
  return { tree: [fx, fy], direct: [dx, dy], count, accepted, opened, err };
}

export function sceneTick(sc) {
  if (sc.done) return true;
  sc.current += 1;
  if (sc.current >= 40) {
    sc.done = true;
    return true;
  }
  const b = sc.bodies[(sc.current * 5) % N];
  const r = forceOn(sc, b);
  sc.accepted = r.accepted;
  sc.opened = r.opened;
  sc.tree = r.tree;
  sc.direct = r.direct;
  sc.interactions = r.count;
  sc.error = r.err;
  sc.errors.push(r.err);
  sc.counts.push(r.count);
  return false;
}

export default function BarnesHutViz() {
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
      stepMs: 500,
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
        const warn = css.getPropertyValue('--warn').trim() || '#e2606c';
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';
        const ink = css.getPropertyValue('--ink').trim() || '#e9edf6';
        const sc = s.scene;
        const ox = 20;
        const oy = 36;
        const size = 248;
        const X = (v) => ox + v * size;
        const Y = (v) => oy + v * size;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText(`${N} bodies in a quadtree; per tick, the force on one body by direct summation and by the tree at theta ${THETA}`, 12, 18);
        ctx.strokeStyle = `${dim}44`;
        ctx.strokeRect(ox, oy, size, size);
        for (const c of sc.opened) {
          ctx.strokeStyle = `${dim}33`;
          ctx.strokeRect(X(c.cx - c.half), Y(c.cy - c.half), 2 * c.half * size, 2 * c.half * size);
        }
        for (const c of sc.accepted) {
          ctx.fillStyle = `${heur}22`;
          ctx.fillRect(X(c.cx - c.half), Y(c.cy - c.half), 2 * c.half * size, 2 * c.half * size);
          ctx.strokeStyle = heur;
          ctx.strokeRect(X(c.cx - c.half), Y(c.cy - c.half), 2 * c.half * size, 2 * c.half * size);
          ctx.fillStyle = heur;
          ctx.beginPath();
          ctx.arc(X(c.comx), Y(c.comy), 2 + Math.sqrt(c.count), 0, Math.PI * 2);
          ctx.fill();
        }
        for (const b of sc.bodies) {
          ctx.fillStyle = `${algo}aa`;
          ctx.beginPath();
          ctx.arc(X(b.x), Y(b.y), 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
        if (sc.current >= 0 && sc.tree) {
          const b = sc.bodies[(sc.current * 5) % N];
          ctx.fillStyle = ink;
          ctx.beginPath();
          ctx.arc(X(b.x), Y(b.y), 4, 0, Math.PI * 2);
          ctx.fill();
          const scale = 0.06 / Math.max(1e-9, Math.hypot(sc.direct[0], sc.direct[1]));
          const arrow = (f, color, w) => {
            ctx.strokeStyle = color;
            ctx.lineWidth = w;
            ctx.beginPath();
            ctx.moveTo(X(b.x), Y(b.y));
            ctx.lineTo(X(b.x + f[0] * scale), Y(b.y + f[1] * scale));
            ctx.stroke();
            ctx.lineWidth = 1;
          };
          arrow(sc.direct, good, 3);
          arrow(sc.tree, warn, 1.5);
        }
        const tx = 290;
        ctx.fillStyle = heur;
        ctx.fillText('amber: cells accepted as one point mass', tx, 50);
        ctx.fillStyle = dim;
        ctx.fillText('faint: cells that had to be opened', tx, 68);
        ctx.fillStyle = good;
        ctx.fillText('green arrow: direct force over 199 bodies', tx, 86);
        ctx.fillStyle = warn;
        ctx.fillText('red arrow: the tree’s force', tx, 104);
        if (sc.current >= 0) {
          ctx.fillStyle = ink;
          ctx.fillText(`this body: ${sc.interactions} interactions instead of ${N - 1}`, tx, 136);
          ctx.fillText(`relative force error ${(sc.error * 100).toFixed(2)}%`, tx, 154);
          const meanCount = sc.counts.reduce((a, b) => a + b, 0) / sc.counts.length;
          const sorted = sc.errors.slice().sort((a, b) => a - b);
          ctx.fillStyle = dim;
          ctx.fillText(`so far: mean ${meanCount.toFixed(0)} interactions, median error ${(sorted[Math.floor(sorted.length / 2)] * 100).toFixed(2)}%, worst ${(sorted[sorted.length - 1] * 100).toFixed(2)}%`, tx, 172);
        }
        ctx.fillStyle = dim;
        ctx.fillText('the file, 3-D, 1,000 bodies: theta 0.5 median error', tx, 206);
        ctx.fillText('6.0e-3, worst 5.2e-2; N = 2,000: 539,758', tx, 222);
        ctx.fillText('interactions vs 3,998,000 direct', tx, 238);
        let line;
        if (s.done) {
          const meanCount = sc.counts.reduce((a, b) => a + b, 0) / sc.counts.length;
          const sorted = sc.errors.slice().sort((a, b) => a - b);
          line = `${sc.counts.length} bodies sampled: ${meanCount.toFixed(0)} interactions each instead of ${N - 1}, median relative error ${(sorted[Math.floor(sorted.length / 2)] * 100).toFixed(2)}%, worst ${(sorted[sorted.length - 1] * 100).toFixed(2)}%`;
          ctx.fillStyle = good;
        } else {
          line = sc.current >= 0 ? `body ${sc.current + 1} of 40: far clumps collapse to their centers of mass; nearby cells open down to single bodies` : 'building the tree';
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
          new cluster
        </button>
        <span className="viz-stat">{snap.line || 'building…'}</span>
      </div>
    </>
  );
}
