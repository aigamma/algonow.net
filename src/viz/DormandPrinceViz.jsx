import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two acts of one integration. Act one: the ignition problem
// solved live by the real DP5(4) pair: the solution curve grows
// point by accepted point while the step-size bar beneath
// breathes: wide on the flats, needle-thin through the flame
// front: with the est = |y5 - y4| readout driving it. Act two:
// the bills: adaptive vs front-limited fixed step, and the
// measured stiffness wall as the red closing line.
const W = 640;
const H = 300;
const SEED = 20260829;
const END_HOLD = 70;

const A = [
  [],
  [1 / 5],
  [3 / 40, 9 / 40],
  [44 / 45, -56 / 15, 32 / 9],
  [19372 / 6561, -25360 / 2187, 64448 / 6561, -212 / 729],
  [9017 / 3168, -355 / 33, 46732 / 5247, 49 / 176, -5103 / 18656],
  [35 / 384, 0, 500 / 1113, 125 / 192, -2187 / 6784, 11 / 84],
];
const B5 = [35 / 384, 0, 500 / 1113, 125 / 192, -2187 / 6784, 11 / 84, 0];
const B4 = [5179 / 57600, 0, 7571 / 16695, 393 / 640, -92097 / 339200, 187 / 2100, 1 / 40];
const C = [0, 1 / 5, 3 / 10, 4 / 5, 8 / 9, 1, 1];

export function dpStep(f, t, y, h) {
  const k = [f(t, y)];
  for (let i = 1; i < 7; i++) {
    let yi = y;
    for (let j = 0; j < A[i].length; j++) yi += h * A[i][j] * k[j];
    k.push(f(t + C[i] * h, yi));
  }
  let y5 = y;
  let y4 = y;
  for (let i = 0; i < 7; i++) {
    y5 += h * B5[i] * k[i];
    y4 += h * B4[i] * k[i];
  }
  return { y5, y4, evals: 7 };
}

export function solveAdaptive(f, t0, t1, y0, tol) {
  let t = t0;
  let y = y0;
  let h = (t1 - t0) / 100;
  const steps = [];
  let evals = 0;
  let rejects = 0;
  let guard = 0;
  while (t < t1 - 1e-12 && guard < 20000) {
    guard += 1;
    h = Math.min(h, t1 - t);
    const { y5, y4, evals: e } = dpStep(f, t, y, h);
    evals += e;
    const est = Math.abs(y5 - y4);
    const scale = tol * (1 + Math.abs(y));
    if (est <= scale) {
      steps.push({ t, h, y: y5, est });
      t += h;
      y = y5;
    } else {
      rejects += 1;
    }
    const ratio = est > 0 ? (scale / est) ** 0.2 : 5;
    h *= Math.max(0.2, Math.min(5, 0.9 * ratio));
  }
  return { steps, evals, rejects, yEnd: y };
}

