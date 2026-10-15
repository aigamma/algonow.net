import DiagramViewport from '../components/DiagramViewport.jsx';
import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Holt-Winters additive smoothing running over a synthetic monthly series
// with a drifting level, a twelve-month pattern, and noise. One month per
// tick: the level, trend, and seasonal index are updated, the one-step
// error is shown, and the twelve-month forecast from the current state
// is drawn ahead of the data. After eight years the last two years are
// held out and the forecast is scored against the seasonal naive one.
const W = 640;
const H = 300;
const SEED = 20260926;
const M = 12;
const TRAIN = 96;
const HOLD = 24;
const ALPHA = 0.2;
const BETA = 0.05;
const GAMMA = 0.3;

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const level0 = 80 + rand() * 40;
  const drift = 0.2 + rand() * 0.6;
  const amp = 10 + rand() * 15;
  const sigma = 2 + rand() * 3;
  const pattern = [];
  for (let i = 0; i < M; i++) pattern.push(amp * Math.sin((2 * Math.PI * i) / M) + 0.4 * amp * Math.cos((4 * Math.PI * i) / M));
  const y = [];
  const truth = [];
  for (let t = 0; t < TRAIN + HOLD; t++) {
    const clean = level0 + drift * t + pattern[t % M];
    truth.push(clean);
    // Box-Muller from two uniforms
    const u1 = Math.max(rand(), 1e-9);
    const u2 = rand();
    y.push(clean + sigma * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2));
  }
  let level = 0;
  for (let i = 0; i < M; i++) level += y[i] / M;
  let second = 0;
  for (let i = M; i < 2 * M; i++) second += y[i] / M;
  const trend = (second - level) / M;
  const season = [];
  for (let i = 0; i < M; i++) season.push(y[i] - level);
  return { y, truth, pattern, drift, sigma, level, trend, season, t: 0, sse: 0, lastErr: 0, forecast: [], done: false, score: null };
}

function forecastFrom(sc, h) {
  const out = [];
  for (let k = 1; k <= h; k++) out.push(sc.level + k * sc.trend + sc.season[(sc.t + k - 1) % M]);
  return out;
}

export function sceneTick(sc) {
  if (sc.done) return true;
  if (sc.t >= TRAIN) {
    const fc = forecastFrom(sc, HOLD);
    const actual = sc.y.slice(TRAIN);
    let e1 = 0;
    let e2 = 0;
    for (let k = 0; k < HOLD; k++) {
      e1 += (actual[k] - fc[k]) ** 2;
      const naive = sc.y[TRAIN - M + (k % M)];
      e2 += (actual[k] - naive) ** 2;
    }
    sc.forecast = fc;
    sc.score = { hw: Math.sqrt(e1 / HOLD), naive: Math.sqrt(e2 / HOLD) };
    sc.done = true;
    return true;
  }
  const t = sc.t;
  const s = sc.season[t % M];
  const f = sc.level + sc.trend + s;
  const e = sc.y[t] - f;
  sc.lastErr = e;
  if (t >= M) sc.sse += e * e;
  const prev = sc.level;
  sc.level = ALPHA * (sc.y[t] - s) + (1 - ALPHA) * (sc.level + sc.trend);
  sc.trend = BETA * (sc.level - prev) + (1 - BETA) * sc.trend;
  sc.season[t % M] = GAMMA * (sc.y[t] - sc.level) + (1 - GAMMA) * s;
  sc.t += 1;
  sc.forecast = forecastFrom(sc, M);
  return false;
}

