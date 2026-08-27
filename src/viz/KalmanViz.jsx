import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two acts of one trust ratio. Act one: a drifting truth (green),
// noisy measurements (red dots), and the filter (blue) threading
// between them inside its shrinking uncertainty band while the
// gain readout converges to the Riccati constant. Act two: the
// dial: the same series filtered three ways: gain 1 copies every
// measurement's jitter, gain 0.05 lags the truth by a lap, and the
// Kalman gain: computed, not tuned: tracks tight: running error
// meters price all three.
const W = 640;
const H = 300;
const SEED = 20260827;
const N1 = 110;
const STEP_TICKS = 4;
const END_HOLD = 70;
const Q = 1.0;
const R = 16.0;

function gauss(rand) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function steadyGain(q, r) {
  const pp = (q + Math.sqrt(q * q + 4 * q * r)) / 2;
  return pp / (pp + r);
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const truth = [];
  const meas = [];
  let x = 0;
  for (let i = 0; i < N1; i++) {
    x += gauss(rand) * Math.sqrt(Q);
    truth.push(x);
    meas.push(x + gauss(rand) * Math.sqrt(R));
  }
  // Kalman trace with evolving gain and variance.
  const kf = [];
  let est = 0;
  let p = 100;
  for (const z of meas) {
    p += Q;
    const k = p / (p + R);
    est += k * (z - est);
    p *= 1 - k;
    kf.push({ est, p, k });
  }
  // Fixed-gain traces for act 2, with running squared errors.
  const run = (alpha) => {
    let e = 0;
    let se = 0;
    const out = [];
    truth.forEach((t, i) => {
      e += alpha * (meas[i] - e);
      se += (e - t) ** 2;
      out.push({ est: e, mse: se / (i + 1) });
    });
    return out;
  };
  const kStar = steadyGain(Q, R);
  const jittery = run(1.0);
  const sluggish = run(0.05);
  const tuned = run(kStar);
  let kfSe = 0;
  const kfMse = kf.map((s, i) => {
    kfSe += (s.est - truth[i]) ** 2;
    return kfSe / (i + 1);
  });
  return { truth, meas, kf, kStar, jittery, sluggish, tuned, kfMse };
}

const X = (i) => 46 + (i / (N1 - 1)) * 570;

export default function KalmanViz() {
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
        const len = N1 * STEP_TICKS + END_HOLD;
        if (s.tick >= len) {
          // Hold the finished act for the full rest before the next
          // act begins: every burst of motion earns its two minutes.
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
        const n = done ? N1 : Math.min(Math.floor(s.tick / STEP_TICKS) + 1, N1);
        const finished = done || n >= N1;

        // Vertical scale from the truth's range.
        const lo = Math.min(...sc.truth) - 8;
        const hi = Math.max(...sc.truth) + 8;
        const Y = (v) => 258 - ((v - lo) / (hi - lo)) * 210;

        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';

        const path = (arr, pick, color, width2, upTo) => {
          ctx.strokeStyle = color;
          ctx.lineWidth = width2;
          ctx.beginPath();
          for (let i = 0; i < upTo; i++) {
            const y = Y(pick(arr[i], i));
            if (i === 0) ctx.moveTo(X(i), y);
            else ctx.lineTo(X(i), y);
          }
          ctx.stroke();
        };

        if (actIdx === 0) {
          ctx.fillText('act 1 · truth drifts (green), the sensor lies a little (red), the filter blends by trust', 14, 20);
          // Uncertainty band around the estimate.
          ctx.fillStyle = 'rgba(93,162,255,0.14)';
          ctx.beginPath();
          for (let i = 0; i < n; i++) {
            const y = Y(sc.kf[i].est + 2 * Math.sqrt(sc.kf[i].p));
            if (i === 0) ctx.moveTo(X(i), y);
            else ctx.lineTo(X(i), y);
          }
          for (let i = n - 1; i >= 0; i--) {
            ctx.lineTo(X(i), Y(sc.kf[i].est - 2 * Math.sqrt(sc.kf[i].p)));
          }
          ctx.closePath();
          ctx.fill();
          for (let i = 0; i < n; i++) {
            ctx.fillStyle = warn;
            ctx.globalAlpha = 0.65;
            ctx.beginPath();
            ctx.arc(X(i), Y(sc.meas[i]), 2.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
          }
          path(sc.truth, (v) => v, good, 1.8, n);
          path(sc.kf, (v) => v.est, algo, 2.2, n);

          const k = sc.kf[Math.max(0, n - 1)].k;
          ctx.fillStyle = heur;
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(`gain K = ${k.toFixed(4)} ${finished ? `→ Riccati K* = ${sc.kStar.toFixed(4)}` : '(converging…)'}`, 380, 40);

          let line;
          if (finished) {
            line = `the gain settled at the Riccati root: trust is computed from P and R, never tuned`;
            ctx.fillStyle = good;
          } else {
            line = `step ${n}/${N1}: predict, then correct by K x innovation · band = ±2σ`;
            ctx.fillStyle = ink;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = { line };
        } else {
          ctx.fillText('act 2 · the dial: same series, three gains: jitter, lag, and the computed blend', 14, 20);
          path(sc.truth, (v) => v, good, 1.6, n);
          path(sc.jittery, (v) => v.est, warn, 1.4, n);
          path(sc.sluggish, (v) => v.est, heur, 1.4, n);
          path(sc.kf, (v) => v.est, algo, 2.2, n);

          const i = Math.max(0, n - 1);
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillStyle = warn;
          ctx.fillText(`gain 1.00 (copy sensor): MSE ${sc.jittery[i].mse.toFixed(1)}`, 380, 40);
          ctx.fillStyle = heur;
          ctx.fillText(`gain 0.05 (sluggish):   MSE ${sc.sluggish[i].mse.toFixed(1)}`, 380, 58);
          ctx.fillStyle = algo;
          ctx.fillText(`Kalman K* = ${sc.kStar.toFixed(2)}:      MSE ${sc.kfMse[i].toFixed(1)}`, 380, 76);

          let line;
          if (finished) {
            line = `the computed gain wins: ${sc.kfMse[N1 - 1].toFixed(1)} vs ${sc.jittery[N1 - 1].mse.toFixed(1)} (copy) and ${sc.sluggish[N1 - 1].mse.toFixed(1)} (lag): trust arithmetic beats both instincts`;
            ctx.fillStyle = good;
          } else {
            line = `step ${n}/${N1}: red chases every lie, amber trusts yesterday, blue splits by covariance`;
            ctx.fillStyle = ink;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = {
            line: done
              ? 'the gain is not a preference: it is the ratio of the uncertainties, recomputed forever'
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
          new drift
        </button>
        <span className="viz-stat">
          {snap.line || 'warming the gain…'}
        </span>
      </div>
    </>
  );
}
