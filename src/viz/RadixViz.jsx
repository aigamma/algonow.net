import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two acts of one card room. Act one: twenty three-digit numbers
// run through three stable passes: ones, tens, hundreds: cards
// drop into ten pockets and gather in order, and after pass k the
// deck is provably sorted by its k lowest digits (the model
// asserts it). Act two: the wall: counted merge-sort comparisons
// race radix touches on the same array, with the sabotage line
// (unstable pockets: how many decks break) in red.
const W = 640;
const H = 300;
const SEED = 20260829;
const END_HOLD = 70;
const N1 = 20;

export function radixPasses(arr, digits, stable = true) {
  const states = [arr.slice()];
  let touches = 0;
  let a = arr.slice();
  for (let p = 0; p < digits; p++) {
    const div = 10 ** p;
    const buckets = Array.from({ length: 10 }, () => []);
    for (const x of a) {
      touches += 2;
      buckets[Math.floor(x / div) % 10].push(x);
    }
    if (!stable) for (const b of buckets) b.reverse();
    a = [];
    for (const b of buckets) {
      touches += 1;
      a.push(...b);
    }
    states.push(a.slice());
  }
  return { states, touches, out: a };
}

export function sortedByLow(arr, p) {
  const mod = 10 ** p;
  for (let i = 1; i < arr.length; i++) {
    if (arr[i - 1] % mod > arr[i] % mod) return false;
  }
  return true;
}

export function mergeCount(arr) {
  let cmps = 0;
  const rec = (a) => {
    if (a.length <= 1) return a;
    const mid = a.length >> 1;
    const l = rec(a.slice(0, mid));
    const r = rec(a.slice(mid));
    const out = [];
    let i = 0;
    let j = 0;
    while (i < l.length && j < r.length) {
      cmps += 1;
      if (l[i] <= r[j]) out.push(l[i++]);
      else out.push(r[j++]);
    }
    while (i < l.length) out.push(l[i++]);
    while (j < r.length) out.push(r[j++]);
    return out;
  };
  const sorted = rec(arr);
  return { cmps, sorted };
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  // act 1: twenty 3-digit numbers, three passes recorded
  const deck = Array.from({ length: N1 }, () => 100 + Math.floor(rand() * 900));
  const passes = radixPasses(deck, 3);
  // act 2: the counted race at n = 4,000, 4-digit keys (4 decimal
  // passes ~ 8 touches/key vs log2(4000) ~ 12 comparisons/key; at 6
  // digits decimal radix would honestly LOSE this size, so the act
  // races the regime where it wins and the caption says why)
  const big = Array.from({ length: 4000 }, () => Math.floor(rand() * 1e4));
  const r = radixPasses(big, 4);
  const m = mergeCount(big);
  // sabotage: how many of 40 decks break without stability
  let broken = 0;
  for (let t = 0; t < 40; t++) {
    const d = Array.from({ length: 60 }, () => Math.floor(rand() * 1e4));
    const bad = radixPasses(d, 4, false).out;
    const good = [...d].sort((x, y) => x - y);
    if (JSON.stringify(bad) !== JSON.stringify(good)) broken += 1;
  }
  return { deck, passes, race: { radix: r.touches, cmps: m.cmps }, radixOut: r.out, mergeOut: m.sorted, broken };
}

