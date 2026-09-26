import { useEffect, useRef, useState } from 'react';
import { useCanvasLoop, isStill, holdTicks, mulberry32 } from './useCanvasLoop.js';

// Two crescents, a blob, and stray noise, scanned point by point. The
// amber circle is the density test (eps radius, minPts inside it): a
// point that passes becomes a core point and pours its neighbors into
// the queue; a point that fails is noise (red cross) unless a core
// point later claims it as a border (hollow ring). Clusters take their
// color when their first core point is found. The counter compares the
// distances the eps-grid index computed against the brute-force
// n(n-1)/2.
const W = 640;
const H = 300;
const SEED = 20260926;
const EPS = 0.2;
const MIN_PTS = 5;
const STEPS_PER_TICK = 2;

function gauss(rand) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function makeScene(seed) {
  const rand = mulberry32(seed);
  const X = [];
  const truth = [];
  for (let k = 0; k < 110; k++) {
    const t = rand() * Math.PI;
    X.push([Math.cos(t) + gauss(rand) * 0.06, Math.sin(t) + gauss(rand) * 0.06]);
    truth.push(0);
  }
  for (let k = 0; k < 110; k++) {
    const t = rand() * Math.PI;
    X.push([1 - Math.cos(t) + gauss(rand) * 0.06, 0.5 - Math.sin(t) + gauss(rand) * 0.06]);
    truth.push(1);
  }
  for (let k = 0; k < 50; k++) {
    X.push([3 + gauss(rand) * 0.12, 0.8 + gauss(rand) * 0.12]);
    truth.push(2);
  }
  for (let k = 0; k < 50; k++) {
    X.push([-1.5 + rand() * 6, -1.5 + rand() * 4]);
    truth.push(3);
  }
  const n = X.length;
  const cells = new Map();
  for (let i = 0; i < n; i++) {
    const key = `${Math.floor(X[i][0] / EPS)},${Math.floor(X[i][1] / EPS)}`;
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key).push(i);
  }
  return { X, truth, n, cells, labels: new Array(n).fill(null), core: new Array(n).fill(false), queue: [], head: 0, i: 0, cluster: 0, current: null, distances: 0, brute: (n * (n - 1)) / 2, done: false };
}

function query(sc, i) {
  const cx = Math.floor(sc.X[i][0] / EPS);
  const cy = Math.floor(sc.X[i][1] / EPS);
  const out = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const bucket = sc.cells.get(`${cx + dx},${cy + dy}`);
      if (!bucket) continue;
      for (const j of bucket) {
        sc.distances += 1;
        if (Math.hypot(sc.X[i][0] - sc.X[j][0], sc.X[i][1] - sc.X[j][1]) <= EPS) out.push(j);
      }
    }
  }
  return out;
}

// One step labels exactly one new point (or finishes). Returns true when
// the scan is complete.
export function sceneStep(sc) {
  while (sc.head < sc.queue.length) {
    const j = sc.queue[sc.head++];
    if (sc.labels[j] === -1) {
      sc.labels[j] = sc.cluster;
      sc.current = j;
      return false;
    }
    if (sc.labels[j] !== null) continue;
    sc.labels[j] = sc.cluster;
    sc.current = j;
    const nb = query(sc, j);
    if (nb.length >= MIN_PTS) {
      sc.core[j] = true;
      for (const k of nb) sc.queue.push(k);
    }
    return false;
  }
  sc.queue = [];
  sc.head = 0;
  while (sc.i < sc.n && sc.labels[sc.i] !== null) sc.i += 1;
  if (sc.i >= sc.n) {
    sc.done = true;
    sc.current = null;
    return true;
  }
  const i = sc.i;
  sc.current = i;
  const nb = query(sc, i);
  if (nb.length < MIN_PTS) {
    sc.labels[i] = -1;
    return false;
  }
  sc.cluster += 1;
  sc.core[i] = true;
  sc.labels[i] = sc.cluster;
  for (const k of nb) if (k !== i) sc.queue.push(k);
  return false;
}

export function summary(sc) {
  const clusters = sc.cluster;
  let noise = 0;
  let cores = 0;
  let borders = 0;
  for (let i = 0; i < sc.n; i++) {
    if (sc.labels[i] === -1) noise += 1;
    else if (sc.core[i]) cores += 1;
    else if (sc.labels[i] !== null) borders += 1;
  }
  return { clusters, noise, cores, borders };
}

