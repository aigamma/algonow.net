import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// The same 8 x 8 system eliminated twice, one column per tick. Left:
// no pivoting, which takes whatever sits on the diagonal (the first
// entry is planted tiny, or zero on alternate scenes). Right: partial
// pivoting, which swaps the largest entry of the column up first
// (amber row) so every multiplier is at most 1. Cells shade by
// log-magnitude; the counters track the largest entry produced so far
// and, at the end, the residual of each solution.
const W = 640;
const H = 300;
const SEED = 20260926;
const N = 8;

function gauss(rand) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function makeRun(A, b, pivoting) {
  return { pivoting, M: A.map((row, i) => [...row, b[i]]), k: 0, growth: A.reduce((m, r) => Math.max(m, ...r.map(Math.abs)), 0), maxMult: 0, failed: false, pivotRow: null, swapped: false, x: null, residual: null };
}

export function makeScene(seed, planted) {
  const rand = mulberry32(seed);
  const A = Array.from({ length: N }, () => Array.from({ length: N }, () => gauss(rand)));
  const b = Array.from({ length: N }, () => gauss(rand));
  A[0][0] = planted;
  return { A, b, planted, none: makeRun(A, b, 'none'), partial: makeRun(A, b, 'partial'), done: false };
}

function stepRun(R) {
  if (R.failed || R.k >= N) return true;
  const { M } = R;
  const k = R.k;
  R.swapped = false;
  if (R.pivoting === 'partial') {
    let p = k;
    for (let i = k + 1; i < N; i++) if (Math.abs(M[i][k]) > Math.abs(M[p][k])) p = i;
    if (p !== k) {
      [M[k], M[p]] = [M[p], M[k]];
      R.swapped = true;
    }
  }
  R.pivotRow = k;
  if (M[k][k] === 0) {
    R.failed = true;
    return true;
  }
  for (let i = k + 1; i < N; i++) {
    const f = M[i][k] / M[k][k];
    R.maxMult = Math.max(R.maxMult, Math.abs(f));
    M[i][k] = 0;
    for (let j = k + 1; j <= N; j++) M[i][j] -= f * M[k][j];
  }
  for (let i = k + 1; i < N; i++) for (let j = k + 1; j < N; j++) R.growth = Math.max(R.growth, Math.abs(M[i][j]));
  R.k += 1;
  return R.k >= N;
}

function finish(sc, R) {
  if (R.failed || R.x) return;
  const { M } = R;
  const x = new Array(N).fill(0);
  for (let i = N - 1; i >= 0; i--) {
    let s = M[i][N];
    for (let j = i + 1; j < N; j++) s -= M[i][j] * x[j];
    x[i] = s / M[i][i];
  }
  R.x = x;
  let r = 0;
  let normA = 0;
  for (let i = 0; i < N; i++) {
    let s = -sc.b[i];
    let rowSum = 0;
    for (let j = 0; j < N; j++) {
      s += sc.A[i][j] * x[j];
      rowSum += Math.abs(sc.A[i][j]);
    }
    r = Math.max(r, Math.abs(s));
    normA = Math.max(normA, rowSum);
  }
  const normX = Math.max(...x.map(Math.abs));
  R.residual = r / (normA * normX);
}

export function sceneTick(sc) {
  const a = stepRun(sc.none);
  const b = stepRun(sc.partial);
  if (a && b) {
    finish(sc, sc.none);
    finish(sc, sc.partial);
    sc.done = true;
  }
  return sc.done;
}

