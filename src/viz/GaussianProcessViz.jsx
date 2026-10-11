import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Gaussian process regression with the RBF kernel, one noisy observation
// per tick: the posterior mean (blue) and its 95% band are refit by a
// Cholesky solve each tick. Invariants checked every tick: the variance is
// never negative, adding a point never raises the posterior variance at any
// grid point (a theorem for fixed hyperparameters), and the Cholesky weights
// equal an independent Gauss-Jordan solve.
const W = 640;
const H = 300;
const SEED = 20261010;
const ELL = 1.0;
const NOISE2 = 0.15 * 0.15;
const GRID = Array.from({ length: 101 }, (_, i) => i / 10);

function k(a, b) {
  return Math.exp(-0.5 * (a - b) * (a - b) / (ELL * ELL));
}

function cholesky(a) {
  const n = a.length;
  const l = a.map(() => new Array(n).fill(0));
  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j <= i; j += 1) {
      let s = a[i][j];
      for (let t = 0; t < j; t += 1) s -= l[i][t] * l[j][t];
      if (i === j) {
        if (s <= 0) return null;
        l[i][j] = Math.sqrt(s);
      } else l[i][j] = s / l[j][j];
    }
  }
  return l;
}

function solveLower(l, b) {
  const y = new Array(b.length).fill(0);
  for (let i = 0; i < b.length; i += 1) {
    let s = b[i];
    for (let t = 0; t < i; t += 1) s -= l[i][t] * y[t];
    y[i] = s / l[i][i];
  }
  return y;
}

function cholSolve(l, b) {
  const n = b.length;
  const y = solveLower(l, b);
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i -= 1) {
    let s = y[i];
    for (let t = i + 1; t < n; t += 1) s -= l[t][i] * x[t];
    x[i] = s / l[i][i];
  }
  return x;
}

function gaussJordanSolve(a, b) {
  const n = a.length;
  const m = a.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c += 1) {
    let p = c;
    for (let r = c + 1; r < n; r += 1) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
    [m[c], m[p]] = [m[p], m[c]];
    const piv = m[c][c];
    for (let j = 0; j <= n; j += 1) m[c][j] /= piv;
    for (let r = 0; r < n; r += 1) {
      if (r !== c && m[r][c] !== 0) {
        const f = m[r][c];
        for (let j = 0; j <= n; j += 1) m[r][j] -= f * m[c][j];
      }
    }
  }
  return m.map((row) => row[n]);
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const a = 0.7 + rand() * 0.8;
  const b = 0.2 + rand() * 0.4;
  const p = rand() * Math.PI * 2;
  const q = rand() * Math.PI * 2;
  const truth = (x) => a * Math.sin(x + p) + b * Math.sin(3 * x + q);
  const total = 24;
  const xs = Array.from({ length: total }, () => rand() * 10);
  const ys = xs.map((x) => {
    // Box-Muller noise
    const u = Math.max(rand(), 1e-12);
    const v = rand();
    return truth(x) + Math.sqrt(NOISE2) * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  });
  return {
    truth, xs, ys, total, n: 0, mean: GRID.map(() => 0), varr: GRID.map(() => 1), prevVar: null,
    coverage: 1, lml: 0, maxRise: 0, solveGap: 0, done: false, ok: true,
    last: `prior: mean zero, variance one everywhere; ${total} noisy observations to come`,
  };
}

