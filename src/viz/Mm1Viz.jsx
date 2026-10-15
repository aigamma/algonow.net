import DiagramViewport from '../components/DiagramViewport.jsx';
import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// An M/M/1 queue simulated live, several events per tick, beside the
// birth-death prediction. The left panel shows the lane: a server box and
// the customers waiting. The right panel grows the empirical fraction of
// time spent in each state (amber bars) over the geometric law
// pi_n = (1 - rho) rho^n (blue ticks), and the running time-average
// number in the system against rho / (1 - rho). Each cycle picks a
// utilization from 0.5, 0.7, 0.85. The invariants checked every tick are
// that the count never goes negative, that the empirical fractions sum to
// one, and that Little's law holds inside the run to within a tolerance
// once enough customers have passed.
const W = 640;
const H = 300;
const SEED = 20261010;
const RHOS = [0.5, 0.7, 0.85];
const TICKS = 90;
const EVENTS_PER_TICK = 40;
const MAXN = 16;

function expo(rand, rate) {
  let u = 0;
  while (u === 0) u = rand();
  return -Math.log(u) / rate;
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const rho = RHOS[seed % RHOS.length];
  return {
    rand, rho, lam: rho, mu: 1,
    t: 0, n: 0, nextArrival: expo(rand, rho), nextDeparture: Infinity,
    area: 0, timeIn: new Array(MAXN + 1).fill(0), served: 0, arrived: 0,
    waitSum: 0, queueArrivals: [], inService: null,
    tick: 0, done: false, ok: true, last: `utilization ${rho}: an empty lane; the formula predicts ${(rho / (1 - rho)).toFixed(2)} in the system on average`,
  };
}

function step(sc) {
  const tNext = Math.min(sc.nextArrival, sc.nextDeparture);
  const dt = tNext - sc.t;
  sc.area += sc.n * dt;
  sc.timeIn[Math.min(sc.n, MAXN)] += dt;
  sc.t = tNext;
  if (sc.nextArrival <= sc.nextDeparture) {
    sc.arrived += 1;
    if (sc.n === 0) {
      sc.inService = sc.t;
      sc.nextDeparture = sc.t + expo(sc.rand, sc.mu);
    } else {
      sc.queueArrivals.push(sc.t);
    }
    sc.n += 1;
    sc.nextArrival = sc.t + expo(sc.rand, sc.lam);
  } else {
    sc.n -= 1;
    sc.served += 1;
    if (sc.n > 0) {
      const arrivedAt = sc.queueArrivals.shift();
      sc.waitSum += sc.t - arrivedAt;
      sc.inService = sc.t;
      sc.nextDeparture = sc.t + expo(sc.rand, sc.mu);
    } else {
      sc.inService = null;
      sc.nextDeparture = Infinity;
    }
  }
}

export function sceneTick(sc) {
  if (sc.done) return true;
  if (sc.tick >= TICKS) {
    sc.done = true;
    const L = sc.area / sc.t;
    const formula = sc.rho / (1 - sc.rho);
    sc.last = `after ${sc.served.toLocaleString()} customers at utilization ${sc.rho}: time-average ${L.toFixed(2)} in the system against the formula ${formula.toFixed(2)}; the file: within three standard errors at six utilizations`;
    return true;
  }
  for (let i = 0; i < EVENTS_PER_TICK; i += 1) step(sc);
  sc.tick += 1;
  const total = sc.timeIn.reduce((a, b) => a + b, 0);
  const L = sc.area / sc.t;
  const throughput = sc.served / sc.t;
  const W = sc.served > 0 ? (sc.waitSum / sc.served) + 1 / sc.mu : 0; // mean wait plus one mean service
  const little = throughput * W;
  sc.ok = sc.n >= 0 && Math.abs(total - sc.t) < 1e-6 * Math.max(1, sc.t) && (sc.served < 400 || Math.abs(little - L) < 0.35 * Math.max(1, L));
  sc.last = `t = ${sc.t.toFixed(0)}: ${sc.n} in the system now; time-average ${L.toFixed(2)} (formula ${(sc.rho / (1 - sc.rho)).toFixed(2)}); ${sc.served.toLocaleString()} served; Little: ${throughput.toFixed(2)} x ${W.toFixed(2)} = ${little.toFixed(2)}`;
  return false;
}

