import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Sixty-four amplitudes as bars, one marked item in amber, and one
// Grover round per two ticks: first the oracle flips the marked
// amplitude below the axis, then the diffusion reflects every bar
// about the mean (the dashed line), which lifts the marked one. The
// right panel plots the marked probability round by round against the
// closed form sin^2((2t + 1) theta), and the run continues past the
// optimum to show the overshoot.
const W = 640;
const H = 300;
const SEED = 20260926;
const N = 64;

export function makeScene(seed, k) {
  const rand = mulberry32(seed);

  const marked = new Set();
  while (marked.size < k) marked.add(Math.floor(rand() * N));
  const theta = Math.asin(Math.sqrt(k / N));
  const tStar = Math.round(Math.PI / (4 * theta) - 0.5);
  const a = 1 / Math.sqrt(N);
  return { k, marked, theta, tStar, amp: new Array(N).fill(a), phase: 'oracle', round: 0, trace: [k / N], maxRounds: 3 * tStar + 1, done: false, mean: a };
}

function markedProbability(sc) {
  let p = 0;
  for (const i of sc.marked) p += sc.amp[i] * sc.amp[i];
  return p;
}

export function sceneTick(sc) {
  if (sc.done) return true;
  if (sc.phase === 'oracle') {
    for (const i of sc.marked) sc.amp[i] = -sc.amp[i];
    sc.phase = 'diffusion';
    return false;
  }
  const mean = sc.amp.reduce((s, v) => s + v, 0) / N;
  sc.mean = mean;
  for (let i = 0; i < N; i++) sc.amp[i] = 2 * mean - sc.amp[i];
  sc.round += 1;
  sc.trace.push(markedProbability(sc));
  sc.phase = 'oracle';
  if (sc.round >= sc.maxRounds) sc.done = true;
  return sc.done;
}

export function closedForm(sc, t) {
  return Math.sin((2 * t + 1) * sc.theta) ** 2;
}

export default function GroverViz() {
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
      init: () => ({ scene: makeScene(SEED + cycle.current * 7919, cycle.current % 2 === 0 ? 1 : 2), done: false, rest: 0, stopAtRest: isStill() }),
      tick: (s) => {
        if (s.done) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            Object.assign(s, { scene: makeScene(SEED + cycle.current * 7919, cycle.current % 2 === 0 ? 1 : 2), done: false, rest: 0 });
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
        ctx.fillText(`N = ${N} items, ${sc.k} marked; round ${sc.round} of ${sc.maxRounds} (optimum t* = ${sc.tStar}); next: ${sc.phase === 'oracle' ? 'oracle flips the marked sign' : 'diffusion reflects about the mean'}`, 12, 18);
        // amplitude bars
        const x0 = 16;
        const axisY = 150;
        const scale = 95;
        const bw = 330 / N;
        ctx.strokeStyle = `${dim}66`;
        ctx.beginPath();
        ctx.moveTo(x0, axisY);
        ctx.lineTo(x0 + 330, axisY);
        ctx.stroke();
        for (let i = 0; i < N; i++) {
          const h = sc.amp[i] * scale;
          ctx.fillStyle = sc.marked.has(i) ? heur : `${algo}aa`;
          ctx.fillRect(x0 + i * bw, axisY - Math.max(0, h), bw - 1, Math.abs(h));
          if (h < 0) ctx.fillRect(x0 + i * bw, axisY, bw - 1, -h);
        }
        const meanY = axisY - sc.mean * scale;
        ctx.strokeStyle = ink;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(x0, meanY);
        ctx.lineTo(x0 + 330, meanY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = dim;
        ctx.fillText('amplitudes (amber: marked); dashed: the mean', x0, 262);
        ctx.fillStyle = heur;
        ctx.fillText(`marked probability now: ${markedProbability(sc).toFixed(3)}`, x0, 278);
        // probability curve
        const cx0 = 370;
        const cy0 = 40;
        const cw = 250;
        const ch = 190;
        ctx.strokeStyle = `${dim}66`;
        ctx.strokeRect(cx0, cy0, cw, ch);
        ctx.fillStyle = dim;
        ctx.fillText('1', cx0 - 10, cy0 + 4);
        ctx.fillText('0', cx0 - 10, cy0 + ch + 4);
        ctx.fillText(`rounds 0 to ${sc.maxRounds}`, cx0 + cw - 100, cy0 + ch + 14);
        ctx.strokeStyle = `${dim}aa`;
        ctx.beginPath();
        for (let t = 0; t <= sc.maxRounds; t++) {
          const px = cx0 + (t / sc.maxRounds) * cw;
          const py = cy0 + ch - closedForm(sc, t) * ch;
          if (t === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.strokeStyle = good;
        ctx.setLineDash([3, 3]);
        const tx = cx0 + (sc.tStar / sc.maxRounds) * cw;
        ctx.beginPath();
        ctx.moveTo(tx, cy0);
        ctx.lineTo(tx, cy0 + ch);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = good;
        ctx.fillText(`t* = ${sc.tStar}`, tx + 4, cy0 + 14);
        ctx.fillStyle = algo;
        sc.trace.forEach((p, t) => {
          const px = cx0 + (t / sc.maxRounds) * cw;
          const py = cy0 + ch - p * ch;
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.fillStyle = dim;
        ctx.fillText('dots: simulated; line: sin²((2t+1)θ)', cx0, cy0 + ch + 30);
        let line;
        if (s.done) {
          const pStar = sc.trace[sc.tStar];
          const p2 = sc.trace[Math.min(sc.trace.length - 1, 2 * sc.tStar + 1)];
          line = `at t* = ${sc.tStar} the marked probability was ${pStar.toFixed(3)} (closed form ${closedForm(sc, sc.tStar).toFixed(3)}); at 2t* + 1 it had fallen to ${p2.toFixed(3)}: measure at the peak`;
          ctx.fillStyle = good;
        } else {
          line = 'each round rotates the state by 2θ toward the marked items; the probability climbs as sin² and falls again if you keep going';
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
          new marked item
        </button>
        <span className="viz-stat">{snap.line || 'amplifying…'}</span>
      </div>
    </>
  );
}
