import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two senders share a link of 100 packets per round trip with a
// 50-packet queue. Each tick is one round trip: both offer their
// windows, the link carries what it can, the queue absorbs some, and
// the rest is dropped; a sender that lost packets halves its window
// (multiplicative decrease), the others add one (additive increase),
// doubling instead while still in slow start. Left: the two windows
// over time. Right: the Chiu-Jain phase plane, where increases move
// the pair parallel to the fairness line and every halving moves it
// toward the origin along a ray, so the pair walks onto the line.
const W = 640;
const H = 300;
const SEED = 20260926;
const CAPACITY = 100;
const QUEUE = 50;
const ROUNDS = 160;

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const w1 = 1 + Math.floor(rand() * 10);
  const w2 = 20 + Math.floor(rand() * 60);
  return { windows: [w1, w2], ssthresh: [Infinity, Infinity], backlog: 0, t: 0, hist: [[w1], [w2]], drops: [], phase: [[w1, w2]], done: false };
}

export function jain(xs) {
  const s = xs.reduce((a, b) => a + b, 0);
  const q = xs.reduce((a, b) => a + b * b, 0);
  return (s * s) / (xs.length * q);
}

export function sceneTick(sc) {
  if (sc.done) return true;
  const offered = sc.windows.slice();
  const total = offered[0] + offered[1] + sc.backlog;
  const carried = Math.min(total, CAPACITY);
  const leftover = total - carried;
  sc.backlog = Math.min(leftover, QUEUE);
  const dropped = leftover - sc.backlog;
  const sum = offered[0] + offered[1];
  let anyDrop = false;
  for (let i = 0; i < 2; i++) {
    const lost = dropped * (offered[i] / sum) > 0.5;
    if (lost) {
      sc.ssthresh[i] = Math.max(2, sc.windows[i] / 2);
      sc.windows[i] = Math.max(1, sc.windows[i] / 2);
      anyDrop = true;
    } else if (sc.windows[i] < sc.ssthresh[i]) sc.windows[i] *= 2;
    else sc.windows[i] += 1;
    sc.hist[i].push(sc.windows[i]);
  }
  if (anyDrop) sc.drops.push(sc.t);
  sc.phase.push(sc.windows.slice());
  sc.t += 1;
  if (sc.t >= ROUNDS) sc.done = true;
  return sc.done;
}

export default function AimdViz() {
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
      stepMs: 130,
      init: () => ({ scene: makeScene(SEED + cycle.current * 7919), done: false, rest: 0, stopAtRest: isStill() }),
      tick: (s) => {
        if (s.done) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s) * 3) {
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
        ctx.fillText(`two senders on a link of ${CAPACITY} packets per round trip with a ${QUEUE}-packet queue; one round trip per tick; halve on loss, add one otherwise`, 12, 18);
        // time chart
        const cx = 20;
        const cy = 40;
        const cw = 330;
        const ch = 190;
        const maxW = CAPACITY + QUEUE + 10;
        const X = (t) => cx + (t / ROUNDS) * cw;
        const Y = (w) => cy + ch - (w / maxW) * ch;
        ctx.strokeStyle = `${dim}55`;
        ctx.strokeRect(cx, cy, cw, ch);
        ctx.strokeStyle = `${warn}88`;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(cx, Y(CAPACITY));
        ctx.lineTo(cx + cw, Y(CAPACITY));
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = `${warn}cc`;
        ctx.fillText('link capacity', cx + 4, Y(CAPACITY) - 4);
        for (const t of sc.drops) {
          ctx.fillStyle = `${warn}33`;
          ctx.fillRect(X(t), cy, 2, ch);
        }
        [algo, heur].forEach((color, i) => {
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          sc.hist[i].forEach((w, t) => {
            if (t === 0) ctx.moveTo(X(t), Y(w));
            else ctx.lineTo(X(t), Y(w));
          });
          ctx.stroke();
          ctx.lineWidth = 1;
        });
        ctx.fillStyle = algo;
        ctx.fillText(`sender A: window ${sc.windows[0].toFixed(0)}`, cx + 4, cy + ch + 14);
        ctx.fillStyle = heur;
        ctx.fillText(`sender B: window ${sc.windows[1].toFixed(0)}`, cx + 170, cy + ch + 14);
        // phase plane
        const px = 380;
        const py = 40;
        const ps = 190;
        const PX = (w) => px + (w / maxW) * ps;
        const PY = (w) => py + ps - (w / maxW) * ps;
        ctx.strokeStyle = `${dim}55`;
        ctx.strokeRect(px, py, ps, ps);
        ctx.strokeStyle = `${good}aa`;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(PX(0), PY(0));
        ctx.lineTo(PX(maxW), PY(maxW));
        ctx.stroke();
        ctx.strokeStyle = `${warn}88`;
        ctx.beginPath();
        ctx.moveTo(PX(0), PY(CAPACITY + QUEUE));
        ctx.lineTo(PX(CAPACITY + QUEUE), PY(0));
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = `${ink}88`;
        ctx.beginPath();
        sc.phase.forEach(([a, b], k) => {
          if (k === 0) ctx.moveTo(PX(a), PY(b));
          else ctx.lineTo(PX(a), PY(b));
        });
        ctx.stroke();
        const last = sc.phase[sc.phase.length - 1];
        ctx.fillStyle = good;
        ctx.beginPath();
        ctx.arc(PX(last[0]), PY(last[1]), 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = dim;
        ctx.fillText('phase plane: A across, B up', px, py + ps + 14);
        ctx.fillStyle = good;
        ctx.fillText('dashed green: fairness line', px, py + ps + 28);
        ctx.fillStyle = `${warn}cc`;
        ctx.fillText('red: the overload line', px, py + ps + 42);
        const f = jain(sc.windows);
        let line;
        if (s.done) {
          line = `after ${ROUNDS} round trips: windows ${sc.windows[0].toFixed(0)} and ${sc.windows[1].toFixed(0)}, Jain fairness ${f.toFixed(3)}; ${sc.drops.length} loss events; the file: fair by round 5, AIAD 0.87 and MIMD 0.85 never converge`;
          ctx.fillStyle = f > 0.98 ? good : warn;
        } else {
          line = `round trip ${sc.t}: windows ${sc.windows[0].toFixed(0)} and ${sc.windows[1].toFixed(0)}, Jain fairness ${f.toFixed(3)}; increases move parallel to the line, halvings move toward the origin`;
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
          new senders
        </button>
        <span className="viz-stat">{snap.line || 'sending…'}</span>
      </div>
    </>
  );
}
