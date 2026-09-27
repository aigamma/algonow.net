import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// A 64 x 64 synthetic image: noisy bright blobs on a noisy dark
// background, the mask known. The histogram is drawn on the right and
// a candidate threshold sweeps across it four levels per tick; at each
// position the between-class variance (the weighted squared gap between
// the two class means) is plotted, and the image shows the mask that
// threshold would produce. The sweep ends at the maximum, and the mask
// there is scored against the truth.
const W = 640;
const H = 300;
const SEED = 20260926;
const N = 64;
const STEP = 4;

function gauss(rand) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const bg = [70 + rand() * 30, 12 + rand() * 8];
  const fg = [150 + rand() * 40, 15 + rand() * 10];
  const truth = Array.from({ length: N }, () => new Array(N).fill(false));
  const blobs = 4 + Math.floor(rand() * 4);
  for (let b = 0; b < blobs; b++) {
    const cx = rand() * N;
    const cy = rand() * N;
    const r = 5 + rand() * 8;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) truth[y][x] = true;
  }
  const img = truth.map((row) => row.map((t) => {
    const [mu, sd] = t ? fg : bg;
    return Math.min(255, Math.max(0, Math.round(mu + gauss(rand) * sd)));
  }));
  const hist = new Array(256).fill(0);
  for (const row of img) for (const v of row) hist[v] += 1;
  return { img, truth, hist, t: 0, curve: new Array(256).fill(0), best: { t: 0, v: -1 }, done: false, accuracy: null };
}

export function betweenVariance(hist, t) {
  const n = hist.reduce((a, b) => a + b, 0);
  let w0 = 0;
  let s0 = 0;
  let total = 0;
  for (let i = 0; i < 256; i++) total += i * hist[i];
  for (let i = 0; i <= t; i++) {
    w0 += hist[i];
    s0 += i * hist[i];
  }
  const w1 = n - w0;
  if (w0 === 0 || w1 === 0) return 0;
  const m0 = s0 / w0;
  const m1 = (total - s0) / w1;
  return (w0 / n) * (w1 / n) * (m0 - m1) ** 2;
}

export function withinPlusBetween(hist, t) {
  const n = hist.reduce((a, b) => a + b, 0);
  const mean = hist.reduce((a, c, i) => a + i * c, 0) / n;
  const total = hist.reduce((a, c, i) => a + c * (i - mean) ** 2, 0) / n;
  let w0 = 0;
  let w1 = 0;
  let s0 = 0;
  let s1 = 0;
  for (let i = 0; i < 256; i++) {
    if (i <= t) {
      w0 += hist[i];
      s0 += i * hist[i];
    } else {
      w1 += hist[i];
      s1 += i * hist[i];
    }
  }
  if (w0 === 0 || w1 === 0) return { gap: 0, total };
  const m0 = s0 / w0;
  const m1 = s1 / w1;
  let v0 = 0;
  let v1 = 0;
  for (let i = 0; i < 256; i++) {
    if (i <= t) v0 += hist[i] * (i - m0) ** 2;
    else v1 += hist[i] * (i - m1) ** 2;
  }
  const within = (v0 + v1) / n;
  const between = (w0 / n) * (w1 / n) * (m0 - m1) ** 2;
  return { gap: Math.abs(within + between - total), total };
}

export function accuracy(sc, t) {
  let ok = 0;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) ok += (sc.img[y][x] > t) === sc.truth[y][x] ? 1 : 0;
  return ok / (N * N);
}

export function sceneTick(sc) {
  if (sc.done) return true;
  const end = Math.min(255, sc.t + STEP - 1);
  for (let t = sc.t; t <= end; t++) {
    const v = betweenVariance(sc.hist, t);
    sc.curve[t] = v;
    if (v > sc.best.v) sc.best = { t, v };
  }
  sc.t = end + 1;
  if (sc.t > 255) {
    sc.done = true;
    sc.accuracy = accuracy(sc, sc.best.t);
    return true;
  }
  return false;
}

