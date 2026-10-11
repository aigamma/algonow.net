import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Seeded assets, the closed-form frontier as a hyperbola; each tick solves one
// target through the KKT system and drops random long-only portfolios into the
// cloud. Invariant: KKT equals the closed form and no portfolio beats the curve.
const W = 640;
const H = 300;
const SEED = 20261010;

function solve(M, b) {
  const n = M.length;
  const A = M.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c += 1) {
    let p = c;
    for (let r = c + 1; r < n; r += 1) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    const piv = A[c][c];
    for (let j = 0; j <= n; j += 1) A[c][j] /= piv;
    for (let r = 0; r < n; r += 1) {
      if (r !== c && A[r][c] !== 0) {
        const f = A[r][c];
        for (let j = 0; j <= n; j += 1) A[r][j] -= f * A[c][j];
      }
    }
  }
  return A.map((row) => row[n]);
}

const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const quad = (w, S) => dot(w, S.map((row) => dot(row, w)));

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const n = 4 + Math.floor(rand() * 3); // 4 to 6 assets
  const mu = Array.from({ length: n }, () => 0.004 + rand() * 0.012);
  const F = Array.from({ length: n }, () => Array.from({ length: n }, () => rand() * 2 - 1));
  const S = mu.map((_, i) => mu.map((__, j) => F[i].reduce((s, x, k) => s + x * F[j][k], 0) / n * 0.004 + (i === j ? 0.0012 : 0)));
  const ones = Array(n).fill(1);
  const Si1 = solve(S, ones);
  const Simu = solve(S, mu);
  const A = dot(ones, Si1);
  const B = dot(ones, Simu);
  const C = dot(mu, Simu);
  const D = A * C - B * B;
  const rf = 0.002;
  const ex = solve(S, mu.map((m) => m - rf));
  const sum = ex.reduce((s, x) => s + x, 0);
  const tan = ex.map((x) => x / sum);
  const tanM = dot(tan, mu);
  const tanSd = Math.sqrt(quad(tan, S));
  return {
    rand, n, mu, S, A, B, C, D, rf, tan, tanM, tanSd, gmvM: B / A, gmvSd: Math.sqrt(1 / A),
    targets: 36, i: 0, solved: [], cloud: [], maxGap: 0, ok: true, done: false,
    last: `${n} assets; GMV at ${(B / A * 100).toFixed(2)}% with sd ${(Math.sqrt(1 / A) * 100).toFixed(2)}%; tangency Sharpe ${((tanM - rf) / tanSd).toFixed(3)}`,
  };
}

function frontierVar(sc, m) {
  return (sc.A * m * m - 2 * sc.B * m + sc.C) / sc.D;
}

export function sceneTick(sc) {
  if (sc.done) return true;
  const { n, mu, S } = sc;
  // one numerical frontier point against the closed form
  const m = sc.gmvM - 0.003 + (0.016 * sc.i) / (sc.targets - 1);
  const M = mu.map((_, i) => [...S[i].map((v) => 2 * v), 1, mu[i]]);
  M.push([...Array(n).fill(1), 0, 0]);
  M.push([...mu, 0, 0]);
  const w = solve(M, [...Array(n).fill(0), 1, m]).slice(0, n);
  const g = (sc.C - sc.B * m) / sc.D;
  const h = (sc.A * m - sc.B) / sc.D;
  const Si1 = solve(S, Array(n).fill(1));
  const Simu = solve(S, mu);
  const gap = Math.max(...w.map((x, k) => Math.abs(x - (g * Si1[k] + h * Simu[k]))));
  sc.maxGap = Math.max(sc.maxGap, gap);
  sc.ok = sc.ok && gap < 1e-8 && Math.abs(quad(w, S) - frontierVar(sc, m)) < 1e-12;
  sc.solved.push([Math.sqrt(quad(w, S)), m]);
  // a batch of random long-only portfolios: none may beat the frontier
  for (let b = 0; b < 12; b += 1) {
    const e = Array.from({ length: n }, () => -Math.log(1 - sc.rand()));
    const tot = e.reduce((s, x) => s + x, 0);
    const rw = e.map((x) => x / tot);
    const rm = dot(rw, mu);
    const rv = quad(rw, S);
    sc.ok = sc.ok && rv >= frontierVar(sc, rm) - 1e-12;
    sc.cloud.push([Math.sqrt(rv), rm]);
  }
  sc.i += 1;
  if (sc.i >= sc.targets) {
    sc.done = true;
    sc.last = `done: ${sc.targets} KKT solves equal the closed form (max gap ${sc.maxGap.toExponential(1)}); ${sc.cloud.length} random portfolios, none under the frontier: ${sc.ok ? 'yes' : 'NO'}`;
    return true;
  }
  sc.last = `target ${(m * 100).toFixed(2)}%: KKT matches the closed form to ${gap.toExponential(1)}; ${sc.cloud.length} portfolios, all on or right of the curve`;
  return false;
}

