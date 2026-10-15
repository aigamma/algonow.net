import DiagramViewport from '../components/DiagramViewport.jsx';
import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Repeated experiments on a family of twenty true nulls, one experiment
// per tick. Each experiment draws twenty z-statistics, turns them into
// exact two-sided p-values, and plots them on a log scale against two
// lines: alpha (0.05, uncorrected) and alpha / 20 (0.0025, Bonferroni).
// Any p-value under the uncorrected line is a false claim without
// correction (amber); one under the Bonferroni line is a false claim
// even after correction (red). The running family-wise error rates are
// tallied against the exact values 1 - 0.95^20 = 0.642 and
// 1 - (1 - 0.0025)^20 = 0.0488. The invariant checked every tick is that
// the Bonferroni rejections are a subset of the uncorrected ones and
// every one of them is below alpha / m.
const W = 640;
const H = 300;
const SEED = 20261010;
const M = 20;
const ALPHA = 0.05;
const EXPERIMENTS = 60;

function erfc(x) {
  // Abramowitz and Stegun 7.1.26 on erf, error under 1.5e-7
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return x >= 0 ? 1 - y : 1 + y;
}

function gauss(rand) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  return { rand, k: 0, p: [], uncorrectedFamilies: 0, bonferroniFamilies: 0, falseClaims: 0, done: false, ok: true, last: 'twenty true nulls per experiment; nothing to find' };
}

export function sceneTick(sc) {
  if (sc.done) return true;
  if (sc.k >= EXPERIMENTS) {
    sc.done = true;
    sc.last = `after ${EXPERIMENTS} experiments: a false claim in ${sc.uncorrectedFamilies} uncorrected (${(sc.uncorrectedFamilies / EXPERIMENTS * 100).toFixed(0)}%, exact 64.2%) and ${sc.bonferroniFamilies} Bonferroni (${(sc.bonferroniFamilies / EXPERIMENTS * 100).toFixed(0)}%, exact 4.9%); ${sc.falseClaims} false claims uncorrected in total`;
    return true;
  }
  const p = [];
  for (let i = 0; i < M; i += 1) {
    const z = gauss(sc.rand);
    p.push(erfc(Math.abs(z) / Math.SQRT2));
  }
  sc.p = p;
  const unc = p.filter((v) => v <= ALPHA).length;
  const bon = p.filter((v) => v <= ALPHA / M).length;
  sc.ok = sc.ok && bon <= unc && p.every((v) => v > ALPHA / M || v <= ALPHA);
  sc.falseClaims += unc;
  if (unc > 0) sc.uncorrectedFamilies += 1;
  if (bon > 0) sc.bonferroniFamilies += 1;
  sc.k += 1;
  sc.last = `experiment ${sc.k}: ${unc} of 20 null p-values under 0.05${bon ? `, ${bon} under 0.0025 (a Bonferroni false claim)` : ', none under 0.0025'}; smallest ${Math.min(...p).toFixed(4)}`;
  return false;
}

export default function BonferroniViz() {
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
      stepMs: 450,
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
        ctx.fillText('20 null p-values, log scale; amber: false claim at α; red: false claim at α/20', 12, 18);
        // left: the p-values of the current experiment
        const x0 = 40;
        const y0 = 240;
        const pw = 330;
        const ph = 190;
        const Y = (p) => y0 - ((Math.log10(Math.max(p, 1e-4)) + 4) / 4) * ph;
        ctx.strokeStyle = `${dim}66`;
        ctx.strokeRect(x0, y0 - ph, pw, ph);
        for (const [v, label] of [[1, '1'], [0.1, '0.1'], [0.01, '0.01'], [0.001, '0.001']]) {
          ctx.fillStyle = dim;
          ctx.fillText(label, x0 - 34, Y(v) + 3);
        }
        ctx.strokeStyle = heur;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(x0, Y(ALPHA));
        ctx.lineTo(x0 + pw, Y(ALPHA));
        ctx.stroke();
        ctx.strokeStyle = algo;
        ctx.beginPath();
        ctx.moveTo(x0, Y(ALPHA / M));
        ctx.lineTo(x0 + pw, Y(ALPHA / M));
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = heur;
        ctx.fillText('alpha = 0.05', x0 + pw - 80, Y(ALPHA) - 4);
        ctx.fillStyle = algo;
        ctx.fillText('alpha / 20 = 0.0025', x0 + pw - 130, Y(ALPHA / M) - 4);
        sc.p.forEach((p, i) => {
          const x = x0 + 10 + (i / (M - 1)) * (pw - 20);
          ctx.beginPath();
          ctx.arc(x, Y(p), 5, 0, Math.PI * 2);
          ctx.fillStyle = p <= ALPHA / M ? warn : p <= ALPHA ? heur : `${dim}aa`;
          ctx.fill();
        });
        // right: running tallies against the exact rates
        const tx = 400;
        const k = Math.max(sc.k, 1);
        const bars = [
          ['no correction', sc.uncorrectedFamilies / k, 1 - 0.95 ** M, heur],
          ['Bonferroni', sc.bonferroniFamilies / k, 1 - (1 - ALPHA / M) ** M, algo],
        ];
        ctx.fillStyle = dim;
        ctx.fillText('false-claim rate: bar vs exact tick', tx, 60);
        bars.forEach(([name, rate, exact, color], i) => {
          const y = 80 + i * 70;
          ctx.fillStyle = dim;
          ctx.fillText(name, tx, y);
          ctx.fillStyle = `${dim}22`;
          ctx.fillRect(tx, y + 6, 220, 18);
          ctx.fillStyle = color;
          ctx.fillRect(tx, y + 6, 220 * rate, 18);
          ctx.strokeStyle = good;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(tx + 220 * exact, y + 2);
          ctx.lineTo(tx + 220 * exact, y + 28);
          ctx.stroke();
          ctx.lineWidth = 1;
          ctx.fillStyle = ink;
          ctx.fillText(`${(rate * 100).toFixed(0)}% of ${sc.k} (exact ${(exact * 100).toFixed(1)}%)`, tx, y + 42);
        });
        ctx.fillStyle = dim;
        ctx.fillText('solution: 63.9% vs 4.73% (3,000)', tx, 236);
        ctx.fillText('99.2% and 5.07% at m = 100', tx, 252);
        ctx.fillStyle = sc.ok ? good : warn;
        ctx.fillText(sc.ok ? 'corrected claims ⊆ uncorrected' : 'INVARIANT BROKEN', tx, 272);
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
          new experiments
        </button>
        <span className="viz-stat">{snap.line || 'testing…'}</span>
      </div>
    </>
  );
}