export default function OtsuViz() {
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
      stepMs: 90,
      init: () => ({ scene: makeScene(SEED + cycle.current * 7919), done: false, rest: 0, stopAtRest: isStill() }),
      tick: (s) => {
        if (s.done) {
          if (s.stopAtRest) return false;
          s.rest += 1;
          if (s.rest > holdTicks(s) * 4) {
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
        const tNow = s.done ? sc.best.t : Math.min(255, sc.t);
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillStyle = dim;
        ctx.fillText(`${N} x ${N} noisy image, the mask known; the threshold sweeps ${STEP} levels per tick and the between-class variance is plotted`, 12, 18);
        // image and the mask at the current threshold
        const ix = 20;
        const iy = 40;
        const px = 1.7;
        for (let y = 0; y < N; y++) {
          for (let x = 0; x < N; x++) {
            const v = sc.img[y][x];
            ctx.fillStyle = `rgb(${v}, ${v}, ${v})`;
            ctx.fillRect(ix + x * px, iy + y * px, px, px);
          }
        }
        const mx = ix + N * px + 16;
        for (let y = 0; y < N; y++) {
          for (let x = 0; x < N; x++) {
            const on = sc.img[y][x] > tNow;
            const right = on === sc.truth[y][x];
            ctx.fillStyle = on ? (right ? algo : `${heur}`) : right ? '#1b2030' : `${heur}88`;
            ctx.fillRect(mx + x * px, iy + y * px, px, px);
          }
        }
        ctx.fillStyle = dim;
        ctx.fillText('image', ix, iy + N * px + 14);
        ctx.fillText(`mask at t = ${tNow} (amber: wrong)`, mx, iy + N * px + 14);
        // histogram and curve
        const hx = 270;
        const hy = 40;
        const hw = 350;
        const hh = 150;
        let hmax = 1;
        for (const c of sc.hist) if (c > hmax) hmax = c;
        for (let i = 0; i < 256; i++) {
          const c = sc.hist[i];
          if (!c) continue;
          ctx.fillStyle = i <= tNow ? `${dim}66` : `${algo}66`;
          const h = (c / hmax) * hh;
          ctx.fillRect(hx + (i / 256) * hw, hy + hh - h, hw / 256 + 0.5, h);
        }
        let cmax = 1;
        for (const v of sc.curve) if (v > cmax) cmax = v;
        ctx.strokeStyle = heur;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        let started = false;
        for (let i = 0; i < Math.min(sc.t, 256); i++) {
          const x = hx + (i / 256) * hw;
          const y = hy + hh - (sc.curve[i] / cmax) * hh;
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.strokeStyle = s.done ? good : ink;
        ctx.beginPath();
        ctx.moveTo(hx + (tNow / 256) * hw, hy);
        ctx.lineTo(hx + (tNow / 256) * hw, hy + hh);
        ctx.stroke();
        ctx.strokeStyle = `${dim}55`;
        ctx.strokeRect(hx, hy, hw, hh);
        ctx.fillStyle = dim;
        ctx.fillText('gray level 0 to 255; bars: histogram; amber: between-class variance', hx, hy + hh + 14);
        ctx.fillText(`best so far: t = ${sc.best.t}, variance ${sc.best.v.toFixed(0)}`, hx, hy + hh + 30);
        ctx.fillText('the file: 128 x 128 image, Otsu 121 vs the Bayes threshold 115, 98.4% of pixels right', hx, hy + hh + 46);
        let line;
        if (s.done) {
          line = `maximum at t = ${sc.best.t}: the mask matches the truth on ${(sc.accuracy * 100).toFixed(1)}% of ${N * N} pixels; the same t minimizes the within-class variance`;
          ctx.fillStyle = good;
        } else {
          line = `t = ${tNow}: between-class variance ${sc.curve[Math.max(0, tNow - 1)].toFixed(0)}; mask accuracy right now ${(accuracy(sc, tNow) * 100).toFixed(1)}%`;
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
          new image
        </button>
        <span className="viz-stat">{snap.line || 'sweeping…'}</span>
      </div>
    </>
  );
}
