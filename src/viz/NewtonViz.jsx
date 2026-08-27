import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two acts on real curves with real tangents. Act one: x² − 2 from
// x₀ = 2: each tangent (amber) drops to its zero crossing, the guess
// slides, and the error ladder on the right loses half its exponent
// per step: quadratic convergence as motion. Act two: x³ − 2x + 2
// from 0: the same confident tangents bounce 0 → 1 → 0 forever: the
// 2-cycle, drawn until the point is unmissable.
const W = 640;
const H = 300;
const SEED = 20260827;
const STEP_TICKS = 24;
const ACT1_HOLD = 46;
const BOUNCES = 6;
const BOUNCE_TICKS = 16;
const ACT2_HOLD = 60;

const ACT1 = {
  f: (x) => x * x - 2,
  df: (x) => 2 * x,
  x0: 2.0,
  xmin: 0.4,
  xmax: 2.3,
  ymin: -2.2,
  ymax: 3.4,
  note: 'act 1 · x² − 2 from x₀ = 2: the tangent strides home',
};
const ACT2 = {
  f: (x) => x * x * x - 2 * x + 2,
  df: (x) => 3 * x * x - 2,
  x0: 0.0,
  xmin: -1.9,
  xmax: 1.9,
  ymin: -1.6,
  ymax: 4.4,
  note: 'act 2 · x³ − 2x + 2 from 0: the same stride, cycling forever',
};

function newtonSteps(act, count) {
  const steps = [];
  let x = act.x0;
  for (let i = 0; i < count; i++) {
    const fx = act.f(x);
    const d = act.df(x);
    const nx = x - fx / d;
    steps.push({ x, fx, nx });
    x = nx;
  }
  return steps;
}

export default function NewtonViz() {
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
      stepMs: 45,
      init: () => ({
        seedBump: mulberry32(SEED + cycle.current)(),
        act1: newtonSteps(ACT1, 5),
        act2: newtonSteps(ACT2, BOUNCES),
        act: 0,
        tick: 0,
        rest: 0,
        stopAtRest: isStill(),
      }),
      tick: (s) => {
        const totals = [5 * STEP_TICKS + ACT1_HOLD, BOUNCES * BOUNCE_TICKS + ACT2_HOLD];
        if (s.act >= 2) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            Object.assign(s, { act: 0, tick: 0, rest: 0 });
          }
          return true;
        }
        s.tick += 1;
        if (s.tick >= totals[s.act]) {
          // Hold the finished act for the full rest before the next
          // act begins: every burst of motion earns its two minutes.
          s.tick = totals[s.act];
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

        const done = s.act >= 2;
        const actIdx = done ? 1 : s.act;
        const act = actIdx === 0 ? ACT1 : ACT2;
        const steps = actIdx === 0 ? s.act1 : s.act2;
        const perStep = actIdx === 0 ? STEP_TICKS : BOUNCE_TICKS;
        const tick = done ? steps.length * perStep : s.tick;
        const stepIdx = Math.min(Math.floor(tick / perStep), steps.length - 1);
        const within = tick - stepIdx * perStep;
        const finished = done || tick >= steps.length * perStep;

        const X = (v) => 40 + ((v - act.xmin) / (act.xmax - act.xmin)) * (W - 80);
        const Y = (v) => 250 - ((v - act.ymin) / (act.ymax - act.ymin)) * 216;

        // Axis and curve.
        ctx.strokeStyle = '#2a3450';
        ctx.beginPath();
        ctx.moveTo(40, Y(0));
        ctx.lineTo(W - 40, Y(0));
        ctx.stroke();
        ctx.strokeStyle = algo;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let px = 0; px <= W - 80; px += 3) {
          const xv = act.xmin + (px / (W - 80)) * (act.xmax - act.xmin);
          const yv = act.f(xv);
          const yy = Y(Math.max(act.ymin, Math.min(act.ymax, yv)));
          if (px === 0) ctx.moveTo(40 + px, yy);
          else ctx.lineTo(40 + px, yy);
        }
        ctx.stroke();

        // Completed tangents (faint) and the active one.
        const upTo = finished ? steps.length : stepIdx + 1;
        for (let i = 0; i < upTo; i++) {
          const st = steps[i];
          const isActive = !finished && i === stepIdx;
          const frac = isActive ? Math.min(1, within / (perStep * 0.6)) : 1;
          const x1 = X(st.x);
          const y1 = Y(st.fx);
          const x2 = X(st.nx);
          const y2 = Y(0);
          ctx.strokeStyle = isActive ? heur : actIdx === 1 ? `${warn}55` : `${heur}44`;
          ctx.lineWidth = isActive ? 2 : 1.2;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x1 + (x2 - x1) * frac, y1 + (y2 - y1) * frac);
          ctx.stroke();
          // Vertical from axis up to the curve at the new point.
          if (frac >= 1 && i < upTo - (finished ? 0 : 1)) {
            ctx.strokeStyle = '#2a345088';
            ctx.beginPath();
            ctx.moveTo(x2, Y(0));
            ctx.lineTo(x2, Y(act.f(st.nx)));
            ctx.stroke();
          }
          ctx.fillStyle = isActive ? good : actIdx === 1 ? warn : good;
          ctx.beginPath();
          ctx.arc(x1, Y(0), 3.6, 0, Math.PI * 2);
          ctx.fill();
        }

        // Captions.
        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText(act.note, 14, 20);
        let line;
        if (actIdx === 0) {
          const errs = s.act1.map((st) => Math.abs(st.nx - Math.SQRT2));
          const shown = errs.slice(0, finished ? 5 : stepIdx + (within > perStep * 0.6 ? 1 : 0));
          ctx.fillStyle = good;
          ctx.font = '11px ui-monospace, monospace';
          shown.forEach((e, i) => {
            ctx.fillText(`step ${i + 1}: err ${e.toExponential(1)}`, W - 190, 44 + i * 18);
          });
          line = finished
            ? 'five strides: 1.6e-12 · the exponent doubles per step'
            : `stride ${Math.min(stepIdx + 1, 5)} of 5`;
          if (finished) ctx.fillStyle = good;
          else ctx.fillStyle = ink;
        } else {
          line = finished
            ? 'six strides later: still 0 → 1 → 0: the 2-cycle never ends'
            : `bounce ${Math.min(stepIdx + 1, BOUNCES)}: x = ${steps[stepIdx].x.toFixed(0)} → ${steps[stepIdx].nx.toFixed(0)}`;
          ctx.fillStyle = finished ? warn : ink;
        }
        ctx.font = '12px ui-monospace, monospace';
        ctx.fillText(line, 14, H - 12);

        statsRef.current = {
          line: done
            ? 'the same formula, two fates: the basin decides which one you get'
            : line,
        };
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
          replay
        </button>
        <span className="viz-stat">
          {snap.line || 'drawing the first tangent…'}
        </span>
      </div>
    </>
  );
}
