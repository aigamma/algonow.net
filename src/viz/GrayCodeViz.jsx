import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks } from './useCanvasLoop.js';

// Two absolute encoder dials for the same n-bit position count, drawn as
// concentric bit tracks (one ring per bit, dark where the bit is 1): the
// left dial in reflected Gray code, the right in natural binary. The
// shaft advances one position per tick. At each step the bits that change
// are highlighted, the possible mid-transition readings are counted (two
// to the number of changed bits), and the worst misread is measured. The
// invariant checked every tick: the Gray step flips exactly one bit, the
// codes seen so far are distinct, and at the end the cycle closes.
const W = 640;
const H = 300;
const SEED = 20261010;

const gray = (i) => i ^ (i >> 1);
const popcount = (x) => x.toString(2).split('1').length - 1;

function worstMisread(a, b, n) {
  const diff = a ^ b;
  const bits = [];
  for (let k = 0; k < n; k += 1) if (diff >> k & 1) bits.push(k);
  let worst = 0;
  for (let m = 0; m < (1 << bits.length); m += 1) {
    let v = a;
    bits.forEach((k, j) => { if (m >> j & 1) v ^= 1 << k; });
    worst = Math.max(worst, Math.min(Math.abs(v - a), Math.abs(v - b)));
  }
  return { worst, readings: 1 << bits.length, flips: bits.length };
}

export function makeScene(seed) {
  const n = 3 + (seed % 3); // 3, 4, or 5 bits: 8, 16, or 32 positions
  const size = 1 << n;
  return {
    n, size, pos: 0, seen: new Set([gray(0)]), grayFlips: 1, binWorst: 0, binReadings: 1, binFlipsTotal: 0, grayFlipsTotal: 0,
    maxBinWorst: 0, done: false, ok: true,
    last: `${n}-bit dial, ${size} positions: the shaft starts at position 0; one position per tick`,
  };
}

export function sceneTick(sc) {
  if (sc.done) return true;
  const { n, size } = sc;
  const from = sc.pos;
  const to = (sc.pos + 1) % size;
  const g = worstMisread(gray(from), gray(to), n);
  const b = worstMisread(from, to, n);
  sc.grayFlips = g.flips;
  sc.binWorst = b.worst;
  sc.binReadings = b.readings;
  sc.binFlipsTotal += b.flips;
  sc.grayFlipsTotal += g.flips;
  sc.maxBinWorst = Math.max(sc.maxBinWorst, b.worst);
  sc.ok = sc.ok && g.flips === 1 && g.worst === 0;
  sc.pos = to;
  if (to === 0) {
    sc.done = true;
    sc.ok = sc.ok && sc.seen.size === size;
    sc.last = `full turn: Gray flipped exactly one bit at every one of ${size} transitions and closed the cycle; binary flipped ${sc.binFlipsTotal} bits in total, worst misread ${sc.maxBinWorst} positions at the rollover`;
    return true;
  }
  sc.ok = sc.ok && !sc.seen.has(gray(to));
  sc.seen.add(gray(to));
  sc.last = `position ${from} to ${to}: Gray flips bit ${Math.log2(gray(from) ^ gray(to))} (one reading possible beyond the two ends); binary flips ${b.flips} bit${b.flips === 1 ? '' : 's'}, ${b.readings} possible readings, worst misread ${b.worst}`;
  return false;
}

export default function GrayCodeViz() {
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
      stepMs: 700,
      init: () => ({ scene: makeScene(SEED + cycle.current), done: false, rest: 0, stopAtRest: isStill() }),
      tick: (s) => {
        if (s.done) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s) * 2) {
            cycle.current += 1;
            Object.assign(s, { scene: makeScene(SEED + cycle.current), done: false, rest: 0 });
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
        const { n, size } = sc;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText(`two ${n}-bit encoder dials, one position per tick; rings are bit tracks (filled = 1); amber: the bits that just changed`, 12, 18);
        const drawDial = (cx, cy, encode, title, color) => {
          const rOuter = 92;
          const ring = (rOuter - 24) / n;
          const prev = (sc.pos - 1 + size) % size;
          const changed = encode(prev) ^ encode(sc.pos);
          for (let k = 0; k < n; k += 1) {
            const r1 = 24 + k * ring;
            const r2 = r1 + ring - 2;
            for (let p = 0; p < size; p += 1) {
              const a0 = (p / size) * Math.PI * 2 - Math.PI / 2;
              const a1 = ((p + 1) / size) * Math.PI * 2 - Math.PI / 2;
              const bit = encode(p) >> k & 1;
              ctx.beginPath();
              ctx.arc(cx, cy, r2, a0, a1);
              ctx.arc(cx, cy, r1, a1, a0, true);
              ctx.closePath();
              const isCur = p === sc.pos;
              ctx.fillStyle = bit ? (isCur && (changed >> k & 1) ? heur : color) : (isCur && (changed >> k & 1) ? `${heur}66` : `${dim}22`);
              ctx.fill();
            }
          }
          // the shaft pointer
          const ang = ((sc.pos + 0.5) / size) * Math.PI * 2 - Math.PI / 2;
          ctx.strokeStyle = ink;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + (rOuter + 6) * Math.cos(ang), cy + (rOuter + 6) * Math.sin(ang));
          ctx.stroke();
          ctx.lineWidth = 1;
          ctx.fillStyle = dim;
          ctx.fillText(title, cx - 60, cy - rOuter - 10);
          ctx.fillStyle = ink;
          ctx.fillText(encode(sc.pos).toString(2).padStart(n, '0'), cx - 18, cy + rOuter + 22);
        };
        drawDial(140, 150, gray, 'Gray (reflected binary)', algo);
        drawDial(370, 150, (p) => p, 'natural binary', `${dim}cc`);
        const tx = 490;
        ctx.fillStyle = ink;
        ctx.fillText(`position ${sc.pos} of ${size}`, tx, 60);
        ctx.fillStyle = algo;
        ctx.fillText(`Gray: ${sc.grayFlips} bit changed`, tx, 84);
        ctx.fillText('reading: one of the two ends', tx, 100);
        ctx.fillStyle = dim;
        ctx.fillText(`binary: ${popcount(((sc.pos - 1 + size) % size) ^ sc.pos)} bits changed`, tx, 124);
        ctx.fillText(`${sc.binReadings} possible readings`, tx, 140);
        ctx.fillStyle = sc.binWorst > 0 ? warn : dim;
        ctx.fillText(`worst misread ${sc.binWorst}`, tx, 156);
        ctx.fillStyle = dim;
        ctx.fillText(`totals so far: Gray ${sc.grayFlipsTotal}, binary ${sc.binFlipsTotal} flips`, tx, 184);
        ctx.fillText('the file: 8 bits, binary misreads', tx, 212);
        ctx.fillText('up to 127 positions; Gray never', tx, 228);
        ctx.fillStyle = sc.ok ? good : warn;
        ctx.fillText(sc.ok ? 'one flip per step, all codes distinct' : 'INVARIANT BROKEN', tx, 256);
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
          another dial
        </button>
        <span className="viz-stat">{snap.line || 'turning…'}</span>
      </div>
    </>
  );
}
