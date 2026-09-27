import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two hundred points, sixty percent near a hidden line and the rest
// scattered. Each tick is one RANSAC draw: two random points (amber)
// define a candidate line, the points within the threshold band are
// counted (blue), and the candidate with the largest consensus so far
// is kept (green). The least-squares line through every point (red)
// shows what the outliers do to a method that trusts them all.
const W = 640;
const H = 300;
const SEED = 20260926;
const N = 200;
const OUTLIERS = 0.4;
const TRUE_M = 0.7;
const TRUE_B = 3;
const NOISE = 0.3;
const THRESHOLD = 1.0;
const DRAWS = 24;

function gauss(rand) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function leastSquares(pts) {
  const n = pts.length;
  const mx = pts.reduce((s, p) => s + p[0], 0) / n;
  const my = pts.reduce((s, p) => s + p[1], 0) / n;
  let sxx = 0;
  let sxy = 0;
  for (const [x, y] of pts) {
    sxx += (x - mx) ** 2;
    sxy += (x - mx) * (y - my);
  }
  const m = sxy / sxx;
  return [m, my - m * mx];
}

const residual = (m, b, p) => Math.abs(p[1] - (m * p[0] + b)) / Math.sqrt(1 + m * m);

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const pts = [];
  const nOut = Math.round(OUTLIERS * N);
  for (let i = 0; i < N; i++) {
    if (i < N - nOut) {
      const x = rand() * 20 - 10;
      pts.push([x, TRUE_M * x + TRUE_B + gauss(rand) * NOISE, true]);
    } else pts.push([rand() * 20 - 10, rand() * 40 - 15, false]);
  }
  return { rand, pts, draw: 0, candidate: null, sample: null, inliers: [], best: null, bestSet: [], ols: leastSquares(pts), refit: null, done: false };
}

export function sceneTick(sc) {
  if (sc.done) return true;
  const i = Math.floor(sc.rand() * N);
  let j = Math.floor(sc.rand() * N);
  while (j === i) j = Math.floor(sc.rand() * N);
  const [x1, y1] = sc.pts[i];
  const [x2, y2] = sc.pts[j];
  if (Math.abs(x2 - x1) < 1e-9) return false;
  const m = (y2 - y1) / (x2 - x1);
  const b = y1 - m * x1;
  const inl = [];
  for (let k = 0; k < N; k++) if (residual(m, b, sc.pts[k]) <= THRESHOLD) inl.push(k);
  sc.candidate = [m, b];
  sc.sample = [i, j];
  sc.inliers = inl;
  if (inl.length > sc.bestSet.length) {
    sc.best = [m, b];
    sc.bestSet = inl;
  }
  sc.draw += 1;
  if (sc.draw >= DRAWS) {
    sc.refit = leastSquares(sc.bestSet.map((k) => sc.pts[k]));
    sc.done = true;
  }
  return sc.done;
}

export default function RansacViz() {
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
      stepMs: 380,
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
        const x0 = 20;
        const y0 = 30;
        const pw = 400;
        const ph = 250;
        const sx = (x) => x0 + ((x + 10) / 20) * pw;
        const sy = (y) => y0 + ph - ((y + 15) / 40) * ph;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText(`${N} points, ${Math.round(OUTLIERS * 100)}% scattered; draw ${sc.draw} of ${DRAWS}: two random points, count the band, keep the best`, 12, 18);
        ctx.strokeStyle = `${dim}44`;
        ctx.strokeRect(x0, y0, pw, ph);
        const drawLine = (m, b, color, width, dash) => {
          ctx.strokeStyle = color;
          ctx.lineWidth = width;
          if (dash) ctx.setLineDash(dash);
          ctx.beginPath();
          ctx.moveTo(sx(-10), sy(m * -10 + b));
          ctx.lineTo(sx(10), sy(m * 10 + b));
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.lineWidth = 1;
        };
        if (sc.candidate && !s.done) {
          const [m, b] = sc.candidate;
          ctx.fillStyle = `${algo}18`;
          const off = THRESHOLD * Math.sqrt(1 + m * m);
          ctx.beginPath();
          ctx.moveTo(sx(-10), sy(m * -10 + b + off));
          ctx.lineTo(sx(10), sy(m * 10 + b + off));
          ctx.lineTo(sx(10), sy(m * 10 + b - off));
          ctx.lineTo(sx(-10), sy(m * -10 + b - off));
          ctx.closePath();
          ctx.fill();
          drawLine(m, b, heur, 1.5);
        }
        const inlSet = new Set(s.done ? sc.bestSet : sc.inliers);
        for (let k = 0; k < N; k++) {
          const [x, y] = sc.pts[k];
          ctx.fillStyle = inlSet.has(k) ? algo : `${dim}88`;
          ctx.beginPath();
          ctx.arc(sx(x), sy(y), 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
        if (sc.sample && !s.done) {
          for (const k of sc.sample) {
            const [x, y] = sc.pts[k];
            ctx.strokeStyle = heur;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(sx(x), sy(y), 6, 0, Math.PI * 2);
            ctx.stroke();
            ctx.lineWidth = 1;
          }
        }
        drawLine(sc.ols[0], sc.ols[1], warn, 1.5, [5, 4]);
        if (sc.best) drawLine(sc.best[0], sc.best[1], good, s.done ? 2.5 : 1.2);
        if (s.done && sc.refit) drawLine(sc.refit[0], sc.refit[1], good, 2.5);
        const tx = 436;
        ctx.fillStyle = ink;
        ctx.fillText(`this draw: ${sc.inliers.length} in the band`, tx, 50);
        ctx.fillStyle = good;
        ctx.fillText(`best so far: ${sc.bestSet.length} of ${N}`, tx, 70);
        ctx.fillStyle = dim;
        ctx.fillText(`truth: y = ${TRUE_M} x + ${TRUE_B}`, tx, 100);
        if (sc.best) ctx.fillText(`best: y = ${sc.best[0].toFixed(2)} x + ${sc.best[1].toFixed(2)}`, tx, 118);
        ctx.fillStyle = warn;
        ctx.fillText(`least squares: y = ${sc.ols[0].toFixed(2)} x + ${sc.ols[1].toFixed(2)}`, tx, 146);
        ctx.fillStyle = dim;
        ctx.fillText('amber: the sample and its band', tx, 176);
        ctx.fillText('blue: points inside the band', tx, 192);
        ctx.fillText('green: the largest consensus', tx, 208);
        ctx.fillText('red dashed: least squares on all', tx, 224);
        let line;
        if (s.done) {
          line = `refit on ${sc.bestSet.length} consensus points: y = ${sc.refit[0].toFixed(3)} x + ${sc.refit[1].toFixed(2)} (truth ${TRUE_M} x + ${TRUE_B}); least squares on all: slope ${sc.ols[0].toFixed(2)}`;
          ctx.fillStyle = good;
        } else {
          line = 'a minimal sample fits a line; the data votes; the vote, not the residual, picks the model';
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
          new points
        </button>
        <span className="viz-stat">{snap.line || 'sampling…'}</span>
      </div>
    </>
  );
}
