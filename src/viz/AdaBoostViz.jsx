import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// A disk of positive points inside a ring of negatives, and one decision
// stump per tick. Left: the points drawn with radius proportional to
// their current weight (the ten heaviest ringed in amber: where the
// reweighting has pushed the next round's attention), the stump just
// fitted as a blue line, and the ensemble's current decision region
// shaded by its margin. Right: the training error (blue) under the
// Freund-Schapire bound, the product of the Z's (dim), round by round.
const W = 640;
const H = 300;
const SEED = 20260926;
const N = 200;
const ROUNDS = 120;
const R2 = 2 / Math.PI;

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const X = [];
  const y = [];
  for (let i = 0; i < N; i++) {
    const a = rand() * 2 - 1;
    const b = rand() * 2 - 1;
    X.push([a, b]);
    y.push(a * a + b * b < R2 ? 1 : -1);
  }
  const orders = [0, 1].map((f) => [...Array(N).keys()].sort((i, j) => X[i][f] - X[j][f]));
  return { X, y, orders, w: new Array(N).fill(1 / N), H: [], F: new Array(N).fill(0), prodZ: 1, trainErr: 1, curve: [], last: null, zeroRound: null };
}

function bestStump(X, y, w, orders) {
  let totPos = 0;
  let Wsum = 0;
  for (let i = 0; i < N; i++) {
    Wsum += w[i];
    if (y[i] > 0) totPos += w[i];
  }
  let best = { err: Infinity, f: 0, thr: 0, pol: 1 };
  for (let f = 0; f < 2; f++) {
    const order = orders[f];
    let pos = 0;
    let neg = 0;
    for (let k = 0; k <= N; k++) {
      if (k > 0) {
        const i = order[k - 1];
        if (y[i] > 0) pos += w[i];
        else neg += w[i];
      }
      if (k > 0 && k < N && X[order[k - 1]][f] === X[order[k]][f]) continue;
      const thr = k === 0 ? X[order[0]][f] - 1 : k === N ? X[order[N - 1]][f] + 1 : 0.5 * (X[order[k - 1]][f] + X[order[k]][f]);
      const errPlus = neg + (totPos - pos);
      const errMinus = Wsum - errPlus;
      if (errPlus < best.err) best = { err: errPlus, f, thr, pol: 1 };
      if (errMinus < best.err) best = { err: errMinus, f, thr, pol: -1 };
    }
  }
  return best;
}

const predict = (st, x) => (x[st.f] <= st.thr ? st.pol : -st.pol);

export function sceneTick(sc) {
  const st = bestStump(sc.X, sc.y, sc.w, sc.orders);
  if (st.err <= 0 || st.err >= 0.5) return true;
  const alpha = 0.5 * Math.log((1 - st.err) / st.err);
  sc.H.push({ alpha, st });
  const preds = sc.X.map((x) => predict(st, x));
  let Z = 0;
  for (let i = 0; i < N; i++) {
    sc.w[i] *= Math.exp(-alpha * sc.y[i] * preds[i]);
    Z += sc.w[i];
  }
  for (let i = 0; i < N; i++) sc.w[i] /= Z;
  sc.prodZ *= Z;
  let errs = 0;
  for (let i = 0; i < N; i++) {
    sc.F[i] += alpha * preds[i];
    if ((sc.F[i] >= 0 ? 1 : -1) !== sc.y[i]) errs += 1;
  }
  sc.trainErr = errs / N;
  if (sc.trainErr === 0 && sc.zeroRound === null) sc.zeroRound = sc.H.length;
  sc.curve.push([sc.trainErr, sc.prodZ]);
  sc.last = { st, alpha };
  return sc.H.length >= ROUNDS || (sc.zeroRound !== null && sc.H.length >= sc.zeroRound + 15);
}

function ensemble(sc, x) {
  let s = 0;
  let a = 0;
  for (const { alpha, st } of sc.H) {
    s += alpha * predict(st, x);
    a += alpha;
  }
  return a > 0 ? s / a : 0;
}

