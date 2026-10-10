import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Grid search against random search on the same hidden objective (the
// solution file's f2: strong in x, a peak of width 0.12 at 0.37, weak in y),
// one trial per tick in each panel. A k x k grid (k seeded 3 to 7) tries k
// distinct x values; k^2 uniform draws try k^2. Invariant: equal trial
// counts, every trial in the unit square, best-so-far never falls, the grid
// never exceeds k distinct x, and the final bests equal an independent recount.
const W = 640;
const H = 300;
const SEED = 20261010;
const X_STAR = 0.37;

export function objective(x, y) {
  return Math.exp(-(((x - X_STAR) / 0.12) ** 2)) + 0.08 * Math.exp(-(((y - 0.62) / 0.3) ** 2));
}

const F_MAX = objective(X_STAR, 0.62);

function distinctX(points) {
  return new Set(points.map((p) => p[0])).size;
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const k = 3 + Math.floor(rand() * 5);
  const n = k * k;
  return { rand, k, n, t: 0, grid: [], random: [], gridBest: -1, randomBest: -1, gridBestPt: null, randomBestPt: null, done: false, ok: true, last: `budget ${n} trials each: a ${k} x ${k} grid against ${n} uniform draws` };
}

export function sceneTick(sc) {
  if (sc.done) return true;
  if (sc.t >= sc.n) {
    const gb = Math.max(...sc.grid.map((p) => objective(p[0], p[1])));
    const rb = Math.max(...sc.random.map((p) => objective(p[0], p[1])));
    sc.ok = sc.ok && Math.abs(gb - sc.gridBest) < 1e-12 && Math.abs(rb - sc.randomBest) < 1e-12
      && distinctX(sc.grid) === sc.k && distinctX(sc.random) === sc.n;
    sc.done = true;
    sc.last = `done, ${sc.n} trials each: grid ${(sc.gridBest / F_MAX).toFixed(3)} of the optimum (${sc.k} distinct x), random ${(sc.randomBest / F_MAX).toFixed(3)} (${sc.n}); recount agrees: ${sc.ok ? 'yes' : 'NO'}`;
    return true;
  }
  const k = sc.k;
  const g = [(sc.t % k) / (k - 1), Math.floor(sc.t / k) / (k - 1)];
  const r = [sc.rand(), sc.rand()];
  sc.grid.push(g);
  sc.random.push(r);
  const gv = objective(g[0], g[1]);
  const rv = objective(r[0], r[1]);
  const prevG = sc.gridBest;
  const prevR = sc.randomBest;
  if (gv > sc.gridBest) {
    sc.gridBest = gv;
    sc.gridBestPt = g;
  }
  if (rv > sc.randomBest) {
    sc.randomBest = rv;
    sc.randomBestPt = r;
  }
  sc.t += 1;
  const inside = (p) => p[0] >= 0 && p[0] <= 1 && p[1] >= 0 && p[1] <= 1;
  sc.ok = sc.ok && inside(g) && inside(r) && sc.gridBest >= prevG && sc.randomBest >= prevR
    && sc.grid.length === sc.random.length && sc.grid.length === sc.t && distinctX(sc.grid) <= k;
  sc.last = `trial ${sc.t} of ${sc.n}: grid best ${(sc.gridBest / F_MAX).toFixed(3)} (${distinctX(sc.grid)} distinct x), random ${(sc.randomBest / F_MAX).toFixed(3)} (${distinctX(sc.random)})`;
  return false;
}

export default function RandomSearchViz() {
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
      stepMs: 400,
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
        const SIZE = 190;
        const Y0 = 58;
        const panels = [
          { x0: 36, label: `grid search: ${sc.k} x ${sc.k} = ${sc.n} trials`, pts: sc.grid, best: sc.gridBest, bestPt: sc.gridBestPt, color: dim, square: true },
          { x0: 338, label: `random search: ${sc.n} uniform draws`, pts: sc.random, best: sc.randomBest, bestPt: sc.randomBestPt, color: algo, square: false },
        ];
        for (const p of panels) {
          ctx.strokeStyle = `${dim}88`;
          ctx.strokeRect(p.x0, Y0, SIZE, SIZE);
          ctx.fillStyle = `${good}22`;
          ctx.fillRect(p.x0 + (X_STAR - 0.12) * SIZE, Y0, 0.24 * SIZE, SIZE);
          ctx.fillStyle = p.square ? `${dim}cc` : heur;
          for (const q of p.pts) ctx.fillRect(p.x0 + q[0] * SIZE - 0.5, Y0 - 8, 1.5, 6);
          ctx.fillStyle = dim;
          ctx.fillText(p.label, p.x0, 16);
          ctx.fillStyle = p.color;
          for (const q of p.pts) {
            const px = p.x0 + q[0] * SIZE;
            const py = Y0 + SIZE - q[1] * SIZE;
            if (p.square) ctx.fillRect(px - 2.5, py - 2.5, 5, 5);
            else {
              ctx.beginPath();
              ctx.arc(px, py, 3, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          if (p.bestPt) {
            ctx.strokeStyle = good;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(p.x0 + p.bestPt[0] * SIZE, Y0 + SIZE - p.bestPt[1] * SIZE, 7, 0, Math.PI * 2);
            ctx.stroke();
            ctx.lineWidth = 1;
          }
          ctx.fillStyle = good;
          ctx.fillText(`best ${p.best < 0 ? '-' : (p.best / F_MAX).toFixed(3)} of the optimum`, p.x0, Y0 + SIZE + 16);
          ctx.fillStyle = dim;
          ctx.fillText(`${distinctX(p.pts)} distinct x values tried`, p.x0, Y0 + SIZE + 30);
        }
        ctx.fillStyle = dim;
        ctx.fillText('x matters (green band: the peak at 0.37); y barely does; ticks: x values tried', 36, 44);
        ctx.fillStyle = sc.ok ? good : warn;
        ctx.fillText(sc.ok ? 'invariant holds' : 'INVARIANT BROKEN', 250, Y0 + SIZE + 30);
        const line = sc.last;
        ctx.fillStyle = s.done ? (sc.ok ? good : warn) : ink;
        ctx.fillText(line.length > 100 ? `${line.slice(0, 99)}…` : line, 12, H - 6);
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
          new budget
        </button>
        <span className="viz-stat">{snap.line || 'sampling…'}</span>
      </div>
    </>
  );
}
