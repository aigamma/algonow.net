import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// The bandwidth sweep. A seeded sample of 120 points from one of three
// Gaussian-mixture densities (Gaussian, skewed unimodal, separated
// bimodal, by cycle) is fixed; each tick moves the bandwidth one step up a
// log-spaced ladder from 0.03 to 1.5, redraws the kernel estimate against
// the true density, and plots the integrated squared error of that
// bandwidth on the right, where the U-shaped curve forms. Silverman's
// rule-of-thumb bandwidth for the sample is marked, so the viewer sees
// where the rule lands on the U: at the bottom for one cloud, up the
// right-hand slope for two. The invariant checked every tick is that the
// estimate integrates to one on the grid within two percent and the
// error is nonnegative.
const W = 640;
const H = 300;
const SEED = 20261013; // opens on a Gaussian cycle where the rule sits at the bottom of the U (chosen by a seed scan)
const N = 120;
const STEPS = 30;
const GRID = 301; // the integration grid runs wide so the mass check holds at the largest bandwidths
const XMIN = -7.5;
const XMAX = 7.5;
const VMIN = -4.5; // the drawn window
const VMAX = 4.5;
const DENSITIES = [
  { name: 'Gaussian', mix: [[1, 0, 1]] },
  { name: 'skewed unimodal', mix: [[0.2, 0, 1], [0.2, 0.5, 2 / 3], [0.6, 13 / 12, 5 / 9]] },
  { name: 'separated bimodal', mix: [[0.5, -1.5, 0.5], [0.5, 1.5, 0.5]] },
];

const phi = (x, mu, s) => Math.exp(-0.5 * ((x - mu) / s) ** 2) / (s * Math.sqrt(2 * Math.PI));
const truthAt = (mix, x) => mix.reduce((acc, [w, mu, s]) => acc + w * phi(x, mu, s), 0);

function gauss(rand) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function silverman(xs) {
  const n = xs.length;
  const mean = xs.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(xs.reduce((a, x) => a + (x - mean) ** 2, 0) / (n - 1));
  const srt = [...xs].sort((a, b) => a - b);
  const iqr = srt[Math.floor(0.75 * (n - 1))] - srt[Math.floor(0.25 * (n - 1))];
  return 0.9 * Math.min(sd, iqr / 1.34) * n ** (-0.2);
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const density = DENSITIES[seed % DENSITIES.length];
  const xs = [];
  for (let i = 0; i < N; i += 1) {
    const r = rand();
    let acc = 0;
    let comp = density.mix[density.mix.length - 1];
    for (const c of density.mix) {
      acc += c[0];
      if (r <= acc) {
        comp = c;
        break;
      }
    }
    xs.push(comp[1] + comp[2] * gauss(rand));
  }
  const grid = Array.from({ length: GRID }, (_, i) => XMIN + ((XMAX - XMIN) * i) / (GRID - 1));
  const truth = grid.map((x) => truthAt(density.mix, x));
  return { density, xs, grid, truth, hSil: silverman(xs), step: 0, h: null, est: null, ise: null, curve: [], best: null, done: false, ok: true, last: `${density.name}: ${N} points; the bandwidth sweep starts at 0.03` };
}

export function sceneTick(sc) {
  if (sc.done) return true;
  if (sc.step >= STEPS) {
    sc.done = true;
    const ratio = sc.silIse / sc.best.ise;
    sc.last = `${sc.density.name}: oracle h ${sc.best.h.toFixed(3)} (ISE ${sc.best.ise.toFixed(4)}); Silverman's rule gives ${sc.hSil.toFixed(3)} for ${ratio.toFixed(2)}x the oracle error${sc.density.mix.length === 2 && ratio > 1.5 ? ': the rule measured the gap between the modes' : ''}`;
    return true;
  }
  const h = 0.03 * (1.5 / 0.03) ** (sc.step / (STEPS - 1));
  const dx = (XMAX - XMIN) / (GRID - 1);
  const est = sc.grid.map((x) => sc.xs.reduce((acc, p) => acc + phi(x, p, h), 0) / N);
  let mass = 0;
  let ise = 0;
  for (let i = 0; i < GRID; i += 1) {
    const wgt = i === 0 || i === GRID - 1 ? 0.5 : 1;
    mass += wgt * est[i] * dx;
    ise += wgt * (est[i] - sc.truth[i]) ** 2 * dx;
  }
  sc.h = h;
  sc.est = est;
  sc.ise = ise;
  sc.curve.push([h, ise]);
  if (sc.best === null || ise < sc.best.ise) sc.best = { h, ise };
  if (sc.silIse === undefined) {
    const estS = sc.grid.map((x) => sc.xs.reduce((acc, p) => acc + phi(x, p, sc.hSil), 0) / N);
    sc.silIse = estS.reduce((acc, v, i) => acc + (i === 0 || i === GRID - 1 ? 0.5 : 1) * (v - sc.truth[i]) ** 2 * dx, 0);
  }
  sc.ok = sc.ok && Math.abs(mass - 1) < 0.02 && ise >= 0;
  sc.step += 1;
  sc.last = `h = ${h.toFixed(3)}: ISE ${ise.toFixed(4)}; Silverman's rule for this sample: ${sc.hSil.toFixed(3)} (ISE ${sc.silIse.toFixed(4)})`;
  return false;
}