export default function MarkowitzViz() {
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
        const x0 = 60;
        const y0 = 262;
        const sx = (sd) => x0 + sd * 4200;
        const sy = (m) => y0 - (m + 0.002) * 9500;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText('the frontier (blue) with its GMV vertex, the amber tangency point and capital line; grey dots are random long-only portfolios', 12, 18);
        ctx.strokeStyle = `${dim}66`;
        ctx.beginPath();
        ctx.moveTo(x0, 40);
        ctx.lineTo(x0, y0);
        ctx.lineTo(W - 20, y0);
        ctx.stroke();
        ctx.fillText('sd', W - 36, y0 - 6);
        ctx.fillText('mean', x0 + 6, 48);
        sc.cloud.forEach(([sd, m]) => {
          ctx.fillStyle = `${dim}88`;
          ctx.fillRect(sx(sd) - 1.5, sy(m) - 1.5, 3, 3);
        });
        ctx.strokeStyle = algo;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let k = 0; k <= 80; k += 1) {
          const m = sc.gmvM - 0.004 + (0.02 * k) / 80;
          const sd = Math.sqrt(Math.max(frontierVar(sc, m), 0));
          if (k === 0) ctx.moveTo(sx(sd), sy(m));
          else ctx.lineTo(sx(sd), sy(m));
        }
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.strokeStyle = heur;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(sx(0), sy(sc.rf));
        const slope = (sc.tanM - sc.rf) / sc.tanSd;
        ctx.lineTo(sx(0.12), sy(sc.rf + slope * 0.12));
        ctx.stroke();
        ctx.setLineDash([]);
        sc.solved.forEach(([sd, m]) => {
          ctx.fillStyle = algo;
          ctx.fillRect(sx(sd) - 2, sy(m) - 2, 4, 4);
        });
        ctx.fillStyle = algo;
        ctx.beginPath();
        ctx.arc(sx(sc.gmvSd), sy(sc.gmvM), 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = heur;
        ctx.beginPath();
        ctx.arc(sx(sc.tanSd), sy(sc.tanM), 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = dim;
        ctx.fillText(`GMV ${(sc.gmvM * 100).toFixed(2)}% at sd ${(sc.gmvSd * 100).toFixed(2)}%`, sx(sc.gmvSd) + 10, sy(sc.gmvM) + 14);
        ctx.fillStyle = heur;
        ctx.fillText(`tangency ${(sc.tanM * 100).toFixed(2)}%, Sharpe ${((sc.tanM - sc.rf) / sc.tanSd).toFixed(3)}`, sx(sc.tanSd) + 10, sy(sc.tanM) - 6);
        ctx.fillStyle = dim;
        ctx.fillText(`${sc.solved.length} of ${sc.targets} targets solved by KKT; ${sc.cloud.length} random portfolios`, 12, 36);
        ctx.fillText('the file: closed form to 2e-15 on 81 targets; plug-in Sharpe 0.124 vs 1/N 0.205 at 60 months', 12, 52);
        ctx.fillStyle = sc.ok ? good : warn;
        ctx.fillText(sc.ok ? 'invariant: KKT equals the closed form; no portfolio beats the frontier' : 'INVARIANT BROKEN', 12, 68);
        const line = sc.last;
        ctx.fillStyle = s.done ? (sc.ok ? good : warn) : ink;
        ctx.fillText(line.length > 96 ? `${line.slice(0, 95)}…` : line, 12, H - 6);
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
          new assets
        </button>
        <span className="viz-stat">{snap.line || 'drawing the frontier…'}</span>
      </div>
    </>
  );
}
