import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two acts of one gravity. Act one: the same eccentric orbit handed
// to two integrators: forward Euler (red) pumps energy every step
// and spirals away; velocity Verlet (blue) closes the ellipse and
// keeps closing it, its energy error orbiting in a band instead of
// marching. Act two: the oracle no tuning can fake: run Verlet
// forward, flip the velocities, and the planet retraces its own
// path home to within a pixel of roundoff: run Euler through the
// same mirror and it misses the start by more than the orbit is
// wide. Reversibility is not a nicety: it is the mechanism.
const W = 640;
const H = 300;
const SEED = 20260827;
const DT = 0.005;
const END_HOLD = 70;

function accel(p) {
  const r2 = p[0] * p[0] + p[1] * p[1];
  const r3 = r2 * Math.sqrt(r2);
  return [-p[0] / r3, -p[1] / r3];
}

export function verletStep(p, v, dt) {
  const a = accel(p);
  const vh = [v[0] + 0.5 * dt * a[0], v[1] + 0.5 * dt * a[1]];
  const pn = [p[0] + dt * vh[0], p[1] + dt * vh[1]];
  const a2 = accel(pn);
  return [pn, [vh[0] + 0.5 * dt * a2[0], vh[1] + 0.5 * dt * a2[1]]];
}

export function eulerStep(p, v, dt) {
  const a = accel(p);
  return [
    [p[0] + dt * v[0], p[1] + dt * v[1]],
    [v[0] + dt * a[0], v[1] + dt * a[1]],
  ];
}

export function energy(p, v) {
  return 0.5 * (v[0] * v[0] + v[1] * v[1]) - 1 / Math.hypot(p[0], p[1]);
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const e = 0.5 + rand() * 0.2;
  const p0 = [1 - e, 0];
  const v0 = [0, Math.sqrt((1 + e) / (1 - e))];
  const E0 = energy(p0, v0);

  const run = (stepper, n, from, fromV, dt) => {
    let p = from.slice();
    let v = fromV.slice();
    const pts = [p.slice()];
    const es = [energy(p, v)];
    for (let i = 0; i < n; i++) {
      [p, v] = stepper(p, v, dt);
      pts.push(p.slice());
      es.push(energy(p, v));
    }
    return { pts, es, endP: p, endV: v };
  };

  const N1 = 2100; // ~1.7 orbits
  const act1V = run(verletStep, N1, p0, v0, DT);
  const act1E = run(eulerStep, N1, p0, v0, DT);

  // Act 2 runs a coarser dt for longer, so the mirror's verdict is
  // unmissable: Euler's return gap reaches several orbit-widths.
  const DT2 = 0.012;
  const N2 = 1400;
  const outV = run(verletStep, N2, p0, v0, DT2);
  const backV = run(verletStep, N2, outV.endP, [-outV.endV[0], -outV.endV[1]], DT2);
  const outE = run(eulerStep, N2, p0, v0, DT2);
  const backE = run(eulerStep, N2, outE.endP, [-outE.endV[0], -outE.endV[1]], DT2);
  const gapV = Math.hypot(backV.endP[0] - p0[0], backV.endP[1] - p0[1]);
  const gapE = Math.hypot(backE.endP[0] - p0[0], backE.endP[1] - p0[1]);

  return { e, p0, E0, act1V, act1E, outV, backV, outE, backE, gapV, gapE, N1, N2 };
}

const SX = 385;
const SY = 148;
const SC = 122;
const px = (p) => [SX + p[0] * SC, SY - p[1] * SC];

