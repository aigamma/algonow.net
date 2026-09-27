import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Sixteen values scanned on a simulated parallel machine, one level
// per tick. Scene A, Blelloch: four up-sweep levels build a tree of
// partial sums (amber pairs combine into their right element), the
// root is cleared, and four down-sweep levels push each node's
// left-total back down; every element then holds the sum of everything
// before it. Scene B, Hillis-Steele: four levels where every element
// adds the one 1, 2, 4, 8 places to its left: fewer levels, more work.
// The counters compare work and depth with the sequential chain.
const W = 640;
const H = 300;
const SEED = 20260926;
const N = 16;

export function makeScene(seed, kind) {
  const rand = mulberry32(seed);
  const a = Array.from({ length: N }, () => 1 + Math.floor(rand() * 9));
  const inclusive = [];
  let acc = 0;
  for (const v of a) {
    acc += v;
    inclusive.push(acc);
  }
  return { kind, a, x: [...a], phase: kind === 'blelloch' ? 'up' : 'hs', d: 1, work: 0, depth: 0, active: [], inclusive, exclusive: [0, ...inclusive.slice(0, -1)], done: false };
}

export function sceneTick(sc) {
  if (sc.done) return true;
  const x = sc.x;
  sc.active = [];
  if (sc.kind === 'blelloch') {
    if (sc.phase === 'up') {
      const d = sc.d;
      const snap = [...x];
      for (let i = 0; i < N; i += 2 * d) {
        x[i + 2 * d - 1] = snap[i + d - 1] + snap[i + 2 * d - 1];
        sc.active.push(i + d - 1, i + 2 * d - 1);
        sc.work += 1;
      }
      sc.depth += 1;
      sc.d *= 2;
      if (sc.d >= N) {
        sc.phase = 'down';
        x[N - 1] = 0;
        sc.d = N / 2;
      }
      return false;
    }
    const d = sc.d;
    const snap = [...x];
    for (let i = 0; i < N; i += 2 * d) {
      const left = snap[i + d - 1];
      x[i + d - 1] = snap[i + 2 * d - 1];
      x[i + 2 * d - 1] = snap[i + 2 * d - 1] + left;
      sc.active.push(i + d - 1, i + 2 * d - 1);
      sc.work += 1;
    }
    sc.depth += 1;
    sc.d = Math.floor(sc.d / 2);
    if (sc.d < 1) sc.done = true;
    return sc.done;
  }
  const d = sc.d;
  const snap = [...x];
  for (let i = d; i < N; i++) {
    x[i] = snap[i - d] + snap[i];
    sc.active.push(i);
    sc.work += 1;
  }
  sc.depth += 1;
  sc.d *= 2;
  if (sc.d >= N) sc.done = true;
  return sc.done;
}

export function isCorrect(sc) {
  const target = sc.kind === 'blelloch' ? sc.exclusive : sc.inclusive;
  return sc.x.every((v, i) => v === target[i]);
}

export default function ScanViz() {
  const canvasRef = useRef(null);
  const cycle = useRef(0);
  const statsRef = useRef({ line: '' });
  const [restart, setRestart] = useState(0);
  const [snap, setSnap] = useState({ line: '' });

  useEffect(() => {
    const id = setInterval(() => setSnap({ ...statsRef.current }), 400);
    return () => clearInterval(id);
  }, []);

  const kindOf = (c) => (c % 2 === 0 ? 'blelloch' : 'hillis');

  useCanvasLoop(
    canvasRef,
    {
      width: W,
      height: H,
      stepMs: 900,
      init: () => ({ scene: makeScene(SEED + Math.floor(cycle.current / 2) * 7919, kindOf(cycle.current)), done: false, rest: 0, stopAtRest: isStill() }),
      tick: (s) => {
        if (s.done) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            Object.assign(s, { scene: makeScene(SEED + Math.floor(cycle.current / 2) * 7919, kindOf(cycle.current)), done: false, rest: 0 });
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
        const title = sc.kind === 'blelloch' ? `Blelloch scan (exclusive): ${sc.phase === 'up' ? 'up-sweep' : 'down-sweep'}, one level per tick` : 'Hillis-Steele scan (inclusive): each element adds the one d places left, d = 1, 2, 4, 8';
        ctx.fillText(`${N} values on a parallel machine; ${title}`, 12, 18);
        const x0 = 24;
        const bw = 36;
        const base = 200;
        const maxV = Math.max(...sc.inclusive, 1);
        for (let i = 0; i < N; i++) {
          const v = sc.x[i];
          const h = (Math.max(0, v) / maxV) * 140;
          const active = sc.active.includes(i);
          ctx.fillStyle = active ? heur : s.done ? good : `${algo}99`;
          ctx.fillRect(x0 + i * bw, base - h, bw - 6, h);
          ctx.fillStyle = ink;
          ctx.font = '10px ui-monospace, monospace';
          ctx.fillText(String(v), x0 + i * bw + 4, base - h - 4);
          ctx.fillStyle = dim;
          ctx.fillText(String(sc.a[i]), x0 + i * bw + 4, base + 14);
          ctx.font = '11px ui-monospace, monospace';
        }
        ctx.fillStyle = dim;
        ctx.fillText('gray row: the input; bars: the working array; amber: this level’s writes', x0, base + 34);
        ctx.fillStyle = ink;
        ctx.fillText(`work ${sc.work} operations, depth ${sc.depth} levels (sequential: ${N - 1} operations, ${N - 1} levels deep)`, x0, base + 52);
        let line;
        if (s.done) {
          const ok = isCorrect(sc);
          line = sc.kind === 'blelloch'
            ? `${ok ? 'exact' : 'WRONG'}: exclusive prefix sums in ${sc.depth} levels and ${sc.work} operations, 2(n − 1) work at 2 log₂ n depth`
            : `${ok ? 'exact' : 'WRONG'}: inclusive prefix sums in ${sc.depth} levels and ${sc.work} operations, n log₂ n − n + 1 work at log₂ n depth`;
          ctx.fillStyle = ok ? good : '#e2606c';
        } else {
          line = sc.kind === 'blelloch' ? (sc.phase === 'up' ? 'up: pairs combine into their right element, building a tree of partial sums' : 'down: each node passes its left child the running total and keeps the sum') : 'every element works in parallel; the chain of dependencies is only log n long';
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
          next scan
        </button>
        <span className="viz-stat">{snap.line || 'scanning…'}</span>
      </div>
    </>
  );
}
