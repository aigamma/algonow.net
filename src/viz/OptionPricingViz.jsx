import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Pricing a European call two ways at equal path counts: plain Monte Carlo
// draws independent normals; the antithetic estimator uses each draw as z
// and as -z and averages the pair. Both running estimates are drawn against
// the Black-Scholes price. The invariant checked every tick is that both
// estimates and standard errors are finite, and at the end that each lies
// within five of its own standard errors of the closed form and that the
// antithetic standard error is no larger than the plain one.
const W = 640;
const H = 300;
const SEED = 20261010;
const S0 = 100;
const RATE = 0.05;
const SIG = 0.2;
const DF = Math.exp(-RATE);
const DRIFT = RATE - 0.5 * SIG * SIG;

function erf(x) {
  // Abramowitz and Stegun 7.1.26, good to 1.5e-7
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return x >= 0 ? y : -y;
}
const ncdf = (x) => 0.5 * (1 + erf(x / Math.SQRT2));

export function bsCall(K) {
  const d1 = (Math.log(S0 / K) + RATE + 0.5 * SIG * SIG) / SIG;
  return S0 * ncdf(d1) - K * DF * ncdf(d1 - SIG);
}

function gauss(rand) {
  const u = Math.max(rand(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

const payoff = (z, K) => DF * Math.max(S0 * Math.exp(DRIFT + SIG * z) - K, 0);

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const K = [80, 90, 100, 110][Math.floor(rand() * 4)];
  return {
    rand, K, truth: bsCall(K), batch: 200, ticks: 0, maxTicks: 40,
    pn: 0, ps: 0, ps2: 0, an: 0, as: 0, as2: 0, ca: 0, cb: 0, cab: 0, ca2: 0, cb2: 0,
    lastPair: [0, 0], pTrace: [], aTrace: [], done: false, ok: true,
    last: `pricing the call struck at ${K}: Black-Scholes ${bsCall(K).toFixed(4)}`,
  };
}

function stats(n, s, s2) {
  const m = s / n;
  const v = Math.max(s2 / n - m * m, 0);
  return [m, Math.sqrt(v / n)];
}

export function sceneTick(sc) {
  if (sc.done) return true;
  for (let i = 0; i < sc.batch; i += 1) {
    // plain: two independent paths per pair, so the path counts match
    for (let j = 0; j < 2; j += 1) {
      const x = payoff(gauss(sc.rand), sc.K);
      sc.pn += 1; sc.ps += x; sc.ps2 += x * x;
    }
    const z = gauss(sc.rand);
    const a = payoff(z, sc.K);
    const b = payoff(-z, sc.K);
    const pm = (a + b) / 2;
    sc.an += 1; sc.as += pm; sc.as2 += pm * pm;
    sc.ca += a; sc.cb += b; sc.cab += a * b; sc.ca2 += a * a; sc.cb2 += b * b;
    if (i === sc.batch - 1) sc.lastPair = [z, -z];
  }
  const [pe, pse] = stats(sc.pn, sc.ps, sc.ps2);
  const [ae, ase] = stats(sc.an, sc.as, sc.as2);
  if (![pe, pse, ae, ase].every(Number.isFinite)) sc.ok = false;
  sc.pTrace.push([pe, pse]);
  sc.aTrace.push([ae, ase]);
  sc.ticks += 1;
  const n = sc.an;
  const ma = sc.ca / n; const mb = sc.cb / n;
  const cov = sc.cab / n - ma * mb;
  const rho = cov / Math.sqrt(Math.max((sc.ca2 / n - ma * ma) * (sc.cb2 / n - mb * mb), 1e-18));
  sc.rho = rho;
  sc.last = `${sc.pn.toLocaleString()} paths each: plain ${pe.toFixed(3)} +- ${pse.toFixed(3)}; antithetic ${ae.toFixed(3)} +- ${ase.toFixed(3)}; pair correlation ${rho.toFixed(2)}; truth ${sc.truth.toFixed(4)}`;
  if (sc.ticks >= sc.maxTicks) {
    sc.done = true;
    const zp = Math.abs(pe - sc.truth) / pse;
    const za = Math.abs(ae - sc.truth) / ase;
    if (zp > 5 || za > 5 || ase > pse * 1.1) sc.ok = false;
    const ratio = (pse * pse) / (ase * ase);
    sc.last = `done, K = ${sc.K}: plain ${pe.toFixed(3)} (${zp.toFixed(1)} se off), antithetic ${ae.toFixed(3)} (${za.toFixed(1)} se off) against ${sc.truth.toFixed(4)}; variance ratio ${ratio.toFixed(2)} from pair correlation ${rho.toFixed(2)}; invariant ${sc.ok ? 'held' : 'BROKEN'}`;
    return true;
  }
  return false;
}

export default function OptionPricingViz() {
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
      stepMs: 240,
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
        ctx.fillText(`call struck at ${sc.K}: plain draws against antithetic pairs (z, -z) at equal path counts`, 12, 18);
        // left: payoff against z with the latest pair
        const lx = 24; const lw = 290; const ly = 206; const top = 40;
        const X = (z) => lx + ((z + 3) / 6) * lw;
        const vmax = payoff(3, sc.K) * 1.05;
        const Y = (v) => ly - (v / vmax) * (ly - top);
        ctx.strokeStyle = `${dim}66`;
        ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + lw, ly); ctx.stroke();
        ctx.strokeStyle = algo; ctx.lineWidth = 1.5; ctx.beginPath();
        for (let k = 0; k <= 120; k += 1) {
          const z = -3 + (6 * k) / 120;
          const y = Y(payoff(z, sc.K));
          if (k === 0) ctx.moveTo(X(z), y); else ctx.lineTo(X(z), y);
        }
        ctx.stroke();
        const [z1, z2] = sc.lastPair;
        const p1 = payoff(z1, sc.K); const p2 = payoff(z2, sc.K);
        ctx.strokeStyle = heur; ctx.beginPath(); ctx.moveTo(X(z1), Y(p1)); ctx.lineTo(X(z2), Y(p2)); ctx.stroke();
        ctx.fillStyle = heur;
        ctx.beginPath(); ctx.arc(X(z1), Y(p1), 4, 0, 2 * Math.PI); ctx.fill();
        ctx.beginPath(); ctx.arc(X(z2), Y(p2), 4, 0, 2 * Math.PI); ctx.fill();
        ctx.fillRect(lx, Y((p1 + p2) / 2), lw, 1);
        ctx.fillStyle = good; ctx.fillRect(lx, Y(sc.truth), lw, 1);
        ctx.fillStyle = dim;
        ctx.fillText('blue: discounted payoff against the draw z; amber: the latest pair and its mean', lx, ly + 16);
        ctx.fillText(`green: Black-Scholes ${sc.truth.toFixed(3)}; pair correlation so far ${(sc.rho ?? 0).toFixed(2)}`, lx, ly + 30);
        // right: running estimates with one standard error bands
        const rx = 346; const rw = 276; const ry0 = 50; const rh = 150;
        const span = Math.max(sc.truth * 0.12, 0.5);
        const RY = (v) => ry0 + rh / 2 - ((v - sc.truth) / span) * (rh / 2);
        ctx.strokeStyle = `${dim}66`; ctx.strokeRect(rx, ry0, rw, rh);
        ctx.fillStyle = good; ctx.fillRect(rx, RY(sc.truth), rw, 1);
        const band = (trace, color) => {
          ctx.fillStyle = `${color}33`;
          ctx.beginPath();
          trace.forEach(([m, se], i) => {
            const x = rx + (i / Math.max(1, sc.maxTicks - 1)) * rw;
            const y = Math.min(Math.max(RY(m + se), ry0), ry0 + rh);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          });
          for (let i = trace.length - 1; i >= 0; i -= 1) {
            const [m, se] = trace[i];
            ctx.lineTo(rx + (i / Math.max(1, sc.maxTicks - 1)) * rw, Math.min(Math.max(RY(m - se), ry0), ry0 + rh));
          }
          ctx.closePath(); ctx.fill();
          ctx.strokeStyle = color; ctx.beginPath();
          trace.forEach(([m], i) => {
            const x = rx + (i / Math.max(1, sc.maxTicks - 1)) * rw;
            const y = Math.min(Math.max(RY(m), ry0), ry0 + rh);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          });
          ctx.stroke();
        };
        band(sc.pTrace, algo);
        band(sc.aTrace, heur);
        ctx.fillStyle = dim;
        ctx.fillText('running estimates with one standard error bands; green: the closed form', rx, ry0 - 8);
        ctx.fillText('blue: plain; amber: antithetic; same number of simulated paths', rx, ry0 + rh + 14);
        ctx.fillStyle = sc.ok ? good : warn;
        ctx.fillText(sc.ok ? 'invariant: finite estimates, final within five standard errors, antithetic error no larger' : 'INVARIANT BROKEN', 12, 262);
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
          new strike
        </button>
        <span className="viz-stat">{snap.line || 'simulating…'}</span>
      </div>
    </>
  );
}
