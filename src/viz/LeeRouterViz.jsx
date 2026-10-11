import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Lee's wave on a seeded grid with obstacles and one wall: one breadth-first
// wave per tick labels every newly reached cell with its distance, until the
// target is reached; then the retrace walks back one cell per tick through
// labels D-1, D-2, ... The invariant checked on every tick is that every
// label equals the true distance from an independent breadth-first search
// run once at scene creation, and at the end that the path length equals the
// target's label. The A* expansion count for the same net is shown beside.
const W = 640;
const H = 300;
const SEED = 20261010;
const COLS = 36;
const ROWS = 14;
const CELL = 16;
const X0 = 32;
const Y0 = 30;
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

const key = (r, c) => r * COLS + c;

function bfs(blocked, start) {
  const dist = new Map([[start, 0]]);
  const queue = [start];
  for (let i = 0; i < queue.length; i += 1) {
    const cur = queue[i];
    const r = Math.floor(cur / COLS);
    const c = cur % COLS;
    for (const [dr, dc] of DIRS) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
      const q = key(nr, nc);
      if (blocked.has(q) || dist.has(q)) continue;
      dist.set(q, dist.get(cur) + 1);
      queue.push(q);
    }
  }
  return dist;
}

function astarExpansions(blocked, src, dst) {
  const h = (k) => Math.abs(Math.floor(k / COLS) - Math.floor(dst / COLS)) + Math.abs((k % COLS) - (dst % COLS));
  const g = new Map([[src, 0]]);
  const closed = new Set();
  const open = [[h(src), src]];
  let expansions = 0;
  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i += 1) if (open[i][0] < open[bi][0]) bi = i;
    const [, cur] = open.splice(bi, 1)[0];
    if (closed.has(cur)) continue;
    closed.add(cur);
    expansions += 1;
    if (cur === dst) break;
    const r = Math.floor(cur / COLS);
    const c = cur % COLS;
    for (const [dr, dc] of DIRS) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
      const q = key(nr, nc);
      if (blocked.has(q)) continue;
      const ng = g.get(cur) + 1;
      if (ng < (g.has(q) ? g.get(q) : Infinity)) {
        g.set(q, ng);
        open.push([ng + h(q), q]);
      }
    }
  }
  return expansions;
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const blocked = new Set();
    for (let r = 0; r < ROWS; r += 1) for (let c = 0; c < COLS; c += 1) if (rand() < 0.2) blocked.add(key(r, c));
    const wallCol = 8 + Math.floor(rand() * (COLS - 16));
    const gap = Math.floor(rand() * ROWS);
    for (let r = 0; r < ROWS; r += 1) if (r !== gap) blocked.add(key(r, wallCol));
    const free = [];
    for (let k = 0; k < ROWS * COLS; k += 1) if (!blocked.has(k)) free.push(k);
    const src = free[Math.floor(rand() * free.length)];
    const dist = bfs(blocked, src);
    const far = [...dist.entries()].filter(([, d]) => d >= COLS).map(([k]) => k);
    if (far.length === 0) continue;
    const dst = far[Math.floor(rand() * far.length)];
    return {
      blocked, src, dst, dist, label: new Map([[src, 0]]), frontier: [src], d: 0, phase: 'wave', path: [dst],
      astar: astarExpansions(blocked, src, dst), ok: true, done: false,
      last: `wave 0: source labeled; target ${dist.get(dst)} steps away by the independent search`,
    };
  }
  throw new Error('no routable scene');
}