export default function GaussianViz() {
  const canvasRef = useRef(null);
  const cycle = useRef(0);
  const statsRef = useRef({ line: '' });
  const [restart, setRestart] = useState(0);
  const [snap, setSnap] = useState({ line: '' });

  useEffect(() => {
    const id = setInterval(() => setSnap({ ...statsRef.current }), 400);
    return () => clearInterval(id);
  }, []);

  const planted = (c) => (c % 2 === 0 ? 1e-4 : 0);

  useCanvasLoop(
    canvasRef,
    {
      width: W,
      height: H,
      stepMs: 650,
      init: () => ({ scene: makeScene(SEED + cycle.current * 7919, planted(cycle.current)), done: false, rest: 0, stopAtRest: isStill() }),
      tick: (s) => {
        if (s.done) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            Object.assign(s, { scene: makeScene(SEED + cycle.current * 7919, planted(cycle.current)), done: false, rest: 0 });
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
        ctx.fillText(`${N} x ${N} Gaussian system with a${sc.planted === 0 ? ' zero' : ' tiny (1e-4)'} entry planted at the top left; one column per tick`, 12, 18);
        const panels = [
          { x0: 24, R: sc.none, name: 'no pivoting', color: dim },
          { x0: 340, R: sc.partial, name: 'partial pivoting', color: algo },
        ];
        const cell = 22;
        const y0 = 40;
        for (const p of panels) {
          const R = p.R;
          ctx.fillStyle = p.color;
          ctx.fillText(p.name, p.x0, y0 - 8);
          for (let i = 0; i < N; i++) {
            for (let j = 0; j <= N; j++) {
              const v = Math.abs(R.M[i][j]);
              const t = v === 0 ? 0 : Math.max(0, Math.min(1, (Math.log10(v) + 4) / 8));
              const isB = j === N;
              ctx.fillStyle = isB ? `rgba(154,165,189,${0.15 + 0.5 * t})` : v > 100 ? `rgba(226,96,108,${0.3 + 0.6 * t})` : `rgba(93,162,255,${0.08 + 0.7 * t})`;
              ctx.fillRect(p.x0 + j * cell + (isB ? 6 : 0), y0 + i * cell, cell - 2, cell - 2);
            }
          }
          if (R.pivotRow !== null && !R.x) {
            ctx.strokeStyle = heur;
            ctx.lineWidth = 2;
            ctx.strokeRect(p.x0 - 2, y0 + R.pivotRow * cell - 2, N * cell + 2, cell + 2);
            ctx.lineWidth = 1;
          }
          const ty = y0 + N * cell + 16;
          ctx.fillStyle = dim;
          ctx.fillText(`largest entry so far: ${R.growth >= 1e4 ? R.growth.toExponential(1) : R.growth.toFixed(2)}`, p.x0, ty);
          ctx.fillText(`largest multiplier: ${R.maxMult >= 1e4 ? R.maxMult.toExponential(1) : R.maxMult.toFixed(2)}${R.swapped ? '  (row swapped in)' : ''}`, p.x0, ty + 16);
          if (R.failed) {
            ctx.fillStyle = warn;
            ctx.fillText(`zero pivot at step ${R.k}: cannot continue`, p.x0, ty + 32);
          } else if (R.residual !== null) {
            ctx.fillStyle = R.residual < 1e-12 ? good : warn;
            ctx.fillText(`residual |Ax - b| / (|A||x|) = ${R.residual.toExponential(1)}`, p.x0, ty + 32);
          }
        }
        let line;
        if (s.done) {
          const a = sc.none;
          const b = sc.partial;
          line = a.failed
            ? `no pivoting died on the zero pivot; partial pivoting solved it with residual ${b.residual.toExponential(1)} and multipliers at most ${b.maxMult.toFixed(2)}`
            : `no pivoting: multipliers up to ${a.maxMult.toExponential(1)}, residual ${a.residual.toExponential(1)}; partial pivoting: multipliers at most ${b.maxMult.toFixed(2)}, residual ${b.residual.toExponential(1)}`;
          ctx.fillStyle = good;
        } else {
          line = 'the largest entry of the column becomes the pivot, so every multiplier is at most one in size';
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
          new system
        </button>
        <span className="viz-stat">{snap.line || 'eliminating…'}</span>
      </div>
    </>
  );
}
