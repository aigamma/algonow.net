import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// The explicit heat step (forward in time, centered in space) on a rod of 40
// cells, four steps per tick, against the exact solution of the semi-discrete
// system. Scenes alternate between a stable ratio r in [0.35, 0.5] and an
// unstable one in [0.51, 0.6]. The invariant encodes the expected behavior:
// a stable scene must stay within a tolerance of the exact decay and never
// exceed its starting maximum; an unstable scene must pass one by the end.
const W = 640;
const H = 300;
const SEED = 20261010;
const NX = 40;
const HX = 1 / NX;
const PI = Math.PI;
const LAM1 = (2 - 2 * Math.cos(PI * HX)) / (HX * HX);
const STEPS_PER_TICK = 4;

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const unstable = seed % 2 === 1;
  const r = unstable ? 0.51 + rand() * 0.09 : 0.35 + rand() * 0.15;
  const u = [];
  for (let i = 1; i < NX; i += 1) u.push(Math.sin(PI * i * HX));
  u[Math.floor(NX / 2)] += 1e-6; // a seed of round-off size for the top mode
  const total = unstable ? Math.ceil(Math.log(1e7) / Math.log(4 * r - 1) / STEPS_PER_TICK) + 8 : 100;
  return { r, unstable, u, t: 0, step: 0, total, ok: true, done: false, maxErr: 0, peak: 1, last: `r = dt / h^2 = ${r.toFixed(3)}: ${unstable ? 'above the limit of one half' : 'below the limit of one half'}` };
}

function exactMax(sc) {
  return Math.exp(-LAM1 * sc.t);
}

export function sceneTick(sc) {
  if (sc.done) return true;
  const dt = sc.r * HX * HX;
  for (let s = 0; s < STEPS_PER_TICK; s += 1) {
    const u = sc.u;
    const nxt = u.map((v, i) => v + sc.r * ((i > 0 ? u[i - 1] : 0) - 2 * v + (i < u.length - 1 ? u[i + 1] : 0)));
    sc.u = nxt;
    sc.t += dt;
    sc.step += 1;
  }
  const peak = Math.max(...sc.u.map(Math.abs));
  sc.peak = peak;
  const ex = exactMax(sc);
  const err = Math.max(...sc.u.map((v, i) => Math.abs(v - ex * Math.sin(PI * (i + 1) * HX))));
  sc.maxErr = Math.max(sc.maxErr, err);
  if (!sc.unstable) sc.ok = sc.ok && peak <= 1 + 1e-6 && err < 2e-3;
  const tickNo = Math.ceil(sc.step / STEPS_PER_TICK);
  if (tickNo >= sc.total) {
    if (sc.unstable) sc.ok = sc.ok && peak > 1;
    sc.done = true;
    sc.last = sc.unstable
      ? `done: r = ${sc.r.toFixed(3)}, max |u| = ${peak.toExponential(2)} after ${sc.step} steps (expected to blow up): ${sc.ok ? 'yes' : 'NO'}`
      : `done: r = ${sc.r.toFixed(3)}, max |u| = ${peak.toFixed(4)} against exact ${ex.toFixed(4)} after ${sc.step} steps; worst error ${sc.maxErr.toExponential(1)}: ${sc.ok ? 'stable as the limit promises' : 'INVARIANT BROKEN'}`;
    return true;
  }
  sc.last = `step ${sc.step}: max |u| ${peak < 100 ? peak.toFixed(4) : peak.toExponential(2)}, exact ${ex.toFixed(4)}, error ${err < 1 ? err.toExponential(1) : 'exploding'}`;
  return false;
}

export default function FiniteDifferenceViz() {
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
      stepMs: 120,
      init: () => ({ scene: makeScene(SEED + cycle.current), done: false, rest: 0, stopAtRest: isStill() }),
      tick: (s) => {
        if (s.done) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s) * 6) {
            cycle.current += 1;
            Object.assign(s, { scene: makeScene(SEED + cycle.current), done: false, rest: 0 });
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
        ctx.fillText('explicit heat step on 40 cells: blue is the grid, amber the exact decay; r above one half lets the top mode grow', 12, 18);
        const x0 = 40;
        const x1 = 600;
        const yBase = 230;
        const scale = 150;
        ctx.strokeStyle = `${dim}66`;
        ctx.beginPath();
        ctx.moveTo(x0, yBase);
        ctx.lineTo(x1, yBase);
        ctx.stroke();
        const ex = exactMax(sc);
        ctx.strokeStyle = heur;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i <= NX; i += 1) {
          const x = x0 + (i / NX) * (x1 - x0);
          const y = yBase - scale * ex * Math.sin(PI * i * HX);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.strokeStyle = sc.unstable && sc.peak > 1.05 ? warn : algo;
        ctx.beginPath();
        ctx.moveTo(x0, yBase);
        sc.u.forEach((v, i) => {
          const x = x0 + ((i + 1) / NX) * (x1 - x0);
          const clamped = Math.max(-1.3, Math.min(1.3, v));
          ctx.lineTo(x, yBase - scale * clamped);
        });
        ctx.lineTo(x1, yBase);
        ctx.stroke();
        ctx.fillStyle = algo;
        sc.u.forEach((v, i) => {
          const x = x0 + ((i + 1) / NX) * (x1 - x0);
          const clamped = Math.max(-1.3, Math.min(1.3, v));
          ctx.fillRect(x - 1.5, yBase - scale * clamped - 1.5, 3, 3);
        });
        ctx.fillStyle = dim;
        ctx.fillText(`r = ${sc.r.toFixed(3)} (limit 0.5); step ${sc.step}; amplification of the top mode per step |1 - 4r| = ${Math.abs(1 - 4 * sc.r).toFixed(3)}`, 12, 40);
        ctx.fillText('the file: r = 0.49 decays to 0.0107 (exact 0.0107); r = 0.51 reaches 1.9e10 in 1,500 steps', 12, 56);
        ctx.fillStyle = sc.ok ? good : warn;
        ctx.fillText(sc.ok ? (sc.unstable ? 'expected: the two percent overshoot explodes' : 'invariant: within 2e-3 of the exact decay, never above the start') : 'INVARIANT BROKEN', 12, 72);
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
          new ratio
        </button>
        <span className="viz-stat">{snap.line || 'stepping the rod…'}</span>
      </div>
    </>
  );
}
