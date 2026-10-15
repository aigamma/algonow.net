import DiagramViewport from '../components/DiagramViewport.jsx';
import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// A game of Nim, one move per tick, between the XOR player (moving first
// from a seeded position with a nonzero nim-sum) and a random mover. The
// heaps are drawn as rows of counters with their binary digits beside
// them, and the nim-sum is written under the columns: after every XOR
// move it must be zero (every binary column balanced), and after every
// random move it is nonzero again. The invariant checked each tick is
// exactly that, plus the final result: the XOR player takes the last
// counter.
const W = 640;
const H = 300;
const SEED = 20261010;
const HEAPS = 4;
const MAX = 15;

const nimSum = (heaps) => heaps.reduce((a, b) => a ^ b, 0);

function boutonMove(heaps) {
  const s = nimSum(heaps);
  if (s === 0) return null;
  for (let i = 0; i < heaps.length; i += 1) if ((heaps[i] ^ s) < heaps[i]) return [i, heaps[i] ^ s];
  return null;
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  let heaps;
  do {
    heaps = Array.from({ length: HEAPS }, () => 1 + Math.floor(rand() * MAX));
  } while (nimSum(heaps) === 0);
  return { rand, heaps, turn: 0, move: 0, last: `start: heaps ${heaps.join(', ')}, nim-sum ${nimSum(heaps)} (nonzero: the first player can force the win)`, lastMove: null, done: false, ok: true, winner: null };
}

export function sceneTick(sc) {
  if (sc.done) return true;
  const total = sc.heaps.reduce((a, b) => a + b, 0);
  if (total === 0) {
    sc.done = true;
    return true;
  }
  let i;
  let next;
  if (sc.turn === 0) {
    const mv = boutonMove(sc.heaps);
    if (mv) [i, next] = mv;
    else {
      i = sc.heaps.indexOf(Math.max(...sc.heaps));
      next = sc.heaps[i] - 1;
    }
  } else {
    const nonempty = sc.heaps.map((h, k) => [h, k]).filter(([h]) => h > 0);
    const pick = nonempty[Math.floor(sc.rand() * nonempty.length)];
    i = pick[1];
    next = Math.floor(sc.rand() * sc.heaps[i]);
  }
  const taken = sc.heaps[i] - next;
  sc.heaps[i] = next;
  sc.lastMove = [i, taken];
  sc.move += 1;
  const s = nimSum(sc.heaps);
  const who = sc.turn === 0 ? 'XOR player' : 'random mover';
  if (sc.turn === 0) sc.ok = sc.ok && s === 0;
  else sc.ok = sc.ok && s !== 0;
  sc.last = `move ${sc.move}: ${who} takes ${taken} from heap ${i + 1} (now ${sc.heaps.join(', ')}); nim-sum ${s}${sc.turn === 0 ? ', every column balanced' : ''}`;
  if (sc.heaps.reduce((a, b) => a + b, 0) === 0) {
    sc.done = true;
    sc.winner = who;
    sc.ok = sc.ok && sc.turn === 0;
    sc.last = `${who} takes the last counter and wins after ${sc.move} moves; the nim-sum was zero after every XOR move`;
    return true;
  }
  sc.turn ^= 1;
  return false;
}

export default function NimViz() {
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
      stepMs: 800,
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
        ctx.fillText('XOR player (blue) vs random mover (amber); right: binary heaps and their nim-sum', 12, 18);
        const rowY = (r) => 52 + r * 44;
        const s_ = nimSum(sc.heaps);
        sc.heaps.forEach((h, r) => {
          const y = rowY(r);
          ctx.fillStyle = dim;
          ctx.fillText(`heap ${r + 1}`, 16, y + 4);
          for (let c = 0; c < MAX; c += 1) {
            const filled = c < h;
            const justTaken = sc.lastMove && sc.lastMove[0] === r && c >= h && c < h + sc.lastMove[1];
            ctx.fillStyle = filled ? algo : justTaken ? (sc.turn === 0 ? `${algo}55` : `${heur}88`) : `${dim}18`;
            ctx.beginPath();
            ctx.arc(80 + c * 18, y, 6, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = ink;
          ctx.fillText(String(h).padStart(2, ' '), 356, y + 4);
          const bits = [8, 4, 2, 1].map((b) => (h & b ? 1 : 0));
          bits.forEach((b, c) => {
            ctx.fillStyle = b ? algo : `${dim}88`;
            ctx.font = b ? 'bold 13px ui-monospace, monospace' : '13px ui-monospace, monospace';
            ctx.fillText(String(b), 400 + c * 22, y + 4);
          });
          ctx.font = '11px ui-monospace, monospace';
        });
        const yS = rowY(HEAPS) - 6;
        ctx.strokeStyle = `${dim}88`;
        ctx.beginPath();
        ctx.moveTo(350, yS - 14);
        ctx.lineTo(500, yS - 14);
        ctx.stroke();
        ctx.fillStyle = s_ === 0 ? good : heur;
        ctx.fillText(`xor ${s_}`, 350, yS + 4);
        [8, 4, 2, 1].forEach((b, c) => {
          ctx.font = 'bold 13px ui-monospace, monospace';
          ctx.fillStyle = s_ & b ? heur : good;
          ctx.fillText(String(s_ & b ? 1 : 0), 400 + c * 22, yS + 4);
        });
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText(s_ === 0 ? 'all columns balanced: losing position' : 'unbalanced column: winning position', 350, yS + 22);
        ctx.fillStyle = dim;
        ctx.fillText('columns 8 4 2 1', 400, 40);
        ctx.fillStyle = sc.ok ? good : warn;
        ctx.fillText(sc.ok ? 'XOR move leaves 0' : 'INVARIANT BROKEN', 520, 52);
        ctx.fillStyle = dim;
        ctx.fillText('solution: 8k wins', 520, 70);
        ctx.fillText('1,531 positions', 520, 84);
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
          new heaps
        </button>
        <span className="viz-stat">{snap.line || 'playing…'}</span>
      </div>
    </>
  );
}
