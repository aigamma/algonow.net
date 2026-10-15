import DiagramViewport from '../components/DiagramViewport.jsx';
import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Binary exponentiation of the Fibonacci matrix modulo a prime, one bit
// per tick, for a seeded exponent n of up to 50 bits. The bits of n are
// shown with a cursor; each tick squares the base and, when the bit is
// one, multiplies it into the result; the running 2 x 2 matrices are
// drawn and the product counter compared with n - 1. The invariant checked
// every tick is that the result so far equals the matrix power for the
// bits consumed, computed independently by fast doubling, and at the end
// that F(n) mod p agrees with fast doubling.
const W = 640;
const H = 300;
const SEED = 20261010;
const P = 1000000007n;

function mul(a, b) {
  return [
    [(a[0][0] * b[0][0] + a[0][1] * b[1][0]) % P, (a[0][0] * b[0][1] + a[0][1] * b[1][1]) % P],
    [(a[1][0] * b[0][0] + a[1][1] * b[1][0]) % P, (a[1][0] * b[0][1] + a[1][1] * b[1][1]) % P],
  ];
}

const I2 = [[1n, 0n], [0n, 1n]];
const FIB = [[1n, 1n], [1n, 0n]];

export function fibDoubling(n) {
  // returns [F(n), F(n+1)] mod P by the doubling identities, top bit down
  let a = 0n;
  let b = 1n;
  for (const bit of n.toString(2)) {
    const c = (a * ((2n * b - a + P) % P)) % P;
    const d = (a * a + b * b) % P;
    if (bit === '1') {
      a = d;
      b = (c + d) % P;
    } else {
      a = c;
      b = d;
    }
  }
  return [a, b];
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const bitsLen = 30 + Math.floor(rand() * 21); // 30 to 50 bits
  let n = 1n;
  for (let i = 1; i < bitsLen; i += 1) n = n * 2n + (rand() < 0.5 ? 1n : 0n);
  const bits = n.toString(2);
  return { n, bits, i: 0, result: I2, base: FIB, first: true, products: 0, done: false, ok: true, last: `n = ${n.toString()} (${bits.length} bits, ${bits.split('').filter((b) => b === '1').length} ones); scanning from the lowest bit` };
}

export function sceneTick(sc) {
  if (sc.done) return true;
  const total = sc.bits.length;
  if (sc.i >= total) {
    const f = sc.result[0][1];
    const [fd] = fibDoubling(sc.n);
    sc.ok = f === fd;
    sc.done = true;
    sc.last = `done: F(n) mod p = ${f.toString()} in ${sc.products} products (${total - 1} squarings + ${sc.bits.split('').filter((b) => b === '1').length - 1} multiplies) against n - 1 = ${(sc.n - 1n).toLocaleString()}; fast doubling agrees: ${sc.ok ? 'yes' : 'NO'}`;
    return true;
  }
  const bit = sc.bits[total - 1 - sc.i]; // lowest bit first
  let action;
  if (bit === '1') {
    if (sc.first) {
      sc.result = sc.base;
      sc.first = false;
      action = 'bit 1: the result starts as the current base (no product)';
    } else {
      sc.result = mul(sc.result, sc.base);
      sc.products += 1;
      action = 'bit 1: result = result x base (one product)';
    }
  } else {
    action = 'bit 0: nothing multiplied in';
  }
  sc.i += 1;
  if (sc.i < total) {
    sc.base = mul(sc.base, sc.base);
    sc.products += 1;
    action += '; base squared (one product)';
  }
  // invariant: result equals M^(n mod 2^i) for the bits consumed
  const consumed = BigInt('0b' + sc.bits.slice(total - sc.i));
  if (consumed > 0n) {
    const [fa, fb] = fibDoubling(consumed);
    sc.ok = sc.ok && sc.result[0][1] === fa && sc.result[0][0] === fb;
  }
  sc.last = `bit ${sc.i} of ${total} (${bit}): ${action}; products so far ${sc.products}`;
  return false;
}

export default function MatrixPowerViz() {
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
        ctx.fillText('Fibonacci matrix Mⁿ mod 1,000,000,007; low bits first; square each bit, multiply on 1', 12, 18);
        const total = sc.bits.length;
        const bw = Math.min(12, Math.floor(600 / total));
        const x0 = 20;
        for (let k = 0; k < total; k += 1) {
          const b = sc.bits[k];
          const consumed = k >= total - sc.i;
          const x = x0 + k * bw;
          ctx.fillStyle = b === '1' ? (consumed ? heur : `${heur}66`) : (consumed ? `${dim}cc` : `${dim}44`);
          ctx.fillRect(x, 40, bw - 2, b === '1' ? 22 : 12);
          if (k === total - sc.i && !s.done) {
            ctx.fillStyle = ink;
            ctx.fillText('^', x, 78);
          }
        }
        ctx.fillStyle = dim;
        ctx.fillText(`n = ${sc.n.toString()}`, x0, 98);
        const drawMatrix = (m, x, y, label, color) => {
          ctx.fillStyle = color;
          ctx.fillText(label, x, y);
          ctx.fillStyle = ink;
          ctx.font = '10px ui-monospace, monospace';
          for (let r = 0; r < 2; r += 1) {
            ctx.fillText(`[ ${m[r][0].toString().padStart(10)}  ${m[r][1].toString().padStart(10)} ]`, x, y + 16 + r * 14);
          }
          ctx.font = '11px ui-monospace, monospace';
        };
        drawMatrix(sc.result, 20, 128, sc.first ? 'result (identity until the first one bit)' : 'result', algo);
        drawMatrix(sc.base, 330, 128, `base = M^(2^${sc.i})`, heur);
        ctx.fillStyle = dim;
        ctx.fillText(`products so far: ${sc.products}; a product per bit plus one per one bit`, 20, 196);
        ctx.fillText(`repeated multiplication would need n - 1 = ${(sc.n - 1n).toLocaleString()}`, 20, 212);
        ctx.fillText('the file: 82 products at n = 10^18 against 10^18 - 1; iteration would take about 1,400 years', 20, 228);
        ctx.fillStyle = sc.ok ? good : warn;
        ctx.fillText(sc.ok ? 'invariant: result equals M to the consumed bits (fast doubling agrees)' : 'INVARIANT BROKEN', 20, 250);
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
          new exponent
        </button>
        <span className="viz-stat">{snap.line || 'squaring…'}</span>
      </div>
    </>
  );
}
