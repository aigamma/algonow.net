import DiagramViewport from '../components/DiagramViewport.jsx';
import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Estimating P(Z > a) for a standard normal two ways at once: plain Monte
// Carlo draws from N(0, 1) and counts hits; importance sampling draws from
// the shifted proposal N(a, 1) and sums weights phi(x) / phi(x - a) over the
// hits. Each tick adds a batch of samples to both. The truth is exact
// (erfc), and the invariant checked every tick is that every weight is
// nonnegative, both running estimates are finite, and at the end the
// weighted estimate lies within six of its own standard errors of the truth.
const W = 640;
const H = 300;
const SEED = 20261010;

function erfc(x) {
  // Abramowitz and Stegun 7.1.26 on erf, good to 1.5e-7; enough for the frame
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return x >= 0 ? 1 - y : 1 + y;
}

function gauss(rand) {
  // Box-Muller
  const u = Math.max(rand(), 1e-12);
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const a = 3 + Math.floor(rand() * 3) * 0.5; // 3, 3.5, or 4
  const truth = 0.5 * erfc(a / Math.SQRT2);
  return {
    rand, a, truth, batch: 400, ticks: 0, maxTicks: 50,
    plainN: 0, plainHits: 0,
    isN: 0, isSum: 0, isSum2: 0, isHits: 0, wMax: 0,
    hist: new Array(48).fill(0), // proposal samples by x bin over [a - 3, a + 3]
    plainTrace: [], isTrace: [], done: false, ok: true, last: `estimating P(Z > ${a}) = ${truth.toExponential(3)} two ways`,
  };
}

export function sceneTick(sc) {
  if (sc.done) return true;
  for (let i = 0; i < sc.batch; i += 1) {
    const z = gauss(sc.rand);
    sc.plainN += 1;
    if (z > sc.a) sc.plainHits += 1;
    const x = sc.a + gauss(sc.rand);
    sc.isN += 1;
    const b = Math.floor(((x - (sc.a - 3)) / 6) * 48);
    if (b >= 0 && b < 48) sc.hist[b] += 1;
    if (x > sc.a) {
      const w = Math.exp(-sc.a * x + 0.5 * sc.a * sc.a); // phi(x) / phi(x - a)
      if (!(w >= 0) || !Number.isFinite(w)) sc.ok = false;
      sc.isSum += w;
      sc.isSum2 += w * w;
      sc.isHits += 1;
      sc.wMax = Math.max(sc.wMax, w);
    }
  }
  const plainEst = sc.plainHits / sc.plainN;
  const isEst = sc.isSum / sc.isN;
  if (!Number.isFinite(plainEst) || !Number.isFinite(isEst)) sc.ok = false;
  sc.plainTrace.push(plainEst);
  sc.isTrace.push(isEst);
  sc.ticks += 1;
  const isSe = Math.sqrt(Math.max(sc.isSum2 / sc.isN - isEst * isEst, 0) / sc.isN);
  sc.last = `${sc.isN.toLocaleString()} draws each: plain ${sc.plainHits} hit${sc.plainHits === 1 ? '' : 's'} (${plainEst.toExponential(2)}); weighted ${isEst.toExponential(3)} +- ${isSe.toExponential(1)}; truth ${sc.truth.toExponential(3)}`;
  if (sc.ticks >= sc.maxTicks) {
    sc.done = true;
    const z = isSe > 0 ? Math.abs(isEst - sc.truth) / isSe : 0;
    if (z > 6) sc.ok = false;
    const plainRel = Math.abs(plainEst - sc.truth) / sc.truth;
    sc.last = `done: weighted ${isEst.toExponential(3)} is ${z.toFixed(1)} standard errors from ${sc.truth.toExponential(3)} (relative error ${(Math.abs(isEst - sc.truth) / sc.truth * 100).toFixed(1)}%); plain ${sc.plainHits} hits in ${sc.plainN.toLocaleString()} (relative error ${(plainRel * 100).toFixed(0)}%); ${sc.isHits} weighted hits, top weight ${(sc.wMax / sc.isSum * 100).toFixed(2)}% of the sum; invariant ${sc.ok ? 'held' : 'BROKEN'}`;
    return true;
  }
  return false;
}

