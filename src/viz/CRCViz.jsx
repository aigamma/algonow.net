import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two acts of one remainder. Act one: the division machine: a
// 16-cell shift register eats the message bit by bit, XOR taps
// flashing amber whenever the popped bit is 1: the remainder left
// in the register IS the CRC: append it, divide again, and the
// register drains to all zeros: green, accepted. Act two: the
// commutativity trap: the same four corruptions fed to a sum
// checksum and to the CRC: value changes both catch, but swap two
// words or make compensating edits and the sum is blind: addition
// commutes: division does not.
const W = 640;
const H = 300;
const SEED = 20260827;
const POLY = 0x1021; // x^16 + x^12 + x^5 + 1, init 0: append-zero form
const MSG_BYTES = 6;
const END_HOLD = 70;

export function crc16(bytes) {
  let crc = 0;
  for (const b of bytes) {
    crc ^= b << 8;
    for (let i = 0; i < 8; i++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ POLY) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc;
}

function sum16(bytes) {
  return bytes.reduce((a, b) => a + b, 0) & 0xffff;
}

// Bit-serial trace of the same division: one event per input bit,
// recording the register after that bit. Must end equal to crc16.
export function traceDivision(bytes) {
  const bits = [];
  for (const b of bytes) for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1);
  let reg = 0;
  const steps = [];
  for (const bit of bits) {
    const top = (reg >> 15) & 1;
    reg = ((reg << 1) | bit) & 0xffff;
    const fired = top === 1;
    if (fired) reg ^= POLY;
    steps.push({ reg, bit, fired });
  }
  return steps;
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const msg = [];
  for (let i = 0; i < MSG_BYTES; i++) msg.push(Math.floor(rand() * 256));
  const rem = crc16(msg);
  const framed = [...msg, (rem >> 8) & 0xff, rem & 0xff];
  // Pass 1 feeds the 16 augmentation zeros too, so the register the
  // viewer watches ends exactly at the CRC that gets appended.
  const pass1 = traceDivision([...msg, 0, 0]);
  const pass2 = traceDivision(framed);

  // Act 2: four corruptions of an 8-word frame.
  const words = [];
  for (let i = 0; i < 8; i++) words.push(Math.floor(rand() * 256));
  let i1 = Math.floor(rand() * 8);
  let i2 = Math.floor(rand() * 8);
  if (i2 === i1) i2 = (i1 + 3) % 8;
  if (words[i1] === words[i2]) words[i1] = (words[i1] + 17) % 256;
  const flipPos = Math.floor(rand() * 8);
  const cases = [];
  const mk = (label, mutate, kind) => {
    const bad = words.slice();
    mutate(bad);
    cases.push({
      label,
      kind,
      bad,
      sumBlind: sum16(bad) === sum16(words),
      crcBlind: crc16(bad) === crc16(words),
    });
  };
  mk('flip one bit', (b) => {
    b[flipPos] ^= 0x10;
  }, 'value');
  mk('trash one byte', (b) => {
    b[(flipPos + 2) % 8] ^= 0xa7;
  }, 'value');
  mk('swap two words', (b) => {
    const t = b[i1];
    b[i1] = b[i2];
    b[i2] = t;
  }, 'order');
  mk('rotate the whole frame', (b) => {
    b.push(b.shift());
  }, 'order');
  return { msg, rem, pass1, pass2, words, cases };
}

const CASE_TICKS = 42;

