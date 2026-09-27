import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// A noisy track of 160 points simplified one split per tick. The
// current chord is amber; the point of maximum deviation is measured
// (dashed) and, if it exceeds the tolerance band, becomes a vertex
// (blue) and the chord splits in two. Chords whose farthest point is
// inside the band are settled (green). The counter tracks vertices
// kept and the true maximum error, recomputed against every point.
const W = 640;
const H = 300;
const SEED = 20260926;
const N = 160;
const EPS = 6;

function gauss(rand) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function perp(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const L2 = dx * dx + dy * dy;
  if (L2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const pts = [];
  const f1 = 1.5 + rand() * 2;
  const f2 = 4 + rand() * 4;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const x = 30 + t * 580;
    const y = 150 + 60 * Math.sin(f1 * Math.PI * t) + 25 * Math.sin(f2 * Math.PI * t + 1) + gauss(rand) * 2.5;
    pts.push([x, y]);
  }
  const keep = new Array(N).fill(false);
  keep[0] = keep[N - 1] = true;
  return { pts, keep, stack: [[0, N - 1]], settled: [], current: null, farthest: null, done: false, evals: 0 };
}

export function sceneTick(sc) {
  if (sc.done) return true;
  if (sc.stack.length === 0) {
    sc.done = true;
    sc.current = null;
    return true;
  }
  const [i, j] = sc.stack.pop();
  let best = -1;
  let bestK = null;
  for (let k = i + 1; k < j; k++) {
    sc.evals += 1;
    const d = perp(sc.pts[k], sc.pts[i], sc.pts[j]);
    if (d > best) {
      best = d;
      bestK = k;
    }
  }
  sc.current = [i, j];
  sc.farthest = bestK === null ? null : { k: bestK, d: best };
  if (bestK !== null && best > EPS) {
    sc.keep[bestK] = true;
    sc.stack.push([i, bestK]);
    sc.stack.push([bestK, j]);
  } else sc.settled.push([i, j]);
  return false;
}

export function maxError(sc) {
  const kept = [];
  for (let k = 0; k < N; k++) if (sc.keep[k]) kept.push(k);
  let worst = 0;
  let seg = 0;
  for (let k = 0; k < N; k++) {
    while (seg + 1 < kept.length - 1 && kept[seg + 1] <= k) seg += 1;
    worst = Math.max(worst, perp(sc.pts[k], sc.pts[kept[seg]], sc.pts[kept[seg + 1]]));
  }
  return { worst, count: kept.length };
}

export default function DouglasPeuckerViz() {
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
      stepMs: 320,
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
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText(`${N}-point track, tolerance ${EPS} px; one chord examined per tick: split at the farthest point, or settle`, 12, 18);
        // original track
        ctx.strokeStyle = `${dim}66`;
        ctx.beginPath();
        sc.pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
        ctx.stroke();
        // settled chords
        ctx.strokeStyle = good;
        ctx.lineWidth = 2;
        for (const [i, j] of sc.settled) {
          ctx.beginPath();
          ctx.moveTo(sc.pts[i][0], sc.pts[i][1]);
          ctx.lineTo(sc.pts[j][0], sc.pts[j][1]);
          ctx.stroke();
        }
        ctx.lineWidth = 1;
        // pending chords
        ctx.strokeStyle = `${algo}77`;
        for (const [i, j] of sc.stack) {
          ctx.beginPath();
          ctx.moveTo(sc.pts[i][0], sc.pts[i][1]);
          ctx.lineTo(sc.pts[j][0], sc.pts[j][1]);
          ctx.stroke();
        }
        // current chord and its band
        if (sc.current && !s.done) {
          const [i, j] = sc.current;
          const a = sc.pts[i];
          const b = sc.pts[j];
          const dx = b[0] - a[0];
          const dy = b[1] - a[1];
          const L = Math.hypot(dx, dy) || 1;
          const nx = (-dy / L) * EPS;
          const ny = (dx / L) * EPS;
          ctx.fillStyle = `${heur}22`;
          ctx.beginPath();
          ctx.moveTo(a[0] + nx, a[1] + ny);
          ctx.lineTo(b[0] + nx, b[1] + ny);
          ctx.lineTo(b[0] - nx, b[1] - ny);
          ctx.lineTo(a[0] - nx, a[1] - ny);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = heur;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(a[0], a[1]);
          ctx.lineTo(b[0], b[1]);
          ctx.stroke();
          ctx.lineWidth = 1;
          if (sc.farthest) {
            const p = sc.pts[sc.farthest.k];
            ctx.strokeStyle = sc.farthest.d > EPS ? algo : good;
            ctx.setLineDash([3, 3]);
            const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (L * L)));
            ctx.beginPath();
            ctx.moveTo(p[0], p[1]);
            ctx.lineTo(a[0] + t * dx, a[1] + t * dy);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
        // kept vertices
        for (let k = 0; k < N; k++) {
          if (!sc.keep[k]) continue;
          ctx.fillStyle = algo;
          ctx.beginPath();
          ctx.arc(sc.pts[k][0], sc.pts[k][1], 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
        const { worst, count } = maxError(sc);
        ctx.fillStyle = dim;
        ctx.fillText(`vertices kept ${count} of ${N}; max error of every original point ${worst.toFixed(1)} px; distance evaluations ${sc.evals}`, 12, 270);
        let line;
        if (s.done) {
          line = `done: ${count} vertices keep every point within ${worst.toFixed(1)} px (tolerance ${EPS}); ${sc.evals} evaluations for ${N} points`;
          ctx.fillStyle = good;
        } else if (sc.farthest) {
          line = sc.farthest.d > EPS ? `farthest point ${sc.farthest.d.toFixed(1)} px off the chord: outside the band, so it becomes a vertex and the chord splits` : `farthest point ${sc.farthest.d.toFixed(1)} px: inside the band, so every interior point of this chord is dropped`;
          ctx.fillStyle = ink;
        } else {
          line = 'starting from the two endpoints';
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
          new track
        </button>
        <span className="viz-stat">{snap.line || 'simplifying…'}</span>
      </div>
    </>
  );
}
