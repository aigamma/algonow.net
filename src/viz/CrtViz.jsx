import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// A hidden integer below M = 7 x 11 x 13 = 1,001 is known only by its
// three residues, shown on three dials. Garner's algorithm (blue) finds
// one mixed-radix digit per tick: after digit j the candidates on the
// number line are the integers agreeing with the first j residues,
// 143, then 13, then 1. A brute-force scan (amber) walks the number
// line checking every integer against all three residues, 40 per
// tick, and finds the same value only when it reaches it.
const W = 640;
const H = 300;
const SEED = 20260926;
const MODULI = [7, 11, 13];
const M = MODULI[0] * MODULI[1] * MODULI[2];
const SCAN_STEP = 40;

function egcd(a, b) {
  if (b === 0) return [a, 1, 0];
  const [g, x, y] = egcd(b, a % b);
  return [g, y, x - Math.floor(a / b) * y];
}

export function inv(a, m) {
  const [g, x] = egcd(((a % m) + m) % m, m);
  if (g !== 1) throw new Error('not coprime');
  return ((x % m) + m) % m;
}

export function garnerDigits(residues, moduli) {
  const v = [];
  for (let j = 0; j < moduli.length; j++) {
    let t = residues[j];
    for (let i = 0; i < j; i++) {
      t = ((((t - v[i]) % moduli[j]) + moduli[j]) % moduli[j]) * inv(moduli[i], moduli[j]) % moduli[j];
    }
    v.push(t);
  }
  return v;
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const target = Math.floor(rand() * M);
  const residues = MODULI.map((m) => target % m);
  return { target, residues, digits: garnerDigits(residues, MODULI), step: 0, partial: 0, scale: 1, scanPos: 0, scanFound: null, checks: 0, done: false };
}

export function sceneTick(sc) {
  if (sc.done) return true;
  if (sc.step < MODULI.length) {
    sc.partial += sc.digits[sc.step] * sc.scale;
    sc.scale *= MODULI[sc.step];
    sc.step += 1;
  }
  if (sc.scanFound === null) {
    const end = Math.min(M, sc.scanPos + SCAN_STEP);
    for (let x = sc.scanPos; x < end; x++) {
      sc.checks += 1;
      if (MODULI.every((m, i) => x % m === sc.residues[i])) {
        sc.scanFound = x;
        break;
      }
    }
    sc.scanPos = sc.scanFound === null ? end : sc.scanFound;
  }
  if (sc.step === MODULI.length && sc.scanFound !== null) sc.done = true;
  return sc.done;
}

export default function CrtViz() {
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
      stepMs: 420,
      init: () => ({ scene: makeScene(SEED + cycle.current * 7919), done: false, rest: 0, stopAtRest: isStill() }),
      tick: (s) => {
        if (s.done) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
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
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';
        const ink = css.getPropertyValue('--ink').trim() || '#e9edf6';
        const sc = s.scene;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText(`a hidden integer below ${M.toLocaleString()} = 7 x 11 x 13, known only by its residues; Garner: one digit per tick; the scan: ${SCAN_STEP} integers per tick`, 12, 18);
        // dials
        MODULI.forEach((m, i) => {
          const cx = 70 + i * 120;
          const cy = 90;
          const r = 34;
          ctx.strokeStyle = `${dim}88`;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.stroke();
          for (let k = 0; k < m; k++) {
            const a = (k / m) * Math.PI * 2 - Math.PI / 2;
            ctx.fillStyle = k === sc.residues[i] ? algo : `${dim}66`;
            ctx.beginPath();
            ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, k === sc.residues[i] ? 4 : 2, 0, Math.PI * 2);
            ctx.fill();
          }
          const a = (sc.residues[i] / m) * Math.PI * 2 - Math.PI / 2;
          ctx.strokeStyle = algo;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(a) * (r - 6), cy + Math.sin(a) * (r - 6));
          ctx.stroke();
          ctx.lineWidth = 1;
          ctx.fillStyle = ink;
          ctx.fillText(`mod ${m}: ${sc.residues[i]}`, cx - 28, cy + r + 16);
        });
        // Garner digits
        const gx = 400;
        ctx.fillStyle = algo;
        ctx.fillText('Garner, mixed radix:', gx, 50);
        for (let j = 0; j < MODULI.length; j++) {
          const shown = j < sc.step;
          ctx.fillStyle = shown ? ink : `${dim}66`;
          const place = j === 0 ? '1' : j === 1 ? '7' : '7 x 11';
          ctx.fillText(`v${j + 1} = ${shown ? sc.digits[j] : '?'}  (x ${place})`, gx, 70 + j * 18);
        }
        ctx.fillStyle = sc.step === MODULI.length ? good : ink;
        ctx.fillText(sc.step === MODULI.length ? `x = ${sc.partial} (target ${sc.target})` : `x = ${sc.partial} + k x ${sc.scale}`, gx, 132);
        // number line
        const lx = 20;
        const ly = 200;
        const lw = 600;
        const px = (x) => lx + (x / M) * lw;
        ctx.strokeStyle = `${dim}88`;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx + lw, ly);
        ctx.stroke();
        ctx.fillStyle = dim;
        ctx.fillText('0', lx - 3, ly + 14);
        ctx.fillText(`${M.toLocaleString()}`, lx + lw - 24, ly + 14);
        // candidates consistent with the first `step` residues
        let count = 0;
        if (sc.step > 0) {
          for (let x = sc.partial; x < M; x += sc.scale) {
            count += 1;
            ctx.strokeStyle = sc.step === MODULI.length ? good : algo;
            ctx.lineWidth = sc.step === MODULI.length ? 3 : 1;
            ctx.beginPath();
            ctx.moveTo(px(x), ly - 14);
            ctx.lineTo(px(x), ly - 2);
            ctx.stroke();
          }
          ctx.lineWidth = 1;
        } else count = M;
        ctx.fillStyle = algo;
        ctx.fillText(`candidates after ${sc.step} digit${sc.step === 1 ? '' : 's'}: ${count.toLocaleString()}`, lx, ly - 22);
        // the scan
        ctx.fillStyle = `${heur}55`;
        ctx.fillRect(lx, ly + 20, px(sc.scanPos) - lx, 8);
        if (sc.scanFound !== null) {
          ctx.fillStyle = good;
          ctx.beginPath();
          ctx.arc(px(sc.scanFound), ly + 24, 4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = heur;
        ctx.fillText(`brute-force scan: ${sc.checks.toLocaleString()} integers checked${sc.scanFound !== null ? `, found ${sc.scanFound}` : ''}`, lx, ly + 46);
        let line;
        if (s.done) {
          line = `Garner: ${sc.digits.join(', ')} in 3 steps, x = ${sc.partial}; the scan checked ${sc.checks.toLocaleString()} integers against 3 residues each to find the same ${sc.scanFound}`;
          ctx.fillStyle = good;
        } else {
          line = sc.step < MODULI.length ? `digit ${sc.step + 1} pins the value modulo ${sc.scale * MODULI[sc.step]}; the scan keeps checking` : `Garner is done; the scan has ${(M - sc.scanPos).toLocaleString()} integers left to try`;
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
          new number
        </button>
        <span className="viz-stat">{snap.line || 'reconstructing…'}</span>
      </div>
    </>
  );
}
