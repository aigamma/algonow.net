import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks } from './useCanvasLoop.js';

// Left: a CRR lattice with N steps (u d = 1, so the nodes sit on one
// price grid), rolled back one step per tick from the maturity payoff
// (amber) to the root (green). For the American put, a node where
// exercising beats continuing turns red. Right: the CRR price for
// every step count up to 60 against the Black-Scholes value (dashed),
// the even/odd zigzag converging.
const W = 640;
const H = 300;
const S0 = 100;
const K = 100;
const R = 0.05;
const SIGMA = 0.2;
const T = 1;
const CASES = [
  { kind: 'call', american: false, label: 'European call' },
  { kind: 'put', american: true, label: 'American put' },
  { kind: 'put', american: false, label: 'European put' },
];

function normCdf(x) {
  // Abramowitz-Stegun 7.1.26 via erf approximation, error < 1.5e-7
  const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t) * Math.exp(-(x * x) / 2);
  return 0.5 * (1 + (x >= 0 ? y : -y));
}

export function blackScholes(kind) {
  const d1 = (Math.log(S0 / K) + (R + 0.5 * SIGMA * SIGMA) * T) / (SIGMA * Math.sqrt(T));
  const d2 = d1 - SIGMA * Math.sqrt(T);
  if (kind === 'call') return S0 * normCdf(d1) - K * Math.exp(-R * T) * normCdf(d2);
  return K * Math.exp(-R * T) * normCdf(-d2) - S0 * normCdf(-d1);
}

export function price(N, kind, american) {
  const dt = T / N;
  const u = Math.exp(SIGMA * Math.sqrt(dt));
  const d = 1 / u;
  const p = (Math.exp(R * dt) - d) / (u - d);
  const disc = Math.exp(-R * dt);
  const payoff = (s) => (kind === 'call' ? Math.max(s - K, 0) : Math.max(K - s, 0));
  let values = Array.from({ length: N + 1 }, (_, j) => payoff(S0 * u ** j * d ** (N - j)));
  for (let step = N - 1; step >= 0; step--) {
    const next = [];
    for (let j = 0; j <= step; j++) {
      let cont = disc * (p * values[j + 1] + (1 - p) * values[j]);
      if (american) cont = Math.max(cont, payoff(S0 * u ** j * d ** (step - j)));
      next.push(cont);
    }
    values = next;
  }
  return values[0];
}

export function makeScene(caseIndex) {
  const c = CASES[caseIndex % CASES.length];
  const N = 8;
  const dt = T / N;
  const u = Math.exp(SIGMA * Math.sqrt(dt));
  const d = 1 / u;
  const p = (Math.exp(R * dt) - d) / (u - d);
  const disc = Math.exp(-R * dt);
  const payoff = (s) => (c.kind === 'call' ? Math.max(s - K, 0) : Math.max(K - s, 0));
  const levels = [];
  for (let step = 0; step <= N; step++) levels.push(Array.from({ length: step + 1 }, (_, j) => ({ s: S0 * u ** j * d ** (step - j), v: null, ex: false })));
  levels[N].forEach((node) => { node.v = payoff(node.s); });
  const curve = [];
  for (let n = 2; n <= 60; n++) curve.push(price(n, c.kind, c.american));
  return { c, N, u, d, p, disc, payoff, levels, step: N, bs: blackScholes(c.kind), curve, done: false };
}

export function sceneTick(sc) {
  if (sc.step === 0) {
    sc.done = true;
    return true;
  }
  const step = sc.step - 1;
  for (let j = 0; j <= step; j++) {
    const node = sc.levels[step][j];
    let cont = sc.disc * (sc.p * sc.levels[step + 1][j + 1].v + (1 - sc.p) * sc.levels[step + 1][j].v);
    if (sc.c.american) {
      const ex = sc.payoff(node.s);
      if (ex > cont) {
        cont = ex;
        node.ex = true;
      }
    }
    node.v = cont;
  }
  sc.step = step;
  if (sc.step === 0) sc.done = true;
  return sc.done;
}

