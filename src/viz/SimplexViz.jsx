import DiagramViewport from '../components/DiagramViewport.jsx';
import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// The climb, in two dimensions. A random polytope (intersection of half-
// planes), the objective as an amber arrow, and the walk: from the starting
// vertex, each pivot moves along the improving edge Dantzig's rule picks,
// leaving a green trail, until no edge improves and the optimum is held.
// Contour lines of the objective sweep the polygon so "uphill" is visible.
const W = 640;
const H = 300;
const SEED = 20260827;
const TICKS_PER_PIVOT = 26;

function makeScene(seed) {
  const rand = mulberry32(seed);
  const bounds = [8 + 3 * rand(), 6 + 2 * rand()];
  const constraints = [[1, 0, bounds[0]], [0, 1, bounds[1]]];
  for (let i = 0; i < 6; i++) {
    const a = 0.15 + rand();
    const b = 0.15 + rand();
    constraints.push([a, b, (a * bounds[0] + b * bounds[1]) * (0.5 + 0.35 * rand())]);
  }
  // Intersect half-planes, so every displayed edge belongs to a convex LP.
  let polygon = [[0, 0], [bounds[0], 0], bounds.slice(), [0, bounds[1]]];
  for (const [a, b, limit] of constraints) {
    const clipped = [];
    for (let i = 0; i < polygon.length; i++) {
      const p = polygon[i];
      const q = polygon[(i + 1) % polygon.length];
      const dp = a * p[0] + b * p[1] - limit;
      const dq = a * q[0] + b * q[1] - limit;
      if (dp <= 1e-9) clipped.push(p);
      if ((dp < -1e-9 && dq > 1e-9) || (dp > 1e-9 && dq < -1e-9)) {
        const t = dp / (dp - dq);
        clipped.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
      }
    }
    polygon = clipped;
  }
  const objective = [0.5 + 2 * rand(), 0.5 + 2 * rand()];
  const m = constraints.length;
  const tableau = constraints.map(([a, b, limit], i) =>
    [a, b, ...Array.from({ length: m }, (_, j) => Number(i === j)), limit]);
  const reduced = [-objective[0], -objective[1], ...Array(m + 1).fill(0)];
  const basis = Array.from({ length: m }, (_, i) => i + 2);
  const points = [[0, 0]];
  const pivots = [];
  // Actual Dantzig pivots: most negative reduced cost, then minimum ratio.
  for (let guard = 0; guard < 30; guard++) {
    let enter = -1;
    for (let j = 0; j < m + 2; j++) {
      if (reduced[j] < -1e-9 && (enter < 0 || reduced[j] < reduced[enter])) enter = j;
    }
    if (enter < 0) break;
    let leave = -1;
    for (let i = 0; i < m; i++) {
      if (tableau[i][enter] > 1e-9 && (leave < 0
        || tableau[i].at(-1) / tableau[i][enter] < tableau[leave].at(-1) / tableau[leave][enter])) leave = i;
    }
    if (leave < 0) throw new Error('The bounded visualization LP became unbounded');
    const rates = reduced.slice(0, m + 2);
    const pivot = tableau[leave][enter];
    tableau[leave] = tableau[leave].map((value) => value / pivot);
    for (let i = 0; i < m; i++) {
      if (i === leave) continue;
      const factor = tableau[i][enter];
      tableau[i] = tableau[i].map((value, j) => value - factor * tableau[leave][j]);
    }
    const factor = reduced[enter];
    for (let j = 0; j < reduced.length; j++) reduced[j] -= factor * tableau[leave][j];
    basis[leave] = enter;
    const point = [0, 0];
    basis.forEach((variable, i) => { if (variable < 2) point[variable] = tableau[i].at(-1); });
    points.push(point);
    pivots.push({ enter, rates });
  }
  const sx = 390 / bounds[0];
  const sy = 200 / bounds[1];
  const toCanvas = ([x, y]) => [100 + x * sx, 260 - y * sy];
  const verts = polygon.map(toCanvas);
  const path = points.map((point) => {
    let nearest = 0;
    for (let i = 1; i < polygon.length; i++) {
      if (Math.hypot(polygon[i][0] - point[0], polygon[i][1] - point[1])
        < Math.hypot(polygon[nearest][0] - point[0], polygon[nearest][1] - point[1])) nearest = i;
    }
    return nearest;
  });
  const norm = Math.hypot(objective[0] / sx, objective[1] / sy);
  const obj = [objective[0] / sx / norm, -objective[1] / sy / norm];
  const score = ([x, y]) => x * obj[0] + y * obj[1];
  return { verts, obj, path, score, polygon, constraints, objective, points, pivots };
}