export function sceneTick(sc) {
  if (sc.done) return true;
  sc.n += 1;
  const n = sc.n;
  const xs = sc.xs.slice(0, n);
  const ys = sc.ys.slice(0, n);
  const kk = xs.map((x) => xs.map((z) => k(x, z) + (x === z ? NOISE2 : 0)));
  for (let i = 0; i < n; i += 1) kk[i][i] = 1 + NOISE2;
  const l = cholesky(kk);
  if (!l) {
    sc.ok = false;
    sc.done = true;
    sc.last = 'Cholesky failed';
    return true;
  }
  const alpha = cholSolve(l, ys);
  const alpha2 = gaussJordanSolve(kk, ys);
  sc.solveGap = Math.max(...alpha.map((v, i) => Math.abs(v - alpha2[i])));
  if (sc.solveGap > 1e-6) sc.ok = false;
  let logdet = 0;
  for (let i = 0; i < n; i += 1) logdet += Math.log(l[i][i]);
  sc.lml = -0.5 * ys.reduce((s, y, i) => s + y * alpha[i], 0) - logdet - 0.5 * n * Math.log(2 * Math.PI);
  sc.prevVar = sc.varr;
  let rise = 0;
  let covered = 0;
  sc.mean = GRID.map((x) => xs.reduce((s, xi, i) => s + k(x, xi) * alpha[i], 0));
  sc.varr = GRID.map((x, gi) => {
    const ks = xs.map((xi) => k(x, xi));
    const v = solveLower(l, ks);
    const vv = 1 - v.reduce((s, t) => s + t * t, 0);
    if (vv < -1e-9) sc.ok = false;
    rise = Math.max(rise, vv - sc.prevVar[gi]);
    if (Math.abs(sc.truth(x) - sc.mean[gi]) <= 1.96 * Math.sqrt(Math.max(vv, 0))) covered += 1;
    return Math.max(vv, 0);
  });
  sc.maxRise = Math.max(sc.maxRise, rise);
  if (rise > 1e-7) sc.ok = false;
  sc.coverage = covered / GRID.length;
  const maxVar = Math.max(...sc.varr);
  sc.last = `${n} of ${sc.total} points: band covers the truth at ${(sc.coverage * 100).toFixed(0)}% of the grid; max variance ${maxVar.toFixed(3)}; log marginal likelihood ${sc.lml.toFixed(2)}`;
  if (n >= sc.total) {
    sc.done = true;
    sc.last = `done: ${n} points; 95% band covers the truth on ${(sc.coverage * 100).toFixed(0)}% of the grid; variance never rose (max rise ${sc.maxRise.toExponential(0)}); Cholesky and Gauss-Jordan weights agree to ${sc.solveGap.toExponential(0)}: ${sc.ok ? 'yes' : 'NO'}`;
    return true;
  }
  return false;
}

const X = (x) => 24 + (x / 10) * (W - 48);
const Y = (y) => 150 - y * 48;

export default function GaussianProcessViz() {
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
        ctx.fillText('RBF kernel, length scale 1, noise 0.15: blue mean and 95% band refit by Cholesky after every amber point; dashed: the truth', 12, 18);
        // band
        ctx.fillStyle = `${algo}33`;
        ctx.beginPath();
        GRID.forEach((x, i) => { const y = Y(sc.mean[i] + 1.96 * Math.sqrt(sc.varr[i])); if (i === 0) ctx.moveTo(X(x), y); else ctx.lineTo(X(x), y); });
        for (let i = GRID.length - 1; i >= 0; i -= 1) ctx.lineTo(X(GRID[i]), Y(sc.mean[i] - 1.96 * Math.sqrt(sc.varr[i])));
        ctx.closePath();
        ctx.fill();
        // truth
        ctx.strokeStyle = `${dim}aa`;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        GRID.forEach((x, i) => { const y = Y(sc.truth(x)); if (i === 0) ctx.moveTo(X(x), y); else ctx.lineTo(X(x), y); });
        ctx.stroke();
        ctx.setLineDash([]);
        // mean
        ctx.strokeStyle = algo;
        ctx.lineWidth = 2;
        ctx.beginPath();
        GRID.forEach((x, i) => { const y = Y(sc.mean[i]); if (i === 0) ctx.moveTo(X(x), y); else ctx.lineTo(X(x), y); });
        ctx.stroke();
        ctx.lineWidth = 1;
        // points
        ctx.fillStyle = heur;
        for (let i = 0; i < sc.n; i += 1) {
          ctx.beginPath();
          ctx.arc(X(sc.xs[i]), Y(sc.ys[i]), 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = dim;
        ctx.fillText('x from 0 to 10', 24, 262);
        ctx.fillStyle = sc.ok ? good : warn;
        ctx.fillText(sc.ok ? 'invariants: variance never negative, never rises when a point is added; Cholesky equals Gauss-Jordan' : 'INVARIANT BROKEN', 12, 278);
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
          new function
        </button>
        <span className="viz-stat">{snap.line || 'fitting…'}</span>
      </div>
    </>
  );
}
