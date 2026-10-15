import DiagramViewport from '../components/DiagramViewport.jsx';
import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// The Laplace mechanism, live. Two neighboring databases whose counts
// differ by one record are released again and again, a batch of draws per
// tick, into two histograms (blue for D, amber for D'). Beside them the
// exact densities are drawn, and under them the ratio of the two
// histograms bin by bin against the line e^epsilon that the definition
// promises. An attacker who knows both databases guesses from each
// release; the running success rate is shown against the theorem's
// ceiling e^epsilon / (1 + e^epsilon). Epsilon cycles 0.5, 1, 2. The
// invariant checked every tick: the exact density ratio never exceeds
// e^epsilon anywhere, and every well-populated bin's empirical ratio is
// within a generous statistical margin of it.
const W = 640;
const H = 300;
const SEED = 20261010;
const TICKS = 60;
const BATCH = 1500;
const BIN = 0.5;
const SPAN = 8; // bins cover [-SPAN, SPAN] around the true count

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const eps = [0.5, 1, 2][seed % 3];
  const b = 1 / eps;
  const nb = Math.round((2 * SPAN) / BIN);
  return { rand, eps, b, nb, histD: new Array(nb).fill(0), histDp: new Array(nb).fill(0), n: 0, tick: 0, hits: 0, trials: 0, worst: 1, done: false, ok: true, last: `epsilon ${eps}: scale b = ${b.toFixed(2)}; the two counts differ by one; releases start now` };
}

function lap(rand, b) {
  const u = rand() - 0.5;
  return -b * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
}

export function sceneTick(sc) {
  if (sc.done) return true;
  if (sc.tick >= TICKS) {
    sc.done = true;
    const ceiling = Math.exp(sc.eps) / (1 + Math.exp(sc.eps));
    sc.last = `${sc.n.toLocaleString()} releases each: worst populated-bin ratio ${sc.worst.toFixed(3)} vs e^eps = ${Math.exp(sc.eps).toFixed(3)}; attacker ${(sc.hits / sc.trials).toFixed(3)} vs ceiling ${ceiling.toFixed(3)}; the file: 0.698 vs 0.731 at eps 1`;
    return true;
  }
  const { b } = sc;
  for (let i = 0; i < BATCH; i += 1) {
    const x = lap(sc.rand, b); // release from D, centered at 0
    const y = 1 + lap(sc.rand, b); // release from D', count one higher
    const bx = Math.floor((x + SPAN) / BIN);
    const by = Math.floor((y + SPAN) / BIN);
    if (bx >= 0 && bx < sc.nb) sc.histD[bx] += 1;
    if (by >= 0 && by < sc.nb) sc.histDp[by] += 1;
    // the attacker: a fair coin picks the database, the release is shown,
    // the attacker says D when the release is below 0.5
    const fromD = sc.rand() < 0.5;
    const seen = fromD ? x : y;
    sc.trials += 1;
    if ((seen < 0.5) === fromD) sc.hits += 1;
  }
  sc.n += BATCH;
  // exact ratio check on a grid, and the empirical ratio on populated bins
  let exactMax = 0;
  for (let k = 0; k < sc.nb; k += 1) {
    const x = -SPAN + (k + 0.5) * BIN;
    const r = Math.exp((Math.abs(x - 1) - Math.abs(x)) / b);
    exactMax = Math.max(exactMax, r, 1 / r);
  }
  let worst = 1;
  for (let k = 0; k < sc.nb; k += 1) {
    const a = sc.histD[k];
    const c = sc.histDp[k];
    if (Math.min(a, c) >= 3000) worst = Math.max(worst, a / c, c / a);
  }
  sc.worst = worst;
  sc.ok = exactMax <= Math.exp(sc.eps) + 1e-9 && worst <= Math.exp(sc.eps) * 1.3;
  sc.tick += 1;
  sc.last = `${sc.n.toLocaleString()} releases each: worst bin ratio ${worst.toFixed(3)} (bins with 3,000+ draws) vs e^eps ${Math.exp(sc.eps).toFixed(3)}; attacker ${(sc.hits / sc.trials).toFixed(3)} of ${sc.trials.toLocaleString()}`;
  return false;
}

