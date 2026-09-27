import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// A two-parameter fit, y = a exp(-b t), to 30 noisy points, drawn on
// the cost surface over (a, b). Three optimizers start from the same
// far point, one iteration per tick: Levenberg-Marquardt (blue), with
// its damping shown; undamped Gauss-Newton (red), whose full steps can
// overshoot into nonsense; and gradient descent with backtracking
// (amber), which crawls along the valley. The floor is the cost at the
// true parameters.
const W = 640;
const H = 300;
const SEED = 20260926;
const TRUE = [3, 1.2];
const NOISE = 0.05;
const ITERS = 30;
const A_MAX = 6;
const B_MAX = 4;

function gauss(rand) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const safeExp = (x) => Math.exp(Math.min(x, 700));

function cost(p, data) {
  let s = 0;
  for (const [t, y] of data) {
    const r = p[0] * safeExp(-p[1] * t) - y;
    s += r * r;
  }
  return s;
}

function normal(p, data) {
  const JtJ = [[0, 0], [0, 0]];
  const Jtr = [0, 0];
  for (const [t, y] of data) {
    const e = safeExp(-p[1] * t);
    const row = [e, -p[0] * t * e];
    const r = p[0] * e - y;
    Jtr[0] += row[0] * r;
    Jtr[1] += row[1] * r;
    JtJ[0][0] += row[0] * row[0];
    JtJ[0][1] += row[0] * row[1];
    JtJ[1][0] += row[1] * row[0];
    JtJ[1][1] += row[1] * row[1];
  }
  return { JtJ, Jtr };
}

function solve2(A, b) {
  const det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
  if (Math.abs(det) < 1e-300) return null;
  return [(b[0] * A[1][1] - b[1] * A[0][1]) / det, (A[0][0] * b[1] - A[1][0] * b[0]) / det];
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const data = [];
  for (let i = 0; i < 30; i++) {
    const t = (i / 29) * 3;
    data.push([t, TRUE[0] * Math.exp(-TRUE[1] * t) + gauss(rand) * NOISE]);
  }
  const start = [0.5 + rand() * 5, 0.2 + rand() * 3.5];
  const floor = cost(TRUE, data);
  // a coarse cost grid for the contour picture
  const GX = 60;
  const GY = 40;
  const grid = [];
  let gmax = 0;
  for (let j = 0; j < GY; j++) {
    const row = [];
    for (let i = 0; i < GX; i++) {
      const c = cost([((i + 0.5) / GX) * A_MAX, ((j + 0.5) / GY) * B_MAX], data);
      row.push(c);
      gmax = Math.max(gmax, c);
    }
    grid.push(row);
  }
  return {
    data, start, floor, grid, gmax, GX, GY,
    lm: { p: start.slice(), lam: 1e-2, path: [start.slice()], cost: cost(start, data), dead: false },
    gn: { p: start.slice(), path: [start.slice()], cost: cost(start, data), dead: false },
    gd: { p: start.slice(), alpha: 1e-3, path: [start.slice()], cost: cost(start, data), dead: false },
    t: 0, done: false,
  };
}

export function sceneTick(sc) {
  if (sc.done) return true;
  const { data } = sc;
  // Levenberg-Marquardt
  const lm = sc.lm;
  if (!lm.dead) {
    const { JtJ, Jtr } = normal(lm.p, data);
    for (let tries = 0; tries < 20; tries++) {
      const A = [[JtJ[0][0] * (1 + lm.lam), JtJ[0][1]], [JtJ[1][0], JtJ[1][1] * (1 + lm.lam)]];
      const step = solve2(A, [-Jtr[0], -Jtr[1]]);
      if (!step) {
        lm.lam *= 10;
        continue;
      }
      const q = [lm.p[0] + step[0], lm.p[1] + step[1]];
      const c = cost(q, data);
      if (c < lm.cost) {
        lm.p = q;
        lm.cost = c;
        lm.lam = Math.max(lm.lam / 10, 1e-12);
        break;
      }
      lm.lam *= 10;
    }
    lm.path.push(lm.p.slice());
  }
  // Gauss-Newton, undamped
  const gn = sc.gn;
  if (!gn.dead) {
    const { JtJ, Jtr } = normal(gn.p, data);
    const step = solve2(JtJ, [-Jtr[0], -Jtr[1]]);
    if (!step || !Number.isFinite(step[0]) || !Number.isFinite(step[1])) gn.dead = true;
    else {
      gn.p = [gn.p[0] + step[0], gn.p[1] + step[1]];
      gn.cost = cost(gn.p, data);
      if (!Number.isFinite(gn.cost) || Math.abs(gn.p[0]) > 1e3 || Math.abs(gn.p[1]) > 1e3) gn.dead = true;
      gn.path.push(gn.p.slice());
    }
  }
  // gradient descent with backtracking, 3 inner steps per tick
  const gd = sc.gd;
  for (let k = 0; k < 3; k++) {
    const { Jtr } = normal(gd.p, data);
    const g = [2 * Jtr[0], 2 * Jtr[1]];
    let accepted = false;
    for (let tries = 0; tries < 30; tries++) {
      const q = [gd.p[0] - gd.alpha * g[0], gd.p[1] - gd.alpha * g[1]];
      const c = cost(q, data);
      if (c < gd.cost) {
        gd.p = q;
        gd.cost = c;
        gd.alpha *= 1.2;
        accepted = true;
        break;
      }
      gd.alpha *= 0.5;
    }
    if (!accepted) break;
  }
  gd.path.push(gd.p.slice());
  sc.t += 1;
  if (sc.t >= ITERS) sc.done = true;
  return sc.done;
}

