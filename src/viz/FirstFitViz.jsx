import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// The same 24 items packed twice, one item per tick: on the left in
// arrival order (first fit), on the right sorted largest first (first
// fit decreasing). Each bin is a column filling upward; the item being
// placed is amber; the bins each packing has opened are counted against
// the lower bound ceil(sum of sizes), which no packing can beat.
const W = 640;
const H = 300;
const SEED = 20260926;
const N = 24;

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const sizes = Array.from({ length: N }, () => 0.05 + rand() * 0.9);
  const lower = Math.ceil(sizes.reduce((a, b) => a + b, 0) - 1e-9);
  const mk = (order) => ({ order, bins: [], rem: [], i: 0, last: null });
  return { sizes, lower, ff: mk([...Array(N).keys()]), ffd: mk([...Array(N).keys()].sort((a, b) => sizes[b] - sizes[a])), done: false };
}

function place(sc, P) {
  if (P.i >= N) return true;
  const idx = P.order[P.i];
  const s = sc.sizes[idx];
  let k = P.bins.findIndex((_, j) => P.rem[j] >= s - 1e-12);
  if (k < 0) {
    P.bins.push([]);
    P.rem.push(1);
    k = P.bins.length - 1;
  }
  P.bins[k].push(idx);
  P.rem[k] -= s;
  P.last = { bin: k, idx };
  P.i += 1;
  return P.i >= N;
}

export function sceneTick(sc) {
  const a = place(sc, sc.ff);
  const b = place(sc, sc.ffd);
  sc.done = a && b;
  return sc.done;
}

export default function FirstFitViz() {
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
      stepMs: 260,
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
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';
        const ink = css.getPropertyValue('--ink').trim() || '#e9edf6';
        const sc = s.scene;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText(`${N} items, unit bins, one item per tick; lower bound ceil(sum) = ${sc.lower} bins`, 12, 18);
        const panels = [
          { x0: 12, P: sc.ff, name: 'first fit, arrival order', color: dim },
          { x0: 330, P: sc.ffd, name: 'first fit decreasing (largest first)', color: algo },
        ];
        const binH = 150;
        const y0 = 36;
        for (const p of panels) {
          const nb = Math.max(p.P.bins.length, 1);
          const bw = Math.min(26, 296 / Math.max(nb, 12));
          for (let k = 0; k < p.P.bins.length; k++) {
            const bx = p.x0 + k * bw;
            ctx.strokeStyle = `${dim}66`;
            ctx.strokeRect(bx, y0, bw - 2, binH);
            let yTop = y0 + binH;
            for (const idx of p.P.bins[k]) {
              const h = sc.sizes[idx] * binH;
              yTop -= h;
              const isLast = p.P.last && p.P.last.idx === idx;
              ctx.fillStyle = isLast ? heur : k % 2 === 0 ? `${algo}88` : `${algo}55`;
              ctx.fillRect(bx + 1, yTop + 0.5, bw - 4, Math.max(1, h - 1));
            }
          }
          ctx.fillStyle = p.color;
          ctx.fillText(`${p.name}: ${p.P.bins.length} bins after ${p.P.i} items`, p.x0, y0 + binH + 18);
          const waste = p.P.rem.reduce((a, b) => a + b, 0);
          ctx.fillStyle = dim;
          ctx.fillText(`empty space so far: ${waste.toFixed(2)} bins' worth`, p.x0, y0 + binH + 34);
        }
        ctx.fillStyle = heur;
        ctx.fillText('amber: the item just placed, into the first bin with room; sorting puts the big ones first', 12, 250);
        let line;
        if (s.done) {
          const a = sc.ff.bins.length;
          const b = sc.ffd.bins.length;
          line = b < a
            ? `sorted first: ${b} bins (lower bound ${sc.lower}); arrival order: ${a}; the same rule, one sort apart`
            : b === a
              ? `both packings used ${a} bins this time (lower bound ${sc.lower}); the sort cannot lose, and here it did not win`
              : `arrival order won this instance, ${a} to ${b}: the sort is a bound, not a promise`;
          ctx.fillStyle = good;
        } else {
          line = 'largest items claim bins before anything blocks them; the small ones fill the gaps afterward';
          ctx.fillStyle = ink;
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
          new items
        </button>
        <span className="viz-stat">{snap.line || 'packing…'}</span>
      </div>
    </>
  );
}