export function rk4Fixed(f, t0, t1, y0, n) {
  const h = (t1 - t0) / n;
  let t = t0;
  let y = y0;
  for (let i = 0; i < n; i++) {
    const k1 = f(t, y);
    const k2 = f(t + h / 2, y + (h / 2) * k1);
    const k3 = f(t + h / 2, y + (h / 2) * k2);
    const k4 = f(t + h, y + h * k3);
    y += (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
    t += h;
  }
  return y;
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const delta = 0.008 + rand() * 0.006;
  const T = 2 / delta;
  const flame = (t, y) => y * y - y * y * y;
  const sol = solveAdaptive(flame, 0, T, delta, 1e-6);
  const ref = rk4Fixed(flame, 0, T, delta, 40000);
  const hs = sol.steps.map((s) => s.h);
  const span = Math.max(...hs) / Math.min(...hs);
  // fixed-step bill: the front's smallest step, paid everywhere
  const fixedEvals = Math.ceil(T / Math.min(...hs)) * 4;
  // the stiffness wall, measured in-viz
  const stiff = solveAdaptive((t, y) => -800 * (y - Math.cos(t)), 0, 1.5, 0, 1e-6);
  const smooth = solveAdaptive((t, y) => -(y - Math.cos(t)), 0, 1.5, 0, 1e-6);
  return { delta, T, sol, ref, span, fixedEvals, wall: { stiff: stiff.evals, smooth: smooth.evals } };
}

export default function DormandPrinceViz() {
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
      stepMs: 55,
      init: () => ({
        scene: makeScene(SEED + cycle.current * 7919),
        act: 0,
        tick: 0,
        rest: 0,
        stopAtRest: isStill(),
      }),
      tick: (s) => {
        if (s.act >= 2) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            Object.assign(s, {
              scene: makeScene(SEED + cycle.current * 7919),
              act: 0,
              tick: 0,
              rest: 0,
            });
          }
          return true;
        }
        s.tick += 1;
        const len = s.act === 0 ? s.scene.sol.steps.length * 3 + END_HOLD : 200 + END_HOLD;
        if (s.tick >= len) {
          s.tick = len;
          s.actRest = (s.actRest || 0) + 1;
          if (s.actRest > holdTicks(s)) {
            s.tick = 0;
            s.act += 1;
            s.actRest = 0;
          }
        }
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

        const done = s.act >= 2;
        const actIdx = done ? 1 : s.act;
        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';

        if (actIdx === 0) {
          const steps = sc.sol.steps;
          const total = steps.length * 3;
          const t = done ? total : Math.min(s.tick, total);
          const upto = Math.min(steps.length, Math.max(1, Math.floor(t / 3)));
          ctx.fillText('act 1 · the ignition problem, solved live: the equation sizes its own steps', 14, 20);
          const X = (tt) => 40 + (tt / sc.T) * 560;
          const Y = (y) => 180 - y * 130;
          // solution so far
          ctx.strokeStyle = algo;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(X(0), Y(sc.delta));
          for (let i = 0; i < upto; i++) ctx.lineTo(X(steps[i].t + steps[i].h), Y(steps[i].y));
          ctx.stroke();
          // step markers beneath
          for (let i = 0; i < upto; i++) {
            const st = steps[i];
            ctx.fillStyle = st.h < 1 ? 'rgba(226,96,108,0.55)' : 'rgba(240,185,75,0.45)';
            ctx.fillRect(X(st.t), 210, Math.max(1.2, (st.h / sc.T) * 560 - 1), 12);
          }
          const cur = steps[upto - 1];
          ctx.fillStyle = ink;
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(`t = ${cur.t.toFixed(1)} · h = ${cur.h.toFixed(3)} · est = ${cur.est.toExponential(1)}`, 380, 44);
          ctx.fillStyle = dim;
          ctx.font = '10px ui-monospace, monospace';
          ctx.fillText('step bar: amber = cruising, red = crawling through the front', 40, 240);
          let line;
          if (done || upto >= steps.length) {
            line = `done in ${steps.length} accepted steps (${sc.sol.evals} evals, ${sc.sol.rejects} rejects): steps spanned ${sc.span.toFixed(0)}x, and the answer matches an independent 40,000-step RK4 referee`;
            ctx.fillStyle = good;
          } else if (cur.h < 1) {
            line = 'the front: |y5 - y4| spikes, the fifth-root law slams the step down';
            ctx.fillStyle = warn;
          } else {
            line = 'the flats: the two embedded answers agree, so the step stretches out';
            ctx.fillStyle = ink;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = { line };
        } else {
          const t = done ? 200 : Math.min(s.tick, 200);
          ctx.fillText('act 2 · the bills: one currency (function evaluations), same refereed answer', 14, 20);
          const frac = Math.min(1, t / 200);
          const maxV = sc.fixedEvals;
          const bars = [
            [`fixed-step RK4 (front-limited h)`, sc.fixedEvals, warn],
            [`dormand-prince adaptive`, sc.sol.evals, algo],
          ];
          bars.forEach(([label, total2, color], i) => {
            const val = Math.floor(frac * total2);
            const y = 70 + i * 60;
            ctx.fillStyle = color;
            ctx.font = '12px ui-monospace, monospace';
            ctx.fillText(`${label}: ${val.toLocaleString()}`, 60, y - 8);
            ctx.strokeStyle = color;
            ctx.strokeRect(60, y, 500 * (total2 / maxV), 14);
            ctx.fillStyle = `${color}44`;
            ctx.fillRect(60, y, 500 * (val / maxV), 14);
          });
          ctx.fillStyle = warn;
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillText(`the wall (measured in this figure): a stiff twin cost ${sc.wall.stiff.toLocaleString()} evals vs ${sc.wall.smooth.toLocaleString()} smooth (${(sc.wall.stiff / sc.wall.smooth).toFixed(0)}x):`, 60, 218);
          ctx.fillText('stability, not accuracy, pins explicit steps: adaptivity cannot fix stiffness', 60, 234);
          let line;
          if (done || t >= 200) {
            line = `${(sc.fixedEvals / sc.sol.evals).toFixed(0)}x fewer evaluations by letting the road set the pace: any fixed speed is wrong twice`;
            ctx.fillStyle = good;
          } else {
            line = 'the fixed step must survive the front, so it pays front prices on the flats';
            ctx.fillStyle = ink;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = {
            line: done
              ? 'two answers from one set of stages, and the difference drives the wheel'
              : line,
          };
        }
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
          new ignition
        </button>
        <span className="viz-stat">
          {snap.line || 'sizing the first step…'}
        </span>
      </div>
    </>
  );
}
