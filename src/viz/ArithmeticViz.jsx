import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two acts of one interval. Act one: a short message narrows
// [0, 1) symbol by symbol: each renormalization ships a settled
// bit to the strip and doubles the interval back up, so the
// ruler never shrinks away (straddles defer a bit, marked). Act
// two: why the heuristic exists: the exact-fraction coder's
// state (real BigInt fractions, computed live) explodes off the
// chart while the register coder holds a flat 32 bits: with the
// Huffman wall numbers alongside.
const W = 640;
const H = 300;
const SEED = 20260829;
const END_HOLD = 70;

export function makeAct1(rand) {
  // 3-symbol alphabet, skewed; 14 symbols encoded in float form
  // (the same three renormalization cases as the integer coder).
  const probs = [0.72, 0.2, 0.08];
  const cum = [0, 0.72, 0.92, 1];
  const syms = Array.from({ length: 14 }, () => {
    const u = rand();
    return u < 0.72 ? 0 : u < 0.92 ? 1 : 2;
  });
  const steps = [];
  let lo = 0;
  let wid = 1;
  let pending = 0;
  const bits = [];
  for (const s of syms) {
    const nlo = lo + wid * cum[s];
    const nwid = wid * probs[s];
    const events = [];
    lo = nlo;
    wid = nwid;
    for (;;) {
      if (lo + wid <= 0.5) {
        bits.push(0);
        while (pending) {
          bits.push(1);
          pending -= 1;
        }
        events.push({ type: 'bit', v: 0 });
        lo *= 2;
        wid *= 2;
      } else if (lo >= 0.5) {
        bits.push(1);
        while (pending) {
          bits.push(0);
          pending -= 1;
        }
        events.push({ type: 'bit', v: 1 });
        lo = (lo - 0.5) * 2;
        wid *= 2;
      } else if (lo >= 0.25 && lo + wid <= 0.75) {
        pending += 1;
        events.push({ type: 'straddle' });
        lo = (lo - 0.25) * 2;
        wid *= 2;
      } else {
        break;
      }
    }
    steps.push({ sym: s, lo, wid, events, bitsSoFar: bits.length, pending });
  }
  return { probs, cum, syms, steps, totalBits: bits.length };
}

export function makeAct2() {
  // real exact-fraction state growth: the interval's width after n
  // symbols of a 3/5-2/5 binary source is a fraction over 5^n: track
  // the reduced denominator's bit length with actual BigInts.
  const pts = [];
  let wnum = 1n;
  let wden = 1n;
  const seedRand = mulberry32(424242);
  const gcd = (a, b) => {
    while (b) {
      [a, b] = [b, a % b];
    }
    return a;
  };
  for (let i = 1; i <= 1200; i++) {
    const s = seedRand() < 0.6 ? 0 : 1;
    wnum *= s === 0 ? 3n : 2n;
    wden *= 5n;
    if (i % 120 === 0) {
      const g = gcd(wnum, wden);
      pts.push({ n: i, bits: (wden / g).toString(2).length });
    }
  }
  return pts;
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const act1 = makeAct1(rand);
  const act2 = makeAct2();
  // the wall numbers for the caption (skew 99/1 at n = 4,000)
  const n = 4000;
  const h = -(0.99 * Math.log2(0.99) + 0.01 * Math.log2(0.01));
  return { act1, act2, wall: { huff: n, floor: Math.ceil(n * h) } };
}