export default function BinomialViz() {
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
      stepMs: 700,
      init: () => ({ scene: makeScene(cycle.current), done: false, rest: 0, stopAtRest: isStill() }),
      tick: (s) => {
        if (s.done) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            Object.assign(s, { scene: makeScene(cycle.current), done: false, rest: 0 });
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
        ctx.fillText(`${sc.c.label}: S 100, K 100, r 5%, σ 20%, T 1 year; CRR lattice with ${sc.N} steps, rolled back one step per tick`, 12, 18);
        const x0 = 24;
        const xw = 300;
        const yMid = 150;
        const yScale = 26;
        for (let step = 0; step <= sc.N; step++) {
          const x = x0 + (step / sc.N) * xw;
          for (let j = 0; j <= step; j++) {
            const node = sc.levels[step][j];
            const y = yMid - (2 * j - step) * yScale / 2;
            if (step < sc.N) {
              const xn = x0 + ((step + 1) / sc.N) * xw;
              ctx.strokeStyle = `${dim}44`;
              ctx.beginPath();
              ctx.moveTo(x, y);
              ctx.lineTo(xn, yMid - (2 * (j + 1) - step - 1) * yScale / 2);
              ctx.moveTo(x, y);
              ctx.lineTo(xn, yMid - (2 * j - step - 1) * yScale / 2);
              ctx.stroke();
            }
            const filled = node.v !== null;
            ctx.fillStyle = !filled ? `${dim}55` : step === sc.N ? heur : node.ex ? warn : step === 0 ? good : algo;
            ctx.beginPath();
            ctx.arc(x, y, filled ? 5 : 3, 0, Math.PI * 2);
            ctx.fill();
            if (filled && (step === sc.N || step === sc.step || step === 0)) {
              ctx.fillStyle = ink;
              ctx.font = '9px ui-monospace, monospace';
              ctx.fillText(node.v.toFixed(2), x - 10, y - 8);
              ctx.font = '11px ui-monospace, monospace';
            }
          }
        }
        ctx.fillStyle = dim;
        ctx.fillText(`step ${sc.step} of ${sc.N}: amber payoffs, blue continuation values${sc.c.american ? ', red where exercise beats continuing' : ''}`, x0, 262);
        ctx.fillText(`u = ${sc.u.toFixed(4)}, d = 1/u, p = ${sc.p.toFixed(4)}: every node on one grid of ${2 * sc.N + 1} prices`, x0, 278);
        // convergence chart
        const cx0 = 360;
        const cy0 = 40;
        const cw = 260;
        const ch = 180;
        const vals = sc.curve;
        const lo = Math.min(...vals, sc.bs) - 0.2;
        const hi = Math.max(...vals, sc.bs) + 0.2;
        ctx.strokeStyle = `${dim}66`;
        ctx.strokeRect(cx0, cy0, cw, ch);
        const py = (v) => cy0 + ch - ((v - lo) / (hi - lo)) * ch;
        ctx.strokeStyle = ink;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(cx0, py(sc.bs));
        ctx.lineTo(cx0 + cw, py(sc.bs));
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = ink;
        ctx.fillText(`${sc.c.american ? 'reference (N = 60)' : 'Black-Scholes'} ${sc.c.american ? vals[vals.length - 1].toFixed(2) : sc.bs.toFixed(2)}`, cx0 + 6, py(sc.bs) - 6);
        ctx.strokeStyle = algo;
        ctx.beginPath();
        vals.forEach((v, i) => {
          const px = cx0 + (i / (vals.length - 1)) * cw;
          if (i === 0) ctx.moveTo(px, py(v));
          else ctx.lineTo(px, py(v));
        });
        ctx.stroke();
        ctx.fillStyle = dim;
        ctx.fillText('CRR price vs steps N = 2 to 60', cx0, cy0 + ch + 16);
        ctx.fillText(`N = 8: ${vals[6].toFixed(2)}; N = 60: ${vals[vals.length - 1].toFixed(2)}`, cx0, cy0 + ch + 32);
        let line;
        if (s.done) {
          const root = sc.levels[0][0].v;
          line = sc.c.american
            ? `${sc.c.label} on ${sc.N} steps: ${root.toFixed(2)} (European ${sc.bs.toFixed(2)} by Black-Scholes): early exercise is worth the difference`
            : `${sc.c.label} on ${sc.N} steps: ${root.toFixed(2)} against Black-Scholes ${sc.bs.toFixed(2)}; the zigzag closes as N grows`;
          ctx.fillStyle = good;
        } else {
          line = 'each node is the discounted risk-neutral average of its two children, or the payoff if exercising now is worth more';
          ctx.fillStyle = ink;
        }
        ctx.font = '11px ui-monospace, monospace';
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
          next contract
        </button>
        <span className="viz-stat">{snap.line || 'rolling back…'}</span>
      </div>
    </>
  );
}
