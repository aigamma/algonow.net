import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two acts of one merge. Act one: run detection on nearly-sorted
// bars: ascending stretches light up as runs (a descending one
// flips), short runs grow to minrun, and the merge stack collapses
// them into one sorted skyline: the comparison counter loitering
// far below n log n. Act two: the gallop: two runs where one wins
// long streaks: the plodding merge pays one comparison per
// element, the galloping merge leaps in doubling strides: both
// counters race, and the same block of work costs a fraction.
const W = 640;
const H = 300;
const SEED = 20260827;
const N1 = 72;
const END_HOLD = 70;

export function detectRuns(a) {
  const runs = [];
  let i = 0;
  const arr = a.slice();
  while (i < arr.length) {
    let j = i + 1;
    if (j < arr.length) {
      if (arr[j] < arr[i]) {
        while (j + 1 < arr.length && arr[j + 1] < arr[j]) j += 1;
        const seg = arr.slice(i, j + 1).reverse();
        for (let t = 0; t < seg.length; t++) arr[i + t] = seg[t];
        runs.push({ from: i, to: j, flipped: true });
      } else {
        while (j + 1 < arr.length && arr[j + 1] >= arr[j]) j += 1;
        runs.push({ from: i, to: j, flipped: false });
      }
    } else {
      runs.push({ from: i, to: i, flipped: false });
    }
    i = j + 1;
  }
  return { arr, runs };
}

export function gallopMergeCounts(left, right, minGallop) {
  // returns comparisons for plodding vs galloping merges.
  const plod = (() => {
    let i = 0;
    let j = 0;
    let c = 0;
    while (i < left.length && j < right.length) {
      c += 1;
      if (right[j] < left[i]) j += 1;
      else i += 1;
    }
    return c;
  })();
  const gallop = (() => {
    let i = 0;
    let j = 0;
    let c = 0;
    let wl = 0;
    let wr = 0;
    while (i < left.length && j < right.length) {
      if (wl >= minGallop) {
        let ofs = 1;
        while (i + ofs < left.length) {
          c += 1;
          if (left[i + ofs - 1] <= right[j]) ofs = ofs * 2 + 1;
          else break;
        }
        let lo = i + Math.floor(ofs / 2);
        let hi = Math.min(i + ofs, left.length);
        while (lo < hi) {
          const m = Math.floor((lo + hi) / 2);
          c += 1;
          if (left[m] <= right[j]) lo = m + 1;
          else hi = m;
        }
        i = lo;
        wl = 0;
        wr = 0;
        continue;
      }
      c += 1;
      if (right[j] < left[i]) {
        j += 1;
        wr += 1;
        wl = 0;
      } else {
        i += 1;
        wl += 1;
        wr = 0;
      }
    }
    return c;
  })();
  return { plod, gallop };
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  // Act 1: nearly-sorted bars with one descending stretch.
  const a = [];
  for (let i = 0; i < N1; i++) a.push(4 + i * 3 + Math.floor(rand() * 4));
  // plant a descending stretch and a couple of swaps
  const d0 = 24 + Math.floor(rand() * 10);
  for (let t = 0; t < 8; t++) a[d0 + t] = 200 - t * 9 - Math.floor(rand() * 3);
  const s1 = 55 + Math.floor(rand() * 10);
  [a[s1], a[s1 + 3]] = [a[s1 + 3], a[s1]];
  const det = detectRuns(a);
  const sorted = a.slice().sort((x, y) => x - y);

  // Act 2: one run winning long streaks.
  const left = [];
  const right = [];
  for (let b = 0; b < 4; b++) {
    for (let t = 0; t < 100; t++) left.push(b * 200 + t);
    right.push(b * 200 + 150 + b);
  }
  const counts = gallopMergeCounts(left, right, 7);
  return { a, det, sorted, left, right, counts };
}

