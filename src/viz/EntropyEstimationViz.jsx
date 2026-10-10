import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// The plug-in entropy estimator watching its own sample grow. A seeded source
// over eight to sixteen symbols is drawn as blue outlines (the truth); the
// empirical frequencies fill in as amber bars; on the right the plug-in and
// the Miller-Madow estimate climb toward the true entropy (green dashed) as
// the sample grows by fifteen percent per tick, the gap shaded red. Checked on
// every tick: the two forms of the formula agree, the estimate never exceeds
// log2 of the symbols seen, it is never negative, and the correction is never
// below the raw estimate.
const W = 640;
const H = 300;
const SEED = 20261010;
const TARGET = 2000;

function entropyLogForm(counts, n) {
  let s = 0;
  for (const c of counts) if (c) s += c * Math.log2(c);
  return Math.log2(n) - s / n;
}

function entropyDirect(counts, n) {
  let h = 0;
  for (const c of counts) if (c) h -= (c / n) * Math.log2(c / n);
  return h;
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const k = 8 + Math.floor(rand() * 9);
  const w = [];
  let z = 0;
  for (let i = 0; i < k; i += 1) {
    const v = 0.04 + rand() ** 2;
    w.push(v);
    z += v;
  }
  const probs = w.map((v) => v / z);
  const cum = [];
  let acc = 0;
  for (const p of probs) {
    acc += p;
    cum.push(acc);
  }
  cum[k - 1] = 1;
  const truth = -probs.reduce((s, p) => s + p * Math.log2(p), 0);
  return {
    k, probs, cum, truth, rand, counts: new Array(k).fill(0), n: 0, est: 0, mm: 0, distinct: 0, trail: [], checks: 0, done: false, ok: true,
    last: `${k} symbols, true entropy ${truth.toFixed(3)} bits (the maximum for ${k} is ${Math.log2(k).toFixed(3)}); drawing samples`,
  };
}

export function sceneTick(sc) {
  if (sc.done) return true;
  const batch = Math.max(1, Math.ceil(sc.n * 0.15));
  for (let i = 0; i < batch; i += 1) {
    const u = sc.rand();
    let j = 0;
    while (j < sc.k - 1 && u > sc.cum[j]) j += 1;
    sc.counts[j] += 1;
  }
  sc.n += batch;
  const h = entropyLogForm(sc.counts, sc.n);
  const h2 = entropyDirect(sc.counts, sc.n);
  sc.distinct = sc.counts.filter((c) => c > 0).length;
  sc.est = h;
  sc.mm = h + (sc.distinct - 1) / (2 * sc.n * Math.LN2);
  const ceiling = Math.log2(sc.distinct);
  if (!(Math.abs(h - h2) < 1e-9) || h > ceiling + 1e-9 || h < -1e-12 || sc.mm < h) sc.ok = false;
  sc.checks += 1;
  sc.trail.push({ n: sc.n, h, mm: sc.mm });
  if (sc.n >= TARGET) {
    sc.done = true;
    sc.last = `done: n = ${sc.n.toLocaleString()}; plug-in ${h.toFixed(3)} bits (bias ${(h - sc.truth).toFixed(3)}), Miller-Madow ${sc.mm.toFixed(3)} (${(sc.mm - sc.truth).toFixed(3)}), truth ${sc.truth.toFixed(3)}; first-order bias ${(-(sc.k - 1) / (2 * sc.n * Math.LN2)).toFixed(4)}; invariants held on ${sc.checks} ticks: ${sc.ok ? 'yes' : 'NO'}`;
    return true;
  }
  sc.last = `n = ${sc.n.toLocaleString()}: ${sc.distinct} of ${sc.k} symbols seen; plug-in ${h.toFixed(3)} bits, ceiling log2(seen) = ${ceiling.toFixed(3)}, truth ${sc.truth.toFixed(3)}, gap ${(h - sc.truth).toFixed(3)}`;
  return false;
}

export function summarize(sc) {
  return { ok: sc.ok, n: sc.n, k: sc.k, bias: +(sc.est - sc.truth).toFixed(4), mmBias: +(sc.mm - sc.truth).toFixed(4) };
}

