import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// The 2-D Poisson system on a 16 x 16 grid, solved one iteration per
// tick. Left: the residual field of the conjugate gradient iteration
// (blue where the equations are still violated). Right: the residual
// norm on a log scale for CG (blue) beside a rival on the same system:
// steepest descent on the uniform grid, or plain CG beside
// Jacobi-preconditioned CG when the coefficient jumps by ten thousand.
const W = 640;
const H = 300;
const SEED = 20260926;
const n = 16;
const N = n * n;
const TOL = 1e-8;
const MAX_IT = 400;

function build(coeff) {
  const c = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) c.push(coeff(i, j));
  const edge = (i, j, i2, j2) => (i2 < 0 || j2 < 0 || i2 >= n || j2 >= n ? c[i * n + j] : (2 * c[i * n + j] * c[i2 * n + j2]) / (c[i * n + j] + c[i2 * n + j2]));
  const diag = new Array(N).fill(0);
  const nbr = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const k = i * n + j;
      const lst = [];
      for (const [di, dj] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const w = edge(i, j, i + di, j + dj);
        diag[k] += w;
        if (i + di >= 0 && j + dj >= 0 && i + di < n && j + dj < n) lst.push([(i + di) * n + (j + dj), w]);
      }
      nbr.push(lst);
    }
  }
  const apply = (x) => {
    const y = new Array(N);
    for (let k = 0; k < N; k++) {
      let s = diag[k] * x[k];
      for (const [m, w] of nbr[k]) s -= w * x[m];
      y[k] = s;
    }
    return y;
  };
  return { apply, diag };
}

const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);

function makeCg(apply, b, precond) {
  const x = new Array(N).fill(0);
  const r = [...b];
  const z = precond ? precond(r) : [...r];
  return { kind: 'cg', apply, b, precond, x, r, p: [...z], rz: dot(r, z), bnorm: Math.sqrt(dot(b, b)), hist: [1], it: 0, done: false };
}

function stepCg(S) {
  if (S.done) return;
  const Ap = S.apply(S.p);
  const alpha = S.rz / dot(S.p, Ap);
  for (let i = 0; i < N; i++) {
    S.x[i] += alpha * S.p[i];
    S.r[i] -= alpha * Ap[i];
  }
  const z = S.precond ? S.precond(S.r) : S.r;
  const rzNew = dot(S.r, z);
  const beta = rzNew / S.rz;
  for (let i = 0; i < N; i++) S.p[i] = z[i] + beta * S.p[i];
  S.rz = rzNew;
  S.it += 1;
  const res = Math.sqrt(dot(S.r, S.r)) / S.bnorm;
  S.hist.push(res);
  if (res < TOL || S.it >= MAX_IT) S.done = true;
}

function makeSd(apply, b) {
  return { kind: 'sd', apply, b, x: new Array(N).fill(0), r: [...b], bnorm: Math.sqrt(dot(b, b)), hist: [1], it: 0, done: false };
}

function stepSd(S) {
  if (S.done) return;
  const Ar = S.apply(S.r);
  const alpha = dot(S.r, S.r) / dot(S.r, Ar);
  for (let i = 0; i < N; i++) {
    S.x[i] += alpha * S.r[i];
    S.r[i] -= alpha * Ar[i];
  }
  S.it += 1;
  const res = Math.sqrt(dot(S.r, S.r)) / S.bnorm;
  S.hist.push(res);
  if (res < TOL || S.it >= MAX_IT) S.done = true;
}

export function makeScene(seed, jump) {
  const rand = mulberry32(seed);
  const { apply, diag } = build(jump ? (i, j) => ((i < n / 2) === (j < n / 2) ? 1e4 : 1) : () => 1);
  const b = Array.from({ length: N }, () => rand() * 2 - 1);
  const jac = (r) => r.map((v, i) => v / diag[i]);
  const hero = makeCg(apply, b, jump ? jac : null);
  const rival = jump ? makeCg(apply, b, null) : makeSd(apply, b);
  return { jump, hero, rival, heroName: jump ? 'CG with Jacobi preconditioner' : 'conjugate gradient', rivalName: jump ? 'plain CG' : 'steepest descent', done: false };
}

export function sceneTick(sc) {
  stepCg(sc.hero);
  if (sc.rival.kind === 'cg') stepCg(sc.rival);
  else stepSd(sc.rival);
  sc.done = sc.hero.done && sc.rival.done;
  return sc.done;
}