export default function LmViz() {
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
        const ox = 30;
        const oy = 36;
        const pw = 330;
        const ph = 220;
        const X = (a) => ox + (a / A_MAX) * pw;
        const Y = (b) => oy + ph - (b / B_MAX) * ph;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText('fit y = a exp(-b t) to 30 noisy points: the cost surface over (a, b), three optimizers from the same start, one iteration per tick', 12, 18);
        for (let j = 0; j < sc.GY; j++) {
          for (let i = 0; i < sc.GX; i++) {
            const v = Math.log10(sc.grid[j][i] + 1e-9) - Math.log10(sc.floor);
            const shade = Math.max(0, Math.min(1, v / 4));
            ctx.fillStyle = `rgba(93, 162, 255, ${0.05 + 0.35 * (1 - shade)})`;
            ctx.fillRect(ox + (i / sc.GX) * pw, oy + ph - ((j + 1) / sc.GY) * ph, pw / sc.GX + 0.5, ph / sc.GY + 0.5);
          }
        }
        ctx.strokeStyle = `${dim}66`;
        ctx.strokeRect(ox, oy, pw, ph);
        const drawPath = (path, color, width) => {
          ctx.strokeStyle = color;
          ctx.lineWidth = width;
          ctx.beginPath();
          path.forEach(([a, b], k) => {
            const x = Math.max(ox - 4, Math.min(ox + pw + 4, X(a)));
            const y = Math.max(oy - 4, Math.min(oy + ph + 4, Y(b)));
            if (k === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.stroke();
          ctx.lineWidth = 1;
          const [a, b] = path[path.length - 1];
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(Math.max(ox - 4, Math.min(ox + pw + 4, X(a))), Math.max(oy - 4, Math.min(oy + ph + 4, Y(b))), 3.5, 0, Math.PI * 2);
          ctx.fill();
        };
        drawPath(sc.gd.path, heur, 1.5);
        drawPath(sc.gn.path, warn, 1.2);
        drawPath(sc.lm.path, algo, 2);
        ctx.fillStyle = good;
        ctx.beginPath();
        ctx.arc(X(TRUE[0]), Y(TRUE[1]), 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = good;
        ctx.stroke();
        ctx.fillStyle = dim;
        ctx.fillText('a: 0 to 6 →', ox, oy + ph + 14);
        ctx.fillText('b: 0 to 4 ↑', ox + pw - 70, oy + ph + 14);
        const tx = 380;
        const rel = (c) => (c / sc.floor).toFixed(3);
        ctx.fillStyle = algo;
        ctx.fillText(`Levenberg-Marquardt: cost ${rel(sc.lm.cost)}x floor, lambda ${sc.lm.lam.toExponential(0)}`, tx, 50);
        ctx.fillStyle = warn;
        ctx.fillText(`Gauss-Newton: ${sc.gn.dead ? 'DIVERGED' : `cost ${rel(sc.gn.cost)}x floor`}`, tx, 70);
        ctx.fillStyle = heur;
        ctx.fillText(`gradient descent: cost ${rel(sc.gd.cost)}x floor (3 steps/tick)`, tx, 90);
        ctx.fillStyle = good;
        ctx.fillText('green ring: the true (a, b); floor = cost there', tx, 120);
        ctx.fillStyle = dim;
        ctx.fillText('lambda large: a short gradient step; small: the full', tx, 150);
        ctx.fillText('Gauss-Newton step; raised on rejection, lowered on success', tx, 166);
        ctx.fillText('this two-parameter surface is mild: all three can arrive.', tx, 196);
        ctx.fillText('the file, four parameters: LM 98 of 100 far starts', tx, 212);
        ctx.fillText('in 9 iterations; Gauss-Newton 29 (71 diverged);', tx, 228);
        ctx.fillText('gradient descent 81 in 2,936 iterations', tx, 244);
        let line;
        if (s.done) {
          line = `after ${ITERS} iterations: LM at ${rel(sc.lm.cost)}x the floor, Gauss-Newton ${sc.gn.dead ? 'diverged' : `${rel(sc.gn.cost)}x`}, gradient descent ${rel(sc.gd.cost)}x after ${ITERS * 3} steps`;
          ctx.fillStyle = sc.lm.cost <= sc.floor * 1.05 ? good : warn;
        } else {
          line = `iteration ${sc.t}: LM ${rel(sc.lm.cost)}x, Gauss-Newton ${sc.gn.dead ? 'diverged' : `${rel(sc.gn.cost)}x`}, gradient descent ${rel(sc.gd.cost)}x the floor`;
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
          new start
        </button>
        <span className="viz-stat">{snap.line || 'fitting…'}</span>
      </div>
    </>
  );
}