export default function CRCViz() {
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
            ? s.scene.pass1.length + Math.ceil(s.scene.pass2.length / 4) + END_HOLD
            : s.scene.cases.length * CASE_TICKS + END_HOLD;
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
          const p1 = sc.pass1.length;
          const p2steps = Math.ceil(sc.pass2.length / 4);
          const t = done ? p1 + p2steps : Math.min(s.tick, p1 + p2steps);
          const inPass2 = t >= p1;
          const step = inPass2
            ? sc.pass2[Math.min(sc.pass2.length - 1, (t - p1 + 1) * 4 - 1)]
            : sc.pass1[Math.max(0, Math.min(t, p1 - 1))];
          const finished = done || t >= p1 + p2steps;
          ctx.fillText(
            inPass2 || finished
              ? 'act 1b · receiver: divide message + CRC again: the register must drain to zero'
              : 'act 1 · the division machine: 48 message bits + 16 zeros, XOR taps on a popped 1',
            14,
            20,
          );

          // The register cells.
          const reg = finished ? 0 : step.reg;
          for (let i = 0; i < 16; i++) {
            const bit = (reg >> (15 - i)) & 1;
            const x = 40 + i * 35;
            ctx.fillStyle = bit ? (inPass2 || finished ? algo : heur) : 'rgba(154,165,189,0.12)';
            ctx.globalAlpha = bit ? 0.85 : 1;
            ctx.fillRect(x, 90, 29, 34);
            ctx.globalAlpha = 1;
            ctx.fillStyle = bit ? '#10141f' : dim;
            ctx.font = '13px ui-monospace, monospace';
            ctx.fillText(String(bit), x + 10, 112);
            if (i === 3 || i === 10 || i === 15) {
              ctx.fillStyle = step && step.fired && !finished ? heur : 'rgba(154,165,189,0.5)';
              ctx.font = '10px ui-monospace, monospace';
              ctx.fillText('⊕', x + 10, 140);
            }
          }
          ctx.fillStyle = dim;
          ctx.font = '10px ui-monospace, monospace';
          ctx.fillText('taps: x¹⁶ + x¹² + x⁵ + 1', 40, 160);

          // Progress strip of message bits.
          const totalBits = inPass2 ? sc.pass2.length : sc.pass1.length;
          const consumed = finished ? totalBits : inPass2 ? Math.min(sc.pass2.length, (t - p1 + 1) * 4) : t;
          ctx.fillStyle = 'rgba(93,162,255,0.25)';
          ctx.fillRect(40, 190, (consumed / totalBits) * 560, 10);
          ctx.strokeStyle = dim;
          ctx.strokeRect(40, 190, 560, 10);

          let line;
          if (finished) {
            line = `remainder zero: frame accepted · the CRC was 0x${sc.rem.toString(16).toUpperCase().padStart(4, '0')}`;
            ctx.fillStyle = good;
          } else if (inPass2) {
            line = `re-dividing ${MSG_BYTES + 2} framed bytes · bit ${consumed}/${sc.pass2.length}`;
            ctx.fillStyle = algo;
          } else {
            line = `dividing: bit ${t}/${p1} in · register 0x${step.reg.toString(16).toUpperCase().padStart(4, '0')}${step.fired ? ' · tap fired' : ''}`;
            ctx.fillStyle = step.fired ? heur : ink;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = { line };
        } else {
          const ci = done
            ? sc.cases.length - 1
            : Math.min(Math.floor(s.tick / CASE_TICKS), sc.cases.length - 1);
          const finishedAll = done || Math.floor(s.tick / CASE_TICKS) >= sc.cases.length;
          ctx.fillText('act 2 · four corruptions, two judges: a sum checksum and the CRC', 14, 20);

          // The frame bytes.
          for (let i = 0; i < 8; i++) {
            const changed = sc.cases[ci].bad[i] !== sc.words[i];
            ctx.fillStyle = changed ? 'rgba(226,96,108,0.4)' : 'rgba(154,165,189,0.12)';
            ctx.fillRect(60 + i * 66, 44, 58, 26);
            ctx.fillStyle = changed ? warn : dim;
            ctx.font = '11px ui-monospace, monospace';
            ctx.fillText(
              sc.cases[ci].bad[i].toString(16).toUpperCase().padStart(2, '0'),
              80 + i * 66,
              61,
            );
          }

          // Scoreboard rows for cases seen so far.
          const upto = finishedAll ? sc.cases.length - 1 : ci;
          for (let k = 0; k <= upto; k++) {
            const c = sc.cases[k];
            const y = 106 + k * 34;
            ctx.fillStyle = ink;
            ctx.font = '11px ui-monospace, monospace';
            ctx.fillText(c.label, 60, y);
            ctx.fillStyle = c.sumBlind ? warn : good;
            ctx.fillText(c.sumBlind ? 'sum: ACCEPTED (missed!)' : 'sum: caught', 260, y);
            ctx.fillStyle = c.crcBlind ? warn : good;
            ctx.fillText(c.crcBlind ? 'CRC: missed' : 'CRC: caught', 480, y);
          }

          let line;
          if (finishedAll) {
            const sumCaught = sc.cases.filter((c) => !c.sumBlind).length;
            line = `sum checksum: ${sumCaught}/${sc.cases.length} · CRC: ${sc.cases.length}/${sc.cases.length}: addition commutes, division does not`;
            ctx.fillStyle = warn;
          } else {
            line = `corruption ${ci + 1}/${sc.cases.length}: ${sc.cases[ci].label}`;
            ctx.fillStyle = ink;
          }
          ctx.font = '12px ui-monospace, monospace';
          ctx.fillText(line, 14, H - 12);
          statsRef.current = {
            line: done
              ? 'the remainder sees order because division does not commute: sums never will'
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
          {snap.line || 'winding the register…'}
        </span>
      </div>
    </>
  );
}
