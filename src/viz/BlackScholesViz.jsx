import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Monte Carlo against the closed form, live. Each tick draws a batch of
// lognormal terminal prices for S = 100, K = 100, r = 5%, sigma = 20%,
// T = 1, adds them to a histogram with the payoff region shaded, and
// updates the discounted average with its standard error. The closed
// form 10.4506 is the line the estimate must straddle: the invariant
// checked every tick is that the running estimate stays within four
// standard errors of it once a few hundred paths are in. The right panel
// draws the call price against the stock price, with the payoff below it
// and the current spot marked, so the time value is visible.
const W = 640;
const H = 300;
const SEED = 20261010;
const S0 = 100;
const K = 100;
const R = 0.05;
const SIG = 0.2;
const T = 1;
const BATCH = 250;
const TICKS = 60;
const BINS = 40;
const SMIN = 40;
const SMAX = 200;

function ncdf(x) {
  // Abramowitz-Stegun 26.2.17, error under 7.5e-8
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327 * Math.exp(-x * x / 2);
  const p = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x > 0 ? 1 - p : p;
}

export function bsCall(S) {
  const st = SIG * Math.sqrt(T);
  const d1 = (Math.log(S / K) + (R + 0.5 * SIG * SIG) * T) / st;
  return S * ncdf(d1) - K * Math.exp(-R * T) * ncdf(d1 - st);
}

export const CLOSED_FORM = bsCall(S0);

function gauss(rand) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  return { rand, n: 0, sum: 0, sumSq: 0, hist: new Array(BINS).fill(0), tick: 0, done: false, ok: true, est: 0, se: 0, last: 'no paths yet; the closed form says 10.4506' };
}

export function sceneTick(sc) {
  if (sc.done) return true;
  if (sc.tick >= TICKS) {
    sc.done = true;
    sc.last = `${sc.n.toLocaleString()} paths: ${sc.est.toFixed(3)} ± ${sc.se.toFixed(3)} against the closed form ${CLOSED_FORM.toFixed(4)} (${(Math.abs(sc.est - CLOSED_FORM) / sc.se).toFixed(1)} standard errors); the file: 10.500 ± 0.047 at 100,000`;
    return true;
  }
  const drift = (R - 0.5 * SIG * SIG) * T;
  const vol = SIG * Math.sqrt(T);
  for (let i = 0; i < BATCH; i += 1) {
    const s = S0 * Math.exp(drift + vol * gauss(sc.rand));
    const pay = Math.max(s - K, 0);
    sc.sum += pay;
    sc.sumSq += pay * pay;
    sc.n += 1;
    const b = Math.floor(((s - SMIN) / (SMAX - SMIN)) * BINS);
    if (b >= 0 && b < BINS) sc.hist[b] += 1;
  }
  const disc = Math.exp(-R * T);
  const mean = sc.sum / sc.n;
  const vr = Math.max(sc.sumSq / sc.n - mean * mean, 0);
  sc.est = disc * mean;
  sc.se = disc * Math.sqrt(vr / sc.n);
  if (sc.n >= 1000) sc.ok = sc.ok && Math.abs(sc.est - CLOSED_FORM) <= 4 * sc.se;
  sc.tick += 1;
  sc.last = `${sc.n.toLocaleString()} paths: discounted mean payoff ${sc.est.toFixed(3)} ± ${sc.se.toFixed(3)}; closed form ${CLOSED_FORM.toFixed(4)}`;
  return false;
}