export default function AdaBoostViz() {
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
      stepMs: 140,
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
        const T = sc.H.length;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText(`round ${T}: one stump per round, fitted to the weighted points; ${N} points, a disk inside a ring`, 12, 18);
        const x0 = 14;
        const y0 = 34;
        const size = 236;
        const cells = 24;
        const cw = size / cells;
        if (T > 0) {
          for (let i = 0; i < cells; i++) {
            for (let j = 0; j < cells; j++) {
              const px = -1 + (2 * (i + 0.5)) / cells;
              const py = -1 + (2 * (j + 0.5)) / cells;
              const m = ensemble(sc, [px, py]);
              ctx.fillStyle = m >= 0 ? `rgba(93,162,255,${0.08 + 0.45 * Math.min(1, Math.abs(m))})` : `rgba(226,96,108,${0.08 + 0.45 * Math.min(1, Math.abs(m))})`;
              ctx.fillRect(x0 + i * cw, y0 + (cells - 1 - j) * cw, cw + 0.5, cw + 0.5);
            }
          }
        }
        const heavy = [...Array(N).keys()].sort((i, j) => sc.w[j] - sc.w[i]).slice(0, 10);
        for (let i = 0; i < N; i++) {
          const [a, b] = sc.X[i];
          const px = x0 + ((a + 1) / 2) * size;
          const py = y0 + size - ((b + 1) / 2) * size;
          const r = 1.4 + Math.min(6, 160 * sc.w[i]);
          ctx.fillStyle = sc.y[i] > 0 ? algo : '#e2606c';
          ctx.beginPath();
          ctx.arc(px, py, r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.strokeStyle = heur;
        ctx.lineWidth = 1.5;
        for (const i of heavy) {
          const [a, b] = sc.X[i];
          const px = x0 + ((a + 1) / 2) * size;
          const py = y0 + size - ((b + 1) / 2) * size;
          ctx.beginPath();
          ctx.arc(px, py, 2.2 + Math.min(6, 160 * sc.w[i]) + 2, 0, Math.PI * 2);
          ctx.stroke();
        }
        if (sc.last) {
          const { st } = sc.last;
          ctx.strokeStyle = algo;
          ctx.lineWidth = 2;
          ctx.beginPath();
          if (st.f === 0) {
            const px = x0 + ((Math.max(-1, Math.min(1, st.thr)) + 1) / 2) * size;
            ctx.moveTo(px, y0);
            ctx.lineTo(px, y0 + size);
          } else {
            const py = y0 + size - ((Math.max(-1, Math.min(1, st.thr)) + 1) / 2) * size;
            ctx.moveTo(x0, py);
            ctx.lineTo(x0 + size, py);
          }
          ctx.stroke();
        }
        ctx.lineWidth = 1;
        ctx.strokeStyle = `${dim}66`;
        ctx.strokeRect(x0, y0, size, size);
        ctx.fillStyle = heur;
        ctx.fillText('amber rings: the ten heaviest points, where the next stump must look', x0, y0 + size + 14);
        // Right: training error and the bound.
        const cx0 = 290;
        const cy0 = 40;
        const cwid = 330;
        const chgt = 190;
        ctx.strokeStyle = `${dim}66`;
        ctx.strokeRect(cx0, cy0, cwid, chgt);
        ctx.fillStyle = dim;
        ctx.fillText('1.0', cx0 - 24, cy0 + 4);
        ctx.fillText('0.0', cx0 - 24, cy0 + chgt + 4);
        ctx.fillText(`rounds 1 to ${ROUNDS}`, cx0 + cwid - 90, cy0 + chgt + 14);
        const drawCurve = (idx, color) => {
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          sc.curve.forEach((row, t) => {
            const px = cx0 + ((t + 1) / ROUNDS) * cwid;
            const py = cy0 + chgt - Math.min(1, row[idx]) * chgt;
            if (t === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          });
          ctx.stroke();
          ctx.lineWidth = 1;
        };
        if (sc.curve.length > 0) {
          drawCurve(1, dim);
          drawCurve(0, algo);
        }
        ctx.fillStyle = dim;
        ctx.fillText('bound: product of the Z’s', cx0 + 8, cy0 + 14);
        ctx.fillStyle = algo;
        ctx.fillText('training error of the vote', cx0 + 8, cy0 + 28);
        if (sc.last) {
          ctx.fillStyle = ink;
          ctx.fillText(`last stump: ${sc.last.st.f === 0 ? 'x' : 'y'} ${sc.last.st.pol > 0 ? '≤' : '>'} ${sc.last.st.thr.toFixed(2)} → +, weighted error ${sc.last.st.err.toFixed(3)}, vote α ${sc.last.alpha.toFixed(2)}`, cx0, cy0 + chgt + 30);
        }
        let line;
        if (s.done) {
          line = sc.zeroRound !== null
            ? `training error hit zero at round ${sc.zeroRound} and the bound kept falling: ${T} stumps, bound ${sc.prodZ.toFixed(3)}`
            : `${T} stumps: training error ${sc.trainErr.toFixed(3)} under the bound ${sc.prodZ.toFixed(3)}`;
          ctx.fillStyle = good;
        } else {
          line = T > 0 ? `round ${T}: training error ${sc.trainErr.toFixed(3)} ≤ bound ${sc.prodZ.toFixed(3)}; the last stump now has weighted error exactly one half` : 'fitting the first stump';
          ctx.fillStyle = ink;
        }
        ctx.font = '11px ui-monospace, monospace';
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
          new points
        </button>
        <span className="viz-stat">{snap.line || 'boosting…'}</span>
      </div>
    </>
  );
}
