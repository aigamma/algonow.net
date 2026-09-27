import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// A robot (green) on a 100 m loop with doors (dark ticks), drawn as a
// straight corridor. Each tick is one step: the particles (blue) move
// through the noisy motion model, are weighted by how well they
// explain the nearest-door reading (amber bar), and are resampled. The
// histogram beneath is the particle cloud; the vertical band is the
// cloud's mean against the true position. At step 60 the robot is
// kidnapped, and the filter carries a few random particles so it can
// recover.
const W = 640;
const H = 300;
const SEED = 20260926;
const LOOP = 100;
const DOORS = [10, 30, 37, 70];
const STEP = 2;
const ODO_SD = 0.3;
const SENSOR_SD = 1.0;
const N = 400;
const KIDNAP_AT = 60;
const MAX_STEPS = 120;

function gauss(rand) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const wrap = (x) => ((x % LOOP) + LOOP) % LOOP;

function nearestDoor(x) {
  let best = LOOP;
  for (const d of DOORS) {
    const diff = Math.abs(x - d);
    best = Math.min(best, diff, LOOP - diff);
  }
  return best;
}

export function circErr(a, b) {
  const d = Math.abs(a - b) % LOOP;
  return Math.min(d, LOOP - d);
}

export function circularMean(xs, ws) {
  let s = 0;
  let c = 0;
  for (let i = 0; i < xs.length; i++) {
    const w = ws ? ws[i] : 1;
    s += w * Math.sin((2 * Math.PI * xs[i]) / LOOP);
    c += w * Math.cos((2 * Math.PI * xs[i]) / LOOP);
  }
  return wrap((Math.atan2(s, c) * LOOP) / (2 * Math.PI));
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const truth = rand() * LOOP;
  const particles = Array.from({ length: N }, () => rand() * LOOP);
  return { rand, truth, particles, weights: new Array(N).fill(1 / N), step: 0, reading: null, mean: null, err: null, errs: [], kidnapped: false, done: false };
}

export function sceneTick(sc) {
  if (sc.done) return true;
  const { rand } = sc;
  if (sc.step === KIDNAP_AT) {
    sc.truth = 85;
    sc.kidnapped = true;
  }
  sc.truth = wrap(sc.truth + STEP + gauss(rand) * ODO_SD);
  const z = nearestDoor(sc.truth) + gauss(rand) * SENSOR_SD;
  sc.reading = z;
  sc.particles = sc.particles.map((p) => wrap(p + STEP + gauss(rand) * ODO_SD));
  let total = 0;
  const w = sc.particles.map((p) => {
    const r = z - nearestDoor(p);
    const v = Math.exp(-0.5 * (r / SENSOR_SD) ** 2);
    total += v;
    return v;
  });
  sc.weights = total > 0 ? w.map((v) => v / total) : new Array(N).fill(1 / N);
  sc.mean = circularMean(sc.particles, sc.weights);
  sc.err = circErr(sc.mean, sc.truth);
  sc.errs.push(sc.err);
  // low-variance resampling with 2% random particles
  const next = [];
  const r0 = rand() / N;
  let c = sc.weights[0];
  let i = 0;
  for (let m = 0; m < N; m++) {
    const u = r0 + m / N;
    while (u > c && i < N - 1) {
      i += 1;
      c += sc.weights[i];
    }
    next.push(sc.particles[i]);
  }
  for (let k = 0; k < Math.floor(0.02 * N); k++) next[Math.floor(rand() * N)] = rand() * LOOP;
  sc.particles = next;
  sc.step += 1;
  if (sc.step >= MAX_STEPS) sc.done = true;
  return sc.done;
}

