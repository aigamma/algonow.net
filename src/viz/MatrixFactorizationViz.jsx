import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Biased MF by SGD on a planted rank-2 rating matrix, one epoch per tick:
// observed cells in ink, predictions in blue, held-out cells ringed amber;
// train and held-out RMSE against the bias-only baseline and the noise
// floor. Invariant: predictions finite; held-out beats the baseline at the end.
const W = 640;
const H = 300;
const SEED = 20261010;
const NU = 24;
const NI = 16;
const K = 2;
const NOISE = 0.4;
const EPOCHS = 40;

function gauss(rand) {
  const a = Math.max(rand(), 1e-12);
  return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * rand());
}

function rmseOf(pred, cells) {
  let s = 0;
  for (const [u, i, r] of cells) s += (pred(u, i) - r) ** 2;
  return Math.sqrt(s / cells.length);
}

function biasBaseline(train) {
  const mu = train.reduce((a, c) => a + c[2], 0) / train.length;
  const bu = new Array(NU).fill(0);
  const bi = new Array(NI).fill(0);
  for (let pass = 0; pass < 10; pass += 1) {
    const su = new Array(NU).fill(0); const cu = new Array(NU).fill(0);
    for (const [u, i, r] of train) { su[u] += r - mu - bi[i]; cu[u] += 1; }
    for (let u = 0; u < NU; u += 1) bu[u] = su[u] / (cu[u] + 2);
    const si = new Array(NI).fill(0); const ci = new Array(NI).fill(0);
    for (const [u, i, r] of train) { si[i] += r - mu - bu[u]; ci[i] += 1; }
    for (let i = 0; i < NI; i += 1) bi[i] = si[i] / (ci[i] + 2);
  }
  return (u, i) => mu + bu[u] + bi[i];
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const pu = Array.from({ length: NU }, () => Array.from({ length: K }, () => gauss(rand) * 0.9));
  const qi = Array.from({ length: NI }, () => Array.from({ length: K }, () => gauss(rand) * 0.9));
  const bu = Array.from({ length: NU }, () => gauss(rand) * 0.3);
  const bi = Array.from({ length: NI }, () => gauss(rand) * 0.4);
  const train = []; const test = []; const kind = [];
  for (let u = 0; u < NU; u += 1) {
    kind.push([]);
    for (let i = 0; i < NI; i += 1) {
      let dot = 0;
      for (let f = 0; f < K; f += 1) dot += pu[u][f] * qi[i][f];
      const r = 3.5 + bu[u] + bi[i] + dot + gauss(rand) * NOISE;
      const x = rand();
      if (x < 0.45) { train.push([u, i, r]); kind[u].push(1); } else if (x < 0.6) { test.push([u, i, r]); kind[u].push(2); } else kind[u].push(0);
    }
  }
  const mu = train.reduce((a, c) => a + c[2], 0) / train.length;
  const sc = {
    rand, train, test, kind, mu, epoch: 0, gamma: 0.05,
    bu: new Array(NU).fill(0), bi: new Array(NI).fill(0),
    P: Array.from({ length: NU }, () => Array.from({ length: K }, () => gauss(rand) * 0.3)),
    Q: Array.from({ length: NI }, () => Array.from({ length: K }, () => gauss(rand) * 0.3)),
    trainCurve: [], testCurve: [], ok: true, done: false,
  };
  sc.predict = (u, i) => {
    let d = 0;
    for (let f = 0; f < K; f += 1) d += sc.P[u][f] * sc.Q[i][f];
    return sc.mu + sc.bu[u] + sc.bi[i] + d;
  };
  sc.baseline = rmseOf(biasBaseline(train), test);
  sc.last = `${train.length} observed ratings, ${test.length} held out, planted rank ${K}; bias-only baseline ${sc.baseline.toFixed(3)}, noise ${NOISE}`;
  return sc;
}

