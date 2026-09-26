import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Bowyer-Watson on two dozen random points, one insertion at a time.
// For each new point: the triangles whose circumcircles contain it
// flash red (the cavity), the cavity's boundary is fanned to the point
// in amber, and the mesh settles back to blue. When every point is in,
// the convex hull is drawn in green over the boundary. A second act
// rebuilds the same points with a tight super-triangle and marks the
// hull edges that go missing, the classic trap.
const W = 640;
const H = 300;
const SEED = 20260926;
const N = 24;

function orient(a, b, c) {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function inCircle(a, b, c, d) {
  const adx = a[0] - d[0];
  const ady = a[1] - d[1];
  const bdx = b[0] - d[0];
  const bdy = b[1] - d[1];
  const cdx = c[0] - d[0];
  const cdy = c[1] - d[1];
  return (adx * adx + ady * ady) * (bdx * cdy - cdx * bdy)
    - (bdx * bdx + bdy * bdy) * (adx * cdy - cdx * ady)
    + (cdx * cdx + cdy * cdy) * (adx * bdy - bdx * ady);
}

function ccw(t, pts) {
  const [a, b, c] = t;
  return orient(pts[a], pts[b], pts[c]) > 0 ? t : [a, c, b];
}

const key = (t) => [...t].sort((x, y) => x - y).join(',');

export function bowyerWatson(points, superScale) {
  const n = points.length;
  let lo = Infinity;
  let hi = -Infinity;
  for (const p of points) {
    lo = Math.min(lo, p[0], p[1]);
    hi = Math.max(hi, p[0], p[1]);
  }
  const span = Math.max(hi - lo, 1) * superScale;
  const mid = (lo + hi) / 2;
  const pts = [...points, [mid - 2 * span, mid - span], [mid + 2 * span, mid - span], [mid, mid + 2 * span]];
  const S = new Set([n, n + 1, n + 2]);
  let tris = new Map();
  const t0 = ccw([n, n + 1, n + 2], pts);
  tris.set(key(t0), t0);
  const steps = [];
  let tests = 0;
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const bad = [];
    for (const t of tris.values()) {
      tests += 1;
      if (inCircle(pts[t[0]], pts[t[1]], pts[t[2]], p) > 0) bad.push(t);
    }
    const edgeCount = new Map();
    for (const t of bad) {
      for (const e of [[t[0], t[1]], [t[1], t[2]], [t[2], t[0]]]) {
        const k = e[0] < e[1] ? `${e[0]},${e[1]}` : `${e[1]},${e[0]}`;
        edgeCount.set(k, (edgeCount.get(k) || 0) + 1);
      }
    }
    for (const t of bad) tris.delete(key(t));
    const fan = [];
    for (const t of bad) {
      for (const e of [[t[0], t[1]], [t[1], t[2]], [t[2], t[0]]]) {
        const k = e[0] < e[1] ? `${e[0]},${e[1]}` : `${e[1]},${e[0]}`;
        if (edgeCount.get(k) === 1) {
          const nt = ccw([e[0], e[1], i], pts);
          tris.set(key(nt), nt);
          fan.push(nt);
        }
      }
    }
    const visible = [...tris.values()].filter((t) => !t.some((v) => S.has(v)));
    steps.push({ i, bad: bad.filter((t) => !t.some((v) => S.has(v))), fan: fan.filter((t) => !t.some((v) => S.has(v))), tris: visible, tests });
  }
  const final = [...tris.values()].filter((t) => !t.some((v) => S.has(v)));
  return { steps, tris: final, tests };
}

