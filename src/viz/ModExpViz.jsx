import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two acts of one exponent. Act one: the bit ladder: a twenty-bit
// exponent read left to right, one square per bit (blue), one
// extra multiply on each 1 (amber), the accumulator staying small
// under the modulus while a counter shows what the naive ladder
// would have paid for the prefix consumed so far: a number racing
// toward a million while ours saunters to thirty. Act two: the
// leak: two exponents of the same length but different popcount
// leave visibly different square-and-multiply stripe trails: an
// op-counting eavesdropper reads the 1s: and the Montgomery
// ladder's trails are identical, bit for bit: the leak, sealed.
const W = 640;
const H = 300;
const SEED = 20260827;
const EBITS = 20;
const M = 1_000_003;
const BIT_TICKS = 10;
const END_HOLD = 70;

export function sqmTrace(a, ebits, m) {
  // ebits: array of 0/1 with leading 1. Returns per-bit steps.
  let r = a % m;
  const steps = [];
  for (let i = 1; i < ebits.length; i++) {
    r = (r * r) % m;
    const mul = ebits[i] === 1;
    if (mul) r = (r * a) % m;
    steps.push({ bit: ebits[i], r, mul });
  }
  return { steps, result: r };
}

export function ladderOps(bits) {
  return bits.length * 2;
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const ebits = [1];
  for (let i = 1; i < EBITS; i++) ebits.push(rand() < 0.5 ? 1 : 0);
  const a = 3 + Math.floor(rand() * 500);
  const trace = sqmTrace(a, ebits, M);
  // e as a number (20 bits: safe).
  let e = 0;
  for (const b of ebits) e = e * 2 + b;

  // Act 2: same length, sparse vs dense.
  const len2 = 16;
  const sparse = [1];
  const dense = [1];
  for (let i = 1; i < len2; i++) {
    sparse.push(i === 7 || i === 14 ? 1 : 0);
    dense.push(rand() < 0.75 ? 1 : 0);
  }
  const stripes = (bits) => {
    const out = [];
    for (let i = 1; i < bits.length; i++) {
      out.push('S');
      if (bits[i] === 1) out.push('M');
    }
    return out;
  };
  return {
    a,
    e,
    ebits,
    trace,
    sparse,
    dense,
    sSparse: stripes(sparse),
    sDense: stripes(dense),
  };
}