export default function MclViz() {
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
      init: () => ({ scene: makeScene(SEED + cycle.current * 7919), done: false, rest: 0, stopAtRest: isStill() }),
      tick: (s) => {
        if (s.done) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
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
        const x0 = 20;
        const xw = 600;
        const px = (x) => x0 + (x / LOOP) * xw;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText(`step ${sc.step}: ${N} particles on a ${LOOP} m loop, doors at ${DOORS.join(', ')} m; 2 m steps, nearest-door sensor${sc.kidnapped ? '; robot kidnapped at step ' + KIDNAP_AT : ''}`, 12, 18);
        // corridor
        const cy = 70;
        ctx.strokeStyle = `${dim}88`;
        ctx.beginPath();
        ctx.moveTo(x0, cy);
        ctx.lineTo(x0 + xw, cy);
        ctx.stroke();
        for (const d of DOORS) {
          ctx.fillStyle = ink;
          ctx.fillRect(px(d) - 2, cy - 14, 4, 28);
        }
        // particles as dots with weight-scaled size, above the corridor
        for (let i = 0; i < N; i++) {
          const wsz = Math.min(5, 1.2 + sc.weights[i] * N * 1.5);
          ctx.fillStyle = `${algo}99`;
          ctx.beginPath();
          ctx.arc(px(sc.particles[i]), cy - 30 - (i % 7) * 3, wsz, 0, Math.PI * 2);
          ctx.fill();
        }
        // truth
        ctx.fillStyle = good;
        ctx.beginPath();
        ctx.arc(px(sc.truth), cy, 7, 0, Math.PI * 2);
        ctx.fill();
        // sensor reading as an amber bar to the nearest door
        if (sc.reading !== null) {
          ctx.strokeStyle = heur;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(px(sc.truth), cy + 22);
          ctx.lineTo(px(wrap(sc.truth + (nearestDoor(sc.truth) < 50 ? 1 : 1) * 0)) + Math.sign(1) * 0, cy + 22);
          ctx.stroke();
          ctx.lineWidth = 1;
          ctx.fillStyle = heur;
          ctx.fillText(`sensor: nearest door ${sc.reading.toFixed(1)} m away (true ${nearestDoor(sc.truth).toFixed(1)})`, 12, cy + 44);
        }
        // histogram of the cloud
        const bins = new Array(50).fill(0);
        for (const p of sc.particles) bins[Math.min(49, Math.floor(p / 2))] += 1;
        const maxBin = Math.max(1, ...bins);
        const hy = 250;
        for (let b = 0; b < 50; b++) {
          const h = (bins[b] / maxBin) * 90;
          ctx.fillStyle = `${algo}aa`;
          ctx.fillRect(px(b * 2) + 1, hy - h, xw / 50 - 2, h);
        }
        ctx.strokeStyle = `${dim}55`;
        ctx.beginPath();
        ctx.moveTo(x0, hy);
        ctx.lineTo(x0 + xw, hy);
        ctx.stroke();
        if (sc.mean !== null) {
          ctx.strokeStyle = heur;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(px(sc.mean), hy - 100);
          ctx.lineTo(px(sc.mean), hy);
          ctx.stroke();
          ctx.lineWidth = 1;
          ctx.strokeStyle = good;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(px(sc.truth), hy - 100);
          ctx.lineTo(px(sc.truth), hy);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        ctx.fillStyle = dim;
        ctx.fillText('cloud histogram: amber the weighted mean, dashed green the truth', 12, 268);
        let line;
        if (s.done) {
          const before = sc.errs.slice(20, KIDNAP_AT).reduce((a, b) => a + b, 0) / (KIDNAP_AT - 20);
          const after = sc.errs.slice(KIDNAP_AT + 20).reduce((a, b) => a + b, 0) / (sc.errs.length - KIDNAP_AT - 20);
          line = `mean error ${before.toFixed(1)} m once localized, ${after.toFixed(1)} m after recovering from the kidnapping; the random particles bought the recovery`;
          ctx.fillStyle = good;
        } else {
          line = sc.err !== null ? `error now ${sc.err.toFixed(1)} m: move every particle, weight by the reading, resample so likely guesses multiply` : 'uniform prior: the robot could be anywhere';
          ctx.fillStyle = sc.err !== null && sc.err > 5 ? warn : ink;
        }
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
          new start
        </button>
        <span className="viz-stat">{snap.line || 'localizing…'}</span>
      </div>
    </>
  );
}
