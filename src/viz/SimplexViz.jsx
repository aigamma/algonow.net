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
  // Random convex polygon: points on a jittered circle, hull order.
  const k = 7 + Math.floor(rand() * 4);
  const verts = [];
  for (let i = 0; i < k; i++) {
    const a = (i / k) * Math.PI * 2 + rand() * 0.4;
    const r = 90 + rand() * 55;
    verts.push([320 + Math.cos(a) * r * 1.5, 152 + Math.sin(a) * r * 0.75]);
  }
  // Objective direction.
  const th = rand() * Math.PI * 2;
  const obj = [Math.cos(th), Math.sin(th)];
  const score = ([x, y]) => x * obj[0] + y * obj[1];
  // Start at the WORST vertex; walk Dantzig-style: among the two
  // neighboring edges, take the one with the steeper immediate rate.
  let cur = 0;
  for (let i = 1; i < k; i++) if (score(verts[i]) < score(verts[cur])) cur = i;
  const path = [cur];
  for (let steps = 0; steps < k + 2; steps++) {
    const nb = [(cur + 1) % k, (cur + k - 1) % k];
    let best = null;
    let bestRate = 1e-9;
    for (const v of nb) {
      const dx = verts[v][0] - verts[cur][0];
      const dy = verts[v][1] - verts[cur][1];
      const len = Math.hypot(dx, dy);
      const rate = (dx * obj[0] + dy * obj[1]) / len;
      if (rate > bestRate && score(verts[v]) > score(verts[cur])) {
        bestRate = rate;
        best = v;
      }
    }
    if (best === null) break;
    path.push(best);
    cur = best;
  }
  return { verts, obj, path, score };
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