export default function CgViz() {
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
      stepMs: 90,
      init: () => ({ scene: makeScene(SEED + cycle.current * 7919, cycle.current % 2 === 1), done: false, rest: 0, stopAtRest: isStill() }),
      tick: (s) => {
        if (s.done) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            Object.assign(s, { scene: makeScene(SEED + cycle.current * 7919, cycle.current % 2 === 1), done: false, rest: 0 });
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
        ctx.fillText(`2-D Poisson on a ${n} x ${n} grid (${N} unknowns)${sc.jump ? ', coefficient jumping by 10,000 across the quadrants' : ', uniform coefficient'}; one iteration per tick`, 12, 18);
        // residual field of the hero
        const x0 = 16;
        const y0 = 36;
        const cell = 13;
        const rmax = Math.max(1e-300, ...sc.hero.r.map(Math.abs));
        for (let i = 0; i < n; i++) {
          for (let j = 0; j < n; j++) {
            const v = Math.abs(sc.hero.r[i * n + j]) / rmax;
            ctx.fillStyle = `rgba(93,162,255,${0.05 + 0.85 * Math.sqrt(v)})`;
            ctx.fillRect(x0 + j * cell, y0 + i * cell, cell - 1, cell - 1);
          }
        }
        ctx.fillStyle = dim;
        ctx.fillText(`residual field of ${sc.heroName} (scaled to its own max)`, x0, y0 + n * cell + 16);
        ctx.fillText(`iteration ${sc.hero.it}: |r| / |b| = ${sc.hero.hist[sc.hero.hist.length - 1].toExponential(1)}`, x0, y0 + n * cell + 32);
        // log residual chart
        const cx0 = 260;
        const cy0 = 40;
        const cw = 360;
        const ch = 190;
        ctx.strokeStyle = `${dim}66`;
        ctx.strokeRect(cx0, cy0, cw, ch);
        const maxIt = Math.max(60, sc.hero.hist.length, sc.rival.hist.length);
        const py = (v) => cy0 + ch * Math.min(1, Math.max(0, -Math.log10(Math.max(v, 1e-10)) / 10));
        const drawHist = (hist, color) => {
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          hist.forEach((v, t) => {
            const px = cx0 + (t / maxIt) * cw;
            if (t === 0) ctx.moveTo(px, py(v));
            else ctx.lineTo(px, py(v));
          });
          ctx.stroke();
          ctx.lineWidth = 1;
        };
        drawHist(sc.rival.hist, dim);
        drawHist(sc.hero.hist, sc.jump ? heur : algo);
        ctx.fillStyle = dim;
        ctx.fillText('1', cx0 - 10, cy0 + 4);
        ctx.fillText('1e-10', cx0 - 38, cy0 + ch + 4);
        ctx.fillText(`iterations 0 to ${maxIt}`, cx0 + cw - 130, cy0 + ch + 14);
        ctx.fillStyle = sc.jump ? heur : algo;
        ctx.fillText(`${sc.heroName}: ${sc.hero.it} iterations${sc.hero.done ? (sc.hero.hist[sc.hero.hist.length - 1] < TOL ? ', converged' : ', capped') : ''}`, cx0, cy0 + ch + 30);
        ctx.fillStyle = dim;
        ctx.fillText(`${sc.rivalName}: ${sc.rival.it} iterations${sc.rival.done ? (sc.rival.hist[sc.rival.hist.length - 1] < TOL ? ', converged' : `, capped at ${MAX_IT} (residual ${sc.rival.hist[sc.rival.hist.length - 1].toExponential(1)})`) : ''}`, cx0, cy0 + ch + 46);
        let line;
        if (s.done) {
          line = sc.jump
            ? `dividing by the diagonal undid the 10,000x scaling: ${sc.hero.it} iterations against ${sc.rival.it}${sc.rival.hist[sc.rival.hist.length - 1] < TOL ? '' : ' (not converged)'} for plain CG`
            : `conjugate directions never undo earlier progress: ${sc.hero.it} iterations against ${sc.rival.it}${sc.rival.hist[sc.rival.hist.length - 1] < TOL ? '' : ' (still going)'} for steepest descent`;
          ctx.fillStyle = good;
        } else {
          line = sc.jump ? 'the preconditioner solves M z = r with M the diagonal: one division per unknown per iteration' : 'each direction is A-conjugate to all before it; the residual is the only thing the iteration touches A with';
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
          next system
        </button>
        <span className="viz-stat">{snap.line || 'iterating…'}</span>
      </div>
    </>
  );
}