export default function ArithmeticViz() {
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
        const len = s.act === 0 ? s.scene.act1.steps.length * 16 + END_HOLD : 200 + END_HOLD;
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
        const SYMC = [algo, heur, warn];

        const done = s.act >= 2;
        const actIdx = done ? 1 : s.act;
        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';

        if (actIdx === 0) {
          const a1 = sc.act1;
          const total = a1.steps.length * 16;
          const t = done ? total : Math.min(s.tick, total);
          const idx = Math.min(a1.steps.length - 1, Math.floor(t / 16));
          const st = a1.steps[idx];
          ctx.fillText('act 1 · the message as one number: each symbol keeps its stretch; renormalization ships settled bits', 14, 20);
          // the current interval on the always-full-width ruler
          ctx.strokeStyle = 'rgba(154,165,189,0.4)';
          ctx.strokeRect(40, 60, 560, 22);
          [0.25, 0.5, 0.75].forEach((q) => {
            ctx.strokeStyle = 'rgba(154,165,189,0.3)';
            ctx.beginPath();
            ctx.moveTo(40 + q * 560, 56);
            ctx.lineTo(40 + q * 560, 86);
            ctx.stroke();
          });
          ctx.fillStyle = `${SYMC[st.sym]}66`;
          ctx.fillRect(40 + st.lo * 560, 60, Math.max(2, st.wid * 560), 22);
          ctx.strokeStyle = SYMC[st.sym];
          ctx.strokeRect(40 + st.lo * 560, 60, Math.max(2, st.wid * 560), 22);
          ctx.fillStyle = ink;
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillText(`symbol ${idx + 1}/${a1.syms.length}: '${'ABC'[st.sym]}' (p = ${a1.probs[st.sym]})`, 40, 50);
          // events this step
          const evLine = st.events.map((e) => (e.type === 'bit' ? String(e.v) : '·defer')).join(' ');
          ctx.fillStyle = good;
          ctx.fillText(`renormalizations this step: ${evLine || '(none: the stretch still spans the middle)'}`, 40, 108);
          // bit strip
          ctx.fillStyle = dim;
          ctx.fillText(`bits shipped so far: ${st.bitsSoFar}${st.pending ? `  (+${st.pending} deferred: the straddle debt)` : ''}`, 40, 132);
          // probability legend
          a1.probs.forEach((p, i) => {
            ctx.fillStyle = SYMC[i];
            ctx.fillText(`'${'ABC'[i]}' ${p}`, 40 + i * 90, 160);
          });
          // ideal-vs-actual note
          const ideal = a1.syms.slice(0, idx + 1).reduce((acc, sy) => acc - Math.log2(a1.probs[sy]), 0);
          ctx.fillStyle = heur;
          ctx.fillText(`ideal cost so far: ${ideal.toFixed(1)} bits · shipped + held: ${st.bitsSoFar + st.pending}`, 40, 188);
          let line;
          if (done || idx >= a1.steps.length - 1) {
            line = `message coded in ~${a1.totalBits} bits against an ideal of ${a1.syms.reduce((acc, sy) => acc - Math.log2(a1.probs[sy]), 0).toFixed(1)}: fractional bits, pooled: no symbol paid a whole bit it did not owe`;
            ctx.fillStyle = good;
          } else if (st.events.some((e) => e.type === 'straddle')) {
            line = 'straddle: too tight to call a side: zoom anyway and owe a bit the future reveals';
            ctx.fillStyle = warn;
          } else {
            line = 'settled halves ship bits and the interval doubles: the ruler never shrinks away';
            ctx.fillStyle = ink;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = { line };
        } else {
          const t = done ? 200 : Math.min(s.tick, 200);
          ctx.fillText('act 2 · why the heuristic exists: the exact-fraction coder’s state (real BigInt fractions) vs 32-bit registers', 14, 20);
          const frac = Math.min(1, t / 200);
          const pts = sc.act2;
          const maxBits = pts[pts.length - 1].bits;
          const X = (n) => 60 + (n / 1200) * 520;
          const Y = (b) => 210 - (b / maxBits) * 160;
          ctx.strokeStyle = 'rgba(154,165,189,0.4)';
          ctx.beginPath();
          ctx.moveTo(60, 210);
          ctx.lineTo(580, 210);
          ctx.stroke();
          const upto = Math.max(1, Math.floor(frac * pts.length));
          ctx.strokeStyle = warn;
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let i = 0; i < upto; i++) {
            const p = pts[i];
            if (i === 0) ctx.moveTo(X(p.n), Y(p.bits));
            else ctx.lineTo(X(p.n), Y(p.bits));
          }
          ctx.stroke();
          const last = pts[upto - 1];
          ctx.fillStyle = warn;
          ctx.fillText(`exact fractions: ${last.bits.toLocaleString()} bits of state at ${last.n} symbols`, 200, Y(last.bits) - 8);
          ctx.strokeStyle = algo;
          ctx.setLineDash([5, 4]);
          ctx.beginPath();
          ctx.moveTo(60, Y(32));
          ctx.lineTo(580, Y(32));
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = algo;
          ctx.fillText('the renormalizing coder: 32 bits, forever, by construction', 70, Y(32) - 6);
          ctx.fillStyle = dim;
          ctx.font = '10px ui-monospace, monospace';
          ctx.fillText(`and the wall it exists to break (from the solution, n = 4,000 at 99/1): huffman ${sc.wall.huff.toLocaleString()} bits vs the ${sc.wall.floor.toLocaleString()}-bit floor`, 60, 244);
          let line;
          if (done || t >= 200) {
            line = 'same output, constant state: ship settled bits, rescale, repeat: the heuristic is the difference between a proof and a program';
            ctx.fillStyle = good;
          } else {
            line = 'every symbol multiplies the fraction again: nothing ever cancels: the state can only grow';
            ctx.fillStyle = ink;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = {
            line: done
              ? 'one number for the whole message, 32 bits of state for the whole run'
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
          new message
        </button>
        <span className="viz-stat">
          {snap.line || 'narrowing the interval…'}
        </span>
      </div>
    </>
  );
}