export default function SimplexViz() {
  const canvasRef = useRef(null);
  const cycle = useRef(0);
  const statsRef = useRef({ pivot: 0, total: 0, done: false });
  const [restart, setRestart] = useState(0);
  const [snap, setSnap] = useState({ pivot: 0, total: 0, done: false });

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
        scene: makeScene(SEED + cycle.current * 7919),
        tick: 0,
        rest: 0,
        stopAtRest: isStill(),
      }),
      tick: (s) => {
        const total = (s.scene.path.length + 2) * TICKS_PER_PIVOT;
        if (s.tick >= total) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            s.scene = makeScene(SEED + cycle.current * 7919);
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
        const algo = css.getPropertyValue('--algo').trim() || '#5da2ff';
        const heur = css.getPropertyValue('--heur').trim() || '#f0b94b';
        const path = css.getPropertyValue('--path').trim() || '#62d98a';
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';

        const { verts, obj, path: walk, score } = s.scene;
        // Polytope fill + edges.
        ctx.beginPath();
        verts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
        ctx.closePath();
        ctx.fillStyle = 'rgba(93,162,255,0.06)';
        ctx.fill();
        ctx.strokeStyle = `${algo}66`;
        ctx.lineWidth = 1.4;
        ctx.stroke();
        // Objective contours: lines perpendicular to obj sweeping the shape.
        const smin = Math.min(...verts.map(score));
        const smax = Math.max(...verts.map(score));
        ctx.save();
        ctx.beginPath();
        verts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
        ctx.closePath();
        ctx.clip();
        for (let t = 1; t < 7; t++) {
          const sv = smin + ((smax - smin) * t) / 7;
          const px = obj[0] * sv;
          const py = obj[1] * sv;
          ctx.strokeStyle = 'rgba(255,255,255,0.07)';
          ctx.beginPath();
          ctx.moveTo(px - obj[1] * 900, py + obj[0] * 900);
          ctx.lineTo(px + obj[1] * 900, py - obj[0] * 900);
          ctx.stroke();
        }
        ctx.restore();
        // The walk trail.
        const at = Math.min(Math.floor(s.tick / TICKS_PER_PIVOT), walk.length - 1);
        const frac = Math.min((s.tick % TICKS_PER_PIVOT) / (TICKS_PER_PIVOT * 0.7), 1);
        ctx.strokeStyle = path;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        for (let i = 0; i <= at; i++) {
          const [x, y] = verts[walk[i]];
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        if (at + 1 < walk.length) {
          const [x1, y1] = verts[walk[at]];
          const [x2, y2] = verts[walk[at + 1]];
          ctx.lineTo(x1 + (x2 - x1) * frac, y1 + (y2 - y1) * frac);
        }
        ctx.stroke();
        // Vertices.
        verts.forEach(([x, y], i) => {
          const visited = walk.slice(0, at + 1).includes(i);
          ctx.beginPath();
          ctx.arc(x, y, i === walk[walk.length - 1] ? 6.5 : 4.5, 0, Math.PI * 2);
          ctx.fillStyle = i === walk[walk.length - 1] && at >= walk.length - 1 ? heur : visited ? path : '#39435e';
          ctx.fill();
        });
        // Objective arrow.
        ctx.strokeStyle = heur;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(560, 40);
        ctx.lineTo(560 + obj[0] * 34, 40 + obj[1] * 34);
        ctx.stroke();
        ctx.fillStyle = heur;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText('maximize', 520, 24);

        const done = at >= walk.length - 1;
        statsRef.current = { pivot: at, total: walk.length - 1, done };
        ctx.fillStyle = dim;
        ctx.fillText(
          done
            ? `optimum held after ${walk.length - 1} pivots · no edge improves · the dual signs the receipt`
            : `pivot ${at + 1}: taking the steepest improving edge`,
          14,
          H - 12,
        );
      },
    },
    [restart],
  );

  return (
    <>
      <DiagramViewport width={W}>
        <canvas ref={canvasRef} style={{ aspectRatio: `${W} / ${H}` }} aria-hidden="true" />
      </DiagramViewport>
      <div className="viz-controls">
        <button
          type="button"
          className="btn"
          onClick={() => {
            cycle.current += 1;
            setRestart((t) => t + 1);
          }}
        >
          new polytope
        </button>
        <span className="viz-stat">
          {snap.done
            ? <>done in <strong>{snap.total}</strong> pivots · in 12 dimensions an adversary makes this walk 4,095</>
            : 'feeling for the steepest edge in the fog…'}
        </span>
      </div>
    </>
  );
}
