import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two rings of points and two copies of the same small network, trained
// from the same weights on the same gradient budget. Left: minibatch
// SGD, one update of 16 points per tick. Right: full-batch descent,
// one update every 300 points, so it moves once for every nineteen
// moves on the left. The panels paint each network's current decision
// surface; the counters show the training loss. Backpropagation
// supplies both gradients; the heuristic is only how often they are
// spent.
const W = 640;
const H = 300;
const SEED = 20260926;
const NPTS = 300;
const BATCH = 16;
const LR = 0.1;
const MAX_TICKS = 420;

function rings(rand) {
  const X = [];
  const Y = [];
  for (let i = 0; i < NPTS; i++) {
    const label = rand() < 0.5;
    const r = label ? 1.4 + rand() * 0.8 : rand() * 0.9;
    const t = rand() * Math.PI * 2;
    X.push([r * Math.cos(t) + (rand() - 0.5) * 0.15, r * Math.sin(t) + (rand() - 0.5) * 0.15]);
    Y.push(label ? 1 : 0);
  }
  return { X, Y };
}

const sigmoid = (x) => (x > -30 ? 1 / (1 + Math.exp(-x)) : 0);

function makeNet(sizes, rand) {
  const W_ = [];
  const b = [];
  for (let l = 0; l < sizes.length - 1; l++) {
    const scale = 1 / Math.sqrt(sizes[l]);
    W_.push(Array.from({ length: sizes[l + 1] }, () => Array.from({ length: sizes[l] }, () => gauss(rand) * scale)));
    b.push(new Array(sizes[l + 1]).fill(0));
  }
  return { W: W_, b };
}

function gauss(rand) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function cloneNet(net) {
  return { W: net.W.map((m) => m.map((r) => [...r])), b: net.b.map((r) => [...r]) };
}

function forward(net, x) {
  const acts = [x];
  let a = x;
  for (let l = 0; l < net.W.length; l++) {
    const z = net.W[l].map((row, i) => row.reduce((s, w, j) => s + w * a[j], net.b[l][i]));
    const last = l === net.W.length - 1;
    a = z.map((v) => (last ? sigmoid(v) : Math.tanh(v)));
    acts.push(a);
  }
  return acts;
}

function backward(net, x, y, gW, gb) {
  const acts = forward(net, x);
  let delta = [acts[acts.length - 1][0] - y];
  for (let l = net.W.length - 1; l >= 0; l--) {
    const prev = acts[l];
    for (let i = 0; i < net.W[l].length; i++) {
      for (let j = 0; j < prev.length; j++) gW[l][i][j] += delta[i] * prev[j];
      gb[l][i] += delta[i];
    }
    if (l > 0) {
      const nd = new Array(prev.length).fill(0);
      for (let j = 0; j < prev.length; j++) {
        let s = 0;
        for (let i = 0; i < net.W[l].length; i++) s += net.W[l][i][j] * delta[i];
        nd[j] = s * (1 - prev[j] * prev[j]);
      }
      delta = nd;
    }
  }
}

function update(net, data, idxs) {
  const gW = net.W.map((m) => m.map((r) => new Array(r.length).fill(0)));
  const gb = net.b.map((r) => new Array(r.length).fill(0));
  for (const k of idxs) backward(net, data.X[k], data.Y[k], gW, gb);
  const n = idxs.length;
  for (let l = 0; l < net.W.length; l++) {
    for (let i = 0; i < net.W[l].length; i++) {
      for (let j = 0; j < net.W[l][i].length; j++) net.W[l][i][j] -= (LR * gW[l][i][j]) / n;
      net.b[l][i] -= (LR * gb[l][i]) / n;
    }
  }
}

export function meanLoss(net, data) {
  let s = 0;
  for (let k = 0; k < NPTS; k++) {
    const p = forward(net, data.X[k])[net.W.length][0];
    const y = data.Y[k];
    s += -(y * Math.log(p + 1e-12) + (1 - y) * Math.log(1 - p + 1e-12));
  }
  return s / NPTS;
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const data = rings(rand);
  const init = makeNet([2, 12, 12, 1], rand);
  return { data, sgd: cloneNet(init), full: cloneNet(init), order: [...Array(NPTS).keys()], cursor: 0, sgdEvals: 0, fullEvals: 0, rand, lossS: meanLoss(init, data), lossF: meanLoss(init, data), fullPending: 0 };
}