export function convexHull(points) {
  const idx = [...points.keys()].sort((a, b) => points[a][0] - points[b][0] || points[a][1] - points[b][1]);
  const half = (seq) => {
    const h = [];
    for (const i of seq) {
      while (h.length >= 2 && orient(points[h[h.length - 2]], points[h[h.length - 1]], points[i]) <= 0) h.pop();
      h.push(i);
    }
    return h;
  };
  const lower = half(idx);
  const upper = half([...idx].reverse());
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

function boundaryEdges(tris) {
  const count = new Map();
  for (const t of tris) {
    for (const e of [[t[0], t[1]], [t[1], t[2]], [t[2], t[0]]]) {
      const k = e[0] < e[1] ? `${e[0]},${e[1]}` : `${e[1]},${e[0]}`;
      count.set(k, (count.get(k) || 0) + 1);
    }
  }
  return new Set([...count.entries()].filter(([, c]) => c === 1).map(([k]) => k));
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const points = [];
  while (points.length < N) {
    const p = [30 + rand() * 300, 40 + rand() * 220];
    if (points.every((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) > 18)) points.push(p);
  }
  const good = bowyerWatson(points, 1000);
  const tight = bowyerWatson(points, 1);
  const hull = convexHull(points);
  const hullEdges = new Set(hull.map((v, i) => {
    const w = hull[(i + 1) % hull.length];
    return v < w ? `${v},${w}` : `${w},${v}`;
  }));
  const tightBoundary = boundaryEdges(tight.tris);
  const missing = [...hullEdges].filter((k) => !tightBoundary.has(k));
  return { points, good, tight, hull, hullEdges, missing };
}

const PER_STEP = 10;

export default function BowyerWatsonViz() {
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
      stepMs: 45,
      init: () => ({ scene: makeScene(SEED + cycle.current * 7919), act: 0, tick: 0, actRest: 0, rest: 0, stopAtRest: isStill() }),
      tick: (s) => {
        if (s.act >= 2) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            Object.assign(s, { scene: makeScene(SEED + cycle.current * 7919), act: 0, tick: 0, actRest: 0, rest: 0 });
          }
          return true;
        }
        s.tick += 1;
        const len = s.act === 0 ? N * PER_STEP + 10 : 60;
        if (s.tick >= len) {
          s.tick = len;
          s.actRest += 1;
          if (s.actRest > holdTicks(s)) {
            s.act += 1;
            s.tick = 0;
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
        const pts = sc.points;
        const done = s.act >= 2;
        const act = done ? 1 : s.act;

        const drawTris = (tris, color, width, dash) => {
          ctx.strokeStyle = color;
          ctx.lineWidth = width;
          ctx.setLineDash(dash || []);
          ctx.beginPath();
          for (const t of tris) {
            ctx.moveTo(pts[t[0]][0], pts[t[0]][1]);
            ctx.lineTo(pts[t[1]][0], pts[t[1]][1]);
            ctx.lineTo(pts[t[2]][0], pts[t[2]][1]);
            ctx.closePath();
          }
          ctx.stroke();
          ctx.setLineDash([]);
        };
        const drawHull = (color, dash) => {
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.setLineDash(dash || []);
          ctx.beginPath();
          sc.hull.forEach((v, i) => {
            if (i === 0) ctx.moveTo(pts[v][0], pts[v][1]);
            else ctx.lineTo(pts[v][0], pts[v][1]);
          });
          ctx.closePath();
          ctx.stroke();
          ctx.setLineDash([]);
        };

        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        let line;
        let shown = 0;
        if (act === 0) {
          const stepIdx = Math.min(N - 1, Math.floor(s.tick / PER_STEP));
          const phase = s.tick - stepIdx * PER_STEP;
          const finished = s.tick >= N * PER_STEP;
          const step = sc.good.steps[stepIdx];
          const prev = stepIdx > 0 ? sc.good.steps[stepIdx - 1].tris : [];
          ctx.fillText(`act 1 · insert point ${Math.min(N, stepIdx + 1)} of ${N}: bad triangles (red) make a cavity, its rim fans to the point (amber)`, 14, 18);
          if (finished) {
            drawTris(sc.good.tris, `${algo}AA`, 1.2);
            drawHull(good);
            shown = N;
            line = `${sc.good.tris.length} triangles, every circumcircle empty; the boundary is the convex hull (green); ${sc.good.tests.toLocaleString()} in-circle tests`;
          } else if (phase < 4) {
            drawTris(prev, `${algo}AA`, 1.2);
            drawTris(step.bad, warn, 2.2);
            shown = stepIdx;
            line = `${step.bad.length} triangle${step.bad.length === 1 ? '' : 's'} hold the new point inside their circumcircle: delete them`;
          } else if (phase < 8) {
            drawTris(step.tris.filter((t) => !step.fan.includes(t)), `${algo}AA`, 1.2);
            drawTris(step.fan, heur, 2.2);
            shown = stepIdx + 1;
            line = `fan the cavity rim to the point: ${step.fan.length} new triangles, each Delaunay by construction`;
          } else {
            drawTris(step.tris, `${algo}AA`, 1.2);
            shown = stepIdx + 1;
            line = `${step.tris.length} triangles after ${stepIdx + 1} insertions, ${step.tests.toLocaleString()} in-circle tests so far`;
          }
          ctx.fillStyle = act === 0 && !finished && phase < 4 ? warn : phase < 8 && !finished ? heur : good;
        } else {
          ctx.fillText('act 2 · the same points with a tight super-triangle: the fake corners are close enough to steal hull edges', 14, 18);
          drawTris(sc.tight.tris, `${dim}AA`, 1.2);
          drawHull(`${good}66`, [4, 4]);
          ctx.strokeStyle = warn;
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          for (const k of sc.missing) {
            const [a, b] = k.split(',').map(Number);
            ctx.moveTo(pts[a][0], pts[a][1]);
            ctx.lineTo(pts[b][0], pts[b][1]);
          }
          ctx.stroke();
          shown = N;
          line = sc.missing.length
            ? `${sc.missing.length} hull edge${sc.missing.length === 1 ? '' : 's'} missing (red) and ${sc.good.tris.length - sc.tight.tris.length} triangles short: the super-triangle must be far away, or the mesh lies at its edge`
            : 'this seed happened to survive the tight super-triangle: the trap is probabilistic, the fix is a huge triangle';
          ctx.fillStyle = sc.missing.length ? warn : dim;
        }
        for (let i = 0; i < N; i++) {
          ctx.fillStyle = i < shown ? ink : `${dim}55`;
          ctx.beginPath();
          ctx.arc(pts[i][0], pts[i][1], 3, 0, Math.PI * 2);
          ctx.fill();
        }
        const lx = 360;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = ink;
        ctx.fillText(`${N} points · hull ${sc.hull.length}`, lx, 52);
        ctx.fillStyle = dim;
        ctx.fillText(`Euler: 2n - 2 - h = ${2 * N - 2 - sc.hull.length} triangles`, lx, 72);
        ctx.fillStyle = algo;
        ctx.fillText(`far super-triangle: ${sc.good.tris.length} triangles, hull intact`, lx, 100);
        ctx.fillStyle = sc.missing.length ? warn : dim;
        ctx.fillText(`tight super-triangle: ${sc.tight.tris.length} triangles, ${sc.missing.length} hull edges lost`, lx, 120);
        ctx.fillStyle = dim;
        ctx.font = '10px ui-monospace, monospace';
        ctx.fillText('red: circumcircle holds the new point (the cavity)', lx, 148);
        ctx.fillText('amber: the cavity rim fanned to the point', lx, 162);
        ctx.fillText('green: the convex hull, which must be the boundary', lx, 176);
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = ctx.fillStyle === dim ? ink : ctx.fillStyle;
        ctx.fillText(line, 14, H - 8);
        statsRef.current = { line: done ? `${sc.good.tris.length} Delaunay triangles from ${N} points in ${sc.good.tests.toLocaleString()} in-circle tests; the tight super-triangle lost ${sc.missing.length} hull edges` : line };
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
          new points
        </button>
        <span className="viz-stat">{snap.line || 'inserting…'}</span>
      </div>
    </>
  );
}
