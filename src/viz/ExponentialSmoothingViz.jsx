import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Simple exponential smoothing over a seeded local level series (a random
// walk seen through noise), one observation per tick. The level moves a
// fraction alpha toward each value; the bars show the geometric weights the
// current level puts on the past. Invariant checked every tick: the recursive
// level equals the unrolled weighted sum to 1e-9. The running one-step error
// of smoothing is scored against the naive forecast and a four-value moving
// average.
const W = 640;
const H = 300;
const SEED = 20261010;
const N = 120;
const K = 4;

function gauss(rand) {
  const u1 = Math.max(rand(), 1e-9);
  const u2 = rand();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const q = 0.08 + rand() * 0.6; // signal to noise ratio of the local level model
  const alpha = (-q + Math.sqrt(q * q + 4 * q)) / 2; // the steady-state Kalman gain
  const sigma = 1;
  const y = [];
  let mu = 100;
  for (let t = 0; t < N; t += 1) {
    mu += Math.sqrt(q) * sigma * gauss(rand);
    y.push(mu + sigma * gauss(rand));
  }
  return { y, q, alpha, t: 1, level: y[0], levels: [y[0]], sse: 0, sseNaive: 0, sseMa: 0, scored: 0, ok: true, done: false, last: `q = ${q.toFixed(2)}: alpha = ${alpha.toFixed(3)} (the Kalman gain)` };
}

export function sceneTick(sc) {
  if (sc.done) return true;
  const { y, alpha } = sc;
  const t = sc.t;
  if (t >= N) {
    sc.done = true;
    const r = Math.sqrt(sc.sse / sc.scored);
    const rn = Math.sqrt(sc.sseNaive / sc.scored);
    const rm = Math.sqrt(sc.sseMa / sc.scored);
    sc.last = `done: one-step RMSE smoothing ${r.toFixed(3)}, moving average ${rm.toFixed(3)}, naive ${rn.toFixed(3)}; level = unrolled sum: ${sc.ok ? 'yes' : 'NO'}`;
    return true;
  }
  // forecast y[t] with the level after y[0..t-1], then update
  const f = sc.level;
  const e = y[t] - f;
  if (t >= K) {
    sc.sse += e * e;
    sc.sseNaive += (y[t] - y[t - 1]) ** 2;
    let m = 0;
    for (let k = 1; k <= K; k += 1) m += y[t - k];
    sc.sseMa += (y[t] - m / K) ** 2;
    sc.scored += 1;
  }
  sc.level = alpha * y[t] + (1 - alpha) * sc.level;
  sc.levels.push(sc.level);
  // invariant: the recursion equals alpha sum (1 - alpha)^k y[t-k] + (1 - alpha)^(t+1) y[0]
  let acc = (1 - alpha) ** (t + 1) * y[0];
  for (let k = 0; k <= t; k += 1) acc += alpha * (1 - alpha) ** k * y[t - k];
  if (Math.abs(acc - sc.level) > 1e-9) sc.ok = false;
  sc.t += 1;
  sc.last = `t = ${sc.t}: level ${sc.level.toFixed(2)} (error ${e >= 0 ? '+' : ''}${e.toFixed(2)}); alpha ${alpha.toFixed(3)}, mean lag ${((1 - alpha) / alpha).toFixed(2)} values`;
  return false;
}

export default function ExponentialSmoothingViz() {
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
      stepMs: 110,
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
        const ox = 36;
        const oy = 30;
        const pw = 420;
        const ph = 190;
        let lo = Infinity;
        let hi = -Infinity;
        for (const v of sc.y) {
          lo = Math.min(lo, v);
          hi = Math.max(hi, v);
        }
        lo -= 1;
        hi += 1;
        const X = (t) => ox + (t / N) * pw;
        const Y = (v) => oy + ph - ((v - lo) / (hi - lo)) * ph;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText('a level seen through noise, one value per tick; blue: the smoothed level; bars: the geometric weights it puts on the past', 12, 18);
        ctx.strokeStyle = `${dim}66`;
        ctx.strokeRect(ox, oy, pw, ph);
        ctx.strokeStyle = ink;
        ctx.beginPath();
        for (let t = 0; t < sc.t; t += 1) {
          if (t === 0) ctx.moveTo(X(t), Y(sc.y[t]));
          else ctx.lineTo(X(t), Y(sc.y[t]));
        }
        ctx.stroke();
        ctx.strokeStyle = algo;
        ctx.lineWidth = 2;
        ctx.beginPath();
        sc.levels.forEach((v, t) => {
          if (t === 0) ctx.moveTo(X(t), Y(v));
          else ctx.lineTo(X(t), Y(v));
        });
        ctx.stroke();
        ctx.lineWidth = 1;
        // the weights on the last twelve observations, drawn under the cursor
        const bx = X(Math.max(0, sc.t - 1));
        for (let k = 0; k < 12; k += 1) {
          const w = sc.alpha * (1 - sc.alpha) ** k;
          const x = bx - k * 6;
          if (x < ox) break;
          ctx.fillStyle = `${heur}${k === 0 ? 'ff' : 'aa'}`;
          ctx.fillRect(x - 2, oy + ph + 4, 4, Math.max(1, w * 40));
        }
        ctx.fillStyle = dim;
        ctx.fillText(`weights alpha (1 - alpha)^k: ${sc.alpha.toFixed(3)}, ${(sc.alpha * (1 - sc.alpha)).toFixed(3)}, ${(sc.alpha * (1 - sc.alpha) ** 2).toFixed(3)}, ... summing to one`, ox, oy + ph + 60);
        const rx = 470;
        ctx.fillStyle = ink;
        ctx.fillText(`t = ${sc.t} of ${N}`, rx, 50);
        ctx.fillStyle = heur;
        ctx.fillText(`alpha ${sc.alpha.toFixed(3)} for q = ${sc.q.toFixed(2)}`, rx, 68);
        ctx.fillStyle = dim;
        ctx.fillText(`mean lag ${((1 - sc.alpha) / sc.alpha).toFixed(2)} values`, rx, 84);
        if (sc.scored > 0) {
          const r = Math.sqrt(sc.sse / sc.scored);
          const rn = Math.sqrt(sc.sseNaive / sc.scored);
          const rm = Math.sqrt(sc.sseMa / sc.scored);
          ctx.fillStyle = algo;
          ctx.fillText(`smoothing RMSE ${r.toFixed(3)}`, rx, 110);
          ctx.fillStyle = dim;
          ctx.fillText(`moving average (4) ${rm.toFixed(3)}`, rx, 126);
          ctx.fillText(`naive ${rn.toFixed(3)}`, rx, 142);
        }
        ctx.fillStyle = sc.ok ? good : warn;
        ctx.fillText(sc.ok ? 'level = unrolled sum to 1e-9' : 'INVARIANT BROKEN', rx, 168);
        ctx.fillStyle = dim;
        ctx.fillText('the file: 1.284 against', rx, 200);
        ctx.fillText('1.321 and 1.499, floor 1.281', rx, 216);
        ctx.fillStyle = s.done ? (sc.ok ? good : warn) : ink;
        ctx.fillText(sc.last.length > 96 ? `${sc.last.slice(0, 95)}…` : sc.last, 12, H - 8);
        statsRef.current = { line: sc.last };
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
          new series
        </button>
        <span className="viz-stat">{snap.line || 'smoothing…'}</span>
      </div>
    </>
  );
}