export default function LaplaceMechanismViz() {
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
        ctx.fillText(`ε=${sc.eps}; blue D, amber D' (count + 1); below: measured density ratio vs e^ε`, 12, 18);
        const x0 = 24;
        const pw = 380;
        const X = (v) => x0 + ((v + SPAN) / (2 * SPAN)) * pw;
        const top = 34;
        const ph = 120;
        const maxCount = Math.max(1, ...sc.histD, ...sc.histDp);
        const bw = pw / sc.nb;
        for (let k = 0; k < sc.nb; k += 1) {
          const hD = (sc.histD[k] / maxCount) * ph;
          const hP = (sc.histDp[k] / maxCount) * ph;
          ctx.fillStyle = `${algo}aa`;
          ctx.fillRect(x0 + k * bw, top + ph - hD, bw / 2 - 1, hD);
          ctx.fillStyle = `${heur}aa`;
          ctx.fillRect(x0 + k * bw + bw / 2, top + ph - hP, bw / 2 - 1, hP);
        }
        // exact densities, scaled to the histogram
        const scale = (sc.n * BIN) / maxCount * ph;
        const dens = (x, mu) => Math.exp(-Math.abs(x - mu) / sc.b) / (2 * sc.b);
        for (const [mu, color] of [[0, algo], [1, heur]]) {
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          for (let i = 0; i <= 160; i += 1) {
            const x = -SPAN + (i / 160) * 2 * SPAN;
            const y = top + ph - Math.min(ph, dens(x, mu) * scale);
            if (i === 0) ctx.moveTo(X(x), y);
            else ctx.lineTo(X(x), y);
          }
          ctx.stroke();
        }
        ctx.lineWidth = 1;
        // ratio panel
        const ry = 270;
        const rh = 90;
        const e = Math.exp(sc.eps);
        const YR = (r) => ry - (Math.log(r) / Math.log(e * 1.6)) * rh;
        ctx.strokeStyle = `${dim}66`;
        ctx.beginPath();
        ctx.moveTo(x0, YR(1));
        ctx.lineTo(x0 + pw, YR(1));
        ctx.stroke();
        ctx.strokeStyle = good;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(x0, YR(e));
        ctx.lineTo(x0 + pw, YR(e));
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = good;
        ctx.fillText(`e^eps = ${e.toFixed(2)}`, x0 + pw - 70, YR(e) - 4);
        for (let k = 0; k < sc.nb; k += 1) {
          const a = sc.histD[k];
          const c = sc.histDp[k];
          if (Math.min(a, c) >= 200) {
            const r = Math.max(a / c, c / a);
            ctx.fillStyle = r > e * 1.3 ? warn : `${ink}cc`;
            ctx.fillRect(x0 + k * bw + 2, YR(r) - 2, bw - 4, 3);
          }
        }
        ctx.fillStyle = dim;
        ctx.fillText('ratio of the two histograms, bin by bin (log scale), bins with 200+ draws', x0, ry + 12);
        // right: attacker
        const tx = 430;
        ctx.fillStyle = ink;
        ctx.fillText(`${sc.n.toLocaleString()} releases each`, tx, 50);
        ctx.fillStyle = dim;
        ctx.fillText(`scale b = 1 / eps = ${sc.b.toFixed(2)}`, tx, 68);
        ctx.fillText(`mean error = b`, tx, 84);
        const ceiling = e / (1 + e);
        const rate = sc.trials ? sc.hits / sc.trials : 0;
        ctx.fillStyle = ink;
        ctx.fillText(`attacker who knows both databases:`, tx, 114);
        ctx.fillText(`right ${rate.toFixed(3)} of ${sc.trials.toLocaleString()}`, tx, 130);
        ctx.fillStyle = good;
        ctx.fillText(`ceiling: e^ε/(1+e^ε)=${ceiling.toFixed(3)}`, tx, 148);
        ctx.fillStyle = dim;
        ctx.fillText(`exact best test: ${(1 - Math.exp(-sc.eps / 2) / 2).toFixed(3)}`, tx, 164);
        ctx.fillStyle = sc.ok ? good : warn;
        ctx.fillText(sc.ok ? 'density ratio never above e^eps' : 'RATIO BOUND BROKEN', tx, 194);
        ctx.fillStyle = dim;
        ctx.fillText('the file: 0.698 vs 0.731 at eps 1;', tx, 222);
        ctx.fillText('exact 1.000; ad hoc noise 0.952', tx, 238);
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
          next epsilon
        </button>
        <span className="viz-stat">{snap.line || 'releasing…'}</span>
      </div>
    </>
  );
}