export default function HoltWintersViz() {
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
      stepMs: 140,
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
        const pw = 390;
        const ph = 210;
        const n = TRAIN + HOLD;
        let lo = Infinity;
        let hi = -Infinity;
        for (const v of sc.y) {
          lo = Math.min(lo, v);
          hi = Math.max(hi, v);
        }
        lo -= 10;
        hi += 10;
        const X = (t) => ox + (t / n) * pw;
        const Y = (v) => oy + ph - ((v - lo) / (hi - lo)) * ph;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText('monthly level, trend and season updates; blue: the forecast from now', 12, 18);
        ctx.fillStyle = `${dim}18`;
        ctx.fillRect(X(TRAIN), oy, X(n) - X(TRAIN), ph);
        ctx.strokeStyle = `${dim}66`;
        ctx.strokeRect(ox, oy, pw, ph);
        // observed data up to t (and the held-out years once done)
        const shown = s.done ? n : sc.t;
        ctx.strokeStyle = ink;
        ctx.beginPath();
        for (let t = 0; t < shown; t++) {
          if (t === 0) ctx.moveTo(X(t), Y(sc.y[t]));
          else ctx.lineTo(X(t), Y(sc.y[t]));
        }
        ctx.stroke();
        // level line (deseasonalized state) as a short amber segment and the forecast
        if (sc.t > 0) {
          ctx.strokeStyle = heur;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(X(sc.t - 1), Y(sc.level));
          ctx.lineTo(X(sc.t - 1 + 6), Y(sc.level + 6 * sc.trend));
          ctx.stroke();
          ctx.lineWidth = 1;
          ctx.strokeStyle = algo;
          ctx.beginPath();
          sc.forecast.forEach((v, k) => {
            const t = sc.t + k;
            if (k === 0) ctx.moveTo(X(t), Y(v));
            else ctx.lineTo(X(t), Y(v));
          });
          ctx.stroke();
        }
        if (s.done && sc.score) {
          ctx.fillStyle = good;
          ctx.fillText(`held-out RMSE: HW ${sc.score.hw.toFixed(1)}, seasonal naive ${sc.score.naive.toFixed(1)}`, ox, oy + ph + 14);
        }
        // seasonal indices as bars on the right
        const bx = 450;
        const by = 163;
        ctx.fillStyle = dim;
        ctx.fillText('seasonal index by month', bx - 4, 50);
        const sMax = Math.max(1, ...sc.season.map((v) => Math.abs(v)), ...sc.pattern.map((v) => Math.abs(v)));
        for (let i = 0; i < M; i++) {
          const hgt = (sc.season[i] / sMax) * 38;
          const tgt = (sc.pattern[i] / sMax) * 38;
          ctx.fillStyle = `${heur}cc`;
          ctx.fillRect(bx + i * 10, by - Math.max(0, hgt), 6, Math.abs(hgt));
          ctx.fillStyle = `${good}99`;
          ctx.fillRect(bx + i * 10 + 6, by - Math.max(0, tgt), 2, Math.abs(tgt));
        }
        ctx.fillStyle = dim;
        ctx.fillText('amber: fit; green: truth', bx - 4, by + 52);
        ctx.fillStyle = ink;
        ctx.fillText(`month ${sc.t} of ${TRAIN}`, bx - 4, 70);
        ctx.fillStyle = heur;
        ctx.fillText(`level ${sc.level.toFixed(1)}, trend ${sc.trend.toFixed(2)}`, bx - 4, 86);
        ctx.fillStyle = dim;
        ctx.fillText(`true drift ${sc.drift.toFixed(2)}, noise ${sc.sigma.toFixed(1)}`, bx - 4, 100);
        ctx.fillStyle = Math.abs(sc.lastErr) > 2.5 * sc.sigma ? warn : dim;
        ctx.fillText(`one-step error ${sc.lastErr >= 0 ? '+' : ''}${sc.lastErr.toFixed(1)}`, bx - 4, 116);
        ctx.fillStyle = dim;
        ctx.fillText(`α ${ALPHA}  β ${BETA}  γ ${GAMMA}`, bx - 4, 232);
        ctx.fillText('the file: 1.17x the noise floor,', bx - 4, 246);
        ctx.fillText('Holt 109.9 vs 3.3', bx - 4, 262);
        let line;
        if (s.done && sc.score) {
          line = `${HOLD}-month held-out RMSE: HW ${sc.score.hw.toFixed(2)} vs seasonal naive ${sc.score.naive.toFixed(2)}; noise ${sc.sigma.toFixed(1)}`;
          ctx.fillStyle = sc.score.hw < sc.score.naive ? good : heur;
        } else {
          line = `month ${sc.t}: one-step RMSE so far ${sc.t > M ? Math.sqrt(sc.sse / (sc.t - M)).toFixed(2) : '·'}; level ${sc.level.toFixed(1)}, trend ${sc.trend.toFixed(2)} a month`;
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
      <DiagramViewport width={W}>
        <canvas ref={canvasRef} style={{ aspectRatio: `${W} / ${H}` }} aria-hidden="true" />
      </DiagramViewport>
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