export function sceneTick(sc) {
  if (sc.done) return true;
  if (sc.phase === 'wave') {
    sc.d += 1;
    const nxt = [];
    for (const cur of sc.frontier) {
      const r = Math.floor(cur / COLS);
      const c = cur % COLS;
      for (const [dr, dc] of DIRS) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
        const q = key(nr, nc);
        if (sc.blocked.has(q) || sc.label.has(q)) continue;
        sc.label.set(q, sc.d);
        if (sc.dist.get(q) !== sc.d) sc.ok = false;
        nxt.push(q);
      }
    }
    sc.frontier = nxt;
    if (sc.label.has(sc.dst)) {
      sc.phase = 'retrace';
      sc.last = `wave ${sc.d}: target reached; ${sc.label.size} cells labeled against ${sc.astar} A* expansions; retracing`;
    } else if (nxt.length === 0) {
      sc.ok = false;
      sc.done = true;
      sc.last = 'wave died before the target: INVARIANT BROKEN';
      return true;
    } else {
      sc.last = `wave ${sc.d}: ${nxt.length} cells labeled this step, ${sc.label.size} so far; every label equals the true distance: ${sc.ok ? 'yes' : 'NO'}`;
    }
    return false;
  }
  const cur = sc.path[sc.path.length - 1];
  if (cur === sc.src) {
    const len = sc.path.length - 1;
    sc.ok = sc.ok && len === sc.label.get(sc.dst) && len === sc.dist.get(sc.dst);
    sc.done = true;
    sc.last = `done: path of ${len} steps equals the target label and the independent shortest distance; ${sc.label.size} cells labeled against ${sc.astar} A* expansions; invariant held: ${sc.ok ? 'yes' : 'NO'}`;
    return true;
  }
  const r = Math.floor(cur / COLS);
  const c = cur % COLS;
  let next = null;
  for (const [dr, dc] of DIRS) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
    const q = key(nr, nc);
    if (sc.label.get(q) === sc.label.get(cur) - 1) { next = q; break; }
  }
  if (next === null) {
    sc.ok = false;
    sc.done = true;
    sc.last = 'retrace found no predecessor: INVARIANT BROKEN';
    return true;
  }
  sc.path.push(next);
  sc.last = `retrace: at label ${sc.label.get(next)}, ${sc.path.length - 1} steps walked back`;
  return false;
}

export default function LeeRouterViz() {
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
      stepMs: 220,
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
        const algo = css.getPropertyValue('--algo').trim() || '#5da2ff';
        const heur = css.getPropertyValue('--heur').trim() || '#f0b94b';
        const good = css.getPropertyValue('--path').trim() || '#62d98a';
        const warn = css.getPropertyValue('--warn').trim() || '#e2606c';
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';
        const ink = css.getPropertyValue('--ink').trim() || '#e9edf6';
        const sc = s.scene;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText('one breadth-first wave per tick labels cells with their distance (blue, newest in amber); the retrace walks the labels back (green)', 12, 18);
        const onPath = new Set(sc.phase === 'wave' ? [] : sc.path);
        for (let r = 0; r < ROWS; r += 1) {
          for (let c = 0; c < COLS; c += 1) {
            const k = key(r, c);
            const x = X0 + c * CELL;
            const y = Y0 + r * CELL;
            if (sc.blocked.has(k)) {
              ctx.fillStyle = `${dim}55`;
              ctx.fillRect(x, y, CELL - 1, CELL - 1);
            } else if (sc.label.has(k)) {
              const isNew = sc.phase === 'wave' && sc.label.get(k) === sc.d;
              const t = sc.label.get(k) / Math.max(sc.d, 1);
              ctx.fillStyle = onPath.has(k) ? good : isNew ? heur : algo;
              ctx.globalAlpha = onPath.has(k) ? 0.95 : isNew ? 0.95 : 0.25 + 0.55 * t;
              ctx.fillRect(x, y, CELL - 1, CELL - 1);
              ctx.globalAlpha = 1;
            } else {
              ctx.strokeStyle = `${dim}33`;
              ctx.strokeRect(x + 0.5, y + 0.5, CELL - 2, CELL - 2);
            }
          }
        }
        const mark = (k, color, text) => {
          const x = X0 + (k % COLS) * CELL;
          const y = Y0 + Math.floor(k / COLS) * CELL;
          ctx.fillStyle = color;
          ctx.fillRect(x + 3, y + 3, CELL - 7, CELL - 7);
          ctx.fillStyle = '#0b1020';
          ctx.font = '9px ui-monospace, monospace';
          ctx.fillText(text, x + 4, y + 11);
          ctx.font = '11px ui-monospace, monospace';
        };
        mark(sc.src, ink, 'S');
        mark(sc.dst, sc.label.has(sc.dst) ? good : warn, 'T');
        ctx.fillStyle = dim;
        ctx.fillText(`labeled ${sc.label.size} of ${ROWS * COLS - sc.blocked.size} free cells; A* would expand ${sc.astar}; the file: 935 against 338 per net on 60 x 60 grids`, 12, 268);
        ctx.fillStyle = sc.ok ? good : warn;
        ctx.fillText(sc.ok ? 'invariant: every label equals the independent breadth-first distance' : 'INVARIANT BROKEN', 12, 282);
        const line = sc.last;
        ctx.fillStyle = s.done ? (sc.ok ? good : warn) : ink;
        ctx.fillText(line.length > 96 ? `${line.slice(0, 95)}…` : line, 12, H - 4);
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
          new maze
        </button>
        <span className="viz-stat">{snap.line || 'expanding…'}</span>
      </div>
    </>
  );
}