export function sceneTick(sc) {
  if (sc.done) return true;
  const order = sc.train.slice();
  for (let n = order.length - 1; n > 0; n -= 1) {
    const j = Math.floor(sc.rand() * (n + 1));
    [order[n], order[j]] = [order[j], order[n]];
  }
  const lam = 0.05;
  for (const [u, i, r] of order) {
    const e = r - sc.predict(u, i);
    sc.bu[u] += sc.gamma * (e - lam * sc.bu[u]);
    sc.bi[i] += sc.gamma * (e - lam * sc.bi[i]);
    for (let f = 0; f < K; f += 1) {
      const p = sc.P[u][f]; const q = sc.Q[i][f];
      sc.P[u][f] += sc.gamma * (e * q - lam * p);
      sc.Q[i][f] += sc.gamma * (e * p - lam * q);
    }
  }
  sc.gamma *= 0.97;
  sc.epoch += 1;
  const tr = rmseOf(sc.predict, sc.train);
  const te = rmseOf(sc.predict, sc.test);
  sc.trainCurve.push(tr);
  sc.testCurve.push(te);
  if (!Number.isFinite(tr) || !Number.isFinite(te)) sc.ok = false;
  sc.last = `epoch ${sc.epoch}: train RMSE ${tr.toFixed(3)}, held-out ${te.toFixed(3)} (biases alone ${sc.baseline.toFixed(3)}, noise floor ${NOISE})`;
  if (sc.epoch >= EPOCHS) {
    sc.done = true;
    if (!(te < sc.baseline)) sc.ok = false;
    sc.last = `done: held-out ${te.toFixed(3)} against biases ${sc.baseline.toFixed(3)} and the noise floor ${NOISE}; every prediction finite: ${sc.ok ? 'yes' : 'NO'}`;
    return true;
  }
  return false;
}

export default function MatrixFactorizationViz() {
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
      stepMs: 220,
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
        ctx.fillText('ink = observed, blue = predicted, amber ring = held out', 12, 18);
        const cw = 13; const ch = 9; const x0 = 14; const y0 = 30;
        const shade = (r) => Math.max(0.1, Math.min(1, (r - 1.5) / 4));
        for (let u = 0; u < NU; u += 1) {
          for (let i = 0; i < NI; i += 1) {
            const k = sc.kind[u][i];
            const x = x0 + i * cw; const y = y0 + u * ch;
            if (k === 1) {
              const r = sc.train.find((c) => c[0] === u && c[1] === i)[2];
              ctx.fillStyle = ink; ctx.globalAlpha = shade(r);
            } else {
              ctx.fillStyle = algo; ctx.globalAlpha = sc.epoch === 0 ? 0.08 : shade(sc.predict(u, i)) * 0.9;
            }
            ctx.fillRect(x, y, cw - 1, ch - 1);
            ctx.globalAlpha = 1;
            if (k === 2) { ctx.strokeStyle = heur; ctx.strokeRect(x + 0.5, y + 0.5, cw - 2, ch - 2); }
          }
        }
        const px = 250; const py = 40; const pw = 370; const ph = 190;
        const ymax = 1.8;
        const X = (e) => px + (e / EPOCHS) * pw;
        const Y = (v) => py + ph - (Math.min(v, ymax) / ymax) * ph;
        ctx.strokeStyle = dim; ctx.globalAlpha = 0.5;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + ph); ctx.lineTo(px + pw, py + ph); ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = dim;
        ctx.fillText('RMSE by epoch', px, py - 8);
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = dim; ctx.beginPath(); ctx.moveTo(px, Y(sc.baseline)); ctx.lineTo(px + pw, Y(sc.baseline)); ctx.stroke();
        ctx.fillText(`biases only ${sc.baseline.toFixed(2)}`, px + pw - 120, Y(sc.baseline) - 4);
        ctx.strokeStyle = good; ctx.beginPath(); ctx.moveTo(px, Y(NOISE)); ctx.lineTo(px + pw, Y(NOISE)); ctx.stroke();
        ctx.fillStyle = good; ctx.fillText(`noise floor ${NOISE}`, px + pw - 110, Y(NOISE) - 4);
        ctx.setLineDash([]);
        const curve = (arr, color) => {
          ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath();
          arr.forEach((v, e) => { if (e === 0) ctx.moveTo(X(e + 1), Y(v)); else ctx.lineTo(X(e + 1), Y(v)); });
          ctx.stroke(); ctx.lineWidth = 1;
        };
        curve(sc.trainCurve, algo);
        curve(sc.testCurve, heur);
        ctx.fillStyle = algo; ctx.fillText('train', px + 6, py + 12);
        ctx.fillStyle = heur; ctx.fillText('held out', px + 50, py + 12);
        ctx.fillStyle = sc.ok ? good : warn;
        ctx.fillText(sc.ok ? 'invariant: finite predictions; held-out beats biases' : 'INVARIANT BROKEN', px, py + ph + 18);
        const line = sc.last;
        ctx.fillStyle = s.done ? (sc.ok ? good : warn) : ink;
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
          new ratings
        </button>
        <span className="viz-stat">{snap.line || 'factoring…'}</span>
      </div>
    </>
  );
}