export default function VerletViz() {
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
        const len =
          s.act === 0
            ? Math.ceil(s.scene.N1 / 8) + END_HOLD
            : Math.ceil((2 * s.scene.N2) / 8) + END_HOLD * 2;
        if (s.tick >= len) {
          s.tick = 0;
          s.act += 1;
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
        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';

        // The sun.
        ctx.fillStyle = heur;
        ctx.beginPath();
        ctx.arc(SX, SY, 6, 0, Math.PI * 2);
        ctx.fill();

        const trail = (pts, upTo, color, width) => {
          ctx.strokeStyle = color;
          ctx.lineWidth = width;
          ctx.beginPath();
          for (let i = 0; i <= Math.min(upTo, pts.length - 1); i += 3) {
            const [x, y] = px(pts[i]);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        };
        const planet = (pts, upTo, color) => {
          const [x, y] = px(pts[Math.min(upTo, pts.length - 1)]);
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, Math.PI * 2);
          ctx.fill();
        };

        if (actIdx === 0) {
          const n = done ? sc.N1 : Math.min(s.tick * 8, sc.N1);
          ctx.fillText('act 1 · one gravity, two integrators: same start, same dt, 1.7 orbits', 14, 20);
          trail(sc.act1E.pts, n, 'rgba(226,96,108,0.65)', 1.4);
          trail(sc.act1V.pts, n, 'rgba(93,162,255,0.75)', 1.6);
          planet(sc.act1E.pts, n, warn);
          planet(sc.act1V.pts, n, algo);

          const eV = sc.act1V.es[Math.min(n, sc.act1V.es.length - 1)];
          const eE = sc.act1E.es[Math.min(n, sc.act1E.es.length - 1)];
          const devV = Math.abs((eV - sc.E0) / sc.E0);
          const devE = Math.abs((eE - sc.E0) / sc.E0);
          ctx.fillStyle = algo;
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillText(`Verlet  |ΔE/E| = ${devV.toExponential(1)}`, 14, 250);
          ctx.fillStyle = warn;
          ctx.fillText(`Euler   |ΔE/E| = ${devE.toExponential(1)}`, 14, 268);

          let line;
          if (done || n >= sc.N1) {
            line = 'the blue ellipse closes on itself: the red one is leaving the system: energy pumped every step';
            ctx.fillStyle = warn;
          } else {
            line = `step ${n.toLocaleString()}: blue stays bound, red climbs`;
            ctx.fillStyle = ink;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = { line };
        } else {
          const half = Math.ceil(sc.N2 / 8);
          const t = done ? 2 * half : Math.min(s.tick, 2 * half + END_HOLD);
          const phase = t < half ? 0 : 1;
          ctx.fillText('act 2 · the mirror test: run out, flip the velocities, run home', 14, 20);

          // Start marker.
          const [sx0, sy0] = px(sc.p0);
          ctx.strokeStyle = good;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(sx0, sy0, 9, 0, Math.PI * 2);
          ctx.stroke();

          // Verlet: out then back.
          const nOut = phase === 0 && !done ? Math.min(t * 8, sc.N2) : sc.N2;
          trail(sc.outV.pts, nOut, 'rgba(93,162,255,0.6)', 1.4);
          if (phase >= 1 || done) {
            const nBack = done ? sc.N2 : Math.min((t - half) * 8, sc.N2);
            trail(sc.backV.pts, nBack, 'rgba(98,217,138,0.8)', 1.8);
            planet(sc.backV.pts, nBack, good);
          } else {
            planet(sc.outV.pts, nOut, algo);
          }
          // Euler ghost: its return endpoint is several orbit-widths
          // away (usually offscreen): draw a clamped arrow toward it.
          if (done || t >= 2 * half) {
            const [ex, ey] = px(sc.backE.endP);
            const dx = ex - sx0;
            const dy = ey - sy0;
            const dist = Math.hypot(dx, dy) || 1;
            const L = Math.min(dist, 170);
            const ax = sx0 + (dx / dist) * L;
            const ay = sy0 + (dy / dist) * L;
            ctx.strokeStyle = warn;
            ctx.lineWidth = 1.8;
            ctx.setLineDash([5, 4]);
            ctx.beginPath();
            ctx.moveTo(sx0, sy0);
            ctx.lineTo(ax, ay);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = warn;
            ctx.beginPath();
            ctx.arc(ax, ay, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.font = '10px ui-monospace, monospace';
            const lx = Math.max(14, Math.min(ax + 8, 430));
            const ly = Math.max(34, Math.min(ay, 286));
            ctx.fillText(`Euler's return: ${sc.gapE.toFixed(1)} units off, this way`, lx, ly);
          }

          let line;
          if (done || t >= 2 * half) {
            line = `Verlet re-arrives within ${sc.gapV.toExponential(1)} · Euler misses by ${sc.gapE.toFixed(2)}: reversibility is the mechanism`;
            ctx.fillStyle = good;
          } else if (phase === 0) {
            line = `outbound: ${Math.min(t * 8, sc.N2).toLocaleString()} steps…`;
            ctx.fillStyle = algo;
          } else {
            line = 'velocities flipped: the same equations, run in reverse…';
            ctx.fillStyle = good;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = {
            line: done
              ? 'the error orbits, it never marches: that is what symplectic buys'
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
          new orbit
        </button>
        <span className="viz-stat">
          {snap.line || 'lighting the sun…'}
        </span>
      </div>
    </>
  );
}
