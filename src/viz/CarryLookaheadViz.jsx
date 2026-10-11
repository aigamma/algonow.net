import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// A seeded 16-bit addition raced two ways. The ripple lane resolves one carry
// per tick, two gate delays each. The lookahead lane computes generate and
// propagate for every bit, then group generate and propagate for four-bit
// blocks, then the block carries from the block terms, then every bit carry
// from its block carry-in, then the sums: five ticks regardless of width.
// Invariant: the lookahead carries and sum equal the integer sum of the
// operands, and at the end the ripple carries agree with them bit for bit.
const W = 640;
const H = 300;
const SEED = 20261010;
const N = 16;

function bits(x) {
  return Array.from({ length: N }, (_, i) => (x >> i) & 1);
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const a = Math.floor(rand() * 65536);
  const b = Math.floor(rand() * 65536);
  const cin = rand() < 0.5 ? 1 : 0;
  const A = bits(a);
  const B = bits(b);
  const g = A.map((x, i) => x & B[i]);
  const p = A.map((x, i) => x ^ B[i]);
  const sum = a + b + cin;
  return { a, b, cin, A, B, g, p, sum, tick: 0, rippleBit: 0, rippleC: [cin], look: null, lookCarries: null, lookSum: null, done: false, ok: true, last: `a = ${a}, b = ${b}, carry in ${cin}: the ripple lane needs ${2 * N + 1} gate delays, the lookahead lane 13` };
}

// Group generate and propagate for a run of bits, and the carries inside it
// from the lookahead sums of products: c[k+1] = g_k | p_k g_{k-1} | ... | p_k..p_0 c_in.
function groupTerms(g, p) {
  let G = 0;
  let P = 1;
  for (let k = 0; k < g.length; k += 1) {
    G = g[k] | (p[k] & G);
    P &= p[k];
  }
  return [G, P];
}

function carriesFrom(g, p, cin) {
  const c = [cin];
  for (let k = 0; k < g.length; k += 1) {
    // the explicit sum of products: every term that lets a carry reach k+1
    let ck = g[k];
    for (let j = k - 1; j >= -1; j -= 1) {
      let term = j >= 0 ? g[j] : cin;
      for (let m = j + 1; m <= k; m += 1) term &= p[m];
      ck |= term;
    }
    c.push(ck);
  }
  return c;
}

export function sceneTick(sc) {
  if (sc.done) return true;
  sc.tick += 1;
  // lookahead lane: five stages
  if (sc.tick === 1) sc.look = 'generate and propagate for all sixteen bits (one delay)';
  if (sc.tick === 2) {
    sc.groups = [0, 4, 8, 12].map((s) => groupTerms(sc.g.slice(s, s + 4), sc.p.slice(s, s + 4)));
    sc.look = 'four block terms G and P from four-bit groups (four delays)';
  }
  if (sc.tick === 3) {
    sc.blockC = carriesFrom(sc.groups.map((x) => x[0]), sc.groups.map((x) => x[1]), sc.cin);
    sc.look = 'the four block carries from the block terms (four delays)';
  }
  if (sc.tick === 4) {
    const c = [];
    for (let s = 0; s < N; s += 4) {
      const inner = carriesFrom(sc.g.slice(s, s + 4), sc.p.slice(s, s + 4), sc.blockC[s / 4]);
      c.push(...inner.slice(0, 4));
    }
    c.push(sc.blockC[4]);
    sc.lookCarries = c;
    sc.look = 'every bit carry from its block carry-in (four delays)';
  }
  if (sc.tick === 5) {
    sc.lookSum = sc.p.map((x, i) => x ^ sc.lookCarries[i]);
    const value = sc.lookSum.reduce((acc, bit, i) => acc + bit * 2 ** i, 0) + sc.lookCarries[N] * 65536;
    sc.ok = sc.ok && value === sc.sum;
    sc.look = `sums (one delay): ${value} ${sc.ok ? 'equals' : 'DIFFERS FROM'} a + b + carry in, 13 delays total`;
  }
  // ripple lane: one bit per tick
  if (sc.rippleBit < N) {
    const i = sc.rippleBit;
    const c = sc.rippleC[i];
    sc.rippleC.push(sc.g[i] | (sc.p[i] & c));
    sc.rippleBit += 1;
  }
  if (sc.rippleBit >= N && sc.tick >= 5) {
    for (let i = 0; i <= N; i += 1) sc.ok = sc.ok && sc.rippleC[i] === sc.lookCarries[i];
    sc.done = true;
    sc.last = `done: ripple resolved its last carry on tick ${sc.tick} (${2 * N + 1} delays), the lookahead on tick 5 (13 delays); carries agree bit for bit: ${sc.ok ? 'yes' : 'NO'}`;
    return true;
  }
  sc.last = `tick ${sc.tick}: ripple at bit ${sc.rippleBit} of ${N} (${2 * sc.rippleBit + 1} delays); lookahead: ${sc.look}`;
  return false;
}