export default function ModExpViz() {
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
            ? s.scene.trace.steps.length * BIT_TICKS + END_HOLD
            : 4 * BIT_TICKS * 4 + END_HOLD;
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

        if (actIdx === 0) {
          const nSteps = sc.trace.steps.length;
          const si = Math.min(done ? nSteps : Math.floor(s.tick / BIT_TICKS), nSteps);
          const finished = done || si >= nSteps;
          ctx.fillText(`act 1 · a = ${sc.a}, e = ${sc.e.toLocaleString()} (twenty bits), m = ${M.toLocaleString()}: square per bit, multiply per 1`, 14, 20);

          // The exponent bits.
          for (let i = 0; i < sc.ebits.length; i++) {
            const x = 40 + i * 29;
            const consumed = i === 0 || i <= si;
            const active = i === si && !finished && i > 0;
            ctx.fillStyle = active
              ? sc.ebits[i]
                ? heur
                : algo
              : consumed
                ? 'rgba(154,165,189,0.35)'
                : 'rgba(154,165,189,0.12)';
            ctx.fillRect(x, 40, 24, 24);
            ctx.fillStyle = consumed || active ? '#10141f' : dim;
            ctx.font = '13px ui-monospace, monospace';
            ctx.fillText(String(sc.ebits[i]), x + 8, 57);
          }
          ctx.fillStyle = dim;
          ctx.font = '10px ui-monospace, monospace';
          ctx.fillText('each bit: SQUARE (blue) · each 1: also MULTIPLY (amber)', 40, 82);

          // Accumulator and counters.
          const cur = si === 0 ? sc.a % M : sc.trace.steps[Math.min(si, nSteps) - 1].r;
          let ePrefix = 0;
          for (let i = 0; i <= Math.min(si, sc.ebits.length - 1); i++) ePrefix = ePrefix * 2 + sc.ebits[i];
          const ourOps = si + sc.ebits.slice(1, si + 1).filter((b) => b === 1).length;
          const naiveOps = Math.max(0, ePrefix - 1);

          ctx.fillStyle = ink;
          ctx.font = '15px ui-monospace, monospace';
          ctx.fillText(`accumulator: ${cur.toLocaleString()}`, 40, 130);
          ctx.fillStyle = good;
          ctx.fillText(`our ops: ${ourOps}`, 40, 170);
          ctx.fillStyle = warn;
          ctx.fillText(`naive ladder for e so far: ${naiveOps.toLocaleString()} multiplications`, 40, 205);

          let line;
          if (finished) {
            line = `done: ${sc.a}^${sc.e.toLocaleString()} mod ${M.toLocaleString()} = ${sc.trace.result.toLocaleString()} in ${ourOps} ops: the naive ladder pays ${(sc.e - 1).toLocaleString()}`;
            ctx.fillStyle = good;
          } else {
            const st = si > 0 ? sc.trace.steps[si - 1] : null;
            line = st
              ? `bit ${si}/${nSteps}: square${st.mul ? ' + multiply' : ''} · exponent so far ${ePrefix.toLocaleString()}`
              : 'start: the leading 1 seeds the accumulator';
            ctx.fillStyle = st && st.mul ? heur : ink;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = { line };
        } else {
          const phase = done ? 4 : Math.min(Math.floor(s.tick / (BIT_TICKS * 4)), 4);
          ctx.fillText('act 2 · the leak: same 16-bit length, different popcount: count the stripes', 14, 20);

          const drawStripes = (arr, y, upTo) => {
            for (let i = 0; i < Math.min(arr.length, upTo); i++) {
              ctx.fillStyle = arr[i] === 'S' ? algo : heur;
              ctx.fillRect(150 + i * 16, y, 12, 18);
            }
          };
          const rows = [
            { label: 'S&M, sparse e', arr: sc.sSparse, y: 48 },
            { label: 'S&M, dense e', arr: sc.sDense, y: 84 },
          ];
          const ladderRow = (label, y) => {
            ctx.fillStyle = dim;
            ctx.font = '11px ui-monospace, monospace';
            ctx.fillText(label, 14, y + 14);
            for (let i = 0; i < 30; i++) {
              ctx.fillStyle = i % 2 === 0 ? algo : heur;
              ctx.fillRect(150 + i * 16, y, 12, 18);
            }
          };
          const upTo = phase >= 1 ? 99 : Math.floor((s.tick % (BIT_TICKS * 4)) / 1.2);
          rows.forEach((r0, k) => {
            if (phase >= k) {
              ctx.fillStyle = dim;
              ctx.font = '11px ui-monospace, monospace';
              ctx.fillText(r0.label, 14, r0.y + 14);
              drawStripes(r0.arr, r0.y, phase === k && !done ? upTo : 99);
              if (phase > k || done) {
                ctx.fillStyle = warn;
                ctx.fillText(`${r0.arr.length} ops`, 150 + r0.arr.length * 16 + 8, r0.y + 14);
              }
            }
          });
          if (phase >= 2) {
            ctx.fillStyle = warn;
            ctx.font = '11px ui-monospace, monospace';
            ctx.fillText(`different lengths: the trail spells out the 1s of the key`, 150, 128);
          }
          if (phase >= 3) {
            ladderRow('ladder, sparse e', 152);
            ladderRow('ladder, dense e', 188);
            ctx.fillStyle = good;
            ctx.font = '11px ui-monospace, monospace';
            ctx.fillText('identical trails: 30 ops shown of 30: the count leaks only the length', 150, 232);
          }

          let line;
          if (done || phase >= 4) {
            line = `square-and-multiply: ${sc.sSparse.length} vs ${sc.sDense.length} ops (the popcount, visible): ladder: ${ladderOps(sc.sparse.slice(1))} vs ${ladderOps(sc.dense.slice(1))}: sealed`;
            ctx.fillStyle = good;
          } else {
            line = ['tracing the sparse exponent…', 'tracing the dense exponent…', 'the eavesdropper compares…', 'the Montgomery ladder answers…'][phase];
            ctx.fillStyle = ink;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = {
            line: done
              ? 'speed reads the exponent aloud: constant-time code is a security decision'
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
          new exponent
        </button>
        <span className="viz-stat">
          {snap.line || 'reading the bits…'}
        </span>
      </div>
    </>
  );
}