export default function KdeViz() {
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
      stepMs: 320,
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
        ctx.fillText(`${sc.density.name}, ${N} points; one bandwidth per tick: gray the truth, blue the kernel estimate, amber Silverman's rule`, 12, 18);
        const x0 = 24;
        const y0 = 226;
        const pw = 330;
        const ph = 180;
        const X = (x) => x0 + ((x - VMIN) / (VMAX - VMIN)) * pw;
        const Y = (v) => y0 - (Math.min(v, 0.6) / 0.6) * ph;
        ctx.strokeStyle = `${dim}66`;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x0 + pw, y0);
        ctx.stroke();
        for (const p of sc.xs) {
          if (p < VMIN || p > VMAX) continue;
          ctx.fillStyle = `${ink}88`;
          ctx.fillRect(X(p) - 0.5, y0 - 4, 1, 4);
        }
        const drawCurve = (vals, color) => {
          ctx.strokeStyle = color;
          ctx.beginPath();
          let started = false;
          vals.forEach((v, i) => {
            const x = sc.grid[i];
            if (x < VMIN || x > VMAX) return;
            if (!started) {
              ctx.moveTo(X(x), Y(v));
              started = true;
            } else ctx.lineTo(X(x), Y(v));
          });
          ctx.stroke();
        };
        ctx.lineWidth = 2;
        drawCurve(sc.truth, dim);
        if (sc.est) drawCurve(sc.est, algo);
        ctx.lineWidth = 1;
        ctx.fillStyle = dim;
        ctx.fillText(`h = ${sc.h === null ? '' : sc.h.toFixed(3)}`, x0, y0 + 16);
        ctx.fillText('ticks: the sample', x0 + 120, y0 + 16);
        // right: ISE vs h, log-log, with Silverman marked
        const bx = 390;
        const by = 226;
        const bw = 230;
        const bh = 180;
        const XH = (h) => bx + ((Math.log(h) - Math.log(0.03)) / (Math.log(1.5) - Math.log(0.03))) * bw;
        const YI = (e) => by - ((Math.log10(Math.max(e, 1e-4)) + 4) / 3.5) * bh;
        ctx.strokeStyle = `${dim}66`;
        ctx.strokeRect(bx, by - bh, bw, bh);
        ctx.fillStyle = dim;
        ctx.fillText('ISE vs bandwidth (log-log)', bx, by - bh - 6);
        for (const e of [0.1, 0.01, 0.001]) ctx.fillText(String(e), bx - 30, YI(e) + 3);
        for (const h of [0.03, 0.1, 0.3, 1]) ctx.fillText(String(h), XH(h) - 8, by + 14);
        if (sc.curve.length > 1) {
          ctx.strokeStyle = good;
          ctx.lineWidth = 2;
          ctx.beginPath();
          sc.curve.forEach(([h, e], i) => {
            if (i === 0) ctx.moveTo(XH(h), YI(e));
            else ctx.lineTo(XH(h), YI(e));
          });
          ctx.stroke();
          ctx.lineWidth = 1;
        }
        if (sc.silIse !== undefined) {
          ctx.strokeStyle = heur;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(XH(sc.hSil), by - bh);
          ctx.lineTo(XH(sc.hSil), by);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = heur;
          ctx.beginPath();
          ctx.arc(XH(sc.hSil), YI(sc.silIse), 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillText(`rule ${sc.hSil.toFixed(3)}`, Math.min(XH(sc.hSil) + 6, bx + bw - 70), YI(sc.silIse) - 8);
        }
        if (sc.best) {
          ctx.fillStyle = algo;
          ctx.beginPath();
          ctx.arc(XH(sc.best.h), YI(sc.best.ise), 3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = sc.ok ? good : warn;
        ctx.fillText(sc.ok ? 'estimate integrates to one' : 'NOT A DENSITY', bx, by + 28);
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
          next density
        </button>
        <span className="viz-stat">{snap.line || 'sweeping…'}</span>
      </div>
    </>
  );
}