export function trainTick(s) {
  // SGD: one minibatch; full batch: accumulate the same budget and step when it reaches NPTS
  if (s.cursor + BATCH > NPTS) {
    for (let i = NPTS - 1; i > 0; i--) { const j = Math.floor(s.rand() * (i + 1)); [s.order[i], s.order[j]] = [s.order[j], s.order[i]]; }
    s.cursor = 0;
  }
  const idxs = s.order.slice(s.cursor, s.cursor + BATCH);
  s.cursor += BATCH;
  update(s.sgd, s.data, idxs);
  s.sgdEvals += BATCH;
  s.fullPending += BATCH;
  if (s.fullPending >= NPTS) {
    update(s.full, s.data, [...Array(NPTS).keys()]);
    s.fullEvals += NPTS;
    s.fullPending -= NPTS;
  }
}

export default function BackpropViz() {
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
      stepMs: 40,
      init: () => ({ scene: makeScene(SEED + cycle.current * 7919), tick: 0, done: false, rest: 0, stopAtRest: isStill() }),
      tick: (s) => {
        if (s.done) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s)) {
            cycle.current += 1;
            Object.assign(s, { scene: makeScene(SEED + cycle.current * 7919), tick: 0, done: false, rest: 0 });
          }
          return true;
        }
        s.tick += 1;
        trainTick(s.scene);
        if (s.tick % 5 === 0 || s.tick === 1) {
          s.scene.lossS = meanLoss(s.scene.sgd, s.scene.data);
          s.scene.lossF = meanLoss(s.scene.full, s.scene.data);
        }
        if (s.tick >= MAX_TICKS || (s.scene.lossS < 0.08 && s.tick % 5 === 0)) s.done = true;
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
        ctx.fillText(`same start weights, same gradient budget: ${sc.sgdEvals.toLocaleString()} backward passes spent on each side`, 14, 18);
        const panels = [
          { x0: 20, net: sc.sgd, label: `minibatch SGD (16 per step): loss ${sc.lossS.toFixed(3)}`, color: heur },
          { x0: 330, net: sc.full, label: `full batch (300 per step): loss ${sc.lossF.toFixed(3)}`, color: dim },
        ];
        const size = 220;
        const y0 = 34;
        const cells = 20;
        for (const p of panels) {
          const cw = size / cells;
          for (let i = 0; i < cells; i++) {
            for (let j = 0; j < cells; j++) {
              const x = -2.5 + (5 * (i + 0.5)) / cells;
              const y = -2.5 + (5 * (j + 0.5)) / cells;
              const out = forward(p.net, [x, y])[p.net.W.length][0];
              const a = Math.abs(out - 0.5) * 0.7;
              ctx.fillStyle = out > 0.5 ? `rgba(93,162,255,${a})` : `rgba(226,96,108,${a})`;
              ctx.fillRect(p.x0 + i * cw, y0 + (cells - 1 - j) * cw, cw + 0.5, cw + 0.5);
            }
          }
          for (let k = 0; k < NPTS; k++) {
            const [x, y] = sc.data.X[k];
            const px = p.x0 + ((x + 2.5) / 5) * size;
            const py = y0 + size - ((y + 2.5) / 5) * size;
            ctx.fillStyle = sc.data.Y[k] ? algo : '#e2606c';
            ctx.beginPath();
            ctx.arc(px, py, 1.8, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.strokeStyle = `${dim}66`;
          ctx.strokeRect(p.x0, y0, size, size);
          ctx.fillStyle = p.color;
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillText(p.label, p.x0, y0 + size + 16);
        }
        ctx.fillStyle = dim;
        ctx.font = '10px ui-monospace, monospace';
        ctx.fillText(`${Math.round(sc.sgdEvals / BATCH)} updates`, 250, 150);
        ctx.fillText(`${Math.round(sc.fullEvals / NPTS)} updates`, 250, 166);
        let line;
        if (s.done) {
          line = sc.lossS < 0.08
            ? `SGD reached loss 0.08 after ${Math.round(sc.sgdEvals / BATCH)} small updates; full batch made ${Math.round(sc.fullEvals / NPTS)} updates on the same budget and sits at ${sc.lossF.toFixed(2)}`
            : `budget spent: SGD at loss ${sc.lossS.toFixed(2)} after ${Math.round(sc.sgdEvals / BATCH)} updates, full batch at ${sc.lossF.toFixed(2)} after ${Math.round(sc.fullEvals / NPTS)}`;
          ctx.fillStyle = good;
        } else {
          line = 'each backward pass costs about three forward passes; SGD spends them nineteen updates at a time where full batch spends one';
          ctx.fillStyle = ink;
        }
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText(line, 14, H - 8);
        statsRef.current = { line: s.done ? `${Math.round(sc.sgdEvals / BATCH)} noisy updates beat ${Math.round(sc.fullEvals / NPTS)} exact ones on the same gradient budget` : line };
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
          new rings
        </button>
        <span className="viz-stat">{snap.line || 'training…'}</span>
      </div>
    </>
  );
}