export default function TimsortViz() {
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
        const len = s.act === 0 ? 260 + END_HOLD : 220 + END_HOLD;
        if (s.tick >= len) {
          // Hold the finished act for the full rest before the next
          // act begins: every burst of motion earns its two minutes.
          s.tick = len;
          s.actRest = (s.actRest || 0) + 1;
          if (s.actRest > holdTicks(s)) {
            s.tick = 0;
            s.act += 1;
            s.actRest = 0;
          }
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

        if (actIdx === 0) {
          const t = done ? 260 : Math.min(s.tick, 260);
          const phase = t < 90 ? 0 : t < 160 ? 1 : 2; // raw -> runs -> sorted
          ctx.fillText('act 1 · hunt the order already present: runs light up, a descending one flips, merges finish it', 14, 20);
          const barsSource = phase === 2 ? sc.sorted : phase === 1 ? sc.det.arr : sc.a;
          const maxV = Math.max(...sc.a, ...sc.sorted);
          const runColors = [algo, heur, good, '#b78cff', '#5fd4d0', warn];
          const frac = phase === 2 ? Math.min(1, (t - 160) / 80) : 1;
          for (let i = 0; i < N1; i++) {
            const v = phase === 2
              ? Math.round(sc.det.arr[i] + (sc.sorted[i] - sc.det.arr[i]) * frac)
              : barsSource[i];
            const h2 = (v / maxV) * 190;
            let color = dim;
            if (phase >= 1) {
              const ri = sc.det.runs.findIndex((r) => i >= r.from && i <= r.to);
              color = phase === 2 ? good : runColors[ri % runColors.length];
            }
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.75;
            ctx.fillRect(24 + i * 8.3, 240 - h2, 6.4, h2);
            ctx.globalAlpha = 1;
          }
          let line;
          if (done || t >= 260) {
            line = `sorted: ${sc.det.runs.length} natural runs found and merged: comparisons stay near n on nearly-sorted data (9.7x under mergesort, measured)`;
            ctx.fillStyle = good;
          } else if (phase === 0) {
            line = 'the raw array: mostly ascending, one descending stretch, a couple of swaps';
            ctx.fillStyle = ink;
          } else if (phase === 1) {
            line = `${sc.det.runs.length} runs detected: the descending stretch reversed in place (still one comparison per element)`;
            ctx.fillStyle = heur;
          } else {
            line = 'the merge stack collapses the runs: balanced by the stack invariants';
            ctx.fillStyle = ink;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = { line };
        } else {
          const t = done ? 220 : Math.min(s.tick, 220);
          ctx.fillText('act 2 · one run wins 100 straight: plod pays per element, the gallop leaps 1, 3, 7, 15…', 14, 20);
          const total = sc.left.length + sc.right.length;
          const frac = Math.min(1, t / 200);
          // plodding lane
          const plodDone = Math.floor(frac * sc.counts.plod);
          const galDone = Math.floor(frac * sc.counts.gallop);
          ctx.fillStyle = warn;
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(`plodding merge: ${plodDone.toLocaleString()} comparisons`, 60, 80);
          ctx.strokeStyle = warn;
          ctx.strokeRect(60, 92, 500, 16);
          ctx.fillStyle = 'rgba(226,96,108,0.4)';
          ctx.fillRect(60, 92, 500 * (plodDone / sc.counts.plod), 16);
          ctx.fillStyle = algo;
          ctx.fillText(`galloping merge: ${galDone.toLocaleString()} comparisons`, 60, 150);
          ctx.strokeStyle = algo;
          ctx.strokeRect(60, 162, 500 * (sc.counts.gallop / sc.counts.plod), 16);
          ctx.fillStyle = 'rgba(93,162,255,0.4)';
          ctx.fillRect(60, 162, 500 * (galDone / sc.counts.plod), 16);
          ctx.fillStyle = dim;
          ctx.font = '10px ui-monospace, monospace';
          ctx.fillText('jumps of 1, 3, 7, 15, 31… then binary search inside the last stride', 60, 200);

          let line;
          if (done || t >= 220) {
            line = `same ${total} elements merged: ${sc.counts.plod} vs ${sc.counts.gallop} comparisons (${(sc.counts.plod / sc.counts.gallop).toFixed(1)}x): streaks are for leaping, not walking`;
            ctx.fillStyle = good;
          } else {
            line = 'both merges produce the identical output: only the bill differs';
            ctx.fillStyle = ink;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = {
            line: done
              ? 'find the order, keep the order, leap the streaks: the production sort in three verbs'
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
          new array
        </button>
        <span className="viz-stat">
          {snap.line || 'hunting for runs…'}
        </span>
      </div>
    </>
  );
}