export default function EntropyEstimationViz() {
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
      stepMs: 350,
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
        ctx.fillText('blue outlines: the true distribution; amber: empirical frequencies; right: the plug-in climbing toward the truth', 12, 18);
        // left: distribution bars
        const lx = 20;
        const lw = 280;
        const base = 230;
        const bw = lw / sc.k;
        const pmax = Math.max(...sc.probs) * 1.15;
        for (let i = 0; i < sc.k; i += 1) {
          const x = lx + i * bw;
          const f = sc.n ? sc.counts[i] / sc.n : 0;
          ctx.fillStyle = heur;
          ctx.fillRect(x + 1, base - (f / pmax) * 160, bw - 3, (f / pmax) * 160);
          ctx.strokeStyle = algo;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x + 1, base - (sc.probs[i] / pmax) * 160, bw - 3, (sc.probs[i] / pmax) * 160);
        }
        ctx.fillStyle = dim;
        ctx.fillText(`${sc.k} symbols; n = ${sc.n.toLocaleString()}; ${sc.distinct} seen`, lx, base + 16);
        // right: estimate trajectory on a log-n axis
        const rx = 340;
        const rw = 280;
        const top = 50;
        const bot = 230;
        const ymax = Math.log2(sc.k) * 1.05;
        const X = (n) => rx + (Math.log10(Math.max(1, n)) / Math.log10(TARGET)) * rw;
        const Y = (v) => bot - (v / ymax) * (bot - top);
        ctx.strokeStyle = `${dim}66`;
        ctx.beginPath();
        ctx.moveTo(rx, bot);
        ctx.lineTo(rx + rw, bot);
        ctx.moveTo(rx, top);
        ctx.lineTo(rx, bot);
        ctx.stroke();
        ctx.setLineDash([4, 3]);
        ctx.strokeStyle = good;
        ctx.beginPath();
        ctx.moveTo(rx, Y(sc.truth));
        ctx.lineTo(rx + rw, Y(sc.truth));
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = good;
        ctx.fillText(`truth ${sc.truth.toFixed(3)}`, rx + rw - 80, Y(sc.truth) - 4);
        if (sc.trail.length) {
          const last = sc.trail[sc.trail.length - 1];
          ctx.fillStyle = `${warn}55`;
          const gy = Y(Math.min(last.h, sc.truth));
          ctx.fillRect(X(last.n) - 6, gy, 12, Math.abs(Y(last.h) - Y(sc.truth)));
          const draw = (key, color) => {
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            sc.trail.forEach((pt, i) => (i ? ctx.lineTo(X(pt.n), Y(pt[key])) : ctx.moveTo(X(pt.n), Y(pt[key]))));
            ctx.stroke();
          };
          draw('mm', algo);
          draw('h', heur);
          ctx.fillStyle = heur;
          ctx.fillText(`plug-in ${last.h.toFixed(3)}`, rx + 6, top + 12);
          ctx.fillStyle = algo;
          ctx.fillText(`Miller-Madow ${last.mm.toFixed(3)}`, rx + 6, top + 26);
          ctx.fillStyle = warn;
          ctx.fillText(`gap ${(last.h - sc.truth).toFixed(3)} bits`, rx + 6, top + 40);
        }
        ctx.fillStyle = dim;
        [1, 10, 100, 1000].forEach((n) => ctx.fillText(String(n), X(n) - 6, bot + 14));
        ctx.fillText('n (log scale)', rx + rw - 70, bot + 14);
        ctx.fillStyle = sc.ok ? good : warn;
        ctx.fillText(sc.ok ? 'invariants: formulas agree; estimate <= log2(symbols seen); correction >= raw' : 'INVARIANT BROKEN', 12, 262);
        const line = sc.last;
        ctx.fillStyle = s.done ? (sc.ok ? good : warn) : ink;
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
          new source
        </button>
        <span className="viz-stat">{snap.line || 'sampling…'}</span>
      </div>
    </>
  );
}
