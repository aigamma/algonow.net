import DiagramViewport from '../components/DiagramViewport.jsx';
import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// The recursive solution played one move per tick on three pegs, for a
// tower of four to seven disks (by cycle). The moving disk is highlighted,
// the move counter runs against 2^n - 1, and the binary view sits beside
// the pegs: the step number k in binary, the ruler bit that names the disk
// (one plus the trailing zeros of k), and the Gray code k ^ (k >> 1) whose
// set bits are the disks moved an odd number of times. Every move is
// checked for legality as it is made.
const W = 640;
const H = 300;
const SEED = 20261010;

function recursiveMoves(n, src, dst, spare, out) {
  if (n === 0) return;
  recursiveMoves(n - 1, src, spare, dst, out);
  out.push([n, src, dst]);
  recursiveMoves(n - 1, spare, dst, src, out);
}

function trailingZeros(k) {
  let t = 0;
  while (k % 2 === 0) {
    k /= 2;
    t += 1;
  }
  return t;
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const n = 4 + (seed % 4); // 4, 5, 6, 7 disks
  const pegs = [0, 1, 2];
  // a seeded choice of source and target pegs
  const src = Math.floor(rand() * 3);
  let dst = Math.floor(rand() * 3);
  if (dst === src) dst = (src + 1) % 3;
  const spare = pegs.find((p) => p !== src && p !== dst);
  const moves = [];
  recursiveMoves(n, src, dst, spare, moves);
  const stacks = [[], [], []];
  for (let d = n; d >= 1; d -= 1) stacks[src].push(d);
  return { n, src, dst, spare, moves, k: 0, stacks, moving: null, parity: new Array(n + 1).fill(0), done: false, ok: true, last: `${n} disks on peg ${'ABC'[src]}; the recursion plans ${moves.length} moves to peg ${'ABC'[dst]}` };
}

export function sceneTick(sc) {
  if (sc.done) return true;
  if (sc.k >= sc.moves.length) {
    sc.done = true;
    const arrived = sc.stacks[sc.dst].length === sc.n && sc.stacks[sc.dst].every((d, i) => d === sc.n - i);
    sc.ok = sc.ok && arrived;
    sc.last = `done in ${sc.k} moves = 2^${sc.n} - 1; the tower stands on peg ${'ABC'[sc.dst]}; every move was legal; the largest disk moved once, at move ${2 ** (sc.n - 1)}`;
    return true;
  }
  const [disk, a, b] = sc.moves[sc.k];
  const legal = sc.stacks[a].length > 0 && sc.stacks[a][sc.stacks[a].length - 1] === disk && (sc.stacks[b].length === 0 || sc.stacks[b][sc.stacks[b].length - 1] > disk);
  sc.ok = sc.ok && legal;
  sc.stacks[b].push(sc.stacks[a].pop());
  sc.k += 1;
  sc.parity[disk] ^= 1;
  sc.moving = [disk, a, b];
  const ruler = trailingZeros(sc.k) + 1;
  sc.ok = sc.ok && ruler === disk;
  let gray = sc.k ^ (sc.k >> 1);
  let bits = 0;
  for (let d = 1; d <= sc.n; d += 1) bits |= sc.parity[d] << (d - 1);
  sc.ok = sc.ok && gray === bits;
  sc.last = `move ${sc.k} of ${sc.moves.length}: disk ${disk} from ${'ABC'[a]} to ${'ABC'[b]}; k = ${sc.k.toString(2)} has ${ruler - 1} trailing zero${ruler - 1 === 1 ? '' : 's'}, so disk ${ruler}; Gray code ${gray.toString(2).padStart(sc.n, '0')}`;
  return false;
}

export default function HanoiViz() {
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
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText(`recursive Hanoi; amber: moved disk; right: the same move from the binary counter`, 12, 18);
        const baseY = 230;
        const pegX = [90, 210, 330];
        ctx.strokeStyle = `${dim}aa`;
        ctx.lineWidth = 2;
        for (let p = 0; p < 3; p += 1) {
          ctx.beginPath();
          ctx.moveTo(pegX[p], baseY);
          ctx.lineTo(pegX[p], baseY - 150);
          ctx.stroke();
          ctx.fillStyle = p === sc.dst ? good : dim;
          ctx.fillText('ABC'[p] + (p === sc.src ? ' (source)' : p === sc.dst ? ' (target)' : ''), pegX[p] - 10, baseY + 16);
        }
        ctx.beginPath();
        ctx.moveTo(30, baseY);
        ctx.lineTo(390, baseY);
        ctx.stroke();
        ctx.lineWidth = 1;
        for (let p = 0; p < 3; p += 1) {
          sc.stacks[p].forEach((disk, level) => {
            const w = 16 + disk * 12;
            const isMoving = sc.moving && sc.moving[0] === disk && sc.moving[2] === p;
            ctx.fillStyle = isMoving ? heur : disk === sc.n ? `${algo}` : `${algo}bb`;
            ctx.fillRect(pegX[p] - w / 2, baseY - 18 * (level + 1), w, 15);
            ctx.fillStyle = '#0b0d12';
            ctx.font = '9px ui-monospace, monospace';
            ctx.fillText(String(disk), pegX[p] - 3, baseY - 18 * (level + 1) + 11);
            ctx.font = '11px ui-monospace, monospace';
          });
        }
        const tx = 420;
        ctx.fillStyle = ink;
        ctx.fillText(`move ${sc.k} of ${sc.moves.length} (2^${sc.n} - 1)`, tx, 60);
        ctx.fillStyle = dim;
        ctx.fillText(`k in binary: ${sc.k.toString(2).padStart(sc.n, '0')}`, tx, 84);
        if (sc.k > 0) {
          const tz = trailingZeros(sc.k);
          ctx.fillStyle = heur;
          ctx.fillText(`trailing zeros ${tz}: disk ${tz + 1} moved`, tx, 102);
        }
        ctx.fillStyle = dim;
        ctx.fillText(`Gray code k ^ (k >> 1):`, tx, 128);
        const gray = sc.k ^ (sc.k >> 1);
        for (let d = sc.n; d >= 1; d -= 1) {
          const bit = (gray >> (d - 1)) & 1;
          const x = tx + (sc.n - d) * 22;
          ctx.fillStyle = bit ? algo : `${dim}33`;
          ctx.fillRect(x, 136, 18, 18);
          ctx.fillStyle = bit ? '#0b0d12' : dim;
          ctx.fillText(String(d), x + 5, 149);
        }
        ctx.fillStyle = dim;
        ctx.fillText('set bits: odd disk-move counts', tx, 170);
        ctx.fillStyle = sc.ok ? good : warn;
        ctx.fillText(sc.ok ? 'legal; ruler and Gray code agree' : 'INVARIANT BROKEN', tx, 196);
        ctx.fillStyle = dim;
        ctx.fillText(`the file: 1,048,575 moves at n = 20,`, tx, 222);
        ctx.fillText('BFS proves optimum through n=8', tx, 238);
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
          another tower
        </button>
        <span className="viz-stat">{snap.line || 'moving…'}</span>
      </div>
    </>
  );
}
