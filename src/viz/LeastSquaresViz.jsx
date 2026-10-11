import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Points arrive one per tick on a noisy line; each fit is solved by the
// normal equations (2 x 2 Cholesky) and by Gram-Schmidt QR, which must agree,
// with the residual orthogonal to both columns. The last point is an outlier.
const W = 640;
const H = 300;
const SEED = 20261010;

function normalEq(pts) {
  // X = [1 x]; solve (X^T X) b = X^T y by Cholesky
  let n = 0;
  let sx = 0;
  let sxx = 0;
  let sy = 0;
  let sxy = 0;
  for (const [x, y] of pts) {
    n += 1;
    sx += x;
    sxx += x * x;
    sy += y;
    sxy += x * y;
  }
  const l11 = Math.sqrt(n);
  const l21 = sx / l11;
  const l22 = Math.sqrt(sxx - l21 * l21);
  const z1 = sy / l11;
  const z2 = (sxy - l21 * z1) / l22;
  const b1 = z2 / l22;
  const b0 = (z1 - l21 * b1) / l11;
  return [b0, b1];
}

function qrFit(pts) {
  // modified Gram-Schmidt on the two columns, then back substitution
  const n = pts.length;
  const q1 = new Array(n).fill(1 / Math.sqrt(n));
  const r11 = Math.sqrt(n);
  let r12 = 0;
  for (let i = 0; i < n; i += 1) r12 += q1[i] * pts[i][0];
  const v = pts.map((p, i) => p[0] - r12 * q1[i]);
  const r22 = Math.sqrt(v.reduce((s, a) => s + a * a, 0));
  const q2 = v.map((a) => a / r22);
  let c1 = 0;
  let c2 = 0;
  for (let i = 0; i < n; i += 1) {
    c1 += q1[i] * pts[i][1];
    c2 += q2[i] * pts[i][1];
  }
  const b1 = c2 / r22;
  const b0 = (c1 - r12 * b1) / r11;
  return [b0, b1];
}

function theilSen(pts) {
  const slopes = [];
  for (let i = 0; i < pts.length; i += 1) {
    for (let j = i + 1; j < pts.length; j += 1) {
      if (pts[j][0] !== pts[i][0]) slopes.push((pts[j][1] - pts[i][1]) / (pts[j][0] - pts[i][0]));
    }
  }
  slopes.sort((a, b) => a - b);
  const b1 = slopes[Math.floor(slopes.length / 2)];
  const ints = pts.map(([x, y]) => y - b1 * x).sort((a, b) => a - b);
  return [ints[Math.floor(ints.length / 2)], b1];
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const a = -2 + rand() * 4;
  const b = 0.4 + rand() * 1.2;
  const sigma = 0.6 + rand() * 0.6;
  const all = [];
  for (let i = 0; i < 36; i += 1) {
    const x = rand() * 10;
    const g = Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
    all.push([x, a + b * x + sigma * g]);
  }
  const ox = 9 + rand();
  all.push([ox, a + b * ox + 25 + rand() * 10]);
  return { a, b, sigma, all, pts: [], i: 0, fit: null, qr: null, ts: null, clean: null, done: false, ok: true, last: `truth: y = ${a.toFixed(2)} + ${b.toFixed(2)} x, noise sd ${sigma.toFixed(2)}; points arriving` };
}

export function sceneTick(sc) {
  if (sc.done) return true;
  sc.pts.push(sc.all[sc.i]);
  sc.i += 1;
  const n = sc.pts.length;
  if (n >= 3) {
    sc.fit = normalEq(sc.pts);
    sc.qr = qrFit(sc.pts);
    let sr = 0;
    let sxr = 0;
    for (const [x, y] of sc.pts) {
      const r = y - sc.fit[0] - sc.fit[1] * x;
      sr += r;
      sxr += x * r;
    }
    const agree = Math.abs(sc.fit[0] - sc.qr[0]) + Math.abs(sc.fit[1] - sc.qr[1]);
    sc.ok = sc.ok && Math.abs(sr) < 1e-7 * n && Math.abs(sxr) < 1e-6 * n && agree < 1e-9;
    if (n === sc.all.length - 1) sc.clean = sc.fit.slice();
    if (n === sc.all.length) sc.ts = theilSen(sc.pts);
    sc.last = n < sc.all.length
      ? `${n} points: normal equations slope ${sc.fit[1].toFixed(4)}, QR ${sc.qr[1].toFixed(4)}; |sum r| ${Math.abs(sr).toExponential(1)}, |sum x r| ${Math.abs(sxr).toExponential(1)}`
      : `outlier at x = ${sc.all[n - 1][0].toFixed(1)}: least squares slope ${sc.clean[1].toFixed(3)} to ${sc.fit[1].toFixed(3)}, Theil-Sen ${sc.ts[1].toFixed(3)}; invariants held: ${sc.ok ? 'yes' : 'NO'}`;
  }
  if (n === sc.all.length) {
    sc.done = true;
    return true;
  }
  return false;
}