export default function CarryLookaheadViz() {
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
      stepMs: 480,
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
        ctx.fillText('sixteen-bit addition: the ripple lane resolves one carry per tick; the lookahead lane finishes in five', 12, 18);
        const x0 = 90;
        const bw = 32;
        const col = (i) => x0 + (N - 1 - i) * bw;
        const row = (label, arr, y, color, upto) => {
          ctx.fillStyle = dim;
          ctx.fillText(label, 12, y + 4);
          for (let i = 0; i < N; i += 1) {
            const shown = upto === undefined || i < upto;
            ctx.fillStyle = shown ? color : `${dim}33`;
            ctx.fillText(shown ? String(arr[i]) : '·', col(i) + 10, y + 4);
          }
        };
        row('a', sc.A, 44, ink);
        row('b', sc.B, 62, ink);
        row('g = a and b', sc.g, 84, heur, sc.tick >= 1 ? N : 0);
        row('p = a xor b', sc.p, 102, heur, sc.tick >= 1 ? N : 0);
        // ripple carries: c_1..c_16 shown above bit positions 1..16 (c_i enters bit i)
        ctx.fillStyle = dim;
        ctx.fillText('ripple carry', 12, 136);
        for (let i = 1; i <= N; i += 1) {
          const have = i < sc.rippleC.length;
          ctx.fillStyle = have ? algo : `${dim}33`;
          const x = i < N ? col(i) + 10 : col(N - 1) - 22;
          ctx.fillText(have ? String(sc.rippleC[i]) : '·', x, 136);
        }
        ctx.fillStyle = dim;
        ctx.fillText('lookahead carry', 12, 166);
        for (let i = 1; i <= N; i += 1) {
          const have = sc.lookCarries !== null;
          ctx.fillStyle = have ? algo : `${dim}33`;
          const x = i < N ? col(i) + 10 : col(N - 1) - 22;
          ctx.fillText(have ? String(sc.lookCarries[i]) : '·', x, 166);
        }
        if (sc.groups) {
          ctx.fillStyle = heur;
          for (let k = 0; k < 4; k += 1) {
            const x = col(4 * k + 3) + 4;
            ctx.fillText(`G${sc.groups[k][0]} P${sc.groups[k][1]}`, x, 190);
          }
          ctx.fillStyle = dim;
          ctx.fillText('block terms', 12, 190);
        }
        row('sum', sc.lookSum || [], 214, good, sc.lookSum ? N : 0);
        // delay bars
        const barY = 236;
        const rd = Math.min(2 * sc.rippleBit + 1, 2 * N + 1);
        const ld = Math.min([0, 1, 5, 9, 13, 14][Math.min(sc.tick, 5)], 13);
        ctx.fillStyle = `${algo}55`;
        ctx.fillRect(x0, barY, rd * 15, 8);
        ctx.fillStyle = `${heur}99`;
        ctx.fillRect(x0, barY + 12, ld * 15, 8);
        ctx.fillStyle = dim;
        ctx.fillText(`ripple ${rd} of ${2 * N + 1} gate delays`, x0 + (2 * N + 1) * 15 + 8, barY + 8);
        ctx.fillText(`lookahead ${ld} of 13 gate delays`, x0 + (2 * N + 1) * 15 + 8, barY + 20);
        ctx.fillStyle = sc.ok ? good : warn;
        ctx.fillText(sc.ok ? 'invariant: lookahead sum equals a + b + carry in; carries agree with the ripple at the end' : 'INVARIANT BROKEN', 12, 272);
        const line = sc.last;
        ctx.fillStyle = s.done ? (sc.ok ? good : warn) : ink;
        ctx.fillText(line.length > 100 ? `${line.slice(0, 99)}…` : line, 12, H - 6);
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
          new operands
        </button>
        <span className="viz-stat">{snap.line || 'adding…'}</span>
      </div>
    </>
  );
}