const PALETTE = ['#5da2ff', '#62d98a', '#c792ea', '#4dd0e1', '#ff9e64', '#f78c6c'];

export default function DbscanViz() {
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
        for (let k = 0; k < STEPS_PER_TICK; k++) {
          if (sceneStep(s.scene)) {
            s.done = true;
            break;
          }
        }
        return true;
      },
      draw: (ctx, s) => {
        ctx.clearRect(0, 0, W, H);
        const css = getComputedStyle(document.documentElement);
        const heur = css.getPropertyValue('--heur').trim() || '#f0b94b';
        const good = css.getPropertyValue('--path').trim() || '#62d98a';
        const warn = css.getPropertyValue('--warn').trim() || '#e2606c';
        const dim = css.getPropertyValue('--ink-dim').trim() || '#9aa5bd';
        const ink = css.getPropertyValue('--ink').trim() || '#e9edf6';
        const sc = s.scene;
        const x0 = 12;
        const y0 = 30;
        const pw = 420;
        const ph = 262;
        const sx = (x) => x0 + ((x + 1.6) / 6.3) * pw;
        const sy = (y) => y0 + ph - ((y + 1.6) / 4.2) * ph;
        const scale = pw / 6.3;
        ctx.strokeStyle = `${dim}55`;
        ctx.strokeRect(x0, y0, pw, ph);
        ctx.fillStyle = dim;
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText(`density scan: eps ${EPS}, minPts ${MIN_PTS}; ${sc.n} points, scanned in index order`, x0, 18);
        for (let i = 0; i < sc.n; i++) {
          const [x, y] = sc.X[i];
          const px = sx(x);
          const py = sy(y);
          const l = sc.labels[i];
          if (l === null) {
            ctx.fillStyle = `${dim}66`;
            ctx.beginPath();
            ctx.arc(px, py, 2, 0, Math.PI * 2);
            ctx.fill();
          } else if (l === -1) {
            ctx.strokeStyle = warn;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(px - 3, py - 3);
            ctx.lineTo(px + 3, py + 3);
            ctx.moveTo(px + 3, py - 3);
            ctx.lineTo(px - 3, py + 3);
            ctx.stroke();
          } else if (sc.core[i]) {
            ctx.fillStyle = PALETTE[(l - 1) % PALETTE.length];
            ctx.beginPath();
            ctx.arc(px, py, 2.6, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.strokeStyle = PALETTE[(l - 1) % PALETTE.length];
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.arc(px, py, 3.2, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
        if (sc.current !== null) {
          const [x, y] = sc.X[sc.current];
          ctx.strokeStyle = heur;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(sx(x), sy(y), EPS * scale, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.lineWidth = 1;
        const sm = summary(sc);
        const tx = 446;
        ctx.fillStyle = ink;
        ctx.fillText(`clusters found: ${sm.clusters}`, tx, 48);
        ctx.fillStyle = dim;
        ctx.fillText(`core points: ${sm.cores}`, tx, 68);
        ctx.fillText(`border points: ${sm.borders}`, tx, 86);
        ctx.fillStyle = warn;
        ctx.fillText(`noise: ${sm.noise}`, tx, 104);
        ctx.fillStyle = heur;
        ctx.fillText('amber circle: the density test', tx, 134);
        ctx.fillText(`(${MIN_PTS} points within eps = core)`, tx, 150);
        ctx.fillStyle = dim;
        ctx.fillText(`queue: ${Math.max(0, sc.queue.length - sc.head)} waiting`, tx, 178);
        ctx.fillText(`distances: ${sc.distances.toLocaleString()}`, tx, 204);
        ctx.fillText(`brute force: ${sc.brute.toLocaleString()}`, tx, 220);
        ctx.fillText(`(${((100 * sc.distances) / sc.brute).toFixed(0)}% through eps cells)`, tx, 236);
        let line;
        if (s.done) {
          line = `${sm.clusters} clusters, ${sm.noise} noise points; ${sc.distances.toLocaleString()} distances through the eps grid vs ${sc.brute.toLocaleString()} brute force`;
          ctx.fillStyle = good;
        } else {
          line = 'a crescent is one cluster because dense neighborhoods chain along it; a stray point has no chain to join';
          ctx.fillStyle = ink;
        }
        ctx.fillText(line, tx, 270);
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
          new scene
        </button>
        <span className="viz-stat">{snap.line || 'scanning…'}</span>
      </div>
    </>
  );
}
