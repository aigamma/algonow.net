import DiagramViewport from '../components/DiagramViewport.jsx';
import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Uniform sampling, live, on the integral every reader can check: the area
// of a quarter disk inside the unit square, pi / 4. Each tick throws a
// batch of uniform points at the square (blue inside the disk, gray
// outside), updates the estimate and its standard error, and plots the
// realized error against the 1 / sqrt(N) law on log axes. The invariant
// checked every tick is that the estimate stays within four standard
// errors of pi / 4 once a few hundred points are in.
const W = 640;
const H = 300;
const SEED = 20261010;
const BATCH = 60;
const TICKS = 70;
const TRUTH = Math.PI / 4;

export function makeScene(seed) {
  const rand = mulberry32(seed);
  return { rand, n: 0, inside: 0, points: [], curve: [], tick: 0, done: false, ok: true, est: 0, se: 0, last: 'no darts yet; the exact area is pi over four, 0.7854' };
}

export function sceneTick(sc) {
  if (sc.done) return true;
  if (sc.tick >= TICKS) {
    sc.done = true;
    sc.last = `${sc.n.toLocaleString()} darts: ${sc.est.toFixed(4)} ± ${sc.se.toFixed(4)} against pi / 4 = ${TRUTH.toFixed(4)} (${(Math.abs(sc.est - TRUTH) / sc.se).toFixed(1)} standard errors off); the file: 94.3% coverage, slopes near -0.5 in 1 to 10 dimensions`;
    return true;
  }
  for (let i = 0; i < BATCH; i += 1) {
    const x = sc.rand();
    const y = sc.rand();
    const hit = x * x + y * y <= 1;
    sc.inside += hit ? 1 : 0;
    sc.n += 1;
    if (sc.points.length < 1500) sc.points.push([x, y, hit]);
  }
  const p = sc.inside / sc.n;
  sc.est = p;
  sc.se = Math.sqrt(Math.max(p * (1 - p), 1e-12) / sc.n);
  sc.curve.push([sc.n, Math.abs(sc.est - TRUTH), sc.se]);
  if (sc.n >= 300) sc.ok = sc.ok && Math.abs(sc.est - TRUTH) <= 4 * sc.se;
  sc.tick += 1;
  sc.last = `${sc.n.toLocaleString()} darts, ${sc.inside.toLocaleString()} inside: estimate ${sc.est.toFixed(4)} ± ${sc.se.toFixed(4)}; error ${Math.abs(sc.est - TRUTH).toFixed(4)}`;
  return false;
}

export default function MonteCarloIntegrationViz() {
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
      stepMs: 180,
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
        ctx.fillText(`${BATCH} uniform darts/tick; blue: inside the quarter disk; fraction estimates π/4`, 12, 18);
        // left: the square
        const sx = 24;
        const sy = 40;
        const size = 220;
        ctx.strokeStyle = `${dim}88`;
        ctx.strokeRect(sx, sy, size, size);
        ctx.strokeStyle = `${good}aa`;
        ctx.beginPath();
        ctx.arc(sx, sy + size, size, -Math.PI / 2, 0);
        ctx.stroke();
        for (const [x, y, hit] of sc.points) {
          ctx.fillStyle = hit ? `${algo}cc` : `${dim}66`;
          ctx.fillRect(sx + x * size - 1, sy + size - y * size - 1, 2, 2);
        }
        ctx.fillStyle = dim;
        ctx.fillText(`first ${Math.min(sc.points.length, 1500).toLocaleString()} of ${sc.n.toLocaleString()} darts drawn`, sx, sy + size + 16);
        // middle: estimate bar vs truth
        const mx = 290;
        const my = 70;
        ctx.fillStyle = ink;
        ctx.fillText(`estimate ${sc.est.toFixed(4)} ± ${sc.se.toFixed(4)}`, mx, my);
        ctx.fillStyle = good;
        ctx.fillText(`pi / 4 = ${TRUTH.toFixed(4)}`, mx, my + 18);
        const bw = 320;
        const lo = 0.72;
        const hi = 0.85;
        const BX = (v) => mx + ((Math.min(Math.max(v, lo), hi) - lo) / (hi - lo)) * bw;
        ctx.strokeStyle = `${dim}66`;
        ctx.beginPath();
        ctx.moveTo(mx, my + 44);
        ctx.lineTo(mx + bw, my + 44);
        ctx.stroke();
        if (sc.n > 0) {
          ctx.fillStyle = `${algo}55`;
          ctx.fillRect(BX(sc.est - 1.96 * sc.se), my + 34, Math.max(2, BX(sc.est + 1.96 * sc.se) - BX(sc.est - 1.96 * sc.se)), 20);
          ctx.fillStyle = algo;
          ctx.fillRect(BX(sc.est) - 1, my + 32, 3, 24);
        }
        ctx.strokeStyle = good;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(BX(TRUTH), my + 28);
        ctx.lineTo(BX(TRUTH), my + 60);
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.fillStyle = dim;
        ctx.fillText('blue: estimate with its 95% band; green: the truth', mx, my + 76);
        // right-bottom: error vs N, log-log, with 1/sqrt(N)
        const gx = 300;
        const gy = 270;
        const gw = 300;
        const gh = 100;
        const nMax = BATCH * TICKS;
        const X = (n) => gx + ((Math.log10(Math.max(n, BATCH)) - Math.log10(BATCH)) / (Math.log10(nMax) - Math.log10(BATCH))) * gw;
        const Y = (e) => gy - ((Math.log10(Math.max(e, 1e-4)) + 4) / 3.2) * gh;
        ctx.strokeStyle = `${dim}66`;
        ctx.strokeRect(gx, gy - gh, gw, gh);
        ctx.fillStyle = dim;
        ctx.fillText('log-log error; dashed: SE ∝ 1/√N', gx, gy - gh - 6);
        if (sc.curve.length > 1) {
          ctx.strokeStyle = `${heur}cc`;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          sc.curve.forEach(([n, , se], i) => {
            if (i === 0) ctx.moveTo(X(n), Y(se));
            else ctx.lineTo(X(n), Y(se));
          });
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.strokeStyle = algo;
          ctx.beginPath();
          sc.curve.forEach(([n, e], i) => {
            if (i === 0) ctx.moveTo(X(n), Y(e));
            else ctx.lineTo(X(n), Y(e));
          });
          ctx.stroke();
        }
        ctx.fillStyle = sc.ok ? good : warn;
        ctx.fillText(sc.ok ? 'within four standard errors of the truth' : 'OUTSIDE FOUR STANDARD ERRORS', gx, gy + 14);
        let line;
        if (s.done) {
          line = sc.last;
          ctx.fillStyle = sc.ok ? good : warn;
        } else {
          line = sc.last;
          ctx.fillStyle = ink;
        }
        ctx.fillText(line.length > 96 ? `${line.slice(0, 95)}…` : line, 12, H - 6);
        statsRef.current = { line };
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
          new darts
        </button>
        <span className="viz-stat">{snap.line || 'throwing…'}</span>
      </div>
    </>
  );
}