export default function BlackScholesViz() {
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
      stepMs: 200,
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
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText(`${BATCH} lognormal terminal prices per tick; amber: in the money; the estimate must straddle the closed form`, 12, 18);
        // left: histogram
        const x0 = 30;
        const y0 = 200;
        const pw = 300;
        const ph = 150;
        const maxBin = Math.max(1, ...sc.hist);
        const bw = pw / BINS;
        for (let b = 0; b < BINS; b += 1) {
          const sLo = SMIN + (b / BINS) * (SMAX - SMIN);
          const h = (sc.hist[b] / maxBin) * ph;
          ctx.fillStyle = sLo >= K ? `${heur}cc` : `${dim}66`;
          ctx.fillRect(x0 + b * bw, y0 - h, bw - 1, h);
        }
        ctx.strokeStyle = `${dim}88`;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x0 + pw, y0);
        ctx.stroke();
        for (const S of [50, 100, 150, 200]) {
          ctx.fillStyle = dim;
          ctx.fillText(String(S), x0 + ((S - SMIN) / (SMAX - SMIN)) * pw - 8, y0 + 14);
        }
        ctx.fillStyle = dim;
        ctx.fillText('terminal price S(T), K = 100', x0, 44);
        // estimate bar vs closed form
        const ey = 236;
        const EX = (v) => x0 + ((v - 8) / 5) * pw;
        ctx.fillStyle = dim;
        ctx.fillText('8', EX(8) - 3, ey + 24);
        ctx.fillText('13', EX(13) - 6, ey + 24);
        ctx.strokeStyle = `${dim}66`;
        ctx.beginPath();
        ctx.moveTo(EX(8), ey + 10);
        ctx.lineTo(EX(13), ey + 10);
        ctx.stroke();
        if (sc.n > 0) {
          ctx.fillStyle = `${algo}66`;
          ctx.fillRect(EX(Math.max(8, sc.est - 2 * sc.se)), ey, EX(Math.min(13, sc.est + 2 * sc.se)) - EX(Math.max(8, sc.est - 2 * sc.se)), 20);
          ctx.fillStyle = algo;
          ctx.fillRect(EX(Math.min(13, Math.max(8, sc.est))) - 1, ey - 2, 3, 24);
        }
        ctx.strokeStyle = good;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(EX(CLOSED_FORM), ey - 6);
        ctx.lineTo(EX(CLOSED_FORM), ey + 26);
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.fillStyle = good;
        ctx.fillText(`closed form ${CLOSED_FORM.toFixed(4)}`, EX(CLOSED_FORM) + 6, ey + 8);
        ctx.fillStyle = sc.ok ? dim : warn;
        ctx.fillText(sc.ok ? 'blue: estimate with its two-sigma band' : 'ESTIMATE OUTSIDE FOUR SIGMA', x0, ey - 10);
        // right: price curve vs S
        const rx = 380;
        const ry = 220;
        const rw = 230;
        const rh = 170;
        const X = (S) => rx + ((S - 50) / 100) * rw;
        const Y = (v) => ry - (v / 55) * rh;
        ctx.strokeStyle = `${dim}88`;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx + rw, ry);
        ctx.stroke();
        ctx.strokeStyle = dim;
        ctx.beginPath();
        for (let S = 50; S <= 150; S += 2) {
          const v = Math.max(S - K, 0);
          if (S === 50) ctx.moveTo(X(S), Y(v));
          else ctx.lineTo(X(S), Y(v));
        }
        ctx.stroke();
        ctx.strokeStyle = algo;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let S = 50; S <= 150; S += 2) {
          const v = bsCall(S);
          if (S === 50) ctx.moveTo(X(S), Y(v));
          else ctx.lineTo(X(S), Y(v));
        }
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.strokeStyle = good;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(X(S0), Y(0));
        ctx.lineTo(X(S0), Y(CLOSED_FORM));
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = dim;
        ctx.fillText('call value vs S (blue) over the payoff', rx, 44);
        ctx.fillText('time value: the gap, largest at the money', rx, 58);
        for (const S of [50, 100, 150]) ctx.fillText(String(S), X(S) - 8, ry + 14);
        let line;
        if (s.done) {
          line = sc.last;
          ctx.fillStyle = sc.ok ? good : warn;
        } else {
          line = sc.last;
          ctx.fillStyle = ink;
        }
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
          new paths
        </button>
        <span className="viz-stat">{snap.line || 'simulating…'}</span>
      </div>
    </>
  );
}