export function summarize(sc) {
  return { a: sc.a, ok: sc.ok, plainHits: sc.plainHits, isHits: sc.isHits, relErr: Math.abs(sc.isSum / sc.isN - sc.truth) / sc.truth };
}

export default function ImportanceSamplingViz() {
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
      stepMs: 220,
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
        ctx.fillText(`P(Z>${sc.a}): count N(0,1) hits, or draw N(${sc.a},1) and weight hits`, 12, 18);
        // left: densities over [-4, a + 3] with the proposal histogram
        const lx = 20;
        const lw = 300;
        const ly = 200;
        const xmin = -4;
        const xmax = sc.a + 3;
        const X = (x) => lx + ((x - xmin) / (xmax - xmin)) * lw;
        const phi = (x) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
        ctx.strokeStyle = algo;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let k = 0; k <= 120; k += 1) {
          const x = xmin + ((xmax - xmin) * k) / 120;
          const y = ly - phi(x) * 300;
          if (k === 0) ctx.moveTo(X(x), y); else ctx.lineTo(X(x), y);
        }
        ctx.stroke();
        const total = sc.hist.reduce((p, c) => p + c, 0) || 1;
        for (let b = 0; b < 48; b += 1) {
          const x0 = sc.a - 3 + (6 * b) / 48;
          const hgt = (sc.hist[b] / total) * 8 * 300 * 0.4;
          ctx.fillStyle = x0 >= sc.a ? `${heur}cc` : `${heur}55`;
          ctx.fillRect(X(x0), ly - hgt, Math.max(1, lw / ((xmax - xmin) * 8) - 1), hgt);
        }
        ctx.fillStyle = warn;
        ctx.fillRect(X(sc.a), 40, 1, ly - 40);
        ctx.fillStyle = dim;
        ctx.fillText(`a = ${sc.a}`, X(sc.a) + 4, 50);
        ctx.fillText('blue: N(0,1); amber: proposal draws', lx, ly + 16);
        ctx.fillText('bright amber: hits, weighted by p/q', lx, ly + 30);
        // right: running estimates over ticks, log scale around the truth
        const rx = 350;
        const rw = 270;
        const ry0 = 60;
        const rh = 140;
        const lo = Math.log10(sc.truth) - 1;
        const hi = Math.log10(sc.truth) + 1;
        const Y = (v) => ry0 + rh - ((Math.log10(Math.max(v, Math.pow(10, lo))) - lo) / (hi - lo)) * rh;
        ctx.strokeStyle = `${dim}66`;
        ctx.strokeRect(rx, ry0, rw, rh);
        ctx.strokeStyle = good;
        ctx.beginPath();
        ctx.moveTo(rx, Y(sc.truth));
        ctx.lineTo(rx + rw, Y(sc.truth));
        ctx.stroke();
        const trace = (arr, color) => {
          ctx.strokeStyle = color;
          ctx.beginPath();
          arr.forEach((v, i) => {
            const x = rx + (i / Math.max(1, sc.maxTicks - 1)) * rw;
            const y = v > 0 ? Y(v) : ry0 + rh;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          });
          ctx.stroke();
        };
        trace(sc.plainTrace, algo);
        trace(sc.isTrace, heur);
        ctx.fillStyle = dim;
        ctx.fillText('log estimates ±1 decade; green: truth', rx, ry0 - 8);
        ctx.fillText(`blue: plain (${sc.plainHits} hits); amber: weighted`, rx, ry0 + rh + 14);
        ctx.fillText(`weighted-hit ESS: ${(sc.isSum2 > 0 ? (sc.isSum * sc.isSum) / sc.isSum2 : 0).toFixed(0)} of ${sc.isHits}`, rx, ry0 + rh + 28);
        ctx.fillStyle = sc.ok ? good : warn;
        ctx.fillText(sc.ok ? 'invariant: weights nonnegative, estimates finite, final within six standard errors' : 'INVARIANT BROKEN', 12, 262);
        ctx.fillStyle = s.done ? (sc.ok ? good : warn) : ink;
        const line = sc.last;
        ctx.fillText(line.length > 100 ? `${line.slice(0, 99)}…` : line, 12, H - 6);
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
          new threshold
        </button>
        <span className="viz-stat">{snap.line || 'sampling…'}</span>
      </div>
    </>
  );
}