export default function LeastSquaresViz() {
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
      stepMs: 260,
      init: () => ({ scene: makeScene(SEED + cycle.current * 7919), done: false, rest: 0, stopAtRest: isStill() }),
      tick: (s) => {
        if (s.done) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s) * 3) {
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
        const x0 = 40;
        const y0 = 262;
        const pw = 380;
        const ph = 230;
        const ys = sc.all.map((p) => p[1]);
        const ymin = Math.min(...ys) - 1;
        const ymax = Math.max(...ys) + 1;
        const X = (x) => x0 + (x / 10) * pw;
        const Y = (y) => y0 - ((y - ymin) / (ymax - ymin)) * ph;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText('least squares by the normal equations (blue); Theil-Sen dashed after the outlier; residuals red', 12, 18);
        ctx.strokeStyle = `${dim}66`;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x0 + pw, y0);
        ctx.moveTo(x0, y0 - ph);
        ctx.lineTo(x0, y0);
        ctx.stroke();
        if (sc.fit) {
          ctx.strokeStyle = `${warn}aa`;
          for (const [x, y] of sc.pts) {
            ctx.beginPath();
            ctx.moveTo(X(x), Y(y));
            ctx.lineTo(X(x), Y(sc.fit[0] + sc.fit[1] * x));
            ctx.stroke();
          }
          ctx.strokeStyle = algo;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(X(0), Y(sc.fit[0]));
          ctx.lineTo(X(10), Y(sc.fit[0] + sc.fit[1] * 10));
          ctx.stroke();
          ctx.lineWidth = 1;
        }
        if (sc.ts) {
          ctx.strokeStyle = heur;
          ctx.setLineDash([5, 4]);
          ctx.beginPath();
          ctx.moveTo(X(0), Y(sc.ts[0]));
          ctx.lineTo(X(10), Y(sc.ts[0] + sc.ts[1] * 10));
          ctx.stroke();
          ctx.setLineDash([]);
        }
        sc.pts.forEach(([x, y], i) => {
          const outlier = s.done && i === sc.pts.length - 1;
          ctx.fillStyle = outlier ? warn : ink;
          ctx.beginPath();
          ctx.arc(X(x), Y(y), outlier ? 5 : 3, 0, Math.PI * 2);
          ctx.fill();
        });
        const tx = 440;
        ctx.fillStyle = heur;
        ctx.fillText('the ledger X^T X, X^T y', tx, 48);
        ctx.fillStyle = ink;
        ctx.font = '10px ui-monospace, monospace';
        const n = sc.pts.length;
        const sum = (f) => sc.pts.reduce((t, p) => t + f(p), 0).toFixed(1);
        ctx.fillText(`[ ${n}  ${sum((p) => p[0])} ]   [ ${sum((p) => p[1])} ]`, tx, 66);
        ctx.fillText(`[ ${sum((p) => p[0])}  ${sum((p) => p[0] * p[0])} ]   [ ${sum((p) => p[0] * p[1])} ]`, tx, 80);
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = algo;
        if (sc.fit) ctx.fillText(`solve: y = ${sc.fit[0].toFixed(3)} + ${sc.fit[1].toFixed(3)} x`, tx, 104);
        ctx.fillStyle = dim;
        if (sc.qr) ctx.fillText(`QR agrees: ${sc.qr[1].toFixed(6)}`, tx, 120);
        ctx.fillText(`truth: ${sc.a.toFixed(2)} + ${sc.b.toFixed(2)} x`, tx, 136);
        if (sc.clean) {
          ctx.fillStyle = warn;
          ctx.fillText(`one outlier: slope ${sc.clean[1].toFixed(3)} to ${sc.fit[1].toFixed(3)}`, tx, 160);
          ctx.fillStyle = heur;
          if (sc.ts) ctx.fillText(`Theil-Sen slope ${sc.ts[1].toFixed(3)}`, tx, 176);
        }
        ctx.fillStyle = sc.ok ? good : warn;
        ctx.fillText(sc.ok ? 'invariant: X^T r = 0 and Cholesky = QR' : 'INVARIANT BROKEN', tx, 204);
        ctx.fillStyle = s.done ? (sc.ok ? good : warn) : ink;
        const line = sc.last;
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
          new sample
        </button>
        <span className="viz-stat">{snap.line || 'fitting…'}</span>
      </div>
    </>
  );
}