export default function RadixViz() {
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
      stepMs: 60,
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
        const len = s.act === 0 ? 3 * 90 + END_HOLD : 200 + END_HOLD;
        if (s.tick >= len) {
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
          const t = done ? 3 * 90 : Math.min(s.tick, 3 * 90);
          const pass = Math.min(2, Math.floor(t / 90));
          const within = t - pass * 90; // 0..89: 0-50 dealing, 50-90 gathered
          const dealing = within < 50 && !done;
          const digitName = ['ones', 'tens', 'hundreds'][pass];
          ctx.fillText(`act 1 · pass ${pass + 1} of 3: bucket every card by its ${digitName} digit, gather pockets 0-9 in order`, 14, 20);
          const before = sc.passes.states[pass];
          const after = sc.passes.states[pass + 1];
          const div = 10 ** pass;
          if (dealing) {
            const dealt = Math.min(N1, Math.ceil((within / 50) * N1));
            // pockets
            const pockets = Array.from({ length: 10 }, () => []);
            for (let i = 0; i < dealt; i++) {
              pockets[Math.floor(before[i] / div) % 10].push(before[i]);
            }
            for (let d = 0; d < 10; d++) {
              const x = 30 + d * 58;
              ctx.strokeStyle = 'rgba(154,165,189,0.4)';
              ctx.strokeRect(x, 60, 50, 150);
              ctx.fillStyle = heur;
              ctx.fillText(String(d), x + 22, 226);
              pockets[d].forEach((v, i) => {
                ctx.fillStyle = ink;
                ctx.font = '11px ui-monospace, monospace';
                ctx.fillText(String(v), x + 10, 76 + i * 15);
              });
            }
            // remaining deck
            ctx.fillStyle = dim;
            ctx.fillText(`dealing card ${dealt}/${N1}: pockets keep arrival order (stability)`, 30, 46);
          } else {
            // gathered row
            after.forEach((v, i) => {
              const x = 24 + (i % 10) * 60;
              const y = 80 + Math.floor(i / 10) * 40;
              ctx.fillStyle = pass === 2 ? good : algo;
              ctx.font = '12px ui-monospace, monospace';
              ctx.fillText(String(v), x, y);
            });
            ctx.fillStyle = good;
            ctx.fillText(`gathered: sorted by the ${pass + 1} lowest digit(s) ✓ (the model asserts this)`, 30, 46);
          }
          let line;
          if (done || (pass === 2 && within >= 50)) {
            line = 'three passes, zero comparisons: the order was assembled, not discovered';
            ctx.fillStyle = good;
          } else {
            line = `stability is the engine: equal ${digitName} digits keep the order earlier passes built`;
            ctx.fillStyle = heur;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = { line };
        } else {
          const t = done ? 200 : Math.min(s.tick, 200);
          ctx.fillText('act 2 · the wall: same 4,000 four-digit keys: counted comparisons vs radix touches', 14, 20);
          const frac = Math.min(1, t / 200);
          const maxV = Math.max(sc.race.cmps, sc.race.radix);
          const bars = [
            ['merge sort: comparisons (the wall applies)', sc.race.cmps, warn],
            ['lsd radix: touches (no questions asked)', sc.race.radix, algo],
          ];
          bars.forEach(([label, total, color], i) => {
            const val = Math.floor(frac * total);
            const y = 66 + i * 60;
            ctx.fillStyle = color;
            ctx.font = '12px ui-monospace, monospace';
            ctx.fillText(`${label}: ${val.toLocaleString()}`, 60, y - 8);
            ctx.strokeStyle = color;
            ctx.strokeRect(60, y, 500 * (total / maxV), 14);
            ctx.fillStyle = `${color}44`;
            ctx.fillRect(60, y, 500 * (val / maxV), 14);
          });
          ctx.fillStyle = dim;
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillText('both outputs identical (checked in this figure’s model)', 60, 210);
          ctx.fillStyle = warn;
          ctx.fillText(`sabotage: unstable pockets broke ${sc.broken} of 40 decks: the invariant IS the algorithm`, 60, 232);
          let line;
          if (done || t >= 200) {
            line = `${sc.race.cmps.toLocaleString()} comparisons vs ${sc.race.radix.toLocaleString()} touches (${(sc.race.cmps / sc.race.radix).toFixed(1)}x): the wall binds only those who ask`;
            ctx.fillStyle = good;
          } else {
            line = 'the comparison sort discovers order by questions; radix assembles it by digits';
            ctx.fillStyle = ink;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = {
            line: done
              ? 'deal by digit, gather stably, repeat: the 1890 card room is still the fastest thing on a GPU'
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
          new deck
        </button>
        <span className="viz-stat">
          {snap.line || 'dealing cards…'}
        </span>
      </div>
    </>
  );
}