export default function Mm1Viz() {
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
      stepMs: 160,
      init: () => ({ scene: makeScene(SEED + cycle.current), done: false, rest: 0, stopAtRest: isStill() }),
      tick: (s) => {
        if (s.done) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s) * 2) {
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
        ctx.fillText(`M/M/1, ρ=${sc.rho}; amber: measured time shares; blue ticks: (1-ρ)ρⁿ`, 12, 18);
        // the lane
        ctx.fillStyle = dim;
        ctx.fillText('the lane now', 20, 44);
        ctx.strokeStyle = sc.inService !== null ? algo : `${dim}66`;
        ctx.lineWidth = 2;
        ctx.strokeRect(20, 52, 30, 30);
        ctx.lineWidth = 1;
        if (sc.inService !== null) {
          ctx.fillStyle = algo;
          ctx.beginPath();
          ctx.arc(35, 67, 8, 0, Math.PI * 2);
          ctx.fill();
        }
        const waiting = Math.max(sc.n - 1, 0);
        for (let i = 0; i < Math.min(waiting, 20); i += 1) {
          ctx.fillStyle = heur;
          ctx.beginPath();
          ctx.arc(70 + i * 12, 67, 5, 0, Math.PI * 2);
          ctx.fill();
        }
        if (waiting > 20) {
          ctx.fillStyle = dim;
          ctx.fillText(`+${waiting - 20}`, 70 + 20 * 12, 71);
        }
        ctx.fillStyle = dim;
        ctx.fillText(`server ${sc.inService !== null ? 'busy' : 'idle'}, ${waiting} waiting`, 20, 100);
        // right: distribution
        const bx = 330;
        const by = 230;
        const bw = 18;
        const total = Math.max(sc.timeIn.reduce((a, b) => a + b, 0), 1e-9);
        const scale = 160 / Math.max(1 - sc.rho, 0.15);
        for (let n = 0; n <= MAXN; n += 1) {
          const emp = sc.timeIn[n] / total;
          const th = (1 - sc.rho) * sc.rho ** n;
          ctx.fillStyle = `${heur}cc`;
          ctx.fillRect(bx + n * bw, by - emp * scale, bw - 4, emp * scale);
          ctx.strokeStyle = algo;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(bx + n * bw - 1, by - th * scale);
          ctx.lineTo(bx + n * bw + bw - 3, by - th * scale);
          ctx.stroke();
          ctx.lineWidth = 1;
          if (n % 4 === 0) {
            ctx.fillStyle = dim;
            ctx.fillText(String(n), bx + n * bw + 2, by + 12);
          }
        }
        ctx.fillStyle = dim;
        ctx.fillText('share of time with n in the system', bx, 44);
        // running averages
        const L = sc.area / Math.max(sc.t, 1e-9);
        const formula = sc.rho / (1 - sc.rho);
        ctx.fillStyle = ink;
        ctx.fillText(`time-average in system ${L.toFixed(2)}`, 20, 140);
        ctx.fillStyle = algo;
        ctx.fillText(`formula rho / (1 - rho) = ${formula.toFixed(2)}`, 20, 158);
        ctx.fillStyle = dim;
        ctx.fillText(`${sc.served.toLocaleString()} served, t = ${sc.t.toFixed(0)}`, 20, 176);
        ctx.fillText(`P(wait) formula ${sc.rho.toFixed(2)}; P(N >= 5) ${(sc.rho ** 5).toFixed(2)}`, 20, 194);
        ctx.fillStyle = sc.ok ? good : warn;
        ctx.fillText(sc.ok ? 'count, time shares, Little’s law: all hold' : 'INVARIANT BROKEN', 20, 222);
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
          next utilization
        </button>
        <span className="viz-stat">{snap.line || 'queueing…'}</span>
      </div>
    </>
  );
}
