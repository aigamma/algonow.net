import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Algorithm L on a seeded multiset of five letters, one arrangement per
// tick: the pivot (amber), its partner (amber), the reversed suffix (blue).
// Invariant checked every tick: the new arrangement is strictly greater
// than the last and is a rearrangement of the same letters; at the end the
// count equals the multinomial, computed independently.
const W = 640;
const H = 300;
const SEED = 20261010;
const LETTERS = 'ABCD';

function multinomial(items) {
  const fact = (k) => (k <= 1 ? 1 : k * fact(k - 1));
  const counts = {};
  for (const x of items) counts[x] = (counts[x] || 0) + 1;
  let r = fact(items.length);
  for (const c of Object.values(counts)) r /= fact(c);
  return r;
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const n = 5;
  let items;
  do {
    items = Array.from({ length: n }, () => LETTERS[Math.floor(rand() * LETTERS.length)]);
  } while (new Set(items).size < 2);
  items.sort();
  return {
    n,
    start: items.slice(),
    cur: items.slice(),
    prev: null,
    pivot: -1,
    partner: -1,
    suffix: n,
    count: 1,
    total: multinomial(items),
    swaps: 0,
    done: false,
    ok: true,
    last: `arrangement 1 of ${multinomial(items)}: ${items.join('')} (sorted start)`,
  };
}

function lexGreater(a, b) {
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return false;
}

export function sceneTick(sc) {
  if (sc.done) return true;
  const a = sc.cur.slice();
  const n = a.length;
  let i = n - 2;
  while (i >= 0 && a[i] >= a[i + 1]) i -= 1;
  if (i < 0) {
    sc.ok = sc.ok && sc.count === sc.total && sc.cur.join('') === sc.start.slice().reverse().join('');
    sc.done = true;
    sc.pivot = -1;
    sc.partner = -1;
    sc.suffix = 0;
    sc.last = `done: ${sc.count} arrangements of ${sc.start.join('')}, multinomial ${sc.total}, ${sc.swaps} swaps (${(sc.swaps / Math.max(1, sc.count - 1)).toFixed(2)} per step); invariant ${sc.ok ? 'held' : 'BROKEN'}`;
    return true;
  }
  let j = n - 1;
  while (a[j] <= a[i]) j -= 1;
  [a[i], a[j]] = [a[j], a[i]];
  let swaps = 1;
  let lo = i + 1;
  let hi = n - 1;
  while (lo < hi) {
    [a[lo], a[hi]] = [a[hi], a[lo]];
    swaps += 1;
    lo += 1;
    hi -= 1;
  }
  sc.ok = sc.ok && lexGreater(a, sc.cur) && a.slice().sort().join('') === sc.start.join('');
  sc.prev = sc.cur;
  sc.cur = a;
  sc.pivot = i;
  sc.partner = j;
  sc.suffix = i + 1;
  sc.count += 1;
  sc.swaps += swaps;
  sc.last = `arrangement ${sc.count} of ${sc.total}: ${a.join('')}; pivot at ${i + 1}, partner at ${j + 1}, suffix of ${n - 1 - i} reversed, ${swaps} swap${swaps === 1 ? '' : 's'}`;
  return false;
}

export default function NextPermutationViz() {
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
      stepMs: 170,
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
        ctx.fillText('Algorithm L: find the pivot, swap it with its partner (amber), reverse the suffix (blue); one arrangement per tick', 12, 18);
        const bw = 56;
        const x0 = 40;
        const drawRow = (arr, y, label, strong) => {
          ctx.fillStyle = dim;
          ctx.fillText(label, x0, y - 8);
          for (let k = 0; k < arr.length; k += 1) {
            const x = x0 + k * (bw + 8);
            let fill = `${dim}33`;
            if (strong) {
              if (k === sc.pivot || k === sc.partner) fill = `${heur}cc`;
              else if (k >= sc.suffix && sc.pivot >= 0) fill = `${algo}99`;
              else fill = `${dim}55`;
            }
            ctx.fillStyle = fill;
            ctx.fillRect(x, y, bw, 40);
            ctx.fillStyle = strong ? ink : `${dim}aa`;
            ctx.font = 'bold 22px ui-monospace, monospace';
            ctx.fillText(arr[k], x + 20, y + 29);
            ctx.font = '11px ui-monospace, monospace';
          }
        };
        if (sc.prev) drawRow(sc.prev, 48, 'previous arrangement', false);
        drawRow(sc.cur, 118, sc.done ? 'last arrangement (descending): the census is complete' : 'current arrangement', !sc.done);
        if (sc.pivot >= 0 && !sc.done) {
          ctx.fillStyle = heur;
          ctx.fillText('^ pivot', x0 + sc.pivot * (bw + 8), 176);
          ctx.fillStyle = algo;
          ctx.fillText('suffix reversed to increasing', x0 + sc.suffix * (bw + 8), 192);
        }
        const barW = 560;
        ctx.fillStyle = `${dim}44`;
        ctx.fillRect(x0, 214, barW, 10);
        ctx.fillStyle = sc.done ? good : algo;
        ctx.fillRect(x0, 214, (barW * sc.count) / sc.total, 10);
        ctx.fillStyle = dim;
        ctx.fillText(`arrangement ${sc.count} of ${sc.total} (the multinomial count of ${sc.start.join('')}); swaps so far ${sc.swaps}`, x0, 240);
        ctx.fillText('the file: suffix 1.718 = e - 1, 1.54 swaps per step, 362,880 arrangements of nine in 0.12 s', x0, 256);
        ctx.fillStyle = sc.ok ? good : warn;
        ctx.fillText(sc.ok ? 'invariant: each arrangement is greater than the last and uses the same letters' : 'INVARIANT BROKEN', x0, 274);
        const line = sc.last;
        ctx.fillStyle = sc.done ? (sc.ok ? good : warn) : ink;
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
          new letters
        </button>
        <span className="viz-stat">{snap.line || 'rolling…'}</span>
      </div>
    </>
  );
}
